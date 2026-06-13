'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiAuth } from '@/lib/api';
import { aiPath } from '@/lib/ai-nav';
import { DetailModal } from '@/components/ui/detail-modal';

interface Task {
  id: string;
  title: string;
  status: string;
  externalUrl?: string | null;
  assignee?: { name: string } | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  progressPct: number;
  efficiencyPct?: number;
  goal?: { title: string } | null;
  owner?: { name: string } | null;
  tasks: Task[];
  members?: Array<{ employee: { name: string; title?: string } }>;
}

export function ProjectDetailModal({
  projectId,
  onClose,
}: {
  projectId: string | null;
  onClose: () => void;
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }
    apiAuth<ProjectDetail>(`/projects/${projectId}`).then(setProject).catch(console.error);
  }, [projectId]);

  const completed = project?.tasks.filter((t) => t.status === 'completed').length ?? 0;
  const pending = project?.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length ?? 0;
  const offtrack = project?.tasks.filter((t) => t.status === 'off_track' || t.status === 'blocked').length ?? 0;

  return (
    <DetailModal
      open={!!projectId}
      onClose={onClose}
      title={project?.name ?? 'Project'}
      subtitle={project?.goal ? `→ ${project.goal.title}` : 'No strategy link'}
      footer={
        <>
          <Link href={aiPath(`Analyse project "${project?.name}" — efficiency, blockers, and alignment`)} className="wn-btn-primary text-xs">
            AI analyse
          </Link>
          {project?.type === 'unlinked' && (
            <Link href="/dashboard/projects?type=unlinked" className="wn-btn-ghost text-xs" onClick={onClose}>
              Fix alignment
            </Link>
          )}
        </>
      }
    >
      {project ? (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Type" value={project.type} />
            <Stat label="Efficiency" value={`${project.efficiencyPct ?? project.progressPct}%`} />
            <Stat label="Owner" value={project.owner?.name ?? 'Unassigned'} />
            <Stat label="Status" value={project.status} />
          </div>
          <div className="flex gap-2">
            <span className="tag-on">{completed} completed</span>
            <span className="tag-strategic">{pending} pending</span>
            <span className="tag-risk">{offtrack} off track</span>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Tasks</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {project.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 p-2 bg-[var(--bg3)] rounded-lg">
                  <span className="flex-1">{t.title}</span>
                  <span className="text-[10px] text-gray-500">{t.assignee?.name ?? '—'}</span>
                  {t.externalUrl ? (
                    <a href={t.externalUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--v)] font-bold hover:underline">
                      Open in tool ↗
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400">{t.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {project.members && project.members.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Project team</div>
              <div className="space-y-1">
                {project.members.map((m, i) => (
                  <div key={i} className="flex justify-between p-2 border border-[var(--border)] rounded-lg">
                    <span>{m.employee.name}</span>
                    <span className="text-gray-500">{m.employee.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Loading…</p>
      )}
    </DetailModal>
  );
}

interface GoalDetail {
  id: string;
  title: string;
  description?: string | null;
  progressPct?: number;
  projects: Array<{
    id: string;
    name: string;
    efficiencyPct?: number;
    type: string;
    tasks: Task[];
    owner?: { name: string } | null;
  }>;
}

export function GoalDetailModal({
  goalId,
  onClose,
}: {
  goalId: string | null;
  onClose: () => void;
}) {
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId) {
      setGoal(null);
      return;
    }
    apiAuth<GoalDetail>(`/goals/${goalId}`).then(setGoal).catch(console.error);
  }, [goalId]);

  const allTasks = goal?.projects.flatMap((p) => p.tasks) ?? [];
  const unassigned = allTasks.filter((t) => !t.assignee).length;

  return (
    <>
      <DetailModal
        open={!!goalId}
        onClose={onClose}
        title={goal?.title ?? 'Strategic goal'}
        subtitle="Task linkage per project · owners · efficiency (per IT brief)"
        footer={
          <Link href={aiPath(`Which projects and tasks are blocking goal "${goal?.title}"?`)} className="wn-btn-primary text-xs">
            Ask AI
          </Link>
        }
      >
        {goal ? (
          <div className="space-y-3 text-xs">
            {goal.description && <p className="text-gray-600">{goal.description}</p>}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Projects" value={String(goal.projects.length)} />
              <Stat label="Tasks linked" value={String(allTasks.length)} />
              <Stat label="Unassigned tasks" value={String(unassigned)} />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {goal.projects.map((p) => {
                const done = p.tasks.filter((t) => t.status === 'completed').length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOpenProjectId(p.id)}
                    className="w-full text-left p-3 border border-[var(--border)] rounded-lg hover:border-[var(--v)] cursor-pointer"
                  >
                    <div className="flex justify-between font-medium">
                      <span>{p.name}</span>
                      <span className="font-mono text-[var(--v)]">{p.efficiencyPct ?? 0}%</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {p.tasks.length} tasks · {done} completed · Owner: {p.owner?.name ?? '—'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Loading…</p>
        )}
      </DetailModal>
      <ProjectDetailModal projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
    </>
  );
}

interface EmployeeDetail {
  id: string;
  name: string;
  title?: string | null;
  loadPct: number;
  department?: { name: string };
  skills: Array<{ skill: { name: string } }>;
  tasks: Array<{ id: string; title: string; status: string }>;
  projectMembers?: Array<{ project: { name: string } }>;
  workAllocations?: Array<{ strategicPct: number; operationalPct: number; meetingsPct: number }>;
}

export function EmployeeDetailModal({
  employeeId,
  onClose,
}: {
  employeeId: string | null;
  onClose: () => void;
}) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setEmployee(null);
      return;
    }
    apiAuth<EmployeeDetail>(`/employees/${employeeId}`).then(setEmployee).catch(console.error);
  }, [employeeId]);

  const split = employee?.workAllocations?.[0];

  return (
    <DetailModal
      open={!!employeeId}
      onClose={onClose}
      title={employee?.name ?? 'Employee'}
      subtitle={employee?.title ?? undefined}
      footer={
        <Link href={aiPath(`Analyse capacity and strategic vs operational split for ${employee?.name}`)} className="wn-btn-primary text-xs">
          AI capacity review
        </Link>
      }
    >
      {employee ? (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Load" value={`${employee.loadPct}%`} />
            <Stat label="Department" value={employee.department?.name ?? '—'} />
            <Stat label="Tasks assigned" value={String(employee.tasks.length)} />
            <Stat label="Projects" value={String(employee.projectMembers?.length ?? 0)} />
          </div>
          {split && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Work split</div>
              <div className="flex h-2 rounded overflow-hidden mb-1">
                <div style={{ width: `${split.strategicPct}%`, background: 'var(--v)' }} />
                <div style={{ width: `${split.operationalPct}%`, background: 'var(--b)' }} />
                <div style={{ width: `${split.meetingsPct}%`, background: '#94A3B8' }} />
              </div>
              <div className="text-[10px] text-gray-500">
                Strategic {split.strategicPct}% · Operational {split.operationalPct}% · Meetings {split.meetingsPct}%
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {employee.skills.map((s) => (
              <span key={s.skill.name} className="tag-strategic">
                {s.skill.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Loading…</p>
      )}
    </DetailModal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-[var(--bg3)] rounded-lg">
      <div className="text-[9px] text-gray-500 uppercase">{label}</div>
      <div className="font-semibold capitalize">{value}</div>
    </div>
  );
}
