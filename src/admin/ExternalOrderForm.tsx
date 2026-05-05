import { useEffect, useState } from 'react';
import {
  X, Save, Loader2, AlertCircle, CheckCircle2, Plus, Trash2,
  User, Mail, Phone, Building2, MapPin, FileText, Tag, ShoppingBag,
  CreditCard, Calendar, Hash, Boxes,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SALES_CHANNEL_CONFIG, type SalesChannel } from './PreordersTable';

interface Product { id: string; sku: string; name: string; unit_price: number; active: boolean }
interface Warehouse { id: string; code: string; name: string }

interface DraftLine {
  tmpId: string;
  product_id: string;
  qty: number;
  unit_price: number;
}

interface ExternalOrderFormProps {
  isAdmin: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const PAYMENT_METHOD_OPTIONS = ['transferencia', 'efectivo', 'tarjeta', 'depósito', 'otro'];

export default function ExternalOrderForm({ isAdmin, onClose, onCreated }: ExternalOrderFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Cliente
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [notes, setNotes] = useState('');

  // Canal
  const [salesChannel, setSalesChannel] = useState<SalesChannel>('manual_whatsapp');
  const [sourceReference, setSourceReference] = useState('');

  // Almacén / fecha promesa
  const [warehouseId, setWarehouseId] = useState('');
  const [deliveryPromiseDate, setDeliveryPromiseDate] = useState('');

  // Items
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);

