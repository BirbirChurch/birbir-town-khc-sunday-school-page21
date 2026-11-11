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
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ChurchMember, ChurchChild, Role, Student } from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import {
  parseChildAge,
  normalizeHeader,
  mapToOfficialChapel,
  buildSundaySchoolIndex,
  matchChildNameToSundaySchool,
  SundaySchoolIndexStructure
} from './ChurchChildrenTab';
import { DEFAULT_CHAPELS } from '../constants/initialData';
import { NameCrossReferenceModal } from './NameCrossReferenceModal';

interface ChurchMasterTabProps {
  currentYear: string;
  churchMembers?: ChurchMember[];
  chapelList?: string[];
  churchChildren?: ChurchChild[];
  studentsByClass?: { [className: string]: Student[] };
  classList?: string[];
  onBatchAddMembers: (members: ChurchMember[], mode?: 'append' | 'replace') => void;
  onAddMember: (member: Omit<ChurchMember, 'id'>) => void;
  onUpdateMember: (member: ChurchMember) => void;
  onDeleteMember: (id: number) => void;
  onClearChurchMembers: () => void;
  onExtractChildrenToChildrenTab: (children: Omit<ChurchChild, 'id'>[], mode?: 'append' | 'replace') => void;
  currentUserRole: Role | null;
}

