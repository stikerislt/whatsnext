import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calcProjectEfficiency } from '@whatsnext/shared';
import { ClickUpSyncService } from '../integrations/clickup/clickup-sync.service';

@Injectable()
@Processor('sync')
export class SyncProcessor extends WorkerHost {
  private readonly log = new Logger(SyncProcessor.name);

  constructor(
    private prisma: PrismaService,
    private clickupSync: ClickUpSyncService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'sync-tenant':
        return this.syncTenant(job.data.companyId, job.data.provider);
      case 'sync-project':
        return this.syncProject(job.data.companyId, job.data.projectId);
      case 'webhook-jira':
      case 'webhook-clickup':
        return { received: true, job: job.name };
      default:
        return null;
    }
  }

  private async syncTenant(companyId: string, provider: string) {
    if (provider === 'clickup') {
      return this.clickupSync.syncTenant(companyId);
    }

    this.log.warn(`Provider ${provider} uses demo sync — implement real API client next`);
    return this.syncTenantDemo(companyId, provider);
  }

  private async syncTenantDemo(companyId: string, provider: string) {
    const mockProjects = this.getMockProjects(provider);
    for (const mp of mockProjects) {
      const project = await this.prisma.project.upsert({
        where: {
          companyId_externalId_source: {
            companyId,
            externalId: mp.externalId,
            source: provider,
          },
        },
        create: {
          companyId,
          externalId: mp.externalId,
          source: provider,
          name: mp.name,
          iconCode: mp.iconCode,
          type: mp.type,
          goalId: mp.goalId,
          status: mp.status,
          progressPct: mp.progressPct,
          timelineStart: mp.timelineStart,
          timelineEnd: mp.timelineEnd,
        },
        update: {
          name: mp.name,
          progressPct: mp.progressPct,
          lastSyncedAt: new Date(),
        },
      });

      for (const mt of mp.tasks) {
        await this.prisma.task.upsert({
          where: {
            companyId_externalId_source: {
              companyId,
              externalId: mt.externalId,
              source: provider,
            },
          },
          create: {
            companyId,
            projectId: project.id,
            externalId: mt.externalId,
            source: provider,
            name: mt.name,
            status: mt.status,
            goalId: mp.goalId,
            externalUrl: mt.url,
            estimateHours: mt.estimateHours,
          },
          update: {
            name: mt.name,
            status: mt.status,
            lastSyncedAt: new Date(),
          },
        });
      }

      const tasks = await this.prisma.task.findMany({ where: { projectId: project.id } });
      const efficiencyPct = calcProjectEfficiency(tasks);
      await this.prisma.project.update({
        where: { id: project.id },
        data: { efficiencyPct, lastSyncedAt: new Date() },
      });
    }

    await this.prisma.integration.update({
      where: { companyId_provider: { companyId, provider } },
      data: {
        lastSyncAt: new Date(),
        stats: {
          tasks: await this.prisma.task.count({ where: { companyId, source: provider } }),
          linked: await this.prisma.task.count({ where: { companyId, source: provider, goalId: { not: null } } }),
        },
      },
    });

    return { synced: true, provider, mode: 'demo' };
  }

  private async syncProject(companyId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, companyId }, include: { tasks: true } });
    if (!project) return null;
    const efficiencyPct = calcProjectEfficiency(project.tasks);
    return this.prisma.project.update({ where: { id: projectId }, data: { efficiencyPct, lastSyncedAt: new Date() } });
  }

  private getMockProjects(provider: string) {
    return [
      {
        externalId: provider === 'jira' ? 'PRJ-421' : 'CU-882',
        name: provider === 'jira' ? 'EU Localisation v2' : 'Referral Flywheel',
        iconCode: provider === 'jira' ? 'EU' : 'RF',
        type: 'strategic',
        goalId: null as string | null,
        status: 'risk',
        progressPct: 58,
        timelineStart: new Date('2026-01-01'),
        timelineEnd: new Date('2026-06-30'),
        tasks: [
          { externalId: 'T-1', name: 'Setup phase', status: 'completed', url: `https://${provider}.example/T-1`, estimateHours: 3 },
          { externalId: 'T-2', name: 'Integration', status: 'in_progress', url: `https://${provider}.example/T-2`, estimateHours: 2 },
        ],
      },
    ];
  }
}
