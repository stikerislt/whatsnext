import { Injectable } from '@nestjs/common';
import { isDemoCompany } from '@whatsnext/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  getCompany(companyId: string) {
    return this.prisma.company.findUnique({ where: { id: companyId } });
  }

  updateCompany(companyId: string, data: { name?: string; mission?: string; vision?: string; teamSizeRange?: string }) {
    return this.prisma.company.update({ where: { id: companyId }, data });
  }

  async getOnboardingStatus(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        mission: true,
        vision: true,
        teamSizeRange: true,
        onboardingCompletedAt: true,
        strategicGoals: { select: { id: true } },
        integrations: { where: { status: 'connected' } },
        employees: { select: { id: true } },
      },
    });
    if (!company) return null;

    const isDemoTenant = isDemoCompany(companyId);
    return {
      ...company,
      isDemoTenant,
      showOnboarding: isDemoTenant || !company.onboardingCompletedAt,
    };
  }
}
