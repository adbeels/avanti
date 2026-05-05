/*
  # Fix mundial_leads anon INSERT permissions

  The anon role was missing explicit table-level INSERT grant.
  RLS policies alone are not enough — the role also needs GRANT privileges.

  1. Changes
    - Grant INSERT on mundial_leads to anon role
    - Grant SELECT on mundial_leads to authenticated role
*/

GRANT INSERT ON TABLE public.mundial_leads TO anon;
GRANT SELECT ON TABLE public.mundial_leads TO authenticated;
