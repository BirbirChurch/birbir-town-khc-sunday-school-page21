import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  DEFAULT_TIME_OFFSET_MINUTES,
  ETHIOPIAN_MONTHS_AM,
  ETHIOPIAN_MONTHS_EN,
  TIME_OFFSET_EVENT,
  applyTimeOffsetToDate,
  ethiopianToIso,
  formatDualDate,
  formatDualTimeParts,
  getCurrentLocalTimeHHMM,
  getEthiopianDaysInMonth,
  getTimeOffsetMinutes,
  getTodayIsoDate,
  setTimeOffsetMinutes
} from '../utils/ethiopianDate';

interface DualDateBadgeProps {
  value?: string | Date | null;
  mode?: 'inline' | 'stacked' | 'pill';
  showTime?: boolean;
  showMonthName?: boolean;
  fallback?: string;
  className?: string;
}

export const DualDateBadge: React.FC<DualDateBadgeProps> = ({
  value,
  mode = 'stacked',
  showTime = false,
  showMonthName = false,
  fallback = '—',
  className = ''
}) => {
  const { lang } = useLanguage();
  const dual = formatDualDate(value);

  if (!dual) {
    if (typeof value === 'string' && value.trim()) {
      return <span className={`font-mono ${className}`}>{value.trim()}</span>;
    }
    return <span className={`text-slate-400 ${className}`}>{fallback}</span>;
  }

  const monthName = lang === 'en' ? dual.ethMonthEn : dual.ethMonthAm;
  const shouldShowTime = showTime && dual.hasTime && dual.time;
  const ethTimePart = shouldShowTime && dual.time ? ` · ${dual.time.ethTimeShort}` : '';
  const stdTimePart = shouldShowTime && dual.time ? ` · ${dual.time.stdTime12}` : '';

  if (mode === 'pill') {
    return (
      <span
        className={`inline-flex flex-wrap items-center gap-1.5 text-[11px] font-bold tabular-nums ${className}`}
      >
        <Calendar className="w-3.5 h-3.5 shrink-0 opacity-80" />
        <span>
          {dual.ethWithEra}
          {showMonthName ? ` (${monthName} ${dual.eth.day})` : ''}
          {ethTimePart}
        </span>
        <span className="opacity-50">|</span>
        <span>
          {dual.gregNumeric}
          {stdTimePart}
        </span>
      </span>
    );
  }

  if (mode === 'inline') {
    return (
      <span className={`inline-flex flex-wrap items-center gap-1 tabular-nums ${className}`}>
        <span className="font-bold">
          {dual.ethWithEra}
          {showMonthName ? ` (${monthName})` : ''}
          {ethTimePart}
        </span>
        <span className="text-slate-400">·</span>
        <span className="font-mono text-slate-600">
          {dual.gregNumeric}
          {stdTimePart}
        </span>
      </span>
    );
  }

  // stacked (compact two-line table cell friendly)
  return (
    <div className={`inline-flex flex-col leading-tight tabular-nums ${className}`}>
      <span className="font-bold text-slate-800 whitespace-nowrap">
        {dual.ethWithEra}
        {shouldShowTime && dual.time && (
          <span className="ml-1 text-[10px] font-semibold text-amber-800">
            ({dual.time.ethTimeShort})
          </span>
        )}
      </span>
      <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
        {dual.gregNumeric}
        {stdTimePart}
      </span>
    </div>
  );
};

