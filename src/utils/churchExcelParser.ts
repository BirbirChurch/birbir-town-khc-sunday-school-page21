import * as XLSX from 'xlsx';
import { ChurchChild, ChurchMember } from '../types';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { generateUniqueId } from './idGenerator';
import { assignSequentialCodesAndSortMembers } from './memberCodeGenerator';
import { transliterateAmharicToEnglish } from './amharicTransliterator';

/**
 * Comprehensive Amharic text & homophone normalization for accurate search and matching.
 * Normalizes ሀ/ሐ/ኀ, ሰ/ሠ, አ/ዐ, ጸ/ፀ across all 7 orders + punctuation/spaces.
 */
export const normalizeAmharicSearchText = (text: string | number | undefined | null): string => {
  if (text === undefined || text === null) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()[\]"'’`\u1360-\u137C]/g, ' ')
    .replace(/\s+/g, ' ')
    // ሀ / ሐ / ኀ orders (unifying 1st & 4th order ha-sounds: ሀ/ሃ/ሐ/ሓ/ኀ/ኃ -> ሀ)
    .replace(/[ሀሃሐሓኀኃ]/g, 'ሀ')
    .replace(/[ሑኁ]/g, 'ሁ')
    .replace(/[ሒኂ]/g, 'ሂ')
    .replace(/[ሔኄ]/g, 'ሄ')
    .replace(/[ሕኅ]/g, 'ህ')
    .replace(/[ሖኆ]/g, 'ሆ')
    // ሰ / ሠ orders
    .replace(/ሠ/g, 'ሰ')
    .replace(/ሡ/g, 'ሱ')
    .replace(/ሢ/g, 'ሲ')
    .replace(/ሣ/g, 'ሳ')
    .replace(/ሤ/g, 'ሴ')
    .replace(/ሥ/g, 'ስ')
    .replace(/ሦ/g, 'ሶ')
    // አ / ዐ orders (unifying 1st & 4th order a-sounds: አ/ኣ/ዐ/ዓ -> አ, ኤ/ዔ -> ኤ)
    .replace(/[አኣዐዓ]/g, 'አ')
    .replace(/ዑ/g, 'ኡ')
    .replace(/ዒ/g, 'ኢ')
    .replace(/[ዔ]/g, 'ኤ')
    .replace(/ዕ/g, 'እ')
    .replace(/ዖ/g, 'ኦ')
    // ጸ / ፀ orders
    .replace(/ፀ/g, 'ጸ')
    .replace(/ፁ/g, 'ጹ')
    .replace(/ፂ/g, 'ጺ')
    .replace(/ፃ/g, 'ጻ')
    .replace(/ፄ/g, 'ጼ')
    .replace(/ፅ/g, 'ጽ')
    .replace(/ፆ/g, 'ጾ')
    .trim();
};

/**
 * Token-based Amharic & Phone search matcher:
 * - Normalizes Amharic homophones so searching "ጸጋየ" matches "ፀጋዬ" and "ሀይሉ" matches "ኃይሉ"
 * - Splits multi-word queries so searching "አበበ ከበደ" finds "አበበ ተስፋዬ ከበደ"
 * - Strips phone separators/country prefixes so searching "0911" or "91122" matches "+251 911-223344"
 */
export const matchesAmharicSearch = (
  query: string,
  ...fields: Array<string | number | undefined | null>
): boolean => {
  const normQuery = normalizeAmharicSearchText(query);
  if (!normQuery) return true;

  const tokens = normQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) return true;

  const rawJoined = fields
    .filter((f) => f !== undefined && f !== null && String(f).trim() !== '')
    .map((f) => String(f))
    .join(' ');

  if (!rawJoined) return false;

  const normHaystack = normalizeAmharicSearchText(rawJoined);
  // Compact digits for flexible phone searching (handles spaces, hyphens, +251)
  const compactDigits = rawJoined.replace(/[\s\-().+]/g, '');
  // Lazy Latin phonetic transliteration cache when query contains English letters
  let latinHaystackLower: string | null = null;

  return tokens.every((tok) => {
    if (normHaystack.includes(tok)) return true;
    if (/[a-z]/.test(tok)) {
      if (latinHaystackLower === null) {
        latinHaystackLower = transliterateAmharicToEnglish(rawJoined).toLowerCase();
      }
      if (latinHaystackLower.includes(tok)) return true;
    }
    const tokDigits = tok.replace(/[\s\-().+]/g, '');
    if (tokDigits.length >= 3 && /^\d+$/.test(tokDigits)) {
      const asLocalZero = tokDigits.startsWith('251') ? '0' + tokDigits.slice(3) : tokDigits;
      const asIntl251 = tokDigits.startsWith('0') ? '251' + tokDigits.slice(1) : tokDigits;
      const noLeadZero = tokDigits.startsWith('0') ? tokDigits.slice(1) : tokDigits;
      return (
        compactDigits.includes(tokDigits) ||
        compactDigits.includes(asLocalZero) ||
        compactDigits.includes(asIntl251) ||
        (noLeadZero.length >= 3 && compactDigits.includes(noLeadZero))
      );
    }
    return false;
  });
};

/**
 * Normalization helper for Excel column header recognition
 */
export const normalizeExcelHeader = (str: string): string => {
  return (str || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[ዐዓዑዒዔዕዖ]/g, (c) => {
      const map: Record<string, string> = {
        ዐ: 'አ',
        ዓ: 'አ',
        ዑ: 'ኡ',
        ዒ: 'ኢ',
        ዔ: 'ኤ',
        ዕ: 'እ',
        ዖ: 'ኦ'
      };
      return map[c] || 'አ';
    })
    .replace(/[ሐኀኃ]/g, 'ሀ')
    .replace(/ሠ/g, 'ሰ')
    .replace(/[ፀፅ]/g, 'ጸ')
    .replace(/ፆ/g, 'ጾ');
};

/**
 * Strict mapping of any Amharic or English sheet/column name to ONLY the 10 official chapels
 */
