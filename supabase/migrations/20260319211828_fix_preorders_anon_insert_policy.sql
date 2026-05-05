/*
  # Fix preorders INSERT policy for anonymous users

  ## Problem
  The existing INSERT policies exist but the anon role still gets blocked.
  This can happen when there are duplicate or conflicting policies.

  ## Changes
  - Drop and recreate both INSERT policies cleanly to ensure no conflicts
  - Explicitly grant INSERT to anon role on the preorders table
*/

DROP POLICY IF EXISTS "Anyone can create preorders" ON preorders;
DROP POLICY IF EXISTS "Authenticated users can create preorders" ON preorders;

CREATE POLICY "Anyone can create preorders"
  ON preorders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create preorders"
  ON preorders FOR INSERT
  TO authenticated
  WITH CHECK (true);

GRANT INSERT ON preorders TO anon;
GRANT INSERT ON preorders TO authenticated;
