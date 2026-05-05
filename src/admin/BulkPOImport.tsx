import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Download, FileText, X, AlertCircle, CheckCircle2, Loader2,
  ShoppingBag, ListPlus, Trash2, Info, ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseCSV, csvToObjects, objectsToCSV, downloadCSV } from './csvUtils';

interface BulkPOImportProps {
  isAdmin: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface CsvRow {
  po_ref: string;
  supplier: string;
  notes: string;
  product_sku: string;
  qty_ordered: string;
  unit_cost: string;
  item_notes: string;
}

interface ParsedLine {
  rowIndex: number;            // 1-based original CSV row
  po_ref: string;
  product_sku: string;
  product_id: string | null;   // null si no encontrado
  product_name: string | null;
  qty_ordered: number;
  unit_cost: number;
  item_notes: string;
  errors: string[];
}

interface ParsedPO {
  po_ref: string;
  supplier: string;
  notes: string;
  lines: ParsedLine[];
  errors: string[];
}

interface ImportResult {
  po_ref: string;
  status: 'created' | 'error';
  folio?: string;
  error?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  active: boolean;
}

const TEMPLATE_HEADERS = [
  'po_ref', 'supplier', 'notes', 'product_sku', 'qty_ordered', 'unit_cost', 'item_notes',
];

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function BulkPOImport({ isAdmin, onClose, onImported }: BulkPOImportProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [csvText, setCsvText] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [parsedPOs, setParsedPOs] = useState<ParsedPO[]>([]);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, sku, name, active').eq('active', true);
    setProducts((data as Product[]) || []);
  };

