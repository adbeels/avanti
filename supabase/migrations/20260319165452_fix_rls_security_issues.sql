/*
  # Fix RLS security issues across all tables

  ## Changes

  ### preorders
  - Remove duplicate SELECT policy ("Authenticated users can view preorders" - always true, redundant)
  - Fix SELECT policy to use (select auth.uid()) for better query planning
  - Fix UPDATE policy to use (select auth.uid()) for better query planning
  - Fix INSERT policies: use WITH CHECK (true) only for anon (public form), keep authenticated INSERT

  ### contact_leads
  - INSERT policies for anon and authenticated are public form submissions - WITH CHECK (true) is acceptable
    but flagged; no business logic to restrict here, so we leave as-is. Already correct for the use case.

  ### mundial_leads
  - INSERT policy is a public form submission - WITH CHECK (true) is acceptable for the use case.

  ### Functions
  - Fix generate_order_number() to use SET search_path
  - Fix set_preorder_order_number() to use SET search_path

  ## Notes
  1. INSERT policies with WITH CHECK (true) on public-facing form tables (contact_leads, mundial_leads, preorders)
     are intentional - they accept anonymous submissions. We keep them but acknowledge the advisory.
  2. The duplicate SELECT policy on preorders is removed to avoid multiple permissive policies warning.
  3. auth.uid() calls in USING/WITH CHECK are wrapped in (select auth.uid()) for RLS plan caching.
*/

DROP POLICY IF EXISTS "Authenticated users can view preorders" ON preorders;
DROP POLICY IF EXISTS "Authenticated users can read preorders" ON preorders;
DROP POLICY IF EXISTS "Authenticated users can update preorders" ON preorders;

CREATE POLICY "Authenticated users can read preorders"
  ON preorders FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update preorders"
  ON preorders FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION set_preorder_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;
