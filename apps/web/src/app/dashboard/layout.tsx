'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { apiAuth } from '@/lib/api';

function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.replace('/');
  }, [token, loading, router]);

  useEffect(() => {
    if (token) {
      apiAuth<{ onboardingCompletedAt: string | null }>('/companies/current/onboarding-status')
        .then((s) => { if (!s.onboardingCompletedAt) setShowOnboarding(true); })
        .catch(() => {});
    }
  }, [token]);

  if (loading || !token) return <div className="h-screen flex items-center justify-center">Loading…</div>;
  return (
    <>
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
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
