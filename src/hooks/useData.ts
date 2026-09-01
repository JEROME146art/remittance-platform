import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Transaction, Recipient } from '@/lib/types';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*, recipient:recipients(*)')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setTransactions((data ?? []) as Transaction[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, loading, error, reload: load, setTransactions };
}

export function useRecipients() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setRecipients(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { recipients, loading, error, reload: load, setRecipients };
}
