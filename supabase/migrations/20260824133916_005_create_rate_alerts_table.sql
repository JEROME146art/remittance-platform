/*
# Create rate_alerts table

1. New Tables
- `rate_alerts` — user-defined alerts that fire a notification when a currency pair
  reaches a target exchange rate.
  - `id` (uuid, primary key)
  - `user_id` (uuid, owner, defaults to auth.uid())
  - `from_currency` (text, ISO 4217, e.g. USD)
  - `to_currency` (text, ISO 4217, e.g. MXN)
  - `target_rate` (numeric, the threshold the user wants to be notified about)
  - `direction` (text: 'above' or 'below' — whether to alert when the rate goes
    above or below the target)
  - `is_active` (boolean, default true — set to false once triggered so it's one-shot)
  - `triggered_rate` (numeric, nullable — the actual rate when it fired)
  - `triggered_at` (timestamptz, nullable — when the alert fired)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
2. Security
- Enable RLS on `rate_alerts`.
- Owner-scoped CRUD via auth.uid() = user_id.
3. Notes
- The frontend checks active alerts against live rates on each refresh (every 15s).
- When an alert fires, the frontend inserts a notification and sets is_active = false.
*/

CREATE TABLE IF NOT EXISTS rate_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  target_rate numeric(18,6) NOT NULL,
  direction text NOT NULL DEFAULT 'above' CHECK (direction IN ('above','below')),
  is_active boolean NOT NULL DEFAULT true,
  triggered_rate numeric(18,6),
  triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rate_alerts" ON rate_alerts;
CREATE POLICY "select_own_rate_alerts" ON rate_alerts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_rate_alerts" ON rate_alerts;
CREATE POLICY "insert_own_rate_alerts" ON rate_alerts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_rate_alerts" ON rate_alerts;
CREATE POLICY "update_own_rate_alerts" ON rate_alerts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_rate_alerts" ON rate_alerts;
CREATE POLICY "delete_own_rate_alerts" ON rate_alerts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS rate_alerts_user_id_idx ON rate_alerts(user_id);
CREATE INDEX IF NOT EXISTS rate_alerts_active_idx ON rate_alerts(is_active);
