import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { resolve } from 'path';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { StrategyModule } from './strategy/strategy.module';
import { ProjectsModule } from './projects/projects.module';
import { TalentModule } from './talent/talent.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { BonusesModule } from './bonuses/bonuses.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { SyncModule } from './sync/sync.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(__dirname, '../../../.env'),
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
    }),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    }),
    PrismaModule,
    AuthModule,
    TenantModule,
    OnboardingModule,
    StrategyModule,
    ProjectsModule,
    TalentModule,
    MarketplaceModule,
    IntelligenceModule,
    BonusesModule,
    IntegrationsModule,
    AiModule,
    AuditModule,
    SyncModule,
  ],
})
export class AppModule {}
