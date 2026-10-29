// Testet die Android-App in einem Android-Emulator: Start, Lernen, Themenbereich mit Erklärung,
// Lernstand nach Neustart, Zurück-Taste, dunkles Design, Sicherung speichern („Speichern unter“)
// und wiederherstellen (Dateiauswahl). Läuft in GitHub Actions, siehe .github/workflows/android-test.yml.
//
// Aufruf: node android/test/emulator-test.mjs [Pfad zur Test-APK]
// Braucht: laufenden Emulator (adb), npm-Paket playwright, eine mit „--test“ gebaute APK.
import { mkdirSync, writeFileSync } from 'node:fs';
import { _android as android } from 'playwright';

const PAKET = 'de.treitrainer.app';
const APK = process.argv[2] ?? 'android/build/TREI-Trainer-test.apk';
const AUSGABE = 'android/build/test-ergebnis';
mkdirSync(AUSGABE, { recursive: true });

const protokoll = [];
const fehler = [];
const start = Date.now();
const log = (...teile) => {
  const zeile = `[${String(Math.round((Date.now() - start) / 1000)).padStart(3)} s] ${teile.join(' ')}`;
  console.log(zeile);
  protokoll.push(zeile);
};
const pruefe = (ok, text) => {
  log(ok ? '✔' : '✘', text);
  if (!ok) fehler.push(text);
};

const schreibeProtokoll = () =>
  writeFileSync(`${AUSGABE}/protokoll.txt`, [...protokoll, ...fehler.map((f) => `FEHLER: ${f}`)].join('\n') + '\n');

const [geraet] = await android.devices();
if (!geraet) throw new Error('Kein Android-Gerät gefunden');
setTimeout(async () => {
  fehler.push('Zeitüberschreitung: Test hing länger als 6 Minuten');
  log('Zeitüberschreitung – Vordergrund:', await vordergrund().catch(() => '?'));
  schreibeProtokoll();
  console.error('\nFEHLER:\n' + fehler.join('\n'));
  process.exit(1);
}, 6 * 60_000).unref();
log('Gerät:', geraet.model(), '| Android', (await geraet.shell('getprop ro.build.version.release')).toString().trim());
await geraet.installApk(APK);
const bild = (name) => geraet.screenshot({ path: `${AUSGABE}/${name}.png` });
const text = async (seite) => (await seite.locator('main').textContent()).replace(/\s+/g, ' ');
const heute = async (seite) => (await text(seite)).match(/Heute\s*\d+\s*\/\s*\d+/)?.[0] ?? '(nicht gefunden)';
const gehe = (seite, ziel) => seite.evaluate((h) => (location.hash = h), ziel);
/** Systemfenster „Speichern unter“ / Dateiauswahl (com.android.documentsui oder com.google.android.documentsui) */
const DATEIEN_APP = { pkg: /.*documentsui/ };
/** Was ist gerade im Vordergrund? Für verständliche Fehlermeldungen. */
const vordergrund = async () =>
  (await geraet.shell('dumpsys activity activities | grep -m1 -E "topResumedActivity|mResumedActivity"'))
    .toString()
    .trim();
async function warteAufDateienApp(schritt) {
  try {
    await geraet.wait(DATEIEN_APP, { timeout: 30_000 });
  } catch (e) {
    log(`   ${schritt}: Vordergrund ist ${await vordergrund()}`);
    const meldungen = (await geraet.shell('logcat -d -t 400 "*:W"')).toString().split('\n');
    log(meldungen.filter((z) => /treitrainer|documentsui|ActivityTaskManager|AndroidRuntime/i.test(z)).slice(-15).join('\n'));
    throw e;
  }
}

async function starteApp() {
  await geraet.shell(`am force-stop ${PAKET}`);
  await new Promise((weiter) => setTimeout(weiter, 1500)); // alte WebView sicher weg
  await geraet.shell(`am start -W -n ${PAKET}/.MainActivity`);
  const webView = await geraet.webView({ pkg: PAKET }, { timeout: 60_000 });
  const seite = await webView.page();
  seite.on('pageerror', (e) => fehler.push(`Seitenfehler: ${e.message}`));
  seite.on('console', (m) => m.type() === 'error' && fehler.push(`Konsole: ${m.text()}`));
  await seite.waitForSelector('text=Weiterlernen', { timeout: 60_000 });
  return seite;
}

