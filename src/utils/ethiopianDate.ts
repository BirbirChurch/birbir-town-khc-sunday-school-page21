export interface CalendarDateParts {
  year: number;
  month: number; // 1..13 for Ethiopian, 1..12 for Gregorian
  day: number; // 1..30/5/6 for Ethiopian, 1..31 for Gregorian
}

export interface DualTimeFormatted {
  hour24: number;
  minute: number;
  second: number;
  ethHour12: number; // 1..12
  ethPeriodAm: 'ጠዋት' | 'ከሰዓት' | 'ምሽት' | 'ሌሊት';
  ethPeriodEn: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  ethTimeShort: string; // e.g. 6:23 ከሰዓት
  ethTimeWithSeconds: string; // e.g. 6:23:15 ከሰዓት
  stdTime12: string; // e.g. 12:23 PM
  stdTime12WithSeconds: string; // e.g. 12:23:15 PM
  stdTime24: string; // e.g. 12:23
  stdTime24WithSeconds: string; // e.g. 12:23:15
}

export interface DualDateFormatted {
  eth: CalendarDateParts;
  greg: CalendarDateParts;
  ethNumeric: string; // DD/MM/YYYY
  ethWithEra: string; // DD/MM/YYYY ዓ/ም
  ethMonthAm: string;
  ethMonthEn: string;
  ethNamedAm: string; // e.g. ኅዳር 11 ቀን 2019 ዓ/ም
  ethNamedEn: string; // e.g. Hidar 11, 2019 E.C.
  gregNumeric: string; // DD/MM/YYYY
  gregIso: string; // YYYY-MM-DD
  hasTime: boolean;
  timeStr: string; // HH:mm
  time: DualTimeFormatted | null;
}

export const ETHIOPIAN_MONTHS_AM: readonly string[] = [
  'መስከረም',
  'ጥቅምት',
  'ኅዳር',
  'ታኅሣሥ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜ'
];

export const ETHIOPIAN_MONTHS_EN: readonly string[] = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miazia',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagume'
];

const TIME_OFFSET_STORAGE_KEY = 'khc_clock_offset_minutes_v1';
export const DEFAULT_TIME_OFFSET_MINUTES = -60; // -1:00 hour adjustment
export const TIME_OFFSET_EVENT = 'khc-clock-offset-changed';

export function getTimeOffsetMinutes(): number {
  if (typeof window === 'undefined') return DEFAULT_TIME_OFFSET_MINUTES;
  try {
    const raw = window.localStorage.getItem(TIME_OFFSET_STORAGE_KEY);
    if (raw === null) return DEFAULT_TIME_OFFSET_MINUTES;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : DEFAULT_TIME_OFFSET_MINUTES;
  } catch {
    return DEFAULT_TIME_OFFSET_MINUTES;
  }
}

export function setTimeOffsetMinutes(minutes: number): void {
  const safe = Math.max(-720, Math.min(720, Math.trunc(minutes)));
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TIME_OFFSET_STORAGE_KEY, String(safe));
    window.dispatchEvent(new CustomEvent(TIME_OFFSET_EVENT, { detail: safe }));
  } catch {
    // ignore storage errors
  }
}

export function applyTimeOffsetToDate(
  date: Date,
  offsetMinutes = getTimeOffsetMinutes()
): Date {
  return new Date(date.getTime() + offsetMinutes * 60_000);
}

export function getAdjustedNow(): Date {
  return applyTimeOffsetToDate(new Date());
}

function pad2(n: number): string {
  return String(Math.trunc(n)).padStart(2, '0');
}

export function isEthiopianLeapYear(ethYear: number): boolean {
  return (((ethYear % 4) + 4) % 4) === 3;
}

export function getEthiopianDaysInMonth(ethYear: number, ethMonth: number): number {
  if (ethMonth === 13) {
    return isEthiopianLeapYear(ethYear) ? 6 : 5;
  }
  return 30;
}

export function getGregorianDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function gregorianToJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045
  );
}

