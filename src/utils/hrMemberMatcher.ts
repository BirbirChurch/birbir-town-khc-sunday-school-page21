import { ChurchHRRecord, ChurchMember } from '../types';
import { normalizeAmharicSearchText } from './amharicSearchAndChapel';

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
