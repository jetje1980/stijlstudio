#!/usr/bin/env python3
"""Zet een backup van de oude app om naar de databestanden van de nieuwe.

Gebruik:
  node tools/dump-oud.js <backup.json> <uitmap>   # haalt kast + kennis uit de oude pagina's
  python3 tools/migreer.py <backup.json> <uitmap>

<uitmap> moet kast-runtime.json en kennis-runtime.json bevatten (van dump-oud.js).
Schrijft data/kast.json, data/outfits.json, data/kennis.json en data/inspo/*.jpg.

De labels (kleur, textuur, pasvorm, ...) worden hier afgeleid uit wat de oude app
al wist: de tags die zij zelf zette gaan voor, dan de naam, dan de beschrijving
die de AI van de foto maakte. Het blijft een voorstel: in de app kijkt zij ze na.
"""
import base64, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

backup = json.load(open(sys.argv[1]))['data']
uit = sys.argv[2]
kast_rt = json.load(open(os.path.join(uit, 'kast-runtime.json')))
kennis_rt = json.load(open(os.path.join(uit, 'kennis-runtime.json')))

def ls(k, leeg):
    try:
        return json.loads(backup.get(k) or '') or leeg
    except Exception:
        return leeg

fotos = ls('griette-cloud-photos-v1', {})
extra_fotos = ls('griette-extra-photos-v1', {})

# ── KLEUREN ──────────────────────────────────────────────────────────────────
# Woordenlijst van de oude app, met hex. Volgorde = voorrang bij het zoeken
# (langere, specifiekere namen eerst).
HEX = {k['v']: k['dot'] for k in kennis_rt['KLEUREN']}
HEX.update({'denim': '#4a6d94', 'multi': '#c9a0a0'})

SYNONIEM = [
    (r'gebroken[ -]?wit|off[ -]?white|ivoor|cr[eè]me|creme|ecru|natuurlijk linnen', 'ecru'),
    (r'zuiver wit|\bwit\b|\bwhite\b|witte', 'wit'),
    (r'antraciet|donkergrijs|dark grey|verwassen donkergrijs', 'antraciet'),
    (r'lichtgrijs|licht grijs|grey|grijs', 'lichtgrijs'),
    (r'marine(blauw)?|navy|indigo(blauw)?', 'marine'),
    (r'donkerblauw', 'donkerblauw'),
    (r'kobalt|koningsblauw|helder blauw|kobaltblauw', 'kobaltblauw'),
    (r'turquoise|turkoois|turquois', 'turquoise'),
    (r'petrol', 'petrol'),
    (r'hemelsblauw', 'hemelsblauw'),
    (r'ijsblauw', 'ijsblauw'),
    (r'lichtblauw|light blue|zeer licht blauw|lichtblauw verwassen', 'lichtblauw'),
    (r'denim|jeans|middelblauw|medium blauw|middenblauw|blauwgrijs', 'denimblauw'),
    (r'\bblauw|blue', 'donkerblauw'),
    (r'chocolade|donkerbruin|diep bruin|diepbruin|choco', 'chocolade'),
    (r'cognac', 'cognac'),
    (r'camel', 'camel'),
    (r'taupe', 'taupe'),
    (r'zand', 'zand'),
    (r'beige|nude|champagne', 'beige'),
    (r'bruin|brown|brownie', 'bruin'),
    (r'bordeaux|burgundy|wijnrood|aubergine', 'bordeaux'),
    (r'koraal', 'koraal'),
    (r'zalm', 'zalm'),
    (r'oranje-rood|rood-oranje|kersenrood', 'oranje-rood'),
    (r'\brood|\brode\b|\bred\b|donkerrood', 'rood'),
    (r'oranje|orange', 'oranje'),
    (r'botergeel|bleekgeel|lichtgeel', 'botergeel'),
    (r'mosterd', 'mosterd'),
    (r'citroen|\bgeel|\bgele\b|yellow|lime', 'geel'),
    (r'fel ?roze|felblauwroze|fuchsia|pink', 'felroze'),
    (r'oud ?roze', 'oudroze'),
    (r'zomerroze|warm roze|\broze', 'roze'),
    (r'lila|lavendel', 'lila/paars'),
    (r'paars|purple', 'paars'),
    (r'smaragd', 'smaragdgroen'),
    (r'mint', 'mintgroen'),
    (r'salie', 'salie'),
    (r'olijf|khaki|kaki|camouflage', 'olijf/khaki'),
    (r'groen|green', 'groen'),
    (r'goud', 'goud'),
    (r'zilver', 'zilver'),
    (r'zwart|black|zwatt', 'zwart'),
]

