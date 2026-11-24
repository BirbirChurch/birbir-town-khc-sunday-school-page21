import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Briefcase,
  Package,
  Boxes,
  Plus,
  Search,
  Download,
  Printer,
  Edit2,
  Trash2,
  X,
  Phone,
  RefreshCw,
  CheckCircle2,
  Layers,
  UserCheck,
  Calculator,
  Camera,
  Upload,
  User,
  Award
} from 'lucide-react';
import {
  AnnualPlanItem,
  AssetType,
  ChapelPerformanceAgreementData,
  ChurchAssetRecord,
  ChurchChild,
  ChurchHRRecord,
  ChurchMember,
  HRCategory
} from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { useLanguage } from '../context/LanguageContext';
import { formatDualDateText } from '../utils/ethiopianDate';
import { DualDateBadge, DualDateInput } from './DualDate';
import {
  HR_ADMIN_ROLE_OPTIONS,
  HR_CHAPEL_ROLE_OPTIONS,
  HR_MINISTER_ROLE_OPTIONS,
  HR_MINISTER_SECTOR_OPTIONS,
  HR_UNASSIGNED_ROLE_PLACEHOLDER
} from '../constants/churchStructure';
import { matchesAmharicSearch } from '../utils/amharicSearchAndChapel';
import {
  findMatchingChurchMemberForHR,
  getHRDepartments,
  getHRRoleTitles,
  resolveServantChurchFamily,
  ServantChurchFamilyResolution,
  syncHRPhonesFromChurchMembers
} from '../utils/hrMemberMatcher';
import {
  computeServiceDuration,
  HR_MARITAL_STATUS_OPTIONS,
  resolveHighestEducationLabel
} from '../utils/hrProfileAndPayroll';
import { MinisterProfileModal } from './MinisterProfileModal';
import { deleteAttachmentFile, saveAttachmentFile } from '../services/attachmentStorage';
import { processProfilePhotoFile } from '../utils/hrPhotoHelper';
import {
  computeChapelAgreementSummary,
  ensureChapelAgreementData,
  getLinkedChapelsForHRRecord
} from '../utils/chapelPerformanceAgreement';
import { ExportPhotoButton } from './ExportPhotoButton';
import { PersonAvatarBadge } from './PersonAvatarBadge';

interface AdminHRPanelProps {
  currentYear: string;
  records: ChurchHRRecord[];
  churchMembers?: ChurchMember[];
  churchChildren?: ChurchChild[];
  onUpdateChurchMember?: (member: ChurchMember) => void;
  onUpdateChurchChild?: (child: ChurchChild) => void;
  chapelList?: string[];
  chapelPlansMap?: { [chapelName: string]: AnnualPlanItem[] };
  chapelPerformanceAgreements?: {
    [chapelName: string]: { [year: string]: ChapelPerformanceAgreementData };
  };
  onOpenChapelAgreements?: () => void;
  onSaveRecords: (updated: ChurchHRRecord[]) => void;
  onOpenPayroll?: () => void;
}

