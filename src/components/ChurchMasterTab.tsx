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
  Hash
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ChurchMember, ChurchChild, Role, Student } from '../types';
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
  findMemberByEnteredCode,
  getNextMemberCodeForChapel,
  normalizeCodeForLookup
} from '../utils/memberCodeGenerator';

interface ChurchMasterTabProps {
  currentYear: string;
  ageReferenceYear?: number;
  churchMembers?: ChurchMember[];
  chapelList?: string[];
  churchChildren?: ChurchChild[];
  studentsByClass?: { [className: string]: Student[] };
  classList?: string[];
  onBatchAddMembers: (members: ChurchMember[], mode?: 'append' | 'replace', baselineYear?: number) => void;
  onAddMember: (member: Omit<ChurchMember, 'id'>) => ChurchMember | void;
  onUpdateMember: (member: ChurchMember) => void;
  onDeleteMember: (id: number) => void;
  onClearChurchMembers: () => void;
  onExtractChildrenToChildrenTab: (children: Omit<ChurchChild, 'id'>[], mode?: 'append' | 'replace') => void;
  onBulkIncrementAges?: (options: Omit<BulkAgeIncrementOptions, 'targetAcademicYear'>) => BulkAgeIncrementStats | null;
  currentUserRole: Role | null;
  loggedInChapel?: string | null;
}

