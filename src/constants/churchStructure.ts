import {
  ChapelLeaderCategoryId,
  DepartmentWorkspaceData,
  EvangelismMissionaryRecord,
  OrgUnitId
} from '../types';

export type OrgUnitKind =
  | 'governance'
  | 'council_registry'
  | 'ministry'
  | 'finance'
  | 'school'
  | 'children_sunday_school'
  | 'chapels'
  | 'special_hub';

export interface OrgUnitDefinition {
  id: OrgUnitId;
  code: string;
  name: string;
  shortDesc: string;
  parentId: OrgUnitId | null;
  level: 1 | 2 | 3 | 4;
  defaultPin: string;
  kind: OrgUnitKind;
  hasChurchRegistry: boolean;
  supportsFinance: boolean;
  memberNoun: string;
  roleColumnLabel: string;
  roleOptions: string[];
  activityCategories: string[];
  financeCategories: string[];
  churchMemberSyncFilter?: 'women' | 'youth' | 'men';
}

export const CHURCH_ORG_UNITS: OrgUnitDefinition[] = [
  {
    id: 'elders_council',
    code: '1',
    name: 'የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)',
    shortDesc:
      'የአጥቢያ ቤተ ክርስቲያን ከፍተኛ የአመራርና ስራ አስፈጻሚ ጉባኤ · 12 አባላት (11 ወንድ፣ 1 ሴት · 9 አባት መሪዎች፣ 1 ከሴቶች አገልግሎት፣ 1 ከወጣቶች አገልግሎት፣ 1 ከመንፈሳዊ ዘርፍ) · ቋሚ ስብሰባ፦ ሐሙስ ምሽት',
    parentId: null,
    level: 1,
    defaultPin: '3001',
    kind: 'governance',
    hasChurchRegistry: true,
    supportsFinance: false,
    memberNoun: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ አባል',
    roleColumnLabel: 'የአመራር ምድብ / ውክልና',
    roleOptions: [
      'የቤተክርስቲያን አባት መሪ',
      'ከሴቶች አገልግሎት ተወካይ',
      'ከወጣቶች አገልግሎት ተወካይ',
      'ከመንፈሳዊ ዘርፍ ተወካይ (መጋቢ)',
      'ዋና ሰብሳቢ',
      'ምክትል ሰብሳቢ',
      'ጸሐፊ',
      'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ አባል'
    ],
    activityCategories: ['ሐሙስ ምሽት ቋሚ ስብሰባ', 'ውሳኔና መመሪያ', 'የመምሪያ ግምገማ', 'መንፈሳዊ ጉብኝት'],
    financeCategories: []
  },
  {
    id: 'office',
    code: '1.1',
    name: 'ጽ/ቤት',
    shortDesc: 'የቤተክርስቲያን መረጃ ቋት፣ የጽ/ቤት መዝገብ፣ የአስተዳደርና የማሕበረሰብ አገልግሎት ማዕከል',
    parentId: 'elders_council',
    level: 2,
    defaultPin: '3100',
    kind: 'council_registry',
    hasChurchRegistry: true,
    supportsFinance: true,
    memberNoun: 'የጽ/ቤት ሠራተኛ / አባል',
    roleColumnLabel: 'የስራ ድርሻ',
    roleOptions: ['ዋና ጸሐፊ', 'የጽ/ቤት ኃላፊ', 'የመረጃ ቋት ባለሙያ', 'መዝገብ ቤት', 'ረዳት ጸሐፊ'],
    activityCategories: ['ደብዳቤና ሰነድ', 'የመረጃ ማደራጀት', 'የጽ/ቤት ስብሰባ', 'ሪፖርት ማዘጋጀት'],
    financeCategories: ['የጽ/ቤት ወጪ', 'የሰነድና ህትመት', 'መገልገያ ዕቃ', 'ልዩ ገቢ']
  },
  {
    id: 'holistic_community',
    code: '1.1.1',
    name: 'ሁለንተናዊ ማሕበረሰብ አገልግሎት',
    shortDesc: 'የማሕበረሰብ ልማት፣ የጤና፣ የትምህርት ድጋፍና የማሕበራዊ አገልግሎት ዘርፍ',
    parentId: 'office',
    level: 3,
    defaultPin: '3101',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'ተጠቃሚ / በጎ ፈቃደኛ',
    roleColumnLabel: 'የአገልግሎት ሁኔታ',
    roleOptions: ['አስተባባሪ', 'የፕሮጀክት ባለሙያ', 'በጎ ፈቃደኛ', 'ድጋፍ ተቀባይ ቤተሰብ', 'አማካሪ'],
    activityCategories: ['የማሕበረሰብ ድጋፍ', 'ስልጠናና ግንዛቤ', 'የጤና/ንጽህና ዘመቻ', 'ክትትልና ጉብኝት'],
    financeCategories: ['የድጋፍ በጀት', 'የበጎ አድራጎት መዋጮ', 'ቁሳቁስ ግዢ', 'የስልጠና ወጪ']
  },
  {
    id: 'admin_finance',
    code: '1.1.2',
    name: 'አስተዳደርና ፋይናንስ',
    shortDesc: 'የቤተ ክርስቲያን ገቢ (አስራት/መባ)፣ ወጪ፣ በጀት፣ ንብረትና የሰው ኃይል አስተዳደር',
    parentId: 'office',
    level: 3,
    defaultPin: '3102',
    kind: 'finance',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'የፋይናንስ/ንብረት አባል',
    roleColumnLabel: 'የኃላፊነት ክፍል',
    roleOptions: ['የፋይናንስ ኃላፊ', 'ገንዘብ ያዥ', 'ሂሳብ ሹም', 'ንብረት ክፍል', 'የውስጥ ኦዲተር', 'ጥበቃና ጥገና'],
    activityCategories: ['ወርሃዊ የሂሳብ ዝግ', 'የንብረት ቆጠራ', 'የኦዲት ሪፖርት', 'የበጀት ዝግጅት'],
    financeCategories: ['አስራት (Tithe)', 'የሰንበት መባ', 'ልዩ ስጦታ/መዋጮ', 'የአገልጋዮች ደመወዝ', 'መብራትና ውሃ', 'ህንጻ ጥገና', 'ለአገልግሎት ዘርፎች ድጋፍ']
  },
  {
    id: 'spiritual_council',
    code: '1.2',
    name: 'የመንፈሳዊ ዘርፍ ጉባኤ',
    shortDesc: 'የቤተክርስቲያን መረጃ ቋት እና የሁሉም መንፈሳዊ አገልግሎት ዘርፎች መሪ ጉባኤ',
    parentId: 'elders_council',
    level: 2,
    defaultPin: '3200',
    kind: 'council_registry',
    hasChurchRegistry: true,
    supportsFinance: false,
    memberNoun: 'የመንፈሳዊ ዘርፍ መሪ',
    roleColumnLabel: 'የአገልግሎት ዘርፍ',
    roleOptions: ['ዋና አስተባባሪ', 'መጋቢ / ፓስተር', 'ወንጌላዊ', 'የዘርፍ ተወካይ', 'ጸሐፊ'],
    activityCategories: ['የዘርፍ ጉባኤ', 'ጸሎትና ጾም', 'የአገልጋዮች ስልጠና', 'የሩብ ዓመት ግምገማ'],
    financeCategories: []
  },
  {
    id: 'evangelism',
    code: '1.2.1',
    name: 'የወንጌል አገልግሎት',
    shortDesc: 'የወንጌል ስርጭት፣ አለም አቀፋዊ/አገር አቀፋዊ/ክልላዊ/አከባቢያዊ ሚሽነሪዎች፣ አዳዲስ አማኞች ክትትልና የጥምቀት ዝግጅት',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3201',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'ወንጌላዊ / ሚሽነሪ / አዲስ አማኝ',
    roleColumnLabel: 'ምድብ / ሁኔታ',
    roleOptions: [
      'አለም አቀፋዊ ሚሽነሪ',
      'አገር አቀፋዊ ሚሽነሪ',
      'ክልላዊ ሚሽነሪ',
      'አከባቢያዊ ሚሽነሪ',
      'የወንጌል ቡድን መሪ',
      'ወንጌል ሰባኪ',
      'አዲስ አማኝ (ክትትል)',
      'የጥምቀት ተዘጋጂ',
      'ጸሎት ቡድን'
    ],
    activityCategories: ['የአደባባይ/ቤት ለቤት ወንጌል', 'የሚሽነሪዎች ስምሪትና ጉብኝት', 'አዲስ አማኝ ክትትል', 'የጥምቀት ትምህርት', 'የወንጌል ዘመቻ'],
    financeCategories: ['የሚሽነሪዎች ድጋፍ', 'የወንጌል ትራክትና መጽሐፍ', 'የዘመቻ ትራንስፖርት', 'የቡድን መዋጮ']
  },
  {
    id: 'deacons',
    code: '1.2.2',
    name: 'የዲያቆናት አገልግሎት',
    shortDesc: 'የዲያቆናት ዝርዝር፣ የጌታ እራት ዝግጅት፣ የታመሙና የተቸገሩ ምዕመናን ጉብኝትና ድጋፍ',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3202',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'ዲያቆን / ተገልጋይ',
    roleColumnLabel: 'የአገልግሎት ድርሻ',
    roleOptions: ['ዋና ዲያቆን', 'ዲያቆን', 'ዲያቆናዊት', 'የጌታ እራት ክፍል', 'የጉብኝት ክፍል'],
    activityCategories: ['የጌታ እራት አገልግሎት', 'የህሙማን ጉብኝት', 'የሀዘን/ማጽናናት', 'የዲያቆናት ስብሰባ'],
    financeCategories: ['የጌታ እራት ወጪ', 'ለህሙማን ድጋፍ', 'መዋጮ']
  },
  {
    id: 'women_ministry',
    code: '1.2.3',
    name: 'የሴቶች አገልግሎት',
    shortDesc: 'የባል ሚስት የሆኑ (ባለትዳር) ሴቶች መንፈሳዊ ህብረት፣ የጸሎት ቡድኖች፣ የመጽሐፍ ቅዱስ ጥናትና የቤተሰብ ማበረታቻ',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3203',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'የሴቶች አገልግሎት አባል (የባል ሚስት)',
    roleColumnLabel: 'ቡድን / ኃላፊነት',
    roleOptions: ['የሴቶች መሪ', 'ምክትል መሪ', 'ጸሐፊ', 'የጸሎት ቡድን', 'የመዝሙር ቡድን', 'አባል'],
    activityCategories: ['የሴቶች ሳምንታዊ ህብረት', 'የጸሎት ቀን', 'ኮንፈረንስ/ስልጠና', 'ጉብኝት'],
    financeCategories: ['የሴቶች አገልግሎት መዋጮ', 'የኮንፈረንስ ወጪ', 'የድጋፍ ስጦታ'],
    churchMemberSyncFilter: 'women'
  },
  {
    id: 'youth_ministry',
    code: '1.2.4',
    name: 'የወጣቶች አገልግሎት',
    shortDesc: 'የአስተባባሪ ገጽ፣ የመሪዎች ገጽ፣ የመዘምራን ህብረት (ሀ-መ፣ ሴቶች፣ ፋሬስ፣ ባማ)፣ የመዝሙር መሪዎች ህብረት እና የደቀ መዝሙርነት ትምህርት (መቅህማ፣ ቢቲሲፒ)',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3204',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'ወጣት አባል',
    roleColumnLabel: 'የአገልግሎት ድርሻ',
    roleOptions: [
      'የወጣቶች አስተባባሪ',
      'የወጣቶች መሪ',
      'የመዘምራን ህብረት',
      'የመዝሙር መሪዎች ህብረት',
      'የደቀ መዝሙርነት ትምህርት',
      'አባል'
    ],
    activityCategories: [
      'የወጣቶች አምልኮ',
      'የመዘምራን ልምምድ',
      'የመዝሙር መሪዎች ስብሰባ',
      'የደቀ መዝሙርነት ትምህርት',
      'የወጣቶች ካምፕ/ኮንፈረንስ'
    ],
    financeCategories: ['የወጣቶች መዋጮ', 'የሙዚቃ መሳሪያ/ጥገና', 'የትምህርት/ስልጠና ወጪ', 'የኮንፈረንስ ወጪ'],
    churchMemberSyncFilter: 'youth'
  },
  {
    id: 'children_ministry',
    code: '1.2.5',
    name: 'የልጆች አገልግሎት',
    shortDesc: 'የቤተክርስቲያን የልጆች መረጃ ቋት (0-14)፣ የትምህርት ዘመን፣ የሰንበት ትምህርት ቤት ክፍሎች እና የመምህራን መግቢያ',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '5678',
    kind: 'children_sunday_school',
    hasChurchRegistry: false,
    supportsFinance: false,
    memberNoun: 'ልጅ / ተማሪ',
    roleColumnLabel: 'ክፍል',
    roleOptions: [],
    activityCategories: [],
    financeCategories: []
  },
  {
    id: 'chapels_dept',
    code: '1.2.6',
    name: 'ቻፕሎች',
    shortDesc: 'በስርዓቱ ውስጥ የሚገኙ 10ሩም ቻፕሎች (ኤልሮኢ፣ ሻሎም፣ ቤቴል፣ ያህዌ፣ ኤዴን፣ አቤንኤዘር፣ ርኆቦት፣ ኤልሻዳይ፣ ሩሐማ፣ አዶናይ)',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3206',
    kind: 'chapels',
    hasChurchRegistry: false,
    supportsFinance: false,
    memberNoun: 'የቻፕል አባል',
    roleColumnLabel: 'ቻፕል',
    roleOptions: [],
    activityCategories: ['የቻፕል መሪዎች ስብሰባ', 'የቻፕሎች ጉብኝት'],
    financeCategories: []
  },
  {
    id: 'love_compassion',
    code: '1.2.7',
    name: 'ፍቅርና ርኅራሄ',
    shortDesc: 'ለቋሚ እና ጊዜያዊ ተረጂዎች፣ ወላጅ አልባ ህፃናት፣ አረጋውያን እና ህሙማን የእርዳታና የርኅራሄ አገልግሎት',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3271',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'ተረጂ / የበጎ አድራጎት አባል',
    roleColumnLabel: 'ምድብ',
    roleOptions: [
      'ቋሚ ተረጂ',
      'ጊዜያዊ ተረጂ',
      'አስተባባሪ',
      'አገልጋይ አባል',
      'ወላጅ አልባ ድጋፍ',
      'አረጋውያን ድጋፍ',
      'የህክምና ድጋፍ',
      'የምግብ/አልባሳት ድጋፍ'
    ],
    activityCategories: ['የቋሚ ተረጂዎች ወርሃዊ ድጋፍ', 'የጊዜያዊ ተረጂዎች እርዳታ', 'የምግብና አልባሳት እርዳታ', 'የህክምና ድጋፍ', 'የቤት ጥገና/ጉብኝት', 'በዓል ማጋራት'],
    financeCategories: ['የፍቅርና ርኅራሄ መዋጮ', 'ለቋሚ ተረጂዎች ድጋፍ', 'ለጊዜያዊ ተረጂዎች ድጋፍ', 'የህክምና እርዳታ', 'የትምህርት ቁሳቁስ ድጋፍ']
  },
  {
    id: 'development',
    code: '1.2.8',
    name: 'የልማት ዘርፍ',
    shortDesc: 'የቤተ ክርስቲያን ገቢ ማስገኛ፣ ግንባታ፣ የመሰረተ ልማትና ዘላቂ የልማት ፕሮጀክቶች',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3272',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'የልማት ኮሚቴ / ባለሙያ',
    roleColumnLabel: 'የስራ ክፍል',
    roleOptions: ['የልማት ሰብሳቢ', 'የፕሮጀክት መሪ', 'ቴክኒክ/ምህንድስና', 'ገቢ አሰባሳቢ', 'አባል'],
    activityCategories: ['ግንባታና ማሻሻያ', 'የገቢ ማስገኛ ፕሮጀክት', 'የመስክ ምልከታ', 'የልማት ኮሚቴ ስብሰባ'],
    financeCategories: ['የልማት ፈንድ ገቢ', 'የግንባታ ዕቃ ወጪ', 'የጉልበት/ባለሙያ ክፍያ', 'የፕሮጀክት ገቢ']
  },
  {
    id: 'bible_school',
    code: '1.2.9',
    name: 'የመጽሐፍ ቅዱስ ትምህርት ቤት',
    shortDesc: 'የመጽሐፍ ቅዱስ ትምህርት ቤት ተማሪዎች፣ መምህራን፣ የትምህርት ዓመታት፣ ክፍያና ውጤት',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3273',
    kind: 'school',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'ተማሪ / መምህር',
    roleColumnLabel: 'ደረጃ / ኃላፊነት',
    roleOptions: ['1ኛ ዓመት ተማሪ', '2ኛ ዓመት ተማሪ', '3ኛ ዓመት ተማሪ', 'ተከታታይ / ሰርተፊኬት', 'መምህር', 'ዲን / ርዕሰ መምህር'],
    activityCategories: ['መደበኛ ሴሚስተር ትምህርት', 'ፈተናና ምዘና', 'የምረቃ ስነ-ስርዓት', 'የመምህራን ስብሰባ'],
    financeCategories: ['የምዝገባና ወርሃዊ ክፍያ', 'የመጻሕፍት ገቢ/ወጪ', 'የመምህራን አበል', 'የምረቃ ወጪ']
  },
  {
    id: 'rehoboth_school',
    code: '1.2.10',
    name: 'የርኆቦት መጀመሪያና መካከለኛ ትምህርት ቤት',
    shortDesc: 'የርኆቦት ትምህርት ቤት ተማሪዎች (KG–8ኛ ክፍል)፣ መምህራን፣ ሠራተኞች እና የትምህርት ቤት አስተዳደር',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3274',
    kind: 'school',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'ተማሪ / መምህር / ሠራተኛ',
    roleColumnLabel: 'ክፍል / የስራ መደብ',
    roleOptions: ['መዋዕለ ሕፃናት (KG 1-3)', '1ኛ - 4ኛ ክፍል ተማሪ', '5ኛ - 8ኛ ክፍል ተማሪ', 'መምህር', 'ርዕሰ መምህር', 'አስተዳደር ሠራተኛ'],
    activityCategories: ['የመጀመሪያ/ሁለተኛ መንፈቀ ዓመት', 'የወላጆች ስብሰባ', 'የተማሪዎች ሽልማት', 'የመምህራን ግምገማ'],
    financeCategories: ['የተማሪዎች ወርሃዊ ክፍያ', 'የምዝገባ ክፍያ', 'የመምህራን ደመወዝ', 'የትምህርት ቁሳቁስ ወጪ']
  },
  {
    id: 'men_fellowship',
    code: '1.2.11',
    name: 'የወንዶች መተሳሰብ',
    shortDesc: 'የወንዶች የመተሳሰብ፣ የመረዳዳት፣ የሀዘንና የደስታ ተካፋይነት እና የጉብኝት ማሕበር',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3275',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'የወንዶች መተሳሰብ አባል',
    roleColumnLabel: 'ኃላፊነት / ሁኔታ',
    roleOptions: ['ሰብሳቢ', 'ጸሐፊ', 'ገንዘብ ያዥ', 'የጉብኝት ኮሚቴ', 'መደበኛ አባል'],
    activityCategories: ['ወርሃዊ የመተሳሰብ ስብሰባ', 'የታመመ/የወለደ ጉብኝት', 'የሀዘን ማጽናናት', 'የጋራ ድጋፍ'],
    financeCategories: ['ወርሃዊ መዋጮ', 'የድጋፍ ክፍያ (ለሀዘን/ለህመም)', 'ልዩ መዋጮ'],
    churchMemberSyncFilter: 'men'
  },
  {
    id: 'women_fellowship',
    code: '1.2.12',
    name: 'የሴቶች መተሳሰብ ዘርፍ',
    shortDesc: 'የባል ሚስት የሆኑ (ባለትዳር) ሴቶች የመተሳሰብ፣ የመረዳዳት፣ የችግር ጊዜ ድጋፍ እና የህብረት መዋጮ ዘርፍ',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3276',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'የሴቶች መተሳሰብ አባል (የባል ሚስት)',
    roleColumnLabel: 'ኃላፊነት / ሁኔታ',
    roleOptions: ['ሰብሳቢ', 'ጸሐፊ', 'ገንዘብ ያዥ', 'የጉብኝት ኮሚቴ', 'መደበኛ አባል'],
    activityCategories: ['ወርሃዊ የመተሳሰብ ስብሰባ', 'የወሊድ/ህመም ጉብኝት', 'የሀዘን ማጽናናት', 'የጋራ ድጋፍ'],
    financeCategories: ['ወርሃዊ መዋጮ', 'የድጋፍ ክፍያ (ለወሊድ/ለሀዘን/ለህመም)', 'ልዩ መዋጮ'],
    churchMemberSyncFilter: 'women'
  }
];

