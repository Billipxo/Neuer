# Arena der Verdammten

Ein Fantasy-Roguelike-Arenaspiel für das Handy. Es läuft komplett im Browser, ohne Installation und ohne Abhängigkeiten.

## Spielen

`index.html` im Browser öffnen. Am Handy geht das am besten über GitHub Pages mit dem
Workflow `.github/workflows/pages.yml`:

1. **Settings → Pages → Build and deployment → Source: „GitHub Actions“** einstellen.
2. Den Workflow starten: entweder diesen Branch nach `main` mergen (dann läuft er automatisch)
   oder unter **Actions → GitHub Pages → Run workflow** von Hand. Für einen anderen Branch als
   `main` muss dieser vorher unter **Settings → Environments → github-pages** erlaubt werden.
3. Die Seite im Handy-Browser öffnen und über „Zum Home-Bildschirm hinzufügen“ wie eine App starten.
   Nach dem ersten Laden funktioniert das Spiel auch offline.

## Steuerung

- **Bewegen:** irgendwo auf den Bildschirm tippen und ziehen (schwebender Joystick)
- **Angriff:** automatisch auf den nächsten Gegner in Sichtlinie
- **Ausweichen 💨:** kurzer Hechtsprung mit Unverwundbarkeit
- **Fähigkeit:** großer runder Knopf unten rechts
- Tastatur: WASD / Pfeiltasten, Leertaste = Fähigkeit, Umschalt = Ausweichen, Esc = Pause

Im allerersten Raum führt ein kurzes Tutorial durch die Steuerung.

## Inhalt

- **7 Helden:** Krieger, Magierin, Jägerin, Nekromantin, Paladin (Bumerang-Hammer, geweihter Boden, Geschosse zurückwerfen),
  Alchemistin (Flaschen im Bogen, Säure- und Feuerpfützen, Strudel-Kessel) und Berserkerin (Blutung, Raserei, Blutsprung),
  jeweils mit eigener Angriffsart, Passivfähigkeit, Fähigkeit und eigenen Upgrades
- **4 Akte** (Verliese, Krypta, Drachenhort, Himmelsturm), jeder mit einer Karte voller Abzweigungen:
  Kampf, Elite, Händler, Lagerfeuer, Schatz, Ereignis und am Ende ein Boss mit Wutphase
  (Steingolem, Lichkönig, Drache Ignaroth)
- **Arenen mit Hindernissen:** Säulen als Deckung, Sprengfässer, Stachelfallen und Lava
- **Über 20 Gegnertypen** (u. a. Schildträger, Heiler, Grabwurm, Mimic, Giftpilz, Stachelkugel, Goblin-Schamane mit Kriegstotem,
  Schattenhunde im Rudel, Gespenst, Wasserspeier) plus Elite-Varianten
- **35 Upgrades** in drei Seltenheitsstufen, davon 12 heldenspezifische, dazu **5 Synergien**,
  die beim Kombinieren bestimmter Upgrades aktiv werden. Die Upgrade-Karten zeigen die genaue Werteänderung.
- **8 Ereignisse** mit Entscheidungen zwischen Risiko und Belohnung
- **Endlosmodus** nach dem Sieg im vierten Akt
- **Neues Spiel+:** nach dem Sieg mit allen Upgrades schwerer weitermachen (NG+1, NG+2 …) oder neue Läufe
  auf einer freigeschalteten NG+-Stufe starten; Gegner deutlich stärker, Seelen und Punkte +50 % je Stufe
- **3 Spielstände** mit Namen, jeweils mit eigenem Fortschritt; Einstellungen gelten für alle
- **Tägliche Herausforderung:** jeden Tag dieselbe Karte für alle, mit Held und Modifikator des Tages
- **Meta-Fortschritt:** Seelen bleiben erhalten und gehen in die Schmiede (6 dauerhafte Upgrades) oder in neue Helden
- **Ruhmeshalle** mit den 10 besten Läufen; laufende Abenteuer werden auf der Karte automatisch gespeichert
- Atmosphärische Arenen: dynamisches Licht und Schatten, Fackeln und Feuerbecken, Nebel, Funken,
  Kleintiere (Ratten, Spinnen, Feuersalamander) und je Akt eigene Bodendetails
- **Tribünen mit Zuschauern** (Menschen und Goblins, Skelette und Geister, Teufelchen und Kultisten),
  die auf deine Kämpfe reagieren, jubeln und dir Gold oder Heilung zuwerfen
- **Wetter** je Raum: Regen, Gewitter mit Blitzeinschlägen, Nebel, Schnee, Ascheregen und Feuersturm
- **Musik:** komponiertes Titelthema, Kartenmusik und Kampfthema je Akt, Bossthema mit Pauken und Chor,
  Fanfaren bei Sieg und Niederlage, live per Web Audio gespielt; Lautstärke einstellbar
- **Build-Vielfalt:** 20 Synergien (Rezepte im Kodex, Fortschritt auf den Upgrade-Karten), regelverändernde Upgrades
  (z. B. Echo, Zweite Luft, Spiegelbild), Waffen-Entwicklungen nach jedem Boss, Verbannen, Belohnungsvorschau auf der Karte
