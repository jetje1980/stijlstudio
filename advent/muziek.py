"""Eigen speeldoosmuziek op melodieën die rechtenvrij zijn (traditioneel / 19e eeuw), met galm en een krakend plaatje.
Daarna onder elk filmpje gezet met ffmpeg."""
import numpy as np, wave, subprocess, os, sys, json
SR = 44100
FILMS = "/home/user/stijlstudio/advent/films/"
SP = "/tmp/claude-0/-home-user-stijlstudio/f55e38bf-cb55-5076-bedb-49f8c8e8917c/scratchpad/"
rng = np.random.default_rng(4)

NOOT = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
def freq(n):
    naam, oct_ = n[:-1], int(n[-1])
    return 440 * 2 ** ((NOOT[naam] + 12 * (oct_ + 1) - 69) / 12)
def melodie(tekst):  # "E4:1 E4:1 E4:2 ..." ; R = rust
    uit = []
    for t in tekst.split():
        n, d = t.split(":"); uit.append((n, float(d)))
    return uit

LIEDJES = {
 "jingle": melodie("E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4 F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 "
                   "E4:1 D4:1 D4:1 E4:1 D4:2 G4:2 E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4 F4:1 F4:1 F4:1.5 F4:.5 "
                   "F4:1 E4:1 E4:1 E4:.5 E4:.5 G4:1 G4:1 F4:1 D4:1 C4:4"),
 "wewish": melodie("D4:1 G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 E4:1 E4:1 E4:1 A4:1 A4:.5 B4:.5 A4:.5 G4:.5 F#4:1 D4:1 D4:1 "
                   "B4:1 B4:.5 C5:.5 B4:.5 A4:.5 G4:1 E4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:3"),
 "stille": melodie("G4:1.5 A4:.5 G4:1 E4:3 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 B4:3 C5:2 C5:1 G4:3 A4:2 A4:1 C5:1.5 B4:.5 A4:1 "
                   "G4:1.5 A4:.5 G4:1 E4:3 A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 F5:1.5 D5:.5 B4:1 C5:3 E5:3 "
                   "C5:1 G4:1 E4:1 G4:1.5 F4:.5 D4:1 C4:6"),
 "tannenbaum": melodie("G3:1 C4:1.5 C4:.5 C4:1.5 D4:.5 E4:1.5 E4:.5 E4:2 E4:1 D4:1 E4:1 F4:1.5 B3:.5 D4:1 C4:2 "
                       "G4:1 G4:1 E4:1 A4:1.5 G4:.5 G4:1 F4:1.5 F4:.5 F4:1 F4:1 D4:1 G4:1 F4:1.5 F4:.5 F4:1 E4:2"),
 "deck": melodie("G4:1.5 F4:.5 E4:1 D4:1 C4:1 D4:1 E4:1 C4:1 D4:.5 E4:.5 F4:.5 D4:.5 E4:1.5 D4:.5 C4:1 B3:1 C4:2 "
                 "G4:1.5 F4:.5 E4:1 D4:1 C4:1 D4:1 E4:1 C4:1 D4:.5 E4:.5 F4:.5 D4:.5 E4:1.5 D4:.5 C4:1 B3:1 C4:2"),
 "godrest": melodie("E4:1 E4:1 B4:1 B4:1 A4:1 G4:1 F#4:1 E4:1 D4:1 E4:1 F#4:1 G4:1 A4:1 B4:3 "
                    "E4:1 E4:1 B4:1 B4:1 A4:1 G4:1 F#4:1 E4:1 D4:1 E4:1 F#4:1 G4:1 A4:1 B4:3"),
 "joy": melodie("C5:1 B4:.75 A4:.25 G4:1.5 F4:.5 E4:1 D4:1 C4:2 G4:.5 A4:1.5 A4:.5 B4:1.5 B4:.5 C5:3"),
}
def mineur(mel):  # majeur -> mineur: terts, sext en septiem een halve toon omlaag (in C)
    om = {"E": "Eb", "A": "Ab", "B": "Bb"}
    return [(n if n == "R" else om.get(n[:-1], n[:-1]) + n[-1], d) for n, d in mel]

def speeldoos(f, dur, luid=1.0):
    t = np.arange(int(SR * min(dur + 1.6, 3.5))) / SR
    s = (np.sin(2 * np.pi * f * t) + .42 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 2)
         + .18 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 5) + .08 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9))
    env = np.exp(-t * 2.6) * np.minimum(1, t / .004)
    return s * env * luid
def bel():
    t = np.arange(int(SR * .25)) / SR
    n = rng.standard_normal(len(t)); n = n - np.convolve(n, np.ones(6) / 6, "same")  # ruwe hoogdoorlaat
    return n * np.exp(-t * 22) * .05

