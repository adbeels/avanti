/*
  # apply_movement() - unica forma de cambiar stock (Bloque 3.2)

  Recibe un tipo de movimiento + datos y aplica de forma atomica:
    1. Asegura que existe la fila stock_levels (UPSERT con 0,0)
    2. Modifica on_hand y/o reserved segun el tipo
    3. Inserta la fila correspondiente en inventory_movements

  Si los CHECK constraints fallan (on_hand >= 0, reserved >= 0, reserved <= on_hand),
  la transaccion entera aborta - no se inserta el movimiento ni se modifica el stock.
  Esto es la garantia de "no stock negativo" y "no sobre-reservar".

  Tipos validos:
    entry, exit, adjustment_plus, adjustment_minus, transfer_out, transfer_in, reservation, release

  La aplicacion debe orquestar transacciones complejas:
    - Picking de un pedido reservado: PRIMERO 'release', DESPUES 'exit' (orden importa)
    - Transferencia: 'transfer_out' en origen, 'transfer_in' en destino, mismo reference_id
    - Cancelacion de pedido: 'release' por cada reservation pendiente
*/

CREATE OR REPLACE FUNCTION apply_movement(
  p_type           TEXT,
  p_product_id     UUID,
  p_warehouse_id   UUID,
  p_qty            NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id   UUID DEFAULT NULL,
  p_notes          TEXT DEFAULT ''
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_movement_id UUID;
  v_user_id     UUID := auth.uid();
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'apply_movement: qty debe ser > 0 (recibido: %)', p_qty;
  END IF;

  IF p_type NOT IN ('entry','exit','adjustment_plus','adjustment_minus','transfer_out','transfer_in','reservation','release') THEN
    RAISE EXCEPTION 'apply_movement: tipo invalido: %', p_type;
  END IF;

  IF p_product_id IS NULL OR p_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'apply_movement: product_id y warehouse_id son obligatorios';
  END IF;

  INSERT INTO stock_levels (product_id, warehouse_id, on_hand, reserved)
  VALUES (p_product_id, p_warehouse_id, 0, 0)
  ON CONFLICT (product_id, warehouse_id) DO NOTHING;

  IF p_type IN ('entry','adjustment_plus','transfer_in') THEN
    UPDATE stock_levels
       SET on_hand = on_hand + p_qty
     WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

  ELSIF p_type IN ('exit','adjustment_minus','transfer_out') THEN
    UPDATE stock_levels
       SET on_hand = on_hand - p_qty
     WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

  ELSIF p_type = 'reservation' THEN
    UPDATE stock_levels
       SET reserved = reserved + p_qty
     WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

  ELSIF p_type = 'release' THEN
    UPDATE stock_levels
       SET reserved = reserved - p_qty
     WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
  END IF;

  INSERT INTO inventory_movements
    (type, product_id, warehouse_id, qty, reference_type, reference_id, notes, created_by)
  VALUES
    (p_type, p_product_id, p_warehouse_id, p_qty, p_reference_type, p_reference_id, p_notes, v_user_id)
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_movement(TEXT, UUID, UUID, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION apply_movement(TEXT, UUID, UUID, NUMERIC, TEXT, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION apply_movement(TEXT, UUID, UUID, NUMERIC, TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION apply_movement IS 'Unica forma de modificar stock_levels. SECURITY DEFINER. Aborta si viola CHECK (on_hand>=0, reserved>=0, reserved<=on_hand).';
