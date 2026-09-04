import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RouterProvider, useRouter, matchRoute } from '@/context/RouterContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { TransactionsListPage } from '@/pages/TransactionsListPage';
import { TransactionNewPage } from '@/pages/TransactionNewPage';
import { TransactionDetailPage } from '@/pages/TransactionDetailPage';
import { TransactionEditPage } from '@/pages/TransactionEditPage';
import {
  RecipientsListPage,
  RecipientNewPage,
  RecipientEditPage,
} from '@/pages/RecipientsPages';
import { RatesPage } from '@/pages/RatesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LandingPage } from '@/pages/LandingPage';
import { useAutoProgress } from '@/hooks/useAutoProgress';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { path } = useRouter();
  const { activeCount } = useAutoProgress(!!user && !loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const route = matchRoute(path);
    if (route.name === 'landing') {
      return <LandingPage />;
    }
    return <AuthPage />;
  }

  const route = matchRoute(path);

  const renderPage = () => {
    switch (route.name) {
      case 'dashboard':
        return <DashboardPage />;
      case 'transactions':
        return <TransactionsListPage />;
      case 'transaction-new':
        return <TransactionNewPage />;
      case 'transaction-detail':
        return <TransactionDetailPage id={route.params.id} />;
      case 'transaction-edit':
        return <TransactionEditPage id={route.params.id} />;
      case 'recipients':
        return <RecipientsListPage />;
      case 'recipient-new':
        return <RecipientNewPage />;
      case 'recipient-edit':
        return <RecipientEditPage id={route.params.id} />;
      case 'rates':
        return <RatesPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'landing':
        return <LandingPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <DashboardLayout currentRoute={route.name} activeTransfers={activeCount}>{renderPage()}</DashboardLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider>
          <AppRoutes />
        </RouterProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
