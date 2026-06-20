'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { OnboardingWizard, type OnboardingInitialData } from '@/components/onboarding/onboarding-wizard';
import { notifyGoalsUpdated } from '@/lib/goals-events';
import { apiAuth } from '@/lib/api';

interface OnboardingStatus extends OnboardingInitialData {
  showOnboarding: boolean;
  isDemoTenant: boolean;
}

function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialCompany, setInitialCompany] = useState<OnboardingInitialData | undefined>();

  useEffect(() => {
    if (!loading && !token) router.replace('/');
  }, [token, loading, router]);

  useEffect(() => {
    if (token) {
      apiAuth<OnboardingStatus>('/companies/current/onboarding-status')
        .then((s) => {
          setInitialCompany({
            name: s.name,
            mission: s.mission,
            vision: s.vision,
            teamSizeRange: s.teamSizeRange,
          });
          if (s.showOnboarding) setShowOnboarding(true);
        })
        .catch(() => {});
    }
  }, [token]);

  if (loading || !token) return <div className="h-screen flex items-center justify-center">Loading…</div>;
  return (
    <>
      {showOnboarding && (
        <OnboardingWizard
          initialCompany={initialCompany}
          onComplete={() => {
            notifyGoalsUpdated();
            setShowOnboarding(false);
          }}
        />
      )}
      <AppShell>{children}</AppShell>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardGate>{children}</DashboardGate>
    </AuthProvider>
  );
}
