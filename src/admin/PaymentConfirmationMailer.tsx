import { useState } from 'react';
import { Send, Mail, Eye, Code2, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildPaymentConfirmedHtml } from './emailTemplates';
import type { Preorder } from './PreordersTable';

interface PaymentConfirmationMailerProps {
  preorder: Preorder | null;
  onEmailSent: (preorderId: string) => void;
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function PaymentConfirmationMailer({ preorder, onEmailSent }: PaymentConfirmationMailerProps) {
  const [subject, setSubject] = useState('Confirmacion de pago recibido - Avanti Mexico');
  const [previewMode, setPreviewMode] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!preorder) return;
    setStatus('loading');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const html = buildPaymentConfirmedHtml(preorder);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-confirmation`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: preorder.email,
          subject,
          html,
          preorderId: preorder.id,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || `Error HTTP ${response.status}`);
      }

      setStatus('success');
      setMessage(`Confirmacion enviada a ${preorder.email}`);
      onEmailSent(preorder.id);

      setTimeout(() => { setStatus('idle'); setMessage(''); }, 5000);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Error al enviar el correo.');
    }
  };

  if (!preorder) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <CheckCircle2 size={18} className="text-green-400" />
          <span className="text-white font-semibold">Confirmacion de pago</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Mail size={36} className="mb-3 opacity-20" />
            <p className="text-sm text-center">Selecciona un prepedido con estado <span className="text-green-400 font-medium">Confirmado</span> para enviar la confirmacion de pago</p>
          </div>
        </div>
      </div>
    );
  }

  if (preorder.status !== 'confirmed') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <CheckCircle2 size={18} className="text-green-400" />
          <span className="text-white font-semibold">Confirmacion de pago</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <AlertCircle size={22} className="text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm mb-1">El pedido <span className="font-mono text-amber-400 font-bold">{preorder.order_number}</span> no esta confirmado</p>
            <p className="text-gray-600 text-xs">Cambia el estado a <strong className="text-green-400">Confirmado</strong> para habilitar este correo.</p>
          </div>
        </div>
      </div>
    );
  }

  const previewHtml = buildPaymentConfirmedHtml(preorder);

  return (
    <div className="bg-gray-950 border border-green-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-green-800/30 bg-green-950/20">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-400" />
          <span className="text-white font-semibold">Confirmacion de pago</span>
        </div>
        <span className="text-green-400 text-xs font-medium bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
          Pago confirmado
        </span>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3 p-4 bg-green-950/20 border border-green-800/30 rounded-xl">
          <Mail size={16} className="text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white text-sm font-medium truncate">{preorder.name}</p>
              <span className="font-mono text-amber-400/70 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-1.5 py-0.5 rounded flex-shrink-0">
                {preorder.order_number}
              </span>
            </div>
            <p className="text-gray-500 text-xs truncate">{preorder.email}</p>
          </div>
          <span className="text-green-400 font-bold text-sm">{formatMXN(preorder.total)}</span>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Asunto</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors text-sm"
          />
        </div>

        <div className="p-4 bg-black/40 border border-gray-800 rounded-xl space-y-2 text-xs text-gray-500">
          <p className="text-gray-400 font-medium text-xs uppercase tracking-wide">El correo incluira:</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
            <span>Numero de pedido y fecha de confirmacion de pago</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
            <span>Desglose completo de productos y total pagado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
            <span>Instrucciones de recogida o coordinar envio</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
            <span>Informacion para solicitar factura</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                previewMode
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-black border-gray-700 hover:border-green-500/50 text-gray-400 hover:text-green-400'
              }`}
            >
              {previewMode ? <Code2 size={13} /> : <Eye size={13} />}
              {previewMode ? 'Ocultar vista previa' : 'Vista previa del correo'}
            </button>
            {previewMode && (
              <button onClick={() => setPreviewMode(false)} className="text-gray-600 hover:text-gray-400 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
          {previewMode && (
            <div className="border border-gray-800 rounded-lg overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-950 border-b border-gray-800">
                <Eye size={12} className="text-green-400" />
                <span className="text-gray-500 text-xs">Vista previa del correo de confirmacion</span>
              </div>
              <iframe
                srcDoc={previewHtml}
                title="Vista previa confirmacion"
                className="w-full border-0"
                style={{ height: '420px' }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {(status === 'success' || status === 'error') && (
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${
            status === 'success'
              ? 'bg-green-950/30 border-green-800/40 text-green-400'
              : 'bg-red-950/30 border-red-800/40 text-red-400'
          }`}>
            {status === 'success' ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{message}</p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={!subject.trim() || status === 'loading'}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3.5 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-green-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send size={16} />
              Enviar confirmacion de pago
            </>
          )}
        </button>
      </div>
    </div>
  );
}
