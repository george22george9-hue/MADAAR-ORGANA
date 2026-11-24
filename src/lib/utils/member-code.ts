// ====================================================================
// ORGANA — Permanent Personal Member Code Generator
// Code Format: [First Initial][Father Initial][01..99]
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

/**
 * Maps an Arabic name or word to its primary English initial letter.
 */
export function getArabicInitialLetter(word: string): string {
  if (!word || typeof word !== 'string') return 'X';
  const clean = word.trim();
  if (!clean) return 'X';

  // If already an English letter
  const firstChar = clean[0];
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase();
  }

  // Specific common Coptic/Arabic Christian name prefixes
  if (clean.startsWith('جون') || clean.startsWith('جوفاني') || clean.startsWith('جوزيف') || clean.startsWith('جولي')) {
    return 'J';
  }
  if (clean.startsWith('بولا') || clean.startsWith('بيتر') || clean.startsWith('باخوم')) {
    return 'P';
  }
  if (clean.startsWith('عماد') || clean.startsWith('عصام') || clean.startsWith('عزت')) {
    return 'E';
  }
  if (clean.startsWith('أستيفن') || clean.startsWith('استيفن') || clean.startsWith('إستيفن')) {
    return 'S';
  }

  // Base letter mappings
  switch (firstChar) {
    case 'أ':
    case 'إ':
    case 'آ':
    case 'ا':
    case 'ء':
      return 'A';
    case 'ب':
      return 'B';
    case 'ت':
    case 'ث':
      return 'T';
    case 'ج':
      return 'G';
    case 'ح':
      return 'H';
    case 'خ':
      return 'K';
    case 'د':
    case 'ذ':
      return 'D';
    case 'ر':
      return 'R';
    case 'ز':
      return 'Z';
    case 'س':
    case 'ص':
      return 'S';
    case 'ش':
      return 'S';
    case 'ض':
    case 'ط':
    case 'ظ':
      return 'T';
    case 'ع':
      return 'A';
    case 'غ':
      return 'G';
    case 'ف':
      return 'F';
    case 'ق':
    case 'ك':
      return 'K';
    case 'ل':
      return 'L';
    case 'م':
      return 'M';
    case 'ن':
      return 'N';
    case 'ه':
    case 'ة':
      return 'H';
    case 'و':
    case 'ؤ':
      return 'W';
    case 'ي':
    case 'ى':
    case 'ئ':
      return 'Y';
    default:
      return 'X';
  }
}

/**
 * Extracts personal prefix (2 English letters: Member First Name + Father Name).
 * Example:
 * - "مريم وائل نبيل" -> "M" + "W" = "MW"
 * - "جورج سليمان سامي" -> "G" + "S" = "GS"
 * - "جون ماجد حليم" -> "J" + "M" = "JM"
 */
export function getMemberInitialsPrefix(fullName: string, guardianName?: string | null): string {
  if (!fullName) return 'XX';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstWord = parts[0] || '';
  let secondWord = parts[1] || '';

  if (!secondWord && guardianName) {
    const guardianParts = guardianName.trim().split(/\s+/).filter(Boolean);
    secondWord = guardianParts[0] || '';
  }

  const memberLetter = getArabicInitialLetter(firstWord);
  const fatherLetter = secondWord ? getArabicInitialLetter(secondWord) : 'X';

  return `${memberLetter}${fatherLetter}`;
}
