import { ProjectType, type TaskLike, type ProjectLike, type BonusCriterionLike } from '../types';
export declare function calcProjectEfficiency(tasks: TaskLike[]): number;
export declare function calcStrategyAlignment(projects: ProjectLike[]): number;
export declare function calcTaskLinkagePct(tasks: Array<{
    goalId?: string | null;
    projectGoalId?: string | null;
}>, includeOps?: boolean, projectTypes?: Map<string, ProjectType>): number;
export declare function calcGoalProgress(projects: ProjectLike[], kpiCurrent?: number, kpiTarget?: number): number;
export declare function calcEmployeeLoad(assignedHours: number, capacityHoursWeek?: number): number;
export declare function calcCapacityFree(loadPct: number): number;
export declare function calcWorkTypeSplit(projects: ProjectLike[]): {
    strategic: number;
    tactical: number;
    ops: number;
};
export declare function calcContributionScore(criteria: BonusCriterionLike[]): number;
export declare function calcBonusPayout(employeeScore: number, totalPool: number, allScores: number[]): number;
export declare function calcTalentMatchPct(params: {
    skillOverlap: number;
    capacityScore: number;
    goalRelevance: number;
    pastPerformance: number;
}): number;
export declare function calcSignalRank(impact: number, urgency: number, goalCriticality: number): number;
export declare function skillOverlap(required: string[], have: string[]): number;
