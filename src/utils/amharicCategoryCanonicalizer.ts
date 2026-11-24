/**
 * Pure, dependency-free canonicalizer for Education Levels (የትምህርት ደረጃ)
 * and Occupations (የስራ ዓይነት).
 * Merges English/Amharic synonyms, abbreviations (BA/BSc/BTh/MA/MSc/MDiv/PhD/TVET/KG),
 * Amharic homophones (ሀ/ሐ/ኀ, ሰ/ሠ, አ/ዐ, ጸ/ፀ),
 * and common spelling variants (e.g. "house wife" / "የቤት እመቤት", "goverment" / "የመንግሥት ሠራተኛ")
 * into a single canonical label and lookup key so categories never split into duplicates.
 */

export const UNSPECIFIED_CATEGORY_KEY = '__unspecified__';
export const UNSPECIFIED_CATEGORY_LABEL = 'ያልተገለጸ';

export const normalizeCategoryTextForKey = (text: string | number | undefined | null): string => {
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
    .replace(/ዔ/g, 'ኤ')
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

const isUnspecifiedRaw = (cleaned: string): boolean => {
  if (!cleaned) return true;
  const lower = cleaned.toLowerCase();
  return (
    lower === '-' ||
    lower === '—' ||
    lower === '--' ||
    lower === '_' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'nil' ||
    lower === 'null' ||
    lower === 'unknown' ||
    lower === 'unspecified' ||
    lower === 'ያልተገለጸ' ||
    lower === 'አልተገለጸም'
  );
};

const toCompactNorm = (val: string): string => {
  return normalizeCategoryTextForKey(val).replace(/[^a-z0-9\u1200-\u137f+]/gi, '');
};

const AMHARIC_ORDINAL_GRADES: Record<string, string> = {
  አንደኛክፍል: '1ኛ ክፍል',
  '1ኛክፍል': '1ኛ ክፍል',
  ሁለተኛክፍል: '2ኛ ክፍል',
  ሶስተኛክፍል: '3ኛ ክፍል',
  አራተኛክፍል: '4ኛ ክፍል',
  አምስተኛክፍል: '5ኛ ክፍል',
  ስድስተኛክፍል: '6ኛ ክፍል',
  ሰባተኛክፍል: '7ኛ ክፍል',
  ስምንተኛክፍል: '8ኛ ክፍል',
  ዘጠነኛክፍል: '9ኛ ክፍል',
  አስረኛክፍል: '10ኛ ክፍል',
  አስራአንደኛክፍል: '11ኛ ክፍል',
  አስራሁለተኛክፍል: '12ኛ ክፍል',
  '12ኛክፍልያጠናቀቀ': '12ኛ ክፍል',
  '12ኛክፍልያጠናቀቀች': '12ኛ ክፍል',
  '12ኛክፍልያጠናቀቀችው': '12ኛ ክፍል',
  '12ኛክፍልየጨረሰ': '12ኛ ክፍል',
  '12ኛክፍልየጨረሰች': '12ኛ ክፍል',
  '10ኛክፍልያጠናቀቀ': '10ኛ ክፍል',
  '10ኛክፍልያጠናቀቀች': '10ኛ ክፍል',
  '10ኛክፍልየጨረሰ': '10ኛ ክፍል',
  '10ኛክፍልየጨረሰች': '10ኛ ክፍል',
  '12complete': '12ኛ ክፍል',
  '12thcomplete': '12ኛ ክፍል',
  grade12complete: '12ኛ ክፍል',
  grade12completed: '12ኛ ክፍል',
  '10complete': '10ኛ ክፍል',
  '10thcomplete': '10ኛ ክፍል',
  grade10complete: '10ኛ ክፍል',
  grade10completed: '10ኛ ክፍል'
};

const EDUCATION_EXACT_MAP: Record<string, string> = {
  ...AMHARIC_ORDINAL_GRADES,

  // Uneducated / Illiterate
  ያልተማረ: 'ያልተማረ/ች',
  ያልተማረች: 'ያልተማረ/ች',
  ያልተማረችው: 'ያልተማረ/ች',
  ያልተማሩ: 'ያልተማረ/ች',
  አልተማረም: 'ያልተማረ/ች',
  አልተማረችም: 'ያልተማረ/ች',
  ያልተማረችወይምያልተማረ: 'ያልተማረ/ች',
  uneducated: 'ያልተማረ/ች',
  illiterate: 'ያልተማረ/ች',
  noeducation: 'ያልተማረ/ች',
  noteducated: 'ያልተማረ/ች',
  noschooling: 'ያልተማረ/ች',
  none: 'ያልተማረ/ች',
  የለውም: 'ያልተማረ/ች',
  የላትም: 'ያልተማረ/ች',
  ምንም: 'ያልተማረ/ች',

  // Infant / Not started
  ጨቅላ: 'ጨቅላ/ያልጀመረ',
  ያልጀመረ: 'ጨቅላ/ያልጀመረ',
  ያልጀመረች: 'ጨቅላ/ያልጀመረ',
  ጨቅላያልጀመረ: 'ጨቅላ/ያልጀመረ',
  ገናያልጀመረ: 'ጨቅላ/ያልጀመረ',
  notstarted: 'ጨቅላ/ያልጀመረ',
  preschoolage: 'ጨቅላ/ያልጀመረ',
  underage: 'ጨቅላ/ያልጀመረ',
  infant: 'ጨቅላ/ያልጀመረ',
  baby: 'ጨቅላ/ያልጀመረ',
  toddler: 'ጨቅላ/ያልጀመረ',

  // Kindergarten (KG)
  kg: 'መዋዕለ ሕፃናት (KG)',
  kg1: 'መዋዕለ ሕፃናት (KG)',
  kg2: 'መዋዕለ ሕፃናት (KG)',
  kg3: 'መዋዕለ ሕፃናት (KG)',
  prekg: 'መዋዕለ ሕፃናት (KG)',
  kindergarten: 'መዋዕለ ሕፃናት (KG)',
  preschool: 'መዋዕለ ሕፃናት (KG)',
  nursery: 'መዋዕለ ሕፃናት (KG)',
  ኬጂ: 'መዋዕለ ሕፃናት (KG)',
  ኬጂ1: 'መዋዕለ ሕፃናት (KG)',
  ኬጂ2: 'መዋዕለ ሕፃናት (KG)',
  ኬጂ3: 'መዋዕለ ሕፃናት (KG)',
  መዋእለህጻናት: 'መዋዕለ ሕፃናት (KG)',
  መዋእለህጻናትkg: 'መዋዕለ ሕፃናት (KG)',
  መዋእለህጻናትkg1: 'መዋዕለ ሕፃናት (KG)',
  መዋእለህጻናትkg2: 'መዋዕለ ሕፃናት (KG)',
  መዋእለህጻናትkg3: 'መዋዕለ ሕፃናት (KG)',
  ማቆያ: 'መዋዕለ ሕፃናት (KG)',

  // Basic / Adult literacy
  መሰረተትምህርት: 'መሠረተ ትምህርት',
  መሰረታዊትምህርት: 'መሠረተ ትምህርት',
  ማንበብናመጻፍ: 'መሠረተ ትምህርት',
  ማንበብእናመጻፍ: 'መሠረተ ትምህርት',
  basiceducation: 'መሠረተ ትምህርት',
  basicliteracy: 'መሠረተ ትምህርት',
  basic: 'መሠረተ ትምህርት',
  adulteducation: 'መሠረተ ትምህርት',
  readandwrite: 'መሠረተ ትምህርት',
  readingandwriting: 'መሠረተ ትምህርት',
  literate: 'መሠረተ ትምህርት',

  // Grade ranges
  '1ኛ4ኛክፍል': '1ኛ - 4ኛ ክፍል',
  '14ኛክፍል': '1ኛ - 4ኛ ክፍል',
  '14ክፍል': '1ኛ - 4ኛ ክፍል',
  '14': '1ኛ - 4ኛ ክፍል',
  grade14: '1ኛ - 4ኛ ክፍል',
  grades14: '1ኛ - 4ኛ ክፍል',
  '5ኛ8ኛክፍል': '5ኛ - 8ኛ ክፍል',
  '58ኛክፍል': '5ኛ - 8ኛ ክፍል',
  '58ክፍል': '5ኛ - 8ኛ ክፍል',
  '58': '5ኛ - 8ኛ ክፍል',
  grade58: '5ኛ - 8ኛ ክፍል',
  grades58: '5ኛ - 8ኛ ክፍል',
  '9ኛ10ኛክፍል': '9ኛ - 10ኛ ክፍል',
  '910ኛክፍል': '9ኛ - 10ኛ ክፍል',
  '910ክፍል': '9ኛ - 10ኛ ክፍል',
  '910': '9ኛ - 10ኛ ክፍል',
  grade910: '9ኛ - 10ኛ ክፍል',
  grades910: '9ኛ - 10ኛ ክፍል',
  '11ኛ12ኛክፍል': '11ኛ - 12ኛ ክፍል',
  '1112ኛክፍል': '11ኛ - 12ኛ ክፍል',
  '1112ክፍል': '11ኛ - 12ኛ ክፍል',
  '1112': '11ኛ - 12ኛ ክፍል',
  grade1112: '11ኛ - 12ኛ ክፍል',
  grades1112: '11ኛ - 12ኛ ክፍል',
  preparatory: '11ኛ - 12ኛ ክፍል',
  prep: '11ኛ - 12ኛ ክፍል',
  መሰናዶ: '11ኛ - 12ኛ ክፍል',
  elementary: 'አንደኛ ደረጃ (1–8)',
  elementaryschool: 'አንደኛ ደረጃ (1–8)',
  primary: 'አንደኛ ደረጃ (1–8)',
  primaryschool: 'አንደኛ ደረጃ (1–8)',
  '18': 'አንደኛ ደረጃ (1–8)',
  grades18: 'አንደኛ ደረጃ (1–8)',
  አንደኛደረጃ: 'አንደኛ ደረጃ (1–8)',
  secondary: 'ሁለተኛ ደረጃ (9–12)',
  secondaryschool: 'ሁለተኛ ደረጃ (9–12)',
  highschool: 'ሁለተኛ ደረጃ (9–12)',
  '912': 'ሁለተኛ ደረጃ (9–12)',
  grades912: 'ሁለተኛ ደረጃ (9–12)',
  ሁለተኛደረጃ: 'ሁለተኛ ደረጃ (9–12)',
  college: 'ኮሌጅ / ዩኒቨርሲቲ',
  collegestudent: 'ኮሌጅ / ዩኒቨርሲቲ',
  university: 'ኮሌጅ / ዩኒቨርሲቲ',
  universitystudent: 'ኮሌጅ / ዩኒቨርሲቲ',
  undergraduate: 'ኮሌጅ / ዩኒቨርሲቲ',
  ኮሌጅ: 'ኮሌጅ / ዩኒቨርሲቲ',
  ኮለጅ: 'ኮሌጅ / ዩኒቨርሲቲ',
  ዩኒቨርሲቲ: 'ኮሌጅ / ዩኒቨርሲቲ',
  ዩኒቨርስቲ: 'ኮሌጅ / ዩኒቨርሲቲ',
  የሁለተኛደረጃኮሌጅ: 'ኮሌጅ / ዩኒቨርሲቲ',

  // Bible School / Theology (non-degree specified)
  bibleschool: 'መጽሐፍ ቅዱስ ት/ቤት',
  biblecollege: 'መጽሐፍ ቅዱስ ት/ቤት',
  theology: 'መጽሐፍ ቅዱስ ት/ቤት',
  theological: 'መጽሐፍ ቅዱስ ት/ቤት',
  መጽሀፍቅዱስትቤት: 'መጽሐፍ ቅዱስ ት/ቤት',
  መጽሀፍቅዱስትምህርትቤት: 'መጽሐፍ ቅዱስ ት/ቤት',
  ስነመለኮት: 'መጽሐፍ ቅዱስ ት/ቤት',

  // TVET / Certificate
  tvet: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  certificate: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  cert: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  vocational: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  coc: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  '10+1': 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  '10+2': 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  '10+3': 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level1: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level2: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level3: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level4: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level5: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  leveli: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  levelii: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  leveliii: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  leveliv: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  levelv: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሌቭል1: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሌቭል2: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሌቭል3: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሌቭል4: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሌቭል5: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ቴክኒክ: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ቴክኒክናሙያ: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ቴክኒክእናሙያ: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ቴክኒክናሙያtvetሰርተፊኬት: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሰርተፊኬት: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሰርቲፊኬት: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሰርትፍኬት: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ሰርተፊኬትcertificate: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  ምስክርወረቀት: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',

  // Diploma (ዲፕሎማ / ድፕሎማ / Diploma)
  diploma: 'ዲፕሎማ',
  dip: 'ዲፕሎማ',
  advdiploma: 'ዲፕሎማ',
  advanceddiploma: 'ዲፕሎማ',
  collegediploma: 'ዲፕሎማ',
  '12+2': 'ዲፕሎማ',
  '10+4': 'ዲፕሎማ',
  ዲፕሎማ: 'ዲፕሎማ',
  ድፕሎማ: 'ዲፕሎማ',
  ደፕሎማ: 'ዲፕሎማ',
  ዲፕሎም: 'ዲፕሎማ',
  ድፕሎም: 'ዲፕሎማ',
  ድፕ: 'ዲፕሎማ',
  ዲፕሎማdiploma: 'ዲፕሎማ',
  ኮሌጅዲፕሎማ: 'ዲፕሎማ',

  // Degree (ዲግሪ / ድግሪ / Degree / BA / BSc / BTh)
  degree: 'ዲግሪ',
  '1stdegree': 'ዲግሪ',
  firstdegree: 'ዲግሪ',
  bachelor: 'ዲግሪ',
  bachelors: 'ዲግሪ',
  bachelordegree: 'ዲግሪ',
  bachelorsdegree: 'ዲግሪ',
  ba: 'ዲግሪ',
  bsc: 'ዲግሪ',
  bs: 'ዲግሪ',
  bth: 'ዲግሪ',
  bed: 'ዲግሪ',
  bba: 'ዲግሪ',
  llb: 'ዲግሪ',
  beng: 'ዲግሪ',
  bpharm: 'ዲግሪ',
  btech: 'ዲግሪ',
  babsc: 'ዲግሪ',
  bscdegree: 'ዲግሪ',
  badegree: 'ዲግሪ',
  bthdegree: 'ዲግሪ',
  ዲግሪ: 'ዲግሪ',
  ድግሪ: 'ዲግሪ',
  ደግሪ: 'ዲግሪ',
  ዲግሪdegree: 'ዲግሪ',
  ዲግሪbthbabsc: 'ዲግሪ',
  የመጀመሪያዲግሪ: 'ዲግሪ',
  መጀመሪያዲግሪ: 'ዲግሪ',
  ባችለር: 'ዲግሪ',

  // Masters (ማስተርስ / Masters / MA / MSc / MDiv)
  masters: 'ማስተርስ',
  master: 'ማስተርስ',
  mastersdegree: 'ማስተርስ',
  masterdegree: 'ማስተርስ',
  '2nddegree': 'ማስተርስ',
  seconddegree: 'ማስተርስ',
  ma: 'ማስተርስ',
  msc: 'ማስተርስ',
  mdiv: 'ማስተርስ',
  mth: 'ማስተርስ',
  mba: 'ማስተርስ',
  med: 'ማስተርስ',
  mph: 'ማስተርስ',
  llm: 'ማስተርስ',
  mtech: 'ማስተርስ',
  ማስተርስ: 'ማስተርስ',
  ማስተር: 'ማስተርስ',
  ማስተርስዲግሪ: 'ማስተርስ',
  ማስተርስmasters: 'ማስተርስ',
  ማስተርስmastersmdivma: 'ማስተርስ',
  ሁለተኛዲግሪ: 'ማስተርስ',
  '2ኛዲግሪ': 'ማስተርስ',

  // Doctorate (ዶክትሬት / PhD)
  phd: 'ዶክትሬት',
  doctorate: 'ዶክትሬት',
  doctoral: 'ዶክትሬት',
  '3rddegree': 'ዶክትሬት',
  thirddegree: 'ዶክትሬት',
  ዶክትሬት: 'ዶክትሬት',
  ዶክተሬት: 'ዶክትሬት',
  ፒኤችዲ: 'ዶክትሬት',
  ዶክትሬትphd: 'ዶክትሬት',
  '3ኛዲግሪ': 'ዶክትሬት'
};

const OCCUPATION_EXACT_MAP: Record<string, string> = {
  // Housewife (የቤት እመቤት / house wife / housewife)
  housewife: 'የቤት እመቤት',
  houswife: 'የቤት እመቤት',
  hwife: 'የቤት እመቤት',
  homemaker: 'የቤት እመቤት',
  housekeeper: 'የቤት እመቤት',
  የቤትእመቤት: 'የቤት እመቤት',
  ቤትእመቤት: 'የቤት እመቤት',
  እመቤት: 'የቤት እመቤት',
  የቤትእመበት: 'የቤት እመቤት',
  ቤትእመበት: 'የቤት እመቤት',

  // At home (child/dependent)
  የቤትውስጥ: 'የቤት ውስጥ',
  ቤትውስጥ: 'የቤት ውስጥ',
  athome: 'የቤት ውስጥ',
  stayathome: 'የቤት ውስጥ',
  dependent: 'የቤት ውስጥ',
  childathome: 'የቤት ውስጥ',

  // Domestic worker
  የቤትሰራተኛ: 'የቤት ሠራተኛ',
  ቤትሰራተኛ: 'የቤት ሠራተኛ',
  housemaid: 'የቤት ሠራተኛ',
  maid: 'የቤት ሠራተኛ',
  domesticworker: 'የቤት ሠራተኛ',
  houseservant: 'የቤት ሠራተኛ',

  // Student
  student: 'ተማሪ',
  students: 'ተማሪ',
  pupil: 'ተማሪ',
  learner: 'ተማሪ',
  scholar: 'ተማሪ',
  collegestudent: 'ተማሪ',
  universitystudent: 'ተማሪ',
  highschoolstudent: 'ተማሪ',
  ተማሪ: 'ተማሪ',
  ተማሪዎች: 'ተማሪ',
  የትቤትተማሪ: 'ተማሪ',
  የትምህርትቤትተማሪ: 'ተማሪ',
  የኮሌጅተማሪ: 'ተማሪ',
  የዩኒቨርሲቲተማሪ: 'ተማሪ',

  // Government employee
  government: 'የመንግሥት ሠራተኛ',
  goverment: 'የመንግሥት ሠራተኛ',
  gov: 'የመንግሥት ሠራተኛ',
  govt: 'የመንግሥት ሠራተኛ',
  govemployee: 'የመንግሥት ሠራተኛ',
  govtemployee: 'የመንግሥት ሠራተኛ',
  governmentemployee: 'የመንግሥት ሠራተኛ',
  govermentemployee: 'የመንግሥት ሠራተኛ',
  governmentworker: 'የመንግሥት ሠራተኛ',
  govstaff: 'የመንግሥት ሠራተኛ',
  civilservant: 'የመንግሥት ሠራተኛ',
  publicservant: 'የመንግሥት ሠራተኛ',
  publicemployee: 'የመንግሥት ሠራተኛ',
  የመንግስትሰራተኛ: 'የመንግሥት ሠራተኛ',
  መንግስትሰራተኛ: 'የመንግሥት ሠራተኛ',
  የመንግስት: 'የመንግሥት ሠራተኛ',
  መንግስት: 'የመንግሥት ሠራተኛ',
  መሰራተኛ: 'የመንግሥት ሠራተኛ',
  የመሰራተኛ: 'የመንግሥት ሠራተኛ',
  ሲቪልሰርቫንት: 'የመንግሥት ሠራተኛ',

  // Private / Self-employed
  private: 'የግል ሠራተኛ',
  privateemployee: 'የግል ሠራተኛ',
  privateworker: 'የግል ሠራተኛ',
  privatesector: 'የግል ሠራተኛ',
  selfemployed: 'የግል ሠራተኛ',
  ownbusiness: 'የግል ሠራተኛ',
  freelance: 'የግል ሠራተኛ',
  freelancer: 'የግል ሠራተኛ',
  የግል: 'የግል ሠራተኛ',
  የግልስራ: 'የግል ሠራተኛ',
  የግልሰራተኛ: 'የግል ሠራተኛ',
  ግልሰራተኛ: 'የግል ሠራተኛ',
  ግልስራ: 'የግል ሠራተኛ',
  የራሱስራ: 'የግል ሠራተኛ',
  የራሷስራ: 'የግል ሠራተኛ',
  የራስስራ: 'የግል ሠራተኛ',

  // Merchant / Trader
  merchant: 'ነጋዴ',
  trader: 'ነጋዴ',
  business: 'ነጋዴ',
  businessman: 'ነጋዴ',
  businesswoman: 'ነጋዴ',
  businessperson: 'ነጋዴ',
  shopkeeper: 'ነጋዴ',
  shopowner: 'ነጋዴ',
  retailer: 'ነጋዴ',
  wholesaler: 'ነጋዴ',
  vendor: 'ነጋዴ',
  trade: 'ነጋዴ',
  commerce: 'ነጋዴ',
  ነጋዴ: 'ነጋዴ',
  ንግድ: 'ነጋዴ',
  የንግድስራ: 'ነጋዴ',
  በንግድ: 'ነጋዴ',

  // Farmer
  farmer: 'ገበሬ',
  farming: 'ገበሬ',
  agriculture: 'ገበሬ',
  peasant: 'ገበሬ',
  agronomist: 'ገበሬ',
  ገበሬ: 'ገበሬ',
  አርሶአደር: 'ገበሬ',
  ግብርና: 'ገበሬ',
  እርሻ: 'ገበሬ',

  // Daily laborer
  dailylaborer: 'የቀን ሠራተኛ',
  dailylabourer: 'የቀን ሠራተኛ',
  daylaborer: 'የቀን ሠራተኛ',
  daylabourer: 'የቀን ሠራተኛ',
  dailyworker: 'የቀን ሠራተኛ',
  laborer: 'የቀን ሠራተኛ',
  labourer: 'የቀን ሠራተኛ',
  casualworker: 'የቀን ሠራተኛ',
  የቀንሰራተኛ: 'የቀን ሠራተኛ',
  ቀንሰራተኛ: 'የቀን ሠራተኛ',
  የጉልበትሰራተኛ: 'የቀን ሠራተኛ',
  የጉልበትስራ: 'የቀን ሠራተኛ',
  ጉልበትሰራተኛ: 'የቀን ሠራተኛ',

  // Church minister / evangelist / pastor
  evangelist: 'አገልጋይ / ወንጌላዊ / ቄስ',
  pastor: 'አገልጋይ / ወንጌላዊ / ቄስ',
  minister: 'አገልጋይ / ወንጌላዊ / ቄስ',
  preacher: 'አገልጋይ / ወንጌላዊ / ቄስ',
  clergy: 'አገልጋይ / ወንጌላዊ / ቄስ',
  missionary: 'አገልጋይ / ወንጌላዊ / ቄስ',
  churchservant: 'አገልጋይ / ወንጌላዊ / ቄስ',
  fulltimeminister: 'አገልጋይ / ወንጌላዊ / ቄስ',
  deacon: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ወንጌላዊ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ፓስተር: 'አገልጋይ / ወንጌላዊ / ቄስ',
  መጋቢ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ቄስ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  አገልጋይ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ሚሽነሪ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ዲያቆን: 'አገልጋይ / ወንጌላዊ / ቄስ',
  የሙሉጊዜአገልጋይ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  የቤተክርስቲያንአገልጋይ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ቤክአገልጋይ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ወንጌልአገልጋይ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  አገልጋይወንጌላዊቄስ: 'አገልጋይ / ወንጌላዊ / ቄስ',

  // Retired
  retired: 'ጡረተኛ',
  retiree: 'ጡረተኛ',
  pension: 'ጡረተኛ',
  pensioner: 'ጡረተኛ',
  ጡረተኛ: 'ጡረተኛ',
  ጡረታ: 'ጡረተኛ',
  በጡረታ: 'ጡረተኛ',

  // Unemployed
  unemployed: 'ስራ የሌለው/ች',
  jobless: 'ስራ የሌለው/ች',
  nojob: 'ስራ የሌለው/ች',
  nowork: 'ስራ የሌለው/ች',
  notworking: 'ስራ የሌለው/ች',
  withoutjob: 'ስራ የሌለው/ች',
  none: 'ስራ የሌለው/ች',
  የለውም: 'ስራ የሌለው/ች',
  የላትም: 'ስራ የሌለው/ች',
  ስራየሌለው: 'ስራ የሌለው/ች',
  ስራየሌላት: 'ስራ የሌለው/ች',
  ስራየሌለውች: 'ስራ የሌለው/ች',
  ስራየለሽ: 'ስራ የሌለው/ች',
  ስራአጥ: 'ስራ የሌለው/ች',
  ስራየለም: 'ስራ የሌለው/ች',
  ያለስራ: 'ስራ የሌለው/ች',

  // Teacher / Educator
  teacher: 'መምህር',
  teachers: 'መምህር',
  instructor: 'መምህር',
  lecturer: 'መምህር',
  educator: 'መምህር',
  professor: 'መምህር',
  kgteacher: 'መምህር',
  መምህር: 'መምህር',
  መምህርት: 'መምህር',
  አስተማሪ: 'መምህር',
  ፕሮፌሰር: 'መምህር',

  // Healthcare
  nurse: 'የጤና ባለሙያ',
  doctor: 'የጤና ባለሙያ',
  physician: 'የጤና ባለሙያ',
  midwife: 'የጤና ባለሙያ',
  pharmacist: 'የጤና ባለሙያ',
  druggist: 'የጤና ባለሙያ',
  labtechnician: 'የጤና ባለሙያ',
  healthofficer: 'የጤና ባለሙያ',
  healthworker: 'የጤና ባለሙያ',
  healthprofessional: 'የጤና ባለሙያ',
  clinicalnurse: 'የጤና ባለሙያ',
  medicaldoctor: 'የጤና ባለሙያ',
  ነርስ: 'የጤና ባለሙያ',
  ዶክተር: 'የጤና ባለሙያ',
  ሀኪም: 'የጤና ባለሙያ',
  ፋርማሲስት: 'የጤና ባለሙያ',
  አዋላጅ: 'የጤና ባለሙያ',
  የጤናባለሙያ: 'የጤና ባለሙያ',

  // Driver
  driver: 'ሹፌር',
  drivers: 'ሹፌር',
  chauffeur: 'ሹፌር',
  taxidriver: 'ሹፌር',
  bajajdriver: 'ሹፌር',
  truckdriver: 'ሹፌር',
  ሹፌር: 'ሹፌር',
  ሾፌር: 'ሹፌር',
  አሽከርካሪ: 'ሹፌር',
  ባጃጅ: 'ሹፌር',

  // Engineer
  engineer: 'ኢንጂነር',
  civilengineer: 'ኢንጂነር',
  electricalengineer: 'ኢንጂነር',
  mechanicalengineer: 'ኢንጂነር',
  architect: 'ኢንጂነር',
  surveyor: 'ኢንጂነር',
  ኢንጂነር: 'ኢንጂነር',
  መሀንዲስ: 'ኢንጂነር',
  መሃንዲስ: 'ኢንጂነር',
  አርክቴክት: 'ኢንጂነር',

  // Accountant / Banker / Finance
  accountant: 'የሂሳብ / የባንክ ባለሙያ',
  banker: 'የሂሳብ / የባንክ ባለሙያ',
  cashier: 'የሂሳብ / የባንክ ባለሙያ',
  auditor: 'የሂሳብ / የባንክ ባለሙያ',
  finance: 'የሂሳብ / የባንክ ባለሙያ',
  bookkeeper: 'የሂሳብ / የባንክ ባለሙያ',
  አካውንታንት: 'የሂሳብ / የባንክ ባለሙያ',
  ሂሳብባለሙያ: 'የሂሳብ / የባንክ ባለሙያ',
  የሂሳብባለሙያ: 'የሂሳብ / የባንክ ባለሙያ',
  የሂሳብየባንክባለሙያ: 'የሂሳብ / የባንክ ባለሙያ',
  የባንክሰራተኛ: 'የሂሳብ / የባንክ ባለሙያ',
  ባንክ: 'የሂሳብ / የባንክ ባለሙያ',
  ኦዲተር: 'የሂሳብ / የባንክ ባለሙያ',

  // Guard / Security
  guard: 'ጥበቃ',
  security: 'ጥበቃ',
  securityguard: 'ጥበቃ',
  watchman: 'ጥበቃ',
  ዘበኛ: 'ጥበቃ',
  ጥበቃ: 'ጥበቃ',
  የጥበቃሰራተኛ: 'ጥበቃ',

  // Police / Military
  police: 'ፖሊስ / መከላከያ',
  policeman: 'ፖሊስ / መከላከያ',
  policewoman: 'ፖሊስ / መከላከያ',
  policeofficer: 'ፖሊስ / መከላከያ',
  soldier: 'ፖሊስ / መከላከያ',
  military: 'ፖሊስ / መከላከያ',
  army: 'ፖሊስ / መከላከያ',
  ፖሊስ: 'ፖሊስ / መከላከያ',
  ወታደር: 'ፖሊስ / መከላከያ',
  መከላከያ: 'ፖሊስ / መከላከያ',
  ፖሊስመከላከያ: 'ፖሊስ / መከላከያ',

  // Carpenter
  carpenter: 'አናጺ',
  woodworker: 'አናጺ',
  አናጺ: 'አናጺ',
  አናጢ: 'አናጺ',
  የእንጨትስራ: 'አናጺ',

  // Mason / Construction
  mason: 'ግንበኛ',
  builder: 'ግንበኛ',
  construction: 'ግንበኛ',
  constructionworker: 'ግንበኛ',
  painter: 'ግንበኛ',
  plasterer: 'ግንበኛ',
  ግንበኛ: 'ግንበኛ',
  የግንባታሰራተኛ: 'ግንበኛ',

  // Tailor / Weaver
  tailor: 'ልብስ ሰፊ',
  seamstress: 'ልብስ ሰፊ',
  weaver: 'ልብስ ሰፊ',
  dressmaker: 'ልብስ ሰፊ',
  ልብስሰፊ: 'ልብስ ሰፊ',
  ሸማኔ: 'ልብስ ሰፊ',
  የልብስስፌት: 'ልብስ ሰፊ',

  // NGO
  ngo: 'የNGO ሠራተኛ',
  ngoemployee: 'የNGO ሠራተኛ',
  ngoworker: 'የNGO ሠራተኛ',
  charity: 'የNGO ሠራተኛ',
  የngoሰራተኛ: 'የNGO ሠራተኛ',

  // Technician / Mechanic / IT
  mechanic: 'ቴክኒሻን / መካኒክ',
  technician: 'ቴክኒሻን / መካኒክ',
  electrician: 'ቴክኒሻን / መካኒክ',
  plumber: 'ቴክኒሻን / መካኒክ',
  welder: 'ቴክኒሻን / መካኒክ',
  softwaredeveloper: 'ቴክኒሻን / መካኒክ',
  developer: 'ቴክኒሻን / መካኒክ',
  it: 'ቴክኒሻን / መካኒክ',
  መካኒክ: 'ቴክኒሻን / መካኒክ',
  ቴክኒሻን: 'ቴክኒሻን / መካኒክ',
  ኤሌክትሪሻን: 'ቴክኒሻን / መካኒክ',
  ቴክኒሻንመካኒክ: 'ቴክኒሻን / መካኒክ',

  // Office / Secretary / Clerk
  secretary: 'ጸሐፊ / የቢሮ ሠራተኛ',
  clerk: 'ጸሐፊ / የቢሮ ሠራተኛ',
  officeworker: 'ጸሐፊ / የቢሮ ሠራተኛ',
  office: 'ጸሐፊ / የቢሮ ሠራተኛ',
  receptionist: 'ጸሐፊ / የቢሮ ሠራተኛ',
  admin: 'ጸሐፊ / የቢሮ ሠራተኛ',
  manager: 'ጸሐፊ / የቢሮ ሠራተኛ',
  ጸሀፊ: 'ጸሐፊ / የቢሮ ሠራተኛ',
  የቢሮሰራተኛ: 'ጸሐፊ / የቢሮ ሠራተኛ',
  ጸሀፊየቢሮሰራተኛ: 'ጸሐፊ / የቢሮ ሠራተኛ',

  // Cleaner / Janitor
  cleaner: 'የጽዳት ሠራተኛ',
  janitor: 'የጽዳት ሠራተኛ',
  sanitation: 'የጽዳት ሠራተኛ',
  የጽዳትሰራተኛ: 'የጽዳት ሠራተኛ',
  ጽዳት: 'የጽዳት ሠራተኛ',

  // Legal
  lawyer: 'የሕግ ባለሙያ',
  attorney: 'የሕግ ባለሙያ',
  judge: 'የሕግ ባለሙያ',
  advocate: 'የሕግ ባለሙያ',
  የህግባለሙያ: 'የሕግ ባለሙያ',
  ጠበቃ: 'የሕግ ባለሙያ',
  ዳኛ: 'የሕግ ባለሙያ',

  // Cook / Hospitality
  cook: 'የምግብና መስተንግዶ ሠራተኛ',
  chef: 'የምግብና መስተንግዶ ሠራተኛ',
  baker: 'የምግብና መስተንግዶ ሠራተኛ',
  waiter: 'የምግብና መስተንግዶ ሠራተኛ',
  waitress: 'የምግብና መስተንግዶ ሠራተኛ',
  ወጥቤት: 'የምግብና መስተንግዶ ሠራተኛ',
  ዳቦጋጋሪ: 'የምግብና መስተንግዶ ሠራተኛ',
  አስተናጋጅ: 'የምግብና መስተንግዶ ሠራተኛ',
  የምግብናመስተንግዶሰራተኛ: 'የምግብና መስተንግዶ ሠራተኛ',

  // Barber / Salon
  barber: 'ጸጉር አስተካካይ / ሳሎን',
  hairdresser: 'ጸጉር አስተካካይ / ሳሎን',
  salon: 'ጸጉር አስተካካይ / ሳሎን',
  beautysalon: 'ጸጉር አስተካካይ / ሳሎን',
  ጸጉርአስተካካይ: 'ጸጉር አስተካካይ / ሳሎን',
  ውበትሳሎን: 'ጸጉር አስተካካይ / ሳሎን',
  ሳሎን: 'ጸጉር አስተካካይ / ሳሎን'
};

export const canonicalizeEducationLevel = (raw: string | undefined | null): string | undefined => {
  const cleaned = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (isUnspecifiedRaw(cleaned)) return undefined;

  const compact = toCompactNorm(cleaned);
  if (!compact) return undefined;

  if (EDUCATION_EXACT_MAP[compact]) {
    return EDUCATION_EXACT_MAP[compact];
  }

  // Grade range patterns
  if (/^(?:grade|grades)?1(?:st|ኛ)?(?:to|-|–)?4(?:th|ኛ)?(?:grade|ክፍል)?$/i.test(compact)) {
    return '1ኛ - 4ኛ ክፍል';
  }
  if (/^(?:grade|grades)?5(?:th|ኛ)?(?:to|-|–)?8(?:th|ኛ)?(?:grade|ክፍል)?$/i.test(compact)) {
    return '5ኛ - 8ኛ ክፍል';
  }
  if (/^(?:grade|grades)?9(?:th|ኛ)?(?:to|-|–)?10(?:th|ኛ)?(?:grade|ክፍል)?$/i.test(compact)) {
    return '9ኛ - 10ኛ ክፍል';
  }
  if (/^(?:grade|grades)?11(?:th|ኛ)?(?:to|-|–)?12(?:th|ኛ)?(?:grade|ክፍል)?$/i.test(compact)) {
    return '11ኛ - 12ኛ ክፍል';
  }

  // Single grade match (e.g. "Grade 10", "10th grade", "10ኛ ክፍል", "Class 7", "12ኛ ክፍል ያጠናቀቀ")
  const singleGradeMatch = compact.match(
    /^(?:grade|gr|g|class|ክፍል)?(\d{1,2})(?:st|nd|rd|th|ኛ)?(?:grade|ክፍል)?(?:complete|completed|ያጠናቀቀ|ያጠናቀቀች|የጨረሰ|የጨረሰች)?$/i
  );
  if (singleGradeMatch) {
    const gradeNum = parseInt(singleGradeMatch[1], 10);
    if (gradeNum >= 1 && gradeNum <= 12) {
      return `${gradeNum}ኛ ክፍል`;
    }
  }

  // Embedded grade extraction inside bilingual strings like "10ኛ ክፍል (Grade 10)" or "Grade 8 Student"
  const lower = cleaned.toLowerCase();
  const spaceNorm = normalizeCategoryTextForKey(cleaned);

  if (
    compact.includes('phd') ||
    compact.includes('doctorate') ||
    compact.includes('doctoral') ||
    compact.includes('ዶክትሬት') ||
    compact.includes('ዶክተሬት') ||
    compact.includes('ፒኤችዲ')
  ) {
    return 'ዶክትሬት';
  }
  if (
    compact.includes('master') ||
    compact.includes('ማስተር') ||
    /\b(ma|m\.a|msc|m\.sc|mdiv|m\.div|mba|mph|med|m\.ed|mth|m\.th|llm|mtech)\b/i.test(lower)
  ) {
    return 'ማስተርስ';
  }
  if (
    compact.includes('degree') ||
    compact.includes('bachelor') ||
    compact.includes('ባችለር') ||
    compact.includes('ዲግሪ') ||
    compact.includes('ድግሪ') ||
    compact.includes('ደግሪ') ||
    /\b(ba|b\.a|bsc|b\.sc|bth|b\.th|bed|b\.ed|bba|llb|beng|bpharm|btech)\b/i.test(lower)
  ) {
    return 'ዲግሪ';
  }
  if (
    compact.includes('diploma') ||
    compact.includes('ዲፕሎማ') ||
    compact.includes('ድፕሎማ') ||
    compact.includes('ደፕሎማ') ||
    compact.includes('ዲፕሎም') ||
    /\bdip\b/i.test(lower)
  ) {
    return 'ዲፕሎማ';
  }
  if (
    compact.includes('tvet') ||
    compact.includes('certificate') ||
    compact.includes('vocational') ||
    compact.includes('ቴክኒክ') ||
    compact.includes('ሰርተፊኬት') ||
    compact.includes('ሰርቲፊኬት') ||
    /\b(10\+[123]|coc|cert)\b/i.test(lower) ||
    /\blevel\s*(?:[1-5]|i{1,3}|iv|v)\b/i.test(lower) ||
    compact.includes('ሌቭል')
  ) {
    return 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)';
  }
  if (
    compact.includes('kindergarten') ||
    compact.includes('preschool') ||
    compact.includes('nursery') ||
    compact.includes('መዋእለህጻናት') ||
    compact.includes('ኬጂ') ||
    /\bkg\s*[1-3]?\b/i.test(lower)
  ) {
    return 'መዋዕለ ሕፃናት (KG)';
  }
  if (
    compact.includes('bibleschool') ||
    compact.includes('biblecollege') ||
    compact.includes('theolog') ||
    compact.includes('መጽሀፍቅዱስትቤት') ||
    compact.includes('ስነመለኮት')
  ) {
    return 'መጽሐፍ ቅዱስ ት/ቤት';
  }
  if (
    compact.includes('illiterate') ||
    compact.includes('uneducated') ||
    compact.includes('ያልተማረ') ||
    compact.includes('አልተማረ')
  ) {
    return 'ያልተማረ/ች';
  }
  if (
    compact.includes('basiceducation') ||
    compact.includes('basicliteracy') ||
    compact.includes('adulteducation') ||
    compact.includes('መሰረተትምህርት') ||
    compact.includes('መሰረታዊትምህርት') ||
    compact.includes('ማንበብናመጻፍ')
  ) {
    return 'መሠረተ ትምህርት';
  }
  if (compact.includes('elementary') || compact.includes('primaryschool') || /\bprimary\b/i.test(lower)) {
    return 'አንደኛ ደረጃ (1–8)';
  }
  if (compact.includes('highschool') || /\bsecondary\b/i.test(lower)) {
    return 'ሁለተኛ ደረጃ (9–12)';
  }
  if (compact.includes('preparatory') || compact.includes('መሰናዶ')) {
    return '11ኛ - 12ኛ ክፍል';
  }
  if (compact.includes('university') || compact.includes('college') || compact.includes('ዩኒቨርሲቲ') || compact.includes('ኮሌጅ')) {
    return 'ኮሌጅ / ዩኒቨርሲቲ';
  }

  const bilingualGrade = spaceNorm.match(/\b(?:grade|gr|class)\s*(\d{1,2})(?:st|nd|rd|th)?\b/i)
    || cleaned.match(/(\d{1,2})\s*ኛ\s*ክፍል/);
  if (bilingualGrade) {
    const num = parseInt(bilingualGrade[1], 10);
    if (num >= 1 && num <= 12) {
      return `${num}ኛ ክፍል`;
    }
  }

  return cleaned;
};

