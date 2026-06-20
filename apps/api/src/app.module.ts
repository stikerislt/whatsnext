import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { QueueModule } from './sync/queue.module';
import { RosterModule } from './roster/roster.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(__dirname, '../../../.env'),
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
    }),
    QueueModule.forRoot(),
    PrismaModule,
    RosterModule,
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
  ],
})
export class AppModule {}