export const mapToOfficialChapelStrict = (rawInput: string, sheetIndex?: number): string => {
  const str = String(rawInput || '').trim().toLowerCase().replace(/[\s\-_]+/g, '');

  if (
    str.includes('elroi') || str.includes('elrohe') || str.includes('elro') ||
    str.includes('ኤልሮኢ') || str.includes('ኤልሮይ') || str.includes('ሮኢ')
  ) return DEFAULT_CHAPELS[0];

  if (
    str.includes('shalom') || str.includes('shaloam') || str.includes('salom') ||
    str.includes('ሻሎም') || str.includes('ሳሎም')
  ) return DEFAULT_CHAPELS[1];

  if (
    str.includes('bethel') || str.includes('betel') ||
    str.includes('ቤቴል') || str.includes('በቴል') || str.includes('ቤትኤል')
  ) return DEFAULT_CHAPELS[2];

  if (
    str.includes('yahweh') || str.includes('yahwe') || str.includes('yahuweh') ||
    str.includes('yahve') || str.includes('yahveh') || str.includes('jah') ||
    str.includes('ያህዌ') || str.includes('ያህዌህ') || str.includes('ያህወ')
  ) return DEFAULT_CHAPELS[3];

  if (
    str.includes('eden') || str.includes('edan') ||
    str.includes('ኤዴን') || str.includes('ኤደን') || str.includes('ኤዲን')
  ) return DEFAULT_CHAPELS[4];

  if (
    str.includes('ebenezer') || str.includes('abenezer') || str.includes('ebnezer') ||
    str.includes('አቤንኤዘር') || str.includes('አበንኤዘር') || str.includes('እቤንኤዘር') || str.includes('አቤኔዘር')
  ) return DEFAULT_CHAPELS[5];

  if (
    str.includes('rehoboth') || str.includes('rehobot') || str.includes('rohoboth') ||
    str.includes('rohobot') || str.includes('rehaboth') || str.includes('rehabot') ||
    str.includes('ርኆቦት') || str.includes('ርሆቦት') || str.includes('ርህቦት') || str.includes('ርኮቦት')
  ) return DEFAULT_CHAPELS[6];

  if (
    str.includes('elshaddai') || str.includes('elshaday') || str.includes('elshadday') ||
    str.includes('shaddai') || str.includes('shaday') ||
    str.includes('ኤልሻዳይ') || str.includes('ሻዳይ')
  ) return DEFAULT_CHAPELS[7];

  if (
    str.includes('ruhama') || str.includes('ruhamah') || str.includes('ruhamaa') ||
    str.includes('ruhamma') || str.includes('ruham') ||
    str.includes('ሩሐማ') || str.includes('ሩሃማ') || str.includes('ሩሀማ')
  ) return DEFAULT_CHAPELS[8];

  if (
    str.includes('adonai') || str.includes('adonay') || str.includes('adonaiy') ||
    str.includes('አዶናይ') || str.includes('አደናይ')
  ) return DEFAULT_CHAPELS[9];

  if (/\b10\b/.test(str) || str.endsWith('10') || str.includes('sheet10')) return DEFAULT_CHAPELS[9];
  if (/\b1\b/.test(str) || str.endsWith('1') || str.includes('sheet1')) return DEFAULT_CHAPELS[0];
  if (/\b2\b/.test(str) || str.endsWith('2') || str.includes('sheet2')) return DEFAULT_CHAPELS[1];
  if (/\b3\b/.test(str) || str.endsWith('3') || str.includes('sheet3')) return DEFAULT_CHAPELS[2];
  if (/\b4\b/.test(str) || str.endsWith('4') || str.includes('sheet4')) return DEFAULT_CHAPELS[3];
  if (/\b5\b/.test(str) || str.endsWith('5') || str.includes('sheet5')) return DEFAULT_CHAPELS[4];
  if (/\b6\b/.test(str) || str.endsWith('6') || str.includes('sheet6')) return DEFAULT_CHAPELS[5];
  if (/\b7\b/.test(str) || str.endsWith('7') || str.includes('sheet7')) return DEFAULT_CHAPELS[6];
  if (/\b8\b/.test(str) || str.endsWith('8') || str.includes('sheet8')) return DEFAULT_CHAPELS[7];
  if (/\b9\b/.test(str) || str.endsWith('9') || str.includes('sheet9')) return DEFAULT_CHAPELS[8];

  if (typeof sheetIndex === 'number' && sheetIndex >= 0 && sheetIndex < DEFAULT_CHAPELS.length) {
    return DEFAULT_CHAPELS[sheetIndex];
  }

  return DEFAULT_CHAPELS[0];
};

/**
 * Extracts and normalizes ALL Ethiopian phone numbers (09..., 07..., +251..., 9xxxxxxxx, landlines 0xx...)
 * from any cell value (numbers, strings with labels, multiple numbers separated by /, comma, space, newline).
 */
export const extractNormalizedPhones = (raw: any): string | undefined => {
  if (raw === undefined || raw === null || raw === '') return undefined;

  let text = '';
  if (typeof raw === 'number') {
    if (!isFinite(raw) || raw <= 0) return undefined;
    // Preserve full digits even for large phone numbers (e.g. 911223344 or 251911223344)
    text = Math.round(raw).toString();
  } else {
    text = String(raw).trim();
  }

  if (!text) return undefined;

  // Handle decimal trailing ".0" from numeric strings
  text = text.replace(/\.0+\b/g, '');

  // Split candidate phone segments by common separators (/, \, ,, ;, &, newline)
  const segments = text.split(/[/\\,;&\n|]+/);
  const found: string[] = [];

  const normalizeCandidateDigits = (digitsInput: string): string | null => {
    let d = digitsInput.replace(/[^\d]/g, '');
    if (!d) return null;

    if (d.startsWith('00251')) d = '0' + d.slice(5);
    else if (d.startsWith('251') && d.length >= 12) d = '0' + d.slice(3);
    else if (d.length === 9 && (d.startsWith('9') || d.startsWith('7'))) d = '0' + d;
    // Ethiopian mobile: 09xxxxxxxx or 07xxxxxxxx (10 digits), landline: 011/046/... (10 digits)
    if (/^0[97]\d{8}$/.test(d)) return d;
    if (/^0[1-6]\d{8}$/.test(d)) return d;
    return null;
  };

  for (const seg of segments) {
    // Strip spaces, dashes, en-dash, em-dash, dots, parens, plus
    const cleaned = seg.replace(/[\s\-–—.()+]/g, '');
    const direct = normalizeCandidateDigits(cleaned);
    if (direct) {
      if (!found.includes(direct)) found.push(direct);
      continue;
    }

    // Extract embedded Ethiopian phone sequences inside mixed text (e.g. "አባት: 0911-22-33-44")
    const compactedForScan = seg.replace(/[\s\-–—.()]/g, '');
    const regex = /(?:\+?251|00251|0)?(?:[97]\d{8}|[1-6]\d{8})/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(compactedForScan)) !== null) {
      const normalized = normalizeCandidateDigits(m[0]);
      if (normalized && !found.includes(normalized)) {
        found.push(normalized);
      }
    }
  }

  if (found.length === 0) return undefined;
  return found.join(' / ');
};

/**
 * Reads a SheetJS worksheet into a 2D array while:
 * 1) Repairing/extending truncated `!ref` ranges so NO rows/columns at the bottom or right are clipped
 * 2) Avoiding Excel narrow-column `###` / `9.11E+08` phone truncation by inspecting raw `cell.v` on large numeric cells
 * 3) Expanding vertical `!merges` (`c1 === c2`) so vertically merged Family No, Phone, Parent, Residence, Chapel
 *    values are populated on EVERY child/member row of that household!
 */
export const worksheetToCleanRowsWithMerges = (worksheet: XLSX.WorkSheet): any[][] => {
  if (!worksheet) return [];

  let maxR = 0;
  let maxC = 0;

  if (worksheet['!ref']) {
    try {
      const refRange = XLSX.utils.decode_range(worksheet['!ref']);
      maxR = Math.max(maxR, refRange.e.r);
      maxC = Math.max(maxC, refRange.e.c);
    } catch {}
  }

  Object.keys(worksheet).forEach((coord) => {
    if (coord[0] === '!') return;
    try {
      const decoded = XLSX.utils.decode_cell(coord);
      if (decoded.r > maxR) maxR = decoded.r;
      if (decoded.c > maxC) maxC = decoded.c;
    } catch {}
  });

  if (maxR < 0 || maxC < 0) return [];

  // Re-encode repaired !ref
  try {
    worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
  } catch {}

  const numCols = maxC + 1;
  const rows: any[][] = Array.from({ length: maxR + 1 }, () => new Array(numCols).fill(''));

  const extractCellValue = (cell: XLSX.CellObject | undefined): any => {
    if (!cell) return '';
    if (cell.v === undefined || cell.v === null) {
      return cell.w ? String(cell.w).trim() : '';
    }
    if (cell.t === 'd' && cell.v instanceof Date) {
      return cell.v;
    }
    if (cell.t === 'n' && typeof cell.v === 'number') {
      // Preserve formatted display string if it looks like a date OR leading-zero phone (e.g. "0911223344")
      const w = cell.w ? String(cell.w).trim() : '';
      if (w && !w.includes('#') && !/[eE][+-]?\d+/.test(w)) {
        // Date strings like "12/05/2014" or "2015-01-01"
        if (/[\/\-]/.test(w)) return w;
        // Phone with leading zero preserved by Excel number format (e.g. "0911223344")
        if (/^0[1-9]\d{8}$/.test(w.replace(/[\s\-]/g, ''))) return w;
      }
      // Large integer (such as phone number >= 100,000,000) -> return exact integer, never "###" or "9.11E+08"
      if (cell.v >= 100000000) {
        return Math.round(cell.v).toString();
      }
      return cell.v;
    }
    return String(cell.v).trim();
  };

  for (let r = 0; r <= maxR; r++) {
    for (let c = 0; c <= maxC; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr] as XLSX.CellObject | undefined;
      if (cell) {
        rows[r][c] = extractCellValue(cell);
      }
    }
  }

  // Expand vertical merged cell ranges (c1 === c2) so merged family phones/parents/chapels/residences propagate to all family rows
  const merges: XLSX.Range[] = Array.isArray(worksheet['!merges']) ? worksheet['!merges'] : [];
  merges.forEach((m) => {
    if (!m || !m.s || !m.e) return;
    if (m.e.r > m.s.r && m.s.c === m.e.c) {
      const topVal = rows[m.s.r]?.[m.s.c];
      if (topVal !== undefined && topVal !== null && String(topVal).trim() !== '') {
        for (let r = m.s.r + 1; r <= Math.min(m.e.r, maxR); r++) {
          if (rows[r] && (rows[r][m.s.c] === '' || rows[r][m.s.c] === undefined || rows[r][m.s.c] === null)) {
            rows[r][m.s.c] = topVal;
          }
        }
      }
    }
  });

  return rows;
};

