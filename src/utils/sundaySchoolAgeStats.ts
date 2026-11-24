import { ChurchChild, ChurchMember, Student } from '../types';
import { normalizeAmharicSearchText } from './churchExcelParser';

export type SundaySchoolAgeBucketKey =
  | '0-3'
  | '4-6'
  | '7-9'
  | '10-12'
  | '13-14'
  | '15+'
  | 'unknown';

export interface AgeCohortRow {
  key: '0-3' | '4-6' | '7-9' | '10-12' | '13-14';
  label: string;
  min: number;
  max: number;
  male: number;
  female: number;
  unspecifiedGender: number;
  total: number;
}

export interface AgeSummaryCounts {
  male: number;
  female: number;
  unspecifiedGender: number;
  total: number;
}

export interface SundaySchoolAgeCohortStats {
  cohorts: AgeCohortRow[];
  subtotal0to14: AgeSummaryCounts;
  over14: AgeSummaryCounts & { key: '15+'; label: string };
  unknownAge: AgeSummaryCounts & { key: 'unknown'; label: string };
  grandTotal: AgeSummaryCounts;
}

export interface PerClassAgeCohortRow {
  className: string;
  cohorts: AgeCohortRow[];
  subtotal0to14: AgeSummaryCounts;
  over14: AgeSummaryCounts;
  unknownAge: AgeSummaryCounts;
  grandTotal: AgeSummaryCounts;
}

/**
 * Normalizes Amharic / English gender markers into 'male' | 'female' | 'unspecified'.
 */
export const normalizeStudentGender = (
  gender: unknown
): 'male' | 'female' | 'unspecified' => {
  const g = String(gender ?? '').trim().toLowerCase();
  if (!g) return 'unspecified';
  if (g === 'ወ' || g === 'ወንድ' || g === 'm' || g === 'male' || g === 'boy') {
    return 'male';
  }
  if (g === 'ሴ' || g === 'ሴት' || g === 'f' || g === 'female' || g === 'girl') {
    return 'female';
  }
  return 'unspecified';
};

/**
 * Normalizes Amharic / English gender into canonical short form ('ወ' | 'ሴ' | '').
 */
export const normalizeToShortGender = (gender: unknown): 'ወ' | 'ሴ' | '' => {
  const norm = normalizeStudentGender(gender);
  if (norm === 'male') return 'ወ';
  if (norm === 'female') return 'ሴ';
  return '';
};

/**
 * Safely parses a Sunday School student's age.
 * Returns null for blank / '-' / invalid values (NEVER coerces blank to 0,
 * so students without an age are not falsely counted in 0-3).
 * Also converts Ethiopian birth years (e.g. 2012) relative to currentYear.
 */
export const parseSundaySchoolAge = (
  rawAge: unknown,
  currentYear?: string | number
): number | null => {
  if (rawAge === null || rawAge === undefined) return null;

  if (typeof rawAge === 'number') {
    if (!Number.isFinite(rawAge) || rawAge < 0) return null;
    const refYear = Number(currentYear) || 2019;
    if (rawAge >= 1900 && rawAge <= refYear + 10) {
      const derived = refYear - Math.floor(rawAge);
      return derived >= 0 && derived <= 120 ? derived : null;
    }
    return rawAge <= 120 ? Math.floor(rawAge) : null;
  }

  const trimmed = String(rawAge).trim();
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'ያልተገለጸ') {
    return null;
  }

  // Handle decimal / integer inside strings like "7 ዓመት" or "3.5"
  const match = trimmed.match(/\d+(?:\.\d+)?/);
  if (!match) return null;

  const parsed = parseFloat(match[0]);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  const refYear =
    typeof currentYear === 'number'
      ? currentYear
      : parseInt(String(currentYear || '2019'), 10) || 2019;

  if (parsed >= 1900 && parsed <= refYear + 10) {
    const derived = refYear - Math.floor(parsed);
    return derived >= 0 && derived <= 120 ? derived : null;
  }

  return parsed <= 120 ? Math.floor(parsed) : null;
};

/**
 * Maps a student's raw age to one of the standard Sunday School buckets:
 * '0-3', '4-6', '7-9', '10-12', '13-14', '15+', or 'unknown'.
 */
export const getStudentAgeCohortKey = (
  rawAge: unknown,
  currentYear?: string | number
): SundaySchoolAgeBucketKey => {
  const age = parseSundaySchoolAge(rawAge, currentYear);
  if (age === null) return 'unknown';
  if (age >= 0 && age <= 3) return '0-3';
  if (age >= 4 && age <= 6) return '4-6';
  if (age >= 7 && age <= 9) return '7-9';
  if (age >= 10 && age <= 12) return '10-12';
  if (age >= 13 && age <= 14) return '13-14';
  return '15+';
};

