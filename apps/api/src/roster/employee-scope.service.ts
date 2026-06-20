import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Demo seed rows use fixed ids like emp-TN and @example.com emails. */
export function isSeedEmployee(employee: { id: string; externalId?: string | null; email?: string | null }): boolean {
  if (employee.externalId) return false;
  if (employee.id.startsWith('emp-')) return true;
  if (employee.email?.toLowerCase().endsWith('@example.com')) return true;
  return false;
}

/** Rows created by a live API sync (not demo seed people). */
export function isLiveImportedEmployee(employee: { id: string; externalId?: string | null }): boolean {
  return Boolean(employee.externalId) && !employee.id.startsWith('emp-');
}

@Injectable()
export class EmployeeScopeService {
  constructor(private prisma: PrismaService) {}

  /** True only when an integration has real API credentials (not stale DB rows). */
  async usesImportedRoster(companyId: string): Promise<boolean> {
    const integrations = await this.prisma.integration.findMany({
      where: { companyId, status: 'connected', credentialsEncrypted: { not: null } },
      select: { provider: true, lastSyncAt: true },
    });

    if (!integrations.length) return false;

    const liveImports = await this.prisma.employee.count({
      where: {
        companyId,
        externalId: { not: null },
        NOT: { id: { startsWith: 'emp-' } },
      },
    });
    if (liveImports > 0) return true;

    if (integrations.some((i) => i.lastSyncAt)) return true;

    for (const integration of integrations) {
      const liveProjects = await this.prisma.project.count({
        where: {
          companyId,
          source: integration.provider,
          metadata: { path: ['clickupTeamId'], not: Prisma.DbNull },
        },
      });
      if (liveProjects > 0) return true;
    }

    return false;
  }

  async rosterWhere(companyId: string): Promise<Prisma.EmployeeWhereInput> {
    if (await this.usesImportedRoster(companyId)) {
      return {
        companyId,
        externalId: { not: null },
        NOT: { id: { startsWith: 'emp-' } },
      };
    }
    return {
      companyId,
      OR: [{ externalId: null }, { id: { startsWith: 'emp-' } }],
    };
  }
}
