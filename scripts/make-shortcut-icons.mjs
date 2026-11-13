// Erzeugt die Symbole für die App-Verknüpfungen (public/shortcut-*.png, 192×192) aus Lucide-Icons.
// Aufruf: node scripts/make-shortcut-icons.mjs   (braucht den Playwright-Browser: npx playwright install chromium)
import { chromium } from '@playwright/test'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ICONS = [
  { file: 'shortcut-add.png', icon: 'plus' },
  { file: 'shortcut-scan.png', icon: 'scan-barcode' },
  { file: 'shortcut-shopping.png', icon: 'shopping-basket' },
  { file: 'shortcut-plan.png', icon: 'calendar-days' },
]

function svgFor(node) {
  const children = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      return `<${tag} ${a}/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="92" height="92" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 192, height: 192 }, deviceScaleFactor: 1 })
for (const { file, icon } of ICONS) {
  const mod = await import(pathToFileURL(join(process.cwd(), 'node_modules/lucide-react/dist/esm/icons', `${icon}.mjs`)).href)
  // Vollflächiger Hintergrund in der Markenfarbe – Android schneidet selbst rund zu; das Symbol liegt in der sicheren Mitte
  await page.setContent(
    `<html><body style="margin:0"><div style="width:192px;height:192px;background:#16a34a;display:flex;align-items:center;justify-content:center">${svgFor(mod.__iconData.node)}</div></body></html>`,
  )
  await page.screenshot({ path: join('public', file), clip: { x: 0, y: 0, width: 192, height: 192 } })
  console.log('geschrieben', file)
}
await browser.close()
