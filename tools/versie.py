#!/usr/bin/env python3
"""Zet een nieuw versienummer in index.html, zodat telefoons na een update
meteen de nieuwe code laden in plaats van een kopie uit hun geheugen.

Draai dit bij elke wijziging aan app/ of data/:  python3 tools/versie.py
Het schrijft de importmap opnieuw voor alle bestanden in app/.
"""
import os, re, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pad = os.path.join(ROOT, 'index.html')
v = time.strftime('%Y%m%d%H%M')
modules = sorted(os.path.relpath(os.path.join(d, f), ROOT)
                 for d, _, fs in os.walk(os.path.join(ROOT, 'app')) for f in fs if f.endswith('.js'))
kaart = ',\n'.join(f'    "./{m}": "./{m}?v={v}"' for m in modules)
blok = f'<script type="importmap">\n{{\n  "imports": {{\n{kaart}\n  }}\n}}\n</script>'

s = open(pad).read()
s = re.sub(r'<meta name="versie" content="[^"]*">', f'<meta name="versie" content="{v}">', s)
s = re.sub(r'<script type="importmap">.*?</script>', blok, s, flags=re.S)
s = re.sub(r'app/style\.css(\?v=\w+)?', f'app/style.css?v={v}', s)
s = re.sub(r'<script type="module" src="app/main\.js[^"]*">', f'<script type="module" src="./app/main.js?v={v}">', s)
open(pad, 'w').write(s)
print('versie', v, '-', len(modules), 'modules')
