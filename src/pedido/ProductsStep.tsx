import { ArrowLeft, ArrowRight, Minus, Plus, Package, ShoppingCart } from 'lucide-react';
import { products } from './products';
import type { OrderItem } from './types';

interface ProductsStepProps {
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
  onBack: () => void;
  onNext: () => void;
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function ProductsStep({ items, onChange, onBack, onNext }: ProductsStepProps) {
  function getQty(productId: string): number {
    return items.find((i) => i.productId === productId)?.quantity ?? 0;
  }

  function setQty(productId: string, qty: number) {
    const product = products.find((p) => p.id === productId)!;
    const clamped = Math.max(0, qty);

    if (clamped === 0) {
      onChange(items.filter((i) => i.productId !== productId));
      return;
    }

    const existing = items.find((i) => i.productId === productId);
    if (existing) {
      onChange(
        items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: clamped, subtotal: clamped * product.clientPrice }
            : i
        )
      );
    } else {
      onChange([
        ...items,
        {
          productId: product.id,
          productName: product.name,
          quantity: clamped,
          unitPrice: product.clientPrice,
          subtotal: clamped * product.clientPrice,
        },
      ]);
    }
  }

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  const hasItems = items.length > 0 && items.some((i) => i.quantity > 0);

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-1">Selecciona productos</h2>
      <p className="text-gray-500 text-sm mb-8">
        Elige la cantidad de cada producto. Los precios mostrados son precio distribuidor (20% de descuento sobre precio al publico).
      </p>

      <div className="space-y-4 mb-8">
        {products.map((product) => {
          const qty = getQty(product.id);
          const lineTotal = qty * product.clientPrice;

          return (
            <div
              key={product.id}
              className={`bg-gray-950 border rounded-2xl p-5 sm:p-6 transition-all duration-300 ${
                qty > 0 ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      qty > 0 ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-gray-900 border border-gray-800'
                    }`}
                  >
                    <Package size={20} className={qty > 0 ? 'text-amber-400' : 'text-gray-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base">{product.name}</h3>
                    <p className="text-gray-500 text-sm">{product.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-gray-600 text-xs line-through">{formatMXN(product.publicPrice)}</span>
                      <span className="text-amber-400 font-bold text-sm">{formatMXN(product.clientPrice)}</span>
                      <span className="text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                        -20%
                      </span>
                    </div>
                  </div>
                </div>

                {qty > 0 && (
                  <span className="text-amber-400 font-bold text-sm min-w-[80px] text-center">
                    {formatMXN(lineTotal)}
                  </span>
                )}

                <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQty(product.id, qty - 1)}
                    disabled={qty === 0}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={qty}
                    onChange={(e) => setQty(product.id, parseInt(e.target.value) || 0)}
                    className="w-14 text-center bg-transparent text-white font-bold text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(product.id, qty + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-amber-500/15 hover:text-amber-400 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasItems && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart size={20} className="text-amber-400" />
              <span className="text-gray-400 text-sm font-semibold">
                {items.reduce((s, i) => s + i.quantity, 0)} producto(s)
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 text-xs block">Total estimado</span>
              <span className="text-white font-black text-xl">{formatMXN(total)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-semibold transition-colors"
        >
          <ArrowLeft size={18} />
          Atras
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasItems}
          className="group inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 disabled:opacity-40 disabled:hover:shadow-none"
        >
          Revisar pedido
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
