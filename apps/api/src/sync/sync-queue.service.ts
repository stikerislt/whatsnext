import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SyncQueueService {
  private readonly log = new Logger(SyncQueueService.name);

  constructor(@Optional() @InjectQueue('sync') private readonly queue?: Queue) {}

  async add(jobName: string, data: Record<string, unknown>, opts?: { delay?: number }) {
    if (!this.queue) {
      this.log.warn(`REDIS_URL not set — skipped job ${jobName}`);
      return { skipped: true, reason: 'redis_not_configured' };
    }
    return this.queue.add(jobName, data, opts);
  }
}
