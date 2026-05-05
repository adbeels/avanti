import { useEffect, useMemo, useState } from 'react';
import {
  Send, Mail, Eye, Code2, Loader2, CheckCircle2, AlertCircle, X, Package,
  MessageCircle, ExternalLink, Phone,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildDeliveryReadyHtml } from './emailTemplates';
import type { Preorder } from './PreordersTable';

interface DeliveryReadyMailerProps {
  preorder: Preorder | null;
  onEmailSent: (preorderId: string) => void;
}

type Channel = 'email' | 'whatsapp';

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// ============================================================================
// WhatsApp helpers
// ============================================================================

/**
 * Normaliza un teléfono mexicano para wa.me.
 * - Quita todo lo que no sea dígito
 * - Si tiene 10 dígitos, prepende 52 (Mx mobile)
 * - Si ya empieza con 52, lo deja
 * - Devuelve null si no se puede normalizar
 */
function normalizePhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length === 10) return '52' + digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/**
 * Genera el mensaje por defecto para el aviso WhatsApp.
 */
function buildDefaultWhatsAppMessage(preorder: Preorder): string {
  const folio = preorder.folio || preorder.legacy_order_number || preorder.order_number;
  return `Hola ${preorder.name}! 👋

Tu pedido en *Avanti México* (${folio}) ya está listo para entregarse. 🎉

Puedes recibirlo de 3 formas:

🏬 *Retiro presencial*
Calle 28 de diciembre #23, Coyoacán, CDMX
Lunes a jueves de 9 a 17 hrs

🏍️ *Uber / Didi*
Coordinas el envío y nos avisas para tener el paquete listo (el costo del envío corre por tu cuenta).

📦 *Entrega especial mayorista*
Coordinamos contigo fecha y dirección sin costo.

Cualquier duda respondes por aquí.

Gracias por tu compra 🏆
— Avanti México`;
}

function buildWaMeUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function DeliveryReadyMailer({ preorder, onEmailSent }: DeliveryReadyMailerProps) {
  const [channel, setChannel] = useState<Channel>('email');
  const [subject, setSubject] = useState('Tu pedido esta listo - Avanti Mexico');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setStatus('idle');
    setMessage('');
    setPreviewMode(false);
    if (preorder) {
      setWhatsappMessage(buildDefaultWhatsAppMessage(preorder));
    }
  }, [preorder?.id]);

  const phoneE164 = useMemo(
    () => (preorder ? normalizePhoneForWhatsApp(preorder.phone) : null),
    [preorder?.phone]
  );

  const handleSendEmail = async () => {
    if (!preorder) return;
    setStatus('loading');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const html = buildDeliveryReadyHtml(preorder);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-delivery-ready`;

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
      if (!response.ok) throw new Error(result?.error || `Error HTTP ${response.status}`);

      setStatus('success');
      setMessage(`Aviso enviado a ${preorder.email}`);
      onEmailSent(preorder.id);
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 5000);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Error al enviar el correo.');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!preorder) return;
    if (!phoneE164) {
      setStatus('error');
      setMessage('No se pudo normalizar el número telefónico del cliente.');
      return;
    }
    if (!whatsappMessage.trim()) {
      setStatus('error');
      setMessage('El mensaje no puede estar vacío.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      // Marcar el pedido como ready + registrar timestamp WhatsApp ANTES de abrir
      // (si la actualización falla, no abrimos WhatsApp)
      const nowIso = new Date().toISOString();
      const updates: Record<string, unknown> = {
        delivery_ready_whatsapp_sent_at: nowIso,
      };
      if (preorder.delivery_status === 'pending') {
        updates.delivery_status = 'ready';
        updates.delivery_ready_at = nowIso;
      }

      const { error } = await supabase
        .from('preorders')
        .update(updates)
        .eq('id', preorder.id);

      if (error) throw new Error(error.message);

      // Abrir WhatsApp en nueva pestaña
      const url = buildWaMeUrl(phoneE164, whatsappMessage);
      window.open(url, '_blank', 'noopener,noreferrer');

      setStatus('success');
      setMessage(`WhatsApp abierto. Confirma el envío en la nueva pestaña.`);
      onEmailSent(preorder.id);
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 5000);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Error al marcar el pedido.');
    }
  };

  // ============================================================
  // EMPTY / GUARD STATES
  // ============================================================
  if (!preorder) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <Package size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Aviso de pedido listo</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Mail size={36} className="mb-3 opacity-20" />
            <p className="text-sm text-center">Selecciona un pedido <span className="text-green-400 font-medium">Confirmado</span> y con entrega <span className="text-amber-400 font-medium">Pendiente</span> para mandar el aviso de "listo para recoger"</p>
          </div>
        </div>
      </div>
    );
  }

  if (preorder.status !== 'confirmed') {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
          <Package size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Aviso de pedido listo</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <AlertCircle size={22} className="text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm mb-1">El pedido <span className="font-mono text-amber-400 font-bold">{preorder.order_number}</span> no esta confirmado</p>
            <p className="text-gray-600 text-xs">Solo los pedidos pagados (estado <strong className="text-green-400">Confirmado</strong>) pueden marcarse como listos.</p>
          </div>
        </div>
      </div>
    );
  }

  // Si delivery ya no es pending, mostramos info de canales usados (no bloqueamos reenvío)
  const alreadyNotified = preorder.delivery_status !== 'pending';
  const previewHtml = buildDeliveryReadyHtml(preorder);

  return (
    <div className="bg-gray-950 border border-amber-800/30 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-800/30 bg-amber-950/20">
        <div className="flex items-center gap-3">
          <Package size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Aviso de pedido listo</span>
        </div>
        <span className="text-amber-400 text-xs font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
          {alreadyNotified ? 'Reenvío' : 'Listo para enviar'}
        </span>
      </div>

      <div className="p-6 space-y-5">
        {/* Customer card */}
        <div className="flex items-center gap-3 p-4 bg-amber-950/20 border border-amber-800/30 rounded-xl">
          <Mail size={16} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white text-sm font-medium truncate">{preorder.name}</p>
              <span className="font-mono text-amber-400/70 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-1.5 py-0.5 rounded flex-shrink-0">
                {preorder.folio || preorder.legacy_order_number || preorder.order_number}
              </span>
            </div>
            <p className="text-gray-500 text-xs truncate">{preorder.email}</p>
            {preorder.phone && (
              <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {preorder.phone}
                {phoneE164 && <span className="text-gray-700 ml-1">→ +{phoneE164}</span>}
              </p>
            )}
          </div>
          <span className="text-green-400 font-bold text-sm">{formatMXN(preorder.total)}</span>
        </div>

        {/* Status indicators si ya se notificó */}
        {(preorder.delivery_ready_email_sent_at || preorder.delivery_ready_whatsapp_sent_at) && (
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2 rounded-lg border text-xs ${
              preorder.delivery_ready_email_sent_at
                ? 'bg-green-500/5 border-green-500/20 text-green-400'
                : 'bg-black border-gray-800 text-gray-600'
            }`}>
              <Mail size={11} className="inline mr-1" />
              Email: {preorder.delivery_ready_email_sent_at
                ? new Date(preorder.delivery_ready_email_sent_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
                : 'no enviado'}
            </div>
            <div className={`p-2 rounded-lg border text-xs ${
              preorder.delivery_ready_whatsapp_sent_at
                ? 'bg-green-500/5 border-green-500/20 text-green-400'
                : 'bg-black border-gray-800 text-gray-600'
            }`}>
              <MessageCircle size={11} className="inline mr-1" />
              WhatsApp: {preorder.delivery_ready_whatsapp_sent_at
                ? new Date(preorder.delivery_ready_whatsapp_sent_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
                : 'no enviado'}
            </div>
          </div>
        )}

        {/* CHANNEL TABS */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1.5 block">Canal</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setChannel('email')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                channel === 'email'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            >
              <Mail size={13} />
              Correo
            </button>
            <button
              onClick={() => setChannel('whatsapp')}
              disabled={!phoneE164}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                channel === 'whatsapp'
                  ? 'bg-green-500/10 border-green-500/40 text-green-300'
                  : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
              title={!phoneE164 ? 'No hay número telefónico válido' : 'Enviar por WhatsApp'}
            >
              <MessageCircle size={13} />
              WhatsApp
            </button>
          </div>
          {!phoneE164 && (
            <p className="text-[10px] text-orange-400/70 mt-1.5 flex items-center gap-1">
              <AlertCircle size={10} />
              El pedido no tiene un teléfono válido para WhatsApp.
            </p>
          )}
        </div>

        {/* ============== EMAIL CHANNEL ============== */}
        {channel === 'email' && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">Asunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
              />
            </div>

            <div className="p-4 bg-black/40 border border-gray-800 rounded-xl space-y-2 text-xs text-gray-500">
              <p className="text-gray-400 font-medium text-xs uppercase tracking-wide">El correo incluir&aacute;:</p>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-amber-500 flex-shrink-0" />
                <span>N&uacute;mero de pedido y resumen del producto</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-amber-500 flex-shrink-0" />
                <span>3 modalidades de entrega (retiro, Uber/Didi, mayoristas)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-amber-500 flex-shrink-0" />
                <span>Direcci&oacute;n y horario de retiro presencial</span>
              </div>
              {!alreadyNotified && (
                <p className="text-amber-500/70 text-[11px] mt-3 pt-3 border-t border-gray-800">
                  Al enviar, el pedido pasa a estado <strong className="text-amber-400">Listo</strong> autom&aacute;ticamente.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                    previewMode
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-black border-gray-700 hover:border-amber-500/50 text-gray-400 hover:text-amber-400'
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
                    <Eye size={12} className="text-amber-400" />
                    <span className="text-gray-500 text-xs">Vista previa del correo</span>
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    title="Vista previa pedido listo"
                    className="w-full border-0"
                    style={{ height: '420px' }}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ============== WHATSAPP CHANNEL ============== */}
        {channel === 'whatsapp' && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block flex items-center gap-1.5">
                <MessageCircle size={12} className="text-green-400" />
                Mensaje de WhatsApp <span className="text-gray-600 text-[10px] ml-auto">editable</span>
              </label>
              <textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={14}
                className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors resize-y leading-relaxed"
              />
              <p className="text-[10px] text-gray-600 mt-1.5">
                WhatsApp soporta *negritas*, _cursivas_ y emojis. Al hacer click se abre wa.me en una pestaña nueva con el mensaje pre-cargado.
              </p>
            </div>

            <div className="p-3 bg-green-950/20 border border-green-800/30 rounded-lg text-xs text-green-300/80 space-y-1.5">
              <p className="flex items-center gap-1.5 font-semibold">
                <Phone size={11} /> Destino
              </p>
              <p className="font-mono text-green-300">+{phoneE164 || '—'}</p>
              <p className="text-green-300/60 text-[10px]">
                Se abrirá WhatsApp Web/Desktop/Mobile con el mensaje listo para enviar. Confirma en la pestaña que se abre.
              </p>
            </div>

            {!alreadyNotified && (
              <p className="text-amber-500/70 text-[11px] px-3">
                Al hacer click, el pedido pasa a estado <strong className="text-amber-400">Listo</strong> automáticamente.
              </p>
            )}
          </>
        )}

        {/* Feedback */}
        {(status === 'success' || status === 'error') && (
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${
            status === 'success'
              ? 'bg-amber-950/30 border-amber-800/40 text-amber-300'
              : 'bg-red-950/30 border-red-800/40 text-red-400'
          }`}>
            {status === 'success' ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* SUBMIT */}
        {channel === 'email' ? (
          <button
            onClick={handleSendEmail}
            disabled={!subject.trim() || status === 'loading'}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black py-3.5 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-amber-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <><Loader2 size={16} className="animate-spin" /> Enviando...</>
            ) : (
              <><Send size={16} /> Enviar correo de aviso</>
            )}
          </button>
        ) : (
          <button
            onClick={handleSendWhatsApp}
            disabled={!phoneE164 || !whatsappMessage.trim() || status === 'loading'}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3.5 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-green-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <><Loader2 size={16} className="animate-spin" /> Marcando...</>
            ) : (
              <><MessageCircle size={16} /> Abrir WhatsApp <ExternalLink size={12} className="opacity-70" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
