import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationsService } from '../integrations.service';
import { ClickUpClient } from './clickup.client';
import { calcProjectEfficiency } from '@whatsnext/shared';
import type { ClickUpTask, ClickUpUser } from './clickup.types';

export interface ClickUpSyncResult {
  provider: 'clickup';
  employees: number;
  projects: number;
  tasks: number;
  linked: number;
  stale: number;
}

@Injectable()
export class ClickUpSyncService {
  private readonly log = new Logger(ClickUpSyncService.name);

  constructor(
    private prisma: PrismaService,
    private integrations: IntegrationsService,
    private clickup: ClickUpClient,
  ) {}

  async syncTenant(companyId: string): Promise<ClickUpSyncResult> {
    const { token, teamId, apiUrl } = await this.integrations.getCredentials(companyId, 'clickup');
    this.log.log(`Starting ClickUp sync for company ${companyId}, team ${teamId}`);

    const employeeMap = await this.syncMembers(companyId, token, teamId, apiUrl);
    const projectStats = await this.syncProjectsAndTasks(companyId, token, teamId, apiUrl, employeeMap);
    await this.recalculateEmployeeLoad(companyId);

    const stale = await this.prisma.task.count({
      where: {
        companyId,
        source: 'clickup',
        OR: [{ status: 'off_track' }, { staleDays: { gte: 7 } }],
      },
    });

    const stats = {
      tasks: projectStats.tasks,
      linked: projectStats.linked,
      stale,
      employees: employeeMap.size,
      projects: projectStats.projects,
      lists: projectStats.projects,
    };

    await this.prisma.integration.update({
      where: { companyId_provider: { companyId, provider: 'clickup' } },
      data: { lastSyncAt: new Date(), status: 'connected', stats },
    });

    return {
      provider: 'clickup',
      employees: employeeMap.size,
      projects: projectStats.projects,
      tasks: projectStats.tasks,
      linked: projectStats.linked,
      stale,
    };
  }

  private async syncMembers(
    companyId: string,
    token: string,
    teamId: string,
    apiUrl: string,
  ): Promise<Map<number, string>> {
    const members = await this.clickup.getTeamMembers(token, teamId, apiUrl);
    const map = new Map<number, string>();

    for (const user of members) {
      const employeeId = await this.upsertEmployee(companyId, user);
      map.set(user.id, employeeId);
    }

    return map;
  }

  private async upsertEmployee(companyId: string, user: ClickUpUser): Promise<string> {
    const externalId = String(user.id);
    const name = user.username || user.email?.split('@')[0] || `User ${user.id}`;
    const initials = name
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const existing = await this.prisma.employee.findFirst({
      where: {
        companyId,
        OR: [{ externalId }, ...(user.email ? [{ email: user.email }] : [])],
      },
    });

    if (existing) {
      const updated = await this.prisma.employee.update({
        where: { id: existing.id },
        data: {
          externalId,
          name: existing.name || name,
          email: user.email ?? existing.email,
          initials: existing.initials || initials,
        },
      });
      return updated.id;
    }

    const created = await this.prisma.employee.create({
      data: {
        companyId,
        externalId,
        name,
        email: user.email,
        initials,
        title: 'ClickUp member',
        avatarColor: colorFromString(user.email ?? name),
      },
    });
    return created.id;
  }

