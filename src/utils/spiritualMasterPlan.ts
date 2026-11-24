import * as XLSX from 'xlsx';
import {
  AnnualPlanItem,
  SpiritualMasterPlanNarratives,
  SpiritualMasterPlanRowValues,
  SpiritualMasterPlanSheetData,
  SpiritualMasterPlanSignOff
} from '../types';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { generateUniqueId } from './idGenerator';
import { mapToOfficialChapelStrict, normalizeAmharicSearchText } from './amharicSearchAndChapel';

export interface SpiritualMasterPlanTemplateItem {
  code: string;
  task: string;
  unit: string;
  isSection: boolean;
  sectionCode: string;
  isPercentage?: boolean;
  isSectionTotal?: boolean;
}

export const SPIRITUAL_MASTER_PLAN_ITEMS: SpiritualMasterPlanTemplateItem[] = [
  { code: '1', task: 'የቻፕሉን አባላት እስታትስቲካዊ መረጃ አደራጅቶ መያዝ', unit: '', isSection: true, sectionCode: '1' },
  { code: '1.1', task: 'አባወራ/እማወራ', unit: 'በቁጥር', isSection: false, sectionCode: '1' },
  { code: '1.2', task: 'ወጣቶች', unit: 'በቁጥር', isSection: false, sectionCode: '1' },
  { code: '1.3', task: 'ልጆች', unit: 'በቁጥር', isSection: false, sectionCode: '1' },
  { code: '1.4', task: 'ጠቅላላ ድምር', unit: 'በቁጥር', isSection: false, sectionCode: '1', isSectionTotal: true },

  { code: '2', task: 'የተለያዩ አደረጃጀቶችን ማጠናከር', unit: '', isSection: true, sectionCode: '2' },
  { code: '2.1', task: 'የአባቶች ኮሚቴ', unit: 'በዙር', isSection: false, sectionCode: '2' },
  { code: '2.2', task: '- የሴቶች ኮሚቴ', unit: 'በዙር', isSection: false, sectionCode: '2' },
  { code: '2.3', task: '- የወጣቶች ኮሚቴ', unit: 'በዙር', isSection: false, sectionCode: '2' },
  { code: '2.4', task: '- የልጆች ኮሚቴ', unit: 'በዙር', isSection: false, sectionCode: '2' },
  { code: '2.5', task: '- የእርቅ ኮሚቴ', unit: 'በዙር', isSection: false, sectionCode: '2' },
  { code: '2.6', task: '- የዲያቆናት ኮሚቴ', unit: 'በዙር', isSection: false, sectionCode: '2' },
  { code: '2.7', task: '- የወንጌል ማህበርተኛ ኮሚቴ', unit: 'በዙር', isSection: false, sectionCode: '2' },
  { code: '2.8', task: '- የመጽሐፍ ቅዱስ ምሩቃንን ማደራጀት', unit: 'በዙር', isSection: false, sectionCode: '2' },
  { code: '2.9', task: '- የጸሎት ቡድኖችን ማደራጀት', unit: 'በቡድን', isSection: false, sectionCode: '2' },

  { code: '3', task: 'ወንጌል የማዳረስ አገልግሎት ማጠናከር', unit: '', isSection: true, sectionCode: '3' },
  { code: '3.1', task: '- የወንጌል ስርጭት ቡድኖችን ማዋቀር', unit: 'በቡድን', isSection: false, sectionCode: '3' },
  { code: '3.2', task: '- ወንጌል የሚመሰከርላቸው', unit: 'በቁጥር', isSection: false, sectionCode: '3' },
  { code: '3.3', task: '- በንስሐ የሚመለሱ', unit: 'በቁጥር', isSection: false, sectionCode: '3' },
  { code: '3.4', task: '- አዲስ ጌታን የሚቀበሉ', unit: 'በቁጥር', isSection: false, sectionCode: '3' },
  { code: '3.5', task: '- ተስፋ የሚሰጡ', unit: 'በቁጥር', isSection: false, sectionCode: '3' },
  { code: '3.6', task: '- ለወንጌል ስርጭት ቡድኖች ሥልጠና ማዘጋጀትና መስጠት', unit: 'በዙር', isSection: false, sectionCode: '3' },
  { code: '3.7', task: '- ስለ ወንጌል ተልዕኮና ስለ ማህበርተኛው ትምህርት መስጠት', unit: 'በዙር', isSection: false, sectionCode: '3' },
  { code: '3.8', task: '- ነባር የወንጌል ማህበርተኛ አባላትን ማበረታታትና አዲስ መመልመል', unit: 'በቁጥር', isSection: false, sectionCode: '3' },
  { code: '3.9', task: '- ለወንጌል ማህበርተኛ ከዓመት ገቢ 10% ገቢ ማድረግ', unit: 'በዙር', isSection: false, sectionCode: '3' },

  { code: '4', task: 'ምዕመናንን የተሰጡ የክርስቶስ ደቀመዛሙርት ማድረግ', unit: '', isSection: true, sectionCode: '4' },
  { code: '4.1', task: '- መሠረታዊ የክርስትና ትምህርት (ደህንነት)', unit: 'በቡድን / በዙር', isSection: false, sectionCode: '4' },
  { code: '4.2', task: '- የንስሐ ትምህርት መስጠት', unit: 'በቡድን / በዙር', isSection: false, sectionCode: '4' },
  { code: '4.3', task: '- የጥምቀት ትምህርት መስጠት', unit: 'በቡድን', isSection: false, sectionCode: '4' },
  { code: '4.4', task: '- የአገልግሎት ትምህርት መስጠት', unit: 'በቡድን / በዙር', isSection: false, sectionCode: '4' },
  { code: '4.5', task: '- የደቀመዝሙርነት ትምህርት መስጠት', unit: 'በቡድን / በዙር', isSection: false, sectionCode: '4' },
  { code: '4.6', task: '- ከስህተት ትምህርት መጠበቂያ ትምህርቶችን ማስተማር', unit: 'በዙር', isSection: false, sectionCode: '4' },

  { code: '5', task: 'ተተኪ ትውልድ ማፍራት /ማዘጋጀት/', unit: '', isSection: true, sectionCode: '5' },
  { code: '5.1.1', task: '- ልጆችን በየዕድሜአቸው ለይቶ ማስተማር', unit: 'በቡድን', isSection: false, sectionCode: '5' },
  { code: '5.1.2', task: '- ልጆችን በአገልግሎት ማሳተፍ', unit: 'በዙር', isSection: false, sectionCode: '5' },
  { code: '5.2.1', task: '- የወጣቶችን አምልኮ ማካሄድ', unit: 'በዙር', isSection: false, sectionCode: '5' },
  { code: '5.2.2', task: '- ወጣቶችን በአገልግሎቶች ማሳተፍ', unit: 'በዙር', isSection: false, sectionCode: '5' },

  { code: '6', task: 'አገልጋዮችን በበቂ ጥራትና ብቃት ማዘጋጀት (በሥልጠናዎች)', unit: '', isSection: true, sectionCode: '6' },
  { code: '6.1', task: '- የመሪነትና የአገልግሎት ተከታታይ ሥልጠናዎችን መስጠት', unit: 'በዙር / በቡድን', isSection: false, sectionCode: '6' },
  { code: '6.2', task: '- ቢ.ቲ.ሲ.ፒ (BTCP)', unit: 'በቡድን', isSection: false, sectionCode: '6' },
  { code: '6.3', task: '- መ.ቅ.ህ.ማ', unit: 'በቡድን', isSection: false, sectionCode: '6' },
  { code: '6.4', task: '- ኤማሁስ', unit: 'በቡድን', isSection: false, sectionCode: '6' },
  { code: '6.5', task: '- ሌሎችም…', unit: 'ሲኖሩ', isSection: false, sectionCode: '6' },

  { code: '7', task: 'ሴቶችና የማህበረሰብ ሁለንተናዊ አገልግሎትን ማጠናከር', unit: '', isSection: true, sectionCode: '7' },
  { code: '7.1', task: '- ለሴቶች ትምህርት ማዘጋጀትና ማስተማር (መጽሐፎችን)', unit: 'በቡድን / በዙር', isSection: false, sectionCode: '7' },
  { code: '7.2', task: '- የፍቅርና ርኅራሄ አገልግሎት ማጠናከሪያ ትምህርት መስጠት', unit: 'በዙር', isSection: false, sectionCode: '7' },
  { code: '7.3', task: '- ነባር የፍቅርና ረኅራሄ አባላትን ማጠናከርና አዳዲስ መጋበዝ', unit: 'በዙር', isSection: false, sectionCode: '7' },
  { code: '7.4', task: '- የምስጋና ፕሮግራሞችን ማስተባበር', unit: 'በፐረሰንት', isSection: false, sectionCode: '7', isPercentage: true },
  { code: '7.5', task: '- የመጽናናት ፕሮግራሞችን ማስተባበር', unit: 'በፐረሰንት', isSection: false, sectionCode: '7', isPercentage: true },
  { code: '7.6', task: '- ድንገተኛ እክል የደረሰባቸውን መጠየቅና ማስጠየቅ', unit: 'በፐረሰንት', isSection: false, sectionCode: '7', isPercentage: true },
  { code: '7.7', task: '- የእርቅ አገልግሎቶችን መስጠት', unit: 'በፐረሰንት', isSection: false, sectionCode: '7', isPercentage: true },
  { code: '7.8', task: '- አዲስ አባላትን መቀበል', unit: 'በፐረሰንት', isSection: false, sectionCode: '7', isPercentage: true },
  { code: '7.9', task: '- የምዕመናን ጉብኝትን ማጠናከር', unit: 'በዙር ቤቶች ሰዎች', isSection: false, sectionCode: '7' },
  { code: '7.10', task: '- የቤተሰብ አምልኮን ማጠናከር', unit: 'በቁጥር', isSection: false, sectionCode: '7' },
  { code: '7.11', task: '- ቅድመ-ጋብቻና ድህረ-ጋብቻ ከመንፈሳዊ ዘርፍ ጋር ማገናኘት', unit: 'በፐረሰንት', isSection: false, sectionCode: '7', isPercentage: true },

  { code: '8', task: 'የገቢ አውታሮችን ማስፋት', unit: '', isSection: true, sectionCode: '8' },
  { code: '8.1', task: '- ስለ አሥራት፣ በኩራት፣ መባና ስጦታ ማስተማር', unit: 'በዙር', isSection: false, sectionCode: '8' },
  { code: '8.2', task: '- ሌሎች የገቢ አማራጮች መፍጠር', unit: 'በዙር', isSection: false, sectionCode: '8' }
];

