import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';
import { AiService } from '../ai/ai.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IntelligenceController {
  constructor(
    private intelligence: IntelligenceService,
    private ai: AiService,
  ) {}

  @Get('home/dashboard')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  home(@CurrentUser() user: JwtPayload, @Query('role') role = 'ceo') {
    return this.intelligence.getHomeDashboard(user.companyId, role);
  }

  @Get('decisions')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  decisions(@CurrentUser() user: JwtPayload) {
    return this.intelligence.getDecisions(user.companyId);
  }

  @Patch('decisions/:id')
  @RequirePermission(PERMISSIONS.DECISIONS_APPROVE)
  updateDecision(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { status: string }) {
    return this.intelligence.updateDecision(user.companyId, id, body.status);
  }

  @Post('decisions/:id/ai-analyze')
  @RequirePermission(PERMISSIONS.AI_FULL)
  analyzeDecision(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ai.analyzeDecision(user.companyId, user.sub, id);
  }

  @Get('signals')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  signals(@CurrentUser() user: JwtPayload) {
    return this.intelligence.getSignals(user.companyId);
  }

  @Patch('signals/:id/acknowledge')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  ackSignal(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.intelligence.acknowledgeSignal(user.companyId, id);
  }

  @Get('analytics/dashboard')
  @RequirePermission(PERMISSIONS.STRATEGY_READ)
  analytics(@CurrentUser() user: JwtPayload, @Query('role') role = 'ceo') {
    return this.intelligence.getAnalytics(user.companyId, role);
  }
}