export interface DetectedSheetColumns {
  headerIdx: number;
  headerCols: { index: number; label: string }[];
  seqIdx: number;
  nameIdx: number;
  fatherIdx: number;
  grandfatherIdx: number;
  genderIdx: number;
  ageIdx: number;
  chapelIdx: number;
  codeIdx: number;
  familyCodeIdx: number;
  educationIdx: number;
  occupationIdx: number;
  relationIdx: number;
  parentIdx: number;
  phoneIdxs: number[];
  phoneIdx: number;
  residenceIdxs: number[];
  residenceIdx: number;
  baptizedIdx: number;
  lordsSupperIdx: number;
  titheIdx: number;
}

export const detectChurchSheetColumns = (
  rawRows: any[][],
  parseAgeFn: (val: any, refYear?: number, mode?: 'auto' | 'direct' | 'birthyear') => { age: number; isChild: boolean },
  refYear = 2018,
  ageMode: 'auto' | 'direct' | 'birthyear' = 'auto'
): DetectedSheetColumns => {
  let headerIdx = -1;
  let highestScore = 0;

  for (let r = 0; r < Math.min(25, rawRows.length); r++) {
    const row = rawRows[r] || [];
    let score = 0;
    let nonEmptyCount = 0;

    row.forEach((col: any) => {
      const sRaw = String(col || '').trim();
      if (sRaw) nonEmptyCount++;
      const str = normalizeExcelHeader(sRaw);
      if (!str) return;
      if (str.includes('ስም') || str.includes('name')) score += 3;
      if (str.includes('ጾታ') || str.includes('gender') || str.includes('sex') || str === 'ወ/ሴ' || str === 'm/f') score += 2;
      if (str.includes('እድሜ') || str.includes('እ/ሜ') || str.includes('age') || str.includes('ልደት') || str.includes('ትውልድ') || str.includes('ተወለደ')) score += 2;
      if (str.includes('ስልክ') || str.includes('ስ/ቁ') || str.includes('ስ.ቁ') || str.includes('ሞባይል') || str.includes('phone') || str.includes('mobile') || str.includes('tel') || str.includes('cell') || str.includes('contact')) score += 2;
      if (str.includes('ተ.ቁ') || str.includes('ተ/ቁ') || str === 'no' || str === 'no.' || str === '#') score += 1;
      if (str.includes('ቻፕል') || str.includes('chapel') || str.includes('አጥቢያ')) score += 1;
      if (str.includes('ቀበሌ') || str.includes('መንደር') || str.includes('residence')) score += 1;
      if (str.includes('ትምህርት') || str.includes('ደረጃ') || str.includes('grade') || str.includes('education')) score += 1;
      if (str.includes('ስራ') || str.includes('occupation') || str.includes('job') || str.includes('ሙያ')) score += 1;
      if (str.includes('ዝምድና') || str.includes('ግንኙነት') || str.includes('relation')) score += 1;
    });

    if (nonEmptyCount >= 2 && score > highestScore) {
      highestScore = score;
      headerIdx = r;
    }
  }

  if (highestScore < 2) {
    headerIdx = 0;
  }

  let seqIdx = -1;
  let nameIdx = -1;
  let fatherIdx = -1;
  let grandfatherIdx = -1;
  let genderIdx = -1;
  let ageIdx = -1;
  let chapelIdx = -1;
  let codeIdx = -1;
  let familyCodeIdx = -1;
  let educationIdx = -1;
  let occupationIdx = -1;
  let relationIdx = -1;
  let parentIdx = -1;
  const phoneIdxs: number[] = [];
  const residenceIdxs: number[] = [];
  let baptizedIdx = -1;
  let lordsSupperIdx = -1;
  let titheIdx = -1;

  const headerRow = headerIdx >= 0 ? rawRows[headerIdx] || [] : [];
  const maxCols = rawRows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), headerRow.length);

  const headerCols = Array.from({ length: maxCols }, (_, idx) => ({
    index: idx,
    label: String(headerRow[idx] || `አምድ ${idx + 1}`).trim()
  }));

  headerRow.forEach((col: any, idx: number) => {
    const str = normalizeExcelHeader(String(col || ''));
    if (!str) return;

    // Family / Serial Number (exclude explicit memberCode / familyCode columns)
    if (
      (str === 'ተ.ቁ' || str === 'ተ/ቁ' || str === 'ተቁ' ||
       str === 'no' || str === 'no.' || str === '#' ||
       str.includes('የቤተሰብቁጥር') || str.includes('familyno') || str.includes('hhid') ||
       (str.includes('መለያ') && !str.includes('ኮድ'))) &&
      !str.includes('ኮድ') && !str.includes('code')
    ) {
      if (seqIdx === -1) seqIdx = idx;
    }

    // Name column (excludes parent/father/mother/grandfather specific columns)
    if (
      (str.includes('ስም') || str.includes('name') || str.includes('ሙሉስም') || str.includes('fullname')) &&
      !str.includes('ወላጅ') && !str.includes('አባት') && !str.includes('እናት') && !str.includes('አያት') &&
      !str.includes('አሳዳጊ') && !str.includes('መሪ') &&
      !str.includes('parent') && !str.includes('father') && !str.includes('mother') && !str.includes('guardian')
    ) {
      if (nameIdx === -1) nameIdx = idx;
    }

    if ((str.includes('አባት') || str.includes('father')) && !str.includes('ወላጅ') && !str.includes('parent') && !str.includes('ስልክ')) {
      if (fatherIdx === -1) fatherIdx = idx;
    }
    if ((str.includes('አያት') || str.includes('grandfather')) && !str.includes('ስልክ')) {
      if (grandfatherIdx === -1) grandfatherIdx = idx;
    }

    if (str.includes('ጾታ') || str.includes('gender') || str.includes('sex') || str === 'ወ/ሴ' || str === 'm/f' || str === 'ወንድ/ሴት') {
      if (genderIdx === -1) genderIdx = idx;
    }

    if (
      str.includes('እድሜ') || str.includes('እ/ሜ') || str.includes('age') ||
      str.includes('ልደት') || str.includes('ትውልድ') || str.includes('ተወለደ') ||
      str.includes('dob') || str.includes('birth') || str.includes('yr')
    ) {
      if (ageIdx === -1) ageIdx = idx;
    }

    if (str.includes('ትምህርት') || str.includes('education') || str.includes('ደረጃ') || str.includes('grade') || str.includes('የት/ደረጃ')) {
      if (educationIdx === -1) educationIdx = idx;
    }

    if (str.includes('ስራ') || str.includes('occupation') || str.includes('ሙያ') || str.includes('job') || str.includes('profession')) {
      if (occupationIdx === -1) occupationIdx = idx;
    }

    if (
      str.includes('ቻፕል') || str.includes('chapel') || str.includes('አጥቢያ') ||
      str.includes('ማእከል') || str.includes('ቅርንጫፍ') || str.includes('branch')
    ) {
      if (chapelIdx === -1) chapelIdx = idx;
    }

    if (str.includes('የቤተሰብኮድ') || str.includes('familycode')) {
      if (familyCodeIdx === -1) familyCodeIdx = idx;
    } else if (
      (str.includes('መለያኮድ') || str === 'ኮድ' || str === 'code' || str === 'membercode' || str.includes('የአባልኮድ')) &&
      !str.includes('ተ.ቁ') && !str.includes('ተ/ቁ')
    ) {
      if (codeIdx === -1) codeIdx = idx;
    }

    if (
      str.includes('ዝምድና') || str.includes('ግንኙነት') || str.includes('ድርሻ') ||
      str.includes('relation') || str.includes('role') || str.includes('familyrole')
    ) {
      if (relationIdx === -1) relationIdx = idx;
    }

    if (
      (str.includes('ወላጅ') || str.includes('አሳዳጊ') || str.includes('የቤተሰብመሪ') || str.includes('የቤተሰብሃላፊ') ||
       str.includes('አባወራ') || str.includes('እማወራ') || str.includes('parent') || str.includes('guardian') || str.includes('head')) &&
      !str.includes('ስልክ') && !str.includes('phone') && !str.includes('tel') && !str.includes('mobile')
    ) {
      if (parentIdx === -1) parentIdx = idx;
    }

    if (
      (str.includes('ስልክ') || str.includes('ስ/ቁ') || str.includes('ስ.ቁ') || str.includes('ሞባይል') ||
       str.includes('phone') || str.includes('mobile') || str.includes('tel') || str.includes('cell') || str.includes('contact')) &&
      !str.includes('ተ.ቁ') && !str.includes('ተ/ቁ') && !str.includes('ተቁ')
    ) {
      if (!phoneIdxs.includes(idx)) phoneIdxs.push(idx);
    }

    if (
      str.includes('ቀበሌ') || str.includes('መንደር') || str.includes('መኖሪያ') || str.includes('ህብረት') ||
      str.includes('ሰፈር') || str.includes('residence') || str.includes('አድራሻ') || str.includes('village')
    ) {
      if (!residenceIdxs.includes(idx)) residenceIdxs.push(idx);
    }

    if (
      str.includes('ጥምቀት') || str.includes('ተጠምቅ') || str.includes('የተጠመቅ') ||
      str.includes('ተጠመቀ') || str.includes('bapti')
    ) {
      if (baptizedIdx === -1) baptizedIdx = idx;
    }

    if (
      str.includes('ጌታእራት') || str.includes('የጌታእራት') || str.includes('ቁርባን') ||
      str.includes('supper') || str.includes('communion') || str.includes('eucharist')
    ) {
      if (lordsSupperIdx === -1) lordsSupperIdx = idx;
    }

    if (
      str.includes('አስራት') || str.includes('ዐስራት') || str.includes('tith')
    ) {
      if (titheIdx === -1) titheIdx = idx;
    }
  });

  const sampleStart = headerIdx + 1;
  const sampleEnd = Math.min(rawRows.length, sampleStart + 35);

  // Content-based fallbacks across ALL columns
  if (nameIdx === -1) {
    for (let c = 0; c < maxCols; c++) {
      if (c === seqIdx || phoneIdxs.includes(c)) continue;
      let textCount = 0;
      for (let r = sampleStart; r < sampleEnd; r++) {
        const cell = String(rawRows[r]?.[c] || '').trim();
        if (cell && cell.length > 3 && isNaN(Number(cell)) && !extractNormalizedPhones(cell)) {
          textCount++;
        }
      }
      if (textCount >= 3) {
        nameIdx = c;
        break;
      }
    }
    if (nameIdx === -1) nameIdx = Math.min(1, Math.max(0, maxCols - 1));
  }

  if (genderIdx === -1) {
    for (let c = 0; c < maxCols; c++) {
      if (c === nameIdx || c === seqIdx) continue;
      let genderMatch = 0;
      for (let r = sampleStart; r < sampleEnd; r++) {
        const cell = String(rawRows[r]?.[c] || '').trim().toLowerCase();
        if (cell === 'ወ' || cell === 'ሴ' || cell === 'm' || cell === 'f' || cell === 'ወንድ' || cell === 'ሴት') {
          genderMatch++;
        }
      }
      if (genderMatch >= 2) {
        genderIdx = c;
        break;
      }
    }
  }

  if (ageIdx === -1) {
    for (let c = 0; c < maxCols; c++) {
      if (c === nameIdx || c === seqIdx || c === genderIdx || phoneIdxs.includes(c)) continue;
      let ageMatch = 0;
      for (let r = sampleStart; r < sampleEnd; r++) {
        const cell = rawRows[r]?.[c];
        if (extractNormalizedPhones(cell)) continue;
        const p = parseAgeFn(cell, refYear, ageMode);
        if (p.age >= 0 && p.age <= 110) {
          ageMatch++;
        }
      }
      if (ageMatch >= 2) {
        ageIdx = c;
        break;
      }
    }
  }

  // Always scan sample rows for ANY unlabeled / extra phone columns
  for (let c = 0; c < maxCols; c++) {
    if (c === nameIdx || c === ageIdx || c === genderIdx || c === seqIdx || phoneIdxs.includes(c)) continue;
    let phoneHits = 0;
    for (let r = sampleStart; r < sampleEnd; r++) {
      if (extractNormalizedPhones(rawRows[r]?.[c])) {
        phoneHits++;
      }
    }
    if (phoneHits >= 1) {
      phoneIdxs.push(c);
    }
  }

  // Parent index fallback to fatherIdx if parent column absent
  if (parentIdx === -1 && fatherIdx !== -1) {
    parentIdx = fatherIdx;
  }

  return {
    headerIdx,
    headerCols,
    seqIdx,
    nameIdx,
    fatherIdx,
    grandfatherIdx,
    genderIdx,
    ageIdx,
    chapelIdx,
    codeIdx,
    familyCodeIdx,
    educationIdx,
    occupationIdx,
    relationIdx,
    parentIdx,
    phoneIdxs,
    phoneIdx: phoneIdxs.length > 0 ? phoneIdxs[0] : -1,
    residenceIdxs,
    residenceIdx: residenceIdxs.length > 0 ? residenceIdxs[0] : -1,
    baptizedIdx,
    lordsSupperIdx,
    titheIdx
  };
};