export const SPIRITUAL_MASTER_PLAN_LEAF_ITEMS = SPIRITUAL_MASTER_PLAN_ITEMS.filter((it) => !it.isSection);

export const NARRATIVE_SECTION_META: {
  key: keyof SpiritualMasterPlanNarratives;
  prefix: string;
  labelAm: string;
  labelEn: string;
  defaultLines: number;
}[] = [
  {
    key: 'otherActivities',
    prefix: 'ሀ/',
    labelAm: 'ሌሎች የተከናወኑ ተግባራት አገልግሎቶች',
    labelEn: 'Other Completed Ministry Activities',
    defaultLines: 4
  },
  {
    key: 'challenges',
    prefix: 'ለ/',
    labelAm: 'ያጋጠሙ ችግሮች',
    labelEn: 'Challenges Encountered',
    defaultLines: 4
  },
  {
    key: 'solutions',
    prefix: 'ሐ/',
    labelAm: 'የተወሰዱ የመፍትሔ እርምጃዎች',
    labelEn: 'Solutions & Actions Taken',
    defaultLines: 3
  },
  {
    key: 'thanksgiving',
    prefix: 'መ/',
    labelAm: 'ምስጋና',
    labelEn: 'Thanksgiving',
    defaultLines: 4
  },
  {
    key: 'prayer',
    prefix: 'ሠ/',
    labelAm: 'ጸሎት',
    labelEn: 'Prayer Requests',
    defaultLines: 2
  }
];

export const createEmptyRowValues = (): SpiritualMasterPlanRowValues => ({
  yearPlan: '',
  half1: '',
  half2: '',
  q1: '',
  q2: '',
  q3: '',
  q4: '',
  remarks: ''
});

export const createEmptySpiritualMasterPlanSheet = (year: string): SpiritualMasterPlanSheetData => {
  const rows: { [code: string]: SpiritualMasterPlanRowValues } = {};
  SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.forEach((it) => {
    rows[it.code] = createEmptyRowValues();
  });
  return {
    year,
    rows,
    narratives: {
      otherActivities: ['', '', '', ''],
      challenges: ['', '', '', ''],
      solutions: ['', '', ''],
      thanksgiving: ['', '', '', ''],
      prayer: ['', '']
    },
    signOff: {
      reporterName: '',
      reporterSignature: '',
      reporterDate: '',
      receiverName: '',
      receiverSignature: '',
      receiverDate: ''
    }
  };
};

export const ensureSpiritualMasterPlanSheet = (
  raw: SpiritualMasterPlanSheetData | undefined | null,
  year: string
): SpiritualMasterPlanSheetData => {
  const base = createEmptySpiritualMasterPlanSheet(year);
  if (!raw) return base;
  const rows: { [code: string]: SpiritualMasterPlanRowValues } = { ...base.rows };
  SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.forEach((it) => {
    const r = raw.rows?.[it.code];
    if (r) {
      rows[it.code] = {
        yearPlan: r.yearPlan ?? '',
        half1: r.half1 ?? '',
        half2: r.half2 ?? '',
        q1: r.q1 ?? '',
        q2: r.q2 ?? '',
        q3: r.q3 ?? '',
        q4: r.q4 ?? '',
        remarks: r.remarks ?? ''
      };
    }
  });
  const padLines = (arr: string[] | undefined, minLen: number): string[] => {
    const clean = Array.isArray(arr) ? [...arr] : [];
    while (clean.length < minLen) clean.push('');
    return clean;
  };
  return {
    year: raw.year || year,
    rows,
    narratives: {
      otherActivities: padLines(raw.narratives?.otherActivities, 4),
      challenges: padLines(raw.narratives?.challenges, 4),
      solutions: padLines(raw.narratives?.solutions, 3),
      thanksgiving: padLines(raw.narratives?.thanksgiving, 4),
      prayer: padLines(raw.narratives?.prayer, 2)
    },
    signOff: {
      reporterName: raw.signOff?.reporterName || '',
      reporterSignature: raw.signOff?.reporterSignature || '',
      reporterDate: raw.signOff?.reporterDate || '',
      receiverName: raw.signOff?.receiverName || '',
      receiverSignature: raw.signOff?.receiverSignature || '',
      receiverDate: raw.signOff?.receiverDate || ''
    },
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy
  };
};

