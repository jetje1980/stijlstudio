"""Alle 26 filmpjes afwerken voor doorsturen: startbeeld (2 s) erin gebakken, zachte overgang, muziek vanaf de eerste seconde."""
import os, subprocess, shutil, sys
SP = "/tmp/claude-0/-home-user-stijlstudio/f55e38bf-cb55-5076-bedb-49f8c8e8917c/scratchpad/"
exec(open(SP + "muziek.py").read().split("wil = sys.argv")[0])          # maak(), schrijf(), duur(), KEUZE, LIEDJES
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
HAND = lambda n: ImageFont.truetype(SP + "Caveat.ttf", n)
SERIF = lambda n: ImageFont.truetype(SP + "Fraunces.ttf", n)

LIEDJES["birthday"] = melodie("G4:.75 G4:.25 A4:1 G4:1 C5:1 B4:2 G4:.75 G4:.25 A4:1 G4:1 D5:1 C5:2 G4:.75 G4:.25 G5:1 E5:1 C5:1 B4:1 A4:2 F5:.75 F5:.25 E5:1 C5:1 D5:1 C5:3")
KEUZE.update({"film-jarig": ("birthday", 104, 0, False, True), "film-lampjes": ("jingle", 140, 1, False, True), "film-drienachten": ("tannenbaum", 84, 0, False, False),
              "stop-kringloop": ("deck", 140, 1, False, False), "stop-wensen": ("wewish", 140, 1, False, True), "stop-sinterklaas": ("joy", 120, 1, False, True)})

DAGEN = [("film-intro", "Family Crazy Adventskalender"), ("stop-waslijn", "Waslijn. Er hangt iets."), ("stop-welkom", "Welkom. Voeten vegen."),
 ("stop-voetstapjes", "Voetstappen. Iemand was hier."), ("stop-kerstkamer", "Chocomel. Slagroom is op."), ("film-rendiervous", "Rendier-vous"),
 ("film-jarig", "Frederique 21"), ("stop-slee", "Sleetje. Geen remmen."), ("stop-mandje", "Mandje. Alles erin."), ("stop-kastje", "Kastje. Geen lijk."),
 ("film-piekfijn", "Piek-fijn"), ("stop-sneeuwtuin", "Sneeuwtuin. Koud."), ("stop-kringloop", "Kringloop. Alles moet weg."), ("stop-schilderijtjes", "Lijstjes. Eén hangt scheef."),
 ("film-hulstnodig", "Hulst nodig?"), ("film-kerstraak", "Kerst-raak"), ("film-gluhckwens", "Glüh-ckwens"), ("film-lampjes", "Lampjes"),
 ("film-mandatory", "Mand-atory"), ("film-groningen", "Groningen"), ("stop-groningen", "Kermis. Overleefd."), ("stop-wensen", "Wensen. Ze zijn binnen."),
 ("film-drienachten", "Drie nachten"), ("film-sleeperig", "Slee-perig?"), ("film-navidad", "Feliz Navi-DAD"), ("stop-sinterklaas", "Sinterklaas. Eindelijk.")]

def bron(naam):
    stil = SP + "stil-" + naam + ".mp4"
    if os.path.exists(stil): return stil
    if naam.startswith("stop-"):  # nieuwe stopmotion uit losse beeldjes
        n = naam[5:]
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", "8", "-i", f"{SP}stopframes/{n}/%02d.jpg", "-vf",
                        "tpad=stop_mode=clone:stop_duration=1.5,scale=640:480:flags=lanczos,format=yuv420p", "-r", "24", "-c:v", "libx264", "-crf", "25", stil], check=True)
    else:
        shutil.copy(FILMS + naam + ".mp4", stil)
    return stil

def grootte(mp4):
    o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", mp4], capture_output=True, text=True).stdout.strip()
    return tuple(int(x) for x in o.split(","))

