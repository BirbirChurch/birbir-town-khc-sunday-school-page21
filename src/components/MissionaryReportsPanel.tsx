import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit2,
  Globe,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
  ArrowUpRight
} from 'lucide-react';
import {
  EvangelismActivityMetrics,
  EvangelismMissionaryRecord,
  GenderCountPair,
  MissionaryQuarterlyReportRecord,
  MissionaryScope
} from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { formatDualDateTimeText, getAdjustedNow } from '../utils/ethiopianDate';
import { useLanguage } from '../context/LanguageContext';
import { ExportPhotoButton } from './ExportPhotoButton';

export type EvangelismActivityKey = keyof EvangelismActivityMetrics;
export type QuarterKey = 'q1' | 'q2' | 'q3' | 'q4';
export type ReportPeriodKey = QuarterKey | 'h1' | 'h2' | 'year';

export const ACTIVITY_DEFINITIONS: readonly {
  key: EvangelismActivityKey;
  labelAm: string;
  shortAm: string;
  labelEn: string;
  shortEn: string;
  accentClass: string;
  badgeClass: string;
}[] = [
  {
    key: 'witnessed',
    labelAm: 'ወንጌል የተመሰከረላቸው',
    shortAm: 'ወንጌል የተመሰከረላቸው',
    labelEn: 'Gospel Witnessed',
    shortEn: 'Witnessed',
    accentClass: 'text-blue-900',
    badgeClass: 'bg-blue-50 border-blue-200 text-blue-900'
  },
  {
    key: 'saved',
    labelAm: 'የዳኑ ሰዎች',
    shortAm: 'የዳኑ ሰዎች',
    labelEn: 'Saved Souls',
    shortEn: 'Saved',
    accentClass: 'text-emerald-800',
    badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-900'
  },
  {
    key: 'repented',
    labelAm: 'በንስሐ የተመለሱ',
    shortAm: 'በንስሐ የተመለሱ',
    labelEn: 'Repented & Returned',
    shortEn: 'Repented',
    accentClass: 'text-amber-800',
    badgeClass: 'bg-amber-50 border-amber-200 text-amber-900'
  },
  {
    key: 'baptized',
    labelAm: 'የተጠመቁ ሰዎች',
    shortAm: 'የተጠመቁ ሰዎች',
    labelEn: 'Baptized People',
    shortEn: 'Baptized',
    accentClass: 'text-indigo-900',
    badgeClass: 'bg-indigo-50 border-indigo-200 text-indigo-900'
  },
  {
    key: 'discipleship',
    labelAm: 'የደቀመዝሙርነት ትምህርት የተማሩ ሰዎች',
    shortAm: 'ደቀመዝሙርነት ትምህርት',
    labelEn: 'Discipleship Trained',
    shortEn: 'Discipleship',
    accentClass: 'text-purple-900',
    badgeClass: 'bg-purple-50 border-purple-200 text-purple-900'
  }
];

export const PERIOD_OPTIONS: readonly {
  key: ReportPeriodKey;
  labelAm: string;
  labelEn: string;
  shortAm: string;
}[] = [
  { key: 'year', labelAm: 'ሙሉ 1 ዓመት (ሐምሌ–ሰኔ / Q1–Q4)', labelEn: 'Full Year (Hamle–Sene / Q1–Q4)', shortAm: '1 ዓመት' },
  { key: 'h1', labelAm: '1ኛ ግማሽ ዓመት (ሐምሌ–ታኅሣሥ)', labelEn: '1st Half-Year (Hamle–Tahsas)', shortAm: '1ኛ ግማሽ ዓመት' },
  { key: 'h2', labelAm: '2ኛ ግማሽ ዓመት (ጥር–ሰኔ)', labelEn: '2nd Half-Year (Tir–Sene)', shortAm: '2ኛ ግማሽ ዓመት' },
  { key: 'q1', labelAm: '1ኛ ሩብ ዓመት (ሐምሌ–መስከረም)', labelEn: '1st Quarter (Hamle–Meskerem)', shortAm: '1ኛ ሩብ' },
  { key: 'q2', labelAm: '2ኛ ሩብ ዓመት (ጥቅምት–ታኅሣሥ)', labelEn: '2nd Quarter (Tikimt–Tahsas)', shortAm: '2ኛ ሩብ' },
  { key: 'q3', labelAm: '3ኛ ሩብ ዓመት (ጥር–መጋቢት)', labelEn: '3rd Quarter (Tir–Megabit)', shortAm: '3ኛ ሩብ' },
  { key: 'q4', labelAm: '4ኛ ሩብ ዓመት (ሚያዝያ–ሰኔ)', labelEn: '4th Quarter (Miyazya–Sene)', shortAm: '4ኛ ሩብ' }
];

const SCOPE_LABELS: Record<MissionaryScope, { am: string; en: string }> = {
  international: { am: 'አለም አቀፋዊ', en: 'International' },
  national: { am: 'አገር አቀፋዊ', en: 'National' },
  regional: { am: 'ክልላዊ', en: 'Regional' },
  local: { am: 'አከባቢያዊ', en: 'Local' }
};

const safeNonNegInt = (val: unknown): number => {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
};

export function createEmptyGenderPair(): GenderCountPair {
  return { male: 0, female: 0 };
}

export function createEmptyEvangelismMetrics(): EvangelismActivityMetrics {
  return {
    witnessed: createEmptyGenderPair(),
    saved: createEmptyGenderPair(),
    repented: createEmptyGenderPair(),
    baptized: createEmptyGenderPair(),
    discipleship: createEmptyGenderPair()
  };
}

export function normalizeEvangelismMetrics(
  metrics?: Partial<EvangelismActivityMetrics> | null
): EvangelismActivityMetrics {
  const empty = createEmptyEvangelismMetrics();
  if (!metrics) return empty;
  for (const def of ACTIVITY_DEFINITIONS) {
    const pair = metrics[def.key];
    empty[def.key] = {
      male: safeNonNegInt(pair?.male),
      female: safeNonNegInt(pair?.female)
    };
  }
  return empty;
}

