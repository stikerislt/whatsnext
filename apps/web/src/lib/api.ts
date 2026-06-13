const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function api<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (options?.token) headers.Authorization = `Bearer ${options.token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers, cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wn_token');
}

export function setToken(token: string) {
  localStorage.setItem('wn_token', token);
}

export function clearToken() {
  localStorage.removeItem('wn_token');
}

export async function apiAuth<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  return api<T>(path, { ...options, token });
}