export const ChurchMasterTab: React.FC<ChurchMasterTabProps> = ({
  currentYear,
  ageReferenceYear = 2017,
  churchMembers = [],
  chapelList = DEFAULT_CHAPELS,
  churchChildren = [],
  studentsByClass = {},
  classList = [],
  onBatchAddMembers,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onClearChurchMembers,
  onExtractChildrenToChildrenTab,
  onBulkIncrementAges,
  currentUserRole,
  loggedInChapel
}) => {
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
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formGender, setFormGender] = useState<string>('ወ');
  const [formAge, setFormAge] = useState<string>('30');
  const [formEducationLevel, setFormEducationLevel] = useState<string>('ዲግሪ');
  const [formOccupation, setFormOccupation] = useState<string>('የመንግሥት ሠራተኛ');
  const [formChapel, setFormChapel] = useState<string>(officialLoggedInChapel || DEFAULT_CHAPELS[0]);
  const [formParent, setFormParent] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formResidence, setFormResidence] = useState<string>('');
  const [formRelation, setFormRelation] = useState<string>('');
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

  // Members mapped with Sunday School enrollment status
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

      return {
        ...m,
        numAge,
        isChild,
        isEnrolled: Boolean(match),
        enrolledClass: match ? match.className : null,
        matchedStudent: match ? match.student : null,
        matchLabel: match ? match.matchLabel : null,
        studentAge: match?.student?.age ?? null
      };
    });
  }, [effectiveMembers, sundaySchoolIndex, currentYear]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return churchMembersWithStatus.filter((m) => {
      // Search term (Amharic homophones, multi-word names, phones, chapels)
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
          m.occupation
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

      return true;
    });
  }, [churchMembersWithStatus, searchTerm, selectedChapels, selectedChapelFilter, selectedAgeCohort, sundaySchoolFilter]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedChapelFilter, selectedChapels, selectedAgeCohort, sundaySchoolFilter, pageSize]);

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
          educationLevel: m.educationLevel || (ageNum <= 3 ? 'ጨቅላ' : ageNum <= 6 ? 'መዋዕለ ሕፃናት' : `${ageNum - 6}ኛ ክፍል`),
          occupation: m.occupation || (ageNum <= 3 ? 'የቤት ውስጥ' : 'ተማሪ'),
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

  // Export Church Database to Excel
  const handleExportExcel = () => {
    const headers = [
      'ተ.ቁ',
      'መለያ ኮድ',
      'የቤተሰብ ኮድ',
      'የአባሉ/የልጁ ሙሉ ስም',
      'ጾታ',
      'ዕድሜ',
      'የዕድሜ ምድብ',
      'የትምህርት ደረጃ',
      'የስራ ዓይነት',
      'ቻፕል (አጥቢያ)',
      'የወላጅ/የቤተሰብ መሪ ስም',
      'የወላጅ/አባል ስልክ ቁጥር',
      'መኖሪያ ቀበሌ/መንደር',
      'የኤክሴል ሺት'
    ];

    const rows = filteredMembers.map((m, idx) => {
      const parsedNum = parseInt(String(m.age ?? ''), 10);
      const numAge = isNaN(parsedNum) ? 0 : parsedNum;
      let ageGroup = '60+ አረጋውያን';
      if (numAge <= 14) ageGroup = 'ከ0-14 (ልጅ)';
      else if (numAge <= 29) ageGroup = 'ከ15-29 (ወጣት)';
      else if (numAge <= 59) ageGroup = 'ከ30-59 (ጎልማሳ/ወላጅ)';

      const ageDisplay = m.age !== undefined && m.age !== null && String(m.age).trim() !== '' ? m.age : '-';

      return [
        idx + 1,
        m.memberCode || '-',
        m.familyCode || '-',
        m.name,
        m.gender || '-',
        ageDisplay,
        ageGroup,
        m.educationLevel || '-',
        m.occupation || '-',
        m.chapel || '-',
        m.parentName || '-',
        m.phone || '-',
        m.residence || '-',
        m.sheetName || '-'
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'አጠቃላይ የቤተክርስቲያን መረጃ');

    XLSX.writeFile(wb, `የብርብር_ቤተክርስቲያን_አጠቃላይ_መረጃ_ቋት_${currentYear}.xlsx`);
  };

  const matchedCodeMember = useMemo(() => {
    if (!lookupCodeInput.trim()) return null;
    return findMemberByEnteredCode(effectiveMembers, lookupCodeInput, officialLoggedInChapel);
  }, [effectiveMembers, lookupCodeInput, officialLoggedInChapel]);

  const matchedFamilyMembers = useMemo(() => {
    if (!matchedCodeMember) return [];
    const targetFamilyKey = normalizeCodeForLookup(matchedCodeMember.familyCode || matchedCodeMember.memberCode);
    if (!targetFamilyKey) return [matchedCodeMember];
    return effectiveMembers.filter(
      (m) =>
        normalizeCodeForLookup(m.familyCode) === targetFamilyKey ||
        normalizeCodeForLookup(m.memberCode) === targetFamilyKey
    );
  }, [matchedCodeMember, effectiveMembers]);

  const codeLookupSuggestions = useMemo(() => {
    const q = lookupCodeInput.trim();
    if (!q || matchedCodeMember) return [];
    const normQ = normalizeCodeForLookup(q);
    return effectiveMembers
      .filter(
        (m) =>
          (m.memberCode && normalizeCodeForLookup(m.memberCode).includes(normQ)) ||
          matchesAmharicSearch(q, m.name)
      )
      .slice(0, 6);
  }, [effectiveMembers, lookupCodeInput, matchedCodeMember]);

  const activeTargetChapelForForm = useMemo(() => {
    if (officialLoggedInChapel) return officialLoggedInChapel;
    if (!editingMember && addMode === 'by_code' && matchedCodeMember) {
      return mapToOfficialChapel(matchedCodeMember.chapel || '');
    }
    return mapToOfficialChapel(formChapel);
  }, [officialLoggedInChapel, editingMember, addMode, matchedCodeMember, formChapel]);

  const nextAutoCodePreview = useMemo(() => {
    return getNextMemberCodeForChapel(churchMembers, activeTargetChapelForForm);
  }, [churchMembers, activeTargetChapelForForm]);

  const handleCopyMemberCode = (id: number, code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 1800);
  };

  const applyMatchedFamilyToForm = (matched: ChurchMember) => {
    const officialCh = officialLoggedInChapel || mapToOfficialChapel(matched.chapel || '');
    setFormChapel(officialCh);
    setFormParent(matched.parentName || matched.name || '');
    setFormPhone(matched.phone || '');
    setFormResidence(matched.residence || '');
    setFormFamilyCode(matched.familyCode || matched.memberCode || '');
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setAddMode('new');
    setLookupCodeInput('');
    setFormName('');
    setFormGender('ወ');
    setFormAge('30');
    setFormEducationLevel('ዲግሪ');
    setFormOccupation('የመንግሥት ሠራተኛ');
    setFormChapel(officialLoggedInChapel || DEFAULT_CHAPELS[0]);
    setFormParent('');
    setFormPhone('');
    setFormResidence('');
    setFormRelation('');
    setFormFamilyCode('');
    setIsAddModalOpen(true);
  };

  const handleOpenAddByCodeModal = (initialCode?: string) => {
    setEditingMember(null);
    setAddMode('by_code');
    const codeStr = (initialCode || '').trim();
    setLookupCodeInput(codeStr);
    setFormName('');
    setFormGender('ወ');
    setFormAge('20');
    setFormEducationLevel('');
    setFormOccupation('');
    setFormChapel(officialLoggedInChapel || DEFAULT_CHAPELS[0]);
    setFormParent('');
    setFormPhone('');
    setFormResidence('');
    setFormRelation('የቤተሰብ አባል');
    setFormFamilyCode('');
    if (codeStr) {
      const matched = findMemberByEnteredCode(effectiveMembers, codeStr, officialLoggedInChapel);
      if (matched) {
        setFormChapel(officialLoggedInChapel || mapToOfficialChapel(matched.chapel || ''));
        setFormParent(matched.parentName || matched.name || '');
        setFormPhone(matched.phone || '');
        setFormResidence(matched.residence || '');
        setFormFamilyCode(matched.familyCode || matched.memberCode || '');
      }
    }
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (m: ChurchMember) => {
    setEditingMember(m);
    setAddMode('new');
    setLookupCodeInput('');
    setFormName(m.name);
    setFormGender(m.gender || 'ወ');
    setFormAge(m.age !== undefined && m.age !== null && String(m.age).trim() !== '' ? String(m.age) : '30');
    setFormEducationLevel(m.educationLevel || 'ዲግሪ');
    setFormOccupation(m.occupation || 'የመንግሥት ሠራተኛ');
    setFormChapel(officialLoggedInChapel || mapToOfficialChapel(m.chapel || ''));
    setFormParent(m.parentName || '');
    setFormPhone(m.phone || '');
    setFormResidence(m.residence || '');
    setFormRelation(m.relationToHead || '');
    setFormFamilyCode(m.familyCode || '');
    setIsAddModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('እባክዎን የአባሉን ሙሉ ስም ያስገቡ!');
      return;
    }

    if (!editingMember && addMode === 'by_code' && !matchedCodeMember) {
      alert('እባክዎን ትክክለኛ የነባር አባል/ቤተሰብ ኮድ (ለምሳሌ፦ ብከቃሕቤክኤልሮኢ 0001) ያስገቡና ቤተሰቡ መገኘቱን ያረጋግጡ!');
      return;
    }

    const officialChapel =
      officialLoggedInChapel ||
      (!editingMember && addMode === 'by_code' && matchedCodeMember
        ? mapToOfficialChapel(matchedCodeMember.chapel || '')
        : mapToOfficialChapel(formChapel));

    const resolvedFamilyCode =
      !editingMember && addMode === 'by_code' && matchedCodeMember
        ? matchedCodeMember.familyCode || matchedCodeMember.memberCode
        : formFamilyCode.trim() || undefined;

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
    const payload: Omit<ChurchMember, 'id'> = {
      name: formName.trim(),
      gender: formGender,
      age: isNaN(parsedFormAge) ? 30 : Math.max(0, parsedFormAge),
      educationLevel: formEducationLevel.trim() || undefined,
      occupation: formOccupation.trim() || undefined,
      chapel: officialChapel,
      parentName: resolvedParent,
      phone: resolvedPhone,
      residence: resolvedResidence,
      relationToHead: formRelation.trim() || undefined,
      familyCode: resolvedFamilyCode,
      memberCode: editingMember?.memberCode,
      registeredDate: editingMember?.registeredDate || new Date().toISOString().split('T')[0]
    };

    if (editingMember) {
      onUpdateMember({
        ...payload,
        id: editingMember.id
      });
    } else {
      const created = onAddMember(payload);
      const assignedCode =
        (created && 'memberCode' in created && created.memberCode) ||
        getNextMemberCodeForChapel(churchMembers, officialChapel);
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

            {onBulkIncrementAges && !officialLoggedInChapel && (
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

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="በኮድ (ብከቃሕቤክ...)፣ በስም፣ ወላጅ፣ ስልክ ፈልግ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white"
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
              className={`w-full py-2 px-2.5 text-xs border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
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
              onChange={(e) => setSundaySchoolFilter(e.target.value as any)}
              className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">የሰንበት ት/ቤት ሁኔታ (ሁሉም)</option>
              <option value="enrolled">✓ በሰንበት ት/ቤት የሚማሩ (በስም የተገናኙ)</option>
              <option value="not_enrolled_children">⚠️ የማይማሩ ልጆች (0-14)</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>የተገኙ አባላት፦ <strong className="text-blue-900 font-extrabold">{filteredMembers.length.toLocaleString('am-ET')}</strong></span>
            {(searchTerm || (!officialLoggedInChapel && (selectedChapelFilter !== 'all' || selectedChapels.length > 0)) || selectedAgeCohort !== 'all' || sundaySchoolFilter !== 'all') && (
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
                }}
                className="text-rose-600 hover:text-rose-800 hover:underline font-bold cursor-pointer"
              >
                አጽዳ
              </button>
            )}
          </div>
        </div>
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
                        <th className="py-2.5 px-3 min-w-[130px]">የወላጅ/አሳዳጊ ስም</th>
                        <th className="py-2.5 px-3 min-w-[130px]">የወላጅ/አባል ስልክ</th>
                        <th className="py-2.5 px-3 text-center w-28">እርምጃዎች</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chMembers.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-slate-400 font-medium">
                            በዚህ ቻፕል እስካሁን የተመዘገበ አባል የለም።
                          </td>
                        </tr>
                      ) : (
                        chMembers.map((m, idx) => {
                          const parsed = parseChildAge(m.age, parseInt(currentYear, 10) || 2018, 'auto');
                          const numAge = parsed.age !== -1 ? parsed.age : parseInt(String(m.age || '0'), 10) || 0;
                          const isChild = numAge >= 0 && numAge <= 14;

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
                                  <span>{m.name}</span>
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
                              </td>
                              <td className="py-2 px-3 text-center font-bold">{m.gender || '-'}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">
                                {m.age !== undefined && m.age !== null && m.age !== '' ? `${m.age} ዓመት` : '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-700">{m.educationLevel || '-'}</td>
                              <td className="py-2 px-3 text-slate-700">{m.occupation || '-'}</td>
                              <td className="py-2 px-3 text-slate-700">{m.parentName || '-'}</td>
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
                  <th className="py-3 px-3 font-bold min-w-[150px]">የሰንበት ት/ቤት ሁኔታ</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ/የቤተሰብ መሪ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ/አባል ስልክ ቁጥር</th>
                  <th className="py-3 px-3 text-center font-bold w-28">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
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
                            <span>{m.name}</span>
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
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-900">{m.chapel || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{m.gender || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                          {m.age !== undefined && m.age !== null && m.age !== '' ? `${m.age} ዓመት` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{m.educationLevel || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-700">{m.occupation || '-'}</td>
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
                        <td className="py-2.5 px-3 text-slate-700">{m.parentName || '-'}</td>
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
                  🆕 አዲስ አባል (ያለ ኮድ)
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
                    1) የነባር አባል/ቤተሰብ ኮድ ያስገቡ *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-cyan-700 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ምሳሌ፦ ብከቃሕቤክኤልሮኢ 0001"
                      value={lookupCodeInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLookupCodeInput(val);
                        const found = findMemberByEnteredCode(effectiveMembers, val, officialLoggedInChapel);
                        if (found) {
                          applyMatchedFamilyToForm(found);
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

                  {codeLookupSuggestions.length > 0 && (
                    <div className="bg-white border border-cyan-200 rounded-lg divide-y divide-slate-100 max-h-36 overflow-y-auto">
                      {codeLookupSuggestions.map((s) => (
                        <button
                          key={`sug_${s.id}`}
                          type="button"
                          onClick={() => {
                            setLookupCodeInput(s.memberCode || '');
                            applyMatchedFamilyToForm(s);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 text-xs flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="font-bold text-slate-900 truncate">{s.name}</span>
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
                      {matchedFamilyMembers.length > 1 && (
                        <p className="text-[10px] text-cyan-800 font-semibold pt-1 border-t border-slate-100">
                          በዚህ ቤተሰብ ኮድ ውስጥ ያሉ አባላት ({matchedFamilyMembers.length})፦{' '}
                          {matchedFamilyMembers.map((fm) => fm.name).slice(0, 4).join('፣ ')}
                          {matchedFamilyMembers.length > 4 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  ) : lookupCodeInput.trim() ? (
                    <p className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>ይህ ኮድ አልተገኘም! እባክዎ ትክክለኛውን የቻፕል ኮድ (ምሳሌ፦ ብከቃሕቤክኤልሮኢ 0001) ያስገቡ።</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-cyan-900">
                      ነባሩን የቤተሰብ መሪ ኮድ ሲያስገቡ ቻፕሉ፣ ወላጅ ስምና ስልክ በራሱ ይሞላል፤ ለአዲሱ አባልም ቀጣዩ ተከታታይ ኮድ ይሰጠዋል።
                    </p>
                  )}
                </div>
              )}

              {/* Auto-generated Code Preview Badge */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div className="text-[11px] font-bold text-indigo-950">
                  {editingMember ? 'የተመደበ መለያ ኮድ፦' : 'ሲመዘገብ በራሱ የሚሰጠው ቀጣይ ኮድ፦'}
                </div>
                <span className="font-mono text-xs font-black text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                  {editingMember?.memberCode || nextAutoCodePreview}
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
                    <option value="የቤተሰብ መሪ">የቤተሰብ መሪ</option>
                    <option value="ባለቤት / ሚስት">ባለቤት / ሚስት</option>
                    <option value="ልጅ">ልጅ</option>
                    <option value="እናት / አባት">እናት / አባት</option>
                    <option value="ወንድም / እህት">ወንድም / እህት</option>
                    <option value="ሌላ የቤተሰብ አባል">ሌላ የቤተሰብ አባል</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">የወላጅ/የቤተሰብ መሪ ስም</label>
                <input
                  type="text"
                  value={formParent}
                  onChange={(e) => setFormParent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
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
                    value={formEducationLevel}
                    onChange={(e) => setFormEducationLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">የስራ ዓይነት</label>
                  <input
                    type="text"
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
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

      {onBulkIncrementAges && (
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
