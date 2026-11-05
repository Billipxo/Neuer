# Arena der Verdammten – Hinweise für Claude

Fantasy-Roguelike-Arenaspiel für das Handy. Reines HTML/CSS/JavaScript ohne Frameworks und ohne Build-Schritt,
Grafik komplett per Canvas gezeichnet, Sound und Musik per Web Audio erzeugt. Alle Texte im Spiel sind **Deutsch**.

## Befehle

- `npm test` – 22 Headless-Tests (inkl. `perks`, der jede Perk-Mechanik gezielt auslöst, `render`, der wirklich zeichnet, `pc` mit Maus, Tastatur und Controller-Attrappe im Querformat, `backup` für Spielstand-Link und -Datei, `sounds` für alle Klänge) (`tests/run-all.js`), einzeln: `node tests/run-all.js bosses saves`, Details mit `VERBOSE=1`.
- `npm run balance` (`node tools/balance.js [Läufe] [Held …]`) – der Bot spielt komplette Läufe ohne Gottmodus: Siegquote, Todesursachen, Hänger je Held.
- `node tools/chaos.js [Läufe] [Sekunden]` – Chaos-Bot: komplette Läufe mit Zeichnen, zufälligen Menüknöpfen, Pausen und Einstellungen; meldet jeden Laufzeitfehler mit Stelle. Nach größeren Änderungen laufen lassen.
  Playwright ist in der Cloud-Umgebung vorinstalliert, in CI per Workflow.
- `python3 tools/build_single.py` – eine einzelne HTML-Datei in `dist/` (`--fragment` ohne `<html>/<head>`-Gerüst).
- `node tools/make_icons.js` – erzeugt die App-Icons (`icons/*.png`) aus `icon.svg` neu.
- Feste Adresse: GitHub Pages (`.github/workflows/pages.yml`, bei Push auf `main`) → https://billipxo.github.io/Neuer/ – mit Icons, Offline-Cache (`sw.js`) und der Einzeldatei zum Herunterladen. Als App installierbar (`manifest.webmanifest`, Knopf über `beforeinstallprompt`).
- Vor jedem Commit `npm test` laufen lassen.

## Dateien (klassische Skripte, gemeinsamer globaler Gültigkeitsbereich, Ladereihenfolge wie in `index.html`)

| Datei | Inhalt |
|---|---|
| `js/data.js` | `ACTS` (4 Akte, `ACT_N`), `CHARS`, `ENEMIES`, `BOSSES`, `BOSS_LINES`/`BOSS_AGAIN`, `BEAST`, `AFFIXES`, `UPGRADES`/`UPG`, `SYN`, `EVOS`, `RELICS`/`REL`, `THEMES`, `CHAMP_NAMES`, `ROOM_CHAL`, `PETS`, `LORE`, `HERO_LINES`, `META`, `NODE`, `DAILY_MODS`/`EXTRA_MODS`/`runMod()`, `TIERS`, `CHALLENGES`, `weeklyInfo` |
| `js/core.js` | Speicherstand (Slots, `migrate`, `persist`), Heldenstufen, Grafikstufe `FX()`, RNG (`rand`, `pick`, `seeded`), Audio-Start (`audio`), Musik (`SONGS2`, `MEL`, `playStep`) |
| `js/sound.js` | Soundeffekte: Klangkatalog `SDEF` (Baukasten `sndKit`: Rauschen, Filter, Glocken-Teiltöne, Stimmformanten, Verzerrung), Backen im Hintergrund (`sndBake`, OfflineAudioContext, mehrere Varianten), Abspielen `sfx(name,{x,y,vol,rate,delay})` mit Stereo, Hall je Akt (`sndAct`), Stimmenbegrenzung; Zuordnungen `DIE_SND`, `ESHOT_SND` |
| `js/world.js` | Canvas/`resize`, Boden (`buildFloor`, `DECOR`), Tribünen und Zuschauer, Wetter, Ambiente, Licht (`renderLights`) |
| `js/input.js` | Steuerung: Touch-Joystick, Maus und Tastatur, Controller (`pollPad`), Menüs per Tasten (`menuKey`, `navMove`), Vollbild; Spielzustand, `newPlayer`, `startRun`, `nextAct`, `roomKey` |
| `js/ui.js` | Alle Menüs (`render(html, actions)`), Karte (`genMap`, `showMap`, Belohnungsvorschau `rw`), Erfolge (`ACH`, `checkAch`), Skins, Einstellungen, Kodex, Spielstände/Sicherungscode, Händler, Lagerfeuer, Ereignisse, Belohnungen (`showReward`, Verbannen, `showEvo`), Fortsetzen (`resumeRun`) |
| `js/meta.js` | Langzeitmotivation: Verdammnis-Stufen (`tierWon`, `showTiers`), Herausforderungen (`showChallenges`), Kopfgelder (`bountyList`, `checkBounties`), Tages-/Wochenprüfung mit Serie und Teilen (`showDaily`, `dailyRecord`, `shareText`), Arenameister (`arenaMasterLine`), Meisterschaft im Bestiarium (`masteryMul`) |
| `js/combat.js` | Raum-Aufbau (`startCombat`, `genArena`, `buildWaves`), `update`, Gegner-KI (`updEnemy`), Bosse (`updBoss`), Schaden (`dealDamage`, `hurtPlayer`, `killEnemy`), Raumende, `endRun` |
| `js/sprites.js` | Vorgerenderte Gegner-Sprites (`SPR_BODY`, `getSprite`, `blitSprite`), Porträts für Menüs (`fillPortraits`, `<canvas data-port="hero:id">`) |
| `js/fx.js` | Kampfeffekte: Bodenspuren (`decal`, direkt ins Bodenbild gemalt), Trümmer (`debris`, `G.debris`), Todeseffekte je Gegnerart (`DEATH_FX`, `BOSS_DEATH`, `deathFx`), Trefferstern (`impactFx`), Lichtblitze (`flashLight`), Hiebe (`drawSlash`), Portale (`drawSpawn`), Kamera (`CAM`, `VIEW_S`), Boss-Auftritt (`G.cine`) und Boss-Tod (`G.bossDie`) |
| `js/render.js` | `draw`, `drawHero`, `drawEnemy`, `drawBoss`, Geschosse/Effekte, HUD, Spielschleife `loop` |

