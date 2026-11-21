import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserCheck,
  Wallet,
  UserX,
  UserMinus,
  Search,
  Download,
  Printer,
  UserPlus,
  CheckCircle2,
  Percent,
  Church
} from 'lucide-react';
import {
  ChurchMember,
  DepartmentMemberRecord,
  EvangelismMemberStatus
} from '../types';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { useLanguage } from '../context/LanguageContext';
import { generateUniqueId } from '../utils/idGenerator';
import { formatDualDateTimeText, getAdjustedNow } from '../utils/ethiopianDate';
import { mapToOfficialChapel, normalizeAmharicSearchText } from '../utils/amharicSearchAndChapel';
import {
  computeChapelEvangelismBreakdown,
  EVANGELISM_MASTER_STATUS_META,
  mapDeptEvangelismStatusToMaster,
  MemberMinistryProfile
} from '../utils/memberMinistryProfile';

export type EvangelismStatusKey =
  | 'paying'
  | 'active_unpaid'
  | 'discontinued'
  | 'not_participating';

export const EVANGELISM_STATUS_LABELS: Record<
  EvangelismStatusKey,
  { am: string; en: string; storedValue: string; badgeClass: string }
> = {
  paying: {
    am: 'አባል — እየከፈለ ያለ',
    en: 'Member — Currently Paying',
    storedValue: 'እየከፈለ ያለ',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200'
  },
  active_unpaid: {
    am: 'አባል — በአገልግሎት ላይ (ክፍያ ያልጀመረ)',
    en: 'Active Member (Not Paying Yet)',
    storedValue: 'ንቁ',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-200'
  },
  discontinued: {
    am: 'አገልግሎቱን ሙሉ በሙሉ ያቋረጠ',
    en: 'Completely Discontinued',
    storedValue: 'ሙሉ በሙሉ ያቋረጠ',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-200'
  },
  not_participating: {
    am: 'በአገልግሎቱ ሙሉ በሙሉ ያልተሳተፈ',
    en: 'Not Participating at All',
    storedValue: 'ሙሉ በሙሉ ያልተሳተፈ',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300'
  }
};

export function classifyEvangelismMemberStatus(status?: string): EvangelismStatusKey {
  const s = String(status || '').trim().toLowerCase();
  if (!s) return 'active_unpaid';
  if (s.includes('ያቋረጠ') || s.includes('አቋርጧል') || s.includes('discontinu') || s.includes('stop')) {
    return 'discontinued';
  }
  if (s.includes('ያልተሳተፈ') || s.includes('not participating') || s.includes('non-part')) {
    return 'not_participating';
  }
  if (s.includes('እየከፈለ') || s.includes('paying') || s.includes('contributing')) {
    return 'paying';
  }
  return 'active_unpaid';
}

function isFemaleGender(gender?: string): boolean {
  const g = String(gender || '').trim().toLowerCase();
  return g === 'ሴ' || g.includes('ሴት') || g === 'f' || g === 'female';
}

