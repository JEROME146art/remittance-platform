import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface RouterContextValue {
  path: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

function getPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const handler = () => setPath(getPath());
    window.addEventListener('hashchange', handler);
    if (!window.location.hash) {
      window.location.hash = '/';
    }
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (to: string) => {
    window.location.hash = to;
  };

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function matchRoute(path: string): { name: string; params: Record<string, string> } {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return { name: 'dashboard', params: {} };
  if (segments[0] === 'transactions') {
    if (segments.length === 1) return { name: 'transactions', params: {} };
    if (segments[1] === 'new') return { name: 'transaction-new', params: {} };
    if (segments[1] === 'edit' && segments[2])
      return { name: 'transaction-edit', params: { id: segments[2] } };
    if (segments[1]) return { name: 'transaction-detail', params: { id: segments[1] } };
  }
  if (segments[0] === 'recipients') {
    if (segments.length === 1) return { name: 'recipients', params: {} };
    if (segments[1] === 'new') return { name: 'recipient-new', params: {} };
    if (segments[1] === 'edit' && segments[2])
      return { name: 'recipient-edit', params: { id: segments[2] } };
  }
  if (segments[0] === 'rates') return { name: 'rates', params: {} };
  if (segments[0] === 'notifications') return { name: 'notifications', params: {} };
  if (segments[0] === 'settings') return { name: 'settings', params: {} };
  return { name: 'dashboard', params: {} };
}
