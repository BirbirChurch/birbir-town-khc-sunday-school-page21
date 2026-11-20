import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  HeartHandshake,
  Clock,
  CheckCircle2,
  Globe,
  Flag,
  MapPin,
  Navigation,
  Plus,
  Search,
  Download,
  Upload,
  Printer,
  Edit2,
  Trash2,
  X,
  Wallet
} from 'lucide-react';
import {
  BeneficiarySupportType,
  CompassionBeneficiaryRecord,
  EvangelismMissionaryRecord,
  MissionaryScope
} from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { readCSVFile } from '../utils/csv';
import { useLanguage } from '../context/LanguageContext';

/* ============================================================================
 * 1. LOVE & COMPASSION: PERMANENT & TEMPORARY BENEFICIARIES (ቋሚ እና ጊዜያዊ ተረጂ)
 * ============================================================================ */

interface CompassionBeneficiariesPanelProps {
  currentYear: string;
  records: CompassionBeneficiaryRecord[];
  chapelList: string[];
  onSaveRecords: (updated: CompassionBeneficiaryRecord[]) => void;
}

const AID_CATEGORY_OPTIONS = [
  'የምግብና ቀለብ ድጋፍ',
  'የወርሃዊ ገንዘብ ድጋፍ',
  'የህክምና ድጋፍ',
  'ወላጅ አልባ ህፃናት ድጋፍ',
  'አረጋውያን ድጋፍ',
  'የትምህርት ቁሳቁስ ድጋፍ',
  'የአልባሳትና መጠለያ/ቤት ኪራይ'
];

