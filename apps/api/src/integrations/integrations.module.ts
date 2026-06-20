import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController, WebhooksController } from './integrations.controller';
import { AuditModule } from '../audit/audit.module';
import { ClickUpClient } from './clickup/clickup.client';
import { ClickUpSyncService } from './clickup/clickup-sync.service';
import { IntegrationSyncRunner } from './integration-sync.runner';

@Module({
  imports: [AuditModule],
  controllers: [IntegrationsController, WebhooksController],
  providers: [IntegrationsService, ClickUpClient, ClickUpSyncService, IntegrationSyncRunner],
  exports: [IntegrationsService, ClickUpSyncService, IntegrationSyncRunner],
})
export class IntegrationsModule {}
