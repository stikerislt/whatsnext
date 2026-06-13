'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiAuth } from '@/lib/api';
import { aiPath } from '@/lib/ai-nav';
import { DetailModal } from '@/components/ui/detail-modal';

export default function DecisionsPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Array<{ id: string; title: string; detail?: string; urgency: string; color?: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);

  useEffect(() => {
    apiAuth<Array<{ id: string; title: string; detail?: string; urgency: string; color?: string }>>('/decisions')
      .then(setDecisions)
      .catch(console.error);
  }, []);

  const selected = decisions.find((d) => d.id === selectedId);

  const runAi = async () => {
    if (!selectedId) return;
    setAiLoading(true);
    try {
      const res = await apiAuth<{ reply: string }>(`/decisions/${selectedId}/ai-analyze`, { method: 'POST' });
      setAiReply(res.reply);
    } catch {
      router.push(aiPath(`Help me decide: ${selected?.title}`));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {decisions.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setSelectedId(d.id);
              setAiReply(null);
            }}
            className="wn-card p-4 flex gap-3 w-full text-left hover:border-[var(--v)] cursor-pointer"
          >
            <div className="w-1 rounded self-stretch min-h-[50px]" style={{ background: d.color ?? 'var(--v)' }} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{d.title}</span>
                <span className="tag-risk">{d.urgency}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{d.detail}</p>
            </div>
          </button>
        ))}
      </div>

      <DetailModal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selected?.title ?? 'Decision'}
        subtitle={selected?.urgency}
        footer={
          <>
            <button type="button" onClick={runAi} disabled={aiLoading} className="wn-btn-primary text-xs">
              {aiLoading ? 'Analysing…' : 'AI Help'}
            </button>
            <Link href={aiPath(`Deep analysis for decision: ${selected?.title}`)} className="wn-btn-ghost text-xs">
              Open in AI Advisor
            </Link>
          </>
        }
      >
        <p className="text-xs text-gray-600 mb-3">{selected?.detail}</p>
        {aiReply && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs whitespace-pre-wrap">{aiReply}</div>
        )}
      </DetailModal>
    </>
  );
}
