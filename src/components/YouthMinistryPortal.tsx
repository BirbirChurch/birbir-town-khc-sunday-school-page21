import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { formatDualDateTimeText, getTodayIsoDateTime } from '../utils/ethiopianDate';
import { DualDateBadge, DualDateInput } from './DualDate';
import {
  Shield,
  Users,
  Music,
  Mic2,
  BookOpen,
  ClipboardList,
  Wallet,
  Target,
  Send,
  Inbox,
  Plus,
  Search,
  Download,
  Upload,
  Printer,
  Edit2,
  Trash2,
  X,
  UserPlus,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ArrowUpRight,
  FolderPlus,
  Sparkles,
  FileText
} from 'lucide-react';
import {
  AnnualPlanItem,
  ChurchMember,
  DepartmentActivityRecord,
  DepartmentFinanceRecord,
  DepartmentMemberRecord,
  DepartmentWorkspaceData,
  MinistrySubmission,
  OrgUnitId,
  PlanDispatchItem,
  Role,
  YouthGroupMemberRecord
} from '../types';
import {
  DEFAULT_YOUTH_CHOIR_GROUPS,
  DEFAULT_YOUTH_DISCIPLESHIP_GROUPS,
  createEmptyDepartmentWorkspaceData,
  getOrgUnitById
} from '../constants/churchStructure';
import { generateUniqueId } from '../utils/idGenerator';
import { downloadCSV, readCSVFile } from '../utils/csv';
import { useLanguage } from '../context/LanguageContext';
import { UnifiedPlanManager } from './UnifiedPlanManager';
import { MinistrySubmissionsPanel } from './MinistrySubmissionsPanel';
import { UnitLeadersRosterTab } from './UnitLeadersRosterTab';

interface YouthMinistryPortalProps {
  currentYear: string;
  currentUserRole: Role;
  departmentDataMap: { [unitId: string]: DepartmentWorkspaceData };
  onUpdateDepartmentData: (
    unitId: OrgUnitId,
    updater: (prev: DepartmentWorkspaceData) => DepartmentWorkspaceData
  ) => void;
  churchMembers: ChurchMember[];
  chapelList: string[];
  submissions?: MinistrySubmission[];
  onCreateSubmission?: (
    payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>
  ) => void;
  onResubmitSubmission?: (id: number, updates: Partial<MinistrySubmission>) => void;
  onDeleteSubmission?: (id: number) => void;
  planDispatches?: PlanDispatchItem[];
  onAcceptDispatch?: (dispatchId: number, mode: 'append' | 'replace') => void;
  onReturnDispatch?: (dispatchId: number, note: string) => void;
  youthCoordinatorPin?: string;
  youthLeaderPin?: string;
  onSaveYouthPins?: (coordinatorPin: string, leaderPin: string) => void;
}

type YouthSubTabId =
  | 'coordinatorTab'
  | 'leadersTab'
  | 'choirsTab'
  | 'worshipLeadersTab'
  | 'discipleshipTab'
  | 'membersTab'
  | 'activitiesTab'
  | 'financesTab'
  | 'plansTab'
  | 'submissionsTab';

const WORSHIP_LEADER_ROLES = [
  'ዋና የመዝሙር መሪ',
  'ምክትል የመዝሙር መሪ',
  'የአምልኮ መሪ',
  'የሙዚቃ መሳሪያ ተጫዋች',
  'የድምጽና ቴክኒክ ክፍል',
  'መደበኛ አባል'
];

const DISCIPLESHIP_STATUSES = ['በመማር ላይ', 'የጨረሰ / ተመራቂ', 'ለጊዜው ያቆመ'];

