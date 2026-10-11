// منطق التطبيق: التوقيت، التقدّم (وين وصلت)، تعمير الجورنال
import { dayName, periodIndex, type Level, type Mode } from '../data/subjects';
import type { JournalCfg } from '../journal/docx';
import type { DaySchedule, JAct, Journal, Lesson, Plan, ProgressMark, Settings } from './types';
import { slotKey } from './types';

export interface AppData {
  plans: Plan[];
  schedule: DaySchedule[];
  journals: Journal[];
  marks: Record<string, ProgressMark>;
  settings: Settings;
}

// ---------- تواريخ ----------
export const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const today = () => iso(new Date());
export const dayOf = (s: string) => dayName(parseIso(s));
export const fmtDate = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };

// ---------- التوقيت ----------
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const toTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export const daySchedule = (data: AppData, day: string) => data.schedule.find((d) => d.day === day);
export const teachingDays = (data: AppData) => data.schedule.filter((d) => d.blocks.some((b) => b.items.length)).map((d) => d.day);

/** أنشطة النهار من التوزيع، بالتوقيت محسوب */
export function scheduleActs(data: AppData, day: string): JAct[] {
  const ds = daySchedule(data, day);
  if (!ds) return [];
  const acts: JAct[] = [];
  for (const b of ds.blocks) {
    let t = toMin(b.start);
    for (const it of b.items) {
      acts.push({
        subject: it.subject, level: b.level, time: `${toTime(t)} – ${toTime(t + it.minutes)}`, dur: `${it.minutes} د`,
        lessonId: null, goal: [], content: [], aim: '', skills: [],
      });
      t += it.minutes;
    }
  }
  return acts;
}
function blockRanges(data: AppData, day: string) {
  const ds = daySchedule(data, day);
  return (ds?.blocks ?? []).filter((b) => b.items.length).map((b) => {
    const s = toMin(b.start), e = s + b.items.reduce((a, i) => a + i.minutes, 0);
    return { level: b.level, s: toTime(s), e: toTime(e) };
  });
}

/** أوّل نهار قراية من التاريخ هذا (هو نفسه إذا فيه قراية) */
export function nextTeachingDate(data: AppData, from: string): string {
  const days = teachingDays(data);
  if (!days.length) return from;
  let d = from;
  for (let k = 0; k < 14; k++) { if (days.includes(dayOf(d))) return d; d = addDays(d, 1); }
  return from;
}
/** أقرب تاريخ لنهار معيّن من الأسبوع */
export function nextDateForDay(day: string, from = today()): string {
  let d = from;
  for (let k = 0; k < 7; k++) { if (dayOf(d) === day) return d; d = addDays(d, 1); }
  return from;
}

// ---------- الدروس ----------
export function slotLessons(data: AppData, level: string, subject: string): Lesson[] {
  return data.plans.filter((p) => p.level === level && p.subject === subject)
    .sort((a, b) => periodIndex(a.period) - periodIndex(b.period))
    .flatMap((p) => [...p.lessons].sort((a, b) => a.n - b.n));
}
export function findLesson(data: AppData, id: string | null): Lesson | undefined {
  if (!id) return undefined;
  for (const p of data.plans) { const l = p.lessons.find((x) => x.id === id); if (l) return l; }
  return undefined;
}
export const lessonTitle = (l: Lesson) => l.content[0] || l.goal[0] || l.activity;

/** آخر درس منجز في مادة وقسم (من الجورنالات المحفوظة، أو من «وين وصلت» اليدوي) */
export function lastDone(data: AppData, level: string, subject: string, exceptJournal?: string): string | null {
  // كل حدث (جورنال أو تعديل يدوي) عندو مفتاح ترتيب: التاريخ ثم وقت التسجيل
  let best: { key: string; id: string | null } | null = null;
  for (const j of data.journals) {
    if (j.id === exceptJournal) continue;
    const acts = j.acts.filter((a) => a.level === level && a.subject === subject && a.lessonId);
    if (!acts.length) continue;
    const key = `${j.date}|${j.createdAt}`;
    if (!best || key > best.key) best = { key, id: acts[acts.length - 1].lessonId };
  }
  const m = data.marks[slotKey(level, subject)];
  if (m) {
    const key = `${m.date}|${m.at ?? ''}`;
    if (!best || key > best.key) best = { key, id: m.lessonId };
  }
  return best?.id ?? null;
}
export function nextLesson(data: AppData, level: string, subject: string, after: string | null): Lesson | null {
  const ls = slotLessons(data, level, subject);
  if (!ls.length) return null;
  if (!after) return ls[0];
  const i = ls.findIndex((l) => l.id === after);
  return i < 0 ? ls[0] : ls[i + 1] ?? null;
}

