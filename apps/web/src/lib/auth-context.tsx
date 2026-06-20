import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiAuth, getToken, setToken, clearToken } from '@/lib/api';
import { DEMO_EMAIL } from '@/lib/demo-credentials';

export type UiRole = 'ceo' | 'hr' | 'lead' | 'emp';

interface AuthState {
  token: string | null;
  user: { email: string; companyId: string; roles: string[] } | null;
  uiRole: UiRole;
  setUiRole: (r: UiRole) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void | Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(null);
  const [user, setUser] = useState<AuthState['user']>(null);
  const [uiRole, setUiRole] = useState<UiRole>('ceo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (t) {
      setTok(t);
      apiAuth<{ email: string; companyId: string; userRoles: { role: { name: string } }[] }>('/auth/me')
        .then((me) => {
          setUser({
            email: me.email,
            companyId: me.companyId,
            roles: me.userRoles?.map((ur) => ur.role.name) ?? [],
          });
        })
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setToken(data.accessToken);
    setTok(data.accessToken);
    setUser(data.user);
    if (data.user?.email?.toLowerCase() === DEMO_EMAIL) {
      try {
        await apiAuth('/onboarding/reset-demo-session', { method: 'POST' });
      } catch {
        // ignore — demo reset is best-effort
      }
    }
  };

  const logout = async () => {
    const t = getToken();
    if (t) {
      try {
        await apiAuth('/onboarding/reset-demo-session', { method: 'POST' });
      } catch {
        // ignore — only demo tenant resets
      }
    }
    clearToken();
    setTok(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, uiRole, setUiRole, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
