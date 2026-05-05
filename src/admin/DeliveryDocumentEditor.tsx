import { useEffect, useState } from 'react';
import {
  FileSignature, Plus, X, AlertCircle, CheckCircle2, Loader2, Package, FileText,
  Calendar, Building2, User, Truck, Store, MapPin, Ban, Send, Archive,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DELIVERY_DOC_STATUS_CONFIG, SIGNED_METHOD_LABEL, type DeliveryDoc } from './DeliveryDocumentsTable';
import SignatureCanvas from './SignatureCanvas';

interface OrderReadyForDelivery {
  id: string;
  folio_display: string;
  customer: string;
  warehouse_id: string;
  status: string;
  pending_qty: number; // qty_picked - qty_delivered total
}

interface DDItemRow {
  id: string;
  delivery_document_id: string;
  order_item_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  qty_delivered: number;
  qty_remaining_in_order: number; // qty_picked - qty_delivered (excluyendo este doc)
  notes: string;
}

type Mode = 'empty' | 'pick_order' | 'edit';
type SignedMethod = 'pickup' | 'courier' | 'wholesale';

interface DeliveryDocumentEditorProps {
  selected: DeliveryDoc | null;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onSelect: (d: DeliveryDoc | null) => void;
  onChanged: () => void;
  canWrite: boolean;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DeliveryDocumentEditor({ selected, mode, onModeChange, onSelect, onChanged, canWrite }: DeliveryDocumentEditorProps) {
  const [ordersReady, setOrdersReady] = useState<OrderReadyForDelivery[]>([]);
  const [items, setItems] = useState<DDItemRow[]>([]);
  const [orderFolio, setOrderFolio] = useState('');
  const [orderCustomer, setOrderCustomer] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');

  // Form de firma
  const [receiverName, setReceiverName] = useState('');
  const [signedMethod, setSignedMethod] = useState<SignedMethod>('pickup');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (mode === 'pick_order') fetchOrdersReady();
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && selected) {
      setReceiverName(selected.receiver_name || '');
      setSignedMethod((selected.signed_method as SignedMethod) || 'pickup');
      setSignatureDataUrl(selected.signature_data_url || null);
      setDeliveryAddress(selected.delivery_address || '');
      setNotes(selected.notes || '');
      fetchDocData(selected);
    }
    setStatus('idle');
    setMessage('');
  }, [mode, selected?.id]);

  const fetchOrdersReady = async () => {
    setStatus('loading');
    // Pedidos en fulfilling/ready/confirmed con qty_picked > qty_delivered
    const { data } = await supabase
      .from('preorders')
      .select('id, folio, legacy_order_number, order_number, name, warehouse_id, status, order_items(qty_picked, qty_delivered)')
      .in('status', ['fulfilling', 'ready', 'confirmed'])
      .order('created_at', { ascending: false });

    const rows: OrderReadyForDelivery[] = ((data || []) as Array<{
      id: string;
      folio: string | null;
      legacy_order_number: string | null;
      order_number: string;
      name: string;
      warehouse_id: string;
      status: string;
      order_items: { qty_picked: number; qty_delivered: number }[];
    }>)
      .map((o) => {
        const pending = (o.order_items ?? []).reduce(
          (s, it) => s + (Number(it.qty_picked) - Number(it.qty_delivered)), 0);
        return {
          id: o.id,
          folio_display: o.folio || o.legacy_order_number || o.order_number,
          customer: o.name,
          warehouse_id: o.warehouse_id,
          status: o.status,
          pending_qty: pending,
        };
      })
      .filter((o) => o.pending_qty > 0);

    setOrdersReady(rows);
    setStatus('idle');
  };

  const fetchDocData = async (d: DeliveryDoc) => {
    const { data: po } = await supabase
      .from('preorders')
      .select('folio, legacy_order_number, order_number, name')
      .eq('id', d.order_id)
      .single();
    if (po) {
      setOrderFolio(po.folio || po.legacy_order_number || po.order_number);
      setOrderCustomer(po.name);
    }

    const { data: wh } = await supabase
      .from('warehouses').select('code').eq('id', d.warehouse_id).single();
    if (wh) setWarehouseCode(wh.code);

    const { data: ddi } = await supabase
      .from('delivery_document_items')
      .select('*, product:products(sku, name), order_item:order_items(qty_picked, qty_delivered)')
      .eq('delivery_document_id', d.id);

    const rows: DDItemRow[] = ((ddi || []) as Array<{
      id: string;
      delivery_document_id: string;
      order_item_id: string;
      product_id: string;
      qty_delivered: number;
      notes: string;
      product?: { sku: string; name: string } | null;
      order_item?: { qty_picked: number; qty_delivered: number } | null;
    }>).map((r) => {
      const qtyPicked = Number(r.order_item?.qty_picked ?? 0);
      const qtyDeliveredTotal = Number(r.order_item?.qty_delivered ?? 0);
      // qty_remaining: si el doc está en draft, lo que queda por entregar incluye este doc;
      // si ya está signed, qty_delivered del order ya incluyó este doc.
      const remaining = d.status === 'draft'
        ? qtyPicked - qtyDeliveredTotal
        : qtyPicked - (qtyDeliveredTotal - Number(r.qty_delivered));
      return {
        id: r.id,
        delivery_document_id: r.delivery_document_id,
        order_item_id: r.order_item_id,
        product_id: r.product_id,
        product_sku: r.product?.sku ?? '—',
        product_name: r.product?.name ?? '—',
        qty_delivered: Number(r.qty_delivered),
        qty_remaining_in_order: remaining,
        notes: r.notes ?? '',
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

  // Crear delivery_document desde un pedido
  const handlePickOrder = async (order: OrderReadyForDelivery) => {
    setStatus('loading');
    setMessage('');

    const { data: dd, error: ddErr } = await supabase
      .from('delivery_documents')
      .insert({
        order_id: order.id,
        warehouse_id: order.warehouse_id,
        status: 'draft',
      })
      .select()
      .single();

    if (ddErr || !dd) return showError(ddErr?.message ?? 'No se pudo crear el documento.');

    // Cargar order_items con saldo pendiente
    const { data: oi } = await supabase
      .from('order_items')
      .select('id, product_id, qty_picked, qty_delivered')
      .eq('order_id', order.id);

    const itemsPayload = ((oi || []) as Array<{ id: string; product_id: string; qty_picked: number; qty_delivered: number }>)
      .map((it) => {
        const remaining = Number(it.qty_picked) - Number(it.qty_delivered);
        return {
          delivery_document_id: dd.id,
          order_item_id: it.id,
          product_id: it.product_id,
          qty_delivered: remaining,
        };
      })
      .filter((x) => x.qty_delivered > 0);

    if (itemsPayload.length === 0) {
      await supabase.from('delivery_documents').delete().eq('id', dd.id);
      return showError('Este pedido ya no tiene saldo pendiente de entregar (qty_picked == qty_delivered).');
    }

    const { error: iErr } = await supabase.from('delivery_document_items').insert(itemsPayload);
    if (iErr) {
      await supabase.from('delivery_documents').delete().eq('id', dd.id);
      return showError(iErr.message);
    }

    showSuccess(`Documento ${dd.folio} creado con ${itemsPayload.length} líneas`);
    onChanged();
    onSelect(dd as DeliveryDoc);
    onModeChange('edit');
  };

  const handleUpdateItemQty = async (itemId: string, qty: number) => {
    if (qty <= 0) return showError('La cantidad debe ser > 0.');
    const { error } = await supabase
      .from('delivery_document_items')
      .update({ qty_delivered: qty })
      .eq('id', itemId);
    if (error) return showError(error.message);
    if (selected) await fetchDocData(selected);
  };

  const handleSign = async () => {
    if (!selected) return;
    if (!receiverName.trim()) return showError('Nombre del receptor obligatorio.');
    if (!signatureDataUrl) return showError('Captura la firma antes de continuar.');
    if (items.length === 0) return showError('Sin líneas que entregar.');
    for (const it of items) {
      if (it.qty_delivered <= 0) return showError(`Línea ${it.product_sku} tiene cantidad 0.`);
    }

    setStatus('loading');
    const { error } = await supabase.rpc('sign_delivery_document', {
      p_doc_id: selected.id,
      p_receiver_name: receiverName.trim(),
      p_signature_data_url: signatureDataUrl,
      p_signed_method: signedMethod,
      p_delivery_address: deliveryAddress.trim(),
      p_notes: notes.trim(),
    });
    if (error) return showError(error.message);
    showSuccess('Entrega firmada. Pedido actualizado.');
    onChanged();
    onSelect({
      ...selected,
      status: 'signed',
      receiver_name: receiverName.trim(),
      signature_data_url: signatureDataUrl,
      signed_method: signedMethod,
      signed_at: new Date().toISOString(),
    });
  };

  const handleCancel = async () => {
    if (!selected) return;
    if (!confirm(`Cancelar documento ${selected.folio}?`)) return;
    setStatus('loading');
    const { error } = await supabase
      .from('delivery_documents')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) return showError(error.message);
    showSuccess('Documento cancelado.');
    onChanged();
    onSelect({ ...selected, status: 'cancelled', cancelled_at: new Date().toISOString() });
  };

  const handleSendConfirmation = async () => {
    if (!selected) return;
    if (selected.status !== 'signed') return showError('Solo se pueden enviar comprobantes ya firmados.');
    if (!confirm(`Enviar comprobante de ${selected.folio} al cliente por correo? Esto archivará el documento.`)) return;

    setStatus('loading');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-delivery-confirmation`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ delivery_document_id: selected.id }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || `Error HTTP ${response.status}`);

      showSuccess(`Comprobante enviado a ${result?.sent_to ?? 'cliente'}`);
      onChanged();
      onSelect({ ...selected, status: 'archived', archived_at: new Date().toISOString() });
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Error al enviar el comprobante.');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!canWrite) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-white text-sm font-semibold mb-1">Sin permisos</p>
          <p className="text-gray-500 text-xs">Las entregas las gestionan los roles <strong className="text-amber-400">admin</strong> y <strong className="text-amber-400">fulfillment</strong>.</p>
        </div>
      </div>
    );
  }

  if (mode === 'empty') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <FileSignature size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Editor de entrega</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Package size={40} className="mb-3 opacity-20" />
            <p className="text-sm text-center mb-3">Selecciona una entrega de la lista o genera una nueva contra un pedido pickeado</p>
            <button
              onClick={() => onModeChange('pick_order')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all"
            >
              <Plus size={14} />
              Nueva entrega
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

  if (mode === 'pick_order') {
    return (
      <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
          <div className="flex items-center gap-3">
            <FileSignature size={18} className="text-amber-400" />
            <span className="text-white font-semibold">Selecciona el pedido a entregar</span>
          </div>
          <button onClick={() => onModeChange('empty')} className="text-gray-500 hover:text-gray-300" title="Cancelar">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {status === 'loading' && (
            <div className="text-center py-8 text-gray-600 text-xs">
              <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
              Cargando pedidos listos...
            </div>
          )}

          {status !== 'loading' && ordersReady.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              <p>No hay pedidos pickeados pendientes de entregar.</p>
              <p className="text-[11px] mt-1">Primero genera el picking desde el módulo correspondiente.</p>
            </div>
          )}

          {ordersReady.map((o) => (
            <button
              key={o.id}
              onClick={() => handlePickOrder(o)}
              disabled={status === 'loading'}
              className="w-full text-left bg-black border border-gray-800 hover:border-amber-500/40 rounded-lg p-3 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded flex-shrink-0">
                {o.folio_display}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{o.customer}</p>
                <p className="text-gray-500 text-xs">{o.pending_qty} u. listas para entregar · {o.status}</p>
              </div>
              <Plus size={14} className="text-amber-400 flex-shrink-0" />
            </button>
          ))}

          {renderFeedback()}
        </div>
      </div>
    );
  }

  // EDIT MODE
  if (!selected) return null;

  const config = DELIVERY_DOC_STATUS_CONFIG[selected.status];
  const isDraft = selected.status === 'draft';
  const isSigned = selected.status === 'signed' || selected.status === 'archived';
  const totalQty = items.reduce((s, i) => s + i.qty_delivered, 0);

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
        <div className="flex items-center gap-3 min-w-0">
          <FileSignature size={18} className="text-amber-400 flex-shrink-0" />
          <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded">
            {selected.folio}
          </span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${config.color} ${config.bg} ${config.border}`}>
          {config.label}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-mono text-blue-400/70 text-[11px] bg-blue-500/5 border border-blue-500/15 px-1.5 py-0.5 rounded">{orderFolio}</span>
            <span className="truncate">{orderCustomer}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={11} /> {formatShortDate(selected.created_at)}</span>
            <span className="flex items-center gap-1"><Building2 size={11} /> {warehouseCode}</span>
          </div>
        </div>

        {/* LÍNEAS */}
        <div className="space-y-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Líneas a entregar ({items.length})</span>

          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
              Sin líneas en este documento.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="bg-black border border-gray-800 rounded-lg p-2 space-y-2">
                  <p className="text-white text-xs">
                    <span className="font-mono text-amber-400/70">{item.product_sku}</span>
                    <span className="text-gray-500"> — {item.product_name}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-600 uppercase tracking-wide">Disponible</label>
                      <p className="px-2 py-1 text-blue-400 text-xs font-mono font-semibold">{item.qty_remaining_in_order}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-400 uppercase tracking-wide font-bold">A entregar</label>
                      <input
                        type="number"
                        value={item.qty_delivered}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, qty_delivered: val } : x)));
                        }}
                        onBlur={(e) => handleUpdateItemQty(item.id, parseFloat(e.target.value) || 0)}
                        disabled={!isDraft}
                        min="0"
                        step="1"
                        className="w-full px-2 py-1 bg-amber-500/5 border border-amber-500/20 rounded text-amber-400 text-xs font-mono font-bold focus:outline-none focus:border-amber-500/60 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-black/40 border border-gray-800 rounded-lg">
              <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Total a entregar</span>
              <span className="text-amber-400 font-bold text-lg">{totalQty} u.</span>
            </div>
          )}
        </div>

        {/* MÉTODO */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1.5 block">Método de entrega</label>
          <div className="grid grid-cols-3 gap-2">
            {(['pickup', 'courier', 'wholesale'] as SignedMethod[]).map((m) => {
              const Icon = m === 'pickup' ? Store : m === 'courier' ? Truck : Building2;
              const active = signedMethod === m;
              return (
                <button
                  key={m}
                  onClick={() => setSignedMethod(m)}
                  disabled={!isDraft}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    active
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
                  }`}
                >
                  <Icon size={12} />
                  {SIGNED_METHOD_LABEL[m]}
                </button>
              );
            })}
          </div>
        </div>

        {/* RECEPTOR */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide font-bold flex items-center gap-1 mb-1.5">
            <User size={11} /> Nombre del receptor *
          </label>
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            disabled={!isDraft}
            placeholder="Quien recibe la mercadería"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm placeholder-gray-700 focus:outline-none focus:border-amber-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* DIRECCION (opcional) */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide font-bold flex items-center gap-1 mb-1.5">
            <MapPin size={11} /> Dirección de entrega (opcional)
          </label>
          <input
            type="text"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            disabled={!isDraft}
            placeholder="Ej. Av. Universidad 200, CDMX"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-700 focus:outline-none focus:border-amber-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* FIRMA — la pieza touch */}
        {(isDraft || isSigned) && (
          <SignatureCanvas
            onChange={(d) => setSignatureDataUrl(d)}
            disabled={!isDraft}
          />
        )}
        {isSigned && signatureDataUrl && (
          <div className="bg-white border border-green-700/40 rounded-lg p-2">
            <p className="text-[10px] text-green-700 uppercase tracking-wide font-bold mb-1">Firma capturada</p>
            <img src={signatureDataUrl} alt="firma" className="max-h-40 mx-auto" />
          </div>
        )}

        {/* NOTAS */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide font-bold flex items-center gap-1 mb-1.5">
            <FileText size={11} /> Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isDraft}
            rows={2}
            placeholder="Observaciones de la entrega"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-700 focus:outline-none focus:border-amber-500/50 resize-none disabled:opacity-60"
          />
        </div>

        {renderFeedback()}

        {/* ACCIONES */}
        <div className="flex flex-col gap-2">
          {isDraft && (
            <>
              <button
                onClick={handleSign}
                disabled={status === 'loading' || !receiverName.trim() || !signatureDataUrl || items.length === 0}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <FileSignature size={14} />}
                Firmar y entregar
              </button>
              <button
                onClick={handleCancel}
                disabled={status === 'loading'}
                className="w-full bg-black border border-red-900/40 text-red-400 hover:bg-red-950/30 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Ban size={12} />
                Cancelar entrega
              </button>
            </>
          )}

          {isSigned && (
            <>
              <div className="flex items-start gap-2 p-3 bg-green-950/20 border border-green-800/30 rounded-lg text-xs text-green-300">
                <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>Entrega firmada por <strong>{selected.receiver_name}</strong> ({selected.signed_method && SIGNED_METHOD_LABEL[selected.signed_method]})</p>
                  {selected.signed_at && <p className="text-[10px] text-green-400/70">{formatShortDate(selected.signed_at)}</p>}
                </div>
              </div>

              {selected.status === 'signed' && (
                <button
                  onClick={handleSendConfirmation}
                  disabled={status === 'loading'}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Enviar comprobante al cliente
                </button>
              )}

              {selected.status === 'archived' && (
                <div className="flex items-start gap-2 p-3 bg-blue-950/20 border border-blue-800/30 rounded-lg text-xs text-blue-300">
                  <Archive size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p>Comprobante archivado y enviado al cliente.</p>
                    {selected.archived_at && <p className="text-[10px] text-blue-400/70 mt-0.5">{formatShortDate(selected.archived_at)}</p>}
                  </div>
                </div>
              )}
            </>
          )}

          {selected.status === 'cancelled' && (
            <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-800/30 rounded-lg text-xs text-red-300">
              <Ban size={14} className="flex-shrink-0 mt-0.5" />
              <p>Documento cancelado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
