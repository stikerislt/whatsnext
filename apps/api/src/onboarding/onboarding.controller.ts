import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard, CurrentUser, JwtPayload } from '../auth/auth.guards';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @Put('goals')
  saveGoals(
    @CurrentUser() user: JwtPayload,
    @Body() body: { goals: Array<{ title: string; description?: string; kpi?: string }>; source?: 'manual' | 'document' },
  ) {
    return this.onboarding.saveGoals(user.companyId, body.goals, user.sub, body.source ?? 'manual');
  }

  @Post('restore-sample-goals')
  restoreSampleGoals(@CurrentUser() user: JwtPayload) {
    return this.onboarding.restoreSampleGoals(user.companyId, user.sub);
  }

  @Post('strategy-doc')
  @UseInterceptors(FileInterceptor('file'))
  uploadDoc(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.onboarding.uploadStrategyDoc(user.companyId, file, user.sub);
  }

  @Get('extraction/:jobId')
  getExtraction(@Param('jobId') jobId: string) {
    return this.onboarding.getExtraction(jobId);
  }

  @Post('integrations')
  connect(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      integrations: Array<{ provider: string; apiUrl?: string; apiToken?: string; workspaceId?: string; workspaceName?: string }>;
    },
  ) {
    return this.onboarding.connectIntegrations(user.companyId, body.integrations ?? [], user.sub);
  }

  @Post('confirm-import')
  confirmImport(@CurrentUser() user: JwtPayload) {
    return this.onboarding.confirmImport(user.companyId);
  }

  @Post('complete')
  complete(@CurrentUser() user: JwtPayload) {
    return this.onboarding.complete(user.companyId, user.sub);
  }
}