def kleur_uit(tekst):
    t = (tekst or '').lower()
    gevonden = []
    for pat, naam in SYNONIEM:
        m = re.search(pat, t)
        if m:
            gevonden.append((m.start(), naam))
            t = t[:m.start()] + ' ' * (m.end() - m.start()) + t[m.end():]
    return [n for _, n in sorted(gevonden)]

def kleuren_van(it):
    k = _kleuren_van(it)
    if 'denimblauw' in k and len(k) > 1:
        k = [x for x in k if x != 'denimblauw']
    uniek = []
    for x in k:
        if x not in uniek:
            uniek.append(x)
    return uniek

def _kleuren_van(it):
    tg = (it.get('tags') or {}).get('kleur')
    if re.search(r'denim|jeans|\bjean\b', it['name'].lower()) and not tg:
        k = kleur_uit((it.get('vis') or {}).get('kleur', '')) or kleur_uit(it['name'])
        return k or ['denimblauw']
    if tg:
        lijst = tg if isinstance(tg, list) else [tg]
        lijst = [k for k in lijst if k in HEX]
        if lijst:
            # tags hebben maar één of twee kleuren; vul aan met de naam
            rest = [k for k in kleur_uit(it['name']) if k not in lijst]
            return lijst + rest[:1]
    k = kleur_uit(it['name'])
    vis = (it.get('vis') or {}).get('kleur', '')
    if not k:
        k = kleur_uit(vis)
    elif len(k) == 1:
        extra = [x for x in kleur_uit(vis) if x != k[0]]
        if extra and re.search(r' met |/|en ', vis.lower()):
            k += extra[:1]
    return k

# ── PRINT ────────────────────────────────────────────────────────────────────
PRINTS = [
    (r'luipaard|leopard|panter', 'luipaard'), (r'streep|strepen|striped|gestreept|stripe', 'streep'),
    (r'stip|polkadot|polka', 'stip'), (r'ruit|geruit|check|pied', 'ruit'),
    (r'bloem|flower|floral', 'bloem'), (r'camouflage|camo', 'camouflage'),
    (r'patchwork', 'patchwork'), (r'hart print', 'hart'),
]
def print_van(it):
    t = (it['name'] + ' ' + json.dumps(it.get('vis') or {}, ensure_ascii=False)).lower()
    for pat, naam in PRINTS:
        if re.search(pat, t):
            return naam
    return None

