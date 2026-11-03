# Ideenliste – Arena der Verdammten

## Stand 3. November 2026

Die ausführliche Recherche dazu steht in [`RECHERCHE-Spielqualitaet.md`](RECHERCHE-Spielqualitaet.md).

**Umgesetzt** (aus dieser Liste und aus der Rangliste der Recherche):
- Balance-Runde mit Bot-Simulation (`npm run balance`)
- Waffen-Entwicklungen nach jedem Boss
- Verdammnis-Stufen 1–10 je Held statt reiner NG+-Auswahl
- 20 Synergien mit Fortschrittsanzeige und Kodex
- regelverändernde Upgrades
- Verbannen
- Belohnungsvorschau auf der Karte
- Läutern am Lagerfeuer
- Herausforderungen, Kopfgelder, Tages-Serie mit Teilen-Funktion und Wochenprüfung
- Arenameister
- Meisterschaft im Bestiarium
- Zuschauer vorgerendert
- Bildratenbegrenzung und Akkusparmodus
- Barrierefreiheit: Hilfemodus, Wackeln in Stufen, Blitze dämpfen, große Schrift
- Eingabepuffer
- perfektes Ausweichen
- Zielmarkierung
- Warnblitz vor Einschlägen
- dynamische Musik
- Speichern beim Verlassen der App

**Noch offen** (beste Kandidaten):
- Relikte als eigene Gegenstände
- Themenwellen und Mini-Bosse in Elite-Räumen
- Raum-Herausforderungen
- Laufzusammenfassung mit Schaden je Upgrade
- Codex/Lore-Texte und Helden-Dialoge
- vierter Akt
- Begleiter-Tier
- Fähigkeit per Wischgeste zielen

---

Stand: 2. November 2026. Grundlage sind
- Simulationen mit dem Test-Bot: 56 komplette Läufe, 7 Helden mit je 8 Läufen,
- Leistungsmessungen beim Zeichnen,
- eine Durchsicht des Codes,
- Recherche zu Roguelite-Design, Spielgefühl und Handy-Browsern (Quellen unten).

Aufwand: **S** = klein (unter 1 Stunde), **M** = mittel, **L** = groß.

---

## Die 12 besten Ideen (nach Nutzen sortiert)

| # | Idee | Warum | Aufwand |
|---|---|---|---|
| 1 | **Balance-Runde für Helden und Bosse** | In der Simulation gewinnt die Alchemistin 7 von 8 Läufen, die Berserkerin 0 von 8. Lavawurm und Drache beenden die meisten Läufe in Akt 3. | M |
| 2 | **Relikte**: dauerhafte Gegenstände pro Lauf (Schatz, Elite, Boss), die Regeln ändern statt nur Werte | Mehr Abwechslung pro Lauf; Upgrades sind bisher fast nur Prozentwerte. Relikte sorgen für „diesmal spiele ich ganz anders“-Läufe. | M–L |
| 3 | **Fluch-Stufen statt nur NG+** (wie Hitze-Stufen): einzeln wählbare Erschwernisse mit Punkten, Belohnung je nach Summe | Spieler wählen ihre Herausforderung selbst, z. B. „Gegner schneller“, „keine Heilung am Lagerfeuer“, „Bosse mit 3. Phase“. Langzeitmotivation nach dem ersten Sieg. | M |
| 4 | **Heldenspezifische Waffen-Varianten** (je Held 2–3 freischaltbare Waffen, z. B. Krieger mit Speer oder Doppelklingen) | Größter Hebel für „jeder Lauf spielt sich anders“, ohne neue Helden zeichnen zu müssen. | L |
| 5 | **Gegner-Wellen mit Thema** (z. B. „Rudelnacht“: nur Hunde und Schamanen; „Untotenwelle“) und **Mini-Bosse** in Elite-Räumen | Räume fühlen sich weniger zufällig an; Elite-Räume brauchen mehr Eigenständigkeit. | M |
| 6 | **Synergien ausbauen**: 5 → 15, auch zwischen heldenspezifischen Upgrades; Anzeige „fehlt noch 1 Teil“ auf Upgrade-Karten | Build-Planung wird sichtbar; Spieler jagen gezielt Kombinationen. | M |
| 7 | **Raum-Herausforderungen** (optional): „Ohne Treffer“, „In 30 Sek.“, „Nur mit Fähigkeit“ → Extra-Belohnung | Kurze Ziele für zwischendurch, gut fürs Handy. | S–M |
| 8 | **Zuschauer-Leinwand zwischenspeichern** (Leistung) | Zuschauer kosten beim Zeichnen am meisten (≈ 6–12 ms pro Bild, 847 Figuren); als vorgerendertes Bild mit wenigen bewegten Figuren deutlich schneller. Spart Akku. | M |
| 9 | **Bildrate begrenzen + Akkusparmodus** (30/45/60 Bilder pro Sekunde wählbar) | Schont den Akku am Handy; empfohlen in mehreren Leitfäden. | S |
| 10 | **Laufzusammenfassung**: Schadensstatistik je Upgrade, Todesursache, Zeit pro Akt, Teilen-Bild | Spieler lernen, warum sie verloren haben; Teilen bringt neue Spieler. | M |
| 11 | **Barrierefreiheit**: Option „weniger Bildschirmwackeln/Blitze“, größere Schrift, Gegner-Umriss in Signalfarbe | Leitfäden zu Spielgefühl empfehlen ausdrücklich eine Option gegen Wackeln/Blitze. | S |
| 12 | **Codex/Lore**: kurze Texte zu Akten, Bossen und Helden, die sich durch Siege freischalten, plus Helden-Dialoge mit Bossen | Gibt Siegen Bedeutung und erzeugt Bindung, ohne die Schwierigkeit zu ändern. | M |

