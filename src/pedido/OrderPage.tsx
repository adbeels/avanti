import { useState } from 'react';
import { Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StepIndicator from './StepIndicator';
import CustomerStep from './CustomerStep';
import ProductsStep from './ProductsStep';
import SummaryStep from './SummaryStep';
import SuccessView from './SuccessView';
import type { CustomerData, OrderItem, Step } from './types';

const emptyCustomer: CustomerData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  city: '',
  state: '',
  notes: '',
};

export default function OrderPage() {
  const [step, setStep] = useState<Step>('customer');
  const [customer, setCustomer] = useState<CustomerData>(emptyCustomer);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    try {
      const { data: insertedRow, error: dbError } = await supabase
        .from('preorders')
        .insert({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          company: customer.company || '',
          city: customer.city,
          state: customer.state,
          notes: customer.notes || '',
          items: items.map((i) => ({
            product: i.productName,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            subtotal: i.subtotal,
          })),
          total,
          status: 'pending',
        })
        .select('order_number')
        .maybeSingle();

      if (dbError) throw new Error(dbError.message);
      if (insertedRow?.order_number) setOrderNumber(insertedRow.order_number);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const mappedItems = items.map((i) => ({
        product: i.productName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        subtotal: i.subtotal,
      }));

      const res = await fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer, items: mappedItems, total }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.warn('Email send failed:', err);
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrio un error al enviar el pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="border-b border-gray-900">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/">
              <img src="/avantiW.png" alt="AVANTI" className="h-10" />
            </a>
            <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold">Prepedido</span>
          </div>
        </header>
        <div className="container mx-auto px-6 py-16 max-w-2xl">
          <SuccessView email={customer.email} orderNumber={orderNumber} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-900">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/">
            <img src="/avantiW.png" alt="AVANTI" className="h-10" />
          </a>
          <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold">Prepedido</span>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-500 text-xs font-semibold tracking-widest uppercase mb-4">
            <Shield size={11} />
            Album Mundial FIFA 2026
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            Realiza tu{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              prepedido
            </span>
          </h1>
          <p className="text-gray-500 text-sm">Productos Panini con precio preferencial de distribuidor, los precios expresados deben manejarse de manera confidencial ya que no son precios de venta al público y son excusivos para socios comerciales y amigos de Avanti México, Sales & Operations .</p>
        </div>

        <StepIndicator current={step} />

        <div className="bg-gray-950/50 border border-gray-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'customer' && (
            <CustomerStep data={customer} onChange={setCustomer} onNext={() => setStep('products')} />
          )}
          {step === 'products' && (
            <ProductsStep
              items={items}
              onChange={setItems}
              onBack={() => setStep('customer')}
              onNext={() => setStep('summary')}
            />
          )}
          {step === 'summary' && (
            <SummaryStep
              customer={customer}
              items={items}
              total={total}
              onBack={() => setStep('products')}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          Los precios incluyen descuento de distribuidor (20% sobre precio al publico).
          <br />
          El pedido final sera confirmado por un asesor de Avanti México, Sales & Operations.
        </p>
      </div>

      <footer className="border-t border-gray-900 py-6 mt-10">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <img src="/logo_Fwhite.png" alt="Avanti Sales & Operations" className="h-6 opacity-50" />
          <p className="text-gray-700 text-xs">
            &copy; 2026 Avanti México Sales &amp; Operations. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