export const toNum = (v: number | string | undefined | null): number => {
  if (v === undefined || v === null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

export const hasAnyNumericValue = (r: SpiritualMasterPlanRowValues | undefined): boolean => {
  if (!r) return false;
  return (
    toNum(r.yearPlan) > 0 ||
    toNum(r.half1) > 0 ||
    toNum(r.half2) > 0 ||
    toNum(r.q1) > 0 ||
    toNum(r.q2) > 0 ||
    toNum(r.q3) > 0 ||
    toNum(r.q4) > 0
  );
};

export const getFilledItemCountForSheet = (sheet: SpiritualMasterPlanSheetData | undefined): number => {
  if (!sheet) return 0;
  return SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.filter((it) => hasAnyNumericValue(sheet.rows[it.code])).length;
};

/**
 * Normalizes half1/half2/yearPlan whenever a quarterly or half-year cell changes.
 */
export const updateSheetRowField = (
  sheet: SpiritualMasterPlanSheetData,
  code: string,
  field: keyof SpiritualMasterPlanRowValues,
  value: string
): SpiritualMasterPlanSheetData => {
  const nextRows = { ...sheet.rows };
  const current = { ...(nextRows[code] || createEmptyRowValues()), [field]: value };

  if (field === 'q1' || field === 'q2') {
    const q1N = toNum(current.q1);
    const q2N = toNum(current.q2);
    const bothEmpty = String(current.q1).trim() === '' && String(current.q2).trim() === '';
    current.half1 = bothEmpty ? '' : String(q1N + q2N);
    const h1N = toNum(current.half1);
    const h2N = toNum(current.half2);
    current.yearPlan = h1N + h2N > 0 ? String(h1N + h2N) : bothEmpty && String(current.half2).trim() === '' ? '' : '0';
  } else if (field === 'q3' || field === 'q4') {
    const q3N = toNum(current.q3);
    const q4N = toNum(current.q4);
    const bothEmpty = String(current.q3).trim() === '' && String(current.q4).trim() === '';
    current.half2 = bothEmpty ? '' : String(q3N + q4N);
    const h1N = toNum(current.half1);
    const h2N = toNum(current.half2);
    current.yearPlan = h1N + h2N > 0 ? String(h1N + h2N) : String(current.half1).trim() === '' && bothEmpty ? '' : '0';
  } else if (field === 'half1' || field === 'half2') {
    const h1N = toNum(current.half1);
    const h2N = toNum(current.half2);
    const bothEmpty = String(current.half1).trim() === '' && String(current.half2).trim() === '';
    current.yearPlan = bothEmpty ? '' : String(h1N + h2N);
  }

  nextRows[code] = current;

  // Auto-calculate Section 1 total row (1.4 = 1.1 + 1.2 + 1.3)
  if ((code === '1.1' || code === '1.2' || code === '1.3') && field !== 'remarks') {
    const r11 = nextRows['1.1'] || createEmptyRowValues();
    const r12 = nextRows['1.2'] || createEmptyRowValues();
    const r13 = nextRows['1.3'] || createEmptyRowValues();
    const sumKey = (k: 'yearPlan' | 'half1' | 'half2' | 'q1' | 'q2' | 'q3' | 'q4') => {
      const allEmpty = [r11[k], r12[k], r13[k]].every((v) => String(v ?? '').trim() === '');
      return allEmpty ? '' : String(toNum(r11[k]) + toNum(r12[k]) + toNum(r13[k]));
    };
    nextRows['1.4'] = {
      ...(nextRows['1.4'] || createEmptyRowValues()),
      yearPlan: sumKey('yearPlan'),
      half1: sumKey('half1'),
      half2: sumKey('half2'),
      q1: sumKey('q1'),
      q2: sumKey('q2'),
      q3: sumKey('q3'),
      q4: sumKey('q4')
    };
  }

  return {
    ...sheet,
    rows: nextRows,
    updatedAt: new Date().toISOString()
  };
};

const LEAF_BY_CODE = new Map<string, SpiritualMasterPlanTemplateItem>();
const LEAF_BY_TASK_NORM = new Map<string, SpiritualMasterPlanTemplateItem>();
SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.forEach((it) => {
  LEAF_BY_CODE.set(it.code, it);
  const cleanNorm = normalizeAmharicSearchText(it.task.replace(/^-+\s*/, ''));
  if (cleanNorm) LEAF_BY_TASK_NORM.set(cleanNorm, it);
  const prefixedNorm = normalizeAmharicSearchText(`${it.code} ${it.task.replace(/^-+\s*/, '')}`);
  if (prefixedNorm) LEAF_BY_TASK_NORM.set(prefixedNorm, it);
});

export const extractMasterCodeFromPlan = (plan: AnnualPlanItem): string | null => {
  if (plan.itemCode && LEAF_BY_CODE.has(plan.itemCode)) {
    return plan.itemCode;
  }
  const rawTask = String(plan.task || '').trim();
  const codeMatch = rawTask.match(/^(\d+(?:\.\d+)+)\s+/);
  if (codeMatch && LEAF_BY_CODE.has(codeMatch[1])) {
    return codeMatch[1];
  }
  const norm = normalizeAmharicSearchText(rawTask.replace(/^[-–•*\s]+/, ''));
  const byTask = LEAF_BY_TASK_NORM.get(norm);
  return byTask ? byTask.code : null;
};

const splitHalfEven = (halfTotal: number): [number, number] => {
  const safe = Math.max(0, Math.round(halfTotal));
  return [Math.ceil(safe / 2), Math.floor(safe / 2)];
};

const splitYearEven = (yearTotal: number): [number, number, number, number] => {
  const safe = Math.max(0, Math.round(yearTotal));
  const base = Math.floor(safe / 4);
  const rem = safe % 4;
  return [
    base + (rem > 0 ? 1 : 0),
    base + (rem > 1 ? 1 : 0),
    base + (rem > 2 ? 1 : 0),
    base
  ];
};

/**
 * Keeps row 1.4 ("ጠቅላላ ድምር") synchronized as 1.1 + 1.2 + 1.3 for both Plan and Done columns.
 */
export const recomputeSection1TotalsOnPlans = (
  plans: AnnualPlanItem[],
  year?: string
): AnnualPlanItem[] => {
  const matchesYr = (p: AnnualPlanItem) => !year || !p.year || p.year === year;
  const r11 = plans.find((p) => matchesYr(p) && extractMasterCodeFromPlan(p) === '1.1');
  const r12 = plans.find((p) => matchesYr(p) && extractMasterCodeFromPlan(p) === '1.2');
  const r13 = plans.find((p) => matchesYr(p) && extractMasterCodeFromPlan(p) === '1.3');
  const r14 = plans.find((p) => matchesYr(p) && extractMasterCodeFromPlan(p) === '1.4');

  if (!r11 || !r12 || !r13 || !r14) return plans;

  const sumField = (
    field: 'yearPlan' | 'q1Plan' | 'q2Plan' | 'q3Plan' | 'q4Plan' | 'q1Done' | 'q2Done' | 'q3Done' | 'q4Done'
  ) => toNum(r11[field]) + toNum(r12[field]) + toNum(r13[field]);

  return plans.map((p) => {
    if (p.id !== r14.id) return p;
    const q1P = sumField('q1Plan');
    const q2P = sumField('q2Plan');
    const q3P = sumField('q3Plan');
    const q4P = sumField('q4Plan');
    const yP = sumField('yearPlan') || q1P + q2P + q3P + q4P;
    return {
      ...p,
      yearPlan: yP,
      q1Plan: q1P,
      q2Plan: q2P,
      q3Plan: q3P,
      q4Plan: q4P,
      q1Done: sumField('q1Done'),
      q2Done: sumField('q2Done'),
      q3Done: sumField('q3Done'),
      q4Done: sumField('q4Done')
    };
  });
};

/**
 * Guarantees all 46 official 2019 Spiritual Master Plan items (1.1–8.2) are present inside
 * a unit/chapel's UnifiedPlanManager AnnualPlanItem list, preserving any existing targets,
 * execution values, work logs, custom items, and other-year items.
 */
export const ensureChapelMasterAnnualPlans = (
  existingPlans: AnnualPlanItem[] = [],
  year: string,
  ownerLabel: string,
  existingMasterSheet?: SpiritualMasterPlanSheetData
): AnnualPlanItem[] => {
  const otherYearPlans = existingPlans.filter((p) => p.year && p.year !== year);
  const currentYearPlans = existingPlans.filter((p) => !p.year || p.year === year);

  const existingByCode = new Map<string, AnnualPlanItem>();
  const customCurrentPlans: AnnualPlanItem[] = [];

  currentYearPlans.forEach((p) => {
    const code = extractMasterCodeFromPlan(p);
    if (code && !existingByCode.has(code)) {
      existingByCode.set(code, p);
    } else if (!code) {
      customCurrentPlans.push(p);
    }
  });

  const seededTemplatePlans: AnnualPlanItem[] = SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.map((it) => {
    const prev = existingByCode.get(it.code);
    const rv = existingMasterSheet?.rows?.[it.code];
    const cleanLabel = `${it.code} ${it.task.replace(/^-+\s*/, '')}`;

    let q1Plan = prev ? toNum(prev.q1Plan) : 0;
    let q2Plan = prev ? toNum(prev.q2Plan) : 0;
    let q3Plan = prev ? toNum(prev.q3Plan) : 0;
    let q4Plan = prev ? toNum(prev.q4Plan) : 0;
    let yearPlan = prev ? toNum(prev.yearPlan) : 0;

    // Backfill from chapelMasterPlans sheet if AnnualPlanItem had no plan numbers yet
    if (rv && yearPlan === 0 && q1Plan + q2Plan + q3Plan + q4Plan === 0) {
      const rq1 = toNum(rv.q1);
      const rq2 = toNum(rv.q2);
      const rq3 = toNum(rv.q3);
      const rq4 = toNum(rv.q4);
      const rh1 = toNum(rv.half1) || rq1 + rq2;
      const rh2 = toNum(rv.half2) || rq3 + rq4;
      const ryr = toNum(rv.yearPlan) || rh1 + rh2;

      if (rq1 + rq2 + rq3 + rq4 > 0) {
        q1Plan = rq1;
        q2Plan = rq2;
        q3Plan = rq3;
        q4Plan = rq4;
      } else if (rh1 > 0 || rh2 > 0) {
        const [s1, s2] = splitHalfEven(rh1);
        const [s3, s4] = splitHalfEven(rh2);
        q1Plan = s1;
        q2Plan = s2;
        q3Plan = s3;
        q4Plan = s4;
      } else if (ryr > 0) {
        const [s1, s2, s3, s4] = splitYearEven(ryr);
        q1Plan = s1;
        q2Plan = s2;
        q3Plan = s3;
        q4Plan = s4;
      }
      yearPlan = ryr > 0 ? ryr : q1Plan + q2Plan + q3Plan + q4Plan;
    }

    return {
      id: prev?.id ?? generateUniqueId(),
      year,
      itemCode: it.code,
      task: cleanLabel,
      unit: prev?.unit || it.unit || 'በቁጥር',
      yearPlan,
      q1Plan,
      q2Plan,
      q3Plan,
      q4Plan,
      q1Done: prev ? toNum(prev.q1Done) : 0,
      q2Done: prev ? toNum(prev.q2Done) : 0,
      q3Done: prev ? toNum(prev.q3Done) : 0,
      q4Done: prev ? toNum(prev.q4Done) : 0,
      role: prev?.role || ownerLabel,
      remarks: prev?.remarks ?? rv?.remarks ?? '',
      executionLogs: prev?.executionLogs
    };
  });

  return recomputeSection1TotalsOnPlans(
    [...seededTemplatePlans, ...customCurrentPlans, ...otherYearPlans],
    year
  );
};

/**
 * Converts a chapel or unit's AnnualPlanItem[] into a SpiritualMasterPlanSheetData snapshot
 * (keeping existing narratives & signOff from baseSheet).
 */
export const annualPlansToMasterSheet = (
  plans: AnnualPlanItem[] = [],
  year: string,
  baseSheet?: SpiritualMasterPlanSheetData,
  useExecution: boolean = false
): SpiritualMasterPlanSheetData => {
  const next = ensureSpiritualMasterPlanSheet(baseSheet, year);
  const byCode = new Map<string, AnnualPlanItem>();
  plans.forEach((p) => {
    if (p.year && p.year !== year) return;
    const code = extractMasterCodeFromPlan(p);
    if (code && !byCode.has(code)) byCode.set(code, p);
  });

  SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.forEach((it) => {
    const p = byCode.get(it.code);
    if (!p) return;
    const q1 = useExecution ? toNum(p.q1Done) : toNum(p.q1Plan);
    const q2 = useExecution ? toNum(p.q2Done) : toNum(p.q2Plan);
    const q3 = useExecution ? toNum(p.q3Done) : toNum(p.q3Plan);
    const q4 = useExecution ? toNum(p.q4Done) : toNum(p.q4Plan);
    const h1 = q1 + q2;
    const h2 = q3 + q4;
    const yr = useExecution ? h1 + h2 : toNum(p.yearPlan) || h1 + h2;
    const hasAny = yr > 0 || h1 > 0 || h2 > 0 || q1 > 0 || q2 > 0 || q3 > 0 || q4 > 0;
    const prevRemark = next.rows[it.code]?.remarks || '';

    next.rows[it.code] = {
      yearPlan: hasAny ? String(yr) : '',
      half1: hasAny ? String(h1) : '',
      half2: hasAny ? String(h2) : '',
      q1: hasAny ? String(q1) : '',
      q2: hasAny ? String(q2) : '',
      q3: hasAny ? String(q3) : '',
      q4: hasAny ? String(q4) : '',
      remarks: p.remarks ?? prevRemark
    };
  });

  next.updatedAt = new Date().toISOString();
  return next;
};

/**
 * Merges an imported Spiritual Master Plan sheet directly into existing UnifiedPlanManager plans
 * (matching 1.1–8.2 rows in place while keeping existing execution logs and done counts).
 */
export const mergeParsedSheetIntoAnnualPlans = (
  sheet: SpiritualMasterPlanSheetData,
  year: string,
  ownerLabel: string,
  existingPlans: AnnualPlanItem[] = []
): { nextPlans: AnnualPlanItem[]; updatedCount: number } => {
  const seeded = ensureChapelMasterAnnualPlans(existingPlans, year, ownerLabel);
  let updatedCount = 0;

  const merged = seeded.map((p) => {
    if (p.year && p.year !== year) return p;
    const code = extractMasterCodeFromPlan(p);
    if (!code) return p;
    const rv = sheet.rows[code];
    if (!rv) return p;

    const rq1 = toNum(rv.q1);
    const rq2 = toNum(rv.q2);
    const rq3 = toNum(rv.q3);
    const rq4 = toNum(rv.q4);
    const rh1 = toNum(rv.half1);
    const rh2 = toNum(rv.half2);
    const ryr = toNum(rv.yearPlan);

    const hasNums = ryr > 0 || rh1 > 0 || rh2 > 0 || rq1 > 0 || rq2 > 0 || rq3 > 0 || rq4 > 0;
    const hasRemark = Boolean(rv.remarks && rv.remarks.trim());
    if (!hasNums && !hasRemark) return p;

    updatedCount++;

    let q1Plan = rq1;
    let q2Plan = rq2;
    let q3Plan = rq3;
    let q4Plan = rq4;
    if (rq1 + rq2 === 0 && rh1 > 0) {
      [q1Plan, q2Plan] = splitHalfEven(rh1);
    }
    if (rq3 + rq4 === 0 && rh2 > 0) {
      [q3Plan, q4Plan] = splitHalfEven(rh2);
    }
    if (q1Plan + q2Plan + q3Plan + q4Plan === 0 && ryr > 0) {
      [q1Plan, q2Plan, q3Plan, q4Plan] = splitYearEven(ryr);
    }
    const yearPlan = ryr > 0 ? ryr : q1Plan + q2Plan + q3Plan + q4Plan;

    return {
      ...p,
      yearPlan,
      q1Plan,
      q2Plan,
      q3Plan,
      q4Plan,
      remarks: hasRemark ? (rv.remarks || '').trim() : p.remarks
    };
  });

  return {
    nextPlans: recomputeSection1TotalsOnPlans(merged, year),
    updatedCount
  };
};

/**
 * Syncs Master Plan sheet rows into AnnualPlanItem[] keeping all 46 canonical rows intact.
 */
export const syncMasterPlanToAnnualPlans = (
  sheet: SpiritualMasterPlanSheetData,
  year: string,
  ownerLabel: string,
  existingPlans: AnnualPlanItem[] = []
): AnnualPlanItem[] => {
  const seeded = ensureChapelMasterAnnualPlans(existingPlans, year, ownerLabel);
  const synced = seeded.map((p) => {
    if (p.year && p.year !== year) return p;
    const code = extractMasterCodeFromPlan(p);
    if (!code) return p;
    const rv = sheet.rows[code];
    if (!rv) return p;

    const rq1 = toNum(rv.q1);
    const rq2 = toNum(rv.q2);
    const rq3 = toNum(rv.q3);
    const rq4 = toNum(rv.q4);
    const rh1 = toNum(rv.half1) || rq1 + rq2;
    const rh2 = toNum(rv.half2) || rq3 + rq4;
    const ryr = toNum(rv.yearPlan) || rh1 + rh2;

    const [s1, s2] = rq1 > 0 || rq2 > 0 ? [rq1, rq2] : splitHalfEven(rh1);
    const [s3, s4] = rq3 > 0 || rq4 > 0 ? [rq3, rq4] : splitHalfEven(rh2);

    return {
      ...p,
      itemCode: code,
      yearPlan: ryr,
      q1Plan: s1,
      q2Plan: s2,
      q3Plan: s3,
      q4Plan: s4,
      remarks: rv.remarks ?? p.remarks
    };
  });

  return recomputeSection1TotalsOnPlans(synced, year);
};

export interface AggregatedMasterPlanData {
  aggregatedSheet: SpiritualMasterPlanSheetData;
  reportingChapelCountByCode: { [code: string]: number };
  chapelValuesByCode: {
    [code: string]: { chapel: string; values: SpiritualMasterPlanRowValues }[];
  };
  filledChapels: string[];
  consolidatedNarrativesByChapel: {
    chapel: string;
    narratives: SpiritualMasterPlanNarratives;
    signOff: SpiritualMasterPlanSignOff;
  }[];
}

export interface LiveAggregatedPlanAndExecData {
  planAggregated: AggregatedMasterPlanData;
  execAggregated: AggregatedMasterPlanData;
  chapelFilledCounts: { [chapel: string]: { planCount: number; execCount: number } };
}

/**
 * Aggregates BOTH Plan and Execution live from each chapel's UnifiedPlanManager plans
 * (with fallback to legacy chapelMasterPlans sheets + remarks/narratives/signOff).
 */
export const aggregateLiveChapelMasterPlans = (
  chapelPlans: { [chapelName: string]: AnnualPlanItem[] } = {},
  chapelMasterPlans: { [chapelName: string]: { [year: string]: SpiritualMasterPlanSheetData } } = {},
  chapelList: string[] = DEFAULT_CHAPELS,
  year: string
): LiveAggregatedPlanAndExecData => {
  const effectivePlanMasterMap: { [ch: string]: { [yr: string]: SpiritualMasterPlanSheetData } } = {};
  const effectiveExecMasterMap: { [ch: string]: { [yr: string]: SpiritualMasterPlanSheetData } } = {};
  const chapelFilledCounts: { [ch: string]: { planCount: number; execCount: number } } = {};

  chapelList.forEach((ch) => {
    const legacySheet = chapelMasterPlans[ch]?.[year];
    const chAnnual = (chapelPlans[ch] || []).filter((p) => !p.year || p.year === year);

    const hasAnnualPlanNums = chAnnual.some((p) => {
      const code = extractMasterCodeFromPlan(p);
      if (!code) return false;
      return (
        toNum(p.yearPlan) > 0 ||
        toNum(p.q1Plan) > 0 ||
        toNum(p.q2Plan) > 0 ||
        toNum(p.q3Plan) > 0 ||
        toNum(p.q4Plan) > 0
      );
    });

    const planSheet = hasAnnualPlanNums
      ? annualPlansToMasterSheet(chAnnual, year, legacySheet, false)
      : ensureSpiritualMasterPlanSheet(legacySheet, year);

    const execSheet = annualPlansToMasterSheet(chAnnual, year, legacySheet, true);

    effectivePlanMasterMap[ch] = { [year]: planSheet };
    effectiveExecMasterMap[ch] = { [year]: execSheet };
    chapelFilledCounts[ch] = {
      planCount: getFilledItemCountForSheet(planSheet),
      execCount: getFilledItemCountForSheet(execSheet)
    };
  });

  return {
    planAggregated: aggregateChapelMasterPlanSheets(effectivePlanMasterMap, chapelList, year),
    execAggregated: aggregateChapelMasterPlanSheets(effectiveExecMasterMap, chapelList, year),
    chapelFilledCounts
  };
};

/**
 * Aggregates all chapels' Spiritual Master Plan sheets into one combined consolidated view.
 */
export const aggregateChapelMasterPlanSheets = (
  chapelMasterPlans: { [chapelName: string]: { [year: string]: SpiritualMasterPlanSheetData } } = {},
  chapelList: string[] = DEFAULT_CHAPELS,
  year: string
): AggregatedMasterPlanData => {
  const aggSheet = createEmptySpiritualMasterPlanSheet(year);
  const reportingChapelCountByCode: { [code: string]: number } = {};
  const chapelValuesByCode: {
    [code: string]: { chapel: string; values: SpiritualMasterPlanRowValues }[];
  } = {};
  const filledChapels: string[] = [];
  const consolidatedNarrativesByChapel: AggregatedMasterPlanData['consolidatedNarrativesByChapel'] = [];

  const ensureNormalizedChapelSheets = chapelList.map((ch) => {
    const raw = chapelMasterPlans[ch]?.[year];
    const sheet = raw ? ensureSpiritualMasterPlanSheet(raw, year) : null;
    if (sheet && getFilledItemCountForSheet(sheet) > 0) {
      filledChapels.push(ch);
    }
    if (sheet) {
      const narrativeArrays = Object.values(sheet.narratives) as string[][];
      const hasAnyNote = narrativeArrays.some((arr: string[]) =>
        arr.some((line: string) => line.trim() !== '')
      );
      const hasSignOff = Boolean(
        sheet.signOff.reporterName?.trim() || sheet.signOff.receiverName?.trim()
      );
      if (hasAnyNote || hasSignOff) {
        consolidatedNarrativesByChapel.push({
          chapel: ch,
          narratives: sheet.narratives,
          signOff: sheet.signOff
        });
      }
    }
    return { chapel: ch, sheet };
  });

  SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.forEach((item) => {
    let yearSum = 0;
    let h1Sum = 0;
    let h2Sum = 0;
    let q1Sum = 0;
    let q2Sum = 0;
    let q3Sum = 0;
    let q4Sum = 0;
    let reportingCount = 0;
    let yearCount = 0;
    let h1Count = 0;
    let h2Count = 0;
    let q1Count = 0;
    let q2Count = 0;
    let q3Count = 0;
    let q4Count = 0;
    const remarksParts: string[] = [];
    const perChapelList: { chapel: string; values: SpiritualMasterPlanRowValues }[] = [];

    ensureNormalizedChapelSheets.forEach(({ chapel, sheet }) => {
      const rowVal = sheet?.rows?.[item.code];
      if (!rowVal) return;

      const yN = toNum(rowVal.yearPlan);
      const q1N = toNum(rowVal.q1);
      const q2N = toNum(rowVal.q2);
      const q3N = toNum(rowVal.q3);
      const q4N = toNum(rowVal.q4);
      const h1N = toNum(rowVal.half1) || q1N + q2N;
      const h2N = toNum(rowVal.half2) || q3N + q4N;
      const effYear = yN || h1N + h2N;

      const hasNum = effYear > 0 || h1N > 0 || h2N > 0 || q1N > 0 || q2N > 0 || q3N > 0 || q4N > 0;
      if (hasNum) {
        reportingCount++;
        perChapelList.push({
          chapel,
          values: {
            ...rowVal,
            yearPlan: effYear || '',
            half1: h1N || '',
            half2: h2N || '',
            q1: q1N || '',
            q2: q2N || '',
            q3: q3N || '',
            q4: q4N || ''
          }
        });
      }

      if (effYear > 0) {
        yearSum += effYear;
        yearCount++;
      }
      if (h1N > 0) {
        h1Sum += h1N;
        h1Count++;
      }
      if (h2N > 0) {
        h2Sum += h2N;
        h2Count++;
      }
      if (q1N > 0) {
        q1Sum += q1N;
        q1Count++;
      }
      if (q2N > 0) {
        q2Sum += q2N;
        q2Count++;
      }
      if (q3N > 0) {
        q3Sum += q3N;
        q3Count++;
      }
      if (q4N > 0) {
        q4Sum += q4N;
        q4Count++;
      }

      if (rowVal.remarks && rowVal.remarks.trim()) {
        remarksParts.push(`${chapel}: ${rowVal.remarks.trim()}`);
      }
    });

    const formatCell = (sum: number, cnt: number): string => {
      if (cnt === 0) return '';
      if (item.isPercentage) return String(Math.round(sum / cnt));
      return String(sum);
    };

    aggSheet.rows[item.code] = {
      yearPlan: formatCell(yearSum, yearCount),
      half1: formatCell(h1Sum, h1Count),
      half2: formatCell(h2Sum, h2Count),
      q1: formatCell(q1Sum, q1Count),
      q2: formatCell(q2Sum, q2Count),
      q3: formatCell(q3Sum, q3Count),
      q4: formatCell(q4Sum, q4Count),
      remarks: remarksParts.join(' | ')
    };

    reportingChapelCountByCode[item.code] = reportingCount;
    chapelValuesByCode[item.code] = perChapelList;
  });

  return {
    aggregatedSheet: aggSheet,
    reportingChapelCountByCode,
    chapelValuesByCode,
    filledChapels,
    consolidatedNarrativesByChapel
  };
};

// ---------------- Excel Template Export & Consolidated Export ----------------

const buildSheetAoa = (
  sheet: SpiritualMasterPlanSheetData,
  year: string,
  subtitleLabel: string
): (string | number)[][] => {
  const aoa: (string | number)[][] = [
    [`በ${year} ዓ.ም የብ/ከ/ቃ/ሕ/ቤ/ክ የመንፈሳዊ ዘርፍ ዕቅድ (${subtitleLabel})`],
    [],
    ['ተ.ቁ', 'ዝርዝር ተግባራት', 'መለኪያ', 'የዓመት ዕቅድ', 'የግማሽ ዓመት', '', 'የሩብ ዓመት ዕቅድ', '', '', '', 'ምርመራ'],
    ['', '', '', '', '1ኛ ግማሽ', '2ኛ ግማሽ', '1ኛ ሩብ', '2ኛ ሩብ', '3ኛ ሩብ', '4ኛ ሩብ', '']
  ];

  SPIRITUAL_MASTER_PLAN_ITEMS.forEach((item) => {
    if (item.isSection) {
      aoa.push([item.code, item.task, '', '', '', '', '', '', '', '', '']);
      return;
    }
    const r = sheet.rows[item.code] || createEmptyRowValues();
    aoa.push([
      item.code,
      `   ${item.task}`,
      item.unit,
      r.yearPlan === '' ? '' : toNum(r.yearPlan),
      r.half1 === '' ? '' : toNum(r.half1),
      r.half2 === '' ? '' : toNum(r.half2),
      r.q1 === '' ? '' : toNum(r.q1),
      r.q2 === '' ? '' : toNum(r.q2),
      r.q3 === '' ? '' : toNum(r.q3),
      r.q4 === '' ? '' : toNum(r.q4),
      r.remarks || ''
    ]);
  });

  aoa.push([]);
  NARRATIVE_SECTION_META.forEach((sec) => {
    aoa.push([`${sec.prefix} ${sec.labelAm}`, '', '', '', '', '', '', '', '', '', '']);
    const lines = sheet.narratives[sec.key] || [];
    lines.forEach((line, idx) => {
      aoa.push([`${idx + 1}.`, line || '', '', '', '', '', '', '', '', '', '']);
    });
  });

  aoa.push([]);
  aoa.push([
    'የሪፖርት አቅራቢ ስም፡',
    sheet.signOff.reporterName || '',
    '',
    '',
    '',
    'የሪፖርት ተቀባይ ስም፡',
    sheet.signOff.receiverName || '',
    '',
    '',
    '',
    ''
  ]);
  aoa.push([
    'ፊርማ፡',
    sheet.signOff.reporterSignature || '',
    '',
    '',
    '',
    'ፊርማ፡',
    sheet.signOff.receiverSignature || '',
    '',
    '',
    '',
    ''
  ]);
  aoa.push([
    'ቀን፡',
    sheet.signOff.reporterDate || '',
    '',
    '',
    '',
    'ቀን፡',
    sheet.signOff.receiverDate || '',
    '',
    '',
    '',
    ''
  ]);

  return aoa;
};

const createStyledWorksheet = (aoa: (string | number)[][]): XLSX.WorkSheet => {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
    { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
    { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
    { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
    { s: { r: 2, c: 4 }, e: { r: 2, c: 5 } }, // የግማሽ ዓመት
    { s: { r: 2, c: 6 }, e: { r: 2, c: 9 } }, // የሩብ ዓመት ዕቅድ
    { s: { r: 2, c: 10 }, e: { r: 3, c: 10 } }
  ];
  ws['!cols'] = [
    { wch: 8 },
    { wch: 48 },
    { wch: 16 },
    { wch: 12 },
    { wch: 11 },
    { wch: 11 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 24 }
  ];
  return ws;
};

export const exportSpiritualMasterPlanExcel = ({
  year,
  sheet,
  subtitleLabel,
  fileName
}: {
  year: string;
  sheet: SpiritualMasterPlanSheetData;
  subtitleLabel: string;
  fileName: string;
}) => {
  const wb = XLSX.utils.book_new();
  const ws = createStyledWorksheet(buildSheetAoa(sheet, year, subtitleLabel));
  const safeSheetName = subtitleLabel.replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'የመንፈሳዊ_ዘርፍ_ዕቅድ';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  XLSX.writeFile(wb, fileName);
};

export const exportConsolidatedSpiritualMasterPlanExcel = ({
  year,
  aggregatedData,
  chapelMasterPlans,
  chapelList
}: {
  year: string;
  aggregatedData: AggregatedMasterPlanData;
  chapelMasterPlans: { [chapelName: string]: { [year: string]: SpiritualMasterPlanSheetData } };
  chapelList: string[];
}) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Combined Totals across all Chapels
  const wsAll = createStyledWorksheet(
    buildSheetAoa(aggregatedData.aggregatedSheet, year, 'የሁሉም ቻፕሎች ጠቅላላ ድምር')
  );
  XLSX.utils.book_append_sheet(wb, wsAll, 'የሁሉም_ቻፕሎች_ድምር');

  // Sheet 2: Side-by-Side Comparison Matrix (Annual Plan per Chapel)
  const matrixRows: (string | number)[][] = [
    [`በ${year} ዓ.ም የብ/ከ/ቃ/ሕ/ቤ/ክ የመንፈሳዊ ዘርፍ ዕቅድ — የየቻፕሉ ንጽጽር (የዓመት ዕቅድ)`],
    [],
    ['ተ.ቁ', 'ዝርዝር ተግባራት', 'መለኪያ', ...chapelList, 'የሁሉም ድምር / አማካይ']
  ];
  SPIRITUAL_MASTER_PLAN_ITEMS.forEach((item) => {
    if (item.isSection) {
      matrixRows.push([item.code, item.task, '', ...chapelList.map(() => ''), '']);
      return;
    }
    const perChapelVals = chapelList.map((ch) => {
      const sh = chapelMasterPlans[ch]?.[year];
      const rv = sh?.rows?.[item.code];
      if (!rv) return '';
      const q1 = toNum(rv.q1);
      const q2 = toNum(rv.q2);
      const q3 = toNum(rv.q3);
      const q4 = toNum(rv.q4);
      const h1 = toNum(rv.half1) || q1 + q2;
      const h2 = toNum(rv.half2) || q3 + q4;
      const y = toNum(rv.yearPlan) || h1 + h2;
      return y > 0 ? y : '';
    });
    const aggRow = aggregatedData.aggregatedSheet.rows[item.code];
    matrixRows.push([
      item.code,
      `   ${item.task}`,
      item.unit,
      ...perChapelVals,
      aggRow?.yearPlan ? toNum(aggRow.yearPlan) : ''
    ]);
  });
  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
  wsMatrix['!cols'] = [
    { wch: 8 },
    { wch: 46 },
    { wch: 15 },
    ...chapelList.map(() => ({ wch: 11 })),
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'የየቻፕሉ_ንጽጽር');

  // Individual sheet per chapel
  chapelList.forEach((ch) => {
    const chSheet = ensureSpiritualMasterPlanSheet(chapelMasterPlans[ch]?.[year], year);
    const wsCh = createStyledWorksheet(buildSheetAoa(chSheet, year, ch));
    const safeName = ch.replace(/[\\/?*[\]:]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, wsCh, safeName);
  });

  XLSX.writeFile(wb, `የመንፈሳዊ_ዘርፍ_ቋሚ_ዕቅድ_ሁሉም_ቻፕሎች_${year}.xlsx`);
};

// ---------------- Smart Excel Importer ----------------

const cleanCellNumStr = (val: unknown): string => {
  if (val === undefined || val === null) return '';
  const raw = String(val).replace(/,/g, '').trim();
  if (!raw || raw === '-' || raw === '—') return '';
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return '';
  const num = parseFloat(m[0]);
  return Number.isFinite(num) ? String(num) : '';
};

const parseSingleWorksheet = (
  aoa: unknown[][],
  year: string
): { sheet: SpiritualMasterPlanSheetData; matchedRowsCount: number } => {
  const result = createEmptySpiritualMasterPlanSheet(year);
  let matchedRowsCount = 0;

  // Locate header row containing ተ.ቁ / ዝርዝር ተግባራት
  let headerRowIdx = -1;
  let colCode = 0;
  let colTask = 1;
  let colYear = 3;
  let colHalf1 = 4;
  let colHalf2 = 5;
  let colQ1 = 6;
  let colQ2 = 7;
  let colQ3 = 8;
  let colQ4 = 9;
  let colRemarks = 10;

  for (let r = 0; r < Math.min(12, aoa.length); r++) {
    const rowStr = (aoa[r] || []).map((c) => String(c ?? '').trim());
    const joined = rowStr.join(' ');
    if (joined.includes('ዝርዝር ተግባራት') || joined.includes('ተግባራት') || joined.includes('የዓመት ዕቅድ')) {
      headerRowIdx = r;
      const foundCode = rowStr.findIndex((c) => c.includes('ተ.ቁ'));
      const foundTask = rowStr.findIndex((c) => c.includes('ተግባራት') || c.includes('ዝርዝር'));
      const foundYear = rowStr.findIndex((c) => c.includes('የዓመት'));
      const foundRemarks = rowStr.findIndex((c) => c.includes('ምርመራ') || c.toLowerCase().includes('remark'));

      if (foundCode >= 0) colCode = foundCode;
      if (foundTask >= 0) colTask = foundTask;
      if (foundYear >= 0) colYear = foundYear;
      if (foundRemarks >= 0) colRemarks = foundRemarks;

      // Inspect header row & next row for sub-columns (1ኛ, 2ኛ, etc.)
      const nextRow = (aoa[r + 1] || []).map((c) => String(c ?? '').trim());
      const halfGroupIdx = rowStr.findIndex((c) => c.includes('ግማሽ'));
      const quarterGroupIdx = rowStr.findIndex((c) => c.includes('ሩብ'));

      if (halfGroupIdx >= 0 && nextRow.some((c) => c.includes('1ኛ') || c.includes('2ኛ'))) {
        colHalf1 = halfGroupIdx;
        colHalf2 = halfGroupIdx + 1;
        if (quarterGroupIdx >= 0) {
          colQ1 = quarterGroupIdx;
          colQ2 = quarterGroupIdx + 1;
          // Check if 3ኛ/4ኛ exist before remarks
          const q3Candidate = nextRow[quarterGroupIdx + 2] || '';
          const q4Candidate = nextRow[quarterGroupIdx + 3] || '';
          colQ3 = q3Candidate.includes('3') || (foundRemarks < 0 || quarterGroupIdx + 2 < foundRemarks) ? quarterGroupIdx + 2 : -1;
          colQ4 = q4Candidate.includes('4') || (foundRemarks < 0 || quarterGroupIdx + 3 < foundRemarks) ? quarterGroupIdx + 3 : -1;
        }
      } else {
        // Single-row flat headers
        const h1Idx = rowStr.findIndex((c) => c.includes('1ኛ ግማሽ') || c.toLowerCase() === 'h1');
        const h2Idx = rowStr.findIndex((c) => c.includes('2ኛ ግማሽ') || c.toLowerCase() === 'h2');
        const q1Idx = rowStr.findIndex((c) => c.includes('1ኛ ሩብ') || c.toLowerCase() === 'q1');
        const q2Idx = rowStr.findIndex((c) => c.includes('2ኛ ሩብ') || c.toLowerCase() === 'q2');
        const q3Idx = rowStr.findIndex((c) => c.includes('3ኛ ሩብ') || c.toLowerCase() === 'q3');
        const q4Idx = rowStr.findIndex((c) => c.includes('4ኛ ሩብ') || c.toLowerCase() === 'q4');
        if (h1Idx >= 0) colHalf1 = h1Idx;
        if (h2Idx >= 0) colHalf2 = h2Idx;
        if (q1Idx >= 0) colQ1 = q1Idx;
        if (q2Idx >= 0) colQ2 = q2Idx;
        if (q3Idx >= 0) colQ3 = q3Idx;
        if (q4Idx >= 0) colQ4 = q4Idx;
      }
      break;
    }
  }

  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  let activeNarrativeSection: keyof SpiritualMasterPlanNarratives | null = null;
  const parsedNarratives: Partial<Record<keyof SpiritualMasterPlanNarratives, string[]>> = {};

  // Build normalized lookup by code and by clean task text
  const byCode = new Map<string, SpiritualMasterPlanTemplateItem>();
  const byTaskNorm = new Map<string, SpiritualMasterPlanTemplateItem>();
  SPIRITUAL_MASTER_PLAN_LEAF_ITEMS.forEach((it) => {
    byCode.set(it.code, it);
    const clean = normalizeAmharicSearchText(it.task.replace(/^-+\s*/, ''));
    if (clean) byTaskNorm.set(clean, it);
  });

  for (let i = startRow; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const cells = row.map((c) => String(c ?? '').trim());
    if (cells.every((c) => !c)) continue;

    const firstNonEmpty = cells.find((c) => c !== '') || '';
    const joinedLine = cells.filter(Boolean).join(' ');

    // Detect narrative sections ሀ/ ለ/ ሐ/ መ/ ሠ/
    const matchedNar = NARRATIVE_SECTION_META.find(
      (sec) => joinedLine.startsWith(sec.prefix) || joinedLine.includes(sec.labelAm)
    );
    if (matchedNar) {
      activeNarrativeSection = matchedNar.key;
      parsedNarratives[activeNarrativeSection] = [];
      continue;
    }

    // Detect Sign-off rows
    if (joinedLine.includes('የሪፖርት አቅራቢ ስም') || joinedLine.includes('የሪፖርት ተቀባይ ስም')) {
      activeNarrativeSection = null;
      const repIdx = cells.findIndex((c) => c.includes('የሪፖርት አቅራቢ ስም'));
      const recIdx = cells.findIndex((c) => c.includes('የሪፖርት ተቀባይ ስም'));
      if (repIdx >= 0) {
        const after = cells.slice(repIdx + 1, recIdx > repIdx ? recIdx : undefined).find(Boolean);
        if (after) result.signOff.reporterName = after;
      }
      if (recIdx >= 0) {
        const after = cells.slice(recIdx + 1).find(Boolean);
        if (after) result.signOff.receiverName = after;
      }
      continue;
    }
    if (joinedLine.includes('ቀን፡') || joinedLine.includes('ቀን:')) {
      activeNarrativeSection = null;
      const firstDateIdx = cells.findIndex((c) => c.startsWith('ቀን'));
      const secondDateIdx = cells.findIndex((c, idx) => idx > firstDateIdx && c.startsWith('ቀን'));
      if (firstDateIdx >= 0) {
        const val = cells.slice(firstDateIdx + 1, secondDateIdx > firstDateIdx ? secondDateIdx : undefined).find(Boolean);
        if (val) result.signOff.reporterDate = val;
      }
      if (secondDateIdx >= 0) {
        const val = cells.slice(secondDateIdx + 1).find(Boolean);
        if (val) result.signOff.receiverDate = val;
      }
      continue;
    }
    if (joinedLine.includes('ፊርማ')) {
      activeNarrativeSection = null;
      continue;
    }

    // Inside narrative section
    if (activeNarrativeSection) {
      // Remove leading "1." / "2." marker
      let textContent = '';
      if (/^\d+\.?$/.test(cells[0] || '')) {
        textContent = cells.slice(1).filter(Boolean).join(' ').trim();
      } else {
        textContent = firstNonEmpty.replace(/^\d+\.\s*/, '').trim();
      }
      const cleanDots = textContent.replace(/[.…_]+/g, '').trim();
      if (cleanDots) {
        parsedNarratives[activeNarrativeSection] = [
          ...(parsedNarratives[activeNarrativeSection] || []),
          textContent
        ];
      }
      continue;
    }

    // Match line item by code or task label
    const rawCode = (cells[colCode] || '').replace(/\s+/g, '').replace(/\.+$/, '');
    const rawTask = (cells[colTask] || '').replace(/^[-–•*\s]+/, '').trim();
    const matchedItem =
      byCode.get(rawCode) ||
      byTaskNorm.get(normalizeAmharicSearchText(rawTask));

    if (!matchedItem) continue;

    const q1Str = colQ1 >= 0 ? cleanCellNumStr(cells[colQ1]) : '';
    const q2Str = colQ2 >= 0 ? cleanCellNumStr(cells[colQ2]) : '';
    const q3Str = colQ3 >= 0 ? cleanCellNumStr(cells[colQ3]) : '';
    const q4Str = colQ4 >= 0 ? cleanCellNumStr(cells[colQ4]) : '';
    let h1Str = colHalf1 >= 0 ? cleanCellNumStr(cells[colHalf1]) : '';
    let h2Str = colHalf2 >= 0 ? cleanCellNumStr(cells[colHalf2]) : '';
    let yrStr = colYear >= 0 ? cleanCellNumStr(cells[colYear]) : '';
    const remarksStr = colRemarks >= 0 ? (cells[colRemarks] || '').trim() : '';

    if (h1Str === '' && (q1Str !== '' || q2Str !== '')) {
      h1Str = String(toNum(q1Str) + toNum(q2Str));
    }
    if (h2Str === '' && (q3Str !== '' || q4Str !== '')) {
      h2Str = String(toNum(q3Str) + toNum(q4Str));
    }
    if (yrStr === '' && (h1Str !== '' || h2Str !== '')) {
      yrStr = String(toNum(h1Str) + toNum(h2Str));
    }

    result.rows[matchedItem.code] = {
      yearPlan: yrStr,
      half1: h1Str,
      half2: h2Str,
      q1: q1Str,
      q2: q2Str,
      q3: q3Str,
      q4: q4Str,
      remarks: remarksStr
    };

    if (
      yrStr !== '' ||
      h1Str !== '' ||
      h2Str !== '' ||
      q1Str !== '' ||
      q2Str !== '' ||
      q3Str !== '' ||
      q4Str !== '' ||
      remarksStr !== ''
    ) {
      matchedRowsCount++;
    }
  }

  NARRATIVE_SECTION_META.forEach((sec) => {
    const list = parsedNarratives[sec.key];
    if (list && list.length > 0) {
      while (list.length < sec.defaultLines) list.push('');
      result.narratives[sec.key] = list;
    }
  });

  result.updatedAt = new Date().toISOString();
  return { sheet: result, matchedRowsCount };
};

export interface ParsedMasterPlanExcelResult {
  firstSheet: SpiritualMasterPlanSheetData;
  matchedRowsCount: number;
  chapelSheets: { [chapelName: string]: SpiritualMasterPlanSheetData };
  detectedChapelNames: string[];
}

export const parseSpiritualMasterPlanExcel = async (
  file: File,
  year: string,
  chapelList: string[] = DEFAULT_CHAPELS
): Promise<ParsedMasterPlanExcelResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  let firstSheet = createEmptySpiritualMasterPlanSheet(year);
  let totalMatchedRows = 0;
  const chapelSheets: { [chapelName: string]: SpiritualMasterPlanSheetData } = {};
  const detectedChapelNames: string[] = [];

  workbook.SheetNames.forEach((sheetName, idx) => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
    if (!aoa || aoa.length === 0) return;

    // Skip matrix comparison summary sheets
    if (sheetName.includes('ንጽጽር') || sheetName.includes('የሁሉም')) {
      return;
    }

    const parsed = parseSingleWorksheet(aoa, year);
    if (idx === 0 || totalMatchedRows === 0) {
      if (parsed.matchedRowsCount >= totalMatchedRows) {
        firstSheet = parsed.sheet;
      }
    }
    totalMatchedRows += parsed.matchedRowsCount;

    // Try matching sheet name to an official chapel
    const mappedChapel = mapToOfficialChapelStrict(sheetName);
    const exactMatch = chapelList.find(
      (c) =>
        normalizeAmharicSearchText(c) === normalizeAmharicSearchText(sheetName) ||
        c === mappedChapel
    );
    if (exactMatch && parsed.matchedRowsCount > 0) {
      chapelSheets[exactMatch] = parsed.sheet;
      detectedChapelNames.push(exactMatch);
    }
  });

  // Fallback if all sheets were skipped above (e.g. only 1 sheet named something custom)
  if (totalMatchedRows === 0 && workbook.SheetNames.length > 0) {
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    if (ws) {
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
      const parsed = parseSingleWorksheet(aoa, year);
      firstSheet = parsed.sheet;
      totalMatchedRows = parsed.matchedRowsCount;
    }
  }

  return {
    firstSheet,
    matchedRowsCount: totalMatchedRows,
    chapelSheets,
    detectedChapelNames
  };
};
