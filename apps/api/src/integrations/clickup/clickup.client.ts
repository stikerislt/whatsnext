import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type {
  ClickUpFolder,
  ClickUpList,
  ClickUpSpace,
  ClickUpTask,
  ClickUpTeam,
  ClickUpUser,
} from './clickup.types';

const DEFAULT_BASE_URL = 'https://api.clickup.com/api/v2';

@Injectable()
export class ClickUpClient {
  private readonly log = new Logger(ClickUpClient.name);

  normalizeBaseUrl(baseUrl?: string): string {
    let url = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, '');
    if (url.includes('app.clickup.com')) {
      throw new BadRequestException(
        'API URL must be https://api.clickup.com/api/v2 — not your ClickUp app browser URL.',
      );
    }
    if (url === 'https://api.clickup.com' || url.endsWith('api.clickup.com')) {
      url = DEFAULT_BASE_URL;
    }
    const match = url.match(/^(https:\/\/api\.clickup\.com\/api\/v2)/i);
    if (match) return match[1];
    if (!url.includes('/api/v2')) {
      return DEFAULT_BASE_URL;
    }
    return url;
  }

  private formatToken(token: string): string {
    const trimmed = token.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }
    return trimmed;
  }

  private async request<T>(token: string, path: string, baseUrl: string): Promise<T> {
    const root = this.normalizeBaseUrl(baseUrl);
    const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;
    const auth = this.formatToken(token);
    const res = await fetch(url, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.log.warn(`ClickUp ${res.status} ${url}: ${body.slice(0, 120)}`);
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
    if (!team) {
      throw new BadRequestException(
        `ClickUp workspace ${teamId} not found. Re-run "Find workspaces" and select again.`,
      );
    }
    return team;
  }

  private mapMembers(raw: Array<{ user?: ClickUpUser }> | undefined): ClickUpUser[] {
    return (raw ?? []).map((m) => m.user).filter((u): u is ClickUpUser => Boolean(u?.id));
  }

  async getTeamMembers(token: string, teamId: string, baseUrl: string): Promise<ClickUpUser[]> {
    const team = await this.getTeam(token, teamId, baseUrl);
    const fromTeam = this.mapMembers(team.members);
    if (fromTeam.length > 0) return fromTeam;

    const id = encodeURIComponent(String(teamId));
    const paths = [`/team/${id}/member?page=0`, `/team/${id}/member`, `/team/${id}/members?page=0`];

    for (const path of paths) {
      try {
        const data = await this.request<{ members: Array<{ user: ClickUpUser }> }>(token, path, baseUrl);
        const members = this.mapMembers(data.members);
        if (members.length > 0) return members;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (!msg.includes('404')) throw err;
        this.log.warn(`ClickUp members path ${path} returned 404 — trying fallback`);
      }
    }

    return fromTeam;
  }

  async getSpaces(token: string, teamId: string, baseUrl: string): Promise<ClickUpSpace[]> {
    const id = encodeURIComponent(String(teamId));
    const data = await this.request<{ spaces: ClickUpSpace[] }>(
      token,
      `/team/${id}/space?archived=false`,
      baseUrl,
    );
    return data.spaces ?? [];
  }

  async getFolders(token: string, spaceId: string, baseUrl: string): Promise<ClickUpFolder[]> {
    const id = encodeURIComponent(String(spaceId));
    const data = await this.request<{ folders: ClickUpFolder[] }>(
      token,
      `/space/${id}/folder?archived=false`,
      baseUrl,
    );
    return data.folders ?? [];
  }

  async getFolderlessLists(token: string, spaceId: string, baseUrl: string): Promise<ClickUpList[]> {
    const id = encodeURIComponent(String(spaceId));
    const data = await this.request<{ lists: ClickUpList[] }>(token, `/space/${id}/list`, baseUrl);
    return data.lists ?? [];
  }

  async getListsInFolder(token: string, folderId: string, baseUrl: string): Promise<ClickUpList[]> {
    const id = encodeURIComponent(String(folderId));
    const data = await this.request<{ lists: ClickUpList[] }>(token, `/folder/${id}/list`, baseUrl);
    return data.lists ?? [];
  }

  async getAllLists(
    token: string,
    teamId: string,
    baseUrl: string,
  ): Promise<Array<ClickUpList & { spaceName: string; folderName?: string }>> {
    const spaces = await this.getSpaces(token, teamId, baseUrl).catch((err) => {
      this.log.warn(`ClickUp spaces for team ${teamId}: ${err instanceof Error ? err.message : err}`);
      return [] as ClickUpSpace[];
    });
    const lists: Array<ClickUpList & { spaceName: string; folderName?: string }> = [];

    for (const space of spaces) {
      try {
        const folderless = await this.getFolderlessLists(token, space.id, baseUrl);
        for (const list of folderless) {
          lists.push({ ...list, spaceName: space.name });
        }
      } catch (err) {
        this.log.warn(`ClickUp folderless lists for space ${space.id}: ${err instanceof Error ? err.message : err}`);
      }

      let folders: ClickUpFolder[] = [];
      try {
        folders = await this.getFolders(token, space.id, baseUrl);
      } catch (err) {
        this.log.warn(`ClickUp folders for space ${space.id}: ${err instanceof Error ? err.message : err}`);
      }

      for (const folder of folders) {
        try {
          const folderLists = await this.getListsInFolder(token, folder.id, baseUrl);
          for (const list of folderLists) {
            lists.push({ ...list, spaceName: space.name, folderName: folder.name });
          }
        } catch (err) {
          this.log.warn(`ClickUp lists for folder ${folder.id}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    return lists;
  }

  async getTasks(token: string, listId: string, baseUrl: string): Promise<ClickUpTask[]> {
    const tasks: ClickUpTask[] = [];
    let page = 0;
    let lastPage = false;
    const id = encodeURIComponent(String(listId));

    while (!lastPage) {
      const data = await this.request<{ tasks: ClickUpTask[]; last_page?: boolean }>(
        token,
        `/list/${id}/task?archived=false&include_closed=true&subtasks=true&page=${page}`,
        baseUrl,
      );
      tasks.push(...(data.tasks ?? []));
      lastPage = data.last_page ?? (data.tasks?.length ?? 0) === 0;
      page += 1;
      if (page > 50) break;
    }

    return tasks;
  }

  async validateConnection(
    token: string,
    teamId: string,
    baseUrl: string,
  ): Promise<{ teamName: string; memberCount: number }> {
    if (!token?.trim()) throw new BadRequestException('ClickUp API token is required');
    if (!teamId?.trim()) throw new BadRequestException('ClickUp workspace is required');

    await this.getAuthorizedUser(token, baseUrl);
    const team = await this.getTeam(token, teamId, baseUrl);
    const members = await this.getTeamMembers(token, teamId, baseUrl);

    return { teamName: team.name, memberCount: members.length };
  }
}
