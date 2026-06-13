'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('elena@technova.lt');
  const [password, setPassword] = useState('demo12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.accessToken);
      router.push('/dashboard');
    } catch {
      setError('Login failed. Run seed first: npm run db:seed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <form onSubmit={handleLogin} className="wn-card p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[var(--v)] rounded-lg flex items-center justify-center text-white font-black text-xl">›</div>
          <div>
            <h1 className="text-lg font-bold">WHAT&apos;S NEXT?</h1>
            <p className="text-xs text-[var(--muted)]">Strategy Execution Intelligence</p>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <label className="block text-xs font-semibold mb-1">Email</label>
        <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 mb-4 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block text-xs font-semibold mb-1">Password</label>
        <input type="password" className="w-full border border-[var(--border)] rounded-lg px-3 py-2 mb-6 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} className="wn-btn-primary w-full justify-center py-2.5">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-[10px] text-[var(--muted)] mt-4 text-center">Demo: elena@technova.lt / demo12345</p>
      </form>
    </div>
  );
}
