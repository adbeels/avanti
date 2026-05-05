/*
  # Hardening de funciones de Fase 2

  - refresh_po_status_on_reception: solo TRIGGER interno, no callable via REST
  - refresh_po_status_on_reception_item: idem
  - set_folio_from_arg: solo TRIGGER interno, no callable via REST

  refresh_po_status(UUID) ya quedo limitado a authenticated en Bloque 2.3
  (esperado: la app puede querer recalcular manualmente).
*/

REVOKE EXECUTE ON FUNCTION refresh_po_status_on_reception() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refresh_po_status_on_reception() FROM anon;
REVOKE EXECUTE ON FUNCTION refresh_po_status_on_reception() FROM authenticated;

REVOKE EXECUTE ON FUNCTION refresh_po_status_on_reception_item() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refresh_po_status_on_reception_item() FROM anon;
REVOKE EXECUTE ON FUNCTION refresh_po_status_on_reception_item() FROM authenticated;

REVOKE EXECUTE ON FUNCTION set_folio_from_arg() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_folio_from_arg() FROM anon;
REVOKE EXECUTE ON FUNCTION set_folio_from_arg() FROM authenticated;
