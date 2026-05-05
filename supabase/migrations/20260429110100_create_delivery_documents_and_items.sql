/*
  # Delivery Documents + Items (Bloque 10.2)

  - delivery_documents: comprobante de salida con firma del receptor
  - delivery_document_items: que se entrega en este doc (qty_delivered por order_item)
  - Folio auto: DEL-AAAA-NNNN
  - Picking_list_id es opcional (uno o varios pickings pueden cubrirse en una entrega)
  - 1 order puede tener N delivery_documents (entregas parciales)

  FSM delivery_documents.status:
    draft -> signed (al capturar firma) -> archived (post-email cliente)

  Invariante:
    No se puede pasar a 'signed' sin signature_data_url + receiver_name + signed_method.
*/

CREATE TABLE IF NOT EXISTS delivery_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio              TEXT NOT NULL UNIQUE,
  order_id           UUID NOT NULL REFERENCES preorders(id) ON DELETE RESTRICT,
  picking_list_id    UUID REFERENCES picking_lists(id) ON DELETE SET NULL,
  warehouse_id       UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','archived','cancelled')),
  signed_method      TEXT CHECK (signed_method IN ('pickup','courier','wholesale') OR signed_method IS NULL),
  receiver_name      TEXT NOT NULL DEFAULT '',
  signature_data_url TEXT,
  delivery_address   TEXT NOT NULL DEFAULT '',
  signed_at          TIMESTAMPTZ,
  archived_at        TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  notes              TEXT NOT NULL DEFAULT '',
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT delivery_signed_requires_signature CHECK (
    (status = 'draft') OR
    (status = 'cancelled') OR
    (status IN ('signed','archived') AND signature_data_url IS NOT NULL AND receiver_name <> '' AND signed_method IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_delivery_docs_order        ON delivery_documents (order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_docs_picking      ON delivery_documents (picking_list_id);
CREATE INDEX IF NOT EXISTS idx_delivery_docs_status       ON delivery_documents (status);
CREATE INDEX IF NOT EXISTS idx_delivery_docs_signed_at    ON delivery_documents (signed_at DESC);

ALTER TABLE delivery_documents ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS delivery_documents_touch_updated_at ON delivery_documents;
CREATE TRIGGER delivery_documents_touch_updated_at
  BEFORE UPDATE ON delivery_documents
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS delivery_documents_set_folio ON delivery_documents;
CREATE TRIGGER delivery_documents_set_folio
  BEFORE INSERT ON delivery_documents
  FOR EACH ROW
  WHEN (NEW.folio IS NULL)
  EXECUTE FUNCTION set_folio_from_arg('delivery_document');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='delivery_docs_select_authenticated' AND tablename='delivery_documents') THEN
    CREATE POLICY delivery_docs_select_authenticated
      ON delivery_documents FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='delivery_docs_insert_admin_fulfillment' AND tablename='delivery_documents') THEN
    CREATE POLICY delivery_docs_insert_admin_fulfillment
      ON delivery_documents FOR INSERT TO authenticated
      WITH CHECK (current_user_role() IN ('admin','fulfillment'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='delivery_docs_update_admin_fulfillment' AND tablename='delivery_documents') THEN
    CREATE POLICY delivery_docs_update_admin_fulfillment
      ON delivery_documents FOR UPDATE TO authenticated
      USING (current_user_role() IN ('admin','fulfillment'))
      WITH CHECK (current_user_role() IN ('admin','fulfillment'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS delivery_document_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_document_id  UUID NOT NULL REFERENCES delivery_documents(id) ON DELETE CASCADE,
  order_item_id         UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_delivered         NUMERIC(12,2) NOT NULL CHECK (qty_delivered > 0),
  notes                 TEXT NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dd_items_doc     ON delivery_document_items (delivery_document_id);
CREATE INDEX IF NOT EXISTS idx_dd_items_orderitem ON delivery_document_items (order_item_id);
CREATE INDEX IF NOT EXISTS idx_dd_items_product ON delivery_document_items (product_id);

ALTER TABLE delivery_document_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='dd_items_select_authenticated' AND tablename='delivery_document_items') THEN
    CREATE POLICY dd_items_select_authenticated
      ON delivery_document_items FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='dd_items_insert_admin_fulfillment' AND tablename='delivery_document_items') THEN
    CREATE POLICY dd_items_insert_admin_fulfillment
      ON delivery_document_items FOR INSERT TO authenticated
      WITH CHECK (current_user_role() IN ('admin','fulfillment'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='dd_items_update_admin_fulfillment' AND tablename='delivery_document_items') THEN
    CREATE POLICY dd_items_update_admin_fulfillment
      ON delivery_document_items FOR UPDATE TO authenticated
      USING (current_user_role() IN ('admin','fulfillment'))
      WITH CHECK (current_user_role() IN ('admin','fulfillment'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS audit_delivery_documents ON delivery_documents;
CREATE TRIGGER audit_delivery_documents
  AFTER INSERT OR UPDATE OR DELETE ON delivery_documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_delivery_document_items ON delivery_document_items;
CREATE TRIGGER audit_delivery_document_items
  AFTER INSERT OR UPDATE OR DELETE ON delivery_document_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

COMMENT ON TABLE delivery_documents IS 'Comprobantes de salida con firma del receptor. 1 order puede tener N delivery_docs (split). Folio: DEL-AAAA-NNNN.';
COMMENT ON TABLE delivery_document_items IS 'Lineas entregadas en un delivery_doc. qty_delivered se acumula en order_items.qty_delivered al firmar.';
COMMENT ON CONSTRAINT delivery_signed_requires_signature ON delivery_documents IS 'No se puede marcar signed/archived sin signature + receiver + method.';
