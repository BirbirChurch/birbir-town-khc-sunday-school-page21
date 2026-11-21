import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Building2, Church, Download, ChevronDown, ChevronRight } from 'lucide-react';
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
import { useLanguage } from '../context/LanguageContext';

interface ConsolidatedPlansMatrixProps {
  currentYear: string;
  submissions: MinistrySubmission[];
  departmentDataMap: { [unitId: string]: DepartmentWorkspaceData };
  childrenPlans: AnnualPlanItem[];
  chapelList?: string[];
  /** When true (Admin page), strictly shows ONLY plans/reports approved by Spiritual Council */
  onlyApproved?: boolean;
}

const PERIOD_OPTIONS: PlanPeriodKey[] = ['year', 'h1', 'h2', 'q1', 'q2', 'q3', 'q4'];

interface AggregatedUnitRow {
  key: string;
  label: string;
  subLabel?: string;
  plans: AnnualPlanItem[];
  plannedTotal: number;
  doneTotal: number;
  pct: number;
  submissionCount: number;
  latestStatus?: string;
}

export const ConsolidatedPlansMatrix: React.FC<ConsolidatedPlansMatrixProps> = ({
  currentYear,
  submissions,
  departmentDataMap,
  childrenPlans,
  chapelList = DEFAULT_CHAPELS,
  onlyApproved = false
}) => {
  const { lang, t, unitName, chapelLabel } = useLanguage();
  const [period, setPeriod] = useState<PlanPeriodKey>('year');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const isApprovedStatus = (status: MinistrySubmission['status']) =>
    status === 'approved_spiritual' ||
    status === 'forwarded_to_admin' ||
    status === 'acknowledged_by_admin';

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

      // Prefer latest submitted/approved structured plan snapshot, fallback to live chapelPlans (when not strictly admin onlyApproved)
      const latestWithPlans = chapelSubs.find((s) => s.attachedPlans && s.attachedPlans.length > 0);
      const effectivePlans: AnnualPlanItem[] =
        latestWithPlans?.attachedPlans || (!onlyApproved ? chapelsWs[chapel] || [] : []);

      const { plannedTotal, doneTotal, pct } = computeTotalsForPlans(effectivePlans);

      return {
        key: `chapel_${chapel}`,
        label: chapelLabel(chapel),
        plans: effectivePlans,
        plannedTotal,
        doneTotal,
        pct,
        submissionCount: chapelSubs.length,
        latestStatus: chapelSubs[0]?.status
      };
    });
  }, [chapelList, departmentDataMap, relevantSubmissions, period, onlyApproved, chapelLabel]);

  const chapelGrandTotal = useMemo(() => {
    const planned = chapelRows.reduce((s, r) => s + r.plannedTotal, 0);
    const done = chapelRows.reduce((s, r) => s + r.doneTotal, 0);
    const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
    return { planned, done, pct };
  }, [chapelRows]);

  // 2. All Spiritual Council Managed Ministries consolidated rows
  const ministryRows: AggregatedUnitRow[] = useMemo(() => {
    const spiritualUnits = CHURCH_ORG_UNITS.filter((u) => isUnderSpiritualCouncil(u.id));

    return spiritualUnits.map((u) => {
      const unitSubs = relevantSubmissions
        .filter((s) => s.senderUnitId === u.id)
        .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

      let effectivePlans: AnnualPlanItem[] = [];

      if (u.id === 'chapels_dept') {
        // Combine all 10 chapels' effective plans
        effectivePlans = chapelRows.flatMap((cr) => cr.plans);
      } else {
        const latestWithPlans = unitSubs.find((s) => s.attachedPlans && s.attachedPlans.length > 0);
        if (latestWithPlans?.attachedPlans) {
          effectivePlans = latestWithPlans.attachedPlans;
        } else if (!onlyApproved) {
          effectivePlans =
            u.id === 'children_ministry'
              ? childrenPlans
              : departmentDataMap[u.id]?.plans || [];
        }
      }

      const { plannedTotal, doneTotal, pct } = computeTotalsForPlans(effectivePlans);

      return {
        key: `unit_${u.id}`,
        label: unitName(u.id, u.name),
        plans: effectivePlans,
        plannedTotal,
        doneTotal,
        pct,
        submissionCount: unitSubs.length,
        latestStatus: unitSubs[0]?.status
      };
    });
  }, [relevantSubmissions, chapelRows, departmentDataMap, childrenPlans, period, onlyApproved, unitName]);

  const ministriesGrandTotal = useMemo(() => {
    const planned = ministryRows.reduce((s, r) => s + r.plannedTotal, 0);
    const done = ministryRows.reduce((s, r) => s + r.doneTotal, 0);
    const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
    return { planned, done, pct };
  }, [ministryRows]);

  const handleExportConsolidatedExcel = () => {
    const wb = XLSX.utils.book_new();
    const pLabel = lang === 'en' ? PLAN_PERIOD_META[period].en : PLAN_PERIOD_META[period].am;

    const chapelSheet = [
      [`የ10ሩም ቻፕሎች የተጠቃለለ ዕቅድና ክንውን — ${currentYear} (${pLabel})`],
      [],
      ['ተ.ቁ', 'ቻፕል', 'የተግባራት ብዛት', 'ዕቅድ', 'ክንውን', 'አፈጻጸም (%)', 'የቀረቡ ሰነዶች'],
      ...chapelRows.map((r, i) => [i + 1, r.label, r.plans.length, r.plannedTotal, r.doneTotal, `${r.pct}%`, r.submissionCount]),
      ['ድምር', 'የ10ሩም ቻፕሎች ጠቅላላ ድምር', '', chapelGrandTotal.planned, chapelGrandTotal.done, `${chapelGrandTotal.pct}%`, '']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chapelSheet), '10_ቻፕሎች_ማጠቃለያ');

    const ministrySheet = [
      [`የመንፈሳዊ ዘርፍ አገልግሎቶች የተጠቃለለ ዕቅድና ክንውን — ${currentYear} (${pLabel})`],
      [],
      ['ተ.ቁ', 'የአገልግሎት ዘርፍ', 'የተግባራት ብዛት', 'ዕቅድ', 'ክንውን', 'አፈጻጸም (%)', 'የቀረቡ ሰነዶች'],
      ...ministryRows.map((r, i) => [i + 1, r.label, r.plans.length, r.plannedTotal, r.doneTotal, `${r.pct}%`, r.submissionCount]),
      ['ድምር', 'ጠቅላላ የዘርፎች ድምር', '', ministriesGrandTotal.planned, ministriesGrandTotal.done, `${ministriesGrandTotal.pct}%`, '']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ministrySheet), 'ዘርፎች_ማጠቃለያ');

    XLSX.writeFile(wb, `የተጠቃለለ_ዕቅድና_ክንውን_${currentYear}_${period}.xlsx`);
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
              <th className="py-2.5 px-4 text-left w-8" />
              <th className="py-2.5 px-4 text-left">{t('ስም / ዘርፍ / ቻፕል', 'Unit / Chapel Name')}</th>
              <th className="py-2.5 px-3 text-right">{t('የተግባራት ብዛት', 'Plan Items')}</th>
              <th className="py-2.5 px-4 text-right">{t('ዕቅድ', 'Planned')}</th>
              <th className="py-2.5 px-4 text-right">{t('ክንውን', 'Executed')}</th>
              <th className="py-2.5 px-4 text-right">{t('አፈጻጸም (%)', 'Achievement %')}</th>
              <th className="py-2.5 px-4 text-right">{t('የተላኩ ሰነዶች', 'Submissions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const isExpanded = expandedKey === r.key;
              return (
                <React.Fragment key={r.key}>
                  <tr
                    onClick={() => setExpandedKey(isExpanded ? null : r.key)}
                    className="hover:bg-slate-50/80 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 text-slate-400">
                      {r.plans.length > 0 ? (
                        isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                      ) : null}
                    </td>
                    <td className="py-2.5 px-4 font-extrabold text-slate-900">{r.label}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">{r.plans.length}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-bold text-blue-900">
                      {r.plannedTotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-extrabold text-emerald-700">
                      {r.doneTotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-extrabold text-slate-900">
                      {r.pct}%
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">{r.submissionCount}</td>
                  </tr>
                  {isExpanded && r.plans.length > 0 && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={7} className="p-3 pl-10">
                        <table className="w-full text-[11px] border border-slate-200 rounded-lg bg-white overflow-hidden">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                              <th className="py-1.5 px-3 text-left">{t('ተግባር', 'Activity')}</th>
                              <th className="py-1.5 px-2 text-left">{t('መለኪያ', 'Unit')}</th>
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
                                  <td className="py-1.5 px-3 text-right tabular-nums font-bold">{tgt}</td>
                                  <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-700">{dn}</td>
                                  <td className="py-1.5 px-3 text-right tabular-nums font-bold">{rowPct}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-extrabold">
              <td className="py-3 px-4" />
              <td className="py-3 px-4">{grandLabel}</td>
              <td className="py-3 px-3 text-right tabular-nums">—</td>
              <td className="py-3 px-4 text-right tabular-nums">{grand.planned.toLocaleString()}</td>
              <td className="py-3 px-4 text-right tabular-nums text-emerald-300">{grand.done.toLocaleString()}</td>
              <td className="py-3 px-4 text-right tabular-nums text-amber-300">{grand.pct}%</td>
              <td className="py-3 px-4" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            {onlyApproved
              ? t('በመንፈሳዊ ዘርፍ የጸደቁ የቻፕሎችና የዘርፎች ዕቅድና ክንውን', 'Spiritual-Approved Plans & Execution Reports (Chapels & Ministries)')
              : t('የ10ሩም ቻፕሎች እና የመንፈሳዊ ዘርፍ አገልግሎቶች የተጠቃለለ ዕቅድና ክንውን', 'Consolidated Plans & Execution Across All 10 Chapels & Spiritual Ministries')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              'የዓመት፣ የግማሽ ዓመት እና ከ1ኛ እስከ 4ኛ ሩብ ዓመት የተጠቃለለ ዕቅድና ክንውን — ዝርዝር ለማየት ከረድፉ ላይ ይጫኑ።',
              'Switch between Annual, Half-Year (H1/H2), and Q1–Q4 views; click any row to inspect line-item plans.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <button
            type="button"
            onClick={handleExportConsolidatedExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('Excel አውርድ', 'Export Excel')}</span>
          </button>
        </div>
      </section>

      {renderMatrixTable(
        t('የ10ሩም ቻፕሎች ዕቅድና ክንውን በአንድ ላይ', 'All 10 Chapels Consolidated Plans & Execution'),
        t(
          'እያንዳንዱ ቻፕል በስሙ የሚልከው ዕቅድና ክንውን በአንድ ላይ ተጠቃልሎ',
          'Plans and execution submitted under each chapel name plus combined total across all 10 chapels'
        ),
        <Church className="w-4 h-4 text-amber-700" />,
        chapelRows,
        chapelGrandTotal,
        t('የ10ሩም ቻፕሎች ጠቅላላ ድምር', 'All 10 Chapels Grand Total')
      )}

      {renderMatrixTable(
        t('በመንፈሳዊ ዘርፍ ስር ያሉ ሁሉም አገልግሎቶች ዕቅድና ክንውን', 'All Spiritual Council Ministries Consolidated Plans & Execution'),
        t(
          'በመንፈሳዊ ዘርፍ የሚተዳደሩ ዘርፎች በሙሉ ዕቅዳቸውና ክንውናቸው በአንድ እይታ',
          'Consolidated plans and execution across every ministry under the Spiritual Sector Council'
        ),
        <Building2 className="w-4 h-4 text-sky-700" />,
        ministryRows,
        ministriesGrandTotal,
        t('የሁሉም መንፈሳዊ ዘርፎች ጠቅላላ ድምር', 'All Spiritual Ministries Grand Total')
      )}
    </div>
  );
};
