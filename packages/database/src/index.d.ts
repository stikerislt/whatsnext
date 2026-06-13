import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function withTenant<T>(companyId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T>;
export * from '@prisma/client';
