'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { aiPath } from '@/lib/ai-nav';

export default function BonusesPage() {
  const { uiRole } = useAuth();
  const router = useRouter();
  const [preview, setPreview] = useState<{ cycle: { totalPoolAmount: number; criteria: Array<{ id: string; name: string; weightPct: number }> }; preview: Array<{ employee: { name: string }; totalScore: number; estimatedPayout: number }> } | null>(null);

  useEffect(() => {
    apiAuth<{ cycle: { totalPoolAmount: number; criteria: Array<{ id: string; name: string; weightPct: number }> }; preview: Array<{ employee: { name: string }; totalScore: number; estimatedPayout: number }> }>('/bonuses/preview').then(setPreview).catch(console.error);
  }, []);

  if (!preview) return <div>Loading bonuses…</div>;

  return (
    <>
      <p className="text-[10.5px] text-[var(--muted)]">Contribution-based rewards · Configurable criteria · Tied to strategy</p>
      <div className="grid grid-cols-4 gap-3">
        <div className="wn-metric" style={{ ['--mc' as string]: '#D97706' }}>
          <div className="text-[9px] text-gray-500 uppercase">Total Pool Q2</div>
          <div className="text-lg font-bold">€{preview.cycle.totalPoolAmount.toLocaleString()}</div>
        </div>
        <div className="wn-metric"><div className="text-[9px] text-gray-500 uppercase">Criteria</div><div className="text-lg font-bold">{preview.cycle.criteria.length}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="wn-card">
          <div className="px-4 py-3 border-b font-semibold text-xs flex justify-between items-center">
            <span>Bonus Criteria</span>
            {uiRole === 'hr' && (
              <button type="button" className="wn-btn-primary text-[10px] cursor-pointer" onClick={() => alert('Bonus criteria editor — HR configuration (weights per IT brief)')}>
                Configure
              </button>
            )}
          </div>
          <div className="p-3 space-y-2">
            {preview.cycle.criteria.map((c) => (
              <div key={c.id} className="flex justify-between p-2 bg-[var(--bg3)] rounded-lg text-xs">
                <span>{c.name}</span>
                <span className="font-mono font-bold text-amber-600">{c.weightPct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="wn-card">
          <div className="px-4 py-3 border-b font-semibold text-xs flex justify-between items-center">
            <span>Payout Preview</span>
            <button
              type="button"
              className="wn-btn-ghost text-[10px] cursor-pointer"
              onClick={() => router.push(aiPath('Analyse Q2 bonus payout preview — fairness and strategic contribution'))}
            >
              AI review
            </button>
          </div>
          <div className="p-3 space-y-2">
            {preview.preview.slice(0, 6).map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-gray-400">{i + 1}</span>
                <span className="flex-1">{p.employee.name}</span>
                <span className="font-mono">{p.totalScore}</span>
                <span className="font-bold text-amber-600">€{p.estimatedPayout}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
