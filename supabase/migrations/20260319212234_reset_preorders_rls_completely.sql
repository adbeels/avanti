/*
  # Reset preorders RLS completely

  ## Problem
  Despite correct-looking INSERT policies for anon role, inserts still fail with
  RLS violation. This migration does a full reset: disable RLS, drop all policies,
  re-enable RLS, and recreate only the necessary policies from scratch.

  ## Changes
  - Disable RLS temporarily on preorders
  - Drop ALL existing policies on preorders
  - Re-enable RLS
  - Recreate minimal required policies cleanly
*/

ALTER TABLE preorders DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create preorders" ON preorders;
DROP POLICY IF EXISTS "Authenticated users can create preorders" ON preorders;
DROP POLICY IF EXISTS "Authenticated users can read preorders" ON preorders;
DROP POLICY IF EXISTS "Authenticated users can update preorders" ON preorders;
DROP POLICY IF EXISTS "Authenticated users can view preorders" ON preorders;
DROP POLICY IF EXISTS "Authenticated users can delete preorders" ON preorders;

ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_preorders"
  ON preorders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "auth_insert_preorders"
  ON preorders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_select_preorders"
  ON preorders FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_update_preorders"
  ON preorders FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
