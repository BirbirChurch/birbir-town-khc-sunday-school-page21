/**
 * Guaranteed unique and monotonic ID generator for records (students, attendance, members, plans, etc.)
 * Prevents timestamp collision even when called many times in the same millisecond or inside tight CSV import loops.
 */

import { AppData, Student, AbsenteeRecord, ChoirMember, SpiritualMember, Teacher, AnnualPlanItem, ChurchChild, DepartmentWorkspaceData, MinistrySubmission, PlanDispatchItem, FailedLoginAttemptRecord, BlockedBrowserRule } from '../types';
import { CLASS_LIST, DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from '../constants/initialData';
import { CHURCH_ORG_UNITS, createDefaultEldersCouncilWorkspaceData, DEFAULT_ORG_UNIT_PINS } from '../constants/churchStructure';
import { assignSequentialCodesAndSortMembers, membersNeedCodeOrOrderSync } from './memberCodeGenerator';
import { canonicalizeEducationLevel, canonicalizeOccupation } from './amharicCategoryCanonicalizer';

let _lastUniqueId = Math.max(Date.now(), 1792849000000);

export const generateUniqueId = (): number => {
  const now = Date.now();
  _lastUniqueId = now > _lastUniqueId ? now : _lastUniqueId + 1;
  return _lastUniqueId;
};

/**
 * Sanitizes and repairs existing data to guarantee that every student, attendance record,
 * choir member, spiritual member, teacher, and annual plan item has a strictly unique, valid ID.
 * If any duplicates or invalid IDs are found (such as identical Date.now() collisions from past imports),
 * a fresh unique ID is deterministically assigned to the duplicate.
 */
const _sanitizedAppDataCache = new WeakSet<AppData>();

export const sanitizeAndDeduplicateAppData = (data: AppData): AppData => {
  if (!data || typeof data !== 'object') return data;
  if (_sanitizedAppDataCache.has(data)) return data;

  const seenIds = new Set<number>();
  let modified = false;

  const ensureUniqueId = (existingId: any): number => {
    const numId = Number(existingId);
    if (!numId || isNaN(numId) || numId <= 0 || seenIds.has(numId)) {
      modified = true;
      const newId = generateUniqueId();
      seenIds.add(newId);
      return newId;
    }
    seenIds.add(numId);
    return numId;
  };

  const validClassSet = new Set(CLASS_LIST);

  // 1. Sanitize students across all years and keep ONLY Makoya through Grade 12 classes
  const sanitizedStudents: AppData['students'] = {};
  if (data.students && typeof data.students === 'object') {
    Object.entries(data.students).forEach(([year, classesMap]) => {
      sanitizedStudents[year] = {};
      if (classesMap && typeof classesMap === 'object') {
        Object.entries(classesMap).forEach(([className, list]) => {
          if (!validClassSet.has(className)) {
            modified = true;
            return;
          }
          if (Array.isArray(list)) {
            sanitizedStudents[year][className] = list.map((student: Student) => {
              const checkedId = ensureUniqueId(student?.id);
              if (checkedId !== student?.id) {
                return { ...student, id: checkedId };
              }
              return student;
            });
          } else {
            sanitizedStudents[year][className] = [];
          }
        });
      }
    });
  }

  // 2. Sanitize attendance
  const sanitizedAttendance: AbsenteeRecord[] = Array.isArray(data.attendance)
    ? data.attendance
        .filter((rec) => {
          if (rec?.className && !validClassSet.has(rec.className)) {
            modified = true;
            return false;
          }
          return true;
        })
        .map((rec) => {
          const checkedId = ensureUniqueId(rec?.id);
          if (checkedId !== rec?.id) {
            return { ...rec, id: checkedId };
          }
          return rec;
        })
    : [];

  // 3. Sanitize choir members
  const sanitizedChoir: ChoirMember[] = Array.isArray(data.choirMembers)
    ? data.choirMembers.map((m) => {
        const checkedId = ensureUniqueId(m?.id);
        if (checkedId !== m?.id) {
          return { ...m, id: checkedId };
        }
        return m;
      })
    : [];

  // 4. Sanitize spiritual members
  const sanitizedSpiritual: SpiritualMember[] = Array.isArray(data.spiritualMembers)
    ? data.spiritualMembers.map((m) => {
        const checkedId = ensureUniqueId(m?.id);
        if (checkedId !== m?.id) {
          return { ...m, id: checkedId };
        }
        return m;
      })
    : [];

  // 5. Sanitize teachers (reassign deprecated classes to Makoya)
  const sanitizedTeachers: Teacher[] = Array.isArray(data.teachers)
    ? data.teachers.map((t) => {
        const checkedId = ensureUniqueId(t?.id);
        const validAssigned = t?.assignedClass && validClassSet.has(t.assignedClass)
          ? t.assignedClass
          : CLASS_LIST[0];
        if (checkedId !== t?.id || validAssigned !== t?.assignedClass) {
          modified = true;
          return { ...t, id: checkedId, assignedClass: validAssigned };
        }
        return t;
      })
    : [];

  // 6. Sanitize plans
  const sanitizedPlans: AnnualPlanItem[] = Array.isArray(data.plans)
    ? data.plans.map((p) => {
        const checkedId = ensureUniqueId(p?.id);
        if (checkedId !== p?.id) {
          return { ...p, id: checkedId };
        }
        return p;
      })
    : [];

  // 7. Sanitize & upgrade chapels list to DEFAULT_CHAPELS if old legacy list detected
  let sanitizedChapels = Array.isArray(data.chapels) ? data.chapels : [];
  if (
    sanitizedChapels.length === 0 ||
    sanitizedChapels.includes("ዋናው ማዕከል ቻፕል") ||
    sanitizedChapels.includes("ሰላም ቻፕል") ||
    !sanitizedChapels.includes("ኤልሮኢ ቻፕል")
  ) {
    sanitizedChapels = DEFAULT_CHAPELS;
    modified = true;
  }

  // Legacy chapel mapping for existing children in local state
  const legacyMap: Record<string, string> = {
    "ዋናው ማዕከል ቻፕል": "ኤልሮኢ ቻፕል",
    "ሰላም ቻፕል": "ሻሎም ቻፕል",
    "አማኑኤል ቻፕል": "ያህዌ ቻፕል",
    "ጽዮን ቻፕል": "አቤንኤዘር ቻፕል",
    "ገነት ቻፕል": "አዶናይ ቻፕል"
  };

  // 8. Sanitize churchChildren
  const sanitizedChurchChildren: ChurchChild[] = Array.isArray(data.churchChildren)
    ? data.churchChildren.map((c) => {
        const checkedId = ensureUniqueId(c?.id);
        const mappedChapel = (c?.chapel && legacyMap[c.chapel]) ? legacyMap[c.chapel] : c?.chapel;
        const normEdu = canonicalizeEducationLevel(c?.educationLevel);
        const normOcc = canonicalizeOccupation(c?.occupation);
        if (
          checkedId !== c?.id ||
          mappedChapel !== c?.chapel ||
          normEdu !== c?.educationLevel ||
          normOcc !== c?.occupation
        ) {
          modified = true;
          return {
            ...c,
            id: checkedId,
            chapel: mappedChapel || DEFAULT_CHAPELS[0],
            educationLevel: normEdu,
            occupation: normOcc
          };
        }
        return c;
      })
    : [];

  // 9. Sanitize churchMembers (unique IDs + canonical categories + sequential chapel codes & chapel ordering)
  let sanitizedChurchMembers = Array.isArray(data.churchMembers)
    ? data.churchMembers.map((m) => {
        const checkedId = ensureUniqueId(m?.id);
        const normEdu = canonicalizeEducationLevel(m?.educationLevel);
        const normOcc = canonicalizeOccupation(m?.occupation);
        if (
          checkedId !== m?.id ||
          normEdu !== m?.educationLevel ||
          normOcc !== m?.occupation
        ) {
          modified = true;
          return {
            ...m,
            id: checkedId,
            educationLevel: normEdu,
            occupation: normOcc
          };
        }
        return m;
      })
    : [];

  if (membersNeedCodeOrOrderSync(sanitizedChurchMembers)) {
    sanitizedChurchMembers = assignSequentialCodesAndSortMembers(sanitizedChurchMembers);
    modified = true;
  }

  // 10. Ensure pins, chapel PINs & org unit PINs exist
  const existingChapelPins = data.pins?.chapels || {};
  const mergedChapelPins: { [chapelName: string]: string } = { ...DEFAULT_CHAPEL_PINS, ...existingChapelPins };
  const existingUnitPins = data.pins?.units || {};
  const mergedUnitPins: { [unitId: string]: string } = {
    ...DEFAULT_ORG_UNIT_PINS,
    ...existingUnitPins
  };
  if (!existingUnitPins.children_ministry && data.pins?.leader) {
    mergedUnitPins.children_ministry = data.pins.leader;
  }
  const pinsNeedUpdate =
    !data.pins ||
    !data.pins.childrenCoordinator ||
    !data.pins.youthCoordinator ||
    !data.pins.chapels ||
    !data.pins.units ||
    DEFAULT_CHAPELS.some((ch) => !existingChapelPins[ch]) ||
    CHURCH_ORG_UNITS.some((u) => !mergedUnitPins[u.id]);
  if (pinsNeedUpdate) {
    modified = true;
  }

  // 10b. Sanitize departmentData record IDs without losing fields
  const rawDeptData = data.departmentData && typeof data.departmentData === 'object' ? data.departmentData : {};
  const sanitizedDepartmentData: { [unitId: string]: DepartmentWorkspaceData } = {};
  Object.entries(rawDeptData).forEach(([unitId, ws]) => {
    if (!ws || typeof ws !== 'object') return;
    sanitizedDepartmentData[unitId] = {
      members: Array.isArray(ws.members)
        ? ws.members.map((m) => {
            const checkedId = ensureUniqueId(m?.id);
            return checkedId !== m?.id ? { ...m, id: checkedId } : m;
          })
        : [],
      activities: Array.isArray(ws.activities)
        ? ws.activities.map((a) => {
            const checkedId = ensureUniqueId(a?.id);
            return checkedId !== a?.id ? { ...a, id: checkedId } : a;
          })
        : [],
      finances: Array.isArray(ws.finances)
        ? ws.finances.map((f) => {
            const checkedId = ensureUniqueId(f?.id);
            return checkedId !== f?.id ? { ...f, id: checkedId } : f;
          })
        : [],
      plans: Array.isArray(ws.plans)
        ? ws.plans.map((p) => {
            const checkedId = ensureUniqueId(p?.id);
            return checkedId !== p?.id ? { ...p, id: checkedId } : p;
          })
        : [],
      leaders: Array.isArray(ws.leaders)
        ? ws.leaders.map((ldr) => {
            const checkedId = ensureUniqueId(ldr?.id);
            return checkedId !== ldr?.id ? { ...ldr, id: checkedId } : ldr;
          })
        : [],
      chapelLeaders: Array.isArray(ws.chapelLeaders)
        ? ws.chapelLeaders.map((cl) => {
            const checkedId = ensureUniqueId(cl?.id);
            return checkedId !== cl?.id ? { ...cl, id: checkedId } : cl;
          })
        : [],
      historicalLeaders: Array.isArray(ws.historicalLeaders)
        ? ws.historicalLeaders.map((hl) => {
            const checkedId = ensureUniqueId(hl?.id);
            return checkedId !== hl?.id ? { ...hl, id: checkedId } : hl;
          })
        : [],
      hrRecords: Array.isArray(ws.hrRecords)
        ? ws.hrRecords.map((hr) => {
            const checkedId = ensureUniqueId(hr?.id);
            return checkedId !== hr?.id ? { ...hr, id: checkedId } : hr;
          })
        : [],
      assetRecords: Array.isArray(ws.assetRecords)
        ? ws.assetRecords.map((ar) => {
            const checkedId = ensureUniqueId(ar?.id);
            return checkedId !== ar?.id ? { ...ar, id: checkedId } : ar;
          })
        : [],
      chapelPlans:
        ws.chapelPlans && typeof ws.chapelPlans === 'object'
          ? Object.fromEntries(
              Object.entries(ws.chapelPlans).map(([cName, list]) => [
                cName,
                Array.isArray(list)
                  ? list.map((p) => {
                      const checkedId = ensureUniqueId(p?.id);
                      return checkedId !== p?.id ? { ...p, id: checkedId } : p;
                    })
                  : []
              ])
            )
          : {},
      youthChoirGroups: Array.isArray(ws.youthChoirGroups) ? ws.youthChoirGroups : undefined,
      youthChoirMembers: Array.isArray(ws.youthChoirMembers)
        ? ws.youthChoirMembers.map((m) => {
            const checkedId = ensureUniqueId(m?.id);
            return checkedId !== m?.id ? { ...m, id: checkedId } : m;
          })
        : undefined,
      youthWorshipLeaders: Array.isArray(ws.youthWorshipLeaders)
        ? ws.youthWorshipLeaders.map((m) => {
            const checkedId = ensureUniqueId(m?.id);
            return checkedId !== m?.id ? { ...m, id: checkedId } : m;
          })
        : undefined,
      youthDiscipleshipGroups: Array.isArray(ws.youthDiscipleshipGroups)
        ? ws.youthDiscipleshipGroups
        : undefined,
      youthDiscipleshipMembers: Array.isArray(ws.youthDiscipleshipMembers)
        ? ws.youthDiscipleshipMembers.map((m) => {
            const checkedId = ensureUniqueId(m?.id);
            return checkedId !== m?.id ? { ...m, id: checkedId } : m;
          })
        : undefined,
      youthCoordinatorNotes:
        typeof ws.youthCoordinatorNotes === 'string' ? ws.youthCoordinatorNotes : undefined,
      beneficiaryRecords: Array.isArray(ws.beneficiaryRecords)
        ? ws.beneficiaryRecords.map((b) => {
            const checkedId = ensureUniqueId(b?.id);
            return checkedId !== b?.id ? { ...b, id: checkedId } : b;
          })
        : undefined,
      missionaryRecords: Array.isArray(ws.missionaryRecords)
        ? ws.missionaryRecords.map((mr) => {
            const checkedId = ensureUniqueId(mr?.id);
            return checkedId !== mr?.id ? { ...mr, id: checkedId } : mr;
          })
        : undefined,
      eldersDefaultSeeded: ws.eldersDefaultSeeded === true ? true : undefined
    };
  });

  const curElders = sanitizedDepartmentData.elders_council;
  if (
    !curElders ||
    (!curElders.eldersDefaultSeeded &&
      curElders.members.length === 0 &&
      (curElders.leaders?.length || 0) === 0)
  ) {
    const seeded = createDefaultEldersCouncilWorkspaceData();
    sanitizedDepartmentData.elders_council = {
      ...(curElders || seeded),
      members: seeded.members.map((m) => ({ ...m, id: ensureUniqueId(m.id) })),
      leaders: (seeded.leaders || []).map((ldr) => ({ ...ldr, id: ensureUniqueId(ldr.id) })),
      eldersDefaultSeeded: true
    };
    modified = true;
  }

  // 10c. Sanitize submissions array
  const sanitizedSubmissions: MinistrySubmission[] = Array.isArray(data.submissions)
    ? data.submissions.map((sub) => {
        const checkedId = ensureUniqueId(sub?.id);
        return checkedId !== sub?.id ? { ...sub, id: checkedId } : sub;
      })
    : [];

  // 10d. Sanitize planDispatches array
  const sanitizedPlanDispatches: PlanDispatchItem[] = Array.isArray(data.planDispatches)
    ? data.planDispatches.map((disp) => {
        const checkedId = ensureUniqueId(disp?.id);
        const dispPlans = Array.isArray(disp?.plans)
          ? disp.plans.map((p) => {
              const pId = ensureUniqueId(p?.id);
              return pId !== p?.id ? { ...p, id: pId } : p;
            })
          : [];
        return checkedId !== disp?.id || dispPlans !== disp?.plans
          ? { ...disp, id: checkedId, plans: dispPlans }
          : disp;
      })
    : [];

  // 10e. Sanitize failedLoginAttempts and blockedBrowsers arrays
  const sanitizedFailedLoginAttempts: FailedLoginAttemptRecord[] = Array.isArray(data.failedLoginAttempts)
    ? data.failedLoginAttempts.map((att) => {
        const checkedId = ensureUniqueId(att?.id);
        return checkedId !== att?.id ? { ...att, id: checkedId } : att;
      })
    : [];

  const sanitizedBlockedBrowsers: BlockedBrowserRule[] = Array.isArray(data.blockedBrowsers)
    ? data.blockedBrowsers.map((rule) => {
        const checkedId = ensureUniqueId(rule?.id);
        return checkedId !== rule?.id ? { ...rule, id: checkedId } : rule;
      })
    : [];

  // Sanitize weeklyAttendance & classSubjects to drop any non-Makoya..12th class keys
  const sanitizedWeeklyAttendance: AppData['weeklyAttendance'] = {};
  if (data.weeklyAttendance && typeof data.weeklyAttendance === 'object') {
    Object.entries(data.weeklyAttendance).forEach(([yr, cMap]) => {
      sanitizedWeeklyAttendance[yr] = {};
      if (cMap && typeof cMap === 'object') {
        Object.entries(cMap).forEach(([cName, val]) => {
          if (validClassSet.has(cName)) {
            sanitizedWeeklyAttendance[yr][cName] = val;
          } else {
            modified = true;
          }
        });
      }
    });
  }

  const sanitizedClassSubjects: AppData['classSubjects'] = {};
  if (data.classSubjects && typeof data.classSubjects === 'object') {
    Object.entries(data.classSubjects).forEach(([cName, val]) => {
      if (validClassSet.has(cName)) {
        sanitizedClassSubjects[cName] = val;
      } else {
        modified = true;
      }
    });
  }

  // 11. Ensure every teacher has a non-empty PIN (since teachers log in solely by PIN)
  const usedTeacherPins = new Set<string>(
    sanitizedTeachers.map((t) => String(t?.pin || '').trim()).filter(Boolean)
  );
  const ensuredTeachers = sanitizedTeachers.map((t) => {
    const curPin = String(t?.pin || '').trim();
    if (curPin) return t;
    let candidate = String(Math.floor(1000 + Math.random() * 9000));
    while (usedTeacherPins.has(candidate)) {
      candidate = String(Math.floor(1000 + Math.random() * 9000));
    }
    usedTeacherPins.add(candidate);
    modified = true;
    return { ...t, pin: candidate };
  });

  // 12. Ensure baseline ageReferenceYear (default 2017 E.C.) and years include 2017-2019
  const existingYears = Array.isArray(data.years) ? data.years : [];
  const mergedYears = Array.from(new Set(['2017', '2018', '2019', ...existingYears])).sort();
  if (mergedYears.length !== existingYears.length || !data.ageReferenceYear) {
    modified = true;
  }

  if (!modified) {
    _sanitizedAppDataCache.add(data);
    return data;
  }

  const sanitizedResult: AppData = {
    ...data,
    years: mergedYears,
    ageReferenceYear: typeof data.ageReferenceYear === 'number' && data.ageReferenceYear > 1990 ? data.ageReferenceYear : 2017,
    pins: {
      admin: data.pins?.admin || '1234',
      leader: mergedUnitPins.children_ministry || data.pins?.leader || '5678',
      childrenCoordinator: data.pins?.childrenCoordinator || '5679',
      youthCoordinator: data.pins?.youthCoordinator || '3214',
      chapels: mergedChapelPins,
      units: mergedUnitPins
    },
    weeklyAttendance: sanitizedWeeklyAttendance,
    weekDates: data.weekDates || {},
    classSubjects: sanitizedClassSubjects,
    students: sanitizedStudents,
    attendance: sanitizedAttendance,
    choirMembers: sanitizedChoir,
    spiritualMembers: sanitizedSpiritual,
    teachers: ensuredTeachers,
    plans: sanitizedPlans,
    chapels: DEFAULT_CHAPELS,
    churchChildren: sanitizedChurchChildren,
    churchMembers: sanitizedChurchMembers,
    departmentData: sanitizedDepartmentData,
    submissions: sanitizedSubmissions,
    planDispatches: sanitizedPlanDispatches,
    failedLoginAttempts: sanitizedFailedLoginAttempts,
    blockedBrowsers: sanitizedBlockedBrowsers
  };
  _sanitizedAppDataCache.add(sanitizedResult);
  return sanitizedResult;
};
