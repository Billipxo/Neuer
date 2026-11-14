# Teller – Kalorien & Wochenplan (PWA)

> **Einrichtung ohne Vorkenntnisse:** siehe [ANLEITUNG.md](ANLEITUNG.md) (ca. 20 Minuten).

Mobile Web-App auf Deutsch, mit der du deine tägliche Kalorienzufuhr im Blick behältst, dich ausgewogen ernährst
und Wochenpläne sowie Einkaufslisten erstellst. Die App wird über **„Zum Startbildschirm hinzufügen“** installiert und
läuft danach im Vollbild wie eine native App – ein App Store ist nicht nötig.

## Funktionen

| Bereich | Inhalt |
|---|---|
| **Konto & Onboarding** | Login per Magic Link oder 6-stelligem Code aus derselben E-Mail (wichtig für installierte Apps auf dem iPhone), Name, optionale Körperdaten, frei wählbares Ziel (Abnehmen, Halten, Zunehmen, eigene Zahl). Tagesziel frei einstellbar, optionaler Vorschlag per Mifflin-St Jeor × Aktivitätsfaktor ± Zu-/Abschlag. Makro-Vorschlag 25/45/30 %, frei anpassbar. |
| **Heute** | Fortschrittsring (gegessen / Ziel / übrig), Balken für Eiweiß, Kohlenhydrate, Fett, Mahlzeiten getrennt nach Frühstück, Mittag, Abend, Snacks, Schnellaktionen für Mahlzeit, Wasser, Gewicht, eine sachliche Motivationszeile und ein Trink-Hinweis mit „+250 ml“. Mahlzeiten lassen sich kopieren, „wie am Vortag“ übernehmen oder mit einem Tipp **als eigenes Gericht speichern**. Nach dem Löschen eines Eintrags erscheint „Rückgängig“. |
| **Mahlzeiten erfassen** | **Grundnahrungsmittel sofort und offline** (die 256 Zutaten der Nährwerttabelle: Apfel, Haferflocken, Hähnchenbrust, Öl …) mit passenden Maßen – 1 Stück, 1 Scheibe, 1 EL, 1 TL –, Suche in Open Food Facts, Barcode-Scan per Kamera (html5-qrcode, mit manueller Eingabe als Ausweichmöglichkeit), eigene Lebensmittel (pro 100 g oder pro Portion), Mengen in Gramm, Stück oder Portionen, Zuletzt verwendet und Favoriten, eigene Gerichte aus mehreren Zutaten, Bearbeiten und Löschen. Mehrere Lebensmittel nacheinander erfassen, ohne die Seite zu verlassen. **Schnell-Eintrag**: nur Kalorien (auf Wunsch mit Makros) eintragen, wenn es schnell gehen soll – etwa im Restaurant. |
| **Kochbuch** | 443 deutsche Rezepte (lokales JSON) in 13 Kapiteln mit Inhaltsverzeichnis: Frühstück & Brotzeit (56), Suppen & Eintöpfe (38), Salate & Bowls (42), Pasta & Nudeln (38), Kartoffeln, Reis & Getreide (31), Fleisch & Geflügel (40), Fisch & Meeresfrüchte (29), Vegetarisch & vegan (42), Aus dem Ofen & Aufläufe (23), Snacks & Fingerfood (34), Süßes & Backen (30), Grundrezepte, Saucen & Dips (24), Smoothies & Getränke (16). Alle mit ausführlichen Schritt-für-Schritt-Anleitungen, Zutaten-Hinweisen und Tipps & Varianten; 82 Klassiker, 309 vegetarisch, davon 80 vegan, 91 für die Heißluftfritteuse (60 eigene Rezepte, 31 mit Variante zu Ofen/Pfanne). kcal, Makros und Ballaststoffe werden aus den Zutaten berechnet; vegetarisch, vegan, glutenfrei, proteinreich, low carb, schnell und ballaststoffreich werden automatisch erkannt. Galerie- oder Listenansicht, Favoriten (geräteübergreifend), **Filtern & sortieren als Entscheidungshilfe**: fertig in 15/30/45 Minuten, Fleisch & Fisch (vegetarisch, wenig Fleisch, viel Fleisch, mit Fisch), Kalorien (leicht, mittel, deftig), wenige Zutaten und mehrere Eigenschaften zugleich – jede Option zeigt, wie viele Rezepte damit übrig blieben; gesetzte Filter erscheinen als Chips zum Entfernen, „Zufallsvorschlag“ wählt aus den Treffern, und mit „Zurück“ aus einem Rezept bleibt die Auswahl erhalten. Sortierung nach Empfehlung, schnell fertig, wenige Zutaten, kcal, Eiweiß oder „Oft gekocht“, Karussells „Passt zu deinem Tag“, „Aus der Heißluftfritteuse“, „Saison im &lt;Monat&gt;“, „Zuletzt gekocht“ und „Deine Favoriten“. Schnellfilter nach Kapitel, Mahlzeit, Favoriten, Heißluftfritteuse und Stichwort, Detailansicht mit Portionsskalierung, „Zum Tagesplan“, „Zutaten auf die Einkaufsliste“, „Schon X× gekocht“ und Rezept teilen. |
| **Eigene Rezepte & Varianten** | Jedes Kochbuch-Rezept lässt sich abwandeln: Mengen ändern, Zutaten tauschen oder entfernen, neue Zutaten aus der Nährwerttabelle (256 Einträge), per **Barcode-Scan** (Nährwerte kommen automatisch aus Open Food Facts), aus der Produktsuche oder mit eigenen Werten von der Packung hinzufügen, Schritte und Portionen anpassen, Notiz dazu. Die Nährwerte werden bei jeder Änderung neu berechnet und mit dem Original verglichen („−120 kcal, +4 g Eiweiß“). Eine Vorschlagskarte „Leichter oder vollwertiger“ nennt bewährte Alternativen (Sahne → Kochsahne, Hack → Putenhack oder Linsen, Reis → Vollkornreis …) mit der Ersparnis pro Portion und tauscht auf Tipp. Eigene Rezepte von Grund auf gehen genauso. Varianten und eigene Rezepte stehen im Kochbuch (Chip „Meine Rezepte“), lassen sich eintragen, einplanen, kochen, teilen, auf die Einkaufsliste setzen und werden bei „Woche vorschlagen“ und „Was habe ich da?“ berücksichtigt. Gespeichert werden sie im Konto (Tabelle `recipe_variants`), damit sie auf allen Geräten gleich sind. |
| **Kochmodus** | Ein Schritt pro Bildschirm in großer Schrift, Zutaten zum Abhaken, Zeitangaben im Text werden zu Timer-Knöpfen, app-weite Timer-Leiste mit Ton und Vibration, Display bleibt an. |
| **Kochwissen** | 27 Anleitungen: Heißluftfritteuse mit Garzeiten-Tabelle, Backofen (Ober-/Unterhitze, Umluft, Grill), Küchen-Grundausstattung, Schneiden, Reis, Nudeln, Getreide (Quinoa, Bulgur, Couscous …), Kartoffeln, Eier, Gemüse, Hülsenfrüchte, Fleisch (braten, schmoren, garziehen), Fisch, Saucen binden & abschmecken, Salatdressings, Brühe selbst kochen, Backen (Teige, Vollkorn, weniger Zucker), Kerntemperaturen & Küchenhygiene, Meal Prep, Einfrieren & Auftauen, Reste verwerten, Grundvorrat, Messen ohne Waage, Würzen, Gewürzmischungen, Saisonkalender, Lagerung. Rezepte verlinken passendes Kochwissen. |
| **Was habe ich da?** | Zutaten antippen → passende Rezepte („Alles da“, „Fast alles da“), fehlende Zutaten mit einem Tipp auf die Einkaufsliste, Vorrat aus der Einkaufsliste übernehmen. |
| **Wochenplaner** | Mo–So mit vier Slots pro Tag, Belegung per Rezept, eigenem Gericht oder Freitext, Tages- und Wochensummen, „Woche vorschlagen“ und „Als gegessen eintragen“. **Plan teilen**: als lesbarer Text über das Teilen-Menü – mit einem Link, über den andere den Plan mit einem Tipp in ihren eigenen übernehmen. |
| **Einkaufsliste** | Aus dem Wochenplan erzeugen (Zutaten zusammenführen, Mengen addieren, nach Kategorien sortieren), abhaken, eigene Artikel („2 l Milch“), „bereits im Vorrat“, Liste leeren (mit „Rückgängig“), Liste teilen (z. B. per Messenger). |
| **Gemeinsamer Haushalt** | Mehrere Konten führen **einen Wochenplan und eine Einkaufsliste gemeinsam**: Haushalt gründen, per Einladungslink oder Code beitreten (bis zu acht Mitglieder), Änderungen der anderen erscheinen ohne Neuladen. Portionen im Plan gelten pro Person, die Einkaufsliste rechnet für alle „Personen am Tisch“. Eigene Rezepte und Gerichte sind für Mitglieder lesbar (kochen, einplanen, eintragen). Protokoll, Gewicht, Wasser, Ziele und Erfolge bleiben privat. Wer geht, kann eine Kopie mitnehmen. |
| **Verlauf** | Tagesprotokoll mit Datumsauswahl, Wochen- und Monatsdiagramme (Recharts) für kcal, Makros, Gewicht und Wasser, jeweils auch als Tabelle. **Wochenrückblick** als neutrale Bilanz (Tage, Ø kcal und Eiweiß, Zielbereich, Wasser, Gemüsesorten, Gewicht zur Vorwoche, meistgekochtes Rezept) und **Gewicht & Ziel** mit 7-Tage-Mittel, Trend pro Woche und Weg zum Zielgewicht. Die Heute-Seite zeigt eine Zeile zur laufenden Woche. |
| **Erfolge** | 10 Abzeichen mit Fortschritt im Profil und kurzer Animation beim Freischalten, Serie ohne Druck. |
| **Offline** | Ohne Verbindung weiter eintragen: Änderungen landen in einer Warteschlange und werden automatisch übertragen, sobald wieder Netz da ist. |
| **App-Verknüpfungen** | Langes Drücken auf das App-Symbol (Android, Desktop) führt direkt zu „Mahlzeit eintragen“, „Barcode scannen“, Einkaufsliste oder Wochenplan. |
| **Über & Datenschutz** | Seite „Über Teller“ (auch von der Anmeldeseite aus erreichbar): was wo gespeichert wird, welche Dienste beteiligt sind (nur Open Food Facts), wie man exportiert und löscht, Gesundheitshinweis, Impressum und Kontakt aus `VITE_IMPRESSUM`/`VITE_CONTACT_EMAIL`, Versionsnummer. Rezeptseiten zeigen „Ähnliche Rezepte“. |
| **Einstellungen** | Tagesziel, Makros, Profil, Wasserziel, Ernährungsweise (alles/vegetarisch/vegan), Unverträglichkeiten & Allergien (Gluten, Milch, Ei, Nüsse, Soja, Sesam, Fisch), optionales Zielgewicht, Heißluftfritteuse vorhanden, Farbschema (System/Hell/Dunkel), Export als CSV oder JSON, **Sicherung einspielen** (die JSON-Datei wieder einlesen – auch in ein anderes Konto, ohne Doppelte), gemeinsamer Haushalt, Abmelden, Konto löschen (mit Bestätigung). |

