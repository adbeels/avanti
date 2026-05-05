import { useEffect, useState } from 'react';
import {
  Tag, X, Save, AlertCircle, CheckCircle2, Loader2, Package, Eye, EyeOff,
  DollarSign, FileText, Hash,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from './ProductsTable';

type Mode = 'empty' | 'create' | 'edit';

interface ProductEditorProps {
  selected: Product | null;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onSelect: (p: Product | null) => void;
  onChanged: () => void;
  isAdmin: boolean;
}

export default function ProductEditor({ selected, mode, onModeChange, onSelect, onChanged, isAdmin }: ProductEditorProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (mode === 'edit' && selected) {
      setSku(selected.sku);
      setName(selected.name);
      setDescription(selected.description || '');
      setUnitPrice(Number(selected.unit_price));
      setActive(selected.active);
    } else if (mode === 'create') {
      setSku('');
      setName('');
      setDescription('');
      setUnitPrice(0);
      setActive(true);
    }
    setStatus('idle');
    setMessage('');
  }, [mode, selected?.id]);

  const showError = (msg: string) => { setStatus('error'); setMessage(msg); };
  const showSuccess = (msg: string) => {
    setStatus('success');
    setMessage(msg);
    setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
  };

  const validate = (): string | null => {
    if (!sku.trim()) return 'El SKU es obligatorio.';
    if (!name.trim()) return 'El nombre es obligatorio.';
    if (unitPrice < 0) return 'El precio no puede ser negativo.';
    if (!/^[A-Z0-9-]+$/.test(sku.trim())) return 'El SKU solo acepta mayúsculas, números y guiones.';
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) return showError(err);

    setStatus('loading');
    const { data, error } = await supabase
      .from('products')
      .insert({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        unit_price: unitPrice,
        active: true,
      })
      .select()
      .single();

    if (error) {
      const msg = error.code === '23505' ? `Ya existe un producto con SKU "${sku.trim().toUpperCase()}".` : error.message;
      return showError(msg);
    }

    showSuccess(`Producto "${data.sku}" creado.`);
    onChanged();
    onSelect(data as Product);
    onModeChange('edit');
  };

  const handleSave = async () => {
    if (!selected) return;
    const err = validate();
    if (err) return showError(err);

    setStatus('loading');
    const { error } = await supabase
      .from('products')
      .update({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        unit_price: unitPrice,
      })
      .eq('id', selected.id);

    if (error) {
      const msg = error.code === '23505' ? `Ya existe otro producto con SKU "${sku.trim().toUpperCase()}".` : error.message;
      return showError(msg);
    }
    showSuccess('Cambios guardados.');
    onChanged();
  };

  const handleToggleActive = async () => {
    if (!selected) return;
    const next = !selected.active;
    if (!next) {
      if (!confirm(`Desactivar "${selected.name}"? No se podrá usar en POs nuevas, pero los registros históricos se conservan.`)) return;
    }
    setStatus('loading');
    const { error } = await supabase
      .from('products')
      .update({ active: next })
      .eq('id', selected.id);
    if (error) return showError(error.message);
    setActive(next);
    showSuccess(next ? 'Producto reactivado.' : 'Producto desactivado.');
    onChanged();
  };

  if (!isAdmin && (mode === 'create' || mode === 'edit')) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-white text-sm font-semibold mb-1">Solo administración</p>
          <p className="text-gray-500 text-xs">El catálogo de productos lo gestiona el rol <strong className="text-amber-400">admin</strong>.</p>
        </div>
      </div>
    );
  }

  if (mode === 'empty') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <Tag size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Editor de producto</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Package size={40} className="mb-3 opacity-20" />
            <p className="text-sm text-center mb-3">Selecciona un producto de la lista o crea uno nuevo</p>
            {isAdmin && (
              <button
                onClick={() => onModeChange('create')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all"
              >
                <Tag size={14} />
                Nuevo producto
              </button>
            )}
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

  const isCreate = mode === 'create';
  const dirty = selected && (
    sku.trim().toUpperCase() !== selected.sku ||
    name.trim() !== selected.name ||
    description.trim() !== (selected.description || '') ||
    unitPrice !== Number(selected.unit_price)
  );

  return (
    <div className={`bg-gray-950 border rounded-2xl overflow-hidden ${active ? 'border-amber-800/30' : 'border-red-800/30'}`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${active ? 'border-amber-800/30 bg-amber-950/20' : 'border-red-800/30 bg-red-950/20'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Tag size={18} className={active ? 'text-amber-400' : 'text-red-400'} />
          <span className="text-white font-semibold">
            {isCreate ? 'Nuevo producto' : selected?.sku}
          </span>
          {!isCreate && !active && (
            <span className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
              Inactivo
            </span>
          )}
        </div>
        <button
          onClick={() => isCreate ? onModeChange('empty') : onSelect(null)}
          className="text-gray-500 hover:text-gray-300"
          title={isCreate ? 'Cancelar' : 'Cerrar'}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <Hash size={11} /> SKU <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            placeholder="EJ. PANINI-ALBUM-2026"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm font-mono uppercase placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
          <p className="text-[10px] text-gray-600 mt-1">Solo mayúsculas, números y guiones. Único en todo el catálogo.</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <Tag size={11} /> Nombre <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre comercial"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <FileText size={11} /> Descripción (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Detalle del producto, presentación, etc."
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
            <DollarSign size={11} /> Precio unitario (MXN)
          </label>
          <input
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
          />
          <p className="text-[10px] text-gray-600 mt-1">Precio sugerido de venta. El costo se captura por línea de PO.</p>
        </div>

        {renderFeedback()}

        {isCreate ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={status === 'loading' || !sku.trim() || !name.trim()}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Crear producto
            </button>
            <button
              onClick={() => onModeChange('empty')}
              className="px-4 py-2.5 bg-black border border-gray-800 rounded-lg text-gray-400 text-sm hover:text-white"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={status === 'loading' || !dirty}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar cambios
            </button>
            <button
              onClick={handleToggleActive}
              disabled={status === 'loading'}
              className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                active
                  ? 'bg-black border border-red-900/40 text-red-400 hover:bg-red-950/30'
                  : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
              }`}
            >
              {active ? <><EyeOff size={12} /> Desactivar</> : <><Eye size={12} /> Reactivar</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