def startbeeld(naam, titel, dag, stil):
    w, h = grootte(stil); d_ = duur(stil)
    still = SP + "still.jpg"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(5.6 if naam.startswith("film-") else d_ * .66), "-i", stil, "-frames:v", "1", "-q:v", "3", still], check=True)
    poster = Image.open(still).convert("RGB"); poster.save(FILMS + naam + ".jpg", quality=80)   # poster voor de app (zonder tekst)
    bg = ImageEnhance.Brightness(poster.filter(ImageFilter.GaussianBlur(4))).enhance(.62).convert("RGBA")
    s = w / 800
    soort = "Sfeerfilmpje" if naam.startswith("film-") else "Stopmotion"
    f_t = HAND(int(64 * s)); tb = max(f_t.getlength(titel) + 110 * s, 420 * s)
    kb, kh = int(tb), int(250 * s)
    kaart = Image.new("RGBA", (kb + 40, kh + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(kaart)
    sch = Image.new("RGBA", kaart.size, (0, 0, 0, 0)); ImageDraw.Draw(sch).rounded_rectangle((26, 30, kb + 26, kh + 30), int(28 * s), fill=(20, 10, 6, 150))
    kaart.alpha_composite(sch.filter(ImageFilter.GaussianBlur(12)))
    d.rounded_rectangle((16, 16, kb + 16, kh + 16), int(28 * s), fill=(255, 253, 246, 255), outline=(184, 146, 74, 255), width=max(2, int(3 * s)))
    d.rounded_rectangle((16 + 10 * s, 16 + 10 * s, kb + 16 - 10 * s, kh + 16 - 10 * s), int(20 * s), outline=(184, 146, 74, 140), width=1)
    cx = kb // 2 + 16
    d.text((cx, 16 + 50 * s), soort.upper(), font=SERIF(int(17 * s)), fill=(125, 111, 104, 255), anchor="mm")
    d.text((cx, 16 + 112 * s), titel, font=f_t, fill=(124, 29, 38, 255), anchor="mm")
    d.line((cx - 60 * s, 16 + 160 * s, cx + 60 * s, 16 + 160 * s), fill=(184, 146, 74, 255), width=max(1, int(2 * s)))
    d.text((cx, 16 + 196 * s), f"Family Crazy Adventskalender · dag {dag}", font=SERIF(int(20 * s)), fill=(120, 100, 90, 255), anchor="mm")
    if kaart.width > w - 20: kaart = kaart.resize((w - 20, int(kaart.height * (w - 20) / kaart.width)), Image.LANCZOS)
    bg.alpha_composite(kaart, ((w - kaart.width) // 2, (h - kaart.height) // 2))
    png = SP + "kaart.png"; bg.convert("RGB").save(png)
    return png

doorsturen = SP + "doorsturen/"; os.makedirs(doorsturen, exist_ok=True)
wil = set(sys.argv[1:])
for dag, (naam, titel) in enumerate(DAGEN, 1):
    if wil and naam not in wil: continue
    stil = bron(naam)
    png = startbeeld(naam, titel, dag, stil)
    tmp = SP + "tmp-" + naam + ".mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-framerate", "24", "-t", "2.5", "-i", png, "-i", stil, "-filter_complex",
                    "[0:v]format=yuv420p,setsar=1[a];[1:v]fps=24,format=yuv420p,setsar=1[b];[a][b]xfade=transition=fade:duration=0.5:offset=2.0[v]",
                    "-map", "[v]", "-c:v", "libx264", "-crf", "25", "-preset", "slow", "-pix_fmt", "yuv420p", tmp], check=True)
    sec = duur(tmp)
    liedje, tempo, oc, mi, be = KEUZE[naam]
    wav = SP + naam + ".wav"; schrijf(wav, maak(liedje, sec, tempo, oc, mi, be))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k",
                    "-shortest", "-movflags", "+faststart", FILMS + naam + ".mp4"], check=True)
    os.remove(tmp)
    shutil.copy(FILMS + naam + ".mp4", f"{doorsturen}Dag {dag:02d} - {titel.replace('?', '').replace('/', '-')}.mp4")
    print(dag, naam, round(sec, 1), "s", os.path.getsize(FILMS + naam + ".mp4") // 1024, "kB")
