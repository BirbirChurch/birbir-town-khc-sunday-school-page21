/**
 * Direct Phonetic Ethiopic / Amharic -> English (Latin) Name Transliterator.
 * Converts Amharic names character-by-character using Ethiopian phonetic spelling
 * WITHOUT translating semantic meaning (e.g., "ተስፋዬ" -> "Tesfaye", NOT "My Hope").
 */

const EXACT_FIDEL_MAP: Record<string, string> = {
  // ሀ-row (first order 'ha')
  'ሀ': 'ha', 'ሁ': 'hu', 'ሂ': 'hi', 'ሃ': 'ha', 'ሄ': 'he', 'ህ': 'h', 'ሆ': 'ho',
  // ለ-row
  'ለ': 'le', 'ሉ': 'lu', 'ሊ': 'li', 'ላ': 'la', 'ሌ': 'le', 'ል': 'l', 'ሎ': 'lo', 'ሏ': 'lwa',
  // ሐ-row
  'ሐ': 'ha', 'ሑ': 'hu', 'ሒ': 'hi', 'ሓ': 'ha', 'ሔ': 'he', 'ሕ': 'h', 'ሖ': 'ho', 'ሗ': 'hwa',
  // መ-row
  'መ': 'me', 'ሙ': 'mu', 'ሚ': 'mi', 'ማ': 'ma', 'ሜ': 'me', 'ም': 'm', 'ሞ': 'mo', 'ሟ': 'mwa',
  // ሠ-row
  'ሠ': 'se', 'ሡ': 'su', 'ሢ': 'si', 'ሣ': 'sa', 'ሤ': 'se', 'ሥ': 's', 'ሦ': 'so', 'ሧ': 'swa',
  // ረ-row
  'ረ': 're', 'ሩ': 'ru', 'ሪ': 'ri', 'ራ': 'ra', 'ሬ': 're', 'ር': 'r', 'ሮ': 'ro', 'ሯ': 'rwa',
  // ሰ-row
  'ሰ': 'se', 'ሱ': 'su', 'ሲ': 'si', 'ሳ': 'sa', 'ሴ': 'se', 'ስ': 's', 'ሶ': 'so', 'ሷ': 'swa',
  // ሸ-row
  'ሸ': 'she', 'ሹ': 'shu', 'ሺ': 'shi', 'ሻ': 'sha', 'ሼ': 'she', 'ሽ': 'sh', 'ሾ': 'sho', 'ሿ': 'shwa',
  // ቀ-row
  'ቀ': 'ke', 'ቁ': 'ku', 'ቂ': 'ki', 'ቃ': 'ka', 'ቄ': 'ke', 'ቅ': 'k', 'ቆ': 'ko',
  'ቈ': 'kwe', 'ቊ': 'kwi', 'ቋ': 'kwa', 'ቌ': 'kwe', 'ቍ': 'kw',
  // ቐ-row
  'ቐ': 'ke', 'ቑ': 'ku', 'ቒ': 'ki', 'ቓ': 'ka', 'ቔ': 'ke', 'ቕ': 'k', 'ቖ': 'ko',
  // በ-row
  'በ': 'be', 'ቡ': 'bu', 'ቢ': 'bi', 'ባ': 'ba', 'ቤ': 'be', 'ብ': 'b', 'ቦ': 'bo', 'ቧ': 'bwa',
  // ቨ-row
  'ቨ': 've', 'ቩ': 'vu', 'ቪ': 'vi', 'ቫ': 'va', 'ቬ': 've', 'ቭ': 'v', 'ቮ': 'vo', 'ቯ': 'vwa',
  // ተ-row
  'ተ': 'te', 'ቱ': 'tu', 'ቲ': 'ti', 'ታ': 'ta', 'ቴ': 'te', 'ት': 't', 'ቶ': 'to', 'ቷ': 'twa',
  // ቸ-row
  'ቸ': 'che', 'ቹ': 'chu', 'ቺ': 'chi', 'ቻ': 'cha', 'ቼ': 'che', 'ች': 'ch', 'ቾ': 'cho', 'ቿ': 'chwa',
  // ኀ-row
  'ኀ': 'ha', 'ኁ': 'hu', 'ኂ': 'hi', 'ኃ': 'ha', 'ኄ': 'he', 'ኅ': 'h', 'ኆ': 'ho',
  'ኈ': 'hwe', 'ኊ': 'hwi', 'ኋ': 'hwa', 'ኌ': 'hwe', 'ኍ': 'hw',
  // ነ-row
  'ነ': 'ne', 'ኑ': 'nu', 'ኒ': 'ni', 'ና': 'na', 'ኔ': 'ne', 'ን': 'n', 'ኖ': 'no', 'ኗ': 'nwa',
  // ኘ-row
  'ኘ': 'nye', 'ኙ': 'nyu', 'ኚ': 'nyi', 'ኛ': 'nya', 'ኜ': 'nye', 'ኝ': 'ny', 'ኞ': 'nyo', 'ኟ': 'nywa',
  // አ-row (vowels)
  'አ': 'a', 'ኡ': 'u', 'ኢ': 'i', 'ኣ': 'a', 'ኤ': 'e', 'እ': 'i', 'ኦ': 'o', 'ኧ': 'e',
  // ከ-row
  'ከ': 'ke', 'ኩ': 'ku', 'ኪ': 'ki', 'ካ': 'ka', 'ኬ': 'ke', 'ክ': 'k', 'ኮ': 'ko',
  'ኰ': 'kwe', 'ኲ': 'kwi', 'ኳ': 'kwa', 'ኴ': 'kwe', 'ኵ': 'kw',
  // ኸ-row
  'ኸ': 'he', 'ኹ': 'hu', 'ኺ': 'hi', 'ኻ': 'ha', 'ኼ': 'he', 'ኽ': 'h', 'ኾ': 'ho',
  // ወ-row
  'ወ': 'we', 'ዉ': 'wu', 'ዊ': 'wi', 'ዋ': 'wa', 'ዌ': 'we', 'ው': 'w', 'ዎ': 'wo',
  // ዐ-row (vowels)
  'ዐ': 'a', 'ዑ': 'u', 'ዒ': 'i', 'ዓ': 'a', 'ዔ': 'e', 'ዕ': 'i', 'ዖ': 'o',
  // ዘ-row
  'ዘ': 'ze', 'ዙ': 'zu', 'ዚ': 'zi', 'ዛ': 'za', 'ዜ': 'ze', 'ዝ': 'z', 'ዞ': 'zo', 'ዟ': 'zwa',
  // ዠ-row
  'ዠ': 'zhe', 'ዡ': 'zhu', 'ዢ': 'zhi', 'ዣ': 'zha', 'ዤ': 'zhe', 'ዥ': 'zh', 'ዦ': 'zho', 'ዧ': 'zhwa',
  // የ-row
  'የ': 'ye', 'ዩ': 'yu', 'ዪ': 'yi', 'ያ': 'ya', 'ዬ': 'ye', 'ይ': 'y', 'ዮ': 'yo',
  // ደ-row
  'ደ': 'de', 'ዱ': 'du', 'ዲ': 'di', 'ዳ': 'da', 'ዴ': 'de', 'ድ': 'd', 'ዶ': 'do', 'ዷ': 'dwa',
  // ዸ-row
  'ዸ': 'de', 'ዹ': 'du', 'ዺ': 'di', 'ዻ': 'da', 'ዼ': 'de', 'ዽ': 'd', 'ዾ': 'do', 'ዿ': 'dwa',
  // ጀ-row
  'ጀ': 'je', 'ጁ': 'ju', 'ጂ': 'ji', 'ጃ': 'ja', 'ጄ': 'je', 'ጅ': 'j', 'ጆ': 'jo', 'ጇ': 'jwa',
  // ገ-row
  'ገ': 'ge', 'ጉ': 'gu', 'ጊ': 'gi', 'ጋ': 'ga', 'ጌ': 'ge', 'ግ': 'g', 'ጎ': 'go',
  'ጐ': 'gwe', 'ጒ': 'gwi', 'ጓ': 'gwa', 'ጔ': 'gwe', 'ጕ': 'gw',
  // ጠ-row
  'ጠ': 'te', 'ጡ': 'tu', 'ጢ': 'ti', 'ጣ': 'ta', 'ጤ': 'te', 'ጥ': 't', 'ጦ': 'to', 'ጧ': 'twa',
  // ጨ-row
  'ጨ': 'che', 'ጩ': 'chu', 'ጪ': 'chi', 'ጫ': 'cha', 'ጬ': 'che', 'ጭ': 'ch', 'ጮ': 'cho', 'ጯ': 'chwa',
  // ጰ-row
  'ጰ': 'pe', 'ጱ': 'pu', 'ጲ': 'pi', 'ጳ': 'pa', 'ጴ': 'pe', 'ጵ': 'p', 'ጶ': 'po', 'ጷ': 'pwa',
  // ጸ-row
  'ጸ': 'tse', 'ጹ': 'tsu', 'ጺ': 'tsi', 'ጻ': 'tsa', 'ጼ': 'tse', 'ጽ': 'ts', 'ጾ': 'tso', 'ጿ': 'tswa',
  // ፀ-row
  'ፀ': 'tse', 'ፁ': 'tsu', 'ፂ': 'tsi', 'ፃ': 'tsa', 'ፄ': 'tse', 'ፅ': 'ts', 'ፆ': 'tso',
  // ፈ-row
  'ፈ': 'fe', 'ፉ': 'fu', 'ፊ': 'fi', 'ፋ': 'fa', 'ፌ': 'fe', 'ፍ': 'f', 'ፎ': 'fo', 'ፏ': 'fwa',
  // ፐ-row
  'ፐ': 'pe', 'ፑ': 'pu', 'ፒ': 'pi', 'ፓ': 'pa', 'ፔ': 'pe', 'ፕ': 'p', 'ፖ': 'po', 'ፗ': 'pwa'
};

