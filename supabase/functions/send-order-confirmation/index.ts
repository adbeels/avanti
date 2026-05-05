import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItem {
  product: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  notes: string;
}

function formatMXN(n: number): string {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildOrderHtml(customer: Customer, items: OrderItem[], total: number): string {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:14px;">${item.product}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:14px;text-align:right;">${formatMXN(item.unit_price)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1f1f1f;color:#f5f5f5;font-size:14px;text-align:right;font-weight:bold;">${formatMXN(item.subtotal)}</td>
    </tr>`
    )
    .join("");

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
              <p style="color:#6b7280;font-size:12px;margin:10px 0 0 0;letter-spacing:2px;text-transform:uppercase;"> </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 20px;">
              <h1 style="color:#f5f5f5;font-size:22px;margin:0 0 8px 0;font-weight:800;">Confirmación de prepedido</h1>
              <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.6;">
                Hola <strong style="color:#e5e7eb;">${customer.name}</strong>, hemos recibido tu solicitud de prepedido.
                Un asesor de AVANTI te contactara para confirmar disponibilidad, pago y entrega.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #1f1f1f;">
                    <p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Datos del cliente</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280;font-size:12px;padding:4px 0;" width="35%">Nombre</td>
                        <td style="color:#e5e7eb;font-size:13px;padding:4px 0;">${customer.name}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:12px;padding:4px 0;">Correo</td>
                        <td style="color:#e5e7eb;font-size:13px;padding:4px 0;">${customer.email}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:12px;padding:4px 0;">Telefono</td>
                        <td style="color:#e5e7eb;font-size:13px;padding:4px 0;">${customer.phone}</td>
                      </tr>
                      ${customer.company ? `<tr><td style="color:#6b7280;font-size:12px;padding:4px 0;">Empresa</td><td style="color:#e5e7eb;font-size:13px;padding:4px 0;">${customer.company}</td></tr>` : ""}
                      ${customer.city || customer.state ? `<tr><td style="color:#6b7280;font-size:12px;padding:4px 0;">Ubicación</td><td style="color:#e5e7eb;font-size:13px;padding:4px 0;">${[customer.city, customer.state].filter(Boolean).join(", ")}</td></tr>` : ""}
                      ${customer.notes ? `<tr><td style="color:#6b7280;font-size:12px;padding:4px 0;">Notas</td><td style="color:#e5e7eb;font-size:13px;padding:4px 0;">${customer.notes}</td></tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 24px;">
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
                  <td colspan="3" style="padding:14px 16px;text-align:right;color:#9ca3af;font-size:14px;font-weight:600;">Total estimado</td>
                  <td style="padding:14px 16px;text-align:right;color:#d97706;font-size:18px;font-weight:800;">${formatMXN(total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#d97706;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;">
                    <p style="color:#000;font-size:13px;font-weight:700;margin:0;">
                      Este es un prepedido. Un asesor te contactara para confirmar disponibilidad y condiciones.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#050505;padding:24px 40px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0 0 6px 0;">AVANTI México| Sales &amp; Operations</p>
              <p style="margin:0;">
                <a href="https://avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">avantimexico.com</a>
                <span style="color:#374151;margin:0 8px;">&middot;</span>
                <a href="mailto:contacto@avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">contacto@avantimexico.com</a>
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY no configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { customer, items, total } = await req.json() as {
      customer: Customer;
      items: OrderItem[];
      total: number;
    };

    if (!customer?.email || !items?.length) {
      return new Response(
        JSON.stringify({ error: "Datos incompletos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = buildOrderHtml(customer, items, total);

    const customerEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AVANTI México Sales & Operations <noreply@promo.avantimexico.com>",
        to: [customer.email],
        cc: ["contacto@avantimexico.com", "pedidos@avantimexico.com"],
        subject: `Confirmación de prepedido - Avanti México, Sales & Operation`,
        html,
      }),
    });

    if (!customerEmail.ok) {
      const err = await customerEmail.json();
      return new Response(
        JSON.stringify({ error: `Error al enviar correo: ${err.message || JSON.stringify(err)}` }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
