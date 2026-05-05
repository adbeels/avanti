/*
  # Agregar columnas del modelo nuevo a preorders (Bloque 8.2)

  Mantenemos el nombre `preorders` por compatibilidad con la app y edge functions
  existentes. Conceptualmente el dominio se llama "Order" pero la SQL queda asi.

  Nuevas columnas:
    folio                  - PEDIDO formato ORD-AAAA-NNNN (null para legacy)
    legacy_order_number    - copia de order_number actual (para preservar legacy)
    sales_channel          - 'web' | 'manual_*' | etc
    source_reference       - texto libre opcional para pedidos externos
    warehouse_id           - FK a warehouses (default: COYOACAN)
    delivery_promise_date  - fecha promesa de entrega
    payment_status         - 'unpaid' | 'partial' | 'paid'
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='preorders' AND column_name='folio') THEN
    ALTER TABLE preorders ADD COLUMN folio TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='preorders' AND column_name='legacy_order_number') THEN
    ALTER TABLE preorders ADD COLUMN legacy_order_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='preorders' AND column_name='sales_channel') THEN
    ALTER TABLE preorders ADD COLUMN sales_channel TEXT NOT NULL DEFAULT 'web';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='preorders' AND column_name='source_reference') THEN
    ALTER TABLE preorders ADD COLUMN source_reference TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='preorders' AND column_name='warehouse_id') THEN
    ALTER TABLE preorders ADD COLUMN warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='preorders' AND column_name='delivery_promise_date') THEN
    ALTER TABLE preorders ADD COLUMN delivery_promise_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='preorders' AND column_name='payment_status') THEN
    ALTER TABLE preorders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='preorders_payment_status_check') THEN
    ALTER TABLE preorders
      ADD CONSTRAINT preorders_payment_status_check
      CHECK (payment_status IN ('unpaid','partial','paid'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='preorders_sales_channel_check') THEN
    ALTER TABLE preorders
      ADD CONSTRAINT preorders_sales_channel_check
      CHECK (sales_channel IN ('web','manual_phone','manual_whatsapp','manual_email','manual_visit','manual_event','manual_other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_preorders_folio              ON preorders (folio);
CREATE INDEX IF NOT EXISTS idx_preorders_legacy_order_num   ON preorders (legacy_order_number);
CREATE INDEX IF NOT EXISTS idx_preorders_sales_channel      ON preorders (sales_channel);
CREATE INDEX IF NOT EXISTS idx_preorders_warehouse_id       ON preorders (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_preorders_payment_status     ON preorders (payment_status);
CREATE INDEX IF NOT EXISTS idx_preorders_delivery_promise   ON preorders (delivery_promise_date);

DROP TRIGGER IF EXISTS preorders_set_folio ON preorders;
CREATE TRIGGER preorders_set_folio
  BEFORE INSERT ON preorders
  FOR EACH ROW
  WHEN (NEW.folio IS NULL AND NEW.created_at >= '2026-04-29'::TIMESTAMP)
  EXECUTE FUNCTION set_folio_from_arg('order');

COMMENT ON COLUMN preorders.folio IS 'Folio nuevo formato ORD-AAAA-NNNN. NULL para los 50 legacy (usan legacy_order_number).';
COMMENT ON COLUMN preorders.legacy_order_number IS 'Snapshot del order_number alfanum 5-char al momento de la migracion Fase 2.';
COMMENT ON COLUMN preorders.sales_channel IS 'Canal de venta. Default: web. Valores: web, manual_phone, manual_whatsapp, manual_email, manual_visit, manual_event, manual_other.';
COMMENT ON COLUMN preorders.source_reference IS 'Folio externo conocido por cliente (cotizacion, wsp, evento). Solo para pedidos manuales.';
COMMENT ON COLUMN preorders.warehouse_id IS 'Almacen que cumple el pedido. Para legacy: COYOACAN.';
COMMENT ON COLUMN preorders.payment_status IS 'unpaid / partial / paid. Calculable como SUM(order_payments) >= total.';
