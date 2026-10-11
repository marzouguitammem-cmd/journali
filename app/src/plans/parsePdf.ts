// قراءة مخطط PDF بلا إنترنت.
// النصّ من pdf.js (يرتّب العربية وحده)، وحدود الخانات (مع الخانات المدمجة) من رسم الصفحة وتحليل البكسلات:
// هكا ما يهمّش كيفاش البرنامج اللي صنع الـ PDF رسم الجدول.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { clean, fixLamAlef, norm } from '../lib/arabic';
import { headerCol, isHeaderRow, type Col, type RawRow } from './build';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const SCALE = 2;

interface Item { s: string; x0: number; x1: number; y0: number; y1: number; cx: number; cy: number }
interface Span { a: number; b: number }
interface ColRange extends Span { col: Col; label: string }

class Pixels {
  data: Uint8ClampedArray; w: number; h: number;
  constructor(data: Uint8ClampedArray, w: number, h: number) { this.data = data; this.w = w; this.h = h; }
  at(x: number, y: number): [number, number, number] {
    const i = (Math.round(y) * this.w + Math.round(x)) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }
}
const dist = (p: number[], q: number[]) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));

/** نجمع العناصر في أسطر حسب ارتفاعها */
function toLines(items: Item[]): Item[][] {
  const sorted = [...items].sort((p, q) => p.cy - q.cy);
  const lines: Item[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    const h = it.y1 - it.y0;
    if (last && Math.abs(last[0].cy - it.cy) < h * 0.45) last.push(it);
    else lines.push([it]);
  }
  return lines.map((l) => l.sort((p, q) => q.cx - p.cx)); // من اليمين إلى اليسار
}

const BULLET = /^[•●▪◦·]$/;
/** نلصق عناصر السطر: فراغ فقط إذا كانت بينهم مسافة حقيقية */
function joinLine(l: Item[]): string {
  let out = '';
  l.forEach((it, k) => {
    if (k) {
      const prev = l[k - 1];
      const gap = prev.x0 - it.x1;
      if (gap > (it.y1 - it.y0) * 0.12 && !out.endsWith(' ') && !it.s.startsWith(' ')) out += ' ';
    }
    out += it.s;
  });
  // الأرقام مع علامة الدرجة تخرج مبعثرة: «90، ° 45» ← «90° ، 45»
  return out.replace(/(\d+)\s*([،,])\s*°/g, '$1° $2').replace(/\s*،\s*/g, ' ، ');
}
/** أسطر ← فقرات: فقرة جديدة عند نقطة (•) أو فراغ عمودي كبير */
function toParas(items: Item[]): string[] {
  const lines = toLines(items);
  const hs = lines.map((l) => Math.max(...l.map((i) => i.y1 - i.y0))).sort((a, b) => a - b);
  const lh = hs[Math.floor(hs.length / 2)] || 10;
  const tops = lines.map((l) => Math.min(...l.map((i) => i.y0)));
  const bottoms = lines.map((l) => Math.max(...l.map((i) => i.y1)));
  const gaps = lines.slice(1).map((_, k) => tops[k + 1] - bottoms[k]);
  const base = gaps.length >= 2 ? Math.min(...gaps) : Infinity;
  const paras: string[] = [];
  lines.forEach((l, k) => {
    const bullet = BULLET.test(l[0].s.trim());
    const txt = clean(joinLine(l.filter((i) => !BULLET.test(i.s.trim()))));
    const gap = k ? gaps[k - 1] : 0;
    if (!paras.length || bullet || gap > lh * 0.75 || gap > base + lh * 0.15) paras.push(txt);
    else paras[paras.length - 1] = clean(paras[paras.length - 1] + ' ' + txt);
  });
  return paras.filter(Boolean);
}

/**
 * تقسيم عمود إلى خانات: الخانة = مساحة بنفس لون الخلفية؛ أي سطر موحّد بلون مختلف (خطّ رقيق أو خلفية أخرى) = حدّ.
 * الأسطر اللي فيها كتابة ما تتحسبش (موش موحّدة).
 */
export function segments(px: Pixels, xr: Span, y0: number, y1: number): Span[] {
  const xs: number[] = [];
  for (let x = xr.a + 4; x <= xr.b - 4; x += 3) xs.push(x);
  if (xs.length < 2) return [];
  const rowColor = (y: number): number[] | null => {
    const cs = xs.map((x) => px.at(x, y));
    const ref = cs[Math.floor(cs.length / 2)];
    return cs.every((c) => dist(c, ref) < 14) ? ref : null;
  };
  const Y0 = Math.max(0, Math.round(y0)), Y1 = Math.min(px.h - 1, Math.round(y1));
  const colors: (number[] | null)[] = [];
  for (let y = Y0; y <= Y1; y++) colors.push(rowColor(y));
  const segs: Span[] = [];
  let cur: { a: number; b: number; color: number[] } | null = null;
  for (let k = 0; k < colors.length; k++) {
    const c = colors[k], y = Y0 + k;
    if (!c) { if (cur) cur.b = y; continue; }
    if (cur && dist(cur.color, c) < 10) { cur.b = y; continue; }
    if (cur) { segs.push({ a: cur.a, b: cur.b }); cur = null; }
    // خانة جديدة تبدا عند سطرين متتاليين بنفس اللون (الخطوط الرقيقة ما تبداش خانة)
    const n = colors[k + 1];
    if (n && dist(n, c) < 6) cur = { a: y, b: y, color: c };
  }
  if (cur) segs.push({ a: cur.a, b: cur.b });
  return segs.filter((s) => s.b - s.a >= 7);
}

