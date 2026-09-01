import type { Transaction } from './types';
import { CURRENCIES, PAYMENT_METHODS, PURPOSES } from './constants';
import { formatAmount, formatDateTime } from './utils';

export function generateReceiptHTML(transaction: Transaction): string {
  const srcMeta = CURRENCIES[transaction.source_currency];
  const destMeta = CURRENCIES[transaction.destination_currency];
  const recipient = transaction.recipient;
  const statusText = transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transfer Receipt ${transaction.reference}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px 20px; }
  .receipt { max-width: 480px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 32px; color: white; }
  .header h1 { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .header .logo { width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .header .ref { font-size: 14px; opacity: 0.8; margin-top: 8px; }
  .status-badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
  .body { padding: 32px; }
  .amount-section { text-align: center; padding-bottom: 28px; border-bottom: 1px solid #f1f5f9; }
  .amount-row { display: flex; align-items: center; justify-content: center; gap: 24px; }
  .amount-col { text-align: center; }
  .amount-col .label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  .amount-col .value { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 4px; }
  .amount-col .currency { font-size: 13px; color: #94a3b8; margin-top: 2px; }
  .arrow { width: 40px; height: 40px; border-radius: 50%; background: #f0f9ff; display: flex; align-items: center; justify-content: center; color: #0284c7; font-size: 18px; }
  .rate-info { font-size: 12px; color: #94a3b8; margin-top: 12px; }
  .details { padding-top: 24px; }
  .detail-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
  .detail-row .label { color: #64748b; }
  .detail-row .value { font-weight: 500; color: #0f172a; }
  .divider { height: 1px; background: #f1f5f9; margin: 16px 0; }
  .section-title { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
  .footer { padding: 24px 32px; background: #f8fafc; text-align: center; font-size: 11px; color: #94a3b8; }
  .footer a { color: #0284c7; text-decoration: none; }
  @media print { body { padding: 0; } .receipt { box-shadow: none; border-radius: 0; max-width: 100%; } }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <h1><span class="logo">R</span> RemitLet</h1>
    <div class="ref">Reference: ${transaction.reference}</div>
    <div class="status-badge">● ${statusText}</div>
  </div>
  <div class="body">
    <div class="amount-section">
      <div class="amount-row">
        <div class="amount-col">
          <div class="label">You Send</div>
          <div class="value">${formatAmount(transaction.send_amount, transaction.source_currency)}</div>
          <div class="currency">${srcMeta?.name ?? transaction.source_currency}</div>
        </div>
        <div class="arrow">→</div>
        <div class="amount-col">
          <div class="label">They Receive</div>
          <div class="value">${formatAmount(transaction.receive_amount, transaction.destination_currency)}</div>
          <div class="currency">${destMeta?.name ?? transaction.destination_currency}</div>
        </div>
      </div>
      <div class="rate-info">1 ${transaction.source_currency} = ${transaction.exchange_rate.toFixed(4)} ${transaction.destination_currency}</div>
    </div>
    <div class="details">
      <div class="section-title">Transfer Details</div>
      <div class="detail-row"><span class="label">Fee</span><span class="value">${formatAmount(transaction.fee_amount, transaction.source_currency)}</span></div>
      <div class="detail-row"><span class="label">Exchange Rate</span><span class="value">${transaction.exchange_rate.toFixed(4)}</span></div>
      <div class="detail-row"><span class="label">Purpose</span><span class="value">${PURPOSES[transaction.purpose].label}</span></div>
      <div class="detail-row"><span class="label">Created</span><span class="value">${formatDateTime(transaction.created_at)}</span></div>
      <div class="detail-row"><span class="label">Est. Delivery</span><span class="value">${formatDateTime(transaction.expected_delivery)}</span></div>
      ${transaction.completed_at ? `<div class="detail-row"><span class="label">Completed</span><span class="value">${formatDateTime(transaction.completed_at)}</span></div>` : ''}
    </div>
    ${recipient ? `
    <div class="divider"></div>
    <div class="details">
      <div class="section-title">Recipient</div>
      <div class="detail-row"><span class="label">Name</span><span class="value">${recipient.full_name}</span></div>
      <div class="detail-row"><span class="label">Country</span><span class="value">${recipient.country}</span></div>
      <div class="detail-row"><span class="label">Bank</span><span class="value">${recipient.bank_name}</span></div>
      <div class="detail-row"><span class="label">Account</span><span class="value">${recipient.account_number}</span></div>
      <div class="detail-row"><span class="label">Method</span><span class="value">${PAYMENT_METHODS[recipient.payment_method].label}</span></div>
    </div>` : ''}
    ${transaction.notes ? `
    <div class="divider"></div>
    <div class="details">
      <div class="section-title">Notes</div>
      <div style="font-size: 14px; color: #475569; padding: 4px 0;">${transaction.notes}</div>
    </div>` : ''}
  </div>
  <div class="footer">
    This receipt was generated by RemitLet · ${formatDateTime(new Date().toISOString())}<br/>
    Zero-markup FX transfers with guaranteed rate lock
  </div>
</div>
</body>
</html>`;
}

export function downloadReceipt(transaction: Transaction): void {
  const html = generateReceiptHTML(transaction);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.onload = () => {
      setTimeout(() => {
        w.print();
      }, 500);
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
