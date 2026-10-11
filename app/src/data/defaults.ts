import bank from '../../../data/lessons.json';
import type { DaySchedule, Lesson, Plan } from '../lib/types';

// توزيع المواد الأسبوعي 2026-2027 (بدون الأنجليزية) — قابل للتعديل من الإعدادات
export const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'الثلاثاء', blocks: [
    { level: 'س5', start: '12:00', items: [{ subject: 'رياضيات', minutes: 45 }, { subject: 'تربية تشكيلية', minutes: 30 }, { subject: 'رياضيات', minutes: 45 }] },
    { level: 'س6', start: '15:00', items: [{ subject: 'رياضيات', minutes: 45 }, { subject: 'تربية إسلامية', minutes: 30 }, { subject: 'رياضيات', minutes: 45 }] },
  ] },
  { day: 'الخميس', blocks: [
    { level: 'س5', start: '13:00', items: [{ subject: 'رياضيات', minutes: 60 }] },
    { level: 'س6', start: '15:00', items: [{ subject: 'رياضيات', minutes: 45 }, { subject: 'تربية إسلامية', minutes: 30 }, { subject: 'رياضيات', minutes: 45 }] },
  ] },
  { day: 'الجمعة', blocks: [
    { level: 'س6', start: '12:00', items: [{ subject: 'رياضيات', minutes: 60 }, { subject: 'تاريخ', minutes: 40 }, { subject: 'جغرافيا', minutes: 40 }, { subject: 'تربية مدنية', minutes: 40 }] },
    { level: 'س5', start: '15:00', items: [{ subject: 'رياضيات', minutes: 45 }, { subject: 'تربية موسيقية', minutes: 30 }, { subject: 'رياضيات', minutes: 45 }] },
  ] },
  { day: 'السبت', blocks: [
    { level: 'س5', start: '08:00', items: [{ subject: 'رياضيات', minutes: 60 }, { subject: 'إيقاظ علمي', minutes: 60 }] },
    { level: 'س6', start: '10:00', items: [{ subject: 'رياضيات', minutes: 60 }, { subject: 'إيقاظ علمي', minutes: 60 }] },
  ] },
];

const FILES: Record<string, string> = {
  'س5|رياضيات': 'مخطط_الفترة_الأولى_رياضيات_س5.pdf',
  'س6|رياضيات': 'مخطط_الفترة_الأولى_رياضيات_س6.pdf',
  'س5|إيقاظ علمي': 'مخطط_الفترة_الأولى_إيقاظ_علمي_س5.docx',
};

/** المخططات الجاهزة (الفترة الأولى) — أهداف حصصها مصاغة مسبقاً */
export function seedPlans(): Plan[] {
  const lessons = (bank as { lessons: Lesson[] }).lessons;
  const plans = new Map<string, Plan>();
  for (const l of lessons) {
    const id = `${l.level}|${l.subject}|${l.period}`;
    if (!plans.has(id)) plans.set(id, {
      id, level: l.level, subject: l.subject, period: l.period,
      fileName: FILES[`${l.level}|${l.subject}`] ?? '', addedAt: '2026-10-11T00:00:00.000Z', lessons: [],
    });
    plans.get(id)!.lessons.push({ ...l });
  }
  return [...plans.values()];
}
