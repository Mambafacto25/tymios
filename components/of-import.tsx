"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importOfsAction } from "@/app/actions/ofs";
import { Modal } from "@/components/modal";

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) if (row[k]) return row[k];
  return "";
}

/** dd/mm/yyyy -> yyyy-mm-dd ; laisse passer yyyy-mm-dd ; sinon null. */
function normalizeDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length === 0) return [];
  const semi = lines[0].split(";").length;
  const comma = lines[0].split(",").length;
  const delim = semi > comma ? ";" : ",";
  const headers = splitLine(lines[0], delim).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_"),
  );
  return lines.slice(1).map((line) => {
    const cells = splitLine(line, delim);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return {
      numero_of: pick(row, ["numero_of", "of", "n_of", "n°_of", "numéro_of"]),
      designation_article:
        pick(row, [
          "designation_article",
          "designation",
          "désignation",
          "article",
          "reference",
          "référence",
          "ref",
          "réf",
        ]) || null,
      numero_serie:
        pick(row, ["numero_serie", "n°_de_série", "serie", "série", "sn", "n_serie"]) ||
        null,
      echeance: normalizeDate(
        pick(row, ["echeance", "échéance", "date", "deadline"]),
      ),
    };
  });
}

export function OfImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function importer() {
    setMsg(null);
    const rows = parseCsv(text).filter((r) => r.numero_of);
    if (rows.length === 0) {
      setMsg("Aucune ligne d’OF détectée. Vérifie l’en-tête (colonne numero_of).");
      return;
    }
    setBusy(true);
    const { error, count } = await importOfsAction(rows);
    setBusy(false);
    if (error) {
      setMsg(`Erreur : ${error}`);
      return;
    }
    setMsg(`${count} OF importé(s).`);
    setText("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/5"
      >
        Importer OF
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Importer des OF (CSV)"
      >
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            Importe un export CSV de ton ERP. Colonnes reconnues :{" "}
            <code className="text-white/90">numero_of</code> (obligatoire),{" "}
            <code className="text-white/90">designation_article</code>,{" "}
            <code className="text-white/90">numero_serie</code>,{" "}
            <code className="text-white/90">echeance</code>. Séparateur{" "}
            <code>,</code> ou <code>;</code>.
          </p>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="block text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={"numero_of,designation_article,numero_serie,echeance\nOF-3001,Boîtier titane,SN-9001,2026-07-15"}
            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs outline-none focus:border-white/30"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={importer}
              disabled={busy}
              className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? "Import…" : "Importer"}
            </button>
            {msg ? <span className="text-sm text-white/70">{msg}</span> : null}
          </div>
        </div>
      </Modal>
    </>
  );
}
