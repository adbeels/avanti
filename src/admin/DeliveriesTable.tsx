import { useEffect, useState } from 'react';
import {
  Truck, RefreshCw, Search, ChevronDown, ChevronUp,
  CheckCircle2, Package, Clock, Store, Send, Building2,
  Undo2, Loader2, AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Preorder } from './PreordersTable';

type DeliveryStatusFilter = 'all' | 'pending' | 'ready' | 'delivered';
type DeliveryMethodFilter = 'all' | 'pickup' | 'courier' | 'wholesale';
type DeliveryMethod = 'pickup' | 'courier' | 'wholesale';

const DELIVERY_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Pendiente',  color: 'text-amber-400', bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  ready:     { label: 'Listo',      color: 'text-blue-400',  bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  delivered: { label: 'Entregado',  color: 'text-green-400', bg: 'bg-green-500/10',  border: 'border-green-500/20' },
};

const DELIVERY_METHOD_CONFIG: Record<DeliveryMethod, { label: string; icon: typeof Store }> = {
  pickup:    { label: 'Retiro presencial', icon: Store },
  courier:   { label: 'Uber / Didi',       icon: Truck },
  wholesale: { label: 'Mayorista',         icon: Building2 },
};

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatShort(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface DeliveriesTableProps {
  onSelectPreorder: (preorder: Preorder) => void;
  selectedId: string | null;
  refreshKey?: number;
}

export default function DeliveriesTable({ onSelectPreorder, selectedId, refreshKey }: DeliveriesTableProps) {
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<DeliveryMethodFilter>('all');
  const [deliverPickerId, setDeliverPickerId] = useState<string | null>(null);
  const [deliverMethod, setDeliverMethod] = useState<DeliveryMethod>('pickup');
  const [deliverNotes, setDeliverNotes] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPreorders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('preorders')
      .select('*')
      .eq('status', 'confirmed')
      .order('payment_confirmed_at', { ascending: false });
    setPreorders((data as Preorder[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPreorders();
  }, [refreshKey]);

  const filtered = preorders.filter((p) => {
    if (statusFilter !== 'all' && p.delivery_status !== statusFilter) return false;
    if (methodFilter !== 'all' && p.delivery_method !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.order_number?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: preorders.length,
    pending: preorders.filter((p) => p.delivery_status === 'pending').length,
    ready: preorders.filter((p) => p.delivery_status === 'ready').length,
    delivered: preorders.filter((p) => p.delivery_status === 'delivered').length,
  };

  const openDeliverPicker = (preorder: Preorder) => {
    setDeliverPickerId(preorder.id);
    setDeliverMethod(preorder.delivery_method ?? 'pickup');
    setDeliverNotes(preorder.delivery_notes ?? '');
  };

  const cancelDeliverPicker = () => {
    setDeliverPickerId(null);
    setDeliverNotes('');
  };

  const confirmDelivered = async (preorder: Preorder) => {
    setSavingId(preorder.id);
    const updates = {
      delivery_status: 'delivered' as const,
      delivery_method: deliverMethod,
      delivered_at: new Date().toISOString(),
      delivery_notes: deliverNotes.trim(),
    };
    await supabase.from('preorders').update(updates).eq('id', preorder.id);
    setPreorders((prev) =>
      prev.map((p) => (p.id === preorder.id ? { ...p, ...updates } as Preorder : p))
    );
    setSavingId(null);
    cancelDeliverPicker();
  };

  const revertToPending = async (preorder: Preorder) => {
    setSavingId(preorder.id);
    const updates = {
      delivery_status: 'pending' as const,
      delivery_ready_at: null,
      delivered_at: null,
      delivery_method: null,
    };
    await supabase.from('preorders').update(updates).eq('id', preorder.id);
    setPreorders((prev) =>
      prev.map((p) => (p.id === preorder.id ? { ...p, ...updates } as Preorder : p))
    );
    setSavingId(null);
  };

  const revertToReady = async (preorder: Preorder) => {
    setSavingId(preorder.id);
    const updates = {
      delivery_status: 'ready' as const,
      delivered_at: null,
      delivery_method: null,
    };
    await supabase.from('preorders').update(updates).eq('id', preorder.id);
    setPreorders((prev) =>
      prev.map((p) => (p.id === preorder.id ? { ...p, ...updates } as Preorder : p))
    );
    setSavingId(null);
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Truck size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Entregas</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {preorders.length}
            </span>
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre, email, empresa o N° pedido..."
              className="w-full pl-8 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <button
            onClick={fetchPreorders}
            className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/40 transition-all flex-shrink-0"
            title="Refrescar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'ready', 'delivered'] as DeliveryStatusFilter[]).map((s) => {
            const config = s === 'all' ? null : DELIVERY_STATUS_CONFIG[s];
            const isActive = statusFilter === s;
            const label = s === 'all' ? 'Todos' : config!.label;
            const count = counts[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  isActive
                    ? config
                      ? `${config.color} ${config.bg} ${config.border}`
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-gray-500 bg-black border-gray-800 hover:border-gray-700'
                }`}
              >
                {label} <span className="opacity-60 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] text-gray-600 self-center mr-1">M&eacute;todo:</span>
          {(['all', 'pickup', 'courier', 'wholesale'] as DeliveryMethodFilter[]).map((m) => {
            const isActive = methodFilter === m;
            const label = m === 'all' ? 'Todos' : DELIVERY_METHOD_CONFIG[m].label;
            return (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  isActive
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-gray-500 bg-black border-gray-800 hover:border-gray-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600">
          <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando pedidos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <Package size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {preorders.length === 0
              ? 'A&uacute;n no hay pedidos confirmados para entregar.'
              : 'Ning&uacute;n pedido coincide con los filtros.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {filtered.map((p) => {
            const statusConfig = DELIVERY_STATUS_CONFIG[p.delivery_status];
            const methodConfig = p.delivery_method ? DELIVERY_METHOD_CONFIG[p.delivery_method] : null;
            const MethodIcon = methodConfig?.icon ?? Package;
            const isExpanded = expandedId === p.id;
            const isSelected = selectedId === p.id;
            const showPicker = deliverPickerId === p.id;
            const isSaving = savingId === p.id;

            return (
              <div
                key={p.id}
                className={`transition-colors ${isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'}`}
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="text-gray-600 hover:text-amber-400 transition-colors flex-shrink-0"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  <div className="flex items-center gap-2 flex-shrink-0 min-w-[140px]">
                    <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-1.5 py-0.5 rounded">
                      {p.order_number}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-gray-500 text-xs truncate">
                      {p.email}
                      {p.company ? <span className="text-gray-700"> &middot; {p.company}</span> : null}
                    </p>
                  </div>

                  <span className="text-green-400 font-bold text-sm flex-shrink-0 w-24 text-right">
                    {formatMXN(p.total)}
                  </span>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex-shrink-0 ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border}`}
                  >
                    {statusConfig.label}
                  </span>

                  <div className="flex items-center gap-1.5 flex-shrink-0 min-w-[150px] text-xs text-gray-500">
                    {methodConfig ? (
                      <>
                        <MethodIcon size={12} className="text-gray-500" />
                        <span>{methodConfig.label}</span>
                      </>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {p.delivery_status === 'pending' && (
                      <button
                        onClick={() => onSelectPreorder(p)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 font-medium"
                        title="Marcar listo y enviar correo"
                      >
                        <Send size={12} />
                        Marcar listo
                      </button>
                    )}
                    {p.delivery_status === 'ready' && (
                      <>
                        <button
                          onClick={() => openDeliverPicker(p)}
                          disabled={isSaving}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all flex items-center gap-1.5 font-medium disabled:opacity-40"
                        >
                          <CheckCircle2 size={12} />
                          Marcar entregado
                        </button>
                        <button
                          onClick={() => revertToPending(p)}
                          disabled={isSaving}
                          className="text-xs p-1.5 rounded-lg bg-black border border-gray-800 text-gray-500 hover:text-amber-400 hover:border-gray-700 transition-all disabled:opacity-40"
                          title="Revertir a pendiente"
                        >
                          <Undo2 size={12} />
                        </button>
                      </>
                    )}
                    {p.delivery_status === 'delivered' && (
                      <button
                        onClick={() => revertToReady(p)}
                        disabled={isSaving}
                        className="text-xs p-1.5 rounded-lg bg-black border border-gray-800 text-gray-500 hover:text-amber-400 hover:border-gray-700 transition-all disabled:opacity-40"
                        title="Revertir a listo"
                      >
                        <Undo2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {showPicker && (
                  <div className="px-5 pb-4 -mt-1">
                    <div className="bg-black border border-green-800/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-green-400 text-xs font-semibold uppercase tracking-wide">
                        <CheckCircle2 size={14} />
                        Confirmar entrega
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">M&eacute;todo de entrega</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.keys(DELIVERY_METHOD_CONFIG) as DeliveryMethod[]).map((m) => {
                            const cfg = DELIVERY_METHOD_CONFIG[m];
                            const Icon = cfg.icon;
                            const active = deliverMethod === m;
                            return (
                              <button
                                key={m}
                                onClick={() => setDeliverMethod(m)}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                                  active
                                    ? 'bg-green-500/10 border-green-500/40 text-green-300'
                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                }`}
                              >
                                <Icon size={13} />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Notas (opcional)</label>
                        <input
                          type="text"
                          value={deliverNotes}
                          onChange={(e) => setDeliverNotes(e.target.value)}
                          placeholder="Ej: entregado a recepci&oacute;n, recolect&oacute; Juan..."
                          className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => confirmDelivered(p)}
                          disabled={isSaving}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Confirmar entrega
                        </button>
                        <button
                          onClick={cancelDeliverPicker}
                          disabled={isSaving}
                          className="px-4 py-2 bg-black border border-gray-800 rounded-lg text-gray-500 text-xs font-medium hover:text-white hover:border-gray-700 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="px-5 pb-5 -mt-2">
                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-start gap-2">
                          <Clock size={12} className="text-gray-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-600 uppercase tracking-wide text-[10px] font-semibold">Pago confirmado</p>
                            <p className="text-gray-300">{formatShort(p.payment_confirmed_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Send size={12} className="text-gray-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-600 uppercase tracking-wide text-[10px] font-semibold">Aviso "listo" enviado</p>
                            <p className="text-gray-300">{formatShort(p.delivery_ready_email_sent_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Package size={12} className="text-gray-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-600 uppercase tracking-wide text-[10px] font-semibold">Marcado listo</p>
                            <p className="text-gray-300">{formatShort(p.delivery_ready_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={12} className="text-gray-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-600 uppercase tracking-wide text-[10px] font-semibold">Entregado</p>
                            <p className="text-gray-300">{formatShort(p.delivered_at)}</p>
                          </div>
                        </div>
                      </div>

                      {p.delivery_notes && (
                        <div className="pt-3 border-t border-gray-800">
                          <p className="text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-1">Notas de entrega</p>
                          <p className="text-gray-300 text-xs">{p.delivery_notes}</p>
                        </div>
                      )}

                      <div className="pt-3 border-t border-gray-800">
                        <p className="text-gray-600 uppercase tracking-wide text-[10px] font-semibold mb-2">Productos</p>
                        <ul className="space-y-1">
                          {p.items.map((item, idx) => (
                            <li key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-gray-300">
                                <span className="text-gray-600 mr-2">{item.quantity}&times;</span>
                                {item.product}
                              </span>
                              <span className="text-gray-400 font-mono">{formatMXN(item.subtotal)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {p.delivery_status === 'pending' && !p.delivery_ready_email_sent_at && (
                        <div className="pt-3 border-t border-gray-800 flex items-start gap-2 text-xs text-amber-400/80">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>Pendiente de avisar al cliente. Usa <strong className="text-amber-400">Marcar listo</strong> para enviarle el correo.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
