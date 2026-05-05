/*
  # Make city and state optional on preorders

  1. Changes
    - Make `city` column nullable with empty string default
    - Make `state` column nullable with empty string default
  
  2. Reason
    - Delivery is not needed; pickup at office
    - City and state are no longer required fields
*/

ALTER TABLE preorders ALTER COLUMN city DROP NOT NULL;
ALTER TABLE preorders ALTER COLUMN city SET DEFAULT '';

ALTER TABLE preorders ALTER COLUMN state DROP NOT NULL;
ALTER TABLE preorders ALTER COLUMN state SET DEFAULT '';
