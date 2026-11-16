import { DEFAULT_CHAPELS } from '../constants/initialData';
import { ChurchMember } from '../types';

/**
 * Official Church prefix: ብከቃሕቤክ (የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን)
 */
export const CHURCH_CODE_ROOT = 'ብከቃሕቤክ';

/**
 * Exact chapel code prefixes for the 10 official chapels.
 * Example for El-Roi Chapel: ብከቃሕቤክኤልሮኢ 0001
 */
export const CHAPEL_CODE_PREFIXES: Record<string, string> = {
  'ኤልሮኢ ቻፕል': 'ብከቃሕቤክኤልሮኢ',
  'ሻሎም ቻፕል': 'ብከቃሕቤክሻሎም',
  'ቤቴል ቻፕል': 'ብከቃሕቤክቤቴል',
  'ያህዌ ቻፕል': 'ብከቃሕቤክያህዌ',
  'ኤዴን ቻፕል': 'ብከቃሕቤክኤዴን',
  'አቤንኤዘር ቻፕል': 'ብከቃሕቤክአቤንኤዘር',
  'ርኆቦት ቻፕል': 'ብከቃሕቤክርኆቦት',
  'ኤልሻዳይ ቻፕል': 'ብከቃሕቤክኤልሻዳይ',
  'ሩሐማ ቻፕል': 'ብከቃሕቤክሩሐማ',
  'አዶናይ ቻፕል': 'ብከቃሕቤክአዶናይ'
};

const normalizeHomophones = (text: string): string => {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[ሀሃሐሓኀኃ]/g, 'ሀ')
    .replace(/[ሑኁ]/g, 'ሁ')
    .replace(/[ሒኂ]/g, 'ሂ')
    .replace(/[ሔኄ]/g, 'ሄ')
    .replace(/[ሕኅ]/g, 'ህ')
    .replace(/[ሖኆ]/g, 'ሆ')
    .replace(/ሠ/g, 'ሰ')
    .replace(/ሡ/g, 'ሱ')
    .replace(/ሢ/g, 'ሲ')
    .replace(/ሣ/g, 'ሳ')
    .replace(/ሤ/g, 'ሴ')
    .replace(/ሥ/g, 'ስ')
    .replace(/ሦ/g, 'ሶ')
    .replace(/[አኣዐዓ]/g, 'አ')
    .replace(/ዑ/g, 'ኡ')
    .replace(/ዒ/g, 'ኢ')
    .replace(/ዔ/g, 'ኤ')
    .replace(/ዕ/g, 'እ')
    .replace(/ዖ/g, 'ኦ')
    .replace(/ፀ/g, 'ጸ')
    .replace(/ፁ/g, 'ጹ')
    .replace(/ፂ/g, 'ጺ')
    .replace(/ፃ/g, 'ጻ')
    .replace(/ፄ/g, 'ጼ')
    .replace(/ፅ/g, 'ጽ')
    .replace(/ፆ/g, 'ጾ');
};

