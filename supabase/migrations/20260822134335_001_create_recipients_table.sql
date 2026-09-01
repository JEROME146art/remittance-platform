/*
# Create recipients table

1. New Tables
- `recipients` — people who receive money transfers from the user.
  - `id` (uuid, primary key)
  - `user_id` (uuid, owner of the recipient, defaults to auth.uid())
  - `full_name` (text, recipient display name)
  - `country` (text, destination country)
  - `currency_code` (text, ISO 4217 currency code, e.g. USD, EUR)
  - `bank_name` (text, recipient bank)
  - `account_number` (text, masked account reference)
  - `routing_code` (text, optional bank routing / SWIFT / IBAN)
  - `payment_method` (text, e.g. bank, wallet, cash_pickup)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
2. Security
- Enable RLS on `recipients`.
- Owner-scoped CRUD: each authenticated user can only access their own recipients.
3. Notes
- `user_id` defaults to auth.uid() so frontend inserts that omit it still satisfy the INSERT WITH CHECK.
*/

CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  country text NOT NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  bank_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  routing_code text DEFAULT '',
  payment_method text NOT NULL DEFAULT 'bank' CHECK (payment_method IN ('bank','wallet','cash_pickup','card')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recipients" ON recipients;
CREATE POLICY "select_own_recipients" ON recipients
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_recipients" ON recipients;
CREATE POLICY "insert_own_recipients" ON recipients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_recipients" ON recipients;
CREATE POLICY "update_own_recipients" ON recipients
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_recipients" ON recipients;
CREATE POLICY "delete_own_recipients" ON recipients
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recipients_user_id_idx ON recipients(user_id);
