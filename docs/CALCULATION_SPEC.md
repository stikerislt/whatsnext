# Calculation Specifications & Assumptions

Approved defaults pending stakeholder confirmation. All metrics are implemented in `packages/shared/src/calculations/`.

## 1. Goal Progress %

**Decision:** Weighted average of linked project efficiencies.

```
goal.progressPct = round( sum(project.efficiencyPct × project.taskCount) / sum(project.taskCount) )
```

Falls back to KPI `currentValue / targetValue × 100` when no linked projects exist.

## 2. Task Linkage %

**Decision:** Tasks on goal-linked projects count as linked.

```
taskLinkagePct = round( tasks where goalId IS NOT NULL OR project.goalId IS NOT NULL ) / totalTasks × 100
```

Ops projects excluded from denominator when `includeOpsInLinkage = false` (default).

## 3. Strategy Alignment %

**Decision:** Average efficiency of goal-linked projects only (Word brief + onboarding JS).

```
strategyAlignmentPct = round( avg(project.efficiencyPct) for projects where goalId IS NOT NULL )
```

Distinct from task linkage — labeled separately in UI.

## 4. Project Efficiency

```
project.efficiencyPct = round( completedTasks / totalTasks × 100 )
```

Task status mapping: Jira Done/Closed → `completed`; In Progress → `in_progress`; To Do → `pending`; Blocked/Overdue → `off_track`.

## 5. Employee Load %

```
loadPct = round( sum(assignedTask.estimateHours) / capacityHoursWeek × 100 )
```

Default `capacityHoursWeek = 40`. Cap display at 150%.

## 6. Capacity Free %

```
capacityFreePct = max(0, 100 - loadPct)
```

## 7. Work Type Split (tenant-level)

```
strategicPct = hours on strategic+tactical goal-linked projects / totalHours × 100
tacticalPct  = hours on tactical projects / totalHours × 100  (subset shown separately in CEO view)
opsPct       = hours on ops+unlinked / totalHours × 100
```

CEO home shows Strategic / Tactical / Ops-Admin per HTML prototype.

## 8. Bonus Pool & Payout

**Decision:** HR sets `totalPoolAmount` per cycle.

```
estimatedPayout = round( totalPoolAmount × (employee.totalScore / sum(allScores)) )
```

Contribution score (0–100):

| Criterion | Weight | MVP Source |
|-----------|--------|------------|
| Strategic Goal Contribution | 40% | % tasks linked to goals |
| Marketplace Collaboration | 20% | Accepted marketplace hours |
| Skill Development | 15% | Manual HR input (LMS Phase 2) |
| Execution Velocity | 15% | Task completion rate vs deadline |
| Team Health Contribution | 10% | Peer score placeholder |

## 9. AI Talent Match %

```
matchPct = round(
  0.45 × skillOverlap +
  0.30 × capacityScore +
  0.15 × goalRelevance +
  0.10 × pastPerformance
)
```

## 10. Signal Ranking

```
rankScore = impactScore × urgencyScore × goalCriticality
```

Default scales 1–5 each. Signals sorted descending.

## 11. Mandatory Goal Mapping

**Decision:** Allow sync with audit flag; block onboarding completion until unlinked count acknowledged.

## 12. Departments

**Decision:** Manual setup during onboarding; optional HRIS import Phase 2.

## 13. Executive Team

**Decision:** Same dashboards as CEO; edit permissions limited to assigned portfolio goals.

## 14. Meeting Time %

**Decision:** MVP uses `work_allocations` manual/admin estimate; calendar integration Phase 2.