export const resolveOfficialChapel = (rawInput: string): string => {
  const str = String(rawInput || '').trim().toLowerCase().replace(/[\s\-_]+/g, '');
  if (str.includes('elroi') || str.includes('elrohe') || str.includes('elro') || str.includes('ኤልሮኢ') || str.includes('ኤልሮይ') || str.includes('ሮኢ')) return DEFAULT_CHAPELS[0];
  if (str.includes('shalom') || str.includes('shaloam') || str.includes('salom') || str.includes('ሻሎም') || str.includes('ሳሎም')) return DEFAULT_CHAPELS[1];
  if (str.includes('bethel') || str.includes('betel') || str.includes('ቤቴል') || str.includes('በቴል') || str.includes('ቤትኤል')) return DEFAULT_CHAPELS[2];
  if (str.includes('yahweh') || str.includes('yahwe') || str.includes('yahuweh') || str.includes('yahve') || str.includes('yahveh') || str.includes('jah') || str.includes('ያህዌ') || str.includes('ያህዌህ') || str.includes('ያህወ')) return DEFAULT_CHAPELS[3];
  if (str.includes('eden') || str.includes('edan') || str.includes('ኤዴን') || str.includes('ኤደን') || str.includes('ኤዲን')) return DEFAULT_CHAPELS[4];
  if (str.includes('ebenezer') || str.includes('abenezer') || str.includes('ebnezer') || str.includes('አቤንኤዘር') || str.includes('አበንኤዘር') || str.includes('እቤንኤዘር') || str.includes('አቤኔዘር')) return DEFAULT_CHAPELS[5];
  if (str.includes('rehoboth') || str.includes('rehobot') || str.includes('rohoboth') || str.includes('rohobot') || str.includes('rehaboth') || str.includes('rehabot') || str.includes('ርኆቦት') || str.includes('ርሆቦት') || str.includes('ርህቦት') || str.includes('ርኮቦት')) return DEFAULT_CHAPELS[6];
  if (str.includes('elshaddai') || str.includes('elshaday') || str.includes('elshadday') || str.includes('shaddai') || str.includes('shaday') || str.includes('ኤልሻዳይ') || str.includes('ሻዳይ')) return DEFAULT_CHAPELS[7];
  if (str.includes('ruhama') || str.includes('ruhamah') || str.includes('ruhamaa') || str.includes('ruhamma') || str.includes('ruham') || str.includes('ሩሐማ') || str.includes('ሩሃማ') || str.includes('ሩሀማ')) return DEFAULT_CHAPELS[8];
  if (str.includes('adonai') || str.includes('adonay') || str.includes('adonaiy') || str.includes('አዶናይ') || str.includes('አደናይ')) return DEFAULT_CHAPELS[9];
  return DEFAULT_CHAPELS[0];
};

/**
 * Returns the exact code prefix for a given chapel name.
 */
export const getChapelCodePrefix = (chapelName: string): string => {
  const official = resolveOfficialChapel(chapelName || '');
  if (CHAPEL_CODE_PREFIXES[official]) {
    return CHAPEL_CODE_PREFIXES[official];
  }
  const stripped = official.replace(/ቻፕል/g, '').replace(/\s+/g, '').trim();
  return `${CHURCH_CODE_ROOT}${stripped}`;
};

export interface ParsedChapelCode {
  prefix: string;
  baseSeq: number;
  subSeq: number | null;
  baseCode: string;
  formatted: string;
}

/**
 * Formats a chapel code with 4-digit zero padding and optional family branch sub-code
 * (e.g., "ብከቃሕቤክኤልሻዳይ 0513" or "ብከቃሕቤክኤልሻዳይ 0513/1").
 */
export const formatChapelMemberCode = (
  chapelName: string,
  sequenceNum: number,
  subSeq?: number | null
): string => {
  const prefix = getChapelCodePrefix(chapelName);
  const safeNum = Math.max(1, Math.floor(sequenceNum));
  const padded = String(safeNum).padStart(4, '0');
  if (typeof subSeq === 'number' && !isNaN(subSeq) && subSeq >= 1) {
    return `${prefix} ${padded}/${Math.floor(subSeq)}`;
  }
  return `${prefix} ${padded}`;
};

/**
 * Parses base sequence number and optional family branch sub-number ("/1", "/2", etc.)
 * from an existing member code if it belongs to the given chapel prefix.
 */
export const parseChapelCodeParts = (
  code: string | undefined | null,
  chapelName?: string
): ParsedChapelCode | null => {
  const clean = String(code || '').trim();
  if (!clean) return null;

  let matchedChapel = chapelName ? resolveOfficialChapel(chapelName) : '';
  if (matchedChapel) {
    const expectedPrefix = getChapelCodePrefix(matchedChapel);
    if (!normalizeHomophones(clean).startsWith(normalizeHomophones(expectedPrefix))) {
      return null;
    }
  } else {
    const foundChapel = DEFAULT_CHAPELS.find((ch) =>
      normalizeHomophones(clean).startsWith(normalizeHomophones(getChapelCodePrefix(ch)))
    );
    if (!foundChapel) return null;
    matchedChapel = foundChapel;
  }

  const numMatch = clean.match(/(\d+)(?:\s*\/\s*(\d+))?\s*$/);
  if (!numMatch) return null;

  const baseSeq = parseInt(numMatch[1], 10);
  if (isNaN(baseSeq) || baseSeq <= 0) return null;

  let subSeq: number | null = null;
  if (numMatch[2] !== undefined) {
    const parsedSub = parseInt(numMatch[2], 10);
    if (!isNaN(parsedSub) && parsedSub >= 1) {
      subSeq = parsedSub;
    }
  }

  const prefix = getChapelCodePrefix(matchedChapel);
  const baseCode = formatChapelMemberCode(matchedChapel, baseSeq);
  const formatted = formatChapelMemberCode(matchedChapel, baseSeq, subSeq);

  return { prefix, baseSeq, subSeq, baseCode, formatted };
};