export const getAgeCohortLabel = (key: SundaySchoolAgeBucketKey | 'all'): string => {
  switch (key) {
    case '0-3':
      return 'ከ0 - 3 ዓመት';
    case '4-6':
      return 'ከ4 - 6 ዓመት';
    case '7-9':
      return 'ከ7 - 9 ዓመት';
    case '10-12':
      return 'ከ10 - 12 ዓመት';
    case '13-14':
      return 'ከ13 - 14 ዓመት';
    case '15+':
      return 'ከ15 ዓመት በላይ';
    case 'unknown':
      return 'ዕድሜ ያልተገለጸ';
    default:
      return 'ሁሉም ዕድሜ';
  }
};

/**
 * Builds fast Amharic-normalized lookup maps from churchChildren & churchMembers
 * so Sunday School student records missing age, gender, chapel, parentName, or phone
 * are enriched accurately without ever overwriting existing non-empty fields.
 */
export interface ChurchStudentLookupRecord {
  age?: number | string;
  gender?: string;
  chapel?: string;
  parentName?: string;
  phone?: string;
  photoDataUrl?: string;
  photoStorageKey?: string;
}

export const buildChurchStudentLookup = (
  churchChildren: ChurchChild[] = [],
  churchMembers: ChurchMember[] = []
) => {
  const exactMap = new Map<string, ChurchStudentLookupRecord>();
  const twoPartMap = new Map<string, ChurchStudentLookupRecord | null>();

  const registerRecord = (name: string | undefined, rec: ChurchStudentLookupRecord) => {
    const normFull = normalizeAmharicSearchText(name);
    if (!normFull) return;

    const existing = exactMap.get(normFull);
    if (!existing) {
      exactMap.set(normFull, { ...rec });
    } else {
      exactMap.set(normFull, {
        age: parseSundaySchoolAge(existing.age) !== null ? existing.age : rec.age,
        gender: normalizeStudentGender(existing.gender) !== 'unspecified' ? existing.gender : rec.gender,
        chapel: existing.chapel || rec.chapel,
        parentName: existing.parentName || rec.parentName,
        phone: existing.phone || rec.phone,
        photoDataUrl: existing.photoDataUrl || rec.photoDataUrl,
        photoStorageKey: existing.photoStorageKey || rec.photoStorageKey
      });
    }

    const parts = normFull.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      const twoPartKey = `${parts[0]} ${parts[1]}`;
      if (!twoPartMap.has(twoPartKey)) {
        twoPartMap.set(twoPartKey, rec);
      } else {
        // Mark ambiguous if two different full names collide on 2-part prefix
        const prev = twoPartMap.get(twoPartKey);
        if (prev !== null) {
          twoPartMap.set(twoPartKey, null);
        }
      }
    }
  };

  // Register churchChildren first (primary pediatric source), then churchMembers
  churchChildren.forEach((c) => {
    registerRecord(c.name, {
      age: c.age,
      gender: c.gender,
      chapel: c.chapel,
      parentName: c.parentName,
      phone: c.phone,
      photoDataUrl: c.photoDataUrl,
      photoStorageKey: c.photoStorageKey
    });
  });

  churchMembers.forEach((m) => {
    registerRecord(m.name, {
      age: m.age,
      gender: m.gender,
      chapel: m.chapel,
      parentName: m.parentName,
      phone: m.phone,
      photoDataUrl: m.photoDataUrl,
      photoStorageKey: m.photoStorageKey
    });
  });

  const findMatch = (studentName: string | undefined): ChurchStudentLookupRecord | undefined => {
    const norm = normalizeAmharicSearchText(studentName);
    if (!norm) return undefined;
    const exact = exactMap.get(norm);
    if (exact) return exact;

    const parts = norm.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      const twoPart = twoPartMap.get(`${parts[0]} ${parts[1]}`);
      if (twoPart) return twoPart;
    }
    return undefined;
  };

  return { findMatch };
};

export const enrichStudentWithChurchLookup = <
  T extends Pick<Student, 'name' | 'age' | 'gender'> & {
    chapel?: string;
    parentName?: string;
    phone?: string;
    photoDataUrl?: string;
    photoStorageKey?: string;
  }
