# Reichsfeuer (Arbeitstitel)

Fantasy-Strategiespiel im Browser – eine Mischung aus **Autobattler** und **Warcraft-3-artigem Basisbau**.
Baue eine Festung im Stil von Clash of Clans, lass deine Truppen automatisch kämpfen und führe einen Helden
(automatisch oder manuell) gegen Computergegner.

## Starten

Keine Installation nötig: `index.html` im Browser öffnen (Chrome, Edge oder Firefox).
Alternativ lokal ausliefern, z. B. mit `python3 -m http.server` und dann `http://localhost:8000` öffnen.

## Was schon drin ist (Prototyp v0.1)

- **6 Völker + Zufall:** Menschen, Elfen, Untote, Orks, Zwerge, Dämonen – jedes mit eigener passiver
  Fähigkeit, einer aktiven **Volksfähigkeit** (Taste R) und einer eigenen **Heimatkarte**
  (Grüne Auen, Silberwald, Verfluchte Sümpfe, Rote Steppe, Frostgipfel, Aschenlande).
- **7 Einheitenrollen je Volk:** Tank, Nahkampf, Fernkampf, Magier, Heiler, Support (mit Aura), Beschwörer.
- **3 Helden je Volk** mit unterschiedlichen **Commander-Boni** und je 2 Fähigkeiten. Helden steigen bis Stufe 10 auf.
- **Basisbau:** 11 Gebäudetypen, platzierbar innerhalb des Basisrings, Ausbau bis Stufe 5.
  Das Haupthaus bestimmt Limits und Höchststufen. Der Weg zur Maximalstufe dauert knapp 30 Minuten.
- **Rohstoffe:** Gold und Holz, Arbeiter werden automatisch ausgebildet und verteilt (manuell einstellbar).
- **Produktion:** automatisch nach einstellbarer Armee-Zusammensetzung, pro Gebäude mit Fokus, an/aus und Warteschlange.
- **Abwehr:** Wachturm, Kanonenturm, schießendes Haupthaus. **Schmiede:** Waffen, Rüstung und Ausbildung.
- **Einheiten steigen auf** (Stufe 1–5) durch Kampferfahrung; höhere Gebäudestufen bilden stärkere Einheiten aus.
- **Neutrale Monster** (Wölfe, Banditen, Trolle, Golems, Drachen) mit Gold, Holz, Beute und Extra-Belohnungen
  (Söldner, Armee-Segen, Drachenblut).
- **Händler:** Der Held kauft Ausrüstung (automatisch oder über den Händler-Tab).
- **Modi:** 1 gegen 1, 2 gegen 2 (mit KI-Verbündetem), Jeder gegen jeden (4 Spieler).
- **KI-Gegner:** einfach, mittel, schwer – gegnerische Völker werden jede Runde zufällig gewählt.
- **Spielende:** Ein Volk ist besiegt, wenn sein Haupthaus fällt.
- **Spieldauer:** wählbar 20 / 30 (Standard) / 45 Minuten oder unbegrenzt. In den letzten 5 Minuten läuft die
  **Endphase**: Alle Armeen greifen an, Gebäude erleiden steigenden Belagerungsschaden (+25 % bis +150 %).
  Ist danach niemand besiegt, gewinnt das Team mit der höchsten Punktzahl
  (Haupthaus-LP, Gebäudestufen, Armee, Heldenstufe, Siege, Forschung).
- **Spieltempo:** zentral über `G.PACE` in `js/data.js` einstellbar.

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| WASD / Pfeiltasten / Mausrand / Ziehen | Kamera bewegen |
| Mausrad | Zoom |
| Linksklick | Auswählen, Gebäude platzieren, Fähigkeitsziel |
| Rechtsklick | Held bewegen/angreifen (manueller Modus), Abbrechen |
| H | Held manuell / automatisch |
| Q / E | Heldenfähigkeit 1 / 2 auf Mausposition |
| R | Volksfähigkeit |
| Leertaste | Kamera auf Held |
| P | Pause |
| Esc | Abbrechen / Auswahl aufheben |

## Projektstruktur

```
index.html        Einstieg
css/style.css     Oberfläche
js/data.js        Spieldaten: Völker, Einheiten, Helden, Gebäude, Gegenstände, Monster, Karten
js/game.js        Engine: Wirtschaft, Basisbau, Produktion, Kampf, Helden, KI
js/render.js      Canvas-Darstellung (Comic-Stil), Heimatkarten, Minikarte
js/ui.js          Menü, HUD, Seitenleiste, Eingabe
js/main.js        Spielschleife
```

Balancing-Werte stehen gesammelt in `js/data.js` und lassen sich dort leicht anpassen.
