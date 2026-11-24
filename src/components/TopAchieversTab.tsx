import React, { useRef, useState } from 'react';
import { ExportPhotoButton } from './ExportPhotoButton';
import { Award, Printer, Download, Filter, Trophy, GraduationCap, Plus, Edit2, Trash2, X } from 'lucide-react';
import { ChildAcademicAwardRecord, Role, Student } from '../types';
import { downloadCSV } from '../utils/csv';
import { NameScriptMode, transliterateAmharicToEnglish } from '../utils/amharicTransliterator';
import { generateUniqueId } from '../utils/idGenerator';
import { DualDateBadge, DualDateInput } from './DualDate';

interface TopAchieversTabProps {
  currentYear: string;
  classList: string[];
  studentsByClass: { [className: string]: Student[] };
  nameScriptMode?: NameScriptMode;
  academicAwards?: ChildAcademicAwardRecord[];
  onSaveAcademicAwards?: (updated: ChildAcademicAwardRecord[]) => void;
  currentUserRole?: Role | null;
}

export const TopAchieversTab: React.FC<TopAchieversTabProps> = ({
  currentYear,
  classList,
  studentsByClass,
  nameScriptMode = 'am',
  academicAwards = [],
  onSaveAcademicAwards,
  currentUserRole
}) => {
  const [classFilter, setClassFilter] = useState('all');
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [editingAwardId, setEditingAwardId] = useState<number | null>(null);
  const [confirmDeleteAwardId, setConfirmDeleteAwardId] = useState<number | null>(null);
  const [awName, setAwName] = useState('');
  const [awGender, setAwGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [awType, setAwType] = useState<ChildAcademicAwardRecord['awardType']>('የቀለም ትምህርት');
  const [awSchoolOrClass, setAwSchoolOrClass] = useState('');
  const [awRankOrAvg, setAwRankOrAvg] = useState('');
  const [awPrize, setAwPrize] = useState('');
  const [awDate, setAwDate] = useState('');
  const [awNotes, setAwNotes] = useState('');
  const achieversExportRef = useRef<HTMLDivElement>(null);

  const canManageAwards =
    Boolean(onSaveAcademicAwards) &&
    (currentUserRole === 'admin' ||
      currentUserRole === 'children_coordinator' ||
      currentUserRole === 'leader');

  // Compute top 3 for each class
  const topList: {
    className: string;
    rank: number;
    name: string;
    gender: string;
    age: number | string;
    total: number;
  }[] = [];

  classList.forEach((cName) => {
    const list = studentsByClass[cName] || [];
    const withTotals = list.map((s) => ({
      ...s,
      total:
        (Number(s.m1) || 0) +
        (Number(s.m2) || 0) +
        (Number(s.m3) || 0) +
        (Number(s.m4) || 0) +
        (Number(s.m5) || 0) +
        (Number(s.m6) || 0) +
        (Number(s.m7) || 0)
    }));

    const sorted = [...withTotals]
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    sorted.forEach((s, idx) => {
      topList.push({
        className: cName,
        rank: idx + 1,
        name: s.name,
        gender: s.gender,
        age: s.age,
        total: s.total
      });
    });
  });

  const filtered = classFilter === 'all' ? topList : topList.filter((item) => item.className === classFilter);

  const handleExportCSV = () => {
    const enHeader = nameScriptMode === 'both' ? ',Student Name (English)' : '';
    let csv = `\uFEFFክፍል,ደረጃ,${nameScriptMode === 'en' ? 'የተማሪው ስም (English)' : 'የተማሪው ስም'}${enHeader},ፆታ,ዕድሜ,ውጤት (100)\n`;
    filtered.forEach((item) => {
      const enName = transliterateAmharicToEnglish(item.name);
      const enVal = nameScriptMode === 'both' ? `,"${enName}"` : '';
      csv += `"${item.className}",${item.rank}ኛ,"${nameScriptMode === 'en' ? enName : item.name}"${enVal},${item.gender},${item.age},${item.total}\n`;
    });
    downloadCSV(csv, `ከ1ኛ_እስከ_3ኛ_የወጡ_${currentYear}_ዓ_ም.csv`);
  };

  return (
    <div ref={achieversExportRef} className="space-y-6">
      {/* Printable Sheet Header */}
      <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
        <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
        <h2 className="text-base font-semibold">
          የልጆች አገልግሎት ዘርፍ - ከ1ኛ እስከ 3ኛ የወጡ ተማሪዎች ክብር መዝገብ
        </h2>
        <div className="flex justify-between text-xs mt-2 font-medium">
          <span>የትምህርት ዘመን፦ {currentYear} ዓ/ም</span>
          <span>ጠቅላላ ተሸላሚዎች፦ {filtered.length} ተማሪዎች</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                ከየክፍሉ ከደረጃ 1 እስከ 3 የወጡ ተሸላሚ ተማሪዎች ዝርዝር (Top 3)
              </h3>
              <p className="text-xs text-slate-500">
                የ{currentYear} ዓ/ም የትምህርት ዘመን የላቀ ውጤት ያመጡ ተማሪዎች
              </p>
            </div>
          </div>

          {/* Info Banner clarifying Top 3 scope */}
          <div className="w-full md:w-auto bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl px-3 py-1.5 text-xs">
            💡 <strong>ማስታወሻ፦</strong> ይህ ገጽ ለሽልማት <strong>ከ1ኛ እስከ 3ኛ የወጡትን 3 ተማሪዎች</strong> ብቻ ያሳያል። የክፍሉን ሙሉ ተማሪዎች ለማየት ወይም አዲስ ተማሪዎችን ለማስገባት <strong>"ክፍሎች"</strong> ወይም <strong>"አተንዳንስ"</strong> የሚለውን ትር ይጠቀሙ።
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">ሁሉም ክፍሎች ({classList.length})</option>
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <ExportPhotoButton
              targetRef={achieversExportRef}
              fileName={`ከ1ኛ_እስከ_3ኛ_የወጡ_${currentYear}`}
              variant="secondary"
              compact
            />

            <button
              onClick={() => window.print()}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              ማተሚያ (Print)
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Excel / CSV
            </button>
          </div>
        </div>
      </div>

      {/* Achievers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none print:overflow-visible">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-center">
                <th className="py-3 px-3 border-r border-slate-200 w-12">ተ.ቁ</th>
                <th className="py-3 px-4 border-r border-slate-200 w-36">ክፍል</th>
                <th className="py-3 px-3 border-r border-slate-200 w-24">ደረጃ</th>
                <th className="py-3 px-4 border-r border-slate-200 text-left">የተማሪው ስም</th>
                <th className="py-3 px-3 border-r border-slate-200 w-16">ፆታ</th>
                <th className="py-3 px-3 border-r border-slate-200 w-16">ዕድሜ</th>
                <th className="py-3 px-4 font-extrabold text-slate-900 w-28 bg-amber-50/50">
                  ውጤት (100)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    ምንም የተመዘገበ ውጤት አልተገኘም።
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={`top_${item.className}_${item.rank}_${idx}`} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 font-bold text-blue-900">
                      {item.className}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          item.rank === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : item.rank === 2
                            ? 'bg-slate-200 text-slate-800 border border-slate-300'
                            : 'bg-orange-100 text-orange-800 border border-orange-300'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        {item.rank}ኛ
                      </span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 text-left font-bold text-[13pt] text-slate-900 min-w-[200px]">
                      <div>{nameScriptMode === 'en' ? transliterateAmharicToEnglish(item.name) : item.name}</div>
                      {nameScriptMode === 'both' && (
                        <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                          {transliterateAmharicToEnglish(item.name)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <span
                        className={`font-semibold ${
                          item.gender === 'ወ'
                            ? 'text-blue-600'
                            : item.gender === 'ሴ'
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.gender || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600">
                      {item.age}
                    </td>
                    <td className="py-2.5 px-4 font-black text-amber-700 bg-amber-50/20 text-sm">
                      {item.total} / 100
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secular Academic & Dual Excellence Awardees Section */}
      {onSaveAcademicAwards && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  በመንፈሳዊና በቀለም ትምህርት ልቀው የተገኙ ልጆች የሽልማት መዝገብ ({currentYear} ዓ/ም)
                </h3>
                <p className="text-xs text-slate-500">
                  በመደበኛ የቀለም ትምህርት ቤትና በመንፈሳዊ ትምህርት ከፍተኛ ውጤት አምጥተው የተሸለሙ ልጆች ዝርዝር
                </p>
              </div>
            </div>
            {canManageAwards && (
              <button
                type="button"
                onClick={() => {
                  setEditingAwardId(null);
                  setAwName('');
                  setAwGender('ወ');
                  setAwType('የቀለም ትምህርት');
                  setAwSchoolOrClass('');
                  setAwRankOrAvg('');
                  setAwPrize('');
                  setAwDate(new Date().toISOString().split('T')[0]);
                  setAwNotes('');
                  setIsAwardModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer print:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>የቀለም / መንፈሳዊ ተሸላሚ ጨምር</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 w-10">#</th>
                  <th className="py-2.5 px-4">የተማሪው ሙሉ ስም</th>
                  <th className="py-2.5 px-3">ጾታ</th>
                  <th className="py-2.5 px-4">የሽልማት ዘርፍ</th>
                  <th className="py-2.5 px-4">ትምህርት ቤት / ክፍል</th>
                  <th className="py-2.5 px-4">ደረጃ / ውጤት</th>
                  <th className="py-2.5 px-4">የተሰጠ ሽልማት</th>
                  <th className="py-2.5 px-3">ቀን</th>
                  {canManageAwards && <th className="py-2.5 px-3 text-right print:hidden">ማስተካከያ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {academicAwards.filter((a) => !a.year || a.year === currentYear).length === 0 ? (
                  <tr>
                    <td colSpan={canManageAwards ? 9 : 8} className="py-8 text-center text-slate-400">
                      በ{currentYear} ዓ/ም የተመዘገበ የቀለም ትምህርት ተሸላሚ ገና የለም።
                    </td>
                  </tr>
                ) : (
                  academicAwards
                    .filter((a) => !a.year || a.year === currentYear)
                    .map((aw, idx) => (
                      <tr key={aw.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 tabular-nums text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{aw.studentName}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-semibold">{aw.gender}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[11px]">
                            {aw.awardType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{aw.schoolOrClass}</td>
                        <td className="py-2.5 px-4 font-extrabold text-amber-800">{aw.rankOrAverage}</td>
                        <td className="py-2.5 px-4 text-slate-700">{aw.prizeGiven || '—'}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {aw.awardDate ? <DualDateBadge value={aw.awardDate} mode="inline" /> : '—'}
                        </td>
                        {canManageAwards && (
                          <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                            {confirmDeleteAwardId === aw.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveAcademicAwards(academicAwards.filter((x) => x.id !== aw.id));
                                    setConfirmDeleteAwardId(null);
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer"
                                >
                                  ሰርዝ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAwardId(null)}
                                  className="px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                                >
                                  ተው
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAwardId(aw.id);
                                    setAwName(aw.studentName);
                                    setAwGender(aw.gender === 'ሴ' ? 'ሴ' : 'ወ');
                                    setAwType(aw.awardType);
                                    setAwSchoolOrClass(aw.schoolOrClass);
                                    setAwRankOrAvg(aw.rankOrAverage);
                                    setAwPrize(aw.prizeGiven || '');
                                    setAwDate(aw.awardDate || '');
                                    setAwNotes(aw.notes || '');
                                    setIsAwardModalOpen(true);
                                  }}
                                  className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAwardId(aw.id)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
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
        </div>
      )}

      {isAwardModalOpen && onSaveAcademicAwards && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingAwardId ? 'የተሸላሚ መዝገብ አስተካክል' : 'አዲስ የቀለም / መንፈሳዊ ትምህርት ተሸላሚ ጨምር'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAwardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!awName.trim()) return;
                const rec: ChildAcademicAwardRecord = {
                  id: editingAwardId ?? generateUniqueId(),
                  year: currentYear,
                  studentName: awName.trim(),
                  gender: awGender,
                  awardType: awType,
                  schoolOrClass: awSchoolOrClass.trim() || '-',
                  rankOrAverage: awRankOrAvg.trim() || '-',
                  prizeGiven: awPrize.trim() || undefined,
                  awardDate: awDate.trim() || undefined,
                  notes: awNotes.trim() || undefined
                };
                const next = editingAwardId
                  ? academicAwards.map((x) => (x.id === editingAwardId ? rec : x))
                  : [rec, ...academicAwards];
                onSaveAcademicAwards(next);
                setIsAwardModalOpen(false);
              }}
              className="space-y-3 mt-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">የተማሪው ሙሉ ስም *</label>
                  <input
                    type="text"
                    required
                    value={awName}
                    onChange={(e) => setAwName(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ጾታ</label>
                  <select
                    value={awGender}
                    onChange={(e) => setAwGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">ወንድ</option>
                    <option value="ሴ">ሴት</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">የሽልማት ዓይነት</label>
                <select
                  value={awType}
                  onChange={(e) => setAwType(e.target.value as ChildAcademicAwardRecord['awardType'])}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                >
                  <option value="የቀለም ትምህርት">የቀለም ትምህርት</option>
                  <option value="መንፈሳዊ እና የቀለም ትምህርት">መንፈሳዊ እና የቀለም ትምህርት</option>
                  <option value="መንፈሳዊ ትምህርት">መንፈሳዊ ትምህርት</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ትምህርት ቤት / ክፍል</label>
                  <input
                    type="text"
                    value={awSchoolOrClass}
                    onChange={(e) => setAwSchoolOrClass(e.target.value)}
                    placeholder="ምሳሌ፦ 6ኛ ክፍል (ብርብር ት/ቤት)"
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ደረጃ / አማካይ ውጤት</label>
                  <input
                    type="text"
                    value={awRankOrAvg}
                    onChange={(e) => setAwRankOrAvg(e.target.value)}
                    placeholder="ምሳሌ፦ 1ኛ / 96.5%"
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">የተሰጠ ሽልማት</label>
                  <input
                    type="text"
                    value={awPrize}
                    onChange={(e) => setAwPrize(e.target.value)}
                    placeholder="ምሳሌ፦ መጽሐፍ ቅዱስ እና ደብተር"
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">የሽልማት ቀን</label>
                  <DualDateInput value={awDate} onChange={setAwDate} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl cursor-pointer"
                >
                  አስቀምጥ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Signature Section */}
      <div className="hidden print:flex justify-between pt-10 text-xs font-semibold text-slate-800">
        <div>
          <p>የልጆች አገልግሎት አስተባባሪ፦ ወ/ዊ ገላትያ ደስታ</p>
          <p className="mt-2">ፊርማ፦ _________________ ቀን፦ ___________</p>
        </div>
        <div>
          <p>የመንፈሳዊ ዘርፍ አስተባባሪ፦ መጋቢ ጉጃ ኡባ</p>
          <p className="mt-2">ፊርማ፦ _________________ ቀን፦ ___________</p>
        </div>
      </div>
    </div>
  );
};
