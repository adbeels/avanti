/*
  # Create preorders table for Panini product orders

  1. New Tables
    - `preorders`
      - `id` (uuid, primary key)
      - `name` (text) - Customer full name
      - `email` (text) - Customer email
      - `phone` (text) - Customer phone number
      - `company` (text, nullable) - Company or business name
      - `city` (text) - City
      - `state` (text) - State/Province
      - `notes` (text, nullable) - Additional notes
      - `items` (jsonb) - Array of order items with product, quantity, unit_price, subtotal
      - `total` (numeric) - Order total amount
      - `status` (text) - Order status: pending, confirmed, shipped, delivered, cancelled
      - `created_at` (timestamptz) - Creation timestamp
  2. Security
    - Enable RLS on `preorders` table
    - Add policy for anonymous users to insert preorders (public order form)
    - Add policy for authenticated users to read all preorders (admin)
    - Add policy for authenticated users to update preorders (admin)
*/

CREATE TABLE IF NOT EXISTS preorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text DEFAULT '',
  city text NOT NULL,
  state text NOT NULL,
  notes text DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create preorders"
  ON preorders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read preorders"
  ON preorders
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update preorders"
  ON preorders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
