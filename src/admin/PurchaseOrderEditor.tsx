import { useEffect, useState } from 'react';
import {
  Save, Trash2, Plus, X, Send, AlertCircle, CheckCircle2, Loader2,
  Package, ShoppingBag, FileText, Building2, Ban, ListPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PO_STATUS_CONFIG, type PurchaseOrder } from './PurchaseOrdersTable';

interface Product {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  active: boolean;
}

interface POItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  qty_ordered: number;
  unit_cost: number;
  notes: string;
  product?: Product;
}

type Mode = 'empty' | 'create' | 'edit';

interface PurchaseOrderEditorProps {
  selectedPO: PurchaseOrder | null;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSelectPO: (po: PurchaseOrder | null) => void;
  onChanged: () => void;
  isAdmin: boolean;
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function PurchaseOrderEditor({ selectedPO, mode, onModeChange, onSelectPO, onChanged, isAdmin }: PurchaseOrderEditorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<POItem[]>([]);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showNewProduct, setShowNewProduct] = useState(false);

  // Borrador local de líneas (modo create) o líneas reales (modo edit)
  const [draftLines, setDraftLines] = useState<{ tmpId: string; product_id: string; qty_ordered: number; unit_cost: number }[]>([]);
  const [newProduct, setNewProduct] = useState({ sku: '', name: '', unit_price: 0 });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && selectedPO) {
      setSupplier(selectedPO.supplier);
      setNotes(selectedPO.notes);
      fetchItems(selectedPO.id);
    } else if (mode === 'create') {
      setSupplier('');
      setNotes('');
      setDraftLines([]);
      setItems([]);
    }
    setStatus('idle');
    setMessage('');
  }, [mode, selectedPO?.id]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('active', true).order('name');
    setProducts((data as Product[]) || []);
  };

  const fetchItems = async (poId: string) => {
    const { data } = await supabase
      .from('po_items')
      .select('*, product:products(id, sku, name, unit_price, active)')
      .eq('purchase_order_id', poId);
    setItems((data as POItem[]) || []);
  };

  const showError = (msg: string) => { setStatus('error'); setMessage(msg); };
  const showSuccess = (msg: string) => {
    setStatus('success');
    setMessage(msg);
    setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
  };

  // ===== Crear PO nueva =====
  const addDraftLine = () => {
    if (products.length === 0) {
      showError('No hay productos en el catálogo. Crea uno primero.');
      return;
    }
    setDraftLines((prev) => [
      ...prev,
      { tmpId: crypto.randomUUID(), product_id: products[0].id, qty_ordered: 1, unit_cost: 0 },
    ]);
  };

  const updateDraftLine = (tmpId: string, patch: Partial<{ product_id: string; qty_ordered: number; unit_cost: number }>) => {
    setDraftLines((prev) => prev.map((l) => (l.tmpId === tmpId ? { ...l, ...patch } : l)));
  };

  const removeDraftLine = (tmpId: string) => {
    setDraftLines((prev) => prev.filter((l) => l.tmpId !== tmpId));
  };

  const handleCreate = async () => {
    if (!supplier.trim()) return showError('El proveedor es obligatorio.');
    if (draftLines.length === 0) return showError('Debe haber al menos una línea.');
    for (const l of draftLines) {
      if (!l.product_id) return showError('Hay líneas sin producto.');
      if (l.qty_ordered <= 0) return showError('Las cantidades deben ser > 0.');
    }
    // Validar productos duplicados (constraint UNIQUE en BD igualmente lo evita)
    const seen = new Set<string>();
    for (const l of draftLines) {
      if (seen.has(l.product_id)) return showError('No puedes tener el mismo producto en dos líneas.');
      seen.add(l.product_id);
    }

    setStatus('loading');
    setMessage('');

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({ supplier: supplier.trim(), notes: notes.trim() })
      .select()
      .single();

    if (poErr || !po) {
      return showError(poErr?.message ?? 'No se pudo crear la PO.');
    }

    const itemsPayload = draftLines.map((l) => ({
      purchase_order_id: po.id,
      product_id: l.product_id,
      qty_ordered: l.qty_ordered,
      unit_cost: l.unit_cost,
    }));

    const { error: itemsErr } = await supabase.from('po_items').insert(itemsPayload);

    if (itemsErr) {
      // Si fallan las líneas, intentar borrar la PO huérfana
      await supabase.from('purchase_orders').delete().eq('id', po.id);
      return showError(`Error en líneas: ${itemsErr.message}`);
    }

    showSuccess(`PO ${po.folio} creada con ${itemsPayload.length} líneas.`);
    onChanged();
    onSelectPO(po as PurchaseOrder);
    onModeChange('edit');
  };

  // ===== Operaciones sobre PO existente =====
  const handleAddItem = async () => {
    if (!selectedPO) return;
    if (products.length === 0) return showError('No hay productos en el catálogo.');
    const usedProductIds = new Set(items.map((i) => i.product_id));
    const candidate = products.find((p) => !usedProductIds.has(p.id));
    if (!candidate) return showError('Todos los productos ya están en esta PO.');

    setStatus('loading');
    const { error } = await supabase.from('po_items').insert({
      purchase_order_id: selectedPO.id,
      product_id: candidate.id,
      qty_ordered: 1,
      unit_cost: 0,
    });
    if (error) return showError(error.message);
    await fetchItems(selectedPO.id);
    setStatus('idle');
  };

  const handleUpdateItem = async (itemId: string, patch: Partial<POItem>) => {
    const { error } = await supabase.from('po_items').update(patch).eq('id', itemId);
    if (error) return showError(error.message);
    if (selectedPO) await fetchItems(selectedPO.id);
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase.from('po_items').delete().eq('id', itemId);
    if (error) return showError(error.message);
    if (selectedPO) await fetchItems(selectedPO.id);
  };

  const handleSaveHeader = async () => {
    if (!selectedPO) return;
    if (!supplier.trim()) return showError('El proveedor no puede estar vacío.');
    setStatus('loading');
    const { error } = await supabase
      .from('purchase_orders')
      .update({ supplier: supplier.trim(), notes: notes.trim() })
      .eq('id', selectedPO.id);
    if (error) return showError(error.message);
    showSuccess('Cabecera actualizada.');
    onChanged();
  };

  const handleMarkSent = async () => {
    if (!selectedPO) return;
    if (items.length === 0) return showError('Agrega al menos una línea antes de enviar.');
    setStatus('loading');
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', selectedPO.id);
    if (error) return showError(error.message);
    showSuccess(`${selectedPO.folio} marcada como enviada.`);
    onChanged();
    onSelectPO({ ...selectedPO, status: 'sent', sent_at: new Date().toISOString() });
  };

  const handleCancel = async () => {
    if (!selectedPO) return;
    if (!confirm(`¿Cancelar la PO ${selectedPO.folio}? Esta acción no se puede deshacer.`)) return;
    setStatus('loading');
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', selectedPO.id);
    if (error) return showError(error.message);
    showSuccess(`${selectedPO.folio} cancelada.`);
    onChanged();
    onSelectPO({ ...selectedPO, status: 'cancelled', cancelled_at: new Date().toISOString() });
  };

  const handleClose = async () => {
    if (!selectedPO) return;
    if (!confirm(`¿Cerrar la PO ${selectedPO.folio}? Esto indica factura validada y proceso terminado.`)) return;
    setStatus('loading');
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', selectedPO.id);
    if (error) return showError(error.message);
    showSuccess(`${selectedPO.folio} cerrada.`);
    onChanged();
    onSelectPO({ ...selectedPO, status: 'closed', closed_at: new Date().toISOString() });
  };

  // ===== Crear producto inline =====
  const handleCreateProduct = async () => {
    if (!newProduct.sku.trim() || !newProduct.name.trim()) return showError('SKU y nombre son obligatorios.');
    setStatus('loading');
    const { error } = await supabase.from('products').insert({
      sku: newProduct.sku.trim().toUpperCase(),
      name: newProduct.name.trim(),
      unit_price: newProduct.unit_price,
    });
    if (error) return showError(error.message);
    await fetchProducts();
    setNewProduct({ sku: '', name: '', unit_price: 0 });
    setShowNewProduct(false);
    setStatus('idle');
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!isAdmin) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-white text-sm font-semibold mb-1">Solo administración</p>
          <p className="text-gray-500 text-xs">Las órdenes de compra solo las gestiona el rol <strong className="text-amber-400">admin</strong>.</p>
        </div>
      </div>
    );
  }

  // EMPTY STATE
  if (mode === 'empty') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <ShoppingBag size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Editor de orden de compra</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Package size={40} className="mb-3 opacity-20" />
            <p className="text-sm text-center mb-3">Selecciona una PO de la lista o crea una nueva</p>
            <button
              onClick={() => onModeChange('create')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg text-xs font-semibold transition-all"
            >
              <Plus size={14} />
              Nueva PO
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Header común con feedback =====
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

  const renderProductCreator = () => (
    showNewProduct && (
      <div className="bg-black border border-amber-800/40 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-amber-400 text-xs font-semibold uppercase tracking-wide">Nuevo producto</span>
          <button onClick={() => setShowNewProduct(false)} className="text-gray-600 hover:text-gray-400">
            <X size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={newProduct.sku}
            onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
            placeholder="SKU"
            className="px-3 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 font-mono uppercase"
          />
          <input
            type="number"
            value={newProduct.unit_price}
            onChange={(e) => setNewProduct((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
            placeholder="Precio unitario"
            min="0"
            step="0.01"
            className="px-3 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <input
          type="text"
          value={newProduct.name}
          onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
          placeholder="Nombre del producto"
          className="w-full px-3 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
        />
        <button
          onClick={handleCreateProduct}
          className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-400 py-1.5 rounded text-xs font-semibold hover:bg-amber-500/20"
        >
          Crear producto
        </button>
      </div>
    )
  );

  // ============================================================
  // CREATE MODE
  // ============================================================
  if (mode === 'create') {
    const total = draftLines.reduce((sum, l) => sum + l.qty_ordered * l.unit_cost, 0);
    const productById = new Map(products.map((p) => [p.id, p]));

    return (
      <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-amber-400" />
            <span className="text-white font-semibold">Nueva orden de compra</span>
          </div>
          <button
            onClick={() => onModeChange('empty')}
            className="text-gray-500 hover:text-gray-300"
            title="Cancelar creación"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <Building2 size={11} /> Proveedor
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Ej. Panini Mexico"
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <FileText size={11} /> Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Referencia, condiciones, etc."
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Líneas</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowNewProduct(!showNewProduct)}
                  className="flex items-center gap-1 text-gray-500 hover:text-amber-400 text-xs"
                  title="Crear nuevo producto"
                >
                  <ListPlus size={12} /> Producto
                </button>
                <button
                  onClick={addDraftLine}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded text-xs"
                >
                  <Plus size={12} /> Línea
                </button>
              </div>
            </div>

            {renderProductCreator()}

            {draftLines.length === 0 ? (
              <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
                Sin líneas. Click <strong className="text-amber-400">+ Línea</strong> para agregar.
              </div>
            ) : (
              <div className="space-y-2">
                {draftLines.map((l) => {
                  const prod = productById.get(l.product_id);
                  return (
                    <div key={l.tmpId} className="bg-black border border-gray-800 rounded-lg p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={l.product_id}
                          onChange={(e) => updateDraftLine(l.tmpId, { product_id: e.target.value })}
                          className="flex-1 px-2 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeDraftLine(l.tmpId)}
                          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                          title="Eliminar línea"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-600 uppercase tracking-wide">Cantidad</label>
                          <input
                            type="number"
                            value={l.qty_ordered}
                            onChange={(e) => updateDraftLine(l.tmpId, { qty_ordered: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="1"
                            className="w-full px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-600 uppercase tracking-wide">Costo unit.</label>
                          <input
                            type="number"
                            value={l.unit_cost}
                            onChange={(e) => updateDraftLine(l.tmpId, { unit_cost: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-600 uppercase tracking-wide">Subtotal</label>
                          <p className="px-2 py-1 text-green-400 font-mono text-xs font-semibold">
                            {formatMXN(l.qty_ordered * l.unit_cost)}
                          </p>
                        </div>
                      </div>
                      {prod && (
                        <p className="text-gray-600 text-[10px] italic">{prod.name}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {draftLines.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-black/40 border border-gray-800 rounded-lg">
              <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Total estimado</span>
              <span className="text-green-400 font-bold text-lg">{formatMXN(total)}</span>
            </div>
          )}

          {renderFeedback()}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={status === 'loading' || draftLines.length === 0 || !supplier.trim()}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Crear PO en borrador
            </button>
            <button
              onClick={() => onModeChange('empty')}
              className="px-4 py-2.5 bg-black border border-gray-800 rounded-lg text-gray-400 text-sm hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // EDIT MODE
  // ============================================================
  if (!selectedPO) return null;

  const config = PO_STATUS_CONFIG[selectedPO.status];
  const isDraft = selectedPO.status === 'draft';
  const isSent = selectedPO.status === 'sent';
  const isReceived = selectedPO.status === 'received';
  const isTerminal = selectedPO.status === 'closed' || selectedPO.status === 'cancelled';
  const total = items.reduce((sum, i) => sum + Number(i.qty_ordered) * Number(i.unit_cost), 0);

  const usedProductIds = new Set(items.map((i) => i.product_id));
  const availableProducts = products.filter((p) => !usedProductIds.has(p.id));

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
        <div className="flex items-center gap-3 min-w-0">
          <ShoppingBag size={18} className="text-amber-400 flex-shrink-0" />
          <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded">
            {selectedPO.folio}
          </span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${config.color} ${config.bg} ${config.border}`}>
          {config.label}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Header editable */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <Building2 size={11} /> Proveedor
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              disabled={isTerminal}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
              <FileText size={11} /> Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isTerminal}
              rows={2}
              className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none disabled:opacity-50"
            />
          </div>
          {!isTerminal && (
            <button
              onClick={handleSaveHeader}
              disabled={status === 'loading' || (supplier === selectedPO.supplier && notes === selectedPO.notes)}
              className="w-full bg-black border border-gray-800 hover:border-amber-500/40 text-gray-400 hover:text-amber-400 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Save size={11} />
              Guardar cabecera
            </button>
          )}
        </div>

        {/* Líneas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
              Líneas ({items.length})
            </span>
            {isDraft && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowNewProduct(!showNewProduct)}
                  className="flex items-center gap-1 text-gray-500 hover:text-amber-400 text-xs"
                  title="Crear nuevo producto"
                >
                  <ListPlus size={12} /> Producto
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={availableProducts.length === 0 || status === 'loading'}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  title={availableProducts.length === 0 ? 'No hay más productos disponibles' : 'Agregar línea'}
                >
                  <Plus size={12} /> Línea
                </button>
              </div>
            )}
          </div>

          {isDraft && renderProductCreator()}

          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
              Sin líneas todavía.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="bg-black border border-gray-800 rounded-lg p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    {isDraft ? (
                      <select
                        value={item.product_id}
                        onChange={(e) => handleUpdateItem(item.id, { product_id: e.target.value })}
                        className="flex-1 px-2 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                      >
                        {products
                          .filter((p) => p.id === item.product_id || !usedProductIds.has(p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                          ))}
                      </select>
                    ) : (
                      <div className="flex-1 px-2 py-1.5 text-white text-xs">
                        <span className="font-mono text-amber-400/70">{item.product?.sku}</span>
                        <span className="text-gray-500"> — {item.product?.name}</span>
                      </div>
                    )}
                    {isDraft && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                        title="Eliminar línea"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-600 uppercase tracking-wide">Cantidad</label>
                      <input
                        type="number"
                        value={Number(item.qty_ordered)}
                        onChange={(e) => handleUpdateItem(item.id, { qty_ordered: parseFloat(e.target.value) || 0 })}
                        disabled={!isDraft}
                        min="0"
                        step="1"
                        className="w-full px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600 uppercase tracking-wide">Costo unit.</label>
                      <input
                        type="number"
                        value={Number(item.unit_cost)}
                        onChange={(e) => handleUpdateItem(item.id, { unit_cost: parseFloat(e.target.value) || 0 })}
                        disabled={!isDraft}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600 uppercase tracking-wide">Subtotal</label>
                      <p className="px-2 py-1 text-green-400 font-mono text-xs font-semibold">
                        {formatMXN(Number(item.qty_ordered) * Number(item.unit_cost))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-black/40 border border-gray-800 rounded-lg">
            <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Total estimado</span>
            <span className="text-green-400 font-bold text-lg">{formatMXN(total)}</span>
          </div>
        )}

        {renderFeedback()}

        {/* Acciones de transición */}
        <div className="flex flex-col gap-2">
          {isDraft && (
            <>
              <button
                onClick={handleMarkSent}
                disabled={status === 'loading' || items.length === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send size={14} />
                Marcar como enviada
              </button>
              <button
                onClick={handleCancel}
                disabled={status === 'loading'}
                className="w-full bg-black border border-red-900/40 text-red-400 hover:bg-red-950/30 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Ban size={12} />
                Cancelar PO
              </button>
            </>
          )}

          {isSent && (
            <>
              <div className="flex items-start gap-2 p-3 bg-blue-950/20 border border-blue-800/30 rounded-lg text-xs text-blue-300">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p>Esperando recepción del producto. El almacenista debe registrarla desde la pestaña <strong>Recepciones</strong> (en construcción).</p>
              </div>
              <button
                onClick={handleCancel}
                disabled={status === 'loading'}
                className="w-full bg-black border border-red-900/40 text-red-400 hover:bg-red-950/30 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Ban size={12} />
                Cancelar PO
              </button>
            </>
          )}

          {isReceived && (
            <button
              onClick={handleClose}
              disabled={status === 'loading'}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={14} />
              Cerrar PO (factura validada)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