>(
  student: T,
  lookup: ReturnType<typeof buildChurchStudentLookup>,
  currentYear?: string | number
): T & { fallbackPhotoDataUrl?: string; fallbackPhotoStorageKey?: string } => {
  const match = lookup.findMatch(student.name);
  if (!match) return student;

  const hasAge = parseSundaySchoolAge(student.age, currentYear) !== null;
  const hasGender = normalizeStudentGender(student.gender) !== 'unspecified';
  const matchHasAge = parseSundaySchoolAge(match.age, currentYear) !== null;
  const matchGenderShort = normalizeToShortGender(match.gender);

  return {
    ...student,
    age: hasAge ? student.age : matchHasAge ? match.age! : student.age,
    gender: hasGender ? student.gender : matchGenderShort || student.gender,
    chapel: student.chapel || match.chapel,
    parentName: student.parentName || match.parentName,
    phone: student.phone || match.phone,
    fallbackPhotoDataUrl: match.photoDataUrl,
    fallbackPhotoStorageKey: match.photoStorageKey
  };
};

/**
 * Computes exact Male (ወንድ), Female (ሴት), Unspecified, and Total (ድምር)
 * for Sunday School students across 0-3, 4-6, 7-9, 10-12, and 13-14,
 * plus 0-14 subtotal, 15+, unknown age, and grand total.
 */
export const computeSundaySchoolAgeCohorts = <
  T extends { age?: unknown; gender?: unknown }
>(
  students: T[],
  currentYear?: string | number
): SundaySchoolAgeCohortStats => {
  const cohorts: AgeCohortRow[] = [
    { key: '0-3', label: 'ከ0 - 3 ዓመት', min: 0, max: 3, male: 0, female: 0, unspecifiedGender: 0, total: 0 },
    { key: '4-6', label: 'ከ4 - 6 ዓመት', min: 4, max: 6, male: 0, female: 0, unspecifiedGender: 0, total: 0 },
    { key: '7-9', label: 'ከ7 - 9 ዓመት', min: 7, max: 9, male: 0, female: 0, unspecifiedGender: 0, total: 0 },
    { key: '10-12', label: 'ከ10 - 12 ዓመት', min: 10, max: 12, male: 0, female: 0, unspecifiedGender: 0, total: 0 },
    { key: '13-14', label: 'ከ13 - 14 ዓመት', min: 13, max: 14, male: 0, female: 0, unspecifiedGender: 0, total: 0 }
  ];

  const cohortByKey = new Map<string, AgeCohortRow>();
  cohorts.forEach((c) => cohortByKey.set(c.key, c));

  const subtotal0to14: AgeSummaryCounts = { male: 0, female: 0, unspecifiedGender: 0, total: 0 };
  const over14: AgeSummaryCounts & { key: '15+'; label: string } = {
    key: '15+',
    label: 'ከ15 ዓመት በላይ',
    male: 0,
    female: 0,
    unspecifiedGender: 0,
    total: 0
  };
  const unknownAge: AgeSummaryCounts & { key: 'unknown'; label: string } = {
    key: 'unknown',
    label: 'ዕድሜ ያልተገለጸ',
    male: 0,
    female: 0,
    unspecifiedGender: 0,
    total: 0
  };
  const grandTotal: AgeSummaryCounts = { male: 0, female: 0, unspecifiedGender: 0, total: 0 };

  const increment = (bucket: AgeSummaryCounts, g: 'male' | 'female' | 'unspecified') => {
    bucket.total++;
    if (g === 'male') bucket.male++;
    else if (g === 'female') bucket.female++;
    else bucket.unspecifiedGender++;
  };

  for (const student of students) {
    const g = normalizeStudentGender(student.gender);
    const key = getStudentAgeCohortKey(student.age, currentYear);

    increment(grandTotal, g);

    if (key === 'unknown') {
      increment(unknownAge, g);
    } else if (key === '15+') {
      increment(over14, g);
    } else {
      const target = cohortByKey.get(key);
      if (target) {
        increment(target, g);
        increment(subtotal0to14, g);
      }
    }
  }

  return {
    cohorts,
    subtotal0to14,
    over14,
    unknownAge,
    grandTotal
  };
};

/**
 * Computes per-class breakdown across 0-3, 4-6, 7-9, 10-12, and 13-14 (Male / Female / Total).
 */
export const computePerClassSundaySchoolCohorts = <
  T extends { age?: unknown; gender?: unknown }
>(
  classNames: string[],
  studentsByClass: { [className: string]: T[] },
  currentYear?: string | number
): PerClassAgeCohortRow[] => {
  return classNames.map((className) => {
    const list = studentsByClass[className] || [];
    const stats = computeSundaySchoolAgeCohorts(list, currentYear);
    return {
      className,
      cohorts: stats.cohorts,
      subtotal0to14: stats.subtotal0to14,
      over14: stats.over14,
      unknownAge: stats.unknownAge,
      grandTotal: stats.grandTotal
    };
  });
};

/**
 * Builds both the Age-Cohort Summary sheet and Per-Class Matrix sheet for Excel export.
 */
