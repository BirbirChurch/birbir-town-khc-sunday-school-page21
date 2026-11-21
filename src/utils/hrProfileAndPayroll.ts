import { ChurchHRRecord } from '../types';
import { getAdjustedNow, gregorianToEthiopian, parseDateInput } from './ethiopianDate';

export interface PayrollBreakdown {
  grossSalary: number;
  employeePension7: number; // 7% ከአገልጋዩ የሚቀነስ
  churchPension11: number; // 11% ከቤተክርስቲያን (የአገልጋዩ ደመወዝ ሳይነካ)
  totalPension18: number; // 18% ጠቅላላ ጡሬታ (7% + 11%)
  netSalary: number; // የተጣራ ደመወዝ (ከደመወዙ 7% ብቻ ተቀንሶ የሚመጣ)
  totalChurchOutlay: number; // ጠቅላላ የቤተክርስቲያን ወጪ (ደመወዝ + 11%)
}

export function roundBirr(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function formatBirr(value: number): string {
  const safe = roundBirr(value);
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function calculatePayrollBreakdown(
  rawGross: number | string | undefined,
  pensionExempt = false
): PayrollBreakdown {
  const parsed = typeof rawGross === 'number' ? rawGross : parseFloat(String(rawGross ?? '0'));
  const grossSalary = Number.isFinite(parsed) && parsed > 0 ? roundBirr(parsed) : 0;

  if (grossSalary <= 0 || pensionExempt) {
    return {
      grossSalary,
      employeePension7: 0,
      churchPension11: 0,
      totalPension18: 0,
      netSalary: grossSalary,
      totalChurchOutlay: grossSalary
    };
  }

  const employeePension7 = roundBirr(grossSalary * 0.07);
  const churchPension11 = roundBirr(grossSalary * 0.11);
  const totalPension18 = roundBirr(employeePension7 + churchPension11);
  const netSalary = roundBirr(grossSalary - employeePension7);
  const totalChurchOutlay = roundBirr(grossSalary + churchPension11);

  return {
    grossSalary,
    employeePension7,
    churchPension11,
    totalPension18,
    netSalary,
    totalChurchOutlay
  };
}

/**
 * Computes human-readable service duration ("የአገልግሎት ዘመን") from explicit serviceYears
 * or automatically from hireDate (supporting YYYY-MM-DD, YYYY, or Ethiopian years like 2010).
 */
export function computeServiceDuration(
  hireDate?: string,
  explicitServiceYears?: string,
  lang: 'am' | 'en' = 'am'
): string {
  const explicit = String(explicitServiceYears || '').trim();
  if (explicit) {
    if (/^\d+(\.\d+)?$/.test(explicit)) {
      return lang === 'am' ? `${explicit} ዓመት` : `${explicit} yrs`;
    }
    return explicit;
  }

  const rawHire = String(hireDate || '').trim();
  if (!rawHire) return '';

  const now = getAdjustedNow();

  // Handle pure 4-digit year entry (e.g., Ethiopian year 2010 or Gregorian year 2018)
  if (/^\d{4}$/.test(rawHire)) {
    const numYear = parseInt(rawHire, 10);
    const currentEthYear = gregorianToEthiopian(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    ).year;
    // Heuristic: values <= currentEthYear + 1 are treated as Ethiopian year, else Gregorian
    const refYear = numYear <= currentEthYear + 1 ? currentEthYear : now.getFullYear();
    const diff = Math.max(0, refYear - numYear);
    return lang === 'am' ? `${diff} ዓመት` : `${diff} yr(s)`;
  }

  const parsed = parseDateInput(rawHire);
  if (!parsed) return rawHire;

  const { year: hY, month: hM, day: hD } = parsed.greg;
  let years = now.getFullYear() - hY;
  let months = now.getMonth() + 1 - hM;
  if (now.getDate() < hD) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    return lang === 'am' ? '0 ዓመት' : '0 yrs';
  }
  if (years === 0 && months === 0) {
    return lang === 'am' ? 'ከ1 ወር በታች' : '< 1 month';
  }
  if (years === 0) {
    return lang === 'am' ? `${months} ወር` : `${months} mo(s)`;
  }
  if (months === 0) {
    return lang === 'am' ? `${years} ዓመት` : `${years} yr(s)`;
  }
  return lang === 'am' ? `${years} ዓመት ከ ${months} ወር` : `${years}y ${months}m`;
}

export function resolveHighestEducationLabel(rec: Pick<ChurchHRRecord, 'educationLevel' | 'educationCredentials'>): string {
  const direct = String(rec.educationLevel || '').trim();
  if (direct) return direct;
  const creds = Array.isArray(rec.educationCredentials) ? rec.educationCredentials : [];
  if (creds.length > 0) {
    return creds[0].title || '';
  }
  return '';
}

export const HR_MARITAL_STATUS_OPTIONS: string[] = [
  'ያላገባ/ች',
  'ባለትዳር',
  'የተፋታ/ች',
  'ባል/ሚስት የሞተበት/ባት'
];

export const HR_EDUCATION_LEVEL_OPTIONS: string[] = [
  'ማስተርስ (Masters / MDiv / MA)',
  'ዲግሪ (BTh / BA / BSc)',
  'ዲፕሎማ (Diploma)',
  'ሰርተፊኬት (Certificate)',
  'መጽሐፍ ቅዱስ ት/ቤት',
  '12ኛ ክፍል ያጠናቀቀ/ች',
  '10ኛ ክፍል ያጠናቀቀ/ች',
  'መሰረታዊ ትምህርት'
];
