import React, { Suspense, useMemo, useState } from 'react';
import { LazyErrorBoundary, lazyWithRetry } from './LazyBoundary';
import * as XLSX from 'xlsx';
import {
  Target,
  Plus,
  Upload,
  Download,
  Printer,
  Trash2,
  Edit2,
  TrendingUp,
  Send,
  CheckCircle2,
  X,
  FileSpreadsheet,
  BarChart3,
  Loader2
} from 'lucide-react';
import { AnnualPlanItem, MinistrySubmission, OrgUnitId, PlanDispatchItem, SubmissionType } from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import {
  PLAN_PERIOD_META,
  PlanPeriodKey,
  buildPlanPeriodSummaryText,
  ensureQuartersOnPlan,
  generateNextYearPlans,
  getPlanDoneForPeriod,
  getPlanTargetForPeriod,
  parseAnnualPlanFile,
  splitAnnualAcrossQuarters
} from '../utils/planParser';
import { useLanguage } from '../context/LanguageContext';

const PlanSectorReceiverPanel = lazyWithRetry(() =>
  import('./PlanDispatchPanel').then((m) => ({ default: m.PlanSectorReceiverPanel }))
);

interface UnifiedPlanManagerProps {
  unitId: OrgUnitId;
  unitName: string;
  currentYear: string;
  plans: AnnualPlanItem[];
  chapelName?: string | null;
  onSavePlans: (plans: AnnualPlanItem[]) => void;
  onSendToSpiritual?: (
    payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>
  ) => void;
  planDispatches?: PlanDispatchItem[];
  onAcceptDispatch?: (dispatchId: number, mode: 'append' | 'replace') => void;
  onReturnDispatch?: (dispatchId: number, note: string) => void;
}

const PERIOD_TABS: PlanPeriodKey[] = ['year', 'h1', 'h2', 'q1', 'q2', 'q3', 'q4'];

