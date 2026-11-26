SP = "/tmp/claude-0/-home-user-stijlstudio/f55e38bf-cb55-5076-bedb-49f8c8e8917c/scratchpad/"
exec(open(SP + "clips_s.py").read().split("# ---------- 1.")[0])
k = 1.17; D = lambda b: tuple(int(v * k) for v in b)
random.seed(21)
HAND = lambda n: ImageFont.truetype(SP + "Caveat.ttf", n)
SERIF = lambda n: ImageFont.truetype(SP + "Fraunces.ttf", n)

def houtmuur():
    m = Image.new("RGBA", (W, H), (150, 108, 72, 255)); d = ImageDraw.Draw(m); r = random.Random(3)
    for x in range(0, W, 48):
        c = r.randint(-12, 12); d.rectangle((x, 0, x + 47, H), fill=(150 + c, 108 + c, 72 + c, 255)); d.line((x, 0, x, H), fill=(110, 76, 48, 255), width=2)
    vloer = Image.new("RGBA", (W, 80), (196, 160, 118, 255)); dv = ImageDraw.Draw(vloer)
    for x in range(0, W, 60): dv.line((x, 0, x - 30, 80), fill=(170, 135, 95, 255), width=2)
    m.alpha_composite(vloer, (0, H - 80)); return m
HOUT = houtmuur(); BORD = bordeauxmuur()
def sprong(t): return -math.sin(t * math.pi) * 60

def kaartje(tekst, b=74, h=44, hoek=0):
    t = Image.new("RGBA", (b, h), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
    d.polygon([(10, 0), (b - 1, 0), (b - 1, h - 1), (10, h - 1), (0, h // 2)], fill=(211, 180, 138, 255))
    d.ellipse((7, h // 2 - 4, 15, h // 2 + 4), fill=(120, 80, 50, 255))
    d.text((b // 2 + 6, h // 2), tekst, font=HAND(26), fill=(124, 29, 38, 255), anchor="mm")
    return t.rotate(hoek, expand=True, resample=Image.BICUBIC)

mf = foto("60f5a81a")
groen = schaal(knip(mf, D((248, 1238, 392, 1360))), 56); geel = schaal(knip(mf, D((402, 1250, 552, 1412))), 56)
stok = schaal(knip(mf, D((562, 1232, 672, 1335))), 46)

# ---------- kringloop: spullen verschijnen, prijskaartjes springen erop ----------
kast = schaal(knip(foto("7ebac087"), D((245, 835, 680, 1315))), 120)
bank = schaal(knip(foto("030087c6"), D((205, 868, 715, 1292))), 150)
lamp = schaal(knip(foto("a9aee84c"), (575, 870, 712, 1420)), 44)
slee = schaal(knip(foto("391e3feb"), (280, 1060, 800, 1460)), 130)
spul = [(kast, (24, H - 80 - kast.height + 12), "€ 4"), (bank, (150, H - 80 - bank.height + 10), "€ 2"),
        (lamp, (318, H - 80 - lamp.height + 8), "€ 1"), (slee, (340, H - 80 - slee.height + 14), "gratis")]
fr = []
for i in range(24):
    f = HOUT.copy()
    for n, (img, (x, y), prijs) in enumerate(spul):
        s0 = 1 + n * 3
        if i >= s0: plak(f, img, (x, y - (18 if i == s0 else 0)))
    for n, (img, (x, y), prijs) in enumerate(spul):
        s1 = 13 + n * 2
        if i >= s1:
            kp = kaartje(prijs, 92 if prijs == "gratis" else 74, 44, -12 if n % 2 else 10)
            plak(f, kp, (x + img.width // 2 - 30, y - 30 - (20 if i == s1 else 0)))
    fr.append(f)
bewaar("kringloop", fr)

# ---------- wensen: enveloppen vallen in de brievenbus, vlaggetje omhoog ----------
bus = schaal(knip(foto("63af0749"), (225, 1205, 350, 1365)), 120)
bx, by = (W - bus.width) // 2, 70
fr = []
for i in range(24):
    f = BORD.copy(); d = ImageDraw.Draw(f)
    d.rectangle((W // 2 - 6, by + bus.height - 10, W // 2 + 6, H - 40), fill=(138, 90, 54, 255))
    plak(f, bus, (bx, by))
    for n in range(6):
        s0 = 2 + n * 3
        if s0 <= i < s0 + 3:
            ey = -50 + (i - s0) * 50; ex = bx + bus.width // 2 - 24 + (n % 3 - 1) * 6
            if ey < by + 18:
                d.rectangle((ex, ey, ex + 48, ey + 32), fill=(244, 238, 226, 255), outline=(205, 193, 172, 255))
                d.ellipse((ex + 18, ey + 10, ex + 30, ey + 22), fill=(194, 42, 51, 255))
    if i >= 20:
        d.rectangle((bx + bus.width + 2, by + 10, bx + bus.width + 7, by + 50), fill=(184, 146, 74, 255))
        d.rectangle((bx + bus.width + 2, by + 10, bx + bus.width + 24, by + 22), fill=(194, 42, 51, 255))
    teller = min(6, max(0, (i - 2) // 3 + 1)) if i >= 4 else 0
    plak(f, kaartje(f"{teller}/6", 84, 44, -6), (40, H - 120), met_schaduw=True)
    fr.append(f)
bewaar("wensen", fr)

# ---------- sinterklaas: cadeautjes stapelen zich op, een lootje vouwt open ----------
fr = []
stapel = [(geel, (190, H - 80 - 56)), (groen, (250, H - 80 - 56)), (geel, (218, H - 80 - 108)), (groen, (204, H - 80 - 158)), (stok, (262, H - 80 - 110))]
for i in range(26):
    f = BORD.copy()
    for n, (img, (x, y)) in enumerate(stapel):
        s0 = 1 + n * 3
        if i >= s0:
            t = min(1, (i - s0) / 2); yy = -80 + (y + 80) * t
            plak(f, img.rotate((8 if n % 2 else -6) if i < s0 + 3 else (3 if n % 2 else -2), expand=True, resample=Image.BICUBIC), (x, yy))
    if i >= 17:
        open_ = min(1, (i - 17) / 3)
        lb, lh = 150, int(20 + 70 * open_)
        l = Image.new("RGBA", (lb, lh), (255, 253, 247, 255)); dl = ImageDraw.Draw(l)
        dl.rectangle((0, 0, lb - 1, lh - 1), outline=(184, 146, 74, 255), width=2)
        if open_ >= 1: dl.text((lb // 2, lh // 2), "Jij weet wie.", font=HAND(30), fill=(124, 29, 38, 255), anchor="mm")
        plak(f, l.rotate(-5, expand=True, resample=Image.BICUBIC), (300, 70))
    fr.append(f)
bewaar("sinterklaas", fr)
