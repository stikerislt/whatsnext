import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calcContributionScore, calcBonusPayout } from '@whatsnext/shared';
import { AuditService } from '../audit/audit.service';
import { EmployeeScopeService } from '../roster/employee-scope.service';

const DEFAULT_CRITERIA = [
  { name: 'Strategic Goal Contribution', weight: 40, metric: 'Task-to-goal linkage', source: 'Jira/ClickUp' },
  { name: 'Marketplace Collaboration', weight: 20, metric: 'Accepted requests + hours', source: 'WhatNext' },
  { name: 'Skill Development', weight: 15, metric: 'Courses + certifications', source: 'LMS API' },
  { name: 'Execution Velocity', weight: 15, metric: 'Sprint velocity', source: 'Jira/ClickUp' },
  { name: 'Team Health Contribution', weight: 10, metric: 'Peer score + shares', source: 'WhatNext/Slack' },
];

@Injectable()
export class BonusesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private employeeScope: EmployeeScopeService,
  ) {}

  async getCurrentCycle(companyId: string) {
    let cycle = await this.prisma.bonusCycle.findFirst({
      where: { companyId, status: 'active' },
      include: { criteria: true, scores: { include: { employee: true } } },
    });
    if (!cycle) {
      cycle = await this.prisma.bonusCycle.create({
        data: {
          companyId,
          name: 'Q2 2026',
          periodStart: new Date('2026-04-01'),
          periodEnd: new Date('2026-06-30'),
          totalPoolAmount: 18100,
          criteria: {
            create: DEFAULT_CRITERIA.map((c) => ({
              companyId,
              name: c.name,
              weightPct: c.weight,
              metric: c.metric,
              source: c.source,
              description: c.name,
            })),
          },
        },
        include: { criteria: true, scores: { include: { employee: true } } },
      });
    }
    return cycle;
  }

  async updateCriteria(companyId: string, criteria: Array<{ id: string; weightPct: number }>, userId: string) {
    for (const c of criteria) {
      await this.prisma.bonusCriterion.update({
        where: { id: c.id },
        data: { weightPct: c.weightPct },
      });
    }
    await this.audit.log(companyId, userId, 'bonus.criteria_updated', 'bonus_cycle', null);
    return this.getCurrentCycle(companyId);
  }

  async getPreview(companyId: string) {
    const cycle = await this.getCurrentCycle(companyId);
    const rosterWhere = await this.employeeScope.rosterWhere(companyId);
    const employees = await this.prisma.employee.findMany({ where: rosterWhere });
    const criteria = cycle.criteria.map((c) => ({ name: c.name, weight: c.weightPct, score: 75 }));

    const scores = employees.map((e) => {
      const empCriteria = criteria.map((c) => ({
        ...c,
        score: c.name.includes('Strategic') ? Math.min(100, e.contribScore) : 70 + Math.floor(Math.random() * 20),
      }));
      const totalScore = calcContributionScore(empCriteria);
      return { employee: e, totalScore, criteria: empCriteria };
    });

    const allScores = scores.map((s) => s.totalScore);
    const preview = scores.map((s) => ({
      ...s,
      estimatedPayout: calcBonusPayout(s.totalScore, cycle.totalPoolAmount, allScores),
    }));

    return { cycle, preview, totalPool: cycle.totalPoolAmount };
  }
}
