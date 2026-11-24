import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Building2,
  Church,
  Download,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ChevronsUpDown
} from 'lucide-react';
import {
  AnnualPlanItem,
  DepartmentWorkspaceData,
  MinistrySubmission,
  OrgUnitId
} from '../types';
import { CHURCH_ORG_UNITS, isUnderSpiritualCouncil } from '../constants/churchStructure';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import {
  PLAN_PERIOD_META,
  PlanPeriodKey,
  getPlanDoneForPeriod,
  getPlanTargetForPeriod
} from '../utils/planParser';
import { getPlanYearSpanLabel } from '../utils/planExecutionRollup';
import { useLanguage } from '../context/LanguageContext';
import { ExportPhotoButton } from './ExportPhotoButton';

interface ConsolidatedPlansMatrixProps {
  currentYear: string;
  submissions: MinistrySubmission[];
  departmentDataMap: { [unitId: string]: DepartmentWorkspaceData };
  childrenPlans: AnnualPlanItem[];
  chapelList?: string[];
  /** When true (Admin page), strictly shows ONLY plans/reports approved by Spiritual Council */
  onlyApproved?: boolean;
  /** Optional handler to jump into a specific ministry workspace directly */
  onOpenUnit?: (unitId: OrgUnitId) => void;
}

const PERIOD_OPTIONS: PlanPeriodKey[] = ['year', 'h1', 'h2', 'q1', 'q2', 'q3', 'q4'];

interface AggregatedUnitRow {
  key: string;
  unitId?: OrgUnitId;
  code?: string;
  label: string;
  plans: AnnualPlanItem[];
  plannedTotal: number;
  doneTotal: number;
  pct: number;
  submissionCount: number;
  latestStatus?: MinistrySubmission['status'];
  sourceKind: 'approved' | 'submitted' | 'live' | 'empty';
}

