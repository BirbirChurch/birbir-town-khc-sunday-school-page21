import React, { Suspense, useMemo, useRef, useState } from 'react';
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
  Loader2,
  ClipboardCheck,
  Calendar,
  Search
} from 'lucide-react';
import {
  AnnualPlanItem,
  MinistrySubmission,
  OrgUnitId,
  PlanDispatchItem,
  PlanExecutionLogEntry,
  PlanQuarterKey,
  SpiritualMasterPlanSheetData,
  SubmissionType
} from '../types';
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
import {
  PLAN_QUARTERS,
  detectEthiopianQuarterFromDate,
  getHalfYearForQuarter,
  getHalfYearLabel,
  getPlanYearSpanLabel,
  getQuarterShortLabel,
  reconcilePlanWithExecutionLogs,
  sumPlanLogsByQuarter
} from '../utils/planExecutionRollup';
import {
  SPIRITUAL_MASTER_PLAN_ITEMS,
  extractMasterCodeFromPlan,
  mergeParsedSheetIntoAnnualPlans,
  parseSpiritualMasterPlanExcel,
  recomputeSection1TotalsOnPlans
} from '../utils/spiritualMasterPlan';
import { formatDualDateText, getTodayIsoDate } from '../utils/ethiopianDate';
import { DualDateBadge, DualDateInput } from './DualDate';
import { useLanguage } from '../context/LanguageContext';
import { ExportPhotoButton } from './ExportPhotoButton';

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
  extraHeaderActions?: React.ReactNode;
  footerSlot?: React.ReactNode;
  onMasterSheetImported?: (sheet: SpiritualMasterPlanSheetData) => void;
}

const PERIOD_TABS: PlanPeriodKey[] = ['year', 'h1', 'h2', 'q1', 'q2', 'q3', 'q4'];

