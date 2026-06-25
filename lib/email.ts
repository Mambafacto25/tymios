// Envoi d'emails transactionnels via Resend (API REST, sans dépendance).
// No-op tant que RESEND_API_KEY n'est pas défini -> l'app fonctionne sans.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Gabarit HTML soigné (thème Tymios, accent or). */
export function renderEmail(
  titre: string,
  lignes: string[],
  cta?: { label: string; url: string },
): string {
  const corps = lignes
    .filter(Boolean)
    .map(
      (l) =>
        `<p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.55">${l}</p>`,
    )
    .join("");

  const bouton = cta
    ? `<tr><td style="padding:8px 0 4px">
         <a href="${esc(cta.url)}" style="display:inline-block;background:#191970;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px">${esc(cta.label)}</a>
       </td></tr>`
    : "";

  return `
  <div style="background:#0a0638;padding:32px 16px;font-family:ui-sans-serif,system-ui,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.35)">
      <tr>
        <td style="background:linear-gradient(135deg,#191970 0%,#2b2b8f 100%);padding:22px 26px">
          <table role="presentation" width="100%"><tr>
            <td style="color:#fff;font-weight:800;font-size:20px;letter-spacing:.3px">Tymios</td>
            <td align="right" style="color:#c7d2fe;font-size:12px">Atelier horloger</td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:3px;background:linear-gradient(90deg,#F0D879,#CFB53B,#F0D879)"></td></tr>
      <tr>
        <td style="padding:28px 26px">
          <h1 style="margin:0 0 16px;font-size:19px;color:#0f172a;font-weight:700">${esc(titre)}</h1>
          <table role="presentation" width="100%"><tr><td>${corps}</td></tr>${bouton}</table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 26px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;line-height:1.5">
          Suivi de pièces, relais entre établis et pointage du temps.<br/>
          Notification automatique — merci de ne pas répondre.
        </td>
      </tr>
    </table>
  </div>`;
}

export { esc };

/** URL publique de l'app (pour les boutons d'email), si configurée. */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !opts.to) return; // non configuré -> on n'envoie rien
  const from = process.env.EMAIL_FROM || "Tymios <onboarding@resend.dev>";
  try {
    await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
  } catch {
    // best effort : un échec d'email ne doit jamais bloquer l'action
  }
}
