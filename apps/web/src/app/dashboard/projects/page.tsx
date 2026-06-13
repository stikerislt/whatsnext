'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiAuth } from '@/lib/api';
import { ProjectDetailModal } from '@/components/entity-modals';

function ProjectsContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Array<{ id: string; name: string; type: string; progressPct: number; goal?: { title: string } }>>([]);
  const [filter, setFilter] = useState('all');
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const type = searchParams.get('type');
    if (type) setFilter(type);
  }, [searchParams]);

  useEffect(() => {
    const q = filter !== 'all' ? `?type=${filter}` : '';
    apiAuth<Array<{ id: string; name: string; type: string; progressPct: number; goal?: { title: string } }>>(`/projects${q}`)
      .then(setProjects)
      .catch(console.error);
  }, [filter]);

  return (
    <>
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-[10.5px] text-[var(--muted)]">{projects.length} shown · Live sync</p>
        <div className="flex gap-1">
          {['all', 'strategic', 'tactical', 'unlinked', 'ops'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-md cursor-pointer ${filter === f ? 'bg-[var(--v)] text-white' : 'text-gray-500 hover:text-[var(--v)]'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProjectId(p.id)}
            className="wn-card p-4 cursor-pointer hover:border-[var(--v)] text-left w-full"
          >
            <div className="flex justify-between mb-2">
              <span className="font-medium text-sm">{p.name}</span>
              <span className={p.type === 'unlinked' ? 'tag-off' : 'tag-strategic'}>{p.type}</span>
            </div>
            {p.goal ? (
              <p className="text-[10px] text-gray-500 mb-2">→ {p.goal.title}</p>
            ) : (
              <p className="text-[10px] text-red-500 mb-2">No strategy link</p>
            )}
            <div className="h-1 bg-gray-100 rounded">
              <div className="h-full bg-[var(--v)] rounded" style={{ width: `${p.progressPct}%` }} />
            </div>
          </button>
        ))}
      </div>
      <ProjectDetailModal projectId={projectId} onClose={() => setProjectId(null)} />
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading projects…</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