/** اقتراح الدروس لكل نشاط: الدرس الموالي لآخر درس منجز */
export function suggestLessons(data: AppData, acts: JAct[], exceptJournal?: string): (string | null)[] {
  const cursor = new Map<string, string | null>();
  const usedToday = new Map<string, string | null>();
  return acts.map((a) => {
    const k = slotKey(a.level, a.subject);
    if (data.settings.repeat === 'same' && usedToday.has(k)) return usedToday.get(k)!;
    const last = cursor.has(k) ? cursor.get(k)! : lastDone(data, a.level, a.subject, exceptJournal);
    const nx = nextLesson(data, a.level, a.subject, last);
    const id = nx?.id ?? null;
    if (id) cursor.set(k, id);
    usedToday.set(k, id);
    return id;
  });
}

/** عمّر نشاط بدرس (أو فرّغو) */
export function fillAct(a: JAct, l: Lesson | undefined | null): JAct {
  if (!l) return { ...a, lessonId: null, goal: [], content: [], aim: '', skills: [] };
  return { ...a, lessonId: l.id, goal: [...l.goal], content: [...l.content], aim: l.aim, skills: [...l.skills] };
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** نمط التعلّم: من نوع الحصص (إذا كلّهم إدماج ← إدماجي...)، وإلا منهجي */
export function guessMode(data: AppData, acts: JAct[]): Mode {
  const modes = acts.map((a) => findLesson(data, a.lessonId)?.mode).filter(Boolean) as Mode[];
  if (modes.length && modes.every((m) => m === modes[0])) return modes[0];
  return 'منهجي';
}

export function createJournal(data: AppData, date: string, lessonIds?: (string | null)[]): Journal {
  const day = dayOf(date);
  const base = scheduleActs(data, day);
  const ids = lessonIds ?? suggestLessons(data, base);
  const acts = base.map((a, i) => fillAct(a, findLesson(data, ids[i] ?? null)));
  const now = new Date().toISOString();
  return { id: uid(), date, day, mode: guessMode(data, acts), acts, createdAt: now, updatedAt: now };
}

/** تاريخ «النهار الجاي»: بعد آخر جورنال، وموش قبل اليوم */
export function nextJournalDate(data: AppData): string {
  const last = data.journals.map((j) => j.date).sort().pop();
  const t = today();
  const from = last && addDays(last, 1) > t ? addDays(last, 1) : t;
  return nextTeachingDate(data, from);
}

// ---------- تحويل إلى إعدادات المولّد ----------
export function journalToCfg(data: AppData, j: Journal): JournalCfg {
  const ranges = blockRanges(data, j.day);
  // التوقيت من أنشطة الجورنال نفسه (حتى لو تبدّل التوزيع بعد)
  const byLevel = new Map<Level, { s: string; e: string }>();
  for (const a of j.acts) {
    const [s, e] = a.time.split('–').map((x) => x.trim());
    const cur = byLevel.get(a.level);
    if (!cur) byLevel.set(a.level, { s, e });
    else cur.e = e;
  }
  const order = [...byLevel.keys()];
  const range: Record<string, string> = {};
  for (const [lv, r] of byLevel) range[lv] = `${r.s} – ${r.e}`;
  const times = order.map((lv) => `${byLevel.get(lv)!.s}–${byLevel.get(lv)!.e}`).join('   |   ') || ranges.map((r) => `${r.s}–${r.e}`).join('   |   ');
  const period: Record<string, string> = {};
  for (const a of j.acts) {
    const l = findLesson(data, a.lessonId);
    if (l && !period[a.level]) period[a.level] = l.period;
  }
  const [y, m, d] = j.date.split('-');
  const levels = (['س5', 'س6'] as Level[]).filter((lv) => byLevel.has(lv));
  return {
    day: j.day, times, range, period,
    date: `${d}  /  ${m}  /  ${y}`,
    classes: levels.length === 1 ? levels[0] : 'س5   •   س6',
    mode: j.mode || undefined,
    acts: j.acts.map((a) => ({
      subject: a.subject, level: a.level, time: a.time, dur: a.dur,
      lesson: { goal: a.goal.filter(Boolean), content: a.content.filter(Boolean), aim: a.aim.trim(), skills: a.skills.filter(Boolean) },
    })),
  };
}

export const journalFileName = (j: Journal) => `جورنال_${j.day}_${j.date}.docx`;
