# TREI-Trainer

Lern-App für den **TREI-Sachkundenachweis** (Lehrgang der HWK zu Köln, 11.01.–03.02.2027;
schriftliche Prüfung am 30.01.2027). Sie funktioniert wie eine Führerschein-Lern-App:
Fragen nach Themen üben, Fehler wiederholen, Prüfung simulieren – ohne Internet, ohne
Konto, ohne Server-Backend und ohne Tracking.

Es gibt drei Varianten mit denselben Fragen und Funktionen:

- **Android-App** (`TREI-Trainer.apk`) – zum Installieren aufs Handy, läuft komplett offline.
- **Datei für den PC** (`TREI-Trainer.html`) – per Doppelklick im Browser öffnen, läuft offline.
- **Optional als Web-App** auf eigenem Webspace (z. B. All-Inkl, passwortgeschützt).

> **Wichtig zu den Fragen:** Die App bringt 261 Startfragen mit – 161 Grundfragen in eigenen
> Worten und 100 Fragen aus der Datei „TREI-Leitfaden-Fragen“ (IDs `lf-…`). Alle sind
> **als „ungeprüft“ markiert**. Gleiche sie mit den Kursunterlagen ab, bevor du dich
> auf sie verlässt. Werte, die sich mit neuen Ausgaben von TAB, VDE-Regeln oder Gesetzen
> ändern können, tragen den Hinweis **„Stand prüfen“**. Maßgeblich sind immer die
> Kursunterlagen und die aktuellen Normen, TAB und Gesetze.

## Inhalt

