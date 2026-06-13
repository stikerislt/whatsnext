import { Module } from '@nestjs/common';
import { BonusesService } from './bonuses.service';
import { BonusesController } from './bonuses.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BonusesController],
  providers: [BonusesService],
})
export class BonusesModule {}
