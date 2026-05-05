import { useEffect, useState } from 'react';
import {
  History, Search, RefreshCw, ChevronRight, User as UserIcon,
  Plus as PlusIcon, Pencil, Trash2, ArrowDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface AuditEntry {
  id: number;
  created_at: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_fields: string[] | null;
  before_jsonb: Record<string, unknown> | null;
  after_jsonb: Record<string, unknown> | null;
  user_full_name?: string | null;
}

type ActionFilter = 'all' | 'INSERT' | 'UPDATE' | 'DELETE';

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  preorders:                'Pedidos',
  order_items:              'Líneas de pedido',
  order_payments:           'Pagos',
  purchase_orders:          'Compras (PO)',
  po_items:                 'Líneas de PO',
  receptions:               'Recepciones',
  reception_items:          'Líneas de recepción',
  picking_lists:            'Pickings',
  picking_list_items:       'Líneas de picking',
  delivery_documents:       'Entregas',
  delivery_document_items:  'Líneas de entrega',
  products:                 'Productos',
  warehouses:               'Almacenes',
  user_profiles:            'Usuarios',
  stock_levels:             'Stock',
};

const ACTION_CONFIG: Record<AuditEntry['action'], { label: string; color: string; bg: string; border: string; icon: typeof PlusIcon }> = {
  INSERT: { label: 'Creado',    color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  icon: PlusIcon },
  UPDATE: { label: 'Modificado', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: Pencil },
  DELETE: { label: 'Eliminado', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: Trash2 },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function shortId(id: string) {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

interface AuditLogTableProps {
  selectedId: number | null;
  onSelect: (e: AuditEntry | null) => void;
}

const PAGE_SIZE = 100;

export default function AuditLogTable({ selectedId, onSelect }: AuditLogTableProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [offset, setOffset] = useState(0);

  const fetchUsers = async () => {
    const { data } = await supabase.from('user_profiles').select('user_id, full_name');
    const m = new Map<string, string>();
    (data || []).forEach((u) => m.set(u.user_id, u.full_name || u.user_id));
    setUserMap(m);
  };

  const fetchEntries = async (resetOffset = false) => {
    setLoading(true);
    const off = resetOffset ? 0 : offset;
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(off, off + PAGE_SIZE - 1);

    if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
    if (actionFilter !== 'all') query = query.eq('action', actionFilter);
    if (userFilter !== 'all') query = query.eq('user_id', userFilter);

    const { data } = await query;
    const rows = (data as AuditEntry[]) || [];
    if (resetOffset) {
      setEntries(rows);
      setOffset(rows.length);
    } else {
      setEntries((prev) => off === 0 ? rows : [...prev, ...rows]);
      setOffset(off + rows.length);
    }
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset cuando cambian filtros
  useEffect(() => {
    setOffset(0);
    fetchEntries(true);
  }, [entityFilter, actionFilter, userFilter]);

  // Filtro client-side por search (busca en entity_id o changed_fields)
  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (e.entity_id.toLowerCase().includes(q)) return true;
    if (e.changed_fields?.some((f) => f.toLowerCase().includes(q))) return true;
    return false;
  });

  const distinctEntityTypes = Array.from(new Set(entries.map((e) => e.entity_type))).sort();
  const distinctUsers = Array.from(new Set(entries.map((e) => e.user_id).filter(Boolean) as string[]));

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <History size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Auditoría</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {filtered.length}
            </span>
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID o nombre de campo..."
              className="w-full pl-8 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <button
            onClick={() => { setOffset(0); fetchEntries(true); }}
            className="p-2 bg-black border border-gray-800 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/40 transition-all flex-shrink-0"
            title="Refrescar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wide mb-1 block">Entidad</label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">Todas</option>
              {distinctEntityTypes.map((et) => (
                <option key={et} value={et}>{ENTITY_TYPE_LABELS[et] ?? et}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wide mb-1 block">Acción</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
              className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">Todas</option>
              <option value="INSERT">Creado</option>
              <option value="UPDATE">Modificado</option>
              <option value="DELETE">Eliminado</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] text-gray-600 uppercase tracking-wide mb-1 block">Usuario</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">Todos</option>
              {distinctUsers.map((u) => (
                <option key={u} value={u}>{userMap.get(u) ?? shortId(u)}</option>
              ))}
              <option value="">Sistema (sin usuario)</option>
            </select>
          </div>
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando bitácora...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <History size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Ningún registro coincide con los filtros.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-900">
            {filtered.map((e) => {
              const ac = ACTION_CONFIG[e.action];
              const ActionIcon = ac.icon;
              const isSelected = selectedId === e.id;
              const userLabel = e.user_id ? (userMap.get(e.user_id) ?? shortId(e.user_id)) : 'Sistema';
              const entityLabel = ENTITY_TYPE_LABELS[e.entity_type] ?? e.entity_type;
              const summary = e.action === 'UPDATE' && e.changed_fields
                ? `${e.changed_fields.length} ${e.changed_fields.length === 1 ? 'campo' : 'campos'}: ${e.changed_fields.slice(0, 4).join(', ')}${e.changed_fields.length > 4 ? '…' : ''}`
                : e.action === 'INSERT'
                  ? 'Nuevo registro'
                  : 'Registro eliminado';

              return (
                <button
                  key={e.id}
                  onClick={() => onSelect(e)}
                  className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors ${
                    isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                  }`}
                >
                  <span className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center ${ac.color} ${ac.bg} ${ac.border}`}>
                    <ActionIcon size={13} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ac.color} ${ac.bg} border ${ac.border}`}>
                        {ac.label}
                      </span>
                      <span className="text-amber-400/80 font-medium">{entityLabel}</span>
                      <span className="font-mono text-gray-500 text-[10px]">{shortId(e.entity_id)}</span>
                    </div>
                    <p className="text-gray-400 text-xs truncate">{summary}</p>
                    <p className="text-gray-600 text-[10px] mt-0.5 flex items-center gap-1.5">
                      <UserIcon size={10} /> {userLabel}
                      <span className="text-gray-700">·</span>
                      <span>{formatDateTime(e.created_at)}</span>
                    </p>
                  </div>
                  <ChevronRight size={14} className={`flex-shrink-0 mt-1 transition-colors ${isSelected ? 'text-amber-400' : 'text-gray-700'}`} />
                </button>
              );
            })}
          </div>
          {hasMore && (
            <button
              onClick={() => fetchEntries()}
              disabled={loading}
              className="w-full py-3 text-xs text-gray-500 hover:text-amber-400 border-t border-gray-900 hover:bg-gray-900/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <ArrowDown size={13} />}
              Cargar más ({PAGE_SIZE})
            </button>
          )}
        </>
      )}
    </div>
  );
}
