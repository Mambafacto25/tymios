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

/** Gabarit HTML simple et sobre. */
export function renderEmail(titre: string, lignes: string[]): string {
  const corps = lignes
    .filter(Boolean)
    .map((l) => `<p style="margin:0 0 10px;color:#334155">${l}</p>`)
    .join("");
  return `
  <div style="background:#0a0638;padding:28px;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
      <div style="background:#191970;color:#fff;padding:18px 24px;font-weight:700;font-size:18px">Tymios</div>
      <div style="padding:24px">
        <h1 style="margin:0 0 14px;font-size:18px;color:#0f172a">${esc(titre)}</h1>
        ${corps}
      </div>
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
        Atelier horloger — notification automatique.
      </div>
    </div>
  </div>`;
}

export { esc };

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
