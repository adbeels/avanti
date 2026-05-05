import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, RefreshCw, Search, Plus, Calendar, ChevronRight,
  Package2, Building2, ArrowUpDown, ArrowDown, ArrowUp, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface PickingList {
  id: string;
  folio: string;
  order_id: string;
  warehouse_id: string;
  assigned_to: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface PickingListWithJoins extends PickingList {
  order_folio: string;
  order_customer: string;
  order_channel: string | null;
  warehouse_id_resolved: string;
  warehouse_code: string;
  line_count: number;
  qty_total: number;
}

type StatusFilter = 'all' | PickingList['status'];

type SortKey = 'created_at' | 'folio' | 'customer' | 'order_folio' | 'lines' | 'qty';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'created_at',  label: 'Fecha de creación' },
  { value: 'folio',       label: 'Folio picking' },
  { value: 'order_folio', label: 'Folio pedido' },
  { value: 'customer',    label: 'Cliente' },
  { value: 'lines',       label: 'Cantidad de líneas' },
  { value: 'qty',         label: 'Cantidad total (u.)' },
];

export const PICKING_STATUS_CONFIG: Record<PickingList['status'], { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: 'Pendiente',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  in_progress: { label: 'En curso',   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  completed:   { label: 'Completada', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  cancelled:   { label: 'Cancelada',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface PickingListsTableProps {
  selectedId: string | null;
  onSelect: (p: PickingList | null) => void;
  onCreateNew: () => void;
  refreshKey?: number;
}

export default function PickingListsTable({ selectedId, onSelect, onCreateNew, refreshKey }: PickingListsTableProps) {
  const [pickings, setPickings] = useState<PickingListWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchData = async () => {
    setLoading(true);
    const { data: pData } = await supabase
      .from('picking_lists')
      .select('*, order:preorders(folio, legacy_order_number, order_number, name, sales_channel), warehouse:warehouses(code)')
      .order('created_at', { ascending: false });

    const { data: itemsData } = await supabase
      .from('picking_list_items')
      .select('picking_list_id, qty_requested');

    const stats = new Map<string, { count: number; qty: number }>();
    (itemsData || []).forEach((it) => {
      const cur = stats.get(it.picking_list_id) ?? { count: 0, qty: 0 };
      cur.count += 1;
      cur.qty += Number(it.qty_requested);
      stats.set(it.picking_list_id, cur);
    });

    const rows: PickingListWithJoins[] = (pData || []).map((p) => {
      const r = p as PickingList & {
        order?: { folio: string | null; legacy_order_number: string | null; order_number: string; name: string; sales_channel: string | null } | null;
        warehouse?: { code: string } | null;
      };
      return {
        ...r,
        order_folio: r.order?.folio || r.order?.legacy_order_number || r.order?.order_number || '—',
        order_customer: r.order?.name ?? '—',
        order_channel: r.order?.sales_channel ?? null,
        warehouse_id_resolved: r.warehouse_id,
        warehouse_code: r.warehouse?.code ?? '—',
        line_count: stats.get(p.id)?.count ?? 0,
        qty_total: stats.get(p.id)?.qty ?? 0,
      };
    });

    setPickings(rows);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [refreshKey]);

  // Listas únicas para los filtros
  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    pickings.forEach((p) => {
      if (p.warehouse_id_resolved && !map.has(p.warehouse_id_resolved)) {
        map.set(p.warehouse_id_resolved, p.warehouse_code);
      }
    });
    return Array.from(map, ([id, code]) => ({ id, code })).sort((a, b) => a.code.localeCompare(b.code));
  }, [pickings]);

  const channels = useMemo(() => {
    const set = new Set<string>();
    pickings.forEach((p) => { if (p.order_channel) set.add(p.order_channel); });
    return Array.from(set).sort();
  }, [pickings]);

  // Filtrado
  const filtered = useMemo(() => {
    return pickings.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (warehouseFilter !== 'all' && p.warehouse_id_resolved !== warehouseFilter) return false;
      if (channelFilter !== 'all' && (p.order_channel ?? '') !== channelFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.folio.toLowerCase().includes(q) ||
          p.order_folio.toLowerCase().includes(q) ||
          p.order_customer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pickings, statusFilter, warehouseFilter, channelFilter, search]);

  // Ordenamiento
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'folio':
          cmp = a.folio.localeCompare(b.folio);
          break;
        case 'order_folio':
          cmp = a.order_folio.localeCompare(b.order_folio);
          break;
        case 'customer':
          cmp = a.order_customer.localeCompare(b.order_customer);
          break;
        case 'lines':
          cmp = a.line_count - b.line_count;
          break;
        case 'qty':
          cmp = a.qty_total - b.qty_total;
          break;
      }
      return cmp * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const counts: Record<StatusFilter, number> = {
    all: pickings.length,
    pending: pickings.filter((p) => p.status === 'pending').length,
    in_progress: pickings.filter((p) => p.status === 'in_progress').length,
    completed: pickings.filter((p) => p.status === 'completed').length,
    cancelled: pickings.filter((p) => p.status === 'cancelled').length,
  };

  const activeFilters =
    (statusFilter !== 'all' ? 1 : 0) +
    (warehouseFilter !== 'all' ? 1 : 0) +
    (channelFilter !== 'all' ? 1 : 0) +
    (search ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setWarehouseFilter('all');
    setChannelFilter('all');
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ClipboardList size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Picking</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {pickings.length}
            </span>
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar folio, pedido o cliente..."
              className="w-full pl-8 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <button
            onClick={fetchData}
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
            Nueva picking
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as StatusFilter[]).map((s) => {
            const config = s === 'all' ? null : PICKING_STATUS_CONFIG[s];
            const isActive = statusFilter === s;
            const label = s === 'all' ? 'Todas' : config!.label;
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
                {label} <span className="opacity-60 ml-1">{counts[s]}</span>
              </button>
            );
          })}
        </div>

        {/* Fila 3: filtros adicionales + orden */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Almacén */}
          {warehouses.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Building2 size={12} className="text-gray-600" />
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="bg-black border border-gray-800 rounded-lg text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:border-amber-500/50 hover:border-gray-700 transition-colors"
              >
                <option value="all">Todos los almacenes</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.code}</option>
                ))}
              </select>
            </div>
          )}

          {/* Canal */}
          {channels.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Package2 size={12} className="text-gray-600" />
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-black border border-gray-800 rounded-lg text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:border-amber-500/50 hover:border-gray-700 transition-colors"
              >
                <option value="all">Todos los canales</option>
                {channels.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Limpiar filtros */}
          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-400 px-2 py-1.5 rounded-lg border border-transparent hover:border-amber-500/30 transition-all"
              title="Limpiar todos los filtros"
            >
              <X size={11} />
              Limpiar ({activeFilters})
            </button>
          )}

          {/* Ordenar por */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={12} className="text-gray-600" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-black border border-gray-800 rounded-lg text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:border-amber-500/50 hover:border-gray-700 transition-colors"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/40 transition-all"
              title={sortDir === 'asc' ? 'Ascendente (clic para cambiar)' : 'Descendente (clic para cambiar)'}
            >
              {sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            </button>
          </div>
        </div>

        {/* Resumen de resultados */}
        {(activeFilters > 0 || sorted.length !== pickings.length) && (
          <div className="text-[11px] text-gray-500">
            Mostrando <span className="text-amber-400 font-semibold">{sorted.length}</span> de {pickings.length}
            {sortKey !== 'created_at' || sortDir !== 'desc' ? (
              <span className="ml-2">
                · ordenado por <span className="text-gray-300">{SORT_OPTIONS.find((o) => o.value === sortKey)?.label}</span> ({sortDir === 'asc' ? 'asc' : 'desc'})
              </span>
            ) : null}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando pickings...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <Package2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-2">
            {pickings.length === 0 ? 'Aún no hay listas de picking.' : 'Ninguna lista coincide con los filtros.'}
          </p>
          {pickings.length === 0 ? (
            <button onClick={onCreateNew} className="text-amber-400 text-xs underline hover:text-amber-300">
              Crear la primera
            </button>
          ) : (
            <button onClick={clearFilters} className="text-amber-400 text-xs underline hover:text-amber-300">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {sorted.map((p) => {
            const config = PICKING_STATUS_CONFIG[p.status];
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors ${
                  isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                }`}
              >
                <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded flex-shrink-0">
                  {p.folio}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate flex items-center gap-2">
                    <span className="font-mono text-blue-400/70 text-[11px]">{p.order_folio}</span>
                    <span className="text-gray-500">·</span>
                    <span className="truncate">{p.order_customer}</span>
                  </p>
                  <p className="text-gray-500 text-xs flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatShortDate(p.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={11} />
                      {p.warehouse_code}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package2 size={11} />
                      {p.line_count} {p.line_count === 1 ? 'línea' : 'líneas'} · {p.qty_total} u.
                    </span>
                  </p>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex-shrink-0 ${config.color} ${config.bg} ${config.border}`}>
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
