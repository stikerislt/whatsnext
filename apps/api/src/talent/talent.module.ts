import { Module } from '@nestjs/common';
import { TalentService } from './talent.service';
import { TalentController } from './talent.controller';
import { CvParserService } from './cv-parser.service';
import { OcrSpaceService } from './ocr-space.service';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [AuditModule, MarketplaceModule],
  controllers: [TalentController],
  providers: [TalentService, CvParserService, OcrSpaceService],
  exports: [TalentService],
})
export class TalentModule {}