// Pure-consonant 6th-order Ethiopic characters (excluding እ / ዕ which behave as vowel 'i')
const SIXTH_ORDER_CONSONANTS = new Set([
  'ህ', 'ል', 'ሕ', 'ም', 'ሥ', 'ር', 'ስ', 'ሽ', 'ቅ', 'ቕ', 'ብ', 'ቭ',
  'ት', 'ች', 'ኅ', 'ን', 'ኝ', 'ክ', 'ኽ', 'ው', 'ዝ', 'ዥ', 'ይ', 'ድ',
  'ዽ', 'ጅ', 'ግ', 'ጥ', 'ጭ', 'ጵ', 'ጽ', 'ፅ', 'ፍ', 'ፕ'
]);

const VOWEL_ONLY_SIXTH = new Set(['እ', 'ዕ']);

// Natural Ethiopian word-final 2-consonant coda clusters (remain bare without inserting 'i')
const ALLOWED_FINAL_CLUSTERS = new Set([
  'ስት', 'ርቅ', 'ርክ', 'ርድ', 'ርት', 'ርስ', 'ርም', 'ርን', 'ርብ',
  'ልት', 'ልድ', 'ልክ', 'ልብ', 'ልም', 'ምት', 'ምስ', 'ንት', 'ንድ',
  'ንስ', 'ንግ', 'ፍስ', 'ፍት', 'ክት', 'ግድ', 'ብር'
]);

