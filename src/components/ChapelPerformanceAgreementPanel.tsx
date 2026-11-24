import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  Link2,
  Lock,
  Printer,
  RotateCcw,
  Search,
  User,
  UserCheck,
  Users
} from 'lucide-react';
import {
  AnnualPlanItem,
  ChapelPerformanceAgreementData,
  ChapelPerformanceAgreementRowValue,
  ChapelPerformanceAgreementSignOff,
  ChurchHRRecord,
  DepartmentWorkspaceData,
  OrgUnitId
} from '../types';
import {
  AgreementPeriodKey,
  PERFORMANCE_AGREEMENT_CATALOG,
  PERFORMANCE_AGREEMENT_FORM_TITLE,
  computeChapelAgreementSummary,
  computeRowPeriodStats,
  createDefaultAgreementRows,
  ensureChapelAgreementData,
  exportChapelPerformanceAgreementExcel,
  findChapelCoordinatorHRRecords,
  resolveAgreementRowsWithChapelPlans
} from '../utils/chapelPerformanceAgreement';
import { getHRDepartments, getHRRoleTitles } from '../utils/hrMemberMatcher';
import { useLanguage } from '../context/LanguageContext';
import { ChapelQuarterlyComparisonChart } from './ChapelQuarterlyComparisonChart';
import { ExportPhotoButton } from './ExportPhotoButton';

export type PerformanceAgreementViewMode =
  | 'chapel_scoped'
  | 'chapels_overview'
  | 'spiritual_council'
  | 'admin_finance'
  | 'elders_council';

interface ChapelPerformanceAgreementPanelProps {
  mode: PerformanceAgreementViewMode;
  currentYear: string;
  chapelList: string[];
  lockedChapel?: string | null;
  chapelPlansMap?: { [chapelName: string]: AnnualPlanItem[] };
  departmentDataMap: { [unitId: string]: DepartmentWorkspaceData };
  onUpdateDepartmentData?: (
    unitId: OrgUnitId,
    updater: (prev: DepartmentWorkspaceData) => DepartmentWorkspaceData
  ) => void;
  onNavigateToUnit?: (unitId: OrgUnitId) => void;
}

const PERIOD_OPTIONS: { id: AgreementPeriodKey; am: string; en: string }[] = [
  { id: 'year', am: 'ሙሉ ዓመት', en: 'Full Year' },
  { id: 'h1', am: '1ኛ ግማሽ (ሐምሌ–ታኅሣሥ)', en: 'H1 (Jul–Dec)' },
  { id: 'h2', am: '2ኛ ግማሽ (ጥር–ሰኔ)', en: 'H2 (Jan–Jun)' },
  { id: 'q1', am: '1ኛ ሩብ (ሐምሌ–መስከረም)', en: 'Q1' },
  { id: 'q2', am: '2ኛ ሩብ (ጥቅምት–ታኅሣሥ)', en: 'Q2' },
  { id: 'q3', am: '3ኛ ሩብ (ጥር–መጋቢት)', en: 'Q3' },
  { id: 'q4', am: '4ኛ ሩብ (ሚያዝያ–ሰኔ)', en: 'Q4' }
];

