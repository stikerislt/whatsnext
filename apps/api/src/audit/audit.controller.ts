import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get('logs')
  @RequirePermission(PERMISSIONS.AUDIT_READ)
  logs(@CurrentUser() user: JwtPayload) {
    return this.audit.getLogs(user.companyId);
  }

  @Post('gdpr/export')
  @RequirePermission(PERMISSIONS.GDPR_EXPORT)
  gdprExport(@CurrentUser() user: JwtPayload) {
    return this.audit.exportUserData(user.companyId, user.sub);
  }
}
