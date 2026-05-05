/*
  # Fix order_number NOT NULL constraint causing RLS violation

  ## Problem
  The `order_number` column is NOT NULL with no default value. When a row is inserted,
  Postgres evaluates RLS WITH CHECK before the BEFORE INSERT trigger runs.
  This means `order_number` is NULL at RLS check time, violating NOT NULL which
  surfaces as an RLS policy violation error.

  ## Fix
  - Add a temporary placeholder default to `order_number` so RLS check passes
  - The BEFORE INSERT trigger will then overwrite it with the real generated value
  - Also add explicit SECURITY DEFINER to the trigger function so it bypasses RLS
    when reading preorders to check for uniqueness
*/

ALTER TABLE preorders ALTER COLUMN order_number SET DEFAULT '';

CREATE OR REPLACE FUNCTION set_preorder_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;