export function sumMetricsList(list: (Partial<EvangelismActivityMetrics> | undefined | null)[]): EvangelismActivityMetrics {
  const acc = createEmptyEvangelismMetrics();
  for (const item of list) {
    if (!item) continue;
    for (const def of ACTIVITY_DEFINITIONS) {
      const pair = item[def.key];
      if (!pair) continue;
      acc[def.key].male += safeNonNegInt(pair.male);
      acc[def.key].female += safeNonNegInt(pair.female);
    }
  }
  return acc;
}

export function getPeriodMetrics(
  report: Pick<MissionaryQuarterlyReportRecord, 'q1' | 'q2' | 'q3' | 'q4'>,
  period: ReportPeriodKey
): EvangelismActivityMetrics {
  const q1 = normalizeEvangelismMetrics(report.q1);
  const q2 = normalizeEvangelismMetrics(report.q2);
  const q3 = normalizeEvangelismMetrics(report.q3);
  const q4 = normalizeEvangelismMetrics(report.q4);

  switch (period) {
    case 'q1':
      return q1;
    case 'q2':
      return q2;
    case 'q3':
      return q3;
    case 'q4':
      return q4;
    case 'h1':
      return sumMetricsList([q1, q2]);
    case 'h2':
      return sumMetricsList([q3, q4]);
    case 'year':
    default:
      return sumMetricsList([q1, q2, q3, q4]);
  }
}

export function getPairTotal(pair?: GenderCountPair | null): number {
  if (!pair) return 0;
  return safeNonNegInt(pair.male) + safeNonNegInt(pair.female);
}

export function getAvailableReportYears(
  currentYear: string,
  reports: MissionaryQuarterlyReportRecord[],
  extraMaxYear = 2030
): string[] {
  const curNum = parseInt(currentYear, 10);
  const reportYearNums = reports
    .map((r) => parseInt(String(r.year || ''), 10))
    .filter((n) => Number.isFinite(n) && n >= 2019);

  const maxYear = Math.max(
    2030,
    extraMaxYear,
    Number.isFinite(curNum) && curNum >= 2019 ? curNum + 3 : 2019,
    ...reportYearNums.map((n) => n + 1)
  );

  const out: string[] = [];
  for (let y = 2019; y <= maxYear; y++) {
    out.push(String(y));
  }
  return out;
}

interface MissionaryReportsPanelProps {
  currentYear: string;
  missionaries: EvangelismMissionaryRecord[];
  reports: MissionaryQuarterlyReportRecord[];
  readOnly?: boolean;
  viewerContextLabel?: string;
  onSaveReports?: (next: MissionaryQuarterlyReportRecord[]) => void;
  onOpenEvangelismUnit?: () => void;
}

