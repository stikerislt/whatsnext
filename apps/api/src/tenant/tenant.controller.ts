import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard, CurrentUser, JwtPayload } from '../auth/auth.guards';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private tenant: TenantService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: JwtPayload) {
    return this.tenant.getCompany(user.companyId);
  }

  @Patch('current')
  update(@CurrentUser() user: JwtPayload, @Body() body: Record<string, string>) {
    return this.tenant.updateCompany(user.companyId, body);
  }

  @Get('current/onboarding-status')
  onboardingStatus(@CurrentUser() user: JwtPayload) {
    return this.tenant.getOnboardingStatus(user.companyId);
  }
}
