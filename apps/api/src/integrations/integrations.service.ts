import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClickUpClient } from './clickup/clickup.client';

export interface IntegrationConnectDto {
  apiUrl?: string;
  apiToken?: string;
  workspaceId?: string;
  workspaceName?: string;
}

export interface IntegrationCredentials {
  token: string;
  teamId: string;
  apiUrl: string;
}

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private clickup: ClickUpClient,
  ) {}

  private mask(integration: {
    id: string;
    provider: string;
    status: string;
    credentialsEncrypted: string | null;
    lastSyncAt: Date | null;
    stats: unknown;
    syncIntervalMin: number;
  }) {
    const stats = (integration.stats ?? {}) as Record<string, unknown>;
    const hasToken = !!integration.credentialsEncrypted;
    return {
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      syncIntervalMin: integration.syncIntervalMin,
      config: {
        apiUrl: (stats.apiUrl as string) ?? '',
        workspaceId: (stats.workspaceId as string) ?? '',
        workspaceName: (stats.workspaceName as string) ?? '',
        hasToken,
      },
      stats: {
        tasks: (stats.tasks as number) ?? 0,
        linked: (stats.linked as number) ?? 0,
        stale: (stats.stale as number) ?? 0,
        employees: (stats.employees as number) ?? 0,
        projects: (stats.projects as number) ?? 0,
      },
    };
  }

  async list(companyId: string) {
    const rows = await this.prisma.integration.findMany({ where: { companyId } });
    return rows.map((r) => this.mask(r));
  }

  async getCredentials(companyId: string, provider: string): Promise<IntegrationCredentials> {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    if (!integration?.credentialsEncrypted) {
      throw new BadRequestException(`${provider} is not connected — add an API token in Settings`);
    }

    const stats = (integration.stats ?? {}) as Record<string, unknown>;
    const teamId = String(stats.workspaceId ?? '');
    if (!teamId) {
      throw new BadRequestException(`${provider} workspace/team ID is required`);
    }

    return {
      token: Buffer.from(integration.credentialsEncrypted, 'base64').toString('utf8'),
      teamId,
      apiUrl: this.clickup.normalizeBaseUrl((stats.apiUrl as string) || defaultApiUrl(provider)),
    };
  }

  async connect(companyId: string, provider: string, userId: string, dto: IntegrationConnectDto = {}) {
    const existing = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    const prevStats = (existing?.stats ?? {}) as Record<string, unknown>;

    const token =
      dto.apiToken?.trim() ||
      (existing?.credentialsEncrypted
        ? Buffer.from(existing.credentialsEncrypted, 'base64').toString('utf8')
        : '');

    const apiUrl = this.clickup.normalizeBaseUrl(
      dto.apiUrl ?? (prevStats.apiUrl as string) ?? defaultApiUrl(provider),
    );
    const workspaceId = dto.workspaceId ?? (prevStats.workspaceId as string) ?? '';
    let workspaceName = dto.workspaceName ?? (prevStats.workspaceName as string) ?? '';

    if (provider === 'clickup') {
      const validation = await this.clickup.validateConnection(token, workspaceId, apiUrl);
      workspaceName = workspaceName || validation.teamName;
    }

    const tokenStored = token ? Buffer.from(token, 'utf8').toString('base64') : null;
    const stats = {
      ...prevStats,
      apiUrl,
      workspaceId,
      workspaceName,
    };

    const integration = await this.prisma.integration.upsert({
      where: { companyId_provider: { companyId, provider } },
      create: {
        companyId,
        provider,
        status: 'connected',
        credentialsEncrypted: tokenStored,
        lastSyncAt: null,
        stats,
      },
      update: {
        status: 'connected',
        credentialsEncrypted: tokenStored ?? undefined,
        stats,
      },
    });
    await this.audit.log(companyId, userId, 'integration.connected', 'integration', integration.id, null, {
      provider,
      workspaceId,
      workspaceName,
    });
    return this.mask(integration);
  }

  async updateConfig(companyId: string, provider: string, userId: string, dto: IntegrationConnectDto) {
    const existing = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    if (!existing) throw new NotFoundException('Integration not configured');

    return this.connect(companyId, provider, userId, dto);
  }

  async disconnect(companyId: string, provider: string, userId: string) {
    const integration = await this.prisma.integration.update({
      where: { companyId_provider: { companyId, provider } },
      data: { status: 'disconnected', credentialsEncrypted: null },
    });
    await this.audit.log(companyId, userId, 'integration.disconnected', 'integration', integration.id);
    return this.mask(integration);
  }

  async markSynced(companyId: string, provider: string) {
    const existing = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    if (!existing) throw new NotFoundException();
    return this.mask(existing);
  }
}

function defaultApiUrl(provider: string): string {
  const urls: Record<string, string> = {
    jira: 'https://your-domain.atlassian.net',
    clickup: 'https://api.clickup.com/api/v2',
    slack: 'https://slack.com/api',
    hibob: 'https://api.hibob.com/v1',
    teams: 'https://graph.microsoft.com/v1.0',
  };
  return urls[provider] ?? '';
}
