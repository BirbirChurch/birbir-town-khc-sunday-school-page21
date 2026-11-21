import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { OrgUnitId } from '../types';
import { getOrgUnitById } from '../constants/churchStructure';
import { AppLanguage, UNIT_TRANSLATIONS_EN, bi, translateChapelName, translateClassName } from '../utils/i18n';

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  toggleLang: () => void;
  t: (am: string, en: string) => string;
  unitName: (unitId: OrgUnitId, fallbackAm?: string) => string;
  unitDesc: (unitId: OrgUnitId, fallbackAm?: string) => string;
  chapelLabel: (chapel: string) => string;
  classLabel: (className: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'am',
  setLang: () => {},
  toggleLang: () => {},
  t: (am) => am,
  unitName: (unitId, fallbackAm) => getOrgUnitById(unitId)?.name || fallbackAm || unitId,
  unitDesc: (unitId, fallbackAm) => getOrgUnitById(unitId)?.shortDesc || fallbackAm || '',
  chapelLabel: (chapel) => chapel,
  classLabel: (className) => className
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('bk_ui_lang');
      if (saved === 'en' || saved === 'am') return saved;
    } catch {
      // ignore storage failure
    }
    return 'am';
  });

  useEffect(() => {
    try {
      localStorage.setItem('bk_ui_lang', lang);
    } catch {
      // ignore storage failure
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'am' ? 'en' : 'am'));
  }, []);

  const t = useCallback((am: string, en: string) => bi(lang, am, en), [lang]);

  const unitName = useCallback(
    (unitId: OrgUnitId, fallbackAm?: string) => {
      if (lang === 'en') {
        return UNIT_TRANSLATIONS_EN[unitId]?.name || getOrgUnitById(unitId)?.name || fallbackAm || unitId;
      }
      return getOrgUnitById(unitId)?.name || fallbackAm || unitId;
    },
    [lang]
  );

  const unitDesc = useCallback(
    (unitId: OrgUnitId, fallbackAm?: string) => {
      if (lang === 'en') {
        return UNIT_TRANSLATIONS_EN[unitId]?.shortDesc || getOrgUnitById(unitId)?.shortDesc || fallbackAm || '';
      }
      return getOrgUnitById(unitId)?.shortDesc || fallbackAm || '';
    },
    [lang]
  );

  const chapelLabel = useCallback(
    (chapel: string) => translateChapelName(chapel, lang),
    [lang]
  );

  const classLabel = useCallback(
    (className: string) => translateClassName(className, lang),
    [lang]
  );

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, toggleLang, t, unitName, unitDesc, chapelLabel, classLabel }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
