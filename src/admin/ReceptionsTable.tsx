import { useEffect, useState } from 'react';
import {
  Inbox, RefreshCw, Search, Plus, Calendar, ChevronRight,
  Package2, Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface Reception {
  id: string;
  folio: string;
  purchase_order_id: string;
  warehouse_id: string;
  performed_by: string | null;
  received_at: string;
  status: 'in_progress' | 'completed' | 'discrepancy_open' | 'reconciled' | 'cancelled';
  notes: string;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface ReceptionWithJoins extends Reception {
  po_folio: string;
  po_supplier: string;
  warehouse_code: string;
  warehouse_name: string;
  line_count: number;
  qty_total: number;
}

type StatusFilter = 'all' | Reception['status'];

export const RECEPTION_STATUS_CONFIG: Record<Reception['status'], { label: string; color: string; bg: string; border: string }> = {
  in_progress:        { label: 'En curso',     color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  completed:          { label: 'Completada',   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  discrepancy_open:   { label: 'Discrepancia', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  reconciled:         { label: 'Conciliada',   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  cancelled:          { label: 'Cancelada',    color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface ReceptionsTableProps {
  onSelectReception: (r: Reception | null) => void;
  selectedId: string | null;
  onCreateNew: () => void;
  refreshKey?: number;
}

export default function ReceptionsTable({ onSelectReception, selectedId, onCreateNew, refreshKey }: ReceptionsTableProps) {
  const [receptions, setReceptions] = useState<ReceptionWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchReceptions = async () => {
    setLoading(true);
    const { data: rData } = await supabase
      .from('receptions')
      .select('*, purchase_order:purchase_orders(folio, supplier), warehouse:warehouses(code, name)')
      .order('received_at', { ascending: false });

    const { data: itemsData } = await supabase
      .from('reception_items')
      .select('reception_id, qty_received');

    const stats = new Map<string, { count: number; qty: number }>();
    (itemsData || []).forEach((item) => {
      const cur = stats.get(item.reception_id) ?? { count: 0, qty: 0 };
      cur.count += 1;
      cur.qty += Number(item.qty_received);
      stats.set(item.reception_id, cur);
    });

    const enriched: ReceptionWithJoins[] = (rData || []).map((r) => {
      const row = r as Reception & {
        purchase_order?: { folio: string; supplier: string } | null;
        warehouse?: { code: string; name: string } | null;
      };
      return {
        ...row,
        po_folio: row.purchase_order?.folio ?? '—',
        po_supplier: row.purchase_order?.supplier ?? '—',
        warehouse_code: row.warehouse?.code ?? '—',
        warehouse_name: row.warehouse?.name ?? '',
        line_count: stats.get(r.id)?.count ?? 0,
        qty_total: stats.get(r.id)?.qty ?? 0,
      };
    });

    setReceptions(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchReceptions();
  }, [refreshKey]);

  const filtered = receptions.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.folio.toLowerCase().includes(q) ||
        r.po_folio.toLowerCase().includes(q) ||
        r.po_supplier.toLowerCase().includes(q) ||
        r.warehouse_code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts: Record<StatusFilter, number> = {
    all: receptions.length,
    in_progress: receptions.filter((r) => r.status === 'in_progress').length,
    completed: receptions.filter((r) => r.status === 'completed').length,
    discrepancy_open: receptions.filter((r) => r.status === 'discrepancy_open').length,
    reconciled: receptions.filter((r) => r.status === 'reconciled').length,
    cancelled: receptions.filter((r) => r.status === 'cancelled').length,
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Inbox size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Recepciones</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {receptions.length}
            </span>
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar folio, PO o proveedor..."
              className="w-full pl-8 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <button
            onClick={fetchReceptions}
            className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/40 transition-all flex-shrink-0"
            title="Refrescar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
          >
            <Plus size={14} />
            Nueva recepción
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'in_progress', 'completed', 'discrepancy_open', 'reconciled', 'cancelled'] as StatusFilter[]).map((s) => {
            const config = s === 'all' ? null : RECEPTION_STATUS_CONFIG[s];
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
          <p className="text-sm">Cargando recepciones...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <Package2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-2">
            {receptions.length === 0 ? 'Aún no hay recepciones registradas.' : 'Ninguna recepción coincide con los filtros.'}
          </p>
          {receptions.length === 0 && (
            <button
              onClick={onCreateNew}
              className="text-amber-400 text-xs underline hover:text-amber-300"
            >
              Registrar la primera
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {filtered.map((r) => {
            const config = RECEPTION_STATUS_CONFIG[r.status];
            const isSelected = selectedId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => onSelectReception(r)}
                className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors ${
                  isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                }`}
              >
                <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded flex-shrink-0">
                  {r.folio}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate flex items-center gap-2">
                    <span className="font-mono text-blue-400/70 text-[11px]">{r.po_folio}</span>
                    <span className="text-gray-500">·</span>
                    <span className="truncate">{r.po_supplier}</span>
                  </p>
                  <p className="text-gray-500 text-xs flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatShortDate(r.received_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={11} />
                      {r.warehouse_code}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package2 size={11} />
                      {r.line_count} {r.line_count === 1 ? 'línea' : 'líneas'} · {r.qty_total} u.
                    </span>
                  </p>
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
