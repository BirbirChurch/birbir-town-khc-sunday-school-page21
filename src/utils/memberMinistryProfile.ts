import {
  ChoirMember,
  ChurchMember,
  DepartmentWorkspaceData,
  EvangelismMemberStatus,
  SpiritualMember,
  Student,
  Teacher
} from '../types';
import {
  CHAPEL_LEADER_CATEGORIES,
  CHURCH_ORG_UNITS,
  HR_UNASSIGNED_ROLE_PLACEHOLDER
} from '../constants/churchStructure';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { mapToOfficialChapel, normalizeAmharicSearchText } from './amharicSearchAndChapel';
import {
  getHRDepartments,
  getHRRoleTitles,
  stripEthiopianHonorificTitles
} from './hrMemberMatcher';

export interface MemberMinistryProfile {
  serviceRoles: string[];
  autoServiceRoles: string[];
  evangelismStatus: EvangelismMemberStatus;
  evangelismFromDept: boolean;
  spiritualCourses: string[];
  autoSpiritualCourses: string[];
}

export interface EvangelismMasterStatusMeta {
  key: EvangelismMemberStatus;
  am: string;
  shortAm: string;
  en: string;
  deptStoredValue: string;
  badgeClass: string;
}

export const EVANGELISM_MASTER_STATUS_META: Record<
  EvangelismMemberStatus,
  EvangelismMasterStatusMeta
