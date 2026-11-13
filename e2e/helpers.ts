import { expect, type Page } from '@playwright/test'

/** Demo-Modus starten und Onboarding mit eigenem Tagesziel durchlaufen */
export async function startDemo(page: Page, kcal = '2000') {
  page.on('dialog', (d) => d.accept())
  await onboard(page, kcal)
}

/** Onboarding im Demo-Modus – ohne Dialog-Behandlung, damit es in einem Test mehrfach aufgerufen werden kann */
export async function onboard(page: Page, kcal = '2000') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ohne Konto ausprobieren' }).click()
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
