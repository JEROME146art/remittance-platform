import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Edit3 } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { useRecipients } from '@/hooks/useData';
import { TransactionForm, type TransactionFormValues } from '@/components/TransactionForm';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import type { Transaction } from '@/lib/types';

export function TransactionEditPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { recipients, loading: recipientsLoading } = useRecipients();
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
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
  }, [load]);

  const handleSubmit = async (values: TransactionFormValues) => {
    setSubmitting(true);
    const receiveAmount =
      Math.round((values.send_amount - values.fee_amount) * values.exchange_rate * 100) / 100;
    const { error } = await supabase
      .from('transactions')
      .update({
        recipient_id: values.recipient_id,
        source_currency: values.source_currency,
        destination_currency: values.destination_currency,
        send_amount: values.send_amount,
        exchange_rate: values.exchange_rate,
        fee_amount: values.fee_amount,
        receive_amount: receiveAmount,
        purpose: values.purpose,
        notes: values.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      toast(error.message, 'error');
      setSubmitting(false);
      return;
    }
    toast('Transfer updated', 'success');
    navigate(`/transactions/${id}`);
  };

  if (loading || recipientsLoading) {
    return (
      <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Transfer not found.</p>
        <Button onClick={() => navigate('/transactions')} className="mt-4" size="sm">
          Back to transfers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/transactions/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
          <Edit3 className="w-5.5 h-5.5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Edit Transfer</h2>
          <p className="text-sm text-slate-500">{transaction.reference}</p>
        </div>
      </div>

      <TransactionForm
        recipients={recipients}
        initial={{
          recipient_id: transaction.recipient_id ?? '',
          source_currency: transaction.source_currency,
          destination_currency: transaction.destination_currency,
          send_amount: transaction.send_amount,
          purpose: transaction.purpose,
          notes: transaction.notes ?? '',
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/transactions/${id}`)}
        submitLabel="Save Changes"
        loading={submitting}
      />
    </div>
  );
}