export const parseChurchBooleanStatus = (raw: unknown): boolean | undefined => {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
    return undefined;
  }
  const s = normalizeAmharicSearchText(String(raw ?? ''));
  if (!s || s === '-' || s === '—' || s === 'ያልተገለጸ') return undefined;
  if (
    s === 'አዎ' ||
    s === 'አው' ||
    s === 'yes' ||
    s === 'y' ||
    s === 'true' ||
    s === '1' ||
    s === '✓' ||
    s === '✔' ||
    s === 'ነው' ||
    s === 'ናት' ||
    s === 'የተጠመቀ' ||
    s === 'የተጠመቀች' ||
    s === 'ተጠምቋል' ||
    s === 'ተጠምቃለች' ||
    s === 'ይካፈላል' ||
    s === 'ትካፈላለች' ||
    s === 'የሚካፈል' ||
    s === 'የምትካፈል' ||
    s === 'ይከፍላል' ||
    s === 'ትከፍላለች' ||
    s === 'የሚከፍል' ||
    s === 'የምትከፍል'
  ) {
    return true;
  }
  if (
    s === 'አይ' ||
    s === 'አይደለም' ||
    s === 'አይደለችም' ||
    s === 'no' ||
    s === 'n' ||
    s === 'false' ||
    s === '0' ||
    s === '✗' ||
    s === '✘' ||
    s === 'አልተጠመቀም' ||
    s === 'አልተጠመቀችም' ||
    s === 'ያልተጠመቀ' ||
    s === 'አይካፈልም' ||
    s === 'አትካፈልም' ||
    s === 'የማይካፈል' ||
    s === 'አይከፍልም' ||
    s === 'አትከፍልም' ||
    s === 'የማይከፍል'
  ) {
    return false;
  }
  return undefined;
};

