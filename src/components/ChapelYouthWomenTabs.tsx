import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  HeartHandshake,
  Search,
  UserPlus,
  Download,
  Printer,
  Edit2,
  Trash2,
  X,
  Check,
  Users,
  Home,
  Heart,
  Phone,
  MapPin,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ChurchMember, Role, WomenHouseholdCategory } from '../types';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { useLanguage } from '../context/LanguageContext';
import { mapToOfficialChapel } from './ChurchChildrenTab';
import { matchesAmharicSearch } from '../utils/churchExcelParser';
import { NameScriptMode, transliterateAmharicToEnglish } from '../utils/amharicTransliterator';
import {
  canonicalizeEducationLevel,
  canonicalizeOccupation,
  SUGGESTED_EDUCATION_LEVELS,
  SUGGESTED_OCCUPATIONS
} from '../utils/churchMemberBreakdownStats';
import {
  buildHouseholdContextMap,
  classifyWomanInChapel,
  getYouthAgeBracket,
  isFemaleMember,
  isMaleMember,
  isYouthMember,
  parseMemberNumericAge,
  resolveMemberHouseholdKey
} from '../utils/chapelDemographics';

interface SharedChapelRegistryProps {
  currentYear: string;
  churchMembers: ChurchMember[];
  chapelList?: string[];
  loggedInChapel?: string | null;
  currentUserRole?: Role;
  onAddMember: (member: Omit<ChurchMember, 'id'>) => ChurchMember | void;
  onUpdateMember: (member: ChurchMember) => void;
  onDeleteMember: (id: number) => void;
  nameScriptMode?: NameScriptMode;
}

const formatDisplayName = (name: string, mode: NameScriptMode = 'am'): string => {
  if (!name) return '';
  if (mode === 'en') return transliterateAmharicToEnglish(name);
  if (mode === 'both') return `${name} (${transliterateAmharicToEnglish(name)})`;
  return name;
};

/* ============================================================================
 * 1. CHAPEL YOUTH REGISTRY TAB (የወጣቶች መረጃ ቋት)
 * ========================================================================== */
