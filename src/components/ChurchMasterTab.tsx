import React, { useState, useMemo, useRef } from 'react';
import {
  Database,
  Upload,
  Download,
  Search,
  Users,
  Church,
  UserPlus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  Calendar,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  GraduationCap,
  AlertCircle,
  KeyRound,
  Copy,
  Hash,
  Languages,
  BookOpen,
  Award,
  Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ChoirMember,
  ChurchMember,
  ChurchChild,
  DepartmentWorkspaceData,
  EvangelismMemberStatus,
  Role,
  SpiritualMember,
  Student,
  Teacher
} from '../types';
import {
  parseChildAge,
  mapToOfficialChapel,
  buildSundaySchoolIndex,
  matchChildNameToSundaySchool,
  SundaySchoolIndexStructure
} from './ChurchChildrenTab';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { NameCrossReferenceModal } from './NameCrossReferenceModal';
import { AnnualAgeIncrementModal } from './AnnualAgeIncrementModal';
import { BulkAgeIncrementOptions, BulkAgeIncrementStats } from '../utils/ageUpdater';
import {
  matchesAmharicSearch,
  normalizeAmharicSearchText,
  parseChurchWorkbookAllSheets
} from '../utils/churchExcelParser';
import {
  findAllMatchingMembersByCode,
  findMemberByEnteredCode,
  getNextFamilySubCode,
  getNextMemberCodeForChapel,
  getRootFamilyBaseCode,
  normalizeCodeForLookup,
  parseChapelCodeParts
} from '../utils/memberCodeGenerator';
import {
  NameScriptMode,
  transliterateAmharicToEnglish
} from '../utils/amharicTransliterator';
import { copyTextSafely } from '../utils/clipboard';
import {
  ChurchMemberBreakdownSection,
  SpiritualFilterValue
} from './ChurchMemberBreakdownSection';
import {
  canonicalizeEducationLevel,
  canonicalizeOccupation,
  computeChurchMemberDetailedBreakdown,
  normalizeMemberCategoryValue,
  SUGGESTED_EDUCATION_LEVELS,
  SUGGESTED_OCCUPATIONS
} from '../utils/churchMemberBreakdownStats';
import {
  buildMemberMinistryProfileIndex,
  computeChapelEvangelismBreakdown,
  EVANGELISM_MASTER_STATUS_META,
  SUGGESTED_SERVICE_ROLES,
  SUGGESTED_SPIRITUAL_COURSES
} from '../utils/memberMinistryProfile';

interface ChurchMasterTabProps {
  currentYear: string;
  ageReferenceYear?: number;
  churchMembers?: ChurchMember[];
  chapelList?: string[];
  churchChildren?: ChurchChild[];
  studentsByClass?: { [className: string]: Student[] };
  classList?: string[];
  departmentDataMap?: { [unitId: string]: DepartmentWorkspaceData };
  teachers?: Teacher[];
  choirMembers?: ChoirMember[];
  spiritualMembers?: SpiritualMember[];
  onBatchAddMembers: (members: ChurchMember[], mode?: 'append' | 'replace', baselineYear?: number) => void;
  onAddMember: (member: Omit<ChurchMember, 'id'>) => ChurchMember | void;
  onUpdateMember: (member: ChurchMember) => void;
  onUpdateEvangelismMemberStatus?: (member: ChurchMember, nextStatus: EvangelismMemberStatus) => void;
  onDeleteMember: (id: number) => void;
  onClearChurchMembers: () => void;
  onExtractChildrenToChildrenTab: (children: Omit<ChurchChild, 'id'>[], mode?: 'append' | 'replace') => void;
  onBulkIncrementAges?: (options: Omit<BulkAgeIncrementOptions, 'targetAcademicYear'>) => BulkAgeIncrementStats | null;
  currentUserRole: Role | null;
  loggedInChapel?: string | null;
  nameScriptMode?: NameScriptMode;
  onChangeNameScriptMode?: (mode: NameScriptMode) => void;
  onOpenTransliterator?: () => void;
}

