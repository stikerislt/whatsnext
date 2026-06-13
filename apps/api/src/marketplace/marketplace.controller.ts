import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';

@Controller('marketplace')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MarketplaceController {
  constructor(private marketplace: MarketplaceService) {}

  @Get('requests')
  @RequirePermission(PERMISSIONS.MARKETPLACE)
  requests(@CurrentUser() user: JwtPayload) {
    return this.marketplace.getRequests(user.companyId);
  }

  @Post('requests')
  @RequirePermission(PERMISSIONS.MARKETPLACE)
  create(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.marketplace.createRequest(user.companyId, body, user.sub);
  }

  @Get('talent-pool')
  @RequirePermission(PERMISSIONS.MARKETPLACE)
  talentPool(@CurrentUser() user: JwtPayload) {
    return this.marketplace.getTalentPool(user.companyId);
  }

  @Post('rematch')
  @RequirePermission(PERMISSIONS.MARKETPLACE)
  rematch(@CurrentUser() user: JwtPayload) {
    return this.marketplace.rematchOpenRequests(user.companyId);
  }

  @Get('matches')
  @RequirePermission(PERMISSIONS.MARKETPLACE)
  matches(@CurrentUser() user: JwtPayload) {
    return this.marketplace.getMatches(user.companyId);
  }

  @Post('signal-availability')
  @RequirePermission(PERMISSIONS.MARKETPLACE)
  signal(@CurrentUser() user: JwtPayload, @Body() body: { employeeId: string; signalled: boolean }) {
    return this.marketplace.signalAvailability(user.companyId, body.employeeId, body.signalled);
  }

  @Post('requests/:id/match')
  @RequirePermission(PERMISSIONS.MARKETPLACE)
  match(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.marketplace.matchRequest(user.companyId, id);
  }
}
