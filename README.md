# Teller – Kalorien & Wochenplan (PWA)

> **Einrichtung ohne Vorkenntnisse:** siehe [ANLEITUNG.md](ANLEITUNG.md) (ca. 20 Minuten).

Mobile Web-App auf Deutsch, mit der du deine tägliche Kalorienzufuhr im Blick behältst, dich ausgewogen ernährst
und Wochenpläne sowie Einkaufslisten erstellst. Die App wird über **„Zum Startbildschirm hinzufügen“** installiert und
läuft danach im Vollbild wie eine native App – ein App Store ist nicht nötig.

## Funktionen

| Bereich | Inhalt |
|---|---|
| **Konto & Onboarding** | Login per Magic Link oder 6-stelligem Code aus derselben E-Mail (wichtig für installierte Apps auf dem iPhone), Name, optionale Körperdaten, frei wählbares Ziel (Abnehmen, Halten, Zunehmen, eigene Zahl). Tagesziel frei einstellbar, optionaler Vorschlag per Mifflin-St Jeor × Aktivitätsfaktor ± Zu-/Abschlag. Makro-Vorschlag 25/45/30 %, frei anpassbar. |
| **Heute** | Fortschrittsring (gegessen / Ziel / übrig), Balken für Eiweiß, Kohlenhydrate, Fett, Mahlzeiten getrennt nach Frühstück, Mittag, Abend, Snacks, Schnellaktionen für Mahlzeit, Wasser, Gewicht, eine sachliche Motivationszeile und ein Trink-Hinweis mit „+250 ml“. Mahlzeiten lassen sich kopieren oder „wie am Vortag“ übernehmen. |
| **Mahlzeiten erfassen** | Suche in Open Food Facts, Barcode-Scan per Kamera (html5-qrcode, mit manueller Eingabe als Ausweichmöglichkeit), eigene Lebensmittel (pro 100 g oder pro Portion), Mengen in Gramm, Stück oder Portionen, Zuletzt verwendet und Favoriten, eigene Gerichte aus mehreren Zutaten, Bearbeiten und Löschen. Mehrere Lebensmittel nacheinander erfassen, ohne die Seite zu verlassen. |
| **Rezepte** | 64 deutsche Rezepte (lokales JSON), davon 19 für die Heißluftfritteuse (13 eigene Rezepte + 6 Ofenrezepte mit eigener Heißluftfritteusen-Anleitung). Galerie- oder Listenansicht, Favoriten (geräteübergreifend im Profil), Sortierung nach kcal, Zeit oder Eiweiß, Karussells „Passt zu deinem Tag“, „Aus der Heißluftfritteuse“ und „Deine Favoriten“. Filter nach Mahlzeit, max. kcal, Zubereitungszeit, Stichwort und Eigenschaften, Empfehlungen passend zum Restbudget, Detailansicht mit Portionsskalierung, „Zum Tagesplan“ (gegessen oder eingeplant) und „Zutaten auf die Einkaufsliste“. |
| **Wochenplaner** | Mo–So mit vier Slots pro Tag, Belegung per Rezept, eigenem Gericht oder Freitext, Tages- und Wochensummen, „Woche vorschlagen“ und „Als gegessen eintragen“. |
| **Einkaufsliste** | Aus dem Wochenplan erzeugen (Zutaten zusammenführen, Mengen addieren, nach Kategorien sortieren), abhaken, eigene Artikel („2 l Milch“), „bereits im Vorrat“, Liste leeren, Liste teilen (z. B. per Messenger). |
| **Verlauf** | Tagesprotokoll mit Datumsauswahl, Wochen- und Monatsdiagramme (Recharts) für kcal, Makros, Gewicht und Wasser, jeweils auch als Tabelle. |
| **Erfolge** | 9 Abzeichen mit Fortschritt im Profil und kurzer Animation beim Freischalten, Serie ohne Druck. |
| **Offline** | Ohne Verbindung weiter eintragen: Änderungen landen in einer Warteschlange und werden automatisch übertragen, sobald wieder Netz da ist. |
| **Einstellungen** | Tagesziel, Makros, Profil, Wasserziel, Farbschema (System/Hell/Dunkel), Export als CSV oder JSON, Abmelden, Konto löschen (mit Bestätigung). |

## Technik

- React 19 + Vite + TypeScript, Tailwind CSS v4
- PWA über `vite-plugin-pwa` (Manifest, Icons, Service Worker mit Precache; Open-Food-Facts-Antworten werden zwischengespeichert)
- Supabase für Auth (Magic Link) und Postgres mit Row Level Security
- TanStack Query (Cache wird im Browser gespeichert → zuletzt geladene Daten sind offline lesbar)
- Recharts für Diagramme, html5-qrcode für den Barcode-Scan, lucide-react für Icons
- Vitest für die reinen Funktionen (`src/**/*.test.ts`), Playwright für Oberflächen-Tests (`e2e/`)
- GitHub Actions (`.github/workflows/ci.yml`): Typprüfung, Unit-Tests, Build und Oberflächen-Tests bei jedem Push

