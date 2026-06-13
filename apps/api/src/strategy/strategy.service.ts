import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  calcProjectEfficiency,
  calcStrategyAlignment,
  calcGoalProgress,
  calcTaskLinkagePct,
} from '@whatsnext/shared';

@Injectable()
export class StrategyService {
  constructor(private prisma: PrismaService) {}

  findGoals(companyId: string) {
    return this.prisma.strategicGoal.findMany({
      where: { companyId },
      include: { tactics: true, kpis: true, owner: true, projects: { include: { tasks: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createGoal(companyId: string, data: Record<string, unknown>) {
    const count = await this.prisma.strategicGoal.count({ where: { companyId } });
    if (count >= 6) throw new BadRequestException('Maximum 6 goals');
    return this.prisma.strategicGoal.create({
      data: {
        companyId,
        title: data.title as string,
        description: data.description as string | undefined,
        ownerId: data.ownerId as string | undefined,
        kpiText: data.kpiText as string | undefined,
        targetDate: data.targetDate ? new Date(data.targetDate as string) : undefined,
        sortOrder: count + 1,
      },
    });
  }

  async getGoal(companyId: string, id: string) {
    const goal = await this.prisma.strategicGoal.findFirst({
      where: { id, companyId },
      include: {
        tactics: true,
        kpis: true,
        projects: { include: { tasks: true, owner: true, members: { include: { employee: true } } } },
      },
    });
    if (!goal) throw new NotFoundException();
    return goal;
  }

  async getAlignment(companyId: string) {
    const projects = await this.prisma.project.findMany({
      where: { companyId },
      include: { tasks: true },
    });
    const goals = await this.prisma.strategicGoal.findMany({ where: { companyId } });
    const tasks = await this.prisma.task.findMany({
      where: { companyId },
      include: { project: { select: { goalId: true, type: true } } },
    });

    const projectsWithEff = projects.map((p) => ({
      ...p,
      efficiencyPct: p.efficiencyPct || calcProjectEfficiency(p.tasks),
    }));

    const alignmentPct = calcStrategyAlignment(projectsWithEff);
    const linkedProjects = projects.filter((p) => p.goalId).length;
    const unlinkedProjects = projects.length - linkedProjects;
    const taskLinkagePct = calcTaskLinkagePct(
      tasks.map((t) => ({ goalId: t.goalId, projectGoalId: t.project?.goalId })),
    );

    const timeline = this.buildTimeline(projects);
    const goalRows = goals.map((g) => {
      const goalProjs = projectsWithEff.filter((p) => p.goalId === g.id);
      const progressPct = calcGoalProgress(goalProjs);
      return {
        ...g,
        progressPct,
        projects: goalProjs,
        taskCount: goalProjs.reduce((s, p) => s + p.tasks.length, 0),
        completedTasks: goalProjs.reduce(
          (s, p) => s + p.tasks.filter((t) => t.status === 'completed').length,
          0,
        ),
      };
    });

    const unlinked = projectsWithEff.filter((p) => !p.goalId);
    const departments = await this.prisma.department.findMany({ where: { companyId } });

    return {
      alignmentPct,
      taskLinkagePct,
      linkedProjects,
      totalProjects: projects.length,
      unlinkedProjects,
      unlinkedCapacityPct: projects.length ? Math.round((unlinkedProjects / projects.length) * 100) : 0,
      timeline,
      goals: goalRows,
      unlinkedProjectsList: unlinked,
      departmentsMissingStrategy: departments.filter((d) => !d.hasStrategyCoverage),
    };
  }

  private buildTimeline(projects: Array<{ timelineStart: Date | null; timelineEnd: Date | null; goalId: string | null; name: string }>) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((label, mi) => {
      const month = mi + 1;
      const inMonth = projects.filter((p) => {
        if (!p.timelineStart || !p.timelineEnd) return false;
        const start = p.timelineStart.getMonth() + 1;
        const end = p.timelineEnd.getMonth() + 1;
        return month >= start && month <= end;
      });
      return {
        label,
        linked: inMonth.filter((p) => p.goalId).length,
        unlinked: inMonth.filter((p) => !p.goalId).length,
      };
    });
  }
}
