import { OrgUnitId } from '../types';

export type AppLanguage = 'am' | 'en';

export const UNIT_TRANSLATIONS_EN: Record<OrgUnitId, { name: string; shortDesc: string }> = {
  elders_council: {
    name: 'Elders Council (Executive Committee)',
    shortDesc: ''
  },
  office: {
    name: 'Church Office',
    shortDesc: ''
  },
  holistic_community: {
    name: 'Holistic Community Service',
    shortDesc: ''
  },
  admin_finance: {
    name: 'Administration & Finance',
    shortDesc: ''
  },
  spiritual_council: {
    name: 'Spiritual Sector Council',
    shortDesc: ''
  },
  evangelism: {
    name: 'Evangelism Ministry',
    shortDesc: ''
  },
  deacons: {
    name: 'Deacons Ministry',
    shortDesc: ''
  },
  women_ministry: {
    name: 'Women Ministry',
    shortDesc: ''
  },
  youth_ministry: {
    name: 'Youth Ministry',
    shortDesc: ''
  },
  children_ministry: {
    name: 'Children Ministry',
    shortDesc: ''
  },
  chapels_dept: {
    name: 'Chapels',
    shortDesc: ''
  },
  love_compassion: {
    name: 'Love & Compassion',
    shortDesc: ''
  },
  development: {
    name: 'Development Sector',
    shortDesc: ''
  },
  bible_school: {
    name: 'Bible School',
    shortDesc: ''
  },
  rehoboth_school: {
    name: 'Rehoboth Primary & Middle School',
    shortDesc: ''
  },
  men_fellowship: {
    name: 'Men Fellowship',
    shortDesc: ''
  },
  women_fellowship: {
    name: 'Women Fellowship Sector',
    shortDesc: ''
  },
  youth_children_dev_et1004: {
    name: 'Youth & Children Development ET 1004',
    shortDesc: ''
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
