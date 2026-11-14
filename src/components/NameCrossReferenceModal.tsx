import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  Church,
  PhoneCall,
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  UserPlus,
  HelpCircle,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';
import {
  SundaySchoolIndexStructure,
  buildSundaySchoolIndex,
  matchChildNameToSundaySchool
} from './ChurchChildrenTab';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { matchesAmharicSearch } from '../utils/churchExcelParser';

export interface ChurchComparableItem {
  id?: number | string;
  name: string;
  gender?: string;
  age?: number | string;
  chapel?: string;
  parentName?: string;
  phone?: string;
  residence?: string;
  occupation?: string;
  educationLevel?: string;
}

interface NameCrossReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  sourceLabel?: string;
  churchItems: ChurchComparableItem[];
  studentsByClass: { [className: string]: Student[] };
  classList: string[];
  chapelList?: string[];
  onEnrollChild?: (item: ChurchComparableItem, targetClass: string) => void;
}

export const NameCrossReferenceModal: React.FC<NameCrossReferenceModalProps> = ({
  isOpen,
  onClose,
  title = 'የቤተክርስቲያን መዝገብ እና የሰንበት ትምህርት ቤት የስም ማስተያያ ሰንጠረዥ',
  sourceLabel = 'የቤተክርስቲያን ቋት',
  churchItems = [],
  studentsByClass = {},
  classList = [],
  chapelList = DEFAULT_CHAPELS,
  onEnrollChild
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enrolled' | 'not_enrolled' | 'age_diff'>('all');
  const [chapelFilter, setChapelFilter] = useState<string>('all');
  const [selectedClassToEnroll, setSelectedClassToEnroll] = useState<string>(classList[0] || '1ኛ ክፍል');
  const [enrollingItem, setEnrollingItem] = useState<ChurchComparableItem | null>(null);

  // 1. Build index from Sunday School students
  const sundaySchoolIndex: SundaySchoolIndexStructure = useMemo(() => {
    return buildSundaySchoolIndex(studentsByClass);
  }, [studentsByClass]);

  // 2. Perform name-based cross-referencing without age restriction
  const crossReferenced = useMemo(() => {
    return churchItems.map((item, index) => {
      const match = matchChildNameToSundaySchool(item.name, sundaySchoolIndex);

      const churchAgeStr = item.age !== undefined && item.age !== null && String(item.age).trim() !== ''
        ? String(item.age).trim()
        : '';
      const sundayAgeStr = match && match.student.age !== undefined && match.student.age !== null && String(match.student.age).trim() !== ''
        ? String(match.student.age).trim()
        : '';

      const hasAgeDiscrepancy = Boolean(
        match &&
        churchAgeStr &&
        sundayAgeStr &&
        churchAgeStr !== sundayAgeStr
      );

      return {
        seq: index + 1,
        item,
        isEnrolled: Boolean(match),
        match,
        enrolledClass: match ? match.className : null,
        matchedStudent: match ? match.student : null,
        matchLabel: match ? match.matchLabel : 'በሰንበት ት/ቤት አልተገኘም',
        churchAgeStr,
        sundayAgeStr,
        hasAgeDiscrepancy
      };
    });
  }, [churchItems, sundaySchoolIndex]);

  // 3. Calculate summary metrics
  const summary = useMemo(() => {
    const total = crossReferenced.length;
    let enrolled = 0;
    let notEnrolled = 0;
    let ageDiff = 0;

    crossReferenced.forEach((row) => {
      if (row.isEnrolled) {
        enrolled++;
        if (row.hasAgeDiscrepancy) {
          ageDiff++;
        }
      } else {
        notEnrolled++;
      }
    });

    const enrolledPercent = total > 0 ? Math.round((enrolled / total) * 100) : 0;

    return { total, enrolled, notEnrolled, ageDiff, enrolledPercent };
  }, [crossReferenced]);

  // 4. Filter the rows
  const filteredRows = useMemo(() => {
    return crossReferenced.filter((row) => {
      // Status filter
      if (statusFilter === 'enrolled' && !row.isEnrolled) return false;
      if (statusFilter === 'not_enrolled' && row.isEnrolled) return false;
      if (statusFilter === 'age_diff' && (!row.isEnrolled || !row.hasAgeDiscrepancy)) return false;

      // Chapel filter
      if (chapelFilter !== 'all') {
        const itemCh = (row.item.chapel || '').toLowerCase();
        const fCh = chapelFilter.toLowerCase();
        if (!itemCh.includes(fCh) && !fCh.includes(itemCh)) return false;
      }

      // Search term (Amharic homophones & token matching)
      if (searchTerm.trim()) {
        const matched = matchesAmharicSearch(
          searchTerm,
          row.item.name,
          row.item.parentName,
          row.item.phone,
          row.item.chapel,
          row.matchedStudent?.name,
          row.enrolledClass
        );
        if (!matched) return false;
      }

      return true;
    });
  }, [crossReferenced, statusFilter, chapelFilter, searchTerm]);

  // 5. Excel Export
  const handleExportExcel = () => {
    try {
      const exportData = filteredRows.map((r, i) => ({
        'ተ.ቁ': i + 1,
        'የልጅ ስም (በቤተክርስቲያን)': r.item.name || '',
        'ጾታ': r.item.gender || '',
        'ዕድሜ (በቤተክርስቲያን)': r.churchAgeStr ? `${r.churchAgeStr} ዓመት` : 'ያልተገለጸ',
        'ቻፕል (አጥቢያ)': r.item.chapel || '',
        'የወላጅ/አሳዳጊ ስም': r.item.parentName || '',
        'የወላጅ ስልክ ቁጥር': r.item.phone || '',
        'የሰንበት ት/ቤት የመማር ሁኔታ': r.isEnrolled ? 'አዎ (ይማራል)' : 'አይማርም',
        'የተገኘበት የሰንበት ት/ቤት ክፍል': r.enrolledClass || '-',
        'የተማሪ ስም በሰንበት ት/ቤት': r.matchedStudent?.name || '-',
        'ዕድሜ (በሰንበት ት/ቤት)': r.sundayAgeStr ? `${r.sundayAgeStr} ዓመት` : '-',
        'የማመሳሰል ደረጃ': r.matchLabel,
        'የዕድሜ ማስታወሻ': r.hasAgeDiscrepancy
          ? `ዕድሜው ባይመሳሰልም በስም ተገናኝቷል (ቤተክርስቲያን፦ ${r.churchAgeStr} | ሰ/ት/ቤት፦ ${r.sundayAgeStr})`
          : (r.isEnrolled ? 'ተመሳሳይ ወይም ተመጣጣኝ ዕድሜ' : '-')
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'የስም ማስተያያ');
      XLSX.writeFile(wb, `የቤተክርስቲያንና_የሰንበት_ትምህርት_ቤት_የስም_ማስተያያ_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error('Error exporting comparison to Excel', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-blue-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">{title}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  {sourceLabel}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                በስም (የልጁ ስም እና የአባት ስም) በማስተያየት በዕድሜ ባይገናኙም እየተማሩና የማይማሩትን የመለያያ ሰንጠረዥ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guidance Banner */}
        <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-900 shrink-0">
          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>ጠቃሚ መመሪያ፦</strong> ይህ ማስተያያ የልጁን ስም እና የአባት ስም መነሻ በማድረግ ከሰንበት ትምህርት ቤት ተማሪዎች ጋር ያገናኛል። በቤተክርስቲያን መዝገብ እና በሰንበት ት/ቤት የተጻፈው ዕድሜ ባይገናኝም (የተለያየ ቢሆንም) በስም ብቻ የተመሳሰሉትን በሙሉ ይለያል።
          </span>
        </div>

        {/* Metrics Strip */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          {/* Total Children */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500">ጠቅላላ በቋቱ ያሉ ልጆች</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-slate-900">{summary.total}</span>
              <span className="text-xs font-semibold text-slate-400">100%</span>
            </div>
          </div>

          {/* Enrolled */}
          <div className="bg-white p-3 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>በሰንበት ት/ቤት የሚማሩ</span>
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-emerald-900">{summary.enrolled}</span>
              <span className="text-xs font-bold text-emerald-700">{summary.enrolledPercent}%</span>
            </div>
          </div>

          {/* Not Enrolled */}
          <div className="bg-white p-3 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>የማይማሩ (ክትትል የሚሹ)</span>
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-amber-900">{summary.notEnrolled}</span>
              <span className="text-xs font-bold text-amber-700">
                {summary.total > 0 ? `${100 - summary.enrolledPercent}%` : '0%'}
              </span>
            </div>
          </div>

          {/* Age Discrepancies but Matched by Name */}
          <div className="bg-white p-3 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>ዕድሜ ባይገናኝም በስም የተመሳሰሉ</span>
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-indigo-950">{summary.ageDiff}</span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-md">
                ተገናኝተዋል
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ሁሉም ({summary.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('enrolled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                statusFilter === 'enrolled' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>የሚማሩ ({summary.enrolled})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('not_enrolled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                statusFilter === 'not_enrolled' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>የማይማሩ ({summary.notEnrolled})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('age_diff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                statusFilter === 'age_diff' ? 'bg-indigo-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="በቤተክርስቲያንና በሰንበት ት/ቤት ያለው ዕድሜ የተለያየ ቢሆንም በስም የተገናኙ"
            >
              <Calendar className="w-3 h-3" />
              <span>የዕድሜ ልዩነት ያላቸው ({summary.ageDiff})</span>
            </button>
          </div>

          {/* Chapel Select, Search & Export */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            {/* Chapel select */}
            <div className="relative">
              <select
                value={chapelFilter}
                onChange={(e) => setChapelFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pr-7 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">ሁሉም 10ሩ ቻፕሎች</option>
                {chapelList.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="በልጅ፣ ወላጅ ወይም ሰ/ት ስም ፈልግ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0"
              title="ይህን የማስተያያ ሰንጠረዥ በኤክሴል አውርድ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel አውርድ</span>
            </button>
          </div>
        </div>

        {/* Main Comparison Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-bold">
                  <th className="py-3 px-3 text-center w-12">ተ.ቁ</th>
                  <th className="py-3 px-4 min-w-[200px]">የልጁ ሙሉ ስም (በቤተክርስቲያን)</th>
                  <th className="py-3 px-3 text-center w-24">ዕድሜ (ቤተክርስቲያን)</th>
                  <th className="py-3 px-3 min-w-[120px]">ቻፕል</th>
                  <th className="py-3 px-3 min-w-[140px]">የወላጅ ስም & ስልክ</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">የሰንበት ት/ቤት ሁኔታ</th>
                  <th className="py-3 px-3 min-w-[130px]">የተገኘበት ክፍል</th>
                  <th className="py-3 px-4 min-w-[180px]">ስም በሰንበት ት/ቤት</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">ዕድሜ (ሰንበት ት/ቤት)</th>
                  <th className="py-3 px-3 min-w-[140px]">የማመሳሰል ዓይነት</th>
                  {onEnrollChild && <th className="py-3 px-3 text-center w-28">እርምጃ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={onEnrollChild ? 11 : 10} className="py-12 text-center text-slate-500">
                      <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-sm">በተመረጠው መስፈርት የተገኘ ልጅ አልተገኘም!</p>
                      <p className="text-xs text-slate-400 mt-1">የፍለጋ ቃሉን ወይም የቻፕል ማጣሪያውን ይቀይሩ።</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr
                      key={`${row.item.name}-${idx}`}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        row.hasAgeDiscrepancy ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500 bg-slate-50/60">
                        {idx + 1}
                      </td>

                      {/* Church Child Name */}
                      <td className="py-2.5 px-4 font-bold text-[13px] text-slate-900">
                        <span>{row.item.name}</span>
                        {row.item.gender && (
                          <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            row.item.gender === 'ወ' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {row.item.gender}
                          </span>
                        )}
                      </td>

                      {/* Church Age */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {row.churchAgeStr ? `${row.churchAgeStr} ዓመት` : '-'}
                        </span>
                      </td>

                      {/* Chapel */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                          <Church className="w-3 h-3 text-blue-700 shrink-0" />
                          <span>{row.item.chapel || 'ያልተገለጸ'}</span>
                        </span>
                      </td>

                      {/* Parent & Phone */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{row.item.parentName || '-'}</div>
                        {row.item.phone && (
                          <a
                            href={`tel:${row.item.phone}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 hover:underline mt-0.5"
                          >
                            <PhoneCall className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{row.item.phone}</span>
                          </a>
                        )}
                      </td>

                      {/* Enrollment Status */}
                      <td className="py-2.5 px-3 text-center">
                        {row.isEnrolled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100/90 text-emerald-900 border border-emerald-300 font-extrabold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>ይማራል</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100/90 text-amber-900 border border-amber-300 font-extrabold text-[11px]">
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            <span>አይማርም</span>
                          </span>
                        )}
                      </td>

                      {/* Sunday School Class */}
                      <td className="py-2.5 px-3">
                        {row.enrolledClass ? (
                          <span className="font-bold text-[11px] text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                            {row.enrolledClass}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Sunday School Name */}
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {row.matchedStudent ? (
                          <span className="text-slate-900 font-bold">{row.matchedStudent.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">አልተገኘም</span>
                        )}
                      </td>

                      {/* Sunday School Age (Highlighting discrepancies) */}
                      <td className="py-2.5 px-3 text-center">
                        {row.matchedStudent ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                              row.hasAgeDiscrepancy
                                ? 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {row.sundayAgeStr ? `${row.sundayAgeStr} ዓመት` : 'ያልተገለጸ'}
                            </span>
                            {row.hasAgeDiscrepancy && (
                              <span className="text-[9px] font-black text-indigo-700 leading-tight">
                                በስም ተገናኝቷል
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Match Level */}
                      <td className="py-2.5 px-3">
                        {row.isEnrolled ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            row.match?.matchType === 'exact'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}>
                            <Check className="w-2.5 h-2.5" />
                            <span>{row.matchLabel}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">ተማሪ አልተገኘም</span>
                        )}
                      </td>

                      {/* Action Enroll */}
                      {onEnrollChild && (
                        <td className="py-2.5 px-3 text-center">
                          {!row.isEnrolled ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEnrollingItem(row.item);
                                setSelectedClassToEnroll(classList[0] || '1ኛ ክፍል');
                              }}
                              className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
                              title="ይህን ልጅ ወደ ሰንበት ት/ቤት መዝግብ"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>መዝግብ</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold">ተመዝግቧል</span>
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

        {/* Enroll Modal inside Cross Reference */}
        {enrollingItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-900" />
                  <span>ልጅን ወደ ሰንበት ት/ቤት መመዝገቢያ</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEnrollingItem(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold">የልጁ ስም፦</p>
                  <p className="text-base font-extrabold text-slate-900">{enrollingItem.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                    <span>ዕድሜ፦ <strong>{enrollingItem.age ? `${enrollingItem.age} ዓመት` : 'ያልተገለጸ'}</strong></span>
                    <span>ጾታ፦ <strong>{enrollingItem.gender || 'ወ'}</strong></span>
                    <span>ቻፕል፦ <strong>{enrollingItem.chapel || 'ዋና'}</strong></span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    የሚመዘገብበት ክፍል ምረጥ፦
                  </label>
                  <select
                    value={selectedClassToEnroll}
                    onChange={(e) => setSelectedClassToEnroll(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {classList.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEnrollingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  ተመለስ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onEnrollChild && enrollingItem) {
                      onEnrollChild(enrollingItem, selectedClassToEnroll);
                      setEnrollingItem(null);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ወደ {selectedClassToEnroll} መዝግብ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            የሚታዩ፦ <strong>{filteredRows.length}</strong> / ጠቅላላ፦ <strong>{summary.total}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            ዝጋ
          </button>
        </div>
      </div>
    </div>
  );
};
