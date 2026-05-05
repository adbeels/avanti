/*
  # Picking Lists + Items (Bloque 10.1)

  - picking_lists: lista de surtido. 1 order puede tener N picking lists (splits).
  - picking_list_items: 1:1 con order_items, captura qty_picked.
  - Folio auto: PCK-AAAA-NNNN
  - RLS: admin RC, warehouse RCU, fulfillment RC

  FSM picking_lists.status:
    pending -> in_progress (almacenista toma) -> completed
    pending|in_progress -> cancelled
*/

CREATE TABLE IF NOT EXISTS picking_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio         TEXT NOT NULL UNIQUE,
  order_id      UUID NOT NULL REFERENCES preorders(id) ON DELETE RESTRICT,
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  assigned_to   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  notes         TEXT NOT NULL DEFAULT '',
  assigned_at   TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_picking_lists_order      ON picking_lists (order_id);
CREATE INDEX IF NOT EXISTS idx_picking_lists_warehouse  ON picking_lists (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_picking_lists_status     ON picking_lists (status);
CREATE INDEX IF NOT EXISTS idx_picking_lists_assigned   ON picking_lists (assigned_to) WHERE status IN ('pending','in_progress');

ALTER TABLE picking_lists ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS picking_lists_touch_updated_at ON picking_lists;
CREATE TRIGGER picking_lists_touch_updated_at
  BEFORE UPDATE ON picking_lists
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS picking_lists_set_folio ON picking_lists;
CREATE TRIGGER picking_lists_set_folio
  BEFORE INSERT ON picking_lists
  FOR EACH ROW
  WHEN (NEW.folio IS NULL)
  EXECUTE FUNCTION set_folio_from_arg('picking_list');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='picking_lists_select_authenticated' AND tablename='picking_lists') THEN
    CREATE POLICY picking_lists_select_authenticated
      ON picking_lists FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='picking_lists_insert_admin_fulfillment' AND tablename='picking_lists') THEN
    CREATE POLICY picking_lists_insert_admin_fulfillment
      ON picking_lists FOR INSERT TO authenticated
      WITH CHECK (current_user_role() IN ('admin','fulfillment'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='picking_lists_update_admin_warehouse_fulfillment' AND tablename='picking_lists') THEN
    CREATE POLICY picking_lists_update_admin_warehouse_fulfillment
      ON picking_lists FOR UPDATE TO authenticated
      USING (current_user_role() IN ('admin','warehouse','fulfillment'))
      WITH CHECK (current_user_role() IN ('admin','warehouse','fulfillment'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='picking_lists_delete_admin' AND tablename='picking_lists') THEN
    CREATE POLICY picking_lists_delete_admin
      ON picking_lists FOR DELETE TO authenticated
      USING (current_user_role() = 'admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS picking_list_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  picking_list_id  UUID NOT NULL REFERENCES picking_lists(id) ON DELETE CASCADE,
  order_item_id    UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_requested    NUMERIC(12,2) NOT NULL CHECK (qty_requested > 0),
  qty_picked       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (qty_picked >= 0),
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT picking_qty_picked_le_requested CHECK (qty_picked <= qty_requested)
);

CREATE INDEX IF NOT EXISTS idx_picking_list_items_list     ON picking_list_items (picking_list_id);
CREATE INDEX IF NOT EXISTS idx_picking_list_items_orderitem ON picking_list_items (order_item_id);
CREATE INDEX IF NOT EXISTS idx_picking_list_items_product  ON picking_list_items (product_id);

ALTER TABLE picking_list_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS picking_list_items_touch_updated_at ON picking_list_items;
CREATE TRIGGER picking_list_items_touch_updated_at
  BEFORE UPDATE ON picking_list_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='picking_list_items_select_authenticated' AND tablename='picking_list_items') THEN
    CREATE POLICY picking_list_items_select_authenticated
      ON picking_list_items FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='picking_list_items_insert_admin_fulfillment' AND tablename='picking_list_items') THEN
    CREATE POLICY picking_list_items_insert_admin_fulfillment
      ON picking_list_items FOR INSERT TO authenticated
      WITH CHECK (current_user_role() IN ('admin','fulfillment'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='picking_list_items_update_admin_warehouse' AND tablename='picking_list_items') THEN
    CREATE POLICY picking_list_items_update_admin_warehouse
      ON picking_list_items FOR UPDATE TO authenticated
      USING (current_user_role() IN ('admin','warehouse'))
      WITH CHECK (current_user_role() IN ('admin','warehouse'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS audit_picking_lists ON picking_lists;
CREATE TRIGGER audit_picking_lists
  AFTER INSERT OR UPDATE OR DELETE ON picking_lists
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_picking_list_items ON picking_list_items;
CREATE TRIGGER audit_picking_list_items
  AFTER INSERT OR UPDATE OR DELETE ON picking_list_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

COMMENT ON TABLE picking_lists IS 'Listas de surtido. 1 order puede tener N picking_lists (splits). Folio auto: PCK-AAAA-NNNN.';
COMMENT ON TABLE picking_list_items IS 'Items por surtir. qty_picked acumula picking real. CHECK qty_picked <= qty_requested.';
