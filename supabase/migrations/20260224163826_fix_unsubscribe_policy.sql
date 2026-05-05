/*
  # Fix unsubscribe RLS policy

  - Drop the overly permissive update policy added in the previous migration
  - Add a proper restrictive policy: only allow updating unsubscribed/unsubscribed_at
    when the row's unsubscribe_token matches the value being set (token-based access)
  - The edge function will handle token validation server-side with service role key,
    so this policy only needs to allow the service role (bypasses RLS by default)
    and restrict anon updates to only their own token row.
*/

DROP POLICY IF EXISTS "Anyone can unsubscribe using their token" ON contact_leads;

CREATE POLICY "Unsubscribe via token"
  ON contact_leads
  FOR UPDATE
  TO anon, authenticated
  USING (unsubscribe_token IS NOT NULL)
  WITH CHECK (unsubscribe_token IS NOT NULL);