## Wichtige Konzepte

- **Globale Zustände:** `save` (aktiver Spielstand), `run` (laufendes Abenteuer, wird in `save.run` gespeichert), `G` (aktueller Kampfraum, `null` außerhalb), `P` (Held im Kampf = `run.p`), `state` (`menu`/`ui`/`combat`/`paused`).
- **Menüs:** `render(html, {aktion:fn})`; Knöpfe tragen `data-a="aktion" data-v="wert"`.
- **Zufall:** immer `rand`/`pick`/`wpick` (nutzen `RNG`). Karten, Wellen, Arenen, Belohnungen und Wetter laufen über `seeded(roomKey(...))`, damit die Tagesherausforderung deterministisch bleibt.
- **Speicherstand:** Neue Felder in `defSave()`/`defStats()`/`defSettings()` ergänzen, `migrate()` füllt alte Stände auf. Ändert sich die Struktur von `run`/`run.p` inkompatibel, `RUN_V` erhöhen (alte Läufe werden verworfen). Einstellungen sind global für alle 3 Slots.
- **Grafikstufe:** Teure Effekte nur bei `FX()` (Licht, Partikel, Kleintiere, Zuschauerdichte, Helden-Umriss per `shadowBlur`). Zuschauer werden in Gruppen vorgerendert (`buildCrowdChunks`). Bildrate wählbar (`settings.fpsCap`).
- **Spieltempo:** `loop` ruft `update(gdt/n)` in Teilschritten ≤ 0,034 s auf; `update` immer mit kleinen Schritten testen.
- **Gegner hinzufügen:** Eintrag in `ENEMIES` (+ `BEAST`), KI-Fall in `updEnemy`, Zeichnung als Sprite in `SPR_BODY`/`SPR_KIND` (`js/sprites.js`) oder live in `drawEnemy`, Farbe in `enemyColor`, Todeseffekt in `DEATH_FX`, Todesklang in `DIE_SND`, fliegend → `FLY`.
- **Bosse:** `BOSSES` + `ACTS[i].bosses` + `BOSS_LINES`/`BOSS_AGAIN` + `BEAST`, Logik in `updBoss`, Zeichnung in `drawBoss`, Tonhöhe in `ROAR`.
  Bosse nehmen von Fähigkeiten nur 60 % Schaden, sind beim Wechsel in die Wutphase kurz immun (`shieldT`) und stoßen den Helden aus ihrem Körper.
  Auftritt: `bossIntro()` (Kamera, Kinobalken, Boss und Held warten, Tippen kürzt ab); Tod: `bossDeathStart` → `updBossDie` → `bossBlast` → `clearRoom`. Neue Bosse brauchen einen Eintrag in `BOSS_DEATH`.
- **Effekte:** Neue Gegner bekommen einen Eintrag in `DEATH_FX` (Trümmerart, Fleckfarbe, Brandfleck/Riss). Rein optische Zufälle mit `Math.random`/`mr`, nicht mit `RNG`.
- **Sounds:** Neuer Klang = Eintrag in `SDEF` (`dur`, `n` Varianten, `vol`, `gap`, `rev`, `f:(K,v,R)=>…` mit dem Baukasten), aufrufen mit `sfx(name,{x,y})` (Position → Stereo).
  Neue Gegner: Todesklang in `DIE_SND`, Geschossart in `ESHOT_SND`; neue Helden: `skill_<id>`; neue Bosse: Tonhöhe in `ROAR` (ergibt `roar_<id>`). Pegel prüfen mit dem Test `sounds`.
