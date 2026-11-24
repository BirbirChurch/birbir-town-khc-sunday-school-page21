import { AnnualPlanItem, PlanExecutionLogEntry, PlanQuarterKey } from '../types';
import { formatDualDate, getAdjustedNow } from './ethiopianDate';

export interface DetectedEthiopianQuarter {
  quarter: PlanQuarterKey;
  halfYear: 'h1' | 'h2';
  ethMonth: number;
  ethMonthAm: string;
  ethMonthEn: string;
  ethYear: number;
  /**
   * Ethiopian Planning / Fiscal Year (የዕቅድ ዘመን):
   * Plan year Y starts on ሐምሌ 1, (Y - 1) and ends on ሰኔ 30, Y.
   * For example, 2019 Plan Year runs ሐምሌ 2018 – ሰኔ 2019.
   */
  fiscalPlanYear: number;
  ethDateText: string;
}

export const PLAN_QUARTERS: PlanQuarterKey[] = ['q1', 'q2', 'q3', 'q4'];

export const getHalfYearForQuarter = (q: PlanQuarterKey): 'h1' | 'h2' =>
  q === 'q1' || q === 'q2' ? 'h1' : 'h2';

const parsePlanYearNumber = (planYear?: string | number): number | null => {
  if (planYear === undefined || planYear === null || planYear === '') return null;
  const n = parseInt(String(planYear), 10);
  return Number.isFinite(n) && n >= 1900 ? n : null;
};

export const getPlanYearSpanLabel = (
  planYear: string | number,
  lang: 'am' | 'en' = 'am'
): string => {
  const yr = parsePlanYearNumber(planYear);
  if (!yr) {
    return lang === 'en'
      ? `${planYear} Plan Year (Hamle – Sene)`
      : `የ${planYear} ዕቅድ ዘመን (ሐምሌ – ሰኔ)`;
  }
  const prevYr = yr - 1;
  return lang === 'en'
    ? `${yr} E.C. Plan Year (Hamle ${prevYr} – Sene ${yr})`
    : `የ${yr} ዓ/ም ዕቅድ ዘመን (ሐምሌ ${prevYr} – ሰኔ ${yr})`;
};

export const getQuarterShortLabel = (
  q: PlanQuarterKey,
  lang: 'am' | 'en' = 'am',
  planYear?: string | number
): string => {
  const yr = parsePlanYearNumber(planYear);
  const prevYr = yr ? yr - 1 : null;

  if (lang === 'en') {
    if (!yr || !prevYr) {
      switch (q) {
        case 'q1':
          return 'Q1 (Hamle–Meskerem)';
        case 'q2':
          return 'Q2 (Tikimt–Tahsas)';
        case 'q3':
          return 'Q3 (Tir–Megabit)';
        case 'q4':
          return 'Q4 (Miyazya–Sene)';
      }
    }
    switch (q) {
      case 'q1':
        return `Q1 (Hamle ${prevYr}–Meskerem ${yr})`;
      case 'q2':
        return `Q2 (Tikimt–Tahsas ${yr})`;
      case 'q3':
        return `Q3 (Tir–Megabit ${yr})`;
      case 'q4':
        return `Q4 (Miyazya–Sene ${yr})`;
    }
  }

  if (!yr || !prevYr) {
    switch (q) {
      case 'q1':
        return '1ኛ ሩብ (ሐምሌ–መስከረም)';
      case 'q2':
        return '2ኛ ሩብ (ጥቅምት–ታኅሣሥ)';
      case 'q3':
        return '3ኛ ሩብ (ጥር–መጋቢት)';
      case 'q4':
        return '4ኛ ሩብ (ሚያዝያ–ሰኔ)';
    }
  }

  switch (q) {
    case 'q1':
      return `1ኛ ሩብ (ሐምሌ ${prevYr}–መስከረም ${yr})`;
    case 'q2':
      return `2ኛ ሩብ (ጥቅምት–ታኅሣሥ ${yr})`;
    case 'q3':
      return `3ኛ ሩብ (ጥር–መጋቢት ${yr})`;
    case 'q4':
      return `4ኛ ሩብ (ሚያዝያ–ሰኔ ${yr})`;
  }
};

