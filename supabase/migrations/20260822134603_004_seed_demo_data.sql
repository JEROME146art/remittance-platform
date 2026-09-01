/*
# Seed demo user and data

1. Purpose
- Create a demo account (demo@remitlet.com / password: demo1234) so the app feels alive on first load.
- Insert a profile, several recipients, a variety of transactions across statuses, and notifications.

2. What is inserted
- 1 auth.users row for the demo account (idempotent — guarded by email check).
- 1 profiles row.
- 6 recipients across different countries/currencies.
- 12 transactions spanning pending, in_progress, completed, failed, refunded with realistic exchange rates, fees, and status_history timelines.
- 8 notifications linked to transactions.

3. Security
- No policy changes. All inserts are run as a privileged role (service role), which bypasses RLS, so ownership still maps to the demo user's id.
- RLS continues to protect the tables for anon/authenticated access.

4. Notes
- The demo user password hash uses crypt() with the bcrypt '$2a$' scheme compatible with Supabase auth.
- status_history is a jsonb array of {stage, timestamp, label} entries that drive the tracking timeline UI.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Demo auth user (stable fixed UUID).
DO $$
DECLARE
  demo_id uuid := 'a1b2c3d4-0000-0000-0000-000000000001';
  existing uuid;
BEGIN
  SELECT id INTO existing FROM auth.users WHERE email = 'demo@remitlet.com';
  IF existing IS NULL THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      demo_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'demo@remitlet.com',
      crypt('demo1234', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{}'::jsonb,
      '{}'::jsonb
    );
  END IF;
END $$;

-- Profile
INSERT INTO profiles (id, display_name, home_currency, avatar_color)
VALUES ('a1b2c3d4-0000-0000-0000-000000000001', 'Alex Morgan', 'USD', 'teal')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  home_currency = EXCLUDED.home_currency,
  avatar_color = EXCLUDED.avatar_color;

-- Recipients (valid UUIDs)
INSERT INTO recipients (id, user_id, full_name, country, currency_code, bank_name, account_number, routing_code, payment_method, created_at)
VALUES
  ('b1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sofia Ramirez', 'Mexico', 'MXN', 'Banco de Mexico', '**** 4471', 'BNMXMXMM', 'bank', now() - interval '40 days'),
  ('b1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Liam O''Connor', 'Ireland', 'EUR', 'Bank of Ireland', '**** 8821', 'BOFIIE2D', 'bank', now() - interval '38 days'),
  ('b1b2c3d4-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Aisha Khan', 'Pakistan', 'PKR', 'HBL Bank', '**** 2209', 'HABBPKKA', 'wallet', now() - interval '30 days'),
  ('b1b2c3d4-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Chen Wei', 'Singapore', 'SGD', 'DBS Bank', '**** 7361', 'DBSSSGSG', 'bank', now() - interval '22 days'),
  ('b1b2c3d4-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Fatima Al-Sayed', 'Egypt', 'EGP', 'CIB Egypt', '**** 1190', 'CIBEEGCX', 'cash_pickup', now() - interval '15 days'),
  ('b1b2c3d4-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Diego Santos', 'Brazil', 'BRL', 'Itau Unibanco', '**** 5532', 'ITAUBRSP', 'bank', now() - interval '6 days')
ON CONFLICT (id) DO NOTHING;

-- Transactions
INSERT INTO transactions (id, user_id, recipient_id, reference, status, stage, source_currency, destination_currency, send_amount, exchange_rate, fee_amount, receive_amount, purpose, notes, status_history, created_at, expected_delivery, completed_at)
VALUES
  (
    'c1b2c3d4-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000001',
    'RMT-482017',
    'completed', 'available',
    'USD', 'MXN', 1500.00, 17.42, 8.50, 26039.00, 'family_support', 'Monthly support for family',
    '[{"stage":"initiated","timestamp":"2026-07-20T10:02:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-07-20T10:15:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-07-20T11:40:00Z","label":"Funds in transit"},{"stage":"settled","timestamp":"2026-07-21T08:10:00Z","label":"Sent to partner bank"},{"stage":"available","timestamp":"2026-07-21T14:22:00Z","label":"Available to recipient"}]'::jsonb,
    now() - interval '32 days', now() - interval '31 days', now() - interval '31 days'
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000002',
    'RMT-482318',
    'completed', 'available',
    'USD', 'EUR', 2200.00, 0.92, 12.00, 2016.40, 'business', 'Invoice 2043 settlement',
    '[{"stage":"initiated","timestamp":"2026-07-25T09:00:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-07-25T09:20:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-07-25T12:00:00Z","label":"Funds in transit"},{"stage":"settled","timestamp":"2026-07-26T07:30:00Z","label":"Sent to partner bank"},{"stage":"available","timestamp":"2026-07-26T11:00:00Z","label":"Available to recipient"}]'::jsonb,
    now() - interval '27 days', now() - interval '26 days', now() - interval '26 days'
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000003',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000003',
    'RMT-482601',
    'completed', 'available',
    'USD', 'PKR', 800.00, 278.5, 6.00, 222520.00, 'family_support', '',
    '[{"stage":"initiated","timestamp":"2026-08-01T14:05:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-08-01T14:30:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-08-01T18:00:00Z","label":"Funds in transit"},{"stage":"settled","timestamp":"2026-08-02T06:45:00Z","label":"Sent to partner bank"},{"stage":"available","timestamp":"2026-08-02T10:15:00Z","label":"Available to recipient"}]'::jsonb,
    now() - interval '20 days', now() - interval '19 days', now() - interval '19 days'
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000004',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000004',
    'RMT-482890',
    'in_progress', 'processing',
    'USD', 'SGD', 3000.00, 1.34, 15.00, 4006.80, 'business', 'Supplier deposit',
    '[{"stage":"initiated","timestamp":"2026-08-18T08:00:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-08-18T08:25:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-08-18T13:00:00Z","label":"Funds in transit"}]'::jsonb,
    now() - interval '4 days', now() + interval '1 day', NULL
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000005',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000005',
    'RMT-482945',
    'pending', 'initiated',
    'USD', 'EGP', 600.00, 48.7, 5.00, 29122.00, 'education', 'Tuition payment',
    '[{"stage":"initiated","timestamp":"2026-08-21T16:10:00Z","label":"Transfer initiated"}]'::jsonb,
    now() - interval '1 day', now() + interval '2 days', NULL
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000006',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000006',
    'RMT-482960',
    'completed', 'available',
    'USD', 'BRL', 1200.00, 5.08, 9.00, 6064.92, 'family_support', '',
    '[{"stage":"initiated","timestamp":"2026-08-10T11:00:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-08-10T11:20:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-08-10T15:00:00Z","label":"Funds in transit"},{"stage":"settled","timestamp":"2026-08-11T08:00:00Z","label":"Sent to partner bank"},{"stage":"available","timestamp":"2026-08-11T12:30:00Z","label":"Available to recipient"}]'::jsonb,
    now() - interval '12 days', now() - interval '11 days', now() - interval '11 days'
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000007',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000001',
    'RMT-482101',
    'failed', 'returned',
    'USD', 'MXN', 900.00, 17.38, 7.00, 15572.62, 'family_support', 'Returned due to incorrect account details',
    '[{"stage":"initiated","timestamp":"2026-07-15T09:30:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-07-15T09:45:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-07-15T14:00:00Z","label":"Funds in transit"},{"stage":"returned","timestamp":"2026-07-16T10:00:00Z","label":"Returned by partner bank"}]'::jsonb,
    now() - interval '37 days', now() - interval '36 days', NULL
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000008',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000002',
    'RMT-482205',
    'refunded', 'returned',
    'USD', 'EUR', 1750.00, 0.93, 10.00, 1614.70, 'business', 'Refunded after cancellation',
    '[{"stage":"initiated","timestamp":"2026-06-28T13:00:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-06-28T13:20:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-06-28T17:00:00Z","label":"Funds in transit"},{"stage":"returned","timestamp":"2026-07-01T09:00:00Z","label":"Refunded to sender"}]'::jsonb,
    now() - interval '54 days', now() - interval '53 days', NULL
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000009',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000003',
    'RMT-482770',
    'completed', 'available',
    'USD', 'PKR', 450.00, 279.1, 4.50, 125263.05, 'family_support', '',
    '[{"stage":"initiated","timestamp":"2026-08-05T10:00:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-08-05T10:15:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-08-05T14:00:00Z","label":"Funds in transit"},{"stage":"settled","timestamp":"2026-08-06T07:00:00Z","label":"Sent to partner bank"},{"stage":"available","timestamp":"2026-08-06T11:00:00Z","label":"Available to recipient"}]'::jsonb,
    now() - interval '16 days', now() - interval '15 days', now() - interval '15 days'
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000010',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000004',
    'RMT-482502',
    'completed', 'available',
    'USD', 'SGD', 1800.00, 1.35, 10.00, 2416.50, 'business', 'Freelance payment',
    '[{"stage":"initiated","timestamp":"2026-07-28T09:00:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-07-28T09:18:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-07-28T12:30:00Z","label":"Funds in transit"},{"stage":"settled","timestamp":"2026-07-29T07:45:00Z","label":"Sent to partner bank"},{"stage":"available","timestamp":"2026-07-29T10:30:00Z","label":"Available to recipient"}]'::jsonb,
    now() - interval '24 days', now() - interval '23 days', now() - interval '23 days'
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000011',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000006',
    'RMT-482388',
    'in_progress', 'verified',
    'USD', 'BRL', 2400.00, 5.06, 14.00, 12094.16, 'business', 'Equipment purchase',
    '[{"stage":"initiated","timestamp":"2026-08-20T15:30:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-08-20T15:50:00Z","label":"Payment verified"}]'::jsonb,
    now() - interval '2 days', now() + interval '12 hours', NULL
  ),
  (
    'c1b2c3d4-0000-0000-0000-000000000012',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'b1b2c3d4-0000-0000-0000-000000000005',
    'RMT-482312',
    'completed', 'available',
    'USD', 'EGP', 1100.00, 48.5, 8.00, 53318.00, 'education', 'Course fees',
    '[{"stage":"initiated","timestamp":"2026-07-22T12:00:00Z","label":"Transfer initiated"},{"stage":"verified","timestamp":"2026-07-22T12:18:00Z","label":"Payment verified"},{"stage":"processing","timestamp":"2026-07-22T16:00:00Z","label":"Funds in transit"},{"stage":"settled","timestamp":"2026-07-23T08:15:00Z","label":"Sent to partner bank"},{"stage":"available","timestamp":"2026-07-23T13:00:00Z","label":"Available to recipient"}]'::jsonb,
    now() - interval '30 days', now() - interval '29 days', now() - interval '29 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Notifications
INSERT INTO notifications (id, user_id, transaction_id, type, title, body, is_read, created_at)
VALUES
  ('d1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'c1b2c3d4-0000-0000-0000-000000000005', 'status_update', 'Transfer initiated', 'Your transfer RMT-482945 to Fatima Al-Sayed has been initiated.', false, now() - interval '1 day'),
  ('d1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'c1b2c3d4-0000-0000-0000-000000000004', 'status_update', 'Funds in transit', 'Your transfer RMT-482890 to Chen Wei is now processing.', false, now() - interval '3 days'),
  ('d1b2c3d4-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'c1b2c3d4-0000-0000-0000-000000000006', 'payment_sent', 'Transfer completed', 'RMT-482960 to Diego Santos was delivered successfully.', true, now() - interval '11 days'),
  ('d1b2c3d4-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'c1b2c3d4-0000-0000-0000-000000000007', 'failed', 'Transfer failed', 'RMT-482101 was returned due to incorrect account details.', true, now() - interval '36 days'),
  ('d1b2c3d4-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'c1b2c3d4-0000-0000-0000-000000000008', 'refunded', 'Refund processed', 'RMT-482205 was refunded to your account.', true, now() - interval '53 days'),
  ('d1b2c3d4-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'c1b2c3d4-0000-0000-0000-000000000001', 'payment_sent', 'Transfer completed', 'RMT-482017 to Sofia Ramirez was delivered successfully.', true, now() - interval '31 days'),
  ('d1b2c3d4-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', NULL, 'rate_alert', 'Favorable rate alert', 'USD to MXN reached 17.42 — a 30-day high.', false, now() - interval '5 hours'),
  ('d1b2c3d4-0000-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000001', 'c1b2c3d4-0000-0000-0000-000000000011', 'status_update', 'Payment verified', 'Your transfer RMT-482388 to Diego Santos was verified.', false, now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;
