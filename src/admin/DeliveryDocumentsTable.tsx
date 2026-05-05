import { useEffect, useState } from 'react';
import {
  FileSignature, RefreshCw, Search, Plus, Calendar, ChevronRight,
  Package2, Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface DeliveryDoc {
  id: string;
  folio: string;
  order_id: string;
  picking_list_id: string | null;
  warehouse_id: string;
  status: 'draft' | 'signed' | 'archived' | 'cancelled';
  signed_method: 'pickup' | 'courier' | 'wholesale' | null;
  receiver_name: string;
  signature_data_url: string | null;
  delivery_address: string;
  signed_at: string | null;
  archived_at: string | null;
  cancelled_at: string | null;
  notes: string;
  created_at: string;
}

export interface DeliveryDocWithJoins extends DeliveryDoc {
  order_folio: string;
  order_customer: string;
  warehouse_code: string;
  line_count: number;
  qty_total: number;
}

type StatusFilter = 'all' | DeliveryDoc['status'];

export const DELIVERY_DOC_STATUS_CONFIG: Record<DeliveryDoc['status'], { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Borrador',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  signed:    { label: 'Firmado',   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  archived:  { label: 'Archivado', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
};

export const SIGNED_METHOD_LABEL: Record<NonNullable<DeliveryDoc['signed_method']>, string> = {
  pickup:    'Retiro',
  courier:   'Mensajero',
  wholesale: 'Mayorista',
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface DeliveryDocumentsTableProps {
  selectedId: string | null;
  onSelect: (d: DeliveryDoc | null) => void;
  onCreateNew: () => void;
  refreshKey?: number;
}

export default function DeliveryDocumentsTable({ selectedId, onSelect, onCreateNew, refreshKey }: DeliveryDocumentsTableProps) {
  const [docs, setDocs] = useState<DeliveryDocWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchData = async () => {
    setLoading(true);
    const { data: dData } = await supabase
      .from('delivery_documents')
      .select('*, order:preorders(folio, legacy_order_number, order_number, name), warehouse:warehouses(code)')
      .order('created_at', { ascending: false });

    const { data: itemsData } = await supabase
      .from('delivery_document_items')
      .select('delivery_document_id, qty_delivered');

    const stats = new Map<string, { count: number; qty: number }>();
    (itemsData || []).forEach((it) => {
      const cur = stats.get(it.delivery_document_id) ?? { count: 0, qty: 0 };
      cur.count += 1;
      cur.qty += Number(it.qty_delivered);
      stats.set(it.delivery_document_id, cur);
    });

    const rows: DeliveryDocWithJoins[] = (dData || []).map((d) => {
      const r = d as DeliveryDoc & {
        order?: { folio: string | null; legacy_order_number: string | null; order_number: string; name: string } | null;
        warehouse?: { code: string } | null;
      };
      return {
        ...r,
        order_folio: r.order?.folio || r.order?.legacy_order_number || r.order?.order_number || '—',
        order_customer: r.order?.name ?? '—',
        warehouse_code: r.warehouse?.code ?? '—',
        line_count: stats.get(d.id)?.count ?? 0,
        qty_total: stats.get(d.id)?.qty ?? 0,
      };
    });

    setDocs(rows);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [refreshKey]);

  const filtered = docs.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.folio.toLowerCase().includes(q) ||
        d.order_folio.toLowerCase().includes(q) ||
        d.order_customer.toLowerCase().includes(q) ||
        d.receiver_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts: Record<StatusFilter, number> = {
    all: docs.length,
    draft: docs.filter((d) => d.status === 'draft').length,
    signed: docs.filter((d) => d.status === 'signed').length,
    archived: docs.filter((d) => d.status === 'archived').length,
    cancelled: docs.filter((d) => d.status === 'cancelled').length,
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <FileSignature size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Entregas firmadas</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {docs.length}
            </span>
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar folio, pedido, cliente o receptor..."
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
            Nueva entrega
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'draft', 'signed', 'archived', 'cancelled'] as StatusFilter[]).map((s) => {
            const config = s === 'all' ? null : DELIVERY_DOC_STATUS_CONFIG[s];
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
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando entregas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <Package2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-2">
            {docs.length === 0 ? 'Aún no hay documentos de entrega.' : 'Ninguna entrega coincide con los filtros.'}
          </p>
          {docs.length === 0 && (
            <button onClick={onCreateNew} className="text-amber-400 text-xs underline hover:text-amber-300">
              Generar la primera
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {filtered.map((d) => {
            const config = DELIVERY_DOC_STATUS_CONFIG[d.status];
            const isSelected = selectedId === d.id;
            return (
              <button
                key={d.id}
                onClick={() => onSelect(d)}
                className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors ${
                  isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                }`}
              >
                <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded flex-shrink-0">
                  {d.folio}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate flex items-center gap-2">
                    <span className="font-mono text-blue-400/70 text-[11px]">{d.order_folio}</span>
                    <span className="text-gray-500">·</span>
                    <span className="truncate">{d.order_customer}</span>
                  </p>
                  <p className="text-gray-500 text-xs flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatShortDate(d.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={11} />
                      {d.warehouse_code}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package2 size={11} />
                      {d.line_count} {d.line_count === 1 ? 'línea' : 'líneas'} · {d.qty_total} u.
                    </span>
                    {d.signed_method && (
                      <span className="text-gray-600">· {SIGNED_METHOD_LABEL[d.signed_method]}</span>
                    )}
                  </p>
                  {d.receiver_name && d.status === 'signed' && (
                    <p className="text-green-400/70 text-[11px] mt-0.5">Recibió: {d.receiver_name}</p>
                  )}
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
