import { DEFAULT_CHAPELS } from '../constants/initialData';
import { ChurchMember, WomenHouseholdCategory } from '../types';
import { mapToOfficialChapel, parseNumericAgePure } from './amharicSearchAndChapel';
import {
  getRootFamilyBaseCode,
  normalizeCodeForLookup,
  parseChapelCodeParts
} from './memberCodeGenerator';

export const parseMemberNumericAge = (
  rawAge: number | string | undefined,
  currentYearNum: number = 2018
): number | null => {
  return parseNumericAgePure(rawAge, currentYearNum);
};

export const isMaleMember = (m: ChurchMember): boolean => {
  const g = String(m.gender || '').trim().toLowerCase();
  return g === 'ወ' || g.startsWith('ወንድ') || g === 'm' || g === 'male';
};

export const isFemaleMember = (m: ChurchMember): boolean => {
  const g = String(m.gender || '').trim().toLowerCase();
  return g === 'ሴ' || g.startsWith('ሴት') || g === 'f' || g === 'female';
};

export const isYouthMember = (
  member: ChurchMember,
  currentYearNum: number = 2018
): boolean => {
  if (member.isYouth === true) return true;
  if (member.isYouth === false) return false;
  const age = parseMemberNumericAge(member.age, currentYearNum);
  return age !== null && age >= 15 && age <= 29;
};

export const getYouthAgeBracket = (
  age: number | null
): '15-19' | '20-24' | '25-29' | 'other' => {
  if (age === null) return 'other';
  if (age >= 15 && age <= 19) return '15-19';
  if (age >= 20 && age <= 24) return '20-24';
  if (age >= 25 && age <= 29) return '25-29';
  return 'other';
};

export interface HouseholdContextEntry {
  hasAdultMale: boolean;
  adultMaleNames: string[];
  adultMaleHeadName: string;
  memberCount: number;
}

export const resolveMemberHouseholdKey = (member: ChurchMember): string => {
  const chapel = mapToOfficialChapel(member.chapel || '');
  const anchor = member.familyCode || member.memberCode || '';
  if (anchor) {
    const parsed = parseChapelCodeParts(anchor, chapel);
    if (parsed) return `${chapel}::${normalizeCodeForLookup(parsed.baseCode)}`;
    const base = getRootFamilyBaseCode(anchor, chapel);
    if (base) return `${chapel}::${normalizeCodeForLookup(base)}`;
  }
  return `${chapel}::single_${member.id}`;
};

export const buildHouseholdContextMap = (
  members: ChurchMember[],
  currentYearNum: number = 2018
): Map<string, HouseholdContextEntry> => {
  const map = new Map<string, HouseholdContextEntry>();
  members.forEach((m) => {
    const key = resolveMemberHouseholdKey(m);
    const entry = map.get(key) || {
      hasAdultMale: false,
      adultMaleNames: [],
      adultMaleHeadName: '',
      memberCount: 0
    };
    entry.memberCount += 1;

    if (isMaleMember(m)) {
      const age = parseMemberNumericAge(m.age, currentYearNum);
      const rel = String(m.relationToHead || '').trim().toLowerCase();
      const isMinorSon = rel.includes('ልጅ') || rel.includes('child') || rel.includes('son');
      const isAdultMale =
        (age === null || age >= 20) && (!isMinorSon || (age !== null && age >= 26));
      if (isAdultMale) {
        entry.hasAdultMale = true;
        entry.adultMaleNames.push(m.name);
        if (
          !entry.adultMaleHeadName ||
          rel.includes('መሪ') ||
          rel.includes('አባት') ||
          rel.includes('አባወራ') ||
          rel.includes('head')
        ) {
          entry.adultMaleHeadName = m.name;
        }
      }
    }

    map.set(key, entry);
  });
  return map;
};

