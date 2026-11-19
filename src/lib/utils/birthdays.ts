// ====================================================================
// ORGANA — Birthday & Pastoral Calendar Utilities
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

export interface BirthdayInfo {
  isToday: boolean;
  isThisMonth: boolean;
  daysRemaining: number;
  turningAge: number;
  formattedDate: string;
}

export function parseBirthDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function getBirthdayInfo(dateStr?: string | null, referenceDate = new Date()): BirthdayInfo | null {
  const bdate = parseBirthDate(dateStr);
  if (!bdate) return null;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDate = referenceDate.getDate();

  const birthMonth = bdate.getMonth();
  const birthDay = bdate.getDate();

  // Next birthday date
  let nextBday = new Date(currentYear, birthMonth, birthDay);
  const todayStart = new Date(currentYear, currentMonth, currentDate);

  if (nextBday < todayStart) {
    nextBday = new Date(currentYear + 1, birthMonth, birthDay);
  }

  const diffTime = nextBday.getTime() - todayStart.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isToday = daysRemaining === 0;
  const isThisMonth = birthMonth === currentMonth;

  const turningAge = nextBday.getFullYear() - bdate.getFullYear();

  // Arabic formatted date, e.g. "14 مارس"
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const formattedDate = `${birthDay} ${arabicMonths[birthMonth]}`;

  return {
    isToday,
    isThisMonth,
    daysRemaining,
    turningAge,
    formattedDate,
  };
}