# ── SOORT (wat is het) ───────────────────────────────────────────────────────
# (patroon, soort, rol). Rol bepaalt de plek in een outfit.
SOORTEN = [
    (r'co-?ord|jumpsuit', 'co-ord', 'heel'),
    (r'jurk|dress', 'jurk', 'heel'),
    (r'trench', 'trenchcoat', 'jas'),
    (r'faux fur|teddy|fleece', 'teddy', 'laag'),
    (r'blazer', 'blazer', 'laag'),
    (r'\bjas\b|coat|jacket|jack\b|jasje|cargo jasje|bomber', 'jas', 'jas'),
    (r'gilet', 'gilet', 'laag'),
    (r'cardigan|\bvest\b|vestje', 'vest', 'laag'),
    (r'trui|sweater|pullover|knit', 'trui', 'boven'),
    (r'blouse|bloesje|overhemd|shirt with|wide short sleeve shirt', 'blouse', 'boven'),
    (r'spaghetti|topje|hemd', 'topje', 'boven'),
    (r'longsleeve', 'longsleeve', 'boven'),
    (r't-?shirt|tshirt|tee\b|baseball shirt', 't-shirt', 'boven'),
    (r'sporttop', 'sporttop', 'boven'),
    (r'\btop\b|peplum|draped', 'top', 'boven'),
    (r'legging', 'legging', 'onder'),
    (r'\bshorts?\b|bermuda|broekje', 'short', 'onder'),
    (r'\brok\b|rokje|skirt|maxi rok', 'rok', 'onder'),
    (r'jeans|\bjean\b', 'jeans', 'onder'),
    (r'pantalon|pantolon|trouser|trouwer', 'pantalon', 'onder'),
    (r'broek|worker', 'broek', 'onder'),
    (r'kitten|pump|hak|heel|high geel satin', 'hakken', 'schoen'),
    (r'loafer', 'loafers', 'schoen'),
    (r'laars|laarzen|boot', 'laarzen', 'schoen'),
    (r'sneaker|new balance|9060|samba|adidas sneakers', 'sneakers', 'schoen'),
    (r'sandaal|sandalen|haivanas|slipper|flipflop', 'sandalen', 'schoen'),
    (r'\btas\b|\bbag\b|shopper', 'tas', 'tas'),
    (r'riem|riempje|belt', 'riem', 'accessoire'),
    (r'sjaal|sjaaltje|scarf', 'sjaal', 'accessoire'),
    (r'muts|beanie', 'muts', 'accessoire'),
    (r'pet\b|petje|cap\b', 'pet', 'accessoire'),
    (r'ketting|oorbel|armband', 'sieraad', 'accessoire'),
    (r'zonnebril', 'zonnebril', 'accessoire'),
    (r'bikini|badpak', 'zwemkleding', 'zwem'),
]
CAT_ROL = {'tops': 'boven', 'bottoms': 'onder', 'layers': 'laag', 'jurken': 'heel',
           'eendelig': 'heel', 'bags': 'tas', 'shoes': 'schoen', 'accessories': 'accessoire',
           'swimwear': 'zwem', 'overig': 'accessoire'}

def soort_van(it):
    naam = it['name'].lower()
    # Een set (met +) en een jas gaan altijd voor: "short faux fur coat" is een
    # jas, geen short, en "broek + top co-ord" is één geheel.
    if re.search(r'co-?ord|jumpsuit', naam) and ('+' in naam or re.match(r'co-?ord|.*jumpsuit', naam)):
        return 'co-ord', 'heel'
    if re.search(r'\bcoat\b|\bjas\b|jasje|jacket|trench', naam) and 'blazer' not in naam:
        return ('trenchcoat' if 'trench' in naam else 'jas'), 'jas'
    # Anders telt het woord dat het eerst staat: "rok zwart (hoort bij top)"
    # is een rok.
    beste = None
    for pat, s, rol in SOORTEN:
        m = re.search(pat, naam)
        if m and (beste is None or m.start() < beste[0]):
            beste = (m.start(), s, rol)
    if beste:
        _, s, rol = beste
        if it['cat'] == 'layers' and rol == 'boven':
            return s, 'laag'
        if it['cat'] == 'tops' and rol == 'laag':
            return s, 'boven'
        return s, rol
    return {'tops': 'top', 'bottoms': 'broek', 'layers': 'vest', 'jurken': 'jurk',
            'shoes': 'sneakers', 'bags': 'tas'}.get(it['cat'], 'overig'), CAT_ROL.get(it['cat'], 'accessoire')

