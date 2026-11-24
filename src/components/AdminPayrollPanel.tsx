import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Calculator,
  CheckCircle2,
  Download,
  Printer,
  Search,
  UserCheck,
  Wallet,
  Building2,
  Send
} from 'lucide-react';
import {
  ChurchChild,
  ChurchHRRecord,
  ChurchMember,
  DepartmentFinanceRecord,
  HRCategory
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { ETHIOPIAN_MONTHS_AM, getTodayIsoDate } from '../utils/ethiopianDate';
import { matchesAmharicSearch } from '../utils/amharicSearchAndChapel';
import {
  calculatePayrollBreakdown,
  computeServiceDuration,
  formatBirr,
  resolveHighestEducationLabel,
  roundBirr
} from '../utils/hrProfileAndPayroll';
import { findMatchingChurchMemberForHR, resolveServantChurchFamily } from '../utils/hrMemberMatcher';
import { MinisterProfileModal } from './MinisterProfileModal';
import { ExportPhotoButton } from './ExportPhotoButton';
import { PersonAvatarBadge } from './PersonAvatarBadge';

interface AdminPayrollPanelProps {
  currentYear: string;
  records: ChurchHRRecord[];
  churchMembers?: ChurchMember[];
  churchChildren?: ChurchChild[];
  onUpdateChurchMember?: (member: ChurchMember) => void;
  onUpdateChurchChild?: (child: ChurchChild) => void;
  onSaveRecords: (updated: ChurchHRRecord[]) => void;
  onRecordFinanceExpense?: (entry: Omit<DepartmentFinanceRecord, 'id'>) => void;
}

export const AdminPayrollPanel: React.FC<AdminPayrollPanelProps> = ({
  currentYear,
  records,
  churchMembers = [],
  churchChildren = [],
  onUpdateChurchMember,
  onUpdateChurchChild,
  onSaveRecords,
  onRecordFinanceExpense
}) => {
  const { t, lang } = useLanguage();
  const payrollExportRef = useRef<HTMLDivElement | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(ETHIOPIAN_MONTHS_AM[2]); // ኅዳር default or current
  const [categoryFilter, setCategoryFilter] = useState<'all' | HRCategory>('all');
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileRecordId, setProfileRecordId] = useState<number | null>(null);
  const [confirmFinancePost, setConfirmFinancePost] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Draft map for smooth numeric salary editing (prevents cursor jumps when typing decimals)
  const [salaryDrafts, setSalaryDrafts] = useState<{ [id: number]: string }>({});

  useEffect(() => {
    const next: { [id: number]: string } = {};
    records.forEach((r) => {
      next[r.id] = r.monthlySalary !== undefined ? String(r.monthlySalary) : '';
    });
    setSalaryDrafts(next);
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (activeOnly && r.status && r.status !== 'በስራ ላይ') return false;
      const edu = resolveHighestEducationLabel(r);
      const tenure = computeServiceDuration(r.hireDate, r.serviceYears, lang);
      return matchesAmharicSearch(
        searchQuery,
        r.name,
        edu,
        tenure,
        r.bankAccountNumber || '',
        r.bankName || '',
        r.roleTitle
      );
    });
  }, [records, categoryFilter, activeOnly, searchQuery, lang]);

  const rowsWithCalc = useMemo(() => {
    return filtered.map((r) => {
      const draftStr = salaryDrafts[r.id] ?? (r.monthlySalary !== undefined ? String(r.monthlySalary) : '');
      const calc = calculatePayrollBreakdown(draftStr, Boolean(r.pensionExempt));
      const edu = resolveHighestEducationLabel(r);
      const tenure = computeServiceDuration(r.hireDate, r.serviceYears, lang);
      return {
        record: r,
        edu,
        tenure,
        draftStr,
        ...calc
      };
    });
  }, [filtered, salaryDrafts, lang]);

  const totals = useMemo(() => {
    let grossTotal = 0;
    let employee7Total = 0;
    let church11Total = 0;
    let pension18Total = 0;
    let netTotal = 0;
    let churchOutlayTotal = 0;
    let salariedCount = 0;

    rowsWithCalc.forEach((row) => {
      if (row.grossSalary > 0) salariedCount += 1;
      grossTotal += row.grossSalary;
      employee7Total += row.employeePension7;
      church11Total += row.churchPension11;
      pension18Total += row.totalPension18;
      netTotal += row.netSalary;
      churchOutlayTotal += row.totalChurchOutlay;
    });

    return {
      count: rowsWithCalc.length,
      salariedCount,
      grossTotal: roundBirr(grossTotal),
      employee7Total: roundBirr(employee7Total),
      church11Total: roundBirr(church11Total),
      pension18Total: roundBirr(pension18Total),
      netTotal: roundBirr(netTotal),
      churchOutlayTotal: roundBirr(churchOutlayTotal)
    };
  }, [rowsWithCalc]);

  const updateRecordField = (id: number, patch: Partial<ChurchHRRecord>) => {
    onSaveRecords(records.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSalaryInputChange = (id: number, raw: string) => {
    setSalaryDrafts((prev) => ({ ...prev, [id]: raw }));
    const trimmed = raw.trim();
    if (!trimmed) {
      updateRecordField(id, { monthlySalary: undefined });
      return;
    }
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0) {
      updateRecordField(id, { monthlySalary: roundBirr(parsed) });
    }
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headerTitle = `የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን — የ${selectedMonth} ${currentYear} ዓ/ም የአገልጋዮችና ሠራተኞች ደመወዝ ፔሮል`;
    const rows = [
      [headerTitle],
      [],
      [
        'ተ.ቁ',
        'ሙሉ ስም',
        'ምድብ',
        'ጾታ',
        'የትምህርት ደረጃ',
        'የአገልግሎት ዘመን',
        'የባንክ ስም',
        'የባንክ አካውንት ቁጥር',
        'የደመወዝ መጠን (Gross)',
        '7% ከአገልጋዩ (ተቀናሽ)',
        '11% ከቤተክርስቲያን (ደመወዝ ሳይነካ)',
        '18% ጠቅላላ ጡሬታ (7%+11%)',
        'የተጣራ ደመወዝ (7% ተቀንሶ)'
      ],
      ...rowsWithCalc.map((row, idx) => [
        idx + 1,
        row.record.name,
        row.record.category === 'full_time_minister' ? 'የሙሉ ጊዜ አገልጋይ' : 'የአስተዳደር ሠራተኛ',
        row.record.gender,
        row.edu || '-',
        row.tenure || '-',
        row.record.bankName || '-',
        row.record.bankAccountNumber || '-',
        row.grossSalary,
        row.employeePension7,
        row.churchPension11,
        row.totalPension18,
        row.netSalary
      ]),
      [
        '',
        'ጠቅላላ ድምር',
        '',
        '',
        '',
        '',
        '',
        `${totals.count} ሰዎች`,
        totals.grossTotal,
        totals.employee7Total,
        totals.church11Total,
        totals.pension18Total,
        totals.netTotal
      ]
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, 'የደመወዝ_ፔሮል');
    XLSX.writeFile(wb, `የአገልጋዮች_ደመወዝ_ፔሮል_${selectedMonth}_${currentYear}.xlsx`);
  };

  const handleConfirmPostFinance = () => {
    if (!onRecordFinanceExpense || totals.churchOutlayTotal <= 0) return;
    onRecordFinanceExpense({
      date: getTodayIsoDate(),
      type: 'ወጪ',
      category: 'የአገልጋዮች ደመወዝና ጡሬታ (Payroll)',
      description: `የ${selectedMonth} ${currentYear} ዓ/ም ወርሃዊ ፔሮል (${totals.salariedCount} ሰዎች) — የተጣራ ደመወዝ ${formatBirr(
        totals.netTotal
      )} + 18% ጡሬታ ${formatBirr(totals.pension18Total)} (7% ከአገልጋዩ ${formatBirr(
        totals.employee7Total
      )} + 11% ከቤ/ክ ${formatBirr(totals.church11Total)})`,
      amount: totals.churchOutlayTotal,
      receiptOrRef: `PAYROLL-${currentYear}-${selectedMonth}`
    });
    setConfirmFinancePost(false);
    setFeedbackMsg(
      t(
        `✓ የ${selectedMonth} ${currentYear} ዓ/ም ጠቅላላ የደመወዝና 11% የቤተክርስቲያን ጡሬታ ወጪ (${formatBirr(
          totals.churchOutlayTotal
        )} ብር) ወደ ፋይናንስ ወጪ መዝገብ ተመዝግቧል።`,
        `✓ Recorded ${selectedMonth} ${currentYear} payroll expense (${formatBirr(
          totals.churchOutlayTotal
        )} ETB) into Finance ledger.`
      )
    );
    setTimeout(() => setFeedbackMsg(''), 5500);
  };

  const activeProfileRecord = useMemo(
    () => (profileRecordId !== null ? records.find((r) => r.id === profileRecordId) || null : null),
    [profileRecordId, records]
  );

  const activeProfileResolvedPhone = useMemo(() => {
    if (!activeProfileRecord) return undefined;
    if (activeProfileRecord.phone?.trim()) return activeProfileRecord.phone.trim();
    return findMatchingChurchMemberForHR(activeProfileRecord.name, churchMembers).phone;
  }, [activeProfileRecord, churchMembers]);

  return (
    <div ref={payrollExportRef} className="space-y-5">
      {/* Top Payroll Header & Controls */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>{t('የአገልጋዮችና ሠራተኞች ወርሃዊ ደመወዝ ፔሮል (Payroll)', 'Church Ministers & Staff Monthly Payroll')}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {t(
                'የጡሬታ ስሌት 18% (7% ከአገልጋዩ ደመወዝ የሚቀነስ + 11% ከቤተክርስቲያን የአገልጋዩ ደመወዝ ሳይነካ) እና ከደመወዙ 7% ብቻ ተቀንሶ የሚገኘው የተጣራ ድምር።',
                '18% Pension Formula: 7% employee deduction + 11% church contribution (without reducing gross salary) = 18% total pension; Net Pay = 93% of gross.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select
              aria-label={t('የደመወዝ ወር', 'Payroll Month')}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-xl text-base sm:text-xs font-extrabold border border-slate-200 bg-slate-50 text-slate-900 cursor-pointer"
            >
              {ETHIOPIAN_MONTHS_AM.map((m) => (
                <option key={m} value={m}>
                  {m} {currentYear}
                </option>
              ))}
            </select>

            {onRecordFinanceExpense && totals.churchOutlayTotal > 0 && (
              <button
                type="button"
                onClick={() => setConfirmFinancePost(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('ወደ ፋይናንስ ወጪ መዝግብ', 'Post to Finance Ledger')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>

            <ExportPhotoButton
              targetRef={payrollExportRef}
              fileName={`የአገልጋዮች_ደመወዝ_ፔሮል_${selectedMonth}_${currentYear}`}
            />

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('ፔሮል አትም', 'Print Payroll')}</span>
            </button>
          </div>
        </div>

        {/* Print Header Banner (only visible when printing) */}
        <div className="hidden print:block mt-3 pt-3 border-t border-slate-300 text-center">
          <div className="text-base font-extrabold text-slate-900">
            የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን — አስተዳደርና ፋይናንስ መምሪያ
          </div>
          <div className="text-sm font-bold text-slate-700 mt-0.5">
            የ{selectedMonth} {currentYear} ዓ/ም የአገልጋዮችና ሠራተኞች ወርሃዊ ደመወዝ ፔሮል
          </div>
        </div>

        {confirmFinancePost && (
          <div className="mt-4 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden">
            <div className="font-bold text-indigo-950">
              {t(
                `የ${selectedMonth} ${currentYear} ዓ/ም ጠቅላላ የቤተክርስቲያን ወጪ ${formatBirr(
                  totals.churchOutlayTotal
                )} ብር (የተጣራ ደመወዝ ${formatBirr(totals.netTotal)} + 18% ጡሬታ ${formatBirr(
                  totals.pension18Total
                )}) ወደ አስተዳደርና ፋይናንስ ወጪ መዝገብ ይመዝገብ?`,
                `Post ${selectedMonth} ${currentYear} total church outlay (${formatBirr(
                  totals.churchOutlayTotal
                )} ETB) to Admin & Finance ledger?`
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirmPostFinance}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-white font-bold cursor-pointer"
              >
                {t('አዎ፣ መዝግብ', 'Yes, Record')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmFinancePost(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
              >
                {t('ተወው', 'Cancel')}
              </button>
            </div>
          </div>
        )}

        {feedbackMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* 5 KPI Summary Cards */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-500">
              {t('1. የደመወዝ መጠን (Gross)', '1. Gross Salary')}
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {formatBirr(totals.grossTotal)} <span className="text-[11px] font-bold text-slate-500">{t('ብር', 'ETB')}</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
              {t('ደመወዝ የተሞላላቸው፦', 'Salaried:')} {totals.salariedCount}/{totals.count}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80">
            <div className="text-[11px] font-bold text-rose-800">
              {t('2. 7% ከአገልጋዩ (ተቀናሽ)', '2. 7% Employee Pension')}
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-rose-900 tabular-nums mt-1">
              {formatBirr(totals.employee7Total)} <span className="text-[11px] font-bold text-rose-700">{t('ብር', 'ETB')}</span>
            </div>
            <div className="text-[10px] font-semibold text-rose-700 mt-0.5">
              {t('ከአገልጋዩ ደመወዝ የሚቀነስ', 'Deducted from salary')}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <div className="text-[11px] font-bold text-blue-800">
              {t('3. 11% ከቤተክርስቲያን', '3. 11% Church Contribution')}
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-blue-900 tabular-nums mt-1">
              {formatBirr(totals.church11Total)} <span className="text-[11px] font-bold text-blue-700">{t('ብር', 'ETB')}</span>
            </div>
            <div className="text-[10px] font-semibold text-blue-700 mt-0.5">
              {t('የአገልጋዩ ደመወዝ ሳይነካ', 'Without touching salary')}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
            <div className="text-[11px] font-bold text-amber-900">
              {t('4. 18% ጠቅላላ ጡሬታ (7%+11%)', '4. Total Pension 18%')}
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-amber-950 tabular-nums mt-1">
              {formatBirr(totals.pension18Total)} <span className="text-[11px] font-bold text-amber-800">{t('ብር', 'ETB')}</span>
            </div>
            <div className="text-[10px] font-semibold text-amber-800 mt-0.5">
              {t('ከአገልጋዩ 7% + ከቤ/ክ 11% ድምር', 'Sum of 7% + 11%')}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 col-span-2 md:col-span-1">
            <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" />
              <span>{t('5. የተጣራ ድምር (7% ተቀንሶ)', '5. Net Payable (Gross - 7%)')}</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-950 tabular-nums mt-1">
              {formatBirr(totals.netTotal)} <span className="text-[11px] font-bold text-emerald-700">{t('ብር', 'ETB')}</span>
            </div>
            <div className="text-[10px] font-semibold text-emerald-800 mt-0.5 tabular-nums flex items-center gap-1">
              <Building2 className="w-3 h-3 shrink-0" />
              <span>
                {t('ጠቅላላ የቤ/ክ ወጪ (ደመወዝ+11%)፦', 'Total Church Outlay:')} {formatBirr(totals.churchOutlayTotal)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Toolbar + Payroll Table / Mobile Cards */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {t('ሁሉም', 'All')}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('full_time_minister')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'full_time_minister'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                {t('የሙሉ ጊዜ አገልጋዮች', 'Full-Time Ministers')}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('admin_staff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'admin_staff'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                {t('የአስተዳደር ሠራተኞች', 'Admin Staff')}
              </button>
            </div>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-700"
              />
              <span>{t('በስራ ላይ ያሉ ብቻ', 'Active Only')}</span>
            </label>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ስም፣ ትምህርት ወይም ባንክ አካውንት ፈልግ...', 'Search name, education, bank...')}
              className="w-full pl-8 pr-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Desktop Payroll Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold">
                <th className="py-3 px-2.5 text-left w-9">#</th>
                <th className="py-3 px-3 text-left">{t('ስም', 'Name')}</th>
                <th className="py-3 px-2 text-center">{t('ጾታ', 'Sex')}</th>
                <th className="py-3 px-2.5 text-left">{t('የትምህርት ደረጃ', 'Education Level')}</th>
                <th className="py-3 px-2.5 text-left">{t('የአገልግሎት ዘመን', 'Service Years')}</th>
                <th className="py-3 px-2.5 text-left">{t('የባንክ አካውንት ቁጥር', 'Bank Account No.')}</th>
                <th className="py-3 px-2.5 text-right">{t('የደመወዝ መጠን', 'Gross Salary')}</th>
                <th className="py-3 px-2.5 text-right text-rose-800 bg-rose-50/50">
                  {t('7% ከአገልጋዩ', '7% Employee')}
                </th>
                <th className="py-3 px-2.5 text-right text-blue-900 bg-blue-50/50">
                  {t('11% ከቤ/ክ (ሳይነካ)', '11% Church')}
                </th>
                <th className="py-3 px-2.5 text-right text-amber-900 bg-amber-50/60">
                  {t('18% ጡሬታ (7%+11%)', '18% Pension')}
                </th>
                <th className="py-3 px-3 text-right text-emerald-900 bg-emerald-50/70">
                  {t('የተጣራ ድምር (7% ተቀንሶ)', 'Net Pay (93%)')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowsWithCalc.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500 font-semibold">
                    {t('በተመረጠው ማጣሪያ ውስጥ ምንም አገልጋይ ወይም ሠራተኛ አልተገኘም።', 'No personnel records match the current filter.')}
                  </td>
                </tr>
              ) : (
                rowsWithCalc.map((row, idx) => {
                  const r = row.record;
                  const fam = resolveServantChurchFamily(r, churchMembers, churchChildren);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 align-middle">
                      <td className="py-2.5 px-2.5 tabular-nums text-slate-500 font-semibold">{idx + 1}</td>
                      <td className="py-2.5 px-3 min-w-[195px]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <PersonAvatarBadge
                              name={r.name}
                              gender={r.gender}
                              photoDataUrl={r.photoDataUrl}
                              photoStorageKey={r.photoStorageKey}
                              fallbackPhotoDataUrl={fam.selfMember?.photoDataUrl}
                              fallbackPhotoStorageKey={fam.selfMember?.photoStorageKey}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setProfileRecordId(r.id)}
                                className="font-extrabold text-slate-900 hover:text-teal-800 hover:underline text-left cursor-pointer truncate block"
                              >
                                {r.name}
                              </button>
                              <div className="text-[10px] font-semibold text-slate-500">
                                {r.category === 'full_time_minister'
                                  ? t('የሙሉ ጊዜ አገልጋይ', 'Full-Time Minister')
                                  : t('የአስተዳደር ሠራተኛ', 'Admin Staff')}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setProfileRecordId(r.id)}
                            className="p-1 text-teal-700 hover:bg-teal-50 rounded-lg print:hidden cursor-pointer shrink-0"
                            title={t('ፕሮፋይል ክፈት', 'Open Profile')}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700">{r.gender}</td>
                      <td className="py-2.5 px-2.5 min-w-[140px]">
                        <input
                          type="text"
                          value={r.educationLevel || ''}
                          onChange={(e) => updateRecordField(r.id, { educationLevel: e.target.value })}
                          placeholder={row.edu || t('የትምህርት ደረጃ', 'Education')}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white print:hidden"
                        />
                        <span className="hidden print:inline font-semibold">{row.edu || '—'}</span>
                      </td>
                      <td className="py-2.5 px-2.5 min-w-[115px]">
                        <input
                          type="text"
                          value={r.serviceYears || ''}
                          onChange={(e) => updateRecordField(r.id, { serviceYears: e.target.value })}
                          placeholder={row.tenure || t('ምሳሌ፦ 5 ዓመት', 'e.g. 5 yrs')}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white print:hidden"
                        />
                        <span className="hidden print:inline font-semibold">{row.tenure || '—'}</span>
                      </td>
                      <td className="py-2.5 px-2.5 min-w-[155px]">
                        <input
                          type="text"
                          value={r.bankAccountNumber || ''}
                          onChange={(e) => updateRecordField(r.id, { bankAccountNumber: e.target.value })}
                          placeholder={t('የባንክ አካውንት ቁጥር', 'Account No.')}
                          className="w-full px-2 py-1 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-white print:hidden"
                        />
                        <span className="hidden print:inline font-mono font-semibold">
                          {r.bankAccountNumber || '—'}
                        </span>
                        {r.bankName && (
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{r.bankName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right min-w-[120px]">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.draftStr}
                          onChange={(e) => handleSalaryInputChange(r.id, e.target.value)}
                          placeholder="0.00"
                          className="w-28 text-right px-2 py-1 text-xs font-mono font-extrabold border border-slate-300 rounded-lg bg-white tabular-nums print:hidden"
                        />
                        <span className="hidden print:inline font-extrabold tabular-nums">
                          {formatBirr(row.grossSalary)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold tabular-nums text-rose-800 bg-rose-50/30 whitespace-nowrap">
                        {formatBirr(row.employeePension7)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold tabular-nums text-blue-900 bg-blue-50/30 whitespace-nowrap">
                        {formatBirr(row.churchPension11)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-extrabold tabular-nums text-amber-900 bg-amber-50/40 whitespace-nowrap">
                        {formatBirr(row.totalPension18)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold tabular-nums text-emerald-950 bg-emerald-50/50 whitespace-nowrap">
                        {formatBirr(row.netSalary)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rowsWithCalc.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold text-xs">
                  <td colSpan={6} className="py-3 px-3">
                    {t(
                      `ጠቅላላ ድምር (${totals.count} ሰዎች · ${selectedMonth} ${currentYear} ዓ/ም)`,
                      `Grand Total (${totals.count} personnel · ${selectedMonth} ${currentYear})`
                    )}
                  </td>
                  <td className="py-3 px-2.5 text-right tabular-nums whitespace-nowrap">
                    {formatBirr(totals.grossTotal)}
                  </td>
                  <td className="py-3 px-2.5 text-right tabular-nums text-rose-200 whitespace-nowrap">
                    {formatBirr(totals.employee7Total)}
                  </td>
                  <td className="py-3 px-2.5 text-right tabular-nums text-sky-200 whitespace-nowrap">
                    {formatBirr(totals.church11Total)}
                  </td>
                  <td className="py-3 px-2.5 text-right tabular-nums text-amber-300 whitespace-nowrap">
                    {formatBirr(totals.pension18Total)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-emerald-300 whitespace-nowrap">
                    {formatBirr(totals.netTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile / Tablet Payroll Cards (iPhone & Android friendly) */}
        <div className="lg:hidden divide-y divide-slate-200">
          {rowsWithCalc.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500 text-sm font-semibold">
              {t('በተመረጠው ማጣሪያ ውስጥ ምንም አገልጋይ ወይም ሠራተኛ አልተገኘም።', 'No matching records found.')}
            </div>
          ) : (
            rowsWithCalc.map((row, idx) => {
              const r = row.record;
              const fam = resolveServantChurchFamily(r, churchMembers, churchChildren);
              return (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <PersonAvatarBadge
                        name={r.name}
                        gender={r.gender}
                        photoDataUrl={r.photoDataUrl}
                        photoStorageKey={r.photoStorageKey}
                        fallbackPhotoDataUrl={fam.selfMember?.photoDataUrl}
                        fallbackPhotoStorageKey={fam.selfMember?.photoStorageKey}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400 tabular-nums">#{idx + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              r.category === 'full_time_minister'
                                ? 'bg-teal-50 text-teal-900 border border-teal-200'
                                : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                            }`}
                          >
                            {r.category === 'full_time_minister'
                              ? t('የሙሉ ጊዜ አገልጋይ', 'Full-Time Minister')
                              : t('የአስተዳደር ሠራተኛ', 'Admin Staff')}
                          </span>
                          <span className="text-xs font-bold text-slate-600">{r.gender}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfileRecordId(r.id)}
                          className="text-base font-extrabold text-slate-900 hover:text-teal-800 mt-1 text-left cursor-pointer"
                        >
                          {r.name}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileRecordId(r.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 text-xs font-bold cursor-pointer shrink-0 print:hidden"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t('ፕሮፋይል', 'Profile')}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {t('የትምህርት ደረጃ', 'Education Level')}
                      </label>
                      <input
                        type="text"
                        value={r.educationLevel || ''}
                        onChange={(e) => updateRecordField(r.id, { educationLevel: e.target.value })}
                        placeholder={row.edu || t('የትምህርት ደረጃ', 'Education')}
                        className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {t('የአገልግሎት ዘመን', 'Service Years')}
                      </label>
                      <input
                        type="text"
                        value={r.serviceYears || ''}
                        onChange={(e) => updateRecordField(r.id, { serviceYears: e.target.value })}
                        placeholder={row.tenure || t('ምሳሌ፦ 5 ዓመት', 'e.g. 5 yrs')}
                        className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {t('የባንክ አካውንት ቁጥር', 'Bank Account Number')}
                      </label>
                      <input
                        type="text"
                        value={r.bankAccountNumber || ''}
                        onChange={(e) => updateRecordField(r.id, { bankAccountNumber: e.target.value })}
                        placeholder="1000..."
                        className="w-full px-3 py-2 text-base sm:text-xs font-mono font-bold border border-slate-200 rounded-xl bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {t('የደመወዝ መጠን (Gross)', 'Gross Salary (ETB)')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={row.draftStr}
                        onChange={(e) => handleSalaryInputChange(r.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-base sm:text-xs font-mono font-extrabold border border-slate-300 rounded-xl bg-white tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Mobile Payroll Breakdown Summary Box */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-rose-700">{t('7% ከአገልጋዩ (ተቀናሽ)', '7% Employee')}</div>
                      <div className="font-extrabold text-rose-900 tabular-nums">{formatBirr(row.employeePension7)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-blue-700">{t('11% ከቤ/ክ (ደመወዝ ሳይነካ)', '11% Church')}</div>
                      <div className="font-extrabold text-blue-900 tabular-nums">{formatBirr(row.churchPension11)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-amber-800">{t('18% ጠቅላላ ጡሬታ (7%+11%)', '18% Total Pension')}</div>
                      <div className="font-extrabold text-amber-950 tabular-nums">{formatBirr(row.totalPension18)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-800">{t('የተጣራ ድምር (7% ተቀንሶ)', 'Net Pay (93%)')}</div>
                      <div className="font-extrabold text-emerald-950 tabular-nums">{formatBirr(row.netSalary)}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Print Signature Footer */}
        <div className="hidden print:grid grid-cols-3 gap-6 p-6 border-t border-slate-300 text-xs font-bold text-slate-800">
          <div>
            <div>ያዘጋጀው ስምና ፊርማ፦ _______________________</div>
            <div className="mt-2">ቀን፦ ___________________</div>
          </div>
          <div>
            <div>ያረጋገጠው ስምና ፊርማ፦ _______________________</div>
            <div className="mt-2">ቀን፦ ___________________</div>
          </div>
          <div>
            <div>ያጸደቀው ስምና ፊርማ፦ _______________________</div>
            <div className="mt-2">ቀን፦ ___________________</div>
          </div>
        </div>
      </section>

      {activeProfileRecord && (
        <MinisterProfileModal
          record={activeProfileRecord}
          resolvedPhone={activeProfileResolvedPhone}
          churchMembers={churchMembers}
          churchChildren={churchChildren}
          onUpdateChurchMember={onUpdateChurchMember}
          onUpdateChurchChild={onUpdateChurchChild}
          onClose={() => setProfileRecordId(null)}
          onSaveRecord={(updated) => {
            onSaveRecords(records.map((r) => (r.id === updated.id ? updated : r)));
          }}
        />
      )}
    </div>
  );
};
