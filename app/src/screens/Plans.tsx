import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { parsePlanFile } from '../plans';
import { makePlan } from '../plans/build';
import { makeAim } from '../lib/aim';
import { lessonTitle } from '../lib/logic';
import { LEVELS, PERIODS, SUBJECTS, periodIndex, type Level } from '../data/subjects';
import { Sheet, SubjectTag, TopBar, useToast } from '../ui';
import type { Lesson, Plan } from '../lib/types';

interface Slot { level: Level; subject: string }

export default function Plans() {
  const { data, setPlans } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);
  const target = useRef<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<{ slot: Slot; file: string; lessons: Lesson[]; period: string; warn: string[] } | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [addOther, setAddOther] = useState(false);

  // المواد الموجودة في الجورنال (من التوزيع) + أي مادة عندها مخطط
  const slots: Slot[] = [];
  const add = (level: Level, subject: string) => { if (!slots.some((s) => s.level === level && s.subject === subject)) slots.push({ level, subject }); };
  for (const lv of LEVELS) {
    for (const d of data.schedule) for (const b of d.blocks) if (b.level === lv) for (const it of b.items) add(lv, it.subject);
    for (const p of data.plans) if (p.level === lv) add(lv, p.subject);
  }

  const pick = (slot: Slot) => { target.current = slot; fileRef.current?.click(); };

  const onFile = async (f: File | undefined) => {
    const slot = target.current;
    if (!f || !slot) return;
    setLoading(true);
    try {
      const res = await parsePlanFile(f.name, await f.arrayBuffer(), slot.level, slot.subject);
      const warn: string[] = [];
      if (res.meta.subject && res.meta.subject !== slot.subject) warn.push(`الملف يبان مخطط «${res.meta.subject}» موش «${slot.subject}».`);
      if (res.meta.level && res.meta.level !== slot.level) warn.push(`الملف يبان للقسم ${res.meta.level} موش ${slot.level}.`);
      if (!res.meta.period) warn.push('ما لقيتش رقم الفترة في الملف: اختارو بيدك.');
      setReview({ slot, file: f.name, lessons: res.lessons, period: res.lessons[0]?.period ?? 'الأولى', warn });
    } catch (e) {
      toast(String((e as Error)?.message ?? e), 'err');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmImport = () => {
    if (!review) return;
    const { slot, period, file } = review;
    // نعاودو نحسبو المعرّفات حسب الفترة المختارة
    const code = SUBJECTS.find((s) => s.name === slot.subject)?.code ?? 'x';
    const pNo = PERIODS.indexOf(period) + 1;
    const lessons = review.lessons.map((l) => ({ ...l, period, id: `${slot.level === 'س5' ? 's5' : 's6'}-${code}-${pNo}-${l.n}` }));
    const plan = makePlan(lessons, slot.level, slot.subject, period, file);
    const exists = data.plans.some((p) => p.id === plan.id);
    if (exists && !window.confirm(`عندك مخطط ${slot.subject} ${slot.level} للفترة ${period}. نعوّضو بالجديد؟`)) return;
    setPlans((ps) => [...ps.filter((p) => p.id !== plan.id), plan]);
    setReview(null);
    toast(`تزاد المخطط: ${lessons.length} حصة.`);
  };

  // استيراد بنك دروس جاهز (lessons.json)
  const onBank = async (f: File | undefined) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text()) as { lessons?: Lesson[] };
      if (!Array.isArray(j.lessons) || !j.lessons.length) throw new Error('الملف ما فيهش «lessons».');
      const groups = new Map<string, Lesson[]>();
      for (const l of j.lessons) {
        const k = `${l.level}|${l.subject}|${l.period}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push({ ...l, aim: l.aim || makeAim(l) });
      }
      if (!window.confirm(`فيه ${groups.size} مخطط و${j.lessons.length} حصة. المخططات اللي عندها نفس المادة والقسم والفترة تتعوّض. نكمّل؟`)) return;
      const plans = [...groups.values()].map((ls) => makePlan(ls, ls[0].level, ls[0].subject, ls[0].period, f.name));
      setPlans((ps) => [...ps.filter((p) => !plans.some((q) => q.id === p.id)), ...plans]);
      toast('تستورد بنك الدروس.');
    } catch (e) {
      toast('ملف غير صالح: ' + String((e as Error)?.message ?? e), 'err');
    } finally { if (bankRef.current) bankRef.current.value = ''; }
  };

  const viewed = data.plans.find((p) => p.id === view);

  return (
    <div className="screen">
      <TopBar title="المخططات" />
      <p className="muted small pad">اختار لكل مادة ملف المخطط متاعها (Word أو PDF) من التلفون. التطبيق يقراه وحدو بلا إنترنت.</p>
      <input ref={fileRef} type="file" hidden accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={bankRef} type="file" hidden accept=".json,application/json" onChange={(e) => onBank(e.target.files?.[0])} />

      {LEVELS.map((lv) => (
        <section className="card" key={lv}>
          <h2>{lv === 'س5' ? 'السنة الخامسة (س5)' : 'السنة السادسة (س6)'}</h2>
          {slots.filter((s) => s.level === lv).map((s) => {
            const plans = data.plans.filter((p) => p.level === s.level && p.subject === s.subject)
              .sort((a, b) => periodIndex(a.period) - periodIndex(b.period));
            return (
              <div className="slot" key={s.subject}>
                <div className="slot-head">
                  <SubjectTag subject={s.subject} />
                  <button className="btn small" onClick={() => pick(s)}>➕ زيد مخطط</button>
                </div>
                <div className="chips">
                  {plans.length ? plans.map((p) => (
                    <button key={p.id} className="chip plan" onClick={() => setView(p.id)}>
                      الفترة {p.period} · {p.lessons.length} حصة
                    </button>
                  )) : <span className="muted small">ما فماش مخطط</span>}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <section className="card">
        <button className="btn" onClick={() => setAddOther(true)}>➕ مخطط لمادة أخرى</button>
        <button className="btn" onClick={() => bankRef.current?.click()}>📥 استيراد بنك دروس (lessons.json)</button>
      </section>

      {loading && <div className="loading"><div className="spinner" />قاعد نقرا المخطط…</div>}

      {addOther && (
        <Sheet title="مخطط لمادة أخرى" onClose={() => setAddOther(false)}>
          {LEVELS.map((lv) => (
            <div key={lv}>
              <h4 className="period-h">{lv}</h4>
              <div className="chips">
                {SUBJECTS.map((s) => (
                  <button key={s.name} className="chip" onClick={() => { setAddOther(false); pick({ level: lv, subject: s.name }); }}>{s.name}</button>
                ))}
              </div>
            </div>
          ))}
        </Sheet>
      )}

      {review && (
        <Sheet title={`مراجعة المخطط — ${review.slot.subject} ${review.slot.level}`} onClose={() => setReview(null)}
          footer={<>
            <button className="btn primary" onClick={confirmImport}>💾 حفظ المخطط</button>
            <button className="btn" onClick={() => setReview(null)}>إلغاء</button>
          </>}>
          <p className="muted small">{review.file}</p>
          {review.warn.map((w) => <div className="note warn" key={w}>⚠️ {w}</div>)}
          <label className="field inline">
            <span>الفترة</span>
            <select value={review.period} onChange={(e) => setReview({ ...review, period: e.target.value })}>
              {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <p><b>{review.lessons.length}</b> حصة. ثبّت فيهم قبل الحفظ (تنجم تبدّل الأهداف بعد من «المخططات»):</p>
          <LessonList lessons={review.lessons} onChange={(ls) => setReview({ ...review, lessons: ls })} />
        </Sheet>
      )}

      {viewed && (
        <Sheet title={`${viewed.subject} ${viewed.level} — الفترة ${viewed.period}`} onClose={() => setView(null)}
          footer={<button className="btn danger" onClick={() => {
            if (!window.confirm('نفسخ المخطط هذا؟ (الجورنالات المحفوظة تقعد كيف ما هي)')) return;
            setPlans((ps) => ps.filter((p) => p.id !== viewed.id)); setView(null);
          }}>🗑 فسخ المخطط</button>}>
          {viewed.fileName && <p className="muted small">{viewed.fileName}</p>}
          <LessonList lessons={viewed.lessons}
            onChange={(ls) => setPlans((ps) => ps.map((p): Plan => (p.id === viewed.id ? { ...p, lessons: ls } : p)))} />
        </Sheet>
      )}
    </div>
  );
}

/** قائمة الحصص مع تعديل هدف الحصة */
function LessonList({ lessons, onChange }: { lessons: Lesson[]; onChange: (ls: Lesson[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [vars, setVars] = useState<Record<string, number>>({});
  const set = (l: Lesson) => onChange(lessons.map((x) => (x.id === l.id ? l : x)));
  return (
    <div className="lessons">
      {lessons.map((l) => (
        <div className={`lesson ${open === l.id ? 'open' : ''}`} key={l.id}>
          <button className="lesson-opt" onClick={() => setOpen(open === l.id ? null : l.id)}>
            <span className="n">{l.n}</span>
            <span><b>{l.activity}</b>{l.mode !== 'منهجي' ? ` (${l.mode})` : ''} — {lessonTitle(l)}</span>
          </button>
          {open === l.id && (
            <div className="lesson-body">
              <p><b>الهدف المميّز:</b> {l.goal.join(' • ') || '—'}</p>
              <p><b>المحتوى:</b> {l.content.join(' • ') || '—'}</p>
              <p><b>المهارات:</b> {l.skills.join('، ') || '—'}</p>
              <label className="field">
                <span>هدف الحصة</span>
                <textarea rows={4} value={l.aim} placeholder="فارغ" onChange={(e) => set({ ...l, aim: e.target.value })} />
              </label>
              <div className="aim-btns">
                <button className="btn small" onClick={() => { const v = (vars[l.id] ?? -1) + 1; setVars({ ...vars, [l.id]: v }); set({ ...l, aim: makeAim(l, v) }); }}>✨ صياغة أخرى</button>
                <button className="btn small danger" onClick={() => set({ ...l, aim: '' })}>🗑 فسخ</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

