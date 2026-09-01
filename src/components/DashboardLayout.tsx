import { useEffect, useState, type ReactNode } from 'react';
import {
  Send,
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  TrendingUp,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn, getInitials } from '@/lib/utils';
import { AVATAR_COLORS } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

interface NavItem {
  name: string;
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'transactions', label: 'Transactions', icon: ArrowLeftRight, path: '/transactions' },
  { name: 'recipients', label: 'Recipients', icon: Users, path: '/recipients' },
  { name: 'rates', label: 'Exchange Rates', icon: TrendingUp, path: '/rates' },
  { name: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  { name: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export function DashboardLayout({ children, currentRoute, activeTransfers = 0 }: { children: ReactNode; currentRoute: string; activeTransfers?: number }) {
  const { path, navigate } = useRouter();
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    };
    loadUnread();
    const channel = supabase
      .channel('notifications-unread')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        loadUnread
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast('Signed out successfully', 'info');
  };

  const activeItem =
    NAV_ITEMS.find((item) => currentRoute === item.name || currentRoute.startsWith(item.name + '-')) ??
    NAV_ITEMS[0];

  const handleNav = (itemPath: string) => {
    navigate(itemPath);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm shadow-brand-600/30">
              <Send className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">RemitLet</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const isActive = path === item.path || path.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.name === 'notifications' && unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-semibold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User card */}
        <div className="px-3 py-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0',
                AVATAR_COLORS[profile?.avatar_color ?? 'teal'] ?? 'bg-brand-500'
              )}
            >
              {getInitials(profile?.display_name ?? 'User')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile?.display_name ?? 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">Personal account</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg p-1.5 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-600 hover:bg-slate-100 rounded-lg p-1.5"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-slate-900">{activeItem.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-56">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transfers..."
                  className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      navigate(`/transactions?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="relative text-slate-600 hover:bg-slate-100 rounded-xl p-2 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>
              {activeTransfers > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-sky-50 text-sky-700 rounded-xl px-3 py-2 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  {activeTransfers} processing
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
