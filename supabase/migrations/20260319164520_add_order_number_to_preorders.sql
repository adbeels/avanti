/*
  # Add order_number to preorders

  ## Summary
  Adds a unique, auto-generated alphanumeric order number to every preorder for tracking and payment reference purposes.

  ## Changes
  - New column `order_number` (text, unique) on the `preorders` table
  - Auto-generated via a trigger on INSERT: 5-character uppercase alphanumeric string (letters A-Z and digits 0-9), e.g. "A3X9K"
  - Backfills all existing rows with unique values

  ## Notes
  1. The generation function retries up to 10 times to avoid collisions (extremely unlikely with 36^5 = ~60M combinations)
  2. The column is UNIQUE and NOT NULL after backfill
  3. Existing rows receive a generated order number retroactively
*/

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
  attempt int := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM preorders WHERE order_number = result);
    attempt := attempt + 1;
    IF attempt >= 10 THEN
      RAISE EXCEPTION 'Could not generate unique order number after 10 attempts';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE preorders ADD COLUMN order_number text;
  END IF;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM preorders WHERE order_number IS NULL LOOP
    UPDATE preorders SET order_number = generate_order_number() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE preorders ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE preorders ADD CONSTRAINT preorders_order_number_unique UNIQUE (order_number);

CREATE OR REPLACE FUNCTION set_preorder_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_preorder_order_number ON preorders;
CREATE TRIGGER trg_set_preorder_order_number
  BEFORE INSERT ON preorders
  FOR EACH ROW EXECUTE FUNCTION set_preorder_order_number();
