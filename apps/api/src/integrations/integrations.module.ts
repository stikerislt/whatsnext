import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController, WebhooksController } from './integrations.controller';
import { AuditModule } from '../audit/audit.module';
import { ClickUpClient } from './clickup/clickup.client';
import { ClickUpSyncService } from './clickup/clickup-sync.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'sync' }), AuditModule],
  controllers: [IntegrationsController, WebhooksController],
  providers: [IntegrationsService, ClickUpClient, ClickUpSyncService],
  exports: [IntegrationsService, ClickUpSyncService],
})
export class IntegrationsModule {}
