'use client';

import { useEffect, useState } from 'react';
import { apiAuth } from '@/lib/api';

const PROVIDERS = [
  { id: 'jira', name: 'Jira', color: '#2563EB', desc: 'Sprint tracking · Tasks · Velocity', defaultUrl: 'https://your-domain.atlassian.net', help: null },
  {
    id: 'clickup',
    name: 'ClickUp',
    color: '#9333EA',
    desc: 'Employees · Lists (projects) · Tasks · Assignees',
    defaultUrl: 'https://api.clickup.com/api/v2',
    help: 'Create a personal API token: ClickUp avatar → Settings → Apps → API Token. Then click “Find workspaces” below. Lists become projects; tasks import with assignees; workspace members become employees in Talent Radar.',
  },
  { id: 'slack', name: 'Slack', color: '#FF751F', desc: 'Communication · Signals', defaultUrl: 'https://slack.com/api', help: null },
  { id: 'hibob', name: 'HiBob', color: '#e85d8a', desc: 'HR · People · Skills', defaultUrl: 'https://api.hibob.com/v1', help: null },
  { id: 'teams', name: 'Microsoft Teams', color: '#5B5FC7', desc: 'Meetings · Collaboration', defaultUrl: 'https://graph.microsoft.com/v1.0', help: null },
];

interface IntegrationRow {
  id: string;
  provider: string;
  status: string;
  lastSyncAt?: string;
  config: { apiUrl: string; workspaceId: string; workspaceName: string; hasToken: boolean };
  stats: { tasks: number; linked: number; stale: number; employees?: number; projects?: number };
}

