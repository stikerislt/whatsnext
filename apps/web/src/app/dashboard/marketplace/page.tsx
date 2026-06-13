'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiAuth } from '@/lib/api';
import { aiPath } from '@/lib/ai-nav';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { DetailModal } from '@/components/ui/detail-modal';
import { EmployeeDetailModal } from '@/components/entity-modals';

type AvailFilter = 'all' | 'open' | 'partial';

interface TalentPoolEntry {
  id: string;
  name: string;
  title?: string;
  loadPct: number;
  capacityFreePct: number;
  availSignalled: boolean;
  skillsList: string[];
  cvSkills: string[];
  hasCv: boolean;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Array<{ id: string; title: string; urgency: string; skills: string[]; detail?: string }>>([]);
  const [matches, setMatches] = useState<Array<{ matchPct: number; reason: string; employee: { id: string; name: string } }>>([]);
  const [employees, setEmployees] = useState<TalentPoolEntry[]>([]);
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [mktAi, setMktAi] = useState('');

  const load = useCallback(async () => {
    const reqs = await apiAuth<Array<{ id: string; title: string; urgency: string; skills: string[] }>>('/marketplace/requests').catch(
      () => [] as Array<{ id: string; title: string; urgency: string; skills: string[] }>,
    );
    setRequests(reqs);

    if (reqs.length) {
      await apiAuth('/marketplace/rematch', { method: 'POST' }).catch(console.error);
    }

    const [matchRows, pool] = await Promise.all([
      apiAuth<Array<{ matchPct: number; reason: string; employee: { id: string; name: string } }>>('/marketplace/matches').catch(() => []),
      apiAuth<TalentPoolEntry[]>('/marketplace/talent-pool').catch(() => []),
    ]);
    setMatches(matchRows);
    setEmployees(pool);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEmployees = employees.filter((e) => {
    if (availFilter === 'open') return e.loadPct < 70;
    if (availFilter === 'partial') return e.loadPct >= 70 && e.loadPct < 95;
    return true;
  });

  const selectedRequest = requests.find((r) => r.id === requestId);

  const matchRequest = async (reqId: string) => {
    await apiAuth(`/marketplace/requests/${reqId}/match`, { method: 'POST' });
    const updated = await apiAuth<Array<{ matchPct: number; reason: string; employee: { id: string; name: string } }>>('/marketplace/matches');
    setMatches(updated);
  };

  return (
    <>
      <p className="text-[10.5px] text-[var(--muted)]">
        Live skill graph from Talent Radar · AI matches refresh when CVs are uploaded
      </p>
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div>
          <div className="wn-card mb-4">
            <div className="px-4 py-3 border-b flex justify-between items-center gap-2">
              <div>
                <h3 className="text-xs font-semibold">Talent Pool</h3>
                <p className="text-[10px] text-gray-500">All employees — skills include CV-scraped talents</p>
              </div>
              <FilterTabs
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'open', label: 'Open' },
                  { id: 'partial', label: 'Partial' },
                ]}
                value={availFilter}
                onChange={setAvailFilter}
              />
            </div>
            <div className="p-3 space-y-3">
              {filteredEmployees.map((e) => (
                <div key={e.id} className="wn-card p-3 border hover:border-[var(--v)]">
                  <button type="button" onClick={() => setEmployeeId(e.id)} className="w-full text-left cursor-pointer">
                    <div className="flex justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">{e.name}</div>
                        <div className="text-[10px] text-gray-500">{e.title}</div>
                      </div>
                      <span className={e.loadPct > 100 ? 'text-red-500 text-xs font-bold' : 'text-amber-500 text-xs'}>
                        {e.loadPct > 100 ? 'Overloaded' : `${e.capacityFreePct}% free`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {e.skillsList?.slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className={e.cvSkills?.includes(s) ? 'tag-on text-[10px]' : 'tag-strategic'}
                          title={e.cvSkills?.includes(s) ? 'From CV' : undefined}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    {e.hasCv && e.cvSkills.length > 0 && (
                      <p className="text-[9px] text-green-600 font-semibold">{e.cvSkills.length} skills from CV</p>
                    )}
                  </button>
                  <div className="bg-[var(--v)] text-white text-xs px-3 py-1.5 rounded flex justify-between items-center mt-2">
                    <span>AI Match</span>
                    <button
                      type="button"
                      className="bg-white text-black px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                      onClick={() => {
                        if (requests[0]) matchRequest(requests[0].id);
                        else router.push(aiPath(`Match ${e.name} to open help requests`));
                      }}
                    >
                      Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="wn-card">
            <div className="px-4 py-3 border-b">
              <h3 className="text-xs font-semibold">Open Help Requests</h3>
            </div>
            <div className="p-3 space-y-2">
              {requests.length ? (
                requests.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRequestId(r.id)}
                    className="w-full p-3 bg-[var(--bg3)] rounded-lg text-xs hover:border-[var(--v)] border border-transparent cursor-pointer text-left"
                  >
                    <span className="tag-risk mr-2">{r.urgency}</span>
                    {r.title}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.skills?.slice(0, 4).map((s) => (
                        <span key={s} className="tag-strategic text-[9px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-xs text-gray-500">No open requests — run db:seed or create one to get AI matches</p>
              )}
            </div>
          </div>
        </div>
        <div className="wn-card border-orange-200 p-4 min-h-[400px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--v)] animate-pulse" />
            <span className="font-semibold text-sm">AI Talent Matcher</span>
          </div>
          <p className="text-xs text-gray-600 flex-1">Matches use live skills from Talent Radar, including CV uploads.</p>
          <div className="flex gap-2 mt-3">
            <input
              className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-xs"
              placeholder="Who has capacity for…?"
              value={mktAi}
              onChange={(e) => setMktAi(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && mktAi.trim() && router.push(aiPath(mktAi.trim()))}
            />
            <button type="button" onClick={() => mktAi.trim() && router.push(aiPath(mktAi.trim()))} className="wn-btn-primary text-xs">
              Match
            </button>
          </div>
        </div>
      </div>
      {matches.length > 0 && (
        <div className="wn-card">
          <div className="px-4 py-3 border-b font-semibold text-xs flex justify-between">
            <span>AI Match Suggestions</span>
            <button type="button" onClick={() => load()} className="wn-btn-ghost text-[10px]">
              Refresh matches
            </button>
          </div>
          <div className="p-3 space-y-2">
            {matches.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => m.employee?.id && setEmployeeId(m.employee.id)}
                className="w-full flex gap-3 text-xs p-2 border rounded-lg hover:border-[var(--v)] cursor-pointer text-left"
              >
                <span className="font-mono font-bold text-[var(--v)]">{m.matchPct}%</span>
                <span className="flex-1">
                  {m.employee?.name} — {m.reason}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <DetailModal
        open={!!requestId}
        onClose={() => setRequestId(null)}
        title={selectedRequest?.title ?? 'Help request'}
        subtitle={selectedRequest?.urgency}
        footer={
          <>
            <button
              type="button"
              className="wn-btn-ghost text-xs"
              onClick={() => {
                if (requestId) matchRequest(requestId);
                setRequestId(null);
              }}
            >
              Run match
            </button>
            <Link href={aiPath(`Find best internal matches for: ${selectedRequest?.title}`)} className="wn-btn-primary text-xs">
              AI match
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          {selectedRequest?.skills?.map((s) => (
            <span key={s} className="tag-strategic">
              {s}
            </span>
          ))}
        </div>
      </DetailModal>
      <EmployeeDetailModal employeeId={employeeId} onClose={() => setEmployeeId(null)} />
    </>
  );
}
