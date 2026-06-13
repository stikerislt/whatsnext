import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName, ROLE_PERMISSIONS } from '@whatsnext/shared';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async registerCompany(dto: {
    email: string;
    password: string;
    name: string;
    mission?: string;
    vision?: string;
    teamSizeRange?: string;
  }) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already registered');

    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        mission: dto.mission,
        vision: dto.vision,
        teamSizeRange: dto.teamSizeRange,
      },
    });

    for (const roleName of Object.values(RoleName)) {
      await this.prisma.role.create({
        data: {
          companyId: company.id,
          name: roleName,
          permissions: ROLE_PERMISSIONS[roleName],
        },
      });
    }

    const ceoRole = await this.prisma.role.findFirst({
      where: { companyId: company.id, name: RoleName.CEO },
    });

    const passwordHash = crypto.createHash('sha256').update(dto.password).digest('hex');
    const user = await this.prisma.user.create({
      data: {
        companyId: company.id,
        email: dto.email,
        passwordHash,
        authProvider: 'email',
        userRoles: ceoRole ? { create: [{ roleId: ceoRole.id }] } : undefined,
      },
      include: { userRoles: { include: { role: true } } },
    });

    return this.issueToken(user.id, user.email, company.id, [RoleName.CEO]);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== hash) throw new UnauthorizedException('Invalid credentials');
    const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueToken(user.id, user.email, user.companyId, roles);
  }

  async ssoLogin(provider: 'google' | 'microsoft', profile: { email: string; name?: string }) {
    let user = await this.prisma.user.findFirst({
      where: { email: profile.email },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('No account for this SSO user. Contact IT admin.');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { authProvider: provider, lastLoginAt: new Date() },
    });
    const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
    return this.issueToken(user.id, user.email, user.companyId, roles);
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
        employee: true,
        company: true,
      },
    });
  }

  private issueToken(userId: string, email: string, companyId: string, roles: RoleName[]) {
    const payload = { sub: userId, email, companyId, roles };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: userId, email, companyId, roles },
    };
  }
}
