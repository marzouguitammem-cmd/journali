// أدوات صغيرة للنصّ العربي

const TASHKEEL = /[ً-ْٰـ]/g;

/** للمقارنة فقط: بلا تشكيل، والهمزات موحّدة، والفراغات مضغوطة */
export function norm(s: string): string {
  return (s || '')
    .replace(TASHKEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

export const clean = (s: string) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/**
 * نصّ PDF العربي: حرف «لا» المركّب يخرج مقلوباً (األعداد بدل الأعداد).
 * نصلّح الحالات التي لا لبس فيها.
 */
export function fixLamAlef(s: string): string {
  const L = 'ء-ي';
  return s
    .replace(/ا([أإآ])ل/g, 'ال$1')                       // األعداد ← الأعداد
    .replace(/اال/g, 'الا')                               // االبتدائية ← الابتدائية
    .replace(/([إأ])ال/g, '$1لا')                         // إال ← إلا
    .replace(new RegExp(`(^|[^${L}])ال(?=$|[^${L}])`, 'g'), '$1لا') // «ال» وحدها ← لا
    .replace(/خالل/g, 'خلال');
}

const ORD: [string, number][] = [
  ['الاول', 1], ['الاولي', 1], ['الثاني', 2], ['الثانيه', 2], ['الثالث', 3], ['الثالثه', 3], ['الرابع', 4], ['الرابعه', 4],
  ['الخامس', 5], ['الخامسه', 5], ['السادس', 6], ['السادسه', 6], ['السابع', 7], ['السابعه', 7], ['الثامن', 8], ['الثامنه', 8],
  ['التاسع', 9], ['التاسعه', 9], ['العاشر', 10], ['العاشره', 10],
];
/** «الأولى» أو «1» ← 1 */
export function ordinalToNumber(s: string): number | null {
  const n = norm(s);
  const d = n.match(/\d+/);
  if (d) return +d[0];
  for (const [w, v] of ORD) if (n.includes(w)) return v;
  return null;
}

export const toArabicDigits = (s: string) => s; // نحافظ على الأرقام اللاتينية كما في الجورنال الأصلي

export function uniq<T>(arr: T[]): T[] {
  const out: T[] = [];
  for (const x of arr) if (!out.includes(x)) out.push(x);
  return out;
}
