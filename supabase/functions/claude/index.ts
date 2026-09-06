import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Proxy naar de Anthropic API. De API-sleutel staat als secret op de server
// en verlaat nooit de browser.
//
// Vereiste secret in Supabase:  ANTHROPIC_API_KEY
// Optionele secret:             APP_SECRET  (toegangscode; als die is gezet,
//                               moet de pagina hem meesturen)

const ALLOWED_ORIGINS = [
  "https://stijlstudio.app",
  "https://www.stijlstudio.app",
  "https://jetje1980.github.io",
  "http://localhost:8765",
];

const ALLOWED_MODELS = [
  "claude-opus-5",
  "claude-sonnet-5",
  "claude-haiku-4-5",
];

const MAX_TOKENS_CAP = 32000;   // denk-tokens tellen mee; te krap levert lege antwoorden
const MAX_BODY_BYTES = 256 * 1024;

function corsHeaders(origin: string, allowed: boolean) {
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type, x-app-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function err(msg: string, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify({ error: { message: msg } }), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin);
  const cors = corsHeaders(origin, allowed);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return err("Alleen POST toegestaan.", 405, cors);
  }
  if (!allowed) {
    return err("Deze pagina mag deze functie niet aanroepen.", 403, cors);
  }

  // Optionele toegangscode
  const appSecret = Deno.env.get("APP_SECRET");
  if (appSecret && req.headers.get("x-app-secret") !== appSecret) {
    return err("Toegangscode ontbreekt of klopt niet.", 401, cors);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return err(
      "ANTHROPIC_API_KEY is nog niet ingesteld in Supabase (Edge Functions -> Secrets).",
      500,
      cors,
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return err("Verzoek te groot.", 413, cors);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return err("Ongeldige JSON.", 400, cors);
  }

  // Alleen bekende modellen en een plafond op max_tokens, zodat een
  // misbruikte aanroep nooit een grote rekening kan opleveren.
  if (typeof body.model !== "string" || !ALLOWED_MODELS.includes(body.model)) {
    body.model = "claude-opus-5";
  }
  const requested = typeof body.max_tokens === "number" ? body.max_tokens : 8000;
  body.max_tokens = Math.min(Math.max(requested, 256), MAX_TOKENS_CAP);

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return err("Kon Anthropic niet bereiken.", 502, cors);
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...cors, "content-type": "application/json" },
  });
});
