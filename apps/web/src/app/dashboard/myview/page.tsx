'use client';

import { useAuth } from '@/lib/auth-context';

export default function MyViewPage() {
  const { uiRole } = useAuth();
  return (
    <div className="space-y-4">
      <div className="wn-card p-6 bg-gradient-to-br from-orange-50 to-blue-50">
        <div className="text-[10px] uppercase text-gray-500 mb-1">Executive Overview</div>
        <div className="text-4xl font-extrabold text-[var(--v)]">73%</div>
        <p className="text-xs text-gray-500 mt-1">Strategy alignment · 5 decisions pending · 2 goals at risk</p>
      </div>
      <p className="text-xs text-gray-500">Personal dashboard for role: {uiRole}</p>
    </div>
  );
}
