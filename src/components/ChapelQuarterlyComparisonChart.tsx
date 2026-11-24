import React, { useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ArrowUpRight, BarChart3, Target } from 'lucide-react';
import {
  AnnualPlanItem,
  ChapelPerformanceAgreementData,
  ChurchHRRecord
} from '../types';
import {
  PERFORMANCE_AGREEMENT_LEAF_ITEMS,
  computeChapelAgreementSummary,
  ensureChapelAgreementData,
  parseAgreementCellValue,
  resolveAgreementRowsWithChapelPlans
} from '../utils/chapelPerformanceAgreement';
import { getPlanDoneForPeriod, getPlanTargetForPeriod } from '../utils/planParser';
import { useLanguage } from '../context/LanguageContext';
import { ExportPhotoButton } from './ExportPhotoButton';

export type ComparisonQuarterFilter = 'all_quarters' | 'q1' | 'q2' | 'q3' | 'q4';
export type ComparisonChartMode = 'agreement_pct' | 'plan_vs_exec';

interface ChapelQuarterlyComparisonChartProps {
  currentYear: string;
  chapelList: string[];
  chapelPlansMap?: { [chapelName: string]: AnnualPlanItem[] };
  chapelPerformanceAgreements?: {
    [chapelName: string]: { [year: string]: ChapelPerformanceAgreementData };
  };
  hrRecords?: ChurchHRRecord[];
  onOpenAgreements?: () => void;
  onSelectChapel?: (chapelName: string) => void;
}

interface ChapelChartRow {
  chapelName: string;
  shortName: string;
  fullName: string;
  evangelistName: string;
  // Agreement Goal % (0..100 capped)
  q1Pct: number;
  q2Pct: number;
  q3Pct: number;
  q4Pct: number;
  h1Pct: number;
  h2Pct: number;
  annualPct: number;
  // Quantitative Plan vs Execution per quarter
  q1Plan: number;
  q1Exec: number;
  q2Plan: number;
  q2Exec: number;
  q3Plan: number;
  q3Exec: number;
  q4Plan: number;
  q4Exec: number;
  yearPlan: number;
  yearExec: number;
  // Active filter resolved plan/exec/pct
  selectedPlan: number;
  selectedExec: number;
  selectedPct: number;
  executedItemsCount: number;
  totalItems: number;
}

const QUARTER_FILTER_OPTIONS: {
  id: ComparisonQuarterFilter;
  am: string;
  en: string;
}[] = [
  { id: 'all_quarters', am: 'ሁሉም ሩቦች (Q1–Q4)', en: 'All Quarters (Q1–Q4)' },
  { id: 'q1', am: '1ኛ ሩብ', en: 'Q1' },
  { id: 'q2', am: '2ኛ ሩብ', en: 'Q2' },
  { id: 'q3', am: '3ኛ ሩብ', en: 'Q3' },
  { id: 'q4', am: '4ኛ ሩብ', en: 'Q4' }
];

const shortenChapelLabel = (label: string): string =>
  label
    .replace(/\s*ቻፕል$/i, '')
    .replace(/\s*Chapel$/i, '')
    .trim();

export const ChapelQuarterlyComparisonChart: React.FC<
  ChapelQuarterlyComparisonChartProps
