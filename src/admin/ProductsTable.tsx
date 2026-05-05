import { useEffect, useState } from 'react';
import {
  Tag, Search, RefreshCw, Plus, Package, ChevronRight, EyeOff,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  unit_price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type ActiveFilter = 'all' | 'active' | 'inactive';

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

interface ProductsTableProps {
  selectedId: string | null;
  onSelect: (p: Product | null) => void;
  onCreateNew: () => void;
  refreshKey?: number;
}

export default function ProductsTable({ selectedId, onSelect, onCreateNew, refreshKey }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [refreshKey]);

  const filtered = products.filter((p) => {
    if (activeFilter === 'active' && !p.active) return false;
    if (activeFilter === 'inactive' && p.active) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: products.length,
    active: products.filter((p) => p.active).length,
    inactive: products.filter((p) => !p.active).length,
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Tag size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Catálogo</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {products.length}
            </span>
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar SKU, nombre o descripción..."
              className="w-full pl-8 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <button
            onClick={fetchProducts}
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
            Nuevo producto
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => {
            const isActive = activeFilter === f;
            const label = f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos';
            const color = f === 'inactive' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  isActive ? color : 'text-gray-500 bg-black border-gray-800 hover:border-gray-700'
                }`}
              >
                {label} <span className="opacity-60 ml-1">{counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-600">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando productos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-gray-600">
          <Package size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-2">
            {products.length === 0 ? 'Aún no hay productos en el catálogo.' : 'Ningún producto coincide con los filtros.'}
          </p>
          {products.length === 0 && (
            <button onClick={onCreateNew} className="text-amber-400 text-xs underline hover:text-amber-300">
              Crear el primero
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {filtered.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className={`w-full text-left px-5 py-3 flex items-center gap-4 transition-colors ${
                  isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                } ${!p.active ? 'opacity-50' : ''}`}
              >
                <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded flex-shrink-0">
                  {p.sku}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate flex items-center gap-2">
                    {p.name}
                    {!p.active && <EyeOff size={11} className="text-red-400 flex-shrink-0" />}
                  </p>
                  {p.description && <p className="text-gray-500 text-xs truncate">{p.description}</p>}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-green-400 font-bold text-sm">{formatMXN(Number(p.unit_price))}</p>
                  <p className="text-gray-600 text-[10px] uppercase tracking-wide">P. unit.</p>
                </div>

                <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-amber-400' : 'text-gray-700'}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
