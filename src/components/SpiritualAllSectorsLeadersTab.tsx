import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Users,
  Plus,
  Search,
  Download,
  Printer,
  Edit2,
  Trash2,
  X,
  ArrowUpRight,
  Phone,
  History,
  Church,
  CheckCircle2,
  Building2
} from 'lucide-react';
import {
  ChapelLeaderCategoryId,
  ChurchMember,
  DepartmentWorkspaceData,
  HistoricalLeaderRecord,
  OrgUnitId,
  UnitLeaderRecord
} from '../types';
import {
  CHAPEL_LEADER_CATEGORIES,
  CHURCH_ORG_UNITS,
  isUnderSpiritualCouncil
} from '../constants/churchStructure';
import { generateUniqueId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';
import { formatDualDateText } from '../utils/ethiopianDate';
import { DualDateBadge, DualDateInput } from './DualDate';

interface SpiritualAllSectorsLeadersTabProps {
  currentYear: string;
  departmentDataMap: { [unitId: string]: DepartmentWorkspaceData };
  churchMembers: ChurchMember[];
  onUpdateDepartmentData: (
    unitId: OrgUnitId,
    updater: (prev: DepartmentWorkspaceData) => DepartmentWorkspaceData
  ) => void;
  canNavigateToUnit: (targetUnitId: OrgUnitId) => boolean;
  onSelectUnit: (targetUnitId: OrgUnitId) => void;
  onOpenHistoricalArchive?: () => void;
}

const DEFAULT_ROLES = [
  'ዋና ሰብሳቢ / አስተባባሪ',
  'ምክትል ሰብሳቢ',
  'ጸሐፊ',
  'ገንዘብ ያዥ',
  'ሂሳብ ሹም / ቁጥጥር',
  'የአመራር ኮሚቴ አባል'
];

export const SpiritualAllSectorsLeadersTab: React.FC<SpiritualAllSectorsLeadersTabProps> = ({
  currentYear,
  departmentDataMap,
  churchMembers,
  onUpdateDepartmentData,
  canNavigateToUnit,
  onSelectUnit,
  onOpenHistoricalArchive
}) => {
  const { t, unitName, chapelLabel } = useLanguage();

  const [viewMode, setViewMode] = useState<'spiritual' | 'all' | 'chapels_7'>('spiritual');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'ወ' | 'ሴ'>('all');
  const [chapelCategoryFilter, setChapelCategoryFilter] = useState<ChapelLeaderCategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  // Add/Edit Sector Leader Modal directly from Spiritual Council
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<{ unitId: OrgUnitId; id: number } | null>(null);
  const [fUnitId, setFUnitId] = useState<OrgUnitId>('evangelism');
  const [fName, setFName] = useState('');
  const [fGender, setFGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [fRoleTitle, setFRoleTitle] = useState(DEFAULT_ROLES[0]);
  const [fPhone, setFPhone] = useState('');
  const [fStartDate, setFStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fStatus, setFStatus] = useState('ንቁ');
  const [fNotes, setFNotes] = useState('');

  // Quick-Archive Year prompt banner state
  const [archiveYearInput, setArchiveYearInput] = useState(`${currentYear} ዓ/ም`);
  const [showBulkArchiveBar, setShowBulkArchiveBar] = useState(false);

  const visibleUnits = useMemo(() => {
    if (viewMode === 'spiritual') {
      return CHURCH_ORG_UNITS.filter(
        (u) => u.id === 'spiritual_council' || isUnderSpiritualCouncil(u.id)
      );
    }
    return CHURCH_ORG_UNITS;
  }, [viewMode]);

  const flattenedSectorLeaders = useMemo(() => {
    const rows: {
      unitId: OrgUnitId;
      unitCode: string;
      unitLabel: string;
      leader: UnitLeaderRecord;
    }[] = [];

    visibleUnits.forEach((u) => {
      const list = departmentDataMap[u.id]?.leaders || [];
      list.forEach((leader) => {
        rows.push({
          unitId: u.id,
          unitCode: u.code,
          unitLabel: unitName(u.id, u.name),
          leader
        });
      });
    });

    return rows;
  }, [visibleUnits, departmentDataMap, unitName]);

  const chapelLeadersList = useMemo(
    () => departmentDataMap.chapels_dept?.chapelLeaders || [],
    [departmentDataMap]
  );

  const allChurchSectorLeadersCount = useMemo(
    () =>
      CHURCH_ORG_UNITS.reduce(
        (sum, u) => sum + (departmentDataMap[u.id]?.leaders?.length || 0),
        0
      ),
    [departmentDataMap]
  );

  const filteredSectorRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flattenedSectorLeaders.filter((item) => {
      if (sectorFilter !== 'all' && item.unitId !== sectorFilter) return false;
      if (statusFilter !== 'all' && item.leader.status !== statusFilter) return false;
      if (genderFilter !== 'all' && item.leader.gender !== genderFilter) return false;
      if (!q) return true;
      return (
        item.leader.name.toLowerCase().includes(q) ||
        item.unitLabel.toLowerCase().includes(q) ||
        (item.leader.roleTitle || '').toLowerCase().includes(q) ||
        (item.leader.phone || '').toLowerCase().includes(q) ||
        (item.leader.notes || '').toLowerCase().includes(q)
      );
    });
  }, [flattenedSectorLeaders, sectorFilter, statusFilter, genderFilter, searchQuery]);

  const filteredChapelLeaders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return chapelLeadersList.filter((cl) => {
      if (chapelCategoryFilter !== 'all' && cl.category !== chapelCategoryFilter) return false;
      if (statusFilter !== 'all' && cl.status !== statusFilter) return false;
      if (genderFilter !== 'all' && cl.gender !== genderFilter) return false;
      if (!q) return true;
      return (
        cl.name.toLowerCase().includes(q) ||
        cl.chapel.toLowerCase().includes(q) ||
        (cl.roleTitle || '').toLowerCase().includes(q) ||
        (cl.phone || '').toLowerCase().includes(q)
      );
    });
  }, [chapelLeadersList, chapelCategoryFilter, statusFilter, genderFilter, searchQuery]);

  const sectorStats = useMemo(() => {
    const activeCount = flattenedSectorLeaders.filter((r) => r.leader.status === 'ንቁ').length;
    const maleCount = flattenedSectorLeaders.filter((r) => r.leader.gender === 'ወ').length;
    const femaleCount = flattenedSectorLeaders.filter((r) => r.leader.gender === 'ሴ').length;
    const populatedSectors = visibleUnits.filter(
      (u) => (departmentDataMap[u.id]?.leaders?.length || 0) > 0
    ).length;

    return {
      total: flattenedSectorLeaders.length,
      activeCount,
      maleCount,
      femaleCount,
      populatedSectors,
      totalVisibleUnits: visibleUnits.length
    };
  }, [flattenedSectorLeaders, visibleUnits, departmentDataMap]);

  const selectedUnitDef = useMemo(
    () => CHURCH_ORG_UNITS.find((u) => u.id === fUnitId),
    [fUnitId]
  );

  const roleSuggestionsForModal = useMemo(() => {
    const unitRoles = selectedUnitDef?.roleOptions || [];
    return Array.from(new Set([...DEFAULT_ROLES, ...unitRoles].filter(Boolean)));
  }, [selectedUnitDef]);

  const showNotice = (msg: string) => {
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(''), 5000);
  };

  const openAddModal = (presetUnitId?: OrgUnitId) => {
    const target = presetUnitId || (sectorFilter !== 'all' ? (sectorFilter as OrgUnitId) : 'evangelism');
    setEditingRef(null);
    setFUnitId(target);
    setFName('');
    setFGender('ወ');
    setFRoleTitle(DEFAULT_ROLES[0]);
    setFPhone('');
    setFStartDate(new Date().toISOString().split('T')[0]);
    setFStatus('ንቁ');
    setFNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (unitId: OrgUnitId, ldr: UnitLeaderRecord) => {
    setEditingRef({ unitId, id: ldr.id });
    setFUnitId(unitId);
    setFName(ldr.name);
    setFGender(ldr.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setFRoleTitle(ldr.roleTitle || DEFAULT_ROLES[0]);
    setFPhone(ldr.phone || '');
    setFStartDate(ldr.termOrStartDate || '');
    setFStatus(ldr.status || 'ንቁ');
    setFNotes(ldr.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveLeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim()) return;

    const record: UnitLeaderRecord = {
      id: editingRef?.id ?? generateUniqueId(),
      name: fName.trim(),
      gender: fGender,
      roleTitle: fRoleTitle.trim() || DEFAULT_ROLES[0],
      phone: fPhone.trim() || undefined,
      termOrStartDate: fStartDate.trim() || undefined,
      status: fStatus,
      notes: fNotes.trim() || undefined
    };

    if (editingRef && editingRef.unitId !== fUnitId) {
      // Moved to another sector
      onUpdateDepartmentData(editingRef.unitId, (prev) => ({
        ...prev,
        leaders: (prev.leaders || []).filter((l) => l.id !== editingRef.id)
      }));
      onUpdateDepartmentData(fUnitId, (prev) => ({
        ...prev,
        leaders: [...(prev.leaders || []), { ...record, id: generateUniqueId() }]
      }));
    } else if (editingRef) {
      onUpdateDepartmentData(fUnitId, (prev) => ({
        ...prev,
        leaders: (prev.leaders || []).map((l) => (l.id === editingRef.id ? record : l))
      }));
    } else {
      onUpdateDepartmentData(fUnitId, (prev) => ({
        ...prev,
        leaders: [...(prev.leaders || []), record]
      }));
    }

    setIsModalOpen(false);
    showNotice(
      t(
        `✓ የ${record.name} መረጃ በተሳካ ሁኔታ ተቀምጧል።`,
        `Saved leader record for ${record.name}.`
      )
    );
  };

  const handleDeleteLeader = (unitId: OrgUnitId, leaderId: number) => {
    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      leaders: (prev.leaders || []).filter((l) => l.id !== leaderId)
    }));
    setConfirmDeleteKey(null);
  };

  const archiveSingleLeader = (unitId: OrgUnitId, unitLabel: string, ldr: UnitLeaderRecord) => {
    const yr = archiveYearInput.trim() || `${currentYear} ዓ/ም`;
    const existing = departmentDataMap.spiritual_council?.historicalLeaders || [];
    const dup = existing.some(
      (h) =>
        h.name.trim().toLowerCase() === ldr.name.trim().toLowerCase() &&
        h.sectorId === unitId &&
        h.serviceYear.trim() === yr
    );
    if (dup) {
      showNotice(
        t(
          `⚠️ ${ldr.name} (${unitLabel} · ${yr}) አስቀድሞ በየዘመናቱ መዝገብ ውስጥ አለ።`,
          `${ldr.name} (${unitLabel} · ${yr}) is already archived.`
        )
      );
      return;
    }

    const newRec: HistoricalLeaderRecord = {
      id: generateUniqueId(),
      name: ldr.name,
      gender: ldr.gender,
      serviceYear: yr,
      sectorId: unitId,
      sectorName: unitLabel,
      responsibility: ldr.roleTitle,
      phone: ldr.phone,
      status: ldr.status === 'ንቁ' ? 'በአገልግሎት ላይ' : 'አገልግሎት የጨረሰ',
      notes: ldr.notes,
      recordedAt: new Date().toISOString().split('T')[0]
    };

    onUpdateDepartmentData('spiritual_council', (prev) => ({
      ...prev,
      historicalLeaders: [newRec, ...(prev.historicalLeaders || [])]
    }));

    showNotice(
      t(
        `✓ ${ldr.name} (${yr} — ${unitLabel}) ወደ የዘመናቱ መሪዎች መዝገብ ተመዝግቧል።`,
        `Archived ${ldr.name} (${yr} — ${unitLabel}) to Historical Archive.`
      )
    );
  };

  const handleBulkArchiveAllCurrent = () => {
    const yr = archiveYearInput.trim() || `${currentYear} ዓ/ም`;
    const existing = departmentDataMap.spiritual_council?.historicalLeaders || [];
    const existingKeys = new Set(
      existing.map(
        (h) => `${h.name.trim().toLowerCase()}|${h.sectorId}|${h.serviceYear.trim()}`
      )
    );

    const added: HistoricalLeaderRecord[] = [];
    CHURCH_ORG_UNITS.forEach((u) => {
      const uLabel = unitName(u.id, u.name);
      (departmentDataMap[u.id]?.leaders || []).forEach((ldr) => {
        const key = `${ldr.name.trim().toLowerCase()}|${u.id}|${yr}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          added.push({
            id: generateUniqueId(),
            name: ldr.name,
            gender: ldr.gender,
            serviceYear: yr,
            sectorId: u.id,
            sectorName: uLabel,
            responsibility: ldr.roleTitle,
            phone: ldr.phone,
            status: ldr.status === 'ንቁ' ? 'በአገልግሎት ላይ' : 'አገልግሎት የጨረሰ',
            notes: ldr.notes,
            recordedAt: new Date().toISOString().split('T')[0]
          });
        }
      });
    });

    if (added.length > 0) {
      onUpdateDepartmentData('spiritual_council', (prev) => ({
        ...prev,
        historicalLeaders: [...added, ...(prev.historicalLeaders || [])]
      }));
    }

    setShowBulkArchiveBar(false);
    showNotice(
      t(
        `✓ ${added.length} የዘርፍ መሪዎች ለ${yr} ወደ የዘመናቱ መሪዎች መዝገብ ተመዝግበዋል።`,
        `Archived ${added.length} leader(s) for ${yr} into Historical Archive.`
      )
    );
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const sectorRows = [
      [`የእያንዳንዱ ዘርፍ መሪዎች መረጃ — የመንፈሳዊ ዘርፍ ማዕከል (${currentYear} ዓ/ም)`],
      [],
      ['ተ.ቁ', 'ኮድ', 'ዘርፍ / ክፍል', 'ሙሉ ስም', 'ጾታ', 'የአመራር ድርሻ / ኃላፊነት', 'ስልክ', 'የጀመሩበት ቀን', 'ሁኔታ', 'ማስታወሻ'],
      ...filteredSectorRows.map((item, idx) => [
        idx + 1,
        item.unitCode,
        item.unitLabel,
        item.leader.name,
        item.leader.gender,
        item.leader.roleTitle,
        item.leader.phone || '-',
        formatDualDateText(item.leader.termOrStartDate, '-'),
        item.leader.status,
        item.leader.notes || '-'
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sectorRows), 'የዘርፎች_መሪዎች');

    const summaryRows = [
      ['የዘርፎች የመሪዎች ማጠቃለያ'],
      [],
      ['ኮድ', 'ዘርፍ / ክፍል', 'ጠቅላላ መሪዎች', 'ንቁ', 'ወንድ', 'ሴት'],
      ...visibleUnits.map((u) => {
        const list = departmentDataMap[u.id]?.leaders || [];
        return [
          u.code,
          unitName(u.id, u.name),
          list.length,
          list.filter((l) => l.status === 'ንቁ').length,
          list.filter((l) => l.gender === 'ወ').length,
          list.filter((l) => l.gender === 'ሴ').length
        ];
      })
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'በዘርፍ_ማጠቃለያ');

    if (chapelLeadersList.length > 0) {
      const catMap = new Map(CHAPEL_LEADER_CATEGORIES.map((c) => [c.id, c.am]));
      const chapelRows = [
        [`የ10ሩ ቻፕሎች 7ቱ የመሪዎች ክፍሎች (${currentYear} ዓ/ም)`],
        [],
        ['ተ.ቁ', 'ቻፕል', 'የመሪዎች ክፍል', 'ሙሉ ስም', 'ጾታ', 'የአመራር ድርሻ', 'ስልክ', 'ሁኔታ'],
        ...chapelLeadersList.map((cl, idx) => [
          idx + 1,
          cl.chapel,
          catMap.get(cl.category) || cl.category,
          cl.name,
          cl.gender,
          cl.roleTitle || '-',
          cl.phone || '-',
          cl.status
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chapelRows), 'የቻፕሎች_መሪዎች');
    }

    XLSX.writeFile(wb, `የሁሉም_ዘርፎች_መሪዎች_${currentYear}.xlsx`);
  };

  const catLabelMap = useMemo(
    () => new Map(CHAPEL_LEADER_CATEGORIES.map((c) => [c.id, t(c.am, c.en)])),
    [t]
  );

  return (
    <div className="space-y-5">
      {noticeMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 print:hidden">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{noticeMsg}</span>
          </span>
          {onOpenHistoricalArchive && (
            <button
              type="button"
              onClick={onOpenHistoricalArchive}
              className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer shrink-0"
            >
              {t('የዘመናቱን መዝገብ ክፈት →', 'Open Historical Archive →')}
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-sky-800 shrink-0" />
              <span>
                {t(
                  'የእያንዳንዱ ዘርፍ መሪዎች መረጃ ማዕከል (በመንፈሳዊ ዘርፍ ገጽ)',
                  'All Sectors Leaders Directory (Spiritual Council Hub)'
                )}
              </span>
            </h3>
            <p className="text-xs text-slate-600">
              {t(
                'በሁሉም ዘርፎች እና በ10ሩ ቻፕሎች የተመዘገቡ መሪዎችን በአንድ ማዕከል ይመልከቱ፣ አዲስ መሪ ይጨምሩ ወይም በየዘመናቱ መዝገብ ያስቀምጡ።',
                'View, manage, and archive active leaders across every church sector and all 10 chapels from the Spiritual Council workspace.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setShowBulkArchiveBar((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-amber-700" />
              <span>{t('ወደ የዘመናቱ መዝገብ አስተላልፍ', 'Archive Current Year')}</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
            <button
              type="button"
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-800 hover:bg-sky-700 text-white transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('ለዘርፍ መሪ ጨምር', 'Add Sector Leader')}</span>
            </button>
          </div>
        </div>

        {/* Optional Bulk Snapshot Bar */}
        {showBulkArchiveBar && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="text-xs text-amber-950 space-y-0.5">
              <div className="font-extrabold">
                {t(
                  'የሁሉንም ዘርፎች የአሁኑን መሪዎች ወደ የየዘመናቱ መዝገብ አስቀምጥ',
                  'Snapshot All Current Sector Leaders into Historical Archive'
                )}
              </div>
              <p className="text-[11px] text-amber-800">
                {t(
                  `በሁሉም ዘርፎች የተመዘገቡ (${allChurchSectorLeadersCount}) መሪዎች ከነዘርፋቸውና ኃላፊነታቸው በተመረጠው ዓ/ም ይቀመጣሉ።`,
                  `All ${allChurchSectorLeadersCount} registered sector leaders will be saved with their sector and role for the specified year.`
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                type="text"
                value={archiveYearInput}
                onChange={(e) => setArchiveYearInput(e.target.value)}
                placeholder="ለምሳሌ፡ 2019 ዓ/ም"
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-bold text-slate-900 w-36 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleBulkArchiveAllCurrent}
                className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                {t('ሁሉንም አስቀምጥ', 'Archive All Now')}
              </button>
              <button
                type="button"
                onClick={() => setShowBulkArchiveBar(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-amber-100 cursor-pointer"
              >
                {t('ዝጋ', 'Close')}
              </button>
            </div>
          </div>
        )}

        {/* Scope Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={() => {
              setViewMode('spiritual');
              setSectorFilter('all');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'spiritual'
                ? 'bg-sky-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t('በመንፈሳዊ ዘርፍ ስር ያሉ ዘርፎች', 'Spiritual Council Sectors')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('all');
              setSectorFilter('all');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'all'
                ? 'bg-sky-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {t(
                `ሁሉም የቤተክርስቲያን ዘርፎች (${allChurchSectorLeadersCount})`,
                `All Church Sectors (${allChurchSectorLeadersCount})`
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chapels_7')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'chapels_7'
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Church className="w-3.5 h-3.5" />
            <span>
              {t(
                `የ10ሩ ቻፕሎች 7ቱ መሪዎች (${chapelLeadersList.length})`,
                `10 Chapels 7-Group Leaders (${chapelLeadersList.length})`
              )}
            </span>
          </button>
        </div>
      </section>

      {/* KPI Row */}
      {viewMode !== 'chapels_7' && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-slate-500">
              {t('ጠቅላላ የዘርፍ መሪዎች', 'Total Sector Leaders')}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {sectorStats.total}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-slate-500">
              {t('መሪዎች ያስመዘገቡ ዘርፎች', 'Sectors With Leaders')}
            </div>
            <div className="text-2xl font-extrabold text-sky-900 mt-1 tabular-nums">
              {sectorStats.populatedSectors}{' '}
              <span className="text-xs font-bold text-slate-400">
                / {sectorStats.totalVisibleUnits}
              </span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-slate-500">
              {t('በንቁ አገልግሎት ላይ', 'Active Leaders')}
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
              {sectorStats.activeCount}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-slate-500">
              {t('ወንድ / ሴት', 'Male / Female')}
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {t('ወ', 'M')} {sectorStats.maleCount}{' '}
              <span className="text-slate-300">·</span> {t('ሴ', 'F')} {sectorStats.femaleCount}
            </div>
          </div>
        </section>
      )}

      {/* Sector Summary Cards Grid */}
      {viewMode !== 'chapels_7' && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visibleUnits.map((u) => {
            const list = departmentDataMap[u.id]?.leaders || [];
            const active = list.filter((l) => l.status === 'ንቁ').length;
            const isSelected = sectorFilter === u.id;
            return (
              <div
                key={u.id}
                className={`bg-white border rounded-2xl p-4 flex flex-col justify-between gap-3 transition ${
                  isSelected
                    ? 'border-sky-600 ring-2 ring-sky-200'
                    : 'border-slate-200 hover:border-sky-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSectorFilter(isSelected ? 'all' : u.id)}
                      className="text-left cursor-pointer group"
                    >
                      <div className="text-[11px] font-bold text-slate-400">{u.code}</div>
                      <div className="text-xs font-extrabold text-slate-900 group-hover:text-sky-800 leading-snug">
                        {unitName(u.id, u.name)}
                      </div>
                    </button>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-extrabold tabular-nums shrink-0 ${
                        list.length > 0
                          ? 'bg-sky-100 text-sky-900'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {list.length}
                    </span>
                  </div>

                  {list.length === 0 ? (
                    <p className="text-[11px] text-slate-400 mt-2">
                      {t('ገና መሪ አልተመዘገበም', 'No leaders recorded yet')}
                    </p>
                  ) : (
                    <ul className="mt-2.5 space-y-1">
                      {list.slice(0, 3).map((l) => (
                        <li
                          key={l.id}
                          className="text-[11px] text-slate-700 flex items-center justify-between gap-1.5 truncate"
                        >
                          <span className="font-bold truncate">• {l.name}</span>
                          <span className="text-[10px] text-slate-500 shrink-0 truncate max-w-[110px]">
                            {l.roleTitle}
                          </span>
                        </li>
                      ))}
                      {list.length > 3 && (
                        <li className="text-[10px] font-bold text-sky-700">
                          +{list.length - 3} {t('ተጨማሪ...', 'more...')}
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] print:hidden">
                  <span className="text-slate-500 font-semibold tabular-nums">
                    {t(`ንቁ: ${active}`, `Active: ${active}`)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAddModal(u.id)}
                      className="font-bold text-sky-800 hover:underline cursor-pointer"
                    >
                      + {t('ጨምር', 'Add')}
                    </button>
                    {canNavigateToUnit(u.id) && u.id !== 'spiritual_council' && (
                      <button
                        type="button"
                        onClick={() => onSelectUnit(u.id)}
                        className="inline-flex items-center gap-0.5 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                        title={t('ወደ ዘርፉ ገጽ ሂድ', 'Open sector page')}
                      >
                        <span>{t('ክፈት', 'Open')}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Filter & Table Section */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ስም፣ ዘርፍ፣ ኃላፊነት ወይም ስልክ ፈልግ...', 'Search name, sector, role, phone...')}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 w-64"
              />
            </div>

            {viewMode !== 'chapels_7' ? (
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
              >
                <option value="all">{t('ሁሉም ዘርፎች', 'All Sectors')}</option>
                {visibleUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} · {unitName(u.id, u.name)}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={chapelCategoryFilter}
                onChange={(e) =>
                  setChapelCategoryFilter(e.target.value as ChapelLeaderCategoryId | 'all')
                }
                className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">{t('ሁሉም 7ቱ የቻፕል መሪ ክፍሎች', 'All 7 Categories')}</option>
                {CHAPEL_LEADER_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.am, c.en)}
                  </option>
                ))}
              </select>
            )}

            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'all' | 'ወ' | 'ሴ')}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            >
              <option value="all">{t('ሁሉም ጾታ', 'All Genders')}</option>
              <option value="ወ">{t('ወንድ', 'Male')}</option>
              <option value="ሴ">{t('ሴት', 'Female')}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            >
              <option value="all">{t('ሁሉም ሁኔታ', 'All Statuses')}</option>
              <option value="ንቁ">{t('ንቁ', 'Active')}</option>
              <option value="በእረፍት">{t('በእረፍት', 'On Leave')}</option>
            </select>
          </div>

          <div className="text-xs font-bold text-slate-500 tabular-nums">
            {viewMode === 'chapels_7'
              ? t(`ጠቅላላ ውጤት: ${filteredChapelLeaders.length}`, `Showing: ${filteredChapelLeaders.length}`)
              : t(`ጠቅላላ ውጤት: ${filteredSectorRows.length}`, `Showing: ${filteredSectorRows.length}`)}
          </div>
        </div>

        <div className="overflow-x-auto">
          {viewMode === 'chapels_7' ? (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-4 text-left w-12">{t('ተ.ቁ', '#')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ቻፕል', 'Chapel')}</th>
                  <th className="py-2.5 px-4 text-left">{t('የመሪዎች ክፍል', 'Leader Category')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ጾታ', 'Gender')}</th>
                  <th className="py-2.5 px-4 text-left">{t('የአመራር ድርሻ', 'Role')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ስልክ', 'Phone')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChapelLeaders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                      {t('ምንም የቻፕል መሪ አልተገኘም።', 'No chapel leaders found matching filters.')}
                    </td>
                  </tr>
                ) : (
                  filteredChapelLeaders.map((cl, idx) => (
                    <tr key={cl.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {chapelLabel(cl.chapel)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">
                          {catLabelMap.get(cl.category) || cl.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-extrabold text-slate-900">{cl.name}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{cl.gender}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {cl.roleTitle || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {cl.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cl.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{cl.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-4 text-left w-12">{t('ተ.ቁ', '#')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ዘርፍ / ክፍል', 'Sector / Ministry')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ጾታ', 'Gender')}</th>
                  <th className="py-2.5 px-4 text-left">{t('የተሰጠው ኃላፊነት', 'Assigned Responsibility')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ስልክ', 'Phone')}</th>
                  <th className="py-2.5 px-3 text-left">{t('የጀመሩበት ቀን', 'Start Date')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Status')}</th>
                  <th className="py-2.5 px-4 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSectorRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <p className="font-semibold text-slate-500">
                        {t(
                          'በተመረጠው ማጣሪያ ውስጥ የተመዘገበ የዘርፍ መሪ የለም።',
                          'No sector leaders match the current filter.'
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => openAddModal()}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-800 text-white hover:bg-sky-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('ለዘርፍ መሪ ጨምር', 'Add Sector Leader')}</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredSectorRows.map((item, idx) => {
                    const rowKey = `${item.unitId}_${item.leader.id}`;
                    const isDeleting = confirmDeleteKey === rowKey;
                    return (
                      <tr key={rowKey} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 text-slate-500 tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-950 font-bold">
                            <span className="text-[10px] text-sky-700">{item.unitCode}</span>
                            <span>{item.unitLabel}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-extrabold text-slate-900">
                          {item.leader.name}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {item.leader.gender}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {item.leader.roleTitle}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {item.leader.phone || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          <DualDateBadge value={item.leader.termOrStartDate} mode="stacked" />
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.leader.status === 'ንቁ'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {item.leader.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap print:hidden">
                          {isDeleting ? (
                            <span className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteLeader(item.unitId, item.leader.id)}
                                className="px-2 py-1 rounded bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                              >
                                {t('አረጋግጥ', 'Confirm')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteKey(null)}
                                className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold text-[11px] cursor-pointer"
                              >
                                {t('ተው', 'Cancel')}
                              </button>
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  archiveSingleLeader(item.unitId, item.unitLabel, item.leader)
                                }
                                className="p-1 text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                                title={t(
                                  'ወደ የዘመናቱ መሪዎች መዝገብ አስተላልፍ',
                                  'Archive to Historical Leaders'
                                )}
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(item.unitId, item.leader)}
                                className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                                title={t('አስተካክል', 'Edit')}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteKey(rowKey)}
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
          )}
        </div>
      </section>

      {/* Add / Edit Sector Leader Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingRef
                  ? t('የዘርፍ መሪ መረጃ አስተካክል', 'Edit Sector Leader')
                  : t('አዲስ የዘርፍ መሪ መዝግብ', 'Add Sector Leader')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeader} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የአገልግሎት ዘርፍ *', 'Sector / Ministry *')}
                </label>
                <select
                  value={fUnitId}
                  onChange={(e) => setFUnitId(e.target.value as OrgUnitId)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  {CHURCH_ORG_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} · {unitName(u.id, u.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('ሙሉ ስም *', 'Full Name *')}
                </label>
                <input
                  type="text"
                  required
                  list="spiritualMemberAutoPick"
                  value={fName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFName(val);
                    const match = churchMembers.find(
                      (m) => m.name.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (match) {
                      if (match.gender === 'ሴ' || match.gender === 'ወ') {
                        setFGender(match.gender);
                      }
                      if (match.phone && !fPhone) setFPhone(match.phone);
                    }
                  }}
                  placeholder={t('ሙሉ ስም ያስገቡ ወይም ከአባላት ይምረጡ...', 'Type full name or pick member...')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
                <datalist id="spiritualMemberAutoPick">
                  {churchMembers.slice(0, 300).map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ጾታ', 'Gender')}
                  </label>
                  <select
                    value={fGender}
                    onChange={(e) => setFGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ', 'Male')}</option>
                    <option value="ሴ">{t('ሴት', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ስልክ ቁጥር', 'Phone')}
                  </label>
                  <input
                    type="text"
                    value={fPhone}
                    onChange={(e) => setFPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የተሰጠው ኃላፊነት / ድርሻ *', 'Assigned Responsibility / Role *')}
                </label>
                <input
                  type="text"
                  required
                  list="sectorRoleDatalist"
                  value={fRoleTitle}
                  onChange={(e) => setFRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
                <datalist id="sectorRoleDatalist">
                  {roleSuggestionsForModal.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የጀመሩበት ቀን', 'Start Date')}
                  </label>
                  <DualDateInput value={fStartDate} onChange={setFStartDate} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ሁኔታ', 'Status')}
                  </label>
                  <select
                    value={fStatus}
                    onChange={(e) => setFStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ንቁ">{t('ንቁ', 'Active')}</option>
                    <option value="በእረፍት">{t('በእረፍት', 'On Leave')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('ማስታወሻ', 'Notes')}
                </label>
                <input
                  type="text"
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-sky-800 hover:bg-sky-700 rounded-xl cursor-pointer"
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
