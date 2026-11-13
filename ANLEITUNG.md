# Teller einrichten – Schritt für Schritt

Diese Anleitung bringt die App ins Internet, damit du sie auf dem Handy nutzen kannst und deine Daten auf allen Geräten
gleich sind. Programmierkenntnisse brauchst du nicht. Rechne mit etwa **20 Minuten**.

Du brauchst nur:
- dein GitHub-Konto (dort liegt der Code schon),
- ein kostenloses Konto bei **Supabase** (speichert deine Daten und verschickt die Anmelde-Mails),
- ein kostenloses Konto bei **Vercel** (stellt die App ins Internet).

---

## Schritt 1 – Code in den Hauptzweig übernehmen

Der fertige Code liegt im Zweig `ccr-c3ee8030-7y5m8y` deines Repositorys `billipxo/neuer`.

1. Öffne `https://github.com/billipxo/neuer`.
2. Oben erscheint meist ein gelber Hinweis mit **„Compare & pull request“**. Klicke darauf.
   (Falls nicht: Reiter **Pull requests** → **New pull request** → links `main`, rechts `ccr-c3ee8030-7y5m8y` wählen.)
3. **Create pull request** → danach **Merge pull request** → **Confirm merge**.

Jetzt ist alles im Zweig `main`.

---

## Schritt 2 – Supabase-Projekt anlegen

