/*
  # Purchase Orders + PO Items (Bloque 2.1)

  - purchase_orders: cabecera de orden de compra al proveedor
  - po_items: lineas con producto + cantidad + costo unitario
  - Folio auto-generado via trigger BEFORE INSERT que llama next_folio()
  - Funcion generica set_folio_from_arg() reutilizable para todas las entidades con folio
  - RLS: admin RCUD, warehouse R, fulfillment R

  FSM purchase_orders.status:
    draft -> sent -> partially_received -> received -> closed
    draft|sent -> cancelled
*/

CREATE OR REPLACE FUNCTION set_folio_from_arg() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := next_folio(TG_ARGV[0]);
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- purchase_orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio         TEXT NOT NULL UNIQUE,
  supplier      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partially_received','received','closed','cancelled')),
  notes         TEXT NOT NULL DEFAULT '',
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at       TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status      ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier    ON purchase_orders (supplier);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at  ON purchase_orders (created_at DESC);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS purchase_orders_touch_updated_at ON purchase_orders;
CREATE TRIGGER purchase_orders_touch_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS purchase_orders_set_folio ON purchase_orders;
CREATE TRIGGER purchase_orders_set_folio
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_folio_from_arg('purchase_order');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'purchase_orders_select_authenticated' AND tablename = 'purchase_orders') THEN
    CREATE POLICY purchase_orders_select_authenticated
      ON purchase_orders FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'purchase_orders_admin_manage' AND tablename = 'purchase_orders') THEN
    CREATE POLICY purchase_orders_admin_manage
      ON purchase_orders FOR ALL TO authenticated
      USING (current_user_role() = 'admin')
      WITH CHECK (current_user_role() = 'admin');
  END IF;
END $$;

-- ============================================================================
-- po_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS po_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id  UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_ordered        NUMERIC(12,2) NOT NULL CHECK (qty_ordered > 0),
  unit_cost          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  notes              TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purchase_order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_po_items_po       ON po_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product  ON po_items (product_id);

ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS po_items_touch_updated_at ON po_items;
CREATE TRIGGER po_items_touch_updated_at
  BEFORE UPDATE ON po_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'po_items_select_authenticated' AND tablename = 'po_items') THEN
    CREATE POLICY po_items_select_authenticated
      ON po_items FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'po_items_admin_manage' AND tablename = 'po_items') THEN
    CREATE POLICY po_items_admin_manage
      ON po_items FOR ALL TO authenticated
      USING (current_user_role() = 'admin')
      WITH CHECK (current_user_role() = 'admin');
  END IF;
END $$;

DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_po_items ON po_items;
CREATE TRIGGER audit_po_items
  AFTER INSERT OR UPDATE OR DELETE ON po_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

COMMENT ON TABLE purchase_orders IS 'Ordenes de compra al proveedor (Panini, etc.). Folio auto: PO-AAAA-NNNN.';
COMMENT ON TABLE po_items IS 'Lineas de PO. UNIQUE(po_id, product_id) impide duplicar el mismo SKU en la misma PO.';
