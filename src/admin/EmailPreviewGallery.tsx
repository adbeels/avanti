import { useState, useMemo } from 'react';
import {
  Mail, Eye, ChevronRight, FileText, Truck, FileSignature, CreditCard,
  Code2, Info, AlertCircle,
} from 'lucide-react';
import {
  buildPaymentConfirmedHtml,
  buildDeliveryReadyHtml,
  buildDeliveryConfirmationHtml,
} from './emailTemplates';
import { buildDefaultPaymentHtml, buildDefaultBankInfo } from './PreorderMailer';
import type { Preorder } from './PreordersTable';

interface TemplateMeta {
  id: string;
  title: string;
  subtitle: string;
  subject: string;
  trigger: string;
  recipients: string;
  edits: string[];
  buildHtml: () => string;
  icon: typeof Mail;
  accent: 'amber' | 'green' | 'blue';
}

// ============================================================================
// SAMPLE DATA — usado para preview
// ============================================================================
const SAMPLE_ORDER_NUMBER = 'W4TA7';
const SAMPLE_DELIVERY_FOLIO = 'DEL-2026-0042';

const SAMPLE_PREORDER: Preorder = {
  id: 'sample-preview',
  order_number: SAMPLE_ORDER_NUMBER,
  name: 'Juan Pérez',
  email: 'cliente@ejemplo.com',
  phone: '+52 55 1234 5678',
  company: 'Distribuidora La Estampa',
  city: 'Ciudad de México',
  state: 'CDMX',
  notes: '',
  items: [
    { product: 'Álbum Pasta Dura',  quantity: 5,  unit_price: 280,   subtotal: 1400 },
    { product: 'Caja',              quantity: 2,  unit_price: 2000,  subtotal: 4000 },
    { product: 'Álbum Soft Cover',  quantity: 10, unit_price: 80,    subtotal: 800 },
  ],
  total: 6200,
  status: 'confirmed',
  created_at: new Date().toISOString(),
  payment_confirmed_at: new Date().toISOString(),
  payment_method: 'transferencia',
  email_sent_at: null,
  payment_confirmation_sent_at: null,
  partial_payment_amount: null,
  delivery_status: 'pending',
  delivery_method: null,
  delivery_ready_at: null,
  delivered_at: null,
  delivery_notes: '',
  delivery_ready_email_sent_at: null,
  delivery_ready_whatsapp_sent_at: null,
  folio: 'ORD-2026-0042',
  legacy_order_number: null,
  sales_channel: 'web',
  source_reference: '',
  warehouse_id: null,
  delivery_promise_date: null,
  payment_status: 'paid',
  etapa: null,
};

// PNG 1x1 que simula firma para el preview
const SAMPLE_SIGNATURE_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100">
  <path d="M 20 75 Q 50 30 80 60 T 140 55 Q 170 80 200 50 T 270 65" stroke="#0a0a0a" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 200 50 L 230 70" stroke="#0a0a0a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