export const DEFAULT_ORG_UNIT_PINS: { [unitId: string]: string } = CHURCH_ORG_UNITS.reduce(
  (acc, unit) => {
    acc[unit.id] = unit.defaultPin;
    return acc;
  },
  {} as { [unitId: string]: string }
);

export const DEFAULT_YOUTH_CHOIR_GROUPS: string[] = [
  'ሀ መዘመራን',
  'ለ መዘመራን',
  'ሐ መዘመራን',
  'መ መዘመራን',
  'ሴቶች መዘመራን',
  'ፋሬስ መዘመራን',
  'ባማ መዘመራን'
];

export const DEFAULT_YOUTH_DISCIPLESHIP_GROUPS: string[] = [
  'መቅህማ',
  'ቢቲሲፒ (BTCP)'
];

export interface ChapelLeaderCategoryMeta {
  id: ChapelLeaderCategoryId;
  am: string;
  en: string;
  defaultGender?: 'ወ' | 'ሴ';
}

export const CHAPEL_LEADER_CATEGORIES: ChapelLeaderCategoryMeta[] = [
  { id: 'fathers_leaders', am: 'የአባት መሪዎች', en: 'Fathers Leaders', defaultGender: 'ወ' },
  { id: 'women_leaders', am: 'የሴት መሪዎች', en: 'Women Leaders', defaultGender: 'ሴ' },
  { id: 'youth_leaders', am: 'የወጣት መሪዎች', en: 'Youth Leaders' },
  { id: 'children_leaders', am: 'የልጆች መሪዎች', en: 'Children Leaders' },
  { id: 'evangelism_leaders', am: 'የወንጌል አገልግሎት መሪዎች', en: 'Evangelism Leaders' },
  { id: 'compassion_leaders', am: 'ፍቅርና ርኅራሄ መሪዎች', en: 'Love & Compassion Leaders' },
  { id: 'deacons', am: 'ዲያቆናት', en: 'Deacons' }
];

