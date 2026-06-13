import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  CanActivate,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { hasPermission, Permission, RoleName } from '@whatsnext/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  roles: RoleName[];
}

export interface AuthRequest {
  user: JwtPayload;
}

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      req.user = this.jwt.verify(auth.slice(7)) as JwtPayload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.get<Permission>(PERMISSION_KEY, context.getHandler());
    if (!permission) return true;
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (!hasPermission(req.user.roles, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthRequest>().user,
);
