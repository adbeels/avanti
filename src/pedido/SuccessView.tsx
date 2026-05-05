import { CheckCircle, ArrowLeft } from 'lucide-react';

interface SuccessViewProps {
  email: string;
  orderNumber?: string;
}

export default function SuccessView({ email, orderNumber }: SuccessViewProps) {
  return (
    <div className="text-center animate-fade-in py-10">
      <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-400" />
      </div>
      <h2 className="text-3xl font-black text-white mb-3">Prepedido enviado</h2>
      {orderNumber && (
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
          <span className="text-gray-400 text-xs uppercase tracking-widest">No. Pedido</span>
          <span className="font-mono text-amber-400 text-sm font-black tracking-widest">{orderNumber}</span>
        </div>
      )}
      <p className="text-gray-400 text-base max-w-md mx-auto mb-2">
        Hemos recibido tu solicitud. Enviamos un resumen a:
      </p>
      <p className="text-amber-400 font-semibold mb-6">{email}</p>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-10">
        Un asesor de Avanti México, Sales & Operations se pondra en contacto contigo para confirmar el pedido y coordinar la entrega.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-semibold transition-colors"
      >
        <ArrowLeft size={18} />
        Volver al inicio
      </a>
    </div>
  );
}
