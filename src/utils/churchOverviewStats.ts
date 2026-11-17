import { DEFAULT_CHAPELS } from '../constants/initialData';
import { ChurchChild, ChurchMember, Student } from '../types';
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
