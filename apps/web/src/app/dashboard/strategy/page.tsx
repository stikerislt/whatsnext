'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiAuth } from '@/lib/api';
import { aiPath } from '@/lib/ai-nav';
import { GoalDetailModal, ProjectDetailModal } from '@/components/entity-modals';

interface Alignment {
  alignmentPct: number;
  taskLinkagePct: number;
  linkedProjects: number;
  totalProjects: number;
  unlinkedProjects: number;
  unlinkedCapacityPct: number;
  timeline: Array<{ label: string; linked: number; unlinked: number }>;
  goals: Array<{
    id: string;
    title: string;
    progressPct: number;
    status: string;
    sortOrder?: number;
    projects?: Array<{ id: string; name: string; efficiencyPct: number; type: string }>;
    taskCount: number;
    completedTasks: number;
  }>;
  unlinkedProjectsList: Array<{ id: string; name: string; type: string }>;
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading Strategy Alignment…</div>}>
      <StrategyContent />
    </Suspense>
  );
}

function StrategyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Alignment | null>(null);
  const [goalModalId, setGoalModalId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    apiAuth<Alignment>('/strategy/alignment').then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    const g = searchParams.get('goal');
    if (g) setGoalModalId(g);
  }, [searchParams]);

  if (!data) return <div>Loading Strategy Alignment…</div>;

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <button type="button" onClick={() => router.push(aiPath('Explain strategy alignment and how it is calculated'))} className="text-left">
          <MetricCard label="Strategy Alignment" value={`${data.alignmentPct}%`} color={data.alignmentPct >= 70 ? 'var(--g)' : 'var(--a)'} sub="Avg efficiency · linked projects" />
        </button>
        <button type="button" onClick={() => router.push('/dashboard/projects')} className="text-left">
          <MetricCard label="Projects with goal link" value={`${data.linkedProjects}/${data.totalProjects}`} sub={`${data.unlinkedProjects} unlinked`} />
        </button>
        <MetricCard label="Task linkage" value={`${data.taskLinkagePct}%`} sub="Tasks linked to goals" />
        <button type="button" onClick={() => router.push('/dashboard/projects?type=unlinked')} className="text-left">
          <MetricCard label="Unlinked capacity" value={`${data.unlinkedCapacityPct}%`} color="var(--r)" sub="Capacity wasted" />
        </button>
      </div>

      <div className="wn-card p-4">
        <h3 className="text-xs font-bold mb-3">Project timeline — 2026</h3>
        <div className="flex items-end gap-2 h-16">
          {data.timeline.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t flex flex-col justify-end" style={{ height: `${Math.max(8, (m.linked + m.unlinked) * 12)}px`, background: m.unlinked ? `linear-gradient(to top, var(--r) 40%, var(--v) 40%)` : 'var(--v)' }} />
              <span className="text-[9px] text-gray-500">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[15px] font-extrabold">Strategic Goals Alignment</h2>
          <p className="text-[10.5px] text-[var(--muted)]">Click any goal to see linked projects, tasks, and efficiency</p>
        </div>
        <Link href={aiPath('Analyse my full strategy map — which goals are most at risk?')} className="wn-btn-primary">
          AI Analysis
        </Link>
      </div>

      <div className="space-y-2">
        {data.goals.map((g) => (
          <div key={g.id} className="wn-card">
            <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setGoalModalId(g.id)}>
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-[var(--v)] flex items-center justify-center font-bold text-sm">{g.sortOrder ?? '·'}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{g.title}</div>
                <div className="text-[10px] text-gray-500">{g.projects?.length ?? 0} projects · {g.taskCount} tasks · {g.completedTasks} completed</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" style={{ color: g.status === 'on_track' ? 'var(--g)' : g.status === 'at_risk' ? 'var(--a)' : 'var(--r)' }}>{g.progressPct}%</div>
                <div className="text-[8px] text-gray-400">efficiency</div>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </div>
        ))}
      </div>

      {data.unlinkedProjectsList.length > 0 && (
        <div className="wn-card border-red-200">
          <div className="px-4 py-3 text-red-600 font-bold text-xs">● Projects with no strategic direction</div>
          <div className="p-3 space-y-2">
            {data.unlinkedProjectsList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectId(p.id)}
                className="w-full text-xs p-2 bg-red-50 rounded-lg hover:border-red-300 border border-transparent cursor-pointer text-left"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <GoalDetailModal goalId={goalModalId} onClose={() => setGoalModalId(null)} />
      <ProjectDetailModal projectId={projectId} onClose={() => setProjectId(null)} />
    </>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="wn-card p-4">
      <div className="text-[9px] font-semibold text-[var(--muted)] uppercase mb-1">{label}</div>
      <div className="text-2xl font-extrabold" style={{ color: color ?? 'var(--text)' }}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
