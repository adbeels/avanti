/*
  # Hardening de funciones de Fase 1

  - touch_updated_at: agregar search_path inmutable
  - audit_trigger: revocar EXECUTE de PUBLIC (es solo TRIGGER, nadie debe llamarla via RPC)
  - current_user_role: revocar de anon (authenticated puede)
  - next_folio: revocar de anon (authenticated puede)

  Nota: las advertencias del linter sobre `current_user_role` y `next_folio`
  ejecutables por authenticated son ESPERADAS y deseadas:
    - current_user_role: el cliente la necesita para conocer su propio rol.
    - next_folio: admin/warehouse/fulfillment la invocan al crear PO/recepcion/orden.
  Ambas DEBEN ser SECURITY DEFINER para no requerir policies de UPDATE en
  user_profiles / folio_sequences que pueden romper RLS.
*/

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION audit_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION audit_trigger() FROM anon;
REVOKE EXECUTE ON FUNCTION audit_trigger() FROM authenticated;

REVOKE EXECUTE ON FUNCTION current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION current_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION next_folio(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION next_folio(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION next_folio(TEXT) TO authenticated;
