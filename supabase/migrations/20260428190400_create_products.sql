/*
  # Products + pg_trgm extension (Bloque 1.5)

  Habilita pg_trgm para busqueda fuzzy en nombres y crea catalogo de productos.

  Sin kits/compuestos (decision 3 del plan).

  RLS:
    - Todos authenticated leen
    - Solo admin escribe
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_active     ON products (active);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm  ON products USING gin (name gin_trgm_ops);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS products_touch_updated_at ON products;
CREATE TRIGGER products_touch_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'products_select_authenticated' AND tablename = 'products') THEN
    CREATE POLICY products_select_authenticated
      ON products FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'products_admin_manage' AND tablename = 'products') THEN
    CREATE POLICY products_admin_manage
      ON products FOR ALL TO authenticated
      USING (current_user_role() = 'admin')
      WITH CHECK (current_user_role() = 'admin');
  END IF;
END $$;

COMMENT ON TABLE products IS 'Catalogo plano. Se popula manual ahora; en Fase 2 se seedea desde preorders.items historico.';
