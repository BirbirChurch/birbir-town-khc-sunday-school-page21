import { ChurchMember } from '../types';
import { normalizeAmharicSearchText } from './churchExcelParser';
import { normalizeStudentGender } from './sundaySchoolAgeStats';

export interface MemberGenderCounts {
  male: number;
  female: number;
  unspecified: number;
  total: number;
}

export interface SpiritualStatusBreakdown {
  yes: MemberGenderCounts;
  no: MemberGenderCounts;
  unknown: MemberGenderCounts;
  totalMembers: MemberGenderCounts;
}

export interface DetailedCategoryRow {
  key: string;
  label: string;
  isUnspecified: boolean;
  male: number;
  female: number;
  unspecified: number;
  total: number;
}

export interface ChurchMemberDetailedBreakdownStats {
  totalMembers: MemberGenderCounts;
  baptized: SpiritualStatusBreakdown;
  lordsSupper: SpiritualStatusBreakdown;
  tithe: SpiritualStatusBreakdown;
  educationLevels: DetailedCategoryRow[];
  occupations: DetailedCategoryRow[];
}

export const UNSPECIFIED_CATEGORY_KEY = '__unspecified__';
export const UNSPECIFIED_CATEGORY_LABEL = 'ያልተገለጸ';

export const SUGGESTED_EDUCATION_LEVELS: string[] = [
  'ጨቅላ/ያልጀመረ',
  'መዋዕለ ሕፃናት (KG)',
  'መሠረተ ትምህርት',
  'ያልተማረ/ች',
  '1ኛ - 4ኛ ክፍል',
  '5ኛ - 8ኛ ክፍል',
  '9ኛ - 10ኛ ክፍል',
  '11ኛ - 12ኛ ክፍል',
  'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  'ዲፕሎማ',
  'ዲግሪ',
  'ማስተርስ',
  'ዶክትሬት'
];

export const SUGGESTED_OCCUPATIONS: string[] = [
  'ተማሪ',
  'የመንግሥት ሠራተኛ',
  'የግል ሠራተኛ',
  'ነጋዴ',
  'ገበሬ',
  'የቤት እመቤት',
  'የቤት ውስጥ',
  'የቀን ሠራተኛ',
  'አገልጋይ / ወንጌላዊ / ቄስ',
  'ጡረተኛ',
  'ስራ የሌለው/ች'
];

const emptyCounts = (): MemberGenderCounts => ({
  male: 0,
  female: 0,
  unspecified: 0,
  total: 0
});

const emptySpiritualBreakdown = (): SpiritualStatusBreakdown => ({
  yes: emptyCounts(),
  no: emptyCounts(),
  unknown: emptyCounts(),
  totalMembers: emptyCounts()
});

const addGender = (bucket: MemberGenderCounts, g: 'male' | 'female' | 'unspecified') => {
  bucket.total += 1;
  if (g === 'male') bucket.male += 1;
  else if (g === 'female') bucket.female += 1;
  else bucket.unspecified += 1;
};

const addBooleanStatus = (
  breakdown: SpiritualStatusBreakdown,
  val: boolean | undefined,
  g: 'male' | 'female' | 'unspecified'
) => {
  addGender(breakdown.totalMembers, g);
  if (val === true) addGender(breakdown.yes, g);
  else if (val === false) addGender(breakdown.no, g);
  else addGender(breakdown.unknown, g);
};

export const normalizeMemberCategoryValue = (
  raw: string | undefined | null
): { key: string; label: string; isUnspecified: boolean } => {
  const cleaned = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned === '-' || cleaned === '—' || cleaned === 'ያልተገለጸ') {
    return {
      key: UNSPECIFIED_CATEGORY_KEY,
      label: UNSPECIFIED_CATEGORY_LABEL,
      isUnspecified: true
    };
  }
  const normKey = normalizeAmharicSearchText(cleaned) || cleaned.toLowerCase();
  return {
    key: normKey,
    label: cleaned,
    isUnspecified: false
  };
};

export const computeChurchMemberDetailedBreakdown = (
  members: ChurchMember[] = []
): ChurchMemberDetailedBreakdownStats => {
  const totalMembers = emptyCounts();
  const baptized = emptySpiritualBreakdown();
  const lordsSupper = emptySpiritualBreakdown();
  const tithe = emptySpiritualBreakdown();

  const eduMap = new Map<string, DetailedCategoryRow>();
  const occMap = new Map<string, DetailedCategoryRow>();

  const registerCategory = (
    map: Map<string, DetailedCategoryRow>,
    rawValue: string | undefined,
    g: 'male' | 'female' | 'unspecified'
  ) => {
    const { key, label, isUnspecified } = normalizeMemberCategoryValue(rawValue);
    let entry = map.get(key);
    if (!entry) {
      entry = {
        key,
        label,
        isUnspecified,
        male: 0,
        female: 0,
        unspecified: 0,
        total: 0
      };
      map.set(key, entry);
    }
    entry.total += 1;
    if (g === 'male') entry.male += 1;
    else if (g === 'female') entry.female += 1;
    else entry.unspecified += 1;
  };

  for (const member of members) {
    const g = normalizeStudentGender(member.gender);
    addGender(totalMembers, g);

    addBooleanStatus(baptized, member.isBaptized, g);
    addBooleanStatus(lordsSupper, member.takesLordsSupper, g);
    addBooleanStatus(tithe, member.paysTithe, g);

    registerCategory(eduMap, member.educationLevel, g);
    registerCategory(occMap, member.occupation, g);
  }

  const sortRows = (rows: DetailedCategoryRow[]): DetailedCategoryRow[] =>
    rows.sort((a, b) => {
      if (a.isUnspecified && !b.isUnspecified) return 1;
      if (!a.isUnspecified && b.isUnspecified) return -1;
      if (b.total !== a.total) return b.total - a.total;
      return a.label.localeCompare(b.label, 'am');
    });

  return {
    totalMembers,
    baptized,
    lordsSupper,
    tithe,
    educationLevels: sortRows(Array.from(eduMap.values())),
    occupations: sortRows(Array.from(occMap.values()))
  };
};