export const MissionaryReportsPanel: React.FC<MissionaryReportsPanelProps> = ({
  currentYear,
  missionaries,
  reports,
  readOnly = false,
  viewerContextLabel,
  onSaveReports,
  onOpenEvangelismUnit
}) => {
  const { t, lang } = useLanguage();
  const [maxYearBound, setMaxYearBound] = useState<number>(2030);

  const defaultSelectedYear = useMemo(() => {
    const parsed = parseInt(currentYear, 10);
    return Number.isFinite(parsed) && parsed >= 2019 ? String(parsed) : '2019';
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState<string>(defaultSelectedYear);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodKey>('year');
  const [scopeFilter, setScopeFilter] = useState<'all' | MissionaryScope>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Modal state (Edit / Add Missionary Report)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [formYear, setFormYear] = useState<string>(defaultSelectedYear);
  const [formMissionaryId, setFormMissionaryId] = useState<string>('');
  const [formMissionaryName, setFormMissionaryName] = useState('');
  const [formScope, setFormScope] = useState<MissionaryScope>('local');
  const [formMissionField, setFormMissionField] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [activeQuarterTab, setActiveQuarterTab] = useState<QuarterKey>('q1');
  const [formQ1, setFormQ1] = useState<EvangelismActivityMetrics>(() => createEmptyEvangelismMetrics());
  const [formQ2, setFormQ2] = useState<EvangelismActivityMetrics>(() => createEmptyEvangelismMetrics());
  const [formQ3, setFormQ3] = useState<EvangelismActivityMetrics>(() => createEmptyEvangelismMetrics());
  const [formQ4, setFormQ4] = useState<EvangelismActivityMetrics>(() => createEmptyEvangelismMetrics());

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 5000);
  };

  const yearOptions = useMemo(
    () => getAvailableReportYears(currentYear, reports, maxYearBound),
    [currentYear, reports, maxYearBound]
  );

  const yearReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports
      .filter((r) => String(r.year) === String(selectedYear))
      .filter((r) => {
        if (scopeFilter !== 'all' && (r.scope || 'local') !== scopeFilter) return false;
        if (!q) return true;
        return (
          r.missionaryName.toLowerCase().includes(q) ||
          (r.missionField || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.missionaryName.localeCompare(b.missionaryName, 'am'));
  }, [reports, selectedYear, scopeFilter, searchQuery]);

  // All reports for selected year (unfiltered by search/scope if needed, wait: matrix summarizes currently filtered yearReports so filters work cohesively!)
  const periodMatrixTotals = useMemo(() => {
    const periods: ReportPeriodKey[] = ['q1', 'q2', 'h1', 'q3', 'q4', 'h2', 'year'];
    const map = {} as Record<ReportPeriodKey, EvangelismActivityMetrics>;
    for (const p of periods) {
      map[p] = sumMetricsList(yearReports.map((r) => getPeriodMetrics(r, p)));
    }
    return map;
  }, [yearReports]);

  const activePeriodTotals = periodMatrixTotals[selectedPeriod];

  const handleAddNextYear = () => {
    const last = parseInt(yearOptions[yearOptions.length - 1] || '2030', 10) || 2030;
    const next = last + 1;
    setMaxYearBound(next);
    setSelectedYear(String(next));
    showNotice(
      t(
        `✓ ${next} ዓ/ም ወደ የሚሽነሪዎች ሪፖርት ዓመታት ተጨምሯል።`,
        `Added ${next} E.C. to missionary report years.`
      )
    );
  };

  const handleSyncMissionariesForYear = () => {
    if (readOnly || !onSaveReports) return;
    if (missionaries.length === 0) {
      showNotice(
        t(
          'በመጀመሪያ በ"ሚሽነሪዎች" ትር ውስጥ የሚሽነሪዎችን ስም ይመዝግቡ ወይም "+ አዲስ ሪፖርት" ይጫኑ።',
          'Register missionaries in the Missionaries tab first or click "+ Add Report".'
        )
      );
      return;
    }

    const existingForYear = reports.filter((r) => String(r.year) === String(selectedYear));
    const existingIds = new Set(
      existingForYear.map((r) => r.missionaryId).filter((id): id is number => id !== undefined)
    );
    const existingNames = new Set(existingForYear.map((r) => r.missionaryName.trim()));

    const toInsert: MissionaryQuarterlyReportRecord[] = [];
    missionaries.forEach((m) => {
      const cleanName = m.name.trim();
      if (!cleanName) return;
      if (existingIds.has(m.id) || existingNames.has(cleanName)) return;
      existingIds.add(m.id);
      existingNames.add(cleanName);
      toInsert.push({
        id: generateUniqueId(),
        year: selectedYear,
        missionaryId: m.id,
        missionaryName: cleanName,
        scope: m.scope,
        missionField: m.missionField,
        q1: createEmptyEvangelismMetrics(),
        q2: createEmptyEvangelismMetrics(),
        q3: createEmptyEvangelismMetrics(),
        q4: createEmptyEvangelismMetrics(),
        updatedAt: new Date().toISOString()
      });
    });

    if (toInsert.length === 0) {
      showNotice(
        t(
          `ሁሉም የተመዘገቡ ሚሽነሪዎች (${missionaries.length}) ለ${selectedYear} ዓ/ም ቀድሞውኑ ተካተዋል።`,
          `All ${missionaries.length} missionaries are already included for ${selectedYear}.`
        )
      );
      return;
    }

    onSaveReports([...reports, ...toInsert]);
    showNotice(
      t(
        `✓ ${toInsert.length} ሚሽነሪዎች ለ${selectedYear} ዓ/ም ሪፖርት መሙያ ዝርዝር ገብተዋል!`,
        `Synced ${toInsert.length} missionaries into ${selectedYear} report list!`
      )
    );
  };

  const openAddModal = () => {
    if (readOnly) return;
    setEditingReportId(null);
    setFormYear(selectedYear);
    setFormMissionaryId('');
    setFormMissionaryName('');
    setFormScope('local');
    setFormMissionField('');
    setFormNotes('');
    setActiveQuarterTab('q1');
    setFormQ1(createEmptyEvangelismMetrics());
    setFormQ2(createEmptyEvangelismMetrics());
    setFormQ3(createEmptyEvangelismMetrics());
    setFormQ4(createEmptyEvangelismMetrics());
    setIsModalOpen(true);
  };

  const openEditModal = (rec: MissionaryQuarterlyReportRecord) => {
    if (readOnly) return;
    setEditingReportId(rec.id);
    setFormYear(String(rec.year || selectedYear));
    setFormMissionaryId(rec.missionaryId ? String(rec.missionaryId) : '');
    setFormMissionaryName(rec.missionaryName);
    setFormScope(rec.scope || 'local');
    setFormMissionField(rec.missionField || '');
    setFormNotes(rec.notes || '');
    setActiveQuarterTab('q1');
    setFormQ1(normalizeEvangelismMetrics(rec.q1));
    setFormQ2(normalizeEvangelismMetrics(rec.q2));
    setFormQ3(normalizeEvangelismMetrics(rec.q3));
    setFormQ4(normalizeEvangelismMetrics(rec.q4));
    setIsModalOpen(true);
  };

  const handleSelectPresetMissionary = (val: string) => {
    setFormMissionaryId(val);
    const idNum = parseInt(val, 10);
    const matched = missionaries.find((m) => m.id === idNum);
    if (matched) {
      setFormMissionaryName(matched.name);
      setFormScope(matched.scope);
      setFormMissionField(matched.missionField || '');
    }
  };

  const getQuarterSetter = (q: QuarterKey) => {
    if (q === 'q1') return { data: formQ1, set: setFormQ1 };
    if (q === 'q2') return { data: formQ2, set: setFormQ2 };
    if (q === 'q3') return { data: formQ3, set: setFormQ3 };
    return { data: formQ4, set: setFormQ4 };
  };

  const updateQuarterCell = (
    quarter: QuarterKey,
    actKey: EvangelismActivityKey,
    genderField: 'male' | 'female',
    rawVal: string
  ) => {
    const parsed = rawVal === '' ? 0 : safeNonNegInt(parseInt(rawVal, 10));
    const { set } = getQuarterSetter(quarter);
    set((prev) => ({
      ...prev,
      [actKey]: {
        ...prev[actKey],
        [genderField]: parsed
      }
    }));
  };

  const modalSummaries = useMemo(() => {
    return {
      h1: sumMetricsList([formQ1, formQ2]),
      h2: sumMetricsList([formQ3, formQ4]),
      year: sumMetricsList([formQ1, formQ2, formQ3, formQ4])
    };
  }, [formQ1, formQ2, formQ3, formQ4]);

  const handleSaveReportModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !onSaveReports || !formMissionaryName.trim()) return;

    const record: MissionaryQuarterlyReportRecord = {
      id: editingReportId ?? generateUniqueId(),
      year: formYear,
      missionaryId: formMissionaryId ? parseInt(formMissionaryId, 10) : undefined,
      missionaryName: formMissionaryName.trim(),
      scope: formScope,
      missionField: formMissionField.trim() || undefined,
      q1: normalizeEvangelismMetrics(formQ1),
      q2: normalizeEvangelismMetrics(formQ2),
      q3: normalizeEvangelismMetrics(formQ3),
      q4: normalizeEvangelismMetrics(formQ4),
      notes: formNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    const next = editingReportId
      ? reports.map((r) => (r.id === editingReportId ? record : r))
      : [...reports, record];

    onSaveReports(next);
    setSelectedYear(formYear);
    setIsModalOpen(false);
    showNotice(
      t(
        `✓ የ"${record.missionaryName}" (${record.year} ዓ/ም) የሚሽነሪ ሪፖርት ተቀምጧል!`,
        `Saved missionary report for "${record.missionaryName}" (${record.year})!`
      )
    );
  };

  const handleConfirmDelete = (id: number) => {
    if (readOnly || !onSaveReports) return;
    onSaveReports(reports.filter((r) => r.id !== id));
    setPendingDeleteId(null);
    showNotice(t('✓ የሚሽነሪ ሪፖርት ተሰርዟል።', 'Missionary report removed.'));
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const periodLabel = PERIOD_OPTIONS.find((p) => p.key === selectedPeriod)?.labelAm || selectedPeriod;

    // Sheet 1: Full Quarter -> Half Year -> Annual Summary Matrix
    const matrixHeaders = [
      'ክፍለ ጊዜ (ሩብ / ግማሽ / ዓመት)',
      ...ACTIVITY_DEFINITIONS.flatMap((d) => [
        `${d.shortAm} (ወንድ)`,
        `${d.shortAm} (ሴት)`,
        `${d.shortAm} (ድምር)`
      ])
    ];
    const matrixPeriods: { key: ReportPeriodKey; label: string }[] = [
      { key: 'q1', label: '1ኛ ሩብ ዓመት' },
      { key: 'q2', label: '2ኛ ሩብ ዓመት' },
      { key: 'h1', label: '1ኛ ግማሽ ዓመት (1ኛ + 2ኛ ሩብ)' },
      { key: 'q3', label: '3ኛ ሩብ ዓመት' },
      { key: 'q4', label: '4ኛ ሩብ ዓመት' },
      { key: 'h2', label: '2ኛ ግማሽ ዓመት (3ኛ + 4ኛ ሩብ)' },
      { key: 'year', label: 'ሙሉ 1 ዓመት ድምር (1ኛ–4ኛ ሩብ)' }
    ];
    const matrixSheetRows = [
      [`የወንጌል አገልግሎት — የሚሽነሪዎች ሪፖርት ማጠቃለያ (${selectedYear} ዓ/ም)`],
      [`የተዘጋጀበት ጊዜ፦ ${formatDualDateTimeText(getAdjustedNow())} | የሚሽነሪዎች ብዛት፦ ${yearReports.length}`],
      [],
      matrixHeaders,
      ...matrixPeriods.map((mp) => {
        const m = periodMatrixTotals[mp.key];
        return [
          mp.label,
          ...ACTIVITY_DEFINITIONS.flatMap((d) => [
            m[d.key].male,
            m[d.key].female,
            getPairTotal(m[d.key])
          ])
        ];
      })
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrixSheetRows), `ማጠቃለያ_${selectedYear}`);

    // Sheet 2: Per-Missionary for currently selected Period
    const perMissionaryRows = [
      [`የሚሽነሪዎች ዝርዝር ሪፖርት — ${selectedYear} ዓ/ም (${periodLabel})`],
      [],
      [
        'ተ.ቁ',
        'የሚሽነሪ ስም',
        'ምድብ',
        'የአገልግሎት ቦታ',
        ...ACTIVITY_DEFINITIONS.flatMap((d) => [
          `${d.shortAm} (ወንድ)`,
          `${d.shortAm} (ሴት)`,
          `${d.shortAm} (ድምር)`
        ]),
        'ማስታወሻ'
      ],
      ...yearReports.map((r, i) => {
        const m = getPeriodMetrics(r, selectedPeriod);
        return [
          i + 1,
          r.missionaryName,
          SCOPE_LABELS[r.scope || 'local'].am,
          r.missionField || '-',
          ...ACTIVITY_DEFINITIONS.flatMap((d) => [
            m[d.key].male,
            m[d.key].female,
            getPairTotal(m[d.key])
          ]),
          r.notes || '-'
        ];
      }),
      [
        '',
        `ጠቅላላ ድምር (${yearReports.length} ሚሽነሪዎች)`,
        '',
        '',
        ...ACTIVITY_DEFINITIONS.flatMap((d) => [
          activePeriodTotals[d.key].male,
          activePeriodTotals[d.key].female,
          getPairTotal(activePeriodTotals[d.key])
        ]),
        ''
      ]
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(perMissionaryRows),
      `በሚሽነሪ_${selectedYear}`
    );

    // Sheet 3: All Quarters + Half-Years + Annual per Missionary (Long Form)
    const detailedHeaders = [
      'የሚሽነሪ ስም',
      'ምድብ',
      'ቦታ',
      'ክፍለ ጊዜ',
      ...ACTIVITY_DEFINITIONS.flatMap((d) => [
        `${d.shortAm} (ወንድ)`,
        `${d.shortAm} (ሴት)`,
        `${d.shortAm} (ድምር)`
      ])
    ];
    const detailedRows: (string | number)[][] = [
      [`የእያንዳንዱ ሚሽነሪ ሩብ ዓመት፣ ግማሽ ዓመት እና ዓመታዊ ሪፖርት — ${selectedYear} ዓ/ም`],
      [],
      detailedHeaders
    ];
    yearReports.forEach((r) => {
      matrixPeriods.forEach((mp) => {
        const m = getPeriodMetrics(r, mp.key);
        detailedRows.push([
          r.missionaryName,
          SCOPE_LABELS[r.scope || 'local'].am,
          r.missionField || '-',
          mp.label,
          ...ACTIVITY_DEFINITIONS.flatMap((d) => [
            m[d.key].male,
            m[d.key].female,
            getPairTotal(m[d.key])
          ])
        ]);
      });
    });
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(detailedRows),
      `ሙሉ_ሩብ_ዓመታት_${selectedYear}`
    );

    XLSX.writeFile(wb, `የሚሽነሪዎች_ሪፖርት_${selectedYear}.xlsx`);
  };

  const selectedPeriodLabel = useMemo(() => {
    const opt = PERIOD_OPTIONS.find((p) => p.key === selectedPeriod);
    if (!opt) return '';
    return lang === 'en' ? opt.labelEn : opt.labelAm;
  }, [selectedPeriod, lang]);

  const missionaryReportsExportRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={missionaryReportsExportRef} className="space-y-5">
      {/* Live Cross-Unit Sync Banner for Spiritual Council & Administration */}
      {readOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-extrabold text-blue-950 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                {t(
                  `ቀጥታ የሚታይ የሚሽነሪዎች ሪፖርት — ${viewerContextLabel || 'መንፈሳዊ ዘርፍ / አስተዳደር'}`,
                  `Live Missionaries Report Feed — ${viewerContextLabel || 'Spiritual / Admin View'}`
                )}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-blue-800">
              {t(
                'በወንጌል አገልግሎት ገጽ የሚሞሉ የየሚሽነሪው የ1ኛ–4ኛ ሩብ ዓመት፣ የግማሽ ዓመት እና የዓመት ሪፖርቶች እዚህ በቀጥታ ይታያሉ።',
                'Quarterly (Q1–Q4), half-year, and annual missionary reports entered in Evangelism appear live here.'
              )}
            </p>
          </div>
          {onOpenEvangelismUnit && (
            <button
              type="button"
              onClick={onOpenEvangelismUnit}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap w-full sm:w-auto print:hidden"
            >
              <span>{t('ወደ ወንጌል አገልግሎት ገጽ ሂድ', 'Open Evangelism Unit')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Header & Controls */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-blue-900 uppercase tracking-wide">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>{t('የወንጌል አገልግሎት የሚሽነሪዎች ሪፖርት (ከ2019 ዓ/ም ጀምሮ)', 'Evangelism Missionaries Report (2019 E.C. Onwards)')}</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
              {t(
                `${selectedYear} ዓ/ም — ${selectedPeriodLabel}`,
                `${selectedYear} E.C. — ${selectedPeriodLabel}`
              )}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {t(
                'ለእያንዳንዱ ሚሽነሪ ከ1ኛ እስከ 4ኛ ሩብ ዓመት፣ የ1ኛ/2ኛ ግማሽ ዓመት እና የሙሉ ዓመት ድምር (ወንድ · ሴት · ድምር)',
                'Per-missionary Q1–Q4 entry with automatic Half-Year and Full-Year totals (Male · Female · Total)'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={handleSyncMissionariesForYear}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition cursor-pointer whitespace-nowrap w-full sm:w-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {t(
                      `ከሚሽነሪዎች ዝርዝር አስገባ (${missionaries.length})`,
                      `Sync Missionaries (${missionaries.length})`
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer whitespace-nowrap w-full sm:w-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('ለሚሽነሪ ሪፖርት ጨምር / ሙላ', 'Add Missionary Report')}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer whitespace-nowrap w-full sm:w-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>
            <ExportPhotoButton
              targetRef={missionaryReportsExportRef}
              fileName={`የሚሽነሪዎች_ሪፖርት_${selectedYear}_${selectedPeriod}`}
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer whitespace-nowrap w-full sm:w-auto"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
          </div>
        </div>

        {/* Year, Period, Scope, Search Bar */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 print:hidden">
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label={t('ዓመተ ምሕረት ምረጥ', 'Select Year')}
                className="w-full pl-8 pr-3 py-2 text-xs font-extrabold border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {yearOptions.map((y) => {
                  const cnt = reports.filter((r) => String(r.year) === y).length;
                  return (
                    <option key={y} value={y}>
                      {y} ዓ/ም {cnt > 0 ? `(${cnt} ሪፖርት)` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddNextYear}
              title={t('ቀጣይ ዓመት ጨምር', 'Add Next Year')}
              className="px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 whitespace-nowrap cursor-pointer"
            >
              + ቀጣይ ዓመት
            </button>
          </div>

          <div className="lg:col-span-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriodKey)}
              aria-label={t('ክፍለ ጊዜ ምረጥ', 'Select Reporting Period')}
              className="w-full px-3 py-2 text-xs font-extrabold border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {lang === 'en' ? p.labelEn : p.labelAm}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'all' | MissionaryScope)}
              aria-label={t('የሚሽነሪ ምድብ', 'Missionary Scope')}
              className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:bg-white"
            >
              <option value="all">{t('ሁሉም ምድብ', 'All Scopes')}</option>
              <option value="international">{SCOPE_LABELS.international.am}</option>
              <option value="national">{SCOPE_LABELS.national.am}</option>
              <option value="regional">{SCOPE_LABELS.regional.am}</option>
              <option value="local">{SCOPE_LABELS.local.am}</option>
            </select>
          </div>

          <div className="lg:col-span-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('በሚሽነሪ ስም ወይም ቦታ ፈልግ...', 'Search missionary or field...')}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Quick Period Pill Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          {PERIOD_OPTIONS.map((p) => {
            const active = selectedPeriod === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedPeriod(p.key)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-blue-900 text-white'
                    : p.key === 'h1' || p.key === 'h2' || p.key === 'year'
                    ? 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang === 'en' ? p.labelEn : p.shortAm}
              </button>
            );
          })}
        </div>
      </section>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold text-emerald-900 flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Print-Only Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3">
        <div className="text-lg font-extrabold text-slate-900">
          የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን — የወንጌል አገልግሎት የሚሽነሪዎች ሪፖርት
        </div>
        <div className="text-xs font-bold text-slate-700 mt-1">
          ዓመተ ምሕረት፦ {selectedYear} ዓ/ም · ክፍለ ጊዜ፦ {selectedPeriodLabel} · የታተመበት ጊዜ፦{' '}
          {formatDualDateTimeText(getAdjustedNow())}
        </div>
      </div>

      {/* 5-Activity KPI Cards for Selected Period */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ACTIVITY_DEFINITIONS.map((def) => {
          const pair = activePeriodTotals[def.key];
          const total = getPairTotal(pair);
          return (
            <div
              key={def.key}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
            >
              <div className="text-xs font-extrabold text-slate-700 leading-snug">
                {lang === 'en' ? def.labelEn : def.labelAm}
              </div>
              <div className={`text-2xl font-extrabold tabular-nums mt-2 ${def.accentClass}`}>
                {total.toLocaleString()}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600 tabular-nums">
                <span>
                  {t('ወንድ', 'M')}: <strong className="text-slate-900">{pair.male.toLocaleString()}</strong>
                </span>
                <span>
                  {t('ሴት', 'F')}: <strong className="text-slate-900">{pair.female.toLocaleString()}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Complete Q1, Q2, H1, Q3, Q4, H2, Full-Year Matrix Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-900 shrink-0" />
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                {t(
                  `የ${selectedYear} ዓ/ም አጠቃላይ ማጠቃለያ (ከ1ኛ–4ኛ ሩብ ዓመት · በግማሽ ዓመት እና በሙሉ 1 ዓመት)`,
                  `${selectedYear} E.C. Aggregate Matrix (Q1–Q4, Half-Years & Full Year)`
                )}
              </h4>
              <p className="text-[11px] text-slate-500">
                {t(
                  `በ${yearReports.length} ሚሽነሪዎች ሪፖርት መሠረት በራስ-ሰር የተሰላ (ወ = ወንድ · ሴ = ሴት · ድ = ድምር)`,
                  `Auto-calculated across ${yearReports.length} missionary reports (M = Male · F = Female · T = Total)`
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold">
                <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200 min-w-[180px]">
                  {t('ክፍለ ጊዜ', 'Period')}
                </th>
                {ACTIVITY_DEFINITIONS.map((def) => (
                  <th
                    key={def.key}
                    colSpan={3}
                    className="py-2 px-2 text-center border-r border-slate-200 last:border-r-0"
                  >
                    {lang === 'en' ? def.shortEn : def.shortAm}
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                {ACTIVITY_DEFINITIONS.map((def) => (
                  <React.Fragment key={def.key}>
                    <th className="py-1.5 px-2 text-right">{t('ወ', 'M')}</th>
                    <th className="py-1.5 px-2 text-right">{t('ሴ', 'F')}</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200 last:border-r-0 font-extrabold text-slate-900">
                      {t('ድምር', 'Tot')}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(
                [
                  { key: 'q1', labelAm: '1ኛ ሩብ ዓመት (ሐምሌ–መስከረም)', labelEn: '1st Quarter (Hamle–Meskerem)', tier: 'quarter' },
                  { key: 'q2', labelAm: '2ኛ ሩብ ዓመት (ጥቅምት–ታኅሣሥ)', labelEn: '2nd Quarter (Tikimt–Tahsas)', tier: 'quarter' },
                  {
                    key: 'h1',
                    labelAm: '1ኛ ግማሽ ዓመት (ሐምሌ–ታኅሣሥ / Q1+Q2)',
                    labelEn: '1st Half-Year (Hamle–Tahsas / Q1+Q2)',
                    tier: 'half'
                  },
                  { key: 'q3', labelAm: '3ኛ ሩብ ዓመት (ጥር–መጋቢት)', labelEn: '3rd Quarter (Tir–Megabit)', tier: 'quarter' },
                  { key: 'q4', labelAm: '4ኛ ሩብ ዓመት (ሚያዝያ–ሰኔ)', labelEn: '4th Quarter (Miyazya–Sene)', tier: 'quarter' },
                  {
                    key: 'h2',
                    labelAm: '2ኛ ግማሽ ዓመት (ጥር–ሰኔ / Q3+Q4)',
                    labelEn: '2nd Half-Year (Tir–Sene / Q3+Q4)',
                    tier: 'half'
                  },
                  {
                    key: 'year',
                    labelAm: 'ሙሉ 1 ዓመት ድምር (ሐምሌ–ሰኔ)',
                    labelEn: 'Full Year Total (Hamle–Sene)',
                    tier: 'year'
                  }
                ] as const
              ).map((row) => {
                const metrics = periodMatrixTotals[row.key];
                const isSelectedRow = selectedPeriod === row.key;
                const rowClass =
                  row.tier === 'year'
                    ? 'bg-slate-900 text-white font-extrabold'
                    : row.tier === 'half'
                    ? 'bg-indigo-50/80 text-indigo-950 font-extrabold'
                    : isSelectedRow
                    ? 'bg-blue-50/70 font-bold text-slate-900'
                    : 'hover:bg-slate-50/80 text-slate-800';
                return (
                  <tr
                    key={row.key}
                    onClick={() => setSelectedPeriod(row.key)}
                    className={`${rowClass} cursor-pointer transition`}
                  >
                    <td className="py-2.5 px-3 border-r border-slate-200/80 whitespace-nowrap">
                      {lang === 'en' ? row.labelEn : row.labelAm}
                    </td>
                    {ACTIVITY_DEFINITIONS.map((def) => {
                      const pair = metrics[def.key];
                      const tot = getPairTotal(pair);
                      return (
                        <React.Fragment key={def.key}>
                          <td className="py-2.5 px-2 text-right tabular-nums">
                            {pair.male.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums">
                            {pair.female.toLocaleString()}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right tabular-nums border-r border-slate-200/80 last:border-r-0 ${
                              row.tier === 'year' ? 'text-amber-300 font-extrabold' : 'font-extrabold'
                            }`}
                          >
                            {tot.toLocaleString()}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-Missionary Detailed Table for Selected Period */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
              {t(
                `በእያንዳንዱ ሚሽነሪ ስም የተዘጋጀ ሪፖርት — ${selectedYear} ዓ/ም (${selectedPeriodLabel})`,
                `Per-Missionary Report — ${selectedYear} E.C. (${selectedPeriodLabel})`
              )}
            </h4>
            <p className="text-[11px] text-slate-500">
              {t(
                'የእያንዳንዱን ሚሽነሪ ከ1ኛ እስከ 4ኛ ሩብ ዓመት መሙላት ወይም ማየት ይችላሉ',
                'View or edit Q1–Q4 counts for each individual missionary'
              )}
            </p>
          </div>
          <span className="text-xs font-extrabold text-slate-600 tabular-nums">
            {t(`${yearReports.length} ሚሽነሪዎች`, `${yearReports.length} Missionaries`)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold">
                <th rowSpan={2} className="py-2.5 px-3 text-left w-10">
                  {t('ተ.ቁ', '#')}
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200 min-w-[170px]">
                  {t('የሚሽነሪ ስም / ቦታ', 'Missionary / Field')}
                </th>
                {ACTIVITY_DEFINITIONS.map((def) => (
                  <th
                    key={def.key}
                    colSpan={3}
                    className="py-2 px-2 text-center border-r border-slate-200"
                  >
                    {lang === 'en' ? def.shortEn : def.shortAm}
                  </th>
                ))}
                {!readOnly && (
                  <th rowSpan={2} className="py-2.5 px-3 text-right print:hidden">
                    {t('ማስተካከያ', 'Actions')}
                  </th>
                )}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                {ACTIVITY_DEFINITIONS.map((def) => (
                  <React.Fragment key={def.key}>
                    <th className="py-1.5 px-1.5 text-right">{t('ወ', 'M')}</th>
                    <th className="py-1.5 px-1.5 text-right">{t('ሴ', 'F')}</th>
                    <th className="py-1.5 px-1.5 text-right border-r border-slate-200 font-extrabold text-slate-900">
                      {t('ድምር', 'Tot')}
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={readOnly ? 17 : 18}
                    className="py-10 px-4 text-center text-slate-500"
                  >
                    <p className="font-bold">
                      {t(
                        `ለ${selectedYear} ዓ/ም ገና የሚሽነሪዎች ሪፖርት አልተመዘገበም።`,
                        `No missionary reports recorded for ${selectedYear} yet.`
                      )}
                    </p>
                    {!readOnly && (
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        {missionaries.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSyncMissionariesForYear}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>
                              {t(
                                `የተመዘገቡትን ${missionaries.length} ሚሽነሪዎች አስገባ`,
                                `Import ${missionaries.length} Missionaries`
                              )}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={openAddModal}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('ለሚሽነሪ ሪፖርት ጨምር', 'Add Missionary Report')}</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                yearReports.map((r, idx) => {
                  const m = getPeriodMetrics(r, selectedPeriod);
                  const scopeInfo = SCOPE_LABELS[r.scope || 'local'];
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="font-extrabold text-slate-900">{r.missionaryName}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          {lang === 'en' ? scopeInfo.en : scopeInfo.am}
                          {r.missionField ? ` · ${r.missionField}` : ''}
                        </div>
                      </td>
                      {ACTIVITY_DEFINITIONS.map((def) => {
                        const pair = m[def.key];
                        const tot = getPairTotal(pair);
                        return (
                          <React.Fragment key={def.key}>
                            <td className="py-2.5 px-1.5 text-right text-slate-700 tabular-nums">
                              {pair.male.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-1.5 text-right text-slate-700 tabular-nums">
                              {pair.female.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-1.5 text-right font-extrabold text-slate-900 border-r border-slate-200 tabular-nums bg-slate-50/40">
                              {tot.toLocaleString()}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      {!readOnly && (
                        <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                          {pendingDeleteId === r.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(r.id)}
                                className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                {t('አዎ ሰርዝ', 'Delete')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                {t('ተው', 'Cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(r)}
                                title={t('1ኛ–4ኛ ሩብ አስተካክል', 'Edit Q1–Q4')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>{t('ሙላ', 'Edit')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(r.id)}
                                title={t('ሰርዝ', 'Delete')}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {yearReports.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <td colSpan={2} className="py-3 px-3 border-r border-slate-700">
                    {t(
                      `ጠቅላላ ድምር (${yearReports.length} ሚሽነሪዎች)`,
                      `Grand Total (${yearReports.length} Missionaries)`
                    )}
                  </td>
                  {ACTIVITY_DEFINITIONS.map((def) => {
                    const pair = activePeriodTotals[def.key];
                    return (
                      <React.Fragment key={def.key}>
                        <td className="py-3 px-1.5 text-right tabular-nums">
                          {pair.male.toLocaleString()}
                        </td>
                        <td className="py-3 px-1.5 text-right tabular-nums">
                          {pair.female.toLocaleString()}
                        </td>
                        <td className="py-3 px-1.5 text-right text-amber-300 border-r border-slate-700 tabular-nums">
                          {getPairTotal(pair).toLocaleString()}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {!readOnly && <td className="print:hidden" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Edit / Add Missionary Q1–Q4 Report Modal */}
      {isModalOpen && !readOnly && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingReportId
                    ? t('የሚሽነሪ ሪፖርት ማስተካከያ (1ኛ–4ኛ ሩብ ዓመት)', 'Edit Missionary Quarterly Report (Q1–Q4)')
                    : t('አዲስ የሚሽነሪ ሪፖርት መመዝገቢያ (1ኛ–4ኛ ሩብ ዓመት)', 'Add Missionary Quarterly Report (Q1–Q4)')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t(
                    'ከ1ኛ እስከ 4ኛ ሩብ ዓመት ወንድና ሴት ያስገቡ — ግማሽ ዓመት እና 1 ዓመት በራስ-ሰር ይሰላል',
                    'Enter Male & Female counts for Q1–Q4; Half-Year and Full-Year totals calculate automatically'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReportModal} className="space-y-4 mt-4 text-xs">
              {/* Missionary Identity & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ዓመተ ምሕረት (ከ2019 ጀምሮ) *', 'Year (2019+) *')}
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-extrabold bg-slate-50"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y} ዓ/ም
                      </option>
                    ))}
                  </select>
                </div>

                {missionaries.length > 0 && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t('ከተመዘገቡ ሚሽነሪዎች ምረጥ', 'Pick Registered Missionary')}
                    </label>
                    <select
                      value={formMissionaryId}
                      onChange={(e) => handleSelectPresetMissionary(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-slate-50"
                    >
                      <option value="">{t('-- ወይም ስም ከዚህ ጎን ጻፍ --', '-- Or type name manually --')}</option>
                      {missionaries.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.name} ({SCOPE_LABELS[m.scope].am})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የሚሽነሪ ስም *', 'Missionary Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formMissionaryName}
                    onChange={(e) => setFormMissionaryName(e.target.value)}
                    placeholder={t('ሙሉ ስም ያስገቡ...', 'Enter missionary name...')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የሚሽነሪ ምድብ', 'Missionary Scope')}
                  </label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value as MissionaryScope)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="local">{SCOPE_LABELS.local.am}</option>
                    <option value="regional">{SCOPE_LABELS.regional.am}</option>
                    <option value="national">{SCOPE_LABELS.national.am}</option>
                    <option value="international">{SCOPE_LABELS.international.am}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የአገልግሎት ቦታ / መስክ', 'Mission Field / Location')}
                  </label>
                  <input
                    type="text"
                    value={formMissionField}
                    onChange={(e) => setFormMissionField(e.target.value)}
                    placeholder={t('ምሳሌ፦ ደቡብ ክልል / ኬንያ / ቦረና...', 'e.g., South Region / Field...')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ማስታወሻ', 'Notes')}
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder={t('ተጨማሪ ማብራሪያ ካለ...', 'Optional notes...')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Quarter Tabs */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { key: 'q1', am: '1ኛ ሩብ ዓመት', en: 'Q1' },
                      { key: 'q2', am: '2ኛ ሩብ ዓመት', en: 'Q2' },
                      { key: 'q3', am: '3ኛ ሩብ ዓመት', en: 'Q3' },
                      { key: 'q4', am: '4ኛ ሩብ ዓመት', en: 'Q4' }
                    ] as const
                  ).map((qTab) => {
                    const isActive = activeQuarterTab === qTab.key;
                    const qMetrics = getQuarterSetter(qTab.key).data;
                    const qSum = ACTIVITY_DEFINITIONS.reduce(
                      (s, d) => s + getPairTotal(qMetrics[d.key]),
                      0
                    );
                    return (
                      <button
                        key={qTab.key}
                        type="button"
                        onClick={() => setActiveQuarterTab(qTab.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{lang === 'en' ? qTab.en : qTab.am}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                            isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {qSum}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 5 Activities Entry Table for Active Quarter */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-2.5 px-3 text-left">{t('ዝርዝር ተግባር', 'Activity')}</th>
                        <th className="py-2.5 px-3 text-center w-28">{t('ወንድ', 'Male')}</th>
                        <th className="py-2.5 px-3 text-center w-28">{t('ሴት', 'Female')}</th>
                        <th className="py-2.5 px-3 text-right w-24">{t('ድምር', 'Total')}</th>
                        <th className="py-2.5 px-3 text-right hidden sm:table-cell">{t('የ1 ዓመት ድምር', 'Annual Tot')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ACTIVITY_DEFINITIONS.map((def, idx) => {
                        const qMetrics = getQuarterSetter(activeQuarterTab).data;
                        const pair = qMetrics[def.key];
                        const qTotal = getPairTotal(pair);
                        const annualPair = modalSummaries.year[def.key];
                        return (
                          <tr key={def.key} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-extrabold text-slate-900">
                              <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                              {lang === 'en' ? def.labelEn : def.labelAm}
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min={0}
                                value={pair.male}
                                onChange={(e) =>
                                  updateQuarterCell(activeQuarterTab, def.key, 'male', e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-center font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min={0}
                                value={pair.female}
                                onChange={(e) =>
                                  updateQuarterCell(activeQuarterTab, def.key, 'female', e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-center font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-blue-900 tabular-nums">
                              {qTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[11px] font-bold text-slate-600 tabular-nums hidden sm:table-cell">
                              {t('ወ', 'M')} {annualPair.male} · {t('ሴ', 'F')} {annualPair.female} ·{' '}
                              <strong className="text-slate-900">{getPairTotal(annualPair)}</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Auto-calculated H1, H2, and Annual Preview */}
                <div className="bg-slate-50 px-3 sm:px-4 py-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="bg-white border border-indigo-200 rounded-xl p-2.5">
                    <div className="font-extrabold text-indigo-950 mb-1">
                      {t('1ኛ ግማሽ ዓመት (1ኛ + 2ኛ ሩብ)', '1st Half-Year (Q1 + Q2)')}
                    </div>
                    <div className="space-y-0.5 text-slate-700 tabular-nums">
                      {ACTIVITY_DEFINITIONS.map((d) => {
                        const p = modalSummaries.h1[d.key];
                        return (
                          <div key={d.key} className="flex justify-between gap-2">
                            <span className="truncate">{d.shortAm}:</span>
                            <span className="font-bold whitespace-nowrap">
                              ወ {p.male} · ሴ {p.female} · <strong>{getPairTotal(p)}</strong>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white border border-indigo-200 rounded-xl p-2.5">
                    <div className="font-extrabold text-indigo-950 mb-1">
                      {t('2ኛ ግማሽ ዓመት (3ኛ + 4ኛ ሩብ)', '2nd Half-Year (Q3 + Q4)')}
                    </div>
                    <div className="space-y-0.5 text-slate-700 tabular-nums">
                      {ACTIVITY_DEFINITIONS.map((d) => {
                        const p = modalSummaries.h2[d.key];
                        return (
                          <div key={d.key} className="flex justify-between gap-2">
                            <span className="truncate">{d.shortAm}:</span>
                            <span className="font-bold whitespace-nowrap">
                              ወ {p.male} · ሴ {p.female} · <strong>{getPairTotal(p)}</strong>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white rounded-xl p-2.5">
                    <div className="font-extrabold text-amber-300 mb-1">
                      {t('ሙሉ 1 ዓመት (1ኛ–4ኛ ሩብ)', 'Full 1-Year Total (Q1–Q4)')}
                    </div>
                    <div className="space-y-0.5 tabular-nums">
                      {ACTIVITY_DEFINITIONS.map((d) => {
                        const p = modalSummaries.year[d.key];
                        return (
                          <div key={d.key} className="flex justify-between gap-2">
                            <span className="truncate text-slate-200">{d.shortAm}:</span>
                            <span className="font-bold whitespace-nowrap">
                              ወ {p.male} · ሴ {p.female} · <strong className="text-amber-300">{getPairTotal(p)}</strong>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer w-full sm:w-auto"
                >
                  {t('ይቅር', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer w-full sm:w-auto"
                >
                  {editingReportId ? t('ለውጦችን አስቀምጥ', 'Save Changes') : t('ሪፖርቱን አስቀምጥ', 'Save Report')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
