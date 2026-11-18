import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
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
  Inbox
} from 'lucide-react';
import {
  AnnualPlanItem,
  ChurchChild,
  ChurchMember,
  DepartmentActivityRecord,
  DepartmentFinanceRecord,
  DepartmentMemberRecord,
  DepartmentWorkspaceData,
  MinistrySubmission,
  OrgUnitId,
  Role,
  Student
} from '../types';
import {
  CHURCH_ORG_UNITS,
  createEmptyDepartmentWorkspaceData,
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

interface DepartmentWorkspacePageProps {
  unitId: OrgUnitId;
  currentYear: string;
  ageReferenceYear?: number;
  currentUserRole: Role;
  departmentDataMap: { [unitId: string]: DepartmentWorkspaceData };
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
}

type SubTabId =
  | 'overview'
  | 'church_registry'
  | 'church_stats'
  | 'members'
  | 'activities'
  | 'finances'
  | 'plans'
  | 'send_to_spiritual'
  | 'spiritual_review'
  | 'spiritual_approved'
  | 'admin_inbox'
  | 'elders_submissions';

export const DepartmentWorkspacePage: React.FC<DepartmentWorkspacePageProps> = ({
  unitId,
  currentYear,
  ageReferenceYear = 2017,
  currentUserRole,
  departmentDataMap,
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
  onAdminAcknowledge
}) => {
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
    if (unit.hasChurchRegistry && unit.kind === 'council_registry') return 'church_registry';
    if (unit.kind === 'governance' || unit.kind === 'special_hub') return 'overview';
    if (unit.kind === 'finance') return 'finances';
    return 'members';
  }, [unit]);

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

  // Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [pTask, setPTask] = useState('');
  const [pUnit, setPUnit] = useState('በቁጥር');
  const [pYearPlan, setPYearPlan] = useState('4');
  const [pQ1Plan, setPQ1Plan] = useState('1');
  const [pQ2Plan, setPQ2Plan] = useState('1');
  const [pQ3Plan, setPQ3Plan] = useState('1');
  const [pQ4Plan, setPQ4Plan] = useState('1');
  const [pQ1Done, setPQ1Done] = useState('0');
  const [pQ2Done, setPQ2Done] = useState('0');
  const [pQ3Done, setPQ3Done] = useState('0');
  const [pQ4Done, setPQ4Done] = useState('0');
  const [pRole, setPRole] = useState('');


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
    return churchMembers.filter((cm) => {
      const g = String(cm.gender || '').trim();
      const ageNum = typeof cm.age === 'number' ? cm.age : parseInt(String(cm.age ?? ''), 10);
      if (unit.churchMemberSyncFilter === 'women') {
        return (g === 'ሴ' || g.includes('ሴት')) && (isNaN(ageNum) || ageNum >= 18);
      }
      if (unit.churchMemberSyncFilter === 'men') {
        return (g === 'ወ' || g.includes('ወንድ')) && (isNaN(ageNum) || ageNum >= 18);
      }
      if (unit.churchMemberSyncFilter === 'youth') {
        return !isNaN(ageNum) && ageNum >= 15 && ageNum <= 29;
      }
      return false;
    });
  }, [churchMembers, unit?.churchMemberSyncFilter]);

  if (!unit) return null;

  const handleSyncFromChurchMaster = () => {
    if (!unit.churchMemberSyncFilter || churchSyncCandidates.length === 0) return;
    const existingNames = new Set(ws.members.map((m) => m.name.trim()));
    const toAdd: DepartmentMemberRecord[] = [];
    churchSyncCandidates.forEach((cm) => {
      const cleanName = String(cm.name || '').trim();
      if (!cleanName || existingNames.has(cleanName)) return;
      existingNames.add(cleanName);
      toAdd.push({
        id: generateUniqueId(),
        name: cleanName,
        gender: cm.gender === 'ሴ' || String(cm.gender).includes('ሴት') ? 'ሴ' : 'ወ',
        age: cm.age,
        phone: cm.phone,
        roleOrClass: unit.roleOptions[unit.roleOptions.length - 1] || 'መደበኛ አባል',
        educationOrLevel: cm.educationLevel,
        status: 'ንቁ',
        notes: cm.chapel ? `ከ${cm.chapel} ቋት` : 'ከዋናው ቋት'
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
    setMGender(unit.churchMemberSyncFilter === 'women' ? 'ሴ' : 'ወ');
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
    const record: DepartmentMemberRecord = {
      id: editingMemberId ?? generateUniqueId(),
      name: mName.trim(),
      gender: mGender,
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
    setADate(new Date().toISOString().split('T')[0]);
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
    setFDate(new Date().toISOString().split('T')[0]);
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

  // Plan CRUD
  const openAddPlan = () => {
    setEditingPlanId(null);
    setPTask('');
    setPUnit('በቁጥር');
    setPYearPlan('4');
    setPQ1Plan('1');
    setPQ2Plan('1');
    setPQ3Plan('1');
    setPQ4Plan('1');
    setPQ1Done('0');
    setPQ2Done('0');
    setPQ3Done('0');
    setPQ4Done('0');
    setPRole(unit.name);
    setIsPlanModalOpen(true);
  };

  const openEditPlan = (p: AnnualPlanItem) => {
    setEditingPlanId(p.id);
    setPTask(p.task);
    setPUnit(p.unit);
    setPYearPlan(String(p.yearPlan));
    setPQ1Plan(String(p.q1Plan));
    setPQ2Plan(String(p.q2Plan));
    setPQ3Plan(String(p.q3Plan));
    setPQ4Plan(String(p.q4Plan));
    setPQ1Done(String(p.q1Done));
    setPQ2Done(String(p.q2Done));
    setPQ3Done(String(p.q3Done));
    setPQ4Done(String(p.q4Done));
    setPRole(p.role);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTask.trim()) return;
    const item: AnnualPlanItem = {
      id: editingPlanId ?? generateUniqueId(),
      task: pTask.trim(),
      unit: pUnit.trim() || 'በቁጥር',
      yearPlan: Number(pYearPlan) || pYearPlan,
      q1Plan: Number(pQ1Plan) || 0,
      q2Plan: Number(pQ2Plan) || 0,
      q3Plan: Number(pQ3Plan) || 0,
      q4Plan: Number(pQ4Plan) || 0,
      q1Done: Number(pQ1Done) || 0,
      q2Done: Number(pQ2Done) || 0,
      q3Done: Number(pQ3Done) || 0,
      q4Done: Number(pQ4Done) || 0,
      role: pRole.trim() || unit.name
    };
    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      plans: editingPlanId
        ? prev.plans.map((p) => (p.id === editingPlanId ? item : p))
        : [...prev.plans, item]
    }));
    setIsPlanModalOpen(false);
  };

  const handleDeletePlan = (id: number) => {
    if (!window.confirm('ይህን የዕቅድ ዝርዝር መሰረዝ ይፈልጋሉ?')) return;
    onUpdateDepartmentData(unitId, (prev) => ({
      ...prev,
      plans: prev.plans.filter((p) => p.id !== id)
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
        a.date,
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
        ['ተ.ቁ', 'ቀን', 'ዓይነት', 'ምድብ', 'መግለጫ', 'መጠን (ብር)', 'ደረሰኝ/ማጣቀሻ'],
        ...ws.finances.map((f, i) => [
          i + 1,
          f.date,
          f.type,
          f.category,
          f.description,
          f.amount,
          f.receiptOrRef || '-'
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(finRows), 'ፋይናንስ');
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
        (s) => s.status === 'forwarded_to_admin' || s.status === 'acknowledged_by_admin'
      ).length,
    [submissions]
  );

  const unitSentCount = useMemo(
    () => submissions.filter((s) => s.senderUnitId === unitId).length,
    [submissions, unitId]
  );

  const departmentSummaryText = useMemo(() => {
    const completedActs = ws.activities.filter((a) => a.status === 'ተጠናቋል').length;
    const recentActs = ws.activities
      .slice(0, 5)
      .map((a, idx) => `${idx + 1}. ${a.title} (${a.date} — ${a.status})`)
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
                ? `የሁሉም ዘርፎች ገጾች (${overviewUnits.length})`
                : unitId === 'spiritual_council'
                ? `በመንፈሳዊ ዘርፍ ስር ያሉ ገጾች (${overviewUnits.length})`
                : 'የመዋቅር ማጠቃለያ',
            icon: BarChart3
          }
        ]
      : []),
    ...(unit.hasChurchRegistry
      ? [
          { id: 'church_registry' as SubTabId, label: 'የቤተክርስቲያን መረጃ ቋት', icon: Database },
          { id: 'church_stats' as SubTabId, label: 'አጠቃላይ ስታቲስቲክስ (ወ/ሴ/ድምር)', icon: BarChart3 }
        ]
      : []),
    ...(unitId === 'spiritual_council'
      ? [
          {
            id: 'spiritual_review' as SubTabId,
            label: `የቀረቡ ዕቅድ/ሪፖርት/ደብዳቤ (${spiritualPendingCount})`,
            icon: Inbox
          },
          {
            id: 'spiritual_approved' as SubTabId,
            label: `የጸደቁ ሰነዶች ማህደር (${spiritualApprovedCount})`,
            icon: CheckCircle2
          }
        ]
      : []),
    ...(isUnderSpiritualCouncil(unitId)
      ? [
          {
            id: 'send_to_spiritual' as SubTabId,
            label: `ለመንፈሳዊ ዘርፍ መላኪያ (${unitSentCount})`,
            icon: Send
          }
        ]
      : []),
    ...(unitId === 'admin_finance' || unitId === 'office'
      ? [
          {
            id: 'admin_inbox' as SubTabId,
            label: `ከመንፈሳዊ ዘርፍ የመጡ (${adminInboxCount})`,
            icon: Inbox
          }
        ]
      : []),
    ...(unitId === 'elders_council'
      ? [
          {
            id: 'elders_submissions' as SubTabId,
            label: `የዘርፎች ዕቅድ/ሪፖርት/ደብዳቤ (${submissions.length})`,
            icon: Send
          }
        ]
      : []),
    { id: 'members' as SubTabId, label: `የአባላት ዝርዝር (${ws.members.length})`, icon: Users },
    { id: 'activities' as SubTabId, label: `የአገልግሎት ተግባራት (${ws.activities.length})`, icon: ClipboardList },
    ...(unit.supportsFinance
      ? [{ id: 'finances' as SubTabId, label: `ፋይናንስና ሂሳብ (${ws.finances.length})`, icon: Wallet }]
      : []),
    { id: 'plans' as SubTabId, label: `የዓመት ዕቅድና ሪፖርት (${ws.plans.length})`, icon: Target }
  ];

  return (
    <div className="space-y-6">
      {/* Department Header & Contextual Breadcrumb */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span>የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን</span>
              {breadcrumb.map((b) => (
                <React.Fragment key={b.id}>
                  <span className="text-slate-300">/</span>
                  {canNavigateToUnit(b.id) && b.id !== unitId ? (
                    <button
                      type="button"
                      onClick={() => onSelectUnit(b.id)}
                      className="hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {b.name}
                    </button>
                  ) : (
                    <span className={b.id === unitId ? 'text-blue-900 font-bold' : ''}>
                      {b.name}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {unit.name}
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl">{unit.shortDesc}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handleExportDepartmentExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel አውርድ</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>አትም</span>
            </button>
          </div>
        </div>

        {/* Unit KPI Strip */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">የክፍሉ አባላት (ወ/ሴ/ድምር)</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {memberCounts.total.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              ወንድ {memberCounts.male} · ሴት {memberCounts.female}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">የአገልግሎት ተግባራት</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {ws.activities.length.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
              የተጠናቀቁ {ws.activities.filter((a) => a.status === 'ተጠናቋል').length}
            </div>
          </div>

          {unit.supportsFinance ? (
            <div>
              <div className="text-xs font-semibold text-slate-500">ቀሪ ሂሳብ (ገቢ − ወጪ)</div>
              <div
                className={`text-xl font-extrabold tabular-nums mt-1 ${
                  financeSummary.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {financeSummary.balance.toLocaleString()} ብር
              </div>
              <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
                ገቢ {financeSummary.income.toLocaleString()} · ወጪ {financeSummary.expense.toLocaleString()}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-slate-500">የዋናው ቤተክርስቲያን ቋት</div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
                {churchMembers.length.toLocaleString()}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
                ልጆች (0-14)፦ {churchChildren.length.toLocaleString()}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-500">የዓመት ዕቅድ ({currentYear} ዓ/ም)</div>
            <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
              {ws.plans.length.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">የታቀዱ ዋና ተግባራት</div>
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
          onBatchAddMembers={onBatchAddMembers}
          onAddMember={onAddMember}
          onUpdateMember={onUpdateMember}
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
        />
      )}

      {/* Sub-view: Department Members / Roster */}
      {activeSubTab === 'members' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="ስም፣ ስልክ ወይም ድርሻ ፈልግ..."
                  className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-56"
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
                  <span>ከዋናው ቋት አስገባ ({churchSyncCandidates.length})</span>
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

      {/* Sub-view: Department Activities / Meetings / Programs */}
      {activeSubTab === 'activities' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="ተግባር፣ ምድብ ወይም ማብራሪያ ፈልግ..."
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-64"
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
                      <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">{act.date}</td>
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
                      <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">{f.date}</td>
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

      {/* Sub-view: Department Annual Plan & Quarterly Execution */}
      {activeSubTab === 'plans' && (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                የ{unit.name} የ{currentYear} ዓ/ም ዕቅድና ሩብ ዓመት ክንውን
              </h3>
            </div>
            <button
              type="button"
              onClick={openAddPlan}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>አዲስ ዕቅድ ጨምር</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3 text-left">ተ.ቁ</th>
                  <th className="py-2.5 px-3 text-left">ዋና ተግባር</th>
                  <th className="py-2.5 px-2 text-left">መለኪያ</th>
                  <th className="py-2.5 px-2 text-right">የዓመቱ ዕቅድ</th>
                  <th className="py-2.5 px-2 text-right">1ኛ ሩብ (ዕ/ክ)</th>
                  <th className="py-2.5 px-2 text-right">2ኛ ሩብ (ዕ/ክ)</th>
                  <th className="py-2.5 px-2 text-right">3ኛ ሩብ (ዕ/ክ)</th>
                  <th className="py-2.5 px-2 text-right">4ኛ ሩብ (ዕ/ክ)</th>
                  <th className="py-2.5 px-3 text-right">ክንውን (%)</th>
                  <th className="py-2.5 px-3 text-right print:hidden">ማስተካከያ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ws.plans.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      <p className="font-semibold text-slate-500">ለ{unit.name} ገና የዓመት ዕቅድ አልተመዘገበም።</p>
                      <button
                        type="button"
                        onClick={openAddPlan}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ዕቅድ ጨምር</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  ws.plans.map((p, idx) => {
                    const yPlan = Number(p.yearPlan) || 0;
                    const totalDone =
                      (Number(p.q1Done) || 0) +
                      (Number(p.q2Done) || 0) +
                      (Number(p.q3Done) || 0) +
                      (Number(p.q4Done) || 0);
                    const pctDone = yPlan > 0 ? Math.round((totalDone / yPlan) * 100) : 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 tabular-nums text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{p.task}</td>
                        <td className="py-2.5 px-2 text-slate-600">{p.unit}</td>
                        <td className="py-2.5 px-2 text-right font-bold tabular-nums">{p.yearPlan}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">
                          {p.q1Plan} / <strong className="text-emerald-700">{p.q1Done}</strong>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums">
                          {p.q2Plan} / <strong className="text-emerald-700">{p.q2Done}</strong>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums">
                          {p.q3Plan} / <strong className="text-emerald-700">{p.q3Done}</strong>
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums">
                          {p.q4Plan} / <strong className="text-emerald-700">{p.q4Done}</strong>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold tabular-nums text-blue-900">
                          {pctDone}%
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditPlan(p)}
                              className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(p.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            >
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
        </section>
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

      {/* Sub-view: Administration Department Forwarded Archive */}
      {activeSubTab === 'admin_inbox' && (unitId === 'admin_finance' || unitId === 'office') && (
        <MinistrySubmissionsPanel
          mode="admin_dept"
          unitId={unitId}
          unitName={unit.name}
          currentYear={currentYear}
          submissions={submissions}
          initialViewFilter="all"
          onAdminAcknowledge={onAdminAcknowledge}
        />
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ጾታ</label>
                  <select
                    value={mGender}
                    onChange={(e) => setMGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">ወንድ</option>
                    <option value="ሴ">ሴት</option>
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
              <div className="grid grid-cols-2 gap-3">
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
                  <option value="ንቁ">ንቁ</option>
                  <option value="በእረፍት">በእረፍት</option>
                  <option value="ተመራቂ">ተመራቂ</option>
                  <option value="ተጠናቋል">ተጠናቋል</option>
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ቀን *</label>
                  <input
                    type="date"
                    required
                    value={aDate}
                    onChange={(e) => setADate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ቀን *</label>
                  <input
                    type="date"
                    required
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
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

      {/* Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingPlanId ? 'የዓመት ዕቅድ አስተካክል' : 'አዲስ የዓመት ዕቅድ ጨምር'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ዋና ተግባር *</label>
                <input
                  type="text"
                  required
                  value={pTask}
                  onChange={(e) => setPTask(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">መለኪያ</label>
                  <input
                    type="text"
                    value={pUnit}
                    onChange={(e) => setPUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">የዓመቱ ዕቅድ</label>
                  <input
                    type="number"
                    value={pYearPlan}
                    onChange={(e) => setPYearPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ኃላፊ</label>
                  <input
                    type="text"
                    value={pRole}
                    onChange={(e) => setPRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">1ኛ ሩብ ዕቅድ</label>
                  <input
                    type="number"
                    value={pQ1Plan}
                    onChange={(e) => setPQ1Plan(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                  <label className="block font-bold text-emerald-700 mt-1 mb-0.5">ክንውን</label>
                  <input
                    type="number"
                    value={pQ1Done}
                    onChange={(e) => setPQ1Done(e.target.value)}
                    className="w-full px-2 py-1.5 border border-emerald-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">2ኛ ሩብ ዕቅድ</label>
                  <input
                    type="number"
                    value={pQ2Plan}
                    onChange={(e) => setPQ2Plan(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                  <label className="block font-bold text-emerald-700 mt-1 mb-0.5">ክንውን</label>
                  <input
                    type="number"
                    value={pQ2Done}
                    onChange={(e) => setPQ2Done(e.target.value)}
                    className="w-full px-2 py-1.5 border border-emerald-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">3ኛ ሩብ ዕቅድ</label>
                  <input
                    type="number"
                    value={pQ3Plan}
                    onChange={(e) => setPQ3Plan(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                  <label className="block font-bold text-emerald-700 mt-1 mb-0.5">ክንውን</label>
                  <input
                    type="number"
                    value={pQ3Done}
                    onChange={(e) => setPQ3Done(e.target.value)}
                    className="w-full px-2 py-1.5 border border-emerald-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">4ኛ ሩብ ዕቅድ</label>
                  <input
                    type="number"
                    value={pQ4Plan}
                    onChange={(e) => setPQ4Plan(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg"
                  />
                  <label className="block font-bold text-emerald-700 mt-1 mb-0.5">ክንውን</label>
                  <input
                    type="number"
                    value={pQ4Done}
                    onChange={(e) => setPQ4Done(e.target.value)}
                    className="w-full px-2 py-1.5 border border-emerald-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
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
    </div>
  );
};
