import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function formatMXN(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function buildPaymentHtml(preorder: Record<string, unknown>, bankInfo: string): string {
  const items = preorder.items as { product: string; quantity: number; unit_price: number; subtotal: number }[];
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;">${item.product}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;text-align:right;">${formatMXN(item.unit_price)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#f5f5f5;font-size:13px;text-align:right;font-weight:bold;">${formatMXN(item.subtotal)}</td>
    </tr>`
    )
    .join("");

  const bankInfoResolved = bankInfo.replace(
    "[número de pedido]",
    String(preorder.order_number)
  );

  const bankLines = bankInfoResolved
    .split("\n")
    .map((line: string) => `<p style="margin:0 0 4px 0;color:#e5e7eb;font-size:13px;">${line || "&nbsp;"}</p>`)
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
                  <td style="padding:14px 16px;text-align:right;color:#d97706;font-size:18px;font-weight:800;">${formatMXN(preorder.total as number)}</td>
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
                  <td style="padding:16px;">${bankLines}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#d97706;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;">
                    <p style="color:#000;font-size:13px;font-weight:700;margin:0 0 4px 0;">Gracias por tu pedido, te esperamos el 30 de abril.</p>
                    <p style="color:#000;font-size:12px;font-weight:500;margin:0;">Cualquier duda escríbenos a pedidos@avantimexico.com</p>
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY no configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: settings } = await supabase
      .from("auto_send_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!settings?.enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Auto-send is disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const delayMinutes: number = settings.delay_minutes ?? 0;
    const cutoffTime = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString();

    const { data: pendingOrders, error: fetchError } = await supabase
      .from("preorders")
      .select("*")
      .eq("status", "pending")
      .is("email_sent_at", null)
      .lte("created_at", cutoffTime);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending orders to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const preorder of pendingOrders) {
      try {
        const bankInfo = settings.bank_info.replace("[número de pedido]", preorder.order_number);
        const html = buildPaymentHtml(preorder, bankInfo);

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "AVANTI Mexico Sales & Operations <noreply@promo.avantimexico.com>",
            to: [preorder.email],
            cc: ["contacto@avantimexico.com", "pedidos@avantimexico.com"],
            reply_to: "pedidos@avantimexico.com",
            subject: settings.subject,
            html,
          }),
        });

        if (!resendRes.ok) {
          const err = await resendRes.json();
          errors.push(`${preorder.order_number}: ${err.message || "Resend error"}`);
          failCount++;
          continue;
        }

        await supabase
          .from("preorders")
          .update({
            email_sent_at: new Date().toISOString(),
            status: "contacted",
          })
          .eq("id", preorder.id);

        successCount++;
      } catch (err: unknown) {
        errors.push(`${preorder.order_number}: ${err instanceof Error ? err.message : "unknown error"}`);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({ processed: successCount, failed: failCount, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
