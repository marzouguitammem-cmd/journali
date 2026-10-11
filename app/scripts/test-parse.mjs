// يجرّب قراءة المخططات في المتصفّح (Chromium) ويطبع الحصص
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const files = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.goto('http://localhost:5173/');
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const level = f.includes('س6') ? 'س6' : 'س5';
  const subject = f.includes('إيقاظ') ? 'إيقاظ علمي' : 'رياضيات';
  const res = await page.evaluate(async ([b64, name, level, subject]) => {
    const { parsePlanFile } = await import('/src/plans/index.ts');
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    try { return await parsePlanFile(name, bin.buffer, level, subject); } catch (e) { return { error: String(e && e.stack || e) }; }
  }, [b64, f.split('/').pop(), level, subject]);
  console.log('=====', f.split('/').pop());
  if (res.error) { console.log(res.error); continue; }
  console.log(JSON.stringify(res.meta));
  for (const l of res.lessons) console.log(l.n, l.activity, l.mode, '|', l.goal.join(' + '), '|', l.content.join(' + '), '|', l.skills.join('، '));
  if (process.env.AIMS) for (const l of res.lessons) console.log(l.n, l.aim);
}
await browser.close();
