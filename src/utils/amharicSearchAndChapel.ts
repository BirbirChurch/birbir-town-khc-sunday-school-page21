import { DEFAULT_CHAPELS } from '../constants/initialData';
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
    .replace(/[ዔ]/g, 'ኤ')
    .replace(/ዕ/g, 'እ')
    .replace(/ዖ/g, 'ኦ')
    .replace(/ፀ/g, 'ጸ')
    .replace(/ፁ/g, 'ጹ')
    .replace(/ፂ/g, 'ጺ')
    .replace(/ፃ/g, 'ጻ')
    .replace(/ፄ/g, 'ጼ')
    .replace(/ፅ/g, 'ጽ')
    .replace(/ፆ/g, 'ጾ')
    .trim();
};

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
  const compactDigits = rawJoined.replace(/[\s\-().+]/g, '');
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

export const mapToOfficialChapel = mapToOfficialChapelStrict;

export const parseNumericAgePure = (
  rawVal: any,
  refYear: number = 2018
): number | null => {
  if (rawVal === undefined || rawVal === null || rawVal === '') return null;
  const currentGregYear = new Date().getFullYear();

  if (rawVal instanceof Date) {
    const y = rawVal.getFullYear();
    if (y >= 1930) {
      return y <= refYear ? Math.max(0, refYear - y) : Math.max(0, currentGregYear - y);
    }
  }

  if (typeof rawVal === 'number') {
    if (rawVal >= 25000 && rawVal <= 65000) {
      const y = new Date(Math.round((rawVal - 25569) * 86400 * 1000)).getUTCFullYear();
      if (y >= 1930) {
        return y <= refYear ? Math.max(0, refYear - y) : Math.max(0, currentGregYear - y);
      }
    }
    if (rawVal >= 0 && rawVal <= 120) return Math.round(rawVal);
    if (rawVal >= 1930 && rawVal <= 2035) {
      return rawVal <= refYear ? Math.max(0, refYear - rawVal) : Math.max(0, currentGregYear - rawVal);
    }
  }

  const str = String(rawVal).trim();
  if (!str) return null;
  if ((str.includes('ወር') || str.toLowerCase().includes('month')) && !str.includes('ዓመት') && !str.includes('አመት')) {
    return 0;
  }

  const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    return y <= refYear ? Math.max(0, refYear - y) : Math.max(0, currentGregYear - y);
  }

  const numMatch = str.match(/\d+/);
  if (numMatch) {
    const n = parseInt(numMatch[0], 10);
    if (n >= 0 && n <= 120) return n;
    if (n >= 1930) {
      return n <= refYear ? Math.max(0, refYear - n) : Math.max(0, currentGregYear - n);
    }
  }
  return null;
};
