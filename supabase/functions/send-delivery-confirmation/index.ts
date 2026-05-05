import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function formatMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

interface ItemRow {
  product: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

function buildHtml(d: {
  customer_name: string;
  order_folio: string;
  delivery_folio: string;
  signed_at: string;
  receiver_name: string;
  signed_method: "pickup" | "courier" | "wholesale";
  warehouse_code: string;
  delivery_address: string;
  signature_data_url: string;
  items: ItemRow[];
  total: number;
  notes?: string;
}): string {
  const methodLabel: Record<string, string> = {
    pickup: "Retiro en oficina",
    courier: "Envio por mensajero",
    wholesale: "Entrega especial mayorista",
  };
  const rows = d.items.map((item) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;">${item.product}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;text-align:center;">${item.qty}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#e5e7eb;font-size:13px;text-align:right;">${formatMXN(item.unit_price)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#f5f5f5;font-size:13px;text-align:right;font-weight:bold;">${formatMXN(item.subtotal)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a0a0a;border:1px solid #1f1f1f;border-radius:16px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:32px 40px;border-bottom:1px solid #1f1f1f;text-align:center;">
    <img src="https://avantimexico.com/img/avantiW.png" alt="AVANTI" height="48" style="display:inline-block;" />
  </td></tr>
  <tr><td style="padding:32px 40px 20px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,#14532d,#052e16);border:1px solid #166534;border-radius:50%;width:72px;height:72px;line-height:72px;text-align:center;margin-bottom:20px;"><span style="font-size:32px;line-height:72px;display:inline-block;">&#10003;</span></div>
    <p style="color:#16a34a;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;">Entrega Confirmada</p>
    <h1 style="color:#f5f5f5;font-size:24px;margin:0 0 12px 0;font-weight:800;">Tu pedido fue entregado</h1>
    <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.7;max-width:440px;display:inline-block;">Hola <strong style="color:#e5e7eb;">${d.customer_name}</strong>, gracias por tu compra. Confirmamos la entrega de tu pedido <strong style="color:#d97706;">${d.order_folio}</strong>. Adjuntamos el comprobante con la firma del receptor.</p>
  </td></tr>
  <tr><td style="padding:0 40px 20px;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#052e16;border:1px solid #166534;border-radius:12px;overflow:hidden;"><tr><td style="padding:20px 24px;"><table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 0;border-bottom:1px solid #14532d;"><span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Comprobante</span></td><td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;"><span style="color:#d97706;font-size:13px;font-weight:800;font-family:monospace;letter-spacing:2px;">${d.delivery_folio}</span></td></tr>
    <tr><td style="padding:6px 0;border-bottom:1px solid #14532d;"><span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Pedido</span></td><td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;"><span style="color:#e5e7eb;font-size:13px;font-family:monospace;">${d.order_folio}</span></td></tr>
    <tr><td style="padding:6px 0;border-bottom:1px solid #14532d;"><span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Recibido por</span></td><td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;"><span style="color:#e5e7eb;font-size:13px;">${d.receiver_name}</span></td></tr>
    <tr><td style="padding:6px 0;border-bottom:1px solid #14532d;"><span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Modalidad</span></td><td style="padding:6px 0;border-bottom:1px solid #14532d;text-align:right;"><span style="color:#e5e7eb;font-size:13px;">${methodLabel[d.signed_method]}</span></td></tr>
    <tr><td style="padding:6px 0;${d.delivery_address ? "border-bottom:1px solid #14532d;" : ""}"><span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fecha</span></td><td style="padding:6px 0;${d.delivery_address ? "border-bottom:1px solid #14532d;" : ""}text-align:right;"><span style="color:#e5e7eb;font-size:13px;">${formatDate(d.signed_at)}</span></td></tr>
    ${d.delivery_address ? `<tr><td style="padding:6px 0;"><span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Direccion</span></td><td style="padding:6px 0;text-align:right;"><span style="color:#e5e7eb;font-size:12px;">${d.delivery_address}</span></td></tr>` : ""}
  </table></td></tr></table></td></tr>
  <tr><td style="padding:0 40px 20px;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:16px;border-bottom:1px solid #1f1f1f;" colspan="4"><p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Productos entregados</p></td></tr>
    <tr style="background-color:#0d0d0d;"><td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Producto</td><td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Cant.</td><td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">P. Unit.</td><td style="padding:10px 16px;border-bottom:1px solid #1f1f1f;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Subtotal</td></tr>
    ${rows}
    <tr><td colspan="3" style="padding:14px 16px;text-align:right;color:#9ca3af;font-size:14px;font-weight:600;">Total</td><td style="padding:14px 16px;text-align:right;color:#22c55e;font-size:18px;font-weight:800;">${formatMXN(d.total)}</td></tr>
  </table></td></tr>
  <tr><td style="padding:0 40px 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:16px;border-bottom:1px solid #1f1f1f;"><p style="color:#d97706;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0;">Firma del receptor</p></td></tr>
    <tr><td style="padding:20px;background-color:#ffffff;text-align:center;"><img src="${d.signature_data_url}" alt="Firma" style="max-width:100%;max-height:160px;display:inline-block;" /></td></tr>
    <tr><td style="padding:12px 16px;border-top:1px solid #1f1f1f;text-align:center;"><p style="color:#9ca3af;font-size:12px;margin:0;">Firmado por <strong style="color:#e5e7eb;">${d.receiver_name}</strong></p><p style="color:#6b7280;font-size:10px;margin:4px 0 0 0;">${formatDate(d.signed_at)}</p></td></tr>
  </table></td></tr>
  ${d.notes ? `<tr><td style="padding:0 40px 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;"><tr><td style="padding:14px 18px;"><p style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px 0;">Notas</p><p style="color:#e5e7eb;font-size:13px;margin:0;line-height:1.5;">${d.notes}</p></td></tr></table></td></tr>` : ""}
  <tr><td style="padding:0 40px 32px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#d97706,#b45309);border-radius:10px;"><tr><td style="padding:20px 24px;text-align:center;"><p style="color:#000;font-size:15px;font-weight:800;margin:0 0 6px 0;">&iexcl;Gracias por tu compra, ${d.customer_name}!</p><p style="color:#000;font-size:12px;font-weight:500;margin:0;opacity:0.85;">Si necesitas factura o tienes alguna observaci&oacute;n, responde este correo.</p></td></tr></table></td></tr>
  <tr><td style="background-color:#050505;padding:24px 40px;border-top:1px solid #1f1f1f;text-align:center;"><p style="color:#4b5563;font-size:12px;margin:0 0 6px 0;">AVANTI Mexico | Sales &amp; Operations</p><p style="margin:0;"><a href="https://avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">avantimexico.com</a><span style="color:#374151;margin:0 8px;">&middot;</span><a href="mailto:pedidos@avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">pedidos@avantimexico.com</a></p><p style="color:#374151;font-size:10px;margin:8px 0 0 0;">${d.warehouse_code}</p></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY no configurada." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { delivery_document_id } = await req.json();
    if (!delivery_document_id) {
      return new Response(JSON.stringify({ error: "Falta delivery_document_id." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: doc, error: docErr } = await supabase
      .from("delivery_documents")
      .select(`*,
               order:preorders(name, email, folio, legacy_order_number, order_number, total),
               warehouse:warehouses(code, name)`)
      .eq("id", delivery_document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: docErr?.message ?? "Documento no encontrado." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (doc.status !== "signed") {
      return new Response(JSON.stringify({
        error: `Solo se puede enviar comprobante de docs firmados (status actual: ${doc.status}).`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!doc.signature_data_url || !doc.receiver_name) {
      return new Response(JSON.stringify({ error: "Documento sin firma o receptor." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: itemsData } = await supabase
      .from("delivery_document_items")
      .select("qty_delivered, order_item:order_items(unit_price), product:products(name)")
      .eq("delivery_document_id", delivery_document_id);

    // deno-lint-ignore no-explicit-any
    const items: ItemRow[] = (itemsData || []).map((it: any) => {
      const qty = Number(it.qty_delivered);
      const unit_price = Number(it.order_item?.unit_price ?? 0);
      return {
        product: it.product?.name ?? "Producto",
        qty,
        unit_price,
        subtotal: qty * unit_price,
      };
    });

    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const orderFolio = doc.order?.folio || doc.order?.legacy_order_number || doc.order?.order_number || "";
    const customerName = doc.order?.name || "Cliente";
    const customerEmail = doc.order?.email;

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "El pedido no tiene email del cliente." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildHtml({
      customer_name: customerName,
      order_folio: orderFolio,
      delivery_folio: doc.folio,
      signed_at: doc.signed_at,
      receiver_name: doc.receiver_name,
      signed_method: doc.signed_method,
      warehouse_code: doc.warehouse?.code ?? "",
      delivery_address: doc.delivery_address || "",
      signature_data_url: doc.signature_data_url,
      items,
      total,
      notes: doc.notes || undefined,
    });

    const subject = `Comprobante de entrega ${doc.folio} - Avanti Mexico`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "AVANTI Mexico Sales & Operations <noreply@promo.avantimexico.com>",
        to: [customerEmail],
        cc: ["contacto@avantimexico.com", "pedidos@avantimexico.com"],
        reply_to: "pedidos@avantimexico.com",
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}));
      return new Response(JSON.stringify({
        error: `Error Resend: ${err.message || JSON.stringify(err)}`,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase
      .from("delivery_documents")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", delivery_document_id);

    return new Response(JSON.stringify({
      success: true,
      delivery_folio: doc.folio,
      sent_to: customerEmail,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Error interno del servidor.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
