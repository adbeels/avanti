import { useEffect, useState } from 'react';
import {
  Inbox, Plus, X, AlertCircle, CheckCircle2, Loader2, Package, Save,
  CheckSquare, RotateCcw, Ban, Building2, FileText, Calendar,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RECEPTION_STATUS_CONFIG, type Reception } from './ReceptionsTable';

interface Warehouse { id: string; code: string; name: string }

interface POPending {
  id: string;
  folio: string;
  supplier: string;
  status: string;
  line_count: number;
}

interface ReceptionItemRow {
  id: string;
  reception_id: string;
  po_item_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  qty_received: number;
  discrepancy_reason: string;
  qty_ordered: number;
  qty_received_prev: number;
}

type Mode = 'empty' | 'pick_po' | 'edit';

interface ReceptionEditorProps {
  selectedReception: Reception | null;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSelectReception: (r: Reception | null) => void;
  onChanged: () => void;
  canWrite: boolean;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ReceptionEditor({ selectedReception, mode, onModeChange, onSelectReception, onChanged, canWrite }: ReceptionEditorProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [posPending, setPosPending] = useState<POPending[]>([]);
  const [items, setItems] = useState<ReceptionItemRow[]>([]);
  const [poFolio, setPOFolio] = useState<string>('');
  const [poSupplier, setPOSupplier] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [warehouseCode, setWarehouseCode] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (mode === 'pick_po') {
      fetchPosPending();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && selectedReception) {
      setNotes(selectedReception.notes);
      fetchReceptionData(selectedReception);
    }
    setStatus('idle');
    setMessage('');
  }, [mode, selectedReception?.id]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, code, name').eq('active', true).order('name');
    setWarehouses((data as Warehouse[]) || []);
  };

  const fetchPosPending = async () => {
    setStatus('loading');
    const { data: poData } = await supabase
      .from('purchase_orders')
      .select('id, folio, supplier, status')
      .in('status', ['sent', 'partially_received'])
      .order('created_at', { ascending: false });

    const ids = (poData || []).map((p) => p.id);
    let counts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: itemsData } = await supabase
        .from('po_items')
        .select('purchase_order_id')
        .in('purchase_order_id', ids);
      counts = new Map<string, number>();
      (itemsData || []).forEach((i) => {
        counts.set(i.purchase_order_id, (counts.get(i.purchase_order_id) || 0) + 1);
      });
    }

    const enriched: POPending[] = (poData || []).map((p) => ({
      id: p.id,
      folio: p.folio,
      supplier: p.supplier,
      status: p.status,
      line_count: counts.get(p.id) || 0,
    }));

    setPosPending(enriched);
    setStatus('idle');
  };

  const fetchReceptionData = async (r: Reception) => {
    // Load PO header
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('folio, supplier')
      .eq('id', r.purchase_order_id)
      .single();
    if (po) {
      setPOFolio(po.folio);
      setPOSupplier(po.supplier);
    }

    // Load warehouse
    const { data: wh } = await supabase
      .from('warehouses')
      .select('id, code, name')
      .eq('id', r.warehouse_id)
      .single();
    if (wh) {
      setWarehouseId(wh.id);
      setWarehouseCode(wh.code);
    }

    // Load reception items con joins manuales para qty_received_prev
    const { data: ri } = await supabase
      .from('reception_items')
      .select('*, po_item:po_items(qty_ordered), product:products(sku, name)')
      .eq('reception_id', r.id);

    // Para cada po_item involucrado, calcular qty_received_prev (excluyendo este reception)
    const poItemIds = (ri || []).map((x) => x.po_item_id);
    const prevMap = new Map<string, number>();
    if (poItemIds.length > 0) {
      const { data: prev } = await supabase
        .from('reception_items')
        .select('po_item_id, qty_received, reception_id, reception:receptions(status)')
        .in('po_item_id', poItemIds)
        .neq('reception_id', r.id);
      (prev || []).forEach((p) => {
        const recStatus = (p.reception as { status?: string } | null)?.status;
        if (recStatus === 'completed') {
          prevMap.set(p.po_item_id, (prevMap.get(p.po_item_id) || 0) + Number(p.qty_received));
        }
      });
    }

    const rows: ReceptionItemRow[] = (ri || []).map((x) => {
      const item = x as {
        id: string;
        reception_id: string;
        po_item_id: string;
        product_id: string;
        qty_received: number;
        discrepancy_reason: string;
        po_item?: { qty_ordered: number } | null;
        product?: { sku: string; name: string } | null;
      };
      return {
        id: item.id,
        reception_id: item.reception_id,
        po_item_id: item.po_item_id,
        product_id: item.product_id,
        product_sku: item.product?.sku ?? '—',
        product_name: item.product?.name ?? '—',
        qty_received: Number(item.qty_received),
        discrepancy_reason: item.discrepancy_reason ?? '',
        qty_ordered: Number(item.po_item?.qty_ordered ?? 0),
        qty_received_prev: prevMap.get(item.po_item_id) || 0,
      };
    });

    setItems(rows);
  };

  const showError = (msg: string) => { setStatus('error'); setMessage(msg); };
  const showSuccess = (msg: string) => {
    setStatus('success');
    setMessage(msg);
    setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
  };

  // Crear nueva recepción para una PO
  const handlePickPO = async (po: POPending) => {
    if (warehouses.length === 0) return showError('No hay almacenes activos.');

    setStatus('loading');
    setMessage('');

    // Default warehouse: COYOACAN si existe, sino el primero
    const defaultWh = warehouses.find((w) => w.code === 'COYOACAN') || warehouses[0];

    // 1. Crear reception en in_progress
    const { data: rec, error: rErr } = await supabase
      .from('receptions')
      .insert({
        purchase_order_id: po.id,
        warehouse_id: defaultWh.id,
        status: 'in_progress',
      })
      .select()
      .single();

    if (rErr || !rec) return showError(rErr?.message ?? 'No se pudo crear la recepción.');

    // 2. Calcular qty_pending por po_item: ordered - sum(received en completed)
    const { data: poItems } = await supabase
      .from('po_items')
      .select('id, product_id, qty_ordered')
      .eq('purchase_order_id', po.id);

    const itemIds = (poItems || []).map((p) => p.id);
    const prevMap = new Map<string, number>();
    if (itemIds.length > 0) {
      const { data: completedItems } = await supabase
        .from('reception_items')
        .select('po_item_id, qty_received, reception:receptions(status)')
        .in('po_item_id', itemIds);
      (completedItems || []).forEach((ci) => {
        const recStatus = (ci.reception as { status?: string } | null)?.status;
        if (recStatus === 'completed') {
          prevMap.set(ci.po_item_id, (prevMap.get(ci.po_item_id) || 0) + Number(ci.qty_received));
        }
      });
    }

    // 3. Crear reception_items con qty_received = qty_pending por defecto (solo si > 0)
    const itemsPayload = (poItems || [])
      .map((pi) => {
        const prev = prevMap.get(pi.id) || 0;
        const pending = Number(pi.qty_ordered) - prev;
        return {
          reception_id: rec.id,
          po_item_id: pi.id,
          product_id: pi.product_id,
          qty_received: pending > 0 ? pending : 0,
        };
      })
      .filter((x) => x.qty_received > 0);

    if (itemsPayload.length === 0) {
      // PO sin pendientes — borrar la recepción y avisar
      await supabase.from('receptions').delete().eq('id', rec.id);
      return showError('Esta PO ya no tiene líneas pendientes de recepción.');
    }

    const { error: iErr } = await supabase.from('reception_items').insert(itemsPayload);
    if (iErr) {
      await supabase.from('receptions').delete().eq('id', rec.id);
      return showError(iErr.message);
    }

    showSuccess(`Recepción ${rec.folio} creada con ${itemsPayload.length} líneas`);
    onChanged();
    onSelectReception(rec as Reception);
    onModeChange('edit');
  };

  const handleUpdateItem = async (itemId: string, patch: Partial<ReceptionItemRow>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.qty_received !== undefined) dbPatch.qty_received = patch.qty_received;
    if (patch.discrepancy_reason !== undefined) dbPatch.discrepancy_reason = patch.discrepancy_reason;
    const { error } = await supabase.from('reception_items').update(dbPatch).eq('id', itemId);
    if (error) return showError(error.message);
    if (selectedReception) await fetchReceptionData(selectedReception);
  };

  const handleSaveHeader = async () => {
    if (!selectedReception) return;
    setStatus('loading');
    const { error } = await supabase
      .from('receptions')
      .update({ warehouse_id: warehouseId, notes: notes.trim() })
      .eq('id', selectedReception.id);
    if (error) return showError(error.message);
    showSuccess('Cabecera actualizada.');
    onChanged();
  };

  const handleClose = async () => {
    if (!selectedReception) return;
    if (items.length === 0) return showError('No hay líneas que cerrar.');
    if (!confirm(`Cerrar recepción ${selectedReception.folio}? Esto generará entradas de inventario y subirá el stock automáticamente.`)) return;

    setStatus('loading');
    const { error } = await supabase
      .from('receptions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', selectedReception.id);

    if (error) return showError(error.message);
    showSuccess(`Recepción cerrada. Stock actualizado.`);
    onChanged();
    onSelectReception({ ...selectedReception, status: 'completed', completed_at: new Date().toISOString() });
  };

  const handleReopen = async () => {
    if (!selectedReception) return;
    if (!confirm(`Reabrir ${selectedReception.folio}? El stock NO se revierte automáticamente — requerirás un ajuste manual si querés deshacer las entradas previas.`)) return;
    setStatus('loading');
    const { error } = await supabase
      .from('receptions')
      .update({ status: 'in_progress', completed_at: null })
      .eq('id', selectedReception.id);
    if (error) return showError(error.message);
    showSuccess('Recepción reabierta.');
    onChanged();
    onSelectReception({ ...selectedReception, status: 'in_progress', completed_at: null });
  };

  const handleCancel = async () => {
    if (!selectedReception) return;
    if (!confirm(`Cancelar ${selectedReception.folio}? Esta acción NO genera ajustes de inventario.`)) return;
    setStatus('loading');
    const { error } = await supabase
      .from('receptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', selectedReception.id);
    if (error) return showError(error.message);
    showSuccess('Recepción cancelada.');
    onChanged();
    onSelectReception({ ...selectedReception, status: 'cancelled', cancelled_at: new Date().toISOString() });
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!canWrite) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-white text-sm font-semibold mb-1">Solo almacén o admin</p>
          <p className="text-gray-500 text-xs">Las recepciones las gestiona el rol <strong className="text-amber-400">warehouse</strong> o <strong className="text-amber-400">admin</strong>.</p>
        </div>
      </div>
    );
  }

  // EMPTY STATE
  if (mode === 'empty') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <Inbox size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Editor de recepción</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Package size={40} className="mb-3 opacity-20" />
            <p className="text-sm text-center mb-3">Selecciona una recepción de la lista o crea una nueva contra una PO en curso</p>
            <button
              onClick={() => onModeChange('pick_po')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all"
            >
              <Plus size={14} />
              Nueva recepción
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  // ============================================================
  // PICK PO MODE
  // ============================================================
  if (mode === 'pick_po') {
    return (
      <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
          <div className="flex items-center gap-3">
            <Inbox size={18} className="text-amber-400" />
            <span className="text-white font-semibold">Selecciona la PO a recibir</span>
          </div>
          <button
            onClick={() => onModeChange('empty')}
            className="text-gray-500 hover:text-gray-300"
            title="Cancelar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {status === 'loading' && (
            <div className="text-center py-8 text-gray-600 text-xs">
              <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
              Cargando POs pendientes...
            </div>
          )}

          {status !== 'loading' && posPending.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              <p>No hay POs pendientes de recepción.</p>
              <p className="text-[11px] mt-1">Solo se muestran las que están en estado <strong>Enviada</strong> o <strong>Recibido parcial</strong>.</p>
            </div>
          )}

          {posPending.map((po) => (
            <button
              key={po.id}
              onClick={() => handlePickPO(po)}
              disabled={status === 'loading'}
              className="w-full text-left bg-black border border-gray-800 hover:border-amber-500/40 rounded-lg p-3 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded flex-shrink-0">
                {po.folio}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{po.supplier}</p>
                <p className="text-gray-500 text-xs">{po.line_count} {po.line_count === 1 ? 'línea' : 'líneas'} · estado: {po.status === 'sent' ? 'Enviada' : 'Parcial'}</p>
              </div>
              <Plus size={14} className="text-amber-400 flex-shrink-0" />
            </button>
          ))}

          {renderFeedback()}
        </div>
      </div>
    );
  }

  // ============================================================
  // EDIT MODE
  // ============================================================
  if (!selectedReception) return null;

  const config = RECEPTION_STATUS_CONFIG[selectedReception.status];
  const isInProgress = selectedReception.status === 'in_progress';
  const isCompleted = selectedReception.status === 'completed';
  const isTerminal = selectedReception.status === 'cancelled';
  const totalQty = items.reduce((s, i) => s + i.qty_received, 0);

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
        <div className="flex items-center gap-3 min-w-0">
          <Inbox size={18} className="text-amber-400 flex-shrink-0" />
          <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded">
            {selectedReception.folio}
          </span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${config.color} ${config.bg} ${config.border}`}>
          {config.label}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Header info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-mono text-blue-400/70 text-[11px] bg-blue-500/5 border border-blue-500/15 px-1.5 py-0.5 rounded">{poFolio}</span>
            <span className="truncate">{poSupplier}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar size={11} />
            {formatShortDate(selectedReception.received_at)}
          </div>
        </div>

        {/* Almacén destino */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <Building2 size={11} /> Almacén destino
          </label>
          {isInProgress ? (
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
              ))}
            </select>
          ) : (
            <p className="px-3 py-2 text-white text-sm bg-black/40 border border-gray-800 rounded-lg">{warehouseCode}</p>
          )}
        </div>

        {/* Líneas */}
        <div className="space-y-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
            Líneas ({items.length})
          </span>

          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
              Sin líneas en esta recepción.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const expected = item.qty_ordered - item.qty_received_prev;
                const diff = item.qty_received - expected;
                const hasDiscrepancy = diff !== 0;
                return (
                  <div key={item.id} className={`bg-black border rounded-lg p-2 space-y-2 ${hasDiscrepancy ? 'border-orange-800/40' : 'border-gray-800'}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs">
                          <span className="font-mono text-amber-400/70">{item.product_sku}</span>
                          <span className="text-gray-500"> — {item.product_name}</span>
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase tracking-wide">Ordenado</label>
                        <p className="px-2 py-1 text-gray-400 text-xs font-mono">{item.qty_ordered}</p>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase tracking-wide">Recibido prev.</label>
                        <p className="px-2 py-1 text-gray-500 text-xs font-mono">{item.qty_received_prev}</p>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase tracking-wide">Pendiente</label>
                        <p className="px-2 py-1 text-blue-400 text-xs font-mono font-semibold">{expected}</p>
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-400 uppercase tracking-wide font-bold">Recibido ahora</label>
                        <input
                          type="number"
                          value={item.qty_received}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, qty_received: val } : x)));
                          }}
                          onBlur={(e) => handleUpdateItem(item.id, { qty_received: parseFloat(e.target.value) || 0 })}
                          disabled={!isInProgress}
                          min="0"
                          step="1"
                          className="w-full px-2 py-1 bg-amber-500/5 border border-amber-500/20 rounded text-amber-400 text-xs font-mono font-bold focus:outline-none focus:border-amber-500/60 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    {hasDiscrepancy && (
                      <div className="space-y-1.5 pt-2 border-t border-gray-800">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <AlertCircle size={11} className="text-orange-400" />
                          <span className="text-orange-400 font-semibold">
                            {diff > 0 ? `+${diff} extra` : `${diff} faltante`}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={item.discrepancy_reason}
                          onChange={(e) => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, discrepancy_reason: e.target.value } : x)))}
                          onBlur={(e) => handleUpdateItem(item.id, { discrepancy_reason: e.target.value })}
                          disabled={!isInProgress}
                          placeholder="Razón de la discrepancia (ej. cajas dañadas)"
                          className="w-full px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white text-[11px] placeholder-gray-600 focus:outline-none focus:border-orange-500/40 disabled:opacity-60"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-black/40 border border-gray-800 rounded-lg">
            <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Total a recibir</span>
            <span className="text-amber-400 font-bold text-lg">{totalQty} u.</span>
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <FileText size={11} /> Notas de la recepción
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isInProgress}
            rows={2}
            placeholder="Observaciones (estado de las cajas, hora de llegada, etc.)"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none disabled:opacity-50"
          />
          {isInProgress && (
            <button
              onClick={handleSaveHeader}
              disabled={status === 'loading' || (notes === selectedReception.notes && warehouseId === selectedReception.warehouse_id)}
              className="mt-2 w-full bg-black border border-gray-800 hover:border-amber-500/40 text-gray-400 hover:text-amber-400 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Save size={11} /> Guardar cabecera
            </button>
          )}
        </div>

        {renderFeedback()}

        {/* Acciones de transición */}
        <div className="flex flex-col gap-2">
          {isInProgress && (
            <>
              <button
                onClick={handleClose}
                disabled={status === 'loading' || items.length === 0}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckSquare size={14} />
                Cerrar recepción y subir stock
              </button>
              <button
                onClick={handleCancel}
                disabled={status === 'loading'}
                className="w-full bg-black border border-red-900/40 text-red-400 hover:bg-red-950/30 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Ban size={12} />
                Cancelar recepción
              </button>
            </>
          )}

          {isCompleted && (
            <>
              <div className="flex items-start gap-2 p-3 bg-green-950/20 border border-green-800/30 rounded-lg text-xs text-green-300">
                <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                <p>Recepción cerrada. El stock fue actualizado automáticamente y la PO recalculó su estado.</p>
              </div>
              <button
                onClick={handleReopen}
                disabled={status === 'loading'}
                className="w-full bg-black border border-amber-900/40 text-amber-400 hover:bg-amber-950/30 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={12} />
                Reabrir recepción
              </button>
            </>
          )}

          {isTerminal && (
            <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-800/30 rounded-lg text-xs text-red-300">
              <Ban size={14} className="flex-shrink-0 mt-0.5" />
              <p>Recepción cancelada. No tuvo impacto en el inventario.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
