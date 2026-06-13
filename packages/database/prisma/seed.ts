import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
const RoleName = {
  SUPER_ADMIN: 'super_admin',
  CEO: 'ceo',
  EXECUTIVE: 'executive',
  HR: 'hr',
  TEAM_LEAD: 'team_lead',
  EMPLOYEE: 'employee',
} as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  ceo: ['strategy:read', 'strategy:write', 'projects:read', 'integrations:manage'],
  executive: ['strategy:read', 'strategy:write', 'projects:read'],
  hr: ['talent:read', 'talent:write', 'bonus:config'],
  team_lead: ['projects:read', 'projects:write', 'talent:read'],
  employee: ['projects:read', 'talent:read'],
};

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding What\'s Next demo tenant...');

  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'TechNova, UAB',
      mission: 'We help growing companies scale operations without losing strategic focus.',
      vision: 'To become the operating backbone for 10,000 companies across Europe by 2028.',
      teamSizeRange: '30-100 people',
      onboardingCompletedAt: new Date(),
    },
    update: {},
  });

  for (const roleName of Object.values(RoleName)) {
    await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: roleName } },
      create: { companyId: company.id, name: roleName, permissions: ROLE_PERMISSIONS[roleName] ?? [] },
      update: { permissions: ROLE_PERMISSIONS[roleName] ?? [] },
    });
  }

  const ceoRole = await prisma.role.findFirst({ where: { companyId: company.id, name: RoleName.CEO } });
  const hash = crypto.createHash('sha256').update('demo12345').digest('hex');

  const user = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'elena@technova.lt' } },
    create: {
      companyId: company.id,
      email: 'elena@technova.lt',
      passwordHash: hash,
      userRoles: ceoRole ? { create: [{ roleId: ceoRole.id }] } : undefined,
    },
    update: {},
  });

  const depts = await Promise.all(
    ['Engineering', 'Product', 'Data', 'People', 'Marketing', 'Design'].map((name) =>
      prisma.department.upsert({
        where: { id: `dept-${name.toLowerCase()}` },
        create: { id: `dept-${name.toLowerCase()}`, companyId: company.id, name, hasStrategyCoverage: name !== 'Marketing' },
        update: {},
      }),
    ),
  );

  const peopleData = [
    { initials: 'TN', name: 'Tomas Bernotas', title: 'Engineer', dept: 'Engineering', load: 110, color: '#e85d8a', contrib: 88, skills: ['Backend', 'Kubernetes', 'Python', 'Go'] },
    { initials: 'MR', name: 'Marta Rimkevičiūtė', title: 'Product Lead', dept: 'Product', load: 95, color: '#9333EA', contrib: 92, skills: ['Product', 'Strategy', 'UX'] },
    { initials: 'KL', name: 'Kristina Laurinaitė', title: 'Eng. Lead', dept: 'Engineering', load: 104, color: '#D97706', contrib: 85, skills: ['Backend', 'Security', 'Architecture'] },
    { initials: 'AN', name: 'Aistė Norvilaitė', title: 'Data Analyst', dept: 'Data', load: 68, color: '#16A34A', contrib: 84, skills: ['Data', 'SQL', 'Python', 'dbt'] },
    { initials: 'TG', name: 'Tomas Grigaitis', title: 'Designer', dept: 'Design', load: 82, color: '#2563EB', contrib: 76, skills: ['Design', 'UX', 'Figma'] },
    { initials: 'LR', name: 'Laura Rimkutė', title: 'Head of People', dept: 'People', load: 60, color: '#e85d8a', contrib: 79, skills: ['HR', 'OKRs', 'Culture'] },
    { initials: 'DM', name: 'Darius Mackevičius', title: 'Frontend Eng.', dept: 'Engineering', load: 78, color: '#7C3AED', contrib: 72, skills: ['React', 'TypeScript', 'Next.js'] },
    { initials: 'SR', name: 'Sandra Račkauskaitė', title: 'Marketing', dept: 'Marketing', load: 88, color: '#FF751F', contrib: 70, skills: ['SEO', 'Content', 'HubSpot'] },
    { initials: 'BK', name: 'Benas Kazlauskas', title: 'Backend Eng.', dept: 'Engineering', load: 55, color: '#16A34A', contrib: 65, skills: ['Go', 'APIs', 'Docker'] },
    { initials: 'JJ', name: 'Jonas Jonaitis', title: 'Software Engineer', dept: 'Engineering', load: 82, color: '#0EA5E9', contrib: 68, skills: [] },
  ];

  const employees = [];
  for (const p of peopleData) {
    const dept = depts.find((d) => d.name === p.dept);
    const emp = await prisma.employee.upsert({
      where: { id: `emp-${p.initials}` },
      create: {
        id: `emp-${p.initials}`,
        companyId: company.id,
        departmentId: dept?.id,
        initials: p.initials,
        name: p.name,
        title: p.title,
        email: `${p.initials.toLowerCase()}@technova.lt`,
        avatarColor: p.color,
        loadPct: p.load,
        contribScore: p.contrib,
        availSignalled: p.load < 85,
        bonusPoolEstimate: 2000,
      },
      update: {},
    });
    employees.push(emp);

    for (const skillName of p.skills) {
      const skill = await prisma.skill.upsert({
        where: { companyId_normalizedName: { companyId: company.id, normalizedName: skillName.toLowerCase() } },
        create: { companyId: company.id, name: skillName, normalizedName: skillName.toLowerCase(), category: p.dept },
        update: {},
      });
      await prisma.employeeSkill.upsert({
        where: { employeeId_skillId: { employeeId: emp.id, skillId: skill.id } },
        create: { employeeId: emp.id, skillId: skill.id, companyId: company.id, source: 'manual' },
        update: {},
      });
    }

    await prisma.workAllocation.upsert({
      where: { id: `wa-${p.initials}` },
      create: {
        id: `wa-${p.initials}`,
        employeeId: emp.id,
        companyId: company.id,
        periodStart: new Date(),
        strategicPct: 50 + Math.floor(Math.random() * 30),
        operationalPct: 20,
        meetingsPct: 10,
      },
      update: {},
    });
  }

  const goalsData = [
    { title: 'Expand into EU market', kpi: '€2M ARR EU by Q4', status: 'at_risk', progress: 58, order: 1 },
    { title: 'Product-led growth engine', kpi: '25% signups from PLG', status: 'on_track', progress: 72, order: 2 },
    { title: 'Cut CAC by 30%', kpi: 'CAC from €180 to €126', status: 'off_track', progress: 41, order: 3 },
    { title: 'Platform scalability 10x', kpi: '99.99% uptime at 10x load', status: 'on_track', progress: 84, order: 4 },
    { title: 'Data-driven culture', kpi: '80% teams using dashboards', status: 'at_risk', progress: 35, order: 5 },
  ];

  const goals = [];
  for (const g of goalsData) {
    const goal = await prisma.strategicGoal.upsert({
      where: { id: `goal-${g.order}` },
      create: {
        id: `goal-${g.order}`,
        companyId: company.id,
        title: g.title,
        kpiText: g.kpi,
        status: g.status,
        progressPct: g.progress,
        sortOrder: g.order,
        ownerId: employees[g.order % employees.length]?.id,
      },
      update: {},
    });
    goals.push(goal);
  }

  const projectsData = [
    { name: 'EU Localisation v2', ic: 'EU', type: 'strategic', goal: 1, prog: 58, ext: 'PRJ-421', src: 'jira' },
    { name: 'Referral Flywheel', ic: 'RF', type: 'strategic', goal: 2, prog: 72, ext: 'CU-882', src: 'clickup' },
    { name: 'K8s Migration', ic: 'K8', type: 'tactical', goal: 4, prog: 44, ext: 'INF-184', src: 'jira' },
    { name: 'Self-serve Analytics', ic: 'AN', type: 'strategic', goal: 5, prog: 65, ext: 'DATA-91', src: 'jira' },
    { name: 'Marketing Rebrand', ic: 'MK', type: 'unlinked', goal: null, prog: 30, ext: 'MK-1', src: 'internal' },
    { name: 'Sales Tooling Upgrade', ic: 'SL', type: 'unlinked', goal: null, prog: 20, ext: 'SALES-7', src: 'jira' },
    { name: 'SEO Overhaul', ic: 'SE', type: 'strategic', goal: 3, prog: 41, ext: 'SEO-14', src: 'jira' },
    { name: 'Mobile App v3', ic: 'MB', type: 'tactical', goal: 2, prog: 55, ext: 'MOB-201', src: 'clickup' },
  ];

  for (const [i, p] of projectsData.entries()) {
    const project = await prisma.project.upsert({
      where: { companyId_externalId_source: { companyId: company.id, externalId: p.ext, source: p.src } },
      create: {
        companyId: company.id,
        externalId: p.ext,
        source: p.src,
        name: p.name,
        iconCode: p.ic,
        type: p.type,
        goalId: p.goal ? goals[p.goal - 1]?.id : null,
        ownerId: employees[i % employees.length]?.id,
        progressPct: p.prog,
        timelineStart: new Date('2026-01-01'),
        timelineEnd: new Date('2026-09-30'),
      },
      update: {},
    });

    const taskStatuses = ['completed', 'in_progress', 'pending', 'off_track'];
    for (let t = 0; t < 4; t++) {
      await prisma.task.upsert({
        where: {
          companyId_externalId_source: {
            companyId: company.id,
            externalId: `${p.ext}-T${t}`,
            source: p.src,
          },
        },
        create: {
          companyId: company.id,
          projectId: project.id,
          externalId: `${p.ext}-T${t}`,
          source: p.src,
          name: `${p.name} task ${t + 1}`,
          status: taskStatuses[t % 4],
          goalId: p.goal ? goals[p.goal - 1]?.id : null,
          assigneeId: employees[t % employees.length]?.id,
          externalUrl: `https://${p.src}.example/${p.ext}-T${t}`,
          estimateHours: 2 + t,
        },
        update: {},
      });
    }
  }

  await prisma.integration.createMany({
    data: [
      { companyId: company.id, provider: 'jira', status: 'connected', stats: { tasks: 148, linked: 89, stale: 23 } },
      { companyId: company.id, provider: 'clickup', status: 'connected', stats: { tasks: 67, linked: 45, stale: 12 } },
    ],
    skipDuplicates: true,
  });

  await prisma.decision.createMany({
    data: [
      { companyId: company.id, title: 'Approve budget extension: EU Localisation', urgency: 'Urgent', detail: '€45k needed for Q2 launch', goalId: goals[0]?.id, color: '#DC2626' },
      { companyId: company.id, title: 'Resolve Tomas Bernotas overload (110%)', urgency: 'High', detail: 'Reassign K8s subtask to Benas', goalId: goals[3]?.id, color: '#D97706' },
    ],
    skipDuplicates: true,
  });

  const requester = employees.find((e) => e.initials === 'LR') ?? employees[0];
  const marketplaceRequests = [
    {
      id: 'mkt-req-1',
      title: 'React/TypeScript dev for EU Localisation',
      description: 'Frontend support for EU Localisation v2 — React, TypeScript, Next.js',
      skills: ['React', 'TypeScript', 'Next.js'],
      urgency: 'High',
      goalId: goals[0]?.id,
    },
    {
      id: 'mkt-req-2',
      title: 'Data analyst for dashboards initiative',
      description: 'Support data-driven culture goal with SQL and analytics',
      skills: ['SQL', 'Data Analysis', 'Python', 'Tableau'],
      urgency: 'Medium',
      goalId: goals[4]?.id,
    },
    {
      id: 'mkt-req-3',
      title: 'Project manager for cross-functional rollout',
      description: 'Coordinate strategic projects across teams',
      skills: ['Project Management', 'Strategic Planning', 'Agile'],
      urgency: 'Medium',
      goalId: goals[1]?.id,
    },
  ];

  for (const r of marketplaceRequests) {
    await prisma.marketplaceRequest.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        companyId: company.id,
        requesterId: requester.id,
        title: r.title,
        description: r.description,
        skills: r.skills,
        urgency: r.urgency,
        goalId: r.goalId,
        status: 'open',
      },
      update: {
        skills: r.skills,
        status: 'open',
      },
    });
  }

  console.log('Seed complete. Login: elena@technova.lt / demo12345');
  console.log('Company ID:', company.id);
  console.log('User ID:', user.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
