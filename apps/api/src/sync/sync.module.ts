import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncProcessor } from './sync.processor';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'sync' }), IntegrationsModule],
  providers: [SyncProcessor],
  exports: [BullModule],
})
export class SyncModule {}
