import { Module } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';
import { StrategyModule } from '../strategy/strategy.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [StrategyModule, AiModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
