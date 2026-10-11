import type { Level, Mode } from '../data/subjects';

export interface Lesson {
  id: string;
  level: Level;
  subject: string;
  period: string;
  n: number;
  activity: string;
  mode: Mode;
  goal: string[];
  content: string[];
  skills: string[];
  aim: string;
}

export interface Plan {
  id: string;
  level: Level;
  subject: string;
  period: string;
  fileName: string;
  addedAt: string;
  lessons: Lesson[];
}

export interface ScheduleItem { subject: string; minutes: number }
export interface ScheduleBlock { level: Level; start: string; items: ScheduleItem[] }
export interface DaySchedule { day: string; blocks: ScheduleBlock[] }

export interface JAct {
  subject: string;
  level: Level;
  time: string;
  dur: string;
  lessonId: string | null;
  goal: string[];
  content: string[];
  aim: string;
  skills: string[];
}

export interface Journal {
  id: string;
  date: string;        // YYYY-MM-DD
  day: string;
  mode: Mode | '';
  acts: JAct[];
  createdAt: string;
  updatedAt: string;
  exported?: boolean;
}

/** «وين وصلت» يدوياً لمادة في قسم: آخر درس منجز */
export interface ProgressMark { lessonId: string | null; date: string; at?: string }

export interface Settings {
  /** إذا تكرّرت نفس المادة في نفس النهار: درس موالي أو نفس الدرس */
  repeat: 'next' | 'same';
}

export const slotKey = (level: string, subject: string) => `${level}|${subject}`;
