import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Calendar,
  Coins,
  Download,
  Edit2,
  FileText,
  Layers,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import {
  DepartmentActivityRecord,
  DepartmentFinanceRecord,
  DepartmentWorkspaceData,
  Role
} from '../types';
import {
  CHILDREN_MINISTRY_CHARTER,
  CHURCH_ORG_UNITS,
  DEFAULT_CHILDREN_INTERNAL_BYLAWS_TEXT
} from '../constants/churchStructure';
import { generateUniqueId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';
import { formatDualDateTimeText, getTodayIsoDateTime } from '../utils/ethiopianDate';
import { DualDateBadge, DualDateInput } from './DualDate';
import { ExportPhotoButton } from './ExportPhotoButton';

interface ChildrenCharterAndProgramsPanelProps {
  currentYear: string;
  currentUserRole: Role | null;
  ws: DepartmentWorkspaceData;
  onUpdateWorkspace: (updater: (prev: DepartmentWorkspaceData) => DepartmentWorkspaceData) => void;
  onNavigateSubTab?: (tabId: 'leadersTab' | 'choirTab' | 'spiritualTab' | 'topAchieversTab' | 'planReportTab' | 'sendToSpiritualTab') => void;
}

type InnerView = 'programs' | 'finance' | 'structure';

export const ChildrenCharterAndProgramsPanel: React.FC<ChildrenCharterAndProgramsPanelProps> = ({
  currentYear,
  currentUserRole,
  ws,
  onUpdateWorkspace,
  onNavigateSubTab
}) => {
  const { t } = useLanguage();
  const childrenPanelExportRef = useRef<HTMLDivElement | null>(null);
  const canEdit =
    currentUserRole === 'admin' ||
    currentUserRole === 'children_coordinator' ||
    currentUserRole === 'leader';

  const childrenUnitDef = useMemo(
    () => CHURCH_ORG_UNITS.find((u) => u.id === 'children_ministry'),
    []
  );
  const activityCategories = childrenUnitDef?.activityCategories || [];
  const financeCategories = childrenUnitDef?.financeCategories || [];

  const [innerView, setInnerView] = useState<InnerView>('programs');

  // Programs / Activities modal state
  const [actCategoryFilter, setActCategoryFilter] = useState<string>('all');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [aDate, setADate] = useState('');
  const [aTitle, setATitle] = useState('');
  const [aCategory, setACategory] = useState(activityCategories[0] || '');
  const [aLocation, setALocation] = useState('');
  const [aParticipants, setAParticipants] = useState('');
  const [aStatus, setAStatus] = useState<'ታቅዷል' | 'በሂደት ላይ' | 'ተጠናቋል'>('ተጠናቋል');
  const [aSummary, setASummary] = useState('');
  const [confirmDeleteActId, setConfirmDeleteActId] = useState<number | null>(null);

  // Finance / Fundraising modal state
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [editingFinanceId, setEditingFinanceId] = useState<number | null>(null);
  const [fDate, setFDate] = useState('');
  const [fType, setFType] = useState<'ገቢ' | 'ወጪ'>('ገቢ');
  const [fCategory, setFCategory] = useState(financeCategories[0] || '');
  const [fDescription, setFDescription] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fReceipt, setFReceipt] = useState('');
  const [confirmDeleteFinId, setConfirmDeleteFinId] = useState<number | null>(null);

  // Internal Bylaws editing state
  const [bylawsDraft, setBylawsDraft] = useState<string>(
    ws.childrenInternalBylaws || DEFAULT_CHILDREN_INTERNAL_BYLAWS_TEXT
  );
  const [bylawsSavedNotice, setBylawsSavedNotice] = useState(false);

  const activities = ws.activities || [];
  const finances = ws.finances || [];
  const committeeCount = (ws.leaders || []).length;

  const filteredActivities = useMemo(() => {
    if (actCategoryFilter === 'all') return activities;
    return activities.filter((a) => a.category === actCategoryFilter);
  }, [activities, actCategoryFilter]);

  const financeSummary = useMemo(() => {
    const income = finances
      .filter((f) => f.type === 'ገቢ')
      .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
    const expense = finances
      .filter((f) => f.type === 'ወጪ')
      .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
    return { income, expense, balance: income - expense };
  }, [finances]);

  // Activity handlers
  const openAddActivity = () => {
    setEditingActivityId(null);
    setADate(getTodayIsoDateTime());
    setATitle('');
    setACategory(activityCategories[0] || 'የመነቃቂያ፣ የማስተማሪያ እና የመዝናኛ ፕሮግራም');
    setALocation('');
    setAParticipants('');
    setAStatus('ተጠናቋል');
    setASummary('');
    setIsActivityModalOpen(true);
  };

  const openEditActivity = (act: DepartmentActivityRecord) => {
    setEditingActivityId(act.id);
    setADate(act.date);
    setATitle(act.title);
    setACategory(act.category);
    setALocation(act.locationOrGroup || '');
    setAParticipants(act.participantsCount !== undefined ? String(act.participantsCount) : '');
    setAStatus(act.status);
    setASummary(act.summary || '');
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aTitle.trim()) return;
    const record: DepartmentActivityRecord = {
      id: editingActivityId ?? generateUniqueId(),
      date: aDate,
      title: aTitle.trim(),
      category: aCategory.trim() || 'ፕሮግራም',
      locationOrGroup: aLocation.trim() || undefined,
      participantsCount: aParticipants.trim() ? parseInt(aParticipants, 10) || 0 : undefined,
      status: aStatus,
      summary: aSummary.trim() || undefined
    };
    onUpdateWorkspace((prev) => ({
      ...prev,
      activities: editingActivityId
        ? (prev.activities || []).map((a) => (a.id === editingActivityId ? record : a))
        : [record, ...(prev.activities || [])]
    }));
    setIsActivityModalOpen(false);
  };

  const handleDeleteActivity = (id: number) => {
    onUpdateWorkspace((prev) => ({
      ...prev,
      activities: (prev.activities || []).filter((a) => a.id !== id)
    }));
    setConfirmDeleteActId(null);
  };

  // Finance handlers
  const openAddFinance = (defaultType: 'ገቢ' | 'ወጪ' = 'ገቢ') => {
    setEditingFinanceId(null);
    setFDate(getTodayIsoDateTime());
    setFType(defaultType);
    setFCategory(financeCategories[0] || 'የገቢ ማሰባሰቢያ ፕሮግራም ገቢ');
    setFDescription('');
    setFAmount('');
    setFReceipt('');
    setIsFinanceModalOpen(true);
  };

  const openEditFinance = (fin: DepartmentFinanceRecord) => {
    setEditingFinanceId(fin.id);
    setFDate(fin.date);
    setFType(fin.type);
    setFCategory(fin.category);
    setFDescription(fin.description);
    setFAmount(String(fin.amount));
    setFReceipt(fin.receiptOrRef || '');
    setIsFinanceModalOpen(true);
  };

  const handleSaveFinance = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmt = parseFloat(fAmount);
    if (!fDescription.trim() || isNaN(numericAmt) || numericAmt < 0) return;
    const record: DepartmentFinanceRecord = {
      id: editingFinanceId ?? generateUniqueId(),
      date: fDate,
      type: fType,
      category: fCategory.trim() || 'የልጆች አገልግሎት',
      description: fDescription.trim(),
      amount: numericAmt,
      receiptOrRef: fReceipt.trim() || undefined
    };
    onUpdateWorkspace((prev) => ({
      ...prev,
      finances: editingFinanceId
        ? (prev.finances || []).map((f) => (f.id === editingFinanceId ? record : f))
        : [record, ...(prev.finances || [])]
    }));
    setIsFinanceModalOpen(false);
  };

  const handleDeleteFinance = (id: number) => {
    onUpdateWorkspace((prev) => ({
      ...prev,
      finances: (prev.finances || []).filter((f) => f.id !== id)
    }));
    setConfirmDeleteFinId(null);
  };

  const handleSaveBylaws = () => {
    onUpdateWorkspace((prev) => ({
      ...prev,
      childrenInternalBylaws: bylawsDraft.trim() || DEFAULT_CHILDREN_INTERNAL_BYLAWS_TEXT,
      childrenCharterSeeded: true
    }));
    setBylawsSavedNotice(true);
    setTimeout(() => setBylawsSavedNotice(false), 3500);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const actRows = [
      [`የልጆች አገልግሎት ፕሮግራሞችና ተግባራት (${currentYear} ዓ/ም)`],
      [],
      ['ተ.ቁ', 'ቀንና ሰዓት', 'ምድብ / ተግባር', 'ርዕስ', 'ቦታ / ቡድን', 'ተሳታፊ', 'ሁኔታ', 'ማብራሪያ'],
      ...activities.map((a, i) => [
        i + 1,
        formatDualDateTimeText(a.date, a.date),
        a.category,
        a.title,
        a.locationOrGroup || '-',
        a.participantsCount ?? '-',
        a.status,
        a.summary || '-'
      ])
    ];
    const finRows = [
      [`የልጆች አገልግሎት የበጀት እና የገቢ ማሰባሰቢያ መዝገብ (${currentYear} ዓ/ም)`],
      [`ጠቅላላ ገቢ: ${financeSummary.income} | ጠቅላላ ወጪ: ${financeSummary.expense} | ቀሪ ሂሳብ: ${financeSummary.balance}`],
      [],
      ['ተ.ቁ', 'ቀንና ሰዓት', 'ዓይነት', 'ምድብ', 'ዝርዝር መግለጫ', 'መጠን (ብር)', 'ደረሰኝ / ማጣቀሻ'],
      ...finances.map((f, i) => [
        i + 1,
        formatDualDateTimeText(f.date, f.date),
        f.type,
        f.category,
        f.description,
        f.amount,
        f.receiptOrRef || '-'
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actRows), 'ፕሮግራሞችና_ተግባራት');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(finRows), 'በጀትና_ገቢ_ማሰባሰቢያ');
    XLSX.writeFile(wb, `የልጆች_አገልግሎት_መርኃግብር_${currentYear}.xlsx`);
  };

  return (
    <div ref={childrenPanelExportRef} className="space-y-5">
      {/* Header & View Switcher */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-700 shrink-0" />
              <span>{t('የልጆች አገልግሎት ፕሮግራሞች፣ በጀት እና አወቃቀር', 'Children Ministry Programs, Budget & Governance')}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {t(
                'የመነቃቂያና የማስተማሪያ ፕሮግራሞች፣ የወንጌል ምስክርነት፣ የርኁራኄ ልምምድ፣ የምስጋናና የአንድነት ቀን፣ የክህሎት ማዳበሪያ፣ የገቢ ማሰባሰቢያ በጀት እና የአገልግሎቱ ውስጣዊ ደንብ።',
                'Manage outreach & recreation programs, thanksgiving & unity day, benevolence, skills, training, fundraising/budget, and internal bylaws.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>
            <ExportPhotoButton
              targetRef={childrenPanelExportRef}
              fileName={`የልጆች_አገልግሎት_መርኃግብር_${currentYear}`}
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

        {/* Summary Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-100">
            <div className="text-[11px] font-bold text-cyan-900">{t('የልጆች ኮሚቴ አባላት (3–7)', 'Committee Size (3–7)')}</div>
            <div className="text-lg font-extrabold text-cyan-950 tabular-nums mt-0.5">
              {committeeCount} <span className="text-xs font-semibold text-cyan-700">/ 3–7</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-600">{t('የተመዘገቡ ፕሮግራሞች', 'Logged Programs')}</div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">{activities.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-900">{t('ገቢ / ገቢ ማሰባሰቢያ', 'Income / Fundraising')}</div>
            <div className="text-lg font-extrabold text-emerald-900 tabular-nums mt-0.5">
              {financeSummary.income.toLocaleString()} <span className="text-xs">{t('ብር', 'ETB')}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
            <div className="text-[11px] font-bold text-indigo-900">{t('ቀሪ በጀት (ወጪ፦ ' + financeSummary.expense.toLocaleString() + ')', 'Net Balance')}</div>
            <div className="text-lg font-extrabold text-indigo-950 tabular-nums mt-0.5">
              {financeSummary.balance.toLocaleString()} <span className="text-xs">{t('ብር', 'ETB')}</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-fit print:hidden">
          <button
            type="button"
            onClick={() => setInnerView('programs')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              innerView === 'programs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-700" />
            <span>{t('ፕሮግራሞችና ልዩ ተግባራት', 'Programs & Activities')} ({activities.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setInnerView('finance')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              innerView === 'finance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t('በጀት እና የገቢ ማሰባሰቢያ', 'Budget & Fundraising')} ({finances.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setInnerView('structure')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              innerView === 'structure' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
            <span>{t('አወቃቀር፣ ተጠሪነት እና ውስጣዊ ደንብ', 'Structure, Charter & Bylaws')}</span>
          </button>
        </div>
      </section>

      {/* Inner View 1: Programs & Activities */}
      {innerView === 'programs' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <select
              value={actCategoryFilter}
              onChange={(e) => setActCategoryFilter(e.target.value)}
              className="px-3 py-2 text-base sm:text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 max-w-full sm:max-w-sm"
            >
              <option value="all">{t('ሁሉም የፕሮግራም ምድቦች', 'All Program Categories')} ({activities.length})</option>
              {activityCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {canEdit && (
              <button
                type="button"
                onClick={openAddActivity}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-800 hover:bg-cyan-700 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('አዲስ ፕሮግራም / ተግባር መዝግብ', 'Log Program / Activity')}</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3 text-left w-10">#</th>
                  <th className="py-2.5 px-3 text-left">{t('ቀንና ሰዓት', 'Date')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ምድብ', 'Category')}</th>
                  <th className="py-2.5 px-3 text-left">{t('የፕሮግራሙ ርዕስ', 'Title')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ቡድን / ቦታ', 'Group / Location')}</th>
                  <th className="py-2.5 px-3 text-right">{t('ተሳታፊ', 'Participants')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Status')}</th>
                  {canEdit && <th className="py-2.5 px-3 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="py-10 px-4 text-center text-slate-500">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold">
                        {t('ገና ምንም ፕሮግራም አልተመዘገበም።', 'No programs or outreach activities logged yet.')}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {t(
                          'የመነቃቂያ፣ የምስጋናና የአንድነት ቀን፣ የርኁራኄ ልምምድ፣ የወንጌል ምስክርነት፣ የስልጠና እና የክህሎት ፕሮግራሞችን እዚህ መመዝገብ ይቻላል።',
                          'Log revival programs, thanksgiving/unity day, benevolence practice, peer witnessing, training, and skills programs here.'
                        )}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 tabular-nums text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <DualDateBadge value={a.date} mode="stacked" showTime />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-cyan-900">{a.category}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div>{a.title}</div>
                        {a.summary && <div className="text-[11px] font-normal text-slate-500 mt-0.5">{a.summary}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{a.locationOrGroup || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">{a.participantsCount ?? '—'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            a.status === 'ተጠናቋል'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : a.status === 'በሂደት ላይ'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                          {confirmDeleteActId === a.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteActivity(a.id)}
                                className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer"
                              >
                                {t('ሰርዝ', 'Delete')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteActId(null)}
                                className="px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                              >
                                {t('ተው', 'No')}
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditActivity(a)}
                                className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteActId(a.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Inner View 2: Budget & Fundraising */}
      {innerView === 'finance' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 text-emerald-800">
                <TrendingUp className="w-4 h-4" />
                {t('ገቢ፦', 'Income:')} {financeSummary.income.toLocaleString()} {t('ብር', 'ETB')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-700">
                <TrendingDown className="w-4 h-4" />
                {t('ወጪ፦', 'Expense:')} {financeSummary.expense.toLocaleString()} {t('ብር', 'ETB')}
              </span>
              <span className="text-slate-900">
                {t('ቀሪ በጀት፦', 'Balance:')} {financeSummary.balance.toLocaleString()} {t('ብር', 'ETB')}
              </span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAddFinance('ገቢ')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('ገቢ / ገቢ ማሰባሰቢያ መዝግብ', 'Add Income / Fundraising')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAddFinance('ወጪ')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('የበጀት ወጪ መዝግብ', 'Add Expense')}</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3 text-left w-10">#</th>
                  <th className="py-2.5 px-3 text-left">{t('ቀንና ሰዓት', 'Date')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ዓይነት', 'Type')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ምድብ', 'Category')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ዝርዝር መግለጫ', 'Description')}</th>
                  <th className="py-2.5 px-3 text-right">{t('መጠን (ብር)', 'Amount (ETB)')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ደረሰኝ', 'Ref')}</th>
                  {canEdit && <th className="py-2.5 px-3 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finances.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="py-10 px-4 text-center text-slate-500">
                      <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold">
                        {t('ገና የልጆች አገልግሎት የበጀት ወይም የገቢ ማሰባሰቢያ መዝገብ አልተመዘገበም።', 'No budget or fundraising records added yet.')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  finances.map((f, idx) => (
                    <tr key={f.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 tabular-nums text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <DualDateBadge value={f.date} mode="stacked" showTime />
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={f.type === 'ገቢ' ? 'text-emerald-700' : 'text-rose-700'}>
                          {f.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{f.category}</td>
                      <td className="py-2.5 px-3 text-slate-700">{f.description}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold tabular-nums">
                        {Number(f.amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{f.receiptOrRef || '—'}</td>
                      {canEdit && (
                        <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                          {confirmDeleteFinId === f.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteFinance(f.id)}
                                className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer"
                              >
                                {t('ሰርዝ', 'Delete')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFinId(null)}
                                className="px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                              >
                                {t('ተው', 'No')}
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditFinance(f)}
                                className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFinId(f.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Inner View 3: Structure, Accountability, Chair Term & Editable Internal Bylaws (ZERO clause numbers) */}
      {innerView === 'structure' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Structure */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-700" />
                  <span>{t('የልጆች አገልግሎት አወቃቀር', 'Children Ministry Structure')}</span>
                </h4>
                {onNavigateSubTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateSubTab('leadersTab')}
                    className="text-xs font-bold text-cyan-800 hover:underline cursor-pointer print:hidden"
                  >
                    {t('የኮሚቴ መሪዎችን አስተዳድር →', 'Manage Committee →')}
                  </button>
                )}
              </div>
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                {CHILDREN_MINISTRY_CHARTER.structure.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-600 mt-1.5 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Accountability & Term */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-800" />
                <span>{t('ተጠሪነት እና የምርጫ ዙር', 'Accountability & Election Term')}</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                {CHILDREN_MINISTRY_CHARTER.accountabilityAndTerms.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 bg-blue-50/50 border border-blue-100 rounded-xl p-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-700 mt-1.5 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Responsibilities & Mandates Checklist */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>{t('የልጆች አገልግሎት ኃላፊነቶችና ተግባራት', 'Responsibilities and Duties')}</span>
              </h4>
              {onNavigateSubTab && (
                <div className="flex flex-wrap gap-2 text-[11px] font-bold print:hidden">
                  <button
                    type="button"
                    onClick={() => onNavigateSubTab('choirTab')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 hover:bg-indigo-100 cursor-pointer"
                  >
                    {t('የጸሎት/መዝሙር/ምስክርነት/ድራማ ቡድኖች', 'Service Teams')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateSubTab('spiritualTab')}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 cursor-pointer"
                  >
                    {t('የደቀ መዝሙርነት ትምህርት', 'Discipleship Lessons')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateSubTab('topAchieversTab')}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer"
                  >
                    {t('መንፈሳዊና የቀለም ት/ት ሽልማት', 'Academic & Spiritual Awards')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateSubTab('planReportTab')}
                    className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-800 hover:bg-cyan-100 cursor-pointer"
                  >
                    {t('ዓመታዊ ዕቅድና ሪፖርት', 'Annual Plan')}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700">
              {CHILDREN_MINISTRY_CHARTER.mandates.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70 leading-relaxed"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Editable Internal Bylaws */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-700" />
                  <span>{t('የልጆች አገልግሎት ውስጣዊ ደንብ', 'Children Ministry Internal Bylaws')}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'አገልግሎቱ ከቤተ ክርስቲያኒቱ መተዳደሪያ ደንብ ጋር የማይጋጭ ውስጣዊ ደንብ እዚህ ማዘጋጀትና ማስቀመጥ ይችላል።',
                    'Maintain non-conflicting internal bylaws and coordinator responsibilities for Children Ministry.'
                  )}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveBylaws}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-800 hover:bg-teal-700 text-white cursor-pointer print:hidden"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('ውስጣዊ ደንብ አስቀምጥ', 'Save Bylaws')}</span>
                </button>
              )}
            </div>

            {bylawsSavedNotice && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                {t('✓ የልጆች አገልግሎት ውስጣዊ ደንብ በተሳካ ሁኔታ ተቀምጧል።', 'Internal bylaws saved successfully.')}
              </div>
            )}

            <textarea
              rows={5}
              readOnly={!canEdit}
              value={bylawsDraft}
              onChange={(e) => setBylawsDraft(e.target.value)}
              className="w-full p-3.5 text-base sm:text-xs leading-relaxed border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-800"
            />
          </section>
        </div>
      )}

      {/* Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingActivityId ? t('ፕሮግራም አስተካክል', 'Edit Program') : t('አዲስ ፕሮግራም መዝግብ', 'Log New Program')}
              </h3>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('የፕሮግራም ምድብ', 'Category')}</label>
                <select
                  value={aCategory}
                  onChange={(e) => setACategory(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-semibold"
                >
                  {activityCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('የፕሮግራሙ ርዕስ *', 'Title *')}</label>
                <input
                  type="text"
                  required
                  value={aTitle}
                  onChange={(e) => setATitle(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ቀንና ሰዓት', 'Date & Time')}</label>
                <DualDateInput includeTime value={aDate} onChange={setADate} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ቡድን / ቦታ', 'Group / Location')}</label>
                  <input
                    type="text"
                    value={aLocation}
                    onChange={(e) => setALocation(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ተሳታፊ ብዛት', 'Participants')}</label>
                  <input
                    type="number"
                    min={0}
                    value={aParticipants}
                    onChange={(e) => setAParticipants(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                <select
                  value={aStatus}
                  onChange={(e) => setAStatus(e.target.value as 'ታቅዷል' | 'በሂደት ላይ' | 'ተጠናቋል')}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                >
                  <option value="ታቅዷል">{t('ታቅዷል', 'Planned')}</option>
                  <option value="በሂደት ላይ">{t('በሂደት ላይ', 'In Progress')}</option>
                  <option value="ተጠናቋል">{t('ተጠናቋል', 'Completed')}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ዝርዝር ማብራሪያ', 'Summary')}</label>
                <textarea
                  rows={2}
                  value={aSummary}
                  onChange={(e) => setASummary(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-cyan-800 hover:bg-cyan-700 rounded-xl cursor-pointer"
                >
                  {t('አስቀምጥ', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finance / Fundraising Modal */}
      {isFinanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingFinanceId ? t('የበጀት መዝገብ አስተካክል', 'Edit Budget Record') : t('አዲስ የበጀት / ገቢ ማሰባሰቢያ መዝገብ', 'Add Budget / Fundraising Record')}
              </h3>
              <button
                type="button"
                onClick={() => setIsFinanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFinance} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {(['ገቢ', 'ወጪ'] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setFType(tp)}
                    className={`py-2 px-3 rounded-xl font-extrabold border cursor-pointer ${
                      fType === tp
                        ? tp === 'ገቢ'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-rose-700 text-white border-rose-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {tp === 'ገቢ' ? t('ገቢ / ገቢ ማሰባሰቢያ', 'Income / Fundraising') : t('የበጀት ወጪ', 'Expense')}
                  </button>
                ))}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ምድብ', 'Category')}</label>
                <select
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-semibold"
                >
                  {financeCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ዝርዝር መግለጫ *', 'Description *')}</label>
                <input
                  type="text"
                  required
                  value={fDescription}
                  onChange={(e) => setFDescription(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መጠን (ብር) *', 'Amount (ETB) *')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={fAmount}
                    onChange={(e) => setFAmount(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl tabular-nums font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ደረሰኝ / ማጣቀሻ', 'Receipt / Ref')}</label>
                  <input
                    type="text"
                    value={fReceipt}
                    onChange={(e) => setFReceipt(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ቀንና ሰዓት', 'Date & Time')}</label>
                <DualDateInput includeTime value={fDate} onChange={setFDate} />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFinanceModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl cursor-pointer"
                >
                  {t('አስቀምጥ', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