- **Relikte** (12 einzigartige Gegenstände), **Champions** in Elite-Räumen, **Themenwellen**, **Raum-Herausforderungen**,
  **Begleiter** (Rabe, Katze, Irrlicht, Wolfswelpe), **Chronik** mit Hintergrundgeschichten und Helden-Dialogen,
  Laufzusammenfassung mit Schaden je Quelle, Fähigkeiten per Wischgeste zielen
- **Verdammnis-Stufen 1–10** je Held, **11 Herausforderungen**, **Kopfgelder**, **Tages- und Wochenprüfung** mit Serie,
  Kalender und Teilen-Funktion, ein **Arenameister**, der deine Läufe kommentiert, Meisterschaft im Bestiarium
- **Spielgefühl:** perfektes Ausweichen, Eingabepuffer, Zielmarkierung, Warnblitz vor Einschlägen, Musik, die mit dem Kampf anschwillt
- **Am PC spielbar:** W A S D bewegen, Linksklick oder Q für die Fähigkeit (zielt auf den Mauszeiger), Leertaste oder Rechtsklick zum Ausweichen,
  Esc Pause, F Vollbild, Zifferntasten wählen Belohnungen und Wege; Controller (Xbox/PlayStation) werden automatisch erkannt;
  auf großen Querformat-Bildschirmen zeigt die Kamera fast die ganze Arena
- **Barrierefreiheit:** Hilfemodus, Tempo 0,8×, Bildschirmwackeln in Stufen, Blitze dämpfen, große Schrift und Knöpfe,
  Farbenblind-Modus, Linkshänder-Modus, Akkusparmodus mit 30 Bildern pro Sekunde
- Läufe überstehen das Schließen der App: der laufende Raum startet beim Fortsetzen neu
- Detailliert gezeichnete Helden (mit Gesicht, Rüstung, Umhang, Rückansicht) und Gegner mit Umriss und Schattierung,
  Porträts im Heldenmenü und im Bestiarium
- Soundeffekte, Hit-Stop, Zeitlupe bei Tod und Boss-Sieg
- **Effekte:** Trefferblitze, eigene Todeseffekte je Gegnerart (Knochen, Schleim, Glut, Federn, Steinsplitter),
  Blut-, Brand- und Rissspuren, die bis zum Raumende auf dem Boden bleiben, Beschwörungsportale, Nachbilder beim Ausweichen
- **Boss-Inszenierung:** Kamerafahrt mit Kinobalken beim Auftritt, Todessequenz mit Lichtrissen und großer Detonation
- Einstellungen für Sound, Musik, Atmosphäre und Licht, Bildschirmwackeln und Vibration

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seitengerüst, HUD und Einbindung der Skripte |
| `css/style.css` | Gestaltung von Menüs und HUD |
| `js/data.js` | Akte, Helden, Gegner, Bosse, Upgrades, Tagesmodifikatoren |
| `js/core.js` | Speicherstand, Hilfsfunktionen, Soundeffekte und Musik |
| `js/world.js` | Arena-Boden, Tribünen und Zuschauer, Wetter, Licht und Ambiente |
| `js/input.js` | Touch- und Tastatursteuerung, Spielzustand |
| `js/ui.js` | Karte, Erfolge, Menüs, Händler, Ereignisse, Upgrades, Kodex |
| `js/meta.js` | Verdammnis-Stufen, Herausforderungen, Kopfgelder, Tages- und Wochenprüfung, Arenameister |
| `js/combat.js` | Kampf: Räume, Gegner-KI, Bosse, Geschosse, Schaden |
| `js/sprites.js` | Detaillierte Gegner-Sprites mit Umriss und Schattierung, Porträts |
| `js/fx.js` | Kampfeffekte: Bodenspuren, Trümmer, Trefferblitze, Boss-Auftritt und Boss-Tod |
| `js/render.js` | Zeichnen aller Spielobjekte und Spielschleife |
| `sw.js` | Service Worker für den Offline-Modus |
| `tools/build_single.py` | baut alles zu einer einzelnen HTML-Datei in `dist/` |
| `tools/balance.js` | Balance-Simulation mit dem Test-Bot (`npm run balance`) |

Die Skripte teilen sich einen gemeinsamen Gültigkeitsbereich und müssen in der Reihenfolge aus `index.html` geladen werden.

## Tests

```
npm install --no-save playwright@1.47.2 && npx playwright install chromium
npm test
```

`tests/run-all.js` startet das Spiel in einem Headless-Chromium und prüft per simuliertem Spiel:
Laufstart, einen ganzen Akt mit jedem Helden, alle Upgrades und Synergien, jede Ereignis-Option,
jede Gegnerart, alle sieben Bosse, Relikte, Champions, Raum-Herausforderungen, Begleiter, Zielen per Wischgeste, den vierten Akt, die Tagesherausforderung, Spielstände/Sicherungscode/Neues Spiel+ und die Musik.
Der GitHub-Workflow `.github/workflows/test.yml` führt die Tests bei jedem Push aus.

