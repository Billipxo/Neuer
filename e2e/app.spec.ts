import { expect, test } from '@playwright/test'
import { closeBadges, confirmDelete, enterApp, expectSignedOut, onboard, startDemo, withAccount } from './helpers'

test('Onboarding mit Kalorienvorschlag', async ({ page }) => {
  await enterApp(page)
  await expect(page.getByText(/Ein Spitzname reicht/)).toBeVisible()
  await page.getByLabel('Wie dürfen wir dich nennen?').fill('Sam')
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('radio', { name: 'Männlich' }).click()
  await page.getByLabel('Alter').fill('30')
  await page.getByLabel('Größe').fill('180')
  await page.getByLabel('Gewicht').fill('80')
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('radio', { name: 'Abnehmen' }).click()
  await expect(page.getByText('Vorschlag: 1.950 kcal')).toBeVisible()
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('button', { name: 'Los geht’s' }).click()

  // Danach einmal eine kurze Einführung: blättern, zurück, am Ende „Los geht’s“
  const tour = page.getByRole('dialog', { name: 'Kurz erklärt' })
  await expect(tour.getByRole('heading', { name: 'Schön, dass du da bist, Sam!' })).toBeVisible()
  await expect(tour.getByText('1 von 5')).toBeVisible()
  await tour.getByRole('button', { name: 'Weiter' }).click()
  await expect(tour.getByRole('heading', { name: 'Essen eintragen' })).toBeVisible()
  await tour.getByRole('button', { name: 'Zurück' }).click()
  await expect(tour.getByText('1 von 5')).toBeVisible()
  for (let i = 0; i < 4; i++) await tour.getByRole('button', { name: 'Weiter' }).click()
  await expect(tour.getByRole('heading', { name: 'Verlauf, Sport und Erfolge' })).toBeVisible()
  await tour.getByRole('button', { name: 'Los geht’s' }).click()
  await expect(tour).toHaveCount(0)
  await expect(page.getByRole('img', { name: /0 von 1\.950 kcal gegessen/ })).toBeVisible()

  // Nur einmal von selbst – im Profil lässt sie sich wieder öffnen
  await page.reload()
  await expect(page.getByRole('img', { name: /0 von 1\.950 kcal gegessen/ })).toBeVisible()
  await expect(tour).toHaveCount(0)
  await page.getByRole('link', { name: 'Profil und Einstellungen' }).click()
  await page.getByRole('button', { name: 'Einführung noch einmal ansehen' }).click()
  await expect(tour.getByText('1 von 5')).toBeVisible()
  await tour.getByRole('button', { name: 'Überspringen' }).click()
  await expect(tour).toHaveCount(0)
})

test('Eigenes Lebensmittel erfassen, mehrere hinzufügen und bearbeiten', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Frühstück: Lebensmittel hinzufügen' }).click()
  await page.getByRole('button', { name: 'Eigenes Lebensmittel anlegen' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Haferflocken')
  await page.getByLabel('Portionsgröße').fill('40')
  await page.getByLabel('Kalorien pro 100 g').fill('370')
  await page.getByLabel('Eiweiß pro 100 g').fill('13,5')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await page.getByRole('button', { name: /Zu Frühstück hinzufügen/ }).click()
  // zweites Lebensmittel in derselben Sitzung
  await page.getByRole('button', { name: 'Eigene', exact: true }).click()
  await page.getByRole('button', { name: /Haferflocken/ }).click()
  await page.getByRole('button', { name: /Zu Frühstück hinzufügen/ }).click()
  await expect(page.getByText('2 Einträge · 296 kcal')).toBeVisible()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await expect(page.getByRole('img', { name: /296 von 2\.000 kcal/ })).toBeVisible()
  // Menge ändern
  await page.getByRole('button', { name: /Haferflocken/ }).first().click()
  await page.getByLabel('Menge').fill('2')
  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(page.getByRole('img', { name: /444 von 2\.000 kcal/ })).toBeVisible()
})

test('Wasser per Trink-Hinweis hinzufügen', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('button', { name: /Ein Glas Wasser/ }).click()
  await page.getByRole('button', { name: /Ein Glas Wasser/ }).click()
  await expect(page.getByText('500 / 2.000 ml')).toBeVisible()
})

test('Rezept eintragen und Zutaten auf die Einkaufsliste', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte/linsen-bolognese')
  const kcalText = await page.getByText(/\d+ kcal pro Portion/).first().textContent()
  const kcal = kcalText!.match(/(\d+) kcal/)![1]
  await page.getByRole('button', { name: 'Einkaufsliste' }).click()
  await page.getByRole('button', { name: 'Zum Tagesplan' }).click()
  await page.getByRole('button', { name: 'Als gegessen eintragen' }).click()
  await closeBadges(page)
  await page.goto('/einkauf')
  await expect(page.getByText('Vollkornspaghetti')).toBeVisible()
  await expect(page.getByText('320 g')).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('img', { name: new RegExp(`${kcal} von 2\\.000 kcal`) })).toBeVisible()
})

test('Woche vorschlagen und Einkaufsliste erzeugen', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Planer' }).click()
  await page.getByRole('button', { name: 'Woche vorschlagen' }).click()
  await expect(page.getByText('7/7')).toBeVisible()
  await closeBadges(page)
  await page.getByRole('button', { name: 'Einkaufsliste', exact: true }).click()
  await expect(page).toHaveURL(/\/einkauf/)
  await expect(page.getByRole('heading', { name: 'Obst & Gemüse' })).toBeVisible()
  await page.getByLabel('Artikel hinzufügen').fill('2 l Milch')
  await page.keyboard.press('Enter')
  await expect(page.getByText('2 l')).toBeVisible()
  // Mehrere auf einmal – Dezimalkomma bleibt eine Zahl
  await page.getByLabel('Artikel hinzufügen').fill('Spülmittel, 6 Kerzen; 1,5 l Apfelschorle')
  await page.keyboard.press('Enter')
  await expect(page.getByText('3 Artikel hinzugefügt')).toBeVisible()
  await expect(page.getByLabel('Artikel hinzufügen')).toHaveValue('')
  const other = page.getByRole('region', { name: 'Sonstiges' })
  await expect(other.getByText('Spülmittel')).toBeVisible()
  await expect(other.getByText('Kerzen')).toBeVisible()
  await expect(page.getByText('Apfelschorle')).toBeVisible()
  await expect(page.getByText('1,5 l')).toBeVisible()
  // Eine kopierte Liste (eine Zeile je Artikel) wird beim Einfügen zu einer Zeile
  const input = page.getByLabel('Artikel hinzufügen')
  await input.evaluate((el, text) => {
    const data = new DataTransfer()
    data.setData('text/plain', text)
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  }, '- Alufolie\n- Servietten\n')
  await expect(input).toHaveValue('Alufolie, Servietten')
  await page.keyboard.press('Enter')
  await expect(page.getByText('2 Artikel hinzugefügt')).toBeVisible()
  await expect(other.getByText('Servietten')).toBeVisible()
})

test('Tagesseite: Geplantes mit einem Tipp eintragen und rückgängig machen', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Planer' }).click()
  await page.getByRole('button', { name: 'Woche vorschlagen' }).click()
  await expect(page.getByText('7/7')).toBeVisible()
  await closeBadges(page)
  await page.getByRole('link', { name: 'Heute' }).click()
  const plannedButton = page.getByRole('button', { name: / als gegessen eintragen$/ }).first()
  await expect(plannedButton).toBeVisible()
  const title = (await plannedButton.getAttribute('aria-label'))!.replace(/ als gegessen eintragen$/, '')
  await plannedButton.click()
  await expect(page.getByText(`${title} eingetragen`)).toBeVisible()
  // Jetzt ein Eintrag, nicht mehr „geplant“
  await expect(page.getByRole('button', { name: `${title} als gegessen eintragen` })).toHaveCount(0)
  await expect(page.getByRole('img', { name: /^[1-9][\d.]* von 2\.000 kcal/ })).toBeVisible()
  await closeBadges(page)
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByRole('button', { name: `${title} als gegessen eintragen` })).toBeVisible()
  await expect(page.getByRole('img', { name: /^0 von 2\.000 kcal/ })).toBeVisible()
})

