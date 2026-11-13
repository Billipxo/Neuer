import { expect, test } from '@playwright/test'
import { closeBadges } from './helpers'
import { signIn, signUp, testEmail } from './konto-helpers'

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
