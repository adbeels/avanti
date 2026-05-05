import { useEffect, useState } from 'react';
import {
  Boxes, Search, RefreshCw, Building2, Package,
  AlertCircle, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface StockRow {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  on_hand: number;
  reserved: number;
  available: number;
  updated_at: string;
}

interface Warehouse { id: string; code: string; name: string }

interface StockTableProps {
  selectedKey: string | null; // `${product_id}:${warehouse_id}` | null
  onSelectRow: (row: StockRow | null) => void;
  refreshKey?: number;
}

export default function StockTable({ selectedKey, onSelectRow, refreshKey }: StockTableProps) {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [onlyWithStock, setOnlyWithStock] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [stockRes, whRes] = await Promise.all([
      supabase
        .from('stock_levels')
        .select('*, product:products(sku, name), warehouse:warehouses(code, name)')
        .order('updated_at', { ascending: false }),
      supabase.from('warehouses').select('id, code, name').eq('active', true).order('name'),
    ]);

    setWarehouses((whRes.data as Warehouse[]) || []);

    const enriched: StockRow[] = (stockRes.data || []).map((r) => {
      const row = r as {
        id: string;
        product_id: string;
        warehouse_id: string;
        on_hand: number;
        reserved: number;
        available: number;
        updated_at: string;
        product?: { sku: string; name: string } | null;
        warehouse?: { code: string; name: string } | null;
      };
      return {
        id: row.id,
        product_id: row.product_id,
        product_sku: row.product?.sku ?? '—',
        product_name: row.product?.name ?? '—',
        warehouse_id: row.warehouse_id,
        warehouse_code: row.warehouse?.code ?? '—',
        warehouse_name: row.warehouse?.name ?? '',
        on_hand: Number(row.on_hand),
        reserved: Number(row.reserved),
        available: Number(row.available),
        updated_at: row.updated_at,
      };
    });

    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const filtered = rows.filter((r) => {
    if (warehouseFilter !== 'all' && r.warehouse_id !== warehouseFilter) return false;
    if (onlyWithStock && r.on_hand <= 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.product_sku.toLowerCase().includes(q) || r.product_name.toLowerCase().includes(q);
    }
    return true;
  });

  // Totales
  const totals = filtered.reduce(
    (acc, r) => ({
      on_hand: acc.on_hand + r.on_hand,
      reserved: acc.reserved + r.reserved,
      available: acc.available + r.available,
    }),
    { on_hand: 0, reserved: 0, available: 0 }
  );

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Boxes size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Stock</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {rows.length}
            </span>
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por SKU o nombre..."
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-600 self-center mr-1">Almac&eacute;n:</span>
          <button
            onClick={() => setWarehouseFilter('all')}
            className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
              warehouseFilter === 'all'
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : 'text-gray-500 bg-black border-gray-800 hover:border-gray-700'
            }`}
          >
            Todos
          </button>
          {warehouses.map((w) => (
            <button
              key={w.id}
              onClick={() => setWarehouseFilter(w.id)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                warehouseFilter === w.id
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  : 'text-gray-500 bg-black border-gray-800 hover:border-gray-700'
              }`}
            >
              {w.code}
            </button>
          ))}
          <span className="ml-auto" />
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyWithStock}
              onChange={(e) => setOnlyWithStock(e.target.checked)}
              className="accent-amber-500"
            />
            Solo con stock
          </label>
        </div>

        {/* Totales bar */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800/50">
          <div className="bg-black/40 border border-gray-800 rounded-lg p-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">En existencia</p>
            <p className="text-white font-bold text-sm">{totals.on_hand.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-black/40 border border-gray-800 rounded-lg p-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">Reservado</p>
            <p className="text-amber-400 font-bold text-sm">{totals.reserved.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-black/40 border border-gray-800 rounded-lg p-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">Disponible</p>
            <p className="text-green-400 font-bold text-sm">{totals.available.toLocaleString('es-MX')}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando inventario...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <Package size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {rows.length === 0
              ? 'Aún no hay stock cargado. Carga la primera recepción para que el sistema lo registre.'
              : 'Ningún registro coincide con los filtros.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          <div className="hidden md:grid grid-cols-[1fr_120px_80px_80px_80px_20px] gap-3 px-5 py-2 bg-gray-950 border-b border-gray-800 text-[10px] text-gray-600 uppercase tracking-wide font-semibold">
            <span>Producto</span>
            <span>Almacén</span>
            <span className="text-right">En exist.</span>
            <span className="text-right">Reservado</span>
            <span className="text-right">Disponible</span>
            <span></span>
          </div>
          {filtered.map((r) => {
            const key = `${r.product_id}:${r.warehouse_id}`;
            const isSelected = selectedKey === key;
            const lowStock = r.available <= 0 && r.on_hand > 0; // todo reservado
            const empty = r.on_hand === 0;
            return (
              <button
                key={r.id}
                onClick={() => onSelectRow(isSelected ? null : r)}
                className={`w-full text-left px-5 py-3 grid grid-cols-[1fr_120px_80px_80px_80px_20px] gap-3 items-center transition-colors ${
                  isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-white text-xs flex items-center gap-2">
                    <span className="font-mono text-amber-400/70">{r.product_sku}</span>
                  </p>
                  <p className="text-gray-500 text-[11px] truncate">{r.product_name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 size={11} className="text-gray-600 flex-shrink-0" />
                  <span className="text-gray-400 text-xs font-mono">{r.warehouse_code}</span>
                </div>
                <span className={`text-xs font-mono font-semibold text-right ${empty ? 'text-gray-600' : 'text-white'}`}>
                  {r.on_hand.toLocaleString('es-MX')}
                </span>
                <span className={`text-xs font-mono font-semibold text-right ${r.reserved > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                  {r.reserved.toLocaleString('es-MX')}
                </span>
                <span className={`text-xs font-mono font-bold text-right ${
                  empty ? 'text-gray-600' : lowStock ? 'text-orange-400' : 'text-green-400'
                }`}>
                  {r.available.toLocaleString('es-MX')}
                </span>
                <div className="flex justify-end">
                  {lowStock && <AlertCircle size={11} className="text-orange-400" />}
                  {!lowStock && <ChevronRight size={12} className={isSelected ? 'text-amber-400' : 'text-gray-700'} />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
