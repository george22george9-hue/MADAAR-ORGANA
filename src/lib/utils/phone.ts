// ====================================================================
// ORGANA — Phone Number Normalization Utility
// Handles Egyptian mobile numbers, Arabic-Indic numerals, and standardizes formats
// ====================================================================

export function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let str = raw.toString().trim();
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(arabicDigits[i], i.toString());
  }
  // Strip spaces, dashes, parentheses
  str = str.replace(/[^\d+]/g, '');
  // Normalize +20 or 0020 or 20 to Egyptian local 01...
  if (str.startsWith('+20')) str = '0' + str.slice(3);
  else if (str.startsWith('0020')) str = '0' + str.slice(4);
  else if (str.startsWith('20') && str.length === 12) str = '0' + str.slice(2);
  return str.trim();
}
