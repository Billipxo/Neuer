# Arena der Verdammten – Hinweise für Claude

Fantasy-Roguelike-Arenaspiel für das Handy. Reines HTML/CSS/JavaScript ohne Frameworks und ohne Build-Schritt,
Grafik komplett per Canvas gezeichnet, Sound und Musik per Web Audio erzeugt. Alle Texte im Spiel sind **Deutsch**.

## Befehle

- `npm test` – 18 Headless-Tests (inkl. `render`, der wirklich zeichnet) (`tests/run-all.js`), einzeln: `node tests/run-all.js bosses saves`, Details mit `VERBOSE=1`.
- `npm run balance` (`node tools/balance.js [Läufe] [Held …]`) – der Bot spielt komplette Läufe ohne Gottmodus: Siegquote, Todesursachen, Hänger je Held.
- `node tools/chaos.js [Läufe] [Sekunden]` – Chaos-Bot: komplette Läufe mit Zeichnen, zufälligen Menüknöpfen, Pausen und Einstellungen; meldet jeden Laufzeitfehler mit Stelle. Nach größeren Änderungen laufen lassen.
  Playwright ist in der Cloud-Umgebung vorinstalliert, in CI per Workflow.
- `python3 tools/build_single.py` – eine einzelne HTML-Datei in `dist/` (`--fragment` ohne `<html>/<head>`-Gerüst).
- Vor jedem Commit `npm test` laufen lassen.

## Dateien (klassische Skripte, gemeinsamer globaler Gültigkeitsbereich, Ladereihenfolge wie in `index.html`)

| Datei | Inhalt |
|---|---|
| `js/data.js` | `ACTS` (4 Akte, `ACT_N`), `CHARS`, `ENEMIES`, `BOSSES`, `BOSS_LINES`/`BOSS_AGAIN`, `BEAST`, `AFFIXES`, `UPGRADES`/`UPG`, `SYN`, `EVOS`, `RELICS`/`REL`, `THEMES`, `CHAMP_NAMES`, `ROOM_CHAL`, `PETS`, `LORE`, `HERO_LINES`, `META`, `NODE`, `DAILY_MODS`/`EXTRA_MODS`/`runMod()`, `TIERS`, `CHALLENGES`, `weeklyInfo` |
| `js/core.js` | Speicherstand (Slots, `migrate`, `persist`), Heldenstufen, Grafikstufe `FX()`, RNG (`rand`, `pick`, `seeded`), Soundeffekte, Musik (`SONGS2`, `MEL`, `playStep`) |
| `js/world.js` | Canvas/`resize`, Boden (`buildFloor`, `DECOR`), Tribünen und Zuschauer, Wetter, Ambiente, Licht (`renderLights`) |
| `js/input.js` | Joystick/Tastatur, Spielzustand, `newPlayer`, `startRun`, `nextAct`, `roomKey` |
| `js/ui.js` | Alle Menüs (`render(html, actions)`), Karte (`genMap`, `showMap`, Belohnungsvorschau `rw`), Erfolge (`ACH`, `checkAch`), Skins, Einstellungen, Kodex, Spielstände/Sicherungscode, Händler, Lagerfeuer, Ereignisse, Belohnungen (`showReward`, Verbannen, `showEvo`), Fortsetzen (`resumeRun`) |
| `js/meta.js` | Langzeitmotivation: Verdammnis-Stufen (`tierWon`, `showTiers`), Herausforderungen (`showChallenges`), Kopfgelder (`bountyList`, `checkBounties`), Tages-/Wochenprüfung mit Serie und Teilen (`showDaily`, `dailyRecord`, `shareText`), Arenameister (`arenaMasterLine`), Meisterschaft im Bestiarium (`masteryMul`) |
| `js/combat.js` | Raum-Aufbau (`startCombat`, `genArena`, `buildWaves`), `update`, Gegner-KI (`updEnemy`), Bosse (`updBoss`), Schaden (`dealDamage`, `hurtPlayer`, `killEnemy`), Raumende, `endRun` |
| `js/sprites.js` | Vorgerenderte Gegner-Sprites (`SPR_BODY`, `getSprite`, `blitSprite`), Porträts für Menüs (`fillPortraits`, `<canvas data-port="hero:id">`) |
| `js/render.js` | `draw`, `drawHero`, `drawEnemy`, `drawBoss`, Geschosse/Effekte, HUD, Spielschleife `loop` |

## Wichtige Konzepte

