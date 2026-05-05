export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  html: string;
  variables: string[];
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'mundial-2026',
    name: 'Campaña Mundial 2026',
    description: 'Campaña temática de fútbol para posicionamiento de marca',
    subject: '¡Llena tu álbum de éxito! — AVANTI México Sales & Operations',
    variables: ['nombre', 'empresa', 'email', 'unsubscribe_url'],
    html: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campaña Mundial Avanti</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .header { background-color: #000000; padding: 30px; text-align: center; }
        .header img { max-width: 200px; }
        .hero { background: linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c); padding: 40px 20px; text-align: center; color: #000; }
        .content { padding: 30px; color: #333333; line-height: 1.6; }
        .card-container { display: flex; justify-content: space-around; margin: 20px 0; }
        .panini-card { border: 2px solid #b38728; border-radius: 10px; padding: 10px; width: 40%; text-align: center; background: #fff; }
        .button { display: inline-block; padding: 15px 30px; background-color: #000; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://avantimexico.com/panini_logo.png" alt="AVANTI Sales & Operations">
        </div>

        <div class="hero">
            <h1 style="margin:0;">¡LLENA TU ÁLBUM DE ÉXITO!</h1>
            <p style="font-size: 18px;">En este Mundial, que no te falte ninguna estampa en tu operación comercial.</p>
        </div>

        <div class="content">
            <p>Hola {{nombre}},</p>
            <p>Sabemos que en el mundo de las ventas, como en el fútbol, tener a los mejores en cada posición es lo que garantiza el trofeo. En <strong>AVANTI México Sales &amp; Operations</strong>, tenemos las "estampas doradas" que{{empresa}} necesita para ganar en el mercado mexicano.</p>

            <div class="card-container">
                <div class="panini-card">
                    <span style="font-size: 40px;">🏆</span>
                    <p><strong>Ventas Multicanal</strong></p>
                </div>
                <div class="panini-card">
                    <span style="font-size: 40px;">⚙️</span>
                    <p><strong>Operación Maestra</strong></p>
                </div>
            </div>

            <p>¿Listo para intercambiar estrategias y llevar tu negocio a la final?</p>

            <center>
                <a href="https://avantimexico.com/?distribuidor-album-mundial-2026&nombre={{nombre}}&email={{email}}" class="button">¡CONSIGUE TU ESTAMPA DORADA!</a>
            </center>
        </div>

        <div class="footer">
            <p>AVANTI México Sales &amp; Operations | México<br>
            <a href="https://avantimexico.com" style="color: #b38728;">www.avantimexico.com</a></p>
            <p>Recibiste este correo porque solicitaste información con AVANTI.<br>
            Si ya no deseas recibir comunicaciones, <a href="{{unsubscribe_url}}" style="color:#b38728;">date de baja aquí</a>.</p>
        </div>
    </div>
</body>
</html>`,
  },
];

export function buildPaymentConfirmedHtml(preorder: {
  order_number: string;
  name: string;
  email: string;
  company?: string;
  items: { product: string; quantity: number; unit_price: number; subtotal: number }[];
  total: number;
  payment_method?: string;
  payment_confirmed_at?: string | null;
}): string {
  const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

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

  const confirmedDate = preorder.payment_confirmed_at
    ? new Date(preorder.payment_confirmed_at).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a0a0a;border:1px solid #1f1f1f;border-radius:16px;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:32px 40px;border-bottom:1px solid #1f1f1f;text-align:center;">
              <img src="https://avantimexico.com/img/avantiW.png" alt="AVANTI" height="48" style="display:inline-block;" />
            </td>
          </tr>

          <!-- HERO CONFIRMACION -->
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#14532d,#052e16);border:1px solid #166534;border-radius:50%;width:72px;height:72px;line-height:72px;text-align:center;margin-bottom:20px;">
                <span style="font-size:32px;line-height:72px;display:inline-block;">&#10003;</span>
              </div>
              <p style="color:#16a34a;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">Pago Confirmado</p>
              <h1 style="color:#f5f5f5;font-size:24px;margin:0 0 12px 0;font-weight:800;">Tu pago fue recibido con exito</h1>
              <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.7;max-width:420px;display:inline-block;">
                Hola <strong style="color:#e5e7eb;">${preorder.name}</strong>,
                hemos confirmado la recepcion de tu pago correspondiente al pedido
                <strong style="color:#d97706;">${preorder.order_number}</strong>.
              </p>
            </td>
          </tr>

          <!-- RESUMEN PAGO -->
          <tr>
            <td style="padding:0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#052e16;border:1px solid #166534;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">No. Pedido</span>
                        </td>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;">
                          <span style="color:#d97706;font-size:13px;font-weight:800;font-family:monospace;letter-spacing:2px;">${preorder.order_number}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fecha de confirmacion</span>
                        </td>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;">
                          <span style="color:#e5e7eb;font-size:13px;">${confirmedDate}</span>
                        </td>
                      </tr>
                      ${preorder.payment_method ? `
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Forma de pago</span>
                        </td>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;">
                          <span style="color:#e5e7eb;font-size:13px;">${preorder.payment_method}</span>
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:10px 0 0 0;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total pagado</span>
                        </td>
                        <td style="padding:10px 0 0 0;text-align:right;">
                          <span style="color:#22c55e;font-size:20px;font-weight:800;">${formatMXN(preorder.total)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DETALLE DEL PEDIDO -->
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
                  <td colspan="3" style="padding:14px 16px;text-align:right;color:#9ca3af;font-size:14px;font-weight:600;">Total</td>
                  <td style="padding:14px 16px;text-align:right;color:#22c55e;font-size:18px;font-weight:800;">${formatMXN(preorder.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PROXIMOS PASOS -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #1f1f1f;">
                    <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Proximos pasos</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;vertical-align:top;">
                          <span style="display:inline-block;background-color:#16a34a;color:#fff;font-size:11px;font-weight:800;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;margin-right:10px;">1</span>
                          <span style="color:#e5e7eb;font-size:13px;line-height:1.6;">El lanzamiento oficial y <strong style="color:#d97706;">entrega de tu producto es el 8 de mayo</strong>.</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;vertical-align:top;">
                          <span style="display:inline-block;background-color:#16a34a;color:#fff;font-size:11px;font-weight:800;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;margin-right:10px;">2</span>
                          <span style="color:#e5e7eb;font-size:13px;line-height:1.6;">Puedes recoger tu pedido en <strong style="color:#d97706;">Calle 28 de diciembre #23, Col. Emiliano Zapata, Coyoacan, CDMX, CP 04815</strong> en horario laboral lunes a jueves de 9 a 17 hrs.</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;vertical-align:top;">
                          <span style="display:inline-block;background-color:#16a34a;color:#fff;font-size:11px;font-weight:800;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;margin-right:10px;">3</span>
                          <span style="color:#e5e7eb;font-size:13px;line-height:1.6;">Si prefieres envio, coordina tu recoleccion mandando un Uber o Didi y notifica previamente al <a href="https://wa.me/5215523185134" style="color:#d97706;text-decoration:none;">55 2318 5134</a> via WhatsApp. <em style="color:#9ca3af;">El costo del envio no esta incluido.</em></span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;vertical-align:top;">
                          <span style="display:inline-block;background-color:#16a34a;color:#fff;font-size:11px;font-weight:800;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;margin-right:10px;">4</span>
                          <span style="color:#e5e7eb;font-size:13px;line-height:1.6;">Si necesitas <strong style="color:#d97706;">factura</strong>, envianos tu constancia de situacion fiscal y datos fiscales a <a href="mailto:pedidos@avantimexico.com" style="color:#d97706;text-decoration:none;">pedidos@avantimexico.com</a>.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BANNER CIERRE -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#d97706,#b45309);border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="color:#000;font-size:15px;font-weight:800;margin:0 0 6px 0;">
                      Gracias por tu compra, ${preorder.name}!
                    </p>
                    <p style="color:#000;font-size:12px;font-weight:500;margin:0;opacity:0.8;">
                      Eres parte de los primeros en disfrutar el Album del Mundial 2026. Nos vemos el 8 de mayo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#050505;padding:24px 40px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0 0 6px 0;">AVANTI Mexico | Sales &amp; Operations</p>
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

export function buildDeliveryReadyHtml(preorder: {
  order_number: string;
  name: string;
  email: string;
  company?: string;
  items: { product: string; quantity: number; unit_price: number; subtotal: number }[];
  total: number;
}): string {
  const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

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

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a0a0a;border:1px solid #1f1f1f;border-radius:16px;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:32px 40px;border-bottom:1px solid #1f1f1f;text-align:center;">
              <img src="https://avantimexico.com/img/avantiW.png" alt="AVANTI" height="48" style="display:inline-block;" />
            </td>
          </tr>

          <!-- HERO LISTO -->
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#7c2d12,#431407);border:1px solid #d97706;border-radius:50%;width:72px;height:72px;line-height:72px;text-align:center;margin-bottom:20px;">
                <span style="font-size:32px;line-height:72px;display:inline-block;">&#127942;</span>
              </div>
              <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">Tu pedido esta listo</p>
              <h1 style="color:#f5f5f5;font-size:24px;margin:0 0 12px 0;font-weight:800;">Ya puedes recoger tu Album del Mundial 2026</h1>
              <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.7;max-width:440px;display:inline-block;">
                Hola <strong style="color:#e5e7eb;">${preorder.name}</strong>,
                tu pedido <strong style="color:#d97706;">${preorder.order_number}</strong> ya esta preparado y listo para entregarte.
              </p>
            </td>
          </tr>

          <!-- DETALLE DEL PEDIDO -->
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
                  <td colspan="3" style="padding:14px 16px;text-align:right;color:#9ca3af;font-size:14px;font-weight:600;">Total</td>
                  <td style="padding:14px 16px;text-align:right;color:#22c55e;font-size:18px;font-weight:800;">${formatMXN(preorder.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- COMO RECOGER -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #1f1f1f;">
                    <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Como recibirlo</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;vertical-align:top;">
                          <span style="display:inline-block;background-color:#d97706;color:#000;font-size:11px;font-weight:800;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;margin-right:10px;">1</span>
                          <span style="color:#e5e7eb;font-size:13px;line-height:1.6;"><strong style="color:#d97706;">Retiro presencial</strong> en <strong style="color:#e5e7eb;">Calle 28 de diciembre #23, Col. Emiliano Zapata, Coyoacan, CDMX, CP 04815</strong>, lunes a jueves de 9 a 17 hrs.</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;vertical-align:top;">
                          <span style="display:inline-block;background-color:#d97706;color:#000;font-size:11px;font-weight:800;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;margin-right:10px;">2</span>
                          <span style="color:#e5e7eb;font-size:13px;line-height:1.6;"><strong style="color:#d97706;">Coordinar Uber o Didi</strong>: envia un mensaje al <a href="https://wa.me/5215523185134" style="color:#d97706;text-decoration:none;">55 2318 5134</a> via WhatsApp para coordinar la entrega al mensajero. <em style="color:#9ca3af;">El costo del envio corre por tu cuenta.</em></span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;vertical-align:top;">
                          <span style="display:inline-block;background-color:#d97706;color:#000;font-size:11px;font-weight:800;border-radius:50%;width:22px;height:22px;line-height:22px;text-align:center;margin-right:10px;">3</span>
                          <span style="color:#e5e7eb;font-size:13px;line-height:1.6;"><strong style="color:#d97706;">Mayoristas</strong>: si acordamos contigo una entrega especial, nos pondremos en contacto al WhatsApp <a href="https://wa.me/5215523185134" style="color:#d97706;text-decoration:none;">55 2318 5134</a> para coordinar fecha y direccion sin costo.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BANNER CIERRE -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#d97706,#b45309);border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="color:#000;font-size:15px;font-weight:800;margin:0 0 6px 0;">
                      Gracias por tu compra, ${preorder.name}!
                    </p>
                    <p style="color:#000;font-size:12px;font-weight:500;margin:0;opacity:0.85;">
                      Disfruta el Album del Mundial 2026 antes que nadie.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#050505;padding:24px 40px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0 0 6px 0;">AVANTI Mexico | Sales &amp; Operations</p>
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

export function buildDeliveryConfirmationHtml(data: {
  customer_name: string;
  order_folio: string;          // ORD-2026-NNNN o legacy
  delivery_folio: string;       // DEL-2026-NNNN
  signed_at: string;            // ISO
  receiver_name: string;
  signed_method: 'pickup' | 'courier' | 'wholesale';
  warehouse_code: string;
  delivery_address: string;
  signature_data_url: string;   // PNG base64 data URL
  items: { product: string; qty: number; unit_price: number; subtotal: number }[];
  total: number;
  notes?: string;
}): string {
  const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const methodLabel: Record<typeof data.signed_method, string> = {
    pickup:    'Retiro en oficina',
    courier:   'Envio por mensajero',
    wholesale: 'Entrega especial mayorista',
  };

  const rows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;">${item.product}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;text-align:center;">${item.qty}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;text-align:right;">${formatMXN(item.unit_price)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#f5f5f5;font-size:13px;text-align:right;font-weight:bold;">${formatMXN(item.subtotal)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a0a0a;border:1px solid #1f1f1f;border-radius:16px;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:32px 40px;border-bottom:1px solid #1f1f1f;text-align:center;">
              <img src="https://avantimexico.com/img/avantiW.png" alt="AVANTI" height="48" style="display:inline-block;" />
            </td>
          </tr>

          <!-- HERO ENTREGA CONFIRMADA -->
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#14532d,#052e16);border:1px solid #166534;border-radius:50%;width:72px;height:72px;line-height:72px;text-align:center;margin-bottom:20px;">
                <span style="font-size:32px;line-height:72px;display:inline-block;">&#10003;</span>
              </div>
              <p style="color:#16a34a;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">Entrega Confirmada</p>
              <h1 style="color:#f5f5f5;font-size:24px;margin:0 0 12px 0;font-weight:800;">Tu pedido fue entregado</h1>
              <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.7;max-width:440px;display:inline-block;">
                Hola <strong style="color:#e5e7eb;">${data.customer_name}</strong>,
                gracias por tu compra. Confirmamos la entrega de tu pedido
                <strong style="color:#d97706;">${data.order_folio}</strong>.
                Adjuntamos el comprobante con la firma del receptor.
              </p>
            </td>
          </tr>

          <!-- RESUMEN DE LA ENTREGA -->
          <tr>
            <td style="padding:0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#052e16;border:1px solid #166534;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Comprobante</span>
                        </td>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;">
                          <span style="color:#d97706;font-size:13px;font-weight:800;font-family:monospace;letter-spacing:2px;">${data.delivery_folio}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Pedido</span>
                        </td>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;">
                          <span style="color:#e5e7eb;font-size:13px;font-family:monospace;">${data.order_folio}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Recibido por</span>
                        </td>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;">
                          <span style="color:#e5e7eb;font-size:13px;">${data.receiver_name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Modalidad</span>
                        </td>
                        <td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;">
                          <span style="color:#e5e7eb;font-size:13px;">${methodLabel[data.signed_method]}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;${data.delivery_address ? 'border-bottom:1px solid #14532d;' : ''}">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fecha</span>
                        </td>
                        <td style="padding:6px 0;${data.delivery_address ? 'border-bottom:1px solid #14532d;' : ''}text-align:right;">
                          <span style="color:#e5e7eb;font-size:13px;">${formatDate(data.signed_at)}</span>
                        </td>
                      </tr>
                      ${data.delivery_address ? `
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Direccion</span>
                        </td>
                        <td style="padding:6px 0;text-align:right;">
                          <span style="color:#e5e7eb;font-size:12px;">${data.delivery_address}</span>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DETALLE DE PRODUCTOS -->
          <tr>
            <td style="padding:0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #1f1f1f;" colspan="4">
                    <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Productos entregados</p>
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
                  <td colspan="3" style="padding:14px 16px;text-align:right;color:#9ca3af;font-size:14px;font-weight:600;">Total</td>
                  <td style="padding:14px 16px;text-align:right;color:#22c55e;font-size:18px;font-weight:800;">${formatMXN(data.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FIRMA EMBEBIDA -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #1f1f1f;">
                    <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Firma del receptor</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;background-color:#ffffff;text-align:center;">
                    <img src="${data.signature_data_url}" alt="Firma" style="max-width:100%;max-height:160px;display:inline-block;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-top:1px solid #1f1f1f;text-align:center;">
                    <p style="color:#9ca3af;font-size:12px;margin:0;">Firmado por <strong style="color:#e5e7eb;">${data.receiver_name}</strong></p>
                    <p style="color:#6b7280;font-size:10px;margin:4px 0 0 0;">${formatDate(data.signed_at)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${data.notes ? `
          <!-- NOTAS -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px 0;">Notas</p>
                    <p style="color:#e5e7eb;font-size:13px;margin:0;line-height:1.5;">${data.notes}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- BANNER CIERRE -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#d97706,#b45309);border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="color:#000;font-size:15px;font-weight:800;margin:0 0 6px 0;">
                      &iexcl;Gracias por tu compra, ${data.customer_name}!
                    </p>
                    <p style="color:#000;font-size:12px;font-weight:500;margin:0;opacity:0.85;">
                      Si necesitas factura o tienes alguna observaci&oacute;n, responde este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#050505;padding:24px 40px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0 0 6px 0;">AVANTI Mexico | Sales &amp; Operations</p>
              <p style="margin:0;">
                <a href="https://avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">avantimexico.com</a>
                <span style="color:#374151;margin:0 8px;">&middot;</span>
                <a href="mailto:pedidos@avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">pedidos@avantimexico.com</a>
              </p>
              <p style="color:#374151;font-size:10px;margin:8px 0 0 0;">${data.warehouse_code}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function applyTemplateVariables(
  html: string,
  variables: Record<string, string>
): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value || '');
  }
  return result;
}
