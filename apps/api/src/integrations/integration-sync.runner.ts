import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SyncQueueService } from '../sync/sync-queue.service';
import { ClickUpSyncService } from './clickup/clickup-sync.service';

export type TenantSyncOutcome =
  | { mode: 'queued'; provider: string }
  | { mode: 'inline'; provider: 'clickup'; employees: number; projects: number; tasks: number; linked: number; stale: number }
  | { mode: 'skipped'; provider: string; reason: string };

@Injectable()
export class IntegrationSyncRunner {
  private readonly log = new Logger(IntegrationSyncRunner.name);

  constructor(
    private syncQueue: SyncQueueService,
    private clickupSync: ClickUpSyncService,
  ) {}

  async syncTenant(companyId: string, provider: string): Promise<TenantSyncOutcome> {
    const job = await this.syncQueue.add('sync-tenant', { companyId, provider });
    if (job && !('skipped' in job)) {
      return { mode: 'queued', provider };
    }

    if (provider === 'clickup') {
      this.log.log(`Running ClickUp sync inline for company ${companyId}`);
      const result = await this.clickupSync.syncTenant(companyId);
      return { mode: 'inline', ...result };
    }

    throw new BadRequestException(
      'Background sync queue is unavailable. Start Redis (docker compose up redis) or connect ClickUp from Settings.',
    );
  }
}
