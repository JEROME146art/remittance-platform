import { useMemo } from 'react';
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  ArrowRight,
  Activity,
  PieChart,
  Sparkles,
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { useTransactions, useRecipients } from '@/hooks/useData';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonRow, EmptyState } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { STATUS_CONFIG, CURRENCIES, COUNTRIES } from '@/lib/constants';
import { cn, formatAmount, formatDate, timeAgo, getInitials } from '@/lib/utils';
import { computeCumulativeSavings, computeFXSavings } from '@/lib/tracking';
import { MoneyFlowBanner } from '@/components/MoneyFlowBanner';
import type { Transaction } from '@/lib/types';

export function DashboardPage() {
  const { navigate } = useRouter();
  const { profile } = useAuth();
  const { transactions, loading } = useTransactions();
  const { recipients, loading: recipientsLoading } = useRecipients();

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'completed');
    const inProgress = transactions.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress'
    );
    const totalSent = completed.reduce((sum, t) => sum + t.send_amount, 0);
    const totalFees = completed.reduce((sum, t) => sum + t.fee_amount, 0);
    const last30 = transactions.filter(
      (t) => new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const successRate =
      transactions.length > 0
        ? Math.round((completed.length / transactions.length) * 100)
        : 0;
    return {
      totalSent,
      totalFees,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      last30Count: last30.length,
      successRate,
    };
  }, [transactions]);

  const cumulativeSavings = useMemo(
    () => computeCumulativeSavings(transactions),
    [transactions]
  );

  const recentTransactions = transactions.slice(0, 5);

  // Volume by destination currency (mini bar chart)
  const volumeByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.status === 'completed') {
        map.set(t.destination_currency, (map.get(t.destination_currency) ?? 0) + t.send_amount);
      }
    });
    const arr = Array.from(map.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
    const max = Math.max(...arr.map((a) => a.amount), 1);
    return arr.map((a) => ({ ...a, pct: (a.amount / max) * 100 }));
  }, [transactions]);

  // Corridor breakdown (donut-style with percentage bars)
  const corridorBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; volume: number; failed: number }>();
    transactions.forEach((t) => {
      const key = `${t.source_currency}→${t.destination_currency}`;
      const existing = map.get(key) ?? { count: 0, volume: 0, failed: 0 };
      existing.count++;
      existing.volume += t.send_amount;
      if (t.status === 'failed') existing.failed++;
      map.set(key, existing);
    });
    const total = transactions.length;
    return Array.from(map.entries())
      .map(([corridor, data]) => ({ corridor, ...data, pct: total > 0 ? (data.count / total) * 100 : 0 }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [transactions]);

  // Last 7 days activity sparkline
  const activityData = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      const count = transactions.filter((t) => {
        const td = new Date(t.created_at);
        return (
          td.getDate() === date.getDate() &&
          td.getMonth() === date.getMonth() &&
          td.getFullYear() === date.getFullYear()
        );
      }).length;
      days.push({ label, count });
    }
    const max = Math.max(...days.map((d) => d.count), 1);
    return days.map((d) => ({ ...d, pct: (d.count / max) * 100 }));
  }, [transactions]);

  const CORRIDOR_COLORS = [
    'bg-brand-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
  ];

  const statCards = [
    {
      label: 'Total Sent',
      value: formatAmount(stats.totalSent, 'USD'),
      sub: `${stats.completedCount} completed transfers`,
      icon: ArrowUpRight,
      color: 'bg-brand-50 text-brand-600',
    },
    {
      label: 'In Progress',
      value: String(stats.inProgressCount),
      sub: 'Active transfers',
      icon: Clock,
      color: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Success Rate',
      value: `${stats.successRate}%`,
      sub: 'Completed vs total',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Total Fees',
      value: formatAmount(stats.totalFees, 'USD'),
      sub: 'Across all transfers',
      icon: TrendingUp,
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Welcome back, {profile?.display_name?.split(' ')[0] ?? 'there'}
          </h2>
        </div>
        <Button onClick={() => navigate('/transactions/new')} size="lg">
          <Plus className="w-4 h-4" />
          New Transfer
        </Button>
      </div>

      {/* Live Money Flow */}
      <MoneyFlowBanner />

      {/* FX Savings Hero Banner */}
      {!loading && cumulativeSavings > 0 && (
        <Card className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-sky-50 ring-emerald-200/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-700">FX Savings Ledger</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                You've saved {formatAmount(cumulativeSavings, 'USD')} in hidden fees
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                vs. traditional SWIFT bank transfers (Wells Fargo, HSBC — typical 3.5% markup)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32 mt-3" />
                <Skeleton className="h-3 w-24 mt-2" />
              </Card>
            ))
          : statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-5" hover>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                        {stat.value}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                    </div>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Volume by currency */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Volume by Destination"
            subtitle="Completed transfers grouped by currency"
          />
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : volumeByCurrency.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="w-7 h-7" />}
                title="No completed transfers yet"
                description="Your transfer volume by currency will appear here once you have completed transfers."
              />
            ) : (
              <div className="space-y-3.5">
                {volumeByCurrency.map((v) => {
                  const meta = CURRENCIES[v.currency];
                  return (
                    <div key={v.currency} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-28 flex-shrink-0">
                        <span className="text-lg">{meta?.flag ?? '🌐'}</span>
                        <span className="text-sm font-medium text-slate-700">{v.currency}</span>
                      </div>
                      <div className="flex-1 h-8 bg-slate-50 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2"
                          style={{ width: `${v.pct}%` }}
                        >
                          <span className="text-xs font-semibold text-white whitespace-nowrap">
                            {formatAmount(v.amount, 'USD')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Activity last 7 days */}
        <Card>
          <CardHeader title="This Week" subtitle="Transfers in the last 7 days" />
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {activityData.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400 w-8">{d.label}</span>
                    <div className="flex-1 h-6 bg-slate-50 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-md transition-all duration-700 ease-out"
                        style={{ width: `${Math.max(d.pct, d.count > 0 ? 12 : 0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-4 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Corridor Breakdown */}
      <Card>
        <CardHeader
          title="Corridor Breakdown"
          subtitle="Multi-currency distribution and routing health"
          action={<PieChart className="w-5 h-5 text-slate-400" />}
        />
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : corridorBreakdown.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-7 h-7" />}
              title="No corridor data yet"
              description="Your currency corridor breakdown will appear here once you start making transfers."
            />
          ) : (
            <div className="space-y-3">
              {corridorBreakdown.map((c, i) => (
                <div key={c.corridor} className="flex items-center gap-4">
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', CORRIDOR_COLORS[i % CORRIDOR_COLORS.length])} />
                  <div className="w-28 flex-shrink-0">
                    <span className="text-sm font-medium text-slate-700">{c.corridor}</span>
                  </div>
                  <div className="flex-1 h-7 bg-slate-50 rounded-lg overflow-hidden">
                    <div
                      className={cn('h-full rounded-lg transition-all duration-700 ease-out', CORRIDOR_COLORS[i % CORRIDOR_COLORS.length])}
                      style={{ width: `${Math.max(c.pct, 8)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                    <span className="text-slate-600 tabular-nums">{c.count} tx</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatAmount(c.volume, 'USD')}</span>
                    {c.failed > 0 ? (
                      <Badge className="bg-rose-50 text-rose-700 ring-rose-600/20" dot="bg-rose-500">
                        {c.failed} failed
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20" dot="bg-emerald-500">
                        100%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Recent + recipients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Transfers"
            subtitle="Your latest activity"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <div className="px-2 py-2">
            {loading ? (
              <div className="px-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                icon={<Activity className="w-7 h-7" />}
                title="No transfers yet"
                description="Start your first international transfer to see it here."
                action={
                  <Button onClick={() => navigate('/transactions/new')} size="sm">
                    <Plus className="w-4 h-4" />
                    New Transfer
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-50">
                {recentTransactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} onClick={() => navigate(`/transactions/${t.id}`)} />
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recipients preview */}
        <Card>
          <CardHeader
            title="Recipients"
            subtitle="Your saved contacts"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/recipients')}>
                All
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <div className="px-2 py-2">
            {recipientsLoading ? (
              <div className="px-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : recipients.length === 0 ? (
              <EmptyState
                icon={<Users className="w-7 h-7" />}
                title="No recipients yet"
                description="Add a recipient to start sending them money."
                action={
                  <Button onClick={() => navigate('/recipients/new')} size="sm">
                    <Plus className="w-4 h-4" />
                    Add Recipient
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-50">
                {recipients.slice(0, 4).map((r) => {
                  const country = COUNTRIES[r.country];
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate('/recipients')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500 flex-shrink-0">
                        {getInitials(r.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{r.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {country?.currency ? `${country.currency}` : r.currency_code} · {r.country}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function TransactionRow({
  transaction,
  onClick,
}: {
  transaction: Transaction;
  onClick?: () => void;
}) {
  const status = STATUS_CONFIG[transaction.status];
  const StatusIcon = status.icon;
  const recipient = transaction.recipient;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left group"
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          status.color
        )}
      >
        <StatusIcon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">
            {recipient?.full_name ?? 'Unknown recipient'}
          </p>
        </div>
        <p className="text-xs text-slate-400 truncate">
          {transaction.reference} · {timeAgo(transaction.created_at)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-slate-900">
          {formatAmount(transaction.send_amount, transaction.source_currency)}
        </p>
        <Badge className={cn('mt-1', status.color)} dot={status.dot}>
          {status.label}
        </Badge>
      </div>
    </button>
  );
}