const ETHIOPIC_DIGIT_MAP: Record<string, string> = {
  '፩': '1', '፪': '2', '፫': '3', '፬': '4', '፭': '5',
  '፮': '6', '፯': '7', '፰': '8', '፱': '9', '፲': '10'
};

export type NameScriptMode = 'am' | 'both' | 'en';

const isEthiopicLetter = (ch: string): boolean => {
  return Boolean(EXACT_FIDEL_MAP[ch]);
};

const transliterateEthiopicWord = (word: string): string => {
  if (!word) return '';

  // Quick check: if word contains no Ethiopic letters, return untouched (preserve Latin/numbers)
  const chars = Array.from(word);
  if (!chars.some((c) => isEthiopicLetter(c) || ETHIOPIC_DIGIT_MAP[c])) {
    return word;
  }

  let result = '';
  let precededByVowel = false;
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    if (ETHIOPIC_DIGIT_MAP[ch]) {
      result += ETHIOPIC_DIGIT_MAP[ch];
      precededByVowel = false;
      i += 1;
      continue;
    }

    if (SIXTH_ORDER_CONSONANTS.has(ch)) {
      // Collect contiguous run of pure 6th-order consonants
      const run: string[] = [];
      while (i < chars.length && SIXTH_ORDER_CONSONANTS.has(chars[i])) {
        run.push(chars[i]);
        i += 1;
      }

      const followedByWordEnd = i >= chars.length || !isEthiopicLetter(chars[i]);
      let j = 0;

      while (j < run.length) {
        const cons = EXACT_FIDEL_MAP[run[j]] || '';
        const rem = run.length - j;

        if (!precededByVowel) {
          // Word start or after a closed syllable: break onset cluster with 'i'
          // (unless it's a single consonant directly before a vowel-bearing letter? No:
          // in Ethiopian names like ግዛው -> Gizaw, ብርሃኑ -> Birhanu, ስም -> Sim, initial C6 takes 'i')
          result += `${cons}i`;
          precededByVowel = true;
          j += 1;
        } else {
          // Preceded by a vowel
          if (rem === 1) {
            result += cons;
            precededByVowel = false;
            j += 1;
          } else if (rem === 2 && followedByWordEnd && ALLOWED_FINAL_CLUSTERS.has(run[j] + run[j + 1])) {
            result += cons + (EXACT_FIDEL_MAP[run[j + 1]] || '');
            precededByVowel = false;
            j += 2;
          } else if (rem === 3 && followedByWordEnd && ALLOWED_FINAL_CLUSTERS.has(run[j + 1] + run[j + 2])) {
            // Preserve final natural cluster (e.g. ቅድስት -> Ki + di + st = Kidist)
            result += `${cons}i`;
            precededByVowel = true;
            j += 1;
          } else if (rem === 2 && followedByWordEnd) {
            // Two final consonants that don't cluster cleanly (e.g. ቅ+ር in ፍቅር -> Fikir)
            result += `${cons}i`;
            precededByVowel = true;
            j += 1;
          } else {
            // rem >= 2 followed by another consonant or another vowel: first closes preceding vowel
            result += cons;
            precededByVowel = false;
            j += 1;
          }
        }
      }
      continue;
    }

    if (VOWEL_ONLY_SIXTH.has(ch)) {
      if (!result.endsWith('i')) {
        result += 'i';
      }
      precededByVowel = true;
      i += 1;
      continue;
    }

    if (EXACT_FIDEL_MAP[ch]) {
      result += EXACT_FIDEL_MAP[ch];
      precededByVowel = true;
      i += 1;
      continue;
    }

    // Punctuation or ASCII character inside mixed word
    result += ch;
    precededByVowel = /[aeiouAEIOU]$/.test(ch);
    i += 1;
  }

  return result;
};