/**
 * Parses the base numeric sequence from an existing member code.
 */
export const parseChapelCodeNumber = (code: string | undefined | null, chapelName?: string): number | null => {
  const parts = parseChapelCodeParts(code, chapelName);
  return parts ? parts.baseSeq : null;
};

/**
 * Extracts the root family base code (e.g. "ብከቃሕቤክኤልሻዳይ 0513" from "ብከቃሕቤክኤልሻዳይ 0513/1").
 */
export const getRootFamilyBaseCode = (
  code: string | undefined | null,
  chapelName?: string
): string => {
  const parts = parseChapelCodeParts(code, chapelName);
  return parts ? parts.baseCode : String(code || '').trim();
};

/**
 * Normalizes a member code for reliable lookup/comparison (strips spaces, unifies Amharic homophones).
 */
export const normalizeCodeForLookup = (code: string | undefined | null): string => {
  return normalizeHomophones(String(code || ''));
};

/**
 * Computes the next standalone sequential base code for a given chapel (e.g. 0514).
 */
export const getNextMemberCodeForChapel = (
  members: ChurchMember[] = [],
  chapelName: string
): string => {
  const officialChapel = resolveOfficialChapel(chapelName || '');
  let maxBaseSeq = 0;

  members.forEach((m) => {
    if (resolveOfficialChapel(m.chapel || '') !== officialChapel) return;
    const parts = parseChapelCodeParts(m.memberCode, officialChapel);
    if (parts && parts.baseSeq > maxBaseSeq) {
      maxBaseSeq = parts.baseSeq;
    }
  });

  return formatChapelMemberCode(officialChapel, maxBaseSeq + 1);
};

/**
 * Computes the next hierarchical family branch sub-code ("/1", "/2", "/3", ...)
 * anchored to an existing member or family base code.
 * Example: Anchor "ብከቃሕቤክኤልሻዳይ 0513" -> first dependent "ብከቃሕቤክኤልሻዳይ 0513/1",
 * second dependent (even if added using "... 0513" or "... 0513/1") -> "ብከቃሕቤክኤልሻዳይ 0513/2".
 */
export const getNextFamilySubCode = (
  members: ChurchMember[] = [],
  anchorCodeOrMember: string | ChurchMember,
  preferredChapel?: string | null
): string => {
  const rawAnchorCode =
    typeof anchorCodeOrMember === 'string'
      ? anchorCodeOrMember
      : anchorCodeOrMember.familyCode || anchorCodeOrMember.memberCode || '';

  const anchorChapel =
    typeof anchorCodeOrMember === 'string'
      ? preferredChapel
      : anchorCodeOrMember.chapel || preferredChapel;

  const anchorParts =
    parseChapelCodeParts(rawAnchorCode, anchorChapel || undefined) ||
    (typeof anchorCodeOrMember !== 'string'
      ? parseChapelCodeParts(anchorCodeOrMember.memberCode, anchorChapel || undefined)
      : null);

  const officialChapel = anchorChapel
    ? resolveOfficialChapel(anchorChapel)
    : anchorParts
    ? resolveOfficialChapel(
        DEFAULT_CHAPELS.find((ch) => getChapelCodePrefix(ch) === anchorParts.prefix) || DEFAULT_CHAPELS[0]
      )
    : DEFAULT_CHAPELS[0];

  if (!anchorParts) {
    return getNextMemberCodeForChapel(members, officialChapel);
  }

  const targetBaseSeq = anchorParts.baseSeq;
  let maxSub = 0;

  members.forEach((m) => {
    if (resolveOfficialChapel(m.chapel || '') !== officialChapel) return;
    const mParts = parseChapelCodeParts(m.memberCode, officialChapel);
    if (mParts && mParts.baseSeq === targetBaseSeq && mParts.subSeq !== null && mParts.subSeq > maxSub) {
      maxSub = mParts.subSeq;
    }
  });

  return formatChapelMemberCode(officialChapel, targetBaseSeq, maxSub + 1);
};