try {
  // 1. Start
  let seite = await starteApp();
  pruefe(seite.url().startsWith('https://appassets.androidplatform.net/'), `1. App gestartet: ${seite.url()}`);
  log('   Startseite:', await heute(seite));
  await bild('1-start');
  // Passt alles auf den Bildschirm? (untere Navigation sichtbar, nichts ragt seitlich hinaus)
  const lage = await seite.evaluate(() => {
    const nav = document.querySelector('nav')?.getBoundingClientRect();
    return {
      breite: innerWidth,
      hoehe: innerHeight,
      navOben: Math.round(nav?.top ?? -1),
      navUnten: Math.round(nav?.bottom ?? -1),
      ueberbreite: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  pruefe(
    lage.navOben > lage.hoehe / 2 && lage.navUnten <= lage.hoehe + 1 && !lage.ueberbreite,
    `1b. Darstellung ${lage.breite}×${lage.hoehe}: Navigation ${lage.navOben}–${lage.navUnten}, Überbreite: ${lage.ueberbreite}`,
  );

  // 2. Frage beantworten
  await gehe(seite, '#/sitzung?ids=schutz-001');
  await seite.locator('button[role=radio]', { hasText: '0,4 s' }).click();
  await seite.click('text=Antwort prüfen');
  const rueckmeldung = (await seite.locator('[role=status]').textContent()).replace(/\s+/g, ' ');
  pruefe(rueckmeldung.includes('Richtig'), `2. Frage beantwortet: ${rueckmeldung.slice(0, 30)}`);
  await bild('2-antwort');
  await seite.locator('footer button').click();

  // 3. Bildfrage
  await gehe(seite, '#/mehr/frage/schutz-016');
  const bildDa = await seite
    .waitForFunction(() => document.querySelector('main img')?.naturalWidth > 0, null, { timeout: 15_000 })
    .then(() => true, () => false);
  pruefe(bildDa, '3. Bildfrage zeigt das Bild');
  await bild('3-bildfrage');

  // 4. Zurück-Taste des Handys geht eine Seite zurück, statt die App zu schließen
  await geraet.shell('input keyevent KEYCODE_BACK');
  const zurueck = await seite
    .waitForFunction(() => !location.hash.includes('schutz-016'), null, { timeout: 10_000 })
    .then(() => true, () => false);
  pruefe(zurueck, `4. Zurück-Taste: jetzt bei ${await seite.evaluate(() => location.hash || '#/')}`);

  // 4b. Themenbereich mit Erklärung und Training
  await gehe(seite, '#/lernen/recht/recht-nav');
  const bereichDa = await seite
    .waitForSelector('text=📖 Erklärung', { timeout: 15_000 })
    .then(() => true, () => false);
  pruefe(bereichDa && (await text(seite)).includes('Training starten'), '4b. Themenbereich „NAV“ zeigt Erklärung und Training');
  await bild('4b-themenbereich');

  // 5. App beenden und neu starten → Lernstand noch da?
  seite = await starteApp();
  const nachNeustart = await heute(seite);
  pruefe(/Heute\s*1\s*\//.test(nachNeustart), `5. Lernstand nach Neustart: ${nachNeustart}`);

  // 6. Dunkles Design am Handy einschalten (App-Einstellung „Wie System“)
  await geraet.shell('cmd uimode night yes');
  const dunkel = await seite
    .waitForFunction(() => document.documentElement.classList.contains('dark'), null, { timeout: 15_000 })
    .then(() => true, () => false);
  pruefe(dunkel, '6. Dunkles Design folgt der Handy-Einstellung');
  await bild('6-dunkel');
  await geraet.shell('cmd uimode night no');

  // 7. Sicherung über „Speichern unter“ speichern
  await gehe(seite, '#/mehr/daten');
  log('   7a. tippe „Sicherung herunterladen“');
  await seite.click('text=Sicherung herunterladen');
  log('   7b. warte auf „Speichern unter“');
  await warteAufDateienApp('7. Speichern unter');
  log('   Speichern unter offen:', await vordergrund());
  await bild('7-speichern-unter');
  log('   7c. tippe „Speichern“');
  await geraet.tap({ text: /^(SAVE|Save|SPEICHERN|Speichern)$/ }, { timeout: 30_000 });
  log('   7d. warte auf Bestätigung in der App');
  const gesichert = await seite
    .waitForSelector('text=Sicherung erstellt', { timeout: 30_000 })
    .then(() => true, () => false);
  const downloads = (await geraet.shell('ls /sdcard/Download/')).toString();
  const datei = downloads.split(/\s+/).find((d) => /^trei-lernstand-.*\.json$/.test(d));
  pruefe(gesichert && !!datei, `7. Sicherung gespeichert: ${datei ?? 'keine Datei in Download/'}`);

  // 8. Lernstand zurücksetzen und über die Dateiauswahl wiederherstellen
  log('   8a. setze Lernstand zurück');
  await seite.click('text=Lernstand zurücksetzen …');
  await seite.locator('[role=dialog]').getByRole('button', { name: 'Zurücksetzen', exact: true }).click();
  await seite.locator('[role=dialog]').waitFor({ state: 'detached' });
  await gehe(seite, '#/');
  await seite.waitForSelector('text=Weiterlernen');
  const zurueckgesetzt = await heute(seite);
  await gehe(seite, '#/mehr/daten');
  log('   8b. öffne Dateiauswahl');
  await seite.click('text=📂 Sicherungsdatei wählen');
  await warteAufDateienApp('8. Dateiauswahl');
  await bild('8-dateiauswahl');
  log('   8c. wähle die Sicherung');
  await geraet.tap({ text: /^trei-lernstand-.*\.json$/ }, { timeout: 30_000 });
  await seite.locator('[role=dialog]').getByRole('button', { name: 'Wiederherstellen', exact: true }).click();
  await seite.waitForSelector('text=Lernstand wiederhergestellt', { timeout: 20_000 });
  await gehe(seite, '#/');
  await seite.waitForSelector('text=Weiterlernen');
  const wieder = await heute(seite);
  pruefe(/Heute\s*0\s*\//.test(zurueckgesetzt) && /Heute\s*1\s*\//.test(wieder), `8. Zurückgesetzt: ${zurueckgesetzt} → wiederhergestellt: ${wieder}`);
  await bild('8-wiederhergestellt');
} catch (e) {
  fehler.push(`Abbruch: ${e.message}`);
  await bild('abbruch').catch(() => {});
} finally {
  schreibeProtokoll();
  await geraet.close();
}

if (fehler.length) {
  console.error('\nFEHLER:\n' + fehler.join('\n'));
  process.exit(1);
}
console.log('\nAlles in Ordnung ✔');
// Die Verbindung zum Gerät hält Node sonst am Leben – ausdrücklich beenden.
process.exit(0);
