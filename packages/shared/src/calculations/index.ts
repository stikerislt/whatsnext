import { TaskStatus, ProjectType, type TaskLike, type ProjectLike, type BonusCriterionLike } from '../types';

export function calcProjectEfficiency(tasks: TaskLike[]): number {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  return Math.round((done / tasks.length) * 100);
}

export function calcStrategyAlignment(projects: ProjectLike[]): number {
  const linked = projects.filter((p) => p.goalId != null);
  const effs = linked
    .map((p) => (p.efficiencyPct != null ? p.efficiencyPct : calcProjectEfficiency(p.tasks ?? [])))
    .filter((e) => e != null);
  if (!effs.length) return 0;
  return Math.round(effs.reduce((a, b) => a + b, 0) / effs.length);
}

export function calcTaskLinkagePct(
  tasks: Array<{ goalId?: string | null; projectGoalId?: string | null }>,
  includeOps = false,
  projectTypes?: Map<string, ProjectType>,
): number {
  const filtered = includeOps
    ? tasks
    : tasks.filter((t) => {
        if (!projectTypes) return true;
        return true;
      });
  if (!filtered.length) return 0;
  const linked = filtered.filter((t) => t.goalId != null || t.projectGoalId != null).length;
  return Math.round((linked / filtered.length) * 100);
}

export function calcGoalProgress(
  projects: ProjectLike[],
  kpiCurrent?: number,
  kpiTarget?: number,
): number {
  const linked = projects.filter((p) => p.goalId != null);
  if (linked.length) {
    let totalTasks = 0;
    let weighted = 0;
    for (const p of linked) {
      const count = p.tasks?.length ?? 1;
      const eff = p.efficiencyPct ?? calcProjectEfficiency(p.tasks ?? []);
      weighted += eff * count;
      totalTasks += count;
    }
    return totalTasks ? Math.round(weighted / totalTasks) : 0;
  }
  if (kpiTarget && kpiTarget > 0 && kpiCurrent != null) {
    return Math.round((kpiCurrent / kpiTarget) * 100);
  }
  return 0;
}

export function calcEmployeeLoad(
  assignedHours: number,
  capacityHoursWeek = 40,
): number {
  if (capacityHoursWeek <= 0) return 0;
  return Math.min(150, Math.round((assignedHours / capacityHoursWeek) * 100));
}

export function calcCapacityFree(loadPct: number): number {
  return Math.max(0, 100 - loadPct);
}

export function calcWorkTypeSplit(projects: ProjectLike[]): {
  strategic: number;
  tactical: number;
  ops: number;
} {
  const hours = { strategic: 0, tactical: 0, ops: 0, total: 0 };
  for (const p of projects) {
    const h = p.tasks?.reduce((s: number, t: TaskLike) => s + (t.estimateHours ?? 1), 0) ?? 1;
    hours.total += h;
    if (p.type === ProjectType.STRATEGIC) hours.strategic += h;
    else if (p.type === ProjectType.TACTICAL) hours.tactical += h;
    else hours.ops += h;
  }
  if (!hours.total) return { strategic: 0, tactical: 0, ops: 0 };
  return {
    strategic: Math.round((hours.strategic / hours.total) * 100),
    tactical: Math.round((hours.tactical / hours.total) * 100),
    ops: Math.round((hours.ops / hours.total) * 100),
  };
}

export function calcContributionScore(criteria: BonusCriterionLike[]): number {
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  if (!totalWeight) return 0;
  const weighted = criteria.reduce((s, c) => s + (c.score * c.weight) / 100, 0);
  return Math.round((weighted / totalWeight) * 100);
}

export function calcBonusPayout(
  employeeScore: number,
  totalPool: number,
  allScores: number[],
): number {
  const sum = allScores.reduce((a, b) => a + b, 0);
  if (!sum) return 0;
  return Math.round(totalPool * (employeeScore / sum));
}

export function calcTalentMatchPct(params: {
  skillOverlap: number;
  capacityScore: number;
  goalRelevance: number;
  pastPerformance: number;
}): number {
  return Math.round(
    0.45 * params.skillOverlap +
      0.3 * params.capacityScore +
      0.15 * params.goalRelevance +
      0.1 * params.pastPerformance,
  );
}

export function calcSignalRank(
  impact: number,
  urgency: number,
  goalCriticality: number,
): number {
  return impact * urgency * goalCriticality;
}

export function skillOverlap(required: string[], have: string[]): number {
  if (!required.length) return 0;
  const norm = (s: string) => s.toLowerCase().trim();
  const haveSet = new Set(have.map(norm));
  const matches = required.filter((r) => haveSet.has(norm(r))).length;
  return Math.round((matches / required.length) * 100);
}
