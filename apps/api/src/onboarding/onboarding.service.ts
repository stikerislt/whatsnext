import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async saveGoals(companyId: string, goals: Array<{ title: string; description?: string }>, userId: string) {
    if (goals.length > 6) throw new BadRequestException('Maximum 6 strategic goals');
    await this.prisma.strategicGoal.deleteMany({ where: { companyId } });
    const created = await Promise.all(
      goals.map((g, i) =>
        this.prisma.strategicGoal.create({
          data: {
            companyId,
            title: g.title,
            description: g.description,
            sortOrder: i + 1,
            source: 'manual',
          },
        }),
      ),
    );
    await this.audit.log(companyId, userId, 'onboarding.goals_saved', 'strategic_goal', null, null, { count: created.length });
    return created;
  }

  async uploadStrategyDoc(companyId: string, file: Express.Multer.File, userId: string) {
    const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
    const dir = path.join(uploadDir, companyId, 'strategy');
    fs.mkdirSync(dir, { recursive: true });
    const s3Key = path.join(companyId, 'strategy', file.originalname);
    const dest = path.join(uploadDir, s3Key);
    fs.writeFileSync(dest, file.buffer);

    const doc = await this.prisma.strategyDocument.create({
      data: { companyId, fileName: file.originalname, s3Key, parseStatus: 'pending' },
    });
    await this.audit.log(companyId, userId, 'onboarding.strategy_doc_uploaded', 'strategy_document', doc.id);
    return { id: doc.id, jobId: doc.id, status: 'pending' };
  }

  async getExtraction(jobId: string) {
    const doc = await this.prisma.strategyDocument.findUnique({ where: { id: jobId } });
    if (!doc) throw new BadRequestException('Job not found');
    if (doc.parseStatus === 'pending') {
      const extracted = {
        goals: [
          { title: 'Expand into EU market', kpi: '€2M ARR EU by Q4' },
          { title: 'Product-led growth engine', kpi: '25% signups from PLG' },
          { title: 'Cut CAC by 30%', kpi: 'CAC from €180 to €126' },
          { title: 'Platform scalability 10x', kpi: '99.99% uptime at 10x load' },
          { title: 'Data-driven culture', kpi: '80% teams using dashboards' },
        ],
      };
      await this.prisma.strategyDocument.update({
        where: { id: jobId },
        data: { parseStatus: 'completed', extractedData: extracted },
      });
      return { status: 'completed', extracted };
    }
    return { status: doc.parseStatus, extracted: doc.extractedData };
  }

  async connectIntegrations(companyId: string, providers: string[], userId: string) {
    const results = [];
    for (const provider of providers) {
      const integration = await this.prisma.integration.upsert({
        where: { companyId_provider: { companyId, provider } },
        create: { companyId, provider, status: 'connected' },
        update: { status: 'connected', lastSyncAt: new Date() },
      });
      results.push(integration);
    }
    await this.audit.log(companyId, userId, 'onboarding.integrations_connected', 'integration', null, null, { providers });
    return results;
  }

  async confirmImport(companyId: string) {
    const [projects, tasks, unlinked] = await Promise.all([
      this.prisma.project.count({ where: { companyId } }),
      this.prisma.task.count({ where: { companyId } }),
      this.prisma.project.count({ where: { companyId, type: 'unlinked' } }),
    ]);
    const linkedTasks = await this.prisma.task.count({
      where: { companyId, OR: [{ goalId: { not: null } }, { project: { goalId: { not: null } } }] },
    });
    const taskLinkagePct = tasks ? Math.round((linkedTasks / tasks) * 100) : 0;
    return {
      projects,
      tasks,
      unlinkedProjects: unlinked,
      taskLinkagePct,
      warnings: unlinked > 0 ? [`${unlinked} projects have no strategic direction`] : [],
    };
  }

  async complete(companyId: string, userId: string) {
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: { onboardingCompletedAt: new Date() },
    });
    await this.audit.log(companyId, userId, 'onboarding.completed', 'company', companyId);
    return company;
  }
}