const capitalizeToken = (token: string): string => {
  if (!token) return '';
  // Preserve uppercase acronyms or numbers/codes
  if (/^[A-Z0-9\-\/]+$/.test(token) && token.length <= 4) return token;
  const match = token.match(/^([^a-zA-Z]*)([a-zA-Z])(.*)$/);
  if (!match) return token;
  return `${match[1]}${match[2].toUpperCase()}${match[3].toLowerCase()}`;
};

/**
 * Directly converts any Amharic / Ethiopic name string to readable Title-Cased English letters
 * without semantic translation.
 *
 * Examples:
 * - "ገላትያ ደስታ ዳና" -> "Gelatya Desta Dana"
 * - "ዘላለም ማዴቦ ዋዳ" -> "Zelalem Madebo Wada"
 * - "ካይሮስ ገላትያ ደስታ" -> "Kayros Gelatya Desta"
 * - "ብርሃኑ ተስፋዬ" -> "Birhanu Tesfaye"
 */
export const transliterateAmharicToEnglish = (input: string | number | undefined | null): string => {
  if (input === undefined || input === null) return '';
  const raw = String(input)
    .replace(/፡/g, ' ')
    .replace(/፣/g, ', ')
    .replace(/።/g, '. ')
    .trim();
  if (!raw) return '';

  // Split preserving whitespace tokens while transliterating each sub-token cleanly
  return raw
    .split(/\s+/)
    .map((word) => {
      // Handle slash or hyphenated parts e.g. "አበበ/ከበደ"
      return word
        .split(/([\/\-()])/)
        .map((part) => {
          if (part === '/' || part === '-' || part === '(' || part === ')') return part;
          const latin = transliterateEthiopicWord(part);
          return capitalizeToken(latin);
        })
        .join('');
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Returns formatted name according to the selected script display mode.
 */
export const formatNameForScriptMode = (
  name: string | undefined | null,
  mode: NameScriptMode = 'am'
): string => {
  const clean = String(name || '').trim();
  if (!clean) return '-';
  if (mode === 'en') {
    return transliterateAmharicToEnglish(clean) || clean;
  }
  return clean;
};
