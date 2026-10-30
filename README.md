# Reichsfeuer (Arbeitstitel)

Fantasy-Strategiespiel im Browser – eine Mischung aus **Autobattler** und **Warcraft-3-artigem Basisbau**.
Baue eine Festung im Stil von Clash of Clans, lass deine Truppen automatisch kämpfen und führe einen Helden
(automatisch oder manuell) gegen Computergegner.

## Starten

Keine Installation nötig: `index.html` im Browser öffnen (Chrome, Edge, Firefox oder Safari).
Auch am **Handy und Tablet** spielbar (Touch-Steuerung: Wischen = Karte bewegen, zwei Finger = Zoom,
Tippen = auswählen/bauen, Held antippen und dann Ziel antippen = Held steuern, ☰ = Menü).
Alternativ lokal ausliefern, z. B. mit `python3 -m http.server` und dann `http://localhost:8000` öffnen.

## Was schon drin ist (Prototyp v0.9)

**Spielmodi & Fortschritt**
- **Freies Spiel:** 1 gegen 1, 2 gegen 2 (mit KI-Verbündetem), Jeder gegen jeden (4) – KI einfach/mittel/schwer,
  Gegner-Völker werden jede Runde ausgelost. Spieldauer 20/30/45 Minuten oder unbegrenzt.
- **6 Volkskampagnen** mit eigener Geschichte (je 5 Missionen: vernichten, überleben, Drachen erschlagen,
  Bündnis-Schlacht, Finale auf „Schwer“), z. B. „Die Krone von Valenmark“ (Menschen) oder „Blut und Steppe“ (Orks).
- **Einführung** im ersten Spiel (abschaltbar) und **Anleitung** im Hauptmenü.
- **Volks-XP & Belohnungen:** Jede Partie gibt deinem Volk Erfahrung. Pro Volksstufe gibt es Skins (Veteran, Elite,
  Legendär), Banner (Schwalbenwimpel, Kriegsstandarte), Titel (Rekrut bis Legende) und ab Stufe 3 einen vierten Helden.
  Fortschritt wird im Browser gespeichert.

**Völker**
- 6 Völker + Zufall mit Passiv, **3 Volksfähigkeiten** (freigeschaltet über Haupthaus-Stufe 1/3/5), eigener **Heimatkarte**,
  **eigenen Gebäudenamen** (z. B. Orks: Großhalle, Kriegslager) und **eigener Bauweise** (Elfen-Blätterkronen, Ork-Fellzelte mit Hörnern,
  Zwergen-Steindächer mit Esse, gotische Untoten-Türme, Dämonen-Obsidianspitzen).
- **Talentbaum** (Krieg, Bollwerk, Wohlstand – je 4 Stufen), 1 Punkt pro Heldenstufe, automatisch oder von Hand.
- 7 Einheitenrollen je Volk, 3 Helden je Volk mit Commander-Boni und 2 Fähigkeiten, Helden bis Stufe 10.

**Basis & Wirtschaft**
- 12 Gebäudetypen bis Stufe 5, Maximalstufe in knapp 30 Minuten. Jede Stufe ist sichtbar: Fenster (2), Seitenturm (3),
  Zierleiste und Feuerschalen (4), zweiter Turm und leuchtende Turmspitze (5); Gebäude wachsen mit.
- **Mauer-Upgrade** (Holzpalisade → Steinmauer → Festungsmauer): Ring um die ganze Basis, eigene Truppen gehen hindurch.
- **Goldadern** auf der Karte: Außenposten dort bringen Bonus-Einkommen und sind umkämpft.
- Sichtbare **Arbeiter**, die Gold schürfen und Holz schlagen.
- **Großes Einheitenlimit:** 15 Versorgung je Haupthaus-Stufe, 12 je Unterkunft-Stufe, bis zu 300 pro Spieler
  (Werte in `G.SUPPLY`, `js/data.js`). Bei großen Schlachten oder weitem Herauszoomen werden Figuren automatisch
  vereinfacht gezeichnet, damit das Spiel auch am Handy flüssig bleibt.

**Kampf**
- **Armee-Stile:** „Sammeln & Angreifen“, „Wellen losschicken“ (regelmäßige Angriffswellen), „Nur verteidigen“ +
  „Jetzt angreifen!“. Losgeschickte Einheiten kämpfen, bis sie fallen.
- **Wegfindung:** Eigene und verbündete Truppen gehen durch eigene Gebäude und Mauern hindurch (niemand bleibt in der
  Basis stecken). Gegner müssen um fremde Gebäude herumlaufen (Strömungsfelder auf einem 40-px-Raster); gegnerische
  Mauern werden umgangen, wenn es eine Lücke gibt, sonst eingerissen.
