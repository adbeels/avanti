import { useEffect, useState } from 'react';
import {
  Package, RefreshCw, ChevronDown, ChevronUp, Mail, Phone, Building2,
  FileText, MapPin, Clock, CheckCircle2, AlertCircle, Search, Filter, Download,
  Banknote, Save,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type SalesChannel = 'web' | 'manual_phone' | 'manual_whatsapp' | 'manual_email' | 'manual_visit' | 'manual_event' | 'manual_other';

export interface Preorder {
  id: string;
  order_number: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  notes: string;
  items: { product: string; quantity: number; unit_price: number; subtotal: number }[];
  total: number;
  status: string;
  created_at: string;
  payment_confirmed_at: string | null;
  payment_method: string;
  email_sent_at: string | null;
  payment_confirmation_sent_at: string | null;
  partial_payment_amount: number | null;
  delivery_status: 'pending' | 'ready' | 'delivered';
  delivery_method: 'pickup' | 'courier' | 'wholesale' | null;
  delivery_ready_at: string | null;
  delivered_at: string | null;
  delivery_notes: string;
  delivery_ready_email_sent_at: string | null;
  delivery_ready_whatsapp_sent_at: string | null;
  // Fase 2 (modelo nuevo)
  folio: string | null;
  legacy_order_number: string | null;
  sales_channel: SalesChannel;
  source_reference: string;
  warehouse_id: string | null;
  delivery_promise_date: string | null;
  payment_status: PaymentStatus;
  etapa: string | null;
}

type StatusFilter = 'all' | 'pending' | 'contacted' | 'confirmed' | 'partial_payment' | 'backorder' | 'cancelled';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  contacted: { label: 'Contactado', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  confirmed: { label: 'Confirmado', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  partial_payment: { label: 'Pago parcial', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  backorder: { label: 'Backorder', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  fulfilling: { label: 'Preparando', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  ready: { label: 'Listo', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  delivered: { label: 'Entregado', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string; border: string }> = {
  unpaid:  { label: 'Sin pagar',     color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20' },
  partial: { label: 'Pago parcial',  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  paid:    { label: 'Pagado',        color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
};

export const SALES_CHANNEL_CONFIG: Record<SalesChannel, { label: string; short: string }> = {
  web:             { label: 'Web (sitio público)', short: 'Web' },
  manual_phone:    { label: 'Manual — Teléfono',   short: 'Tel' },
  manual_whatsapp: { label: 'Manual — WhatsApp',   short: 'WSP' },
  manual_email:    { label: 'Manual — Email',      short: 'Mail' },
  manual_visit:    { label: 'Manual — Visita',     short: 'Visita' },
  manual_event:    { label: 'Manual — Evento',     short: 'Evento' },
  manual_other:    { label: 'Manual — Otro',       short: 'Otro' },
};

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

interface PreordersTableProps {
  onSelectPreorder: (preorder: Preorder) => void;
  selectedId: string | null;
  onPreordersChange?: (preorders: Preorder[]) => void;
  onCreateExternal?: () => void;
  onBulkImport?: () => void;
  refreshKey?: number;
}

export default function PreordersTable({ onSelectPreorder, selectedId, onPreordersChange, onCreateExternal, onBulkImport, refreshKey }: PreordersTableProps) {
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [partialAmountInputs, setPartialAmountInputs] = useState<Record<string, string>>({});
  const [savingPartial, setSavingPartial] = useState<string | null>(null);

  const fetchPreorders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('preorders')
      .select('*')
      .order('created_at', { ascending: false });
    const preordersData = (data as Preorder[]) || [];
    setPreorders(preordersData);
    onPreordersChange?.(preordersData);
    setLoading(false);
  };

  useEffect(() => {
    fetchPreorders();
  }, [refreshKey]);

  const filtered = preorders.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
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

  const counts: Record<StatusFilter, number> = {
    all: preorders.length,
    pending: preorders.filter((p) => p.status === 'pending').length,
    contacted: preorders.filter((p) => p.status === 'contacted').length,
    confirmed: preorders.filter((p) => p.status === 'confirmed').length,
    partial_payment: preorders.filter((p) => p.status === 'partial_payment').length,
    backorder: preorders.filter((p) => p.status === 'backorder').length,
    cancelled: preorders.filter((p) => p.status === 'cancelled').length,
  };

  const handleStatusChange = async (preorder: Preorder, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'confirmed') {
      updates.payment_confirmed_at = new Date().toISOString();
    }
    if (newStatus !== 'partial_payment') {
      updates.partial_payment_amount = null;
      setPartialAmountInputs((prev) => { const n = { ...prev }; delete n[preorder.id]; return n; });
    }

    await supabase.from('preorders').update(updates).eq('id', preorder.id);
    setPreorders((prev) =>
      prev.map((p) => (p.id === preorder.id ? { ...p, ...updates } as Preorder : p))
    );
  };

  const handleSavePartialAmount = async (preorder: Preorder) => {
    const raw = partialAmountInputs[preorder.id];
    const amount = parseFloat(raw);
    if (isNaN(amount) || amount < 0) return;
    setSavingPartial(preorder.id);
    await supabase.from('preorders').update({ partial_payment_amount: amount }).eq('id', preorder.id);
    setPreorders((prev) =>
      prev.map((p) => (p.id === preorder.id ? { ...p, partial_payment_amount: amount } : p))
    );
    setSavingPartial(null);
  };

  const exportToCSV = () => {
    const headers = [
      'No. Pedido',
      'Fecha',
      'Estado',
      'Nombre',
      'Email',
      'Teléfono',
      'Empresa',
      'Ciudad',
      'Estado/Provincia',
      'Notas',
      'Producto',
      'Cantidad',
      'Precio Unitario',
      'Subtotal',
      'Total Pedido',
      'Monto Pagado Parcial',
      'Saldo Pendiente',
      'Forma de Pago',
      'Pago Confirmado',
      'Correo Enviado'
    ];

    const rows = filtered.flatMap((p) => {
      const base = [
        p.order_number,
        formatDate(p.created_at),
        STATUS_CONFIG[p.status]?.label || p.status,
        p.name,
        p.email,
        p.phone,
        p.company || '',
        p.city || '',
        p.state || '',
        p.notes || '',
      ];
      const footer = [
        p.total.toString(),
        p.partial_payment_amount != null ? p.partial_payment_amount.toString() : '',
        p.partial_payment_amount != null ? (p.total - p.partial_payment_amount).toString() : '',
        p.payment_method || '',
        p.payment_confirmed_at ? formatDate(p.payment_confirmed_at) : 'No',
        p.email_sent_at ? formatDate(p.email_sent_at) : 'No'
      ];
      return p.items.map((item) => [
        ...base,
        item.product,
        item.quantity.toString(),
        item.unit_price.toString(),
        item.subtotal.toString(),
        ...footer
      ]);
    });

    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(String).map(escapeCSV).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `prepedidos_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Package size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Prepedidos</span>
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
              placeholder="Buscar nombre, email o empresa..."
              className="w-full pl-8 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onBulkImport && (
              <button
                onClick={onBulkImport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black border border-gray-800 text-gray-400 hover:text-amber-400 hover:border-amber-500/40 rounded-lg text-xs font-semibold transition-colors"
                title="Importar varios pedidos externos desde CSV"
              >
                <Download size={13} className="rotate-180" />
                <span className="hidden md:inline">Importar CSV</span>
              </button>
            )}
            {onCreateExternal && (
              <button
                onClick={onCreateExternal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold transition-colors"
                title="Crear pedido externo (manual)"
              >
                <Package size={13} />
                <span>Pedido externo</span>
              </button>
            )}
            <button
              onClick={exportToCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Exportar a CSV"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
            <button
              onClick={fetchPreorders}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1.5"
              title="Recargar"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <Filter size={12} className="text-gray-600 flex-shrink-0 mr-0.5" />
          {(['all', 'pending', 'contacted', 'confirmed', 'partial_payment', 'backorder', 'cancelled'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                statusFilter === f
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-black border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              {f === 'all' ? 'Todos' : STATUS_CONFIG[f]?.label || f}
              <span className="opacity-60">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>{search || statusFilter !== 'all' ? 'Sin resultados' : 'No hay prepedidos aun'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50 bg-black/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">No. Pedido</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Correo</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map((p) => {
                const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                return (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => onSelectPreorder(p)}
                      className={`hover:bg-gray-900/50 transition-colors cursor-pointer ${
                        selectedId === p.id ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-amber-400/80 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded">
                            {p.folio || p.order_number}
                          </span>
                          {p.legacy_order_number && p.folio && (
                            <span className="font-mono text-gray-600 text-[10px] tracking-wider">leg: {p.legacy_order_number}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white text-sm font-medium">{p.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-500 font-medium">
                            {SALES_CHANNEL_CONFIG[p.sales_channel]?.short ?? p.sales_channel}
                          </span>
                        </div>
                        {p.company && (
                          <span className="text-gray-600 text-xs">{p.company}</span>
                        )}
                        {p.source_reference && (
                          <span className="text-gray-700 text-[10px] italic block mt-0.5">ref: {p.source_reference}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-gray-400 text-sm">{p.email}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-amber-400 text-sm font-bold">{formatMXN(p.total)}</span>
                          {(() => {
                            const pcfg = PAYMENT_STATUS_CONFIG[p.payment_status];
                            return (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${pcfg.color} ${pcfg.bg} ${pcfg.border}`}>
                                {pcfg.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={p.status}
                          onChange={(e) => { e.stopPropagation(); handleStatusChange(p, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-xs font-medium px-2 py-1 rounded-lg bg-transparent cursor-pointer focus:outline-none appearance-none text-center`}
                        >
                          <option value="pending" className="bg-gray-950 text-white">Pendiente</option>
                          <option value="contacted" className="bg-gray-950 text-white">Contactado</option>
                          <option value="confirmed" className="bg-gray-950 text-white">Confirmado</option>
                          <option value="backorder" className="bg-gray-950 text-white">Backorder</option>
                          <option value="fulfilling" className="bg-gray-950 text-white">Preparando</option>
                          <option value="ready" className="bg-gray-950 text-white">Listo</option>
                          <option value="delivered" className="bg-gray-950 text-white">Entregado</option>
                          <option value="partial_payment" className="bg-gray-950 text-white">Pago parcial</option>
                          <option value="cancelled" className="bg-gray-950 text-white">Cancelado</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-gray-600 text-xs">{formatShortDate(p.created_at)}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-center">
                        {p.email_sent_at ? (
                          <span className="inline-flex items-center gap-1 text-green-500/60 text-xs" title={`Enviado: ${formatDate(p.email_sent_at)}`}>
                            <CheckCircle2 size={13} />
                            <span>Enviado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-600 text-xs">
                            <AlertCircle size={13} />
                            <span>No enviado</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === p.id ? null : p.id); }}
                          className="text-gray-600 hover:text-amber-400 transition-colors"
                        >
                          {expandedId === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-exp`} className="bg-black/60">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Mail size={14} className="text-amber-500/60" />
                              <span>{p.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <Phone size={14} className="text-amber-500/60" />
                              <span>{p.phone}</span>
                            </div>
                            {p.company && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <Building2 size={14} className="text-amber-500/60" />
                                <span>{p.company}</span>
                              </div>
                            )}
                            {(p.city || p.state) && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <MapPin size={14} className="text-amber-500/60" />
                                <span>{[p.city, p.state].filter(Boolean).join(', ')}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-400">
                              <Clock size={14} className="text-amber-500/60" />
                              <span>{formatDate(p.created_at)}</span>
                            </div>
                            {p.notes && (
                              <div className="flex items-start gap-2 text-gray-400 sm:col-span-2 lg:col-span-3">
                                <FileText size={14} className="text-amber-500/60 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-500 italic">{p.notes}</span>
                              </div>
                            )}
                          </div>
                          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-black/60 border-b border-gray-800">
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Producto</th>
                                  <th className="px-3 py-2 text-center text-gray-500 font-semibold">Cant.</th>
                                  <th className="px-3 py-2 text-right text-gray-500 font-semibold">P. Unit.</th>
                                  <th className="px-3 py-2 text-right text-gray-500 font-semibold">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800/50">
                                {p.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-white">{item.product}</td>
                                    <td className="px-3 py-2 text-center text-gray-400">{item.quantity}</td>
                                    <td className="px-3 py-2 text-right text-gray-400">{formatMXN(item.unit_price)}</td>
                                    <td className="px-3 py-2 text-right text-white font-medium">{formatMXN(item.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-gray-800">
                                  <td colSpan={3} className="px-3 py-2 text-right text-gray-400 font-semibold">Total</td>
                                  <td className="px-3 py-2 text-right text-amber-400 font-bold">{formatMXN(p.total)}</td>
                                </tr>
                                {p.status === 'partial_payment' && p.partial_payment_amount != null && (
                                  <>
                                    <tr className="border-t border-orange-500/20 bg-orange-500/5">
                                      <td colSpan={3} className="px-3 py-2 text-right text-orange-300/80 font-semibold">Pagado parcialmente</td>
                                      <td className="px-3 py-2 text-right text-orange-400 font-bold">{formatMXN(p.partial_payment_amount)}</td>
                                    </tr>
                                    <tr className="bg-orange-500/5">
                                      <td colSpan={3} className="px-3 py-2 text-right text-orange-300/80 font-semibold">Saldo pendiente</td>
                                      <td className="px-3 py-2 text-right text-orange-400 font-bold">{formatMXN(p.total - p.partial_payment_amount)}</td>
                                    </tr>
                                  </>
                                )}
                              </tfoot>
                            </table>
                          </div>
                          {p.status === 'partial_payment' && (
                            <div className="mt-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                              <div className="flex items-center gap-2 mb-3">
                                <Banknote size={15} className="text-orange-400" />
                                <span className="text-orange-300 text-sm font-semibold">Monto pagado parcialmente</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="relative flex-1 max-w-xs">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={
                                      partialAmountInputs[p.id] !== undefined
                                        ? partialAmountInputs[p.id]
                                        : p.partial_payment_amount ?? ''
                                    }
                                    onChange={(e) =>
                                      setPartialAmountInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                                    }
                                    className="w-full pl-7 pr-4 py-2 bg-black border border-orange-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-orange-400 transition-colors"
                                  />
                                </div>
                                <button
                                  onClick={() => handleSavePartialAmount(p)}
                                  disabled={savingPartial === p.id || partialAmountInputs[p.id] === undefined}
                                  className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {savingPartial === p.id ? (
                                    <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Save size={14} />
                                  )}
                                  Guardar
                                </button>
                                {p.partial_payment_amount != null && (
                                  <div className="text-xs text-gray-500">
                                    Saldo: <span className="text-orange-400 font-semibold">{formatMXN(p.total - p.partial_payment_amount)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
