import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';

@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiController {
  constructor(private ai: AiService) {}

  @Post('chat')
  @RequirePermission(PERMISSIONS.AI_FULL)
  chat(
    @CurrentUser() user: JwtPayload,
    @Body() body: { panel?: string; message: string; conversationId?: string },
  ) {
    return this.ai.chat(user.companyId, user.sub, body.panel ?? 'full', body.message, body.conversationId);
  }
}
