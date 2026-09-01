import { useState } from 'react';
import { ArrowLeft, UserPlus, Users } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useRecipients } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton, EmptyState } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { COUNTRIES, COUNTRY_NAMES, PAYMENT_METHODS, CURRENCIES } from '@/lib/constants';
import { cn, getInitials, formatDate } from '@/lib/utils';
import type { Recipient, PaymentMethod } from '@/lib/types';

export function RecipientsListPage() {
  const { navigate } = useRouter();
  const { recipients, loading, reload } = useRecipients();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('recipients').delete().eq('id', deleteTarget.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Recipient deleted', 'success');
      setDeleteTarget(null);
      reload();
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Recipients</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {recipients.length} saved {recipients.length === 1 ? 'contact' : 'contacts'}
          </p>
        </div>
        <Button onClick={() => navigate('/recipients/new')}>
          <UserPlus className="w-4 h-4" />
          Add Recipient
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-32 mt-4" />
              <Skeleton className="h-4 w-24 mt-2" />
              <Skeleton className="h-4 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : recipients.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="No recipients yet"
            description="Add a recipient so you can quickly send them money in the future."
            action={
              <Button onClick={() => navigate('/recipients/new')} size="sm">
                <UserPlus className="w-4 h-4" />
                Add Recipient
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipients.map((r) => {
            const country = COUNTRIES[r.country];
            const currency = CURRENCIES[r.currency_code];
            return (
              <Card key={r.id} className="p-5 group" hover>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-base font-semibold text-slate-600">
                      {getInitials(r.full_name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{r.full_name}</p>
                      <p className="text-sm text-slate-400">
                        {currency?.flag} {r.country}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Currency</span>
                    <span className="font-medium text-slate-700">{r.currency_code}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Method</span>
                    <span className="font-medium text-slate-700">
                      {PAYMENT_METHODS[r.payment_method].label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Account</span>
                    <span className="font-mono text-xs text-slate-600">{r.account_number}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Added {formatDate(r.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/recipients/edit/${r.id}`)}
                      className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg p-1.5 transition-colors text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-colors text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete recipient?"
        message={`This will remove ${deleteTarget?.full_name} from your recipients. Existing transfers will keep their records.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}

interface RecipientFormProps {
  initial?: Partial<Recipient>;
  onSubmit: (values: {
    full_name: string;
    country: string;
    currency_code: string;
    bank_name: string;
    account_number: string;
    routing_code: string;
    payment_method: PaymentMethod;
  }) => void;
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
}

export function RecipientForm({ initial, onSubmit, onCancel, submitLabel, loading }: RecipientFormProps) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [country, setCountry] = useState(initial?.country ?? COUNTRY_NAMES[0]);
  const [currencyCode, setCurrencyCode] = useState(
    initial?.currency_code ?? COUNTRIES[COUNTRY_NAMES[0]].currency
  );
  const [bankName, setBankName] = useState(initial?.bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(initial?.account_number ?? '');
  const [routingCode, setRoutingCode] = useState(initial?.routing_code ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.payment_method ?? 'bank');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCountryChange = (c: string) => {
    setCountry(c);
    setCurrencyCode(COUNTRIES[c].currency);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) errs.full_name = 'Enter a valid name';
    if (!bankName.trim()) errs.bank_name = 'Bank name is required';
    if (accountNumber.trim().length < 4) errs.account_number = 'Enter a valid account number';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast('Please fix the errors below', 'error');
      return;
    }
    onSubmit({
      full_name: fullName.trim(),
      country,
      currency_code: currencyCode,
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      routing_code: routingCode.trim(),
      payment_method: paymentMethod,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full name"
          name="full_name"
          placeholder="e.g. Sofia Ramirez"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.full_name}
          required
        />
        <Select
          label="Country"
          name="country"
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
        >
          {COUNTRY_NAMES.map((c) => (
            <option key={c} value={c}>
              {CURRENCIES[COUNTRIES[c].currency]?.flag} {c}
            </option>
          ))}
        </Select>
        <Select
          label="Currency"
          name="currency_code"
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
        >
          {Object.entries(CURRENCIES).map(([code, meta]) => (
            <option key={code} value={code}>
              {meta.flag} {code} — {meta.name}
            </option>
          ))}
        </Select>
        <Select
          label="Payment method"
          name="payment_method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          {Object.entries(PAYMENT_METHODS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </Select>
      </div>

      <Input
        label="Bank / Provider name"
        name="bank_name"
        placeholder="e.g. Banco de Mexico"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        error={errors.bank_name}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Account number"
          name="account_number"
          placeholder="e.g. **** 4471"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          error={errors.account_number}
          hint="You can mask sensitive digits."
          required
        />
        <Input
          label="Routing / SWIFT / IBAN"
          name="routing_code"
          placeholder="e.g. BNMXMXMM"
          value={routingCode}
          onChange={(e) => setRoutingCode(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function RecipientNewPage() {
  const { navigate } = useRouter();
  const { reload } = useRecipients();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: {
    full_name: string;
    country: string;
    currency_code: string;
    bank_name: string;
    account_number: string;
    routing_code: string;
    payment_method: PaymentMethod;
  }) => {
    setLoading(true);
    const { error } = await supabase.from('recipients').insert(values);
    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }
    toast('Recipient added', 'success');
    reload();
    navigate('/recipients');
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/recipients')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center">
          <UserPlus className="w-5.5 h-5.5 text-brand-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Add Recipient</h2>
          <p className="text-sm text-slate-500">Save a contact to send them money quickly</p>
        </div>
      </div>
      <RecipientForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/recipients')}
        submitLabel="Add Recipient"
        loading={loading}
      />
    </div>
  );
}

export function RecipientEditPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { recipients, reload, loading: recipientsLoading } = useRecipients();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const recipient = recipients.find((r) => r.id === id);

  const handleSubmit = async (values: {
    full_name: string;
    country: string;
    currency_code: string;
    bank_name: string;
    account_number: string;
    routing_code: string;
    payment_method: PaymentMethod;
  }) => {
    setLoading(true);
    const { error } = await supabase
      .from('recipients')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }
    toast('Recipient updated', 'success');
    reload();
    navigate('/recipients');
  };

  if (recipientsLoading) {
    return (
      <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Recipient not found.</p>
        <Button onClick={() => navigate('/recipients')} className="mt-4" size="sm">
          Back to recipients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/recipients')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
          <UserPlus className="w-5.5 h-5.5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Edit Recipient</h2>
          <p className="text-sm text-slate-500">{recipient.full_name}</p>
        </div>
      </div>
      <RecipientForm
        initial={recipient}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/recipients')}
        submitLabel="Save Changes"
        loading={loading}
      />
    </div>
  );
}
