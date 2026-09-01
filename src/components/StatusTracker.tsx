import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Landmark,
  Radio,
  ArrowLeftRight,
  Globe,
  Building2,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { TRACKING_NODES, STAGE_TO_NODE_INDEX } from '@/lib/tracking';

const NODE_ICONS: Record<string, typeof Landmark> = {
  bank: Landmark,
  ach: Radio,
  fx: ArrowLeftRight,
  swift: Globe,
  rail: Building2,
  account: Wallet,
};

const ORDERED_STAGES = ['initiated', 'verified', 'processing', 'settled', 'available'] as const;

export function StatusTracker({ transaction }: { transaction: Transaction }) {
  const isReturned = transaction.stage === 'returned' || transaction.status === 'failed' || transaction.status === 'refunded';
  const currentNodeIdx = STAGE_TO_NODE_INDEX[transaction.stage] ?? 0;
  const [elapsedMap, setElapsedMap] = useState<Record<string, number>>({});

  // Compute per-node elapsed seconds from status history
  useEffect(() => {
    const map: Record<string, number> = {};
    const history = transaction.status_history ?? [];
    const stageOrder: string[] = ['initiated', 'verified', 'processing', 'settled', 'available'];
    const stageToNode: Record<string, number> = { initiated: 0, verified: 1, processing: 2, settled: 3, available: 5 };

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const nodeIdx = stageToNode[entry.stage];
      if (nodeIdx === undefined) continue;
      const nextEntry = history[i + 1];
      if (nextEntry) {
        const dur = (new Date(nextEntry.timestamp).getTime() - new Date(entry.timestamp).getTime()) / 1000;
        map[`node-${nodeIdx}`] = dur;
      } else if (entry.stage === transaction.stage && transaction.status === 'in_progress') {
        const dur = (Date.now() - new Date(entry.timestamp).getTime()) / 1000;
        map[`node-${nodeIdx}`] = dur;
      }
    }
    setElapsedMap(map);
  }, [transaction.status_history, transaction.stage, transaction.status]);

  return (
    <div className="space-y-0">
      {/* Node map */}
      <div className="relative">
        {TRACKING_NODES.map((node, index) => {
          const isCompleted = !isReturned && currentNodeIdx > index;
          const isCurrent = !isReturned && currentNodeIdx === index;
          const isFuture = !isReturned && currentNodeIdx < index;
          const isLast = index === TRACKING_NODES.length - 1;
          const Icon = NODE_ICONS[node.icon] ?? Circle;
          const elapsed = elapsedMap[`node-${index}`];

          return (
            <div key={node.id}>
              <div className="flex gap-4">
                {/* Icon column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0',
                      isCompleted && 'bg-emerald-500 text-white',
                      isCurrent && 'bg-sky-500 text-white ring-4 ring-sky-100 animate-node-pulse',
                      isReturned && 'bg-rose-500 text-white',
                      isFuture && 'bg-slate-100 text-slate-300'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isReturned ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-4.5 h-4.5" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'w-0.5 flex-1 min-h-6 -mt-1 transition-colors duration-500',
                        isCompleted ? 'bg-emerald-500' : isCurrent ? 'bg-gradient-to-b from-sky-500 to-slate-200' : 'bg-slate-200'
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="pt-1.5 pb-5 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'
                      )}
                    >
                      {node.label}
                    </p>
                    {/* Latency badge */}
                    {isCompleted && elapsed !== undefined && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                        <Zap className="w-3 h-3" />
                        {elapsed < 60 ? `${elapsed.toFixed(1)}s` : `${Math.round(elapsed / 60)}m`}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-50 rounded-full px-2 py-0.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing…
                      </span>
                    )}
                    {isFuture && (
                      <span className="text-xs text-slate-300">
                        ~{node.estLatencySec}s
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    'text-xs mt-0.5',
                    isCompleted || isCurrent ? 'text-slate-500' : 'text-slate-300'
                  )}>
                    {node.sublabel}
                  </p>
                  {isCompleted && elapsed !== undefined && (
                    <p className="text-xs text-slate-400 mt-1 tabular-nums">
                      Cleared in {elapsed < 60 ? `${elapsed.toFixed(1)}s` : `${Math.round(elapsed / 60)}m`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isReturned && (
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="pt-1.5">
              <p className="text-sm font-semibold text-rose-600">
                {transaction.status === 'refunded' ? 'Refunded to sender' : 'Returned'}
              </p>
              {transaction.status_history?.find((h) => h.stage === 'returned') && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateTime(transaction.status_history.find((h) => h.stage === 'returned')!.timestamp)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Audit log */}
      {!isReturned && transaction.status_history && transaction.status_history.length > 1 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Audit Log</p>
          <div className="space-y-2">
            {transaction.status_history.map((entry, i) => {
              const nodeIdx = STAGE_TO_NODE_INDEX[entry.stage];
              const node = nodeIdx !== undefined ? TRACKING_NODES[nodeIdx] : null;
              return (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-slate-600">{entry.label}</span>
                    {node && <span className="text-slate-400"> · {node.label}</span>}
                    <span className="text-slate-300 ml-1.5 tabular-nums">{formatDateTime(entry.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