- **Heldenfenster** (immer sichtbar): Lebenspunkte, Erfahrung, Fähigkeiten mit Abklingzeit, Heiltrank, Rückzug,
  Kamera folgt dem Helden, Verhalten „Folgt Armee“ / „Verteidigt Basis“ / „Jagt Monster“ / „Manuell“.
  Steuern: Held auswählen, dann Ziel anklicken bzw. antippen. Beim Zielen zeigen Kreise Reichweite und Wirkungsbereich.
- **Einfache Produktion:** Armee-Vorlagen (Ausgewogen, Schildwall, Sturmangriff, Fernkampf, Arkane Macht),
  Rekrutieren per Einheitenkarte ohne Gebäudeauswahl, Übersicht der laufenden Ausbildung; Regler unter „Feineinstellung“.
- Neutrale Monster mit Beute und Extra-Belohnungen, Händler, Endphase mit Punktewertung.

**Oberfläche**
- **Volks-Designs:** Die Oberfläche passt sich dem gespielten Volk an – Farben, Überschrift-Schrift und Wappen
  (Menschen: Königsblau & Gold, Elfen: Waldgrün & Silber, Untote: Violett & Grabesgrün mit Frakturschrift,
  Orks: Leder & Blutrot, Zwerge: Eisen & Bronze, Dämonen: Obsidian & Lava).
- **Hauptmenü** mit gezeichneten Figuren-Szenen für jedes Volk und jeden Helden; Farben wechseln mit dem gewählten Volk.
- Rohstoffleiste mit Symbolen, Fähigkeiten mit sichtbarer Abklingzeit, Seitenleiste mit Wappen und Titel.

**Atmosphäre**
- **Musik** je Heimatkarte (live erzeugt, wird bei Kämpfen intensiver) und **Kampfgeräusche** (Klingen, Bögen, Magie,
  Explosionen, Todesschreie) – ohne Audiodateien, mit der Web-Audio-API synthetisiert.
- **Gezeichnete Figuren** je Volk und Rolle (Rüstung, Helme, Kapuzen, Bärte, Hauer, Hörner, Totenschädel, Waffen, Schilde in Spielerfarbe), Tiere und Monster mit eigener Gestalt.
- **Animationen:** Laufen, Ausfallschritte, Waffenschwünge, umfallende Gefallene, hämmernde Baumeister.
- **Blut** (abschaltbar): Spritzer, Lachen, Leichen; Trümmer zerstörter Gebäude.
- **Tiere passend zur Karte** (Hasen, Rehe, Krähen, Kröten, Geier, Füchse, Glühwürmchen, Fledermäuse …), die vor Truppen fliehen.

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| WASD / Pfeiltasten / Mausrand / Ziehen | Kamera bewegen |
| Mausrad | Zoom |
| Linksklick | Auswählen, Gebäude platzieren, Fähigkeitsziel |
| Rechtsklick | Held bewegen/angreifen, Abbrechen |
| Held auswählen + Linksklick | Held bewegen/angreifen (schaltet auf manuell) |
| H | Held manuell / automatisch |
| Q / E | Heldenfähigkeit 1 / 2 auf Mausposition |
| 1 / 2 / 3 (R = 1) | Volksfähigkeiten |
| + / − | Zoom |
| Leertaste | Kamera auf Held |
| P | Pause |
| Esc | Abbrechen / Auswahl aufheben |

## Projektstruktur

```
index.html        Einstieg
css/style.css     Oberfläche
js/data.js        Spieldaten: Völker, Einheiten, Helden, Gebäude, Gegenstände, Monster, Karten
js/game.js        Engine: Wirtschaft, Basisbau, Produktion, Kampf, Helden, KI, Atmosphäre
js/audio.js       Musik und Geräusche (Web-Audio-Synthese)
js/profile.js     Profil, Volks-XP, Skins, Kampagne
js/render.js      Canvas-Darstellung (Comic-Stil), Heimatkarten, Minikarte
js/ui.js          Menü, HUD, Seitenleiste, Eingabe
js/main.js        Spielschleife
```

Balancing-Werte stehen gesammelt in `js/data.js` und lassen sich dort leicht anpassen.

## Hinweis zu Unity

Alle Spielinhalte (Völker, Einheiten, Gebäude, Talente, Kampagne) stehen als reine Daten in `js/data.js` und
`js/profile.js`. Bei einem späteren Umstieg auf Unity lassen sie sich fast 1:1 als JSON/ScriptableObjects übernehmen.
