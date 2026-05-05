/*
  # close_picking_list() + refresh_order_status() (Bloque 10.3)

  refresh_order_status(order_id):
    - Recalcula order.status en función de qty_picked y qty_delivered acumulados
    - confirmed (con reservas) → fulfilling (parcialmente picked) → ready (todo picked)
    - ready → delivered (todo qty_delivered = qty)
    - No toca status terminales (cancelled, delivered) ni los tempranos (pending/contacted/backorder/partial_payment)

  close_picking_list(picking_list_id):
    - Para cada item con qty_picked > 0:
      1. release de la reserva (libera reserved)
      2. exit del stock (descuenta on_hand)
      3. acumula qty_picked en order_items.qty_picked
    - Marca picking_list como completed
    - Llama refresh_order_status(order_id)
    - Atomico: si algo falla, rollback completo
*/

CREATE OR REPLACE FUNCTION refresh_order_status(p_order_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current TEXT;
  v_total_qty NUMERIC;
  v_total_picked NUMERIC;
  v_total_delivered NUMERIC;
BEGIN
  SELECT status INTO v_current FROM preorders WHERE id = p_order_id;

  IF v_current IS NULL THEN RETURN; END IF;

  IF v_current IN ('cancelled','delivered','pending','contacted','backorder','partial_payment') THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(qty), 0),
    COALESCE(SUM(qty_picked), 0),
    COALESCE(SUM(qty_delivered), 0)
  INTO v_total_qty, v_total_picked, v_total_delivered
  FROM order_items WHERE order_id = p_order_id;

  IF v_total_qty <= 0 THEN RETURN; END IF;

  IF v_total_delivered >= v_total_qty THEN
    UPDATE preorders SET status = 'delivered' WHERE id = p_order_id AND status != 'delivered';
  ELSIF v_total_picked >= v_total_qty THEN
    UPDATE preorders SET status = 'ready' WHERE id = p_order_id AND status != 'ready';
  ELSIF v_total_picked > 0 THEN
    UPDATE preorders SET status = 'fulfilling' WHERE id = p_order_id AND status != 'fulfilling';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION refresh_order_status(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refresh_order_status(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION refresh_order_status(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION close_picking_list(p_picking_list_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_picking RECORD;
  v_item RECORD;
BEGIN
  SELECT id, order_id, warehouse_id, status, folio
    INTO v_picking
  FROM picking_lists WHERE id = p_picking_list_id;

  IF v_picking IS NULL THEN
    RAISE EXCEPTION 'close_picking_list: picking_list % no existe', p_picking_list_id;
  END IF;

  IF v_picking.status NOT IN ('pending','in_progress') THEN
    RAISE EXCEPTION 'close_picking_list: picking % ya está en estado % (no se puede cerrar)', v_picking.folio, v_picking.status;
  END IF;

  FOR v_item IN
    SELECT pli.id, pli.order_item_id, pli.product_id, pli.qty_picked
    FROM picking_list_items pli
    WHERE pli.picking_list_id = p_picking_list_id AND pli.qty_picked > 0
  LOOP
    PERFORM apply_movement(
      'release',
      v_item.product_id,
      v_picking.warehouse_id,
      v_item.qty_picked,
      'picking_list',
      v_picking.id,
      'Liberación de reserva por picking ' || v_picking.folio
    );

    PERFORM apply_movement(
      'exit',
      v_item.product_id,
      v_picking.warehouse_id,
      v_item.qty_picked,
      'picking_list',
      v_picking.id,
      'Salida fisica por picking ' || v_picking.folio
    );

    UPDATE order_items
    SET qty_picked = qty_picked + v_item.qty_picked
    WHERE id = v_item.order_item_id;
  END LOOP;

  UPDATE picking_lists
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_picking_list_id;

  PERFORM refresh_order_status(v_picking.order_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION close_picking_list(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION close_picking_list(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION close_picking_list(UUID) TO authenticated;

COMMENT ON FUNCTION close_picking_list(UUID) IS 'Cierra picking: release reservas + exit stock + acumula qty_picked + recalcula order.status. Atomico.';
COMMENT ON FUNCTION refresh_order_status(UUID) IS 'Recalcula order.status segun qty_picked/qty_delivered acumulados. No toca terminales ni tempranos.';
