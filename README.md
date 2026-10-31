# Reichsfeuer (Arbeitstitel)

Fantasy-Strategiespiel im Browser – eine Mischung aus **Autobattler** und **Warcraft-3-artigem Basisbau**.
Baue eine Festung im Stil von Clash of Clans, lass deine Truppen automatisch kämpfen und führe einen Helden
(automatisch oder manuell) gegen Computergegner.

## Starten

Keine Installation nötig: `index.html` im Browser öffnen (Chrome, Edge, Firefox oder Safari).
Auch am **Handy und Tablet** spielbar (Touch-Steuerung: Wischen = Karte bewegen, zwei Finger = Zoom,
Tippen = auswählen/bauen, Held antippen und dann Ziel antippen = Held steuern, ☰ = Menü).
Alternativ lokal ausliefern, z. B. mit `python3 -m http.server` und dann `http://localhost:8000` öffnen.

## Was schon drin ist (Prototyp v1.4)

**Spielmodi & Fortschritt**
- **Freies Spiel:** 1 gegen 1, 2 gegen 2 (mit KI-Verbündetem), Jeder gegen jeden (4) – KI einfach/mittel/schwer,
  Gegner-Völker werden jede Runde ausgelost. Spieldauer 20/30/45 Minuten oder unbegrenzt, Nebel des Krieges oder offene Karte,
  Schreine & Ereignisse an oder aus.
- **Spielstände:** 💾 im Spiel speichert auf drei Plätze und lädt jeden Stand (das Spiel pausiert dabei). Zusätzlich
  sichert das Spiel automatisch jede Spielminute, beim Beenden und beim Wechsel in eine andere App; „Weiterspielen“ im
  Hauptmenü setzt die letzte Partie fort, der Tab „Spielstände“ zeigt alle Plätze. Gespeichert wird der komplette
  Zustand (Armeen, Gebäude, Held, Talente, Kampagnen-Mission, erkundete Karte, Kamera), etwa 50–200 KB je Stand im Browser.
  **Übertragen zwischen Geräten:** Im Tab „Spielstände“ lässt sich jeder Stand als Datei (⬇) oder als gepackter Text-Code (📋,
  rund 25 KB) exportieren und auf einem anderen Gerät importieren – z. B. am Handy weiterspielen, was am PC begann.
- **6 Volkskampagnen** mit eigener Geschichte (je 5 Missionen: vernichten, überleben, Drachen erschlagen,
  Bündnis-Schlacht, Finale auf „Schwer“), z. B. „Die Krone von Valenmark“ (Menschen) oder „Blut und Steppe“ (Orks).
- **Einführung** im ersten Spiel (abschaltbar) und **Anleitung** im Hauptmenü.
- **Volks-XP & Belohnungen:** Jede Partie gibt deinem Volk Erfahrung. Pro Volksstufe gibt es Skins (Veteran, Elite,
  Legendär), Banner (Schwalbenwimpel, Kriegsstandarte), Titel (Rekrut bis Legende) und ab Stufe 3 einen vierten Helden.
  Fortschritt wird im Browser gespeichert. Jede Partie zählt nur einmal: Wird ein Spielstand erneut zu Ende gespielt,
  gibt es höchstens die Verbesserung als Erfahrung.

**Völker**
- 6 Völker + Zufall mit Passiv, **3 Volksfähigkeiten** (freigeschaltet über Haupthaus-Stufe 1/3/5), eigener **Heimatkarte**,
  **eigenen Gebäudenamen** (z. B. Orks: Großhalle, Kriegslager) und **eigener Bauweise** (Elfen-Blätterkronen, Ork-Fellzelte mit Hörnern,
  Zwergen-Steindächer mit Esse, gotische Untoten-Türme, Dämonen-Obsidianspitzen).
- **Spielstile:** Jedes Volk spielt sich etwas anders – mit eigenen Boni, eigener Bauliste und eigener KI-Taktik:
  - Menschen – *Heerscharen* (Truppen): alle Gebäude bilden 20% schneller aus, Bauernhäuser +25% Versorgung
  - Orks – *Ansturm* (Rush): Kriegslager bildet 20% schneller aus, Krieger daraus 10% billiger, alle +5% Tempo; KI greift früh an
  - Zwerge – *Bollwerk* (Verteidigung): Wach- und Kanonentürme 30% billiger, je Haupthaus-Stufe einer mehr; KI greift spät an
  - Untote – *Endlose Horden* (Masse): gefallene Feinde erheben sich mit 20% Chance als Skelett
  - Elfen – *Schattenkrieg* (Beweglichkeit): alle +10% Tempo, Fernkämpfer und Flieger +15% Schaden, außerhalb des Kampfes dreifache Heilung
  - Dämonen – *Höllenbrut* (Beschwörung): Beschwörungen halten 50% länger, Beschwörer rufen einen Diener mehr, Magier +10%

  Die Armee-Vorlage ★ im Armee-Tab entspricht dem Stil des Volkes.