export const buildAgeCohortExcelSheets = (
  ageCohortStats: SundaySchoolAgeCohortStats,
  perClassCohorts: PerClassAgeCohortRow[],
  currentYear: string,
  scopeLabel: string
) => {
  const denom = ageCohortStats.grandTotal.total;
  const pctStr = (n: number) => (denom > 0 ? `${Math.round((n / denom) * 100)}%` : '0%');

  const summaryRows: (string | number)[][] = [
    [`የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን - የሰንበት ክፍል ተማሪዎች የዕድሜ ምድብ ማጠቃለያ (${currentYear} ዓ/ም)`],
    [`ወሰን / ማጣሪያ፦ ${scopeLabel}`],
    [],
    ['የዕድሜ ምድብ', 'ወንድ', 'ሴት', 'ያልተገለጸ ጾታ', 'ድምር', 'ድርሻ (%)'],
    ...ageCohortStats.cohorts.map((c) => [
      c.label,
      c.male,
      c.female,
      c.unspecifiedGender,
      c.total,
      pctStr(c.total)
    ]),
    [
      'ከ0 - 14 ዓመት ንዑስ ድምር (0-14)',
      ageCohortStats.subtotal0to14.male,
      ageCohortStats.subtotal0to14.female,
      ageCohortStats.subtotal0to14.unspecifiedGender,
      ageCohortStats.subtotal0to14.total,
      pctStr(ageCohortStats.subtotal0to14.total)
    ],
    ...(ageCohortStats.over14.total > 0
      ? [
          [
            ageCohortStats.over14.label,
            ageCohortStats.over14.male,
            ageCohortStats.over14.female,
            ageCohortStats.over14.unspecifiedGender,
            ageCohortStats.over14.total,
            pctStr(ageCohortStats.over14.total)
          ]
        ]
      : []),
    ...(ageCohortStats.unknownAge.total > 0
      ? [
          [
            ageCohortStats.unknownAge.label,
            ageCohortStats.unknownAge.male,
            ageCohortStats.unknownAge.female,
            ageCohortStats.unknownAge.unspecifiedGender,
            ageCohortStats.unknownAge.total,
            pctStr(ageCohortStats.unknownAge.total)
          ]
        ]
      : []),
    [
      'ጠቅላላ የሰንበት ክፍል ተማሪዎች ድምር',
      ageCohortStats.grandTotal.male,
      ageCohortStats.grandTotal.female,
      ageCohortStats.grandTotal.unspecifiedGender,
      ageCohortStats.grandTotal.total,
      denom > 0 ? '100%' : '0%'
    ]
  ];

  const perClassRows: (string | number)[][] = [
    [
      'ክፍል / ደረጃ',
      '0-3 ወንድ',
      '0-3 ሴት',
      '0-3 ድምር',
      '4-6 ወንድ',
      '4-6 ሴት',
      '4-6 ድምር',
      '7-9 ወንድ',
      '7-9 ሴት',
      '7-9 ድምር',
      '10-12 ወንድ',
      '10-12 ሴት',
      '10-12 ድምር',
      '13-14 ወንድ',
      '13-14 ሴት',
      '13-14 ድምር',
      '0-14 ድምር',
      '15+ / ያልተገለጸ',
      'ጠቅላላ ተማሪዎች'
    ],
    ...perClassCohorts.map((row) => {
      const c = row.cohorts;
      return [
        row.className,
        c[0].male,
        c[0].female,
        c[0].total,
        c[1].male,
        c[1].female,
        c[1].total,
        c[2].male,
        c[2].female,
        c[2].total,
        c[3].male,
        c[3].female,
        c[3].total,
        c[4].male,
        c[4].female,
        c[4].total,
        row.subtotal0to14.total,
        row.over14.total + row.unknownAge.total,
        row.grandTotal.total
      ];
    }),
    [
      'ጠቅላላ ድምር',
      ageCohortStats.cohorts[0].male,
      ageCohortStats.cohorts[0].female,
      ageCohortStats.cohorts[0].total,
      ageCohortStats.cohorts[1].male,
      ageCohortStats.cohorts[1].female,
      ageCohortStats.cohorts[1].total,
      ageCohortStats.cohorts[2].male,
      ageCohortStats.cohorts[2].female,
      ageCohortStats.cohorts[2].total,
      ageCohortStats.cohorts[3].male,
      ageCohortStats.cohorts[3].female,
      ageCohortStats.cohorts[3].total,
      ageCohortStats.cohorts[4].male,
      ageCohortStats.cohorts[4].female,
      ageCohortStats.cohorts[4].total,
      ageCohortStats.subtotal0to14.total,
      ageCohortStats.over14.total + ageCohortStats.unknownAge.total,
      ageCohortStats.grandTotal.total
    ]
  ];

  return { summaryRows, perClassRows };
};

