# Teller – Kalorien & Wochenplan (PWA)

Mobile Web-App auf Deutsch, mit der du deine tägliche Kalorienzufuhr im Blick behältst, dich ausgewogen ernährst
und Wochenpläne sowie Einkaufslisten erstellst. Die App wird über **„Zum Startbildschirm hinzufügen“** installiert und
läuft danach im Vollbild wie eine native App – ein App Store ist nicht nötig.

## Funktionen

| Bereich | Inhalt |
|---|---|
| **Konto & Onboarding** | Login per Magic Link (E-Mail), Name, optionale Körperdaten, frei wählbares Ziel (Abnehmen, Halten, Zunehmen, eigene Zahl). Tagesziel frei einstellbar, optionaler Vorschlag per Mifflin-St Jeor × Aktivitätsfaktor ± Zu-/Abschlag. Makro-Vorschlag 25/45/30 %, frei anpassbar. |
| **Heute** | Fortschrittsring (gegessen / Ziel / übrig), Balken für Eiweiß, Kohlenhydrate, Fett, Mahlzeiten getrennt nach Frühstück, Mittag, Abend, Snacks, Schnellaktionen für Mahlzeit, Wasser, Gewicht und eine sachliche Motivationszeile. |
| **Mahlzeiten erfassen** | Suche in Open Food Facts, Barcode-Scan per Kamera (html5-qrcode, mit manueller Eingabe als Ausweichmöglichkeit), eigene Lebensmittel (pro 100 g oder pro Portion), Mengen in Gramm, Stück oder Portionen, Zuletzt verwendet und Favoriten, eigene Gerichte aus mehreren Zutaten, Bearbeiten und Löschen. |
| **Rezepte** | 51 deutsche Rezepte (lokales JSON). Filter nach Mahlzeit, max. kcal, Zubereitungszeit, Stichwort und Eigenschaften, Empfehlungen passend zum Restbudget, Detailansicht mit Portionsskalierung, „Zum Tagesplan“ (gegessen oder eingeplant) und „Zutaten auf die Einkaufsliste“. |
| **Wochenplaner** | Mo–So mit vier Slots pro Tag, Belegung per Rezept, eigenem Gericht oder Freitext, Tages- und Wochensummen, „Woche vorschlagen“ und „Als gegessen eintragen“. |
| **Einkaufsliste** | Aus dem Wochenplan erzeugen (Zutaten zusammenführen, Mengen addieren, nach Kategorien sortieren), abhaken, eigene Artikel („2 l Milch“), „bereits im Vorrat“, Liste leeren. |
| **Verlauf** | Tagesprotokoll mit Datumsauswahl, Wochen- und Monatsdiagramme (Recharts) für kcal, Makros, Gewicht und Wasser, jeweils auch als Tabelle. |
| **Erfolge** | 9 Abzeichen mit Fortschritt im Profil und kurzer Animation beim Freischalten, Serie ohne Druck. |
| **Einstellungen** | Tagesziel, Makros, Profil, Wasserziel, Farbschema (System/Hell/Dunkel), Export als CSV oder JSON, Abmelden, Konto löschen (mit Bestätigung). |

## Technik

- React 19 + Vite + TypeScript, Tailwind CSS v4
- PWA über `vite-plugin-pwa` (Manifest, Icons, Service Worker mit Precache; Open-Food-Facts-Antworten werden zwischengespeichert)
- Supabase für Auth (Magic Link) und Postgres mit Row Level Security
- TanStack Query (Cache wird im Browser gespeichert → zuletzt geladene Daten sind offline lesbar)
- Recharts für Diagramme, html5-qrcode für den Barcode-Scan, lucide-react für Icons
- Vitest für die reinen Rechenfunktionen in `src/lib/*.test.ts`

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

**Variante A – SQL Editor (am einfachsten):** Im Supabase-Dashboard **SQL Editor** öffnen und die Dateien in
Reihenfolge (`…0001_core.sql` bis `…0004_achievements.sql`) einfügen und ausführen.

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
npm test          # Vitest (Rechenlogik, Einkaufsliste, Planer, Erfolge …)
npm run build     # Typprüfung + Produktions-Build nach dist/
npm run preview   # Build lokal ansehen (inkl. Service Worker)
```

Ohne `.env` startet die App mit dem Hinweis, dass Supabase fehlt. Über **„Ohne Konto ausprobieren“** lässt sie sich
trotzdem vollständig testen – die Daten liegen dann nur im Browser (Demo-Modus).

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
- **Tailwind v4** (CSS-first-Konfiguration) statt v3; Farben als CSS-Variablen für Hell/Dunkel.
- **Offline-Grundfunktion**: App-Shell, Rezepte und zuletzt geladene Daten sind offline verfügbar. Änderungen ohne Verbindung werden nicht in einer Warteschlange gespeichert – dafür ist eine Verbindung nötig.
- **Export**: CSV mit Semikolon, Dezimalkomma und UTF-8-BOM (öffnet direkt in deutschem Excel); JSON enthält alle Tabellen und das Profil.
- **Konto löschen** erfordert die Eingabe „LÖSCHEN“.
- Datumswerte werden als lokales Kalenderdatum (`yyyy-MM-dd`) gespeichert, nicht als Zeitstempel.
- Diagrammfarben für Makros sind für Hell und Dunkel auf Farbfehlsichtigkeit geprüft; jedes Diagramm hat zusätzlich eine Tabellenansicht.

## Hinweis

Teller ersetzt keine Ernährungs- oder medizinische Beratung. Alle Werte sind Richtwerte.