## Technik

- React 19 + Vite + TypeScript, Tailwind CSS v4
- PWA über `vite-plugin-pwa` (Manifest, Icons, Service Worker mit Precache; Open-Food-Facts-Antworten werden zwischengespeichert)
- Supabase für Auth (Magic Link) und Postgres mit Row Level Security
- TanStack Query (Cache wird im Browser gespeichert → zuletzt geladene Daten sind offline lesbar)
- Recharts für Diagramme, html5-qrcode für den Barcode-Scan, lucide-react für Icons
- Vitest für die reinen Funktionen (`src/**/*.test.ts`), Playwright für Oberflächen-Tests (`e2e/`)
- **Datenbank-Tests** (`supabase/tests/`, `npm run test:db`): Alle Migrationen werden in eine leere PostgreSQL eingespielt und die
  Zugriffsregeln mit den Rechten der App geprüft („sieht Ben Annas Plan?“). Geprüft wird auch die Einrichtung von Hand: Jede Datei
  ist wiederholbar, die drei Teile ergeben denselben Stand wie die Migrationen, und kein Teil lässt eine Tabelle ohne Schutzregeln zurück.
- **Oberflächen-Tests mit Konto** (`npm run test:e2e:konto`): Ein kleines Test-Backend (`e2e/backend/`) bildet Anmeldung, Tabellen-Zugriff
  und Funktionen von Supabase nach – dahinter dieselbe PostgreSQL mit allen Migrationen. So laufen alle Abläufe zusätzlich gegen echte
  Spalten, Regeln und Funktionen, auch mit zwei Personen in einem Haushalt.
