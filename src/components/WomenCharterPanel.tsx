import React, { useEffect, useRef, useState } from 'react';
import { ExportPhotoButton } from './ExportPhotoButton';
import {
  Users,
  ShieldCheck,
  ClipboardList,
  BookOpen,
  CheckCircle2,
  Save,
  RotateCcw,
  UserCheck,
  Target,
  Wallet,
  Send
} from 'lucide-react';
import {
  DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT,
  WOMEN_MINISTRY_CHARTER
} from '../constants/churchStructure';
import { useLanguage } from '../context/LanguageContext';

interface WomenCharterPanelProps {
  currentYear: string;
  internalBylaws: string;
  membersCount: number;
  leadersCount: number;
  plansCount: number;
  onSaveInternalBylaws: (text: string) => void;
  onNavigateTab: (
    tab: 'leaders' | 'members' | 'plans' | 'finances' | 'send_to_spiritual' | 'activities'
  ) => void;
}

export const WomenCharterPanel: React.FC<WomenCharterPanelProps> = ({
  currentYear,
  internalBylaws,
  membersCount,
  leadersCount,
  plansCount,
  onSaveInternalBylaws,
  onNavigateTab
}) => {
  const { t } = useLanguage();
  const [bylawsDraft, setBylawsDraft] = useState(
    internalBylaws || DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT
  );
  const [bylawsSavedBanner, setBylawsSavedBanner] = useState(false);
  const charterExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBylawsDraft(internalBylaws || DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT);
  }, [internalBylaws]);

  const handleSave = () => {
    const clean = bylawsDraft.trim() || DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT;
    onSaveInternalBylaws(clean);
    setBylawsDraft(clean);
    setBylawsSavedBanner(true);
    setTimeout(() => setBylawsSavedBanner(false), 3500);
  };

  const handleReset = () => {
    setBylawsDraft(DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT);
    onSaveInternalBylaws(DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT);
    setBylawsSavedBanner(true);
    setTimeout(() => setBylawsSavedBanner(false), 3500);
  };

  return (
    <div ref={charterExportRef} className="space-y-5">
      {/* Header & Quick Navigation */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-pink-700 shrink-0" />
              <span>
                {t(
                  'የአጥቢያ ቤተ ክርስቲያን የሴቶች አገልግሎት አወቃቀር፣ ተጠሪነት እና ተግባር',
                  'Women Ministry Structure, Accountability & Responsibilities'
                )}
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {t(
                `የ${currentYear} ዓ/ም የሴቶች አገልግሎት አጠቃላይ መዋቅር፣ የሥራ አስፈጻሚ ኮሚቴ (3–7 አባላት)፣ የሙሉ ጊዜ አስተባባሪ እና የውስጣዊ ደንብ ማስተዳደሪያ።`,
                `Women Ministry governance structure (${currentYear}), executive committee (3–7 members), full-time coordinator, and internal bylaws.`
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <ExportPhotoButton
              targetRef={charterExportRef}
              fileName={`የሴቶች_አገልግሎት_አወቃቀርና_ደንብ_${currentYear}`}
              variant="secondary"
              compact
            />
            <button
              type="button"
              onClick={() => onNavigateTab('members')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t(`ጠቅላላ ጉባኤ (${membersCount})`, `Assembly (${membersCount})`)}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('leaders')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{t(`ሥራ አስፈጻሚ (${leadersCount})`, `Committee (${leadersCount})`)}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('plans')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              <span>{t(`እቅድና ክንውን (${plansCount})`, `Plans (${plansCount})`)}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('finances')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{t('በጀትና ሂሳብ', 'Budget')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('send_to_spiritual')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-pink-700 hover:bg-pink-600 text-white cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('ሪፖርት ላክ', 'Send Report')}</span>
            </button>
          </div>
        </div>

        {/* Key Structural Benchmarks */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-pink-50/70 border border-pink-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-pink-800">
              {t('ጠቅላላ ጉባኤ', 'General Assembly')}
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-1">
              {t('ከ29 ዓመት በላይ ሴት አባላት', 'Women Over 29 Years')}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              {t(
                'ከ29 ዓመት በታች የሆኑ ባለ ትዳር ሴቶች መታቀፍ ከፈለጉ አይከለከሉም',
                'Married women under 29 who wish to join are welcomed'
              )}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-slate-600">
              {t('የሥራ አስፈጻሚ ኮሚቴ', 'Executive Committee')}
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-1 tabular-nums">
              {t('ከ3 እስከ 7 አባላት', '3 to 7 Members')}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {t(`በመዝገብ ላይ ያሉ አመራሮች፦ ${leadersCount}`, `Registered leaders: ${leadersCount}`)}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-slate-600">
              {t('የሙሉ ጊዜ አስተባባሪ እና ተጠሪነት', 'Full-Time Coordinator & Accountability')}
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-1">
              {t('ለመንፈሳዊ ዘርፍ ኃላፊና ለሰብሳቢ', 'Spiritual Sector Head & Chair')}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {t(
                'የሴቶች አገልግሎት ተጠሪነት ለመንፈሳዊ ዘርፍ ኃላፊ ነው',
                'Ministry reports to the Spiritual Sector Head'
              )}
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-amber-800">
              {t('የሰብሳቢ ምርጫ ዘመን', 'Chair Election Term')}
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-1">
              {t('3 ዓመት (2 ዙር + 1 ዙር እረፍት)', '3 Years (2 Terms + 1 Rest)')}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {t(
                'በመሪዎች ጉባኤ በሰብሳቢው አማካይነት በውሳኔ ሰጪነት ይሳተፋል',
                'Participates in Leaders Council decisions via the Chair'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Structure & Accountability Two-Column Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-700 shrink-0" />
            <span>{t('የአጥቢያዪቱ የሴቶች አገልግሎት አወቃቀር', 'Women Ministry Structure')}</span>
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-800">
            {WOMEN_MINISTRY_CHARTER.structure.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 bg-pink-50/40 border border-pink-100 rounded-xl px-3.5 py-2.5 leading-relaxed"
              >
                <CheckCircle2 className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
                <span className="font-semibold">{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0" />
            <span>{t('ተጠሪነት፣ የምርጫ ዘመን እና ውክልና', 'Accountability, Term Limits & Representation')}</span>
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-800">
            {WOMEN_MINISTRY_CHARTER.accountabilityAndTerms.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 leading-relaxed"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <span className="font-semibold">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Mandates & Responsibilities (No Numbers) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{t('የሴቶች አገልግሎት ኃላፊነት እና ተግባር', 'Women Ministry Responsibilities & Mandates')}</span>
          </h4>
          <button
            type="button"
            onClick={() => onNavigateTab('activities')}
            className="text-xs font-bold text-pink-800 hover:underline cursor-pointer print:hidden"
          >
            {t('የአገልግሎት ተግባራትን መዝግብ →', 'Log Ministry Activity →')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {WOMEN_MINISTRY_CHARTER.mandates.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 leading-relaxed text-slate-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Editable Internal Bylaws */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-pink-700 shrink-0" />
              <span>
                {t(
                  'ከመተዳደሪያ ደንብ ጋር የማይጋጭ የሴቶች አገልግሎት ውስጣዊ ደንብ',
                  'Women Ministry Internal Bylaws (Consistent with Church Charter)'
                )}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t(
                'የሴቶች አገልግሎት አስተባባሪ እና የሥራ አስፈጻሚ ኮሚቴ ዝርዝር ተግባራትና ውስጣዊ አሠራር እዚህ ይመዘገባል እና ይቀመጣል።',
                'Detailed coordinator duties and ministry procedures are maintained and saved here.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('ወደ ነባሪ መልስ', 'Reset Default')}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-pink-700 hover:bg-pink-600 text-white cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('ውስጣዊ ደንብ አስቀምጥ', 'Save Bylaws')}</span>
            </button>
          </div>
        </div>

        {bylawsSavedBanner && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{t('የሴቶች አገልግሎት ውስጣዊ ደንብ በተሳካ ሁኔታ ተቀምጧል።', 'Internal bylaws saved successfully.')}</span>
          </div>
        )}

        <textarea
          rows={5}
          value={bylawsDraft}
          onChange={(e) => setBylawsDraft(e.target.value)}
          className="w-full px-3.5 py-2.5 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-600 leading-relaxed"
        />
      </section>
    </div>
  );
};
