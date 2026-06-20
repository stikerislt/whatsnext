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

@Injectable()
export class EmployeeScopeService {
  constructor(private prisma: PrismaService) {}

  /** True when a work tool is connected/synced — roster should exclude demo seed people. */
  async usesImportedRoster(companyId: string): Promise<boolean> {
    const [integrations, importedEmployees] = await Promise.all([
      this.prisma.integration.findMany({
        where: { companyId, status: 'connected', credentialsEncrypted: { not: null } },
        select: { provider: true, lastSyncAt: true },
      }),
      this.prisma.employee.count({ where: { companyId, externalId: { not: null } } }),
    ]);

    if (!integrations.length) return importedEmployees > 0;

    if (importedEmployees > 0) return true;

    if (integrations.some((i) => i.lastSyncAt)) return true;

    for (const integration of integrations) {
      const importedProjects = await this.prisma.project.count({
        where: { companyId, source: integration.provider },
      });
      if (importedProjects > 0) return true;
    }

    return false;
  }

  async rosterWhere(companyId: string): Promise<Prisma.EmployeeWhereInput> {
    if (!(await this.usesImportedRoster(companyId))) {
      return { companyId };
    }
    return {
      companyId,
      externalId: { not: null },
    };
  }
}
