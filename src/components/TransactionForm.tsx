import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Info, Lock, Unlock, Timer, ShieldCheck } from 'lucide-react';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CURRENCIES,
  CURRENCY_CODES,
  COUNTRIES,
  PAYMENT_METHODS,
  PURPOSES,
} from '@/lib/constants';
import { cn, formatAmount } from '@/lib/utils';
import {
  createRateLock,
  getRateLock,
  clearRateLock,
  rateLockRemainingMs,
  formatCountdown,
  getMidMarketRate,
  getInterbankCost,
} from '@/lib/tracking';
import type { Recipient, Purpose } from '@/lib/types';

export interface TransactionFormValues {
  recipient_id: string;
  source_currency: string;
  destination_currency: string;
  send_amount: number;
  exchange_rate: number;
  fee_amount: number;
  purpose: Purpose;
  notes: string;
}

interface TransactionFormProps {
  recipients: Recipient[];
  initial?: Partial<TransactionFormValues>;
  onSubmit: (values: TransactionFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
  onCorridorChange?: (from: string, to: string) => void;
}

function getRate(from: string, to: string): number {
  return getMidMarketRate(from, to);
}

function computeFee(amount: number): number {
  if (amount <= 500) return 4.5;
  if (amount <= 2000) return 8;
  if (amount <= 5000) return 12;
  return Math.min(amount * 0.005, 45);
}

export function TransactionForm({
  recipients,
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  loading,
  onCorridorChange,
}: TransactionFormProps) {
  const [recipientId, setRecipientId] = useState(initial?.recipient_id ?? '');
  const [sourceCurrency, setSourceCurrency] = useState(initial?.source_currency ?? 'USD');
  const [destinationCurrency, setDestinationCurrency] = useState(
    initial?.destination_currency ?? 'MXN'
  );
  const [sendAmount, setSendAmount] = useState(String(initial?.send_amount ?? ''));
  const [purpose, setPurpose] = useState<Purpose>(initial?.purpose ?? 'family_support');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lockCountdown, setLockCountdown] = useState(0);
  const [lockActive, setLockActive] = useState(false);
  const lockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedRecipient = recipients.find((r) => r.id === recipientId);

  useEffect(() => {
    if (selectedRecipient) {
      const country = COUNTRIES[selectedRecipient.country];
      if (country) setDestinationCurrency(country.currency);
    }
  }, [selectedRecipient]);

  // Notify parent of corridor changes
  useEffect(() => {
    onCorridorChange?.(sourceCurrency, destinationCurrency);
  }, [sourceCurrency, destinationCurrency, onCorridorChange]);

  const rate = useMemo(() => getRate(sourceCurrency, destinationCurrency), [sourceCurrency, destinationCurrency]);
  const amount = parseFloat(sendAmount) || 0;
  const fee = useMemo(() => computeFee(amount), [amount]);
  const interbankCost = useMemo(() => getInterbankCost(amount), [amount]);
  const receiveAmount = useMemo(() => {
    if (amount <= 0) return 0;
    return Math.max((amount - fee) * rate, 0);
  }, [amount, fee, rate]);

  // Rate lock countdown
  useEffect(() => {
    const tick = () => {
      const remaining = rateLockRemainingMs();
      if (remaining > 0) {
        setLockCountdown(remaining);
        setLockActive(true);
      } else {
        setLockActive(false);
        setLockCountdown(0);
        if (lockRef.current) {
          clearInterval(lockRef.current);
          lockRef.current = null;
        }
      }
    };
    tick();
    lockRef.current = setInterval(tick, 1000);
    return () => {
      if (lockRef.current) clearInterval(lockRef.current);
    };
  }, []);

