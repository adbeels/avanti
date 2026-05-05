import { useEffect, useState } from 'react';
import {
  ClipboardList, Plus, X, AlertCircle, CheckCircle2, Loader2, Package,
  CheckSquare, Ban, Building2, FileText, Calendar, ChevronDown, ChevronUp,
  User, Mail, Phone, MapPin, CreditCard, Truck, Hash, Globe2, BadgeDollarSign,
  ListChecks,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PICKING_STATUS_CONFIG, type PickingList } from './PickingListsTable';

interface OrderPending {
  id: string;
  folio_display: string;
  customer: string;
  warehouse_id: string;
  status: string;
  total_qty_pending: number; // qty - qty_picked total
}

interface PickingItemRow {
  id: string;
  picking_list_id: string;
  order_item_id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  qty_requested: number;
  qty_picked: number;
  qty_already_picked_in_other_lists: number;
  order_item_qty: number;
  notes: string;
}

interface OrderDetail {
  id: string;
  folio_display: string;
  legacy_order_number: string | null;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  notes: string;
  total: number;
  partial_payment_amount: number | null;
  payment_method: string | null;
  payment_status: string | null;
  delivery_method: string | null;
  delivery_promise_date: string | null;
  sales_channel: string | null;
  source_reference: string | null;
  status: string;
  created_at: string;
  warehouse_code: string;
}

interface OrderLineSummary {
  order_item_id: string;
  product_sku: string;
  product_name: string;
  qty: number;
  qty_picked_total: number;
  qty_delivered: number;
  in_this_picking: number;
}

type Mode = 'empty' | 'pick_order' | 'edit';