export const YouthMinistryPortal: React.FC<YouthMinistryPortalProps> = ({
  currentYear,
  currentUserRole,
  departmentDataMap,
  onUpdateDepartmentData,
  churchMembers,
  chapelList,
  submissions = [],
  onCreateSubmission,
  onResubmitSubmission,
  onDeleteSubmission,
  planDispatches = [],
  onAcceptDispatch,
  onReturnDispatch,
  youthCoordinatorPin = '3214',
  youthLeaderPin = '3204',
  onSaveYouthPins
}) => {
  const { t, unitName } = useLanguage();
  const unit = getOrgUnitById('youth_ministry')!;
  const isCoordinatorOrAdmin =
    currentUserRole === 'admin' || currentUserRole === 'youth_coordinator';

  const ws: DepartmentWorkspaceData = useMemo(
    () => departmentDataMap.youth_ministry || createEmptyDepartmentWorkspaceData(),
    [departmentDataMap]
  );

  const choirGroups = useMemo(() => {
    const custom = Array.isArray(ws.youthChoirGroups) ? ws.youthChoirGroups : [];
    const merged = [...DEFAULT_YOUTH_CHOIR_GROUPS];
    custom.forEach((g) => {
      const clean = String(g || '').trim();
      if (clean && !merged.includes(clean)) merged.push(clean);
    });
    return merged;
  }, [ws.youthChoirGroups]);

  const discipleshipGroups = useMemo(() => {
    const custom = Array.isArray(ws.youthDiscipleshipGroups) ? ws.youthDiscipleshipGroups : [];
    const merged = [...DEFAULT_YOUTH_DISCIPLESHIP_GROUPS];
    custom.forEach((g) => {
      const clean = String(g || '').trim();
      if (clean && !merged.includes(clean)) merged.push(clean);
    });
    return merged;
  }, [ws.youthDiscipleshipGroups]);

  const choirMembers = useMemo(() => ws.youthChoirMembers || [], [ws.youthChoirMembers]);
  const worshipLeaders = useMemo(() => ws.youthWorshipLeaders || [], [ws.youthWorshipLeaders]);
  const discipleshipMembers = useMemo(
    () => ws.youthDiscipleshipMembers || [],
    [ws.youthDiscipleshipMembers]
  );

  const [activeTab, setActiveTab] = useState<YouthSubTabId>(() =>
    isCoordinatorOrAdmin ? 'coordinatorTab' : 'leadersTab'
  );

  const [statusNotice, setStatusNotice] = useState<string>('');
  const notify = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(''), 5000);
  };

  // Coordinator PIN & Directives state
  const [coordPinInput, setCoordPinInput] = useState(youthCoordinatorPin);
  const [leaderPinInput, setLeaderPinInput] = useState(youthLeaderPin);
  const [showCoordPin, setShowCoordPin] = useState(false);
  const [showLeadPin, setShowLeadPin] = useState(false);
  const [coordNotesInput, setCoordNotesInput] = useState(ws.youthCoordinatorNotes || '');

  useEffect(() => {
    setCoordPinInput(youthCoordinatorPin);
  }, [youthCoordinatorPin]);

  useEffect(() => {
    setLeaderPinInput(youthLeaderPin);
  }, [youthLeaderPin]);

  useEffect(() => {
    setCoordNotesInput(ws.youthCoordinatorNotes || '');
  }, [ws.youthCoordinatorNotes]);

  // Choir Fellowship state
  const [selectedChoirGroup, setSelectedChoirGroup] = useState<string>(DEFAULT_YOUTH_CHOIR_GROUPS[0]);
  const [choirSearch, setChoirSearch] = useState('');
  const [showNewChoirGroupModal, setShowNewChoirGroupModal] = useState(false);
  const [newChoirGroupName, setNewChoirGroupName] = useState('');

  // Discipleship state
  const [selectedDiscipleshipGroup, setSelectedDiscipleshipGroup] = useState<string>(
    DEFAULT_YOUTH_DISCIPLESHIP_GROUPS[0]
  );
  const [discipleshipSearch, setDiscipleshipSearch] = useState('');
  const [showNewDiscipleshipModal, setShowNewDiscipleshipModal] = useState(false);
  const [newDiscipleshipName, setNewDiscipleshipName] = useState('');

  // Worship Leaders state
  const [worshipSearch, setWorshipSearch] = useState('');
  const [worshipRoleFilter, setWorshipRoleFilter] = useState<string>('all');

  // Shared Youth Group Member Modal (works for Choir, Worship Leaders, Discipleship)
  const [groupModalContext, setGroupModalContext] = useState<
    'choir' | 'worship' | 'discipleship' | null
  >(null);
  const [editingGroupMemberId, setEditingGroupMemberId] = useState<number | null>(null);
  const [gName, setGName] = useState('');
  const [gGender, setGGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [gAge, setGAge] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gChapel, setGChapel] = useState('');
  const [gGroup, setGGroup] = useState('');
  const [gRoleTitle, setGRoleTitle] = useState('');
  const [gStatus, setGStatus] = useState('ንቁ');
  const [gNotes, setGNotes] = useState('');

  // Quick-Pick from Youth Members modal
  const [pickContext, setPickContext] = useState<'choir' | 'worship' | 'discipleship' | null>(null);
  const [pickSearch, setPickSearch] = useState('');
  const [selectedPickIds, setSelectedPickIds] = useState<Set<string>>(new Set());

  // Youth Registry Members state
  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [mName, setMName] = useState('');
  const [mGender, setMGender] = useState<'ወ' | 'ሴ'>('ወ');
  const [mAge, setMAge] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mRole, setMRole] = useState(unit.roleOptions[0] || 'አባል');
  const [mEducation, setMEducation] = useState('');
  const [mStatus, setMStatus] = useState('ንቁ');
  const [mNotes, setMNotes] = useState('');

  // Activities state
  const [activitySearch, setActivitySearch] = useState('');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [aDate, setADate] = useState(() => new Date().toISOString().split('T')[0]);
  const [aTitle, setATitle] = useState('');
  const [aCategory, setACategory] = useState(unit.activityCategories[0] || 'የወጣቶች አምልኮ');
  const [aLocation, setALocation] = useState('');
  const [aParticipants, setAParticipants] = useState('');
  const [aStatus, setAStatus] = useState<'ታቅዷል' | 'በሂደት ላይ' | 'ተጠናቋል'>('ተጠናቋል');
  const [aSummary, setASummary] = useState('');

  // Finances state
  const [financeSearch, setFinanceSearch] = useState('');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<'all' | 'ገቢ' | 'ወጪ'>('all');
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [editingFinanceId, setEditingFinanceId] = useState<number | null>(null);
  const [fDate, setFDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fType, setFType] = useState<'ገቢ' | 'ወጪ'>('ገቢ');
  const [fCategory, setFCategory] = useState(unit.financeCategories[0] || 'የወጣቶች መዋጮ');
  const [fDesc, setFDesc] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fRef, setFRef] = useState('');

  // Pending 2019 dispatched plans for youth_ministry
  const pendingDispatches = useMemo(
    () =>
      (planDispatches || []).filter(
        (d) => d.targetUnitId === 'youth_ministry' && d.status === 'pending'
      ),
    [planDispatches]
  );

  // Youth candidates (ages 15-29 or marked isYouth) from Church Master Registry
  const youthChurchCandidates = useMemo(() => {
    return churchMembers.filter((cm) => {
      const ageNum = typeof cm.age === 'number' ? cm.age : parseInt(String(cm.age ?? ''), 10);
      return Boolean(cm.isYouth) || (!isNaN(ageNum) && ageNum >= 15 && ageNum <= 29);
    });
  }, [churchMembers]);

  // Combined pickable youth pool (ws.members + church youth)
  const pickPool = useMemo(() => {
    const map = new Map<
      string,
      { key: string; name: string; gender: 'ወ' | 'ሴ'; age?: number | string; phone?: string; chapel?: string }
    >();
    ws.members.forEach((m) => {
      const clean = m.name.trim();
      if (!clean) return;
      map.set(clean, {
        key: `ws_${m.id}`,
        name: clean,
        gender: m.gender === 'ሴ' ? 'ሴ' : 'ወ',
        age: m.age,
        phone: m.phone
      });
    });
    youthChurchCandidates.forEach((cm) => {
      const clean = String(cm.name || '').trim();
      if (!clean || map.has(clean)) return;
      map.set(clean, {
        key: `cm_${cm.id}`,
        name: clean,
        gender: cm.gender === 'ሴ' || String(cm.gender).includes('ሴት') ? 'ሴ' : 'ወ',
        age: cm.age,
        phone: cm.phone,
        chapel: cm.chapel
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'am'));
  }, [ws.members, youthChurchCandidates]);

  // Finance totals
  const totalIncome = useMemo(
    () => ws.finances.filter((f) => f.type === 'ገቢ').reduce((s, f) => s + (Number(f.amount) || 0), 0),
    [ws.finances]
  );
  const totalExpense = useMemo(
    () => ws.finances.filter((f) => f.type === 'ወጪ').reduce((s, f) => s + (Number(f.amount) || 0), 0),
    [ws.finances]
  );
  const netBalance = totalIncome - totalExpense;

  // Filtered lists
  const filteredChoirMembers = useMemo(() => {
    const q = choirSearch.trim().toLowerCase();
    return choirMembers.filter((m) => {
      if (m.group !== selectedChoirGroup) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.chapel || '').toLowerCase().includes(q) ||
        (m.roleTitle || '').toLowerCase().includes(q)
      );
    });
  }, [choirMembers, selectedChoirGroup, choirSearch]);

  const filteredWorshipLeaders = useMemo(() => {
    const q = worshipSearch.trim().toLowerCase();
    return worshipLeaders.filter((m) => {
      if (worshipRoleFilter !== 'all' && (m.roleTitle || 'መደበኛ አባል') !== worshipRoleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.roleTitle || '').toLowerCase().includes(q) ||
        (m.chapel || '').toLowerCase().includes(q)
      );
    });
  }, [worshipLeaders, worshipSearch, worshipRoleFilter]);

  const filteredDiscipleshipMembers = useMemo(() => {
    const q = discipleshipSearch.trim().toLowerCase();
    return discipleshipMembers.filter((m) => {
      if (m.group !== selectedDiscipleshipGroup) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.chapel || '').toLowerCase().includes(q) ||
        (m.status || '').toLowerCase().includes(q)
      );
    });
  }, [discipleshipMembers, selectedDiscipleshipGroup, discipleshipSearch]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return ws.members;
    return ws.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.roleOrClass || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q)
    );
  }, [ws.members, memberSearch]);

  const filteredActivities = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    return [...ws.activities]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .filter(
        (a) =>
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.locationOrGroup || '').toLowerCase().includes(q)
      );
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

  // Coordinator PIN & Directives Handlers
  const handleSavePinsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveYouthPins) return;
    const cPin = coordPinInput.trim();
    const lPin = leaderPinInput.trim();
    if (!cPin || !lPin) {
      notify(t('እባክዎን የአስተባባሪ እና የመሪዎች PIN ቁጥሮችን ያስገቡ!', 'Please enter both Coordinator and Leaders PINs!'));
      return;
    }
    onSaveYouthPins(cPin, lPin);
    notify(
      t(
        '✓ የወጣቶች አገልግሎት አስተባባሪ እና የመሪዎች ገጽ PIN ቁልፎች ተቀምጠዋል!',
        'Youth Coordinator & Leaders PINs saved successfully!'
      )
    );
  };

  const handleSaveCoordinatorNotes = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDepartmentData('youth_ministry', (prev) => ({
      ...prev,
      youthCoordinatorNotes: coordNotesInput.trim()
    }));
    notify(
      t(
        '✓ የአስተባባሪ መመሪያ እና ማስታወሻ በመሪዎች ገጽ ላይ እንዲታይ ተቀምጧል!',
        'Coordinator guidance saved and shared to Leaders Page!'
      )
    );
  };

  // Sync youth from Church Master Registry
  const handleSyncFromChurchMaster = () => {
    if (youthChurchCandidates.length === 0) {
      notify(t('በዋናው ቋት ውስጥ ዕድሜያቸው 15–29 የሆኑ ወጣቶች አልተገኙም።', 'No youth (ages 15–29) found in master registry.'));
      return;
    }
    const existingNames = new Set(ws.members.map((m) => m.name.trim()));
    const toAdd: DepartmentMemberRecord[] = [];
    youthChurchCandidates.forEach((cm) => {
      const cleanName = String(cm.name || '').trim();
      if (!cleanName || existingNames.has(cleanName)) return;
      existingNames.add(cleanName);
      toAdd.push({
        id: generateUniqueId(),
        name: cleanName,
        gender: cm.gender === 'ሴ' || String(cm.gender).includes('ሴት') ? 'ሴ' : 'ወ',
        age: cm.age,
        phone: cm.phone,
        roleOrClass: cm.youthMinistryRole || 'አባል',
        educationOrLevel: cm.educationLevel,
        status: 'ንቁ',
        notes: cm.chapel ? `ከ${cm.chapel} ቋት` : 'ከዋናው ቋት'
      });
    });

    if (toAdd.length === 0) {
      notify(t('ሁሉም ወጣት አባላት ቀድሞውኑ በዝርዝሩ ውስጥ ተካተዋል።', 'All youth candidates are already in the Youth list.'));
      return;
    }
    onUpdateDepartmentData('youth_ministry', (prev) => ({
      ...prev,
      members: [...prev.members, ...toAdd]
    }));
    notify(
      t(
        `✓ ${toAdd.length} ወጣት አባላት ከዋናው ቋት ወደ የወጣቶች አገልግሎት ገብተዋል!`,
        `${toAdd.length} youth members synced from Master Registry!`
      )
    );
  };

  // Choir / Worship / Discipleship Group Member CRUD
  const openAddGroupMember = (ctx: 'choir' | 'worship' | 'discipleship') => {
    setGroupModalContext(ctx);
    setEditingGroupMemberId(null);
    setGName('');
    setGGender(ctx === 'choir' && selectedChoirGroup === 'ሴቶች መዘመራን' ? 'ሴ' : 'ወ');
    setGAge('');
    setGPhone('');
    setGChapel('');
    setGGroup(
      ctx === 'choir'
        ? selectedChoirGroup
        : ctx === 'discipleship'
        ? selectedDiscipleshipGroup
        : 'የመዝሙር መሪዎች ህብረት'
    );
    setGRoleTitle(
      ctx === 'worship'
        ? WORSHIP_LEADER_ROLES[0]
        : ctx === 'discipleship'
        ? ''
        : 'መዘምር'
    );
    setGStatus(ctx === 'discipleship' ? DISCIPLESHIP_STATUSES[0] : 'ንቁ');
    setGNotes('');
  };

  const openEditGroupMember = (
    ctx: 'choir' | 'worship' | 'discipleship',
    rec: YouthGroupMemberRecord
  ) => {
    setGroupModalContext(ctx);
    setEditingGroupMemberId(rec.id);
    setGName(rec.name);
    setGGender(rec.gender === 'ሴ' ? 'ሴ' : 'ወ');
    setGAge(rec.age !== undefined ? String(rec.age) : '');
    setGPhone(rec.phone || '');
    setGChapel(rec.chapel || '');
    setGGroup(rec.group || '');
    setGRoleTitle(rec.roleTitle || '');
    setGStatus(rec.status || (ctx === 'discipleship' ? DISCIPLESHIP_STATUSES[0] : 'ንቁ'));
    setGNotes(rec.notes || '');
  };

  const handleSaveGroupMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupModalContext || !gName.trim()) return;

    const record: YouthGroupMemberRecord = {
      id: editingGroupMemberId ?? generateUniqueId(),
      name: gName.trim(),
      gender: gGender,
      age: gAge.trim() ? Number(gAge) || gAge.trim() : undefined,
      phone: gPhone.trim() || undefined,
      chapel: gChapel.trim() || undefined,
      group:
        groupModalContext === 'choir'
          ? gGroup || selectedChoirGroup
          : groupModalContext === 'discipleship'
          ? gGroup || selectedDiscipleshipGroup
          : 'የመዝሙር መሪዎች ህብረት',
      roleTitle: gRoleTitle.trim() || undefined,
      status: gStatus.trim() || undefined,
      joinDate: new Date().toISOString().split('T')[0],
      notes: gNotes.trim() || undefined
    };

    onUpdateDepartmentData('youth_ministry', (prev) => {
      if (groupModalContext === 'choir') {
        const list = prev.youthChoirMembers || [];
        return {
          ...prev,
          youthChoirMembers: editingGroupMemberId
            ? list.map((item) => (item.id === editingGroupMemberId ? record : item))
            : [...list, record]
        };
      }
      if (groupModalContext === 'worship') {
        const list = prev.youthWorshipLeaders || [];
        return {
          ...prev,
          youthWorshipLeaders: editingGroupMemberId
            ? list.map((item) => (item.id === editingGroupMemberId ? record : item))
            : [...list, record]
        };
      }
      const list = prev.youthDiscipleshipMembers || [];
      return {
        ...prev,
        youthDiscipleshipMembers: editingGroupMemberId
          ? list.map((item) => (item.id === editingGroupMemberId ? record : item))
          : [...list, record]
      };
    });

    setGroupModalContext(null);
    notify(t('✓ መረጃው በተሳካ ሁኔታ ተቀምጧል!', 'Record saved successfully!'));
  };

  const handleDeleteGroupMember = (
    ctx: 'choir' | 'worship' | 'discipleship',
    id: number
  ) => {
    onUpdateDepartmentData('youth_ministry', (prev) => {
      if (ctx === 'choir') {
        return {
          ...prev,
          youthChoirMembers: (prev.youthChoirMembers || []).filter((m) => m.id !== id)
        };
      }
      if (ctx === 'worship') {
        return {
          ...prev,
          youthWorshipLeaders: (prev.youthWorshipLeaders || []).filter((m) => m.id !== id)
        };
      }
      return {
        ...prev,
        youthDiscipleshipMembers: (prev.youthDiscipleshipMembers || []).filter((m) => m.id !== id)
      };
    });
  };

  // Create custom choir or discipleship track
  const handleAddChoirGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newChoirGroupName.trim();
    if (!clean) return;
    if (!choirGroups.includes(clean)) {
      onUpdateDepartmentData('youth_ministry', (prev) => ({
        ...prev,
        youthChoirGroups: [...choirGroups, clean]
      }));
    }
    setSelectedChoirGroup(clean);
    setNewChoirGroupName('');
    setShowNewChoirGroupModal(false);
    notify(t(`✓ "${clean}" የመዘምራን ህብረት ተፈጥሯል!`, `Choir group "${clean}" added!`));
  };

  const handleAddDiscipleshipGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDiscipleshipName.trim();
    if (!clean) return;
    if (!discipleshipGroups.includes(clean)) {
      onUpdateDepartmentData('youth_ministry', (prev) => ({
        ...prev,
        youthDiscipleshipGroups: [...discipleshipGroups, clean]
      }));
    }
    setSelectedDiscipleshipGroup(clean);
    setNewDiscipleshipName('');
    setShowNewDiscipleshipModal(false);
    notify(t(`✓ "${clean}" የደቀ መዝሙርነት ትምህርት ተፈጥሯል!`, `Discipleship course "${clean}" added!`));
  };

  // Quick Pick Youth from Pool
  const openQuickPick = (ctx: 'choir' | 'worship' | 'discipleship') => {
    setPickContext(ctx);
    setPickSearch('');
    setSelectedPickIds(new Set());
  };

  const handleConfirmQuickPick = () => {
    if (!pickContext || selectedPickIds.size === 0) return;
    const chosen = pickPool.filter((p) => selectedPickIds.has(p.key));
    const targetGroup =
      pickContext === 'choir'
        ? selectedChoirGroup
        : pickContext === 'discipleship'
        ? selectedDiscipleshipGroup
        : 'የመዝሙር መሪዎች ህብረት';

    onUpdateDepartmentData('youth_ministry', (prev) => {
      const targetArray =
        pickContext === 'choir'
          ? prev.youthChoirMembers || []
          : pickContext === 'worship'
          ? prev.youthWorshipLeaders || []
          : prev.youthDiscipleshipMembers || [];

      const existingInGroup = new Set(
        targetArray
          .filter((m) => (pickContext === 'worship' ? true : m.group === targetGroup))
          .map((m) => m.name.trim())
      );

      const additions: YouthGroupMemberRecord[] = [];
      chosen.forEach((p) => {
        if (existingInGroup.has(p.name)) return;
        additions.push({
          id: generateUniqueId(),
          name: p.name,
          gender: p.gender,
          age: p.age,
          phone: p.phone,
          chapel: p.chapel,
          group: targetGroup,
          roleTitle:
            pickContext === 'worship'
              ? 'የመዝሙር መሪ'
              : pickContext === 'choir'
              ? 'መዘምር'
              : undefined,
          status: pickContext === 'discipleship' ? 'በመማር ላይ' : 'ንቁ',
          joinDate: new Date().toISOString().split('T')[0]
        });
      });

      if (pickContext === 'choir') {
        return { ...prev, youthChoirMembers: [...targetArray, ...additions] };
      }
      if (pickContext === 'worship') {
        return { ...prev, youthWorshipLeaders: [...targetArray, ...additions] };
      }
      return { ...prev, youthDiscipleshipMembers: [...targetArray, ...additions] };
    });

    notify(
      t(
        `✓ ${chosen.length} ወጣቶች ወደ "${targetGroup}" ተመድበዋል!`,
        `${chosen.length} youth added to "${targetGroup}"!`
      )
    );
    setPickContext(null);
  };

  // CSV Export / Import helpers for Choir, Worship Leaders, and Discipleship
  const handleExportGroupCSV = (ctx: 'choir' | 'worship' | 'discipleship') => {
    const list =
      ctx === 'choir'
        ? filteredChoirMembers
        : ctx === 'worship'
        ? filteredWorshipLeaders
        : filteredDiscipleshipMembers;
    const title =
      ctx === 'choir'
        ? selectedChoirGroup
        : ctx === 'worship'
        ? 'የመዝሙር_መሪዎች_ህብረት'
        : selectedDiscipleshipGroup;

    let csv = '\uFEFFተ.ቁ,ሙሉ ስም,ፆታ,ዕድሜ,ስልክ,ቻፕል,ቡድን/ትምህርት,ድርሻ/ሁኔታ\n';
    list.forEach((m, idx) => {
      csv += `${idx + 1},"${m.name}","${m.gender}","${m.age ?? ''}","${m.phone || ''}","${m.chapel || ''}","${m.group}","${m.roleTitle || m.status || ''}"\n`;
    });
    downloadCSV(csv, `የወጣቶች_${title}_ዝርዝር.csv`);
  };

  const handleImportGroupCSV = async (
    ctx: 'choir' | 'worship' | 'discipleship',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readCSVFile(file);
      if (rows.length <= 1) {
        notify(t('የተመረጠው ፋይል ባዶ ነው።', 'Selected file has no data rows.'));
        e.target.value = '';
        return;
      }
      const startIdx = rows[0][0]?.includes('ተ.ቁ') || rows[0][1]?.includes('ስም') ? 1 : 0;
      const targetGroup =
        ctx === 'choir'
          ? selectedChoirGroup
          : ctx === 'discipleship'
          ? selectedDiscipleshipGroup
          : 'የመዝሙር መሪዎች ህብረት';

      const additions: YouthGroupMemberRecord[] = [];
      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 2) continue;
        const nameVal = (cols[1] || cols[0] || '').trim();
        if (!nameVal) continue;
        const genderRaw = (cols[2] || '').trim();
        const genderVal: 'ወ' | 'ሴ' =
          genderRaw === 'ሴ' || genderRaw.includes('ሴት') || genderRaw.toLowerCase().startsWith('f')
            ? 'ሴ'
            : 'ወ';
        const ageVal = (cols[3] || '').trim();
        const phoneVal = (cols[4] || '').trim();
        const chapelVal = (cols[5] || '').trim();
        const groupVal = (cols[6] || '').trim() || targetGroup;
        const roleOrStatus = (cols[7] || '').trim();

        additions.push({
          id: generateUniqueId(),
          name: nameVal,
          gender: genderVal,
          age: ageVal || undefined,
          phone: phoneVal || undefined,
          chapel: chapelVal || undefined,
          group: ctx === 'worship' ? 'የመዝሙር መሪዎች ህብረት' : groupVal,
          roleTitle: ctx === 'worship' ? roleOrStatus || 'የመዝሙር መሪ' : ctx === 'choir' ? roleOrStatus || 'መዘምር' : undefined,
          status: ctx === 'discipleship' ? roleOrStatus || 'በመማር ላይ' : 'ንቁ',
          joinDate: new Date().toISOString().split('T')[0]
        });
      }

      if (additions.length > 0) {
        onUpdateDepartmentData('youth_ministry', (prev) => {
          if (ctx === 'choir') {
            return { ...prev, youthChoirMembers: [...(prev.youthChoirMembers || []), ...additions] };
          }
          if (ctx === 'worship') {
            return {
              ...prev,
              youthWorshipLeaders: [...(prev.youthWorshipLeaders || []), ...additions]
            };
          }
          return {
            ...prev,
            youthDiscipleshipMembers: [...(prev.youthDiscipleshipMembers || []), ...additions]
          };
        });
        notify(
          t(
            `✓ ${additions.length} አባላት ከExcel/CSV ተጭነዋል!`,
            `Imported ${additions.length} records from Excel/CSV!`
          )
        );
      }
    } catch {
      notify(t('ፋይሉን ማንበብ አልተሳካም።', 'Failed to parse file.'));
    }
    e.target.value = '';
  };

  // Youth Registry Member CRUD
  const openAddMember = () => {
    setEditingMemberId(null);
    setMName('');
    setMGender('ወ');
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
    onUpdateDepartmentData('youth_ministry', (prev) => ({
      ...prev,
      members: editingMemberId
        ? prev.members.map((m) => (m.id === editingMemberId ? record : m))
        : [...prev.members, record]
    }));
    setIsMemberModalOpen(false);
  };

  // Activity CRUD
  const openAddActivity = () => {
    setEditingActivityId(null);
    setADate(getTodayIsoDateTime());
    setATitle('');
    setACategory(unit.activityCategories[0] || 'የወጣቶች አምልኮ');
    setALocation('');
    setAParticipants('');
    setAStatus('ተጠናቋል');
    setASummary('');
    setIsActivityModalOpen(true);
  };

  const openEditActivity = (rec: DepartmentActivityRecord) => {
    setEditingActivityId(rec.id);
    setADate(rec.date || '');
    setATitle(rec.title);
    setACategory(rec.category);
    setALocation(rec.locationOrGroup || '');
    setAParticipants(rec.participantsCount !== undefined ? String(rec.participantsCount) : '');
    setAStatus(rec.status);
    setASummary(rec.summary || '');
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aTitle.trim()) return;
    const record: DepartmentActivityRecord = {
      id: editingActivityId ?? generateUniqueId(),
      date: aDate,
      title: aTitle.trim(),
      category: aCategory.trim() || 'መደበኛ አገልግሎት',
      locationOrGroup: aLocation.trim() || undefined,
      participantsCount: aParticipants ? Number(aParticipants) || undefined : undefined,
      status: aStatus,
      summary: aSummary.trim() || undefined
    };
    onUpdateDepartmentData('youth_ministry', (prev) => ({
      ...prev,
      activities: editingActivityId
        ? prev.activities.map((a) => (a.id === editingActivityId ? record : a))
        : [...prev.activities, record]
    }));
    setIsActivityModalOpen(false);
  };

  // Finance CRUD
  const openAddFinance = () => {
    setEditingFinanceId(null);
    setFDate(getTodayIsoDateTime());
    setFType('ገቢ');
    setFCategory(unit.financeCategories[0] || 'የወጣቶች መዋጮ');
    setFDesc('');
    setFAmount('');
    setFRef('');
    setIsFinanceModalOpen(true);
  };

  const openEditFinance = (rec: DepartmentFinanceRecord) => {
    setEditingFinanceId(rec.id);
    setFDate(rec.date);
    setFType(rec.type);
    setFCategory(rec.category);
    setFDesc(rec.description);
    setFAmount(String(rec.amount));
    setFRef(rec.receiptOrRef || '');
    setIsFinanceModalOpen(true);
  };

  const handleSaveFinance = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fAmount);
    if (!fDesc.trim() || isNaN(amt) || amt <= 0) return;
    const record: DepartmentFinanceRecord = {
      id: editingFinanceId ?? generateUniqueId(),
      date: fDate,
      type: fType,
      category: fCategory.trim() || 'አጠቃላይ',
      description: fDesc.trim(),
      amount: amt,
      receiptOrRef: fRef.trim() || undefined
    };
    onUpdateDepartmentData('youth_ministry', (prev) => ({
      ...prev,
      finances: editingFinanceId
        ? prev.finances.map((f) => (f.id === editingFinanceId ? record : f))
        : [...prev.finances, record]
    }));
    setIsFinanceModalOpen(false);
  };

  const exportMembersXlsx = () => {
    const rows = [
      ['ተ.ቁ', 'ሙሉ ስም', 'ጾታ', 'ዕድሜ', 'ስልክ', 'የአገልግሎት ድርሻ', 'ሁኔታ', 'ማስታወሻ'],
      ...filteredMembers.map((m, idx) => [
        idx + 1,
        m.name,
        m.gender,
        m.age ?? '',
        m.phone ?? '',
        m.roleOrClass,
        m.status,
        m.notes ?? ''
      ])
    ];
    const wsSheet = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSheet, 'የወጣቶች_ዝርዝር');
    XLSX.writeFile(wb, `የወጣቶች_አገልግሎት_አባላት_${currentYear}.xlsx`);
  };

  const activitiesSummaryText = useMemo(() => {
    if (ws.activities.length === 0) return '';
    return ws.activities
      .slice(0, 12)
      .map((a, idx) => `${idx + 1}. ${formatDualDateTimeText(a.date)} — ${a.title} (${a.category} · ${a.status})`)
      .join('\n');
  }, [ws.activities]);

  const tabs: {
    id: YouthSubTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    coordinatorOnly?: boolean;
  }[] = [
    {
      id: 'coordinatorTab',
      label: t('የአስተባባሪ ገጽ', 'Coordinator Page'),
      icon: Shield,
      coordinatorOnly: true
    },
    {
      id: 'leadersTab',
      label: t('የመሪዎች ገጽ', 'Leaders Page'),
      icon: Sparkles,
      badge: (ws.leaders || []).length > 0 ? (ws.leaders || []).length : undefined
    },
    {
      id: 'choirsTab',
      label: t('የመዘምራን ህብረት', 'Choir Fellowship'),
      icon: Music,
      badge: choirMembers.length
    },
    {
      id: 'worshipLeadersTab',
      label: t('የመዝሙር መሪዎች ህብረት', 'Worship Leaders Fellowship'),
      icon: Mic2,
      badge: worshipLeaders.length
    },
    {
      id: 'discipleshipTab',
      label: t('የደቀ መዝሙርነት ትምህርት', 'Discipleship Trainings'),
      icon: BookOpen,
      badge: discipleshipMembers.length
    },
    {
      id: 'membersTab',
      label: t('የወጣቶች አባላት ቋት', 'Youth Members'),
      icon: Users,
      badge: ws.members.length
    },
    {
      id: 'activitiesTab',
      label: t('የአገልግሎት ተግባራት', 'Activities'),
      icon: ClipboardList,
      badge: ws.activities.length
    },
    {
      id: 'financesTab',
      label: t('ፋይናንስና ሂሳብ', 'Finances'),
      icon: Wallet
    },
    {
      id: 'plansTab',
      label: t('ዕቅድና ክንውን', 'Plans & Execution'),
      icon: Target,
      badge: pendingDispatches.length > 0 ? pendingDispatches.length : undefined
    },
    {
      id: 'submissionsTab',
      label: t('ለመንፈሳዊ ዘርፍ መላኪያ', 'Send to Spiritual Council'),
      icon: Send
    }
  ];

  const visibleTabs = tabs.filter((tabItem) => !tabItem.coordinatorOnly || isCoordinatorOrAdmin);

  return (
    <div className="space-y-6">
      {/* Youth Ministry Hero Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 border border-purple-200">
                1.2.4 {unitName('youth_ministry', unit.name)}
              </span>
              {currentUserRole === 'youth_coordinator' ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t('የወጣቶች አስተባባሪ ገጽ (ሙሉ መቆጣጠሪያ)', 'Youth Coordinator Page (Full Control)')}</span>
                </span>
              ) : currentUserRole === 'admin' ? (
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-200">
                  {t('ዋና አዲሚን መቆጣጠሪያ', 'Super Admin View')}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-200 inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{t('የወጣቶች አገልግሎት መሪዎች ገጽ', 'Youth Leaders Page')}</span>
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono">
                {currentYear} {t('ዓ/ም', 'E.C.')}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {t('የወጣቶች አገልግሎት የተቀናጀ ፖርታል', 'Youth Ministry Integrated Portal')}
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              {t(
                'የአስተባባሪ ገጽ፣ የመሪዎች ገጽ፣ 7ቱ የመዘምራን ህብረቶች (ሀ–መ፣ ሴቶች፣ ፋሬስ፣ ባማ)፣ የመዝሙር መሪዎች ህብረት እና የደቀ መዝሙርነት ትምህርቶች (መቅህማ፣ ቢቲሲፒ)',
                'Coordinator Page, Leaders Page, 7 Choir Fellowships, Worship Leaders Fellowship, and Discipleship Trainings (Mekhma, BTCP)'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-xl bg-purple-50 border border-purple-200">
              <div className="text-[11px] font-bold text-purple-800">{t('ወጣት አባላት', 'Youth')}</div>
              <div className="text-xl font-extrabold text-purple-950 tabular-nums">{ws.members.length}</div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="text-[11px] font-bold text-indigo-800">{t('መዘምራን', 'Choirs')}</div>
              <div className="text-xl font-extrabold text-indigo-950 tabular-nums">{choirMembers.length}</div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[11px] font-bold text-amber-800">{t('መዝሙር መሪዎች', 'Worship')}</div>
              <div className="text-xl font-extrabold text-amber-950 tabular-nums">{worshipLeaders.length}</div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-teal-50 border border-teal-200">
              <div className="text-[11px] font-bold text-teal-800">{t('ደቀ መዝሙርነት', 'Discipleship')}</div>
              <div className="text-xl font-extrabold text-teal-950 tabular-nums">{discipleshipMembers.length}</div>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                      tab.id === 'plansTab' && pendingDispatches.length > 0
                        ? 'bg-amber-400 text-slate-950'
                        : active
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Incoming 2019 Plan Alert */}
      {pendingDispatches.length > 0 && activeTab !== 'plansTab' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-start gap-2.5 text-xs text-amber-950">
            <Inbox className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold">
                {t(
                  `ከዋናው ዕቅድ ለየወጣቶች አገልግሎት ${pendingDispatches.length} አዲስ የ2019 ዓ/ም ዕቅድ ተልኳል!`,
                  `${pendingDispatches.length} new 2019 E.C. dispatched plan(s) waiting for Youth Ministry!`
                )}
              </div>
              <p className="text-amber-800 mt-0.5">
                {t('ለማየትና ወደ የወጣቶች ዘርፍ ዕቅድ ለመቀበል "ዕቅድና ክንውን" ክፍልን ይክፈቱ።', 'Open "Plans & Execution" tab to review and accept.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('plansTab')}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold cursor-pointer shrink-0"
          >
            {t('ወደ ዕቅድና ክንውን ሂድ', 'Open Plans Tab')}
          </button>
        </div>
      )}

      {statusNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* 1. COORDINATOR PAGE */}
      {activeTab === 'coordinatorTab' && isCoordinatorOrAdmin && (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 border border-emerald-800/60 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border border-emerald-300/35 text-emerald-300 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-extrabold">
                  {t('የወጣቶች አገልግሎት አስተባባሪ ገጽ — ሙሉ መቆጣጠሪያ ማዕከል', 'Youth Ministry Coordinator Page — Command Center')}
                </h3>
                <p className="text-xs text-emerald-100/90 max-w-3xl leading-relaxed">
                  {t(
                    'የወጣቶች አገልግሎት አስተባባሪ የመሪዎች ገጽን፣ 7ቱን የመዘምራን ህብረቶች፣ የመዝሙር መሪዎች ህብረትን፣ የደቀ መዝሙርነት ትምህርቶችን (መቅህማ እና ቢቲሲፒ)፣ ተግባራትን፣ ፋይናንስንና ዕቅዶችን ሙሉ በሙሉ ያስተዳድራል።',
                    'Full oversight over Youth Leaders Page, all 7 Choir Fellowships, Worship Leaders Fellowship, Discipleship Trainings (Mekhma & BTCP), activities, finance, and plans.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Overview Quick Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                tab: 'choirsTab' as YouthSubTabId,
                title: t('የመዘምራን ህብረት', 'Choir Fellowship'),
                stat: `${choirMembers.length} ${t('መዘምራን', 'members')} · ${choirGroups.length} ${t('ህብረቶች', 'groups')}`,
                sub: 'ሀ፣ ለ፣ ሐ፣ መ፣ ሴቶች፣ ፋሬስ፣ ባማ',
                icon: Music,
                color: 'text-indigo-700 bg-indigo-50 border-indigo-200'
              },
              {
                tab: 'worshipLeadersTab' as YouthSubTabId,
                title: t('የመዝሙር መሪዎች ህብረት', 'Worship Leaders Fellowship'),
                stat: `${worshipLeaders.length} ${t('የመዝሙር መሪዎች', 'leaders')}`,
                sub: t('የአምልኮና የመዝሙር መሪዎች ዝርዝር', 'Worship & song leaders roster'),
                icon: Mic2,
                color: 'text-amber-700 bg-amber-50 border-amber-200'
              },
              {
                tab: 'discipleshipTab' as YouthSubTabId,
                title: t('የደቀ መዝሙርነት ትምህርት', 'Discipleship Trainings'),
                stat: `${discipleshipMembers.length} ${t('ተማሪዎች', 'students')} · ${discipleshipGroups.length} ${t('ትምህርቶች', 'tracks')}`,
                sub: 'መቅህማ፣ ቢቲሲፒ (BTCP)',
                icon: BookOpen,
                color: 'text-teal-700 bg-teal-50 border-teal-200'
              },
              {
                tab: 'leadersTab' as YouthSubTabId,
                title: t('የመሪዎች ገጽ', 'Leaders Page'),
                stat: `${ws.members.length} ${t('ወጣት አባላት', 'youth members')}`,
                sub: t('የመሪዎች ማጠቃለያና የስራ መቆጣጠሪያ', 'Leaders workspace & coordination'),
                icon: Sparkles,
                color: 'text-purple-700 bg-purple-50 border-purple-200'
              }
            ].map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.tab}
                  type="button"
                  onClick={() => setActiveTab(card.tab)}
                  className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-4 text-left transition flex flex-col justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">{card.title}</div>
                    <div className="text-xs font-bold text-emerald-800 mt-1">{card.stat}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{card.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Coordinator Directives to Leaders Page */}
          <form
            onSubmit={handleSaveCoordinatorNotes}
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>{t('ለመሪዎች ገጽ የሚተላለፍ የአስተባባሪ መመሪያ እና ማስታወሻ', 'Coordinator Directives for Leaders Page')}</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('እዚህ የሚጻፈው መመሪያ በወጣቶች አገልግሎት መሪዎች ገጽ ላይ በቀጥታ ይታያል።', 'Directives saved here appear directly on the Youth Leaders Page.')}
                </p>
              </div>
            </div>
            <textarea
              rows={3}
              value={coordNotesInput}
              onChange={(e) => setCoordNotesInput(e.target.value)}
              placeholder={t('የአስተባባሪ መመሪያ፣ የልምምድ ሰዓት ወይም የትምህርት አቅጣጫ እዚህ ይጻፉ...', 'Write guidance, rehearsal schedule, or directives for Youth Leaders...')}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('መመሪያ አስቀምጥ', 'Save Directives')}</span>
              </button>
            </div>
          </form>

          {/* Youth Ministry PIN Controls */}
          {onSaveYouthPins && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>{t('የወጣቶች አገልግሎት መግቢያ ቁልፎች (PINs) አስተዳደር', 'Youth Ministry Access PIN Management')}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'የአስተባባሪ ገጽ PIN እና የመሪዎች ገጽ PIN እዚህ ማስተካከል ይችላሉ።',
                    'Manage access PINs for Youth Coordinator Page and Youth Leaders Page.'
                  )}
                </p>
              </div>
              <form onSubmit={handleSavePinsSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('የወጣቶች አስተባባሪ ገጽ PIN', 'Youth Coordinator Page PIN')}
                  </label>
                  <div className="relative">
                    <input
                      type={showCoordPin ? 'text' : 'password'}
                      value={coordPinInput}
                      onChange={(e) => setCoordPinInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 border border-emerald-300 bg-emerald-50/30 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCoordPin(!showCoordPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCoordPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('የወጣቶች መሪዎች ገጽ PIN', 'Youth Leaders Page PIN')}
                  </label>
                  <div className="relative">
                    <input
                      type={showLeadPin ? 'text' : 'password'}
                      value={leaderPinInput}
                      onChange={(e) => setLeaderPinInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 border border-purple-300 bg-purple-50/30 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLeadPin(!showLeadPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showLeadPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('የወጣቶች PIN አስቀምጥ', 'Save Youth PINs')}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 2. LEADERS PAGE */}
      {activeTab === 'leadersTab' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 border border-purple-800/60 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-400/20 border border-purple-300/35 text-purple-200 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold">
                    {t('የወጣቶች አገልግሎት መሪዎች ገጽ', 'Youth Ministry Leaders Workspace')}
                  </h3>
                  <p className="text-xs text-purple-100/90 mt-1 max-w-2xl leading-relaxed">
                    {t(
                      '7ቱን የመዘምራን ህብረቶች፣ የመዝሙር መሪዎች ህብረትን፣ የመቅህማና ቢቲሲፒ የደቀ መዝሙርነት ትምህርቶችን እንዲሁም የወጣቶችን መረጃና ዕቅድ በቀጥታ ማስተዳደሪያ ገጽ።',
                      'Direct workspace for Youth Leaders to oversee all 7 Choirs, Worship Leaders, Mekhma & BTCP Discipleship, Youth members, and Plans.'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('choirsTab')}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                >
                  {t('መዘምራን ክፈት', 'Open Choirs')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('discipleshipTab')}
                  className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
                >
                  {t('ደቀ መዝሙርነት ክፈት', 'Open Discipleship')}
                </button>
              </div>
            </div>
          </div>

          {ws.youthCoordinatorNotes && ws.youthCoordinatorNotes.trim() && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 space-y-1">
                <div className="font-extrabold">
                  {t('ከወጣቶች አገልግሎት አስተባባሪ የተላለፈ መመሪያ፦', 'Directive from Youth Coordinator:')}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-emerald-900">
                  {ws.youthCoordinatorNotes}
                </p>
              </div>
            </div>
          )}

          {/* Youth Ministry Leaders Name Roster */}
          <UnitLeadersRosterTab
            unitTitle={unitName('youth_ministry', unit.name)}
            currentYear={currentYear}
            leaders={ws.leaders || []}
            roleSuggestions={unit.roleOptions}
            churchMembers={churchMembers}
            onSaveLeaders={(nextLeaders) =>
              onUpdateDepartmentData('youth_ministry', (prev) => ({
                ...prev,
                leaders: nextLeaders
              }))
            }
          />

          {/* Choir Fellowships Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Music className="w-4 h-4 text-indigo-700" />
                  <span>{t('የመዘምራን ህብረት — የቡድኖች ማጠቃለያ', 'Choir Fellowship — Groups Summary')}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('በቀጥታ ወደ ቡድኑ ለመግባት የቡድኑን ካርድ ይጫኑ', 'Click any choir group card to manage its members')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('choirsTab')}
                className="text-xs font-bold text-indigo-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{t('ሙሉ ክፍል ክፈት', 'Manage All')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {choirGroups.map((grp) => {
                const grpMembers = choirMembers.filter((m) => m.group === grp);
                const male = grpMembers.filter((m) => m.gender === 'ወ').length;
                const female = grpMembers.filter((m) => m.gender === 'ሴ').length;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      setSelectedChoirGroup(grp);
                      setActiveTab('choirsTab');
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/50 text-left transition cursor-pointer"
                  >
                    <div className="font-extrabold text-xs text-slate-900 truncate">{grp}</div>
                    <div className="text-xl font-extrabold text-indigo-900 mt-1 tabular-nums">
                      {grpMembers.length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5 tabular-nums">
                      {t(`ወ: ${male} · ሴ: ${female}`, `M: ${male} · F: ${female}`)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Worship Leaders + Discipleship Summary Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-amber-700" />
                    <span>{t('የመዝሙር መሪዎች ህብረት', 'Worship Leaders Fellowship')}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('የአምልኮ መሪዎች፣ መዝሙር መሪዎች እና የሙዚቃ መሳሪያ/ድምጽ አገልጋዮች', 'Worship leaders, song leaders, and instrumentalists')}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-extrabold tabular-nums">
                  {worshipLeaders.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {WORSHIP_LEADER_ROLES.slice(0, 4).map((r) => {
                  const cnt = worshipLeaders.filter((w) => (w.roleTitle || 'መደበኛ አባል') === r).length;
                  return (
                    <span
                      key={r}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold"
                    >
                      {r}: {cnt}
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('worshipLeadersTab')}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <span>{t('የመዝሙር መሪዎች ህብረትን አስተዳድር', 'Open Worship Leaders Fellowship')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-700" />
                    <span>{t('የደቀ መዝሙርነት ትምህርት', 'Discipleship Trainings')}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('መቅህማ፣ ቢቲሲፒ (BTCP) እና ሌሎች የደቀ መዝሙርነት ክፍሎች', 'Mekhma, BTCP and additional discipleship courses')}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 text-xs font-extrabold tabular-nums">
                  {discipleshipMembers.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {discipleshipGroups.map((dg) => {
                  const cnt = discipleshipMembers.filter((d) => d.group === dg).length;
                  return (
                    <button
                      key={dg}
                      type="button"
                      onClick={() => {
                        setSelectedDiscipleshipGroup(dg);
                        setActiveTab('discipleshipTab');
                      }}
                      className="p-2.5 rounded-xl bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200 text-left cursor-pointer"
                    >
                      <div className="text-xs font-extrabold text-teal-950 truncate">{dg}</div>
                      <div className="text-xs font-bold text-teal-700 mt-0.5 tabular-nums">
                        {cnt} {t('ተማሪዎች', 'students')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHOIR FELLOWSHIP TAB */}
      {activeTab === 'choirsTab' && (
        <div className="space-y-4">
          <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
            <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
            <h2 className="text-base font-semibold">
              የወጣቶች አገልግሎት — የመዘምራን ህብረት ({selectedChoirGroup})
            </h2>
            <p className="text-xs mt-1">ጠቅላላ አባላት፦ {filteredChoirMembers.length}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Music className="w-5 h-5 text-indigo-700" />
                  <span>{t('የመዘምራን ህብረት', 'Youth Choir Fellowship')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'ሀ መዘመራን፣ ለ መዘመራን፣ ሐ መዘመራን፣ መ መዘመራን፣ ሴቶች መዘመራን፣ ፋሬስ መዘመራን እና ባማ መዘመራን',
                    'Ha, Le, Ha-2, Me, Women, Phares, and Bama Choir Fellowships'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChoirGroupModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer self-start"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{t('+ አዲስ የመዘምራን ህብረት', '+ New Choir Group')}</span>
              </button>
            </div>

            {/* Choir Group Pills/Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {choirGroups.map((grp) => {
                const count = choirMembers.filter((m) => m.group === grp).length;
                const active = selectedChoirGroup === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setSelectedChoirGroup(grp)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      active
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                        : 'bg-slate-50 hover:bg-indigo-50/50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="font-extrabold text-xs truncate">{grp}</div>
                    <div
                      className={`text-[11px] font-bold mt-1 tabular-nums ${
                        active ? 'text-indigo-200' : 'text-slate-500'
                      }`}
                    >
                      {count} {t('አባላት', 'members')}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={choirSearch}
                  onChange={(e) => setChoirSearch(e.target.value)}
                  placeholder={t(`በ${selectedChoirGroup} ውስጥ ፈልግ...`, `Search in ${selectedChoirGroup}...`)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openQuickPick('choir')}
                  className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t('ከወጣቶች ቋት ምረጥ', 'Pick from Youth')}</span>
                </button>
                <label className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('Excel ጫን', 'Import')}</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleImportGroupCSV('choir', e)}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleExportGroupCSV('choir')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('አውርድ', 'Export')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('አትም', 'Print')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAddGroupMember('choir')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('አዲስ መዘምር ጨምር', 'Add Choir Member')}</span>
                </button>
              </div>
            </div>
          </div>

          <GroupMembersTable
            members={filteredChoirMembers}
            emptyText={t(
              `በ"${selectedChoirGroup}" ውስጥ እስካሁን የተመዘገበ መዘምር የለም።`,
              `No choir members registered in "${selectedChoirGroup}" yet.`
            )}
            roleColumnLabel={t('ድምጽ / ድርሻ', 'Voice / Role')}
            onEdit={(m) => openEditGroupMember('choir', m)}
            onDelete={(id) => handleDeleteGroupMember('choir', id)}
            t={t}
          />
        </div>
      )}

      {/* 4. WORSHIP LEADERS FELLOWSHIP TAB */}
      {activeTab === 'worshipLeadersTab' && (
        <div className="space-y-4">
          <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
            <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
            <h2 className="text-base font-semibold">የወጣቶች አገልግሎት — የመዝሙር መሪዎች ህብረት</h2>
            <p className="text-xs mt-1">ጠቅላላ አባላት፦ {filteredWorshipLeaders.length}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Mic2 className="w-5 h-5 text-amber-700" />
                  <span>{t('የመዝሙር መሪዎች ህብረት', 'Worship & Song Leaders Fellowship')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'የአምልኮ መሪዎች፣ የመዝሙር መሪዎች፣ የሙዚቃ መሳሪያ ተጫዋቾች እና የድምጽ ክፍል አገልጋዮች መዝገብ',
                    'Registry of worship leaders, song leaders, musicians, and sound crew'
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={worshipSearch}
                    onChange={(e) => setWorshipSearch(e.target.value)}
                    placeholder={t('ስም፣ ድርሻ ወይም ስልክ ፈልግ...', 'Search worship leader...')}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
                <select
                  value={worshipRoleFilter}
                  onChange={(e) => setWorshipRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                >
                  <option value="all">{t('ሁሉም ድርሻዎች', 'All Roles')}</option>
                  {WORSHIP_LEADER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openQuickPick('worship')}
                  className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t('ከወጣቶች ቋት ምረጥ', 'Pick from Youth')}</span>
                </button>
                <label className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('Excel ጫን', 'Import')}</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleImportGroupCSV('worship', e)}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleExportGroupCSV('worship')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('አውርድ', 'Export')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('አትም', 'Print')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAddGroupMember('worship')}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('የመዝሙር መሪ ጨምር', 'Add Worship Leader')}</span>
                </button>
              </div>
            </div>
          </div>

          <GroupMembersTable
            members={filteredWorshipLeaders}
            emptyText={t(
              'እስካሁን በመዝሙር መሪዎች ህብረት የተመዘገበ አባል የለም።',
              'No worship leaders registered yet.'
            )}
            roleColumnLabel={t('የአገልግሎት ድርሻ', 'Role / Instrument')}
            onEdit={(m) => openEditGroupMember('worship', m)}
            onDelete={(id) => handleDeleteGroupMember('worship', id)}
            t={t}
          />
        </div>
      )}

      {/* 5. DISCIPLESHIP TRAININGS TAB (መቅህማ, ቢቲሲፒ, etc.) */}
      {activeTab === 'discipleshipTab' && (
        <div className="space-y-4">
          <div className="hidden print:block text-center pb-4 mb-4 border-b border-slate-300">
            <h1 className="text-xl font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h1>
            <h2 className="text-base font-semibold">
              የወጣቶች አገልግሎት — የደቀ መዝሙርነት ትምህርት ({selectedDiscipleshipGroup})
            </h2>
            <p className="text-xs mt-1">ጠቅላላ ተማሪዎች፦ {filteredDiscipleshipMembers.length}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-700" />
                  <span>{t('የተለያዩ የደቀ መዝሙርነት ትምህርቶች', 'Youth Discipleship Trainings')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'መቅህማ፣ ቢቲሲፒ (BTCP) እና ሌሎች የደቀ መዝሙርነት ትምህርት ክፍሎች',
                    'Mekhma, BTCP, and custom discipleship training tracks'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDiscipleshipModal(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer self-start"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{t('+ አዲስ ትምህርት ፍጠር', '+ New Discipleship Track')}</span>
              </button>
            </div>

            {/* Course Track Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {discipleshipGroups.map((dg) => {
                const count = discipleshipMembers.filter((m) => m.group === dg).length;
                const active = selectedDiscipleshipGroup === dg;
                return (
                  <button
                    key={dg}
                    type="button"
                    onClick={() => setSelectedDiscipleshipGroup(dg)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      active
                        ? 'bg-teal-900 text-white border-teal-900 shadow-xs'
                        : 'bg-slate-50 hover:bg-teal-50/60 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="font-extrabold text-sm">{dg}</div>
                    <div
                      className={`text-xs font-bold mt-1 tabular-nums ${
                        active ? 'text-teal-200' : 'text-slate-500'
                      }`}
                    >
                      {count} {t('ተማሪዎች', 'trainees')}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={discipleshipSearch}
                  onChange={(e) => setDiscipleshipSearch(e.target.value)}
                  placeholder={t(`በ${selectedDiscipleshipGroup} ውስጥ ፈልግ...`, `Search in ${selectedDiscipleshipGroup}...`)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openQuickPick('discipleship')}
                  className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t('ከወጣቶች ቋት ምረጥ', 'Pick from Youth')}</span>
                </button>
                <label className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('Excel ጫን', 'Import')}</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleImportGroupCSV('discipleship', e)}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleExportGroupCSV('discipleship')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('አውርድ', 'Export')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('አትም', 'Print')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAddGroupMember('discipleship')}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('ተማሪ ጨምር', 'Add Trainee')}</span>
                </button>
              </div>
            </div>
          </div>

          <GroupMembersTable
            members={filteredDiscipleshipMembers}
            emptyText={t(
              `በ"${selectedDiscipleshipGroup}" ትምህርት ውስጥ እስካሁን የተመዘገበ ተማሪ የለም።`,
              `No students enrolled in "${selectedDiscipleshipGroup}" yet.`
            )}
            roleColumnLabel={t('የትምህርት ሁኔታ', 'Status')}
            showStatusInsteadOfRole
            onEdit={(m) => openEditGroupMember('discipleship', m)}
            onDelete={(id) => handleDeleteGroupMember('discipleship', id)}
            t={t}
          />
        </div>
      )}

      {/* 6. YOUTH MEMBERS REGISTRY TAB */}
      {activeTab === 'membersTab' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={t('የወጣት አባል ስም፣ ድርሻ ወይም ስልክ ፈልግ...', 'Search youth member...')}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncFromChurchMaster}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t(`ከዋናው ቋት አስገባ (15–29) · ${youthChurchCandidates.length}`, `Sync Youth (15–29) · ${youthChurchCandidates.length}`)}</span>
              </button>
              <button
                type="button"
                onClick={exportMembersXlsx}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('Excel አውርድ', 'Export Excel')}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('አትም', 'Print')}</span>
              </button>
              <button
                type="button"
                onClick={openAddMember}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{t('አዲስ ወጣት መዝግብ', 'Add Youth Member')}</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3 text-left w-10">#</th>
                    <th className="py-3 px-3 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
                    <th className="py-3 px-3 text-center">{t('ጾታ', 'Gender')}</th>
                    <th className="py-3 px-3 text-center">{t('ዕድሜ', 'Age')}</th>
                    <th className="py-3 px-3 text-left">{t('የአገልግሎት ድርሻ', 'Role')}</th>
                    <th className="py-3 px-3 text-left">{t('ስልክ', 'Phone')}</th>
                    <th className="py-3 px-3 text-center">{t('ሁኔታ', 'Status')}</th>
                    <th className="py-3 px-3 text-right">{t('እርምጃ', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        {t(
                          'እስካሁን የተመዘገበ ወጣት የለም። "አዲስ ወጣት መዝግብ" ወይም "ከዋናው ቋት አስገባ" ይጠቀሙ።',
                          'No youth members yet. Use "Add Youth Member" or "Sync Youth".'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-slate-400 font-bold tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div>{m.name}</div>
                          {m.notes && <div className="text-[11px] text-slate-500 font-normal">{m.notes}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              m.gender === 'ሴ' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {m.gender}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-slate-700">{m.age ?? '—'}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-semibold">{m.roleOrClass}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{m.phone || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                            {m.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditMember(m)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateDepartmentData('youth_ministry', (prev) => ({
                                ...prev,
                                members: prev.members.filter((x) => x.id !== m.id)
                              }))
                            }
                            className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. ACTIVITIES TAB */}
      {activeTab === 'activitiesTab' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder={t('ተግባር ወይም ምድብ ፈልግ...', 'Search activity...')}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <button
              type="button"
              onClick={openAddActivity}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('አዲስ ተግባር መዝግብ', 'Add Activity')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredActivities.length === 0 ? (
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-400">
                {t('እስካሁን የተመዘገበ የአገልግሎት ተግባር የለም።', 'No youth ministry activities recorded yet.')}
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <DualDateBadge value={act.date} mode="inline" showTime className="text-slate-600" />
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800">{act.category}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">{act.status}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-1.5">{act.title}</h4>
                      {act.summary && <p className="text-xs text-slate-600 mt-1">{act.summary}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditActivity(act)}
                        className="p-1.5 text-slate-400 hover:text-blue-700 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDepartmentData('youth_ministry', (prev) => ({
                            ...prev,
                            activities: prev.activities.filter((x) => x.id !== act.id)
                          }))
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {(act.locationOrGroup || act.participantsCount) && (
                    <div className="text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                      {act.locationOrGroup && <span>{act.locationOrGroup}</span>}
                      {act.locationOrGroup && act.participantsCount && <span> · </span>}
                      {act.participantsCount && (
                        <span>{t(`ተሳታፊዎች: ${act.participantsCount}`, `Participants: ${act.participantsCount}`)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 8. FINANCES TAB */}
      {activeTab === 'financesTab' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-emerald-800">{t('ጠቅላላ ገቢ (ብር)', 'Total Income (ETB)')}</div>
              <div className="text-2xl font-extrabold text-emerald-950 mt-1 tabular-nums">
                {totalIncome.toLocaleString()}
              </div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-rose-800">{t('ጠቅላላ ወጪ (ብር)', 'Total Expense (ETB)')}</div>
              <div className="text-2xl font-extrabold text-rose-950 mt-1 tabular-nums">
                {totalExpense.toLocaleString()}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-blue-800">{t('ቀሪ ሂሳብ (ብር)', 'Net Balance (ETB)')}</div>
              <div className="text-2xl font-extrabold text-blue-950 mt-1 tabular-nums">
                {netBalance.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={financeSearch}
                  onChange={(e) => setFinanceSearch(e.target.value)}
                  placeholder={t('ዝርዝር ወይም ደረሰኝ ፈልግ...', 'Search finance record...')}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <select
                value={financeTypeFilter}
                onChange={(e) => setFinanceTypeFilter(e.target.value as 'all' | 'ገቢ' | 'ወጪ')}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
              >
                <option value="all">{t('ሁሉም (ገቢ & ወጪ)', 'All')}</option>
                <option value="ገቢ">{t('ገቢ ብቻ', 'Income')}</option>
                <option value="ወጪ">{t('ወጪ ብቻ', 'Expense')}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={openAddFinance}
              className="px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('ገቢ / ወጪ መዝግብ', 'Add Finance Record')}</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3 text-left">{t('ቀን', 'Date')}</th>
                    <th className="py-3 px-3 text-center">{t('ዓይነት', 'Type')}</th>
                    <th className="py-3 px-3 text-left">{t('ምድብ', 'Category')}</th>
                    <th className="py-3 px-3 text-left">{t('ዝርዝር መግለጫ', 'Description')}</th>
                    <th className="py-3 px-3 text-right">{t('መጠን (ብር)', 'Amount (ETB)')}</th>
                    <th className="py-3 px-3 text-right">{t('እርምጃ', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFinances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {t('እስካሁን የተመዘገበ የፋይናንስ እንቅስቃሴ የለም።', 'No financial records yet.')}
                      </td>
                    </tr>
                  ) : (
                    filteredFinances.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          <DualDateBadge value={f.date} mode="stacked" showTime />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              f.type === 'ገቢ' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {f.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{f.category}</td>
                        <td className="py-2.5 px-3 text-slate-700">{f.description}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold tabular-nums">
                          {Number(f.amount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditFinance(f)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateDepartmentData('youth_ministry', (prev) => ({
                                ...prev,
                                finances: prev.finances.filter((x) => x.id !== f.id)
                              }))
                            }
                            className="p-1.5 text-slate-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. PLANS TAB */}
      {activeTab === 'plansTab' && (
        <UnifiedPlanManager
          unitId="youth_ministry"
          unitName={unitName('youth_ministry', unit.name)}
          currentYear={currentYear}
          plans={ws.plans}
          onSavePlans={(updatedPlans: AnnualPlanItem[]) =>
            onUpdateDepartmentData('youth_ministry', (prev) => ({
              ...prev,
              plans: updatedPlans
            }))
          }
          onSendToSpiritual={onCreateSubmission}
          planDispatches={planDispatches}
          onAcceptDispatch={onAcceptDispatch}
          onReturnDispatch={onReturnDispatch}
        />
      )}

      {/* 10. SUBMISSIONS TO SPIRITUAL COUNCIL */}
      {activeTab === 'submissionsTab' && onCreateSubmission && (
        <MinistrySubmissionsPanel
          mode="sender"
          unitId="youth_ministry"
          unitName={unit.name}
          currentYear={currentYear}
          submissions={submissions}
          availablePlans={ws.plans}
          activitiesSummaryText={activitiesSummaryText}
          onCreateSubmission={onCreateSubmission}
          onResubmitSubmission={onResubmitSubmission}
          onDeleteSubmission={onDeleteSubmission}
        />
      )}

      {/* MODALS */}
      {/* Add/Edit Group Member Modal (Choir / Worship / Discipleship) */}
      {groupModalContext && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingGroupMemberId
                  ? t('መረጃ አስተካክል', 'Edit Member')
                  : groupModalContext === 'choir'
                  ? t('አዲስ መዘምር መዝግብ', 'Add Choir Member')
                  : groupModalContext === 'worship'
                  ? t('አዲስ የመዝሙር መሪ መዝግብ', 'Add Worship Leader')
                  : t('አዲስ የደቀ መዝሙርነት ተማሪ መዝግብ', 'Add Discipleship Student')}
              </h3>
              <button
                type="button"
                onClick={() => setGroupModalContext(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGroupMember} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                <input
                  type="text"
                  required
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={gGender}
                    onChange={(e) => setGGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ (ወ)', 'Male')}</option>
                    <option value="ሴ">{t('ሴት (ሴ)', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ዕድሜ', 'Age')}</label>
                  <input
                    type="text"
                    value={gAge}
                    onChange={(e) => setGAge(e.target.value)}
                    placeholder="22"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={gPhone}
                    onChange={(e) => setGPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ቻፕል', 'Chapel')}</label>
                  <select
                    value={gChapel}
                    onChange={(e) => setGChapel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="">{t('— ምረጥ —', '— Select —')}</option>
                    {chapelList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {groupModalContext === 'choir' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የመዘምራን ህብረት', 'Choir Group')}</label>
                  <select
                    value={gGroup}
                    onChange={(e) => setGGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    {choirGroups.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {groupModalContext === 'discipleship' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('የትምህርት ዓይነት', 'Discipleship Course')}</label>
                    <select
                      value={gGroup}
                      onChange={(e) => setGGroup(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    >
                      {discipleshipGroups.map((grp) => (
                        <option key={grp} value={grp}>
                          {grp}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t('የትምህርት ሁኔታ', 'Status')}</label>
                    <select
                      value={gStatus}
                      onChange={(e) => setGStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    >
                      {DISCIPLESHIP_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {groupModalContext === 'worship' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የአገልግሎት ድርሻ', 'Role / Instrument')}</label>
                  <select
                    value={gRoleTitle}
                    onChange={(e) => setGRoleTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    {WORSHIP_LEADER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {groupModalContext === 'choir' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ድምጽ / ድርሻ', 'Voice / Role')}</label>
                  <input
                    type="text"
                    value={gRoleTitle}
                    onChange={(e) => setGRoleTitle(e.target.value)}
                    placeholder={t('ሶፕራኖ፣ አልቶ፣ ቴነር፣ ቤዝ፣ መሪ...', 'Soprano, Alto, Tenor, Bass, Leader...')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
                <input
                  type="text"
                  value={gNotes}
                  onChange={(e) => setGNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGroupModalContext(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-purple-900 hover:bg-purple-800 rounded-xl cursor-pointer"
                >
                  {t('አስቀምጥ', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Choir Group Modal */}
      {showNewChoirGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">{t('አዲስ የመዘምራን ህብረት ፍጠር', 'Create Choir Group')}</h3>
              <button
                type="button"
                onClick={() => setShowNewChoirGroupModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddChoirGroup} className="space-y-3 mt-4 text-xs">
              <input
                type="text"
                required
                value={newChoirGroupName}
                onChange={(e) => setNewChoirGroupName(e.target.value)}
                placeholder={t('የመዘምራን ህብረት ስም...', 'Choir group name...')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-bold"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewChoirGroupModal(false)}
                  className="px-3.5 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-indigo-800 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  {t('ፍጠር', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Discipleship Track Modal */}
      {showNewDiscipleshipModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">{t('አዲስ የደቀ መዝሙርነት ትምህርት ፍጠር', 'Create Discipleship Track')}</h3>
              <button
                type="button"
                onClick={() => setShowNewDiscipleshipModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDiscipleshipGroup} className="space-y-3 mt-4 text-xs">
              <input
                type="text"
                required
                value={newDiscipleshipName}
                onChange={(e) => setNewDiscipleshipName(e.target.value)}
                placeholder={t('የትምህርት ስም...', 'Course name...')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-bold"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewDiscipleshipModal(false)}
                  className="px-3.5 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-teal-700 hover:bg-teal-600 rounded-xl cursor-pointer"
                >
                  {t('ፍጠር', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Pick Youth Modal */}
      {pickContext && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                {t('ከወጣቶች ቋት ምረጥና አስገባ', 'Pick Youth Members to Assign')}
              </h3>
              <button
                type="button"
                onClick={() => setPickContext(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="my-3 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pickSearch}
                onChange={(e) => setPickSearch(e.target.value)}
                placeholder={t('ስም ፈልግ...', 'Search name...')}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {pickPool
                .filter((p) => !pickSearch.trim() || p.name.toLowerCase().includes(pickSearch.trim().toLowerCase()))
                .slice(0, 120)
                .map((p) => {
                  const checked = selectedPickIds.has(p.key);
                  return (
                    <label
                      key={p.key}
                      className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedPickIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.key)) next.delete(p.key);
                              else next.add(p.key);
                              return next;
                            });
                          }}
                          className="rounded border-slate-300"
                        />
                        <span className="font-bold text-slate-900">{p.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {p.gender} {p.age ? `· ${p.age}` : ''} {p.chapel ? `· ${p.chapel}` : ''}
                      </span>
                    </label>
                  );
                })}
              {pickPool.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  {t('ከዋናው ቋት ወይም ከወጣቶች አባላት ዝርዝር ውስጥ ወጣቶች አልተገኙም።', 'No youth found in registry.')}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-600">
                {t(`ተመርጠዋል: ${selectedPickIds.size}`, `Selected: ${selectedPickIds.size}`)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPickContext(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={selectedPickIds.size === 0}
                  onClick={handleConfirmQuickPick}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-800 hover:bg-purple-700 disabled:opacity-50 rounded-xl cursor-pointer"
                >
                  {t('የተመረጡትን አስገባ', 'Add Selected')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Youth Registry Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingMemberId ? t('ወጣት አባል አስተካክል', 'Edit Youth Member') : t('አዲስ ወጣት መዝግብ', 'Add Youth Member')}
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
                <label className="block font-bold text-slate-700 mb-1">{t('ሙሉ ስም *', 'Full Name *')}</label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ጾታ', 'Gender')}</label>
                  <select
                    value={mGender}
                    onChange={(e) => setMGender(e.target.value as 'ወ' | 'ሴ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ወ">{t('ወንድ (ወ)', 'Male')}</option>
                    <option value="ሴ">{t('ሴት (ሴ)', 'Female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ዕድሜ', 'Age')}</label>
                  <input
                    type="text"
                    value={mAge}
                    onChange={(e) => setMAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('የአገልግሎት ድርሻ', 'Ministry Role')}</label>
                <select
                  value={mRole}
                  onChange={(e) => setMRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  {unit.roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('የትምህርት ደረጃ', 'Education')}</label>
                  <input
                    type="text"
                    value={mEducation}
                    onChange={(e) => setMEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ስልክ ቁጥር', 'Phone')}</label>
                  <input
                    type="text"
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
                <select
                  value={mStatus}
                  onChange={(e) => setMStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="ንቁ">ንቁ</option>
                  <option value="በእረፍት">በእረፍት</option>
                  <option value="ተመራቂ">ተመራቂ</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ማስታወሻ', 'Notes')}</label>
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
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-purple-900 hover:bg-purple-800 rounded-xl cursor-pointer"
                >
                  {t('አስቀምጥ', 'Save')}
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
                {editingActivityId ? t('ተግባር አስተካክል', 'Edit Activity') : t('አዲስ ተግባር መዝግብ', 'Add Activity')}
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
                  <label className="block font-bold text-slate-700 mb-1">{t('ቀንና ሰዓት *', 'Date & Time *')}</label>
                  <DualDateInput required includeTime value={aDate} onChange={setADate} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ሁኔታ', 'Status')}</label>
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
                <label className="block font-bold text-slate-700 mb-1">{t('ርዕስ / ተግባር *', 'Title *')}</label>
                <input
                  type="text"
                  required
                  value={aTitle}
                  onChange={(e) => setATitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ምድብ', 'Category')}</label>
                <select
                  value={aCategory}
                  onChange={(e) => setACategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  {unit.activityCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ቦታ / ቡድን', 'Group/Location')}</label>
                  <input
                    type="text"
                    value={aLocation}
                    onChange={(e) => setALocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ተሳታፊ ብዛት', 'Participants')}</label>
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
                <label className="block font-bold text-slate-700 mb-1">{t('ማብራሪያ', 'Summary')}</label>
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
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-purple-900 hover:bg-purple-800 rounded-xl cursor-pointer"
                >
                  {t('አስቀምጥ', 'Save')}
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
                {editingFinanceId ? t('የሂሳብ መዝገብ አስተካክል', 'Edit Finance Record') : t('አዲስ ገቢ/ወጪ መዝግብ', 'Add Finance Record')}
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
                  <label className="block font-bold text-slate-700 mb-1">{t('ቀንና ሰዓት *', 'Date & Time *')}</label>
                  <DualDateInput required includeTime value={fDate} onChange={setFDate} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ዓይነት *', 'Type *')}</label>
                  <select
                    value={fType}
                    onChange={(e) => setFType(e.target.value as 'ገቢ' | 'ወጪ')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ገቢ">{t('ገቢ', 'Income')}</option>
                    <option value="ወጪ">{t('ወጪ', 'Expense')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ምድብ', 'Category')}</label>
                <select
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                >
                  {unit.financeCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('ዝርዝር መግለጫ *', 'Description *')}</label>
                <input
                  type="text"
                  required
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('መጠን (ብር) *', 'Amount (ETB) *')}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={fAmount}
                    onChange={(e) => setFAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('ደረሰኝ ቁጥር', 'Ref #')}</label>
                  <input
                    type="text"
                    value={fRef}
                    onChange={(e) => setFRef(e.target.value)}
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
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-purple-900 hover:bg-purple-800 rounded-xl cursor-pointer"
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

interface GroupMembersTableProps {
  members: YouthGroupMemberRecord[];
  emptyText: string;
  roleColumnLabel: string;
  showStatusInsteadOfRole?: boolean;
  onEdit: (m: YouthGroupMemberRecord) => void;
  onDelete: (id: number) => void;
  t: (am: string, en: string) => string;
}

const GroupMembersTable: React.FC<GroupMembersTableProps> = ({
  members,
  emptyText,
  roleColumnLabel,
  showStatusInsteadOfRole = false,
  onEdit,
  onDelete,
  t
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <th className="py-3 px-3 text-left w-10">#</th>
              <th className="py-3 px-3 text-left">{t('ሙሉ ስም', 'Full Name')}</th>
              <th className="py-3 px-3 text-center">{t('ጾታ', 'Gender')}</th>
              <th className="py-3 px-3 text-center">{t('ዕድሜ', 'Age')}</th>
              <th className="py-3 px-3 text-left">{roleColumnLabel}</th>
              <th className="py-3 px-3 text-left">{t('ቻፕል', 'Chapel')}</th>
              <th className="py-3 px-3 text-left">{t('ስልክ ቁጥር', 'Phone')}</th>
              <th className="py-3 px-3 text-right print:hidden">{t('እርምጃ', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              members.map((m, idx) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 text-slate-400 font-bold tabular-nums">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <div>{m.name}</div>
                    {m.notes && <div className="text-[11px] text-slate-500 font-normal">{m.notes}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        m.gender === 'ሴ' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {m.gender}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums text-slate-700">{m.age ?? '—'}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {showStatusInsteadOfRole ? (
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[11px] font-bold">
                        {m.status || 'በመማር ላይ'}
                      </span>
                    ) : (
                      m.roleTitle || '—'
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{m.chapel || '—'}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{m.phone || '—'}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
                    <button
                      type="button"
                      onClick={() => onEdit(m)}
                      className="p-1.5 text-slate-500 hover:text-blue-700 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