---

## Befunde aus den Simulationen

Der Bot spielt sehr einfach: zufällige Wege und Upgrades, kein gezieltes Ausweichen. Die Zahlen zeigen also Tendenzen, keine exakten Werte.

| Held | Siege von 8 | Häufigste Todesursache |
|---|---|---|
| Alchemistin | 7 | – (sehr stark) |
| Paladin | 5 | in der ersten Simulation 3× hängengeblieben (inzwischen behoben, s. u.) |
| Jägerin | 4 | Lavawurm, Drache, frühe Kämpfe in Akt 3 |
| Krieger | 3 | Golem (Akt 1), Lavawurm, Drache |
| Nekromantin | 2 | normale Kämpfe in Akt 3 |
| Magierin | 1 | Golem/Spinne in Akt 1, Kämpfe in Akt 3 |
| Berserkerin | 0 | Drache (4×), Golem (2×) |

**Konkrete Vorschläge daraus:**
- **Alchemistin abschwächen:** Pfützen-Schaden −25 % oder Abklingzeit des Strudels 11 → 13 Sek. Ihre Flaschen fliegen über Säulen, daher ist sie sehr sicher.
- **Berserkerin stärken:** Gegen Bosse fehlt ihr Schaden aus der Distanz. Ideen:
  - Raserei gibt zusätzlich Schadensreduktion.
  - Blutsprung macht kurz unverwundbar.
  - Ein „Axtwurf“-Upgrade.
- **Magierin:** Ihre Geschosse treffen oft den Schild von Schildträgern. Ideen:
  - Geschosse umfliegen den Schild.
  - Ein Upgrade „Durchschlagende Zauber“.
- **Akt 3:** Die normalen Kämpfe sind ein großer Sprung. Ideen:
  - Gegnerleben in Akt 3 um 10 % senken.
  - Ein Lagerfeuer garantiert vor dem Boss.
- **Lavawurm und Drache:** Warnzeiten der Flächenangriffe etwas verlängern. Bei Wutphase einen Hinweis-Banner zeigen.

## Heute bereits behoben (gefunden durch die Simulation)

- **Paladin blieb hängen:** Der Hammer prallte an Säulen ab, obwohl freie Sicht bestand. Geschosse prüfen Säulen jetzt mit kleinerem Radius.
- **Endlose Kämpfe:** Zwei Heiler konnten einen Schildträger unbegrenzt hochheilen. Jeder Gegner kann jetzt höchstens alle 3 Sek. geheilt werden.
- **Bessere Zielwahl:** Der automatische Angriff bevorzugt jetzt Heiler, Schamanen und Totems. Schildträger, die einen von vorn ansehen, und Wasserspeier in Steinform werden gemieden.
- **Farbfehler bei Leuchteffekten:** Kurze Farbcodes wie `#fff` erzeugten Fehler.

Offen ist noch: Der Bot bleibt manchmal in Ecken stecken. Das liegt am Bot, nicht am Spiel. Für bessere Tests sollte der Bot klüger ausweichen und flankieren.

---

## Weitere Ideen nach Bereich

### Spielinhalt
- **Neue Raumtypen:**
  - **Arena-Wette:** Du setzt Gold auf „kein Treffer“.
  - **Schrein:** Opfere LP für ein Upgrade.
  - **Schmied im Lauf:** Ein Upgrade verbessern.
- **Vierter Akt** (z. B. „Der Himmelsturm“) als echtes Finale nach dem Drachen, mit eigener Musik, Gegnern und Endboss.
- **Begleiter-Tier** (Rabe, Katze, Irrlicht): sammelt Münzen ein, kleine passive Wirkung, als Erfolg freischaltbar.
- **Wöchentliche Herausforderung** mit festen Regeln und eigener Bestenliste (lokal).
- **Ereignisse erweitern** (aktuell 8): mehr Entscheidungen mit Folgen über mehrere Räume, z. B. ein Fluch, der später einen Boss schwächt.

