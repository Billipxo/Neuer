import { expect, type Page } from '@playwright/test'

/** Eindeutige Adresse je Testlauf – alle Tests teilen sich eine Datenbank */
export function testEmail(name: string): string {
  return `${name}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`
}

/** Mit Code anmelden (das Test-Backend akzeptiert immer 123456) */
export async function signIn(page: Page, email: string) {
  await page.goto('/')
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByRole('button', { name: 'Anmeldelink senden' }).click()
  await page.getByLabel('Oder Code aus der E-Mail eingeben').fill('123456')
  await page.getByRole('button', { name: 'Mit Code anmelden' }).click()
}

/** Anmelden und Onboarding mit eigenem Tagesziel durchlaufen */
export async function signUp(page: Page, email: string, name: string, kcal = '2000') {
  page.on('dialog', (d) => d.accept())
  await signIn(page, email)
  await page.getByLabel('Wie dürfen wir dich nennen?').fill(name)
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('button', { name: 'Überspringen' }).click()
  await page.getByLabel('Dein Tagesziel').fill(kcal)
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('button', { name: 'Los geht’s' }).click()
  await expect(page.getByRole('img', { name: new RegExp(`0 von ${Number(kcal).toLocaleString('de-DE')} kcal`) })).toBeVisible()
}
