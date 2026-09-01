import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowRightLeft,
  Bell,
  BellRing,
  Trash2,
  Plus,
  CheckCircle2,
  ArrowUpFromLine,
  ArrowDownToLine,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, EmptyState } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { CURRENCIES, CURRENCY_CODES } from '@/lib/constants';
import { cn, formatDate } from '@/lib/utils';
import type { RateAlert } from '@/lib/types';

interface RateEntry {
  code: string;
  name: string;
  flag: string;
  rate: number;
  change24h: number;
  trend: 'up' | 'down';
}

interface RateResponse {
  base: string;
  timestamp: string;
  rates: RateEntry[];
}

export function RatesPage() {
  const { toast } = useToast();
  const [base, setBase] = useState('USD');
  const [data, setData] = useState<RateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convertFrom, setConvertFrom] = useState('USD');
  const [convertTo, setConvertTo] = useState('MXN');
  const [convertAmount, setConvertAmount] = useState('100');

  // Rate alerts state
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertFrom, setAlertFrom] = useState('USD');
  const [alertTo, setAlertTo] = useState('MXN');
  const [alertTarget, setAlertTarget] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const checkedAlertsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exchange-rates?base=${base}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to load rates (${res.status})`);
      const json = (await res.json()) as RateResponse;
      if (!json.rates || !Array.isArray(json.rates)) throw new Error('Invalid rate data');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rates');
    } finally {
      setLoading(false);
    }
  }, [base]);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    const { data: alertData, error: alertError } = await supabase
      .from('rate_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    if (alertError) {
      toast(alertError.message, 'error');
    } else {
      setAlerts(alertData ?? []);
    }
    setAlertsLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Check active alerts against live rates whenever rates update
  useEffect(() => {
    if (!data) return;
    const activeAlerts = alerts.filter((a) => a.is_active);
    if (activeAlerts.length === 0) return;

    activeAlerts.forEach((alert) => {
      // Skip if already checked this session (avoid duplicate notifications)
      if (checkedAlertsRef.current.has(alert.id)) return;

      // Get the current rate for this pair from the edge function response
      // The edge function returns rates relative to `base`, so we need to compute
      // the cross rate if base != alert.from_currency
      const fromRateInBase = data.rates.find((r) => r.code === alert.from_currency)?.rate;
      const toRateInBase = data.rates.find((r) => r.code === alert.to_currency)?.rate;

      if (!fromRateInBase || !toRateInBase) return;

      // Cross rate: (to_rate_in_base / from_rate_in_base) gives us from->to
      const currentRate = toRateInBase / fromRateInBase;

      const shouldTrigger =
        alert.direction === 'above'
          ? currentRate >= alert.target_rate
          : currentRate <= alert.target_rate;

      if (shouldTrigger) {
        checkedAlertsRef.current.add(alert.id);
        triggerAlert(alert, currentRate);
      }
    });
  }, [data, alerts]);

  const triggerAlert = async (alert: RateAlert, currentRate: number) => {
    const triggeredRate = Math.round(currentRate * 1e6) / 1e6;
    const { error: updateError } = await supabase
      .from('rate_alerts')
      .update({
        is_active: false,
        triggered_rate: triggeredRate,
        triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', alert.id);

    if (updateError) {
      toast(updateError.message, 'error');
      return;
    }

    // Insert a notification
    await supabase.from('notifications').insert({
      type: 'rate_alert',
      title: 'Rate alert triggered',
      body: `${alert.from_currency}/${alert.to_currency} reached ${triggeredRate.toFixed(4)} (your target: ${alert.target_rate.toFixed(4)} ${alert.direction}).`,
    });

    toast(
      `Rate alert: ${alert.from_currency}/${alert.to_currency} hit ${triggeredRate.toFixed(4)}!`,
      'success'
    );
    loadAlerts();
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(alertTarget);
    if (!target || target <= 0) {
      toast('Enter a valid target rate', 'error');
      return;
    }
    if (alertFrom === alertTo) {
      toast('From and to currencies must be different', 'error');
      return;
    }
    setAlertSubmitting(true);
    const { error: insertError } = await supabase.from('rate_alerts').insert({
      from_currency: alertFrom,
      to_currency: alertTo,
      target_rate: Math.round(target * 1e6) / 1e6,
      direction: alertDirection,
    });
    if (insertError) {
      toast(insertError.message, 'error');
      setAlertSubmitting(false);
      return;
    }
    toast('Rate alert created', 'success');
    setAlertTarget('');
    setShowAlertForm(false);
    checkedAlertsRef.current.clear();
    setAlertSubmitting(false);
    loadAlerts();
  };

  const handleDeleteAlert = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const { error: deleteError } = await supabase.from('rate_alerts').delete().eq('id', id);
    if (deleteError) {
      toast(deleteError.message, 'error');
      loadAlerts();
    }
  };

  // Converter
  const fromRate = data?.rates.find((r) => r.code === convertTo)?.rate;
  const amount = parseFloat(convertAmount) || 0;
  const converted = fromRate ? amount * fromRate : 0;

  const sortedRates = [...(data?.rates ?? [])].sort((a, b) => b.rate - a.rate);
  const activeAlerts = alerts.filter((a) => a.is_active);
  const triggeredAlerts = alerts.filter((a) => !a.is_active);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Exchange Rates</h2>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
            {data && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                Live · updated {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={base} onChange={(e) => setBase(e.target.value)} className="w-36">
            {CURRENCY_CODES.map((c) => (
              <option key={c} value={c}>
                {CURRENCIES[c].flag} {c}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="md" onClick={load} loading={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Converter */}
      <Card className="p-6 bg-gradient-to-br from-brand-50/50 to-white">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="w-5 h-5 text-brand-600" />
          <h3 className="font-semibold text-slate-900">Quick Converter</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">From</label>
            <div className="flex gap-2">
              <Select value={convertFrom} onChange={(e) => setConvertFrom(e.target.value)} className="w-24">
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <input
                type="number"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="hidden sm:flex items-center justify-center pb-2.5">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-brand-600" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
            <div className="flex gap-2">
              <Select value={convertTo} onChange={(e) => setConvertTo(e.target.value)} className="w-24">
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 flex items-center justify-between">
                <span>{converted.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                <span className="text-slate-400 text-xs">{convertTo}</span>
              </div>
            </div>
          </div>
        </div>
        {fromRate && (
          <p className="mt-3 text-sm text-slate-500">
            1 {convertFrom} = {fromRate.toFixed(4)} {convertTo}
          </p>
        )}
      </Card>

      {/* Rate Alerts */}
      <Card>
        <CardHeader
          title="Rate Alerts"
          subtitle="Get notified when a currency pair hits your target"
          action={
            <Button
              variant={showAlertForm ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => setShowAlertForm(!showAlertForm)}
            >
              <Plus className="w-4 h-4" />
              {showAlertForm ? 'Cancel' : 'New Alert'}
            </Button>
          }
        />

        {showAlertForm && (
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 animate-slide-up">
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Select
                  label="From"
                  value={alertFrom}
                  onChange={(e) => setAlertFrom(e.target.value)}
                >
                  {CURRENCY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCIES[c].flag} {c}
                    </option>
                  ))}
                </Select>
                <Select
                  label="To"
                  value={alertTo}
                  onChange={(e) => setAlertTo(e.target.value)}
                >
                  {CURRENCY_CODES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCIES[c].flag} {c}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Target rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="e.g. 17.50"
                  value={alertTarget}
                  onChange={(e) => setAlertTarget(e.target.value)}
                />
                <Select
                  label="Direction"
                  value={alertDirection}
                  onChange={(e) => setAlertDirection(e.target.value as 'above' | 'below')}
                >
                  <option value="above">Goes above</option>
                  <option value="below">Goes below</option>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  You'll get an in-app notification when 1 {alertFrom} {alertDirection === 'above' ? 'exceeds' : 'drops below'}{' '}
                  {alertTarget || '—'} {alertTo}.
                </p>
                <Button type="submit" size="sm" loading={alertSubmitting}>
                  <BellRing className="w-4 h-4" />
                  Create Alert
                </Button>
              </div>
            </form>
          </div>
        )}

        {alertsLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-7 h-7" />}
            title="No rate alerts yet"
            description="Create an alert to get notified when a currency pair reaches your desired rate."
            action={
              !showAlertForm ? (
                <Button onClick={() => setShowAlertForm(true)} size="sm">
                  <Plus className="w-4 h-4" />
                  New Alert
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {activeAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onDelete={handleDeleteAlert}
              />
            ))}
            {triggeredAlerts.length > 0 && activeAlerts.length > 0 && (
              <div className="px-6 py-2 bg-slate-50/50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Triggered ({triggeredAlerts.length})
                </p>
              </div>
            )}
            {triggeredAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onDelete={handleDeleteAlert}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Rate table */}
      <Card>
        <CardHeader title="All Rates" subtitle={`Base currency: ${base}`} />
        {error ? (
          <EmptyState
            icon={<TrendingUp className="w-7 h-7" />}
            title="Couldn't load rates"
            description={error}
          />
        ) : loading && !data ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-6 py-3">Currency</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-6 py-3">Rate</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-6 py-3">24h Change</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wide px-6 py-3 hidden sm:table-cell">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedRates.map((r) => (
                  <tr key={r.code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{r.flag}</span>
                        <div>
                          <p className="font-medium text-slate-900">{r.code}</p>
                          <p className="text-xs text-slate-400">{r.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {r.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-sm font-medium tabular-nums',
                          r.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {r.change24h >= 0 ? '+' : ''}{r.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right hidden sm:table-cell">
                      <div
                        className={cn(
                          'inline-flex items-center justify-center w-8 h-8 rounded-lg',
                          r.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        )}
                      >
                        {r.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-400 text-center">
        Rates are indicative and updated every 15 seconds for demonstration purposes.
      </p>
    </div>
  );
}

function AlertRow({
  alert,
  onDelete,
}: {
  alert: RateAlert;
  onDelete: (id: string) => void;
}) {
  const fromMeta = CURRENCIES[alert.from_currency];
  const toMeta = CURRENCIES[alert.to_currency];
  const isTriggered = !alert.is_active;

  return (
    <div className="flex items-center gap-4 px-6 py-4 group hover:bg-slate-50/50 transition-colors">
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          isTriggered
            ? 'bg-emerald-50 text-emerald-600'
            : alert.direction === 'above'
            ? 'bg-sky-50 text-sky-600'
            : 'bg-amber-50 text-amber-600'
        )}
      >
        {isTriggered ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : alert.direction === 'above' ? (
          <ArrowUpFromLine className="w-5 h-5" />
        ) : (
          <ArrowDownToLine className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-slate-900">
            {fromMeta?.flag} {alert.from_currency} / {toMeta?.flag} {alert.to_currency}
          </p>
          {isTriggered ? (
            <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20" dot="bg-emerald-500">
              Triggered
            </Badge>
          ) : (
            <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20" dot="bg-sky-500">
              Active
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          {alert.direction === 'above' ? 'Above' : 'Below'}{' '}
          <span className="font-medium text-slate-700 tabular-nums">
            {alert.target_rate.toFixed(4)}
          </span>
          {isTriggered && alert.triggered_rate && (
            <span className="text-emerald-600">
              {' '}· hit {alert.triggered_rate.toFixed(4)} on {formatDate(alert.triggered_at)}
            </span>
          )}
        </p>
      </div>
      <button
        onClick={() => onDelete(alert.id)}
        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-colors opacity-0 group-hover:opacity-100"
        title="Delete alert"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
