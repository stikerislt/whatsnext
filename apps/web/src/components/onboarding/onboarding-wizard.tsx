'use client';

import { useState } from 'react';
import { apiAuth } from '@/lib/api';
import { useRouter } from 'next/navigation';

const STEPS = [
  { title: "Welcome. Let's set up your workspace.", sub: 'This takes 4 minutes.' },
  { title: 'What are your strategic directions?', sub: 'Upload a document or enter up to 6 goals.' },
  { title: 'Connect your tools.', sub: "What's Next connects your existing tools." },
  { title: 'Confirm your import.', sub: 'Review what was imported.' },
  { title: 'Set up your talent database.', sub: 'Upload CVs to extract skills.' },
];

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState({ name: 'TechNova, UAB', mission: '', vision: '', teamSizeRange: '30-100 people' });
  const [goals, setGoals] = useState(['Expand into EU market', 'Achieve product-led growth', 'Cut customer acquisition cost 30%', 'Platform scalability 10x', 'Build data-driven culture', '']);
  const [providers, setProviders] = useState(['jira', 'clickup']);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);

  const toggleProvider = (p: string) => {
    setProviders((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const next = async () => {
    if (step === 2) {
      await apiAuth('/onboarding/goals', {
        method: 'PUT',
        body: JSON.stringify({ goals: goals.filter(Boolean).map((title) => ({ title })) }),
      });
    }
    if (step === 3) {
      await apiAuth('/onboarding/integrations', { method: 'POST', body: JSON.stringify({ providers }) });
    }
    if (step === 4) {
      const res = await apiAuth<Record<string, unknown>>('/onboarding/confirm-import', { method: 'POST' });
      setImportResult(res);
    }
    if (step === 5) {
      await apiAuth('/onboarding/complete', { method: 'POST' });
      onComplete();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b">
          <div className="flex gap-2 mb-4">{STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-[var(--v)]' : 'bg-gray-200'}`} />
          ))}</div>
          <h2 className="text-lg font-bold">{STEPS[step - 1].title}</h2>
          <p className="text-xs text-gray-500">{STEPS[step - 1].sub}</p>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-3">
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Company name" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Mission" rows={2} value={company.mission} onChange={(e) => setCompany({ ...company, mission: e.target.value })} />
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Vision" rows={2} value={company.vision} onChange={(e) => setCompany({ ...company, vision: e.target.value })} />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <div className="border-2 border-dashed rounded-xl p-6 text-center text-sm text-gray-500 mb-4">Upload strategy document (PDF, PPT, DOC)</div>
              {goals.map((g, i) => (
                <input key={i} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={`Goal ${i + 1}`} value={g} onChange={(e) => { const n = [...goals]; n[i] = e.target.value; setGoals(n); }} />
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              {['jira', 'clickup', 'slack', 'hibob', 'teams', 'notion'].map((p) => (
                <button key={p} onClick={() => toggleProvider(p)} className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left text-sm ${providers.includes(p) ? 'border-[var(--v)] bg-orange-50' : ''}`}>
                  <span className="capitalize font-medium">{p}</span>
                  {providers.includes(p) && <span className="ml-auto text-[var(--v)]">✓</span>}
                </button>
              ))}
            </div>
          )}
          {step === 4 && importResult && (
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-green-50 rounded-lg">✓ {String(importResult.tasks)} tasks imported</div>
              <div className="p-3 bg-amber-50 rounded-lg">! {String(importResult.unlinkedProjects)} projects unlinked — action required</div>
              <div className="p-3 bg-green-50 rounded-lg">Strategy alignment: {String(importResult.taskLinkagePct)}% task linkage</div>
            </div>
          )}
          {step === 5 && <p className="text-sm text-gray-600">All team members are visible. Upload CVs after setup to extract skills automatically.</p>}
        </div>
        <div className="p-6 border-t flex justify-between">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="wn-btn-ghost">Back</button>
          <button onClick={next} className="wn-btn-primary">{step === 5 ? 'Finish setup' : 'Continue'}</button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingTrigger() {
  const [show, setShow] = useState(false);
  if (!show) return <button onClick={() => setShow(true)} className="wn-btn-ghost text-xs">Run onboarding</button>;
  return <OnboardingWizard onComplete={() => setShow(false)} />;
}
