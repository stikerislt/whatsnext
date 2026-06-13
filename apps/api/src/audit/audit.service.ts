import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(
    companyId: string,
    userId: string | null,
    action: string,
    entityType?: string | null,
    entityId?: string | null,
    before?: unknown,
    after?: unknown,
    ip?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        companyId,
        userId: userId ?? undefined,
        action,
        entityType: entityType ?? undefined,
        entityId: entityId ?? undefined,
        before: before ? (before as object) : undefined,
        after: after ? (after as object) : undefined,
        ip,
      },
    });
  }

  getLogs(companyId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { email: true } } },
    });
  }

  async exportUserData(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      include: { employee: { include: { skills: true, cvDocument: true } } },
    });
    const conversations = await this.prisma.aiConversation.findMany({ where: { userId, companyId } });
    const auditLogs = await this.prisma.auditLog.findMany({ where: { userId, companyId } });
    return {
      exportedAt: new Date().toISOString(),
      user,
      conversations,
      auditLogs,
      gdprArticle: 'Article 20 - Right to data portability',
    };
  }
}
