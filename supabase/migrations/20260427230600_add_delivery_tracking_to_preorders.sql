/*
  # Add delivery tracking to preorders

  Agrega columnas para organizar la entrega del producto fisico tras la confirmacion de pago.

  1. Modified Tables
    - `preorders`
      - `delivery_status` (text, default 'pending') - pending | ready | delivered
      - `delivery_method` (text, nullable) - pickup | courier | wholesale
      - `delivery_ready_at` (timestamptz, nullable) - cuando se marco listo
      - `delivered_at` (timestamptz, nullable) - cuando se confirmo entrega
      - `delivery_notes` (text, default '') - notas adicionales (direccion mayorista, comentarios)
      - `delivery_ready_email_sent_at` (timestamptz, nullable) - tracking del correo "listo para retirar"

  2. Constraints
    - CHECK en `delivery_status` con valores permitidos
    - CHECK en `delivery_method` con valores permitidos (acepta NULL)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE preorders ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'delivery_method'
  ) THEN
    ALTER TABLE preorders ADD COLUMN delivery_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'delivery_ready_at'
  ) THEN
    ALTER TABLE preorders ADD COLUMN delivery_ready_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE preorders ADD COLUMN delivered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'delivery_notes'
  ) THEN
    ALTER TABLE preorders ADD COLUMN delivery_notes text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'delivery_ready_email_sent_at'
  ) THEN
    ALTER TABLE preorders ADD COLUMN delivery_ready_email_sent_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'preorders_delivery_status_check'
  ) THEN
    ALTER TABLE preorders
      ADD CONSTRAINT preorders_delivery_status_check
      CHECK (delivery_status IN ('pending', 'ready', 'delivered'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'preorders_delivery_method_check'
  ) THEN
    ALTER TABLE preorders
      ADD CONSTRAINT preorders_delivery_method_check
      CHECK (delivery_method IS NULL OR delivery_method IN ('pickup', 'courier', 'wholesale'));
  END IF;
END $$;
