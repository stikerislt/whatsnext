import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function withTenant<T>(
  companyId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_company', $1, true)`,
    companyId,
  );
  return fn(prisma);
}

export * from '@prisma/client';
