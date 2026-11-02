#!/usr/bin/env python3
"""Baut aus index.html + css/ + js/ eine einzelne HTML-Datei.

  python3 tools/build_single.py              -> dist/arena-der-verdammten.html (komplettes Dokument)
  python3 tools/build_single.py --fragment   -> dist/arena-fragment.html (ohne <html>/<head>-Gerüst,
                                                für Hosts, die das Gerüst selbst ergänzen)
"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css/style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '</style>')
def inline(m):
    return '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '</script>'
html = re.sub(r'<script src="(js/[a-z]+\.js)"></script>', inline, html)
out_dir = root / 'dist'; out_dir.mkdir(exist_ok=True)
if '--fragment' in sys.argv:
    head = html[html.index('<head>') + 6: html.index('</head>')]
    body = html[html.index('<body>') + 6: html.index('</body>')]
    keep = [l for l in head.split('\n') if not re.search(r'charset|name="viewport"|theme-color|web-app|rel="manifest"|rel="icon"', l)]
    html = '\n'.join(keep).strip() + '\n' + body
    target = out_dir / 'arena-fragment.html'
else:
    target = out_dir / 'arena-der-verdammten.html'
target.write_text(html, encoding='utf-8')
print(f'{target.relative_to(root)}: {len(html)//1024} KB')
