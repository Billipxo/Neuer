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

## Schritt 3 – Datenbank einrichten (einmal kopieren und einfügen)

1. Öffne in GitHub die Datei **`supabase/setup.sql`** → rechts oben auf das Symbol **„Copy raw file“** klicken.
2. In Supabase links auf **SQL Editor** → **New query**.
3. Alles einfügen → unten rechts **Run** klicken.
4. Es sollte **„Success. No rows returned“** erscheinen. Fertig – alle Tabellen und Schutzregeln sind angelegt.

## Schritt 4 – Anmelde-E-Mail auf Deutsch (mit Code fürs iPhone)

1. In Supabase links **Authentication** → **Emails** (bzw. **Email Templates**) → **Magic Link**.
2. **Subject**: `Dein Anmeldelink für Teller`
3. Im Feld **Message body** alles löschen und den Inhalt der Datei **`supabase/email-template-magic-link.html`**
   (aus GitHub, wie in Schritt 3 kopieren) einfügen.
4. **Save**.

> Warum? Auf dem iPhone hat eine installierte Web-App einen eigenen Speicher. Ein Link aus der Mail öffnet Safari,
> nicht die App. Mit dem **6-stelligen Code** aus derselben Mail meldest du dich direkt in der installierten App an.

## Schritt 5 – Zugangsdaten kopieren

1. In Supabase oben auf **Connect** klicken (oder links **Project Settings** → **API**).
2. Notiere dir zwei Werte:
   - **Project URL** – sieht aus wie `https://abcdefgh.supabase.co`
   - **anon public** Key – ein langer Text, beginnt meist mit `eyJ…` (oder `sb_publishable_…`)

Der anon-Key ist für den Browser gedacht und darf in der App stehen. Den **service_role**-Key brauchst du **nicht** –
gib ihn nirgends ein.

---

## Schritt 6 – App mit Vercel ins Internet stellen

