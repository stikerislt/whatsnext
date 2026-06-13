export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

export interface ClickUpTeam {
  id: string;
  name: string;
  members?: Array<{ user: ClickUpUser }>;
}

export interface ClickUpSpace {
  id: string;
  name: string;
}

export interface ClickUpFolder {
  id: string;
  name: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  task_count?: number;
  folder?: { id: string; name: string };
  space?: { id: string; name: string };
}

export interface ClickUpTask {
  id: string;
  name: string;
  url: string;
  status: { status: string; type: string };
  assignees: ClickUpUser[];
  time_estimate: number | null;
  date_created: string;
  date_updated: string;
  tags?: Array<{ name: string }>;
}

export interface ClickUpListContext {
  list: ClickUpList;
  spaceName: string;
  folderName?: string;
}