interface FlattenedWorkLogRow {
  plan: AnnualPlanItem;
  log: PlanExecutionLogEntry;
  halfYear: 'h1' | 'h2';
}

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
  onReturnDispatch,
  extraHeaderActions,
  footerSlot,
  onMasterSheetImported
}) => {
  const { lang, t } = useLanguage();
  const planExportRef = useRef<HTMLDivElement | null>(null);
  const [workMode, setWorkMode] = useState<'plan' | 'work_log' | 'execution'>('plan');
  const [period, setPeriod] = useState<PlanPeriodKey>('year');
  const [planSearch, setPlanSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  // Add / Edit Plan Modal
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

  // Inline Delete Confirmation for Plans & Logs
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<number | null>(null);
  const [confirmDeleteLogKey, setConfirmDeleteLogKey] = useState<string | null>(null);

  // Work Execution Logger Modal ("በዕቅዱ መሰረት የተሰራ ስራ መመዝገቢያ")
  const [isWorkLogOpen, setIsWorkLogOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editingLogOriginalPlanId, setEditingLogOriginalPlanId] = useState<number | null>(null);
  const [logPlanId, setLogPlanId] = useState<number>(0);
  const [logDate, setLogDate] = useState<string>(() => getTodayIsoDate());
  const [logQuarter, setLogQuarter] = useState<PlanQuarterKey>(() => {
    return detectEthiopianQuarterFromDate(getTodayIsoDate())?.quarter || 'q1';
  });
  const [logQuarterOverridden, setLogQuarterOverridden] = useState(false);
  const [logQuantity, setLogQuantity] = useState<string>('1');
  const [logWorkTitle, setLogWorkTitle] = useState<string>('');
  const [logPerformedBy, setLogPerformedBy] = useState<string>('');
  const [logNotes, setLogNotes] = useState<string>('');

  // Work Log Register Filters
  const [logSearch, setLogSearch] = useState('');
  const [logPlanFilter, setLogPlanFilter] = useState<string>('all');
  const [logPeriodFilter, setLogPeriodFilter] = useState<'all' | 'h1' | 'h2' | PlanQuarterKey>('all');

  // Next-year Growth Generator Modal (+10% / +15% / +20%)
  const [isGrowthOpen, setIsGrowthOpen] = useState(false);
  const [growthRate, setGrowthRate] = useState<10 | 15 | 20>(10);
  const [selectedGrowthIds, setSelectedGrowthIds] = useState<Set<number>>(new Set());

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(''), 6000);
  };

  const curYrNum = useMemo(() => {
    const n = parseInt(String(currentYear || ''), 10);
    return Number.isFinite(n) && n >= 1900 ? n : 2019;
  }, [currentYear]);
  const prevYrNum = curYrNum - 1;

  const normalizedPlans = useMemo(() => plans.map(ensureQuartersOnPlan), [plans]);

  const commitPlans = (nextList: AnnualPlanItem[]) => {
    onSavePlans(recomputeSection1TotalsOnPlans(nextList, currentYear));
  };

  const visiblePlans = useMemo(() => {
    const q = planSearch.trim().toLowerCase();
    if (!q) return normalizedPlans;
    return normalizedPlans.filter(
      (p) =>
        p.task.toLowerCase().includes(q) ||
        (p.itemCode || '').toLowerCase().includes(q) ||
        (p.unit || '').toLowerCase().includes(q) ||
        (p.role || '').toLowerCase().includes(q)
    );
  }, [normalizedPlans, planSearch]);

  const totals = useMemo(() => {
    const target = normalizedPlans.reduce((s, p) => s + getPlanTargetForPeriod(p, period), 0);
    const done = normalizedPlans.reduce((s, p) => s + getPlanDoneForPeriod(p, period), 0);
    const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
    return { target, done, pct };
  }, [normalizedPlans, period]);

  const allWorkLogs: FlattenedWorkLogRow[] = useMemo(() => {
    const rows: FlattenedWorkLogRow[] = [];
    normalizedPlans.forEach((plan) => {
      (plan.executionLogs || []).forEach((log) => {
        rows.push({
          plan,
          log,
          halfYear: getHalfYearForQuarter(log.quarter)
        });
      });
    });
    return rows.sort((a, b) => String(b.log.date || '').localeCompare(String(a.log.date || '')));
  }, [normalizedPlans]);

  const workLogTotalsByPeriod = useMemo(() => {
    let q1 = 0;
    let q2 = 0;
    let q3 = 0;
    let q4 = 0;
    allWorkLogs.forEach(({ log }) => {
      const qty = Math.max(0, Number(log.quantity) || 0);
      if (log.quarter === 'q1') q1 += qty;
      else if (log.quarter === 'q2') q2 += qty;
      else if (log.quarter === 'q3') q3 += qty;
      else if (log.quarter === 'q4') q4 += qty;
    });
    return { q1, q2, h1: q1 + q2, q3, q4, h2: q3 + q4, year: q1 + q2 + q3 + q4 };
  }, [allWorkLogs]);

  const filteredWorkLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return allWorkLogs.filter(({ plan, log, halfYear }) => {
      if (logPlanFilter !== 'all' && String(plan.id) !== logPlanFilter) return false;
      if (logPeriodFilter === 'h1' && halfYear !== 'h1') return false;
      if (logPeriodFilter === 'h2' && halfYear !== 'h2') return false;
      if (
        (logPeriodFilter === 'q1' ||
          logPeriodFilter === 'q2' ||
          logPeriodFilter === 'q3' ||
          logPeriodFilter === 'q4') &&
        log.quarter !== logPeriodFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        plan.task.toLowerCase().includes(q) ||
        log.workTitle.toLowerCase().includes(q) ||
        (log.performedBy || '').toLowerCase().includes(q) ||
        (log.locationOrNotes || '').toLowerCase().includes(q)
      );
    });
  }, [allWorkLogs, logSearch, logPlanFilter, logPeriodFilter]);

  // Supporting work logs for currently selected Execution Report period
  const periodSupportingLogs = useMemo(() => {
    return allWorkLogs.filter(({ log, halfYear }) => {
      if (period === 'year') return true;
      if (period === 'h1' || period === 'half') return halfYear === 'h1';
      if (period === 'h2') return halfYear === 'h2';
      return log.quarter === period;
    });
  }, [allWorkLogs, period]);

  const detectedQuarterInfo = useMemo(
    () => detectEthiopianQuarterFromDate(logDate),
    [logDate]
  );

  const selectedLogPlan = useMemo(
    () => normalizedPlans.find((p) => p.id === logPlanId) || normalizedPlans[0] || null,
    [normalizedPlans, logPlanId]
  );

  const openWorkLogAdd = (preselectedPlanId?: number) => {
    if (normalizedPlans.length === 0) return;
    const today = getTodayIsoDate();
    const detected = detectEthiopianQuarterFromDate(today);
    const targetPlan =
      normalizedPlans.find((p) => p.id === preselectedPlanId) || normalizedPlans[0];

    setEditingLogId(null);
    setEditingLogOriginalPlanId(null);
    setLogPlanId(targetPlan.id);
    setLogDate(today);
    setLogQuarter(detected?.quarter || 'q1');
    setLogQuarterOverridden(false);
    setLogQuantity('1');
    setLogWorkTitle('');
    setLogPerformedBy(targetPlan.role || chapelName || unitName);
    setLogNotes('');
    setIsWorkLogOpen(true);
  };

  const openWorkLogEdit = (plan: AnnualPlanItem, log: PlanExecutionLogEntry) => {
    setEditingLogId(log.id);
    setEditingLogOriginalPlanId(plan.id);
    setLogPlanId(plan.id);
    setLogDate(log.date);
    setLogQuarter(log.quarter);
    setLogQuarterOverridden(true);
    setLogQuantity(String(log.quantity));
    setLogWorkTitle(log.workTitle);
    setLogPerformedBy(log.performedBy || '');
    setLogNotes(log.locationOrNotes || '');
    setIsWorkLogOpen(true);
  };

  const handleLogDateChange = (nextDate: string) => {
    setLogDate(nextDate);
    if (!logQuarterOverridden) {
      const detected = detectEthiopianQuarterFromDate(nextDate);
      if (detected) {
        setLogQuarter(detected.quarter);
      }
    }
  };

  const handleSaveWorkLog = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPlan = normalizedPlans.find((p) => p.id === logPlanId);
    if (!targetPlan) return;
    const qty = Math.max(0, parseFloat(logQuantity) || 0);
    if (qty <= 0) return;

    const entry: PlanExecutionLogEntry = {
      id: editingLogId ?? generateUniqueId(),
      date: logDate || getTodayIsoDate(),
      quarter: logQuarter,
      quantity: qty,
      workTitle: logWorkTitle.trim() || targetPlan.task,
      performedBy: logPerformedBy.trim() || undefined,
      locationOrNotes: logNotes.trim() || undefined,
      recordedAt: new Date().toISOString()
    };

    const nextPlans = normalizedPlans.map((plan) => {
      const existingLogs = plan.executionLogs || [];
      if (
        editingLogId !== null &&
        editingLogOriginalPlanId !== null &&
        editingLogOriginalPlanId !== targetPlan.id &&
        plan.id === editingLogOriginalPlanId
      ) {
        const filtered = existingLogs.filter((l) => l.id !== editingLogId);
        return reconcilePlanWithExecutionLogs(plan, filtered);
      }
      if (plan.id === targetPlan.id) {
        const updatedLogs =
          editingLogId !== null && editingLogOriginalPlanId === targetPlan.id
            ? existingLogs.map((l) => (l.id === editingLogId ? entry : l))
            : [entry, ...existingLogs];
        return reconcilePlanWithExecutionLogs(plan, updatedLogs);
      }
      return plan;
    });

    commitPlans(nextPlans);
    setIsWorkLogOpen(false);
    const qLabel = getQuarterShortLabel(logQuarter, lang);
    const halfLabel = getHalfYearLabel(getHalfYearForQuarter(logQuarter), lang);
    showNotice(
      t(
        `✓ የተሰራው ስራ (${qty} ${targetPlan.unit}) ተመዝግቧል! በራሱ ወደ ${qLabel} › ${halfLabel} › የዓመት ክንውን ሪፖርት ተካቷል።`,
        `✓ Logged ${qty} ${targetPlan.unit}! Automatically rolled up into ${qLabel} › ${halfLabel} › Annual Execution Report.`
      )
    );
  };

  const handleDeleteWorkLog = (planId: number, logId: number) => {
    const nextPlans = normalizedPlans.map((plan) => {
      if (plan.id !== planId) return plan;
      const nextLogs = (plan.executionLogs || []).filter((l) => l.id !== logId);
      return reconcilePlanWithExecutionLogs(plan, nextLogs);
    });
    commitPlans(nextPlans);
    setConfirmDeleteLogKey(null);
    showNotice(
      t(
        '✓ የስራ መዝገቡ ተሰርዟል፤ የሩብ ዓመት፣ የግማሽ ዓመትና የዓመት ክንውን በራሱ ታድሷል።',
        '✓ Work log deleted and Quarterly, Half-Year, and Annual execution totals recalculated.'
      )
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const lowerName = file.name.toLowerCase();
      const isExcel =
        lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls') ||
        lowerName.endsWith('.xlsm') ||
        lowerName.endsWith('.xlsb') ||
        lowerName.endsWith('.csv');

      if (isExcel) {
        try {
          const masterParsed = await parseSpiritualMasterPlanExcel(file, currentYear);
          if (masterParsed.matchedRowsCount > 0) {
            const targetSheet =
              chapelName && masterParsed.chapelSheets[chapelName]
                ? masterParsed.chapelSheets[chapelName]
                : masterParsed.firstSheet;
            const merged = mergeParsedSheetIntoAnnualPlans(
              targetSheet,
              currentYear,
              chapelName || unitName,
              normalizedPlans
            );
            commitPlans(merged.nextPlans);
            onMasterSheetImported?.(targetSheet);
            showNotice(
              t(
                `✓ ከ "${file.name}" ${merged.updatedCount || masterParsed.matchedRowsCount} የ2019 ቋሚ ዕቅድ መስመሮች ወደ ሙሉ ዓመት፣ ግማሽ ዓመትና 4ቱም ሩብ ዓመታት ገብተዋል!`,
                `✓ Imported ${merged.updatedCount || masterParsed.matchedRowsCount} master plan rows from "${file.name}" into Annual, Half-Year, and Quarterly columns!`
              )
            );
            return;
          }
        } catch {
          // Fall through to generic plan file parser
        }
      }

      const parsed = await parseAnnualPlanFile(file, chapelName || unitName, currentYear);
      if (parsed.length === 0) {
        showNotice(
          t(
            'ከተጫነው ፋይል የዕቅድ መስመሮች ማግኘት አልተቻለም። እባክዎ የፋይሉን ቅርጽ ያረጋግጡ።',
            'Could not extract plan rows from that file. Please verify the file layout.'
          )
        );
      } else {
        commitPlans(normalizedPlans.length === 0 ? parsed : [...normalizedPlans, ...parsed]);
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
    const existingItem = editingId ? normalizedPlans.find((p) => p.id === editingId) : undefined;
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
      role: pRole.trim() || chapelName || unitName,
      executionLogs: existingItem?.executionLogs
    };

    const next = editingId
      ? normalizedPlans.map((p) => (p.id === editingId ? { ...existingItem, ...item } : p))
      : [...normalizedPlans, item];
    commitPlans(next);
    setIsModalOpen(false);
  };

  const handleInlineExecutionUpdate = (
    p: AnnualPlanItem,
    quarterField: 'q1Done' | 'q2Done' | 'q3Done' | 'q4Done',
    value: string
  ) => {
    const num = Math.max(0, parseFloat(value) || 0);
    commitPlans(
      normalizedPlans.map((item) => (item.id === p.id ? { ...item, [quarterField]: num } : item))
    );
  };

  const handleInlinePlanFieldUpdate = (
    p: AnnualPlanItem,
    targetPeriod: 'year' | 'h1' | 'h2' | 'q1' | 'q2' | 'q3' | 'q4',
    valStr: string
  ) => {
    const num = Math.max(0, parseFloat(valStr) || 0);
    commitPlans(
      normalizedPlans.map((item) => {
        if (item.id !== p.id) return item;
        if (targetPeriod === 'year') {
          const [q1, q2, q3, q4] = splitAnnualAcrossQuarters(num);
          return { ...item, yearPlan: num, q1Plan: q1, q2Plan: q2, q3Plan: q3, q4Plan: q4 };
        }
        if (targetPeriod === 'h1') {
          const q1 = Math.ceil(num / 2);
          const q2 = Math.floor(num / 2);
          const q3 = Number(item.q3Plan) || 0;
          const q4 = Number(item.q4Plan) || 0;
          return { ...item, q1Plan: q1, q2Plan: q2, yearPlan: q1 + q2 + q3 + q4 };
        }
        if (targetPeriod === 'h2') {
          const q3 = Math.ceil(num / 2);
          const q4 = Math.floor(num / 2);
          const q1 = Number(item.q1Plan) || 0;
          const q2 = Number(item.q2Plan) || 0;
          return { ...item, q3Plan: q3, q4Plan: q4, yearPlan: q1 + q2 + q3 + q4 };
        }
        const key = `${targetPeriod}Plan` as 'q1Plan' | 'q2Plan' | 'q3Plan' | 'q4Plan';
        const updated = { ...item, [key]: num };
        const totalY =
          (Number(updated.q1Plan) || 0) +
          (Number(updated.q2Plan) || 0) +
          (Number(updated.q3Plan) || 0) +
          (Number(updated.q4Plan) || 0);
        return { ...updated, yearPlan: totalY };
      })
    );
  };

  const handleInlinePeriodTargetUpdate = (p: AnnualPlanItem, valStr: string) => {
    const effectivePeriod: 'year' | 'h1' | 'h2' | 'q1' | 'q2' | 'q3' | 'q4' =
      period === 'half' ? 'h1' : period;
    handleInlinePlanFieldUpdate(p, effectivePeriod, valStr);
  };

  const handleDeletePlan = (id: number) => {
    commitPlans(normalizedPlans.filter((p) => p.id !== id));
    setConfirmDeletePlanId(null);
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
    const yearSpan = getPlanYearSpanLabel(currentYear, lang);
    const summaryRows = [
      [`${chapelName || unitName} — ${yearSpan} (${lang === 'en' ? pMeta.en : pMeta.am})`],
      ['የዕቅድ ዘመን፦ ከሐምሌ እስከ ሰኔ · ከሩብ ዓመት › ግማሽ ዓመት (H1=Q1+Q2, H2=Q3+Q4) › ዓመት (H1+H2) የተጠቃለለ ሪፖርት'],
      [],
      [
        'ተ.ቁ',
        'ዋና ተግባር',
        'መለኪያ',
        `Q1 ሐምሌ ${prevYrNum}–መስከረም ${curYrNum} (ዕ/ክ)`,
        `Q2 ጥቅምት–ታኅሣሥ ${curYrNum} (ዕ/ክ)`,
        '1ኛ ግማሽ H1 ዕቅድ (ሐምሌ–ታኅሣሥ)',
        '1ኛ ግማሽ H1 ክንውን (ሐምሌ–ታኅሣሥ)',
        `Q3 ጥር–መጋቢት ${curYrNum} (ዕ/ክ)`,
        `Q4 ሚያዝያ–ሰኔ ${curYrNum} (ዕ/ክ)`,
        '2ኛ ግማሽ H2 ዕቅድ (ጥር–ሰኔ)',
        '2ኛ ግማሽ H2 ክንውን (ጥር–ሰኔ)',
        `የዓመት ዕቅድ (ሐምሌ ${prevYrNum}–ሰኔ ${curYrNum})`,
        `የዓመት ክንውን (ሐምሌ ${prevYrNum}–ሰኔ ${curYrNum})`,
        'አፈጻጸም (%)',
        'የተመዘገቡ ስራዎች',
        'ኃላፊ'
      ],
      ...normalizedPlans.map((p, i) => {
        const h1Plan = getPlanTargetForPeriod(p, 'h1');
        const h1Done = getPlanDoneForPeriod(p, 'h1');
        const h2Plan = getPlanTargetForPeriod(p, 'h2');
        const h2Done = getPlanDoneForPeriod(p, 'h2');
        const yrPlan = getPlanTargetForPeriod(p, 'year');
        const yrDone = getPlanDoneForPeriod(p, 'year');
        const pct = yrPlan > 0 ? Math.round((yrDone / yrPlan) * 100) : 0;
        return [
          i + 1,
          p.task,
          p.unit,
          `${p.q1Plan}/${p.q1Done}`,
          `${p.q2Plan}/${p.q2Done}`,
          h1Plan,
          h1Done,
          `${p.q3Plan}/${p.q3Done}`,
          `${p.q4Plan}/${p.q4Done}`,
          h2Plan,
          h2Done,
          yrPlan,
          yrDone,
          `${pct}%`,
          (p.executionLogs || []).length,
          p.role
        ];
      })
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'ዕቅድና_ክንውን_ማጠቃለያ');

    const logRows = [
      [`${chapelName || unitName} — በዕቅዱ መሰረት የተሰሩ ስራዎች መዝገብ (${yearSpan})`],
      [],
      [
        'ተ.ቁ',
        'ቀን (ኢትዮጵያዊ / ፈረንጅ)',
        'ሩብ ዓመት',
        'ግማሽ ዓመት',
        'የዕቅድ ተግባር',
        'የተሰራው ስራ ዝርዝር',
        'መጠን',
        'መለኪያ',
        'ያከናወነው / ኃላፊ',
        'ቦታ / ማስታወሻ'
      ],
      ...allWorkLogs.map(({ plan, log, halfYear }, i) => [
        i + 1,
        formatDualDateText(log.date, log.date),
        getQuarterShortLabel(log.quarter, 'am', currentYear),
        getHalfYearLabel(halfYear, 'am', currentYear),
        plan.task,
        log.workTitle,
        log.quantity,
        plan.unit,
        log.performedBy || '-',
        log.locationOrNotes || '-'
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(logRows), 'የተሰሩ_ስራዎች_መዝገብ');

    XLSX.writeFile(wb, `${chapelName || unitName}_${currentYear}_${period}.xlsx`);
  };

  const handleSendCurrentToSpiritual = () => {
    if (!onSendToSpiritual || normalizedPlans.length === 0) return;
    const isExec = workMode === 'execution' || workMode === 'work_log';
    const subType: SubmissionType = isExec ? 'report' : 'plan';
    const pLabel = lang === 'en' ? PLAN_PERIOD_META[period].en : PLAN_PERIOD_META[period].am;
    const content = buildPlanPeriodSummaryText(
      normalizedPlans,
      chapelName || unitName,
      currentYear,
      period,
      isExec ? 'execution' : 'plan',
      lang
    );

    onSendToSpiritual({
      type: subType,
      title: `${chapelName || unitName} — ${currentYear} (${pLabel}) ${
        isExec ? t('የክንውን ሪፖርት', 'Execution Report') : t('ዕቅድ', 'Action Plan')
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
        `✓ የ${pLabel} ${isExec ? 'የክንውን ሪፖርት' : 'ዕቅድ'} ለመንፈሳዊ ዘርፍ ተልኳል!`,
        `✓ Sent ${pLabel} ${isExec ? 'execution report' : 'plan'} to Spiritual Council!`
      )
    );
  };

  // Preview rollup inside the Work Execution Modal
  const modalPlanPreview = useMemo(() => {
    if (!selectedLogPlan) return null;
    const qty = Math.max(0, parseFloat(logQuantity) || 0);
    const oldLogQty =
      editingLogId !== null && editingLogOriginalPlanId === selectedLogPlan.id
        ? Number((selectedLogPlan.executionLogs || []).find((l) => l.id === editingLogId)?.quantity) || 0
        : 0;
    const oldLogQuarter =
      editingLogId !== null && editingLogOriginalPlanId === selectedLogPlan.id
        ? (selectedLogPlan.executionLogs || []).find((l) => l.id === editingLogId)?.quarter
        : undefined;

    const curQ = Number(selectedLogPlan[`${logQuarter}Done`]) || 0;
    const nextQ = Math.max(0, curQ - (oldLogQuarter === logQuarter ? oldLogQty : 0) + qty);

    const halfKey = getHalfYearForQuarter(logQuarter);
    const curH = getPlanDoneForPeriod(selectedLogPlan, halfKey);
    const oldHalfMatch = oldLogQuarter && getHalfYearForQuarter(oldLogQuarter) === halfKey ? oldLogQty : 0;
    const nextH = Math.max(0, curH - oldHalfMatch + qty);

    const curY = getPlanDoneForPeriod(selectedLogPlan, 'year');
    const nextY = Math.max(0, curY - oldLogQty + qty);

    return { curQ, nextQ, halfKey, curH, nextH, curY, nextY };
  }, [selectedLogPlan, logQuantity, logQuarter, editingLogId, editingLogOriginalPlanId]);

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

      <div ref={planExportRef} className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-800" />
                <span>
                  {chapelName || unitName} — {currentYear} {t('ዓ/ም ዕቅድ፣ የስራ መመዝገቢያ እና ክንውን', 'Annual Plan, Work Logger & Execution')}
                </span>
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-extrabold text-blue-900">
                <Calendar className="w-3 h-3 text-blue-700" />
                <span>{getPlanYearSpanLabel(currentYear, lang)}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                `የዕቅድ ዘመኑ የሚጀምረው ከሐምሌ ነው፦ Q1 (ሐምሌ ${prevYrNum}–መስከረም ${curYrNum}) · Q2 (ጥቅምት–ታኅሣሥ) · Q3 (ጥር–መጋቢት) · Q4 (ሚያዝያ–ሰኔ)።`,
                `Fiscal planning year runs Hamle ${prevYrNum}–Sene ${curYrNum}: Q1 (Hamle–Meskerem) · Q2 (Tikimt–Tahsas) · Q3 (Tir–Megabit) · Q4 (Miyazya–Sene).`
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              disabled={normalizedPlans.length === 0}
              onClick={() => openWorkLogAdd()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>{t('+ የተሰራ ስራ መዝግብ (በዕቅዱ መሰረት)', '+ Log Completed Work')}</span>
            </button>

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

            {extraHeaderActions}

            <button
              type="button"
              onClick={handleExportCurrentPeriodExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <ExportPhotoButton
              targetRef={planExportRef}
              fileName={`${chapelName || unitName}_ዕቅድና_ክንውን_${currentYear}`}
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

        {/* Mode Toggle + Period Breakdown Tabs */}
        <div className="pt-4 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
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
                onClick={() => setWorkMode('work_log')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  workMode === 'work_log' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`የተሰሩ ስራዎች መመዝገቢያ (${allWorkLogs.length})`, `Work Execution Log (${allWorkLogs.length})`)}
              </button>
              <button
                type="button"
                onClick={() => setWorkMode('execution')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  workMode === 'execution' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('የክንውን ሪፖርት (Q1–Q4 › ግማሽ › ዓመት)', 'Execution Report (Q › Half › Annual)')}
              </button>
            </div>

            {workMode !== 'work_log' && (
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
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {workMode !== 'work_log' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  placeholder={t('ተግባር ወይም ኮድ ፈልግ...', 'Filter task or code...')}
                  className="pl-7 pr-2.5 py-1.5 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white w-44"
                />
              </div>
            )}

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
                  {workMode === 'execution' || workMode === 'work_log'
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

      {/* VIEW 2: WORK EXECUTION LOGGER & CHRONOLOGICAL REGISTER */}
      {workMode === 'work_log' && (
        <div className="space-y-4">
          {/* Auto-Rollup Summary Strip from Logged Works */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {t(
                    'በዕቅዱ መሰረት የተሰሩ ስራዎች አውቶማቲክ ድምር (ሩብ ዓመት › ግማሽ ዓመት › ዓመት)',
                    'Auto-Rollup from Work Logs (Quarter › Half-Year › Annual)'
                  )}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {t(
                    'እዚህ የሚመዘገቡት እያንዳንዱ ስራዎች በቀኑ መሰረት ሩብ ዓመቱን ለይተው ወደ 1ኛ/2ኛ ግማሽ ዓመትና የዓመት ክንውን ሪፖርት በራሳቸው ይደመራሉ።',
                    'Every work entry auto-detects its Ethiopian quarter and automatically rolls up into Half-Year (H1/H2) and Annual totals.'
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={normalizedPlans.length === 0}
                onClick={() => openWorkLogAdd()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('አዲስ የተሰራ ስራ መዝግብ', 'Log New Completed Work')}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-slate-500">1ኛ ሩብ (Q1)</div>
                <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {workLogTotalsByPeriod.q1}
                </div>
                <div className="text-[10px] text-slate-500">
                  ሐምሌ {prevYrNum}–መስከረም {curYrNum}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-slate-500">2ኛ ሩብ (Q2)</div>
                <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {workLogTotalsByPeriod.q2}
                </div>
                <div className="text-[10px] text-slate-500">
                  ጥቅምት–ታኅሣሥ {curYrNum}
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-indigo-800">1ኛ ግማሽ (H1)</div>
                <div className="text-base font-extrabold text-indigo-950 tabular-nums mt-0.5">
                  {workLogTotalsByPeriod.h1}
                </div>
                <div className="text-[10px] text-indigo-700 font-semibold">
                  ሐምሌ {prevYrNum}–ታኅሣሥ {curYrNum}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-slate-500">3ኛ ሩብ (Q3)</div>
                <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {workLogTotalsByPeriod.q3}
                </div>
                <div className="text-[10px] text-slate-500">ጥር–መጋቢት {curYrNum}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-slate-500">4ኛ ሩብ (Q4)</div>
                <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {workLogTotalsByPeriod.q4}
                </div>
                <div className="text-[10px] text-slate-500">ሚያዝያ–ሰኔ {curYrNum}</div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold text-indigo-800">2ኛ ግማሽ (H2)</div>
                <div className="text-base font-extrabold text-indigo-950 tabular-nums mt-0.5">
                  {workLogTotalsByPeriod.h2}
                </div>
                <div className="text-[10px] text-indigo-700 font-semibold">ጥር–ሰኔ {curYrNum}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold text-emerald-800">የዓመት ድምር</div>
                <div className="text-base font-extrabold text-emerald-950 tabular-nums mt-0.5">
                  {workLogTotalsByPeriod.year}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  ሐምሌ {prevYrNum}–ሰኔ {curYrNum}
                </div>
              </div>
            </div>
          </section>

          {/* Work Logs Filter & Table */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder={t('ስራ፣ ኃላፊ ወይም ቦታ ፈልግ...', 'Search work, owner, notes...')}
                    className="pl-8 pr-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white w-full"
                  />
                </div>
                <select
                  value={logPlanFilter}
                  onChange={(e) => setLogPlanFilter(e.target.value)}
                  className="px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold max-w-[230px]"
                >
                  <option value="all">{t('ሁሉም የዕቅድ ተግባራት', 'All Planned Activities')}</option>
                  {normalizedPlans.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.task}
                    </option>
                  ))}
                </select>
                <select
                  value={logPeriodFilter}
                  onChange={(e) => setLogPeriodFilter(e.target.value as any)}
                  className="px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                >
                  <option value="all">{t('ሁሉም ወቅቶች', 'All Periods')}</option>
                  <option value="q1">1ኛ ሩብ (ሐምሌ–መስከረም)</option>
                  <option value="q2">2ኛ ሩብ (ጥቅምት–ታኅሣሥ)</option>
                  <option value="h1">1ኛ ግማሽ (ሐምሌ–ታኅሣሥ)</option>
                  <option value="q3">3ኛ ሩብ (ጥር–መጋቢት)</option>
                  <option value="q4">4ኛ ሩብ (ሚያዝያ–ሰኔ)</option>
                  <option value="h2">2ኛ ግማሽ (ጥር–ሰኔ)</option>
                </select>
              </div>
              <div className="text-xs font-bold text-slate-600 tabular-nums">
                {t('የተገኙ መዝገቦች፦', 'Matching Logs:')} {filteredWorkLogs.length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3 text-left">#</th>
                    <th className="py-2.5 px-3 text-left">{t('ቀን', 'Date')}</th>
                    <th className="py-2.5 px-3 text-left">{t('ሩብ ዓመት / ግማሽ ዓመት', 'Quarter & Half-Year')}</th>
                    <th className="py-2.5 px-3 text-left">{t('የዕቅዱ ተግባር', 'Planned Activity')}</th>
                    <th className="py-2.5 px-3 text-left">{t('የተሰራው ስራ ዝርዝር', 'Work Completed')}</th>
                    <th className="py-2.5 px-3 text-right">{t('መጠን', 'Qty')}</th>
                    <th className="py-2.5 px-3 text-left">{t('ያከናወነው / ኃላፊ', 'Performed By')}</th>
                    <th className="py-2.5 px-3 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold">
                          {normalizedPlans.length === 0
                            ? t(
                                'መጀመሪያ የዕቅድ ተግባር ይጨምሩ ወይም ይጫኑ፤ ከዚያ በዕቅዱ መሰረት የተሰሩ ስራዎችን እዚህ ይመዝግቡ።',
                                'Add or import annual plan items first, then log completed work here.'
                              )
                            : t(
                                'ገና በዕቅዱ መሰረት የተሰራ ስራ አልተመዘገበም። «+ የተሰራ ስራ መዝግብ»ን ይጫኑ።',
                                'No completed work logged yet. Click "+ Log Completed Work" to record execution.'
                              )}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredWorkLogs.map(({ plan, log, halfYear }, idx) => {
                      const rowKey = `${plan.id}_${log.id}`;
                      return (
                        <tr key={rowKey} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 tabular-nums text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <DualDateBadge value={log.date} mode="stacked" />
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-extrabold">
                                {getQuarterShortLabel(log.quarter, lang, currentYear)}
                              </span>
                              <span className="text-[10px] font-bold text-indigo-700">
                                {getHalfYearLabel(halfYear, lang, currentYear)}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-blue-950 max-w-[200px]">{plan.task}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{log.workTitle}</div>
                            {log.locationOrNotes && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{log.locationOrNotes}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-extrabold text-emerald-700 whitespace-nowrap">
                            {log.quantity} <span className="text-[10px] text-slate-500 font-semibold">{plan.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{log.performedBy || '—'}</td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                            {confirmDeleteLogKey === rowKey ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWorkLog(plan.id, log.id)}
                                  className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  {t('አረጋግጥ', 'Confirm')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteLogKey(null)}
                                  className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                                >
                                  {t('ተው', 'No')}
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openWorkLogEdit(plan, log)}
                                  className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                                  title={t('አስተካክል', 'Edit')}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteLogKey(rowKey)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title={t('ሰርዝ', 'Delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* VIEW 1 & 3: PLANS / AUTOMATIC ROLLUP EXECUTION REPORT TABLE */}
      {workMode !== 'work_log' && (
        <>
          {workMode === 'execution' && normalizedPlans.length > 0 && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl px-4 py-3 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold">
                {t(
                  'ይህ የክንውን ሪፖርት ከተመዘገቡ ስራዎች በራሱ ይዘጋጃል፦ ሩብ ዓመት (Q1–Q4) → ግማሽ ዓመት (H1=Q1+Q2, H2=Q3+Q4) → የዓመት ሪፖርት (H1+H2)',
                  'Execution reports auto-aggregate from logged works: Quarterly (Q1–Q4) → Half-Year (H1=Q1+Q2, H2=Q3+Q4) → Annual (H1+H2)'
                )}
              </div>
              <button
                type="button"
                onClick={() => setWorkMode('work_log')}
                className="text-xs font-extrabold text-emerald-800 underline hover:text-emerald-950 cursor-pointer print:hidden"
              >
                {t(`የስራ መዝገብ ክፈት (${allWorkLogs.length}) →`, `Open Work Log (${allWorkLogs.length}) →`)}
              </button>
            </div>
          )}

          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3 text-left w-12">ተ.ቁ</th>
                    <th className="py-2.5 px-3 text-left min-w-[210px]">{t('ዋና ተግባር', 'Planned Activity')}</th>
                    <th className="py-2.5 px-2 text-left">{t('መለኪያ', 'Unit')}</th>
                    {period === 'year' ? (
                      workMode === 'plan' ? (
                        <>
                          <th className="py-2.5 px-2 text-right bg-blue-50/60 text-blue-950">
                            <div>1ኛ ሩብ (Q1)</div>
                            <div className="text-[9px] font-semibold text-slate-500">ሐምሌ–መስከረም</div>
                          </th>
                          <th className="py-2.5 px-2 text-right bg-blue-50/60 text-blue-950">
                            <div>2ኛ ሩብ (Q2)</div>
                            <div className="text-[9px] font-semibold text-slate-500">ጥቅምት–ታኅሣሥ</div>
                          </th>
                          <th className="py-2.5 px-2 text-right bg-indigo-50/70 text-indigo-950">
                            <div>1ኛ ግማሽ H1</div>
                            <div className="text-[9px] font-semibold text-indigo-700">ሐምሌ–ታኅሣሥ</div>
                          </th>
                          <th className="py-2.5 px-2 text-right bg-blue-50/60 text-blue-950">
                            <div>3ኛ ሩብ (Q3)</div>
                            <div className="text-[9px] font-semibold text-slate-500">ጥር–መጋቢት</div>
                          </th>
                          <th className="py-2.5 px-2 text-right bg-blue-50/60 text-blue-950">
                            <div>4ኛ ሩብ (Q4)</div>
                            <div className="text-[9px] font-semibold text-slate-500">ሚያዝያ–ሰኔ</div>
                          </th>
                          <th className="py-2.5 px-2 text-right bg-indigo-50/70 text-indigo-950">
                            <div>2ኛ ግማሽ H2</div>
                            <div className="text-[9px] font-semibold text-indigo-700">ጥር–ሰኔ</div>
                          </th>
                          <th className="py-2.5 px-3 text-right bg-sky-100/70 text-sky-950">
                            <div>የዓመት ዕቅድ</div>
                            <div className="text-[9px] font-semibold text-sky-800">
                              ሐምሌ {prevYrNum}–ሰኔ {curYrNum}
                            </div>
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-2 text-right">
                            <div>Q1 (ዕ/ክ)</div>
                            <div className="text-[9px] font-semibold text-slate-500">ሐምሌ–መስከረም</div>
                          </th>
                          <th className="py-2.5 px-2 text-right">
                            <div>Q2 (ዕ/ክ)</div>
                            <div className="text-[9px] font-semibold text-slate-500">ጥቅምት–ታኅሣሥ</div>
                          </th>
                          <th className="py-2.5 px-2 text-right bg-indigo-50/70 text-indigo-950">
                            <div>1ኛ ግማሽ H1</div>
                            <div className="text-[9px] font-semibold text-indigo-700">ሐምሌ–ታኅሣሥ</div>
                          </th>
                          <th className="py-2.5 px-2 text-right">
                            <div>Q3 (ዕ/ክ)</div>
                            <div className="text-[9px] font-semibold text-slate-500">ጥር–መጋቢት</div>
                          </th>
                          <th className="py-2.5 px-2 text-right">
                            <div>Q4 (ዕ/ክ)</div>
                            <div className="text-[9px] font-semibold text-slate-500">ሚያዝያ–ሰኔ</div>
                          </th>
                          <th className="py-2.5 px-2 text-right bg-indigo-50/70 text-indigo-950">
                            <div>2ኛ ግማሽ H2</div>
                            <div className="text-[9px] font-semibold text-indigo-700">ጥር–ሰኔ</div>
                          </th>
                          <th className="py-2.5 px-3 text-right bg-emerald-50/70 text-emerald-950">
                            <div>የዓመት (ዕ/ክ)</div>
                            <div className="text-[9px] font-semibold text-emerald-700">
                              ሐምሌ {prevYrNum}–ሰኔ {curYrNum}
                            </div>
                          </th>
                        </>
                      )
                    ) : (
                      <>
                        <th className="py-2.5 px-2 text-right">{t('የዓመት ዕቅድ', 'Annual Plan')}</th>
                        {(period === 'h1' || period === 'half') && (
                          <>
                            <th className="py-2.5 px-2 text-right">
                              <div>1ኛ ሩብ Q1</div>
                              <div className="text-[9px] font-semibold text-slate-500">ሐምሌ–መስከረም</div>
                            </th>
                            <th className="py-2.5 px-2 text-right">
                              <div>2ኛ ሩብ Q2</div>
                              <div className="text-[9px] font-semibold text-slate-500">ጥቅምት–ታኅሣሥ</div>
                            </th>
                          </>
                        )}
                        {period === 'h2' && (
                          <>
                            <th className="py-2.5 px-2 text-right">
                              <div>3ኛ ሩብ Q3</div>
                              <div className="text-[9px] font-semibold text-slate-500">ጥር–መጋቢት</div>
                            </th>
                            <th className="py-2.5 px-2 text-right">
                              <div>4ኛ ሩብ Q4</div>
                              <div className="text-[9px] font-semibold text-slate-500">ሚያዝያ–ሰኔ</div>
                            </th>
                          </>
                        )}
                        <th className="py-2.5 px-3 text-right bg-blue-50/50 text-blue-950">
                          {t('የወቅቱ ዕቅድ', 'Period Plan')} (
                          {lang === 'en' ? PLAN_PERIOD_META[period].shortEn : PLAN_PERIOD_META[period].shortAm})
                        </th>
                        <th className="py-2.5 px-3 text-right bg-emerald-50/50 text-emerald-950">
                          {t('የወቅቱ ክንውን', 'Executed')}
                        </th>
                      </>
                    )}
                    <th className="py-2.5 px-2 text-right">{t('አፈጻጸም (%)', '% Done')}</th>
                    <th className="py-2.5 px-3 text-left">{t('ኃላፊ', 'Owner')}</th>
                    <th className="py-2.5 px-3 text-right print:hidden">{t('ስራ መዝግብ / ማስተካከያ', 'Log / Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePlans.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-10 text-center text-slate-500">
                        <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold">
                          {normalizedPlans.length === 0
                            ? t('ገና ምንም ዓመታዊ ዕቅድ አልተመዘገበም። ከExcel፣ PDF ወይም Word መጫን ይችላሉ።', 'No plans recorded yet. Add manually or import from Excel, PDF, or Word.')
                            : t('ከፍለጋው ጋር የሚዛመድ ዕቅድ አልተገኘም።', 'No matching plan items found.')}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      let lastRenderedSection = '';
                      return visiblePlans.map((p, idx) => {
                        const target = getPlanTargetForPeriod(p, period);
                        const done = getPlanDoneForPeriod(p, period);
                        const pct = target > 0 ? Math.round((done / target) * 100) : 0;
                        const logCount = (p.executionLogs || []).length;
                        const logSums = sumPlanLogsByQuarter(p.executionLogs || []);
                        const canEditInlineTarget = workMode === 'plan';
                        const canEditInlineDone =
                          workMode === 'execution' &&
                          (period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4');

                        const h1Plan = getPlanTargetForPeriod(p, 'h1');
                        const h1Done = getPlanDoneForPeriod(p, 'h1');
                        const h2Plan = getPlanTargetForPeriod(p, 'h2');
                        const h2Done = getPlanDoneForPeriod(p, 'h2');
                        const yearTarget = getPlanTargetForPeriod(p, 'year');
                        const yearDone = getPlanDoneForPeriod(p, 'year');

                        const masterCode = extractMasterCodeFromPlan(p);
                        const secCode = masterCode ? masterCode.split('.')[0] : '';
                        const sectionHeaderItem =
                          secCode && secCode !== lastRenderedSection
                            ? SPIRITUAL_MASTER_PLAN_ITEMS.find((it) => it.isSection && it.code === secCode)
                            : undefined;
                        if (secCode) lastRenderedSection = secCode;
                        const isSec1Total = masterCode === '1.4';

                        return (
                          <React.Fragment key={p.id}>
                            {sectionHeaderItem && (
                              <tr className="bg-slate-100/95 border-y border-slate-200">
                                <td className="py-2 px-3 font-extrabold text-slate-900 tabular-nums">
                                  {sectionHeaderItem.code}
                                </td>
                                <td colSpan={13} className="py-2 px-3 font-extrabold text-slate-900">
                                  {sectionHeaderItem.task}
                                </td>
                              </tr>
                            )}
                            <tr className={isSec1Total ? 'bg-blue-50/40 font-bold' : 'hover:bg-slate-50/70'}>
                              <td className="py-2.5 px-3 tabular-nums text-slate-500 font-bold whitespace-nowrap">
                                {masterCode || idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">
                                  {masterCode
                                    ? p.task.replace(new RegExp(`^${masterCode.replace(/\./g, '\\.')}\\s*`), '')
                                    : p.task}
                                </div>
                                {logCount > 0 && (
                                  <div className="text-[10px] font-semibold text-teal-800 mt-0.5">
                                    {t(
                                      `ከስራ መዝገብ፦ ${logCount} (${logSums.year} ${p.unit})`,
                                      `Logged: ${logCount} entries (${logSums.year} ${p.unit})`
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-slate-600">{p.unit}</td>

                              {period === 'year' ? (
                                workMode === 'plan' ? (
                                  <>
                                    <td className="py-1.5 px-1 text-right bg-blue-50/20">
                                      <input
                                        type="number"
                                        min={0}
                                        value={p.q1Plan}
                                        onChange={(e) => handleInlinePlanFieldUpdate(p, 'q1', e.target.value)}
                                        className="w-14 text-right px-1.5 py-1 rounded border border-slate-200 bg-white font-semibold tabular-nums text-base sm:text-xs"
                                      />
                                    </td>
                                    <td className="py-1.5 px-1 text-right bg-blue-50/20">
                                      <input
                                        type="number"
                                        min={0}
                                        value={p.q2Plan}
                                        onChange={(e) => handleInlinePlanFieldUpdate(p, 'q2', e.target.value)}
                                        className="w-14 text-right px-1.5 py-1 rounded border border-slate-200 bg-white font-semibold tabular-nums text-base sm:text-xs"
                                      />
                                    </td>
                                    <td className="py-1.5 px-1 text-right bg-indigo-50/40">
                                      <input
                                        type="number"
                                        min={0}
                                        value={h1Plan}
                                        onChange={(e) => handleInlinePlanFieldUpdate(p, 'h1', e.target.value)}
                                        className="w-14 text-right px-1.5 py-1 rounded border border-indigo-200 bg-white font-extrabold text-indigo-950 tabular-nums text-base sm:text-xs"
                                      />
                                    </td>
                                    <td className="py-1.5 px-1 text-right bg-blue-50/20">
                                      <input
                                        type="number"
                                        min={0}
                                        value={p.q3Plan}
                                        onChange={(e) => handleInlinePlanFieldUpdate(p, 'q3', e.target.value)}
                                        className="w-14 text-right px-1.5 py-1 rounded border border-slate-200 bg-white font-semibold tabular-nums text-base sm:text-xs"
                                      />
                                    </td>
                                    <td className="py-1.5 px-1 text-right bg-blue-50/20">
                                      <input
                                        type="number"
                                        min={0}
                                        value={p.q4Plan}
                                        onChange={(e) => handleInlinePlanFieldUpdate(p, 'q4', e.target.value)}
                                        className="w-14 text-right px-1.5 py-1 rounded border border-slate-200 bg-white font-semibold tabular-nums text-base sm:text-xs"
                                      />
                                    </td>
                                    <td className="py-1.5 px-1 text-right bg-indigo-50/40">
                                      <input
                                        type="number"
                                        min={0}
                                        value={h2Plan}
                                        onChange={(e) => handleInlinePlanFieldUpdate(p, 'h2', e.target.value)}
                                        className="w-14 text-right px-1.5 py-1 rounded border border-indigo-200 bg-white font-extrabold text-indigo-950 tabular-nums text-base sm:text-xs"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2 text-right bg-sky-50/50">
                                      <input
                                        type="number"
                                        min={0}
                                        value={yearTarget}
                                        onChange={(e) => handleInlinePlanFieldUpdate(p, 'year', e.target.value)}
                                        className="w-16 text-right px-1.5 py-1 rounded border border-sky-300 bg-white font-extrabold text-sky-950 tabular-nums text-base sm:text-xs"
                                      />
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 px-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap">
                                      <div className="inline-flex items-center gap-1">
                                        <span className="text-slate-400">{p.q1Plan}/</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={p.q1Done}
                                          onChange={(e) => handleInlineExecutionUpdate(p, 'q1Done', e.target.value)}
                                          className="w-12 text-right px-1 py-0.5 rounded border border-emerald-200 bg-white font-extrabold text-slate-900 tabular-nums text-base sm:text-xs"
                                        />
                                      </div>
                                    </td>
                                    <td className="py-2 px-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap">
                                      <div className="inline-flex items-center gap-1">
                                        <span className="text-slate-400">{p.q2Plan}/</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={p.q2Done}
                                          onChange={(e) => handleInlineExecutionUpdate(p, 'q2Done', e.target.value)}
                                          className="w-12 text-right px-1 py-0.5 rounded border border-emerald-200 bg-white font-extrabold text-slate-900 tabular-nums text-base sm:text-xs"
                                        />
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-right tabular-nums bg-indigo-50/40 whitespace-nowrap">
                                      <span className="text-indigo-500">{h1Plan}/</span>
                                      <strong className="text-indigo-950">{h1Done}</strong>
                                    </td>
                                    <td className="py-2 px-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap">
                                      <div className="inline-flex items-center gap-1">
                                        <span className="text-slate-400">{p.q3Plan}/</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={p.q3Done}
                                          onChange={(e) => handleInlineExecutionUpdate(p, 'q3Done', e.target.value)}
                                          className="w-12 text-right px-1 py-0.5 rounded border border-emerald-200 bg-white font-extrabold text-slate-900 tabular-nums text-base sm:text-xs"
                                        />
                                      </div>
                                    </td>
                                    <td className="py-2 px-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap">
                                      <div className="inline-flex items-center gap-1">
                                        <span className="text-slate-400">{p.q4Plan}/</span>
                                        <input
                                          type="number"
                                          min={0}
                                          value={p.q4Done}
                                          onChange={(e) => handleInlineExecutionUpdate(p, 'q4Done', e.target.value)}
                                          className="w-12 text-right px-1 py-0.5 rounded border border-emerald-200 bg-white font-extrabold text-slate-900 tabular-nums text-base sm:text-xs"
                                        />
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-right tabular-nums bg-indigo-50/40 whitespace-nowrap">
                                      <span className="text-indigo-500">{h2Plan}/</span>
                                      <strong className="text-indigo-950">{h2Done}</strong>
                                    </td>
                                    <td className="py-2.5 px-3 text-right tabular-nums bg-emerald-50/40 whitespace-nowrap">
                                      <span className="text-slate-500">{yearTarget}/</span>
                                      <strong className="text-emerald-800">{yearDone}</strong>
                                    </td>
                                  </>
                                )
                              ) : (
                                <>
                                  <td className="py-2.5 px-2 text-right tabular-nums font-semibold">{yearTarget}</td>
                                  {(period === 'h1' || period === 'half') && (
                                    <>
                                      <td className="py-2 px-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                                        {workMode === 'plan' ? (
                                          <input
                                            type="number"
                                            min={0}
                                            value={p.q1Plan}
                                            onChange={(e) => handleInlinePlanFieldUpdate(p, 'q1', e.target.value)}
                                            className="w-14 text-right px-1.5 py-1 rounded border border-slate-200 bg-white font-bold text-base sm:text-xs"
                                          />
                                        ) : (
                                          <div className="inline-flex items-center gap-1">
                                            <span className="text-slate-400">{p.q1Plan}/</span>
                                            <input
                                              type="number"
                                              min={0}
                                              value={p.q1Done}
                                              onChange={(e) => handleInlineExecutionUpdate(p, 'q1Done', e.target.value)}
                                              className="w-12 text-right px-1 py-0.5 rounded border border-emerald-200 bg-white font-extrabold text-slate-900 text-base sm:text-xs"
                                            />
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                                        {workMode === 'plan' ? (
                                          <input
                                            type="number"
                                            min={0}
                                            value={p.q2Plan}
                                            onChange={(e) => handleInlinePlanFieldUpdate(p, 'q2', e.target.value)}
                                            className="w-14 text-right px-1.5 py-1 rounded border border-slate-200 bg-white font-bold text-base sm:text-xs"
                                          />
                                        ) : (
                                          <div className="inline-flex items-center gap-1">
                                            <span className="text-slate-400">{p.q2Plan}/</span>
                                            <input
                                              type="number"
                                              min={0}
                                              value={p.q2Done}
                                              onChange={(e) => handleInlineExecutionUpdate(p, 'q2Done', e.target.value)}
                                              className="w-12 text-right px-1 py-0.5 rounded border border-emerald-200 bg-white font-extrabold text-slate-900 text-base sm:text-xs"
                                            />
                                          </div>
                                        )}
                                      </td>
                                    </>
                                  )}
                                  {period === 'h2' && (
                                    <>
                                      <td className="py-2 px-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                                        {workMode === 'plan' ? (
                                          <input
                                            type="number"
                                            min={0}
                                            value={p.q3Plan}
                                            onChange={(e) => handleInlinePlanFieldUpdate(p, 'q3', e.target.value)}
                                            className="w-14 text-right px-1.5 py-1 rounded border border-slate-200 bg-white font-bold text-base sm:text-xs"
                                          />
                                        ) : (
                                          <div className="inline-flex items-center gap-1">
                                            <span className="text-slate-400">{p.q3Plan}/</span>
                                            <input
                                              type="number"
                                              min={0}
                                              value={p.q3Done}
                                              onChange={(e) => handleInlineExecutionUpdate(p, 'q3Done', e.target.value)}
                                              className="w-12 text-right px-1 py-0.5 rounded border border-emerald-200 bg-white font-extrabold text-slate-900 text-base sm:text-xs"
                                            />
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 text-right tabular-nums text-slate-700 whitespace-nowrap">
                                        {workMode === 'plan' ? (
                                          <input
                                            type="number"
                                            min={0}
                                            value={p.q4Plan}
                                            onChange={(e) => handleInlinePlanFieldUpdate(p, 'q4', e.target.value)}
                                            className="w-14 text-right px-1.5 py-1 rounded border border-slate-200 bg-white font-bold text-base sm:text-xs"
                                          />
                                        ) : (
                                          <div className="inline-flex items-center gap-1">
                                            <span className="text-slate-400">{p.q4Plan}/</span>
                                            <input
                                              type="number"
                                              min={0}
                                              value={p.q4Done}
                                              onChange={(e) => handleInlineExecutionUpdate(p, 'q4Done', e.target.value)}
                                              className="w-12 text-right px-1 py-0.5 rounded border border-emerald-200 bg-white font-extrabold text-slate-900 text-base sm:text-xs"
                                            />
                                          </div>
                                        )}
                                      </td>
                                    </>
                                  )}
                                  <td className="py-2.5 px-3 text-right tabular-nums font-extrabold text-blue-900 bg-blue-50/20">
                                    {canEditInlineTarget ? (
                                      <input
                                        type="number"
                                        min={0}
                                        value={target}
                                        onChange={(e) => handleInlinePeriodTargetUpdate(p, e.target.value)}
                                        className="w-16 text-right px-1.5 py-1 rounded border border-blue-200 bg-white font-extrabold text-base sm:text-xs"
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
                                        className="w-16 text-right px-1.5 py-1 rounded border border-emerald-300 bg-white font-extrabold text-base sm:text-xs"
                                      />
                                    ) : (
                                      done
                                    )}
                                  </td>
                                </>
                              )}

                              <td className="py-2.5 px-2 text-right tabular-nums font-extrabold text-slate-800">
                                {pct}%
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{p.role}</td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                                {confirmDeletePlanId === p.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePlan(p.id)}
                                      className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      {t('አረጋግጥ', 'Confirm')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeletePlanId(null)}
                                      className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                                    >
                                      {t('ተው', 'No')}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openWorkLogAdd(p.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer"
                                      title={t('በዚህ ዕቅድ መሰረት የተሰራ ስራ መዝግብ', 'Log work done for this plan')}
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>{t('ስራ መዝግብ', 'Log Work')}</span>
                                    </button>
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
                                      onClick={() => setConfirmDeletePlanId(p.id)}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                      title={t('ሰርዝ', 'Delete')}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {footerSlot}

          {/* Supporting Work Logs for Selected Period in Execution Report */}
          {workMode === 'execution' && periodSupportingLogs.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {t(
                      `የ${PLAN_PERIOD_META[period].shortAm} ክንውን ሪፖርትን የገነቡ የተሰሩ ስራዎች ዝርዝር (${periodSupportingLogs.length})`,
                      `Supporting Work Logs for ${PLAN_PERIOD_META[period].shortEn} (${periodSupportingLogs.length})`
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {t(
                      'ከታች ያሉት ስራዎች በቀጥታ ወደ ላይኛው የሩብ ዓመት / ግማሽ ዓመት / ዓመታዊ ክንውን ድምር ገብተዋል።',
                      'These logged works automatically feed the execution totals above.'
                    )}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2 px-3 text-left">{t('ቀን', 'Date')}</th>
                      <th className="py-2 px-3 text-left">{t('ሩብ ዓመት', 'Quarter')}</th>
                      <th className="py-2 px-3 text-left">{t('የዕቅድ ተግባር', 'Plan Item')}</th>
                      <th className="py-2 px-3 text-left">{t('የተሰራው ስራ', 'Work Performed')}</th>
                      <th className="py-2 px-3 text-right">{t('መጠን', 'Qty')}</th>
                      <th className="py-2 px-3 text-left">{t('ኃላፊ', 'By')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {periodSupportingLogs.map(({ plan, log }) => (
                      <tr key={`sup_${plan.id}_${log.id}`} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <DualDateBadge value={log.date} mode="inline" />
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="inline-flex px-2 py-0.5 rounded bg-teal-50 text-teal-900 text-[10px] font-bold">
                            {getQuarterShortLabel(log.quarter, lang)}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{plan.task}</td>
                        <td className="py-2 px-3 text-slate-700">{log.workTitle}</td>
                        <td className="py-2 px-3 text-right font-extrabold text-emerald-700 tabular-nums whitespace-nowrap">
                          {log.quantity} {plan.unit}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{log.performedBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
      </div>

      {/* Work Execution Logger Modal ("በዕቅዱ መሰረት የተሰራ ስራ መመዝገቢያ") */}
      {isWorkLogOpen && selectedLogPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-700" />
                  <span>
                    {editingLogId
                      ? t('በዕቅዱ መሰረት የተሰራ ስራ አስተካክል', 'Edit Completed Work Entry')
                      : t('በዕቅዱ መሰረት የተሰራ ስራ መዝግብ', 'Log Work Completed Against Plan')}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t(
                    'የተሰራበትን ቀን ሲመርጡ ሩብ ዓመቱን (Q1–Q4) በራሱ ለይቶ በሩብ፣ በግማሽ እና በዓመት ሪፖርት ላይ ያስቀምጣል።',
                    'Pick the date and quantity; Quarter (Q1–Q4) is auto-detected and automatically rolled up to Half-Year and Annual reports.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkLogOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkLog} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የዕቅዱ ተግባር *', 'Planned Activity *')}
                </label>
                <select
                  value={selectedLogPlan.id}
                  onChange={(e) => setLogPlanId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-base sm:text-xs bg-white"
                >
                  {normalizedPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.task} ({t('ዕቅድ', 'Plan')}: {p.yearPlan} {p.unit} | {t('ክንውን', 'Done')}:{' '}
                      {getPlanDoneForPeriod(p, 'year')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('ስራው የተሰራበት ቀን *', 'Completion Date *')}
                </label>
                <DualDateInput required value={logDate} onChange={handleLogDateChange} />
              </div>

              {/* Auto-Detected Quarter & Override Selector */}
              <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-extrabold text-teal-950">
                    <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>
                      {detectedQuarterInfo
                        ? t(
                            `ከቀኑ የተለየው፦ ${detectedQuarterInfo.ethMonthAm} ${detectedQuarterInfo.ethYear} ዓ/ም → የ${detectedQuarterInfo.fiscalPlanYear} ዕቅድ ዘመን · ${getQuarterShortLabel(detectedQuarterInfo.quarter, 'am', detectedQuarterInfo.fiscalPlanYear)}`,
                            `Auto-Detected: ${detectedQuarterInfo.ethMonthEn} ${detectedQuarterInfo.ethYear} E.C. → ${detectedQuarterInfo.fiscalPlanYear} Plan Year · ${getQuarterShortLabel(detectedQuarterInfo.quarter, 'en', detectedQuarterInfo.fiscalPlanYear)}`
                          )
                        : t('ሩብ ዓመት ይምረጡ', 'Select Quarter')}
                    </span>
                  </div>
                  {logQuarterOverridden && detectedQuarterInfo && logQuarter !== detectedQuarterInfo.quarter && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogQuarter(detectedQuarterInfo.quarter);
                        setLogQuarterOverridden(false);
                      }}
                      className="text-[11px] font-bold text-teal-800 underline cursor-pointer"
                    >
                      {t('ወደ ቀኑ ሩብ ዓመት መልስ', 'Reset to Date Quarter')}
                    </button>
                  )}
                </div>

                {detectedQuarterInfo && detectedQuarterInfo.fiscalPlanYear !== curYrNum && (
                  <div className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    {t(
                      `ማስታወሻ፦ ይህ ቀን (${detectedQuarterInfo.ethMonthAm} ${detectedQuarterInfo.ethYear} ዓ/ም) በሐምሌ መጀመሪያ ስሌት የ${detectedQuarterInfo.fiscalPlanYear} ዓ/ም ዕቅድ ዘመን አካል ነው (የተከፈተው ዕቅድ ${curYrNum} ዓ/ም ነው)።`,
                      `Note: ${detectedQuarterInfo.ethMonthEn} ${detectedQuarterInfo.ethYear} belongs to the ${detectedQuarterInfo.fiscalPlanYear} Plan Year (Hamle–Sene), whereas the active plan view is ${curYrNum}.`
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PLAN_QUARTERS.map((qk) => (
                    <button
                      key={qk}
                      type="button"
                      onClick={() => {
                        setLogQuarter(qk);
                        setLogQuarterOverridden(true);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer text-left ${
                        logQuarter === qk
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-teal-200 hover:bg-teal-50'
                      }`}
                    >
                      <div className="font-extrabold">
                        {qk.toUpperCase()} ({PLAN_PERIOD_META[qk].shortAm})
                      </div>
                      <div className={logQuarter === qk ? 'text-teal-100' : 'text-slate-500'}>
                        {qk === 'q1'
                          ? 'ሐምሌ–መስከረም'
                          : qk === 'q2'
                          ? 'ጥቅምት–ታኅሣሥ'
                          : qk === 'q3'
                          ? 'ጥር–መጋቢት'
                          : 'ሚያዝያ–ሰኔ'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t(`የተሰራው መጠን (${selectedLogPlan.unit}) *`, `Completed Quantity (${selectedLogPlan.unit}) *`)}
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={logQuantity}
                    onChange={(e) => setLogQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-extrabold tabular-nums text-base sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ስራውን ያከናወነው / ኃላፊ', 'Performed By')}
                  </label>
                  <input
                    type="text"
                    value={logPerformedBy}
                    onChange={(e) => setLogPerformedBy(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base sm:text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የተሰራው ስራ ዝርዝር / መግለጫ', 'Work Description')}
                </label>
                <input
                  type="text"
                  value={logWorkTitle}
                  onChange={(e) => setLogWorkTitle(e.target.value)}
                  placeholder={selectedLogPlan.task}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('ቦታ / ተጨማሪ ማስታወሻ', 'Location / Notes')}
                </label>
                <input
                  type="text"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base sm:text-xs"
                />
              </div>

              {/* Automatic Rollup Preview */}
              {modalPlanPreview && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-[11px] space-y-1">
                  <div className="font-extrabold text-indigo-950">
                    {t(
                      'ይህ ሲቀመጥ በራሱ የሚዘምኑ ሪፖርቶች፦',
                      'Reports that will automatically update upon saving:'
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 tabular-nums text-indigo-900">
                    <div>
                      <span className="font-semibold">{logQuarter.toUpperCase()}:</span>{' '}
                      <strong>
                        {modalPlanPreview.curQ} → {modalPlanPreview.nextQ}
                      </strong>
                    </div>
                    <div>
                      <span className="font-semibold">
                        {modalPlanPreview.halfKey === 'h1' ? t('1ኛ ግማሽ:', 'H1:') : t('2ኛ ግማሽ:', 'H2:')}
                      </span>{' '}
                      <strong>
                        {modalPlanPreview.curH} → {modalPlanPreview.nextH}
                      </strong>
                    </div>
                    <div>
                      <span className="font-semibold">{t('ዓመት:', 'Annual:')}</span>{' '}
                      <strong>
                        {modalPlanPreview.curY} → {modalPlanPreview.nextY}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWorkLogOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-extrabold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl cursor-pointer"
                >
                  {editingLogId ? t('አስተካክልና አዘምን', 'Update & Rollup') : t('መዝግብና ሪፖርት አዘምን', 'Save & Auto-Rollup')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-base sm:text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መለኪያ', 'Unit')}</label>
                  <input
                    type="text"
                    value={pUnit}
                    onChange={(e) => setPUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የዓመት ዕቅድ', 'Annual Target')}</label>
                  <input
                    type="number"
                    value={pYearPlan}
                    onChange={(e) => handleAutoSplitYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold tabular-nums text-base sm:text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ኃላፊ', 'Owner')}</label>
                  <input
                    type="text"
                    value={pRole}
                    onChange={(e) => setPRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base sm:text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <label className="block font-bold text-slate-700">1ኛ ሩብ (Q1)</label>
                  <div className="text-[10px] text-slate-500 mb-1">ሐምሌ {prevYrNum}–መስከረም {curYrNum}</div>
                  <input type="number" value={pQ1Plan} onChange={(e) => setPQ1Plan(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums text-base sm:text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">2ኛ ሩብ (Q2)</label>
                  <div className="text-[10px] text-slate-500 mb-1">ጥቅምት–ታኅሣሥ {curYrNum}</div>
                  <input type="number" value={pQ2Plan} onChange={(e) => setPQ2Plan(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums text-base sm:text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">3ኛ ሩብ (Q3)</label>
                  <div className="text-[10px] text-slate-500 mb-1">ጥር–መጋቢት {curYrNum}</div>
                  <input type="number" value={pQ3Plan} onChange={(e) => setPQ3Plan(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums text-base sm:text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">4ኛ ሩብ (Q4)</label>
                  <div className="text-[10px] text-slate-500 mb-1">ሚያዝያ–ሰኔ {curYrNum}</div>
                  <input type="number" value={pQ4Plan} onChange={(e) => setPQ4Plan(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg tabular-nums text-base sm:text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">{t('Q1 ክንውን', 'Q1 Done')}</label>
                  <input type="number" value={pQ1Done} onChange={(e) => setPQ1Done(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg tabular-nums text-base sm:text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">{t('Q2 ክንውን', 'Q2 Done')}</label>
                  <input type="number" value={pQ2Done} onChange={(e) => setPQ2Done(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg tabular-nums text-base sm:text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">{t('Q3 ክንውን', 'Q3 Done')}</label>
                  <input type="number" value={pQ3Done} onChange={(e) => setPQ3Done(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg tabular-nums text-base sm:text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">{t('Q4 ክንውን', 'Q4 Done')}</label>
                  <input type="number" value={pQ4Done} onChange={(e) => setPQ4Done(e.target.value)} className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg tabular-nums text-base sm:text-xs" />
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

