import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Ban,
  RefreshCw,
  CheckCircle2,
  Copy,
  MapPin,
  Building,
  Wallet,
  ArrowRight,
  Calendar,
  FileText,
  Activity,
  AlertTriangle,
  Zap,
  X,
  TrendingDown,
  Download,
} from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, EmptyState } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusTracker } from '@/components/StatusTracker';
import { useToast } from '@/components/ui/Toast';
import {
  STATUS_CONFIG,
  PAYMENT_METHODS,
  PURPOSES,
  CURRENCIES,
} from '@/lib/constants';
import { cn, formatAmount, formatDateTime, formatDate, getInitials } from '@/lib/utils';
import {
  getCorridorHealth,
  CORRIDOR_HEALTH_CONFIG,
  getDelayMitigation,
  getDelayFactors,
  computeFXSavings,
  formatDuration,
} from '@/lib/tracking';
import { downloadReceipt } from '@/lib/receipt';
import type { Transaction, StatusHistoryEntry, TransactionStage, TransactionStatus } from '@/lib/types';

export function TransactionDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showMitigation, setShowMitigation] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*, recipient:recipients(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      toast(error.message, 'error');
    } else {
      setTransaction(data as Transaction);
    }
    setLoading(false);
  }, [id, toast]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`transaction-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `id=eq.${id}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  const canCancel =
    transaction && (transaction.status === 'pending' || transaction.status === 'in_progress');
  const canAdvance =
    transaction &&
    (transaction.status === 'pending' || transaction.status === 'in_progress') &&
    transaction.stage !== 'returned';

  const handleAdvance = async () => {
    if (!transaction) return;
    setAdvancing(true);
    const stages: TransactionStage[] = ['initiated', 'verified', 'processing', 'settled', 'available'];
    const currentIdx = stages.indexOf(transaction.stage);
    const nextStage = stages[Math.min(currentIdx + 1, stages.length - 1)];
    const now = new Date().toISOString();
    const labelMap: Record<TransactionStage, string> = {
      initiated: 'Transfer initiated',
      verified: 'Payment verified',
      processing: 'Funds in transit',
      settled: 'Sent to partner bank',
      available: 'Available to recipient',
      returned: 'Returned',
    };
    const newHistory: StatusHistoryEntry[] = [
      ...transaction.status_history,
      { stage: nextStage, timestamp: now, label: labelMap[nextStage] },
    ];
    const newStatus: TransactionStatus = nextStage === 'available' ? 'completed' : 'in_progress';
    const update: Record<string, unknown> = {
      stage: nextStage,
      status: newStatus,
      status_history: newHistory,
      updated_at: now,
    };
    if (nextStage === 'available') {
      update.completed_at = now;
    }

    const { error } = await supabase.from('transactions').update(update).eq('id', transaction.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      await supabase.from('notifications').insert({
        transaction_id: transaction.id,
        type: newStatus === 'completed' ? 'payment_sent' : 'status_update',
        title: newStatus === 'completed' ? 'Transfer completed' : labelMap[nextStage],
        body: `Your transfer ${transaction.reference} status updated to ${labelMap[nextStage]}.`,
      });
      toast(`Status updated to ${labelMap[nextStage]}`, 'success');
      load();
    }
    setAdvancing(false);
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setActionLoading(true);
    const { error } = await supabase.from('transactions').delete().eq('id', transaction.id);
    if (error) {
      toast(error.message, 'error');
      setActionLoading(false);
      return;
    }
    toast('Transfer deleted', 'success');
    navigate('/transactions');
  };

  const handleCancel = async () => {
    if (!transaction) return;
    setActionLoading(true);
    const now = new Date().toISOString();
    const newHistory: StatusHistoryEntry[] = [
      ...transaction.status_history,
      { stage: 'returned', timestamp: now, label: 'Cancelled by sender' },
    ];
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        stage: 'returned',
        status_history: newHistory,
        updated_at: now,
      })
      .eq('id', transaction.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      await supabase.from('notifications').insert({
        transaction_id: transaction.id,
        type: 'refunded',
        title: 'Transfer cancelled',
        body: `Your transfer ${transaction.reference} was cancelled.`,
      });
      toast('Transfer cancelled', 'info');
      load();
    }
    setActionLoading(false);
    setShowCancel(false);
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in max-w-4xl mx-auto">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <Card>
        <EmptyState
          icon={<ArrowLeft className="w-7 h-7" />}
          title="Transfer not found"
          description="This transfer may have been deleted."
          action={<Button onClick={() => navigate('/transactions')} size="sm">Back to transfers</Button>}
        />
      </Card>
    );
  }

  const status = STATUS_CONFIG[transaction.status];
  const StatusIcon = status.icon;
  const recipient = transaction.recipient;
  const destMeta = CURRENCIES[transaction.destination_currency];
  const srcMeta = CURRENCIES[transaction.source_currency];
  const corridor = getCorridorHealth(transaction.source_currency, transaction.destination_currency);
  const corridorConfig = CORRIDOR_HEALTH_CONFIG[corridor.health];
  const mitigation = getDelayMitigation(transaction.source_currency, transaction.destination_currency, recipient?.country ?? '');
  const delayFactors = getDelayFactors(recipient?.country ?? '');
  const fxSavings = computeFXSavings(transaction.send_amount, transaction.fee_amount);
  const isInProgress = transaction.status === 'pending' || transaction.status === 'in_progress';

  const copyRef = () => {
    navigator.clipboard.writeText(transaction.reference);
    toast('Reference copied', 'info');
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button variant="outline" size="sm" onClick={() => setShowCancel(true)}>
              <Ban className="w-4 h-4" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/transactions/edit/${transaction.id}`)}>
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadReceipt(transaction)}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Receipt</span>
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className={cn('px-6 py-5', status.color.replace('ring-', 'border-b border-').split(' ')[0])}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', status.color)}>
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{transaction.reference}</h2>
                  <button
                    onClick={copyRef}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Created {formatDate(transaction.created_at)}
                </p>
              </div>
            </div>
            <Badge className={status.color} dot={status.dot}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Amount summary */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
            <div className="text-center">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">You send</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {formatAmount(transaction.send_amount, transaction.source_currency)}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">{srcMeta?.name}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-brand-600" />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                1 = {transaction.exchange_rate.toFixed(4)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">They receive</p>
              <p className="text-2xl font-bold text-brand-600 mt-1">
                {formatAmount(transaction.receive_amount, transaction.destination_currency)}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">{destMeta?.name}</p>
            </div>
          </div>

          {/* FX Savings badge */}
          {transaction.status === 'completed' && fxSavings > 0 && (
            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl py-2.5 px-4">
              <TrendingDown className="w-4 h-4" />
              <span>You saved <span className="font-semibold">{formatAmount(fxSavings, transaction.source_currency)}</span> vs. traditional bank SWIFT fees</span>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Fee</p>
              <p className="font-medium text-slate-700 mt-0.5">
                {formatAmount(transaction.fee_amount, transaction.source_currency)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Rate</p>
              <p className="font-medium text-slate-700 mt-0.5">{transaction.exchange_rate.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-slate-400">Est. delivery</p>
              <p className="font-medium text-slate-700 mt-0.5">{formatDate(transaction.expected_delivery)}</p>
            </div>
            <div>
              <p className="text-slate-400">Completed</p>
              <p className="font-medium text-slate-700 mt-0.5">{formatDate(transaction.completed_at)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Corridor Health Banner */}
      {isInProgress && (
        <div className={cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-inset',
          corridorConfig.color
        )}>
          <Activity className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {transaction.source_currency} → {transaction.destination_currency}: {corridorConfig.label}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {corridor.note} · Est. {formatDuration(corridor.estSeconds)} via {corridor.rail}
            </p>
          </div>
          {mitigation && (
            <Button size="sm" variant="outline" onClick={() => setShowMitigation(true)}>
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resolve</span>
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status tracker */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="SWIFT Interbank Live Tracking"
            subtitle="FedEx-style node tracking with hop latency"
            action={
              canAdvance ? (
                <Button size="sm" variant="secondary" onClick={handleAdvance} loading={advancing}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Advance status
                </Button>
              ) : undefined
            }
          />
          <div className="px-6 py-6">
            <StatusTracker transaction={transaction} />
          </div>
        </Card>

        {/* Recipient + details */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Recipient" />
            <div className="p-6">
              {recipient ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                      {getInitials(recipient.full_name)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{recipient.full_name}</p>
                      <p className="text-sm text-slate-400">
                        {CURRENCIES[recipient.currency_code]?.flag} {recipient.country}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <DetailRow icon={<Building className="w-4 h-4" />} label="Bank" value={recipient.bank_name} />
                    <DetailRow icon={<Wallet className="w-4 h-4" />} label="Account" value={recipient.account_number} />
                    <DetailRow
                      icon={<MapPin className="w-4 h-4" />}
                      label="Method"
                      value={PAYMENT_METHODS[recipient.payment_method].label}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Recipient no longer available</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <div className="p-6 space-y-2.5">
              <DetailRow icon={<FileText className="w-4 h-4" />} label="Purpose" value={PURPOSES[transaction.purpose].label} />
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Created" value={formatDateTime(transaction.created_at)} />
              {transaction.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{transaction.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Delay Mitigation Drawer */}
      {showMitigation && mitigation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowMitigation(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Delay Mitigation</h3>
                  <p className="text-xs text-slate-500">Proactive resolution in progress</p>
                </div>
              </div>
              <button onClick={() => setShowMitigation(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-800">
              {mitigation}
            </div>

            {delayFactors.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Detected Factors</p>
                {delayFactors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    {factor}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowMitigation(false)}>
                Dismiss
              </Button>
              <Button className="flex-1" onClick={() => {
                toast('Re-routing request submitted', 'success');
                setShowMitigation(false);
              }}>
                <Zap className="w-4 h-4" />
                Re-route Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete transfer?"
        message={`This will permanently delete transfer ${transaction.reference}. This action cannot be undone.`}
        confirmLabel="Delete"
        loading={actionLoading}
      />
      <ConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        title="Cancel transfer?"
        message={`This will cancel transfer ${transaction.reference}. The funds will be returned to your account.`}
        confirmLabel="Cancel transfer"
        loading={actionLoading}
        destructive={false}
      />
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-slate-400">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-slate-700 text-right">{value}</span>
    </div>
  );
}
