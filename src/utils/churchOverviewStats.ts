import { CHURCH_ORG_UNITS, createEmptyDepartmentWorkspaceData } from '../constants/churchStructure';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import {
  AnnualPlanItem,
  BeneficiarySupportType,
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
import { ChapelYouthWomenSummary, computeChapelYouthWomenStats } from './chapelDemographics';
import { getRootFamilyBaseCode, parseChapelCodeParts, resolveOfficialChapel } from './memberCodeGenerator';
import {
  buildChurchStudentLookup,
  computePerClassSundaySchoolCohorts,
  computeSundaySchoolAgeCohorts,
  enrichStudentWithChurchLookup,
  normalizeStudentGender,
  PerClassAgeCohortRow,
  SundaySchoolAgeCohortStats
} from './sundaySchoolAgeStats';

export interface GenderTotalCounts {
  male: number;
  female: number;
  unspecified: number;
  total: number;
}

export interface ChapelStatisticsRow {
  chapelName: string;
  isUnassignedBucket: boolean;
  totalHouseholds: number;
  soloHouseholds: number;
  multiMemberHouseholds: number;
  members: GenderTotalCounts;
  children: GenderTotalCounts;
  childrenAgeStats: SundaySchoolAgeCohortStats;
  combinedPeopleTotal: number;
}

export interface SundaySchoolClassGenderRow {
  className: string;
  male: number;
  female: number;
  unspecified: number;
  total: number;
  subtotal0to14: number;
  cohortStats: PerClassAgeCohortRow;
}

export interface ChurchOverviewStatistics {
  membersSummary: GenderTotalCounts & {
    totalHouseholds: number;
    soloHouseholds: number;
    multiMemberHouseholds: number;
  };
  childrenSummary: GenderTotalCounts;
  childrenAgeStats: SundaySchoolAgeCohortStats;
  sundaySchoolSummary: GenderTotalCounts;
  sundaySchoolAgeStats: SundaySchoolAgeCohortStats;
  sundaySchoolPerClass: SundaySchoolClassGenderRow[];
  chapelRows: ChapelStatisticsRow[];
  chapelGrandTotal: {
    totalHouseholds: number;
    soloHouseholds: number;
    multiMemberHouseholds: number;
    members: GenderTotalCounts;
    children: GenderTotalCounts;
    combinedPeopleTotal: number;
  };
}

const createEmptyGenderCounts = (): GenderTotalCounts => ({
  male: 0,
  female: 0,
  unspecified: 0,
  total: 0
});

const incrementGenderCounts = (bucket: GenderTotalCounts, gender: unknown) => {
  const g = normalizeStudentGender(gender);
  bucket.total += 1;
  if (g === 'male') bucket.male += 1;
  else if (g === 'female') bucket.female += 1;
  else bucket.unspecified += 1;
};

const UNASSIGNED_CHAPEL_LABEL = 'ቻፕል ያልተገለጸ';

const resolveStatsChapelBucket = (rawChapel: unknown, officialChapels: string[]): string => {
  const trimmed = String(rawChapel ?? '').trim();
  if (!trimmed) return UNASSIGNED_CHAPEL_LABEL;
  const resolved = resolveOfficialChapel(trimmed);
  if (officialChapels.includes(resolved)) return resolved;
  return officialChapels[0] || DEFAULT_CHAPELS[0];
};

const resolveMemberHouseholdKey = (member: ChurchMember, index: number, chapelBucket: string): string => {
  if (chapelBucket !== UNASSIGNED_CHAPEL_LABEL) {
    const rawAnchor = member.familyCode || member.memberCode || '';
    const parsed = parseChapelCodeParts(rawAnchor, chapelBucket);
    if (parsed) {
      return `code:${parsed.baseCode}`;
    }
    const baseFromRoot = getRootFamilyBaseCode(rawAnchor, chapelBucket);
    if (baseFromRoot && parseChapelCodeParts(baseFromRoot, chapelBucket)) {
      return `code:${baseFromRoot}`;
    }
    if (member.memberCode) {
      const parsedOwn = parseChapelCodeParts(member.memberCode, chapelBucket);
      if (parsedOwn) {
        return `code:${parsedOwn.baseCode}`;
      }
    }
  }
  const normalizedFamilyCode = String(member.familyCode || '').trim().toLowerCase();
  if (normalizedFamilyCode) {
    return `fam:${chapelBucket}:${normalizedFamilyCode}`;
  }
  return `single:${member.id ?? index}`;
};

export const computeChurchOverviewStatistics = ({
  currentYear,
  classList,
  studentsByClass,
  churchMembers,
  churchChildren,
  chapelList,
  scopedChapel
}: {
  currentYear: string;
  classList: string[];
  studentsByClass: { [className: string]: Student[] };
  churchMembers: ChurchMember[];
  churchChildren: ChurchChild[];
  chapelList?: string[];
  scopedChapel?: string | null;
}): ChurchOverviewStatistics => {
  const baseChapels =
    chapelList && chapelList.length > 0 ? chapelList : DEFAULT_CHAPELS;
  const activeChapelScope = scopedChapel ? resolveOfficialChapel(scopedChapel) : null;
  const targetChapels = activeChapelScope
    ? baseChapels.filter((c) => c === activeChapelScope)
    : baseChapels;

  // Filter churchMembers & churchChildren if logged in as a specific chapel leader
  const visibleMembers = activeChapelScope
    ? churchMembers.filter(
        (m) => resolveStatsChapelBucket(m.chapel, baseChapels) === activeChapelScope
      )
    : churchMembers;

  const visibleChildren = activeChapelScope
    ? churchChildren.filter(
        (c) => resolveStatsChapelBucket(c.chapel, baseChapels) === activeChapelScope
      )
    : churchChildren;

  // 1. Initialize Chapel Buckets
  const chapelNamesInOrder = [...targetChapels];
  const chapelBuckets = new Map<
    string,
    {
      members: ChurchMember[];
      children: ChurchChild[];
      isUnassignedBucket: boolean;
    }
  >();

  chapelNamesInOrder.forEach((name) => {
    chapelBuckets.set(name, {
      members: [],
      children: [],
      isUnassignedBucket: false
    });
  });

  const ensureBucket = (bucketName: string) => {
    if (!chapelBuckets.has(bucketName)) {
      chapelBuckets.set(bucketName, {
        members: [],
        children: [],
        isUnassignedBucket: bucketName === UNASSIGNED_CHAPEL_LABEL
      });
    }
    return chapelBuckets.get(bucketName)!;
  };

  visibleMembers.forEach((m) => {
    const bucketName = resolveStatsChapelBucket(m.chapel, baseChapels);
    ensureBucket(bucketName).members.push(m);
  });

  visibleChildren.forEach((c) => {
    const bucketName = resolveStatsChapelBucket(c.chapel, baseChapels);
    ensureBucket(bucketName).children.push(c);
  });

  // 2. Compute per-chapel stats & grand totals
  const chapelRows: ChapelStatisticsRow[] = [];
  const grandTotalMembers = createEmptyGenderCounts();
  const grandTotalChildren = createEmptyGenderCounts();
  let grandTotalHouseholds = 0;
  let grandSoloHouseholds = 0;
  let grandMultiHouseholds = 0;

  // Preserve official chapel order, then any unassigned bucket if non-empty
  const orderedBucketEntries = Array.from(chapelBuckets.entries()).sort((a, b) => {
    if (a[1].isUnassignedBucket && !b[1].isUnassignedBucket) return 1;
    if (!a[1].isUnassignedBucket && b[1].isUnassignedBucket) return -1;
    return 0;
  });

  orderedBucketEntries.forEach(([chapelName, bucket]) => {
    if (bucket.isUnassignedBucket && bucket.members.length === 0 && bucket.children.length === 0) {
      return;
    }

    const memberGender = createEmptyGenderCounts();
    const householdSizes = new Map<string, number>();

    bucket.members.forEach((m, idx) => {
      incrementGenderCounts(memberGender, m.gender);
      const hhKey = resolveMemberHouseholdKey(m, idx, chapelName);
      householdSizes.set(hhKey, (householdSizes.get(hhKey) || 0) + 1);
    });

    let soloHouseholds = 0;
    let multiMemberHouseholds = 0;
    householdSizes.forEach((size) => {
      if (size <= 1) soloHouseholds += 1;
      else multiMemberHouseholds += 1;
    });
    const totalHouseholds = householdSizes.size;

    const childGender = createEmptyGenderCounts();
    bucket.children.forEach((c) => {
      incrementGenderCounts(childGender, c.gender);
    });
    const childrenAgeStats = computeSundaySchoolAgeCohorts(bucket.children, currentYear);

    const combinedPeopleTotal = memberGender.total + childGender.total;

    chapelRows.push({
      chapelName,
      isUnassignedBucket: bucket.isUnassignedBucket,
      totalHouseholds,
      soloHouseholds,
      multiMemberHouseholds,
      members: memberGender,
      children: childGender,
      childrenAgeStats,
      combinedPeopleTotal
    });

    grandTotalHouseholds += totalHouseholds;
    grandSoloHouseholds += soloHouseholds;
    grandMultiHouseholds += multiMemberHouseholds;

    grandTotalMembers.male += memberGender.male;
    grandTotalMembers.female += memberGender.female;
    grandTotalMembers.unspecified += memberGender.unspecified;
    grandTotalMembers.total += memberGender.total;

    grandTotalChildren.male += childGender.male;
    grandTotalChildren.female += childGender.female;
    grandTotalChildren.unspecified += childGender.unspecified;
    grandTotalChildren.total += childGender.total;
  });

  const childrenAgeStats = computeSundaySchoolAgeCohorts(visibleChildren, currentYear);

  // 3. Sunday School Students (enriched from churchChildren + churchMembers)
  const lookup = buildChurchStudentLookup(churchChildren, churchMembers);
  const allClassNames = Array.from(
    new Set([...classList, ...Object.keys(studentsByClass || {})])
  );

  const enrichedByClass: { [className: string]: Student[] } = {};
  const allEnrichedStudents: Student[] = [];
  const sundaySchoolSummary = createEmptyGenderCounts();

  allClassNames.forEach((clsName) => {
    const rawList = studentsByClass?.[clsName] || [];
    const enrichedList = rawList.map((st) =>
      enrichStudentWithChurchLookup(st, lookup, currentYear)
    );
    const scopedEnriched = activeChapelScope
      ? enrichedList.filter(
          (st) => st.chapel && resolveOfficialChapel(st.chapel) === activeChapelScope
        )
      : enrichedList;

    enrichedByClass[clsName] = scopedEnriched;
    scopedEnriched.forEach((st) => {
      allEnrichedStudents.push(st);
      incrementGenderCounts(sundaySchoolSummary, st.gender);
    });
  });

  const sundaySchoolAgeStats = computeSundaySchoolAgeCohorts(allEnrichedStudents, currentYear);
  const perClassAgeRows = computePerClassSundaySchoolCohorts(
    allClassNames,
    enrichedByClass,
    currentYear
  );

  const sundaySchoolPerClass: SundaySchoolClassGenderRow[] = perClassAgeRows.map((row) => ({
    className: row.className,
    male: row.grandTotal.male,
    female: row.grandTotal.female,
    unspecified: row.grandTotal.unspecifiedGender,
    total: row.grandTotal.total,
    subtotal0to14: row.subtotal0to14.total,
    cohortStats: row
  }));

  return {
    membersSummary: {
      ...grandTotalMembers,
      totalHouseholds: grandTotalHouseholds,
      soloHouseholds: grandSoloHouseholds,
      multiMemberHouseholds: grandMultiHouseholds
    },
    childrenSummary: grandTotalChildren,
    childrenAgeStats,
    sundaySchoolSummary,
    sundaySchoolAgeStats,
    sundaySchoolPerClass,
    chapelRows,
    chapelGrandTotal: {
      totalHouseholds: grandTotalHouseholds,
      soloHouseholds: grandSoloHouseholds,
      multiMemberHouseholds: grandMultiHouseholds,
      members: grandTotalMembers,
      children: grandTotalChildren,
      combinedPeopleTotal: grandTotalMembers.total + grandTotalChildren.total
    }
  };
};

export interface HRCategorySummary {
  counts: GenderTotalCounts;
  monthlySalary: number;
}

export interface AssetCategorySummary {
  itemCount: number;
  totalQty: number;
  totalValue: number;
}

export interface MissionaryScopeSummary {
  scope: MissionaryScope;
  counts: GenderTotalCounts;
  monthlySupport: number;
}

export interface BeneficiaryTypeSummary {
  supportType: BeneficiarySupportType;
  counts: GenderTotalCounts;
  monthlyAid: number;
}

export interface YouthGroupBreakdownRow {
  group: string;
  category: 'choir' | 'worship' | 'discipleship';
  counts: GenderTotalCounts;
}

export interface OrgUnitStatsRow {
  unitId: OrgUnitId;
  code: string;
  nameAm: string;
  level: 1 | 2 | 3 | 4;
  supportsFinance: boolean;
  peopleCounts: GenderTotalCounts;
  directMembersCount: number;
  specializedCount: number;
  activitiesCount: number;
  plansCount: number;
  income: number;
  expense: number;
  balance: number;
}

export interface ExtendedChurchStatistics {
  teachersCount: number;
  choirSummary: GenderTotalCounts;
  spiritualGroupSummary: GenderTotalCounts;
  chapelYouthTotal: GenderTotalCounts;
  chapelWomenTotal: {
    married: number;
    femaleHead: number;
    other: number;
    eligibleTotal: number;
  };
  chapelDemographicsByName: Map<string, ChapelYouthWomenSummary>;
  hrFullTime: HRCategorySummary;
  hrAdminStaff: HRCategorySummary;
  hrTotal: HRCategorySummary;
  assetsFixed: AssetCategorySummary;
  assetsConsumable: AssetCategorySummary;
  assetsTotal: AssetCategorySummary;
  youthChoirSummary: GenderTotalCounts;
  youthWorshipLeadersSummary: GenderTotalCounts;
  youthDiscipleshipSummary: GenderTotalCounts;
  youthByGroupBreakdown: YouthGroupBreakdownRow[];
  beneficiariesPermanent: BeneficiaryTypeSummary;
  beneficiariesTemporary: BeneficiaryTypeSummary;
  beneficiariesTotal: {
    counts: GenderTotalCounts;
    monthlyAid: number;
  };
  missionariesByScope: MissionaryScopeSummary[];
  missionariesTotal: {
    counts: GenderTotalCounts;
    monthlySupport: number;
  };
  allDeptDirectMembersSummary: GenderTotalCounts;
  orgUnitRows: OrgUnitStatsRow[];
  orgUnitGrandTotal: {
    peopleCounts: GenderTotalCounts;
    activitiesCount: number;
    plansCount: number;
    income: number;
    expense: number;
    balance: number;
  };
  submissionsSummary: {
    total: number;
    plans: number;
    reports: number;
    letters: number;
    pendingSpiritual: number;
    returnedBySpiritual: number;
    approvedSpiritual: number;
    forwardedToAdmin: number;
    acknowledgedByAdmin: number;
  };
  dispatchesSummary: {
    total: number;
    pending: number;
    accepted: number;
    returned: number;
  };
  allPlansTaskCount: number;
  allPlansWithExecutionCount: number;
}

const addGenderCounts = (target: GenderTotalCounts, addition: GenderTotalCounts): void => {
  target.male += addition.male;
  target.female += addition.female;
  target.unspecified += addition.unspecified;
  target.total += addition.total;
};

const countAnnualPlansExecution = (plans: AnnualPlanItem[] | undefined): { total: number; executed: number } => {
  const list = Array.isArray(plans) ? plans : [];
  let executed = 0;
  list.forEach((p) => {
    const sumDone =
      (Number(p.q1Done) || 0) +
      (Number(p.q2Done) || 0) +
      (Number(p.q3Done) || 0) +
      (Number(p.q4Done) || 0);
    if (sumDone > 0) executed += 1;
  });
  return { total: list.length, executed };
};

export const computeExtendedChurchStats = ({
  currentYear,
  churchMembers,
  chapelList,
  scopedChapel,
  departmentDataMap = {},
  teachers = [],
  choirMembers = [],
  spiritualMembers = [],
  childrenPlans = [],
  submissions = [],
  planDispatches = []
}: {
  currentYear: string;
  churchMembers: ChurchMember[];
  chapelList?: string[];
  scopedChapel?: string | null;
  departmentDataMap?: { [unitId: string]: DepartmentWorkspaceData };
  teachers?: Teacher[];
  choirMembers?: ChoirMember[];
  spiritualMembers?: SpiritualMember[];
  childrenPlans?: AnnualPlanItem[];
  submissions?: MinistrySubmission[];
  planDispatches?: PlanDispatchItem[];
}): ExtendedChurchStatistics => {
  const baseChapels = chapelList && chapelList.length > 0 ? chapelList : DEFAULT_CHAPELS;
  const activeChapelScope = scopedChapel ? resolveOfficialChapel(scopedChapel) : null;

  // 1. Choir & Spiritual Members (Children / Church Music & Spiritual Groups)
  const choirSummary = createEmptyGenderCounts();
  choirMembers.forEach((m) => incrementGenderCounts(choirSummary, m.gender));

  const spiritualGroupSummary = createEmptyGenderCounts();
  spiritualMembers.forEach((m) => incrementGenderCounts(spiritualGroupSummary, m.gender));

  // 2. Per-chapel Youth & Women Demographics from churchMembers
  const chapelDemographicsByName = computeChapelYouthWomenStats(
    churchMembers,
    baseChapels,
    currentYear
  );
  const chapelYouthTotal = createEmptyGenderCounts();
  const chapelWomenTotal = { married: 0, femaleHead: 0, other: 0, eligibleTotal: 0 };

  chapelDemographicsByName.forEach((row, chapelName) => {
    if (activeChapelScope && resolveOfficialChapel(chapelName) !== activeChapelScope) return;
    chapelYouthTotal.male += row.youthMale;
    chapelYouthTotal.female += row.youthFemale;
    chapelYouthTotal.total += row.youthTotal;
    chapelWomenTotal.married += row.womenMarried;
    chapelWomenTotal.femaleHead += row.womenFemaleHead;
    chapelWomenTotal.other += row.womenOther;
    chapelWomenTotal.eligibleTotal += row.womenTotal;
  });

  // 3. Admin & Finance HR and Assets
  const adminWs = departmentDataMap.admin_finance || createEmptyDepartmentWorkspaceData();
  const hrFullTime: HRCategorySummary = { counts: createEmptyGenderCounts(), monthlySalary: 0 };
  const hrAdminStaff: HRCategorySummary = { counts: createEmptyGenderCounts(), monthlySalary: 0 };
  (adminWs.hrRecords || []).forEach((rec) => {
    const salary = Number(rec.monthlySalary) || 0;
    if (rec.category === 'full_time_minister') {
      incrementGenderCounts(hrFullTime.counts, rec.gender);
      hrFullTime.monthlySalary += salary;
    } else {
      incrementGenderCounts(hrAdminStaff.counts, rec.gender);
      hrAdminStaff.monthlySalary += salary;
    }
  });
  const hrTotal: HRCategorySummary = {
    counts: {
      male: hrFullTime.counts.male + hrAdminStaff.counts.male,
      female: hrFullTime.counts.female + hrAdminStaff.counts.female,
      unspecified: hrFullTime.counts.unspecified + hrAdminStaff.counts.unspecified,
      total: hrFullTime.counts.total + hrAdminStaff.counts.total
    },
    monthlySalary: hrFullTime.monthlySalary + hrAdminStaff.monthlySalary
  };

  const assetsFixed: AssetCategorySummary = { itemCount: 0, totalQty: 0, totalValue: 0 };
  const assetsConsumable: AssetCategorySummary = { itemCount: 0, totalQty: 0, totalValue: 0 };
  (adminWs.assetRecords || []).forEach((asset) => {
    const qty = Number(asset.quantity) || 0;
    const totalVal =
      asset.totalValue !== undefined && asset.totalValue !== null
        ? Number(asset.totalValue) || 0
        : qty * (Number(asset.unitValue) || 0);
    if (asset.assetType === 'fixed') {
      assetsFixed.itemCount += 1;
      assetsFixed.totalQty += qty;
      assetsFixed.totalValue += totalVal;
    } else {
      assetsConsumable.itemCount += 1;
      assetsConsumable.totalQty += qty;
      assetsConsumable.totalValue += totalVal;
    }
  });
  const assetsTotal: AssetCategorySummary = {
    itemCount: assetsFixed.itemCount + assetsConsumable.itemCount,
    totalQty: assetsFixed.totalQty + assetsConsumable.totalQty,
    totalValue: assetsFixed.totalValue + assetsConsumable.totalValue
  };

  // 4. Youth Ministry Choirs, Worship Leaders & Discipleship
  const youthWs = departmentDataMap.youth_ministry || createEmptyDepartmentWorkspaceData();
  const youthChoirSummary = createEmptyGenderCounts();
  const youthWorshipLeadersSummary = createEmptyGenderCounts();
  const youthDiscipleshipSummary = createEmptyGenderCounts();
  const youthGroupMap = new Map<string, YouthGroupBreakdownRow>();

  const addYouthGroupMember = (
    groupName: string,
    category: 'choir' | 'worship' | 'discipleship',
    gender: unknown
  ) => {
    const label = String(groupName || '').trim() || 'ያልተገለጸ';
    const key = `${category}::${label}`;
    let entry = youthGroupMap.get(key);
    if (!entry) {
      entry = { group: label, category, counts: createEmptyGenderCounts() };
      youthGroupMap.set(key, entry);
    }
    incrementGenderCounts(entry.counts, gender);
  };

  (youthWs.youthChoirMembers || []).forEach((m) => {
    if (activeChapelScope && m.chapel && resolveOfficialChapel(m.chapel) !== activeChapelScope) return;
    incrementGenderCounts(youthChoirSummary, m.gender);
    addYouthGroupMember(m.group, 'choir', m.gender);
  });
  (youthWs.youthWorshipLeaders || []).forEach((m) => {
    if (activeChapelScope && m.chapel && resolveOfficialChapel(m.chapel) !== activeChapelScope) return;
    incrementGenderCounts(youthWorshipLeadersSummary, m.gender);
    addYouthGroupMember(m.group || 'የመዝሙር መሪዎች ህብረት', 'worship', m.gender);
  });
  (youthWs.youthDiscipleshipMembers || []).forEach((m) => {
    if (activeChapelScope && m.chapel && resolveOfficialChapel(m.chapel) !== activeChapelScope) return;
    incrementGenderCounts(youthDiscipleshipSummary, m.gender);
    addYouthGroupMember(m.group, 'discipleship', m.gender);
  });

  // 5. Love & Compassion Permanent vs Temporary Beneficiaries
  const compassionWs = departmentDataMap.love_compassion || createEmptyDepartmentWorkspaceData();
  const beneficiariesPermanent: BeneficiaryTypeSummary = {
    supportType: 'permanent',
    counts: createEmptyGenderCounts(),
    monthlyAid: 0
  };
  const beneficiariesTemporary: BeneficiaryTypeSummary = {
    supportType: 'temporary',
    counts: createEmptyGenderCounts(),
    monthlyAid: 0
  };
  (compassionWs.beneficiaryRecords || []).forEach((b) => {
    if (activeChapelScope && b.chapel && resolveOfficialChapel(b.chapel) !== activeChapelScope) return;
    const aid = Number(b.monthlyAidAmount) || 0;
    if (b.supportType === 'temporary') {
      incrementGenderCounts(beneficiariesTemporary.counts, b.gender);
      beneficiariesTemporary.monthlyAid += aid;
    } else {
      incrementGenderCounts(beneficiariesPermanent.counts, b.gender);
      beneficiariesPermanent.monthlyAid += aid;
    }
  });
  const beneficiariesTotal = {
    counts: {
      male: beneficiariesPermanent.counts.male + beneficiariesTemporary.counts.male,
      female: beneficiariesPermanent.counts.female + beneficiariesTemporary.counts.female,
      unspecified:
        beneficiariesPermanent.counts.unspecified + beneficiariesTemporary.counts.unspecified,
      total: beneficiariesPermanent.counts.total + beneficiariesTemporary.counts.total
    },
    monthlyAid: beneficiariesPermanent.monthlyAid + beneficiariesTemporary.monthlyAid
  };

  // 6. Evangelism Missionaries across 4 scopes
  const evangelismWs = departmentDataMap.evangelism || createEmptyDepartmentWorkspaceData();
  const scopeOrder: MissionaryScope[] = ['international', 'national', 'regional', 'local'];
  const missionaryScopeMap = new Map<MissionaryScope, MissionaryScopeSummary>();
  scopeOrder.forEach((sc) => {
    missionaryScopeMap.set(sc, {
      scope: sc,
      counts: createEmptyGenderCounts(),
      monthlySupport: 0
    });
  });
  const missionariesTotalCounts = createEmptyGenderCounts();
  let missionariesTotalMonthlySupport = 0;

  (evangelismWs.missionaryRecords || []).forEach((mr) => {
    const scope: MissionaryScope = scopeOrder.includes(mr.scope) ? mr.scope : 'local';
    const bucket = missionaryScopeMap.get(scope)!;
    const support = Number(mr.monthlySupportAmount) || 0;
    incrementGenderCounts(bucket.counts, mr.gender);
    bucket.monthlySupport += support;
    incrementGenderCounts(missionariesTotalCounts, mr.gender);
    missionariesTotalMonthlySupport += support;
  });

  // 7. All 17 Organizational Units Matrix
  const allDeptDirectMembersSummary = createEmptyGenderCounts();
  const orgUnitRows: OrgUnitStatsRow[] = [];
  const orgUnitGrandTotal = {
    peopleCounts: createEmptyGenderCounts(),
    activitiesCount: 0,
    plansCount: 0,
    income: 0,
    expense: 0,
    balance: 0
  };
  let allPlansTaskCount = 0;
  let allPlansWithExecutionCount = 0;

  CHURCH_ORG_UNITS.forEach((u) => {
    const ws = departmentDataMap[u.id] || createEmptyDepartmentWorkspaceData();
    const directCounts = createEmptyGenderCounts();
    (ws.members || []).forEach((m) => {
      incrementGenderCounts(directCounts, m.gender);
      incrementGenderCounts(allDeptDirectMembersSummary, m.gender);
    });

    const combinedPeople = { ...directCounts };
    let specializedCount = 0;

    if (u.id === 'admin_finance') {
      addGenderCounts(combinedPeople, hrTotal.counts);
      specializedCount = hrTotal.counts.total;
    } else if (u.id === 'youth_ministry') {
      addGenderCounts(combinedPeople, youthChoirSummary);
      addGenderCounts(combinedPeople, youthWorshipLeadersSummary);
      addGenderCounts(combinedPeople, youthDiscipleshipSummary);
      specializedCount =
        youthChoirSummary.total + youthWorshipLeadersSummary.total + youthDiscipleshipSummary.total;
    } else if (u.id === 'love_compassion') {
      addGenderCounts(combinedPeople, beneficiariesTotal.counts);
      specializedCount = beneficiariesTotal.counts.total;
    } else if (u.id === 'evangelism') {
      addGenderCounts(combinedPeople, missionariesTotalCounts);
      specializedCount = missionariesTotalCounts.total;
    }

    let income = 0;
    let expense = 0;
    (ws.finances || []).forEach((f) => {
      const amt = Number(f.amount) || 0;
      if (f.type === 'ገቢ') income += amt;
      else expense += amt;
    });
    const balance = income - expense;

    let plansCount = (ws.plans || []).length;
    if (u.id === 'children_ministry') {
      plansCount = childrenPlans.length;
      const exec = countAnnualPlansExecution(childrenPlans);
      allPlansTaskCount += exec.total;
      allPlansWithExecutionCount += exec.executed;
    } else if (u.id === 'chapels_dept') {
      const chapelPlanLists = Object.values(ws.chapelPlans || {});
      const chapelPlansTotal = chapelPlanLists.reduce(
        (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
        0
      );
      plansCount = (ws.plans || []).length + chapelPlansTotal;
      const wsExec = countAnnualPlansExecution(ws.plans);
      allPlansTaskCount += wsExec.total;
      allPlansWithExecutionCount += wsExec.executed;
      chapelPlanLists.forEach((list) => {
        const ex = countAnnualPlansExecution(list);
        allPlansTaskCount += ex.total;
        allPlansWithExecutionCount += ex.executed;
      });
    } else {
      const exec = countAnnualPlansExecution(ws.plans);
      allPlansTaskCount += exec.total;
      allPlansWithExecutionCount += exec.executed;
    }

    const activitiesCount = (ws.activities || []).length;

    orgUnitRows.push({
      unitId: u.id,
      code: u.code,
      nameAm: u.name,
      level: u.level,
      supportsFinance: u.supportsFinance,
      peopleCounts: combinedPeople,
      directMembersCount: directCounts.total,
      specializedCount,
      activitiesCount,
      plansCount,
      income,
      expense,
      balance
    });

    addGenderCounts(orgUnitGrandTotal.peopleCounts, combinedPeople);
    orgUnitGrandTotal.activitiesCount += activitiesCount;
    orgUnitGrandTotal.plansCount += plansCount;
    orgUnitGrandTotal.income += income;
    orgUnitGrandTotal.expense += expense;
    orgUnitGrandTotal.balance += balance;
  });

  // 8. Submissions & Dispatches Summary
  const visibleSubmissions = activeChapelScope
    ? submissions.filter(
        (s) => s.senderChapel && resolveOfficialChapel(s.senderChapel) === activeChapelScope
      )
    : submissions;
  const visibleDispatches = activeChapelScope
    ? planDispatches.filter(
        (d) => d.targetChapel && resolveOfficialChapel(d.targetChapel) === activeChapelScope
      )
    : planDispatches;

  const submissionsSummary = {
    total: visibleSubmissions.length,
    plans: visibleSubmissions.filter((s) => s.type === 'plan').length,
    reports: visibleSubmissions.filter((s) => s.type === 'report').length,
    letters: visibleSubmissions.filter((s) => s.type === 'letter').length,
    pendingSpiritual: visibleSubmissions.filter((s) => s.status === 'pending_spiritual').length,
    returnedBySpiritual: visibleSubmissions.filter((s) => s.status === 'returned_by_spiritual').length,
    approvedSpiritual: visibleSubmissions.filter((s) => s.status === 'approved_spiritual').length,
    forwardedToAdmin: visibleSubmissions.filter((s) => s.status === 'forwarded_to_admin').length,
    acknowledgedByAdmin: visibleSubmissions.filter((s) => s.status === 'acknowledged_by_admin').length
  };

  const dispatchesSummary = {
    total: visibleDispatches.length,
    pending: visibleDispatches.filter((d) => d.status === 'pending').length,
    accepted: visibleDispatches.filter((d) => d.status === 'accepted').length,
    returned: visibleDispatches.filter((d) => d.status === 'returned').length
  };

  return {
    teachersCount: teachers.length,
    choirSummary,
    spiritualGroupSummary,
    chapelYouthTotal,
    chapelWomenTotal,
    chapelDemographicsByName,
    hrFullTime,
    hrAdminStaff,
    hrTotal,
    assetsFixed,
    assetsConsumable,
    assetsTotal,
    youthChoirSummary,
    youthWorshipLeadersSummary,
    youthDiscipleshipSummary,
    youthByGroupBreakdown: Array.from(youthGroupMap.values()),
    beneficiariesPermanent,
    beneficiariesTemporary,
    beneficiariesTotal,
    missionariesByScope: scopeOrder.map((sc) => missionaryScopeMap.get(sc)!),
    missionariesTotal: {
      counts: missionariesTotalCounts,
      monthlySupport: missionariesTotalMonthlySupport
    },
    allDeptDirectMembersSummary,
    orgUnitRows,
    orgUnitGrandTotal,
    submissionsSummary,
    dispatchesSummary,
    allPlansTaskCount,
    allPlansWithExecutionCount
  };
};