function formatOffsetBadge(mins: number): string {
  if (mins === 0) return '0:00';
  const sign = mins > 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

interface DualLiveClockProps {
  variant?: 'header' | 'login';
  className?: string;
}

export const DualLiveClock: React.FC<DualLiveClockProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { lang, t } = useLanguage();
  const [now, setNow] = useState<Date>(() => new Date());
  const [offsetMinutes, setOffsetMinutes] = useState<number>(() => getTimeOffsetMinutes());
  const [showCalibrator, setShowCalibrator] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    const handleOffsetChange = (e: Event) => {
      const custom = e as CustomEvent<number>;
      if (typeof custom.detail === 'number') {
        setOffsetMinutes(custom.detail);
      } else {
        setOffsetMinutes(getTimeOffsetMinutes());
      }
    };
    window.addEventListener(TIME_OFFSET_EVENT, handleOffsetChange);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(TIME_OFFSET_EVENT, handleOffsetChange);
    };
  }, []);

  useEffect(() => {
    if (!showCalibrator) return;
    const handleOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setShowCalibrator(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showCalibrator]);

  const adjustedNow = applyTimeOffsetToDate(now, offsetMinutes);
  const dual = formatDualDate(adjustedNow)!;
  const tm = dual.time!;

  const updateOffset = (next: number) => {
    setOffsetMinutes(next);
    setTimeOffsetMinutes(next);
  };

  const renderCalibratorPopover = () => {
    if (!showCalibrator) return null;
    return (
      <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 p-3 text-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span className="font-extrabold text-slate-900">
            {t('የሰዓት ማስተካከያ', 'Clock Adjustment')}
          </span>
          <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
            {formatOffsetBadge(offsetMinutes)}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => updateOffset(offsetMinutes - 60)}
            className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 cursor-pointer"
          >
            -1 ሰዓት
          </button>
          <button
            type="button"
            onClick={() => updateOffset(offsetMinutes - 30)}
            className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 cursor-pointer"
          >
            -30 ደ
          </button>
          <button
            type="button"
            onClick={() => updateOffset(offsetMinutes + 30)}
            className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 cursor-pointer"
          >
            +30 ደ
          </button>
          <button
            type="button"
            onClick={() => updateOffset(offsetMinutes + 60)}
            className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 cursor-pointer"
          >
            +1 ሰዓት
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => updateOffset(DEFAULT_TIME_OFFSET_MINUTES)}
            className="flex-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-[11px] cursor-pointer"
          >
            {t('ነባሪ (-1:00)', 'Default (-1:00)')}
          </button>
          <button
            type="button"
            onClick={() => updateOffset(0)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
          >
            0:00
          </button>
        </div>
      </div>
    );
  };

  if (variant === 'login') {
    return (
      <div ref={containerRef} className={`relative mt-2 inline-block ${className}`}>
        <div
          className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[11px] font-bold text-amber-200 tabular-nums"
          title={t('የዛሬ ቀን እና ሰዓት (በኢትዮጵያና በግርጎሪያን)', "Today's Date & Live Time (Ethiopian & Standard)")}
        >
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-white">{dual.ethWithEra}</span>
            <span className="text-amber-300/90">
              ({lang === 'en' ? dual.ethMonthEn : dual.ethMonthAm} {dual.eth.day})
            </span>
            <span className="text-white/40">|</span>
            <span className="text-sky-200 font-mono">{dual.gregNumeric}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 border-l border-white/20 pl-2.5">
            <Clock className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="text-emerald-200">{tm.ethTimeWithSeconds}</span>
            <span className="text-white/40">·</span>
            <span className="text-sky-100 font-mono">{tm.stdTime12WithSeconds}</span>
            <button
              type="button"
              onClick={() => setShowCalibrator((v) => !v)}
              className="ml-0.5 p-0.5 rounded hover:bg-white/15 text-amber-200/80 hover:text-white cursor-pointer"
              title={t('ሰዓት አስተካክል', 'Adjust Clock')}
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          </span>
        </div>
        {renderCalibratorPopover()}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-amber-200 text-[11px] font-bold tabular-nums"
        title={t('የዛሬ ቀን እና የቀጥታ ሰዓት (ኢትዮጵያና ግርጎሪያን)', "Today's Date & Live Time (Ethiopian & Gregorian)")}
      >
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>{t('ዛሬ፦', 'Today:')}</span>
          <span className="text-white">{dual.ethWithEra}</span>
          <span className="text-amber-300/90">
            ({lang === 'en' ? dual.ethMonthEn : dual.ethMonthAm} {dual.eth.day})
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-sky-200 font-mono">{dual.gregNumeric}</span>
        </span>

        <span className="inline-flex items-center gap-1.5 sm:border-l sm:border-slate-600 sm:pl-2.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-emerald-300">{tm.ethTimeWithSeconds}</span>
          <span className="text-slate-500">·</span>
          <span className="text-sky-100 font-mono">{tm.stdTime12WithSeconds}</span>
          <button
            type="button"
            onClick={() => setShowCalibrator((v) => !v)}
            className="ml-0.5 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-200 cursor-pointer"
            title={t('ሰዓት አስተካክል', 'Adjust Clock')}
          >
            <SlidersHorizontal className="w-3 h-3" />
          </button>
        </span>
      </div>
      {renderCalibratorPopover()}
    </div>
  );
};

// Ordered 24 Ethiopian clock hours for bidirectional Ethiopian <-> Standard time selector
const ETHIOPIAN_HOUR_OPTIONS: {
  hour24: number;
  ethHour12: number;
  periodAm: 'ጠዋት' | 'ከሰዓት' | 'ምሽት' | 'ሌሊት';
}[] = [
  ...Array.from({ length: 6 }, (_, i) => ({
    hour24: 6 + i,
    ethHour12: i === 0 ? 12 : i,
    periodAm: 'ጠዋት' as const
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    hour24: 12 + i,
    ethHour12: 6 + i,
    periodAm: 'ከሰዓት' as const
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    hour24: 18 + i,
    ethHour12: i === 0 ? 12 : i,
    periodAm: 'ምሽት' as const
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    hour24: i,
    ethHour12: 6 + i,
    periodAm: 'ሌሊት' as const
  }))
];

