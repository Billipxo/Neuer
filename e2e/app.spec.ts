import { expect, test } from '@playwright/test'
import { closeBadges, startDemo } from './helpers'

test('Onboarding mit Kalorienvorschlag', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ohne Konto ausprobieren' }).click()
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
  await expect(page.getByRole('img', { name: /0 von 1\.950 kcal gegessen/ })).toBeVisible()
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
  await page.getByRole('button', { name: 'Speichern' }).click()
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
  await page.getByRole('link', { name: 'Heute' }).click()
  await page.getByRole('link', { name: 'Profil und Einstellungen' }).click()
  await expect(page.getByText('von 10 Abzeichen')).toBeVisible()
  await page.getByRole('button', { name: 'Konto löschen' }).click()
  await page.getByLabel(/LÖSCHEN/).fill('LÖSCHEN')
  await page.getByRole('button', { name: 'Endgültig löschen' }).click()
  await expect(page.getByRole('button', { name: 'Ohne Konto ausprobieren' })).toBeVisible()
})

test('Offline-Hinweis erscheint ohne Verbindung', async ({ page, context }) => {
  await startDemo(page)
  await context.setOffline(true)
  await expect(page.getByText(/Offline – du kannst die App weiter nutzen/)).toBeVisible()
  await page.getByRole('button', { name: /Ein Glas Wasser/ }).click()
  await expect(page.getByText('250 / 2.000 ml')).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText(/Offline/)).toBeHidden()
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
  await expect(page.getByText('Kerntemperaturen')).toBeVisible()
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
  await page.goto('/einkauf')
  await expect(page.getByText('Feta')).toBeVisible()
  // Auswahl bleibt gespeichert
  await page.goto('/rezepte/zutaten')
  await expect(page.getByRole('button', { name: 'Spinat entfernen' })).toBeVisible()
})

test('Rezept abwandeln: Mengen ändern, Zutat tauschen, Nährwerte neu berechnet, Variante eintragen', async ({ page }) => {
  await startDemo(page)
  await page.goto('/rezepte/spaghetti-bolognese')
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
  await page.getByRole('list', { name: 'Grundnahrungsmittel' }).getByRole('button', { name: /^Apfel 1 Stück/ }).click()
  await expect(page.getByRole('radio', { name: 'Stück', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click()
  await page.getByLabel('Lebensmittel suchen').fill('Olivenöl')
  await page.getByRole('list', { name: 'Grundnahrungsmittel' }).getByRole('button', { name: /^Olivenöl/ }).click()
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
