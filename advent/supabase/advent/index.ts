// Family Crazy Adventskalender: de enige toegang tot de database.
// Acties: leden (openbaar: namen voor het inlogscherm), init (eenmalig vullen), login, lees, schrijf,
// en meldingen: vapid, abonneer, afmelden, meldingenStatus, stuur (beheer) en dagelijks (alleen pg_cron).
// Pincodes worden gehasht bewaard; wat iemand mag lezen en schrijven wordt hier gecontroleerd.
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const GEHEIM = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(URL_, GEHEIM);
const enc = new TextEncoder();
const KEY = await crypto.subtle.importKey("raw", enc.encode("advent:" + GEHEIM), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const antw = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hash(tekst: string) { return b64(await crypto.subtle.digest("SHA-256", enc.encode(tekst))); }
const pinHash = (id: string, pin: string) => hash("pin:" + id + ":" + pin);
async function maakToken(id: string) {
  const body = id + "." + (Date.now() + 1000 * 60 * 60 * 24 * 60);
  return body + "." + b64(await crypto.subtle.sign("HMAC", KEY, enc.encode(body)));
}
async function leesToken(token: string) {
  const [id, exp, sig] = String(token || "").split(".");
  if (!id || !exp || !sig || +exp < Date.now()) return null;
  return b64(await crypto.subtle.sign("HMAC", KEY, enc.encode(id + "." + exp))) === sig ? id : null;
}

// welke decemberdag het nu is in Nederland: 0 vóór december, 26 erna (alles open)
function vandaag() {
  const [j, m, d] = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" }).split("-").map(Number);
  if (m === 12) return Math.min(d, 26);
  return m === 1 ? 26 : 0;
}

type Doc = { col: string; id: string; data: any };
async function alles(): Promise<Doc[]> {
  const uit: Doc[] = []; let van = 0;
  while (true) {
    const { data, error } = await sb.from("advent_doc").select("col,id,data").range(van, van + 999);
    if (error) throw error;
    uit.push(...(data as Doc[])); if (!data || data.length < 1000) break; van += 1000;
  }
  return uit;
}
const zonderPin = (l: any) => { const { pin, pinhash, ...rest } = l || {}; return rest; };
const KLUIS = "advent-media";
const ZES_UUR = 60 * 60 * 6;

const mislukt = new Map<string, { n: number; tot: number }>();

/* ===== Meldingen (Web Push) =====
   De sleutels staan in de tabel advent_geheim (RLS aan, geen policies: alleen deze functie kan erbij).
   Een abonnement is per toestel, in advent_doc col "meldingen", id "<lid>|<hash van het adres>".
   In een melding staat nooit persoonlijke inhoud: alleen dat er een raampje open is. */
async function geheim(naam: string) {
  const { data } = await sb.from("advent_geheim").select("waarde").eq("naam", naam).maybeSingle();
  return data?.waarde as string | undefined;
}
async function vapid() {
  let pub = await geheim("vapid_public"), priv = await geheim("vapid_private");
  if (!pub || !priv) {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    pub = b64(await crypto.subtle.exportKey("raw", kp.publicKey));
    priv = (await crypto.subtle.exportKey("jwk", kp.privateKey)).d!;
    await sb.from("advent_geheim").upsert([{ naam: "vapid_public", waarde: pub }, { naam: "vapid_private", waarde: priv }], { onConflict: "naam", ignoreDuplicates: true });
    pub = await geheim("vapid_public"); priv = await geheim("vapid_private");   // wie het eerst schreef, wint
  }
  return { pub: pub!, priv: priv! };
}
async function stuurMeldingen(rijen: { id: string; data: any }[], bericht: (wie: string) => { titel: string; tekst: string }) {
  if (!rijen.length) return 0;
  const webpush = (await import("npm:web-push@3.6.7")).default;
  const { pub, priv } = await vapid();
  webpush.setVapidDetails("https://adventscalender.app", pub, priv);
  let n = 0;
  await Promise.all(rijen.map(async (r) => {
    try { await webpush.sendNotification(r.data.sub, JSON.stringify({ ...bericht(r.data.wie), url: "./" }), { TTL: 60 * 60 * 12 }); n++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("advent_doc").delete().eq("col", "meldingen").eq("id", r.id); else console.error("melding mislukt", e?.statusCode); }
  }));
  return n;
}
const ZINNEN = ["Eerst open, dan ontbijt.", "Het wacht. Jij niet.", "Snel, voor iemand het verklapt.", "Niet tot vanavond wachten.", "Tanden poetsen mag daarna."];
function dagBericht(dag: number, persoonlijk: boolean) {
  if (dag === 25) return { titel: "Kerst. Raampje 25.", tekst: "Games vanavond. Verliezen mag." };
  if (dag === 26) return { titel: "Raampje 26. Het laatste.", tekst: "Sinterklaas. Eindelijk." };
  return { titel: `Raampje ${dag} is open`, tekst: persoonlijk ? "Er zit vandaag iets in dat alleen voor jou is." : ZINNEN[dag % ZINNEN.length] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const b = await req.json();
    const docs = async (col: string) => (await sb.from("advent_doc").select("id,data").eq("col", col)).data || [];

    if (b.actie === "leden") {
      const l = await docs("leden");
      return antw({ leeg: l.length === 0, vandaag: vandaag(), leden: l.map((r: any) => ({ id: r.id, naam: r.data.naam, beheer: !!r.data.beheer, spelleider: !!r.data.spelleider, foto: r.data.fotoOpenbaar ? (r.data.foto || null) : null, volgorde: r.data.volgorde ?? 0 })) });
    }

    if (b.actie === "init") {
      if ((await docs("leden")).length) return antw({ fout: "De kalender is al ingericht." }, 409);
      const rijen = [];
      for (const d of (b.docs || []) as Doc[]) {
        let data = d.data;
        if (d.col === "leden") data = { ...zonderPin(data), pinhash: await pinHash(d.id, String(d.data.pin || "0000")) };
        rijen.push({ col: d.col, id: d.id, data, door: "init" });
      }
      const { error } = await sb.from("advent_doc").upsert(rijen); if (error) throw error;
      return antw({ ok: true });
    }

    if (b.actie === "openbaar") {
      const { data } = await sb.from("advent_doc").select("data").eq("col", "inhoud").eq("id", String(b.id || "")).maybeSingle();
      if (!data || !data.data.openbaar) return antw({ fout: "Dit is niet (meer) openbaar." }, 404);
      const it = data.data; let mediaUrl = null;
      if (it.media?.pad) mediaUrl = (await sb.storage.from(KLUIS).createSignedUrl(it.media.pad, ZES_UUR)).data?.signedUrl || null;
      return antw({ item: { ...it, id: b.id }, mediaUrl });
    }

    if (b.actie === "vapid") return antw({ sleutel: (await vapid()).pub });

    if (b.actie === "dagelijks") {
      const cron = await geheim("cron");
      if (!cron || req.headers.get("x-cron-geheim") !== cron) return antw({ fout: "Nee." }, 403);
      const maand = Number(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" }).split("-")[1]);
      const dag = vandaag();
      if (maand !== 12 || dag < 1) return antw({ ok: true, overgeslagen: true });
      const inhoud = await docs("inhoud"), abos = await docs("meldingen");
      const n = await stuurMeldingen(abos, (wie) => dagBericht(dag, inhoud.some((r: any) => r.data.dag === dag && r.data.voor === wie)));
      return antw({ ok: true, verstuurd: n });
    }

    if (b.actie === "login") {
      const m = mislukt.get(b.id);
      if (m && m.n >= 5 && m.tot > Date.now()) return antw({ fout: "Te vaak een verkeerde pincode. Probeer het over een minuut opnieuw." }, 429);
      const { data } = await sb.from("advent_doc").select("data").eq("col", "leden").eq("id", String(b.id)).maybeSingle();
      if (!data || data.data.pinhash !== await pinHash(String(b.id), String(b.pin || ""))) {
        const n = (m?.n || 0) + 1; mislukt.set(b.id, { n, tot: Date.now() + 60000 });
        return antw({ fout: "Die pincode klopt niet. Probeer het nog eens." }, 401);
      }
      mislukt.delete(b.id);
      return antw({ token: await maakToken(String(b.id)) });
    }

    const ik = await leesToken(b.token);
    if (!ik) return antw({ fout: "Je bent uitgelogd. Log opnieuw in." }, 401);
    const alle = await alles();
    const mijRij = alle.find((d) => d.col === "leden" && d.id === ik);
    if (!mijRij) return antw({ fout: "Dit gezinslid bestaat niet meer." }, 401);
    const mij = mijRij.data, beheer = !!mij.beheer, leider = beheer || !!mij.spelleider, dag = vandaag();

    if (b.actie === "abonneer") {
      const sub = b.sub || {};
      const geldig = typeof sub.endpoint === "string" && sub.endpoint.startsWith("https://") && sub.endpoint.length < 1000 && typeof sub.keys?.p256dh === "string" && typeof sub.keys?.auth === "string";
      if (!geldig) return antw({ fout: "Dit toestel gaf geen geldig meldadres." }, 400);
      if (alle.filter((d) => d.col === "meldingen" && d.data.wie === ik).length >= 5) return antw({ fout: "Je hebt al vijf toestellen met meldingen. Zet er eerst één uit." }, 400);
      const id = ik + "|" + (await hash(sub.endpoint)).slice(0, 20);
      await sb.from("advent_doc").upsert({ col: "meldingen", id, data: { wie: ik, sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, sinds: new Date().toISOString() }, door: ik });
      return antw({ ok: true });
    }
    if (b.actie === "afmelden") {
      const id = ik + "|" + (await hash(String(b.endpoint || ""))).slice(0, 20);
      await sb.from("advent_doc").delete().eq("col", "meldingen").eq("id", id);
      return antw({ ok: true });
    }
    if (b.actie === "meldingenStatus") {
      if (!beheer) return antw({ fout: "Alleen voor beheerders." }, 403);
      const per: Record<string, number> = {};
      alle.filter((d) => d.col === "meldingen").forEach((d) => { per[d.data.wie] = (per[d.data.wie] || 0) + 1; });
      return antw({ per });
    }
    if (b.actie === "stuur") {
      if (!beheer) return antw({ fout: "Alleen beheerders kunnen meldingen sturen." }, 403);
      const tekst = String(b.tekst || "").trim().slice(0, 140), aan = String(b.aan || "alle");
      if (!tekst) return antw({ fout: "Schrijf eerst wat er in de melding moet staan." }, 400);
      const abos = alle.filter((d) => d.col === "meldingen" && (aan === "alle" || d.data.wie === aan));
      const n = await stuurMeldingen(abos, () => ({ titel: "Family Crazy Adventskalender", tekst }));
      return antw({ ok: true, verstuurd: n, toestellen: abos.length });
    }

    if (b.actie === "lees") {
      const uit = alle.filter((d) => {
        if (d.col === "meldingen") return false;   // meldadressen gaan nooit naar de app
        if (beheer) return true;
        if (d.col === "inhoud") return (d.data.voor === "alle" || d.data.voor === ik) && d.data.dag <= dag;
        if (d.col === "post") return d.data.van === ik;
        return true;
      }).map((d) => d.col === "leden" ? { ...d, data: zonderPin(d.data) } : d);
      return antw({ docs: uit, vandaag: dag, ik });
    }

    if (b.actie === "uploadUrl") {
      if (!beheer) return antw({ fout: "Alleen beheerders kunnen uploaden." }, 403);
      const ext = String(b.naam || "").split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
      const pad = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await sb.storage.from(KLUIS).createSignedUploadUrl(pad);
      if (error) throw error;
      return antw({ pad, url: data.signedUrl });
    }

    if (b.actie === "media") {
      // alleen bestanden van items die deze persoon mag zien
      const mag = new Set(alle.filter((d) => d.col === "inhoud" && d.data.media?.pad && (beheer || ((d.data.voor === "alle" || d.data.voor === ik) && d.data.dag <= dag))).map((d) => d.data.media.pad));
      const paden = ((b.paden || []) as string[]).filter((x) => mag.has(x)).slice(0, 50);
      if (!paden.length) return antw({ urls: {} });
      const { data, error } = await sb.storage.from(KLUIS).createSignedUrls(paden, ZES_UUR);
      if (error) throw error;
      return antw({ urls: Object.fromEntries((data || []).map((x: any) => [x.path, x.signedUrl])) });
    }

    if (b.actie === "schrijf") {
      const bestaand = new Map(alle.map((d) => [d.col + "/" + d.id, d.data]));
      const fouten: string[] = [];
      const magSchrijven = (d: Doc, oud: any): boolean => {
        if (d.col === "meldingen") return false;   // alleen via abonneer/afmelden
        if (beheer) return true;
        const n = d.data || {};
        switch (d.col) {
          case "geopend": return d.id === ik && (n.dagen || []).every((x: number) => x <= dag);
          case "reacties": case "ingewisseld": return d.id.endsWith("|" + ik);
          case "post": return n.van === ik && (!oud || oud.van === ik);
          case "wensen": case "dinerwensen": return n.van === ik && (!oud || oud.van === ik);
          case "ideeen": return oud ? (oud.tekst === n.tekst && oud.van === n.van) : n.van === ik;
          case "diner": return !oud;
          case "taken": return !!oud && oud.wie === ik && oud.tekst === n.tekst && oud.wie === n.wie;
          case "scores": case "gespeeld": return leider;
          case "inhoud": return leider && n.soort === "games" && (!oud || oud.soort === "games");
          default: return false;
        }
      };
      const magWeg = (col: string, id: string, oud: any) => {
        if (col === "meldingen") return false;
        if (beheer) return true;
        if (!oud) return true;
        if (["wensen", "dinerwensen", "ideeen", "post"].includes(col)) return oud.van === ik;
        return false;
      };
      const rijen = [];
      for (const d of (b.upserts || []) as Doc[]) {
        const oud = bestaand.get(d.col + "/" + d.id);
        if (!magSchrijven(d, oud)) { fouten.push(d.col + "/" + d.id); continue; }
        let data = d.data;
        if (d.col === "leden") {
          data = { ...zonderPin(data), pinhash: d.data.pin ? await pinHash(d.id, String(d.data.pin)) : (oud?.pinhash || await pinHash(d.id, "1234")) };
        }
        rijen.push({ col: d.col, id: d.id, data, door: ik, bijgewerkt: new Date().toISOString() });
      }
      if (rijen.length) { const { error } = await sb.from("advent_doc").upsert(rijen); if (error) throw error; }
      for (const d of (b.deletes || []) as { col: string; id: string }[]) {
        const oud = bestaand.get(d.col + "/" + d.id);
        if (!magWeg(d.col, d.id, oud)) { fouten.push(d.col + "/" + d.id); continue; }
        if (d.col === "leden" && d.id === ik) { fouten.push("jezelf verwijderen"); continue; }
        await sb.from("advent_doc").delete().eq("col", d.col).eq("id", d.id);
        if (d.col === "leden") await sb.from("advent_doc").delete().eq("col", "meldingen").like("id", d.id + "|%");
        if (d.col === "inhoud" && oud?.media?.pad) await sb.storage.from(KLUIS).remove([oud.media.pad]);
      }
      return antw({ ok: true, geweigerd: fouten });
    }
    return antw({ fout: "Onbekende actie" }, 400);
  } catch (e) {
    console.error(e);
    return antw({ fout: "Er ging iets mis op de server." }, 500);
  }
});
