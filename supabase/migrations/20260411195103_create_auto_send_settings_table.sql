/*
  # Create auto_send_settings table

  ## Summary
  Stores global configuration for the automatic payment email sender.

  ## New Tables
  - `auto_send_settings`
    - `id` (int, primary key, always 1 — singleton row)
    - `enabled` (boolean) — whether auto-send is active
    - `delay_minutes` (integer) — how many minutes after a new preorder arrives before sending the payment email
    - `bank_info` (text) — the bank transfer details included in the email
    - `subject` (text) — email subject line
    - `updated_at` (timestamptz) — last modified

  ## Security
  - RLS enabled
  - Only authenticated users (admins) can read or update the row
  - Anonymous users have no access
*/

CREATE TABLE IF NOT EXISTS auto_send_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  delay_minutes integer NOT NULL DEFAULT 0,
  bank_info text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT 'Confirmación de pedido y solicitud de pago - Avanti México',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT auto_send_settings_singleton CHECK (id = 1)
);

ALTER TABLE auto_send_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read auto send settings"
  ON auto_send_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update auto send settings"
  ON auto_send_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert auto send settings"
  ON auto_send_settings FOR INSERT
  TO authenticated
  WITH CHECK (id = 1);

INSERT INTO auto_send_settings (id, enabled, delay_minutes, bank_info, subject)
VALUES (
  1,
  false,
  0,
  E'Banco: BBVA\nTitular: AVANTI, INCUBADORA DE MARCAS SA DE CV\nCLABE: 012180001181732227\nCuenta: 0118173222\nReferencia: [número de pedido]',
  'Confirmación de pedido y solicitud de pago - Avanti México'
)
ON CONFLICT (id) DO NOTHING;
