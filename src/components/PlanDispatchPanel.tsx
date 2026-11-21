import React, { useMemo, useState } from 'react';
import {
  Send,
  Inbox,
  Upload,
  Download,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  Loader2,
  Building2,
  AlertTriangle,
  Copy,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { AnnualPlanItem, OrgUnitId, PlanDispatchItem } from '../types';
import { CHURCH_ORG_UNITS, getOrgUnitById } from '../constants/churchStructure';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import {
  ParsedSectorPlanGroup,
  downloadMasterPlanTemplateExcel,
  parseMasterPlanForSectors
} from '../utils/sectorPlanDistributor';
import { ensureQuartersOnPlan, splitAnnualAcrossQuarters } from '../utils/planParser';
import { generateUniqueId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';
import { DualDateBadge } from './DualDate';

export type AutoApplyDispatchMode = 'inbox_only' | 'push_append' | 'push_replace';

interface PlanBulkSenderPanelProps {
  currentYear: string;
  sentByUnitId?: OrgUnitId;
  sentByName: string;
  chapelList?: string[];
  dispatches: PlanDispatchItem[];
  onDispatchPlans: (
    packets: Omit<PlanDispatchItem, 'id' | 'sentAt' | 'status'>[],
    autoApplyMode?: AutoApplyDispatchMode
  ) => void;
  onDeleteDispatch?: (id: number) => void;
}

export const PlanBulkSenderPanel: React.FC<PlanBulkSenderPanelProps> = ({
  currentYear,
  sentByUnitId,
  sentByName,
  chapelList = DEFAULT_CHAPELS,
  dispatches,
  onDispatchPlans,
  onDeleteDispatch
}) => {
  const { t, unitName: getUnitLabel, chapelLabel } = useLanguage();
  const [targetYear, setTargetYear] = useState<string>(currentYear || '2019');
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [groups, setGroups] = useState<ParsedSectorPlanGroup[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmPushReplace, setConfirmPushReplace] = useState(false);

  // Manual quick-add modal state (send 1+ tasks directly without a file)
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualTask, setManualTask] = useState('');
  const [manualUnit, setManualUnit] = useState('በቁጥር');
  const [manualYearPlan, setManualYearPlan] = useState('12');
  const [manualTargets, setManualTargets] = useState<Set<string>>(new Set(['evangelism']));

  // Broadcast unassigned rows to multiple sectors
  const [broadcastSourceKey, setBroadcastSourceKey] = useState<string | null>(null);
  const [broadcastTargets, setBroadcastTargets] = useState<Set<string>>(new Set());

  // Tracker filter
  const [trackerYearFilter, setTrackerYearFilter] = useState<string>('all');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'returned'>('all');

  const showMsg = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 6500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setConfirmPushReplace(false);
    try {
      const parsed = await parseMasterPlanForSectors(file, targetYear || '2019');
      if (parsed.length === 0) {
        showMsg(
          'error',
          t(
            'ከተጫነው ፋይል የዘርፍ ዕቅዶች ማውጣት አልተቻለም። እባክዎ የናሙናውን Excel ቅርጽ ይመልከቱ።',
            'Could not extract sector plans from that file. Try the sample Excel format.'
          )
        );
      } else {
        setSourceFileName(file.name);
        setGroups(parsed);
        const validKeys = new Set(
          parsed.filter((g) => g.targetUnitId !== 'unassigned').map((g) => g.key)
        );
        setSelectedKeys(validKeys);
        setExpandedGroupKey(parsed[0]?.key || null);
        const totalTasks = parsed.reduce((s, g) => s + g.plans.length, 0);
        showMsg(
          'success',
          t(
            `✓ ከ "${file.name}" ለ${parsed.length} ዘርፎች/ቻፕሎች የሚሆኑ ${totalTasks} የዕቅድ ተግባራት ተለይተው ተዘጋጅተዋል!`,
            `✓ Parsed ${totalTasks} plan activities across ${parsed.length} sectors/chapels from "${file.name}"!`
          )
        );
      }
    } catch {
      showMsg(
        'error',
        t(
          'ፋይሉን በማንበብ ላይ ስህተት ተፈጥሯል። Excel (.xlsx), PDF ወይም Word (.docx) ይሞክሩ።',
          'Failed to parse file. Please upload Excel (.xlsx), PDF, or Word (.docx).'
        )
      );
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  const handleChangeGroupTarget = (
    groupKey: string,
    newUnitId: OrgUnitId | 'unassigned',
    newChapel?: string
  ) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.key !== groupKey) return g;
        if (newUnitId === 'unassigned') {
          return {
            ...g,
            targetUnitId: 'unassigned',
            targetUnitName: g.sourceLabel,
            targetChapel: undefined
          };
        }
        const unit = getOrgUnitById(newUnitId);
        const resolvedName =
          newUnitId === 'chapels_dept' && newChapel
            ? `${unit?.name || 'ቻፕሎች'} — ${newChapel}`
            : unit?.name || newUnitId;
        const nextKey = `${newUnitId}${newChapel ? `::${newChapel}` : ''}::${Math.random().toString(36).slice(2, 6)}`;
        setSelectedKeys((sk) => {
          const nextSet = new Set(sk);
          if (nextSet.has(groupKey)) {
            nextSet.delete(groupKey);
            nextSet.add(nextKey);
          } else {
            nextSet.add(nextKey);
          }
          return nextSet;
        });
        return {
          ...g,
          key: nextKey,
          targetUnitId: newUnitId,
          targetUnitName: resolvedName,
          targetChapel: newUnitId === 'chapels_dept' ? newChapel : undefined,
          plans: g.plans.map((p) => ({
            ...p,
            role: newChapel || unit?.name || p.role
          }))
        };
      })
    );
  };

  const handleRemoveTaskFromGroup = (groupKey: string, taskId: number) => {
    setGroups((prev) =>
      prev
        .map((g) =>
          g.key === groupKey ? { ...g, plans: g.plans.filter((p) => p.id !== taskId) } : g
        )
        .filter((g) => g.plans.length > 0)
    );
  };

  const handleApplyBroadcast = () => {
    if (!broadcastSourceKey || broadcastTargets.size === 0) return;
    const srcGroup = groups.find((g) => g.key === broadcastSourceKey);
    if (!srcGroup) return;

    const newGroups: ParsedSectorPlanGroup[] = [];
    broadcastTargets.forEach((targetToken) => {
      const [uId, ch] = targetToken.split('::');
      const unitId = uId as OrgUnitId;
      const unit = getOrgUnitById(unitId);
      const tName = ch ? `${unit?.name || ''} — ${ch}` : unit?.name || unitId;
      const key = `${targetToken}::bc_${generateUniqueId()}`;
      newGroups.push({
        key,
        sourceLabel: `${srcGroup.sourceLabel} → ${tName}`,
        targetUnitId: unitId,
        targetUnitName: tName,
        targetChapel: ch || undefined,
        plans: srcGroup.plans.map((p) => ({
          ...p,
          id: generateUniqueId(),
          year: targetYear || '2019',
          role: ch || unit?.name || p.role
        }))
      });
    });

    setGroups((prev) => [
      ...prev.filter((g) => g.key !== broadcastSourceKey),
      ...newGroups
    ]);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.delete(broadcastSourceKey);
      newGroups.forEach((ng) => next.add(ng.key));
      return next;
    });
    setBroadcastSourceKey(null);
    setBroadcastTargets(new Set());
  };

  const handleAddManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTask.trim() || manualTargets.size === 0) return;
    const num = Math.max(1, parseFloat(manualYearPlan) || 1);
    const [q1, q2, q3, q4] = splitAnnualAcrossQuarters(num);

    const addedGroups: ParsedSectorPlanGroup[] = [];
    manualTargets.forEach((token) => {
      const [uId, ch] = token.split('::');
      const unitId = uId as OrgUnitId;
      const unit = getOrgUnitById(unitId);
      const resolvedName = ch ? `${unit?.name || ''} — ${ch}` : unit?.name || unitId;
      const key = `${token}::man_${generateUniqueId()}`;
      const newPlan: AnnualPlanItem = {
        id: generateUniqueId(),
        year: targetYear || '2019',
        task: manualTask.trim(),
        unit: manualUnit.trim() || 'በቁጥር',
        yearPlan: num,
        q1Plan: q1,
        q2Plan: q2,
        q3Plan: q3,
        q4Plan: q4,
        q1Done: 0,
        q2Done: 0,
        q3Done: 0,
        q4Done: 0,
        role: ch || unit?.name || 'የዘርፉ አመራር'
      };
      addedGroups.push({
        key,
        sourceLabel: resolvedName,
        targetUnitId: unitId,
        targetUnitName: resolvedName,
        targetChapel: ch || undefined,
        plans: [newPlan]
      });
    });

    setGroups((prev) => [...prev, ...addedGroups]);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      addedGroups.forEach((ag) => next.add(ag.key));
      return next;
    });
    setManualTask('');
    setIsManualOpen(false);
    showMsg(
      'success',
      t(
        `✓ "${manualTask.trim()}" ለ${addedGroups.length} ዘርፍ(ፎች) በዝርዝሩ ውስጥ ተጨምሯል።`,
        `✓ Added "${manualTask.trim()}" to ${addedGroups.length} target sector(s) queue.`
      )
    );
  };

  const readySelectedGroups = useMemo(
    () =>
      groups.filter(
        (g) => selectedKeys.has(g.key) && g.targetUnitId !== 'unassigned' && g.plans.length > 0
      ),
    [groups, selectedKeys]
  );

  const handleDispatch = (autoApplyMode: AutoApplyDispatchMode) => {
    if (readySelectedGroups.length === 0) {
      showMsg(
        'error',
        t(
          'እባክዎ ቢያንስ አንድ የተመደበ ዘርፍ ይምረጡ ("ያልተመደበ" ካለ መጀመሪያ ዘርፍ ይምረጡለት)።',
          'Please select at least one assigned target sector.'
        )
      );
      return;
    }

    if (autoApplyMode === 'push_replace' && !confirmPushReplace) {
      setConfirmPushReplace(true);
      return;
    }

    // Merge packets that point to the exact same (unitId + chapel)
    const mergedMap = new Map<string, Omit<PlanDispatchItem, 'id' | 'sentAt' | 'status'>>();
    readySelectedGroups.forEach((g) => {
      if (g.targetUnitId === 'unassigned') return;
      const mKey = `${g.targetUnitId}::${g.targetChapel || ''}`;
      const existing = mergedMap.get(mKey);
      const normalizedPlans = g.plans.map((p) =>
        ensureQuartersOnPlan({
          ...p,
          id: generateUniqueId(),
          year: targetYear || '2019'
        })
      );
      if (existing) {
        existing.plans.push(...normalizedPlans);
      } else {
        const unit = getOrgUnitById(g.targetUnitId);
        const unitTitle = g.targetChapel
          ? `${getUnitLabel(g.targetUnitId, unit?.name || g.targetUnitName)} — ${chapelLabel(g.targetChapel)}`
          : getUnitLabel(g.targetUnitId, unit?.name || g.targetUnitName);

        mergedMap.set(mKey, {
          year: targetYear || '2019',
          title: t(
            `የ${targetYear || '2019'} ዓ/ም ዕቅድ — ${unitTitle}`,
            `${targetYear || '2019'} E.C. Plan — ${unitTitle}`
          ),
          sourceFileName: sourceFileName || undefined,
          targetUnitId: g.targetUnitId,
          targetUnitName: unit?.name || g.targetUnitName,
          targetChapel: g.targetChapel,
          plans: normalizedPlans,
          sentByUnitId,
          sentByName
        });
      }
    });

    const packets = Array.from(mergedMap.values());
    onDispatchPlans(packets, autoApplyMode);
    setConfirmPushReplace(false);

    const dispatchedKeys = new Set(readySelectedGroups.map((g) => g.key));
    setGroups((prev) => prev.filter((g) => !dispatchedKeys.has(g.key)));
    setSelectedKeys(new Set());

    const totalTasksSent = packets.reduce((s, p) => s + p.plans.length, 0);
    showMsg(
      'success',
      autoApplyMode === 'inbox_only'
        ? t(
            `✓ የ${targetYear} ዓ/ም ዕቅድ (${totalTasksSent} ተግባራት) ወደ ${packets.length} ዘርፎች መቀበያ ተልኳል!`,
            `✓ Dispatched ${targetYear} plan (${totalTasksSent} tasks) to ${packets.length} sector receivers!`
          )
        : t(
            `✓ የ${targetYear} ዓ/ም ዕቅድ (${totalTasksSent} ተግባራት) ተልኮ በቀጥታ ወደ ${packets.length} ዘርፎች ቋት ገብቷል!`,
            `✓ Dispatched and saved ${targetYear} plan (${totalTasksSent} tasks) directly into ${packets.length} sector databases!`
          )
    );
  };

  const filteredDispatches = useMemo(() => {
    return [...dispatches]
      .sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''))
      .filter((d) => {
        if (trackerYearFilter !== 'all' && d.year !== trackerYearFilter) return false;
        if (trackerStatusFilter !== 'all' && d.status !== trackerStatusFilter) return false;
        return true;
      });
  }, [dispatches, trackerYearFilter, trackerStatusFilter]);

  const dispatchYears = useMemo(
    () => Array.from(new Set([targetYear || '2019', ...dispatches.map((d) => d.year).filter(Boolean)])).sort(),
    [dispatches, targetYear]
  );

  const allTargetTokens = useMemo(() => {
    const items: { token: string; label: string; isChapel?: boolean }[] = [];
    CHURCH_ORG_UNITS.filter((u) => u.id !== 'chapels_dept').forEach((u) => {
      items.push({ token: u.id, label: getUnitLabel(u.id, u.name) });
    });
    chapelList.forEach((ch) => {
      items.push({
        token: `chapels_dept::${ch}`,
        label: `${getUnitLabel('chapels_dept')} — ${chapelLabel(ch)}`,
        isChapel: true
      });
    });
    return items;
  }, [chapelList, getUnitLabel, chapelLabel]);

  return (
    <div className="space-y-5">
      {/* Main Upload & Distribution Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-900" />
              <span>
                {t(
                  `የ${targetYear || '2019'} ዓ/ም ዕቅድ ወደየዘርፍ ቋት መላኪያ እና ማከፋፈያ`,
                  `${targetYear || '2019'} E.C. Master Plan Sender & Sector Distributor`
                )}
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              {t(
                'የ2019 ዓ/ም ዋናውን ዕቅድ ከExcel፣ Word ወይም PDF ሲጭኑ ለሁሉም ዘርፎችና ቻፕሎች በራስ-ሰር ተለይቶ ወደየዘርፉ መቀበያ (Inbox) እና ቋት ይላካል።',
                'Upload the master 2019 E.C. plan from Excel, Word, or PDF to automatically split and dispatch activities to every sector and chapel database.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="font-bold text-slate-600">{t('ዓ/ም:', 'Year:')}</span>
              <input
                type="text"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-extrabold text-blue-950 text-center tabular-nums"
              />
            </div>

            <button
              type="button"
              onClick={() => downloadMasterPlanTemplateExcel(targetYear || '2019')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('የ2019 ናሙና Excel አውርድ', 'Sample Excel')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('በእጅ ዕቅድ ጨምር', 'Add Manual Plan')}</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white cursor-pointer shadow-xs">
              {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{t('የ2019 ዕቅድ ፋይል ጫን (Excel/PDF/Word)', 'Upload Plan File')}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.ods,.pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {notice && (
          <div
            className={`rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2 border ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        {/* Parsed Queue Preview */}
        {groups.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-800" />
                <span>
                  {t(
                    `የተለዩ የዘርፍ ዕቅዶች ዝርዝር (${readySelectedGroups.length}/${groups.length} ለመላክ ተመርጠዋል)`,
                    `Detected Sector Plan Packets (${readySelectedGroups.length}/${groups.length} selected)`
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedKeys(
                      new Set(groups.filter((g) => g.targetUnitId !== 'unassigned').map((g) => g.key))
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  {t('የተመደቡትን ሁሉ ምረጥ', 'Select All Assigned')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGroups([]);
                    setSelectedKeys(new Set());
                    setSourceFileName('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-[11px] font-bold text-rose-700 cursor-pointer"
                >
                  {t('ዝርዝሩን አጽዳ', 'Clear Queue')}
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {groups.map((grp) => {
                const isChecked = selectedKeys.has(grp.key);
                const isExpanded = expandedGroupKey === grp.key;
                const isUnassigned = grp.targetUnitId === 'unassigned';
                const totalTarget = grp.plans.reduce((s, p) => s + (Number(p.yearPlan) || 0), 0);

                return (
                  <div
                    key={grp.key}
                    className={`border rounded-xl overflow-hidden ${
                      isUnassigned
                        ? 'border-amber-300 bg-amber-50/40'
                        : isChecked
                        ? 'border-blue-200 bg-blue-50/20'
                        : 'border-slate-200 bg-white opacity-75'
                    }`}
                  >
                    <div className="p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isUnassigned}
                          onChange={(e) => {
                            setSelectedKeys((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(grp.key);
                              else next.delete(grp.key);
                              return next;
                            });
                          }}
                          className="mt-1 sm:mt-0 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setExpandedGroupKey(isExpanded ? null : grp.key)}
                          className="p-1 rounded hover:bg-slate-200/70 text-slate-600 cursor-pointer shrink-0"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                            <span>{grp.targetUnitName}</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold tabular-nums">
                              {grp.plans.length} {t('ተግባራት', 'tasks')} · {t('ድምር', 'Total')} {totalTarget}
                            </span>
                            {isUnassigned && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                                {t('ዘርፍ ይምረጡለት', 'Assign Target Sector')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {t('ምንጭ:', 'Source:')} {grp.sourceLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pl-7 lg:pl-0">
                        <select
                          value={grp.targetUnitId}
                          onChange={(e) => {
                            const val = e.target.value as OrgUnitId | 'unassigned';
                            handleChangeGroupTarget(
                              grp.key,
                              val,
                              val === 'chapels_dept' ? grp.targetChapel || chapelList[0] : undefined
                            );
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 max-w-[230px]"
                        >
                          <option value="unassigned">{t('-- ዘርፍ ይምረጡ --', '-- Select Sector --')}</option>
                          {CHURCH_ORG_UNITS.map((u) => (
                            <option key={u.id} value={u.id}>
                              {getUnitLabel(u.id, u.name)}
                            </option>
                          ))}
                        </select>

                        {grp.targetUnitId === 'chapels_dept' && (
                          <select
                            value={grp.targetChapel || ''}
                            onChange={(e) =>
                              handleChangeGroupTarget(grp.key, 'chapels_dept', e.target.value || undefined)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-blue-900"
                          >
                            <option value="">{t('ሁሉም ቻፕሎች (ማዕከል)', 'All Chapels Hub')}</option>
                            {chapelList.map((ch) => (
                              <option key={ch} value={ch}>
                                {chapelLabel(ch)}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setBroadcastSourceKey(grp.key);
                            setBroadcastTargets(new Set());
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[11px] font-bold cursor-pointer"
                          title={t('ለብዙ ዘርፎች አባዝተህ ላክ', 'Copy/Broadcast to multiple sectors')}
                        >
                          <Copy className="w-3 h-3" />
                          <span>{t('ለብዙ ዘርፎች አባዛ', 'Broadcast')}</span>
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-white overflow-x-auto">
                        <table className="w-full text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                              <th className="py-2 px-3 text-left w-8">#</th>
                              <th className="py-2 px-3 text-left">{t('ዋና ተግባር', 'Activity')}</th>
                              <th className="py-2 px-2 text-left">{t('መለኪያ', 'Unit')}</th>
                              <th className="py-2 px-2 text-right">{t('ዓመት', 'Year')}</th>
                              <th className="py-2 px-2 text-right">Q1</th>
                              <th className="py-2 px-2 text-right">Q2</th>
                              <th className="py-2 px-2 text-right">Q3</th>
                              <th className="py-2 px-2 text-right">Q4</th>
                              <th className="py-2 px-3 text-left">{t('ኃላፊ', 'Owner')}</th>
                              <th className="py-2 px-2 text-right w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {grp.plans.map((p, idx) => (
                              <tr key={p.id} className="hover:bg-slate-50/60">
                                <td className="py-1.5 px-3 text-slate-400 tabular-nums">{idx + 1}</td>
                                <td className="py-1.5 px-3 font-bold text-slate-900">{p.task}</td>
                                <td className="py-1.5 px-2 text-slate-600">{p.unit}</td>
                                <td className="py-1.5 px-2 text-right font-extrabold text-blue-900 tabular-nums">
                                  {p.yearPlan}
                                </td>
                                <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">{p.q1Plan}</td>
                                <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">{p.q2Plan}</td>
                                <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">{p.q3Plan}</td>
                                <td className="py-1.5 px-2 text-right tabular-nums text-slate-600">{p.q4Plan}</td>
                                <td className="py-1.5 px-3 text-slate-600">{p.role}</td>
                                <td className="py-1.5 px-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTaskFromGroup(grp.key, p.id)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                    title={t('አስወግድ', 'Remove')}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dispatch Action Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                <div className="font-extrabold text-slate-900">
                  {t(
                    'የመላኪያ አማራጭ ይምረጡ፦',
                    'Choose Distribution Mode:'
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {t(
                    'ወደ መቀበያ መላክ (ዘርፉ እንዲያረጋግጥ) ወይም በቀጥታ ወደየዘርፉ ቋት ማስገባት ይችላሉ።',
                    'Send to each sector inbox for acceptance, or push directly into each sector database.'
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={readySelectedGroups.length === 0}
                  onClick={() => handleDispatch('inbox_only')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-900 hover:bg-blue-800 text-white disabled:opacity-50 cursor-pointer"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>{t('ወደየዘርፉ መቀበያ ላክ', 'Send to Sector Receivers')}</span>
                </button>

                <button
                  type="button"
                  disabled={readySelectedGroups.length === 0}
                  onClick={() => handleDispatch('push_append')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('ላክና ወደየዘርፍ ቋት ጨምር', 'Send & Append to DBs')}</span>
                </button>

                {confirmPushReplace ? (
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-xl px-2.5 py-1">
                    <span className="text-[11px] font-bold text-rose-900">
                      {t('ነባሩ ይተካ?', 'Replace existing?')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDispatch('push_replace')}
                      className="px-2.5 py-1 rounded-lg bg-rose-700 text-white text-[11px] font-extrabold cursor-pointer"
                    >
                      {t('አዎ ተካ', 'Confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmPushReplace(false)}
                      className="px-2 py-1 rounded-lg bg-white text-slate-700 text-[11px] font-bold cursor-pointer"
                    >
                      {t('ተው', 'Cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={readySelectedGroups.length === 0}
                    onClick={() => setConfirmPushReplace(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{t('ላክና ነባሩን ተካ', 'Send & Replace DBs')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Sent Tracking Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-800" />
              <span>
                {t(
                  `ወደየዘርፍ ቋት የተላኩ ዕቅዶች መከታተያ (${dispatches.length})`,
                  `Dispatched Plans Tracker (${dispatches.length})`
                )}
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'የተላኩ ዕቅዶችን ሁኔታ (በመጠባበቅ ላይ / ወደ ቋት የገባ / የተመለሰ) ከዚህ ይከታተሉ።',
                'Track whether each sector has received and accepted its plan into its database.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={trackerYearFilter}
              onChange={(e) => setTrackerYearFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
            >
              <option value="all">{t('ሁሉም ዓመታት', 'All Years')}</option>
              {dispatchYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {t('ዓ/ም', 'E.C.')}
                </option>
              ))}
            </select>
            <select
              value={trackerStatusFilter}
              onChange={(e) => setTrackerStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
            >
              <option value="all">{t('ሁሉም ሁኔታዎች', 'All Statuses')}</option>
              <option value="pending">{t('በመጠባበቅ ላይ', 'Pending')}</option>
              <option value="accepted">{t('ወደ ቋት ገብቷል', 'Accepted')}</option>
              <option value="returned">{t('ተመልሷል', 'Returned')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-4 text-left">{t('ዓ/ም', 'Year')}</th>
                <th className="py-2.5 px-4 text-left">{t('ተቀባይ ዘርፍ / ቻፕል', 'Target Sector / Chapel')}</th>
                <th className="py-2.5 px-4 text-left">{t('ርዕስ / ምንጭ', 'Title / Source')}</th>
                <th className="py-2.5 px-3 text-right">{t('ተግባራት', 'Tasks')}</th>
                <th className="py-2.5 px-4 text-left">{t('ሁኔታ', 'Status')}</th>
                <th className="py-2.5 px-4 text-left">{t('ቀን', 'Sent At')}</th>
                {onDeleteDispatch && <th className="py-2.5 px-4 text-right">{t('ሰርዝ', 'Remove')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={onDeleteDispatch ? 7 : 6} className="py-10 text-center text-slate-400 font-semibold">
                    {t('ገና ወደየዘርፍ የተላከ ዕቅድ የለም።', 'No plans dispatched to sectors yet.')}
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-extrabold text-blue-950 tabular-nums">{d.year}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {getUnitLabel(d.targetUnitId, d.targetUnitName)}
                      {d.targetChapel && (
                        <span className="ml-1.5 text-indigo-800">({chapelLabel(d.targetChapel)})</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      <div className="font-semibold">{d.title}</div>
                      {d.receiverNote && (
                        <div className="text-[11px] text-rose-700 mt-0.5">
                          {t('አስተያየት:', 'Note:')} {d.receiverNote}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold tabular-nums text-slate-800">
                      {d.plans.length}
                    </td>
                    <td className="py-2.5 px-4">
                      {d.status === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-extrabold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('ወደ ቋት ገብቷል', 'Accepted into DB')}</span>
                        </span>
                      ) : d.status === 'returned' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-extrabold">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('ተመልሷል', 'Returned')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-extrabold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t('በመቀበያ በመጠባበቅ ላይ', 'Pending in Inbox')}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      <DualDateBadge value={d.sentAt} mode="stacked" showTime />
                    </td>
                    {onDeleteDispatch && (
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteDispatch(d.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title={t('ሰርዝ', 'Delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Broadcast Modal (assign 1 group to multiple sectors/chapels) */}
      {broadcastSourceKey && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 max-h-[88vh] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {t('ዕቅዱን ለተመረጡት ዘርፎች እና ቻፕሎች አባዝተህ ላክ', 'Broadcast Plan to Selected Sectors & Chapels')}
              </h3>
              <button
                type="button"
                onClick={() => setBroadcastSourceKey(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pr-1">
              {allTargetTokens.map((item) => {
                const checked = broadcastTargets.has(item.token);
                return (
                  <label
                    key={item.token}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                      checked ? 'border-blue-500 bg-blue-50 text-blue-950 font-bold' : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setBroadcastTargets((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.token);
                          else next.delete(item.token);
                          return next;
                        });
                      }}
                    />
                    <span className="truncate">{item.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setBroadcastTargets(new Set(allTargetTokens.map((tItem) => tItem.token)))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 font-bold text-slate-700 cursor-pointer"
              >
                {t('ሁሉንም ምረጥ', 'Select All')}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBroadcastSourceKey(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={broadcastTargets.size === 0}
                  onClick={handleApplyBroadcast}
                  className="px-4 py-2 rounded-xl font-bold bg-blue-900 text-white disabled:opacity-50 cursor-pointer"
                >
                  {t(`ለ${broadcastTargets.size} ዘርፎች አዘጋጅ`, `Prepare for ${broadcastTargets.size} Sectors`)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Quick Add Modal */}
      {isManualOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {t(`የ${targetYear || '2019'} ዓ/ም ዕቅድ በእጅ ጨምረህ ላክ`, `Add ${targetYear || '2019'} Plan Task for Sectors`)}
              </h3>
              <button
                type="button"
                onClick={() => setIsManualOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddManualTask} className="space-y-3 text-xs overflow-y-auto pr-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ዋና ተግባር *', 'Activity *')}</label>
                <input
                  type="text"
                  required
                  value={manualTask}
                  onChange={(e) => setManualTask(e.target.value)}
                  placeholder={t('ምሳሌ፦ የወንጌል ስርጭትና ደቀመዝሙርነት ፕሮግራም', 'e.g. Evangelism & Discipleship Outreach')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መለኪያ', 'Unit')}</label>
                  <input
                    type="text"
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የዓመት ዕቅድ', 'Annual Target')}</label>
                  <input
                    type="number"
                    min={1}
                    value={manualYearPlan}
                    onChange={(e) => setManualYearPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {t('ተቀባይ ዘርፎችን / ቻፕሎችን ይምረጡ *', 'Select Target Sectors / Chapels *')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2">
                  {allTargetTokens.map((item) => {
                    const checked = manualTargets.has(item.token);
                    return (
                      <label
                        key={item.token}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                          checked ? 'bg-blue-50 text-blue-950 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setManualTargets((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(item.token);
                              else next.delete(item.token);
                              return next;
                            });
                          }}
                        />
                        <span className="truncate">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl cursor-pointer"
                >
                  {t('ወደ መላኪያ ዝርዝር ጨምር', 'Add to Send Queue')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- Sector / Department / Chapel Receiver Inbox ----------------

interface PlanSectorReceiverPanelProps {
  unitId: OrgUnitId;
  unitName: string;
  chapelName?: string | null;
  currentYear: string;
  dispatches: PlanDispatchItem[];
  onAcceptDispatch: (dispatchId: number, mode: 'append' | 'replace') => void;
  onReturnDispatch?: (dispatchId: number, note: string) => void;
}

export const PlanSectorReceiverPanel: React.FC<PlanSectorReceiverPanelProps> = ({
  unitId,
  unitName,
  chapelName = null,
  currentYear,
  dispatches,
  onAcceptDispatch,
  onReturnDispatch
}) => {
  const { t, chapelLabel } = useLanguage();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [returningId, setReturningId] = useState<number | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [confirmReplaceId, setConfirmReplaceId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [feedback, setFeedback] = useState('');

  const matchingDispatches = useMemo(() => {
    return dispatches
      .filter((d) => {
        if (d.targetUnitId !== unitId) return false;
        if (unitId === 'chapels_dept' && chapelName) {
          return d.targetChapel === chapelName;
        }
        return true;
      })
      .sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
  }, [dispatches, unitId, chapelName]);

  const pendingList = useMemo(
    () => matchingDispatches.filter((d) => d.status === 'pending'),
    [matchingDispatches]
  );
  const historyList = useMemo(
    () => matchingDispatches.filter((d) => d.status !== 'pending'),
    [matchingDispatches]
  );

  if (matchingDispatches.length === 0) {
    return (
      <section className="bg-slate-50/80 border border-slate-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {t(
              `ከማዕከል ለ${chapelName ? chapelLabel(chapelName) : unitName} (${currentYear} ዓ/ም) የተላከ አዲስ ዕቅድ የለም።`,
              `No dispatched plans awaiting reception for ${chapelName ? chapelLabel(chapelName) : unitName} (${currentYear}).`
            )}
          </span>
        </div>
      </section>
    );
  }

  const handleAccept = (d: PlanDispatchItem, mode: 'append' | 'replace') => {
    onAcceptDispatch(d.id, mode);
    setConfirmReplaceId(null);
    setFeedback(
      t(
        `✓ "${d.title}" (${d.plans.length} ተግባራት) ወደ ${chapelName ? chapelLabel(chapelName) : unitName} ቋት ገብቷል!`,
        `✓ Accepted "${d.title}" (${d.plans.length} tasks) into sector database!`
      )
    );
    setTimeout(() => setFeedback(''), 5500);
  };

  const handleReturnSubmit = (id: number) => {
    if (!onReturnDispatch || !returnNote.trim()) return;
    onReturnDispatch(id, returnNote.trim());
    setReturningId(null);
    setReturnNote('');
  };

  return (
    <section className="bg-white border border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-900 text-white flex items-center justify-center shrink-0">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>
                {t(
                  `ከማዕከል የተላኩ ዕቅዶች መቀበያ — ${chapelName ? chapelLabel(chapelName) : unitName}`,
                  `Incoming Plans Receiver — ${chapelName ? chapelLabel(chapelName) : unitName}`
                )}
              </span>
              {pendingList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tabular-nums">
                  {pendingList.length} {t('አዲስ', 'New')}
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500">
              {t(
                'የተላኩትን ዕቅዶች በመመልከት "ወደ ዘርፍ ቋት ተቀበል" የሚለውን በመጫን ወደ ቋትዎ ያስገቡ።',
                'Review incoming plans and accept them directly into this sector’s plan database.'
              )}
            </p>
          </div>
        </div>

        {historyList.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
          >
            {showHistory
              ? t('ያለፉትን ደብቅ', 'Hide History')
              : t(`የተቀበሏቸው ታሪክ (${historyList.length})`, `History (${historyList.length})`)}
          </button>
        )}
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Pending Dispatches */}
      {pendingList.map((d) => {
        const isExpanded = expandedId === d.id;
        return (
          <div
            key={d.id}
            className="border border-amber-200 bg-amber-50/40 rounded-xl overflow-hidden"
          >
            <div className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-blue-900 text-white text-[10px] tabular-nums">
                    {d.year} {t('ዓ/ም', 'E.C.')}
                  </span>
                  <span>{d.title}</span>
                  {d.targetChapel && !chapelName && (
                    <span className="text-indigo-800">[{chapelLabel(d.targetChapel)}]</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600">
                  {t('የላከው:', 'Sent by:')} <strong>{d.sentByName}</strong> ·{' '}
                  {d.plans.length} {t('ተግባራት', 'tasks')} ·{' '}
                  <DualDateBadge value={d.sentAt} mode="inline" showTime />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  {isExpanded ? t('ዝርዝር ዝጋ', 'Hide Tasks') : t(`ዝርዝር እይ (${d.plans.length})`, `Preview (${d.plans.length})`)}
                </button>

                <button
                  type="button"
                  onClick={() => handleAccept(d, 'append')}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-extrabold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('ወደ ዘርፍ ቋት ተቀበል (ጨምር)', 'Accept & Append to DB')}</span>
                </button>

                {confirmReplaceId === d.id ? (
                  <div className="inline-flex items-center gap-1 bg-white border border-rose-300 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleAccept(d, 'replace')}
                      className="px-2 py-0.5 rounded bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      {t('አዎ ተካ', 'Replace')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReplaceId(null)}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                    >
                      {t('ተው', 'No')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReplaceId(d.id)}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold cursor-pointer"
                  >
                    {t('ነባሩን በአዲሱ ተካ', 'Accept & Replace')}
                  </button>
                )}

                {onReturnDispatch && (
                  <button
                    type="button"
                    onClick={() => {
                      setReturningId(returningId === d.id ? null : d.id);
                      setReturnNote('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold cursor-pointer"
                  >
                    {t('መልስ', 'Return')}
                  </button>
                )}
              </div>
            </div>

            {returningId === d.id && (
              <div className="px-3.5 pb-3.5 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder={t('የመመለሻ / የማስተካከያ አስተያየት ይጻፉ...', 'Enter return/revision note...')}
                  className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-xs"
                />
                <button
                  type="button"
                  disabled={!returnNote.trim()}
                  onClick={() => handleReturnSubmit(d.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {t('አስተያየት ላክ', 'Send Return Note')}
                </button>
              </div>
            )}

            {isExpanded && (
              <div className="border-t border-amber-200 bg-white overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2 px-3 text-left">#</th>
                      <th className="py-2 px-3 text-left">{t('ዋና ተግባር', 'Planned Activity')}</th>
                      <th className="py-2 px-2 text-left">{t('መለኪያ', 'Unit')}</th>
                      <th className="py-2 px-2 text-right">{t('የዓመት ዕቅድ', 'Annual')}</th>
                      <th className="py-2 px-2 text-right">Q1</th>
                      <th className="py-2 px-2 text-right">Q2</th>
                      <th className="py-2 px-2 text-right">Q3</th>
                      <th className="py-2 px-2 text-right">Q4</th>
                      <th className="py-2 px-3 text-left">{t('ኃላፊ', 'Owner')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {d.plans.map((p, idx) => (
                      <tr key={p.id}>
                        <td className="py-1.5 px-3 text-slate-400 tabular-nums">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-900">{p.task}</td>
                        <td className="py-1.5 px-2 text-slate-600">{p.unit}</td>
                        <td className="py-1.5 px-2 text-right font-extrabold text-blue-900 tabular-nums">{p.yearPlan}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{p.q1Plan}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{p.q2Plan}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{p.q3Plan}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{p.q4Plan}</td>
                        <td className="py-1.5 px-3 text-slate-600">{p.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* History List */}
      {showHistory && historyList.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {historyList.map((d) => (
            <div
              key={d.id}
              className="border border-slate-200 bg-slate-50/70 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-extrabold text-slate-800">{d.title}</span>{' '}
                <span className="text-slate-500">({d.plans.length} {t('ተግባራት', 'tasks')})</span>
              </div>
              <div className="flex items-center gap-2">
                {d.status === 'accepted' ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('ወደ ቋት ገብቷል', 'Accepted')}</span>
                  </span>
                ) : (
                  <span className="text-rose-700 font-bold flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('ተመልሷል', 'Returned')}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