  // Pago
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentAmountOverride, setPaymentAmountOverride] = useState<string>(''); // si vacío, usa total

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    const [pRes, wRes] = await Promise.all([
      supabase.from('products').select('id, sku, name, unit_price, active').eq('active', true).order('name'),
      supabase.from('warehouses').select('id, code, name').eq('active', true).order('name'),
    ]);
    setProducts((pRes.data as Product[]) || []);
    const whs = (wRes.data as Warehouse[]) || [];
    setWarehouses(whs);
    const def = whs.find((w) => w.code === 'COYOACAN') || whs[0];
    if (def) setWarehouseId(def.id);
  };

  const showError = (msg: string) => { setStatus('error'); setMessage(msg); };
  const showSuccessAndClose = (msg: string) => {
    setStatus('success');
    setMessage(msg);
    setTimeout(() => {
      onCreated();
      onClose();
    }, 1500);
  };

  const total = draftLines.reduce((sum, l) => sum + l.qty * l.unit_price, 0);
  const productById = new Map(products.map((p) => [p.id, p]));

  const addDraftLine = () => {
    if (products.length === 0) return showError('No hay productos en el catálogo. Crea uno desde Catálogo.');
    setDraftLines((prev) => [
      ...prev,
      { tmpId: crypto.randomUUID(), product_id: products[0].id, qty: 1, unit_price: Number(products[0].unit_price) },
    ]);
  };

  const updateDraftLine = (tmpId: string, patch: Partial<DraftLine>) => {
    setDraftLines((prev) => prev.map((l) => (l.tmpId === tmpId ? { ...l, ...patch } : l)));
  };

  const removeDraftLine = (tmpId: string) => {
    setDraftLines((prev) => prev.filter((l) => l.tmpId !== tmpId));
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'El nombre del cliente es obligatorio.';
    if (!email.trim()) return 'El email es obligatorio.';
    if (!warehouseId) return 'Selecciona un almacén.';
    if (draftLines.length === 0) return 'Agrega al menos una línea.';
    const seen = new Set<string>();
    for (const l of draftLines) {
      if (!l.product_id) return 'Hay líneas sin producto.';
      if (l.qty <= 0) return 'Las cantidades deben ser > 0.';
      if (seen.has(l.product_id)) return 'No puedes repetir el mismo producto en dos líneas.';
      seen.add(l.product_id);
    }
    if (paymentAmountOverride && parseFloat(paymentAmountOverride) <= 0) return 'El monto pagado debe ser > 0.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return showError(err);

    setStatus('loading');
    setMessage('');

    const paidAmount = paymentAmountOverride ? parseFloat(paymentAmountOverride) : total;
    const isFullyPaid = paidAmount >= total;

    // Build legacy items JSONB para compatibilidad con UI vieja (mailers leen de aquí)
    const legacyItems = draftLines.map((l) => {
      const p = productById.get(l.product_id);
      return {
        product: p?.name ?? '—',
        quantity: l.qty,
        unit_price: l.unit_price,
        subtotal: l.qty * l.unit_price,
      };
    });

    // 1. Insert preorder con status confirmed (asumido pagado) o partial_payment
    const { data: po, error: poErr } = await supabase
      .from('preorders')
      .insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        city: city.trim(),
        state: stateInput.trim(),
        notes: notes.trim(),
        items: legacyItems,
        total,
        status: isFullyPaid ? 'confirmed' : 'partial_payment',
        sales_channel: salesChannel,
        source_reference: sourceReference.trim(),
        warehouse_id: warehouseId,
        delivery_promise_date: deliveryPromiseDate || null,
        payment_status: isFullyPaid ? 'paid' : 'partial',
        payment_method: paymentMethod,
        payment_confirmed_at: new Date(paymentDate + 'T12:00:00').toISOString(),
        partial_payment_amount: isFullyPaid ? null : paidAmount,
      })
      .select()
      .single();

    if (poErr || !po) return showError(poErr?.message ?? 'No se pudo crear el pedido.');

    // 2. Insert order_items
    const itemsPayload = draftLines.map((l) => ({
      order_id: po.id,
      product_id: l.product_id,
      qty: l.qty,
      unit_price: l.unit_price,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
    if (itemsErr) {
      await supabase.from('preorders').delete().eq('id', po.id);
      return showError(`Error en líneas: ${itemsErr.message}`);
    }

    // 3. Insert order_payment
    const { error: payErr } = await supabase.from('order_payments').insert({
      order_id: po.id,
      amount: paidAmount,
      method: paymentMethod,
      paid_at: new Date(paymentDate + 'T12:00:00').toISOString(),
      reference: paymentReference.trim(),
      notes: 'Captura manual de pedido externo',
    });
    if (payErr) {
      // No revertimos el pedido — el admin puede registrar el pago manualmente después
      console.warn('order_payment insert falló (no crítico):', payErr.message);
    }

    // 4. Intentar reservas (solo si fully paid; si parcial dejamos en partial_payment sin reservar)
    let backorder = false;
    const successfulReservations: { product_id: string; qty: number }[] = [];
    if (isFullyPaid) {
      for (const l of draftLines) {
        const { error: rErr } = await supabase.rpc('apply_movement', {
          p_type: 'reservation',
          p_product_id: l.product_id,
          p_warehouse_id: warehouseId,
          p_qty: l.qty,
          p_reference_type: 'order',
          p_reference_id: po.id,
          p_notes: `Reserva pedido ${po.folio ?? po.order_number}`,
        });
        if (rErr) {
          backorder = true;
          break;
        }
        successfulReservations.push({ product_id: l.product_id, qty: l.qty });
      }

      if (backorder) {
        // Compensar: liberar las reservas que sí se hicieron
        for (const r of successfulReservations) {
          await supabase.rpc('apply_movement', {
            p_type: 'release',
            p_product_id: r.product_id,
            p_warehouse_id: warehouseId,
            p_qty: r.qty,
            p_reference_type: 'order',
            p_reference_id: po.id,
            p_notes: `Release compensatorio pedido ${po.folio ?? po.order_number}`,
          });
        }
        await supabase.from('preorders').update({ status: 'backorder' }).eq('id', po.id);
      }
    }

    const folio = po.folio ?? po.order_number;
    if (backorder) {
      showSuccessAndClose(`Pedido ${folio} creado en BACKORDER (sin stock disponible).`);
    } else if (!isFullyPaid) {
      showSuccessAndClose(`Pedido ${folio} creado como PAGO PARCIAL.`);
    } else {
      showSuccessAndClose(`Pedido ${folio} creado y reservado.`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-white text-sm font-semibold mb-1">Solo administración</p>
          <p className="text-gray-500 text-xs">Los pedidos externos los carga el rol <strong className="text-amber-400">admin</strong>.</p>
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

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
        <div className="flex items-center gap-3">
          <ShoppingBag size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Nuevo pedido externo</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* CLIENTE */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Cliente</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><User size={10} /> Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><Mail size={10} /> Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><Phone size={10} /> Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><Building2 size={10} /> Empresa</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><MapPin size={10} /> Ciudad</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wide">Estado</label>
              <input
                type="text"
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* CANAL */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Canal de venta</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><Tag size={10} /> Canal</label>
              <select
                value={salesChannel}
                onChange={(e) => setSalesChannel(e.target.value as SalesChannel)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              >
                {(Object.keys(SALES_CHANNEL_CONFIG) as SalesChannel[]).filter((c) => c !== 'web').map((c) => (
                  <option key={c} value={c}>{SALES_CHANNEL_CONFIG[c].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><Hash size={10} /> Folio origen (opcional)</label>
              <input
                type="text"
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                placeholder="Ej. wsp-23/04, cot-Q345"
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs placeholder-gray-700 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* ALMACEN + ENTREGA */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Almacén &amp; promesa de entrega</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><Boxes size={10} /> Almacén</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><Calendar size={10} /> Promesa de entrega</label>
              <input
                type="date"
                value={deliveryPromiseDate}
                onChange={(e) => setDeliveryPromiseDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* LINEAS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Productos</p>
            <button
              onClick={addDraftLine}
              className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded text-xs"
            >
              <Plus size={11} /> Línea
            </button>
          </div>

          {draftLines.length === 0 ? (
            <div className="text-center py-4 text-gray-600 text-xs border border-dashed border-gray-800 rounded">
              Sin líneas. Agrega al menos una.
            </div>
          ) : (
            <div className="space-y-2">
              {draftLines.map((l) => {
                const p = productById.get(l.product_id);
                return (
                  <div key={l.tmpId} className="bg-black border border-gray-800 rounded p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={l.product_id}
                        onChange={(e) => {
                          const newProd = productById.get(e.target.value);
                          updateDraftLine(l.tmpId, {
                            product_id: e.target.value,
                            unit_price: newProd ? Number(newProd.unit_price) : l.unit_price,
                          });
                        }}
                        className="flex-1 px-2 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                      >
                        {products.map((pp) => (
                          <option key={pp.id} value={pp.id}>{pp.sku} — {pp.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeDraftLine(l.tmpId)}
                        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase tracking-wide">Cant.</label>
                        <input
                          type="number"
                          value={l.qty}
                          onChange={(e) => updateDraftLine(l.tmpId, { qty: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step="1"
                          className="w-full px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase tracking-wide">P. unit.</label>
                        <input
                          type="number"
                          value={l.unit_price}
                          onChange={(e) => updateDraftLine(l.tmpId, { unit_price: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 uppercase tracking-wide">Subtotal</label>
                        <p className="px-2 py-1 text-green-400 font-mono text-xs font-semibold">{formatMXN(l.qty * l.unit_price)}</p>
                      </div>
                    </div>
                    {p && (
                      <p className="text-gray-600 text-[10px] italic">{p.name}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {draftLines.length > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-black/40 border border-gray-800 rounded">
              <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Total</span>
              <span className="text-green-400 font-bold text-base">{formatMXN(total)}</span>
            </div>
          )}
        </div>

        {/* PAGO */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold flex items-center gap-1">
            <CreditCard size={11} /> Pago (asumido recibido)
          </p>
          <div className="p-2.5 bg-black border border-gray-800 rounded space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-wide">Método</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                >
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-wide">Fecha de pago</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-wide">Monto pagado (vacío = total)</label>
                <input
                  type="number"
                  value={paymentAmountOverride}
                  onChange={(e) => setPaymentAmountOverride(e.target.value)}
                  placeholder={formatMXN(total)}
                  min="0"
                  step="0.01"
                  className="w-full px-2 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs placeholder-gray-700 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-wide">Referencia</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Folio bancario"
                  className="w-full px-2 py-1.5 bg-gray-950 border border-gray-800 rounded text-white text-xs placeholder-gray-700 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            {paymentAmountOverride && parseFloat(paymentAmountOverride) < total && (
              <p className="text-orange-400 text-[10px] flex items-center gap-1">
                <AlertCircle size={10} /> Monto menor al total: el pedido entrará como <strong>pago parcial</strong> (sin reserva de stock).
              </p>
            )}
          </div>
        </div>

        {/* NOTAS */}
        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wide flex items-center gap-1"><FileText size={10} /> Notas internas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observaciones del pedido"
            className="w-full px-2 py-1.5 bg-black border border-gray-800 rounded text-white text-xs placeholder-gray-700 focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </div>

        {renderFeedback()}

        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={status === 'loading' || draftLines.length === 0 || !name.trim() || !email.trim()}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Crear pedido
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-black border border-gray-800 rounded-lg text-gray-400 text-sm hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
