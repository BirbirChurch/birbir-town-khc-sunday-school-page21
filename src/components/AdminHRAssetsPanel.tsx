import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Briefcase,
  Package,
  Boxes,
  Plus,
  Search,
  Download,
  Printer,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { AssetType, ChurchAssetRecord, ChurchHRRecord, HRCategory } from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';

interface AdminHRPanelProps {
  currentYear: string;
  records: ChurchHRRecord[];
  onSaveRecords: (updated: ChurchHRRecord[]) => void;
}

export const AdminHRPanel: React.FC<AdminHRPanelProps> = ({
  currentYear,
  records,
  onSaveRecords
}) => {
  const { t } = useLanguage();
  const [categoryFilter, setCategoryFilter] = useState<'all' | HRCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hCategory, setHCategory] = useState<HRCategory>('full_time_minister');
  const [hName, setHName] = useState('');
  const [hGender, setHGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [hRole, setHRole] = useState('');
  const [hDept, setHDept] = useState('');
  const [hPhone, setHPhone] = useState('');
  const [hHireDate, setHHireDate] = useState('');
  const [hSalary, setHSalary] = useState('');
  const [hEducation, setHEducation] = useState('');
  const [hStatus, setHStatus] = useState('በስራ ላይ');
  const [hNotes, setHNotes] = useState('');

  const stats = useMemo(() => {
    const fullTime = records.filter((r) => r.category === 'full_time_minister');
    const adminStaff = records.filter((r) => r.category === 'admin_staff');
    const male = records.filter((r) => r.gender === 'ወ' || String(r.gender).includes('ወንድ')).length;
    const female = records.filter((r) => r.gender === 'ሴ' || String(r.gender).includes('ሴት')).length;
    const totalSalary = records.reduce((s, r) => s + (Number(r.monthlySalary) || 0), 0);
    return {
      total: records.length,
      fullTimeCount: fullTime.length,
      adminStaffCount: adminStaff.length,
      male,
      female,
      totalSalary
    };
  }, [records]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.roleTitle.toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q)
      );
    });
  }, [records, categoryFilter, searchQuery]);

  const openAdd = (defaultCat: HRCategory = 'full_time_minister') => {
    setEditingId(null);
    setHCategory(categoryFilter === 'all' ? defaultCat : categoryFilter);
    setHName('');
    setHGender('ወ');
    setHRole('');
    setHDept('');
    setHPhone('');
    setHHireDate(new Date().toISOString().split('T')[0]);
    setHSalary('');
    setHEducation('');
    setHStatus('በስራ ላይ');
    setHNotes('');
    setIsModalOpen(true);
  };

  const openEdit = (rec: ChurchHRRecord) => {
    setEditingId(rec.id);
    setHCategory(rec.category);
    setHName(rec.name);
    setHGender(rec.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setHRole(rec.roleTitle);
    setHDept(rec.department || '');
    setHPhone(rec.phone || '');
    setHHireDate(rec.hireDate || '');
    setHSalary(rec.monthlySalary !== undefined ? String(rec.monthlySalary) : '');
    setHEducation(rec.educationLevel || '');
    setHStatus(rec.status || 'በስራ ላይ');
    setHNotes(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hName.trim() || !hRole.trim()) return;
    const item: ChurchHRRecord = {
      id: editingId ?? generateUniqueId(),
      category: hCategory,
      name: hName.trim(),
      gender: hGender,
      roleTitle: hRole.trim(),
      department: hDept.trim() || undefined,
      phone: hPhone.trim() || undefined,
      hireDate: hHireDate.trim() || undefined,
      monthlySalary: hSalary.trim() ? Number(hSalary) || 0 : undefined,
      educationLevel: hEducation.trim() || undefined,
      status: hStatus,
      notes: hNotes.trim() || undefined
    };

    const next = editingId
      ? records.map((r) => (r.id === editingId ? item : r))
      : [item, ...records];
    onSaveRecords(next);
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm(t('ይህን የሰው ኃይል መዝገብ መሰረዝ ይፈልጋሉ?', 'Delete this staff/minister record?'))) return;
    onSaveRecords(records.filter((r) => r.id !== id));
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const toRows = (list: ChurchHRRecord[], title: string) => [
      [title],
      [],
      ['ተ.ቁ', 'ምድብ', 'ሙሉ ስም', 'ጾታ', 'የስራ/አገልግሎት መደብ', 'ክፍል', 'ትምህርት', 'ስልክ', 'የቅጥር ቀን', 'ወርሃዊ ደመወዝ (ብር)', 'ሁኔታ'],
      ...list.map((r, i) => [
        i + 1,
        r.category === 'full_time_minister' ? 'የሙሉ ጊዜ አገልጋይ' : 'የአስተዳደር ሠራተኛ',
        r.name,
        r.gender,
        r.roleTitle,
        r.department || '-',
        r.educationLevel || '-',
        r.phone || '-',
        r.hireDate || '-',
        r.monthlySalary ?? '-',
        r.status
      ])
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(records.filter((r) => r.category === 'full_time_minister'), `የሙሉ ጊዜ አገልጋዮች (${currentYear})`)),
      'የሙሉ_ጊዜ_አገልጋዮች'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(records.filter((r) => r.category === 'admin_staff'), `የአስተዳደር ሰራተኞች (${currentYear})`)),
      'የአስተዳደር_ሰራተኞች'
    );
    XLSX.writeFile(wb, `የቤተክርስቲያን_የሰው_ኃይል_${currentYear}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-700" />
              <span>{t('የቤተክርስቲያኒቱ የሰው ኃይል መዝገብ', 'Church Human Resources Registry')}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {t(
                'የሙሉ ጊዜ አገልጋዮችን እና የአስተዳደር ሰራተኞችን ዝርዝር፣ የስራ መደብ፣ ደመወዝና ሁኔታ በተደራጀ መልኩ ያስተዳድሩ።',
                'Manage Full-Time Ministers and Administrative Staff records, roles, salaries, and status.'
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
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
            <button
              type="button"
              onClick={() => openAdd('full_time_minister')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-800 hover:bg-teal-700 text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('አዲስ አገልጋይ / ሠራተኛ ጨምር', 'Add Personnel')}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ጠቅላላ የሰው ኃይል', 'Total Workforce')}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.total}</div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {t('ወንድ', 'Male')} {stats.male} · {t('ሴት', 'Female')} {stats.female}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('የሙሉ ጊዜ አገልጋዮች', 'Full-Time Ministers')}</div>
            <div className="text-xl font-extrabold text-teal-800 tabular-nums mt-1">{stats.fullTimeCount}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('የአስተዳደር ሰራተኞች', 'Administrative Staff')}</div>
            <div className="text-xl font-extrabold text-indigo-800 tabular-nums mt-1">{stats.adminStaffCount}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ጠቅላላ ወርሃዊ ደመወዝ', 'Monthly Payroll Total')}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {stats.totalSalary.toLocaleString()} <span className="text-xs font-bold text-slate-500">{t('ብር', 'ETB')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('ሁሉም', 'All')} ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('full_time_minister')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'full_time_minister' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('የሙሉ ጊዜ አገልጋዮች', 'Full-Time Ministers')} ({stats.fullTimeCount})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('admin_staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'admin_staff' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('የአስተዳደር ሰራተኞች', 'Admin Staff')} ({stats.adminStaffCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ስም፣ የስራ መደብ ወይም ስልክ ፈልግ...', 'Search name, role, or phone...')}
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3 text-left w-10">#</th>
                <th className="py-2.5 px-4 text-left">{t('ምድብ', 'Category')}</th>
                <th className="py-2.5 px-4 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                <th className="py-2.5 px-3 text-left">{t('ጾታ', 'Sex')}</th>
                <th className="py-2.5 px-4 text-left">{t('የስራ / የአገልግሎት መደብ', 'Role / Position')}</th>
                <th className="py-2.5 px-4 text-left">{t('ክፍል', 'Department')}</th>
                <th className="py-2.5 px-4 text-left">{t('ስልክ', 'Phone')}</th>
                <th className="py-2.5 px-4 text-right">{t('ደመወዝ', 'Salary')}</th>
                <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Status')}</th>
                <th className="py-2.5 px-4 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    <p className="font-semibold">
                      {t('ገና ምንም የሰው ኃይል መዝገብ አልተመዘገበም።', 'No human resource records added yet.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => openAdd('full_time_minister')}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-800 text-white hover:bg-teal-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('የመጀመሪያውን መዝገብ ጨምር', 'Add First Record')}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 tabular-nums text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap font-bold">
                      <span
                        className={
                          r.category === 'full_time_minister' ? 'text-teal-800' : 'text-indigo-800'
                        }
                      >
                        {r.category === 'full_time_minister'
                          ? t('የሙሉ ጊዜ አገልጋይ', 'Full-Time Minister')
                          : t('የአስተዳደር ሠራተኛ', 'Admin Staff')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-extrabold text-slate-900">{r.name}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">{r.gender}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-semibold">{r.roleTitle}</td>
                    <td className="py-2.5 px-4 text-slate-600">{r.department || '—'}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{r.phone || '—'}</td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums text-slate-900">
                      {r.monthlySalary !== undefined ? `${Number(r.monthlySalary).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">{r.status}</td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap print:hidden">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          title={t('አስተካክል', 'Edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title={t('ሰርዝ', 'Delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-700" />
                <span>
                  {editingId
                    ? t('የሰው ኃይል መዝገብ አስተካክል', 'Edit Personnel Record')
                    : t('አዲስ የሰው ኃይል መዝገብ ጨምር', 'Add Personnel Record')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {(['full_time_minister', 'admin_staff'] as HRCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setHCategory(cat)}
                    className={`py-2.5 px-3 rounded-xl border font-extrabold transition cursor-pointer ${
                      hCategory === cat
                        ? 'bg-teal-800 text-white border-teal-800'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'full_time_minister'
                      ? t('የሙሉ ጊዜ አገልጋይ', 'Full-Time Minister')
                      : t('የአስተዳደር ሠራተኛ', 'Admin Staff')}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                  <input
                    type="text"
                    required
                    value={hName}
                    onChange={(e) => setHName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={hGender}
                    onChange={(e) => setHGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ', 'Male')}</option>
                    <option value="ሴ">{t('ሴት', 'Female')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የስራ / የአገልግሎት መደብ *', 'Role / Position *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={hRole}
                    onChange={(e) => setHRole(e.target.value)}
                    placeholder={
                      hCategory === 'full_time_minister'
                        ? t('ምሳሌ፦ ዋና መጋቢ / ወንጌላዊ', 'e.g., Lead Pastor / Evangelist')
                        : t('ምሳሌ፦ ሂሳብ ሹም / ጸሐፊ / ጥበቃ', 'e.g., Accountant / Secretary / Guard')
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የስራ ክፍል', 'Department')}</label>
                  <input
                    type="text"
                    value={hDept}
                    onChange={(e) => setHDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ', 'Phone')}</label>
                  <input
                    type="text"
                    value={hPhone}
                    onChange={(e) => setHPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ወርሃዊ ደመወዝ (ብር)', 'Monthly Salary')}</label>
                  <input
                    type="number"
                    min={0}
                    value={hSalary}
                    onChange={(e) => setHSalary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የቅጥር ቀን', 'Hire Date')}</label>
                  <input
                    type="date"
                    value={hHireDate}
                    onChange={(e) => setHHireDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ትምህርት ደረጃ', 'Education Level')}</label>
                  <input
                    type="text"
                    value={hEducation}
                    onChange={(e) => setHEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                  <select
                    value={hStatus}
                    onChange={(e) => setHStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="በስራ ላይ">{t('በስራ ላይ', 'Active')}</option>
                    <option value="በእረፍት">{t('በእረፍት', 'On Leave')}</option>
                    <option value="ለቋል">{t('ለቋል', 'Departed')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                <input
                  type="text"
                  value={hNotes}
                  onChange={(e) => setHNotes(e.target.value)}
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
                  className="px-5 py-2 font-bold text-white bg-teal-800 hover:bg-teal-700 rounded-xl cursor-pointer"
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

interface AdminAssetsPanelProps {
  currentYear: string;
  records: ChurchAssetRecord[];
  onSaveRecords: (updated: ChurchAssetRecord[]) => void;
}

export const AdminAssetsPanel: React.FC<AdminAssetsPanelProps> = ({
  currentYear,
  records,
  onSaveRecords
}) => {
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState<'all' | AssetType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [aType, setAType] = useState<AssetType>('fixed');
  const [aName, setAName] = useState('');
  const [aCategory, setACategory] = useState('');
  const [aCode, setACode] = useState('');
  const [aQty, setAQty] = useState('1');
  const [aUnit, setAUnit] = useState('በቁጥር');
  const [aUnitVal, setAUnitVal] = useState('0');
  const [aCondition, setACondition] = useState('ጥሩ');
  const [aLocation, setALocation] = useState('');
  const [aDate, setADate] = useState('');
  const [aNotes, setANotes] = useState('');

  const stats = useMemo(() => {
    const fixed = records.filter((r) => r.assetType === 'fixed');
    const consumable = records.filter((r) => r.assetType === 'consumable');
    const fixedVal = fixed.reduce((s, r) => s + (Number(r.totalValue) || 0), 0);
    const consumableVal = consumable.reduce((s, r) => s + (Number(r.totalValue) || 0), 0);
    return {
      totalItems: records.length,
      fixedCount: fixed.length,
      consumableCount: consumable.length,
      fixedVal,
      consumableVal,
      totalVal: fixedVal + consumableVal
    };
  }, [records]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (typeFilter !== 'all' && r.assetType !== typeFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.codeOrSerial || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q)
      );
    });
  }, [records, typeFilter, searchQuery]);

  const openAdd = (defaultType: AssetType = 'fixed') => {
    setEditingId(null);
    setAType(typeFilter === 'all' ? defaultType : typeFilter);
    setAName('');
    setACategory(defaultType === 'fixed' ? 'የቤተክርስቲያን ቁሳቁስ / መሳሪያ' : 'የጽ/ቤትና አገልግሎት አላቂ ዕቃ');
    setACode('');
    setAQty('1');
    setAUnit('በቁጥር');
    setAUnitVal('0');
    setACondition('ጥሩ');
    setALocation('ዋናው አዳራሽ / ጽ/ቤት');
    setADate(new Date().toISOString().split('T')[0]);
    setANotes('');
    setIsModalOpen(true);
  };

  const openEdit = (rec: ChurchAssetRecord) => {
    setEditingId(rec.id);
    setAType(rec.assetType);
    setAName(rec.name);
    setACategory(rec.category);
    setACode(rec.codeOrSerial || '');
    setAQty(String(rec.quantity));
    setAUnit(rec.unit);
    setAUnitVal(String(rec.unitValue));
    setACondition(rec.conditionOrStatus);
    setALocation(rec.location || '');
    setADate(rec.acquiredDate || '');
    setANotes(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aName.trim()) return;
    const qty = Math.max(0, parseFloat(aQty) || 0);
    const unitVal = Math.max(0, parseFloat(aUnitVal) || 0);
    const item: ChurchAssetRecord = {
      id: editingId ?? generateUniqueId(),
      assetType: aType,
      name: aName.trim(),
      category: aCategory.trim() || (aType === 'fixed' ? 'ቋሚ ንብረት' : 'አላቂ ንብረት'),
      codeOrSerial: aCode.trim() || undefined,
      quantity: qty,
      unit: aUnit.trim() || 'በቁጥር',
      unitValue: unitVal,
      totalValue: qty * unitVal,
      conditionOrStatus: aCondition,
      location: aLocation.trim() || undefined,
      acquiredDate: aDate.trim() || undefined,
      notes: aNotes.trim() || undefined
    };

    const next = editingId
      ? records.map((r) => (r.id === editingId ? item : r))
      : [item, ...records];
    onSaveRecords(next);
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm(t('ይህን የንብረት መዝገብ መሰረዝ ይፈልጋሉ?', 'Delete this asset record?'))) return;
    onSaveRecords(records.filter((r) => r.id !== id));
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const toRows = (list: ChurchAssetRecord[], title: string) => [
      [title],
      [],
      ['ተ.ቁ', 'ዓይነት', 'የንብረት ስም', 'ምድብ', 'መለያ/ኮድ', 'ብዛት', 'መለኪያ', 'የአንዱ ዋጋ', 'ጠቅላላ ዋጋ (ብር)', 'ሁኔታ', 'ቦታ'],
      ...list.map((r, i) => [
        i + 1,
        r.assetType === 'fixed' ? 'ቋሚ' : 'አላቂ',
        r.name,
        r.category,
        r.codeOrSerial || '-',
        r.quantity,
        r.unit,
        r.unitValue,
        r.totalValue,
        r.conditionOrStatus,
        r.location || '-'
      ])
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(records.filter((r) => r.assetType === 'fixed'), `ቋሚ ንብረቶች (${currentYear})`)),
      'ቋሚ_ንብረት'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(records.filter((r) => r.assetType === 'consumable'), `አላቂ ንብረቶች (${currentYear})`)),
      'አላቂ_ንብረት'
    );
    XLSX.writeFile(wb, `የቤተክርስቲያን_ንብረት_${currentYear}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-700" />
              <span>{t('የቤተክርስቲያኒቱ ንብረት አስተዳደር (ቋሚና አላቂ)', 'Church Property & Asset Registry (Fixed & Consumable)')}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {t(
                'የቤተክርስቲያኒቱን ቋሚ ንብረቶች እና አላቂ ዕቃዎች ብዛት፣ ዋጋ፣ መገኛ ቦታ እና ሁኔታ በዚህ ገጽ ይመዝግቡ።',
                'Track Fixed Assets and Consumable Supplies quantities, valuations, locations, and conditions.'
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
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
            <button
              type="button"
              onClick={() => openAdd('fixed')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('አዲስ ንብረት ጨምር', 'Add Asset')}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ጠቅላላ የንብረት ዝርዝር', 'Total Asset Lines')}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.totalItems}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ቋሚ ንብረት', 'Fixed Assets')}</div>
            <div className="text-xl font-extrabold text-blue-900 tabular-nums mt-1">{stats.fixedCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {stats.fixedVal.toLocaleString()} {t('ብር', 'ETB')}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('አላቂ ንብረት', 'Consumable Supplies')}</div>
            <div className="text-xl font-extrabold text-amber-800 tabular-nums mt-1">{stats.consumableCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {stats.consumableVal.toLocaleString()} {t('ብር', 'ETB')}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ጠቅላላ ግምታዊ ዋጋ', 'Total Valuation')}</div>
            <div className="text-xl font-extrabold text-emerald-800 tabular-nums mt-1">
              {stats.totalVal.toLocaleString()} <span className="text-xs font-bold text-slate-500">{t('ብር', 'ETB')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('ሁሉም', 'All')} ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('fixed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                typeFilter === 'fixed' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('ቋሚ ንብረት', 'Fixed Assets')} ({stats.fixedCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('consumable')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                typeFilter === 'consumable' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('አላቂ ንብረት', 'Consumables')} ({stats.consumableCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ንብረት፣ ኮድ ወይም ቦታ ፈልግ...', 'Search item, code, or location...')}
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3 text-left w-10">#</th>
                <th className="py-2.5 px-4 text-left">{t('ዓይነት', 'Type')}</th>
                <th className="py-2.5 px-4 text-left">{t('የንብረት ስም', 'Asset Name')}</th>
                <th className="py-2.5 px-4 text-left">{t('ምድብ', 'Category')}</th>
                <th className="py-2.5 px-3 text-left">{t('መለያ ቁጥር', 'Code / Serial')}</th>
                <th className="py-2.5 px-3 text-right">{t('ብዛት', 'Qty')}</th>
                <th className="py-2.5 px-3 text-right">{t('የአንዱ ዋጋ', 'Unit Value')}</th>
                <th className="py-2.5 px-4 text-right">{t('ጠቅላላ ዋጋ', 'Total Value')}</th>
                <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Condition')}</th>
                <th className="py-2.5 px-4 text-left">{t('ቦታ', 'Location')}</th>
                <th className="py-2.5 px-4 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    <p className="font-semibold">
                      {t('ገና ምንም ቋሚ ወይም አላቂ ንብረት አልተመዘገበም።', 'No fixed or consumable assets recorded yet.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => openAdd('fixed')}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('የመጀመሪያውን ንብረት ጨምር', 'Add First Asset')}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 tabular-nums text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap font-bold">
                      <span className={r.assetType === 'fixed' ? 'text-blue-800' : 'text-amber-800'}>
                        {r.assetType === 'fixed' ? t('ቋሚ', 'Fixed') : t('አላቂ', 'Consumable')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-extrabold text-slate-900">{r.name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{r.category}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{r.codeOrSerial || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-800">
                      {r.quantity} <span className="text-[10px] text-slate-500 font-normal">{r.unit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                      {Number(r.unitValue).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-extrabold tabular-nums text-slate-900">
                      {Number(r.totalValue).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{r.conditionOrStatus}</td>
                    <td className="py-2.5 px-4 text-slate-600">{r.location || '—'}</td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap print:hidden">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          title={t('አስተካክል', 'Edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title={t('ሰርዝ', 'Delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-700" />
                <span>
                  {editingId
                    ? t('የንብረት መዝገብ አስተካክል', 'Edit Asset Record')
                    : t('አዲስ ንብረት መዝግብ', 'Add Asset Record')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {(['fixed', 'consumable'] as AssetType[]).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setAType(tp)}
                    className={`py-2.5 px-3 rounded-xl border font-extrabold transition cursor-pointer ${
                      aType === tp
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tp === 'fixed'
                      ? t('ቋሚ ንብረት (Fixed)', 'Fixed Asset')
                      : t('አላቂ ንብረት (Consumable)', 'Consumable Asset')}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የንብረቱ ስም *', 'Asset Name *')}</label>
                  <input
                    type="text"
                    required
                    value={aName}
                    onChange={(e) => setAName(e.target.value)}
                    placeholder={
                      aType === 'fixed'
                        ? t('ምሳሌ፦ የድምጽ ሚክሰር / ወንበር / ኮምፒውተር', 'e.g., Sound Mixer / Chairs / Laptop')
                        : t('ምሳሌ፦ A4 ወረቀት / እስክሪብቶ / ቶነር', 'e.g., A4 Paper / Pens / Toner')
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ምድብ', 'Category')}</label>
                  <input
                    type="text"
                    value={aCategory}
                    onChange={(e) => setACategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ብዛት *', 'Quantity *')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={aQty}
                    onChange={(e) => setAQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መለኪያ', 'Unit')}</label>
                  <input
                    type="text"
                    value={aUnit}
                    onChange={(e) => setAUnit(e.target.value)}
                    placeholder={t('በቁጥር / ደርዘን / ካርቶን', 'pcs / box / pack')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የአንዱ ዋጋ (ብር)', 'Unit Price')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={aUnitVal}
                    onChange={(e) => setAUnitVal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መለያ ቁጥር / ኮድ', 'Tag / Serial')}</label>
                  <input
                    type="text"
                    value={aCode}
                    onChange={(e) => setACode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Condition')}</label>
                  <select
                    value={aCondition}
                    onChange={(e) => setACondition(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ጥሩ">{t('ጥሩ', 'Good')}</option>
                    <option value="ጥገና ያስፈልገዋል">{t('ጥገና ያስፈልገዋል', 'Needs Repair')}</option>
                    <option value="አልቋል/ያረጀ">{t('አልቋል/ያረጀ', 'Depleted / Retired')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የተገዛበት ቀን', 'Acquired Date')}</label>
                  <input
                    type="date"
                    value={aDate}
                    onChange={(e) => setADate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መገኛ ቦታ', 'Location')}</label>
                  <input
                    type="text"
                    value={aLocation}
                    onChange={(e) => setALocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                  <input
                    type="text"
                    value={aNotes}
                    onChange={(e) => setANotes(e.target.value)}
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
                  className="px-5 py-2 font-bold text-white bg-amber-700 hover:bg-amber-600 rounded-xl cursor-pointer"
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