1. [Was die App kann](#was-die-app-kann)
2. [Ohne Internet nutzen: Android-App und Datei für den PC](#ohne-internet-nutzen-android-app-und-datei-für-den-pc)
3. [Schnellstart am PC (Entwicklung)](#schnellstart-am-pc-entwicklung)
4. [Befehle](#befehle)
5. [Projektaufbau](#projektaufbau)
6. [Fragen hinzufügen und pflegen](#fragen-hinzufügen-und-pflegen)
7. [Lernstand sichern und umziehen](#lernstand-sichern-und-umziehen)
8. [Optional: auf eigenem Webspace (All-Inkl)](#optional-auf-eigenem-webspace-all-inkl)
9. [Datenschutz und Speicherung](#datenschutz-und-speicherung)
10. [Fehlerbehebung](#fehlerbehebung)
11. [Technik](#technik)

## Was die App kann

**Lernen nach Themen** – jedes Thema hat eine eigene Fragen-Datei:

| | Thema | Datei |
|---|---|---|
| a | Recht (EnWG, NAV, Installateurverzeichnis) | `recht.json` |
| b | TAB & VDE-AR-N 4100 | `tab.json` |
| c | Hausanschluss & Erdung | `hausanschluss.json` |
| d | Zählerplatz & Messung | `zaehlerplatz.json` |
| e | Netzsysteme & Schutz | `schutz.json` |
| f | Erzeugung & Speicher | `erzeugung.json` |
| g | Wallbox, Wärmepumpe & § 14a | `verbraucher14a.json` |
| h | Prüfung & Inbetriebnahme | `pruefung.json` |
| i | Arbeitssicherheit | `sicherheit.json` |
| j | Rechenaufgaben | `rechnen.json` |

- **Themenbereiche mit Erklärung:** Jedes Thema ist in Themenbereiche aufgeteilt
  (zusammen 40), z. B. „NAV“, „Fundamenterder (DIN 18014)“ oder „RCD-Prüfung und
  Schleifenimpedanz“. Jeder Bereich hat eine Erklärung zum Nachlesen (Worum geht es?,
  Das Wichtigste, Merke) und ein eigenes Training. Alle Erklärungen auf einen Blick:
  *Lernen → Erklärungen* oder *Mehr → Erklärungen*.
- **Formelsammlung:** alle Formeln für die Rechenaufgaben, ohne Rechenbeispiele – unter
  *Lernen → Formelsammlung* bzw. *Mehr → Formelsammlung*. Bei Aufgaben, die eine Formel
  brauchen (Lernrunde, Prüfungssimulation, Frage-Details), öffnet der Knopf „📐 Formeln“
  die passenden Formeln, ohne die Runde zu verlassen.
- **Fragetypen:** Einfachauswahl, Mehrfachauswahl (zählt nur, wenn alles stimmt),
  Rechenaufgaben mit Toleranz und Rechenweg, Karteikarten für das Fachgespräch
  (aufdecken, selbst bewerten: gewusst / teilweise / nicht gewusst), optional mit Bild.
- **Nach jeder Antwort:** richtig oder falsch, die Lösung und eine kurze Erklärung mit
  Regel bzw. Norm.
- **Wiederholen:** Jede Frage hat einen Status – neu, falsch (rot), 1× richtig (gelb),
  gelernt (grün, nach zweimal richtig in Folge). Ein Leitner-System holt Fragen nach 1, 2,
  4 und 7 Tagen wieder hervor. Dazu „Fehler wiederholen“, Markieren und Volltextsuche.
- **Prüfungssimulation:** gemischte Fragen mit Zeitlimit, Auswertung je Thema und
  Verlauf aller Simulationen. Anzahl, Zeit und Bestehensgrenze sind einstellbar
  (Standard: 30 Fragen, 60 Minuten, 70 %).
- **Rückmeldung mit Ton und kleinen Effekten:** Bei einer richtigen Antwort springt die
  Meldung kurz auf, ein paar Funken fliegen, dazu ein heller Ton (jede fünfte richtige Antwort
  in Folge etwas festlicher); bei einer falschen wackelt sie, dazu ein tiefer Ton. Die Töne
  erzeugt die App selbst (keine Audiodateien, offline). Abschalten unter *Mehr → Einstellungen
  → Töne bei Antworten*; die Bewegungen entfallen, wenn am Gerät „Bewegung reduzieren“ an ist.
  In der Prüfungssimulation bleibt es still.
- **Motivation:** XP (mehr für schwere Fragen und Serien), Level von „Azubi“ bis
  „Eingetragen ins Installateurverzeichnis“, Tagesziel, Lernserie, Abzeichen je Thema,
  Prüfungsreife, Statistik und ein Countdown bis zur Prüfung mit empfohlenem Tagespensum.
- **Fragen pflegen:** in der App anlegen, bearbeiten, löschen, als „geprüft“ markieren,
  Notizen und „Fehler melden“; Import und Export als JSON.
- **Offline nutzbar** als Android-App, als Datei für den PC oder als installierbare Web-App;
  Dark Mode, große Knöpfe.

Das Prüfungsdatum (für Countdown und Tagespensum) lässt sich unter
*Mehr → Einstellungen* ändern.

## Ohne Internet nutzen: Android-App und Datei für den PC

Die App braucht keinen Webspace. Beide Offline-Varianten enthalten alle Fragen und
Funktionen; der Lernstand bleibt auf dem jeweiligen Gerät. Handy und PC haben getrennte
Lernstände – übertragen lässt er sich mit einer [Sicherung](#lernstand-sichern-und-umziehen).

### Datei für den PC (Windows, Mac, Linux)

```bash
npm run build:offline
```

Ergebnis: `dist-offline/index.html` – eine einzige Datei (ca. 600 KB), in der alles steckt:
Programm, Fragen und Bilder. Umbenennen in z. B. `TREI-Trainer.html`, an einen festen Platz
legen (etwa *Dokumente*) und per Doppelklick öffnen.

- Am besten mit **Chrome, Edge oder Firefox** öffnen und nicht im privaten Fenster – der
  Lernstand wird im Browser gespeichert. Datei am Platz lassen und immer mit demselben
  Browser öffnen.
- Die Datei lädt nichts aus dem Internet nach.
- Neue Version: die neue Datei an dieselbe Stelle legen (alte ersetzen). Der Lernstand bleibt.

### Android-App

Gebaut wird mit Werkzeugen aus den Ubuntu-/Debian-Paketen – ohne Android Studio und ohne
Downloads von Google:

```bash
sudo apt install default-jdk android-sdk-platform-23 aapt zipalign apksigner dalvik-exchange
android/baue-apk.sh
```

Ergebnis: `android/build/TREI-Trainer.apk` (ab Android 6). Das Skript baut zuerst die
Offline-Datei und packt sie in eine kleine Android-App (`android/src/…/MainActivity.java`),
die sie in einer WebView anzeigt. Die Seite wird dort unter der dafür reservierten Adresse
`https://appassets.androidplatform.net/` direkt aus der App beantwortet – es geht nichts ins
Internet.

**Installieren:** APK aufs Handy bringen (Kabel, Mail an dich selbst, Cloud), antippen,
für diese Quelle „Unbekannte Apps installieren“ erlauben und „Installieren“ wählen. Meldet
Google Play Protect eine unbekannte App, „Trotzdem installieren“.

**In der App:** Sicherungen und Exporte werden über „Speichern unter“ abgelegt (z. B. in
*Downloads* oder Google Drive), Wiederherstellen und Import laufen über die Dateiauswahl.
Die Zurück-Taste geht eine Seite zurück; Schriftgröße und dunkles Design des Handys werden
übernommen.

**Signatur und Updates:** Android installiert eine neue Version nur dann über die alte,
wenn beide mit demselben Schlüssel signiert sind.

- Schlüssel einmal anlegen und gut aufheben – er gehört nie ins Repository (`*.jks` steht
  in der `.gitignore`):
  ```bash
  keytool -genkeypair -keystore trei-trainer.jks -alias trei -keyalg RSA -keysize 3072 \
    -validity 10000 -dname "CN=TREI-Trainer"
  TREI_KEYSTORE=trei-trainer.jks TREI_KEYSTORE_PASS='…' android/baue-apk.sh
  ```
- Ohne Schlüssel erzeugt das Skript einen Einmal-Schlüssel. Eine so gebaute neue Version
  installierst du so: in der App *Sicherung herunterladen* → alte App deinstallieren → neue
  installieren → *Lernstand wiederherstellen*.

**Automatischer Test:** Der GitHub-Workflow `.github/workflows/android-test.yml` baut die App
bei jeder Änderung und testet sie in einem Android-Emulator (`android/test/emulator-test.mjs`):
Start, Frage beantworten, Bildfrage, Zurück-Taste, Lernstand nach Neustart, dunkles Design,
Sicherung speichern und über die Dateiauswahl wiederherstellen. Protokoll und
Bildschirmfotos liegen als Artefakt „android-test“ am jeweiligen Lauf.

## Schnellstart am PC (Entwicklung)

Voraussetzung: [Node.js](https://nodejs.org/) ab Version 20.19 bzw. 22.12 (am besten die aktuelle LTS-Version).

```bash
npm install
npm run dev
```

Dann <http://localhost:5173> im Browser öffnen.

Auf dem Handy im selben WLAN ansehen: `npm run dev -- --host` und die angezeigte
Netzwerk-Adresse öffnen. Offline-Modus und Installation funktionieren dabei nicht – die
brauchen HTTPS (oder `localhost`).

## Befehle

| Befehl | Was er macht |
|---|---|
| `npm run dev` | Entwicklungsserver, lädt bei Änderungen automatisch neu |
| `npm test` | alle automatischen Tests (Vitest) |
| `npm run pruefe` | Fragen-Dateien prüfen (Schema, doppelte IDs, fehlende Lösung, leere Erklärung …) |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run build` | prüft Fragen und Typen und baut die Web-App nach `dist/` |
| `npm run build:offline` | baut die Datei für den PC: `dist-offline/index.html` |
| `android/baue-apk.sh` | baut die Android-App: `android/build/TREI-Trainer.apk` |
| `npm run preview` | gebaute Web-App lokal ansehen (<http://localhost:4173>, mit Offline-Modus) |

## Projektaufbau

```
.github/workflows/ Android-App im Emulator testen
android/           Android-App: Manifest, MainActivity (WebView), Symbole, Build-Skript, Test
deploy/            Vorlage für den Passwortschutz auf dem Webspace (.htaccess)
public/            Icons und Bilder (Bilder zu Fragen in public/bilder/)
scripts/           Prüfskript für die Fragen-Dateien, Bilder einbetten (Offline-Datei)
src/data/fragen/   die Fragen – eine JSON-Datei je Thema
src/data/bereiche/ die Themenbereiche mit ihren Erklärungen – eine JSON-Datei je Thema
src/data/formeln.json die Formelsammlung
src/logic/         Lernlogik (Bewertung, Leitner, XP/Level, Abzeichen, Simulation …) mit Tests
src/db/            Speicherung im Browser (IndexedDB)
src/pages/         Seiten der App
src/components/    Bausteine der Oberfläche
```

## Fragen hinzufügen und pflegen

Es gibt zwei Wege. Beide lassen sich kombinieren.

### Weg A: in der App (z. B. direkt im Kurs)

- **Neue Frage:** *Mehr → Neue Frage.* Eigene Fragen bekommen IDs wie `recht-e001`.
- **Bestehende Frage:** *Mehr → Fragenkatalog* → Frage antippen. Dort gibt es
  „✎ Bearbeiten“, „🗑 Frage löschen“, den Schalter „Geprüft“, eine Notiz und
  „Fehler melden“.
- Diese Änderungen liegen **nur auf diesem Gerät**. Sichere sie regelmäßig (siehe
  [Lernstand sichern](#lernstand-sichern-und-umziehen)) oder übernimm sie ins Projekt
  (siehe unten).

### Weg B: im Projekt (gilt nach dem nächsten Bauen für alle Geräte)

1. Datei `src/data/fragen/<thema>.json` öffnen – sie enthält eine Liste (`[ … ]`) von Fragen.
2. Neue Frage nach dem Schema unten anhängen, mit einer **neuen, eindeutigen ID**.
3. `npm run pruefe` ausführen – es muss „Alles in Ordnung ✔“ erscheinen.
4. Neu bauen: Android-App mit `android/baue-apk.sh`, PC-Datei mit `npm run build:offline`
   (bzw. die Web-App, siehe [Webspace](#optional-auf-eigenem-webspace-all-inkl)). Neue Fragen
   erscheinen nach dem Installieren bzw. Öffnen der neuen Version automatisch.

### Schema einer Frage

| Feld | Inhalt |
|---|---|
| `id` | eindeutig über alle Dateien; nur `a–z`, `0–9`, `-` und `_`. Üblich: `<thema>-001` für Auswahl- und Rechenfragen, `<thema>-k01` für Karteikarten, `<thema>-e001` für in der App angelegte Fragen, `lf-<thema>-001` für Fragen aus dem TREI-Leitfaden |
| `thema` | Themen-ID, muss zum Dateinamen passen (z. B. `schutz` in `schutz.json`) |
| `typ` | `einfach`, `mehrfach`, `rechnen` oder `karte` |
| `frage` | Fragetext |
| `antworten` | Antworttexte (bei `einfach`/`mehrfach` mindestens zwei, keine doppelten); bei `rechnen` und `karte` eine leere Liste `[]` |
| `richtig` | die Lösung – Aufbau je nach Typ, siehe unten |
| `erklaerung` | kurze Erklärung mit Regel bzw. Norm. Kann sich ein Wert ändern, „Stand prüfen“ dazuschreiben – die App hebt das hervor |
| `quelle` | z. B. `"DIN VDE 0100-600, Tabelle 6.1"` |
| `schwierigkeit` | `1` (leicht), `2` oder `3` (schwer) – schwere Fragen geben mehr XP |
| `bild` | `null` oder ein Pfad wie `"bilder/netzsystem-a.svg"` (Datei liegt in `public/bilder/`) |
| `geprueft` | `true` oder `false` – mit den Kursunterlagen abgeglichen? |
| `stand` | Stand der Information, z. B. `"2026-10"` |
| `unterthema` | ordnet die Frage einem Themenbereich zu (siehe [Themenbereiche](#themenbereiche-und-erklärungen)); wird auch bei der Suche berücksichtigt |

So sieht `richtig` je nach Typ aus:

| Typ | `richtig` | Beispiel |
|---|---|---|
| `einfach` | Liste mit der Nummer der richtigen Antwort – gezählt ab **0** | `[2]` = dritte Antwort |
| `mehrfach` | Liste aller richtigen Antworten | `[0, 2, 3]` |
| `rechnen` | Ergebnis mit Einheit und Toleranz | `{ "wert": 15.88, "einheit": "A", "toleranz": 0.2, "toleranzArt": "abs" }` |
| `karte` | Musterantwort als Text, Zeilenumbruch mit `\n` | `"1. Freischalten\n2. …"` |

Bei Rechenaufgaben bedeutet `"toleranzArt": "abs"` eine feste Abweichung in der Einheit
(± 0,2 A), `"rel"` eine Abweichung in Prozent vom richtigen Wert (`"toleranz": 2` = ± 2 %).
Der Rechenweg gehört in die `erklaerung`. Eingaben wie `15,9`, `15.9` oder `15,9 A` werden
in der App alle verstanden.

Vollständiges Beispiel (Einfachauswahl):

```json
{
  "id": "pruefung-013",
  "thema": "pruefung",
  "typ": "einfach",
  "frage": "Mit welcher Messspannung wird der Isolationswiderstand eines 230/400-V-Stromkreises gemessen?",
  "antworten": ["250 V DC", "500 V DC", "1000 V DC", "500 V AC"],
  "richtig": [1],
  "erklaerung": "Für Stromkreise bis 500 V Nennspannung (außer SELV/PELV) wird mit 500 V DC gemessen; der Isolationswiderstand muss mindestens 1 MΩ betragen.",
  "quelle": "DIN VDE 0100-600",
  "schwierigkeit": 1,
  "bild": null,
  "geprueft": false,
  "stand": "2026-10"
}
```

Tipps:

- Die Reihenfolge der Antworten wird in der App gemischt (abschaltbar in den
  Einstellungen). Trotzdem die richtige Antwort nicht immer an dieselbe Stelle setzen
  und nicht immer zur längsten machen.
- Keine Normtexte abschreiben – in eigenen Worten formulieren.

### Themenbereiche und Erklärungen

Die Themenbereiche stehen in `src/data/bereiche/<thema>.json` – je Thema eine Liste:

```json
{
  "id": "recht-nav",
  "thema": "recht",
  "titel": "NAV: Kundenanlage, Material und Mitteilungen",
  "kurz": "§§ 13, 14, 16, 19 und 22 NAV – Anlage, Inbetriebsetzung, Eigenanlagen, Zählerplatz",
  "unterthemen": ["NAV"],
  "erklaerung": [
    { "titel": "Worum geht es?", "text": "Die NAV regelt …" },
    { "titel": "Das Wichtigste", "punkte": ["§ 13 Abs. 1: …", "§ 14: …"] },
    { "titel": "Merke", "text": "Mitteilen heißt: Bescheid geben. …" }
  ],
  "quelle": "NAV §§ 13, 14, 16, 19, 22",
  "stand": "2026-10"
}
```

- Zu einem Bereich gehören alle Fragen seines Themas, deren `unterthema` in `unterthemen`
  steht. Die Reihenfolge in der Datei ist die Reihenfolge in der App.
- `erklaerung` besteht aus Abschnitten mit `titel` und `text` und/oder `punkte`
  (Stichpunkte). Ein Abschnitt, dessen Titel mit „Merke“ beginnt, wird gelb hervorgehoben.
- `npm run pruefe` meldet Fragen ohne Themenbereich, Unterthemen ohne Fragen und
  Unterthemen, die in zwei Bereichen stehen.
- In der App angelegte Fragen: beim Anlegen ein vorhandenes Unterthema aus der
  Vorschlagsliste wählen, dann erscheinen sie im passenden Bereich. Mit einem neuen
  Unterthema stehen sie nur unter „Ganzes Thema üben“.
- Die Erklärungen fassen die Fragen des Bereichs zusammen. Sie sind – wie die Fragen –
  noch nicht mit den Kursunterlagen abgeglichen.

### Formelsammlung

Die Formelsammlung steht in `src/data/formeln.json` – eine Liste von Gruppen:

```json
{
  "id": "spannungsfall",
  "titel": "Leitungswiderstand, Spannungsfall und Querschnitt",
  "kurz": "Widerstand einer Leitung, Spannungsfall, Mindestquerschnitt, Grenzwerte",
  "eintraege": [
    { "name": "Spannungsfall Drehstrom", "formeln": ["ΔU = √3 · l · I · cos φ / (κ · A)"] },
    { "name": "Spannungsfall in Prozent", "formeln": ["Δu = ΔU / U · 100 %"], "hinweis": "Drehstrom auf 400 V beziehen" }
  ],
  "groessen": [{ "zeichen": "l", "bedeutung": "einfache Leitungslänge in m" }],
  "bereiche": ["rechnen-spannungsfall"],
  "fragen": []
}
```

- Tiefgestellte Zeichen schreibt man mit Unterstrich: `I_a`, `Z_s,max`, `κ_Cu`. Formeln und ein
  einzeln stehendes `l` (Länge) erscheinen in Schrift mit Serifen, damit `l` und `I` (Strom)
  nicht verwechselt werden.
- Den Knopf „📐 Formeln“ bekommen alle Fragen der Themenbereiche in `bereiche` und
  zusätzlich die Fragen, deren ID in `fragen` steht. Reine Wissensfragen (z. B. „Welche
  Abschaltzeit gilt …?“) bekommen bewusst keinen Knopf, damit die Formel nicht die
  Antwort verrät.
- Keine Rechenbeispiele aufnehmen – so bleibt die Sammlung wie die, die in Teil A der
  Prüfung erlaubt ist. `npm run pruefe` prüft den Aufbau und ob es die genannten Bereiche
  und Fragen gibt.

### Bilder

- Bild (SVG, PNG oder JPG) nach `public/bilder/` legen und im Feld `bild` als
  `"bilder/dateiname.svg"` eintragen. Es wird automatisch für den Offline-Modus gespeichert.
- In der App kann man beim Bearbeiten auch ein Foto hochladen. Es wird verkleinert und
  steckt dann als Text (data-URL) direkt in der Frage. Für die Projektdateien ist der
  Weg über `public/bilder/` besser, weil die JSON-Dateien sonst groß werden.

### Was passiert mit Änderungen auf dem Handy, wenn eine neue Version kommt?

- Neue Fragen aus den Dateien kommen beim nächsten Start automatisch dazu.
- Mitgelieferte Fragen, die du in der App **nicht** angefasst hast, werden aktualisiert,
  wenn sich die Datei geändert hat.
- Fragen, die du in der App **bearbeitet, als geprüft markiert oder gelöscht** hast,
  bleiben so, wie du sie hast. Zurück zur mitgelieferten Fassung: Frage öffnen →
  „Originalfassung wiederherstellen“.
- Lernstand, Notizen, Markierungen und Fehlermeldungen hängen an der ID. **IDs deshalb nie
  ändern oder für eine andere Frage wiederverwenden.**

### Empfohlener Ablauf zum Prüfen der Fragen

1. *Mehr → Ungeprüfte Fragen* öffnen und Frage für Frage mit den Kursunterlagen vergleichen.
2. Stimmt die Frage: Schalter „Geprüft“ einschalten. Stimmt etwas nicht: „Fehler melden“
   (Notiz für später) oder direkt „✎ Bearbeiten“. Gemeldete Fragen findest du unter
   *Mehr → Gemeldete Fehler*.
3. Wer nur Geprüftes lernen will: *Mehr → Einstellungen → Nur geprüfte Fragen lernen.*
4. Korrekturen dauerhaft ins Projekt übernehmen: *Mehr → Daten & Sicherung → Fragen
   exportieren → „Thema: …“.* Die Datei heißt `<thema>.json` und ersetzt
   `src/data/fragen/<thema>.json`. Danach `npm run pruefe`, bauen und veröffentlichen.
   Achtung: Der Export enthält den Stand dieses Geräts – in der App gelöschte Fragen
   fehlen darin, eigene Fragen des Themas sind dabei.

## Lernstand sichern und umziehen

Alle Daten liegen nur auf dem Gerät – in der Android-App bzw. im Browser. Deshalb
regelmäßig sichern:

- *Mehr → Daten & Sicherung → Sicherung herunterladen* (Datei
  `trei-lernstand-JJJJ-MM-TT.json`). In der Android-App öffnet sich dabei „Speichern unter“,
  z. B. für *Downloads* oder Google Drive. In der Web-App gibt es außerdem „Teilen …“.
- Die Sicherung enthält Lernstand, XP, Abzeichen, Simulationen, Einstellungen, Notizen,
  Markierungen, Fehlermeldungen sowie eigene und bearbeitete Fragen.
- Auf einem neuen Gerät (oder vom Handy auf den PC und umgekehrt): *Lernstand
  wiederherstellen* → Datei wählen. Der Lernstand auf diesem Gerät wird dabei ersetzt.

## Optional: auf eigenem Webspace (All-Inkl)

Nur nötig, wenn du die App lieber über eine eigene Internetadresse aufrufen willst – für
die Offline-Nutzung reichen die [Android-App und die PC-Datei](#ohne-internet-nutzen-android-app-und-datei-für-den-pc).

Ziel: Die App liegt als statische Seite unter z. B. `https://deine-domain.de/trei/`, und
nur wer Benutzername und Passwort kennt, kommt hinein. PHP oder eine Datenbank werden
nicht gebraucht.

> Zugangsdaten (FTP, KAS, Benutzername/Passwort für den Ordner) gehören **nie** in das
> Projekt oder ins Git-Repository. Du trägst sie nur im KAS bzw. in der `.htpasswd` auf
> dem Server ein. `.htpasswd` steht deshalb in der `.gitignore`.

Die Menünamen im KAS (kas.all-inkl.com) können sich mit der Zeit ändern – sinngemäß
findest du die Punkte trotzdem.

### 1. App bauen

```bash
npm install
npm run build
```

Ergebnis ist der Ordner `dist/` (mit `index.html`, `sw.js`, `manifest.webmanifest`,
`assets/`, `icons/`, `bilder/` …). Auf den Server kommt **dessen Inhalt**, nicht der Ordner
`dist` selbst.

### 2. HTTPS einschalten

Ohne HTTPS funktionieren Offline-Modus und Installation nicht, und das Passwort würde
unverschlüsselt übertragen. Im KAS bei der Domain ein SSL-Zertifikat aktivieren
(Let's Encrypt ist kostenlos).

### 3. Ordner anlegen und Dateien hochladen

1. Mit einem FTP-Programm (z. B. FileZilla) verbinden – die Zugangsdaten stehen im KAS
   unter FTP. Am besten verschlüsselt („FTP über explizites TLS“ bzw. SFTP).
2. Im Verzeichnis der Domain einen Ordner anlegen, z. B. `trei`.
3. Den **Inhalt** von `dist/` in diesen Ordner hochladen.

### 4. Passwortschutz einrichten

**Weg 1 – mit dem KAS (ohne Zusatzprogramme):**

1. Im KAS unter *Tools → Verzeichnisschutz* einen Schutz für den Ordner `trei` anlegen und
   dort Benutzername und Passwort selbst festlegen. Das KAS legt `.htaccess` und
   `.htpasswd` an.
2. Die vom KAS angelegte `.htaccess` im Ordner `trei` per FTP öffnen und unten den Block
   `<If "%{HTTPS} != 'on'"> … </If>` sowie die Zeile mit `AddType` aus
   [`deploy/htaccess-vorlage.txt`](deploy/htaccess-vorlage.txt) anhängen. Damit wird
   `http://` ohne Passwortabfrage auf `https://` umgeleitet, und das App-Manifest hat den
   richtigen Dateityp. Änderst du den Verzeichnisschutz später im KAS, prüfe, ob die Zeilen
   noch da sind.

**Weg 2 – von Hand mit der Vorlage:**

1. `.htpasswd` auf deinem Rechner erzeugen. Unter macOS und Linux gibt es dafür das
   Programm `htpasswd` (Linux: Paket `apache2-utils`):
   ```bash
   htpasswd -c -B .htpasswd DEIN_BENUTZERNAME
   ```
   Es fragt das Passwort ab und speichert nur einen Hash davon.
2. `.htpasswd` hochladen – am besten in einen Ordner **außerhalb** des Domain-Verzeichnisses.
3. [`deploy/htaccess-vorlage.txt`](deploy/htaccess-vorlage.txt) in den Ordner `trei`
   hochladen, in `.htaccess` umbenennen und bei `AuthUserFile` den **absoluten** Pfad zur
   `.htpasswd` eintragen. Bei All-Inkl beginnt er mit `/www/htdocs/` und deiner
   Account-Kennung (deinem KAS-Login, meist `w0…`).

Die Vorlage wurde mit Apache 2.4 getestet: `http://` wird ohne Passwortabfrage auf
`https://` umgeleitet, über `https://` fragt der Browser nach Benutzername und Passwort,
und `.htaccess`/`.htpasswd` lassen sich nicht abrufen.

### 5. Prüfen

- `http://deine-domain.de/trei/` aufrufen → muss ohne Passwortabfrage auf `https://`
  wechseln.
- `https://deine-domain.de/trei/` → Passwortabfrage → die App erscheint.
- Falsches Passwort oder „Abbrechen“ → kein Zugriff.
- `https://deine-domain.de/trei/.htaccess` → muss gesperrt sein („Forbidden“).
- In der App kurz warten, bis „Die App funktioniert jetzt auch offline“ erscheint.

### 6. Web-App auf dem Handy installieren

1. `https://deine-domain.de/trei/` im Browser öffnen und anmelden.
2. Installieren:
   - **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
   - **iPhone/iPad (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“.
3. Die App startet danach vom Startbildschirm wie eine normale App – auch ohne Internet.

Auf dem iPhone kann Safari die Daten von Websites löschen, die länger nicht genutzt wurden.
Als Home-Bildschirm-App ist das praktisch kein Problem – trotzdem regelmäßig sichern.

### 7. Updates der Web-App einspielen

1. Am PC: `npm run build`.
2. Den Inhalt von `dist/` erneut in den Ordner `trei` hochladen und vorhandene Dateien
   überschreiben. `.htaccess` und `.htpasswd` bleiben, wie sie sind. Alte Dateien in
   `assets/` stören nicht.
3. Auf dem Handy erscheint „Neue Version verfügbar“ → „Aktualisieren“. Der Lernstand
   bleibt erhalten.

Hinter dem Passwortschutz gibt es eine Besonderheit: Der Browser vergisst die Anmeldung
z. B. nach einem Neustart. Die App läuft dann normal weiter, kann aber nicht selbst nach
Updates sehen. Dann: *Mehr → Einstellungen → Nach Updates suchen* → Benutzername und
Passwort eingeben → „Aktualisieren“. Unter „Version vom …“ siehst du, welche Version
gerade läuft.

**Domain oder Adresse nicht wechseln:** Die Daten gehören zur Adresse der App. Ziehst du
um, vorher eine Sicherung herunterladen und unter der neuen Adresse wiederherstellen.

## Datenschutz und Speicherung

- Kein Login, kein Server-Backend, kein Tracking, keine externen Dienste oder Schriften.
  Android-App und PC-Datei laden nichts aus dem Internet; ein Webspace liefert nur die
  App-Dateien aus.
- Lernstand, Einstellungen und eigene Fragen liegen ausschließlich auf dem Gerät
  (IndexedDB in der App bzw. im Browser). Es wird nichts hochgeladen.
- App deinstallieren oder Browserdaten löschen löscht auch den Lernstand – vorher sichern.
- In der Web-App lässt sich unter *Mehr → Daten & Sicherung → Speicher* „dauerhafter
  Speicher“ anfordern, damit der Browser die Daten nicht bei Platzmangel entfernt.

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| „500 Internal Server Error“ nach dem Hochladen der `.htaccess` | Pfad bei `AuthUserFile` prüfen (absoluter Pfad, Datei vorhanden). Notfalls Weg 1 über das KAS nehmen. |
| Browser meldet „zu viele Weiterleitungen“ | Den `<If …>`-Block (4 Zeilen) aus der `.htaccess` löschen und im KAS die Weiterleitung auf HTTPS für die Domain einschalten. |
| Kein „App installieren“, kein Offline-Modus | Wird die Seite über `https://` aufgerufen? Einmal vollständig online laden und kurz warten. |
| Update kommt nicht an | *Mehr → Einstellungen → Nach Updates suchen.* |
| Nach einem Update weiße Seite | App schließen und neu öffnen. Hilft das nicht: Lernstand sichern (falls möglich), Website-Daten im Browser löschen, neu öffnen und Sicherung wiederherstellen. |
| PC-Datei zeigt „Datenbank konnte nicht geöffnet werden“ | Mit Chrome, Edge oder Firefox öffnen, nicht im privaten Fenster. |
| Android: „App nicht installiert“ bei einer neuen Version | Sie wurde mit einem anderen Schlüssel signiert: *Sicherung herunterladen*, alte App deinstallieren, neue installieren, *Lernstand wiederherstellen*. |
| `npm run build` bricht mit Fehlern in Fragen ab | Die Meldungen von `npm run pruefe` nennen Datei, ID und Problem. |

## Technik

React 19, TypeScript, Vite 7, Tailwind CSS 4, vite-plugin-pwa (Workbox), IndexedDB
(über `idb`), Vitest; für die Offline-Datei vite-plugin-singlefile, für die Android-App eine
schlichte WebView-Activity in Java. Die Lernlogik in `src/logic/` ist von der Oberfläche getrennt und
mit Tests abgedeckt – unter anderem Punkte und Level, Leitner-System, Bewertung von
Mehrfachauswahl und Rechenaufgaben, Abzeichen, Prüfungsreife, Simulation sowie Import,
Export und Sicherung.
