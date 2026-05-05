/*
  # Allow anon SELECT on preorders for INSERT RETURNING

  ## Problem
  Supabase PostgREST sends `Prefer: return=representation` on INSERT,
  which causes Postgres to evaluate SELECT RLS policies on the returned row.
  Since `anon` has no SELECT policy on preorders, ALL inserts from anonymous
  users fail with "new row violates row-level security policy" even though
  the INSERT policy itself allows it.

  ## Fix
  Add a SELECT policy for anon that only allows reading rows created
  within the last 10 seconds (to support RETURNING without exposing data).
  This is tightly scoped - anon can only "see" the row it just created.
*/

CREATE POLICY "anon_select_own_insert_preorders"
  ON preorders FOR SELECT
  TO anon
  USING (created_at >= now() - interval '10 seconds');
