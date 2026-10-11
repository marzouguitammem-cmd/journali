import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import {
  createJournal, dayOf, findLesson, fmtDate, lastDone, lessonTitle, nextDateForDay, nextJournalDate, scheduleActs,
  slotLessons, suggestLessons, teachingDays, today,
} from '../lib/logic';
import { periodIndex } from '../data/subjects';
import { SubjectTag, TopBar, useToast } from '../ui';
import type { Journal } from '../lib/types';

export default function Home({ openJournal, goPlans }: { openJournal: (id: string) => void; goPlans: () => void }) {
  const { data, saveJournal } = useStore();
  const toast = useToast();

  // ---------- النهار الجاي ----------
  const nextDate = nextJournalDate(data);
  const nextPreview = useMemo(() => {
    const acts = scheduleActs(data, dayOf(nextDate));
    const ids = suggestLessons(data, acts);
    return acts.map((a, i) => ({ a, l: findLesson(data, ids[i]) }));
  }, [data, nextDate]);

  const save = (j: Journal) => {
    const old = data.journals.find((x) => x.date === j.date);
    if (old && !window.confirm(`عندك جورنال محفوظ نهار ${old.day} ${fmtDate(old.date)}. نعوّضو بالجديد؟`)) return;
    if (old) j = { ...j, id: old.id, createdAt: old.createdAt };
    saveJournal(j);
    openJournal(j.id);
  };

  const makeNext = () => {
    if (!nextPreview.length) { toast('ما فماش أنشطة في التوزيع. زيدها من الإعدادات.', 'err'); return; }
    save(createJournal(data, nextDate));
  };

  // ---------- جورنال بأرقام الدروس ----------
  const days = teachingDays(data);
  const [day, setDay] = useState(days[0] ?? 'السبت');
  const [date, setDate] = useState(() => nextDateForDay(days[0] ?? 'السبت'));
  const acts = useMemo(() => scheduleActs(data, day), [data, day]);
  const suggested = useMemo(() => suggestLessons(data, acts), [data, acts]);
  // لكل نشاط: الفترة + رقم الدرس (نصّ فارغ = فارغ)
  const [picks, setPicks] = useState<Record<string, { period: string; n: string }>>({});
  const pickKey = (i: number) => `${day}#${i}`;
  const pickOf = (i: number) => {
    const p = picks[pickKey(i)];
    if (p) return p;
    const l = findLesson(data, suggested[i]);
    const slot = slotLessons(data, acts[i].level, acts[i].subject);
    return { period: l?.period ?? slot[slot.length - 1]?.period ?? '', n: l ? String(l.n) : '' };
  };
  const resolve = (i: number) => {
    const p = pickOf(i);
    if (!p.n.trim()) return null;
    return slotLessons(data, acts[i].level, acts[i].subject).find((l) => l.period === p.period && l.n === +p.n) ?? null;
  };
  const existing = data.journals.find((j) => j.date === date);

  const makeManual = () => {
    if (dayOf(date) !== day) { toast(`التاريخ ${fmtDate(date)} موش نهار ${day}.`, 'err'); return; }
    const bad = acts.map((_, i) => i).filter((i) => pickOf(i).n.trim() && !resolve(i));
    if (bad.length) { toast(`رقم درس موش موجود في المخطط: ${bad.map((i) => acts[i].subject + ' ' + acts[i].level).join('، ')}`, 'err'); return; }
    save(createJournal(data, date, acts.map((_, i) => resolve(i)?.id ?? null)));
  };

  const recent = [...data.journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <div className="screen">
      <TopBar title="جورنالي" />

      <section className="card hero">
        <div className="hero-head">
          <div>
            <h2>جورنال النهار الجاي</h2>
            <p className="muted">{dayOf(nextDate)} {fmtDate(nextDate)} — يكمّل من وين وصلت</p>
          </div>
        </div>
        <ul className="preview">
          {nextPreview.map(({ a, l }, i) => (
            <li key={i}>
              <SubjectTag subject={a.subject} level={a.level} />
              <span className="pv-lesson">{l ? `الدرس ${l.n}: ${lessonTitle(l)}` : <em className="muted">فارغ</em>}</span>
            </li>
          ))}
        </ul>
        <button className="btn primary big" onClick={makeNext}>⏭ اصنع جورنال {dayOf(nextDate)}</button>
      </section>

      <section className="card">
        <h2>جورنال بأرقام الدروس</h2>
        <div className="chips">
          {days.map((d) => (
            <button key={d} className={`chip ${d === day ? 'on' : ''}`} onClick={() => { setDay(d); setDate(nextDateForDay(d, today())); }}>{d}</button>
          ))}
        </div>
        <label className="field inline">
          <span>التاريخ</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        {existing && (
          <div className="note">
            عندك جورنال محفوظ لهذا التاريخ. <button className="link" onClick={() => openJournal(existing.id)}>افتحو</button>
          </div>
        )}
        <div className="acts-pick">
          {acts.map((a, i) => {
            const slot = slotLessons(data, a.level, a.subject);
            const p = pickOf(i);
            const l = resolve(i);
            const periods = [...new Set(slot.map((x) => x.period))].sort((x, y) => periodIndex(x) - periodIndex(y));
            const last = findLesson(data, lastDone(data, a.level, a.subject));
            return (
              <div className="pick-row" key={i}>
                <div className="pick-head">
                  <SubjectTag subject={a.subject} level={a.level} />
                  <span className="muted small">{a.time}</span>
                </div>
                {slot.length ? (
                  <>
                    <div className="pick-ctl">
                      <span>الدرس رقم</span>
                      <input className="num" type="number" inputMode="numeric" min={1} placeholder="فارغ" value={p.n}
                        onChange={(e) => setPicks({ ...picks, [pickKey(i)]: { ...p, n: e.target.value } })} />
                      {periods.length > 1 && (
                        <select value={p.period} onChange={(e) => setPicks({ ...picks, [pickKey(i)]: { ...p, period: e.target.value } })}>
                          {periods.map((x) => <option key={x} value={x}>الفترة {x}</option>)}
                        </select>
                      )}
                      {p.n && <button className="link" onClick={() => setPicks({ ...picks, [pickKey(i)]: { ...p, n: '' } })}>فارغ</button>}
                    </div>
                    <div className="pick-info">
                      {p.n.trim() ? (l ? <span>✔ {lessonTitle(l)}</span> : <span className="err">ما فماش درس رقم {p.n} في الفترة {p.period}</span>) : <span className="muted">يتعمّر فارغ</span>}
                      {last && <span className="muted small"> · آخر منجز: {last.n}</span>}
                    </div>
                  </>
                ) : (
                  <div className="pick-info muted">ما فماش مخطط للمادة هذي — تتعمّر فارغة. <button className="link" onClick={goPlans}>زيد مخطط</button></div>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn primary" onClick={makeManual} disabled={!acts.length}>✍️ عمّر الجورنال</button>
      </section>

      {recent.length > 0 && (
        <section className="card">
          <h2>الجورنالات السابقة</h2>
          <ul className="list">
            {recent.map((j) => (
              <li key={j.id}>
                <button className="row-btn" onClick={() => openJournal(j.id)}>
                  <span><b>{j.day}</b> {fmtDate(j.date)}</span>
                  <span className="muted small">
                    {j.acts.filter((a) => a.lessonId).length}/{j.acts.length} أنشطة معمّرة {j.exported ? '· 📤' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="muted small center">{data.journals.length ? `${data.journals.length} جورنال محفوظ` : 'ما زال ما صنعت حتى جورنال'}</p>
    </div>
  );
}
