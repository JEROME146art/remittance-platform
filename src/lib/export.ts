import type { Transaction } from './types';
import { formatDate } from './utils';
import { STATUS_CONFIG, PURPOSES, PAYMENT_METHODS } from './constants';

export function exportTransactionsCSV(transactions: Transaction[]): void {
  const headers = [
    'Reference',
    'Status',
    'Recipient',
    'Country',
    'Purpose',
    'Send Amount',
    'Source Currency',
    'Exchange Rate',
    'Fee',
    'Receive Amount',
    'Destination Currency',
    'Payment Method',
    'Notes',
    'Created',
    'Completed',
    'Expected Delivery',
  ];

  const rows = transactions.map((t) => {
    const status = STATUS_CONFIG[t.status]?.label ?? t.status;
    const recipient = t.recipient?.full_name ?? 'N/A';
    const country = t.recipient?.country ?? 'N/A';
    const purpose = PURPOSES[t.purpose]?.label ?? t.purpose;
    const method = t.recipient
      ? PAYMENT_METHODS[t.recipient.payment_method]?.label ?? 'N/A'
      : 'N/A';
    return [
      t.reference,
      status,
      recipient,
      country,
      purpose,
      t.send_amount.toFixed(2),
      t.source_currency,
      t.exchange_rate.toFixed(6),
      t.fee_amount.toFixed(2),
      t.receive_amount.toFixed(2),
      t.destination_currency,
      method,
      t.notes ?? '',
      formatDate(t.created_at),
      formatDate(t.completed_at),
      formatDate(t.expected_delivery),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `remitlet-transactions-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
