/*
  # order_items + order_payments (Bloque 8.3)

  - order_items: lineas de pedido con FK a products (reemplaza JSONB items)
  - order_payments: eventos de pago (cantidad, metodo, fecha, referencia)
  - audit triggers en ambas + en preorders
  - RLS: read all authenticated, write admin/fulfillment

  El JSONB preorders.items se conserva por ahora como respaldo de la migracion.
*/

CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES preorders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty           NUMERIC(12,2) NOT NULL CHECK (qty > 0),
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  qty_picked    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (qty_picked >= 0),
  qty_delivered NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (qty_delivered >= 0),
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_items_picked_le_qty CHECK (qty_picked <= qty),
  CONSTRAINT order_items_delivered_le_picked CHECK (qty_delivered <= qty_picked)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS order_items_touch_updated_at ON order_items;
CREATE TRIGGER order_items_touch_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='order_items_select_authenticated' AND tablename='order_items') THEN
    CREATE POLICY order_items_select_authenticated
      ON order_items FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='order_items_admin_fulfillment_write' AND tablename='order_items') THEN
    CREATE POLICY order_items_admin_fulfillment_write
      ON order_items FOR ALL TO authenticated
      USING (current_user_role() IN ('admin','fulfillment'))
      WITH CHECK (current_user_role() IN ('admin','fulfillment'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS order_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES preorders(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method      TEXT NOT NULL DEFAULT '',
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference   TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order  ON order_payments (order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_paid_at ON order_payments (paid_at DESC);

ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='order_payments_select_authenticated' AND tablename='order_payments') THEN
    CREATE POLICY order_payments_select_authenticated
      ON order_payments FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='order_payments_admin_fulfillment_insert' AND tablename='order_payments') THEN
    CREATE POLICY order_payments_admin_fulfillment_insert
      ON order_payments FOR INSERT TO authenticated
      WITH CHECK (current_user_role() IN ('admin','fulfillment'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='order_payments_admin_manage' AND tablename='order_payments') THEN
    CREATE POLICY order_payments_admin_manage
      ON order_payments FOR ALL TO authenticated
      USING (current_user_role() = 'admin')
      WITH CHECK (current_user_role() = 'admin');
  END IF;
END $$;

DROP TRIGGER IF EXISTS audit_order_items ON order_items;
CREATE TRIGGER audit_order_items
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_order_payments ON order_payments;
CREATE TRIGGER audit_order_payments
  AFTER INSERT OR UPDATE OR DELETE ON order_payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_preorders ON preorders;
CREATE TRIGGER audit_preorders
  AFTER INSERT OR UPDATE OR DELETE ON preorders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

COMMENT ON TABLE order_items IS 'Lineas de pedido con FK a products. Reemplaza el JSONB preorders.items.';
COMMENT ON TABLE order_payments IS 'Eventos de pago. payment_status del pedido = SUM(amount) >= total.';