  private async syncProjectsAndTasks(
    companyId: string,
    token: string,
    teamId: string,
    apiUrl: string,
    employeeMap: Map<number, string>,
  ) {
    const lists = await this.clickup.getAllLists(token, teamId, apiUrl);
    let taskCount = 0;
    let linkedCount = 0;

    for (const list of lists) {
      const projectType = inferProjectType(list.name, list.spaceName, list.folderName);
      const iconCode = (list.name.slice(0, 2) || 'CU').toUpperCase();

      const project = await this.prisma.project.upsert({
        where: {
          companyId_externalId_source: {
            companyId,
            externalId: list.id,
            source: 'clickup',
          },
        },
        create: {
          companyId,
          externalId: list.id,
          source: 'clickup',
          name: list.name,
          iconCode,
          type: projectType,
          metadata: {
            spaceName: list.spaceName,
            folderName: list.folderName ?? null,
            clickupTeamId: teamId,
          },
          timelineStart: new Date(),
        },
        update: {
          name: list.name,
          type: projectType,
          metadata: {
            spaceName: list.spaceName,
            folderName: list.folderName ?? null,
            clickupTeamId: teamId,
          },
          lastSyncedAt: new Date(),
        },
      });

      const tasks = await this.clickup.getTasks(token, list.id, apiUrl);
      const memberIds = new Set<string>();

      for (const task of tasks) {
        const assigneeId = await this.resolveAssignee(companyId, task, employeeMap);
        if (assigneeId) memberIds.add(assigneeId);

        const status = mapTaskStatus(task);
        const estimateHours = task.time_estimate ? task.time_estimate / (1000 * 60 * 60) : 2;
        const staleDays = daysSince(task.date_updated);

        await this.prisma.task.upsert({
          where: {
            companyId_externalId_source: {
              companyId,
              externalId: task.id,
              source: 'clickup',
            },
          },
          create: {
            companyId,
            projectId: project.id,
            externalId: task.id,
            source: 'clickup',
            name: task.name,
            status,
            assigneeId,
            goalId: project.goalId,
            estimateHours,
            externalUrl: task.url,
            staleDays,
          },
          update: {
            projectId: project.id,
            name: task.name,
            status,
            assigneeId,
            estimateHours,
            externalUrl: task.url,
            staleDays,
            lastSyncedAt: new Date(),
          },
        });
        taskCount += 1;
        if (project.goalId) linkedCount += 1;
      }

      const projectTasks = await this.prisma.task.findMany({ where: { projectId: project.id } });
      const completed = projectTasks.filter((t) => t.status === 'completed').length;
      const progressPct = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
      const efficiencyPct = calcProjectEfficiency(projectTasks);

      await this.prisma.project.update({
        where: { id: project.id },
        data: { progressPct, efficiencyPct, lastSyncedAt: new Date() },
      });

      for (const employeeId of memberIds) {
        await this.prisma.projectMember.upsert({
          where: { projectId_employeeId: { projectId: project.id, employeeId } },
          create: { projectId: project.id, employeeId, companyId },
          update: {},
        });
      }
    }

    return { projects: lists.length, tasks: taskCount, linked: linkedCount };
  }

  private async resolveAssignee(
    companyId: string,
    task: ClickUpTask,
    employeeMap: Map<number, string>,
  ): Promise<string | null> {
    const assignee = task.assignees?.[0];
    if (!assignee) return null;

    const cached = employeeMap.get(assignee.id);
    if (cached) return cached;

    const employeeId = await this.upsertEmployee(companyId, assignee);
    employeeMap.set(assignee.id, employeeId);
    return employeeId;
  }

  private async recalculateEmployeeLoad(companyId: string) {
    const employees = await this.prisma.employee.findMany({ where: { companyId } });
    for (const emp of employees) {
      const openTasks = await this.prisma.task.findMany({
        where: {
          companyId,
          assigneeId: emp.id,
          status: { notIn: ['completed'] },
        },
      });
      const hours = openTasks.reduce((sum, t) => sum + (t.estimateHours ?? 2), 0);
      const loadPct = Math.min(150, Math.round((hours / (emp.capacityHoursWeek || 40)) * 100));
      await this.prisma.employee.update({ where: { id: emp.id }, data: { loadPct } });
    }
  }
}

function inferProjectType(listName: string, spaceName: string, folderName?: string): string {
  const blob = `${listName} ${spaceName} ${folderName ?? ''}`.toLowerCase();
  if (/\bstrategic\b/.test(blob) || /\bstrategy\b/.test(blob)) return 'strategic';
  if (/\btactical\b/.test(blob) || /\boperational\b/.test(blob) || /\bnon[- ]?strategic\b/.test(blob)) {
    return 'tactical';
  }
  if (/\bunlinked\b/.test(blob) || /\badmin\b/.test(blob) || /\binternal\b/.test(blob)) return 'unlinked';
  return 'tactical';
}

function mapTaskStatus(task: ClickUpTask): string {
  const s = task.status?.status?.toLowerCase() ?? '';
  const type = task.status?.type?.toLowerCase() ?? '';
  if (type === 'closed' || s.includes('complete') || s.includes('closed') || s.includes('done')) return 'completed';
  if (s.includes('progress') || s.includes('active') || s.includes('review')) return 'in_progress';
  if (s.includes('blocked') || s.includes('risk') || s.includes('off track')) return 'off_track';
  return 'pending';
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
}

function colorFromString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#9333EA', '#16A34A', '#D97706', '#e85d8a', '#0EA5E9', '#7C3AED'];
  return colors[Math.abs(hash) % colors.length];
}
