import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Download, FileText, X, AlertCircle, CheckCircle2, Loader2,
  ListPlus, Trash2, Info, ArrowRight, Package,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseCSV, csvToObjects, objectsToCSV, downloadCSV } from './csvUtils';
import type { SalesChannel } from './PreordersTable';

interface BulkOrderImportProps {
  isAdmin: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface CsvRow {
  external_ref: string;
  sales_channel: string;
  source_label: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_sku: string;
  qty: string;
  unit_price: string;
  payment_method: string;
  payment_date: string;
  payment_amount: string;
  payment_reference: string;
  delivery_promise_date: string;
  etapa: string;
  notes: string;
}

interface ParsedLine {
  rowIndex: number;
  external_ref: string;
  product_sku: string;
  product_id: string | null;
  product_name: string | null;
  qty: number;
  unit_price: number;
  errors: string[];
}

interface ParsedOrder {
  external_ref: string;
  sales_channel: SalesChannel;
  source_label: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method: string;
  payment_date: string;
  payment_amount: number | null;
  payment_reference: string;
  delivery_promise_date: string;
  etapa: string;
  notes: string;
  lines: ParsedLine[];
  errors: string[];
}

interface ImportResult {
  external_ref: string;
  status: 'created' | 'error';
  folio?: string;
  error?: string;
}

interface Product { id: string; sku: string; name: string; active: boolean }
interface Warehouse { id: string; code: string }

const TEMPLATE_HEADERS = [
  'external_ref', 'sales_channel', 'source_label',
  'customer_name', 'customer_email', 'customer_phone',
  'product_sku', 'qty', 'unit_price',
  'payment_method', 'payment_date', 'payment_amount', 'payment_reference',
  'delivery_promise_date', 'etapa', 'notes',
];

// Mapeo del Excel del usuario: Canal Excel → sales_channel + source_label
const CHANNEL_HINTS: Record<string, { channel: SalesChannel; label: string }> = {
  'mayorista maggie':  { channel: 'manual_other', label: 'Maggie' },
  'mayorista julio':   { channel: 'manual_other', label: 'Julio' },
  'mayorista':         { channel: 'manual_other', label: 'Mayorista' },
  'lumen':             { channel: 'manual_other', label: 'Lumen' },
  'armo diseño':       { channel: 'manual_visit', label: 'Armo' },
  'armo diseno':       { channel: 'manual_visit', label: 'Armo' },
  'pedido adicional':  { channel: 'manual_other', label: 'Cerezo Adicional' },
  'en linea':          { channel: 'web',          label: '' },
};

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function BulkOrderImport({ isAdmin, onClose, onImported }: BulkOrderImportProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [csvText, setCsvText] = useState('');
  const [filename, setFilename] = useState('');
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    const [pRes, wRes] = await Promise.all([
      supabase.from('products').select('id, sku, name, active').eq('active', true),
      supabase.from('warehouses').select('id, code').eq('active', true),
    ]);
    setProducts((pRes.data as Product[]) || []);
    setWarehouses((wRes.data as Warehouse[]) || []);
  };