test('Mahlzeit vom Vortag übernehmen', async ({ page }) => {
  await startDemo(page)
  // gestern etwas eintragen
  await page.getByRole('button', { name: 'Vorheriger Tag' }).click()
  await page.getByRole('link', { name: 'Mittagessen: Lebensmittel hinzufügen' }).click()
  await page.getByRole('button', { name: 'Eigenes Lebensmittel anlegen' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Linsensalat')
  await page.getByLabel('Kalorien pro 100 g').fill('150')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await page.getByRole('button', { name: /Zu Mittagessen hinzufügen/ }).click()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await page.getByRole('button', { name: 'Nächster Tag' }).click()
  await page.getByRole('button', { name: /Wie am Vortag \(150 kcal\)/ }).click()
  await expect(page.getByRole('img', { name: /150 von 2\.000 kcal/ })).toBeVisible()
})

test('Verlauf und Profil sind erreichbar, Konto löschen setzt zurück', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Verlauf' }).click()
  await expect(page.getByRole('heading', { name: 'Verlauf' })).toBeVisible()
  // Datum immer deutsch (TT.MM.JJJJ) – unabhängig von der Sprache des Browsers
  await page.getByRole('radio', { name: 'Tag' }).click()
  await expect(page.getByText(/^\d{2}\.\d{2}\.\d{4}$/)).toBeVisible()
  await page.getByRole('link', { name: 'Heute' }).click()
  await page.getByRole('link', { name: 'Profil und Einstellungen' }).click()
  await expect(page.getByText(/^\d+ von \d+ Abzeichen$/)).toBeVisible()
  // Körperdaten übersprungen: Das Profil sagt, was fehlt – nichts wird still mit Standardwerten gerechnet
  await expect(page.getByText(/Noch leer: Angabe für die Formel, Alter, Größe, Gewicht/)).toBeVisible()
  // Erfolge-Seite mit Serien und allen Abzeichen nach Bereichen
  await page.getByRole('link', { name: /Alle Erfolge und Serien/ }).click()
  await expect(page.getByRole('heading', { name: 'Erfolge' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Deine Serien' }).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('list', { name: 'Abzeichen: Sport & Training' })).toBeVisible()
  await page.goBack()
  await page.getByRole('button', { name: 'Konto löschen' }).click()
  await page.getByLabel(/LÖSCHEN/).fill('LÖSCHEN')
  await page.getByRole('button', { name: 'Endgültig löschen' }).click()
  await expectSignedOut(page)
})

test('Offline-Hinweis erscheint ohne Verbindung', async ({ page, context }) => {
  await startDemo(page)
  await context.setOffline(true)
  // Mit Konto werden Einträge vorgemerkt und später übertragen, im Demo-Modus liegen sie ohnehin auf dem Gerät
  await expect(page.getByText(withAccount() ? /Offline – Einträge werden gespeichert und später übertragen/ : /Offline – du kannst die App weiter nutzen/)).toBeVisible()
  await page.getByRole('button', { name: /Ein Glas Wasser/ }).click()
  await expect(page.getByText('250 / 2.000 ml')).toBeVisible()
  if (withAccount()) await expect(page.getByText(/1 ausstehend/)).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText(/Offline/)).toBeHidden()
  if (withAccount()) {
    // Der vorgemerkte Eintrag ist im Konto angekommen: auch nach dem Neuladen noch da
    await expect(page.getByText(/ausstehend|Synchronisiere/)).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('250 / 2.000 ml')).toBeVisible()
  }
})

test('Rezept-Galerie: Heißluftfritteuse, Favoriten und Zubereitungsart', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Kochbuch', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Aus der Heißluftfritteuse/ })).toBeVisible()
  await page.getByRole('button', { name: 'Süßkartoffel-Pommes mit Kräuterquark als Favorit merken' }).click()
  await expect(page.getByRole('button', { name: 'Süßkartoffel-Pommes mit Kräuterquark aus Favoriten entfernen' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /^Favoriten$/ }).click()
  await expect(page.getByText('1 Treffer')).toBeVisible()
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click()
  await page.getByRole('button', { name: /^Heißluftfritteuse$/ }).first().click()
  await expect(page.getByText(/^\d+ Treffer$/)).toBeVisible()
  // Backofen-Rezept mit Variante: Heißluftfritteuse ist voreingestellt, Backofen umschaltbar
  await page.goto('/rezepte/ofenlachs-kartoffeln')
  await expect(page.getByRole('radio', { name: 'Heißluftfritteuse' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(/bei 200 °C ca\. 15 Minuten garen/)).toBeVisible()
  await page.getByRole('radio', { name: 'Backofen' }).click()
  await expect(page.getByText(/Ofen auf 200 °C Umluft vorheizen/)).toBeVisible()
  // Favorit bleibt nach dem Neuladen erhalten
  await page.goto('/rezepte')
  await expect(page.getByRole('heading', { name: 'Deine Favoriten' })).toBeVisible()
})

test('Kochmodus: Zutaten abhaken, Schritte durchgehen und Timer starten', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte/koenigsberger-klopse')
  await page.getByRole('link', { name: /Kochmodus starten/ }).click()
  await expect(page.getByRole('heading', { name: 'Zutaten bereitlegen' })).toBeVisible()
  await page.getByText('Rinderhack (mager)').click()
  await page.getByRole('button', { name: /Los geht/ }).click()
  await expect(page.getByText('Schritt 1 von 5')).toBeVisible()
  await page.getByRole('button', { name: /20 Min\. Timer/ }).click()
  // Timer läuft und bleibt beim Seitenwechsel sichtbar
  await expect(page.getByRole('status').filter({ hasText: 'Schritt 1 · 20 Min.' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText('Schritt 2 von 5')).toBeVisible()
  await page.getByRole('button', { name: 'Kochmodus beenden' }).click()
  await expect(page).toHaveURL(/\/rezepte\/koenigsberger-klopse$/)
  await expect(page.getByRole('status').filter({ hasText: 'Schritt 1 · 20 Min.' })).toBeVisible()
  await page.getByRole('button', { name: /Timer abbrechen/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Schritt 1 · 20 Min.' })).toBeHidden()
})

test('Kochwissen: Übersicht, Anleitung und Verknüpfung mit Rezepten', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Kochbuch', exact: true }).click()
  await page.getByRole('link', { name: /Kochwissen/ }).click()
  await expect(page.getByRole('heading', { name: 'Kochwissen' })).toBeVisible()
  await page.getByRole('link', { name: /Reis perfekt kochen/ }).click()
  await expect(page.getByRole('heading', { name: 'Reis perfekt kochen' })).toBeVisible()
  await expect(page.getByText('Basmati, Jasmin')).toBeVisible()
  // Rezept → passendes Kochwissen
  await page.goto('/rezepte/haehnchen-curry-joghurt')
  await page.getByRole('link', { name: /Fleisch & Fisch sicher garen/ }).click()
  await expect(page.getByRole('heading', { name: 'Fleisch & Fisch sicher garen' })).toBeVisible()
  await expect(page.getByText('Kerntemperaturen').first()).toBeVisible()
  // Saisonkalender zeigt den aktuellen Monat
  await page.goto('/rezepte/wissen/saisonkalender')
  await expect(page.getByText(/Jetzt im \w+: \d+ Sorten mit Saison/)).toBeVisible()
})

test('Was habe ich da? findet Rezepte und setzt Fehlendes auf die Einkaufsliste', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Kochbuch', exact: true }).click()
  await page.getByRole('link', { name: /Was habe ich da/ }).click()
  for (const z of ['Eier', 'Spinat']) {
    await page.getByLabel('Zutat suchen').fill(z)
    await page.getByRole('button', { name: new RegExp(`^\\s*${z}$`) }).first().click()
  }
  await expect(page.getByRole('button', { name: 'Eier entfernen' })).toBeVisible()
  const omelett = page.getByRole('listitem').filter({ hasText: 'Spinat-Feta-Omelett' })
  await expect(omelett).toContainText('Fehlt: Feta')
  await omelett.getByRole('button', { name: /Einkaufsliste/ }).click()
  await expect(page.getByText(/Zutaten auf der Einkaufsliste/)).toBeVisible()
  await page.goto('/einkauf')
  await expect(page.getByText('Feta')).toBeVisible()
  // Auswahl bleibt gespeichert
  await page.goto('/rezepte/zutaten')
  await expect(page.getByRole('button', { name: 'Spinat entfernen' })).toBeVisible()
})

test('Rezept abwandeln: Mengen ändern, Zutat tauschen, Nährwerte neu berechnet, Variante eintragen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte/spaghetti-bolognese')
  // Auch oben über den Stift erreichbar – als eigene Version, das Original bleibt
  await page.getByRole('link', { name: 'Rezept ändern (als eigene Version)' }).click()
  await expect(page.getByRole('heading', { name: 'Rezept abwandeln' })).toBeVisible()
  await page.goBack()
  await page.getByRole('link', { name: /Rezept abwandeln/ }).click()
  await expect(page.getByRole('heading', { name: 'Rezept abwandeln' })).toBeVisible()
  await expect(page.getByText(/wie das Original/)).toBeVisible()
  // Hack halbieren → weniger kcal als das Original
  await page.getByLabel('Menge Rinderhack (mager)').fill('200')
  await expect(page.getByText(/gegenüber dem Original: −\d+ kcal/)).toBeVisible()
  // Vorschlag „Leichter oder vollwertiger“ annehmen: Hack → Linsen (Menge wird umgerechnet)
  await page.getByRole('listitem').filter({ hasText: 'Rinderhack (mager) → Tellerlinsen' }).getByRole('button', { name: 'Tauschen' }).click()
  await expect(page.getByLabel('Menge Tellerlinsen')).toHaveValue('80')
  await expect(page.getByText('Vegetarisch', { exact: true })).toBeVisible()
  // Zutat tauschen: Spaghetti → Penne (Menge bleibt)
  await page.getByRole('button', { name: 'Vollkornspaghetti ersetzen' }).click()
  await page.getByLabel('Zutat suchen').fill('Penne')
  await page.getByRole('button', { name: /Vollkorn-Penne/ }).click()
  await expect(page.getByRole('button', { name: 'Vollkorn-Penne ersetzen' })).toBeVisible()
  await expect(page.getByLabel('Menge Vollkorn-Penne')).toHaveValue('320')
  // Eigene Zutat mit Nährwerten von der Packung
  await page.getByRole('button', { name: 'Zutat hinzufügen' }).click()
  await page.getByRole('button', { name: 'Eigene Zutat' }).click()
  await page.getByLabel('Name').fill('Schmand')
  await page.getByLabel('Kalorien').fill('240')
  await page.getByLabel('Fett').fill('24')
  await page.getByRole('radio', { name: 'Milch/Ei' }).click()
  await page.getByRole('button', { name: 'Zutat übernehmen' }).click()
  await expect(page.getByRole('button', { name: 'Schmand ersetzen' })).toBeVisible()
  await page.getByLabel('Titel').fill('Bolognese light')
  await page.getByLabel('Notiz').fill('Weniger Hack, dafür Penne.')
  await page.getByRole('button', { name: 'Variante speichern' }).click()
  // Variante hat eine eigene Seite mit Vergleich zum Original
  await expect(page.getByRole('heading', { name: 'Bolognese light' })).toBeVisible()
  await closeBadges(page)
  await expect(page.getByText(/Deine Variante von/)).toBeVisible()
  await expect(page.getByText(/Gegenüber dem Original pro Portion: −\d+ kcal/)).toBeVisible()
  await expect(page.getByText('Weniger Hack, dafür Penne.')).toBeVisible()
  await expect(page.getByText('Schmand')).toBeVisible()
  // Eintragen wie jedes andere Rezept
  await page.getByRole('button', { name: 'Zum Tagesplan' }).click()
  await page.getByRole('button', { name: 'Als gegessen eintragen' }).click()
  await closeBadges(page)
  await page.goto('/')
  await closeBadges(page)
  await expect(page.getByText('Bolognese light')).toBeVisible()
  // Im Kochbuch und beim Original sichtbar
  await page.goto('/rezepte')
  await expect(page.getByRole('heading', { name: 'Deine Rezepte & Varianten' })).toBeVisible()
  await page.goto('/rezepte/spaghetti-bolognese')
  await expect(page.getByRole('heading', { name: 'Deine Varianten' })).toBeVisible()
})

test('Eigenes Rezept anlegen und im Kochmodus kochen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte')
  await page.getByRole('link', { name: /Eigenes Rezept anlegen/ }).click()
  await expect(page.getByRole('heading', { name: 'Eigenes Rezept' })).toBeVisible()
  await page.getByLabel('Titel').fill('Mein Rührei')
  await page.getByRole('button', { name: 'Zutat hinzufügen' }).click()
  await page.getByLabel('Zutat suchen').fill('Eier')
  await page.getByRole('button', { name: /^Eier/ }).first().click()
  await page.getByLabel('Menge Eier').fill('3')
  await page.getByRole('button', { name: 'Schritt hinzufügen' }).click()
  await page.getByRole('textbox', { name: 'Schritt 1' }).fill('Eier verquirlen und 3 Minuten in der Pfanne stocken lassen.')
  await expect(page.getByText(/\d+ kcal · .* pro Portion/)).toBeVisible()
  await page.getByRole('button', { name: 'Rezept speichern' }).click()
  await expect(page.getByRole('heading', { name: 'Mein Rührei' })).toBeVisible()
  await closeBadges(page)
  await expect(page.getByText('Dein eigenes Rezept')).toBeVisible()
  await page.getByRole('link', { name: /Kochmodus starten/ }).click()
  await expect(page.getByRole('heading', { name: 'Zutaten bereitlegen' })).toBeVisible()
  await page.getByRole('button', { name: /Los geht/ }).click()
  await expect(page.getByText('Schritt 1 von 1')).toBeVisible()
  await expect(page.getByRole('button', { name: /3 Min\. Timer/ })).toBeVisible()
})

test('Rezept aus Text übernehmen: Zutatenliste und Zubereitung einfügen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte')
  await page.getByRole('link', { name: /Eigenes Rezept anlegen/ }).click()
  await page.getByLabel('Titel').fill('Tomatensoße von Oma')
  await page.getByRole('button', { name: 'Aus Text einfügen' }).click()
  const ingredients = page.getByRole('dialog', { name: 'Zutaten aus Text' })
  await ingredients
    .getByLabel('Zutatenliste')
    .fill('Zutaten:\n- 2 EL Olivenöl\n- 1 Zwiebel, fein gewürfelt\n- 2 Knoblauchzehen\n- 800 g passierte Tomaten\n- 1 Prise Zucker\n- 1 Becher Schmand')
  await expect(ingredients.getByRole('list', { name: 'Erkannte Zutaten' }).getByRole('listitem')).toHaveCount(5)
  await expect(ingredients).toContainText('Nicht erkannt: „1 Becher Schmand“')
  await ingredients.getByRole('button', { name: '5 Zutaten übernehmen' }).click()
  await expect(page.getByLabel('Menge passierte Tomaten')).toHaveValue('800')
  await expect(page.getByLabel('Menge Zwiebel')).toHaveValue('1')

  await page.getByRole('button', { name: 'Schritte aus Text' }).click()
  const steps = page.getByRole('dialog', { name: 'Zubereitung aus Text' })
  await steps
    .getByLabel('Zubereitung')
    .fill('1. Zwiebel und Knoblauch in Öl glasig dünsten.\n2. Tomaten und Zucker zugeben\nund 20 Minuten köcheln lassen.')
  await steps.getByRole('button', { name: '2 Schritte übernehmen' }).click()
  await expect(page.getByRole('textbox', { name: 'Schritt 2' })).toHaveValue('Tomaten und Zucker zugeben und 20 Minuten köcheln lassen.')
  await expect(page.getByText(/\d+ kcal · .* pro Portion/)).toBeVisible()
  await page.getByRole('button', { name: 'Rezept speichern' }).click()
  await expect(page.getByRole('heading', { name: 'Tomatensoße von Oma' })).toBeVisible()
})