const pctBadgeClass = (pct: number | null): string => {
  if (pct === null) return 'bg-slate-100 text-slate-500 border-slate-200';
  if (pct >= 100) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (pct >= 50) return 'bg-amber-50 text-amber-800 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

export const ChapelPerformanceAgreementPanel: React.FC<
  ChapelPerformanceAgreementPanelProps
> = ({
  mode,
  currentYear,
  chapelList,
  lockedChapel,
  chapelPlansMap,
  departmentDataMap,
  onUpdateDepartmentData,
  onNavigateToUnit
}) => {
  const { t, chapelLabel } = useLanguage();
  const agreementExportRef = useRef<HTMLDivElement | null>(null);
  const [period, setPeriod] = useState<AgreementPeriodKey>('year');
  const [selectedChapel, setSelectedChapel] = useState<string>(
    lockedChapel || chapelList[0] || ''
  );
  const [viewLayout, setViewLayout] = useState<'overview' | 'single'>(
    lockedChapel ? 'single' : 'overview'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Only Admin & Finance and Spiritual Sector may edit; all other views are strictly Read-Only
  const canEdit =
    Boolean(onUpdateDepartmentData) &&
    (mode === 'admin_finance' || mode === 'spiritual_council');

  const activeChapel = lockedChapel || selectedChapel || chapelList[0] || '';
  const hrRecords: ChurchHRRecord[] = useMemo(
    () => departmentDataMap.admin_finance?.hrRecords || [],
    [departmentDataMap]
  );

  const savedAgreementsByChapel = useMemo(
    () => departmentDataMap.chapels_dept?.chapelPerformanceAgreements || {},
    [departmentDataMap]
  );

  const effectiveChapelPlansMap = useMemo(
    () => chapelPlansMap || departmentDataMap.chapels_dept?.chapelPlans || {},
    [chapelPlansMap, departmentDataMap]
  );

  // Build normalized agreement objects & summaries for all chapels using live chapel plan execution
  const allChapelSummaries = useMemo(() => {
    return chapelList.map((ch) => {
      const data = ensureChapelAgreementData(
        savedAgreementsByChapel[ch]?.[currentYear],
        ch,
        currentYear,
        hrRecords
      );
      const summary = computeChapelAgreementSummary(
        data,
        effectiveChapelPlansMap[ch] || []
      );
      const { matchedForChapel } = findChapelCoordinatorHRRecords(ch, hrRecords);
      const linkedHr =
        (data.signOff.evangelistHrId !== undefined
          ? hrRecords.find((r) => r.id === data.signOff.evangelistHrId)
          : undefined) || matchedForChapel[0];
      return {
        chapelName: ch,
        data,
        summary,
        linkedHr
      };
    });
  }, [chapelList, savedAgreementsByChapel, currentYear, hrRecords, effectiveChapelPlansMap]);

  const activeAgreementData: ChapelPerformanceAgreementData = useMemo(
    () =>
      ensureChapelAgreementData(
        savedAgreementsByChapel[activeChapel]?.[currentYear],
        activeChapel,
        currentYear,
        hrRecords
      ),
    [savedAgreementsByChapel, activeChapel, currentYear, hrRecords]
  );

  const activeChapelPlans = useMemo(
    () => effectiveChapelPlansMap[activeChapel] || [],
    [effectiveChapelPlansMap, activeChapel]
  );

  const { resolvedRows, liveExecutionMap, liveLinkedQuarters } = useMemo(
    () =>
      resolveAgreementRowsWithChapelPlans(
        activeAgreementData.rows,
        activeChapelPlans,
        currentYear
      ),
    [activeAgreementData.rows, activeChapelPlans, currentYear]
  );

  const activeSummary = useMemo(
    () => computeChapelAgreementSummary(activeAgreementData, activeChapelPlans),
    [activeAgreementData, activeChapelPlans]
  );

  const { matchedForChapel, allCoordinatorCandidates } = useMemo(
    () => findChapelCoordinatorHRRecords(activeChapel, hrRecords),
    [activeChapel, hrRecords]
  );

  const activeLinkedHr = useMemo(() => {
    if (activeAgreementData.signOff.evangelistHrId !== undefined) {
      return hrRecords.find((r) => r.id === activeAgreementData.signOff.evangelistHrId);
    }
    return matchedForChapel[0];
  }, [activeAgreementData.signOff.evangelistHrId, hrRecords, matchedForChapel]);

  const persistAgreement = (
    targetChapel: string,
    nextData: ChapelPerformanceAgreementData
  ) => {
    if (!canEdit || !onUpdateDepartmentData) return;
    onUpdateDepartmentData('chapels_dept', (prev) => ({
      ...prev,
      chapelPerformanceAgreements: {
        ...(prev.chapelPerformanceAgreements || {}),
        [targetChapel]: {
          ...(prev.chapelPerformanceAgreements?.[targetChapel] || {}),
          [currentYear]: {
            ...nextData,
            year: currentYear,
            chapelName: targetChapel,
            updatedAt: new Date().toISOString()
          }
        }
      }
    }));
  };

  const handleRowFieldChange = (
    itemCode: string,
    field: keyof ChapelPerformanceAgreementRowValue,
    value: string
  ) => {
    const prevRow =
      activeAgreementData.rows[itemCode] || createDefaultAgreementRows()[itemCode];
    const nextRows = {
      ...activeAgreementData.rows,
      [itemCode]: {
        ...prevRow,
        [field]: value
      }
    };
    persistAgreement(activeChapel, {
      ...activeAgreementData,
      rows: nextRows
    });
  };

  const handleSignOffChange = (
    patch: Partial<ChapelPerformanceAgreementSignOff>
  ) => {
    persistAgreement(activeChapel, {
      ...activeAgreementData,
      signOff: {
        ...activeAgreementData.signOff,
        ...patch
      }
    });
  };

  const handleSelectLinkedHRServant = (hrIdStr: string) => {
    if (!hrIdStr) {
      handleSignOffChange({ evangelistHrId: undefined });
      return;
    }
    const idNum = Number(hrIdStr);
    const chosen = hrRecords.find((r) => r.id === idNum);
    if (!chosen) return;
    handleSignOffChange({
      evangelistHrId: chosen.id,
      evangelistName: chosen.name
    });
  };

  const handleResetToDefaults = () => {
    persistAgreement(activeChapel, {
      ...activeAgreementData,
      rows: createDefaultAgreementRows()
    });
    setConfirmResetOpen(false);
  };

  const handleExportAllChapelsSummaryExcel = () => {
    const aoa: (string | number)[][] = [
      [PERFORMANCE_AGREEMENT_FORM_TITLE],
      [`የሁሉም ቻፕሎች (${chapelList.length}) ማጠቃለያ — ዘመን፦ ${currentYear} ዓ.ም`],
      [],
      [
        'ቻፕል',
        'ወንጌላዊ / የቻፕል አስተባባሪ (ከሰው ኃይል ቋት)',
        '1ኛ ሩብ %',
        '2ኛ ሩብ %',
        '1ኛ ግማሽ %',
        '3ኛ ሩብ %',
        '4ኛ ሩብ %',
        '2ኛ ግማሽ %',
        'የዓመቱ አፈጻጸም %',
        'ፊርማ (ወንጌላዊ / መንፈሳዊ / አስተዳደር)'
      ]
    ];

    allChapelSummaries.forEach(({ chapelName, summary, linkedHr }) => {
      const servantLabel =
        summary.evangelistName || linkedHr?.name || 'ያልተመደበ';
      const sigStr = `${summary.hasEvangelistSigned ? '✓' : '—'} / ${
        summary.hasSpiritualSigned ? '✓' : '—'
      } / ${summary.hasAdminSigned ? '✓' : '—'}`;
      aoa.push([
        chapelLabel(chapelName),
        servantLabel,
        `${summary.q1AvgPct}%`,
        `${summary.q2AvgPct}%`,
        `${summary.h1AvgPct}%`,
        `${summary.q3AvgPct}%`,
        `${summary.q4AvgPct}%`,
        `${summary.h2AvgPct}%`,
        `${summary.annualAvgPct}%`,
        sigStr
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'የቻፕሎች_ግብ_ማጠቃለያ');
    XLSX.writeFile(
      wb,
      `የቻፕሎች_አገልጋዮች_ግብ_ስምምነት_ማጠቃለያ_${currentYear}.xlsx`
    );
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleCatalog = useMemo(() => {
    if (!normalizedQuery) return PERFORMANCE_AGREEMENT_CATALOG;
    const matchingSectionCodes = new Set<string>();
    PERFORMANCE_AGREEMENT_CATALOG.forEach((item) => {
      if (
        !item.isSectionHeader &&
        !item.isSubHeader &&
        (item.code.toLowerCase().includes(normalizedQuery) ||
          item.title.toLowerCase().includes(normalizedQuery))
      ) {
        matchingSectionCodes.add(item.sectionCode);
      }
    });
    return PERFORMANCE_AGREEMENT_CATALOG.filter((item) => {
      if (item.isSectionHeader) return matchingSectionCodes.has(item.sectionCode);
      if (item.isSubHeader) return matchingSectionCodes.has(item.sectionCode);
      return (
        item.code.toLowerCase().includes(normalizedQuery) ||
        item.title.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [normalizedQuery]);

  const roleContextHint =
    mode === 'spiritual_council'
      ? t(
          'መንፈሳዊ ዘርፍ ጉባኤ — የሁሉንም ቻፕሎች ከአገልጋዮች ጋር የተደረገ የ2019 ግብ ስምምነት እና የሩብ/ግማሽ/ዓመት አፈጻጸም ክትትል እና ማረጋገጫ',
          'Spiritual Council — Review, track, and sign off all chapels’ 2019 Servant Performance Agreements'
        )
      : mode === 'admin_finance'
      ? t(
          'አስተዳደርና ፋይናንስ — በሰው ኃይል ስር ካሉ የቻፕል አስተባባሪ አገልጋዮች ጋር በቀጥታ የተገናኘ የሥራ አፈጻጸም ግብ ስምምነት',
          'Admin & Finance — Directly connected to Chapel Coordinator Servants in HR for goal evaluation and sign-off'
        )
      : mode === 'elders_council'
      ? t(
          'የሽማግሌዎች ጉባኤ — የሁሉም ቻፕሎች እና አገልጋዮች የ2019 ዓ.ም የሥራ አፈጻጸም ግብ ስምምነት አጠቃላይ ቁጥጥር',
          'Elders Council — Executive oversight of all chapels’ and servants’ 2019 Performance Goal Agreements'
        )
      : t(
          'የየቻፕሉ ከአገልጋዮች ጋር የተደረገ የ2019 ዓ.ም የሥራ አፈጻጸም ግብ ስምምነት፣ የሩብ/ግማሽ/ዓመት ዕቅድ እና ክንውን መመዝገቢያ',
          'Chapel 2019 Servant Performance Goal Agreement, Plan & Execution Tracker'
        );

  // Average stats across all 10 chapels for consolidated KPI strip
  const consolidatedStats = useMemo(() => {
    if (allChapelSummaries.length === 0) {
      return { avgH1: 0, avgH2: 0, avgAnnual: 0, fullySigned: 0, linkedServants: 0 };
    }
    const n = allChapelSummaries.length;
    const avgH1 = Math.round(
      allChapelSummaries.reduce((s, c) => s + c.summary.h1AvgPct, 0) / n
    );
    const avgH2 = Math.round(
      allChapelSummaries.reduce((s, c) => s + c.summary.h2AvgPct, 0) / n
    );
    const avgAnnual = Math.round(
      allChapelSummaries.reduce((s, c) => s + c.summary.annualAvgPct, 0) / n
    );
    const fullySigned = allChapelSummaries.filter(
      (c) => c.summary.signOffCount === 3
    ).length;
    const linkedServants = allChapelSummaries.filter(
      (c) => Boolean(c.summary.evangelistName || c.linkedHr)
    ).length;
    return { avgH1, avgH2, avgAnnual, fullySigned, linkedServants };
  }, [allChapelSummaries]);

  return (
    <div ref={agreementExportRef} className="space-y-5">
      {/* Official Title & Mode Header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800 uppercase tracking-wide">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>{t(`የ${currentYear} ዓ.ም ቋሚ የግብ ስምምነት`, `${currentYear} Performance Agreement`)}</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              {PERFORMANCE_AGREEMENT_FORM_TITLE}
            </h3>
            <p className="text-xs text-slate-600">{roleContextHint}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {!lockedChapel && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewLayout('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewLayout === 'overview'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {t(`የሁሉም ቻፕሎች (${chapelList.length})`, `All Chapels (${chapelList.length})`)}
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('single')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewLayout === 'single'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {t('የአንድ ቻፕል ዝርዝር ቅጽ', 'Single Chapel Sheet')}
                </button>
              </div>
            )}

            {onNavigateToUnit && mode !== 'admin_finance' && (
              <button
                type="button"
                onClick={() => onNavigateToUnit('admin_finance')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t('የአስተዳደር ሰው ኃይል ቋት', 'Admin HR Servants')}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {viewLayout === 'overview' && !lockedChapel ? (
              <button
                type="button"
                onClick={handleExportAllChapelsSummaryExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('የሁሉም ቻፕሎች Excel አውርድ', 'Export All Chapels Excel')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  exportChapelPerformanceAgreementExcel({
                    data: activeAgreementData,
                    chapelLabel: chapelLabel(activeChapel),
                    period,
                    chapelPlans: activeChapelPlans
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('Excel አውርድ', 'Export Excel')}</span>
              </button>
            )}

            <ExportPhotoButton
              targetRef={agreementExportRef}
              fileName={
                viewLayout === 'overview' && !lockedChapel
                  ? `የቻፕሎች_አገልጋዮች_ግብ_ስምምነት_ማጠቃለያ_${currentYear}`
                  : `${chapelLabel(activeChapel)}_ግብ_ስምምነት_${currentYear}`
              }
            />

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
          </div>
        </div>

        {/* Access & Live Chapel-Execution Sync Banner */}
        {!canEdit ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {t(
                  'ማየት ብቻ (Read-Only) — ይህን ሪፖርት ኤዲት ማድረግ የሚችሉት አስተዳደርና ፋይናንስ እና መንፈሳዊ ዘርፍ ብቻ ናቸው።',
                  'View Only — Only Admin & Finance and Spiritual Sector may edit this report.'
                )}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
              <Link2 className="w-3.5 h-3.5" />
              {t('ክንውኑ ከቻፕሉ ዕቅድና ክንውን በራስ-ሰር ይመጣል (100% ጣሪያ)', 'Execution auto-pulls from Chapel Plan (100% cap)')}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              {t(
                'የክንውን ሪፖርቱ ከየቻፕሉ ዕቅድና ክንውን በራስ-ሰር ይወሰዳል፤ ከግብ በላይ ከተሰራ 100% ይያዛል፣ በከፊል ከተሰራ በተሰራው ልክ ከ100% ይሰላል።',
                'Execution pulls automatically from each chapel’s Plan & Execution; goals met or exceeded cap at 100%.'
              )}
            </span>
          </div>
        )}
      </section>

      {/* Consolidated All-Chapels Overview */}
      {!lockedChapel && viewLayout === 'overview' && (
        <div className="space-y-4">
          {mode === 'spiritual_council' && (
            <ChapelQuarterlyComparisonChart
              currentYear={currentYear}
              chapelList={chapelList}
              chapelPlansMap={effectiveChapelPlansMap}
              chapelPerformanceAgreements={savedAgreementsByChapel}
              hrRecords={hrRecords}
              onSelectChapel={(ch) => {
                setSelectedChapel(ch);
                setViewLayout('single');
              }}
            />
          )}

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-semibold text-slate-500">
                {t('የተገናኙ የቻፕል አስተባባሪዎች', 'Linked Chapel Servants')}
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
                {consolidatedStats.linkedServants} / {chapelList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {t('ከአስተዳደርና ፋይናንስ የሰው ኃይል ቋት', 'From Admin & Finance HR')}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-semibold text-slate-500">
                {t('የ1ኛ ግማሽ ዓመት አማካይ (H1)', 'H1 Average Execution')}
              </div>
              <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-1">
                {consolidatedStats.avgH1}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {t('1ኛ + 2ኛ ሩብ ዓመት', 'Q1 + Q2 Combined')}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-semibold text-slate-500">
                {t('የ2ኛ ግማሽ ዓመት አማካይ (H2)', 'H2 Average Execution')}
              </div>
              <div className="text-2xl font-extrabold text-indigo-800 tabular-nums mt-1">
                {consolidatedStats.avgH2}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {t('3ኛ + 4ኛ ሩብ ዓመት', 'Q3 + Q4 Combined')}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-semibold text-slate-500">
                {t('የዓመቱ አጠቃላይ አፈጻጸም', 'Annual Avg Achievement')}
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums mt-1">
                {consolidatedStats.avgAnnual}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {t(`ሙሉ ፊርማ ያጠናቀቁ፦ ${consolidatedStats.fullySigned}`, `Fully signed: ${consolidatedStats.fullySigned}`)}
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                {t(
                  `የ${chapelList.length}ሩም ቻፕሎች ከአገልጋዮች ጋር የተደረገ የ${currentYear} ግብ ስምምነት እና አፈጻጸም`,
                  `All ${chapelList.length} Chapels ${currentYear} Performance Agreements & Execution`
                )}
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                {canEdit
                  ? t('ዝርዝሩን ለማየት/ለመሙላት ወይም ለመፈረም "ቅጹን ክፈት" ይጫኑ', 'Click "Open Form" to view/edit rows or sign off')
                  : t('ዝርዝሩን ለማየት "ቅጹን እይ" ይጫኑ (ማየት ብቻ)', 'Click "View Form" to inspect chapel rows (Read-Only)')}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4 text-left">{t('ቻፕል', 'Chapel')}</th>
                    <th className="py-3 px-3 text-left">{t('ወንጌላዊ / የቻፕል አስተባባሪ (HR)', 'Servant / Coordinator (HR)')}</th>
                    <th className="py-3 px-2.5 text-center">{t('1ኛ ሩብ', 'Q1')}</th>
                    <th className="py-3 px-2.5 text-center">{t('2ኛ ሩብ', 'Q2')}</th>
                    <th className="py-3 px-2.5 text-center bg-blue-50/70 text-blue-900">{t('1ኛ ግማሽ', 'H1')}</th>
                    <th className="py-3 px-2.5 text-center">{t('3ኛ ሩብ', 'Q3')}</th>
                    <th className="py-3 px-2.5 text-center">{t('4ኛ ሩብ', 'Q4')}</th>
                    <th className="py-3 px-2.5 text-center bg-indigo-50/70 text-indigo-900">{t('2ኛ ግማሽ', 'H2')}</th>
                    <th className="py-3 px-2.5 text-center bg-emerald-50/70 text-emerald-900">{t('የዓመቱ %', 'Annual %')}</th>
                    <th className="py-3 px-3 text-center">{t('ፊርማዎች', 'Sign-offs')}</th>
                    <th className="py-3 px-4 text-right print:hidden">{t('እርምጃ', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allChapelSummaries.map(({ chapelName, summary, linkedHr }) => {
                    const displayServant = summary.evangelistName || linkedHr?.name || '';
                    return (
                      <tr key={chapelName} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                          {chapelLabel(chapelName)}
                        </td>
                        <td className="py-3 px-3">
                          {displayServant ? (
                            <div className="flex items-center gap-2">
                              {linkedHr?.photoDataUrl ? (
                                <img
                                  src={linkedHr.photoDataUrl}
                                  alt={displayServant}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                  <User className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 truncate">{displayServant}</div>
                                {linkedHr && (
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {getHRRoleTitles(linkedHr).join(' · ') || linkedHr.roleTitle}
                                    {linkedHr.phone ? ` · ${linkedHr.phone}` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {t('አገልጋይ አልተመደበም', 'Unassigned')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2.5 text-center tabular-nums font-bold text-slate-700">
                          {summary.q1AvgPct}%
                        </td>
                        <td className="py-3 px-2.5 text-center tabular-nums font-bold text-slate-700">
                          {summary.q2AvgPct}%
                        </td>
                        <td className="py-3 px-2.5 text-center tabular-nums font-extrabold text-blue-900 bg-blue-50/40">
                          {summary.h1AvgPct}%
                        </td>
                        <td className="py-3 px-2.5 text-center tabular-nums font-bold text-slate-700">
                          {summary.q3AvgPct}%
                        </td>
                        <td className="py-3 px-2.5 text-center tabular-nums font-bold text-slate-700">
                          {summary.q4AvgPct}%
                        </td>
                        <td className="py-3 px-2.5 text-center tabular-nums font-extrabold text-indigo-900 bg-indigo-50/40">
                          {summary.h2AvgPct}%
                        </td>
                        <td className="py-3 px-2.5 text-center tabular-nums bg-emerald-50/40">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg border text-[11px] font-extrabold ${pctBadgeClass(
                              summary.annualAvgPct
                            )}`}
                          >
                            {summary.annualAvgPct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold">
                            <span
                              title={t('ወንጌላዊ', 'Evangelist')}
                              className={`px-1.5 py-0.5 rounded border ${
                                summary.hasEvangelistSigned
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              ወን
                            </span>
                            <span
                              title={t('መንፈሳዊ ዘርፍ', 'Spiritual Sector')}
                              className={`px-1.5 py-0.5 rounded border ${
                                summary.hasSpiritualSigned
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              መን
                            </span>
                            <span
                              title={t('አስተዳደር ዘርፍ', 'Admin Sector')}
                              className={`px-1.5 py-0.5 rounded border ${
                                summary.hasAdminSigned
                                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              አስ
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right print:hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapel(chapelName);
                              setViewLayout('single');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold cursor-pointer"
                          >
                            {canEdit ? t('ቅጹን ክፈት', 'Open Form') : t('ቅጹን እይ', 'View Form')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Single Chapel Interactive Sheet */}
      {(lockedChapel || viewLayout === 'single') && (
        <div className="space-y-4">
          {/* Chapel Switcher (when unlocked) + Connected Admin HR Servant Card */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            {!lockedChapel && (
              <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 print:hidden">
                {chapelList.map((ch) => {
                  const isActive = ch === activeChapel;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSelectedChapel(ch)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {chapelLabel(ch)}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* Linked HR Servant Info */}
              <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
                {activeLinkedHr?.photoDataUrl ? (
                  <img
                    src={activeLinkedHr.photoDataUrl}
                    alt={activeLinkedHr.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                    <UserCheck className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500">
                    {t(
                      `${chapelLabel(activeChapel)} — የአገልጋይ / የቻፕል አስተባባሪ ግንኙነት (አስተዳደር HR)`,
                      `${chapelLabel(activeChapel)} — Linked Servant / Coordinator (Admin HR)`
                    )}
                  </div>
                  <select
                    value={activeAgreementData.signOff.evangelistHrId ?? ''}
                    onChange={(e) => handleSelectLinkedHRServant(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-default text-base sm:text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">
                      {t('-- ከአስተዳደር ሰው ኃይል ቋት አገልጋይ ይምረጡ --', '-- Select Servant from Admin HR --')}
                    </option>
                    {allCoordinatorCandidates.map((hr) => (
                      <option key={hr.id} value={hr.id}>
                        {hr.name} ({getHRRoleTitles(hr).join(', ') || hr.roleTitle}
                        {getHRDepartments(hr).length > 0
                          ? ` — ${getHRDepartments(hr).join(', ')}`
                          : ''}
                        )
                      </option>
                    ))}
                  </select>
                  {activeLinkedHr && (
                    <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{getHRRoleTitles(activeLinkedHr).join(' · ')}</span>
                      {activeLinkedHr.phone && <span>📞 {activeLinkedHr.phone}</span>}
                      <span>{activeLinkedHr.status}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Automatic Quarter / Half-Year / Annual KPIs */}
              <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-blue-800">{t('1ኛ ግማሽ (H1)', 'H1 %')}</div>
                  <div className="text-lg font-extrabold text-blue-950 tabular-nums mt-0.5">
                    {activeSummary.h1AvgPct}%
                  </div>
                  <div className="text-[10px] text-blue-700 tabular-nums">
                    Q1: {activeSummary.q1AvgPct}% · Q2: {activeSummary.q2AvgPct}%
                  </div>
                </div>
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-indigo-800">{t('2ኛ ግማሽ (H2)', 'H2 %')}</div>
                  <div className="text-lg font-extrabold text-indigo-950 tabular-nums mt-0.5">
                    {activeSummary.h2AvgPct}%
                  </div>
                  <div className="text-[10px] text-indigo-700 tabular-nums">
                    Q3: {activeSummary.q3AvgPct}% · Q4: {activeSummary.q4AvgPct}%
                  </div>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-emerald-800">{t('የዓመቱ አፈጻጸም', 'Annual %')}</div>
                  <div className="text-lg font-extrabold text-emerald-950 tabular-nums mt-0.5">
                    {activeSummary.annualAvgPct}%
                  </div>
                  <div className="text-[10px] text-emerald-700 tabular-nums">
                    {activeSummary.executedItemsCount}/{activeSummary.totalItems} {t('ተመዝግቧል', 'logged')}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-bold text-slate-600">{t('የፊርማ ሁኔታ', 'Sign-Offs')}</div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
                    {activeSummary.signOffCount} / 3
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {t('ወን / መን / አስ', 'Ev / Sp / Ad')}
                  </div>
                </div>
              </div>
            </div>

            {/* Period Tabs + Search & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 print:hidden">
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {PERIOD_OPTIONS.map((p) => {
                  const isActive = period === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriod(p.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-900 text-white'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      {t(p.am, p.en)}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('በተ.ቁ ወይም በተግባር ፈልግ...', 'Search code or task...')}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-base sm:text-xs font-semibold text-slate-800 w-52 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {canEdit && !confirmResetOpen && (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('ነባሪ የ2019 ግብ መልስ', 'Reset 2019 Defaults')}</span>
                  </button>
                )}

                {canEdit && confirmResetOpen && (
                  <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl text-[11px]">
                    <span className="font-bold text-amber-950">
                      {t('ነባሪ ቁጥሮች ይመለሱ?', 'Restore defaults?')}
                    </span>
                    <button
                      type="button"
                      onClick={handleResetToDefaults}
                      className="px-2 py-0.5 rounded bg-amber-700 text-white font-bold cursor-pointer"
                    >
                      {t('አዎ', 'Yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(false)}
                      className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold cursor-pointer"
                    >
                      {t('ተው', 'Cancel')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Main Agreement & Execution Table */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="py-2.5 px-2.5 text-left w-14 border-r border-slate-700">
                      {t('ተ.ቁ', 'No.')}
                    </th>
                    <th className="py-2.5 px-3 text-left min-w-[240px] border-r border-slate-700">
                      {t('የሚከናወኑ ተግባራት', 'Activities')}
                    </th>
                    <th className="py-2.5 px-2 text-center w-20 border-r border-slate-700">
                      {t('መለኪያ', 'Unit')}
                    </th>
                    <th className="py-2.5 px-2 text-center w-24 border-r border-slate-700">
                      {t('የዓመቱ ግብ', 'Annual Goal')}
                    </th>
                    <th className="py-2.5 px-2 text-center w-24 border-r border-slate-700">
                      {t('የቻፕል ዓመታዊ ዕቅድ', 'Chapel Plan')}
                    </th>

                    {period === 'year' && (
                      <>
                        <th className="py-2.5 px-1.5 text-center min-w-[116px] border-r border-slate-700 bg-slate-800">
                          <div>{t('1ኛ ሩብ (ሐም–መስ)', 'Q1')}</div>
                          <div className="text-[9px] font-normal text-slate-300">
                            {t('ዕቅድ  |  ክንውን', 'Plan  |  Exec')}
                          </div>
                        </th>
                        <th className="py-2.5 px-1.5 text-center min-w-[116px] border-r border-slate-700 bg-slate-800">
                          <div>{t('2ኛ ሩብ (ጥቅ–ታኅ)', 'Q2')}</div>
                          <div className="text-[9px] font-normal text-slate-300">
                            {t('ዕቅድ  |  ክንውን', 'Plan  |  Exec')}
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-center min-w-[100px] border-r border-slate-700 bg-blue-950">
                          <div>{t('1ኛ ግማሽ', 'H1 Total')}</div>
                          <div className="text-[9px] font-normal text-blue-200">
                            {t('ዕቅድ / ክንውን / %', 'Plan / Exec / %')}
                          </div>
                        </th>
                        <th className="py-2.5 px-1.5 text-center min-w-[116px] border-r border-slate-700 bg-slate-800">
                          <div>{t('3ኛ ሩብ (ጥር–መጋ)', 'Q3')}</div>
                          <div className="text-[9px] font-normal text-slate-300">
                            {t('ዕቅድ  |  ክንውን', 'Plan  |  Exec')}
                          </div>
                        </th>
                        <th className="py-2.5 px-1.5 text-center min-w-[116px] border-r border-slate-700 bg-slate-800">
                          <div>{t('4ኛ ሩብ (ሚያ–ሰኔ)', 'Q4')}</div>
                          <div className="text-[9px] font-normal text-slate-300">
                            {t('ዕቅድ  |  ክንውን', 'Plan  |  Exec')}
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-center min-w-[100px] border-r border-slate-700 bg-indigo-950">
                          <div>{t('2ኛ ግማሽ', 'H2 Total')}</div>
                          <div className="text-[9px] font-normal text-indigo-200">
                            {t('ዕቅድ / ክንውን / %', 'Plan / Exec / %')}
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-center min-w-[96px] bg-emerald-950">
                          <div>{t('የዓመቱ አፈጻጸም', 'Annual Exec')}</div>
                          <div className="text-[9px] font-normal text-emerald-200">
                            {t('ክንውን / %', 'Exec / %')}
                          </div>
                        </th>
                      </>
                    )}

                    {(period === 'h1' || period === 'h2') && (
                      <>
                        <th className="py-2.5 px-2 text-center min-w-[125px] border-r border-slate-700 bg-slate-800">
                          <div>{period === 'h1' ? t('1ኛ ሩብ', 'Q1') : t('3ኛ ሩብ', 'Q3')}</div>
                          <div className="text-[9px] font-normal text-slate-300">
                            {t('ዕቅድ  |  ክንውን', 'Plan  |  Exec')}
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-center min-w-[125px] border-r border-slate-700 bg-slate-800">
                          <div>{period === 'h1' ? t('2ኛ ሩብ', 'Q2') : t('4ኛ ሩብ', 'Q4')}</div>
                          <div className="text-[9px] font-normal text-slate-300">
                            {t('ዕቅድ  |  ክንውን', 'Plan  |  Exec')}
                          </div>
                        </th>
                        <th className="py-2.5 px-2 text-center w-24 border-r border-slate-700 bg-blue-950">
                          {period === 'h1' ? t('1ኛ ግማሽ ዕቅድ', 'H1 Plan') : t('2ኛ ግማሽ ዕቅድ', 'H2 Plan')}
                        </th>
                        <th className="py-2.5 px-2 text-center w-24 border-r border-slate-700 bg-blue-950">
                          {period === 'h1' ? t('1ኛ ግማሽ ክንውን', 'H1 Exec') : t('2ኛ ግማሽ ክንውን', 'H2 Exec')}
                        </th>
                        <th className="py-2.5 px-2 text-center w-24 bg-emerald-950">
                          {t('በመቶኛ (%)', '% Done')}
                        </th>
                      </>
                    )}

                    {(period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4') && (
                      <>
                        <th className="py-2.5 px-2 text-center w-28 border-r border-slate-700 bg-slate-800">
                          {t('የሩብ ዓመቱ ዕቅድ', 'Quarter Plan')}
                        </th>
                        <th className="py-2.5 px-2 text-center w-28 border-r border-slate-700 bg-emerald-950">
                          {t('የሩብ ዓመቱ ክንውን', 'Quarter Exec')}
                        </th>
                        <th className="py-2.5 px-2 text-center w-24 border-r border-slate-700 bg-blue-950">
                          {t('የሩብ ዓመቱ %', 'Quarter %')}
                        </th>
                        <th className="py-2.5 px-2 text-center w-24 bg-slate-800">
                          {t('የዓመቱ ድምር %', 'Annual %')}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleCatalog.map((item) => {
                    if (item.isSectionHeader) {
                      return (
                        <tr key={item.code} className="bg-amber-50/90 border-y border-amber-200">
                          <td className="py-2 px-2.5 font-extrabold text-amber-950">{item.code}</td>
                          <td colSpan={14} className="py-2 px-3 font-extrabold text-amber-950">
                            {item.title}
                          </td>
                        </tr>
                      );
                    }
                    if (item.isSubHeader) {
                      return (
                        <tr key={item.code} className="bg-slate-100/90 border-y border-slate-200">
                          <td className="py-1.5 px-2.5 font-extrabold text-slate-800">{item.code}.</td>
                          <td colSpan={14} className="py-1.5 px-3 font-extrabold text-slate-800">
                            {item.title}
                          </td>
                        </tr>
                      );
                    }

                    const row =
                      resolvedRows[item.code] ||
                      createDefaultAgreementRows()[item.code];
                    const liveQFlags = liveLinkedQuarters[item.code] || {
                      q1: false,
                      q2: false,
                      q3: false,
                      q4: false
                    };
                    const liveQNums = liveExecutionMap[item.code] || {
                      q1: 0,
                      q2: 0,
                      q3: 0,
                      q4: 0
                    };
                    const st = computeRowPeriodStats(row, item);

                    const renderPlanExecPair = (
                      planField: keyof ChapelPerformanceAgreementRowValue,
                      execField: keyof ChapelPerformanceAgreementRowValue,
                      planVal: string,
                      execVal: string,
                      isLiveLinked: boolean,
                      liveChapelCount: number
                    ) => (
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={planVal}
                          disabled={!canEdit}
                          onChange={(e) =>
                            handleRowFieldChange(item.code, planField, e.target.value)
                          }
                          placeholder={item.isOngoingMarker ? 'x' : '0'}
                          aria-label={`${item.code} ${planField}`}
                          className="w-full px-1 py-1 text-center text-base sm:text-[11px] font-semibold border border-slate-200 rounded bg-white disabled:bg-slate-50/70 disabled:text-slate-800 disabled:cursor-default text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                        />
                        <input
                          type="text"
                          value={execVal}
                          disabled={!canEdit}
                          onChange={(e) =>
                            handleRowFieldChange(item.code, execField, e.target.value)
                          }
                          placeholder={item.isOngoingMarker ? '✓' : '0'}
                          aria-label={`${item.code} ${execField}`}
                          title={
                            isLiveLinked
                              ? t(
                                  `ከቻፕሉ ዕቅድ ክንውን በራስ-ሰር የተወሰደ (${liveChapelCount})`,
                                  `Auto-pulled from Chapel Plan execution (${liveChapelCount})`
                                )
                              : liveChapelCount > 0
                              ? t(`በቻፕል ክንውን የተመዘገበ፦ ${liveChapelCount}`, `Chapel Plan logged: ${liveChapelCount}`)
                              : undefined
                          }
                          className={`w-full px-1 py-1 text-center text-base sm:text-[11px] font-bold border rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 tabular-nums disabled:cursor-default ${
                            isLiveLinked
                              ? 'border-sky-300 bg-sky-50/70 text-sky-950 disabled:bg-sky-50/70 disabled:text-sky-950'
                              : 'border-emerald-200 bg-emerald-50/50 text-emerald-950 disabled:bg-emerald-50/40 disabled:text-emerald-950'
                          }`}
                        />
                      </div>
                    );

                    return (
                      <tr key={item.code} className="hover:bg-slate-50/70">
                        <td className="py-2 px-2.5 font-bold text-slate-600 tabular-nums border-r border-slate-100">
                          {item.code}.
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-medium border-r border-slate-100">
                          {item.title}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-600 font-semibold border-r border-slate-100 whitespace-nowrap">
                          {item.unit}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-100">
                          <input
                            type="text"
                            value={row.annualGoal}
                            disabled={!canEdit}
                            onChange={(e) =>
                              handleRowFieldChange(item.code, 'annualGoal', e.target.value)
                            }
                            className="w-full px-1.5 py-1 text-center text-base sm:text-[11px] font-bold border border-slate-200 rounded bg-slate-50 disabled:bg-slate-50/80 disabled:text-slate-900 disabled:cursor-default text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                          />
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-100">
                          <input
                            type="text"
                            value={row.annualPlan}
                            disabled={!canEdit}
                            onChange={(e) =>
                              handleRowFieldChange(item.code, 'annualPlan', e.target.value)
                            }
                            className="w-full px-1.5 py-1 text-center text-base sm:text-[11px] font-bold border border-blue-200 rounded bg-blue-50/40 disabled:bg-blue-50/30 disabled:text-blue-950 disabled:cursor-default text-blue-950 focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                          />
                        </td>

                        {period === 'year' && (
                          <>
                            <td className="py-1.5 px-1 border-r border-slate-100">
                              {renderPlanExecPair('q1Plan', 'q1Exec', row.q1Plan, row.q1Exec, liveQFlags.q1, liveQNums.q1)}
                            </td>
                            <td className="py-1.5 px-1 border-r border-slate-100">
                              {renderPlanExecPair('q2Plan', 'q2Exec', row.q2Plan, row.q2Exec, liveQFlags.q2, liveQNums.q2)}
                            </td>
                            <td className="py-1.5 px-2 text-center border-r border-slate-100 bg-blue-50/40 tabular-nums">
                              <div className="text-[11px] font-bold text-blue-950">
                                {st.h1PlanDisplay} /{' '}
                                <span className="text-emerald-800">{st.h1ExecDisplay}</span>
                              </div>
                              <span
                                className={`inline-block mt-0.5 px-1.5 py-0 rounded border text-[10px] font-extrabold ${pctBadgeClass(
                                  st.h1Pct
                                )}`}
                              >
                                {st.h1Pct !== null ? `${st.h1Pct}%` : '—'}
                              </span>
                            </td>
                            <td className="py-1.5 px-1 border-r border-slate-100">
                              {renderPlanExecPair('q3Plan', 'q3Exec', row.q3Plan, row.q3Exec, liveQFlags.q3, liveQNums.q3)}
                            </td>
                            <td className="py-1.5 px-1 border-r border-slate-100">
                              {renderPlanExecPair('q4Plan', 'q4Exec', row.q4Plan, row.q4Exec, liveQFlags.q4, liveQNums.q4)}
                            </td>
                            <td className="py-1.5 px-2 text-center border-r border-slate-100 bg-indigo-50/40 tabular-nums">
                              <div className="text-[11px] font-bold text-indigo-950">
                                {st.h2PlanDisplay} /{' '}
                                <span className="text-emerald-800">{st.h2ExecDisplay}</span>
                              </div>
                              <span
                                className={`inline-block mt-0.5 px-1.5 py-0 rounded border text-[10px] font-extrabold ${pctBadgeClass(
                                  st.h2Pct
                                )}`}
                              >
                                {st.h2Pct !== null ? `${st.h2Pct}%` : '—'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center bg-emerald-50/40 tabular-nums">
                              <div className="text-[11px] font-extrabold text-emerald-950">
                                {st.annualExecDisplay}
                              </div>
                              <span
                                className={`inline-block mt-0.5 px-1.5 py-0 rounded border text-[10px] font-extrabold ${pctBadgeClass(
                                  st.annualPct
                                )}`}
                              >
                                {st.annualPct !== null ? `${st.annualPct}%` : '—'}
                              </span>
                            </td>
                          </>
                        )}

                        {period === 'h1' && (
                          <>
                            <td className="py-1.5 px-1.5 border-r border-slate-100">
                              {renderPlanExecPair('q1Plan', 'q1Exec', row.q1Plan, row.q1Exec, liveQFlags.q1, liveQNums.q1)}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-100">
                              {renderPlanExecPair('q2Plan', 'q2Exec', row.q2Plan, row.q2Exec, liveQFlags.q2, liveQNums.q2)}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-blue-950 bg-blue-50/40 border-r border-slate-100 tabular-nums">
                              {st.h1PlanDisplay}
                            </td>
                            <td className="py-1.5 px-2 text-center font-extrabold text-emerald-900 bg-emerald-50/40 border-r border-slate-100 tabular-nums">
                              {st.h1ExecDisplay}
                            </td>
                            <td className="py-1.5 px-2 text-center tabular-nums">
                              <span
                                className={`inline-block px-2 py-0.5 rounded border text-[11px] font-extrabold ${pctBadgeClass(
                                  st.h1Pct
                                )}`}
                              >
                                {st.h1Pct !== null ? `${st.h1Pct}%` : '—'}
                              </span>
                            </td>
                          </>
                        )}

                        {period === 'h2' && (
                          <>
                            <td className="py-1.5 px-1.5 border-r border-slate-100">
                              {renderPlanExecPair('q3Plan', 'q3Exec', row.q3Plan, row.q3Exec, liveQFlags.q3, liveQNums.q3)}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-100">
                              {renderPlanExecPair('q4Plan', 'q4Exec', row.q4Plan, row.q4Exec, liveQFlags.q4, liveQNums.q4)}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-indigo-950 bg-indigo-50/40 border-r border-slate-100 tabular-nums">
                              {st.h2PlanDisplay}
                            </td>
                            <td className="py-1.5 px-2 text-center font-extrabold text-emerald-900 bg-emerald-50/40 border-r border-slate-100 tabular-nums">
                              {st.h2ExecDisplay}
                            </td>
                            <td className="py-1.5 px-2 text-center tabular-nums">
                              <span
                                className={`inline-block px-2 py-0.5 rounded border text-[11px] font-extrabold ${pctBadgeClass(
                                  st.h2Pct
                                )}`}
                              >
                                {st.h2Pct !== null ? `${st.h2Pct}%` : '—'}
                              </span>
                            </td>
                          </>
                        )}

                        {(period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4') && (() => {
                          const pField: keyof ChapelPerformanceAgreementRowValue =
                            period === 'q1'
                              ? 'q1Plan'
                              : period === 'q2'
                              ? 'q2Plan'
                              : period === 'q3'
                              ? 'q3Plan'
                              : 'q4Plan';
                          const eField: keyof ChapelPerformanceAgreementRowValue =
                            period === 'q1'
                              ? 'q1Exec'
                              : period === 'q2'
                              ? 'q2Exec'
                              : period === 'q3'
                              ? 'q3Exec'
                              : 'q4Exec';
                          const qPct =
                            period === 'q1'
                              ? st.q1Pct
                              : period === 'q2'
                              ? st.q2Pct
                              : period === 'q3'
                              ? st.q3Pct
                              : st.q4Pct;
                          return (
                            <>
                              <td className="py-1.5 px-2 border-r border-slate-100">
                                <input
                                  type="text"
                                  value={row[pField] || ''}
                                  disabled={!canEdit}
                                  onChange={(e) =>
                                    handleRowFieldChange(item.code, pField, e.target.value)
                                  }
                                  placeholder={item.isOngoingMarker ? 'x' : '0'}
                                  className="w-full px-2 py-1 text-center text-base sm:text-xs font-bold border border-slate-200 rounded bg-white disabled:bg-slate-50/70 disabled:text-slate-800 disabled:cursor-default text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                                />
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-100 bg-emerald-50/30">
                                <input
                                  type="text"
                                  value={row[eField] || ''}
                                  disabled={!canEdit}
                                  onChange={(e) =>
                                    handleRowFieldChange(item.code, eField, e.target.value)
                                  }
                                  placeholder={item.isOngoingMarker ? '✓' : '0'}
                                  title={
                                    liveQFlags[period as 'q1' | 'q2' | 'q3' | 'q4']
                                      ? t(
                                          `ከቻፕሉ ዕቅድ ክንውን በራስ-ሰር የተወሰደ (${liveQNums[period as 'q1' | 'q2' | 'q3' | 'q4']})`,
                                          `Auto-pulled from Chapel Plan (${liveQNums[period as 'q1' | 'q2' | 'q3' | 'q4']})`
                                        )
                                      : undefined
                                  }
                                  className={`w-full px-2 py-1 text-center text-base sm:text-xs font-extrabold border rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 tabular-nums disabled:cursor-default ${
                                    liveQFlags[period as 'q1' | 'q2' | 'q3' | 'q4']
                                      ? 'border-sky-300 bg-sky-50/70 text-sky-950 disabled:bg-sky-50/70 disabled:text-sky-950'
                                      : 'border-emerald-300 bg-white text-emerald-950 disabled:bg-slate-50/70 disabled:text-emerald-950'
                                  }`}
                                />
                              </td>
                              <td className="py-1.5 px-2 text-center border-r border-slate-100 tabular-nums">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded border text-[11px] font-extrabold ${pctBadgeClass(
                                    qPct
                                  )}`}
                                >
                                  {qPct !== null ? `${qPct}%` : '—'}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-center tabular-nums">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded border text-[11px] font-extrabold ${pctBadgeClass(
                                    st.annualPct
                                  )}`}
                                >
                                  {st.annualPct !== null ? `${st.annualPct}%` : '—'}
                                </span>
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Three-Party Sign-Off Footer */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-800" />
                <span>{t('የሥራ አፈጻጸም ግብ ስምምነት ፊርማዎች (3 ወገን)', 'Performance Agreement Sign-Offs (3 Parties)')}</span>
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                {canEdit
                  ? t('ሁሉም ለውጦች በራስ-ሰር ይቀመጣሉ', 'All changes save automatically')
                  : t('ማየት ብቻ (ኤዲት የተከለከለ)', 'View Only (Editing restricted)')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* 1. Evangelist / Chapel Coordinator */}
              <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-950">
                    {t('1. የወንጌላዊ ስም', '1. Evangelist / Coordinator')}
                  </span>
                  {activeSummary.hasEvangelistSigned && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    {t('የወንጌላዊ ስም', 'Name')}
                  </label>
                  <input
                    type="text"
                    value={activeAgreementData.signOff.evangelistName || ''}
                    disabled={!canEdit}
                    onChange={(e) =>
                      handleSignOffChange({ evangelistName: e.target.value })
                    }
                    placeholder="______________________"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {t('ፊርማ', 'Signature')}
                    </label>
                    <input
                      type="text"
                      value={activeAgreementData.signOff.evangelistSignature || ''}
                      disabled={!canEdit}
                      onChange={(e) =>
                        handleSignOffChange({ evangelistSignature: e.target.value })
                      }
                      placeholder="________"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {t('ቀን', 'Date')}
                    </label>
                    <input
                      type="text"
                      value={activeAgreementData.signOff.evangelistDate || ''}
                      disabled={!canEdit}
                      onChange={(e) =>
                        handleSignOffChange({ evangelistDate: e.target.value })
                      }
                      placeholder="____/____/2019"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Spiritual Sector */}
              <div
                className={`border rounded-xl p-4 space-y-2.5 ${
                  mode === 'spiritual_council'
                    ? 'border-sky-400 bg-sky-50/60 ring-1 ring-sky-200'
                    : 'border-sky-200 bg-sky-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sky-950">
                    {t('2. መንፈሳዊ ዘርፍ', '2. Spiritual Sector')}
                  </span>
                  {activeSummary.hasSpiritualSigned && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    {t('የተወካይ ስም', 'Representative Name')}
                  </label>
                  <input
                    type="text"
                    value={activeAgreementData.signOff.spiritualName || ''}
                    disabled={!canEdit}
                    onChange={(e) =>
                      handleSignOffChange({ spiritualName: e.target.value })
                    }
                    placeholder="______________________"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {t('ፊርማ', 'Signature')}
                    </label>
                    <input
                      type="text"
                      value={activeAgreementData.signOff.spiritualSignature || ''}
                      disabled={!canEdit}
                      onChange={(e) =>
                        handleSignOffChange({ spiritualSignature: e.target.value })
                      }
                      placeholder="________"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {t('ቀን', 'Date')}
                    </label>
                    <input
                      type="text"
                      value={activeAgreementData.signOff.spiritualDate || ''}
                      disabled={!canEdit}
                      onChange={(e) =>
                        handleSignOffChange({ spiritualDate: e.target.value })
                      }
                      placeholder="____/____/2019"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Admin & Finance Sector */}
              <div
                className={`border rounded-xl p-4 space-y-2.5 ${
                  mode === 'admin_finance'
                    ? 'border-teal-400 bg-teal-50/60 ring-1 ring-teal-200'
                    : 'border-teal-200 bg-teal-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-teal-950">
                    {t('3. አስተዳደር ዘርፍ', '3. Admin & Finance Sector')}
                  </span>
                  {activeSummary.hasAdminSigned && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    {t('የተወካይ ስም', 'Representative Name')}
                  </label>
                  <input
                    type="text"
                    value={activeAgreementData.signOff.adminName || ''}
                    disabled={!canEdit}
                    onChange={(e) =>
                      handleSignOffChange({ adminName: e.target.value })
                    }
                    placeholder="______________________"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {t('ፊርማ', 'Signature')}
                    </label>
                    <input
                      type="text"
                      value={activeAgreementData.signOff.adminSignature || ''}
                      disabled={!canEdit}
                      onChange={(e) =>
                        handleSignOffChange({ adminSignature: e.target.value })
                      }
                      placeholder="________"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {t('ቀን', 'Date')}
                    </label>
                    <input
                      type="text"
                      value={activeAgreementData.signOff.adminDate || ''}
                      disabled={!canEdit}
                      onChange={(e) =>
                        handleSignOffChange({ adminDate: e.target.value })
                      }
                      placeholder="____/____/2019"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50/80 disabled:cursor-default text-base sm:text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