  const productBySku = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.sku.toUpperCase(), p));
    return m;
  }, [products]);

  const defaultWarehouseId = warehouses.find((w) => w.code === 'COYOACAN')?.id || warehouses[0]?.id || '';

  // Mapeo de canal Excel → sales_channel
  const resolveChannel = (raw: string): { channel: SalesChannel; label: string } => {
    const key = (raw || '').trim().toLowerCase();
    const hint = CHANNEL_HINTS[key];
    if (hint) return hint;
    // Si el valor coincide directamente con un sales_channel válido
    const validChannels: SalesChannel[] = ['web', 'manual_phone', 'manual_whatsapp', 'manual_email', 'manual_visit', 'manual_event', 'manual_other'];
    if (validChannels.includes(key as SalesChannel)) {
      return { channel: key as SalesChannel, label: '' };
    }
    return { channel: 'manual_other', label: raw };
  };

  // ============================================================
  // TEMPLATE
  // ============================================================
  const handleDownloadTemplate = () => {
    const sampleProducts = products.slice(0, 3);
    const sampleRows = [
      {
        external_ref: 'EXT-1',
        sales_channel: 'Mayorista Maggie',
        source_label: '',
        customer_name: 'Tiendas M&R',
        customer_email: 'tiendas@ejemplo.com',
        customer_phone: '5512345678',
        product_sku: sampleProducts[0]?.sku ?? 'ALBUM-DURA',
        qty: 32,
        unit_price: 280,
        payment_method: 'transferencia',
        payment_date: new Date().toISOString().split('T')[0],
        payment_amount: '',
        payment_reference: '',
        delivery_promise_date: '',
        etapa: '1',
        notes: '',
      },
      {
        external_ref: 'EXT-1',
        sales_channel: 'Mayorista Maggie',
        source_label: '',
        customer_name: 'Tiendas M&R',
        customer_email: 'tiendas@ejemplo.com',
        customer_phone: '5512345678',
        product_sku: sampleProducts[1]?.sku ?? 'ALBUM-SOFT',
        qty: 20,
        unit_price: 80,
        payment_method: 'transferencia',
        payment_date: new Date().toISOString().split('T')[0],
        payment_amount: '',
        payment_reference: '',
        delivery_promise_date: '',
        etapa: '1',
        notes: '',
      },
      {
        external_ref: 'EXT-2',
        sales_channel: 'Lumen',
        source_label: '',
        customer_name: 'Abastecedora Lumen SA de CV',
        customer_email: 'compras@lumen.mx',
        customer_phone: '',
        product_sku: sampleProducts[2]?.sku ?? 'CORRUGADO-16',
        qty: 56,
        unit_price: 32000,
        payment_method: 'transferencia',
        payment_date: new Date().toISOString().split('T')[0],
        payment_amount: '',
        payment_reference: 'TRX-001',
        delivery_promise_date: '',
        etapa: '1',
        notes: 'Entrega en bodega del cliente',
      },
    ];
    const csv = objectsToCSV(TEMPLATE_HEADERS, sampleRows);
    downloadCSV('plantilla-import-pedidos-externos.csv', csv);
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
    setParsedOrders([]);
    setResults([]);

    let rows: string[][];
    try {
      rows = parseCSV(text);
    } catch {
      setGlobalErrors(['No se pudo parsear el CSV.']);
      return;
    }

    if (rows.length < 2) {
      setGlobalErrors(['El CSV está vacío o solo tiene encabezados.']);
      return;
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const required = ['external_ref', 'sales_channel', 'customer_name', 'customer_email', 'product_sku', 'qty', 'unit_price'];
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      setGlobalErrors([`Faltan columnas requeridas: ${missing.join(', ')}`]);
      return;
    }

    const objects = csvToObjects<CsvRow>(rows);

    const groupMap = new Map<string, ParsedOrder>();
    const seenSkuPerOrder = new Map<string, Set<string>>();

    objects.forEach((row, idx) => {
      const rowIndex = idx + 2;
      const external_ref = row.external_ref.trim();
      const customer_name = row.customer_name.trim();
      const customer_email = row.customer_email.trim();
      const product_sku = row.product_sku.trim().toUpperCase();
      const qty = parseFloat(row.qty);
      const unit_price = parseFloat(row.unit_price);

      const lineErrors: string[] = [];
      if (!external_ref) lineErrors.push('external_ref vacío');
      if (!product_sku) lineErrors.push('product_sku vacío');
      if (isNaN(qty) || qty <= 0) lineErrors.push('qty debe ser número > 0');
      if (isNaN(unit_price) || unit_price < 0) lineErrors.push('unit_price debe ser número >= 0');

      const product = product_sku ? productBySku.get(product_sku) : null;
      if (product_sku && !product) lineErrors.push(`SKU "${product_sku}" no existe en el catálogo`);

      if (external_ref && product_sku) {
        const set = seenSkuPerOrder.get(external_ref) ?? new Set<string>();
        if (set.has(product_sku)) {
          lineErrors.push(`SKU duplicado en ${external_ref}`);
        } else {
          set.add(product_sku);
          seenSkuPerOrder.set(external_ref, set);
        }
      }

      const line: ParsedLine = {
        rowIndex,
        external_ref,
        product_sku,
        product_id: product?.id ?? null,
        product_name: product?.name ?? null,
        qty,
        unit_price,
        errors: lineErrors,
      };

      if (!external_ref) return;

      const existing = groupMap.get(external_ref);
      if (existing) {
        // Datos del cliente deben ser consistentes
        if (existing.customer_name !== customer_name && customer_name) {
          existing.errors.push(`customer_name inconsistente en fila ${rowIndex}: "${customer_name}" vs "${existing.customer_name}"`);
        }
        existing.lines.push(line);
      } else {
        const { channel, label } = resolveChannel(row.sales_channel);
        const sourceLabel = (row.source_label || '').trim() || label;
        const headerErrors: string[] = [];
        if (!customer_name) headerErrors.push('customer_name vacío');
        if (!customer_email) headerErrors.push('customer_email vacío');

        let paymentAmount: number | null = null;
        if (row.payment_amount && row.payment_amount.trim() !== '') {
          paymentAmount = parseFloat(row.payment_amount);
          if (isNaN(paymentAmount) || paymentAmount <= 0) {
            headerErrors.push('payment_amount inválido');
            paymentAmount = null;
          }
        }

        groupMap.set(external_ref, {
          external_ref,
          sales_channel: channel,
          source_label: sourceLabel,
          customer_name,
          customer_email,
          customer_phone: row.customer_phone.trim(),
          payment_method: (row.payment_method || 'transferencia').trim(),
          payment_date: row.payment_date.trim(),
          payment_amount: paymentAmount,
          payment_reference: row.payment_reference.trim(),
          delivery_promise_date: row.delivery_promise_date.trim(),
          etapa: row.etapa.trim(),
          notes: row.notes.trim(),
          lines: [line],
          errors: headerErrors,
        });
      }
    });

    setParsedOrders(Array.from(groupMap.values()));
  };

  const clear = () => {
    setCsvText('');
    setFilename('');
    setParsedOrders([]);
    setGlobalErrors([]);
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validOrders = parsedOrders.filter((o) =>
    o.errors.length === 0 && o.lines.length > 0 && o.lines.every((l) => l.errors.length === 0)
  );

  const invalidCount = parsedOrders.length - validOrders.length;

  // ============================================================
  // IMPORT
  // ============================================================
  const handleImport = async () => {
    if (validOrders.length === 0) return;
    if (!confirm(`Crear ${validOrders.length} pedidos externos como "confirmed/pagado"? Cada uno generará folio ORD-AAAA-NNNN automático y se intentará reservar stock.`)) return;
    if (!defaultWarehouseId) return setGlobalErrors(['No hay almacén configurado.']);

    setImporting(true);
    setResults([]);
    const newResults: ImportResult[] = [];

    for (const ord of validOrders) {
      const total = ord.lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
      const paidAmount = ord.payment_amount ?? total;
      const isFullyPaid = paidAmount >= total;

      // Build legacy items JSONB
      const legacyItems = ord.lines.map((l) => ({
        product: l.product_name ?? '—',
        quantity: l.qty,
        unit_price: l.unit_price,
        subtotal: l.qty * l.unit_price,
      }));

      // 1. Insert preorder
      const paidAtIso = ord.payment_date
        ? new Date(ord.payment_date + 'T12:00:00').toISOString()
        : new Date().toISOString();

      const { data: po, error: poErr } = await supabase
        .from('preorders')
        .insert({
          name: ord.customer_name,
          email: ord.customer_email,
          phone: ord.customer_phone,
          company: '',
          city: '',
          state: '',
          notes: ord.notes,
          items: legacyItems,
          total,
          status: isFullyPaid ? 'confirmed' : 'partial_payment',
          sales_channel: ord.sales_channel,
          source_reference: ord.source_label,
          warehouse_id: defaultWarehouseId,
          delivery_promise_date: ord.delivery_promise_date || null,
          etapa: ord.etapa || null,
          payment_status: isFullyPaid ? 'paid' : 'partial',
          payment_method: ord.payment_method,
          payment_confirmed_at: paidAtIso,
          partial_payment_amount: isFullyPaid ? null : paidAmount,
        })
        .select()
        .single();

      if (poErr || !po) {
        newResults.push({ external_ref: ord.external_ref, status: 'error', error: poErr?.message ?? 'No se pudo crear pedido' });
        continue;
      }

      // 2. Insert order_items
      const itemsPayload = ord.lines.map((l) => ({
        order_id: po.id,
        product_id: l.product_id!,
        qty: l.qty,
        unit_price: l.unit_price,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsErr) {
        await supabase.from('preorders').delete().eq('id', po.id);
        newResults.push({ external_ref: ord.external_ref, status: 'error', error: `Items: ${itemsErr.message}` });
        continue;
      }

      // 3. Insert order_payment
      await supabase.from('order_payments').insert({
        order_id: po.id,
        amount: paidAmount,
        method: ord.payment_method,
        paid_at: paidAtIso,
        reference: ord.payment_reference,
        notes: 'Importación masiva: pedido externo',
      });

      // 4. Intentar reservas (solo si fully paid)
      let backorder = false;
      const successful: { product_id: string; qty: number }[] = [];
      if (isFullyPaid) {
        for (const l of ord.lines) {
          const { error: rErr } = await supabase.rpc('apply_movement', {
            p_type: 'reservation',
            p_product_id: l.product_id,
            p_warehouse_id: defaultWarehouseId,
            p_qty: l.qty,
            p_reference_type: 'order',
            p_reference_id: po.id,
            p_notes: `Reserva pedido externo ${po.folio ?? po.order_number}`,
          });
          if (rErr) { backorder = true; break; }
          successful.push({ product_id: l.product_id!, qty: l.qty });
        }

        if (backorder) {
          for (const r of successful) {
            await supabase.rpc('apply_movement', {
              p_type: 'release',
              p_product_id: r.product_id,
              p_warehouse_id: defaultWarehouseId,
              p_qty: r.qty,
              p_reference_type: 'order',
              p_reference_id: po.id,
              p_notes: `Release compensatorio ${po.folio ?? po.order_number}`,
            });
          }
          await supabase.from('preorders').update({ status: 'backorder' }).eq('id', po.id);
        }
      }

      const folio = po.folio ?? po.order_number;
      newResults.push({
        external_ref: ord.external_ref,
        status: 'created',
        folio: backorder ? `${folio} (backorder)` : folio,
      });
    }

    setResults(newResults);
    setImporting(false);
    if (newResults.some((r) => r.status === 'created')) onImported();
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
          <p className="text-gray-500 text-xs">La importación masiva la gestiona el rol <strong className="text-amber-400">admin</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
        <div className="flex items-center gap-3">
          <ListPlus size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Importar pedidos externos por CSV</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
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
            Filas con el mismo <code className="font-mono bg-black/40 px-1 rounded">external_ref</code> se agrupan en un mismo pedido (multi-línea).
            Los pedidos entran como <strong>confirmed/paid</strong>. Si no hay stock, pasan a <strong>backorder</strong>.
          </p>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 rounded text-xs font-semibold"
          >
            <Download size={12} /> Descargar plantilla
          </button>
        </div>

        {/* Mapeo de canales */}
        <details className="bg-black/40 border border-gray-800 rounded-lg">
          <summary className="cursor-pointer px-3 py-2 text-[11px] text-gray-400 uppercase tracking-wide font-bold">
            Mapeo de canales (Excel → BD)
          </summary>
          <div className="px-3 pb-3 text-[11px] space-y-1 text-gray-500">
            {Object.entries(CHANNEL_HINTS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <code className="font-mono text-amber-400/80">{k}</code>
                <ArrowRight size={10} />
                <code className="font-mono text-blue-400/80">{v.channel}</code>
                {v.label && <span className="text-gray-600">+ source: <code className="font-mono">{v.label}</code></span>}
              </div>
            ))}
          </div>
        </details>

        {/* Drop zone */}
        {!csvText && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-800 hover:border-amber-500/40 rounded-lg p-6 text-center transition-all"
          >
            <Upload size={32} className="mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400 text-xs mb-1">Arrastra el CSV aquí</p>
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
                <Upload size={12} /> Seleccionar archivo
              </span>
            </label>
          </div>
        )}

        {csvText && (
          <div className="flex items-center gap-2 p-2.5 bg-black border border-gray-800 rounded-lg">
            <FileText size={14} className="text-amber-400" />
            <span className="text-white text-xs flex-1 truncate">{filename}</span>
            <button onClick={clear} className="text-gray-500 hover:text-red-400">
              <Trash2 size={13} />
            </button>
          </div>
        )}

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
        {parsedOrders.length > 0 && results.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <p className="text-gray-400 uppercase tracking-wide font-bold">
                Preview ({parsedOrders.length} {parsedOrders.length === 1 ? 'pedido' : 'pedidos'})
              </p>
              {invalidCount > 0 && (
                <span className="text-orange-400 text-[11px]">{invalidCount} con errores</span>
              )}
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {parsedOrders.map((o) => {
                const allLineErrors = o.lines.flatMap((l) => l.errors.map((e) => `Fila ${l.rowIndex}: ${e}`));
                const hasErrors = o.errors.length > 0 || allLineErrors.length > 0;
                const total = o.lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
                return (
                  <div key={o.external_ref}
                    className={`border rounded-lg p-3 ${hasErrors ? 'bg-red-950/10 border-red-900/40' : 'bg-black border-gray-800'}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Package size={13} className={hasErrors ? 'text-red-400' : 'text-amber-400'} />
                      <span className="font-mono text-amber-400 text-xs font-bold">{o.external_ref}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                        {o.sales_channel}{o.source_label && ` · ${o.source_label}`}
                      </span>
                      {o.etapa && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                          etapa {o.etapa}
                        </span>
                      )}
                      <span className="text-white text-xs truncate flex-1">{o.customer_name}</span>
                      <span className="text-green-400 text-xs font-bold">{formatMXN(total)}</span>
                    </div>
                    <p className="text-gray-500 text-[10px] mb-2">{o.customer_email}{o.customer_phone && ` · ${o.customer_phone}`}</p>
                    <div className="space-y-1">
                      {o.lines.map((l) => (
                        <div key={l.rowIndex} className={`text-[11px] flex items-center gap-2 ${l.errors.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {l.errors.length > 0 ? <AlertCircle size={10} /> : <CheckCircle2 size={10} className="text-green-500" />}
                          <span className="font-mono text-amber-400/70">{l.product_sku}</span>
                          <span className="text-gray-600">·</span>
                          <span>{l.qty} × {formatMXN(l.unit_price)}</span>
                          {l.product_name && <span className="text-gray-600 truncate">— {l.product_name}</span>}
                        </div>
                      ))}
                    </div>
                    {(o.errors.length > 0 || allLineErrors.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-red-900/30 space-y-0.5">
                        {[...o.errors, ...allLineErrors].slice(0, 4).map((e, i) => (
                          <p key={i} className="text-red-400 text-[10px]">⚠ {e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black/40 border border-gray-800 rounded-lg">
              <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Listos para importar</span>
              <span className="text-amber-400 font-bold text-base">{validOrders.length} / {parsedOrders.length}</span>
            </div>
          </div>
        )}

        {/* Resultados */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs uppercase tracking-wide font-bold">Resultados</p>
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {results.map((r) => (
                <div key={r.external_ref}
                  className={`flex items-start gap-2 p-2 rounded border text-xs ${
                    r.status === 'created'
                      ? 'bg-green-500/5 border-green-500/20 text-green-400'
                      : 'bg-red-500/5 border-red-500/20 text-red-400'
                  }`}>
                  {r.status === 'created' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono">
                      <strong>{r.external_ref}</strong>
                      {r.folio && (<><ArrowRight size={10} className="inline mx-1" /><span className="text-amber-400 font-bold">{r.folio}</span></>)}
                    </p>
                    {r.error && <p className="text-[10px] mt-0.5 opacity-80">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-2.5 bg-black/40 border border-gray-800 rounded text-xs">
              <span className="text-green-400">{results.filter(r => r.status === 'created').length} creados</span>
              <span className="text-red-400">{results.filter(r => r.status === 'error').length} con error</span>
            </div>
          </div>
        )}

        {/* Acciones */}
        {parsedOrders.length > 0 && results.length === 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              disabled={importing || validOrders.length === 0}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <ListPlus size={14} />}
              Importar {validOrders.length} {validOrders.length === 1 ? 'pedido' : 'pedidos'}
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