- **Globale Zustände:** `save` (aktiver Spielstand), `run` (laufendes Abenteuer, wird in `save.run` gespeichert), `G` (aktueller Kampfraum, `null` außerhalb), `P` (Held im Kampf = `run.p`), `state` (`menu`/`ui`/`combat`/`paused`).
- **Menüs:** `render(html, {aktion:fn})`; Knöpfe tragen `data-a="aktion" data-v="wert"`.
- **Zufall:** immer `rand`/`pick`/`wpick` (nutzen `RNG`). Karten, Wellen, Arenen, Belohnungen und Wetter laufen über `seeded(roomKey(...))`, damit die Tagesherausforderung deterministisch bleibt.
- **Speicherstand:** Neue Felder in `defSave()`/`defStats()`/`defSettings()` ergänzen, `migrate()` füllt alte Stände auf. Ändert sich die Struktur von `run`/`run.p` inkompatibel, `RUN_V` erhöhen (alte Läufe werden verworfen). Einstellungen sind global für alle 3 Slots.
- **Grafikstufe:** Teure Effekte nur bei `FX()` (Licht, Partikel, Kleintiere, Zuschauerdichte, Helden-Umriss per `shadowBlur`). Zuschauer werden in Gruppen vorgerendert (`buildCrowdChunks`). Bildrate wählbar (`settings.fpsCap`).
- **Spieltempo:** `loop` ruft `update(gdt/n)` in Teilschritten ≤ 0,034 s auf; `update` immer mit kleinen Schritten testen.
- **Gegner hinzufügen:** Eintrag in `ENEMIES` (+ `BEAST`), KI-Fall in `updEnemy`, Zeichnung als Sprite in `SPR_BODY`/`SPR_KIND` (`js/sprites.js`) oder live in `drawEnemy`, Farbe in `enemyColor`, fliegend → `FLY`.
- **Bosse:** `BOSSES` + `ACTS[i].bosses` + `BOSS_LINES`/`BOSS_AGAIN` + `BEAST`, Logik in `updBoss`, Zeichnung in `drawBoss`, Tonhöhe in `ROAR`.
- **Sonderregeln:** `run.mod` (Tagesprüfung) oder `run.mods` (Wochenprüfung, Herausforderungen) – `runMod()` führt mehrere Regeln zusammen (Zahlen multiplizieren, `start` verketten, `mapSwap` tauscht Kartenknoten).
- **Verdammnis-Stufen:** `run.tier` 0–10, Abfrage mit `tierHas(n)`; Freischaltung je Held in `save.tierWon` (bei Sieg in `showVictory`).
- **Build-System:** Synergien in `SYN` (Rezept `req`, heldenspezifisch über `UPG[...].only`), Waffen-Entwicklungen in `EVOS` (nach jedem Boss, Abfrage `hasEvo(id)`), regelverändernde Upgrades setzen Felder auf `run.p`.
- **Relikte:** `run.relics`, Abfrage `hasRelic(id)`, Vergabe `gainRelic(id)` (Schatz `showTreasure`, Champion `showRelicPick`, Händler).
- **Champions und Themen:** `buildWaves` markiert in Elite-Räumen den letzten Elitegegner als `champ` (→ `champify`), Themenwellen hängen als `waves.theme` an.
- **Raum-Herausforderungen:** `G.rc` (`ROOM_CHAL`), Fehlschlag in `hurtPlayer`/`useDash`/`useSkill`, Belohnung in `rcReward` beim Raumende.
- **Schadensstatistik:** `dealDamage(..., {src:'…'})` zählt in `run.dmgBy`; neue Schadensquellen bekommen ein `src` und einen Eintrag in `DMG_SRC`.
- **Begleiter:** `run.pet` (nicht in Tages-/Wochenprüfung), Logik `updPet`, Zeichnung `drawPet`.
- **Zielen:** Fähigkeiten in `AIM_SKILLS` bekommen bei Wischgeste `useSkill(aim)` mit `{a,k}`; Vorschau in `draw`.
- **Akt hinzufügen:** `ACTS`-Eintrag, Deko (`decorTower` als Vorbild), `WEATHER_POOL`, `crowdLook`, Kleintier in `spawnCritter`, Musik `calmN`/`fightN`, `LORE`.
- **Fortsetzen:** `run.room` (laufender Kampfraum) und `run.pend` (offene Belohnung) werden beim Verlassen gespeichert (`saveNow`) und von `resumeRun` wiederhergestellt.

## Tests schreiben

Tests laufen im Browser per `page.evaluate`: Lauf starten, `startCombat(...)`, dann `update(1/30)` in einer Schleife,
oft mit dem Bot `__bot(gottmodus, maxSekunden)` aus `tests/run-all.js`. Nichts zeichnen, das hält Tests schnell.

## Spielbare Vorschau (Claude-Artifact)

Nach Änderungen: `python3 tools/build_single.py --fragment` und `dist/arena-fragment.html` als bestehendes Artifact
neu veröffentlichen (Titel „Arena der Verdammten“, gleiche URL behalten). `sw.js`: bei Änderungen `CACHE`-Version erhöhen.

## Konventionen

- Commit-Nachrichten auf Deutsch: kurze Titelzeile, darunter Stichpunkte, was sich für Spielende ändert.
- Keine externen Bibliotheken; nur Google Fonts (mit Fallback).
- Neue Optionen in `showSettings()` aufnehmen (nach Bereichen: Ton, Spiel, Grafik und Akku, Steuerung, Barrierefreiheit); Texte kurz und verständlich, ohne Fachjargon.
- Neue Bildschirme im Test `menus` ergänzen, damit Laufzeitfehler auffallen.
