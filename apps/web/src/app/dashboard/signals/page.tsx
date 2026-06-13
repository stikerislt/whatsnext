'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiAuth } from '@/lib/api';
import { aiPath } from '@/lib/ai-nav';
import { DetailModal } from '@/components/ui/detail-modal';

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<Array<{ id: string; type: string; text: string; source?: string; problemCategory?: string; rank: number }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    apiAuth<Array<{ id: string; type: string; text: string; source?: string; problemCategory?: string; rank: number }>>('/signals')
      .then(setSignals)
      .catch(console.error);
  }, []);

  const selected = signals.find((s) => s.id === selectedId);

  const acknowledge = async () => {
    if (!selectedId) return;
    await apiAuth(`/signals/${selectedId}/acknowledge`, { method: 'PATCH', body: JSON.stringify({}) });
    setSignals((s) => s.filter((x) => x.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <>
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="space-y-2">
          {signals.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              className="wn-card p-3 flex gap-2 w-full text-left hover:border-[var(--v)] cursor-pointer"
            >
              <span className="text-red-500 font-bold">!</span>
              <div>
                <div className="flex gap-2 text-xs font-medium">
                  <span>{s.type}</span>
                  <span className="text-gray-400">{s.source}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{s.text}</p>
                <p className="text-[10px] text-[var(--v)] mt-1">{s.problemCategory}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="wn-card p-4">
          <h3 className="text-xs font-semibold mb-3">Problem summary</h3>
          {[...new Set(signals.map((s) => s.problemCategory))].filter(Boolean).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => router.push(aiPath(`Analyse all signals in category: ${p}`))}
              className="w-full flex justify-between text-xs py-1.5 border-b border-[var(--border)] hover:text-[var(--v)] cursor-pointer text-left"
            >
              <span>{p}</span>
              <span className="font-mono">{signals.filter((s) => s.problemCategory === p).length}×</span>
            </button>
          ))}
        </div>
      </div>

      <DetailModal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selected?.type ?? 'Signal'}
        subtitle={selected?.source}
        footer={
          <>
            <button type="button" onClick={acknowledge} className="wn-btn-primary text-xs">
              Acknowledge
            </button>
            <button
              type="button"
              onClick={() => router.push(aiPath(`What should we do about this signal: ${selected?.text}`))}
              className="wn-btn-ghost text-xs"
            >
              Ask AI
            </button>
          </>
        }
      >
        <p className="text-xs text-gray-600">{selected?.text}</p>
        {selected?.problemCategory && <p className="text-[10px] text-[var(--v)] mt-2">{selected.problemCategory}</p>}
      </DetailModal>
    </>
  );
}
