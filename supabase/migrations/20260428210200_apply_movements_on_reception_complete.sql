/*
  # Auto-aplicar entries al cerrar recepcion (Bloque 3.3)

  Cuando una recepcion pasa a 'completed', el sistema genera N movimientos 'entry'
  (uno por cada reception_item con qty_received > 0).

  Idempotente: si ya hay movimientos para esta recepcion, no duplica.
  No reverso automatico: si la recepcion se reabre/cancela, hay que hacer
  adjustment_minus manual (decision operativa, no automatica).
*/

CREATE OR REPLACE FUNCTION apply_movements_on_reception_complete() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item     RECORD;
  v_existing INT;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN

    SELECT COUNT(*) INTO v_existing
    FROM inventory_movements
    WHERE reference_type = 'reception' AND reference_id = NEW.id;

    IF v_existing > 0 THEN
      RETURN NEW;
    END IF;

    FOR v_item IN
      SELECT product_id, qty_received
      FROM reception_items
      WHERE reception_id = NEW.id AND qty_received > 0
    LOOP
      PERFORM apply_movement(
        'entry',
        v_item.product_id,
        NEW.warehouse_id,
        v_item.qty_received,
        'reception',
        NEW.id,
        'Recepcion automatica: ' || NEW.folio
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_movements_on_reception_complete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION apply_movements_on_reception_complete() FROM anon;
REVOKE EXECUTE ON FUNCTION apply_movements_on_reception_complete() FROM authenticated;

DROP TRIGGER IF EXISTS receptions_apply_movements ON receptions;
CREATE TRIGGER receptions_apply_movements
  AFTER INSERT OR UPDATE OF status ON receptions
  FOR EACH ROW EXECUTE FUNCTION apply_movements_on_reception_complete();

COMMENT ON FUNCTION apply_movements_on_reception_complete IS 'Trigger interno: genera entries al cerrar recepcion. Idempotente.';