test('Barcode scannen füllt die Nährwerte einer eigenen Zutat automatisch aus', async ({ page }) => {
  // Open Food Facts wird simuliert – der Scanner nutzt die manuelle Eingabe, da es keine Kamera gibt
  await page.route('**/world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          code: '4000417025005',
          product_name_de: 'Testjoghurt',
          brands: 'Molkerei',
          nutriments: { 'energy-kcal_100g': 72, energy_100g: 301, proteins_100g: 4.5, carbohydrates_100g: 6, fat_100g: 3.2 },
        },
      },
    }),
  )
  await startDemo(page)
  await page.goto('/rezepte/neu')
  await page.getByRole('button', { name: 'Zutat hinzufügen' }).click()
  await page.getByRole('button', { name: 'Barcode scannen' }).click()
  await page.getByLabel('Barcode manuell eingeben').fill('4000417025005')
  await page.getByRole('button', { name: 'Suchen' }).click()
  await expect(page.getByRole('heading', { name: 'Eigene Zutat' })).toBeVisible()
  await expect(page.getByLabel('Name')).toHaveValue('Testjoghurt (Molkerei)')
  await expect(page.getByLabel('Kalorien')).toHaveValue('72')
  await expect(page.getByLabel('Eiweiß')).toHaveValue('4,5')
  await page.getByRole('radio', { name: 'Milch/Ei' }).click()
  await page.getByRole('button', { name: 'Zutat übernehmen' }).click()
  await expect(page.getByRole('button', { name: 'Testjoghurt (Molkerei) ersetzen' })).toBeVisible()
  await expect(page.getByText('72 kcal · eigene Zutat')).toBeVisible()
})