# ── TEXTUUR EN MATERIAAL ─────────────────────────────────────────────────────
TEXTUREN = [
    (r'bont|fur|teddy|fleece|mohair|fluffy|harig|pluizig', 'pluizig'),
    (r'grof (geribbed )?gebreid|grof gebreid|ruw gebreid|gehaakt|jacquard', 'grof gebreid'),
    (r'gebreid|tricot|knit', 'fijn gebreid'),
    (r'lak|leereffect|glanzend', 'glans'),
    (r'satijn|satin', 'glans'),
    (r'suède|suede', 'suède'),
    (r'\bleer|leren\b|lakleer|leder', 'leer'),
    (r'denim|jeans', 'denim'),
    (r'linnen', 'linnen'),
    (r'kant|broderie|cutwork', 'kant'),
    (r'tweed|rib|geribd|structured|mesh|twill|gestructureerd|ribfluweel|textuur', 'structuur'),
    (r'metaal|goud|zilver|hars', 'metaal'),
    (r'stro|gevlochten|rubber', 'structuur'),
]
def textuur_van(it):
    v = it.get('vis') or {}
    t = (v.get('textuur', '') + ' ' + it['name']).lower()
    for pat, naam in TEXTUREN:
        if re.search(pat, t):
            return naam
    return 'glad'

MATERIALEN = [
    (r'mohair', 'mohair'), (r'kunstbont|faux fur', 'kunstbont'), (r'fleece|teddy', 'fleece'),
    (r'wol|cashmere', 'wol'), (r'satijn|satin', 'satijn'), (r'suède|suede', 'suède'),
    (r'\bleer|leren\b', 'leer'), (r'denim|jeans', 'denim'), (r'linnen', 'linnen'), (r'kant', 'kant'),
    (r'tweed', 'tweed'), (r'nylon|stretch|scuba|technisch|elastaan', 'synthetisch'),
    (r'viscose', 'viscose'), (r'jersey|katoen|cotton|popeline|twill', 'katoen'),
    (r'metaal|goud|zilver', 'metaal'), (r'rubber', 'rubber'),
]
def materiaal_van(it):
    tg = (it.get('tags') or {}).get('materiaal')
    if isinstance(tg, str) and tg:
        return tg
    t = ((it.get('vis') or {}).get('textuur', '') + ' ' + it['name']).lower()
    for pat, naam in MATERIALEN:
        if re.search(pat, t):
            return naam
    return None

# ── PASVORM ──────────────────────────────────────────────────────────────────
def pasvorm_van(it, soort):
    tg = ((it.get('tags') or {}).get('pasvorm') or '').lower()
    v = ((it.get('vis') or {}).get('vorm', '') + ' ' + it['name'] + ' ' + tg).lower()
    if re.search(r'crop|kort tot|korte snit|cropped', v) and soort not in ('short', 'jeans', 'broek', 'pantalon'):
        return 'kort'
    wijd = r'oversized|wijd|wide|ballon|balloon|barrel|flared|uitlopend|baggy|volumineus|ruim|a-lijn|vleermuis'
    if soort in ('jeans', 'broek', 'pantalon', 'rok', 'short') and re.search(wijd, v):
        return 'wijd'
    if re.search(r'getailleerd|aansluitend|nauwsluitend|slim|strak|peplum|racerback', v):
        return 'aansluitend'
    if re.search(r'oversized|wijd|wide|ballon|balloon|barrel|flared|uitlopend|baggy|volumineus|ruim|a-lijn|vleermuis', v):
        return 'wijd'
    return 'recht'

# ── WARMTE, FORMEEL, COMFORT ─────────────────────────────────────────────────
BASIS = {  # soort: (formeel, comfort)
    't-shirt': (1, 5), 'longsleeve': (2, 5), 'topje': (3, 3), 'top': (3, 3), 'sporttop': (1, 5),
    'blouse': (4, 3), 'trui': (2, 5), 'vest': (2, 5), 'gilet': (3, 4), 'teddy': (1, 5),
    'blazer': (5, 2), 'jas': (3, 3), 'trenchcoat': (4, 3), 'jeans': (2, 4), 'broek': (2, 4),
    'pantalon': (4, 3), 'rok': (3, 3), 'short': (1, 4), 'legging': (1, 5), 'jurk': (4, 3),
    'co-ord': (3, 4), 'hakken': (5, 1), 'loafers': (4, 3), 'laarzen': (3, 3),
    'sneakers': (1, 5), 'sandalen': (2, 4), 'tas': (3, 3), 'riem': (3, 3), 'sjaal': (3, 4),
    'muts': (1, 5), 'pet': (1, 5), 'sieraad': (4, 4), 'zonnebril': (3, 4), 'zwemkleding': (1, 4),
}
def warmte_van(it, soort, textuur):
    v = ((it.get('vis') or {}).get('volume', '') or '').lower()
    if textuur in ('pluizig', 'grof gebreid') or soort in ('jas', 'trenchcoat', 'teddy', 'laarzen', 'muts'):
        return 3
    if v == 'zwaar' and soort not in ('tas',):
        return 3
    if v == 'luchtig' or soort in ('topje', 'short', 'sandalen', 'zwemkleding', 'sporttop') or textuur == 'linnen':
        return 1
    return 2

