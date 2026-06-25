import { createClient } from "@supabase/supabase-js";
import { sendEmail, renderEmail, esc, detailLignes, appUrl } from "@/lib/email";

// Relance automatique quotidienne : email aux propriétaires des pièces en retard.
// Déclenchée par un planificateur (Vercel Cron) — voir vercel.json.
// Sécurisée par CRON_SECRET ; nécessite SUPABASE_SERVICE_ROLE_KEY.

export const dynamic = "force-dynamic";

type PieceRetard = {
  id: number;
  titre_operation: string;
  numero_of: string | null;
  numero_serie: string | null;
  designation_article: string | null;
  echeance: string | null;
  proprietaire: { email: string; prenom: string } | null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquant." },
      { status: 500 },
    );
  }

  const admin = createClient(url, serviceKey);
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("pieces")
    .select(
      `id, titre_operation, numero_of, numero_serie, designation_article, echeance,
       proprietaire:users!proprietaire_courant_id ( email, prenom )`,
    )
    .lt("echeance", today)
    .neq("statut_courant", "terminee");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const pieces = (data as unknown as PieceRetard[]) ?? [];
  let sent = 0;
  for (const p of pieces) {
    if (!p.proprietaire?.email) continue;
    const ech = p.echeance
      ? new Date(p.echeance).toLocaleDateString("fr-FR")
      : "—";
    await sendEmail({
      to: p.proprietaire.email,
      subject: `⏰ Rappel : « ${p.titre_operation} » en retard`,
      html: renderEmail(
        "Pièce en retard",
        [
          `Bonjour ${esc(p.proprietaire.prenom)},`,
          `Cette pièce est <strong>en retard</strong> (échéance du ${esc(ech)}) :`,
          ...detailLignes({
            titre: p.titre_operation,
            designation: p.designation_article,
            numeroSerie: p.numero_serie,
            numeroOf: p.numero_of,
          }),
        ],
        appUrl() ? { label: "Ouvrir Tymios", url: appUrl() } : undefined,
      ),
    });
    sent++;
  }

  return Response.json({ ok: true, retards: pieces.length, emails: sent });
}
