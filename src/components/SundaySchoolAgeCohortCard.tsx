import React, { useRef, useState } from 'react';
import { Calendar, FileSpreadsheet, Layers, BarChart2, X } from 'lucide-react';
import {
  PerClassAgeCohortRow,
  SundaySchoolAgeBucketKey,
  SundaySchoolAgeCohortStats
} from '../utils/sundaySchoolAgeStats';
import { ExportPhotoButton } from './ExportPhotoButton';

interface SundaySchoolAgeCohortCardProps {
  stats: SundaySchoolAgeCohortStats;
  perClassCohorts?: PerClassAgeCohortRow[];
  scopeLabel?: string;
  selectedAgeBucket?: SundaySchoolAgeBucketKey | 'all';
  onSelectAgeBucket?: (bucket: SundaySchoolAgeBucketKey | 'all') => void;
  onExportExcel?: () => void;
  compact?: boolean;
  className?: string;
}

const COHORT_DOT_COLOR: Record<string, string> = {
  '0-3': 'bg-purple-500',
  '4-6': 'bg-blue-500',
  '7-9': 'bg-emerald-500',
  '10-12': 'bg-amber-500',
  '13-14': 'bg-rose-500'
};

export const SundaySchoolAgeCohortCard: React.FC<SundaySchoolAgeCohortCardProps> = ({
  stats,
  perClassCohorts,
  scopeLabel,
  selectedAgeBucket = 'all',
  onSelectAgeBucket,
  onExportExcel,
  compact = false,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'summary' | 'per_class'>('summary');
  const cardExportRef = useRef<HTMLDivElement | null>(null);
  const activePerClassRows = (perClassCohorts || []).filter((r) => r.grandTotal.total > 0);
  const canShowPerClass = activePerClassRows.length > 0;
  const effectiveViewMode = viewMode === 'per_class' && canShowPerClass ? 'per_class' : 'summary';

  const hasUnspecifiedGender = stats.grandTotal.unspecifiedGender > 0;
  const totalDenominator = stats.grandTotal.total;

  const pct = (count: number) =>
    totalDenominator > 0 ? Math.round((count / totalDenominator) * 100) : 0;

  return (
    <div
      ref={cardExportRef}
      className={`bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm print:shadow-none print:border-slate-400 print:rounded-none print:mb-4 print:break-inside-avoid ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 gap-2 print:border-slate-300">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-800 shrink-0 print:hidden" />
            <span>
              የሰንበት ክፍል ተማሪዎች የዕድሜ ምድብ ማጠቃለያ (ከ0-3፣ ከ4-6፣ ከ7-9፣ ከ10-12 እና ከ13-14)
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {scopeLabel ? `${scopeLabel} • ` : ''}
            በእያንዳንዱ የዕድሜ ምድብ ያሉ ወንድ፣ ሴት እና ጠቅላላ ድምር
            {onSelectAgeBucket && effectiveViewMode === 'summary' ? ' (ለማጣራት በረድፉ ላይ ይጫኑ)' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          {canShowPerClass && (
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('summary')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  effectiveViewMode === 'summary'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                <span>አጠቃላይ ድምር</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('per_class')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  effectiveViewMode === 'per_class'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>በየክፍሉ ({activePerClassRows.length})</span>
              </button>
            </div>
          )}

          {selectedAgeBucket !== 'all' && onSelectAgeBucket && (
            <button
              type="button"
              onClick={() => onSelectAgeBucket('all')}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>የዕድሜ ማጣሪያ አጽዳ</span>
            </button>
          )}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="የ0-3፣ 4-6፣ 7-9፣ 10-12 እና 13-14 የወንድ፣ ሴት እና ድምር ሪፖርት በExcel አውርድ"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-200" />
              <span>የዕድሜ ስታቲስቲክስ Excel</span>
            </button>
          )}
          <ExportPhotoButton
            targetRef={cardExportRef}
            fileName={`የሰንበት_ተማሪዎች_የዕድሜ_ምድብ_ማጠቃለያ${scopeLabel ? `_${scopeLabel}` : ''}`}
            labelAm="በፎቶ (PNG)"
            labelEn="Photo (PNG)"
            variant="secondary"
            compact
          />
        </div>
      </div>

      {/* Quick Visual Summary Pills for 0-3 .. 13-14 (Screen only, always shown when summary active) */}
      {!compact && effectiveViewMode === 'summary' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4 print:hidden">
          {stats.cohorts.map((coh) => {
            const isSelected = selectedAgeBucket === coh.key;
            return (
              <button
                key={`pill-${coh.key}`}
                type="button"
                onClick={() =>
                  onSelectAgeBucket?.(isSelected ? 'all' : coh.key)
                }
                className={`text-left p-3 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-blue-700 ring-2 ring-blue-600/25 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${COHORT_DOT_COLOR[coh.key] || 'bg-slate-400'}`}
                    />
                    <span>{coh.label}</span>
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-xl font-black text-slate-900 tabular-nums">
                    {coh.total}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {pct(coh.total)}%
                  </span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-blue-800">ወንድ፦ {coh.male}</span>
                  <span className="text-rose-800">ሴት፦ {coh.female}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Structured Breakdown Table (Summary OR Per-Class Matrix — Screen + Print) */}
      {effectiveViewMode === 'summary' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-center print:bg-slate-800">
                <th className="py-2.5 px-3 text-left">የዕድሜ ምድብ</th>
                <th className="py-2.5 px-3 bg-blue-950/60 text-cyan-200 print:bg-transparent print:text-white">
                  ወንድ
                </th>
                <th className="py-2.5 px-3 bg-rose-950/50 text-rose-200 print:bg-transparent print:text-white">
                  ሴት
                </th>
                {hasUnspecifiedGender && (
                  <th className="py-2.5 px-3 text-slate-300 print:text-white">
                    ያልተገለጸ ጾታ
                  </th>
                )}
                <th className="py-2.5 px-3 font-extrabold text-amber-300 print:text-white">
                  ድምር
                </th>
                <th className="py-2.5 px-3">ድርሻ (%)</th>
                {onSelectAgeBucket && (
                  <th className="py-2.5 px-3 text-right print:hidden">ማጣሪያ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {stats.cohorts.map((coh) => {
                const isSelected = selectedAgeBucket === coh.key;
                const share = pct(coh.total);
                return (
                  <tr
                    key={coh.key}
                    onClick={() =>
                      onSelectAgeBucket?.(isSelected ? 'all' : coh.key)
                    }
                    className={`${onSelectAgeBucket ? 'cursor-pointer' : ''} transition-colors ${
                      isSelected ? 'bg-blue-50/90 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-left font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 print:hidden ${COHORT_DOT_COLOR[coh.key] || 'bg-slate-400'}`}
                        />
                        <span>{coh.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-blue-900 bg-blue-50/40 print:bg-transparent print:text-black">
                      {coh.male}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-rose-900 bg-rose-50/40 print:bg-transparent print:text-black">
                      {coh.female}
                    </td>
                    {hasUnspecifiedGender && (
                      <td className="py-2.5 px-3 tabular-nums font-semibold text-slate-500">
                        {coh.unspecifiedGender}
                      </td>
                    )}
                    <td className="py-2.5 px-3 tabular-nums font-extrabold text-slate-900 bg-amber-50/40 print:bg-transparent">
                      {coh.total}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-semibold text-slate-600">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden print:hidden">
                          <div
                            className="bg-blue-900 h-1.5 rounded-full"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span>{share}%</span>
                      </div>
                    </td>
                    {onSelectAgeBucket && (
                      <td className="py-2.5 px-3 text-right print:hidden">
                        <span className="text-[11px] text-blue-700 font-semibold hover:underline">
                          {isSelected ? '✓ ተመርጧል' : 'አሳይ →'}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Subtotal Row: Ages 0 - 14 */}
              <tr className="bg-indigo-50/90 border-t-2 border-indigo-200 font-extrabold text-indigo-950 print:bg-slate-100">
                <td className="py-2.5 px-3 text-left">
                  ከ0 - 14 ዓመት ንዑስ ድምር (0-14)
                </td>
                <td className="py-2.5 px-3 tabular-nums text-blue-950">
                  {stats.subtotal0to14.male}
                </td>
                <td className="py-2.5 px-3 tabular-nums text-rose-950">
                  {stats.subtotal0to14.female}
                </td>
                {hasUnspecifiedGender && (
                  <td className="py-2.5 px-3 tabular-nums text-slate-700">
                    {stats.subtotal0to14.unspecifiedGender}
                  </td>
                )}
                <td className="py-2.5 px-3 tabular-nums text-indigo-950">
                  {stats.subtotal0to14.total}
                </td>
                <td className="py-2.5 px-3 tabular-nums">
                  {pct(stats.subtotal0to14.total)}%
                </td>
                {onSelectAgeBucket && (
                  <td className="py-2.5 px-3 text-right print:hidden">
                    <span className="text-[10px] text-indigo-700 font-bold">
                      0–14 ድምር
                    </span>
                  </td>
                )}
              </tr>

              {/* Reconciling row: 15+ */}
              {stats.over14.total > 0 && (
                <tr
                  onClick={() =>
                    onSelectAgeBucket?.(
                      selectedAgeBucket === '15+' ? 'all' : '15+'
                    )
                  }
                  className={`${onSelectAgeBucket ? 'cursor-pointer' : ''} ${
                    selectedAgeBucket === '15+'
                      ? 'bg-blue-50 font-bold'
                      : 'bg-slate-50/60 hover:bg-slate-100/70'
                  } text-slate-700`}
                >
                  <td className="py-2 px-3 text-left font-semibold">
                    ከ15 ዓመት በላይ (15+)
                  </td>
                  <td className="py-2 px-3 tabular-nums font-bold text-blue-900">
                    {stats.over14.male}
                  </td>
                  <td className="py-2 px-3 tabular-nums font-bold text-rose-900">
                    {stats.over14.female}
                  </td>
                  {hasUnspecifiedGender && (
                    <td className="py-2 px-3 tabular-nums">
                      {stats.over14.unspecifiedGender}
                    </td>
                  )}
                  <td className="py-2 px-3 tabular-nums font-bold">
                    {stats.over14.total}
                  </td>
                  <td className="py-2 px-3 tabular-nums">
                    {pct(stats.over14.total)}%
                  </td>
                  {onSelectAgeBucket && (
                    <td className="py-2 px-3 text-right print:hidden">
                      <span className="text-[11px] text-blue-700 font-semibold hover:underline">
                        {selectedAgeBucket === '15+' ? '✓ ተመርጧል' : 'አሳይ →'}
                      </span>
                    </td>
                  )}
                </tr>
              )}

              {/* Reconciling row: Unknown age */}
              {stats.unknownAge.total > 0 && (
                <tr
                  onClick={() =>
                    onSelectAgeBucket?.(
                      selectedAgeBucket === 'unknown' ? 'all' : 'unknown'
                    )
                  }
                  className={`${onSelectAgeBucket ? 'cursor-pointer' : ''} ${
                    selectedAgeBucket === 'unknown'
                      ? 'bg-blue-50 font-bold'
                      : 'bg-slate-50/60 hover:bg-slate-100/70'
                  } text-slate-600`}
                >
                  <td className="py-2 px-3 text-left font-semibold">
                    ዕድሜ ያልተገለጸ
                  </td>
                  <td className="py-2 px-3 tabular-nums font-bold text-blue-900">
                    {stats.unknownAge.male}
                  </td>
                  <td className="py-2 px-3 tabular-nums font-bold text-rose-900">
                    {stats.unknownAge.female}
                  </td>
                  {hasUnspecifiedGender && (
                    <td className="py-2 px-3 tabular-nums">
                      {stats.unknownAge.unspecifiedGender}
                    </td>
                  )}
                  <td className="py-2 px-3 tabular-nums font-bold">
                    {stats.unknownAge.total}
                  </td>
                  <td className="py-2 px-3 tabular-nums">
                    {pct(stats.unknownAge.total)}%
                  </td>
                  {onSelectAgeBucket && (
                    <td className="py-2 px-3 text-right print:hidden">
                      <span className="text-[11px] text-blue-700 font-semibold hover:underline">
                        {selectedAgeBucket === 'unknown' ? '✓ ተመርጧል' : 'አሳይ →'}
                      </span>
                    </td>
                  )}
                </tr>
              )}

              {/* Grand Total Row */}
              <tr className="bg-slate-900 text-white font-extrabold border-t-2 border-slate-700 print:bg-slate-200 print:text-black">
                <td className="py-2.5 px-3 text-left">
                  ጠቅላላ የሰንበት ክፍል ተማሪዎች ድምር
                </td>
                <td className="py-2.5 px-3 tabular-nums text-cyan-300 print:text-black">
                  {stats.grandTotal.male}
                </td>
                <td className="py-2.5 px-3 tabular-nums text-rose-300 print:text-black">
                  {stats.grandTotal.female}
                </td>
                {hasUnspecifiedGender && (
                  <td className="py-2.5 px-3 tabular-nums">
                    {stats.grandTotal.unspecifiedGender}
                  </td>
                )}
                <td className="py-2.5 px-3 tabular-nums text-amber-300 print:text-black">
                  {stats.grandTotal.total}
                </td>
                <td className="py-2.5 px-3 tabular-nums">
                  {stats.grandTotal.total > 0 ? '100%' : '0%'}
                </td>
                {onSelectAgeBucket && (
                  <td className="py-2.5 px-3 text-right print:hidden">
                    <span className="text-[10px] text-slate-300">ሁሉም</span>
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] print:min-w-0 text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-900 text-white text-center font-extrabold print:bg-slate-800">
                <th
                  rowSpan={2}
                  className="py-2 px-2.5 text-left border border-slate-700 min-w-[130px] sticky left-0 z-10 bg-slate-900 print:static"
                >
                  ክፍል / ደረጃ
                </th>
                {stats.cohorts.map((coh) => (
                  <th
                    key={`h-${coh.key}`}
                    colSpan={3}
                    className="py-1.5 px-1 border border-slate-700"
                  >
                    ከ{coh.key} ዓመት
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="py-2 px-2 border border-slate-700 bg-indigo-950 text-indigo-200 print:bg-transparent print:text-white"
                >
                  0-14 ድምር
                </th>
                <th rowSpan={2} className="py-2 px-2 border border-slate-700">
                  15+ / ያልተገለጸ
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 border border-slate-700 bg-slate-800 text-amber-300 print:bg-transparent print:text-white"
                >
                  ጠቅላላ
                </th>
              </tr>
              <tr className="bg-slate-800 text-slate-200 text-center text-[10px] font-bold">
                {stats.cohorts.map((coh) => (
                  <React.Fragment key={`sub-${coh.key}`}>
                    <th className="py-1 px-1.5 border border-slate-700 text-cyan-300 print:text-white">
                      ወ
                    </th>
                    <th className="py-1 px-1.5 border border-slate-700 text-rose-300 print:text-white">
                      ሴ
                    </th>
                    <th className="py-1 px-1.5 border border-slate-700 text-amber-300 print:text-white">
                      ድ
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-center">
              {activePerClassRows.map((row) => (
                <tr key={`pc-${row.className}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2.5 text-left font-bold text-slate-900 border border-slate-200 sticky left-0 bg-white print:static">
                    {row.className}
                  </td>
                  {row.cohorts.map((c) => (
                    <React.Fragment key={`pc-${row.className}-${c.key}`}>
                      <td className="py-1.5 px-1.5 border border-slate-200 tabular-nums text-blue-900 bg-blue-50/30 print:bg-transparent print:text-black">
                        {c.male}
                      </td>
                      <td className="py-1.5 px-1.5 border border-slate-200 tabular-nums text-rose-900 bg-rose-50/30 print:bg-transparent print:text-black">
                        {c.female}
                      </td>
                      <td className="py-1.5 px-1.5 border border-slate-200 tabular-nums font-extrabold text-slate-900 bg-amber-50/30 print:bg-transparent">
                        {c.total}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className="py-1.5 px-2 border border-slate-200 tabular-nums font-extrabold text-indigo-950 bg-indigo-50/60 print:bg-transparent print:text-black">
                    {row.subtotal0to14.total}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-200 tabular-nums font-semibold text-slate-600">
                    {row.over14.total + row.unknownAge.total}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-200 tabular-nums font-black text-slate-900 bg-slate-100/70 print:bg-transparent">
                    {row.grandTotal.total}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-900 text-white font-extrabold print:bg-slate-200 print:text-black">
                <td className="py-2 px-2.5 text-left border border-slate-700 sticky left-0 bg-slate-900 print:static print:bg-slate-200">
                  ጠቅላላ ድምር
                </td>
                {stats.cohorts.map((c) => (
                  <React.Fragment key={`tot-${c.key}`}>
                    <td className="py-2 px-1.5 border border-slate-700 tabular-nums text-cyan-300 print:text-black">
                      {c.male}
                    </td>
                    <td className="py-2 px-1.5 border border-slate-700 tabular-nums text-rose-300 print:text-black">
                      {c.female}
                    </td>
                    <td className="py-2 px-1.5 border border-slate-700 tabular-nums text-amber-300 print:text-black">
                      {c.total}
                    </td>
                  </React.Fragment>
                ))}
                <td className="py-2 px-2 border border-slate-700 tabular-nums text-indigo-200 print:text-black">
                  {stats.subtotal0to14.total}
                </td>
                <td className="py-2 px-2 border border-slate-700 tabular-nums">
                  {stats.over14.total + stats.unknownAge.total}
                </td>
                <td className="py-2 px-2 border border-slate-700 tabular-nums text-amber-300 print:text-black">
                  {stats.grandTotal.total}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
