import { useState } from 'react';
import { ArrowLeft, Send, Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useRecipients } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { TransactionForm, type TransactionFormValues } from '@/components/TransactionForm';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { generateReference } from '@/lib/utils';
import {
  getCorridorHealth,
  CORRIDOR_HEALTH_CONFIG,
  getDelayFactors,
  formatDuration,
} from '@/lib/tracking';
import type { StatusHistoryEntry } from '@/lib/types';

export function TransactionNewPage() {
  const { navigate } = useRouter();
  const { recipients, loading } = useRecipients();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [corridor, setCorridor] = useState<{ from: string; to: string }>({ from: 'USD', to: 'MXN' });

  const health = getCorridorHealth(corridor.from, corridor.to);
  const healthConfig = CORRIDOR_HEALTH_CONFIG[health.health];
  const delayFactors = getDelayFactors(
    Object.values({
      Mexico: 'MXN', India: 'INR', Pakistan: 'PKR', Nigeria: 'NGN',
      Philippines: 'PHP', Kenya: 'KES', Brazil: 'BRL', 'United Kingdom': 'GBP',
      Japan: 'JPY', Canada: 'CAD', Australia: 'AUD', Singapore: 'SGD',
      Egypt: 'EGP', Germany: 'EUR', France: 'EUR',
    }).find((curr) => curr === corridor.to) ?? ''
  );

  const handleSubmit = async (values: TransactionFormValues) => {
    setSubmitting(true);
    const now = new Date().toISOString();
    const history: StatusHistoryEntry[] = [
      { stage: 'initiated', timestamp: now, label: 'Transfer initiated' },
    ];
    const corridorInfo = getCorridorHealth(values.source_currency, values.destination_currency);
    const expectedDelivery = new Date(Date.now() + corridorInfo.estSeconds * 1000).toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        recipient_id: values.recipient_id,
        reference: generateReference(),
        status: 'pending',
        stage: 'initiated',
        source_currency: values.source_currency,
        destination_currency: values.destination_currency,
        send_amount: values.send_amount,
        exchange_rate: values.exchange_rate,
        fee_amount: values.fee_amount,
        receive_amount: Math.round((values.send_amount - values.fee_amount) * values.exchange_rate * 100) / 100,
        purpose: values.purpose,
        notes: values.notes,
        status_history: history,
        expected_delivery: expectedDelivery,
      })
      .select('id, reference')
      .single();

    if (error) {
      toast(error.message, 'error');
      setSubmitting(false);
      return;
    }

    await supabase.from('notifications').insert({
      transaction_id: data.id,
      type: 'status_update',
      title: 'Transfer initiated',
      body: `Your transfer ${data.reference} has been initiated and is being processed.`,
    });

    toast('Transfer created successfully!', 'success');
    navigate(`/transactions/${data.id}`);
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Send className="w-5.5 h-5.5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">New Transfer</h2>
            <p className="text-sm text-slate-500">Send money to a recipient abroad</p>
          </div>
        </div>
      </div>

      {/* Corridor Health Indicator */}
      <div className="flex items-center gap-3 rounded-xl bg-white ring-1 ring-slate-200/70 shadow-sm px-4 py-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${healthConfig.color}`}>
          {health.health === 'healthy' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : health.health === 'degraded' ? (
            <Clock className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {corridor.from} → {corridor.to} Corridor
            </p>
            <Badge className={healthConfig.color} dot={healthConfig.dot}>
              {healthConfig.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {health.note} · via {health.rail} · Est. {formatDuration(health.estSeconds)}
          </p>
        </div>
        {delayFactors.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {delayFactors[0]}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <TransactionForm
          recipients={recipients}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/transactions')}
          submitLabel="Send Transfer"
          loading={submitting}
          onCorridorChange={(from, to) => setCorridor({ from, to })}
        />
      )}
    </div>
  );
}
