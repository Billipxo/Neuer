import { expect, test, type Page } from '@playwright/test'
import { signIn, testEmail } from './konto-helpers'

/** Läuft der Test in der Reihe „konto“ (mit Anmeldung gegen das Test-Backend) statt im Demo-Modus? */
export function withAccount(): boolean {
  return test.info().project.name === 'konto'
}

/**
 * App starten und Onboarding mit eigenem Tagesziel durchlaufen: im Demo-Modus ohne Konto, in der Reihe „konto“
 * mit einem frischen Konto. Dieselben Abläufe prüfen so auch Spalten und Zugriffsregeln der Datenbank.
 */
export async function startDemo(page: Page, kcal = '2000') {
  page.on('dialog', (d) => d.accept())
  await onboard(page, kcal)
}

/** Bis zum Onboarding: im Demo-Modus „Ohne Konto ausprobieren“, sonst mit einem frischen Konto anmelden */
export async function enterApp(page: Page) {
  if (withAccount()) {
    await signIn(page, testEmail('alex'))
  } else {
    await page.goto('/')
    await page.getByRole('button', { name: 'Ohne Konto ausprobieren' }).click()
  }
}

/** Nach dem Löschen des Kontos steht wieder die Anmeldeseite da */
export async function expectSignedOut(page: Page) {
  if (withAccount()) await expect(page.getByLabel('E-Mail-Adresse')).toBeVisible()
  else await expect(page.getByRole('button', { name: 'Ohne Konto ausprobieren' })).toBeVisible()
}

/** Onboarding – ohne Dialog-Behandlung, damit es in einem Test mehrfach aufgerufen werden kann */
export async function onboard(page: Page, kcal = '2000') {
  await enterApp(page)
  await page.getByLabel('Wie dürfen wir dich nennen?').fill('Alex')
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('button', { name: 'Überspringen' }).click()
  await page.getByLabel('Dein Tagesziel').fill(kcal)
  await page.getByRole('button', { name: 'Weiter' }).click()
  await page.getByRole('button', { name: 'Los geht’s' }).click()
  await expect(page.getByRole('heading', { name: 'Alex' })).toBeVisible()
}

/** Eventuell erscheinende Abzeichen-Dialoge schließen (sie erscheinen leicht verzögert) */
export async function closeBadges(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Neues Abzeichen' })
  await dialog.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {})
  for (let i = 0; i < 10; i++) {
    if (!(await dialog.isVisible().catch(() => false))) return
    await dialog.getByRole('button', { name: /Weiter|Danke/ }).click()
    await page.waitForTimeout(250)
  }
}
