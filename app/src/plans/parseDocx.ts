// قراءة مخطط Word (.docx): نبحث عن الجدول التفصيلي ونقرأ خاناته مع الخانات المدمجة
import JSZip from 'jszip';
import { clean } from '../lib/arabic';
import { headerCol, isHeaderRow, type Col, type RawRow } from './build';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function kids(el: Element, name: string): Element[] {
  return Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1 && (n as Element).localName === name);
}
function attr(el: Element | undefined, name: string): string | null {
  if (!el) return null;
  return el.getAttributeNS(W, name) ?? el.getAttribute('w:' + name);
}

function paraText(p: Element): string {
  let s = '';
  const walk = (n: Node) => {
    if (n.nodeType !== 1) return;
    const e = n as Element;
    if (e.localName === 't') s += e.textContent ?? '';
    else if (e.localName === 'tab') s += ' ';
    else if (e.localName === 'br') s += '\n';
    else e.childNodes.forEach(walk);
  };
  p.childNodes.forEach(walk);
  return s;
}
function cellParas(tc: Element): string[] {
  const out: string[] = [];
  const walk = (e: Element) => {
    for (const c of Array.from(e.children)) {
      if (c.localName === 'p') out.push(...paraText(c).split('\n'));
      else if (c.localName !== 'tcPr') walk(c);
    }
  };
  walk(tc);
  return out.map(clean).filter(Boolean);
}

interface GridCell { paras: string[] }

/** جدول ← شبكة: لكل سطر ولكل عمود في الشبكة الخانة التي تغطّيه */
function tableGrid(tbl: Element): GridCell[][] {
  const grid: GridCell[][] = [];
  for (const tr of kids(tbl, 'tr')) {
    const row: GridCell[] = [];
    let col = 0;
    for (const tc of kids(tr, 'tc')) {
      const pr = kids(tc, 'tcPr')[0];
      const span = +(attr(pr ? kids(pr, 'gridSpan')[0] : undefined, 'val') ?? 1) || 1;
      const vm = pr ? kids(pr, 'vMerge')[0] : undefined;
      const cont = !!vm && (attr(vm, 'val') ?? 'continue') !== 'restart';
      let cell: GridCell;
      if (cont && grid.length && grid[grid.length - 1][col]) cell = grid[grid.length - 1][col];
      else cell = { paras: cellParas(tc) };
      for (let k = 0; k < span; k++) row[col + k] = cell;
      col += span;
    }
    grid.push(row);
  }
  return grid;
}

export async function parseDocx(data: ArrayBuffer): Promise<{ rows: RawRow[]; text: string }> {
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('الملف ليس ملف Word صالحاً');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const allText = Array.from(doc.getElementsByTagNameNS(W, 'p')).slice(0, 60).map(paraText).join(' ');

  const tables = Array.from(doc.getElementsByTagNameNS(W, 'tbl'));
  for (const tbl of tables) {
    const grid = tableGrid(tbl);
    const hi = grid.findIndex((r) => isHeaderRow(r.map((c) => c?.paras.join(' ') ?? '')));
    if (hi < 0) continue;
    const cols: Col[] = grid[hi].map((c) => headerCol(c?.paras.join(' ') ?? ''));
    const rows: RawRow[] = [];
    for (const r of grid.slice(hi + 1)) {
      const row: RawRow = { session: '', activity: '', goal: [], content: [], skills: [], other: [] };
      const seen = new Set<GridCell>();
      r.forEach((cell, i) => {
        if (!cell) return;
        const col = cols[i] ?? 'other';
        if (col === 'project') return;
        if (seen.has(cell) && (col === 'other' || col === 'session')) return;
        seen.add(cell);
        if (col === 'session') row.session = cell.paras.join(' ');
        else if (col === 'activity') row.activity = cell.paras.join(' ');
        else if (col === 'goal' || col === 'content' || col === 'skills') row[col].push(...cell.paras.filter((p) => !row[col].includes(p)));
        else row.other.push(...cell.paras);
      });
      rows.push(row);
    }
    return { rows, text: allText };
  }
  throw new Error('ما لقيتش «الجدول التفصيلي للحصص» في الملف (جدول فيه «الهدف المميز» و«المحتوى»).');
}