- **Spezialeinheit je Volk** mit eigener Fähigkeit: Ritter (Sturmangriff nach Anlauf), Sternenschützin (trifft bis zu drei Ziele,
  riesige Reichweite), Fleischkoloss (Seuchenwolke), Berserker (Blutrausch), Dampfpanzer (doppelter Schaden an Gebäuden),
  Schattenpirscher (springt hinter die feindlichen Linien).
- **Flieger je Volk** aus dem neuen Gebäude **Horst** (ab Haupthaus-Stufe 3): Greifenreiter, Hippogreifreiterin, Gargyl,
  Wyvernreiter, Gyrokopter (Flak gegen Flieger), Feuerschwinge. Flieger überfliegen Mauern und Gelände und werfen einen Schatten;
  Nahkämpfer erreichen sie nicht – nur Schützen, Magier, Türme, Helden und andere Flieger. Sichtet die KI Flieger,
  bildet sie mehr Fernkämpfer aus.
- **🤖 Autopilot:** Ein Schalter oben rechts (oder „9. Steuerung“ beim Start) lässt den Computer für dich spielen –
  genauso gut wie die KI: Bau, Ausbildung nach Volksstil, Monsterjagd vor dem ersten Angriff, Schreine, Angriffe, Held
  (inkl. Talente, Meisterung und Ultimate) und Volksfähigkeiten. Eingreifen ist jederzeit möglich. Auch ohne Autopilot greift
  die eigene Armee wie die KI erst ab etwa Minute 6 an (im Armee-Tab einstellbar) und jagt bis dahin Monster.
- **Werte-Anzeige:** Ein Klick bzw. Tipp auf eine Einheit, einen gegnerischen Helden oder ein Monster zeigt rechts oben ein
  kleines Kärtchen mit Lebenspunkten, Schaden, Schaden pro Sekunde, Rüstung, Reichweite, Tempo, Angriffstakt, Erfahrung,
  Eigenschaften (fliegt, trifft Flieger, Spezialfähigkeit) und aktiven Boni.
- **Talentbaum** (Krieg, Bollwerk, Wohlstand – je 4 Stufen), 1 Punkt pro Heldenstufe, automatisch oder von Hand.
- 9 Einheitenrollen je Volk (inkl. Flieger und Spezialeinheit), 3 Helden je Volk (+1 freischaltbar) mit Commander-Boni und
  2 Fähigkeiten, Helden bis Stufe 10.
- **Helden-Ultimates:** Auf Heldenstufe 6 wählt man eine von zwei ultimativen Fähigkeiten (Taste R) – je Held eigene, z. B.
  Meteorschauer, Verwandlung (der Held wächst und leuchtet), Schlachtruf für die ganze Armee, große Heilung, Lebensraub im
  Umkreis oder ein beschworener Titan. Auf Stufe 3 und 8 wird eine Fähigkeit gemeistert (+35% Wirkung, −15% Abklingzeit),
  auf Stufe 10 die ultimative. Auf Wunsch wählt der Autopilot („Talente und Heldenwahl automatisch“).
- **Balance:** Völker und Helden wurden mit über 600 simulierten KI-gegen-KI-Partien abgestimmt. Helden ohne gezielten
  Flächenzauber (Einzelziel-, Nahkampf- und Heilhelden) wurden deutlich gestärkt, gezielte Flächenzauber etwas gesenkt;
  Nahkampfhelden sind zäher und geben der ganzen Armee Boni, Zwergen-Bombardements sind abgeschwächt.

**Basis & Wirtschaft**
- 13 Gebäudetypen bis Stufe 5, Maximalstufe in knapp 30 Minuten. Jede Stufe ist sichtbar: Fenster (2), Seitenturm (3),
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
- **Einfache Produktion:** Armee-Vorlagen (Volksstil ★, Ausgewogen, Schildwall, Sturmangriff, Fernkampf, Arkane Macht, Luftflotte),
  Rekrutieren per Einheitenkarte ohne Gebäudeauswahl, Übersicht der laufenden Ausbildung; Regler unter „Feineinstellung“.