/**
 * Classifies an eligible female church member into:
 * - 'married': የባል ሚስት የሆኑ (ባለትዳር ሴቶች)
 * - 'female_head': ራሳቸው የቤቱ አባወራ ሆነው የሚኖሩ ሴቶች
 * - 'other': ሌሎች ሴቶች (ያላገቡ / ከቤተሰብ ጋር የሚኖሩ — በሴቶች ዘርፍም ሆነ በሴቶች ቋት አይካተቱም)
 * Returns null if the record is not female or is a minor under 15 without explicit tagging.
 */
export const classifyWomanInChapel = (
  member: ChurchMember,
  householdMap: Map<string, HouseholdContextEntry>,
  currentYearNum: number = 2018
): WomenHouseholdCategory | null => {
  if (!isFemaleMember(member)) return null;

  if (
    member.womenCategory === 'married' ||
    member.womenCategory === 'female_head' ||
    member.womenCategory === 'other'
  ) {
    return member.womenCategory;
  }

  const age = parseMemberNumericAge(member.age, currentYearNum);
  const rel = String(member.relationToHead || '').trim().toLowerCase();
  const marital = String(member.maritalStatus || '').trim().toLowerCase();
  const combined = `${rel} ${marital}`.trim();

  // Explicit minor children (<15) only enter if explicitly tagged above
  if (age !== null && age < 15) return null;

  const isExplicitUnmarried =
    marital.includes('ያላገባ') ||
    marital.includes('single') ||
    marital.includes('unmarried') ||
    rel.includes('ብቸኛ');

  const explicitMarried =
    combined.includes('የባል ሚስት') ||
    combined.includes('ባለትዳር') ||
    combined.includes('ያገባች') ||
    combined.includes('ያገባ') ||
    combined.includes('ሚስት') ||
    combined.includes('ባለቤት') ||
    combined.includes('married') ||
    combined.includes('wife') ||
    combined.includes('spouse');

  const explicitFemaleHead =
    combined.includes('ራሷ አባወራ') ||
    combined.includes('ራሷ የቤቱ አባወራ') ||
    combined.includes('የቤቱ አባወራ') ||
    combined.includes('እማወራ') ||
    combined.includes('አባወራ') ||
    combined.includes('ራሷን የቻለች') ||
    combined.includes('female_head') ||
    combined.includes('female head') ||
    combined.includes('single mother') ||
    combined.includes('widow') ||
    combined.includes('divorced') ||
    combined.includes('መበለት') ||
    combined.includes('የተፈታች');

  if (explicitMarried) {
    return 'married';
  }

  if (explicitFemaleHead && !isExplicitUnmarried) {
    return 'female_head';
  }

  const isExplicitDaughterOrSibling =
    rel.includes('ልጅ') ||
    rel.includes('daughter') ||
    rel.includes('child') ||
    rel.includes('እህት') ||
    rel.includes('sister') ||
    isExplicitUnmarried;

  if (isExplicitDaughterOrSibling) {
    return age !== null && age < 18 ? null : 'other';
  }

  // Minor teen (15–17) without explicit married/head tag is not a wife or household head
  if (age !== null && age < 18) {
    return 'other';
  }

  const hhKey = resolveMemberHouseholdKey(member);
  const hh = householdMap.get(hhKey);

  if (rel.includes('እናት') || rel.includes('mother')) {
    return hh?.hasAdultMale ? 'married' : 'female_head';
  }

  if (hh?.hasAdultMale) {
    // Adult female in a household with an adult male husband/head (not marked daughter/sister/unmarried)
    if (age === null || age >= 18) {
      return 'married';
    }
    return 'other';
  }

  // Multi-member household with no adult male husband/head: mother/head of the household
  if ((rel.includes('መሪ') || rel.includes('head')) && hh && hh.memberCount > 1) {
    return 'female_head';
  }
  if (hh && hh.memberCount > 1 && (age === null || age >= 25)) {
    return 'female_head';
  }

  return 'other';
};

/**
 * Strictly matches ONLY women who are a husband's wife ('married' / የባል ሚስት የሆኑ)
 * for Women's Sector / Women's Ministry ("ሴቶች ዘርፍ").
 */