export function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { apiUrl: string; apiToken: string; workspaceId: string; workspaceName: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clickupTeams, setClickupTeams] = useState<Array<{ id: string; name: string; memberCount: number }>>([]);

  const load = () => {
    apiAuth<IntegrationRow[]>('/integrations')
      .then(setIntegrations)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const formFor = (providerId: string) => {
    const existing = integrations.find((i) => i.provider === providerId);
    const p = PROVIDERS.find((x) => x.id === providerId);
    return (
      forms[providerId] ?? {
        apiUrl: existing?.config.apiUrl || p?.defaultUrl || '',
        apiToken: '',
        workspaceId: existing?.config.workspaceId || '',
        workspaceName: existing?.config.workspaceName || '',
      }
    );
  };

  const setForm = (providerId: string, patch: Partial<(typeof forms)[string]>) => {
    setForms((prev) => ({ ...prev, [providerId]: { ...formFor(providerId), ...patch } }));
  };

  const connect = async (provider: string) => {
    setBusy(provider);
    setError(null);
    setSuccess(null);
    try {
      const body = formFor(provider);
      const res = await apiAuth<{
        sync?: { mode: string; message?: string; employees?: number; projects?: number; tasks?: number };
      }>(`/integrations/${provider}/connect`, {
        method: 'POST',
        body: JSON.stringify({
          apiUrl: body.apiUrl,
          apiToken: body.apiToken || undefined,
          workspaceId: body.workspaceId,
          workspaceName: body.workspaceName,
        }),
      });
      setEditing(null);
      load();
      if (res.sync?.mode === 'inline' && res.sync.employees != null) {
        setSuccess(
          `ClickUp connected — imported ${res.sync.employees} members, ${res.sync.projects} projects (lists), ${res.sync.tasks} tasks.`,
        );
      } else if (res.sync?.mode === 'queued') {
        setSuccess('ClickUp connected — sync running in background. Refresh in a few seconds.');
        setTimeout(load, 8000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const discoverClickUp = async () => {
    setBusy('clickup-discover');
    setError(null);
    try {
      const form = formFor('clickup');
      if (!form.apiToken.trim()) {
        setError('Enter your ClickUp API token first');
        return;
      }
      const teams = await apiAuth<Array<{ id: string; name: string; memberCount: number }>>(
        '/integrations/clickup/discover',
        {
          method: 'POST',
          body: JSON.stringify({ apiToken: form.apiToken, apiUrl: form.apiUrl }),
        },
      );
      setClickupTeams(teams);
      if (teams.length === 1) {
        setForm('clickup', { workspaceId: teams[0].id, workspaceName: teams[0].name });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sync = async (provider: string) => {
    setBusy(`${provider}-sync`);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiAuth<{ mode: string; message?: string; employees?: number; projects?: number; tasks?: number }>(
        `/integrations/${provider}/sync`,
        { method: 'POST' },
      );
      load();
      if (res.message) setSuccess(res.message);
      if (res.mode === 'queued') setTimeout(load, 8000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (provider: string) => {
    if (!confirm(`Disconnect ${provider}?`)) return;
    setBusy(provider);
    try {
      await apiAuth(`/integrations/${provider}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--muted)] max-w-2xl">
        Connect work platforms to import real data. <strong>ClickUp</strong> syncs workspace members → employees, lists → projects
        (strategic / tactical / unlinked), and tasks with assignees into Projects and Talent Radar.
      </p>
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PROVIDERS.map((p) => {
          const int = integrations.find((i) => i.provider === p.id);
          const connected = int?.status === 'connected';
          const isEditing = editing === p.id || !connected;
          const form = formFor(p.id);

          return (
            <div key={p.id} className="wn-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg text-white flex items-center justify-center font-bold shrink-0" style={{ background: p.color }}>
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-[10px] text-gray-500">{p.desc}</div>
                </div>
                <span className={connected ? 'tag-on text-[10px]' : 'text-gray-400 text-[10px]'}>{int?.status ?? 'disconnected'}</span>
              </div>

              {connected && int && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 mb-3">
                  {int.stats.employees != null && int.stats.employees > 0 && <span>{int.stats.employees} employees</span>}
                  {int.stats.projects != null && int.stats.projects > 0 && <span>{int.stats.projects} projects</span>}
                  <span>{int.stats.tasks} tasks</span>
                  <span>{int.stats.linked} goal-linked</span>
                  <span>{int.stats.stale} stale</span>
                  {int.lastSyncAt && <span>Synced {new Date(int.lastSyncAt).toLocaleString()}</span>}
                </div>
              )}

              {p.help && isEditing && (
                <p className="text-[10px] text-[var(--v)] bg-[var(--v3)] rounded-lg px-2 py-1.5 mb-3 leading-relaxed">{p.help}</p>
              )}

              {isEditing && (
                <div className="space-y-2 mb-3">
                  <label className="block text-[10px] font-semibold text-gray-500">API URL</label>
                  <input
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    value={form.apiUrl}
                    onChange={(e) => setForm(p.id, { apiUrl: e.target.value })}
                    placeholder={p.defaultUrl}
                  />
                  <label className="block text-[10px] font-semibold text-gray-500">
                    API token {int?.config.hasToken && '(leave blank to keep existing)'}
                  </label>
                  <input
                    type="password"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    value={form.apiToken}
                    onChange={(e) => setForm(p.id, { apiToken: e.target.value })}
                    placeholder="pk_…"
                  />
                  {p.id === 'clickup' && (
                    <>
                      <button
                        type="button"
                        className="wn-btn-ghost text-xs mt-1"
                        disabled={busy === 'clickup-discover'}
                        onClick={discoverClickUp}
                      >
                        {busy === 'clickup-discover' ? 'Looking up workspaces…' : 'Find workspaces'}
                      </button>
                      {clickupTeams.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <label className="block text-[10px] font-semibold text-gray-500">Workspace</label>
                          <select
                            className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                            value={form.workspaceId}
                            onChange={(e) => {
                              const team = clickupTeams.find((t) => t.id === e.target.value);
                              setForm('clickup', {
                                workspaceId: e.target.value,
                                workspaceName: team?.name ?? '',
                              });
                            }}
                          >
                            <option value="">Select workspace…</option>
                            {clickupTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.memberCount} members)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                  {p.id !== 'clickup' && (
                    <>
                  <label className="block text-[10px] font-semibold text-gray-500">Workspace / Team ID</label>
                  <input
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    value={form.workspaceId}
                    onChange={(e) => setForm(p.id, { workspaceId: e.target.value })}
                    placeholder="e.g. 9012345678"
                  />
                    </>
                  )}
                  {p.id === 'clickup' && !clickupTeams.length && (
                  <label className="block text-[10px] font-semibold text-gray-500">Workspace / Team ID (or use Find workspaces)</label>
                  )}
                  {p.id === 'clickup' && !clickupTeams.length && (
                  <input
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
                    value={form.workspaceId}
                    onChange={(e) => setForm(p.id, { workspaceId: e.target.value })}
                    placeholder="e.g. 9012345678"
                  />
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <button type="button" className="wn-btn-primary text-xs" disabled={busy === p.id} onClick={() => connect(p.id)}>
                    {busy === p.id ? (p.id === 'clickup' ? 'Connecting & importing…' : 'Connecting…') : connected ? 'Save & reconnect' : 'Connect'}
                  </button>
                ) : (
                  <button type="button" className="wn-btn-ghost text-xs" onClick={() => setEditing(p.id)}>
                    Edit credentials
                  </button>
                )}
                {connected && (
                  <>
                    <button type="button" className="wn-btn-ghost text-xs" disabled={busy === `${p.id}-sync`} onClick={() => sync(p.id)}>
                      {busy === `${p.id}-sync` ? 'Syncing…' : 'Sync now'}
                    </button>
                    <button type="button" className="text-xs text-red-500 font-semibold px-2" disabled={busy === p.id} onClick={() => disconnect(p.id)}>
                      Disconnect
                    </button>
                  </>
                )}
                {isEditing && connected && (
                  <button type="button" className="wn-btn-ghost text-xs" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