1. Gehe auf [supabase.com](https://supabase.com) → **Start your project** → mit GitHub anmelden.
2. **New project**:
   - Name: `teller`
   - Database Password: auf **Generate a password** klicken (du brauchst es später nicht)
   - Region: **Central EU (Frankfurt)**
3. **Create new project** – kurz warten, bis das Projekt bereit ist (1–2 Minuten).

## Schritt 3 – Datenbank einrichten (dreimal kopieren und einfügen)

Die Einrichtung besteht aus drei kleinen Dateien. Führe sie **der Reihe nach** aus – für jede dasselbe:

1. In GitHub die Datei öffnen und rechts oben über dem Text auf das Symbol **„Copy raw file“** klicken:
   erst **`supabase/setup-teil-1.sql`**, dann **`supabase/setup-teil-2.sql`**, dann **`supabase/setup-teil-3.sql`**.
2. In Supabase links auf **SQL Editor** → **New query**.
3. Alles einfügen → unten rechts **Run** klicken. Fragt Supabase wegen einer „destructive operation“ nach, mit
   **Run this query** bestätigen – die Dateien räumen nur ihre eigenen Regeln auf, bevor sie sie neu anlegen.
4. Es sollte **„Success. No rows returned“** erscheinen. Dann die nächste Datei.

Nach der dritten Datei sind alle Tabellen und Schutzregeln angelegt (zur Kontrolle: links **Table Editor** zeigt 13 Tabellen).
Jede Datei lässt sich gefahrlos wiederholen – wenn du unsicher bist, ob eine durchgelaufen ist, führe sie einfach noch einmal aus.

> Warum drei Dateien? Manche Geräte schneiden lange Texte beim Einfügen nach 20.000 Zeichen ab; dann meldet Supabase
> einen „syntax error“. Die komplette Einrichtung in einer Datei gibt es weiterhin als `supabase/setup.sql`.

## Schritt 4 – Anmelde-Mail (zum Start nichts zu tun)

Die App kommt ohne Passwort aus: Zum Anmelden gibst du in der App deine E-Mail-Adresse ein und bekommst eine Mail mit
einem Anmeldelink.

Zum Start verschickt Supabase diese Mail selbst. Das genügt zum Ausprobieren, hat aber drei Grenzen:

- Die Mail geht nur an die E-Mail-Adresse deines Supabase-Kontos (und an weitere Mitglieder deines Supabase-Teams).
- Es sind nur wenige Mails pro Stunde möglich.
- Der Text ist englisch und enthält nur einen Link (**Sign in**), keinen Code. Der Link meldet dich in dem Browser an,
  in dem er sich öffnet. Für eine auf dem **iPhone** installierte App reicht das nicht – sie hat einen eigenen Speicher
  und braucht den 6-stelligen Code.

Ändern lässt sich die Mail erst mit einem eigenen Mail-Dienst: Supabase zeigt bei den Vorlagen sonst den Hinweis
**„Set up custom SMTP to edit templates“**, und die Felder sind gesperrt. Sobald du die App auf einem iPhone
installieren willst oder weitere Personen dazukommen, richte ihn ein – siehe **„Eigener Mail-Dienst und deutsche
Anmelde-Mail“** weiter unten.

## Schritt 5 – Zugangsdaten kopieren

1. In Supabase oben auf den grünen Knopf **Connect** klicken.
2. Im Fenster steht unter **Add files** ein Kasten (`.env.local`) mit zwei Zeilen. Wichtig ist jeweils der Teil **nach**
   dem Gleichheitszeichen:
   - `…SUPABASE_URL=` – die **Project URL**, sieht aus wie `https://abcdefgh.supabase.co`
   - `…SUPABASE_PUBLISHABLE_KEY=` – der öffentliche **Schlüssel**, beginnt mit `sb_publishable_…` (bei älteren Projekten
     heißt er **anon public** und beginnt mit `eyJ…`)

   Die Zeilen sind länger als der Kasten: Mit dem Kopier-Symbol am Kasten (oder Zeile markieren und kopieren) bekommst du
   sie vollständig. Lege beide Werte kurz in einer Notiz ab.

Der Schlüssel ist für den Browser gedacht und darf in der App stehen. Alles, was **secret** oder **service_role** heißt,
brauchst du **nicht** – gib es nirgends ein.

---

## Schritt 6 – App mit Vercel ins Internet stellen

1. Gehe auf [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**.
2. **Add New…** → **Project** → bei `neuer` auf **Import** klicken.
   (Wird das Repository nicht angezeigt: **Adjust GitHub App Permissions** und `neuer` freigeben.)
3. Die Einstellungen erkennt Vercel selbst (Framework **Vite**). Klappe nur **Environment Variables** auf und trage ein:

   | Name | Wert |
   |---|---|
   | `VITE_SUPABASE_URL` | deine Project URL aus Schritt 5 |
   | `VITE_SUPABASE_ANON_KEY` | dein Schlüssel aus Schritt 5 |

   Die Namen müssen genau so lauten (nicht `NEXT_PUBLIC_…`, wie Supabase sie anzeigt).

4. **Deploy** klicken und 1–2 Minuten warten.
5. Du bekommst eine Adresse wie **`https://neuer-xyz.vercel.app`**. Das ist deine App.

### Impressum und Kontakt (empfohlen)

Sobald andere Personen die App nutzen, braucht sie ein Impressum. Trage in Vercel unter **Settings → Environment Variables**
zwei weitere Werte ein und klicke danach auf **Redeploy**:

| Name | Wert |
|---|---|
| `VITE_IMPRESSUM` | Name, Anschrift und ggf. weitere Pflichtangaben – Zeilenumbrüche sind erlaubt |
| `VITE_CONTACT_EMAIL` | eine E-Mail-Adresse für Rückfragen |

Beides erscheint unter **Profil → Über Teller, Datenschutz & Impressum** und auf der Anmeldeseite.

## Schritt 7 – Supabase sagen, wo die App wohnt

1. In Supabase: **Authentication** → **URL Configuration**.
2. **Site URL**: deine Vercel-Adresse eintragen, z. B. `https://neuer-xyz.vercel.app` → **Save**.
3. Bei **Redirect URLs** → **Add URL**: `https://neuer-xyz.vercel.app/**` → **Save**.

Ohne diesen Schritt führt der Link in der Mail ins Leere.

---

## Schritt 8 – Auf dem Handy installieren

1. Öffne deine Vercel-Adresse auf dem Handy.
2. **Installieren:**
   - **iPhone (Safari):** Teilen-Symbol □↑ → **Zum Home-Bildschirm** → **Hinzufügen**.
   - **Android (Chrome):** Menü ⋮ → **App installieren** (oder **Zum Startbildschirm hinzufügen**).
3. Öffne **Teller** vom Startbildschirm, gib deine E-Mail-Adresse ein und tippe auf **Anmeldelink senden**.
   Ohne eigenen Mail-Dienst muss es die Adresse deines Supabase-Kontos sein (siehe Schritt 4).
4. In der Mail:
   - **Android/Computer:** auf den Link tippen (**Sign in** bzw. **Bei Teller anmelden**) – auf demselben Gerät, auf dem
     du die Mail angefordert hast.
   - **iPhone:** den **6-stelligen Code** in der App eingeben. Den Code enthält die Mail erst mit eigener Vorlage
     (siehe „Eigener Mail-Dienst und deutsche Anmelde-Mail“). Bis dahin kannst du Teller auf dem iPhone in Safari nutzen,
     ohne es zu installieren – dort funktioniert der Link.
5. Kurzes Onboarding ausfüllen – fertig! 🎉

Auf einem zweiten Gerät meldest du dich mit derselben E-Mail an und siehst dieselben Daten.

---

## Eigener Mail-Dienst und deutsche Anmelde-Mail

Nötig, sobald **weitere Personen** die App nutzen sollen oder du sie auf einem **iPhone installierst** (dort meldest du
dich mit dem Code aus der Mail an). Einmalig etwa 15 Minuten. Das Beispiel nutzt Brevo (kostenlos bis 300 Mails am Tag);
jeder andere Dienst mit SMTP-Zugang geht genauso. Die Bezeichnungen bei Brevo können leicht abweichen.

**A. Mail-Dienst vorbereiten (Brevo)**

1. Auf [brevo.com](https://www.brevo.com) ein kostenloses Konto anlegen.
2. Einen Absender bestätigen: in den Einstellungen unter **Senders, Domains & Dedicated IPs** → **Senders** →
   **Add a sender** (Name `Teller`, deine E-Mail-Adresse) und den Bestätigungslink in der Mail anklicken.
3. Im Konto-Menü oben rechts **SMTP & API** öffnen. Dort stehen **SMTP server**, **Port** und **Login**. Mit
   **Generate a new SMTP key** einen Schlüssel erzeugen und kopieren – er wird nur einmal angezeigt.

**B. In Supabase eintragen**

1. **Authentication** → **Emails** → **Set up SMTP** (bzw. Reiter **SMTP Settings**) → **Enable custom SMTP**.
2. Ausfüllen und speichern:

   | Feld | Wert |
   |---|---|
   | Sender email address | die bei Brevo bestätigte Adresse |
   | Sender name | `Teller` |
   | Host | `smtp-relay.brevo.com` |
   | Port number | `587` |
   | Username | der **Login** aus Brevo |
   | Password | der **SMTP key** aus Brevo |

Der Schlüssel gehört nur in dieses Feld bei Supabase – nicht in die App und nicht in Vercel.

**C. Anmelde-Mail auf Deutsch, mit Code**

Jetzt sind die Vorlagen nicht mehr gesperrt.

1. **Authentication** → **Emails** → Vorlage **Magic link or OTP** öffnen.
2. **Subject**: `Dein Anmeldelink für Teller`
3. Bei **Body** auf **Source** klicken, alles löschen und den Inhalt der Datei
   **`supabase/email-template-magic-link.html`** (aus GitHub, wie in Schritt 3 kopieren) einfügen.
4. **Save changes**.
5. Dasselbe in der Vorlage **Confirm sign up** – Supabase nutzt sie für die allererste Mail an eine neue Adresse.

Danach enthält jede Anmelde-Mail den Link und den 6-stelligen Code, und Mails gehen an jede Adresse.

## Gut zu wissen

- **Offline:** Ohne Internet kannst du weiter eintragen. Oben erscheint ein Hinweis; sobald wieder Netz da ist,
  wird alles automatisch übertragen. Nur die Lebensmittel-Suche und der Barcode-Scan brauchen Internet.
- **Kamera für den Barcode-Scan:** Beim ersten Scan fragt das Handy nach der Kamera – bitte **Erlauben**.
- **Updates:** Jede Änderung im Zweig `main` stellt Vercel automatisch neu online. Die App lädt die neue Version beim
  nächsten Öffnen.
- **E-Mail-Versand:** Der eingebaute Mail-Versand von Supabase ist für den Start gedacht und streng begrenzt (wenige
  Mails pro Stunde, nur an die Adresse deines Supabase-Kontos, englischer Text ohne Code). Für dich allein am Computer
  oder Android-Handy reicht das. Für **weitere Personen** oder eine auf dem **iPhone** installierte App richte einen
  eigenen Mail-Dienst ein – siehe „Eigener Mail-Dienst und deutsche Anmelde-Mail“.
- **Sicherung:** Unter **Profil → Deine Daten → Alle Daten (JSON)** lädst du eine Sicherung herunter. Mit
  **Sicherung einspielen** liest du sie wieder ein – auch in einem neuen Konto oder nach einem Neuanfang. Vorhandenes
  wird nicht überschrieben und nichts doppelt angelegt.
- **Kosten:** Supabase und Vercel sind für eine private Nutzung kostenlos. Ein Supabase-Gratisprojekt wird nach
  längerer Inaktivität (ca. 1 Woche ohne Nutzung) pausiert – im Dashboard mit einem Klick wieder starten.

## Gemeinsam planen und einkaufen (Haushalt)

Wenn mehrere Personen zusammen planen wollen, braucht **jede ein eigenes Konto** in deiner App (einfach mit der eigenen
E-Mail-Adresse anmelden).

1. Eine Person öffnet **Profil → Gemeinsamer Haushalt → Haushalt gründen** und gibt dem Haushalt einen Namen.
2. Über **Einladung teilen** geht ein Link an die anderen (oder den Code vorlesen).
3. Die anderen tippen auf den Link – oder geben den Code unter **Profil → Gemeinsamer Haushalt → Mit Code beitreten** ein.

Ab dann sehen alle denselben **Wochenplan** und dieselbe **Einkaufsliste**; wer etwas einplant oder abhakt, sehen die
anderen nach wenigen Sekunden. Portionen im Plan gelten pro Person, die Einkaufsliste rechnet für alle am Tisch
(einstellbar unter „Personen am Tisch“). **Privat** bleiben: was du isst (Protokoll), Gewicht, Wasser, Ziele und Erfolge.

Zwei Dinge, die du dafür einmal prüfen solltest:

- **Datenbank-Update:** Die Migration `20261113000011_household.sql` muss eingespielt sein (siehe „Später: Updates der
  Datenbank“). Fehlt sie, läuft die App normal weiter – nur der Haushalt meldet, dass die Datenbank aktualisiert werden muss.
- **E-Mail-Versand für weitere Personen:** Der eingebaute Mail-Versand von Supabase verschickt je nach Projekt nur an
  dich selbst und nur wenige Mails pro Stunde. Damit sich Partner, Familie oder Mitbewohner anmelden können, richte einen
  eigenen Mail-Dienst ein (siehe „Eigener Mail-Dienst und deutsche Anmelde-Mail“).

Ohne Haushalt kannst du deinen **Wochenplan** trotzdem **teilen**: im Planer oben rechts auf das Teilen-Symbol tippen.
Verschickt wird ein lesbarer Text; wer selbst deine App nutzt, übernimmt den Plan über den Link am Ende mit einem Tipp.

## Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| Die App zeigt eine leere Seite oder „Die Verbindung zur Datenbank ist falsch eingestellt“ | Einer der beiden Werte bei Vercel stimmt nicht. In Vercel **Environment Variables** öffnen: `VITE_SUPABASE_URL` muss die Adresse sein (`https://….supabase.co`), `VITE_SUPABASE_ANON_KEY` der öffentliche Schlüssel (`sb_publishable_…` oder `eyJ…`). Danach **Deployments** → **⋯** → **Redeploy**. |
| Die App zeigt „Supabase ist noch nicht eingerichtet“ | Umgebungsvariablen in Vercel prüfen (Schritt 6, genaue Namen!) → in Vercel **Deployments** → **⋯** → **Redeploy**. |
| Keine Mail angekommen | Spam-Ordner prüfen. Zu viele Versuche? Ein paar Minuten warten. Siehe „E-Mail-Versand“ oben. |
| Link in der Mail öffnet eine Fehlerseite / „localhost“ | Schritt 7 prüfen (Site URL und Redirect URL). |
| Auf dem iPhone nach Klick auf den Link nicht angemeldet | In der installierten App den **Code** aus der Mail eingeben (Schritt 4 + 8). |
| Kein Code in der Mail | Der Code steht erst mit eigener Vorlage in der Mail – siehe „Eigener Mail-Dienst und deutsche Anmelde-Mail“. |
| Vorlage der Mail lässt sich nicht bearbeiten („Set up custom SMTP to edit templates“) | Supabase gibt die Vorlagen erst mit eigenem Mail-Dienst frei – siehe derselbe Abschnitt. |
| „Email address … is not authorized“ beim Anmelden | Ohne eigenen Mail-Dienst verschickt Supabase nur an die Adresse deines Supabase-Kontos. Mit dieser Adresse anmelden oder den Mail-Dienst einrichten. |
| Meldung „Die Datenbank ist noch nicht eingerichtet“ | Schritt 3 wiederholen. |
| „syntax error at or near …“ beim Einrichten der Datenbank | Der Text wurde beim Einfügen abgeschnitten (manche Geräte kürzen nach 20.000 Zeichen). Die drei kleinen Dateien aus Schritt 3 nacheinander ausführen. Es wurde dabei noch nichts angelegt – du kannst einfach neu beginnen. |
| „Die Datenbank kennt den gemeinsamen Haushalt noch nicht“ | Die Datei `20261113000011_household.sql` im SQL Editor ausführen (siehe „Später: Updates der Datenbank“). |
| Änderungen der anderen im Haushalt erscheinen erst nach einigen Sekunden | Normal: Spätestens alle 15 Sekunden wird neu geladen. Sofort geht es, wenn in Supabase unter **Database → Publications** bei `supabase_realtime` die Tabellen `plan_items` und `shopping_items` aktiv sind (das erledigt die Migration). |
| „Keine Verbindung zu Open Food Facts“ | Der freie Lebensmitteldienst ist kurz nicht erreichbar – später erneut versuchen oder das Lebensmittel selbst anlegen. |
| Barcode-Scan startet nicht | Kamera in den Handy-Einstellungen für den Browser bzw. die App erlauben. Alternativ die Nummer unter dem Barcode eintippen. |

## Später: Updates der Datenbank

Wenn du die Datenbank **schon einmal** eingerichtet hast und eine neue Version der App kommt, gibt es zwei Wege:

- **Am einfachsten:** die drei Dateien aus Schritt 3 noch einmal der Reihe nach ausführen. Vorhandenes bleibt, wie es ist
  (auch deine Daten), Neues kommt dazu.
- **Gezielt:** nur die **neuen** Dateien aus `supabase/migrations/` im SQL Editor ausführen (die Dateinamen sind nach
  Datum sortiert). Aktuell sind das:

- `20261110000005_kitchen.sql` – Heißluftfritteuse und Lieblingsrezepte
- `20261110000006_diet.sql` – Ernährungsweise (alles, vegetarisch, vegan)
- `20261111000007_recipe_variants.sql` – Eigene Rezepte und abgewandelte Varianten
- `20261111000008_units_basics.sql` – Erfassen in Esslöffeln und Teelöffeln
- `20261111000009_avoid.sql` – Unverträglichkeiten und Allergien im Profil
- `20261111000010_target_weight.sql` – Optionales Zielgewicht
- `20261113000011_household.sql` – Gemeinsamer Haushalt (geteilter Wochenplan und geteilte Einkaufsliste)

Wer noch gar nichts eingerichtet hat, nimmt wie oben die drei Dateien aus Schritt 3 – sie enthalten alles.

## Optional: Ausprobieren ohne Konto

Wenn du die App jemandem zeigen willst, ohne Konto: In Vercel die Variable `VITE_ENABLE_DEMO` mit dem Wert `true`
anlegen und neu deployen. Dann erscheint auf der Anmeldeseite **„Ohne Konto ausprobieren“** (Daten bleiben nur auf dem
Gerät).
