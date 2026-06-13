import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IntegrationsService, IntegrationConnectDto } from './integrations.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';
import { SyncQueueService } from '../sync/sync-queue.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(
    private integrations: IntegrationsService,
    private syncQueue: SyncQueueService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  list(@CurrentUser() user: JwtPayload) {
    return this.integrations.list(user.companyId);
  }

  @Post(':provider/connect')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  async connect(
    @CurrentUser() user: JwtPayload,
    @Param('provider') provider: string,
    @Body() body: IntegrationConnectDto,
  ) {
    const result = await this.integrations.connect(user.companyId, provider, user.sub, body);
    await this.syncQueue.add('sync-tenant', { companyId: user.companyId, provider }, { delay: provider === 'clickup' ? 500 : 0 });
    return { ...result, syncQueued: true };
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
    await this.syncQueue.add('sync-tenant', { companyId: user.companyId, provider });
    return { queued: true, provider, message: 'Sync started — employees, projects, and tasks will import shortly' };
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
