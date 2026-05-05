/*
  # Create mundial_leads table

  ## Purpose
  Stores form submissions from the "Experiencia Mundialista Avanti 2026" landing page.

  ## New Tables
  - `mundial_leads`
    - `id` (uuid, primary key, auto-generated)
    - `name` (text, required) — full name of the contact
    - `email` (text, required) — email address
    - `company` (text, required) — company name
    - `role` (text, required) — area of interest: 'ventas', 'logistica', or 'estrategia'
    - `purchase_intent` (text, required) — purchase intention regarding World Cup campaign
    - `utm_source` (text, optional) — tracking source from URL params
    - `created_at` (timestamptz) — submission timestamp

  ## Security
  - RLS enabled
  - Anonymous users can INSERT (public landing page)
  - Authenticated users (admins) can SELECT all rows
*/

CREATE TABLE IF NOT EXISTS mundial_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  role text NOT NULL CHECK (role IN ('ventas', 'logistica', 'estrategia')),
  purchase_intent text NOT NULL,
  utm_source text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mundial_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit mundial lead"
  ON mundial_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view mundial leads"
  ON mundial_leads
  FOR SELECT
  TO authenticated
  USING (true);
