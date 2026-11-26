SP = "/tmp/claude-0/-home-user-stijlstudio/f55e38bf-cb55-5076-bedb-49f8c8e8917c/scratchpad/"
exec(open(SP + "film.py").read().split("wat = sys.argv")[0])

def label(tekst, sub=None, breed=None):
    f = HAND(64); breed = max(breed or 0, int(f.getlength(tekst)) + 110, int(SERIF(22).getlength(sub or "")) + 90, 360)
    h = 170 if sub else 130
    t = Image.new("RGBA", (breed + 30, h + 30), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
    sh = Image.new("RGBA", t.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((18, 22, breed + 18, h + 22), 30, fill=(30, 15, 10, 110))
    t.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d.rounded_rectangle((12, 12, breed + 12, h + 12), 30, fill=(255, 253, 246, 255), outline=(184, 146, 74, 255), width=3)
    d.rounded_rectangle((22, 22, breed + 2, h + 2), 22, outline=(184, 146, 74, 140), width=1)
    d.text((breed // 2 + 12, 72 if sub else h // 2 + 12), tekst, font=f, fill=(124, 29, 38, 255), anchor="mm")
    if sub: d.text((breed // 2 + 12, 132), sub, font=SERIF(22), fill=(120, 100, 90, 255), anchor="mm")
    if t.width > W - 20: t = t.resize((W - 20, int(t.height * (W - 20) / t.width)), Image.LANCZOS)
    return t

def F(n, box, kleur=.9, sepia=0): return warm(foto(n, box), kleur, sepia)
def K(n): return warm(kamer(n))
G1, G2, G3 = foto("b6025a21"), foto("8932544c"), foto("12e2ce83")
def G(img, box, blur=0):
    im = warm(img.crop(tuple(int(v * k) for v in box)), .55, .35)
    return im.filter(ImageFilter.GaussianBlur(blur)) if blur else im

FILMS = {
  "intro": ([(F("ce956c30", (60, 300, 760, 1330)), 3.6, 1.0, 1.18, 0, -.6), (F("29668888", (75, 390, 848, 1420)), 3.2, 1.15, 1.0, 0, .8),
             (K("kerstkamer"), 3.2, 1.0, 1.2, .3, .2), (F("56528474", (0, 620, 923, 1700)), 3.6, 1.15, 1.0, .5, 0)],
            [("Family Crazy Adventskalender", "26 dagen", .6, 4.2, 380), ("Dag 1. Nog 25.", None, 7.6, 10.9, 230)]),
  "groningen": ([(G(G3, (0, 1040, 600, 1420), 3), 3.2, 1.0, 1.1, 0, 0), (G(G2, (0, 1030, 780, 1420)), 3.6, 1.0, 1.25, .4, -.3),
                 (G(G1, (0, 500, 640, 1200)), 3.4, 1.08, 1.0, -.3, .5), (F("839938e6", (0, 620, 923, 1310), .85, .1), 3.6, 1.0, 1.15, .2, 0)],
                [("Groningen", "kerstkermis", .5, 3.4, 220), ("Reuzenrad. Eigen risico.", None, 7.6, 11.1, 240)]),
  "rendiervous": ([(F("47ba589f", (0, 470, 923, 1630)), 3.4, 1.0, 1.15, -.4, .4), (K("kerstkamer"), 3.2, 1.15, 1.0, .3, 0),
                   (F("619a9863", (0, 500, 923, 1690)), 3.4, 1.0, 1.15, .4, 0), (F("47ba589f", (0, 462, 923, 1154)), 3.2, 1.1, 1.0, 0, .3)],
                  [("Rendier-vous", "bij de kachel", .6, 4.0, 380), ("Rudolf komt niet meer.", None, 7.2, 10.5, 230)]),
  "gluhckwens": ([(F("71e6f700", (0, 620, 923, 1700)), 3.4, 1.0, 1.2, 0, -.3), (F("56528474", (0, 720, 760, 1290)), 3.2, 1.15, 1.0, .4, 0),
                  (F("6612cc26", (150, 1060, 843, 1580)), 3.4, 1.0, 1.15, -.3, .2), (F("56528474", (0, 620, 923, 1700)), 3.2, 1.1, 1.0, 0, 0)],
                 [("Glüh-ckwens", "proost", .6, 3.8, 380), ("Onder de 18: chocomel. Klaar.", None, 7.2, 10.5, 230)]),
  "piekfijn": ([(F("ce956c30", (60, 260, 720, 1000)), 3.4, 1.0, 1.2, 0, -.5), (F("35106959", (0, 450, 620, 915)), 3.4, 1.0, 1.15, .3, 0),
                (F("9d2ebbf7", (50, 365, 840, 800)), 3.2, 1.15, 1.0, -.3, 0), (F("29668888", (75, 840, 848, 1420)), 3.2, 1.0, 1.12, 0, .3)],
               [("Piek-fijn", "de boom staat", .6, 3.8, 380), ("Nog.", None, 7.2, 10.5, 230)]),
  "mandatory": ([(F("47ba589f", (0, 600, 923, 1450)), 3.6, 1.0, 1.2, 0, .3), (F("60f5a81a", (150, 700, 780, 1450)), 3.2, 1.15, 1.0, 0, 0),
                 (F("47ba589f", (0, 462, 923, 1154)), 3.2, 1.0, 1.12, .3, 0), (F("5481f259", (0, 700, 923, 1390)), 3.2, 1.1, 1.0, -.2, 0)],
                [("Mand-atory", "iedereen krijgt er één", .6, 3.8, 380), ("Ruilen kan niet.", None, 7.2, 10.5, 230)]),
  "sleeperig": ([(F("391e3feb", (150, 850, 800, 1500)), 3.2, 1.0, 1.2, 0, 0), (F("839938e6", (0, 620, 923, 1310)), 3.4, 1.15, 1.0, .2, 0),
                 (F("d1b75f90", (0, 462, 923, 1154)), 3.4, 1.0, 1.15, -.3, 0), (F("d1b75f90", (0, 700, 923, 1390)), 3.2, 1.1, 1.0, 0, .2)],
                [("Slee-perig?", "nog één nacht", .6, 3.8, 380), ("Ogen dicht. Hij kijkt.", None, 7.2, 10.5, 230)]),
  "hulstnodig": ([(F("6612cc26", (150, 1060, 843, 1580)), 3.4, 1.0, 1.18, .3, 0), (F("6612cc26", (0, 600, 470, 953)), 3.2, 1.15, 1.0, 0, 0),
                  (F("56528474", (0, 720, 760, 1290)), 3.2, 1.0, 1.15, -.3, 0), (F("71e6f700", (0, 780, 923, 1470)), 3.4, 1.1, 1.0, 0, .2)],
                 [("Hulst nodig?", "samen inpakken", .6, 3.8, 380), ("Plakband is op.", None, 7.2, 10.5, 230)]),
  "kerstraak": ([(F("ce956c30", (60, 950, 560, 1325)), 3.4, 1.0, 1.18, 0, .3), (F("29668888", (75, 470, 848, 1050)), 3.2, 1.15, 1.0, 0, 0),
                 (F("29668888", (75, 840, 848, 1420)), 3.2, 1.0, 1.15, .3, 0), (F("63af0749", (190, 830, 740, 1320)), 3.2, 1.1, 1.0, 0, 0)],
                [("Kerst-raak", "er is post", .6, 3.8, 380), ("Geen post? Begrijpelijk.", None, 7.2, 10.5, 230)]),
  "navidad": ([(F("56528474", (0, 620, 923, 1700)), 3.4, 1.0, 1.15, 0, 0), (F("619a9863", (300, 700, 923, 1167)), 3.2, 1.15, 1.0, .3, 0),
               (F("5481f259", (0, 700, 923, 1390)), 3.2, 1.0, 1.15, -.3, 0), (F("1c27d639", (0, 462, 923, 1154)), 3.4, 1.1, 1.0, 0, .2)],
              [("Feliz Navi-DAD", "Crazy Christmas Games", .6, 3.8, 380), ("Verliezen mag. Afwassen moet.", None, 7.2, 10.5, 230)]),
  "jarig": ([(F("56528474", (0, 720, 760, 1290)), 3.4, 1.0, 1.15, .3, 0), (F("71e6f700", (0, 620, 923, 1700)), 3.2, 1.15, 1.0, 0, -.3),
             (F("6612cc26", (0, 600, 470, 953)), 3.2, 1.0, 1.15, -.3, 0), (F("5481f259", (0, 700, 923, 1390)), 3.4, 1.1, 1.0, 0, .2)],
            [("Frederique 21", "7 december", .6, 3.8, 380), ("Geen weg terug.", None, 7.2, 10.5, 230)]),
  "lampjes": ([(F("ce956c30", (60, 260, 720, 1000)), 3.4, 1.0, 1.18, 0, -.4), (F("9d2ebbf7", (50, 365, 840, 800)), 3.2, 1.15, 1.0, .3, 0),
              (F("35106959", (0, 450, 620, 915)), 3.2, 1.0, 1.12, -.3, 0), (K("kerstkamer"), 3.4, 1.1, 1.0, 0, .2)],
             [("Lampjes", "er doet er één het niet", .6, 3.8, 380), ("Welke? Zoek maar.", None, 7.2, 10.5, 230)]),
  "drienachten": ([(F("d1b75f90", (0, 462, 923, 1154)), 3.4, 1.0, 1.15, -.3, 0), (F("839938e6", (0, 620, 923, 1310)), 3.2, 1.15, 1.0, .2, 0),
                  (F("35106959", (0, 450, 620, 915)), 3.2, 1.0, 1.12, .3, 0), (F("d1b75f90", (0, 700, 923, 1390)), 3.4, 1.1, 1.0, 0, .2)],
                 [("Drie nachten", "nog", .6, 3.8, 380), ("Tellen helpt niet.", None, 7.2, 10.5, 230)]),
}
wil = sys.argv[1:] or list(FILMS)
UIT0 = UIT
for naam in wil:
    shots, titels = FILMS[naam]
    titels = [(label(t, s), a, b, y) for t, s, a, b, y in titels]
    maak("film-" + naam, shots, titels, met_sneeuw=naam in ("intro", "groningen", "sleeperig", "piekfijn", "kerstraak", "lampjes", "drienachten"), bokeh_aan=True)
