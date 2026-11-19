import { OrgUnitId } from '../types';

export type AppLanguage = 'am' | 'en';

export const UNIT_TRANSLATIONS_EN: Record<OrgUnitId, { name: string; shortDesc: string }> = {
  elders_council: {
    name: 'Elders Council',
    shortDesc: 'Highest governance, decision-making, and church-wide oversight council'
  },
  office: {
    name: 'Church Office',
    shortDesc: 'Church master registry, secretariat records, administration & community service hub'
  },
  holistic_community: {
    name: 'Holistic Community Service',
    shortDesc: 'Community development, health, education support, and social care ministry'
  },
  admin_finance: {
    name: 'Administration & Finance',
    shortDesc: 'Church income (tithes/offerings), expenses, budget, church HR, and property & assets'
  },
  spiritual_council: {
    name: 'Spiritual Sector Council',
    shortDesc: 'Church master registry and coordinating council for all spiritual ministries & chapels'
  },
  evangelism: {
    name: 'Evangelism Ministry',
    shortDesc: 'Gospel outreach, new believers follow-up, discipleship, and baptism preparation'
  },
  deacons: {
    name: 'Deacons Ministry',
    shortDesc: "Deacons roster, Lord's Supper preparation, visitation, and care for the sick and needy"
  },
  women_ministry: {
    name: 'Women Ministry',
    shortDesc: 'Married women (wives) spiritual fellowship, prayer groups, Bible study, and family encouragement'
  },
  youth_ministry: {
    name: 'Youth Ministry',
    shortDesc: 'Youth worship, choir, Bible study, literature, and service teams'
  },
  children_ministry: {
    name: 'Children Ministry',
    shortDesc: 'Church children registry (0–14), academic year, Sunday school classes & teacher portal'
  },
  chapels_dept: {
    name: 'Chapels',
    shortDesc: 'All 10 church chapels (Elroi, Shalom, Bethel, Yahweh, Eden, Ebenezer, Rehoboth, Elshaddai, Ruhama, Adonai)'
  },
  love_compassion: {
    name: 'Love & Compassion',
    shortDesc: 'Support and compassionate care for the needy, orphans, elderly, and sick'
  },
  development: {
    name: 'Development Sector',
    shortDesc: 'Church income generation, construction, infrastructure, and sustainable development projects'
  },
  bible_school: {
    name: 'Bible School',
    shortDesc: 'Bible school students, instructors, academic terms, tuition, and grades'
  },
  rehoboth_school: {
    name: 'Rehoboth Primary & Middle School',
    shortDesc: 'Rehoboth school students (KG–Grade 8), teachers, staff, and administration'
  },
  men_fellowship: {
    name: 'Men Fellowship',
    shortDesc: 'Men mutual care, fellowship, support in times of joy and sorrow, and visitation'
  },
  women_fellowship: {
    name: 'Women Fellowship Sector',
    shortDesc: 'Married women (wives) mutual support, emergency assistance, and fellowship contributions'
  }
};

export const CHAPEL_NAMES_EN: Record<string, string> = {
  'ኤልሮኢ ቻፕል': 'Elroi Chapel',
  'ሻሎም ቻፕል': 'Shalom Chapel',
  'ቤቴል ቻፕል': 'Bethel Chapel',
  'ያህዌ ቻፕል': 'Yahweh Chapel',
  'ኤዴን ቻፕል': 'Eden Chapel',
  'አቤንኤዘር ቻፕል': 'Ebenezer Chapel',
  'ርኆቦት ቻፕል': 'Rehoboth Chapel',
  'ኤልሻዳይ ቻፕል': 'Elshaddai Chapel',
  'ሩሐማ ቻፕል': 'Ruhama Chapel',
  'አዶናይ ቻፕል': 'Adonai Chapel'
};

export const translateChapelName = (chapel: string, lang: AppLanguage): string => {
  if (lang === 'am') return chapel;
  return CHAPEL_NAMES_EN[chapel] || chapel;
};

export const translateClassName = (className: string, lang: AppLanguage): string => {
  if (lang === 'am') return className;
  if (className === 'ማቆያ ክፍል') return 'Preschool (Makoya)';
  const m = className.match(/^(\d+)ኛ ክፍል(?:\s*(ሀ|ለ))?$/);
  if (m) {
    const grade = m[1];
    const sec = m[2] === 'ሀ' ? ' A' : m[2] === 'ለ' ? ' B' : '';
    return `Grade ${grade}${sec}`;
  }
  return className;
};

export const bi = (lang: AppLanguage, am: string, en: string): string =>
  lang === 'en' ? en : am;