  const handleLockRate = () => {
    if (amount <= 0) {
      setErrors((p) => ({ ...p, send_amount: 'Enter an amount first' }));
      return;
    }
    clearRateLock();
    createRateLock(sourceCurrency, destinationCurrency, rate);
    setLockActive(true);
    setLockCountdown(60000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!recipientId) errs.recipient_id = 'Please select a recipient';
    if (!sendAmount || amount <= 0) errs.send_amount = 'Enter a valid amount';
    if (amount > 0 && amount < 10) errs.send_amount = 'Minimum send amount is 10';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSubmit({
      recipient_id: recipientId,
      source_currency: sourceCurrency,
      destination_currency: destinationCurrency,
      send_amount: Math.round(amount * 100) / 100,
      exchange_rate: Math.round(rate * 1e6) / 1e6,
      fee_amount: Math.round(fee * 100) / 100,
      purpose,
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {recipients.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-slate-600">
            You need to add a recipient before creating a transfer.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Recipient"
              name="recipient_id"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              error={errors.recipient_id}
            >
              <option value="">Select a recipient...</option>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name} — {r.country}
                </option>
              ))}
            </Select>
            <Select
              label="Purpose"
              name="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as Purpose)}
            >
              {Object.entries(PURPOSES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Amount section */}
          <Card className="p-6 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="You send"
                  name="source_currency"
                  value={sourceCurrency}
                  onChange={(e) => setSourceCurrency(e.target.value)}
                >
                  {CURRENCY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCIES[c].flag} {c} — {CURRENCIES[c].name}
                    </option>
                  ))}
                </Select>
                <div className="mt-3">
                  <Input
                    name="send_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    error={errors.send_amount}
                    prefix={CURRENCIES[sourceCurrency]?.symbol}
                    className="text-lg font-semibold"
                  />
                </div>
              </div>

              <div>
                <Select
                  label="They receive"
                  name="destination_currency"
                  value={destinationCurrency}
                  onChange={(e) => setDestinationCurrency(e.target.value)}
                >
                  {CURRENCY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCIES[c].flag} {c} — {CURRENCIES[c].name}
                    </option>
                  ))}
                </Select>
                <div className="mt-3">
                  <div className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">
                      {formatAmount(receiveAmount, destinationCurrency)}
                    </span>
                    <span className="text-sm text-slate-400">{destinationCurrency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Lock Timer */}
            <div className="mt-5 rounded-xl bg-gradient-to-r from-sky-50 to-brand-50/50 border border-sky-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                    lockActive ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'
                  )}>
                    {lockActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Guaranteed Rate Lock</p>
                    <p className="text-xs text-slate-500">
                      {lockActive
                        ? `Rate locked at ${rate.toFixed(4)} — expires in ${formatCountdown(lockCountdown)}`
                        : 'Lock your rate for 60 seconds to protect against volatility'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lockActive && (
                    <div className="flex items-center gap-1.5 text-sky-600 font-semibold tabular-nums">
                      <Timer className="w-4 h-4" />
                      {formatCountdown(lockCountdown)}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant={lockActive ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={handleLockRate}
                    disabled={amount <= 0}
                  >
                    {lockActive ? (
                      <>Relock Rate</>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Lock Rate
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {/* Progress bar */}
              {lockActive && (
                <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(lockCountdown / 60000) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Fee Transparency Matrix */}
            <div className="mt-5 pt-5 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-800">Fee Transparency</p>
                <span className="text-xs text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 font-medium">Zero hidden markup</span>
              </div>
              <div className="space-y-2.5">
                <FeeRow label="Mid-market rate" value={`1 ${sourceCurrency} = ${rate.toFixed(4)} ${destinationCurrency}`} />
                <FeeRow label="Interbank cost" value={formatAmount(interbankCost, sourceCurrency)} subtle />
                <FeeRow label="Platform fee" value={formatAmount(fee, sourceCurrency)} subtle />
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Total you pay</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatAmount(amount + (amount > 0 ? fee : 0), sourceCurrency)}
                  </span>
                </div>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Recipient gets (guaranteed)</span>
                  <span className="text-sm font-semibold text-brand-600">
                    {formatAmount(receiveAmount, destinationCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Textarea
            label="Notes (optional)"
            name="notes"
            rows={3}
            placeholder="Add a note for this transfer..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {selectedRecipient && (
            <div className="flex items-start gap-3 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-800">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Sending to <span className="font-medium">{selectedRecipient.full_name}</span> via{' '}
                {PAYMENT_METHODS[selectedRecipient.payment_method].label.toLowerCase()} at{' '}
                {selectedRecipient.bank_name}.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {submitLabel}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

function FeeRow({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={cn('font-medium', subtle ? 'text-slate-600' : 'text-slate-800')}>{value}</span>
    </div>
  );
}
