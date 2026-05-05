/*
  # Warehouses (Bloque 1.4)

  Almacenes fisicos. Default seedeado: COYOACAN (Calle 28 de diciembre #23).

  RLS:
    - Todos authenticated leen
    - Solo admin escribe
*/

CREATE TABLE IF NOT EXISTS warehouses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses (active);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS warehouses_touch_updated_at ON warehouses;
CREATE TRIGGER warehouses_touch_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'warehouses_select_authenticated' AND tablename = 'warehouses') THEN
    CREATE POLICY warehouses_select_authenticated
      ON warehouses FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'warehouses_admin_manage' AND tablename = 'warehouses') THEN
    CREATE POLICY warehouses_admin_manage
      ON warehouses FOR ALL TO authenticated
      USING (current_user_role() = 'admin')
      WITH CHECK (current_user_role() = 'admin');
  END IF;
END $$;

INSERT INTO warehouses (code, name, address)
VALUES (
  'COYOACAN',
  'Oficina Coyoacan',
  'Calle 28 de diciembre #23, Col. Emiliano Zapata, Coyoacan, CDMX, CP 04815'
)
ON CONFLICT (code) DO NOTHING;
