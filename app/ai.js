// De AI doet alleen wat rekenen niet kan: kijken naar een foto, en in woorden
// zeggen waarom iets werkt. Het rapport gaat mee als korte, gecachte
// systeemtekst, zodat je dat niet bij elke vraag opnieuw betaalt.

const EIND = 'https://osuqtfsxmquwqsbgzlqn.supabase.co/functions/v1/claude';
// Wat de proxy toestaat (supabase/functions/claude/index.ts)
const OORDEEL = 'claude-sonnet-5';
const LICHT = 'claude-haiku-4-5';

let rapportKort = '';
export function zetRapport(r) {
  rapportKort = [
    `Griette's stijlrapport (leidend): ${r.kern}`,
    `Basis: ${r.kleur.basis.join(', ')}. Accent: ${r.kleur.accent.join(', ')} (voorbeeldlijst, geen hek).`,
    ...r.regels.map(x => `- ${x.titel}: ${x.tekst}`),
    ...r.secties.map(s => `- ${s.titel}: ${(s.intro ? s.intro + ' ' : '') + s.punten.join('; ')}`),
    'Rangorde: eerst dit rapport, dan algemene stylingtheorie, dan trends (noem die als trend).',
    'Antwoord in het Nederlands, informeel (je/jij), kort. Verzin niets over pasvorm dat je niet kunt zien.',
  ].join('\n');
}

function tekstUit(d) {
  // Er kan een denkblok vóór de tekst staan; content[0] is dan niet de tekst.
  const t = (d.content || []).find(b => b.type === 'text');
  return t ? t.text : '';
}

export function jsonUit(t) {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Het antwoord bevatte geen bruikbare gegevens.');
  return JSON.parse(m[0]);
}

export async function vraag({ taak = 'oordeel', vraag, beelden = [], max = 3000 }) {
  const model = taak === 'licht' ? LICHT : OORDEEL;
  const content = [
    ...beelden.map(b => b.startsWith('http')
      ? { type: 'image', source: { type: 'url', url: b } }
      : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b.replace(/^data:[^,]+,/, '') } }),
    { type: 'text', text: vraag },
  ];
  const body = {
    model, max_tokens: max,
    system: [{ type: 'text', text: rapportKort, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content }],
  };
  if (model !== LICHT) body.output_config = { effort: 'low' };
  let r;
  try {
    r = await fetch(EIND, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) { throw new Error('Geen verbinding met de stylist.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || 'De stylist gaf een fout (' + r.status + ').');
  return tekstUit(d);
}

// ── De drie vragen die de app stelt ─────────────────────────────────────────

export async function labelsVoorFoto(fotoUrl, naam) {
  const t = await vraag({ taak: 'licht', beelden: [fotoUrl], max: 600, vraag:
`Beschrijf dit kledingstuk${naam ? ` ("${naam}")` : ''} als JSON, niets anders:
{"naam":"korte naam","soort":"t-shirt|top|topje|longsleeve|blouse|trui|vest|gilet|blazer|teddy|jas|trenchcoat|jeans|broek|pantalon|rok|short|legging|jurk|co-ord|sneakers|loafers|hakken|laarzen|sandalen|tas|riem|sjaal|pet|muts|sieraad",
 "kleur":["hoofdkleur","eventueel tweede"],"print":null|"streep"|"stip"|"ruit"|"luipaard"|"bloem",
 "textuur":"glad|glans|fijn gebreid|grof gebreid|pluizig|denim|linnen|leer|suède|kant|structuur",
 "materiaal":"katoen|wol|denim|linnen|satijn|leer|suède|mohair|synthetisch|viscose|onbekend",
 "pasvorm":"aansluitend|recht|wijd|kort","warmte":1|2|3,
 "snit":null|"recht"|"slim"|"wide leg"|"flared"|"bootcut"|"barrel"|"ballon"|"cargo"|"culotte"|"mom"|"A-lijn"|"plissé"|"wikkel"|"potlood",
 "taille":null|"hoog"|"midden"|"laag","lengte":null|"cropped"|"mini"|"midi"|"maxi"}
Snit, taille en lengte alleen voor broeken, shorts en rokken; anders null.
Kleuren uit: zwart, antraciet, lichtgrijs, wit, ecru, beige, zand, taupe, camel, bruin, chocolade, cognac, donkerblauw, marine, denimblauw, lichtblauw, ijsblauw, kobaltblauw, turquoise, groen, olijf/khaki, salie, mintgroen, geel, botergeel, mosterd, oranje, koraal, rood, oranje-rood, bordeaux, roze, felroze, oudroze, paars, lila/paars, goud, zilver.
Materiaal alleen als het te zien is, anders "onbekend".` });
  return jsonUit(t);
}

export async function vertelOver(outfit, kleurNaam) {
  const lijst = outfit.items.map(i => `- ${i.naam} (${i.soort}, ${i.kleur.join('/')}, ${i.textuur}, ${i.pasvorm})`).join('\n');
  const t = await vraag({ max: 2500, vraag:
`Deze outfit is samengesteld uit Griettes kast (kleurmanier: ${kleurNaam}):
${lijst}
Geef als JSON: {"naam":"korte, sfeervolle naam (max 4 woorden)","waarom":"1-2 zinnen waarom dit bij haar werkt","tip":"één concrete stylingtip (instoppen, mouwen, riem, sieraad)"}` });
  return jsonUit(t);
}

export async function spiegelcheck(foto, kast) {
  const lijst = kast.map(i => `${i.id}: ${i.naam} (${i.kleur.join('/')})`).join('\n');
  const t = await vraag({ beelden: [foto], max: 5000, vraag:
`Dit is Griette in haar outfit van vandaag. Bekijk pasvorm, proporties, kleurcombinatie, laagjes, materiaal, schoenen en accessoires, en hoe de foto haar presenteert.
Geef 3 tot 5 verbeteringen met de grootste impact, zonder dat alles anders moet. Eerst met stukken uit haar eigen kast (gebruik de id's), pas daarna iets nieuws.
Haar kast:
${lijst}
Antwoord als JSON: {"werkt":"wat al goed is, 1 zin","verbeter":[{"wat":"de verandering","waarom":"kort","uitKast":["id"],"nieuw":null|{"wat":"omschrijving","budget":"laag|midden|premium"}}],"foto":"één tip voor houding of hoek"}` });
  return jsonUit(t);
}