```
src/
  app/          Auth-Kontext, Farbschema
  data/         Datenschnittstelle (Supabase und lokaler Demo-Speicher), recipes.json
  hooks/        Datenzugriff (React Query)
  lib/          reine Funktionen: Kalorien, Makros, Einkaufsliste, Planer, Erfolge, Statistik, Export …
  components/   UI-Bausteine und Feature-Komponenten
  pages/        Seiten
supabase/migrations/   SQL-Migrationen
```

## Setup

### 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) ein neues Projekt erstellen.
2. Unter **Project Settings → API** die **Project URL** und den **anon public key** kopieren.
3. Unter **Authentication → URL Configuration**:
   - **Site URL** auf die spätere Adresse der App setzen (lokal `http://localhost:5173`).
   - Unter **Redirect URLs** zusätzlich `http://localhost:5173` und die Produktions-URL eintragen.
4. Unter **Authentication → Providers → Email** muss „Email“ aktiv sein (Standard). Magic Links funktionieren damit ohne Passwort.
   Für den produktiven Einsatz empfiehlt sich ein eigener SMTP-Server (Supabase begrenzt die Zahl der Mails im Gratis-Tarif).

### 2. Migrationen ausführen

Die Dateien in `supabase/migrations/` legen alle Tabellen, RLS-Regeln und die Funktion zum Löschen des Kontos an.
`supabase/setup.sql` enthält alle Migrationen in einer Datei (erzeugt mit `npm run db:bundle`; ein Test prüft, dass sie aktuell ist).

**Variante A – SQL Editor (am einfachsten):** Im Supabase-Dashboard **SQL Editor** öffnen, den Inhalt von
`supabase/setup.sql` einfügen und ausführen.

**E-Mail-Vorlage:** Unter **Authentication → Emails → Magic Link** den Inhalt von
`supabase/email-template-magic-link.html` einfügen. Sie enthält Link **und** Code (`{{ .Token }}`).

