import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { IntegrationsService, IntegrationConnectDto } from './integrations.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';
import { SyncQueueService } from '../sync/sync-queue.service';
import { ClickUpClient } from './clickup/clickup.client';
import { IntegrationSyncRunner } from './integration-sync.runner';

@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(
    private integrations: IntegrationsService,
    private syncQueue: SyncQueueService,
    private syncRunner: IntegrationSyncRunner,
    private clickup: ClickUpClient,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  list(@CurrentUser() user: JwtPayload) {
    return this.integrations.list(user.companyId);
  }

  @Post('clickup/discover')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  async discoverClickUp(@Body() body: { apiToken: string; apiUrl?: string }) {
    const token = body.apiToken?.trim();
    if (!token) throw new BadRequestException('API token is required');
    const apiUrl = this.clickup.normalizeBaseUrl(body.apiUrl);
    await this.clickup.getAuthorizedUser(token, apiUrl);
    const teams = await this.clickup.getTeams(token, apiUrl);
    return teams.map((t) => ({
      id: String(t.id),
      name: t.name,
      memberCount: t.members?.length ?? 0,
    }));
  }

  @Post(':provider/connect')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  async connect(
    @CurrentUser() user: JwtPayload,
    @Param('provider') provider: string,
    @Body() body: IntegrationConnectDto,
  ) {
    const result = await this.integrations.connect(user.companyId, provider, user.sub, body);
    const sync = await this.syncRunner.syncTenant(user.companyId, provider);
    return { ...result, sync };
  }

  @Patch(':provider')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('provider') provider: string,
    @Body() body: IntegrationConnectDto,
  ) {
    return this.integrations.updateConfig(user.companyId, provider, user.sub, body);
  }

  @Post(':provider/sync')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  async sync(@CurrentUser() user: JwtPayload, @Param('provider') provider: string) {
    const sync = await this.syncRunner.syncTenant(user.companyId, provider);
    if (sync.mode === 'queued') {
      return {
        ...sync,
        message: 'Sync queued — employees, projects, and tasks will import shortly',
      };
    }
    if (sync.mode === 'inline') {
      return {
        ...sync,
        message: `Imported ${sync.employees} members, ${sync.projects} lists (projects), ${sync.tasks} tasks`,
      };
    }
    return sync;
  }

  @Delete(':provider')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  disconnect(@CurrentUser() user: JwtPayload, @Param('provider') provider: string) {
    return this.integrations.disconnect(user.companyId, provider, user.sub);
  }
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private syncQueue: SyncQueueService) {}

  @Post('jira')
  jira(@Body() body: Record<string, unknown>) {
    return this.syncQueue.add('webhook-jira', body);
  }

  @Post('clickup')
  clickup(@Body() body: Record<string, unknown>) {
    return this.syncQueue.add('webhook-clickup', body);
  }
}
