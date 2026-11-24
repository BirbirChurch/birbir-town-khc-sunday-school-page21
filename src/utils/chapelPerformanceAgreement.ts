import * as XLSX from 'xlsx';
import {
  AnnualPlanItem,
  ChapelPerformanceAgreementData,
  ChapelPerformanceAgreementRowValue,
  ChurchHRRecord
} from '../types';
import { mapToOfficialChapel, normalizeAmharicSearchText } from './amharicSearchAndChapel';
import { extractMasterCodeFromPlan } from './spiritualMasterPlan';
import { sumPlanLogsByQuarter } from './planExecutionRollup';

export type AgreementPeriodKey = 'year' | 'h1' | 'h2' | 'q1' | 'q2' | 'q3' | 'q4';

export interface PerformanceAgreementTemplateItem {
  code: string;
  sectionCode: string;
  title: string;
  unit?: string;
  isSectionHeader?: boolean;
  isSubHeader?: boolean;
  isOngoingMarker?: boolean; // 'x' across quarters (e.g. 4.1.1, 5.1-5.4)
  isDualExistingNew?: boolean; // 'ነ፡ 15 / አ፡ 10' (2.8, 6.3)
  defaultGoal?: string;
  defaultAnnualPlan?: string;
  defaultQ1Plan?: string;
  defaultQ2Plan?: string;
  defaultQ3Plan?: string;
  defaultQ4Plan?: string;
}

export const PERFORMANCE_AGREEMENT_FORM_TITLE =
  'የብርብር ከተማ ቃለ ሕይወት ቤ/ክ የ2019 ዓ.ም ከአገልጋዮች ጋር የተደረገ የሥራ አፈጻጸም ግብ ስምምነት';