/**
 * Finds an existing member (or household head) matching a user-entered code.
 * Supports full code ("ብከቃሕቤክኤልሻዳይ 0513" or "ብከቃሕቤክኤልሻዳይ 0513/1"),
 * spaceless ("ብከቃሕቤክኤልሻዳይ0513/1"), or short number ("0513" / "0513/1") when `preferredChapel` is supplied.
 */
export const findMemberByEnteredCode = (
  members: ChurchMember[] = [],
  enteredCode: string,
  preferredChapel?: string | null
): ChurchMember | null => {
  const raw = String(enteredCode || '').trim();
  if (!raw) return null;

  const normFull = normalizeCodeForLookup(raw);
  const targetOfficialChapel = preferredChapel ? resolveOfficialChapel(preferredChapel) : null;

  // 1. Exact memberCode match
  const exactMember = members.find((m) => {
    if (targetOfficialChapel && resolveOfficialChapel(m.chapel || '') !== targetOfficialChapel) {
      return false;
    }
    return normalizeCodeForLookup(m.memberCode) === normFull;
  });
  if (exactMember) return exactMember;

  // 2. Match by familyCode (preferring the family head whose memberCode equals familyCode)
  const familyMatches = members.filter((m) => {
    if (targetOfficialChapel && resolveOfficialChapel(m.chapel || '') !== targetOfficialChapel) {
      return false;
    }
    return Boolean(m.familyCode) && normalizeCodeForLookup(m.familyCode) === normFull;
  });
  if (familyMatches.length > 0) {
    const head = familyMatches.find(
      (m) => normalizeCodeForLookup(m.memberCode) === normFull
    );
    return head || familyMatches[0];
  }

  // 3. Short number (e.g. "0513", "513", "0513/1", "513/2") with preferredChapel
  const shortMatch = raw.match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
  if (shortMatch && targetOfficialChapel) {
    const baseNum = parseInt(shortMatch[1], 10);
    const subNum = shortMatch[2] ? parseInt(shortMatch[2], 10) : null;
    if (!isNaN(baseNum) && baseNum > 0) {
      const formatted = formatChapelMemberCode(targetOfficialChapel, baseNum, subNum);
      const normFormatted = normalizeCodeForLookup(formatted);
      const byShort = members.find(
        (m) =>
          resolveOfficialChapel(m.chapel || '') === targetOfficialChapel &&
          normalizeCodeForLookup(m.memberCode) === normFormatted
      );
      if (byShort) return byShort;
    }
  }

  return null;
};

/**
 * Ensures every ChurchMember has a valid, unique sequential chapel code
 * (`ብከቃሕቤክ<ቻፕል> 0513` or family sub-code `ብከቃሕቤክ<ቻፕል> 0513/1`),
 * preserves already-assigned valid codes & sub-codes, assigns sub-codes for uncoded members
 * linked via `familyCode`, assigns next sequential base codes for standalone uncoded members,
 * and orders all members by the 10 official chapels, then base sequence, then sub-sequence ascending.
 */
