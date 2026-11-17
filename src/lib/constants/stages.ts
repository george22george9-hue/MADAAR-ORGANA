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

/**
 * Letter for each Sunday school family/class:
 * S = ثانوي
 * B = إعدادي بنين
 * G = إعدادي بنات
 * P = أولى وتانية ابتدائي
 * M = تالتة ورابعة ابتدائي
 * H = خامسة وسادسة ابتدائي
 * K = إعداد خدام
 * N = حضانة
 * F = أسر وعائلات
 * V = خدام
 */
export function getFamilyCodeLetter(familyId?: string | null, familyName?: string | null): string {
  const fid = familyId || '';
  const name = familyName || '';
  if (fid === 'fam-sec' || name.includes('ثانوي')) return 'S';
  if (fid === 'fam-prep-boys' || name.includes('بنين')) return 'B';
  if (fid === 'fam-prep-girls' || name.includes('بنات')) return 'G';
  if (fid === 'fam-prep' || name.includes('إعدادي') || name.includes('اعدادي')) return 'B';
  if (fid === 'fam-pri1-2' || name.includes('أولى وتانية') || name.includes('اولى وتانية')) return 'P';
  if (fid === 'fam-pri3-4' || name.includes('تالتة ورابعة') || name.includes('تالته ورابعه')) return 'M';
  if (fid === 'fam-pri5-6' || name.includes('خامسة وسادسة') || name.includes('خامسه وسادسه')) return 'H';
  if (fid === 'fam-servant-prep' || name.includes('إعداد خدام') || name.includes('اعداد خدام')) return 'K';
  if (fid === 'fam-nursery' || name.includes('حضانة') || name.includes('حضانه')) return 'N';
  if (fid === 'fam-couples' || name.includes('عائلات') || name.includes('أسر')) return 'F';
  if (fid === 'fam-servants' || name.includes('خدام')) return 'V';
  return 'X';
}

/**
 * Letter for each stage within the class:
 * A = أولى (ابتدائي / إعدادي / ثانوي / إعداد خدام / KG1)
 * B = تانية (ابتدائي / إعدادي / ثانوي / إعداد خدام / KG2)
 * C = تالتة (إعدادي / ثانوي)
 * D = رابعة
 * E = خامسة
 * F = سادسة
 */
export function getStageCodeLetter(stage?: string | null): string {
  const s = String(stage || '').trim().toLowerCase();
  if (s.includes('أولى') || s.includes('اولى') || s.includes('اول') || s.includes('kg1') || s.includes('1')) return 'A';
  if (s.includes('تانية') || s.includes('ثانية') || s.includes('kg2') || s.includes('2')) return 'B';
  if (s.includes('تالتة') || s.includes('ثالثة') || s.includes('3')) return 'C';
  if (s.includes('رابعة') || s.includes('4')) return 'D';
  if (s.includes('خامسة') || s.includes('5')) return 'E';
  if (s.includes('سادسة') || s.includes('6')) return 'F';
  return '0';
}

