import { useState, useEffect } from 'react';
import { Send, Mail, Eye, Code2, Loader2, CheckCircle2, AlertCircle, CreditCard, X, Zap, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Preorder } from './PreordersTable';

interface PreorderMailerProps {
  preorder: Preorder | null;
  onEmailSent: (preorderId: string) => void;
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// ============================================================================
// Payment modes — configuración del bloque "Pasos a seguir" + mensaje de cierre
// ============================================================================
//
// El admin elige cuál usar al enviar la solicitud:
//   immediate → producto en stock, se entrega apenas confirmemos el pago
//   scheduled → producto en preparación, avisamos por correo cuándo retirarlo
//
// El resto del template (header, items, datos bancarios, footer) es idéntico.

export type PaymentMode = 'immediate' | 'scheduled';

interface PaymentModeContent {
  /** Texto legible mostrado en el selector y la galería */
  label: string;
  /** Subtítulo / contexto en la galería */
  description: string;
  /** Lista de pasos (HTML inline para preservar bold/links) */
  steps: string[];
  /** Banner amber final */
  closingBadge: string;
  closingNote: string;
}

const PAYMENT_MODES: Record<PaymentMode, PaymentModeContent> = {
  immediate: {
    label: 'Pago + entrega inmediata',
    description: 'Producto en stock — apenas confirmemos pago se entrega.',
    steps: [
      'Realiza tu depósito a la cuenta indicada arriba y envía tu comprobante al email <a href="mailto:pedidos@avantimexico.com" style="color:#d97706;text-decoration:none;">pedidos@avantimexico.com</a>.',
      'En cuanto recibamos tu comprobante confirmaremos vía email tu transferencia (normalmente en <strong style="color:#d97706;">pocas horas hábiles</strong>).',
      'Si requieres <strong style="color:#d97706;">factura</strong>, adjunta tu constancia de situación fiscal vigente y todos tus datos fiscales junto con el comprobante.',
      '<strong style="color:#d97706;">Tu producto está en stock</strong> — apenas validemos tu pago podrás pasar a recogerlo de inmediato.',
      'Dirección de retiro: <strong style="color:#d97706;">Calle 28 de diciembre #23, Col. Emiliano Zapata, Coyoacán, CDMX, CP 04815</strong>. O coordina recolección por Uber/Didi avisando previamente al WhatsApp <a href="https://wa.me/5215513228756" style="color:#d97706;text-decoration:none;">55 1322 8756</a>. Horario lunes a jueves de 9 a 17 hrs. <em style="color:#9ca3af;">El costo del envío no está incluido.</em>',
    ],
    closingBadge: '⚡ Producto en stock — entrega inmediata tras confirmación de pago.',
    closingNote: 'Una vez confirmado tu pago, tu pedido queda listo para recolección. ¡Gracias por tu compra!',
  },
  scheduled: {
    label: 'Pago + aviso posterior',
    description: 'Producto en preparación — avisamos por correo cuándo retirarlo.',
    steps: [
      'Realiza tu depósito a la cuenta indicada arriba y envía tu comprobante al email <a href="mailto:pedidos@avantimexico.com" style="color:#d97706;text-decoration:none;">pedidos@avantimexico.com</a>.',
      'En cuanto recibamos tu comprobante confirmaremos vía email tu transferencia (normalmente en <strong style="color:#d97706;">pocas horas hábiles</strong>).',
      'Si requieres <strong style="color:#d97706;">factura</strong>, adjunta tu constancia de situación fiscal vigente y todos tus datos fiscales junto con el comprobante.',
      '<strong style="color:#d97706;">Tu producto está en preparación</strong> — apenas esté listo te enviaremos un segundo correo indicándote el <strong style="color:#d97706;">día y horario</strong> en que puedes pasar a recogerlo.',
      'Cuando recibas el aviso, podrás recoger en <strong style="color:#d97706;">Calle 28 de diciembre #23, Col. Emiliano Zapata, Coyoacán, CDMX, CP 04815</strong>, o coordinar recolección por Uber/Didi avisando previamente al WhatsApp <a href="https://wa.me/5215513228756" style="color:#d97706;text-decoration:none;">55 1322 8756</a>. Horario lunes a jueves de 9 a 17 hrs. <em style="color:#9ca3af;">El costo del envío no está incluido.</em>',
    ],
    closingBadge: '⏳ Producto en preparación — te avisaremos cuándo recogerlo.',
    closingNote: 'Una vez confirmado tu pago, te avisaremos por correo apenas tu producto esté listo. ¡Gracias por tu compra!',
  },
};

export function paymentModes(): Array<{ id: PaymentMode } & PaymentModeContent> {
  return (Object.keys(PAYMENT_MODES) as PaymentMode[]).map((id) => ({ id, ...PAYMENT_MODES[id] }));
}

export function buildDefaultPaymentHtml(
  preorder: Preorder,
  bankInfo: string,
  mode: PaymentMode = 'immediate'
): string {
  const modeCfg = PAYMENT_MODES[mode];
  const rows = preorder.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;">${item.product}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;text-align:right;">${formatMXN(item.unit_price)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#f5f5f5;font-size:13px;text-align:right;font-weight:bold;">${formatMXN(item.subtotal)}</td>
    </tr>`
    )
    .join('');

  const bankLines = bankInfo
    .split('\n')
    .map((line) => `<p style="margin:0 0 4px 0;color:#e5e7eb;font-size:13px;">${line || '&nbsp;'}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a0a0a;border:1px solid #1f1f1f;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:32px 40px;border-bottom:1px solid #1f1f1f;text-align:center;">
              <img src="https://avantimexico.com/img/avantiW.png" alt="AVANTI" height="48" style="display:inline-block;" />
              <p style="color:#6b7280;font-size:12px;margin:10px 0 0 0;letter-spacing:2px;text-transform:uppercase;"></p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 20px;">
              <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">Pedido ${preorder.order_number}</p>
              <h1 style="color:#f5f5f5;font-size:22px;margin:0 0 8px 0;font-weight:800;">Confirmación y solicitud de pago</h1>
              <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.6;">
                Hola <strong style="color:#e5e7eb;">${preorder.name}</strong>, tu prepedido ha sido confirmado por nuestro equipo.
                A continuación encontraras el detalle y las instrucciones para realizar tu pago.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #1f1f1f;" colspan="4">
                    <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Detalle del pedido</p>
                  </td>
                </tr>
                <tr style="background-color:#0d0d0d;">
                  <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Producto</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Cant.</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">P. Unit.</td>
                  <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Subtotal</td>
                </tr>
                ${rows}
                <tr>
                  <td colspan="3" style="padding:14px 16px;text-align:right;color:#9ca3af;font-size:14px;font-weight:600;">Total a pagar</td>
                  <td style="padding:14px 16px;text-align:right;color:#d97706;font-size:18px;font-weight:800;">${formatMXN(preorder.total)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #1f1f1f;">
                    <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Datos para pago</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px;">
                    ${bankLines}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #1f1f1f;">
                    <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Pasos a seguir</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${modeCfg.steps
                        .map((stepHtml, i) => {
                          const isLast = i === modeCfg.steps.length - 1;
                          const borderStyle = isLast ? '' : 'border-bottom:1px solid #1a1a1a;';
                          return `<tr>
                        <td style="padding:10px 0;${borderStyle}vertical-align:top;">
                          <span style="display:inline-block;background-color:#d97706;color:#000;font-size:11px;font-weight:800;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;margin-right:10px;flex-shrink:0;">${i + 1}</span>
                          <span style="color:#e5e7eb;font-size:13px;line-height:1.6;">${stepHtml}</span>
                        </td>
                      </tr>`;
                        })
                        .join('')}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#d97706;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;">
                    <p style="color:#000;font-size:13px;font-weight:700;margin:0 0 6px 0;">
                      ${modeCfg.closingBadge}
                    </p>
                    <p style="color:#000;font-size:12px;font-weight:500;margin:0;">
                      ${modeCfg.closingNote}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#050505;padding:24px 40px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0 0 6px 0;">AVANTI México | Sales &amp; Operations</p>
              <p style="margin:0;">
                <a href="https://avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">avantimexico.com</a>
                <span style="color:#374151;margin:0 8px;">&middot;</span>
                <a href="mailto:pedidos@avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">pedidos@avantimexico.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildDefaultBankInfo(orderNumber: string): string {
  return `Banco: BBVA
Titular: AVANTI, INCUBADORA DE MARCAS SA DE CV
CLABE: 012180001181732227
Cuenta: 0118173222
Referencia: ${orderNumber}`;
}

export default function PreorderMailer({ preorder, onEmailSent }: PreorderMailerProps) {
  const [subject, setSubject] = useState('Confirmación de pedido y solicitud de pago - Avanti México');
  const [bankInfo, setBankInfo] = useState(() =>
    preorder ? buildDefaultBankInfo(preorder.order_number) : ''
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('immediate');
  const [previewMode, setPreviewMode] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (preorder) {
      setBankInfo(buildDefaultBankInfo(preorder.order_number));
      setStatus('idle');
      setMessage('');
    }
  }, [preorder?.id]);

  const handleSend = async () => {
    if (!preorder) return;
    setStatus('loading');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const html = buildDefaultPaymentHtml(preorder, bankInfo, paymentMode);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-preorder-payment`;

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
      setMessage(`Correo enviado a ${preorder.email}`);
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
          <CreditCard size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Solicitud de pago</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Mail size={36} className="mb-3 opacity-20" />
            <p className="text-sm">Selecciona un prepedido de la tabla para enviar la solicitud de pago</p>
          </div>
        </div>
      </div>
    );
  }

  const previewHtml = buildDefaultPaymentHtml(preorder, bankInfo, paymentMode);

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <CreditCard size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Solicitud de pago</span>
        </div>
        {preorder.email_sent_at && (
          <span className="text-green-500/70 text-xs flex items-center gap-1">
            <CheckCircle2 size={12} />
            Ya enviado
          </span>
        )}
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3 p-4 bg-black/40 border border-gray-800 rounded-xl">
          <Mail size={16} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white text-sm font-medium truncate">{preorder.name}</p>
              <span className="font-mono text-amber-400/70 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-1.5 py-0.5 rounded flex-shrink-0">
                {preorder.order_number}
              </span>
            </div>
            <p className="text-gray-500 text-xs truncate">{preorder.email}</p>
          </div>
          <span className="text-amber-400 font-bold text-sm">{formatMXN(preorder.total)}</span>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Asunto</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Modalidad de entrega</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMode('immediate')}
              className={`p-3 rounded-lg border text-left transition-all ${
                paymentMode === 'immediate'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-black border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className={paymentMode === 'immediate' ? 'text-amber-400' : 'text-gray-500'} />
                <span className="text-xs font-bold tracking-wide">Entrega inmediata</span>
              </div>
              <p className="text-[11px] leading-tight opacity-80">
                Producto en stock — apenas confirmemos el pago se entrega.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('scheduled')}
              className={`p-3 rounded-lg border text-left transition-all ${
                paymentMode === 'scheduled'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-black border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className={paymentMode === 'scheduled' ? 'text-amber-400' : 'text-gray-500'} />
                <span className="text-xs font-bold tracking-wide">Aviso posterior</span>
              </div>
              <p className="text-[11px] leading-tight opacity-80">
                Producto en preparación — avisamos por correo cuándo retirarlo.
              </p>
            </button>
          </div>
          <p className="text-gray-700 text-xs mt-1">El bloque de "Pasos a seguir" del correo cambia según la modalidad elegida.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Datos bancarios</label>
          <textarea
            value={bankInfo}
            onChange={(e) => setBankInfo(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm resize-none font-mono leading-relaxed"
            placeholder="Banco: ...&#10;CLABE: ...&#10;Titular: ..."
          />
          <p className="text-gray-700 text-xs mt-1">Estos datos se incluiran en el correo de solicitud de pago.</p>
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
              <button
                onClick={() => setPreviewMode(false)}
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
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
                title="Vista previa"
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
          disabled={!subject.trim() || !bankInfo.trim() || status === 'loading'}
          className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-black py-3.5 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-amber-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send size={16} />
              Enviar solicitud de pago
            </>
          )}
        </button>
      </div>
    </div>
  );
}
