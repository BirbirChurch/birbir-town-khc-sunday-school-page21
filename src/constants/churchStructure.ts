import {
  AnnualPlanItem,
  ChapelLeaderCategoryId,
  ChurchHRRecord,
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
  churchMemberSyncFilter?: 'women' | 'women_ministry' | 'youth' | 'men';
}

export const DEFAULT_LEADERSHIP_ROLE_OPTIONS: string[] = [
  'ሰብሳቢ',
  'ምክትል ሰብሳቢ',
  'ፀሐፊ',
  'ሂሳብ ሹም',
  'ገንዘብ ያዥ',
  'ንብረት ክፍል',
  'የሰው ኃይል',
  'አባል/ምክትል ፀሐፊ',
  'አባል/ምክትል ልማት'
];

export const CHURCH_ORG_UNITS: OrgUnitDefinition[] = [
  {
    id: 'elders_council',
    code: '1',
    name: 'የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)',
    shortDesc: '',
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
    name: 'ጽሕፈት ቤት',
    shortDesc: '',
    parentId: 'elders_council',
    level: 2,
    defaultPin: '3100',
    kind: 'council_registry',
    hasChurchRegistry: true,
    supportsFinance: true,
    memberNoun: 'የጽሕፈት ቤት ሠራተኛ / አባል',
    roleColumnLabel: 'የስራ ድርሻ',
    roleOptions: ['ዋና ጸሐፊ', 'የጽሕፈት ቤት ኃላፊ', 'የመረጃ ቋት ባለሙያ', 'መዝገብ ቤት', 'ረዳት ጸሐፊ'],
    activityCategories: ['ደብዳቤና ሰነድ', 'የመረጃ ማደራጀት', 'የጽሕፈት ቤት ስብሰባ', 'ሪፖርት ማዘጋጀት'],
    financeCategories: ['የጽሕፈት ቤት ወጪ', 'የሰነድና ህትመት', 'መገልገያ ዕቃ', 'ልዩ ገቢ']
  },
  {
    id: 'holistic_community',
    code: '1.1.1',
    name: 'ሁለንተናዊ ማሕበረሰብ አገልግሎት',
    shortDesc: '',
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
    id: 'development',
    code: '1.1.1.1',
    name: 'የልማት ዘርፍ',
    shortDesc: '',
    parentId: 'holistic_community',
    level: 4,
    defaultPin: '3272',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'የልማት ኮሚቴ / ባለሙያ',
    roleColumnLabel: 'የስራ ክፍል',
    roleOptions: [
      'ሰብሳቢ',
      'ምክትል ሰብሳቢ',
      'ፀሐፊ',
      'ሂሳብ ሹም',
      'ገንዘብ ያዥ',
      'ንብረት ክፍል',
      'የሰው ኃይል',
      'አባል/ምክትል ፀሐፊ',
      'አባል/ምክትል ልማት',
      'የፕሮጀክት መሪ',
      'ቴክኒክ/ምህንድስና'
    ],
    activityCategories: ['ግንባታና ማሻሻያ', 'የገቢ ማስገኛ ፕሮጀክት', 'የመስክ ምልከታ', 'የልማት ኮሚቴ ስብሰባ'],
    financeCategories: ['የልማት ፈንድ ገቢ', 'የግንባታ ዕቃ ወጪ', 'የጉልበት/ባለሙያ ክፍያ', 'የፕሮጀክት ገቢ']
  },
  {
    id: 'admin_finance',
    code: '1.1.2',
    name: 'አስተዳደርና ፋይናንስ',
    shortDesc: '',
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
    shortDesc: '',
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
    shortDesc: '',
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
    shortDesc: '',
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
    shortDesc: '',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3203',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'የሴቶች አገልግሎት አባል',
    roleColumnLabel: 'ቡድን / ኃላፊነት',
    roleOptions: [
      'ሰብሳቢ (የ3 ዓመት ምርጫ ዙር)',
      'የሙሉ ጊዜ የሴቶች አገልግሎት አስተባባሪ',
      'ምክትል ሰብሳቢ',
      'ጸሐፊ',
      'ገንዘብ ያዥ',
      'የሥራ አስፈጻሚ ኮሚቴ አባል',
      'የደቀ መዝሙርነትና መጽሐፍ ቅዱስ ጥናት መሪ',
      'የክህሎት ልማት አስተባባሪ',
      'የጸሎት ቡድን',
      'የመዝሙር ቡድን',
      'መደበኛ አባል (ከ29 ዓመት በላይ)',
      'ባለትዳር አባል (ከ29 ዓመት በታች - በፈቃድ)'
    ],
    activityCategories: [
      'የሴቶች አገልግሎት ጠቅላላ ጉባኤ',
      'የሥራ አስፈጻሚ ኮሚቴ ስብሰባ',
      'የሴቶች የደቀ መዝሙርነትና መጽሐፍ ቅዱስ ትምህርት',
      'የልዩ ልዩ ክህሎት ስልጠና እና ማበረታቻ',
      'የመሪዎች ምርጫና የአገልግሎት ማደራጀት',
      'የጸሎት ቀን እና ሳምንታዊ ህብረት',
      'ለመንፈሳዊ ዘርፍ እና ለቀጣይ እርከን ሪፖርት',
      'የቤተሰብ ጉብኝት እና ማበረታቻ',
      'ከመንፈሳዊ ዘርፍና ከሰብሳቢው የተሰጠ ተግባር'
    ],
    financeCategories: [
      'የአጥቢያ በጀት ድጎማ',
      'የሴቶች አገልግሎት መዋጮ',
      'የደቀ መዝሙርነት ትምህርት ቁሳቁስ ወጪ',
      'የክህሎት ስልጠና ፕሮግራም ወጪ',
      'የኮንፈረንስ እና የጠቅላላ ጉባኤ ወጪ',
      'የድጋፍ ስጦታ'
    ],
    churchMemberSyncFilter: 'women_ministry'
  },
  {
    id: 'youth_ministry',
    code: '1.2.4',
    name: 'የወጣቶች አገልግሎት',
    shortDesc: '',
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
    shortDesc: '',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '5678',
    kind: 'children_sunday_school',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'ልጅ / ተማሪ',
    roleColumnLabel: 'የኃላፊነት / የክፍል ድርሻ',
    roleOptions: [
      'ሰብሳቢ (የ3 ዓመት ምርጫ ዙር)',
      'የሙሉ ጊዜ የልጆች አገልግሎት አስተባባሪ',
      'ምክትል ሰብሳቢ',
      'ጸሐፊ',
      'ገንዘብ ያዥ',
      'የልጆች አገልግሎት ኮሚቴ አባል',
      'የጸሎት ቡድን መሪ',
      'የመዝሙር ቡድን መሪ',
      'የምስክርነትና ወንጌል ቡድን መሪ',
      'የድራማ ቡድን መሪ'
    ],
    activityCategories: [
      'በዕድሜ እኩዮቻቸው የወንጌል ምስክርነት',
      'የመነቃቂያ፣ የማስተማሪያ እና የመዝናኛ ፕሮግራም',
      'የመለገስ እና የርኁራኄ አገልግሎት',
      'ዓመታዊ የምስጋና እና የአንድነት ቀን',
      'የመሪዎች፣ የመምህራን እና የአስተባባሪዎች ስልጠና',
      'ለወላጆች፣ ለመሪዎች እና ለምዕመናን ስለ ልጅነት ግንዛቤ',
      'በመንፈሳዊና በቀለም ትምህርት የላቁ ልጆች ሽልማት',
      'በመንፈሳዊ ትምህርት ቤቶች/ኮሌጆች ስርዓተ ትምህርት ማበረታቻ',
      'የገቢ ማሰባሰቢያ ፕሮግራም',
      'የአገልጋዮች የመንፈስ አንድነት መርኃ ግብር',
      'የደቀ መዝሙርነት ትምህርት እና ክትትል',
      'የልዩ ልዩ ክህሎት ማዳበሪያ ፕሮግራም',
      'ከመንፈሳዊ ዘርፍና ከሰብሳቢው የተሰጠ ተግባር'
    ],
    financeCategories: [
      'የገቢ ማሰባሰቢያ ፕሮግራም ገቢ',
      'የአጥቢያ በጀት ድጎማ',
      'የልጆችና የወላጆች መዋጮ / ስጦታ',
      'የመነቃቂያና የመዝናኛ ፕሮግራም ወጪ',
      'የመሪዎች፣ መምህራንና አስተባባሪዎች ስልጠና ወጪ',
      'የርኁራኄ እና የመለገስ አገልግሎት ወጪ',
      'የመንፈሳዊና የቀለም ትምህርት ሽልማት ወጪ',
      'ዓመታዊ የምስጋና እና የአንድነት ቀን ወጪ',
      'የደቀ መዝሙርነትና ዕድሜ-ተኮር ትምህርት ቁሳቁስ'
    ]
  },
  {
    id: 'chapels_dept',
    code: '1.2.6',
    name: 'ቻፕሎች',
    shortDesc: '',
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
    shortDesc: '',
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
    id: 'bible_school',
    code: '1.2.8',
    name: 'የመጽሐፍ ቅዱስ ትምህርት ቤት',
    shortDesc: '',
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
    code: '1.2.9',
    name: 'የርኆቦት መጀመሪያና መካከለኛ ትምህርት ቤት',
    shortDesc: '',
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
    code: '1.2.10',
    name: 'የወንዶች መተሳሰብ',
    shortDesc: '',
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
    code: '1.2.11',
    name: 'የሴቶች መተሳሰብ ዘርፍ',
    shortDesc: '',
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
  },
  {
    id: 'youth_children_dev_et1004',
    code: '1.2.12',
    name: 'የወጣቶች እና የልጆች ልማት ኢት 1004',
    shortDesc: '',
    parentId: 'spiritual_council',
    level: 3,
    defaultPin: '3277',
    kind: 'ministry',
    hasChurchRegistry: false,
    supportsFinance: true,
    memberNoun: 'የኢት 1004 አባል / ተጠቃሚ',
    roleColumnLabel: 'ድርሻ / ምድብ',
    roleOptions: [
      'የፕሮጀክት አስተባባሪ',
      'የወጣቶች ልማት ሰራተኛ',
      'የልጆች ልማት ሰራተኛ',
      'አማካሪ / መምህር',
      'ተጠቃሚ ልጅ / ወጣት',
      'በጎ ፈቃደኛ'
    ],
    activityCategories: [
      'የልጆችና ወጣቶች ትምህርት ድጋፍ',
      'የጤናና ስነ-ምግብ ፕሮግራም',
      'የክህሎት ስልጠና',
      'መንፈሳዊ ክትትል',
      'የቤተሰብ ድጋፍ'
    ],
    financeCategories: [
      'የፕሮጀክት በጀት (ኢት 1004)',
      'የትምህርት ቁሳቁስ ድጋፍ',
      'የምግብና ጤና ድጋፍ',
      'የአስተዳደር ወጪ',
      'ልዩ ስጦታ / ድጋፍ'
    ]
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

export const HR_CHAPEL_ROLE_OPTIONS: string[] = [
  'ኤልሮኢ ቻፕል',
  'ሻሎም ቻፕል',
  'ቤቴል ቻፕል',
  'ያህዌ ቻፕል',
  'ኤዴን ቻፕል',
  'አቤንኤዘር ቻፕል',
  'ርኆቦት ቻፕል',
  'ኤልሻዳይ ቻፕል',
  'ሩሐማ ቻፕል',
  'አዶናይ ቻፕል'
];

export const HR_MINISTER_SECTOR_OPTIONS: string[] = [
  'የመንፈሳዊ ዘርፍ ጉባኤ',
  'የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)',
  'የወንጌል አገልግሎት',
  'የመጽሐፍ ቅዱስ ትምህርት ቤት',
  'የወጣቶች አገልግሎት',
  'የሴቶች አገልግሎት',
  'የልጆች አገልግሎት',
  'ቻፕሎች',
  ...HR_CHAPEL_ROLE_OPTIONS,
  'የዲያቆናት አገልግሎት',
  'ፍቅርና ርኅራሄ',
  'የልማት ዘርፍ',
  'ጽሕፈት ቤት',
  'አስተዳደርና ፋይናንስ',
  'ሁለንተናዊ ማሕበረሰብ አገልግሎት',
  'የወንዶች ህብረት',
  'የሴቶች ህብረት',
  'የወጣቶች እና የልጆች ልማት ኢት 1004',
  'የርኆቦት ትምህርት ቤት',
  'የጸሎትና ምልጃ አገልግሎት',
  'የጋብቻና ቤተሰብ አገልግሎት'
];

export const HR_MINISTER_ROLE_OPTIONS: string[] = [
  'መጋቢ',
  'መምህር',
  'ወንጌላዊ',
  'ወንጌላዊት',
  'የቻፕል አስተባባሪ',
  'የዘርፍ አስተባባሪ',
  'የመጽሐፍ ቅዱስ አስተማሪ'
];

export const HR_ADMIN_ROLE_OPTIONS: string[] = [
  'የሂሳብ ሰራተኛ',
  'ጥበቃ',
  'መዝቃ መሳሪያ ተጫዋች',
  'መንስ ቤት ሰራተኛ',
  'ንብ አሪብ'
];

export const HR_UNASSIGNED_ROLE_PLACEHOLDER = 'ኃላፍነት ይምረጡ';

export const DEFAULT_FULL_TIME_MINISTERS: ChurchHRRecord[] = [
  {
    id: 930001,
    category: 'full_time_minister',
    name: 'መጋቢ ሳሙኤል ኦልቶ',
    gender: 'ወ',
    roleTitle: 'መጋቢ',
    roleTitles: ['መጋቢ'],
    department: 'የመንፈሳዊ ዘርፍ ጉባኤ / የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)',
    departments: ['የመንፈሳዊ ዘርፍ ጉባኤ', 'የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)'],
    status: 'በስራ ላይ'
  },
  {
    id: 930002,
    category: 'full_time_minister',
    name: 'መጋቢ ጉጃ ኡባ',
    gender: 'ወ',
    roleTitle: 'መጋቢ',
    roleTitles: ['መጋቢ'],
    department: 'የመንፈሳዊ ዘርፍ ጉባኤ / የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)',
    departments: ['የመንፈሳዊ ዘርፍ ጉባኤ', 'የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)'],
    status: 'በስራ ላይ'
  },
  {
    id: 930003,
    category: 'full_time_minister',
    name: 'መጋቢ ገላዬ አንጃ',
    gender: 'ወ',
    roleTitle: 'መጋቢ',
    roleTitles: ['መጋቢ'],
    department: 'የመንፈሳዊ ዘርፍ ጉባኤ / የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)',
    departments: ['የመንፈሳዊ ዘርፍ ጉባኤ', 'የሽማግሌዎች ጉባኤ (ስራ አስፈጻሚዎች)'],
    status: 'በስራ ላይ'
  },
  {
    id: 930004,
    category: 'full_time_minister',
    name: 'መምህር ታዲዎስ ሚልክያስ',
    gender: 'ወ',
    roleTitle: 'መምህር',
    roleTitles: ['መምህር'],
    department: 'የመጽሐፍ ቅዱስ ትምህርት ቤት',
    departments: ['የመጽሐፍ ቅዱስ ትምህርት ቤት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930005,
    category: 'full_time_minister',
    name: 'ወንጌላዊት ታጋይ ጵጥሮስ',
    gender: 'ሴ',
    roleTitle: 'ወንጌላዊት',
    roleTitles: ['ወንጌላዊት'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930006,
    category: 'full_time_minister',
    name: 'ወንጌላዊ ደማ መና',
    gender: 'ወ',
    roleTitle: 'ወንጌላዊ',
    roleTitles: ['ወንጌላዊ'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930007,
    category: 'full_time_minister',
    name: 'ወንጌላዊ መላኩ ግርማ',
    gender: 'ወ',
    roleTitle: 'ወንጌላዊ',
    roleTitles: ['ወንጌላዊ'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930008,
    category: 'full_time_minister',
    name: 'ወንጌላዊ ጋይጣ ጩንዱሬ',
    gender: 'ወ',
    roleTitle: 'ወንጌላዊ',
    roleTitles: ['ወንጌላዊ'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930009,
    category: 'full_time_minister',
    name: 'ወንጌላዊ መስፍን ሻንካ',
    gender: 'ወ',
    roleTitle: 'ወንጌላዊ',
    roleTitles: ['ወንጌላዊ'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930010,
    category: 'full_time_minister',
    name: 'ወንጌላዊ አሰፋ አሳለ',
    gender: 'ወ',
    roleTitle: 'ወንጌላዊ',
    roleTitles: ['ወንጌላዊ'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930011,
    category: 'full_time_minister',
    name: 'ወንጌላዊ ማቴዎስ ማሳነ',
    gender: 'ወ',
    roleTitle: 'ወንጌላዊ',
    roleTitles: ['ወንጌላዊ'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930012,
    category: 'full_time_minister',
    name: 'ወንጌላዊ ካሰች ብርሃኑ',
    gender: 'ሴ',
    roleTitle: 'ወንጌላዊት',
    roleTitles: ['ወንጌላዊት'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930013,
    category: 'full_time_minister',
    name: 'ወንጌላዊ አካሉ አንጃ',
    gender: 'ወ',
    roleTitle: 'ወንጌላዊ',
    roleTitles: ['ወንጌላዊ'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930014,
    category: 'full_time_minister',
    name: 'ወንጌላዊ አማረች ደጉ',
    gender: 'ሴ',
    roleTitle: 'ወንጌላዊት',
    roleTitles: ['ወንጌላዊት'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930015,
    category: 'full_time_minister',
    name: 'ወንጌላዊ ገላትያ ደስታ',
    gender: 'ሴ',
    roleTitle: 'ወንጌላዊ',
    roleTitles: ['ወንጌላዊ'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  },
  {
    id: 930016,
    category: 'full_time_minister',
    name: 'አስራት አማኑኤል',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    departments: [],
    status: 'በስራ ላይ'
  },
  {
    id: 930017,
    category: 'full_time_minister',
    name: 'ወንጌላዊት ልቤወርቅ ጨንቻ',
    gender: 'ሴ',
    roleTitle: 'ወንጌላዊት',
    roleTitles: ['ወንጌላዊት'],
    department: 'የወንጌል አገልግሎት',
    departments: ['የወንጌል አገልግሎት'],
    status: 'በስራ ላይ'
  }
];

export const DEFAULT_ADMIN_STAFF: ChurchHRRecord[] = [
  {
    id: 930101,
    category: 'admin_staff',
    name: 'አቶ መኮንን ሞላ',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930102,
    category: 'admin_staff',
    name: 'ዳዊት ደሳለኝ',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930103,
    category: 'admin_staff',
    name: 'ኡሹላ ባሳ',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930104,
    category: 'admin_staff',
    name: 'ዳዊት ደሳለኝ ጥያንሶ',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930105,
    category: 'admin_staff',
    name: 'ሞደስ ሞጃ',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930106,
    category: 'admin_staff',
    name: 'ተገኝ ኦዳ',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930107,
    category: 'admin_staff',
    name: 'ሕዝቀኤል',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930108,
    category: 'admin_staff',
    name: 'ማርቆስ',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930109,
    category: 'admin_staff',
    name: 'ኢያሱ',
    gender: 'ወ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930110,
    category: 'admin_staff',
    name: 'ሳራ ደአ',
    gender: 'ሴ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  },
  {
    id: 930111,
    category: 'admin_staff',
    name: 'መሰለች',
    gender: 'ሴ',
    roleTitle: HR_UNASSIGNED_ROLE_PLACEHOLDER,
    roleTitles: [],
    department: 'አስተዳደርና ፋይናንስ',
    departments: ['አስተዳደርና ፋይናንስ'],
    status: 'በስራ ላይ'
  }
];

export const DEFAULT_CHURCH_HR_RECORDS: ChurchHRRecord[] = [
  ...DEFAULT_FULL_TIME_MINISTERS,
  ...DEFAULT_ADMIN_STAFF
];

export const createDefaultAdminFinanceWorkspaceData = (): DepartmentWorkspaceData => ({
  ...createEmptyDepartmentWorkspaceData(),
  hrRecords: DEFAULT_CHURCH_HR_RECORDS.map((r) => ({
    ...r,
    roleTitles: r.roleTitles ? [...r.roleTitles] : undefined,
    departments: r.departments ? [...r.departments] : undefined
  })),
  adminHrDefaultSeeded: true,
  adminHrMinistersV2Seeded: true
});

export const DEFAULT_CHILDREN_INTERNAL_BYLAWS_TEXT =
  'የአጥቢያዪቱ የልጆች አገልግሎት ከቤተ ክርስቲያኒቱ መተዳደሪያ ደንብ ጋር የማይጋጭ ውስጣዊ አሠራር ደንብ፦ የልጆች ጠቅላላ ጉባኤ ከተወለዱ እስከ 14 ዓመት ዕድሜ ያላቸውን ልጆች ያቅፋል፤ የልጆች አገልግሎት ኮሚቴ እንደ አስፈላጊነቱ ከ3 እስከ 7 አባላት ይኖሩታል፤ የሙሉ ጊዜ የልጆች አገልግሎት አስተባባሪ ተጠሪነቱ ለአጥቢያ መንፈሳዊ ዘርፍ ኃላፊ እና ለሰብሳቢው ይሆናል። የሰብሳቢው አንድ የምርጫ ዙር ሦስት ዓመት ሲሆን ለሁለተኛ ዙር ከተመረጠ እና አንድ የምርጫ ዙር ከማንኛውም መዋቅር መሪነት በማረፍ በድጋሚ ሊመረጥ ይችላል።';

export interface ChildrenMinistryCharterSection {
  structure: string[];
  accountabilityAndTerms: string[];
  mandates: string[];
}

export const CHILDREN_MINISTRY_CHARTER: ChildrenMinistryCharterSection = {
  structure: [
    'የልጆች ጠቅላላ ጉባኤ ዕድሜያቸው ከተወለዱ እስከ 14 ዓመት የሆኑ የቤተ ክርስቲያኒቱ አባላት ይኖሩታል',
    'የልጆች አገልግሎት ኮሚቴ እንደ አስፈላጊነቱ ከ3 እስከ 7 አባላት ይኖረዋል',
    'አገልግሎቱ የሙሉ ጊዜ የልጆች አገልግሎት አስተባባሪ ይኖረዋል',
    'አገልግሎቱ ከቤተ ክርስቲያኒቱ መተዳደሪያ ደንብ ጋር የማይጋጭ ውስጣዊ ደንብ ያወጣል'
  ],
  accountabilityAndTerms: [
    'የአጥቢያዪቱ የልጆች አገልግሎት ተጠሪነቱ ለአጥቢያዪቱ መንፈሳዊ ዘርፍ ኃላፊ ነው',
    'የልጆች አገልግሎት አስተባባሪ ተጠሪነቱ ለአጥቢያ መንፈሳዊ ዘርፍ ኃላፊ እና ለሰብሳቢ ሆኖ ኃላፊነቶች እና ተግባራት በልጆች አገልግሎት ውስጣዊ ደንብ ተዘርዝሮ ይገኛል',
    'የሰብሳቢው አንድ የምርጫ ዙር ሦስት ዓመት ሲሆን፤ ለሁለተኛ ዙር ከተመረጠ እና አንድ የምርጫ ዙር ከማንኛውም መዋቅር መሪነት በማረፍ በድጋሚ ሊመረጥ ይችላል'
  ],
  mandates: [
    'የአገልግሎቱን የሥራ እቅድ፤ በጀት እና መርኃ ግብር ማዘጋጀት፤ በአጥቢያዪቱ መንፈሳዊ ዘርፍ ኃላፊ በኩል ለሽማግሌዎች ጉባኤ ቀርቦ ሲጸድቅ ተግባራዊ መሆኑን መከታተል',
    'አገልግሎቱን በማደራጀት፤ በማዋቀር እና በማስተባበር፤ መሪዎችን ማስመረጥ',
    'በአጥቢያ የሚገኙ ልጆች በወንጌል አገልግሎት በተለይም ለዕድሜ እኩዮቻቸው እንዲመሰክሩ ማነሳሳት',
    'ለልጆች የመነቃቂያ፤ የማስተማሪያ እና የመዝናኛ ፕሮግራሞችን ማዘጋጀት',
    'የጸሎት፤ የመዝሙር፤ የምስክርነት እና የድራማ ቡድኖችን ማቋቋም፤ ማስተባበር',
    'የልጆችን ዕድሜ ያገናዘበ መንፈሳዊ ትምህርቶችን ከመንፈሳዊ ዘርፍ ጋር በመተባበር እንዲዘጋጅ ማድረግ፤ በሥራ ላይ እንዲውል ማድረግ',
    'ለአጥቢያዪቱ መሪዎች፤ ለሰንበት ትምህርት አስተማሪዎች እና ለልጆች አገልግሎት አስተባባሪዎች ስልጠና እንዲሰጥ ማመቻቸት',
    'በአጥቢያዪቱ የሚገኙ ልጆች የመለገስ እና የርኁራኄ አገልግሎቶችን እንዲለማመዱ የሚያግዙ ፕሮግራሞችን ማዘጋጀት',
    'በአጥቢያዪቱ ለሚገኙ ልጆች ዓመታዊ የምስጋና እና የአንድነት ቀን ፕሮግራሞችን ማቅረብ፤ ተግባራዊ እንዲሆን ማድረግ',
    'የቤተ ክርስቲያን ልጆች የሚገለገሉበትን ዕቅድ ማውጣት፤ አፈጻጸሙንም መከታተል',
    'የልጅነት ዓመታትና ስለ ልጅነት ለወላጆች፤ ለቤተ ክርስቲያን መሪዎች እና ለምዕመናን ተገቢውን ግንዛቤ እንዲያገኙ ማድረግ',
    'በየዓመቱ ዕቅድ በመያዝ በመንፈሳዊ ትምህርትና በቀለም ትምህርት ልቀው የተገኙ ልጆችን በመሸለም ማበረታታት',
    'በመንፈሳዊ ትምህርት ቤቶችና ኮሌጆች ስለ ልጅነት የሚገልጽ በሥርዓተ ትምህርት ውስጥ እንዲካተት መሞገት፤ ማበረታታት',
    'አገልግሎቱን ሊያግዙ የሚችሉ የገቢ ማሰባሰቢያ ፕሮግራሞችን ማቅረብ፤ ማስተባበር፤ ተግባራዊ እንዲሆን ማድረግ',
    'በአጥቢያዪቱ የሚገኙ የልጆች አገልጋዮች በመንፈስ አንድነት ለአንድ ዓላማ እንዲሰሩ ማስተባበር',
    'ከመንፈሳዊ ዘርፍ ኃላፊ ጋር በመመካከር ልጆችን የደቀ መዝሙርነት ሕይወት አቅም ለማጠናከር መጽሐፍ ቅዱሳዊ ትምህርቶችን ማዘጋጀት፤ መስጠት፤ ሂደቱንም መከታተል',
    'ልጆች ልዩ ልዩ ክህሎት የሚያገኙበት መንገድ ማፈላለግ',
    'ከመንፈሳዊ ዘርፍና ከሰብሳቢው የሚሰጡትን ተጨማሪ ተግባራት ማከናወን'
  ]
};

export const createDefaultChildrenMinistryWorkspaceData = (): DepartmentWorkspaceData => ({
  ...createEmptyDepartmentWorkspaceData(),
  childrenInternalBylaws: DEFAULT_CHILDREN_INTERNAL_BYLAWS_TEXT,
  childrenAcademicAwards: [],
  childrenCharterSeeded: true
});

export const DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT =
  'የአጥቢያዪቱ የሴቶች አገልግሎት ከቤተ ክርስቲያኒቱ መተዳደሪያ ደንብ ጋር የማይጋጭ ውስጣዊ አሠራር ደንብ፦ የሴቶች አገልግሎት ጠቅላላ ጉባኤ ዕድሜያቸው ከ29 ዓመት በላይ የሆኑ የቤተ ክርስቲያኒቱ አባላትን ያቅፋል፤ ሆኖም ዕድሜያቸው ከ29 ዓመት በታች የሆኑ ባለ ትዳር ሴቶች በአገልግሎቱ መታቀፍ ከፈለጉ አይከለከሉም። የሥራ አስፈጻሚ ኮሚቴ እንደ አስፈላጊነቱ ከ3 እስከ 7 አባላት ይኖሩታል። የሙሉ ጊዜ የሴቶች አገልግሎት አስተባባሪ ተጠሪነቱ ለአጥቢያ መንፈሳዊ ዘርፍ ኃላፊ እና ለሰብሳቢ ሆኖ ኃላፊነቶችና ተግባራት በዚህ ውስጣዊ ደንብ መሠረት ይከናወናሉ። የሰብሳቢው አንድ የምርጫ ዙር ሦስት ዓመት ሲሆን፤ ለሁለተኛ ዙር ከተመረጡ እና አንድ የምርጫ ዙር ከተወረወሩ በኋላ በድጋሚ ሊመረጡ ይችላሉ።';

export interface WomenMinistryCharterSection {
  structure: string[];
  accountabilityAndTerms: string[];
  mandates: string[];
}

export const WOMEN_MINISTRY_CHARTER: WomenMinistryCharterSection = {
  structure: [
    'የሴቶች አገልግሎት ጠቅላላ ጉባኤ ዕድሜያቸው ከ29 ዓመት በላይ የሆኑ የቤተ ክርስቲያኒቱ አባላት ይኖሩታል',
    'ሆኖም ዕድሜያቸው ከ29 ዓመት በታች የሆኑ ባለ ትዳር ሴቶች በአገልግሎቱ መታቀፍ ከፈለጉ አይከለከሉም',
    'የሥራ አስፈጻሚ ኮሚቴ እንደ አስፈላጊነቱ ከ3 እስከ 7 አባላት ይኖረዋል',
    'አገልግሎቱ የሙሉ ጊዜ የሴቶች አገልግሎት አስተባባሪ ይኖረዋል',
    'አገልግሎቱ ከቤተ ክርስቲያኒቱ መተዳደሪያ ደንብ ጋር የማይጋጭ ውስጣዊ ደንብ ያወጣል'
  ],
  accountabilityAndTerms: [
    'የአጥቢያዪቱ የሴቶች አገልግሎት ተጠሪነቱ ለአጥቢያዪቱ መንፈሳዊ ዘርፍ ኃላፊ ነው',
    'የሴቶች አገልግሎት አስተባባሪ ተጠሪነቱ ለአጥቢያ መንፈሳዊ ዘርፍ ኃላፊ እና ለሰብሳቢ ሆኖ ኃላፊነቶች እና ተግባራት በሴቶች አገልግሎት ውስጣዊ ደንብ ተዘርዝሮ ይገኛል',
    'የሰብሳቢው አንድ የምርጫ ዙር ሦስት ዓመት ሲሆን፤ ለሁለተኛ ዙር ከተመረጡ እና አንድ የምርጫ ዙር ከተወረወሩ በኋላ በድጋሚ ሊመረጡ ይችላሉ',
    'በአጥቢያዪቱ የመሪዎች ጉባኤ ላይ በሰብሳቢው አማካይነት በውሳኔ ሰጪነት ይሳተፋል'
  ],
  mandates: [
    'የአገልግሎቱን የሥራ እቅድ፤ በጀት እና መርኃ ግብር ማዘጋጀት፤ በአጥቢያዪቱ መንፈሳዊ ዘርፍ ኃላፊ በኩል ለሽማግሌዎች ጉባኤ ቀርቦ ሲጸድቅ ተግባራዊ መሆኑን መከታተል',
    'አገልግሎቱን በማደራጀት፤ በማዋቀር እና በማስተባበር፤ መሪዎችን ማስመረጥ',
    'ከአጥቢያ መንፈሳዊ ዘርፍ ኃላፊ ጋር በመመካከር የሴቶችን የደቀ መዝሙርነት ሕይወት አቅም ለማጠናከር መጽሐፍ ቅዱሳዊ ትምህርቶችን ማዘጋጀት፤ መስጠት፤ ሂደቱንም መከታተል',
    'በአጥቢያዪቱ የተከናወኑ ሥራዎችን በመሰብሰብ እና በማጠናቀር ለመንፈሳዊ ዘርፍ ኃላፊ እና በቀጣይ ለሚገኝ የሴቶች አገልግሎት እርከን ሪፖርት ማድረግ',
    'ሴቶች ልዩ ልዩ ክህሎት የሚያገኙበትን መንገድ ማፈላለግ',
    'በአጥቢያዪቱ የመሪዎች ጉባኤ ላይ በሰብሳቢው አማካይነት በውሳኔ ሰጪነት መሳተፍ',
    'ከመንፈሳዊ ዘርፍና ከሰብሳቢው የሚሰጡትን ተጨማሪ ተግባራት ማከናወን'
  ]
};

export const DEFAULT_WOMEN_MINISTRY_PLANS: AnnualPlanItem[] = [
  {
    id: 940001,
    task: 'የሴቶች አገልግሎት የሥራ እቅድ፣ በጀት እና መርኃ ግብር ማዘጋጀትና ሲጸድቅ ተግባራዊነቱን መከታተል',
    unit: 'በዙር',
    yearPlan: 4,
    q1Plan: 1,
    q2Plan: 1,
    q3Plan: 1,
    q4Plan: 1,
    q1Done: 0,
    q2Done: 0,
    q3Done: 0,
    q4Done: 0,
    role: 'የሥራ አስፈጻሚ ኮሚቴና አስተባባሪ'
  },
  {
    id: 940002,
    task: 'የሴቶች አገልግሎትን በማደራጀት፣ በማዋቀርና በማስተባበር መሪዎችን ማስመረጥ',
    unit: 'በዙር',
    yearPlan: 2,
    q1Plan: 1,
    q2Plan: 0,
    q3Plan: 1,
    q4Plan: 0,
    q1Done: 0,
    q2Done: 0,
    q3Done: 0,
    q4Done: 0,
    role: 'ሰብሳቢና ሥራ አስፈጻሚ ኮሚቴ'
  },
  {
    id: 940003,
    task: 'ከአጥቢያ መንፈሳዊ ዘርፍ ኃላፊ ጋር በመመካከር የሴቶችን የደቀ መዝሙርነት ሕይወት ለማጠናከር መጽሐፍ ቅዱሳዊ ትምህርቶችን ማዘጋጀትና መስጠት',
    unit: 'በቁጥር',
    yearPlan: 24,
    q1Plan: 6,
    q2Plan: 6,
    q3Plan: 6,
    q4Plan: 6,
    q1Done: 0,
    q2Done: 0,
    q3Done: 0,
    q4Done: 0,
    role: 'አስተባባሪና መንፈሳዊ ዘርፍ'
  },
  {
    id: 940004,
    task: 'የተከናወኑ ሥራዎችን በመሰብሰብና በማጠናቀር ለመንፈሳዊ ዘርፍ ኃላፊ እና ለቀጣይ የሴቶች አገልግሎት እርከን ሪፖርት ማድረግ',
    unit: 'በዙር',
    yearPlan: 4,
    q1Plan: 1,
    q2Plan: 1,
    q3Plan: 1,
    q4Plan: 1,
    q1Done: 0,
    q2Done: 0,
    q3Done: 0,
    q4Done: 0,
    role: 'ሰብሳቢ፣ ጸሐፊና አስተባባሪ'
  },
  {
    id: 940005,
    task: 'ሴቶች ልዩ ልዩ ክህሎት የሚያገኙበትን ስልጠናና የዕድገት መንገድ ማፈላለግና ማመቻቸት',
    unit: 'በዙር',
    yearPlan: 4,
    q1Plan: 1,
    q2Plan: 1,
    q3Plan: 1,
    q4Plan: 1,
    q1Done: 0,
    q2Done: 0,
    q3Done: 0,
    q4Done: 0,
    role: 'የሥራ አስፈጻሚ ኮሚቴ'
  },
  {
    id: 940006,
    task: 'በአጥቢያዪቱ የመሪዎች ጉባኤ ላይ በሰብሳቢው አማካይነት በውሳኔ ሰጪነት መሳተፍ',
    unit: 'በቁጥር',
    yearPlan: 12,
    q1Plan: 3,
    q2Plan: 3,
    q3Plan: 3,
    q4Plan: 3,
    q1Done: 0,
    q2Done: 0,
    q3Done: 0,
    q4Done: 0,
    role: 'የሴቶች አገልግሎት ሰብሳቢ'
  }
];

export const createDefaultWomenMinistryWorkspaceData = (): DepartmentWorkspaceData => ({
  ...createEmptyDepartmentWorkspaceData(),
  plans: DEFAULT_WOMEN_MINISTRY_PLANS.map((p) => ({ ...p })),
  womenInternalBylaws: DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT,
  womenCharterSeeded: true
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
  },
  youth_children_dev_et1004: {
    surfaceBg: 'bg-teal-50/70',
    surfaceBorder: 'border-teal-200',
    surfaceHover: 'hover:border-teal-400 hover:bg-teal-50',
    iconBg: 'bg-teal-700',
    iconText: 'text-white',
    buttonBg: 'bg-teal-700',
    buttonHover: 'hover:bg-teal-600',
    loginHeaderBg: 'bg-gradient-to-br from-teal-900 via-emerald-950 to-slate-900',
    ringClass: 'focus:ring-teal-600',
    subtleText: 'text-teal-800'
  }
};

export const getOrgUnitTheme = (unitId: OrgUnitId): OrgUnitColorTheme =>
  ORG_UNIT_THEMES[unitId] || ORG_UNIT_THEMES.office;
