export type TransactionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type TransactionStage =
  | 'initiated'
  | 'verified'
  | 'processing'
  | 'settled'
  | 'available'
  | 'returned';

export type PaymentMethod = 'bank' | 'wallet' | 'cash_pickup' | 'card';

export type NotificationType =
  | 'payment_sent'
  | 'payment_received'
  | 'status_update'
  | 'rate_alert'
  | 'failed'
  | 'refunded';

export type Purpose =
  | 'family_support'
  | 'business'
  | 'education'
  | 'savings'
  | 'medical'
  | 'other';

export interface StatusHistoryEntry {
  stage: TransactionStage;
  timestamp: string;
  label: string;
}

export interface Recipient {
  id: string;
  user_id: string;
  full_name: string;
  country: string;
  currency_code: string;
  bank_name: string;
  account_number: string;
  routing_code: string | null;
  payment_method: PaymentMethod;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  recipient_id: string | null;
  reference: string;
  status: TransactionStatus;
  stage: TransactionStage;
  source_currency: string;
  destination_currency: string;
  send_amount: number;
  exchange_rate: number;
  fee_amount: number;
  receive_amount: number;
  purpose: Purpose;
  notes: string | null;
  status_history: StatusHistoryEntry[];
  created_at: string;
  updated_at: string;
  expected_delivery: string | null;
  completed_at: string | null;
  recipient?: Recipient | null;
}

export interface Notification {
  id: string;
  user_id: string;
  transaction_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  transaction?: Transaction | null;
}

export interface Profile {
  id: string;
  display_name: string;
  home_currency: string;
  avatar_color: string;
  created_at: string;
}

export interface RateAlert {
  id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  target_rate: number;
  direction: 'above' | 'below';
  is_active: boolean;
  triggered_rate: number | null;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}
