import React, { useState, useMemo } from 'react';
import {
  Shield,
  GraduationCap,
  ArrowLeft,
  Church,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  Building2,
  Database,
  ChevronRight,
  HeartHandshake,
  Wallet,
  BookOpen,
  Users,
  Megaphone,
  Baby,
  Sprout,
  HandHeart,
  School,
  Globe
} from 'lucide-react';
import { OrgUnitId, Role, Teacher } from '../types';
import { DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from '../constants/initialData';
import {
  DEFAULT_ORG_UNIT_PINS,
  ORG_UNIT_THEMES,
  getOrgUnitById,
  getOrgUnitChildren,
  getOrgUnitTheme
} from '../constants/churchStructure';
import { useLanguage } from '../context/LanguageContext';

interface LoginPortalProps {
  teachers: Teacher[];
  adminPin?: string;
  leaderPin?: string;
  childrenCoordinatorPin?: string;
  chapelPins?: { [chapelName: string]: string };
  unitPins?: { [unitId: string]: string };
  chapelList?: string[];
  onLoginSuccess: (
    role: Role,
    teacher?: Teacher,
    chapel?: string,
    unitId?: OrgUnitId
  ) => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  teachers,
  adminPin = '1234',
  leaderPin = '5678',
  childrenCoordinatorPin = '5679',
  chapelPins = DEFAULT_CHAPEL_PINS,
  unitPins = DEFAULT_ORG_UNIT_PINS,
  chapelList = DEFAULT_CHAPELS,
  onLoginSuccess
}) => {
  const { lang, setLang, t, unitName, unitDesc, chapelLabel } = useLanguage();
  const [activeMode, setActiveMode] = useState<'admin' | 'teacher' | 'unit' | null>(null);
  const [activeUnitId, setActiveUnitId] = useState<OrgUnitId | null>(null);
  const [chapelAuthMode, setChapelAuthMode] = useState<'dept' | 'single_chapel'>('single_chapel');
  const [childrenAuthMode, setChildrenAuthMode] = useState<'coordinator' | 'leader' | 'teacher'>('coordinator');
  const [selectedChapel, setSelectedChapel] = useState<string>(chapelList[0] || DEFAULT_CHAPELS[0]);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const eldersUnit = useMemo(() => getOrgUnitById('elders_council')!, []);
  const officeUnit = useMemo(() => getOrgUnitById('office')!, []);
  const officeChildren = useMemo(() => getOrgUnitChildren('office'), []);
  const spiritualUnit = useMemo(() => getOrgUnitById('spiritual_council')!, []);
  const spiritualChildren = useMemo(() => getOrgUnitChildren('spiritual_council'), []);

  const handleSelectAdmin = () => {
    setActiveMode('admin');
    setActiveUnitId(null);
    setPinInput('');
    setShowPin(false);
    setErrorMsg('');
  };

  const handleSelectUnit = (unitId: OrgUnitId) => {
    setActiveMode('unit');
    setActiveUnitId(unitId);
    setPinInput('');
    setShowPin(false);
    setErrorMsg('');
    if (unitId === 'children_ministry') {
      setChildrenAuthMode('coordinator');
    }
    if (unitId === 'chapels_dept') {
      setChapelAuthMode('single_chapel');
      if (chapelList.length > 0) setSelectedChapel(chapelList[0]);
    }
  };

  const handleBack = () => {
    setActiveMode(null);
    setActiveUnitId(null);
    setPinInput('');
    setShowPin(false);
    setErrorMsg('');
  };

  const handleVerifyAndLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pinInput.trim();
    if (!entered) {
      setErrorMsg(t('እባክዎን የመግቢያ ቁልፍ (PIN) ያስገቡ!', 'Please enter your access PIN!'));
      return;
    }

    if (activeMode === 'admin') {
      const expected = String(adminPin || '1234').trim();
      if (entered === expected) {
        onLoginSuccess('admin');
      } else {
        setErrorMsg(t('የዋና አዲሚን መግቢያ ቁልፍ (PIN) ትክክል አይደለም!', 'Incorrect Super Admin PIN!'));
      }
      return;
    }

    if (activeMode === 'teacher' || (activeMode === 'unit' && activeUnitId === 'children_ministry' && childrenAuthMode === 'teacher')) {
      const matchedTeacher = teachers.find(
        (tItem) => String(tItem.pin || '').trim() !== '' && String(tItem.pin || '').trim() === entered
      );
      if (matchedTeacher) {
        onLoginSuccess('teacher', matchedTeacher, undefined, 'children_ministry');
      } else {
        setErrorMsg(t('ያስገቡት የመምህር የምስጥር ቁጥር (PIN) ትክክል አይደለም!', 'Invalid Sunday School teacher PIN!'));
      }
      return;
    }

    if (activeMode === 'unit' && activeUnitId) {
      const unitDef = getOrgUnitById(activeUnitId);
      if (!unitDef) return;

      if (activeUnitId === 'chapels_dept' && chapelAuthMode === 'single_chapel') {
        const expected = String(
          chapelPins?.[selectedChapel] || DEFAULT_CHAPEL_PINS[selectedChapel] || ''
        ).trim();
        if (expected && entered === expected) {
          onLoginSuccess('leader', undefined, selectedChapel, 'chapels_dept');
        } else {
          setErrorMsg(
            t(
              `የ${selectedChapel} መግቢያ ቁልፍ (PIN) ትክክል አይደለም!`,
              `Incorrect access PIN for ${chapelLabel(selectedChapel)}!`
            )
          );
        }
        return;
      }

      if (activeUnitId === 'children_ministry' && childrenAuthMode === 'coordinator') {
        const expectedCoordinatorPin = String(childrenCoordinatorPin || '5679').trim();
        if (entered === expectedCoordinatorPin) {
          onLoginSuccess('children_coordinator', undefined, undefined, 'children_ministry');
        } else {
          setErrorMsg(
            t(
              'የ"የልጆች አገልግሎት አስተባባሪ" መግቢያ ቁልፍ (PIN) ትክክል አይደለም! እባክዎ ዋና አዲሚንን ይጠይቁ።',
              'Incorrect Children Ministry Coordinator PIN! Please contact Super Admin.'
            )
          );
        }
        return;
      }

      const expectedUnitPin =
        activeUnitId === 'children_ministry'
          ? String(unitPins?.children_ministry || leaderPin || unitDef.defaultPin).trim()
          : String(unitPins?.[activeUnitId] || unitDef.defaultPin).trim();

      if (entered === expectedUnitPin) {
        onLoginSuccess('leader', undefined, undefined, activeUnitId);
      } else {
        setErrorMsg(
          t(
            `የ"${unitDef.name}" መግቢያ ቁልፍ (PIN) ትክክል አይደለም! እባክዎ ዋና አዲሚንን ይጠይቁ።`,
            `Incorrect access PIN for "${unitName(unitDef.id, unitDef.name)}"!`
          )
        );
      }
    }
  };

  const activeUnit = activeUnitId ? getOrgUnitById(activeUnitId) : null;

  const getUnitIcon = (id: OrgUnitId, className = 'w-4 h-4') => {
    switch (id) {
      case 'elders_council':
        return <Shield className={className} />;
      case 'office':
        return <Building2 className={className} />;
      case 'holistic_community':
        return <HandHeart className={className} />;
      case 'admin_finance':
        return <Wallet className={className} />;
      case 'spiritual_council':
        return <BookOpen className={className} />;
      case 'evangelism':
        return <Megaphone className={className} />;
      case 'deacons':
        return <HeartHandshake className={className} />;
      case 'women_ministry':
        return <Users className={className} />;
      case 'youth_ministry':
        return <Users className={className} />;
      case 'children_ministry':
        return <Baby className={className} />;
      case 'chapels_dept':
        return <Church className={className} />;
      case 'love_compassion':
        return <HeartHandshake className={className} />;
      case 'development':
        return <Sprout className={className} />;
      case 'bible_school':
        return <BookOpen className={className} />;
      case 'rehoboth_school':
        return <School className={className} />;
      case 'men_fellowship':
        return <Users className={className} />;
      case 'women_fellowship':
        return <Users className={className} />;
      default:
        return <Building2 className={className} />;
    }
  };

  const getHeaderMeta = () => {
    if (activeMode === 'admin') {
      return {
        title: t('የዋና አዲሚን መቆጣጠሪያ መግቢያ (Super Admin)', 'Super Admin Control Login'),
        subtitle: t(
          'ሁሉንም መምሪያዎች፣ ቻፕሎች፣ ሰንበት ት/ቤት እና PIN ቁልፎችን ለመቆጣጠር የዋና አዲሚን PIN ያስገቡ',
          'Enter the Super Admin PIN to manage all ministries, chapels, Sunday school, and access PINs'
        ),
        headerBg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950',
        buttonBg: 'bg-blue-900 hover:bg-blue-800',
        ringClass: 'focus:ring-blue-700',
        icon: <Shield className="w-6 h-6 text-amber-300" />
      };
    }
    if (activeMode === 'teacher') {
      return {
        title: t('የልጆች አገልግሎት › የሰንበት ት/ቤት መምህራን መግቢያ', 'Children Ministry › Sunday School Teachers Login'),
        subtitle: t(
          'በዋና አዲሚን ወይም በልጆች አገልግሎት የተሰጠዎትን የግል ምስጥር ቁጥር (PIN) ያስገቡ',
          'Enter your personal teacher PIN assigned by Super Admin or Children Coordinator'
        ),
        headerBg: 'bg-gradient-to-br from-indigo-900 via-violet-950 to-slate-900',
        buttonBg: 'bg-indigo-800 hover:bg-indigo-700',
        ringClass: 'focus:ring-indigo-600',
        icon: <GraduationCap className="w-6 h-6 text-indigo-200" />
      };
    }
    if (activeUnit) {
      const theme = getOrgUnitTheme(activeUnit.id);
      return {
        title: unitName(activeUnit.id, activeUnit.name),
        subtitle: unitDesc(activeUnit.id, activeUnit.shortDesc),
        headerBg: theme.loginHeaderBg,
        buttonBg: `${theme.buttonBg} ${theme.buttonHover}`,
        ringClass: theme.ringClass,
        icon: getUnitIcon(activeUnit.id, 'w-6 h-6 text-white')
      };
    }
    return {
      title: t('መግቢያ', 'Sign In'),
      subtitle: '',
      headerBg: 'bg-slate-900',
      buttonBg: 'bg-blue-900 hover:bg-blue-800',
      ringClass: 'focus:ring-blue-600',
      icon: <KeyRound className="w-6 h-6 text-white" />
    };
  };

  const eldersTheme = ORG_UNIT_THEMES.elders_council;
  const officeTheme = ORG_UNIT_THEMES.office;
  const spiritualTheme = ORG_UNIT_THEMES.spiritual_council;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 w-full">
      {!activeMode ? (
        <div className="space-y-5">
          {/* Rich Royal Portal Header */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-300/35 text-amber-300 flex items-center justify-center shrink-0">
                <Church className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir Town Kale Heywet Church')}
                </h2>
                <p className="text-xs text-blue-100/85 mt-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    {t(
                      'የአጥቢያ ቤተ ክርስቲያን መዋቅር — እያንዳንዱ አገልግሎት በራሱ ገጽ እና መግቢያ ቁልፍ (PIN)',
                      'Local Church Structure — Independent workspace & PIN login for every ministry & chapel'
                    )}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Bilingual Language Switcher */}
              <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl p-0.5">
                <Globe className="w-3.5 h-3.5 text-amber-300 ml-1.5 mr-0.5" />
                <button
                  type="button"
                  onClick={() => setLang('am')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    lang === 'am' ? 'bg-amber-400 text-slate-950' : 'text-white hover:bg-white/10'
                  }`}
                >
                  አማርኛ
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    lang === 'en' ? 'bg-amber-400 text-slate-950' : 'text-white hover:bg-white/10'
                  }`}
                >
                  English
                </button>
              </div>

              <button
                type="button"
                onClick={handleSelectAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition cursor-pointer whitespace-nowrap"
              >
                <Shield className="w-4 h-4" />
                <span>{t('የዋና አዲሚን ገጽ', 'Super Admin')}</span>
              </button>
            </div>
          </div>

          {/* Colorful Top-to-Bottom Vertical Organizational Tree */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Level 1: Elders Council */}
            <div
              className={`p-4 sm:p-5 border-b border-amber-200 ${eldersTheme.surfaceBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl ${eldersTheme.iconBg} ${eldersTheme.iconText} flex items-center justify-center shrink-0 mt-0.5`}
                >
                  {getUnitIcon('elders_council', 'w-5 h-5')}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {unitName(eldersUnit.id, eldersUnit.name)}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">{unitDesc(eldersUnit.id, eldersUnit.shortDesc)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectUnit('elders_council')}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl ${eldersTheme.buttonBg} ${eldersTheme.buttonHover} text-white text-xs font-bold transition cursor-pointer shrink-0`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>{t('ግባ', 'Enter')}</span>
              </button>
            </div>

            {/* Vertical Branches under Elders Council */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Branch: Church Office */}
              <div className="relative pl-5 sm:pl-7 space-y-2.5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-indigo-200">
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${officeTheme.surfaceBg} ${officeTheme.surfaceBorder}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl ${officeTheme.iconBg} ${officeTheme.iconText} flex items-center justify-center shrink-0`}
                    >
                      {getUnitIcon('office', 'w-4 h-4')}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {unitName(officeUnit.id, officeUnit.name)}
                        </h4>
                        <span className="text-[11px] font-bold text-indigo-800 inline-flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          <span>{t('የቤተክርስቲያን መረጃ ቋት', 'Church Master Database')}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{unitDesc(officeUnit.id, officeUnit.shortDesc)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectUnit('office')}
                    className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl ${officeTheme.buttonBg} ${officeTheme.buttonHover} text-white text-xs font-bold transition cursor-pointer shrink-0`}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-indigo-200" />
                    <span>{t('ግባ', 'Enter')}</span>
                  </button>
                </div>

                {/* Vertical stack under Office */}
                <div className="relative pl-5 sm:pl-7 space-y-2 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  {officeChildren.map((child) => {
                    const tTheme = getOrgUnitTheme(child.id);
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => handleSelectUnit(child.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer group ${tTheme.surfaceBg} ${tTheme.surfaceBorder} ${tTheme.surfaceHover}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg ${tTheme.iconBg} ${tTheme.iconText} flex items-center justify-center shrink-0`}
                          >
                            {getUnitIcon(child.id, 'w-4 h-4')}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                              {unitName(child.id, child.name)}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                              {unitDesc(child.id, child.shortDesc)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold shrink-0 ${tTheme.subtleText}`}
                        >
                          <span>{t('ግባ', 'Enter')}</span>
                          <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Branch: Spiritual Sector Council */}
              <div className="relative pl-5 sm:pl-7 space-y-2.5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-sky-200">
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${spiritualTheme.surfaceBg} ${spiritualTheme.surfaceBorder}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl ${spiritualTheme.iconBg} ${spiritualTheme.iconText} flex items-center justify-center shrink-0`}
                    >
                      {getUnitIcon('spiritual_council', 'w-4 h-4')}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {unitName(spiritualUnit.id, spiritualUnit.name)}
                        </h4>
                        <span className="text-[11px] font-bold text-sky-800 inline-flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          <span>{t('የቤተክርስቲያን መረጃ ቋት', 'Church Master Database')}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{unitDesc(spiritualUnit.id, spiritualUnit.shortDesc)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectUnit('spiritual_council')}
                    className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl ${spiritualTheme.buttonBg} ${spiritualTheme.buttonHover} text-white text-xs font-bold transition cursor-pointer shrink-0`}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-sky-200" />
                    <span>{t('ግባ', 'Enter')}</span>
                  </button>
                </div>

                {/* Vertical stack under Spiritual Sector Council */}
                <div className="relative pl-5 sm:pl-7 space-y-2 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  {spiritualChildren.map((child) => {
                    const tTheme = getOrgUnitTheme(child.id);
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => handleSelectUnit(child.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer group ${tTheme.surfaceBg} ${tTheme.surfaceBorder} ${tTheme.surfaceHover}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg ${tTheme.iconBg} ${tTheme.iconText} flex items-center justify-center shrink-0`}
                          >
                            {getUnitIcon(child.id, 'w-4 h-4')}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                              {unitName(child.id, child.name)}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                              {unitDesc(child.id, child.shortDesc)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold shrink-0 ${tTheme.subtleText}`}
                        >
                          <span>{t('ግባ', 'Enter')}</span>
                          <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Role / Unit + PIN Entry Card with Distinct Color Header */
        (() => {
          const hdr = getHeaderMeta();
          return (
            <div className="max-w-xl mx-auto bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className={`${hdr.headerBg} text-white p-6 sm:p-7`}>
                <div className="flex items-center justify-between gap-3 mb-5">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white font-bold transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('ወደ ዋናው መዋቅር መግቢያ ተመለስ', 'Back to Structure Directory')}</span>
                  </button>

                  <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => setLang('am')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        lang === 'am' ? 'bg-amber-400 text-slate-950' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      አማ
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        lang === 'en' ? 'bg-amber-400 text-slate-950' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                    {hdr.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-extrabold text-white">{hdr.title}</h3>
                    <p className="text-xs text-white/80 mt-1 leading-relaxed">{hdr.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                {errorMsg && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyAndLogin} className="space-y-4">
                  {/* Chapel Selector for Chapels Department */}
                  {activeMode === 'unit' && activeUnitId === 'chapels_dept' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 p-1 bg-amber-50/80 border border-amber-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setChapelAuthMode('single_chapel');
                            setErrorMsg('');
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                            chapelAuthMode === 'single_chapel'
                              ? 'bg-amber-600 text-white'
                              : 'text-amber-900 hover:bg-amber-100/70'
                          }`}
                        >
                          {t('የአንድ ቻፕል መግቢያ (ከ10ሩ)', 'Single Chapel Login (1 of 10)')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChapelAuthMode('dept');
                            setErrorMsg('');
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                            chapelAuthMode === 'dept'
                              ? 'bg-amber-600 text-white'
                              : 'text-amber-900 hover:bg-amber-100/70'
                          }`}
                        >
                          {t('የሁሉም 10 ቻፕሎች መሪ', 'All 10 Chapels Director')}
                        </button>
                      </div>

                      {chapelAuthMode === 'single_chapel' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-2">
                            {t('የሚመሩትን ቻፕል ይምረጡ፦', 'Select your Chapel:')}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {chapelList.map((ch) => (
                              <button
                                key={`direct_ch_${ch}`}
                                type="button"
                                onClick={() => {
                                  setSelectedChapel(ch);
                                  setErrorMsg('');
                                }}
                                className={`p-2.5 rounded-xl border text-left transition font-extrabold text-xs flex items-center justify-between cursor-pointer ${
                                  selectedChapel === ch
                                    ? 'border-amber-600 bg-amber-50 text-amber-950'
                                    : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-slate-700'
                                }`}
                              >
                                <span className="truncate">{chapelLabel(ch)}</span>
                                {selectedChapel === ch && (
                                  <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Children Ministry: Coordinator vs Leader vs Sunday School Teacher Switcher */}
                  {activeMode === 'unit' && activeUnitId === 'children_ministry' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-cyan-50 border border-cyan-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setChildrenAuthMode('coordinator');
                            setErrorMsg('');
                          }}
                          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            childrenAuthMode === 'coordinator'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'text-emerald-950 hover:bg-emerald-100/70'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5 shrink-0" />
                          <span>{t('የልጆች አገልግሎት አስተባባሪ', 'Children Coordinator')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChildrenAuthMode('leader');
                            setErrorMsg('');
                          }}
                          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            childrenAuthMode === 'leader'
                              ? 'bg-cyan-700 text-white shadow-xs'
                              : 'text-cyan-950 hover:bg-cyan-100/70'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>{t('የልጆች አገልግሎት አመራር', 'Children Leadership')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChildrenAuthMode('teacher');
                            setErrorMsg('');
                          }}
                          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            childrenAuthMode === 'teacher'
                              ? 'bg-indigo-700 text-white shadow-xs'
                              : 'text-indigo-950 hover:bg-indigo-100/70'
                          }`}
                        >
                          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                          <span>{t('የመምህራን መግቢያ', 'Teachers Login')}</span>
                        </button>
                      </div>

                      {childrenAuthMode === 'coordinator' && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold">
                          {t(
                            'የልጆች አገልግሎት አስተባባሪ ገጹን ሙሉ በሙሉ የመቆጣጠር፣ የማስተዳደር፣ የማረም፣ አዳዲስ መረጃዎችንና መምህራንን የመጨመር ሙሉ ኃላፊነት አለው።',
                            'The Children Ministry Coordinator has full authority to control, manage, edit, add students & teachers, and oversee everything on this portal.'
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PIN Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-700" />
                      <span>
                        {activeMode === 'unit' && activeUnitId === 'chapels_dept' && chapelAuthMode === 'single_chapel'
                          ? t(`የ${selectedChapel} መግቢያ ቁልፍ (PIN) ያስገቡ፦`, `Enter PIN for ${chapelLabel(selectedChapel)}:`)
                          : activeMode === 'teacher' || (activeMode === 'unit' && activeUnitId === 'children_ministry' && childrenAuthMode === 'teacher')
                          ? t('የመምህር የግል ምስጥር ቁጥር (PIN) ያስገቡ፦', 'Enter Teacher Personal PIN:')
                          : activeMode === 'unit' && activeUnitId === 'children_ministry' && childrenAuthMode === 'coordinator'
                          ? t('የልጆች አገልግሎት አስተባባሪ መግቢያ ቁልፍ (PIN) ያስገቡ፦', 'Enter Children Coordinator PIN:')
                          : activeUnit
                          ? t(`የ${activeUnit.name} መግቢያ ቁልፍ (PIN) ያስገቡ፦`, `Enter PIN for ${unitName(activeUnit.id, activeUnit.name)}:`)
                          : t('የዋና አዲሚን መግቢያ ቁልፍ (PIN) ያስገቡ፦', 'Enter Super Admin PIN:')}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pinInput}
                        onChange={(e) => {
                          setPinInput(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder={t('የመግቢያ ቁልፍ (PIN) ይጻፉ...', 'Enter PIN...')}
                        autoFocus
                        className={`w-full px-4 py-3 pr-11 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 ${hdr.ringClass} bg-slate-50 focus:bg-white`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={showPin ? t('ደብቅ', 'Hide') : t('አሳይ', 'Show')}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full ${hdr.buttonBg} text-white font-bold py-3 px-4 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-2`}
                  >
                    <span>{t('አረጋግጥና ግባ', 'Verify & Enter')}</span>
                    <Check className="w-4 h-4 text-amber-300" />
                  </button>
                </form>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};

