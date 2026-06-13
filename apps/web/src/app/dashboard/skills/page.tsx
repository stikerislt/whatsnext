'use client';

import { useEffect, useState } from 'react';
import { apiAuth } from '@/lib/api';

export default function SkillsPage() {
  const [gaps, setGaps] = useState<Array<{ category: string; have: number; need: number; gap: number }>>([]);

  useEffect(() => {
    apiAuth<Array<{ category: string; have: number; need: number; gap: number }>>('/skills/gaps').then(setGaps).catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="wn-card p-4">
        <h3 className="text-xs font-semibold mb-4">Skill Depth vs Need</h3>
        {gaps.map((g) => (
          <div key={g.category} className="mb-3">
            <div className="flex justify-between text-xs mb-1"><span>{g.category}</span><span>{g.have}/{g.need}</span></div>
            <div className="h-2 bg-gray-100 rounded"><div className="h-full bg-[var(--v)] rounded" style={{ width: `${Math.min(100, (g.have / g.need) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="wn-card p-4">
        <h3 className="text-xs font-semibold mb-4">Critical Gaps</h3>
        {gaps.filter((g) => g.gap > 0).map((g) => (
          <div key={g.category} className="p-2 mb-2 bg-red-50 border border-red-200 rounded-lg text-xs">
            <span className="font-semibold">{g.category}</span> — need {g.gap} more
          </div>
        ))}
      </div>
    </div>
  );
}
