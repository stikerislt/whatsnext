import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard, CurrentUser, JwtPayload, RequirePermission, PermissionsGuard } from '../auth/auth.guards';
import { PERMISSIONS } from '@whatsnext/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(
    private projects: ProjectsService,
    @InjectQueue('sync') private syncQueue: Queue,
  ) {}

  @Get('projects')
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  list(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
    @Query('goalId') goalId?: string,
    @Query('status') status?: string,
  ) {
    return this.projects.findAll(user.companyId, { type, goalId, status });
  }

  @Get('projects/:id')
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.projects.findOne(user.companyId, id);
  }

  @Patch('projects/:id')
  @RequirePermission(PERMISSIONS.PROJECTS_WRITE)
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.projects.update(user.companyId, id, body, user.sub);
  }

  @Get('projects/:id/tasks')
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  projectTasks(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.projects.getTasks(user.companyId, {});
  }

  @Get('tasks')
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  tasks(
    @CurrentUser() user: JwtPayload,
    @Query('goalId') goalId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('stale') stale?: string,
  ) {
    return this.projects.getTasks(user.companyId, { goalId, assigneeId, stale: stale === 'true' });
  }

  @Post('projects/:id/sync')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  sync(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.syncQueue.add('sync-project', { companyId: user.companyId, projectId: id });
  }
}
