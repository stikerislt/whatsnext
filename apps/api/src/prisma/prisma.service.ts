import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@whatsnext/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async setTenant(companyId: string) {
    await this.$executeRawUnsafe(
      `SELECT set_config('app.current_company', $1, true)`,
      companyId,
    );
  }
}
