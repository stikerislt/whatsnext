"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcProjectEfficiency = calcProjectEfficiency;
exports.calcStrategyAlignment = calcStrategyAlignment;
exports.calcTaskLinkagePct = calcTaskLinkagePct;
exports.calcGoalProgress = calcGoalProgress;
exports.calcEmployeeLoad = calcEmployeeLoad;
exports.calcCapacityFree = calcCapacityFree;
exports.calcWorkTypeSplit = calcWorkTypeSplit;
exports.calcContributionScore = calcContributionScore;
exports.calcBonusPayout = calcBonusPayout;
exports.calcTalentMatchPct = calcTalentMatchPct;
exports.calcSignalRank = calcSignalRank;
exports.skillOverlap = skillOverlap;
const types_1 = require("../types");
function calcProjectEfficiency(tasks) {
    if (!tasks.length)
        return 0;
    const done = tasks.filter((t) => t.status === types_1.TaskStatus.COMPLETED).length;
    return Math.round((done / tasks.length) * 100);
}
function calcStrategyAlignment(projects) {
    const linked = projects.filter((p) => p.goalId != null);
    const effs = linked
        .map((p) => (p.efficiencyPct != null ? p.efficiencyPct : calcProjectEfficiency(p.tasks ?? [])))
        .filter((e) => e != null);
    if (!effs.length)
        return 0;
    return Math.round(effs.reduce((a, b) => a + b, 0) / effs.length);
}
function calcTaskLinkagePct(tasks, includeOps = false, projectTypes) {
    const filtered = includeOps
        ? tasks
        : tasks.filter((t) => {
            if (!projectTypes)
                return true;
            return true;
        });
    if (!filtered.length)
        return 0;
    const linked = filtered.filter((t) => t.goalId != null || t.projectGoalId != null).length;
    return Math.round((linked / filtered.length) * 100);
}
function calcGoalProgress(projects, kpiCurrent, kpiTarget) {
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
function calcEmployeeLoad(assignedHours, capacityHoursWeek = 40) {
    if (capacityHoursWeek <= 0)
        return 0;
    return Math.min(150, Math.round((assignedHours / capacityHoursWeek) * 100));
}
function calcCapacityFree(loadPct) {
    return Math.max(0, 100 - loadPct);
}
function calcWorkTypeSplit(projects) {
    const hours = { strategic: 0, tactical: 0, ops: 0, total: 0 };
    for (const p of projects) {
        const h = p.tasks?.reduce((s, t) => s + (t.estimateHours ?? 1), 0) ?? 1;
        hours.total += h;
        if (p.type === types_1.ProjectType.STRATEGIC)
            hours.strategic += h;
        else if (p.type === types_1.ProjectType.TACTICAL)
            hours.tactical += h;
        else
            hours.ops += h;
    }
    if (!hours.total)
        return { strategic: 0, tactical: 0, ops: 0 };
    return {
        strategic: Math.round((hours.strategic / hours.total) * 100),
        tactical: Math.round((hours.tactical / hours.total) * 100),
        ops: Math.round((hours.ops / hours.total) * 100),
    };
}
function calcContributionScore(criteria) {
    const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
    if (!totalWeight)
        return 0;
    const weighted = criteria.reduce((s, c) => s + (c.score * c.weight) / 100, 0);
    return Math.round((weighted / totalWeight) * 100);
}
function calcBonusPayout(employeeScore, totalPool, allScores) {
    const sum = allScores.reduce((a, b) => a + b, 0);
    if (!sum)
        return 0;
    return Math.round(totalPool * (employeeScore / sum));
}
function calcTalentMatchPct(params) {
    return Math.round(0.45 * params.skillOverlap +
        0.3 * params.capacityScore +
        0.15 * params.goalRelevance +
        0.1 * params.pastPerformance);
}
function calcSignalRank(impact, urgency, goalCriticality) {
    return impact * urgency * goalCriticality;
}
function skillOverlap(required, have) {
    if (!required.length)
        return 0;
    const norm = (s) => s.toLowerCase().trim();
    const haveSet = new Set(have.map(norm));
    const matches = required.filter((r) => haveSet.has(norm(r))).length;
    return Math.round((matches / required.length) * 100);
}
//# sourceMappingURL=index.js.map