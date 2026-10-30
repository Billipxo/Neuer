#!/usr/bin/env python3
"""Erzeugt die App-Symbole für Android aus dem Blitz-Symbol der App (public/favicon.svg).

Nur nötig, wenn sich das Symbol ändert:  python3 android/icons-erzeugen.py   (braucht Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw

HIER = Path(__file__).parent
DUNKEL = (15, 23, 42, 255)  # #0f172a
GELB = (250, 204, 21, 255)  # #facc15
# Blitz aus public/favicon.svg (viewBox 512 × 512): M296 44 124 292h114l-32 176 182-256H274z
BLITZ = [(296, 44), (124, 292), (238, 292), (206, 468), (388, 212), (274, 212)]
DICHTEN = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
GLATT = 4  # erst größer zeichnen, dann verkleinern = glatte Kanten


def blitz(bild: Image.Image, mitte_x: float, mitte_y: float, hoehe: float) -> None:
    faktor = hoehe / 424  # Höhe des Blitzes im SVG: 468 - 44
    punkte = [(mitte_x + (x - 256) * faktor, mitte_y + (y - 256) * faktor) for x, y in BLITZ]
    ImageDraw.Draw(bild).polygon(punkte, fill=GELB)


def klassisch(px: int) -> Image.Image:
    """Herkömmliches Symbol: abgerundetes dunkles Quadrat mit Blitz (für Android vor Version 8)."""
    g = px * GLATT
    bild = Image.new('RGBA', (g, g), (0, 0, 0, 0))
    rand = g * 0.04
    ImageDraw.Draw(bild).rounded_rectangle((rand, rand, g - rand, g - rand), radius=g * 0.2, fill=DUNKEL)
    blitz(bild, g / 2, g / 2, g * 0.7)
    return bild.resize((px, px), Image.LANCZOS)


def vordergrund(px: int) -> Image.Image:
    """Vordergrund des adaptiven Symbols (108 dp): Blitz in der sicheren Mitte, Rest durchsichtig."""
    g = px * GLATT
    bild = Image.new('RGBA', (g, g), (0, 0, 0, 0))
    blitz(bild, g / 2, g / 2, g * 0.52)
    return bild.resize((px, px), Image.LANCZOS)


for name, dichte in DICHTEN.items():
    ordner = HIER / 'res' / f'mipmap-{name}'
    ordner.mkdir(parents=True, exist_ok=True)
    klassisch(round(48 * dichte)).save(ordner / 'ic_launcher.png', optimize=True)
    vordergrund(round(108 * dichte)).save(ordner / 'ic_launcher_vordergrund.png', optimize=True)
print('Symbole erzeugt.')
