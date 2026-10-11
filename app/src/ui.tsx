import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { subjectInfo } from './data/subjects';

// ---------- رسائل قصيرة (toast) ----------
const ToastCtx = createContext<(msg: string, kind?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: string; id: number } | null>(null);
  const show = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now();
    setT({ msg, kind, id });
    setTimeout(() => setT((x) => (x && x.id === id ? null : x)), kind === 'err' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && <div className={`toast ${t.kind}`} onClick={() => setT(null)}>{t.msg}</div>}
    </ToastCtx.Provider>
  );
}

// ---------- نافذة من الأسفل ----------
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function TopBar({ title, onBack, actions }: { title: string; onBack?: () => void; actions?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack && <button className="icon-btn back" onClick={onBack} aria-label="رجوع">→</button>}
      <h1>{title}</h1>
      <div className="topbar-actions">{actions}</div>
    </header>
  );
}

export function SubjectTag({ subject, level }: { subject: string; level?: string }) {
  const s = subjectInfo(subject);
  return (
    <span className="subj" style={{ color: '#' + s.color }}>
      <img src={`${import.meta.env.BASE_URL}assets/${s.icon}`} alt="" />
      {s.name}
      {level && <span className={`lvl ${level === 'س5' ? 'l5' : 'l6'}`}>{level}</span>}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  return <span className={`lvl ${level === 'س5' ? 'l5' : 'l6'}`}>{level}</span>;
}

/** خانة نصّ متعدّدة الأسطر: كل سطر = بند */
export function LinesField({ label, value, onChange, rows = 3 }: { label: string; value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  const [text, setText] = useState(value.join('\n'));
  const [prev, setPrev] = useState(value);
  if (prev !== value && value.join('\n') !== text.split('\n').filter((x) => x.trim()).join('\n')) { setPrev(value); setText(value.join('\n')); }
  return (
    <label className="field">
      <span>{label} <small>(كل سطر بند)</small></span>
      <textarea rows={Math.max(rows, value.length + 1)} value={text}
        onChange={(e) => { setText(e.target.value); const v = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); setPrev(v); onChange(v); }} />
    </label>
  );
}

export function useConfirm() {
  return (msg: string) => window.confirm(msg);
}
