import React, { Suspense, useMemo, useState } from 'react';
import { LazyErrorBoundary, lazyWithRetry } from './LazyBoundary';
import * as XLSX from 'xlsx';
import { formatDualDateText, formatDualDateTimeText, getTodayIsoDateTime } from '../utils/ethiopianDate';
import { DualDateBadge, DualDateInput } from './DualDate';
import {
  Users,
  Calendar,
  ClipboardList,
  Wallet,
  Target,
  Database,
  BarChart3,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  X,
  ArrowUpRight,
  UserPlus,
  CheckCircle2,
  Printer,
  Send,
  Inbox,
  Briefcase,
  Package,
  HeartHandshake,
  Globe,
  UserCheck,
  History,
  Building2,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import {
  AnnualPlanItem,
  ChoirMember,
  ChurchChild,
  ChurchMember,
  DepartmentActivityRecord,
  DepartmentFinanceRecord,
  DepartmentMemberRecord,
  DepartmentWorkspaceData,
  MinistrySubmission,
  OrgUnitId,
  PlanDispatchItem,
  Role,
  SpiritualMember,
  Student,
  Teacher
} from '../types';
import {
  CHURCH_ORG_UNITS,
  createDefaultEldersCouncilWorkspaceData,
  createEmptyDepartmentWorkspaceData,
  DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT,
  getOrgUnitBreadcrumb,
  getOrgUnitById,
  getOrgUnitChildren,
  isUnderSpiritualCouncil
} from '../constants/churchStructure';
import { generateUniqueId } from '../utils/idGenerator';
import { ChurchMasterTab } from './ChurchMasterTab';
import { ChurchStatisticsDashboardTab } from './ChurchStatisticsDashboardTab';
import { MinistrySubmissionsPanel } from './MinistrySubmissionsPanel';
import { BulkAgeIncrementOptions, BulkAgeIncrementStats } from '../utils/ageUpdater';
import { NameScriptMode } from '../utils/amharicTransliterator';
import { useLanguage } from '../context/LanguageContext';
import { AdminHRPanel, AdminAssetsPanel } from './AdminHRAssetsPanel';
import { AdminPayrollPanel } from './AdminPayrollPanel';
import { UnifiedPlanManager } from './UnifiedPlanManager';
import { ConsolidatedPlansMatrix } from './ConsolidatedPlansMatrix';
import {
  buildHouseholdContextMap,
  isFemaleMember,
  isMarriedWife,
  parseMemberNumericAge
} from '../utils/chapelDemographics';
import type { AutoApplyDispatchMode } from './PlanDispatchPanel';
import { UnitLeadersRosterTab } from './UnitLeadersRosterTab';
import { SpiritualAllSectorsLeadersTab } from './SpiritualAllSectorsLeadersTab';
import { HistoricalLeadersArchiveTab } from './HistoricalLeadersArchiveTab';
import { EvangelismParticipationStatsPanel } from './EvangelismParticipationStatsPanel';
import { MissionaryReportsPanel } from './MissionaryReportsPanel';
import { WomenCharterPanel } from './WomenCharterPanel';
import { syncChurchMemberToEvangelismRecords } from '../utils/memberMinistryProfile';

const PlanBulkSenderPanel = lazyWithRetry(() =>
  import('./PlanDispatchPanel').then((m) => ({ default: m.PlanBulkSenderPanel }))
);
const CompassionBeneficiariesPanel = lazyWithRetry(() =>
  import('./MinistrySpecializedPanels').then((m) => ({
    default: m.CompassionBeneficiariesPanel
  }))
);
const EvangelismMissionariesPanel = lazyWithRetry(() =>
  import('./MinistrySpecializedPanels').then((m) => ({
    default: m.EvangelismMissionariesPanel
  }))
);

interface DepartmentWorkspacePageProps {
  unitId: OrgUnitId;
  currentYear: string;
  ageReferenceYear?: number;
  currentUserRole: Role;
  departmentDataMap: { [unitId: string]: DepartmentWorkspaceData };
  childrenPlans?: AnnualPlanItem[];
  onUpdateDepartmentData: (
    unitId: OrgUnitId,
    updater: (prev: DepartmentWorkspaceData) => DepartmentWorkspaceData
  ) => void;
  canNavigateToUnit: (targetUnitId: OrgUnitId) => boolean;
  onSelectUnit: (targetUnitId: OrgUnitId) => void;
  // Shared Church Registry & Overview props (embedded inside 1, 1.1 Office, 1.2 Spiritual Council)
  churchMembers: ChurchMember[];
  churchChildren: ChurchChild[];
  chapelList: string[];
  classList: string[];
  studentsByClass: { [className: string]: Student[] };
  onBatchAddMembers: (members: ChurchMember[], mode?: 'append' | 'replace', baselineYear?: number) => void;
  onAddMember: (member: Omit<ChurchMember, 'id'>) => ChurchMember | void;
  onUpdateMember: (member: ChurchMember) => void;
  onDeleteMember: (id: number) => void;
  onClearChurchMembers: () => void;
  onExtractChildrenToChildrenTab: (children: Omit<ChurchChild, 'id'>[], mode?: 'append' | 'replace') => void;
  onBulkIncrementAges?: (options: Omit<BulkAgeIncrementOptions, 'targetAcademicYear'>) => BulkAgeIncrementStats | null;
  nameScriptMode?: NameScriptMode;
  onChangeNameScriptMode?: (mode: NameScriptMode) => void;
  onOpenTransliterator?: () => void;
  // Ministry Plans / Reports / Letters workflow props
  submissions?: MinistrySubmission[];
  onCreateSubmission?: (
    payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>
  ) => void;
  onResubmitSubmission?: (id: number, updates: Partial<MinistrySubmission>) => void;
  onDeleteSubmission?: (id: number) => void;
  onSpiritualApprove?: (
    id: number,
    note?: string,
    forwardToAdmin?: boolean,
    forwardNote?: string
  ) => void;
  onSpiritualReturn?: (id: number, note: string) => void;
  onForwardToAdmin?: (id: number, note?: string) => void;
  onAdminAcknowledge?: (id: number, note?: string) => void;
  // Bulk 2019 Plan Sender & Sector Receiver props
  planDispatches?: PlanDispatchItem[];
  onDispatchPlans?: (
    packets: Omit<PlanDispatchItem, 'id' | 'sentAt' | 'status'>[],
    autoApplyMode?: AutoApplyDispatchMode
  ) => void;
  onAcceptDispatch?: (dispatchId: number, mode: 'append' | 'replace') => void;
  onReturnDispatch?: (dispatchId: number, note: string) => void;
  onDeleteDispatch?: (id: number) => void;
  teachers?: Teacher[];
  choirMembers?: ChoirMember[];
  spiritualMembers?: SpiritualMember[];
}

type SubTabId =
  | 'overview'
  | 'church_registry'
  | 'church_stats'
  | 'leaders'
  | 'members'
  | 'activities'
  | 'finances'
  | 'hr'
  | 'payroll'
  | 'assets'
  | 'beneficiaries'
  | 'evangelism_stats'
  | 'missionaries'
  | 'missionary_reports'
  | 'women_charter'
  | 'plans'
  | 'plan_dispatch'
  | 'consolidated_plans'
  | 'send_to_spiritual'
  | 'spiritual_review'
  | 'spiritual_approved'
  | 'all_sector_leaders'
  | 'historical_leaders'
  | 'admin_inbox'
  | 'elders_submissions';

export const DepartmentWorkspacePage: React.FC<DepartmentWorkspacePageProps> = ({
  unitId,
  currentYear,
  ageReferenceYear = 2017,
  currentUserRole,
  departmentDataMap,
  childrenPlans = [],
  onUpdateDepartmentData,
  canNavigateToUnit,
  onSelectUnit,
  churchMembers,
  churchChildren,
  chapelList,
  classList,
  studentsByClass,
  onBatchAddMembers,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onClearChurchMembers,
  onExtractChildrenToChildrenTab,
  onBulkIncrementAges,
  nameScriptMode,
  onChangeNameScriptMode,
  onOpenTransliterator,
  submissions = [],
  onCreateSubmission,
  onResubmitSubmission,
  onDeleteSubmission,
  onSpiritualApprove,
  onSpiritualReturn,
  onForwardToAdmin,
  onAdminAcknowledge,
  planDispatches = [],
  onDispatchPlans,
  onAcceptDispatch,
  onReturnDispatch,
  onDeleteDispatch,
  teachers = [],
  choirMembers = [],
  spiritualMembers = []
}) => {
  const { t, unitName: getUnitLabel, unitDesc: getUnitDescLabel } = useLanguage();
  const unit = getOrgUnitById(unitId);
  const breadcrumb = useMemo(() => getOrgUnitBreadcrumb(unitId), [unitId]);
  const childUnits = useMemo(() => getOrgUnitChildren(unitId), [unitId]);
  const overviewUnits = useMemo(() => {
    if (unitId === 'elders_council') {
      return CHURCH_ORG_UNITS.filter((u) => u.id !== 'elders_council');
    }
    if (unitId === 'spiritual_council') {
      return CHURCH_ORG_UNITS.filter((u) => isUnderSpiritualCouncil(u.id));
    }
    return childUnits;
  }, [unitId, childUnits]);

  const ws: DepartmentWorkspaceData =
    departmentDataMap[unitId] || createEmptyDepartmentWorkspaceData();

  const defaultTab: SubTabId = useMemo(() => {
    if (!unit) return 'members';
    if (unitId === 'love_compassion') return 'beneficiaries';
    if (unitId === 'evangelism') return 'evangelism_stats';
    if (unitId === 'women_ministry') return 'women_charter';
    if (unit.hasChurchRegistry && unit.kind === 'council_registry') return 'church_registry';
    if (unit.kind === 'governance' || unit.kind === 'special_hub') return 'overview';
    if (unit.kind === 'finance') return 'finances';
    return 'members';
  }, [unit, unitId]);

  const [activeSubTab, setActiveSubTab] = useState<SubTabId>(defaultTab);
  const [lastUnitId, setLastUnitId] = useState<OrgUnitId>(unitId);
  if (lastUnitId !== unitId) {
    setLastUnitId(unitId);
    setActiveSubTab(defaultTab);
  }

  // Filters & search
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<'all' | 'ገቢ' | 'ወጪ'>('all');
  const [financeSearch, setFinanceSearch] = useState('');
  const [syncNotice, setSyncNotice] = useState('');

  // Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [mName, setMName] = useState('');
  const [mGender, setMGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [mAge, setMAge] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mRole, setMRole] = useState('');
  const [mEducation, setMEducation] = useState('');
  const [mStatus, setMStatus] = useState('ንቁ');
  const [mNotes, setMNotes] = useState('');

  // Activity Modal State
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [aDate, setADate] = useState(() => new Date().toISOString().split('T')[0]);
  const [aTitle, setATitle] = useState('');
  const [aCategory, setACategory] = useState('');
  const [aLocation, setALocation] = useState('');
  const [aParticipants, setAParticipants] = useState('');
  const [aStatus, setAStatus] = useState<'ታቅዷል' | 'በሂደት ላይ' | 'ተጠናቋል'>('ተጠናቋል');
  const [aSummary, setASummary] = useState('');

  // Finance Modal State
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [editingFinanceId, setEditingFinanceId] = useState<number | null>(null);
  const [fDate, setFDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fType, setFType] = useState<'ገቢ' | 'ወጪ'>('ገቢ');
  const [fCategory, setFCategory] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fReceipt, setFReceipt] = useState('');


  // Derived Member Gender Counts (Male / Female / Total)
  const memberCounts = useMemo(() => {
    let male = 0;
    let female = 0;
    let unspecified = 0;
    ws.members.forEach((m) => {
      const g = String(m.gender || '').trim();
      if (g === 'ወ' || g.includes('ወንድ')) male += 1;
      else if (g === 'ሴ' || g.includes('ሴት')) female += 1;
      else unspecified += 1;
    });
    return { male, female, unspecified, total: ws.members.length };
  }, [ws.members]);

  // Derived Finance Summary
  const financeSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    ws.finances.forEach((f) => {
      const amt = Number(f.amount) || 0;
      if (f.type === 'ገቢ') income += amt;
      else expense += amt;
    });
    return { income, expense, balance: income - expense };
  }, [ws.finances]);

  // Filtered Lists
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return ws.members.filter((m) => {
      if (memberRoleFilter !== 'all' && m.roleOrClass !== memberRoleFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        m.roleOrClass.toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q)
      );
    });
  }, [ws.members, memberSearch, memberRoleFilter]);

  const filteredActivities = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    return [...ws.activities]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .filter((a) => {
        if (!q) return true;
        return (
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.locationOrGroup || '').toLowerCase().includes(q) ||
          (a.summary || '').toLowerCase().includes(q)
        );
      });
  }, [ws.activities, activitySearch]);

  const filteredFinances = useMemo(() => {
    const q = financeSearch.trim().toLowerCase();
    return [...ws.finances]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .filter((f) => {
        if (financeTypeFilter !== 'all' && f.type !== financeTypeFilter) return false;
        if (!q) return true;
        return (
          f.category.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          (f.receiptOrRef || '').toLowerCase().includes(q)
        );
      });
  }, [ws.finances, financeTypeFilter, financeSearch]);

  // Matching candidates from Church Master Registry for Women/Youth/Men ministries
  const churchSyncCandidates = useMemo(() => {
    if (!unit?.churchMemberSyncFilter) return [];
    const yearNum = parseInt(currentYear, 10) || 2018;
    const householdMap =
      unit.churchMemberSyncFilter === 'women' ||
      unit.churchMemberSyncFilter === 'women_ministry'
        ? buildHouseholdContextMap(churchMembers, yearNum)
        : null;

    return churchMembers.filter((cm) => {
      const g = String(cm.gender || '').trim();
      const ageNum = parseMemberNumericAge(cm.age, yearNum);
      if (unit.churchMemberSyncFilter === 'women_ministry' && householdMap) {
        if (!isFemaleMember(cm)) return false;
        if (ageNum !== null && ageNum > 29) return true;
        return isMarriedWife(cm, householdMap, yearNum);
      }
      if (unit.churchMemberSyncFilter === 'women' && householdMap) {
        // ሴቶች መተሳሰብ ዘርፍ ውስጥ መካተት ያለባቸው የባል ሚስት የሆኑ (ባለትዳር) ሴቶች ብቻ ናቸው
        return isMarriedWife(cm, householdMap, yearNum);
      }
      if (unit.churchMemberSyncFilter === 'men') {
        return (g === 'ወ' || g.includes('ወንድ')) && (ageNum === null || ageNum >= 18);
      }
      if (unit.churchMemberSyncFilter === 'youth') {
        return ageNum !== null && ageNum >= 15 && ageNum <= 29;
      }
      return false;
    });
  }, [churchMembers, unit?.churchMemberSyncFilter, currentYear]);

  if (!unit) return null;

  const handleSyncFromChurchMaster = () => {
    if (!unit.churchMemberSyncFilter || churchSyncCandidates.length === 0) return;
    const yearNum = parseInt(currentYear, 10) || 2018;
    const existingNames = new Set(ws.members.map((m) => m.name.trim()));
    const toAdd: DepartmentMemberRecord[] = [];
    churchSyncCandidates.forEach((cm) => {
      const cleanName = String(cm.name || '').trim();
      if (!cleanName || existingNames.has(cleanName)) return;
      existingNames.add(cleanName);
      const parsedAge = parseMemberNumericAge(cm.age, yearNum);
      const isOver29 = parsedAge !== null && parsedAge > 29;
      toAdd.push({
        id: generateUniqueId(),
        name: cleanName,
        gender: cm.gender === 'ሴ' || String(cm.gender).includes('ሴት') ? 'ሴ' : 'ወ',
        age: cm.age,
        phone: cm.phone,
        roleOrClass:
          unit.churchMemberSyncFilter === 'women_ministry'
            ? isOver29
              ? 'መደበኛ አባል (ከ29 ዓመት በላይ)'
              : 'ባለትዳር አባል (ከ29 ዓመት በታች - በፈቃድ)'
            : unit.roleOptions[unit.roleOptions.length - 1] || 'መደበኛ አባል',
        educationOrLevel: cm.educationLevel,
        status: 'ንቁ',
        notes:
          unit.churchMemberSyncFilter === 'women_ministry'
            ? `${cm.chapel ? `ከ${cm.chapel} ቋት · ` : ''}${
                isOver29 ? 'ጠቅላላ ጉባኤ (ከ29 ዓመት በላይ)' : 'ባለትዳር (ከ29 ዓመት በታች - በፈቃድ)'
              }`
            : unit.churchMemberSyncFilter === 'women'
            ? `${cm.chapel ? `ከ${cm.chapel} ቋት · ` : ''}የባል ሚስት (ባለትዳር)`
            : cm.chapel
            ? `ከ${cm.chapel} ቋት`
            : 'ከዋናው ቋት'
      });
    });

    if (toAdd.length === 0) {
      setSyncNotice('ሁሉም ተዛማጅ አባላት ቀድሞውኑ በዚህ ዝርዝር ውስጥ ተካተዋል።');
      setTimeout(() => setSyncNotice(''), 4000);
      return;
    }

    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      members: [...prev.members, ...toAdd]
    }));
    setSyncNotice(`✓ ${toAdd.length} አባላት ከዋናው የቤተክርስቲያን መረጃ ቋት ወደ ${unit.name} ገብተዋል!`);
    setTimeout(() => setSyncNotice(''), 6000);
  };

  // Member CRUD
  const openAddMember = () => {
    setEditingMemberId(null);
    setMName('');
    setMGender(
      unit.churchMemberSyncFilter === 'women' || unit.churchMemberSyncFilter === 'women_ministry'
        ? 'ሴ'
        : 'ወ'
    );
    setMAge('');
    setMPhone('');
    setMRole(unit.roleOptions[0] || 'አባል');
    setMEducation('');
    setMStatus('ንቁ');
    setMNotes('');
    setIsMemberModalOpen(true);
  };

  const openEditMember = (rec: DepartmentMemberRecord) => {
    setEditingMemberId(rec.id);
    setMName(rec.name);
    setMGender(rec.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setMAge(rec.age !== undefined ? String(rec.age) : '');
    setMPhone(rec.phone || '');
    setMRole(rec.roleOrClass || unit.roleOptions[0] || 'አባል');
    setMEducation(rec.educationOrLevel || '');
    setMStatus(rec.status || 'ንቁ');
    setMNotes(rec.notes || '');
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName.trim()) return;
    const isWomenOnlyUnit =
      unit.churchMemberSyncFilter === 'women' || unit.churchMemberSyncFilter === 'women_ministry';
    const record: DepartmentMemberRecord = {
      id: editingMemberId ?? generateUniqueId(),
      name: mName.trim(),
      gender: isWomenOnlyUnit ? 'ሴ' : mGender,
      age: mAge.trim() ? Number(mAge) || mAge.trim() : undefined,
      phone: mPhone.trim() || undefined,
      roleOrClass: mRole.trim() || 'አባል',
      educationOrLevel: mEducation.trim() || undefined,
      status: mStatus,
      joinDate: new Date().toISOString().split('T')[0],
      notes: mNotes.trim() || undefined
    };

    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      members: editingMemberId
        ? prev.members.map((m) => (m.id === editingMemberId ? record : m))
        : [...prev.members, record]
    }));
    setIsMemberModalOpen(false);
  };

  const handleDeleteMemberRow = (id: number) => {
    if (!window.confirm('ይህን አባል/መዝገብ መሰረዝ ይፈልጋሉ?')) return;
    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id)
    }));
  };

  // Activity CRUD
  const openAddActivity = () => {
    setEditingActivityId(null);
    setADate(getTodayIsoDateTime());
    setATitle('');
    setACategory(unit.activityCategories[0] || 'መደበኛ አገልግሎት');
    setALocation('');
    setAParticipants('');
    setAStatus('ተጠናቋል');
    setASummary('');
    setIsActivityModalOpen(true);
  };

  const openEditActivity = (act: DepartmentActivityRecord) => {
    setEditingActivityId(act.id);
    setADate(act.date);
    setATitle(act.title);
    setACategory(act.category);
    setALocation(act.locationOrGroup || '');
    setAParticipants(act.participantsCount !== undefined ? String(act.participantsCount) : '');
    setAStatus(act.status);
    setASummary(act.summary || '');
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aTitle.trim()) return;
    const record: DepartmentActivityRecord = {
      id: editingActivityId ?? generateUniqueId(),
      date: aDate,
      title: aTitle.trim(),
      category: aCategory.trim() || 'አገልግሎት',
      locationOrGroup: aLocation.trim() || undefined,
      participantsCount: aParticipants.trim() ? parseInt(aParticipants, 10) || 0 : undefined,
      status: aStatus,
      summary: aSummary.trim() || undefined
    };
    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      activities: editingActivityId
        ? prev.activities.map((a) => (a.id === editingActivityId ? record : a))
        : [record, ...prev.activities]
    }));
    setIsActivityModalOpen(false);
  };

  const handleDeleteActivity = (id: number) => {
    if (!window.confirm('ይህን የአገልግሎት መዝገብ መሰረዝ ይፈልጋሉ?')) return;
    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id)
    }));
  };

  // Finance CRUD
  const openAddFinance = () => {
    setEditingFinanceId(null);
    setFDate(getTodayIsoDateTime());
    setFType('ገቢ');
    setFCategory(unit.financeCategories[0] || 'መደበኛ ገቢ/ወጪ');
    setFDescription('');
    setFAmount('');
    setFReceipt('');
    setIsFinanceModalOpen(true);
  };

  const openEditFinance = (fin: DepartmentFinanceRecord) => {
    setEditingFinanceId(fin.id);
    setFDate(fin.date);
    setFType(fin.type);
    setFCategory(fin.category);
    setFDescription(fin.description);
    setFAmount(String(fin.amount));
    setFReceipt(fin.receiptOrRef || '');
    setIsFinanceModalOpen(true);
  };

  const handleSaveFinance = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmt = parseFloat(fAmount);
    if (!fDescription.trim() || isNaN(numericAmt) || numericAmt < 0) return;
    const record: DepartmentFinanceRecord = {
      id: editingFinanceId ?? generateUniqueId(),
      date: fDate,
      type: fType,
      category: fCategory.trim() || 'ጠቅላላ',
      description: fDescription.trim(),
      amount: numericAmt,
      receiptOrRef: fReceipt.trim() || undefined
    };
    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      finances: editingFinanceId
        ? prev.finances.map((f) => (f.id === editingFinanceId ? record : f))
        : [record, ...prev.finances]
    }));
    setIsFinanceModalOpen(false);
  };

  const handleDeleteFinance = (id: number) => {
    if (!window.confirm('ይህን የሂሳብ መዝገብ መሰረዝ ይፈልጋሉ?')) return;
    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      finances: prev.finances.filter((f) => f.id !== id)
    }));
  };

  const handleExportDepartmentExcel = () => {
    const wb = XLSX.utils.book_new();
    const memberRows = [
      [`${unit.name} — የአባላት ዝርዝር (${currentYear} ዓ/ም)`],
      [`ወንድ: ${memberCounts.male} | ሴት: ${memberCounts.female} | ጠቅላላ: ${memberCounts.total}`],
      [],
      ['ተ.ቁ', 'ሙሉ ስም', 'ጾታ', 'ዕድሜ', unit.roleColumnLabel, 'ትምህርት/ደረጃ', 'ስልክ', 'ሁኔታ', 'ማስታወሻ'],
      ...ws.members.map((m, i) => [
        i + 1,
        m.name,
        m.gender,
        m.age ?? '-',
        m.roleOrClass,
        m.educationOrLevel || '-',
        m.phone || '-',
        m.status,
        m.notes || '-'
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(memberRows), 'አባላት');

    const activityRows = [
      [`${unit.name} — የአገልግሎት እንቅስቃሴዎች`],
      [],
      ['ተ.ቁ', 'ቀን', 'ርዕስ / ተግባር', 'ምድብ', 'ቦታ/ቡድን', 'ተሳታፊ', 'ሁኔታ', 'ማብራሪያ'],
      ...ws.activities.map((a, i) => [
        i + 1,
        formatDualDateTimeText(a.date, '-'),
        a.title,
        a.category,
        a.locationOrGroup || '-',
        a.participantsCount ?? '-',
        a.status,
        a.summary || '-'
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(activityRows), 'እንቅስቃሴዎች');

    if (unit.supportsFinance) {
      const finRows = [
        [`${unit.name} — የፋይናንስ መዝገብ`],
        [`ጠቅላላ ገቢ: ${financeSummary.income} | ጠቅላላ ወጪ: ${financeSummary.expense} | ቀሪ ሂሳብ: ${financeSummary.balance}`],
        [],
        ['ተ.ቁ', 'ቀንና ሰዓት', 'ዓይነት', 'ምድብ', 'መግለጫ', 'መጠን (ብር)', 'ደረሰኝ/ማጣቀሻ'],
        ...ws.finances.map((f, i) => [
          i + 1,
          formatDualDateTimeText(f.date, '-'),
          f.type,
          f.category,
          f.description,
          f.amount,
          f.receiptOrRef || '-'
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(finRows), 'ፋይናንስ');
    }

    if (unitId === 'love_compassion' && (ws.beneficiaryRecords || []).length > 0) {
      const benRows = [
        [`ፍቅርና ርኅራሄ — ቋሚና ጊዜያዊ ተረጂዎች (${currentYear} ዓ/ም)`],
        [],
        ['ተ.ቁ', 'ዓይነት', 'ሙሉ ስም', 'ጾታ', 'ዕድሜ', 'የድጋፍ ዘርፍ', 'መጠን (ብር)', 'ቻፕል', 'ስልክ', 'ሁኔታ'],
        ...(ws.beneficiaryRecords || []).map((b, i) => [
          i + 1,
          b.supportType === 'permanent' ? 'ቋሚ ተረጂ' : 'ጊዜያዊ ተረጂ',
          b.name,
          b.gender,
          b.age ?? '-',
          b.aidCategory,
          b.monthlyAidAmount ?? 0,
          b.chapel || '-',
          b.phone || '-',
          b.status
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(benRows), 'ቋሚና_ጊዜያዊ_ተረጂ');
    }

    if (unitId === 'evangelism' && (ws.missionaryRecords || []).length > 0) {
      const misRows = [
        [`የወንጌል አገልግሎት — ሚሽነሪዎች (${currentYear} ዓ/ም)`],
        [],
        ['ተ.ቁ', 'የሚሽነሪ ምድብ', 'ሙሉ ስም', 'ጾታ', 'ስልክ ቁጥር', 'ያሉበት ክልል / የአገልግሎት ቦታ', 'የትምህርት ደረጃ', 'ላኪ አካል', 'ወርሃዊ ድጋፍ (ብር)', 'ሁኔታ'],
        ...(ws.missionaryRecords || []).map((mr, i) => [
          i + 1,
          mr.scope === 'international'
            ? 'አለም አቀፋዊ ሚሽነሪ'
            : mr.scope === 'national'
            ? 'አገር አቀፋዊ ሚሽነሪ'
            : mr.scope === 'regional'
            ? 'ክልላዊ ሚሽነሪ'
            : 'አከባቢያዊ ሚሽነሪ',
          mr.name,
          mr.gender,
          mr.phone || '-',
          mr.missionField,
          mr.educationLevel || '-',
          mr.sendingOrganization || '-',
          mr.monthlySupportAmount ?? 0,
          mr.status
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(misRows), 'ሚሽነሪዎች');
    }

    if ((ws.leaders || []).length > 0) {
      const leaderRows = [
        [`${unit.name} — የመሪዎች ስም ዝርዝር (${currentYear} ዓ/ም)`],
        [],
        ['ተ.ቁ', 'ሙሉ ስም', 'ጾታ', 'የአመራር ድርሻ / ኃላፊነት', 'ስልክ', 'የጀመሩበት ቀን', 'ሁኔታ', 'ማስታወሻ'],
        ...(ws.leaders || []).map((ldr, i) => [
          i + 1,
          ldr.name,
          ldr.gender,
          ldr.roleTitle,
          ldr.phone || '-',
          formatDualDateText(ldr.termOrStartDate, '-'),
          ldr.status,
          ldr.notes || '-'
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(leaderRows), 'የመሪዎች_ስም_ዝርዝር');
    }

    if (unitId === 'spiritual_council' && (ws.historicalLeaders || []).length > 0) {
      const histRows = [
        ['በየጊዜው ያገለገሉ መሪዎች መዝገብ (ዓ/ም · ዘርፍ · የተሰጠው ኃላፊነት)'],
        [],
        ['ተ.ቁ', 'ያገለገሉበት ዓ/ም', 'ሙሉ ስም', 'ጾታ', 'ያገለገሉበት ዘርፍ', 'ቻፕል', 'የተሰጠው ኃላፊነት', 'ስልክ', 'ሁኔታ', 'ማስታወሻ'],
        ...(ws.historicalLeaders || []).map((hl, i) => [
          i + 1,
          hl.serviceYear,
          hl.name,
          hl.gender,
          hl.sectorName,
          hl.chapelName || '-',
          hl.responsibility,
          hl.phone || '-',
          hl.status,
          hl.notes || '-'
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histRows), 'የየዘመናቱ_መሪዎች');
    }

    XLSX.writeFile(wb, `${unit.name}_${currentYear}.xlsx`);
  };

  const spiritualPendingCount = useMemo(
    () => submissions.filter((s) => s.status === 'pending_spiritual').length,
    [submissions]
  );

  const spiritualApprovedCount = useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.status === 'approved_spiritual' ||
          s.status === 'forwarded_to_admin' ||
          s.status === 'acknowledged_by_admin'
      ).length,
    [submissions]
  );

  const adminInboxCount = useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.status === 'approved_spiritual' ||
          s.forwardedToAdmin ||
          s.status === 'forwarded_to_admin' ||
          s.status === 'acknowledged_by_admin'
      ).length,
    [submissions]
  );

  const unitSentCount = useMemo(
    () => submissions.filter((s) => s.senderUnitId === unitId).length,
    [submissions, unitId]
  );

  const pendingUnitDispatches = useMemo(
    () => planDispatches.filter((d) => d.targetUnitId === unitId && d.status === 'pending'),
    [planDispatches, unitId]
  );

  const departmentSummaryText = useMemo(() => {
    const completedActs = ws.activities.filter((a) => a.status === 'ተጠናቋል').length;
    const recentActs = ws.activities
      .slice(0, 5)
      .map((a, idx) => `${idx + 1}. ${a.title} (${formatDualDateTimeText(a.date)} — ${a.status})`)
      .join('\n');
    const lines = [
      `የዘርፍ / ክፍል ማጠቃለያ — ${unit?.name || ''} (${currentYear} ዓ/ም)`,
      `- የክፍሉ አባላት፦ ጠቅላላ ${memberCounts.total} (ወንድ ${memberCounts.male}፣ ሴት ${memberCounts.female})`,
      `- የተመዘገቡ የአገልግሎት ተግባራት፦ ${ws.activities.length} (የተጠናቀቁ፦ ${completedActs})`,
      `- የዓመት ዕቅዶች፦ ${ws.plans.length}`
    ];
    if (unit?.supportsFinance) {
      lines.push(
        `- ፋይናንስ፦ ገቢ ${financeSummary.income.toLocaleString()} ብር | ወጪ ${financeSummary.expense.toLocaleString()} ብር | ቀሪ ሂሳብ ${financeSummary.balance.toLocaleString()} ብር`
      );
    }
    if (recentActs) {
      lines.push('', 'የቅርብ ጊዜ ተግባራት፦', recentActs);
    }
    return lines.join('\n');
  }, [unit, currentYear, memberCounts, ws.activities, ws.plans.length, financeSummary]);

  const tabs: { id: SubTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    ...(overviewUnits.length > 0
      ? [
          {
            id: 'overview' as SubTabId,
            label:
              unitId === 'elders_council'
                ? t(`የሁሉም ዘርፎች ገጾች (${overviewUnits.length})`, `All Units (${overviewUnits.length})`)
                : unitId === 'spiritual_council'
                ? t(`በመንፈሳዊ ዘርፍ ስር ያሉ ገጾች (${overviewUnits.length})`, `Spiritual Ministries (${overviewUnits.length})`)
                : t('የመዋቅር ማጠቃለያ', 'Sub-Units Overview'),
            icon: BarChart3
          }
        ]
      : []),
    ...(unit.hasChurchRegistry
      ? [
          { id: 'church_registry' as SubTabId, label: t('የቤተክርስቲያን መረጃ ቋት', 'Church Master Registry'), icon: Database },
          { id: 'church_stats' as SubTabId, label: t('አጠቃላይ ስታቲስቲክስ (ወ/ሴ/ድምር)', 'Overview Statistics (M/F/Total)'), icon: BarChart3 }
        ]
      : []),
    ...(unitId === 'spiritual_council'
      ? [
          {
            id: 'all_sector_leaders' as SubTabId,
            label: t(
              `የሁሉም ዘርፎች መሪዎች (${CHURCH_ORG_UNITS.reduce((s, u) => s + (departmentDataMap[u.id]?.leaders?.length || 0), 0)})`,
              `All Sectors Leaders (${CHURCH_ORG_UNITS.reduce((s, u) => s + (departmentDataMap[u.id]?.leaders?.length || 0), 0)})`
            ),
            icon: Building2
          },
          {
            id: 'historical_leaders' as SubTabId,
            label: t(
              `የየዘመናቱ መሪዎች መዝገብ (${(ws.historicalLeaders || []).length})`,
              `Historical Leaders (${(ws.historicalLeaders || []).length})`
            ),
            icon: History
          },
          {
            id: 'spiritual_review' as SubTabId,
            label: t(`የቀረቡ ዕቅድ/ሪፖርት/ደብዳቤ (${spiritualPendingCount})`, `Pending Review (${spiritualPendingCount})`),
            icon: Inbox
          },
          {
            id: 'spiritual_approved' as SubTabId,
            label: t(`የጸደቁ ሰነዶች ማህደር (${spiritualApprovedCount})`, `Approved Archive (${spiritualApprovedCount})`),
            icon: CheckCircle2
          },
          {
            id: 'consolidated_plans' as SubTabId,
            label: t('የ10ሩም ቻፕሎች እና ዘርፎች ዕቅድ/ክንውን', '10 Chapels & Ministries Plans Matrix'),
            icon: Target
          }
        ]
      : []),
    ...(isUnderSpiritualCouncil(unitId)
      ? [
          {
            id: 'send_to_spiritual' as SubTabId,
            label: t(`ለመንፈሳዊ ዘርፍ መላኪያ (${unitSentCount})`, `Send to Spiritual (${unitSentCount})`),
            icon: Send
          }
        ]
      : []),
    ...(unitId === 'admin_finance' || unitId === 'office'
      ? [
          {
            id: 'admin_inbox' as SubTabId,
            label: t(`ከመንፈሳዊ ዘርፍ የጸደቁ (${adminInboxCount})`, `Spiritual Approved (${adminInboxCount})`),
            icon: Inbox
          }
        ]
      : []),
    ...(unitId === 'admin_finance'
      ? [
          {
            id: 'hr' as SubTabId,
            label: t(`የሰው ኃይል እና ፕሮፋይል (${(ws.hrRecords || []).length})`, `Church HR & Profiles (${(ws.hrRecords || []).length})`),
            icon: Briefcase
          },
          {
            id: 'payroll' as SubTabId,
            label: t('የአገልጋዮች ደመወዝ ፔሮል (18% ጡሬታ)', 'Payroll (18% Pension)'),
            icon: Calculator
          },
          {
            id: 'assets' as SubTabId,
            label: t(`ንብረት — ቋሚና አላቂ (${(ws.assetRecords || []).length})`, `Assets — Fixed/Consumable (${(ws.assetRecords || []).length})`),
            icon: Package
          }
        ]
      : []),
    ...(unitId === 'women_ministry'
      ? [
          {
            id: 'women_charter' as SubTabId,
            label: t('አወቃቀር፣ ተጠሪነት እና ደንብ', 'Structure & Bylaws'),
            icon: ShieldCheck
          }
        ]
      : []),
    ...(unitId === 'love_compassion'
      ? [
          {
            id: 'beneficiaries' as SubTabId,
            label: t(
              `ቋሚና ጊዜያዊ ተረጂዎች (${(ws.beneficiaryRecords || []).length})`,
              `Permanent & Temporary Beneficiaries (${(ws.beneficiaryRecords || []).length})`
            ),
            icon: HeartHandshake
          }
        ]
      : []),
    ...(unitId === 'evangelism'
      ? [
          {
            id: 'evangelism_stats' as SubTabId,
            label: t('የአባላት ተሳትፎና መቶኛ (%)', 'Participation & % Stats'),
            icon: BarChart3
          },
          {
            id: 'missionaries' as SubTabId,
            label: t(
              `ሚሽነሪዎች (አለም/አገር/ክልል/አከባቢ · ${(ws.missionaryRecords || []).length})`,
              `Missionaries (${(ws.missionaryRecords || []).length})`
            ),
            icon: Globe
          }
        ]
      : []),
    ...(unitId === 'evangelism' ||
    unitId === 'spiritual_council' ||
    unitId === 'admin_finance' ||
    unitId === 'office'
      ? [
          {
            id: 'missionary_reports' as SubTabId,
            label: t(
              `የሚሽነሪዎች ሪፖርት (${(departmentDataMap.evangelism?.missionaryReports || []).length})`,
              `Missionaries Report (${(departmentDataMap.evangelism?.missionaryReports || []).length})`
            ),
            icon: ClipboardList
          }
        ]
      : []),
    ...(unitId === 'elders_council'
      ? [
          {
            id: 'elders_submissions' as SubTabId,
            label: t(`የዘርፎች ዕቅድ/ሪፖርት/ደብዳቤ (${submissions.length})`, `All Submissions (${submissions.length})`),
            icon: Send
          }
        ]
      : []),
    ...(unitId === 'elders_council' || unitId === 'office' || unitId === 'spiritual_council'
      ? [
          {
            id: 'plan_dispatch' as SubTabId,
            label: t(`የ${currentYear} ዕቅድ መላኪያ (${planDispatches.length})`, `${currentYear} Plan Dispatcher (${planDispatches.length})`),
            icon: Send
          }
        ]
      : []),
    { id: 'leaders' as SubTabId, label: t(`የመሪዎች ስም ዝርዝር (${(ws.leaders || []).length})`, `Leaders Roster (${(ws.leaders || []).length})`), icon: UserCheck },
    { id: 'members' as SubTabId, label: t(`የአባላት ዝርዝር (${ws.members.length})`, `Members (${ws.members.length})`), icon: Users },
    { id: 'activities' as SubTabId, label: t(`የአገልግሎት ተግባራት (${ws.activities.length})`, `Activities (${ws.activities.length})`), icon: ClipboardList },
    ...(unit.supportsFinance
      ? [{ id: 'finances' as SubTabId, label: t(`ፋይናንስና ሂሳብ (${ws.finances.length})`, `Finance & Budget (${ws.finances.length})`), icon: Wallet }]
      : []),
    {
      id: 'plans' as SubTabId,
      label:
        pendingUnitDispatches.length > 0
          ? t(
              `ዕቅድና ክንውን (${ws.plans.length}) · ${pendingUnitDispatches.length} አዲስ`,
              `Plans & Execution (${ws.plans.length}) · ${pendingUnitDispatches.length} New`
            )
          : t(`ዕቅድና ክንውን (${ws.plans.length})`, `Plans & Execution (${ws.plans.length})`),
      icon: Target
    }
  ];

  return (
    <div className="space-y-6">
      {pendingUnitDispatches.length > 0 && activeSubTab !== 'plans' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs font-extrabold text-amber-950 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {t(
                `ከማዕከል የተላከ ${pendingUnitDispatches.length} አዲስ የ${getUnitLabel(unitId, unit.name)} ዕቅድ መቀበያ ውስጥ ይጠብቃል!`,
                `${pendingUnitDispatches.length} new dispatched plan(s) waiting in ${getUnitLabel(unitId, unit.name)} inbox!`
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('plans')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold cursor-pointer"
          >
            {t('ዕቅዱን ክፈትና ተቀበል →', 'Open & Accept Plan →')}
          </button>
        </div>
      )}
      {/* Department Header & Contextual Breadcrumb */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span>{t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir Kale Heywot Church')}</span>
              {breadcrumb.map((b) => (
                <React.Fragment key={b.id}>
                  <span className="text-slate-300">/</span>
                  {canNavigateToUnit(b.id) && b.id !== unitId ? (
                    <button
                      type="button"
                      onClick={() => onSelectUnit(b.id)}
                      className="hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {getUnitLabel(b.id, b.name)}
                    </button>
                  ) : (
                    <span className={b.id === unitId ? 'text-blue-900 font-bold' : ''}>
                      {getUnitLabel(b.id, b.name)}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {getUnitLabel(unitId, unit.name)}
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl">{getUnitDescLabel(unitId, unit.shortDesc)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handleExportDepartmentExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('Excel አውርድ', 'Export Excel')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
          </div>
        </div>

        {/* Unit KPI Strip */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">{t('የክፍሉ አባላት (ወ/ሴ/ድምር)', 'Department Roster (M/F/Total)')}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {memberCounts.total.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {t('ወንድ', 'Male')} {memberCounts.male} · {t('ሴት', 'Female')} {memberCounts.female}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">{t('የአገልግሎት ተግባራት', 'Ministry Activities')}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {ws.activities.length.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {t('የተጠናቀቁ', 'Completed')} {ws.activities.filter((a) => a.status === 'ተጠናቋል').length}
            </div>
          </div>

          {unit.supportsFinance ? (
            <div>
              <div className="text-xs font-semibold text-slate-500">{t('ቀሪ ሂሳብ (ገቢ − ወጪ)', 'Net Balance (In − Out)')}</div>
              <div
                className={`text-xl font-extrabold tabular-nums mt-1 ${
                  financeSummary.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {financeSummary.balance.toLocaleString()} {t('ብር', 'ETB')}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
                {t('ገቢ', 'In')} {financeSummary.income.toLocaleString()} · {t('ወጪ', 'Out')} {financeSummary.expense.toLocaleString()}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-slate-500">{t('የዋናው ቤተክርስቲያን ቋት', 'Church Master Registry')}</div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
                {churchMembers.length.toLocaleString()}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
                {t('ልጆች (0-14)፦', 'Children (0-14):')} {churchChildren.length.toLocaleString()}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-500">{t(`የዓመት ዕቅድ (${currentYear} ዓ/ም)`, `Annual Plans (${currentYear})`)}</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {ws.plans.length.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">{t('የታቀዱ ዋና ተግባራት', 'Planned Activities')}</div>
          </div>
        </div>

        {/* Sub-page Navigation Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5 print:hidden">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeSubTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveSubTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {unitId === 'elders_council' && (
        <section className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wide">
                {t('የአመራር መዋቅር እና ቋሚ የስብሰባ መርሃግብር', 'Council Charter & Standing Meeting Schedule')}
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
                {t(
                  'የሽማግሌዎች ጉባኤ / ስራ አስፈጻሚዎች (12 አባላት · 11 ወንድ እና 1 ሴት)',
                  'Elders Council / Executive Committee (12 Members · 11 Male & 1 Female)'
                )}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {activeSubTab !== 'members' && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('members')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {t(
                      `የ${ws.members.length}ቱን አባላት ዝርዝር ክፈት`,
                      `Open ${ws.members.length} Council Members`
                    )}
                  </span>
                </button>
              )}
              {ws.members.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const seeded = createDefaultEldersCouncilWorkspaceData();
                    onUpdateDepartmentData('elders_council', (prev) => ({
                      ...prev,
                      members: seeded.members,
                      leaders: (prev.leaders?.length || 0) > 0 ? prev.leaders : seeded.leaders,
                      eldersDefaultSeeded: true
                    }));
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('ነባሪ 12 አባላትን ጫን', 'Load Default 12 Members')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white border border-amber-200/80 rounded-xl p-3.5">
              <div className="text-[11px] font-bold text-slate-500">
                {t('የአባላት ብዛትና ጾታዊ ስብጥር', 'Total Size & Gender Split')}
              </div>
              <div className="text-sm font-extrabold text-slate-900 mt-1 tabular-nums">
                {t('12 አባላት — 11 ወንድ · 1 ሴት', '12 Members — 11 Male · 1 Female')}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
                {t('በመዝገብ ላይ፦', 'Registered:')} {memberCounts.total} ({t('ወ', 'M')} {memberCounts.male} ·{' '}
                {t('ሴ', 'F')} {memberCounts.female})
              </div>
            </div>

            <div className="bg-white border border-amber-200/80 rounded-xl p-3.5">
              <div className="text-[11px] font-bold text-slate-500">
                {t('የውክልና ስብጥር (9 + 1 + 1 + 1)', 'Representation Breakdown (9 + 1 + 1 + 1)')}
              </div>
              <div className="text-[12px] font-bold text-slate-800 mt-1 leading-relaxed">
                {t(
                  '9 የቤተክርስቲያን አባት መሪዎች · 1 ከሴቶች አገልግሎት · 1 ከወጣቶች አገልግሎት · 1 ከመንፈሳዊ ዘርፍ',
                  '9 Church Father Leaders · 1 Women Ministry · 1 Youth Ministry · 1 Spiritual Sector'
                )}
              </div>
            </div>

            <div className="bg-white border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">
                  {t('ቋሚ የስብሰባ ቀን', 'Standing Meeting Schedule')}
                </div>
                <div className="text-sm font-extrabold text-amber-900 mt-0.5">
                  {t('ሐሙስ ምሽት', 'Every Thursday Evening')}
                </div>
                <div className="text-[11px] text-slate-600">
                  {t('የየሳምንቱ ቋሚ የስራ አስፈጻሚዎች ጉባኤ', 'Weekly Standing Executive Council Meeting')}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {syncNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Sub-view: Organizational Child/Descendant Units Overview */}
      {activeSubTab === 'overview' && overviewUnits.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                በ{unit.name} ስር የሚገኙ የአገልግሎት ዘርፎች ({overviewUnits.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                የእያንዳንዱ ክፍል የአባላት፣ የስራ ተግባራት እና የሂሳብ መረጃ በቀጥታ — ክፈት በመጫን ወደ ገጹ ይግቡ
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-left">የአገልግሎት ዘርፍ / ክፍል</th>
                  <th className="py-3 px-4 text-right">አባላት</th>
                  <th className="py-3 px-4 text-right">ተግባራት</th>
                  <th className="py-3 px-4 text-right">ዕቅዶች</th>
                  <th className="py-3 px-4 text-right">ቀሪ ሂሳብ (ብር)</th>
                  <th className="py-3 px-4 text-right">ድርጊት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overviewUnits.map((cu) => {
                  const cData = departmentDataMap[cu.id] || createEmptyDepartmentWorkspaceData();
                  const bal = cData.finances.reduce(
                    (acc, f) => acc + (f.type === 'ገቢ' ? Number(f.amount) || 0 : -(Number(f.amount) || 0)),
                    0
                  );
                  const memberDisplayCount =
                    cu.id === 'children_ministry'
                      ? churchChildren.length
                      : cu.id === 'chapels_dept'
                      ? churchMembers.length
                      : cData.members.length;
                  const canOpen = canNavigateToUnit(cu.id);
                  const relativeIndent = Math.max(0, (cu.level - unit.level - 1) * 16);
                  return (
                    <tr key={cu.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4" style={{ paddingLeft: `${16 + relativeIndent}px` }}>
                        <div className="font-bold text-slate-900">{cu.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{cu.shortDesc}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {memberDisplayCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                        {cData.activities.length.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                        {cData.plans.length.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums text-slate-800">
                        {cu.supportsFinance ? bal.toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canOpen ? (
                          <button
                            type="button"
                            onClick={() => onSelectUnit(cu.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:underline cursor-pointer"
                          >
                            <span>ክፈት</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">ራሱን የቻለ መግቢያ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sub-view: Embedded Church Master Registry (inside 1.1 Office & 1.2 Spiritual Council & 1 Elders) */}
      {activeSubTab === 'church_registry' && unit.hasChurchRegistry && (
        <ChurchMasterTab
          currentYear={currentYear}
          ageReferenceYear={ageReferenceYear}
          churchMembers={churchMembers}
          chapelList={chapelList}
          churchChildren={churchChildren}
          studentsByClass={studentsByClass}
          classList={classList}
          departmentDataMap={departmentDataMap}
          teachers={teachers}
          choirMembers={choirMembers}
          spiritualMembers={spiritualMembers}
          onBatchAddMembers={onBatchAddMembers}
          onAddMember={onAddMember}
          onUpdateMember={onUpdateMember}
          onUpdateEvangelismMemberStatus={(member, nextStatus) =>
            onUpdateDepartmentData('evangelism', (prev) => ({
              ...prev,
              members: syncChurchMemberToEvangelismRecords(
                prev.members || [],
                member,
                nextStatus,
                generateUniqueId
              )
            }))
          }
          onDeleteMember={onDeleteMember}
          onClearChurchMembers={onClearChurchMembers}
          onExtractChildrenToChildrenTab={onExtractChildrenToChildrenTab}
          onBulkIncrementAges={onBulkIncrementAges}
          currentUserRole={currentUserRole}
          nameScriptMode={nameScriptMode}
          onChangeNameScriptMode={onChangeNameScriptMode}
          onOpenTransliterator={onOpenTransliterator}
        />
      )}

      {/* Sub-view: Church Overview Statistics (inside 1.1 Office & 1.2 Spiritual Council & 1 Elders) */}
      {activeSubTab === 'church_stats' && unit.hasChurchRegistry && (
        <ChurchStatisticsDashboardTab
          currentYear={currentYear}
          classList={classList}
          studentsByClass={studentsByClass}
          churchMembers={churchMembers}
          churchChildren={churchChildren}
          chapelList={chapelList}
          departmentDataMap={departmentDataMap}
          teachers={teachers}
          choirMembers={choirMembers}
          spiritualMembers={spiritualMembers}
          childrenPlans={childrenPlans}
          submissions={submissions}
          planDispatches={planDispatches}
          onNavigateUnit={(targetUid) => {
            if (canNavigateToUnit(targetUid)) {
              onSelectUnit(targetUid);
            }
          }}
        />
      )}

      {/* Sub-view: Department Members / Roster */}
      {activeSubTab === 'members' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="ስም፣ ስልክ ወይም ድርሻ ፈልግ..."
                  className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-full"
                />
              </div>
              {unit.roleOptions.length > 0 && (
                <select
                  value={memberRoleFilter}
                  onChange={(e) => setMemberRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-semibold text-slate-700"
                >
                  <option value="all">ሁሉም ምድቦች</option>
                  {unit.roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {unit.churchMemberSyncFilter && (
                <button
                  type="button"
                  onClick={handleSyncFromChurchMaster}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>
                    {unit.churchMemberSyncFilter === 'women_ministry'
                      ? t(
                          `ብቁ ሴቶችን (>29 እና ባለትዳር <29) ከቋት አስገባ (${churchSyncCandidates.length})`,
                          `Sync Eligible Women (${churchSyncCandidates.length})`
                        )
                      : unit.churchMemberSyncFilter === 'women'
                      ? t(`የባል ሚስት የሆኑትን ከቋት አስገባ (${churchSyncCandidates.length})`, `Sync Married Wives (${churchSyncCandidates.length})`)
                      : t(`ከዋናው ቋት አስገባ (${churchSyncCandidates.length})`, `Sync from Registry (${churchSyncCandidates.length})`)}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={openAddMember}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>አዲስ {unit.memberNoun} ጨምር</span>
              </button>
            </div>
          </div>

          {unit.churchMemberSyncFilter === 'women_ministry' && (
            <div className="mx-5 mt-4 bg-pink-50/80 border border-pink-200 text-pink-950 rounded-xl px-4 py-2.5 text-xs font-bold leading-relaxed">
              {t(
                'የሴቶች አገልግሎት ጠቅላላ ጉባኤ ዕድሜያቸው ከ29 ዓመት በላይ የሆኑ የቤተ ክርስቲያኒቱ ሴት አባላትን ያቅፋል፤ ሆኖም ዕድሜያቸው ከ29 ዓመት በታች የሆኑ ባለ ትዳር ሴቶች በአገልግሎቱ መታቀፍ ከፈለጉ አይከለከሉም።',
                'Women Ministry general assembly includes female church members over 29; married women under 29 who wish to join are also welcomed.'
              )}
            </div>
          )}

          {unit.churchMemberSyncFilter === 'women' && (
            <div className="mx-5 mt-4 bg-rose-50/80 border border-rose-200 text-rose-950 rounded-xl px-4 py-2.5 text-xs font-bold">
              {t(
                'ማሳሰቢያ፦ በሴቶች ዘርፍ ውስጥ መካተት ያለባቸው የባል ሚስት የሆኑ (ባለትዳር) ሴቶች ብቻ ናቸው — ሌሎች አይካተቱም።',
                'Note: Only married women (wives) are included in the Women Ministry sector.'
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-4 text-left w-12">ተ.ቁ</th>
                  <th className="py-2.5 px-4 text-left">ሙሉ ስም</th>
                  <th className="py-2.5 px-3 text-left">ጾታ</th>
                  <th className="py-2.5 px-3 text-right">ዕድሜ</th>
                  <th className="py-2.5 px-4 text-left">{unit.roleColumnLabel}</th>
                  <th className="py-2.5 px-4 text-left">ትምህርት / ደረጃ</th>
                  <th className="py-2.5 px-4 text-left">ስልክ</th>
                  <th className="py-2.5 px-3 text-left">ሁኔታ</th>
                  <th className="py-2.5 px-4 text-right print:hidden">ማስተካከያ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <p className="font-semibold text-slate-500">
                        በ{unit.name} ውስጥ ገና ምንም አባል አልተመዘገበም።
                      </p>
                      <button
                        type="button"
                        onClick={openAddMember}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>የመጀመሪያውን መዝገብ ጨምር</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{m.gender}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 tabular-nums">
                        {m.age ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{m.roleOrClass}</td>
                      <td className="py-2.5 px-4 text-slate-600">{m.educationOrLevel || '—'}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">{m.phone || '—'}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{m.status}</td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap print:hidden">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditMember(m)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            title="አስተካክል"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemberRow(m.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="ሰርዝ"
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
      )}

      {/* Sub-view: Department Leaders Name Roster */}
      {activeSubTab === 'leaders' && (
        <UnitLeadersRosterTab
          unitTitle={getUnitLabel(unitId, unit.name)}
          currentYear={currentYear}
          leaders={ws.leaders || []}
          roleSuggestions={unit.roleOptions}
          churchMembers={churchMembers}
          structureNote={
            unitId === 'women_ministry'
              ? t(
                  'የሥራ አስፈጻሚ ኮሚቴ እንደ አስፈላጊነቱ ከ3 እስከ 7 አባላት ይኖረዋል · የሙሉ ጊዜ የሴቶች አገልግሎት አስተባባሪ ተጠሪነቱ ለአጥቢያ መንፈሳዊ ዘርፍ ኃላፊና ለሰብሳቢ ነው · የሰብሳቢው አንድ የምርጫ ዙር ሦስት ዓመት ሲሆን ለሁለተኛ ዙር ከተመረጡ እና አንድ የምርጫ ዙር ከተወረወሩ በኋላ በድጋሚ ሊመረጡ ይችላሉ · በመሪዎች ጉባኤ ላይ በሰብሳቢው አማካይነት በውሳኔ ሰጪነት ይሳተፋል።',
                  'Executive committee has 3–7 members · Full-time coordinator reports to Spiritual Sector Head and Chair · Chair serves a 3-year term (2 consecutive terms, eligible again after 1 rest term) · Participates in Leaders Council decisions through the Chair.'
                )
              : undefined
          }
          onSaveLeaders={(nextLeaders) =>
            onUpdateDepartmentData(unitId, (prev) => ({
              ...prev,
              leaders: nextLeaders
            }))
          }
        />
      )}

      {/* Sub-view: Department Activities / Meetings / Programs */}
      {activeSubTab === 'activities' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="ተግባር፣ ምድብ ወይም ማብራሪያ ፈልግ..."
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-full"
              />
            </div>
            <button
              type="button"
              onClick={openAddActivity}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>አዲስ የአገልግሎት ተግባር መዝግብ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-4 text-left">ቀን</th>
                  <th className="py-2.5 px-4 text-left">ርዕስ / ተግባር</th>
                  <th className="py-2.5 px-4 text-left">ምድብ</th>
                  <th className="py-2.5 px-4 text-left">ቦታ / ቡድን</th>
                  <th className="py-2.5 px-3 text-right">ተሳታፊ</th>
                  <th className="py-2.5 px-3 text-left">ሁኔታ</th>
                  <th className="py-2.5 px-4 text-right print:hidden">ማስተካከያ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <p className="font-semibold text-slate-500">ምንም የአገልግሎት ተግባር አልተመዘገበም።</p>
                      <button
                        type="button"
                        onClick={openAddActivity}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ተግባር መዝግብ</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        <DualDateBadge value={act.date} mode="stacked" showTime />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{act.title}</div>
                        {act.summary && <div className="text-[11px] text-slate-500 mt-0.5">{act.summary}</div>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{act.category}</td>
                      <td className="py-2.5 px-4 text-slate-600">{act.locationOrGroup || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-slate-800">
                        {act.participantsCount ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">{act.status}</td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap print:hidden">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditActivity(act)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
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
      )}

      {/* Sub-view: Finance Ledger (Income / Expense / Balance) */}
      {activeSubTab === 'finances' && unit.supportsFinance && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1">
                {(['all', 'ገቢ', 'ወጪ'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFinanceTypeFilter(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      financeTypeFilter === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {t === 'all' ? 'ሁሉም' : t}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={financeSearch}
                  onChange={(e) => setFinanceSearch(e.target.value)}
                  placeholder="ምድብ፣ መግለጫ ወይም ደረሰኝ ፈልግ..."
                  className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white w-56"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={openAddFinance}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ገቢ / ወጪ መዝግብ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-4 text-left">ቀን</th>
                  <th className="py-2.5 px-3 text-left">ዓይነት</th>
                  <th className="py-2.5 px-4 text-left">የሂሳብ ምድብ</th>
                  <th className="py-2.5 px-4 text-left">መግለጫ</th>
                  <th className="py-2.5 px-4 text-left">ደረሰኝ ቁጥር</th>
                  <th className="py-2.5 px-4 text-right">መጠን (ብር)</th>
                  <th className="py-2.5 px-4 text-right print:hidden">ማስተካከያ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFinances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <p className="font-semibold text-slate-500">ምንም የገቢ ወይም የወጪ መዝገብ የለም።</p>
                      <button
                        type="button"
                        onClick={openAddFinance}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>የመጀመሪያውን የሂሳብ መዝገብ አስገባ</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredFinances.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        <DualDateBadge value={f.date} mode="stacked" showTime />
                      </td>
                      <td
                        className={`py-2.5 px-3 font-extrabold ${
                          f.type === 'ገቢ' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {f.type}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{f.category}</td>
                      <td className="py-2.5 px-4 text-slate-700">{f.description}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{f.receiptOrRef || '—'}</td>
                      <td
                        className={`py-2.5 px-4 text-right font-extrabold tabular-nums ${
                          f.type === 'ገቢ' ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {f.type === 'ወጪ' ? '−' : '+'}
                        {Number(f.amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap print:hidden">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditFinance(f)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFinance(f.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredFinances.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <td colSpan={5} className="py-3 px-4">
                      ጠቅላላ ማጠቃለያ (ገቢ {financeSummary.income.toLocaleString()} ብር · ወጪ{' '}
                      {financeSummary.expense.toLocaleString()} ብር)
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      ቀሪ፦ {financeSummary.balance.toLocaleString()} ብር
                    </td>
                    <td className="print:hidden" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

      {/* Sub-view: Admin HR, Payroll & Assets */}
      {activeSubTab === 'hr' && unitId === 'admin_finance' && (
        <AdminHRPanel
          currentYear={currentYear}
          records={ws.hrRecords || []}
          churchMembers={churchMembers}
          chapelList={chapelList}
          onSaveRecords={(next) =>
            onUpdateDepartmentData(unitId, (prev) => ({ ...prev, hrRecords: next }))
          }
          onOpenPayroll={() => setActiveSubTab('payroll')}
        />
      )}

      {activeSubTab === 'payroll' && unitId === 'admin_finance' && (
        <AdminPayrollPanel
          currentYear={currentYear}
          records={ws.hrRecords || []}
          churchMembers={churchMembers}
          onSaveRecords={(next) =>
            onUpdateDepartmentData(unitId, (prev) => ({ ...prev, hrRecords: next }))
          }
          onRecordFinanceExpense={(entry) =>
            onUpdateDepartmentData(unitId, (prev) => ({
              ...prev,
              finances: [
                {
                  ...entry,
                  id: generateUniqueId()
                },
                ...(prev.finances || [])
              ]
            }))
          }
        />
      )}

      {activeSubTab === 'assets' && unitId === 'admin_finance' && (
        <AdminAssetsPanel
          currentYear={currentYear}
          records={ws.assetRecords || []}
          onSaveRecords={(next) =>
            onUpdateDepartmentData(unitId, (prev) => ({ ...prev, assetRecords: next }))
          }
        />
      )}

      {/* Sub-view: Women Ministry Structure, Accountability, Mandates & Bylaws */}
      {activeSubTab === 'women_charter' && unitId === 'women_ministry' && (
        <WomenCharterPanel
          currentYear={currentYear}
          internalBylaws={ws.womenInternalBylaws || DEFAULT_WOMEN_INTERNAL_BYLAWS_TEXT}
          membersCount={ws.members.length}
          leadersCount={(ws.leaders || []).length}
          plansCount={ws.plans.length}
          onSaveInternalBylaws={(nextText) =>
            onUpdateDepartmentData('women_ministry', (prev) => ({
              ...prev,
              womenInternalBylaws: nextText,
              womenCharterSeeded: true
            }))
          }
          onNavigateTab={(tab) => setActiveSubTab(tab)}
        />
      )}

      {/* Sub-view: Love & Compassion Permanent & Temporary Beneficiaries */}
      {activeSubTab === 'beneficiaries' && unitId === 'love_compassion' && (
        <LazyErrorBoundary compact>
        <Suspense fallback={null}>
          <CompassionBeneficiariesPanel
            currentYear={currentYear}
            records={ws.beneficiaryRecords || []}
            chapelList={chapelList}
            onSaveRecords={(next) =>
              onUpdateDepartmentData(unitId, (prev) => ({ ...prev, beneficiaryRecords: next }))
            }
          />
        </Suspense>
        </LazyErrorBoundary>
      )}

      {/* Sub-view: Evangelism Participation & Percentage Statistics */}
      {activeSubTab === 'evangelism_stats' && unitId === 'evangelism' && (
        <EvangelismParticipationStatsPanel
          currentYear={currentYear}
          churchMembers={churchMembers}
          evangMembers={ws.members}
          onSaveMembers={(nextMembers) =>
            onUpdateDepartmentData('evangelism', (prev) => ({
              ...prev,
              members: nextMembers
            }))
          }
          onOpenAddMember={openAddMember}
        />
      )}

      {/* Sub-view: Evangelism Missionaries (International, National, Regional, Local) */}
      {activeSubTab === 'missionaries' && unitId === 'evangelism' && (
        <LazyErrorBoundary compact>
        <Suspense fallback={null}>
          <EvangelismMissionariesPanel
            currentYear={currentYear}
            records={ws.missionaryRecords || []}
            onSaveRecords={(next) =>
              onUpdateDepartmentData(unitId, (prev) => ({
                ...prev,
                missionaryRecords: next,
                evangelismMissionariesDefaultSeeded: true
              }))
            }
          />
        </Suspense>
        </LazyErrorBoundary>
      )}

      {/* Sub-view: Missionaries Quarterly / Half-Year / Annual Report (Editable in Evangelism, Live View in Spiritual Council & Admin) */}
      {activeSubTab === 'missionary_reports' &&
        (unitId === 'evangelism' ||
          unitId === 'spiritual_council' ||
          unitId === 'admin_finance' ||
          unitId === 'office') && (
          <MissionaryReportsPanel
            currentYear={currentYear}
            missionaries={departmentDataMap.evangelism?.missionaryRecords || []}
            reports={departmentDataMap.evangelism?.missionaryReports || []}
            readOnly={unitId !== 'evangelism'}
            viewerContextLabel={getUnitLabel(unitId, unit.name)}
            onSaveReports={
              unitId === 'evangelism'
                ? (nextReports) =>
                    onUpdateDepartmentData('evangelism', (prev) => ({
                      ...prev,
                      missionaryReports: nextReports
                    }))
                : undefined
            }
            onOpenEvangelismUnit={
              unitId !== 'evangelism' && canNavigateToUnit('evangelism')
                ? () => onSelectUnit('evangelism')
                : undefined
            }
          />
        )}

      {/* Sub-view: Spiritual Council Consolidated Chapels & Ministries Plans/Execution Matrix */}
      {activeSubTab === 'consolidated_plans' && unitId === 'spiritual_council' && (
        <ConsolidatedPlansMatrix
          currentYear={currentYear}
          submissions={submissions}
          departmentDataMap={departmentDataMap}
          childrenPlans={childrenPlans}
          chapelList={chapelList}
          onlyApproved={false}
        />
      )}

      {/* Sub-view: Department Annual Plan & Quarterly Execution */}
      {activeSubTab === 'plans' && (
        <UnifiedPlanManager
          unitId={unitId}
          unitName={getUnitLabel(unitId, unit.name)}
          currentYear={currentYear}
          plans={ws.plans}
          onSavePlans={(nextPlans) =>
            onUpdateDepartmentData(unitId, (prev) => ({ ...prev, plans: nextPlans }))
          }
          onSendToSpiritual={isUnderSpiritualCouncil(unitId) ? onCreateSubmission : undefined}
          planDispatches={planDispatches}
          onAcceptDispatch={onAcceptDispatch}
          onReturnDispatch={onReturnDispatch}
        />
      )}

      {/* Sub-view: Central 2019 Plan Bulk Sender & Sector Distributor */}
      {activeSubTab === 'plan_dispatch' &&
        (unitId === 'elders_council' || unitId === 'office' || unitId === 'spiritual_council') &&
        onDispatchPlans && (
          <LazyErrorBoundary compact>
          <Suspense fallback={null}>
            <PlanBulkSenderPanel
              currentYear={currentYear}
              sentByUnitId={unitId}
              sentByName={getUnitLabel(unitId, unit.name)}
              chapelList={chapelList}
              dispatches={planDispatches}
              onDispatchPlans={onDispatchPlans}
              onDeleteDispatch={onDeleteDispatch}
            />
          </Suspense>
          </LazyErrorBoundary>
        )}

      {/* Sub-view: Send Plans, Reports & Letters to Spiritual Council */}
      {activeSubTab === 'send_to_spiritual' && isUnderSpiritualCouncil(unitId) && (
        <MinistrySubmissionsPanel
          mode="sender"
          unitId={unitId}
          unitName={unit.name}
          currentYear={currentYear}
          submissions={submissions}
          availablePlans={ws.plans}
          activitiesSummaryText={departmentSummaryText}
          onCreateSubmission={onCreateSubmission}
          onResubmitSubmission={onResubmitSubmission}
          onDeleteSubmission={onDeleteSubmission}
        />
      )}

      {/* Sub-view: Spiritual Council Incoming Review Queue */}
      {activeSubTab === 'spiritual_review' && unitId === 'spiritual_council' && (
        <MinistrySubmissionsPanel
          mode="spiritual_council"
          unitId={unitId}
          unitName={unit.name}
          currentYear={currentYear}
          submissions={submissions}
          initialViewFilter="pending"
          onSpiritualApprove={onSpiritualApprove}
          onSpiritualReturn={onSpiritualReturn}
          onForwardToAdmin={onForwardToAdmin}
        />
      )}

      {/* Sub-view: Spiritual Council Permanent Approved Archive */}
      {activeSubTab === 'spiritual_approved' && unitId === 'spiritual_council' && (
        <MinistrySubmissionsPanel
          mode="spiritual_council"
          unitId={unitId}
          unitName={unit.name}
          currentYear={currentYear}
          submissions={submissions}
          initialViewFilter="approved"
          onSpiritualApprove={onSpiritualApprove}
          onSpiritualReturn={onSpiritualReturn}
          onForwardToAdmin={onForwardToAdmin}
        />
      )}

      {/* Sub-view: Spiritual Council — All Sectors Leaders Central Hub */}
      {activeSubTab === 'all_sector_leaders' && unitId === 'spiritual_council' && (
        <SpiritualAllSectorsLeadersTab
          currentYear={currentYear}
          departmentDataMap={departmentDataMap}
          churchMembers={churchMembers}
          onUpdateDepartmentData={onUpdateDepartmentData}
          canNavigateToUnit={canNavigateToUnit}
          onSelectUnit={onSelectUnit}
          onOpenHistoricalArchive={() => setActiveSubTab('historical_leaders')}
        />
      )}

      {/* Sub-view: Spiritual Council — Historical Leaders Service Archive (ዓ/ም · ዘርፍ · ኃላፊነት) */}
      {activeSubTab === 'historical_leaders' && unitId === 'spiritual_council' && (
        <HistoricalLeadersArchiveTab
          currentYear={currentYear}
          chapelList={chapelList}
          churchMembers={churchMembers}
          departmentDataMap={departmentDataMap}
          records={ws.historicalLeaders || []}
          onSaveRecords={(nextRecords) =>
            onUpdateDepartmentData('spiritual_council', (prev) => ({
              ...prev,
              historicalLeaders: nextRecords
            }))
          }
        />
      )}

      {/* Sub-view: Administration Department Spiritual-Approved & Forwarded Archive */}
      {activeSubTab === 'admin_inbox' && (unitId === 'admin_finance' || unitId === 'office') && (
        <div className="space-y-6">
          <ConsolidatedPlansMatrix
            currentYear={currentYear}
            submissions={submissions}
            departmentDataMap={departmentDataMap}
            childrenPlans={childrenPlans}
            chapelList={chapelList}
            onlyApproved={true}
          />
          <MinistrySubmissionsPanel
            mode="admin_dept"
            unitId={unitId}
            unitName={unit.name}
            currentYear={currentYear}
            submissions={submissions}
            initialViewFilter="all"
            onAdminAcknowledge={onAdminAcknowledge}
          />
        </div>
      )}

      {/* Sub-view: Elders Council Full Submissions Oversight */}
      {activeSubTab === 'elders_submissions' && unitId === 'elders_council' && (
        <MinistrySubmissionsPanel
          mode="elders_overview"
          unitId={unitId}
          unitName={unit.name}
          currentYear={currentYear}
          submissions={submissions}
          initialViewFilter="all"
        />
      )}

      {/* Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingMemberId ? `${unit.memberNoun} አስተካክል` : `አዲስ ${unit.memberNoun} ጨምር`}
              </h3>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMember} className="space-y-3 mt-4 text-xs">
              {unit.churchMemberSyncFilter === 'women_ministry' && (
                <div className="bg-pink-50 border border-pink-200 text-pink-950 rounded-xl px-3 py-2 text-[11px] font-bold">
                  {t(
                    'ዕድሜያቸው ከ29 ዓመት በላይ የሆኑ ሴት አባላት እንዲሁም መታቀፍ የሚፈልጉ ከ29 ዓመት በታች ባለትዳር ሴቶች እዚህ ይመዘገባሉ።',
                    'Women over 29 and married women under 29 who wish to join may be registered here.'
                  )}
                </div>
              )}
              {unit.churchMemberSyncFilter === 'women' && (
                <div className="bg-rose-50 border border-rose-200 text-rose-950 rounded-xl px-3 py-2 text-[11px] font-bold">
                  {t(
                    'በሴቶች ዘርፍ ውስጥ የሚመዘገቡት የባል ሚስት የሆኑ (ባለትዳር) ሴቶች ብቻ ናቸው።',
                    'Only married women (wives) may be registered here.'
                  )}
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ሙሉ ስም *</label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ጾታ</label>
                  <select
                    value={
                      unit.churchMemberSyncFilter === 'women' ||
                      unit.churchMemberSyncFilter === 'women_ministry'
                        ? 'ሴ'
                        : mGender
                    }
                    disabled={
                      unit.churchMemberSyncFilter === 'women' ||
                      unit.churchMemberSyncFilter === 'women_ministry'
                    }
                    onChange={(e) => setMGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold disabled:bg-slate-100"
                  >
                    {unit.churchMemberSyncFilter !== 'women' &&
                      unit.churchMemberSyncFilter !== 'women_ministry' && (
                        <option value="ወ">ወንድ</option>
                      )}
                    <option value="ሴ">
                      {unit.churchMemberSyncFilter === 'women'
                        ? 'ሴት (የባል ሚስት)'
                        : 'ሴት'}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ዕድሜ</label>
                  <input
                    type="number"
                    min={0}
                    value={mAge}
                    onChange={(e) => setMAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{unit.roleColumnLabel}</label>
                <input
                  type="text"
                  list="deptRoleSuggestions"
                  value={mRole}
                  onChange={(e) => setMRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
                <datalist id="deptRoleSuggestions">
                  {unit.roleOptions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ትምህርት / ደረጃ</label>
                  <input
                    type="text"
                    value={mEducation}
                    onChange={(e) => setMEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ስልክ ቁጥር</label>
                  <input
                    type="text"
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ሁኔታ</label>
                <select
                  value={mStatus}
                  onChange={(e) => setMStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  {unitId === 'evangelism' ? (
                    <>
                      <option value="እየከፈለ ያለ">አባል — እየከፈለ ያለ</option>
                      <option value="ንቁ">አባል — በአገልግሎት ላይ (ንቁ)</option>
                      <option value="ሙሉ በሙሉ ያቋረጠ">አገልግሎቱን ሙሉ በሙሉ ያቋረጠ</option>
                      <option value="ሙሉ በሙሉ ያልተሳተፈ">በአገልግሎቱ ሙሉ በሙሉ ያልተሳተፈ</option>
                    </>
                  ) : (
                    <>
                      <option value="ንቁ">ንቁ</option>
                      <option value="በእረፍት">በእረፍት</option>
                      <option value="ተመራቂ">ተመራቂ</option>
                      <option value="ተጠናቋል">ተጠናቋል</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ማስታወሻ</label>
                <input
                  type="text"
                  value={mNotes}
                  onChange={(e) => setMNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl cursor-pointer"
                >
                  አስቀምጥ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingActivityId ? 'የአገልግሎት ተግባር አስተካክል' : 'አዲስ የአገልግሎት ተግባር መዝግብ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="space-y-3 mt-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ቀንና ሰዓት *</label>
                  <DualDateInput required includeTime value={aDate} onChange={setADate} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ሁኔታ</label>
                  <select
                    value={aStatus}
                    onChange={(e) =>
                      setAStatus(e.target.value as 'ታቅዷል' | 'በሂደት ላይ' | 'ተጠናቋል')
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ታቅዷል">ታቅዷል</option>
                    <option value="በሂደት ላይ">በሂደት ላይ</option>
                    <option value="ተጠናቋል">ተጠናቋል</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ርዕስ / ተግባር *</label>
                <input
                  type="text"
                  required
                  value={aTitle}
                  onChange={(e) => setATitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ምድብ</label>
                <input
                  type="text"
                  list="deptActivityCatSuggestions"
                  value={aCategory}
                  onChange={(e) => setACategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
                <datalist id="deptActivityCatSuggestions">
                  {unit.activityCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ቦታ / ቡድን</label>
                  <input
                    type="text"
                    value={aLocation}
                    onChange={(e) => setALocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">የተሳታፊ ብዛት</label>
                  <input
                    type="number"
                    min={0}
                    value={aParticipants}
                    onChange={(e) => setAParticipants(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">አጭር ማብራሪያ</label>
                <textarea
                  rows={2}
                  value={aSummary}
                  onChange={(e) => setASummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl cursor-pointer"
                >
                  አስቀምጥ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finance Modal */}
      {isFinanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 border border-slate-200 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingFinanceId ? 'የሂሳብ መዝገብ አስተካክል' : 'አዲስ ገቢ / ወጪ መዝግብ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFinanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFinance} className="space-y-3 mt-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ቀንና ሰዓት *</label>
                  <DualDateInput required includeTime value={fDate} onChange={setFDate} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ዓይነት *</label>
                  <select
                    value={fType}
                    onChange={(e) => setFType(e.target.value as 'ገቢ' | 'ወጪ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ገቢ">ገቢ (Income)</option>
                    <option value="ወጪ">ወጪ (Expense)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">የሂሳብ ምድብ</label>
                <input
                  type="text"
                  list="deptFinanceCatSuggestions"
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
                <datalist id="deptFinanceCatSuggestions">
                  {unit.financeCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">መግለጫ *</label>
                <input
                  type="text"
                  required
                  value={fDescription}
                  onChange={(e) => setFDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">መጠን (ብር) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={fAmount}
                    onChange={(e) => setFAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ደረሰኝ ቁጥር</label>
                  <input
                    type="text"
                    value={fReceipt}
                    onChange={(e) => setFReceipt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFinanceModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl cursor-pointer"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
