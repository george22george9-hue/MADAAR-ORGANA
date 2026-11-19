// ====================================================================
// ORGANA — WhatsApp Pastoral Communication Utilities
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

/**
 * Format an Egyptian phone number into international WhatsApp standard (e.g. 201202074649)
 */
export function formatEgyptianPhoneForWhatsApp(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 8) return null;

  if (digits.startsWith('20')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return '2' + digits;
  }
  if (digits.length === 10) {
    return '20' + digits;
  }
  return digits;
}

/**
 * Generate a direct WhatsApp link with pre-filled message
 */
export function getWhatsAppUrl(phone?: string | null, message?: string): string | null {
  const formatted = formatEgyptianPhoneForWhatsApp(phone);
  if (!formatted) return null;
  const textParam = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${formatted}${textParam}`;
}

/**
 * Pre-composed pastoral message for member visitation / followup (افتقاد)
 */
export function getPastoralVisitationMessage(
  memberName: string,
  familyName?: string,
  absencesCount: number = 0
): string {
  const churchName = 'كنيسة الشهيد العظيم مارجرجس بسندبيس';
  const famText = familyName ? ` - أسرة ${familyName}` : '';

  if (absencesCount >= 2) {
    return `سلام ونعمة ومحبة من ${churchName}${famText} ✝️❤️\nبنطمن على حبيبنا (${memberName}) علشان اشتقنا جداً نشوفه ونفرح بيه في اجتماع الخدمة. طمنونا على صحته وأخباره، وبإذن المسيح ننتظر وجوده وسطيكم الجمعة القادمة. ربنا يبارك حياتكم ويحفظكم ✨`;
  }

  if (absencesCount === 1) {
    return `سلام ومحبة من ${churchName}${famText} ✝️❤️\nبنطمن على حبيبنا (${memberName}) لغيابه الجمعة الماضية، نتمنى يكون بألف خير ونشوفه الجمعة دي في ميعادنا على خير. يومكم مبارك ومملوء سلام ✨`;
  }

  return `سلام ونعمة من ${churchName}${famText} ✝️❤️\nبنحييكم وبنحيي حبيبنا (${memberName}) على التزامه ومحبته في الخدمة. ربنا يبارك حياتكم ويفرح قلوبكم بكل بركة سماوية ✨`;
}

/**
 * Pre-composed birthday greeting message
 */
export function getBirthdayGreetingMessage(memberName: string): string {
  const churchName = 'كنيسة الشهيد العظيم مارجرجس بسندبيس';
  return `كل سنة وانت طيب ومبارك يا (${memberName}) بمناسبة عيد ميلادك! 🎂🎉✝️\nآباء وخدام ${churchName} بيتمنولك سنة جديدة مليانة بركة وسلام ونعمة وتفوق في كل خطوة مع بابا يسوع. سنة حلوة مع يسوع ✨❤️`;
}

/**
 * Pre-composed message for servant-to-servant coordination
 */
export function getServantCoordinationMessage(servantName: string, familyName?: string): string {
  const famText = familyName ? ` بأسرة (${familyName})` : '';
  return `سلام ونعمة يا أستاذ (${servantName}) ✝️\nبتواصل معاك من كنيسة مارجرجس بسندبيس بخصوص الخدمة${famText}. طمني على أحوالك والتحضير للجمعة القادمة ربنا يعوض تعب محبتك ✨`;
}
