// صياغة «هدف الحصة» بقواعد ثابتة (بلا ذكاء اصطناعي ولا إنترنت).
// القالب: «أن يكون المتعلّم قادراً على [أفعال] … وذلك من خلال [طريقة العمل].»
import { norm } from './arabic';
import type { Lesson } from './types';

type AimInput = Pick<Lesson, 'activity' | 'mode' | 'goal' | 'content' | 'skills'>;

const ACT_METHODS: [string, string[]][] = [
  ['حساب', ['حلّ وضعيّات دالّة', 'التدرّب على أمثلة متنوّعة ثمّ حلّ وضعيّات دالّة', 'الاستكشاف والتدرّب وحلّ وضعيّات دالّة']],
  ['هندسه', ['التجريب باستعمال الأدوات الهندسيّة', 'الملاحظة والتجريب والرسم الدقيق', 'إنجاز رسوم وبناءات على كرّاس القسم']],
  ['قيس', ['التجريب والقيس الفعليّ', 'المعالجة الحسّيّة وحلّ وضعيّات دالّة', 'القيس والتحويل وحلّ وضعيّات دالّة']],
  ['فيزياء', ['إنجاز تجارب بسيطة والملاحظة', 'التجريب والتحقّق من الفرضيّات', 'الملاحظة والتجريب واستخلاص النتائج']],
  ['احياء', ['الملاحظة والاستعانة بالوثائق والمجسّمات', 'الملاحظة والتحليل واستغلال الوثائق', 'البحث والملاحظة والتجريب']],
];
const DEFAULT_METHODS = ['الملاحظة والحوار وحلّ وضعيّات دالّة', 'الحوار والتحليل والتطبيق', 'الاستكشاف والحوار والتطبيق'];

const SKILL_FORMS: [string, string][] = [
  ['التشاركي', 'العمل في مجموعات'],
  ['النقدي', 'مناقشة الحلول ونقدها'],
  ['المشكلات', 'البحث عن حلول ملائمة'],
  ['التدبير الذاتي', 'العمل الفرديّ والتقييم الذاتيّ'],
  ['التفاوض', 'الحوار والتفاوض داخل المجموعة'],
  ['التواصل', 'التعبير والتواصل'],
];

function methods(activity: string): string[] {
  const a = norm(activity);
  for (const [k, m] of ACT_METHODS) if (a.includes(norm(k))) return m;
  return DEFAULT_METHODS;
}

function socialForm(skills: string[], v: number): string | null {
  const forms = skills.flatMap((s) => SKILL_FORMS.filter(([k]) => norm(s).includes(norm(k))).map(([, f]) => f));
  if (!forms.length) return v % 2 ? 'العمل في مجموعات' : null;
  return forms[v % forms.length];
}

const joinAnd = (xs: string[]) => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join('، و') + '، و' + xs[xs.length - 1];

/** «الكفايات المستهدفة : يحل المتعلم …» ← «حلّ …» */
function competenceToMasdar(text: string): string {
  let t = text.includes(':') ? text.slice(text.indexOf(':') + 1) : text;
  t = t.trim()
    .replace(/^يكون المتعلم\s+في نهاية الفترة\s+\S+\s+قادرا?\s+على\s+/, '')
    .replace(/^يحل المتعلم\s+(ضمن\s+)?/, 'حلّ ')
    .replace(/^ينجز\s+/, 'إنجاز ');
  return t;
}

/** v: رقم الصياغة (0، 1، 2…): كل رقم يعطي صياغة مختلفة */
export function makeAim(l: AimInput, v = 0): string {
  const goal = l.goal.filter(Boolean);
  const content = l.content.filter(Boolean);
  const main = competenceToMasdar(goal[0] || content[0] || '');

  if (l.mode === 'إدماجي') {
    const ends = ['العمل الفرديّ ثمّ التشاركيّ والتقييم الذاتيّ للأعمال ونقدها', 'حلّ وضعيّات إدماجيّة في مجموعات ثمّ فرديّاً', 'وضعيّات مركّبة تستدعي توظيف مكتسبات الفترة'];
    return `أن يكون المتعلّم قادراً على توظيف مكتسباته في ${main}، وذلك من خلال ${ends[v % ends.length]}.`;
  }
  if (l.mode === 'تقييمي') {
    const ends = ['إنجاز سند تقييميّ وفق معايير محدّدة', 'وضعيّات تقييميّة فرديّة تقيس مدى تملّك المعايير الدنيا', 'إنجاز تمارين تقييميّة متدرّجة الصعوبة'];
    return `أن يكون المتعلّم قادراً على ${main} بصفة فرديّة مستقلّة، وذلك من خلال ${ends[v % ends.length]}.`;
  }
  if (l.mode === 'دعم وعلاج') {
    const ends = ['أنشطة علاج فارقيّة في مجموعات حسب الحاجات', 'تمارين علاجيّة متدرّجة تستهدف الأخطاء الشائعة', 'العمل في مجموعات حاجات وفق شبكة نتائج التقييم'];
    return `أن يكون المتعلّم قادراً على تجاوز الصعوبات التي كشف عنها التقييم وتثبيت مكتسباته، وذلك من خلال ${ends[v % ends.length]}.`;
  }

  const verbs = goal.length ? joinAnd(goal.slice(0, 3)) : `تعرّف ${content[0] || '…'}`;
  const ms = methods(l.activity);
  const m = ms[v % ms.length];
  const sf = socialForm(l.skills, v);
  const method = sf && !m.includes(sf) ? `${m} و${sf}` : m;
  const c = content.slice(0, 2).join('، ');
  const tpl = Math.floor(v / ms.length) % 3;
  if (!c || (goal.length && norm(goal.join(' ')).includes(norm(c)))) return `أن يكون المتعلّم قادراً على ${verbs}، وذلك من خلال ${method}.`;
  if (tpl === 1) return `أن يكون المتعلّم قادراً على ${verbs} انطلاقاً من دراسة «${c}»، وذلك من خلال ${method}.`;
  if (tpl === 2) return `أن يكون المتعلّم قادراً على ${verbs} وتوظيف ذلك في «${c}»، وذلك من خلال ${method}.`;
  return `أن يكون المتعلّم قادراً على ${verbs}، في درس «${c}»، وذلك من خلال ${method}.`;
}
