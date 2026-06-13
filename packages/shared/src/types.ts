export enum ProjectType {
  STRATEGIC = 'strategic',
  TACTICAL = 'tactical',
  OPS = 'ops',
  UNLINKED = 'unlinked',
}

export enum TaskStatus {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  OFF_TRACK = 'off_track',
}

export enum GoalStatus {
  ON_TRACK = 'on_track',
  AT_RISK = 'at_risk',
  OFF_TRACK = 'off_track',
}

export enum RoleName {
  SUPER_ADMIN = 'super_admin',
  CEO = 'ceo',
  EXECUTIVE = 'executive',
  HR = 'hr',
  TEAM_LEAD = 'team_lead',
  EMPLOYEE = 'employee',
}

export enum IntegrationProvider {
  JIRA = 'jira',
  CLICKUP = 'clickup',
  SLACK = 'slack',
  SALESFORCE = 'salesforce',
  NOTION = 'notion',
  HUBSPOT = 'hubspot',
  HIBOB = 'hibob',
  TEAMS = 'teams',
}

export enum DecisionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DEFERRED = 'deferred',
}

export enum Urgency {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

export type UiRole = 'ceo' | 'hr' | 'lead' | 'emp';

export interface TaskLike {
  status: TaskStatus | string;
  goalId?: string | null;
  estimateHours?: number | null;
}

export interface ProjectLike {
  id: string;
  goalId?: string | null;
  type: ProjectType | string;
  tasks?: TaskLike[];
  efficiencyPct?: number | null;
}

export interface EmployeeLike {
  id: string;
  loadPct?: number;
  capacityHoursWeek?: number;
  contribScore?: number;
  skills?: string[];
}

export interface BonusCriterionLike {
  name: string;
  weight: number;
  score: number;
}
