/*
  # refresh_po_status() + trigger automatico (Bloque 2.3)

  Cuando una recepcion se marca 'completed' (o se reabre/cancela), recalculamos el
  status de la PO comparando totales recibidos vs ordenados.

  Reglas:
    - PO en estado terminal (closed/cancelled) NO se toca
    - PO en draft no avanza por recepcion (no tiene sentido recibir antes de "sent")
    - Total recibido = SUM de reception_items.qty_received de recepciones COMPLETED
    - Total recibido == 0  -> sent (sin cambio si ya estaba sent)
    - 0 < Total < Ordenado -> partially_received
    - Total >= Ordenado    -> received
*/

CREATE OR REPLACE FUNCTION refresh_po_status(p_po_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_ordered  NUMERIC;
  v_total_received NUMERIC;
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status FROM purchase_orders WHERE id = p_po_id;

  IF v_current_status IS NULL THEN
    RETURN;
  END IF;

  IF v_current_status IN ('closed', 'cancelled', 'draft') THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(qty_ordered), 0) INTO v_total_ordered
  FROM po_items WHERE purchase_order_id = p_po_id;

  SELECT COALESCE(SUM(ri.qty_received), 0) INTO v_total_received
  FROM reception_items ri
  JOIN receptions r ON r.id = ri.reception_id
  JOIN po_items pi ON pi.id = ri.po_item_id
  WHERE pi.purchase_order_id = p_po_id
    AND r.status = 'completed';

  IF v_total_received <= 0 THEN
    UPDATE purchase_orders SET status = 'sent' WHERE id = p_po_id AND status != 'sent';
  ELSIF v_total_received >= v_total_ordered THEN
    UPDATE purchase_orders SET status = 'received' WHERE id = p_po_id AND status != 'received';
  ELSE
    UPDATE purchase_orders SET status = 'partially_received' WHERE id = p_po_id AND status != 'partially_received';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION refresh_po_status(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refresh_po_status(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION refresh_po_status(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION refresh_po_status_on_reception() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM refresh_po_status(NEW.purchase_order_id);
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    PERFORM refresh_po_status(NEW.purchase_order_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS receptions_refresh_po_status ON receptions;
CREATE TRIGGER receptions_refresh_po_status
  AFTER INSERT OR UPDATE OF status ON receptions
  FOR EACH ROW EXECUTE FUNCTION refresh_po_status_on_reception();

CREATE OR REPLACE FUNCTION refresh_po_status_on_reception_item() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_po_id UUID;
  v_reception_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT pi.purchase_order_id, r.status INTO v_po_id, v_reception_status
    FROM po_items pi
    JOIN reception_items ri ON ri.po_item_id = pi.id
    JOIN receptions r ON r.id = ri.reception_id
    WHERE ri.id = OLD.id;
  ELSE
    SELECT pi.purchase_order_id, r.status INTO v_po_id, v_reception_status
    FROM po_items pi
    JOIN receptions r ON r.id = NEW.reception_id
    WHERE pi.id = NEW.po_item_id;
  END IF;

  IF v_reception_status = 'completed' AND v_po_id IS NOT NULL THEN
    PERFORM refresh_po_status(v_po_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reception_items_refresh_po_status ON reception_items;
CREATE TRIGGER reception_items_refresh_po_status
  AFTER INSERT OR UPDATE OR DELETE ON reception_items
  FOR EACH ROW EXECUTE FUNCTION refresh_po_status_on_reception_item();

COMMENT ON FUNCTION refresh_po_status(UUID) IS 'Recalcula PO.status segun recepciones completed acumuladas. No toca PO en estado terminal.';
