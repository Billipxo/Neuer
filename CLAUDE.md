# Arena der Verdammten – Hinweise für Claude

Fantasy-Roguelike-Arenaspiel für das Handy. Reines HTML/CSS/JavaScript ohne Frameworks und ohne Build-Schritt,
Grafik komplett per Canvas gezeichnet, Sound und Musik per Web Audio erzeugt. Alle Texte im Spiel sind **Deutsch**.

## Befehle

- `npm test` – 8 Headless-Tests (`tests/run-all.js`), einzeln: `node tests/run-all.js bosses saves`, Details mit `VERBOSE=1`.
  Playwright ist in der Cloud-Umgebung vorinstalliert, in CI per Workflow.
- `python3 tools/build_single.py` – eine einzelne HTML-Datei in `dist/` (`--fragment` ohne `<html>/<head>`-Gerüst).
- Vor jedem Commit `npm test` laufen lassen.

## Dateien (klassische Skripte, gemeinsamer globaler Gültigkeitsbereich, Ladereihenfolge wie in `index.html`)

| Datei | Inhalt |
|---|---|
| `js/data.js` | `ACTS`, `CHARS`, `ENEMIES`, `BOSSES`, `BOSS_LINES`, `BEAST`, `AFFIXES`, `UPGRADES`/`UPG`, `SYN`, `META`, `NODE`, `DAILY_MODS` |
| `js/core.js` | Speicherstand (Slots, `migrate`, `persist`), Heldenstufen, Grafikstufe `FX()`, RNG (`rand`, `pick`, `seeded`), Soundeffekte, Musik (`SONGS2`, `MEL`, `playStep`) |
| `js/world.js` | Canvas/`resize`, Boden (`buildFloor`, `DECOR`), Tribünen und Zuschauer, Wetter, Ambiente, Licht (`renderLights`) |
| `js/input.js` | Joystick/Tastatur, Spielzustand, `newPlayer`, `startRun`, `nextAct`, `roomKey` |
| `js/ui.js` | Alle Menüs (`render(html, actions)`), Karte (`genMap`, `showMap`), Erfolge (`ACH`, `checkAch`), Skins, Spielstände/Sicherungscode, Händler, Lagerfeuer, Ereignisse, Belohnungen |
| `js/combat.js` | Raum-Aufbau (`startCombat`, `genArena`, `buildWaves`), `update`, Gegner-KI (`updEnemy`), Bosse (`updBoss`), Schaden (`dealDamage`, `hurtPlayer`, `killEnemy`), Raumende, `endRun` |
| `js/render.js` | `draw`, `drawHero`, `drawEnemy`, `drawBoss`, Geschosse/Effekte, HUD, Spielschleife `loop` |

## Wichtige Konzepte

- **Globale Zustände:** `save` (aktiver Spielstand), `run` (laufendes Abenteuer, wird in `save.run` gespeichert), `G` (aktueller Kampfraum, `null` außerhalb), `P` (Held im Kampf = `run.p`), `state` (`menu`/`ui`/`combat`/`paused`).
- **Menüs:** `render(html, {aktion:fn})`; Knöpfe tragen `data-a="aktion" data-v="wert"`.
- **Zufall:** immer `rand`/`pick`/`wpick` (nutzen `RNG`). Karten, Wellen, Arenen, Belohnungen und Wetter laufen über `seeded(roomKey(...))`, damit die Tagesherausforderung deterministisch bleibt.
- **Speicherstand:** Neue Felder in `defSave()`/`defStats()`/`defSettings()` ergänzen, `migrate()` füllt alte Stände auf. Ändert sich die Struktur von `run`/`run.p` inkompatibel, `RUN_V` erhöhen (alte Läufe werden verworfen). Einstellungen sind global für alle 3 Slots.
- **Grafikstufe:** Teure Effekte nur bei `FX()` (Licht, Partikel, Kleintiere, Zuschauerdichte).
- **Spieltempo:** `loop` ruft `update(gdt/n)` in Teilschritten ≤ 0,034 s auf; `update` immer mit kleinen Schritten testen.
- **Gegner hinzufügen:** Eintrag in `ENEMIES` (+ `BEAST`), KI-Fall in `updEnemy`, Zeichnung in `drawEnemy`, Farbe in `enemyColor`, fliegend → `FLY`.
- **Bosse:** `BOSSES` + `ACTS[i].bosses` + `BOSS_LINES` + `BEAST`, Logik in `updBoss`, Zeichnung in `drawBoss`, Tonhöhe in `ROAR`.

## Tests schreiben

Tests laufen im Browser per `page.evaluate`: Lauf starten, `startCombat(...)`, dann `update(1/30)` in einer Schleife,
oft mit dem Bot `__bot(gottmodus, maxSekunden)` aus `tests/run-all.js`. Nichts zeichnen, das hält Tests schnell.

## Spielbare Vorschau (Claude-Artifact)

Nach Änderungen: `python3 tools/build_single.py --fragment` und `dist/arena-fragment.html` als bestehendes Artifact
neu veröffentlichen (Titel „Arena der Verdammten“, gleiche URL behalten). `sw.js`: bei Änderungen `CACHE`-Version erhöhen.

## Konventionen

- Commit-Nachrichten auf Deutsch: kurze Titelzeile, darunter Stichpunkte, was sich für Spielende ändert.
- Keine externen Bibliotheken; nur Google Fonts (mit Fallback).
- Neue Optionen in `showSettings()` aufnehmen; Texte kurz und verständlich, ohne Fachjargon.
