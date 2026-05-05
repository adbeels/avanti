/*
  # Fix preorders insert policy

  1. Changes
    - Add INSERT policy for authenticated role on preorders table
    - This ensures both anonymous and authenticated users can create preorders

  2. Security
    - Both anon and authenticated roles can insert preorders
    - Existing read/update policies for authenticated users remain unchanged
*/

CREATE POLICY "Authenticated users can create preorders"
  ON preorders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