### Spielgefühl
- **Trefferpause nach Schwere staffeln:** leichte Treffer kürzer, schwere länger. Leitfäden nennen 2 Bilder für leichte und 8–10 für schwere Treffer.
- **Kurze Stille vor Boss-Angriffen:** Musik kurz absenken, dann wirkt der Treffer wuchtiger.
- **Todesanimationen je Gegnerart:** Skelett zerfällt in Knochen, Schleim zerplatzt, Gespenst verpufft.
- **Fähigkeiten-Knopf:** Leuchten und Ton, wenn die Fähigkeit wieder bereit ist.

### Bedienung am Handy
- **Fähigkeit per Wischgeste** (zweiter Finger nach oben) als Alternative zum Knopf.
- **Joystick-Größe und Empfindlichkeit** einstellbar.
- **Tutorial je neuem Helden:** einmaliger kurzer Hinweis auf Passiv und Fähigkeit beim ersten Spiel.
- **Vibration:** funktioniert auf iPhones im Browser nicht (Safari unterstützt sie nicht). Option dort ausblenden oder als „nur Android“ kennzeichnen.

### Technik und Leistung
Gemessen ohne Grafikkarte, nur als Verhältnis aussagekräftig:
- Die Zuschauer sind der teuerste Teil, danach kommen die Gegner. Pro Bild gibt es etwa 180 Leuchteffekte.

Ideen:
- **Leuchteffekte zusammenfassen:** gleiche Farben in einem Durchgang zeichnen, kleine Effekte bei niedriger Stufe weglassen.
- **Spielschleife pausieren**, wenn die App im Hintergrund ist (prüfen, ob das schon überall greift).
- **Speicherstand-Sicherung:** automatische Sicherungskopie des letzten Stands, falls der Browser-Speicher geleert wird. Hinweis auf den Sicherungscode nach jedem Sieg.
- **Tests:** einen Balance-Test aufnehmen, der jede Nacht 50 Läufe simuliert und die Siegquote je Held ausgibt (Grundlage existiert schon).

### Langzeitmotivation
- **Meisterschaft je Held:** Stufen 1–10 schalten kosmetische Farben, Titel und am Ende eine alternative Fähigkeit frei.
- **Erfolge** (aktuell 24): je Held 3 eigene Erfolge, z. B. „Paladin: Werfe 50 Geschosse zurück“.
- **Schmiede-Ausbau:** Die 6 Verbesserungen sind schnell voll. Danach können Seelen in Freischaltungen fließen statt in Werte (neue Raumtypen, Relikte, Ereignisse). Das empfehlen auch die Design-Quellen: Freischaltungen, die Abwechslung bringen statt reine Stärke.

---

## Empfohlene Reihenfolge für morgen

1. Balance-Runde (Nr. 1) – schnell sichtbar und macht alle Helden spielenswert.
2. Akkusparmodus + Zuschauer-Zwischenspeicher (Nr. 8 und 9) – das Spiel läuft am Handy flüssiger und länger.
3. Relikte (Nr. 2) – der größte Schritt für Abwechslung.
4. Danach je nach Lust: Fluch-Stufen (Nr. 3) oder Waffen-Varianten (Nr. 4).

---

## Quellen

- [How to Design a Roguelike's Run Structure (bugnet)](https://bugnet.io/blog/how-to-design-a-roguelikes-run-structure)
- [What makes or breaks agency in roguelikes](https://thom.ee/blog/what-makes-or-breaks-agency-in-roguelikes/)
- [Best Roguelites Where Every Run Actually Plays Differently](https://choostgames.com/blog/best-roguelites-build-variety/)
- [Roguelite Games With The Best Progression Systems (Game Rant)](https://gamerant.com/roguelite-games-with-best-progression-systems/)
- [Dicey Dungeons (Wikipedia)](https://en.wikipedia.org/wiki/Dicey_Dungeons)
- [Diablo creator praises Vampire Survivors (GamesRadar)](https://www.gamesradar.com/diablo-creator-praises-viral-hit-vampire-survivors-says-he-wants-to-make-his-own-small-games/)
- [Games Like Archero (Mobile Game Report)](https://www.mobilegamereport.com/articles/archero-fans-guide)
- [Roguelike Elements in Mobile Games (GameRefinery)](https://www.gamerefinery.com/roguelike-elements-in-mobile-games-in-china/)
- [Hades Pact of Punishment (RPG Site)](https://rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)
- [Mega Cat Developer Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17)
- [Game Feel & Juice (Wayline)](https://www.wayline.io/learn/game-feel/1)
- [Designing better controls for the touchscreen experience (Game Developer)](https://www.gamedeveloper.com/game-platforms/designing-better-controls-for-the-touchscreen-experience)
- [Designing for mobile (Flowlab)](https://flowlab.io/lab/blog/designing-for-mobile)
- [Optimizing canvas (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Performance Tips for Mobile Games (Construct)](https://construct.net/en/tutorials/performance-tips-mobile-games-163)
- [PWA iOS Limitations and Safari Support (MagicBell)](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Fix: Vibrate API not available in iOS Safari (bugnet)](https://bugnet.io/blog/fix-web-game-vibrate-api-not-available-ios-safari)
