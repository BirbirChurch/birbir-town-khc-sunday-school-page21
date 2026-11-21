import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  History,
  Plus,
  Search,
  Download,
  Printer,
  Edit2,
  Trash2,
  X,
  Calendar,
  Building2,
  Award,
  Phone,
  CheckCircle2,
  Import,
  Users
} from 'lucide-react';
import {
  ChurchMember,
  DepartmentWorkspaceData,
  HistoricalLeaderRecord,
  OrgUnitId
} from '../types';
import { CHAPEL_LEADER_CATEGORIES, CHURCH_ORG_UNITS } from '../constants/churchStructure';
import { generateUniqueId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';

interface HistoricalLeadersArchiveTabProps {
  currentYear: string;
  chapelList: string[];
  churchMembers: ChurchMember[];
  departmentDataMap: { [unitId: string]: DepartmentWorkspaceData };
  records: HistoricalLeaderRecord[];
  onSaveRecords: (nextRecords: HistoricalLeaderRecord[]) => void;
}

const STANDARD_RESPONSIBILITIES = [
  'ዋና ሰብሳቢ / አስተባባሪ',
  'ምክትል ሰብሳቢ',
  'ጸሐፊ',
  'ገንዘብ ያዥ',
  'ሂሳብ ሹም / ቁጥጥር',
  'የመንፈሳዊ ዘርፍ ኃላፊ',
  'የወንጌል አገልግሎት መሪ',
  'የወጣቶች አገልግሎት አስተባባሪ',
  'የልጆች አገልግሎት አስተባባሪ',
  'የሴቶች አገልግሎት መሪ',
  'የዲያቆናት ዋና መሪ',
  'ፍቅርና ርኅራሄ አስተባባሪ',
  'የቻፕል መሪ / አስተባባሪ',
  'የልማት ዘርፍ ሰብሳቢ',
  'የአመራር ኮሚቴ አባል'
];

const ARCHIVE_STATUSES = [
  'አገልግሎት የጨረሰ',
  'በአገልግሎት ላይ',
  'በክብር የተሰናበተ',
  'ወደ ሌላ ዘርፍ የተዛወረ'
];

export const HistoricalLeadersArchiveTab: React.FC<HistoricalLeadersArchiveTabProps> = ({
  currentYear,
  chapelList,
  churchMembers,
  departmentDataMap,
  records,
  onSaveRecords
}) => {
  const { t, unitName, chapelLabel } = useLanguage();

  const [viewMode, setViewMode] = useState<'table' | 'by_year' | 'by_sector'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [noticeMsg, setNoticeMsg] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fName, setFName] = useState('');
  const [fGender, setFGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [fServiceYear, setFServiceYear] = useState(`${currentYear} ዓ/ም`);
  const [fSectorId, setFSectorId] = useState<OrgUnitId | 'other'>('spiritual_council');
  const [fCustomSectorName, setFCustomSectorName] = useState('');
  const [fChapelName, setFChapelName] = useState('');
  const [fResponsibility, setFResponsibility] = useState(STANDARD_RESPONSIBILITIES[0]);
  const [fPhone, setFPhone] = useState('');
  const [fStatus, setFStatus] = useState<string>('አገልግሎት የጨረሰ');
  const [fNotes, setFNotes] = useState('');

  // Import from current leaders prompt state
  const [showImportBar, setShowImportBar] = useState(false);
  const [importYear, setImportYear] = useState(`${currentYear} ዓ/ም`);
  const [includeChapelLeaders, setIncludeChapelLeaders] = useState(true);

  const showNotice = (msg: string) => {
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(''), 5000);
  };

  const distinctYears = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.serviceYear?.trim()) set.add(r.serviceYear.trim());
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const distinctSectors = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      const label = r.sectorId !== 'other' ? unitName(r.sectorId, r.sectorName) : r.sectorName;
      if (label) map.set(r.sectorId === 'other' ? `custom:${label}` : r.sectorId, label);
    });
    return Array.from(map.entries());
  }, [records, unitName]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (yearFilter !== 'all' && r.serviceYear.trim() !== yearFilter) return false;
      if (sectorFilter !== 'all') {
        const key = r.sectorId === 'other' ? `custom:${r.sectorName}` : r.sectorId;
        if (key !== sectorFilter) return false;
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      const resolvedSector =
        r.sectorId !== 'other' ? unitName(r.sectorId, r.sectorName) : r.sectorName;
      return (
        r.name.toLowerCase().includes(q) ||
        r.serviceYear.toLowerCase().includes(q) ||
        resolvedSector.toLowerCase().includes(q) ||
        r.responsibility.toLowerCase().includes(q) ||
        (r.chapelName || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    });
  }, [records, yearFilter, sectorFilter, statusFilter, searchQuery, unitName]);

  const groupedByYear = useMemo(() => {
    const map = new Map<string, HistoricalLeaderRecord[]>();
    filteredRecords.forEach((r) => {
      const key = r.serviceYear.trim() || t('ያልተገለጸ ዓ/ም', 'Unspecified Year');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRecords, t]);

  const groupedBySector = useMemo(() => {
    const map = new Map<string, HistoricalLeaderRecord[]>();
    filteredRecords.forEach((r) => {
      const label =
        r.sectorId !== 'other' ? unitName(r.sectorId, r.sectorName) : r.sectorName;
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRecords, unitName]);

  const kpis = useMemo(() => {
    const uniqueLeaders = new Set(records.map((r) => r.name.trim().toLowerCase())).size;
    const uniqueYears = new Set(records.map((r) => r.serviceYear.trim())).size;
    const uniqueSectors = new Set(
      records.map((r) => (r.sectorId === 'other' ? r.sectorName : r.sectorId))
    ).size;
    return {
      totalRecords: records.length,
      uniqueLeaders,
      uniqueYears,
      uniqueSectors
    };
  }, [records]);

  const roleSuggestions = useMemo(() => {
    const unitRoles =
      fSectorId !== 'other'
        ? CHURCH_ORG_UNITS.find((u) => u.id === fSectorId)?.roleOptions || []
        : [];
    return Array.from(new Set([...STANDARD_RESPONSIBILITIES, ...unitRoles].filter(Boolean)));
  }, [fSectorId]);

  const openAddModal = () => {
    setEditingId(null);
    setFName('');
    setFGender('ወ');
    setFServiceYear(`${currentYear} ዓ/ም`);
    setFSectorId('spiritual_council');
    setFCustomSectorName('');
    setFChapelName('');
    setFResponsibility(STANDARD_RESPONSIBILITIES[0]);
    setFPhone('');
    setFStatus('አገልግሎት የጨረሰ');
    setFNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (rec: HistoricalLeaderRecord) => {
    setEditingId(rec.id);
    setFName(rec.name);
    setFGender(rec.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setFServiceYear(rec.serviceYear);
    setFSectorId(rec.sectorId);
    setFCustomSectorName(rec.sectorId === 'other' ? rec.sectorName : '');
    setFChapelName(rec.chapelName || '');
    setFResponsibility(rec.responsibility);
    setFPhone(rec.phone || '');
    setFStatus(rec.status || 'አገልግሎት የጨረሰ');
    setFNotes(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !fServiceYear.trim() || !fResponsibility.trim()) return;

    const unitDef =
      fSectorId !== 'other' ? CHURCH_ORG_UNITS.find((u) => u.id === fSectorId) : undefined;
    const resolvedSectorName =
      fSectorId === 'other'
        ? fCustomSectorName.trim() || 'ሌላ ዘርፍ'
        : unitDef?.name || 'የመንፈሳዊ ዘርፍ ጉባኤ';

    const record: HistoricalLeaderRecord = {
      id: editingId ?? generateUniqueId(),
      name: fName.trim(),
      gender: fGender,
      serviceYear: fServiceYear.trim(),
      sectorId: fSectorId,
      sectorName: resolvedSectorName,
      chapelName: fChapelName.trim() || undefined,
      responsibility: fResponsibility.trim(),
      phone: fPhone.trim() || undefined,
      status: fStatus,
      notes: fNotes.trim() || undefined,
      recordedAt: new Date().toISOString().split('T')[0]
    };

    const next = editingId
      ? records.map((r) => (r.id === editingId ? record : r))
      : [record, ...records];
    onSaveRecords(next);
    setIsModalOpen(false);
    showNotice(
      t(
        `✓ ${record.name} (${record.serviceYear} · ${resolvedSectorName}) ተመዝግቧል።`,
        `Saved ${record.name} (${record.serviceYear} · ${resolvedSectorName}).`
      )
    );
  };

  const handleDelete = (id: number) => {
    onSaveRecords(records.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
  };

  const handleImportCurrentLeaders = () => {
    const yr = importYear.trim() || `${currentYear} ዓ/ም`;
    const existingKeys = new Set(
      records.map(
        (r) =>
          `${r.name.trim().toLowerCase()}|${r.sectorId}|${r.chapelName || ''}|${r.serviceYear.trim()}`
      )
    );

    const added: HistoricalLeaderRecord[] = [];
    const today = new Date().toISOString().split('T')[0];

    CHURCH_ORG_UNITS.forEach((u) => {
      (departmentDataMap[u.id]?.leaders || []).forEach((ldr) => {
        const key = `${ldr.name.trim().toLowerCase()}|${u.id}||${yr}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          added.push({
            id: generateUniqueId(),
            name: ldr.name,
            gender: ldr.gender,
            serviceYear: yr,
            sectorId: u.id,
            sectorName: u.name,
            responsibility: ldr.roleTitle,
            phone: ldr.phone,
            status: ldr.status === 'ንቁ' ? 'በአገልግሎት ላይ' : 'አገልግሎት የጨረሰ',
            notes: ldr.notes,
            recordedAt: today
          });
        }
      });
    });

    if (includeChapelLeaders) {
      const catMap = new Map(CHAPEL_LEADER_CATEGORIES.map((c) => [c.id, c.am]));
      (departmentDataMap.chapels_dept?.chapelLeaders || []).forEach((cl) => {
        const catLabel = catMap.get(cl.category) || cl.category;
        const resp = cl.roleTitle ? `${catLabel} — ${cl.roleTitle}` : catLabel;
        const key = `${cl.name.trim().toLowerCase()}|chapels_dept|${cl.chapel}|${yr}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          added.push({
            id: generateUniqueId(),
            name: cl.name,
            gender: cl.gender,
            serviceYear: yr,
            sectorId: 'chapels_dept',
            sectorName: 'ቻፕሎች',
            chapelName: cl.chapel,
            responsibility: resp,
            phone: cl.phone,
            status: cl.status === 'ንቁ' ? 'በአገልግሎት ላይ' : 'አገልግሎት የጨረሰ',
            notes: cl.notes,
            recordedAt: today
          });
        }
      });
    }

    if (added.length > 0) {
      onSaveRecords([...added, ...records]);
    }
    setShowImportBar(false);
    showNotice(
      t(
        `✓ ${added.length} የአመራር መዝገቦች ለ${yr} ከየዘርፎቹ ወደ ታሪካዊ መዝገብ ገብተዋል።`,
        `Imported ${added.length} leader record(s) for ${yr} into Historical Archive.`
      )
    );
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ['በየጊዜው ያገለገሉ መሪዎች መዝገብ (ከነ ዓ/ም፣ ዘርፍ እና የተሰጠው ኃላፊነት)'],
      [],
      [
        'ተ.ቁ',
        'ያገለገሉበት ዓ/ም',
        'ሙሉ ስም',
        'ጾታ',
        'ያገለገሉበት ዘርፍ',
        'ቻፕል',
        'የተሰጠው ኃላፊነት',
        'ስልክ',
        'ሁኔታ',
        'ማስታወሻ'
      ],
      ...filteredRecords.map((r, idx) => [
        idx + 1,
        r.serviceYear,
        r.name,
        r.gender,
        r.sectorId !== 'other' ? unitName(r.sectorId, r.sectorName) : r.sectorName,
        r.chapelName || '-',
        r.responsibility,
        r.phone || '-',
        r.status,
        r.notes || '-'
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'የየዘመናቱ_መሪዎች');
    XLSX.writeFile(wb, `የየዘመናቱ_መሪዎች_መዝገብ_${currentYear}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {noticeMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{noticeMsg}</span>
        </div>
      )}

      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-700 shrink-0" />
              <span>
                {t(
                  'በየጊዜው ያገለገሉ መሪዎች መዝገብ (ዓ/ም · ዘርፍ · የተሰጠው ኃላፊነት)',
                  'Historical Leaders Service Archive (Service Year · Sector · Responsibility)'
                )}
              </span>
            </h3>
            <p className="text-xs text-slate-600">
              {t(
                'በቤተክርስቲያኒቱ በየዘመናቱ ያገለገሉ መሪዎችን ከነ ዓመተ ምህረታቸው፣ ካገለገሉበት ዘርፍ እና ከተሰጣቸው ኃላፊነት ጋር በቋሚ መዝገብ ያስቀምጡ።',
                'Permanent record of past and present church leaders with their exact service years, ministries/sectors, and assigned responsibilities.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setShowImportBar((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 transition cursor-pointer"
            >
              <Import className="w-3.5 h-3.5 text-amber-700" />
              <span>{t('ከአሁኑ የዘርፍ መሪዎች አምጣ', 'Snapshot Current Leaders')}</span>
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
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-800 hover:bg-sky-700 text-white transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('የቀድሞ/የዘመን መሪ መዝግብ', 'Add Service Record')}</span>
            </button>
          </div>
        </div>

        {/* Snapshot Import Bar */}
        {showImportBar && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
            <div className="space-y-1 text-xs text-amber-950">
              <div className="font-extrabold">
                {t(
                  'ከሁሉም ዘርፎች አሁን ያሉትን መሪዎች ወደዚህ ታሪካዊ መዝገብ አስገባ',
                  'Import All Current Sector Leaders as a Service Year Snapshot'
                )}
              </div>
              <label className="inline-flex items-center gap-2 text-[11px] font-bold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChapelLeaders}
                  onChange={(e) => setIncludeChapelLeaders(e.target.checked)}
                  className="rounded border-amber-400"
                />
                <span>
                  {t(
                    'የ10ሩ ቻፕሎች 7ቱ የመሪዎች ክፍሎችንም አካትት',
                    'Also include 7-group leaders from all 10 Chapels'
                  )}
                </span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={importYear}
                onChange={(e) => setImportYear(e.target.value)}
                placeholder="ለምሳሌ፡ 2019 ዓ/ም"
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-bold w-36 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleImportCurrentLeaders}
                className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                {t('አስገባ', 'Import Snapshot')}
              </button>
              <button
                type="button"
                onClick={() => setShowImportBar(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-amber-100 cursor-pointer"
              >
                {t('ዝጋ', 'Close')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">
            {t('ጠቅላላ የአገልግሎት መዝገቦች', 'Total Service Records')}
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {kpis.totalRecords}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">
            {t('ያገለገሉ መሪዎች (ግለሰቦች)', 'Distinct Leaders Served')}
          </div>
          <div className="text-2xl font-extrabold text-sky-900 mt-1 tabular-nums">
            {kpis.uniqueLeaders}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">
            {t('የተመዘገቡ ዓመተ ምህረቶች', 'Service Years Recorded')}
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">
            {kpis.uniqueYears}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">
            {t('የተሸፈኑ ዘርፎች', 'Sectors Covered')}
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">
            {kpis.uniqueSectors}
          </div>
        </div>
      </section>

      {/* Controls & View Modes */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Toggle */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  viewMode === 'table'
                    ? 'bg-sky-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t('ዝርዝር ሠንጠረዥ', 'Table View')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by_year')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  viewMode === 'by_year'
                    ? 'bg-amber-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('በዓ/ም የተደራጀ', 'Grouped by Year (ዓ/ም)')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by_sector')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                  viewMode === 'by_sector'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{t('በዘርፍ የተደራጀ', 'Grouped by Sector')}</span>
              </button>
            </div>

            <div className="text-xs font-bold text-slate-500 tabular-nums">
              {t(`ጠቅላላ: ${filteredRecords.length} መዝገቦች`, `Showing ${filteredRecords.length} record(s)`)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ስም፣ ዓ/ም፣ ዘርፍ ወይም ኃላፊነት ፈልግ...', 'Search name, year, sector, role...')}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600 w-64"
              />
            </div>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            >
              <option value="all">{t('ሁሉም ዓመተ ምህረቶች', 'All Service Years')}</option>
              {distinctYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            >
              <option value="all">{t('ሁሉም ዘርፎች', 'All Sectors')}</option>
              {distinctSectors.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            >
              <option value="all">{t('ሁሉም ሁኔታዎች', 'All Statuses')}</option>
              {ARCHIVE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View 1: Full Table */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-4 text-left w-12">{t('ተ.ቁ', '#')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ያገለገሉበት ዓ/ም', 'Service Year (ዓ/ም)')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ጾታ', 'Gender')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ያገለገሉበት ዘርፍ', 'Sector Served')}</th>
                  <th className="py-2.5 px-4 text-left">{t('የተሰጠው ኃላፊነት', 'Assigned Responsibility')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ስልክ', 'Phone')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Status')}</th>
                  <th className="py-2.5 px-4 text-left">{t('ማስታወሻ', 'Notes')}</th>
                  <th className="py-2.5 px-4 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <p className="font-semibold text-slate-500">
                        {t(
                          'ገና ምንም የየዘመናቱ መሪዎች መዝገብ አልተጻፈም።',
                          'No historical leader service records entered yet.'
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-800 text-white hover:bg-sky-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('የመጀመሪያውን መዝገብ ጨምር', 'Add First Service Record')}</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, idx) => {
                    const resolvedSector =
                      rec.sectorId !== 'other'
                        ? unitName(rec.sectorId, rec.sectorName)
                        : rec.sectorName;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 text-slate-500 tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 font-extrabold whitespace-nowrap tabular-nums">
                            {rec.serviceYear}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-extrabold text-slate-900">{rec.name}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{rec.gender}</td>
                        <td className="py-2.5 px-4 font-bold text-sky-900">
                          {resolvedSector}
                          {rec.chapelName && (
                            <span className="ml-1.5 text-[11px] font-semibold text-slate-500">
                              ({chapelLabel(rec.chapelName)})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {rec.responsibility}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {rec.phone || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${
                              rec.status === 'በአገልግሎት ላይ'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 max-w-[180px] truncate">
                          {rec.notes || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap print:hidden">
                          {confirmDeleteId === rec.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDelete(rec.id)}
                                className="px-2 py-1 rounded bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                              >
                                {t('አረጋግጥ', 'Confirm')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold text-[11px] cursor-pointer"
                              >
                                {t('ተው', 'Cancel')}
                              </button>
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(rec)}
                                className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                                title={t('አስተካክል', 'Edit')}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(rec.id)}
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
        )}

        {/* View 2: Grouped by Year (ዓ/ም) */}
        {viewMode === 'by_year' && (
          <div className="p-5 space-y-4">
            {groupedByYear.length === 0 ? (
              <div className="py-10 text-center text-xs font-semibold text-slate-400">
                {t('ምንም መዝገብ አልተገኘም።', 'No records found.')}
              </div>
            ) : (
              groupedByYear.map(([yr, items]) => (
                <div key={yr} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-amber-50/80 px-4 py-3 border-b border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-amber-950">
                      <Calendar className="w-4 h-4 text-amber-700" />
                      <span>{yr}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-amber-200 text-xs font-extrabold text-amber-900 tabular-nums">
                      {items.length} {t('መሪዎች', 'Leaders')}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {items.map((rec) => {
                      const resolvedSector =
                        rec.sectorId !== 'other'
                          ? unitName(rec.sectorId, rec.sectorName)
                          : rec.sectorName;
                      return (
                        <div
                          key={rec.id}
                          className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-extrabold text-slate-900 text-sm">{rec.name}</span>
                            <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-900 font-bold">
                              {resolvedSector}
                              {rec.chapelName ? ` · ${chapelLabel(rec.chapelName)}` : ''}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                              <Award className="w-3 h-3 text-amber-600" />
                              {rec.responsibility}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-500">
                            {rec.phone && (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3" />
                                {rec.phone}
                              </span>
                            )}
                            <span className="font-semibold">{rec.status}</span>
                            <button
                              type="button"
                              onClick={() => openEditModal(rec)}
                              className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer print:hidden"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* View 3: Grouped by Sector */}
        {viewMode === 'by_sector' && (
          <div className="p-5 space-y-4">
            {groupedBySector.length === 0 ? (
              <div className="py-10 text-center text-xs font-semibold text-slate-400">
                {t('ምንም መዝገብ አልተገኘም።', 'No records found.')}
              </div>
            ) : (
              groupedBySector.map(([sectorTitle, items]) => (
                <div key={sectorTitle} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-sky-50/80 px-4 py-3 border-b border-sky-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-sky-950">
                      <Building2 className="w-4 h-4 text-sky-700" />
                      <span>{sectorTitle}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-sky-200 text-xs font-extrabold text-sky-900 tabular-nums">
                      {items.length} {t('መዝገቦች', 'Records')}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {items
                      .slice()
                      .sort((a, b) => b.serviceYear.localeCompare(a.serviceYear))
                      .map((rec) => (
                        <div
                          key={rec.id}
                          className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 font-extrabold tabular-nums">
                              {rec.serviceYear}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">{rec.name}</span>
                            <span className="font-bold text-slate-700">{rec.responsibility}</span>
                            {rec.chapelName && (
                              <span className="text-slate-500 font-semibold">
                                ({chapelLabel(rec.chapelName)})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-slate-500">
                            <span className="font-semibold">{rec.status}</span>
                            <button
                              type="button"
                              onClick={() => openEditModal(rec)}
                              className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer print:hidden"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Add / Edit Historical Leader Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId
                  ? t('የየዘመናቱ መሪ መዝገብ አስተካክል', 'Edit Historical Leader Record')
                  : t('በየጊዜው ያገለገለ መሪ መዝግብ', 'Record Leader Service History')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የመሪው ሙሉ ስም *', 'Leader Full Name *')}
                </label>
                <input
                  type="text"
                  required
                  list="historicalLeaderMemberPick"
                  value={fName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFName(val);
                    const match = churchMembers.find(
                      (m) => m.name.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (match) {
                      if (match.gender === 'ሴ' || match.gender === 'ወ') setFGender(match.gender);
                      if (match.phone && !fPhone) setFPhone(match.phone);
                    }
                  }}
                  placeholder={t('ሙሉ ስም ያስገቡ ወይም ከአባላት ይምረጡ...', 'Full name...')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
                <datalist id="historicalLeaderMemberPick">
                  {churchMembers.slice(0, 300).map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ያገለገሉበት ዓመተ ምህረት (ዓ/ም) *', 'Service Year / Period (ዓ/ም) *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fServiceYear}
                    onChange={(e) => setFServiceYear(e.target.value)}
                    placeholder="ምሳሌ፡ 2015–2018 ዓ/ም"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[`${currentYear} ዓ/ም`, '2018 ዓ/ም', '2015–2018 ዓ/ም', '2010–2014 ዓ/ም'].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFServiceYear(preset)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-[10px] font-bold text-slate-700 cursor-pointer"
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                      {t('ስልክ', 'Phone')}
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ያገለገሉበት ዘርፍ *', 'Sector Served *')}
                  </label>
                  <select
                    value={fSectorId}
                    onChange={(e) => setFSectorId(e.target.value as OrgUnitId | 'other')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    {CHURCH_ORG_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code} · {unitName(u.id, u.name)}
                      </option>
                    ))}
                    <option value="other">{t('ሌላ / የቀድሞ ዘርፍ ስም...', 'Other / Custom Sector...')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ቻፕል (አስፈላጊ ከሆነ)', 'Chapel (Optional)')}
                  </label>
                  <select
                    value={fChapelName}
                    onChange={(e) => setFChapelName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="">{t('— ማዕከላዊ / ሁሉም ቻፕሎች —', '— Central / All Chapels —')}</option>
                    {chapelList.map((ch) => (
                      <option key={ch} value={ch}>
                        {chapelLabel(ch)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {fSectorId === 'other' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የዘርፉ ስም *', 'Custom Sector Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fCustomSectorName}
                    onChange={(e) => setFCustomSectorName(e.target.value)}
                    placeholder={t('የዘርፉን ስም ይጻፉ...', 'Enter sector name...')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የተሰጠው ኃላፊነት / ድርሻ *', 'Assigned Responsibility / Role *')}
                </label>
                <input
                  type="text"
                  required
                  list="historicalRoleDatalist"
                  value={fResponsibility}
                  onChange={(e) => setFResponsibility(e.target.value)}
                  placeholder={t('ለምሳሌ፡ ዋና ሰብሳቢ፣ ጸሐፊ፣ ወጣቶች አስተባባሪ...', 'e.g., Chairperson, Secretary...')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
                <datalist id="historicalRoleDatalist">
                  {roleSuggestions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የአገልግሎት ሁኔታ', 'Service Status')}
                  </label>
                  <select
                    value={fStatus}
                    onChange={(e) => setFStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    {ARCHIVE_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ማስታወሻ', 'Notes')}
                  </label>
                  <input
                    type="text"
                    value={fNotes}
                    onChange={(e) => setFNotes(e.target.value)}
                    placeholder={t('ተጨማሪ ማብራሪያ...', 'Optional note...')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
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
                  {t('አስቀምጥ', 'Save Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
