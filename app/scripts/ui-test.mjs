// تجربة الواجهة في Chromium (مقاس تلفون) + صور شاشة + تصدير جورنال
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true, locale: 'ar-TN' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', (d) => d.accept());
await page.clock.setFixedTime(new Date('2026-10-13T09:00:00'));   // الثلاثاء
await page.goto('http://localhost:5173/');
await page.waitForSelector('.hero');
await page.screenshot({ path: `${out}/1-home.png`, fullPage: true });
// النهار الجاي
await page.click('text=اصنع جورنال');
await page.waitForSelector('.editor');
await page.screenshot({ path: `${out}/2-editor.png`, fullPage: true });
// بدّل الدرس في النشاط الثاني
await page.locator('.act').nth(2).locator('text=بدّل الدرس').click();
await page.screenshot({ path: `${out}/3-change.png` });
await page.locator('.sheet .lesson-opt').nth(3).click();
// صياغة أخرى + فسخ
await page.locator('.act').nth(0).locator('text=صياغة أخرى').click();
await page.locator('.act').nth(3).locator('text=فسخ').click();
await page.waitForTimeout(600);
const dl = page.waitForEvent('download');
await page.click('text=حفظ في الهاتف');
const d = await dl;
await d.saveAs(`${out}/journal.docx`);
await page.screenshot({ path: `${out}/4-editor-after.png`, fullPage: true });
await page.click('.topbar .back');
await page.click('text=المخططات');
await page.screenshot({ path: `${out}/5-plans.png`, fullPage: true });
await page.click('text=وين وصلت');
await page.screenshot({ path: `${out}/6-progress.png`, fullPage: true });
await page.click('.tabs >> text=الإعدادات');
await page.screenshot({ path: `${out}/7-settings.png`, fullPage: true });
await page.click('.tabs >> text=الجورنال');
await page.screenshot({ path: `${out}/8-home-after.png`, fullPage: true });
console.log('errors:', errors);
await browser.close();
