import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import {
  dayOf, scheduleActs, fillAct, findLesson, fmtDate, journalFileName, lessonTitle, slotLessons, suggestLessons,
} from '../lib/logic';
import { makeAim } from '../lib/aim';
import { DOCX_MIME, journalBlob, saveFile, shareFile } from '../lib/exportFile';
import { MODES, periodIndex, subjectInfo, type Mode } from '../data/subjects';
import { LinesField, Sheet, SubjectTag, TopBar, useToast } from '../ui';
import type { JAct, Journal, Lesson } from '../lib/types';

export default function JournalEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, saveJournal, deleteJournal, setPlans } = useStore();
  const toast = useToast();
  const stored = data.journals.find((j) => j.id === id);
  const [j, setJ] = useState<Journal | null>(stored ?? null);
  const [changing, setChanging] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const variants = useRef<Record<number, number>>({});

  // حفظ تلقائي
  useEffect(() => {
    if (!j || j === stored) return;
    const t = setTimeout(() => saveJournal(j), 400);
    return () => clearTimeout(t);
  }, [j]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!j) return <div className="screen"><TopBar title="جورنال" onBack={onClose} /><p className="center muted">الجورنال هذا تفسخ.</p></div>;

  const setAct = (i: number, a: JAct) => setJ({ ...j, acts: j.acts.map((x, k) => (k === i ? a : x)) });

  const changeDate = (date: string) => {
    if (dayOf(date) === j.day) { setJ({ ...j, date }); return; }
    if (!window.confirm(`التاريخ الجديد نهار ${dayOf(date)}: الأنشطة تتبدّل حسب التوزيع وتتعمّر من جديد. نكمّل؟`)) return;
    const acts = scheduleActs(data, dayOf(date));
    const ids = suggestLessons(data, acts, j.id);
    setJ({ ...j, date, day: dayOf(date), acts: acts.map((a, i) => fillAct(a, findLesson(data, ids[i]))) });
  };

  const exportDoc = async (kind: 'share' | 'save') => {
    setBusy(true);
    try {
      const jj = { ...j, exported: true };
      saveJournal(jj); setJ(jj);
      const blob = await journalBlob(data, jj);
      const name = journalFileName(jj);
      if (kind === 'share') await shareFile(blob, name, DOCX_MIME);
      else toast(`تحفظ في: ${await saveFile(blob, name)}`);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (!/cancel|abort/i.test(msg)) toast('ما نجمتش نصدّر الملف: ' + msg, 'err');
    } finally { setBusy(false); }
  };

  const del = () => {
    if (!window.confirm('نفسخ الجورنال هذا؟ (التقدّم يرجع كيف كان قبلو)')) return;
    deleteJournal(j.id);
    onClose();
  };

  const saveAimToPlan = (lessonId: string, aim: string) => {
    setPlans((ps) => ps.map((p) => ({ ...p, lessons: p.lessons.map((l) => (l.id === lessonId ? { ...l, aim } : l)) })));
    toast('تحفظ هدف الحصة في المخطط: يتعمّر هكا المرّة الجاية.');
  };

  return (
    <div className="screen editor">
      <TopBar title={`جورنال ${j.day}`} onBack={onClose}
        actions={<button className="icon-btn" onClick={del} aria-label="حذف">🗑</button>} />

      <section className="card">
        <div className="row2">
          <label className="field inline">
            <span>التاريخ</span>
            <input type="date" value={j.date} onChange={(e) => e.target.value && changeDate(e.target.value)} />
          </label>
          <span className="muted">{j.day} {fmtDate(j.date)}</span>
        </div>
        <div className="field">
          <span>نمط التعلّم</span>
          <div className="chips">
            {MODES.map((m) => (
              <button key={m} className={`chip ${j.mode === m ? 'on' : ''}`} onClick={() => setJ({ ...j, mode: j.mode === m ? '' : (m as Mode) })}>{m}</button>
            ))}
          </div>
        </div>
      </section>

      {j.acts.map((a, i) => {
        const l = findLesson(data, a.lessonId);
        const s = subjectInfo(a.subject);
        const fromBank = l ? l.aim : '';
        return (
          <section className="card act" key={i} style={{ borderInlineStartColor: '#' + s.color }}>
            <div className="act-head" style={{ background: '#' + s.fill }}>
              <SubjectTag subject={a.subject} level={a.level} />
              <span className="small muted">{a.time} · {a.dur}</span>
            </div>
            <div className="act-lesson">
              <span>{l ? <><b>الدرس {l.n}</b> <small className="muted">(الفترة {l.period})</small> — {lessonTitle(l)}</> : <em className="muted">فارغ</em>}</span>
              <button className="btn small" onClick={() => setChanging(i)}>🔁 بدّل الدرس</button>
            </div>

            <div className="aim-box">
              <div className="aim-head">
                <b>هدف الحصة</b>
                <div className="aim-btns">
                  <button className="btn small" onClick={() => {
                    const v = (variants.current[i] = (variants.current[i] ?? -1) + 1);
                    setAct(i, { ...a, aim: makeAim({ activity: l?.activity ?? '', mode: l?.mode ?? 'منهجي', goal: a.goal, content: a.content, skills: a.skills }, v) });
                  }}>✨ صياغة أخرى</button>
                  <button className="btn small danger" onClick={() => setAct(i, { ...a, aim: '' })} disabled={!a.aim}>🗑 فسخ</button>
                  {l && fromBank !== a.aim && (
                    <button className="btn small" onClick={() => setAct(i, { ...a, aim: fromBank })}>↩ متاع المخطط</button>
                  )}
                </div>
              </div>
              <textarea rows={4} value={a.aim} placeholder="فارغ — اكتب هدف الحصة هنا أو اضغط «صياغة أخرى»"
                onChange={(e) => setAct(i, { ...a, aim: e.target.value })} />
              {l && a.aim.trim() && fromBank !== a.aim && (
                <button className="link" onClick={() => saveAimToPlan(l.id, a.aim.trim())}>💾 احفظ الهدف هذا في المخطط (للمرّة الجاية)</button>
              )}
            </div>

            <details className="more">
              <summary>الهدف المميّز، المحتوى، المهارات</summary>
              <LinesField label="الهدف المميّز" value={a.goal} onChange={(v) => setAct(i, { ...a, goal: v })} />
              <LinesField label="المحتوى" value={a.content} onChange={(v) => setAct(i, { ...a, content: v })} />
              <LinesField label="المهارات الحياتية" value={a.skills} rows={2} onChange={(v) => setAct(i, { ...a, skills: v })} />
              <p className="muted small">التعديل هنا يبدّل الجورنال هذا برك، موش المخطط.</p>
            </details>
          </section>
        );
      })}

      <div className="bottom-actions">
        <button className="btn primary" disabled={busy} onClick={() => exportDoc('share')}>📤 شارك (واتساب، Drive…)</button>
        <button className="btn" disabled={busy} onClick={() => exportDoc('save')}>💾 حفظ في الهاتف</button>
      </div>

      {changing !== null && (
        <ChangeLesson act={j.acts[changing]} lessons={slotLessons(data, j.acts[changing].level, j.acts[changing].subject)}
          onPick={(l) => { setAct(changing, fillAct(j.acts[changing], l)); variants.current[changing] = -1; setChanging(null); }}
          onClose={() => setChanging(null)} />
      )}
    </div>
  );
}

function ChangeLesson({ act, lessons, onPick, onClose }: { act: JAct; lessons: Lesson[]; onPick: (l: Lesson | null) => void; onClose: () => void }) {
  const periods = [...new Set(lessons.map((l) => l.period))].sort((a, b) => periodIndex(a) - periodIndex(b));
  return (
    <Sheet title={`بدّل الدرس — ${act.subject} ${act.level}`} onClose={onClose}>
      <button className={`lesson-opt ${!act.lessonId ? 'on' : ''}`} onClick={() => onPick(null)}>
        <span className="n">—</span><span>فارغ</span>
      </button>
      {!lessons.length && <p className="muted">ما فماش مخطط للمادة هذي. زيدو من «المخططات».</p>}
      {periods.map((p) => (
        <div key={p}>
          <h4 className="period-h">الفترة {p}</h4>
          {lessons.filter((l) => l.period === p).map((l) => (
            <button key={l.id} className={`lesson-opt ${l.id === act.lessonId ? 'on' : ''}`} onClick={() => onPick(l)}>
              <span className="n">{l.n}</span>
              <span><b>{l.activity}</b> — {lessonTitle(l)}</span>
            </button>
          ))}
        </div>
      ))}
    </Sheet>
  );
}
