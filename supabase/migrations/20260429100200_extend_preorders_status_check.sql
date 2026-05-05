/*
  # Extender CHECK de status (Bloque 8.6 prep)

  Agregar nuevos estados del lifecycle: backorder, fulfilling, ready, delivered.
  Mantener legacy 'partial_payment' para no romper los 2 que ya estan ahi.
*/

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'preorders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%IN%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE preorders DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE preorders
  ADD CONSTRAINT preorders_status_check
  CHECK (status IN (
    'pending','contacted','confirmed','partial_payment',
    'backorder','fulfilling','ready','delivered',
    'cancelled'
  ));