export const getHalfYearLabel = (
  h: 'h1' | 'h2',
  lang: 'am' | 'en' = 'am',
  planYear?: string | number
): string => {
  const yr = parsePlanYearNumber(planYear);
  const prevYr = yr ? yr - 1 : null;

  if (lang === 'en') {
    if (!yr || !prevYr) {
      return h === 'h1'
        ? '1st Half-Year (Hamle–Tahsas / Q1+Q2)'
        : '2nd Half-Year (Tir–Sene / Q3+Q4)';
    }
    return h === 'h1'
      ? `1st Half-Year (Hamle ${prevYr}–Tahsas ${yr})`
      : `2nd Half-Year (Tir–Sene ${yr})`;
  }

  if (!yr || !prevYr) {
    return h === 'h1'
      ? '1ኛ ግማሽ ዓመት (ሐምሌ–ታኅሣሥ)'
      : '2ኛ ግማሽ ዓመት (ጥር–ሰኔ)';
  }
  return h === 'h1'
    ? `1ኛ ግማሽ ዓመት (ሐምሌ ${prevYr}–ታኅሣሥ ${yr})`
    : `2ኛ ግማሽ ዓመት (ጥር–ሰኔ ${yr})`;
};

/**
 * Ethiopian Church/Fiscal Planning Year starts on ሐምሌ 1 (NOT መስከረም 1):
 * Plan Year Y (e.g., 2019) runs from ሐምሌ 1, (Y-1) to ሰኔ 30, Y:
 * - Q1 (1ኛ ሩብ): ሐምሌ (11), ነሐሴ (12), ጳጉሜ (13) of (Y-1) + መስከረም (1) of Y
 * - Q2 (2ኛ ሩብ): ጥቅምት (2), ኅዳር (3), ታኅሣሥ (4) of Y
 * - Q3 (3ኛ ሩብ): ጥር (5), የካቲት (6), መጋቢት (7) of Y
 * - Q4 (4ኛ ሩብ): ሚያዝያ (8), ግንቦት (9), ሰኔ (10) of Y
 */
export const detectEthiopianQuarterFromDate = (
  dateInput?: string | Date | null
): DetectedEthiopianQuarter | null => {
  const dual = formatDualDate(dateInput);
  if (!dual) return null;

  const m = dual.eth.month;
  const fiscalPlanYear = m >= 11 ? dual.eth.year + 1 : dual.eth.year;

  let quarter: PlanQuarterKey;
  if (m === 11 || m === 12 || m === 13 || m === 1) {
    quarter = 'q1';
  } else if (m >= 2 && m <= 4) {
    quarter = 'q2';
  } else if (m >= 5 && m <= 7) {
    quarter = 'q3';
  } else {
    quarter = 'q4';
  }

  return {
    quarter,
    halfYear: getHalfYearForQuarter(quarter),
    ethMonth: m,
    ethMonthAm: dual.ethMonthAm,
    ethMonthEn: dual.ethMonthEn,
    ethYear: dual.eth.year,
    fiscalPlanYear,
    ethDateText: dual.ethNamedAm
  };
};

export const getCurrentEthiopianFiscalPlanYear = (): number => {
  return detectEthiopianQuarterFromDate(getAdjustedNow())?.fiscalPlanYear ?? 2019;
};

export const sumPlanLogsByQuarter = (
  logs: PlanExecutionLogEntry[] = []
): {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  h1: number;
  h2: number;
  year: number;
} => {
  let q1 = 0;
  let q2 = 0;
  let q3 = 0;
  let q4 = 0;

  logs.forEach((entry) => {
    const qty = Math.max(0, Number(entry.quantity) || 0);
    if (entry.quarter === 'q1') q1 += qty;
    else if (entry.quarter === 'q2') q2 += qty;
    else if (entry.quarter === 'q3') q3 += qty;
    else if (entry.quarter === 'q4') q4 += qty;
  });

  const h1 = q1 + q2;
  const h2 = q3 + q4;
  return { q1, q2, q3, q4, h1, h2, year: h1 + h2 };
};

/**
 * Automatically updates q1Done..q4Done on a plan item when its executionLogs change,
 * preserving any non-log manual base amount that existed prior to logging.
 */
export const reconcilePlanWithExecutionLogs = (
  plan: AnnualPlanItem,
  nextLogs: PlanExecutionLogEntry[]
): AnnualPlanItem => {
  const prevTotals = sumPlanLogsByQuarter(plan.executionLogs || []);
  const nextTotals = sumPlanLogsByQuarter(nextLogs);

  const nextDoneFor = (q: PlanQuarterKey): number => {
    const currentVal = Math.max(0, Number(plan[`${q}Done`]) || 0);
    const manualBase = Math.max(0, currentVal - prevTotals[q]);
    return manualBase + nextTotals[q];
  };

  const sortedLogs = [...nextLogs].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || ''))
  );

  return {
    ...plan,
    q1Done: nextDoneFor('q1'),
    q2Done: nextDoneFor('q2'),
    q3Done: nextDoneFor('q3'),
    q4Done: nextDoneFor('q4'),
    executionLogs: sortedLogs
  };
};
