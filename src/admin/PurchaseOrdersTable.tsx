import { useEffect, useState } from 'react';
import {
  ShoppingBag, RefreshCw, Search, Plus, Package2, Calendar,
  ChevronRight, Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface PurchaseOrder {
  id: string;
  folio: string;
  supplier: string;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'closed' | 'cancelled';
  notes: string;
  sent_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface PurchaseOrderWithStats extends PurchaseOrder {
  line_count: number;
  total_estimated: number;
}

type StatusFilter = 'all' | 'draft' | 'sent' | 'partially_received' | 'received' | 'closed' | 'cancelled';

export const PO_STATUS_CONFIG: Record<PurchaseOrder['status'], { label: string; color: string; bg: string; border: string }> = {
  draft:               { label: 'Borrador',         color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20' },
  sent:                { label: 'Enviada',          color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  partially_received:  { label: 'Recibido parcial', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  received:            { label: 'Recibido',         color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  closed:              { label: 'Cerrada',          color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
  cancelled:           { label: 'Cancelada',        color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
};

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface PurchaseOrdersTableProps {
  onSelectPO: (po: PurchaseOrder | null) => void;
  selectedId: string | null;
  onCreateNew: () => void;
  onImportCSV?: () => void;
  refreshKey?: number;
}

export default function PurchaseOrdersTable({ onSelectPO, selectedId, onCreateNew, onImportCSV, refreshKey }: PurchaseOrdersTableProps) {
  const [pos, setPOs] = useState<PurchaseOrderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchPOs = async () => {
    setLoading(true);
    const { data: poData } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: itemsData } = await supabase
      .from('po_items')
      .select('purchase_order_id, qty_ordered, unit_cost');

    const stats = new Map<string, { count: number; total: number }>();
    (itemsData || []).forEach((item) => {
      const cur = stats.get(item.purchase_order_id) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(item.qty_ordered) * Number(item.unit_cost);
      stats.set(item.purchase_order_id, cur);
    });

    const enriched: PurchaseOrderWithStats[] = (poData || []).map((p) => ({
      ...(p as PurchaseOrder),
      line_count: stats.get(p.id)?.count ?? 0,
      total_estimated: stats.get(p.id)?.total ?? 0,
    }));

    setPOs(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchPOs();
  }, [refreshKey]);

  const filtered = pos.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.folio.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts: Record<StatusFilter, number> = {
    all: pos.length,
    draft: pos.filter((p) => p.status === 'draft').length,
    sent: pos.filter((p) => p.status === 'sent').length,
    partially_received: pos.filter((p) => p.status === 'partially_received').length,
    received: pos.filter((p) => p.status === 'received').length,
    closed: pos.filter((p) => p.status === 'closed').length,
    cancelled: pos.filter((p) => p.status === 'cancelled').length,
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ShoppingBag size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Compras</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {pos.length}
            </span>
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar folio, proveedor o notas..."
              className="w-full pl-8 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <button
            onClick={fetchPOs}
            className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/40 transition-all flex-shrink-0"
            title="Refrescar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {onImportCSV && (
            <button
              onClick={onImportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-black border border-gray-800 text-gray-400 hover:text-amber-400 hover:border-amber-500/40 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
              title="Importar varias POs desde CSV"
            >
              <Upload size={14} />
              <span className="hidden md:inline">Importar CSV</span>
            </button>
          )}
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
          >
            <Plus size={14} />
            Nueva PO
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'draft', 'sent', 'partially_received', 'received', 'closed', 'cancelled'] as StatusFilter[]).map((s) => {
            const config = s === 'all' ? null : PO_STATUS_CONFIG[s];
            const isActive = statusFilter === s;
            const label = s === 'all' ? 'Todas' : config!.label;
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
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando órdenes de compra...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <Package2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-2">
            {pos.length === 0 ? 'Aún no hay órdenes de compra.' : 'Ninguna PO coincide con los filtros.'}
          </p>
          {pos.length === 0 && (
            <button
              onClick={onCreateNew}
              className="text-amber-400 text-xs underline hover:text-amber-300"
            >
              Crear la primera
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {filtered.map((p) => {
            const config = PO_STATUS_CONFIG[p.status];
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPO(p)}
                className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors ${
                  isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                }`}
              >
                <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded flex-shrink-0">
                  {p.folio}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.supplier}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatShortDate(p.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package2 size={11} />
                      {p.line_count} {p.line_count === 1 ? 'línea' : 'líneas'}
                    </span>
                  </p>
                </div>

                <div className="text-right flex-shrink-0 hidden md:block">
                  <p className="text-green-400 font-bold text-sm">{formatMXN(p.total_estimated)}</p>
                  <p className="text-gray-600 text-[10px] uppercase tracking-wide">Estimado</p>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex-shrink-0 ${config.color} ${config.bg} ${config.border}`}
                >
                  {config.label}
                </span>

                <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-amber-400' : 'text-gray-700'}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
