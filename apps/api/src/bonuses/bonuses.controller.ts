import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { BonusesService } from './bonuses.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';

@Controller('bonuses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BonusesController {
  constructor(private bonuses: BonusesService) {}

  @Get('cycles/current')
  @RequirePermission(PERMISSIONS.BONUS_VIEW_ALL)
  current(@CurrentUser() user: JwtPayload) {
    return this.bonuses.getCurrentCycle(user.companyId);
  }

  @Put('criteria')
  @RequirePermission(PERMISSIONS.BONUS_CONFIG)
  updateCriteria(
    @CurrentUser() user: JwtPayload,
    @Body() body: { criteria: Array<{ id: string; weightPct: number }> },
  ) {
    return this.bonuses.updateCriteria(user.companyId, body.criteria, user.sub);
  }

  @Get('preview')
  @RequirePermission(PERMISSIONS.BONUS_VIEW_ALL)
  preview(@CurrentUser() user: JwtPayload) {
    return this.bonuses.getPreview(user.companyId);
  }
}
