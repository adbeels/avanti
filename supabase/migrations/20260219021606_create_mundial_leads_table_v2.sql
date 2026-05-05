/*
  # Create mundial_leads table (v2)

  1. New Tables
    - `mundial_leads`
      - `id` (uuid, primary key)
      - `last_name` (text) - maps to Zoho "Last Name"
      - `company` (text) - maps to Zoho "Company"
      - `email` (text, optional)
      - `mobile` (text, optional)
      - `submitted_at` (timestamptz) - when the form was submitted
      - `zoho_payload` (jsonb) - full payload sent to Zoho for debugging

  2. Security
    - Enable RLS
    - Allow anonymous INSERT (public form, no auth required)
    - Only authenticated users can SELECT (admin panel access)
*/

CREATE TABLE IF NOT EXISTS mundial_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_name text NOT NULL,
  company text NOT NULL,
  email text DEFAULT '',
  mobile text DEFAULT '',
  submitted_at timestamptz DEFAULT now(),
  zoho_payload jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE mundial_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a mundial lead"
  ON mundial_leads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view mundial leads"
  ON mundial_leads FOR SELECT
  TO authenticated
  USING (true);