export const DEFAULT_ELDERS_COUNCIL_MEMBERS: DepartmentWorkspaceData['members'] = [
  {
    id: 910001,
    name: 'ላማሮ ሙጋላ',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910002,
    name: 'መብራቱ መጃ',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910003,
    name: 'ዳዊት ደጉ',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910004,
    name: 'መለሰ ዳኘ',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910005,
    name: 'ሰይፉ አጫ',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910006,
    name: 'ጳውሎስ ስምዖን',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910007,
    name: 'አማኑኤል ጌታሁን',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910008,
    name: 'በረከት ፎላ',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910009,
    name: 'ሐጌ ሐታ',
    gender: 'ወ',
    roleOrClass: 'የቤተክርስቲያን አባት መሪ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (ከ9ኙ የቤተክርስቲያን አባት መሪዎች)'
  },
  {
    id: 910010,
    name: 'መሰለች መንገሻ',
    gender: 'ሴ',
    roleOrClass: 'ከሴቶች አገልግሎት ተወካይ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (1 ከሴቶች አገልግሎት)'
  },
  {
    id: 910011,
    name: 'ማቱሳላ ጴጥሮስ',
    gender: 'ወ',
    roleOrClass: 'ከወጣቶች አገልግሎት ተወካይ',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (1 ከወጣቶች አገልግሎት)'
  },
  {
    id: 910012,
    name: 'መጋቢ ሳሙኤል ኦልቶ / መጋቢ ጉጃ ኡባ / መጋቢ ገላዬ አንጃ',
    gender: 'ወ',
    roleOrClass: 'ከመንፈሳዊ ዘርፍ ተወካይ (መጋቢ)',
    status: 'ንቁ',
    notes: 'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ (1 ከመንፈሳዊ ዘርፍ)'
  }
];