> = ({
  currentYear,
  chapelList,
  chapelPlansMap = {},
  chapelPerformanceAgreements = {},
  hrRecords = [],
  onOpenAgreements,
  onSelectChapel
}) => {
  const { t, chapelLabel } = useLanguage();
  const chartExportRef = useRef<HTMLElement | null>(null);
  const [chartMode, setChartMode] = useState<ComparisonChartMode>('agreement_pct');
  const [quarterFilter, setQuarterFilter] =
    useState<ComparisonQuarterFilter>('all_quarters');

  const chartData: ChapelChartRow[] = useMemo(() => {
    return chapelList.map((ch) => {
      const chapelPlans = (chapelPlansMap[ch] || []).filter(
        (p) => !currentYear || !p.year || String(p.year) === String(currentYear)
      );
      const agData = ensureChapelAgreementData(
        chapelPerformanceAgreements[ch]?.[currentYear],
        ch,
        currentYear,
        hrRecords
      );
      const summary = computeChapelAgreementSummary(agData, chapelPlans);
      const { resolvedRows } = resolveAgreementRowsWithChapelPlans(
        agData.rows,
        chapelPlans,
        currentYear
      );

      // Compute quantitative plan vs execution per quarter from live chapelPlans if logged,
      // enriched with agreement target/exec fallback so both match reports accurately.
      const planFromChapel = {
        q1: chapelPlans.reduce((s, p) => s + getPlanTargetForPeriod(p, 'q1'), 0),
        q2: chapelPlans.reduce((s, p) => s + getPlanTargetForPeriod(p, 'q2'), 0),
        q3: chapelPlans.reduce((s, p) => s + getPlanTargetForPeriod(p, 'q3'), 0),
        q4: chapelPlans.reduce((s, p) => s + getPlanTargetForPeriod(p, 'q4'), 0),
        year: chapelPlans.reduce((s, p) => s + getPlanTargetForPeriod(p, 'year'), 0)
      };
      const execFromChapel = {
        q1: chapelPlans.reduce((s, p) => s + getPlanDoneForPeriod(p, 'q1'), 0),
        q2: chapelPlans.reduce((s, p) => s + getPlanDoneForPeriod(p, 'q2'), 0),
        q3: chapelPlans.reduce((s, p) => s + getPlanDoneForPeriod(p, 'q3'), 0),
        q4: chapelPlans.reduce((s, p) => s + getPlanDoneForPeriod(p, 'q4'), 0),
        year: chapelPlans.reduce((s, p) => s + getPlanDoneForPeriod(p, 'year'), 0)
      };

      let agQ1Plan = 0;
      let agQ2Plan = 0;
      let agQ3Plan = 0;
      let agQ4Plan = 0;
      let agQ1Exec = 0;
      let agQ2Exec = 0;
      let agQ3Exec = 0;
      let agQ4Exec = 0;

      PERFORMANCE_AGREEMENT_LEAF_ITEMS.forEach((item) => {
        const r = resolvedRows[item.code];
        if (!r) return;
        const goalN = parseAgreementCellValue(r.annualGoal).numericSum;
        const pq1 = parseAgreementCellValue(r.q1Plan);
        const pq2 = parseAgreementCellValue(r.q2Plan);
        const pq3 = parseAgreementCellValue(r.q3Plan);
        const pq4 = parseAgreementCellValue(r.q4Plan);
        const eq1 = parseAgreementCellValue(r.q1Exec);
        const eq2 = parseAgreementCellValue(r.q2Exec);
        const eq3 = parseAgreementCellValue(r.q3Exec);
        const eq4 = parseAgreementCellValue(r.q4Exec);

        const qPlanVal = (pCell: ReturnType<typeof parseAgreementCellValue>) =>
          pCell.isMarker ? goalN || 1 : pCell.numericSum;
        const qExecVal = (eCell: ReturnType<typeof parseAgreementCellValue>) =>
          eCell.isMarker ? goalN || 1 : eCell.numericSum;

        agQ1Plan += qPlanVal(pq1);
        agQ2Plan += qPlanVal(pq2);
        agQ3Plan += qPlanVal(pq3);
        agQ4Plan += qPlanVal(pq4);
        agQ1Exec += qExecVal(eq1);
        agQ2Exec += qExecVal(eq2);
        agQ3Exec += qExecVal(eq3);
        agQ4Exec += qExecVal(eq4);
      });

      const q1Plan = planFromChapel.q1 > 0 ? planFromChapel.q1 : agQ1Plan;
      const q2Plan = planFromChapel.q2 > 0 ? planFromChapel.q2 : agQ2Plan;
      const q3Plan = planFromChapel.q3 > 0 ? planFromChapel.q3 : agQ3Plan;
      const q4Plan = planFromChapel.q4 > 0 ? planFromChapel.q4 : agQ4Plan;

      const q1Exec = Math.max(execFromChapel.q1, agQ1Exec);
      const q2Exec = Math.max(execFromChapel.q2, agQ2Exec);
      const q3Exec = Math.max(execFromChapel.q3, agQ3Exec);
      const q4Exec = Math.max(execFromChapel.q4, agQ4Exec);

      const yearPlan =
        planFromChapel.year > 0 ? planFromChapel.year : q1Plan + q2Plan + q3Plan + q4Plan;
      const yearExec =
        execFromChapel.year > 0
          ? Math.max(execFromChapel.year, q1Exec + q2Exec + q3Exec + q4Exec)
          : q1Exec + q2Exec + q3Exec + q4Exec;

      const selectedPlan =
        quarterFilter === 'q1'
          ? q1Plan
          : quarterFilter === 'q2'
          ? q2Plan
          : quarterFilter === 'q3'
          ? q3Plan
          : quarterFilter === 'q4'
          ? q4Plan
          : yearPlan;

      const selectedExec =
        quarterFilter === 'q1'
          ? q1Exec
          : quarterFilter === 'q2'
          ? q2Exec
          : quarterFilter === 'q3'
          ? q3Exec
          : quarterFilter === 'q4'
          ? q4Exec
          : yearExec;

      const selectedPct =
        quarterFilter === 'q1'
          ? summary.q1AvgPct
          : quarterFilter === 'q2'
          ? summary.q2AvgPct
          : quarterFilter === 'q3'
          ? summary.q3AvgPct
          : quarterFilter === 'q4'
          ? summary.q4AvgPct
          : summary.annualAvgPct;

      const full = chapelLabel(ch);
      return {
        chapelName: ch,
        shortName: shortenChapelLabel(full),
        fullName: full,
        evangelistName: summary.evangelistName || '',
        q1Pct: summary.q1AvgPct,
        q2Pct: summary.q2AvgPct,
        q3Pct: summary.q3AvgPct,
        q4Pct: summary.q4AvgPct,
        h1Pct: summary.h1AvgPct,
        h2Pct: summary.h2AvgPct,
        annualPct: summary.annualAvgPct,
        q1Plan,
        q1Exec,
        q2Plan,
        q2Exec,
        q3Plan,
        q3Exec,
        q4Plan,
        q4Exec,
        yearPlan,
        yearExec,
        selectedPlan,
        selectedExec,
        selectedPct,
        executedItemsCount: summary.executedItemsCount,
        totalItems: summary.totalItems
      };
    });
  }, [
    chapelList,
    chapelPlansMap,
    chapelPerformanceAgreements,
    currentYear,
    hrRecords,
    quarterFilter,
    chapelLabel
  ]);

  const quarterlyOverview = useMemo(() => {
    const n = Math.max(1, chartData.length);
    const avg = (picker: (r: ChapelChartRow) => number) =>
      Math.round(chartData.reduce((s, r) => s + picker(r), 0) / n);
    const sum = (picker: (r: ChapelChartRow) => number) =>
      chartData.reduce((s, r) => s + picker(r), 0);

    return {
      q1AvgPct: avg((r) => r.q1Pct),
      q2AvgPct: avg((r) => r.q2Pct),
      q3AvgPct: avg((r) => r.q3Pct),
      q4AvgPct: avg((r) => r.q4Pct),
      annualAvgPct: avg((r) => r.annualPct),
      q1Plan: sum((r) => r.q1Plan),
      q1Exec: sum((r) => r.q1Exec),
      q2Plan: sum((r) => r.q2Plan),
      q2Exec: sum((r) => r.q2Exec),
      q3Plan: sum((r) => r.q3Plan),
      q3Exec: sum((r) => r.q3Exec),
      q4Plan: sum((r) => r.q4Plan),
      q4Exec: sum((r) => r.q4Exec),
      hasAnyExecution: chartData.some(
        (r) =>
          r.yearExec > 0 ||
          r.q1Pct > 0 ||
          r.q2Pct > 0 ||
          r.q3Pct > 0 ||
          r.q4Pct > 0 ||
          r.annualPct > 0
      )
    };
  }, [chartData]);

  const renderTooltip = ({
    active,
    payload
  }: {
    active?: boolean;
    payload?: readonly { payload?: ChapelChartRow }[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[240px] space-y-2">
        <div className="border-b border-slate-100 pb-1.5">
          <div className="font-extrabold text-slate-900">{d.fullName}</div>
          <div className="text-[11px] text-slate-500">
            {d.evangelistName
              ? `${t('አገልጋይ', 'Servant')}፦ ${d.evangelistName}`
              : t('የግብ ስምምነት እና ዕቅድ አፈጻጸም', 'Performance Agreement & Plan Execution')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">{t('1ኛ ሩብ', 'Q1')}:</span>
            <span className="font-bold text-blue-900">
              {d.q1Pct}% <span className="text-slate-400 font-normal">({d.q1Exec}/{d.q1Plan})</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">{t('2ኛ ሩብ', 'Q2')}:</span>
            <span className="font-bold text-sky-700">
              {d.q2Pct}% <span className="text-slate-400 font-normal">({d.q2Exec}/{d.q2Plan})</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">{t('3ኛ ሩብ', 'Q3')}:</span>
            <span className="font-bold text-indigo-700">
              {d.q3Pct}% <span className="text-slate-400 font-normal">({d.q3Exec}/{d.q3Plan})</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">{t('4ኛ ሩብ', 'Q4')}:</span>
            <span className="font-bold text-emerald-700">
              {d.q4Pct}% <span className="text-slate-400 font-normal">({d.q4Exec}/{d.q4Plan})</span>
            </span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] tabular-nums">
          <span className="font-bold text-slate-700">
            {t('የዓመቱ ግብ ስምምነት ውጤት', 'Annual Agreement Score')}:
          </span>
          <span className="font-extrabold text-emerald-800">{d.annualPct}%</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
          <span>{t('ጠቅላላ ዕቅድ / ክንውን', 'Total Plan / Exec')}:</span>
          <span className="font-semibold text-slate-800">
            {d.yearPlan.toLocaleString()} / {d.yearExec.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <section
      ref={chartExportRef}
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-slate-900">
            <BarChart3 className="w-4 h-4 text-blue-900 shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              {t(
                `የሁሉም ቻፕሎች (${chapelList.length}) የየሩብ ዓመቱ ዕቅድ እና የግብ ስምምነት አፈጻጸም ማወዳደሪያ (${currentYear} ዓ.ም)`,
                `All ${chapelList.length} Chapels Quarterly Plan & Goal Agreement Comparison (${currentYear})`
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            {t(
              'በሪፖርቶቹ ውስጥ የተመዘገበውን የውጤት ግብ ስምምነት ክንውን እና የየሩብ ዓመቱን ዕቅድ አፈጻጸም (እስከ 100% ጣሪያ) ያነጻጽራል።',
              'Compares quarterly plan volume and recorded Goal Agreement achievement (capped at 100%) across all chapels.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Metric Mode Segmented Control */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setChartMode('agreement_pct')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                chartMode === 'agreement_pct'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {t('የግብ ስምምነት አፈጻጸም (%)', 'Agreement Achievement (%)')}
            </button>
            <button
              type="button"
              onClick={() => setChartMode('plan_vs_exec')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                chartMode === 'plan_vs_exec'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {t('ዕቅድ እና ክንውን (በቁጥር)', 'Plan vs Execution (Count)')}
            </button>
          </div>

          {onOpenAgreements && (
            <button
              type="button"
              onClick={onOpenAgreements}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              <span>{t('የግብ ስምምነት ቅጽ ክፈት', 'Open Agreements')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          <ExportPhotoButton
            targetRef={chartExportRef}
            fileName={`የቻፕሎች_ሩብ_ዓመት_አፈጻጸም_ግራፍ_${currentYear}`}
            variant="compact"
          />
        </div>
      </div>

      {/* Quarter Average Summary Strip (flat cells separated by subtle hairline borders) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/50">
        <div className="p-3">
          <div className="text-[11px] font-semibold text-slate-600">{t('1ኛ ሩብ አማካይ', 'Q1 Avg')}</div>
          <div className="text-lg font-extrabold text-blue-900 tabular-nums mt-0.5">
            {quarterlyOverview.q1AvgPct}%
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            {t('ዕቅድ', 'Plan')} {quarterlyOverview.q1Plan.toLocaleString()} · {t('ክንውን', 'Exec')}{' '}
            {quarterlyOverview.q1Exec.toLocaleString()}
          </div>
        </div>
        <div className="p-3">
          <div className="text-[11px] font-semibold text-slate-600">{t('2ኛ ሩብ አማካይ', 'Q2 Avg')}</div>
          <div className="text-lg font-extrabold text-sky-800 tabular-nums mt-0.5">
            {quarterlyOverview.q2AvgPct}%
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            {t('ዕቅድ', 'Plan')} {quarterlyOverview.q2Plan.toLocaleString()} · {t('ክንውን', 'Exec')}{' '}
            {quarterlyOverview.q2Exec.toLocaleString()}
          </div>
        </div>
        <div className="p-3">
          <div className="text-[11px] font-semibold text-slate-600">{t('3ኛ ሩብ አማካይ', 'Q3 Avg')}</div>
          <div className="text-lg font-extrabold text-indigo-800 tabular-nums mt-0.5">
            {quarterlyOverview.q3AvgPct}%
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            {t('ዕቅድ', 'Plan')} {quarterlyOverview.q3Plan.toLocaleString()} · {t('ክንውን', 'Exec')}{' '}
            {quarterlyOverview.q3Exec.toLocaleString()}
          </div>
        </div>
        <div className="p-3">
          <div className="text-[11px] font-semibold text-slate-600">{t('4ኛ ሩብ አማካይ', 'Q4 Avg')}</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums mt-0.5">
            {quarterlyOverview.q4AvgPct}%
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            {t('ዕቅድ', 'Plan')} {quarterlyOverview.q4Plan.toLocaleString()} · {t('ክንውን', 'Exec')}{' '}
            {quarterlyOverview.q4Exec.toLocaleString()}
          </div>
        </div>
        <div className="p-3 col-span-2 sm:col-span-1 bg-emerald-50/40">
          <div className="text-[11px] font-bold text-emerald-900">
            {t('የዓመቱ አጠቃላይ ውጤት', 'Annual Agreement Avg')}
          </div>
          <div className="text-lg font-extrabold text-emerald-800 tabular-nums mt-0.5">
            {quarterlyOverview.annualAvgPct}%
          </div>
          <div className="text-[11px] text-emerald-800/80 tabular-nums">
            {chapelList.length} {t('ቻፕሎች · 100% ጣሪያ', 'chapels · 100% cap')}
          </div>
        </div>
      </div>

      {/* Quarter Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {QUARTER_FILTER_OPTIONS.map((q) => {
            const active = quarterFilter === q.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuarterFilter(q.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  active
                    ? 'bg-blue-900 text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {t(q.am, q.en)}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-500">
          {chartMode === 'agreement_pct'
            ? t(
                'መለኪያ፦ የውጤት ግብ ስምምነት አፈጻጸም (%) ከ0%–100%',
                'Metric: Performance Goal Agreement Achievement (0%–100%)'
              )
            : t(
                'መለኪያ፦ በተመረጠው ጊዜ ውስጥ የታቀደ ዕቅድ ከተከናወነ ክንውን ጋር',
                'Metric: Planned vs Executed Count for selected period'
              )}
        </div>
      </div>

      {/* Recharts Comparison Viewport */}
      <div className="w-full h-[360px] min-w-0 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'agreement_pct' ? (
            quarterFilter === 'all_quarters' ? (
              <BarChart
                data={chartData}
                margin={{ top: 14, right: 16, left: 0, bottom: 24 }}
                barGap={2}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v: number | string) => `${v}%`}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                <Legend
                  verticalAlign="top"
                  height={32}
                  wrapperStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <ReferenceLine
                  y={100}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  label={{
                    value: t('100% የግብ ጣሪያ', '100% Target'),
                    position: 'insideTopRight',
                    fill: '#047857',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                />
                <Bar
                  dataKey="q1Pct"
                  name={t('1ኛ ሩብ (%)', 'Q1 (%)')}
                  fill="#1e3a8a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  onClick={(entry: { payload?: { chapelName?: string } }) => {
                    const ch = entry?.payload?.chapelName;
                    if (ch && onSelectChapel) onSelectChapel(ch);
                  }}
                  className={onSelectChapel ? 'cursor-pointer' : undefined}
                />
                <Bar
                  dataKey="q2Pct"
                  name={t('2ኛ ሩብ (%)', 'Q2 (%)')}
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  onClick={(entry: { payload?: { chapelName?: string } }) => {
                    const ch = entry?.payload?.chapelName;
                    if (ch && onSelectChapel) onSelectChapel(ch);
                  }}
                  className={onSelectChapel ? 'cursor-pointer' : undefined}
                />
                <Bar
                  dataKey="q3Pct"
                  name={t('3ኛ ሩብ (%)', 'Q3 (%)')}
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  onClick={(entry: { payload?: { chapelName?: string } }) => {
                    const ch = entry?.payload?.chapelName;
                    if (ch && onSelectChapel) onSelectChapel(ch);
                  }}
                  className={onSelectChapel ? 'cursor-pointer' : undefined}
                />
                <Bar
                  dataKey="q4Pct"
                  name={t('4ኛ ሩብ (%)', 'Q4 (%)')}
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  onClick={(entry: { payload?: { chapelName?: string } }) => {
                    const ch = entry?.payload?.chapelName;
                    if (ch && onSelectChapel) onSelectChapel(ch);
                  }}
                  className={onSelectChapel ? 'cursor-pointer' : undefined}
                />
              </BarChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 14, right: 16, left: 0, bottom: 24 }}
                barGap={4}
                barCategoryGap="22%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v: number | string) => `${v}%`}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                <Legend
                  verticalAlign="top"
                  height={32}
                  wrapperStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <ReferenceLine y={100} stroke="#059669" strokeDasharray="4 4" />
                <Bar
                  dataKey="selectedPct"
                  name={t(
                    `${
                      QUARTER_FILTER_OPTIONS.find((o) => o.id === quarterFilter)?.am || ''
                    } ግብ ስምምነት (%)`,
                    `${quarterFilter.toUpperCase()} Agreement (%)`
                  )}
                  fill="#1e3a8a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                  onClick={(entry: { payload?: { chapelName?: string } }) => {
                    const ch = entry?.payload?.chapelName;
                    if (ch && onSelectChapel) onSelectChapel(ch);
                  }}
                  className={onSelectChapel ? 'cursor-pointer' : undefined}
                />
                <Bar
                  dataKey="annualPct"
                  name={t('የዓመቱ አጠቃላይ ውጤት (%)', 'Annual Agreement (%)')}
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                  onClick={(entry: { payload?: { chapelName?: string } }) => {
                    const ch = entry?.payload?.chapelName;
                    if (ch && onSelectChapel) onSelectChapel(ch);
                  }}
                  className={onSelectChapel ? 'cursor-pointer' : undefined}
                />
              </BarChart>
            )
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 14, right: 16, left: 0, bottom: 24 }}
              barGap={4}
              barCategoryGap="22%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={48}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
              <Legend
                verticalAlign="top"
                height={32}
                wrapperStyle={{ fontSize: '12px', fontWeight: 700 }}
              />
              <Bar
                dataKey="selectedPlan"
                name={t('የታቀደ (ዕቅድ)', 'Planned')}
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="selectedExec"
                name={t('የተከናወነ (ክንውን)', 'Executed')}
                fill="#059669"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Empty/Zero Execution Guidance Strip */}
      {!quarterlyOverview.hasAnyExecution && (
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            {t(
              'እስካሁን በቻፕሎች ዕቅድ ወይም የግብ ስምምነት ክንውን አልተመዘገበም፤ ክንውን ሲመዘገብ ግራፉ በየሩብ ዓመቱ በራስ-ሰር ይዘምናል።',
              'No chapel execution is logged yet; once chapels or Spiritual/Admin sectors log execution, the quarterly bars update automatically.'
            )}
          </span>
          {onOpenAgreements && (
            <button
              type="button"
              onClick={onOpenAgreements}
              className="text-blue-900 font-bold hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              {t('ክንውን / ግብ ስምምነት መዝግብ →', 'Log Agreement Execution →')}
            </button>
          )}
        </div>
      )}
    </section>
  );
};