export const ConsolidatedPlansMatrix: React.FC<ConsolidatedPlansMatrixProps> = ({
  currentYear,
  submissions,
  departmentDataMap,
  childrenPlans,
  chapelList = DEFAULT_CHAPELS,
  onlyApproved = false,
  onOpenUnit
}) => {
  const { lang, t, unitName, chapelLabel } = useLanguage();
  const matrixExportRef = useRef<HTMLDivElement | null>(null);
  const [period, setPeriod] = useState<PlanPeriodKey>('year');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const isApprovedStatus = (status?: MinistrySubmission['status']) =>
    status === 'approved_spiritual' ||
    status === 'forwarded_to_admin' ||
    status === 'acknowledged_by_admin';

  const matchesCurrentYear = (p: AnnualPlanItem) =>
    !currentYear || !p.year || p.year === currentYear;

  // Relevant submissions filtered by currentYear (or all if year matches/empty) and approval flag
  const relevantSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (s.type === 'letter') return false;
      if (onlyApproved && !isApprovedStatus(s.status)) return false;
      return !currentYear || !s.year || s.year === currentYear;
    });
  }, [submissions, currentYear, onlyApproved]);

  const computeTotalsForPlans = (planItems: AnnualPlanItem[]) => {
    const plannedTotal = planItems.reduce((sum, p) => sum + getPlanTargetForPeriod(p, period), 0);
    const doneTotal = planItems.reduce((sum, p) => sum + getPlanDoneForPeriod(p, period), 0);
    const pct = plannedTotal > 0 ? Math.round((doneTotal / plannedTotal) * 100) : 0;
    return { plannedTotal, doneTotal, pct };
  };

  // 1. All 10 Chapels consolidated rows
  const chapelRows: AggregatedUnitRow[] = useMemo(() => {
    const chapelsWs = departmentDataMap.chapels_dept?.chapelPlans || {};

    return chapelList.map((chapel) => {
      const chapelSubs = relevantSubmissions
        .filter((s) => s.senderUnitId === 'chapels_dept' && s.senderChapel === chapel)
        .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

      const latestWithPlans = chapelSubs.find((s) => s.attachedPlans && s.attachedPlans.length > 0);
      const liveChapelPlans = (chapelsWs[chapel] || []).filter(matchesCurrentYear);
      const effectivePlans: AnnualPlanItem[] = onlyApproved
        ? latestWithPlans?.attachedPlans || []
        : liveChapelPlans.length > 0
        ? liveChapelPlans
        : latestWithPlans?.attachedPlans || [];

      const { plannedTotal, doneTotal, pct } = computeTotalsForPlans(effectivePlans);
      const latestStatus = chapelSubs[0]?.status;
      const sourceKind: AggregatedUnitRow['sourceKind'] =
        effectivePlans.length === 0
          ? 'empty'
          : isApprovedStatus(latestStatus)
          ? 'approved'
          : chapelSubs.length > 0
          ? 'submitted'
          : 'live';

      return {
        key: `chapel_${chapel}`,
        label: chapelLabel(chapel),
        plans: effectivePlans,
        plannedTotal,
        doneTotal,
        pct,
        submissionCount: chapelSubs.length,
        latestStatus,
        sourceKind
      };
    });
  }, [chapelList, departmentDataMap, relevantSubmissions, period, onlyApproved, chapelLabel, currentYear]);

  const chapelGrandTotal = useMemo(() => {
    const planned = chapelRows.reduce((s, r) => s + r.plannedTotal, 0);
    const done = chapelRows.reduce((s, r) => s + r.doneTotal, 0);
    const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
    return { planned, done, pct };
  }, [chapelRows]);

  // 2. All Spiritual Council Managed Ministries consolidated rows (all sectors under spiritual_council)
  const ministryRows: AggregatedUnitRow[] = useMemo(() => {
    const spiritualUnits = CHURCH_ORG_UNITS.filter((u) => isUnderSpiritualCouncil(u.id));

    return spiritualUnits.map((u) => {
      const unitSubs = relevantSubmissions
        .filter((s) => s.senderUnitId === u.id)
        .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

      let effectivePlans: AnnualPlanItem[] = [];
      const latestWithPlans = unitSubs.find((s) => s.attachedPlans && s.attachedPlans.length > 0);

      if (u.id === 'chapels_dept') {
        effectivePlans = chapelRows.flatMap((cr) => cr.plans);
      } else if (onlyApproved) {
        effectivePlans = latestWithPlans?.attachedPlans || [];
      } else {
        const rawLive =
          u.id === 'children_ministry'
            ? childrenPlans
            : departmentDataMap[u.id]?.plans || [];
        const livePlans = rawLive.filter(matchesCurrentYear);
        effectivePlans = livePlans.length > 0 ? livePlans : latestWithPlans?.attachedPlans || [];
      }

      const { plannedTotal, doneTotal, pct } = computeTotalsForPlans(effectivePlans);
      const latestStatus = unitSubs[0]?.status;
      const sourceKind: AggregatedUnitRow['sourceKind'] =
        effectivePlans.length === 0
          ? 'empty'
          : isApprovedStatus(latestStatus)
          ? 'approved'
          : unitSubs.length > 0
          ? 'submitted'
          : 'live';

      return {
        key: `unit_${u.id}`,
        unitId: u.id,
        code: u.code,
        label: unitName(u.id, u.name),
        plans: effectivePlans,
        plannedTotal,
        doneTotal,
        pct,
        submissionCount: unitSubs.length,
        latestStatus,
        sourceKind
      };
    });
  }, [relevantSubmissions, chapelRows, departmentDataMap, childrenPlans, period, onlyApproved, unitName, currentYear]);

  const ministriesGrandTotal = useMemo(() => {
    const planned = ministryRows.reduce((s, r) => s + r.plannedTotal, 0);
    const done = ministryRows.reduce((s, r) => s + r.doneTotal, 0);
    const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
    const activeCount = ministryRows.filter((r) => r.plans.length > 0).length;
    return { planned, done, pct, activeCount, totalCount: ministryRows.length };
  }, [ministryRows]);

  const allExpandableKeys = useMemo(
    () => [...ministryRows, ...chapelRows].filter((r) => r.plans.length > 0).map((r) => r.key),
    [ministryRows, chapelRows]
  );

  const isAllExpanded =
    allExpandableKeys.length > 0 && allExpandableKeys.every((k) => expandedKeys.has(k));

  const toggleExpandRow = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedKeys(new Set());
    } else {
      setExpandedKeys(new Set(allExpandableKeys));
    }
  };

  const handleExportConsolidatedExcel = () => {
    const wb = XLSX.utils.book_new();
    const pLabel = lang === 'en' ? PLAN_PERIOD_META[period].en : PLAN_PERIOD_META[period].am;
    const yearSpan = getPlanYearSpanLabel(currentYear, lang);

    const ministrySheet = [
      [`በመንፈሳዊ ዘርፍ ስር ያሉ ሁሉም ዘርፎች ዕቅድና ክንውን — ${yearSpan} (${pLabel})`],
      [],
      ['ተ.ቁ', 'ኮድ', 'የአገልግሎት ዘርፍ', 'የተግባራት ብዛት', 'ዕቅድ', 'ክንውን', 'አፈጻጸም (%)', 'የቀረቡ ሰነዶች'],
      ...ministryRows.map((r, i) => [
        i + 1,
        r.code || '',
        r.label,
        r.plans.length,
        r.plannedTotal,
        r.doneTotal,
        `${r.pct}%`,
        r.submissionCount
      ]),
      ['ድምር', '', 'ጠቅላላ የዘርፎች ድምር', '', ministriesGrandTotal.planned, ministriesGrandTotal.done, `${ministriesGrandTotal.pct}%`, '']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ministrySheet), 'ዘርፎች_ማጠቃለያ');

    const chapelSheet = [
      [`የ10ሩም ቻፕሎች የተጠቃለለ ዕቅድና ክንውን — ${yearSpan} (${pLabel})`],
      [],
      ['ተ.ቁ', 'ቻፕል', 'የተግባራት ብዛት', 'ዕቅድ', 'ክንውን', 'አፈጻጸም (%)', 'የቀረቡ ሰነዶች'],
      ...chapelRows.map((r, i) => [i + 1, r.label, r.plans.length, r.plannedTotal, r.doneTotal, `${r.pct}%`, r.submissionCount]),
      ['ድምር', 'የ10ሩም ቻፕሎች ጠቅላላ ድምር', '', chapelGrandTotal.planned, chapelGrandTotal.done, `${chapelGrandTotal.pct}%`, '']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chapelSheet), '10_ቻፕሎች_ማጠቃለያ');

    XLSX.writeFile(wb, `የተጠቃለለ_ዕቅድና_ክንውን_${currentYear}_${period}.xlsx`);
  };

  const renderStatusLabel = (kind: AggregatedUnitRow['sourceKind']) => {
    switch (kind) {
      case 'approved':
        return (
          <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
            {t('የጸደቀ', 'Approved')}
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
            {t('የቀረበ', 'Submitted')}
          </span>
        );
      case 'live':
        return (
          <span className="inline-flex px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
            {t('በዘርፉ የተመዘገበ', 'Live Workspace')}
          </span>
        );
      default:
        return (
          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
            {t('ዕቅድ አልገባም', 'No Plans Yet')}
          </span>
        );
    }
  };

  const renderMatrixTable = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    rows: AggregatedUnitRow[],
    grand: { planned: number; done: number; pct: number },
    grandLabel: string
  ) => (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <th className="py-2.5 px-3 text-left w-8" />
              <th className="py-2.5 px-3 text-left">{t('ስም / ዘርፍ / ቻፕል', 'Unit / Chapel Name')}</th>
              <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Status')}</th>
              <th className="py-2.5 px-3 text-right">{t('ተግባራት', 'Items')}</th>
              <th className="py-2.5 px-3 text-right">{t('ዕቅድ', 'Planned')}</th>
              <th className="py-2.5 px-3 text-right">{t('ክንውን', 'Executed')}</th>
              <th className="py-2.5 px-4 text-right min-w-[115px]">{t('አፈጻጸም (%)', 'Achievement %')}</th>
              <th className="py-2.5 px-3 text-right">{t('ሰነዶች', 'Docs')}</th>
              {onOpenUnit && <th className="py-2.5 px-3 text-right print:hidden">{t('ገጽ', 'Open')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const isExpanded = expandedKeys.has(r.key);
              const clampedPct = Math.min(100, Math.max(0, r.pct));
              return (
                <React.Fragment key={r.key}>
                  <tr
                    onClick={() => r.plans.length > 0 && toggleExpandRow(r.key)}
                    className={`hover:bg-slate-50/80 ${r.plans.length > 0 ? 'cursor-pointer' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-slate-400">
                      {r.plans.length > 0 ? (
                        isExpanded ? <ChevronDown className="w-4 h-4 text-blue-700" /> : <ChevronRight className="w-4 h-4" />
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-extrabold text-slate-900">
                        {r.code ? <span className="text-slate-400 font-semibold mr-1.5">{r.code}</span> : null}
                        {r.label}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{renderStatusLabel(r.sourceKind)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 font-semibold">{r.plans.length}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-blue-900">
                      {r.plannedTotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-extrabold text-emerald-700">
                      {r.doneTotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden sm:block w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              clampedPct >= 80
                                ? 'bg-emerald-600'
                                : clampedPct >= 40
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${clampedPct}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-slate-900 w-9 text-right">{r.pct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">{r.submissionCount}</td>
                    {onOpenUnit && (
                      <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                        {r.unitId ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenUnit(r.unitId!);
                            }}
                            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-800 hover:underline cursor-pointer"
                          >
                            <span>{t('ክፈት', 'Open')}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : null}
                      </td>
                    )}
                  </tr>
                  {isExpanded && r.plans.length > 0 && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={onOpenUnit ? 9 : 8} className="p-3 pl-8 sm:pl-10">
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] border border-slate-200 rounded-lg bg-white overflow-hidden">
                            <thead>
                              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <th className="py-1.5 px-3 text-left">{t('ተግባር', 'Activity')}</th>
                                <th className="py-1.5 px-2 text-left">{t('መለኪያ', 'Unit')}</th>
                                {period === 'year' && (
                                  <>
                                    <th className="py-1.5 px-2 text-right">1ኛ ሩብ</th>
                                    <th className="py-1.5 px-2 text-right">2ኛ ሩብ</th>
                                    <th className="py-1.5 px-2 text-right">3ኛ ሩብ</th>
                                    <th className="py-1.5 px-2 text-right">4ኛ ሩብ</th>
                                  </>
                                )}
                                <th className="py-1.5 px-3 text-right">{t('ዕቅድ', 'Planned')}</th>
                                <th className="py-1.5 px-3 text-right">{t('ክንውን', 'Executed')}</th>
                                <th className="py-1.5 px-3 text-right">%</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {r.plans.map((p, i) => {
                                const tgt = getPlanTargetForPeriod(p, period);
                                const dn = getPlanDoneForPeriod(p, period);
                                const rowPct = tgt > 0 ? Math.round((dn / tgt) * 100) : 0;
                                return (
                                  <tr key={`${r.key}_${p.id}_${i}`}>
                                    <td className="py-1.5 px-3 font-semibold text-slate-800">{p.task}</td>
                                    <td className="py-1.5 px-2 text-slate-500">{p.unit}</td>
                                    {period === 'year' && (
                                      <>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                                          {p.q1Done}/{p.q1Plan}
                                        </td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                                          {p.q2Done}/{p.q2Plan}
                                        </td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                                          {p.q3Done}/{p.q3Plan}
                                        </td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                                          {p.q4Done}/{p.q4Plan}
                                        </td>
                                      </>
                                    )}
                                    <td className="py-1.5 px-3 text-right tabular-nums font-bold">{tgt}</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-700">{dn}</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums font-bold">{rowPct}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-extrabold">
              <td className="py-3 px-3" />
              <td className="py-3 px-3">{grandLabel}</td>
              <td className="py-3 px-3" />
              <td className="py-3 px-3 text-right tabular-nums">—</td>
              <td className="py-3 px-3 text-right tabular-nums">{grand.planned.toLocaleString()}</td>
              <td className="py-3 px-3 text-right tabular-nums text-emerald-300">{grand.done.toLocaleString()}</td>
              <td className="py-3 px-4 text-right tabular-nums text-amber-300">{grand.pct}%</td>
              <td className="py-3 px-3" />
              {onOpenUnit && <td className="py-3 px-3 print:hidden" />}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );

  return (
    <div ref={matrixExportRef} className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {onlyApproved
                ? t('በመንፈሳዊ ዘርፍ የጸደቁ የዘርፎችና የቻፕሎች ዕቅድና ክንውን', 'Spiritual-Approved Plans & Execution Reports (Ministries & Chapels)')
                : t('በመንፈሳዊ ዘርፍ ስር ያሉ ሁሉም ዘርፎች እና 10ሩም ቻፕሎች ዕቅድና ክንውን', 'All Spiritual Ministries & 10 Chapels Consolidated Plans & Execution')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'የዓመት፣ የግማሽ ዓመት እና ከ1ኛ እስከ 4ኛ ሩብ ዓመት የተጠቃለለ ዕቅድና ክንውን — ዝርዝር ተግባራትን ለማየት በረድፉ ላይ ይጫኑ።',
                'Switch between Annual, Half-Year (H1/H2), and Q1–Q4 views; click any row to inspect line-item plans.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {PERIOD_OPTIONS.map((pKey) => (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => setPeriod(pKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    period === pKey ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'en' ? PLAN_PERIOD_META[pKey].shortEn : PLAN_PERIOD_META[pKey].shortAm}
                </button>
              ))}
            </div>

            {allExpandableKeys.length > 0 && (
              <button
                type="button"
                onClick={toggleExpandAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span>
                  {isAllExpanded ? t('ዝርዝር ሰብስብ', 'Collapse All') : t('ሁሉንም ዝርዝር ዘርጋ', 'Expand All')}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportConsolidatedExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>

            <ExportPhotoButton
              targetRef={matrixExportRef}
              fileName={`የመንፈሳዊ_ዘርፍ_እና_ቻፕሎች_ዕቅድ_ክንውን_${currentYear}_${period}`}
            />
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-500">
              {t('የመንፈሳዊ ዘርፎች ብዛት', 'Spiritual Sectors')}
            </div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5 tabular-nums">
              {ministriesGrandTotal.totalCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {t('ዕቅድ ያስገቡ፦', 'With Plans:')} {ministriesGrandTotal.activeCount}
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-blue-800">
              {t('ጠቅላላ ዕቅድ', 'Total Planned')}
            </div>
            <div className="text-lg font-extrabold text-blue-950 mt-0.5 tabular-nums">
              {ministriesGrandTotal.planned.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-blue-700">
              {lang === 'en' ? PLAN_PERIOD_META[period].shortEn : PLAN_PERIOD_META[period].shortAm}
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-emerald-800">
              {t('ጠቅላላ ክንውን', 'Total Executed')}
            </div>
            <div className="text-lg font-extrabold text-emerald-900 mt-0.5 tabular-nums">
              {ministriesGrandTotal.done.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700">
              {t('ሁሉም ዘርፎች ድምር', 'All Sectors Combined')}
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-amber-800">
              {t('አጠቃላይ አፈጻጸም (%)', 'Overall Achievement')}
            </div>
            <div className="text-lg font-extrabold text-amber-950 mt-0.5 tabular-nums">
              {ministriesGrandTotal.pct}%
            </div>
            <div className="text-[11px] font-semibold text-amber-800">
              {getPlanYearSpanLabel(currentYear, lang)}
            </div>
          </div>
        </div>
      </section>

      {renderMatrixTable(
        t('በመንፈሳዊ ዘርፍ ስር ያሉ ሁሉም አገልግሎቶች ዕቅድና ክንውን', 'All Spiritual Council Ministries Consolidated Plans & Execution'),
        t(
          'በመንፈሳዊ ዘርፍ የሚተዳደሩ ዘርፎች በሙሉ (የወጣቶች እና የልጆች ልማት ኢት 1004ን ጨምሮ) ዕቅዳቸውና ክንውናቸው በአንድ እይታ',
          'Consolidated plans and execution across every ministry under the Spiritual Sector Council'
        ),
        <Building2 className="w-4 h-4 text-sky-700" />,
        ministryRows,
        ministriesGrandTotal,
        t('የሁሉም መንፈሳዊ ዘርፎች ጠቅላላ ድምር', 'All Spiritual Ministries Grand Total')
      )}

      {renderMatrixTable(
        t('የ10ሩም ቻፕሎች ዕቅድና ክንውን በአንድ ላይ', 'All 10 Chapels Consolidated Plans & Execution'),
        t(
          'እያንዳንዱ ቻፕል በስሙ የሚያስገባውና የሚልከው ዕቅድና ክንውን በአንድ ላይ ተጠቃልሎ',
          'Plans and execution across each chapel plus combined total across all 10 chapels'
        ),
        <Church className="w-4 h-4 text-amber-700" />,
        chapelRows,
        chapelGrandTotal,
        t('የ10ሩም ቻፕሎች ጠቅላላ ድምር', 'All 10 Chapels Grand Total')
      )}
    </div>
  );
};

