'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { aiPath } from '@/lib/ai-nav';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { DetailModal } from '@/components/ui/detail-modal';
import { GoalDetailModal, ProjectDetailModal, EmployeeDetailModal } from '@/components/entity-modals';

interface DashboardData {
  banner: { title: string; desc: string };
  metrics: Array<{ label: string; value: string; delta?: string }>;
  goals: Array<{ id: string; title: string; progressPct: number; status: string; sortOrder?: number }>;
  projects: Array<{ id: string; name: string; type: string; progressPct: number; goalId?: string }>;
  workSplit: { strategic: number; tactical: number; ops: number };
  decisions: Array<{ id: string; title: string; urgency: string; detail?: string }>;
  people: Array<{ id: string; name: string; loadPct: number; title?: string }>;
}

type ProjectFilter = 'all' | 'unlinked' | 'ops';

export default function CommandCenterPage() {
  const { uiRole } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [homeAi, setHomeAi] = useState('');

  useEffect(() => {
    apiAuth<DashboardData>(`/home/dashboard?role=${uiRole}`).then(setData).catch(console.error);
  }, [uiRole]);

  if (!data) return <div>Loading Command Center…</div>;

  const filteredProjects = data.projects.filter((p) => {
    if (projectFilter === 'unlinked') return p.type === 'unlinked';
    if (projectFilter === 'ops') return p.type === 'ops';
    return true;
  });

  const selectedDecision = data.decisions.find((d) => d.id === decisionId);

  const askHomeAi = () => {
    if (!homeAi.trim()) {
      router.push('/dashboard/fullai');
      return;
    }
    router.push(aiPath(homeAi.trim()));
  };

  return (
    <>
      <div className="wn-banner flex gap-3 items-center">
        <div className="w-9 h-9 shrink-0 bg-[var(--v3)] border border-orange-200 rounded-lg flex items-center justify-center text-[var(--v)] font-black text-base">
          !
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-bold leading-snug">{data.banner.title}</h2>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{data.banner.desc}</p>
          <div className="flex gap-2 flex-wrap mt-2.5">
            <Link href="/dashboard/projects?type=unlinked" className="wn-btn-primary text-xs">
              Fix unlinked projects
            </Link>
            <Link href={aiPath(data.banner.title)} className="wn-btn-ghost text-xs">
              Ask AI
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {data.metrics.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => router.push(aiPath(`Explain this metric for me: ${m.label} = ${m.value}`))}
            className="wn-metric text-left cursor-pointer hover:border-[var(--v)] transition-colors"
            style={{ ['--mc' as string]: 'var(--v)' }}
          >
            <div className="wn-metric-label">{m.label}</div>
            <div className="text-xl font-extrabold tracking-tight">{m.value}</div>
            {m.delta && <div className="text-[10px] text-[var(--muted)] mt-0.5">{m.delta}</div>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="wn-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div>
              <h3 className="text-xs font-semibold">Strategy - Execution thread</h3>
              <p className="text-[10px] text-[var(--muted)]">Every goal · live task linkage · what is blocking each one</p>
            </div>
            <Link href="/dashboard/strategy" className="wn-btn-ghost text-xs">
              Full map
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {data.goals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalId(g.id)}
                className="w-full flex items-center gap-3 p-2.5 bg-white border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--v)] text-left"
              >
                <div className="w-7 h-7 rounded-full bg-orange-100 text-[var(--v)] flex items-center justify-center text-xs font-bold">
                  {g.sortOrder ?? '·'}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium">{g.title}</div>
                  <div className="h-1 bg-gray-100 rounded mt-1.5">
                    <div className="h-full bg-[var(--v)] rounded" style={{ width: `${g.progressPct}%` }} />
                  </div>
                </div>
                <span className={g.status === 'on_track' ? 'tag-on' : g.status === 'at_risk' ? 'tag-risk' : 'tag-off'}>
                  {g.status === 'on_track' ? 'On track' : g.status === 'at_risk' ? 'At risk' : 'Off track'}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="wn-card border-orange-200 flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--v)] animate-pulse" />
            <span className="text-xs font-semibold">AI Advisor</span>
            <span className="text-[9px] px-2 py-0.5 bg-orange-100 text-[var(--v)] rounded font-bold">Live</span>
          </div>
          <div className="p-3 flex-1 text-xs text-gray-600">Ask about strategy, team, projects…</div>
          <div className="p-3 border-t flex gap-2">
            <input
              className="flex-1 bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs"
              placeholder="Ask anything…"
              value={homeAi}
              onChange={(e) => setHomeAi(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askHomeAi()}
            />
            <button type="button" onClick={askHomeAi} className="wn-btn-primary">
              Ask
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="wn-card">
          <div className="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center gap-2">
            <h3 className="text-xs font-semibold">Work alignment</h3>
            <FilterTabs
              options={[
                { id: 'all', label: 'All' },
                { id: 'unlinked', label: 'Unlinked' },
                { id: 'ops', label: 'Ops' },
              ]}
              value={projectFilter}
              onChange={setProjectFilter}
            />
          </div>
          <div className="p-3 space-y-2">
            {filteredProjects.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectId(p.id)}
                className="w-full flex items-center gap-2 p-2 border border-[var(--border)] rounded-lg text-xs hover:border-[var(--v)] cursor-pointer text-left"
              >
                <span className={p.type === 'unlinked' ? 'tag-off' : 'tag-strategic'}>{p.type}</span>
                <span className="flex-1">{p.name}</span>
                <span className="font-mono text-[10px]">{p.progressPct}%</span>
              </button>
            ))}
          </div>
        </div>
        <div className="wn-card">
          <div className="px-4 py-3 border-b border-[var(--border)] flex justify-between">
            <h3 className="text-xs font-semibold">People & capacity</h3>
            <Link href="/dashboard/talent" className="wn-btn-ghost text-xs">
              Radar
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {data.people.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setEmployeeId(p.id)}
                className="w-full flex items-center gap-2 text-xs hover:bg-orange-50 rounded-lg p-1.5 cursor-pointer text-left"
              >
                <span className="flex-1">{p.name}</span>
                <span
                  className={`font-mono font-semibold ${p.loadPct > 100 ? 'text-red-500' : p.loadPct > 85 ? 'text-amber-500' : 'text-green-600'}`}
                >
                  {p.loadPct}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-4">
        <div className="wn-card">
          <div className="px-4 py-3 border-b border-[var(--border)] flex justify-between">
            <h3 className="text-xs font-semibold">Decisions blocking strategy</h3>
            <Link href="/dashboard/decisions" className="wn-btn-ghost text-xs">
              View all
            </Link>
          </div>
          <div className="p-3 space-y-2">
            {data.decisions.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDecisionId(d.id)}
                className="w-full p-3 bg-[var(--bg3)] border border-[var(--border)] rounded-lg text-xs hover:border-[var(--v)] cursor-pointer text-left"
              >
                <span className="tag-risk mr-2">{d.urgency}</span>
                {d.title}
              </button>
            ))}
          </div>
        </div>
        <div className="wn-card">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-xs font-semibold">Work type split</h3>
          </div>
          <div className="p-4">
            <div className="flex h-3 rounded overflow-hidden mb-3">
              <div style={{ width: `${data.workSplit.strategic}%`, background: 'var(--v)' }} />
              <div style={{ width: `${data.workSplit.tactical}%`, background: 'var(--b)' }} />
              <div style={{ width: `${data.workSplit.ops}%`, background: '#94A3B8' }} />
            </div>
            <div className="text-[11px] space-y-1 text-gray-600">
              <div>Strategic {data.workSplit.strategic}%</div>
              <div>Tactical {data.workSplit.tactical}%</div>
              <div>Ops/Admin {data.workSplit.ops}%</div>
            </div>
            {uiRole === 'ceo' && (
              <button
                type="button"
                onClick={() => router.push(aiPath('How do I fix the strategic work split to reach 70% strategic?'))}
                className="mt-3 w-full p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-600 hover:border-red-400 cursor-pointer text-left"
              >
                Target: 70% strategic. Fix: realign or stop unlinked projects.
              </button>
            )}
          </div>
        </div>
      </div>

      <GoalDetailModal goalId={goalId} onClose={() => setGoalId(null)} />
      <ProjectDetailModal projectId={projectId} onClose={() => setProjectId(null)} />
      <EmployeeDetailModal employeeId={employeeId} onClose={() => setEmployeeId(null)} />
      <DetailModal
        open={!!decisionId}
        onClose={() => setDecisionId(null)}
        title={selectedDecision?.title ?? 'Decision'}
        subtitle={selectedDecision?.urgency}
        footer={
          <Link href={aiPath(`Help me decide: ${selectedDecision?.title}`)} className="wn-btn-primary text-xs">
            AI Help
          </Link>
        }
      >
        <p className="text-xs text-gray-600">{selectedDecision?.detail ?? 'No additional detail.'}</p>
      </DetailModal>
    </>
  );
}
