import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowLeftRight,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useTransactions } from '@/hooks/useData';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonRow, EmptyState } from '@/components/ui/Feedback';
import { STATUS_CONFIG, CURRENCIES } from '@/lib/constants';
import { cn, formatAmount, formatDate, timeAgo, getInitials } from '@/lib/utils';
import { exportTransactionsCSV } from '@/lib/export';
import { TransactionRow } from './DashboardPage';
import type { Transaction, TransactionStatus } from '@/lib/types';

const FILTER_TABS: { key: TransactionStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

export function TransactionsListPage() {
  const { navigate, path } = useRouter();
  const { toast } = useToast();
  const { transactions, loading } = useTransactions();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<TransactionStatus | 'all'>('all');

  // Read query param for initial search
  useMemo(() => {
    const qIndex = path.indexOf('?q=');
    if (qIndex >= 0) {
      setSearch(decodeURIComponent(path.slice(qIndex + 3)));
    }
  }, [path]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (activeFilter !== 'all' && t.status !== activeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const recipientName = t.recipient?.full_name ?? '';
        return (
          t.reference.toLowerCase().includes(q) ||
          recipientName.toLowerCase().includes(q) ||
          t.destination_currency.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, activeFilter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: transactions.length };
    transactions.forEach((t) => {
      map[t.status] = (map[t.status] ?? 0) + 1;
    });
    return map;
  }, [transactions]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Transactions</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {transactions.length} total transfers · {counts.completed ?? 0} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              if (filtered.length === 0) {
                toast('No transactions to export', 'info');
                return;
              }
              exportTransactionsCSV(filtered);
              toast(`Exported ${filtered.length} transactions to CSV`, 'success');
            }}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button onClick={() => navigate('/transactions/new')}>
            <Plus className="w-4 h-4" />
            New Transfer
          </Button>
        </div>
      </div>

      {/* Search + filter tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reference, recipient, or currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              activeFilter === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            )}
          >
            {tab.label}
            {counts[tab.key] !== undefined && (
              <span
                className={cn(
                  'text-xs px-1.5 rounded-full',
                  activeFilter === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                )}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        {loading ? (
          <div className="px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="w-7 h-7" />}
            title={search || activeFilter !== 'all' ? 'No matching transfers' : 'No transfers yet'}
            description={
              search || activeFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Start your first international transfer — it only takes a minute.'
            }
            action={
              !search && activeFilter === 'all' ? (
                <Button onClick={() => navigate('/transactions/new')} size="sm">
                  <Plus className="w-4 h-4" />
                  New Transfer
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                onClick={() => navigate(`/transactions/${t.id}`)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