export const assignSequentialCodesAndSortMembers = (
  members: ChurchMember[] = []
): ChurchMember[] => {
  if (!Array.isArray(members) || members.length === 0) return [];

  const buckets = new Map<string, ChurchMember[]>();
  DEFAULT_CHAPELS.forEach((ch) => buckets.set(ch, []));

  members.forEach((m) => {
    const officialChapel = resolveOfficialChapel(m.chapel || '');
    if (!buckets.has(officialChapel)) {
      buckets.set(officialChapel, []);
    }
    buckets.get(officialChapel)!.push({
      ...m,
      chapel: officialChapel
    });
  });

  const sortedAndCoded: ChurchMember[] = [];

  DEFAULT_CHAPELS.forEach((chapel) => {
    const list = buckets.get(chapel) || [];
    if (list.length === 0) return;

    const usedCodeKeys = new Set<string>();
    const maxSubByBase = new Map<number, number>();
    let maxBaseSeq = 0;

    // Pass 1: Keep all valid, unique existing codes (including /1, /2 family sub-codes)
    const firstPass = list.map((m) => {
      const parts = parseChapelCodeParts(m.memberCode, chapel);
      if (parts) {
        const key = `${parts.baseSeq}/${parts.subSeq ?? 0}`;
        if (!usedCodeKeys.has(key)) {
          usedCodeKeys.add(key);
          if (parts.baseSeq > maxBaseSeq) maxBaseSeq = parts.baseSeq;
          const prevSub = maxSubByBase.get(parts.baseSeq) ?? 0;
          if ((parts.subSeq ?? 0) > prevSub) {
            maxSubByBase.set(parts.baseSeq, parts.subSeq ?? 0);
          }
          // Normalize familyCode to root baseCode when it belongs to this chapel
          const famParts = m.familyCode ? parseChapelCodeParts(m.familyCode, chapel) : null;
          return {
            member: {
              ...m,
              memberCode: parts.formatted,
              familyCode: famParts ? famParts.baseCode : m.familyCode
            },
            baseSeq: parts.baseSeq,
            subSeq: parts.subSeq
          };
        }
      }
      return { member: m, baseSeq: null as number | null, subSeq: null as number | null };
    });

    // Pass 2: Assign sub-codes for uncoded members with valid familyCode, or new base codes for standalone members
    const completed = firstPass.map((entry) => {
      if (entry.baseSeq !== null) return entry;

      const famParts = entry.member.familyCode
        ? parseChapelCodeParts(entry.member.familyCode, chapel)
        : null;

      if (famParts) {
        const targetBase = famParts.baseSeq;
        if (targetBase > maxBaseSeq) maxBaseSeq = targetBase;

        // If base itself isn't taken yet, assign base; otherwise assign next subSeq (/1, /2, ...)
        let nextSub = (maxSubByBase.get(targetBase) ?? 0) + 1;
        while (usedCodeKeys.has(`${targetBase}/${nextSub}`)) {
          nextSub += 1;
        }
        usedCodeKeys.add(`${targetBase}/${nextSub}`);
        maxSubByBase.set(targetBase, nextSub);

        return {
          member: {
            ...entry.member,
            familyCode: famParts.baseCode,
            memberCode: formatChapelMemberCode(chapel, targetBase, nextSub)
          },
          baseSeq: targetBase,
          subSeq: nextSub
        };
      }

      maxBaseSeq += 1;
      while (usedCodeKeys.has(`${maxBaseSeq}/0`)) {
        maxBaseSeq += 1;
      }
      usedCodeKeys.add(`${maxBaseSeq}/0`);

      return {
        member: {
          ...entry.member,
          memberCode: formatChapelMemberCode(chapel, maxBaseSeq)
        },
        baseSeq: maxBaseSeq,
        subSeq: null as number | null
      };
    });

    // Sort within chapel by base sequence ascending, then sub-sequence ascending (head -> /1 -> /2 -> ...)
    completed.sort((a, b) => {
      const baseDiff = (a.baseSeq || 0) - (b.baseSeq || 0);
      if (baseDiff !== 0) return baseDiff;
      return (a.subSeq ?? 0) - (b.subSeq ?? 0);
    });

    completed.forEach((entry) => sortedAndCoded.push(entry.member));
  });

  return sortedAndCoded;
};

/**
 * Checks whether a churchMembers array needs code assignment or chapel-sequence sorting.
 */
export const membersNeedCodeOrOrderSync = (members: ChurchMember[] = []): boolean => {
  if (!Array.isArray(members) || members.length === 0) return false;

  const seenKeys = new Set<string>();
  let prevChapelIdx = -1;
  let prevBaseSeq = 0;
  let prevSubSeq = 0;

  for (const m of members) {
    const official = resolveOfficialChapel(m.chapel || '');
    if (m.chapel !== official) return true;

    const parts = parseChapelCodeParts(m.memberCode, official);
    if (!parts) return true;

    if (m.memberCode !== parts.formatted) return true;

    const uniqKey = `${official}|${parts.baseSeq}/${parts.subSeq ?? 0}`;
    if (seenKeys.has(uniqKey)) return true;
    seenKeys.add(uniqKey);

    const chIdx = DEFAULT_CHAPELS.indexOf(official);
    const curSub = parts.subSeq ?? 0;

    if (chIdx < prevChapelIdx) return true;
    if (chIdx === prevChapelIdx) {
      if (parts.baseSeq < prevBaseSeq) return true;
      if (parts.baseSeq === prevBaseSeq && curSub < prevSubSeq) return true;
    }

    prevChapelIdx = chIdx;
    prevBaseSeq = parts.baseSeq;
    prevSubSeq = curSub;
  }

  return false;
};
