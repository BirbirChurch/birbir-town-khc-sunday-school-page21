import { AppData, ChurchChild, ChurchMember, Student } from '../types';

export interface BulkAgeIncrementOptions {
  deltaYears: number;
  targetReferenceYear?: number;
  includeChurchMembers?: boolean;
  includeChurchChildren?: boolean;
  includeStudents?: boolean;
  includeChoirAndSpiritual?: boolean;
  targetAcademicYear?: string;
}

export interface BulkAgeIncrementStats {
  fromYear: number;
  toYear: number;
  deltaYears: number;
  membersUpdated: number;
  childrenUpdated: number;
  childrenTurned15Plus: number;
  studentsUpdated: number;
  otherMembersUpdated: number;
}

/**
 * Extracts a numeric age from stored values (number, "5", "5 ዓመት", "6 ወር" -> 0, etc.).
 * Returns null when age is blank or unparseable so blank records aren't corrupted.
 */
export const parseNumericAgeValue = (age: number | string | undefined | null): number | null => {
  if (age === undefined || age === null) return null;
  if (typeof age === 'number') {
    return isNaN(age) ? null : Math.max(0, Math.round(age));
  }
  const str = String(age).trim();
  if (!str || str === '-' || str === '--') return null;

  // Handle infants listed in months/days (e.g., "6 ወር", "9 ወራት") as age 0
  if (str.includes('ወር') || str.includes('month')) {
    return 0;
  }

  const numMatch = str.match(/\d+/);
  if (!numMatch) return null;
  const n = parseInt(numMatch[0], 10);
  if (isNaN(n) || n > 130) return null;
  return Math.max(0, n);
};

/**
 * Increments a single age value by `deltaYears` while clamping at 0.
 */
export const incrementSingleAgeValue = (
  age: number | string | undefined | null,
  deltaYears: number
): number | string | undefined => {
  if (age === undefined || age === null || age === '') return age ?? undefined;
  if (deltaYears === 0) return age;
  const parsed = parseNumericAgeValue(age);
  if (parsed === null) return age;
  return Math.max(0, parsed + deltaYears);
};

/**
 * Applies a one-time or yearly bulk age increment across church members, church children,
 * and optionally Sunday school students & groups, updating `ageReferenceYear` to prevent double-counting.
 */
export const applyBulkAgeIncrementToAppData = (
  data: AppData,
  options: BulkAgeIncrementOptions
): { updatedData: AppData; stats: BulkAgeIncrementStats } => {
  const fromYear = data.ageReferenceYear || 2017;
  const deltaYears = Math.trunc(options.deltaYears);
  const toYear = options.targetReferenceYear ?? fromYear + deltaYears;

  const includeMembers = options.includeChurchMembers !== false;
  const includeChildren = options.includeChurchChildren !== false;
  const includeStudents = Boolean(options.includeStudents);
  const includeOthers = Boolean(options.includeChoirAndSpiritual);

  let membersUpdated = 0;
  let childrenUpdated = 0;
  let childrenTurned15Plus = 0;
  let studentsUpdated = 0;
  let otherMembersUpdated = 0;

  const updatedChurchMembers: ChurchMember[] = includeMembers
    ? (data.churchMembers || []).map((m) => {
        const parsed = parseNumericAgeValue(m.age);
        if (parsed === null) return m;
        membersUpdated++;
        return {
          ...m,
          age: Math.max(0, parsed + deltaYears)
        };
      })
    : data.churchMembers || [];

  const updatedChurchChildren: ChurchChild[] = includeChildren
    ? (data.churchChildren || []).map((c) => {
        const parsed = parseNumericAgeValue(c.age);
        if (parsed === null) return c;
        childrenUpdated++;
        const nextAge = Math.max(0, parsed + deltaYears);
        if (parsed <= 14 && nextAge >= 15) {
          childrenTurned15Plus++;
        }
        return {
          ...c,
          age: nextAge
        };
      })
    : data.churchChildren || [];

  let updatedStudents = data.students || {};
  if (includeStudents && options.targetAcademicYear && updatedStudents[options.targetAcademicYear]) {
    const yearMap = updatedStudents[options.targetAcademicYear];
    const nextYearMap: { [cls: string]: Student[] } = {};
    Object.entries(yearMap).forEach(([cls, list]) => {
      nextYearMap[cls] = (list || []).map((st) => {
        const parsed = parseNumericAgeValue(st.age);
        if (parsed === null) return st;
        studentsUpdated++;
        return {
          ...st,
          age: Math.max(0, parsed + deltaYears)
        };
      });
    });
    updatedStudents = {
      ...updatedStudents,
      [options.targetAcademicYear]: nextYearMap
    };
  }

  let updatedChoirMembers = data.choirMembers || [];
  let updatedSpiritualMembers = data.spiritualMembers || [];
  if (includeOthers) {
    updatedChoirMembers = updatedChoirMembers.map((cm) => {
      const parsed = parseNumericAgeValue(cm.age);
      if (parsed === null) return cm;
      otherMembersUpdated++;
      return { ...cm, age: Math.max(0, parsed + deltaYears) };
    });
    updatedSpiritualMembers = updatedSpiritualMembers.map((sm) => {
      const parsed = parseNumericAgeValue(sm.age);
      if (parsed === null) return sm;
      otherMembersUpdated++;
      return { ...sm, age: Math.max(0, parsed + deltaYears) };
    });
  }

  return {
    updatedData: {
      ...data,
      ageReferenceYear: toYear,
      churchMembers: updatedChurchMembers,
      churchChildren: updatedChurchChildren,
      students: updatedStudents,
      choirMembers: updatedChoirMembers,
      spiritualMembers: updatedSpiritualMembers
    },
    stats: {
      fromYear,
      toYear,
      deltaYears,
      membersUpdated,
      childrenUpdated,
      childrenTurned15Plus,
      studentsUpdated,
      otherMembersUpdated
    }
  };
};
