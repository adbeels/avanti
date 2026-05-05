import { ArrowLeft, CheckCircle, Loader2, Send, User, MapPin, Building2, Mail, Phone, FileText } from 'lucide-react';
import type { CustomerData, OrderItem } from './types';

interface SummaryStepProps {
  customer: CustomerData;
  items: OrderItem[];
  total: number;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function SummaryStep({ customer, items, total, onBack, onSubmit, submitting }: SummaryStepProps) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-1">Resumen del pedido</h2>
      <p className="text-gray-500 text-sm mb-8">
        Revisa los datos antes de enviar. Recibiras una confirmación por correo.
      </p>

      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 mb-6">
        <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <User size={14} />
          Datos del cliente
        </h3>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="flex items-start gap-2">
            <User size={14} className="text-gray-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-gray-500 text-xs block">Nombre</span>
              <span className="text-white">{customer.name}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail size={14} className="text-gray-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-gray-500 text-xs block">Correo</span>
              <span className="text-white">{customer.email}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone size={14} className="text-gray-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-gray-500 text-xs block">Telefono</span>
              <span className="text-white">{customer.phone}</span>
            </div>
          </div>
          {customer.company && (
            <div className="flex items-start gap-2">
              <Building2 size={14} className="text-gray-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-gray-500 text-xs block">Empresa</span>
                <span className="text-white">{customer.company}</span>
              </div>
            </div>
          )}
          {(customer.city || customer.state) && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-gray-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-gray-500 text-xs block">Ubicacion</span>
                <span className="text-white">{[customer.city, customer.state].filter(Boolean).join(', ')}</span>
              </div>
            </div>
          )}
          {customer.notes && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <FileText size={14} className="text-gray-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-gray-500 text-xs block">Notas</span>
                <span className="text-white">{customer.notes}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 mb-6">
        <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <CheckCircle size={14} />
          Productos
        </h3>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between text-sm">
              <div>
                <span className="text-white font-semibold">{item.productName}</span>
                <span className="text-gray-600 ml-2">x{item.quantity}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-xs mr-3">{formatMXN(item.unitPrice)} c/u</span>
                <span className="text-white font-bold">{formatMXN(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 mt-4 pt-4 flex items-center justify-between">
          <span className="text-gray-400 font-semibold text-sm">Total estimado</span>
          <span className="text-amber-400 font-black text-xl">{formatMXN(total)}</span>
        </div>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-8">
        <p className="text-amber-200/70 text-xs leading-relaxed">
          Este es un prepedido. Un asesor de Avanti México, Sales & Operations te contactara para confirmar disponibilidad,
          condiciones de pago y detalles de entrega. Recibiras un correo con el resumen de tu pedido.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-semibold transition-colors disabled:opacity-40"
        >
          <ArrowLeft size={18} />
          Atras
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="group inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              Enviar prepedido
              <Send size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
