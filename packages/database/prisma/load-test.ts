/**
 * Load test harness — validates query performance targets:
 * 10K employees, 100K tasks, 1K projects per tenant (sample subset for CI)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANY_ID = 'load-test-tenant';

async function main() {
  console.log('Running load test sample...');
  const start = Date.now();

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: { id: COMPANY_ID, name: 'Load Test Co' },
    update: {},
  });

  const batchSize = 500;
  const employeeCount = 1000;
  const projectCount = 100;

  for (let b = 0; b < employeeCount / batchSize; b++) {
    await prisma.employee.createMany({
      data: Array.from({ length: batchSize }, (_, i) => ({
        id: `lt-emp-${b * batchSize + i}`,
        companyId: COMPANY_ID,
        name: `Employee ${b * batchSize + i}`,
        loadPct: Math.floor(Math.random() * 120),
      })),
      skipDuplicates: true,
    });
  }

  for (let p = 0; p < projectCount; p++) {
    const project = await prisma.project.create({
      data: {
        companyId: COMPANY_ID,
        name: `Project ${p}`,
        type: p % 5 === 0 ? 'unlinked' : 'strategic',
        externalId: `LT-P${p}`,
        source: 'internal',
      },
    });
    await prisma.task.createMany({
      data: Array.from({ length: 100 }, (_, t) => ({
        companyId: COMPANY_ID,
        projectId: project.id,
        name: `Task ${p}-${t}`,
        status: t % 3 === 0 ? 'completed' : 'pending',
        externalId: `LT-P${p}-T${t}`,
        source: 'internal',
      })),
    });
  }

  const q1 = Date.now();
  const overloaded = await prisma.employee.count({ where: { companyId: COMPANY_ID, loadPct: { gt: 100 } } });
  const q1ms = Date.now() - q1;

  const q2 = Date.now();
  const unlinked = await prisma.project.count({ where: { companyId: COMPANY_ID, type: 'unlinked' } });
  const q2ms = Date.now() - q2;

  const q3 = Date.now();
  const tasks = await prisma.task.count({ where: { companyId: COMPANY_ID, status: 'completed' } });
  const q3ms = Date.now() - q3;

  console.log(`Created ~${employeeCount} employees, ${projectCount} projects, ~${projectCount * 100} tasks`);
  console.log(`Overload query: ${overloaded} in ${q1ms}ms`);
  console.log(`Unlinked query: ${unlinked} in ${q2ms}ms`);
  console.log(`Task count query: ${tasks} in ${q3ms}ms`);
  console.log(`Total: ${Date.now() - start}ms`);

  const threshold = 500;
  if (q1ms > threshold || q2ms > threshold || q3ms > threshold) {
    console.warn('WARNING: Some queries exceeded threshold. Add indexes or partitioning.');
    process.exit(1);
  }
  console.log('Load test passed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
