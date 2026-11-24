import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  Download,
  Printer,
  Search,
  Users,
  Baby,
  GraduationCap,
  Home,
  Building2,
  ArrowUpRight,
  Briefcase,
  Package,
  HeartHandshake,
  Globe2,
  FileCheck2
} from 'lucide-react';
import {
  AnnualPlanItem,
  ChoirMember,
  ChurchChild,
  ChurchMember,
  DepartmentWorkspaceData,
  MinistrySubmission,
  MissionaryScope,
  OrgUnitId,
  PlanDispatchItem,
  SpiritualMember,
  Student,
  Teacher
} from '../types';
import {
  computeChurchOverviewStatistics,
  computeExtendedChurchStats
} from '../utils/churchOverviewStats';
import { resolveOfficialChapel } from '../utils/memberCodeGenerator';
import { ChurchMemberBreakdownSection } from './ChurchMemberBreakdownSection';
import { computeMemberAgeCohorts } from '../utils/chapelDemographics';
import { useLanguage } from '../context/LanguageContext';
import { ExportPhotoButton } from './ExportPhotoButton';

interface ChurchStatisticsDashboardTabProps {
  currentYear: string;
  classList: string[];
  studentsByClass: { [className: string]: Student[] };
  churchMembers: ChurchMember[];
  churchChildren: ChurchChild[];
  chapelList: string[];
  loggedInChapel?: string | null;
  onNavigateTab?: (tabId: string) => void;
  onNavigateUnit?: (unitId: OrgUnitId) => void;
  departmentDataMap?: { [unitId: string]: DepartmentWorkspaceData };
  teachers?: Teacher[];
  choirMembers?: ChoirMember[];
  spiritualMembers?: SpiritualMember[];
  childrenPlans?: AnnualPlanItem[];
  submissions?: MinistrySubmission[];
  planDispatches?: PlanDispatchItem[];
}

type ViewFilter = 'all' | 'departments' | 'chapels' | 'sunday_school' | 'members_detail';

const MISSIONARY_SCOPE_LABELS: Record<MissionaryScope, { am: string; en: string }> = {
  international: { am: 'አለም አቀፋዊ ሚሽነሪ', en: 'International Missionary' },
  national: { am: 'አገር አቀፋዊ ሚሽነሪ', en: 'National Missionary' },
  regional: { am: 'ክልላዊ ሚሽነሪ', en: 'Regional Missionary' },
  local: { am: 'አከባቢያዊ ሚሽነሪ', en: 'Local Missionary' }
};

