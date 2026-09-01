import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { getCorridorHealth } from '@/lib/tracking';
import type { Transaction, TransactionStage, TransactionStatus, StatusHistoryEntry } from '@/lib/types';

const STAGES: TransactionStage[] = ['initiated', 'verified', 'processing', 'settled', 'available'];
const STAGE_LABELS: Record<TransactionStage, string> = {
  initiated: 'Transfer initiated · Sender Bank confirmed',
  verified: 'Payment verified · ACH Network cleared',
  processing: 'Funds in transit · FX Liquidity Pool locked',
  settled: 'SWIFT interbank routing · Sent to partner bank',
  available: 'Recipient account credited · Funds delivered',
  returned: 'Returned',
};

const BASE_DELAY_MS = 5000;

function getStageDelay(stage: TransactionStage, from: string, to: string): number {
  const corridor = getCorridorHealth(from, to);
  if (corridor.health === 'delayed') return BASE_DELAY_MS * 6;
  if (corridor.health === 'degraded') return BASE_DELAY_MS * 2.5;
  return BASE_DELAY_MS;
}

export function useAutoProgress(userReady: boolean) {
  const { toast } = useToast();
  const [activeCount, setActiveCount] = useState(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userReady) return;

    let active: Transaction[] = [];

    const scheduleNext = (tx: Transaction) => {
      if (tx.status === 'completed' || tx.status === 'cancelled' || tx.status === 'failed' || tx.status === 'refunded') {
        return;
      }
      if (tx.stage === 'returned') return;

      const currentIdx = STAGES.indexOf(tx.stage);
      if (currentIdx < 0 || currentIdx >= STAGES.length - 1) return;

      const delay = getStageDelay(tx.stage, tx.source_currency, tx.destination_currency);
      const timer = setTimeout(async () => {
        const nextStage = STAGES[currentIdx + 1];
        const now = new Date().toISOString();

        const { data: fresh } = await supabase
          .from('transactions')
          .select('status_history')
          .eq('id', tx.id)
          .maybeSingle();

        const history: StatusHistoryEntry[] = (fresh?.status_history ?? []) as StatusHistoryEntry[];
        if (history.some((h) => h.stage === nextStage)) return;

        const newHistory: StatusHistoryEntry[] = [
          ...history,
          { stage: nextStage, timestamp: now, label: STAGE_LABELS[nextStage] },
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

        const { error } = await supabase.from('transactions').update(update).eq('id', tx.id);
        if (!error) {
          await supabase.from('notifications').insert({
            transaction_id: tx.id,
            type: newStatus === 'completed' ? 'payment_sent' : 'status_update',
            title: newStatus === 'completed' ? 'Transfer completed' : STAGE_LABELS[nextStage].split('·')[0].trim(),
            body: `Your transfer ${tx.reference}: ${STAGE_LABELS[nextStage]}`,
          });

          toast(
            newStatus === 'completed'
              ? `Transfer ${tx.reference} completed — funds delivered!`
              : `${tx.reference}: ${STAGE_LABELS[nextStage].split('·')[0].trim()}`,
            newStatus === 'completed' ? 'success' : 'info'
          );

          if (nextStage !== 'available') {
            const updated = { ...tx, stage: nextStage, status: newStatus, status_history: newHistory };
            scheduleNext(updated);
          }
        }
      }, delay);

      timersRef.current.add(timer);
    };

    const loadActive = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .in('status', ['pending', 'in_progress']);

      if (error || !data) return;

      active = data as Transaction[];
      setActiveCount(active.length);

      active.forEach((tx) => {
        if (processedRef.current.has(tx.id)) return;
        processedRef.current.add(tx.id);
        scheduleNext(tx);
      });
    };

    loadActive();

    const channel = supabase
      .channel('auto-progress')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          const tx = payload.new as Transaction;
          if (tx.status === 'pending' || tx.status === 'in_progress') {
            if (!processedRef.current.has(tx.id)) {
              processedRef.current.add(tx.id);
              scheduleNext(tx);
              setActiveCount((c) => c + 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions' },
        (payload) => {
          const tx = payload.new as Transaction;
          if (tx.status === 'completed' || tx.status === 'cancelled') {
            setActiveCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, [userReady, toast]);

  return { activeCount };
}