> = {
  paying: {
    key: 'paying',
    am: 'አባል — የሚከፍል',
    shortAm: 'የሚከፍል',
    en: 'Member — Paying',
    deptStoredValue: 'እየከፈለ ያለ',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  unpaid: {
    key: 'unpaid',
    am: 'አባል — የማይከፍል',
    shortAm: 'የማይከፍል',
    en: 'Member — Not Paying',
    deptStoredValue: 'ንቁ',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300'
  },
  discontinued: {
    key: 'discontinued',
    am: 'አባል የነበረ — ያቋረጠ',
    shortAm: 'ያቋረጠ',
    en: 'Member — Discontinued',
    deptStoredValue: 'ሙሉ በሙሉ ያቋረጠ',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300'
  },
  not_member: {
    key: 'not_member',
    am: 'አባል ያልሆነ',
    shortAm: 'አባል ያልሆነ',
    en: 'Not a Member',
    deptStoredValue: 'ሙሉ በሙሉ ያልተሳተፈ',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
  }
};

export const SUGGESTED_SERVICE_ROLES: string[] = [
  'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚ',
  'የቤተክርስቲያን አባት መሪ',
  'ዲያቆን',
  'መዘምራን ህብረት',
  'የመዝሙር መሪዎች ህብረት',
  'የወንጌል አገልግሎት መሪ',
  'ሚሽነሪ',
  'የወጣቶች አገልግሎት መሪ',
  'የሴቶች አገልግሎት መሪ',
  'የልጆች / ሰንበት ት/ቤት መምህር',
  'የጸሎት ቡድን መሪ',
  'የቻፕል መሪ',
  'ፍቅርና ርኅራሄ አገልጋይ',
  'የልማት ኮሚቴ አባል',
  'የአስተዳደርና ፋይናንስ አባል',
  'አስተባባሪ / ጸሐፊ'
];

export const SUGGESTED_SPIRITUAL_COURSES: string[] = [
  'መቅህማ',
  'ቢቲሲፒ (BTCP)',
  'መሠረታዊ የክርስቲያናዊ ትምህርት',
  'የጥምቀት ትምህርት',
  'የአዳዲስ አማኞች ትምህርት',
  'የመጽሐፍ ቅዱስ ትምህርት ቤት',
  'የምስራች ክለብ',
  'የመጽሐፍ ቅዱስ ጥናት ቡድን',
  'የደቀ መዝሙርነት ትምህርት'
];

export function mapDeptEvangelismStatusToMaster(status?: string): EvangelismMemberStatus {
  const s = String(status || '').trim().toLowerCase();
  if (!s) return 'unpaid';
  if (s.includes('ያቋረጠ') || s.includes('አቋርጧል') || s.includes('discontinu') || s.includes('stop')) {
    return 'discontinued';
  }
  if (
    s.includes('ያልተሳተፈ') ||
    s.includes('አባል ያልሆነ') ||
    s.includes('not participating') ||
    s.includes('not_member')
  ) {
    return 'not_member';
  }
  if (s.includes('እየከፈለ') || s.includes('paying') || s.includes('contributing')) {
    return 'paying';
  }
  return 'unpaid';
}

function addUnique(list: string[], value: string) {
  const clean = value.trim();
  if (!clean) return;
  const normClean = normalizeAmharicSearchText(clean);
  if (!list.some((item) => normalizeAmharicSearchText(item) === normClean)) {
    list.push(clean);
  }
}

export interface BuildMemberProfileParams {
  churchMembers: ChurchMember[];
  departmentDataMap?: { [unitId: string]: DepartmentWorkspaceData };
  teachers?: Teacher[];
  choirMembers?: ChoirMember[];
  spiritualMembers?: SpiritualMember[];
  studentsByClass?: { [className: string]: Student[] };
}

export function buildMemberMinistryProfileIndex(
  params: BuildMemberProfileParams
): Map<number, MemberMinistryProfile> {
  const {
    churchMembers,
    departmentDataMap = {},
    teachers = [],
    choirMembers = [],
    spiritualMembers = [],
    studentsByClass = {}
  } = params;

  const autoRolesByNormName = new Map<string, string[]>();
  const autoCoursesByNormName = new Map<string, string[]>();
  const evangStatusByNormName = new Map<string, EvangelismMemberStatus>();

  const pushRole = (rawName: string | undefined, roleLabel: string) => {
    const key = normalizeAmharicSearchText(rawName);
    if (!key) return;
    const arr = autoRolesByNormName.get(key) || [];
    addUnique(arr, roleLabel);
    autoRolesByNormName.set(key, arr);
  };

  const pushCourse = (rawName: string | undefined, courseLabel: string) => {
    const key = normalizeAmharicSearchText(rawName);
    if (!key) return;
    const arr = autoCoursesByNormName.get(key) || [];
    addUnique(arr, courseLabel);
    autoCoursesByNormName.set(key, arr);
  };

  // 1. Unit Leaders & Members across all org units
  const unitNameMap = new Map(CHURCH_ORG_UNITS.map((u) => [u.id, u.name]));
  const chapelLeaderCatMap = new Map(CHAPEL_LEADER_CATEGORIES.map((c) => [c.id, c.am]));

  Object.entries(departmentDataMap).forEach(([unitId, ws]) => {
    if (!ws) return;
    const uName = unitNameMap.get(unitId as any) || unitId;

    // Department leaders
    (ws.leaders || []).forEach((leader) => {
      const roleDesc = leader.roleTitle?.trim()
        ? `${uName} — ${leader.roleTitle.trim()}`
        : `${uName} መሪ`;
      pushRole(leader.name, roleDesc);
    });

    // Chapel-specific leaders (in chapels_dept)
    (ws.chapelLeaders || []).forEach((cl) => {
      const catName = chapelLeaderCatMap.get(cl.category) || 'የቻፕል መሪ';
      const titleSuffix = cl.roleTitle?.trim() ? ` (${cl.roleTitle.trim()})` : '';
      pushRole(cl.name, `${catName}${titleSuffix} — ${cl.chapel}`);
    });

    // HR Full-time ministers & admin staff (match with & without honorific prefix + show multi-sectors)
    (ws.hrRecords || []).forEach((hr) => {
      const roles = getHRRoleTitles(hr, HR_UNASSIGNED_ROLE_PLACEHOLDER);
      const depts = getHRDepartments(hr);
      const fallbackRole =
        hr.category === 'full_time_minister' ? 'የሙሉ ጊዜ አገልጋይ' : 'የአስተዳደር ሠራተኛ';
      const roleText = roles.length > 0 ? roles.join('፣ ') : fallbackRole;
      const fullLabel = depts.length > 0 ? `${roleText} (${depts.join('፣ ')})` : roleText;
      pushRole(hr.name, fullLabel);
      const stripped = stripEthiopianHonorificTitles(hr.name);
      if (stripped && stripped !== normalizeAmharicSearchText(hr.name)) {
        pushRole(stripped, fullLabel);
      }
    });

    // Youth Choir Union
    (ws.youthChoirMembers || []).forEach((yc) => {
      const grp = yc.group?.trim();
      const rt = yc.roleTitle?.trim();
      const label = grp
        ? `መዘምራን ህብረት (${grp}${rt && rt !== 'አባል' ? ` · ${rt}` : ''})`
        : 'መዘምራን ህብረት';
      pushRole(yc.name, label);
    });

    // Youth Worship Leaders Union
    (ws.youthWorshipLeaders || []).forEach((yw) => {
      const grp = yw.group?.trim();
      const rt = yw.roleTitle?.trim();
      const extra = rt || grp;
      pushRole(yw.name, extra ? `የመዝሙር መሪዎች ህብረት (${extra})` : 'የመዝሙር መሪዎች ህብረት');
    });

    // Youth Discipleship Education (መቅህማ, ቢቲሲፒ (BTCP), etc.)
    (ws.youthDiscipleshipMembers || []).forEach((yd) => {
      const grp = yd.group?.trim() || 'የደቀ መዝሙርነት ትምህርት';
      pushCourse(yd.name, grp);
    });

    // Missionaries in Evangelism
    (ws.missionaryRecords || []).forEach((ms) => {
      const field = ms.missionField?.trim();
      pushRole(ms.name, field ? `ሚሽነሪ (${field})` : 'ሚሽነሪ');
    });

    // Department Members
    (ws.members || []).forEach((dm) => {
      if (unitId === 'evangelism') {
        const mappedStatus = mapDeptEvangelismStatusToMaster(dm.status);
        const normName = normalizeAmharicSearchText(dm.name);
        if (normName) {
          evangStatusByNormName.set(normName, mappedStatus);
        }
        if (mappedStatus === 'paying' || mappedStatus === 'unpaid') {
          const r = dm.roleOrClass?.trim();
          pushRole(
            dm.name,
            r && !r.includes('ተሳታፊ') ? `የወንጌል አገልግሎት (${r})` : 'የወንጌል አገልግሎት አባል'
          );
        }
        const roleLower = String(dm.roleOrClass || '').toLowerCase();
        if (roleLower.includes('ጥምቀት')) {
          pushCourse(dm.name, 'የጥምቀት ትምህርት');
        } else if (roleLower.includes('አዲስ አማኝ')) {
          pushCourse(dm.name, 'የአዳዲስ አማኞች ትምህርት');
        }
        return;
      }

      if (unitId === 'bible_school') {
        const lvl = dm.roleOrClass?.trim() || 'ተማሪ';
        if (lvl.includes('መምህር') || lvl.includes('ዲን') || lvl.includes('ርዕሰ')) {
          pushRole(dm.name, `የመጽሐፍ ቅዱስ ት/ቤት (${lvl})`);
        } else {
          pushCourse(dm.name, `የመጽሐፍ ቅዱስ ት/ቤት (${lvl})`);
        }
        return;
      }

      if (unitId === 'elders_council') {
        pushRole(dm.name, `የሽማግሌዎች ጉባኤ (${dm.roleOrClass || 'ስራ አስፈጻሚ'})`);
        return;
      }

      if (unitId === 'deacons') {
        pushRole(dm.name, dm.roleOrClass?.trim() || 'ዲያቆን');
        return;
      }

      if (unitId === 'love_compassion') {
        // Only tag ministers/coordinators, not beneficiaries unless noted
        const r = String(dm.roleOrClass || '');
        if (!r.includes('ተረጂ') && !r.includes('ድጋፍ')) {
          pushRole(dm.name, `${uName} (${r || 'አገልጋይ'})`);
        }
        return;
      }

      if (unitId === 'rehoboth_school') {
        const r = String(dm.roleOrClass || '');
        if (r.includes('መምህር') || r.includes('ርዕሰ') || r.includes('ሠራተኛ')) {
          pushRole(dm.name, `የርኆቦት ት/ቤት (${r})`);
        }
        return;
      }

      const roleText = dm.roleOrClass?.trim();
      if (roleText && roleText !== 'አባል' && roleText !== 'መደበኛ አባል') {
        pushRole(dm.name, `${uName} (${roleText})`);
      } else {
        pushRole(dm.name, uName);
      }
    });
  });

  // 2. Root Choir Members
  choirMembers.forEach((cm) => {
    const grp = cm.group?.trim() || 'መዘምራን';
    if (grp.includes('መዝሙር መሪ')) {
      pushRole(cm.name, `የመዝሙር መሪዎች ህብረት (${grp})`);
    } else {
      pushRole(cm.name, `መዘምራን ህብረት (${grp})`);
    }
  });

  // 3. Sunday School Teachers
  teachers.forEach((tc) => {
    pushRole(
      tc.name,
      tc.assignedClass ? `የሰንበት ት/ቤት መምህር (${tc.assignedClass})` : 'የሰንበት ት/ቤት መምህር'
    );
  });

  // 4. Root Spiritual Education Members (የምስራች ክለብ፣ የመቅህማ፣ መሠረታዊ...)
  spiritualMembers.forEach((sm) => {
    if (sm.group?.trim()) {
      pushCourse(sm.name, sm.group.trim());
    }
  });

  // 5. Sunday School Classes
  Object.entries(studentsByClass).forEach(([className, students]) => {
    (students || []).forEach((st) => {
      pushCourse(st.name, `ሰንበት ት/ቤት (${className})`);
    });
  });

  // Build final profile map keyed by ChurchMember.id
  const result = new Map<number, MemberMinistryProfile>();

  churchMembers.forEach((member) => {
    const normName = normalizeAmharicSearchText(member.name);
    const autoRoles = [...(autoRolesByNormName.get(normName) || [])];
    if (member.youthMinistryRole?.trim()) {
      addUnique(autoRoles, `የወጣቶች አገልግሎት (${member.youthMinistryRole.trim()})`);
    }

    const combinedRoles: string[] = [...autoRoles];
    (member.serviceRoles || []).forEach((r) => addUnique(combinedRoles, r));

    const autoCourses = [...(autoCoursesByNormName.get(normName) || [])];
    const combinedCourses: string[] = [...autoCourses];
    (member.spiritualCourses || []).forEach((c) => addUnique(combinedCourses, c));

    const deptStatus = evangStatusByNormName.get(normName);
    const resolvedEvangStatus: EvangelismMemberStatus =
      member.evangelismStatus || deptStatus || 'not_member';

    result.set(member.id, {
      serviceRoles: combinedRoles,
      autoServiceRoles: autoRoles,
      evangelismStatus: resolvedEvangStatus,
      evangelismFromDept: Boolean(deptStatus && !member.evangelismStatus),
      spiritualCourses: combinedCourses,
      autoSpiritualCourses: autoCourses
    });
  });

  return result;
}

export interface ChapelEvangelismRow {
  chapel: string;
  totalMembers: number;
  payingMale: number;
  payingFemale: number;
  payingTotal: number;
  unpaidMale: number;
  unpaidFemale: number;
  unpaidTotal: number;
  evangMemberTotal: number;
  discontinuedMale: number;
  discontinuedFemale: number;
  discontinuedTotal: number;
  notMemberMale: number;
  notMemberFemale: number;
  notMemberTotal: number;
}

function isFemale(gender?: string): boolean {
  const g = String(gender || '').trim().toLowerCase();
  return g === 'ሴ' || g.includes('ሴት') || g === 'f' || g === 'female';
}

export function computeChapelEvangelismBreakdown(
  members: ChurchMember[],
  profileMap: Map<number, MemberMinistryProfile>,
  visibleChapels: string[] = DEFAULT_CHAPELS
): {
  chapelRows: ChapelEvangelismRow[];
  totals: ChapelEvangelismRow;
} {
  const mapByChapel = new Map<string, ChapelEvangelismRow>();
  const makeEmpty = (chapel: string): ChapelEvangelismRow => ({
    chapel,
    totalMembers: 0,
    payingMale: 0,
    payingFemale: 0,
    payingTotal: 0,
    unpaidMale: 0,
    unpaidFemale: 0,
    unpaidTotal: 0,
    evangMemberTotal: 0,
    discontinuedMale: 0,
    discontinuedFemale: 0,
    discontinuedTotal: 0,
    notMemberMale: 0,
    notMemberFemale: 0,
    notMemberTotal: 0
  });

  visibleChapels.forEach((ch) => mapByChapel.set(ch, makeEmpty(ch)));
  const totals = makeEmpty('ጠቅላላ ድምር');

  members.forEach((m) => {
    const ch = mapToOfficialChapel(m.chapel || '');
    if (!mapByChapel.has(ch)) {
      mapByChapel.set(ch, makeEmpty(ch));
    }
    const row = mapByChapel.get(ch)!;
    const status = profileMap.get(m.id)?.evangelismStatus || m.evangelismStatus || 'not_member';
    const fem = isFemale(m.gender);

    const applyTo = (target: ChapelEvangelismRow) => {
      target.totalMembers += 1;
      if (status === 'paying') {
        if (fem) target.payingFemale += 1;
        else target.payingMale += 1;
        target.payingTotal += 1;
        target.evangMemberTotal += 1;
      } else if (status === 'unpaid') {
        if (fem) target.unpaidFemale += 1;
        else target.unpaidMale += 1;
        target.unpaidTotal += 1;
        target.evangMemberTotal += 1;
      } else if (status === 'discontinued') {
        if (fem) target.discontinuedFemale += 1;
        else target.discontinuedMale += 1;
        target.discontinuedTotal += 1;
      } else {
        if (fem) target.notMemberFemale += 1;
        else target.notMemberMale += 1;
        target.notMemberTotal += 1;
      }
    };

    applyTo(row);
    applyTo(totals);
  });

  return {
    chapelRows: Array.from(mapByChapel.values()),
    totals
  };
}

export function syncChurchMemberToEvangelismRecords(
  prevEvangMembers: import('../types').DepartmentMemberRecord[],
  member: ChurchMember,
  nextStatus: EvangelismMemberStatus,
  generateId: () => number
): import('../types').DepartmentMemberRecord[] {
  const normTarget = normalizeAmharicSearchText(member.name);
  if (!normTarget) return prevEvangMembers;
  const meta = EVANGELISM_MASTER_STATUS_META[nextStatus];
  const existingIdx = prevEvangMembers.findIndex(
    (rec) => normalizeAmharicSearchText(rec.name) === normTarget
  );

  if (existingIdx >= 0) {
    return prevEvangMembers.map((rec, i) =>
      i === existingIdx
        ? {
            ...rec,
            status: meta.deptStoredValue,
            phone: rec.phone || member.phone
          }
        : rec
    );
  }

  return [
    ...prevEvangMembers,
    {
      id: generateId(),
      name: member.name,
      gender: member.gender === 'ሴ' || member.gender === 'ሴት' ? 'ሴ' : 'ወ',
      age: member.age,
      phone: member.phone,
      roleOrClass: 'የወንጌል አገልግሎት ተሳታፊ',
      educationOrLevel: member.educationLevel,
      status: meta.deptStoredValue,
      notes: member.chapel ? `ከ${member.chapel} ዋና ቋት` : 'ከዋናው ቋት'
    }
  ];
}
