'use client';

import { useState } from 'react';
import { IntegrationSettings } from '@/components/settings/integration-settings';

type Tab = 'integrations' | 'sso';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('integrations');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-extrabold">Tenant Settings</h2>
        <p className="text-[10.5px] text-[var(--muted)]">Platform integrations · SSO (admin only)</p>
      </div>

      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        {(
          [
            ['integrations', 'Integrations'],
            ['sso', 'SSO & Security'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
              tab === id ? 'bg-[var(--v)] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'integrations' && <IntegrationSettings />}

      {tab === 'sso' && (
        <div className="wn-card p-5 max-w-2xl space-y-3">
          <h3 className="font-bold text-sm">Single Sign-On</h3>
          <p className="text-xs text-[var(--muted)]">Google Workspace and Microsoft Entra ID — configure in onboarding or contact support.</p>
          <div className="flex gap-2">
            <span className="tag-strategic text-[10px]">Google SSO — enabled</span>
            <span className="tag-strategic text-[10px]">Microsoft SSO — enabled</span>
          </div>
        </div>
      )}
    </div>
  );
}