/** أعمدة الجدول من سطر العناوين: نتبع لون خلفية العناوين يمين ويسار كل عنوان */
export function columns(px: Pixels, header: Item[]): ColRange[] {
  const top = Math.min(...header.map((i) => i.y0)), bottom = Math.max(...header.map((i) => i.y1));
  const ys = [top - 3, bottom + 3].filter((y) => y >= 0 && y < px.h);
  // نجمع عناصر نفس العنوان (مثلاً «مكون» و«الكفاية»)
  const labels = [...header].sort((p, q) => q.cx - p.cx);
  const bgAt = (x: number) => ys.map((y) => px.at(x, y));
  const out: ColRange[] = [];
  for (const it of labels) {
    if (out.some((c) => it.cx >= c.a && it.cx <= c.b)) {
      const c = out.find((c) => it.cx >= c.a && it.cx <= c.b)!;
      c.label += ' ' + it.s;
      continue;
    }
    const ref = bgAt(it.cx);
    const same = (x: number) => bgAt(x).some((c, k) => dist(c, ref[k]) < 30);
    let a = it.cx, b = it.cx;
    while (a > 0 && same(a - 1)) a--;
    while (b < px.w - 1 && same(b + 1)) b++;
    out.push({ a, b, col: 'other', label: it.s });
  }
  // إذا الخلفية ما فرّقتش بين الأعمدة نرجعو لنصف المسافة بين العناوين
  const overlapping = out.some((c, i) => out.some((d, j) => i !== j && c.a < d.b && d.a < c.b));
  if (overlapping) {
    out.sort((p, q) => (p.a + p.b) - (q.a + q.b));
    const centers = out.map((c) => (Math.min(...labels.filter((l) => l.cx >= c.a && l.cx <= c.b).map((l) => l.x0)) + Math.max(...labels.filter((l) => l.cx >= c.a && l.cx <= c.b).map((l) => l.x1))) / 2);
    out.forEach((c, i) => {
      c.a = i ? (centers[i - 1] + centers[i]) / 2 : 0;
      c.b = i < out.length - 1 ? (centers[i] + centers[i + 1]) / 2 : px.w;
    });
  }
  out.forEach((c) => { c.col = headerCol(c.label); });
  return out;
}

/**
 * حرف «لا» المركّب: pdf.js يقلب حروفه (األعداد). من قائمة الرسم نعرفو أنهي حروف جاية من نفس الرسمة (glyph)
 * ونرجّعوها لترتيبها الصحيح. إذا ما نجمناش نطابقو، نستعملو قواعد fixLamAlef.
 */
const isLig = (u: string) => u.length === 2 && u[0] === 'ل' && /[اأإآ]/.test(u[1]);
function alignFix(s: string, units: string[]): string | null {
  const fl: { ch: string; lig: boolean }[] = [];
  for (const u of [...units].reverse()) {
    if (isLig(u)) fl.push({ ch: u[1], lig: true }, { ch: u[0], lig: false });
    else for (const ch of u) if (!/\s/.test(ch)) fl.push({ ch, lig: false });
  }
  const sc = [...s];
  const out = [...sc];
  let j = 0;
  for (let k = 0; k < sc.length; k++) {
    if (/\s/.test(sc[k])) continue;
    if (j >= fl.length || fl[j].ch !== sc[k]) return null;
    if (fl[j].lig) {
      if (sc[k + 1] !== fl[j + 1].ch) return null;
      out[k] = fl[j + 1].ch; out[k + 1] = fl[j].ch; k++; j += 2; continue;
    }
    j++;
  }
  return j === fl.length ? out.join('') : null;
}
function glyphRuns(ops: { fnArray: number[]; argsArray: unknown[][] }): string[][] {
  const runs: string[][] = [];
  ops.fnArray.forEach((fn, i) => {
    if (fn !== pdfjs.OPS.showText) return;
    const units = (ops.argsArray[i][0] as unknown[])
      .filter((g): g is { unicode?: string } => !!g && typeof g === 'object')
      .map((g) => String(g.unicode ?? '').normalize('NFKC'));
    if (units.join('').trim()) runs.push(units);
  });
  return runs;
}
const ARABIC = /[\u0600-\u06FF]/;