def maak(liedje, sec, tempo, octaaf=0, mineur_=False, bellen=False, zacht=False):
    mel = LIEDJES[liedje]
    if mineur_: mel = mineur(mel)
    tel = 60 / tempo
    uit = np.zeros(int(SR * (sec + 4)))
    t = 0.0
    while t < sec:
        for n, d in mel:
            if t >= sec: break
            if n != "R":
                f = freq(n) * 2 ** octaaf
                s = speeldoos(f, d * tel, .55); i = int(t * SR); uit[i:i + len(s)] += s[:len(uit) - i]
                if d >= 1.5:  # lange noot: een zachte octaaf lager eronder
                    s2 = speeldoos(f / 2, d * tel, .22); uit[i:i + len(s2)] += s2[:len(uit) - i]
            t += d * tel
        t += tel  # adempauze tussen herhalingen
    if bellen:
        b = bel()
        for k in range(int(sec / tel)):
            i = int(k * tel * SR); uit[i:i + len(b)] += b[:len(uit) - i] * (1 if k % 2 == 0 else .6)
    uit = uit[:int(SR * sec)]
    # galm: convolutie met wegstervende ruis (via FFT)
    ir = rng.standard_normal(int(SR * 1.6)) * np.exp(-np.arange(int(SR * 1.6)) / SR * 3.2); ir[0] = 0
    n = len(uit) + len(ir)
    nat = np.fft.irfft(np.fft.rfft(uit, n) * np.fft.rfft(ir, n), n)[:len(uit)]
    uit = uit + nat / np.max(np.abs(nat) + 1e-9) * np.max(np.abs(uit)) * .35
    # krakend plaatje
    ruis = rng.standard_normal(len(uit)) * .006
    tik = np.zeros(len(uit)); idx = rng.integers(0, len(uit), int(sec * 9)); tik[idx] = rng.uniform(-.25, .25, len(idx))
    uit = uit + ruis + np.convolve(tik, np.exp(-np.arange(60) / 8), "same") * .4
    uit = uit / np.max(np.abs(uit)) * (.5 if zacht else .7)
    fade = int(SR * .4); uit[:fade] *= np.linspace(0, 1, fade); uit[-int(SR * 1.2):] *= np.linspace(1, 0, int(SR * 1.2))
    return uit

def schrijf(pad, a):
    with wave.open(pad, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())

def duur(mp4):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], capture_output=True, text=True).stdout)

KEUZE = {  # filmpje: (liedje, tempo, octaaf, mineur, bellen)
 "film-intro": ("wewish", 128, 0, False, True), "film-groningen": ("jingle", 150, 0, False, True),
 "film-rendiervous": ("jingle", 62, -1, True, False), "film-gluhckwens": ("deck", 118, 0, False, False),
 "film-piekfijn": ("tannenbaum", 92, 1, False, False), "film-mandatory": ("joy", 100, 0, False, True),
 "film-sleeperig": ("stille", 96, 0, False, False), "film-hulstnodig": ("godrest", 132, 0, False, False),
 "film-kerstraak": ("jingle", 160, 1, False, True), "film-navidad": ("wewish", 150, 0, False, True),
 "stop-slee": ("jingle", 170, 1, False, True), "stop-waslijn": ("deck", 140, 1, False, False), "stop-welkom": ("wewish", 140, 1, False, True),
 "stop-voetstapjes": ("godrest", 120, 1, False, False), "stop-kerstkamer": ("stille", 110, 1, False, False), "stop-mandje": ("joy", 120, 1, False, True),
 "stop-sneeuwtuin": ("tannenbaum", 110, 1, False, False), "stop-schilderijtjes": ("deck", 130, 1, False, False), "stop-kastje": ("godrest", 100, 0, True, False),
 "stop-groningen": ("jingle", 150, 0, False, True),
}
wil = sys.argv[1:] or list(KEUZE)
for naam in wil:
    liedje, tempo, oc, mi, be = KEUZE[naam]
    mp4 = FILMS + naam + ".mp4"
    stil = SP + "stil-" + naam + ".mp4"
    if not os.path.exists(stil): subprocess.run(["cp", mp4, stil], check=True)   # stille versie bewaren als bron
    sec = duur(stil)
    a = maak(liedje, sec, tempo, oc, mi, be)
    wav = SP + naam + ".wav"; schrijf(wav, a)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", stil, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k",
                    "-shortest", "-movflags", "+faststart", mp4], check=True)
    print(naam, liedje, round(sec, 1), "s", os.path.getsize(mp4) // 1024, "kB")
