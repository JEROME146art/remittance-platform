import { useMemo } from 'react';
import { ArrowUpRight, Clock, Zap, Globe } from 'lucide-react';
import { useTransactions } from '@/hooks/useData';
import { CURRENCIES } from '@/lib/constants';
import { cn, formatAmount } from '@/lib/utils';

export function MoneyFlowBanner() {
  const { transactions } = useTransactions();

  const activeFlows = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'pending' || t.status === 'in_progress')
      .slice(0, 4);
  }, [transactions]);

  const corridorCount = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.status === 'completed' || t.status === 'in_progress' || t.status === 'pending') {
        set.add(`${t.source_currency}→${t.destination_currency}`);
      }
    });
    return set.size;
  }, [transactions]);

  if (activeFlows.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-5 text-white overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
            <Globe className="w-4 h-4" />
            {corridorCount} active corridors
          </div>
          <p className="text-lg font-bold mt-1">No transfers in flight right now</p>
          <p className="text-sm text-slate-400 mt-0.5">Start a new transfer to see live money flow</p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-sky-500/10 to-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-5 text-white overflow-hidden relative">
      {/* Decorative flow lines */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
          <line x1="0" y1="30" x2="400" y2="30" stroke="#0ea5e9" strokeWidth="1" className="animate-flow" />
          <line x1="0" y1="50" x2="400" y2="50" stroke="#0ea5e9" strokeWidth="1" className="animate-flow" />
          <line x1="0" y1="70" x2="400" y2="70" stroke="#0ea5e9" strokeWidth="1" className="animate-flow" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
          <Zap className="w-4 h-4 text-sky-400" />
          {activeFlows.length} {activeFlows.length === 1 ? 'transfer' : 'transfers'} in flight
        </div>
        <div className="mt-3 space-y-2.5">
          {activeFlows.map((t) => {
            const srcFlag = CURRENCIES[t.source_currency]?.flag;
            const destFlag = CURRENCIES[t.destination_currency]?.flag;
            return (
              <div key={t.id} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-base">{srcFlag}</span>
                  <span className="font-semibold">{formatAmount(t.send_amount, t.source_currency)}</span>
                </div>
                {/* Animated flow dots */}
                <div className="flex-1 h-px bg-slate-700 relative overflow-hidden">
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" style={{ left: '20%' }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" style={{ left: '50%', animationDelay: '0.3s' }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-200 animate-pulse" style={{ left: '75%', animationDelay: '0.6s' }} />
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-semibold text-brand-300">{formatAmount(t.receive_amount, t.destination_currency)}</span>
                  <span className="text-base">{destFlag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
