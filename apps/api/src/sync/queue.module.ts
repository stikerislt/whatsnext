import { DynamicModule, Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SyncQueueService } from './sync-queue.service';
import { SyncProcessor } from './sync.processor';

function isUsableRedisUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const { hostname } = new URL(url);
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    return true;
  } catch {
    return false;
  }
}

@Global()
@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    const redisUrl = isUsableRedisUrl(process.env.REDIS_URL) ? process.env.REDIS_URL!.trim() : undefined;

    if (!redisUrl) {
      return {
        module: QueueModule,
        providers: [SyncQueueService],
        exports: [SyncQueueService],
      };
    }

    return {
      module: QueueModule,
      imports: [
        BullModule.forRoot({ connection: { url: redisUrl } }),
        BullModule.registerQueue({ name: 'sync' }),
        IntegrationsModule,
      ],
      providers: [SyncQueueService, SyncProcessor],
      exports: [SyncQueueService],
    };
  }
}
