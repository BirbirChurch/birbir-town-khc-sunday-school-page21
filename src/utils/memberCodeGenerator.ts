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

/**
 * Formats a chapel code with 4-digit zero padding (e.g., "ብከቃሕቤክኤልሮኢ 0001").
 */
export const formatChapelMemberCode = (chapelName: string, sequenceNum: number): string => {
  const prefix = getChapelCodePrefix(chapelName);
  const safeNum = Math.max(1, Math.floor(sequenceNum));
  const padded = String(safeNum).padStart(4, '0');
  return `${prefix} ${padded}`;
};

/**
 * Parses the numeric sequence from an existing member code if it belongs to the given chapel prefix.
 * Returns null if the code does not match the chapel prefix or lacks a positive integer suffix.
 */
export const parseChapelCodeNumber = (code: string | undefined | null, chapelName?: string): number | null => {
  const clean = String(code || '').trim();
  if (!clean) return null;

  if (chapelName) {
    const expectedPrefix = getChapelCodePrefix(chapelName);
    if (!normalizeHomophones(clean).startsWith(normalizeHomophones(expectedPrefix))) {
      return null;
    }
  }

  const numMatch = clean.match(/(\d+)\s*$/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);
  if (isNaN(num) || num <= 0) return null;
  return num;
};

/**
 * Normalizes a member code for reliable lookup/comparison (strips spaces, unifies Amharic homophones).
 */
export const normalizeCodeForLookup = (code: string | undefined | null): string => {
  return normalizeHomophones(String(code || ''));
};

/**
 * Computes the next sequential code for a given chapel based on existing members.
 */
export const getNextMemberCodeForChapel = (
  members: ChurchMember[] = [],
  chapelName: string
): string => {
  const officialChapel = resolveOfficialChapel(chapelName || '');
  let maxSeq = 0;

  members.forEach((m) => {
    if (resolveOfficialChapel(m.chapel || '') !== officialChapel) return;
    const seq = parseChapelCodeNumber(m.memberCode, officialChapel);
    if (seq !== null && seq > maxSeq) {
      maxSeq = seq;
    }
  });

  return formatChapelMemberCode(officialChapel, maxSeq + 1);
};

/**
 * Finds an existing member (or household head) matching a user-entered code.
 * Supports full code ("ብከቃሕቤክኤልሮኢ 0001"), spaceless ("ብከቃሕቤክኤልሮኢ0001"),
 * or short number ("0001" / "1") when `preferredChapel` is supplied.
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

  // 2. Match by familyCode if exact memberCode wasn't matched
  const familyMatch = members.find((m) => {
    if (targetOfficialChapel && resolveOfficialChapel(m.chapel || '') !== targetOfficialChapel) {
      return false;
    }
    return Boolean(m.familyCode) && normalizeCodeForLookup(m.familyCode) === normFull;
  });
  if (familyMatch) return familyMatch;

  // 3. If user typed just a number like "0001" or "12" with a preferred chapel
  if (/^\d+$/.test(raw) && targetOfficialChapel) {
    const formatted = formatChapelMemberCode(targetOfficialChapel, parseInt(raw, 10));
    const normFormatted = normalizeCodeForLookup(formatted);
    const byShortNum = members.find(
      (m) =>
        resolveOfficialChapel(m.chapel || '') === targetOfficialChapel &&
        normalizeCodeForLookup(m.memberCode) === normFormatted
    );
    if (byShortNum) return byShortNum;
  }

  return null;
};

/**
 * Ensures every ChurchMember has a valid, unique sequential chapel code (`ብከቃሕቤክ<ቻፕል> 0001`),
 * preserves already-assigned valid codes, fills any uncoded members with the next sequential code
 * for their chapel, and orders all members sequentially by the 10 official chapels and code number.
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

    const usedSeqNumbers = new Set<number>();
    let maxSeq = 0;

    // Pass 1: Keep valid, unique existing codes belonging to this chapel
    const firstPass = list.map((m) => {
      const existingSeq = parseChapelCodeNumber(m.memberCode, chapel);
      if (existingSeq !== null && !usedSeqNumbers.has(existingSeq)) {
        usedSeqNumbers.add(existingSeq);
        if (existingSeq > maxSeq) maxSeq = existingSeq;
        return {
          member: {
            ...m,
            memberCode: formatChapelMemberCode(chapel, existingSeq)
          },
          seq: existingSeq
        };
      }
      return { member: m, seq: null as number | null };
    });

    // Pass 2: Assign next sequential numbers to uncoded (or duplicate) members
    const completed = firstPass.map((entry) => {
      if (entry.seq !== null) return entry;
      maxSeq += 1;
      while (usedSeqNumbers.has(maxSeq)) {
        maxSeq += 1;
      }
      usedSeqNumbers.add(maxSeq);
      return {
        member: {
          ...entry.member,
          memberCode: formatChapelMemberCode(chapel, maxSeq)
        },
        seq: maxSeq
      };
    });

    // Sort within chapel by sequential code number ascending
    completed.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    completed.forEach((entry) => sortedAndCoded.push(entry.member));
  });

  return sortedAndCoded;
};

/**
 * Checks whether a churchMembers array needs code assignment or chapel-sequence sorting.
 */
export const membersNeedCodeOrOrderSync = (members: ChurchMember[] = []): boolean => {
  if (!Array.isArray(members) || members.length === 0) return false;

  const seenCodes = new Set<string>();
  let prevChapelIdx = -1;
  let prevSeq = 0;

  for (const m of members) {
    const official = resolveOfficialChapel(m.chapel || '');
    if (m.chapel !== official) return true;

    const seq = parseChapelCodeNumber(m.memberCode, official);
    if (seq === null) return true;

    const expectedFormatted = formatChapelMemberCode(official, seq);
    if (m.memberCode !== expectedFormatted) return true;

    if (seenCodes.has(expectedFormatted)) return true;
    seenCodes.add(expectedFormatted);

    const chIdx = DEFAULT_CHAPELS.indexOf(official);
    if (chIdx < prevChapelIdx) return true;
    if (chIdx === prevChapelIdx && seq < prevSeq) return true;

    prevChapelIdx = chIdx;
    prevSeq = seq;
  }

  return false;
};