const inside = (it: Item, x: Span, y: Span) => it.cx >= x.a && it.cx <= x.b && it.cy >= y.a && it.cy <= y.b;
const overlap = (p: Span, q: Span) => Math.max(0, Math.min(p.b, q.b) - Math.max(p.a, q.a));
const SPECIAL_RE = /ادماج|تقييم|دعم|علاج/;

export async function parsePdf(data: ArrayBuffer): Promise<{ rows: RawRow[]; text: string }> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  let text = '';
  const rows: RawRow[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: SCALE });
    const tc = await page.getTextContent();
    const runs = glyphRuns(await page.getOperatorList());
    let rp = 0;
    const fixText = (str: string) => {
      if (!ARABIC.test(str)) return str;
      for (let q = rp; q < Math.min(runs.length, rp + 8); q++) {
        const r = alignFix(str, runs[q]);
        if (r !== null) { rp = q + 1; return r; }
      }
      return fixLamAlef(str);
    };
    const items: Item[] = [];
    for (const raw of tc.items) {
      if (!('str' in raw) || !raw.str.trim()) continue;
      const [, , c, d, e, f] = raw.transform as number[];
      const fh = Math.hypot(c, d) || raw.height || 10;
      const [x0, yb] = vp.convertToViewportPoint(e, f);
      const w = raw.width * SCALE, h = fh * SCALE;
      const xa = Math.min(x0, x0 + w), xb = Math.max(x0, x0 + w);
      items.push({ s: fixText(raw.str), x0: xa, x1: xb, y0: yb - h * 0.8, y1: yb + h * 0.2, cx: (xa + xb) / 2, cy: yb - h * 0.3 });
    }
    if (p <= 2) text += ' ' + items.map((i) => i.s).join(' ');

    // سطر العناوين
    const lines = toLines(items);
    const hl = lines.find((l) => isHeaderRow(l.map((i) => i.s)));
    if (!hl) continue;
    const hBand = { a: Math.min(...hl.map((i) => i.y0)) - 12, b: Math.max(...hl.map((i) => i.y1)) + 12 };
    const header = items.filter((i) => i.cy >= hBand.a && i.cy <= hBand.b);

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas } as Parameters<typeof page.render>[0]).promise;
    const px = new Pixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);

    const cols = columns(px, header);
    const sess = cols.find((c) => c.col === 'session') ?? cols.find((c) => c.col === 'activity');
    if (!sess) continue;
    const bodyTop = Math.max(...header.map((i) => i.y1)) + 4;
    const tableX = { a: Math.min(...cols.map((c) => c.a)), b: Math.max(...cols.map((c) => c.b)) };
    const body = items.filter((i) => i.cy > bodyTop && i.cx >= tableX.a && i.cx <= tableX.b);

    // سطور الحصص = خانات عمود «الحصص»
    let sRows = segments(px, sess, bodyTop, px.h).filter((s) => body.some((i) => i.cy >= s.a && i.cy <= s.b));
    // نوقفو عند آخر خانة فيها كتابة في عمود الحصص
    const lastIdx = sRows.map((s) => body.some((i) => inside(i, sess, s))).lastIndexOf(true);
    sRows = sRows.slice(0, lastIdx + 1);

    // خانات كل عمود
    const cells = cols.filter((c) => c !== sess).map((c) => ({
      c, segs: segments(px, c, bodyTop, sRows.length ? sRows[sRows.length - 1].b + 2 : px.h),
    }));

    for (const r of sRows) {
      const row: RawRow = { session: '', activity: '', goal: [], content: [], skills: [], other: [] };
      row.session = clean(toParas(body.filter((i) => inside(i, sess, r))).join(' '));
      const isSpecial = SPECIAL_RE.test(norm(row.session));
      if (isSpecial) {
        // سطر الإدماج / التقييم / الدعم: النصّ ممدود على عدّة أعمدة
        const skip = cols.filter((c) => c === sess || c.col === 'skills' || c.col === 'project');
        const its = body.filter((i) => i.cy >= r.a && i.cy <= r.b && !skip.some((c) => i.cx >= c.a && i.cx <= c.b));
        row.goal = [clean(toParas(its).join(' '))].filter(Boolean);
      }
      for (const { c, segs } of cells) {
        if (c.col === 'project' || c.col === 'other') continue;
        if (isSpecial && c.col !== 'skills') continue;
        for (const s of segs) {
          const ov = overlap(s, r);
          if (ov < (r.b - r.a) * 0.5 && ov < (s.b - s.a) * 0.5) continue;
          const paras = toParas(body.filter((i) => inside(i, c, s)));
          if (c.col === 'activity') row.activity = clean(row.activity + ' ' + paras.join(' '));
          else if (c.col === 'goal' || c.col === 'content' || c.col === 'skills') row[c.col].push(...paras);
        }
      }
      rows.push(row);
    }
  }
  if (!rows.length) throw new Error('ما لقيتش «الجدول التفصيلي للحصص» في الملف (جدول فيه «الهدف المميز» و«المحتوى»).');
  return { rows, text };
}
