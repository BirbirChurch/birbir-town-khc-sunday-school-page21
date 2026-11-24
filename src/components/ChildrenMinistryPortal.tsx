import React, { useEffect, useMemo, useState } from 'react';
import {
  HeartHandshake,
  Users,
  GraduationCap,
  CalendarCheck2,
  Music,
  BookOpen,
  Award,
  UserCheck,
  UserCog,
  BookMarked,
  Target,
  Send,
  Calendar,
  Plus,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import {
  AbsenteeRecord,
  AnnualPlanItem,
  AppData,
  ChoirMember,
  ChurchChild,
  ChurchMember,
  DepartmentWorkspaceData,
  MinistrySubmission,
  OrgUnitId,
  PlanDispatchItem,
  Role,
  SpiritualMember,
  Student,
  Teacher,
  WeeklyAttendanceStatus
} from '../types';
import { DEFAULT_ANNUAL_PLAN, DEFAULT_CHAPELS } from '../constants/initialData';
import { BulkAgeIncrementOptions, BulkAgeIncrementStats } from '../utils/ageUpdater';
import { NameScriptMode } from '../utils/amharicTransliterator';
import { countStudentsInData } from '../services/firebase';
import { ChurchChildrenTab } from './ChurchChildrenTab';
import { AllStudentsMasterTab } from './AllStudentsMasterTab';
import { ClassesTab } from './ClassesTab';
import { AttendanceTab } from './AttendanceTab';
import { ChoirTab } from './ChoirTab';
import { SpiritualTab } from './SpiritualTab';
import { TopAchieversTab } from './TopAchieversTab';
import { TeachersTab } from './TeachersTab';
import { SubjectsTab } from './SubjectsTab';
import { PlanReportTab } from './PlanReportTab';
import { MinistrySubmissionsPanel } from './MinistrySubmissionsPanel';
import { UnitLeadersRosterTab } from './UnitLeadersRosterTab';
import { ChildrenCharterAndProgramsPanel } from './ChildrenCharterAndProgramsPanel';
import {
  CHURCH_ORG_UNITS,
  createDefaultChildrenMinistryWorkspaceData
} from '../constants/churchStructure';
import { useLanguage } from '../context/LanguageContext';

export type ChildrenSubTabId =
  | 'coordinatorControlTab'
  | 'churchChildrenTab'
  | 'allStudentsMasterTab'
  | 'classesTab'
  | 'attendanceTab'
  | 'choirTab'
  | 'spiritualTab'
  | 'topAchieversTab'
  | 'charterProgramsTab'
  | 'leadersTab'
  | 'teachersTab'
  | 'subjectsTab'
  | 'planReportTab'
  | 'sendToSpiritualTab';

interface ChildrenMinistryPortalProps {
  appData: AppData;
  currentYear: string;
  years: string[];
  onYearChange: (year: string) => void;
  onAddYear: (year: string) => void;
  classList: string[];
  selectedClass: string;
  onSelectClass: (className: string) => void;
  currentClassStudents: Student[];
  currentUserRole: Role;
  loggedInTeacher: Teacher | null;
  nameScriptMode: NameScriptMode;
  onChangeNameScriptMode: (mode: NameScriptMode) => void;
  onOpenTransliterator: () => void;
  // Student & class handlers
  onUpdateStudent: (s: Student) => void;
  onAddStudent: (s: Omit<Student, 'id'>) => void;
  onAddStudentToClass: (targetClass: string, s: Omit<Student, 'id'>) => void;
  onAddStudentsBatch: (
    students: Omit<Student, 'id'>[],
    targetClass?: string,
    replaceExisting?: boolean
  ) => void;
  onAddStudentsMultiClass: (
    studentsByClass: { [className: string]: Omit<Student, 'id'>[] },
    replaceExisting?: boolean
  ) => void;
  onDeleteStudent: (studentId: number | string) => void;
  onMoveStudentClass: (
    studentId: number | string,
    sourceClass: string,
    targetClass: string
  ) => void;
  onClearClassStudents: (className: string) => void;
  onClearClassScores: (className: string) => void;
  onSetClassAge: (className: string, newAge: string) => void;
  // Church children handlers
  onAddChild: (c: Omit<ChurchChild, 'id'>) => void;
  onAddChurchMember: (m: Omit<ChurchMember, 'id'>) => ChurchMember | void;
  onUpdateChild: (c: ChurchChild) => void;
  onDeleteChild: (id: number) => void;
  onClearChurchChildren: (chapelFilter?: string | string[]) => void;
  onBatchAddChildren: (children: Omit<ChurchChild, 'id'>[], mode?: 'append' | 'replace') => void;
  onEnrollToSundaySchool: (child: ChurchChild, targetClass: string) => void;
  onImportMissingStudentsToChurchChildren: (
    students: {
      name: string;
      gender: string;
      age: number | string;
      className: string;
      chapel?: string;
      phone?: string;
    }[]
  ) => void;
  onBulkIncrementAges?: (options: Omit<BulkAgeIncrementOptions, 'targetAcademicYear'>) => BulkAgeIncrementStats | null;
  onDeleteChapel?: (chapelName: string) => void;
  // Attendance handlers
  onUpdateStudentWeeklyAttendance: (
    year: string,
    className: string,
    studentId: number | string,
    week: number,
    status: WeeklyAttendanceStatus
  ) => void;
  onBatchUpdateWeeklyAttendance: (
    year: string,
    className: string,
    week: number,
    statusUpdates: { [studentId: string]: WeeklyAttendanceStatus },
    weekDate?: string
  ) => void;
  onSetWeekDate: (year: string, week: number, dateStr: string) => void;
  onClearWeekAttendance: (year: string, className: string, week: number) => void;
  onAddAttendance: (rec: Omit<AbsenteeRecord, 'id'>) => void;
  onAddAttendanceBatch: (recs: Omit<AbsenteeRecord, 'id'>[]) => void;
  onDeleteAttendance: (id: number) => void;
  // Choir, Spiritual, Plan, Teachers, Subjects handlers
  onAddChoirMember: (m: Omit<ChoirMember, 'id'>) => void;
  onAddChoirMembersBatch: (list: Omit<ChoirMember, 'id'>[]) => void;
  onUpdateChoirMember?: (m: ChoirMember) => void;
  onDeleteChoirMember: (id: number) => void;
  onAddChoirGroup: (g: string) => void;
  onAddSpiritualMember: (m: Omit<SpiritualMember, 'id'>) => void;
  onAddSpiritualMembersBatch: (list: Omit<SpiritualMember, 'id'>[]) => void;
  onUpdateSpiritualMember?: (m: SpiritualMember) => void;
  onDeleteSpiritualMember: (id: number) => void;
  onAddSpiritualGroup: (g: string) => void;
  onUpdatePlan: (p: AnnualPlanItem) => void;
  onAddPlan: (p: Omit<AnnualPlanItem, 'id'>) => void;
  onDeletePlan: (id: number) => void;
  onImportPlans: (plans: AnnualPlanItem[]) => void;
  onUpdateTeacher: (t: Teacher) => void;
  onAddTeacher: (t: Omit<Teacher, 'id'>) => void;
  onDeleteTeacher: (id: number) => void;
  onReorderTeachers: (list: Teacher[]) => void;
  onUpdateClassSubjects: (map: { [className: string]: string[] }) => void;
  onAddSubject: (name: string) => void;
  onDeleteSubject: (idx: number) => void;
  // Spiritual Council submissions
  submissions?: MinistrySubmission[];
  onCreateSubmission?: (payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>) => void;
  onResubmitSubmission?: (id: number, updates: Partial<MinistrySubmission>) => void;
  onDeleteSubmission?: (id: number) => void;
  // Children's Ministry PIN control for Coordinator & Admin
  childrenCoordinatorPin?: string;
  childrenLeaderPin?: string;
  onSaveChildrenPins?: (coordinatorPin: string, leaderPin: string) => void;
  // Incoming Dispatched Plans
  planDispatches?: PlanDispatchItem[];
  onAcceptDispatch?: (dispatchId: number, mode: 'append' | 'replace') => void;
  onReturnDispatch?: (dispatchId: number, note: string) => void;
  // Department workspace updater (used for sector leaders roster)
  onUpdateDepartmentData?: (
    unitId: OrgUnitId,
    updater: (prev: DepartmentWorkspaceData) => DepartmentWorkspaceData
  ) => void;
}

export const ChildrenMinistryPortal: React.FC<ChildrenMinistryPortalProps> = (props) => {
  const {
    appData,
    currentYear,
    years,
    onYearChange,
    onAddYear,
    currentUserRole,
    loggedInTeacher,
    childrenCoordinatorPin = '5679',
    childrenLeaderPin = '5678',
    onSaveChildrenPins
  } = props;

  const { t, unitName } = useLanguage();

  const isFullController =
    currentUserRole === 'admin' || currentUserRole === 'children_coordinator';

  const [activeSubTab, setActiveSubTab] = useState<ChildrenSubTabId>(() =>
    currentUserRole === 'teacher'
      ? 'classesTab'
      : currentUserRole === 'children_coordinator'
      ? 'coordinatorControlTab'
      : 'churchChildrenTab'
  );
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  // Coordinator PIN management state
  const [coordPinInput, setCoordPinInput] = useState(childrenCoordinatorPin);
  const [leaderPinInput, setLeaderPinInput] = useState(childrenLeaderPin);
  const [showCoordPin, setShowCoordPin] = useState(false);
  const [showLeadPin, setShowLeadPin] = useState(false);
  const [pinSaveMsg, setPinSaveMsg] = useState('');

  useEffect(() => {
    setCoordPinInput(childrenCoordinatorPin);
  }, [childrenCoordinatorPin]);

  useEffect(() => {
    setLeaderPinInput(childrenLeaderPin);
  }, [childrenLeaderPin]);

  const handleSavePinsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveChildrenPins) return;
    const cPin = coordPinInput.trim();
    const lPin = leaderPinInput.trim();
    if (!cPin || !lPin) {
      alert(
        t(
          'እባክዎን የአስተባባሪ እና የአመራር መግቢያ ቁልፎችን (PIN) ያስገቡ!',
          'Please enter both Coordinator and Leader PINs!'
        )
      );
      return;
    }
    onSaveChildrenPins(cPin, lPin);
    setPinSaveMsg(
      t(
        '✓ የልጆች አገልግሎት አስተባባሪ እና የአመራር PIN ቁልፎች በተሳካ ሁኔታ ተቀምጠዋል!',
        'Children Ministry Coordinator & Leader PINs saved successfully!'
      )
    );
    setTimeout(() => setPinSaveMsg(''), 4000);
  };

  const handleAddYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newYearInput.trim()) {
      onAddYear(newYearInput.trim());
      setNewYearInput('');
      setShowAddYearModal(false);
    }
  };

  const childrenWorkspace =
    appData.departmentData?.children_ministry || createDefaultChildrenMinistryWorkspaceData();
  const childrenLeaders = childrenWorkspace.leaders || [];
  const childrenUnitRoleSuggestions =
    CHURCH_ORG_UNITS.find((u) => u.id === 'children_ministry')?.roleOptions || [];

  const subTabs: {
    id: ChildrenSubTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: Role[];
  }[] = [
    { id: 'coordinatorControlTab', label: t('የልጆች አገልግሎት አስተባባሪ', 'Children Coordinator'), icon: Shield, roles: ['admin', 'children_coordinator'] },
    { id: 'churchChildrenTab', label: t('የቤተክርስቲያን የልጆች ቋት (0–14)', 'Church Children Registry (0–14)'), icon: HeartHandshake, roles: ['admin', 'children_coordinator', 'leader'] },
    { id: 'allStudentsMasterTab', label: t('ሁሉም የሰንበት ተማሪዎች', 'All Sunday School Students'), icon: Users, roles: ['admin', 'children_coordinator', 'leader'] },
    { id: 'classesTab', label: t('የሰንበት ክፍሎች & ውጤት', 'Classes & Scores'), icon: GraduationCap, roles: ['admin', 'children_coordinator', 'leader', 'teacher'] },
    { id: 'attendanceTab', label: t('አተንዳንስ & መቆጣጠሪያ', 'Attendance & Tracking'), icon: CalendarCheck2, roles: ['admin', 'children_coordinator', 'leader', 'teacher'] },
    { id: 'choirTab', label: t('ጸሎት፣ መዝሙር፣ ምስክርነት እና ድራማ', 'Prayer, Choir, Witness & Drama'), icon: Music, roles: ['admin', 'children_coordinator', 'leader', 'teacher'] },
    { id: 'spiritualTab', label: t('መንፈሳዊና ደቀ መዝሙርነት ትምህርት', 'Spiritual & Discipleship'), icon: BookOpen, roles: ['admin', 'children_coordinator', 'leader', 'teacher'] },
    { id: 'topAchieversTab', label: t('መንፈሳዊና የቀለም ት/ት ሽልማት', 'Academic & Spiritual Awards'), icon: Award, roles: ['admin', 'children_coordinator', 'leader', 'teacher'] },
    { id: 'charterProgramsTab', label: t('ፕሮግራሞች፣ በጀት እና አወቃቀር', 'Programs, Budget & Structure'), icon: Layers, roles: ['admin', 'children_coordinator', 'leader'] },
    { id: 'leadersTab', label: t(`የኮሚቴና መሪዎች ዝርዝር (${childrenLeaders.length})`, `Committee & Leaders (${childrenLeaders.length})`), icon: UserCog, roles: ['admin', 'children_coordinator', 'leader'] },
    { id: 'teachersTab', label: t('መምህራን & PIN', 'Teachers & PIN'), icon: UserCheck, roles: ['admin', 'children_coordinator', 'leader'] },
    { id: 'subjectsTab', label: t('የትምህርት ዓይነቶች', 'Subjects'), icon: BookMarked, roles: ['admin', 'children_coordinator', 'leader'] },
    { id: 'planReportTab', label: t('የልጆች ዘርፍ ዕቅድ & ክንውን', 'Plans & Execution Reports'), icon: Target, roles: ['admin', 'children_coordinator', 'leader'] },
    { id: 'sendToSpiritualTab', label: t('ለመንፈሳዊ ዘርፍ መላኪያ', 'Send to Spiritual Council'), icon: Send, roles: ['admin', 'children_coordinator', 'leader'] }
  ];

  const visibleSubTabs = useMemo(
    () => subTabs.filter((tItem) => tItem.roles.includes(currentUserRole)),
    [currentUserRole, subTabs]
  );

  const totalSundayStudents = useMemo(() => {
    const yearMap = appData.students?.[currentYear] || {};
    return Object.values(yearMap).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  }, [appData.students, currentYear]);

  const duplicateTeacherPinsCount = useMemo(() => {
    const counts = new Map<string, number>();
    (appData.teachers || []).forEach((t) => {
      const p = String(t.pin || '').trim();
      if (p) counts.set(p, (counts.get(p) || 0) + 1);
    });
    let dups = 0;
    counts.forEach((c) => {
      if (c > 1) dups++;
    });
    return dups;
  }, [appData.teachers]);

  const pendingChildDispatches = useMemo(
    () =>
      (props.planDispatches || []).filter(
        (d) => d.targetUnitId === 'children_ministry' && d.status === 'pending'
      ),
    [props.planDispatches]
  );

  return (
    <div className="space-y-5">
      {pendingChildDispatches.length > 0 && currentUserRole !== 'teacher' && activeSubTab !== 'planReportTab' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs font-extrabold text-amber-950 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {t(
                `ከማዕከል የተላከ ${pendingChildDispatches.length} አዲስ የልጆች አገልግሎት ዕቅድ መቀበያ ውስጥ ይጠብቃል!`,
                `${pendingChildDispatches.length} new dispatched plan(s) waiting in Children Ministry inbox!`
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('planReportTab')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold cursor-pointer"
          >
            {t('ዕቅዱን ክፈትና ተቀበል →', 'Open & Accept Plan →')}
          </button>
        </div>
      )}
      {/* Header & Unified Children Ministry Summary */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span>
                {unitName('elders_council')} / {unitName('spiritual_council')} /{' '}
                <span className="text-blue-900 font-bold">{unitName('children_ministry')}</span>
              </span>
              {currentUserRole === 'children_coordinator' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-extrabold">
                  <Shield className="w-3 h-3 text-emerald-700" />
                  <span>{t('የልጆች አገልግሎት አስተባባሪ (ሙሉ ኃላፊነት)', 'Children Coordinator (Full Authority)')}</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('የልጆች አገልግሎት እና የሰንበት ትምህርት ቤት ማዕከል', 'Children Ministry & Sunday School Center')}
            </h2>
            <p className="text-xs text-slate-600">
              {currentUserRole === 'teacher' && loggedInTeacher
                ? t(
                    `መምህር ${loggedInTeacher.name} (${loggedInTeacher.assignedClass}) — የሰንበት ትምህርት ቤት ክፍል እና ተማሪዎች አስተዳደር`,
                    `Teacher ${loggedInTeacher.name} (${loggedInTeacher.assignedClass}) — Sunday School Class & Students Management`
                  )
                : currentUserRole === 'children_coordinator'
                ? t(
                    'የልጆች አገልግሎት አስተባባሪ — ሁሉንም ክፍሎች፣ ተማሪዎች፣ ውጤት፣ አተንዳንስ፣ መምህራን፣ ትምህርቶች፣ ዕቅድና መንፈሳዊ ቡድኖችን ሙሉ በሙሉ የሚቆጣጠርና የሚያስተዳድር',
                    'Children Coordinator — Full administrative control over all classes, students, grades, attendance, teachers, subjects, and plans'
                  )
                : t(
                    'የቤተክርስቲያን የልጆች መረጃ ቋት (0–14) እና ሙሉ የሰንበት ትምህርት ቤት ተማሪዎች፣ ውጤት፣ አተንዳንስ፣ መምህራንና ዕቅድ',
                    'Church Children Registry (0–14) & complete Sunday School students, grades, attendance, teachers, and plans'
                  )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600 tabular-nums shrink-0">
            {/* Academic Year Selector (Moved into Children's Ministry) */}
            <div className="flex items-center gap-2 bg-cyan-50/80 border border-cyan-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-cyan-700 shrink-0" />
              <span className="font-extrabold text-cyan-950 whitespace-nowrap">{t('የትምህርት ዘመን፦', 'Academic Year:')}</span>
              <select
                value={currentYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="bg-white text-slate-900 border border-cyan-300 rounded-lg px-2.5 py-1 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-cyan-600 cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} {t('ዓ/ም', 'E.C.')}
                  </option>
                ))}
              </select>
              {(isFullController || currentUserRole === 'leader') && (
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(true)}
                  className="bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title={t('አዲስ ዓመተ ምህረት ጨምር', 'Add Academic Year')}
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('አዲስ ዓ/ም', 'New Year')}</span>
                </button>
              )}
            </div>

            {currentUserRole !== 'teacher' && (
              <div>
                <div className="text-slate-400">{t('የልጆች ቋት (0–14)', 'Children (0–14)')}</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {(appData.churchChildren || []).length.toLocaleString()}
                </div>
              </div>
            )}
            <div>
              <div className="text-slate-400">{t('የሰንበት ተማሪዎች', 'Sunday Students')} ({currentYear})</div>
              <div className="text-lg font-extrabold text-slate-900">
                {totalSundayStudents.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-400">{t('መምህራን', 'Teachers')}</div>
              <div className="text-lg font-extrabold text-slate-900">
                {(appData.teachers || []).length.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-module Selector */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
          {visibleSubTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'planReportTab' && pendingChildDispatches.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tabular-nums">
                    {pendingChildDispatches.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Sub-Module Content */}
      <div>
        {activeSubTab === 'coordinatorControlTab' && isFullController && (
          <div className="space-y-5">
            {/* Coordinator Hero Overview */}
            <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 border border-emerald-800/60 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border border-emerald-300/35 text-emerald-300 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-extrabold text-white">
                      የልጆች አገልግሎት አስተባባሪ — ሙሉ መቆጣጠሪያ ማዕከል
                    </h3>
                    <p className="text-xs text-emerald-100/90 max-w-3xl leading-relaxed">
                      የልጆች አገልግሎት አስተባባሪ የልጆች አገልግሎት ገጽን ሙሉ በሙሉ የመቆጣጠር፣ የማስተዳደር፣ የማረም፣ አዳዲስ ተማሪዎችንና መምህራንን የመጨመር፣ ክፍሎችንና ውጤቶችን የማስተካከል እና ዕቅድ/ሪፖርት የመላክ ሙሉ ኃላፊነት አለው።
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Key KPIs with 1-Click Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>የልጆች ቋት (0–14 ዓመት)</span>
                  <HeartHandshake className="w-4 h-4 text-cyan-700" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {(appData.churchChildren || []).length.toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('churchChildrenTab')}
                  className="pt-2 border-t border-slate-100 text-xs font-bold text-cyan-800 hover:underline flex items-center justify-between cursor-pointer"
                >
                  <span>ቋቱን አስተዳድር / ጨምር / አርም</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>የሰንበት ተማሪዎች ({currentYear})</span>
                  <GraduationCap className="w-4 h-4 text-blue-800" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {totalSundayStudents.toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('classesTab')}
                  className="pt-2 border-t border-slate-100 text-xs font-bold text-blue-800 hover:underline flex items-center justify-between cursor-pointer"
                >
                  <span>ክፍሎችንና ውጤት አስተዳድር</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>መምህራንና የግል PINs</span>
                  <UserCheck className="w-4 h-4 text-teal-700" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {(appData.teachers || []).length.toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('teachersTab')}
                  className="pt-2 border-t border-slate-100 text-xs font-bold text-teal-800 hover:underline flex items-center justify-between cursor-pointer"
                >
                  <span>መምህራንንና PINs አስተዳድር</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>መዘምራን፣ ቡድኖችና ዕቅድ</span>
                  <Target className="w-4 h-4 text-indigo-700" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {((appData.choirMembers || []).length + (appData.spiritualMembers || []).length).toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('planReportTab')}
                  className="pt-2 border-t border-slate-100 text-xs font-bold text-indigo-800 hover:underline flex items-center justify-between cursor-pointer"
                >
                  <span>ዕቅድ፣ ሪፖርትና መላኪያ ክፈት</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Management Grid across ALL Children Ministry Areas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                  ሁሉንም የልጆች አገልግሎት ክፍሎች በፍጥነት መቆጣጠሪያ
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  አስተባባሪው ከዚህ በታች ያሉትን ሁሉንም ክፍሎች ሙሉ በሙሉ መጨመር፣ ማረም፣ መሰረዝና ማስተዳደር ይችላል።
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: 'churchChildrenTab' as ChildrenSubTabId, title: 'የልጆች ቋት (0–14)', desc: 'ህፃናትን መዝግብ፣ አርም፣ ሰርዝ፣ ወደ ሰንበት ት/ቤት አስገባ', icon: HeartHandshake },
                  { id: 'allStudentsMasterTab' as ChildrenSubTabId, title: 'ሁሉም የሰንበት ተማሪዎች', desc: 'የሁሉንም ክፍሎች ተማሪዎች አዘዋውር፣ አርም እና ቁጥጥር አድርግ', icon: Users },
                  { id: 'classesTab' as ChildrenSubTabId, title: 'የሰንበት ክፍሎች & ውጤት', desc: 'ተማሪዎችን ጨምር/ሰርዝ፣ ውጤት አርም፣ በExcel ጫን', icon: GraduationCap },
                  { id: 'attendanceTab' as ChildrenSubTabId, title: 'አተንዳንስ & መቆጣጠሪያ', desc: 'ሳምንታዊ አተንዳንስ ይያዙ፣ ቀሪዎችን ይከታተሉ', icon: CalendarCheck2 },
                  { id: 'choirTab' as ChildrenSubTabId, title: 'ጸሎት፣ መዝሙር፣ ምስክርነት እና ድራማ', desc: 'የጸሎት፣ መዝሙር፣ ምስክርነትና ድራማ ቡድኖችን አደራጅ እና አስተባብር', icon: Music },
                  { id: 'spiritualTab' as ChildrenSubTabId, title: 'መንፈሳዊና ደቀ መዝሙርነት ትምህርት', desc: 'ዕድሜ-ተኮር ትምህርቶችና የደቀ መዝሙርነት ቡድኖችን መዝግብ', icon: BookOpen },
                  { id: 'charterProgramsTab' as ChildrenSubTabId, title: 'ፕሮግራሞች፣ በጀት እና ውስጣዊ ደንብ', desc: 'የምስጋና ቀን፣ ርኁራኄ፣ ስልጠና፣ ክህሎት፣ በጀት እና የአገልግሎቱን መዋቅር አስተዳድር', icon: Layers },
                  { id: 'topAchieversTab' as ChildrenSubTabId, title: 'መንፈሳዊና የቀለም ት/ት ሽልማት', desc: 'በመንፈሳዊና በቀለም ትምህርት ልቀው የተገኙ ልጆችን መዝግብና ሸልም', icon: Award },
                  { id: 'teachersTab' as ChildrenSubTabId, title: 'መምህራን & PIN', desc: 'መምህራንን ጨምር፣ ክፍል/ትምህርት መድብ፣ PIN አስተካክል', icon: UserCheck },
                  { id: 'subjectsTab' as ChildrenSubTabId, title: 'የትምህርት ዓይነቶች', desc: 'ትምህርቶችን ጨምር/ሰርዝና ለየክፍሉ መድብ', icon: BookMarked },
                  { id: 'sendToSpiritualTab' as ChildrenSubTabId, title: 'ለመንፈሳዊ ዘርፍ መላኪያ', desc: 'ዕቅድ፣ ሪፖርትና ደብዳቤዎችን ለመንፈሳዊ ዘርፍ ላክ', icon: Send }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSubTab(item.id)}
                      className="text-left p-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50/40 transition flex items-start justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                            {item.title}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-emerald-700 shrink-0 opacity-70 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Children's Ministry PIN & Access Management */}
            {onSaveChildrenPins && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-700" />
                      <span>የልጆች አገልግሎት መግቢያ ቁልፎች (PINs) አስተዳደር</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      የልጆች አገልግሎት አስተባባሪ እና የአመራር መግቢያ PIN ቁልፎችን እዚህ ማስተካከል ይችላሉ።
                    </p>
                  </div>
                  {duplicateTeacherPinsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('teachersTab')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{duplicateTeacherPinsCount} የተደጋገሙ የመምህራን PIN አሉ — አስተካክል</span>
                    </button>
                  )}
                </div>

                {pinSaveMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{pinSaveMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSavePinsSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      የልጆች አገልግሎት አስተባባሪ PIN
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
                      የልጆች አገልግሎት አመራር PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showLeadPin ? 'text' : 'password'}
                        value={leaderPinInput}
                        onChange={(e) => setLeaderPinInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-600"
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

                  <div>
                    <button
                      type="submit"
                      className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>የልጆች አገልግሎት PIN አስቀምጥ</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'churchChildrenTab' && currentUserRole !== 'teacher' && (
          <ChurchChildrenTab
            currentYear={currentYear}
            ageReferenceYear={appData.ageReferenceYear || 2017}
            classList={props.classList}
            churchChildren={appData.churchChildren || []}
            churchMembers={appData.churchMembers || []}
            chapelList={appData.chapels || DEFAULT_CHAPELS}
            studentsByClass={appData.students?.[currentYear] || {}}
            onAddChild={props.onAddChild}
            onAddChurchMember={props.onAddChurchMember}
            onUpdateChild={props.onUpdateChild}
            onDeleteChild={props.onDeleteChild}
            onClearChurchChildren={props.onClearChurchChildren}
            onBatchAddChildren={props.onBatchAddChildren}
            onEnrollToSundaySchool={props.onEnrollToSundaySchool}
            onImportMissingStudentsToChurchChildren={props.onImportMissingStudentsToChurchChildren}
            onBulkIncrementAges={props.onBulkIncrementAges}
            currentUserRole={currentUserRole}
            onDeleteChapel={props.onDeleteChapel}
            nameScriptMode={props.nameScriptMode}
            onChangeNameScriptMode={props.onChangeNameScriptMode}
            onOpenTransliterator={props.onOpenTransliterator}
          />
        )}

        {activeSubTab === 'allStudentsMasterTab' && currentUserRole !== 'teacher' && (
          <AllStudentsMasterTab
            currentYear={currentYear}
            classList={props.classList}
            teachers={appData.teachers}
            studentsByClass={appData.students?.[currentYear] || {}}
            choirMembers={appData.choirMembers || []}
            spiritualMembers={appData.spiritualMembers || []}
            churchChildren={appData.churchChildren || []}
            churchMembers={appData.churchMembers || []}
            chapelList={appData.chapels || DEFAULT_CHAPELS}
            onUpdateStudent={props.onUpdateStudent}
            onAddStudentToClass={props.onAddStudentToClass}
            onDeleteStudent={props.onDeleteStudent}
            onMoveStudentClass={props.onMoveStudentClass}
            onGoToClass={(cName) => {
              props.onSelectClass(cName);
              setActiveSubTab('classesTab');
            }}
            currentUserRole={currentUserRole}
            nameScriptMode={props.nameScriptMode}
          />
        )}

        {activeSubTab === 'classesTab' && (
          <ClassesTab
            currentYear={currentYear}
            classList={props.classList}
            selectedClass={props.selectedClass}
            onSelectClass={props.onSelectClass}
            teachers={appData.teachers}
            students={props.currentClassStudents}
            onUpdateStudent={props.onUpdateStudent}
            onAddStudent={props.onAddStudent}
            onAddStudentsBatch={props.onAddStudentsBatch}
            onAddStudentsMultiClass={props.onAddStudentsMultiClass}
            onDeleteStudent={props.onDeleteStudent}
            onClearClassStudents={props.onClearClassStudents}
            onClearClassScores={props.onClearClassScores}
            onSetClassAge={props.onSetClassAge}
            onGoToAttendance={() => setActiveSubTab('attendanceTab')}
            onGoToAllStudents={() => setActiveSubTab('allStudentsMasterTab')}
            currentUserRole={currentUserRole}
            loggedInTeacher={loggedInTeacher}
            subjects={appData.subjects}
            classSubjects={appData.classSubjects || {}}
            onUpdateClassSubjects={props.onUpdateClassSubjects}
            churchChildren={appData.churchChildren || []}
            churchMembers={appData.churchMembers || []}
            nameScriptMode={props.nameScriptMode}
          />
        )}

        {activeSubTab === 'attendanceTab' && (
          <AttendanceTab
            currentYear={currentYear}
            classList={props.classList}
            studentsByClass={appData.students?.[currentYear] || {}}
            weeklyAttendance={appData.weeklyAttendance?.[currentYear] || {}}
            weekDates={appData.weekDates?.[currentYear] || {}}
            attendance={appData.attendance || []}
            onUpdateStudentWeeklyAttendance={props.onUpdateStudentWeeklyAttendance}
            onBatchUpdateWeeklyAttendance={props.onBatchUpdateWeeklyAttendance}
            onSetWeekDate={props.onSetWeekDate}
            onClearWeekAttendance={props.onClearWeekAttendance}
            onAddAttendance={props.onAddAttendance}
            onAddAttendanceBatch={props.onAddAttendanceBatch}
            onDeleteAttendance={props.onDeleteAttendance}
            onAddStudentToClass={props.onAddStudentToClass}
            onUpdateStudent={props.onUpdateStudent}
            onDeleteStudent={props.onDeleteStudent}
            onClearClassStudents={props.onClearClassStudents}
            onSetClassAge={props.onSetClassAge}
            currentUserRole={currentUserRole}
            loggedInTeacher={loggedInTeacher}
            nameScriptMode={props.nameScriptMode}
          />
        )}

        {activeSubTab === 'choirTab' && (
          <ChoirTab
            groups={appData.choirGroups || []}
            members={appData.choirMembers || []}
            onAddMember={props.onAddChoirMember}
            onAddMembersBatch={props.onAddChoirMembersBatch}
            onUpdateMember={props.onUpdateChoirMember}
            onDeleteMember={props.onDeleteChoirMember}
            onAddGroup={props.onAddChoirGroup}
            currentUserRole={currentUserRole}
          />
        )}

        {activeSubTab === 'spiritualTab' && (
          <SpiritualTab
            groups={appData.spiritualGroups || []}
            members={appData.spiritualMembers || []}
            onAddMember={props.onAddSpiritualMember}
            onAddMembersBatch={props.onAddSpiritualMembersBatch}
            onUpdateMember={props.onUpdateSpiritualMember}
            onDeleteMember={props.onDeleteSpiritualMember}
            onAddGroup={props.onAddSpiritualGroup}
            currentUserRole={currentUserRole}
          />
        )}

        {activeSubTab === 'topAchieversTab' && (
          <TopAchieversTab
            currentYear={currentYear}
            classList={props.classList}
            studentsByClass={appData.students?.[currentYear] || {}}
            nameScriptMode={props.nameScriptMode}
            academicAwards={childrenWorkspace.childrenAcademicAwards || []}
            currentUserRole={currentUserRole}
            onSaveAcademicAwards={
              props.onUpdateDepartmentData
                ? (nextAwards) =>
                    props.onUpdateDepartmentData?.('children_ministry', (prev) => ({
                      ...prev,
                      childrenAcademicAwards: nextAwards
                    }))
                : undefined
            }
          />
        )}

        {activeSubTab === 'charterProgramsTab' && currentUserRole !== 'teacher' && (
          <ChildrenCharterAndProgramsPanel
            currentYear={currentYear}
            currentUserRole={currentUserRole}
            ws={childrenWorkspace}
            onUpdateWorkspace={(updater) =>
              props.onUpdateDepartmentData?.('children_ministry', updater)
            }
            onNavigateSubTab={(target) => setActiveSubTab(target)}
          />
        )}

        {activeSubTab === 'leadersTab' && currentUserRole !== 'teacher' && (
          <UnitLeadersRosterTab
            unitTitle={unitName('children_ministry', 'የልጆች አገልግሎት')}
            currentYear={currentYear}
            leaders={childrenLeaders}
            roleSuggestions={childrenUnitRoleSuggestions}
            structureNote="የልጆች አገልግሎት ኮሚቴ እንደ አስፈላጊነቱ ከ3 እስከ 7 አባላት እና የሙሉ ጊዜ የልጆች አገልግሎት አስተባባሪ ይኖረዋል። አገልግሎቱ ተጠሪነቱ ለመንፈሳዊ ዘርፍ ኃላፊ ሲሆን፤ አስተባባሪው ለመንፈሳዊ ዘርፍ ኃላፊና ለሰብሳቢ ተጠሪ ነው። የሰብሳቢው አንድ የምርጫ ዙር ሦስት ዓመት ሲሆን ለሁለተኛ ዙር ከተመረጠ እና አንድ የምርጫ ዙር ከማንኛውም መዋቅር መሪነት በማረፍ በድጋሚ ሊመረጥ ይችላል።"
            churchMembers={appData.churchMembers || []}
            onSaveLeaders={(nextLeaders) =>
              props.onUpdateDepartmentData?.('children_ministry', (prev) => ({
                ...prev,
                leaders: nextLeaders
              }))
            }
          />
        )}

        {activeSubTab === 'teachersTab' && currentUserRole !== 'teacher' && (
          <TeachersTab
            teachers={appData.teachers}
            classList={props.classList}
            subjects={appData.subjects}
            currentUserRole={currentUserRole}
            onUpdateTeacher={props.onUpdateTeacher}
            onAddTeacher={props.onAddTeacher}
            onDeleteTeacher={props.onDeleteTeacher}
            onReorderTeachers={props.onReorderTeachers}
          />
        )}

        {activeSubTab === 'subjectsTab' && currentUserRole !== 'teacher' && (
          <SubjectsTab
            subjects={appData.subjects}
            classList={props.classList}
            classSubjects={appData.classSubjects || {}}
            onUpdateClassSubjects={props.onUpdateClassSubjects}
            onAddSubject={props.onAddSubject}
            onDeleteSubject={props.onDeleteSubject}
            currentUserRole={currentUserRole}
          />
        )}

        {activeSubTab === 'planReportTab' && currentUserRole !== 'teacher' && (
          <PlanReportTab
            currentYear={currentYear}
            plans={appData.plans || DEFAULT_ANNUAL_PLAN}
            onUpdatePlan={props.onUpdatePlan}
            onAddPlan={props.onAddPlan}
            onDeletePlan={props.onDeletePlan}
            onImportPlans={props.onImportPlans}
            onSendToSpiritual={props.onCreateSubmission}
            onGoToAllStudents={() => setActiveSubTab('allStudentsMasterTab')}
            totalStudentsCount={countStudentsInData(appData)}
            classList={props.classList}
            studentsByClass={appData.students?.[currentYear] || {}}
            churchChildren={appData.churchChildren || []}
            churchMembers={appData.churchMembers || []}
            planDispatches={props.planDispatches || []}
            onAcceptDispatch={props.onAcceptDispatch}
            onReturnDispatch={props.onReturnDispatch}
          />
        )}

        {activeSubTab === 'sendToSpiritualTab' && currentUserRole !== 'teacher' && (
          <MinistrySubmissionsPanel
            mode="sender"
            unitId="children_ministry"
            unitName={unitName('children_ministry', 'የልጆች አገልግሎት')}
            currentYear={currentYear}
            submissions={props.submissions || []}
            availablePlans={appData.plans || DEFAULT_ANNUAL_PLAN}
            activitiesSummaryText={`የልጆች አገልግሎት እና ሰንበት ት/ቤት (${currentYear} ዓ/ም) ማጠቃለያ፦\n• የቤተክርስቲያን ልጆች (0–14 ዓመት)፦ ${(appData.churchChildren || []).length}\n• የሰንበት ት/ቤት ተማሪዎች፦ ${totalSundayStudents}\n• መምህራን፦ ${(appData.teachers || []).length}`}
            onCreateSubmission={props.onCreateSubmission}
            onResubmitSubmission={props.onResubmitSubmission}
            onDeleteSubmission={props.onDeleteSubmission}
          />
        )}
      </div>

      {/* Add Academic Year Modal (Children Ministry) */}
      {showAddYearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl text-slate-800 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">አዲስ የትምህርት ዘመን ጨምር</h3>
            <p className="text-xs text-slate-500 mb-4">
              ለምሳሌ: 2020፣ 2021 ወይም ተፈላጊውን የትምህርት ዘመን ያስገቡ።
            </p>
            <form onSubmit={handleAddYearSubmit}>
              <input
                type="text"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                placeholder="ምሳሌ፡ 2025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg font-semibold cursor-pointer"
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