export const ChurchMasterTab: React.FC<ChurchMasterTabProps> = ({
  currentYear,
  ageReferenceYear = 2017,
  churchMembers = [],
  chapelList = DEFAULT_CHAPELS,
  churchChildren = [],
  studentsByClass = {},
  classList = [],
  departmentDataMap = {},
  teachers = [],
  choirMembers = [],
  spiritualMembers = [],
  onBatchAddMembers,
  onAddMember,
  onUpdateMember,
  onUpdateEvangelismMemberStatus,
  onDeleteMember,
  onClearChurchMembers,
  onExtractChildrenToChildrenTab,
  onBulkIncrementAges,
  currentUserRole,
  loggedInChapel,
  nameScriptMode,
  onChangeNameScriptMode,
  onOpenTransliterator
}) => {
  const [localScriptMode, setLocalScriptMode] = useState<NameScriptMode>('am');
  const activeNameMode: NameScriptMode = nameScriptMode ?? localScriptMode;
  const setActiveNameMode = (mode: NameScriptMode) => {
    setLocalScriptMode(mode);
    if (onChangeNameScriptMode) onChangeNameScriptMode(mode);
  };
  const officialLoggedInChapel = useMemo(
    () => (loggedInChapel ? mapToOfficialChapel(loggedInChapel) : null),
    [loggedInChapel]
  );

  // Strict data isolation: when a Chapel Leader logs in, expose ONLY that chapel's members
  const effectiveMembers = useMemo(() => {
    if (!officialLoggedInChapel) return churchMembers;
    return churchMembers.filter(
      (m) => mapToOfficialChapel(m.chapel || '') === officialLoggedInChapel
    );
  }, [churchMembers, officialLoggedInChapel]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChapelFilter, setSelectedChapelFilter] = useState<string>(officialLoggedInChapel || 'all');
  const [selectedChapels, setSelectedChapels] = useState<string[]>(
    officialLoggedInChapel ? [officialLoggedInChapel] : []
  );
  const [displayLayoutMode, setDisplayLayoutMode] = useState<'table' | 'grouped_chapels'>('table');
  const [extractedSuccessMsg, setExtractedSuccessMsg] = useState<string>('');
  const [selectedAgeCohort, setSelectedAgeCohort] = useState<string>('all');
  const [sundaySchoolFilter, setSundaySchoolFilter] = useState<'all' | 'enrolled' | 'not_enrolled_children'>('all');
  const [selectedSpiritualFilter, setSelectedSpiritualFilter] = useState<SpiritualFilterValue>('all');
  const [selectedEducationKey, setSelectedEducationKey] = useState<string>('all');
  const [selectedOccupationKey, setSelectedOccupationKey] = useState<string>('all');
  const [selectedServiceRoleFilter, setSelectedServiceRoleFilter] = useState<string>('all');
  const [selectedEvangelismFilter, setSelectedEvangelismFilter] = useState<'all' | EvangelismMemberStatus>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [isNameCompareModalOpen, setIsNameCompareModalOpen] = useState<boolean>(false);
  const [isAgeModalOpen, setIsAgeModalOpen] = useState<boolean>(false);
  const [excelBaselineYear, setExcelBaselineYear] = useState<number>(2017);

  // Pagination for high capacity (5,300+ members)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Add / Edit Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<'new' | 'by_code'>('new');
  const [lookupCodeInput, setLookupCodeInput] = useState<string>('');
  const [lookupChapelHint, setLookupChapelHint] = useState<string>('');
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formGender, setFormGender] = useState<string>('ወ');
  const [formAge, setFormAge] = useState<string>('30');
  const [formEducationLevel, setFormEducationLevel] = useState<string>('ዲግሪ');
  const [formOccupation, setFormOccupation] = useState<string>('የመንግሥት ሠራተኛ');
  const [formIsBaptized, setFormIsBaptized] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const [formTakesLordsSupper, setFormTakesLordsSupper] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const [formPaysTithe, setFormPaysTithe] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const [formEvangelismStatus, setFormEvangelismStatus] = useState<EvangelismMemberStatus>('not_member');
  const [formServiceRoles, setFormServiceRoles] = useState<string[]>([]);
  const [formCustomRoleInput, setFormCustomRoleInput] = useState<string>('');
  const [formSpiritualCourses, setFormSpiritualCourses] = useState<string[]>([]);
  const [formCustomCourseInput, setFormCustomCourseInput] = useState<string>('');
  const [formChapel, setFormChapel] = useState<string>(officialLoggedInChapel || DEFAULT_CHAPELS[0]);
  const [formParent, setFormParent] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formResidence, setFormResidence] = useState<string>('');
  const [formRelation, setFormRelation] = useState<string>('');
  const [formWomenCategory, setFormWomenCategory] = useState<'auto' | 'married' | 'female_head' | 'other'>('auto');
  const [formFamilyCode, setFormFamilyCode] = useState<string>('');
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  React.useEffect(() => {
    if (officialLoggedInChapel) {
      setSelectedChapelFilter(officialLoggedInChapel);
      setSelectedChapels([officialLoggedInChapel]);
      setFormChapel(officialLoggedInChapel);
    } else {
      setSelectedChapelFilter('all');
      setSelectedChapels([]);
      setFormChapel(DEFAULT_CHAPELS[0]);
    }
  }, [officialLoggedInChapel]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Demographic Stats Matrix: 4 Cohorts (0-14, 15-29, 30-59, 60+)
  const masterDemographicStats = useMemo(() => {
    const cohorts = [
      { key: '0-14', label: 'ከ0 - 14 ዓመት (ልጆች / Children)', min: 0, max: 14, male: 0, female: 0, total: 0, color: 'amber' },
      { key: '15-29', label: 'ከ15 - 29 ዓመት (ወጣቶች / Youth)', min: 15, max: 29, male: 0, female: 0, total: 0, color: 'blue' },
      { key: '30-59', label: 'ከ30 - 59 ዓመት (ጎልማሶች & ወላጆች / Adults)', min: 30, max: 59, male: 0, female: 0, total: 0, color: 'emerald' },
      { key: '60+', label: '60 እና ከዚያ በላይ (አረጋውያን / Seniors)', min: 60, max: 999, male: 0, female: 0, total: 0, color: 'purple' }
    ];

    let totalMale = 0;
    let totalFemale = 0;

    effectiveMembers.forEach((m) => {
      const parsed = parseChildAge(m.age, parseInt(currentYear, 10) || 2018, 'auto');
      let numAge = parsed.age;
      if (numAge === -1 && m.age) {
        const match = String(m.age).match(/\d+/);
        if (match) numAge = parseInt(match[0], 10);
      }
      if (numAge === -1) numAge = 35; // Default adult cohort

      const isMale = m.gender === 'ወ' || m.gender === 'ወንድ';
      const isFemale = m.gender === 'ሴ' || m.gender === 'ሴት';

      if (isMale) totalMale++;
      if (isFemale) totalFemale++;

      let assigned = false;
      for (const cohort of cohorts) {
        if (numAge >= cohort.min && numAge <= cohort.max) {
          cohort.total++;
          if (isMale) cohort.male++;
          if (isFemale) cohort.female++;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        const last = cohorts[cohorts.length - 1];
        last.total++;
        if (isMale) last.male++;
        if (isFemale) last.female++;
      }
    });

    const totalMembers = effectiveMembers.length;

    return {
      cohorts,
      totalMembers,
      totalMale,
      totalFemale
    };
  }, [effectiveMembers, currentYear]);

  // Chapel statistics for Church Members (Strictly locked to DEFAULT_CHAPELS, or single loggedInChapel)
  const chapelStats = useMemo(() => {
    const visibleChapels = officialLoggedInChapel ? [officialLoggedInChapel] : DEFAULT_CHAPELS;
    const statsMap: { [chapel: string]: { total: number; childrenCount: number; adultCount: number; male: number; female: number } } = {};
    visibleChapels.forEach((ch) => {
      statsMap[ch] = { total: 0, childrenCount: 0, adultCount: 0, male: 0, female: 0 };
    });

    effectiveMembers.forEach((m) => {
      const ch = mapToOfficialChapel(m.chapel || '');
      if (!statsMap[ch]) {
        statsMap[ch] = { total: 0, childrenCount: 0, adultCount: 0, male: 0, female: 0 };
      }
      statsMap[ch].total++;
      if (m.gender === 'ወ' || m.gender === 'ወንድ') statsMap[ch].male++;
      if (m.gender === 'ሴ' || m.gender === 'ሴት') statsMap[ch].female++;

      const parsed = parseChildAge(m.age, parseInt(currentYear, 10) || 2018, 'auto');
      const numAge = parsed.age !== -1 ? parsed.age : parseInt(String(m.age || '0'), 10) || 0;

      if (numAge >= 0 && numAge <= 14) statsMap[ch].childrenCount++;
      else statsMap[ch].adultCount++;
    });

    return {
      chapels: visibleChapels,
      statsMap
    };
  }, [effectiveMembers, currentYear, officialLoggedInChapel]);

  // Sunday School Index for pure name matching regardless of age
  const sundaySchoolIndex: SundaySchoolIndexStructure = useMemo(() => {
    return buildSundaySchoolIndex(studentsByClass || {});
  }, [studentsByClass]);

  // Unified Service Roles, Evangelism Membership Status & Spiritual Courses Index across the entire church
  const memberMinistryProfileMap = useMemo(
    () =>
      buildMemberMinistryProfileIndex({
        churchMembers: effectiveMembers,
        departmentDataMap,
        teachers,
        choirMembers,
        spiritualMembers,
        studentsByClass
      }),
    [effectiveMembers, departmentDataMap, teachers, choirMembers, spiritualMembers, studentsByClass]
  );

  // Per-Chapel Evangelism Breakdown (Paying / Unpaid / Discontinued / Not a Member)
  const chapelEvangelismBreakdown = useMemo(
    () =>
      computeChapelEvangelismBreakdown(
        effectiveMembers,
        memberMinistryProfileMap,
        chapelStats.chapels
      ),
    [effectiveMembers, memberMinistryProfileMap, chapelStats.chapels]
  );

  // Distinct Spiritual Courses discovered across all members for easy filtering
  const availableSpiritualCourseOptions = useMemo(() => {
    const set = new Set<string>(SUGGESTED_SPIRITUAL_COURSES);
    memberMinistryProfileMap.forEach((p) => {
      p.spiritualCourses.forEach((c) => {
        if (c.trim()) set.add(c.trim());
      });
    });
    return Array.from(set);
  }, [memberMinistryProfileMap]);

  // Members mapped with Sunday School enrollment status + Ministry Profile
  const churchMembersWithStatus = useMemo(() => {
    return effectiveMembers.map((m) => {
      const match = matchChildNameToSundaySchool(m.name, sundaySchoolIndex);
      const parsed = parseChildAge(m.age, parseInt(currentYear, 10) || 2018, 'auto');
      let numAge = parsed.age;
      if (numAge === -1 && m.age) {
        const matchAge = String(m.age).match(/\d+/);
        if (matchAge) numAge = parseInt(matchAge[0], 10);
      }
      if (numAge === -1) numAge = 35;
      const isChild = numAge >= 0 && numAge <= 14;
      const profile = memberMinistryProfileMap.get(m.id) || {
        serviceRoles: m.serviceRoles || [],
        autoServiceRoles: [],
        evangelismStatus: m.evangelismStatus || ('not_member' as EvangelismMemberStatus),
        evangelismFromDept: false,
        spiritualCourses: m.spiritualCourses || [],
        autoSpiritualCourses: []
      };

      return {
        ...m,
        numAge,
        isChild,
        isEnrolled: Boolean(match),
        enrolledClass: match ? match.className : null,
        matchedStudent: match ? match.student : null,
        matchLabel: match ? match.matchLabel : null,
        studentAge: match?.student?.age ?? null,
        profile
      };
    });
  }, [effectiveMembers, sundaySchoolIndex, currentYear, memberMinistryProfileMap]);

  // Chapel-scoped members (used for Spiritual/Education/Occupation stats so clicking a category filters the directory without hiding other categories)
  const chapelScopedMembers = useMemo(() => {
    return effectiveMembers.filter((m) => {
      const memberChapel = mapToOfficialChapel(m.chapel || '');
      if (selectedChapels.length > 0) {
        return selectedChapels.includes(memberChapel);
      }
      if (selectedChapelFilter !== 'all') {
        return memberChapel === selectedChapelFilter;
      }
      return true;
    });
  }, [effectiveMembers, selectedChapels, selectedChapelFilter]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return churchMembersWithStatus.filter((m) => {
      // Search term (Amharic homophones, multi-word names, phones, chapels, service roles, courses)
      if (searchTerm.trim()) {
        const matchedSearch = matchesAmharicSearch(
          searchTerm,
          m.memberCode,
          m.familyCode,
          m.name,
          m.parentName,
          m.phone,
          m.residence,
          m.chapel,
          m.relationToHead,
          m.matchedStudent?.name,
          m.enrolledClass,
          m.educationLevel,
          m.occupation,
          m.profile.serviceRoles.join(' '),
          m.profile.spiritualCourses.join(' '),
          EVANGELISM_MASTER_STATUS_META[m.profile.evangelismStatus].am
        );
        if (!matchedSearch) return false;
      }

      // Multi-chapel / Chapel filter
      const memberChapel = mapToOfficialChapel(m.chapel || '');
      if (selectedChapels.length > 0) {
        if (!selectedChapels.includes(memberChapel)) return false;
      } else if (selectedChapelFilter !== 'all') {
        if (memberChapel !== selectedChapelFilter) return false;
      }

      // Age Cohort Filter
      if (selectedAgeCohort !== 'all') {
        const numAge = m.numAge;
        if (selectedAgeCohort === '0-14' && (numAge < 0 || numAge > 14)) return false;
        if (selectedAgeCohort === '15-29' && (numAge < 15 || numAge > 29)) return false;
        if (selectedAgeCohort === '30-59' && (numAge < 30 || numAge > 59)) return false;
        if (selectedAgeCohort === '60+' && numAge < 60) return false;
      }

      // Sunday School filter
      if (sundaySchoolFilter === 'enrolled' && !m.isEnrolled) return false;
      if (sundaySchoolFilter === 'not_enrolled_children' && (!m.isChild || m.isEnrolled)) return false;

      // Spiritual participation filter
      if (selectedSpiritualFilter !== 'all') {
        if (selectedSpiritualFilter === 'baptized_yes' && m.isBaptized !== true) return false;
        if (selectedSpiritualFilter === 'baptized_no' && m.isBaptized !== false) return false;
        if (selectedSpiritualFilter === 'baptized_unknown' && m.isBaptized !== undefined) return false;

        if (selectedSpiritualFilter === 'supper_yes' && m.takesLordsSupper !== true) return false;
        if (selectedSpiritualFilter === 'supper_no' && m.takesLordsSupper !== false) return false;
        if (selectedSpiritualFilter === 'supper_unknown' && m.takesLordsSupper !== undefined) return false;

        if (selectedSpiritualFilter === 'tithe_yes' && m.paysTithe !== true) return false;
        if (selectedSpiritualFilter === 'tithe_no' && m.paysTithe !== false) return false;
        if (selectedSpiritualFilter === 'tithe_unknown' && m.paysTithe !== undefined) return false;
      }

      // Service Role filter
      if (selectedServiceRoleFilter !== 'all') {
        const rolesJoined = normalizeAmharicSearchText(m.profile.serviceRoles.join(' '));
        if (selectedServiceRoleFilter === 'has_any') {
          if (m.profile.serviceRoles.length === 0) return false;
        } else if (selectedServiceRoleFilter === 'none') {
          if (m.profile.serviceRoles.length > 0) return false;
        } else if (selectedServiceRoleFilter === 'choir') {
          if (!rolesJoined.includes(normalizeAmharicSearchText('መዘምራን'))) return false;
        } else if (selectedServiceRoleFilter === 'worship_leader') {
          if (!rolesJoined.includes(normalizeAmharicSearchText('የመዝሙር መሪ'))) return false;
        } else if (selectedServiceRoleFilter === 'leader') {
          if (
            !rolesJoined.includes(normalizeAmharicSearchText('መሪ')) &&
            !rolesJoined.includes(normalizeAmharicSearchText('ሽማግሌ')) &&
            !rolesJoined.includes(normalizeAmharicSearchText('አስተባባሪ'))
          ) {
            return false;
          }
        } else if (selectedServiceRoleFilter === 'deacon') {
          if (!rolesJoined.includes(normalizeAmharicSearchText('ዲያቆን'))) return false;
        } else if (selectedServiceRoleFilter === 'teacher') {
          if (!rolesJoined.includes(normalizeAmharicSearchText('መምህር'))) return false;
        } else if (selectedServiceRoleFilter === 'missionary') {
          if (!rolesJoined.includes(normalizeAmharicSearchText('ሚሽነሪ'))) return false;
        }
      }

      // Evangelism Status filter
      if (selectedEvangelismFilter !== 'all') {
        if (m.profile.evangelismStatus !== selectedEvangelismFilter) return false;
      }

      // Spiritual Course filter
      if (selectedCourseFilter !== 'all') {
        if (selectedCourseFilter === 'has_any') {
          if (m.profile.spiritualCourses.length === 0) return false;
        } else if (selectedCourseFilter === 'none') {
          if (m.profile.spiritualCourses.length > 0) return false;
        } else {
          const targetCourseNorm = normalizeAmharicSearchText(selectedCourseFilter);
          const hasCourse = m.profile.spiritualCourses.some((c) =>
            normalizeAmharicSearchText(c).includes(targetCourseNorm)
          );
          if (!hasCourse) return false;
        }
      }

      // Education Level & Occupation Category Filters
      if (selectedEducationKey !== 'all') {
        if (normalizeMemberCategoryValue(m.educationLevel, 'education').key !== selectedEducationKey) return false;
      }
      if (selectedOccupationKey !== 'all') {
        if (normalizeMemberCategoryValue(m.occupation, 'occupation').key !== selectedOccupationKey) return false;
      }

      return true;
    });
  }, [
    churchMembersWithStatus,
    searchTerm,
    selectedChapels,
    selectedChapelFilter,
    selectedAgeCohort,
    sundaySchoolFilter,
    selectedSpiritualFilter,
    selectedServiceRoleFilter,
    selectedEvangelismFilter,
    selectedCourseFilter,
    selectedEducationKey,
    selectedOccupationKey
  ]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedChapelFilter,
    selectedChapels,
    selectedAgeCohort,
    sundaySchoolFilter,
    selectedSpiritualFilter,
    selectedServiceRoleFilter,
    selectedEvangelismFilter,
    selectedCourseFilter,
    selectedEducationKey,
    selectedOccupationKey,
    pageSize
  ]);

  // Paginated members for high-performance rendering of 5,300+ items
  const paginatedMembers = useMemo(() => {
    if (pageSize === -1) return filteredMembers;
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredMembers.length / pageSize) || 1;

  // Group filtered members by chapel
  const membersGroupedByChapel = useMemo(() => {
    const groups: { [chapel: string]: typeof filteredMembers } = {};
    chapelStats.chapels.forEach((ch) => {
      groups[ch] = [];
    });
    filteredMembers.forEach((m) => {
      const ch = mapToOfficialChapel(m.chapel || '');
      if (!groups[ch]) groups[ch] = [];
      groups[ch].push(m);
    });
    return groups;
  }, [filteredMembers, chapelStats.chapels]);

  // Function to extract 0-14 children from church database to Children Registries
  const handleExtractChildren = () => {
    // Build fallback phone lookup from adult/parent members in case legacy stored rows lack phone
    const memberPhoneByNormName = new Map<string, string>();
    effectiveMembers.forEach((m) => {
      const p = String(m.phone || '').trim();
      const norm = normalizeAmharicSearchText(m.name);
      if (p && norm && !memberPhoneByNormName.has(norm)) {
        memberPhoneByNormName.set(norm, p);
      }
    });

    const childrenToExtract: Omit<ChurchChild, 'id'>[] = [];

    effectiveMembers.forEach((m) => {
      const parsed = parseChildAge(m.age, parseInt(currentYear, 10) || 2018, 'auto');
      let ageNum = parsed.age;

      if (ageNum === -1 && m.age !== undefined && m.age !== '') {
        const match = String(m.age).match(/\d+/);
        if (match) ageNum = parseInt(match[0], 10);
      }

      if (ageNum >= 0 && ageNum <= 14) {
        const officialChapel = mapToOfficialChapel(m.chapel || '');
        const resolvedPhone =
          String(m.phone || '').trim() ||
          (m.parentName ? memberPhoneByNormName.get(normalizeAmharicSearchText(m.parentName)) || '' : '');

        childrenToExtract.push({
          memberCode: m.memberCode || undefined,
          familyCode: m.familyCode || undefined,
          name: m.name,
          gender: m.gender === 'ሴ' || m.gender === 'ሴት' ? 'ሴ' : 'ወ',
          age: ageNum,
          educationLevel:
            canonicalizeEducationLevel(m.educationLevel) ||
            (ageNum <= 3 ? 'ጨቅላ/ያልጀመረ' : ageNum <= 6 ? 'መዋዕለ ሕፃናት (KG)' : `${ageNum - 6}ኛ ክፍል`),
          occupation: canonicalizeOccupation(m.occupation) || (ageNum <= 3 ? 'የቤት ውስጥ' : 'ተማሪ'),
          chapel: officialChapel,
          parentName: m.parentName || undefined,
          phone: resolvedPhone || undefined,
          residence: m.residence || undefined,
          fellowshipOrVillage: m.residence || undefined,
          registeredDate: m.registeredDate || new Date().toISOString().split('T')[0]
        });
      }
    });

    if (childrenToExtract.length === 0) {
      alert('በቤተክርስቲያኒቱ አጠቃላይ መረጃ ቋት ውስጥ ከ0-14 ዕድሜ ውስጥ የሚገኙ ልጆች አልተገኙም!');
      return;
    }

    onExtractChildrenToChildrenTab(childrenToExtract, 'append');
    setExtractedSuccessMsg(
      officialLoggedInChapel
        ? `✓ ${childrenToExtract.length} ልጆች (ከ0-14 ዕድሜ) ወደ ${officialLoggedInChapel} የልጆች ቋት በስኬት ገብተዋል!`
        : `✓ ${childrenToExtract.length} ልጆች (ከ0-14 ዕድሜ) ከቤተክርስቲያኒቱ መረጃ ቋት ተለይተው ወደ የልጆች ቋትና ወደ 10ሩም ቻፕሎች የልጆች ቋት በስኬት ገብተዋል!`
    );
    setTimeout(() => setExtractedSuccessMsg(''), 6000);
  };

  // High-Capacity Multi-Sheet Excel Upload Handler (Handles 5,300+ Rows Completely Across All Sheets with Family Phone Propagation)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('ፋይሉ ምንም ሺት (Sheet) አልያዘም!');
          return;
        }

        const parsed = parseChurchWorkbookAllSheets(workbook, parseChildAge, {
          refYear: excelBaselineYear || 2017,
          ageMode: 'auto',
          defaultChapelFallback: officialLoggedInChapel || undefined
        });

        const importedMembers = officialLoggedInChapel
          ? parsed.members.filter((m) => mapToOfficialChapel(m.chapel || '') === officialLoggedInChapel)
          : parsed.members;
        const autoChildrenToExtract = officialLoggedInChapel
          ? parsed.children.filter((c) => mapToOfficialChapel(c.chapel || '') === officialLoggedInChapel)
          : parsed.children;
        const sheetCounts = parsed.sheetCounts;

        if (importedMembers.length === 0) {
          alert(
            officialLoggedInChapel
              ? `በፋይሉ ውስጥ ለ${officialLoggedInChapel} የሚሆን ምንም የአባላት መረጃ አልተገኘም!`
              : 'በፋይሉ ውስጥ ምንም የመንፈሳዊ ቤተሰብ አባላት መረጃ አልተገኘም!'
          );
          return;
        }

        // Save imported members to General Church Database (App.tsx scopes replace to loggedInChapel when active)
        onBatchAddMembers(importedMembers, 'replace', excelBaselineYear);

        // Automatically extract 0-14 children into Children Registries (deduplicating/updating existing)
        if (autoChildrenToExtract.length > 0) {
          onExtractChildrenToChildrenTab(autoChildrenToExtract, 'append');
        }

        const summaryBreakdown = Object.entries(sheetCounts)
          .map(([sh, cnt]) => `${sh}: ${cnt}`)
          .join(' | ');
        const phoneFilledCount = importedMembers.filter((m) => Boolean(m.phone)).length;

        setExtractedSuccessMsg(
          officialLoggedInChapel
            ? `✓ ለ${officialLoggedInChapel} የተሰበሰቡ ${importedMembers.length} አባላት (ስልክ ያላቸው፦ ${phoneFilledCount}) ወደ ቻፕሉ መረጃ ቋት ገብተዋል! በተጨማሪም ${autoChildrenToExtract.length} ልጆች (0-14 ዕድሜ) ወደ የልጆች ቋት ተልከዋል።`
            : `✓ ከ${workbook.SheetNames.length} ሺቶች (ከ10ሩም ቻፕሎች) የተሰበሰቡ ${importedMembers.length} አባላት (ስልክ ያላቸው፦ ${phoneFilledCount}) ሙሉ በሙሉ ወደ ቤተክርስቲያኒቱ አጠቃላይ መረጃ ቋት ገብተዋል! [${summaryBreakdown}] በተጨማሪም ${autoChildrenToExtract.length} ልጆች (0-14 ዕድሜ) በቀጥታ ወደ የልጆች ቋት ተልከዋል።`
        );
        setTimeout(() => setExtractedSuccessMsg(''), 10000);
      } catch (err) {
        alert('የኤክሴል ፋይሉን በማንበብ ላይ ስህተት አጋጥሟል! እባክዎን ፋይሉ ትክክለኛ ኤክሴል (.xlsx) መሆኑን ያረጋግጡ።');
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Export Church Database to Excel (including Baptism, Lord's Supper, Tithe, Education & Occupation breakdowns)
  const handleExportExcel = () => {
    const headers = [
      'ተ.ቁ',
      'መለያ ኮድ',
      'የቤተሰብ ኮድ',
      activeNameMode === 'en' ? 'የአባሉ/የልጁ ሙሉ ስም (English)' : 'የአባሉ/የልጁ ሙሉ ስም',
      ...(activeNameMode === 'both' ? ['Full Name (English)'] : []),
      'ጾታ',
      'ዕድሜ',
      'የዕድሜ ምድብ',
      'የትምህርት ደረጃ',
      'የስራ ዓይነት',
      'የአገልግሎት ድርሻ',
      'የወንጌል አገልግሎት ሁኔታ',
      'በመማር ላይ ያለ መንፈሳዊ ትምህርት',
      'የተጠመቀ/ች',
      'የጌታ እራት',
      'አስራት',
      'ቻፕል (አጥቢያ)',
      activeNameMode === 'en' ? 'የወላጅ/የቤተሰብ መሪ ስም (English)' : 'የወላጅ/የቤተሰብ መሪ ስም',
      ...(activeNameMode === 'both' ? ['Parent / Head Name (English)'] : []),
      'የወላጅ/አባል ስልክ ቁጥር',
      'መኖሪያ ቀበሌ/መንደር',
      'የኤክሴል ሺት'
    ];

    const boolToAmharic = (val: boolean | undefined) =>
      val === true ? 'አዎ' : val === false ? 'አይ' : '-';

    const rows = filteredMembers.map((m, idx) => {
      const parsedNum = parseInt(String(m.age ?? ''), 10);
      const numAge = isNaN(parsedNum) ? 0 : parsedNum;
      let ageGroup = '60+ አረጋውያን';
      if (numAge <= 14) ageGroup = 'ከ0-14 (ልጅ)';
      else if (numAge <= 29) ageGroup = 'ከ15-29 (ወጣት)';
      else if (numAge <= 59) ageGroup = 'ከ30-59 (ጎልማሳ/ወላጅ)';

      const ageDisplay = m.age !== undefined && m.age !== null && String(m.age).trim() !== '' ? m.age : '-';
      const enName = transliterateAmharicToEnglish(m.name);
      const enParent = m.parentName ? transliterateAmharicToEnglish(m.parentName) : '-';

      return [
        idx + 1,
        m.memberCode || '-',
        m.familyCode || '-',
        activeNameMode === 'en' ? enName : m.name,
        ...(activeNameMode === 'both' ? [enName] : []),
        m.gender || '-',
        ageDisplay,
        ageGroup,
        canonicalizeEducationLevel(m.educationLevel) || '-',
        canonicalizeOccupation(m.occupation) || '-',
        m.profile.serviceRoles.length > 0 ? m.profile.serviceRoles.join('፣ ') : '-',
        EVANGELISM_MASTER_STATUS_META[m.profile.evangelismStatus].am,
        m.profile.spiritualCourses.length > 0 ? m.profile.spiritualCourses.join('፣ ') : '-',
        boolToAmharic(m.isBaptized),
        boolToAmharic(m.takesLordsSupper),
        boolToAmharic(m.paysTithe),
        m.chapel || '-',
        activeNameMode === 'en' ? enParent : m.parentName || '-',
        ...(activeNameMode === 'both' ? [enParent] : []),
        m.phone || '-',
        m.residence || '-',
        m.sheetName || '-'
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'አጠቃላይ የቤተክርስቲያን መረጃ');

    // Chapel-level Evangelism Breakdown sheet
    const chapelEvangRows: (string | number)[][] = [
      ['በቻፕል ደረጃ የወንጌል አገልግሎት አባልነትና የክፍያ ሁኔታ'],
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
        'አባል ያልሆነ (ድምር)'
      ],
      ...chapelEvangelismBreakdown.chapelRows.map((cr) => [
        cr.chapel,
        cr.totalMembers,
        cr.payingMale,
        cr.payingFemale,
        cr.payingTotal,
        cr.unpaidMale,
        cr.unpaidFemale,
        cr.unpaidTotal,
        cr.discontinuedTotal,
        cr.notMemberTotal
      ]),
      [
        chapelEvangelismBreakdown.totals.chapel,
        chapelEvangelismBreakdown.totals.totalMembers,
        chapelEvangelismBreakdown.totals.payingMale,
        chapelEvangelismBreakdown.totals.payingFemale,
        chapelEvangelismBreakdown.totals.payingTotal,
        chapelEvangelismBreakdown.totals.unpaidMale,
        chapelEvangelismBreakdown.totals.unpaidFemale,
        chapelEvangelismBreakdown.totals.unpaidTotal,
        chapelEvangelismBreakdown.totals.discontinuedTotal,
        chapelEvangelismBreakdown.totals.notMemberTotal
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chapelEvangRows), 'በየቻፕሉ_ወንጌል_ሁኔታ');

    const detailed = computeChurchMemberDetailedBreakdown(filteredMembers);
    const totalLen = detailed.totalMembers.total;
    const pct = (part: number) => (totalLen > 0 ? `${Math.round((part / totalLen) * 100)}%` : '0%');

    const spiritualSummaryRows: (string | number)[][] = [
      ['የመንፈሳዊ ተሳትፎ ማጠቃለያ (ወንድ / ሴት / ድምር)'],
      [],
      ['ምድብ', 'አዎ (ወንድ)', 'አዎ (ሴት)', 'አዎ (ድምር)', 'ድርሻ (%)', 'አይ (ወንድ)', 'አይ (ሴት)', 'አይ (ድምር)', 'ያልተገለጸ'],
      [
        'የተጠመቁ አባላት',
        detailed.baptized.yes.male,
        detailed.baptized.yes.female,
        detailed.baptized.yes.total,
        pct(detailed.baptized.yes.total),
        detailed.baptized.no.male,
        detailed.baptized.no.female,
        detailed.baptized.no.total,
        detailed.baptized.unknown.total
      ],
      [
        'የጌታ እራት የሚካፈሉ',
        detailed.lordsSupper.yes.male,
        detailed.lordsSupper.yes.female,
        detailed.lordsSupper.yes.total,
        pct(detailed.lordsSupper.yes.total),
        detailed.lordsSupper.no.male,
        detailed.lordsSupper.no.female,
        detailed.lordsSupper.no.total,
        detailed.lordsSupper.unknown.total
      ],
      [
        'አስራት የሚከፍሉ',
        detailed.tithe.yes.male,
        detailed.tithe.yes.female,
        detailed.tithe.yes.total,
        pct(detailed.tithe.yes.total),
        detailed.tithe.no.male,
        detailed.tithe.no.female,
        detailed.tithe.no.total,
        detailed.tithe.unknown.total
      ]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(spiritualSummaryRows), 'ጥምቀት_እራት_አስራት');

    const eduRows: (string | number)[][] = [
      ['የትምህርት ደረጃ በዝርዝር (ወንድ / ሴት / ድምር)'],
      [],
      ['ተ.ቁ', 'የትምህርት ደረጃ', 'ወንድ', 'ሴት', 'ድምር', 'ድርሻ (%)'],
      ...detailed.educationLevels.map((r, i) => [i + 1, r.label, r.male, r.female, r.total, pct(r.total)]),
      ['', 'ጠቅላላ ድምር', detailed.totalMembers.male, detailed.totalMembers.female, detailed.totalMembers.total, totalLen > 0 ? '100%' : '0%']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eduRows), 'የትምህርት_ደረጃ_ዝርዝር');

    const occRows: (string | number)[][] = [
      ['የስራ ዓይነት በዝርዝር (ወንድ / ሴት / ድምር)'],
      [],
      ['ተ.ቁ', 'የስራ ዓይነት', 'ወንድ', 'ሴት', 'ድምር', 'ድርሻ (%)'],
      ...detailed.occupations.map((r, i) => [i + 1, r.label, r.male, r.female, r.total, pct(r.total)]),
      ['', 'ጠቅላላ ድምር', detailed.totalMembers.male, detailed.totalMembers.female, detailed.totalMembers.total, totalLen > 0 ? '100%' : '0%']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(occRows), 'የስራ_ዓይነት_ዝርዝር');

    XLSX.writeFile(wb, `የብርብር_ቤተክርስቲያን_አጠቃላይ_መረጃ_ቋት_${currentYear}.xlsx`);
  };

  const activeLookupChapelScope = useMemo(
    () => officialLoggedInChapel || lookupChapelHint || undefined,
    [officialLoggedInChapel, lookupChapelHint]
  );

  const matchedAllCodeMembers = useMemo(() => {
    if (!lookupCodeInput.trim()) return [];
    return findAllMatchingMembersByCode(effectiveMembers, lookupCodeInput, activeLookupChapelScope);
  }, [effectiveMembers, lookupCodeInput, activeLookupChapelScope]);

  const matchedCodeMember = useMemo(() => {
    if (matchedAllCodeMembers.length === 1) return matchedAllCodeMembers[0];
    return null;
  }, [matchedAllCodeMembers]);

  const matchedFamilyMembers = useMemo(() => {
    if (!matchedCodeMember) return [];
    const ch = mapToOfficialChapel(matchedCodeMember.chapel || '');
    const rootBase = getRootFamilyBaseCode(
      matchedCodeMember.familyCode || matchedCodeMember.memberCode || '',
      ch
    );
    const targetFamilyKey = normalizeCodeForLookup(rootBase);
    if (!targetFamilyKey) return [matchedCodeMember];
    return effectiveMembers.filter((m) => {
      if (mapToOfficialChapel(m.chapel || '') !== ch) return false;
      const mMemBase = normalizeCodeForLookup(getRootFamilyBaseCode(m.memberCode || '', ch));
      const mFamBase = normalizeCodeForLookup(getRootFamilyBaseCode(m.familyCode || '', ch));
      return mMemBase === targetFamilyKey || mFamBase === targetFamilyKey;
    });
  }, [matchedCodeMember, effectiveMembers]);

  const codeLookupSuggestions = useMemo(() => {
    const q = lookupCodeInput.trim();
    if (!q || matchedCodeMember || matchedAllCodeMembers.length > 0) return [];
    const normQ = normalizeCodeForLookup(q);
    return effectiveMembers
      .filter((m) => {
        if (activeLookupChapelScope && mapToOfficialChapel(m.chapel || '') !== activeLookupChapelScope) {
          return false;
        }
        return (
          (m.memberCode && normalizeCodeForLookup(m.memberCode).includes(normQ)) ||
          matchesAmharicSearch(q, m.name)
        );
      })
      .slice(0, 8);
  }, [effectiveMembers, lookupCodeInput, matchedCodeMember, matchedAllCodeMembers, activeLookupChapelScope]);

  const activeTargetChapelForForm = useMemo(() => {
    if (officialLoggedInChapel) return officialLoggedInChapel;
    if (!editingMember && addMode === 'by_code' && matchedCodeMember) {
      return mapToOfficialChapel(matchedCodeMember.chapel || '');
    }
    return mapToOfficialChapel(formChapel);
  }, [officialLoggedInChapel, editingMember, addMode, matchedCodeMember, formChapel]);

  // Used in Edit Modal when admin types/edits `formFamilyCode` to re-link an existing member into a family (e.g., 0514 -> 0513/1)
  const editMatchedFamilyHead = useMemo(() => {
    if (!editingMember || !formFamilyCode.trim()) return null;
    return findMemberByEnteredCode(effectiveMembers, formFamilyCode, activeTargetChapelForForm);
  }, [editingMember, formFamilyCode, effectiveMembers, activeTargetChapelForForm]);

  const editWillReassignSubCode = useMemo(() => {
    if (!editingMember) return false;
    const rawNext = formFamilyCode.trim();
    if (!rawNext) return false;
    const nextRoot = getRootFamilyBaseCode(rawNext, activeTargetChapelForForm);
    const prevRoot = editingMember.familyCode
      ? getRootFamilyBaseCode(editingMember.familyCode, activeTargetChapelForForm)
      : '';
    const selfRoot = editingMember.memberCode
      ? getRootFamilyBaseCode(editingMember.memberCode, activeTargetChapelForForm)
      : '';
    // Reassign if familyCode changed AND isn't equal to own base code
    return (
      normalizeCodeForLookup(nextRoot) !== normalizeCodeForLookup(prevRoot) &&
      normalizeCodeForLookup(nextRoot) !== normalizeCodeForLookup(selfRoot)
    );
  }, [editingMember, formFamilyCode, activeTargetChapelForForm]);

  const editHasExistingFamilyLinkOrSubCode = useMemo(() => {
    if (!editingMember) return false;
    const parts = parseChapelCodeParts(editingMember.memberCode, activeTargetChapelForForm);
    return Boolean(editingMember.familyCode || (parts && parts.subSeq !== null));
  }, [editingMember, activeTargetChapelForForm]);

  const editWillUnlinkToStandalone = useMemo(() => {
    if (!editingMember) return false;
    return editHasExistingFamilyLinkOrSubCode && !formFamilyCode.trim();
  }, [editingMember, editHasExistingFamilyLinkOrSubCode, formFamilyCode]);

  const nextAutoCodePreview = useMemo(() => {
    if (editingMember) {
      if (editWillUnlinkToStandalone) {
        return getNextMemberCodeForChapel(churchMembers, activeTargetChapelForForm);
      }
      if (editWillReassignSubCode) {
        const anchor = formFamilyCode.trim();
        return getNextFamilySubCode(churchMembers, anchor, activeTargetChapelForForm);
      }
      return editingMember.memberCode || getNextMemberCodeForChapel(churchMembers, activeTargetChapelForForm);
    }
    if (addMode === 'by_code' && matchedCodeMember) {
      return getNextFamilySubCode(
        churchMembers,
        matchedCodeMember.familyCode || matchedCodeMember.memberCode || '',
        activeTargetChapelForForm
      );
    }
    if (formFamilyCode.trim()) {
      return getNextFamilySubCode(churchMembers, formFamilyCode.trim(), activeTargetChapelForForm);
    }
    return getNextMemberCodeForChapel(churchMembers, activeTargetChapelForForm);
  }, [
    churchMembers,
    activeTargetChapelForForm,
    editingMember,
    addMode,
    matchedCodeMember,
    formFamilyCode,
    editWillReassignSubCode,
    editWillUnlinkToStandalone
  ]);

  const handleCopyMemberCode = (id: number, code: string) => {
    if (!code) return;
    void copyTextSafely(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 1800);
  };

  const applyMatchedFamilyToForm = (matched: ChurchMember) => {
    const officialCh = officialLoggedInChapel || mapToOfficialChapel(matched.chapel || '');
    const rootBase = getRootFamilyBaseCode(
      matched.familyCode || matched.memberCode || '',
      officialCh
    );
    setFormChapel(officialCh);
    setFormParent(matched.parentName || matched.name || '');
    setFormPhone(matched.phone || '');
    setFormResidence(matched.residence || '');
    setFormFamilyCode(rootBase);
  };

  const boolToTriState = (v: boolean | undefined): 'yes' | 'no' | 'unknown' =>
    v === true ? 'yes' : v === false ? 'no' : 'unknown';

  const triStateToBool = (v: 'yes' | 'no' | 'unknown'): boolean | undefined =>
    v === 'yes' ? true : v === 'no' ? false : undefined;

  const stripComputedMemberFields = (m: ChurchMember): ChurchMember => {
    const {
      numAge: _n,
      isChild: _c,
      isEnrolled: _e,
      enrolledClass: _ec,
      matchedStudent: _ms,
      matchLabel: _ml,
      studentAge: _sa,
      profile: _pf,
      ...cleanMember
    } = m as ChurchMember & Record<string, any>;
    return cleanMember as ChurchMember;
  };

  const handleToggleMemberSpiritualField = (
    m: ChurchMember,
    field: 'isBaptized' | 'takesLordsSupper' | 'paysTithe'
  ) => {
    const currentVal = m[field];
    const nextVal = currentVal === true ? false : true;
    const cleanMember = stripComputedMemberFields(m);
    onUpdateMember({
      ...cleanMember,
      [field]: nextVal
    });
  };

  const handleQuickChangeEvangelismStatus = (
    m: ChurchMember,
    nextStatus: EvangelismMemberStatus
  ) => {
    const cleanMember = stripComputedMemberFields(m);
    const updated: ChurchMember = {
      ...cleanMember,
      evangelismStatus: nextStatus
    };
    onUpdateMember(updated);
    if (onUpdateEvangelismMemberStatus) {
      onUpdateEvangelismMemberStatus(updated, nextStatus);
    }
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setAddMode('new');
    setLookupCodeInput('');
    setLookupChapelHint('');
    setFormName('');
    setFormGender('ወ');
    setFormAge('30');
    setFormEducationLevel('ዲግሪ');
    setFormOccupation('የመንግሥት ሠራተኛ');
    setFormIsBaptized('unknown');
    setFormTakesLordsSupper('unknown');
    setFormPaysTithe('unknown');
    setFormEvangelismStatus('not_member');
    setFormServiceRoles([]);
    setFormCustomRoleInput('');
    setFormSpiritualCourses([]);
    setFormCustomCourseInput('');
    setFormChapel(officialLoggedInChapel || DEFAULT_CHAPELS[0]);
    setFormParent('');
    setFormPhone('');
    setFormResidence('');
    setFormRelation('');
    setFormWomenCategory('auto');
    setFormFamilyCode('');
    setIsAddModalOpen(true);
  };

  const handleOpenAddByCodeModal = (initialCode?: string) => {
    setEditingMember(null);
    setAddMode('by_code');
    const codeStr = (initialCode || '').trim();
    setLookupCodeInput(codeStr);
    setLookupChapelHint('');
    setFormName('');
    setFormGender('ወ');
    setFormAge('20');
    setFormEducationLevel('');
    setFormOccupation('');
    setFormIsBaptized('unknown');
    setFormTakesLordsSupper('unknown');
    setFormPaysTithe('unknown');
    setFormEvangelismStatus('not_member');
    setFormServiceRoles([]);
    setFormCustomRoleInput('');
    setFormSpiritualCourses([]);
    setFormCustomCourseInput('');
    setFormChapel(officialLoggedInChapel || DEFAULT_CHAPELS[0]);
    setFormParent('');
    setFormPhone('');
    setFormResidence('');
    setFormRelation('የቤተሰብ አባል');
    setFormWomenCategory('auto');
    setFormFamilyCode('');
    if (codeStr) {
      const matches = findAllMatchingMembersByCode(effectiveMembers, codeStr, officialLoggedInChapel);
      if (matches.length === 1) {
        if (!officialLoggedInChapel) {
          setLookupChapelHint(mapToOfficialChapel(matches[0].chapel || ''));
        }
        applyMatchedFamilyToForm(matches[0]);
      }
    }
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (m: ChurchMember) => {
    const cleanMember = stripComputedMemberFields(m);
    const existingProfile = memberMinistryProfileMap.get(cleanMember.id);
    setEditingMember(cleanMember);
    setAddMode('new');
    setLookupCodeInput('');
    setLookupChapelHint('');
    setFormName(cleanMember.name);
    setFormGender(cleanMember.gender || 'ወ');
    setFormAge(
      cleanMember.age !== undefined && cleanMember.age !== null && String(cleanMember.age).trim() !== ''
        ? String(cleanMember.age)
        : '30'
    );
    setFormEducationLevel(canonicalizeEducationLevel(cleanMember.educationLevel) || 'ዲግሪ');
    setFormOccupation(canonicalizeOccupation(cleanMember.occupation) || 'የመንግሥት ሠራተኛ');
    setFormIsBaptized(boolToTriState(cleanMember.isBaptized));
    setFormTakesLordsSupper(boolToTriState(cleanMember.takesLordsSupper));
    setFormPaysTithe(boolToTriState(cleanMember.paysTithe));
    setFormEvangelismStatus(
      cleanMember.evangelismStatus || existingProfile?.evangelismStatus || 'not_member'
    );
    setFormServiceRoles([...(cleanMember.serviceRoles || [])]);
    setFormCustomRoleInput('');
    setFormSpiritualCourses([...(cleanMember.spiritualCourses || [])]);
    setFormCustomCourseInput('');
    setFormChapel(officialLoggedInChapel || mapToOfficialChapel(cleanMember.chapel || ''));
    setFormParent(cleanMember.parentName || '');
    setFormPhone(cleanMember.phone || '');
    setFormResidence(cleanMember.residence || '');
    setFormRelation(cleanMember.relationToHead || '');
    setFormWomenCategory(cleanMember.womenCategory || 'auto');
    setFormFamilyCode(cleanMember.familyCode || '');
    setIsAddModalOpen(true);
  };

  const handleToggleFormRole = (roleLabel: string) => {
    const clean = roleLabel.trim();
    if (!clean) return;
    setFormServiceRoles((prev) =>
      prev.includes(clean) ? prev.filter((r) => r !== clean) : [...prev, clean]
    );
  };

  const handleAddCustomRole = () => {
    const clean = formCustomRoleInput.trim();
    if (!clean) return;
    if (!formServiceRoles.includes(clean)) {
      setFormServiceRoles((prev) => [...prev, clean]);
    }
    setFormCustomRoleInput('');
  };

  const handleToggleFormCourse = (courseLabel: string) => {
    const clean = courseLabel.trim();
    if (!clean) return;
    setFormSpiritualCourses((prev) =>
      prev.includes(clean) ? prev.filter((c) => c !== clean) : [...prev, clean]
    );
  };

  const handleAddCustomCourse = () => {
    const clean = formCustomCourseInput.trim();
    if (!clean) return;
    if (!formSpiritualCourses.includes(clean)) {
      setFormSpiritualCourses((prev) => [...prev, clean]);
    }
    setFormCustomCourseInput('');
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('እባክዎን የአባሉን ሙሉ ስም ያስገቡ!');
      return;
    }

    if (!editingMember && addMode === 'by_code' && !matchedCodeMember) {
      alert('እባክዎን ትክክለኛ የነባር አባል/ቤተሰብ ኮድ (ለምሳሌ፦ ብከቃሕቤክኤልሻዳይ 0513 ወይም 0513) ያስገቡና ቤተሰቡ መገኘቱን ያረጋግጡ!');
      return;
    }

    const officialChapel =
      officialLoggedInChapel ||
      (!editingMember && addMode === 'by_code' && matchedCodeMember
        ? mapToOfficialChapel(matchedCodeMember.chapel || '')
        : mapToOfficialChapel(formChapel));

    const resolvedFamilyCode =
      !editingMember && addMode === 'by_code' && matchedCodeMember
        ? getRootFamilyBaseCode(
            matchedCodeMember.familyCode || matchedCodeMember.memberCode || '',
            officialChapel
          )
        : formFamilyCode.trim()
        ? getRootFamilyBaseCode(formFamilyCode.trim(), officialChapel)
        : undefined;

    const resolvedParent =
      formParent.trim() ||
      (!editingMember && addMode === 'by_code' && matchedCodeMember
        ? matchedCodeMember.parentName || matchedCodeMember.name
        : '') ||
      undefined;

    const resolvedPhone =
      formPhone.trim() ||
      (!editingMember && addMode === 'by_code' && matchedCodeMember ? matchedCodeMember.phone || '' : '') ||
      undefined;

    const resolvedResidence =
      formResidence.trim() ||
      (!editingMember && addMode === 'by_code' && matchedCodeMember ? matchedCodeMember.residence || '' : '') ||
      undefined;

    const parsedFormAge = parseInt(formAge, 10);
    const shouldReassignCodeOnEdit = Boolean(
      editingMember && (editWillReassignSubCode || editWillUnlinkToStandalone)
    );

    const resolvedWomenCategory =
      formGender === 'ሴ' && formWomenCategory !== 'auto'
        ? formWomenCategory
        : editingMember?.womenCategory;
    const resolvedMaritalStatus =
      resolvedWomenCategory === 'married'
        ? 'ባለትዳር'
        : resolvedWomenCategory === 'female_head'
        ? 'ራሷ የቤቱ አባወራ'
        : editingMember?.maritalStatus;

    const cleanRoles = formServiceRoles.map((r) => r.trim()).filter(Boolean);
    const cleanCourses = formSpiritualCourses.map((c) => c.trim()).filter(Boolean);

    const payload: Omit<ChurchMember, 'id'> = {
      name: formName.trim(),
      gender: formGender,
      age: isNaN(parsedFormAge) ? 30 : Math.max(0, parsedFormAge),
      educationLevel: canonicalizeEducationLevel(formEducationLevel),
      occupation: canonicalizeOccupation(formOccupation),
      isBaptized: triStateToBool(formIsBaptized),
      takesLordsSupper: triStateToBool(formTakesLordsSupper),
      paysTithe: triStateToBool(formPaysTithe),
      evangelismStatus: formEvangelismStatus,
      serviceRoles: cleanRoles.length > 0 ? cleanRoles : undefined,
      spiritualCourses: cleanCourses.length > 0 ? cleanCourses : undefined,
      chapel: officialChapel,
      parentName: resolvedParent,
      phone: resolvedPhone,
      residence: resolvedResidence,
      relationToHead: formRelation.trim() || undefined,
      womenCategory: resolvedWomenCategory,
      maritalStatus: resolvedMaritalStatus,
      isYouth: editingMember?.isYouth,
      youthMinistryRole: editingMember?.youthMinistryRole,
      familyCode: resolvedFamilyCode,
      memberCode: shouldReassignCodeOnEdit ? undefined : editingMember?.memberCode,
      registeredDate: editingMember?.registeredDate || new Date().toISOString().split('T')[0]
    };

    if (editingMember) {
      const updatedMember: ChurchMember = {
        ...payload,
        id: editingMember.id
      };
      onUpdateMember(updatedMember);
      if (onUpdateEvangelismMemberStatus) {
        onUpdateEvangelismMemberStatus(updatedMember, formEvangelismStatus);
      }
      if (editWillUnlinkToStandalone) {
        setExtractedSuccessMsg(
          `✓ "${payload.name}" ራሱን የቻለ (1 ሰው ቤተሰብ) ሆኖ ቀጥታ የራሱ ኮድ (${nextAutoCodePreview}) ተሰጥቶታል!`
        );
        setTimeout(() => setExtractedSuccessMsg(''), 8000);
      } else if (shouldReassignCodeOnEdit) {
        setExtractedSuccessMsg(
          `✓ "${payload.name}" ወደ ቤተሰብ ኮድ ${resolvedFamilyCode} ተያይዞ አዲስ ንዑስ ኮድ (${nextAutoCodePreview}) ተሰጥቶታል!`
        );
        setTimeout(() => setExtractedSuccessMsg(''), 8000);
      }
    } else {
      const created = onAddMember(payload);
      if (onUpdateEvangelismMemberStatus && formEvangelismStatus !== 'not_member') {
        onUpdateEvangelismMemberStatus(
          { ...(payload as ChurchMember), id: created && 'id' in created ? created.id : Date.now() },
          formEvangelismStatus
        );
      }
      const assignedCode =
        (created && 'memberCode' in created && created.memberCode) ||
        (resolvedFamilyCode
          ? getNextFamilySubCode(churchMembers, resolvedFamilyCode, officialChapel)
          : getNextMemberCodeForChapel(churchMembers, officialChapel));
      setExtractedSuccessMsg(
        `✓ "${payload.name}" በስኬት ተመዝግቧል! የተሰጠው ኮድ፦ ${assignedCode}${
          resolvedFamilyCode ? ` (የቤተሰብ ኮድ፦ ${resolvedFamilyCode})` : ''
        }`
      );
      setTimeout(() => setExtractedSuccessMsg(''), 8000);
    }

    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-blue-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                <span>{officialLoggedInChapel ? `${officialLoggedInChapel} ቋት` : 'አጠቃላይ የመረጃ ቋት'}</span>
              </span>
              <span className="bg-blue-800/80 text-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {effectiveMembers.length.toLocaleString('am-ET')} አባላት
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {officialLoggedInChapel
                ? `${officialLoggedInChapel} - የቻፕል አባላትና ቤተሰብ መረጃ ቋት`
                : 'የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን - አጠቃላይ የመረጃ ቋት'}
            </h2>
            <p className="text-xs sm:text-sm text-blue-200/90 mt-1 max-w-2xl">
              {officialLoggedInChapel
                ? `የ${officialLoggedInChapel} ብቻ ሙሉ የቤተሰብና የአባላት መረጃ መዝገብ። ሌሎች ቻፕሎች አይታዩም፤ የራስዎን ቻፕል መረጃ ብቻ ማስገባት፣ ማስተካከልና ማስተዳደር ይችላሉ።`
                : 'የ10ሩም ቻፕሎች ሙሉ የቤተሰብ መረጃ መዝገብ። እስከ 6,000+ በላይ የሚሆኑ አባላትን መረጃ ከ10ሩም ቻፕል ኤክሴል ሺቶች በአንድ ጊዜ ያነባል (በእንግሊዝኛና በአማርኛ የተጻፉ የቻፕል ስሞች በሙሉ ወደ 10ሩ ኦፊሴላዊ ቻፕሎች ብቻ ይመደባሉ)።'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!officialLoggedInChapel && (
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-[11px]">
                <span className="text-slate-300 font-semibold">የኤክሴል መነሻ፦</span>
                <select
                  value={excelBaselineYear}
                  onChange={(e) => setExcelBaselineYear(Number(e.target.value))}
                  className="bg-transparent text-amber-300 font-black focus:outline-none cursor-pointer"
                  title="የኤክሴል መረጃው የተዘጋጀበት ዓ/ም"
                >
                  <option value={2017} className="text-slate-900">2017 ዓ/ም</option>
                  <option value={2018} className="text-slate-900">2018 ዓ/ም</option>
                  <option value={2019} className="text-slate-900">2019 ዓ/ም</option>
                </select>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer border border-emerald-400/40"
              title={
                officialLoggedInChapel
                  ? `የ${officialLoggedInChapel}ን ኤክሴል ፋይል ጫን`
                  : 'የ10ሩንም ቻፕል ሺቶች የያዘ ኤክሴል ፋይል ጫን (5,300+ አባላት)'
              }
            >
              <Upload className="w-4 h-4 text-emerald-200" />
              <span>
                {officialLoggedInChapel
                  ? `📥 ኤክሴል ጫን (${officialLoggedInChapel})`
                  : '📥 ኤክሴል ጫን (የ10ሩንም ቻፕል ሺቶች)'}
              </span>
            </button>

            {currentUserRole === 'admin' && onBulkIncrementAges && !officialLoggedInChapel && (
              <button
                type="button"
                onClick={() => setIsAgeModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer border border-amber-200"
                title="የ2017 ዓ/ም የአባላት መረጃ ላይ በየዓመቱ ዕድሜን በአንዴ መጨመሪያ"
              >
                <Calendar className="w-4 h-4 text-slate-900" />
                <span>📅 ዓመታዊ ዕድሜ ጨምር ({ageReferenceYear} ዓ/ም)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExtractChildren}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer border border-amber-300"
              title="ከ0-14 ዕድሜ ልጆችን ለይተህ ወደ የልጆች ቋትና ወደ ቻፕሎች ቋት አስገባ"
            >
              <Sparkles className="w-4 h-4 text-slate-900" />
              <span>⚡ ከ0-14 ልጆችን ለይተህ ወደ ቋት አስገባ</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNameCompareModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer border border-indigo-400/40"
              title="ከሰንበት ትምህርት ቤት ጋር በስም (ዕድሜው ባይገናኝም) አስተያይና አመሳክር"
            >
              <GraduationCap className="w-4 h-4 text-indigo-200" />
              <span>⚖️ በስም አስተያይ (ማመሳሰያ)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddByCodeModal()}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm border border-cyan-300"
              title="በነባር አባል/ቤተሰብ ኮድ ገብቶ አዲስ የቤተሰብ አባል መጨመሪያ"
            >
              <KeyRound className="w-4 h-4" />
              <span>🔑 በኮድ የቤተሰብ አባል ጨምር</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>አዲስ አባል መዝግብ</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ኤክሴል አውርድ</span>
            </button>

            {onOpenTransliterator && (
              <button
                type="button"
                onClick={onOpenTransliterator}
                className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-cyan-500/60 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="ስሞችን ያለ ትርጉም በቀጥታ ወደ እንግሊዝኛ ፊደል መቀየሪያ"
              >
                <Languages className="w-4 h-4 text-amber-300" />
                <span>ስም ወደ EN ቀይር</span>
              </button>
            )}
          </div>
        </div>

        {extractedSuccessMsg && (
          <div className="mt-4 p-3.5 bg-emerald-900/90 border border-emerald-500 text-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span className="leading-relaxed">{extractedSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Demographics Matrix Table: 4 Cohorts (ከ0-14፣ ከ15-29፣ ከ30-59 እና 60+) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-900" />
              <span>የአባላት የዕድሜና የጾታ ስታቲስቲክስ (ከ0-14፣ ከ15-29፣ ከ30-59 እና 60+)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              በአራቱ የዕድሜ ምድቦች፣ በጾታ (ወንድ/ሴት) እና በመቶኛ ድርሻ የተተነተነ ማጠቃለያ
            </p>
          </div>
          {selectedAgeCohort !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedAgeCohort('all')}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-lg transition self-start cursor-pointer"
            >
              ✕ የዕድሜ ማጣሪያ አጽዳ
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-3 text-left">የዕድሜ ምድብ</th>
                <th className="py-2.5 px-3 bg-blue-50/60 text-blue-900">ወንድ (Male)</th>
                <th className="py-2.5 px-3 bg-rose-50/60 text-rose-900">ሴት (Female)</th>
                <th className="py-2.5 px-3 font-extrabold text-slate-900">ጠቅላላ ድምር</th>
                <th className="py-2.5 px-3">የመቶኛ ድርሻ (%)</th>
                <th className="py-2.5 px-3 text-right">ማጣሪያ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-center">
              {masterDemographicStats.cohorts.map((coh) => {
                const isSelected = selectedAgeCohort === coh.key;
                const percentage =
                  masterDemographicStats.totalMembers > 0
                    ? Math.round((coh.total / masterDemographicStats.totalMembers) * 100)
                    : 0;

                return (
                  <tr
                    key={coh.key}
                    onClick={() => setSelectedAgeCohort(isSelected ? 'all' : coh.key)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-left font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            coh.key === '0-14'
                              ? 'bg-amber-500'
                              : coh.key === '15-29'
                              ? 'bg-blue-500'
                              : coh.key === '30-59'
                              ? 'bg-emerald-500'
                              : 'bg-purple-500'
                          }`}
                        />
                        <span>{coh.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-blue-900 bg-blue-50/30">
                      {coh.male.toLocaleString('am-ET')}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-bold text-rose-900 bg-rose-50/30">
                      {coh.female.toLocaleString('am-ET')}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-extrabold text-slate-900">
                      {coh.total.toLocaleString('am-ET')}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-semibold text-slate-600">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-900 h-1.5 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span>{percentage}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] text-blue-700 font-semibold hover:underline">
                        {isSelected ? '✓ ተመርጧል' : 'አሳይ →'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-center text-slate-900">
                <td className="py-2.5 px-3 text-left">ጠቅላላ የምዕመናን ድምር</td>
                <td className="py-2.5 px-3 text-blue-950 tabular-nums">{masterDemographicStats.totalMale.toLocaleString('am-ET')}</td>
                <td className="py-2.5 px-3 text-rose-950 tabular-nums">{masterDemographicStats.totalFemale.toLocaleString('am-ET')}</td>
                <td className="py-2.5 px-3 text-slate-950 tabular-nums">{masterDemographicStats.totalMembers.toLocaleString('am-ET')}</td>
                <td className="py-2.5 px-3 tabular-nums">100%</td>
                <td className="py-2.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Spiritual Participation (Baptized / Lord's Supper / Tithe) + Detailed Education Level & Occupation Breakdown */}
      <ChurchMemberBreakdownSection
        members={chapelScopedMembers}
        scopeLabel={
          officialLoggedInChapel
            ? officialLoggedInChapel
            : selectedChapels.length === 1
            ? selectedChapels[0]
            : selectedChapels.length > 1
            ? `${selectedChapels.length} የተመረጡ ቻፕሎች`
            : selectedChapelFilter !== 'all'
            ? selectedChapelFilter
            : 'ሁሉም 10ሩ ቻፕሎች'
        }
        selectedSpiritualFilter={selectedSpiritualFilter}
        onSelectSpiritualFilter={setSelectedSpiritualFilter}
        selectedEducationKey={selectedEducationKey}
        onSelectEducationKey={setSelectedEducationKey}
        selectedOccupationKey={selectedOccupationKey}
        onSelectOccupationKey={setSelectedOccupationKey}
      />

      {/* Official 10 Chapels Breakdown Cards Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Church className="w-4 h-4 text-blue-900" />
              <span>
                {officialLoggedInChapel
                  ? `የ${officialLoggedInChapel} አጠቃላይ የምዕመናን መረጃ ማጠቃለያ`
                  : 'የተመደቡት 10ሩ ቻፕሎች አጠቃላይ የምዕመናን መረጃ ማጠቃለያ'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              በየቻፕሉ ያሉ አባላት፣ ከ0-14 ያሉ ልጆች እና የወላጆች ስልክ መገናኛ
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!officialLoggedInChapel && (
              <button
                type="button"
                onClick={() => {
                  setSelectedChapels(chapelStats.chapels);
                  setSelectedChapelFilter('all');
                }}
                className="text-xs font-bold text-blue-900 bg-blue-100/80 hover:bg-blue-200 px-3 py-1.5 rounded-xl transition cursor-pointer border border-blue-300/80 flex items-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-800" />
                <span>✓ ሁሉንም 10 ቻፕሎች ምረጥ</span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDisplayLayoutMode('table')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  displayLayoutMode === 'table' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>📋 በአንድ ሰንጠረዥ</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayLayoutMode('grouped_chapels')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  displayLayoutMode === 'grouped_chapels' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Church className="w-3.5 h-3.5 text-amber-300" />
                <span>🏛️ በየቻፕሉ የተከፋፈለ</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-3 ${officialLoggedInChapel ? 'lg:grid-cols-1 max-w-sm' : 'lg:grid-cols-5'} gap-3`}>
          {chapelStats.chapels.map((ch) => {
            const st = chapelStats.statsMap[ch];
            const isSelected = selectedChapels.includes(ch) || selectedChapelFilter === ch;

            return (
              <div
                key={`master_ch_stat_${ch}`}
                onClick={() => {
                  if (officialLoggedInChapel) return;
                  if (selectedChapels.includes(ch)) {
                    setSelectedChapels(selectedChapels.filter((c) => c !== ch));
                  } else {
                    setSelectedChapels([...selectedChapels, ch]);
                  }
                }}
                className={`p-3.5 rounded-2xl border ${officialLoggedInChapel ? 'cursor-default' : 'cursor-pointer'} transition-all text-left relative ${
                  isSelected
                    ? 'border-blue-800 bg-blue-50/90 ring-2 ring-blue-700/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 truncate pr-1" title={ch}>
                    {ch}
                  </h4>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 text-blue-900 rounded focus:ring-blue-600 pointer-events-none shrink-0"
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-black text-slate-900 tabular-nums">{st.total} አባላት</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold pt-1.5 border-t border-slate-200/60">
                  <span className="text-amber-800">👶 {st.childrenCount} ልጆች</span>
                  <span className="text-blue-900">👥 {st.adultCount} አዋቂ</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chapel-level Evangelism Membership & Payment Breakdown (Paying / Unpaid / Discontinued / Not a Member) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-rose-700 shrink-0" />
              <span>
                {officialLoggedInChapel
                  ? `የ${officialLoggedInChapel} — የወንጌል አገልግሎት አባልነትና የክፍያ ሁኔታ`
                  : 'በ10ሩም ቻፕሎች ደረጃ የወንጌል አገልግሎት አባልነትና የክፍያ ሁኔታ ማጠቃለያ'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              አባል ሆነው የሚከፍል / የማይከፍል / ያቋረጠ / አባል ያልሆነ — በቻፕል ደረጃ ለመለየትና ለማጣራት የቁጥር ቁልፎቹን ይጫኑ
            </p>
          </div>
          {selectedEvangelismFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedEvangelismFilter('all')}
              className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-lg self-start cursor-pointer"
            >
              ✕ የወንጌል አገልግሎት ማጣሪያ አጽዳ
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2 px-3 text-left">ቻፕል (አጥቢያ)</th>
                <th className="py-2 px-3 text-right">ጠቅላላ</th>
                <th className="py-2 px-3 text-center text-emerald-900 bg-emerald-50/70">አባል — የሚከፍል</th>
                <th className="py-2 px-3 text-center text-blue-900 bg-blue-50/70">አባል — የማይከፍል</th>
                <th className="py-2 px-3 text-center text-rose-900 bg-rose-50/70">ያቋረጠ</th>
                <th className="py-2 px-3 text-center text-slate-700 bg-slate-50">አባል ያልሆነ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chapelEvangelismBreakdown.chapelRows.map((cr) => {
                const pickStatusForChapel = (status: EvangelismMemberStatus) => {
                  if (!officialLoggedInChapel) {
                    setSelectedChapels([cr.chapel]);
                    setSelectedChapelFilter('all');
                  }
                  setSelectedEvangelismFilter(
                    selectedEvangelismFilter === status &&
                      (officialLoggedInChapel || selectedChapels.includes(cr.chapel))
                      ? 'all'
                      : status
                  );
                };

                return (
                  <tr key={`ev_ch_${cr.chapel}`} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-extrabold text-slate-900">{cr.chapel}</td>
                    <td className="py-2 px-3 text-right font-bold tabular-nums text-slate-800">
                      {cr.totalMembers.toLocaleString('am-ET')}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => pickStatusForChapel('paying')}
                        className="px-2 py-0.5 rounded-lg font-extrabold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 tabular-nums cursor-pointer"
                      >
                        {cr.payingTotal} ({cr.totalMembers > 0 ? Math.round((cr.payingTotal / cr.totalMembers) * 100) : 0}%)
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => pickStatusForChapel('unpaid')}
                        className="px-2 py-0.5 rounded-lg font-extrabold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 tabular-nums cursor-pointer"
                      >
                        {cr.unpaidTotal} ({cr.totalMembers > 0 ? Math.round((cr.unpaidTotal / cr.totalMembers) * 100) : 0}%)
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => pickStatusForChapel('discontinued')}
                        className="px-2 py-0.5 rounded-lg font-extrabold text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 tabular-nums cursor-pointer"
                      >
                        {cr.discontinuedTotal} ({cr.totalMembers > 0 ? Math.round((cr.discontinuedTotal / cr.totalMembers) * 100) : 0}%)
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => pickStatusForChapel('not_member')}
                        className="px-2 py-0.5 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 tabular-nums cursor-pointer"
                      >
                        {cr.notMemberTotal} ({cr.totalMembers > 0 ? Math.round((cr.notMemberTotal / cr.totalMembers) * 100) : 0}%)
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <td className="py-2 px-3">{chapelEvangelismBreakdown.totals.chapel}</td>
                <td className="py-2 px-3 text-right tabular-nums">{chapelEvangelismBreakdown.totals.totalMembers.toLocaleString('am-ET')}</td>
                <td className="py-2 px-3 text-center text-emerald-900 tabular-nums">{chapelEvangelismBreakdown.totals.payingTotal.toLocaleString('am-ET')}</td>
                <td className="py-2 px-3 text-center text-blue-900 tabular-nums">{chapelEvangelismBreakdown.totals.unpaidTotal.toLocaleString('am-ET')}</td>
                <td className="py-2 px-3 text-center text-rose-900 tabular-nums">{chapelEvangelismBreakdown.totals.discontinuedTotal.toLocaleString('am-ET')}</td>
                <td className="py-2 px-3 text-center text-slate-800 tabular-nums">{chapelEvangelismBreakdown.totals.notMemberTotal.toLocaleString('am-ET')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="በኮድ (ብከቃሕቤክ...)፣ በስም፣ ድርሻ፣ ትምህርት ፈልግ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-base sm:text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="ፍለጋውን አጽዳ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Church className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedChapelFilter}
              disabled={Boolean(officialLoggedInChapel)}
              onChange={(e) => {
                if (officialLoggedInChapel) return;
                setSelectedChapelFilter(e.target.value);
                setSelectedChapels([]);
              }}
              className={`w-full py-2 px-2.5 text-base sm:text-xs border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                officialLoggedInChapel ? 'bg-slate-100 cursor-not-allowed' : 'bg-white cursor-pointer'
              }`}
            >
              {!officialLoggedInChapel && <option value="all">ሁሉም 10ሩ ቻፕሎች (አጥቢያዎች)</option>}
              {chapelStats.chapels.map((ch) => (
                <option key={`ch_opt_${ch}`} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sundaySchoolFilter}
              onChange={(e) => setSundaySchoolFilter(e.target.value as 'all' | 'enrolled' | 'not_enrolled_children')}
              className="w-full py-2 px-2.5 text-base sm:text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">የሰንበት ት/ቤት ሁኔታ (ሁሉም)</option>
              <option value="enrolled">✓ ሰንበት ት/ቤት የገቡ ልጆች</option>
              <option value="not_enrolled_children">! ሰንበት ት/ቤት ያልገቡ (0-14)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSpiritualFilter}
              onChange={(e) => setSelectedSpiritualFilter(e.target.value as SpiritualFilterValue)}
              className="w-full py-2 px-2.5 text-base sm:text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">ጥምቀት / ጌታ እራት / አስራት (ሁሉም)</option>
              <option value="baptized_yes">✓ የተጠመቁ</option>
              <option value="baptized_no">✗ ያልተጠመቁ</option>
              <option value="supper_yes">✓ የጌታ እራት የሚካፈሉ</option>
              <option value="supper_no">✗ የጌታ እራት የማይካፈሉ</option>
              <option value="tithe_yes">✓ አስራት የሚከፍሉ</option>
              <option value="tithe_no">✗ አስራት የማይከፍሉ</option>
              <option value="baptized_unknown">? ጥምቀት ያልተመዘገበ</option>
              <option value="supper_unknown">? የጌታ እራት ያልተመዘገበ</option>
              <option value="tithe_unknown">? አስራት ያልተመዘገበ</option>
            </select>
          </div>
        </div>

        {/* Second Filter Row: Service Roles, Evangelism Status & Enrolled Spiritual Education */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={selectedServiceRoleFilter}
              onChange={(e) => setSelectedServiceRoleFilter(e.target.value)}
              className="w-full py-2 px-2.5 text-base sm:text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">የአገልግሎት ድርሻ (ሁሉም)</option>
              <option value="has_any">✓ የአገልግሎት ድርሻ ያላቸው</option>
              <option value="leader">👑 መሪዎች / ሽማግሌዎች / አስተባባሪዎች</option>
              <option value="choir">🎵 መዘምራን ህብረት</option>
              <option value="worship_leader">🎤 የመዝሙር መሪዎች ህብረት</option>
              <option value="deacon">🤝 ዲያቆናት</option>
              <option value="teacher">📚 የሰንበት/መጽሐፍ ቅዱስ መምህራን</option>
              <option value="missionary">🌍 ሚሽነሪዎች</option>
              <option value="none">— የአገልግሎት ድርሻ ያልተገለጸላቸው</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
            <select
              value={selectedEvangelismFilter}
              onChange={(e) => setSelectedEvangelismFilter(e.target.value as 'all' | EvangelismMemberStatus)}
              className="w-full py-2 px-2.5 text-base sm:text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">የወንጌል አገልግሎት ሁኔታ (ሁሉም)</option>
              <option value="paying">✓ {EVANGELISM_MASTER_STATUS_META.paying.am}</option>
              <option value="unpaid">• {EVANGELISM_MASTER_STATUS_META.unpaid.am}</option>
              <option value="discontinued">✗ {EVANGELISM_MASTER_STATUS_META.discontinued.am}</option>
              <option value="not_member">— {EVANGELISM_MASTER_STATUS_META.not_member.am}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="w-full py-2 px-2.5 text-base sm:text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">በመማር ላይ ያለ መንፈሳዊ ትምህርት (ሁሉም)</option>
              <option value="has_any">✓ መንፈሳዊ ትምህርት እየተማሩ ያሉ</option>
              {availableSpiritualCourseOptions.map((c) => (
                <option key={`crs_opt_${c}`} value={c}>
                  📖 {c}
                </option>
              ))}
              <option value="none">— በመንፈሳዊ ትምህርት ያልተመዘገቡ</option>
            </select>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 flex-wrap">
          <span>
            የተገኙ አባላት፦{' '}
            <strong className="text-blue-900 font-extrabold tabular-nums">
              {filteredMembers.length.toLocaleString('am-ET')}
            </strong>
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-0.5" title="ስሞችን ያለ ትርጉም በቀጥታ ወደ እንግሊዝኛ መቀየሪያ">
              <Languages className="w-3.5 h-3.5 text-indigo-700 ml-1.5" />
              <button
                type="button"
                onClick={() => setActiveNameMode('am')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeNameMode === 'am' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                አማ
              </button>
              <button
                type="button"
                onClick={() => setActiveNameMode('both')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeNameMode === 'both' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                አማ+EN
              </button>
              <button
                type="button"
                onClick={() => setActiveNameMode('en')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeNameMode === 'en' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>
            {(searchTerm ||
              (!officialLoggedInChapel && (selectedChapelFilter !== 'all' || selectedChapels.length > 0)) ||
              selectedAgeCohort !== 'all' ||
              sundaySchoolFilter !== 'all' ||
              selectedSpiritualFilter !== 'all' ||
              selectedServiceRoleFilter !== 'all' ||
              selectedEvangelismFilter !== 'all' ||
              selectedCourseFilter !== 'all' ||
              selectedEducationKey !== 'all' ||
              selectedOccupationKey !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  if (!officialLoggedInChapel) {
                    setSelectedChapelFilter('all');
                    setSelectedChapels([]);
                  }
                  setSelectedAgeCohort('all');
                  setSundaySchoolFilter('all');
                  setSelectedSpiritualFilter('all');
                  setSelectedServiceRoleFilter('all');
                  setSelectedEvangelismFilter('all');
                  setSelectedCourseFilter('all');
                  setSelectedEducationKey('all');
                  setSelectedOccupationKey('all');
                }}
                className="text-rose-600 hover:text-rose-800 hover:underline font-bold cursor-pointer"
              >
                ሁሉንም ማጣሪያ አጽዳ
              </button>
            )}
          </div>
        </div>
        {(selectedSpiritualFilter !== 'all' ||
          selectedEducationKey !== 'all' ||
          selectedOccupationKey !== 'all' ||
          sundaySchoolFilter !== 'all' ||
          selectedServiceRoleFilter !== 'all' ||
          selectedEvangelismFilter !== 'all' ||
          selectedCourseFilter !== 'all') && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-700">
            <span className="text-slate-500">ንቁ ማጣሪያዎች፦</span>
            {sundaySchoolFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSundaySchoolFilter('all')}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
              >
                ሰንበት ት/ቤት ✕
              </button>
            )}
            {selectedServiceRoleFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedServiceRoleFilter('all')}
                className="px-2 py-0.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 cursor-pointer"
              >
                የአገልግሎት ድርሻ ✕
              </button>
            )}
            {selectedEvangelismFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedEvangelismFilter('all')}
                className="px-2 py-0.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 cursor-pointer"
              >
                ወንጌል፦ {EVANGELISM_MASTER_STATUS_META[selectedEvangelismFilter].shortAm} ✕
              </button>
            )}
            {selectedCourseFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCourseFilter('all')}
                className="px-2 py-0.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-900 cursor-pointer"
              >
                መንፈሳዊ ትምህርት ✕
              </button>
            )}
            {selectedSpiritualFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedSpiritualFilter('all')}
                className="px-2 py-0.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 cursor-pointer"
              >
                መንፈሳዊ ተሳትፎ ✕
              </button>
            )}
            {selectedEducationKey !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedEducationKey('all')}
                className="px-2 py-0.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 cursor-pointer"
              >
                የትምህርት ደረጃ ✕
              </button>
            )}
            {selectedOccupationKey !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedOccupationKey('all')}
                className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 cursor-pointer"
              >
                የስራ ዓይነት ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Data Table / Grouped Layout */}
      {displayLayoutMode === 'grouped_chapels' ? (
        <div className="space-y-6">
          {chapelStats.chapels.map((chName) => {
            const chMembers = membersGroupedByChapel[chName] || [];
            const st = chapelStats.statsMap[chName] || { total: 0, childrenCount: 0, adultCount: 0, male: 0, female: 0 };

            return (
              <div key={`master_grp_${chName}`} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Church className="w-5 h-5 text-amber-300" />
                    <div>
                      <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                        <span>{chName}</span>
                        <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full">
                          {st.total} አባላት
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        ከ0-14 ልጆች፦ <strong className="text-amber-300">{st.childrenCount}</strong> | አዋቂዎች፦ <strong>{st.adultCount}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 text-center w-10">ተ.ቁ</th>
                        <th className="py-2.5 px-3 min-w-[165px]">መለያ ኮድ</th>
                        <th className="py-2.5 px-4 font-extrabold text-[12pt] text-slate-900 min-w-[180px]">ሙሉ ስም</th>
                        <th className="py-2.5 px-3 text-center w-14">ጾታ</th>
                        <th className="py-2.5 px-3 text-center w-14">ዕድሜ</th>
                        <th className="py-2.5 px-3 min-w-[110px]">የትምህርት ደረጃ</th>
                        <th className="py-2.5 px-3 min-w-[110px]">የስራ ዓይነት</th>
                        <th className="py-2.5 px-3 min-w-[175px]">የአገልግሎት ድርሻ</th>
                        <th className="py-2.5 px-3 min-w-[165px]">የወንጌል አገልግሎት ሁኔታ</th>
                        <th className="py-2.5 px-3 min-w-[165px]">የሚማረው መንፈሳዊ ትምህርት</th>
                        <th className="py-2.5 px-3 min-w-[140px]">ጥምቀት / እራት / አስራት</th>
                        <th className="py-2.5 px-3 min-w-[130px]">የወላጅ/አሳዳጊ ስም</th>
                        <th className="py-2.5 px-3 min-w-[130px]">የወላጅ/አባል ስልክ</th>
                        <th className="py-2.5 px-3 text-center w-28">እርምጃዎች</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chMembers.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="py-6 text-center text-slate-400 font-medium">
                            በዚህ ቻፕል እስካሁን የተመዘገበ አባል የለም።
                          </td>
                        </tr>
                      ) : (
                        chMembers.map((m, idx) => {
                          const parsed = parseChildAge(m.age, parseInt(currentYear, 10) || 2018, 'auto');
                          const numAge = parsed.age !== -1 ? parsed.age : parseInt(String(m.age || '0'), 10) || 0;
                          const isChild = numAge >= 0 && numAge <= 14;
                          const evMeta = EVANGELISM_MASTER_STATUS_META[m.profile.evangelismStatus];

                          return (
                            <tr key={`grp_mem_${m.id}`} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-2 px-3 text-center font-bold text-slate-500 bg-slate-50">{idx + 1}</td>
                              <td className="py-2 px-3 font-mono text-[11px]">
                                {m.memberCode ? (
                                  <div className="flex flex-col gap-0.5 items-start">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyMemberCode(m.id, m.memberCode!)}
                                      className="inline-flex items-center gap-1 font-bold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                                      title="ኮዱን ለመቅዳት ይጫኑ"
                                    >
                                      <span>{m.memberCode}</span>
                                      {copiedCodeId === m.id ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-indigo-400" />
                                      )}
                                    </button>
                                    {m.familyCode && m.familyCode !== m.memberCode && (
                                      <span className="text-[10px] font-semibold text-cyan-800 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                                        ቤተሰብ፦ {m.familyCode}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-4 font-bold text-[12pt] text-slate-900">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{activeNameMode === 'en' ? transliterateAmharicToEnglish(m.name) : m.name}</span>
                                  {isChild && (
                                    <span className="bg-amber-100 text-amber-900 font-black text-[9px] px-1.5 py-0.2 rounded-full border border-amber-300">
                                      ልጅ (0-14)
                                    </span>
                                  )}
                                  {m.relationToHead && (
                                    <span className="bg-slate-100 text-slate-700 font-semibold text-[9px] px-1.5 py-0.2 rounded border border-slate-200">
                                      {m.relationToHead}
                                    </span>
                                  )}
                                </div>
                                {activeNameMode === 'both' && (
                                  <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                                    {transliterateAmharicToEnglish(m.name)}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-bold">{m.gender || '-'}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">
                                {m.age !== undefined && m.age !== null && m.age !== '' ? `${m.age} ዓመት` : '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-700">{canonicalizeEducationLevel(m.educationLevel) || '-'}</td>
                              <td className="py-2 px-3 text-slate-700">{canonicalizeOccupation(m.occupation) || '-'}</td>
                              <td className="py-2 px-3">
                                {m.profile.serviceRoles.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {m.profile.serviceRoles.map((sr, rIdx) => (
                                      <span
                                        key={`gr_sr_${m.id}_${rIdx}`}
                                        className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-[10px] font-bold"
                                      >
                                        {sr}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={m.profile.evangelismStatus}
                                  onChange={(e) =>
                                    handleQuickChangeEvangelismStatus(m, e.target.value as EvangelismMemberStatus)
                                  }
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer max-w-[155px] ${evMeta.badgeClass}`}
                                  aria-label={`የ${m.name} የወንጌል አገልግሎት ሁኔታ`}
                                >
                                  <option value="paying">{EVANGELISM_MASTER_STATUS_META.paying.am}</option>
                                  <option value="unpaid">{EVANGELISM_MASTER_STATUS_META.unpaid.am}</option>
                                  <option value="discontinued">{EVANGELISM_MASTER_STATUS_META.discontinued.am}</option>
                                  <option value="not_member">{EVANGELISM_MASTER_STATUS_META.not_member.am}</option>
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                {m.profile.spiritualCourses.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {m.profile.spiritualCourses.map((sc, cIdx) => (
                                      <span
                                        key={`gr_sc_${m.id}_${cIdx}`}
                                        className="inline-block px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold"
                                      >
                                        {sc}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberSpiritualField(m, 'isBaptized')}
                                    title="ጥምቀት (ለመቀየር ይጫኑ)"
                                    className={`px-1.5 py-0.5 rounded border cursor-pointer transition ${
                                      m.isBaptized === true
                                        ? 'bg-sky-50 text-sky-900 border-sky-300'
                                        : m.isBaptized === false
                                        ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                                        : 'bg-white text-slate-400 border-dashed border-slate-300 hover:border-sky-300'
                                    }`}
                                  >
                                    ጥምቀት{m.isBaptized === true ? '✓' : m.isBaptized === false ? '✗' : '?'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberSpiritualField(m, 'takesLordsSupper')}
                                    title="የጌታ እራት (ለመቀየር ይጫኑ)"
                                    className={`px-1.5 py-0.5 rounded border cursor-pointer transition ${
                                      m.takesLordsSupper === true
                                        ? 'bg-rose-50 text-rose-900 border-rose-300'
                                        : m.takesLordsSupper === false
                                        ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                                        : 'bg-white text-slate-400 border-dashed border-slate-300 hover:border-rose-300'
                                    }`}
                                  >
                                    እራት{m.takesLordsSupper === true ? '✓' : m.takesLordsSupper === false ? '✗' : '?'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberSpiritualField(m, 'paysTithe')}
                                    title="አስራት (ለመቀየር ይጫኑ)"
                                    className={`px-1.5 py-0.5 rounded border cursor-pointer transition ${
                                      m.paysTithe === true
                                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                                        : m.paysTithe === false
                                        ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                                        : 'bg-white text-slate-400 border-dashed border-slate-300 hover:border-amber-300'
                                    }`}
                                  >
                                    አስራት{m.paysTithe === true ? '✓' : m.paysTithe === false ? '✗' : '?'}
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {m.parentName ? (
                                  <div>
                                    <div>
                                      {activeNameMode === 'en'
                                        ? transliterateAmharicToEnglish(m.parentName)
                                        : m.parentName}
                                    </div>
                                    {activeNameMode === 'both' && (
                                      <div className="text-[10px] font-semibold text-indigo-700">
                                        {transliterateAmharicToEnglish(m.parentName)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px]">
                                {m.phone ? (
                                  <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:underline">
                                    <PhoneCall className="w-3 h-3 text-emerald-600" />
                                    <span>{m.phone}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {m.memberCode && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddByCodeModal(m.memberCode)}
                                      className="px-2 py-1 text-[10px] font-bold bg-cyan-50 text-cyan-900 hover:bg-cyan-100 rounded border border-cyan-200 cursor-pointer whitespace-nowrap"
                                      title="በዚህ ኮድ አዲስ የቤተሰብ አባል ጨምር"
                                    >
                                      + ቤተሰብ
                                    </button>
                                  )}
                                  <button type="button" onClick={() => handleOpenEditModal(m)} className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer" title="አስተካክል">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" onClick={() => { if (window.confirm(`"${m.name}" ይሰረዝ?`)) onDeleteMember(m.id); }} className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer" title="ሰርዝ">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3 text-center w-12 font-bold">ተ.ቁ</th>
                  <th className="py-3 px-3 font-bold min-w-[175px]">መለያ ኮድ</th>
                  <th className="py-3 px-4 font-extrabold text-[13pt] text-white min-w-[200px]">አባል/ልጅ ሙሉ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">ቻፕል (አጥቢያ)</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ጾታ</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ዕድሜ</th>
                  <th className="py-3 px-3 font-bold min-w-[120px]">የትምህርት ደረጃ</th>
                  <th className="py-3 px-3 font-bold min-w-[110px]">የስራ ዓይነት</th>
                  <th className="py-3 px-3 font-bold min-w-[180px]">የአገልግሎት ድርሻ</th>
                  <th className="py-3 px-3 font-bold min-w-[175px]">የወንጌል አገልግሎት ሁኔታ</th>
                  <th className="py-3 px-3 font-bold min-w-[175px]">የሚማረው መንፈሳዊ ትምህርት</th>
                  <th className="py-3 px-3 font-bold min-w-[155px]">ጥምቀት / እራት / አስራት</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">የሰንበት ት/ቤት ሁኔታ</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ/የቤተሰብ መሪ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ/አባል ስልክ ቁጥር</th>
                  <th className="py-3 px-3 text-center font-bold w-28">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-slate-500">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-sm">በአጠቃላይ መረጃ ቋቱ የተመዘገበ አባል የለም!</p>
                      <p className="text-xs text-slate-400 mt-1">የ10ሩንም ቻፕል ኤክሴል ፋይል በመጫን መረጃዎችን ያስገቡ።</p>
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((m, idx) => {
                    const parsed = parseChildAge(m.age, parseInt(currentYear, 10) || 2018, 'auto');
                    const numAge = parsed.age !== -1 ? parsed.age : parseInt(String(m.age || '0'), 10) || 0;
                    const isChild = numAge >= 0 && numAge <= 14;
                    const globalIdx = (currentPage - 1) * (pageSize === -1 ? 0 : pageSize) + idx + 1;

                    return (
                      <tr key={`master_mem_${m.id}`} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500 bg-slate-50">{globalIdx}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {m.memberCode ? (
                            <div className="flex flex-col gap-0.5 items-start">
                              <button
                                type="button"
                                onClick={() => handleCopyMemberCode(m.id, m.memberCode!)}
                                className="inline-flex items-center gap-1 font-bold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer whitespace-nowrap"
                                title="ኮዱን ለመቅዳት ይጫኑ"
                              >
                                <span>{m.memberCode}</span>
                                {copiedCodeId === m.id ? (
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Copy className="w-3 h-3 text-indigo-400 shrink-0" />
                                )}
                              </button>
                              {m.familyCode && m.familyCode !== m.memberCode && (
                                <span className="text-[10px] font-semibold text-cyan-800 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200 whitespace-nowrap">
                                  ቤተሰብ፦ {m.familyCode}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-[13pt] text-slate-900">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{activeNameMode === 'en' ? transliterateAmharicToEnglish(m.name) : m.name}</span>
                            {isChild && (
                              <span className="bg-amber-100 text-amber-900 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-300">
                                ልጅ (0-14)
                              </span>
                            )}
                            {m.relationToHead && (
                              <span className="bg-slate-100 text-slate-700 font-semibold text-[10px] px-1.5 py-0.5 rounded border border-slate-200">
                                {m.relationToHead}
                              </span>
                            )}
                          </div>
                          {activeNameMode === 'both' && (
                            <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                              {transliterateAmharicToEnglish(m.name)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-900">{m.chapel || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{m.gender || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                          {m.age !== undefined && m.age !== null && m.age !== '' ? `${m.age} ዓመት` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{canonicalizeEducationLevel(m.educationLevel) || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-700">{canonicalizeOccupation(m.occupation) || '-'}</td>
                        <td className="py-2.5 px-3">
                          {m.profile.serviceRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {m.profile.serviceRoles.map((sr, rIdx) => (
                                <span
                                  key={`tb_sr_${m.id}_${rIdx}`}
                                  className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-[10px] font-bold"
                                >
                                  {sr}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={m.profile.evangelismStatus}
                            onChange={(e) =>
                              handleQuickChangeEvangelismStatus(m, e.target.value as EvangelismMemberStatus)
                            }
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer max-w-[165px] ${EVANGELISM_MASTER_STATUS_META[m.profile.evangelismStatus].badgeClass}`}
                            aria-label={`የ${m.name} የወንጌል አገልግሎት ሁኔታ`}
                          >
                            <option value="paying">{EVANGELISM_MASTER_STATUS_META.paying.am}</option>
                            <option value="unpaid">{EVANGELISM_MASTER_STATUS_META.unpaid.am}</option>
                            <option value="discontinued">{EVANGELISM_MASTER_STATUS_META.discontinued.am}</option>
                            <option value="not_member">{EVANGELISM_MASTER_STATUS_META.not_member.am}</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          {m.profile.spiritualCourses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {m.profile.spiritualCourses.map((sc, cIdx) => (
                                <span
                                  key={`tb_sc_${m.id}_${cIdx}`}
                                  className="inline-block px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold"
                                >
                                  {sc}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberSpiritualField(m, 'isBaptized')}
                              title="ጥምቀት (ለመቀየር ይጫኑ)"
                              className={`px-1.5 py-0.5 rounded border cursor-pointer transition ${
                                m.isBaptized === true
                                  ? 'bg-sky-50 text-sky-900 border-sky-300'
                                  : m.isBaptized === false
                                  ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                                  : 'bg-white text-slate-400 border-dashed border-slate-300 hover:border-sky-300'
                              }`}
                            >
                              ጥምቀት{m.isBaptized === true ? '✓' : m.isBaptized === false ? '✗' : '?'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleMemberSpiritualField(m, 'takesLordsSupper')}
                              title="የጌታ እራት (ለመቀየር ይጫኑ)"
                              className={`px-1.5 py-0.5 rounded border cursor-pointer transition ${
                                m.takesLordsSupper === true
                                  ? 'bg-rose-50 text-rose-900 border-rose-300'
                                  : m.takesLordsSupper === false
                                  ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                                  : 'bg-white text-slate-400 border-dashed border-slate-300 hover:border-rose-300'
                              }`}
                            >
                              እራት{m.takesLordsSupper === true ? '✓' : m.takesLordsSupper === false ? '✗' : '?'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleMemberSpiritualField(m, 'paysTithe')}
                              title="አስራት (ለመቀየር ይጫኑ)"
                              className={`px-1.5 py-0.5 rounded border cursor-pointer transition ${
                                m.paysTithe === true
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : m.paysTithe === false
                                  ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                                  : 'bg-white text-slate-400 border-dashed border-slate-300 hover:border-amber-300'
                              }`}
                            >
                              አስራት{m.paysTithe === true ? '✓' : m.paysTithe === false ? '✗' : '?'}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {m.isEnrolled ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200" title={`በስም ተገናኝቷል (${m.matchLabel || ''})`}>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>ይማራል ({m.enrolledClass})</span>
                            </span>
                          ) : isChild ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>አይማርም</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {m.parentName ? (
                            <div>
                              <div>
                                {activeNameMode === 'en'
                                  ? transliterateAmharicToEnglish(m.parentName)
                                  : m.parentName}
                              </div>
                              {activeNameMode === 'both' && (
                                <div className="text-[10px] font-semibold text-indigo-700">
                                  {transliterateAmharicToEnglish(m.parentName)}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {m.phone ? (
                            <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 hover:underline">
                              <PhoneCall className="w-3 h-3 text-emerald-600" />
                              <span>{m.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {m.memberCode && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddByCodeModal(m.memberCode)}
                                className="px-2 py-1 text-[10px] font-bold bg-cyan-50 text-cyan-900 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition cursor-pointer whitespace-nowrap"
                                title="በዚህ ኮድ አዲስ የቤተሰብ አባል ጨምር"
                              >
                                + ቤተሰብ
                              </button>
                            )}
                            <button type="button" onClick={() => handleOpenEditModal(m)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer" title="አስተካክል">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => { if (window.confirm(`"${m.name}" ይሰረዝ?`)) onDeleteMember(m.id); }} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="ሰርዝ">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* High-Performance Pagination Controls */}
          {filteredMembers.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span>የገጽ መጠን፦</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold focus:ring-2 focus:ring-blue-600"
                >
                  <option value={50}>50 አባላት በገጽ</option>
                  <option value={100}>100 አባላት በገጽ</option>
                  <option value={250}>250 አባላት በገጽ</option>
                  <option value={-1}>ሁሉንም አሳይ ({filteredMembers.length})</option>
                </select>
                <span className="text-slate-500">
                  (ከ {((currentPage - 1) * (pageSize === -1 ? 0 : pageSize) + 1).toLocaleString('am-ET')} እስከ{' '}
                  {Math.min(currentPage * (pageSize === -1 ? filteredMembers.length : pageSize), filteredMembers.length).toLocaleString('am-ET')} ከ{' '}
                  {filteredMembers.length.toLocaleString('am-ET')} አባላት)
                </span>
              </div>

              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
                    title="የቀድሞ ገጽ"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>

                  <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800">
                    ገጽ {currentPage} ከ {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
                    title="ቀጣይ ገጽ"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {addMode === 'by_code' && !editingMember ? (
                  <KeyRound className="w-5 h-5 text-cyan-700" />
                ) : (
                  <UserPlus className="w-5 h-5 text-blue-900" />
                )}
                <span>
                  {editingMember
                    ? 'የአባል መረጃ ማስተካከያ'
                    : addMode === 'by_code'
                    ? 'በነባር ኮድ አዲስ የቤተሰብ አባል መጨመሪያ'
                    : 'አዲስ አባል መመዝገቢያ (ቀጣይ ኮድ በራሱ ይሰጠዋል)'}
                </span>
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingMember && (
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl mt-3 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddMode('new')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    addMode === 'new'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🆕 አዲስ / 1 ሰው ቤተሰብ (ራሱን ኮድ)
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('by_code')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    addMode === 'by_code'
                      ? 'bg-cyan-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔑 በነባር ኮድ የቤተሰብ አባል
                </button>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-3.5 mt-4">
              {/* Lookup existing member by Code when in 'by_code' mode */}
              {!editingMember && addMode === 'by_code' && (
                <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3.5 space-y-2.5">
                  <label className="block text-xs font-extrabold text-cyan-950">
                    1) የነባር አባል/ቤተሰብ ኮድ ወይም ስም ያስገቡ *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {!officialLoggedInChapel && (
                      <select
                        value={lookupChapelHint}
                        onChange={(e) => {
                          const ch = e.target.value;
                          setLookupChapelHint(ch);
                          if (lookupCodeInput.trim()) {
                            const found = findAllMatchingMembersByCode(
                              effectiveMembers,
                              lookupCodeInput,
                              ch || undefined
                            );
                            if (found.length === 1) applyMatchedFamilyToForm(found[0]);
                          }
                        }}
                        className="w-full px-2.5 py-2 text-xs border border-cyan-300 rounded-xl bg-white font-bold"
                      >
                        <option value="">ሁሉም ቻፕሎች (ራስ-ሰር ፍለጋ)</option>
                        {DEFAULT_CHAPELS.map((ch) => (
                          <option key={`lkp_ch_${ch}`} value={ch}>
                            {ch}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className={`relative ${officialLoggedInChapel ? 'sm:col-span-2' : ''}`}>
                      <Hash className="w-4 h-4 text-cyan-700 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ምሳሌ፦ ብከቃሕቤክኤልሻዳይ 0513 ወይም 0513"
                        value={lookupCodeInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLookupCodeInput(val);
                          const matches = findAllMatchingMembersByCode(
                            effectiveMembers,
                            val,
                            activeLookupChapelScope
                          );
                          if (matches.length === 1) {
                            applyMatchedFamilyToForm(matches[0]);
                          }
                        }}
                        className="w-full pl-9 pr-8 py-2 text-xs border border-cyan-300 rounded-xl font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                      />
                      {lookupCodeInput && (
                        <button
                          type="button"
                          onClick={() => setLookupCodeInput('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-chapel disambiguation when typing short "0513" matches >1 chapel */}
                  {matchedAllCodeMembers.length > 1 && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 space-y-1.5">
                      <p className="text-[11px] font-extrabold text-amber-950">
                        ይህ ቁጥር ({lookupCodeInput.trim()}) በ{matchedAllCodeMembers.length} ቻፕሎች ተገኝቷል — የሚፈልጉትን ቻፕል/ቤተሰብ ይምረጡ፦
                      </p>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {matchedAllCodeMembers.map((mc) => (
                          <button
                            key={`multi_mc_${mc.id}`}
                            type="button"
                            onClick={() => {
                              setLookupChapelHint(mapToOfficialChapel(mc.chapel || ''));
                              setLookupCodeInput(mc.memberCode || '');
                              applyMatchedFamilyToForm(mc);
                            }}
                            className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-cyan-50 border border-amber-200 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{mc.name}</span>
                              <span className="ml-1.5 text-[10px] font-bold text-blue-800">({mc.chapel})</span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-indigo-900 shrink-0">{mc.memberCode}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {codeLookupSuggestions.length > 0 && (
                    <div className="bg-white border border-cyan-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {codeLookupSuggestions.map((s) => (
                        <button
                          key={`sug_${s.id}`}
                          type="button"
                          onClick={() => {
                            if (!officialLoggedInChapel) {
                              setLookupChapelHint(mapToOfficialChapel(s.chapel || ''));
                            }
                            setLookupCodeInput(s.memberCode || '');
                            applyMatchedFamilyToForm(s);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 text-xs flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-900">{s.name}</span>
                            <span className="ml-1.5 text-[10px] text-slate-500">({s.chapel})</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-indigo-800 shrink-0">{s.memberCode}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchedCodeMember ? (
                    <div className="bg-white border border-emerald-300 rounded-xl p-3 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ቤተሰቡ ተገኝቷል!
                        </span>
                        <span className="font-mono text-[11px] font-extrabold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {matchedCodeMember.memberCode}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        መሪ/ነባር አባል፦ {matchedCodeMember.name}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        ቻፕል፦ <strong>{mapToOfficialChapel(matchedCodeMember.chapel || '')}</strong>
                        {matchedCodeMember.phone ? ` | ስልክ፦ ${matchedCodeMember.phone}` : ''}
                      </p>
                      {matchedFamilyMembers.length > 0 && (
                        <div className="text-[10px] text-cyan-900 font-semibold pt-1.5 border-t border-slate-100 space-y-0.5">
                          <div>በዚህ ቤተሰብ ውስጥ የተመዘገቡ አባላት ({matchedFamilyMembers.length})፦</div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {matchedFamilyMembers.slice(0, 6).map((fm) => (
                              <span
                                key={`mfm_${fm.id}`}
                                className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 rounded px-1.5 py-0.5 text-[10px] text-slate-800"
                              >
                                <span className="font-bold">{fm.name}</span>
                                <span className="font-mono text-indigo-900">({fm.memberCode})</span>
                              </span>
                            ))}
                            {matchedFamilyMembers.length > 6 && (
                              <span className="text-slate-500">+{matchedFamilyMembers.length - 6} ሌሎች</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : lookupCodeInput.trim() && matchedAllCodeMembers.length === 0 ? (
                    <p className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>ይህ ኮድ/ስም አልተገኘም! እባክዎ ትክክለኛውን የቻፕል ኮድ (ምሳሌ፦ ብከቃሕቤክኤልሻዳይ 0513 ወይም 0513) ያስገቡ።</span>
                    </p>
                  ) : !matchedAllCodeMembers.length ? (
                    <p className="text-[11px] text-cyan-900">
                      ነባሩን ኮድ (ምሳሌ፦ ብከቃሕቤክኤልሻዳይ 0513 ወይም 0513) ወይም የአባሉን ስም ሲያስገቡ ቻፕሉና መሪው በራሱ ይሞላል፤ ለባለቤት/ልጅም በቅደም ተከተል (0513/1፣ 0513/2 ...) ንዑስ ኮድ ይሰጠዋል።
                    </p>
                  ) : null}
                </div>
              )}

              {/* Edit Member: Link existing member to a family base code (e.g. 0514 -> 0513/1) */}
              {editingMember && (
                <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3 space-y-2">
                  <label className="block text-xs font-extrabold text-cyan-950">
                    ከነባር ቤተሰብ ኮድ ጋር አያይዝ / ንዑስ ኮድ ስጥ (አማራጭ)
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-cyan-700 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ምሳሌ፦ 0513 ወይም ብከቃሕቤክኤልሻዳይ 0513"
                      value={formFamilyCode}
                      onChange={(e) => setFormFamilyCode(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs border border-cyan-300 rounded-xl font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                    />
                    {formFamilyCode && (
                      <button
                        type="button"
                        onClick={() => setFormFamilyCode('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="የቤተሰብ ኮድ አጽዳ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {editMatchedFamilyHead && (
                    <div className="text-[11px] bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                      <span className="text-emerald-900 font-bold truncate">
                        ✓ የቤተሰብ መሪ፦ {editMatchedFamilyHead.name}
                      </span>
                      <span className="font-mono font-bold text-indigo-900 shrink-0">
                        {editMatchedFamilyHead.memberCode}
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-cyan-900">
                    ነባሩን የቤተሰብ መሪ ኮድ (ለምሳሌ 0513) እዚህ ሲያስገቡ 0513/1፣ 0513/2 ይሆናል። በቤተሰብ ደረጃ 1 ሰው ብቻ ከሆነ ግን የቤተሰብ ኮዱን ያጽዱና ራሱን የቻለ ኮድ እንዲሰጠው ያድርጉ።
                  </p>
                  {editHasExistingFamilyLinkOrSubCode && formFamilyCode.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormFamilyCode('');
                        setFormRelation('ብቸኛ (1 ሰው ቤተሰብ)');
                      }}
                      className="text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      ↳ ከሌላ ቤተሰብ ነጥልና ራሱን የቻለ (1 ሰው) ኮድ ስጠው
                    </button>
                  )}
                </div>
              )}

              {/* Auto-generated Code Preview Badge */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div className="text-[11px] font-bold text-indigo-950">
                  {editingMember
                    ? editWillUnlinkToStandalone
                      ? 'ራሱን ችሎ (1 ሰው) የሚሰጠው አዲስ ኮድ፦'
                      : editWillReassignSubCode
                      ? 'ከተያያዘ በኋላ የሚሰጠው አዲስ ኮድ፦'
                      : 'የተመደበ መለያ ኮድ፦'
                    : 'ሲመዘገብ በራሱ የሚሰጠው ቀጣይ ኮድ፦'}
                </div>
                <span className="font-mono text-xs font-black text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                  {nextAutoCodePreview}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ሙሉ ስም *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 font-bold"
                />
                {formName.trim() && (
                  <p className="mt-1 text-[11px] font-semibold text-indigo-800 bg-indigo-50/70 border border-indigo-200/70 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>
                      በእንግሊዝኛ (ቀጥታ)፦ <strong>{transliterateAmharicToEnglish(formName)}</strong>
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ጾታ *</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">ወንድ</option>
                    <option value="ሴ">ሴት</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ዕድሜ *</label>
                  <input
                    type="number"
                    required
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ቻፕል (አጥቢያ) *</label>
                  <select
                    value={activeTargetChapelForForm}
                    disabled={Boolean(officialLoggedInChapel) || (!editingMember && addMode === 'by_code' && Boolean(matchedCodeMember))}
                    onChange={(e) => {
                      if (!officialLoggedInChapel) setFormChapel(e.target.value);
                    }}
                    className={`w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold ${
                      officialLoggedInChapel || (!editingMember && addMode === 'by_code' && matchedCodeMember)
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {(officialLoggedInChapel ? [officialLoggedInChapel] : DEFAULT_CHAPELS).map((ch) => (
                      <option key={`m_ch_${ch}`} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">በቤተሰቡ ውስጥ ያለው ዝምድና</label>
                  <select
                    value={formRelation}
                    onChange={(e) => setFormRelation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold bg-white"
                  >
                    <option value="">ይምረጡ (አማራጭ)</option>
                    <option value="ብቸኛ (1 ሰው ቤተሰብ)">ብቸኛ (1 ሰው ቤተሰብ)</option>
                    <option value="የቤተሰብ መሪ">የቤተሰብ መሪ</option>
                    <option value="ባለቤት / ሚስት">ባለቤት / ሚስት</option>
                    <option value="ልጅ">ልጅ</option>
                    <option value="እናት / አባት">እናት / አባት</option>
                    <option value="ወንድም / እህት">ወንድም / እህት</option>
                    <option value="ሌላ የቤተሰብ አባል">ሌላ የቤተሰብ አባል</option>
                  </select>
                </div>
              </div>

              {formGender === 'ሴ' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    የሴቶች የቤተሰብ/የጋብቻ ምድብ (የሴቶች ቋት)
                  </label>
                  <select
                    value={formWomenCategory}
                    onChange={(e) =>
                      setFormWomenCategory(e.target.value as 'auto' | 'married' | 'female_head' | 'other')
                    }
                    className="w-full px-3 py-2 text-xs border border-rose-200 rounded-xl font-bold bg-rose-50/40 text-slate-800"
                  >
                    <option value="auto">በራስ-ሰር ከቤተሰብ ኮድ/ዝምድና ይለይ</option>
                    <option value="married">ባለትዳር የሆነች ሴት</option>
                    <option value="female_head">ራሷ የቤቱ አባወራ የሆነች ሴት</option>
                    <option value="other">ሌላ / ያላገባች</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">የወላጅ/የቤተሰብ መሪ ስም</label>
                <input
                  type="text"
                  value={formParent}
                  onChange={(e) => setFormParent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                {formParent.trim() && (
                  <p className="mt-1 text-[10px] font-semibold text-indigo-700">
                    English: {transliterateAmharicToEnglish(formParent)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">የወላጅ/አባል ስልክ ቁጥር</label>
                  <input
                    type="text"
                    placeholder="0911223344"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">መኖሪያ ቀበሌ/መንደር</label>
                  <input
                    type="text"
                    placeholder="ቀበሌ 01..."
                    value={formResidence}
                    onChange={(e) => setFormResidence(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">የትምህርት ደረጃ</label>
                  <input
                    type="text"
                    list="church-education-suggestions"
                    value={formEducationLevel}
                    onChange={(e) => setFormEducationLevel(e.target.value)}
                    placeholder="ምሳሌ፦ ዲግሪ፣ 10ኛ ክፍል..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                  <datalist id="church-education-suggestions">
                    {SUGGESTED_EDUCATION_LEVELS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">የስራ ዓይነት</label>
                  <input
                    type="text"
                    list="church-occupation-suggestions"
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    placeholder="ምሳሌ፦ ነጋዴ፣ ተማሪ፣ ገበሬ..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                  <datalist id="church-occupation-suggestions">
                    {SUGGESTED_OCCUPATIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Spiritual Participation Fields (Baptism, Lord's Supper, Tithe) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <p className="text-[11px] font-extrabold text-slate-800">
                  መንፈሳዊ ተሳትፎ (ጥምቀት · የጌታ እራት · አስራት)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">የተጠመቀ/ች?</label>
                    <select
                      value={formIsBaptized}
                      onChange={(e) => setFormIsBaptized(e.target.value as 'yes' | 'no' | 'unknown')}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                    >
                      <option value="unknown">ያልተገለጸ</option>
                      <option value="yes">አዎ (ተጠምቋል/ለች)</option>
                      <option value="no">አይ (አልተጠመቀም)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">የጌታ እራት ይካፈላል?</label>
                    <select
                      value={formTakesLordsSupper}
                      onChange={(e) => setFormTakesLordsSupper(e.target.value as 'yes' | 'no' | 'unknown')}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                    >
                      <option value="unknown">ያልተገለጸ</option>
                      <option value="yes">አዎ (ይካፈላል/ትካፈላለች)</option>
                      <option value="no">አይ (አይካፈልም)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">አስራት ይከፍላል?</label>
                    <select
                      value={formPaysTithe}
                      onChange={(e) => setFormPaysTithe(e.target.value as 'yes' | 'no' | 'unknown')}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                    >
                      <option value="unknown">ያልተገለጸ</option>
                      <option value="yes">አዎ (ይከፍላል/ትከፍላለች)</option>
                      <option value="no">አይ (አይከፍልም)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Evangelism Ministry Status */}
              <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-extrabold text-rose-950">
                  የወንጌል አገልግሎት አባልነትና የክፍያ ሁኔታ
                </label>
                <select
                  value={formEvangelismStatus}
                  onChange={(e) => setFormEvangelismStatus(e.target.value as EvangelismMemberStatus)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-rose-200 rounded-xl bg-white font-bold text-slate-900"
                >
                  <option value="not_member">{EVANGELISM_MASTER_STATUS_META.not_member.am}</option>
                  <option value="paying">{EVANGELISM_MASTER_STATUS_META.paying.am}</option>
                  <option value="unpaid">{EVANGELISM_MASTER_STATUS_META.unpaid.am}</option>
                  <option value="discontinued">{EVANGELISM_MASTER_STATUS_META.discontinued.am}</option>
                </select>
              </div>

              {/* Service Roles (የአገልግሎት ድርሻ) */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-extrabold text-indigo-950">
                  የአገልግሎት ድርሻ (መሪዎች / መዘምራን ህብረት / የመዝሙር መሪዎች ህብረት / ሌላም)
                </label>
                {editingMember && (memberMinistryProfileMap.get(editingMember.id)?.autoServiceRoles.length || 0) > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pb-1.5 border-b border-indigo-200/60">
                    <span className="text-[10px] font-bold text-indigo-800 mr-1">ከዘርፎች በራስ-ሰር የተገኘ፦</span>
                    {memberMinistryProfileMap.get(editingMember.id)?.autoServiceRoles.map((ar, idx) => (
                      <span
                        key={`ar_${idx}`}
                        className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-[10px] font-bold text-indigo-900"
                      >
                        ✓ {ar}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_SERVICE_ROLES.map((roleOpt) => {
                    const active = formServiceRoles.includes(roleOpt);
                    return (
                      <button
                        key={`opt_sr_${roleOpt}`}
                        type="button"
                        onClick={() => handleToggleFormRole(roleOpt)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-indigo-900 text-white border-indigo-900'
                            : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100/70'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {roleOpt}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={formCustomRoleInput}
                    onChange={(e) => setFormCustomRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomRole();
                      }
                    }}
                    placeholder="ሌላ የአገልግሎት ድርሻ ይጻፉ..."
                    className="flex-1 px-2.5 py-1.5 text-base sm:text-xs border border-indigo-200 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRole}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-900 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ጨምር</span>
                  </button>
                </div>
                {formServiceRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formServiceRoles.map((sr) => (
                      <span
                        key={`sel_sr_${sr}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-900 text-white text-[10px] font-bold"
                      >
                        <span>{sr}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleFormRole(sr)}
                          className="hover:text-amber-300 cursor-pointer"
                          aria-label={`አስወግድ ${sr}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Enrolled Spiritual Education Courses */}
              <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-extrabold text-teal-950">
                  በቤተክርስቲያኒቱ በመማር ላይ ያለ መንፈሳዊ ትምህርት
                </label>
                {editingMember && (memberMinistryProfileMap.get(editingMember.id)?.autoSpiritualCourses.length || 0) > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pb-1.5 border-b border-teal-200/60">
                    <span className="text-[10px] font-bold text-teal-800 mr-1">ከት/ቤቶች/ቡድኖች የተገኘ፦</span>
                    {memberMinistryProfileMap.get(editingMember.id)?.autoSpiritualCourses.map((ac, idx) => (
                      <span
                        key={`ac_${idx}`}
                        className="px-2 py-0.5 rounded bg-white border border-teal-200 text-[10px] font-bold text-teal-900"
                      >
                        ✓ {ac}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_SPIRITUAL_COURSES.map((courseOpt) => {
                    const active = formSpiritualCourses.includes(courseOpt);
                    return (
                      <button
                        key={`opt_sc_${courseOpt}`}
                        type="button"
                        onClick={() => handleToggleFormCourse(courseOpt)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-teal-800 text-white border-teal-800'
                            : 'bg-white text-slate-700 border-teal-200 hover:bg-teal-100/70'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {courseOpt}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={formCustomCourseInput}
                    onChange={(e) => setFormCustomCourseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCourse();
                      }
                    }}
                    placeholder="ሌላ መንፈሳዊ ትምህርት ይጻፉ..."
                    className="flex-1 px-2.5 py-1.5 text-base sm:text-xs border border-teal-200 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCourse}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-800 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ጨምር</span>
                  </button>
                </div>
                {formSpiritualCourses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formSpiritualCourses.map((sc) => (
                      <span
                        key={`sel_sc_${sc}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-800 text-white text-[10px] font-bold"
                      >
                        <span>{sc}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleFormCourse(sc)}
                          className="hover:text-amber-300 cursor-pointer"
                          aria-label={`አስወግድ ${sc}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  disabled={!editingMember && addMode === 'by_code' && !matchedCodeMember}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md cursor-pointer"
                >
                  {editingMember ? 'ለውጡን አስቀምጥ' : 'መዝግብና ኮድ ስጥ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Name Cross-Reference Modal (Pure Name-Matching with Sunday School, Regardless of Age Differences) */}
      <NameCrossReferenceModal
        isOpen={isNameCompareModalOpen}
        onClose={() => setIsNameCompareModalOpen(false)}
        title={
          officialLoggedInChapel
            ? `${officialLoggedInChapel} እና የሰንበት ትምህርት ቤት የስም ማስተያያ ሰንጠረዥ`
            : 'አጠቃላይ የቤተክርስቲያን መዝገብ እና የሰንበት ትምህርት ቤት የስም ማስተያያ ሰንጠረዥ'
        }
        sourceLabel={officialLoggedInChapel ? `${officialLoggedInChapel} መዝገብ` : 'የቤተክርስቲያን አጠቃላይ መዝገብ (5,300+ አባላት)'}
        churchItems={effectiveMembers}
        studentsByClass={studentsByClass}
        classList={classList}
        chapelList={chapelStats.chapels}
      />

      {currentUserRole === 'admin' && onBulkIncrementAges && (
        <AnnualAgeIncrementModal
          isOpen={isAgeModalOpen}
          onClose={() => setIsAgeModalOpen(false)}
          currentYear={currentYear}
          ageReferenceYear={ageReferenceYear}
          totalMembersCount={churchMembers.length}
          totalChildrenCount={churchChildren.length}
          onApplyBulkIncrement={onBulkIncrementAges}
        />
      )}
    </div>
  );
};
