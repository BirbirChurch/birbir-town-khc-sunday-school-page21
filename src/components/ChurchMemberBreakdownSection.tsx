import React, { useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Droplets,
  Wine,
  Coins,
  BookOpen,
  Briefcase,
  Download,
  Filter
} from 'lucide-react';
import { ChurchMember } from '../types';
import {
  computeChurchMemberDetailedBreakdown,
  SpiritualStatusBreakdown
} from '../utils/churchMemberBreakdownStats';
import { ExportPhotoButton } from './ExportPhotoButton';

export type SpiritualFilterValue =
  | 'all'
  | 'baptized_yes'
  | 'baptized_no'
  | 'baptized_unknown'
  | 'supper_yes'
  | 'supper_no'
  | 'supper_unknown'
  | 'tithe_yes'
  | 'tithe_no'
  | 'tithe_unknown';

interface ChurchMemberBreakdownSectionProps {
  members: ChurchMember[];
  scopeLabel?: string;
  selectedSpiritualFilter?: SpiritualFilterValue;
  onSelectSpiritualFilter?: (val: SpiritualFilterValue) => void;
  selectedEducationKey?: string;
  onSelectEducationKey?: (key: string) => void;
  selectedOccupationKey?: string;
  onSelectOccupationKey?: (key: string) => void;
}

