import { expect, test } from '@playwright/test'
import { closeBadges } from './helpers'
import { addShoppingItem, signIn, signUp, testEmail } from './konto-helpers'

// Diese Tests laufen mit Anmeldung gegen das Test-Backend (e2e/backend) – dahinter eine echte PostgreSQL mit allen
// Migrationen und Zugriffsregeln. Start: E2E_KONTO=1 npx playwright test --project=konto

test('Anmelden mit Code: Daten liegen im Konto und sind für andere unsichtbar', async ({ page, browser }) => {
  const anna = testEmail('anna')
  await signUp(page, anna, 'Anna', '1900')
  await page.goto('/hinzufuegen?meal=breakfast')
  await page.getByLabel('Lebensmittel suchen').fill('Apfel')
  await page.getByRole('list', { name: 'Grundnahrungsmittel' }).getByRole('button', { name: /^Apfel 1 Stück/ }).click()
  await page.getByRole('button', { name: 'Zu Frühstück hinzufügen' }).click()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await closeBadges(page)
  await expect(page.getByRole('img', { name: /81 von 1\.900 kcal/ })).toBeVisible()

  // Anderes Gerät, dasselbe Konto: kein Onboarding, der Eintrag ist da
  const phone = await browser.newContext()
  const second = await phone.newPage()
  await signIn(second, anna)
  await expect(second.getByRole('img', { name: /81 von 1\.900 kcal/ })).toBeVisible()
  await expect(second.getByText('Apfel', { exact: true })).toBeVisible()
  await phone.close()

  // Anderes Konto: sieht nichts davon
  const other = await browser.newContext()
  const ben = await other.newPage()
  await signUp(ben, testEmail('ben'), 'Ben')
  await expect(ben.getByText('Apfel', { exact: true })).toHaveCount(0)
  await other.close()
})

test('Falscher Code wird verständlich abgelehnt', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('E-Mail-Adresse').fill(testEmail('falsch'))
  await page.getByRole('button', { name: 'Anmeldelink senden' }).click()
  await page.getByLabel('Oder Code aus der E-Mail eingeben').fill('000000')
  await page.getByRole('button', { name: 'Mit Code anmelden' }).click()
  await expect(page.getByRole('alert')).toHaveText('Der Code ist ungültig oder abgelaufen.')
})

