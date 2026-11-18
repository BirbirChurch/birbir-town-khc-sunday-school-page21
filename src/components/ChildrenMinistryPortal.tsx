import React, { useMemo, useState } from 'react';
import {
  HeartHandshake,
  Users,
  GraduationCap,
  CalendarCheck2,
  Music,
  BookOpen,
  Award,
  UserCheck,
  BookMarked,
  Target,
  Send,
  Calendar,
  Plus
} from 'lucide-react';
import {
  AbsenteeRecord,
  AnnualPlanItem,
  AppData,
  ChoirMember,
  ChurchChild,
  ChurchMember,
  MinistrySubmission,
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

export type ChildrenSubTabId =
  | 'churchChildrenTab'
  | 'allStudentsMasterTab'
  | 'classesTab'
  | 'attendanceTab'
  | 'choirTab'
  | 'spiritualTab'
  | 'topAchieversTab'
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
  onDeleteChoirMember: (id: number) => void;
  onAddChoirGroup: (g: string) => void;
  onAddSpiritualMember: (m: Omit<SpiritualMember, 'id'>) => void;
  onAddSpiritualMembersBatch: (list: Omit<SpiritualMember, 'id'>[]) => void;
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
}

export const ChildrenMinistryPortal: React.FC<ChildrenMinistryPortalProps> = (props) => {
  const { appData, currentYear, years, onYearChange, onAddYear, currentUserRole, loggedInTeacher } = props;

  const [activeSubTab, setActiveSubTab] = useState<ChildrenSubTabId>(() =>
    currentUserRole === 'teacher' ? 'classesTab' : 'churchChildrenTab'
  );
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  const handleAddYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newYearInput.trim()) {
      onAddYear(newYearInput.trim());
      setNewYearInput('');
      setShowAddYearModal(false);
    }
  };

  const subTabs: {
    id: ChildrenSubTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: Role[];
  }[] = [
    { id: 'churchChildrenTab', label: 'የቤተክርስቲያን የልጆች ቋት (0–14)', icon: HeartHandshake, roles: ['admin', 'leader'] },
    { id: 'allStudentsMasterTab', label: 'ሁሉም የሰንበት ተማሪዎች', icon: Users, roles: ['admin', 'leader'] },
    { id: 'classesTab', label: 'የሰንበት ክፍሎች & ውጤት', icon: GraduationCap, roles: ['admin', 'leader', 'teacher'] },
    { id: 'attendanceTab', label: 'አተንዳንስ & መቆጣጠሪያ', icon: CalendarCheck2, roles: ['admin', 'leader', 'teacher'] },
    { id: 'choirTab', label: 'መዘምራንና ኪነ-ጥበብ', icon: Music, roles: ['admin', 'leader', 'teacher'] },
    { id: 'spiritualTab', label: 'መንፈሳዊ ትምህርት ቡድኖች', icon: BookOpen, roles: ['admin', 'leader', 'teacher'] },
    { id: 'topAchieversTab', label: 'ከ1ኛ - 3ኛ ደረጃዎች', icon: Award, roles: ['admin', 'leader', 'teacher'] },
    { id: 'teachersTab', label: 'መምህራን & PIN', icon: UserCheck, roles: ['admin', 'leader'] },
    { id: 'subjectsTab', label: 'የትምህርት ዓይነቶች', icon: BookMarked, roles: ['admin', 'leader'] },
    { id: 'planReportTab', label: 'የልጆች ዘርፍ ዕቅድ & ሪፖርት', icon: Target, roles: ['admin', 'leader'] },
    { id: 'sendToSpiritualTab', label: 'ለመንፈሳዊ ዘርፍ መላኪያ', icon: Send, roles: ['admin', 'leader'] }
  ];

  const visibleSubTabs = useMemo(
    () => subTabs.filter((t) => t.roles.includes(currentUserRole)),
    [currentUserRole]
  );

  const totalSundayStudents = useMemo(() => {
    const yearMap = appData.students?.[currentYear] || {};
    return Object.values(yearMap).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  }, [appData.students, currentYear]);

  return (
    <div className="space-y-5">
      {/* Header & Unified Children Ministry Summary */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-500">
              የሽማግሌዎች ጉባኤ / የመንፈሳዊ ዘርፍ ጉባኤ /{' '}
              <span className="text-blue-900 font-bold">የልጆች አገልግሎት</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              የልጆች አገልግሎት እና የሰንበት ትምህርት ቤት ማዕከል
            </h2>
            <p className="text-xs text-slate-600">
              {currentUserRole === 'teacher' && loggedInTeacher
                ? `መምህር ${loggedInTeacher.name} (${loggedInTeacher.assignedClass}) — የሰንበት ትምህርት ቤት ክፍል እና ተማሪዎች አስተዳደር`
                : 'የቤተክርስቲያን የልጆች መረጃ ቋት (0–14) እና ሙሉ የሰንበት ትምህርት ቤት ተማሪዎች፣ ውጤት፣ አተንዳንስ፣ መምህራንና ዕቅድ'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600 tabular-nums shrink-0">
            {/* Academic Year Selector (Moved into Children's Ministry) */}
            <div className="flex items-center gap-2 bg-cyan-50/80 border border-cyan-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-cyan-700 shrink-0" />
              <span className="font-extrabold text-cyan-950 whitespace-nowrap">የትምህርት ዘመን፦</span>
              <select
                value={currentYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="bg-white text-slate-900 border border-cyan-300 rounded-lg px-2.5 py-1 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-cyan-600 cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} ዓ/ም
                  </option>
                ))}
              </select>
              {(currentUserRole === 'admin' || currentUserRole === 'leader') && (
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(true)}
                  className="bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title="አዲስ ዓመተ ምህረት ጨምር"
                >
                  <Plus className="w-3 h-3" />
                  <span>አዲስ ዓ/ም</span>
                </button>
              )}
            </div>

            {currentUserRole !== 'teacher' && (
              <div>
                <div className="text-slate-400">የልጆች ቋት (0–14)</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {(appData.churchChildren || []).length.toLocaleString()}
                </div>
              </div>
            )}
            <div>
              <div className="text-slate-400">የሰንበት ተማሪዎች ({currentYear})</div>
              <div className="text-lg font-extrabold text-slate-900">
                {totalSundayStudents.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-400">መምህራን</div>
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
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Sub-Module Content */}
      <div>
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
            onGoToAllStudents={() => setActiveSubTab('allStudentsMasterTab')}
            totalStudentsCount={countStudentsInData(appData)}
            classList={props.classList}
            studentsByClass={appData.students?.[currentYear] || {}}
            churchChildren={appData.churchChildren || []}
            churchMembers={appData.churchMembers || []}
          />
        )}

        {activeSubTab === 'sendToSpiritualTab' && currentUserRole !== 'teacher' && (
          <MinistrySubmissionsPanel
            mode="sender"
            unitId="children_ministry"
            unitName="የልጆች አገልግሎት"
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
