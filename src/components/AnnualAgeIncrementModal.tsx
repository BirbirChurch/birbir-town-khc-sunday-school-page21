import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, RefreshCw, RotateCcw, Users, X, Sparkles, AlertTriangle } from 'lucide-react';
import { BulkAgeIncrementOptions, BulkAgeIncrementStats } from '../utils/ageUpdater';

interface AnnualAgeIncrementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentYear: string;
  ageReferenceYear: number;
  totalMembersCount?: number;
  totalChildrenCount?: number;
  onApplyBulkIncrement: (
    options: Omit<BulkAgeIncrementOptions, 'targetAcademicYear'>
  ) => BulkAgeIncrementStats | null;
}

export const AnnualAgeIncrementModal: React.FC<AnnualAgeIncrementModalProps> = ({
  isOpen,
  onClose,
  currentYear,
  ageReferenceYear,
  totalMembersCount = 0,
  totalChildrenCount = 0,
  onApplyBulkIncrement
}) => {
  const numericCurrentYear = parseInt(currentYear, 10) || ageReferenceYear;
  const [targetYear, setTargetYear] = useState<number>(
    numericCurrentYear > ageReferenceYear ? numericCurrentYear : ageReferenceYear + 1
  );
  const [includeChurchMembers, setIncludeChurchMembers] = useState<boolean>(true);
  const [includeChurchChildren, setIncludeChurchChildren] = useState<boolean>(true);
  const [includeStudents, setIncludeStudents] = useState<boolean>(true);
  const [includeChoirAndSpiritual, setIncludeChoirAndSpiritual] = useState<boolean>(true);
  const [lastStats, setLastStats] = useState<BulkAgeIncrementStats | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cur = parseInt(currentYear, 10) || ageReferenceYear;
      setTargetYear(cur > ageReferenceYear ? cur : ageReferenceYear + 1);
      setLastStats(null);
    }
  }, [isOpen, currentYear, ageReferenceYear]);

  if (!isOpen) return null;

  const yearOptions = Array.from({ length: 14 }, (_, i) => 2017 + i);
  const plannedDelta = targetYear - ageReferenceYear;

  const runIncrement = (deltaYears: number, explicitTargetYear?: number) => {
    if (deltaYears === 0) return;
    if (!includeChurchMembers && !includeChurchChildren && !includeStudents && !includeChoirAndSpiritual) {
      alert('እባክዎን ቢያንስ አንድ የመረጃ ቋት ይምረጡ!');
      return;
    }
    const stats = onApplyBulkIncrement({
      deltaYears,
      targetReferenceYear: explicitTargetYear ?? ageReferenceYear + deltaYears,
      includeChurchMembers,
      includeChurchChildren,
      includeStudents,
      includeChoirAndSpiritual
    });
    if (stats) {
      setLastStats(stats);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-slate-950 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/85 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h3 className="font-black text-base">ዓመታዊ የሁሉም አባላት ዕድሜ ማዘመኛ</h3>
              <p className="text-[11px] font-bold text-amber-950/90">
                መነሻ 2017 ዓ/ም መዝገብ ላይ በየዓመቱ ዕድሜ በአንድ ጊዜ መጨመሪያ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-900 hover:bg-white/40 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Reference Year Indicator */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-500">የአሁኑ የዕድሜ መነሻ ዓመት</div>
              <div className="text-xl font-black text-slate-900 mt-0.5 tabular-nums">
                {ageReferenceYear} ዓ/ም
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {ageReferenceYear === 2017 ? 'የ2017 ዓ/ም መጀመሪያ መረጃ' : `እስከ ${ageReferenceYear} ዓ/ም የዘመነ`}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-blue-700">የተመረጠው የሥራ ዓመት</div>
              <div className="text-xl font-black text-blue-950 mt-0.5 tabular-nums">
                {currentYear} ዓ/ም
              </div>
              <div className="text-[10px] font-bold text-blue-800 mt-0.5">
                {numericCurrentYear > ageReferenceYear
                  ? `ከመነሻው +${numericCurrentYear - ageReferenceYear} ዓመት ልዩነት አለ`
                  : numericCurrentYear === ageReferenceYear
                  ? '✓ ከመነሻው ጋር እኩል ነው'
                  : `ከመነሻው ${numericCurrentYear - ageReferenceYear} ዓመት`}
              </div>
            </div>
          </div>

          {lastStats && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-1">
              <div className="font-black flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  ዕድሜ በተሳካ ሁኔታ ተዘምኗል ({lastStats.fromYear} → {lastStats.toYear} ዓ/ም |{' '}
                  {lastStats.deltaYears > 0 ? `+${lastStats.deltaYears}` : lastStats.deltaYears} ዓመት)
                </span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-800 pl-5 space-y-0.5">
                <div>• የቤተክርስቲያን አባላት ቋት፦ {lastStats.membersUpdated.toLocaleString('am-ET')} ተዘምነዋል</div>
                <div>• የልጆች ቋት፦ {lastStats.childrenUpdated.toLocaleString('am-ET')} ተዘምነዋል</div>
                {lastStats.childrenTurned15Plus > 0 && (
                  <div className="text-amber-800 font-bold">
                    • {lastStats.childrenTurned15Plus} ልጆች ዕድሜያቸው 15+ ዓመት ደርሷል
                  </div>
                )}
                {lastStats.studentsUpdated > 0 && (
                  <div>• የሰንበት ት/ቤት ተማሪዎች፦ {lastStats.studentsUpdated} ተዘምነዋል</div>
                )}
                {lastStats.otherMembersUpdated > 0 && (
                  <div>• መዘምራን እና መንፈሳዊ ቡድኖች፦ {lastStats.otherMembersUpdated} ተዘምነዋል</div>
                )}
              </div>
            </div>
          )}

          {/* Quick +1 / -1 Buttons */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>1. ቀጥታ የአንድ ዓመት ጭማሪ ወይም ማስተካከያ፦</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => runIncrement(1, ageReferenceYear + 1)}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>+1 ዓመት ጨምር ({ageReferenceYear} → {ageReferenceYear + 1})</span>
              </button>

              {ageReferenceYear > 2017 && (
                <button
                  type="button"
                  onClick={() => runIncrement(-1, ageReferenceYear - 1)}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="የተጨመረውን 1 ዓመት ወደ ኋላ መልስ"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>-1 ዓመት መልስ</span>
                </button>
              )}
            </div>
          </div>

          {/* Target Year Sync */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <label className="block text-xs font-extrabold text-slate-900">
              2. ወደ ተወሰነ ዓመት (ለምሳሌ ከ2017 ወደ {currentYear} ዓ/ም) በአንዴ አዘምን፦
            </label>
            <div className="flex items-center gap-2">
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className="flex-1 px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {yearOptions.map((y) => (
                  <option key={`target_y_${y}`} value={y}>
                    {y} ዓ/ም ({y - ageReferenceYear >= 0 ? `+${y - ageReferenceYear}` : y - ageReferenceYear} ዓመት)
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={plannedDelta === 0}
                onClick={() => runIncrement(plannedDelta, targetYear)}
                className="bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition cursor-pointer shrink-0"
              >
                {plannedDelta > 0
                  ? `+${plannedDelta} ዓመት አዘምን`
                  : plannedDelta < 0
                  ? `${plannedDelta} ዓመት አስተካክል`
                  : 'እኩል ነው'}
              </button>
            </div>
          </div>

          {/* Target Registries Scope */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-blue-800" />
              <span>ዕድሜው የሚዘምንባቸው ቋቶች (ይምረጡ)፦</span>
            </div>

            <label className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={includeChurchMembers}
                  onChange={(e) => setIncludeChurchMembers(e.target.checked)}
                  className="w-4 h-4 text-blue-900 rounded focus:ring-blue-600"
                />
                <span>አጠቃላይ የቤተክርስቲያን አባላት ቋት</span>
              </span>
              {totalMembersCount > 0 && (
                <span className="text-[11px] font-bold text-slate-500">
                  {totalMembersCount.toLocaleString('am-ET')} አባላት
                </span>
              )}
            </label>

            <label className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={includeChurchChildren}
                  onChange={(e) => setIncludeChurchChildren(e.target.checked)}
                  className="w-4 h-4 text-blue-900 rounded focus:ring-blue-600"
                />
                <span>የቤተክርስቲያን ልጆች እና የ10ሩ ቻፕሎች ቋት</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {totalChildrenCount.toLocaleString('am-ET')} ልጆች
              </span>
            </label>

            <label className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={includeStudents}
                  onChange={(e) => setIncludeStudents(e.target.checked)}
                  className="w-4 h-4 text-blue-900 rounded focus:ring-blue-600"
                />
                <span>የሰንበት ት/ቤት ተማሪዎች ({currentYear} ዓ/ም)</span>
              </span>
            </label>

            <label className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={includeChoirAndSpiritual}
                  onChange={(e) => setIncludeChoirAndSpiritual(e.target.checked)}
                  className="w-4 h-4 text-blue-900 rounded focus:ring-blue-600"
                />
                <span>መዘምራን እና መንፈሳዊ ት/ት ቡድኖች</span>
              </span>
            </label>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>ማሳሰቢያ፦</strong> በዚህ መንገድ ሲያዘምኑ ስርዓቱ የመነሻ ዓመቱን (<code>{ageReferenceYear} ዓ/ም</code>) ወደ አዲሱ ዓመት ስለሚቀይር፣ ተደጋግሞ በስህተት እንዳይጨመር ይከላከላል። ዕድሜ ያልተጻፈባቸው (ባዶ) መዝገቦች ባሉበት ይቆያሉ።
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition cursor-pointer"
          >
            ዝጋ
          </button>
        </div>
      </div>
    </div>
  );
};
