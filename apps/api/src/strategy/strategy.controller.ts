import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StrategyController {
  constructor(private strategy: StrategyService) {}

  @Get('goals')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  goals(@CurrentUser() user: JwtPayload) {
    return this.strategy.findGoals(user.companyId);
  }

  @Post('goals')
  @RequirePermission(PERMISSIONS.STRATEGY_WRITE)
  create(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.strategy.createGoal(user.companyId, body);
  }

  @Get('goals/:id')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.strategy.getGoal(user.companyId, id);
  }

  @Get('strategy/alignment')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  alignment(@CurrentUser() user: JwtPayload) {
    return this.strategy.getAlignment(user.companyId);
  }

  @Get('strategy/alignment/goals/:id')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  alignmentGoal(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.strategy.getGoal(user.companyId, id);
  }
}
