import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ClickUpFolder,
  ClickUpList,
  ClickUpSpace,
  ClickUpTask,
  ClickUpTeam,
  ClickUpUser,
} from './clickup.types';

@Injectable()
export class ClickUpClient {
  private async request<T>(token: string, path: string, baseUrl: string): Promise<T> {
    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    const res = await fetch(url, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async getAuthorizedUser(token: string, baseUrl: string): Promise<ClickUpUser> {
    const data = await this.request<{ user: ClickUpUser }>(token, '/user', baseUrl);
    return data.user;
  }

  async getTeams(token: string, baseUrl: string): Promise<ClickUpTeam[]> {
    const data = await this.request<{ teams: ClickUpTeam[] }>(token, '/team', baseUrl);
    return data.teams ?? [];
  }

  async getTeam(token: string, teamId: string, baseUrl: string): Promise<ClickUpTeam> {
    const teams = await this.getTeams(token, baseUrl);
    const team = teams.find((t) => String(t.id) === String(teamId));
    if (!team) throw new BadRequestException(`ClickUp team ${teamId} not found for this token`);
    return team;
  }

  async getTeamMembers(token: string, teamId: string, baseUrl: string): Promise<ClickUpUser[]> {
    const data = await this.request<{ members: Array<{ user: ClickUpUser }> }>(
      token,
      `/team/${teamId}/member`,
      baseUrl,
    );
    return (data.members ?? []).map((m) => m.user).filter(Boolean);
  }

  async getSpaces(token: string, teamId: string, baseUrl: string): Promise<ClickUpSpace[]> {
    const data = await this.request<{ spaces: ClickUpSpace[] }>(token, `/team/${teamId}/space`, baseUrl);
    return data.spaces ?? [];
  }

  async getFolders(token: string, spaceId: string, baseUrl: string): Promise<ClickUpFolder[]> {
    const data = await this.request<{ folders: ClickUpFolder[] }>(token, `/space/${spaceId}/folder`, baseUrl);
    return data.folders ?? [];
  }

  async getFolderlessLists(token: string, spaceId: string, baseUrl: string): Promise<ClickUpList[]> {
    const data = await this.request<{ lists: ClickUpList[] }>(token, `/space/${spaceId}/list`, baseUrl);
    return data.lists ?? [];
  }

  async getListsInFolder(token: string, folderId: string, baseUrl: string): Promise<ClickUpList[]> {
    const data = await this.request<{ lists: ClickUpList[] }>(token, `/folder/${folderId}/list`, baseUrl);
    return data.lists ?? [];
  }

  async getAllLists(token: string, teamId: string, baseUrl: string): Promise<Array<ClickUpList & { spaceName: string; folderName?: string }>> {
    const spaces = await this.getSpaces(token, teamId, baseUrl);
    const lists: Array<ClickUpList & { spaceName: string; folderName?: string }> = [];

    for (const space of spaces) {
      const folderless = await this.getFolderlessLists(token, space.id, baseUrl);
      for (const list of folderless) {
        lists.push({ ...list, spaceName: space.name });
      }

      const folders = await this.getFolders(token, space.id, baseUrl);
      for (const folder of folders) {
        const folderLists = await this.getListsInFolder(token, folder.id, baseUrl);
        for (const list of folderLists) {
          lists.push({ ...list, spaceName: space.name, folderName: folder.name });
        }
      }
    }

    return lists;
  }

  async getTasks(token: string, listId: string, baseUrl: string): Promise<ClickUpTask[]> {
    const tasks: ClickUpTask[] = [];
    let page = 0;
    let lastPage = false;

    while (!lastPage) {
      const data = await this.request<{ tasks: ClickUpTask[]; last_page?: boolean }>(
        token,
        `/list/${listId}/task?archived=false&include_closed=true&subtasks=true&page=${page}`,
        baseUrl,
      );
      tasks.push(...(data.tasks ?? []));
      lastPage = data.last_page ?? (data.tasks?.length ?? 0) === 0;
      page += 1;
      if (page > 50) break;
    }

    return tasks;
  }

  async validateConnection(token: string, teamId: string, baseUrl: string): Promise<{ teamName: string; memberCount: number }> {
    if (!token?.trim()) throw new BadRequestException('ClickUp API token is required');
    if (!teamId?.trim()) throw new BadRequestException('ClickUp Team ID (workspace ID) is required');

    await this.getAuthorizedUser(token, baseUrl);
    const team = await this.getTeam(token, teamId, baseUrl);
    const members = await this.getTeamMembers(token, teamId, baseUrl);

    return { teamName: team.name, memberCount: members.length };
  }
}
