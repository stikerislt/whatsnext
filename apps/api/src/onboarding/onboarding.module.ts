import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { StrategyDocParserService } from './strategy-doc-parser.service';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [AuditModule, AiModule, IntegrationsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, StrategyDocParserService],
})
export class OnboardingModule {}