export const AdminHRPanel: React.FC<AdminHRPanelProps> = ({
  currentYear,
  records,
  churchMembers = [],
  churchChildren = [],
  onUpdateChurchMember,
  onUpdateChurchChild,
  chapelList,
  chapelPlansMap,
  chapelPerformanceAgreements,
  onOpenChapelAgreements,
  onSaveRecords,
  onOpenPayroll
}) => {
  const { t, lang } = useLanguage();
  const hrKpiRef = useRef<HTMLDivElement | null>(null);
  const hrTableRef = useRef<HTMLElement | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | HRCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [profileModalRecordId, setProfileModalRecordId] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hCategory, setHCategory] = useState<HRCategory>('full_time_minister');
  const [hName, setHName] = useState('');
  const [hGender, setHGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [hRoles, setHRoles] = useState<string[]>([]);
  const [hCustomRole, setHCustomRole] = useState('');
  const [hDepts, setHDepts] = useState<string[]>([]);
  const [hCustomDept, setHCustomDept] = useState('');
  const [hPhone, setHPhone] = useState('');
  const [hHireDate, setHHireDate] = useState('');
  const [hStartingSalary, setHStartingSalary] = useState('');
  const [hSalary, setHSalary] = useState('');
  const [hPensionStartDate, setHPensionStartDate] = useState('');
  const [hBankName, setHBankName] = useState('');
  const [hBankAccount, setHBankAccount] = useState('');
  const [hServiceYears, setHServiceYears] = useState('');
  const [hMaritalStatus, setHMaritalStatus] = useState('ያላገባ/ች');
  const [hSpouseName, setHSpouseName] = useState('');
  const [hEducation, setHEducation] = useState('');
  const [hStatus, setHStatus] = useState('በስራ ላይ');
  const [hNotes, setHNotes] = useState('');
  const [hPhotoDataUrl, setHPhotoDataUrl] = useState<string | undefined>(undefined);
  const [hPhotoStorageKey, setHPhotoStorageKey] = useState<string | undefined>(undefined);
  const [hPhotoPendingFullDataUrl, setHPhotoPendingFullDataUrl] = useState<string | undefined>(undefined);
  const [hPhotoName, setHPhotoName] = useState<string | undefined>(undefined);
  const [hPhotoUpdatedAt, setHPhotoUpdatedAt] = useState<string | undefined>(undefined);
  const [hPhotoError, setHPhotoError] = useState('');
  const [hPhotoBusy, setHPhotoBusy] = useState(false);

  // Resolve live phone match from Church Master Registry if a record doesn't yet have a saved phone
  const resolvedPhoneById = useMemo(() => {
    const map = new Map<number, { phone?: string; fromMaster: boolean }>();
    records.forEach((rec) => {
      const saved = String(rec.phone || '').trim();
      if (saved) {
        map.set(rec.id, { phone: saved, fromMaster: false });
      } else {
        const match = findMatchingChurchMemberForHR(rec.name, churchMembers);
        map.set(rec.id, { phone: match.phone, fromMaster: Boolean(match.phone) });
      }
    });
    return map;
  }, [records, churchMembers]);

  const familyById = useMemo(() => {
    const map = new Map<number, ServantChurchFamilyResolution>();
    records.forEach((rec) => {
      map.set(rec.id, resolveServantChurchFamily(rec, churchMembers, churchChildren));
    });
    return map;
  }, [records, churchMembers, churchChildren]);

  const pendingPhoneSyncCount = useMemo(() => {
    let count = 0;
    records.forEach((rec) => {
      const saved = String(rec.phone || '').trim();
      if (!saved && resolvedPhoneById.get(rec.id)?.phone) {
        count += 1;
      }
    });
    return count;
  }, [records, resolvedPhoneById]);

  const stats = useMemo(() => {
    const fullTime = records.filter((r) => r.category === 'full_time_minister');
    const adminStaff = records.filter((r) => r.category === 'admin_staff');
    const male = records.filter((r) => r.gender === 'ወ' || String(r.gender).includes('ወንድ')).length;
    const female = records.filter((r) => r.gender === 'ሴ' || String(r.gender).includes('ሴት')).length;
    const totalSalary = records.reduce((s, r) => s + (Number(r.monthlySalary) || 0), 0);
    const withPhone = records.filter((r) => Boolean(resolvedPhoneById.get(r.id)?.phone)).length;
    const multiSectorMinisters = fullTime.filter((r) => getHRDepartments(r).length >= 2).length;
    return {
      total: records.length,
      fullTimeCount: fullTime.length,
      adminStaffCount: adminStaff.length,
      male,
      female,
      totalSalary,
      withPhone,
      multiSectorMinisters
    };
  }, [records, resolvedPhoneById]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      const rolesText = getHRRoleTitles(r, HR_UNASSIGNED_ROLE_PLACEHOLDER).join(' ');
      const deptsText = getHRDepartments(r).join(' ');
      const resolvedPhone = resolvedPhoneById.get(r.id)?.phone || r.phone || '';
      return matchesAmharicSearch(searchQuery, r.name, rolesText, deptsText, resolvedPhone, r.status);
    });
  }, [records, categoryFilter, searchQuery, resolvedPhoneById]);

  const handleSyncPhonesFromMaster = () => {
    if (churchMembers.length === 0) {
      setSyncMessage(
        t(
          'በቤተክርስቲያን መረጃ ቋት ውስጥ የተመዘገበ አባል ስለሌለ ስልክ ማምጣት አልተቻለም።',
          'No church members found in the master registry to sync phone numbers.'
        )
      );
      return;
    }
    const { updated, matchedCount, changed } = syncHRPhonesFromChurchMembers(records, churchMembers);
    if (changed) {
      onSaveRecords(updated);
      setSyncMessage(
        t(
          `ከቤተክርስቲያን መረጃ ቋት የ${matchedCount} ሰዎች ስልክ ቁጥር በተሳካ ሁኔታ ተሞልቷል።`,
          `Successfully populated ${matchedCount} phone number(s) from the Church Master Registry.`
        )
      );
    } else {
      setSyncMessage(
        t(
          'አዲስ ከመረጃ ቋት የሚገባ ባዶ ስልክ አልተገኘም።',
          'No additional blank phone numbers matched in the master registry.'
        )
      );
    }
  };

  // Inline quick helpers so admins can assign 1, 2, or more sectors/roles directly in the table
  const handleAddDepartmentInline = (recId: number, sector: string) => {
    const clean = sector.trim();
    if (!clean) return;
    const next = records.map((r) => {
      if (r.id !== recId) return r;
      const current = getHRDepartments(r);
      if (current.includes(clean)) return r;
      const updatedDepts = [...current, clean];
      return {
        ...r,
        departments: updatedDepts,
        department: updatedDepts.join(' / ')
      };
    });
    onSaveRecords(next);
  };

  const handleRemoveDepartmentInline = (recId: number, sector: string) => {
    const next = records.map((r) => {
      if (r.id !== recId) return r;
      const updatedDepts = getHRDepartments(r).filter((d) => d !== sector);
      return {
        ...r,
        departments: updatedDepts,
        department: updatedDepts.join(' / ') || undefined
      };
    });
    onSaveRecords(next);
  };

  const handleAddRoleInline = (recId: number, role: string) => {
    const clean = role.trim();
    if (!clean) return;
    const next = records.map((r) => {
      if (r.id !== recId) return r;
      const current = getHRRoleTitles(r, HR_UNASSIGNED_ROLE_PLACEHOLDER);
      if (current.includes(clean)) return r;
      const updatedRoles = [...current, clean];
      return {
        ...r,
        roleTitles: updatedRoles,
        roleTitle: updatedRoles.join(' / ')
      };
    });
    onSaveRecords(next);
  };

  const handleRemoveRoleInline = (recId: number, role: string) => {
    const next = records.map((r) => {
      if (r.id !== recId) return r;
      const updatedRoles = getHRRoleTitles(r, HR_UNASSIGNED_ROLE_PLACEHOLDER).filter((x) => x !== role);
      return {
        ...r,
        roleTitles: updatedRoles,
        roleTitle: updatedRoles.join(' / ') || HR_UNASSIGNED_ROLE_PLACEHOLDER
      };
    });
    onSaveRecords(next);
  };

  const openAdd = (defaultCat: HRCategory = 'full_time_minister') => {
    const chosenCat = categoryFilter === 'all' ? defaultCat : categoryFilter;
    setEditingId(null);
    setHCategory(chosenCat);
    setHName('');
    setHGender('ወ');
    setHRoles([]);
    setHCustomRole('');
    setHDepts(chosenCat === 'admin_staff' ? ['አስተዳደርና ፋይናንስ'] : []);
    setHCustomDept('');
    setHPhone('');
    setHHireDate(new Date().toISOString().split('T')[0]);
    setHStartingSalary('');
    setHSalary('');
    setHPensionStartDate('');
    setHBankName('');
    setHBankAccount('');
    setHServiceYears('');
    setHMaritalStatus('ያላገባ/ች');
    setHSpouseName('');
    setHEducation('');
    setHStatus('በስራ ላይ');
    setHNotes('');
    setHPhotoDataUrl(undefined);
    setHPhotoStorageKey(undefined);
    setHPhotoPendingFullDataUrl(undefined);
    setHPhotoName(undefined);
    setHPhotoUpdatedAt(undefined);
    setHPhotoError('');
    setIsModalOpen(true);
  };

  const openEdit = (rec: ChurchHRRecord) => {
    setEditingId(rec.id);
    setHCategory(rec.category);
    setHName(rec.name);
    setHGender(rec.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setHRoles(getHRRoleTitles(rec, HR_UNASSIGNED_ROLE_PLACEHOLDER));
    setHCustomRole('');
    setHDepts(getHRDepartments(rec));
    setHCustomDept('');
    const resolved = resolvedPhoneById.get(rec.id)?.phone || rec.phone || '';
    setHPhone(resolved);
    setHHireDate(rec.hireDate || '');
    setHStartingSalary(rec.startingSalary !== undefined ? String(rec.startingSalary) : '');
    setHSalary(rec.monthlySalary !== undefined ? String(rec.monthlySalary) : '');
    setHPensionStartDate(rec.pensionStartDate || '');
    setHBankName(rec.bankName || '');
    setHBankAccount(rec.bankAccountNumber || '');
    setHServiceYears(rec.serviceYears || '');
    setHMaritalStatus(rec.maritalStatus || 'ያላገባ/ች');
    setHSpouseName(rec.spouseName || '');
    setHEducation(rec.educationLevel || '');
    setHStatus(rec.status || 'በስራ ላይ');
    setHNotes(rec.notes || '');
    setHPhotoDataUrl(rec.photoDataUrl);
    setHPhotoStorageKey(rec.photoStorageKey);
    setHPhotoPendingFullDataUrl(undefined);
    setHPhotoName(rec.photoName);
    setHPhotoUpdatedAt(rec.photoUpdatedAt);
    setHPhotoError('');
    setIsModalOpen(true);
  };

  const toggleRoleInModal = (role: string) => {
    setHRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    );
  };

  const addCustomRoleInModal = () => {
    const clean = hCustomRole.trim();
    if (!clean) return;
    setHRoles((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setHCustomRole('');
  };

  const toggleDeptInModal = (dept: string) => {
    setHDepts((prev) =>
      prev.includes(dept) ? prev.filter((item) => item !== dept) : [...prev, dept]
    );
  };

  const addCustomDeptInModal = () => {
    const clean = hCustomDept.trim();
    if (!clean) return;
    setHDepts((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setHCustomDept('');
  };

  const handleLookupModalPhone = () => {
    if (!hName.trim()) return;
    const match = findMatchingChurchMemberForHR(hName.trim(), churchMembers);
    if (match.phone) {
      setHPhone(match.phone);
    }
  };

  const handleModalPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setHPhotoError('');
    setHPhotoBusy(true);
    try {
      const result = await processProfilePhotoFile(file);
      if (result.ok === false) {
        if (result.reason === 'invalid_type') {
          setHPhotoError(
            t('እባክዎ ትክክለኛ የፎቶ ፋይል (JPG, PNG, WEBP) ይምረጡ።', 'Please select a valid image (JPG, PNG, WEBP).')
          );
        } else if (result.reason === 'too_large') {
          setHPhotoError(
            t('የፎቶው መጠን ከ12MB መብለጥ የለበትም።', 'Photo size must be 12MB or smaller.')
          );
        } else {
          setHPhotoError(t('ፎቶውን ማንበብ አልተቻለም።', 'Unable to read photo.'));
        }
        return;
      }
      setHPhotoDataUrl(result.data.thumbnailDataUrl);
      setHPhotoPendingFullDataUrl(result.data.fullDataUrl);
      setHPhotoName(result.data.fileName);
      setHPhotoUpdatedAt(new Date().toISOString());
    } finally {
      setHPhotoBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hName.trim()) return;
    const combinedRoles = hCustomRole.trim()
      ? Array.from(new Set([...hRoles, hCustomRole.trim()]))
      : hRoles;
    const combinedDepts = hCustomDept.trim()
      ? Array.from(new Set([...hDepts, hCustomDept.trim()]))
      : hDepts;

    let finalPhone = hPhone.trim();
    if (!finalPhone) {
      finalPhone = findMatchingChurchMemberForHR(hName.trim(), churchMembers).phone || '';
    }

    const existingRec = editingId ? records.find((r) => r.id === editingId) : undefined;
    const targetId = editingId ?? generateUniqueId();

    let resolvedPhotoKey = hPhotoStorageKey;
    if (hPhotoPendingFullDataUrl && hPhotoName) {
      const prevKey = existingRec?.photoStorageKey;
      resolvedPhotoKey = `hr_photo_${targetId}_${Date.now()}`;
      await saveAttachmentFile(resolvedPhotoKey, hPhotoName, hPhotoPendingFullDataUrl);
      if (prevKey && prevKey !== resolvedPhotoKey) {
        void deleteAttachmentFile(prevKey);
      }
    } else if (!hPhotoDataUrl && existingRec?.photoStorageKey) {
      void deleteAttachmentFile(existingRec.photoStorageKey);
      resolvedPhotoKey = undefined;
    }

    const item: ChurchHRRecord = {
      ...(existingRec || {}),
      id: targetId,
      category: hCategory,
      name: hName.trim(),
      gender: hGender,
      roleTitle: combinedRoles.join(' / ') || HR_UNASSIGNED_ROLE_PLACEHOLDER,
      roleTitles: combinedRoles,
      department: combinedDepts.join(' / ') || undefined,
      departments: combinedDepts,
      phone: finalPhone || undefined,
      hireDate: hHireDate.trim() || undefined,
      startingSalary: hStartingSalary.trim() ? Number(hStartingSalary) || 0 : undefined,
      monthlySalary: hSalary.trim() ? Number(hSalary) || 0 : undefined,
      pensionStartDate: hPensionStartDate.trim() || undefined,
      bankName: hBankName.trim() || undefined,
      bankAccountNumber: hBankAccount.trim() || undefined,
      serviceYears: hServiceYears.trim() || undefined,
      maritalStatus: hMaritalStatus.trim() || undefined,
      spouseName: hSpouseName.trim() || undefined,
      educationLevel: hEducation.trim() || undefined,
      photoDataUrl: hPhotoDataUrl,
      photoStorageKey: resolvedPhotoKey,
      photoName: hPhotoDataUrl ? hPhotoName : undefined,
      photoUpdatedAt: hPhotoDataUrl ? hPhotoUpdatedAt : undefined,
      status: hStatus,
      notes: hNotes.trim() || undefined
    };

    const next = editingId
      ? records.map((r) => (r.id === editingId ? item : r))
      : [item, ...records];
    onSaveRecords(next);
    setIsModalOpen(false);
  };

  const handleDeleteConfirmed = (id: number) => {
    const target = records.find((r) => r.id === id);
    if (target?.photoStorageKey) {
      void deleteAttachmentFile(target.photoStorageKey);
    }
    onSaveRecords(records.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const toRows = (list: ChurchHRRecord[], title: string) => [
      [title],
      [],
      [
        'ተ.ቁ',
        'ምድብ',
        'ሙሉ ስም',
        'ጾታ',
        'የስራ/አገልግሎት ኃላፍነት',
        'ዘርፍ / ክፍል',
        'የትምህርት ደረጃ',
        'የትምህርት ማስረጃዎች ብዛት',
        'ስልክ',
        'የቅጥር ዘመን',
        'የአገልግሎት ዘመን',
        'የመጀመሪያ ደሞዝ',
        'የአሁን ወርሃዊ ደመወዝ (ብር)',
        'ጡሬታ የተጀመረበት ጊዜ',
        'የባንክ አካውንት ቁጥር',
        'የጋብቻ ሁኔታ',
        'የትዳር ጓደኛ',
        'የልጆች ብዛት',
        'ሁኔታ'
      ],
      ...list.map((r, i) => {
        const roles = getHRRoleTitles(r, HR_UNASSIGNED_ROLE_PLACEHOLDER);
        const depts = getHRDepartments(r);
        const resolvedPhone = resolvedPhoneById.get(r.id)?.phone || r.phone || '-';
        return [
          i + 1,
          r.category === 'full_time_minister' ? 'የሙሉ ጊዜ አገልጋይ' : 'የአስተዳደር ሠራተኛ',
          r.name,
          r.gender,
          roles.length > 0 ? roles.join(' / ') : '-',
          depts.length > 0 ? depts.join(' / ') : '-',
          resolveHighestEducationLabel(r) || '-',
          r.educationCredentials?.length || 0,
          resolvedPhone,
          formatDualDateText(r.hireDate, '-'),
          computeServiceDuration(r.hireDate, r.serviceYears, lang) || '-',
          r.startingSalary ?? '-',
          r.monthlySalary ?? '-',
          formatDualDateText(r.pensionStartDate, '-'),
          r.bankAccountNumber || '-',
          r.maritalStatus || '-',
          r.spouseName || '-',
          r.children?.length || 0,
          r.status
        ];
      })
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(records.filter((r) => r.category === 'full_time_minister'), `የሙሉ ጊዜ አገልጋዮች (${currentYear})`)),
      'የሙሉ_ጊዜ_አገልጋዮች'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(records.filter((r) => r.category === 'admin_staff'), `የአስተዳደር ሰራተኞች (${currentYear})`)),
      'የአስተዳደር_ሰራተኞች'
    );
    XLSX.writeFile(wb, `የቤተክርስቲያን_የሰው_ኃይል_${currentYear}.xlsx`);
  };

  const chapelRoleOptions = useMemo(
    () => (chapelList && chapelList.length > 0 ? chapelList : HR_CHAPEL_ROLE_OPTIONS),
    [chapelList]
  );

  const sectorOptionsWithChapels = useMemo(
    () => Array.from(new Set([...HR_MINISTER_SECTOR_OPTIONS, ...chapelRoleOptions])),
    [chapelRoleOptions]
  );

  const roleChoicesForCategory =
    hCategory === 'full_time_minister' ? HR_MINISTER_ROLE_OPTIONS : HR_ADMIN_ROLE_OPTIONS;

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-700 shrink-0" />
              <span>{t('የቤተክርስቲያኒቱ የሰው ኃይል መዝገብ', 'Church Human Resources Registry')}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {t(
                'የሙሉ ጊዜ አገልጋዮች (አንድ አገልጋይ 2 እና ከዚያ በላይ ዘርፎች ሊኖረው ይችላል) እና የአስተዳደር ሰራተኞች ከስራ ኃላፍነት ምርጫ እና ከመረጃ ቋት ስልክ ማገናኛ ጋር።',
                'Manage Full-Time Ministers (multi-sector responsibilities supported) and Administrative Staff with role choices and master phone sync.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {onOpenPayroll && (
              <button
                type="button"
                onClick={onOpenPayroll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{t('የደመወዝ ፔሮል ክፈት →', 'Open Payroll →')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSyncPhonesFromMaster}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('ከመረጃ ቋት ስልክ አስገባ', 'Sync Phones from Registry')}</span>
              {pendingPhoneSyncCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-sky-700 text-white text-[10px] font-extrabold tabular-nums">
                  {pendingPhoneSyncCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
            <button
              type="button"
              onClick={() => openAdd('full_time_minister')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-800 hover:bg-teal-700 text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('አዲስ አገልጋይ / ሠራተኛ ጨምር', 'Add Personnel')}</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-bold flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0" />
              <span>{syncMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setSyncMessage(null)}
              className="text-sky-600 hover:text-sky-900 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div ref={hrKpiRef} className="mt-5 pt-4 border-t border-slate-200 space-y-2.5 bg-white rounded-xl">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-extrabold text-slate-700">
              {t(`የሰው ኃይል ዋና አሃዞች (${currentYear} ዓ/ም)`, `HR Workforce Summary (${currentYear})`)}
            </h4>
            <ExportPhotoButton
              targetRef={hrKpiRef}
              fileName={`የሰው_ኃይል_ዋና_አሃዞች_${currentYear}`}
              labelAm="በፎቶ (PNG)"
              labelEn="Photo (PNG)"
              variant="secondary"
              compact
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ጠቅላላ የሰው ኃይል', 'Total Workforce')}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.total}</div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {t('ወንድ', 'Male')} {stats.male} · {t('ሴት', 'Female')} {stats.female}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('የሙሉ ጊዜ አገልጋዮች', 'Full-Time Ministers')}</div>
            <div className="text-xl font-extrabold text-teal-800 tabular-nums mt-1">{stats.fullTimeCount}</div>
            <div className="text-[11px] font-semibold text-teal-700 tabular-nums">
              {t('2+ ዘርፍ ያላቸው', '2+ Sectors')}: {stats.multiSectorMinisters}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('የአስተዳደር ሰራተኞች', 'Administrative Staff')}</div>
            <div className="text-xl font-extrabold text-indigo-800 tabular-nums mt-1">{stats.adminStaffCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {t('ስልክ የተገኘላቸው', 'Phones Linked')}: {stats.withPhone}/{stats.total}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ጠቅላላ ወርሃዊ ደመወዝ', 'Monthly Payroll Total')}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {stats.totalSalary.toLocaleString()} <span className="text-xs font-bold text-slate-500">{t('ብር', 'ETB')}</span>
            </div>
          </div>
          </div>
        </div>
      </section>

      <section ref={hrTableRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
            {t(`የሰው ኃይል ዝርዝር ሰንጠረዥ (${filtered.length})`, `Human Resources Directory (${filtered.length})`)}
          </h4>
          <ExportPhotoButton
            targetRef={hrTableRef}
            fileName={`የሰው_ኃይል_ዝርዝር_ሰንጠረዥ_${currentYear}`}
            labelAm="በፎቶ (PNG)"
            labelEn="Photo (PNG)"
            variant="secondary"
            compact
          />
        </div>
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('ሁሉም', 'All')} ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('full_time_minister')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'full_time_minister' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('የሙሉ ጊዜ አገልጋዮች', 'Full-Time Ministers')} ({stats.fullTimeCount})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('admin_staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'admin_staff' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('የአስተዳደር ሰራተኞች', 'Admin Staff')} ({stats.adminStaffCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ስም፣ ዘርፍ፣ ኃላፍነት ወይም ስልክ ፈልግ...', 'Search name, sector, role, phone...')}
              className="w-full pl-8 pr-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3 text-left w-10">#</th>
                <th className="py-2.5 px-3 text-left">{t('ምድብ', 'Category')}</th>
                <th className="py-2.5 px-3 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                <th className="py-2.5 px-2 text-left">{t('ጾታ', 'Sex')}</th>
                <th className="py-2.5 px-3 text-left">{t('የስራ / የአገልግሎት ኃላፍነት', 'Role / Responsibility')}</th>
                <th className="py-2.5 px-3 text-left">{t('የተመደቡበት ዘርፍ / ክፍል (2+ ይቻላል)', 'Assigned Sector(s) (Multi)')}</th>
                <th className="py-2.5 px-3 text-left">{t('ስልክ', 'Phone')}</th>
                <th className="py-2.5 px-3 text-right">{t('ደመወዝ', 'Salary')}</th>
                <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Status')}</th>
                <th className="py-2.5 px-3 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500">
                    <p className="font-semibold">
                      {t('ምንም የሰው ኃይል መዝገብ አልተገኘም።', 'No matching human resource records found.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => openAdd('full_time_minister')}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-800 text-white hover:bg-teal-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('አዲስ መዝገብ ጨምር', 'Add Record')}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => {
                  const roles = getHRRoleTitles(r, HR_UNASSIGNED_ROLE_PLACEHOLDER);
                  const depts = getHRDepartments(r);
                  const phoneInfo = resolvedPhoneById.get(r.id);
                  const fam = familyById.get(r.id);
                  const linkedFamilyTotal = (fam?.familyMembers.length || 0) + (fam?.familyChildren.length || 0);
                  const roleDropdownChoices =
                    r.category === 'full_time_minister'
                      ? [...HR_MINISTER_ROLE_OPTIONS, ...chapelRoleOptions]
                      : HR_ADMIN_ROLE_OPTIONS;
                  const availableRoles = roleDropdownChoices.filter((opt) => !roles.includes(opt));
                  const availableStandardRoles = HR_MINISTER_ROLE_OPTIONS.filter((opt) => !roles.includes(opt));
                  const availableChapelRoles = chapelRoleOptions.filter((opt) => !roles.includes(opt));
                  const availableDepts = sectorOptionsWithChapels.filter((opt) => !depts.includes(opt));

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-2.5 px-3 tabular-nums text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] ${
                            r.category === 'full_time_minister'
                              ? 'bg-teal-50 text-teal-900 border border-teal-200'
                              : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                          }`}
                        >
                          {r.category === 'full_time_minister'
                            ? t('የሙሉ ጊዜ አገልጋይ', 'Full-Time Minister')
                            : t('የአስተዳደር ሠራተኛ', 'Admin Staff')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        <div className="flex items-start gap-2.5">
                          <PersonAvatarBadge
                            name={r.name}
                            gender={r.gender}
                            photoDataUrl={r.photoDataUrl}
                            photoStorageKey={r.photoStorageKey}
                            fallbackPhotoDataUrl={fam?.selfMember?.photoDataUrl}
                            fallbackPhotoStorageKey={fam?.selfMember?.photoStorageKey}
                            size="md"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setProfileModalRecordId(r.id)}
                              className="text-left hover:text-teal-800 hover:underline cursor-pointer font-extrabold"
                            >
                              {r.name}
                            </button>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-normal text-slate-500 mt-0.5">
                              {r.hireDate && <DualDateBadge value={r.hireDate} mode="inline" />}
                              {computeServiceDuration(r.hireDate, r.serviceYears, lang) && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                                  {computeServiceDuration(r.hireDate, r.serviceYears, lang)}
                                </span>
                              )}
                              {(r.educationCredentials?.length || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold">
                                  {t('ማስረጃ', 'Creds')}: {r.educationCredentials?.length}
                                </span>
                              )}
                              {(r.children?.length || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 font-bold">
                                  {t('ልጆች', 'Kids')}: {r.children?.length}
                                </span>
                              )}
                              {linkedFamilyTotal > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setProfileModalRecordId(r.id)}
                                  className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 font-bold hover:bg-teal-100 cursor-pointer"
                                  title={t('ከቤተክርስቲያን መረጃ ቋት የተያያዙ ቤተሰቦች', 'Linked family members from Church DB')}
                                >
                                  {t(`ከቋት ቤተሰብ: ${linkedFamilyTotal}`, `DB Family: ${linkedFamilyTotal}`)}
                                </button>
                              )}
                              {(() => {
                                const linkedChapels = getLinkedChapelsForHRRecord(
                                  r,
                                  chapelList || HR_CHAPEL_ROLE_OPTIONS,
                                  chapelPerformanceAgreements,
                                  currentYear
                                );
                                if (linkedChapels.length === 0) return null;
                                return linkedChapels.map((ch) => {
                                  const agData = ensureChapelAgreementData(
                                    chapelPerformanceAgreements?.[ch]?.[currentYear],
                                    ch,
                                    currentYear,
                                    records
                                  );
                                  const agSum = computeChapelAgreementSummary(
                                    agData,
                                    chapelPlansMap?.[ch]
                                  );
                                  return (
                                    <button
                                      key={ch}
                                      type="button"
                                      onClick={() => onOpenChapelAgreements?.()}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold hover:bg-amber-100 cursor-pointer"
                                      title={t('የ2019 ግብ ስምምነት እና አፈጻጸም ክፈት', 'Open 2019 Performance Agreement')}
                                    >
                                      <Award className="w-2.5 h-2.5 text-amber-700" />
                                      <span>
                                        {ch} · {t('ግብ ስምምነት', 'Agreement')}: {agSum.annualAvgPct}%
                                      </span>
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-700 font-semibold">{r.gender}</td>
                      <td className="py-2.5 px-3 min-w-[180px]">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {roles.length === 0 ? (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              {t('ኃላፍነት አልተመረጠም', 'Unassigned')}
                            </span>
                          ) : (
                            roles.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200"
                              >
                                <span>{role}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRoleInline(r.id, role)}
                                  className="text-slate-400 hover:text-rose-600 cursor-pointer print:hidden"
                                  title={t('አስወግድ', 'Remove')}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                        {availableRoles.length > 0 && (
                          <select
                            aria-label={`${r.name} role selector`}
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleAddRoleInline(r.id, e.target.value);
                            }}
                            className="w-full max-w-[200px] px-2 py-1 text-[11px] font-semibold border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer print:hidden"
                          >
                            <option value="">
                              {roles.length === 0
                                ? `+ ${t('የስራ ኃላፍነት ይምረጡ...', 'Select role...')}`
                                : `+ ${t('ተጨማሪ ኃላፍነት...', 'Add role...')}`}
                            </option>
                            {r.category === 'full_time_minister' ? (
                              <>
                                {availableStandardRoles.length > 0 && (
                                  <optgroup label={t('የአገልግሎት መደብ', 'Ministerial Roles')}>
                                    {availableStandardRoles.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {availableChapelRoles.length > 0 && (
                                  <optgroup label={t('10ሩ ቻፕሎች (የቻፕል ኃላፍነት)', '10 Chapels')}>
                                    {availableChapelRoles.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </>
                            ) : (
                              availableRoles.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))
                            )}
                          </select>
                        )}
                      </td>
                      <td className="py-2.5 px-3 min-w-[220px]">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {depts.length === 0 ? (
                            <span className="text-[11px] text-slate-400">—</span>
                          ) : (
                            depts.map((dept) => (
                              <span
                                key={dept}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-200"
                              >
                                <span>{dept}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDepartmentInline(r.id, dept)}
                                  className="text-teal-500 hover:text-rose-600 cursor-pointer print:hidden"
                                  title={t('አስወግድ', 'Remove')}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                        {availableDepts.length > 0 && (
                          <select
                            aria-label={`${r.name} sector selector`}
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleAddDepartmentInline(r.id, e.target.value);
                            }}
                            className="w-full max-w-[220px] px-2 py-1 text-[11px] font-semibold border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer print:hidden"
                          >
                            <option value="">
                              {depts.length === 0
                                ? `+ ${t('ዘርፍ ይምረጡ...', 'Assign sector...')}`
                                : `+ ${t('2ኛ/ተጨማሪ ዘርፍ ጨምር...', 'Add another sector...')}`}
                            </option>
                            {availableDepts.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {phoneInfo?.phone ? (
                          <div>
                            <span>{phoneInfo.phone}</span>
                            {phoneInfo.fromMaster && (
                              <span className="block text-[10px] font-sans font-bold text-sky-700">
                                {t('ከመረጃ ቋት', 'From Registry')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900">
                        {r.monthlySalary !== undefined ? `${Number(r.monthlySalary).toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">{r.status}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                        {confirmDeleteId === r.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteConfirmed(r.id)}
                              className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer"
                            >
                              {t('አዎ ሰርዝ', 'Confirm')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-lg cursor-pointer"
                            >
                              {t('ተው', 'No')}
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setProfileModalRecordId(r.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-lg cursor-pointer"
                              title={t('ሙሉ ፕሮፋይል ክፈት', 'Open Full Profile')}
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>{t('ፕሮፋይል', 'Profile')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title={t('አስተካክል', 'Edit')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(r.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title={t('ሰርዝ', 'Delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (iPhone / Android Phones) */}
        <div className="md:hidden divide-y divide-slate-200">
          {filtered.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500">
              <p className="text-sm font-semibold">
                {t('ምንም የሰው ኃይል መዝገብ አልተገኘም።', 'No matching human resource records found.')}
              </p>
              <button
                type="button"
                onClick={() => openAdd('full_time_minister')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-800 text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('አዲስ መዝገብ ጨምር', 'Add Record')}</span>
              </button>
            </div>
          ) : (
            filtered.map((r, idx) => {
              const roles = getHRRoleTitles(r, HR_UNASSIGNED_ROLE_PLACEHOLDER);
              const depts = getHRDepartments(r);
              const phoneInfo = resolvedPhoneById.get(r.id);
              const fam = familyById.get(r.id);
              const linkedFamilyTotal = (fam?.familyMembers.length || 0) + (fam?.familyChildren.length || 0);
              const roleDropdownChoices =
                r.category === 'full_time_minister'
                  ? [...HR_MINISTER_ROLE_OPTIONS, ...chapelRoleOptions]
                  : HR_ADMIN_ROLE_OPTIONS;
              const availableRoles = roleDropdownChoices.filter((opt) => !roles.includes(opt));
              const availableStandardRoles = HR_MINISTER_ROLE_OPTIONS.filter((opt) => !roles.includes(opt));
              const availableChapelRoles = chapelRoleOptions.filter((opt) => !roles.includes(opt));
              const availableDepts = sectorOptionsWithChapels.filter((opt) => !depts.includes(opt));

              return (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <PersonAvatarBadge
                        name={r.name}
                        gender={r.gender}
                        photoDataUrl={r.photoDataUrl}
                        photoStorageKey={r.photoStorageKey}
                        fallbackPhotoDataUrl={fam?.selfMember?.photoDataUrl}
                        fallbackPhotoStorageKey={fam?.selfMember?.photoStorageKey}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400 tabular-nums">#{idx + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              r.category === 'full_time_minister'
                                ? 'bg-teal-50 text-teal-900 border border-teal-200'
                                : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                            }`}
                          >
                            {r.category === 'full_time_minister'
                              ? t('የሙሉ ጊዜ አገልጋይ', 'Full-Time Minister')
                              : t('የአስተዳደር ሠራተኛ', 'Admin Staff')}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">{r.gender}</span>
                          {linkedFamilyTotal > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold">
                              {t(`ከቋት ቤተሰብ: ${linkedFamilyTotal}`, `DB Family: ${linkedFamilyTotal}`)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfileModalRecordId(r.id)}
                          className="text-base font-extrabold text-slate-900 hover:text-teal-800 mt-1 break-words text-left cursor-pointer"
                        >
                          {r.name}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 print:hidden">
                      <button
                        type="button"
                        onClick={() => setProfileModalRecordId(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 rounded-xl cursor-pointer"
                        aria-label={t('ፕሮፋይል', 'Profile')}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{t('ፕሮፋይል', 'Profile')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="p-2 text-blue-700 bg-blue-50 rounded-xl cursor-pointer"
                        aria-label={t('አስተካክል', 'Edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === r.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteConfirmed(r.id)}
                          className="px-2.5 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl cursor-pointer"
                        >
                          {t('ሰርዝ', 'Confirm')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-2 text-rose-600 bg-rose-50 rounded-xl cursor-pointer"
                          aria-label={t('ሰርዝ', 'Delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile Phone & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <div className="flex items-center gap-1.5 font-mono text-slate-800">
                      <Phone className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span>{phoneInfo?.phone || t('ስልክ አልተመዘገበም', 'No phone')}</span>
                      {phoneInfo?.fromMaster && (
                        <span className="font-sans text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                          {t('ከቋት', 'Registry')}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-slate-700">{r.status}</span>
                  </div>

                  {/* Mobile Roles */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500">
                      {t('የስራ / የአገልግሎት ኃላፍነት', 'Role / Responsibility')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200"
                        >
                          <span>{role}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRoleInline(r.id, role)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {availableRoles.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleAddRoleInline(r.id, e.target.value);
                        }}
                        className="w-full px-3 py-2 text-base sm:text-xs font-semibold border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="">
                          {roles.length === 0
                            ? `+ ${t('የስራ ኃላፍነት ይምረጡ...', 'Select role...')}`
                            : `+ ${t('ተጨማሪ ኃላፍነት ጨምር...', 'Add role...')}`}
                        </option>
                        {r.category === 'full_time_minister' ? (
                          <>
                            {availableStandardRoles.length > 0 && (
                              <optgroup label={t('የአገልግሎት መደብ', 'Ministerial Roles')}>
                                {availableStandardRoles.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {availableChapelRoles.length > 0 && (
                              <optgroup label={t('10ሩ ቻፕሎች (የቻፕል ኃላፍነት)', '10 Chapels')}>
                                {availableChapelRoles.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        ) : (
                          availableRoles.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                  </div>

                  {/* Mobile Sectors (Multi-sector) */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500">
                      {t('የተመደቡበት ዘርፍ / ክፍል (2+ ይቻላል)', 'Assigned Sector(s) (Multi)')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {depts.map((dept) => (
                        <span
                          key={dept}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200"
                        >
                          <span>{dept}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDepartmentInline(r.id, dept)}
                            className="text-teal-500 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {availableDepts.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleAddDepartmentInline(r.id, e.target.value);
                        }}
                        className="w-full px-3 py-2 text-base sm:text-xs font-semibold border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="">
                          {depts.length === 0
                            ? `+ ${t('ዘርፍ ይምረጡ...', 'Assign sector...')}`
                            : `+ ${t('2ኛ/ተጨማሪ ዘርፍ ጨምር...', 'Add another sector...')}`}
                        </option>
                        {availableDepts.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-700" />
                <span>
                  {editingId
                    ? t('የሰው ኃይል መዝገብ አስተካክል', 'Edit Personnel Record')
                    : t('አዲስ የሰው ኃይል መዝገብ ጨምር', 'Add Personnel Record')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {(['full_time_minister', 'admin_staff'] as HRCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setHCategory(cat)}
                    className={`py-2.5 px-3 rounded-xl border font-extrabold transition cursor-pointer ${
                      hCategory === cat
                        ? 'bg-teal-800 text-white border-teal-800'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'full_time_minister'
                      ? t('የሙሉ ጊዜ አገልጋይ', 'Full-Time Minister')
                      : t('የአስተዳደር ሠራተኛ', 'Admin Staff')}
                  </button>
                ))}
              </div>

              {/* Quick Photo Upload in Add/Edit Modal */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
                {hPhotoDataUrl ? (
                  <img
                    src={hPhotoDataUrl}
                    alt={hName || 'Photo'}
                    className="w-14 h-16 rounded-xl object-cover border border-teal-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-16 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-teal-700" />
                    <span>{t('የአገልጋዩ / የሠራተኛው ፎቶ', 'Profile Photo')}</span>
                  </div>
                  {hPhotoError && <p className="text-[11px] font-bold text-rose-700">{hPhotoError}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-bold cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>
                        {hPhotoBusy
                          ? t('በማዘጋጀት ላይ...', 'Processing...')
                          : hPhotoDataUrl
                          ? t('ፎቶ ቀይር', 'Change Photo')
                          : t('ፎቶ አስገባ', 'Upload Photo')}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        onChange={handleModalPhotoSelect}
                        disabled={hPhotoBusy}
                        className="hidden"
                      />
                    </label>
                    {hPhotoDataUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setHPhotoDataUrl(undefined);
                          setHPhotoPendingFullDataUrl(undefined);
                          setHPhotoName(undefined);
                          setHPhotoUpdatedAt(undefined);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t('አስወግድ', 'Remove')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                  <input
                    type="text"
                    required
                    value={hName}
                    onChange={(e) => setHName(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={hGender}
                    onChange={(e) => setHGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ', 'Male')}</option>
                    <option value="ሴ">{t('ሴት', 'Female')}</option>
                  </select>
                </div>
              </div>

              {/* Multi-Role / Job Position Selector */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-800">
                    {t('የስራ / የአገልግሎት ኃላፍነት (1 ወይም ከዚያ በላይ መምረጥ ይቻላል)', 'Job Role(s) / Positions (Select 1 or more)')}
                  </label>
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums">{hRoles.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {roleChoicesForCategory.map((opt) => {
                    const selected = hRoles.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleRoleInModal(opt)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          selected
                            ? 'bg-indigo-700 text-white border-indigo-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {selected ? `✓ ${opt}` : `+ ${opt}`}
                      </button>
                    );
                  })}
                </div>
                {hCategory === 'full_time_minister' && (
                  <div className="pt-1.5 border-t border-slate-200/80 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-600">
                      {t('10ሩ ቻፕሎች (የቻፕል ኃላፍነት ምርጫ)', '10 Chapels (Responsibility Selection)')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {chapelRoleOptions.map((chap) => {
                        const selected = hRoles.includes(chap);
                        return (
                          <button
                            key={chap}
                            type="button"
                            onClick={() => toggleRoleInModal(chap)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                              selected
                                ? 'bg-amber-700 text-white border-amber-700'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            {selected ? `✓ ${chap}` : `+ ${chap}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {hRoles.some(
                  (r) =>
                    !roleChoicesForCategory.includes(r) &&
                    !(hCategory === 'full_time_minister' && chapelRoleOptions.includes(r))
                ) && (
                  <div className="flex flex-wrap gap-1.5">
                    {hRoles
                      .filter(
                        (r) =>
                          !roleChoicesForCategory.includes(r) &&
                          !(hCategory === 'full_time_minister' && chapelRoleOptions.includes(r))
                      )
                      .map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200"
                        >
                          <span>{r}</span>
                          <button type="button" onClick={() => toggleRoleInModal(r)} className="cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hCustomRole}
                    onChange={(e) => setHCustomRole(e.target.value)}
                    placeholder={t('ሌላ የስራ ኃላፍነት ካለ ይጻፉ...', 'Add custom role...')}
                    className="flex-1 px-3 py-1.5 text-base sm:text-xs border border-slate-200 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={addCustomRoleInModal}
                    className="px-3 py-1.5 rounded-lg font-bold bg-slate-800 text-white cursor-pointer"
                  >
                    {t('ጨምር', 'Add')}
                  </button>
                </div>
              </div>

              {/* Multi-Sector Selector (2 or more sectors/responsibilities supported) */}
              <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-teal-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal-700" />
                    <span>{t('የተመደቡበት ዘርፍ / ክፍል (2 እና ከዚያ በላይ ዘርፎች ይቻላል)', 'Assigned Sector(s) (2 or more allowed)')}</span>
                  </label>
                  <span className="text-[11px] font-bold text-teal-800 tabular-nums">{hDepts.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-0.5">
                  {sectorOptionsWithChapels.map((sec) => {
                    const selected = hDepts.includes(sec);
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => toggleDeptInModal(sec)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          selected
                            ? 'bg-teal-800 text-white border-teal-800'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                        }`}
                      >
                        {selected ? `✓ ${sec}` : `+ ${sec}`}
                      </button>
                    );
                  })}
                </div>
                {hDepts.some((d) => !sectorOptionsWithChapels.includes(d)) && (
                  <div className="flex flex-wrap gap-1.5">
                    {hDepts
                      .filter((d) => !sectorOptionsWithChapels.includes(d))
                      .map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-950 border border-teal-300"
                        >
                          <span>{d}</span>
                          <button type="button" onClick={() => toggleDeptInModal(d)} className="cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hCustomDept}
                    onChange={(e) => setHCustomDept(e.target.value)}
                    placeholder={t('ሌላ ዘርፍ/ክፍል ካለ ይጻፉ...', 'Add custom sector...')}
                    className="flex-1 px-3 py-1.5 text-base sm:text-xs border border-slate-200 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={addCustomDeptInModal}
                    className="px-3 py-1.5 rounded-lg font-bold bg-teal-800 text-white cursor-pointer"
                  >
                    {t('ጨምር', 'Add')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ', 'Phone')}</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={hPhone}
                      onChange={(e) => setHPhone(e.target.value)}
                      className="flex-1 px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleLookupModalPhone}
                      className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 whitespace-nowrap cursor-pointer"
                      title={t('ስም ከመረጃ ቋት ፈልጎ ስልክ ያመጣል', 'Look up phone in Church Registry')}
                    >
                      {t('ከቋት ፈልግ', 'Lookup')}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የመጀመሪያ ደሞዝ (ብር)', 'Starting Salary')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={hStartingSalary}
                    onChange={(e) => setHStartingSalary(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የአሁን ወርሃዊ ደመወዝ (ብር)', 'Current Monthly Salary')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={hSalary}
                    onChange={(e) => setHSalary(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('የቅጥር ቀን / ዘመን', 'Hire Date')}</label>
                  <DualDateInput value={hHireDate} onChange={setHHireDate} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የአገልግሎት ዘመን', 'Service Years')}</label>
                  <input
                    type="text"
                    value={hServiceYears}
                    onChange={(e) => setHServiceYears(e.target.value)}
                    placeholder={t('ባዶ ከሆነ ከቅጥር ቀን ይሰላል', 'Auto from hire date if blank')}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የባንክ አካውንት ቁጥር', 'Bank Account Number')}</label>
                  <input
                    type="text"
                    value={hBankAccount}
                    onChange={(e) => setHBankAccount(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('ጡሬታ የተጀመረበት ጊዜ', 'Pension Start Date')}</label>
                  <DualDateInput value={hPensionStartDate} onChange={setHPensionStartDate} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ትምህርት ደረጃ', 'Education Level')}</label>
                  <input
                    type="text"
                    value={hEducation}
                    onChange={(e) => setHEducation(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የጋብቻ ሁኔታ', 'Marital Status')}</label>
                  <select
                    value={hMaritalStatus}
                    onChange={(e) => setHMaritalStatus(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  >
                    {HR_MARITAL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                  <select
                    value={hStatus}
                    onChange={(e) => setHStatus(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="በስራ ላይ">{t('በስራ ላይ', 'Active')}</option>
                    <option value="በእረፍት">{t('በእረፍት', 'On Leave')}</option>
                    <option value="ለቋል">{t('ለቋል', 'Departed')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የትዳር ጓደኛ (ሚስት/ባል) ስም', 'Spouse Name')}</label>
                  <input
                    type="text"
                    value={hSpouseName}
                    onChange={(e) => setHSpouseName(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                  <input
                    type="text"
                    value={hNotes}
                    onChange={(e) => setHNotes(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = editingId;
                      setIsModalOpen(false);
                      setProfileModalRecordId(targetId);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{t('ሙሉ ፕሮፋይል (ማስረጃዎች፣ ልጆች፣ ታሪክ) ክፈት', 'Open Full Profile (Docs, Kids, History)')}</span>
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    {t('ሰርዝ', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-white bg-teal-800 hover:bg-teal-700 rounded-xl cursor-pointer"
                  >
                    {t('አስቀምጥ', 'Save')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {profileModalRecordId !== null && (() => {
        const target = records.find((r) => r.id === profileModalRecordId);
        if (!target) return null;
        const resolvedPhone = resolvedPhoneById.get(target.id)?.phone || target.phone;
        return (
          <MinisterProfileModal
            record={target}
            resolvedPhone={resolvedPhone}
            churchMembers={churchMembers}
            churchChildren={churchChildren}
            onUpdateChurchMember={onUpdateChurchMember}
            onUpdateChurchChild={onUpdateChurchChild}
            onClose={() => setProfileModalRecordId(null)}
            onSaveRecord={(updated) => {
              onSaveRecords(records.map((r) => (r.id === updated.id ? updated : r)));
            }}
          />
        );
      })()}
    </div>
  );
};

interface AdminAssetsPanelProps {
  currentYear: string;
  records: ChurchAssetRecord[];
  onSaveRecords: (updated: ChurchAssetRecord[]) => void;
}

export const AdminAssetsPanel: React.FC<AdminAssetsPanelProps> = ({
  currentYear,
  records,
  onSaveRecords
}) => {
  const { t } = useLanguage();
  const assetsKpiRef = useRef<HTMLDivElement | null>(null);
  const assetsTableRef = useRef<HTMLElement | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | AssetType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [aType, setAType] = useState<AssetType>('fixed');
  const [aName, setAName] = useState('');
  const [aCategory, setACategory] = useState('');
  const [aCode, setACode] = useState('');
  const [aQty, setAQty] = useState('1');
  const [aUnit, setAUnit] = useState('በቁጥር');
  const [aUnitVal, setAUnitVal] = useState('0');
  const [aCondition, setACondition] = useState('ጥሩ');
  const [aLocation, setALocation] = useState('');
  const [aDate, setADate] = useState('');
  const [aNotes, setANotes] = useState('');

  const stats = useMemo(() => {
    const fixed = records.filter((r) => r.assetType === 'fixed');
    const consumable = records.filter((r) => r.assetType === 'consumable');
    const fixedVal = fixed.reduce((s, r) => s + (Number(r.totalValue) || 0), 0);
    const consumableVal = consumable.reduce((s, r) => s + (Number(r.totalValue) || 0), 0);
    return {
      totalItems: records.length,
      fixedCount: fixed.length,
      consumableCount: consumable.length,
      fixedVal,
      consumableVal,
      totalVal: fixedVal + consumableVal
    };
  }, [records]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (typeFilter !== 'all' && r.assetType !== typeFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.codeOrSerial || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q)
      );
    });
  }, [records, typeFilter, searchQuery]);

  const openAdd = (defaultType: AssetType = 'fixed') => {
    setEditingId(null);
    setAType(typeFilter === 'all' ? defaultType : typeFilter);
    setAName('');
    setACategory(defaultType === 'fixed' ? 'የቤተክርስቲያን ቁሳቁስ / መሳሪያ' : 'የጽሕፈት ቤትና አገልግሎት አላቂ ዕቃ');
    setACode('');
    setAQty('1');
    setAUnit('በቁጥር');
    setAUnitVal('0');
    setACondition('ጥሩ');
    setALocation('ዋናው አዳራሽ / ጽሕፈት ቤት');
    setADate(new Date().toISOString().split('T')[0]);
    setANotes('');
    setIsModalOpen(true);
  };

  const openEdit = (rec: ChurchAssetRecord) => {
    setEditingId(rec.id);
    setAType(rec.assetType);
    setAName(rec.name);
    setACategory(rec.category);
    setACode(rec.codeOrSerial || '');
    setAQty(String(rec.quantity));
    setAUnit(rec.unit);
    setAUnitVal(String(rec.unitValue));
    setACondition(rec.conditionOrStatus);
    setALocation(rec.location || '');
    setADate(rec.acquiredDate || '');
    setANotes(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aName.trim()) return;
    const qty = Math.max(0, parseFloat(aQty) || 0);
    const unitVal = Math.max(0, parseFloat(aUnitVal) || 0);
    const item: ChurchAssetRecord = {
      id: editingId ?? generateUniqueId(),
      assetType: aType,
      name: aName.trim(),
      category: aCategory.trim() || (aType === 'fixed' ? 'ቋሚ ንብረት' : 'አላቂ ንብረት'),
      codeOrSerial: aCode.trim() || undefined,
      quantity: qty,
      unit: aUnit.trim() || 'በቁጥር',
      unitValue: unitVal,
      totalValue: qty * unitVal,
      conditionOrStatus: aCondition,
      location: aLocation.trim() || undefined,
      acquiredDate: aDate.trim() || undefined,
      notes: aNotes.trim() || undefined
    };

    const next = editingId
      ? records.map((r) => (r.id === editingId ? item : r))
      : [item, ...records];
    onSaveRecords(next);
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm(t('ይህን የንብረት መዝገብ መሰረዝ ይፈልጋሉ?', 'Delete this asset record?'))) return;
    onSaveRecords(records.filter((r) => r.id !== id));
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const toRows = (list: ChurchAssetRecord[], title: string) => [
      [title],
      [],
      ['ተ.ቁ', 'ዓይነት', 'የንብረት ስም', 'ምድብ', 'መለያ/ኮድ', 'ብዛት', 'መለኪያ', 'የአንዱ ዋጋ', 'ጠቅላላ ዋጋ (ብር)', 'የተገዛበት ቀን', 'ሁኔታ', 'ቦታ'],
      ...list.map((r, i) => [
        i + 1,
        r.assetType === 'fixed' ? 'ቋሚ' : 'አላቂ',
        r.name,
        r.category,
        r.codeOrSerial || '-',
        r.quantity,
        r.unit,
        r.unitValue,
        r.totalValue,
        formatDualDateText(r.acquiredDate, '-'),
        r.conditionOrStatus,
        r.location || '-'
      ])
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(records.filter((r) => r.assetType === 'fixed'), `ቋሚ ንብረቶች (${currentYear})`)),
      'ቋሚ_ንብረት'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(toRows(records.filter((r) => r.assetType === 'consumable'), `አላቂ ንብረቶች (${currentYear})`)),
      'አላቂ_ንብረት'
    );
    XLSX.writeFile(wb, `የቤተክርስቲያን_ንብረት_${currentYear}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-700" />
              <span>{t('የቤተክርስቲያኒቱ ንብረት አስተዳደር (ቋሚና አላቂ)', 'Church Property & Asset Registry (Fixed & Consumable)')}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {t(
                'የቤተክርስቲያኒቱን ቋሚ ንብረቶች እና አላቂ ዕቃዎች ብዛት፣ ዋጋ፣ መገኛ ቦታ እና ሁኔታ በዚህ ገጽ ይመዝግቡ።',
                'Track Fixed Assets and Consumable Supplies quantities, valuations, locations, and conditions.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
            <button
              type="button"
              onClick={() => openAdd('fixed')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-600 text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('አዲስ ንብረት ጨምር', 'Add Asset')}</span>
            </button>
          </div>
        </div>

        <div ref={assetsKpiRef} className="mt-5 pt-4 border-t border-slate-200 space-y-2.5 bg-white rounded-xl">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-extrabold text-slate-700">
              {t(`የንብረት ማጠቃለያ አሃዞች (${currentYear} ዓ/ም)`, `Assets Summary (${currentYear})`)}
            </h4>
            <ExportPhotoButton
              targetRef={assetsKpiRef}
              fileName={`የንብረት_ማጠቃለያ_አሃዞች_${currentYear}`}
              labelAm="በፎቶ (PNG)"
              labelEn="Photo (PNG)"
              variant="secondary"
              compact
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ጠቅላላ የንብረት ዝርዝር', 'Total Asset Lines')}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">{stats.totalItems}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ቋሚ ንብረት', 'Fixed Assets')}</div>
            <div className="text-xl font-extrabold text-blue-900 tabular-nums mt-1">{stats.fixedCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {stats.fixedVal.toLocaleString()} {t('ብር', 'ETB')}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('አላቂ ንብረት', 'Consumable Supplies')}</div>
            <div className="text-xl font-extrabold text-amber-800 tabular-nums mt-1">{stats.consumableCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {stats.consumableVal.toLocaleString()} {t('ብር', 'ETB')}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('ጠቅላላ ግምታዊ ዋጋ', 'Total Valuation')}</div>
            <div className="text-xl font-extrabold text-emerald-800 tabular-nums mt-1">
              {stats.totalVal.toLocaleString()} <span className="text-xs font-bold text-slate-500">{t('ብር', 'ETB')}</span>
            </div>
          </div>
          </div>
        </div>
      </section>

      <section ref={assetsTableRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
            {t(`የቤተክርስቲያን ንብረት ዝርዝር ሰንጠረዥ (${filtered.length})`, `Property & Asset Registry Table (${filtered.length})`)}
          </h4>
          <ExportPhotoButton
            targetRef={assetsTableRef}
            fileName={`የንብረት_ዝርዝር_ሰንጠረዥ_${currentYear}`}
            labelAm="በፎቶ (PNG)"
            labelEn="Photo (PNG)"
            variant="secondary"
            compact
          />
        </div>
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('ሁሉም', 'All')} ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('fixed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                typeFilter === 'fixed' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('ቋሚ ንብረት', 'Fixed Assets')} ({stats.fixedCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('consumable')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                typeFilter === 'consumable' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('አላቂ ንብረት', 'Consumables')} ({stats.consumableCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ንብረት፣ ኮድ ወይም ቦታ ፈልግ...', 'Search item, code, or location...')}
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3 text-left w-10">#</th>
                <th className="py-2.5 px-4 text-left">{t('ዓይነት', 'Type')}</th>
                <th className="py-2.5 px-4 text-left">{t('የንብረት ስም', 'Asset Name')}</th>
                <th className="py-2.5 px-4 text-left">{t('ምድብ', 'Category')}</th>
                <th className="py-2.5 px-3 text-left">{t('መለያ ቁጥር', 'Code / Serial')}</th>
                <th className="py-2.5 px-3 text-right">{t('ብዛት', 'Qty')}</th>
                <th className="py-2.5 px-3 text-right">{t('የአንዱ ዋጋ', 'Unit Value')}</th>
                <th className="py-2.5 px-4 text-right">{t('ጠቅላላ ዋጋ', 'Total Value')}</th>
                <th className="py-2.5 px-3 text-left">{t('ሁኔታ', 'Condition')}</th>
                <th className="py-2.5 px-4 text-left">{t('ቦታ', 'Location')}</th>
                <th className="py-2.5 px-4 text-right print:hidden">{t('ማስተካከያ', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    <p className="font-semibold">
                      {t('ገና ምንም ቋሚ ወይም አላቂ ንብረት አልተመዘገበም።', 'No fixed or consumable assets recorded yet.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => openAdd('fixed')}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('የመጀመሪያውን ንብረት ጨምር', 'Add First Asset')}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 tabular-nums text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap font-bold">
                      <span className={r.assetType === 'fixed' ? 'text-blue-800' : 'text-amber-800'}>
                        {r.assetType === 'fixed' ? t('ቋሚ', 'Fixed') : t('አላቂ', 'Consumable')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-extrabold text-slate-900">
                      <div>{r.name}</div>
                      {r.acquiredDate && (
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                          <DualDateBadge value={r.acquiredDate} mode="inline" />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{r.category}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{r.codeOrSerial || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-800">
                      {r.quantity} <span className="text-[10px] text-slate-500 font-normal">{r.unit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                      {Number(r.unitValue).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-extrabold tabular-nums text-slate-900">
                      {Number(r.totalValue).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{r.conditionOrStatus}</td>
                    <td className="py-2.5 px-4 text-slate-600">{r.location || '—'}</td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap print:hidden">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          title={t('አስተካክል', 'Edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title={t('ሰርዝ', 'Delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-700" />
                <span>
                  {editingId
                    ? t('የንብረት መዝገብ አስተካክል', 'Edit Asset Record')
                    : t('አዲስ ንብረት መዝግብ', 'Add Asset Record')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {(['fixed', 'consumable'] as AssetType[]).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setAType(tp)}
                    className={`py-2.5 px-3 rounded-xl border font-extrabold transition cursor-pointer ${
                      aType === tp
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tp === 'fixed'
                      ? t('ቋሚ ንብረት (Fixed)', 'Fixed Asset')
                      : t('አላቂ ንብረት (Consumable)', 'Consumable Asset')}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የንብረቱ ስም *', 'Asset Name *')}</label>
                  <input
                    type="text"
                    required
                    value={aName}
                    onChange={(e) => setAName(e.target.value)}
                    placeholder={
                      aType === 'fixed'
                        ? t('ምሳሌ፦ የድምጽ ሚክሰር / ወንበር / ኮምፒውተር', 'e.g., Sound Mixer / Chairs / Laptop')
                        : t('ምሳሌ፦ A4 ወረቀት / እስክሪብቶ / ቶነር', 'e.g., A4 Paper / Pens / Toner')
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ምድብ', 'Category')}</label>
                  <input
                    type="text"
                    value={aCategory}
                    onChange={(e) => setACategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ብዛት *', 'Quantity *')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={aQty}
                    onChange={(e) => setAQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መለኪያ', 'Unit')}</label>
                  <input
                    type="text"
                    value={aUnit}
                    onChange={(e) => setAUnit(e.target.value)}
                    placeholder={t('በቁጥር / ደርዘን / ካርቶን', 'pcs / box / pack')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የአንዱ ዋጋ (ብር)', 'Unit Price')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={aUnitVal}
                    onChange={(e) => setAUnitVal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መለያ ቁጥር / ኮድ', 'Tag / Serial')}</label>
                  <input
                    type="text"
                    value={aCode}
                    onChange={(e) => setACode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Condition')}</label>
                  <select
                    value={aCondition}
                    onChange={(e) => setACondition(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ጥሩ">{t('ጥሩ', 'Good')}</option>
                    <option value="ጥገና ያስፈልገዋል">{t('ጥገና ያስፈልገዋል', 'Needs Repair')}</option>
                    <option value="አልቋል/ያረጀ">{t('አልቋል/ያረጀ', 'Depleted / Retired')}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">{t('የተገዛበት ቀን', 'Acquired Date')}</label>
                  <DualDateInput value={aDate} onChange={setADate} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መገኛ ቦታ', 'Location')}</label>
                  <input
                    type="text"
                    value={aLocation}
                    onChange={(e) => setALocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                  <input
                    type="text"
                    value={aNotes}
                    onChange={(e) => setANotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-amber-700 hover:bg-amber-600 rounded-xl cursor-pointer"
                >
                  {t('አስቀምጥ', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
