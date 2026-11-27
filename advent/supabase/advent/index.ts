// Family Crazy Adventskalender: de enige toegang tot de database.
// Acties: leden (openbaar: namen voor het inlogscherm), init (eenmalig vullen), login, lees, schrijf.
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

    if (b.actie === "lees") {
      const uit = alle.filter((d) => {
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
