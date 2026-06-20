import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { LlmService } from './llm.service';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [StrategyModule],
  controllers: [AiController],
  providers: [AiService, LlmService],
  exports: [AiService, LlmService],
})
export class AiModule {}