interface PickingListEditorProps {
  selected: PickingList | null;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onSelect: (p: PickingList | null) => void;
  onChanged: () => void;
  canWrite: boolean;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PickingListEditor({ selected, mode, onModeChange, onSelect, onChanged, canWrite }: PickingListEditorProps) {
  const [ordersPending, setOrdersPending] = useState<OrderPending[]>([]);
  const [items, setItems] = useState<PickingItemRow[]>([]);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [allOrderLines, setAllOrderLines] = useState<OrderLineSummary[]>([]);
  const [orderExpanded, setOrderExpanded] = useState(true);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (mode === 'pick_order') fetchOrdersPending();
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && selected) {
      setNotes(selected.notes);
      setOrder(null);
      setAllOrderLines([]);
      fetchPickingData(selected);
    }
    setStatus('idle');
    setMessage('');
  }, [mode, selected?.id]);

  const fetchOrdersPending = async () => {
    setStatus('loading');
    // Pedidos confirmed o fulfilling con saldo pendiente de pick
    const { data } = await supabase
      .from('preorders')
      .select('id, folio, legacy_order_number, order_number, name, warehouse_id, status, order_items(qty, qty_picked)')
      .in('status', ['confirmed', 'fulfilling'])
      .order('created_at', { ascending: false });

    const rows: OrderPending[] = ((data || []) as Array<{
      id: string;
      folio: string | null;
      legacy_order_number: string | null;
      order_number: string;
      name: string;
      warehouse_id: string;
      status: string;
      order_items: { qty: number; qty_picked: number }[];
    }>)
      .map((o) => {
        const pending = (o.order_items ?? []).reduce(
          (s, it) => s + (Number(it.qty) - Number(it.qty_picked)), 0);
        return {
          id: o.id,
          folio_display: o.folio || o.legacy_order_number || o.order_number,
          customer: o.name,
          warehouse_id: o.warehouse_id,
          status: o.status,
          total_qty_pending: pending,
        };
      })
      .filter((o) => o.total_qty_pending > 0);

    setOrdersPending(rows);
    setStatus('idle');
  };

  const fetchPickingData = async (p: PickingList) => {
    // Cargar order header con todos los datos
    const { data: po } = await supabase
      .from('preorders')
      .select(`
        id, folio, legacy_order_number, order_number, name, company, email, phone,
        city, state, notes, total, partial_payment_amount, payment_method, payment_status,
        delivery_method, delivery_promise_date, sales_channel, source_reference, status, created_at
      `)
      .eq('id', p.order_id)
      .single();

    // Warehouse
    const { data: wh } = await supabase
      .from('warehouses').select('code').eq('id', p.warehouse_id).single();

    if (po) {
      setOrder({
        id: po.id,
        folio_display: po.folio || po.legacy_order_number || po.order_number || '—',
        legacy_order_number: po.legacy_order_number,
        name: po.name ?? '',
        company: po.company ?? '',
        email: po.email ?? '',
        phone: po.phone ?? '',
        city: po.city ?? '',
        state: po.state ?? '',
        notes: po.notes ?? '',
        total: Number(po.total ?? 0),
        partial_payment_amount: po.partial_payment_amount != null ? Number(po.partial_payment_amount) : null,
        payment_method: po.payment_method,
        payment_status: po.payment_status,
        delivery_method: po.delivery_method,
        delivery_promise_date: po.delivery_promise_date,
        sales_channel: po.sales_channel,
        source_reference: po.source_reference,
        status: po.status,
        created_at: po.created_at,
        warehouse_code: wh?.code ?? '—',
      });
    }

    // Items de TODO el pedido (para contexto de progreso por línea)
    const { data: allOi } = await supabase
      .from('order_items')
      .select('id, qty, qty_picked, qty_delivered, product:products(sku, name)')
      .eq('order_id', p.order_id);

    // Items de ESTA picking
    const { data: pi } = await supabase
      .from('picking_list_items')
      .select('*, product:products(sku, name), order_item:order_items(qty, qty_picked)')
      .eq('picking_list_id', p.id);

    // Mapa: order_item_id → qty_requested en esta picking
    const inThisPicking = new Map<string, number>();
    ((pi || []) as Array<{ order_item_id: string; qty_requested: number }>).forEach((r) => {
      inThisPicking.set(r.order_item_id, Number(r.qty_requested));
    });

    const lines: OrderLineSummary[] = ((allOi || []) as unknown as Array<{
      id: string;
      qty: number;
      qty_picked: number;
      qty_delivered: number;
      product?: { sku: string; name: string } | null;
    }>).map((r) => ({
      order_item_id: r.id,
      product_sku: r.product?.sku ?? '—',
      product_name: r.product?.name ?? '—',
      qty: Number(r.qty),
      qty_picked_total: Number(r.qty_picked),
      qty_delivered: Number(r.qty_delivered),
      in_this_picking: inThisPicking.get(r.id) ?? 0,
    }));
    setAllOrderLines(lines);

    const rows: PickingItemRow[] = ((pi || []) as Array<{
      id: string;
      picking_list_id: string;
      order_item_id: string;
      product_id: string;
      qty_requested: number;
      qty_picked: number;
      notes: string;
      product?: { sku: string; name: string } | null;
      order_item?: { qty: number; qty_picked: number } | null;
    }>).map((r) => {
      const orderQty = Number(r.order_item?.qty ?? 0);
      const orderQtyPickedTotal = Number(r.order_item?.qty_picked ?? 0);
      // qty_already_picked_in_other_lists = orderQtyPickedTotal - (qty_picked of THIS picking if completed)
      // For simplicity in display, just show the totals
      return {
        id: r.id,
        picking_list_id: r.picking_list_id,
        order_item_id: r.order_item_id,
        product_id: r.product_id,
        product_sku: r.product?.sku ?? '—',
        product_name: r.product?.name ?? '—',
        qty_requested: Number(r.qty_requested),
        qty_picked: Number(r.qty_picked),
        qty_already_picked_in_other_lists: orderQtyPickedTotal,
        order_item_qty: orderQty,
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

  // Crear picking_list para un pedido
  const handlePickOrder = async (order: OrderPending) => {
    setStatus('loading');
    setMessage('');

    // 1. Crear picking_list
    const { data: pl, error: plErr } = await supabase
      .from('picking_lists')
      .insert({
        order_id: order.id,
        warehouse_id: order.warehouse_id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (plErr || !pl) return showError(plErr?.message ?? 'No se pudo crear la lista de picking.');

    // 2. Cargar order_items con qty pendiente
    const { data: oi } = await supabase
      .from('order_items')
      .select('id, product_id, qty, qty_picked')
      .eq('order_id', order.id);

    const itemsPayload = ((oi || []) as Array<{ id: string; product_id: string; qty: number; qty_picked: number }>)
      .map((it) => {
        const pending = Number(it.qty) - Number(it.qty_picked);
        return {
          picking_list_id: pl.id,
          order_item_id: it.id,
          product_id: it.product_id,
          qty_requested: pending,
          qty_picked: pending,
        };
      })
      .filter((x) => x.qty_requested > 0);

    if (itemsPayload.length === 0) {
      await supabase.from('picking_lists').delete().eq('id', pl.id);
      return showError('Este pedido ya no tiene líneas pendientes de picking.');
    }

    const { error: iErr } = await supabase.from('picking_list_items').insert(itemsPayload);
    if (iErr) {
      await supabase.from('picking_lists').delete().eq('id', pl.id);
      return showError(iErr.message);
    }

    showSuccess(`Picking ${pl.folio} creado con ${itemsPayload.length} líneas`);
    onChanged();
    onSelect(pl as PickingList);
    onModeChange('edit');
  };

  const handleUpdateItem = async (itemId: string, patch: Partial<{ qty_picked: number; notes: string }>) => {
    const { error } = await supabase.from('picking_list_items').update(patch).eq('id', itemId);
    if (error) return showError(error.message);
    if (selected) await fetchPickingData(selected);
  };

  const handleClose = async () => {
    if (!selected) return;
    if (items.length === 0) return showError('No hay líneas que cerrar.');
    const totalPicked = items.reduce((s, i) => s + i.qty_picked, 0);
    if (totalPicked === 0) return showError('Todas las líneas tienen qty_picked = 0.');

    if (!confirm(`Cerrar picking ${selected.folio}? Esto liberará reservas, descontará stock y actualizará el pedido.`)) return;

    setStatus('loading');
    const { error } = await supabase.rpc('close_picking_list', { p_picking_list_id: selected.id });
    if (error) return showError(error.message);
    showSuccess('Picking cerrado, stock actualizado, pedido recalculado.');
    onChanged();
    onSelect({ ...selected, status: 'completed', completed_at: new Date().toISOString() });
  };

  const handleCancel = async () => {
    if (!selected) return;
    if (!confirm(`Cancelar picking ${selected.folio}? La reserva del pedido NO se libera automáticamente.`)) return;
    setStatus('loading');
    const { error } = await supabase
      .from('picking_lists')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) return showError(error.message);
    showSuccess('Picking cancelado.');
    onChanged();
    onSelect({ ...selected, status: 'cancelled', cancelled_at: new Date().toISOString() });
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
          <p className="text-gray-500 text-xs">El picking lo gestionan los roles <strong className="text-amber-400">admin</strong>, <strong className="text-amber-400">warehouse</strong> y <strong className="text-amber-400">fulfillment</strong>.</p>
        </div>
      </div>
    );
  }

  if (mode === 'empty') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <ClipboardList size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Editor de picking</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Package size={40} className="mb-3 opacity-20" />
            <p className="text-sm text-center mb-3">Selecciona una picking de la lista o genera una nueva contra un pedido confirmado</p>
            <button
              onClick={() => onModeChange('pick_order')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all"
            >
              <Plus size={14} />
              Nueva picking
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
            <ClipboardList size={18} className="text-amber-400" />
            <span className="text-white font-semibold">Selecciona el pedido</span>
          </div>
          <button onClick={() => onModeChange('empty')} className="text-gray-500 hover:text-gray-300" title="Cancelar">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {status === 'loading' && (
            <div className="text-center py-8 text-gray-600 text-xs">
              <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
              Cargando pedidos pendientes...
            </div>
          )}

          {status !== 'loading' && ordersPending.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              <p>No hay pedidos pendientes de picking.</p>
              <p className="text-[11px] mt-1">Solo aparecen pedidos en estado <strong>Confirmado</strong> o <strong>Preparando</strong> con saldo por surtir.</p>
            </div>
          )}

          {ordersPending.map((o) => (
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
                <p className="text-gray-500 text-xs">{o.total_qty_pending} u. pendientes · {o.status}</p>
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

  const config = PICKING_STATUS_CONFIG[selected.status];
  const isInProgress = selected.status === 'pending' || selected.status === 'in_progress';
  const totalRequested = items.reduce((s, i) => s + i.qty_requested, 0);
  const totalPicked = items.reduce((s, i) => s + i.qty_picked, 0);

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
        <div className="flex items-center gap-3 min-w-0">
          <ClipboardList size={18} className="text-amber-400 flex-shrink-0" />
          <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded">
            {selected.folio}
          </span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${config.color} ${config.bg} ${config.border}`}>
          {config.label}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* ============== DETALLE DEL PEDIDO ============== */}
        {order && (
          <div className="bg-black/40 border border-blue-900/30 rounded-xl overflow-hidden">
            <button
              onClick={() => setOrderExpanded(!orderExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-950/10 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Hash size={14} className="text-blue-400 flex-shrink-0" />
                <span className="font-mono text-blue-400 text-xs font-bold tracking-widest bg-blue-500/5 border border-blue-500/15 px-2 py-1 rounded flex-shrink-0">
                  {order.folio_display}
                </span>
                <span className="text-white text-sm font-medium truncate">{order.name}</span>
                {order.company && (
                  <span className="text-gray-500 text-xs truncate hidden sm:inline">· {order.company}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-amber-400 text-xs font-mono font-bold">
                  ${order.total.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                </span>
                {orderExpanded
                  ? <ChevronUp size={14} className="text-gray-500" />
                  : <ChevronDown size={14} className="text-gray-500" />}
              </div>
            </button>

            {orderExpanded && (
              <div className="border-t border-blue-900/30 p-4 space-y-4 text-xs">
                {/* Meta tiras */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-gray-600" />
                    {formatShortDate(order.created_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 size={11} className="text-gray-600" />
                    {order.warehouse_code}
                  </span>
                  {order.sales_channel && (
                    <span className="flex items-center gap-1.5">
                      <Globe2 size={11} className="text-gray-600" />
                      {order.sales_channel}
                    </span>
                  )}
                  {order.legacy_order_number && (
                    <span className="text-gray-600 font-mono">legacy: {order.legacy_order_number}</span>
                  )}
                  {order.source_reference && (
                    <span className="text-gray-500">ref: <span className="text-gray-300">{order.source_reference}</span></span>
                  )}
                </div>

                {/* Grid: contacto / pago / envío */}
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Contacto */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 flex items-center gap-1">
                      <User size={10} /> Cliente
                    </p>
                    <p className="text-white">{order.name || '—'}</p>
                    {order.company && <p className="text-gray-400">{order.company}</p>}
                    {order.email && (
                      <a
                        href={`mailto:${order.email}`}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1.5 truncate"
                      >
                        <Mail size={11} className="flex-shrink-0" />
                        <span className="truncate">{order.email}</span>
                      </a>
                    )}
                    {order.phone && (
                      <a
                        href={`https://wa.me/${order.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 flex items-center gap-1.5"
                      >
                        <Phone size={11} className="flex-shrink-0" />
                        <span>{order.phone}</span>
                      </a>
                    )}
                    {(order.city || order.state) && (
                      <p className="text-gray-400 flex items-center gap-1.5">
                        <MapPin size={11} className="flex-shrink-0 text-gray-600" />
                        <span>{[order.city, order.state].filter(Boolean).join(', ')}</span>
                      </p>
                    )}
                  </div>

                  {/* Pago */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 flex items-center gap-1">
                      <CreditCard size={10} /> Pago
                    </p>
                    <div className="flex items-center gap-1.5">
                      <BadgeDollarSign size={11} className="text-gray-600 flex-shrink-0" />
                      <span className="text-white font-mono">
                        ${order.total.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {order.payment_status && (
                      <p className="text-gray-400">
                        Estado: <span className={`font-semibold ${
                          order.payment_status === 'paid' ? 'text-green-400'
                          : order.payment_status === 'partial' ? 'text-amber-400'
                          : 'text-red-400'
                        }`}>{order.payment_status}</span>
                      </p>
                    )}
                    {order.payment_method && (
                      <p className="text-gray-400">Método: <span className="text-gray-200">{order.payment_method}</span></p>
                    )}
                    {order.partial_payment_amount != null && order.partial_payment_amount > 0 && (
                      <p className="text-gray-400">
                        Anticipo: <span className="text-amber-400 font-mono">
                          ${order.partial_payment_amount.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Envío */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 flex items-center gap-1">
                      <Truck size={10} /> Entrega
                    </p>
                    {order.delivery_method && (
                      <p className="text-gray-200">{order.delivery_method}</p>
                    )}
                    {order.delivery_promise_date && (
                      <p className="text-gray-400 flex items-center gap-1.5">
                        <Calendar size={11} className="text-gray-600" />
                        {new Date(order.delivery_promise_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    {!order.delivery_method && !order.delivery_promise_date && (
                      <p className="text-gray-600 italic">Sin definir</p>
                    )}
                  </div>
                </div>

                {/* Notas del pedido */}
                {order.notes && (
                  <div className="border-t border-blue-900/20 pt-3">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 flex items-center gap-1 mb-1">
                      <FileText size={10} /> Notas del pedido
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}

                {/* Resumen de TODAS las líneas del pedido */}
                {allOrderLines.length > 0 && (
                  <div className="border-t border-blue-900/20 pt-3">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-gray-500 flex items-center gap-1 mb-2">
                      <ListChecks size={10} /> Líneas del pedido ({allOrderLines.length})
                    </p>
                    <div className="space-y-1">
                      {allOrderLines.map((l) => {
                        const pendingTotal = l.qty - l.qty_picked_total;
                        const isInPicking = l.in_this_picking > 0;
                        return (
                          <div key={l.order_item_id} className="flex items-center gap-3 text-[11px] py-1">
                            <span className={`font-mono w-2 h-2 rounded-full flex-shrink-0 ${
                              isInPicking ? 'bg-amber-400' : pendingTotal > 0 ? 'bg-orange-400/60' : 'bg-green-400/60'
                            }`} />
                            <span className="font-mono text-amber-400/70 flex-shrink-0">{l.product_sku}</span>
                            <span className="text-gray-400 truncate flex-1">{l.product_name}</span>
                            <span className="text-gray-500 font-mono flex-shrink-0">
                              {l.qty_picked_total}/{l.qty}
                              {isInPicking && (
                                <span className="ml-2 text-amber-400">[+{l.in_this_picking} aquí]</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 text-[10px] text-gray-500 mt-2 pt-2 border-t border-blue-900/10">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> en esta picking</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" /> pendiente</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400/60" /> surtida</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Líneas ({items.length})</span>

          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
              Sin líneas en esta picking.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const diff = item.qty_picked - item.qty_requested;
                const incomplete = item.qty_picked < item.qty_requested;
                return (
                  <div key={item.id} className={`bg-black border rounded-lg p-2 space-y-2 ${incomplete && isInProgress ? 'border-orange-800/40' : 'border-gray-800'}`}>
                    <p className="text-white text-xs">
                      <span className="font-mono text-amber-400/70">{item.product_sku}</span>
                      <span className="text-gray-500"> — {item.product_name}</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase tracking-wide">Pedido total</label>
                        <p className="px-2 py-1 text-gray-400 text-xs font-mono">{item.order_item_qty}</p>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase tracking-wide">A surtir aquí</label>
                        <p className="px-2 py-1 text-blue-400 text-xs font-mono font-semibold">{item.qty_requested}</p>
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-400 uppercase tracking-wide font-bold">Pickeado</label>
                        <input
                          type="number"
                          value={item.qty_picked}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, qty_picked: val } : x)));
                          }}
                          onBlur={(e) => handleUpdateItem(item.id, { qty_picked: parseFloat(e.target.value) || 0 })}
                          disabled={!isInProgress}
                          min="0"
                          max={item.qty_requested}
                          step="1"
                          className="w-full px-2 py-1 bg-amber-500/5 border border-amber-500/20 rounded text-amber-400 text-xs font-mono font-bold focus:outline-none focus:border-amber-500/60 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    {incomplete && isInProgress && (
                      <div className="flex items-center gap-1.5 text-[11px] pt-1 border-t border-gray-800">
                        <AlertCircle size={11} className="text-orange-400" />
                        <span className="text-orange-400 font-semibold">{diff} faltante (parcial)</span>
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
            <div className="text-xs">
              <p className="text-gray-500 uppercase tracking-wide font-semibold">Solicitado</p>
              <p className="text-gray-300 font-bold text-lg">{totalRequested} u.</p>
            </div>
            <div className="text-xs text-right">
              <p className="text-amber-400 uppercase tracking-wide font-semibold">Pickeado</p>
              <p className="text-amber-400 font-bold text-lg">{totalPicked} u.</p>
            </div>
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <FileText size={11} /> Notas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={async () => {
              if (selected && notes !== selected.notes) {
                await supabase.from('picking_lists').update({ notes }).eq('id', selected.id);
              }
            }}
            disabled={!isInProgress}
            rows={2}
            placeholder="Observaciones del picking"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none disabled:opacity-50"
          />
        </div>

        {renderFeedback()}

        <div className="flex flex-col gap-2">
          {isInProgress && (
            <>
              <button
                onClick={handleClose}
                disabled={status === 'loading' || totalPicked === 0}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
                Cerrar picking y descontar stock
              </button>
              <button
                onClick={handleCancel}
                disabled={status === 'loading'}
                className="w-full bg-black border border-red-900/40 text-red-400 hover:bg-red-950/30 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Ban size={12} />
                Cancelar picking
              </button>
            </>
          )}

          {selected.status === 'completed' && (
            <div className="flex items-start gap-2 p-3 bg-green-950/20 border border-green-800/30 rounded-lg text-xs text-green-300">
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
              <p>Picking cerrado. Stock descontado y pedido actualizado a <strong>preparando/listo</strong>. Genera la entrega desde el módulo de Entregas.</p>
            </div>
          )}

          {selected.status === 'cancelled' && (
            <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-800/30 rounded-lg text-xs text-red-300">
              <Ban size={14} className="flex-shrink-0 mt-0.5" />
              <p>Picking cancelado. La reserva del pedido sigue activa hasta que se cancele el pedido o se haga otro picking.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
