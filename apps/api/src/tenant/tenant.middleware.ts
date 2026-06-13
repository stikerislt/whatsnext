import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.guards';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (user?.companyId) {
      await this.prisma.setTenant(user.companyId);
    }
    next();
  }
}
