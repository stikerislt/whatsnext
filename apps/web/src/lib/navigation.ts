export const NAV_ITEMS = [
  { section: 'Overview', items: [
    { id: 'home', label: 'Command Center', badge: null },
    { id: 'decisions', label: 'Decision Center', badge: '5', badgeColor: 'r' },
    { id: 'signals', label: 'Live Signals', badge: '7', badgeColor: 'v' },
  ]},
  { section: 'Strategy', items: [
    { id: 'strategy', label: 'Strategy Map', badge: '2', badgeColor: 'a' },
    { id: 'projects', label: 'Projects', badge: null },
    { id: 'analytics', label: 'Execution Analytics', badge: null },
  ]},
  { section: 'People', items: [
    { id: 'marketplace', label: 'Talent Marketplace', badge: '4', badgeColor: 'v' },
    { id: 'talent', label: 'Talent Radar', badge: null },
    { id: 'skills', label: 'Skills & Growth', badge: null },
    { id: 'bonuses', label: 'Bonuses & Motivation', badge: null },
  ]},
  { section: 'Platform', items: [
    { id: 'settings', label: 'Settings', badge: null },
    { id: 'layers', label: 'System Layers', badge: null },
  ]},
  { section: 'Personal', items: [
    { id: 'myview', label: 'My Dashboard', badge: null },
    { id: 'fullai', label: 'AI Advisor', badge: null },
  ]},
];

export const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  home: { title: 'Command Center', sub: 'Execution Intelligence · Q2 2026 · Week 17' },
  decisions: { title: 'Decision Center', sub: '5 pending · AI decision copilot · Task-linked' },
  signals: { title: 'Live Signals', sub: 'Real-time · Jira · ClickUp · AI-interpreted' },
  strategy: { title: 'Strategy Map', sub: '5 goals · 18 tactics · 24 projects' },
  projects: { title: 'Projects', sub: '24 active · 6 unlinked · Live sync' },
  analytics: { title: 'Execution Analytics', sub: 'Strategy execution · Role-specific KPIs' },
  marketplace: { title: 'Talent Marketplace', sub: 'Signal availability · AI matching' },
  talent: { title: 'Talent Database', sub: 'Skills · Capacity · CV upload (PDF, CSV, images)' },
  skills: { title: 'Skills & Growth', sub: 'Skill graph · Strategic gap analysis' },
  bonuses: { title: 'Bonuses & Motivation', sub: 'Contribution-based · HR-managed' },
  integrations: { title: 'Integrations', sub: 'API-first unified data layer' },
  settings: { title: 'Tenant Settings', sub: 'Integrations · SSO' },
  layers: { title: 'System Layers', sub: '5 functional layers' },
  myview: { title: 'My Dashboard', sub: 'Personal execution view' },
  fullai: { title: 'AI Advisor', sub: 'Full context · Natural language' },
};

export const ROLE_TABS = [
  { id: 'ceo' as const, label: 'C-Suite' },
  { id: 'hr' as const, label: 'HR' },
  { id: 'lead' as const, label: 'Team Lead' },
  { id: 'emp' as const, label: 'Employee' },
];
