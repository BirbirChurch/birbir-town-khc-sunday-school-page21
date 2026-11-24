import { ChurchChild, ChurchHRRecord, ChurchMember } from '../types';
import { normalizeAmharicSearchText } from './amharicSearchAndChapel';
import { getRootFamilyBaseCode, normalizeCodeForLookup } from './memberCodeGenerator';

const HONORIFIC_PREFIXES = [
  'ወንጌላዊት',
  'ወንጌላዊ',
  'ወንጌላኢ',
  'መምህሪት',
  'መምህር',
  'መምህሪ',
  'መጋቢ',
  'ዲያቆኒት',
  'ዲያቆን',
  'ፓስተር',
  'ሽማግሌ',
  'ሐዋርያ',
  'ነብይ',
  'ወ/ሪት',
  'ወ/ሮ',
  'አቶ',
  'ወይዘሪት',
  'ወይዘሮ',
  'ቀሲስ'
];

const NORMALIZED_PREFIXES = HONORIFIC_PREFIXES.map((p) => normalizeAmharicSearchText(p));

/**
 * Strips Ethiopian honorific/ministry prefixes (መጋቢ, መምህር/መምህሪ, ወንጌላዊ/ወንጌላዊት, አቶ, etc.)
 * and normalizes Amharic homophones for accurate matching with church master registry.
 */
export function stripEthiopianHonorificTitles(rawName: string | undefined | null): string {
  const norm = normalizeAmharicSearchText(rawName);
  if (!norm) return '';
  const tokens = norm.split(' ').filter(Boolean);
  while (tokens.length > 1 && NORMALIZED_PREFIXES.includes(tokens[0])) {
    tokens.shift();
  }
  return tokens.join(' ');
}

export interface HRChurchMemberMatch {
  phone?: string;
  member?: ChurchMember;
  matchType?: 'exact' | 'stripped_exact' | 'multi_token_prefix' | 'unique_first_name';
}

/**
 * Finds the best matching ChurchMember for an HR person's name so their phone number
 * can be automatically pulled from the church master registry (even when titles differ).
 */