  const productBySku = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.sku.toUpperCase(), p));
    return m;
  }, [products]);

  // ============================================================
  // TEMPLATE DOWNLOAD
  // ============================================================
  const handleDownloadTemplate = () => {
    const sampleProducts = products.slice(0, 3);
    const sampleRows = [
      {
        po_ref: 'PO-EJEMPLO-1',
        supplier: 'Panini Mexico',
        notes: 'Notas opcionales del PO',
        product_sku: sampleProducts[0]?.sku ?? 'ALBUM-DURA',
        qty_ordered: 100,
        unit_cost: 50,
        item_notes: '',
      },
      {
        po_ref: 'PO-EJEMPLO-1',
        supplier: 'Panini Mexico',
        notes: 'Notas opcionales del PO',
        product_sku: sampleProducts[1]?.sku ?? 'ALBUM-SOFT',
        qty_ordered: 200,
        unit_cost: 15,
        item_notes: 'Linea con nota',
      },
      {
        po_ref: 'PO-EJEMPLO-2',
        supplier: 'Otro Proveedor',
        notes: '',
        product_sku: sampleProducts[2]?.sku ?? 'CAJA-PANINI',
        qty_ordered: 50,
        unit_cost: 1500,
        item_notes: '',
      },
    ];
    const csv = objectsToCSV(TEMPLATE_HEADERS, sampleRows);
    downloadCSV('plantilla-import-po.csv', csv);
  };

  // ============================================================
  // FILE PARSE
  // ============================================================
  const handleFile = (file: File) => {
    setFilename(file.name);
    setResults([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      parseAndValidate(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv'))) {
      handleFile(file);
    } else {
      setGlobalErrors(['El archivo debe ser .csv']);
    }
  };

  const parseAndValidate = (text: string) => {
    setGlobalErrors([]);
    setParsedPOs([]);
    setResults([]);

    let rows: string[][];
    try {
      rows = parseCSV(text);
    } catch {
      setGlobalErrors(['No se pudo parsear el CSV. Verifica el formato.']);
      return;
    }

    if (rows.length === 0) {
      setGlobalErrors(['El CSV está vacío.']);
      return;
    }

    if (rows.length === 1) {
      setGlobalErrors(['El CSV solo tiene encabezados, sin filas de datos.']);
      return;
    }

    // Validar que tenga las columnas requeridas
    const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const missing = TEMPLATE_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      setGlobalErrors([`Faltan columnas requeridas: ${missing.join(', ')}`]);
      return;
    }

    const objects = csvToObjects<CsvRow>(rows);

    // Validar y agrupar por po_ref
    const groupMap = new Map<string, ParsedPO>();
    const seenSkuPerPo = new Map<string, Set<string>>(); // po_ref → set de SKUs

    objects.forEach((row, idx) => {
      const rowIndex = idx + 2; // +1 por header, +1 por 1-based
      const po_ref = row.po_ref.trim();
      const supplier = row.supplier.trim();
      const notes = row.notes.trim();
      const product_sku = row.product_sku.trim().toUpperCase();
      const qty_ordered = parseFloat(row.qty_ordered);
      const unit_cost = parseFloat(row.unit_cost);
      const item_notes = row.item_notes.trim();

      const lineErrors: string[] = [];
      if (!po_ref) lineErrors.push('po_ref vacío');
      if (!supplier) lineErrors.push('supplier vacío');
      if (!product_sku) lineErrors.push('product_sku vacío');
      if (isNaN(qty_ordered) || qty_ordered <= 0) lineErrors.push('qty_ordered debe ser número > 0');
      if (isNaN(unit_cost) || unit_cost < 0) lineErrors.push('unit_cost debe ser número >= 0');

      const product = product_sku ? productBySku.get(product_sku) : null;
      if (product_sku && !product) lineErrors.push(`SKU "${product_sku}" no existe en el catálogo`);

      // Asegurar po_ref único de SKUs
      if (po_ref && product_sku) {
        const set = seenSkuPerPo.get(po_ref) ?? new Set<string>();
        if (set.has(product_sku)) {
          lineErrors.push(`SKU duplicado en el mismo PO (${product_sku} aparece más de una vez en ${po_ref})`);
        } else {
          set.add(product_sku);
          seenSkuPerPo.set(po_ref, set);
        }
      }

      const line: ParsedLine = {
        rowIndex,
        po_ref,
        product_sku,
        product_id: product?.id ?? null,
        product_name: product?.name ?? null,
        qty_ordered,
        unit_cost,
        item_notes,
        errors: lineErrors,
      };

      if (!po_ref) return; // sin po_ref no podemos agrupar

      const existing = groupMap.get(po_ref);
      if (existing) {
        // Validar que supplier y notes sean consistentes
        if (existing.supplier !== supplier && supplier) {
          existing.errors.push(`Supplier inconsistente en fila ${rowIndex}: "${supplier}" vs "${existing.supplier}"`);
        }
        if (existing.notes !== notes && notes && existing.notes) {
          existing.errors.push(`Notes inconsistente en fila ${rowIndex}`);
        }
        existing.lines.push(line);
      } else {
        groupMap.set(po_ref, {
          po_ref,
          supplier,
          notes,
          lines: [line],
          errors: [],
        });
      }
    });

    setParsedPOs(Array.from(groupMap.values()));
  };

  const clear = () => {
    setCsvText('');
    setFilename('');
    setParsedPOs([]);
    setGlobalErrors([]);
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ============================================================
  // IMPORT
  // ============================================================
  const validPOs = parsedPOs.filter((po) =>
    po.errors.length === 0 && po.lines.length > 0 && po.lines.every((l) => l.errors.length === 0)
  );

  const invalidPOCount = parsedPOs.length - validPOs.length;

  const handleImport = async () => {
    if (validPOs.length === 0) return;
    if (!confirm(`Crear ${validPOs.length} órdenes de compra en estado "Borrador"? Cada una tendrá su folio auto-generado.`)) return;

    setImporting(true);
    setResults([]);
    const newResults: ImportResult[] = [];

    for (const po of validPOs) {
      const { data: poRow, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({ supplier: po.supplier, notes: po.notes })
        .select()
        .single();

      if (poErr || !poRow) {
        newResults.push({ po_ref: po.po_ref, status: 'error', error: poErr?.message ?? 'Error al crear PO' });
        continue;
      }

      const itemsPayload = po.lines.map((l) => ({
        purchase_order_id: poRow.id,
        product_id: l.product_id!,
        qty_ordered: l.qty_ordered,
        unit_cost: l.unit_cost,
        notes: l.item_notes,
      }));

      const { error: itemsErr } = await supabase.from('po_items').insert(itemsPayload);

      if (itemsErr) {
        await supabase.from('purchase_orders').delete().eq('id', poRow.id);
        newResults.push({ po_ref: po.po_ref, status: 'error', error: `Items fallaron: ${itemsErr.message}` });
      } else {
        newResults.push({ po_ref: po.po_ref, status: 'created', folio: poRow.folio });
      }
    }

    setResults(newResults);
    setImporting(false);
    if (newResults.some((r) => r.status === 'created')) {
      onImported();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (!isAdmin) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-white text-sm font-semibold mb-1">Solo administración</p>
          <p className="text-gray-500 text-xs">La importación masiva de POs solo la puede hacer el rol <strong className="text-amber-400">admin</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
        <div className="flex items-center gap-3">
          <ListPlus size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Importar POs por CSV</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300" title="Cerrar">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Plantilla */}
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 space-y-2">
          <p className="text-amber-300 text-xs font-semibold flex items-center gap-1.5">
            <Info size={12} /> Plantilla CSV
          </p>
          <p className="text-amber-300/70 text-[11px] leading-relaxed">
            La primera fila es el encabezado. Las filas con el mismo <code className="font-mono bg-black/40 px-1 rounded">po_ref</code> se agrupan en un mismo PO.
            Cada línea genera un <code className="font-mono bg-black/40 px-1 rounded">po_item</code> con su SKU.
          </p>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 rounded text-xs font-semibold transition-all"
          >
            <Download size={12} />
            Descargar plantilla
          </button>
        </div>

        {/* Columnas */}
        <div className="bg-black/40 border border-gray-800 rounded-lg p-3 space-y-1.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Columnas requeridas</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div><code className="font-mono text-amber-400">po_ref</code> <span className="text-gray-500">— ID temporal</span></div>
            <div><code className="font-mono text-amber-400">supplier</code> <span className="text-gray-500">— proveedor</span></div>
            <div><code className="font-mono text-amber-400">notes</code> <span className="text-gray-500">— opcional</span></div>
            <div><code className="font-mono text-amber-400">product_sku</code> <span className="text-gray-500">— del catálogo</span></div>
            <div><code className="font-mono text-amber-400">qty_ordered</code> <span className="text-gray-500">— número &gt; 0</span></div>
            <div><code className="font-mono text-amber-400">unit_cost</code> <span className="text-gray-500">— número ≥ 0</span></div>
            <div className="col-span-2"><code className="font-mono text-amber-400">item_notes</code> <span className="text-gray-500">— opcional</span></div>
          </div>
        </div>

        {/* Drop zone / file picker */}
        {!csvText && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-800 hover:border-amber-500/40 rounded-lg p-6 text-center transition-all"
          >
            <Upload size={32} className="mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400 text-xs mb-1">Arrastra el archivo CSV aquí</p>
            <p className="text-gray-600 text-[10px] mb-3">o</p>
            <label className="inline-block cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded text-xs font-semibold inline-flex items-center gap-1.5">
                <Upload size={12} />
                Seleccionar archivo
              </span>
            </label>
          </div>
        )}

        {/* Archivo cargado */}
        {csvText && (
          <div className="flex items-center gap-2 p-2.5 bg-black border border-gray-800 rounded-lg">
            <FileText size={14} className="text-amber-400 flex-shrink-0" />
            <span className="text-white text-xs flex-1 truncate">{filename}</span>
            <button onClick={clear} className="text-gray-500 hover:text-red-400" title="Quitar archivo">
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {/* Errores globales */}
        {globalErrors.length > 0 && (
          <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3 space-y-1">
            {globalErrors.map((e, i) => (
              <p key={i} className="text-red-400 text-xs flex items-start gap-1.5">
                <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {e}
              </p>
            ))}
          </div>
        )}

        {/* Preview */}
        {parsedPOs.length > 0 && results.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <p className="text-gray-400 uppercase tracking-wide font-bold">
                Preview ({parsedPOs.length} {parsedPOs.length === 1 ? 'PO' : 'POs'})
              </p>
              {invalidPOCount > 0 && (
                <span className="text-orange-400 text-[11px]">{invalidPOCount} con errores</span>
              )}
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {parsedPOs.map((po) => {
                const allLineErrors = po.lines.flatMap((l) => l.errors.map((e) => `Fila ${l.rowIndex}: ${e}`));
                const hasErrors = po.errors.length > 0 || allLineErrors.length > 0;
                const total = po.lines.reduce((s, l) => s + (l.qty_ordered * l.unit_cost), 0);
                return (
                  <div
                    key={po.po_ref}
                    className={`border rounded-lg p-3 ${hasErrors ? 'bg-red-950/10 border-red-900/40' : 'bg-black border-gray-800'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag size={13} className={hasErrors ? 'text-red-400' : 'text-amber-400'} />
                      <span className="font-mono text-amber-400 text-xs font-bold">{po.po_ref}</span>
                      <span className="text-white text-xs truncate flex-1">{po.supplier}</span>
                      <span className="text-green-400 text-xs font-bold">{formatMXN(total)}</span>
                    </div>
                    {po.notes && <p className="text-gray-500 text-[11px] mb-2 italic">{po.notes}</p>}
                    <div className="space-y-1">
                      {po.lines.map((l) => (
                        <div key={l.rowIndex} className={`text-[11px] flex items-center gap-2 ${l.errors.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {l.errors.length > 0 ? <AlertCircle size={10} /> : <CheckCircle2 size={10} className="text-green-500" />}
                          <span className="font-mono text-amber-400/70">{l.product_sku}</span>
                          <span className="text-gray-600">·</span>
                          <span>{l.qty_ordered} × {formatMXN(l.unit_cost)}</span>
                          {l.product_name && <span className="text-gray-600 truncate">— {l.product_name}</span>}
                        </div>
                      ))}
                    </div>
                    {(po.errors.length > 0 || allLineErrors.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-red-900/30 space-y-0.5">
                        {[...po.errors, ...allLineErrors].slice(0, 4).map((e, i) => (
                          <p key={i} className="text-red-400 text-[10px]">⚠ {e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black/40 border border-gray-800 rounded-lg">
              <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Listas para importar</span>
              <span className="text-amber-400 font-bold text-base">{validPOs.length} / {parsedPOs.length}</span>
            </div>
          </div>
        )}

        {/* Resultados */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs uppercase tracking-wide font-bold">Resultados</p>
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {results.map((r) => (
                <div
                  key={r.po_ref}
                  className={`flex items-start gap-2 p-2 rounded border text-xs ${
                    r.status === 'created'
                      ? 'bg-green-500/5 border-green-500/20 text-green-400'
                      : 'bg-red-500/5 border-red-500/20 text-red-400'
                  }`}
                >
                  {r.status === 'created' ? <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono">
                      <strong>{r.po_ref}</strong>
                      {r.folio && (
                        <>
                          <ArrowRight size={10} className="inline mx-1" />
                          <span className="text-amber-400 font-bold">{r.folio}</span>
                        </>
                      )}
                    </p>
                    {r.error && <p className="text-[10px] mt-0.5 opacity-80">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-2.5 bg-black/40 border border-gray-800 rounded text-xs">
              <span className="text-green-400">{results.filter(r => r.status === 'created').length} creadas</span>
              <span className="text-red-400">{results.filter(r => r.status === 'error').length} con error</span>
            </div>
          </div>
        )}

        {/* Acciones */}
        {parsedPOs.length > 0 && results.length === 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              disabled={importing || validPOs.length === 0}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <ListPlus size={14} />}
              Importar {validPOs.length} {validPOs.length === 1 ? 'PO' : 'POs'}
            </button>
            <button
              onClick={clear}
              disabled={importing}
              className="px-4 py-2.5 bg-black border border-gray-800 rounded-lg text-gray-400 text-sm hover:text-white"
            >
              Cancelar
            </button>
          </div>
        )}

        {results.length > 0 && (
          <button
            onClick={clear}
            className="w-full bg-black border border-gray-800 hover:border-amber-500/40 text-gray-400 hover:text-amber-400 py-2 rounded-lg text-xs font-medium"
          >
            Importar otro archivo
          </button>
        )}
      </div>
    </div>
  );
}
