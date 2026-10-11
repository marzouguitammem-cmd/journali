import { useRef } from 'react';
import { useStore } from '../lib/store';
import { DEFAULT_SCHEDULE } from '../data/defaults';
import { DAYS, LEVELS, SUBJECTS, type Level } from '../data/subjects';
import { saveFile, shareFile } from '../lib/exportFile';
import { today, type AppData } from '../lib/logic';
import { TopBar, useToast } from '../ui';
import type { DaySchedule, ScheduleBlock } from '../lib/types';

const SCHOOL_DAYS = DAYS.filter((d) => d !== 'الأحد');
declare const __APP_VERSION__: string;

export default function Settings() {
  const { data, setSchedule, setSettings, replaceAll } = useStore();
  const toast = useToast();
  const restoreRef = useRef<HTMLInputElement>(null);

  const sched = SCHOOL_DAYS.map((d) => data.schedule.find((x) => x.day === d) ?? { day: d, blocks: [] });
  const save = (days: DaySchedule[]) => setSchedule(days.filter((d) => d.blocks.length));
  const setDay = (day: string, blocks: ScheduleBlock[]) => save(sched.map((d) => (d.day === day ? { ...d, blocks } : d)));

  const backup = async (kind: 'share' | 'save') => {
    const blob = new Blob([JSON.stringify({ app: 'journali', version: 1, ...data }, null, 1)], { type: 'application/json' });
    const name = `جورنالي_نسخة_${today()}.json`;
    try {
      if (kind === 'share') await shareFile(blob, name, 'application/json');
      else toast('تحفظت في: ' + await saveFile(blob, name));
    } catch (e) { if (!/cancel|abort/i.test(String(e))) toast(String(e), 'err'); }
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text()) as Partial<AppData> & { app?: string };
      if (d.app !== 'journali' || !Array.isArray(d.plans) || !Array.isArray(d.journals)) throw new Error('موش نسخة احتياطية متاع جورنالي');
      if (!window.confirm(`النسخة فيها ${d.plans.length} مخطط و${d.journals.length} جورنال. تعوّض كل شي موجود توّا. نكمّل؟`)) return;
      replaceAll({ plans: d.plans, journals: d.journals, schedule: d.schedule ?? data.schedule, marks: d.marks ?? {}, settings: d.settings ?? data.settings });
      toast('ترجّعت النسخة.');
    } catch (e) { toast(String((e as Error)?.message ?? e), 'err'); }
    finally { if (restoreRef.current) restoreRef.current.value = ''; }
  };

  return (
    <div className="screen">
      <TopBar title="الإعدادات" />

      <section className="card">
        <h2>توزيع المواد الأسبوعي</h2>
        <p className="muted small">الأنشطة بالترتيب، والتوقيت يتحسب وحدو من بداية كل فترة.</p>
        {sched.map((d) => (
          <div className="day-ed" key={d.day}>
            <h3>{d.day}</h3>
            {d.blocks.map((b, bi) => {
              const setBlock = (nb: ScheduleBlock | null) => setDay(d.day, nb ? d.blocks.map((x, k) => (k === bi ? nb : x)) : d.blocks.filter((_, k) => k !== bi));
              return (
                <div className="block-ed" key={bi}>
                  <div className="row2">
                    <select value={b.level} onChange={(e) => setBlock({ ...b, level: e.target.value as Level })}>
                      {LEVELS.map((lv) => <option key={lv}>{lv}</option>)}
                    </select>
                    <label className="field inline"><span>من</span>
                      <input type="time" value={b.start} onChange={(e) => e.target.value && setBlock({ ...b, start: e.target.value })} />
                    </label>
                    <button className="icon-btn" onClick={() => window.confirm('نفسخ الفترة هذي؟') && setBlock(null)} aria-label="حذف">🗑</button>
                  </div>
                  {b.items.map((it, ii) => (
                    <div className="item-ed" key={ii}>
                      <select value={it.subject} onChange={(e) => setBlock({ ...b, items: b.items.map((x, k) => (k === ii ? { ...x, subject: e.target.value } : x)) })}>
                        {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
                      </select>
                      <input className="num" type="number" inputMode="numeric" min={5} step={5} value={it.minutes}
                        onChange={(e) => setBlock({ ...b, items: b.items.map((x, k) => (k === ii ? { ...x, minutes: Math.max(5, +e.target.value || 0) } : x)) })} />
                      <span className="muted small">د</span>
                      <button className="icon-btn" onClick={() => setBlock({ ...b, items: b.items.filter((_, k) => k !== ii) })} aria-label="حذف">✕</button>
                    </div>
                  ))}
                  <button className="link" onClick={() => setBlock({ ...b, items: [...b.items, { subject: 'رياضيات', minutes: 45 }] })}>➕ نشاط</button>
                </div>
              );
            })}
            <button className="link" onClick={() => setDay(d.day, [...d.blocks, { level: 'س5', start: '08:00', items: [{ subject: 'رياضيات', minutes: 60 }] }])}>➕ فترة (قسم)</button>
          </div>
        ))}
        <button className="btn small" onClick={() => window.confirm('نرجّعو التوزيع الأصلي 2026-2027؟') && setSchedule(DEFAULT_SCHEDULE)}>↩ التوزيع الأصلي</button>
      </section>

      <section className="card">
        <h2>نفس المادة مرّتين في نهار واحد</h2>
        <div className="chips">
          <button className={`chip ${data.settings.repeat === 'next' ? 'on' : ''}`} onClick={() => setSettings({ ...data.settings, repeat: 'next' })}>كل نشاط ياخو الدرس الموالي</button>
          <button className={`chip ${data.settings.repeat === 'same' ? 'on' : ''}`} onClick={() => setSettings({ ...data.settings, repeat: 'same' })}>نفس الدرس في النهار الكل</button>
        </div>
      </section>

      <section className="card">
        <h2>نسخة احتياطية</h2>
        <p className="muted small">المخططات والجورنالات والتقدّم محفوظين في التلفون. خوذ نسخة قبل ما تنحّي التطبيق ولا تبدّل التلفون.</p>
        <div className="row-btns">
          <button className="btn small" onClick={() => backup('share')}>📤 شارك نسخة</button>
          <button className="btn small" onClick={() => backup('save')}>💾 حفظ نسخة</button>
          <button className="btn small" onClick={() => restoreRef.current?.click()}>📥 رجّع نسخة</button>
        </div>
        <input ref={restoreRef} type="file" hidden accept=".json,application/json" onChange={(e) => restore(e.target.files?.[0])} />
      </section>

      <p className="muted small center">جورنالي {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''} — تمام مرزوقي · المدرسة الابتدائية السواني</p>
    </div>
  );
}
