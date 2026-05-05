import { useEffect, useState } from 'react';
import {
  Plus, Minus, ArrowLeftRight, ScrollText, Loader2, AlertCircle, CheckCircle2,
  Package, Building2, ArrowRight, Combine,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { StockRow } from './StockTable';

interface Product { id: string; sku: string; name: string; active: boolean }
interface Warehouse { id: string; code: string; name: string }

interface MovementRow {
  id: string;
  type: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  warehouse_id: string;
  warehouse_code: string;
  qty: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string;
  created_at: string;
}

type Mode = 'kardex' | 'adjust' | 'transfer' | 'convert';

interface InventoryEditorProps {
  selectedRow: StockRow | null;
  canWrite: boolean;
  onChanged: () => void;
}

const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; color: string; sign: '+' | '-' | '=' }> = {
  entry:            { label: 'Entrada',          color: 'text-green-400',  sign: '+' },
  exit:             { label: 'Salida',           color: 'text-red-400',    sign: '-' },
  adjustment_plus:  { label: 'Ajuste +',         color: 'text-blue-400',   sign: '+' },
  adjustment_minus: { label: 'Ajuste -',         color: 'text-orange-400', sign: '-' },
  transfer_out:     { label: 'Transfer. salida', color: 'text-orange-400', sign: '-' },
  transfer_in:      { label: 'Transfer. entrada',color: 'text-green-400',  sign: '+' },
  reservation:      { label: 'Reserva',          color: 'text-amber-400',  sign: '=' },
  release:          { label: 'Liberación',       color: 'text-gray-400',   sign: '=' },
  conversion_out:   { label: 'Conversión salida', color: 'text-purple-400', sign: '-' },
  conversion_in:    { label: 'Conversión entrada', color: 'text-cyan-400', sign: '+' },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function InventoryEditor({ selectedRow, canWrite, onChanged }: InventoryEditorProps) {
  const [mode, setMode] = useState<Mode>('kardex');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Form: ajuste
  const [adjProductId, setAdjProductId] = useState('');
  const [adjWarehouseId, setAdjWarehouseId] = useState('');
  const [adjDirection, setAdjDirection] = useState<'plus' | 'minus'>('minus');
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjReason, setAdjReason] = useState('');

  // Form: transferencia
  const [trfProductId, setTrfProductId] = useState('');
  const [trfSourceId, setTrfSourceId] = useState('');
  const [trfTargetId, setTrfTargetId] = useState('');
  const [trfQty, setTrfQty] = useState<number>(1);
  const [trfNotes, setTrfNotes] = useState('');

  // Form: conversión
  const [convFromProductId, setConvFromProductId] = useState('');
  const [convToProductId, setConvToProductId] = useState('');
  const [convFromQty, setConvFromQty] = useState<number>(1);
  const [convToQty, setConvToQty] = useState<number>(1);
  const [convWarehouseId, setConvWarehouseId] = useState('');
  const [convNotes, setConvNotes] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (mode === 'kardex') fetchMovements();
  }, [mode, selectedRow?.product_id, selectedRow?.warehouse_id]);

  // Pre-rellenar formularios cuando hay row seleccionado
  useEffect(() => {
    if (selectedRow) {
      setAdjProductId(selectedRow.product_id);
      setAdjWarehouseId(selectedRow.warehouse_id);
      setTrfProductId(selectedRow.product_id);
      setTrfSourceId(selectedRow.warehouse_id);
      setConvFromProductId(selectedRow.product_id);
      setConvWarehouseId(selectedRow.warehouse_id);
    }
  }, [selectedRow?.product_id, selectedRow?.warehouse_id]);

  const fetchCatalog = async () => {
    const [pRes, wRes] = await Promise.all([
      supabase.from('products').select('id, sku, name, active').eq('active', true).order('name'),
      supabase.from('warehouses').select('id, code, name').eq('active', true).order('name'),
    ]);
    setProducts((pRes.data as Product[]) || []);
    setWarehouses((wRes.data as Warehouse[]) || []);
  };

  const fetchMovements = async () => {
    setLoadingMovements(true);
    let query = supabase
      .from('inventory_movements')
      .select('*, product:products(sku, name), warehouse:warehouses(code)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (selectedRow) {
      query = query
        .eq('product_id', selectedRow.product_id)
        .eq('warehouse_id', selectedRow.warehouse_id);
    }

    const { data } = await query;

    const rows: MovementRow[] = (data || []).map((m) => {
      const r = m as {
        id: string;
        type: string;
        product_id: string;
        warehouse_id: string;
        qty: number;
        reference_type: string | null;
        reference_id: string | null;
        notes: string;
        created_at: string;
        product?: { sku: string; name: string } | null;
        warehouse?: { code: string } | null;
      };
      return {
        id: r.id,
        type: r.type,
        product_id: r.product_id,
        product_sku: r.product?.sku ?? '—',
        product_name: r.product?.name ?? '—',
        warehouse_id: r.warehouse_id,
        warehouse_code: r.warehouse?.code ?? '—',
        qty: Number(r.qty),
        reference_type: r.reference_type,
        reference_id: r.reference_id,
        notes: r.notes,
        created_at: r.created_at,
      };
    });

    setMovements(rows);
    setLoadingMovements(false);
  };

  const showError = (msg: string) => { setStatus('error'); setMessage(msg); };
  const showSuccess = (msg: string) => {
    setStatus('success');
    setMessage(msg);
    setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
  };

  // Generar folio (ADJ-YYYY-NNNN o TRF-YYYY-NNNN)
  const generateFolio = async (entityType: 'adjustment' | 'transfer'): Promise<string | null> => {
    const { data, error } = await supabase.rpc('next_folio', { p_entity_type: entityType });
    if (error || !data) {
      showError(`No se pudo generar folio: ${error?.message ?? 'error'}`);
      return null;
    }
    return data as string;
  };

  const handleAdjustment = async () => {
    if (!adjProductId || !adjWarehouseId) return showError('Selecciona producto y almacén.');
    if (adjQty <= 0) return showError('La cantidad debe ser > 0.');
    if (!adjReason.trim()) return showError('La razón del ajuste es obligatoria.');

    setStatus('loading');
    setMessage('');

    const folio = await generateFolio('adjustment');
    if (!folio) return;

    const movementType = adjDirection === 'plus' ? 'adjustment_plus' : 'adjustment_minus';

    const { error } = await supabase.rpc('apply_movement', {
      p_type: movementType,
      p_product_id: adjProductId,
      p_warehouse_id: adjWarehouseId,
      p_qty: adjQty,
      p_reference_type: 'adjustment',
      p_reference_id: null,
      p_notes: `${folio} — ${adjReason.trim()}`,
    });

    if (error) return showError(error.message);

    showSuccess(`Ajuste ${folio} aplicado: ${adjDirection === 'plus' ? '+' : '-'}${adjQty} u.`);
    setAdjQty(1);
    setAdjReason('');
    onChanged();
    if (mode === 'kardex') fetchMovements();
  };

  const handleConversion = async () => {
    if (!convFromProductId || !convToProductId) return showError('Selecciona producto origen y destino.');
    if (convFromProductId === convToProductId) return showError('Origen y destino deben ser distintos.');
    if (!convWarehouseId) return showError('Selecciona un almacén.');
    if (convFromQty <= 0 || convToQty <= 0) return showError('Las cantidades deben ser > 0.');
    if (!convNotes.trim()) return showError('El motivo es obligatorio.');

    setStatus('loading');
    setMessage('');

    const { data, error } = await supabase.rpc('apply_conversion', {
      p_from_product_id: convFromProductId,
      p_to_product_id: convToProductId,
      p_from_qty: convFromQty,
      p_to_qty: convToQty,
      p_warehouse_id: convWarehouseId,
      p_notes: convNotes.trim(),
    });

    if (error) return showError(error.message);

    const fromSku = products.find((p) => p.id === convFromProductId)?.sku ?? '?';
    const toSku = products.find((p) => p.id === convToProductId)?.sku ?? '?';
    showSuccess(`Conversión ${data} aplicada: ${convFromQty} ${fromSku} → ${convToQty} ${toSku}`);
    setConvFromQty(1);
    setConvToQty(1);
    setConvNotes('');
    onChanged();
    if (mode === 'kardex') fetchMovements();
  };

  const handleTransfer = async () => {
    if (!trfProductId || !trfSourceId || !trfTargetId) return showError('Selecciona producto y ambos almacenes.');
    if (trfSourceId === trfTargetId) return showError('Origen y destino deben ser distintos.');
    if (trfQty <= 0) return showError('La cantidad debe ser > 0.');

    setStatus('loading');
    setMessage('');

    const folio = await generateFolio('transfer');
    if (!folio) return;

    const transferRefId = crypto.randomUUID();
    const noteBase = `${folio}${trfNotes.trim() ? ' — ' + trfNotes.trim() : ''}`;

    // 1. transfer_out (origen)
    const { error: outErr } = await supabase.rpc('apply_movement', {
      p_type: 'transfer_out',
      p_product_id: trfProductId,
      p_warehouse_id: trfSourceId,
      p_qty: trfQty,
      p_reference_type: 'transfer',
      p_reference_id: transferRefId,
      p_notes: noteBase,
    });

    if (outErr) return showError(`Error en salida origen: ${outErr.message}`);

    // 2. transfer_in (destino)
    const { error: inErr } = await supabase.rpc('apply_movement', {
      p_type: 'transfer_in',
      p_product_id: trfProductId,
      p_warehouse_id: trfTargetId,
      p_qty: trfQty,
      p_reference_type: 'transfer',
      p_reference_id: transferRefId,
      p_notes: noteBase,
    });

    if (inErr) {
      // Compensar: revertir el out con un transfer_in al origen
      await supabase.rpc('apply_movement', {
        p_type: 'transfer_in',
        p_product_id: trfProductId,
        p_warehouse_id: trfSourceId,
        p_qty: trfQty,
        p_reference_type: 'transfer',
        p_reference_id: transferRefId,
        p_notes: `${folio} — REVERSO por error en destino`,
      });
      return showError(`Error en entrada destino (origen revertido): ${inErr.message}`);
    }

    showSuccess(`Transferencia ${folio} aplicada: ${trfQty} u.`);
    setTrfQty(1);
    setTrfNotes('');
    onChanged();
    if (mode === 'kardex') fetchMovements();
  };

  // ============================================================
  // RENDER
  // ============================================================

  const renderFeedback = () => (
    (status === 'success' || status === 'error') && (
      <div className={`flex items-start gap-3 p-3 rounded-lg border ${
        status === 'success'
          ? 'bg-green-950/30 border-green-800/40 text-green-400'
          : 'bg-red-950/30 border-red-800/40 text-red-400'
      }`}>
        {status === 'success' ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
        <p className="text-xs">{message}</p>
      </div>
    )
  );

  // Header con sub-tabs internas
  const renderHeader = () => (
    <div className="flex items-center gap-1 px-3 py-3 border-b border-gray-800 bg-amber-950/10">
      <button
        onClick={() => setMode('kardex')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          mode === 'kardex' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <ScrollText size={12} />
        Kardex
      </button>
      {canWrite && (
        <>
          <button
            onClick={() => setMode('adjust')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'adjust' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Plus size={12} />
            Ajuste
          </button>
          <button
            onClick={() => setMode('transfer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'transfer' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ArrowLeftRight size={12} />
            Transferir
          </button>
          <button
            onClick={() => setMode('convert')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'convert' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Combine size={12} />
            Convertir
          </button>
        </>
      )}
    </div>
  );

  // ===== KARDEX =====
  if (mode === 'kardex') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        {renderHeader()}
        <div className="p-4 space-y-3">
          {selectedRow ? (
            <div className="flex items-center gap-2 p-2.5 bg-amber-950/20 border border-amber-800/30 rounded-lg text-xs">
              <Package size={13} className="text-amber-400 flex-shrink-0" />
              <span className="font-mono text-amber-400/70">{selectedRow.product_sku}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-300 truncate">{selectedRow.warehouse_code}</span>
              <span className="ml-auto text-gray-500 text-[10px]">disponible: <strong className="text-green-400">{selectedRow.available}</strong></span>
            </div>
          ) : (
            <p className="text-gray-500 text-xs px-1">
              Mostrando últimos 50 movimientos. Click en una fila de stock para filtrar por producto/almacén.
            </p>
          )}

          {loadingMovements ? (
            <div className="text-center py-8 text-gray-600 text-xs">
              <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
              Cargando movimientos...
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
              <ScrollText size={24} className="mx-auto mb-2 opacity-30" />
              {selectedRow ? 'Sin movimientos para este producto/almacén' : 'Sin movimientos aún'}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {movements.map((m) => {
                const config = MOVEMENT_TYPE_CONFIG[m.type] ?? { label: m.type, color: 'text-gray-400', sign: '=' };
                return (
                  <div key={m.id} className="bg-black border border-gray-800 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] uppercase tracking-wide font-bold ${config.color}`}>
                        {config.label}
                      </span>
                      <span className={`font-mono text-xs font-bold ${config.color}`}>
                        {config.sign}{m.qty}
                      </span>
                      <span className="ml-auto text-gray-600 text-[10px]">{formatDateTime(m.created_at)}</span>
                    </div>
                    {!selectedRow && (
                      <p className="text-gray-400 text-[11px] flex items-center gap-2">
                        <span className="font-mono text-amber-400/60">{m.product_sku}</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-500 font-mono">{m.warehouse_code}</span>
                      </p>
                    )}
                    {m.notes && <p className="text-gray-500 text-[11px] mt-1 italic">{m.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== AJUSTE =====
  if (mode === 'adjust') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        {renderHeader()}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <Package size={11} /> Producto
            </label>
            <select
              value={adjProductId}
              onChange={(e) => setAdjProductId(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="">— Selecciona —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <Building2 size={11} /> Almacén
            </label>
            <select
              value={adjWarehouseId}
              onChange={(e) => setAdjWarehouseId(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="">— Selecciona —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Sentido</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAdjDirection('plus')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  adjDirection === 'plus'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                    : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                <Plus size={13} />
                Sumar (entrada extra)
              </button>
              <button
                onClick={() => setAdjDirection('minus')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  adjDirection === 'minus'
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-300'
                    : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                <Minus size={13} />
                Restar (merma)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Cantidad</label>
            <input
              type="number"
              value={adjQty}
              onChange={(e) => setAdjQty(parseFloat(e.target.value) || 0)}
              min="0"
              step="1"
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Razón <span className="text-red-400">*</span></label>
            <textarea
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              rows={2}
              placeholder="Ej: caja dañada en bodega, conteo físico inicial, error de captura..."
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          {renderFeedback()}

          <button
            onClick={handleAdjustment}
            disabled={status === 'loading' || !adjProductId || !adjWarehouseId || adjQty <= 0 || !adjReason.trim()}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : (adjDirection === 'plus' ? <Plus size={14} /> : <Minus size={14} />)}
            Aplicar ajuste
          </button>
        </div>
      </div>
    );
  }

  // ===== TRANSFERENCIA =====
  if (mode === 'transfer') {
    return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      {renderHeader()}
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <Package size={11} /> Producto
          </label>
          <select
            value={trfProductId}
            onChange={(e) => setTrfProductId(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">— Selecciona —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <Building2 size={11} /> Origen
            </label>
            <select
              value={trfSourceId}
              onChange={(e) => setTrfSourceId(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="">—</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code}</option>
              ))}
            </select>
          </div>
          <ArrowRight size={16} className="text-amber-400 mb-2" />
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <Building2 size={11} /> Destino
            </label>
            <select
              value={trfTargetId}
              onChange={(e) => setTrfTargetId(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="">—</option>
              {warehouses.filter((w) => w.id !== trfSourceId).map((w) => (
                <option key={w.id} value={w.id}>{w.code}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Cantidad</label>
          <input
            type="number"
            value={trfQty}
            onChange={(e) => setTrfQty(parseFloat(e.target.value) || 0)}
            min="0"
            step="1"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Notas (opcional)</label>
          <input
            type="text"
            value={trfNotes}
            onChange={(e) => setTrfNotes(e.target.value)}
            placeholder="Motivo o referencia"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {warehouses.length < 2 && (
          <div className="flex items-start gap-2 p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg text-xs text-amber-300">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p>Hay un solo almacén activo. Crea otro almacén desde una migración o desde el catálogo (admin) para poder transferir.</p>
          </div>
        )}

        {renderFeedback()}

        <button
          onClick={handleTransfer}
          disabled={status === 'loading' || warehouses.length < 2 || !trfProductId || !trfSourceId || !trfTargetId || trfQty <= 0}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
          Aplicar transferencia
        </button>
      </div>
    </div>
    );
  }

  // ===== CONVERSIÓN =====
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      {renderHeader()}
      <div className="p-5 space-y-4">
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 text-[11px] text-amber-300/80 flex items-start gap-2">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>
            Convierte stock de un SKU en otro (ej. <strong>1 CORRUGADO-16 → 16 CAJA-PANINI</strong>).
            Sale del producto origen, entra al destino, en el mismo almacén.
          </span>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <Building2 size={11} /> Almacén
          </label>
          <select
            value={convWarehouseId}
            onChange={(e) => setConvWarehouseId(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">— Selecciona —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <Package size={11} /> Producto origen
            </label>
            <select
              value={convFromProductId}
              onChange={(e) => setConvFromProductId(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku}</option>
              ))}
            </select>
          </div>
          <ArrowRight size={16} className="text-amber-400 mb-2" />
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <Package size={11} /> Producto destino
            </label>
            <select
              value={convToProductId}
              onChange={(e) => setConvToProductId(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="">—</option>
              {products.filter((p) => p.id !== convFromProductId).map((p) => (
                <option key={p.id} value={p.id}>{p.sku}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Cantidad origen (sale)</label>
            <input
              type="number"
              value={convFromQty}
              onChange={(e) => setConvFromQty(parseFloat(e.target.value) || 0)}
              min="0"
              step="1"
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-purple-300 text-sm font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <ArrowRight size={14} className="text-amber-400 mb-2.5" />
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Cantidad destino (entra)</label>
            <input
              type="number"
              value={convToQty}
              onChange={(e) => setConvToQty(parseFloat(e.target.value) || 0)}
              min="0"
              step="1"
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-cyan-300 text-sm font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {convFromProductId && convToProductId && convFromQty > 0 && convToQty > 0 && (
          <div className="text-center p-2 bg-black/40 border border-gray-800 rounded text-[11px] text-gray-400">
            Ratio: <strong className="text-amber-400">1 × {products.find(p => p.id === convFromProductId)?.sku}</strong>
            {' = '}
            <strong className="text-amber-400">{(convToQty / convFromQty).toFixed(2)} × {products.find(p => p.id === convToProductId)?.sku}</strong>
          </div>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Motivo <span className="text-red-400">*</span></label>
          <textarea
            value={convNotes}
            onChange={(e) => setConvNotes(e.target.value)}
            rows={2}
            placeholder="Ej: apertura de corrugado para cliente que pidió cajas sueltas, kit reempaquetado..."
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </div>

        {warehouses.length === 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg text-xs text-amber-300">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p>No hay almacenes activos.</p>
          </div>
        )}

        {renderFeedback()}

        <button
          onClick={handleConversion}
          disabled={
            status === 'loading' ||
            !convFromProductId ||
            !convToProductId ||
            !convWarehouseId ||
            convFromQty <= 0 ||
            convToQty <= 0 ||
            !convNotes.trim()
          }
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Combine size={14} />}
          Aplicar conversión
        </button>
      </div>
    </div>
  );
}
