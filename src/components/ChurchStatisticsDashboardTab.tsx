import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  Download,
  Printer,
  Search,
  Users,
  Baby,
  GraduationCap,
  Home,
  Building2,
  ArrowUpRight
} from 'lucide-react';
import { ChurchChild, ChurchMember, Student } from '../types';
import { computeChurchOverviewStatistics } from '../utils/churchOverviewStats';
import { resolveOfficialChapel } from '../utils/memberCodeGenerator';
import { ChurchMemberBreakdownSection } from './ChurchMemberBreakdownSection';

interface ChurchStatisticsDashboardTabProps {
  currentYear: string;
  classList: string[];
  studentsByClass: { [className: string]: Student[] };
  churchMembers: ChurchMember[];
  churchChildren: ChurchChild[];
  chapelList: string[];
  loggedInChapel?: string | null;
  onNavigateTab?: (tabId: string) => void;
}

type ViewFilter = 'all' | 'chapels' | 'sunday_school' | 'members_detail';

export const ChurchStatisticsDashboardTab: React.FC<ChurchStatisticsDashboardTabProps> = ({
  currentYear,
  classList,
  studentsByClass,
  churchMembers,
  churchChildren,
  chapelList,
  loggedInChapel,
  onNavigateTab
}) => {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showChapelChildAgeBreakdown, setShowChapelChildAgeBreakdown] = useState<boolean>(false);

  const scopedChurchMembers = useMemo(() => {
    if (!loggedInChapel) return churchMembers;
    const targetChapel = resolveOfficialChapel(loggedInChapel);
    return churchMembers.filter(
      (m) => resolveOfficialChapel(m.chapel || '') === targetChapel
    );
  }, [churchMembers, loggedInChapel]);

  const stats = useMemo(
    () =>
      computeChurchOverviewStatistics({
        currentYear,
        classList,
        studentsByClass,
        churchMembers,
        churchChildren,
        chapelList,
        scopedChapel: loggedInChapel
      }),
    [currentYear, classList, studentsByClass, churchMembers, churchChildren, chapelList, loggedInChapel]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredChapelRows = useMemo(() => {
    if (!normalizedSearch) return stats.chapelRows;
    return stats.chapelRows.filter((row) =>
      row.chapelName.toLowerCase().includes(normalizedSearch)
    );
  }, [stats.chapelRows, normalizedSearch]);

  const filteredSundayClassRows = useMemo(() => {
    if (!normalizedSearch) return stats.sundaySchoolPerClass;
    return stats.sundaySchoolPerClass.filter((row) =>
      row.className.toLowerCase().includes(normalizedSearch)
    );
  }, [stats.sundaySchoolPerClass, normalizedSearch]);

  const hasUnspecifiedMaster =
    stats.membersSummary.unspecified > 0 ||
    stats.childrenSummary.unspecified > 0 ||
    stats.sundaySchoolSummary.unspecified > 0;

  const hasUnspecifiedChapelMembers = stats.chapelGrandTotal.members.unspecified > 0;
  const hasUnspecifiedChapelChildren = stats.chapelGrandTotal.children.unspecified > 0;

  const pct = (part: number, whole: number) =>
    whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%';

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const scopeText = loggedInChapel || 'ሁሉም አጥቢያ ቤተክርስቲያን (10 ቻፕሎች)';

    // Sheet 1: Master Overview
    const sheet1Rows: (string | number)[][] = [
      [`የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን — አጠቃላይ የመረጃ ማጠቃለያ (${currentYear} ዓ/ም)`],
      [`ወሰን፦ ${scopeText}`],
      [],
      ['የመረጃ ምድብ', 'ወንድ', 'ሴት', 'ያልተገለጸ ጾታ', 'ጠቅላላ ድምር', 'ተጨማሪ ማብራሪያ'],
      [
        'የቤተክርስቲያኒቱ አባላት',
        stats.membersSummary.male,
        stats.membersSummary.female,
        stats.membersSummary.unspecified,
        stats.membersSummary.total,
        `ጠቅላላ ቤተሰቦች፦ ${stats.membersSummary.totalHouseholds} (1-ሰው: ${stats.membersSummary.soloHouseholds}, 2+ አባላት: ${stats.membersSummary.multiMemberHouseholds})`
      ],
      [
        'የቤተክርስቲያኒቱ ልጆች (0 - 14 ዓመት)',
        stats.childrenSummary.male,
        stats.childrenSummary.female,
        stats.childrenSummary.unspecified,
        stats.childrenSummary.total,
        `ከ0-3: ${stats.childrenAgeStats.cohorts[0].total}, ከ4-6: ${stats.childrenAgeStats.cohorts[1].total}, ከ7-9: ${stats.childrenAgeStats.cohorts[2].total}, ከ10-12: ${stats.childrenAgeStats.cohorts[3].total}, ከ13-14: ${stats.childrenAgeStats.cohorts[4].total}`
      ],
      [
        `የሰንበት ትምህርት ቤት ተማሪዎች (${currentYear} ዓ/ም)`,
        stats.sundaySchoolSummary.male,
        stats.sundaySchoolSummary.female,
        stats.sundaySchoolSummary.unspecified,
        stats.sundaySchoolSummary.total,
        `ከ0-14 ንዑስ ድምር፦ ${stats.sundaySchoolAgeStats.subtotal0to14.total}`
      ]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'አጠቃላይ_ማጠቃለያ');

    // Sheet 2: Per-Chapel Household & Members
    const sheet2Rows: (string | number)[][] = [
      [`የእያንዳንዱ ቻፕል ቤተሰብና የአባላት መረጃ (${currentYear} ዓ/ም)`],
      [],
      [
        'ተ.ቁ',
        'የቻፕል ስም',
        'ጠቅላላ ቤተሰብ ብዛት',
        '1-ሰው ቤተሰብ',
        '2+ አባላት ቤተሰብ',
        'አባላት ወንድ',
        'አባላት ሴት',
        'ያልተገለጸ',
        'አባላት ድምር',
        'የቻፕል ልጆች ወንድ',
        'የቻፕል ልጆች ሴት',
        'የቻፕል ልጆች ድምር',
        'ጠቅላላ ሰዎች (አባላት + ልጆች)'
      ],
      ...stats.chapelRows.map((r, idx) => [
        idx + 1,
        r.chapelName,
        r.totalHouseholds,
        r.soloHouseholds,
        r.multiMemberHouseholds,
        r.members.male,
        r.members.female,
        r.members.unspecified,
        r.members.total,
        r.children.male,
        r.children.female,
        r.children.total,
        r.combinedPeopleTotal
      ]),
      [
        '',
        'ጠቅላላ ድምር',
        stats.chapelGrandTotal.totalHouseholds,
        stats.chapelGrandTotal.soloHouseholds,
        stats.chapelGrandTotal.multiMemberHouseholds,
        stats.chapelGrandTotal.members.male,
        stats.chapelGrandTotal.members.female,
        stats.chapelGrandTotal.members.unspecified,
        stats.chapelGrandTotal.members.total,
        stats.chapelGrandTotal.children.male,
        stats.chapelGrandTotal.children.female,
        stats.chapelGrandTotal.children.total,
        stats.chapelGrandTotal.combinedPeopleTotal
      ]
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    XLSX.utils.book_append_sheet(wb, ws2, 'የቻፕሎች_ቤተሰብና_ልጆች');

    // Sheet 3: Per-Chapel Children Age Breakdown
    const sheet3Rows: (string | number)[][] = [
      [`የእያንዳንዱ ቻፕል ልጆች (0-14) በዕድሜ ምድብ (${currentYear} ዓ/ም)`],
      [],
      [
        'ተ.ቁ',
        'የቻፕል ስም',
        '0-3 ወንድ',
        '0-3 ሴት',
        '0-3 ድምር',
        '4-6 ወንድ',
        '4-6 ሴት',
        '4-6 ድምር',
        '7-9 ወንድ',
        '7-9 ሴት',
        '7-9 ድምር',
        '10-12 ወንድ',
        '10-12 ሴት',
        '10-12 ድምር',
        '13-14 ወንድ',
        '13-14 ሴት',
        '13-14 ድምር',
        'ጠቅላላ ወንድ',
        'ጠቅላላ ሴት',
        'ጠቅላላ ልጆች ድምር'
      ],
      ...stats.chapelRows.map((r, idx) => {
        const c = r.childrenAgeStats.cohorts;
        return [
          idx + 1,
          r.chapelName,
          c[0].male,
          c[0].female,
          c[0].total,
          c[1].male,
          c[1].female,
          c[1].total,
          c[2].male,
          c[2].female,
          c[2].total,
          c[3].male,
          c[3].female,
          c[3].total,
          c[4].male,
          c[4].female,
          c[4].total,
          r.children.male,
          r.children.female,
          r.children.total
        ];
      }),
      [
        '',
        'ጠቅላላ ድምር',
        stats.childrenAgeStats.cohorts[0].male,
        stats.childrenAgeStats.cohorts[0].female,
        stats.childrenAgeStats.cohorts[0].total,
        stats.childrenAgeStats.cohorts[1].male,
        stats.childrenAgeStats.cohorts[1].female,
        stats.childrenAgeStats.cohorts[1].total,
        stats.childrenAgeStats.cohorts[2].male,
        stats.childrenAgeStats.cohorts[2].female,
        stats.childrenAgeStats.cohorts[2].total,
        stats.childrenAgeStats.cohorts[3].male,
        stats.childrenAgeStats.cohorts[3].female,
        stats.childrenAgeStats.cohorts[3].total,
        stats.childrenAgeStats.cohorts[4].male,
        stats.childrenAgeStats.cohorts[4].female,
        stats.childrenAgeStats.cohorts[4].total,
        stats.childrenSummary.male,
        stats.childrenSummary.female,
        stats.childrenSummary.total
      ]
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
    XLSX.utils.book_append_sheet(wb, ws3, 'ቻፕል_ልጆች_በዕድሜ');

    // Sheet 4: Sunday School Students by Class
    const sheet4Rows: (string | number)[][] = [
      [`የሰንበት ትምህርት ቤት ተማሪዎች በየክፍሉ (${currentYear} ዓ/ም)`],
      [],
      ['ተ.ቁ', 'ክፍል / ደረጃ', 'ወንድ', 'ሴት', 'ያልተገለጸ', 'ድምር', 'ከ0-14 ዓመት ድምር'],
      ...stats.sundaySchoolPerClass.map((row, idx) => [
        idx + 1,
        row.className,
        row.male,
        row.female,
        row.unspecified,
        row.total,
        row.subtotal0to14
      ]),
      [
        '',
        'ጠቅላላ የሰንበት ተማሪዎች ድምር',
        stats.sundaySchoolSummary.male,
        stats.sundaySchoolSummary.female,
        stats.sundaySchoolSummary.unspecified,
        stats.sundaySchoolSummary.total,
        stats.sundaySchoolAgeStats.subtotal0to14.total
      ]
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows);
    XLSX.utils.book_append_sheet(wb, ws4, 'ሰንበት_ተማሪዎች_በክፍል');

    const safeScope = loggedInChapel ? `_${loggedInChapel}` : '';
    XLSX.writeFile(
      wb,
      `የቤተክርስቲያን_ቻፕል_እና_ሰንበት_ማጠቃለያ${safeScope}_${currentYear}ዓም.xlsx`
    );
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print-only Official Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4 text-center">
        <h1 className="text-lg font-extrabold text-slate-900">
          የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን
        </h1>
        <p className="text-xs font-bold text-slate-700 mt-0.5">
          የቤተክርስቲያን አባላት፣ የልጆች፣ የሰንበት ትምህርት ቤት ተማሪዎች እና የቻፕሎች ቤተሰብ አጠቃላይ የወንድ/ሴት/ድምር ማጠቃለያ ({currentYear} ዓ/ም)
          {loggedInChapel ? ` — ${loggedInChapel}` : ''}
        </p>
      </div>

      {/* Header & Controls Bar */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-slate-900">
              <BarChart3 className="w-5 h-5 text-blue-800 shrink-0" />
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                የቤተክርስቲያንና የቻፕሎች አጠቃላይ የዳታ ማጠቃለያ ({currentYear} ዓ/ም)
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {loggedInChapel
                ? `${loggedInChapel} — የቤተሰብ፣ የአባላትና የልጆች ወንድ / ሴት / ድምር ስታቲስቲክስ`
                : 'የቤተክርስቲያኒቱ አባላት · የልጆች መረጃ (0-14) · የሰንበት ት/ቤት ተማሪዎች · የ10ሩ ቻፕሎች ቤተሰብና ልጆች ማጠቃለያ'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ቻፕል ወይም ክፍል ፈልግ..."
                className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 w-44 sm:w-52"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel አውርድ (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>አትም / Print</span>
            </button>
          </div>
        </div>

        {/* View Segment Switcher */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewFilter === 'all'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ሁሉም ማጠቃለያ
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('chapels')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewFilter === 'chapels'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              የቻፕሎች ቤተሰብና ልጆች ({stats.chapelRows.length})
            </button>
            {!loggedInChapel && (
              <button
                type="button"
                onClick={() => setViewFilter('sunday_school')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewFilter === 'sunday_school'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                የሰንበት ት/ቤት ተማሪዎች ({stats.sundaySchoolPerClass.length} ክፍሎች)
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewFilter('members_detail')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewFilter === 'members_detail'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ጥምቀት / ትምህርት / ስራ
            </button>
          </div>

          {onNavigateTab && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => onNavigateTab('churchMasterTab')}
                className="inline-flex items-center gap-1 hover:text-blue-800 transition cursor-pointer"
              >
                <span>የቤተክርስቲያን ቋት</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => onNavigateTab('churchChildrenTab')}
                className="inline-flex items-center gap-1 hover:text-blue-800 transition cursor-pointer"
              >
                <span>የልጆች ቋት</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              {!loggedInChapel && (
                <>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('allStudentsMasterTab')}
                    className="inline-flex items-center gap-1 hover:text-blue-800 transition cursor-pointer"
                  >
                    <span>የሰንበት ተማሪዎች ቋት</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Top 4 KPI Cards (Flat Hairline Surfaces, Tabular Numerals, Zero-Pill Discipline) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>የቤተክርስቲያኒቱ አባላት</span>
            <Users className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {stats.membersSummary.total.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-between">
            <span>ወንድ {stats.membersSummary.male.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>ሴት {stats.membersSummary.female.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>ጠቅላላ ቤተሰቦች (አባወራ/ቤተሰብ)</span>
            <Home className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {stats.membersSummary.totalHouseholds.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-between">
            <span>2+ አባላት {stats.membersSummary.multiMemberHouseholds.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>1-ሰው {stats.membersSummary.soloHouseholds.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>የቤተክርስቲያኒቱ ልጆች (0–14)</span>
            <Baby className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {stats.childrenSummary.total.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-between">
            <span>ወንድ {stats.childrenSummary.male.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>ሴት {stats.childrenSummary.female.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>የሰንበት ት/ቤት ተማሪዎች ({currentYear})</span>
            <GraduationCap className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {stats.sundaySchoolSummary.total.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-between">
            <span>ወንድ {stats.sundaySchoolSummary.male.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>ሴት {stats.sundaySchoolSummary.female.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* Section 1: Master Summary Matrix (Church Members + Church Children + Sunday School Students) */}
      {viewFilter === 'all' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                1. የቤተክርስቲያን አጠቃላይ የወንድ፣ የሴት እና የድምር ማጠቃለያ ሠንጠረዥ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                የቤተክርስቲያኒቱ አባላት፣ የልጆች ቋት (0–14) እና የሰንበት ትምህርት ቤት ተማሪዎች በአንድ እይታ
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-left">ተ.ቁ</th>
                  <th className="py-3 px-4 text-left">የመረጃ ዘርፍ / ምድብ</th>
                  <th className="py-3 px-4 text-right bg-blue-50/40 text-blue-950">ወንድ (Male)</th>
                  <th className="py-3 px-4 text-right bg-rose-50/40 text-rose-950">ሴት (Female)</th>
                  {hasUnspecifiedMaster && (
                    <th className="py-3 px-4 text-right text-slate-600">ያልተገለጸ</th>
                  )}
                  <th className="py-3 px-4 text-right bg-slate-100/70 text-slate-900">ድምር (Total)</th>
                  <th className="py-3 px-4 text-left">ተጨማሪ መረጃ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-semibold text-slate-500 tabular-nums">1</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    የቤተክርስቲያኒቱ አባላት (ዋናው ቋት)
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-blue-900 bg-blue-50/20 tabular-nums">
                    {stats.membersSummary.male.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-900 bg-rose-50/20 tabular-nums">
                    {stats.membersSummary.female.toLocaleString()}
                  </td>
                  {hasUnspecifiedMaster && (
                    <td className="py-3.5 px-4 text-right text-slate-500 tabular-nums">
                      {stats.membersSummary.unspecified.toLocaleString()}
                    </td>
                  )}
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 bg-slate-50/70 tabular-nums">
                    {stats.membersSummary.total.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 tabular-nums">
                    ጠቅላላ ቤተሰቦች፦ {stats.membersSummary.totalHouseholds.toLocaleString()} (1-ሰው፦{' '}
                    {stats.membersSummary.soloHouseholds.toLocaleString()} · 2+ አባላት፦{' '}
                    {stats.membersSummary.multiMemberHouseholds.toLocaleString()})
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-semibold text-slate-500 tabular-nums">2</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    የቤተክርስቲያኒቱ የልጆች መረጃ (0 – 14 ዓመት)
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-blue-900 bg-blue-50/20 tabular-nums">
                    {stats.childrenSummary.male.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-900 bg-rose-50/20 tabular-nums">
                    {stats.childrenSummary.female.toLocaleString()}
                  </td>
                  {hasUnspecifiedMaster && (
                    <td className="py-3.5 px-4 text-right text-slate-500 tabular-nums">
                      {stats.childrenSummary.unspecified.toLocaleString()}
                    </td>
                  )}
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 bg-slate-50/70 tabular-nums">
                    {stats.childrenSummary.total.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 tabular-nums">
                    {stats.childrenAgeStats.cohorts.map((c, i) => (
                      <span key={c.key}>
                        {i > 0 && ' · '}
                        {c.key}: {c.total}
                      </span>
                    ))}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-semibold text-slate-500 tabular-nums">3</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    የሰንበት ትምህርት ቤት ተማሪዎች ({currentYear} ዓ/ም)
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-blue-900 bg-blue-50/20 tabular-nums">
                    {stats.sundaySchoolSummary.male.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-900 bg-rose-50/20 tabular-nums">
                    {stats.sundaySchoolSummary.female.toLocaleString()}
                  </td>
                  {hasUnspecifiedMaster && (
                    <td className="py-3.5 px-4 text-right text-slate-500 tabular-nums">
                      {stats.sundaySchoolSummary.unspecified.toLocaleString()}
                    </td>
                  )}
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 bg-slate-50/70 tabular-nums">
                    {stats.sundaySchoolSummary.total.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 tabular-nums">
                    ከ0–14 ንዑስ ድምር፦ {stats.sundaySchoolAgeStats.subtotal0to14.total.toLocaleString()} · ንቁ ክፍሎች፦{' '}
                    {stats.sundaySchoolPerClass.filter((r) => r.total > 0).length}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section 2: Per-Chapel Household, Members, and Children Breakdown */}
      {(viewFilter === 'all' || viewFilter === 'chapels') && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-800 shrink-0" />
                <span>2. የእያንዳንዱ ቻፕል ቤተሰብ፣ አባላት እና የልጆች መረጃ (ወንድ / ሴት / ድምር)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                የእያንዳንዱ ቻፕል ጠቅላላ ቤተሰብ ብዛት (1-ሰው እና 2+ አባላት)፣ የአባላት ወ/ሴ/ድምር እና የቻፕሉ ልጆች (0–14) ወ/ሴ/ድምር
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowChapelChildAgeBreakdown((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer print:hidden"
            >
              {showChapelChildAgeBreakdown
                ? 'የልጆች ዕድሜ ዝርዝር ደብቅ'
                : 'የቻፕሉን ልጆች በዕድሜ (0-3..13-14) አሳይ'}
            </button>
          </div>

          {filteredChapelRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              ከተፈለገው ቃል ጋር የሚዛመድ ቻፕል አልተገኘም።
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200">
                      ተ.ቁ
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200">
                      የቻፕል ስም
                    </th>
                    <th
                      colSpan={3}
                      className="py-2 px-3 text-center border-b border-r border-slate-200 bg-teal-50/50 text-teal-950"
                    >
                      የቻፕሉ ቤተሰብ መረጃ (Households)
                    </th>
                    <th
                      colSpan={hasUnspecifiedChapelMembers ? 4 : 3}
                      className="py-2 px-3 text-center border-b border-r border-slate-200 bg-blue-50/50 text-blue-950"
                    >
                      የቻፕሉ አባላት መረጃ
                    </th>
                    <th
                      colSpan={hasUnspecifiedChapelChildren ? 4 : 3}
                      className="py-2 px-3 text-center border-b border-r border-slate-200 bg-amber-50/50 text-amber-950"
                    >
                      የቻፕሉ የልጆች መረጃ (0–14)
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 text-right">
                      አጠቃላይ ድምር (ድርሻ)
                    </th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="py-2 px-2.5 text-right bg-teal-50/30">ጠቅላላ ቤተሰብ</th>
                    <th className="py-2 px-2.5 text-right bg-teal-50/20">1-ሰው</th>
                    <th className="py-2 px-2.5 text-right border-r border-slate-200 bg-teal-50/20">
                      2+ አባላት
                    </th>

                    <th className="py-2 px-2.5 text-right text-blue-900 bg-blue-50/30">ወንድ</th>
                    <th className="py-2 px-2.5 text-right text-rose-900 bg-rose-50/30">ሴት</th>
                    {hasUnspecifiedChapelMembers && (
                      <th className="py-2 px-2.5 text-right">ያልተገለጸ</th>
                    )}
                    <th className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-900 bg-slate-100/70">
                      ድምር
                    </th>

                    <th className="py-2 px-2.5 text-right text-blue-900 bg-amber-50/30">ወንድ</th>
                    <th className="py-2 px-2.5 text-right text-rose-900 bg-amber-50/30">ሴት</th>
                    {hasUnspecifiedChapelChildren && (
                      <th className="py-2 px-2.5 text-right">ያልተገለጸ</th>
                    )}
                    <th className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-900 bg-amber-100/40">
                      ድምር
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChapelRows.map((row, idx) => (
                    <tr
                      key={row.chapelName}
                      className={`hover:bg-slate-50/80 ${
                        row.isUnassignedBucket ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-slate-500 font-semibold border-r border-slate-100 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                        {row.chapelName}
                      </td>

                      {/* Household columns */}
                      <td className="py-3 px-2.5 text-right font-extrabold text-teal-900 tabular-nums">
                        {row.totalHouseholds.toLocaleString()}
                      </td>
                      <td className="py-3 px-2.5 text-right text-slate-600 tabular-nums">
                        {row.soloHouseholds.toLocaleString()}
                      </td>
                      <td className="py-3 px-2.5 text-right text-slate-600 border-r border-slate-100 tabular-nums">
                        {row.multiMemberHouseholds.toLocaleString()}
                      </td>

                      {/* Members Male/Female/Total */}
                      <td className="py-3 px-2.5 text-right font-semibold text-blue-900 tabular-nums">
                        {row.members.male.toLocaleString()}
                      </td>
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 tabular-nums">
                        {row.members.female.toLocaleString()}
                      </td>
                      {hasUnspecifiedChapelMembers && (
                        <td className="py-3 px-2.5 text-right text-slate-500 tabular-nums">
                          {row.members.unspecified.toLocaleString()}
                        </td>
                      )}
                      <td className="py-3 px-2.5 text-right font-extrabold text-slate-900 bg-slate-50/60 border-r border-slate-100 tabular-nums">
                        {row.members.total.toLocaleString()}
                      </td>

                      {/* Children Male/Female/Total */}
                      <td className="py-3 px-2.5 text-right font-semibold text-blue-900 tabular-nums">
                        {row.children.male.toLocaleString()}
                      </td>
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 tabular-nums">
                        {row.children.female.toLocaleString()}
                      </td>
                      {hasUnspecifiedChapelChildren && (
                        <td className="py-3 px-2.5 text-right text-slate-500 tabular-nums">
                          {row.children.unspecified.toLocaleString()}
                        </td>
                      )}
                      <td className="py-3 px-2.5 text-right font-extrabold text-amber-950 bg-amber-50/30 border-r border-slate-100 tabular-nums">
                        {row.children.total.toLocaleString()}
                      </td>

                      {/* Combined Total & Share */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {row.combinedPeopleTotal.toLocaleString()}{' '}
                        <span className="text-[11px] font-medium text-slate-500">
                          ({pct(row.combinedPeopleTotal, stats.chapelGrandTotal.combinedPeopleTotal)})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <td className="py-3 px-3 border-r border-slate-700">—</td>
                    <td className="py-3 px-3 border-r border-slate-700 whitespace-nowrap">
                      ጠቅላላ የቻፕሎች ድምር
                    </td>
                    <td className="py-3 px-2.5 text-right tabular-nums">
                      {stats.chapelGrandTotal.totalHouseholds.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right text-slate-300 tabular-nums">
                      {stats.chapelGrandTotal.soloHouseholds.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right text-slate-300 border-r border-slate-700 tabular-nums">
                      {stats.chapelGrandTotal.multiMemberHouseholds.toLocaleString()}
                    </td>

                    <td className="py-3 px-2.5 text-right text-blue-200 tabular-nums">
                      {stats.chapelGrandTotal.members.male.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right text-rose-200 tabular-nums">
                      {stats.chapelGrandTotal.members.female.toLocaleString()}
                    </td>
                    {hasUnspecifiedChapelMembers && (
                      <td className="py-3 px-2.5 text-right text-slate-300 tabular-nums">
                        {stats.chapelGrandTotal.members.unspecified.toLocaleString()}
                      </td>
                    )}
                    <td className="py-3 px-2.5 text-right bg-slate-800 border-r border-slate-700 tabular-nums">
                      {stats.chapelGrandTotal.members.total.toLocaleString()}
                    </td>

                    <td className="py-3 px-2.5 text-right text-blue-200 tabular-nums">
                      {stats.chapelGrandTotal.children.male.toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right text-rose-200 tabular-nums">
                      {stats.chapelGrandTotal.children.female.toLocaleString()}
                    </td>
                    {hasUnspecifiedChapelChildren && (
                      <td className="py-3 px-2.5 text-right text-slate-300 tabular-nums">
                        {stats.chapelGrandTotal.children.unspecified.toLocaleString()}
                      </td>
                    )}
                    <td className="py-3 px-2.5 text-right bg-amber-900/60 border-r border-slate-700 tabular-nums">
                      {stats.chapelGrandTotal.children.total.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      {stats.chapelGrandTotal.combinedPeopleTotal.toLocaleString()} (100%)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Optional expandable Per-Chapel Children Age Matrix (0-3 .. 13-14) */}
          {showChapelChildAgeBreakdown && filteredChapelRows.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <h4 className="text-xs font-extrabold text-slate-800 mb-3">
                የእያንዳንዱ ቻፕል ልጆች (0–14) በዕድሜ ምድብ ዝርዝር (ወንድ / ሴት / ድምር)
              </h4>
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2 px-3 text-left border-r border-slate-200">ቻፕል</th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        0-3 (ወ/ሴ/ድ)
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        4-6 (ወ/ሴ/ድ)
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        7-9 (ወ/ሴ/ድ)
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        10-12 (ወ/ሴ/ድ)
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        13-14 (ወ/ሴ/ድ)
                      </th>
                      <th className="py-2 px-3 text-right">ጠቅላላ ልጆች (ወ/ሴ/ድ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredChapelRows.map((row) => (
                      <tr key={`${row.chapelName}_age`} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                          {row.chapelName}
                        </td>
                        {row.childrenAgeStats.cohorts.map((c) => (
                          <td
                            key={c.key}
                            className="py-2 px-2 text-center border-r border-slate-100 tabular-nums text-slate-700 whitespace-nowrap"
                          >
                            <span className="text-blue-800 font-semibold">{c.male}</span> /{' '}
                            <span className="text-rose-800 font-semibold">{c.female}</span> /{' '}
                            <span className="text-slate-900 font-extrabold">{c.total}</span>
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          <span className="text-blue-800">{row.children.male}</span> /{' '}
                          <span className="text-rose-800">{row.children.female}</span> /{' '}
                          <span className="font-extrabold">{row.children.total}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Section 3: Church Children Age Summary (0-14) & Sunday School Per-Class Summary */}
      {(viewFilter === 'all' || viewFilter === 'sunday_school') && (
        <div
          className={`grid grid-cols-1 ${
            !loggedInChapel ? 'xl:grid-cols-12' : ''
          } gap-6`}
        >
          {/* Left: Church Children Age Cohort Breakdown (0-3 .. 13-14) */}
          <section
            className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${
              !loggedInChapel ? 'xl:col-span-5' : ''
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                3. የቤተክርስቲያኒቱ ልጆች በዕድሜ ምድብ (ወንድ / ሴት / ድምር)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {loggedInChapel ? `${loggedInChapel} — ` : ''}የልጆች ቋት (0–14 ዓመት) የዕድሜ ክፍፍል
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-4 text-left">የዕድሜ ምድብ</th>
                    <th className="py-2.5 px-3 text-right text-blue-900">ወንድ</th>
                    <th className="py-2.5 px-3 text-right text-rose-900">ሴት</th>
                    <th className="py-2.5 px-4 text-right text-slate-900">ድምር</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.childrenAgeStats.cohorts.map((c) => (
                    <tr key={c.key} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-800">{c.label}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                        {c.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                        {c.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 tabular-nums">
                        {c.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {stats.childrenAgeStats.over14.total > 0 && (
                    <tr className="hover:bg-slate-50/70 bg-slate-50/40">
                      <td className="py-2.5 px-4 font-semibold text-slate-600">
                        {stats.childrenAgeStats.over14.label}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                        {stats.childrenAgeStats.over14.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                        {stats.childrenAgeStats.over14.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800 tabular-nums">
                        {stats.childrenAgeStats.over14.total.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {stats.childrenAgeStats.unknownAge.total > 0 && (
                    <tr className="hover:bg-slate-50/70 bg-slate-50/40">
                      <td className="py-2.5 px-4 font-semibold text-slate-600">
                        {stats.childrenAgeStats.unknownAge.label}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                        {stats.childrenAgeStats.unknownAge.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                        {stats.childrenAgeStats.unknownAge.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800 tabular-nums">
                        {stats.childrenAgeStats.unknownAge.total.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <td className="py-2.5 px-4">ጠቅላላ የልጆች ድምር</td>
                    <td className="py-2.5 px-3 text-right text-blue-200 tabular-nums">
                      {stats.childrenSummary.male.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-200 tabular-nums">
                      {stats.childrenSummary.female.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {stats.childrenSummary.total.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Right: Sunday School Students Per Class Breakdown (Coordinator & Central Leaders) */}
          {!loggedInChapel && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden xl:col-span-7">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    4. የሰንበት ትምህርት ቤት ተማሪዎች በየክፍሉ ({currentYear} ዓ/ም)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    ከ0–3 ({stats.sundaySchoolAgeStats.cohorts[0].total}) · ከ4–6 (
                    {stats.sundaySchoolAgeStats.cohorts[1].total}) · ከ7–9 (
                    {stats.sundaySchoolAgeStats.cohorts[2].total}) · ከ10–12 (
                    {stats.sundaySchoolAgeStats.cohorts[3].total}) · ከ13–14 (
                    {stats.sundaySchoolAgeStats.cohorts[4].total})
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[460px] print:max-h-none">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-600 font-bold">
                      <th className="py-2.5 px-3 text-left">ተ.ቁ</th>
                      <th className="py-2.5 px-3 text-left">ክፍል / ደረጃ</th>
                      <th className="py-2.5 px-3 text-right text-blue-900">ወንድ</th>
                      <th className="py-2.5 px-3 text-right text-rose-900">ሴት</th>
                      {stats.sundaySchoolSummary.unspecified > 0 && (
                        <th className="py-2.5 px-3 text-right text-slate-500">ያልተገለጸ</th>
                      )}
                      <th className="py-2.5 px-3 text-right text-slate-900 bg-slate-100/70">ድምር</th>
                      <th className="py-2.5 px-3 text-right text-slate-600">ከ0–14 ድምር</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSundayClassRows.map((row, idx) => (
                      <tr
                        key={row.className}
                        className={`hover:bg-slate-50/70 ${
                          row.total === 0 ? 'text-slate-400' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                          {row.className}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                          {row.male.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                          {row.female.toLocaleString()}
                        </td>
                        {stats.sundaySchoolSummary.unspecified > 0 && (
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {row.unspecified.toLocaleString()}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 bg-slate-50/60 tabular-nums">
                          {row.total.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">
                          {row.subtotal0to14.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-extrabold">
                      <td className="py-2.5 px-3">—</td>
                      <td className="py-2.5 px-3">ጠቅላላ የሰንበት ተማሪዎች ድምር</td>
                      <td className="py-2.5 px-3 text-right text-blue-200 tabular-nums">
                        {stats.sundaySchoolSummary.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-200 tabular-nums">
                        {stats.sundaySchoolSummary.female.toLocaleString()}
                      </td>
                      {stats.sundaySchoolSummary.unspecified > 0 && (
                        <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                          {stats.sundaySchoolSummary.unspecified.toLocaleString()}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right bg-slate-800 tabular-nums">
                        {stats.sundaySchoolSummary.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200 tabular-nums">
                        {stats.sundaySchoolAgeStats.subtotal0to14.total.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Section 5: Spiritual Participation (Baptized / Lord's Supper / Tithe) + Education Level & Occupation Breakdown */}
      {(viewFilter === 'all' || viewFilter === 'members_detail') && (
        <ChurchMemberBreakdownSection
          members={scopedChurchMembers}
          scopeLabel={loggedInChapel || 'ሁሉም አጥቢያ ቤተክርስቲያን (10 ቻፕሎች)'}
        />
      )}

      {/* Print-only Sign-off Block */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-8 text-xs text-slate-700">
        <div className="border-t border-slate-400 pt-2">
          <p className="font-bold">ያዘጋጀው፦ _______________________</p>
          <p className="text-[11px] text-slate-500 mt-1">ፊርማ እና ቀን</p>
        </div>
        <div className="border-t border-slate-400 pt-2">
          <p className="font-bold">ያረጋገጠው፦ _____________________</p>
          <p className="text-[11px] text-slate-500 mt-1">የልጆች አገልግሎት ዘርፍ አስተባባሪ</p>
        </div>
        <div className="border-t border-slate-400 pt-2">
          <p className="font-bold">ያጸደቀው፦ ______________________</p>
          <p className="text-[11px] text-slate-500 mt-1">የቤተክርስቲያን አመራር / ማህተም</p>
        </div>
      </div>
    </div>
  );
};
