/*
  # Audit log infrastructure (Bloque 1.1)

  Tabla append-only que registra cada INSERT/UPDATE/DELETE en tablas criticas.
  Trigger generico audit_trigger() reutilizable.

  - audit_log: la tabla append-only
  - audit_trigger(): TRIGGER FUNCTION generica, captura before/after JSON
  - RLS: solo SELECT permitido a usuarios authenticated. INSERT solo via trigger
        (SECURITY DEFINER bypassea RLS). UPDATE/DELETE bloqueados para todos.
*/

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields TEXT[],
  before_jsonb JSONB,
  after_jsonb JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity      ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user        ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log (created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_log_select_authenticated' AND tablename = 'audit_log') THEN
    CREATE POLICY audit_log_select_authenticated
      ON audit_log FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_changed_fields TEXT[] := '{}';
  v_key TEXT;
  v_entity_id TEXT;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_entity_id := COALESCE((to_jsonb(NEW)->>'id'), '');
    INSERT INTO audit_log (user_id, entity_type, entity_id, action, before_jsonb, after_jsonb)
    VALUES (v_user_id, TG_TABLE_NAME, v_entity_id, 'INSERT', NULL, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := COALESCE((to_jsonb(NEW)->>'id'), '');
    FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF (to_jsonb(NEW)->v_key) IS DISTINCT FROM (to_jsonb(OLD)->v_key) THEN
        v_changed_fields := array_append(v_changed_fields, v_key);
      END IF;
    END LOOP;
    IF array_length(v_changed_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO audit_log (user_id, entity_type, entity_id, action, changed_fields, before_jsonb, after_jsonb)
    VALUES (v_user_id, TG_TABLE_NAME, v_entity_id, 'UPDATE', v_changed_fields, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_entity_id := COALESCE((to_jsonb(OLD)->>'id'), '');
    INSERT INTO audit_log (user_id, entity_type, entity_id, action, before_jsonb, after_jsonb)
    VALUES (v_user_id, TG_TABLE_NAME, v_entity_id, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON TABLE audit_log IS 'Append-only audit trail. Bloqueado UPDATE/DELETE incluso para admin.';
COMMENT ON FUNCTION audit_trigger() IS 'TRIGGER FUNCTION generica: aplicar via CREATE TRIGGER X AFTER INSERT OR UPDATE OR DELETE ON tabla FOR EACH ROW EXECUTE FUNCTION audit_trigger();';