export const isMarriedWife = (
  member: ChurchMember,
  householdMap: Map<string, HouseholdContextEntry>,
  currentYearNum: number = 2018
): boolean => {
  return classifyWomanInChapel(member, householdMap, currentYearNum) === 'married';
};

export interface ChapelYouthWomenSummary {
  chapelName: string;
  youthMale: number;
  youthFemale: number;
  youthTotal: number;
  womenMarried: number;
  womenFemaleHead: number;
  womenOther: number;
  womenTotal: number;
}

export const computeChapelYouthWomenStats = (
  churchMembers: ChurchMember[],
  chapelList: string[] = DEFAULT_CHAPELS,
  currentYear: string = '2018'
): Map<string, ChapelYouthWomenSummary> => {
  const yearNum = parseInt(currentYear, 10) || 2018;
  const householdMap = buildHouseholdContextMap(churchMembers, yearNum);
  const result = new Map<string, ChapelYouthWomenSummary>();

  chapelList.forEach((ch) => {
    result.set(ch, {
      chapelName: ch,
      youthMale: 0,
      youthFemale: 0,
      youthTotal: 0,
      womenMarried: 0,
      womenFemaleHead: 0,
      womenOther: 0,
      womenTotal: 0
    });
  });

  churchMembers.forEach((m) => {
    const chapel = mapToOfficialChapel(m.chapel || '');
    if (!result.has(chapel)) {
      result.set(chapel, {
        chapelName: chapel,
        youthMale: 0,
        youthFemale: 0,
        youthTotal: 0,
        womenMarried: 0,
        womenFemaleHead: 0,
        womenOther: 0,
        womenTotal: 0
      });
    }
    const row = result.get(chapel)!;

    if (isYouthMember(m, yearNum)) {
      row.youthTotal += 1;
      if (isFemaleMember(m)) row.youthFemale += 1;
      else row.youthMale += 1;
    }

    const wCat = classifyWomanInChapel(m, householdMap, yearNum);
    if (wCat === 'married') {
      row.womenMarried += 1;
      row.womenTotal += 1;
    } else if (wCat === 'female_head') {
      row.womenFemaleHead += 1;
      row.womenTotal += 1;
    } else if (wCat === 'other') {
      row.womenOther += 1;
    }
  });

  return result;
};

export interface MemberAgeCohortCounts {
  children0to14: number;
  youth15to29: number;
  adults30to59: number;
  seniors60Plus: number;
  total: number;
}

const parseMemberAgeWithFallback = (rawAge: unknown, refYear: number): number => {
  let numAge = parseMemberNumericAge(rawAge as number | string | undefined, refYear);
  if (numAge === null && rawAge !== undefined && rawAge !== null) {
    const str = String(rawAge).trim();
    const dateMatch = str.match(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](\d{2})\b/);
    if (dateMatch) {
      const yy = parseInt(dateMatch[1], 10);
      const y = yy <= 30 ? 2000 + yy : 1900 + yy;
      const currentGregYear = new Date().getFullYear();
      numAge = y <= refYear ? Math.max(0, refYear - y) : Math.max(0, currentGregYear - y);
    }
  }
  return numAge === null ? 35 : numAge;
};

export const computeMemberAgeCohorts = (
  churchMembers: ChurchMember[],
  refYear: number = 2018
): MemberAgeCohortCounts => {
  let children0to14 = 0;
  let youth15to29 = 0;
  let adults30to59 = 0;
  let seniors60Plus = 0;

  (churchMembers || []).forEach((m) => {
    const numAge = parseMemberAgeWithFallback(m.age, refYear);
    if (numAge <= 14) children0to14 += 1;
    else if (numAge <= 29) youth15to29 += 1;
    else if (numAge <= 59) adults30to59 += 1;
    else seniors60Plus += 1;
  });

  return {
    children0to14,
    youth15to29,
    adults30to59,
    seniors60Plus,
    total: (churchMembers || []).length
  };
};

