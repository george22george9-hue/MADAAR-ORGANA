// ====================================================================
// ORGANA — Church Sunday School Stages & Grades Registry
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

/**
 * Standard church stages per Sunday School class / family:
 * - طفولة (أولى وتانية): أولى ابتدائي لوحدها، وتانية ابتدائي لوحدها
 * - طفولة (تالتة ورابعة): تالتة ابتدائي لوحدها، ورابعة ابتدائي لوحدها
 * - طفولة (خامسة وسادسة): خامسة ابتدائي لوحدها، وسادسة ابتدائي لوحدها
 * - إعدادي (بنين وبنات): 3 مراحل (أولى إعدادي، تانية إعدادي، تالتة إعدادي)
 * - ثانوي: 3 مراحل (أولى ثانوي، تانية ثانوي، تالتة ثانوي)
 * - إعداد خدام: مرحلتين بس (أولى إعداد خدام، تانية إعداد خدام)
 * - حضانة: مرحلتين (حضانة صغرى KG1، حضانة كبرى KG2)
 */

export const CHURCH_DEFAULT_STAGES: Record<string, string[]> = {
  // حضانة
  'fam-nursery': ['حضانة صغرى (KG1)', 'حضانة كبرى (KG2)'],

  // طفولة (ابتدائي)
  'fam-pri1-2': ['أولى ابتدائي', 'تانية ابتدائي'],
  'fam-pri3-4': ['تالتة ابتدائي', 'رابعة ابتدائي'],
  'fam-pri5-6': ['خامسة ابتدائي', 'سادسة ابتدائي'],

  // إعدادي (3 مراحل)
  'fam-prep-boys': ['أولى إعدادي', 'تانية إعدادي', 'تالتة إعدادي'],
  'fam-prep-girls': ['أولى إعدادي', 'تانية إعدادي', 'تالتة إعدادي'],
  'fam-prep': ['أولى إعدادي', 'تانية إعدادي', 'تالتة إعدادي'],

  // ثانوي (3 مراحل)
  'fam-sec': ['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'],

  // إعداد خدام (مرحلتين)
  'fam-servant-prep': ['أولى إعداد خدام', 'تانية إعداد خدام'],

  // فئات عامة
  'fam-servants': ['عام'],
  'fam-couples': ['عام'],
};

/**
 * Returns available stages for a given family using ID, custom stages, or name pattern matching.
 */
export function getStagesForFamily(
  familyId?: string | null,
  familyName?: string | null,
  customStages?: string[] | null
): string[] {
  // 1. If custom stages array provided and not empty
  if (customStages && Array.isArray(customStages) && customStages.length > 0) {
    return customStages;
  }

  // 2. Direct ID match in default stages map
  if (familyId && CHURCH_DEFAULT_STAGES[familyId]) {
    return CHURCH_DEFAULT_STAGES[familyId];
  }

  // 3. Name-based pattern matching
  const name = (familyName || '').trim().toLowerCase();

  if (name.includes('أولى وتانية') || name.includes('اولى وتانية') || name.includes('اول وتانيه')) {
    return ['أولى ابتدائي', 'تانية ابتدائي'];
  }
  if (name.includes('تالتة ورابعة') || name.includes('تالته ورابعه')) {
    return ['تالتة ابتدائي', 'رابعة ابتدائي'];
  }
  if (name.includes('خامسة وسادسة') || name.includes('خامسه وسادسه')) {
    return ['خامسة ابتدائي', 'سادسة ابتدائي'];
  }
  if (name.includes('إعدادي') || name.includes('اعدادي')) {
    return ['أولى إعدادي', 'تانية إعدادي', 'تالتة إعدادي'];
  }
  if (name.includes('ثانوي')) {
    return ['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'];
  }
  if (name.includes('إعداد خدام') || name.includes('اعداد خدام')) {
    return ['أولى إعداد خدام', 'تانية إعداد خدام'];
  }
  if (name.includes('حضانة') || name.includes('حضانه')) {
    return ['حضانة صغرى (KG1)', 'حضانة كبرى (KG2)'];
  }

  return ['عام'];
}

/**
 * Visual styling helper for stage badges
 */
export function getStageBadgeStyle(stage?: string | null): { bg: string; text: string; border: string } {
  if (!stage) {
    return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }

  if (stage.includes('أولى') || stage.includes('KG1')) {
    return { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' };
  }
  if (stage.includes('تانية') || stage.includes('KG2')) {
    return { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' };
  }
  if (stage.includes('تالتة')) {
    return { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' };
  }
  if (stage.includes('رابعة')) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' };
  }
  if (stage.includes('خامسة')) {
    return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
  }
  if (stage.includes('سادسة')) {
    return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' };
  }

  return { bg: 'bg-[#FAF5F6]', text: 'text-[#702C3B]', border: 'border-[#EAE3E4]' };
}
