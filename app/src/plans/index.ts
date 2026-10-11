import { detectMeta, rowsToLessons, type Meta } from './build';
import type { Lesson } from '../lib/types';
import type { Level } from '../data/subjects';

export interface ParsedPlan { meta: Meta; lessons: Lesson[] }

/** يقرا ملف المخطط (Word أو PDF) ويرجّع الحصص */
export async function parsePlanFile(name: string, data: ArrayBuffer, level: Level, subject: string, period?: string): Promise<ParsedPlan> {
  const lower = name.toLowerCase();
  const isPdf = lower.endsWith('.pdf') || new Uint8Array(data.slice(0, 4)).every((b, i) => b === [0x25, 0x50, 0x44, 0x46][i]);
  const { rows, text } = isPdf
    ? await (await import('./parsePdf')).parsePdf(data)
    : await (await import('./parseDocx')).parseDocx(data);
  const meta = detectMeta(text, name);
  const per = period || meta.period || 'الأولى';
  const lessons = rowsToLessons(rows, level, subject, per);
  if (!lessons.length) throw new Error('لقيت الجدول أما ما لقيت فيه حتى حصة.');
  return { meta, lessons };
}
