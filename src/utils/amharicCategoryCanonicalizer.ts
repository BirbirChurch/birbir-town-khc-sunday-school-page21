/**
 * Pure, dependency-free canonicalizer for Education Levels (የትምህርት ደረጃ)
 * and Occupations (የስራ ዓይነት).
 * Merges English/Amharic synonyms, Amharic homophones (ሀ/ሐ/ኀ, ሰ/ሠ, አ/ዐ, ጸ/ፀ),
 * and common spelling variants (e.g. "house wife" / "የቤት እመቤት", "Diploma" / "ድፕሎማ" / "ዲፕሎማ")
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

const EDUCATION_EXACT_MAP: Record<string, string> = {
  // Uneducated / Illiterate
  ያልተማረ: 'ያልተማረ/ች',
  ያልተማረች: 'ያልተማረ/ች',
  ያልተማረችው: 'ያልተማረ/ች',
  ያልተማሩ: 'ያልተማረ/ች',
  አልተማረም: 'ያልተማረ/ች',
  አልተማረችም: 'ያልተማረ/ች',
  uneducated: 'ያልተማረ/ች',
  illiterate: 'ያልተማረ/ች',
  noeducation: 'ያልተማረ/ች',
  noteducated: 'ያልተማረ/ች',
  none: 'ያልተማረ/ች',
  የለውም: 'ያልተማረ/ች',
  የላትም: 'ያልተማረ/ች',
  ምንም: 'ያልተማረ/ች',

  // Infant / Not started
  ጨቅላ: 'ጨቅላ/ያልጀመረ',
  ያልጀመረ: 'ጨቅላ/ያልጀመረ',
  ያልጀመረች: 'ጨቅላ/ያልጀመረ',
  ጨቅላያልጀመረ: 'ጨቅላ/ያልጀመረ',
  notstarted: 'ጨቅላ/ያልጀመረ',
  infant: 'ጨቅላ/ያልጀመረ',
  baby: 'ጨቅላ/ያልጀመረ',
  toddler: 'ጨቅላ/ያልጀመረ',

  // Kindergarten (KG)
  kg: 'መዋዕለ ሕፃናት (KG)',
  kg1: 'መዋዕለ ሕፃናት (KG)',
  kg2: 'መዋዕለ ሕፃናት (KG)',
  kg3: 'መዋዕለ ሕፃናት (KG)',
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
  '5ኛ8ኛክፍል': '5ኛ - 8ኛ ክፍል',
  '58ኛክፍል': '5ኛ - 8ኛ ክፍል',
  '58ክፍል': '5ኛ - 8ኛ ክፍል',
  '58': '5ኛ - 8ኛ ክፍል',
  grade58: '5ኛ - 8ኛ ክፍል',
  '9ኛ10ኛክፍል': '9ኛ - 10ኛ ክፍል',
  '910ኛክፍል': '9ኛ - 10ኛ ክፍል',
  '910ክፍል': '9ኛ - 10ኛ ክፍል',
  '910': '9ኛ - 10ኛ ክፍል',
  grade910: '9ኛ - 10ኛ ክፍል',
  '11ኛ12ኛክፍል': '11ኛ - 12ኛ ክፍል',
  '1112ኛክፍል': '11ኛ - 12ኛ ክፍል',
  '1112ክፍል': '11ኛ - 12ኛ ክፍል',
  '1112': '11ኛ - 12ኛ ክፍል',
  grade1112: '11ኛ - 12ኛ ክፍል',
  preparatory: '11ኛ - 12ኛ ክፍል',
  መሰናዶ: '11ኛ - 12ኛ ክፍል',
  elementary: 'አንደኛ ደረጃ (1–8)',
  primary: 'አንደኛ ደረጃ (1–8)',
  primaryschool: 'አንደኛ ደረጃ (1–8)',
  አንደኛደረጃ: 'አንደኛ ደረጃ (1–8)',
  secondary: 'ሁለተኛ ደረጃ (9–12)',
  highschool: 'ሁለተኛ ደረጃ (9–12)',
  ሁለተኛደረጃ: 'ሁለተኛ ደረጃ (9–12)',
  college: 'ኮሌጅ / ዩኒቨርሲቲ',
  university: 'ኮሌጅ / ዩኒቨርሲቲ',
  undergraduate: 'ኮሌጅ / ዩኒቨርሲቲ',
  ኮሌጅ: 'ኮሌጅ / ዩኒቨርሲቲ',
  ኮለጅ: 'ኮሌጅ / ዩኒቨርሲቲ',
  ዩኒቨርሲቲ: 'ኮሌጅ / ዩኒቨርሲቲ',
  ዩኒቨርስቲ: 'ኮሌጅ / ዩኒቨርሲቲ',
  የሁለተኛደረጃኮሌጅ: 'ኮሌጅ / ዩኒቨርሲቲ',

  // TVET / Certificate
  tvet: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  certificate: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  cert: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  vocational: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  '10+1': 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  '10+2': 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  '10+3': 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level1: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level2: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level3: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level4: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
  level5: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',
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
  ምስክርወረቀት: 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)',

  // Diploma (ዲፕሎማ / ድፕሎማ / Diploma)
  diploma: 'ዲፕሎማ',
  dip: 'ዲፕሎማ',
  advdiploma: 'ዲፕሎማ',
  advanceddiploma: 'ዲፕሎማ',
  collegediploma: 'ዲፕሎማ',
  '12+2': 'ዲፕሎማ',
  ዲፕሎማ: 'ዲፕሎማ',
  ድፕሎማ: 'ዲፕሎማ',
  ደፕሎማ: 'ዲፕሎማ',
  ዲፕሎም: 'ዲፕሎማ',
  ድፕሎም: 'ዲፕሎማ',
  ድፕ: 'ዲፕሎማ',
  ኮሌጅዲፕሎማ: 'ዲፕሎማ',

  // Degree (ዲግሪ / ድግሪ / Degree / BA / BSc)
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
  bed: 'ዲግሪ',
  bba: 'ዲግሪ',
  llb: 'ዲግሪ',
  babsc: 'ዲግሪ',
  bscdegree: 'ዲግሪ',
  badegree: 'ዲግሪ',
  ዲግሪ: 'ዲግሪ',
  ድግሪ: 'ዲግሪ',
  ደግሪ: 'ዲግሪ',
  የመጀመሪያዲግሪ: 'ዲግሪ',
  መጀመሪያዲግሪ: 'ዲግሪ',
  ባችለር: 'ዲግሪ',

  // Masters (ማስተርስ / Masters / MA / MSc)
  masters: 'ማስተርስ',
  master: 'ማስተርስ',
  mastersdegree: 'ማስተርስ',
  masterdegree: 'ማስተርስ',
  '2nddegree': 'ማስተርስ',
  seconddegree: 'ማስተርስ',
  ma: 'ማስተርስ',
  msc: 'ማስተርስ',
  mba: 'ማስተርስ',
  med: 'ማስተርስ',
  mph: 'ማስተርስ',
  llm: 'ማስተርስ',
  ማስተርስ: 'ማስተርስ',
  ማስተር: 'ማስተርስ',
  ማስተርስዲግሪ: 'ማስተርስ',
  ሁለተኛዲግሪ: 'ማስተርስ',
  '2ኛዲግሪ': 'ማስተርስ',

  // Doctorate (ዶክትሬት / PhD)
  phd: 'ዶክትሬት',
  doctorate: 'ዶክትሬት',
  doctoral: 'ዶክትሬት',
  '3rddegree': 'ዶክትሬት',
  ዶክትሬት: 'ዶክትሬት',
  ዶክተሬት: 'ዶክትሬት',
  ፒኤችዲ: 'ዶክትሬት',
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

  // Domestic worker
  የቤትሰራተኛ: 'የቤት ሠራተኛ',
  ቤትሰራተኛ: 'የቤት ሠራተኛ',
  housemaid: 'የቤት ሠራተኛ',
  maid: 'የቤት ሠራተኛ',
  domesticworker: 'የቤት ሠራተኛ',

  // Student
  student: 'ተማሪ',
  students: 'ተማሪ',
  pupil: 'ተማሪ',
  learner: 'ተማሪ',
  scholar: 'ተማሪ',
  ተማሪ: 'ተማሪ',
  ተማሪዎች: 'ተማሪ',
  የትቤትተማሪ: 'ተማሪ',
  የትምህርትቤትተማሪ: 'ተማሪ',
  የኮሌጅተማሪ: 'ተማሪ',
  የዩኒቨርሲቲተማሪ: 'ተማሪ',

  // Government employee
  government: 'የመንግሥት ሠራተኛ',
  gov: 'የመንግሥት ሠራተኛ',
  govt: 'የመንግሥት ሠራተኛ',
  govemployee: 'የመንግሥት ሠራተኛ',
  govtemployee: 'የመንግሥት ሠራተኛ',
  governmentemployee: 'የመንግሥት ሠራተኛ',
  governmentworker: 'የመንግሥት ሠራተኛ',
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
  churchservant: 'አገልጋይ / ወንጌላዊ / ቄስ',
  fulltimeminister: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ወንጌላዊ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ፓስተር: 'አገልጋይ / ወንጌላዊ / ቄስ',
  መጋቢ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  ቄስ: 'አገልጋይ / ወንጌላዊ / ቄስ',
  አገልጋይ: 'አገልጋይ / ወንጌላዊ / ቄስ',
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

  // Common professions
  teacher: 'መምህር',
  instructor: 'መምህር',
  lecturer: 'መምህር',
  መምህር: 'መምህር',
  መምህርት: 'መምህር',
  አስተማሪ: 'መምህር',

  nurse: 'የጤና ባለሙያ',
  doctor: 'የጤና ባለሙያ',
  physician: 'የጤና ባለሙያ',
  midwife: 'የጤና ባለሙያ',
  healthworker: 'የጤና ባለሙያ',
  healthprofessional: 'የጤና ባለሙያ',
  ነርስ: 'የጤና ባለሙያ',
  ዶክተር: 'የጤና ባለሙያ',
  ሐኪም: 'የጤና ባለሙያ',
  ሀኪም: 'የጤና ባለሙያ',
  የጤናባለሙያ: 'የጤና ባለሙያ',

  driver: 'ሹፌር',
  chauffeur: 'ሹፌር',
  ሹፌር: 'ሹፌር',
  ሾፌር: 'ሹፌር',
  አሽከርካሪ: 'ሹፌር',

  engineer: 'ኢንጂነር',
  ኢንጂነር: 'ኢንጂነር',
  መሀንዲስ: 'ኢንጂነር',
  መሃንዲስ: 'ኢንጂነር',

  accountant: 'የሂሳብ ባለሙያ',
  አካውንታንት: 'የሂሳብ ባለሙያ',
  ሂሳብባለሙያ: 'የሂሳብ ባለሙያ',
  የሂሳብባለሙያ: 'የሂሳብ ባለሙያ',

  guard: 'ጥበቃ',
  security: 'ጥበቃ',
  securityguard: 'ጥበቃ',
  watchman: 'ጥበቃ',
  ዘበኛ: 'ጥበቃ',
  ጥበቃ: 'ጥበቃ',
  የጥበቃሰራተኛ: 'ጥበቃ',

  carpenter: 'አናጺ',
  woodworker: 'አናጺ',
  አናጺ: 'አናጺ',
  አናጢ: 'አናጺ',

  mason: 'ግንበኛ',
  builder: 'ግንበኛ',
  ግንበኛ: 'ግንበኛ',

  tailor: 'ልብስ ሰፊ',
  seamstress: 'ልብስ ሰፊ',
  ልብስሰፊ: 'ልብስ ሰፊ',

  ngo: 'የNGO ሠራተኛ',
  ngoemployee: 'የNGO ሠራተኛ',
  ngoworker: 'የNGO ሠራተኛ',
  የngoሰራተኛ: 'የNGO ሠራተኛ',

  mechanic: 'ቴክኒሻን / መካኒክ',
  technician: 'ቴክኒሻን / መካኒክ',
  መካኒክ: 'ቴክኒሻን / መካኒክ',
  ቴክኒሻን: 'ቴክኒሻን / መካኒክ'
};

export const canonicalizeEducationLevel = (raw: string | undefined | null): string | undefined => {
  const cleaned = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (isUnspecifiedRaw(cleaned)) return undefined;

  const compact = toCompactNorm(cleaned);
  if (!compact) return undefined;

  if (EDUCATION_EXACT_MAP[compact]) {
    return EDUCATION_EXACT_MAP[compact];
  }

  if (/^(?:grade)?1(?:st|ኛ)?(?:to|-|–)?4(?:th|ኛ)?(?:grade|ክፍል)?$/i.test(compact)) {
    return '1ኛ - 4ኛ ክፍል';
  }
  if (/^(?:grade)?5(?:th|ኛ)?(?:to|-|–)?8(?:th|ኛ)?(?:grade|ክፍል)?$/i.test(compact)) {
    return '5ኛ - 8ኛ ክፍል';
  }
  if (/^(?:grade)?9(?:th|ኛ)?(?:to|-|–)?10(?:th|ኛ)?(?:grade|ክፍል)?$/i.test(compact)) {
    return '9ኛ - 10ኛ ክፍል';
  }
  if (/^(?:grade)?11(?:th|ኛ)?(?:to|-|–)?12(?:th|ኛ)?(?:grade|ክፍል)?$/i.test(compact)) {
    return '11ኛ - 12ኛ ክፍል';
  }

  const singleGradeMatch = compact.match(/^(?:grade|gr|g|ክፍል)?(\d{1,2})(?:st|nd|rd|th|ኛ)?(?:grade|ክፍል)?$/i);
  if (singleGradeMatch) {
    const gradeNum = parseInt(singleGradeMatch[1], 10);
    if (gradeNum >= 1 && gradeNum <= 12) {
      return `${gradeNum}ኛ ክፍል`;
    }
  }

  if (compact.includes('phd') || compact.includes('doctorate') || compact.includes('ዶክትሬት') || compact.includes('ዶክተሬት')) {
    return 'ዶክትሬት';
  }
  if (compact.includes('master') || compact.includes('msc') || compact.includes('ማስተር')) {
    return 'ማስተርስ';
  }
  if (compact.includes('degree') || compact.includes('bachelor') || compact.includes('ዲግሪ') || compact.includes('ድግሪ')) {
    return 'ዲግሪ';
  }
  if (compact.includes('diploma') || compact.includes('ዲፕሎማ') || compact.includes('ድፕሎማ') || compact.includes('ደፕሎማ')) {
    return 'ዲፕሎማ';
  }
  if (compact.includes('tvet') || compact.includes('certificate') || compact.includes('ቴክኒክ') || compact.includes('ሰርተፊኬት') || compact.includes('ሰርቲፊኬት')) {
    return 'ቴክኒክና ሙያ (TVET / ሰርተፊኬት)';
  }
  if (compact.includes('kindergarten') || compact.includes('መዋእለህጻናት') || compact.includes('ኬጂ')) {
    return 'መዋዕለ ሕፃናት (KG)';
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

  if (compact.includes('housewife') || compact.includes('homemaker') || compact.includes('የቤትእመቤት') || compact.includes('ቤትእመቤት')) {
    return 'የቤት እመቤት';
  }
  if (compact.includes('governmentemployee') || compact.includes('civilservant') || compact.includes('የመንግስትሰራተኛ') || compact.includes('መንግስትሰራተኛ')) {
    return 'የመንግሥት ሠራተኛ';
  }
  if (compact.includes('privateemployee') || compact.includes('selfemployed') || compact.includes('የግልሰራተኛ') || compact.includes('ግልሰራተኛ')) {
    return 'የግል ሠራተኛ';
  }
  if (compact.includes('dailylabor') || compact.includes('የቀንሰራተኛ') || compact.includes('ቀንሰራተኛ')) {
    return 'የቀን ሠራተኛ';
  }
  if (compact.includes('unemployed') || compact.includes('jobless') || compact.includes('ስራየሌለው') || compact.includes('ስራየሌላት') || compact.includes('ስራየለሽ')) {
    return 'ስራ የሌለው/ች';
  }
  if (compact.includes('student') || compact.includes('ተማሪ')) {
    return 'ተማሪ';
  }
  if (compact.includes('merchant') || compact.includes('trader') || compact.includes('ነጋዴ')) {
    return 'ነጋዴ';
  }
  if (compact.includes('farmer') || compact.includes('ገበሬ') || compact.includes('አርሶአደር')) {
    return 'ገበሬ';
  }
  if (compact.includes('retire') || compact.includes('pension') || compact.includes('ጡረተኛ')) {
    return 'ጡረተኛ';
  }

  return cleaned;
};

export const normalizeEducationLevelValue = (
  raw: string | undefined | null
): { key: string; label: string; isUnspecified: boolean } => {
  const canonical = canonicalizeEducationLevel(raw);
  if (!canonical) {
    return {
      key: UNSPECIFIED_CATEGORY_KEY,
      label: UNSPECIFIED_CATEGORY_LABEL,
      isUnspecified: true
    };
  }
  const normKey = normalizeCategoryTextForKey(canonical) || canonical.toLowerCase();
  return {
    key: normKey,
    label: canonical,
    isUnspecified: false
  };
};

export const normalizeOccupationValue = (
  raw: string | undefined | null
): { key: string; label: string; isUnspecified: boolean } => {
  const canonical = canonicalizeOccupation(raw);
  if (!canonical) {
    return {
      key: UNSPECIFIED_CATEGORY_KEY,
      label: UNSPECIFIED_CATEGORY_LABEL,
      isUnspecified: true
    };
  }
  const normKey = normalizeCategoryTextForKey(canonical) || canonical.toLowerCase();
  return {
    key: normKey,
    label: canonical,
    isUnspecified: false
  };
};

export const normalizeMemberCategoryValue = (
  raw: string | undefined | null,
  kind?: 'education' | 'occupation'
): { key: string; label: string; isUnspecified: boolean } => {
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
      isUnspecified: true
    };
  }
  const normKey = normalizeCategoryTextForKey(resolved) || resolved.toLowerCase();
  return {
    key: normKey,
    label: resolved,
    isUnspecified: false
  };
};
