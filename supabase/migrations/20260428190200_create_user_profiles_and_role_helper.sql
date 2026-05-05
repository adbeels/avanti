/*
  # User profiles + role helper (Bloque 1.3)

  Extiende auth.users con un rol operativo (admin / warehouse / fulfillment).
  current_user_role() es helper STABLE para usar en RLS de otras tablas.

  Bootstrap: el unico usuario existente (adbeel@ge7.biz) se crea como admin.
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'warehouse', 'fulfillment')),
  full_name  TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles (role) WHERE active;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM user_profiles WHERE user_id = auth.uid() AND active
$$;

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_touch_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_touch_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_select_authenticated' AND tablename = 'user_profiles') THEN
    CREATE POLICY user_profiles_select_authenticated
      ON user_profiles FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_admin_manage' AND tablename = 'user_profiles') THEN
    CREATE POLICY user_profiles_admin_manage
      ON user_profiles FOR ALL TO authenticated
      USING (current_user_role() = 'admin')
      WITH CHECK (current_user_role() = 'admin');
  END IF;
END $$;

INSERT INTO user_profiles (user_id, role, full_name)
SELECT u.id, 'admin', COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = u.id);

COMMENT ON TABLE user_profiles IS 'Roles operativos. Solo admin puede crear/modificar. Resto solo lectura.';
COMMENT ON FUNCTION current_user_role() IS 'Helper para RLS de otras tablas. Devuelve role o NULL si user no esta en user_profiles.';
