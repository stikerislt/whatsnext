'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiAuth, getToken } from '@/lib/api';
import { notifyGoalsUpdated } from '@/lib/goals-events';
import { DEMO_COMPANY_NAME } from '@whatsnext/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const STEPS = [
  { title: "Welcome. Let's set up your workspace.", sub: 'This takes 4 minutes. You will immediately see your strategy alignment and team capacity.' },
  { title: 'What are your strategic directions?', sub: 'Upload a strategy document or enter up to 6 strategic directions manually.' },
  { title: 'Connect your tools.', sub: "What's Next connects your existing tools. No new workflow needed." },
  { title: 'Confirm your import.', sub: 'Review what was imported from your tools. Fix unlinked projects.' },
  { title: 'Set up your talent database.', sub: 'All team members are visible. Upload CVs to extract skills automatically.' },
];

const TEAM_SIZES = ['15-30 people', '30-100 people', '100-250 people', '250-500 people'];

interface DbGoal {
  title: string;
  kpiText?: string | null;
  source?: string | null;
}

function goalsFromDb(dbGoals: DbGoal[]): string[] {
  const titles = dbGoals.slice(0, 6).map((g) => g.title);
  while (titles.length < 6) titles.push('');
  return titles;
}

function hasCustomGoals(dbGoals: DbGoal[]) {
  return dbGoals.some((g) => g.source === 'document' || g.source === 'manual');
}
const DEFAULT_GOALS = [
  'Expand into EU market',
  'Achieve product-led growth',
  'Cut customer acquisition cost 30%',
  'Platform scalability 10x',
  'Build data-driven culture',
  '',
];

const INTEGRATIONS = [
  { id: 'clickup', name: 'ClickUp', desc: 'Projects · Tasks · Team members', color: '#9333EA', letter: 'C', defaultUrl: 'https://api.clickup.com/api/v2' },
  { id: 'jira', name: 'Jira', desc: 'Sprint tasks · Project tracking', color: '#2563EB', letter: 'J', defaultUrl: 'https://your-domain.atlassian.net' },
  { id: 'slack', name: 'Slack', desc: 'Communication · Signals', color: '#FF751F', letter: 'S', defaultUrl: 'https://slack.com/api' },
  { id: 'hibob', name: 'HiBob / Workday', desc: 'HR · People · Skills', color: '#e85d8a', letter: 'H', defaultUrl: 'https://api.hibob.com/v1' },
  { id: 'teams', name: 'Microsoft Teams', desc: 'Meetings · Calendar · SSO', color: '#2563EB', letter: 'MS', defaultUrl: 'https://graph.microsoft.com/v1.0' },
  { id: 'notion', name: 'Notion', desc: 'Docs · OKRs · Knowledge', color: '#37352F', letter: 'N', defaultUrl: 'https://api.notion.com/v1' },
];

const INTEGRATION_HELP: Record<string, string> = {
  clickup: 'Settings → Apps → API Token. Lists import as projects; tasks keep assignees; members appear in Talent Radar.',
  jira: 'Atlassian → Account → Security → API tokens. Site URL is your Jira cloud domain.',
  slack: 'api.slack.com → Your Apps → OAuth & Permissions → Bot User OAuth Token.',
  hibob: 'HiBob service user token from your admin.',
  teams: 'Azure AD app registration with Microsoft Graph permissions.',
  notion: 'notion.so/my-integrations → Internal integration secret.',
};

interface IntegrationForm {
  apiUrl: string;
  apiToken: string;
  workspaceId: string;
  workspaceName: string;
}

function defaultIntegrationForm(providerId: string): IntegrationForm {
  const p = INTEGRATIONS.find((i) => i.id === providerId);
  return {
    apiUrl: p?.defaultUrl ?? '',
    apiToken: '',
    workspaceId: '',
    workspaceName: '',
  };
}

const PROVIDER_META: Record<string, { letter: string; color: string; label: string }> = {
  jira: { letter: 'J', color: '#2563EB', label: 'Jira' },
  clickup: { letter: 'C', color: '#9333EA', label: 'ClickUp' },
  slack: { letter: 'S', color: '#FF751F', label: 'Slack' },
  hibob: { letter: 'H', color: '#e85d8a', label: 'HiBob' },
  teams: { letter: 'MS', color: '#2563EB', label: 'Teams' },
  notion: { letter: 'N', color: '#37352F', label: 'Notion' },
};