export const PERFORMANCE_AGREEMENT_CATALOG: PerformanceAgreementTemplateItem[] = [
  // Section 1
  {
    code: '1',
    sectionCode: '1',
    title: 'የተለያዩ አደረጃጀቶችን ማጠናከር',
    isSectionHeader: true
  },
  {
    code: '1.1',
    sectionCode: '1',
    title: 'የአባቶች ኮሚቴ',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '1.2',
    sectionCode: '1',
    title: 'የሴቶች ኮሚቴ',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '1.3',
    sectionCode: '1',
    title: 'የወጣቶች ኮሚቴ',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '1.4',
    sectionCode: '1',
    title: 'የልጆች ኮሚቴ',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '1.5',
    sectionCode: '1',
    title: 'የእርቅ ኮሚቴ',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '1.6',
    sectionCode: '1',
    title: 'የዲያቆናት ኮሚቴ',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '1.7',
    sectionCode: '1',
    title: 'የወንጌል ማኅበረሰብና ኮሚቴ',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '1.8',
    sectionCode: '1',
    title: 'የመጽሐፍ ቅዱስ ምሩቃንን ማደራጀት',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '1.9',
    sectionCode: '1',
    title: 'የጸሎት ቡድኖችን ማደራጀት',
    unit: 'በቡድን',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ1Plan: '1',
    defaultQ3Plan: '1'
  },

  // Section 2
  {
    code: '2',
    sectionCode: '2',
    title: 'ወንጌል የማዳረስ አገልግሎት ማጠናከር',
    isSectionHeader: true
  },
  {
    code: '2.1',
    sectionCode: '2',
    title: 'የወንጌል ስርጭት ቡድኖችን ማቋቋም (ወይ ማጠናከር)',
    unit: 'በቡድን',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '2.2',
    sectionCode: '2',
    title: 'ወንጌል የሚመሰከርላቸው',
    unit: 'በቁጥር',
    defaultGoal: '20',
    defaultAnnualPlan: '20',
    defaultQ1Plan: '5',
    defaultQ2Plan: '5',
    defaultQ3Plan: '5',
    defaultQ4Plan: '5'
  },
  {
    code: '2.3',
    sectionCode: '2',
    title: 'ንስሐ የሚመለሱ',
    unit: 'በቁጥር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '2.4',
    sectionCode: '2',
    title: 'አዲስ ጌታን የሚቀበሉ',
    unit: 'በቁጥር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '2.5',
    sectionCode: '2',
    title: 'ተስፋ የሚሰጡ',
    unit: 'በቁጥር',
    defaultGoal: '8',
    defaultAnnualPlan: '8',
    defaultQ1Plan: '2',
    defaultQ2Plan: '2',
    defaultQ3Plan: '2',
    defaultQ4Plan: '2'
  },
  {
    code: '2.6',
    sectionCode: '2',
    title: 'ለወንጌል ስርጭት ቡድኖች ሥልጠና ማዘጋጀትና መስጠት',
    unit: 'በዙር',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ2Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '2.7',
    sectionCode: '2',
    title: 'ስለወንጌል ተልዕኮና ስለማኅበረሰብ የግንዛቤ ማስጨበጫ ትምህርት ለአባላት መስጠት',
    unit: 'በዙር',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ2Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '2.8',
    sectionCode: '2',
    title: 'ነባር የወንጌል ማኅበረሰብ አባላትን ማበረታታትና አዲስን አባል ማፍራት (ነባር / አዲስ)',
    unit: 'በቁጥር',
    isDualExistingNew: true,
    defaultGoal: 'ነ፡ 15 / አ፡ 10',
    defaultAnnualPlan: '15 / 10',
    defaultQ1Plan: '1',
    defaultQ2Plan: '5 / 3',
    defaultQ3Plan: '5 / 3',
    defaultQ4Plan: '5 / 3'
  },
  {
    code: '2.9',
    sectionCode: '2',
    title: 'ለወንጌል ማኅበረሰብ ከዓመት ገቢ 10% ገቢ ማድረግ',
    unit: 'በዙር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },

  // Section 3
  {
    code: '3',
    sectionCode: '3',
    title: 'ምዕመናንን የተሰጡ የክርስቶስ ደቀ መዛሙርት ማድረግ',
    isSectionHeader: true
  },
  {
    code: '3.1',
    sectionCode: '3',
    title: 'መሠረታዊ የክርስትና ትምህርት መስጠት (ደህንነት፡ ንስሐ፡ ጥምቀት)',
    unit: 'በዙር',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ2Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '3.2',
    sectionCode: '3',
    title: 'የአገልግሎት ትምህርት መስጠት',
    unit: 'በቡድን',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: '1'
  },
  {
    code: '3.3',
    sectionCode: '3',
    title: 'የደቀመዝሙርነት ትምህርት መስጠት',
    unit: 'በቡድን',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ3Plan: '1'
  },
  {
    code: '3.4',
    sectionCode: '3',
    title: 'ከስህተት ትምህርት መጠበቂያ ትምህርቶችን ምዕመናንን ማስተማር',
    unit: 'በዙር',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ2Plan: '1',
    defaultQ4Plan: '1'
  },

  // Section 4
  {
    code: '4',
    sectionCode: '4',
    title: 'ተተኪ ትውልድ ማፍራት /ማዘጋጀት/',
    isSectionHeader: true
  },
  {
    code: '4.1',
    sectionCode: '4',
    title: 'የልጆች አገልግሎት ማጠናከር',
    isSubHeader: true
  },
  {
    code: '4.1.1',
    sectionCode: '4',
    title: 'ልጆችን በየዕድሜአቸው ለይቶ ማስተማር',
    unit: 'በቡድን',
    isOngoingMarker: true,
    defaultGoal: '3',
    defaultAnnualPlan: '3',
    defaultQ1Plan: 'x',
    defaultQ2Plan: 'x',
    defaultQ3Plan: 'x',
    defaultQ4Plan: 'x'
  },
  {
    code: '4.1.2',
    sectionCode: '4',
    title: 'ልጆችን በአገልግሎት ማሳተፍ',
    unit: 'በዙር',
    defaultGoal: '26',
    defaultAnnualPlan: '26',
    defaultQ1Plan: '6',
    defaultQ2Plan: '7',
    defaultQ3Plan: '6',
    defaultQ4Plan: '7'
  },
  {
    code: '4.2',
    sectionCode: '4',
    title: 'የወጣቶች አገልግሎት ማጠናከር',
    isSubHeader: true
  },
  {
    code: '4.2.1',
    sectionCode: '4',
    title: 'የወጣቶችን አምልኮ ማካሄድ',
    unit: 'በዙር',
    defaultGoal: '52',
    defaultAnnualPlan: '52',
    defaultQ1Plan: '13',
    defaultQ2Plan: '13',
    defaultQ3Plan: '13',
    defaultQ4Plan: '13'
  },
  {
    code: '4.2.2',
    sectionCode: '4',
    title: 'ወጣቶችን በአገልግሎት ማሳተፍ',
    unit: 'በዙር',
    defaultGoal: '26',
    defaultAnnualPlan: '52',
    defaultQ1Plan: '13',
    defaultQ2Plan: '13',
    defaultQ3Plan: '13',
    defaultQ4Plan: '13'
  },
  {
    code: '4.2.3',
    sectionCode: '4',
    title: 'ወጣቶችን ስለ ክርስቲያናዊ ጋብቻ ማስተማር',
    unit: 'በዙር',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ2Plan: '1',
    defaultQ4Plan: '1'
  },

  // Section 5
  {
    code: '5',
    sectionCode: '5',
    title: 'አገልጋዮችን በቁጥር ጥራትና ብቃት ማዘጋጀት (የመልዕክተኞች)',
    isSectionHeader: true
  },
  {
    code: '5.1',
    sectionCode: '5',
    title: 'የመጽሐፍ ቅዱስ ሥልጠናዎችን መስጠት',
    unit: 'በቡድን',
    isOngoingMarker: true,
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: 'x',
    defaultQ2Plan: 'x',
    defaultQ3Plan: 'x',
    defaultQ4Plan: 'x'
  },
  {
    code: '5.2',
    sectionCode: '5',
    title: 'ቢ.ቲ.ቲ (B.T.C.P)',
    unit: 'በቡድን',
    isOngoingMarker: true,
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ1Plan: 'x',
    defaultQ2Plan: 'x',
    defaultQ3Plan: 'x',
    defaultQ4Plan: 'x'
  },
  {
    code: '5.3',
    sectionCode: '5',
    title: 'ሙ.ቅ.ሙ (መ.ቅ.ህ.ማ)',
    unit: 'በቡድን',
    isOngoingMarker: true,
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ1Plan: 'x',
    defaultQ2Plan: 'x',
    defaultQ3Plan: 'x',
    defaultQ4Plan: 'x'
  },
  {
    code: '5.4',
    sectionCode: '5',
    title: 'የማኅበረሰብ መጽሐፍ ቅዱስ ጥናት',
    unit: 'በቡድን',
    isOngoingMarker: true,
    defaultGoal: '3',
    defaultAnnualPlan: '3',
    defaultQ1Plan: 'x',
    defaultQ2Plan: 'x',
    defaultQ3Plan: 'x',
    defaultQ4Plan: 'x'
  },

  // Section 6
  {
    code: '6',
    sectionCode: '6',
    title: 'ሰፊና የማያቋርጥ ሁለንተናዊ አገልግሎትን ማጠናከር',
    isSectionHeader: true
  },
  {
    code: '6.1',
    sectionCode: '6',
    title: 'ለልጆች ትምህርት ማዘጋጀትና ማስተማር (መዋቅር ቅርጽ)',
    unit: 'በዙር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '6.2',
    sectionCode: '6',
    title: 'የፍቅር ርኅራኄ አገልግሎት ማጠናከር ትምህርት መስጠት',
    unit: 'በዙር',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ2Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '6.3',
    sectionCode: '6',
    title: 'ነባር የፍቅር ርኅራኄ ለአባላት ማጠናከርና አዲስን አባል እንዲሆን ማስተማር (ነባር / አዲስ)',
    unit: 'በቁጥር',
    isDualExistingNew: true,
    defaultGoal: 'ነ፡ 15 / አ፡ 10',
    defaultAnnualPlan: '15 / 10',
    defaultQ1Plan: '2',
    defaultQ2Plan: '5 / 3',
    defaultQ3Plan: '5 / 3',
    defaultQ4Plan: '5 / 3'
  },
  {
    code: '6.4',
    sectionCode: '6',
    title: 'የምስራች ፕሮግራሞችን ማስተባበር',
    unit: 'በቁጥር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '6.5',
    sectionCode: '6',
    title: 'የመጽናናት ፕሮግራሞችን ማስተባበር',
    unit: 'በቁጥር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '6.6',
    sectionCode: '6',
    title: 'ድንገት እልፍ የደረሰባቸውን መጠየቅ በቤ/ክ እንዲያውቅ ማድረግ',
    unit: 'በቁጥር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '6.7',
    sectionCode: '6',
    title: 'የእርቅ አገልግሎቶችን መስጠት',
    unit: 'በቁጥር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '6.8',
    sectionCode: '6',
    title: 'አዲስ አባላትን መቀበል',
    unit: 'በቁጥር',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ2Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '6.9',
    sectionCode: '6',
    title: 'የምዕመናን ጉብኝት ማጠናከር',
    unit: 'በዙር',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '6.10',
    sectionCode: '6',
    title: 'የቤተሰብ አምልኮን ማጠናከር',
    unit: 'በቁጥር',
    defaultGoal: '20',
    defaultAnnualPlan: '20',
    defaultQ1Plan: '5',
    defaultQ2Plan: '5',
    defaultQ3Plan: '5',
    defaultQ4Plan: '5'
  },
  {
    code: '6.11',
    sectionCode: '6',
    title: 'ቅድመ-ጋብቻ እና ጋብቻ-ድጋፍ መስጠት ያሉባቸውን ከመንፈሳዊ ዘርፍ ጋር ማገናኘት',
    unit: 'በቡድን',
    defaultGoal: '4',
    defaultAnnualPlan: '4',
    defaultQ1Plan: '1',
    defaultQ2Plan: '1',
    defaultQ3Plan: '1',
    defaultQ4Plan: '1'
  },

  // Section 7
  {
    code: '7',
    sectionCode: '7',
    title: 'የገቢ አውታሮችን ማስፋት',
    isSectionHeader: true
  },
  {
    code: '7.1',
    sectionCode: '7',
    title: 'አሥራት፣ ከብራት ገቢ፣ ስጦታ እና ሌሎች የገቢ ምንጮችን ማስፋትና ማሳተፍ',
    unit: 'በቁጥር',
    defaultGoal: '2',
    defaultAnnualPlan: '2',
    defaultQ2Plan: '1',
    defaultQ4Plan: '1'
  },
  {
    code: '7.2',
    sectionCode: '7',
    title: 'ሌሎች የገቢ ማስገኛ መንገዶች መፍጠር',
    unit: 'በዙር',
    defaultGoal: '1',
    defaultAnnualPlan: '1',
    defaultQ3Plan: '1'
  }
];

export const PERFORMANCE_AGREEMENT_LEAF_ITEMS = PERFORMANCE_AGREEMENT_CATALOG.filter(
  (it) => !it.isSectionHeader && !it.isSubHeader
);

export const createDefaultAgreementRows = (): {
  [itemCode: string]: ChapelPerformanceAgreementRowValue;
} => {
  const rows: { [itemCode: string]: ChapelPerformanceAgreementRowValue } = {};
  PERFORMANCE_AGREEMENT_LEAF_ITEMS.forEach((item) => {
    rows[item.code] = {
      annualGoal: item.defaultGoal ?? '',
      annualPlan: item.defaultAnnualPlan ?? '',
      q1Plan: item.defaultQ1Plan ?? '',
      q2Plan: item.defaultQ2Plan ?? '',
      q3Plan: item.defaultQ3Plan ?? '',
      q4Plan: item.defaultQ4Plan ?? '',
      q1Exec: '',
      q2Exec: '',
      q3Exec: '',
      q4Exec: '',
      remarks: ''
    };
  });
  return rows;
};

/**
 * Find HR servants under Admin & Finance who are assigned to this chapel
 * or act as Chapel Coordinators ("የቻፕል አስተባባሪ" / "ወንጌላዊ").
 */
export const findChapelCoordinatorHRRecords = (
  chapelName: string,
  hrRecords: ChurchHRRecord[] = []
): {
  matchedForChapel: ChurchHRRecord[];
  allCoordinatorCandidates: ChurchHRRecord[];
} => {
  const officialChapel = mapToOfficialChapel(chapelName);
  const fullTimeAndMinisters = hrRecords.filter(
    (r) =>
      r.category === 'full_time_minister' ||
      (r.roleTitles || [r.roleTitle]).some(
        (rt) =>
          rt.includes('አስተባባሪ') ||
          rt.includes('ወንጌላዊ') ||
          rt.includes('መጋቢ') ||
          rt.includes('ቻፕል')
      )
  );

  const matchedForChapel = fullTimeAndMinisters.filter((r) => {
    const depts = [
      ...(r.departments || []),
      ...(r.department ? [r.department] : [])
    ];
    return depts.some((d) => {
      const trimmed = String(d || '').trim();
      if (!trimmed) return false;
      if (trimmed === officialChapel || trimmed.includes(officialChapel.replace(' ቻፕል', ''))) {
        return true;
      }
      return trimmed.includes('ቻፕል') && mapToOfficialChapel(trimmed) === officialChapel;
    });
  });

  const matchedIds = new Set(matchedForChapel.map((r) => r.id));
  const sortedAll = [
    ...matchedForChapel,
    ...fullTimeAndMinisters.filter((r) => !matchedIds.has(r.id))
  ];

  return {
    matchedForChapel,
    allCoordinatorCandidates: sortedAll
  };
};

/**
 * Returns official chapels linked to a specific HR record either through its department tags
 * or via saved performance agreements.
 */
export const getLinkedChapelsForHRRecord = (
  rec: ChurchHRRecord,
  chapelList: string[],
  chapelPerformanceAgreements?: {
    [chapelName: string]: { [year: string]: ChapelPerformanceAgreementData };
  },
  year: string = '2019'
): string[] => {
  const result = new Set<string>();
  const depts = [...(rec.departments || []), ...(rec.department ? [rec.department] : [])];
  depts.forEach((d) => {
    const trimmed = String(d || '').trim();
    if (!trimmed) return;
    chapelList.forEach((ch) => {
      const shortCh = ch.replace(' ቻፕል', '').trim();
      if (trimmed === ch || (shortCh && trimmed.includes(shortCh))) {
        result.add(ch);
      }
    });
  });

  if (chapelPerformanceAgreements) {
    Object.entries(chapelPerformanceAgreements).forEach(([ch, byYear]) => {
      const yrData = byYear?.[year];
      if (!yrData) return;
      if (
        yrData.signOff?.evangelistHrId === rec.id ||
        (yrData.signOff?.evangelistName &&
          yrData.signOff.evangelistName.trim() === rec.name.trim())
      ) {
        result.add(ch);
      }
    });
  }

  return Array.from(result);
};

export const ensureChapelAgreementData = (
  existing: ChapelPerformanceAgreementData | undefined,
  chapelName: string,
  year: string,
  hrRecords: ChurchHRRecord[] = []
): ChapelPerformanceAgreementData => {
  const defaults = createDefaultAgreementRows();
  const mergedRows: { [itemCode: string]: ChapelPerformanceAgreementRowValue } = {};
  PERFORMANCE_AGREEMENT_LEAF_ITEMS.forEach((item) => {
    const prevRow = existing?.rows?.[item.code];
    mergedRows[item.code] = {
      ...defaults[item.code],
      ...(prevRow || {})
    };
  });

  const { matchedForChapel } = findChapelCoordinatorHRRecords(chapelName, hrRecords);
  const autoHr = matchedForChapel[0];

  const existingSignOff = existing?.signOff || {};
  const resolvedHr =
    existingSignOff.evangelistHrId !== undefined
      ? hrRecords.find((r) => r.id === existingSignOff.evangelistHrId) || autoHr
      : autoHr;

  return {
    year,
    chapelName,
    rows: mergedRows,
    signOff: {
      evangelistHrId: existingSignOff.evangelistHrId ?? resolvedHr?.id,
      evangelistName: existingSignOff.evangelistName || resolvedHr?.name || '',
      evangelistSignature: existingSignOff.evangelistSignature || '',
      evangelistDate: existingSignOff.evangelistDate || '',
      spiritualName: existingSignOff.spiritualName || '',
      spiritualSignature: existingSignOff.spiritualSignature || '',
      spiritualDate: existingSignOff.spiritualDate || '',
      adminName: existingSignOff.adminName || '',
      adminSignature: existingSignOff.adminSignature || '',
      adminDate: existingSignOff.adminDate || ''
    },
    updatedAt: existing?.updatedAt,
    updatedBy: existing?.updatedBy
  };
};

/**
 * Mapping between 2019 Chapel Performance Goal Agreement codes (1.1..7.2)
 * and Spiritual Master Plan item codes stored inside each chapel's `chapelPlans` (2.1..8.2).
 */
export const AGREEMENT_TO_MASTER_PLAN_CODES: { [agreementCode: string]: string[] } = {
  '1.1': ['2.1'],
  '1.2': ['2.2'],
  '1.3': ['2.3'],
  '1.4': ['2.4'],
  '1.5': ['2.5'],
  '1.6': ['2.6'],
  '1.7': ['2.7'],
  '1.8': ['2.8'],
  '1.9': ['2.9'],

  '2.1': ['3.1'],
  '2.2': ['3.2'],
  '2.3': ['3.3'],
  '2.4': ['3.4'],
  '2.5': ['3.5'],
  '2.6': ['3.6'],
  '2.7': ['3.7'],
  '2.8': ['3.8'],
  '2.9': ['3.9'],

  '3.1': ['4.1', '4.2', '4.3'],
  '3.2': ['4.4'],
  '3.3': ['4.5'],
  '3.4': ['4.6'],

  '4.1.1': ['5.1.1'],
  '4.1.2': ['5.1.2'],
  '4.2.1': ['5.2.1'],
  '4.2.2': ['5.2.2'],
  '4.2.3': [],

  '5.1': ['6.1'],
  '5.2': ['6.2'],
  '5.3': ['6.3'],
  '5.4': ['6.4', '6.5'],

  '6.1': ['7.1'],
  '6.2': ['7.2'],
  '6.3': ['7.3'],
  '6.4': ['7.4'],
  '6.5': ['7.5'],
  '6.6': ['7.6'],
  '6.7': ['7.7'],
  '6.8': ['7.8'],
  '6.9': ['7.9'],
  '6.10': ['7.10'],
  '6.11': ['7.11'],

  '7.1': ['8.1'],
  '7.2': ['8.2']
};

export interface QuarterExecutionTotals {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export type LiveChapelExecutionMap = {
  [agreementCode: string]: QuarterExecutionTotals;
};

/**
 * Extracts live Q1..Q4 execution totals from a chapel's `AnnualPlanItem[]` (`chapelPlans`),
 * combining direct quarter done counts (`q1Done..q4Done`) and `executionLogs`, then mapping
 * them onto each 2019 Performance Agreement row code.
 */
export const extractChapelPlanExecutionMap = (
  chapelPlans: AnnualPlanItem[] = [],
  year: string = '2019'
): LiveChapelExecutionMap => {
  const byMasterCode: { [masterCode: string]: QuarterExecutionTotals } = {};
  const marriageCustomTotals: QuarterExecutionTotals = { q1: 0, q2: 0, q3: 0, q4: 0 };

  chapelPlans.forEach((p) => {
    if (p.year && year && String(p.year) !== String(year)) return;
    const logTotals = sumPlanLogsByQuarter(p.executionLogs || []);
    const q1 = Math.max(0, Number(p.q1Done) || 0, logTotals.q1);
    const q2 = Math.max(0, Number(p.q2Done) || 0, logTotals.q2);
    const q3 = Math.max(0, Number(p.q3Done) || 0, logTotals.q3);
    const q4 = Math.max(0, Number(p.q4Done) || 0, logTotals.q4);

    const masterCode = extractMasterCodeFromPlan(p);
    if (masterCode) {
      if (!byMasterCode[masterCode]) {
        byMasterCode[masterCode] = { q1: 0, q2: 0, q3: 0, q4: 0 };
      }
      byMasterCode[masterCode].q1 += q1;
      byMasterCode[masterCode].q2 += q2;
      byMasterCode[masterCode].q3 += q3;
      byMasterCode[masterCode].q4 += q4;
    } else {
      const taskNorm = normalizeAmharicSearchText(String(p.task || ''));
      if (
        taskNorm.includes('ጋብቻ') &&
        !taskNorm.includes('ቅድመ-ጋብቻ') &&
        !taskNorm.includes('ድህረ-ጋብቻ')
      ) {
        marriageCustomTotals.q1 += q1;
        marriageCustomTotals.q2 += q2;
        marriageCustomTotals.q3 += q3;
        marriageCustomTotals.q4 += q4;
      }
    }
  });

  const result: LiveChapelExecutionMap = {};
  PERFORMANCE_AGREEMENT_LEAF_ITEMS.forEach((item) => {
    const totals: QuarterExecutionTotals = { q1: 0, q2: 0, q3: 0, q4: 0 };
    if (item.code === '4.2.3') {
      totals.q1 = marriageCustomTotals.q1;
      totals.q2 = marriageCustomTotals.q2;
      totals.q3 = marriageCustomTotals.q3;
      totals.q4 = marriageCustomTotals.q4;
    } else {
      const mapped = AGREEMENT_TO_MASTER_PLAN_CODES[item.code] || [];
      mapped.forEach((mc) => {
        const entry = byMasterCode[mc];
        if (entry) {
          totals.q1 += entry.q1;
          totals.q2 += entry.q2;
          totals.q3 += entry.q3;
          totals.q4 += entry.q4;
        }
      });
    }
    result[item.code] = totals;
  });

  return result;
};

/**
 * Merges saved Performance Agreement rows with live execution pulled from the chapel's
 * own Plan & Execution (`chapelPlans`), without mutating persisted row overrides.
 */
export const resolveAgreementRowsWithChapelPlans = (
  rows: { [itemCode: string]: ChapelPerformanceAgreementRowValue },
  chapelPlans: AnnualPlanItem[] = [],
  year: string = '2019'
): {
  resolvedRows: { [itemCode: string]: ChapelPerformanceAgreementRowValue };
  liveExecutionMap: LiveChapelExecutionMap;
  liveLinkedQuarters: {
    [itemCode: string]: { q1: boolean; q2: boolean; q3: boolean; q4: boolean };
  };
} => {
  const defaults = createDefaultAgreementRows();
  const liveExecutionMap = extractChapelPlanExecutionMap(chapelPlans, year);
  const resolvedRows: { [itemCode: string]: ChapelPerformanceAgreementRowValue } = {};
  const liveLinkedQuarters: {
    [itemCode: string]: { q1: boolean; q2: boolean; q3: boolean; q4: boolean };
  } = {};

  PERFORMANCE_AGREEMENT_LEAF_ITEMS.forEach((item) => {
    const baseRow = {
      ...defaults[item.code],
      ...(rows[item.code] || {})
    };
    const live = liveExecutionMap[item.code] || { q1: 0, q2: 0, q3: 0, q4: 0 };
    const linkFlags = { q1: false, q2: false, q3: false, q4: false };

    const resolveQ = (
      savedVal: string,
      liveVal: number,
      key: 'q1' | 'q2' | 'q3' | 'q4'
    ): string => {
      const trimmed = String(savedVal || '').trim();
      if (trimmed !== '' && trimmed !== '0') {
        return savedVal;
      }
      if (liveVal > 0) {
        linkFlags[key] = true;
        return String(liveVal);
      }
      return trimmed === '0' ? '0' : '';
    };

    resolvedRows[item.code] = {
      ...baseRow,
      q1Exec: resolveQ(baseRow.q1Exec, live.q1, 'q1'),
      q2Exec: resolveQ(baseRow.q2Exec, live.q2, 'q2'),
      q3Exec: resolveQ(baseRow.q3Exec, live.q3, 'q3'),
      q4Exec: resolveQ(baseRow.q4Exec, live.q4, 'q4')
    };
    liveLinkedQuarters[item.code] = linkFlags;
  });

  return { resolvedRows, liveExecutionMap, liveLinkedQuarters };
};

export interface ParsedAgreementCell {
  raw: string;
  isMarker: boolean; // 'x' or '✓'
  isDual: boolean; // e.g. '15 / 10', 'ነ፡ 15 / አ፡ 10', '5/3'
  primaryNum: number;
  secondaryNum: number;
  numericSum: number;
}

export const parseAgreementCellValue = (rawVal: string | number | undefined): ParsedAgreementCell => {
  const raw = String(rawVal ?? '').trim();
  if (!raw) {
    return {
      raw: '',
      isMarker: false,
      isDual: false,
      primaryNum: 0,
      secondaryNum: 0,
      numericSum: 0
    };
  }

  const lower = raw.toLowerCase();
  if (lower === 'x' || lower === '✓' || lower === '✔' || lower === 'yes' || lower === 'አዎ') {
    return {
      raw,
      isMarker: true,
      isDual: false,
      primaryNum: 1,
      secondaryNum: 0,
      numericSum: 1
    };
  }

  // Dual patterns: "ነ፡ 15 / አ፡ 10", "15 / 10", "5\n3", "5, 3"
  const numbers = raw.match(/\d+(?:\.\d+)?/g);
  if (numbers && numbers.length >= 2) {
    const a = Number(numbers[0]) || 0;
    const b = Number(numbers[1]) || 0;
    return {
      raw,
      isMarker: false,
      isDual: true,
      primaryNum: a,
      secondaryNum: b,
      numericSum: a + b
    };
  }

  if (numbers && numbers.length === 1) {
    const a = Number(numbers[0]) || 0;
    return {
      raw,
      isMarker: false,
      isDual: false,
      primaryNum: a,
      secondaryNum: 0,
      numericSum: a
    };
  }

  return {
    raw,
    isMarker: false,
    isDual: false,
    primaryNum: 0,
    secondaryNum: 0,
    numericSum: 0
  };
};

const combineCellsDisplayAndNumeric = (
  cells: ParsedAgreementCell[],
  isOngoingMarker?: boolean,
  isDualItem?: boolean
): { display: string; numericSum: number; markerCount: number } => {
  const markerCount = cells.filter((c) => c.isMarker).length;
  const nonEmpty = cells.filter((c) => c.raw !== '');

  if (isOngoingMarker) {
    const numericOnly = cells.reduce(
      (sum, c) => sum + (c.isMarker ? 0 : c.numericSum),
      0
    );
    if (numericOnly > 0) {
      return { display: String(numericOnly), numericSum: numericOnly, markerCount };
    }
    if (markerCount > 0) {
      return {
        display: `${markerCount}/${cells.length} ሩብ`,
        numericSum: markerCount,
        markerCount
      };
    }
    return { display: '—', numericSum: 0, markerCount: 0 };
  }

  if (isDualItem && cells.some((c) => c.isDual)) {
    let sumA = 0;
    let sumB = 0;
    cells.forEach((c) => {
      sumA += c.primaryNum;
      sumB += c.secondaryNum;
    });
    const total = sumA + sumB;
    if (total === 0 && nonEmpty.length === 0) {
      return { display: '—', numericSum: 0, markerCount: 0 };
    }
    return {
      display: `${sumA} / ${sumB}`,
      numericSum: total,
      markerCount
    };
  }

  const total = cells.reduce((s, c) => s + c.numericSum, 0);
  if (total === 0 && nonEmpty.length === 0) {
    return { display: '—', numericSum: 0, markerCount: 0 };
  }
  return { display: String(total), numericSum: total, markerCount };
};

export interface RowPeriodComputedStats {
  h1PlanDisplay: string;
  h1PlanNumeric: number;
  h2PlanDisplay: string;
  h2PlanNumeric: number;
  annualQuarterPlanSumDisplay: string;
  annualTargetNumeric: number;

  h1ExecDisplay: string;
  h1ExecNumeric: number;
  h2ExecDisplay: string;
  h2ExecNumeric: number;
  annualExecDisplay: string;
  annualExecNumeric: number;

  q1Pct: number | null;
  q2Pct: number | null;
  q3Pct: number | null;
  q4Pct: number | null;
  h1Pct: number | null;
  h2Pct: number | null;
  annualPct: number | null;
}

const calcSafePct = (execNum: number, targetNum: number): number | null => {
  if (targetNum <= 0) return null;
  if (execNum <= 0) return 0;
  return Math.min(100, Math.round((execNum / targetNum) * 100));
};

export const computeRowPeriodStats = (
  row: ChapelPerformanceAgreementRowValue,
  templateItem: PerformanceAgreementTemplateItem
): RowPeriodComputedStats => {
  const isOngoing = Boolean(templateItem.isOngoingMarker);
  const isDual = Boolean(templateItem.isDualExistingNew);

  const pGoal = parseAgreementCellValue(row.annualGoal);
  const pAnnPlan = parseAgreementCellValue(row.annualPlan);
  const pq1 = parseAgreementCellValue(row.q1Plan);
  const pq2 = parseAgreementCellValue(row.q2Plan);
  const pq3 = parseAgreementCellValue(row.q3Plan);
  const pq4 = parseAgreementCellValue(row.q4Plan);

  const eq1 = parseAgreementCellValue(row.q1Exec);
  const eq2 = parseAgreementCellValue(row.q2Exec);
  const eq3 = parseAgreementCellValue(row.q3Exec);
  const eq4 = parseAgreementCellValue(row.q4Exec);

  const h1Plan = combineCellsDisplayAndNumeric([pq1, pq2], isOngoing, isDual);
  const h2Plan = combineCellsDisplayAndNumeric([pq3, pq4], isOngoing, isDual);
  const yrPlanFromQ = combineCellsDisplayAndNumeric([pq1, pq2, pq3, pq4], isOngoing, isDual);

  const h1Exec = combineCellsDisplayAndNumeric([eq1, eq2], isOngoing, isDual);
  const h2Exec = combineCellsDisplayAndNumeric([eq3, eq4], isOngoing, isDual);
  const yrExec = combineCellsDisplayAndNumeric([eq1, eq2, eq3, eq4], isOngoing, isDual);

  if (isOngoing) {
    // Goal / Annual Plan holds active group count (e.g. 3, 1, 2); quarters marked 'x' mean active in all 4 quarters
    const goalNum = pGoal.numericSum > 0 ? pGoal.numericSum : pAnnPlan.numericSum;
    const h1PlanMarkCount = [pq1, pq2].filter((c) => c.isMarker || c.numericSum > 0).length;
    const h2PlanMarkCount = [pq3, pq4].filter((c) => c.isMarker || c.numericSum > 0).length;
    const yrPlanMarkCount = h1PlanMarkCount + h2PlanMarkCount;

    const evalOngoingExec = (
      cell: ParsedAgreementCell,
      plannedCell: ParsedAgreementCell
    ): number | null => {
      if (!plannedCell.isMarker && plannedCell.numericSum <= 0) return null;
      if (cell.raw === '' || (!cell.isMarker && cell.numericSum <= 0)) return 0;
      if (cell.isMarker) return 100;
      if (goalNum > 0) return Math.min(100, Math.round((cell.numericSum / goalNum) * 100));
      return cell.numericSum > 0 ? 100 : 0;
    };

    const q1Pct = evalOngoingExec(eq1, pq1);
    const q2Pct = evalOngoingExec(eq2, pq2);
    const q3Pct = evalOngoingExec(eq3, pq3);
    const q4Pct = evalOngoingExec(eq4, pq4);

    // Average planned-quarter capped scores so over-performing in one quarter cannot mask 0s in others, capped at 100%
    const evalMultiOngoing = (
      quarterPairs: { exec: ParsedAgreementCell; plan: ParsedAgreementCell }[]
    ): number | null => {
      const plannedQ = quarterPairs.filter((p) => p.plan.isMarker || p.plan.numericSum > 0);
      if (plannedQ.length === 0) return null;
      const pcts = plannedQ.map((p) => evalOngoingExec(p.exec, p.plan) ?? 0);
      return Math.min(100, Math.round(pcts.reduce((s, n) => s + n, 0) / plannedQ.length));
    };

    return {
      h1PlanDisplay: h1PlanMarkCount > 0 ? `${goalNum || h1PlanMarkCount} (${h1PlanMarkCount} ሩብ)` : '—',
      h1PlanNumeric: goalNum || h1PlanMarkCount,
      h2PlanDisplay: h2PlanMarkCount > 0 ? `${goalNum || h2PlanMarkCount} (${h2PlanMarkCount} ሩብ)` : '—',
      h2PlanNumeric: goalNum || h2PlanMarkCount,
      annualQuarterPlanSumDisplay: pGoal.raw || pAnnPlan.raw || '—',
      annualTargetNumeric: goalNum || yrPlanMarkCount,

      h1ExecDisplay: h1Exec.display,
      h1ExecNumeric: h1Exec.numericSum,
      h2ExecDisplay: h2Exec.display,
      h2ExecNumeric: h2Exec.numericSum,
      annualExecDisplay: yrExec.display,
      annualExecNumeric: yrExec.numericSum,

      q1Pct,
      q2Pct,
      q3Pct,
      q4Pct,
      h1Pct: evalMultiOngoing([
        { exec: eq1, plan: pq1 },
        { exec: eq2, plan: pq2 }
      ]),
      h2Pct: evalMultiOngoing([
        { exec: eq3, plan: pq3 },
        { exec: eq4, plan: pq4 }
      ]),
      annualPct: evalMultiOngoing([
        { exec: eq1, plan: pq1 },
        { exec: eq2, plan: pq2 },
        { exec: eq3, plan: pq3 },
        { exec: eq4, plan: pq4 }
      ])
    };
  }

  // Annual achievement strictly compares against the agreed target ("የዓመቱ ግብ"), falling back to annual/quarter plan
  const effectiveAnnualTarget =
    pGoal.numericSum > 0
      ? pGoal.numericSum
      : pAnnPlan.numericSum > 0
      ? pAnnPlan.numericSum
      : yrPlanFromQ.numericSum;

  return {
    h1PlanDisplay: h1Plan.display,
    h1PlanNumeric: h1Plan.numericSum,
    h2PlanDisplay: h2Plan.display,
    h2PlanNumeric: h2Plan.numericSum,
    annualQuarterPlanSumDisplay:
      pGoal.raw || pAnnPlan.raw || yrPlanFromQ.display || '—',
    annualTargetNumeric: effectiveAnnualTarget,

    h1ExecDisplay: h1Exec.display,
    h1ExecNumeric: h1Exec.numericSum,
    h2ExecDisplay: h2Exec.display,
    h2ExecNumeric: h2Exec.numericSum,
    annualExecDisplay: yrExec.display,
    annualExecNumeric: yrExec.numericSum,

    q1Pct: calcSafePct(eq1.numericSum, pq1.numericSum),
    q2Pct: calcSafePct(eq2.numericSum, pq2.numericSum),
    q3Pct: calcSafePct(eq3.numericSum, pq3.numericSum),
    q4Pct: calcSafePct(eq4.numericSum, pq4.numericSum),
    h1Pct: calcSafePct(h1Exec.numericSum, h1Plan.numericSum),
    h2Pct: calcSafePct(h2Exec.numericSum, h2Plan.numericSum),
    annualPct: calcSafePct(yrExec.numericSum, effectiveAnnualTarget)
  };
};

export interface ChapelAgreementPeriodSummary {
  chapelName: string;
  evangelistName: string;
  evangelistHrId?: number;
  totalItems: number;
  q1AvgPct: number;
  q2AvgPct: number;
  q3AvgPct: number;
  q4AvgPct: number;
  h1AvgPct: number;
  h2AvgPct: number;
  annualAvgPct: number;
  executedItemsCount: number;
  signOffCount: number;
  hasEvangelistSigned: boolean;
  hasSpiritualSigned: boolean;
  hasAdminSigned: boolean;
}

const avgNonNull = (nums: (number | null)[]): number => {
  const valid = nums.filter((n): n is number => n !== null);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((s, n) => s + n, 0) / valid.length);
};

export const computeChapelAgreementSummary = (
  data: ChapelPerformanceAgreementData,
  chapelPlans?: AnnualPlanItem[]
): ChapelAgreementPeriodSummary => {
  const { resolvedRows } = resolveAgreementRowsWithChapelPlans(
    data.rows,
    chapelPlans || [],
    data.year
  );
  const q1Pcts: (number | null)[] = [];
  const q2Pcts: (number | null)[] = [];
  const q3Pcts: (number | null)[] = [];
  const q4Pcts: (number | null)[] = [];
  const h1Pcts: (number | null)[] = [];
  const h2Pcts: (number | null)[] = [];
  const annPcts: (number | null)[] = [];
  let executedItemsCount = 0;

  PERFORMANCE_AGREEMENT_LEAF_ITEMS.forEach((item) => {
    const row = resolvedRows[item.code];
    if (!row) return;
    const stats = computeRowPeriodStats(row, item);
    q1Pcts.push(stats.q1Pct);
    q2Pcts.push(stats.q2Pct);
    q3Pcts.push(stats.q3Pct);
    q4Pcts.push(stats.q4Pct);
    h1Pcts.push(stats.h1Pct);
    h2Pcts.push(stats.h2Pct);
    annPcts.push(stats.annualPct);
    if (
      String(row.q1Exec || '').trim() ||
      String(row.q2Exec || '').trim() ||
      String(row.q3Exec || '').trim() ||
      String(row.q4Exec || '').trim()
    ) {
      executedItemsCount += 1;
    }
  });

  const hasEvangelistSigned = Boolean(
    data.signOff?.evangelistName?.trim() &&
      (data.signOff?.evangelistSignature?.trim() || data.signOff?.evangelistDate?.trim())
  );
  const hasSpiritualSigned = Boolean(
    data.signOff?.spiritualName?.trim() &&
      (data.signOff?.spiritualSignature?.trim() || data.signOff?.spiritualDate?.trim())
  );
  const hasAdminSigned = Boolean(
    data.signOff?.adminName?.trim() &&
      (data.signOff?.adminSignature?.trim() || data.signOff?.adminDate?.trim())
  );
  const signOffCount =
    (hasEvangelistSigned ? 1 : 0) +
    (hasSpiritualSigned ? 1 : 0) +
    (hasAdminSigned ? 1 : 0);

  return {
    chapelName: data.chapelName,
    evangelistName: data.signOff?.evangelistName || '',
    evangelistHrId: data.signOff?.evangelistHrId,
    totalItems: PERFORMANCE_AGREEMENT_LEAF_ITEMS.length,
    q1AvgPct: avgNonNull(q1Pcts),
    q2AvgPct: avgNonNull(q2Pcts),
    q3AvgPct: avgNonNull(q3Pcts),
    q4AvgPct: avgNonNull(q4Pcts),
    h1AvgPct: avgNonNull(h1Pcts),
    h2AvgPct: avgNonNull(h2Pcts),
    annualAvgPct: avgNonNull(annPcts),
    executedItemsCount,
    signOffCount,
    hasEvangelistSigned,
    hasSpiritualSigned,
    hasAdminSigned
  };
};

export const exportChapelPerformanceAgreementExcel = (params: {
  data: ChapelPerformanceAgreementData;
  chapelLabel: string;
  period: AgreementPeriodKey;
  chapelPlans?: AnnualPlanItem[];
}) => {
  const { data, chapelLabel, period, chapelPlans } = params;
  const { resolvedRows } = resolveAgreementRowsWithChapelPlans(
    data.rows,
    chapelPlans || [],
    data.year
  );
  const aoa: (string | number)[][] = [
    [PERFORMANCE_AGREEMENT_FORM_TITLE],
    [`ቻፕል፦ ${chapelLabel} | ዘመን፦ ${data.year} ዓ.ም | ወንጌላዊ/አስተባባሪ፦ ${data.signOff?.evangelistName || '________'}`],
    []
  ];

  if (period === 'year') {
    aoa.push([
      'ተ.ቁ',
      'የሚከናወኑ ተግባራት',
      'መለኪያ',
      'የዓመቱ ግብ',
      'የቻፕል ዓመታዊ ዕቅድ',
      '1ኛ ሩብ ዕቅድ',
      '1ኛ ሩብ ክንውን',
      '2ኛ ሩብ ዕቅድ',
      '2ኛ ሩብ ክንውን',
      '1ኛ ግማሽ ዕቅድ',
      '1ኛ ግማሽ ክንውን',
      '1ኛ ግማሽ %',
      '3ኛ ሩብ ዕቅድ',
      '3ኛ ሩብ ክንውን',
      '4ኛ ሩብ ዕቅድ',
      '4ኛ ሩብ ክንውን',
      '2ኛ ግማሽ ዕቅድ',
      '2ኛ ግማሽ ክንውን',
      '2ኛ ግማሽ %',
      'የዓመት ክንውን',
      'በመቶኛ (%)'
    ]);
  } else if (period === 'h1' || period === 'h2') {
    const label = period === 'h1' ? '1ኛ ግማሽ' : '2ኛ ግማሽ';
    const qA = period === 'h1' ? '1ኛ ሩብ' : '3ኛ ሩብ';
    const qB = period === 'h1' ? '2ኛ ሩብ' : '4ኛ ሩብ';
    aoa.push([
      'ተ.ቁ',
      'የሚከናወኑ ተግባራት',
      'መለኪያ',
      'የዓመቱ ግብ',
      `${qA} ዕቅድ`,
      `${qA} ክንውን`,
      `${qB} ዕቅድ`,
      `${qB} ክንውን`,
      `${label} ዕቅድ`,
      `${label} ክንውን`,
      `${label} (%)`
    ]);
  } else {
    const qLabel =
      period === 'q1'
        ? '1ኛ ሩብ'
        : period === 'q2'
        ? '2ኛ ሩብ'
        : period === 'q3'
        ? '3ኛ ሩብ'
        : '4ኛ ሩብ';
    aoa.push([
      'ተ.ቁ',
      'የሚከናወኑ ተግባራት',
      'መለኪያ',
      'የዓመቱ ግብ',
      'የቻፕል ዓመታዊ ዕቅድ',
      `${qLabel} ዕቅድ`,
      `${qLabel} ክንውን`,
      `${qLabel} (%)`,
      'የዓመቱ (%) '
    ]);
  }

  PERFORMANCE_AGREEMENT_CATALOG.forEach((item) => {
    if (item.isSectionHeader || item.isSubHeader) {
      aoa.push([item.code, item.title]);
      return;
    }
    const row = resolvedRows[item.code] || createDefaultAgreementRows()[item.code];
    const st = computeRowPeriodStats(row, item);

    if (period === 'year') {
      aoa.push([
        item.code,
        item.title,
        item.unit || '',
        row.annualGoal,
        row.annualPlan,
        row.q1Plan,
        row.q1Exec,
        row.q2Plan,
        row.q2Exec,
        st.h1PlanDisplay,
        st.h1ExecDisplay,
        st.h1Pct !== null ? `${st.h1Pct}%` : '—',
        row.q3Plan,
        row.q3Exec,
        row.q4Plan,
        row.q4Exec,
        st.h2PlanDisplay,
        st.h2ExecDisplay,
        st.h2Pct !== null ? `${st.h2Pct}%` : '—',
        st.annualExecDisplay,
        st.annualPct !== null ? `${st.annualPct}%` : '—'
      ]);
    } else if (period === 'h1') {
      aoa.push([
        item.code,
        item.title,
        item.unit || '',
        row.annualGoal,
        row.q1Plan,
        row.q1Exec,
        row.q2Plan,
        row.q2Exec,
        st.h1PlanDisplay,
        st.h1ExecDisplay,
        st.h1Pct !== null ? `${st.h1Pct}%` : '—'
      ]);
    } else if (period === 'h2') {
      aoa.push([
        item.code,
        item.title,
        item.unit || '',
        row.annualGoal,
        row.q3Plan,
        row.q3Exec,
        row.q4Plan,
        row.q4Exec,
        st.h2PlanDisplay,
        st.h2ExecDisplay,
        st.h2Pct !== null ? `${st.h2Pct}%` : '—'
      ]);
    } else {
      const qPlan =
        period === 'q1'
          ? row.q1Plan
          : period === 'q2'
          ? row.q2Plan
          : period === 'q3'
          ? row.q3Plan
          : row.q4Plan;
      const qExec =
        period === 'q1'
          ? row.q1Exec
          : period === 'q2'
          ? row.q2Exec
          : period === 'q3'
          ? row.q3Exec
          : row.q4Exec;
      const qPct =
        period === 'q1'
          ? st.q1Pct
          : period === 'q2'
          ? st.q2Pct
          : period === 'q3'
          ? st.q3Pct
          : st.q4Pct;
      aoa.push([
        item.code,
        item.title,
        item.unit || '',
        row.annualGoal,
        row.annualPlan,
        qPlan,
        qExec,
        qPct !== null ? `${qPct}%` : '—',
        st.annualPct !== null ? `${st.annualPct}%` : '—'
      ]);
    }
  });

  aoa.push([]);
  aoa.push([
    'የወንጌላዊ ስም፦',
    data.signOff?.evangelistName || '______________',
    'ፊርማ፦',
    data.signOff?.evangelistSignature || '______________',
    'ቀን፦',
    data.signOff?.evangelistDate || '______________'
  ]);
  aoa.push([
    'መንፈሳዊ ዘርፍ፦',
    data.signOff?.spiritualName || '______________',
    'ፊርማ፦',
    data.signOff?.spiritualSignature || '______________',
    'ቀን፦',
    data.signOff?.spiritualDate || '______________'
  ]);
  aoa.push([
    'አስተዳደር ዘርፍ፦',
    data.signOff?.adminName || '______________',
    'ፊርማ፦',
    data.signOff?.adminSignature || '______________',
    'ቀን፦',
    data.signOff?.adminDate || '______________'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ግብ_ስምምነት');
  XLSX.writeFile(wb, `የአገልጋዮች_ግብ_ስምምነት_${chapelLabel}_${data.year}.xlsx`);
};