1. Gehe auf [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**.
2. **Add New…** → **Project** → bei `neuer` auf **Import** klicken.
   (Wird das Repository nicht angezeigt: **Adjust GitHub App Permissions** und `neuer` freigeben.)
3. Die Einstellungen erkennt Vercel selbst (Framework **Vite**). Klappe nur **Environment Variables** auf und trage ein:

   | Name | Wert |
   |---|---|
   | `VITE_SUPABASE_URL` | deine Project URL aus Schritt 5 |
   | `VITE_SUPABASE_ANON_KEY` | dein anon-Key aus Schritt 5 |

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
4. In der Mail:
   - **iPhone:** den **6-stelligen Code** in der App eingeben.
   - **Android/Computer:** einfach auf **Bei Teller anmelden** tippen (oder ebenfalls den Code nutzen).
5. Kurzes Onboarding ausfüllen – fertig! 🎉

Auf einem zweiten Gerät meldest du dich mit derselben E-Mail an und siehst dieselben Daten.

---

## Gut zu wissen

- **Offline:** Ohne Internet kannst du weiter eintragen. Oben erscheint ein Hinweis; sobald wieder Netz da ist,
  wird alles automatisch übertragen. Nur die Lebensmittel-Suche und der Barcode-Scan brauchen Internet.
- **Kamera für den Barcode-Scan:** Beim ersten Scan fragt das Handy nach der Kamera – bitte **Erlauben**.
- **Updates:** Jede Änderung im Zweig `main` stellt Vercel automatisch neu online. Die App lädt die neue Version beim
  nächsten Öffnen.
- **E-Mail-Versand:** Der eingebaute Mail-Versand von Supabase ist für den Start gedacht und streng begrenzt (wenige
  Mails pro Stunde; je nach Projekt nur an Mitglieder deines Supabase-Teams). Für dich allein reicht das. Sollen
  **weitere Personen** die App nutzen, richte unter **Authentication → Emails → SMTP Settings** einen eigenen
  Mail-Dienst ein (z. B. Brevo oder Resend, beide mit Gratis-Kontingent).
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
  eigenen Mail-Dienst ein (siehe „E-Mail-Versand“ unter „Gut zu wissen“).

Ohne Haushalt kannst du deinen **Wochenplan** trotzdem **teilen**: im Planer oben rechts auf das Teilen-Symbol tippen.
Verschickt wird ein lesbarer Text; wer selbst deine App nutzt, übernimmt den Plan über den Link am Ende mit einem Tipp.

## Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| Die App zeigt „Supabase ist noch nicht eingerichtet“ | Umgebungsvariablen in Vercel prüfen (Schritt 6, genaue Namen!) → in Vercel **Deployments** → **⋯** → **Redeploy**. |
| Keine Mail angekommen | Spam-Ordner prüfen. Zu viele Versuche? Ein paar Minuten warten. Siehe „E-Mail-Versand“ oben. |
| Link in der Mail öffnet eine Fehlerseite / „localhost“ | Schritt 7 prüfen (Site URL und Redirect URL). |
| Auf dem iPhone nach Klick auf den Link nicht angemeldet | In der installierten App den **Code** aus der Mail eingeben (Schritt 4 + 8). |
| Kein Code in der Mail | E-Mail-Vorlage aus Schritt 4 einfügen und speichern. |
| Meldung „Die Datenbank ist noch nicht eingerichtet“ | Schritt 3 wiederholen. |
| „Die Datenbank kennt den gemeinsamen Haushalt noch nicht“ | Die Datei `20261113000011_household.sql` im SQL Editor ausführen (siehe „Später: Updates der Datenbank“). |
| Änderungen der anderen im Haushalt erscheinen erst nach einigen Sekunden | Normal: Spätestens alle 15 Sekunden wird neu geladen. Sofort geht es, wenn in Supabase unter **Database → Publications** bei `supabase_realtime` die Tabellen `plan_items` und `shopping_items` aktiv sind (das erledigt die Migration). |
| „Keine Verbindung zu Open Food Facts“ | Der freie Lebensmitteldienst ist kurz nicht erreichbar – später erneut versuchen oder das Lebensmittel selbst anlegen. |
| Barcode-Scan startet nicht | Kamera in den Handy-Einstellungen für den Browser bzw. die App erlauben. Alternativ die Nummer unter dem Barcode eintippen. |

## Später: Updates der Datenbank

Wenn du die Datenbank **schon einmal** eingerichtet hast und eine neue Version der App kommt, musst du nur die **neuen**
Dateien aus `supabase/migrations/` im SQL Editor ausführen (die Dateinamen sind nach Datum sortiert). Aktuell sind das:

- `20261110000005_kitchen.sql` – Heißluftfritteuse und Lieblingsrezepte
- `20261110000006_diet.sql` – Ernährungsweise (alles, vegetarisch, vegan)
- `20261111000007_recipe_variants.sql` – Eigene Rezepte und abgewandelte Varianten
- `20261111000008_units_basics.sql` – Erfassen in Esslöffeln und Teelöffeln
- `20261111000009_avoid.sql` – Unverträglichkeiten und Allergien im Profil
- `20261111000010_target_weight.sql` – Optionales Zielgewicht
- `20261113000011_household.sql` – Gemeinsamer Haushalt (geteilter Wochenplan und geteilte Einkaufsliste)

Wer noch gar nichts eingerichtet hat, nimmt wie oben einfach die komplette `supabase/setup.sql` – sie enthält alles.

## Optional: Ausprobieren ohne Konto

Wenn du die App jemandem zeigen willst, ohne Konto: In Vercel die Variable `VITE_ENABLE_DEMO` mit dem Wert `true`
anlegen und neu deployen. Dann erscheint auf der Anmeldeseite **„Ohne Konto ausprobieren“** (Daten bleiben nur auf dem
Gerät).