test('Grundnahrungsmittel sofort eintragen: 1 Stück Apfel und 1 EL Olivenöl', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=breakfast')
  await page.getByLabel('Lebensmittel suchen').fill('Apfel')
  await page.getByRole('list', { name: 'Lebensmittel und Gerichte' }).getByRole('button', { name: /^Apfel 1 Stück/ }).click()
  await expect(page.getByRole('radio', { name: 'Stück', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click()
  await page.getByLabel('Lebensmittel suchen').fill('Olivenöl')
  await page.getByRole('list', { name: 'Lebensmittel und Gerichte' }).getByRole('button', { name: /^Olivenöl/ }).click()
  await expect(page.getByRole('radio', { name: 'EL', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click()
  await expect(page.getByText(/2 Einträge · 171 kcal/)).toBeVisible()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await expect(page.getByText('Apfel', { exact: true })).toBeVisible()
  await expect(page.getByText(/1 EL/).first()).toBeVisible()
  // Beim zweiten Mal liegt der Apfel schon in der eigenen Bibliothek
  await page.goto('/hinzufuegen?meal=lunch')
  await page.getByRole('button', { name: 'Eigene', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Apfel/ })).toBeVisible()
})

test('Unverträglichkeiten: Rezepte mit Nüssen werden gekennzeichnet und aus Vorschlägen gelassen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte/erdnuss-nudeln-tofu')
  await expect(page.getByText(/Enthält: .*Nüsse/)).toBeVisible()
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Nüsse/Erdnüsse' }).click()
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByText('Einstellungen gespeichert')).toBeVisible()
  await page.goto('/rezepte/erdnuss-nudeln-tofu')
  await expect(page.getByText(/Nüsse\/Erdnüsse steht auf deiner Liste/)).toBeVisible()
  await page.goto('/rezepte')
  await expect(page.getByRole('button', { name: 'Für mich passend' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('Rezepte durchsuchen').fill('Erdnuss')
  await expect(page.getByText('0 Treffer')).toBeVisible()
  await page.getByRole('button', { name: 'Für mich passend' }).click()
  await expect(page.getByText(/^[1-9]\d* Treffer$/)).toBeVisible()
})

test('Zielgewicht, Gewichtstrend und Wochenrückblick im Verlauf', async ({ page }) => {
  await startDemo(page)
  await page.goto('/profil')
  await page.getByLabel('Gewicht', { exact: true }).fill('82')
  await page.getByLabel('Zielgewicht (optional)').fill('78')
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByText('Einstellungen gespeichert')).toBeVisible()
  await page.goto('/verlauf?ansicht=week')
  await expect(page.getByRole('heading', { name: 'Wochenrückblick' })).toBeVisible()
  await expect(page.getByText(/noch nichts protokolliert/)).toBeVisible()
  await page.getByRole('button', { name: 'Gewicht eintragen' }).click()
  await page.getByLabel(/Gewicht am/).fill('82')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('heading', { name: 'Gewicht & Ziel' })).toBeVisible()
  await expect(page.getByText(/Noch 4 kg bis 78 kg/)).toBeVisible()
  await expect(page.getByText('Noch kein Trend')).toBeVisible()
  // Heute-Seite verweist auf die Woche, sobald etwas protokolliert ist
  await page.goto('/')
  await page.getByRole('button', { name: /Ein Glas Wasser/ }).click()
  await expect(page.getByRole('link', { name: /Diese Woche/ })).toHaveCount(0)
})

test('Über Teller mit Datenschutz und Impressum-Hinweis, ähnliche Rezepte', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Datenschutz/ }).click()
  await expect(page.getByRole('heading', { name: 'Über Teller' })).toBeVisible()
  await expect(page.getByText(/Open Food Facts/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()
  await startDemo(page)
  await page.goto('/profil')
  await page.getByRole('link', { name: /Über Teller/ }).click()
  await expect(page.getByRole('heading', { name: 'Über Teller' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Impressum' })).toBeVisible()
  await expect(page.getByText(/Noch nicht hinterlegt/)).toBeVisible()
  await page.goto('/rezepte/spaghetti-bolognese')
  await expect(page.getByRole('heading', { name: 'Ähnliche Rezepte' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Lasagne Bolognese/ })).toBeVisible()
})

test('Schnell-Eintrag, Löschen mit Rückgängig und Mahlzeit als Gericht speichern', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=lunch')
  // Schnell-Eintrag: nur Kalorien
  await page.getByRole('button', { name: 'Schnell-Eintrag: nur Kalorien' }).click()
  await page.getByLabel('Kalorien', { exact: true }).fill('650')
  await page.getByLabel('Was war es? (optional)').fill('Döner beim Imbiss')
  await page.getByRole('button', { name: 'Zu Mittagessen hinzufügen' }).click()
  // zweiter Eintrag aus den Grundnahrungsmitteln
  await page.getByLabel('Lebensmittel suchen').fill('Apfel')
  await page.getByRole('list', { name: 'Lebensmittel und Gerichte' }).getByRole('button', { name: /^Apfel 1 Stück/ }).click()
  await page.getByRole('button', { name: 'Zu Mittagessen hinzufügen' }).click()
  await expect(page.getByText(/2 Einträge · 731 kcal/)).toBeVisible()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await expect(page.getByRole('img', { name: /731 von 2\.000 kcal/ })).toBeVisible()
  // Löschen braucht eine Bestätigung – ein einzelner Tipp löscht noch nichts – und lässt sich rückgängig machen
  await page.getByRole('button', { name: /Döner beim Imbiss/ }).click()
  await page.getByRole('button', { name: 'Löschen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Wirklich löschen?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Löschen', exact: true })).toBeVisible({ timeout: 6000 })
  await expect(page.getByRole('img', { name: /731 von 2\.000 kcal/ })).toBeVisible()
  await confirmDelete(page)
  await expect(page.getByRole('img', { name: /81 von 2\.000 kcal/ })).toBeVisible()
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByRole('img', { name: /731 von 2\.000 kcal/ })).toBeVisible()
  await expect(page.getByText('Wiederhergestellt')).toBeVisible()
  // Mahlzeit als Gericht speichern und wiederverwenden
  await page.getByRole('button', { name: 'Als Gericht speichern' }).click()
  await expect(page.getByLabel('Name des Gerichts')).toHaveValue('Mein Mittagessen')
  await page.getByLabel('Name des Gerichts').fill('Döner-Mittag')
  await page.getByRole('button', { name: 'Gericht speichern', exact: true }).click()
  await expect(page.getByText(/Gericht gespeichert/)).toBeVisible()
  await page.goto('/hinzufuegen?meal=dinner')
  await page.getByRole('button', { name: 'Gerichte', exact: true }).click()
  await page.getByRole('button', { name: /Döner-Mittag/ }).click()
  await page.getByRole('button', { name: 'Zu Abendessen hinzufügen' }).click()
  await expect(page.getByText(/1 Eintrag · 731 kcal/)).toBeVisible()
  // Im Editor steht der Schnell-Eintrag als Portion, der Apfel in Gramm
  await page.goto('/hinzufuegen?meal=dinner')
  await page.getByRole('button', { name: 'Gerichte', exact: true }).click()
  await page.getByRole('button', { name: /Döner-Mittag/ }).click()
  await page.getByRole('link', { name: 'Bearbeiten' }).click()
  await expect(page.getByLabel('Menge Döner beim Imbiss')).toHaveValue('1')
  await expect(page.getByLabel('Menge Apfel')).toHaveValue('150')

  // Auch die Texteingabe kennt eigene Gerichte – in Portionen, zusammen mit Größen wie „große Cola“
  await page.goto('/hinzufuegen?meal=snack')
  await page.getByLabel('Lebensmittel suchen').fill('Döner-Mittag und eine große Cola')
  const card = page.getByRole('region', { name: 'Erkannt für Snacks' })
  const items = card.getByRole('list', { name: 'Erkannte Einträge' }).getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Döner-Mittag')
  await expect(items.nth(0)).toContainText('1 Portion')
  await expect(items.nth(1)).toContainText('1 Dose, groß · 495 ml')
  await card.getByRole('button', { name: /^Döner-Mittag, 1 Portion/ }).click()
  const portions = page.getByRole('dialog', { name: 'Döner-Mittag' })
  await portions.getByLabel('Portionen').fill('2')
  await portions.getByRole('button', { name: 'Menge übernehmen' }).click()
  await expect(items.nth(0)).toContainText('2 Portionen')
  // 2 × 731 + 208 kcal
  await card.getByRole('button', { name: 'Alle 2 hinzufügen · 1.670 kcal' }).click()
  await expect(page.getByText(/^2 Einträge · 1\.670 kcal$/)).toBeVisible()
})

test('Einkaufsliste: Artikel löschen und Liste leeren lassen sich rückgängig machen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/einkauf')
  for (const item of ['Kaffee', '2 l Milch']) {
    await page.getByLabel('Artikel hinzufügen').fill(item)
    await page.keyboard.press('Enter')
  }
  await expect(page.getByText('Kaffee')).toBeVisible()
  await page.getByRole('button', { name: 'Kaffee löschen' }).click()
  await expect(page.getByText('Kaffee', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByText('Kaffee', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Liste leeren' }).click()
  await page.getByRole('button', { name: /Alles entfernen/ }).click()
  await expect(page.getByText('Milch', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByText('Milch', { exact: true })).toBeVisible()
  await expect(page.getByText('Kaffee', { exact: true })).toBeVisible()
})

test('App-Verknüpfungen: Manifest nennt Direktlinks, die Scanner und passende Mahlzeit öffnen', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  const urls = manifest.shortcuts.map((s: { url: string }) => s.url)
  expect(urls).toEqual(['/hinzufuegen', '/hinzufuegen?scan=1', '/einkauf', '/planer'])
  for (const s of manifest.shortcuts) expect((await request.get(`/${s.icons[0].src}`)).ok()).toBe(true)
  await startDemo(page)
  await page.goto('/hinzufuegen?scan=1')
  await expect(page.getByRole('dialog', { name: 'Barcode scannen' })).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()
  // Ohne Vorgabe ist genau eine Mahlzeit vorausgewählt (je nach Uhrzeit)
  await page.goto('/hinzufuegen')
  await expect(page.getByRole('radiogroup', { name: 'Mahlzeit' }).getByRole('radio', { checked: true })).toHaveCount(1)
  await page.goto('/hinzufuegen?schnell=1')
  await expect(page.getByRole('dialog', { name: 'Schnell-Eintrag' })).toBeVisible()
})

test('Sicherung: exportieren, Konto löschen, wieder einspielen – nichts doppelt', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=breakfast')
  await page.getByLabel('Lebensmittel suchen').fill('Apfel')
  await page.getByRole('list', { name: 'Lebensmittel und Gerichte' }).getByRole('button', { name: /^Apfel 1 Stück/ }).click()
  await page.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await page.goto('/profil')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Alle Daten (JSON)' }).click()])
  const file = await download.path()
  // Alles löschen und neu anfangen
  await page.getByRole('button', { name: 'Konto löschen' }).click()
  await page.getByLabel(/LÖSCHEN/).fill('LÖSCHEN')
  await page.getByRole('button', { name: 'Endgültig löschen' }).click()
  await expectSignedOut(page)
  await onboard(page, '1800')
  await expect(page.getByRole('img', { name: /0 von 1\.800 kcal/ })).toBeVisible()
  // Sicherung einspielen – auf dem leeren Konto samt Einstellungen
  await page.goto('/profil')
  await page.getByLabel('Sicherungsdatei auswählen').setInputFiles(file)
  await expect(page.getByRole('heading', { name: 'Sicherung einspielen' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Inhalt der Sicherung' })).toContainText('Protokoll-Einträge')
  await expect(page.getByRole('switch', { name: 'Profil und Einstellungen übernehmen' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Einspielen', exact: true }).click()
  await expect(page.getByText(/Sicherung eingespielt/)).toBeVisible()
  await page.goto('/')
  await closeBadges(page)
  await expect(page.getByRole('img', { name: /81 von 2\.000 kcal/ })).toBeVisible()
  await expect(page.getByText('Apfel', { exact: true })).toBeVisible()
  // Zweites Einspielen legt nichts doppelt an
  await page.goto('/profil')
  await page.getByLabel('Sicherungsdatei auswählen').setInputFiles(file)
  await expect(page.getByText('Alles aus dieser Sicherung ist schon vorhanden.')).toBeVisible()
  await page.getByRole('button', { name: 'Schließen' }).click()
  // Keine Sicherung → verständliche Meldung
  await page.getByLabel('Sicherungsdatei auswählen').setInputFiles({ name: 'falsch.json', mimeType: 'application/json', buffer: Buffer.from('{"etwas":1}') })
  await expect(page.getByText('Das ist keine Teller-Sicherung.')).toBeVisible()
})

test('Wochenplan als Text teilen; gemeinsamer Haushalt braucht ein Konto', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await startDemo(page)
  await page.getByRole('link', { name: 'Planer' }).click()
  await page.getByRole('button', { name: 'Woche vorschlagen' }).click()
  await expect(page.getByText('7/7')).toBeVisible()
  await closeBadges(page)
  await page.getByRole('button', { name: 'Wochenplan teilen' }).click()
  await expect(page.getByText('Wochenplan in die Zwischenablage kopiert')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('🍽️ Wochenplan')
  expect(text).toMatch(/Montag, .*:\n• Frühstück: .+\n• Mittagessen: .+/)
  expect(text.split('\n').filter((l) => l.startsWith('• ')).length).toBeGreaterThanOrEqual(21)

  // Der Text endet mit einem Link: Damit lässt sich der Plan in der App mit einem Tipp übernehmen
  const link = text.match(/In Teller übernehmen:\n(\S+)$/)![1]
  expect(link.length).toBeLessThan(2000)
  await page.getByRole('button', { name: 'Woche leeren' }).click()
  await expect(page.getByText('0/7')).toBeVisible()
  await page.goto(new URL(link).pathname + new URL(link).search)
  await expect(page.getByRole('heading', { name: 'Geteilter Wochenplan' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Inhalt des geteilten Plans' })).toContainText('Frühstück:')
  await page.getByRole('button', { name: 'In meinen Plan übernehmen' }).click()
  await expect(page.getByText(/\d+ Mahlzeiten übernommen/)).toBeVisible()
  await expect(page.getByText('7/7')).toBeVisible()
  await expect(page).not.toHaveURL(/plan=/)
  // Ein kaputter Link wird freundlich abgelehnt
  await page.goto('/planer?plan=kaputt')
  await expect(page.getByText('Der Link enthält keinen gültigen Wochenplan')).toBeVisible()

  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Gemeinsamer Haushalt' })).toBeVisible()
  if (withAccount()) {
    await expect(page.getByRole('button', { name: 'Haushalt gründen' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mit Code beitreten' })).toBeVisible()
  } else {
    await expect(page.getByText(/Im Demo-Modus bleiben alle Daten auf diesem Gerät/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Haushalt gründen' })).toHaveCount(0)
  }
})

test('Einladungslink im Demo-Modus: Hinweis statt Beitritt, keine Umleitung bei jedem Start', async ({ page }) => {
  test.skip(withAccount(), 'Der Beitritt mit Konto wird in konto.spec.ts geprüft')
  await page.goto('/beitreten/a1b2c-3d4e5')
  await startDemo(page)
  // Im Demo-Modus geht es normal zur Tagesübersicht; die Einladung bleibt gemerkt
  await expect(page.getByRole('img', { name: /0 von 2\.000 kcal/ })).toBeVisible()
  await page.goto('/profil')
  await expect(page.getByRole('status').filter({ hasText: 'Du hast eine Einladung geöffnet (Code A1B2C-3D4E5)' })).toBeVisible()
})

test('Startet die App nicht, steht dort eine Meldung statt einer leeren Seite', async ({ page }) => {
  // Das Hauptpaket der App lässt sich nicht laden (z. B. Netzabbruch mitten im Laden)
  await page.route(/\/assets\/index-[^/]+\.js$/, (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Teller konnte nicht starten')
  await expect(page.getByRole('alert')).toContainText('Bitte die Seite neu laden')
})

test('Kochbuch: nach Zeit, Fleisch und Aufwand filtern, Zufallsvorschlag, Auswahl bleibt beim Zurückkehren', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Kochbuch', exact: true }).click()
  await page.getByRole('button', { name: 'Filtern und sortieren' }).click()
  const sheet = page.getByRole('dialog', { name: 'Filtern & sortieren' })
  await sheet.getByRole('button', { name: /^bis 30 Min\./ }).click()
  await sheet.getByRole('button', { name: /^Wenig Fleisch/ }).click()
  await expect(sheet.getByRole('button', { name: /^Wenig Fleisch/ })).toHaveAttribute('aria-pressed', 'true')
  const show = sheet.getByRole('button', { name: /^\d+ Rezepte? anzeigen$/ })
  const hits = Number((await show.textContent())!.match(/\d+/)![0])
  expect(hits).toBeGreaterThan(0)
  await show.click()
  await expect(page.getByRole('heading', { name: `${hits} Treffer` })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Filtern und sortieren, 2 aktiv' })).toBeVisible()

  // Unentschlossen: Vorschlag aus genau diesen Treffern
  await page.getByRole('button', { name: /Zufallsvorschlag/ }).click()
  const proposal = page.getByRole('dialog', { name: "Wie wär's damit?" })
  await expect(proposal).toContainText('Wenig Fleisch')
  await expect(proposal).toContainText(/fertig in ([1-9]|[12]\d|30) Min\./)
  const title = (await proposal.getByRole('heading', { level: 3 }).textContent())!
  await proposal.getByRole('button', { name: 'Rezept ansehen' }).click()
  await expect(page).toHaveURL(/\/rezepte\/[a-z0-9-]+$/)
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()

  // Zurück im Kochbuch: dieselbe Auswahl
  await page.goBack()
  await expect(page.getByRole('heading', { name: `${hits} Treffer` })).toBeVisible()
  await page.getByRole('button', { name: 'Fertig in 30 Min. entfernen' }).click()
  await expect(page.getByRole('button', { name: 'Fertig in 30 Min. entfernen' })).toHaveCount(0)
  const more = Number((await page.getByRole('heading', { name: /^\d+ Treffer$/ }).textContent())!.match(/\d+/)![0])
  expect(more).toBeGreaterThan(hits)

  // Mehrere Eigenschaften zugleich; was dann nichts mehr ergibt, ist nicht wählbar
  await page.getByRole('button', { name: /^Filtern und sortieren/ }).click()
  await sheet.getByRole('button', { name: /^Vegetarisch/ }).click()
  await expect(sheet.getByRole('button', { name: /^Wenig Fleisch/ })).toHaveAttribute('aria-pressed', 'false')
  await sheet.getByRole('button', { name: /^Vegan/ }).click()
  await sheet.getByRole('button', { name: /^Glutenfrei/ }).click()
  await expect(sheet.getByRole('button', { name: /^Viel Fleisch, 0 Rezepte$/ })).toBeDisabled()
  await sheet.getByLabel('Sortieren nach').selectOption({ label: 'Wenige Zutaten zuerst' })
  await sheet.getByRole('button', { name: /Rezepte? anzeigen$/ }).click()
  await expect(page.getByRole('group', { name: 'Aktive Filter' })).toContainText('Vegan')
  await expect(page.getByRole('group', { name: 'Aktive Filter' })).toContainText('Glutenfrei')
  await expect(page.getByRole('group', { name: 'Aktive Filter' })).toContainText('Wenige Zutaten zuerst')

  // Zurücksetzen im Dialog lässt Suche und Schnellfilter stehen
  await page.getByRole('button', { name: /^Filtern und sortieren/ }).click()
  await sheet.getByRole('button', { name: 'Zurücksetzen' }).click()
  await sheet.getByRole('button', { name: /Rezepte? anzeigen$/ }).click()
  await expect(page.getByRole('group', { name: 'Aktive Filter' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Filtern und sortieren' })).toBeVisible()

  // Ein neuer Aufruf über die Navigation beginnt ohne Filter
  await page.getByRole('button', { name: 'Filtern und sortieren' }).click()
  await sheet.getByRole('button', { name: /^bis 15 Min\./ }).click()
  await sheet.getByRole('button', { name: /Rezepte? anzeigen$/ }).click()
  await page.getByRole('link', { name: 'Heute' }).click()
  await page.getByRole('link', { name: 'Kochbuch', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Alle Rezepte' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Aktive Filter' })).toHaveCount(0)
  // … „Zurück“ dagegen landet wieder in der gefilterten Auswahl
  await page.goBack()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Fertig in 15 Min. entfernen' })).toBeVisible()
})

test('Werte automatisch: Alltägliches sofort finden, Vorschläge beim eigenen Lebensmittel und beim Schnell-Eintrag', async ({ page }) => {
  // Produktsuche fest vorgeben – unabhängig vom Netz
  await page.route('**/search.openfoodfacts.org/search**', (route) =>
    route.fulfill({
      json: {
        hits: [
          {
            code: '4000000000017',
            product_name: 'Steinofenpizza Margherita',
            brands: 'Testmarke',
            nutriments: { 'energy-kcal_100g': 230, proteins_100g: 9, carbohydrates_100g: 30, fat_100g: 8 },
          },
        ],
      },
    }),
  )
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=lunch')

  // Döner: sofort in der Liste, mit typischer Menge und den kcal dafür
  await page.getByLabel('Lebensmittel suchen').fill('Döner')
  await page
    .getByRole('list', { name: 'Lebensmittel und Gerichte' })
    .getByRole('button', { name: /^Döner Kebab 1 Döner ≈ 350 g · 753 kcal/ })
    .click()
  await expect(page.getByRole('radio', { name: 'Portionen' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Zu Mittagessen hinzufügen' }).click()
  await expect(page.getByText(/^1 Eintrag · 75[23] kcal$/)).toBeVisible()

  // Englisch geht auch: „grilled chicken breast“ findet die Hähnchenbrust
  await page.getByLabel('Lebensmittel suchen').fill('grilled chicken breast')
  await expect(page.getByRole('list', { name: 'Lebensmittel und Gerichte' }).getByRole('button').first()).toContainText('Hähnchenbrust')

  // Eigenes Lebensmittel: Werte per Vorschlag statt abtippen
  await page.getByLabel('Lebensmittel suchen').fill('Pizza vom Italiener')
  await page.getByRole('button', { name: '„Pizza vom Italiener“ selbst anlegen' }).click()
  const sheet = page.getByRole('dialog', { name: 'Eigenes Lebensmittel' })
  const suggest = sheet.getByRole('region', { name: 'Werte vorschlagen' })
  await expect(suggest.getByRole('button', { name: /Steinofenpizza Margherita/ })).toBeVisible()
  await suggest.getByRole('button', { name: /^Pizza Margherita/ }).click()
  await expect(sheet.getByRole('status')).toContainText('Werte von „Pizza Margherita“ übernommen')
  await expect(sheet.getByLabel('Kalorien pro 100 g')).toHaveValue('245')
  await expect(sheet.getByLabel('Portionsgröße')).toHaveValue('380')
  await expect(sheet.getByLabel('Name', { exact: true })).toHaveValue('Pizza vom Italiener')
  await sheet.getByRole('button', { name: 'Speichern' }).click()
  // gleich eintragen: 1 Portion = 1 Pizza
  await page.getByRole('button', { name: 'Zu Mittagessen hinzufügen' }).click()
  await expect(page.getByText(/^2 Einträge · 1\.68\d kcal$/)).toBeVisible()

  // Schnell-Eintrag: Kalorien per Vorschlag
  await page.getByLabel('Lebensmittel suchen').fill('Cappuccino')
  await page.getByRole('button', { name: 'Nur Kalorien für „Cappuccino“ eintragen' }).click()
  const quick = page.getByRole('dialog', { name: 'Schnell-Eintrag' })
  await quick.getByRole('group', { name: 'Vorschläge für die Kalorien' }).getByRole('button', { name: 'Cappuccino · 1 Tasse ≈ 80 kcal' }).click()
  await expect(quick.getByLabel('Kalorien', { exact: true })).toHaveValue('80')
  await quick.getByRole('button', { name: 'Zu Mittagessen hinzufügen' }).click()
  await expect(page.getByText(/^3 Einträge · 1\.76\d kcal$/)).toBeVisible()

  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await expect(page.getByRole('img', { name: /1\.76\d von 2\.000 kcal/ })).toBeVisible()
  // Der Döner steht beim nächsten Mal unter „Zuletzt“
  await page.goto('/hinzufuegen?meal=dinner')
  await expect(page.getByRole('button', { name: /^Döner Kebab/ })).toBeVisible()
})

test('Mehreres auf einmal: Text erkennen, anpassen und mit einem Tipp eintragen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=breakfast')
  const tip = page.getByText(/^Tipp: Mehreres auf einmal/)
  await expect(tip).toBeVisible()
  await page.getByLabel('Lebensmittel suchen').fill('2 Brötchen mit Butter, 1 Cappuccino und eine Banane, Blablubb')

  const card = page.getByRole('region', { name: 'Erkannt für Frühstück' })
  const items = card.getByRole('list', { name: 'Erkannte Einträge' }).getByRole('listitem')
  await expect(items).toHaveCount(4)
  await expect(items.nth(0)).toContainText('Brötchen')
  await expect(items.nth(0)).toContainText('2 Stück · 120 g')
  await expect(items.nth(1)).toContainText('2 EL · 24 g')
  await expect(items.nth(2)).toContainText('1 Tasse · 200 ml')
  await expect(items.nth(3)).toContainText('Bananen')
  await expect(card).toContainText('Nicht erkannt: „Blablubb“')

  // Butter weglassen und nur ein Brötchen nehmen
  await card.getByRole('button', { name: '„Butter“ entfernen' }).click()
  await expect(items).toHaveCount(3)
  await card.getByRole('button', { name: /^Brötchen, 2 Stück/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Brötchen' })
  // erst tippen, wenn die bisherige Menge im Feld steht – sonst landet die neue Zahl manchmal dahinter („21“)
  await expect(sheet.getByLabel('Menge')).toHaveValue('2')
  await sheet.getByLabel('Menge').fill('1')
  await sheet.getByRole('button', { name: 'Menge übernehmen' }).click()
  await expect(items.nth(0)).toContainText('1 Stück · 60 g')

  // 162 + 80 + 107 kcal
  await card.getByRole('button', { name: 'Alle 3 hinzufügen · 349 kcal' }).click()
  await expect(page.getByText(/^3 Einträge · 349 kcal$/)).toBeVisible()
  await expect(page.getByLabel('Lebensmittel suchen')).toHaveValue('')
  // Der Tipp hat seinen Zweck erfüllt
  await expect(tip).toBeHidden()

  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await expect(page.getByRole('img', { name: /349 von 2\.000 kcal/ })).toBeVisible()
})

test('Mehreres auf einmal: anderen Treffer wählen – beim nächsten Mal passt es gleich', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=dinner')
  const search = page.getByLabel('Lebensmittel suchen')
  await search.fill('2 Scheiben Käse und ein Kaffee')
  const card = page.getByRole('region', { name: 'Erkannt für Abendessen' })
  const items = card.getByRole('list', { name: 'Erkannte Einträge' }).getByRole('listitem')
  await expect(items.nth(0)).toContainText('Emmentaler')
  await expect(card).toContainText(/Zusammen \d+ g Eiweiß · \d+ g KH · \d+ g Fett/)

  await card.getByRole('button', { name: 'Andere Treffer für „Käse“' }).click()
  const choices = page.getByRole('dialog', { name: 'Andere Treffer für „Käse“' })
  await choices.getByRole('button', { name: /^Edamer/ }).click()
  await expect(choices).toBeHidden()
  await expect(items.nth(0)).toContainText('Edamer')
  await expect(items.nth(0)).toContainText('2 Scheiben')
  await card.getByRole('button', { name: /^Alle 2 hinzufügen/ }).click()
  await expect(page.getByText(/^2 Einträge · \d+ kcal$/)).toBeVisible()

  // Die App hat sich die Wahl gemerkt
  await search.fill('Käse, Kaffee')
  await expect(items.nth(0)).toContainText('Edamer')
})

test('Einblicke im Verlauf: woher die Kalorien kommen, nach Mahlzeiten und Wochentagen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=lunch')
  await page.getByLabel('Lebensmittel suchen').fill('Frühstück: 2 Brötchen und ein Cappuccino; Mittag: Döner; abends eine Banane')
  await page.getByRole('region', { name: 'Erkannt für Frühstück, Mittagessen und Abendessen' }).getByRole('button', { name: 'Alle 4 hinzufügen · 1.264 kcal' }).click()
  await expect(page.getByText(/^4 Einträge · 1\.264 kcal$/)).toBeVisible()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await page.goto('/verlauf?ansicht=week')
  await expect(page.getByRole('heading', { name: 'Einblicke' })).toBeVisible()
  // Der Döner bringt 753 von 1.264 kcal
  const top = page.getByRole('list', { name: 'Lebensmittel mit den meisten kcal' }).getByRole('listitem')
  await expect(top).toHaveCount(4)
  await expect(top.first()).toContainText('Döner Kebab')
  await expect(top.first()).toContainText('753 kcal · 60 %')
  await page.getByRole('radio', { name: 'Am häufigsten' }).click()
  await expect(page.getByRole('list', { name: 'Am häufigsten eingetragen' }).getByRole('listitem').first()).toContainText('1×')
  const meals = page.getByRole('list', { name: 'kcal nach Mahlzeiten' }).getByRole('listitem')
  await expect(meals).toHaveCount(4)
  await expect(meals.nth(1)).toContainText('Mittagessen')
  await expect(meals.nth(1)).toContainText('60 % · 753 kcal')
  await expect(page.getByRole('list', { name: 'Energie aus Eiweiß, Kohlenhydraten und Fett' }).getByRole('listitem')).toHaveCount(3)
  // Im Monat zusätzlich der Durchschnitt je Wochentag
  await page.goto('/verlauf?ansicht=month')
  const today = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date().getDay()]
  await expect(page.getByRole('list', { name: 'Durchschnittliche kcal nach Wochentagen' }).getByRole('listitem').filter({ hasText: today })).toContainText('Ø 1.264 kcal')
})

test('Ganzer Tag auf einmal: Mahlzeiten im Text werden jeweils dort eingetragen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=lunch')
  await page.getByLabel('Lebensmittel suchen').fill('Frühstück: 2 Brötchen und ein Cappuccino; Mittag: Döner; abends eine Banane')
  const card = page.getByRole('region', { name: 'Erkannt für Frühstück, Mittagessen und Abendessen' })
  await expect(card.getByRole('list', { name: 'Erkannte Einträge: Frühstück' }).getByRole('listitem')).toHaveCount(2)
  await expect(card.getByRole('list', { name: 'Erkannte Einträge: Mittagessen' })).toContainText('Döner Kebab')
  await expect(card.getByRole('list', { name: 'Erkannte Einträge: Abendessen' })).toContainText('Bananen')
  // 324 + 80 + 753 + 107 kcal
  await card.getByRole('button', { name: 'Alle 4 hinzufügen · 1.264 kcal' }).click()
  await expect(page.getByText(/^4 Einträge · 1\.264 kcal$/)).toBeVisible()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await expect(page.getByRole('img', { name: /1\.264 von 2\.000 kcal/ })).toBeVisible()
  // Jeweils bei der richtigen Mahlzeit (die Karte einer Mahlzeit ist der innerste Block mit Überschrift und Liste)
  const mealCard = (meal: string) =>
    page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: meal, exact: true }) })
      .filter({ has: page.getByRole('list') })
      .last()
  await expect(mealCard('Frühstück')).toContainText('Brötchen')
  await expect(mealCard('Frühstück')).toContainText('Cappuccino')
  await expect(mealCard('Mittagessen')).toContainText('Döner Kebab')
  await expect(mealCard('Mittagessen')).not.toContainText('Cappuccino')
  await expect(mealCard('Abendessen')).toContainText('Bananen')
})

test('Kochbuch-Rezepte beim Hinzufügen finden und in Portionen eintragen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=lunch')
  await page.getByLabel('Lebensmittel suchen').fill('Dal mit roten')
  const book = page.getByRole('list', { name: 'Rezepte aus dem Kochbuch' })
  await book.getByRole('button', { name: /^Dal mit roten Linsen und Spinat/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Dal mit roten Linsen und Spinat' })
  await expect(sheet).toContainText('Aus dem Kochbuch')
  await sheet.getByRole('button', { name: '1,5', exact: true }).click()
  await sheet.getByRole('button', { name: 'Zu Mittagessen hinzufügen' }).click()
  await expect(page.getByText(/^1 Eintrag · \d+ kcal$/)).toBeVisible()

  // Die Texterkennung kennt Kochbuch-Rezepte auch – ein „und“ im Titel trennt nicht
  await page.getByLabel('Lebensmittel suchen').fill('Dal mit roten Linsen und Spinat und ein Glas Wasser')
  const items = page.getByRole('region', { name: 'Erkannt für Mittagessen' }).getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('1 Portion · aus dem Kochbuch')
  await expect(items.nth(1)).toContainText('Wasser')
  await page.getByRole('button', { name: /^Alle 2 hinzufügen/ }).click()
  await expect(page.getByText(/^3 Einträge · [\d.]+ kcal$/)).toBeVisible()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await expect(page.getByRole('button', { name: /^Dal mit roten Linsen und Spinat 1,5 Portionen/ })).toBeVisible()
})

test.describe('App installieren auf dem iPhone', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })

  test('Hinweis auf der Tagesseite führt zur Anleitung und lässt sich ausblenden', async ({ page }) => {
    await startDemo(page)
    const hint = page.getByRole('note').filter({ hasText: 'Startbildschirm' })
    await expect(hint).toBeVisible()
    await hint.getByRole('link', { name: 'So geht’s' }).click()
    await expect(page.getByRole('list', { name: 'So geht’s auf dem iPhone' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'So geht’s auf dem iPhone' })).toContainText('Zum Home-Bildschirm')
    await page.goBack()
    await hint.getByRole('button', { name: 'Hinweis ausblenden' }).click()
    await expect(hint).toBeHidden()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Teller als App auf den Startbildschirm?')).toBeHidden()
  })
})

test('Sport eintragen: Verbrauch schätzen, eigene kcal, aufs Tagesziel anrechnen, löschen mit Rückgängig', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('button', { name: 'Sport', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Sport eintragen' })
  await sheet.getByRole('group', { name: 'Häufige Sportarten' }).getByRole('button', { name: 'Joggen' }).click()
  await sheet.getByRole('button', { name: '30 Min.', exact: true }).click()
  await expect(sheet).toContainText(/≈ \d+ kcal zusätzlich verbraucht/)
  // Wert von der Uhr übernehmen
  await sheet.getByRole('switch', { name: 'Eigene kcal eintragen' }).click()
  await sheet.getByLabel('Verbrauch').fill('300')
  await sheet.getByRole('button', { name: 'Eintragen · 300 kcal' }).click()
  const list = page.getByRole('list', { name: 'Sport an diesem Tag' })
  await expect(list.getByRole('button', { name: /^Joggen \(ca\. 8 km\/h\) 30 Min\. ≈ 300 kcal/ })).toBeVisible()
  await closeBadges(page)
  // Zunächst nicht aufs Tagesziel angerechnet
  await expect(page.getByRole('img', { name: /^0 von 2\.000 kcal/ })).toBeVisible()

  // Im Profil einschalten
  await page.getByRole('link', { name: 'Profil und Einstellungen' }).click()
  await page.getByRole('switch', { name: 'Sport aufs Tagesziel anrechnen' }).click()
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByText('Einstellungen gespeichert')).toBeVisible()
  await page.getByRole('link', { name: 'Heute' }).click()
  await expect(page.getByRole('img', { name: /^0 von 2\.300 kcal/ })).toBeVisible()
  await expect(page.getByText('Tagesziel 2.000 kcal + 300 kcal Sport')).toBeVisible()

  // Schritte dazu: geschätzt
  await page.getByRole('button', { name: 'Sport eintragen' }).click()
  await page.getByRole('dialog', { name: 'Sport eintragen' }).getByRole('button', { name: 'Schritte' }).click()
  await page.getByRole('dialog', { name: 'Sport eintragen' }).getByRole('button', { name: '10.000', exact: true }).click()
  await page.getByRole('dialog', { name: 'Sport eintragen' }).getByRole('button', { name: /^Eintragen · \d+ kcal$/ }).click()
  await expect(list.getByRole('button', { name: /^Schritte 10\.000 Schritte ≈ \d+ kcal/ })).toBeVisible()
  // 10.000 Schritte an einem Tag gibt ein Abzeichen
  await closeBadges(page)

  // Löschen und rückgängig machen
  await list.getByRole('button', { name: /^Joggen/ }).click()
  await confirmDelete(page, page.getByRole('dialog', { name: 'Sport bearbeiten' }))
  await expect(list.getByRole('button', { name: /^Joggen/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(list.getByRole('button', { name: /^Joggen \(ca\. 8 km\/h\) 30 Min\. ≈ 300 kcal/ })).toBeVisible()

  // Wochenrückblick nennt den Sport
  await page.getByRole('link', { name: 'Verlauf' }).click()
  await expect(page.getByText(/^Sport: 2 Einheiten an 1 Tag · 30 Min\. · ≈ [\d.]+ kcal\.$/)).toBeVisible()
})

test('Sport ohne Datenbank-Update: Hinweis statt Fehler, Rest der App läuft', async ({ page }) => {
  test.skip(!withAccount(), 'Nur mit Konto – der Demo-Modus speichert lokal')
  // So antwortet Supabase, solange setup-teil-4.sql noch nicht ausgeführt ist
  await page.route('**/rest/v1/activity_logs**', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'PGRST205', details: null, hint: null, message: "Could not find the table 'public.activity_logs' in the schema cache" }),
    }),
  )
  await startDemo(page)
  await expect(page.getByText('Noch nicht eingerichtet')).toBeVisible()
  await expect(page.getByText(/setup-teil-4\.sql/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sport eintragen' })).toHaveCount(0)
  await expect(page.getByText(/Speichern fehlgeschlagen|Bitte die SQL-Datei/)).toHaveCount(0)
  // Essen eintragen geht wie immer
  await page.goto('/hinzufuegen?meal=lunch')
  await page.getByLabel('Lebensmittel suchen').fill('2 Brötchen, 1 Cappuccino')
  await page.getByRole('button', { name: /^Alle 2 hinzufügen/ }).click()
  await expect(page.getByText(/^2 Einträge · \d+ kcal$/)).toBeVisible()
  // Profil: keine Sport-Einstellung, Sicherung klappt trotzdem
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Tagesziel' })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Sport aufs Tagesziel anrechnen' })).toHaveCount(0)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Alle Daten (JSON)' }).click()
  await download
  await expect(page.getByText('JSON exportiert')).toBeVisible()
})

test('Training vorschlagen: zu Hause oder im Studio, geführt durchgehen und als Sport eintragen', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: /Training vorschlagen/ }).click()
  await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible()
  // Fitnessstudio, 45 Minuten, Ganzkörper, Fortgeschritten: Sätze mit Geräten
  await page.getByRole('radiogroup', { name: 'Ort' }).getByRole('radio', { name: 'Fitnessstudio' }).click()
  await page.getByRole('group', { name: 'Dauer' }).getByRole('button', { name: '45 Min.' }).click()
  await page.getByRole('radiogroup', { name: 'Level' }).getByRole('radio', { name: 'Fortgeschritten' }).click()
  await expect(page.getByRole('heading', { name: 'Ganzkörper im Studio' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Krafttraining' }).getByRole('listitem').first()).toContainText(/3 × 8–12|4 × 8–12|× \d+ s/)

  // Zu Hause, 15 Minuten, Einsteiger: Zirkel ohne Geräte
  await page.getByRole('radiogroup', { name: 'Ort' }).getByRole('radio', { name: 'Zuhause' }).click()
  await page.getByRole('group', { name: 'Dauer' }).getByRole('button', { name: '15 Min.' }).click()
  await page.getByRole('radiogroup', { name: 'Level' }).getByRole('radio', { name: 'Einsteiger' }).click()
  await expect(page.getByRole('heading', { name: 'Ganzkörper zu Hause' })).toBeVisible()
  for (const block of ['Aufwärmen', 'Zirkel', 'Abkühlen']) await expect(page.getByRole('list', { name: block })).toBeVisible()
  // Ausführung aufklappen
  const first = page.getByRole('list', { name: 'Zirkel' }).getByRole('button').first()
  await first.click()
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Neuer Vorschlag' }).click()
  await expect(page.getByRole('list', { name: 'Zirkel' })).toBeVisible()

  // Geführt durchgehen – „Weiter“ springt zur nächsten Übung bzw. Pause
  await page.getByRole('button', { name: 'Training starten' }).click()
  const player = page.getByRole('dialog', { name: 'Ganzkörper zu Hause' })
  await expect(player.getByText(/Schritt 1 von \d+/)).toBeVisible()
  await expect(player.getByLabel(/Noch \d+ Sekunden/)).toBeVisible()
  for (let i = 0; i < 120 && !(await player.getByRole('heading', { name: 'Geschafft!' }).isVisible()); i++) {
    await player.getByRole('button', { name: 'Weiter', exact: true }).click()
  }
  await expect(player.getByRole('heading', { name: 'Geschafft!' })).toBeVisible()
  await player.getByRole('button', { name: 'Als Sport eintragen' }).click()
  await expect(page.getByText('Training als Sport eingetragen')).toBeVisible()
  await closeBadges(page)
  await expect(page.getByRole('list', { name: 'Sport an diesem Tag' }).getByRole('button', { name: /^Training: Ganzkörper zu Hause 1 Min\./ })).toBeVisible()
})

test('Stöbern: Werte nach Kategorien finden, ohne zu tippen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=breakfast')
  await page.getByRole('group', { name: 'Schnellauswahl' }).getByRole('button', { name: 'Stöbern' }).click()
  const categories = page.getByRole('group', { name: 'Kategorien' })
  // Brot & Brötchen zuerst, das Brötchen vorn
  await expect(categories.getByRole('button', { name: 'Brot & Brötchen' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('list', { name: 'Brot & Brötchen' }).getByRole('button').first()).toContainText('Brötchen')
  // Obst: die Grundnahrungsmittel aus der Nährwerttabelle stehen vorn
  await categories.getByRole('button', { name: 'Obst', exact: true }).click()
  await expect(page.getByRole('list', { name: 'Obst' }).getByRole('button').first()).toContainText('Apfel')
  // Käse: Gouda vorn, die große Erweiterung (Maasdamer …) weiter hinten
  await categories.getByRole('button', { name: 'Käse', exact: true }).click()
  const kaese = page.getByRole('list', { name: 'Käse' })
  await expect(kaese.getByRole('button').first()).toContainText('Gouda')
  await expect(kaese.getByRole('button', { name: /^Maasdamer 1 Scheibe ≈ 25 g/ })).toBeVisible()
  // Kaffee, Tee & Kakao: einen Cappuccino eintragen – 1 Tasse ist schon vorausgewählt
  await categories.getByRole('button', { name: 'Kaffee, Tee & Kakao', exact: true }).click()
  await page
    .getByRole('list', { name: 'Kaffee, Tee & Kakao' })
    .getByRole('button', { name: /^Cappuccino 1 Tasse = 200 ml · 80 kcal/ })
    .click()
  await page.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click()
  await expect(page.getByText(/^1 Eintrag · 80 kcal$/)).toBeVisible()
})

test('Lieblingszutaten: Rezepte daraus finden und ein eigenes Gericht zusammenstellen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte')
  await page.getByRole('link', { name: /^Lieblingszutaten/ }).click()
  await expect(page.getByRole('heading', { name: 'Lieblingszutaten', exact: true })).toBeVisible()
  for (const name of ['Lachs', 'Spinat']) {
    await page.getByLabel('Lieblingszutat suchen').fill(name)
    await page.getByRole('list', { name: 'Passende Zutaten' }).getByRole('button', { name, exact: true }).click()
  }
  const chosen = page.getByRole('list', { name: 'Ausgewählte Lieblingszutaten' }).getByRole('button')
  await expect(chosen).toHaveCount(2)
  // Rezepte mit beiden Lieblingszutaten stehen oben
  const first = page.getByRole('region', { name: 'Mit mehreren Lieblingszutaten' }).getByRole('link').first()
  await expect(first).toContainText('Lachs')
  await expect(first).toContainText('Spinat')
  // Die Auswahl bleibt auf dem Gerät gespeichert
  await page.reload()
  await expect(chosen).toHaveCount(2)
  // Eigenes Gericht aus Lieblingszutaten, ergänzt um gekochten Reis aus den eingebauten Richtwerten
  const forDish = page.getByRole('list', { name: 'Zutaten für das Gericht' })
  await forDish.getByRole('button', { name: 'Lachs' }).click()
  await forDish.getByRole('button', { name: 'Spinat' }).click()
  await page.getByRole('button', { name: 'Gericht aus 2 Zutaten anlegen' }).click()
  await expect(page.getByLabel('Name des Gerichts')).toHaveValue('Lachs & Spinat')
  await expect(page.getByLabel('Menge Lachsfilet')).toHaveValue('125')
  await page.getByRole('button', { name: 'Zutat hinzufügen' }).click()
  await page.getByLabel('Zutat suchen').fill('Reis (gekocht)')
  await page.getByRole('list', { name: 'Grundnahrungsmittel & Alltägliches' }).getByRole('button', { name: /^Reis \(gekocht\)/ }).click()
  await expect(page.getByLabel('Menge Reis (gekocht)')).toHaveValue('180')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Gericht angelegt')).toBeVisible()
})

test('Mit Fleisch abwandeln: Hähnchen statt Tofu mit einem Tipp, mehr Fleisch, als Variante speichern', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte/tofu-brokkoli-pfanne')
  await expect(page.getByRole('heading', { name: 'Mit Fleisch abwandeln' })).toBeVisible()
  await page.getByRole('list', { name: 'Fleisch-Ideen' }).getByRole('link', { name: 'Hähnchen statt Tofu' }).click()
  // Der Editor öffnet die eigene Version schon abgewandelt: Zutat, Titel und ein zusätzlicher Schritt
  await expect(page.getByRole('heading', { name: 'Rezept abwandeln' })).toBeVisible()
  await expect(page.getByLabel('Titel')).toHaveValue('Hähnchen-Brokkoli-Pfanne mit Reis')
  await expect(page.getByRole('button', { name: 'Hähnchenbrust ersetzen' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tofu (natur) ersetzen' })).toHaveCount(0)
  const before = Number(await page.getByLabel('Menge Hähnchenbrust').inputValue())
  // Weitere Ideen im Editor – jetzt für ein Fleischgericht
  await page.getByRole('list', { name: 'Fleisch-Ideen' }).getByRole('button', { name: 'Mehr Fleisch übernehmen' }).click()
  await expect(page.getByLabel('Menge Hähnchenbrust')).toHaveValue(String(before * 1.5))
  await page.getByRole('button', { name: 'Variante speichern' }).click()
  await expect(page.getByRole('heading', { name: 'Hähnchen-Brokkoli-Pfanne mit Reis' })).toBeVisible()
  await closeBadges(page)
  await expect(page.getByText(/Deine Variante von/)).toBeVisible()
  await expect(page.getByText(/Hähnchen statt Tofu: Die Hähnchenbrust/)).toBeVisible()
  // Eigene Varianten bekommen keine Fleisch-Knöpfe mehr
  await expect(page.getByRole('list', { name: 'Fleisch-Ideen' })).toHaveCount(0)
})

test('Eigenes Training eintragen: Übungen mit Sätzen, letztes Mal, Bestwerte, wiederholen und bearbeiten', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: /Training eintragen – Übungen, Sätze, Gewichte/ }).click()
  await expect(page.getByRole('heading', { name: 'Training eintragen' })).toBeVisible()

  // Übung aus dem Katalog: drei Sätze, ein neuer Satz übernimmt den vorigen
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click()
  await page.getByLabel('Übung suchen').fill('Bankdr')
  await page.getByRole('list', { name: 'Suchergebnisse' }).getByRole('button', { name: /^Bankdrücken/ }).first().click()
  await page.getByLabel('Bankdrücken, Satz 1: Wiederholungen').fill('10')
  await page.getByLabel('Bankdrücken, Satz 1: Gewicht in kg').fill('60')
  await page.getByRole('button', { name: 'Satz zu Bankdrücken hinzufügen' }).click()
  await page.getByRole('button', { name: 'Satz zu Bankdrücken hinzufügen' }).click()
  await expect(page.getByLabel('Bankdrücken, Satz 3: Gewicht in kg')).toHaveValue('60')
  await page.getByLabel('Bankdrücken, Satz 3: Wiederholungen').fill('8')
  // Eigene Übung, die es im Katalog nicht gibt
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click()
  await page.getByLabel('Übung suchen').fill('Seilklettern')
  await page.getByRole('button', { name: '„Seilklettern“ als eigene Übung' }).click()
  await page.getByLabel('Seilklettern, Satz 1: Wiederholungen').fill('3')
  await expect(page.getByText('2 Übungen · 4 Sätze · 1.680 kg bewegt')).toBeVisible()
  await page.getByLabel('Name (optional)').fill('Oberkörper')
  await page.getByRole('button', { name: /^Training speichern/ }).click()
  await closeBadges(page)

  // Auf der Tagesseite mit Zusammenfassung
  const list = page.getByRole('list', { name: 'Sport an diesem Tag' })
  await expect(list.getByRole('button', { name: /Oberkörper/ })).toContainText('2 Übungen · 4 Sätze · 1.680 kg bewegt')

  // Trainingsseite: Verlauf und Bestwerte
  await page.goto('/training')
  const recent = page.getByRole('region', { name: 'Deine Trainings' })
  await expect(recent).toContainText('Oberkörper')
  await expect(recent).toContainText('Bankdrücken')
  await expect(page.getByRole('list', { name: 'Bestwerte je Übung' })).toContainText('10 × 60 kg')

  // Wiederholen: dieselben Übungen und Sätze, „Letztes Mal“ steht dabei
  await recent.getByRole('link', { name: 'Oberkörper wiederholen' }).click()
  await expect(page.getByRole('heading', { name: 'Training eintragen' })).toBeVisible()
  await expect(page.getByLabel('Bankdrücken, Satz 3: Wiederholungen')).toHaveValue('8')
  await expect(page.getByText(/Letztes Mal \(.+\): 10 × 60 kg · 10 × 60 kg · 8 × 60 kg/)).toBeVisible()
  await page.getByLabel('Bankdrücken, Satz 1: Gewicht in kg').fill('62,5')
  await page.getByRole('button', { name: /^Training speichern/ }).click()
  await closeBadges(page)
  await expect(page.getByRole('list', { name: 'Bestwerte je Übung' })).toContainText('10 × 62,5 kg')

  // Bearbeiten über die Tagesseite: der Eintrag öffnet das Trainingstagebuch
  await page.goto('/')
  await closeBadges(page)
  await page.getByRole('list', { name: 'Sport an diesem Tag' }).getByRole('button', { name: /Oberkörper/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Training bearbeiten' })).toBeVisible()
  await expect(page.getByLabel('Name (optional)')).toHaveValue('Oberkörper')
  await page.getByRole('button', { name: 'Seilklettern entfernen' }).click()
  await page.getByRole('button', { name: /^Training speichern/ }).click()
  await expect(page.getByRole('list', { name: 'Sport an diesem Tag' }).getByRole('button', { name: /Oberkörper/ }).first()).toContainText('1 Übung · 3 Sätze')
})

test('Training im Wochenplan: Trainingstage planen, Wochenvorschlag abgestimmt, verschieben und entfernen', async ({ page }) => {
  await startDemo(page)
  await page.getByRole('link', { name: 'Planer' }).click()
  // Das Essen bleibt die Hauptsache: ohne geplantes Training keine Trainingszeile
  await expect(page.getByText('Training (optional)')).toBeVisible()
  // Nächste Woche – alle Tage liegen in der Zukunft
  await page.getByRole('button', { name: 'Nächste Woche' }).click()
  await page.getByRole('button', { name: 'Trainingstage planen' }).click()
  const sheet = page.getByRole('dialog', { name: 'Trainingstage planen' })
  // Voreinstellung Montag, Mittwoch, Freitag – Donnerstag kommt dazu
  await sheet.getByRole('group', { name: 'Trainingstage' }).getByRole('button', { name: /^Donnerstag/ }).click()
  await sheet.getByRole('radiogroup', { name: 'Ort' }).getByRole('radio', { name: 'Fitnessstudio' }).click()
  await expect(sheet.getByRole('list', { name: 'Vorschau' }).getByRole('listitem')).toHaveCount(4)
  await sheet.getByRole('button', { name: '4 Trainings einplanen' }).click()
  await expect(page.getByText('4 Trainings eingeplant')).toBeVisible()
  await closeBadges(page)
  await expect(page.getByText('Training: 4 geplant')).toBeVisible()
  await expect(page.getByText(/achtet auf dein Training: an Krafttagen proteinreiche Rezepte/)).toBeVisible()
  const trainings = page.getByRole('button', { name: /im Studio, / })
  await expect(trainings).toHaveCount(4)

  // Der Wochenvorschlag richtet sich nach den Trainingstagen
  await page.getByRole('button', { name: 'Woche vorschlagen' }).click()
  await expect(page.getByText(/Mahlzeiten vorgeschlagen – abgestimmt auf 4 Trainingstage/)).toBeVisible()
  await closeBadges(page)
  await expect(page.getByText('7/7')).toBeVisible()

  // Verschieben und entfernen – mit Rückgängig
  await trainings.first().click()
  await page.getByRole('group', { name: 'Verschieben auf' }).getByRole('button', { name: /^Dienstag/ }).click()
  await expect(page.getByText(/Verschoben auf Dienstag/)).toBeVisible()
  await trainings.first().click()
  await page.getByRole('button', { name: 'Aus dem Plan nehmen' }).click()
  await expect(page.getByText('Geplantes Training entfernt')).toBeVisible()
  await expect(page.getByText('Training: 3 geplant')).toBeVisible()
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByText('Training: 4 geplant')).toBeVisible()
})

test('Geplantes Training: auf der Trainingsseite einplanen und starten, auf der Tagesseite erledigt eintragen', async ({ page }) => {
  await startDemo(page)
  // Einen Vorschlag für heute einplanen
  await page.goto('/training')
  await page.getByRole('group', { name: 'Schwerpunkt' }).getByRole('button', { name: 'Oberkörper' }).click()
  await expect(page.getByRole('heading', { name: 'Oberkörper zu Hause' })).toBeVisible()
  await page.getByRole('button', { name: 'Für einen Tag einplanen' }).click()
  const sheet = page.getByRole('dialog', { name: 'Training einplanen' })
  await expect(sheet.getByText('Oberkörper zu Hause')).toBeVisible()
  await sheet.getByRole('button', { name: 'Einplanen', exact: true }).click()
  await expect(page.getByText(/Training eingeplant:/)).toBeVisible()
  await closeBadges(page)

  // Steht unter „Geplant“ und öffnet sich genau so, wie es eingeplant wurde
  const planned = page.getByRole('list', { name: 'Geplante Trainings' })
  await expect(planned).toContainText('Oberkörper zu Hause')
  await page.getByRole('button', { name: 'Neuer Vorschlag' }).click()
  await planned.getByRole('link', { name: 'Oberkörper zu Hause starten' }).click()
  await expect(page.getByText('Geplant für heute')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Oberkörper zu Hause' })).toBeVisible()

  // Tagesseite: geplant im Sport-Bereich; an einem Krafttag proteinreiche Ideen für die nächste freie Mahlzeit
  await page.goto('/')
  await closeBadges(page)
  const plannedToday = page.getByRole('list', { name: 'Geplantes Training' })
  await expect(plannedToday).toContainText('Oberkörper zu Hause')
  const hour = Number(new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: 'numeric', hour12: false }).format(new Date()))
  if (hour < 22) await expect(page.getByRole('list', { name: 'Rezeptideen passend zum Training' }).getByRole('link')).toHaveCount(3)

  // Erledigt: als Sport eingetragen – mit den Übungen des Trainings
  await plannedToday.getByRole('button', { name: 'Oberkörper zu Hause als erledigt eintragen' }).click()
  await expect(page.getByText('Oberkörper zu Hause als Sport eingetragen')).toBeVisible()
  await closeBadges(page)
  await expect(page.getByRole('list', { name: 'Sport an diesem Tag' }).getByRole('button', { name: /^Training: Oberkörper zu Hause/ })).toContainText(/\d+ Übungen/)
  await expect(page.getByRole('list', { name: 'Geplantes Training' })).toHaveCount(0)

  // Im Wochenplan als erledigt zu sehen
  await page.getByRole('link', { name: 'Planer' }).click()
  await expect(page.getByRole('button', { name: /^Oberkörper zu Hause, .*erledigt$/ })).toBeVisible()
  await expect(page.getByText('Training: 1 geplant · 1 erledigt')).toBeVisible()
})

test('Training planen ohne Datenbank-Update: Hinweis im Wochenplan, Essen planen geht weiter', async ({ page }) => {
  test.skip(!withAccount(), 'Nur mit Konto – der Demo-Modus speichert lokal')
  // So antwortet Supabase, solange das Update in setup-teil-4.sql noch nicht ausgeführt ist
  await page.route('**/rest/v1/training_plans**', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'PGRST205', details: null, hint: null, message: "Could not find the table 'public.training_plans' in the schema cache" }),
    }),
  )
  await startDemo(page)
  await page.getByRole('link', { name: 'Planer' }).click()
  await expect(page.getByText(/Training einplanen: Dafür fehlt noch ein kurzes Datenbank-Update/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Trainingstage planen' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Training am .* einplanen$/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Woche vorschlagen' }).click()
  await expect(page.getByText('7/7')).toBeVisible()
  await closeBadges(page)
  // Trainingsseite: Vorschläge wie gewohnt, nur ohne Einplanen
  await page.goto('/training')
  await expect(page.getByRole('button', { name: 'Training starten' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Für einen Tag einplanen' })).toHaveCount(0)
})

test('Training nach dem Essen eingeplant: Snacks fürs Training ergänzen, mit Rückgängig', async ({ page }) => {
  await startDemo(page)
  // Sport aufs Tagesziel anrechnen – dann haben Trainingstage mehr Platz
  await page.getByRole('link', { name: 'Profil und Einstellungen' }).click()
  await page.getByRole('switch', { name: 'Sport aufs Tagesziel anrechnen' }).click()
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByText('Einstellungen gespeichert')).toBeVisible()

  // Erst das Essen der nächsten Woche planen, danach das Training
  await page.goto('/planer')
  await page.getByRole('button', { name: 'Nächste Woche' }).click()
  await page.getByRole('button', { name: 'Woche vorschlagen' }).click()
  await expect(page.getByText('7/7')).toBeVisible()
  await closeBadges(page)
  await expect(page.getByRole('button', { name: 'Snacks fürs Training ergänzen' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Trainingstage planen' }).click()
  const sheet = page.getByRole('dialog', { name: 'Trainingstage planen' })
  await sheet.getByRole('radiogroup', { name: 'Ort' }).getByRole('radio', { name: 'Fitnessstudio' }).click()
  await sheet.getByRole('group', { name: 'Dauer' }).getByRole('button', { name: '60 Min.' }).click()
  await sheet.getByRole('button', { name: '3 Trainings einplanen' }).click()
  await closeBadges(page)

  // Der schon gefüllte Plan bleibt, wie er ist – Snacks kommen nur auf Wunsch dazu
  await expect(page.getByText(/(An \d Trainingstagen|An einem Trainingstag) ist im Plan noch Platz/)).toBeVisible()
  await page.getByRole('button', { name: 'Snacks fürs Training ergänzen' }).click()
  await expect(page.getByText(/\d Snacks? fürs Training ergänzt/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Snacks fürs Training ergänzen' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(page.getByRole('button', { name: 'Snacks fürs Training ergänzen' })).toBeVisible()
})

test('Open Food Facts antwortet nicht: Hinweis statt leerer Liste, erneut versuchen klappt', async ({ page }) => {
  let down = true
  const answer = (route: import('@playwright/test').Route, body: unknown) =>
    down ? route.fulfill({ status: 503, body: 'nicht verfügbar' }) : route.fulfill({ json: body })
  const product = { code: '4000000000024', product_name: 'Testmüsli Beere', brands: 'Testmarke', nutriments: { 'energy-kcal_100g': 380 } }
  await page.route('**/search.openfoodfacts.org/search**', (route) => answer(route, { hits: [product] }))
  await page.route('**/world.openfoodfacts.org/cgi/search.pl**', (route) => answer(route, { products: [product] }))
  await startDemo(page)
  await page.goto('/hinzufuegen?meal=breakfast')
  await page.getByLabel('Lebensmittel suchen').fill('Testmüsli')
  await expect(page.getByText('Open Food Facts antwortet gerade nicht.')).toBeVisible({ timeout: 15000 })
  // Eingebaute Treffer und „selbst anlegen“ funktionieren weiter
  await expect(page.getByRole('button', { name: '„Testmüsli“ selbst anlegen' })).toBeVisible()
  down = false
  await page.getByRole('button', { name: 'Erneut versuchen' }).click()
  await expect(page.getByRole('button', { name: /^Testmüsli Beere/ })).toBeVisible()
  await expect(page.getByText('Open Food Facts antwortet gerade nicht.')).toHaveCount(0)
})
