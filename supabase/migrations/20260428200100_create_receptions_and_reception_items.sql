/*
  # Receptions + Reception Items (Bloque 2.2)

  - receptions: cabecera de recepcion fisica de mercaderia
  - reception_items: lineas con qty_received por po_item
  - Folio auto: REC-AAAA-NNNN
  - RLS: admin R, warehouse RCU (crea/cierra), fulfillment R

  FSM receptions.status:
    in_progress -> completed
    in_progress -> cancelled (caso excepcional)
    in_progress -> discrepancy_open -> reconciled -> completed

  Notas:
    - 1 PO puede tener N recepciones (parciales)
    - Cada reception_item referencia un po_item especifico
    - product_id se denormaliza para queries rapidas (igual que po_items.product_id)
    - qty_discrepancy es texto/nota local; la conciliacion total vs ordenado se hace
      via refresh_po_status() en Bloque 2.3
*/

CREATE TABLE IF NOT EXISTS receptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio              TEXT NOT NULL UNIQUE,
  purchase_order_id  UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  warehouse_id       UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  performed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status             TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','discrepancy_open','reconciled','cancelled')),
  notes              TEXT NOT NULL DEFAULT '',
  completed_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receptions_po          ON receptions (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_receptions_warehouse   ON receptions (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_receptions_status      ON receptions (status);
CREATE INDEX IF NOT EXISTS idx_receptions_received_at ON receptions (received_at DESC);

ALTER TABLE receptions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS receptions_touch_updated_at ON receptions;
CREATE TRIGGER receptions_touch_updated_at
  BEFORE UPDATE ON receptions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS receptions_set_folio ON receptions;
CREATE TRIGGER receptions_set_folio
  BEFORE INSERT ON receptions
  FOR EACH ROW EXECUTE FUNCTION set_folio_from_arg('reception');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'receptions_select_authenticated' AND tablename = 'receptions') THEN
    CREATE POLICY receptions_select_authenticated
      ON receptions FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'receptions_warehouse_manage' AND tablename = 'receptions') THEN
    CREATE POLICY receptions_warehouse_manage
      ON receptions FOR INSERT TO authenticated
      WITH CHECK (current_user_role() IN ('admin','warehouse'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'receptions_warehouse_update' AND tablename = 'receptions') THEN
    CREATE POLICY receptions_warehouse_update
      ON receptions FOR UPDATE TO authenticated
      USING (current_user_role() IN ('admin','warehouse'))
      WITH CHECK (current_user_role() IN ('admin','warehouse'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS reception_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id       UUID NOT NULL REFERENCES receptions(id) ON DELETE CASCADE,
  po_item_id         UUID NOT NULL REFERENCES po_items(id) ON DELETE RESTRICT,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_received       NUMERIC(12,2) NOT NULL CHECK (qty_received >= 0),
  discrepancy_reason TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reception_items_reception ON reception_items (reception_id);
CREATE INDEX IF NOT EXISTS idx_reception_items_po_item   ON reception_items (po_item_id);
CREATE INDEX IF NOT EXISTS idx_reception_items_product   ON reception_items (product_id);

ALTER TABLE reception_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS reception_items_touch_updated_at ON reception_items;
CREATE TRIGGER reception_items_touch_updated_at
  BEFORE UPDATE ON reception_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reception_items_select_authenticated' AND tablename = 'reception_items') THEN
    CREATE POLICY reception_items_select_authenticated
      ON reception_items FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reception_items_warehouse_insert' AND tablename = 'reception_items') THEN
    CREATE POLICY reception_items_warehouse_insert
      ON reception_items FOR INSERT TO authenticated
      WITH CHECK (current_user_role() IN ('admin','warehouse'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reception_items_warehouse_update' AND tablename = 'reception_items') THEN
    CREATE POLICY reception_items_warehouse_update
      ON reception_items FOR UPDATE TO authenticated
      USING (current_user_role() IN ('admin','warehouse'))
      WITH CHECK (current_user_role() IN ('admin','warehouse'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS audit_receptions ON receptions;
CREATE TRIGGER audit_receptions
  AFTER INSERT OR UPDATE OR DELETE ON receptions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_reception_items ON reception_items;
CREATE TRIGGER audit_reception_items
  AFTER INSERT OR UPDATE OR DELETE ON reception_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

COMMENT ON TABLE receptions IS 'Recepcion fisica de PO. 1:N por PO (parciales). Folio auto: REC-AAAA-NNNN.';
COMMENT ON TABLE reception_items IS 'Lineas recibidas. qty_received >= 0 (puede ser 0 si linea no llego). Conciliacion via refresh_po_status().';