- Neutrale Monster mit Beute und Extra-Belohnungen, Händler, Endphase mit Punktewertung.
- **Schreine:** 2–4 eroberbare Schreine je Karte (Krieg +10% Schaden, Leben +3 LP/s, Wohlstand +4 Gold/s, Eile +10% Tempo).
  Wer 8 Sekunden allein am Schrein steht, erobert ihn; der Bonus gilt für das ganze Team. Bereite Truppen und die KI nehmen
  Schreine auf ihrer Kartenhälfte ein (abschaltbar im Armee-Tab).
- **Ereignisse:** Ein wandernder Boss (Ogerkönig, Uralter Koloss oder Lindwurm) zieht ab etwa Minute 9 über die Karte und
  greift an, was ihm begegnet – wer ihn erschlägt, erhält Gold, Holz, einen seltenen Gegenstand und das Siegesbanner.
  Händlerkarawanen (Wagen mit Wachen) fahren alle paar Minuten von Händler zu Händler; wer den Wagen plündert, macht Beute.
- **Nebel des Krieges:** Du siehst nur, was deine Einheiten, dein Held, deine Gebäude und Verbündete sehen (Held und
  Haupthaus weiter, Fernkämpfer weiter als Nahkämpfer). Erkundetes Gebiet bleibt abgedunkelt sichtbar, gegnerische Gebäude
  erscheinen dort so, wie du sie zuletzt gesehen hast; Gegner im Nebel sind weder zu sehen, zu hören noch anwählbar.
  Auch die Minikarte zeigt nur Erkundetes. Die Computergegner spielen fair: Sie kennen nur, was ihr Team gesehen hat
  (Gebäude, zuletzt gesehene Armeestärke), und schicken dafür regelmäßig Späher los. Bei Spielende wird die Karte aufgedeckt.

**Oberfläche**
- **Volks-Designs:** Die Oberfläche passt sich dem gespielten Volk an – Farben, Überschrift-Schrift und Wappen
  (Menschen: Königsblau & Gold, Elfen: Waldgrün & Silber, Untote: Violett & Grabesgrün mit Frakturschrift,
  Orks: Leder & Blutrot, Zwerge: Eisen & Bronze, Dämonen: Obsidian & Lava).
- **Hauptmenü** mit gezeichneten Figuren-Szenen für jedes Volk und jeden Helden; Farben wechseln mit dem gewählten Volk.
- Rohstoffleiste mit Symbolen, Fähigkeiten mit sichtbarer Abklingzeit, Seitenleiste mit Wappen und Titel.

**Atmosphäre**
- **Lebendige Karten:** Jede Partie erzeugt eine neue Landschaft mit Geländemerkmalen, die zur Karte passen:
  - Grüne Auen: Teiche mit Seerosen, Schilf, Enten und springenden Fischen, Blumenwiesen mit Schmetterlingen,
    bemooste Felsgruppen, alte Steinkreise mit leuchtenden Runen
  - Silberwald: leuchtende Mondseen, uralte Riesenbäume mit Runen und Lichtfrüchten, Kristallgruppen, Feenringe aus Leuchtpilzen
  - Verfluchte Sümpfe: blubbernde Moortümpel mit Irrlichtern und Nebelschwaden, versunkene Ruinen, Knochenfelder
  - Rote Steppe: geschichtete Tafelberge, Felsnadeln mit Deckstein, Wasserlöcher, Bestiengerippe, umherziehende Staubteufel
  - Frostgipfel: gefrorene Seen mit Rissen und wanderndem Lichtreflex, Eisspitzen, verschneite Felsen, Schneewehen
  - Aschenlande: brodelnde Lavaseen mit treibenden Krusten und Funkenflug, rauchende Vulkanschlote, glühende Spalten, Obsidianspitzen

  Seen, Lava, Felsen, Bäume und Ruinen sind **Hindernisse**: Truppen laufen außen herum (Wege, Basen, Lager, Händler und
  Goldadern bleiben immer erreichbar). Bäume stehen in Hainen mit Unterholz, dazu Büsche, Blumen, Gräser, Farne, Pilze,
  Schilf und Akazien, die sich im Wind wiegen. Lava, Kristalle und Mondseen werfen Licht auf die Umgebung.
  Leise **Umgebungsgeräusche**: Blubbern, Platschen, Vogelrufe, Froschquaken, zischende Schlote. Die Werte stehen in
  `G.LANDSCAPE` und `G.FEATURES` (`js/data.js`).
