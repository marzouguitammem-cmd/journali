import { useStore } from '../lib/store';
import { findLesson, lastDone, lessonTitle, nextLesson, slotLessons, today } from '../lib/logic';
import { LEVELS } from '../data/subjects';
import { SubjectTag, TopBar } from '../ui';
import { slotKey } from '../lib/types';

export default function Progress() {
  const { data, setMark } = useStore();

  const slots = LEVELS.flatMap((lv) => [...new Set(data.plans.filter((p) => p.level === lv).map((p) => p.subject))].map((s) => ({ level: lv, subject: s })));

  return (
    <div className="screen">
      <TopBar title="وين وصلت" />
      <p className="muted small pad">التطبيق يحسب وين وصلت من الجورنالات المحفوظة. إذا لزم، قدّم ولا رجّع بيدك.</p>
      {!slots.length && <p className="center muted">زيد مخططات باش تتبّع تقدّمك.</p>}
      {slots.map(({ level, subject }) => {
        const ls = slotLessons(data, level, subject);
        const lastId = lastDone(data, level, subject);
        const last = findLesson(data, lastId);
        const idx = last ? ls.findIndex((l) => l.id === last.id) : -1;
        const nx = nextLesson(data, level, subject, lastId);
        const key = slotKey(level, subject);
        const manual = !!data.marks[key];
        const move = (d: number) => {
          const ni = idx + d;
          if (ni < -1 || ni >= ls.length) return;
          // تاريخ التعديل: موش قبل آخر جورنال (باش يغلب عليه)
          const lastJ = data.journals.map((j) => j.date).sort().pop() ?? '';
          setMark(key, { lessonId: ni < 0 ? null : ls[ni].id, date: lastJ > today() ? lastJ : today(), at: new Date().toISOString() });
        };
        return (
          <section className="card" key={key}>
            <div className="slot-head">
              <SubjectTag subject={subject} level={level} />
              <span className="muted small">{idx + 1}/{ls.length}</span>
            </div>
            <div className="bar"><div style={{ width: `${((idx + 1) / Math.max(1, ls.length)) * 100}%` }} /></div>
            <p>آخر درس منجز: {last ? <b>{last.n} — {lessonTitle(last)} <small className="muted">(الفترة {last.period})</small></b> : <em className="muted">ما زال</em>}</p>
            <p>الجاي: {nx ? <b>{nx.n} — {lessonTitle(nx)}</b> : <em className="muted">كمّلت المخطط 🎉</em>}</p>
            <div className="row-btns">
              <button className="btn small" onClick={() => move(-1)} disabled={idx < 0}>→ رجّع درس</button>
              <button className="btn small" onClick={() => move(1)} disabled={idx >= ls.length - 1}>قدّم درس ←</button>
              {manual && <button className="link" onClick={() => setMark(key, null)}>رجّع للحساب من الجورنالات</button>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
