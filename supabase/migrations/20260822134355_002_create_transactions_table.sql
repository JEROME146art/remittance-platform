/*
# Create transactions table

1. New Tables
- `transactions` — individual money transfers sent by a user to a recipient.
  - `id` (uuid, primary key)
  - `user_id` (uuid, owner, defaults to auth.uid())
  - `recipient_id` (uuid, FK to recipients, cascade delete)
  - `reference` (text, unique human-readable tracking number, e.g. RMT-XXXXXX)
  - `status` (text: pending, in_progress, completed, failed, cancelled, refunded)
  - `stage` (text: initiated, verified, processing, settled, available)
  - `source_currency` (text, ISO 4217)
  - `destination_currency` (text, ISO 4217)
  - `send_amount` (numeric, amount in source currency)
  - `exchange_rate` (numeric, rate applied)
  - `fee_amount` (numeric, transfer fee)
  - `receive_amount` (numeric, computed destination amount after fee)
  - `purpose` (text, e.g. family_support, business, education)
  - `notes` (text, optional user note)
  - `status_history` (jsonb, array of {stage, timestamp, label} for tracking timeline)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `expected_delivery` (timestamptz, estimated arrival)
  - `completed_at` (timestamptz, when settled)
2. Security
- Enable RLS on `transactions`.
- Owner-scoped CRUD via auth.uid() = user_id.
3. Notes
- status_history powers the real-time tracking timeline UI.
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES recipients(id) ON DELETE SET NULL,
  reference text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed','cancelled','refunded')),
  stage text NOT NULL DEFAULT 'initiated' CHECK (stage IN ('initiated','verified','processing','settled','available','returned')),
  source_currency text NOT NULL DEFAULT 'USD',
  destination_currency text NOT NULL DEFAULT 'USD',
  send_amount numeric(18,2) NOT NULL DEFAULT 0,
  exchange_rate numeric(18,6) NOT NULL DEFAULT 1,
  fee_amount numeric(18,2) NOT NULL DEFAULT 0,
  receive_amount numeric(18,2) NOT NULL DEFAULT 0,
  purpose text NOT NULL DEFAULT 'other',
  notes text DEFAULT '',
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expected_delivery timestamptz,
  completed_at timestamptz
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at DESC);
