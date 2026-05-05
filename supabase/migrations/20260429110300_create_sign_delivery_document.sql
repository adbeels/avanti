/*
  # sign_delivery_document() (Bloque 10.4)

  Captura la firma del receptor y aplica los efectos:
    - Valida que el doc esté en draft con items
    - Valida signature + receiver + method (lo refuerza el CHECK también)
    - Para cada delivery_document_item: order_items.qty_delivered += qty_delivered
    - Marca el doc como signed con timestamp
    - Recalcula order.status (puede pasar a delivered si todos items entregados)
    - Atomico
*/

CREATE OR REPLACE FUNCTION sign_delivery_document(
  p_doc_id              UUID,
  p_receiver_name       TEXT,
  p_signature_data_url  TEXT,
  p_signed_method       TEXT,
  p_delivery_address    TEXT DEFAULT '',
  p_notes               TEXT DEFAULT ''
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_doc RECORD;
  v_item RECORD;
  v_item_count INT;
BEGIN
  IF p_receiver_name IS NULL OR trim(p_receiver_name) = '' THEN
    RAISE EXCEPTION 'sign_delivery_document: nombre del receptor obligatorio';
  END IF;

  IF p_signature_data_url IS NULL OR trim(p_signature_data_url) = '' THEN
    RAISE EXCEPTION 'sign_delivery_document: firma obligatoria';
  END IF;

  IF p_signed_method NOT IN ('pickup','courier','wholesale') THEN
    RAISE EXCEPTION 'sign_delivery_document: metodo invalido (% no es pickup/courier/wholesale)', p_signed_method;
  END IF;

  SELECT id, order_id, status, folio
    INTO v_doc
  FROM delivery_documents WHERE id = p_doc_id;

  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'sign_delivery_document: doc % no existe', p_doc_id;
  END IF;

  IF v_doc.status != 'draft' THEN
    RAISE EXCEPTION 'sign_delivery_document: doc % ya está en estado % (no se puede re-firmar)', v_doc.folio, v_doc.status;
  END IF;

  SELECT COUNT(*) INTO v_item_count
  FROM delivery_document_items WHERE delivery_document_id = p_doc_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'sign_delivery_document: doc % no tiene lineas para entregar', v_doc.folio;
  END IF;

  FOR v_item IN
    SELECT order_item_id, qty_delivered
    FROM delivery_document_items
    WHERE delivery_document_id = p_doc_id
  LOOP
    UPDATE order_items
    SET qty_delivered = qty_delivered + v_item.qty_delivered
    WHERE id = v_item.order_item_id;
  END LOOP;

  UPDATE delivery_documents
  SET status = 'signed',
      receiver_name = trim(p_receiver_name),
      signature_data_url = p_signature_data_url,
      signed_method = p_signed_method,
      delivery_address = COALESCE(NULLIF(trim(p_delivery_address), ''), delivery_address),
      notes = CASE WHEN trim(p_notes) <> '' THEN trim(p_notes) ELSE notes END,
      signed_at = NOW()
  WHERE id = p_doc_id;

  PERFORM refresh_order_status(v_doc.order_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION sign_delivery_document(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION sign_delivery_document(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION sign_delivery_document(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION sign_delivery_document IS 'Firma un delivery_document: valida firma + receiver + method, acumula qty_delivered en order_items, marca signed, recalcula order.status. Atomico.';