export function findMatchingChurchMemberForHR(
  hrName: string | undefined | null,
  churchMembers: ChurchMember[]
): HRChurchMemberMatch {
  if (!hrName || !Array.isArray(churchMembers) || churchMembers.length === 0) {
    return {};
  }

  const rawNorm = normalizeAmharicSearchText(hrName);
  const strippedNorm = stripEthiopianHonorificTitles(hrName);
  if (!strippedNorm && !rawNorm) return {};

  const pickBestWithPhone = (candidates: ChurchMember[]): ChurchMember | undefined => {
    if (candidates.length === 0) return undefined;
    return candidates.find((m) => String(m.phone || '').trim() !== '') || candidates[0];
  };

  // 1. Exact full match (with or without title)
  const exactMatches = churchMembers.filter((m) => {
    const mNorm = normalizeAmharicSearchText(m.name);
    return mNorm !== '' && (mNorm === rawNorm || mNorm === strippedNorm);
  });
  if (exactMatches.length > 0) {
    const best = pickBestWithPhone(exactMatches);
    return {
      phone: best?.phone?.trim() || undefined,
      member: best,
      matchType: 'exact'
    };
  }

  // 2. Stripped-title exact match (in case churchMember also has a title prefix)
  const strippedMatches = churchMembers.filter((m) => {
    const mStripped = stripEthiopianHonorificTitles(m.name);
    return mStripped !== '' && mStripped === strippedNorm;
  });
  if (strippedMatches.length > 0) {
    const best = pickBestWithPhone(strippedMatches);
    return {
      phone: best?.phone?.trim() || undefined,
      member: best,
      matchType: 'stripped_exact'
    };
  }

  const hrTokens = strippedNorm.split(' ').filter(Boolean);

  // 3. Multi-token ordered prefix match (e.g. "ዳዊት ደሳለኝ" vs "ዳዊት ደሳለኝ አየለ" when only 2 names recorded)
  // Require HR tokens >= 2 and prefer candidate with fewest extra tokens (and phone present).
  if (hrTokens.length >= 2) {
    const prefixCandidates = churchMembers.filter((m) => {
      const mTokens = stripEthiopianHonorificTitles(m.name).split(' ').filter(Boolean);
      if (mTokens.length < hrTokens.length) return false;
      return hrTokens.every((tok, idx) => mTokens[idx] === tok);
    });
    if (prefixCandidates.length > 0) {
      const sorted = [...prefixCandidates].sort((a, b) => {
        const aHasPhone = String(a.phone || '').trim() ? 0 : 1;
        const bHasPhone = String(b.phone || '').trim() ? 0 : 1;
        if (aHasPhone !== bHasPhone) return aHasPhone - bHasPhone;
        const aLen = stripEthiopianHonorificTitles(a.name).split(' ').length;
        const bLen = stripEthiopianHonorificTitles(b.name).split(' ').length;
        return aLen - bLen;
      });
      return {
        phone: sorted[0]?.phone?.trim() || undefined,
        member: sorted[0],
        matchType: 'multi_token_prefix'
      };
    }

    // Fallback: all HR tokens appear in same member name (handles minor spacing or grandfather order)
    const tokenAllCandidates = churchMembers.filter((m) => {
      const mTokens = stripEthiopianHonorificTitles(m.name).split(' ').filter(Boolean);
      if (mTokens.length === 0) return false;
      return hrTokens.every((tok) => mTokens.includes(tok));
    });
    if (tokenAllCandidates.length === 1) {
      const only = tokenAllCandidates[0];
      return {
        phone: only.phone?.trim() || undefined,
        member: only,
        matchType: 'multi_token_prefix'
      };
    }
  }

  // 4. Single-word admin staff name (e.g., "ሕዝቀኤል", "ማርቆስ", "ኢያሱ", "መሰለች"):
  // Safely match ONLY if uniquely identified in the registry so we never grab a wrong person's number.
  if (hrTokens.length === 1) {
    const targetTok = hrTokens[0];
    const firstTokenMatches = churchMembers.filter((m) => {
      const mTokens = stripEthiopianHonorificTitles(m.name).split(' ').filter(Boolean);
      return mTokens[0] === targetTok;
    });
    if (firstTokenMatches.length === 1) {
      const only = firstTokenMatches[0];
      return {
        phone: only.phone?.trim() || undefined,
        member: only,
        matchType: 'unique_first_name'
      };
    }
  }

  return {};
}

/**
 * Populates blank phone numbers on HR records from matching churchMembers.
 * Preserves any manually entered phone number on existing HR records.
 */
export function syncHRPhonesFromChurchMembers(
  hrRecords: ChurchHRRecord[],
  churchMembers: ChurchMember[],
  options?: { overwriteExisting?: boolean }
): { updated: ChurchHRRecord[]; matchedCount: number; changed: boolean } {
  if (!Array.isArray(hrRecords) || hrRecords.length === 0 || !Array.isArray(churchMembers) || churchMembers.length === 0) {
    return { updated: hrRecords || [], matchedCount: 0, changed: false };
  }

  let matchedCount = 0;
  let changed = false;

  const updated = hrRecords.map((rec) => {
    const existingPhone = String(rec.phone || '').trim();
    if (existingPhone && !options?.overwriteExisting) {
      return rec;
    }
    const match = findMatchingChurchMemberForHR(rec.name, churchMembers);
    if (match.phone && match.phone !== existingPhone) {
      matchedCount += 1;
      changed = true;
      return {
        ...rec,
        phone: match.phone
      };
    }
    return rec;
  });

  return { updated, matchedCount, changed };
}

