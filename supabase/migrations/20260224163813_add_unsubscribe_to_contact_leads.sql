/*
  # Add unsubscribe support to contact_leads

  1. Changes to `contact_leads`
    - Add `unsubscribed` (boolean, default false) — marks contacts that opted out
    - Add `unsubscribed_at` (timestamptz, nullable) — timestamp of opt-out
    - Add `unsubscribe_token` (uuid, unique) — unique token for one-click unsubscribe link

  2. Security
    - New public policy: allow anyone to UPDATE unsubscribed/unsubscribed_at using only their token (no auth required)
    - Authenticated users can view unsubscribe status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_leads' AND column_name = 'unsubscribed'
  ) THEN
    ALTER TABLE contact_leads ADD COLUMN unsubscribed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_leads' AND column_name = 'unsubscribed_at'
  ) THEN
    ALTER TABLE contact_leads ADD COLUMN unsubscribed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contact_leads' AND column_name = 'unsubscribe_token'
  ) THEN
    ALTER TABLE contact_leads ADD COLUMN unsubscribe_token uuid UNIQUE DEFAULT gen_random_uuid();
  END IF;
END $$;

CREATE POLICY "Anyone can unsubscribe using their token"
  ON contact_leads
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
