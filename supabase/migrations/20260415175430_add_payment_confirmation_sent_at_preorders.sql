/*
  # Add payment_confirmation_sent_at to preorders

  ## Summary
  Adds a new column to track when the payment confirmation email was sent
  to the customer after their payment was confirmed.

  ## Changes
  - preorders: new column `payment_confirmation_sent_at` (timestamptz, nullable)
    Records the exact timestamp when the payment confirmation email was dispatched.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'payment_confirmation_sent_at'
  ) THEN
    ALTER TABLE preorders ADD COLUMN payment_confirmation_sent_at timestamptz DEFAULT NULL;
  END IF;
END $$;
