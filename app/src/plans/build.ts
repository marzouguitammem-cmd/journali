// تحويل سطور الجدول التفصيلي (من Word أو PDF) إلى حصص
import { clean, norm, ordinalToNumber, uniq } from '../lib/arabic';
import { makeAim } from '../lib/aim';
import type { Lesson, Plan } from '../lib/types';
import { PERIODS, SUBJECTS, type Level, type Mode } from '../data/subjects';

export type Col = 'session' | 'activity' | 'goal' | 'content' | 'skills' | 'project' | 'other';

/** سطر خام من الجدول: لكل عمود فقرات النصّ */
export interface RawRow { session: string; activity: string; goal: string[]; content: string[]; skills: string[]; other: string[] }

export function headerCol(text: string): Col {
  const t = norm(text);
  if (/الحصص|الحصه|^ر$|^ع ر$|رقم/.test(t)) return 'session';
  if (/النشاط/.test(t)) return 'activity';
  if (/الهدف|الاهداف/.test(t)) return 'goal';
  if (/المحتوي|المحتويات|المضامين/.test(t)) return 'content';
  if (/مهارات|المهارات/.test(t)) return 'skills';
  if (/مهام المشروع/.test(t)) return 'project';
  return 'other';
}
export const isHeaderRow = (cells: string[]) => {
  const cols = cells.map(headerCol);
  return cols.includes('goal') && cols.includes('content');
};

const SPECIAL: [RegExp, Mode, string][] = [
  [/ادماج/, 'إدماجي', 'إدماج'],
  [/تقييم/, 'تقييمي', 'تقييم'],
  [/دعم|علاج/, 'دعم وعلاج', 'دعم وعلاج'],
];
function special(row: RawRow): [Mode, string] | null {
  for (const s of [row.session, row.activity]) {
    const t = norm(s);
    if (!t || t.length > 20) continue;
    for (const [re, mode, act] of SPECIAL) if (re.test(t)) return [mode, act];
  }
  return null;
}

/** «∑ حساب» ← «حساب»، «m² نظام قيس» ← «قيس» */
export function cleanActivity(s: string): string {
  let t = clean(s.replace(/[^؀-ۿ\s]/g, ' '));
  if (norm(t).includes('قيس')) t = 'قيس';
  return t;
}

/** تقسيم النصّ عند الفاصل « — » كما في المخططات */
const splitDash = (paras: string[]) => paras.flatMap((p) => p.split(/\s+—\s+/)).map(clean).filter(Boolean);
const dropBullet = (s: string) => clean(s.replace(/^[•●▪◦·\-–]\s*/, ''));

export interface Meta { level?: Level; subject?: string; period?: string }

export function detectMeta(text: string, fileName = ''): Meta {
  const t = norm(text + ' ' + fileName.replace(/[_\-.]/g, ' '));
  const meta: Meta = {};
  if (/الخامسه|س5|س 5/.test(t)) meta.level = 'س5';
  else if (/السادسه|س6|س 6/.test(t)) meta.level = 'س6';
  const pm = t.match(/الفتره\s+(\S+)/);
  if (pm) {
    const n = ordinalToNumber(pm[1]);
    if (n && n <= PERIODS.length) meta.period = PERIODS[n - 1];
  }
  for (const s of SUBJECTS) if (s.keys.some((k) => t.includes(norm(k)))) { meta.subject = s.name; break; }
  return meta;
}

export function rowsToLessons(rows: RawRow[], level: Level, subject: string, period: string): Lesson[] {
  const code = SUBJECTS.find((s) => s.name === subject)?.code ?? 'x';
  const pNo = Math.max(1, PERIODS.indexOf(period) + 1);
  const out: Lesson[] = [];
  let lastLabel = '';
  for (const row of rows) {
    const sp = special(row);
    const label = clean(row.session);
    const num = /^\d+$/.test(label) ? +label : null;
    const goal = splitDash(row.goal.map(dropBullet));
    const content = splitDash(row.content.map(dropBullet));
    const skills = uniq(row.skills.map(dropBullet).flatMap((s) => s.split(/\s*[·،]\s*/)).map(clean).filter(Boolean));
    if (sp) {
      // سطر الإدماج / التقييم / الدعم: النصّ ممدود على عدّة أعمدة
      const text = clean(uniq([...row.goal, ...row.content, ...row.other].map(dropBullet).filter(Boolean)).join(' '));
      out.push({
        id: '', level, subject, period, n: num ?? out.length + 1, activity: sp[1], mode: sp[0],
        goal: text ? [text] : [], content: [], skills, aim: '',
      });
      lastLabel = label;
      continue;
    }
    if (!goal.length && !content.length) continue;
    const prev = out[out.length - 1];
    if (prev && num !== null && label === lastLabel && prev.mode === 'منهجي') {
      // نفس رقم الحصة في عدّة أسطر ← حصة واحدة
      prev.goal = uniq([...prev.goal, ...goal]);
      prev.content = uniq([...prev.content, ...content]);
      prev.skills = uniq([...prev.skills, ...skills]);
      continue;
    }
    out.push({
      id: '', level, subject, period, n: num ?? out.length + 1, activity: cleanActivity(row.activity) || (prev?.activity ?? ''),
      mode: 'منهجي', goal, content, skills, aim: '',
    });
    lastLabel = label;
  }
  // ترقيم متسلسل ومعرّفات وأهداف الحصص
  out.forEach((l, i) => {
    if (out.some((o, j) => j < i && o.n >= l.n)) l.n = out[i - 1].n + 1;
    l.id = `${level === 'س5' ? 's5' : 's6'}-${code}-${pNo}-${l.n}`;
    l.aim = makeAim(l);
  });
  return out;
}

export function makePlan(lessons: Lesson[], level: Level, subject: string, period: string, fileName: string): Plan {
  return {
    id: `${level}|${subject}|${period}`,
    level, subject, period, fileName, addedAt: new Date().toISOString(),
    lessons,
  };
}