function formatPct(part: number, whole: number): string {
  if (!whole || whole <= 0) return '0.0%';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export interface GenderPctRow {
  id: string;
  titleAm: string;
  titleEn: string;
  subtitleAm: string;
  subtitleEn: string;
  male: number;
  female: number;
  total: number;
  malePctDisplay: string;
  femalePctDisplay: string;
  churchSharePct: number;
  churchShareDisplay: string;
  evangShareDisplay: string;
  accentClass: string;
  barClass: string;
}

export function computeEvangelismParticipationStats(
  churchMembers: ChurchMember[],
  evangMembers: DepartmentMemberRecord[]
): {
  rows: GenderPctRow[];
  churchTotal: number;
  churchMale: number;
  churchFemale: number;
  evangMemberTotal: number;
  payingTotal: number;
  discontinuedTotal: number;
  notParticipatingTotal: number;
} {
  let churchMale = 0;
  let churchFemale = 0;
  const masterEvangByNormName = new Map<string, EvangelismStatusKey>();

  const evangDeptByNormName = new Map<
    string,
    { status: EvangelismStatusKey; female: boolean }
  >();
  evangMembers.forEach((m) => {
    const key = normalizeAmharicSearchText(m.name);
    if (!key) return;
    evangDeptByNormName.set(key, {
      status: classifyEvangelismMemberStatus(m.status),
      female: isFemaleGender(m.gender)
    });
  });

  const toStatsKey = (ms: EvangelismMemberStatus): EvangelismStatusKey =>
    ms === 'paying'
      ? 'paying'
      : ms === 'unpaid'
      ? 'active_unpaid'
      : ms === 'discontinued'
      ? 'discontinued'
      : 'not_participating';

  let payingMale = 0;
  let payingFemale = 0;
  let activeUnpaidMale = 0;
  let activeUnpaidFemale = 0;
  let discMale = 0;
  let discFemale = 0;
  let explicitNotPartMale = 0;
  let explicitNotPartFemale = 0;

  const seenEvangKeys = new Set<string>();

  churchMembers.forEach((cm) => {
    const fem = isFemaleGender(cm.gender);
    if (fem) churchFemale += 1;
    else churchMale += 1;

    const norm = normalizeAmharicSearchText(cm.name);
    const deptMatch = norm ? evangDeptByNormName.get(norm) : undefined;
    if (norm && deptMatch) seenEvangKeys.add(norm);

    let resolved: EvangelismStatusKey | null = null;
    if (cm.evangelismStatus) {
      resolved = toStatsKey(cm.evangelismStatus);
    } else if (deptMatch) {
      resolved = deptMatch.status;
    }

    if (resolved) {
      if (norm) masterEvangByNormName.set(norm, resolved);
      if (resolved === 'paying') {
        if (fem) payingFemale += 1;
        else payingMale += 1;
      } else if (resolved === 'active_unpaid') {
        if (fem) activeUnpaidFemale += 1;
        else activeUnpaidMale += 1;
      } else if (resolved === 'discontinued') {
        if (fem) discFemale += 1;
        else discMale += 1;
      } else {
        if (fem) explicitNotPartFemale += 1;
        else explicitNotPartMale += 1;
      }
    }
  });

  // Also include Evangelism roster members not matched in ChurchMember
  const churchTotal = churchMembers.length;
  evangMembers.forEach((m) => {
    const norm = normalizeAmharicSearchText(m.name);
    if (norm && seenEvangKeys.has(norm)) return;
    if (norm) seenEvangKeys.add(norm);
    const fem = isFemaleGender(m.gender);
    const kind = classifyEvangelismMemberStatus(m.status);
    if (kind === 'paying') {
      if (fem) payingFemale += 1;
      else payingMale += 1;
    } else if (kind === 'active_unpaid') {
      if (fem) activeUnpaidFemale += 1;
      else activeUnpaidMale += 1;
    } else if (kind === 'discontinued') {
      if (fem) discFemale += 1;
      else discMale += 1;
    } else {
      if (fem) explicitNotPartFemale += 1;
      else explicitNotPartMale += 1;
    }
  });

  // Active Evangelism members = Paying + Active Non-Paying
  const evangMale = payingMale + activeUnpaidMale;
  const evangFemale = payingFemale + activeUnpaidFemale;
  const evangTotal = evangMale + evangFemale;

  const payingTotal = payingMale + payingFemale;
  const discTotal = discMale + discFemale;

  // Church members who never participated = remaining church members outside active + discontinued,
  // or explicit "ሙሉ በሙሉ ያልተሳተፈ" entries if greater.
  const notPartMale = Math.max(explicitNotPartMale, churchMale - evangMale - discMale);
  const notPartFemale = Math.max(explicitNotPartFemale, churchFemale - evangFemale - discFemale);
  const notPartTotal = notPartMale + notPartFemale;

  const rows: GenderPctRow[] = [
    {
      id: 'church_total',
      titleAm: '1. ከቤተክርስቲያኒቱ አጠቃላይ አባላት',
      titleEn: '1. Total Church Members (Baseline)',
      subtitleAm: 'በቤተክርስቲያን ዋና መረጃ ቋት የተመዘገቡ አጠቃላይ አባላት (100%)',
      subtitleEn: 'All registered members in the Church Master Registry (100%)',
      male: churchMale,
      female: churchFemale,
      total: churchTotal,
      malePctDisplay: formatPct(churchMale, churchTotal),
      femalePctDisplay: formatPct(churchFemale, churchTotal),
      churchSharePct: churchTotal > 0 ? 100 : 0,
      churchShareDisplay: churchTotal > 0 ? '100.0%' : '0.0%',
      evangShareDisplay: '—',
      accentClass: 'bg-slate-900 text-white border-slate-900',
      barClass: 'bg-slate-800'
    },
    {
      id: 'evang_members',
      titleAm: '2. የወንጌል አገልግሎት አባል የሆኑ',
      titleEn: '2. Evangelism Ministry Members',
      subtitleAm: 'በወንጌል አገልግሎት ውስጥ በአባልነት የተመዘገቡ (እየከፈሉ ያሉ + ንቁ አባላት)',
      subtitleEn: 'Active registered Evangelism Ministry members (Paying + Active)',
      male: evangMale,
      female: evangFemale,
      total: evangTotal,
      malePctDisplay: formatPct(evangMale, churchMale),
      femalePctDisplay: formatPct(evangFemale, churchFemale),
      churchSharePct: churchTotal > 0 ? (evangTotal / churchTotal) * 100 : 0,
      churchShareDisplay: formatPct(evangTotal, churchTotal),
      evangShareDisplay: evangTotal > 0 ? '100.0%' : '0.0%',
      accentClass: 'bg-blue-50 text-blue-950 border-blue-200',
      barClass: 'bg-blue-700'
    },
    {
      id: 'paying_members',
      titleAm: '3. አሁን በአገልግሎቱ አባል ሆኖ እየከፈሉ ያሉ',
      titleEn: '3. Currently Active & Paying Members',
      subtitleAm: 'በአገልግሎቱ ውስጥ አባል ሆነው መደበኛ መዋጮ/ድጋፍ እየከፈሉ ያሉ',
      subtitleEn: 'Active Evangelism members currently contributing / paying',
      male: payingMale,
      female: payingFemale,
      total: payingTotal,
      malePctDisplay: formatPct(payingMale, churchMale),
      femalePctDisplay: formatPct(payingFemale, churchFemale),
      churchSharePct: churchTotal > 0 ? (payingTotal / churchTotal) * 100 : 0,
      churchShareDisplay: formatPct(payingTotal, churchTotal),
      evangShareDisplay: formatPct(payingTotal, evangTotal),
      accentClass: 'bg-emerald-50 text-emerald-950 border-emerald-200',
      barClass: 'bg-emerald-600'
    },
    {
      id: 'discontinued',
      titleAm: '4. አገልግሎቱን ሙሉ በሙሉ ያቋረጡ',
      titleEn: '4. Completely Discontinued Ministry',
      subtitleAm: 'በአገልግሎቱ ተሳትፈው ሙሉ በሙሉ ያቋረጡ አባላት',
      subtitleEn: 'Members who completely stopped / discontinued Evangelism participation',
      male: discMale,
      female: discFemale,
      total: discTotal,
      malePctDisplay: formatPct(discMale, churchMale),
      femalePctDisplay: formatPct(discFemale, churchFemale),
      churchSharePct: churchTotal > 0 ? (discTotal / churchTotal) * 100 : 0,
      churchShareDisplay: formatPct(discTotal, churchTotal),
      evangShareDisplay: '—',
      accentClass: 'bg-rose-50 text-rose-950 border-rose-200',
      barClass: 'bg-rose-600'
    },
    {
      id: 'not_participating',
      titleAm: '5. በአገልግሎቱ ሙሉ በሙሉ ያልተሳተፉ',
      titleEn: '5. Completely Not Participating',
      subtitleAm: 'ከቤተክርስቲያን አባላት መካከል በወንጌል አገልግሎቱ ሙሉ በሙሉ ያልተሳተፉ',
      subtitleEn: 'Church members who have not participated in Evangelism at all',
      male: notPartMale,
      female: notPartFemale,
      total: notPartTotal,
      malePctDisplay: formatPct(notPartMale, churchMale),
      femalePctDisplay: formatPct(notPartFemale, churchFemale),
      churchSharePct: churchTotal > 0 ? (notPartTotal / churchTotal) * 100 : 0,
      churchShareDisplay: formatPct(notPartTotal, churchTotal),
      evangShareDisplay: '—',
      accentClass: 'bg-amber-50 text-amber-950 border-amber-200',
      barClass: 'bg-amber-600'
    }
  ];

  return {
    rows,
    churchTotal,
    churchMale,
    churchFemale,
    evangMemberTotal: evangTotal,
    payingTotal,
    discontinuedTotal: discTotal,
    notParticipatingTotal: notPartTotal
  };
}

interface EvangelismParticipationStatsPanelProps {
  currentYear: string;
  churchMembers: ChurchMember[];
  evangMembers: DepartmentMemberRecord[];
  onSaveMembers: (nextMembers: DepartmentMemberRecord[]) => void;
  onOpenAddMember: () => void;
}

export const EvangelismParticipationStatsPanel: React.FC<
  EvangelismParticipationStatsPanelProps
> = ({
  currentYear,
  churchMembers,
  evangMembers,
  onSaveMembers,
  onOpenAddMember
}) => {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<'all' | EvangelismStatusKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncDefaultStatus, setSyncDefaultStatus] = useState<EvangelismStatusKey>('not_participating');
  const [notice, setNotice] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 5000);
  };

  const stats = useMemo(
    () => computeEvangelismParticipationStats(churchMembers, evangMembers),
    [churchMembers, evangMembers]
  );

  const chapelBreakdown = useMemo(() => {
    const deptByNorm = new Map<string, EvangelismMemberStatus>();
    evangMembers.forEach((em) => {
      const k = normalizeAmharicSearchText(em.name);
      if (k) deptByNorm.set(k, mapDeptEvangelismStatusToMaster(em.status));
    });

    const profileMap = new Map<number, MemberMinistryProfile>();
    churchMembers.forEach((cm) => {
      const k = normalizeAmharicSearchText(cm.name);
      const resolved = cm.evangelismStatus || (k ? deptByNorm.get(k) : undefined) || 'not_member';
      profileMap.set(cm.id, {
        serviceRoles: cm.serviceRoles || [],
        autoServiceRoles: [],
        evangelismStatus: resolved,
        evangelismFromDept: Boolean(k && deptByNorm.has(k) && !cm.evangelismStatus),
        spiritualCourses: cm.spiritualCourses || [],
        autoSpiritualCourses: []
      });
    });

    return computeChapelEvangelismBreakdown(churchMembers, profileMap, DEFAULT_CHAPELS);
  }, [churchMembers, evangMembers]);

  const missingChurchCount = useMemo(() => {
    const existingNames = new Set(evangMembers.map((m) => m.name.trim()));
    return churchMembers.filter((cm) => cm.name?.trim() && !existingNames.has(cm.name.trim())).length;
  }, [churchMembers, evangMembers]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return evangMembers.filter((m) => {
      if (statusFilter !== 'all' && classifyEvangelismMemberStatus(m.status) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.roleOrClass || '').toLowerCase().includes(q)
      );
    });
  }, [evangMembers, statusFilter, searchQuery]);

  const handleSyncAllChurchMembers = () => {
    if (churchMembers.length === 0) {
      showNotice(
        t('በቤተክርስቲያን ዋና መረጃ ቋት ውስጥ የተመዘገቡ አባላት የሉም።', 'No members in Church Master Registry yet.')
      );
      return;
    }
    const existingNames = new Set(evangMembers.map((m) => m.name.trim()));
    const statusLabel = EVANGELISM_STATUS_LABELS[syncDefaultStatus].storedValue;
    const toAdd: DepartmentMemberRecord[] = [];
    churchMembers.forEach((cm) => {
      const cleanName = String(cm.name || '').trim();
      if (!cleanName || existingNames.has(cleanName)) return;
      existingNames.add(cleanName);
      toAdd.push({
        id: generateUniqueId(),
        name: cleanName,
        gender: isFemaleGender(cm.gender) ? 'ሴ' : 'ወ',
        age: cm.age,
        phone: cm.phone,
        roleOrClass: 'የወንጌል አገልግሎት ተሳታፊ',
        educationOrLevel: cm.educationLevel,
        status: statusLabel,
        notes: cm.chapel ? `ከ${cm.chapel} ዋና ቋት` : 'ከዋናው ቋት'
      });
    });

    if (toAdd.length === 0) {
      showNotice(
        t(
          'ሁሉም የቤተክርስቲያኒቱ አባላት ቀድሞውኑ በወንጌል አገልግሎት ዝርዝር ውስጥ ተካተዋል።',
          'All church members are already included in the Evangelism roster.'
        )
      );
      return;
    }
    onSaveMembers([...evangMembers, ...toAdd]);
    showNotice(
      t(
        `✓ ${toAdd.length} አባላት ከዋናው የቤተክርስቲያን ቋት በ"${EVANGELISM_STATUS_LABELS[syncDefaultStatus].am}" ሁኔታ ገብተዋል!`,
        `Synced ${toAdd.length} members as "${EVANGELISM_STATUS_LABELS[syncDefaultStatus].en}"!`
      )
    );
  };

  const handleChangeMemberStatus = (memberId: number, nextKey: EvangelismStatusKey) => {
    const nextValue = EVANGELISM_STATUS_LABELS[nextKey].storedValue;
    onSaveMembers(
      evangMembers.map((m) => (m.id === memberId ? { ...m, status: nextValue } : m))
    );
  };

  const handleExportExcel = () => {
    const summaryRows = [
      [`የወንጌል አገልግሎት — የአባላትና የተሳትፎ መቶኛ ስታቲስቲክስ (${currentYear} ዓ/ም)`],
      [`የታተመበት ቀንና ሰዓት፦ ${formatDualDateTimeText(getAdjustedNow())}`],
      [],
      [
        'ተ.ቁ',
        'ምድብ / መለኪያ',
        'ወንድ (ብዛት)',
        'ወንድ (%)',
        'ሴት (ብዛት)',
        'ሴት (%)',
        'ድምር (ብዛት)',
        'ከቤተክርስቲያን አጠቃላይ አባላት (%)',
        'ከወንጌል አገልግሎት አባላት (%)'
      ],
      ...stats.rows.map((r, i) => [
        i + 1,
        r.titleAm,
        r.male,
        r.malePctDisplay,
        r.female,
        r.femalePctDisplay,
        r.total,
        r.churchShareDisplay,
        r.evangShareDisplay
      ]),
      [],
      ['ዝርዝር የአባላት ተሳትፎ መዝገብ'],
      ['ተ.ቁ', 'ሙሉ ስም', 'ጾታ', 'ስልክ', 'ምድብ / ድርሻ', 'የአሁን ሁኔታ', 'ማስታወሻ'],
      ...evangMembers.map((m, idx) => [
        idx + 1,
        m.name,
        m.gender,
        m.phone || '-',
        m.roleOrClass,
        EVANGELISM_STATUS_LABELS[classifyEvangelismMemberStatus(m.status)].am,
        m.notes || '-'
      ])
    ];
    const wsSheet = XLSX.utils.aoa_to_sheet(summaryRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSheet, 'የወንጌል_ስታቲስቲክስ');

    const chapelRowsAoA: (string | number)[][] = [
      [`በ10ሩም ቻፕሎች ደረጃ የወንጌል አገልግሎት ተሳትፎ (${currentYear} ዓ/ም)`],
      [],
      [
        'ቻፕል',
        'ጠቅላላ አባላት',
        'አባል — የሚከፍል (ወ)',
        'አባል — የሚከፍል (ሴ)',
        'አባል — የሚከፍል (ድምር)',
        'አባል — የማይከፍል (ወ)',
        'አባል — የማይከፍል (ሴ)',
        'አባል — የማይከፍል (ድምር)',
        'ያቋረጠ (ድምር)',
        'አባል ያልሆነ (ድምር)',
        'የወንጌል አባላት (%)'
      ],
      ...chapelBreakdown.chapelRows.map((cr) => [
        cr.chapel,
        cr.totalMembers,
        cr.payingMale,
        cr.payingFemale,
        cr.payingTotal,
        cr.unpaidMale,
        cr.unpaidFemale,
        cr.unpaidTotal,
        cr.discontinuedTotal,
        cr.notMemberTotal,
        formatPct(cr.evangMemberTotal, cr.totalMembers)
      ]),
      [
        chapelBreakdown.totals.chapel,
        chapelBreakdown.totals.totalMembers,
        chapelBreakdown.totals.payingMale,
        chapelBreakdown.totals.payingFemale,
        chapelBreakdown.totals.payingTotal,
        chapelBreakdown.totals.unpaidMale,
        chapelBreakdown.totals.unpaidFemale,
        chapelBreakdown.totals.unpaidTotal,
        chapelBreakdown.totals.discontinuedTotal,
        chapelBreakdown.totals.notMemberTotal,
        formatPct(chapelBreakdown.totals.evangMemberTotal, chapelBreakdown.totals.totalMembers)
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chapelRowsAoA), 'በየቻፕሉ_ወንጌል_ተሳትፎ');
    XLSX.writeFile(wb, `የወንጌል_አገልግሎት_ተሳትፎና_መቶኛ_${currentYear}.xlsx`);
  };

  const cardIcons = [Users, UserCheck, Wallet, UserX, UserMinus];

  return (
    <div className="space-y-5">
      {/* Printable Header */}
      <div className="hidden print:block text-center pb-3 mb-3 border-b-2 border-slate-800">
        <h1 className="text-lg font-extrabold">የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን</h1>
        <h2 className="text-sm font-bold">
          የወንጌል አገልግሎት — የአባላት፣ የክፍያ እና የተሳትፎ መቶኛ ማጠቃለያ ({currentYear} ዓ/ም)
        </h2>
        <p className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
          የታተመበት ቀንና ሰዓት፦ {formatDualDateTimeText(getAdjustedNow())}
        </p>
      </div>

      {/* Header & Action Controls */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-rose-700">
              <Percent className="w-4 h-4 shrink-0" />
              <span>{t('የወንጌል አገልግሎት ተሳትፎና መቶኛ ትንተና', 'Evangelism Participation & Percentage Breakdown')}</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              {t(
                'ከቤተክርስቲያኒቱ አባላት አንጻር የወንጌል አገልግሎት አባላት፣ እየከፈሉ ያሉ፣ ያቋረጡ እና ያልተሳተፉ (ወንድ / ሴት / ድምር / መቶኛ)',
                'Evangelism Membership, Active Contributors, Discontinued & Non-Participating Breakdown (M / F / Total / %)'
              )}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
          </div>
        </div>

        {/* 5 Responsive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {stats.rows.map((row, idx) => {
            const Icon = cardIcons[idx] || Users;
            return (
              <div
                key={row.id}
                className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col justify-between gap-2 ${row.accentClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-extrabold leading-snug">
                    {t(row.titleAm, row.titleEn)}
                  </span>
                  <Icon className="w-4 h-4 shrink-0 opacity-85 mt-0.5" />
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-extrabold tabular-nums">
                      {row.total.toLocaleString()}
                    </span>
                    <span className="text-sm font-black tabular-nums px-2 py-0.5 rounded-lg bg-black/10">
                      {row.churchShareDisplay}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-current/15 grid grid-cols-2 gap-1.5 text-[11px] font-bold tabular-nums">
                    <div>
                      <span className="opacity-75">{t('ወንድ:', 'Male:')} </span>
                      <span>{row.male}</span>{' '}
                      <span className="opacity-80">({row.malePctDisplay})</span>
                    </div>
                    <div className="text-right">
                      <span className="opacity-75">{t('ሴት:', 'Female:')} </span>
                      <span>{row.female}</span>{' '}
                      <span className="opacity-80">({row.femalePctDisplay})</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5-Row Detailed Table (M / F / Total / %%) */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] print:min-w-0 text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold">
                  <th className="py-3 px-3 text-left">{t('ምድብ / መለኪያ', 'Category')}</th>
                  <th className="py-3 px-3 text-right">{t('ወንድ (ብዛት / %)', 'Male (Count / %)')}</th>
                  <th className="py-3 px-3 text-right">{t('ሴት (ብዛት / %)', 'Female (Count / %)')}</th>
                  <th className="py-3 px-3 text-right">{t('ድምር (ብዛት)', 'Total')}</th>
                  <th className="py-3 px-3 text-right">{t('ከጠቅላላ ቤተክርስቲያን (%)', '% of Church Total')}</th>
                  <th className="py-3 px-3 text-right">{t('ከወንጌል አባላት (%)', '% of Evang. Members')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-slate-900">{t(r.titleAm, r.titleEn)}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{t(r.subtitleAm, r.subtitleEn)}</div>
                      <div className="mt-1.5 h-1.5 w-full max-w-[220px] rounded-full bg-slate-100 overflow-hidden print:hidden">
                        <div
                          className={`h-full rounded-full ${r.barClass}`}
                          style={{ width: `${Math.min(100, Math.max(0, r.churchSharePct))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <span className="font-extrabold text-slate-900">{r.male.toLocaleString()}</span>
                      <span className="ml-1.5 text-[11px] font-bold text-slate-500">({r.malePctDisplay})</span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <span className="font-extrabold text-slate-900">{r.female.toLocaleString()}</span>
                      <span className="ml-1.5 text-[11px] font-bold text-slate-500">({r.femalePctDisplay})</span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
                      {r.total.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-extrabold text-slate-900">
                        {r.churchShareDisplay}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-900 tabular-nums whitespace-nowrap">
                      {r.evangShareDisplay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Per-Chapel Evangelism Breakdown */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Church className="w-4 h-4 text-rose-700 shrink-0" />
            <span>
              {t(
                'በ10ሩም ቻፕሎች ደረጃ የወንጌል አገልግሎት አባልነትና የክፍያ ሁኔታ',
                'Evangelism Membership & Payment Breakdown by Chapel'
              )}
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t(
              'አባል ሆኖ የሚከፍል / የማይከፍል / ያቋረጠ / አባል ያልሆነ በየቻፕሉ ተለይቶ የቀረበ',
              'Paying / Not Paying / Discontinued / Non-Member breakdown across all 10 Chapels'
            )}
          </p>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] print:min-w-0 text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3 text-left">{t('ቻፕል (አጥቢያ)', 'Chapel')}</th>
                  <th className="py-2.5 px-3 text-right">{t('ጠቅላላ አባላት', 'Total')}</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-900/40">{EVANGELISM_MASTER_STATUS_META.paying.shortAm}</th>
                  <th className="py-2.5 px-3 text-right bg-blue-900/40">{EVANGELISM_MASTER_STATUS_META.unpaid.shortAm}</th>
                  <th className="py-2.5 px-3 text-right bg-rose-900/40">{EVANGELISM_MASTER_STATUS_META.discontinued.shortAm}</th>
                  <th className="py-2.5 px-3 text-right bg-slate-800">{EVANGELISM_MASTER_STATUS_META.not_member.shortAm}</th>
                  <th className="py-2.5 px-3 text-right">{t('የወንጌል አባላት (%)', 'Evang. %')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chapelBreakdown.chapelRows.map((cr) => (
                  <tr key={cr.chapel} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-extrabold text-slate-900">{cr.chapel}</td>
                    <td className="py-2 px-3 text-right font-bold tabular-nums">{cr.totalMembers.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      <span className="font-extrabold text-emerald-800">{cr.payingTotal.toLocaleString()}</span>
                      <span className="ml-1 text-[10px] text-slate-500">({formatPct(cr.payingTotal, cr.totalMembers)})</span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      <span className="font-extrabold text-blue-800">{cr.unpaidTotal.toLocaleString()}</span>
                      <span className="ml-1 text-[10px] text-slate-500">({formatPct(cr.unpaidTotal, cr.totalMembers)})</span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      <span className="font-extrabold text-rose-700">{cr.discontinuedTotal.toLocaleString()}</span>
                      <span className="ml-1 text-[10px] text-slate-500">({formatPct(cr.discontinuedTotal, cr.totalMembers)})</span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      <span className="font-bold text-slate-700">{cr.notMemberTotal.toLocaleString()}</span>
                      <span className="ml-1 text-[10px] text-slate-400">({formatPct(cr.notMemberTotal, cr.totalMembers)})</span>
                    </td>
                    <td className="py-2 px-3 text-right font-black text-blue-900 tabular-nums">
                      {formatPct(cr.evangMemberTotal, cr.totalMembers)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-950">
                  <td className="py-2.5 px-3">{chapelBreakdown.totals.chapel}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{chapelBreakdown.totals.totalMembers.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-900 tabular-nums">{chapelBreakdown.totals.payingTotal.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-blue-900 tabular-nums">{chapelBreakdown.totals.unpaidTotal.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-rose-900 tabular-nums">{chapelBreakdown.totals.discontinuedTotal.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-slate-800 tabular-nums">{chapelBreakdown.totals.notMemberTotal.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-blue-950 tabular-nums">
                    {formatPct(chapelBreakdown.totals.evangMemberTotal, chapelBreakdown.totals.totalMembers)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Sync from Church Registry & Interactive Per-Member Status Manager */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">
              {t(
                'የወንጌል አገልግሎት አባላት የክፍያና የተሳትፎ ሁኔታ መቆጣጠሪያ',
                'Member Participation & Payment Status Manager'
              )}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'የእያንዳንዱን አባል ሁኔታ (እየከፈለ ያለ / አባል / ያቋረጠ / ያልተሳተፈ) በቀጥታ ይቀይሩ ወይም ከቤተክርስቲያን ዋና ቋት ያስገቡ።',
                'Update each member status (Paying / Active / Discontinued / Not Participating) or sync from Church Master Registry.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={syncDefaultStatus}
              onChange={(e) => setSyncDefaultStatus(e.target.value as EvangelismStatusKey)}
              className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
              aria-label={t('ሲገቡ የሚሰጣቸው ሁኔታ', 'Default sync status')}
            >
              <option value="not_participating">{t('እንደ ያልተሳተፈ አስገባ', 'Sync as Not Participating')}</option>
              <option value="active_unpaid">{t('እንደ ንቁ አባል አስገባ', 'Sync as Active Member')}</option>
              <option value="paying">{t('እንደ እየከፈለ ያለ አስገባ', 'Sync as Paying Member')}</option>
            </select>
            <button
              type="button"
              onClick={handleSyncAllChurchMembers}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>
                {t(
                  `ከዋናው ቋት አስገባ (${missingChurchCount})`,
                  `Sync from Registry (${missingChurchCount})`
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenAddMember}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
            >
              <span>{t('+ በግል አባል ጨምር', '+ Add Individual')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('በስም ወይም በስልክ ፈልግ...', 'Search by name or phone...')}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: t(`ሁሉም (${evangMembers.length})`, `All (${evangMembers.length})`) },
                { id: 'paying', label: t(`እየከፈሉ ያሉ (${stats.payingTotal})`, `Paying (${stats.payingTotal})`) },
                { id: 'active_unpaid', label: t('ንቁ (ክፍያ ያልጀመሩ)', 'Active Unpaid') },
                { id: 'discontinued', label: t(`ያቋረጡ (${stats.discontinuedTotal})`, `Discontinued (${stats.discontinuedTotal})`) },
                { id: 'not_participating', label: t('ያልተሳተፉ', 'Not Participating') }
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  statusFilter === btn.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3 text-left w-10">#</th>
                  <th className="py-2.5 px-3 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                  <th className="py-2.5 px-3 text-center">{t('ጾታ', 'Gender')}</th>
                  <th className="py-2.5 px-3 text-left">{t('ስልክ', 'Phone')}</th>
                  <th className="py-2.5 px-3 text-left">{t('የአሁን ሁኔታ', 'Status')}</th>
                  <th className="py-2.5 px-3 text-right">{t('ሁኔታ ቀይር', 'Update Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {t(
                        'በተመረጠው ማጣሪያ የተመዘገበ አባል የለም። «ከዋናው ቋት አስገባ» ወይም «በግል አባል ጨምር» ይጠቀሙ።',
                        'No members match this filter. Use Sync from Registry or Add Individual.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredMembers.slice(0, 200).map((m, idx) => {
                    const key = classifyEvangelismMemberStatus(m.status);
                    const meta = EVANGELISM_STATUS_LABELS[key];
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-slate-400 tabular-nums">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{m.name}</td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-700">{m.gender}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{m.phone || '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg border text-[11px] font-bold ${meta.badgeClass}`}>
                            {t(meta.am, meta.en)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <select
                            value={key}
                            onChange={(e) =>
                              handleChangeMemberStatus(m.id, e.target.value as EvangelismStatusKey)
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-800 cursor-pointer"
                            aria-label={t(`የ${m.name} ሁኔታ`, `Status for ${m.name}`)}
                          >
                            <option value="paying">{EVANGELISM_STATUS_LABELS.paying.am}</option>
                            <option value="active_unpaid">{EVANGELISM_STATUS_LABELS.active_unpaid.am}</option>
                            <option value="discontinued">{EVANGELISM_STATUS_LABELS.discontinued.am}</option>
                            <option value="not_participating">{EVANGELISM_STATUS_LABELS.not_participating.am}</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredMembers.length > 200 && (
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] font-semibold text-slate-500">
              {t(
                `በመጀመሪያ 200 ውጤቶች እየታዩ ነው (ከ${filteredMembers.length}) — ለተለየ ሰው ለማየት በስም ይፈልጉ።`,
                `Showing first 200 of ${filteredMembers.length} — use search to filter.`
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
