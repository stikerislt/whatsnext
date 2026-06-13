import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StrategyService } from '../strategy/strategy.service';
import {
  calcWorkTypeSplit,
  calcSignalRank,
  calcTaskLinkagePct,
} from '@whatsnext/shared';

@Injectable()
export class IntelligenceService {
  constructor(
    private prisma: PrismaService,
    private strategy: StrategyService,
  ) {}

  async getHomeDashboard(companyId: string, role: string) {
    const alignment = await this.strategy.getAlignment(companyId);
    const decisions = await this.prisma.decision.count({ where: { companyId, status: 'pending' } });
    const overloaded = await this.prisma.employee.count({ where: { companyId, loadPct: { gt: 100 } } });
    const openRequests = await this.prisma.marketplaceRequest.count({ where: { companyId, status: 'open' } });

    const projects = await this.prisma.project.findMany({
      where: { companyId },
      include: { tasks: true },
    });
    const workSplit = calcWorkTypeSplit(projects);

    const banners = this.getRoleBanner(role, alignment);
    const metrics = this.getRoleMetrics(role, {
      alignmentPct: alignment.taskLinkagePct,
      unlinked: alignment.unlinkedProjects,
      overloaded,
      decisions,
      openRequests,
      workSplit,
    });

    return {
      banner: banners,
      metrics,
      goals: alignment.goals,
      projects: projects.slice(0, 8),
      workSplit,
      decisions: await this.prisma.decision.findMany({
        where: { companyId, status: 'pending' },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
      people: await this.prisma.employee.findMany({
        where: { companyId },
        orderBy: { loadPct: 'desc' },
        take: 6,
      }),
    };
  }

  private getRoleBanner(role: string, alignment: { unlinkedProjects: number; taskLinkagePct: number; alignmentPct?: number; unlinkedCapacityPct?: number }) {
    const banners: Record<string, { title: string; desc: string }> = {
      ceo: {
        title: `${alignment.unlinkedCapacityPct ?? 22}% of your team effort is invisible to strategy`,
        desc: `${alignment.unlinkedProjects} projects running with no goal link. Strategy alignment at ${alignment.alignmentPct}%.`,
      },
      hr: {
        title: 'Capacity mismatch is costing strategy velocity',
        desc: 'Review overloaded employees and unmatched marketplace requests.',
      },
      lead: {
        title: 'Projects in your team may lack strategy links',
        desc: 'Align or stop unlinked work to recover capacity.',
      },
      emp: {
        title: 'Your work moves strategic goals forward',
        desc: 'Focus on linked tasks with highest impact.',
      },
    };
    return banners[role] ?? banners.ceo;
  }

  private getRoleMetrics(role: string, data: Record<string, unknown>) {
    const m: Record<string, Array<{ label: string; value: string; delta?: string }>> = {
      ceo: [
        { label: 'Strategy alignment', value: `${data.alignmentPct}%`, delta: '+6pp' },
        { label: 'Wasted capacity', value: `${data.unlinked} proj`, delta: 'unlinked' },
        { label: 'People overloaded', value: String(data.overloaded), delta: 'need action' },
        { label: 'Decisions', value: String(data.decisions), delta: 'blocking' },
        { label: 'Strategic work', value: `${(data.workSplit as { strategic: number }).strategic}%`, delta: 'target 70%' },
      ],
      hr: [
        { label: 'Team alignment', value: `${data.alignmentPct}%` },
        { label: 'Overloaded now', value: String(data.overloaded) },
        { label: 'Unmatched requests', value: String(data.openRequests) },
        { label: 'Avg contrib score', value: '78' },
        { label: 'Available to deploy', value: '8' },
      ],
      lead: [
        { label: 'Team capacity', value: '82%' },
        { label: 'Strategic work %', value: '45%' },
        { label: 'Unlinked projects', value: '2' },
        { label: 'Sprint velocity', value: '78' },
        { label: 'Help requests open', value: String(data.openRequests) },
      ],
      emp: [
        { label: 'My impact score', value: '84' },
        { label: 'Strategic work', value: '52%' },
        { label: 'My capacity', value: '68%' },
        { label: 'Idle tasks', value: '1' },
        { label: 'Bonus Q2 est.', value: '€2.1k' },
      ],
    };
    return m[role] ?? m.ceo;
  }

  getDecisions(companyId: string) {
    return this.prisma.decision.findMany({
      where: { companyId },
      include: { goal: true, project: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateDecision(companyId: string, id: string, status: string) {
    return this.prisma.decision.update({
      where: { id },
      data: { status },
    });
  }

  async getSignals(companyId: string) {
    let signals = await this.prisma.signal.findMany({
      where: { companyId, resolvedAt: null },
      orderBy: { rank: 'desc' },
    });
    if (!signals.length) {
      await this.generateSignals(companyId);
      signals = await this.prisma.signal.findMany({
        where: { companyId, resolvedAt: null },
        orderBy: { rank: 'desc' },
      });
    }
    return signals;
  }

  async generateSignals(companyId: string) {
    const overloaded = await this.prisma.employee.findMany({
      where: { companyId, loadPct: { gt: 100 } },
      take: 3,
    });
    const unlinked = await this.prisma.project.count({ where: { companyId, type: 'unlinked' } });
    const staleTasks = await this.prisma.task.count({ where: { companyId, staleDays: { gte: 14 } } });

    const templates = [
      overloaded[0] && {
        type: 'Overload',
        text: `${overloaded[0].name} at ${overloaded[0].loadPct}% capacity`,
        source: 'Internal',
        problemCategory: 'Talent Underutilisation',
        impactScore: 4,
        urgencyScore: 5,
      },
      unlinked > 0 && {
        type: 'Unlinked Work',
        text: `${unlinked} projects consuming capacity with no strategy link`,
        source: 'Internal',
        problemCategory: 'Strategy - Execution Gap',
        impactScore: 5,
        urgencyScore: 4,
      },
      staleTasks > 0 && {
        type: 'Stale Tasks',
        text: `${staleTasks} tasks untouched 14+ days`,
        source: 'Jira',
        problemCategory: 'No Execution Visibility',
        impactScore: 3,
        urgencyScore: 3,
      },
    ].filter(Boolean) as Array<{
      type: string;
      text: string;
      source: string;
      problemCategory: string;
      impactScore: number;
      urgencyScore: number;
    }>;

    for (const t of templates) {
      const rank = calcSignalRank(t.impactScore, t.urgencyScore, 4);
      await this.prisma.signal.create({
        data: { companyId, ...t, rank },
      });
    }
  }

  acknowledgeSignal(companyId: string, id: string) {
    return this.prisma.signal.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }

  async getAnalytics(companyId: string, role: string) {
    const projects = await this.prisma.project.findMany({
      where: { companyId },
      include: { tasks: true },
    });
    const workSplit = calcWorkTypeSplit(projects);
    const tasks = await this.prisma.task.findMany({ where: { companyId } });
    const linked = tasks.filter((t) => t.goalId).length;
    const linkage = calcTaskLinkagePct(tasks.map((t) => ({ goalId: t.goalId })));

    return {
      role,
      metrics: this.getRoleMetrics(role, { alignmentPct: linkage, workSplit, overloaded: 3, decisions: 5, openRequests: 4, unlinked: 6 }),
      workTypeByTeam: workSplit,
      goalTrend: [58, 61, 65, 68, 72, 73, 75],
      toolUtilisation: {
        jira: { tasks: 148, linked: 89, stale: 23 },
        clickup: { tasks: 67, linked: 45, stale: 12 },
      },
    };
  }
}
