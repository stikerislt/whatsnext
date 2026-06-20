'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, PAGE_TITLES, ROLE_TABS } from '@/lib/navigation';
import { useAuth } from '@/lib/auth-context';

const ROLE_USERS = {
  ceo: { name: 'Demo User', role: 'Chief Executive Officer', pill: 'C-Suite', initials: 'DU', color: '#FF751F' },
  hr: { name: 'Laura Rimkutė', role: 'Head of People & Culture', pill: 'HR', initials: 'LR', color: '#D97706' },
  lead: { name: 'Tomas Grigaitis', role: 'Engineering Lead', pill: 'Lead', initials: 'TG', color: '#2563EB' },
  emp: { name: 'Aistė Norvilaitė', role: 'Data Analyst', pill: 'Employee', initials: 'AN', color: '#16A34A' },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { uiRole, setUiRole } = useAuth();
  const viewId = pathname.split('/').pop() ?? 'home';
  const page = PAGE_TITLES[viewId] ?? PAGE_TITLES.home;
  const user = ROLE_USERS[uiRole];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-[228px] min-w-[228px] bg-[var(--bg2)] border-r border-[var(--border2)] flex flex-col shadow-sm">
        <div className="p-3.5 flex items-center gap-2.5 border-b border-[var(--border)]">
          <div className="w-9 h-9 bg-[var(--v)] rounded-lg flex items-center justify-center text-white font-black text-lg">›</div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10.5px] font-black tracking-widest uppercase">WHAT&apos;S</span>
            <span className="text-[10.5px] font-black tracking-widest uppercase">NEXT?</span>
          </div>
        </div>
        <div className="m-2 p-2.5 bg-[var(--bg3)] border border-[var(--border2)] rounded-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-semibold" style={{ background: user.color }}>{user.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-semibold leading-tight">{user.name}</div>
              <div className="text-[9px] text-[var(--muted)] leading-snug mt-0.5">{user.role}</div>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <span className="text-[9px] px-1.5 py-0.5 bg-[var(--v3)] text-[var(--v)] rounded font-bold">{user.pill}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {NAV_ITEMS.map((section) => (
            <div key={section.section}>
              <div className="px-3.5 pt-4 pb-1 text-[8.5px] font-bold text-gray-400 uppercase tracking-wider">{section.section}</div>
              {section.items.map((item) => {
                const href = item.id === 'home' ? '/dashboard' : `/dashboard/${item.id}`;
                const active = (item.id === 'home' && pathname === '/dashboard') || pathname.endsWith(`/${item.id}`);
                return (
                  <Link key={item.id} href={href}
                    className={`flex items-center gap-2 px-2.5 py-1.5 mx-1.5 rounded-lg text-xs font-medium relative ${active ? 'bg-[var(--v3)] text-[var(--v)]' : 'text-[var(--muted)] hover:bg-orange-50 hover:text-[var(--v)]'}`}>
                    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--v)] rounded-r" />}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`ml-auto text-[9px] font-semibold px-1 rounded-full ${item.badgeColor === 'r' ? 'bg-red-500 text-white' : item.badgeColor === 'a' ? 'bg-amber-500 text-white' : 'bg-[var(--v)] text-white'}`}>{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <div className="p-2.5 border-t border-[var(--border)]">
          <Link href="/dashboard/fullai" className="flex items-center gap-2 p-2.5 rounded-[10px] bg-gradient-to-br from-purple-50 to-teal-50 border border-purple-200 cursor-pointer">
            <span className="w-2 h-2 rounded-full bg-[var(--v)] animate-pulse" />
            <span className="text-[11.5px] font-semibold text-[var(--v)]">Ask AI Advisor</span>
          </Link>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-2.5 px-6 py-3 border-b border-[var(--border2)] bg-[var(--bg2)] flex-shrink-0 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-tight">{page.title}</h1>
            <p className="text-[10px] text-[var(--muted)]">{page.sub}</p>
          </div>
          <div className="flex gap-0.5 bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-0.5">
            {ROLE_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setUiRole(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border-none cursor-pointer ${uiRole === tab.id ? 'bg-[var(--v)] text-white shadow-sm' : 'bg-transparent text-gray-400'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[var(--muted)] bg-[var(--bg3)] border border-[var(--border)] px-2.5 py-1 rounded-md font-mono">Q2 2026 · W17</span>
          <button
            type="button"
            onClick={() => alert('Syncing Jira · ClickUp · Slack · HiBob…')}
            className="wn-btn-primary text-xs cursor-pointer"
          >
            Sync
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[var(--bg)]">{children}</div>
      </main>
    </div>
  );
}