- GitHub Actions (`.github/workflows/ci.yml`): Typprüfung, Unit-Tests, Build, Datenbank-Tests und Oberflächen-Tests (Demo und Konto) bei jedem Push

```
src/
  app/          Auth-Kontext, Farbschema
  data/         Datenschnittstelle (Supabase, Offline-Schicht, Demo-Speicher), recipes.json,
                ingredients.ts (Nährwerttabelle), guides.ts (Kochwissen)
  hooks/        Datenzugriff (React Query)
  lib/          reine Funktionen: Kalorien, Makros, Einkaufsliste, Planer, Erfolge, Statistik, Export …
  components/   UI-Bausteine und Feature-Komponenten
  pages/        Seiten
supabase/migrations/   SQL-Migrationen
supabase/tests/        Datenbank-Tests (Zugriffsregeln) und Supabase-Nachbau für leere Test-Datenbanken
e2e/                   Oberflächen-Tests; e2e/backend/ = Test-Backend für die Tests mit Konto
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

Die Dateien in `supabase/migrations/` legen alle Tabellen, RLS-Regeln und Funktionen an. Jede lässt sich gefahrlos
erneut ausführen. `npm run db:bundle` erzeugt daraus `supabase/setup.sql` (alles in einer Datei) und
`supabase/setup-teil-1.sql` bis `-3.sql` (dasselbe in drei kleineren Teilen); Tests prüfen, dass sie aktuell sind.

**Variante A – SQL Editor (am einfachsten):** Im Supabase-Dashboard **SQL Editor** öffnen und die drei Teile
`setup-teil-1.sql`, `-2.sql`, `-3.sql` nacheinander einfügen und ausführen. Die Teile gibt es, weil manche Geräte lange
Texte beim Einfügen nach 20.000 Zeichen abschneiden (Fehlermeldung „syntax error“); wo das nicht passiert, genügt
`supabase/setup.sql`.

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
npm run test:db   # Migrationen + Zugriffsregeln in einer echten PostgreSQL prüfen (braucht psql und PGHOST/PGUSER/PGPASSWORD)
npm run test:e2e:konto  # zusätzlich alle Abläufe mit Anmeldung gegen das Test-Backend (braucht dieselbe PostgreSQL)
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
- Zugriffsrechte werden ausdrücklich vergeben (`…0012_grants.sql`): angemeldete Nutzer dürfen die App-Tabellen
  benutzen, Haushalt und Mitglieder nur lesen; ohne Anmeldung gibt es keinen Zugriff. Neuere Supabase-Projekte geben
  nichts mehr von selbst frei – die Test-Datenbank ist deshalb genauso streng eingestellt.
- **Gemeinsamer Haushalt**: Zeilen von Wochenplan und Einkaufsliste mit `household_id` dürfen alle Mitglieder dieses Haushalts lesen und
  ändern; eigene Rezepte und Gerichte dürfen Mitglieder lesen. Mitgliedschaften entstehen nur über geprüfte Funktionen (gründen, mit
  Einladungscode beitreten, verlassen, entfernen) – nie durch direktes Schreiben. Zehn Fehlversuche beim Code sperren das Beitreten für
  eine Stunde. Alles andere (Protokoll, Lebensmittel, Gewicht, Wasser, Profil, Erfolge) bleibt strikt privat.
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
- **Rezeptnährwerte werden berechnet**: `src/data/ingredients.ts` enthält für jede Rezeptzutat gerundete Richtwerte pro 100 g (nach gängigen Nährwerttabellen) und typische Gewichte (z. B. 1 Zwiebel ≈ 80 g, 1 Dose Kichererbsen ≈ 240 g abgetropft). Daraus ergeben sich kcal, Makros und Ballaststoffe pro Portion (kcal auf 5 gerundet). Öl wird vollständig mitgerechnet, auch wenn ein Teil in der Pfanne bleibt. Tests stellen sicher, dass jede Zutat aufgelöst werden kann und die Werte plausibel sind.
- **Automatische Kennzeichnung**: vegetarisch = ohne Fleisch/Fisch; vegan = zusätzlich ohne Milch, Ei, Honig; glutenfrei = ohne glutenhaltige Zutaten (Haferflocken und Sojasauce gelten vorsichtshalber als glutenhaltig, bei Zöliakie trotzdem Packungsangaben prüfen); Zartbitterschokolade gilt vorsichtshalber nicht als vegan. Parmesan wird als vegetarisch gewertet, mit Hinweis auf tierisches Lab. Proteinreich = mind. 30 % der Energie aus Eiweiß (oder mind. 25 g bei mind. 20 %), low carb = höchstens 20 g Kohlenhydrate und 25 % der Energie, ballaststoffreich = mind. 8 g (oder 5 g bei 2,5 g pro 100 kcal), schnell = höchstens 15 Minuten inklusive Wartezeit.
- **Wartezeiten** (Quellen, Kühlen, Einfrieren) stehen getrennt von der aktiven Zubereitungszeit. „Fertig in“ und die Sortierung „Schnell fertig zuerst“ rechnen mit der Gesamtzeit – Overnight Oats sind trotz 5 Minuten Arbeit also nicht „in 15 Minuten fertig“.
- **Fleisch & Fisch** wird aus den Zutaten berechnet (Gramm pro Portion). „Wenig Fleisch“ heißt unter 100 g pro Portion – typischerweise Schinken, Speck oder Würstchen als Beigabe –, „Viel Fleisch“ ab 100 g. Fleisch ohne Mengenangabe zählt als „wenig“. „Vegetarisch“ ist dieselbe Kennzeichnung wie am Rezept; Gerichte mit Fisch erscheinen unter „Mit Fisch“ (auch, wenn zusätzlich Fleisch drin ist).
- **Kalorien-Stufen**: leicht bis 350 kcal, mittel 350–550 kcal, deftig ab 550 kcal pro Portion. „Wenige Zutaten“ heißt höchstens fünf, gezählt ohne Grundvorrat wie Salz, Öl und Gewürze.
- **Filter merken**: Die Auswahl gehört zum jeweiligen Eintrag im Verlauf. „Zurück“ (etwa aus einem Rezept) stellt sie wieder her; ein neuer Aufruf des Kochbuchs über die Navigation beginnt ohne Filter. Gespeichert wird nur in dieser Sitzung des Browsers (sessionStorage).
- Rezepte haben statt Fotos Farbverläufe mit Emoji (keine Bildrechte nötig, klein, offline verfügbar).
- **Kapitel**: Jedes Rezept gehört zu genau einem Kapitel (Feld `chapter`). Gerichte, die in mehrere Kapitel passen würden, stehen dort, wo man sie zuerst suchen würde (z. B. Lasagne bei Pasta, Fischauflauf bei Fisch, Kartoffelgratin bei Kartoffeln). Mahlzeiten (Frühstück, Mittag …) sind davon unabhängig und bleiben als Filter erhalten.
- **Grundrezepte** (Saucen, Dips, Brühe, Teige, Brot) gehören meist zu keiner Mahlzeit; beim Eintragen wählt man die Mahlzeit selbst. Bei Brühen sind die Nährwerte großzügig gerechnet, weil ein Teil des Gemüses im Sieb bleibt.
- **Süßes & Backen** nennt Mengen pro Stück bzw. Portion (z. B. 1 Stück Kuchen, 2 Kekse); Rezepte bleiben bewusst klassisch und werden nicht als „gesund“ beworben.
- **Kochmodus-Timer** laufen im Browser: Ton, Vibration und Benachrichtigung gibt es zuverlässig, solange die App geöffnet ist. Eine Benachrichtigung bei geschlossener App bräuchte Web-Push mit Server und ist nicht umgesetzt. „Display bleibt an“ nutzt die Wake-Lock-Schnittstelle, sofern der Browser sie unterstützt.
- **Saison** bezieht sich auf regionale Freiland- oder Lagerware in Deutschland (vereinfachte Monatslisten). Saisonempfehlungen gewichten typische Saisonware (z. B. Grünkohl) stärker als fast ganzjährige (z. B. Äpfel); „Woche vorschlagen“ bevorzugt saisonale Rezepte leicht.
- **„Was habe ich da?“** vergleicht Oberbegriffe (z. B. „Joghurt“ für alle Joghurtsorten). Salz, Zucker, Öl, Gewürze, Gemüsebrühe, Mehl, Backpulver, Senf, Honig und Sojasauce zählen nie als fehlend; Zwiebeln und Knoblauch optional. Die Auswahl wird nur auf dem Gerät gespeichert.
- **Ernährungsweise** im Profil (Migration `…0006_diet.sql`) filtert Wochenvorschlag, Planer-Auswahl, Empfehlungen und die Zutaten-Suche; in der Galerie per Chip abschaltbar.
- **Kochwissen** enthält Richtwerte für den Haushalt (Garzeiten, Kerntemperaturen, Haltbarkeiten) – keine Gewähr für jedes Gerät.
- **Allergene** werden aus den Kennzeichnungen der Zutatentabelle abgeleitet (Gluten, Milch inkl. Lab-Käse, Ei, Nüsse/Erdnüsse, Soja, Sesam, Fisch/Meeresfrüchte) und auf jeder Rezeptseite genannt. Im Profil gewählte **Unverträglichkeiten** (Migration `…0009_avoid.sql`) wirken wie die Ernährungsweise: Vorschläge, Wochenplan, Planer-Auswahl und Zutaten-Suche lassen betroffene Rezepte weg, das Kochbuch filtert mit dem Chip „Für mich passend“ (abschaltbar). Spuren und Kreuzkontamination kann die App nicht wissen – der Hinweis auf Packungsangaben bleibt bewusst stehen.
- **Varianten und eigene Rezepte** (Migration `…0007_recipe_variants.sql`) speichern nur Zutaten, Schritte und Angaben – die Nährwerte werden beim Laden wie bei allen Rezepten aus den Zutaten berechnet. Eine Variante kennt ihr Original (`base_recipe_id`), übernimmt Kapitel, Mahlzeiten und Tipps und zeigt den Unterschied pro Portion. Das Original bleibt unverändert; „Klassiker“ gilt für eine Variante nicht mehr.
- **Eigene Zutaten** in Varianten tragen ihre Nährwerte pro 100 g selbst (von der Packung oder aus Open Food Facts) und eine Art (pflanzlich, Milch/Ei, Fleisch, Fisch) für die Kennzeichnung vegetarisch/vegan. Ohne ausdrückliche Angabe gelten sie vorsichtshalber als glutenhaltig. Beim Wechsel der Einheit wird die Menge umgerechnet (200 g Zwiebeln → 2,5 Stück).
- **Varianten mit Heißluftfritteuse**: Eine Variante hat genau eine Zubereitungsart. Beim Abwandeln eines Backofen-Rezepts mit Heißluft-Variante wählt man, welche Schritte übernommen werden; die Angaben zu Temperatur und Garzeit lassen sich anpassen.
- Wird eine Variante gelöscht, bleiben bereits eingetragene Mahlzeiten und Planeinträge mit ihrem Namen und ihren Nährwerten erhalten – nur die Verknüpfung zum Rezept fehlt dann.
- **„Zum Tagesplan hinzufügen“** bietet zwei Wege: als gegessen ins Tagesprotokoll oder als Eintrag in den Wochenplan.
- **Gewichtstrend** = Ausgleichsgerade über die Einträge der letzten 28 Tage (ab 3 Einträgen über mindestens 7 Tage), angezeigt als Veränderung pro Woche; der aktuelle Wert ist das Mittel der letzten 7 Tage. Die Hochrechnung zum Zielgewicht (Migration `…0010_target_weight.sql`) erscheint nur, wenn der Trend in Richtung Ziel zeigt, und wird ausdrücklich als Hochrechnung bezeichnet. Der Wochenrückblick nennt Beobachtungen ohne Bewertung.
- **Impressum und Kontakt** kommen aus Umgebungsvariablen, weil sie je Betreiber verschieden sind; fehlen sie, weist die Seite darauf hin. Die Datenschutz-Angaben beschreiben den tatsächlichen Aufbau (Supabase, Open Food Facts, lokale Kopie) – es gibt keine Analyse- oder Werbedienste, daher auch keine Einwilligungsabfrage.
- **Ähnliche Rezepte** werden über Kapitel, gemeinsame Hauptzutaten (Oberbegriffe ohne Salz, Öl, Zwiebeln …) und Eigenschaften bestimmt; bei Varianten gilt das Original als Bezug.
- **Motivationszeilen und Erfolge** sind bewusst neutral formuliert. Überschreitungen werden in Orange statt Rot dargestellt, ohne Warnungen.

**Erfassen**
- Eigene Lebensmittel werden intern immer **pro 100 g** gespeichert. Bei Angabe „pro Portion“ ist deshalb die Portionsgröße in Gramm nötig (Schätzung ist erlaubt).
- **Grundnahrungsmittel** kommen aus der Nährwerttabelle des Kochbuchs und werden beim ersten Eintragen als eigenes Lebensmittel in die Bibliothek übernommen (ohne Marke, ohne Barcode), damit sie unter „Zuletzt“ und „Favoriten“ auftauchen. Stück-Maße stammen aus der Tabelle (1 Scheibe Brot = 50 g, 1 Zehe Knoblauch = 4 g), Esslöffel/Teelöffel ebenso (Migration `…0008_units_basics.sql`). Salz wird beim Erfassen nicht angeboten.
- Ein Stückgewicht ist optional; erst dann ist die Einheit „Stück“ verfügbar. Gleiches gilt für Gramm pro EL/TL bei eigenen Lebensmitteln. Portionen gibt es, wenn eine Portionsgröße bekannt ist (bei Open Food Facts aus `serving_quantity`).
- Verwendete Open-Food-Facts-Produkte werden in die eigene Bibliothek übernommen (für „Zuletzt“, Favoriten und schnellere Barcode-Treffer).
- Ein Protokolleintrag speichert die Nährwerte als Kopie. Spätere Änderungen an einem Lebensmittel oder Gericht ändern alte Einträge nicht. Beim Bearbeiten der Menge werden die Werte proportional umgerechnet.
- Die Open-Food-Facts-Suche nutzt die neue Such-API (`search.openfoodfacts.org`) und fällt bei Fehlern auf die klassische Suche zurück. Produkte ohne Energieangabe werden ausgeblendet; kJ werden in kcal umgerechnet.

**Wochenplaner & Einkaufsliste**
- **„Woche vorschlagen“** schlägt keine Grundrezepte und keine Rezepte für große Mengen (ab 8 Portionen, z. B. Kuchen, Kekse, Müsli) vor, damit nicht ein Sechzehntel eines Kuchens auf der Einkaufsliste landet – selbst einplanen lassen sie sich jederzeit. „Passt zu deinem Tag“ zeigt ebenfalls keine Grundrezepte.
- **„Woche vorschlagen“** füllt nur leere Slots: Frühstück ≈ 25 %, Mittag ≈ 37 %, Abend ≈ 30 % des Tagesziels; ein Snack kommt hinzu, wenn noch mindestens 120 kcal übrig sind. Portionen werden in 0,5er-Schritten zwischen 1 und 2 angepasst. Gewählt wird zufällig unter den 4 passendsten Rezepten (kcal-Nähe plus Makro-Verteilung), möglichst ohne Wiederholung in der Woche.
- **Einkaufsliste aus dem Plan** ersetzt frühere Plan-Artikel, eigene Artikel bleiben. Der Status „abgehakt“/„im Vorrat“ bleibt für gleiche Zutaten erhalten.
- Zutaten werden zusammengeführt, wenn **Name und Einheit** übereinstimmen (kg→g und l→ml werden umgerechnet). EL und TL werden nicht ineinander umgerechnet.
- Zutaten eigener Gerichte erscheinen in Gramm; die Kategorie wird anhand von Stichwörtern erraten.
- Rezept-Zutaten auf der Einkaufsliste landen als „eigene Artikel“ und werden beim Neu-Erzeugen aus dem Plan nicht überschrieben.

**Gemeinsamer Haushalt & Teilen**
- **Ein Haushalt je Konto**, höchstens acht Mitglieder. Im Haushalt *sind* Wochenplan und Einkaufsliste die gemeinsamen – private Einträge von vorher bleiben gespeichert, sind aber ausgeblendet und erscheinen nach dem Verlassen wieder. Beim Gründen oder Beitreten lässt sich der eigene Plan ab heute samt Einkaufsliste mitnehmen (Vorgabe: ja).
- **Portionen gelten pro Person**: Die Bedeutung von „Portionen“ im Plan ändert sich nicht (so viel esse ich), dadurch bleiben Tages- und Wochensummen mit dem eigenen Tagesziel vergleichbar. Nur die Einkaufsliste aus dem Plan multipliziert mit den „Personen am Tisch“ (Vorgabe 2, wächst mit den Mitgliedern, frei einstellbar – z. B. für Kinder ohne eigenes Konto). „Als gegessen eintragen“ trägt die eigene Portion ins eigene, private Protokoll ein.
- **Eigene Rezepte und Gerichte** der Mitglieder sind für die anderen lesbar, damit ein gemeinsamer Plan vollständig funktioniert (Rezept öffnen, kochen, Zutaten auf die Liste). Ändern kann sie nur, wem sie gehören; „Als eigene Variante speichern“ legt eine eigene Kopie an. Eigene Lebensmittel werden nicht geteilt – Gerichte tragen ihre Nährwerte ohnehin selbst.
- **Verlassen**: Gemeinsame Einträge bleiben dem Haushalt erhalten (auch die selbst eingetragenen, sie gehen an ein verbleibendes Mitglied über). Wer geht oder entfernt wird, behält auf Wunsch eine Kopie von Plan ab heute und offenen Einkäufen. Verlässt das letzte Mitglied den Haushalt, wird er aufgelöst und der gemeinsame Bestand wieder zum eigenen. Wer gegründet hat, kann Mitglieder entfernen; geht diese Person, rückt das dienstälteste Mitglied nach. „Konto löschen“ lässt den gemeinsamen Bestand ebenfalls stehen.
- **Einladung**: Code aus 10 Zeichen (0–9, A–F; beim Eintippen werden O/0 und I/L/1 gleich behandelt) oder Link `/beitreten/CODE`. Der Code wird über Anmeldung und Einrichtung hinweg gemerkt. Jedes Mitglied kann einen neuen Code erzeugen – alte Einladungen gelten dann nicht mehr.
- **Aktualisierung**: Änderungen der anderen kommen über Supabase Realtime sofort an; zusätzlich lädt die App im Haushalt alle 15 Sekunden und beim Zurückkehren in die App neu, falls die Live-Verbindung fehlt. Die Live-Verbindung selbst konnte ich nur gegen das Test-Backend ohne Realtime prüfen – getestet ist also der Weg über das Nachladen.
- **Ohne Haushalt ändert sich nichts**: Die Anfragen der App kennen `household_id` dann nicht. Die App läuft deshalb auch weiter, wenn die Migration `…0011_household.sql` noch nicht eingespielt ist; nur der Haushalt selbst meldet dann, dass die Datenbank aktualisiert werden muss.
- **Im Demo-Modus** gibt es keinen Haushalt (alles liegt nur auf dem Gerät); Teilen als Text und als Link funktioniert.
- **Plan als Link**: Der Link enthält den Plan selbst (keine Speicherung auf einem Server). Kochbuch-Rezepte reisen als Kennung, eigene Rezepte, Gerichte und Freitext als Titel mit Nährwerten. Eingefügt wird in die Woche des Plans – liegt sie zurück, in die laufende; Vorhandenes bleibt erhalten.
- **Erfolge** rechnen im Haushalt mit dem gemeinsamen Plan („Erste Woche geplant“ gilt für alle Mitglieder).

**Sicherung & Komfort**
- **Sicherung einspielen**: Alle Zeilen bekommen neue IDs, Verweise (Eintrag → Lebensmittel/Gericht/Variante, Favoriten) werden umgeschrieben – so funktioniert es auch in ein anderes Konto. Was inhaltlich schon vorhanden ist, wird übersprungen (Lebensmittel mit Barcode gelten am Barcode als vorhanden); dieselbe Datei lässt sich gefahrlos mehrfach einspielen. Profil und Einstellungen werden nur auf Wunsch übernommen (vorgewählt, wenn das Konto noch leer ist). Mit Konto braucht das Einspielen Netz. Im Haushalt landen Plan und Einkaufsliste im gemeinsamen Bestand; exportiert werden nur eigene Rezepte und Gerichte.
- **Rückgängig** legt gelöschte Zeilen mit gleichem Inhalt neu an (neue ID); der Hinweis bleibt sechs Sekunden stehen.
- **Schnell-Eintrag** speichert einen Protokolleintrag ohne Lebensmittel („Portion“ mit den eingegebenen Werten).
- **Mahlzeit als Gericht**: Einträge mit Grammangabe werden zu Zutaten in Gramm, alle anderen (Portionen, Schnell-Einträge) zu Portions-Zutaten.
- **App-Verknüpfungen** stehen im Web-App-Manifest; iOS unterstützt sie nicht.

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
- **Mehr als 1000 Zeilen**: Supabase liefert pro Anfrage höchstens 1000 Zeilen. Der Supabase-Speicher lädt deshalb seitenweise (Gesamtzahl aus der ersten Antwort, feste Reihenfolge nach Anlage-Zeitpunkt und ID), damit bei langem Protokoll nichts stillschweigend fehlt.
- **Start-Paket**: Das Kochbuch (rund 600 kB) wird erst beim Öffnen geladen. `src/startBundle.test.ts` folgt den Importen ab `main.tsx` und schlägt an, wenn Kochbuch, Kochwissen, Diagramm- oder Scanner-Bibliothek wieder in das Start-Paket geraten.
- **Test-Backend statt echtem Supabase**: Die Tests mit Konto laufen gegen einen Nachbau der Supabase-Schnittstellen über einer echten PostgreSQL (alle Migrationen, echte Zugriffsregeln). Das prüft Datenbank und App zusammen, ersetzt aber keinen Test gegen ein echtes Supabase-Projekt – Realtime und der E-Mail-Versand sind darin nicht enthalten.
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

## Rezepte erweitern

Rezepte stehen in `src/data/recipes.json`. Pro Rezept: `id`, `title`, `chapter` (siehe `src/data/chapters.ts`), `meal` (breakfast/lunch/dinner/snack, bei Grundrezepten auch leer), `time_min`,
optional `rest_min`, `servings`, `tags` (nur `meal-prep`, `one-pot`, `klassiker`, `suess` – alles andere wird abgeleitet),
`ingredients` (`name`, `amount`, `unit`, `category`, optional `note`), `steps`, `tips` und optional `airfryer`
(`temp_c`, `time_min`, eigene `steps`, falls das Rezept eigentlich für Ofen oder Pfanne ist). Nährwerte nicht eintragen –
sie werden berechnet. Neue Zutaten in `src/data/ingredients.ts` ergänzen; `npm test` meldet Zutaten, die fehlen oder
deren Einheit nicht umgerechnet werden kann, und prüft, dass Titel eindeutig sind und jedes Rezept ein passendes Symbol bekommt
(Regeln in `recipeEmoji`, `src/lib/recipes.ts`).

## Nicht umgesetzt (bewusst)

- **Push-Benachrichtigungen** (z. B. Trink-Erinnerung): bräuchten einen Server-Dienst (Supabase Edge Function + Web-Push-Schlüssel) und funktionieren auf dem iPhone nur in installierten Apps. Stattdessen gibt es den Trink-Hinweis auf der Startseite.
- **Rezeptfotos**: wegen Bildrechten Emoji-Kacheln.

## Hinweis

Teller ersetzt keine Ernährungs- oder medizinische Beratung. Alle Werte sind Richtwerte.