export const createDefaultEldersCouncilWorkspaceData = (): DepartmentWorkspaceData => ({
  ...createEmptyDepartmentWorkspaceData(),
  members: DEFAULT_ELDERS_COUNCIL_MEMBERS.map((m) => ({ ...m })),
  leaders: DEFAULT_ELDERS_COUNCIL_MEMBERS.map((m, idx) => ({
    id: 910101 + idx,
    name: m.name,
    gender: m.gender,
    roleTitle: m.roleOrClass,
    status: 'በአገልግሎት ላይ',
    notes: m.notes
  })),
  eldersDefaultSeeded: true
});

export const DEFAULT_EVANGELISM_MISSIONARIES: EvangelismMissionaryRecord[] = [
  {
    id: 920001,
    scope: 'regional',
    name: 'ወንጌላዊ ደስታ ጉጋላ',
    gender: 'ወ',
    missionField: 'ቤንሻንጉል',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920002,
    scope: 'regional',
    name: 'ወንጌላዊ ውቤቱ መለሴ',
    gender: 'ወ',
    missionField: 'አማራ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920003,
    scope: 'regional',
    name: 'ወንጌላዊ አትንኩት አወቀ',
    gender: 'ወ',
    missionField: 'አማራ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920004,
    scope: 'regional',
    name: 'ወንጌላዊ ብርሃኑ ጳውሎስ',
    gender: 'ወ',
    missionField: 'አማራ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920005,
    scope: 'regional',
    name: 'ወንጌላዊ ልኬ ጌዙ',
    gender: 'ወ',
    missionField: 'ጂንካ ዩኒቨርሲቲ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920006,
    scope: 'regional',
    name: 'ወንጌላዊ ደምሴ ሎሪሶ',
    gender: 'ወ',
    missionField: 'አርባምንጭ ዩኒቨርሲቲ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920007,
    scope: 'regional',
    name: 'ወንጌላዊ አሸናፊ ማዶሌ',
    gender: 'ወ',
    missionField: 'ኦሮሚያ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920008,
    scope: 'local',
    name: 'ወንጌላዊ ሉቃስ ሳይኞ',
    gender: 'ወ',
    missionField: 'ደጋ ዶነ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920009,
    scope: 'regional',
    name: 'ወንጌላዊ ዘመኑ ባዘዘው',
    gender: 'ወ',
    missionField: 'አማራ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  },
  {
    id: 920010,
    scope: 'regional',
    name: 'ወንጌላዊ አምሳሉ',
    gender: 'ወ',
    missionField: 'አማራ',
    sendingOrganization: 'ብርብር ቃለ ሕይወት ቤተ ክርስቲያን (የወንጌል አገልግሎት)',
    status: 'በአገልግሎት ላይ'
  }
];

export const createDefaultEvangelismWorkspaceData = (): DepartmentWorkspaceData => ({
  ...createEmptyDepartmentWorkspaceData(),
  missionaryRecords: DEFAULT_EVANGELISM_MISSIONARIES.map((m) => ({ ...m })),
  evangelismMissionariesDefaultSeeded: true
});

export const createEmptyDepartmentWorkspaceData = (): DepartmentWorkspaceData => ({
  members: [],
  activities: [],
  finances: [],
  plans: [],
  leaders: [],
  chapelLeaders: [],
  historicalLeaders: [],
  hrRecords: [],
  assetRecords: [],
  chapelPlans: {},
  youthChoirGroups: [...DEFAULT_YOUTH_CHOIR_GROUPS],
  youthChoirMembers: [],
  youthWorshipLeaders: [],
  youthDiscipleshipGroups: [...DEFAULT_YOUTH_DISCIPLESHIP_GROUPS],
  youthDiscipleshipMembers: [],
  youthCoordinatorNotes: '',
  beneficiaryRecords: [],
  missionaryRecords: [],
  missionaryReports: []
});

export const getOrgUnitById = (id: OrgUnitId | string | null | undefined): OrgUnitDefinition | undefined => {
  if (!id) return undefined;
  return CHURCH_ORG_UNITS.find((u) => u.id === id);
};

export const getOrgUnitChildren = (parentId: OrgUnitId): OrgUnitDefinition[] =>
  CHURCH_ORG_UNITS.filter((u) => u.parentId === parentId);

export const getOrgUnitBreadcrumb = (unitId: OrgUnitId): OrgUnitDefinition[] => {
  const path: OrgUnitDefinition[] = [];
  let cursor = getOrgUnitById(unitId);
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? getOrgUnitById(cursor.parentId) : undefined;
  }
  return path;
};