export const UnifiedPlanManager: React.FC<UnifiedPlanManagerProps> = ({
  unitId,
  unitName,
  currentYear,
  plans,
  chapelName = null,
  onSavePlans,
  onSendToSpiritual,
  planDispatches = [],
  onAcceptDispatch,
  onReturnDispatch
}) => {
  const { lang, t } = useLanguage();
  const [workMode, setWorkMode] = useState<'plan' | 'execution'>('plan');
  const [period, setPeriod] = useState<PlanPeriodKey>('year');
  const [isImporting, setIsImporting] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pTask, setPTask] = useState('');
  const [pUnit, setPUnit] = useState('በቁጥር');
  const [pYearPlan, setPYearPlan] = useState('4');
  const [pQ1Plan, setPQ1Plan] = useState('1');
  const [pQ2Plan, setPQ2Plan] = useState('1');
  const [pQ3Plan, setPQ3Plan] = useState('1');
  const [pQ4Plan, setPQ4Plan] = useState('1');
  const [pQ1Done, setPQ1Done] = useState('0');
  const [pQ2Done, setPQ2Done] = useState('0');
  const [pQ3Done, setPQ3Done] = useState('0');
  const [pQ4Done, setPQ4Done] = useState('0');
  const [pRole, setPRole] = useState(chapelName || unitName);

  // Next-year Growth Generator Modal (+10% / +15% / +20%)
  const [isGrowthOpen, setIsGrowthOpen] = useState(false);
  const [growthRate, setGrowthRate] = useState<10 | 15 | 20>(10);
  const [selectedGrowthIds, setSelectedGrowthIds] = useState<Set<number>>(new Set());

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(''), 5500);
  };

  const normalizedPlans = useMemo(() => plans.map(ensureQuartersOnPlan), [plans]);

  const totals = useMemo(() => {
    const target = normalizedPlans.reduce((s, p) => s + getPlanTargetForPeriod(p, period), 0);
    const done = normalizedPlans.reduce((s, p) => s + getPlanDoneForPeriod(p, period), 0);
    const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
    return { target, done, pct };
  }, [normalizedPlans, period]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const parsed = await parseAnnualPlanFile(file, chapelName || unitName, currentYear);
      if (parsed.length === 0) {
        showNotice(
          t(
            'ከተጫነው ፋይል የዕቅድ መስመሮች ማግኘት አልተቻለም። እባክዎ የፋይሉን ቅርጽ ያረጋግጡ።',
            'Could not extract plan rows from that file. Please verify the file layout.'
          )
        );
      } else {
        const replaceExisting =
          normalizedPlans.length > 0
            ? window.confirm(
                t(
                  `${parsed.length} የዕቅድ ተግባራት ተገኝተዋል። አሁን ባለው ላይ መጨመር (Cancel) ወይስ በአዲሱ መተካት (OK) ይፈልጋሉ?`,
                  `Found ${parsed.length} plan rows. Press OK to replace existing plans, or Cancel to append.`
                )
              )
            : true;
        onSavePlans(replaceExisting ? parsed : [...normalizedPlans, ...parsed]);
        showNotice(
          t(
            `✓ ${parsed.length} የዓመት ዕቅድ ተግባራት ከ "${file.name}" ተጭነው ወደ ግማሽ ዓመትና 4ቱም ሩብ ዓመታት ተከፋፍለዋል!`,
            `✓ Imported ${parsed.length} plan items from "${file.name}" and split them across Half-Years and Quarters!`
          )
        );
      }
    } catch {
      showNotice(
        t('ፋይሉን በማንበብ ላይ ችግር አጋጥሟል። Excel, PDF ወይም Word (.docx) ይሞክሩ።', 'Failed to read file. Try Excel, PDF, or Word (.docx).')
      );
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setPTask('');
    setPUnit('በቁጥር');
    setPYearPlan('4');
    setPQ1Plan('1');
    setPQ2Plan('1');
    setPQ3Plan('1');
    setPQ4Plan('1');
    setPQ1Done('0');
    setPQ2Done('0');
    setPQ3Done('0');
    setPQ4Done('0');
    setPRole(chapelName || unitName);
    setIsModalOpen(true);
  };

  const openEdit = (p: AnnualPlanItem) => {
    setEditingId(p.id);
    setPTask(p.task);
    setPUnit(p.unit);
    setPYearPlan(String(p.yearPlan));
    setPQ1Plan(String(p.q1Plan));
    setPQ2Plan(String(p.q2Plan));
    setPQ3Plan(String(p.q3Plan));
    setPQ4Plan(String(p.q4Plan));
    setPQ1Done(String(p.q1Done));
    setPQ2Done(String(p.q2Done));
    setPQ3Done(String(p.q3Done));
    setPQ4Done(String(p.q4Done));
    setPRole(p.role);
    setIsModalOpen(true);
  };

  const handleAutoSplitYear = (valStr: string) => {
    setPYearPlan(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0 && !editingId) {
      const [q1, q2, q3, q4] = splitAnnualAcrossQuarters(num);
      setPQ1Plan(String(q1));
      setPQ2Plan(String(q2));
      setPQ3Plan(String(q3));
      setPQ4Plan(String(q4));
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTask.trim()) return;
    const item: AnnualPlanItem = {
      id: editingId ?? generateUniqueId(),
      year: currentYear,
      task: pTask.trim(),
      unit: pUnit.trim() || 'በቁጥር',
      yearPlan: Number(pYearPlan) || 0,
      q1Plan: Number(pQ1Plan) || 0,
      q2Plan: Number(pQ2Plan) || 0,
      q3Plan: Number(pQ3Plan) || 0,
      q4Plan: Number(pQ4Plan) || 0,
      q1Done: Number(pQ1Done) || 0,
      q2Done: Number(pQ2Done) || 0,
      q3Done: Number(pQ3Done) || 0,
      q4Done: Number(pQ4Done) || 0,
      role: pRole.trim() || chapelName || unitName
    };

    const next = editingId
      ? normalizedPlans.map((p) => (p.id === editingId ? item : p))
      : [...normalizedPlans, item];
    onSavePlans(next);
    setIsModalOpen(false);
  };

  const handleInlineExecutionUpdate = (p: AnnualPlanItem, quarterField: 'q1Done' | 'q2Done' | 'q3Done' | 'q4Done', value: string) => {
    const num = Math.max(0, parseFloat(value) || 0);
    onSavePlans(
      normalizedPlans.map((item) => (item.id === p.id ? { ...item, [quarterField]: num } : item))
    );
  };

  const handleInlinePeriodTargetUpdate = (p: AnnualPlanItem, valStr: string) => {
    const num = Math.max(0, parseFloat(valStr) || 0);
    onSavePlans(
      normalizedPlans.map((item) => {
        if (item.id !== p.id) return item;
        if (period === 'year') {
          const [q1, q2, q3, q4] = splitAnnualAcrossQuarters(num);
          return { ...item, yearPlan: num, q1Plan: q1, q2Plan: q2, q3Plan: q3, q4Plan: q4 };
        }
        if (period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4') {
          const key = `${period}Plan` as 'q1Plan' | 'q2Plan' | 'q3Plan' | 'q4Plan';
          const updated = { ...item, [key]: num };
          const totalY =
            (Number(updated.q1Plan) || 0) +
            (Number(updated.q2Plan) || 0) +
            (Number(updated.q3Plan) || 0) +
            (Number(updated.q4Plan) || 0);
          return { ...updated, yearPlan: totalY };
        }
        return item;
      })
    );
  };

  const handleDelete = (id: number) => {
    if (!window.confirm(t('ይህን የዕቅድ ዝርዝር መሰረዝ ይፈልጋሉ?', 'Delete this plan item?'))) return;
    onSavePlans(normalizedPlans.filter((p) => p.id !== id));
  };

  const openGrowthGenerator = () => {
    setSelectedGrowthIds(new Set(normalizedPlans.map((p) => p.id)));
    setGrowthRate(10);
    setIsGrowthOpen(true);
  };

  const growthPreviewItems = useMemo(
    () => generateNextYearPlans(normalizedPlans, selectedGrowthIds, growthRate),
    [normalizedPlans, selectedGrowthIds, growthRate]
  );

  const handleApplyGrowth = (mode: 'replace' | 'append' | 'excel' | 'send') => {
    if (growthPreviewItems.length === 0) return;
    const nextYear = String((parseInt(currentYear, 10) || 2019) + 1);

    if (mode === 'excel') {
      const wb = XLSX.utils.book_new();
      const rows = [
        [`${chapelName || unitName} — የ${nextYear} ዓ/ም ዕቅድ (+${growthRate}% እድገት)`],
        [],
        ['ተ.ቁ', 'ዋና ተግባር', 'መለኪያ', 'የዓመት ዕቅድ', '1ኛ ሩብ', '2ኛ ሩብ', '3ኛ ሩብ', '4ኛ ሩብ', 'ኃላፊ'],
        ...growthPreviewItems.map((it, i) => [
          i + 1,
          it.task,
          it.unit,
          it.yearPlan,
          it.q1Plan,
          it.q2Plan,
          it.q3Plan,
          it.q4Plan,
          it.role
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'የቀጣይ_ዓመት_ዕቅድ');
      XLSX.writeFile(wb, `${chapelName || unitName}_${nextYear}_Plan_+${growthRate}pct.xlsx`);
      showNotice(t(`✓ የ${nextYear} ዓ/ም (+${growthRate}%) ዕቅድ በExcel ወርዷል።`, `✓ Exported ${nextYear} (+${growthRate}%) plan to Excel.`));
      return;
    }

    if (mode === 'send' && onSendToSpiritual) {
      const summary = buildPlanPeriodSummaryText(
        growthPreviewItems,
        chapelName || unitName,
        nextYear,
        'year',
        'plan',
        lang
      );
      onSendToSpiritual({
        type: 'plan',
        title: `${chapelName || unitName} — የ${nextYear} ዓ/ም ዕቅድ (+${growthRate}%)`,
        year: nextYear,
        period: PLAN_PERIOD_META.year.am,
        periodCode: 'year',
        content: summary,
        senderUnitId: unitId,
        senderUnitName: unitName,
        senderChapel: chapelName || undefined,
        attachedPlans: growthPreviewItems
      });
      setIsGrowthOpen(false);
      showNotice(t(`✓ የ${nextYear} ዓ/ም (+${growthRate}%) ዕቅድ ለመንፈሳዊ ዘርፍ ተልኳል!`, `✓ ${nextYear} (+${growthRate}%) plan sent to Spiritual Council!`));
      return;
    }

    onSavePlans(
      mode === 'replace' ? growthPreviewItems : [...normalizedPlans, ...growthPreviewItems]
    );
    setIsGrowthOpen(false);
    showNotice(
      t(
        `✓ ${growthPreviewItems.length} ዕቅዶች በ+${growthRate}% አድገው ተዘጋጅተዋል።`,
        `✓ Generated ${growthPreviewItems.length} plans scaled by +${growthRate}%.`
      )
    );
  };

  const handleExportCurrentPeriodExcel = () => {
    const wb = XLSX.utils.book_new();
    const pMeta = PLAN_PERIOD_META[period];
    const rows = [
      [`${chapelName || unitName} — ${currentYear} ዓ/ም (${lang === 'en' ? pMeta.en : pMeta.am})`],
      [],
      ['ተ.ቁ', 'ዋና ተግባር', 'መለኪያ', 'የዓመት ዕቅድ', 'የወቅቱ ዕቅድ', 'የወቅቱ ክንውን', 'አፈጻጸም (%)', '1ኛ ሩብ (ዕ/ክ)', '2ኛ ሩብ (ዕ/ክ)', '3ኛ ሩብ (ዕ/ክ)', '4ኛ ሩብ (ዕ/ክ)', 'ኃላፊ'],
      ...normalizedPlans.map((p, i) => {
        const tgt = getPlanTargetForPeriod(p, period);
        const dn = getPlanDoneForPeriod(p, period);
        const pct = tgt > 0 ? Math.round((dn / tgt) * 100) : 0;
        return [
          i + 1,
          p.task,
          p.unit,
          p.yearPlan,
          tgt,
          dn,
          `${pct}%`,
          `${p.q1Plan}/${p.q1Done}`,
          `${p.q2Plan}/${p.q2Done}`,
          `${p.q3Plan}/${p.q3Done}`,
          `${p.q4Plan}/${p.q4Done}`,
          p.role
        ];
      })
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'ዕቅድና_ክንውን');
    XLSX.writeFile(wb, `${chapelName || unitName}_${currentYear}_${period}.xlsx`);
  };

  const handleSendCurrentToSpiritual = () => {
    if (!onSendToSpiritual || normalizedPlans.length === 0) return;
    const subType: SubmissionType = workMode === 'execution' ? 'report' : 'plan';
    const pLabel = lang === 'en' ? PLAN_PERIOD_META[period].en : PLAN_PERIOD_META[period].am;
    const content = buildPlanPeriodSummaryText(
      normalizedPlans,
      chapelName || unitName,
      currentYear,
      period,
      workMode,
      lang
    );

    onSendToSpiritual({
      type: subType,
      title: `${chapelName || unitName} — ${currentYear} (${pLabel}) ${
        workMode === 'execution' ? t('የክንውን ሪፖርት', 'Execution Report') : t('ዕቅድ', 'Action Plan')
      }`,
      year: currentYear,
      period: PLAN_PERIOD_META[period].am,
      periodCode: period,
      content,
      senderUnitId: unitId,
      senderUnitName: unitName,
      senderChapel: chapelName || undefined,
      attachedPlans: normalizedPlans
    });
    showNotice(
      t(
        `✓ የ${pLabel} ${workMode === 'execution' ? 'የክንውን ሪፖርት' : 'ዕቅድ'} ለመንፈሳዊ ዘርፍ ተልኳል!`,
        `✓ Sent ${pLabel} ${workMode === 'execution' ? 'execution report' : 'plan'} to Spiritual Council!`
      )
    );
  };

  return (
    <div className="space-y-4">
      {onAcceptDispatch && (
        <LazyErrorBoundary compact>
        <Suspense fallback={null}>
          <PlanSectorReceiverPanel
            unitId={unitId}
            unitName={unitName}
            chapelName={chapelName}
            currentYear={currentYear}
            dispatches={planDispatches}
            onAcceptDispatch={onAcceptDispatch}
            onReturnDispatch={onReturnDispatch}
          />
        </Suspense>
        </LazyErrorBoundary>
      )}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-800" />
              <span>
                {chapelName || unitName} — {currentYear} {t('ዓ/ም ዕቅድና ክንውን ማዘጋጃ', 'Annual Plan & Execution Workbench')}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'ዓመታዊ ዕቅድን ከExcel፣ PDF ወይም Word በመጫን ወደ ግማሽ ዓመትና 4ቱም ሩብ ዓመታት ይከፋፍሉ፤ ክንውን ያዘጋጁ እና ለቀጣይ ዓመት +10% / +15% / +20% ዕቅድ ያመንጩ።',
                'Import master annual plans from Excel, PDF, or Word, view Half-Year & Q1–Q4 breakdowns, prepare execution reports, and generate +10%/+15%/+20% next-year plans.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white cursor-pointer">
              {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{t('Excel / PDF / Word ጫን', 'Import Excel / PDF / Word')}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.ods,.pdf,.docx,.txt"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('አዲስ ተግባር', 'Add Task')}</span>
            </button>

            {normalizedPlans.length > 0 && (
              <button
                type="button"
                onClick={openGrowthGenerator}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t('የቀጣይ ዓመት (+10/15/20%)', 'Next Year (+10/15/20%)')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCurrentPeriodExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

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

        {/* Mode Toggle + Period Breakdown Tabs */}
        <div className="pt-4 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setWorkMode('plan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  workMode === 'plan' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('ዕቅድ መከፋፈያ (Plan)', 'Plan Breakdown')}
              </button>
              <button
                type="button"
                onClick={() => setWorkMode('execution')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  workMode === 'execution' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('የክንውን ሪፖርት (Execution)', 'Execution Report')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {PERIOD_TABS.map((pKey) => (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => setPeriod(pKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    period === pKey
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'en' ? PLAN_PERIOD_META[pKey].shortEn : PLAN_PERIOD_META[pKey].shortAm}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs tabular-nums">
              <BarChart3 className="w-4 h-4 text-blue-800 shrink-0" />
              <span>
                {t('ዕቅድ', 'Plan')}: <strong>{totals.target}</strong> · {t('ክንውን', 'Done')}:{' '}
                <strong className="text-emerald-700">{totals.done}</strong> ({totals.pct}%)
              </span>
            </div>

            {onSendToSpiritual && normalizedPlans.length > 0 && (
              <button
                type="button"
                onClick={handleSendCurrentToSpiritual}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-900 hover:bg-indigo-800 text-white cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {workMode === 'execution'
                    ? t('የወቅቱን ክንውን ለመንፈሳዊ ዘርፍ ላክ', 'Send Execution Report to Spiritual Council')
                    : t('ይህን ዕቅድ ለመንፈሳዊ ዘርፍ ላክ', 'Send Plan to Spiritual Council')}
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {statusNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Plans / Execution Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3 text-left w-10">#</th>
                <th className="py-2.5 px-3 text-left min-w-[220px]">{t('ዋና ተግባር', 'Planned Activity')}</th>
                <th className="py-2.5 px-2 text-left">{t('መለኪያ', 'Unit')}</th>
                <th className="py-2.5 px-2 text-right">{t('የዓመት ዕቅድ', 'Annual Plan')}</th>
                <th className="py-2.5 px-3 text-right bg-blue-50/50 text-blue-950">
                  {t('የወቅቱ ዕቅድ', 'Period Plan')} (
                  {lang === 'en' ? PLAN_PERIOD_META[period].shortEn : PLAN_PERIOD_META[period].shortAm})
                </th>
                <th className="py-2.5 px-3 text-right bg-emerald-50/50 text-emerald-950">
                  {t('የወቅቱ ክንውን', 'Executed')}
                </th>
                <th className="py-2.5 px-2 text-right">{t('አፈጻጸም (%)', '% Done')}</th>
                <th className="py-2.5 px-3 text-left">{t('ኃላፊ', 'Owner')}</th>
                <th className="py-2.5 px-3 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {normalizedPlans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">
                      {t('ገና ምንም ዓመታዊ ዕቅድ አልተመዘገበም። ከExcel፣ PDF ወይም Word መጫን ይችላሉ።', 'No plans recorded yet. Add manually or import from Excel, PDF, or Word.')}
                    </p>
                  </td>
                </tr>
              ) : (
                normalizedPlans.map((p, idx) => {
                  const target = getPlanTargetForPeriod(p, period);
                  const done = getPlanDoneForPeriod(p, period);
                  const pct = target > 0 ? Math.round((done / target) * 100) : 0;
                  const canEditInlineTarget =
                    workMode === 'plan' &&
                    (period === 'year' || period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4');
                  const canEditInlineDone =
                    workMode === 'execution' &&
                    (period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4');

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 tabular-nums text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{p.task}</td>
                      <td className="py-2.5 px-2 text-slate-600">{p.unit}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-semibold">{p.yearPlan}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-extrabold text-blue-900 bg-blue-50/20">
                        {canEditInlineTarget ? (
                          <input
                            type="number"
                            min={0}
                            value={target}
                            onChange={(e) => handleInlinePeriodTargetUpdate(p, e.target.value)}
                            className="w-16 text-right px-1.5 py-1 rounded border border-blue-200 bg-white font-extrabold"
                          />
                        ) : (
                          target
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-extrabold text-emerald-800 bg-emerald-50/20">
                        {canEditInlineDone ? (
                          <input
                            type="number"
                            min={0}
                            value={done}
                            onChange={(e) =>
                              handleInlineExecutionUpdate(
                                p,
                                `${period}Done` as 'q1Done' | 'q2Done' | 'q3Done' | 'q4Done',
                                e.target.value
                              )
                            }
                            className="w-16 text-right px-1.5 py-1 rounded border border-emerald-300 bg-white font-extrabold"
                          />
                        ) : (
                          done
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-extrabold text-slate-800">
                        {pct}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.role}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            title={t('አስተካክል / ሩብ ዓመታትን አርም', 'Edit Task & Quarters')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title={t('ሰርዝ', 'Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? t('ዕቅድና ክንውን አስተካክል', 'Edit Plan & Execution') : t('አዲስ የዓመት ዕቅድ ጨምር', 'Add Annual Plan Item')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveModal} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ዋና ተግባር *', 'Planned Activity *')}</label>
                <input
                  type="text"
                  required
                  value={pTask}
                  onChange={(e) => setPTask(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መለኪያ', 'Unit')}</label>
                  <input
                    type="text"
                    value={pUnit}
                    onChange={(e) => setPUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የዓመት ዕቅድ', 'Annual Target')}</label>
                  <input
                    type="number"
                    value={pYearPlan}
                    onChange={(e) => handleAutoSplitYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ኃላፊ', 'Owner')}</label>
                  <input
                    type="text"
                    value={pRole}
                    onChange={(e) => setPRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">1ኛ ሩብ (Q1)</label>
                  <input type="number" value={pQ1Plan} onChange={(e) => setPQ1Plan(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">2ኛ ሩብ (Q2)</label>
                  <input type="number" value={pQ2Plan} onChange={(e) => setPQ2Plan(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">3ኛ ሩብ (Q3)</label>
                  <input type="number" value={pQ3Plan} onChange={(e) => setPQ3Plan(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">4ኛ ሩብ (Q4)</label>
                  <input type="number" value={pQ4Plan} onChange={(e) => setPQ4Plan(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">{t('Q1 ክንውን', 'Q1 Done')}</label>
                  <input type="number" value={pQ1Done} onChange={(e) => setPQ1Done(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg tabular-nums" />
                </div>
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">{t('Q2 ክንውን', 'Q2 Done')}</label>
                  <input type="number" value={pQ2Done} onChange={(e) => setPQ2Done(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg tabular-nums" />
                </div>
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">{t('Q3 ክንውን', 'Q3 Done')}</label>
                  <input type="number" value={pQ3Done} onChange={(e) => setPQ3Done(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg tabular-nums" />
                </div>
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">{t('Q4 ክንውን', 'Q4 Done')}</label>
                  <input type="number" value={pQ4Done} onChange={(e) => setPQ4Done(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg tabular-nums" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button type="submit" className="px-5 py-2 font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl cursor-pointer">
                  {t('አስቀምጥ', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Next-Year Plan Growth Generator Modal (+10% / +15% / +20%) */}
      {isGrowthOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>
                    {t(
                      'የቀጣይ ዓመት ዕቅድ ማመንጫ (+10% / +15% / +20%)',
                      'Next-Year Plan Growth Generator (+10% / +15% / +20%)'
                    )}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'መቀጠል ያለባቸውን ተግባራት ይምረጡ እና የእድገት መጠኑን (10%፣ 15% ወይም 20%) ይወስኑ።',
                    'Select continuing activities and choose your growth percentage (10%, 15%, or 20%).'
                  )}
                </p>
              </div>
              <button type="button" onClick={() => setIsGrowthOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {([10, 15, 20] as const).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setGrowthRate(pct)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      growthRate === pct ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    +{pct}% {t('እድገት', 'Growth')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedGrowthIds(new Set(normalizedPlans.map((p) => p.id)))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  {t('ሁሉንም ምረጥ', 'Select All')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGrowthIds(new Set())}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  {t('አጽዳ', 'Clear')}
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2 px-3 text-left w-10">{t('ቀጥል', 'Keep')}</th>
                    <th className="py-2 px-3 text-left">{t('ተግባር', 'Activity')}</th>
                    <th className="py-2 px-3 text-right">{t('የአሁኑ ዓመት', 'Current Year')}</th>
                    <th className="py-2 px-3 text-right text-amber-800">{t(`ቀጣይ ዓመት (+${growthRate}%)`, `Next Year (+${growthRate}%)`)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {normalizedPlans.map((item) => {
                    const checked = selectedGrowthIds.has(item.id);
                    const previewItem = generateNextYearPlans([item], new Set([item.id]), growthRate)[0];
                    return (
                      <tr key={item.id} className={checked ? 'bg-amber-50/20' : 'opacity-60'}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedGrowthIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(item.id);
                                else next.delete(item.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{item.task}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-600">{item.yearPlan}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-extrabold text-amber-800">
                          {checked && previewItem ? previewItem.yearPlan : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                disabled={growthPreviewItems.length === 0}
                onClick={() => handleApplyGrowth('excel')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('በExcel አውርድ', 'Export Excel')}</span>
              </button>
              {onSendToSpiritual && (
                <button
                  type="button"
                  disabled={growthPreviewItems.length === 0}
                  onClick={() => handleApplyGrowth('send')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold bg-indigo-800 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('ለመንፈሳዊ ዘርፍ ላክ', 'Send to Spiritual')}</span>
                </button>
              )}
              <button
                type="button"
                disabled={growthPreviewItems.length === 0}
                onClick={() => handleApplyGrowth('replace')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t(`በ+${growthRate}% ተክተህ አስቀምጥ`, `Apply +${growthRate}% Plan`)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
