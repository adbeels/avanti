/*
  # Allow authenticated users to insert contact leads

  1. Changes
    - Adds an INSERT policy for the `authenticated` role on `contact_leads`
    - This allows admin users (logged in) to import contacts via CSV

  2. Notes
    - The existing `anon` INSERT policy remains for the public contact form
*/

CREATE POLICY "Authenticated users can insert contact leads"
  ON contact_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