export interface OnboardingInitialData {
  name?: string | null;
  mission?: string | null;
  vision?: string | null;
  teamSizeRange?: string | null;
}

interface ImportResult {
  projects: number;
  tasks: number;
  unlinkedProjects: number;
  departmentsWithoutCoverage: number;
  taskLinkagePct: number;
  unlinkedCapacityPct: number;
  integrations: Array<{ provider: string; projectCount: number; taskCount: number; employeeCount?: number; status: string }>;
}

interface ObEmployee {
  id: string;
  name: string;
  title?: string | null;
  initials?: string | null;
  avatarColor?: string | null;
  cvDocument?: { fileName: string } | null;
  department?: { name: string } | null;
}

export function OnboardingWizard({
  initialCompany,
  onComplete,
}: {
  initialCompany?: OnboardingInitialData;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(1);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [company, setCompany] = useState({
    name: initialCompany?.name ?? DEMO_COMPANY_NAME,
    mission: initialCompany?.mission ?? 'We help growing companies scale operations without losing strategic focus.',
    vision: initialCompany?.vision ?? 'To become the operating backbone for 10,000 companies across Europe by 2028.',
    teamSizeRange: initialCompany?.teamSizeRange ?? '30-100 people',
  });

  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [docState, setDocState] = useState<'idle' | 'analysing' | 'done'>('idle');
  const [docFileName, setDocFileName] = useState<string | null>(null);

  const [providers, setProviders] = useState<string[]>(['clickup']);
  const [integrationForms, setIntegrationForms] = useState<Record<string, IntegrationForm>>({ clickup: defaultIntegrationForm('clickup') });
  const [clickupTeams, setClickupTeams] = useState<Array<{ id: string; name: string; memberCount: number }>>([]);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [employees, setEmployees] = useState<ObEmployee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const cvTargetRef = useRef<string | null>(null);

  const finish = useCallback(() => {
    setClosing(true);
    setTimeout(onComplete, 400);
  }, [onComplete]);

  const loadImport = useCallback(async () => {
    setImportLoading(true);
    try {
      const res = await apiAuth<ImportResult>('/onboarding/confirm-import', { method: 'POST' });
      setImportResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setImportLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const list = await apiAuth<ObEmployee[]>('/employees');
      setEmployees(list);
    } catch (e) {
      console.error(e);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    apiAuth<DbGoal[]>('/goals')
      .then((dbGoals) => {
        if (!dbGoals.length) return;
        if (hasCustomGoals(dbGoals)) {
          setGoals(goalsFromDb(dbGoals));
          if (dbGoals.some((g) => g.source === 'document')) {
            setDocState('done');
          }
        } else {
          setGoals(goalsFromDb(dbGoals));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 4 && !importResult && !importLoading) loadImport();
    if (step === 5) loadEmployees();
  }, [step, importResult, importLoading, loadImport, loadEmployees]);

  const toggleProvider = (id: string) => {
    setProviders((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      setIntegrationForms((forms) => ({ ...forms, [id]: forms[id] ?? defaultIntegrationForm(id) }));
      return [...prev, id];
    });
    setIntegrationError(null);
  };

  const setIntegrationForm = (providerId: string, patch: Partial<IntegrationForm>) => {
    setIntegrationForms((prev) => ({
      ...prev,
      [providerId]: { ...(prev[providerId] ?? defaultIntegrationForm(providerId)), ...patch },
    }));
  };

  const discoverClickUp = async () => {
    const form = integrationForms.clickup ?? defaultIntegrationForm('clickup');
    if (!form.apiToken.trim()) {
      setIntegrationError('Enter your ClickUp API token first');
      return;
    }
    setIntegrationError(null);
    try {
      const teams = await apiAuth<Array<{ id: string; name: string; memberCount: number }>>(
        '/integrations/clickup/discover',
        {
          method: 'POST',
          body: JSON.stringify({ apiToken: form.apiToken, apiUrl: form.apiUrl }),
        },
      );
      setClickupTeams(teams);
      if (teams.length === 1) {
        setIntegrationForm('clickup', { workspaceId: teams[0].id, workspaceName: teams[0].name });
      }
    } catch (e) {
      setIntegrationError(e instanceof Error ? e.message : 'Could not find ClickUp workspaces');
    }
  };

  const uploadStrategyDoc = async (file: File) => {
    setDocState('analysing');
    setDocFileName(file.name);
    try {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/onboarding/strategy-doc`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { jobId: string };

      let extracted: { goals?: Array<{ title: string; kpi?: string }> } | undefined;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const ext = await apiAuth<{ status: string; extracted?: { goals?: Array<{ title: string; kpi?: string }> }; error?: string }>(
          `/onboarding/extraction/${data.jobId}`,
        );
        if (ext.status === 'completed') {
          extracted = ext.extracted;
          break;
        }
        if (ext.status === 'failed') {
          throw new Error(ext.error ?? 'Document analysis failed');
        }
      }

      if (!extracted) {
        throw new Error('Document analysis timed out. Enter strategic directions manually.');
      }
      if (!extracted.goals?.length) {
        throw new Error('No strategic directions were extracted. Enter them manually below.');
      }
      const extractedGoals = extracted.goals.slice(0, 6);
      const titles = extractedGoals.map((g) => g.title);
      setGoals((prev) => {
        const next = [...prev];
        titles.forEach((t, i) => { if (i < 6) next[i] = t; });
        return next;
      });
      await apiAuth('/onboarding/goals', {
        method: 'PUT',
        body: JSON.stringify({
          source: 'document',
          goals: extractedGoals.map((g) => ({ title: g.title, kpi: g.kpi })),
        }),
      });
      notifyGoalsUpdated();
      setDocState('done');
    } catch (e) {
      console.error(e);
      setDocState('idle');
      setDocFileName(null);
      alert(e instanceof Error ? e.message : 'Could not analyse strategy document');
    }
  };

  const uploadCv = async (empId: string, file: File) => {
    setUploadingId(empId);
    try {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/employees/${empId}/cv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      await loadEmployees();
    } catch (e) {
      console.error(e);
      alert(`CV upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setUploadingId(null);
    }
  };

  const next = async () => {
    setBusy(true);
    try {
      if (step === 1) {
        await apiAuth('/companies/current', {
          method: 'PATCH',
          body: JSON.stringify(company),
        });
      }
      if (step === 2) {
        const filtered = goals.filter(Boolean);
        if (filtered.length) {
          await apiAuth('/onboarding/goals', {
            method: 'PUT',
            body: JSON.stringify({
              source: docState === 'done' ? 'document' : 'manual',
              goals: filtered.map((title) => ({ title })),
            }),
          });
          notifyGoalsUpdated();
        }
      }
      if (step === 3) {
        setIntegrationError(null);
        if (providers.length) {
          if (providers.includes('clickup')) {
            const cu = integrationForms.clickup ?? defaultIntegrationForm('clickup');
            if (!cu.apiToken.trim()) {
              setIntegrationError('ClickUp API token is required');
              return;
            }
            if (!cu.workspaceId.trim()) {
              setIntegrationError('Select a ClickUp workspace (use Find workspaces)');
              return;
            }
          }
          const integrations = providers.map((provider) => {
            const form = integrationForms[provider] ?? defaultIntegrationForm(provider);
            return {
              provider,
              apiUrl: form.apiUrl || undefined,
              apiToken: form.apiToken || undefined,
              workspaceId: form.workspaceId || undefined,
              workspaceName: form.workspaceName || undefined,
            };
          });
          await apiAuth('/onboarding/integrations', {
            method: 'POST',
            body: JSON.stringify({ integrations }),
          });
          setImportResult(null);
        }
      }
      if (step === 5) {
        await apiAuth('/onboarding/complete', { method: 'POST' });
        finish();
        return;
      }
      setStep((s) => s + 1);
    } catch (e) {
      console.error(e);
      let message = 'Unknown error';
      if (e instanceof Error) {
        try {
          const parsed = JSON.parse(e.message) as { message?: string };
          message = parsed.message ?? e.message;
        } catch {
          message = e.message;
        }
      }
      if (step === 3) setIntegrationError(message);
      else alert(`Step failed: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className={`onboarding-overlay${closing ? ' closing' : ''}`}>
      <div className="onboard-box">
        <div className="ob-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, background: 'var(--ob-v)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: '#fff', flexShrink: 0 }}>›</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ob-v)' }}>WHAT&apos;S NEXT?</div>
              <div style={{ fontSize: 10, color: 'var(--ob-muted)' }}>Execution Intelligence Platform</div>
            </div>
          </div>
          <div className="ob-title">{STEPS[step - 1].title}</div>
          <div className="ob-sub">{STEPS[step - 1].sub}</div>
          <div className="ob-bar">
            {STEPS.map((_, i) => (
              <div key={i} className={`ob-dot${i + 1 < step ? ' done' : ''}${i + 1 === step ? ' active' : ''}`} />
            ))}
          </div>
        </div>

        <div className="ob-body">
          {step === 1 && (
            <>
              <div className="ob-label">Company name</div>
              <input className="ob-inp" placeholder="e.g. Acme SaaS, UAB" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
              <div className="ob-label" style={{ marginTop: 14 }}>Mission</div>
              <textarea className="ob-inp ob-ta" placeholder="What does your company exist to do?" value={company.mission} onChange={(e) => setCompany({ ...company, mission: e.target.value })} />
              <div className="ob-label" style={{ marginTop: 14 }}>Vision</div>
              <textarea className="ob-inp ob-ta" placeholder="Where are you going in 3-5 years?" value={company.vision} onChange={(e) => setCompany({ ...company, vision: e.target.value })} />
              <div className="ob-label" style={{ marginTop: 14 }}>Team size</div>
              <select className="ob-inp" value={company.teamSizeRange} onChange={(e) => setCompany({ ...company, teamSizeRange: e.target.value })}>
                {TEAM_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ fontSize: 11.5, color: 'var(--ob-muted)', marginBottom: 16 }}>
                Upload your strategy document — or enter up to 6 strategic directions manually.
              </div>
              <input ref={docInputRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadStrategyDoc(f); e.target.value = ''; }} />
              {docState === 'analysing' ? (
                <div className="ob-upload-area">
                  <div style={{ fontSize: 13, color: 'var(--ob-g)', fontWeight: 700 }}>✓ Analysing document…</div>
                </div>
              ) : docState === 'done' && docFileName ? (
                <div className="ob-file-added">✓ {docFileName} — strategy directions extracted</div>
              ) : (
                <div className="ob-upload-area" onClick={() => docInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && docInputRef.current?.click()}>
                  <div className="ob-upload-icon">📄</div>
                  <div className="ob-upload-t">Upload strategy document</div>
                  <div className="ob-upload-s">PDF, DOCX, TXT · AI extracts 5–6 strategic directions</div>
                </div>
              )}
              <div className="ob-or">or enter manually</div>
              <div className="ob-goals-list">
                {goals.map((g, i) => (
                  <div key={i} className="ob-goal-row">
                    <div className="ob-goal-num">{i + 1}</div>
                    <input
                      className="ob-goal-inp"
                      placeholder={i === 5 ? 'Optional 6th direction' : `e.g. Strategic direction ${i + 1}`}
                      value={g}
                      onChange={(e) => { const n = [...goals]; n[i] = e.target.value; setGoals(n); }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ fontSize: 11.5, color: 'var(--ob-muted)', marginBottom: 14 }}>
                Select your tools and paste API credentials. What&apos;s Next will import projects, tasks, and team members before you reach the dashboard.
              </div>
              <div className="ob-int-grid">
                {INTEGRATIONS.map((int) => {
                  const sel = providers.includes(int.id);
                  return (
                    <div key={int.id} className={`ob-int${sel ? ' sel' : ''}`} onClick={() => toggleProvider(int.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleProvider(int.id)}>
                      <div className="ob-int-ic" style={{ background: int.color }}>{int.letter}</div>
                      <div>
                        <div className="ob-int-n">{int.name}</div>
                        <div className="ob-int-d">{int.desc}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', color: sel ? 'var(--ob-v)' : 'var(--ob-border)', fontSize: 13 }}>{sel ? '✓' : '○'}</span>
                    </div>
                  );
                })}
              </div>
              {providers.length > 0 && (
                <div className="ob-cred-stack">
                  {providers.map((providerId) => {
                    const meta = INTEGRATIONS.find((i) => i.id === providerId);
                    const form = integrationForms[providerId] ?? defaultIntegrationForm(providerId);
                    return (
                      <div key={providerId} className="ob-cred-panel">
                        <div className="ob-cred-head">
                          <div className="ob-int-ic" style={{ background: meta?.color ?? '#6B7280', width: 28, height: 28, fontSize: 10 }}>{meta?.letter ?? '?'}</div>
                          <span>{meta?.name ?? providerId} credentials</span>
                        </div>
                        {INTEGRATION_HELP[providerId] && (
                          <p className="ob-cred-help">{INTEGRATION_HELP[providerId]}</p>
                        )}
                        <div className="ob-label">API URL</div>
                        <input
                          className="ob-inp"
                          value={form.apiUrl}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setIntegrationForm(providerId, { apiUrl: e.target.value })}
                          placeholder={meta?.defaultUrl}
                        />
                        <div className="ob-label" style={{ marginTop: 10 }}>API token</div>
                        <input
                          type="password"
                          className="ob-inp"
                          value={form.apiToken}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setIntegrationForm(providerId, { apiToken: e.target.value })}
                          placeholder={providerId === 'clickup' ? 'pk_…' : 'Paste API token'}
                        />
                        {providerId === 'clickup' ? (
                          <>
                            <button type="button" className="ob-cred-btn" onClick={discoverClickUp}>
                              Find workspaces
                            </button>
                            {clickupTeams.length > 0 ? (
                              <>
                                <div className="ob-label" style={{ marginTop: 10 }}>Workspace</div>
                                <select
                                  className="ob-inp"
                                  value={form.workspaceId}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const team = clickupTeams.find((t) => t.id === e.target.value);
                                    setIntegrationForm('clickup', {
                                      workspaceId: e.target.value,
                                      workspaceName: team?.name ?? '',
                                    });
                                  }}
                                >
                                  <option value="">Select workspace…</option>
                                  {clickupTeams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.memberCount} members)</option>
                                  ))}
                                </select>
                              </>
                            ) : (
                              <>
                                <div className="ob-label" style={{ marginTop: 10 }}>Workspace ID</div>
                                <input
                                  className="ob-inp"
                                  value={form.workspaceId}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setIntegrationForm(providerId, { workspaceId: e.target.value })}
                                  placeholder="From app.clickup.com/TEAM_ID/…"
                                />
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="ob-label" style={{ marginTop: 10 }}>Workspace / site ID</div>
                            <input
                              className="ob-inp"
                              value={form.workspaceId}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setIntegrationForm(providerId, { workspaceId: e.target.value })}
                              placeholder="Workspace, site URL, or team ID"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {integrationError && (
                <div className="ob-cred-error">{integrationError}</div>
              )}
              <div style={{ marginTop: 12, padding: '10px 13px', background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.15)', borderRadius: 9, fontSize: 10.5, color: 'var(--ob-muted)' }}>
                <strong style={{ color: 'var(--ob-text)' }}>ClickUp</strong> imports live data now. Other tools save credentials and sync when their connectors are enabled.
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div style={{ fontSize: 11.5, color: 'var(--ob-muted)', marginBottom: 14 }}>
                Confirming what What&apos;s Next has found. Review and approve.
              </div>
              {importLoading && <div style={{ fontSize: 12, color: 'var(--ob-muted)' }}>Loading import summary…</div>}
              {importResult && (
                <>
                  <div className="ob-imp-list">
                    {importResult.integrations.map((int) => {
                      const meta = PROVIDER_META[int.provider] ?? { letter: '?', color: '#6B7280', label: int.provider };
                      return (
                        <div key={int.provider} className="ob-imp-row">
                          <div className="ob-imp-ic" style={{ background: meta.color }}>{meta.letter}</div>
                          <span style={{ flex: 1 }}>
                            <strong>{meta.label}</strong>
                            {' — '}
                            {int.employeeCount ? `${int.employeeCount} members, ` : ''}
                            {int.projectCount} projects, {int.taskCount} tasks imported
                          </span>
                          <span style={{ color: int.status === 'ready' ? 'var(--ob-g)' : 'var(--ob-gold)', fontWeight: 700, fontSize: 11 }}>
                            {int.status === 'ready' ? '✓ Ready' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                    {importResult.unlinkedProjects > 0 && (
                      <div className="ob-imp-row" style={{ background: 'rgba(220,38,38,.05)' }}>
                        <div className="ob-imp-ic" style={{ background: '#DC2626' }}>!</div>
                        <span style={{ flex: 1 }}>
                          <strong>{importResult.unlinkedProjects} projects</strong> have no strategic direction assigned —{' '}
                          <span style={{ color: 'var(--ob-r)', fontWeight: 600 }}>action required</span>
                        </span>
                        <span style={{ color: 'var(--ob-r)', fontWeight: 700, fontSize: 11 }}>Fix →</span>
                      </div>
                    )}
                    {importResult.departmentsWithoutCoverage > 0 && (
                      <div className="ob-imp-row" style={{ background: 'rgba(217,119,6,.05)' }}>
                        <div className="ob-imp-ic" style={{ background: '#D97706' }}>!</div>
                        <span style={{ flex: 1 }}>
                          <strong>{importResult.departmentsWithoutCoverage} departments</strong> have no strategic direction set for any project
                        </span>
                        <span style={{ color: 'var(--ob-gold)', fontWeight: 700, fontSize: 11 }}>Review →</span>
                      </div>
                    )}
                    <div className="ob-imp-row">
                      <div className="ob-imp-ic" style={{ background: '#16A34A' }}>✓</div>
                      <span style={{ flex: 1 }}>
                        <strong>Strategy alignment score</strong> calculated — {importResult.taskLinkagePct}% of tasks linked to goals
                      </span>
                      <span style={{ color: 'var(--ob-g)', fontWeight: 700, fontSize: 11 }}>✓ Live</span>
                    </div>
                  </div>
                  {importResult.unlinkedCapacityPct > 0 && (
                    <div style={{ marginTop: 12, padding: '11px 13px', background: 'var(--ob-v3)', border: '1px solid var(--ob-v2)', borderRadius: 9, fontSize: 11, color: 'var(--ob-text)' }}>
                      What&apos;s Next found <strong>{importResult.unlinkedCapacityPct}% of your team capacity</strong> has no connection to any strategic goal. You will see this immediately on your dashboard.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <div style={{ fontSize: 11.5, color: 'var(--ob-muted)', marginBottom: 14 }}>
                Team members imported from your connected tools appear below — demo sample users are hidden when a real integration is connected. Upload CVs to extract skills automatically.
              </div>
              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  const id = cvTargetRef.current;
                  if (f && id) uploadCv(id, f);
                  e.target.value = '';
                }}
              />
              <div className="ob-people-list">
                {employees.map((p) => {
                  const hasCv = !!p.cvDocument;
                  const initials = p.initials ?? p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={p.id} className="ob-person">
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.avatarColor ?? '#6B7280', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ob-text)' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--ob-muted)' }}>{p.title ?? 'Team member'}{p.department ? ` · ${p.department.name}` : ''}</div>
                      </div>
                      <button
                        type="button"
                        className={`cv-upload-btn${hasCv ? ' uploaded' : ''}`}
                        disabled={uploadingId === p.id}
                        onClick={() => {
                          if (hasCv) return;
                          cvTargetRef.current = p.id;
                          cvInputRef.current?.click();
                        }}
                      >
                        {uploadingId === p.id ? 'Uploading…' : hasCv ? '✓ CV uploaded' : 'Upload CV'}
                      </button>
                    </div>
                  );
                })}
                {employees.length === 0 && employeesLoading && (
                  <div style={{ fontSize: 12, color: 'var(--ob-muted)', padding: 12 }}>Loading team members…</div>
                )}
                {employees.length === 0 && !employeesLoading && (
                  <div style={{ fontSize: 12, color: 'var(--ob-muted)', padding: 12, lineHeight: 1.5 }}>
                    No team members were imported yet. Go back to Connect tools and verify your ClickUp API token and workspace, or sync again from Settings after onboarding.
                  </div>
                )}
              </div>
              <div style={{ marginTop: 12, padding: '11px 13px', background: 'var(--ob-bg3)', border: '1px solid var(--ob-border)', borderRadius: 9, fontSize: 10.5, color: 'var(--ob-muted)' }}>
                Skills are scraped from uploaded CVs and displayed next to each person&apos;s profile. Batch upload available after setup.
              </div>
            </>
          )}
        </div>

        <div className="ob-foot">
          <div className="ob-prog">Step {step} of 5</div>
          <div className="ob-navs">
            {step > 1 && (
              <button type="button" className="ob-btn-back" onClick={back} disabled={busy}>Back</button>
            )}
            <button type="button" className="ob-btn-next" onClick={next} disabled={busy || (step === 4 && importLoading)}>
              {busy ? (step === 3 ? 'Connecting & importing…' : 'Please wait…') : step === 5 ? "Launch What's Next →" : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
