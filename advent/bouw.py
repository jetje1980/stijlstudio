"""Maakt index.html voor de echte website (adventscalender.app) van kalender.html (de bron, ook voor de claude.ai-preview)."""
from pathlib import Path
hier = Path(__file__).parent
bron = (hier / "kalender.html").read_text()
(hier / "index.html").write_text('<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  '<meta name="theme-color" content="#7c1d26">\n'
  '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="icon" href="icoon-192.png">\n'
  '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Advent">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
  '<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}</style>\n'
  '</head>\n<body>\n' + bron + '\n</body>\n</html>\n')
print("index.html gemaakt")