export const canonicalizeOccupation = (raw: string | undefined | null): string | undefined => {
  const cleaned = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (isUnspecifiedRaw(cleaned)) return undefined;

  const compact = toCompactNorm(cleaned);
  if (!compact) return undefined;

  if (OCCUPATION_EXACT_MAP[compact]) {
    return OCCUPATION_EXACT_MAP[compact];
  }

  const lower = cleaned.toLowerCase();

  if (
    compact.includes('housewife') ||
    compact.includes('houswife') ||
    compact.includes('homemaker') ||
    compact.includes('የቤትእመቤት') ||
    compact.includes('ቤትእመቤት')
  ) {
    return 'የቤት እመቤት';
  }
  if (compact.includes('housemaid') || compact.includes('domesticworker') || compact.includes('የቤትሰራተኛ') || compact.includes('ቤትሰራተኛ')) {
    return 'የቤት ሠራተኛ';
  }
  if (compact.includes('stayathome') || compact.includes('የቤትውስጥ') || /\bat\s*home\b/i.test(lower)) {
    return 'የቤት ውስጥ';
  }
  if (
    compact.includes('government') ||
    compact.includes('goverment') ||
    compact.includes('civilservant') ||
    compact.includes('publicservant') ||
    compact.includes('የመንግስትሰራተኛ') ||
    compact.includes('መንግስትሰራተኛ') ||
    /\bgov(?:'?t)?\s*(?:employee|worker|staff)?\b/i.test(lower)
  ) {
    return 'የመንግሥት ሠራተኛ';
  }
  if (
    compact.includes('privateemployee') ||
    compact.includes('privateworker') ||
    compact.includes('privatesector') ||
    compact.includes('selfemployed') ||
    compact.includes('ownbusiness') ||
    compact.includes('freelanc') ||
    compact.includes('የግልሰራተኛ') ||
    compact.includes('ግልሰራተኛ') ||
    /\bprivate\b/i.test(lower)
  ) {
    return 'የግል ሠራተኛ';
  }
  if (
    compact.includes('dailylabor') ||
    compact.includes('daylabor') ||
    compact.includes('dailyworker') ||
    compact.includes('casualworker') ||
    compact.includes('የቀንሰራተኛ') ||
    compact.includes('ቀንሰራተኛ') ||
    compact.includes('የጉልበትሰራተኛ')
  ) {
    return 'የቀን ሠራተኛ';
  }
  if (
    compact.includes('unemployed') ||
    compact.includes('jobless') ||
    compact.includes('nowork') ||
    compact.includes('nojob') ||
    compact.includes('notworking') ||
    compact.includes('ስራየሌለው') ||
    compact.includes('ስራየሌላት') ||
    compact.includes('ስራየለሽ') ||
    compact.includes('ስራአጥ')
  ) {
    return 'ስራ የሌለው/ች';
  }
  if (compact.includes('student') || compact.includes('pupil') || compact.includes('ተማሪ')) {
    return 'ተማሪ';
  }
  if (
    compact.includes('merchant') ||
    compact.includes('trader') ||
    compact.includes('businessman') ||
    compact.includes('businesswoman') ||
    compact.includes('shopkeeper') ||
    compact.includes('ነጋዴ') ||
    /\bbusiness\b/i.test(lower)
  ) {
    return 'ነጋዴ';
  }
  if (
    compact.includes('farmer') ||
    compact.includes('farming') ||
    compact.includes('agricult') ||
    compact.includes('ገበሬ') ||
    compact.includes('አርሶአደር')
  ) {
    return 'ገበሬ';
  }
  if (compact.includes('retire') || compact.includes('pension') || compact.includes('ጡረተኛ')) {
    return 'ጡረተኛ';
  }
  if (
    compact.includes('teacher') ||
    compact.includes('instructor') ||
    compact.includes('lecturer') ||
    compact.includes('professor') ||
    compact.includes('መምህር') ||
    compact.includes('አስተማሪ')
  ) {
    return 'መምህር';
  }
  if (
    compact.includes('nurse') ||
    compact.includes('doctor') ||
    compact.includes('physician') ||
    compact.includes('midwife') ||
    compact.includes('pharmacist') ||
    compact.includes('healthworker') ||
    compact.includes('healthprofessional') ||
    compact.includes('healthofficer') ||
    compact.includes('ነርስ') ||
    compact.includes('ዶክተር') ||
    compact.includes('ሀኪም') ||
    compact.includes('የጤናባለሙያ')
  ) {
    return 'የጤና ባለሙያ';
  }
  if (
    compact.includes('driver') ||
    compact.includes('chauffeur') ||
    compact.includes('ሹፌር') ||
    compact.includes('ሾፌር') ||
    compact.includes('አሽከርካሪ')
  ) {
    return 'ሹፌር';
  }
  if (
    compact.includes('engineer') ||
    compact.includes('architect') ||
    compact.includes('ኢንጂነር') ||
    compact.includes('መሀንዲስ') ||
    compact.includes('መሃንዲስ')
  ) {
    return 'ኢንጂነር';
  }
  if (
    compact.includes('accountant') ||
    compact.includes('banker') ||
    compact.includes('cashier') ||
    compact.includes('auditor') ||
    compact.includes('bookkeeper') ||
    compact.includes('አካውንታንት') ||
    compact.includes('የሂሳብባለሙያ') ||
    compact.includes('የባንክሰራተኛ')
  ) {
    return 'የሂሳብ / የባንክ ባለሙያ';
  }
  if (
    compact.includes('evangelist') ||
    compact.includes('pastor') ||
    compact.includes('minister') ||
    compact.includes('preacher') ||
    compact.includes('clergy') ||
    compact.includes('missionary') ||
    compact.includes('ወንጌላዊ') ||
    compact.includes('ፓስተር') ||
    compact.includes('መጋቢ') ||
    compact.includes('ቄስ') ||
    compact.includes('አገልጋይ')
  ) {
    return 'አገልጋይ / ወንጌላዊ / ቄስ';
  }
  if (
    compact.includes('guard') ||
    compact.includes('watchman') ||
    compact.includes('security') ||
    compact.includes('ዘበኛ') ||
    compact.includes('ጥበቃ')
  ) {
    return 'ጥበቃ';
  }
  if (
    compact.includes('police') ||
    compact.includes('soldier') ||
    compact.includes('military') ||
    compact.includes('army') ||
    compact.includes('ፖሊስ') ||
    compact.includes('ወታደር') ||
    compact.includes('መከላከያ')
  ) {
    return 'ፖሊስ / መከላከያ';
  }
  if (compact.includes('carpenter') || compact.includes('woodworker') || compact.includes('አናጺ') || compact.includes('አናጢ')) {
    return 'አናጺ';
  }
  if (
    compact.includes('mason') ||
    compact.includes('builder') ||
    compact.includes('construction') ||
    compact.includes('ግንበኛ') ||
    compact.includes('የግንባታሰራተኛ')
  ) {
    return 'ግንበኛ';
  }
  if (compact.includes('tailor') || compact.includes('seamstress') || compact.includes('weaver') || compact.includes('ልብስሰፊ') || compact.includes('ሸማኔ')) {
    return 'ልብስ ሰፊ';
  }
  if (/\bngo\b/i.test(lower) || compact.includes('ngoemployee') || compact.includes('ngoworker')) {
    return 'የNGO ሠራተኛ';
  }
  if (
    compact.includes('mechanic') ||
    compact.includes('technician') ||
    compact.includes('electrician') ||
    compact.includes('plumber') ||
    compact.includes('welder') ||
    compact.includes('መካኒክ') ||
    compact.includes('ቴክኒሻን') ||
    compact.includes('ኤሌክትሪሻን') ||
    /\bit\b/i.test(lower)
  ) {
    return 'ቴክኒሻን / መካኒክ';
  }
  if (
    compact.includes('secretary') ||
    compact.includes('clerk') ||
    compact.includes('officeworker') ||
    compact.includes('receptionist') ||
    compact.includes('ጸሀፊ') ||
    compact.includes('የቢሮሰራተኛ')
  ) {
    return 'ጸሐፊ / የቢሮ ሠራተኛ';
  }
  if (compact.includes('cleaner') || compact.includes('janitor') || compact.includes('የጽዳትሰራተኛ') || compact.includes('ጽዳት')) {
    return 'የጽዳት ሠራተኛ';
  }
  if (compact.includes('lawyer') || compact.includes('attorney') || compact.includes('judge') || compact.includes('የህግባለሙያ') || compact.includes('ጠበቃ')) {
    return 'የሕግ ባለሙያ';
  }
  if (
    compact.includes('cook') ||
    compact.includes('chef') ||
    compact.includes('baker') ||
    compact.includes('waiter') ||
    compact.includes('waitress') ||
    compact.includes('ወጥቤት') ||
    compact.includes('አስተናጋጅ')
  ) {
    return 'የምግብና መስተንግዶ ሠራተኛ';
  }
  if (
    compact.includes('barber') ||
    compact.includes('hairdresser') ||
    compact.includes('salon') ||
    compact.includes('ጸጉርአስተካካይ') ||
    compact.includes('ሳሎን')
  ) {
    return 'ጸጉር አስተካካይ / ሳሎን';
  }

  return cleaned;
};

const EDUCATION_ENGLISH_HINTS: Record<string, string> = {
  'ያልተማረ/ች': 'Uneducated / Illiterate',
  'ጨቅላ/ያልጀመረ': 'Infant / Not Started',
  'መዋዕለ ሕፃናት (KG)': 'Kindergarten / Preschool',
  'መሠረተ ትምህርት': 'Basic Literacy',
  '1ኛ - 4ኛ ክፍል': 'Grades 1–4',
  '5ኛ - 8ኛ ክፍል': 'Grades 5–8',
  '9ኛ - 10ኛ ክፍል': 'Grades 9–10',
  '11ኛ - 12ኛ ክፍል': 'Grades 11–12 / Prep',
  'አንደኛ ደረጃ (1–8)': 'Primary (1–8)',
  'ሁለተኛ ደረጃ (9–12)': 'High School (9–12)',
  'ኮሌጅ / ዩኒቨርሲቲ': 'College / University',
  'መጽሐፍ ቅዱስ ት/ቤት': 'Bible School / Theology',
  'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)': 'TVET / Certificate',
  'ዲፕሎማ': 'Diploma',
  'ዲግሪ': 'Degree (BA / BSc / BTh)',
  'ማስተርስ': 'Masters (MA / MSc / MDiv)',
  'ዶክትሬት': 'Doctorate (PhD)',
  [UNSPECIFIED_CATEGORY_LABEL]: 'Unspecified'
};

const OCCUPATION_ENGLISH_HINTS: Record<string, string> = {
  'የቤት እመቤት': 'Housewife / Homemaker',
  'የቤት ውስጥ': 'At Home / Dependent',
  'የቤት ሠራተኛ': 'Domestic Worker',
  'ተማሪ': 'Student',
  'የመንግሥት ሠራተኛ': 'Government Employee',
  'የግል ሠራተኛ': 'Private / Self-Employed',
  'ነጋዴ': 'Merchant / Trader',
  'ገበሬ': 'Farmer',
  'የቀን ሠራተኛ': 'Daily Laborer',
  'አገልጋይ / ወንጌላዊ / ቄስ': 'Minister / Evangelist / Pastor',
  'ጡረተኛ': 'Retired',
  'ስራ የሌለው/ች': 'Unemployed',
  'መምህር': 'Teacher',
  'የጤና ባለሙያ': 'Healthcare / Nurse / Doctor',
  'ሹፌር': 'Driver',
  'ኢንጂነር': 'Engineer',
  'የሂሳብ / የባንክ ባለሙያ': 'Accountant / Banker',
  'ጥበቃ': 'Guard / Security',
  'ፖሊስ / መከላከያ': 'Police / Military',
  'አናጺ': 'Carpenter',
  'ግንበኛ': 'Mason / Construction',
  'ልብስ ሰፊ': 'Tailor / Weaver',
  'የNGO ሠራተኛ': 'NGO Employee',
  'ቴክኒሻን / መካኒክ': 'Technician / Mechanic / IT',
  'ጸሐፊ / የቢሮ ሠራተኛ': 'Secretary / Office Worker',
  'የጽዳት ሠራተኛ': 'Cleaner / Janitor',
  'የሕግ ባለሙያ': 'Lawyer / Legal',
  'የምግብና መስተንግዶ ሠራተኛ': 'Cook / Hospitality',
  'ጸጉር አስተካካይ / ሳሎን': 'Barber / Salon',
  [UNSPECIFIED_CATEGORY_LABEL]: 'Unspecified'
};

export const getCanonicalCategoryEnglishHint = (
  canonicalLabel: string | undefined | null,
  kind: 'education' | 'occupation'
): string | undefined => {
  if (!canonicalLabel) return undefined;
  const map = kind === 'education' ? EDUCATION_ENGLISH_HINTS : OCCUPATION_ENGLISH_HINTS;
  if (map[canonicalLabel]) return map[canonicalLabel];
  if (kind === 'education') {
    const gradeMatch = canonicalLabel.match(/^(\d{1,2})ኛ ክፍል$/);
    if (gradeMatch) return `Grade ${gradeMatch[1]}`;
  }
  return undefined;
};

export const normalizeEducationLevelValue = (
  raw: string | undefined | null
): { key: string; label: string; englishHint?: string; isUnspecified: boolean } => {
  const canonical = canonicalizeEducationLevel(raw);
  if (!canonical) {
    return {
      key: UNSPECIFIED_CATEGORY_KEY,
      label: UNSPECIFIED_CATEGORY_LABEL,
      englishHint: 'Unspecified',
      isUnspecified: true
    };
  }
  const normKey = normalizeCategoryTextForKey(canonical) || canonical.toLowerCase();
  return {
    key: normKey,
    label: canonical,
    englishHint: getCanonicalCategoryEnglishHint(canonical, 'education'),
    isUnspecified: false
  };
};

export const normalizeOccupationValue = (
  raw: string | undefined | null
): { key: string; label: string; englishHint?: string; isUnspecified: boolean } => {
  const canonical = canonicalizeOccupation(raw);
  if (!canonical) {
    return {
      key: UNSPECIFIED_CATEGORY_KEY,
      label: UNSPECIFIED_CATEGORY_LABEL,
      englishHint: 'Unspecified',
      isUnspecified: true
    };
  }
  const normKey = normalizeCategoryTextForKey(canonical) || canonical.toLowerCase();
  return {
    key: normKey,
    label: canonical,
    englishHint: getCanonicalCategoryEnglishHint(canonical, 'occupation'),
    isUnspecified: false
  };
};

export const normalizeMemberCategoryValue = (
  raw: string | undefined | null,
  kind?: 'education' | 'occupation'
): { key: string; label: string; englishHint?: string; isUnspecified: boolean } => {
  if (kind === 'education') return normalizeEducationLevelValue(raw);
  if (kind === 'occupation') return normalizeOccupationValue(raw);

  const eduCanonical = canonicalizeEducationLevel(raw);
  const occCanonical = canonicalizeOccupation(raw);
  const cleaned = String(raw ?? '').trim().replace(/\s+/g, ' ');
  const resolved =
    (eduCanonical && eduCanonical !== cleaned ? eduCanonical : undefined) ||
    (occCanonical && occCanonical !== cleaned ? occCanonical : undefined) ||
    eduCanonical ||
    occCanonical;

  if (!resolved) {
    return {
      key: UNSPECIFIED_CATEGORY_KEY,
      label: UNSPECIFIED_CATEGORY_LABEL,
      englishHint: 'Unspecified',
      isUnspecified: true
    };
  }
  const normKey = normalizeCategoryTextForKey(resolved) || resolved.toLowerCase();
  return {
    key: normKey,
    label: resolved,
    englishHint:
      getCanonicalCategoryEnglishHint(resolved, 'education') ||
      getCanonicalCategoryEnglishHint(resolved, 'occupation'),
    isUnspecified: false
  };
};
