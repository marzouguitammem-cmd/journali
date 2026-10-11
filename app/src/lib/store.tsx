import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dbGet, dbSet } from './db';
import { DEFAULT_SCHEDULE, seedPlans } from '../data/defaults';
import type { AppData } from './logic';
import type { DaySchedule, Journal, Plan, ProgressMark, Settings } from './types';

const KEYS = ['plans', 'schedule', 'journals', 'marks', 'settings'] as const;
type Key = typeof KEYS[number];

const DEFAULTS = (): AppData => ({
  plans: seedPlans(),
  schedule: DEFAULT_SCHEDULE,
  journals: [],
  marks: {},
  settings: { repeat: 'next' },
});

interface Store {
  data: AppData;
  setPlans: (f: (p: Plan[]) => Plan[]) => void;
  setSchedule: (s: DaySchedule[]) => void;
  saveJournal: (j: Journal) => void;
  deleteJournal: (id: string) => void;
  setMark: (slot: string, m: ProgressMark | null) => void;
  setSettings: (s: Settings) => void;
  replaceAll: (d: AppData) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const dirty = useRef(new Set<Key>());

  useEffect(() => {
    (async () => {
      const d = DEFAULTS();
      for (const k of KEYS) {
        try {
          const v = await dbGet<unknown>(k);
          if (v !== undefined) (d as unknown as Record<string, unknown>)[k] = v;
        } catch { /* أوّل مرة */ }
      }
      setData(d);
    })();
  }, []);

  // حفظ في IndexedDB كل ما يتبدّل شي
  useEffect(() => {
    if (!data) return;
    for (const k of dirty.current) dbSet(k, data[k]).catch(() => {});
    dirty.current.clear();
  }, [data]);

  const update = useCallback((k: Key, f: (d: AppData) => AppData) => {
    dirty.current.add(k);
    setData((d) => (d ? f(d) : d));
  }, []);

  const store = useMemo<Store | null>(() => data && {
    data,
    setPlans: (f) => update('plans', (d) => ({ ...d, plans: f(d.plans) })),
    setSchedule: (s) => update('schedule', (d) => ({ ...d, schedule: s })),
    saveJournal: (j) => update('journals', (d) => {
      const i = d.journals.findIndex((x) => x.id === j.id);
      const journals = [...d.journals];
      const jj = { ...j, updatedAt: new Date().toISOString() };
      if (i < 0) journals.push(jj); else journals[i] = jj;
      return { ...d, journals };
    }),
    deleteJournal: (id) => update('journals', (d) => ({ ...d, journals: d.journals.filter((j) => j.id !== id) })),
    setMark: (slot, m) => update('marks', (d) => {
      const marks = { ...d.marks };
      if (m) marks[slot] = m; else delete marks[slot];
      return { ...d, marks };
    }),
    setSettings: (s) => update('settings', (d) => ({ ...d, settings: s })),
    replaceAll: (nd) => { KEYS.forEach((k) => dirty.current.add(k)); setData(nd); },
  }, [data, update]);

  if (!store) return <div className="splash">جورنالي…</div>;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
