/*
  # Agregar campo de monto de pago parcial en prepedidos

  ## Cambios
  - Nueva columna `partial_payment_amount` en la tabla `preorders`
    - Tipo: numeric, nullable
    - Almacena el monto que el cliente ya pagó cuando el estado es "pago parcial"
    - Permite calcular automáticamente el saldo restante (total - partial_payment_amount)

  ## Notas
  - Columna opcional: solo se llena cuando el estado es "partial_payment"
  - No requiere cambios en RLS existentes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'preorders' AND column_name = 'partial_payment_amount'
  ) THEN
    ALTER TABLE preorders ADD COLUMN partial_payment_amount numeric DEFAULT NULL;
  END IF;
END $$;
