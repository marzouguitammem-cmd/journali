import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [out, file] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => console.log('[page]', m.type(), m.text()));
page.on('dialog', (d) => { console.log('dialog:', d.message()); d.accept(); });
await page.goto('http://localhost:5173/');
await page.click('.tabs >> text=المخططات');
const slot = page.locator('.card').filter({ hasText: 'السنة السادسة' }).locator('.slot').filter({ hasText: 'رياضيات' });
const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
await slot.locator('text=زيد مخطط').click();
await chooser;
await page.setInputFiles('input[accept^=".pdf"]', file);
console.log('file set', await page.evaluate(() => [...document.querySelectorAll('input[type=file]')].map((i) => i.files.length + ':' + i.accept)));
await page.waitForSelector('.sheet, .toast', { timeout: 30000 }).catch(() => {}); console.log('toast now:', await page.locator('.toast').textContent().catch(() => 'none'));
await page.screenshot({ path: `${out}/9-review.png` });
if (await page.locator('.sheet').count()) {
  await page.click('text=حفظ المخطط');
  await page.waitForTimeout(500);
  console.log('toast:', await page.locator('.toast').textContent().catch(() => ''));
}
console.log('errors:', errors);
await browser.close();
