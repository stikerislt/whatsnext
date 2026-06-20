import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calcTalentMatchPct, skillOverlap, calcCapacityFree } from '@whatsnext/shared';
import { EmployeeScopeService } from '../roster/employee-scope.service';

@Injectable()
export class MarketplaceService {
  constructor(
    private prisma: PrismaService,
    private employeeScope: EmployeeScopeService,
  ) {}

  getRequests(companyId: string) {
    return this.prisma.marketplaceRequest.findMany({
      where: { companyId },
      include: { requester: true, goal: true, matches: { include: { employee: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createRequest(companyId: string, data: Record<string, unknown>, requesterId: string) {
    return this.prisma.marketplaceRequest.create({
      data: {
        companyId,
        requesterId,
        title: data.title as string,
        description: data.description as string | undefined,
        skills: (data.skills as string[]) ?? [],
        urgency: (data.urgency as string) ?? 'Medium',
        goalId: data.goalId as string | undefined,
      },
    });
  }

  async rematchOpenRequests(companyId: string) {
    const open = await this.prisma.marketplaceRequest.findMany({
      where: { companyId, status: 'open' },
    });
    for (const req of open) {
      await this.matchRequest(companyId, req.id);
    }
    return { rematched: open.length };
  }

  async getTalentPool(companyId: string) {
    const rosterWhere = await this.employeeScope.rosterWhere(companyId);
    const employees = await this.prisma.employee.findMany({
      where: rosterWhere,
      include: {
        skills: { include: { skill: true } },
        cvDocument: true,
      },
      orderBy: [{ availSignalled: 'desc' }, { loadPct: 'asc' }],
    });

    return employees.map((e) => ({
      id: e.id,
      name: e.name,
      title: e.title,
      loadPct: e.loadPct,
      capacityFreePct: calcCapacityFree(e.loadPct),
      availSignalled: e.availSignalled,
      skillsList: e.skills.map((s) => s.skill.name),
      hasCv: !!e.cvDocument,
      cvSkills: e.skills.filter((s) => s.source === 'cv').map((s) => s.skill.name),
    }));
  }

  async getMatches(companyId: string) {
    return this.prisma.marketplaceMatch.findMany({
      where: { companyId },
      include: { employee: true, request: true },
      orderBy: { matchPct: 'desc' },
    });
  }

  async signalAvailability(companyId: string, employeeId: string, signalled: boolean) {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { availSignalled: signalled },
    });
  }

  async matchRequest(companyId: string, requestId: string) {
    const request = await this.prisma.marketplaceRequest.findFirst({
      where: { id: requestId, companyId },
    });
    if (!request) return [];

    const requiredSkills = (request.skills as string[]) ?? [];
    const rosterWhere = await this.employeeScope.rosterWhere(companyId);
    const employees = await this.prisma.employee.findMany({
      where: rosterWhere,
      include: { skills: { include: { skill: true } } },
    });

    const matches = employees
      .map((e) => {
        const have = e.skills.map((s) => s.skill.name);
        const overlap = skillOverlap(requiredSkills, have);
        const capacityScore = calcCapacityFree(e.loadPct);
        const matchPct = calcTalentMatchPct({
          skillOverlap: overlap,
          capacityScore,
          goalRelevance: request.goalId ? 80 : 50,
          pastPerformance: e.contribScore,
        });
        return {
          requestId,
          employeeId: e.id,
          companyId,
          matchPct,
          reason: `${overlap}% skill overlap, ${capacityScore}% free capacity`,
          effort: capacityScore > 30 ? 'Available' : 'Limited',
          impact: matchPct > 85 ? 'High' : 'Medium',
          employee: e,
        };
      })
      .filter((m) => m.matchPct > 60)
      .sort((a, b) => b.matchPct - a.matchPct)
      .slice(0, 5);

    await this.prisma.marketplaceMatch.deleteMany({ where: { requestId } });
    for (const m of matches) {
      await this.prisma.marketplaceMatch.create({
        data: {
          requestId: m.requestId,
          employeeId: m.employeeId,
          companyId: m.companyId,
          matchPct: m.matchPct,
          reason: m.reason,
          effort: m.effort,
          impact: m.impact,
        },
      });
    }
    return matches;
  }
}