def seizoen_van(it, warmte):
    s = ((it.get('tags') or {}).get('seizoen') or '').lower()
    if s in ('zomer', 'winter'):
        return s
    if s == 'beide':
        return 'altijd'
    return {1: 'zomer', 2: 'altijd', 3: 'winter'}[warmte]

def foto_van(id_):
    u = fotos.get(id_)
    return u or None

# ── KAST ─────────────────────────────────────────────────────────────────────
kast = []
for it in kast_rt:
    soort, rol = soort_van(it)
    tex = textuur_van(it)
    warm = warmte_van(it, soort, tex)
    fo, co = BASIS.get(soort, (3, 3))
    if tex in ('pluizig', 'grof gebreid', 'fijn gebreid'):
        co = min(5, co + 1)
    if tex in ('glans', 'kant', 'leer') and rol in ('boven', 'onder', 'heel'):
        fo = min(5, fo + 1)
    kl = kleuren_van(it)
    item = {
        'id': it['id'], 'naam': it['name'], 'soort': soort, 'rol': rol,
        # strepen op een sneaker of een logo op een tas zijn geen print
        'kleur': kl[:2] if kl else [], 'print': None if rol == 'schoen' else print_van(it),
        'textuur': tex, 'materiaal': materiaal_van(it),
        'pasvorm': pasvorm_van(it, soort), 'warmte': warm,
        'formeel': fo, 'comfort': co, 'seizoen': seizoen_van(it, warm),
        'foto': foto_van(it['id']),
    }
    if rol == 'schoen' and re.search(r'sandaal|sandalen|slipper|flipflop|haivanas|thong', (it['name'] + ' ' + json.dumps(it.get('vis') or {})).lower()):
        item['open'] = True  # open schoen: niet bij fris of koud weer
    hals = (it.get('tags') or {}).get('hals')
    if hals:
        item['hals'] = hals
    ex = [e['url'] for e in extra_fotos.get(it['id'], []) if e.get('url')]
    if ex:
        item['gedragenFotos'] = ex
    vis = it.get('vis') or {}
    if vis:
        item['beschrijving'] = ', '.join(x for x in [vis.get('kleur'), vis.get('vorm'), vis.get('textuur'), vis.get('details')] if x)
    item['nagekeken'] = False
    kast.append(item)

ids = {x['id'] for x in kast}
op_naam = {x['naam'].strip().lower(): x['id'] for x in kast}

# ── OUTFITS ──────────────────────────────────────────────────────────────────
outfits, mappen = [], []
for b in ls('griette-boards-v3', []):
    mid = b.get('id')
    mappen.append({'id': mid, 'naam': b.get('label') or mid, 'emoji': b.get('emoji') or ''})
    for o in b.get('outfits', []):
        its = [i for i in o.get('items', []) if i in ids]
        if len(its) < 2:
            continue
        uitk = {'id': o['id'], 'naam': o.get('name') or 'Outfit', 'items': its, 'map': mid}
        if o.get('note'):
            uitk['notitie'] = o['note'][:600]
        outfits.append(uitk)

mappen.append({'id': 'kaarten', 'naam': 'Bewaarde kaarten', 'emoji': '🖼'})
for k in ls('griette-kaarten-v1', []):
    its = [op_naam[n.strip().lower()] for n in k.get('items', []) if n.strip().lower() in op_naam]
    outfits.append({'id': k['id'], 'naam': (k.get('titel') or 'Kaart').title(), 'items': its,
                    'map': 'kaarten', 'datum': (k.get('datum') or '')[:10], 'afbeelding': k.get('url')})