export const isUnderSpiritualCouncil = (unitId: OrgUnitId): boolean => {
  const u = getOrgUnitById(unitId);
  if (!u) return false;
  return u.parentId === 'spiritual_council';
};

export interface OrgUnitColorTheme {
  surfaceBg: string;
  surfaceBorder: string;
  surfaceHover: string;
  iconBg: string;
  iconText: string;
  buttonBg: string;
  buttonHover: string;
  loginHeaderBg: string;
  ringClass: string;
  subtleText: string;
}

export const ORG_UNIT_THEMES: Record<OrgUnitId, OrgUnitColorTheme> = {
  elders_council: {
    surfaceBg: 'bg-gradient-to-r from-amber-50 via-yellow-50/70 to-white',
    surfaceBorder: 'border-amber-300',
    surfaceHover: 'hover:border-amber-400',
    iconBg: 'bg-amber-600',
    iconText: 'text-white',
    buttonBg: 'bg-slate-900',
    buttonHover: 'hover:bg-slate-800',
    loginHeaderBg: 'bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900',
    ringClass: 'focus:ring-amber-600',
    subtleText: 'text-amber-800'
  },
  office: {
    surfaceBg: 'bg-indigo-50/75',
    surfaceBorder: 'border-indigo-200',
    surfaceHover: 'hover:border-indigo-400',
    iconBg: 'bg-indigo-700',
    iconText: 'text-white',
    buttonBg: 'bg-indigo-800',
    buttonHover: 'hover:bg-indigo-700',
    loginHeaderBg: 'bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900',
    ringClass: 'focus:ring-indigo-600',
    subtleText: 'text-indigo-800'
  },
  holistic_community: {
    surfaceBg: 'bg-emerald-50/75',
    surfaceBorder: 'border-emerald-200',
    surfaceHover: 'hover:border-emerald-400 hover:bg-emerald-50',
    iconBg: 'bg-emerald-600',
    iconText: 'text-white',
    buttonBg: 'bg-emerald-700',
    buttonHover: 'hover:bg-emerald-600',
    loginHeaderBg: 'bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900',
    ringClass: 'focus:ring-emerald-600',
    subtleText: 'text-emerald-800'
  },
  admin_finance: {
    surfaceBg: 'bg-teal-50/80',
    surfaceBorder: 'border-teal-200',
    surfaceHover: 'hover:border-teal-400 hover:bg-teal-50',
    iconBg: 'bg-teal-700',
    iconText: 'text-white',
    buttonBg: 'bg-teal-800',
    buttonHover: 'hover:bg-teal-700',
    loginHeaderBg: 'bg-gradient-to-br from-teal-900 via-emerald-950 to-slate-900',
    ringClass: 'focus:ring-teal-600',
    subtleText: 'text-teal-800'
  },
  spiritual_council: {
    surfaceBg: 'bg-sky-50/85',
    surfaceBorder: 'border-sky-300',
    surfaceHover: 'hover:border-sky-400',
    iconBg: 'bg-sky-700',
    iconText: 'text-white',
    buttonBg: 'bg-sky-800',
    buttonHover: 'hover:bg-sky-700',
    loginHeaderBg: 'bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-950',
    ringClass: 'focus:ring-sky-600',
    subtleText: 'text-sky-800'
  },
  evangelism: {
    surfaceBg: 'bg-rose-50/75',
    surfaceBorder: 'border-rose-200',
    surfaceHover: 'hover:border-rose-400 hover:bg-rose-50',
    iconBg: 'bg-rose-600',
    iconText: 'text-white',
    buttonBg: 'bg-rose-700',
    buttonHover: 'hover:bg-rose-600',
    loginHeaderBg: 'bg-gradient-to-br from-rose-900 via-red-950 to-slate-900',
    ringClass: 'focus:ring-rose-600',
    subtleText: 'text-rose-800'
  },
  deacons: {
    surfaceBg: 'bg-violet-50/75',
    surfaceBorder: 'border-violet-200',
    surfaceHover: 'hover:border-violet-400 hover:bg-violet-50',
    iconBg: 'bg-violet-600',
    iconText: 'text-white',
    buttonBg: 'bg-violet-700',
    buttonHover: 'hover:bg-violet-600',
    loginHeaderBg: 'bg-gradient-to-br from-violet-900 via-purple-950 to-slate-900',
    ringClass: 'focus:ring-violet-600',
    subtleText: 'text-violet-800'
  },
  women_ministry: {
    surfaceBg: 'bg-pink-50/75',
    surfaceBorder: 'border-pink-200',
    surfaceHover: 'hover:border-pink-400 hover:bg-pink-50',
    iconBg: 'bg-pink-600',
    iconText: 'text-white',
    buttonBg: 'bg-pink-700',
    buttonHover: 'hover:bg-pink-600',
    loginHeaderBg: 'bg-gradient-to-br from-pink-900 via-rose-950 to-slate-900',
    ringClass: 'focus:ring-pink-600',
    subtleText: 'text-pink-800'
  },
  youth_ministry: {
    surfaceBg: 'bg-orange-50/75',
    surfaceBorder: 'border-orange-200',
    surfaceHover: 'hover:border-orange-400 hover:bg-orange-50',
    iconBg: 'bg-orange-600',
    iconText: 'text-white',
    buttonBg: 'bg-orange-700',
    buttonHover: 'hover:bg-orange-600',
    loginHeaderBg: 'bg-gradient-to-br from-orange-900 via-amber-950 to-slate-900',
    ringClass: 'focus:ring-orange-600',
    subtleText: 'text-orange-800'
  },
  children_ministry: {
    surfaceBg: 'bg-cyan-50/80',
    surfaceBorder: 'border-cyan-200',
    surfaceHover: 'hover:border-cyan-400 hover:bg-cyan-50',
    iconBg: 'bg-cyan-700',
    iconText: 'text-white',
    buttonBg: 'bg-cyan-800',
    buttonHover: 'hover:bg-cyan-700',
    loginHeaderBg: 'bg-gradient-to-br from-cyan-900 via-sky-900 to-blue-950',
    ringClass: 'focus:ring-cyan-600',
    subtleText: 'text-cyan-800'
  },
  chapels_dept: {
    surfaceBg: 'bg-amber-50/80',
    surfaceBorder: 'border-amber-200',
    surfaceHover: 'hover:border-amber-400 hover:bg-amber-50',
    iconBg: 'bg-amber-600',
    iconText: 'text-white',
    buttonBg: 'bg-amber-700',
    buttonHover: 'hover:bg-amber-600',
    loginHeaderBg: 'bg-gradient-to-br from-amber-800 via-orange-950 to-slate-900',
    ringClass: 'focus:ring-amber-600',
    subtleText: 'text-amber-800'
  },
  love_compassion: {
    surfaceBg: 'bg-rose-50/65',
    surfaceBorder: 'border-rose-200',
    surfaceHover: 'hover:border-rose-400 hover:bg-rose-50',
    iconBg: 'bg-rose-500',
    iconText: 'text-white',
    buttonBg: 'bg-rose-700',
    buttonHover: 'hover:bg-rose-600',
    loginHeaderBg: 'bg-gradient-to-br from-rose-800 via-pink-900 to-slate-900',
    ringClass: 'focus:ring-rose-500',
    subtleText: 'text-rose-800'
  },
  development: {
    surfaceBg: 'bg-emerald-50/65',
    surfaceBorder: 'border-emerald-200',
    surfaceHover: 'hover:border-emerald-400 hover:bg-emerald-50',
    iconBg: 'bg-emerald-600',
    iconText: 'text-white',
    buttonBg: 'bg-emerald-700',
    buttonHover: 'hover:bg-emerald-600',
    loginHeaderBg: 'bg-gradient-to-br from-emerald-800 via-green-950 to-slate-900',
    ringClass: 'focus:ring-emerald-600',
    subtleText: 'text-emerald-800'
  },
  bible_school: {
    surfaceBg: 'bg-indigo-50/65',
    surfaceBorder: 'border-indigo-200',
    surfaceHover: 'hover:border-indigo-400 hover:bg-indigo-50',
    iconBg: 'bg-indigo-600',
    iconText: 'text-white',
    buttonBg: 'bg-indigo-700',
    buttonHover: 'hover:bg-indigo-600',
    loginHeaderBg: 'bg-gradient-to-br from-indigo-800 via-blue-950 to-slate-900',
    ringClass: 'focus:ring-indigo-600',
    subtleText: 'text-indigo-800'
  },
  rehoboth_school: {
    surfaceBg: 'bg-blue-50/65',
    surfaceBorder: 'border-blue-200',
    surfaceHover: 'hover:border-blue-400 hover:bg-blue-50',
    iconBg: 'bg-blue-600',
    iconText: 'text-white',
    buttonBg: 'bg-blue-700',
    buttonHover: 'hover:bg-blue-600',
    loginHeaderBg: 'bg-gradient-to-br from-blue-800 via-sky-900 to-slate-900',
    ringClass: 'focus:ring-blue-600',
    subtleText: 'text-blue-800'
  },
  men_fellowship: {
    surfaceBg: 'bg-slate-100/80',
    surfaceBorder: 'border-slate-300',
    surfaceHover: 'hover:border-blue-500 hover:bg-blue-50/50',
    iconBg: 'bg-slate-700',
    iconText: 'text-white',
    buttonBg: 'bg-slate-800',
    buttonHover: 'hover:bg-slate-700',
    loginHeaderBg: 'bg-gradient-to-br from-slate-800 via-blue-950 to-slate-900',
    ringClass: 'focus:ring-slate-600',
    subtleText: 'text-slate-800'
  },
  women_fellowship: {
    surfaceBg: 'bg-fuchsia-50/65',
    surfaceBorder: 'border-fuchsia-200',
    surfaceHover: 'hover:border-fuchsia-400 hover:bg-fuchsia-50',
    iconBg: 'bg-fuchsia-600',
    iconText: 'text-white',
    buttonBg: 'bg-fuchsia-700',
    buttonHover: 'hover:bg-fuchsia-600',
    loginHeaderBg: 'bg-gradient-to-br from-fuchsia-900 via-purple-950 to-slate-900',
    ringClass: 'focus:ring-fuchsia-600',
    subtleText: 'text-fuchsia-800'
  }
};

export const getOrgUnitTheme = (unitId: OrgUnitId): OrgUnitColorTheme =>
  ORG_UNIT_THEMES[unitId] || ORG_UNIT_THEMES.office;