export function jdnToGregorian(jdn: number): CalendarDateParts {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

export function jdnToEthiopian(jdn: number): CalendarDateParts {
  const r = (jdn - 1723856) % 1461;
  const adjustedR = r < 0 ? r + 1461 : r;
  const n = (adjustedR % 365) + 365 * Math.floor(adjustedR / 1460);
  const year =
    4 * Math.floor((jdn - 1723856) / 1461) +
    Math.floor(adjustedR / 365) -
    Math.floor(adjustedR / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

export function ethiopianToJdn(y: number, m: number, d: number): number {
  return 1723856 + 365 + 365 * (y - 1) + Math.floor(y / 4) + 30 * m + d - 31;
}

export function gregorianToEthiopian(y: number, m: number, d: number): CalendarDateParts {
  return jdnToEthiopian(gregorianToJdn(y, m, d));
}

export function ethiopianToGregorian(y: number, m: number, d: number): CalendarDateParts {
  const safeMonth = Math.max(1, Math.min(13, m));
  const maxDay = getEthiopianDaysInMonth(y, safeMonth);
  const safeDay = Math.max(1, Math.min(maxDay, d));
  return jdnToGregorian(ethiopianToJdn(y, safeMonth, safeDay));
}

export function ethiopianToIso(y: number, m: number, d: number): string {
  const g = ethiopianToGregorian(y, m, d);
  return `${String(g.year).padStart(4, '0')}-${pad2(g.month)}-${pad2(g.day)}`;
}

export function formatDualTimeParts(
  hour24: number,
  minute: number,
  second = 0
): DualTimeFormatted {
  const h24 = ((Math.trunc(hour24) % 24) + 24) % 24;
  const min = Math.max(0, Math.min(59, Math.trunc(minute)));
  const sec = Math.max(0, Math.min(59, Math.trunc(second)));

  // Ethiopian clock: 6:00 AM = 12:00 ጠዋት, 12:00 PM = 6:00 ከሰዓት, 6:00 PM = 12:00 ምሽት, 12:00 AM = 6:00 ሌሊት
  const ethHour12 = ((h24 + 6) % 12) || 12;
  let ethPeriodAm: DualTimeFormatted['ethPeriodAm'];
  let ethPeriodEn: DualTimeFormatted['ethPeriodEn'];
  if (h24 >= 6 && h24 < 12) {
    ethPeriodAm = 'ጠዋት';
    ethPeriodEn = 'Morning';
  } else if (h24 >= 12 && h24 < 18) {
    ethPeriodAm = 'ከሰዓት';
    ethPeriodEn = 'Afternoon';
  } else if (h24 >= 18) {
    ethPeriodAm = 'ምሽት';
    ethPeriodEn = 'Evening';
  } else {
    ethPeriodAm = 'ሌሊት';
    ethPeriodEn = 'Night';
  }

  const stdHour12 = h24 % 12 || 12;
  const amPm = h24 >= 12 ? 'PM' : 'AM';
  const mm = pad2(min);
  const ss = pad2(sec);

  return {
    hour24: h24,
    minute: min,
    second: sec,
    ethHour12,
    ethPeriodAm,
    ethPeriodEn,
    ethTimeShort: `${ethHour12}:${mm} ${ethPeriodAm}`,
    ethTimeWithSeconds: `${ethHour12}:${mm}:${ss} ${ethPeriodAm}`,
    stdTime12: `${stdHour12}:${mm} ${amPm}`,
    stdTime12WithSeconds: `${stdHour12}:${mm}:${ss} ${amPm}`,
    stdTime24: `${pad2(h24)}:${mm}`,
    stdTime24WithSeconds: `${pad2(h24)}:${mm}:${ss}`
  };
}

export function getTodayIsoDate(): string {
  const now = getAdjustedNow();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function getTodayIsoDateTime(): string {
  const now = getAdjustedNow();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

export function getCurrentLocalTimeHHMM(): string {
  const now = getAdjustedNow();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

export function parseDateInput(
  input?: string | Date | null
): {
  greg: CalendarDateParts;
  hasTime: boolean;
  timeStr: string;
  time: DualTimeFormatted | null;
} | null {
  if (!input) return null;

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    const t = formatDualTimeParts(input.getHours(), input.getMinutes(), input.getSeconds());
    return {
      greg: {
        year: input.getFullYear(),
        month: input.getMonth() + 1,
        day: input.getDate()
      },
      hasTime: true,
      timeStr: t.stdTime24,
      time: t
    };
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // 1) Pure ISO Date YYYY-MM-DD
  const isoDateOnlyMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDateOnlyMatch) {
    const year = parseInt(isoDateOnlyMatch[1], 10);
    const month = parseInt(isoDateOnlyMatch[2], 10);
    const day = parseInt(isoDateOnlyMatch[3], 10);
    if (year >= 1900 && year <= 2200 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { greg: { year, month, day }, hasTime: false, timeStr: '', time: null };
    }
  }

  // 2) Local Date+Time without timezone suffix e.g. YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm:ss
  const localDateTimeMatch = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/
  );
  if (localDateTimeMatch) {
    const year = parseInt(localDateTimeMatch[1], 10);
    const month = parseInt(localDateTimeMatch[2], 10);
    const day = parseInt(localDateTimeMatch[3], 10);
    const hour = parseInt(localDateTimeMatch[4], 10);
    const minute = parseInt(localDateTimeMatch[5], 10);
    const second = localDateTimeMatch[6] ? parseInt(localDateTimeMatch[6], 10) : 0;
    if (
      year >= 1900 &&
      year <= 2200 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      const t = formatDualTimeParts(hour, minute, second);
      return { greg: { year, month, day }, hasTime: true, timeStr: t.stdTime24, time: t };
    }
  }

  // 3) Full ISO timestamp with timezone (e.g. 2026-11-20T09:49:09.000Z)
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && (raw.includes('T') || raw.includes(':'))) {
    const adjusted = applyTimeOffsetToDate(parsed);
    const t = formatDualTimeParts(adjusted.getHours(), adjusted.getMinutes(), adjusted.getSeconds());
    return {
      greg: {
        year: adjusted.getFullYear(),
        month: adjusted.getMonth() + 1,
        day: adjusted.getDate()
      },
      hasTime: true,
      timeStr: t.stdTime24,
      time: t
    };
  }

  // 4) DD/MM/YYYY format fallback
  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (year >= 1900 && year <= 2200 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { greg: { year, month, day }, hasTime: false, timeStr: '', time: null };
    }
  }

  if (!Number.isNaN(parsed.getTime())) {
    return {
      greg: {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate()
      },
      hasTime: false,
      timeStr: '',
      time: null
    };
  }

  return null;
}

export function formatDualDate(input?: string | Date | null): DualDateFormatted | null {
  const parsed = parseDateInput(input);
  if (!parsed) return null;

  const { greg, hasTime, timeStr, time } = parsed;
  const eth = gregorianToEthiopian(greg.year, greg.month, greg.day);
  const ethMonthAm = ETHIOPIAN_MONTHS_AM[eth.month - 1] || '';
  const ethMonthEn = ETHIOPIAN_MONTHS_EN[eth.month - 1] || '';
  const ethNumeric = `${pad2(eth.day)}/${pad2(eth.month)}/${eth.year}`;
  const ethWithEra = `${ethNumeric} ዓ/ም`;
  const gregNumeric = `${pad2(greg.day)}/${pad2(greg.month)}/${greg.year}`;
  const gregIso = `${String(greg.year).padStart(4, '0')}-${pad2(greg.month)}-${pad2(greg.day)}`;

  return {
    eth,
    greg,
    ethNumeric,
    ethWithEra,
    ethMonthAm,
    ethMonthEn,
    ethNamedAm: `${ethMonthAm} ${eth.day} ቀን ${eth.year} ዓ/ም`,
    ethNamedEn: `${ethMonthEn} ${eth.day}, ${eth.year} E.C.`,
    gregNumeric,
    gregIso,
    hasTime,
    timeStr,
    time
  };
}

export function formatDualDateText(
  input?: string | Date | null,
  fallback = '—'
): string {
  const dual = formatDualDate(input);
  if (!dual) {
    if (typeof input === 'string' && input.trim()) return input.trim();
    return fallback;
  }
  return `${dual.ethWithEra} | ${dual.gregNumeric}`;
}

export function formatDualDateTimeText(
  input?: string | Date | null,
  fallback = '—'
): string {
  const dual = formatDualDate(input);
  if (!dual) {
    if (typeof input === 'string' && input.trim()) return input.trim();
    return fallback;
  }
  return dual.hasTime && dual.time
    ? `${dual.ethWithEra} | ${dual.gregNumeric} · ${dual.time.ethTimeShort} (${dual.time.stdTime12})`
    : `${dual.ethWithEra} | ${dual.gregNumeric}`;
}

export function formatDualDateCompact(
  input?: string | Date | null,
  fallback = '—'
): string {
  const dual = formatDualDate(input);
  if (!dual) {
    if (typeof input === 'string' && input.trim()) return input.trim();
    return fallback;
  }
  const ey = String(dual.eth.year).slice(-2);
  const gy = String(dual.greg.year).slice(-2);
  return `${pad2(dual.eth.day)}/${pad2(dual.eth.month)}/${ey} · ${pad2(dual.greg.day)}/${pad2(dual.greg.month)}/${gy}`;
}

export function getTodayDualDate(): DualDateFormatted {
  return formatDualDate(getAdjustedNow())!;
}