export const ChurchStatisticsDashboardTab: React.FC<ChurchStatisticsDashboardTabProps> = ({
  currentYear,
  classList,
  studentsByClass,
  churchMembers,
  churchChildren,
  chapelList,
  loggedInChapel,
  onNavigateTab,
  onNavigateUnit,
  departmentDataMap = {},
  teachers = [],
  choirMembers = [],
  spiritualMembers = [],
  childrenPlans = [],
  submissions = [],
  planDispatches = []
}) => {
  const { t, unitName, chapelLabel, classLabel } = useLanguage();
  const kpiSummaryRef = useRef<HTMLElement | null>(null);
  const sec1MatrixRef = useRef<HTMLElement | null>(null);
  const sec2ChapelRef = useRef<HTMLElement | null>(null);
  const sec2bChapelChildrenAgeRef = useRef<HTMLDivElement | null>(null);
  const sec3DeptsRef = useRef<HTMLElement | null>(null);
  const sec4aHrRef = useRef<HTMLElement | null>(null);
  const sec4bAssetsRef = useRef<HTMLElement | null>(null);
  const sec4cMissionariesRef = useRef<HTMLElement | null>(null);
  const sec4dCompassionYouthRef = useRef<HTMLElement | null>(null);
  const sec5WorkflowRef = useRef<HTMLElement | null>(null);
  const sec6ChildrenAgeRef = useRef<HTMLElement | null>(null);
  const sec7SundayClassRef = useRef<HTMLElement | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showChapelChildAgeBreakdown, setShowChapelChildAgeBreakdown] = useState<boolean>(false);

  const scopedChurchMembers = useMemo(() => {
    if (!loggedInChapel) return churchMembers;
    const targetChapel = resolveOfficialChapel(loggedInChapel);
    return churchMembers.filter(
      (m) => resolveOfficialChapel(m.chapel || '') === targetChapel
    );
  }, [churchMembers, loggedInChapel]);

  const memberAgeCohorts = useMemo(
    () => computeMemberAgeCohorts(scopedChurchMembers, parseInt(currentYear, 10) || 2019),
    [scopedChurchMembers, currentYear]
  );

  const stats = useMemo(
    () =>
      computeChurchOverviewStatistics({
        currentYear,
        classList,
        studentsByClass,
        churchMembers,
        churchChildren,
        chapelList,
        scopedChapel: loggedInChapel
      }),
    [currentYear, classList, studentsByClass, churchMembers, churchChildren, chapelList, loggedInChapel]
  );

  const ext = useMemo(
    () =>
      computeExtendedChurchStats({
        currentYear,
        churchMembers,
        chapelList,
        scopedChapel: loggedInChapel,
        departmentDataMap,
        teachers,
        choirMembers,
        spiritualMembers,
        childrenPlans,
        submissions,
        planDispatches
      }),
    [
      currentYear,
      churchMembers,
      chapelList,
      loggedInChapel,
      departmentDataMap,
      teachers,
      choirMembers,
      spiritualMembers,
      childrenPlans,
      submissions,
      planDispatches
    ]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredChapelRows = useMemo(() => {
    if (!normalizedSearch) return stats.chapelRows;
    return stats.chapelRows.filter(
      (row) =>
        row.chapelName.toLowerCase().includes(normalizedSearch) ||
        chapelLabel(row.chapelName).toLowerCase().includes(normalizedSearch)
    );
  }, [stats.chapelRows, normalizedSearch, chapelLabel]);

  const filteredSundayClassRows = useMemo(() => {
    if (!normalizedSearch) return stats.sundaySchoolPerClass;
    return stats.sundaySchoolPerClass.filter(
      (row) =>
        row.className.toLowerCase().includes(normalizedSearch) ||
        classLabel(row.className).toLowerCase().includes(normalizedSearch)
    );
  }, [stats.sundaySchoolPerClass, normalizedSearch, classLabel]);

  const filteredOrgUnitRows = useMemo(() => {
    if (!normalizedSearch) return ext.orgUnitRows;
    return ext.orgUnitRows.filter(
      (row) =>
        row.nameAm.toLowerCase().includes(normalizedSearch) ||
        unitName(row.unitId, row.nameAm).toLowerCase().includes(normalizedSearch) ||
        row.code.toLowerCase().includes(normalizedSearch)
    );
  }, [ext.orgUnitRows, normalizedSearch, unitName]);

  const hasUnspecifiedMaster =
    stats.membersSummary.unspecified > 0 ||
    stats.childrenSummary.unspecified > 0 ||
    stats.sundaySchoolSummary.unspecified > 0 ||
    ext.hrTotal.counts.unspecified > 0 ||
    ext.beneficiariesTotal.counts.unspecified > 0 ||
    ext.missionariesTotal.counts.unspecified > 0 ||
    ext.allDeptDirectMembersSummary.unspecified > 0;

  const hasUnspecifiedChapelMembers = stats.chapelGrandTotal.members.unspecified > 0;
  const hasUnspecifiedChapelChildren = stats.chapelGrandTotal.children.unspecified > 0;
  const hasUnspecifiedDeptPeople = ext.orgUnitGrandTotal.peopleCounts.unspecified > 0;

  const pct = (part: number, whole: number) =>
    whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%';

  const combinedChurchPopulationMale =
    stats.membersSummary.male + stats.childrenSummary.male;
  const combinedChurchPopulationFemale =
    stats.membersSummary.female + stats.childrenSummary.female;
  const combinedChurchPopulationUnspecified =
    stats.membersSummary.unspecified + stats.childrenSummary.unspecified;
  const combinedChurchPopulationTotal =
    stats.membersSummary.total + stats.childrenSummary.total;

  // Build unified Section 1 Master Summary rows
  const masterMatrixRows = useMemo(() => {
    const rows: {
      id: string;
      num: number;
      group: 'master' | 'ministry';
      label: string;
      male: number | null;
      female: number | null;
      unspecified: number;
      total: number;
      note: string;
      targetUnit?: OrgUnitId;
    }[] = [
      {
        id: 'church_members',
        num: 1,
        group: 'master',
        label: t('የቤተክርስቲያኒቱ አባላት (ዋናው ቋት)', 'Church Members (Master Registry)'),
        male: stats.membersSummary.male,
        female: stats.membersSummary.female,
        unspecified: stats.membersSummary.unspecified,
        total: stats.membersSummary.total,
        note: t(
          `ጠቅላላ ቤተሰቦች፦ ${stats.membersSummary.totalHouseholds.toLocaleString()} (1-ሰው: ${stats.membersSummary.soloHouseholds.toLocaleString()} · 2+ አባላት: ${stats.membersSummary.multiMemberHouseholds.toLocaleString()})`,
          `Households: ${stats.membersSummary.totalHouseholds.toLocaleString()} (Solo: ${stats.membersSummary.soloHouseholds.toLocaleString()} · 2+: ${stats.membersSummary.multiMemberHouseholds.toLocaleString()})`
        ),
        targetUnit: 'office'
      },
      {
        id: 'church_children',
        num: 2,
        group: 'master',
        label: t('የቤተክርስቲያኒቱ የልጆች መረጃ (0–14 ዓመት)', 'Church Children Registry (Ages 0–14)'),
        male: stats.childrenSummary.male,
        female: stats.childrenSummary.female,
        unspecified: stats.childrenSummary.unspecified,
        total: stats.childrenSummary.total,
        note: stats.childrenAgeStats.cohorts.map((c) => `${c.key}: ${c.total}`).join(' · '),
        targetUnit: 'children_ministry'
      },
      {
        id: 'sunday_school_students',
        num: 3,
        group: 'master',
        label: t(
          `የሰንበት ትምህርት ቤት ተማሪዎች (${currentYear} ዓ/ም)`,
          `Sunday School Students (${currentYear})`
        ),
        male: stats.sundaySchoolSummary.male,
        female: stats.sundaySchoolSummary.female,
        unspecified: stats.sundaySchoolSummary.unspecified,
        total: stats.sundaySchoolSummary.total,
        note: t(
          `ከ0–14 ንዑስ ድምር፦ ${stats.sundaySchoolAgeStats.subtotal0to14.total.toLocaleString()} · ንቁ ክፍሎች፦ ${stats.sundaySchoolPerClass.filter((r) => r.total > 0).length}`,
          `Ages 0–14 subtotal: ${stats.sundaySchoolAgeStats.subtotal0to14.total.toLocaleString()} · Active classes: ${stats.sundaySchoolPerClass.filter((r) => r.total > 0).length}`
        ),
        targetUnit: 'children_ministry'
      }
    ];

    if (!loggedInChapel) {
      rows.push(
        {
          id: 'sunday_teachers',
          num: 4,
          group: 'master',
          label: t('የሰንበት ትምህርት ቤት መምህራን', 'Sunday School Teachers'),
          male: null,
          female: null,
          unspecified: ext.teachersCount,
          total: ext.teachersCount,
          note: t('በክፍል የተመደቡ መምህራን', 'Assigned Sunday school teachers'),
          targetUnit: 'children_ministry'
        },
        {
          id: 'children_choir_spiritual',
          num: 5,
          group: 'master',
          label: t(
            'የልጆች አገልግሎት መዘምራን እና መንፈሳዊ ቡድኖች',
            'Children Choirs & Spiritual Groups'
          ),
          male: ext.choirSummary.male + ext.spiritualGroupSummary.male,
          female: ext.choirSummary.female + ext.spiritualGroupSummary.female,
          unspecified: ext.choirSummary.unspecified + ext.spiritualGroupSummary.unspecified,
          total: ext.choirSummary.total + ext.spiritualGroupSummary.total,
          note: t(
            `መዘምራን፦ ${ext.choirSummary.total} · መንፈሳዊ ቡድኖች፦ ${ext.spiritualGroupSummary.total}`,
            `Choirs: ${ext.choirSummary.total} · Spiritual groups: ${ext.spiritualGroupSummary.total}`
          ),
          targetUnit: 'children_ministry'
        }
      );
    }

    rows.push(
      {
        id: 'chapel_youth',
        num: rows.length + 1,
        group: 'master',
        label: t('በየቻፕሉ ያሉ ወጣቶች (15–29 ዓመት / የተመዘገቡ)', 'Chapel Youth (Ages 15–29 / Registered)'),
        male: ext.chapelYouthTotal.male,
        female: ext.chapelYouthTotal.female,
        unspecified: ext.chapelYouthTotal.unspecified,
        total: ext.chapelYouthTotal.total,
        note: t('ከዋናው የቤተክርስቲያን ቋት በየቻፕሉ የተለዩ ወጣቶች', 'Youth extracted across chapels from master registry'),
        targetUnit: 'chapels_dept'
      },
      {
        id: 'chapel_women',
        num: rows.length + 2,
        group: 'master',
        label: t(
          'በየቻፕሉ ያሉ ሴቶች (ባለትዳር እና ራሳቸው አባወራ)',
          'Chapel Women (Married & Female Heads)'
        ),
        male: 0,
        female: ext.chapelWomenTotal.eligibleTotal,
        unspecified: 0,
        total: ext.chapelWomenTotal.eligibleTotal,
        note: t(
          `የባል ሚስት (ባለትዳር)፦ ${ext.chapelWomenTotal.married.toLocaleString()} · ራሳቸው አባወራ፦ ${ext.chapelWomenTotal.femaleHead.toLocaleString()}`,
          `Married wives: ${ext.chapelWomenTotal.married.toLocaleString()} · Female household heads: ${ext.chapelWomenTotal.femaleHead.toLocaleString()}`
        ),
        targetUnit: 'women_ministry'
      }
    );

    if (!loggedInChapel) {
      rows.push(
        {
          id: 'hr_ministers',
          num: rows.length + 1,
          group: 'ministry',
          label: t(
            'የቤተክርስቲያኒቱ የሰው ኃይል — የሙሉ ጊዜ አገልጋዮች',
            'Church HR — Full-Time Ministers'
          ),
          male: ext.hrFullTime.counts.male,
          female: ext.hrFullTime.counts.female,
          unspecified: ext.hrFullTime.counts.unspecified,
          total: ext.hrFullTime.counts.total,
          note: t(
            `ወርሃዊ ደመወዝ፦ ${ext.hrFullTime.monthlySalary.toLocaleString()} ብር`,
            `Monthly salary: ${ext.hrFullTime.monthlySalary.toLocaleString()} ETB`
          ),
          targetUnit: 'admin_finance'
        },
        {
          id: 'hr_admin',
          num: rows.length + 2,
          group: 'ministry',
          label: t(
            'የቤተክርስቲያኒቱ የሰው ኃይል — የአስተዳደር ሠራተኞች',
            'Church HR — Administration Staff'
          ),
          male: ext.hrAdminStaff.counts.male,
          female: ext.hrAdminStaff.counts.female,
          unspecified: ext.hrAdminStaff.counts.unspecified,
          total: ext.hrAdminStaff.counts.total,
          note: t(
            `ወርሃዊ ደመወዝ፦ ${ext.hrAdminStaff.monthlySalary.toLocaleString()} ብር`,
            `Monthly salary: ${ext.hrAdminStaff.monthlySalary.toLocaleString()} ETB`
          ),
          targetUnit: 'admin_finance'
        }
      );
    }

    rows.push(
      {
        id: 'youth_choir',
        num: rows.length + 1,
        group: 'ministry',
        label: t(
          'የወጣቶች አገልግሎት — የመዘምራን ህብረት (ሀ–መ፣ ሴቶች፣ ፋሬስ፣ ባማ)',
          'Youth Ministry — Choir Fellowships (7 Groups)'
        ),
        male: ext.youthChoirSummary.male,
        female: ext.youthChoirSummary.female,
        unspecified: ext.youthChoirSummary.unspecified,
        total: ext.youthChoirSummary.total,
        note: t('በወጣቶች አገልግሎት የተመዘገቡ መዘምራን', 'Youth choir members across all choir teams'),
        targetUnit: 'youth_ministry'
      },
      {
        id: 'youth_worship',
        num: rows.length + 2,
        group: 'ministry',
        label: t(
          'የወጣቶች አገልግሎት — የመዝሙር መሪዎች ህብረት',
          'Youth Ministry — Worship Leaders Fellowship'
        ),
        male: ext.youthWorshipLeadersSummary.male,
        female: ext.youthWorshipLeadersSummary.female,
        unspecified: ext.youthWorshipLeadersSummary.unspecified,
        total: ext.youthWorshipLeadersSummary.total,
        note: t('የአምልኮ እና የመዝሙር መሪዎች', 'Worship & song leaders fellowship'),
        targetUnit: 'youth_ministry'
      },
      {
        id: 'youth_discipleship',
        num: rows.length + 3,
        group: 'ministry',
        label: t(
          'የወጣቶች አገልግሎት — የደቀ መዝሙርነት ትምህርት (መቅህማ እና ቢቲሲፒ)',
          'Youth Ministry — Discipleship Training (Mekhema & BTCP)'
        ),
        male: ext.youthDiscipleshipSummary.male,
        female: ext.youthDiscipleshipSummary.female,
        unspecified: ext.youthDiscipleshipSummary.unspecified,
        total: ext.youthDiscipleshipSummary.total,
        note: t('የመቅህማ እና የቢቲሲፒ (BTCP) ተማሪዎች', 'Mekhema & BTCP discipleship trainees'),
        targetUnit: 'youth_ministry'
      },
      {
        id: 'beneficiaries_perm',
        num: rows.length + 4,
        group: 'ministry',
        label: t('ፍቅርና ርኅራሄ — ቋሚ ተረጂዎች', 'Love & Compassion — Permanent Beneficiaries'),
        male: ext.beneficiariesPermanent.counts.male,
        female: ext.beneficiariesPermanent.counts.female,
        unspecified: ext.beneficiariesPermanent.counts.unspecified,
        total: ext.beneficiariesPermanent.counts.total,
        note: t(
          `ወርሃዊ ድጋፍ፦ ${ext.beneficiariesPermanent.monthlyAid.toLocaleString()} ብር`,
          `Monthly aid: ${ext.beneficiariesPermanent.monthlyAid.toLocaleString()} ETB`
        ),
        targetUnit: 'love_compassion'
      },
      {
        id: 'beneficiaries_temp',
        num: rows.length + 5,
        group: 'ministry',
        label: t('ፍቅርና ርኅራሄ — ጊዜያዊ ተረጂዎች', 'Love & Compassion — Temporary Beneficiaries'),
        male: ext.beneficiariesTemporary.counts.male,
        female: ext.beneficiariesTemporary.counts.female,
        unspecified: ext.beneficiariesTemporary.counts.unspecified,
        total: ext.beneficiariesTemporary.counts.total,
        note: t(
          `ወርሃዊ ድጋፍ፦ ${ext.beneficiariesTemporary.monthlyAid.toLocaleString()} ብር`,
          `Monthly aid: ${ext.beneficiariesTemporary.monthlyAid.toLocaleString()} ETB`
        ),
        targetUnit: 'love_compassion'
      }
    );

    if (!loggedInChapel) {
      rows.push(
        {
          id: 'missionaries',
          num: rows.length + 1,
          group: 'ministry',
          label: t(
            'የወንጌል አገልግሎት — ሚሽነሪዎች (አለም/አገር/ክልል/አከባቢ)',
            'Evangelism — Missionaries (Int’l / National / Regional / Local)'
          ),
          male: ext.missionariesTotal.counts.male,
          female: ext.missionariesTotal.counts.female,
          unspecified: ext.missionariesTotal.counts.unspecified,
          total: ext.missionariesTotal.counts.total,
          note: t(
            `ወርሃዊ ድጋፍ፦ ${ext.missionariesTotal.monthlySupport.toLocaleString()} ብር`,
            `Monthly support: ${ext.missionariesTotal.monthlySupport.toLocaleString()} ETB`
          ),
          targetUnit: 'evangelism'
        },
        {
          id: 'all_depts_rosters',
          num: rows.length + 2,
          group: 'ministry',
          label: t(
            'የ17ቱ የቤተክርስቲያን ዘርፎች እና መምሪያዎች የተመዘገቡ አባላት',
            'All 17 Church Departments Direct Rosters'
          ),
          male: ext.allDeptDirectMembersSummary.male,
          female: ext.allDeptDirectMembersSummary.female,
          unspecified: ext.allDeptDirectMembersSummary.unspecified,
          total: ext.allDeptDirectMembersSummary.total,
          note: t(
            `ጠቅላላ ገቢ፦ ${ext.orgUnitGrandTotal.income.toLocaleString()} · ወጪ፦ ${ext.orgUnitGrandTotal.expense.toLocaleString()} · ቀሪ፦ ${ext.orgUnitGrandTotal.balance.toLocaleString()} ብር`,
            `Income: ${ext.orgUnitGrandTotal.income.toLocaleString()} · Expense: ${ext.orgUnitGrandTotal.expense.toLocaleString()} · Balance: ${ext.orgUnitGrandTotal.balance.toLocaleString()} ETB`
          )
        }
      );
    }

    return rows;
  }, [stats, ext, currentYear, loggedInChapel, t]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const scopeText = loggedInChapel || 'ሁሉም አጥቢያ ቤተክርስቲያን (10 ቻፕሎች እና 17 ዘርፎች)';

    // Sheet 1: Complete Master Overview
    const sheet1Rows: (string | number)[][] = [
      [`የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን — አጠቃላይ የሁሉም መረጃዎች ማጠቃለያ (${currentYear} ዓ/ም)`],
      [`ወሰን፦ ${scopeText}`],
      [],
      ['ተ.ቁ', 'የመረጃ ምድብ', 'ወንድ', 'ሴት', 'ያልተገለጸ ጾታ', 'ጠቅላላ ድምር', 'ተጨማሪ ማብራሪያ'],
      ...masterMatrixRows.map((r) => [
        r.num,
        r.label,
        r.male === null ? '—' : r.male,
        r.female === null ? '—' : r.female,
        r.unspecified,
        r.total,
        r.note
      ]),
      [
        '',
        'ዋናው የቤተክርስቲያን ህዝብ ድምር (አባላት + ልጆች 0–14)',
        combinedChurchPopulationMale,
        combinedChurchPopulationFemale,
        combinedChurchPopulationUnspecified,
        combinedChurchPopulationTotal,
        `ንብረት ግምት፦ ${ext.assetsTotal.totalValue.toLocaleString()} ብር · ፋይናንስ ቀሪ፦ ${ext.orgUnitGrandTotal.balance.toLocaleString()} ብር`
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet1Rows), 'አጠቃላይ_ማጠቃለያ');

    // Sheet 2: Per-Chapel Complete Info (Households, Members, Youth, Women, Children)
    const sheet2Rows: (string | number)[][] = [
      [`የእያንዳንዱ ቻፕል ቤተሰብ፣ አባላት፣ ወጣቶች፣ ሴቶች እና ልጆች መረጃ (${currentYear} ዓ/ም)`],
      [],
      [
        'ተ.ቁ',
        'የቻፕል ስም',
        'ጠቅላላ ቤተሰብ',
        '1-ሰው ቤተሰብ',
        '2+ አባላት',
        'አባላት ወንድ',
        'አባላት ሴት',
        'አባላት ድምር',
        'ወጣቶች ወንድ',
        'ወጣቶች ሴት',
        'ወጣቶች ድምር',
        'ሴቶች (ባለትዳር)',
        'ሴቶች (አባወራ)',
        'ሴቶች ድምር',
        'ልጆች ወንድ',
        'ልጆች ሴት',
        'ልጆች ድምር',
        'ጠቅላላ ሰዎች (አባላት + ልጆች)'
      ],
      ...stats.chapelRows.map((r, idx) => {
        const demo = ext.chapelDemographicsByName.get(r.chapelName);
        return [
          idx + 1,
          r.chapelName,
          r.totalHouseholds,
          r.soloHouseholds,
          r.multiMemberHouseholds,
          r.members.male,
          r.members.female,
          r.members.total,
          demo?.youthMale || 0,
          demo?.youthFemale || 0,
          demo?.youthTotal || 0,
          demo?.womenMarried || 0,
          demo?.womenFemaleHead || 0,
          demo?.womenTotal || 0,
          r.children.male,
          r.children.female,
          r.children.total,
          r.combinedPeopleTotal
        ];
      }),
      [
        '',
        'ጠቅላላ ድምር',
        stats.chapelGrandTotal.totalHouseholds,
        stats.chapelGrandTotal.soloHouseholds,
        stats.chapelGrandTotal.multiMemberHouseholds,
        stats.chapelGrandTotal.members.male,
        stats.chapelGrandTotal.members.female,
        stats.chapelGrandTotal.members.total,
        ext.chapelYouthTotal.male,
        ext.chapelYouthTotal.female,
        ext.chapelYouthTotal.total,
        ext.chapelWomenTotal.married,
        ext.chapelWomenTotal.femaleHead,
        ext.chapelWomenTotal.eligibleTotal,
        stats.chapelGrandTotal.children.male,
        stats.chapelGrandTotal.children.female,
        stats.chapelGrandTotal.children.total,
        stats.chapelGrandTotal.combinedPeopleTotal
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet2Rows), 'የቻፕሎች_ሙሉ_መረጃ');

    if (!loggedInChapel) {
      // Sheet 3: All 17 Departments & Ministries
      const sheet3Rows: (string | number)[][] = [
        [`የሁሉም የቤተክርስቲያን ዘርፎች እና መምሪያዎች (17 ክፍሎች) ማጠቃለያ (${currentYear} ዓ/ም)`],
        [],
        [
          'ኮድ',
          'የመምሪያ / ዘርፍ ስም',
          'ወንድ',
          'ሴት',
          'ያልተገለጸ',
          'ድምር',
          'ተግባራት',
          'ዕቅዶች',
          'ገቢ (ብር)',
          'ወጪ (ብር)',
          'ቀሪ ሂሳብ (ብር)'
        ],
        ...ext.orgUnitRows.map((u) => [
          u.code,
          u.nameAm,
          u.peopleCounts.male,
          u.peopleCounts.female,
          u.peopleCounts.unspecified,
          u.peopleCounts.total,
          u.activitiesCount,
          u.plansCount,
          u.supportsFinance ? u.income : '—',
          u.supportsFinance ? u.expense : '—',
          u.supportsFinance ? u.balance : '—'
        ]),
        [
          '',
          'ጠቅላላ ድምር',
          ext.orgUnitGrandTotal.peopleCounts.male,
          ext.orgUnitGrandTotal.peopleCounts.female,
          ext.orgUnitGrandTotal.peopleCounts.unspecified,
          ext.orgUnitGrandTotal.peopleCounts.total,
          ext.orgUnitGrandTotal.activitiesCount,
          ext.orgUnitGrandTotal.plansCount,
          ext.orgUnitGrandTotal.income,
          ext.orgUnitGrandTotal.expense,
          ext.orgUnitGrandTotal.balance
        ]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet3Rows), '17_የዘርፎች_ማጠቃለያ');

      // Sheet 4: HR, Assets, Missionaries, Beneficiaries & Youth Groups
      const sheet4Rows: (string | number)[][] = [
        [`የሰው ኃይል (HR)፣ የንብረት ቆጠራ፣ ሚሽነሪዎች፣ ተረጂዎች እና የወጣቶች ህብረቶች (${currentYear} ዓ/ም)`],
        [],
        ['ምድብ', 'ዝርዝር', 'ወንድ', 'ሴት', 'ድምር', 'ብዛት / ዋጋ / ወርሃዊ ድጋፍ (ብር)'],
        [
          'የሰው ኃይል (HR)',
          'የሙሉ ጊዜ አገልጋዮች',
          ext.hrFullTime.counts.male,
          ext.hrFullTime.counts.female,
          ext.hrFullTime.counts.total,
          ext.hrFullTime.monthlySalary
        ],
        [
          'የሰው ኃይል (HR)',
          'የአስተዳደር ሠራተኞች',
          ext.hrAdminStaff.counts.male,
          ext.hrAdminStaff.counts.female,
          ext.hrAdminStaff.counts.total,
          ext.hrAdminStaff.monthlySalary
        ],
        [
          'ንብረት (Assets)',
          'ቋሚ ንብረት',
          '—',
          '—',
          ext.assetsFixed.totalQty,
          ext.assetsFixed.totalValue
        ],
        [
          'ንብረት (Assets)',
          'አላቂ ንብረት',
          '—',
          '—',
          ext.assetsConsumable.totalQty,
          ext.assetsConsumable.totalValue
        ],
        ...ext.missionariesByScope.map((ms) => [
          'የወንጌል አገልግሎት ሚሽነሪዎች',
          MISSIONARY_SCOPE_LABELS[ms.scope].am,
          ms.counts.male,
          ms.counts.female,
          ms.counts.total,
          ms.monthlySupport
        ]),
        [
          'ፍቅርና ርኅራሄ',
          'ቋሚ ተረጂዎች',
          ext.beneficiariesPermanent.counts.male,
          ext.beneficiariesPermanent.counts.female,
          ext.beneficiariesPermanent.counts.total,
          ext.beneficiariesPermanent.monthlyAid
        ],
        [
          'ፍቅርና ርኅራሄ',
          'ጊዜያዊ ተረጂዎች',
          ext.beneficiariesTemporary.counts.male,
          ext.beneficiariesTemporary.counts.female,
          ext.beneficiariesTemporary.counts.total,
          ext.beneficiariesTemporary.monthlyAid
        ],
        ...ext.youthByGroupBreakdown.map((yg) => [
          'የወጣቶች አገልግሎት ህብረቶች',
          yg.group,
          yg.counts.male,
          yg.counts.female,
          yg.counts.total,
          '—'
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet4Rows), 'ሰውኃይል_ንብረት_ሚሽነሪ_ተረጂ');
    }

    // Sheet 5: Per-Chapel Children Age Breakdown
    const sheet5Rows: (string | number)[][] = [
      [`የእያንዳንዱ ቻፕል ልጆች (0-14) በዕድሜ ምድብ (${currentYear} ዓ/ም)`],
      [],
      [
        'ተ.ቁ',
        'የቻፕል ስም',
        '0-3 ወንድ',
        '0-3 ሴት',
        '0-3 ድምር',
        '4-6 ወንድ',
        '4-6 ሴት',
        '4-6 ድምር',
        '7-9 ወንድ',
        '7-9 ሴት',
        '7-9 ድምር',
        '10-12 ወንድ',
        '10-12 ሴት',
        '10-12 ድምር',
        '13-14 ወንድ',
        '13-14 ሴት',
        '13-14 ድምር',
        'ጠቅላላ ወንድ',
        'ጠቅላላ ሴት',
        'ጠቅላላ ልጆች ድምር'
      ],
      ...stats.chapelRows.map((r, idx) => {
        const c = r.childrenAgeStats.cohorts;
        return [
          idx + 1,
          r.chapelName,
          c[0].male,
          c[0].female,
          c[0].total,
          c[1].male,
          c[1].female,
          c[1].total,
          c[2].male,
          c[2].female,
          c[2].total,
          c[3].male,
          c[3].female,
          c[3].total,
          c[4].male,
          c[4].female,
          c[4].total,
          r.children.male,
          r.children.female,
          r.children.total
        ];
      }),
      [
        '',
        'ጠቅላላ ድምር',
        stats.childrenAgeStats.cohorts[0].male,
        stats.childrenAgeStats.cohorts[0].female,
        stats.childrenAgeStats.cohorts[0].total,
        stats.childrenAgeStats.cohorts[1].male,
        stats.childrenAgeStats.cohorts[1].female,
        stats.childrenAgeStats.cohorts[1].total,
        stats.childrenAgeStats.cohorts[2].male,
        stats.childrenAgeStats.cohorts[2].female,
        stats.childrenAgeStats.cohorts[2].total,
        stats.childrenAgeStats.cohorts[3].male,
        stats.childrenAgeStats.cohorts[3].female,
        stats.childrenAgeStats.cohorts[3].total,
        stats.childrenAgeStats.cohorts[4].male,
        stats.childrenAgeStats.cohorts[4].female,
        stats.childrenAgeStats.cohorts[4].total,
        stats.childrenSummary.male,
        stats.childrenSummary.female,
        stats.childrenSummary.total
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet5Rows), 'ቻፕል_ልጆች_በዕድሜ');

    // Sheet 6: Sunday School Students by Class
    const sheet6Rows: (string | number)[][] = [
      [`የሰንበት ትምህርት ቤት ተማሪዎች በየክፍሉ (${currentYear} ዓ/ም)`],
      [],
      ['ተ.ቁ', 'ክፍል / ደረጃ', 'ወንድ', 'ሴት', 'ያልተገለጸ', 'ድምር', 'ከ0-14 ዓመት ድምር'],
      ...stats.sundaySchoolPerClass.map((row, idx) => [
        idx + 1,
        row.className,
        row.male,
        row.female,
        row.unspecified,
        row.total,
        row.subtotal0to14
      ]),
      [
        '',
        'ጠቅላላ የሰንበት ተማሪዎች ድምር',
        stats.sundaySchoolSummary.male,
        stats.sundaySchoolSummary.female,
        stats.sundaySchoolSummary.unspecified,
        stats.sundaySchoolSummary.total,
        stats.sundaySchoolAgeStats.subtotal0to14.total
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet6Rows), 'ሰንበት_ተማሪዎች_በክፍል');

    const safeScope = loggedInChapel ? `_${loggedInChapel}` : '';
    XLSX.writeFile(
      wb,
      `የቤተክርስቲያን_ሙሉ_መረጃ_ማጠቃለያ${safeScope}_${currentYear}ዓም.xlsx`
    );
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print-only Official Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4 text-center">
        <h1 className="text-lg font-extrabold text-slate-900">
          {t('የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን', 'Birbir Town Kale Heywet Church')}
        </h1>
        <p className="text-xs font-bold text-slate-700 mt-0.5">
          {t(
            `የቤተክርስቲያን አጠቃላይ የወንድ፣ የሴት እና የድምር ማጠቃለያ ሠንጠረዥ (${currentYear} ዓ/ም)`,
            `Complete Church Male, Female & Combined Summary Report (${currentYear})`
          )}
          {loggedInChapel ? ` — ${chapelLabel(loggedInChapel)}` : ''}
        </p>
      </div>

      {/* Header & Controls Bar */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-slate-900">
              <BarChart3 className="w-5 h-5 text-blue-800 shrink-0" />
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                {t(
                  `የቤተክርስቲያን አጠቃላይ የዳታ ማጠቃለያ (${currentYear} ዓ/ም)`,
                  `Complete Church Data Summary (${currentYear})`
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {loggedInChapel
                ? `${chapelLabel(loggedInChapel)} — ${t(
                    'የቤተሰብ፣ የአባላት፣ የወጣቶች፣ የሴቶች እና የልጆች ወንድ / ሴት / ድምር ስታቲስቲክስ',
                    'Household, member, youth, women, and children Male / Female / Total statistics'
                  )}`
                : t(
                    'ዋናው ቋት · 10ሩ ቻፕሎች · ወጣቶችና ሴቶች · ሰንበት ት/ቤት · 17ቱ ዘርፎች · የሰው ኃይል · ንብረት · ሚሽነሪዎች · ተረጂዎች · ፋይናንስ እና ዕቅዶች',
                    'Master Registry · 10 Chapels · Youth & Women · Sunday School · All 17 Departments · HR · Assets · Missionaries · Beneficiaries · Finance & Plans'
                  )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ቻፕል፣ ዘርፍ ወይም ክፍል ፈልግ...', 'Search chapel, unit, or class...')}
                className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 w-48 sm:w-56"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('ሙሉ Excel አውርድ (.xlsx)', 'Export Full Excel (.xlsx)')}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም / Print', 'Print')}</span>
            </button>
          </div>
        </div>

        {/* View Segment Switcher */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                viewFilter === 'all'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('ሁሉም የቤተክርስቲያን መረጃ', 'All Church Data')}
            </button>
            {!loggedInChapel && (
              <button
                type="button"
                onClick={() => setViewFilter('departments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  viewFilter === 'departments'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`ዘርፎች፣ የሰው ኃይልና ፋይናንስ (${ext.orgUnitRows.length})`, `Departments, HR & Finance (${ext.orgUnitRows.length})`)}
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewFilter('chapels')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                viewFilter === 'chapels'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(`ቻፕሎች (${stats.chapelRows.length})`, `Chapels (${stats.chapelRows.length})`)}
            </button>
            {!loggedInChapel && (
              <button
                type="button"
                onClick={() => setViewFilter('sunday_school')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  viewFilter === 'sunday_school'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`ሰንበት ት/ቤትና ልጆች (${stats.sundaySchoolPerClass.length})`, `Sunday School (${stats.sundaySchoolPerClass.length})`)}
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewFilter('members_detail')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                viewFilter === 'members_detail'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('ጥምቀት / ትምህርት / ስራ', 'Baptism / Education / Job')}
            </button>
          </div>

          {onNavigateTab && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => onNavigateTab('churchMasterTab')}
                className="inline-flex items-center gap-1 hover:text-blue-800 transition cursor-pointer whitespace-nowrap"
              >
                <span>{t('የቤተክርስቲያን ቋት', 'Master Registry')}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => onNavigateTab('churchChildrenTab')}
                className="inline-flex items-center gap-1 hover:text-blue-800 transition cursor-pointer whitespace-nowrap"
              >
                <span>{t('የልጆች ቋት', 'Children Registry')}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              {!loggedInChapel && (
                <>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('allStudentsMasterTab')}
                    className="inline-flex items-center gap-1 hover:text-blue-800 transition cursor-pointer whitespace-nowrap"
                  >
                    <span>{t('የሰንበት ተማሪዎች ቋት', 'Sunday Students')}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Top 4 KPI Cards (Flat Hairline Surfaces, Tabular Numerals, Zero-Pill Discipline) */}
      <section ref={kpiSummaryRef} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
            {t(`ዋና የቤተክርስቲያን አሃዞች (${currentYear} ዓ/ም)`, `Key Church Figures (${currentYear})`)}
          </h3>
          <ExportPhotoButton
            targetRef={kpiSummaryRef}
            fileName={`ዋና_የቤተክርስቲያን_አሃዞች${loggedInChapel ? `_${loggedInChapel}` : ''}_${currentYear}`}
            labelAm="በፎቶ (PNG)"
            labelEn="Photo (PNG)"
            variant="secondary"
            compact
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('የቤተክርስቲያኒቱ አባላት', 'Church Master Members')}</span>
            <Users className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {stats.membersSummary.total.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-between">
            <span>{t('ወንድ', 'Male')} {stats.membersSummary.male.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>{t('ሴት', 'Female')} {stats.membersSummary.female.toLocaleString()}</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-600 tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{t('ወጣቶች 15-29:', 'Youth 15-29:')} <strong className="text-blue-900">{memberAgeCohorts.youth15to29.toLocaleString()}</strong></span>
            <span className="text-slate-300">·</span>
            <span>{t('ጎልማሶች 30-59:', 'Adults 30-59:')} <strong className="text-emerald-800">{memberAgeCohorts.adults30to59.toLocaleString()}</strong></span>
            <span className="text-slate-300">·</span>
            <span>{t('አዛውንቶች 60+:', 'Seniors 60+:')} <strong className="text-purple-800">{memberAgeCohorts.seniors60Plus.toLocaleString()}</strong></span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('ጠቅላላ ቤተሰቦች (አባወራ/ቤተሰብ)', 'Total Households')}</span>
            <Home className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {stats.membersSummary.totalHouseholds.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-between">
            <span>{t('2+ አባላት', '2+ Members')} {stats.membersSummary.multiMemberHouseholds.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>{t('1-ሰው', 'Solo')} {stats.membersSummary.soloHouseholds.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t('የቤተክርስቲያኒቱ ልጆች (0–14)', 'Church Children (0–14)')}</span>
            <Baby className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {stats.childrenSummary.total.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-between">
            <span>{t('ወንድ', 'Male')} {stats.childrenSummary.male.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>{t('ሴት', 'Female')} {stats.childrenSummary.female.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t(`የሰንበት ት/ቤት ተማሪዎች (${currentYear})`, `Sunday School (${currentYear})`)}</span>
            <GraduationCap className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {stats.sundaySchoolSummary.total.toLocaleString()}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600 tabular-nums flex items-center justify-between">
            <span>{t('ወንድ', 'Male')} {stats.sundaySchoolSummary.male.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>{t('ሴት', 'Female')} {stats.sundaySchoolSummary.female.toLocaleString()}</span>
          </div>
        </div>
        </div>
      </section>

      {/* Section 1: Master Summary Matrix — ALL Church Datasets */}
      {viewFilter === 'all' && (
        <section ref={sec1MatrixRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {t(
                  '1. የቤተክርስቲያን አጠቃላይ የወንድ፣ የሴት እና የድምር ማጠቃለያ ሠንጠረዥ',
                  '1. Church-Wide Complete Male, Female & Combined Summary Table'
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'በቤተክርስቲያኒቱ ውስጥ ያሉ ሁሉም መረጃዎች (ዋና ቋት፣ ልጆች፣ ሰንበት ት/ቤት፣ ወጣቶች፣ ሴቶች፣ የሰው ኃይል፣ መዘምራን፣ ሚሽነሪዎች፣ ተረጂዎች እና 17ቱ ዘርፎች) በአንድ ሠንጠረዥ',
                  'All church data across master registry, children, Sunday school, youth, women, HR, choirs, missionaries, beneficiaries & 17 units in one view'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {!loggedInChapel && (
                <div className="text-xs font-semibold text-slate-600 tabular-nums">
                  {t('ፋይናንስ ቀሪ፦', 'Net Balance:')} {ext.orgUnitGrandTotal.balance.toLocaleString()} {t('ብር', 'ETB')}
                  <span className="text-slate-300 mx-1.5">·</span>
                  {t('ንብረት ግምት፦', 'Assets Value:')} {ext.assetsTotal.totalValue.toLocaleString()} {t('ብር', 'ETB')}
                </div>
              )}
              <ExportPhotoButton
                targetRef={sec1MatrixRef}
                fileName={`1_አጠቃላይ_የወንድ_ሴት_ድምር_ማጠቃለያ${loggedInChapel ? `_${loggedInChapel}` : ''}_${currentYear}`}
                labelAm="በፎቶ (PNG)"
                labelEn="Photo (PNG)"
                variant="secondary"
                compact
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-left w-12">{t('ተ.ቁ', '#')}</th>
                  <th className="py-3 px-4 text-left">{t('የመረጃ ዘርፍ / ምድብ', 'Church Data Category')}</th>
                  <th className="py-3 px-4 text-right bg-blue-50/40 text-blue-950">{t('ወንድ (Male)', 'Male')}</th>
                  <th className="py-3 px-4 text-right bg-rose-50/40 text-rose-950">{t('ሴት (Female)', 'Female')}</th>
                  {hasUnspecifiedMaster && (
                    <th className="py-3 px-4 text-right text-slate-600">{t('ያልተገለጸ', 'Unspecified')}</th>
                  )}
                  <th className="py-3 px-4 text-right bg-slate-100/70 text-slate-900">{t('ድምር (Total)', 'Total')}</th>
                  <th className="py-3 px-4 text-left">{t('ተጨማሪ መረጃ', 'Additional Details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterMatrixRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/70 ${
                      row.group === 'ministry' ? 'bg-slate-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-500 tabular-nums">{row.num}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {onNavigateUnit && row.targetUnit && !loggedInChapel ? (
                        <button
                          type="button"
                          onClick={() => onNavigateUnit(row.targetUnit!)}
                          className="text-left hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{row.label}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 print:hidden" />
                        </button>
                      ) : (
                        row.label
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-900 bg-blue-50/20 tabular-nums">
                      {row.male === null ? '—' : row.male.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-900 bg-rose-50/20 tabular-nums">
                      {row.female === null ? '—' : row.female.toLocaleString()}
                    </td>
                    {hasUnspecifiedMaster && (
                      <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                        {row.unspecified.toLocaleString()}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900 bg-slate-50/70 tabular-nums">
                      {row.total.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600 tabular-nums">{row.note}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <td className="py-3.5 px-4">—</td>
                  <td className="py-3.5 px-4">
                    {t(
                      'ዋናው የቤተክርስቲያን አጠቃላይ ህዝብ (አባላት + ልጆች 0–14)',
                      'Total Unique Church Population (Members + Children 0–14)'
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right text-blue-200 tabular-nums">
                    {combinedChurchPopulationMale.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-rose-200 tabular-nums">
                    {combinedChurchPopulationFemale.toLocaleString()}
                  </td>
                  {hasUnspecifiedMaster && (
                    <td className="py-3.5 px-4 text-right text-slate-300 tabular-nums">
                      {combinedChurchPopulationUnspecified.toLocaleString()}
                    </td>
                  )}
                  <td className="py-3.5 px-4 text-right bg-slate-800 tabular-nums">
                    {combinedChurchPopulationTotal.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-300 tabular-nums">
                    {t(
                      `ጠቅላላ ቤተሰቦች፦ ${stats.membersSummary.totalHouseholds.toLocaleString()} · የቀረቡ ሰነዶች፦ ${ext.submissionsSummary.total.toLocaleString()}`,
                      `Households: ${stats.membersSummary.totalHouseholds.toLocaleString()} · Submissions: ${ext.submissionsSummary.total.toLocaleString()}`
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Section 2: Per-Chapel Household, Members, Youth, Women & Children Breakdown */}
      {(viewFilter === 'all' || viewFilter === 'chapels') && (
        <section ref={sec2ChapelRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-800 shrink-0" />
                <span>
                  {t(
                    '2. የእያንዳንዱ ቻፕል ቤተሰብ፣ አባላት፣ ወጣቶች፣ ሴቶች እና የልጆች መረጃ (ወንድ / ሴት / ድምር)',
                    '2. Per-Chapel Households, Members, Youth, Women & Children Breakdown (M / F / Total)'
                  )}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'የ10ሩም ቻፕሎች ቤተሰብ ብዛት (1-ሰው እና 2+ አባላት)፣ የአባላት ወ/ሴ/ድምር፣ የወጣቶች (ወ/ሴ/ድምር)፣ የሴቶች (ባለትዳር እና አባወራ) እና የልጆች (0–14) ዝርዝር',
                  'Households (1-person & 2+), Members (M/F/Total), Youth (M/F/Total), Women (Married & Head) & Children (0–14) per chapel'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowChapelChildAgeBreakdown((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer print:hidden whitespace-nowrap"
              >
                {showChapelChildAgeBreakdown
                  ? t('የልጆች ዕድሜ ዝርዝር ደብቅ', 'Hide Children Age Breakdown')
                  : t('የቻፕሉን ልጆች በዕድሜ (0-3..13-14) አሳይ', 'Show Children by Age (0-3..13-14)')}
              </button>
              <ExportPhotoButton
                targetRef={sec2ChapelRef}
                fileName={`2_የየቻፕሉ_ቤተሰብ_አባላት_ወጣቶች_ሴቶች_ልጆች${loggedInChapel ? `_${loggedInChapel}` : ''}_${currentYear}`}
                labelAm="በፎቶ (PNG)"
                labelEn="Photo (PNG)"
                variant="secondary"
                compact
              />
            </div>
          </div>

          {filteredChapelRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {t('ከተፈለገው ቃል ጋር የሚዛመድ ቻፕል አልተገኘም።', 'No matching chapel found.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200">
                      {t('ተ.ቁ', '#')}
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-slate-200">
                      {t('የቻፕል ስም', 'Chapel')}
                    </th>
                    <th
                      colSpan={3}
                      className="py-2 px-3 text-center border-b border-r border-slate-200 bg-teal-50/50 text-teal-950"
                    >
                      {t('የቻፕሉ ቤተሰብ', 'Households')}
                    </th>
                    <th
                      colSpan={hasUnspecifiedChapelMembers ? 4 : 3}
                      className="py-2 px-3 text-center border-b border-r border-slate-200 bg-blue-50/50 text-blue-950"
                    >
                      {t('አባላት', 'Members')}
                    </th>
                    <th
                      colSpan={3}
                      className="py-2 px-3 text-center border-b border-r border-slate-200 bg-orange-50/50 text-orange-950"
                    >
                      {t('ወጣቶች (15–29)', 'Youth (15–29)')}
                    </th>
                    <th
                      colSpan={3}
                      className="py-2 px-3 text-center border-b border-r border-slate-200 bg-pink-50/50 text-pink-950"
                    >
                      {t('ሴቶች (ባለትዳር/አባወራ)', 'Women (Married/Head)')}
                    </th>
                    <th
                      colSpan={hasUnspecifiedChapelChildren ? 4 : 3}
                      className="py-2 px-3 text-center border-b border-r border-slate-200 bg-amber-50/50 text-amber-950"
                    >
                      {t('ልጆች (0–14)', 'Children (0–14)')}
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 text-right">
                      {t('አጠቃላይ ድምር', 'Combined')}
                    </th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="py-2 px-2 text-right bg-teal-50/30">{t('ጠቅላላ', 'Total')}</th>
                    <th className="py-2 px-2 text-right bg-teal-50/20">{t('1-ሰው', 'Solo')}</th>
                    <th className="py-2 px-2 text-right border-r border-slate-200 bg-teal-50/20">
                      {t('2+', '2+')}
                    </th>

                    <th className="py-2 px-2 text-right text-blue-900 bg-blue-50/30">{t('ወንድ', 'M')}</th>
                    <th className="py-2 px-2 text-right text-rose-900 bg-blue-50/30">{t('ሴት', 'F')}</th>
                    {hasUnspecifiedChapelMembers && (
                      <th className="py-2 px-2 text-right">{t('ያልተገለጸ', 'Unsp.')}</th>
                    )}
                    <th className="py-2 px-2 text-right border-r border-slate-200 text-slate-900 bg-slate-100/70">
                      {t('ድምር', 'Tot')}
                    </th>

                    <th className="py-2 px-2 text-right text-blue-900 bg-orange-50/30">{t('ወንድ', 'M')}</th>
                    <th className="py-2 px-2 text-right text-rose-900 bg-orange-50/30">{t('ሴት', 'F')}</th>
                    <th className="py-2 px-2 text-right border-r border-slate-200 text-orange-950 bg-orange-100/40">
                      {t('ድምር', 'Tot')}
                    </th>

                    <th className="py-2 px-2 text-right text-pink-900 bg-pink-50/30">{t('ባለትዳር', 'Married')}</th>
                    <th className="py-2 px-2 text-right text-pink-900 bg-pink-50/30">{t('አባወራ', 'Head')}</th>
                    <th className="py-2 px-2 text-right border-r border-slate-200 text-pink-950 bg-pink-100/40">
                      {t('ድምር', 'Tot')}
                    </th>

                    <th className="py-2 px-2 text-right text-blue-900 bg-amber-50/30">{t('ወንድ', 'M')}</th>
                    <th className="py-2 px-2 text-right text-rose-900 bg-amber-50/30">{t('ሴት', 'F')}</th>
                    {hasUnspecifiedChapelChildren && (
                      <th className="py-2 px-2 text-right">{t('ያልተገለጸ', 'Unsp.')}</th>
                    )}
                    <th className="py-2 px-2 text-right border-r border-slate-200 text-slate-900 bg-amber-100/40">
                      {t('ድምር', 'Tot')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChapelRows.map((row, idx) => {
                    const demo = ext.chapelDemographicsByName.get(row.chapelName);
                    return (
                      <tr
                        key={row.chapelName}
                        className={`hover:bg-slate-50/80 ${
                          row.isUnassignedBucket ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-slate-500 font-semibold border-r border-slate-100 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                          {chapelLabel(row.chapelName)}
                        </td>

                        <td className="py-3 px-2 text-right font-extrabold text-teal-900 tabular-nums">
                          {row.totalHouseholds.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-600 tabular-nums">
                          {row.soloHouseholds.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-600 border-r border-slate-100 tabular-nums">
                          {row.multiMemberHouseholds.toLocaleString()}
                        </td>

                        <td className="py-3 px-2 text-right font-semibold text-blue-900 tabular-nums">
                          {row.members.male.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-rose-900 tabular-nums">
                          {row.members.female.toLocaleString()}
                        </td>
                        {hasUnspecifiedChapelMembers && (
                          <td className="py-3 px-2 text-right text-slate-500 tabular-nums">
                            {row.members.unspecified.toLocaleString()}
                          </td>
                        )}
                        <td className="py-3 px-2 text-right font-extrabold text-slate-900 bg-slate-50/60 border-r border-slate-100 tabular-nums">
                          {row.members.total.toLocaleString()}
                        </td>

                        {/* Youth */}
                        <td className="py-3 px-2 text-right font-semibold text-blue-900 tabular-nums">
                          {(demo?.youthMale || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-rose-900 tabular-nums">
                          {(demo?.youthFemale || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-extrabold text-orange-950 bg-orange-50/30 border-r border-slate-100 tabular-nums">
                          {(demo?.youthTotal || 0).toLocaleString()}
                        </td>

                        {/* Women */}
                        <td className="py-3 px-2 text-right text-slate-700 tabular-nums">
                          {(demo?.womenMarried || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-700 tabular-nums">
                          {(demo?.womenFemaleHead || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-extrabold text-pink-950 bg-pink-50/30 border-r border-slate-100 tabular-nums">
                          {(demo?.womenTotal || 0).toLocaleString()}
                        </td>

                        {/* Children */}
                        <td className="py-3 px-2 text-right font-semibold text-blue-900 tabular-nums">
                          {row.children.male.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-rose-900 tabular-nums">
                          {row.children.female.toLocaleString()}
                        </td>
                        {hasUnspecifiedChapelChildren && (
                          <td className="py-3 px-2 text-right text-slate-500 tabular-nums">
                            {row.children.unspecified.toLocaleString()}
                          </td>
                        )}
                        <td className="py-3 px-2 text-right font-extrabold text-amber-950 bg-amber-50/30 border-r border-slate-100 tabular-nums">
                          {row.children.total.toLocaleString()}
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {row.combinedPeopleTotal.toLocaleString()}{' '}
                          <span className="text-[11px] font-medium text-slate-500">
                            ({pct(row.combinedPeopleTotal, stats.chapelGrandTotal.combinedPeopleTotal)})
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <td className="py-3 px-3 border-r border-slate-700">—</td>
                    <td className="py-3 px-3 border-r border-slate-700 whitespace-nowrap">
                      {t('ጠቅላላ የቻፕሎች ድምር', 'Total Across Chapels')}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums">
                      {stats.chapelGrandTotal.totalHouseholds.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300 tabular-nums">
                      {stats.chapelGrandTotal.soloHouseholds.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300 border-r border-slate-700 tabular-nums">
                      {stats.chapelGrandTotal.multiMemberHouseholds.toLocaleString()}
                    </td>

                    <td className="py-3 px-2 text-right text-blue-200 tabular-nums">
                      {stats.chapelGrandTotal.members.male.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-rose-200 tabular-nums">
                      {stats.chapelGrandTotal.members.female.toLocaleString()}
                    </td>
                    {hasUnspecifiedChapelMembers && (
                      <td className="py-3 px-2 text-right text-slate-300 tabular-nums">
                        {stats.chapelGrandTotal.members.unspecified.toLocaleString()}
                      </td>
                    )}
                    <td className="py-3 px-2 text-right bg-slate-800 border-r border-slate-700 tabular-nums">
                      {stats.chapelGrandTotal.members.total.toLocaleString()}
                    </td>

                    <td className="py-3 px-2 text-right text-blue-200 tabular-nums">
                      {ext.chapelYouthTotal.male.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-rose-200 tabular-nums">
                      {ext.chapelYouthTotal.female.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right bg-orange-950/60 border-r border-slate-700 tabular-nums">
                      {ext.chapelYouthTotal.total.toLocaleString()}
                    </td>

                    <td className="py-3 px-2 text-right text-pink-200 tabular-nums">
                      {ext.chapelWomenTotal.married.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-pink-200 tabular-nums">
                      {ext.chapelWomenTotal.femaleHead.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right bg-pink-950/60 border-r border-slate-700 tabular-nums">
                      {ext.chapelWomenTotal.eligibleTotal.toLocaleString()}
                    </td>

                    <td className="py-3 px-2 text-right text-blue-200 tabular-nums">
                      {stats.chapelGrandTotal.children.male.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-rose-200 tabular-nums">
                      {stats.chapelGrandTotal.children.female.toLocaleString()}
                    </td>
                    {hasUnspecifiedChapelChildren && (
                      <td className="py-3 px-2 text-right text-slate-300 tabular-nums">
                        {stats.chapelGrandTotal.children.unspecified.toLocaleString()}
                      </td>
                    )}
                    <td className="py-3 px-2 text-right bg-amber-900/60 border-r border-slate-700 tabular-nums">
                      {stats.chapelGrandTotal.children.total.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      {stats.chapelGrandTotal.combinedPeopleTotal.toLocaleString()} (100%)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Optional expandable Per-Chapel Children Age Matrix (0-3 .. 13-14) */}
          {showChapelChildAgeBreakdown && filteredChapelRows.length > 0 && (
            <div ref={sec2bChapelChildrenAgeRef} className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-xs font-extrabold text-slate-800">
                  {t(
                    'የእያንዳንዱ ቻፕል ልጆች (0–14) በዕድሜ ምድብ ዝርዝር (ወንድ / ሴት / ድምር)',
                    'Per-Chapel Children Age Cohort Breakdown (M / F / Total)'
                  )}
                </h4>
                <ExportPhotoButton
                  targetRef={sec2bChapelChildrenAgeRef}
                  fileName={`2ለ_የቻፕሎች_ልጆች_በዕድሜ_ምድብ${loggedInChapel ? `_${loggedInChapel}` : ''}_${currentYear}`}
                  labelAm="በፎቶ (PNG)"
                  labelEn="Photo (PNG)"
                  variant="secondary"
                  compact
                />
              </div>
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2 px-3 text-left border-r border-slate-200">{t('ቻፕል', 'Chapel')}</th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        0-3 ({t('ወ/ሴ/ድ', 'M/F/T')})
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        4-6 ({t('ወ/ሴ/ድ', 'M/F/T')})
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        7-9 ({t('ወ/ሴ/ድ', 'M/F/T')})
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        10-12 ({t('ወ/ሴ/ድ', 'M/F/T')})
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-200">
                        13-14 ({t('ወ/ሴ/ድ', 'M/F/T')})
                      </th>
                      <th className="py-2 px-3 text-right">{t('ጠቅላላ ልጆች (ወ/ሴ/ድ)', 'Total Children')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredChapelRows.map((row) => (
                      <tr key={`${row.chapelName}_age`} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                          {chapelLabel(row.chapelName)}
                        </td>
                        {row.childrenAgeStats.cohorts.map((c) => (
                          <td
                            key={c.key}
                            className="py-2 px-2 text-center border-r border-slate-100 tabular-nums text-slate-700 whitespace-nowrap"
                          >
                            <span className="text-blue-800 font-semibold">{c.male}</span> /{' '}
                            <span className="text-rose-800 font-semibold">{c.female}</span> /{' '}
                            <span className="text-slate-900 font-extrabold">{c.total}</span>
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          <span className="text-blue-800">{row.children.male}</span> /{' '}
                          <span className="text-rose-800">{row.children.female}</span> /{' '}
                          <span className="font-extrabold">{row.children.total}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Section 3: All 17 Organizational Departments Breakdown (M/F/Total + Activities + Plans + Finances) */}
      {!loggedInChapel && (viewFilter === 'all' || viewFilter === 'departments') && (
        <section ref={sec3DeptsRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {t(
                  `3. የሁሉም የቤተክርስቲያን ዘርፎች እና መምሪያዎች (${ext.orgUnitRows.length} ክፍሎች) አባላት፣ ተግባራት፣ ዕቅዶች እና ፋይናንስ`,
                  `3. All ${ext.orgUnitRows.length} Church Departments & Ministries — Members (M/F/Total), Activities, Plans & Finance`
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'እያንዳንዱ መምሪያ የተመዘገቡ አባላትን (ወ/ሴ/ድምር)፣ የሰው ኃይልን፣ የወጣቶች ህብረቶችን፣ ተረጂዎችን፣ ሚሽነሪዎችን፣ ተግባራትን፣ ዕቅዶችንና ፋይናንስን ያካትታል።',
                  'Each department includes direct rosters (M/F/Total), HR, youth groups, beneficiaries, missionaries, activities, plans, and finance.'
                )}
              </p>
            </div>
            <ExportPhotoButton
              targetRef={sec3DeptsRef}
              fileName={`3_የ17ቱ_ዘርፎች_አባላት_ዕቅዶች_ፋይናንስ_${currentYear}`}
              labelAm="በፎቶ (PNG)"
              labelEn="Photo (PNG)"
              variant="secondary"
              compact
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3 text-left">{t('ኮድ', 'Code')}</th>
                  <th className="py-2.5 px-4 text-left">{t('የዘርፍ / መምሪያ ስም', 'Department / Ministry')}</th>
                  <th className="py-2.5 px-3 text-right bg-blue-50/40 text-blue-950">{t('ወንድ', 'Male')}</th>
                  <th className="py-2.5 px-3 text-right bg-rose-50/40 text-rose-950">{t('ሴት', 'Female')}</th>
                  {hasUnspecifiedDeptPeople && (
                    <th className="py-2.5 px-3 text-right">{t('ያልተገለጸ', 'Unsp.')}</th>
                  )}
                  <th className="py-2.5 px-3 text-right bg-slate-100/70 text-slate-900">{t('ድምር', 'Total')}</th>
                  <th className="py-2.5 px-3 text-right">{t('ተግባራት', 'Activities')}</th>
                  <th className="py-2.5 px-3 text-right">{t('ዕቅዶች', 'Plans')}</th>
                  <th className="py-2.5 px-3 text-right text-emerald-900">{t('ገቢ (ብር)', 'Income (ETB)')}</th>
                  <th className="py-2.5 px-3 text-right text-rose-900">{t('ወጪ (ብር)', 'Expense (ETB)')}</th>
                  <th className="py-2.5 px-4 text-right text-slate-900">{t('ቀሪ ሂሳብ (ብር)', 'Balance (ETB)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgUnitRows.map((u) => (
                  <tr
                    key={u.unitId}
                    className={`hover:bg-slate-50/80 ${
                      u.level === 1 ? 'bg-slate-50/60' : u.level === 2 ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-500 tabular-nums">{u.code}</td>
                    <td className="py-2.5 px-4">
                      <div style={{ paddingLeft: `${(u.level - 1) * 14}px` }}>
                        {onNavigateUnit ? (
                          <button
                            type="button"
                            onClick={() => onNavigateUnit(u.unitId)}
                            className="font-bold text-slate-900 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer text-left"
                          >
                            <span>{unitName(u.unitId, u.nameAm)}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400 print:hidden" />
                          </button>
                        ) : (
                          <span className="font-bold text-slate-900">{unitName(u.unitId, u.nameAm)}</span>
                        )}
                        {u.unitId === 'children_ministry' && (
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {t('ልጆች (0–14):', 'Children:')} {stats.childrenSummary.total.toLocaleString()} · {t('ሰንበት ተማሪዎች:', 'Students:')} {stats.sundaySchoolSummary.total.toLocaleString()}
                          </div>
                        )}
                        {u.unitId === 'chapels_dept' && (
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {t('10 ቻፕሎች · ዋና ቋት አባላት:', '10 Chapels · Master Members:')} {stats.membersSummary.total.toLocaleString()}
                          </div>
                        )}
                        {u.specializedCount > 0 && (
                          <div className="text-[11px] text-blue-800 font-semibold tabular-nums">
                            {u.unitId === 'admin_finance' && t(`የሰው ኃይል (HR)፦ ${u.specializedCount}`, `HR Staff: ${u.specializedCount}`)}
                            {u.unitId === 'youth_ministry' && t(`መዘምራን/መሪዎች/ትምህርት፦ ${u.specializedCount}`, `Choirs/Leaders/Discipleship: ${u.specializedCount}`)}
                            {u.unitId === 'love_compassion' && t(`ቋሚና ጊዜያዊ ተረጂ፦ ${u.specializedCount}`, `Permanent & Temp Beneficiaries: ${u.specializedCount}`)}
                            {u.unitId === 'evangelism' && t(`ሚሽነሪዎች፦ ${u.specializedCount}`, `Missionaries: ${u.specializedCount}`)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-blue-900 bg-blue-50/15 tabular-nums">
                      {u.peopleCounts.male.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-900 bg-rose-50/15 tabular-nums">
                      {u.peopleCounts.female.toLocaleString()}
                    </td>
                    {hasUnspecifiedDeptPeople && (
                      <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                        {u.peopleCounts.unspecified.toLocaleString()}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 bg-slate-50/60 tabular-nums">
                      {u.peopleCounts.total.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                      {u.activitiesCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                      {u.plansCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-800 font-semibold tabular-nums">
                      {u.supportsFinance ? u.income.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-800 font-semibold tabular-nums">
                      {u.supportsFinance ? u.expense.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 tabular-nums">
                      {u.supportsFinance ? u.balance.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold">
                  <td className="py-3 px-3">—</td>
                  <td className="py-3 px-4">{t('ጠቅላላ የመምሪያዎች ድምር (17 ክፍሎች)', 'Total Across All 17 Departments')}</td>
                  <td className="py-3 px-3 text-right text-blue-200 tabular-nums">
                    {ext.orgUnitGrandTotal.peopleCounts.male.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-200 tabular-nums">
                    {ext.orgUnitGrandTotal.peopleCounts.female.toLocaleString()}
                  </td>
                  {hasUnspecifiedDeptPeople && (
                    <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                      {ext.orgUnitGrandTotal.peopleCounts.unspecified.toLocaleString()}
                    </td>
                  )}
                  <td className="py-3 px-3 text-right bg-slate-800 tabular-nums">
                    {ext.orgUnitGrandTotal.peopleCounts.total.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {ext.orgUnitGrandTotal.activitiesCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {ext.orgUnitGrandTotal.plansCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-200 tabular-nums">
                    {ext.orgUnitGrandTotal.income.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-200 tabular-nums">
                    {ext.orgUnitGrandTotal.expense.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {ext.orgUnitGrandTotal.balance.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Section 4: HR, Assets, Evangelism Missionaries, Compassion Beneficiaries & Youth Fellowships */}
      {(viewFilter === 'all' || viewFilter === 'departments') && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 4A: Church HR (Full-Time Ministers & Admin Staff) */}
          {!loggedInChapel && (
            <section ref={sec4aHrRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>{t('4ሀ. የቤተክርስቲያኒቱ የሰው ኃይል (HR)', '4A. Church Human Resources (HR)')}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('የሙሉ ጊዜ አገልጋዮች እና የአስተዳደር ሠራተኞች (ወንድ / ሴት / ድምር)', 'Full-time ministers and administration staff')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onNavigateUnit && (
                    <button
                      type="button"
                      onClick={() => onNavigateUnit('admin_finance')}
                      className="text-[11px] font-bold text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer print:hidden"
                    >
                      <span>{t('ክፈት', 'Open')}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  <ExportPhotoButton
                    targetRef={sec4aHrRef}
                    fileName={`4ሀ_የቤተክርስቲያን_የሰው_ኃይል_HR_${currentYear}`}
                    labelAm="በፎቶ (PNG)"
                    labelEn="Photo (PNG)"
                    variant="secondary"
                    compact
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-4 text-left">{t('የሰው ኃይል ምድብ', 'Staff Category')}</th>
                      <th className="py-2.5 px-3 text-right text-blue-900">{t('ወንድ', 'Male')}</th>
                      <th className="py-2.5 px-3 text-right text-rose-900">{t('ሴት', 'Female')}</th>
                      <th className="py-2.5 px-3 text-right text-slate-900">{t('ድምር', 'Total')}</th>
                      <th className="py-2.5 px-4 text-right text-slate-700">{t('ወርሃዊ ደመወዝ (ብር)', 'Monthly Salary')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        {t('የሙሉ ጊዜ አገልጋዮች', 'Full-Time Ministers')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                        {ext.hrFullTime.counts.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                        {ext.hrFullTime.counts.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                        {ext.hrFullTime.counts.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-700 tabular-nums">
                        {ext.hrFullTime.monthlySalary.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        {t('የአስተዳደር ሠራተኞች', 'Administration Staff')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                        {ext.hrAdminStaff.counts.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                        {ext.hrAdminStaff.counts.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                        {ext.hrAdminStaff.counts.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-700 tabular-nums">
                        {ext.hrAdminStaff.monthlySalary.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-extrabold">
                      <td className="py-2.5 px-4">{t('ጠቅላላ የሰው ኃይል', 'Total HR')}</td>
                      <td className="py-2.5 px-3 text-right text-blue-200 tabular-nums">
                        {ext.hrTotal.counts.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-200 tabular-nums">
                        {ext.hrTotal.counts.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {ext.hrTotal.counts.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {ext.hrTotal.monthlySalary.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* 4B: Church Assets (Fixed & Consumable) */}
          {!loggedInChapel && (
            <section ref={sec4bAssetsRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{t('4ለ. የቤተክርስቲያኒቱ ንብረት (ቋሚና አላቂ)', '4B. Church Property & Assets')}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('የቋሚ እና አላቂ ንብረቶች ብዛትና ጠቅላላ ግምት (ብር)', 'Fixed and consumable assets counts and valuation')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onNavigateUnit && (
                    <button
                      type="button"
                      onClick={() => onNavigateUnit('admin_finance')}
                      className="text-[11px] font-bold text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer print:hidden"
                    >
                      <span>{t('ክፈት', 'Open')}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  <ExportPhotoButton
                    targetRef={sec4bAssetsRef}
                    fileName={`4ለ_የቤተክርስቲያን_ንብረት_ማጠቃለያ_${currentYear}`}
                    labelAm="በፎቶ (PNG)"
                    labelEn="Photo (PNG)"
                    variant="secondary"
                    compact
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-4 text-left">{t('የንብረት ዓይነት', 'Asset Type')}</th>
                      <th className="py-2.5 px-3 text-right">{t('መዝገቦች', 'Items')}</th>
                      <th className="py-2.5 px-3 text-right">{t('ጠቅላላ ብዛት', 'Total Qty')}</th>
                      <th className="py-2.5 px-4 text-right text-slate-900">{t('ጠቅላላ ዋጋ (ብር)', 'Total Value (ETB)')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        {t('ቋሚ ንብረት (Fixed Assets)', 'Fixed Assets')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 tabular-nums">
                        {ext.assetsFixed.itemCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 tabular-nums">
                        {ext.assetsFixed.totalQty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 tabular-nums">
                        {ext.assetsFixed.totalValue.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-800">
                        {t('አላቂ ንብረት (Consumable Assets)', 'Consumable Assets')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 tabular-nums">
                        {ext.assetsConsumable.itemCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700 tabular-nums">
                        {ext.assetsConsumable.totalQty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 tabular-nums">
                        {ext.assetsConsumable.totalValue.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-extrabold">
                      <td className="py-2.5 px-4">{t('ጠቅላላ ንብረት', 'Total Assets')}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {ext.assetsTotal.itemCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {ext.assetsTotal.totalQty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {ext.assetsTotal.totalValue.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* 4C: Evangelism Missionaries (4 Scopes) */}
          {!loggedInChapel && (
            <section ref={sec4cMissionariesRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>{t('4ሐ. የወንጌል አገልግሎት ሚሽነሪዎች (በ4ቱ ምድብ)', '4C. Evangelism Missionaries (4 Tiers)')}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('አለም አቀፋዊ፣ አገር አቀፋዊ፣ ክልላዊ እና አከባቢያዊ ሚሽነሪዎች (ወ/ሴ/ድምር)', 'International, National, Regional & Local missionaries')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onNavigateUnit && (
                    <button
                      type="button"
                      onClick={() => onNavigateUnit('evangelism')}
                      className="text-[11px] font-bold text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer print:hidden"
                    >
                      <span>{t('ክፈት', 'Open')}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  <ExportPhotoButton
                    targetRef={sec4cMissionariesRef}
                    fileName={`4ሐ_የወንጌል_ሚሽነሪዎች_ማጠቃለያ_${currentYear}`}
                    labelAm="በፎቶ (PNG)"
                    labelEn="Photo (PNG)"
                    variant="secondary"
                    compact
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-4 text-left">{t('የሚሽነሪ ምድብ', 'Missionary Scope')}</th>
                      <th className="py-2.5 px-3 text-right text-blue-900">{t('ወንድ', 'Male')}</th>
                      <th className="py-2.5 px-3 text-right text-rose-900">{t('ሴት', 'Female')}</th>
                      <th className="py-2.5 px-3 text-right text-slate-900">{t('ድምር', 'Total')}</th>
                      <th className="py-2.5 px-4 text-right text-slate-700">{t('ወርሃዊ ድጋፍ (ብር)', 'Monthly Support')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ext.missionariesByScope.map((ms) => (
                      <tr key={ms.scope} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          {t(MISSIONARY_SCOPE_LABELS[ms.scope].am, MISSIONARY_SCOPE_LABELS[ms.scope].en)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                          {ms.counts.male.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                          {ms.counts.female.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                          {ms.counts.total.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-700 tabular-nums">
                          {ms.monthlySupport.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-extrabold">
                      <td className="py-2.5 px-4">{t('ጠቅላላ ሚሽነሪዎች', 'Total Missionaries')}</td>
                      <td className="py-2.5 px-3 text-right text-blue-200 tabular-nums">
                        {ext.missionariesTotal.counts.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-200 tabular-nums">
                        {ext.missionariesTotal.counts.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {ext.missionariesTotal.counts.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {ext.missionariesTotal.monthlySupport.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* 4D: Love & Compassion Beneficiaries & Youth Ministry Fellowships */}
          <section ref={sec4dCompassionYouthRef} className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${loggedInChapel ? 'xl:col-span-2' : ''}`}>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {t(
                      '4መ. ፍቅርና ርኅራሄ (ቋሚና ጊዜያዊ ተረጂዎች) እና የወጣቶች ህብረቶች',
                      '4D. Compassion Beneficiaries (Permanent & Temp) & Youth Fellowships'
                    )}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('በወንድ / በሴት / በድምር የተደራጀ ዝርዝር', 'Organized by Male / Female / Total')}
                </p>
              </div>
              <ExportPhotoButton
                targetRef={sec4dCompassionYouthRef}
                fileName={`4መ_ፍቅርና_ርኅራሄ_እና_ወጣቶች_ህብረቶች_${currentYear}`}
                labelAm="በፎቶ (PNG)"
                labelEn="Photo (PNG)"
                variant="secondary"
                compact
              />
            </div>
            <div className="overflow-x-auto max-h-[340px]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-600 font-bold">
                    <th className="py-2.5 px-4 text-left">{t('አገልግሎት / ህብረት', 'Group / Category')}</th>
                    <th className="py-2.5 px-3 text-right text-blue-900">{t('ወንድ', 'Male')}</th>
                    <th className="py-2.5 px-3 text-right text-rose-900">{t('ሴት', 'Female')}</th>
                    <th className="py-2.5 px-3 text-right text-slate-900">{t('ድምር', 'Total')}</th>
                    <th className="py-2.5 px-4 text-right text-slate-600">{t('ማብራሪያ / ድጋፍ', 'Note / Aid')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {t('ፍቅርና ርኅራሄ — ቋሚ ተረጂዎች', 'Compassion — Permanent Beneficiaries')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                      {ext.beneficiariesPermanent.counts.male.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                      {ext.beneficiariesPermanent.counts.female.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                      {ext.beneficiariesPermanent.counts.total.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">
                      {ext.beneficiariesPermanent.monthlyAid.toLocaleString()} {t('ብር/ወር', 'ETB/mo')}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {t('ፍቅርና ርኅራሄ — ጊዜያዊ ተረጂዎች', 'Compassion — Temporary Beneficiaries')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                      {ext.beneficiariesTemporary.counts.male.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                      {ext.beneficiariesTemporary.counts.female.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                      {ext.beneficiariesTemporary.counts.total.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">
                      {ext.beneficiariesTemporary.monthlyAid.toLocaleString()} {t('ብር/ወር', 'ETB/mo')}
                    </td>
                  </tr>
                  {ext.youthByGroupBreakdown.length === 0 ? (
                    <tr className="bg-slate-50/40">
                      <td colSpan={5} className="py-3 px-4 text-center text-slate-400">
                        {t('የወጣቶች መዘምራን/መዝሙር መሪ/ደቀ መዝሙርነት ቡድኖች ገና አልተመዘገቡም', 'No youth fellowship members recorded yet')}
                      </td>
                    </tr>
                  ) : (
                    ext.youthByGroupBreakdown.map((yg) => (
                      <tr key={`${yg.category}_${yg.group}`} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{yg.group}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                          {yg.counts.male.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                          {yg.counts.female.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 tabular-nums">
                          {yg.counts.total.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500">
                          {yg.category === 'choir'
                            ? t('የወጣቶች መዘምራን', 'Youth Choir')
                            : yg.category === 'worship'
                            ? t('መዝሙር መሪዎች', 'Worship Leaders')
                            : t('ደቀ መዝሙርነት', 'Discipleship')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Section 5: Plans, Reports & Letters Workflow Summary */}
      {(viewFilter === 'all' || viewFilter === 'departments') && (
        <section ref={sec5WorkflowRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>
                  {t(
                    '5. የዕቅዶች፣ የክንውን ሪፖርቶች እና የደብዳቤዎች የስራ ሂደት ማጠቃለያ',
                    '5. Annual Plans, Execution Reports & Letters Workflow Summary'
                  )}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'ከሁሉም ዘርፎች እና ቻፕሎች ለመንፈሳዊ ዘርፍ እና ለአስተዳደር የቀረቡ ሰነዶች እና የተላኩ ዕቅዶች ሁኔታ',
                  'Status of plans, reports, and letters submitted to Spiritual Sector and forwarded to Administration'
                )}
              </p>
            </div>
            <ExportPhotoButton
              targetRef={sec5WorkflowRef}
              fileName={`5_የዕቅዶች_ሪፖርቶች_ደብዳቤዎች_ማጠቃለያ_${currentYear}`}
              labelAm="በፎቶ (PNG)"
              labelEn="Photo (PNG)"
              variant="secondary"
              compact
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="p-5 space-y-2">
              <div className="text-xs font-bold text-slate-500">
                {t('የቀረቡ ዕቅዶች፣ ሪፖርቶች እና ደብዳቤዎች', 'Submitted Documents')}
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {ext.submissionsSummary.total.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600 tabular-nums flex flex-wrap gap-x-3 gap-y-1 pt-1">
                <span>{t('ዕቅዶች:', 'Plans:')} <strong>{ext.submissionsSummary.plans}</strong></span>
                <span>·</span>
                <span>{t('ሪፖርቶች:', 'Reports:')} <strong>{ext.submissionsSummary.reports}</strong></span>
                <span>·</span>
                <span>{t('ደብዳቤዎች:', 'Letters:')} <strong>{ext.submissionsSummary.letters}</strong></span>
              </div>
            </div>

            <div className="p-5 space-y-2">
              <div className="text-xs font-bold text-slate-500">
                {t('የማጽደቅና የማስተካከያ ሂደት', 'Review & Approval Pipeline')}
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs tabular-nums">
                <span className="text-slate-600">{t('መንፈሳዊ ዘርፍ በመጠባበቅ:', 'Pending Spiritual:')}</span>
                <span className="text-right font-bold text-amber-800">{ext.submissionsSummary.pendingSpiritual}</span>
                <span className="text-slate-600">{t('ለማስተካከያ የተመለሱ:', 'Returned for Revision:')}</span>
                <span className="text-right font-bold text-rose-700">{ext.submissionsSummary.returnedBySpiritual}</span>
                <span className="text-slate-600">{t('የጸደቁ / ለአስተዳደር የተላኩ:', 'Approved / Forwarded:')}</span>
                <span className="text-right font-bold text-emerald-800">
                  {ext.submissionsSummary.approvedSpiritual + ext.submissionsSummary.forwardedToAdmin}
                </span>
                <span className="text-slate-600">{t('አስተዳደር የተቀበላቸው:', 'Acknowledged by Admin:')}</span>
                <span className="text-right font-bold text-blue-800">{ext.submissionsSummary.acknowledgedByAdmin}</span>
              </div>
            </div>

            <div className="p-5 space-y-2">
              <div className="text-xs font-bold text-slate-500">
                {t('የዓመታዊ ዕቅድ ተግባራት እና ስርጭት', 'Annual Plan Tasks & Dispatches')}
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs tabular-nums">
                <span className="text-slate-600">{t('ጠቅላላ የዕቅድ ተግባራት:', 'Total Plan Tasks:')}</span>
                <span className="text-right font-bold text-slate-900">{ext.allPlansTaskCount.toLocaleString()}</span>
                <span className="text-slate-600">{t('ክንውን የተመዘገበባቸው:', 'With Execution Done:')}</span>
                <span className="text-right font-bold text-emerald-800">{ext.allPlansWithExecutionCount.toLocaleString()}</span>
                <span className="text-slate-600">{t('የተላኩ ዕቅዶች (Dispatches):', 'Dispatched Packets:')}</span>
                <span className="text-right font-bold text-slate-900">
                  {ext.dispatchesSummary.total} ({t('ተቀባይነት', 'Acc')}: {ext.dispatchesSummary.accepted})
                </span>
                <span className="text-slate-600">{t('በመጠባበቅ / የተመለሱ:', 'Pending / Returned:')}</span>
                <span className="text-right font-bold text-amber-800">
                  {ext.dispatchesSummary.pending} / {ext.dispatchesSummary.returned}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 6 & 7: Church Children Age Summary (0-14) & Sunday School Per-Class Summary */}
      {(viewFilter === 'all' || viewFilter === 'sunday_school') && (
        <div
          className={`grid grid-cols-1 ${
            !loggedInChapel ? 'xl:grid-cols-12' : ''
          } gap-6`}
        >
          {/* Left: Church Children Age Cohort Breakdown (0-3 .. 13-14) */}
          <section
            ref={sec6ChildrenAgeRef}
            className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${
              !loggedInChapel ? 'xl:col-span-5' : ''
            }`}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {t(
                    '6. የቤተክርስቲያኒቱ ልጆች በዕድሜ ምድብ (ወንድ / ሴት / ድምር)',
                    '6. Church Children by Age Group (Male / Female / Total)'
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {loggedInChapel ? `${chapelLabel(loggedInChapel)} — ` : ''}
                  {t('የልጆች ቋት (0–14 ዓመት) የዕድሜ ክፍፍል', 'Children registry (0–14 years) age cohorts')}
                </p>
              </div>
              <ExportPhotoButton
                targetRef={sec6ChildrenAgeRef}
                fileName={`6_የልጆች_ዕድሜ_ምድብ_ስታቲስቲክስ${loggedInChapel ? `_${loggedInChapel}` : ''}_${currentYear}`}
                labelAm="በፎቶ (PNG)"
                labelEn="Photo (PNG)"
                variant="secondary"
                compact
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-4 text-left">{t('የዕድሜ ምድብ', 'Age Group')}</th>
                    <th className="py-2.5 px-3 text-right text-blue-900">{t('ወንድ', 'Male')}</th>
                    <th className="py-2.5 px-3 text-right text-rose-900">{t('ሴት', 'Female')}</th>
                    <th className="py-2.5 px-4 text-right text-slate-900">{t('ድምር', 'Total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.childrenAgeStats.cohorts.map((c) => (
                    <tr key={c.key} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-800">{c.label}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                        {c.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                        {c.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 tabular-nums">
                        {c.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {stats.childrenAgeStats.over14.total > 0 && (
                    <tr className="hover:bg-slate-50/70 bg-slate-50/40">
                      <td className="py-2.5 px-4 font-semibold text-slate-600">
                        {stats.childrenAgeStats.over14.label}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                        {stats.childrenAgeStats.over14.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                        {stats.childrenAgeStats.over14.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800 tabular-nums">
                        {stats.childrenAgeStats.over14.total.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {stats.childrenAgeStats.unknownAge.total > 0 && (
                    <tr className="hover:bg-slate-50/70 bg-slate-50/40">
                      <td className="py-2.5 px-4 font-semibold text-slate-600">
                        {stats.childrenAgeStats.unknownAge.label}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                        {stats.childrenAgeStats.unknownAge.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                        {stats.childrenAgeStats.unknownAge.female.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800 tabular-nums">
                        {stats.childrenAgeStats.unknownAge.total.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <td className="py-2.5 px-4">{t('ጠቅላላ የልጆች ድምር', 'Total Children')}</td>
                    <td className="py-2.5 px-3 text-right text-blue-200 tabular-nums">
                      {stats.childrenSummary.male.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-200 tabular-nums">
                      {stats.childrenSummary.female.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {stats.childrenSummary.total.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Right: Sunday School Students Per Class Breakdown */}
          {!loggedInChapel && (
            <section ref={sec7SundayClassRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden xl:col-span-7">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {t(
                      `7. የሰንበት ትምህርት ቤት ተማሪዎች በየክፍሉ (${currentYear} ዓ/ም)`,
                      `7. Sunday School Students per Class (${currentYear})`
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    ከ0–3 ({stats.sundaySchoolAgeStats.cohorts[0].total}) · ከ4–6 (
                    {stats.sundaySchoolAgeStats.cohorts[1].total}) · ከ7–9 (
                    {stats.sundaySchoolAgeStats.cohorts[2].total}) · ከ10–12 (
                    {stats.sundaySchoolAgeStats.cohorts[3].total}) · ከ13–14 (
                    {stats.sundaySchoolAgeStats.cohorts[4].total})
                  </p>
                </div>
                <ExportPhotoButton
                  targetRef={sec7SundayClassRef}
                  fileName={`7_የሰንበት_ትቤት_ተማሪዎች_በየክፍሉ_${currentYear}`}
                  labelAm="በፎቶ (PNG)"
                  labelEn="Photo (PNG)"
                  variant="secondary"
                  compact
                />
              </div>

              <div className="overflow-x-auto max-h-[460px] print:max-h-none">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-600 font-bold">
                      <th className="py-2.5 px-3 text-left">{t('ተ.ቁ', '#')}</th>
                      <th className="py-2.5 px-3 text-left">{t('ክፍል / ደረጃ', 'Class / Grade')}</th>
                      <th className="py-2.5 px-3 text-right text-blue-900">{t('ወንድ', 'Male')}</th>
                      <th className="py-2.5 px-3 text-right text-rose-900">{t('ሴት', 'Female')}</th>
                      {stats.sundaySchoolSummary.unspecified > 0 && (
                        <th className="py-2.5 px-3 text-right text-slate-500">{t('ያልተገለጸ', 'Unsp.')}</th>
                      )}
                      <th className="py-2.5 px-3 text-right text-slate-900 bg-slate-100/70">{t('ድምር', 'Total')}</th>
                      <th className="py-2.5 px-3 text-right text-slate-600">{t('ከ0–14 ድምር', 'Ages 0–14')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSundayClassRows.map((row, idx) => (
                      <tr
                        key={row.className}
                        className={`hover:bg-slate-50/70 ${
                          row.total === 0 ? 'text-slate-400' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                          {classLabel(row.className)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-900 tabular-nums">
                          {row.male.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-900 tabular-nums">
                          {row.female.toLocaleString()}
                        </td>
                        {stats.sundaySchoolSummary.unspecified > 0 && (
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {row.unspecified.toLocaleString()}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 bg-slate-50/60 tabular-nums">
                          {row.total.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">
                          {row.subtotal0to14.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-extrabold">
                      <td className="py-2.5 px-3">—</td>
                      <td className="py-2.5 px-3">{t('ጠቅላላ የሰንበት ተማሪዎች ድምር', 'Total Sunday School Students')}</td>
                      <td className="py-2.5 px-3 text-right text-blue-200 tabular-nums">
                        {stats.sundaySchoolSummary.male.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-200 tabular-nums">
                        {stats.sundaySchoolSummary.female.toLocaleString()}
                      </td>
                      {stats.sundaySchoolSummary.unspecified > 0 && (
                        <td className="py-2.5 px-3 text-right text-slate-300 tabular-nums">
                          {stats.sundaySchoolSummary.unspecified.toLocaleString()}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right bg-slate-800 tabular-nums">
                        {stats.sundaySchoolSummary.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200 tabular-nums">
                        {stats.sundaySchoolAgeStats.subtotal0to14.total.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Section 8: Spiritual Participation (Baptized / Lord's Supper / Tithe) + Education Level & Occupation Breakdown */}
      {(viewFilter === 'all' || viewFilter === 'members_detail') && (
        <ChurchMemberBreakdownSection
          members={scopedChurchMembers}
          scopeLabel={
            loggedInChapel
              ? chapelLabel(loggedInChapel)
              : t('ሁሉም አጥቢያ ቤተክርስቲያን (10 ቻፕሎች)', 'All Church (10 Chapels)')
          }
        />
      )}

      {/* Print-only Sign-off Block */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-8 text-xs text-slate-700">
        <div className="border-t border-slate-400 pt-2">
          <p className="font-bold">{t('ያዘጋጀው፦ _______________________', 'Prepared by: _______________________')}</p>
          <p className="text-[11px] text-slate-500 mt-1">{t('ፊርማ እና ቀን', 'Signature & Date')}</p>
        </div>
        <div className="border-t border-slate-400 pt-2">
          <p className="font-bold">{t('ያረጋገጠው፦ _____________________', 'Verified by: _____________________')}</p>
          <p className="text-[11px] text-slate-500 mt-1">{t('ዋና አስተዳደር / ጸሐፊ', 'Administration / Secretary')}</p>
        </div>
        <div className="border-t border-slate-400 pt-2">
          <p className="font-bold">{t('ያጸደቀው፦ ______________________', 'Approved by: ______________________')}</p>
          <p className="text-[11px] text-slate-500 mt-1">{t('የቤተክርስቲያን አመራር / ማህተም', 'Church Leadership / Stamp')}</p>
        </div>
      </div>
    </div>
  );
};