test('Gemeinsamer Haushalt: gründen, per Link beitreten, zusammen planen und einkaufen, verlassen', async ({ page, browser }) => {
  test.setTimeout(120_000)
  // Anna hat schon eine Einkaufsliste und gründet den Haushalt
  await signUp(page, testEmail('anna'), 'Anna')
  await page.goto('/einkauf')
  await addShoppingItem(page, 'Kaffee')
  await expect(page.getByText('Kaffee', { exact: true })).toBeVisible()
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Haushalt gründen' }).click()
  await page.getByLabel('Name des Haushalts').fill('WG Test')
  await expect(page.getByLabel('Dein Name im Haushalt')).toHaveValue('Anna')
  await page.getByRole('dialog').getByRole('button', { name: 'Haushalt gründen' }).click()
  await expect(page.getByText(/„WG Test“ gegründet/)).toBeVisible()
  const code = (await page.getByText(/^[0-9A-F]{5}-[0-9A-F]{5}$/).textContent())!
  await expect(page.getByRole('list', { name: 'Mitglieder' })).toContainText('Anna · du')

  // Ben öffnet den Einladungslink, bevor er ein Konto hat – nach Anmeldung und Einrichtung geht es direkt zum Beitritt
  const other = await browser.newContext()
  const ben = await other.newPage()
  await ben.goto(`/beitreten/${code}`)
  await signUp(ben, testEmail('ben'), 'Ben', '2400', false)
  await expect(ben.getByRole('heading', { name: 'Haushalt beitreten' })).toBeVisible()
  await expect(ben.getByLabel('Einladungscode oder Link')).toHaveValue(code)
  await ben.getByRole('button', { name: 'Beitreten', exact: true }).click()
  await expect(ben.getByText('Willkommen im Haushalt „WG Test“')).toBeVisible()
  await expect(ben.getByRole('list', { name: 'Mitglieder' })).toContainText('Anna')
  await expect(ben.getByRole('list', { name: 'Mitglieder' })).toContainText('Ben · du')

  // Gemeinsame Einkaufsliste: Ben sieht Annas Artikel, hakt ab und ergänzt
  await ben.goto('/einkauf')
  await expect(ben.getByRole('note')).toContainText('WG Test · Gemeinsam mit Anna')
  await ben.getByText('Kaffee', { exact: true }).click()
  await addShoppingItem(ben, 'Brot')
  await expect(ben.getByText('Brot', { exact: true })).toBeVisible()

  // Anna hat die Liste offen und bekommt Bens Änderungen ohne Neuladen
  await page.goto('/einkauf')
  await expect(page.getByRole('note')).toContainText('WG Test · Gemeinsam mit Ben')
  await expect(page.getByText('Brot', { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Kaffee/ })).toBeChecked()
  await addShoppingItem(ben, 'Milch')
  await expect(page.getByText('Milch', { exact: true })).toBeVisible({ timeout: 25_000 })

  // Gemeinsamer Wochenplan: Anna plant ein Rezept, Ben sieht es und trägt seine Portion ein
  await page.goto('/planer')
  await page.locator('[aria-current="date"]').getByRole('button', { name: /^Abendessen am .* planen$/ }).click()
  await page.getByLabel('Rezept suchen').fill('Linsen-Bolognese')
  await page.getByRole('button', { name: /Linsen-Bolognese/ }).first().click()
  await expect(page.getByText('Eingeplant')).toBeVisible()
  await ben.goto('/planer')
  await expect(ben.getByRole('note')).toContainText('eingekauft wird für 2 Personen')
  await ben.getByRole('button', { name: /Linsen-Bolognese/ }).first().click()
  await expect(ben.getByText('Eingeplant von Anna')).toBeVisible()
  await ben.getByRole('button', { name: 'Als gegessen eintragen' }).click()
  await closeBadges(ben)

  // Einkaufsliste aus dem Plan: Portionen gelten pro Person, eingekauft wird für zwei (80 g Spaghetti je Portion)
  await page.getByRole('button', { name: 'Einkaufsliste', exact: true }).click()
  await expect(page).toHaveURL(/\/einkauf/)
  await expect(page.getByText('Vollkornspaghetti')).toBeVisible()
  await expect(page.getByText('160 g')).toBeVisible()

  // Das Protokoll bleibt privat: Bens Eintrag zählt nur bei Ben
  await ben.goto('/')
  await expect(ben.getByRole('img', { name: /[1-9]\d* von 2\.400 kcal/ })).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('img', { name: /^0 von 2\.000 kcal/ })).toBeVisible()

  // Eigene Rezepte sind für die anderen lesbar, aber nicht änderbar
  await page.goto('/rezepte/neu')
  await page.getByLabel('Titel').fill('Annas Rührei')
  await page.getByRole('button', { name: 'Zutat hinzufügen' }).click()
  await page.getByLabel('Zutat suchen').fill('Eier')
  await page.getByRole('button', { name: /^Eier/ }).first().click()
  await page.getByLabel('Menge Eier').fill('3')
  await page.getByRole('button', { name: 'Schritt hinzufügen' }).click()
  await page.getByRole('textbox', { name: 'Schritt 1' }).fill('Eier verquirlen und in der Pfanne stocken lassen.')
  await page.getByRole('button', { name: 'Rezept speichern' }).click()
  await expect(page.getByText('Dein eigenes Rezept')).toBeVisible()
  await closeBadges(page)
  const recipeUrl = new URL(page.url()).pathname
  await ben.goto(recipeUrl)
  await expect(ben.getByRole('heading', { name: 'Annas Rührei' })).toBeVisible()
  await expect(ben.getByText(/Rezept von Anna aus eurem Haushalt/)).toBeVisible()
  await expect(ben.getByRole('link', { name: /Bearbeiten/ })).toHaveCount(0)

  // Ben verlässt den Haushalt und nimmt eine Kopie der offenen Einkäufe mit
  await ben.goto('/profil')
  await ben.getByRole('button', { name: 'Haushalt verlassen' }).click()
  await expect(ben.getByRole('switch', { name: 'Kopie mitnehmen' })).toHaveAttribute('aria-checked', 'true')
  await ben.getByRole('dialog').getByRole('button', { name: 'Haushalt verlassen' }).click()
  await expect(ben.getByRole('button', { name: 'Haushalt gründen' })).toBeVisible()
  await ben.goto('/einkauf')
  await expect(ben.getByRole('note')).toHaveCount(0)
  await expect(ben.getByText('Brot', { exact: true })).toBeVisible()
  await ben.goto(recipeUrl)
  await expect(ben.getByRole('heading', { name: 'Annas Rührei' })).toHaveCount(0)

  // Anna bleibt mit dem gemeinsamen Bestand zurück und sieht, dass Ben gegangen ist
  await page.goto('/profil')
  await expect(page.getByRole('list', { name: 'Mitglieder' })).not.toContainText('Ben')
  await page.goto('/einkauf')
  await expect(page.getByText('Brot', { exact: true })).toBeVisible()
  await other.close()
})

test('Falscher Einladungscode: verständliche Meldung, kein Beitritt', async ({ page }) => {
  await signUp(page, testEmail('cem'), 'Cem')
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Mit Code beitreten' }).click()
  await expect(page.getByRole('button', { name: 'Beitreten', exact: true })).toBeDisabled()
  await page.getByLabel('Einladungscode oder Link').fill('aaaaa 00000')
  await page.getByRole('button', { name: 'Beitreten', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Diesen Code gibt es nicht')
  await page.getByRole('button', { name: 'Schließen' }).click()
  await expect(page.getByRole('button', { name: 'Haushalt gründen' })).toBeVisible()
})

test('Link aus der Mail: meldet auch in einem anderen Browser an; ein benutzter Link wird erklärt', async ({ page, browser, request }) => {
  const email = testEmail('link')
  await page.goto('/')
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByRole('button', { name: 'Anmeldelink senden' }).click()
  await expect(page.getByRole('heading', { name: 'Schau in dein Postfach' })).toBeVisible()
  const { url } = await (await request.get(`http://127.0.0.1:54321/__link?email=${encodeURIComponent(email)}`)).json()

  // Mail-Programme öffnen Links oft in einem anderen Browser als dem, in dem die Anmeldung begonnen wurde
  const elsewhere = await browser.newContext()
  const second = await elsewhere.newPage()
  await second.goto(url)
  await expect(second.getByLabel('Wie dürfen wir dich nennen?')).toBeVisible()
  await expect(second).not.toHaveURL(/access_token/)
  await elsewhere.close()

  // Jeder Link gilt nur einmal: beim zweiten Klick erklärt die Anmeldeseite, was los ist
  const again = await browser.newContext()
  const third = await again.newPage()
  await third.goto(url)
  await expect(third.getByRole('alert')).toContainText('abgelaufen oder wurde schon benutzt')
  await expect(third.getByLabel('E-Mail-Adresse')).toBeVisible()
  await expect(third).not.toHaveURL(/error/)
  await again.close()
})
