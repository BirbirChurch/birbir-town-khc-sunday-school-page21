import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Plus,
  Search,
  Download,
  Printer,
  Edit2,
  Trash2,
  X,
  Phone,
  Users,
  UserPlus
} from 'lucide-react';
import { ChurchMember, UnitLeaderRecord } from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';
import { formatDualDateText, formatDualDateTimeText, getAdjustedNow } from '../utils/ethiopianDate';
import { DualDateBadge, DualDateInput } from './DualDate';

interface UnitLeadersRosterTabProps {
  unitTitle: string;
  currentYear: string;
  leaders: UnitLeaderRecord[];
  roleSuggestions?: string[];
  churchMembers?: ChurchMember[];
  structureNote?: string;
  onSaveLeaders: (nextLeaders: UnitLeaderRecord[]) => void;
}

const DEFAULT_LEADER_ROLES = [
  'ዋና ሰብሳቢ / አስተባባሪ',
  'ምክትል ሰብሳቢ',
  'ጸሐፊ',
  'ገንዘብ ያዥ',
  'ሂሳብ ሹም / ቁጥጥር',
  'የአመራር ኮሚቴ አባል'
];

export const UnitLeadersRosterTab: React.FC<UnitLeadersRosterTabProps> = ({
  unitTitle,
  currentYear,
  leaders,
  roleSuggestions = [],
  churchMembers = [],
  structureNote,
  onSaveLeaders
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ንቁ' | 'በእረፍት'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [genderInput, setGenderInput] = useState<'ወ' | 'ሴ'>('ወ');
  const [roleInput, setRoleInput] = useState(roleSuggestions[0] || DEFAULT_LEADER_ROLES[0]);
  const [phoneInput, setPhoneInput] = useState('');
  const [startDateInput, setStartDateInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusInput, setStatusInput] = useState('ንቁ');
  const [notesInput, setNotesInput] = useState('');

  // Quick pick from church members modal
  const [isPickOpen, setIsPickOpen] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [pickRole, setPickRole] = useState(roleSuggestions[0] || DEFAULT_LEADER_ROLES[0]);

  const combinedRoleOptions = useMemo(() => {
    const merged = [...DEFAULT_LEADER_ROLES, ...roleSuggestions];
    return Array.from(new Set(merged.map((r) => r.trim()).filter(Boolean)));
  }, [roleSuggestions]);

  const counts = useMemo(() => {
    const male = leaders.filter((l) => l.gender === 'ወ').length;
    const female = leaders.filter((l) => l.gender === 'ሴ').length;
    const active = leaders.filter((l) => l.status === 'ንቁ').length;
    return { total: leaders.length, male, female, active };
  }, [leaders]);

  const filteredLeaders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leaders.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        (l.roleTitle || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    });
  }, [leaders, searchQuery, statusFilter]);

  const pickCandidates = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    const existingNames = new Set(leaders.map((l) => l.name.trim().toLowerCase()));
    return churchMembers
      .filter((m) => m.name && !existingNames.has(m.name.trim().toLowerCase()))
      .filter((m) => {
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          (m.phone || '').toLowerCase().includes(q) ||
          (m.chapel || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [churchMembers, leaders, pickSearch]);

  const openAddModal = () => {
    setEditingId(null);
    setNameInput('');
    setGenderInput('ወ');
    setRoleInput(combinedRoleOptions[0] || 'ዋና ሰብሳቢ / አስተባባሪ');
    setPhoneInput('');
    setStartDateInput(new Date().toISOString().split('T')[0]);
    setStatusInput('ንቁ');
    setNotesInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (rec: UnitLeaderRecord) => {
    setEditingId(rec.id);
    setNameInput(rec.name);
    setGenderInput(rec.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setRoleInput(rec.roleTitle || combinedRoleOptions[0]);
    setPhoneInput(rec.phone || '');
    setStartDateInput(rec.termOrStartDate || '');
    setStatusInput(rec.status || 'ንቁ');
    setNotesInput(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const record: UnitLeaderRecord = {
      id: editingId ?? generateUniqueId(),
      name: nameInput.trim(),
      gender: genderInput,
      roleTitle: roleInput.trim() || 'መሪ',
      phone: phoneInput.trim() || undefined,
      termOrStartDate: startDateInput.trim() || undefined,
      status: statusInput,
      notes: notesInput.trim() || undefined
    };

    if (editingId) {
      onSaveLeaders(leaders.map((l) => (l.id === editingId ? record : l)));
    } else {
      onSaveLeaders([...leaders, record]);
    }
    setIsModalOpen(false);
  };

  const handleQuickAddMemberAsLeader = (member: ChurchMember) => {
    const record: UnitLeaderRecord = {
      id: generateUniqueId(),
      name: member.name.trim(),
      gender: member.gender === 'ሴ' ? 'ሴ' : 'ወ',
      roleTitle: pickRole.trim() || 'የአመራር ኮሚቴ አባል',
      phone: member.phone?.trim() || undefined,
      termOrStartDate: new Date().toISOString().split('T')[0],
      status: 'ንቁ',
      notes: member.chapel ? `ቻፕል፦ ${member.chapel}` : undefined
    };
    onSaveLeaders([...leaders, record]);
  };

  const handleExportExcel = () => {
    const rows = [
      [`${unitTitle} — የመሪዎች ስም ዝርዝር (${currentYear} ዓ/ም)`],
      [`ጠቅላላ: ${counts.total} | ወንድ: ${counts.male} | ሴት: ${counts.female}`],
      [],
      ['ተ.ቁ', 'የመሪው ሙሉ ስም', 'ጾታ', 'የአመራር ድርሻ / ኃላፊነት', 'ስልክ ቁጥር', 'የተመረጠበት ቀን', 'ሁኔታ', 'ማስታወሻ'],
      ...leaders.map((l, idx) => [
        idx + 1,
        l.name,
        l.gender,
        l.roleTitle,
        l.phone || '—',
        formatDualDateText(l.termOrStartDate, '—'),
        l.status,
        l.notes || '—'
      ])
    ];
    const wsSheet = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSheet, 'የመሪዎች_ስም_ዝርዝር');
    XLSX.writeFile(wb, `${unitTitle}_የመሪዎች_ስም_ዝርዝር_${currentYear}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="hidden print:block text-center pb-3 mb-3 border-b border-slate-300">
        <h1 className="text-lg font-extrabold">የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን</h1>
        <h2 className="text-sm font-bold">
          {unitTitle} — የመሪዎች ስም ዝርዝር ({currentYear} ዓ/ም)
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
          የታተመበት ቀንና ሰዓት፦ {formatDualDateTimeText(getAdjustedNow())}
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">{t('ጠቅላላ መሪዎች', 'Total Leaders')}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{counts.total}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">{t('ወንድ መሪዎች', 'Male Leaders')}</div>
          <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-1">{counts.male}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">{t('ሴት መሪዎች', 'Female Leaders')}</div>
          <div className="text-2xl font-extrabold text-rose-800 tabular-nums mt-1">{counts.female}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">{t('በአገልግሎት ላይ (ንቁ)', 'Active Leaders')}</div>
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums mt-1">{counts.active}</div>
        </div>
      </div>

      {structureNote && (
        <div className="bg-cyan-50 border border-cyan-200 text-cyan-950 rounded-2xl px-4 py-3 text-xs font-semibold leading-relaxed">
          {structureNote}
        </div>
      )}

      {/* Main Card */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-900" />
                <span>{t(`${unitTitle} — የመሪዎች ስም ዝርዝር`, `${unitTitle} — Leaders Roster`)}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'የዚህን ዘርፍ አመራሮች (ሰብሳቢ፣ ምክትል፣ ጸሐፊ፣ ገንዘብ ያዥ እና የኮሚቴ አባላት) ስም፣ የስራ ድርሻ እና ስልክ ይመዝግቡ።',
                  'Record and manage leaders (chairperson, vice, secretary, treasurer, committee) for this ministry.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {churchMembers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsPickOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('ከዋናው መዝገብ ምረጥ', 'Pick from Registry')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={leaders.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('ኤክሴል አውርድ', 'Export Excel')}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('አትም', 'Print')}</span>
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('አዲስ መሪ ጨምር', 'Add Leader')}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 print:hidden">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('በስም፣ በኃላፊነት ወይም በስልክ ፈልግ...', 'Search by name, role, or phone...')}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'ንቁ', 'በእረፍት'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {st === 'all' ? t('ሁሉም', 'All') : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4 text-left">{t('ተ.ቁ', '#')}</th>
                <th className="py-3 px-4 text-left">{t('የመሪው ሙሉ ስም', 'Leader Full Name')}</th>
                <th className="py-3 px-3 text-center">{t('ጾታ', 'Gender')}</th>
                <th className="py-3 px-4 text-left">{t('የአመራር ድርሻ / ኃላፊነት', 'Role / Responsibility')}</th>
                <th className="py-3 px-4 text-left">{t('ስልክ ቁጥር', 'Phone')}</th>
                <th className="py-3 px-3 text-left">{t('የተመረጠበት ቀን', 'Start Date')}</th>
                <th className="py-3 px-3 text-center">{t('ሁኔታ', 'Status')}</th>
                <th className="py-3 px-4 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold">
                        {t(
                          `በ${unitTitle} ውስጥ ገና የመሪዎች ስም ዝርዝር አልተጻፈም።`,
                          `No leaders added yet for ${unitTitle}.`
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer print:hidden"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('የመጀመሪያውን መሪ ጨምር', 'Add First Leader')}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeaders.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-500 tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{l.name}</div>
                      {l.notes && <div className="text-[11px] text-slate-500 mt-0.5">{l.notes}</div>}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{l.gender}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold text-[11px]">
                        {l.roleTitle}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {l.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{l.phone}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      <DualDateBadge value={l.termOrStartDate} mode="stacked" />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                          l.status === 'ንቁ'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap print:hidden">
                      {confirmDeleteId === l.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onSaveLeaders(leaders.filter((x) => x.id !== l.id));
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            {t('አጥፋ', 'Delete')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                          >
                            {t('ተው', 'Cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(l)}
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title={t('አስተካክል', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(l.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title={t('ሰርዝ', 'Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Leader Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? t('የመሪ መረጃ አስተካክል', 'Edit Leader') : t('አዲስ መሪ መዝግብ', 'Add Leader')}
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
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የመሪው ሙሉ ስም *', 'Leader Full Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={t('ሙሉ ስም ይጻፉ...', 'Enter full name...')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={genderInput}
                    onChange={(e) => setGenderInput(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ (ወ)', 'Male (ወ)')}</option>
                    <option value="ሴ">{t('ሴት (ሴ)', 'Female (ሴ)')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ንቁ">{t('ንቁ (በአገልግሎት ላይ)', 'Active')}</option>
                    <option value="በእረፍት">{t('በእረፍት', 'On Leave')}</option>
                    <option value="ያጠናቀቀ">{t('የአገልግሎት ጊዜ ያጠናቀቀ', 'Completed Term')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የአመራር ድርሻ / ኃላፊነት *', 'Leadership Role / Position *')}
                </label>
                <input
                  type="text"
                  required
                  list="unitLeaderRoleSuggestions"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
                <datalist id="unitLeaderRoleSuggestions">
                  {combinedRoleOptions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('የተመረጠበት ቀን', 'Start Date')}</label>
                  <DualDateInput value={startDateInput} onChange={setStartDateInput} />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
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

      {/* Quick Pick from Church Registry Modal */}
      {isPickOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {t('ከቤተክርስቲያን ዋና መዝገብ መሪ ምረጥ', 'Select Leader from Church Registry')}
              </h3>
              <button
                type="button"
                onClick={() => setIsPickOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የሚመደብበት የአመራር ድርሻ፦', 'Assigned Leadership Role:')}
                </label>
                <input
                  type="text"
                  list="unitLeaderRoleSuggestions"
                  value={pickRole}
                  onChange={(e) => setPickRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickSearch}
                  onChange={(e) => setPickSearch(e.target.value)}
                  placeholder={t('ስም፣ ስልክ ወይም ቻፕል ፈልግ...', 'Search member name, phone, or chapel...')}
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-3 overflow-y-auto flex-1 divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {pickCandidates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {t('ምንም አባል አልተገኘም።', 'No matching members found.')}
                </div>
              ) : (
                pickCandidates.map((m) => (
                  <div
                    key={m.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{m.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {m.gender || 'ወ'} · {m.chapel || '—'} · {m.phone || '—'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickAddMemberAsLeader(m)}
                      className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      {t('+ መሪ አድርግ', '+ Add Leader')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
