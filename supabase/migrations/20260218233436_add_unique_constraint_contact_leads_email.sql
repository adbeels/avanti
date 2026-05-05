/*
  # Add unique constraint to contact_leads.email

  1. Changes
    - Adds a UNIQUE constraint on the `email` column of `contact_leads`
    - Required to support upsert/ON CONFLICT operations during CSV import

  2. Notes
    - Existing rows with duplicate emails will cause this to fail; duplicates are
      cleaned up first by keeping only the most recent row per email.
*/

DELETE FROM contact_leads
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM contact_leads
  ORDER BY email, created_at DESC
);

ALTER TABLE contact_leads
  ADD CONSTRAINT contact_leads_email_unique UNIQUE (email);