**Variante B – Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <dein-projekt-ref>
npx supabase db push
```

### 3. Lokal starten

```bash
npm install
cp .env.example .env      # VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen
npm run dev               # http://localhost:5173
```

Weitere Befehle:

```bash
npm test          # Vitest (Rechenlogik, Einkaufsliste, Planer, Erfolge, Offline-Speicher …)
npm run test:e2e  # Playwright-Oberflächentests im Demo-Modus (baut und startet die App selbst)
npm run db:bundle # supabase/setup.sql aus den Migrationen neu erzeugen
npm run build     # Typprüfung + Produktions-Build nach dist/
npm run preview   # Build lokal ansehen (inkl. Service Worker)
```

Ohne `.env` startet die App mit dem Hinweis, dass Supabase fehlt. Über **„Ohne Konto ausprobieren“** lässt sie sich
trotzdem vollständig testen – die Daten liegen dann nur im Browser (Demo-Modus). Ist Supabase eingerichtet, ist der
Demo-Modus ausgeblendet; mit `VITE_ENABLE_DEMO=true` lässt er sich wieder einblenden.

### 4. Deployment

**Vercel**

1. Repository in Vercel importieren (Framework: Vite wird erkannt; Build `npm run build`, Output `dist`).
2. Unter **Settings → Environment Variables** `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` setzen.
3. Deployen. `vercel.json` leitet alle App-Routen auf `index.html` um.
4. Die Vercel-URL in Supabase als **Site URL** und **Redirect URL** eintragen.

**Netlify**

1. Repository in Netlify importieren – `netlify.toml` setzt Build-Befehl, Ausgabeordner und SPA-Weiterleitung.
2. Unter **Site configuration → Environment variables** die beiden `VITE_…`-Variablen setzen und neu deployen.
3. Die Netlify-URL in Supabase als **Site URL** und **Redirect URL** eintragen.

### 5. Auf dem Smartphone installieren

- **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“.
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.

Der Barcode-Scanner benötigt HTTPS (auf Vercel/Netlify automatisch) und die Kamera-Freigabe.

## Datenschutz und Sicherheit

- Jede Tabelle hat Row Level Security: Nutzer können nur Zeilen mit ihrer eigenen `user_id` lesen und schreiben.
- `delete_my_account()` ist eine `security definer`-Funktion, die nur den aufrufenden Nutzer aus `auth.users` löscht.
  Alle Daten hängen per `on delete cascade` daran und werden mit entfernt.
- Im Browser wird nur der öffentliche `anon`-Key verwendet.
- An Open Food Facts gehen nur Suchbegriffe und Barcodes, keine persönlichen Daten.

## Annahmen

Entscheidungen, die ich ohne Rückfrage getroffen habe:

**Produkt & Inhalte**
- **App-Name „Teller“** – kurz, deutsch, passt zum Thema.
- **Demo-Modus ohne Konto**: Ist Supabase nicht konfiguriert (oder möchte man nur testen), speichert die App alles lokal im Browser. Dieselbe Datenschnittstelle wird für Supabase und den lokalen Speicher genutzt.
- **Kein Pflicht-Tagesziel aus der Formel**: Standard ist 2.000 kcal. Der Mifflin-St-Jeor-Vorschlag erscheint nur, wenn Geschlecht, Alter, Größe und Gewicht angegeben sind, und wird erst per „Übernehmen“ gesetzt.
- **Standard-Zu-/Abschläge**: Abnehmen −500 kcal, Halten 0, Zunehmen +300 kcal – nur als Vorbelegung, frei änderbar. „Eigene Zahl“ blendet den Vorschlag aus.
- **Geschlecht** wird nur für die Formel abgefragt und ist optional („Keine Angabe“).
- **Wasserziel** 2.000 ml als Startwert, frei änderbar.
- **Heißluftfritteuse**: Im Profil (und im Onboarding) einstellbar, standardmäßig an. Dann zeigen Rezepte mit Variante zuerst die Heißluftfritteusen-Schritte (Temperatur und Garzeit), die Galerie stellt solche Rezepte bei „Empfohlen“ nach vorne und „Woche vorschlagen“ bevorzugt sie leicht. Ohne Gerät gibt es bei reinen Heißluftfritteusen-Rezepten einen Hinweis für den Backofen (ca. 20 °C mehr, etwas länger). Garzeiten sind Richtwerte für Geräte mit Korb (ca. 4–6 l).
- **Rezept-Favoriten** werden als Liste von Rezept-IDs im Profil gespeichert (Migration `…0005_kitchen.sql`), damit sie auf allen Geräten gleich sind.
- **Rezeptnährwerte** sind gerundete Richtwerte, die ich aus üblichen Nährwerttabellen geschätzt habe; ein Test prüft, dass kcal und Makros zueinander passen (±20 %). Rezepte haben statt Fotos Emoji-Kacheln (keine Bildrechte nötig, klein, offline verfügbar).
- **„Zum Tagesplan hinzufügen“** bietet zwei Wege: als gegessen ins Tagesprotokoll oder als Eintrag in den Wochenplan.
- **Motivationszeilen und Erfolge** sind bewusst neutral formuliert. Überschreitungen werden in Orange statt Rot dargestellt, ohne Warnungen.

**Erfassen**
- Eigene Lebensmittel werden intern immer **pro 100 g** gespeichert. Bei Angabe „pro Portion“ ist deshalb die Portionsgröße in Gramm nötig (Schätzung ist erlaubt).
- Ein Stückgewicht ist optional; erst dann ist die Einheit „Stück“ verfügbar. Portionen gibt es, wenn eine Portionsgröße bekannt ist (bei Open Food Facts aus `serving_quantity`).
- Verwendete Open-Food-Facts-Produkte werden in die eigene Bibliothek übernommen (für „Zuletzt“, Favoriten und schnellere Barcode-Treffer).
- Ein Protokolleintrag speichert die Nährwerte als Kopie. Spätere Änderungen an einem Lebensmittel oder Gericht ändern alte Einträge nicht. Beim Bearbeiten der Menge werden die Werte proportional umgerechnet.
- Die Open-Food-Facts-Suche nutzt die neue Such-API (`search.openfoodfacts.org`) und fällt bei Fehlern auf die klassische Suche zurück. Produkte ohne Energieangabe werden ausgeblendet; kJ werden in kcal umgerechnet.

**Wochenplaner & Einkaufsliste**
- **„Woche vorschlagen“** füllt nur leere Slots: Frühstück ≈ 25 %, Mittag ≈ 37 %, Abend ≈ 30 % des Tagesziels; ein Snack kommt hinzu, wenn noch mindestens 120 kcal übrig sind. Portionen werden in 0,5er-Schritten zwischen 1 und 2 angepasst. Gewählt wird zufällig unter den 4 passendsten Rezepten (kcal-Nähe plus Makro-Verteilung), möglichst ohne Wiederholung in der Woche.
- **Einkaufsliste aus dem Plan** ersetzt frühere Plan-Artikel, eigene Artikel bleiben. Der Status „abgehakt“/„im Vorrat“ bleibt für gleiche Zutaten erhalten.
- Zutaten werden zusammengeführt, wenn **Name und Einheit** übereinstimmen (kg→g und l→ml werden umgerechnet). EL und TL werden nicht ineinander umgerechnet.
- Zutaten eigener Gerichte erscheinen in Gramm; die Kategorie wird anhand von Stichwörtern erraten.
- Rezept-Zutaten auf der Einkaufsliste landen als „eigene Artikel“ und werden beim Neu-Erzeugen aus dem Plan nicht überschrieben.

**Erfolge**
- **„Im Ziel“** = Tages-kcal innerhalb ±10 % des Tagesziels.
- **„Ausgewogener Tag“** = kcal innerhalb ±15 % des Ziels **und** jeder Makro-Anteil höchstens 10 Prozentpunkte von der eingestellten Verteilung entfernt.
- **Wochen** laufen von Montag bis Sonntag.
- **Gemüsesorten** werden über eine Stichwortliste aus Namen erkannt (z. B. „Möhren“ → Karotte); Hülsenfrüchte zählen mit. Die Erkennung ist bewusst einfach.
- **„Erstes Rezept gekocht“** = ein Rezept wurde als gegessen eingetragen. **„Erste Woche geplant“** = an allen 7 Tagen einer Woche steht mindestens ein Eintrag im Plan.
- Zusätzlich zu den Beispielen gibt es „Der Anfang ist gemacht“ (erster Eintrag) und „Eine ganze Woche“ (7 Tage in Folge).
- **Serie**: zählt aufeinanderfolgende Tage mit Einträgen. Ist heute noch nichts eingetragen, zählt die Serie bis gestern – ein verpasster Tag setzt sie einfach auf 0.
- Erfolge werden aus den Daten der letzten 365 Tage berechnet und einmalig gespeichert (sie verschwinden nicht wieder).

**Technik**
- **Offline-Schreiben**: Eine Schicht über Supabase (`src/data/offlineStore.ts`) spiegelt geladene Daten im Browser und
  legt Änderungen ohne Verbindung in eine Warteschlange, die der Reihe nach übertragen wird. IDs werden dafür im Client
  erzeugt (UUID). Konflikte werden nicht zusammengeführt – „letzter Schreibvorgang gewinnt“. Doppelte Einfügungen nach
  Abbrüchen gelten als erledigt; andere Serverfehler werden verworfen, damit die Warteschlange nicht hängen bleibt.
  Konto löschen geht nur online.
- **Anmeldung per Code**: Zusätzlich zum Magic Link kann der 6-stellige Code aus derselben Mail eingegeben werden, weil
  installierte Web-Apps auf dem iPhone getrennt von Safari speichern.
- **Abzeichen** erscheinen nicht, während man Lebensmittel erfasst, sondern danach.
- **Tailwind v4** (CSS-first-Konfiguration) statt v3; Farben als CSS-Variablen für Hell/Dunkel.
- **Offline-Grundfunktion**: App-Shell, Rezepte und zuletzt geladene Daten sind offline verfügbar; Suche in Open Food Facts und Barcode-Abfrage brauchen eine Verbindung. Im Demo-Modus liegt ohnehin alles lokal.
- **Export**: CSV mit Semikolon, Dezimalkomma und UTF-8-BOM (öffnet direkt in deutschem Excel); JSON enthält alle Tabellen und das Profil.
- **Konto löschen** erfordert die Eingabe „LÖSCHEN“.
- Datumswerte werden als lokales Kalenderdatum (`yyyy-MM-dd`) gespeichert, nicht als Zeitstempel.
- Diagrammfarben für Makros sind für Hell und Dunkel auf Farbfehlsichtigkeit geprüft; jedes Diagramm hat zusätzlich eine Tabellenansicht.

## Nicht umgesetzt (bewusst)

- **Push-Benachrichtigungen** (z. B. Trink-Erinnerung): bräuchten einen Server-Dienst (Supabase Edge Function + Web-Push-Schlüssel) und funktionieren auf dem iPhone nur in installierten Apps. Stattdessen gibt es den Trink-Hinweis auf der Startseite.
- **Rezeptfotos**: wegen Bildrechten Emoji-Kacheln.
- **Nährwerte der Rezepte aus Zutaten berechnen**: bräuchte eine verlässliche Nährwertdatenbank für Zutaten.
- **Geteilte Einkaufslisten mit anderen Konten**: stattdessen „Liste teilen“ als Text.

## Hinweis

Teller ersetzt keine Ernährungs- oder medizinische Beratung. Alle Werte sind Richtwerte.
