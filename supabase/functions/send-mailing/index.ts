import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://avantimexico.com";

function buildUnsubscribeUrl(token: string): string {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

function injectUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const footerSnippet = `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:0;">
    <tr>
      <td align="center" style="padding:16px 40px 24px;background-color:#050505;border-top:1px solid #111;">
        <p style="margin:0;color:#374151;font-size:11px;line-height:1.6;">
          Recibiste este correo porque te registraste o solicitaste información con AVANTI México Sales &amp; Operations.<br>
          Si ya no deseas recibir comunicaciones, puedes
          <a href="${unsubscribeUrl}" style="color:#d97706;text-decoration:underline;">darte de baja aquí</a>.
        </p>
      </td>
    </tr>
  </table>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${footerSnippet}</body>`);
  }
  return html + footerSnippet;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { emails, subject, body, isHtml, tokens } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere al menos un destinatario." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || !body) {
      return new Response(
        JSON.stringify({ error: "El asunto y el cuerpo son obligatorios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY no configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: unsubscribedRows } = await supabase
      .from("contact_leads")
      .select("email")
      .in("email", emails)
      .eq("unsubscribed", true);

    const unsubscribedSet = new Set(
      (unsubscribedRows || []).map((r: { email: string }) => r.email.toLowerCase())
    );

    const skipped = emails.filter((e: string) => unsubscribedSet.has(e.toLowerCase()));
    const filteredEmails = emails.filter((e: string) => !unsubscribedSet.has(e.toLowerCase()));
    const filteredTokens: (string | null)[] = Array.isArray(tokens)
      ? tokens.filter((_: unknown, i: number) => !unsubscribedSet.has(emails[i]?.toLowerCase()))
      : filteredEmails.map(() => null);

    if (filteredEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, skipped: skipped.length, errors: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < filteredEmails.length; i++) {
      const email = filteredEmails[i];
      const token = filteredTokens[i] || null;
      const unsubscribeUrl = token
        ? buildUnsubscribeUrl(token)
        : `${SITE_URL}/unsubscribe`;

      let html: string;

      if (isHtml) {
        html = injectUnsubscribeFooter(body, unsubscribeUrl);
      } else {
        const htmlBody = body
          .split("\n")
          .map((line: string) => `<p style="margin:0 0 12px 0;line-height:1.6;">${line || "&nbsp;"}</p>`)
          .join("");

        html = `<!DOCTYPE html>
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
              <p style="color:#6b7280;font-size:12px;margin:10px 0 0 0;letter-spacing:2px;text-transform:uppercase;">Sales &amp; Operations</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;color:#e5e7eb;font-size:15px;">
              ${htmlBody}
            </td>
          </tr>
          <tr>
            <td style="background-color:#050505;padding:24px 40px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="color:#4b5563;font-size:12px;margin:0 0 6px 0;">AVANTI México| Sales &amp; Operations</p>
              <p style="margin:0 0 12px 0;">
                <a href="https://avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">avantimexico.com</a>
                <span style="color:#374151;margin:0 8px;">·</span>
                <a href="mailto:contacto@avantimexico.com" style="color:#d97706;font-size:12px;text-decoration:none;">contacto@avantimexico.com</a>
              </p>
              <p style="margin:0;color:#374151;font-size:11px;">
                Si ya no deseas recibir correos, puedes
                <a href="${unsubscribeUrl}" style="color:#d97706;text-decoration:underline;">darte de baja aquí</a>.
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

      const headers: Record<string, string> = {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      };

      const emailPayload: Record<string, unknown> = {
        from: "AVANTI Sales & Operations <noreply@promo.avantimexico.com>",
        to: [email],
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:contacto@avantimexico.com?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify(emailPayload),
      });

      if (res.ok) {
        successCount++;
      } else {
        const err = await res.json();
        const detail = err.message || err.name || JSON.stringify(err);
        errors.push(`${email}: [${res.status}] ${detail}`);
      }
    }

    if (successCount === 0 && errors.length > 0) {
      return new Response(
        JSON.stringify({ error: errors[0], errors, sent: 0, failed: errors.length, skipped: skipped.length }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: errors.length,
        skipped: skipped.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
