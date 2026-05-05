/*
  # Fix generate_order_number to use SECURITY DEFINER

  ## Problem
  The `generate_order_number()` function does a SELECT on the preorders table
  to check for duplicate order numbers. When called during an INSERT by the
  `anon` role (via the BEFORE INSERT trigger), the SELECT inside the function
  fails silently due to RLS - the anon role has no SELECT policy.
  This causes the entire INSERT to fail with an RLS violation error.

  ## Fix
  Recreate `generate_order_number()` with SECURITY DEFINER so it runs
  with the privileges of the function owner (postgres/superuser), bypassing
  RLS when checking for duplicate order numbers.
*/

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