- **Musik** je Heimatkarte (live erzeugt, wird bei Kämpfen intensiver) und **Kampfgeräusche** (Klingen, Bögen, Magie,
  Explosionen, Todesschreie) – ohne Audiodateien, mit der Web-Audio-API synthetisiert.
- **Gezeichnete Figuren** je Volk und Rolle (Rüstung, Helme, Kapuzen, Bärte, Hauer, Hörner, Totenschädel, Waffen, Schilde in Spielerfarbe), Tiere und Monster mit eigener Gestalt.
- **Animationen:** Laufen, Atmen im Stand, Ausfallschritte, Waffenschwünge, Rückstoß bei Treffern, umfallende Gefallene,
  hämmernde Baumeister. Bewegungen werden zwischen den Rechenschritten weich überblendet (flüssig bei 60 Bildern/s).
- **Effekte:** Pfeile und Kanonenkugeln im Bogenflug mit Schatten und Spur, Klingenhiebe, Trefferfunken, Explosionen mit
  Druckwelle/Feuer/Rauch, einstürzende Gebäude mit Trümmern, Kamerawackeln, Lichtsäulen (Stufenaufstieg, Beschwörung),
  Heilkreuze, Runenkreise, brennende beschädigte Gebäude, Wetter je Karte (Schnee, Blätter, Pollen, Nebel, Staub, Asche)
  und Wolkenschatten. Aufwendige Effekte lassen sich in den Einstellungen abschalten.
- **Blut** (abschaltbar): Spritzer, Lachen, Leichen; Trümmer zerstörter Gebäude.
- **Tiere passend zur Karte** (Hasen, Rehe, Krähen, Kröten, Geier, Füchse, Glühwürmchen, Fledermäuse …), die vor Truppen fliehen.

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| WASD / Pfeiltasten / Mausrand / Ziehen | Kamera bewegen |
| Mausrad | Zoom |
| Linksklick | Auswählen (Einheiten zeigen ihre Werte rechts oben), Gebäude platzieren, Fähigkeitsziel |
| Rechtsklick | Held bewegen/angreifen, Abbrechen |
| Held auswählen + Linksklick | Held bewegen/angreifen (schaltet auf manuell) |
| H | Held manuell / automatisch |
| Q / E | Heldenfähigkeit 1 / 2 auf Mausposition |
| R | Ultimative Heldenfähigkeit (ab Heldenstufe 6) |
| 1 / 2 / 3 | Volksfähigkeiten |
| + / − | Zoom |
| Leertaste | Kamera auf Held |
| P | Pause |
| 💾 (oben rechts) | Spiel speichern / laden |
| Esc | Abbrechen / Auswahl aufheben / Speicherfenster schließen |

## Projektstruktur

```
index.html        Einstieg
css/style.css     Oberfläche
js/data.js        Spieldaten: Völker, Einheiten, Helden, Gebäude, Gegenstände, Monster, Karten
js/game.js        Engine: Wirtschaft, Basisbau, Produktion, Kampf, Helden, KI, Nebel des Krieges, Spielstand-Format
js/audio.js       Musik und Geräusche (Web-Audio-Synthese)
js/profile.js     Profil, Volks-XP, Skins, Kampagne
js/save.js        Spielstände (drei Plätze + automatisch) im Browser
js/render.js      Canvas-Darstellung (Comic-Stil), Heimatkarten, Minikarte
js/landschaft.js  Landschaft: Pflanzen, Geländemerkmale, belebte Luftschicht
js/ui.js          Menü, HUD, Seitenleiste, Eingabe
js/main.js        Spielschleife
```

Balancing-Werte stehen gesammelt in `js/data.js` und lassen sich dort leicht anpassen.

## Hinweis zu Unity

Alle Spielinhalte (Völker, Einheiten, Gebäude, Talente, Kampagne) stehen als reine Daten in `js/data.js` und
`js/profile.js`. Bei einem späteren Umstieg auf Unity lassen sie sich fast 1:1 als JSON/ScriptableObjects übernehmen.