gedragen = {}
for datum, its in ls('griette-worn-log-v1', {}).items():
    gedragen[datum] = [i for i in its if i in ids]

# ── KENNIS ───────────────────────────────────────────────────────────────────
# De inspiratieplaat stond als base64 in de browser; nu als losse bestanden.
os.makedirs(os.path.join(DATA, 'inspo'), exist_ok=True)
inspo = []
try:
    from PIL import Image
    for n, p in enumerate(ls('griette-inspoplaat-v1', []), 1):
        if p.get('url'):
            inspo.append({'bestand': p['url']})
            continue
        im = Image.open(io.BytesIO(base64.b64decode(p['data']))).convert('RGB')
        im.thumbnail((900, 900))
        naam = 'inspo/plaat-%02d.jpg' % n
        im.save(os.path.join(DATA, naam), 'JPEG', quality=80)
        inspo.append({'bestand': 'data/' + naam})
except ImportError:
    print('Pillow ontbreekt: inspiratieplaat overgeslagen')

kennis = {
    'kleuren': [{'naam': k['v'], 'hex': k['dot']} for k in kennis_rt['KLEUREN']],
    'eigenKleuren': ls('griette-eigenkleuren-v1', []),
    'kleurbronnen': [{'naam': b['naam'], 'soort': b.get('soort'), 'paren': b.get('paren', {}),
                      'notities': b.get('notities', {}), 'zegt': b.get('zegt', '')}
                     for b in ls('griette-kleurbronnen-v1', [])],
    'combos': [{'id': t['id'], 'label': t['label'], 'uitleg': t.get('desc', ''), 'bron': t.get('bron'),
                'voorbeelden': [{'naam': p['name'], 'sfeer': p.get('vibe', ''), 'kleuren': p.get('tags', []),
                                 'hex': p.get('colors', [])} for p in t.get('presets', [])]}
               for t in kennis_rt['COMBO_TYPES'] if t.get('presets')],
    'trends': kennis_rt['FW_TRENDS'],
    'smaak': ls('griette-stijlprofiel-v1', {}),
    'inspiratieplaat': inspo,
    'gekocht': [{'naam': k, 'datum': v.get('datum', '')[:10]} for k, v in ls('griette-gekocht-v1', {}).items()],
}

# Robin's outfits uit het rapport, gekoppeld aan de kast waar dat kan.
def zoek_in_kast(regel):
    # Alleen wat het rapport exact aanwees. Losser zoeken wees eerder een
    # lichte jeans aan voor "zwarte flared broek"; dat zoekt de app nu live,
    # met de kleurregels, als zij erom vraagt.
    return regel.get('id') if regel.get('id') in ids else None

rapport_outfits = []
for o in kennis_rt['ROBIN_OUTFITS']:
    stukken = []
    for r in o['items']:
        gevonden = zoek_in_kast(r)
        naam = r.get('naam') or next((x['naam'] for x in kast if x['id'] == r.get('id')), r.get('id'))
        stuk = {'naam': naam, 'id': gevonden}
        if not gevonden:
            stuk.update({k: r[k] for k in ('zoek', 'kleur', 'cat') if r.get(k)})
        stukken.append(stuk)
    rapport_outfits.append({'nr': o['nr'], 'naam': o['naam'], 'kleuren': o.get('tags', []), 'stukken': stukken})

def schrijf(naam, obj):
    with open(os.path.join(DATA, naam), 'w') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

schrijf('kast.json', kast)
schrijf('outfits.json', {'mappen': mappen, 'outfits': outfits, 'gedragen': gedragen})
schrijf('kennis.json', kennis)
schrijf('rapport-outfits.json', rapport_outfits)
print(len(kast), 'stuks,', len(outfits), 'outfits,', len(inspo), 'inspiratiefoto\'s,',
      sum(1 for o in rapport_outfits for s in o['stukken'] if s['id']), 'rapportstukken in de kast')
