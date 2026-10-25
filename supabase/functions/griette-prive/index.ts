// griette-prive — de poortwachter voor Griettes gegevens.
//
// Waarom: griette_data had RLS aan met een beleid "Public access" (ALL, voor
// iedereen) terwijl de anon-sleutel in de broncode van stijlstudio.app staat.
// Wie die sleutel uit de pagina plukt kan haar hele kast lezen én overschrijven.
// Deze functie is de vervanging: alleen hij komt met de service-role naar
// binnen, en alleen met het wachtwoord dat server-side staat.
//
// Over de schema-koppen: die stuurde ik eerst mee (Accept-Profile:
// legacy_archive) en dat leverde een 406 op. De app zelf stuurt ze niet en
// werkt wel, dus het project heeft legacy_archive al als standaardschema.
// Deze functie doet nu hetzelfde als de app: geen profielkop, tenzij een
// eerste poging mislukt — dan nog één keer mét, zodat beide projectinstellingen
// werken. En bij een fout gaat de echte tekst van PostgREST mee terug in plaats
// van alleen een nummer; aan "406" heeft niemand iets.
//
// stijl: de nieuwe Stijl Studio. Die tabel staat in public (legacy_archive is
// niet meer naar buiten opengezet), met RLS aan en geen beleid, zodat alleen
// deze functie erbij kan.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-griette-wachtwoord",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Welke tabellen deze functie mag aanraken. Een vaste lijst, zodat een
// meegestuurde tabelnaam nooit ergens anders uitkomt.
const TABELLEN: Record<string, string> = {
  data: "griette_data",
  prive: "griette_prive",
  stijl: "stijlstudio_data",
};

function antwoord(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Vergelijken in constante tijd, zodat het antwoord niet verraadt hoeveel
// tekens er klopten.
function gelijk(a: string, b: string) {
  if (a.length !== b.length) return false;
  let verschil = 0;
  for (let i = 0; i < a.length; i++) verschil |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return verschil === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return antwoord({ fout: "alleen POST" }, 405);

  const verwacht = Deno.env.get("GRIETTE_PRIVE_WACHTWOORD") || "";
  if (!verwacht) {
    return antwoord({ fout: "Er is nog geen wachtwoord ingesteld voor deze opslag." }, 503);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return antwoord({ fout: "onleesbare aanvraag" }, 400); }

  const wachtwoord = String(
    req.headers.get("x-griette-wachtwoord") || body.wachtwoord || ""
  );
  if (!gelijk(wachtwoord, verwacht)) {
    // Bewust vaag: wie gokt hoort niet te horen of de sleutel bestond.
    return antwoord({ fout: "Geen toegang tot deze opslag." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return antwoord({ fout: "opslag niet bereikbaar" }, 500);

  const tabel = TABELLEN[String(body.tabel || "prive")];
  if (!tabel) return antwoord({ fout: "onbekende tabel" }, 400);

  const basis = `${url}/rest/v1/${tabel}`;
  const basisKoppen: Record<string, string> = {
    apikey: service,
    Authorization: `Bearer ${service}`,
    "Content-Type": "application/json",
  };
  const metProfiel: Record<string, string> = {
    ...basisKoppen,
    "Accept-Profile": "legacy_archive",
    "Content-Profile": "legacy_archive",
  };

  // Eerst zoals de app het doet. Mislukt dat, dan één keer met de schema-kop,
  // zodat het ook werkt als het project die wél verlangt.
  async function vraag(pad: string, init: RequestInit & { headers?: Record<string, string> }) {
    let res = await fetch(pad, { ...init, headers: { ...basisKoppen, ...(init.headers || {}) } });
    if (!res.ok && (res.status === 404 || res.status === 406)) {
      res = await fetch(pad, { ...init, headers: { ...metProfiel, ...(init.headers || {}) } });
    }
    return res;
  }

  async function fouttekst(res: Response, wat: string) {
    let detail = "";
    try { detail = (await res.text()).slice(0, 300); } catch { /* laat maar */ }
    return antwoord({ fout: wat + " (" + res.status + ")" + (detail ? ": " + detail : "") }, 502);
  }

  const actie = String(body.actie || "");
  const key = String(body.key || "");

  try {
    // Alles in één keer ophalen. De app laadt bij het opstarten een stuk of tien
    // sleutels; die als tien aanroepen doen maakt het opstarten merkbaar trager.
    if (actie === "leesAlles") {
      const res = await vraag(`${basis}?select=key,value`, { method: "GET" });
      if (!res.ok) return await fouttekst(res, "lezen mislukte");
      const rijen = await res.json();
      const uit: Record<string, string> = {};
      for (const r of rijen || []) uit[r.key] = r.value;
      return antwoord({ rijen: uit });
    }

    if (!key || key.length > 120) return antwoord({ fout: "ongeldige sleutel" }, 400);

    if (actie === "lees") {
      const res = await vraag(
        `${basis}?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
        { method: "GET" },
      );
      if (!res.ok) return await fouttekst(res, "lezen mislukte");
      const rijen = await res.json();
      return antwoord({ value: rijen?.[0]?.value ?? null });
    }

    if (actie === "schrijf") {
      const value = typeof body.value === "string" ? body.value : null;
      if (value === null) return antwoord({ fout: "geen waarde meegegeven" }, 400);
      // Ruim bemeten voor een foto als data-url, maar niet onbeperkt.
      if (value.length > 8_000_000) return antwoord({ fout: "te groot (max 8 MB)" }, 413);
      const res = await vraag(basis, {
        method: "POST",
        headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
        body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
      });
      if (!res.ok) return await fouttekst(res, "opslaan mislukte");
      return antwoord({ ok: true });
    }

    if (actie === "wis") {
      const res = await vraag(`${basis}?key=eq.${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) return await fouttekst(res, "verwijderen mislukte");
      return antwoord({ ok: true });
    }

    return antwoord({ fout: "onbekende actie" }, 400);
  } catch (e) {
    return antwoord({ fout: "opslag gaf een fout: " + (e as Error).message }, 502);
  }
});
