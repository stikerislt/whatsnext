import { Injectable, BadRequestException } from '@nestjs/common';
import { isDemoCompany, DEMO_STRATEGIC_GOALS } from '@whatsnext/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IntegrationsService, IntegrationConnectDto } from '../integrations/integrations.service';
import { IntegrationSyncRunner } from '../integrations/integration-sync.runner';
import { StrategyDocParserService } from './strategy-doc-parser.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private integrations: IntegrationsService,
    private syncRunner: IntegrationSyncRunner,
    private strategyDocParser: StrategyDocParserService,
  ) {}

  async saveGoals(
    companyId: string,
    goals: Array<{ title: string; description?: string; kpi?: string }>,
    userId: string,
    source: 'manual' | 'document' | 'seed' = 'manual',
  ) {
    if (goals.length > 6) throw new BadRequestException('Maximum 6 strategic goals');

    const existing = await this.prisma.strategicGoal.findMany({
      where: { companyId },
      orderBy: { sortOrder: 'asc' },
    });

    const keptIds: string[] = [];

    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      const data = {
        title: g.title,
        description: g.description ?? g.kpi,
        kpiText: g.kpi,
        sortOrder: i + 1,
        source,
      };

      if (existing[i]) {
        await this.prisma.strategicGoal.update({
          where: { id: existing[i].id },
          data,
        });
        keptIds.push(existing[i].id);
      } else {
        const created = await this.prisma.strategicGoal.create({
          data: { companyId, ...data },
        });
        keptIds.push(created.id);
      }
    }

    if (existing.length > goals.length) {
      await this.prisma.strategicGoal.deleteMany({
        where: { companyId, id: { notIn: keptIds } },
      });
    }

    await this.audit.log(companyId, userId, 'onboarding.goals_saved', 'strategic_goal', null, null, {
      count: goals.length,
      source,
    });

    return this.prisma.strategicGoal.findMany({
      where: { companyId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async restoreSampleGoals(companyId: string, userId: string) {
    if (!isDemoCompany(companyId)) return { restored: false };

    await this.saveGoals(
      companyId,
      DEMO_STRATEGIC_GOALS.map((g) => ({ title: g.title, kpi: g.kpi })),
      userId,
      'seed',
    );

    const existing = await this.prisma.strategicGoal.findMany({
      where: { companyId },
      orderBy: { sortOrder: 'asc' },
    });

    for (let i = 0; i < DEMO_STRATEGIC_GOALS.length; i++) {
      const sample = DEMO_STRATEGIC_GOALS[i];
      const goal = existing[i];
      if (!goal) continue;
      await this.prisma.strategicGoal.update({
        where: { id: goal.id },
        data: {
          status: sample.status,
          progressPct: sample.progressPct,
          source: 'seed',
        },
      });
    }

    await this.audit.log(companyId, userId, 'onboarding.sample_goals_restored', 'strategic_goal', null);
    return { restored: true };
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

    if (doc.parseStatus === 'completed') {
      return { status: 'completed', extracted: doc.extractedData };
    }
    if (doc.parseStatus === 'failed') {
      return { status: 'failed', extracted: doc.extractedData, error: 'Extraction failed' };
    }
    if (doc.parseStatus === 'processing') {
      return { status: 'processing' };
    }

    const claimed = await this.prisma.strategyDocument.updateMany({
      where: { id: jobId, parseStatus: 'pending' },
      data: { parseStatus: 'processing' },
    });
    if (claimed.count === 0) {
      const current = await this.prisma.strategyDocument.findUnique({ where: { id: jobId } });
      if (current?.parseStatus === 'processing') return { status: 'processing' };
      if (current?.parseStatus === 'completed') {
        return { status: 'completed', extracted: current.extractedData };
      }
      if (current?.parseStatus === 'failed') {
        return { status: 'failed', extracted: current.extractedData, error: 'Extraction failed' };
      }
      return { status: 'processing' };
    }

    try {
      const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
      const filePath = path.join(uploadDir, doc.s3Key);
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException('Uploaded file not found');
      }
      const buffer = fs.readFileSync(filePath);
      const extracted = await this.strategyDocParser.parse(buffer, doc.fileName);

      await this.prisma.strategyDocument.update({
        where: { id: jobId },
        data: { parseStatus: 'completed', extractedData: extracted as object },
      });
      return { status: 'completed', extracted };
    } catch (err) {
      const message = this.extractionErrorMessage(err);
      await this.prisma.strategyDocument.update({
        where: { id: jobId },
        data: { parseStatus: 'failed', extractedData: { error: message } },
      });
      return { status: 'failed', error: message, extracted: null };
    }
  }

  async connectIntegrations(
    companyId: string,
    items: Array<{ provider: string } & IntegrationConnectDto>,
    userId: string,
  ) {
    const results: Array<{
      provider: string;
      connected: boolean;
      sync?: Awaited<ReturnType<IntegrationSyncRunner['syncTenant']>>;
      error?: string;
    }> = [];

    for (const item of items) {
      const { provider, ...dto } = item;
      const hasCredentials = Boolean(dto.apiToken?.trim() || dto.workspaceId?.trim());

      if (!hasCredentials) {
        if (provider === 'clickup') {
          throw new BadRequestException('ClickUp API token and workspace are required to import your data.');
        }
        await this.prisma.integration.upsert({
          where: { companyId_provider: { companyId, provider } },
          create: { companyId, provider, status: 'pending' },
          update: { status: 'pending' },
        });
        results.push({ provider, connected: false, error: 'No API credentials provided' });
        continue;
      }

      try {
        await this.integrations.connect(companyId, provider, userId, dto);
        const sync = await this.syncRunner.syncTenant(companyId, provider);
        results.push({ provider, connected: true, sync });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Connection failed';
        results.push({ provider, connected: false, error: message });
        if (provider === 'clickup') {
          throw new BadRequestException(message);
        }
      }
    }

    await this.audit.log(companyId, userId, 'onboarding.integrations_connected', 'integration', null, null, {
      providers: items.map((i) => i.provider),
    });
    return results;
  }

  async confirmImport(companyId: string) {
    const [projects, tasks, unlinked, departmentsWithoutCoverage, connectedIntegrations] = await Promise.all([
      this.prisma.project.count({ where: { companyId } }),
      this.prisma.task.count({ where: { companyId } }),
      this.prisma.project.count({ where: { companyId, type: 'unlinked' } }),
      this.prisma.department.count({ where: { companyId, hasStrategyCoverage: false } }),
      this.prisma.integration.findMany({ where: { companyId, status: 'connected' } }),
    ]);

    const linkedTasks = await this.prisma.task.count({
      where: { companyId, OR: [{ goalId: { not: null } }, { project: { goalId: { not: null } } }] },
    });
    const taskLinkagePct = tasks ? Math.round((linkedTasks / tasks) * 100) : 0;

    const integrations = await Promise.all(
      connectedIntegrations.map(async (int) => {
        const [projectCount, taskCount] = await Promise.all([
          this.prisma.project.count({ where: { companyId, source: int.provider } }),
          this.prisma.task.count({ where: { companyId, source: int.provider } }),
        ]);
        return {
          provider: int.provider,
          projectCount,
          taskCount,
          employeeCount: (int.stats as { employees?: number })?.employees ?? 0,
          status: projectCount > 0 || taskCount > 0 ? 'ready' : int.status === 'connected' ? 'pending' : 'pending',
        };
      }),
    );

    const unlinkedMembers = await this.prisma.projectMember.findMany({
      where: { companyId, project: { type: 'unlinked' } },
      include: { employee: { select: { loadPct: true } } },
    });
    const seen = new Set<string>();
    let unlinkedLoad = 0;
    for (const m of unlinkedMembers) {
      if (seen.has(m.employeeId)) continue;
      seen.add(m.employeeId);
      unlinkedLoad += m.employee.loadPct;
    }
    const totalLoadAgg = await this.prisma.employee.aggregate({
      where: { companyId },
      _sum: { loadPct: true },
    });
    const totalLoad = totalLoadAgg._sum.loadPct ?? 0;
    const unlinkedCapacityPct = totalLoad > 0 ? Math.round((unlinkedLoad / totalLoad) * 100) : 0;

    return {
      projects,
      tasks,
      unlinkedProjects: unlinked,
      departmentsWithoutCoverage,
      taskLinkagePct,
      unlinkedCapacityPct,
      integrations,
      warnings: unlinked > 0 ? [`${unlinked} projects have no strategic direction`] : [],
    };
  }

  async complete(companyId: string, userId: string) {
    await this.audit.log(companyId, userId, 'onboarding.completed', 'company', companyId);

    if (isDemoCompany(companyId)) {
      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      return company;
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: { onboardingCompletedAt: new Date() },
    });
  }

  private extractionErrorMessage(err: unknown): string {
    if (err instanceof BadRequestException) {
      const res = err.getResponse();
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && 'message' in res) {
        const m = (res as { message: string | string[] }).message;
        return Array.isArray(m) ? m.join(', ') : m;
      }
    }
    if (err instanceof Error && !err.message.startsWith('Expected ')) {
      return err.message;
    }
    if (err instanceof Error) {
      return 'Could not extract strategic directions from this document. Try editing goals manually.';
    }
    return 'Extraction failed';
  }
}