const isRepeatedHeaderOrSummaryName = (rawName: string): boolean => {
  const clean = rawName.trim();
  const lower = clean.toLowerCase();
  if (
    clean === 'ተ.ቁ' || clean === 'ተ/ቁ' || clean === 'ተቁ' ||
    clean === 'ስም' || clean === 'ሙሉ ስም' ||
    clean === 'የአባሉ ስም' || clean === 'የአባል ስም' ||
    clean === 'የልጁ ስም' || clean === 'የልጅ ስም' || clean === 'የልጁ ሙሉ ስም' ||
    clean === 'የተማሪ ስም' || clean === 'የአባላት ስም' ||
    lower === 'name' || lower === 'full name' || lower === 'fullname' ||
    clean === 'ድምር' || clean === 'ጠቅላላ' || clean === 'ጠቅላላ ድምር' ||
    lower === 'total' || lower === 'sum' || lower === 'grand total'
  ) {
    return true;
  }
  return false;
};

const isDependentRelation = (relRaw: string): boolean => {
  const r = normalizeAmharicSearchText(relRaw);
  if (!r) return false;
  return (
    r.includes('ልጅ') || r.includes('ሚስት') || r.includes('ባል') || r.includes('ጥገኛ') ||
    r.includes('አባል') || r.includes('ተከታይ') || r.includes('እህት') || r.includes('ወንድም') ||
    r.includes('child') || r.includes('son') || r.includes('daughter') ||
    r.includes('spouse') || r.includes('wife') || r.includes('husband') || r.includes('dep')
  );
};

const isHeadRelation = (relRaw: string): boolean => {
  const r = normalizeAmharicSearchText(relRaw);
  if (!r) return false;
  return (
    r.includes('አባወራ') || r.includes('እማወራ') || r.includes('መሪ') ||
    r.includes('ሃላፊ') || r.includes('head') || r.includes('owner') || r.includes('self')
  );
};

const isSoloRelation = (relRaw: string): boolean => {
  const r = normalizeAmharicSearchText(relRaw);
  if (!r) return false;
  return (
    r.includes('ብቸኛ') || r.includes('ራሱን') || r.includes('ራሷን') ||
    r === 'ራሱ' || r === 'ራሷ' || r.includes('1 ሰው') || r.includes('አንድ ሰው') ||
    r.includes('solo') || r.includes('single') || r.includes('individual') || r.includes('standalone')
  );
};

const inferAgeFromEduAndRelation = (edu: string, occ: string, rel: string, hasParentOrPhone: boolean): number | null => {
  const e = normalizeAmharicSearchText(edu);
  const o = normalizeAmharicSearchText(occ);
  const r = normalizeAmharicSearchText(rel);

  if (e) {
    if (e.includes('kg') || e.includes('መዋእለ') || e.includes('ኬጂ') || e.includes('ጨቅላ') || e.includes('ቅድመ') || e.includes('nursery') || e.includes('0ኛ')) return 4;
    if (e.includes('1ኛ') || /\bgrade\s*1\b/.test(e) || /\bg\s*1\b/.test(e)) return 7;
    if (e.includes('2ኛ') || /\bgrade\s*2\b/.test(e) || /\bg\s*2\b/.test(e)) return 8;
    if (e.includes('3ኛ') || /\bgrade\s*3\b/.test(e) || /\bg\s*3\b/.test(e)) return 9;
    if (e.includes('4ኛ') || /\bgrade\s*4\b/.test(e) || /\bg\s*4\b/.test(e)) return 10;
    if (e.includes('5ኛ') || /\bgrade\s*5\b/.test(e) || /\bg\s*5\b/.test(e)) return 11;
    if (e.includes('6ኛ') || /\bgrade\s*6\b/.test(e) || /\bg\s*6\b/.test(e)) return 12;
    if (e.includes('7ኛ') || /\bgrade\s*7\b/.test(e) || /\bg\s*7\b/.test(e)) return 13;
    if (e.includes('8ኛ') || /\bgrade\s*8\b/.test(e) || /\bg\s*8\b/.test(e)) return 14;
    if (e.includes('9ኛ') || /\bgrade\s*9\b/.test(e)) return 15;
    if (e.includes('10ኛ') || /\bgrade\s*10\b/.test(e)) return 16;
    if (e.includes('11ኛ') || e.includes('12ኛ') || e.includes('ዲግሪ') || e.includes('ዲፕሎማ') || e.includes('ኮሌጅ') || e.includes('degree') || e.includes('diploma')) return 20;
  }

  if (r.includes('ልጅ') || r.includes('child') || r.includes('son') || r.includes('daughter')) {
    if (!o.includes('ሰራተኛ') && !o.includes('ነጋዴ') && !o.includes('ገበሬ')) {
      return 10;
    }
  }

  if (o.includes('ተማሪ') && hasParentOrPhone) {
    return 10;
  }

  return null;
};

export interface ParsedChurchSheetResult {
  members: ChurchMember[];
  children: Omit<ChurchChild, 'id'>[];
  adultsSkipped: { name: string; age: number; gender: string; reason: string }[];
  sheetCounts: Record<string, number>;
  firstSheetCols?: DetectedSheetColumns;
  firstSheetRawRows?: any[][];
}

export interface SheetRowOverrideMapping {
  headerIdx?: number;
  nameIdx?: number;
  fatherIdx?: number;
  grandfatherIdx?: number;
  genderIdx?: number;
  ageIdx?: number;
  chapelIdx?: number;
  educationIdx?: number;
  occupationIdx?: number;
  parentIdx?: number;
  phoneIdx?: number;
  residenceIdx?: number;
}

/**
 * Parses ALL sheets of an uploaded Church Excel workbook cleanly:
 * - Expands vertical merged cells
 * - Collects ALL phone columns and fallback phone cells
 * - Propagates family/household phone, parentName, residence across family member rows
 *   (via same/empty household ID, dependent relationship, consecutive household parent match, and sheet-wide parent lookup)
 * - Keeps `age: 0` intact for infants
 */