export const ChurchMemberBreakdownSection: React.FC<ChurchMemberBreakdownSectionProps> = ({
  members,
  scopeLabel,
  selectedSpiritualFilter = 'all',
  onSelectSpiritualFilter,
  selectedEducationKey = 'all',
  onSelectEducationKey,
  selectedOccupationKey = 'all',
  onSelectOccupationKey
}) => {
  const spiritualSectionRef = useRef<HTMLElement | null>(null);
  const educationSectionRef = useRef<HTMLElement | null>(null);
  const occupationSectionRef = useRef<HTMLElement | null>(null);

  const stats = useMemo(
    () => computeChurchMemberDetailedBreakdown(members),
    [members]
  );

  const totalCount = stats.totalMembers.total;
  const hasUnspecifiedGender = stats.totalMembers.unspecified > 0;

  const pct = (part: number, whole: number) =>
    whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%';

  const spiritualRows: {
    id: string;
    label: string;
    icon: React.ReactNode;
    data: SpiritualStatusBreakdown;
    yesFilter: SpiritualFilterValue;
    noFilter: SpiritualFilterValue;
    unknownFilter: SpiritualFilterValue;
    noLabel: string;
  }[] = [
    {
      id: 'baptized',
      label: 'የተጠመቁ አባላት',
      icon: <Droplets className="w-4 h-4 text-sky-700 shrink-0" />,
      data: stats.baptized,
      yesFilter: 'baptized_yes',
      noFilter: 'baptized_no',
      unknownFilter: 'baptized_unknown',
      noLabel: 'ያልተጠመቁ'
    },
    {
      id: 'supper',
      label: 'የጌታ እራት የሚካፈሉ',
      icon: <Wine className="w-4 h-4 text-rose-700 shrink-0" />,
      data: stats.lordsSupper,
      yesFilter: 'supper_yes',
      noFilter: 'supper_no',
      unknownFilter: 'supper_unknown',
      noLabel: 'የማይካፈሉ'
    },
    {
      id: 'tithe',
      label: 'አስራት የሚከፍሉ',
      icon: <Coins className="w-4 h-4 text-amber-700 shrink-0" />,
      data: stats.tithe,
      yesFilter: 'tithe_yes',
      noFilter: 'tithe_no',
      unknownFilter: 'tithe_unknown',
      noLabel: 'የማይከፍሉ'
    }
  ];

  const handleExportBreakdownExcel = () => {
    const wb = XLSX.utils.book_new();
    const labelText = scopeLabel || 'አጠቃላይ የቤተክርስቲያን መረጃ ቋት';

    // Sheet 1: Spiritual Participation
    const spiritualSheetRows: (string | number)[][] = [
      [`የቤተክርስቲያን አባላት የጥምቀት፣ የጌታ እራት እና የአስራት ማጠቃለያ — ${labelText}`],
      [],
      [
        'የመረጃ ዓይነት',
        'አዎ (ወንድ)',
        'አዎ (ሴት)',
        'አዎ (ያልተገለጸ ጾታ)',
        'አዎ (ድምር)',
        'ከጠቅላላው (%)',
        'አይ (ወንድ)',
        'አይ (ሴት)',
        'አይ (ድምር)',
        'ያልተገለጸ (ድምር)',
        'ጠቅላላ አባላት'
      ],
      ...spiritualRows.map((row) => [
        row.label,
        row.data.yes.male,
        row.data.yes.female,
        row.data.yes.unspecified,
        row.data.yes.total,
        pct(row.data.yes.total, totalCount),
        row.data.no.male,
        row.data.no.female,
        row.data.no.total,
        row.data.unknown.total,
        row.data.totalMembers.total
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(spiritualSheetRows), 'ጥምቀት_እራት_አስራት');

    // Sheet 2: Education Level Breakdown
    const eduSheetRows: (string | number)[][] = [
      [`የአባላት የትምህርት ደረጃ ዝርዝር (ወንድ / ሴት / ድምር) — ${labelText}`],
      [],
      ['ተ.ቁ', 'የትምህርት ደረጃ', 'ወንድ', 'ሴት', 'ያልተገለጸ ጾታ', 'ድምር', 'ድርሻ (%)'],
      ...stats.educationLevels.map((row, idx) => [
        idx + 1,
        row.label,
        row.male,
        row.female,
        row.unspecified,
        row.total,
        pct(row.total, totalCount)
      ]),
      [
        '',
        'ጠቅላላ ድምር',
        stats.totalMembers.male,
        stats.totalMembers.female,
        stats.totalMembers.unspecified,
        stats.totalMembers.total,
        totalCount > 0 ? '100%' : '0%'
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eduSheetRows), 'የትምህርት_ደረጃ_ዝርዝር');

    // Sheet 3: Occupation Breakdown
    const occSheetRows: (string | number)[][] = [
      [`የአባላት የስራ ዓይነት ዝርዝር (ወንድ / ሴት / ድምር) — ${labelText}`],
      [],
      ['ተ.ቁ', 'የስራ ዓይነት', 'ወንድ', 'ሴት', 'ያልተገለጸ ጾታ', 'ድምር', 'ድርሻ (%)'],
      ...stats.occupations.map((row, idx) => [
        idx + 1,
        row.label,
        row.male,
        row.female,
        row.unspecified,
        row.total,
        pct(row.total, totalCount)
      ]),
      [
        '',
        'ጠቅላላ ድምር',
        stats.totalMembers.male,
        stats.totalMembers.female,
        stats.totalMembers.unspecified,
        stats.totalMembers.total,
        totalCount > 0 ? '100%' : '0%'
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(occSheetRows), 'የስራ_ዓይነት_ዝርዝር');

    XLSX.writeFile(wb, `የአባላት_መንፈሳዊ_ትምህርት_እና_ስራ_ትንተና.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Spiritual Participation Section: Baptized, Lord's Supper, Tithe */}
      <section ref={spiritualSectionRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              የአባላት መንፈሳዊ ተሳትፎ ማጠቃለያ (የተጠመቁ · የጌታ እራት · አስራት — ወንድ / ሴት / ድምር)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {scopeLabel ? `${scopeLabel} — ` : ''}ጠቅላላ {totalCount.toLocaleString('am-ET')} አባላት (ወንድ{' '}
              {stats.totalMembers.male.toLocaleString('am-ET')} · ሴት{' '}
              {stats.totalMembers.female.toLocaleString('am-ET')})
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap print:hidden">
            {selectedSpiritualFilter !== 'all' && onSelectSpiritualFilter && (
              <button
                type="button"
                onClick={() => onSelectSpiritualFilter('all')}
                className="text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                ✕ የመንፈሳዊ ማጣሪያ አጽዳ
              </button>
            )}
            <ExportPhotoButton
              targetRef={spiritualSectionRef}
              fileName={`የአባላት_መንፈሳዊ_ተሳትፎ_ማጠቃለያ${scopeLabel ? `_${scopeLabel}` : ''}`}
              labelAm="በፎቶ (PNG)"
              labelEn="Photo (PNG)"
              variant="secondary"
              compact
            />
            <button
              type="button"
              onClick={handleExportBreakdownExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer print:hidden"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ዝርዝሩን በExcel አውርድ</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Grid (3 clean flat cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-b border-slate-200">
          {spiritualRows.map((item) => {
            const isActiveYes = selectedSpiritualFilter === item.yesFilter;
            return (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {onSelectSpiritualFilter && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectSpiritualFilter(isActiveYes ? 'all' : item.yesFilter)
                      }
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition cursor-pointer print:hidden ${
                        isActiveYes
                          ? 'bg-blue-900 text-white'
                          : 'text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      {isActiveYes ? '✓ ተመርጧል' : 'አሳይ →'}
                    </button>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                    {item.data.yes.total.toLocaleString('am-ET')}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                    ({pct(item.data.yes.total, totalCount)})
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 tabular-nums">
                  <span>ወንድ {item.data.yes.male.toLocaleString('am-ET')}</span>
                  <span className="text-slate-300">·</span>
                  <span>ሴት {item.data.yes.female.toLocaleString('am-ET')}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">
                    {item.noLabel} {item.data.no.total.toLocaleString('am-ET')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Spiritual Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-4 text-left">መንፈሳዊ ተሳትፎ</th>
                <th className="py-2.5 px-3 text-right bg-blue-50/40 text-blue-950">አዎ · ወንድ</th>
                <th className="py-2.5 px-3 text-right bg-rose-50/40 text-rose-950">አዎ · ሴት</th>
                {hasUnspecifiedGender && (
                  <th className="py-2.5 px-3 text-right text-slate-600">ያልተገለጸ</th>
                )}
                <th className="py-2.5 px-3 text-right bg-slate-100/70 text-slate-900">አዎ · ድምር</th>
                <th className="py-2.5 px-3 text-right">ድርሻ (%)</th>
                <th className="py-2.5 px-3 text-right text-slate-600">አይ / ያልሆኑ (ወ/ሴ/ድ)</th>
                <th className="py-2.5 px-3 text-right text-slate-500">ያልተመዘገበ</th>
                {onSelectSpiritualFilter && (
                  <th className="py-2.5 px-4 text-right print:hidden">ማጣሪያ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spiritualRows.map((row) => {
                const isSelected = selectedSpiritualFilter === row.yesFilter;
                return (
                  <tr
                    key={`sp_tbl_${row.id}`}
                    className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'}
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {row.icon}
                        <span>{row.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-900 bg-blue-50/20 tabular-nums">
                      {row.data.yes.male.toLocaleString('am-ET')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-900 bg-rose-50/20 tabular-nums">
                      {row.data.yes.female.toLocaleString('am-ET')}
                    </td>
                    {hasUnspecifiedGender && (
                      <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                        {row.data.yes.unspecified.toLocaleString('am-ET')}
                      </td>
                    )}
                    <td className="py-3 px-3 text-right font-extrabold text-slate-900 bg-slate-50/70 tabular-nums">
                      {row.data.yes.total.toLocaleString('am-ET')}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-600 tabular-nums">
                      {pct(row.data.yes.total, totalCount)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 tabular-nums whitespace-nowrap">
                      {row.data.no.male} / {row.data.no.female} /{' '}
                      <strong className="text-slate-900">{row.data.no.total}</strong>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                      {row.data.unknown.total.toLocaleString('am-ET')}
                    </td>
                    {onSelectSpiritualFilter && (
                      <td className="py-3 px-4 text-right whitespace-nowrap print:hidden">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onSelectSpiritualFilter(isSelected ? 'all' : row.yesFilter)
                            }
                            className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                          >
                            {isSelected ? '✓ አዎ' : 'አዎ አሳይ'}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() =>
                              onSelectSpiritualFilter(
                                selectedSpiritualFilter === row.noFilter ? 'all' : row.noFilter
                              )
                            }
                            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                          >
                            አይ
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Side-by-Side Detailed Education Level & Occupation Breakdowns (ወንድ / ሴት / ድምር) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Education Level Detailed Table */}
        <section ref={educationSectionRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>የትምህርት ደረጃ በዝርዝር (ወንድ / ሴት / ድምር)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                {stats.educationLevels.length} የትምህርት ደረጃ ምድቦች · ጠቅላላ {totalCount.toLocaleString('am-ET')} አባላት
              </p>
            </div>
            <div className="flex items-center gap-1.5 print:hidden shrink-0">
              {selectedEducationKey !== 'all' && onSelectEducationKey && (
                <button
                  type="button"
                  onClick={() => onSelectEducationKey('all')}
                  className="text-[11px] font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  ✕ አጽዳ
                </button>
              )}
              <ExportPhotoButton
                targetRef={educationSectionRef}
                fileName={`የአባላት_የትምህርት_ደረጃ_ዝርዝር${scopeLabel ? `_${scopeLabel}` : ''}`}
                labelAm="በፎቶ (PNG)"
                labelEn="Photo (PNG)"
                variant="secondary"
                compact
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[380px] flex-1">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-600 font-bold">
                  <th className="py-2.5 px-3 text-left w-10">ተ.ቁ</th>
                  <th className="py-2.5 px-3 text-left">የትምህርት ደረጃ</th>
                  <th className="py-2.5 px-3 text-right text-blue-900">ወንድ</th>
                  <th className="py-2.5 px-3 text-right text-rose-900">ሴት</th>
                  {hasUnspecifiedGender && (
                    <th className="py-2.5 px-3 text-right text-slate-500">ያልተገለጸ</th>
                  )}
                  <th className="py-2.5 px-3 text-right text-slate-900 bg-slate-100/70">ድምር</th>
                  <th className="py-2.5 px-3 text-right text-slate-600">ድርሻ (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.educationLevels.length === 0 ? (
                  <tr>
                    <td colSpan={hasUnspecifiedGender ? 7 : 6} className="py-8 text-center text-slate-400">
                      ምንም የተመዘገበ አባል የለም
                    </td>
                  </tr>
                ) : (
                  stats.educationLevels.map((row, idx) => {
                    const isSelected = selectedEducationKey === row.key;
                    return (
                      <tr
                        key={`edu_${row.key}`}
                        onClick={() =>
                          onSelectEducationKey &&
                          onSelectEducationKey(isSelected ? 'all' : row.key)
                        }
                        className={`${onSelectEducationKey ? 'cursor-pointer' : ''} transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 font-bold'
                            : row.isUnspecified
                            ? 'bg-slate-50/40 hover:bg-slate-100/60'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-500 tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{row.label}</span>
                            {row.englishHint && !row.label.includes(row.englishHint) && (
                              <span className="text-[10px] font-semibold text-slate-400">
                                ({row.englishHint})
                              </span>
                            )}
                            {isSelected && <Filter className="w-3 h-3 text-indigo-700 shrink-0" />}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                          {row.male.toLocaleString('am-ET')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                          {row.female.toLocaleString('am-ET')}
                        </td>
                        {hasUnspecifiedGender && (
                          <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                            {row.unspecified.toLocaleString('am-ET')}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 bg-slate-50/60 tabular-nums">
                          {row.total.toLocaleString('am-ET')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">
                          {pct(row.total, totalCount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <td className="py-2.5 px-3">—</td>
                  <td className="py-2.5 px-3">ጠቅላላ ድምር</td>
                  <td className="py-2.5 px-3 text-right text-blue-200 tabular-nums">
                    {stats.totalMembers.male.toLocaleString('am-ET')}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-200 tabular-nums">
                    {stats.totalMembers.female.toLocaleString('am-ET')}
                  </td>
                  {hasUnspecifiedGender && (
                    <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                      {stats.totalMembers.unspecified.toLocaleString('am-ET')}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right bg-slate-800 tabular-nums">
                    {stats.totalMembers.total.toLocaleString('am-ET')}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {totalCount > 0 ? '100%' : '0%'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Occupation / Job Type Detailed Table */}
        <section ref={occupationSectionRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>የስራ ዓይነት በዝርዝር (ወንድ / ሴት / ድምር)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                {stats.occupations.length} የስራ ዓይነት ምድቦች · ጠቅላላ {totalCount.toLocaleString('am-ET')} አባላት
              </p>
            </div>
            <div className="flex items-center gap-1.5 print:hidden shrink-0">
              {selectedOccupationKey !== 'all' && onSelectOccupationKey && (
                <button
                  type="button"
                  onClick={() => onSelectOccupationKey('all')}
                  className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  ✕ አጽዳ
                </button>
              )}
              <ExportPhotoButton
                targetRef={occupationSectionRef}
                fileName={`የአባላት_የስራ_ዓይነት_ዝርዝር${scopeLabel ? `_${scopeLabel}` : ''}`}
                labelAm="በፎቶ (PNG)"
                labelEn="Photo (PNG)"
                variant="secondary"
                compact
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[380px] flex-1">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-600 font-bold">
                  <th className="py-2.5 px-3 text-left w-10">ተ.ቁ</th>
                  <th className="py-2.5 px-3 text-left">የስራ ዓይነት</th>
                  <th className="py-2.5 px-3 text-right text-blue-900">ወንድ</th>
                  <th className="py-2.5 px-3 text-right text-rose-900">ሴት</th>
                  {hasUnspecifiedGender && (
                    <th className="py-2.5 px-3 text-right text-slate-500">ያልተገለጸ</th>
                  )}
                  <th className="py-2.5 px-3 text-right text-slate-900 bg-slate-100/70">ድምር</th>
                  <th className="py-2.5 px-3 text-right text-slate-600">ድርሻ (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.occupations.length === 0 ? (
                  <tr>
                    <td colSpan={hasUnspecifiedGender ? 7 : 6} className="py-8 text-center text-slate-400">
                      ምንም የተመዘገበ አባል የለም
                    </td>
                  </tr>
                ) : (
                  stats.occupations.map((row, idx) => {
                    const isSelected = selectedOccupationKey === row.key;
                    return (
                      <tr
                        key={`occ_${row.key}`}
                        onClick={() =>
                          onSelectOccupationKey &&
                          onSelectOccupationKey(isSelected ? 'all' : row.key)
                        }
                        className={`${onSelectOccupationKey ? 'cursor-pointer' : ''} transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 font-bold'
                            : row.isUnspecified
                            ? 'bg-slate-50/40 hover:bg-slate-100/60'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-500 tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{row.label}</span>
                            {row.englishHint && !row.label.includes(row.englishHint) && (
                              <span className="text-[10px] font-semibold text-slate-400">
                                ({row.englishHint})
                              </span>
                            )}
                            {isSelected && <Filter className="w-3 h-3 text-emerald-700 shrink-0" />}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                          {row.male.toLocaleString('am-ET')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                          {row.female.toLocaleString('am-ET')}
                        </td>
                        {hasUnspecifiedGender && (
                          <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                            {row.unspecified.toLocaleString('am-ET')}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 bg-slate-50/60 tabular-nums">
                          {row.total.toLocaleString('am-ET')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">
                          {pct(row.total, totalCount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <td className="py-2.5 px-3">—</td>
                  <td className="py-2.5 px-3">ጠቅላላ ድምር</td>
                  <td className="py-2.5 px-3 text-right text-blue-200 tabular-nums">
                    {stats.totalMembers.male.toLocaleString('am-ET')}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-200 tabular-nums">
                    {stats.totalMembers.female.toLocaleString('am-ET')}
                  </td>
                  {hasUnspecifiedGender && (
                    <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                      {stats.totalMembers.unspecified.toLocaleString('am-ET')}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right bg-slate-800 tabular-nums">
                    {stats.totalMembers.total.toLocaleString('am-ET')}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {totalCount > 0 ? '100%' : '0%'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
