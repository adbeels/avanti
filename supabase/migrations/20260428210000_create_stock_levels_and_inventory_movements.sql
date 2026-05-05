/*
  # Stock levels + Inventory movements (Bloque 3.1)

  - stock_levels: cantidad por (producto, almacen). on_hand y reserved.
                  available es columna GENERADA: on_hand - reserved.
  - inventory_movements: bitacora APPEND-ONLY de cada cambio de stock.

  Invariantes (CHECKs a nivel BD):
    - on_hand >= 0 (no stock negativo, decision 6 del plan)
    - reserved >= 0
    - reserved <= on_hand (no se puede reservar mas de lo que hay)

  RLS:
    - stock_levels: TODOS authenticated leen. NADIE escribe directo.
                    Solo apply_movement() (SECURITY DEFINER) modifica.
    - inventory_movements: TODOS authenticated leen. INSERT solo via apply_movement.
                           UPDATE/DELETE bloqueados (append-only).

  Tipos de movimiento:
    entry             -> +on_hand (recepcion de proveedor)
    exit              -> -on_hand (salida manual / picking sin reserva)
    adjustment_plus   -> +on_hand (ajuste positivo, requiere motivo)
    adjustment_minus  -> -on_hand (ajuste negativo, merma)
    transfer_out      -> -on_hand (origen de transferencia entre almacenes)
    transfer_in       -> +on_hand (destino de transferencia)
    reservation       -> +reserved (al confirmar pedido)
    release           -> -reserved (al cancelar / al hacer picking)
*/

CREATE TABLE IF NOT EXISTS stock_levels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  on_hand       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  available     NUMERIC(12,2) GENERATED ALWAYS AS (on_hand - reserved) STORED,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_reserved_le_on_hand CHECK (reserved <= on_hand),
  UNIQUE (product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_levels_product   ON stock_levels (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse ON stock_levels (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_available ON stock_levels (available) WHERE available > 0;

ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'stock_levels_select_authenticated' AND tablename = 'stock_levels') THEN
    CREATE POLICY stock_levels_select_authenticated
      ON stock_levels FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL CHECK (type IN ('entry','exit','adjustment_plus','adjustment_minus','transfer_out','transfer_in','reservation','release')),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  qty             NUMERIC(12,2) NOT NULL CHECK (qty > 0),
  reference_type  TEXT,
  reference_id    UUID,
  notes           TEXT NOT NULL DEFAULT '',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_movements_product   ON inventory_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_movements_warehouse ON inventory_movements (warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_movements_reference ON inventory_movements (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_type      ON inventory_movements (type);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created   ON inventory_movements (created_at DESC);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'inventory_movements_select_authenticated' AND tablename = 'inventory_movements') THEN
    CREATE POLICY inventory_movements_select_authenticated
      ON inventory_movements FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS stock_levels_touch_updated_at ON stock_levels;
CREATE TRIGGER stock_levels_touch_updated_at
  BEFORE UPDATE ON stock_levels
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS audit_stock_levels ON stock_levels;
CREATE TRIGGER audit_stock_levels
  AFTER INSERT OR UPDATE OR DELETE ON stock_levels
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

COMMENT ON TABLE stock_levels IS 'Stock por (producto, almacen). available = on_hand - reserved (generated). Solo apply_movement() escribe.';
COMMENT ON TABLE inventory_movements IS 'Bitacora append-only de cambios de stock. Solo apply_movement() inserta. UPDATE/DELETE bloqueados.';
COMMENT ON COLUMN stock_levels.available IS 'Stock libre para nuevas reservas. Calculado como on_hand - reserved.';
