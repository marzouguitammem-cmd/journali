// يولّد جورنالاً من ملف examples/*.json بالمولّد الجديد (للتحقّق من التطابق مع make_journal.js)
import fs from 'node:fs';
import path from 'node:path';
import { journalToBuffer, IMAGE_FILES, type JournalCfg } from '../src/journal/docx';

const [, , input, out] = process.argv;
const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
const cfg: JournalCfg = {
  day: raw.day, times: raw.times, range: raw.range, period: raw.period,
  acts: raw.acts.map((a: any[]) => ({ subject: a[0], level: a[1], time: a[2], dur: a[3], lesson: a[4] })),
};
const images = Object.fromEntries(IMAGE_FILES.map((f) => [f, new Uint8Array(fs.readFileSync(path.join(import.meta.dirname, '../public/assets', f)))]));
fs.writeFileSync(out, await journalToBuffer(cfg, images));
