/*
  # Add payment tracking to preorders

  1. Modified Tables
    - `preorders`
      - `payment_confirmed_at` (timestamptz, nullable) - when payment was confirmed
      - `payment_method` (text, nullable) - payment method used (transferencia, efectivo, etc.)
      - `email_sent_at` (timestamptz, nullable) - when payment request email was sent

  2. Security
    - Add SELECT policy for authenticated users to manage preorders
    - Add UPDATE policy for authenticated users to update preorder status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'payment_confirmed_at'
  ) THEN
    ALTER TABLE preorders ADD COLUMN payment_confirmed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE preorders ADD COLUMN payment_method text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE preorders ADD COLUMN email_sent_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view preorders' AND tablename = 'preorders'
  ) THEN
    CREATE POLICY "Authenticated users can view preorders"
      ON preorders FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update preorders' AND tablename = 'preorders'
  ) THEN
    CREATE POLICY "Authenticated users can update preorders"
      ON preorders FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;