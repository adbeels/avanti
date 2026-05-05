/*
  # Folio sequences (Bloque 1.2)

  Generador de folios correlativos por (entity_type, year), reset anual.
  Garantiza correlatividad sin huecos via INSERT...ON CONFLICT con RETURNING.

  Prefijos soportados:
    purchase_order   -> PO
    reception        -> REC
    order            -> ORD
    picking_list     -> PCK
    delivery_document-> DEL
    adjustment       -> ADJ
    transfer         -> TRF
*/

CREATE TABLE IF NOT EXISTS folio_sequences (
  entity_type TEXT NOT NULL,
  year        INT  NOT NULL,
  last_number INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (entity_type, year)
);

ALTER TABLE folio_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'folio_sequences_select_authenticated' AND tablename = 'folio_sequences') THEN
    CREATE POLICY folio_sequences_select_authenticated
      ON folio_sequences FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION next_folio(p_entity_type TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year   INT := EXTRACT(YEAR FROM NOW())::INT;
  v_number INT;
  v_prefix TEXT;
BEGIN
  v_prefix := CASE p_entity_type
    WHEN 'purchase_order'    THEN 'PO'
    WHEN 'reception'         THEN 'REC'
    WHEN 'order'             THEN 'ORD'
    WHEN 'picking_list'      THEN 'PCK'
    WHEN 'delivery_document' THEN 'DEL'
    WHEN 'adjustment'        THEN 'ADJ'
    WHEN 'transfer'          THEN 'TRF'
    ELSE NULL
  END;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Tipo de entidad desconocido para folio: %', p_entity_type;
  END IF;

  INSERT INTO folio_sequences (entity_type, year, last_number)
  VALUES (p_entity_type, v_year, 1)
  ON CONFLICT (entity_type, year)
    DO UPDATE SET last_number = folio_sequences.last_number + 1
  RETURNING last_number INTO v_number;

  RETURN v_prefix || '-' || v_year::TEXT || '-' || LPAD(v_number::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION next_folio(TEXT) IS 'Genera un folio nuevo: PREFIJO-AAAA-NNNN. Reset anual. Atomico via INSERT ON CONFLICT.';
