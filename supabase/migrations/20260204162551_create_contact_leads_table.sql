/*
  # Create Contact Leads Table

  1. New Tables
    - `contact_leads`
      - `id` (uuid, primary key) - Unique identifier for each contact lead
      - `name` (text) - Full name of the contact person
      - `email` (text) - Email address for contact
      - `phone` (text) - Phone number (optional)
      - `company` (text) - Company name (optional)
      - `message` (text) - Contact message or inquiry
      - `interested_brands` (text array) - Array of brand names the contact is interested in
      - `created_at` (timestamptz) - Timestamp when the contact was submitted
  
  2. Security
    - Enable RLS on `contact_leads` table
    - Add policy for inserting new contact leads (public access to submit)
    - Add policy for authenticated users to read contact leads
*/

CREATE TABLE IF NOT EXISTS contact_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  message text,
  interested_brands text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact leads"
  ON contact_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read contact leads"
  ON contact_leads
  FOR SELECT
  TO authenticated
  USING (true);