- **Sonderregeln:** `run.mod` (Tagesprüfung) oder `run.mods` (Wochenprüfung, Herausforderungen) – `runMod()` führt mehrere Regeln zusammen (Zahlen multiplizieren, `start` verketten, `mapSwap` tauscht Kartenknoten).
- **Verdammnis-Stufen:** `run.tier` 0–10, Abfrage mit `tierHas(n)`; Freischaltung je Held in `save.tierWon` (bei Sieg in `showVictory`).
- **Build-System:** Synergien in `SYN` (Rezept `req`, heldenspezifisch über `UPG[...].only`), Waffen-Entwicklungen in `EVOS` (nach jedem Boss, Abfrage `hasEvo(id)`), regelverändernde Upgrades setzen Felder auf `run.p`.
  Perks wirken über diese Felder an festen Stellen: Schaden in `dealDamage` (Multiplikatoren, `o.forceCrit`, Brand `o.burn` → `e.burnT`), Treffer am Helden in `hurtPlayer` (Konter, Unaufhaltsam),
  Ausweichen in `dashPerks`, Kills in `killEnemy`, Heldenpassiven in `heroPassives` (Schlingen `G.snares`/`updSnares`, Göttliches Urteil). Heilung pro Treffer immer über `sipHeal` (höchstens 4 LP/s).
  `rollUpgrades` gewichtet Helden-Perks mit 1,8. Neuer Perk → Prüfung im Test `perks` ergänzen. Zeitgeber pro Raum gehören auf `G` oder werden in `startCombat` zurückgesetzt.
- **Relikte:** `run.relics`, Abfrage `hasRelic(id)`, Vergabe `gainRelic(id)` (Schatz `showTreasure`, Champion `showRelicPick`, Händler).
- **Champions und Themen:** `buildWaves` markiert in Elite-Räumen den letzten Elitegegner als `champ` (→ `champify`), Themenwellen hängen als `waves.theme` an.
- **Raum-Herausforderungen:** `G.rc` (`ROOM_CHAL`), Fehlschlag in `hurtPlayer`/`useDash`/`useSkill`, Belohnung in `rcReward` beim Raumende.
- **Schadensstatistik:** `dealDamage(..., {src:'…'})` zählt in `run.dmgBy`; neue Schadensquellen bekommen ein `src` und einen Eintrag in `DMG_SRC`.
- **Begleiter:** `run.pet` (nicht in Tages-/Wochenprüfung), Logik `updPet`, Zeichnung `drawPet`.
- **Zielen:** Fähigkeiten in `AIM_SKILLS` bekommen bei Wischgeste, Mausklick (`mouseAim`) oder rechtem Stick `useSkill(aim)` mit `{a,k}`; Weiten in `AIM_RANGE`; Vorschau in `draw`.
- **Eingabearten:** `INPUT_MODE` ist `touch`, `pc` oder `pad` und folgt der zuletzt benutzten Eingabe (`setInputMode`); `body.pc`/`body.pad` blenden Tastenhinweise ein.
  PC: WASD/Pfeile, Linksklick/Q Fähigkeit auf den Mauszeiger, Leertaste/Umschalt/Rechtsklick Ausweichen, Esc Pause, F Vollbild. Menüs: Pfeile/Enter, Ziffern wählen Karten (`NAV_GROUPS`), Esc zurück.
  Controller (Standardbelegung): linker Stick, A ausweichen, X Fähigkeit, rechter Stick zielt, Start Pause; Menüs mit Stick, A, B. Querformat ab 560 px Höhe zeigt mehr Arena (`resize`).
- **Akt hinzufügen:** `ACTS`-Eintrag, Deko (`decorTower` als Vorbild), `WEATHER_POOL`, `crowdLook`, Kleintier in `spawnCritter`, Musik `calmN`/`fightN`, `LORE`.
- **Fortsetzen:** `run.room` (laufender Kampfraum) und `run.pend` (offene Belohnung) werden beim Verlassen gespeichert (`saveNow`) und von `resumeRun` wiederhergestellt.
- **Spielstand sichern und übertragen:** `showBackup` – Link (`exportLink`, gepackt mit `CompressionStream`, `#spielstand=Z.…` an `gameUrl()`/`PUBLIC_URL`), Datei (`downloadBackup`, enthält den Code), Code (`exportCode`).
  Laden über `parseAny` (Code, Link oder Dateiinhalt) → `showImportTarget` (Platz wählen); Links beim Start über `checkLinkImport`. `markBackup` merkt sich `bkAt`/`bkRuns`; `backupDue()` blendet die Erinnerung im Menü ein.

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
