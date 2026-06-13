import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calcProjectEfficiency } from '@whatsnext/shared';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(companyId: string, filters: { type?: string; goalId?: string; status?: string }) {
    const projects = await this.prisma.project.findMany({
      where: {
        companyId,
        ...(filters.type && { type: filters.type }),
        ...(filters.goalId && { goalId: filters.goalId }),
        ...(filters.status && { status: filters.status }),
      },
      include: {
        goal: true,
        owner: true,
        tasks: true,
        members: { include: { employee: true } },
      },
      orderBy: { name: 'asc' },
    });
    return projects.map((p) => ({
      ...p,
      efficiencyPct: p.efficiencyPct || calcProjectEfficiency(p.tasks),
    }));
  }

  async findOne(companyId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId },
      include: { goal: true, owner: true, tasks: { include: { assignee: true } }, members: { include: { employee: true } } },
    });
    if (!project) throw new NotFoundException();
    return { ...project, efficiencyPct: project.efficiencyPct || calcProjectEfficiency(project.tasks) };
  }

  async update(companyId: string, id: string, data: Record<string, unknown>, userId: string) {
    const before = await this.prisma.project.findFirst({ where: { id, companyId } });
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        type: data.type as string | undefined,
        goalId: data.goalId as string | null | undefined,
        ownerId: data.ownerId as string | null | undefined,
        status: data.status as string | undefined,
      },
    });
    await this.audit.log(companyId, userId, 'project.updated', 'project', id, before, project);
    return project;
  }

  getTasks(companyId: string, filters: { goalId?: string; assigneeId?: string; stale?: boolean }) {
    return this.prisma.task.findMany({
      where: {
        companyId,
        ...(filters.goalId && { goalId: filters.goalId }),
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.stale && { staleDays: { gte: 14 } }),
      },
      include: { project: true, assignee: true, goal: true },
    });
  }
}