export const parseChurchWorkbookAllSheets = (
  workbook: XLSX.WorkBook,
  parseAgeFn: (val: any, refYear?: number, mode?: 'auto' | 'direct' | 'birthyear') => { age: number; isChild: boolean },
  options?: {
    refYear?: number;
    ageMode?: 'auto' | 'direct' | 'birthyear';
    defaultChapelFallback?: string;
    firstSheetOverride?: SheetRowOverrideMapping;
  }
): ParsedChurchSheetResult => {
  const refYear = options?.refYear ?? 2018;
  const ageMode = options?.ageMode ?? 'auto';
  const todayStr = new Date().toISOString().split('T')[0];

  const allMembers: (ChurchMember & {
    _parsedAgeWasKnown: boolean;
    _rel?: string;
    _householdId?: string;
    _linkedHouseholdId?: string;
  })[] = [];
  const allChildren: Omit<ChurchChild, 'id'>[] = [];
  const allAdultsSkipped: { name: string; age: number; gender: string; reason: string }[] = [];
  const sheetCounts: Record<string, number> = {};

  let firstSheetCols: DetectedSheetColumns | undefined;
  let firstSheetRawRows: any[][] | undefined;

  // Workbook-wide phone dictionary for cross-sheet/reverse-order parent matching
  const globalPhoneByNormName = new Map<string, string>();
  const globalPhoneByParentName = new Map<string, string>();

  workbook.SheetNames.forEach((sheetName, sIdx) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const rawRows = worksheetToCleanRowsWithMerges(worksheet);
    if (!rawRows || rawRows.length < 1) return;

    const detected = detectChurchSheetColumns(rawRows, parseAgeFn, refYear, ageMode);

    if (sIdx === 0) {
      firstSheetCols = detected;
      firstSheetRawRows = rawRows;
    }

    const ov = sIdx === 0 ? options?.firstSheetOverride : undefined;
    const headerIdx = ov?.headerIdx ?? detected.headerIdx;
    const nameIdx = ov?.nameIdx ?? detected.nameIdx;
    const fatherIdx = ov?.fatherIdx ?? detected.fatherIdx;
    const grandfatherIdx = ov?.grandfatherIdx ?? detected.grandfatherIdx;
    const genderIdx = ov?.genderIdx ?? detected.genderIdx;
    const ageIdx = ov?.ageIdx ?? detected.ageIdx;
    const chapelIdx = ov?.chapelIdx ?? detected.chapelIdx;
    const codeIdx = detected.codeIdx;
    const familyCodeIdx = detected.familyCodeIdx;
    const educationIdx = ov?.educationIdx ?? detected.educationIdx;
    const occupationIdx = ov?.occupationIdx ?? detected.occupationIdx;
    const relationIdx = detected.relationIdx;
    const baptizedIdx = detected.baptizedIdx;
    const lordsSupperIdx = detected.lordsSupperIdx;
    const titheIdx = detected.titheIdx;
    const parentIdx = ov?.parentIdx ?? detected.parentIdx;
    const residenceIdxs =
      ov?.residenceIdx !== undefined
        ? (ov.residenceIdx >= 0 ? [ov.residenceIdx] : [])
        : detected.residenceIdxs;
    const phoneIdxs =
      ov?.phoneIdx !== undefined
        ? (ov.phoneIdx >= 0 ? Array.from(new Set([ov.phoneIdx, ...detected.phoneIdxs])) : detected.phoneIdxs)
        : detected.phoneIdxs;

    const defaultSheetChapel =
      options?.defaultChapelFallback && workbook.SheetNames.length === 1 && chapelIdx === -1
        ? mapToOfficialChapelStrict(options.defaultChapelFallback, sIdx)
        : mapToOfficialChapelStrict(sheetName, sIdx);

    let activeSectionChapel = defaultSheetChapel;

    // Detect whether `seqIdx` repeats / leaves blanks (grouped families) vs continuous 1,2,3...
    const seqIdx = detected.seqIdx;
    const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;

    // Household carry-forward state
    let currentFamilySeq = '';
    let currentFamilyHeadName = '';
    let currentFamilyPhone = '';
    let currentFamilyResidence = '';
    let currentHouseholdId = '';
    let householdSeqCounter = 0;
    let lastRecentAdultHeadName = '';
    let lastRecentAdultPhone = '';
    let lastRecentAdultResidence = '';
    let lastRecentAdultHouseholdId = '';

    const sheetMembers: (ChurchMember & {
      _parsedAgeWasKnown: boolean;
      _rel?: string;
      _householdId?: string;
      _linkedHouseholdId?: string;
    })[] = [];

    for (let i = startRow; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      // Check for single-cell inline chapel banner row (e.g. "ሻሎም ቻፕል")
      const nonEmptyCells = row
        .map((c, idx) => ({ idx, val: String(c || '').trim() }))
        .filter((item) => item.val.length > 0);
      if (nonEmptyCells.length === 0) continue;
      if (nonEmptyCells.length === 1 && nonEmptyCells[0].val.length >= 3 && isNaN(Number(nonEmptyCells[0].val))) {
        const singleVal = nonEmptyCells[0].val.toLowerCase();
        if (singleVal.includes('ቻፕል') || singleVal.includes('chapel')) {
          activeSectionChapel = mapToOfficialChapelStrict(nonEmptyCells[0].val, sIdx);
          currentFamilyPhone = '';
          currentFamilyHeadName = '';
          currentHouseholdId = '';
          lastRecentAdultHouseholdId = '';
          continue;
        }
      }

      const rawSeq = seqIdx !== -1 ? String(row[seqIdx] ?? '').trim() : '';

      let rawName = String(nameIdx !== -1 ? row[nameIdx] ?? '' : '').trim();

      if (!rawName) {
        if (nameIdx !== -1 && row[nameIdx + 1] && isNaN(Number(row[nameIdx + 1]))) {
          rawName = String(row[nameIdx + 1]).trim();
        } else if (row[0] && isNaN(Number(row[0]))) {
          rawName = String(row[0]).trim();
        } else if (row[1] && isNaN(Number(row[1]))) {
          rawName = String(row[1]).trim();
        }
      }

      if (!rawName) continue;
      if (isRepeatedHeaderOrSummaryName(rawName)) continue;

      // If name column accidentally picked row serial number, shift right
      if (/^\d+$/.test(rawName)) {
        if (nameIdx !== -1 && row[nameIdx + 1] && isNaN(Number(row[nameIdx + 1]))) {
          rawName = String(row[nameIdx + 1]).trim();
        } else {
          continue;
        }
      }

      // Clean leading numbering like "1. አበበ" or "12) ዳዊት"
      rawName = rawName.replace(/^\d+[\.\/\-\)\s]+\s*/, '').trim();
      if (!rawName || isRepeatedHeaderOrSummaryName(rawName)) continue;

      if (fatherIdx !== -1 && row[fatherIdx]) {
        const f = String(row[fatherIdx]).trim();
        if (f && !rawName.includes(f) && isNaN(Number(f))) rawName += ` ${f}`;
      }
      if (grandfatherIdx !== -1 && row[grandfatherIdx]) {
        const gf = String(row[grandfatherIdx]).trim();
        if (gf && !rawName.includes(gf) && isNaN(Number(gf))) rawName += ` ${gf}`;
      }

      // Gender
      const rawGender = String(genderIdx !== -1 ? row[genderIdx] ?? '' : '').trim();
      const gender =
        rawGender.startsWith('ሴ') ||
        rawGender.toLowerCase().startsWith('f') ||
        rawGender.toLowerCase().includes('female') ||
        rawGender.includes('ሴት')
          ? 'ሴ'
          : 'ወ';

      // Edu, Occ, Relation
      const edu = educationIdx !== -1 && row[educationIdx] ? String(row[educationIdx]).trim() : undefined;
      const occ = occupationIdx !== -1 && row[occupationIdx] ? String(row[occupationIdx]).trim() : undefined;
      const rel = relationIdx !== -1 && row[relationIdx] ? String(row[relationIdx]).trim() : '';

      // Direct Phone Extraction across ALL phone columns + full row fallback
      const collectedPhones: string[] = [];
      for (const pIdx of phoneIdxs) {
        const extracted = extractNormalizedPhones(row[pIdx]);
        if (extracted) {
          extracted.split(' / ').forEach((p) => {
            if (!collectedPhones.includes(p)) collectedPhones.push(p);
          });
        }
      }
      if (collectedPhones.length === 0) {
        for (let c = 0; c < row.length; c++) {
          if (c === nameIdx || c === ageIdx || c === genderIdx || c === seqIdx) continue;
          const extracted = extractNormalizedPhones(row[c]);
          if (extracted) {
            extracted.split(' / ').forEach((p) => {
              if (!collectedPhones.includes(p)) collectedPhones.push(p);
            });
          }
        }
      }
      let directPhone = collectedPhones.length > 0 ? collectedPhones.join(' / ') : undefined;

      // Residence Extraction across all residence columns
      let residence: string | undefined;
      for (const rIdx of residenceIdxs) {
        const rVal = String(row[rIdx] ?? '').trim();
        if (rVal) {
          residence = residence ? `${residence} - ${rVal}` : rVal;
        }
      }

      // Parent extraction
      let parentName: string | undefined =
        parentIdx !== -1 && row[parentIdx] ? String(row[parentIdx]).trim() : undefined;

      // Age extraction (supports 0 accurately!)
      const rawAgeVal = ageIdx !== -1 ? row[ageIdx] : undefined;
      const parsedAge = parseAgeFn(rawAgeVal, refYear, ageMode);
      let ageNum = parsedAge.age;
      const parsedAgeWasKnown = parsedAge.age !== -1;

      if (ageNum === -1) {
        const inferred = inferAgeFromEduAndRelation(
          edu || '',
          occ || '',
          rel,
          Boolean(parentName || directPhone)
        );
        ageNum = inferred !== null ? inferred : 30;
      }

      // Chapel strict mapping
      const chapelRaw =
        chapelIdx !== -1 && row[chapelIdx] ? String(row[chapelIdx]).trim() : activeSectionChapel;
      const officialChapel = mapToOfficialChapelStrict(chapelRaw, sIdx);

      // Family / Household phone & parent context tracking
      const seqBase = rawSeq.replace(/[a-zA-Z\-]+$/, '').trim();
      const sameGroupedSeq =
        (seqIdx !== -1 && rawSeq === '' && currentFamilyHeadName !== '') ||
        (seqBase !== '' && currentFamilySeq !== '' && seqBase === currentFamilySeq);
      const hasDistinctNewSeq =
        seqIdx !== -1 && seqBase !== '' && currentFamilySeq !== '' && seqBase !== currentFamilySeq;

      const normRawName = normalizeAmharicSearchText(rawName);
      const nameParts = normRawName.split(' ').filter(Boolean);
      const normHeadFirst = normalizeAmharicSearchText(currentFamilyHeadName).split(' ')[0] || '';
      const normLastAdultFirst = normalizeAmharicSearchText(lastRecentAdultHeadName).split(' ')[0] || '';
      const prevMember = sheetMembers.length > 0 ? sheetMembers[sheetMembers.length - 1] : null;
      const prevParts = prevMember ? normalizeAmharicSearchText(prevMember.name).split(' ').filter(Boolean) : [];
      const matchesPrevSiblingFather =
        Boolean(
          prevMember &&
          prevMember.phone &&
          nameParts.length >= 2 &&
          prevParts.length >= 2 &&
          nameParts[1] === prevParts[1] &&
          (prevParts.length < 3 || nameParts.length < 3 || nameParts[2] === prevParts[2])
        );

      const matchesCurrentHeadPatronym =
        Boolean(normHeadFirst && nameParts.length >= 2 && nameParts[1] === normHeadFirst);
      const matchesRecentAdultPatronym =
        Boolean(normLastAdultFirst && nameParts.length >= 2 && nameParts[1] === normLastAdultFirst);
      const explicitParentMatchesHead =
        Boolean(
          parentName &&
          currentFamilyHeadName &&
          normalizeAmharicSearchText(currentFamilyHeadName).includes(normalizeAmharicSearchText(parentName))
        );

      const hadOwnPhoneBeforeFallback = Boolean(directPhone);
      const hasOwnDifferentPhone = Boolean(
        hadOwnPhoneBeforeFallback &&
        currentFamilyPhone &&
        directPhone !== currentFamilyPhone
      );
      const isChildOrMinor = ageNum >= 0 && ageNum <= 17;
      const isDependent = isDependentRelation(rel);
      const isExplicitHead = isHeadRelation(rel);
      const isSolo = isSoloRelation(rel);

      let rowHouseholdId = '';
      let linkedHouseholdId: string | undefined = undefined;

      // Solo 1-person household, or explicit new serial/household number (without dependent/parent match),
      // or separate adult/phone-owner MUST start its own standalone household directly (never stacked under someone else).
      const startsNewHousehold =
        isSolo ||
        (hasDistinctNewSeq && !isDependent && !explicitParentMatchesHead) ||
        (hasOwnDifferentPhone && !sameGroupedSeq && !isDependent && !explicitParentMatchesHead) ||
        (!sameGroupedSeq && !isDependent && !isChildOrMinor && (!matchesCurrentHeadPatronym || !explicitParentMatchesHead)) ||
        (!sameGroupedSeq && Boolean(seqBase) && isExplicitHead);

      if (startsNewHousehold) {
        currentFamilySeq = seqBase;
        currentFamilyHeadName = rawName;
        currentFamilyPhone = directPhone || '';
        currentFamilyResidence = residence || '';
        householdSeqCounter += 1;
        currentHouseholdId = `hh_${sIdx}_${householdSeqCounter}`;
        rowHouseholdId = currentHouseholdId;
      } else {
        // Same household or dependent or child
        if (!currentFamilyHeadName) currentFamilyHeadName = rawName;
        if (!currentHouseholdId) {
          householdSeqCounter += 1;
          currentHouseholdId = `hh_${sIdx}_${householdSeqCounter}`;
          rowHouseholdId = currentHouseholdId;
        } else if (
          sameGroupedSeq ||
          isDependent ||
          explicitParentMatchesHead ||
          (isChildOrMinor && matchesCurrentHeadPatronym)
        ) {
          linkedHouseholdId = currentHouseholdId;
        } else if (
          isChildOrMinor &&
          matchesRecentAdultPatronym &&
          lastRecentAdultHouseholdId
        ) {
          linkedHouseholdId = lastRecentAdultHouseholdId;
        } else {
          // Standalone 1-person minor/adult that shouldn't inherit an unrelated household's familyCode
          householdSeqCounter += 1;
          rowHouseholdId = `hh_${sIdx}_${householdSeqCounter}`;
        }

        const sameResidenceOrBlank =
          !residence ||
          !currentFamilyResidence ||
          normalizeAmharicSearchText(residence) === normalizeAmharicSearchText(currentFamilyResidence);

        if (
          !directPhone &&
          currentFamilyPhone &&
          (sameGroupedSeq ||
            isDependent ||
            explicitParentMatchesHead ||
            (isChildOrMinor && (matchesCurrentHeadPatronym || matchesPrevSiblingFather || sameResidenceOrBlank)))
        ) {
          directPhone = currentFamilyPhone;
        } else if (directPhone && !currentFamilyPhone) {
          currentFamilyPhone = directPhone;
        }
        if (
          !residence &&
          currentFamilyResidence &&
          (sameGroupedSeq || isDependent || (isChildOrMinor && (matchesCurrentHeadPatronym || matchesPrevSiblingFather || ageNum <= 14)))
        ) {
          residence = currentFamilyResidence;
        } else if (residence && !currentFamilyResidence) {
          currentFamilyResidence = residence;
        }
        if (!parentName && (sameGroupedSeq || isDependent) && currentFamilyHeadName && currentFamilyHeadName !== rawName) {
          parentName = currentFamilyHeadName;
        }
      }

      // Consecutive adult-with-phone OR sibling continuity fallback ONLY for dependent/grouped children without their own distinct seq/phone
      if (
        !isSolo &&
        !hasDistinctNewSeq &&
        !hasOwnDifferentPhone &&
        isChildOrMinor &&
        !directPhone &&
        lastRecentAdultPhone &&
        (matchesRecentAdultPatronym || matchesPrevSiblingFather || sameGroupedSeq)
      ) {
        directPhone = lastRecentAdultPhone;
        if (!parentName && lastRecentAdultHeadName && lastRecentAdultHeadName !== rawName) {
          parentName = lastRecentAdultHeadName;
        }
        if (!residence && lastRecentAdultResidence) {
          residence = lastRecentAdultResidence;
        }
        if (!linkedHouseholdId && matchesRecentAdultPatronym && lastRecentAdultHouseholdId) {
          linkedHouseholdId = lastRecentAdultHouseholdId;
        }
      } else if (
        !isSolo &&
        !hasDistinctNewSeq &&
        !hasOwnDifferentPhone &&
        isChildOrMinor &&
        !directPhone &&
        matchesPrevSiblingFather &&
        prevMember?.phone
      ) {
        directPhone = prevMember.phone;
        if (!parentName && prevMember.parentName) parentName = prevMember.parentName;
        if (!residence && prevMember.residence) residence = prevMember.residence;
        if (!linkedHouseholdId && (prevMember._linkedHouseholdId || prevMember._householdId)) {
          linkedHouseholdId = prevMember._linkedHouseholdId || prevMember._householdId;
        }
      }

      // Final parentName fallback from father's + grandfather's name parts
      if (!parentName) {
        const rawParts = rawName.split(' ').filter(Boolean);
        if (rawParts.length >= 2) {
          parentName = rawParts.slice(1).join(' ');
        }
      }

      // Track last adult who owns a phone (for immediate children rows below)
      if (ageNum >= 18 && directPhone) {
        lastRecentAdultHeadName = rawName;
        lastRecentAdultPhone = directPhone;
        lastRecentAdultResidence = residence || '';
        lastRecentAdultHouseholdId = rowHouseholdId || currentHouseholdId;
      }

      // Register in lookup maps if we have a phone
      if (directPhone) {
        if (normRawName && !globalPhoneByNormName.has(normRawName)) {
          globalPhoneByNormName.set(normRawName, directPhone);
        }
        if (nameParts.length >= 2) {
          const two = `${nameParts[0]} ${nameParts[1]}`;
          if (!globalPhoneByNormName.has(two)) {
            globalPhoneByNormName.set(two, directPhone);
          }
        }
        if (parentName) {
          const normP = normalizeAmharicSearchText(parentName);
          if (normP && !globalPhoneByParentName.has(normP)) {
            globalPhoneByParentName.set(normP, directPhone);
          }
        }
      }

      const existingMemberCode =
        codeIdx !== -1 && row[codeIdx] ? String(row[codeIdx]).trim() : undefined;
      const existingFamilyCode =
        familyCodeIdx !== -1 && row[familyCodeIdx] ? String(row[familyCodeIdx]).trim() : undefined;

      const isBaptized =
        baptizedIdx !== -1 ? parseChurchBooleanStatus(row[baptizedIdx]) : undefined;
      const takesLordsSupper =
        lordsSupperIdx !== -1 ? parseChurchBooleanStatus(row[lordsSupperIdx]) : undefined;
      const paysTithe =
        titheIdx !== -1 ? parseChurchBooleanStatus(row[titheIdx]) : undefined;

      sheetMembers.push({
        id: generateUniqueId(),
        memberCode: existingMemberCode || undefined,
        familyCode: existingFamilyCode || undefined,
        name: rawName,
        gender,
        age: ageNum,
        educationLevel: edu,
        occupation: occ,
        ...(isBaptized !== undefined ? { isBaptized } : {}),
        ...(takesLordsSupper !== undefined ? { takesLordsSupper } : {}),
        ...(paysTithe !== undefined ? { paysTithe } : {}),
        chapel: officialChapel,
        parentName,
        phone: directPhone,
        residence,
        relationToHead: rel || undefined,
        sheetName,
        registeredDate: todayStr,
        _parsedAgeWasKnown: parsedAgeWasKnown,
        _rel: rel,
        _householdId: rowHouseholdId || undefined,
        _linkedHouseholdId:
          existingMemberCode || existingFamilyCode ? undefined : linkedHouseholdId
      });
    }

    sheetCounts[sheetName] = sheetMembers.length;
    allMembers.push(...sheetMembers);
  });

  // Pass 2: Cross-row & Cross-sheet Parent/Member Phone Lookup for any remaining records missing a phone
  for (const m of allMembers) {
    if (!m.phone) {
      if (m.parentName) {
        const normP = normalizeAmharicSearchText(m.parentName);
        const byMember = globalPhoneByNormName.get(normP);
        if (byMember) {
          m.phone = byMember;
        } else {
          const byParent = globalPhoneByParentName.get(normP);
          if (byParent) m.phone = byParent;
        }
      }
      if (!m.phone) {
        const parts = normalizeAmharicSearchText(m.name).split(' ').filter(Boolean);
        if (parts.length >= 3) {
          const fatherFull = `${parts[1]} ${parts[2]}`;
          const byFatherFull = globalPhoneByNormName.get(fatherFull);
          if (byFatherFull) m.phone = byFatherFull;
        }
      }
    }
  }

  // Pass 3: Resolve household heads first so detected family dependents inherit head's base memberCode -> /1, /2, ...
  const householdMetaById = new Map<number, { householdId?: string; linkedHouseholdId?: string }>();
  const primaryOrStandaloneRows: ChurchMember[] = [];
  const linkedDependentRows: ChurchMember[] = [];

  allMembers.forEach(({ _parsedAgeWasKnown, _rel, _householdId, _linkedHouseholdId, ...rest }) => {
    if (_householdId || _linkedHouseholdId) {
      householdMetaById.set(rest.id, {
        householdId: _householdId,
        linkedHouseholdId: _linkedHouseholdId
      });
    }
    if (_linkedHouseholdId) {
      linkedDependentRows.push(rest);
    } else {
      primaryOrStandaloneRows.push(rest);
    }
  });

  const codedPrimaryRows = assignSequentialCodesAndSortMembers(primaryOrStandaloneRows);
  const headCodeByHouseholdKey = new Map<string, { code: string; chapel: string }>();
  codedPrimaryRows.forEach((m) => {
    const meta = householdMetaById.get(m.id);
    if (meta?.householdId && m.memberCode) {
      headCodeByHouseholdKey.set(meta.householdId, {
        code: m.memberCode,
        chapel: m.chapel || DEFAULT_CHAPELS[0]
      });
    }
  });

  const resolvedDependents = linkedDependentRows.map((m) => {
    const meta = householdMetaById.get(m.id);
    const headInfo = meta?.linkedHouseholdId
      ? headCodeByHouseholdKey.get(meta.linkedHouseholdId)
      : undefined;
    if (headInfo && headInfo.chapel === m.chapel && !m.familyCode && !m.memberCode) {
      return {
        ...m,
        familyCode: headInfo.code
      };
    }
    return m;
  });

  const codedSortedMembers = assignSequentialCodesAndSortMembers([
    ...codedPrimaryRows,
    ...resolvedDependents
  ]);

  // Pass 4: Extract 0-14 children preserving their assigned chapel memberCode
  for (const m of codedSortedMembers) {
    const ageNum = typeof m.age === 'number' ? m.age : parseInt(String(m.age ?? '30'), 10);
    if (ageNum >= 0 && ageNum <= 14) {
      allChildren.push({
        memberCode: m.memberCode,
        familyCode: m.familyCode,
        name: m.name,
        gender: m.gender === 'ሴ' ? 'ሴ' : 'ወ',
        age: ageNum,
        educationLevel:
          m.educationLevel ||
          (ageNum <= 3
            ? 'ጨቅላ/ያልጀመረ'
            : ageNum <= 6
            ? `መዋዕለ ሕፃናት (KG ${Math.min(3, Math.max(1, ageNum - 3))})`
            : `${ageNum - 6}ኛ ክፍል`),
        occupation: m.occupation || (ageNum <= 3 ? 'የቤት ውስጥ' : 'ተማሪ'),
        chapel: m.chapel || DEFAULT_CHAPELS[0],
        parentName: m.parentName,
        phone: m.phone,
        residence: m.residence,
        fellowshipOrVillage: m.residence,
        registeredDate: m.registeredDate || todayStr
      });
    } else {
      allAdultsSkipped.push({
        name: m.name,
        gender: m.gender || 'ወ',
        age: isNaN(ageNum) ? -1 : ageNum,
        reason:
          ageNum > 14
            ? `ዕድሜው ${ageNum} ዓመት (ከ14 ዓመት በላይ በመሆኑ ተዘልሏል)`
            : 'ዕድሜ አልተገለጸም'
      });
    }
  }

  return {
    members: codedSortedMembers,
    children: allChildren,
    adultsSkipped: allAdultsSkipped,
    sheetCounts,
    firstSheetCols,
    firstSheetRawRows
  };
};
