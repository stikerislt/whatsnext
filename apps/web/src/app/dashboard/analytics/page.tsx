'use client';

import { useEffect, useState } from 'react';
import { apiAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AnalyticsPage() {
  const { uiRole } = useAuth();
  const [data, setData] = useState<{ workTypeByTeam: { strategic: number; tactical: number; ops: number }; goalTrend: number[]; toolUtilisation: Record<string, { tasks: number; linked: number }> } | null>(null);

  useEffect(() => {
    apiAuth<{ workTypeByTeam: { strategic: number; tactical: number; ops: number }; goalTrend: number[]; toolUtilisation: Record<string, { tasks: number; linked: number }> }>(`/analytics/dashboard?role=${uiRole}`).then(setData).catch(console.error);
  }, [uiRole]);

  if (!data) return <div>Loading analytics…</div>;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="wn-card p-4">
          <h3 className="text-xs font-semibold mb-3">Work Type by Team</h3>
          <div className="flex h-4 rounded overflow-hidden mb-2">
            <div style={{ width: `${data.workTypeByTeam.strategic}%`, background: 'var(--v)' }} />
            <div style={{ width: `${data.workTypeByTeam.tactical}%`, background: 'var(--b)' }} />
            <div style={{ width: `${data.workTypeByTeam.ops}%`, background: '#94A3B8' }} />
          </div>
        </div>
        <div className="wn-card p-4">
          <h3 className="text-xs font-semibold mb-3">Goal Completion Trend</h3>
          <div className="flex items-end gap-1 h-20">
            {data.goalTrend.map((v, i) => (
              <div key={i} className="flex-1 bg-[var(--v)] rounded-t opacity-80" style={{ height: `${v}%` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="wn-card p-4">
        <h3 className="text-xs font-semibold mb-3">Tool Utilisation vs Strategic Value</h3>
        {Object.entries(data.toolUtilisation).map(([tool, stats]) => (
          <div key={tool} className="flex justify-between text-xs py-2 border-b border-[var(--border)]">
            <span className="capitalize font-medium">{tool}</span>
            <span>{stats.linked}/{stats.tasks} linked</span>
          </div>
        ))}
      </div>
    </>
  );
}