export const CompassionBeneficiariesPanel: React.FC<CompassionBeneficiariesPanelProps> = ({
  currentYear,
  records,
  chapelList,
  onSaveRecords
}) => {
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState<'all' | BeneficiarySupportType>('all');
  const [chapelFilter, setChapelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [bSupportType, setBSupportType] = useState<BeneficiarySupportType>('permanent');
  const [bName, setBName] = useState('');
  const [bGender, setBGender] = useState<'ወ' | 'ሴ'>('ሴ');
  const [bAge, setBAge] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [bChapel, setBChapel] = useState('');
  const [bAddress, setBAddress] = useState('');
  const [bAidCat, setBAidCat] = useState(AID_CATEGORY_OPTIONS[0]);
  const [bAmount, setBAmount] = useState('');
  const [bStartDate, setBStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bEndDate, setBEndDate] = useState('');
  const [bFamilySize, setBFamilySize] = useState('');
  const [bStatus, setBStatus] = useState('በድጋፍ ላይ');
  const [bNotes, setBNotes] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4500);
  };

  const stats = useMemo(() => {
    const permanent = records.filter((r) => r.supportType === 'permanent');
    const temporary = records.filter((r) => r.supportType === 'temporary');
    const permanentAid = permanent.reduce((s, r) => s + (Number(r.monthlyAidAmount) || 0), 0);
    const temporaryAid = temporary.reduce((s, r) => s + (Number(r.monthlyAidAmount) || 0), 0);
    return {
      total: records.length,
      permanentCount: permanent.length,
      temporaryCount: temporary.length,
      permanentAid,
      temporaryAid,
      totalAid: permanentAid + temporaryAid
    };
  }, [records]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (typeFilter !== 'all' && r.supportType !== typeFilter) return false;
      if (chapelFilter !== 'all' && (r.chapel || '') !== chapelFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.aidCategory.toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.chapel || '').toLowerCase().includes(q) ||
        (r.address || '').toLowerCase().includes(q)
      );
    });
  }, [records, typeFilter, chapelFilter, searchQuery]);

  const openAdd = (defaultType: BeneficiarySupportType = 'permanent') => {
    setEditingId(null);
    setBSupportType(typeFilter === 'all' ? defaultType : typeFilter);
    setBName('');
    setBGender('ሴ');
    setBAge('');
    setBPhone('');
    setBChapel('');
    setBAddress('');
    setBAidCat(AID_CATEGORY_OPTIONS[0]);
    setBAmount('');
    setBStartDate(new Date().toISOString().split('T')[0]);
    setBEndDate('');
    setBFamilySize('');
    setBStatus('በድጋፍ ላይ');
    setBNotes('');
    setIsModalOpen(true);
  };

  const openEdit = (rec: CompassionBeneficiaryRecord) => {
    setEditingId(rec.id);
    setBSupportType(rec.supportType);
    setBName(rec.name);
    setBGender(rec.gender === 'ወ' ? 'ወ' : 'ሴ');
    setBAge(rec.age !== undefined ? String(rec.age) : '');
    setBPhone(rec.phone || '');
    setBChapel(rec.chapel || '');
    setBAddress(rec.address || '');
    setBAidCat(rec.aidCategory || AID_CATEGORY_OPTIONS[0]);
    setBAmount(rec.monthlyAidAmount !== undefined ? String(rec.monthlyAidAmount) : '');
    setBStartDate(rec.startDate || '');
    setBEndDate(rec.endDate || '');
    setBFamilySize(rec.familySize !== undefined ? String(rec.familySize) : '');
    setBStatus(rec.status || 'በድጋፍ ላይ');
    setBNotes(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim()) return;
    const item: CompassionBeneficiaryRecord = {
      id: editingId ?? generateUniqueId(),
      supportType: bSupportType,
      name: bName.trim(),
      gender: bGender,
      age: bAge.trim() ? Number(bAge) || bAge.trim() : undefined,
      phone: bPhone.trim() || undefined,
      chapel: bChapel.trim() || undefined,
      address: bAddress.trim() || undefined,
      aidCategory: bAidCat.trim() || AID_CATEGORY_OPTIONS[0],
      monthlyAidAmount: bAmount.trim() ? parseFloat(bAmount) || 0 : undefined,
      startDate: bStartDate || undefined,
      endDate: bSupportType === 'temporary' ? bEndDate || undefined : undefined,
      familySize: bFamilySize.trim() ? parseInt(bFamilySize, 10) || undefined : undefined,
      status: bStatus,
      notes: bNotes.trim() || undefined
    };

    const next = editingId
      ? records.map((r) => (r.id === editingId ? item : r))
      : [item, ...records];
    onSaveRecords(next);
    setIsModalOpen(false);
    showNotice(
      t(
        `✓ "${item.name}" (${item.supportType === 'permanent' ? 'ቋሚ ተረጂ' : 'ጊዜያዊ ተረጂ'}) ተቀምጧል!`,
        `Saved "${item.name}" (${item.supportType === 'permanent' ? 'Permanent' : 'Temporary'})!`
      )
    );
  };

  const handleDelete = (id: number) => {
    onSaveRecords(records.filter((r) => r.id !== id));
    showNotice(t('✓ የተረጂ መዝገብ ተሰርዟል።', 'Beneficiary record removed.'));
  };

  const handleExportXlsx = () => {
    const rows = [
      [`ፍቅርና ርኅራሄ — የቋሚና ጊዜያዊ ተረጂዎች መዝገብ (${currentYear} ዓ/ም)`],
      [
        `ጠቅላላ: ${stats.total} | ቋሚ ተረጂ: ${stats.permanentCount} | ጊዜያዊ ተረጂ: ${stats.temporaryCount} | ወርሃዊ ድጋፍ: ${stats.totalAid.toLocaleString()} ብር`
      ],
      [],
      [
        'ተ.ቁ',
        'የተረጂ ዓይነት',
        'ሙሉ ስም',
        'ጾታ',
        'ዕድሜ',
        'የድጋፍ ዘርፍ',
        'ወርሃዊ/ድጋፍ መጠን (ብር)',
        'ቻፕል',
        'አድራሻ',
        'ስልክ',
        'የተጀመረበት ቀን',
        'የሚያበቃበት/ግምገማ ቀን',
        'ሁኔታ',
        'ማስታወሻ'
      ],
      ...filtered.map((r, idx) => [
        idx + 1,
        r.supportType === 'permanent' ? 'ቋሚ ተረጂ' : 'ጊዜያዊ ተረጂ',
        r.name,
        r.gender,
        r.age ?? '-',
        r.aidCategory,
        r.monthlyAidAmount ?? 0,
        r.chapel || '-',
        r.address || '-',
        r.phone || '-',
        r.startDate || '-',
        r.endDate || '-',
        r.status,
        r.notes || '-'
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ቋሚና_ጊዜያዊ_ተረጂዎች');
    XLSX.writeFile(wb, `ፍቅርና_ርኅራሄ_ተረጂዎች_${currentYear}.xlsx`);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readCSVFile(file);
      if (rows.length <= 1) {
        showNotice(t('የተመረጠው ፋይል ባዶ ነው።', 'Selected file is empty.'));
        e.target.value = '';
        return;
      }
      const startIdx =
        rows[0].some((c) => c.includes('ስም') || c.toLowerCase().includes('name')) ? 1 : 0;
      const additions: CompassionBeneficiaryRecord[] = [];
      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 2) continue;
        const typeRaw = (cols[1] || '').trim();
        const isTemp =
          typeRaw.includes('ጊዜ') ||
          typeRaw.toLowerCase().includes('temp');
        const nameVal = (cols[2] || cols[1] || cols[0] || '').trim();
        if (!nameVal || nameVal === 'ሙሉ ስም') continue;
        const genderRaw = (cols[3] || '').trim();
        const genderVal: 'ወ' | 'ሴ' =
          genderRaw === 'ወ' || genderRaw.includes('ወንድ') || genderRaw.toLowerCase().startsWith('m')
            ? 'ወ'
            : 'ሴ';

        additions.push({
          id: generateUniqueId(),
          supportType: isTemp ? 'temporary' : 'permanent',
          name: nameVal,
          gender: genderVal,
          age: cols[4]?.trim() || undefined,
          aidCategory: cols[5]?.trim() || AID_CATEGORY_OPTIONS[0],
          monthlyAidAmount: cols[6] ? parseFloat(cols[6]) || undefined : undefined,
          chapel: cols[7]?.trim() || undefined,
          address: cols[8]?.trim() || undefined,
          phone: cols[9]?.trim() || undefined,
          startDate: new Date().toISOString().split('T')[0],
          status: 'በድጋፍ ላይ'
        });
      }
      if (additions.length > 0) {
        onSaveRecords([...additions, ...records]);
        showNotice(
          t(
            `✓ ${additions.length} ተረጂዎች ከExcel/CSV ተጭነዋል!`,
            `Imported ${additions.length} beneficiaries!`
          )
        );
      }
    } catch {
      showNotice(t('ፋይሉን ማንበብ አልተሳካም።', 'Failed to import file.'));
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Print Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-semibold">
          ፍቅርና ርኅራሄ — የቋሚና ጊዜያዊ ተረጂዎች መዝገብ ({currentYear} ዓ/ም)
        </h2>
        <p className="text-xs mt-1">
          ቋሚ ተረጂ፦ {stats.permanentCount} · ጊዜያዊ ተረጂ፦ {stats.temporaryCount} · ጠቅላላ፦{' '}
          {stats.total}
        </p>
      </div>

      {/* KPI Cards (Clickable filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`text-left rounded-2xl p-4 border transition cursor-pointer ${
            typeFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold opacity-80">
            <span>{t('ጠቅላላ ተረጂዎች', 'All Beneficiaries')}</span>
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold mt-1 tabular-nums">{stats.total}</div>
          <div className="text-[11px] opacity-75 mt-0.5">
            {t('ቋሚ + ጊዜያዊ ተረጂዎች', 'Permanent + Temporary')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('permanent')}
          className={`text-left rounded-2xl p-4 border transition cursor-pointer ${
            typeFilter === 'permanent'
              ? 'bg-emerald-900 text-white border-emerald-900'
              : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span>{t('ቋሚ ተረጂ', 'Permanent Beneficiaries')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold mt-1 tabular-nums">{stats.permanentCount}</div>
          <div className="text-[11px] opacity-80 mt-0.5 tabular-nums">
            {t(`ወርሃዊ ድጋፍ: ${stats.permanentAid.toLocaleString()} ብር`, `Monthly: ${stats.permanentAid.toLocaleString()} ETB`)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('temporary')}
          className={`text-left rounded-2xl p-4 border transition cursor-pointer ${
            typeFilter === 'temporary'
              ? 'bg-amber-800 text-white border-amber-800'
              : 'bg-amber-50/70 border-amber-200 hover:border-amber-400 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span>{t('ጊዜያዊ ተረጂ', 'Temporary Beneficiaries')}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold mt-1 tabular-nums">{stats.temporaryCount}</div>
          <div className="text-[11px] opacity-80 mt-0.5 tabular-nums">
            {t(`የድጋፍ መጠን: ${stats.temporaryAid.toLocaleString()} ብር`, `Support: ${stats.temporaryAid.toLocaleString()} ETB`)}
          </div>
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('ጠቅላላ ወርሃዊ/ድጋፍ በጀት', 'Total Monthly Support')}</span>
            <Wallet className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {stats.totalAid.toLocaleString()} <span className="text-xs font-bold">{t('ብር', 'ETB')}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {t('ለቋሚና ጊዜያዊ ተረጂዎች', 'Across permanent & temporary')}
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ተረጂ ስም፣ አድራሻ ወይም ስልክ ፈልግ...', 'Search beneficiary...')}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | BeneficiarySupportType)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
          >
            <option value="all">{t('ሁሉም (ቋሚ + ጊዜያዊ)', 'All Types')}</option>
            <option value="permanent">{t('ቋሚ ተረጂ ብቻ', 'Permanent Only')}</option>
            <option value="temporary">{t('ጊዜያዊ ተረጂ ብቻ', 'Temporary Only')}</option>
          </select>

          <select
            value={chapelFilter}
            onChange={(e) => setChapelFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
          >
            <option value="all">{t('ሁሉም ቻፕሎች', 'All Chapels')}</option>
            {chapelList.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{t('Excel ጫን', 'Import')}</span>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportCSV} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleExportXlsx}
            className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('Excel አውርድ', 'Export')}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('አትም', 'Print')}</span>
          </button>
          <button
            type="button"
            onClick={() => openAdd('permanent')}
            className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('ቋሚ ተረጂ ጨምር', '+ Permanent')}</span>
          </button>
          <button
            type="button"
            onClick={() => openAdd('temporary')}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('ጊዜያዊ ተረጂ ጨምር', '+ Temporary')}</span>
          </button>
        </div>
      </div>

      {/* Beneficiaries Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-3 text-left w-10">#</th>
                <th className="py-3 px-3 text-left">{t('የተረጂ ዓይነት', 'Type')}</th>
                <th className="py-3 px-3 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                <th className="py-3 px-3 text-center">{t('ጾታ / ዕድሜ', 'Gender / Age')}</th>
                <th className="py-3 px-3 text-left">{t('የድጋፍ ዘርፍ', 'Aid Category')}</th>
                <th className="py-3 px-3 text-right">{t('መጠን (ብር)', 'Amount (ETB)')}</th>
                <th className="py-3 px-3 text-left">{t('ቻፕል / ስልክ', 'Chapel / Phone')}</th>
                <th className="py-3 px-3 text-center">{t('ሁኔታ', 'Status')}</th>
                <th className="py-3 px-3 text-right print:hidden">{t('እርምጃ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    {t(
                      'እስካሁን የተመዘገበ ቋሚ ወይም ጊዜያዊ ተረጂ የለም።',
                      'No permanent or temporary beneficiaries recorded yet.'
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-400 font-bold tabular-nums">{idx + 1}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] ${
                          r.supportType === 'permanent'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {r.supportType === 'permanent'
                          ? t('ቋሚ ተረጂ', 'Permanent')
                          : t('ጊዜያዊ ተረጂ', 'Temporary')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div>{r.name}</div>
                      {r.address && (
                        <div className="text-[11px] text-slate-500 font-normal">{r.address}</div>
                      )}
                      {r.supportType === 'temporary' && r.endDate && (
                        <div className="text-[10px] text-amber-700 font-bold">
                          {t(`ግምገማ/ማብቂያ: ${r.endDate}`, `Review/End: ${r.endDate}`)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 font-semibold">
                      {r.gender} {r.age ? `· ${r.age}` : ''}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{r.aidCategory}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold tabular-nums text-slate-900">
                      {r.monthlyAidAmount !== undefined
                        ? r.monthlyAidAmount.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{r.chapel || '—'}</div>
                      {r.phone && <div className="font-mono text-[11px]">{r.phone}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 text-[11px] font-bold">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-slate-500 hover:text-blue-700 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId
                  ? t('የተረጂ መረጃ አስተካክል', 'Edit Beneficiary')
                  : t('አዲስ ቋሚ / ጊዜያዊ ተረጂ መዝግብ', 'Add Permanent / Temporary Beneficiary')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBSupportType('permanent')}
                  className={`py-2 px-3 rounded-lg font-extrabold transition cursor-pointer ${
                    bSupportType === 'permanent'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {t('ቋሚ ተረጂ', 'Permanent Beneficiary')}
                </button>
                <button
                  type="button"
                  onClick={() => setBSupportType('temporary')}
                  className={`py-2 px-3 rounded-lg font-extrabold transition cursor-pointer ${
                    bSupportType === 'temporary'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {t('ጊዜያዊ ተረጂ', 'Temporary Beneficiary')}
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                <input
                  type="text"
                  required
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={bGender}
                    onChange={(e) => setBGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ሴ">{t('ሴት', 'Female')}</option>
                    <option value="ወ">{t('ወንድ', 'Male')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ዕድሜ', 'Age')}</label>
                  <input
                    type="text"
                    value={bAge}
                    onChange={(e) => setBAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የቤተሰብ ብዛት', 'Family Size')}</label>
                  <input
                    type="number"
                    min={1}
                    value={bFamilySize}
                    onChange={(e) => setBFamilySize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የድጋፍ ዘርፍ', 'Aid Category')}</label>
                  <select
                    value={bAidCat}
                    onChange={(e) => setBAidCat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    {AID_CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ወርሃዊ / የድጋፍ መጠን (ብር)', 'Support Amount (ETB)')}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={bAmount}
                    onChange={(e) => setBAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ቻፕል', 'Chapel')}</label>
                  <select
                    value={bChapel}
                    onChange={(e) => setBChapel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="">{t('— ምረጥ —', '— Select —')}</option>
                    {chapelList.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={bPhone}
                    onChange={(e) => setBPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ድጋፍ የተጀመረበት ቀን', 'Start Date')}</label>
                  <input
                    type="date"
                    value={bStartDate}
                    onChange={(e) => setBStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                {bSupportType === 'temporary' ? (
                  <div>
                    <label className="block font-bold text-amber-800 mb-1">{t('የጊዜያዊ ድጋፍ ማብቂያ/ግምገማ ቀን', 'Temporary End/Review Date')}</label>
                    <input
                      type="date"
                      value={bEndDate}
                      onChange={(e) => setBEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-300 rounded-xl font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                    <select
                      value={bStatus}
                      onChange={(e) => setBStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    >
                      <option value="በድጋፍ ላይ">በድጋፍ ላይ</option>
                      <option value="በመታየት ላይ">በመታየት ላይ</option>
                      <option value="ተጠናቋል">ተጠናቋል</option>
                    </select>
                  </div>
                )}
              </div>

              {bSupportType === 'temporary' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                  <select
                    value={bStatus}
                    onChange={(e) => setBStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="በድጋፍ ላይ">በድጋፍ ላይ</option>
                    <option value="በመታየት ላይ">በመታየት ላይ</option>
                    <option value="ተጠናቋል">ተጠናቋል</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('አድራሻ / ሰፈር', 'Address')}</label>
                <input
                  type="text"
                  value={bAddress}
                  onChange={(e) => setBAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                <input
                  type="text"
                  value={bNotes}
                  onChange={(e) => setBNotes(e.target.value)}
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
                  className="px-5 py-2 font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl cursor-pointer"
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

/* ============================================================================
 * 2. EVANGELISM: MISSIONARIES BY SCOPE
 *    (አለም አቀፋዊ ሚሽነሪ | አገር አቀፋዊ ሚሽነሪ | ክልላዊ ሚሽነሪ | አከባቢያዊ ሚሽነሪ)
 * ============================================================================ */

interface EvangelismMissionariesPanelProps {
  currentYear: string;
  records: EvangelismMissionaryRecord[];
  onSaveRecords: (updated: EvangelismMissionaryRecord[]) => void;
}

const MISSIONARY_SCOPES: {
  id: MissionaryScope;
  am: string;
  en: string;
  badgeClass: string;
  cardClass: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'international',
    am: 'አለም አቀፋዊ ሚሽነሪ',
    en: 'International Missionary',
    badgeClass: 'bg-indigo-100 text-indigo-900',
    cardClass: 'bg-indigo-50/70 border-indigo-200 text-indigo-950',
    icon: Globe
  },
  {
    id: 'national',
    am: 'አገር አቀፋዊ ሚሽነሪ',
    en: 'National Missionary',
    badgeClass: 'bg-emerald-100 text-emerald-900',
    cardClass: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
    icon: Flag
  },
  {
    id: 'regional',
    am: 'ክልላዊ ሚሽነሪ',
    en: 'Regional Missionary',
    badgeClass: 'bg-sky-100 text-sky-900',
    cardClass: 'bg-sky-50/70 border-sky-200 text-sky-950',
    icon: MapPin
  },
  {
    id: 'local',
    am: 'አከባቢያዊ ሚሽነሪ',
    en: 'Local Missionary',
    badgeClass: 'bg-amber-100 text-amber-900',
    cardClass: 'bg-amber-50/70 border-amber-200 text-amber-950',
    icon: Navigation
  }
];

export const EvangelismMissionariesPanel: React.FC<EvangelismMissionariesPanelProps> = ({
  currentYear,
  records,
  onSaveRecords
}) => {
  const { t } = useLanguage();
  const [scopeFilter, setScopeFilter] = useState<'all' | MissionaryScope>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mScope, setMScope] = useState<MissionaryScope>('international');
  const [mName, setMName] = useState('');
  const [mGender, setMGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [mPhone, setMPhone] = useState('');
  const [mField, setMField] = useState('');
  const [mOrg, setMOrg] = useState('');
  const [mDate, setMDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mSupport, setMSupport] = useState('');
  const [mStatus, setMStatus] = useState('በአገልግሎት ላይ');
  const [mNotes, setMNotes] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4500);
  };

  const getScopeMeta = (sc: MissionaryScope) =>
    MISSIONARY_SCOPES.find((s) => s.id === sc) || MISSIONARY_SCOPES[0];

  const scopeCounts = useMemo(() => {
    const counts: Record<MissionaryScope, number> = {
      international: 0,
      national: 0,
      regional: 0,
      local: 0
    };
    let totalSupport = 0;
    records.forEach((r) => {
      if (counts[r.scope] !== undefined) counts[r.scope] += 1;
      totalSupport += Number(r.monthlySupportAmount) || 0;
    });
    return { ...counts, total: records.length, totalSupport };
  }, [records]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (scopeFilter !== 'all' && r.scope !== scopeFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.missionField.toLowerCase().includes(q) ||
        (r.sendingOrganization || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q)
      );
    });
  }, [records, scopeFilter, searchQuery]);

  const openAdd = (defaultScope: MissionaryScope = 'international') => {
    setEditingId(null);
    setMScope(scopeFilter === 'all' ? defaultScope : scopeFilter);
    setMName('');
    setMGender('ወ');
    setMPhone('');
    setMField('');
    setMOrg('');
    setMDate(new Date().toISOString().split('T')[0]);
    setMSupport('');
    setMStatus('በአገልግሎት ላይ');
    setMNotes('');
    setIsModalOpen(true);
  };

  const openEdit = (rec: EvangelismMissionaryRecord) => {
    setEditingId(rec.id);
    setMScope(rec.scope);
    setMName(rec.name);
    setMGender(rec.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setMPhone(rec.phone || '');
    setMField(rec.missionField || '');
    setMOrg(rec.sendingOrganization || '');
    setMDate(rec.deployedDate || '');
    setMSupport(rec.monthlySupportAmount !== undefined ? String(rec.monthlySupportAmount) : '');
    setMStatus(rec.status || 'በአገልግሎት ላይ');
    setMNotes(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName.trim() || !mField.trim()) return;
    const item: EvangelismMissionaryRecord = {
      id: editingId ?? generateUniqueId(),
      scope: mScope,
      name: mName.trim(),
      gender: mGender,
      phone: mPhone.trim() || undefined,
      missionField: mField.trim(),
      sendingOrganization: mOrg.trim() || undefined,
      deployedDate: mDate || undefined,
      monthlySupportAmount: mSupport.trim() ? parseFloat(mSupport) || 0 : undefined,
      status: mStatus,
      notes: mNotes.trim() || undefined
    };

    const next = editingId
      ? records.map((r) => (r.id === editingId ? item : r))
      : [item, ...records];
    onSaveRecords(next);
    setIsModalOpen(false);
    const meta = getScopeMeta(item.scope);
    showNotice(t(`✓ "${item.name}" (${meta.am}) ተቀምጧል!`, `Saved "${item.name}" (${meta.en})!`));
  };

  const handleDelete = (id: number) => {
    onSaveRecords(records.filter((r) => r.id !== id));
    showNotice(t('✓ የሚሽነሪ መዝገብ ተሰርዟል።', 'Missionary record removed.'));
  };

  const handleExportXlsx = () => {
    const rows = [
      [`የወንጌል አገልግሎት — የሚሽነሪዎች መዝገብ (${currentYear} ዓ/ም)`],
      [
        `አለም አቀፋዊ: ${scopeCounts.international} | አገር አቀፋዊ: ${scopeCounts.national} | ክልላዊ: ${scopeCounts.regional} | አከባቢያዊ: ${scopeCounts.local}`
      ],
      [],
      [
        'ተ.ቁ',
        'የሚሽነሪ ምድብ',
        'ሙሉ ስም',
        'ጾታ',
        'የአገልግሎት ቦታ / ሀገር / ክልል',
        'ላኪ አካል / ድርጅት',
        'ወርሃዊ ድጋፍ (ብር)',
        'ስልክ',
        'የተሰማሩበት ቀን',
        'ሁኔታ',
        'ማስታወሻ'
      ],
      ...filtered.map((r, idx) => [
        idx + 1,
        getScopeMeta(r.scope).am,
        r.name,
        r.gender,
        r.missionField,
        r.sendingOrganization || '-',
        r.monthlySupportAmount ?? 0,
        r.phone || '-',
        r.deployedDate || '-',
        r.status,
        r.notes || '-'
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ሚሽነሪዎች');
    XLSX.writeFile(wb, `የወንጌል_አገልግሎት_ሚሽነሪዎች_${currentYear}.xlsx`);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readCSVFile(file);
      if (rows.length <= 1) {
        showNotice(t('የተመረጠው ፋይል ባዶ ነው።', 'Selected file is empty.'));
        e.target.value = '';
        return;
      }
      const startIdx =
        rows[0].some((c) => c.includes('ስም') || c.toLowerCase().includes('name')) ? 1 : 0;
      const additions: EvangelismMissionaryRecord[] = [];
      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 2) continue;
        const scopeRaw = (cols[1] || '').trim().toLowerCase();
        let sc: MissionaryScope = 'local';
        if (scopeRaw.includes('አለም') || scopeRaw.includes('ዓለም') || scopeRaw.includes('inter')) {
          sc = 'international';
        } else if (scopeRaw.includes('አገር') || scopeRaw.includes('ሀገር') || scopeRaw.includes('nation')) {
          sc = 'national';
        } else if (scopeRaw.includes('ክልል') || scopeRaw.includes('region')) {
          sc = 'regional';
        }
        const nameVal = (cols[2] || cols[1] || cols[0] || '').trim();
        if (!nameVal || nameVal === 'ሙሉ ስም') continue;
        const genderRaw = (cols[3] || '').trim();
        const genderVal: 'ወ' | 'ሴ' =
          genderRaw === 'ሴ' || genderRaw.includes('ሴት') || genderRaw.toLowerCase().startsWith('f')
            ? 'ሴ'
            : 'ወ';

        additions.push({
          id: generateUniqueId(),
          scope: sc,
          name: nameVal,
          gender: genderVal,
          missionField: cols[4]?.trim() || '—',
          sendingOrganization: cols[5]?.trim() || undefined,
          monthlySupportAmount: cols[6] ? parseFloat(cols[6]) || undefined : undefined,
          phone: cols[7]?.trim() || undefined,
          status: 'በአገልግሎት ላይ'
        });
      }
      if (additions.length > 0) {
        onSaveRecords([...additions, ...records]);
        showNotice(
          t(
            `✓ ${additions.length} ሚሽነሪዎች ከExcel/CSV ተጭነዋል!`,
            `Imported ${additions.length} missionaries!`
          )
        );
      }
    } catch {
      showNotice(t('ፋይሉን ማንበብ አልተሳካም።', 'Failed to import file.'));
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Print Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-semibold">
          የወንጌል አገልግሎት — የሚሽነሪዎች መዝገብ ({currentYear} ዓ/ም)
        </h2>
        <p className="text-xs mt-1">
          አለም አቀፋዊ፦ {scopeCounts.international} · አገር አቀፋዊ፦ {scopeCounts.national} · ክልላዊ፦{' '}
          {scopeCounts.regional} · አከባቢያዊ፦ {scopeCounts.local}
        </p>
      </div>

      {/* 4 Missionary Tiers KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
        <button
          type="button"
          onClick={() => setScopeFilter('all')}
          className={`text-left rounded-2xl p-4 border transition cursor-pointer ${
            scopeFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="text-xs font-bold opacity-80">{t('ሁሉም ሚሽነሪዎች', 'All Missionaries')}</div>
          <div className="text-2xl font-extrabold mt-1 tabular-nums">{scopeCounts.total}</div>
          <div className="text-[11px] opacity-75 mt-0.5 tabular-nums">
            {t(`ድጋፍ: ${scopeCounts.totalSupport.toLocaleString()} ብር`, `Support: ${scopeCounts.totalSupport.toLocaleString()} ETB`)}
          </div>
        </button>

        {MISSIONARY_SCOPES.map((sc) => {
          const Icon = sc.icon;
          const active = scopeFilter === sc.id;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => setScopeFilter(sc.id)}
              className={`text-left rounded-2xl p-4 border transition cursor-pointer ${
                active ? 'bg-blue-900 text-white border-blue-900' : sc.cardClass
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-xs font-bold">
                <span className="truncate">{t(sc.am, sc.en)}</span>
                <Icon className="w-4 h-4 shrink-0 opacity-80" />
              </div>
              <div className="text-2xl font-extrabold mt-1 tabular-nums">
                {scopeCounts[sc.id]}
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">
                {t('ለማየት ይጫኑ', 'Click to filter')}
              </div>
            </button>
          );
        })}
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Search & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ሚሽነሪ ስም፣ ሀገር/ክልል ወይም ድርጅት ፈልግ...', 'Search missionary or field...')}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as 'all' | MissionaryScope)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
          >
            <option value="all">{t('ሁሉም ሚሽነሪ ምድቦች', 'All Missionary Scopes')}</option>
            {MISSIONARY_SCOPES.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {t(sc.am, sc.en)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{t('Excel ጫን', 'Import')}</span>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportCSV} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleExportXlsx}
            className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('Excel አውርድ', 'Export')}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('አትም', 'Print')}</span>
          </button>
          <button
            type="button"
            onClick={() => openAdd('international')}
            className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('አዲስ ሚሽነሪ መዝግብ', 'Add Missionary')}</span>
          </button>
        </div>
      </div>

      {/* Missionaries Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-3 text-left w-10">#</th>
                <th className="py-3 px-3 text-left">{t('የሚሽነሪ ምድብ', 'Missionary Scope')}</th>
                <th className="py-3 px-3 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                <th className="py-3 px-3 text-center">{t('ጾታ', 'Gender')}</th>
                <th className="py-3 px-3 text-left">{t('የአገልግሎት ቦታ / ሀገር / ክልል', 'Mission Field')}</th>
                <th className="py-3 px-3 text-left">{t('ላኪ አካል / ድርጅት', 'Sending Body')}</th>
                <th className="py-3 px-3 text-right">{t('ወርሃዊ ድጋፍ (ብር)', 'Monthly Support')}</th>
                <th className="py-3 px-3 text-center">{t('ሁኔታ', 'Status')}</th>
                <th className="py-3 px-3 text-right print:hidden">{t('እርምጃ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    {t(
                      'እስካሁን የተመዘገበ ሚሽነሪ የለም። አለም አቀፋዊ፣ አገር አቀፋዊ፣ ክልላዊ ወይም አከባቢያዊ ሚሽነሪ ይመዝግቡ።',
                      'No missionaries recorded yet. Add International, National, Regional, or Local missionaries.'
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => {
                  const meta = getScopeMeta(r.scope);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-slate-400 font-bold tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] ${meta.badgeClass}`}>
                          {t(meta.am, meta.en)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div>{r.name}</div>
                        {r.phone && <div className="text-[11px] font-mono text-slate-500">{r.phone}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{r.gender}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        <div>{r.missionField}</div>
                        {r.deployedDate && (
                          <div className="text-[10px] font-mono text-slate-400">{r.deployedDate}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{r.sendingOrganization || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold tabular-nums text-slate-900">
                        {r.monthlySupportAmount !== undefined
                          ? r.monthlySupportAmount.toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Missionary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? t('የሚሽነሪ መረጃ አስተካክል', 'Edit Missionary') : t('አዲስ ሚሽነሪ መዝግብ', 'Add Missionary')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">{t('የሚሽነሪ ደረጃ / ምድብ *', 'Missionary Scope *')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {MISSIONARY_SCOPES.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setMScope(sc.id)}
                      className={`py-2 px-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                        mScope === sc.id
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {t(sc.am, sc.en)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={mGender}
                    onChange={(e) => setMGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ', 'Male')}</option>
                    <option value="ሴ">{t('ሴት', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የአገልግሎት ቦታ (ሀገር / ክልል / ወረዳ / አከባቢ) *', 'Mission Field (Country / Region / Area) *')}
                </label>
                <input
                  type="text"
                  required
                  value={mField}
                  onChange={(e) => setMField(e.target.value)}
                  placeholder={t('ምሳሌ፦ ኬንያ፣ ደቡብ ኢትዮጵያ፣ ጋሞ ዞን...', 'e.g. Kenya, South Ethiopia, Gamo Zone...')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ላኪ አካል / አጥቢያ / ድርጅት', 'Sending Church/Org')}</label>
                  <input
                    type="text"
                    value={mOrg}
                    onChange={(e) => setMOrg(e.target.value)}
                    placeholder={t('ብርብር ቃለ ሕይወት / ሚሽን ቦርድ', 'Birbir KHC / Mission Board')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ወርሃዊ ድጋፍ (ብር)', 'Monthly Support (ETB)')}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={mSupport}
                    onChange={(e) => setMSupport(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የተሰማሩበት ቀን', 'Deployed Date')}</label>
                  <input
                    type="date"
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                  <select
                    value={mStatus}
                    onChange={(e) => setMStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="በአገልግሎት ላይ">በአገልግሎት ላይ</option>
                    <option value="በዝግጅት ላይ">በዝግጅት ላይ</option>
                    <option value="በእረፍት">በእረፍት</option>
                    <option value="ተመልሷል">ተመልሷል</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                <input
                  type="text"
                  value={mNotes}
                  onChange={(e) => setMNotes(e.target.value)}
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
                  className="px-5 py-2 font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl cursor-pointer"
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