export const ChurchMasterTab: React.FC<ChurchMasterTabProps> = ({
  currentYear,
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
  currentUserRole
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChapelFilter, setSelectedChapelFilter] = useState<string>('all');
  const [selectedChapels, setSelectedChapels] = useState<string[]>([]);
  const [displayLayoutMode, setDisplayLayoutMode] = useState<'table' | 'grouped_chapels'>('table');
  const [extractedSuccessMsg, setExtractedSuccessMsg] = useState<string>('');
  const [selectedAgeCohort, setSelectedAgeCohort] = useState<string>('all');
  const [sundaySchoolFilter, setSundaySchoolFilter] = useState<'all' | 'enrolled' | 'not_enrolled_children'>('all');
  const [isNameCompareModalOpen, setIsNameCompareModalOpen] = useState<boolean>(false);

  // Pagination for high capacity (5,300+ members)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Add / Edit Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formGender, setFormGender] = useState<string>('ወ');
  const [formAge, setFormAge] = useState<string>('30');
  const [formEducationLevel, setFormEducationLevel] = useState<string>('ዲግሪ');
  const [formOccupation, setFormOccupation] = useState<string>('የመንግሥት ሠራተኛ');
  const [formChapel, setFormChapel] = useState<string>(DEFAULT_CHAPELS[0]);
  const [formParent, setFormParent] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formResidence, setFormResidence] = useState<string>('');

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

    churchMembers.forEach((m) => {
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

    const totalMembers = churchMembers.length;

    return {
      cohorts,
      totalMembers,
      totalMale,
      totalFemale
    };
  }, [churchMembers, currentYear]);

  // Chapel statistics for Church Members (Strictly locked to DEFAULT_CHAPELS)
  const chapelStats = useMemo(() => {
    const statsMap: { [chapel: string]: { total: number; childrenCount: number; adultCount: number; male: number; female: number } } = {};
    DEFAULT_CHAPELS.forEach((ch) => {
      statsMap[ch] = { total: 0, childrenCount: 0, adultCount: 0, male: 0, female: 0 };
    });

    churchMembers.forEach((m) => {
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
      chapels: DEFAULT_CHAPELS,
      statsMap
    };
  }, [churchMembers, currentYear]);

  // Sunday School Index for pure name matching regardless of age
  const sundaySchoolIndex: SundaySchoolIndexStructure = useMemo(() => {
    return buildSundaySchoolIndex(studentsByClass || {});
  }, [studentsByClass]);

  // Members mapped with Sunday School enrollment status
  const churchMembersWithStatus = useMemo(() => {
    return churchMembers.map((m) => {
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
  }, [churchMembers, sundaySchoolIndex, currentYear]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return churchMembersWithStatus.filter((m) => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = m.name?.toLowerCase().includes(q);
        const matchesParent = m.parentName?.toLowerCase().includes(q);
        const matchesPhone = m.phone?.toLowerCase().includes(q);
        const matchesResidence = m.residence?.toLowerCase().includes(q);
        const matchesChapel = m.chapel?.toLowerCase().includes(q);
        const matchesStudent = m.matchedStudent?.name?.toLowerCase().includes(q);
        const matchesClass = m.enrolledClass?.toLowerCase().includes(q);
        if (!matchesName && !matchesParent && !matchesPhone && !matchesResidence && !matchesChapel && !matchesStudent && !matchesClass) {
          return false;
        }
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
    DEFAULT_CHAPELS.forEach((ch) => {
      groups[ch] = [];
    });
    filteredMembers.forEach((m) => {
      const ch = mapToOfficialChapel(m.chapel || '');
      if (!groups[ch]) groups[ch] = [];
      groups[ch].push(m);
    });
    return groups;
  }, [filteredMembers]);

  // Function to extract 0-14 children from church database to Children Registries
  const handleExtractChildren = () => {
    const childrenToExtract: Omit<ChurchChild, 'id'>[] = [];

    churchMembers.forEach((m) => {
      const parsed = parseChildAge(m.age, parseInt(currentYear, 10) || 2018, 'auto');
      let ageNum = parsed.age;

      if (ageNum === -1 && m.age) {
        const match = String(m.age).match(/\d+/);
        if (match) ageNum = parseInt(match[0], 10);
      }

      if (ageNum >= 0 && ageNum <= 14) {
        const officialChapel = mapToOfficialChapel(m.chapel || '');
        childrenToExtract.push({
          name: m.name,
          gender: m.gender === 'ሴ' || m.gender === 'ሴት' ? 'ሴ' : 'ወ',
          age: ageNum,
          educationLevel: m.educationLevel || (ageNum <= 3 ? 'ጨቅላ' : ageNum <= 6 ? 'መዋዕለ ሕፃናት' : `${ageNum - 6}ኛ ክፍል`),
          occupation: m.occupation || (ageNum <= 3 ? 'የቤት ውስጥ' : 'ተማሪ'),
          chapel: officialChapel,
          parentName: m.parentName || undefined,
          phone: m.phone || undefined,
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
    setExtractedSuccessMsg(`✓ ${childrenToExtract.length} ልጆች (ከ0-14 ዕድሜ) ከቤተክርስቲያኒቱ መረጃ ቋት ተለይተው ወደ የልጆች ቋትና ወደ 10ሩም ቻፕሎች የልጆች ቋት በስኬት ገብተዋል!`);
    setTimeout(() => setExtractedSuccessMsg(''), 6000);
  };

  // High-Capacity Multi-Sheet Excel Upload Handler (Handles 5,300+ Rows Completely Across All Sheets)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        // Parse ArrayBuffer for maximum memory efficiency & speed on large files (5000+ rows)
        const workbook = XLSX.read(buffer, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('ፋይሉ ምንም ሺት (Sheet) አልያዘም!');
          return;
        }

        const importedMembers: ChurchMember[] = [];
        const autoChildrenToExtract: Omit<ChurchChild, 'id'>[] = [];
        const sheetCounts: Record<string, number> = {};

        // Loop through ALL SHEETS in the Excel workbook
        workbook.SheetNames.forEach((sheetName, sIdx) => {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) return;

          // Crucial fix: Repair and extend worksheet['!ref'] so no rows are clipped
          if (worksheet['!ref']) {
            try {
              const range = XLSX.utils.decode_range(worksheet['!ref']);
              Object.keys(worksheet).forEach((cellCoord) => {
                if (cellCoord[0] === '!') return;
                try {
                  const decoded = XLSX.utils.decode_cell(cellCoord);
                  if (decoded.r > range.e.r) range.e.r = decoded.r;
                  if (decoded.c > range.e.c) range.e.c = decoded.c;
                } catch {}
              });
              worksheet['!ref'] = XLSX.utils.encode_range(range);
            } catch {}
          }

          const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!rawRows || rawRows.length < 1) return;

          // Robust Header Detection: score candidate rows 0 to 20
          let headerIdx = -1;
          let highestScore = 0;

          for (let r = 0; r < Math.min(20, rawRows.length); r++) {
            const row = rawRows[r] || [];
            let score = 0;
            row.forEach((col: any) => {
              const str = normalizeHeader(String(col || ''));
              if (str.includes('ስም') || str.includes('name')) score += 3;
              if (str.includes('ጾታ') || str.includes('gender') || str.includes('sex') || str === 'ወ/ሴ' || str === 'm/f') score += 2;
              if (str.includes('እድሜ') || str.includes('age') || str.includes('ልደት') || str.includes('ትውልድ') || str.includes('ተወለደ')) score += 2;
              if (str.includes('ስልክ') || str.includes('phone') || str.includes('mobile') || str.includes('tel') || str.includes('cell')) score += 2;
              if (str.includes('ተ.ቁ') || str.includes('no') || str.includes('#') || str.includes('ቁጥር')) score += 1;
              if (str.includes('ቻፕል') || str.includes('chapel')) score += 1;
              if (str.includes('ቀበሌ') || str.includes('መንደር') || str.includes('residence')) score += 1;
              if (str.includes('ትምህርት') || str.includes('ደረጃ') || str.includes('grade')) score += 1;
              if (str.includes('ስራ') || str.includes('occupation') || str.includes('job')) score += 1;
            });
            if (score > highestScore) {
              highestScore = score;
              headerIdx = r;
            }
          }

          // If no header row found with keywords, assume row 0 is header or data starts at 0
          if (highestScore < 2) {
            headerIdx = 0;
          }

          let nameIdx = -1;
          let fatherIdx = -1;
          let grandfatherIdx = -1;
          let genderIdx = -1;
          let ageIdx = -1;
          let chapelIdx = -1;
          let eduIdx = -1;
          let occIdx = -1;
          let parentIdx = -1;
          let phoneIdx = -1;
          let residenceIdx = -1;

          const headerRow = headerIdx >= 0 ? rawRows[headerIdx] || [] : [];

          headerRow.forEach((col: any, idx: number) => {
            const str = normalizeHeader(String(col || ''));
            // Name column
            if (
              (str.includes('ስም') || str.includes('name') || str.includes('ሙሉስም') || str.includes('fullname')) &&
              !str.includes('ወላጅ') &&
              !str.includes('አባት') &&
              !str.includes('እናት') &&
              !str.includes('አያት') &&
              !str.includes('parent') &&
              !str.includes('father') &&
              !str.includes('mother')
            ) {
              if (nameIdx === -1) nameIdx = idx;
            }
            if (str.includes('አባት') || str.includes('father')) {
              if (fatherIdx === -1 && !str.includes('ወላጅ') && !str.includes('parent')) fatherIdx = idx;
            }
            if (str.includes('አያት') || str.includes('grandfather')) {
              if (grandfatherIdx === -1) grandfatherIdx = idx;
            }
            if (str.includes('ጾታ') || str.includes('gender') || str.includes('sex') || str === 'ወ/ሴ' || str === 'm/f') {
              if (genderIdx === -1) genderIdx = idx;
            }
            if (
              str.includes('እድሜ') ||
              str.includes('age') ||
              str.includes('ልደት') ||
              str.includes('ትውልድ') ||
              str.includes('ተወለደ') ||
              str.includes('dob') ||
              str.includes('birth') ||
              str.includes('yr')
            ) {
              if (ageIdx === -1) ageIdx = idx;
            }
            if (str.includes('ትምህርት') || str.includes('education') || str.includes('ደረጃ') || str.includes('grade')) {
              if (eduIdx === -1) eduIdx = idx;
            }
            if (str.includes('ስራ') || str.includes('occupation') || str.includes('ሙያ') || str.includes('job')) {
              if (occIdx === -1) occIdx = idx;
            }
            if (str.includes('ቻፕል') || str.includes('chapel') || str.includes('አጥቢያ') || str.includes('ማዕከል')) {
              if (chapelIdx === -1) chapelIdx = idx;
            }
            if (str.includes('ወላጅ') || str.includes('አሳዳጊ') || str.includes('parent') || str.includes('የቤተሰብመሪ') || str.includes('guardian')) {
              if (parentIdx === -1) parentIdx = idx;
            }
            if (str.includes('ስልክ') || str.includes('phone') || str.includes('mobile') || str.includes('tel') || str.includes('cell')) {
              if (phoneIdx === -1) phoneIdx = idx;
            }
            if (str.includes('ቀበሌ') || str.includes('መንደር') || str.includes('መኖሪያ') || str.includes('residence') || str.includes('አድራሻ')) {
              if (residenceIdx === -1) residenceIdx = idx;
            }
          });

          // Intelligent content-based fallback for nameIdx if header match missed
          if (nameIdx === -1) {
            const sampleStart = headerIdx + 1;
            const sampleEnd = Math.min(rawRows.length, sampleStart + 10);
            for (let c = 0; c < 5; c++) {
              let textCount = 0;
              for (let r = sampleStart; r < sampleEnd; r++) {
                const cell = String(rawRows[r]?.[c] || '').trim();
                if (cell && cell.length > 3 && isNaN(Number(cell))) {
                  textCount++;
                }
              }
              if (textCount >= 4) {
                nameIdx = c;
                break;
              }
            }
            if (nameIdx === -1) nameIdx = 1; // Default to Column B (1) as standard in church registries
          }

          // Content-based fallback for genderIdx if missing
          if (genderIdx === -1) {
            const sampleStart = headerIdx + 1;
            const sampleEnd = Math.min(rawRows.length, sampleStart + 10);
            for (let c = 0; c < 8; c++) {
              let genderMatch = 0;
              for (let r = sampleStart; r < sampleEnd; r++) {
                const cell = String(rawRows[r]?.[c] || '').trim().toLowerCase();
                if (cell === 'ወ' || cell === 'ሴ' || cell === 'm' || cell === 'f' || cell === 'ወንድ' || cell === 'ሴት') {
                  genderMatch++;
                }
              }
              if (genderMatch >= 3) {
                genderIdx = c;
                break;
              }
            }
          }

          // Content-based fallback for ageIdx if missing
          if (ageIdx === -1) {
            const sampleStart = headerIdx + 1;
            const sampleEnd = Math.min(rawRows.length, sampleStart + 10);
            for (let c = 0; c < 8; c++) {
              if (c === nameIdx) continue;
              let ageMatch = 0;
              for (let r = sampleStart; r < sampleEnd; r++) {
                const cell = rawRows[r]?.[c];
                const p = parseChildAge(cell, parseInt(currentYear, 10) || 2018, 'auto');
                if (p.age >= 0 && p.age <= 110) {
                  ageMatch++;
                }
              }
              if (ageMatch >= 3) {
                ageIdx = c;
                break;
              }
            }
          }

          // Infer chapel from sheet name using strict mapToOfficialChapel with sheet index fallback!
          const defaultSheetChapel = mapToOfficialChapel(sheetName, sIdx);
          let sheetMemberCount = 0;

          // Parse ALL rows completely without stopping early!
          const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            let rawName = String(nameIdx !== -1 ? row[nameIdx] || '' : '').trim();

            // If name cell was empty, check if adjacent column or col 0/1 has name
            if (!rawName) {
              if (row[nameIdx + 1] && isNaN(Number(row[nameIdx + 1]))) {
                rawName = String(row[nameIdx + 1]).trim();
              } else if (row[0] && isNaN(Number(row[0]))) {
                rawName = String(row[0]).trim();
              } else if (row[1] && isNaN(Number(row[1]))) {
                rawName = String(row[1]).trim();
              }
            }

            if (!rawName) continue;

            // Skip exact header words repeated or total/summary rows
            const lowerName = rawName.toLowerCase();
            if (
              rawName === 'ተ.ቁ' ||
              rawName === 'ተ/ቁ' ||
              rawName === 'ስም' ||
              rawName === 'ሙሉ ስም' ||
              rawName === 'የአባሉ ስም' ||
              rawName === 'የአባል ስም' ||
              lowerName === 'name' ||
              lowerName === 'full name' ||
              lowerName === 'fullname' ||
              rawName === 'ድምር' ||
              rawName === 'ጠቅላላ' ||
              rawName === 'ጠቅላላ ድምር' ||
              lowerName === 'total' ||
              lowerName === 'sum' ||
              lowerName === 'grand total'
            ) {
              continue;
            }

            // If rawName is purely digits (like row number 1, 2, 3), check if next column has the name!
            if (/^\d+$/.test(rawName)) {
              if (row[nameIdx + 1] && isNaN(Number(row[nameIdx + 1]))) {
                rawName = String(row[nameIdx + 1]).trim();
              } else {
                continue; // pure row number, skip
              }
            }

            // Clean leading numbers (e.g. "1. አበበ ከበደ" -> "አበበ ከበደ")
            rawName = rawName.replace(/^\d+[\.\/\-\)\s]+\s*/, '').trim();

            // Concatenate separate father or grandfather columns
            if (fatherIdx !== -1 && row[fatherIdx]) {
              const f = String(row[fatherIdx]).trim();
              if (f && !rawName.includes(f) && isNaN(Number(f))) rawName += ` ${f}`;
            }
            if (grandfatherIdx !== -1 && row[grandfatherIdx]) {
              const gf = String(row[grandfatherIdx]).trim();
              if (gf && !rawName.includes(gf) && isNaN(Number(gf))) rawName += ` ${gf}`;
            }

            // Gender detection
            const rawGender = String(genderIdx !== -1 ? row[genderIdx] || '' : '').trim();
            const gender =
              rawGender.startsWith('ሴ') ||
              rawGender.toLowerCase().startsWith('f') ||
              rawGender.toLowerCase().includes('female') ||
              rawGender.includes('ሴት')
                ? 'ሴ'
                : 'ወ';

            // Age detection
            const rawAgeVal = ageIdx !== -1 ? row[ageIdx] : undefined;
            const parsedAge = parseChildAge(rawAgeVal, parseInt(currentYear, 10) || 2018, 'auto');
            let ageNum = parsedAge.age !== -1 ? parsedAge.age : 30;

            // Education & Occupation detection
            const edu = eduIdx !== -1 && row[eduIdx] ? String(row[eduIdx]).trim() : undefined;
            const occ = occIdx !== -1 && row[occIdx] ? String(row[occIdx]).trim() : undefined;

            // Fallback heuristics for children age if blank
            if (parsedAge.age === -1) {
              if (edu?.includes('KG') || edu?.includes('መዋዕለ') || edu?.includes('ኬጂ') || edu?.includes('ጨቅላ')) ageNum = 4;
              else if (edu?.includes('1ኛ')) ageNum = 7;
              else if (edu?.includes('2ኛ')) ageNum = 8;
              else if (edu?.includes('3ኛ')) ageNum = 9;
              else if (edu?.includes('4ኛ')) ageNum = 10;
              else if (edu?.includes('5ኛ')) ageNum = 11;
              else if (edu?.includes('6ኛ')) ageNum = 12;
              else if (edu?.includes('7ኛ')) ageNum = 13;
              else if (edu?.includes('8ኛ')) ageNum = 14;
              else if (occ?.includes('ተማሪ') && (parentIdx !== -1 || phoneIdx !== -1)) ageNum = 10;
            }

            // Chapel detection: strictly map to official 10 chapels!
            const chapelRaw = chapelIdx !== -1 && row[chapelIdx] ? String(row[chapelIdx]).trim() : defaultSheetChapel;
            const officialChapel = mapToOfficialChapel(chapelRaw, sIdx);

            // Parent extraction
            let parentName = parentIdx !== -1 && row[parentIdx] ? String(row[parentIdx]).trim() : undefined;
            if (!parentName) {
              const parts = rawName.split(' ').filter(Boolean);
              if (parts.length >= 2) parentName = parts.slice(1).join(' ');
            }

            // Phone extraction & Ethiopian number standardization
            let phone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : undefined;
            if (!phone) {
              for (let c = 0; c < row.length; c++) {
                if (c === nameIdx || c === ageIdx) continue;
                const val = String(row[c] || '').trim();
                const clean = val.replace(/[\s\-\(\)]/g, '');
                if (/^(\+?251|0)?[97]\d{8}$/.test(clean)) {
                  phone = val;
                  break;
                }
              }
            }
            if (phone) {
              let cleanDigits = phone.replace(/[\s\-\(\)]/g, '');
              if (cleanDigits.startsWith('+251')) cleanDigits = '0' + cleanDigits.substring(4);
              else if (cleanDigits.startsWith('251')) cleanDigits = '0' + cleanDigits.substring(3);
              else if (cleanDigits.length === 9 && (cleanDigits.startsWith('9') || cleanDigits.startsWith('7'))) cleanDigits = '0' + cleanDigits;
              phone = cleanDigits;
            }

            const residence = residenceIdx !== -1 && row[residenceIdx] ? String(row[residenceIdx]).trim() : undefined;

            const memberObj: ChurchMember = {
              id: generateUniqueId(),
              name: rawName,
              gender,
              age: ageNum,
              educationLevel: edu,
              occupation: occ,
              chapel: officialChapel,
              parentName,
              phone,
              residence,
              sheetName,
              registeredDate: new Date().toISOString().split('T')[0]
            };

            importedMembers.push(memberObj);
            sheetMemberCount++;

            // If child 0-14, prepare for automatic extraction to Children Registries
            if (ageNum >= 0 && ageNum <= 14) {
              autoChildrenToExtract.push({
                name: rawName,
                gender,
                age: ageNum,
                educationLevel: edu || (ageNum <= 3 ? 'ጨቅላ' : ageNum <= 6 ? 'መዋዕለ ሕፃናት' : `${ageNum - 6}ኛ ክፍል`),
                occupation: occ || (ageNum <= 3 ? 'የቤት ውስጥ' : 'ተማሪ'),
                chapel: officialChapel,
                parentName,
                phone,
                residence,
                fellowshipOrVillage: residence,
                registeredDate: new Date().toISOString().split('T')[0]
              });
            }
          }

          sheetCounts[sheetName] = sheetMemberCount;
        });

        if (importedMembers.length === 0) {
          alert('በፋይሉ ውስጥ ምንም የመንፈሳዊ ቤተሰብ አባላት መረጃ አልተገኘም!');
          return;
        }

        // Save imported members to General Church Database
        onBatchAddMembers(importedMembers, 'replace');

        // Automatically extract 0-14 children into Children Registries
        if (autoChildrenToExtract.length > 0) {
          onExtractChildrenToChildrenTab(autoChildrenToExtract, 'append');
        }

        const summaryBreakdown = Object.entries(sheetCounts)
          .map(([sh, cnt]) => `${sh}: ${cnt}`)
          .join(' | ');

        setExtractedSuccessMsg(
          `✓ ከ${workbook.SheetNames.length} ሺቶች (ከ10ሩም ቻፕሎች) የተሰበሰቡ ${importedMembers.length} አባላት ሙሉ በሙሉ ወደ ቤተክርስቲያኒቱ አጠቃላይ መረጃ ቋት ገብተዋል! [${summaryBreakdown}] በተጨማሪም ${autoChildrenToExtract.length} ልጆች (0-14 ዕድሜ) በቀጥታ ወደ የልጆች ቋት ተልከዋል።`
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
      const numAge = parseInt(String(m.age || '0'), 10) || 0;
      let ageGroup = '60+ አረጋውያን';
      if (numAge <= 14) ageGroup = 'ከ0-14 (ልጅ)';
      else if (numAge <= 29) ageGroup = 'ከ15-29 (ወጣት)';
      else if (numAge <= 59) ageGroup = 'ከ30-59 (ጎልማሳ/ወላጅ)';

      return [
        idx + 1,
        m.name,
        m.gender || '-',
        m.age || '-',
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

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormName('');
    setFormGender('ወ');
    setFormAge('30');
    setFormEducationLevel('ዲግሪ');
    setFormOccupation('የመንግሥት ሠራተኛ');
    setFormChapel(DEFAULT_CHAPELS[0]);
    setFormParent('');
    setFormPhone('');
    setFormResidence('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (m: ChurchMember) => {
    setEditingMember(m);
    setFormName(m.name);
    setFormGender(m.gender || 'ወ');
    setFormAge(String(m.age || '30'));
    setFormEducationLevel(m.educationLevel || 'ዲግሪ');
    setFormOccupation(m.occupation || 'የመንግሥት ሠራተኛ');
    setFormChapel(mapToOfficialChapel(m.chapel || ''));
    setFormParent(m.parentName || '');
    setFormPhone(m.phone || '');
    setFormResidence(m.residence || '');
    setIsAddModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('እባክዎን የአባሉን ሙሉ ስም ያስገቡ!');
      return;
    }

    const officialChapel = mapToOfficialChapel(formChapel);

    const payload: Omit<ChurchMember, 'id'> = {
      name: formName.trim(),
      gender: formGender,
      age: parseInt(formAge, 10) || 30,
      educationLevel: formEducationLevel.trim() || undefined,
      occupation: formOccupation.trim() || undefined,
      chapel: officialChapel,
      parentName: formParent.trim() || undefined,
      phone: formPhone.trim() || undefined,
      residence: formResidence.trim() || undefined,
      registeredDate: editingMember?.registeredDate || new Date().toISOString().split('T')[0]
    };

    if (editingMember) {
      onUpdateMember({
        ...payload,
        id: editingMember.id
      });
    } else {
      onAddMember(payload);
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
                <span>አጠቃላይ የመረጃ ቋት</span>
              </span>
              <span className="bg-blue-800/80 text-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {churchMembers.length.toLocaleString('am-ET')} አባላት
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን - አጠቃላይ የመረጃ ቋት
            </h2>
            <p className="text-xs sm:text-sm text-blue-200/90 mt-1 max-w-2xl">
              የ10ሩም ቻፕሎች ሙሉ የቤተሰብ መረጃ መዝገብ። እስከ 6,000+ በላይ የሚሆኑ አባላትን መረጃ ከ10ሩም ቻፕል ኤክሴል ሺቶች በአንድ ጊዜ ያነባል (በእንግሊዝኛና በአማርኛ የተጻፉ የቻፕል ስሞች በሙሉ ወደ 10ሩ ኦፊሴላዊ ቻፕሎች ብቻ ይመደባሉ)።
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              title="የ10ሩንም ቻፕል ሺቶች የያዘ ኤክሴል ፋይል ጫን (5,300+ አባላት)"
            >
              <Upload className="w-4 h-4 text-emerald-200" />
              <span>📥 ኤክሴል ጫን (የ10ሩንም ቻፕል ሺቶች)</span>
            </button>

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
              <span>የተመደቡት 10ሩ ቻፕሎች አጠቃላይ የምዕመናን መረጃ ማጠቃለያ</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              በየቻፕሉ ያሉ አባላት፣ ከ0-14 ያሉ ልጆች እና የወላጆች ስልክ መገናኛ (ከተሰጡት 10ሩ ቻፕሎች ውጪ ሌላ ተጨማሪ ቻፕል አይፈጠርም)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {chapelStats.chapels.map((ch) => {
            const st = chapelStats.statsMap[ch];
            const isSelected = selectedChapels.includes(ch) || selectedChapelFilter === ch;

            return (
              <div
                key={`master_ch_stat_${ch}`}
                onClick={() => {
                  if (selectedChapels.includes(ch)) {
                    setSelectedChapels(selectedChapels.filter((c) => c !== ch));
                  } else {
                    setSelectedChapels([...selectedChapels, ch]);
                  }
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all text-left relative ${
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
              placeholder="በስም፣ ወላጅ፣ ስልክ፣ ቻፕል ወይም ቀበሌ ፈልግ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Church className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedChapelFilter}
              onChange={(e) => {
                setSelectedChapelFilter(e.target.value);
                setSelectedChapels([]);
              }}
              className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">ሁሉም 10ሩ ቻፕሎች (አጥቢያዎች)</option>
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
            {(searchTerm || selectedChapelFilter !== 'all' || selectedChapels.length > 0 || selectedAgeCohort !== 'all' || sundaySchoolFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedChapelFilter('all');
                  setSelectedChapels([]);
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
                        <th className="py-2.5 px-4 font-extrabold text-[12pt] text-slate-900 min-w-[180px]">ሙሉ ስም</th>
                        <th className="py-2.5 px-3 text-center w-14">ጾታ</th>
                        <th className="py-2.5 px-3 text-center w-14">ዕድሜ</th>
                        <th className="py-2.5 px-3 min-w-[110px]">የትምህርት ደረጃ</th>
                        <th className="py-2.5 px-3 min-w-[110px]">የስራ ዓይነት</th>
                        <th className="py-2.5 px-3 min-w-[130px]">የወላጅ/አሳዳጊ ስም</th>
                        <th className="py-2.5 px-3 min-w-[130px]">የወላጅ/አባል ስልክ</th>
                        <th className="py-2.5 px-3 text-center w-20">እርምጃዎች</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chMembers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-slate-400 font-medium">
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
                              <td className="py-2 px-4 font-bold text-[12pt] text-slate-900 flex items-center gap-1.5">
                                <span>{m.name}</span>
                                {isChild && (
                                  <span className="bg-amber-100 text-amber-900 font-black text-[9px] px-1.5 py-0.2 rounded-full border border-amber-300">
                                    ልጅ (0-14)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-bold">{m.gender || '-'}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">{m.age ? `${m.age} ዓመት` : '-'}</td>
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
                                  <button type="button" onClick={() => handleOpenEditModal(m)} className="p-1 text-slate-600 hover:bg-slate-100 rounded" title="አስተካክል">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" onClick={() => { if (window.confirm(`"${m.name}" ይሰረዝ?`)) onDeleteMember(m.id); }} className="p-1 text-rose-500 hover:bg-rose-50 rounded" title="ሰርዝ">
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
                  <th className="py-3 px-4 font-extrabold text-[13pt] text-white min-w-[200px]">አባል/ልጅ ሙሉ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">ቻፕል (አጥቢያ)</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ጾታ</th>
                  <th className="py-3 px-3 text-center font-bold w-16">ዕድሜ</th>
                  <th className="py-3 px-3 font-bold min-w-[120px]">የትምህርት ደረጃ</th>
                  <th className="py-3 px-3 font-bold min-w-[110px]">የስራ ዓይነት</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">የሰንበት ት/ቤት ሁኔታ</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ/የቤተሰብ መሪ ስም</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">የወላጅ/አባል ስልክ ቁጥር</th>
                  <th className="py-3 px-3 text-center font-bold w-24">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
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
                        <td className="py-2.5 px-4 font-bold text-[13pt] text-slate-900 flex items-center gap-2">
                          <span>{m.name}</span>
                          {isChild && (
                            <span className="bg-amber-100 text-amber-900 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-300">
                              ልጅ (0-14)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-900">{m.chapel || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{m.gender || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums">{m.age ? `${m.age} ዓመት` : '-'}</td>
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-900" />
                <span>{editingMember ? 'የአባል መረጃ ማስተካከያ' : 'አዲስ አባል መመዝገቢያ'}</span>
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3.5 mt-4">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ቻፕል (አጥቢያ) *</label>
                <select
                  value={formChapel}
                  onChange={(e) => setFormChapel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                >
                  {DEFAULT_CHAPELS.map((ch) => (
                    <option key={`m_ch_${ch}`} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
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
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-md cursor-pointer"
                >
                  መዝግብ
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
        title="አጠቃላይ የቤተክርስቲያን መዝገብ እና የሰንበት ትምህርት ቤት የስም ማስተያያ ሰንጠረዥ"
        sourceLabel="የቤተክርስቲያን አጠቃላይ መዝገብ (5,300+ አባላት)"
        churchItems={churchMembers}
        studentsByClass={studentsByClass}
        classList={classList}
        chapelList={DEFAULT_CHAPELS}
      />
    </div>
  );
};