export function getHRDepartments(rec: Pick<ChurchHRRecord, 'department' | 'departments'>): string[] {
  const fromArray = Array.isArray(rec.departments)
    ? rec.departments.map((d) => String(d || '').trim()).filter(Boolean)
    : [];
  if (fromArray.length > 0) {
    return Array.from(new Set(fromArray));
  }
  const single = String(rec.department || '').trim();
  if (!single) return [];
  return Array.from(
    new Set(
      single
        .split(/[፣,+/|]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

export function getHRRoleTitles(
  rec: Pick<ChurchHRRecord, 'roleTitle' | 'roleTitles'>,
  placeholderText = 'ኃላፍነት ይምረጡ'
): string[] {
  const fromArray = Array.isArray(rec.roleTitles)
    ? rec.roleTitles.map((r) => String(r || '').trim()).filter((r) => r && r !== placeholderText)
    : [];
  if (fromArray.length > 0) {
    return Array.from(new Set(fromArray));
  }
  const single = String(rec.roleTitle || '').trim();
  if (!single || single === placeholderText) return [];
  return Array.from(
    new Set(
      single
        .split(/[፣,/|]+/)
        .map((s) => s.trim())
        .filter((r) => r && r !== placeholderText)
    )
  );
}

export interface ServantChurchFamilyResolution {
  selfMember?: ChurchMember;
  familyCode?: string;
  chapel?: string;
  isManuallyLinked: boolean;
  familyMembers: ChurchMember[];
  familyChildren: ChurchChild[];
  detectedSpouse?: ChurchMember;
  detectedChildren: {
    key: string;
    name: string;
    gender: 'ወ' | 'ሴ';
    ageOrBirthDate?: string;
    memberCode?: string;
    linkedMemberId?: number;
    linkedChildId?: number;
    photoDataUrl?: string;
    photoStorageKey?: string;
    photoName?: string;
    photoUpdatedAt?: string;
    source: 'members' | 'children';
  }[];
}

const isSpouseRelation = (relation?: string, selfGender?: string, candidateGender?: string): boolean => {
  const rel = normalizeAmharicSearchText(relation);
  if (!rel) return false;
  if (
    rel.includes('ሚስት') ||
    rel.includes('ባል') ||
    rel.includes('ባለቤት') ||
    rel.includes('የትዳር') ||
    rel.includes('spouse') ||
    rel.includes('wife') ||
    rel.includes('husband')
  ) {
    return true;
  }
  if ((rel.includes('አባወራ') || rel.includes('እማወራ')) && selfGender && candidateGender && selfGender !== candidateGender) {
    return true;
  }
  return false;
};

const isChildRelationOrAge = (member: ChurchMember): boolean => {
  const rel = normalizeAmharicSearchText(member.relationToHead);
  if (rel.includes('ልጅ') || rel.includes('child') || rel.includes('son') || rel.includes('daughter')) {
    return true;
  }
  const ageNum = Number(member.age);
  if (Number.isFinite(ageNum) && ageNum >= 0 && ageNum <= 25 && !isSpouseRelation(member.relationToHead)) {
    return true;
  }
  return false;
};

export function resolveServantChurchFamily(
  record: Pick<ChurchHRRecord, 'name' | 'gender' | 'spouseName' | 'linkedMemberId' | 'linkedMemberCode' | 'linkedFamilyCode'>,
  churchMembers: ChurchMember[] = [],
  churchChildren: ChurchChild[] = []
): ServantChurchFamilyResolution {
  let selfMember: ChurchMember | undefined;
  let isManuallyLinked = false;

  if (record.linkedMemberId !== undefined) {
    selfMember = churchMembers.find((m) => m.id === record.linkedMemberId);
    if (selfMember) isManuallyLinked = true;
  }
  if (!selfMember && record.linkedMemberCode) {
    const targetCode = normalizeCodeForLookup(record.linkedMemberCode);
    if (targetCode) {
      selfMember = churchMembers.find((m) => normalizeCodeForLookup(m.memberCode) === targetCode);
      if (selfMember) isManuallyLinked = true;
    }
  }
  if (!selfMember) {
    selfMember = findMatchingChurchMemberForHR(record.name, churchMembers).member;
  }

  const rawFamilyBase =
    record.linkedFamilyCode ||
    selfMember?.familyCode ||
    getRootFamilyBaseCode(selfMember?.memberCode) ||
    '';
  const normFamilyBase = normalizeCodeForLookup(rawFamilyBase);

  const servantStripped = stripEthiopianHonorificTitles(record.name);
  const spouseStripped = stripEthiopianHonorificTitles(record.spouseName);

  const memberMatchesFamily = (m: ChurchMember): boolean => {
    if (selfMember && m.id === selfMember.id) return false;
    if (normFamilyBase) {
      const mFamilyNorm = normalizeCodeForLookup(m.familyCode || getRootFamilyBaseCode(m.memberCode));
      if (mFamilyNorm && mFamilyNorm === normFamilyBase) return true;
    }
    if (servantStripped && servantStripped.split(' ').length >= 2) {
      const parentStripped = stripEthiopianHonorificTitles(m.parentName);
      if (parentStripped && parentStripped === servantStripped) return true;
    }
    return false;
  };

  const familyMembersRaw = churchMembers.filter(memberMatchesFamily);

  // Deduplicate by member id and sort spouse -> children -> others
  const selfGender = selfMember?.gender || record.gender;
  const familyMembers = [...familyMembersRaw].sort((a, b) => {
    const aSpouse = isSpouseRelation(a.relationToHead, selfGender, a.gender) ? 0 : 1;
    const bSpouse = isSpouseRelation(b.relationToHead, selfGender, b.gender) ? 0 : 1;
    if (aSpouse !== bSpouse) return aSpouse - bSpouse;
    const ageA = Number(a.age) || 0;
    const ageB = Number(b.age) || 0;
    return ageB - ageA;
  });

  const detectedSpouse =
    familyMembers.find((m) => isSpouseRelation(m.relationToHead, selfGender, m.gender)) ||
    (spouseStripped
      ? familyMembers.find((m) => stripEthiopianHonorificTitles(m.name) === spouseStripped)
      : undefined) ||
    familyMembers.find((m) => {
      const ageNum = Number(m.age);
      return Number.isFinite(ageNum) && ageNum >= 18 && m.gender && selfGender && m.gender !== selfGender;
    });

  // Match children from churchChildren database
  const matchingChurchChildren = churchChildren.filter((c) => {
    if (normFamilyBase) {
      const cFamilyNorm = normalizeCodeForLookup(c.familyCode || getRootFamilyBaseCode(c.memberCode));
      if (cFamilyNorm && cFamilyNorm === normFamilyBase) return true;
    }
    const cParentStripped = stripEthiopianHonorificTitles(c.parentName);
    if (cParentStripped && servantStripped && servantStripped.split(' ').length >= 2) {
      if (cParentStripped === servantStripped) return true;
    }
    if (cParentStripped && spouseStripped && spouseStripped.split(' ').length >= 2) {
      if (cParentStripped === spouseStripped) return true;
    }
    return false;
  });

  // Deduplicate children shown inside churchChildren vs already listed in churchMembers
  const existingMemberChildKeys = new Set<string>();
  familyMembers.forEach((m) => {
    const codeKey = normalizeCodeForLookup(m.memberCode);
    if (codeKey) existingMemberChildKeys.add(`code:${codeKey}`);
    const nKey = stripEthiopianHonorificTitles(m.name);
    if (nKey) existingMemberChildKeys.add(`name:${nKey}`);
  });

  const familyChildren = matchingChurchChildren.filter((c) => {
    const codeKey = normalizeCodeForLookup(c.memberCode);
    if (codeKey && existingMemberChildKeys.has(`code:${codeKey}`)) return false;
    const nKey = stripEthiopianHonorificTitles(c.name);
    if (nKey && existingMemberChildKeys.has(`name:${nKey}`)) return false;
    return true;
  });

  const detectedChildren: ServantChurchFamilyResolution['detectedChildren'] = [];
  const seenChildNames = new Set<string>();

  familyMembers.forEach((m) => {
    if (detectedSpouse && m.id === detectedSpouse.id) return;
    if (!isChildRelationOrAge(m) && isSpouseRelation(m.relationToHead)) return;
    if (!isChildRelationOrAge(m) && Number(m.age) >= 35) return;
    const nKey = stripEthiopianHonorificTitles(m.name) || String(m.id);
    if (seenChildNames.has(nKey)) return;
    seenChildNames.add(nKey);
    detectedChildren.push({
      key: `m_${m.id}`,
      name: m.name,
      gender: m.gender === 'ሴ' ? 'ሴ' : 'ወ',
      ageOrBirthDate: m.age !== undefined && String(m.age).trim() !== '' ? `${m.age} ዓመት` : undefined,
      memberCode: m.memberCode,
      linkedMemberId: m.id,
      photoDataUrl: m.photoDataUrl,
      photoStorageKey: m.photoStorageKey,
      photoName: m.photoName,
      photoUpdatedAt: m.photoUpdatedAt,
      source: 'members'
    });
  });

  matchingChurchChildren.forEach((c) => {
    const nKey = stripEthiopianHonorificTitles(c.name) || String(c.id);
    if (seenChildNames.has(nKey)) return;
    seenChildNames.add(nKey);
    detectedChildren.push({
      key: `c_${c.id}`,
      name: c.name,
      gender: c.gender === 'ሴ' ? 'ሴ' : 'ወ',
      ageOrBirthDate: c.age !== undefined && String(c.age).trim() !== '' ? `${c.age} ዓመት` : undefined,
      memberCode: c.memberCode,
      linkedChildId: c.id,
      photoDataUrl: c.photoDataUrl,
      photoStorageKey: c.photoStorageKey,
      photoName: c.photoName,
      photoUpdatedAt: c.photoUpdatedAt,
      source: 'children'
    });
  });

  return {
    selfMember,
    familyCode: rawFamilyBase || undefined,
    chapel: selfMember?.chapel || familyMembers[0]?.chapel || familyChildren[0]?.chapel,
    isManuallyLinked,
    familyMembers,
    familyChildren,
    detectedSpouse,
    detectedChildren
  };
}

export function searchChurchMembersForServantLink(
  query: string,
  churchMembers: ChurchMember[] = []
): { member: ChurchMember; familyCount: number }[] {
  const qNorm = normalizeAmharicSearchText(query);
  const qRaw = String(query || '').trim().toLowerCase();
  if (!qNorm && !qRaw) return [];

  // Precompute family counts per base code
  const familyCounts = new Map<string, number>();
  churchMembers.forEach((m) => {
    const base = normalizeCodeForLookup(m.familyCode || getRootFamilyBaseCode(m.memberCode));
    if (base) {
      familyCounts.set(base, (familyCounts.get(base) || 0) + 1);
    }
  });

  return churchMembers
    .filter((m) => {
      const nNorm = normalizeAmharicSearchText(m.name);
      const codeNorm = normalizeCodeForLookup(m.memberCode);
      const famNorm = normalizeCodeForLookup(m.familyCode);
      const phoneStr = String(m.phone || '').toLowerCase();
      return (
        (qNorm && nNorm.includes(qNorm)) ||
        (qRaw && (codeNorm.includes(qRaw.replace(/\s+/g, '')) || famNorm.includes(qRaw.replace(/\s+/g, '')) || phoneStr.includes(qRaw)))
      );
    })
    .slice(0, 15)
    .map((member) => {
      const base = normalizeCodeForLookup(member.familyCode || getRootFamilyBaseCode(member.memberCode));
      return {
        member,
        familyCount: base ? familyCounts.get(base) || 1 : 1
      };
    });
}