interface DualDateInputProps {
  value: string;
  onChange: (isoValue: string) => void;
  required?: boolean;
  dark?: boolean;
  compact?: boolean;
  includeTime?: boolean;
  className?: string;
  id?: string;
}

export const DualDateInput: React.FC<DualDateInputProps> = ({
  value,
  onChange,
  required = false,
  dark = false,
  compact = false,
  includeTime = false,
  className = '',
  id
}) => {
  const { lang, t } = useLanguage();
  const effectiveIso = value || getTodayIsoDate();
  const dual = formatDualDate(effectiveIso) || formatDualDate(getTodayIsoDate())!;
  const isoDateOnly = dual.gregIso;
  const activeTime = dual.time;
  const timeHHMM = dual.hasTime && activeTime ? activeTime.stdTime24 : getCurrentLocalTimeHHMM();

  const [ethYearDraft, setEthYearDraft] = useState<string>(String(dual.eth.year));

  useEffect(() => {
    const parsed = formatDualDate(value);
    if (parsed) {
      setEthYearDraft(String(parsed.eth.year));
    }
  }, [value]);

  const maxEthDays = getEthiopianDaysInMonth(dual.eth.year, dual.eth.month);

  const emitDateChange = (nextDateIso: string, nextTimeHHMM?: string) => {
    if (!includeTime) {
      onChange(nextDateIso);
      return;
    }
    const resolvedTime = nextTimeHHMM ?? (dual.hasTime ? timeHHMM : '');
    onChange(resolvedTime ? `${nextDateIso}T${resolvedTime}` : nextDateIso);
  };

  const handleEthChange = (nextYear: number, nextMonth: number, nextDay: number) => {
    const safeYear = Math.max(1900, Math.min(2200, nextYear));
    const safeMonth = Math.max(1, Math.min(13, nextMonth));
    const safeMaxDay = getEthiopianDaysInMonth(safeYear, safeMonth);
    const safeDay = Math.max(1, Math.min(safeMaxDay, nextDay));
    emitDateChange(ethiopianToIso(safeYear, safeMonth, safeDay));
  };

  const handleTimeChange = (nextHour24: number, nextMinute: number) => {
    const tParts = formatDualTimeParts(nextHour24, nextMinute, 0);
    emitDateChange(isoDateOnly, tParts.stdTime24);
  };

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        {/* Ethiopian Quick Selector */}
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold tabular-nums ${
            dark
              ? 'bg-slate-800/90 border-white/20 text-white'
              : 'bg-amber-50/70 border-amber-200 text-slate-800'
          }`}
          title={t('የኢትዮጵያ ቀን አቆጣጠር (ዓ/ም)', 'Ethiopian Calendar (E.C.)')}
        >
          <span className={dark ? 'text-amber-300 text-[10px]' : 'text-amber-700 text-[10px]'}>
            ዓ/ም:
          </span>
          <select
            aria-label={t('የኢትዮጵያ ቀን', 'Ethiopian Day')}
            value={dual.eth.day}
            onChange={(e) =>
              handleEthChange(dual.eth.year, dual.eth.month, parseInt(e.target.value, 10))
            }
            className={`rounded px-1 py-0.5 text-[11px] font-bold focus:outline-none cursor-pointer ${
              dark ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-900'
            }`}
          >
            {Array.from({ length: maxEthDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            aria-label={t('የኢትዮጵያ ወር', 'Ethiopian Month')}
            value={dual.eth.month}
            onChange={(e) =>
              handleEthChange(dual.eth.year, parseInt(e.target.value, 10), dual.eth.day)
            }
            className={`rounded px-1 py-0.5 text-[11px] font-bold focus:outline-none cursor-pointer ${
              dark ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-900'
            }`}
          >
            {(lang === 'en' ? ETHIOPIAN_MONTHS_EN : ETHIOPIAN_MONTHS_AM).map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
          <input
            aria-label={t('የኢትዮጵያ ዓመት', 'Ethiopian Year')}
            type="number"
            min={1900}
            max={2150}
            value={ethYearDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setEthYearDraft(raw);
              const parsed = parseInt(raw, 10);
              if (!Number.isNaN(parsed) && parsed >= 1900 && parsed <= 2150) {
                handleEthChange(parsed, dual.eth.month, dual.eth.day);
              }
            }}
            onBlur={() => {
              setEthYearDraft(String(dual.eth.year));
            }}
            className={`w-14 rounded px-1 py-0.5 text-[11px] font-bold text-center focus:outline-none ${
              dark ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-900'
            }`}
          />
        </div>

        {/* Gregorian Picker */}
        <input
          id={id}
          type="date"
          required={required}
          value={value ? isoDateOnly : ''}
          onChange={(e) => emitDateChange(e.target.value)}
          aria-label={t('ግርጎሪያን ቀን', 'Gregorian Date')}
          className={`rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
            dark
              ? 'bg-slate-800 text-white border border-white/20'
              : 'bg-slate-50 border border-slate-300 text-slate-800'
          }`}
        />
      </div>
    );
  }

  const displayTimeParts = activeTime || formatDualTimeParts(
    parseInt(timeHHMM.split(':')[0] || '9', 10),
    parseInt(timeHHMM.split(':')[1] || '0', 10),
    0
  );

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 space-y-2 ${className}`}
    >
      {/* Row 1: Ethiopian Calendar Selector */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-800">
          <span>{t('በኢትዮጵያ ዘመን አቆጣጠር (ዓ/ም)', 'Ethiopian Calendar (E.C.)')}</span>
          <span className="font-mono text-slate-600 tabular-nums">{dual.ethWithEra}</span>
        </div>
        <div className="grid grid-cols-12 gap-1.5">
          <select
            aria-label={t('ቀን (ዓ/ም)', 'Ethiopian Day')}
            value={dual.eth.day}
            onChange={(e) =>
              handleEthChange(dual.eth.year, dual.eth.month, parseInt(e.target.value, 10))
            }
            className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-900 cursor-pointer"
          >
            {Array.from({ length: maxEthDays }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            aria-label={t('ወር (ዓ/ም)', 'Ethiopian Month')}
            value={dual.eth.month}
            onChange={(e) =>
              handleEthChange(dual.eth.year, parseInt(e.target.value, 10), dual.eth.day)
            }
            className="col-span-5 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-900 cursor-pointer"
          >
            {(lang === 'en' ? ETHIOPIAN_MONTHS_EN : ETHIOPIAN_MONTHS_AM).map((name, idx) => (
              <option key={name} value={idx + 1}>
                {idx + 1}. {name}
              </option>
            ))}
          </select>
          <input
            aria-label={t('ዓመት (ዓ/ም)', 'Ethiopian Year')}
            type="number"
            min={1900}
            max={2150}
            value={ethYearDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setEthYearDraft(raw);
              const parsed = parseInt(raw, 10);
              if (!Number.isNaN(parsed) && parsed >= 1900 && parsed <= 2150) {
                handleEthChange(parsed, dual.eth.month, dual.eth.day);
              }
            }}
            onBlur={() => setEthYearDraft(String(dual.eth.year))}
            className="col-span-4 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-900 text-center tabular-nums"
          />
        </div>
      </div>

      {/* Row 2: Gregorian Calendar Selector */}
      <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold text-blue-900 shrink-0">
          {t('ግርጎሪያን (Gregorian):', 'Gregorian:')}
        </span>
        <input
          id={id}
          type="date"
          required={required}
          value={value ? isoDateOnly : ''}
          onChange={(e) => emitDateChange(e.target.value)}
          className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white text-xs font-mono font-bold text-slate-800"
        />
      </div>

      {/* Row 3 (Optional): Bidirectional Ethiopian Time & Standard Time */}
      {includeTime && (
        <div className="pt-1.5 border-t border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-800">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{t('ሰዓት (ኢትዮጵያ & መደበኛ)', 'Time (Ethiopian & Standard)')}</span>
            </span>
            <span className="tabular-nums text-slate-700">
              {displayTimeParts.ethTimeShort} · {displayTimeParts.stdTime12}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label={t('የኢትዮጵያ ሰዓት', 'Ethiopian Hour')}
              value={displayTimeParts.hour24}
              onChange={(e) =>
                handleTimeChange(parseInt(e.target.value, 10), displayTimeParts.minute)
              }
              className="flex-1 min-w-[115px] px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px] font-bold text-slate-900 cursor-pointer"
            >
              {ETHIOPIAN_HOUR_OPTIONS.map((opt) => (
                <option key={opt.hour24} value={opt.hour24}>
                  {opt.ethHour12} {opt.periodAm}
                </option>
              ))}
            </select>
            <select
              aria-label={t('ደቂቃ', 'Minute')}
              value={displayTimeParts.minute}
              onChange={(e) =>
                handleTimeChange(displayTimeParts.hour24, parseInt(e.target.value, 10))
              }
              className="w-16 px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px] font-bold text-slate-900 cursor-pointer tabular-nums"
            >
              {Array.from({ length: 60 }, (_, m) => m).map((m) => (
                <option key={m} value={m}>
                  :{String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
            <input
              type="time"
              aria-label={t('መደበኛ ሰዓት', 'Standard Time')}
              value={displayTimeParts.stdTime24}
              onChange={(e) => {
                if (!e.target.value) return;
                const [hh, mm] = e.target.value.split(':');
                handleTimeChange(parseInt(hh || '0', 10), parseInt(mm || '0', 10));
              }}
              className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px] font-mono font-bold text-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
