import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Plus,
  Search,
  Download,
  Printer,
  Edit2,
  Trash2,
  X,
  Phone,
  Shield,
  HeartHandshake,
  Baby,
  Megaphone,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { ChapelLeaderCategoryId, ChapelLeaderRecord, ChurchMember } from '../types';
import { CHAPEL_LEADER_CATEGORIES, DEFAULT_LEADERSHIP_ROLE_OPTIONS } from '../constants/churchStructure';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { generateUniqueId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';
import { formatDualDateText, formatDualDateTimeText, getAdjustedNow } from '../utils/ethiopianDate';
import { DualDateBadge, DualDateInput } from './DualDate';
import { ExportPhotoButton } from './ExportPhotoButton';
import { PersonPhotoField, PersonPhotoValue } from './PersonPhotoField';
import { PersonAvatarBadge } from './PersonAvatarBadge';

interface ChapelLeadersTabProps {
  currentYear: string;
  chapelList?: string[];
  scopedChapel?: string | null;
  chapelLeaders: ChapelLeaderRecord[];
  churchMembers?: ChurchMember[];
  onSaveChapelLeaders: (next: ChapelLeaderRecord[]) => void;
}

const CHAPEL_LEADER_ROLE_TITLES = Array.from(
  new Set([
    ...DEFAULT_LEADERSHIP_ROLE_OPTIONS,
    'ዋና መሪ / ሰብሳቢ',
    'ምክትል መሪ',
    'የአመራር አባል'
  ])
);

export const ChapelLeadersTab: React.FC<ChapelLeadersTabProps> = ({
  currentYear,
  chapelList = DEFAULT_CHAPELS,
  scopedChapel = null,
  chapelLeaders,
  churchMembers = [],
  onSaveChapelLeaders
}) => {
  const { t, chapelLabel } = useLanguage();
  const chapelLeadersExportRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ChapelLeaderCategoryId | 'all'>('all');
  const [selectedChapelFilter, setSelectedChapelFilter] = useState<string>(scopedChapel || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fChapel, setFChapel] = useState<string>(scopedChapel || chapelList[0] || DEFAULT_CHAPELS[0]);
  const [fCategory, setFCategory] = useState<ChapelLeaderCategoryId>('fathers_leaders');
  const [fName, setFName] = useState('');
  const [fGender, setFGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [fRoleTitle, setFRoleTitle] = useState(CHAPEL_LEADER_ROLE_TITLES[0]);
  const [fPhone, setFPhone] = useState('');
  const [fDate, setFDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fStatus, setFStatus] = useState('ንቁ');
  const [fNotes, setFNotes] = useState('');
  const [fPhoto, setFPhoto] = useState<PersonPhotoValue>({});

  const memberPhotoLookup = useMemo(() => {
    const map = new Map<string, { photoDataUrl?: string; photoStorageKey?: string }>();
    churchMembers.forEach((m) => {
      const k = (m.name || '').trim().toLowerCase();
      if (k && (m.photoDataUrl || m.photoStorageKey)) {
        map.set(k, { photoDataUrl: m.photoDataUrl, photoStorageKey: m.photoStorageKey });
      }
    });
    return map;
  }, [churchMembers]);

  const activeChapelFilter = scopedChapel || selectedChapelFilter;

  const scopedLeaders = useMemo(() => {
    if (!scopedChapel) return chapelLeaders;
    return chapelLeaders.filter((l) => l.chapel === scopedChapel);
  }, [chapelLeaders, scopedChapel]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ChapelLeaderCategoryId, number>();
    CHAPEL_LEADER_CATEGORIES.forEach((c) => counts.set(c.id, 0));
    scopedLeaders
      .filter((l) => activeChapelFilter === 'all' || l.chapel === activeChapelFilter)
      .forEach((l) => {
        counts.set(l.category, (counts.get(l.category) || 0) + 1);
      });
    return counts;
  }, [scopedLeaders, activeChapelFilter]);

  const filteredLeaders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedLeaders.filter((l) => {
      if (activeChapelFilter !== 'all' && l.chapel !== activeChapelFilter) return false;
      if (selectedCategory !== 'all' && l.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.chapel.toLowerCase().includes(q) ||
        (l.roleTitle || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q)
      );
    });
  }, [scopedLeaders, activeChapelFilter, selectedCategory, searchQuery]);

  const chapelMatrixRows = useMemo(() => {
    return chapelList.map((ch) => {
      const chList = chapelLeaders.filter((l) => l.chapel === ch);
      const byCat: Record<ChapelLeaderCategoryId, number> = {
        fathers_leaders: 0,
        women_leaders: 0,
        youth_leaders: 0,
        children_leaders: 0,
        evangelism_leaders: 0,
        compassion_leaders: 0,
        deacons: 0
      };
      chList.forEach((l) => {
        if (byCat[l.category] !== undefined) byCat[l.category] += 1;
      });
      return { chapel: ch, total: chList.length, byCat };
    });
  }, [chapelList, chapelLeaders]);

  const getCategoryMeta = (catId: ChapelLeaderCategoryId) =>
    CHAPEL_LEADER_CATEGORIES.find((c) => c.id === catId) || CHAPEL_LEADER_CATEGORIES[0];

  const getCategoryIcon = (catId: ChapelLeaderCategoryId) => {
    switch (catId) {
      case 'fathers_leaders':
        return <Users className="w-3.5 h-3.5 text-slate-700" />;
      case 'women_leaders':
        return <HeartHandshake className="w-3.5 h-3.5 text-rose-700" />;
      case 'youth_leaders':
        return <Sparkles className="w-3.5 h-3.5 text-purple-700" />;
      case 'children_leaders':
        return <Baby className="w-3.5 h-3.5 text-cyan-700" />;
      case 'evangelism_leaders':
        return <Megaphone className="w-3.5 h-3.5 text-amber-700" />;
      case 'compassion_leaders':
        return <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />;
      case 'deacons':
        return <Shield className="w-3.5 h-3.5 text-indigo-700" />;
    }
  };

  const openAddModal = (presetCat?: ChapelLeaderCategoryId, presetChapel?: string) => {
    const chosenCat =
      presetCat || (selectedCategory !== 'all' ? selectedCategory : 'fathers_leaders');
    const meta = getCategoryMeta(chosenCat);
    setEditingId(null);
    setFChapel(
      presetChapel ||
        scopedChapel ||
        (selectedChapelFilter !== 'all' ? selectedChapelFilter : chapelList[0] || DEFAULT_CHAPELS[0])
    );
    setFCategory(chosenCat);
    setFName('');
    setFGender(meta.defaultGender || 'ወ');
    setFRoleTitle(CHAPEL_LEADER_ROLE_TITLES[0]);
    setFPhone('');
    setFDate(new Date().toISOString().split('T')[0]);
    setFStatus('ንቁ');
    setFNotes('');
    setFPhoto({});
    setIsModalOpen(true);
  };

  const openEditModal = (rec: ChapelLeaderRecord) => {
    setEditingId(rec.id);
    setFChapel(rec.chapel);
    setFCategory(rec.category);
    setFName(rec.name);
    setFGender(rec.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setFRoleTitle(rec.roleTitle || CHAPEL_LEADER_ROLE_TITLES[0]);
    setFPhone(rec.phone || '');
    setFDate(rec.assignedDate || '');
    setFStatus(rec.status || 'ንቁ');
    setFNotes(rec.notes || '');
    setFPhoto({
      photoDataUrl: rec.photoDataUrl,
      photoStorageKey: rec.photoStorageKey,
      photoName: rec.photoName,
      photoUpdatedAt: rec.photoUpdatedAt
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim()) return;
    const record: ChapelLeaderRecord = {
      id: editingId ?? generateUniqueId(),
      chapel: scopedChapel || fChapel,
      category: fCategory,
      name: fName.trim(),
      gender: fGender,
      roleTitle: fRoleTitle.trim() || undefined,
      phone: fPhone.trim() || undefined,
      assignedDate: fDate.trim() || undefined,
      status: fStatus,
      notes: fNotes.trim() || undefined,
      photoDataUrl: fPhoto.photoDataUrl,
      photoStorageKey: fPhoto.photoStorageKey,
      photoName: fPhoto.photoName,
      photoUpdatedAt: fPhoto.photoUpdatedAt
    };

    if (editingId) {
      onSaveChapelLeaders(chapelLeaders.map((l) => (l.id === editingId ? record : l)));
    } else {
      onSaveChapelLeaders([...chapelLeaders, record]);
    }
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const rows = [
      [
        `${scopedChapel ? scopedChapel : 'የ10ሩም ቻፕሎች'} — የቻፕል መሪዎች ዝርዝር (${currentYear} ዓ/ም)`
      ],
      [],
      ['ተ.ቁ', 'ቻፕል', 'የመሪነት ዘርፍ', 'ሙሉ ስም', 'ጾታ', 'የስራ ድርሻ', 'ስልክ', 'ቀን', 'ሁኔታ', 'ማስታወሻ'],
      ...filteredLeaders.map((l, idx) => [
        idx + 1,
        l.chapel,
        getCategoryMeta(l.category).am,
        l.name,
        l.gender,
        l.roleTitle || '—',
        l.phone || '—',
        formatDualDateText(l.assignedDate, '—'),
        l.status,
        l.notes || '—'
      ])
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'የቻፕል_መሪዎች');
    XLSX.writeFile(
      wb,
      `${scopedChapel || 'የ10ሩም_ቻፕሎች'}_የመሪዎች_ዝርዝር_${currentYear}.xlsx`
    );
  };

  const suggestedMembers = useMemo(() => {
    if (!fName.trim() || churchMembers.length === 0) return [];
    const q = fName.trim().toLowerCase();
    return churchMembers
      .filter((m) => (!scopedChapel && !fChapel ? true : !m.chapel || m.chapel === fChapel || m.name.toLowerCase().includes(q)))
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [churchMembers, fName, fChapel, scopedChapel]);

  return (
    <div ref={chapelLeadersExportRef} className="space-y-5">
      <div className="hidden print:block text-center pb-3 mb-3 border-b border-slate-300">
        <h1 className="text-lg font-extrabold">የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን</h1>
        <h2 className="text-sm font-bold">
          {scopedChapel ? `${scopedChapel} — የመሪዎች ዝርዝር` : 'የ10ሩም ቻፕሎች የመሪዎች ዝርዝር'} ({currentYear} ዓ/ም)
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
          የታተመበት ቀንና ሰዓት፦ {formatDualDateTimeText(getAdjustedNow())}
        </p>
      </div>

      {/* 7 Category Selector Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 print:hidden">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-blue-900 text-white border-blue-900'
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="text-[11px] font-bold opacity-85">{t('ሁሉም (7ቱም)', 'All 7')}</div>
          <div className="text-xl font-extrabold tabular-nums mt-1">
            {scopedLeaders.filter((l) => activeChapelFilter === 'all' || l.chapel === activeChapelFilter).length}
          </div>
        </button>

        {CHAPEL_LEADER_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          const cnt = categoryCounts.get(cat.id) || 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                active
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold leading-snug line-clamp-2">
                  {t(cat.am, cat.en)}
                </span>
              </div>
              <div className="text-xl font-extrabold tabular-nums mt-1">{cnt}</div>
            </button>
          );
        })}
      </section>

      {/* Matrix across all 10 chapels when viewing overview */}
      {!scopedChapel && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900">
              {t(
                'የ10ሩም ቻፕሎች የ7ቱ የአመራር ክፍሎች ማጠቃለያ ሠንጠረዥ',
                '10 Chapels × 7 Leadership Categories Matrix'
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-4 text-left">{t('ቻፕል', 'Chapel')}</th>
                  {CHAPEL_LEADER_CATEGORIES.map((cat) => (
                    <th key={cat.id} className="py-2.5 px-2.5 text-right whitespace-nowrap">
                      {t(cat.am, cat.en)}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">{t('ድምር', 'Total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chapelMatrixRows.map((row) => (
                  <tr
                    key={row.chapel}
                    onClick={() => setSelectedChapelFilter(row.chapel)}
                    className={`cursor-pointer hover:bg-blue-50/50 ${
                      selectedChapelFilter === row.chapel ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                      {chapelLabel(row.chapel)}
                    </td>
                    {CHAPEL_LEADER_CATEGORIES.map((cat) => (
                      <td key={cat.id} className="py-2.5 px-2.5 text-right tabular-nums text-slate-700">
                        {row.byCat[cat.id]}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right font-extrabold text-blue-900 tabular-nums">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Leaders Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-900" />
                <span>
                  {scopedChapel
                    ? t(`${scopedChapel} — የአገልግሎት መሪዎች (7 ክፍሎች)`, `${chapelLabel(scopedChapel)} Leaders (7 Categories)`)
                    : t('የቻፕሎች አገልግሎት መሪዎች ዝርዝር', 'All Chapels Leaders Roster')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'የአባት መሪዎች፣ የሴት መሪዎች፣ የወጣት መሪዎች፣ የልጆች መሪዎች፣ የወንጌል አገልግሎት መሪዎች፣ ፍቅርና ርኅራሄ መሪዎች እና ዲያቆናት።',
                  'Fathers, Women, Youth, Children, Evangelism, Love & Compassion leaders, and Deacons.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredLeaders.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('ኤክሴል አውርድ', 'Export Excel')}</span>
              </button>
              <ExportPhotoButton
                targetRef={chapelLeadersExportRef}
                fileName={`${scopedChapel || 'የ10ሩም_ቻፕሎች'}_የመሪዎች_ዝርዝር_${currentYear}`}
              />
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
                onClick={() => openAddModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('አዲስ የቻፕል መሪ ጨምር', 'Add Chapel Leader')}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('በስም፣ በድርሻ ወይም በስልክ ፈልግ...', 'Search leader name, role, or phone...')}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {!scopedChapel && (
              <select
                value={selectedChapelFilter}
                onChange={(e) => setSelectedChapelFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800"
              >
                <option value="all">{t('ሁሉም 10 ቻፕሎች', 'All 10 Chapels')}</option>
                {chapelList.map((ch) => (
                  <option key={ch} value={ch}>
                    {chapelLabel(ch)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4 text-left">{t('ተ.ቁ', '#')}</th>
                <th className="py-3 px-4 text-left">{t('ቻፕል', 'Chapel')}</th>
                <th className="py-3 px-4 text-left">{t('የመሪነት ዘርፍ', 'Leader Category')}</th>
                <th className="py-3 px-4 text-left">{t('የመሪው ሙሉ ስም', 'Full Name')}</th>
                <th className="py-3 px-3 text-center">{t('ጾታ', 'Gender')}</th>
                <th className="py-3 px-4 text-left">{t('ድርሻ / ኃላፊነት', 'Position')}</th>
                <th className="py-3 px-4 text-left">{t('ስልክ', 'Phone')}</th>
                <th className="py-3 px-3 text-center">{t('ሁኔታ', 'Status')}</th>
                <th className="py-3 px-4 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <p className="font-semibold">
                      {t('በዚህ ምርጫ ውስጥ የቻፕል መሪ ገና አልተመዘገበም።', 'No chapel leaders recorded yet in this view.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => openAddModal()}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer print:hidden"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('መሪ ጨምር', 'Add Leader')}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredLeaders.map((l, idx) => {
                  const meta = getCategoryMeta(l.category);
                  const fallback = memberPhotoLookup.get((l.name || '').trim().toLowerCase());
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {chapelLabel(l.chapel)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {getCategoryIcon(l.category)}
                          <span>{t(meta.am, meta.en)}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <PersonAvatarBadge
                            name={l.name}
                            gender={l.gender}
                            photoDataUrl={l.photoDataUrl}
                            photoStorageKey={l.photoStorageKey}
                            fallbackPhotoDataUrl={fallback?.photoDataUrl}
                            fallbackPhotoStorageKey={fallback?.photoStorageKey}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900">{l.name}</div>
                            {l.assignedDate && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                <DualDateBadge value={l.assignedDate} mode="inline" />
                              </div>
                            )}
                            {l.notes && <div className="text-[11px] text-slate-500 mt-0.5">{l.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{l.gender}</td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">{l.roleTitle || '—'}</td>
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
                                onSaveChapelLeaders(chapelLeaders.filter((x) => x.id !== l.id));
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Chapel Leader Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? t('የቻፕል መሪ አስተካክል', 'Edit Chapel Leader') : t('አዲስ የቻፕል መሪ ጨምር', 'Add Chapel Leader')}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ቻፕል *', 'Chapel *')}</label>
                  <select
                    value={scopedChapel || fChapel}
                    disabled={Boolean(scopedChapel)}
                    onChange={(e) => setFChapel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold disabled:bg-slate-100"
                  >
                    {chapelList.map((ch) => (
                      <option key={ch} value={ch}>
                        {chapelLabel(ch)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የመሪነት ዘርፍ *', 'Category *')}
                  </label>
                  <select
                    value={fCategory}
                    onChange={(e) => {
                      const nextCat = e.target.value as ChapelLeaderCategoryId;
                      setFCategory(nextCat);
                      const m = getCategoryMeta(nextCat);
                      if (m.defaultGender) setFGender(m.defaultGender);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    {CHAPEL_LEADER_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {t(c.am, c.en)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የመሪው ሙሉ ስም *', 'Full Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder={t('ሙሉ ስም ይጻፉ...', 'Enter full name...')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  autoFocus
                />
                {suggestedMembers.length > 0 && !editingId && (
                  <div className="mt-1.5 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    {suggestedMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setFName(m.name);
                          setFGender(m.gender === 'ሴ' ? 'ሴ' : 'ወ');
                          if (m.phone) setFPhone(m.phone);
                          if (m.photoDataUrl || m.photoStorageKey) {
                            setFPhoto({
                              photoDataUrl: m.photoDataUrl,
                              photoStorageKey: m.photoStorageKey,
                              photoName: m.photoName,
                              photoUpdatedAt: m.photoUpdatedAt
                            });
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-blue-50 flex items-center justify-between gap-2 cursor-pointer border-b last:border-b-0 border-slate-200"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <PersonAvatarBadge
                            name={m.name}
                            gender={m.gender}
                            photoDataUrl={m.photoDataUrl}
                            photoStorageKey={m.photoStorageKey}
                            size="xs"
                          />
                          <span className="font-bold text-slate-900 truncate">{m.name}</span>
                        </span>
                        <span className="text-slate-500 shrink-0">{m.chapel} · {m.phone || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={fGender}
                    onChange={(e) => setFGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ (ወ)', 'Male (ወ)')}</option>
                    <option value="ሴ">{t('ሴት (ሴ)', 'Female (ሴ)')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
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
                  {t('የስራ ድርሻ / ኃላፊነት', 'Role / Title')}
                </label>
                <input
                  type="text"
                  list="chapelLeaderRoleOptions"
                  value={fRoleTitle}
                  onChange={(e) => setFRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-base sm:text-xs"
                />
                <datalist id="chapelLeaderRoleOptions">
                  {CHAPEL_LEADER_ROLE_TITLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {CHAPEL_LEADER_ROLE_TITLES.map((r) => {
                    const active = fRoleTitle.trim() === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFRoleTitle(r)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={fPhone}
                    onChange={(e) => setFPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('የተመደበበት ቀን', 'Assigned Date')}</label>
                  <DualDateInput value={fDate} onChange={setFDate} />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                <input
                  type="text"
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <PersonPhotoField
                compact
                storagePrefix="chapel_leader"
                personId={editingId ?? undefined}
                name={fName}
                value={fPhoto}
                onChange={setFPhoto}
              />

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