</svg>`);

// ============================================================================
// TEMPLATES DEFINITIONS
// ============================================================================
function buildTemplates(): TemplateMeta[] {
  return [
    {
      id: 'payment-request',
      title: 'Solicitud de pago',
      subtitle: 'Cuando el admin contacta al cliente con el pedido confirmado',
      subject: 'Confirmación de pedido y solicitud de pago - Avanti México',
      trigger: 'Tab Prepedidos → seleccionar pedido → "Enviar solicitud"',
      recipients: 'Cliente + cc a contacto@ y pedidos@avantimexico.com',
      edits: [
        'Datos bancarios (CLABE, banco, titular)',
        'Pasos a seguir (fechas: actualmente "30 abril" depósito, "8 mayo" entrega)',
        'Banner final amber con copy de cierre',
      ],
      buildHtml: () => buildDefaultPaymentHtml(SAMPLE_PREORDER, buildDefaultBankInfo(SAMPLE_ORDER_NUMBER)),
      icon: CreditCard,
      accent: 'amber',
    },
    {
      id: 'payment-confirmed',
      title: 'Pago confirmado',
      subtitle: 'Cuando se valida la transferencia y el pedido pasa a confirmed',
      subject: 'Confirmación de pago recibido - Avanti México',
      trigger: 'Tab Prepedidos → estado Confirmado → "Enviar confirmación"',
      recipients: 'Cliente + cc a contacto@ y pedidos@avantimexico.com',
      edits: [
        'Texto del banner de cierre',
        'Pasos posteriores ("Nos vemos el 8 de mayo", etc.)',
      ],
      buildHtml: () => buildPaymentConfirmedHtml(SAMPLE_PREORDER),
      icon: FileText,
      accent: 'green',
    },
    {
      id: 'delivery-ready',
      title: 'Pedido listo para retirar',
      subtitle: 'Cuando el operador marca el pedido como ready para entrega',
      subject: 'Tu pedido está listo - Avanti México',
      trigger: 'Tab Avisos a cliente → seleccionar pedido → "Marcar listo"',
      recipients: 'Cliente + cc a contacto@ y pedidos@avantimexico.com',
      edits: [
        'Las 3 modalidades de entrega (Coyoacán / Uber-Didi / mayoristas)',
        'Dirección y horario de retiro',
        'WhatsApp de contacto',
      ],
      buildHtml: () => buildDeliveryReadyHtml(SAMPLE_PREORDER),
      icon: Truck,
      accent: 'amber',
    },
    {
      id: 'delivery-confirmation',
      title: 'Comprobante de entrega',
      subtitle: 'Tras firmar el documento, se envía el comprobante con la firma embebida',
      subject: `Comprobante de entrega ${SAMPLE_DELIVERY_FOLIO} - Avanti Mexico`,
      trigger: 'Tab Entregas Doc → firmar → "Enviar comprobante al cliente"',
      recipients: 'Cliente + cc a contacto@ y pedidos@avantimexico.com',
      edits: [
        'Banner de cierre con copy de "gracias por tu compra"',
        'Footer con datos de contacto',
      ],
      buildHtml: () => buildDeliveryConfirmationHtml({
        customer_name: SAMPLE_PREORDER.name,
        order_folio: SAMPLE_PREORDER.folio || SAMPLE_PREORDER.order_number,
        delivery_folio: SAMPLE_DELIVERY_FOLIO,
        signed_at: new Date().toISOString(),
        receiver_name: 'María González (Recepción)',
        signed_method: 'wholesale',
        warehouse_code: 'COYOACAN',
        delivery_address: 'Av. Universidad 200, CDMX',
        signature_data_url: SAMPLE_SIGNATURE_DATA_URL,
        items: SAMPLE_PREORDER.items.map((it) => ({
          product: it.product,
          qty: it.quantity,
          unit_price: it.unit_price,
          subtotal: it.subtotal,
        })),
        total: SAMPLE_PREORDER.total,
        notes: 'Entregado en bodega del cliente, recibido sin novedad.',
      }),
      icon: FileSignature,
      accent: 'green',
    },
  ];
}

const ACCENT_CONFIG: Record<TemplateMeta['accent'], { color: string; bg: string; border: string }> = {
  amber: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  green: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  blue:  { color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/30' },
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function EmailPreviewGallery() {
  const templates = useMemo(() => buildTemplates(), []);
  const [selectedId, setSelectedId] = useState<string>(templates[0].id);
  const [showSource, setShowSource] = useState(false);

  const selected = templates.find((t) => t.id === selectedId)!;
  const html = selected.buildHtml();
  const bytes = new Blob([html]).size;
  const accent = ACCENT_CONFIG[selected.accent];

  return (
    <div className="grid 2xl:grid-cols-3 gap-6 items-start">
      {/* Lista de plantillas */}
      <div className="2xl:col-span-1 min-w-0">
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <Mail size={16} className="text-amber-400" />
            <span className="text-white font-semibold text-sm">Correos al cliente</span>
            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
              {templates.length}
            </span>
          </div>

          <div className="divide-y divide-gray-900">
            {templates.map((t) => {
              const ac = ACCENT_CONFIG[t.accent];
              const isSelected = t.id === selectedId;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); setShowSource(false); }}
                  className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors ${
                    isSelected ? 'bg-amber-950/20' : 'hover:bg-gray-900/40'
                  }`}
                >
                  <span className={`flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg border flex items-center justify-center ${ac.color} ${ac.bg} ${ac.border}`}>
                    <Icon size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t.title}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">{t.subtitle}</p>
                  </div>
                  <ChevronRight size={14} className={`flex-shrink-0 mt-2 transition-colors ${isSelected ? 'text-amber-400' : 'text-gray-700'}`} />
                </button>
              );
            })}
          </div>

          <div className="px-5 py-3 border-t border-gray-900 bg-amber-950/10">
            <p className="text-[10px] text-amber-300/80 flex items-start gap-1.5">
              <Info size={11} className="flex-shrink-0 mt-0.5" />
              <span>
                Estos previews usan datos ficticios. Los emails reales se generan al disparar la acción correspondiente desde el módulo operativo.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="2xl:col-span-2 min-w-0 space-y-4">
        {/* Meta del template seleccionado */}
        <div className={`bg-gray-950 border ${accent.border} rounded-2xl overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${accent.border} ${accent.bg} flex items-center gap-3`}>
            <selected.icon size={18} className={accent.color} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{selected.title}</p>
              <p className="text-gray-500 text-[11px]">{selected.subtitle}</p>
            </div>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1">Asunto</p>
              <p className="text-white font-medium">{selected.subject}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1">Disparador</p>
              <p className="text-gray-300">{selected.trigger}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1">Destinatarios</p>
              <p className="text-gray-300">{selected.recipients}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-1">Tamaño HTML</p>
              <p className="text-gray-300 font-mono">{(bytes / 1024).toFixed(1)} KB</p>
            </div>
          </div>

          <div className="px-5 pb-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold mb-2">Editables (avisar al desarrollador para cambiar)</p>
            <ul className="space-y-1.5">
              {selected.edits.map((e, i) => (
                <li key={i} className="text-gray-400 text-xs flex items-start gap-2">
                  <span className={`flex-shrink-0 mt-1.5 w-1 h-1 rounded-full ${accent.color === 'text-amber-400' ? 'bg-amber-400' : 'bg-green-400'}`} />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={() => setShowSource(!showSource)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                showSource
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-black border-gray-800 text-gray-500 hover:text-amber-400 hover:border-amber-500/40'
              }`}
            >
              {showSource ? <Eye size={12} /> : <Code2 size={12} />}
              {showSource ? 'Ver render' : 'Ver código HTML'}
            </button>
          </div>
        </div>

        {/* Preview iframe o código */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-black">
            {showSource ? (
              <>
                <Code2 size={12} className="text-amber-400" />
                <span className="text-gray-400 text-xs font-mono">HTML source</span>
              </>
            ) : (
              <>
                <Eye size={12} className="text-amber-400" />
                <span className="text-gray-400 text-xs">Vista previa con datos de ejemplo</span>
                <span className="ml-auto text-gray-600 text-[10px] font-mono">cliente@ejemplo.com</span>
              </>
            )}
          </div>
          {showSource ? (
            <pre className="p-4 bg-black text-gray-400 text-[10px] overflow-x-auto max-h-[800px] overflow-y-auto whitespace-pre-wrap break-all">
              {html}
            </pre>
          ) : (
            <iframe
              srcDoc={html}
              title={`Preview ${selected.id}`}
              className="w-full bg-white"
              style={{ height: '900px' }}
              sandbox="allow-same-origin"
            />
          )}
        </div>

        <div className="flex items-start gap-2 p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg text-[11px] text-amber-300/80">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <p>
            Para editar contenido (textos, banners, fechas, datos bancarios) avisame qué template y qué cambio querés.
            Los HTML viven en <code className="font-mono text-amber-400">src/admin/emailTemplates.ts</code> y <code className="font-mono text-amber-400">src/admin/PreorderMailer.tsx</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