export const ChapelYouthRegistryTab: React.FC<SharedChapelRegistryProps> = ({
  currentYear,
  churchMembers,
  chapelList = DEFAULT_CHAPELS,
  loggedInChapel,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  nameScriptMode = 'am'
}) => {
  const { t, chapelLabel } = useLanguage();
  const yearNum = parseInt(currentYear, 10) || 2018;
  const officialLockedChapel = loggedInChapel ? mapToOfficialChapel(loggedInChapel) : null;

  const [searchTerm, setSearchTerm] = useState('');
  const [chapelFilter, setChapelFilter] = useState<string>(officialLockedChapel || 'all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [bracketFilter, setBracketFilter] = useState<'all' | '15-19' | '20-24' | '25-29'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 40;

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);
  const [formError, setFormError] = useState('');
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [formAge, setFormAge] = useState('20');
  const [formChapel, setFormChapel] = useState(officialLockedChapel || chapelList[0] || DEFAULT_CHAPELS[0]);
  const [formPhone, setFormPhone] = useState('');
  const [formResidence, setFormResidence] = useState('');
  const [formEducation, setFormEducation] = useState('ኮሌጅ / ዩኒቨርሲቲ');
  const [formOccupation, setFormOccupation] = useState('ተማሪ');
  const [formYouthRole, setFormYouthRole] = useState('');
  const [formParent, setFormParent] = useState('');
  const [formBaptized, setFormBaptized] = useState(true);
  const [formSupper, setFormSupper] = useState(false);
  const [formTithe, setFormTithe] = useState(false);

  const activeChapelScope = officialLockedChapel || (chapelFilter !== 'all' ? chapelFilter : null);

  const scopedYouthRecords = useMemo(() => {
    return churchMembers
      .filter((m) => {
        if (!isYouthMember(m, yearNum)) return false;
        const ch = mapToOfficialChapel(m.chapel || '');
        if (officialLockedChapel && ch !== officialLockedChapel) return false;
        if (!officialLockedChapel && chapelFilter !== 'all' && ch !== chapelFilter) return false;
        return true;
      })
      .map((m) => ({
        member: m,
        numAge: parseMemberNumericAge(m.age, yearNum),
        officialChapel: mapToOfficialChapel(m.chapel || '')
      }));
  }, [churchMembers, yearNum, officialLockedChapel, chapelFilter]);

  const youthStats = useMemo(() => {
    let male = 0;
    let female = 0;
    let b15_19 = 0;
    let b20_24 = 0;
    let b25_29 = 0;
    let baptized = 0;

    scopedYouthRecords.forEach(({ member, numAge }) => {
      if (isFemaleMember(member)) female += 1;
      else male += 1;
      const bracket = getYouthAgeBracket(numAge);
      if (bracket === '15-19') b15_19 += 1;
      else if (bracket === '20-24') b20_24 += 1;
      else if (bracket === '25-29') b25_29 += 1;
      if (member.isBaptized) baptized += 1;
    });

    return {
      total: scopedYouthRecords.length,
      male,
      female,
      b15_19,
      b20_24,
      b25_29,
      baptized
    };
  }, [scopedYouthRecords]);

  const filteredRows = useMemo(() => {
    return scopedYouthRecords.filter(({ member, numAge }) => {
      if (genderFilter === 'male' && !isMaleMember(member)) return false;
      if (genderFilter === 'female' && !isFemaleMember(member)) return false;
      if (bracketFilter !== 'all' && getYouthAgeBracket(numAge) !== bracketFilter) return false;
      if (
        searchTerm.trim() &&
        !matchesAmharicSearch(
          searchTerm,
          member.name,
          member.memberCode,
          member.phone,
          member.residence,
          member.educationLevel,
          member.occupation,
          member.youthMinistryRole,
          member.parentName
        )
      ) {
        return false;
      }
      return true;
    });
  }, [scopedYouthRecords, genderFilter, bracketFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage]);

  const openAddModal = () => {
    setEditingMember(null);
    setFormError('');
    setFormName('');
    setFormGender('ወ');
    setFormAge('20');
    setFormChapel(officialLockedChapel || (chapelFilter !== 'all' ? chapelFilter : chapelList[0] || DEFAULT_CHAPELS[0]));
    setFormPhone('');
    setFormResidence('');
    setFormEducation('ኮሌጅ / ዩኒቨርሲቲ');
    setFormOccupation('ተማሪ');
    setFormYouthRole('');
    setFormParent('');
    setFormBaptized(true);
    setFormSupper(false);
    setFormTithe(false);
    setIsModalOpen(true);
  };

  const openEditModal = (m: ChurchMember) => {
    setEditingMember(m);
    setFormError('');
    setFormName(m.name || '');
    setFormGender(isFemaleMember(m) ? 'ሴ' : 'ወ');
    const ageVal = parseMemberNumericAge(m.age, yearNum);
    setFormAge(ageVal !== null ? String(ageVal) : '20');
    setFormChapel(officialLockedChapel || mapToOfficialChapel(m.chapel || ''));
    setFormPhone(m.phone || '');
    setFormResidence(m.residence || '');
    setFormEducation(canonicalizeEducationLevel(m.educationLevel) || '');
    setFormOccupation(canonicalizeOccupation(m.occupation) || '');
    setFormYouthRole(m.youthMinistryRole || '');
    setFormParent(m.parentName || '');
    setFormBaptized(Boolean(m.isBaptized));
    setFormSupper(Boolean(m.takesLordsSupper));
    setFormTithe(Boolean(m.paysTithe));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(t('እባክዎ የወጣቱን/ቷን ሙሉ ስም ያስገቡ።', 'Please enter full name.'));
      return;
    }
    const parsedAge = parseInt(formAge, 10);
    if (isNaN(parsedAge) || parsedAge < 12 || parsedAge > 45) {
      setFormError(t('እባክዎ ትክክለኛ ዕድሜ (15–29) ያስገቡ።', 'Please enter a valid youth age.'));
      return;
    }

    const targetChapel = officialLockedChapel || mapToOfficialChapel(formChapel);
    const payload: Omit<ChurchMember, 'id'> = {
      ...(editingMember || {}),
      name: formName.trim(),
      gender: formGender,
      age: parsedAge,
      chapel: targetChapel,
      phone: formPhone.trim() || undefined,
      residence: formResidence.trim() || undefined,
      educationLevel: canonicalizeEducationLevel(formEducation),
      occupation: canonicalizeOccupation(formOccupation),
      youthMinistryRole: formYouthRole.trim() || undefined,
      parentName: formParent.trim() || undefined,
      isBaptized: formBaptized,
      takesLordsSupper: formSupper,
      paysTithe: formTithe,
      isYouth: true,
      registeredDate: editingMember?.registeredDate || new Date().toISOString().split('T')[0]
    };

    if (editingMember) {
      onUpdateMember({ ...payload, id: editingMember.id });
      setFeedbackMsg(t(`✓ የ"${payload.name}" መረጃ በወጣቶች ቋት ዘምኗል።`, `Updated "${payload.name}" in Youth Registry.`));
    } else {
      onAddMember(payload);
      setFeedbackMsg(t(`✓ "${payload.name}" በ${targetChapel} የወጣቶች ቋት ተመዝግቧል።`, `Added "${payload.name}" to Youth Registry.`));
    }
    setTimeout(() => setFeedbackMsg(''), 5000);
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const scopeLabel = activeChapelScope || 'ሁሉም_10_ቻፕሎች';
    const rows: (string | number)[][] = [
      [`የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን — የወጣቶች መረጃ ቋት (${scopeLabel} · ${currentYear} ዓ/ም)`],
      [`ጠቅላላ ወጣቶች: ${filteredRows.length} | ወንድ: ${youthStats.male} | ሴት: ${youthStats.female}`],
      [],
      [
        'ተ.ቁ',
        'መለያ ኮድ',
        'ሙሉ ስም',
        'ጾታ',
        'ዕድሜ',
        'ቻፕል',
        'ስልክ ቁጥር',
        'መኖሪያ',
        'የትምህርት ደረጃ',
        'የስራ ዓይነት',
        'የአገልግሎት ድርሻ',
        'የተጠመቀ/ች',
        'የጌታ እራት',
        'አስራት'
      ],
      ...filteredRows.map(({ member, numAge, officialChapel }, i) => [
        i + 1,
        member.memberCode || '',
        member.name,
        isFemaleMember(member) ? 'ሴት' : 'ወንድ',
        numAge ?? '',
        officialChapel,
        member.phone || '',
        member.residence || '',
        canonicalizeEducationLevel(member.educationLevel) || '',
        canonicalizeOccupation(member.occupation) || '',
        member.youthMinistryRole || '',
        member.isBaptized ? 'አዎ' : 'አይ',
        member.takesLordsSupper ? 'አዎ' : 'አይ',
        member.paysTithe ? 'አዎ' : 'አይ'
      ])
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'የወጣቶች_መረጃ_ቋት');
    XLSX.writeFile(wb, `የወጣቶች_መረጃ_ቋት_${scopeLabel}_${currentYear}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header & KPI Strip */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-700 shrink-0" />
              <span>
                {activeChapelScope
                  ? t(`የ${activeChapelScope} የወጣቶች መረጃ ቋት`, `${chapelLabel(activeChapelScope)} Youth Registry`)
                  : t('የ10ሩም ቻፕሎች የወጣቶች መረጃ ቋት (15–29 ዓመት)', 'All Chapels Youth Registry (Ages 15–29)')}
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {t(
                'በቻፕሉ ውስጥ የሚገኙ ዕድሜያቸው ከ15–29 ዓመት የሆኑ ወጣቶች ከዋናው መዝገብ ጋር በቀጥታ የተሳሰረ የወጣቶች ቋት።',
                'Dedicated chapel youth database synchronized with the church member registry (ages 15–29).'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('አዲስ ወጣት መዝግብ', 'Add Youth')}</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2 rounded-xl text-xs font-bold">
            {feedbackMsg}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
            <div className="text-[11px] font-bold text-slate-500">{t('ጠቅላላ ወጣቶች', 'Total Youth')}</div>
            <div className="text-xl font-black text-slate-900 tabular-nums mt-0.5">{youthStats.total}</div>
          </div>
          <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/70">
            <div className="text-[11px] font-bold text-blue-800">{t('ወንድ ወጣቶች', 'Young Men')}</div>
            <div className="text-xl font-black text-blue-950 tabular-nums mt-0.5">{youthStats.male}</div>
          </div>
          <div className="border border-rose-200 rounded-xl p-3 bg-rose-50/70">
            <div className="text-[11px] font-bold text-rose-800">{t('ሴት ወጣቶች', 'Young Women')}</div>
            <div className="text-xl font-black text-rose-950 tabular-nums mt-0.5">{youthStats.female}</div>
          </div>
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="text-[11px] font-bold text-slate-500">{t('ዕድሜ 15–19', 'Age 15–19')}</div>
            <div className="text-xl font-black text-slate-800 tabular-nums mt-0.5">{youthStats.b15_19}</div>
          </div>
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="text-[11px] font-bold text-slate-500">{t('ዕድሜ 20–24', 'Age 20–24')}</div>
            <div className="text-xl font-black text-slate-800 tabular-nums mt-0.5">{youthStats.b20_24}</div>
          </div>
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="text-[11px] font-bold text-slate-500">{t('ዕድሜ 25–29', 'Age 25–29')}</div>
            <div className="text-xl font-black text-slate-800 tabular-nums mt-0.5">{youthStats.b25_29}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-2.5 pt-2 border-t border-slate-100 print:hidden">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('በስም፣ በመለያ ኮድ፣ በስልክ፣ በመኖሪያ ወይም በትምህርት ይፈልጉ...', 'Search by name, code, phone, residence...')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {!officialLockedChapel && (
            <select
              value={chapelFilter}
              onChange={(e) => {
                setChapelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800"
            >
              <option value="all">{t('ሁሉም 10ሩ ቻፕሎች', 'All 10 Chapels')}</option>
              {chapelList.map((ch) => (
                <option key={ch} value={ch}>
                  {chapelLabel(ch)}
                </option>
              ))}
            </select>
          )}

          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value as 'all' | 'male' | 'female');
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800"
          >
            <option value="all">{t('ሁሉም ጾታ', 'All Genders')}</option>
            <option value="male">{t('ወንድ ብቻ', 'Male Only')}</option>
            <option value="female">{t('ሴት ብቻ', 'Female Only')}</option>
          </select>

          <select
            value={bracketFilter}
            onChange={(e) => {
              setBracketFilter(e.target.value as 'all' | '15-19' | '20-24' | '25-29');
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800"
          >
            <option value="all">{t('ሁሉም የዕድሜ ክልል', 'All Ages (15–29)')}</option>
            <option value="15-19">{t('ከ15 – 19 ዓመት', '15–19 years')}</option>
            <option value="20-24">{t('ከ20 – 24 ዓመት', '20–24 years')}</option>
            <option value="25-29">{t('ከ25 – 29 ዓመት', '25–29 years')}</option>
          </select>
        </div>
      </section>

      {/* Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-3 text-left">{t('ተ.ቁ', '#')}</th>
                <th className="py-3 px-3 text-left">{t('መለያ ኮድ', 'Code')}</th>
                <th className="py-3 px-3 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                <th className="py-3 px-3 text-center">{t('ጾታ', 'Sex')}</th>
                <th className="py-3 px-3 text-center">{t('ዕድሜ', 'Age')}</th>
                <th className="py-3 px-3 text-left">{t('ቻፕል', 'Chapel')}</th>
                <th className="py-3 px-3 text-left">{t('ስልክ / መኖሪያ', 'Phone / Residence')}</th>
                <th className="py-3 px-3 text-left">{t('ትምህርት / ስራ', 'Edu / Occupation')}</th>
                <th className="py-3 px-3 text-left">{t('አገልግሎት / ሁኔታ', 'Ministry / Status')}</th>
                <th className="py-3 px-3 text-right print:hidden">{t('ተግባር', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    {t(
                      'በዚህ ማጣሪያ የተገኘ የወጣቶች መረጃ የለም። አዲስ ወጣት ለመጨመር "አዲስ ወጣት መዝግብ" የሚለውን ይጫኑ።',
                      'No youth records found for this filter. Click "Add Youth" to register.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRows.map(({ member, numAge, officialChapel }, idx) => (
                  <tr key={member.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                      {(safePage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-indigo-900 whitespace-nowrap">
                      {member.memberCode || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">
                        {formatDisplayName(member.name, nameScriptMode)}
                      </div>
                      {member.parentName && (
                        <div className="text-[11px] text-slate-500">
                          {t('ቤተሰብ/ወላጅ:', 'Family:')} {member.parentName}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isFemaleMember(member)
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {isFemaleMember(member) ? t('ሴት', 'F') : t('ወንድ', 'M')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 tabular-nums">
                      {numAge ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                      {chapelLabel(officialChapel)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {member.phone && (
                        <div className="font-mono text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.residence && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{member.residence}</span>
                        </div>
                      )}
                      {!member.phone && !member.residence && '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div>{canonicalizeEducationLevel(member.educationLevel) || '—'}</div>
                      {canonicalizeOccupation(member.occupation) && (
                        <div className="text-[11px] text-slate-500">{canonicalizeOccupation(member.occupation)}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {member.youthMinistryRole && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                            {member.youthMinistryRole}
                          </span>
                        )}
                        {member.isBaptized && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            {t('የተጠመቀ/ች', 'Baptized')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                      {confirmDeleteId === member.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMember(member.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            {t('አጥፋ', 'Confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            {t('ተው', 'Cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-800 cursor-pointer"
                            title={t('አርም', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(member.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title={t('ሰርዝ', 'Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden">
            <span className="tabular-nums">
              {t(`ገጽ ${safePage} ከ ${totalPages} (${filteredRows.length} ወጣቶች)`, `Page ${safePage} of ${totalPages} (${filteredRows.length} youth)`)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Add / Edit Youth Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <span>
                  {editingMember
                    ? t('የወጣት መረጃ ማስተካከያ', 'Edit Youth Record')
                    : t('አዲስ ወጣት መመዝገቢያ (15–29)', 'Register Youth Member (15–29)')}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ *', 'Gender *')}</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white"
                  >
                    <option value="ወ">{t('ወንድ', 'Male')}</option>
                    <option value="ሴ">{t('ሴት', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ዕድሜ *', 'Age *')}</label>
                  <input
                    type="number"
                    min={12}
                    max={45}
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ቻፕል *', 'Chapel *')}</label>
                  <select
                    value={officialLockedChapel || formChapel}
                    disabled={Boolean(officialLockedChapel)}
                    onChange={(e) => setFormChapel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white disabled:bg-slate-100"
                  >
                    {(officialLockedChapel ? [officialLockedChapel] : chapelList).map((ch) => (
                      <option key={ch} value={ch}>
                        {chapelLabel(ch)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መኖሪያ', 'Residence')}</label>
                  <input
                    type="text"
                    value={formResidence}
                    onChange={(e) => setFormResidence(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('በወጣቶች አገልግሎት ድርሻ', 'Youth Ministry Role')}
                  </label>
                  <input
                    type="text"
                    value={formYouthRole}
                    onChange={(e) => setFormYouthRole(e.target.value)}
                    placeholder={t('ምሳሌ፦ መዘምር፣ አስተባባሪ፣ የጸሎት ቡድን...', 'e.g. Choir, Coordinator, Prayer...')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የትምህርት ደረጃ', 'Education')}</label>
                  <input
                    type="text"
                    list="chapel-youth-edu"
                    value={formEducation}
                    onChange={(e) => setFormEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                  <datalist id="chapel-youth-edu">
                    {SUGGESTED_EDUCATION_LEVELS.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የስራ ዓይነት', 'Occupation')}</label>
                  <input
                    type="text"
                    list="chapel-youth-occ"
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                  <datalist id="chapel-youth-occ">
                    {SUGGESTED_OCCUPATIONS.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የወላጅ/የቤተሰብ መሪ ስም (አማራጭ)', 'Parent / Household Head (Optional)')}
                </label>
                <input
                  type="text"
                  value={formParent}
                  onChange={(e) => setFormParent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formBaptized}
                    onChange={(e) => setFormBaptized(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>{t('የተጠመቀ/ች', 'Baptized')}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSupper}
                    onChange={(e) => setFormSupper(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>{t('የጌታ እራት ይካፈላል/ትካፈላለች', "Lord's Supper")}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTithe}
                    onChange={(e) => setFormTithe(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>{t('አስራት ይከፍላል/ትከፍላለች', 'Pays Tithe')}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-blue-900 hover:bg-blue-800 text-white cursor-pointer"
                >
                  {editingMember ? t('ለውጡን አስቀምጥ', 'Save Changes') : t('በወጣቶች ቋት መዝግብ', 'Save Youth')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. CHAPEL WOMEN REGISTRY TAB (የሴቶች መረጃ ቋት — ባለትዳር እና ራሳቸው አባወራ)
 * ========================================================================== */
export const ChapelWomenRegistryTab: React.FC<SharedChapelRegistryProps> = ({
  currentYear,
  churchMembers,
  chapelList = DEFAULT_CHAPELS,
  loggedInChapel,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  nameScriptMode = 'am'
}) => {
  const { t, chapelLabel } = useLanguage();
  const yearNum = parseInt(currentYear, 10) || 2018;
  const officialLockedChapel = loggedInChapel ? mapToOfficialChapel(loggedInChapel) : null;

  const [categoryFilter, setCategoryFilter] = useState<'all' | WomenHouseholdCategory>('all');
  const [chapelFilter, setChapelFilter] = useState<string>(officialLockedChapel || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 40;

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);
  const [formError, setFormError] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<WomenHouseholdCategory>('married');
  const [formAge, setFormAge] = useState('32');
  const [formChapel, setFormChapel] = useState(officialLockedChapel || chapelList[0] || DEFAULT_CHAPELS[0]);
  const [formSpouseOrHead, setFormSpouseOrHead] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formResidence, setFormResidence] = useState('');
  const [formEducation, setFormEducation] = useState('');
  const [formOccupation, setFormOccupation] = useState('');
  const [formBaptized, setFormBaptized] = useState(true);
  const [formSupper, setFormSupper] = useState(true);
  const [formTithe, setFormTithe] = useState(true);

  const activeChapelScope = officialLockedChapel || (chapelFilter !== 'all' ? chapelFilter : null);

  const householdMap = useMemo(
    () => buildHouseholdContextMap(churchMembers, yearNum),
    [churchMembers, yearNum]
  );

  const scopedWomenRecords = useMemo(() => {
    return churchMembers
      .map((m) => {
        const category = classifyWomanInChapel(m, householdMap, yearNum);
        if (category !== 'married' && category !== 'female_head') return null;
        const officialChapel = mapToOfficialChapel(m.chapel || '');
        if (officialLockedChapel && officialChapel !== officialLockedChapel) return null;
        if (!officialLockedChapel && chapelFilter !== 'all' && officialChapel !== chapelFilter) return null;
        const hh = householdMap.get(resolveMemberHouseholdKey(m));
        return {
          member: m,
          category,
          officialChapel,
          numAge: parseMemberNumericAge(m.age, yearNum),
          spouseOrHeadHint:
            m.parentName ||
            (category === 'married' ? hh?.adultMaleHeadName : '') ||
            ''
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [churchMembers, householdMap, yearNum, officialLockedChapel, chapelFilter]);

  const womenStats = useMemo(() => {
    let married = 0;
    let femaleHead = 0;
    scopedWomenRecords.forEach((r) => {
      if (r.category === 'married') married += 1;
      else if (r.category === 'female_head') femaleHead += 1;
    });
    return {
      total: scopedWomenRecords.length,
      married,
      femaleHead
    };
  }, [scopedWomenRecords]);

  const filteredRows = useMemo(() => {
    return scopedWomenRecords.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (
        searchTerm.trim() &&
        !matchesAmharicSearch(
          searchTerm,
          r.member.name,
          r.member.memberCode,
          r.member.phone,
          r.member.residence,
          r.spouseOrHeadHint,
          r.member.educationLevel,
          r.member.occupation
        )
      ) {
        return false;
      }
      return true;
    });
  }, [scopedWomenRecords, categoryFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage]);

  const categoryLabel = (cat: WomenHouseholdCategory) => {
    if (cat === 'married') return t('ባለትዳር የሆነች ሴት', 'Married Woman');
    if (cat === 'female_head') return t('ራሷ የቤቱ አባወራ የሆነች ሴት', 'Female Head of Household');
    return t('ሌላ / ያልተመደበች', 'Other / Unassigned');
  };

  const handleQuickReclassify = (m: ChurchMember, nextCat: WomenHouseholdCategory) => {
    const statusText =
      nextCat === 'married'
        ? 'ባለትዳር'
        : nextCat === 'female_head'
        ? 'ራሷ የቤቱ አባወራ'
        : 'ያላገባች / ሌላ';
    const relationText =
      nextCat === 'married'
        ? m.relationToHead || 'ባለቤት / ሚስት'
        : nextCat === 'female_head'
        ? 'ራሷ የቤቱ አባወራ'
        : m.relationToHead;

    onUpdateMember({
      ...m,
      gender: 'ሴ',
      womenCategory: nextCat,
      maritalStatus: statusText,
      relationToHead: relationText
    });
    setFeedbackMsg(
      t(`✓ "${m.name}" ወደ "${categoryLabel(nextCat)}" ተመድባለች።`, `Reclassified "${m.name}" to ${categoryLabel(nextCat)}.`)
    );
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const openAddModal = (presetCategory: WomenHouseholdCategory = 'married') => {
    setEditingMember(null);
    setFormError('');
    setFormName('');
    setFormCategory(categoryFilter === 'female_head' ? 'female_head' : presetCategory);
    setFormAge('32');
    setFormChapel(officialLockedChapel || (chapelFilter !== 'all' ? chapelFilter : chapelList[0] || DEFAULT_CHAPELS[0]));
    setFormSpouseOrHead('');
    setFormPhone('');
    setFormResidence('');
    setFormEducation('');
    setFormOccupation('');
    setFormBaptized(true);
    setFormSupper(true);
    setFormTithe(true);
    setIsModalOpen(true);
  };

  const openEditModal = (m: ChurchMember, detectedCategory: WomenHouseholdCategory) => {
    setEditingMember(m);
    setFormError('');
    setFormName(m.name || '');
    setFormCategory(detectedCategory);
    const ageVal = parseMemberNumericAge(m.age, yearNum);
    setFormAge(ageVal !== null ? String(ageVal) : '32');
    setFormChapel(officialLockedChapel || mapToOfficialChapel(m.chapel || ''));
    setFormSpouseOrHead(m.parentName || '');
    setFormPhone(m.phone || '');
    setFormResidence(m.residence || '');
    setFormEducation(canonicalizeEducationLevel(m.educationLevel) || '');
    setFormOccupation(canonicalizeOccupation(m.occupation) || '');
    setFormBaptized(Boolean(m.isBaptized));
    setFormSupper(Boolean(m.takesLordsSupper));
    setFormTithe(Boolean(m.paysTithe));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(t('እባክዎ የሴቷን ሙሉ ስም ያስገቡ።', 'Please enter full name.'));
      return;
    }
    const parsedAge = parseInt(formAge, 10);
    if (isNaN(parsedAge) || parsedAge < 15 || parsedAge > 110) {
      setFormError(t('እባክዎ ትክክለኛ ዕድሜ (15+) ያስገቡ።', 'Please enter valid age (15+).'));
      return;
    }

    const targetChapel = officialLockedChapel || mapToOfficialChapel(formChapel);
    const statusText =
      formCategory === 'married'
        ? 'ባለትዳር'
        : formCategory === 'female_head'
        ? 'ራሷ የቤቱ አባወራ'
        : 'ያላገባች / ሌላ';
    const relationText =
      formCategory === 'married'
        ? 'ባለቤት / ሚስት'
        : formCategory === 'female_head'
        ? 'ራሷ የቤቱ አባወራ'
        : editingMember?.relationToHead || 'ሌላ የቤተሰብ አባል';

    const payload: Omit<ChurchMember, 'id'> = {
      ...(editingMember || {}),
      name: formName.trim(),
      gender: 'ሴ',
      age: parsedAge,
      chapel: targetChapel,
      womenCategory: formCategory,
      maritalStatus: statusText,
      relationToHead: relationText,
      parentName:
        formCategory === 'female_head'
          ? formSpouseOrHead.trim() || formName.trim()
          : formSpouseOrHead.trim() || undefined,
      phone: formPhone.trim() || undefined,
      residence: formResidence.trim() || undefined,
      educationLevel: canonicalizeEducationLevel(formEducation),
      occupation: canonicalizeOccupation(formOccupation),
      isBaptized: formBaptized,
      takesLordsSupper: formSupper,
      paysTithe: formTithe,
      registeredDate: editingMember?.registeredDate || new Date().toISOString().split('T')[0]
    };

    if (editingMember) {
      onUpdateMember({ ...payload, id: editingMember.id });
      setFeedbackMsg(t(`✓ የ"${payload.name}" መረጃ በሴቶች ቋት ዘምኗል።`, `Updated "${payload.name}" in Women Registry.`));
    } else {
      onAddMember(payload);
      setFeedbackMsg(
        t(
          `✓ "${payload.name}" (${categoryLabel(formCategory)}) በ${targetChapel} የሴቶች ቋት ተመዝግባለች።`,
          `Added "${payload.name}" to Women Registry.`
        )
      );
    }
    setTimeout(() => setFeedbackMsg(''), 5000);
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const scopeLabel = activeChapelScope || 'ሁሉም_10_ቻፕሎች';
    const toRows = (title: string, list: typeof scopedWomenRecords) => [
      [title],
      [`ጠቅላላ ብዛት: ${list.length}`],
      [],
      [
        'ተ.ቁ',
        'መለያ ኮድ',
        'ሙሉ ስም',
        'ዕድሜ',
        'ምድብ',
        'ባለቤት / የቤተሰብ መሪ',
        'ቻፕል',
        'ስልክ ቁጥር',
        'መኖሪያ',
        'የትምህርት ደረጃ',
        'የስራ ዓይነት',
        'የተጠመቀች',
        'የጌታ እራት',
        'አስራት'
      ],
      ...list.map((r, i) => [
        i + 1,
        r.member.memberCode || '',
        r.member.name,
        r.numAge ?? '',
        categoryLabel(r.category),
        r.spouseOrHeadHint || '',
        r.officialChapel,
        r.member.phone || '',
        r.member.residence || '',
        canonicalizeEducationLevel(r.member.educationLevel) || '',
        canonicalizeOccupation(r.member.occupation) || '',
        r.member.isBaptized ? 'አዎ' : 'አይ',
        r.member.takesLordsSupper ? 'አዎ' : 'አይ',
        r.member.paysTithe ? 'አዎ' : 'አይ'
      ])
    ];

    const marriedList = scopedWomenRecords.filter((r) => r.category === 'married');
    const headList = scopedWomenRecords.filter((r) => r.category === 'female_head');

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(`ባለትዳር የሆኑ ሴቶች (${scopeLabel} · ${currentYear})`, marriedList)),
      'ባለትዳር_ሴቶች'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(`ራሳቸው የቤቱ አባወራ የሆኑ ሴቶች (${scopeLabel} · ${currentYear})`, headList)),
      'ራሳቸው_አባወራ_ሴቶች'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(`ሁሉም የሴቶች መረጃ ቋት (${scopeLabel} · ${currentYear})`, scopedWomenRecords)),
      'ሁሉም_ሴቶች'
    );
    XLSX.writeFile(wb, `የሴቶች_መረጃ_ቋት_${scopeLabel}_${currentYear}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header & KPI Category Cards */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-rose-700 shrink-0" />
              <span>
                {activeChapelScope
                  ? t(
                      `የ${activeChapelScope} የሴቶች መረጃ ቋት (ባለትዳር እና ራሳቸው አባወራ)`,
                      `${chapelLabel(activeChapelScope)} Women Registry`
                    )
                  : t(
                      'የ10ሩም ቻፕሎች የሴቶች መረጃ ቋት (ባለትዳር እና ራሳቸው የቤቱ አባወራ)',
                      'All Chapels Women Registry (Married & Female Household Heads)'
                    )}
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {t(
                'ባለትዳር የሆኑ ሴቶችን እና ራሳቸው የቤቱ አባወራ ሆነው የሚኖሩ ሴቶችን በየቻፕሉ ለይቶ የሚይዝ መረጃ ቋት።',
                'Tracks married women and female heads of household per chapel in sync with the member registry.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => openAddModal('married')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-800 hover:bg-rose-700 text-white cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('አዲስ ሴት መዝግብ', 'Add Woman')}</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel (3 ሺቶች) አውርድ', 'Export Excel')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2 rounded-xl text-xs font-bold">
            {feedbackMsg}
          </div>
        )}

        {/* Interactive Category KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setCurrentPage(1);
            }}
            className={`text-left border rounded-xl p-3.5 transition cursor-pointer ${
              categoryFilter === 'all'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold opacity-80">
                {t('ጠቅላላ (ባለትዳር እና አባወራ ሴቶች)', 'All (Married & Female Heads)')}
              </span>
              <Users className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-2xl font-black tabular-nums mt-1">{womenStats.total}</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryFilter('married');
              setCurrentPage(1);
            }}
            className={`text-left border rounded-xl p-3.5 transition cursor-pointer ${
              categoryFilter === 'married'
                ? 'border-rose-700 bg-rose-700 text-white'
                : 'border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold opacity-90">
                {t('የባል ሚስት የሆኑ (ባለትዳር ሴቶች)', 'Married Women (Wives)')}
              </span>
              <Heart className="w-4 h-4 opacity-85" />
            </div>
            <div className="text-2xl font-black tabular-nums mt-1">{womenStats.married}</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryFilter('female_head');
              setCurrentPage(1);
            }}
            className={`text-left border rounded-xl p-3.5 transition cursor-pointer ${
              categoryFilter === 'female_head'
                ? 'border-purple-800 bg-purple-800 text-white'
                : 'border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 text-purple-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold opacity-90">
                {t('ራሳቸው የቤቱ አባወራ የሆኑ ሴቶች', 'Female Heads of Household')}
              </span>
              <Home className="w-4 h-4 opacity-85" />
            </div>
            <div className="text-2xl font-black tabular-nums mt-1">{womenStats.femaleHead}</div>
          </button>
        </div>

        {/* Search & Chapel Filter */}
        <div className="flex flex-col md:flex-row gap-2.5 pt-2 border-t border-slate-100 print:hidden">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t(
                'በስም፣ በመለያ ኮድ፣ በባለቤት ስም፣ በስልክ ወይም በመኖሪያ ይፈልጉ...',
                'Search by name, code, spouse, phone, residence...'
              )}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600"
            />
          </div>

          {!officialLockedChapel && (
            <select
              value={chapelFilter}
              onChange={(e) => {
                setChapelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800"
            >
              <option value="all">{t('ሁሉም 10ሩ ቻፕሎች', 'All 10 Chapels')}</option>
              {chapelList.map((ch) => (
                <option key={ch} value={ch}>
                  {chapelLabel(ch)}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Women Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-3 text-left">{t('ተ.ቁ', '#')}</th>
                <th className="py-3 px-3 text-left">{t('መለያ ኮድ', 'Code')}</th>
                <th className="py-3 px-3 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                <th className="py-3 px-3 text-center">{t('ዕድሜ', 'Age')}</th>
                <th className="py-3 px-3 text-left">{t('የሴቶች ምድብ', 'Category')}</th>
                <th className="py-3 px-3 text-left">{t('ባለቤት / የቤተሰብ መሪ', 'Spouse / Head')}</th>
                <th className="py-3 px-3 text-left">{t('ቻፕል', 'Chapel')}</th>
                <th className="py-3 px-3 text-left">{t('ስልክ / መኖሪያ', 'Phone / Residence')}</th>
                <th className="py-3 px-3 text-left">{t('ትምህርት / ስራ', 'Edu / Occupation')}</th>
                <th className="py-3 px-3 text-right print:hidden">{t('ምድብ ቀይር / ተግባር', 'Reclassify / Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    {t(
                      'በዚህ ምድብ የተገኘ የሴቶች መረጃ የለም። "አዲስ ሴት መዝግብ" የሚለውን በመጫን መጨመር ይችላሉ።',
                      'No women records found for this filter. Click "Add Woman" to register.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRows.map(({ member, category, officialChapel, numAge, spouseOrHeadHint }, idx) => (
                  <tr key={member.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                      {(safePage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-indigo-900 whitespace-nowrap">
                      {member.memberCode || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {formatDisplayName(member.name, nameScriptMode)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 tabular-nums">
                      {numAge ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {category === 'married' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <Heart className="w-3 h-3" />
                          <span>{t('ባለትዳር ሴት', 'Married')}</span>
                        </span>
                      ) : category === 'female_head' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          <Home className="w-3 h-3" />
                          <span>{t('ራሷ የቤቱ አባወራ', 'Female Head')}</span>
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {t('ያልተመደበች', 'Unassigned')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {category === 'female_head'
                        ? t('ራሷ አባወራ', 'Self (Head)')
                        : spouseOrHeadHint || member.relationToHead || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                      {chapelLabel(officialChapel)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {member.phone && (
                        <div className="font-mono text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.residence && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{member.residence}</span>
                        </div>
                      )}
                      {!member.phone && !member.residence && '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div>{canonicalizeEducationLevel(member.educationLevel) || '—'}</div>
                      {canonicalizeOccupation(member.occupation) && (
                        <div className="text-[11px] text-slate-500">{canonicalizeOccupation(member.occupation)}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                      {confirmDeleteId === member.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMember(member.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            {t('አጥፋ', 'Confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            {t('ተው', 'Cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          {category !== 'married' && (
                            <button
                              type="button"
                              onClick={() => handleQuickReclassify(member, 'married')}
                              className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-bold cursor-pointer"
                              title={t('ወደ ባለትዳር ሴት መድብ', 'Mark as Married')}
                            >
                              {t('ባለትዳር', 'Married')}
                            </button>
                          )}
                          {category !== 'female_head' && (
                            <button
                              type="button"
                              onClick={() => handleQuickReclassify(member, 'female_head')}
                              className="px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold cursor-pointer"
                              title={t('ወደ ራሷ የቤቱ አባወራ መድብ', 'Mark as Female Head')}
                            >
                              {t('ራሷ አባወራ', 'Head')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(member, category)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-800 cursor-pointer"
                            title={t('አርም', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(member.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title={t('ሰርዝ', 'Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden">
            <span className="tabular-nums">
              {t(`ገጽ ${safePage} ከ ${totalPages} (${filteredRows.length} ሴቶች)`, `Page ${safePage} of ${totalPages} (${filteredRows.length} women)`)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Add / Edit Woman Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-rose-700" />
                <span>
                  {editingMember
                    ? t('የሴቶች መረጃ ማስተካከያ', 'Edit Woman Record')
                    : t('አዲስ ሴት በቋት መመዝገቢያ', 'Register Woman in Chapel Registry')}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Primary Women Household Category Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {t('የሴቷ ምድብ *', 'Household Category *')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCategory('married')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2 ${
                      formCategory === 'married'
                        ? 'border-rose-700 bg-rose-50 text-rose-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold">{t('ባለትዳር የሆነች ሴት', 'Married Woman')}</div>
                      <div className="text-[10px] opacity-75">
                        {t('ከባለቤቷ/ከትዳር ጓደኛዋ ጋር የምትኖር', 'Lives in marital household')}
                      </div>
                    </div>
                    {formCategory === 'married' && <Check className="w-4 h-4 ml-auto text-rose-700 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory('female_head')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2 ${
                      formCategory === 'female_head'
                        ? 'border-purple-800 bg-purple-50 text-purple-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Home className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold">
                        {t('ራሷ የቤቱ አባወራ የሆነች', 'Female Head of Household')}
                      </div>
                      <div className="text-[10px] opacity-75">
                        {t('ራሷ የቤተሰቡ መሪ/አባወራ ሆና የምትኖር', 'Independent / female-headed household')}
                      </div>
                    </div>
                    {formCategory === 'female_head' && (
                      <Check className="w-4 h-4 ml-auto text-purple-700 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ዕድሜ *', 'Age *')}</label>
                  <input
                    type="number"
                    min={15}
                    max={110}
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ቻፕል *', 'Chapel *')}</label>
                  <select
                    value={officialLockedChapel || formChapel}
                    disabled={Boolean(officialLockedChapel)}
                    onChange={(e) => setFormChapel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white disabled:bg-slate-100"
                  >
                    {(officialLockedChapel ? [officialLockedChapel] : chapelList).map((ch) => (
                      <option key={ch} value={ch}>
                        {chapelLabel(ch)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formCategory === 'married' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የባለቤት (የትዳር አጋር) ስም', 'Spouse Name')}
                  </label>
                  <input
                    type="text"
                    value={formSpouseOrHead}
                    onChange={(e) => setFormSpouseOrHead(e.target.value)}
                    placeholder={t('የባለቤቷ ሙሉ ስም (አማራጭ)', 'Optional spouse name')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መኖሪያ', 'Residence')}</label>
                  <input
                    type="text"
                    value={formResidence}
                    onChange={(e) => setFormResidence(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የትምህርት ደረጃ', 'Education')}</label>
                  <input
                    type="text"
                    list="chapel-women-edu"
                    value={formEducation}
                    onChange={(e) => setFormEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                  <datalist id="chapel-women-edu">
                    {SUGGESTED_EDUCATION_LEVELS.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የስራ ዓይነት', 'Occupation')}</label>
                  <input
                    type="text"
                    list="chapel-women-occ"
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                  <datalist id="chapel-women-occ">
                    {SUGGESTED_OCCUPATIONS.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formBaptized}
                    onChange={(e) => setFormBaptized(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>{t('የተጠመቀች', 'Baptized')}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSupper}
                    onChange={(e) => setFormSupper(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>{t('የጌታ እራት ትካፈላለች', "Lord's Supper")}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTithe}
                    onChange={(e) => setFormTithe(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>{t('አስራት ትከፍላለች', 'Pays Tithe')}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-rose-800 hover:bg-rose-700 text-white cursor-pointer"
                >
                  {editingMember ? t('ለውጡን አስቀምጥ', 'Save Changes') : t('በሴቶች ቋት መዝግብ', 'Save Woman')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
