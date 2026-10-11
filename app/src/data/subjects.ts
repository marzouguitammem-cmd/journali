export type Level = 'س5' | 'س6';
export const LEVELS: Level[] = ['س5', 'س6'];
export const LEVEL_NAMES: Record<Level, string> = { 'س5': 'السنة الخامسة', 'س6': 'السنة السادسة' };

export type Mode = 'منهجي' | 'إدماجي' | 'تقييمي' | 'دعم وعلاج';
export const MODES: Mode[] = ['منهجي', 'إدماجي', 'تقييمي', 'دعم وعلاج'];

export interface SubjectInfo {
  name: string;      // الاسم كما يُكتب في الجورنال
  short: string;     // اسم قصير للواجهة
  code: string;      // رمز لاتيني للمعرّفات
  color: string;     // لون المادة (من make_journal.js)
  fill: string;      // لون الخلفية
  icon: string;      // الأيقونة في assets/
  keys: string[];    // كلمات تدلّ على المادة (للتعرّف على المخطط وعلى الأوامر)
}

// الألوان والأيقونات منقولة كما هي من generator/make_journal.js
export const SUBJECTS: SubjectInfo[] = [
  { name: 'رياضيات', short: 'رياضيات', code: 'math', color: '2E75B6', fill: 'EEF5FC', icon: 'ic_math.png', keys: ['رياضيات', 'الرياضيات', 'حساب', 'الحساب'] },
  { name: 'إيقاظ علمي', short: 'إيقاظ علمي', code: 'sci', color: '548235', fill: 'EFF6EA', icon: 'ic_sci.png', keys: ['إيقاظ', 'الإيقاظ', 'علمي', 'العلمي', 'علوم'] },
  { name: 'تربية تشكيلية', short: 'تشكيلية', code: 'art', color: 'C55A11', fill: 'FDF1E9', icon: 'ic_art.png', keys: ['تشكيلية', 'التشكيلية', 'رسم'] },
  { name: 'تربية إسلامية', short: 'إسلامية', code: 'isl', color: '00807F', fill: 'E8F5F5', icon: 'ic_isl.png', keys: ['إسلامية', 'الإسلامية', 'اسلامية'] },
  { name: 'تاريخ', short: 'تاريخ', code: 'hist', color: '8C6D1F', fill: 'F8F2E3', icon: 'ic_hist.png', keys: ['تاريخ', 'التاريخ'] },
  { name: 'جغرافيا', short: 'جغرافيا', code: 'geo', color: '1F8FB0', fill: 'E6F4F9', icon: 'ic_geo.png', keys: ['جغرافيا', 'الجغرافيا'] },
  { name: 'تربية مدنية', short: 'مدنية', code: 'civ', color: '7030A0', fill: 'F3EAF9', icon: 'ic_civ.png', keys: ['مدنية', 'المدنية'] },
  { name: 'تربية موسيقية', short: 'موسيقية', code: 'mus', color: 'C0006F', fill: 'FBE8F2', icon: 'ic_mus.png', keys: ['موسيقية', 'الموسيقية', 'موسيقى'] },
];

export const subjectInfo = (name: string): SubjectInfo =>
  SUBJECTS.find((s) => s.name === name) ?? SUBJECTS[0];

export const PERIODS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'];
export const periodIndex = (p: string) => {
  const i = PERIODS.indexOf(p);
  return i < 0 ? 99 : i;
};

export const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
// getDay(): 0 = الأحد
export const dayName = (d: Date) => DAYS[d.getDay()];
