/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Shield,
  KeyRound,
  Calendar,
  Languages,
  BarChart3,
  X,
  Building2
} from 'lucide-react';
import {
  Role,
  OrgUnitId,
  Teacher,
  Student,
  AbsenteeRecord,
  ChoirMember,
  SpiritualMember,
  AnnualPlanItem,
  AppData,
  WeeklyAttendanceStatus,
  ChurchChild,
  ChurchMember,
  DepartmentWorkspaceData,
  MinistrySubmission
} from './types';
import { CLASS_LIST, DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from './constants/initialData';
import {
  CHURCH_ORG_UNITS,
  DEFAULT_ORG_UNIT_PINS,
  createEmptyDepartmentWorkspaceData,
  getOrgUnitById
} from './constants/churchStructure';
import { subscribeToAppData, syncAppDataToFirebase, saveToLocalStorage, countStudentsInData, exportBackupJSON, importBackupJSON } from './services/firebase';
import { generateUniqueId, sanitizeAndDeduplicateAppData } from './utils/idGenerator';
import { normalizeAmharicSearchText } from './utils/churchExcelParser';
import {
  assignSequentialCodesAndSortMembers,
  getNextFamilySubCode,
  getNextMemberCodeForChapel,
  getRootFamilyBaseCode,
  normalizeCodeForLookup,
  parseChapelCodeParts
} from './utils/memberCodeGenerator';
import {
  applyBulkAgeIncrementToAppData,
  BulkAgeIncrementOptions,
  BulkAgeIncrementStats
} from './utils/ageUpdater';
import { Header } from './components/Header';
import { LoginPortal } from './components/LoginPortal';
import { mapToOfficialChapel } from './components/ChurchChildrenTab';
import { PinManageTab } from './components/PinManageTab';
import { FirebaseSyncModal } from './components/FirebaseSyncModal';
import { NameTransliteratorModal } from './components/NameTransliteratorModal';
import { ChurchStatisticsDashboardTab } from './components/ChurchStatisticsDashboardTab';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { DepartmentWorkspacePage } from './components/DepartmentWorkspacePage';
import { ChildrenMinistryPortal } from './components/ChildrenMinistryPortal';
import { ChapelsHubPage } from './components/ChapelsHubPage';
import { NameScriptMode } from './utils/amharicTransliterator';

export default function App() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'saving' | 'offline' | 'error'>('connected');
  const [currentYear, setCurrentYear] = useState<string>('2019');
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>(CLASS_LIST[3]); // 1ኛ ክፍል ሀ
  const [loggedInUnit, setLoggedInUnit] = useState<OrgUnitId | null>(null);
  const [activeOrgUnit, setActiveOrgUnit] = useState<OrgUnitId>('office');
  const [activeAdminView, setActiveAdminView] = useState<
    'adminOverview' | 'pinManageTab' | 'churchOverviewStatsTab' | 'unitPage'
  >('adminOverview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isTransliteratorModalOpen, setIsTransliteratorModalOpen] = useState<boolean>(false);
  const [nameScriptMode, setNameScriptMode] = useState<NameScriptMode>(() => {
    try {
      const saved = localStorage.getItem('bk_name_script_mode');
      if (saved === 'am' || saved === 'both' || saved === 'en') return saved;
    } catch {
      // ignore storage failure
    }
    return 'am';
  });
  const handleChangeNameScriptMode = useCallback((mode: NameScriptMode) => {
    setNameScriptMode(mode);
    try {
      localStorage.setItem('bk_name_script_mode', mode);
    } catch {
      // ignore storage failure
    }
  }, []);
  const [dismissedAgeBannerYear, setDismissedAgeBannerYear] = useState<string | null>(null);
  const [ageSyncFeedback, setAgeSyncFeedback] = useState<string>('');

  // Connect to Firebase Realtime Database and Firestore
  useEffect(() => {
    const unsubscribe = subscribeToAppData(
      (data) => {
        const sanitized = sanitizeAndDeduplicateAppData(data);
        setAppData(sanitized);
        if (sanitized.years && sanitized.years.length > 0 && !sanitized.years.includes(currentYear)) {
          setCurrentYear(sanitized.years[0]);
        }
      },
      (status) => {
        setSyncStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<AppData | null>(null);

  // Keep latestDataRef in sync with state
  useEffect(() => {
    latestDataRef.current = appData;
  }, [appData]);

  // Flush any pending unsynced changes if page is closed or reloaded
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (syncTimeoutRef.current && latestDataRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncAppDataToFirebase(latestDataRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (syncTimeoutRef.current && latestDataRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncAppDataToFirebase(latestDataRef.current);
      }
    };
  }, []);

  // Instant local state update with debounced background cloud sync
  const updateAppData = useCallback(
    (updater: (prev: AppData) => AppData, options?: { immediate?: boolean }) => {
      setAppData((prev) => {
        if (!prev) return prev;
        const updated = updater(prev);
        latestDataRef.current = updated;

        // 1. Immediately save to localStorage (0ms persistence)
        saveToLocalStorage(updated);

        // 2. Debounce cloud sync to avoid freezing UI or overloading network
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }

        if (options?.immediate) {
          setSyncStatus('saving');
          syncAppDataToFirebase(updated)
            .then(() => setSyncStatus('connected'))
            .catch(() => setSyncStatus('offline'));
        } else {
          syncTimeoutRef.current = setTimeout(() => {
            if (latestDataRef.current) {
              setSyncStatus('saving');
              syncAppDataToFirebase(latestDataRef.current)
                .then(() => setSyncStatus('connected'))
                .catch(() => setSyncStatus('offline'));
            }
          }, 600);
        }

        return updated;
      });
    },
    []
  );

  const [loggedInChapel, setLoggedInChapel] = useState<string | null>(null);

  // Handlers for Login
  const handleLoginSuccess = (
    role: Role,
    teacher?: Teacher,
    chapel?: string,
    unitId?: OrgUnitId
  ) => {
    setCurrentUserRole(role);
    setIsMobileSidebarOpen(false);
    if (role === 'admin') {
      setLoggedInTeacher(null);
      setLoggedInChapel(null);
      setLoggedInUnit(null);
      setActiveAdminView('adminOverview');
      setActiveOrgUnit('office');
    } else if (role === 'teacher' && teacher) {
      setLoggedInTeacher(teacher);
      setSelectedClass(teacher.assignedClass);
      setLoggedInChapel(null);
      setLoggedInUnit('children_ministry');
      setActiveOrgUnit('children_ministry');
    } else {
      setLoggedInTeacher(null);
      setLoggedInChapel(chapel || null);
      const resolvedUnit: OrgUnitId =
        unitId || (chapel ? 'chapels_dept' : 'children_ministry');
      setLoggedInUnit(resolvedUnit);
      setActiveOrgUnit(resolvedUnit);
      if (resolvedUnit === 'elders_council') {
        setActiveAdminView('unitPage');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    setLoggedInTeacher(null);
    setLoggedInChapel(null);
    setLoggedInUnit(null);
    setActiveAdminView('adminOverview');
    setActiveOrgUnit('office');
    setIsMobileSidebarOpen(false);
  };

  const canNavigateToUnit = useCallback(
    (targetUnitId: OrgUnitId): boolean => {
      if (currentUserRole === 'admin') return true;
      if (currentUserRole === 'teacher' || loggedInChapel) return false;
      if (!loggedInUnit) return false;
      if (targetUnitId === loggedInUnit) return true;
      if (loggedInUnit === 'elders_council') return true;
      if (loggedInUnit === 'office') {
        return targetUnitId === 'holistic_community' || targetUnitId === 'admin_finance';
      }
      if (loggedInUnit === 'spiritual_council') {
        const target = getOrgUnitById(targetUnitId);
        return target?.parentId === 'spiritual_council';
      }
      return false;
    },
    [currentUserRole, loggedInChapel, loggedInUnit]
  );

  const handleSelectUnit = useCallback(
    (targetUnitId: OrgUnitId) => {
      if (!canNavigateToUnit(targetUnitId)) return;
      setActiveOrgUnit(targetUnitId);
      if (currentUserRole === 'admin' || loggedInUnit === 'elders_council') {
        setActiveAdminView('unitPage');
      }
      setIsMobileSidebarOpen(false);
    },
    [canNavigateToUnit, currentUserRole, loggedInUnit]
  );

  const handleUpdateDepartmentData = useCallback(
    (
      unitId: OrgUnitId,
      updater: (prev: DepartmentWorkspaceData) => DepartmentWorkspaceData
    ) => {
      updateAppData(
        (prev) => {
          const currentMap = prev.departmentData || {};
          const existing = currentMap[unitId] || createEmptyDepartmentWorkspaceData();
          return {
            ...prev,
            departmentData: {
              ...currentMap,
              [unitId]: updater(existing)
            }
          };
        },
        { immediate: true }
      );
    },
    [updateAppData]
  );

  // Ministry Plans, Reports & Letters Workflow Handlers
  const handleCreateSubmission = useCallback(
    (payload: Omit<MinistrySubmission, 'id' | 'status' | 'submittedAt'>) => {
      const now = new Date().toISOString();
      const newSubmission: MinistrySubmission = {
        ...payload,
        id: generateUniqueId(),
        status: 'pending_spiritual',
        submittedAt: now
      };
      updateAppData(
        (prev) => ({
          ...prev,
          submissions: [newSubmission, ...(prev.submissions || [])]
        }),
        { immediate: true }
      );
    },
    [updateAppData]
  );

  const handleResubmitSubmission = useCallback(
    (id: number, updates: Partial<MinistrySubmission>) => {
      const now = new Date().toISOString();
      updateAppData(
        (prev) => ({
          ...prev,
          submissions: (prev.submissions || []).map((s) =>
            s.id === id
              ? {
                  ...s,
                  ...updates,
                  status: 'pending_spiritual',
                  updatedAt: now
                }
              : s
          )
        }),
        { immediate: true }
      );
    },
    [updateAppData]
  );

  const handleDeleteSubmission = useCallback(
    (id: number) => {
      updateAppData(
        (prev) => ({
          ...prev,
          submissions: (prev.submissions || []).filter((s) => s.id !== id)
        }),
        { immediate: true }
      );
    },
    [updateAppData]
  );

  const handleSpiritualApproveSubmission = useCallback(
    (id: number, note?: string, forwardToAdmin?: boolean, forwardNote?: string) => {
      const now = new Date().toISOString();
      updateAppData(
        (prev) => ({
          ...prev,
          submissions: (prev.submissions || []).map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: forwardToAdmin ? 'forwarded_to_admin' : 'approved_spiritual',
                  updatedAt: now,
                  spiritualReviewedAt: now,
                  spiritualNote: note ?? s.spiritualNote,
                  forwardedToAdmin: Boolean(forwardToAdmin) || s.forwardedToAdmin,
                  forwardedToAdminAt: forwardToAdmin ? now : s.forwardedToAdminAt,
                  forwardedToAdminNote: forwardToAdmin ? forwardNote : s.forwardedToAdminNote
                }
              : s
          )
        }),
        { immediate: true }
      );
    },
    [updateAppData]
  );

  const handleSpiritualReturnSubmission = useCallback(
    (id: number, note: string) => {
      const now = new Date().toISOString();
      updateAppData(
        (prev) => ({
          ...prev,
          submissions: (prev.submissions || []).map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'returned_by_spiritual',
                  updatedAt: now,
                  spiritualReviewedAt: now,
                  spiritualNote: note
                }
              : s
          )
        }),
        { immediate: true }
      );
    },
    [updateAppData]
  );

  const handleForwardSubmissionToAdmin = useCallback(
    (id: number, note?: string) => {
      const now = new Date().toISOString();
      updateAppData(
        (prev) => ({
          ...prev,
          submissions: (prev.submissions || []).map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'forwarded_to_admin',
                  updatedAt: now,
                  spiritualReviewedAt: s.spiritualReviewedAt || now,
                  forwardedToAdmin: true,
                  forwardedToAdminAt: now,
                  forwardedToAdminNote: note ?? s.forwardedToAdminNote
                }
              : s
          )
        }),
        { immediate: true }
      );
    },
    [updateAppData]
  );

  const handleAdminAcknowledgeSubmission = useCallback(
    (id: number, note?: string) => {
      const now = new Date().toISOString();
      updateAppData(
        (prev) => ({
          ...prev,
          submissions: (prev.submissions || []).map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'acknowledged_by_admin',
                  updatedAt: now,
                  adminReviewedAt: now,
                  adminNote: note ?? s.adminNote
                }
              : s
          )
        }),
        { immediate: true }
      );
    },
    [updateAppData]
  );

  // Add academic year
  const handleAddYear = (newYear: string) => {
    updateAppData(
      (prev) => ({
        ...prev,
        years: prev.years.includes(newYear) ? prev.years : [...prev.years, newYear]
      }),
      { immediate: true }
    );
    setCurrentYear(newYear);
  };

  // Students handlers
  const currentClassStudents = useMemo(() => {
    if (!appData) return [];
    return appData.students?.[currentYear]?.[selectedClass] || [];
  }, [appData, currentYear, selectedClass]);

  const handleUpdateStudent = (updatedStudent: Student) => {
    updateAppData((prev) => {
      const yearStudents = prev.students?.[currentYear] || {};
      const updatedYearStudents: { [cName: string]: Student[] } = {};

      Object.entries(yearStudents).forEach(([cName, sList]) => {
        updatedYearStudents[cName] = (sList || []).map((s) =>
          String(s.id) === String(updatedStudent.id) ? updatedStudent : s
        );
      });

      return {
        ...prev,
        students: {
          ...prev.students,
          [currentYear]: updatedYearStudents
        }
      };
    });
  };

  const handleAddStudent = (newStudent: Omit<Student, 'id'>) => {
    const studentWithId: Student = {
      ...newStudent,
      id: generateUniqueId()
    };

    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const classStudents = yearStudents[selectedClass] || [];

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [selectedClass]: [...classStudents, studentWithId]
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleAddStudentToClass = (targetClass: string, newStudent: Omit<Student, 'id'>) => {
    const studentWithId: Student = {
      ...newStudent,
      id: generateUniqueId()
    };

    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const classStudents = yearStudents[targetClass] || [];

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [targetClass]: [...classStudents, studentWithId]
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleAddStudentsBatch = (
    newStudents: Omit<Student, 'id'>[],
    targetClass?: string,
    replaceExisting?: boolean
  ) => {
    if (!newStudents.length) return;
    const destClass = targetClass || selectedClass;
    const studentsWithIds: Student[] = newStudents.map((s) => ({
      ...s,
      id: generateUniqueId()
    }));

    updateAppData(
      (prev) => {
        const yearStudents = { ...(prev.students?.[currentYear] || {}) };
        const existingClassStudents = replaceExisting ? [] : (yearStudents[destClass] || []);

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [destClass]: [...existingClassStudents, ...studentsWithIds]
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleAddStudentsMultiClass = (
    studentsByClass: { [className: string]: Omit<Student, 'id'>[] },
    replaceExisting?: boolean
  ) => {
    if (!Object.keys(studentsByClass).length) return;

    updateAppData(
      (prev) => {
        const yearStudents = { ...(prev.students?.[currentYear] || {}) };

        Object.entries(studentsByClass).forEach(([cName, list]) => {
          if (!list || list.length === 0) return;
          const existing = replaceExisting ? [] : (yearStudents[cName] || []);
          const withIds: Student[] = list.map((s) => ({
            ...s,
            id: generateUniqueId()
          }));
          yearStudents[cName] = [...existing, ...withIds];
        });

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: yearStudents
          }
        };
      },
      { immediate: true }
    );
  };

  const handleDeleteStudent = (studentId: number | string) => {
    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const updatedYearStudents: { [cName: string]: Student[] } = {};

        Object.entries(yearStudents).forEach(([cName, sList]) => {
          updatedYearStudents[cName] = (sList || []).filter(
            (s) => String(s.id) !== String(studentId)
          );
        });

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: updatedYearStudents
          }
        };
      },
      { immediate: true }
    );
  };

  const handleMoveStudentClass = (
    studentId: number | string,
    sourceClass: string,
    targetClass: string
  ) => {
    if (sourceClass === targetClass) return;
    updateAppData(
      (prev) => {
        const yearStudents = { ...(prev.students?.[currentYear] || {}) };
        const srcList = yearStudents[sourceClass] || [];
        const studentToMove = srcList.find((s) => String(s.id) === String(studentId));
        if (!studentToMove) return prev;

        const newSrcList = srcList.filter((s) => String(s.id) !== String(studentId));
        const destList = yearStudents[targetClass] || [];

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [sourceClass]: newSrcList,
              [targetClass]: [...destList, studentToMove]
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleClearClassStudents = (className: string) => {
    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [className]: []
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleClearClassScores = (className: string) => {
    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const classStudents = yearStudents[className] || [];
        const cleared = classStudents.map((s) => ({
          ...s,
          m1: 0,
          m2: 0,
          m3: 0,
          m4: 0,
          m5: 0,
          m6: 0,
          m7: 0
        }));
        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [className]: cleared
            }
          }
        };
      },
      { immediate: true }
    );
  };

  const handleSetClassAge = (className: string, newAge: string) => {
    updateAppData(
      (prev) => {
        const yearStudents = prev.students?.[currentYear] || {};
        const classStudents = yearStudents[className] || [];
        const updatedList = classStudents.map((s) => ({
          ...s,
          age: newAge
        }));

        return {
          ...prev,
          students: {
            ...prev.students,
            [currentYear]: {
              ...yearStudents,
              [className]: updatedList
            }
          }
        };
      },
      { immediate: true }
    );
  };

  // Attendance handlers
  const handleAddAttendance = (record: Omit<AbsenteeRecord, 'id'>) => {
    const recWithId: AbsenteeRecord = {
      ...record,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      attendance: [...(prev.attendance || []), recWithId]
    }));
  };

  const handleAddAttendanceBatch = (records: Omit<AbsenteeRecord, 'id'>[]) => {
    if (!records.length) return;
    const withIds: AbsenteeRecord[] = records.map((r) => ({
      ...r,
      id: generateUniqueId()
    }));
    updateAppData((prev) => ({
      ...prev,
      attendance: [...(prev.attendance || []), ...withIds]
    }));
  };

  const handleDeleteAttendance = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      attendance: (prev.attendance || []).filter((a) => a.id !== id)
    }));
  };

  // 40-Week Structured Attendance Handlers
  const handleUpdateStudentWeeklyAttendance = (
    year: string,
    className: string,
    studentId: number | string,
    week: number,
    status: WeeklyAttendanceStatus
  ) => {
    updateAppData((prev) => {
      const yearAtt = prev.weeklyAttendance?.[year] || {};
      const classAtt = yearAtt[className] || {};
      const studentAtt = classAtt[studentId] || {};

      const updatedStudentAtt = {
        ...studentAtt,
        [week]: status
      };

      return {
        ...prev,
        weeklyAttendance: {
          ...prev.weeklyAttendance,
          [year]: {
            ...yearAtt,
            [className]: {
              ...classAtt,
              [studentId]: updatedStudentAtt
            }
          }
        }
      };
    });
  };

  const handleBatchUpdateWeeklyAttendance = (
    year: string,
    className: string,
    week: number,
    statusUpdates: { [studentId: string]: WeeklyAttendanceStatus },
    weekDate?: string
  ) => {
    updateAppData((prev) => {
      const yearAtt = prev.weeklyAttendance?.[year] || {};
      const classAtt = { ...(yearAtt[className] || {}) };

      Object.entries(statusUpdates).forEach(([sId, stat]) => {
        const studentAtt = classAtt[sId] || {};
        classAtt[sId] = {
          ...studentAtt,
          [week]: stat
        };
      });

      const updatedDates = weekDate
        ? {
            ...prev.weekDates,
            [year]: {
              ...(prev.weekDates?.[year] || {}),
              [week]: weekDate
            }
          }
        : prev.weekDates;

      return {
        ...prev,
        weekDates: updatedDates,
        weeklyAttendance: {
          ...prev.weeklyAttendance,
          [year]: {
            ...yearAtt,
            [className]: classAtt
          }
        }
      };
    });
  };

  const handleSetWeekDate = (year: string, week: number, dateStr: string) => {
    updateAppData((prev) => ({
      ...prev,
      weekDates: {
        ...prev.weekDates,
        [year]: {
          ...(prev.weekDates?.[year] || {}),
          [week]: dateStr
        }
      }
    }));
  };

  const handleClearWeekAttendance = (year: string, className: string, week: number) => {
    updateAppData((prev) => {
      const yearAtt = prev.weeklyAttendance?.[year] || {};
      const classAtt = { ...(yearAtt[className] || {}) };

      Object.keys(classAtt).forEach((sId) => {
        if (classAtt[sId] && classAtt[sId][week]) {
          const updatedStudent = { ...classAtt[sId] };
          delete updatedStudent[week];
          classAtt[sId] = updatedStudent;
        }
      });

      return {
        ...prev,
        weeklyAttendance: {
          ...prev.weeklyAttendance,
          [year]: {
            ...yearAtt,
            [className]: classAtt
          }
        }
      };
    });
  };

  // Choir handlers
  const handleAddChoirMember = (member: Omit<ChoirMember, 'id'>) => {
    const mWithId: ChoirMember = {
      ...member,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      choirMembers: [...(prev.choirMembers || []), mWithId]
    }));
  };

  const handleAddChoirMembersBatch = (members: Omit<ChoirMember, 'id'>[]) => {
    if (!members.length) return;
    const withIds: ChoirMember[] = members.map((m) => ({
      ...m,
      id: generateUniqueId()
    }));
    updateAppData((prev) => ({
      ...prev,
      choirMembers: [...(prev.choirMembers || []), ...withIds]
    }));
  };

  const handleDeleteChoirMember = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      choirMembers: (prev.choirMembers || []).filter((m) => m.id !== id)
    }));
  };

  const handleAddChoirGroup = (groupName: string) => {
    updateAppData((prev) => ({
      ...prev,
      choirGroups: [...(prev.choirGroups || []), groupName]
    }));
  };

  // Spiritual handlers
  const handleAddSpiritualMember = (member: Omit<SpiritualMember, 'id'>) => {
    const mWithId: SpiritualMember = {
      ...member,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      spiritualMembers: [...(prev.spiritualMembers || []), mWithId]
    }));
  };

  const handleAddSpiritualMembersBatch = (members: Omit<SpiritualMember, 'id'>[]) => {
    if (!members.length) return;
    const withIds: SpiritualMember[] = members.map((m) => ({
      ...m,
      id: generateUniqueId()
    }));
    updateAppData((prev) => ({
      ...prev,
      spiritualMembers: [...(prev.spiritualMembers || []), ...withIds]
    }));
  };

  const handleDeleteSpiritualMember = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      spiritualMembers: (prev.spiritualMembers || []).filter((m) => m.id !== id)
    }));
  };

  const handleAddSpiritualGroup = (groupName: string) => {
    updateAppData((prev) => ({
      ...prev,
      spiritualGroups: [...(prev.spiritualGroups || []), groupName]
    }));
  };

  // Church Children handlers (strictly scoped when loggedInChapel is active)
  const handleAddChurchChild = (newChild: Omit<ChurchChild, 'id'>) => {
    const enforcedChapel = loggedInChapel
      ? mapToOfficialChapel(loggedInChapel)
      : mapToOfficialChapel(newChild.chapel || DEFAULT_CHAPELS[0]);
    const childWithId: ChurchChild = {
      ...newChild,
      chapel: enforcedChapel,
      id: generateUniqueId()
    };
    updateAppData(
      (prev) => ({
        ...prev,
        chapels: DEFAULT_CHAPELS,
        churchChildren: [...(prev.churchChildren || []), childWithId]
      }),
      { immediate: true }
    );
  };

  const handleUpdateChurchChild = (updatedChild: ChurchChild) => {
    const enforcedChapel = loggedInChapel
      ? mapToOfficialChapel(loggedInChapel)
      : mapToOfficialChapel(updatedChild.chapel || DEFAULT_CHAPELS[0]);

    updateAppData((prev) => ({
      ...prev,
      chapels: DEFAULT_CHAPELS,
      churchChildren: (prev.churchChildren || []).map((c) => {
        if (c.id !== updatedChild.id) return c;
        if (loggedInChapel && mapToOfficialChapel(c.chapel || '') !== enforcedChapel) {
          return c;
        }
        return { ...updatedChild, chapel: enforcedChapel };
      })
    }));
  };

  const handleDeleteChurchChild = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      churchChildren: (prev.churchChildren || []).filter((c) => {
        if (c.id !== id) return true;
        if (loggedInChapel && mapToOfficialChapel(c.chapel || '') !== mapToOfficialChapel(loggedInChapel)) {
          return true;
        }
        return false;
      })
    }));
  };

  const handleBatchAddChurchChildren = (
    children: Omit<ChurchChild, 'id'>[],
    mode: 'append' | 'replace' = 'append'
  ) => {
    if (!children.length) return;
    const targetChapel = loggedInChapel ? mapToOfficialChapel(loggedInChapel) : null;
    const filteredIncoming = (targetChapel
      ? children.filter((c) => mapToOfficialChapel(c.chapel || targetChapel) === targetChapel)
      : children
    ).map((c) => ({
      ...c,
      chapel: targetChapel || mapToOfficialChapel(c.chapel || DEFAULT_CHAPELS[0])
    }));
    if (!filteredIncoming.length) return;

    updateAppData(
      (prev) => {
        if (mode === 'replace') {
          const withIds: ChurchChild[] = filteredIncoming.map((c) => ({
            ...c,
            id: generateUniqueId()
          }));
          if (targetChapel) {
            // Only replace the logged-in chapel's children, preserving other chapels
            const others = (prev.churchChildren || []).filter(
              (c) => mapToOfficialChapel(c.chapel || '') !== targetChapel
            );
            return {
              ...prev,
              chapels: DEFAULT_CHAPELS,
              churchChildren: [...others, ...withIds]
            };
          }
          return {
            ...prev,
            chapels: DEFAULT_CHAPELS,
            churchChildren: withIds
          };
        }

        // Smart merge on append: enrich missing fields (e.g. phone, parentName, residence) on matching children and avoid duplicates
        const existingList = [...(prev.churchChildren || [])];
        const keyToIndex = new Map<string, number>();
        existingList.forEach((item, idx) => {
          const key = `${normalizeAmharicSearchText(item.name)}|${mapToOfficialChapel(item.chapel || '')}`;
          if (!keyToIndex.has(key)) keyToIndex.set(key, idx);
        });

        filteredIncoming.forEach((incoming) => {
          const key = `${normalizeAmharicSearchText(incoming.name)}|${mapToOfficialChapel(incoming.chapel || '')}`;
          const existingIdx = keyToIndex.get(key);
          if (existingIdx !== undefined) {
            const cur = existingList[existingIdx];
            existingList[existingIdx] = {
              ...cur,
              memberCode: cur.memberCode || incoming.memberCode,
              familyCode: cur.familyCode || incoming.familyCode,
              gender: cur.gender || incoming.gender,
              age:
                cur.age !== undefined && cur.age !== null && cur.age !== ''
                  ? cur.age
                  : incoming.age,
              educationLevel: cur.educationLevel || incoming.educationLevel,
              occupation: cur.occupation || incoming.occupation,
              parentName: cur.parentName || incoming.parentName,
              phone: cur.phone || incoming.phone,
              residence: cur.residence || incoming.residence,
              fellowshipOrVillage: cur.fellowshipOrVillage || incoming.fellowshipOrVillage
            };
          } else {
            keyToIndex.set(key, existingList.length);
            existingList.push({
              ...incoming,
              id: generateUniqueId()
            });
          }
        });

        return {
          ...prev,
          chapels: DEFAULT_CHAPELS,
          churchChildren: existingList
        };
      },
      { immediate: true }
    );
  };

  const handleClearChurchChildren = (chapelFilter?: string | string[]) => {
    updateAppData(
      (prev) => {
        // When a chapel leader is logged in, NEVER allow clearing any other chapel
        if (loggedInChapel) {
          const ownTarget = mapToOfficialChapel(loggedInChapel);
          return {
            ...prev,
            churchChildren: (prev.churchChildren || []).filter(
              (child) => mapToOfficialChapel(child.chapel || '') !== ownTarget
            )
          };
        }

        if (Array.isArray(chapelFilter) && chapelFilter.length > 0) {
          const normTargets = chapelFilter.map((c) => mapToOfficialChapel(c || ''));
          return {
            ...prev,
            churchChildren: (prev.churchChildren || []).filter(
              (child) => !normTargets.includes(mapToOfficialChapel(child.chapel || ''))
            )
          };
        }

        if (typeof chapelFilter === 'string' && chapelFilter && chapelFilter !== 'all') {
          const normTarget = mapToOfficialChapel(chapelFilter);
          return {
            ...prev,
            churchChildren: (prev.churchChildren || []).filter(
              (child) => mapToOfficialChapel(child.chapel || '') !== normTarget
            )
          };
        }

        return {
          ...prev,
          churchChildren: []
        };
      },
      { immediate: true }
    );
  };

  const handleEnrollChildToSundaySchool = (child: ChurchChild, targetClass: string) => {
    handleAddStudentToClass(targetClass, {
      name: child.name,
      gender: child.gender || 'ወ',
      age: child.age !== undefined && child.age !== '' ? child.age : 7,
      chapel: child.chapel,
      parentName: child.parentName,
      phone: child.phone,
      m1: 0,
      m2: 0,
      m3: 0,
      m4: 0,
      m5: 0,
      m6: 0,
      m7: 0,
      total: 0
    });
  };

  const handleImportMissingStudentsToChurchChildren = (
    missingStudents: { name: string; gender: string; age: number | string; className: string; chapel?: string; phone?: string }[]
  ) => {
    if (!missingStudents.length) return;
    const toAdd: ChurchChild[] = missingStudents.map((st) => ({
      id: generateUniqueId(),
      name: st.name,
      gender: st.gender || 'ወ',
      age: st.age !== undefined && st.age !== '' ? st.age : 7,
      chapel: loggedInChapel ? mapToOfficialChapel(loggedInChapel) : (st.chapel ? mapToOfficialChapel(st.chapel) : DEFAULT_CHAPELS[0]),
      phone: st.phone,
      residence: 'ብርብር ከተማ',
      notes: `ከሰንበት ት/ቤት (${st.className}) የተወሰደ`,
      registeredDate: new Date().toISOString().split('T')[0]
    }));
    updateAppData(
      (prev) => ({
        ...prev,
        churchChildren: [...(prev.churchChildren || []), ...toAdd]
      }),
      { immediate: true }
    );
  };

  const handleDeleteChapel = (chapelName: string) => {
    if (loggedInChapel) return; // Chapel leaders cannot delete chapels
    updateAppData(
      (prev) => {
        const currentChapels = prev.chapels || DEFAULT_CHAPELS;
        const updatedChapels = currentChapels.filter((c) => c !== chapelName);
        const fallbackChapel = updatedChapels.length > 0 ? updatedChapels[0] : 'ያልተገለጸ ቻፕል';
        const updatedChildren = (prev.churchChildren || []).map((child) => {
          if (child.chapel === chapelName) {
            return { ...child, chapel: fallbackChapel };
          }
          return child;
        });
        return {
          ...prev,
          chapels: updatedChapels.length > 0 ? updatedChapels : ['ዋናው ማዕከል ቻፕል'],
          churchChildren: updatedChildren
        };
      },
      { immediate: true }
    );
  };

  // General Church Members handlers (strictly locked to 10 official chapels, auto-coded & chapel-ordered)
  const handleBatchAddChurchMembers = (
    members: ChurchMember[],
    mode: 'append' | 'replace' = 'append',
    baselineYear?: number
  ) => {
    if (!members.length) return;
    const targetChapel = loggedInChapel ? mapToOfficialChapel(loggedInChapel) : null;
    const sanitizedMembers = members
      .map((m) => ({
        ...m,
        chapel: targetChapel || mapToOfficialChapel(m.chapel || '')
      }))
      .filter((m) => !targetChapel || mapToOfficialChapel(m.chapel || '') === targetChapel);

    if (!sanitizedMembers.length) return;

    updateAppData(
      (prev) => {
        if (mode === 'replace') {
          if (targetChapel) {
            const others = (prev.churchMembers || []).filter(
              (m) => mapToOfficialChapel(m.chapel || '') !== targetChapel
            );
            const combined = assignSequentialCodesAndSortMembers([...others, ...sanitizedMembers]);
            return {
              ...prev,
              chapels: DEFAULT_CHAPELS,
              churchMembers: combined
            };
          }
          return {
            ...prev,
            chapels: DEFAULT_CHAPELS,
            ageReferenceYear: baselineYear ?? prev.ageReferenceYear ?? 2017,
            churchMembers: assignSequentialCodesAndSortMembers(sanitizedMembers)
          };
        }
        return {
          ...prev,
          chapels: DEFAULT_CHAPELS,
          churchMembers: assignSequentialCodesAndSortMembers([...(prev.churchMembers || []), ...sanitizedMembers])
        };
      },
      { immediate: true }
    );
  };

  // Annual bulk age increment across all members/children (baseline 2017 E.C.)
  const handleBulkIncrementAges = useCallback(
    (options: Omit<BulkAgeIncrementOptions, 'targetAcademicYear'>): BulkAgeIncrementStats | null => {
      const currentSnapshot = latestDataRef.current || appData;
      if (!currentSnapshot) return null;

      const { stats } = applyBulkAgeIncrementToAppData(currentSnapshot, {
        ...options,
        targetAcademicYear: currentYear
      });

      updateAppData(
        (prev) =>
          applyBulkAgeIncrementToAppData(prev, {
            ...options,
            targetAcademicYear: currentYear
          }).updatedData,
        { immediate: true }
      );

      setAgeSyncFeedback(
        `✓ የሁሉም አባላት ዕድሜ ከ${stats.fromYear} ወደ ${stats.toYear} ዓ/ም (${stats.deltaYears > 0 ? `+${stats.deltaYears}` : stats.deltaYears} ዓመት) በአንዴ ዘምኗል! (አባላት፦ ${stats.membersUpdated}፣ ልጆች፦ ${stats.childrenUpdated})`
      );
      setTimeout(() => setAgeSyncFeedback(''), 8000);
      return stats;
    },
    [appData, currentYear, updateAppData]
  );

  const handleAddChurchMember = (newMember: Omit<ChurchMember, 'id'>): ChurchMember => {
    const enforcedChapel = loggedInChapel
      ? mapToOfficialChapel(loggedInChapel)
      : mapToOfficialChapel(newMember.chapel || '');
    const currentList = (latestDataRef.current || appData)?.churchMembers || [];
    const normalizedFamilyCode = newMember.familyCode
      ? getRootFamilyBaseCode(newMember.familyCode, enforcedChapel)
      : undefined;

    const assignedCode =
      (newMember.memberCode && newMember.memberCode.trim()) ||
      (normalizedFamilyCode
        ? getNextFamilySubCode(currentList, normalizedFamilyCode, enforcedChapel)
        : getNextMemberCodeForChapel(currentList, enforcedChapel));

    const newId = generateUniqueId();
    const initialMember: ChurchMember = {
      ...newMember,
      familyCode: normalizedFamilyCode,
      memberCode: assignedCode,
      chapel: enforcedChapel,
      id: newId
    };

    let finalSavedMember: ChurchMember = initialMember;

    updateAppData(
      (prev) => {
        const prevMembers = prev.churchMembers || [];
        // Avoid stale-ref code collision: if assignedCode already exists in prevMembers, clear so Pass 2 computes fresh next code
        const normAssigned = normalizeCodeForLookup(assignedCode);
        const hasCollision =
          Boolean(normAssigned) &&
          prevMembers.some((m) => normalizeCodeForLookup(m.memberCode) === normAssigned);

        const candidate: ChurchMember = {
          ...initialMember,
          memberCode: hasCollision ? undefined : initialMember.memberCode
        };

        const nextMembers = assignSequentialCodesAndSortMembers([...prevMembers, candidate]);
        const saved = nextMembers.find((m) => m.id === newId) || candidate;
        finalSavedMember = saved;

        // Also sync 0-14 children directly into churchChildren ("የልጆች ቋት") with their memberCode & familyCode
        const ageNum =
          typeof saved.age === 'number' ? saved.age : parseInt(String(saved.age ?? ''), 10);
        let nextChildren = prev.churchChildren || [];
        if (!isNaN(ageNum) && ageNum >= 0 && ageNum <= 14) {
          const normChildName = normalizeAmharicSearchText(saved.name);
          const existingIdx = nextChildren.findIndex(
            (c) =>
              (c.memberCode &&
                saved.memberCode &&
                normalizeCodeForLookup(c.memberCode) === normalizeCodeForLookup(saved.memberCode)) ||
              (normalizeAmharicSearchText(c.name) === normChildName &&
                mapToOfficialChapel(c.chapel || '') === enforcedChapel)
          );
          const syncedChildFields: Omit<ChurchChild, 'id'> = {
            memberCode: saved.memberCode,
            familyCode: saved.familyCode,
            name: saved.name,
            gender: saved.gender === 'ሴ' ? 'ሴ' : 'ወ',
            age: ageNum,
            educationLevel:
              saved.educationLevel ||
              (ageNum <= 3
                ? 'ጨቅላ/ያልጀመረ'
                : ageNum <= 6
                ? `መዋዕለ ሕፃናት (KG ${Math.min(3, Math.max(1, ageNum - 3))})`
                : `${ageNum - 6}ኛ ክፍል`),
            occupation: saved.occupation || (ageNum <= 3 ? 'የቤት ውስጥ' : 'ተማሪ'),
            chapel: enforcedChapel,
            parentName: saved.parentName,
            phone: saved.phone,
            residence: saved.residence,
            fellowshipOrVillage: saved.residence,
            registeredDate: saved.registeredDate || new Date().toISOString().split('T')[0]
          };

          if (existingIdx >= 0) {
            nextChildren = nextChildren.map((c, idx) =>
              idx === existingIdx
                ? {
                    ...c,
                    ...syncedChildFields,
                    memberCode: saved.memberCode || c.memberCode,
                    familyCode: saved.familyCode || c.familyCode
                  }
                : c
            );
          } else {
            nextChildren = [...nextChildren, { ...syncedChildFields, id: generateUniqueId() }];
          }
        }

        return {
          ...prev,
          chapels: DEFAULT_CHAPELS,
          churchMembers: nextMembers,
          churchChildren: nextChildren
        };
      },
      { immediate: true }
    );

    return finalSavedMember;
  };

  const handleUpdateChurchMember = (updatedMember: ChurchMember) => {
    const enforcedChapel = loggedInChapel
      ? mapToOfficialChapel(loggedInChapel)
      : mapToOfficialChapel(updatedMember.chapel || '');

    updateAppData(
      (prev) => {
        const prevMembers = prev.churchMembers || [];
        const targetExisting = prevMembers.find((m) => m.id === updatedMember.id);
        const oldMemberCode = targetExisting?.memberCode;
        const oldNormName = targetExisting ? normalizeAmharicSearchText(targetExisting.name) : '';

        const mapped = prevMembers.map((m) => {
          if (m.id !== updatedMember.id) return m;
          if (loggedInChapel && mapToOfficialChapel(m.chapel || '') !== enforcedChapel) {
            return m;
          }
          const chapelChanged = mapToOfficialChapel(m.chapel || '') !== enforcedChapel;
          const resolvedFamilyCode = updatedMember.familyCode
            ? getRootFamilyBaseCode(updatedMember.familyCode, enforcedChapel)
            : undefined;
          const prevFamilyNorm = normalizeCodeForLookup(m.familyCode);
          const nextFamilyNorm = normalizeCodeForLookup(resolvedFamilyCode);
          const prevSubSeq = parseChapelCodeParts(m.memberCode, enforcedChapel)?.subSeq ?? null;
          const familyLinkedChanged = Boolean(nextFamilyNorm) && nextFamilyNorm !== prevFamilyNorm;
          const familyUnlinkedToStandalone =
            Boolean(prevFamilyNorm || prevSubSeq !== null) && !nextFamilyNorm;
          const explicitClearCode =
            updatedMember.memberCode === '' || updatedMember.memberCode === undefined;

          return {
            ...updatedMember,
            chapel: enforcedChapel,
            familyCode: resolvedFamilyCode,
            memberCode:
              chapelChanged || explicitClearCode || familyLinkedChanged || familyUnlinkedToStandalone
                ? undefined
                : updatedMember.memberCode
          };
        });

        const nextMembers = assignSequentialCodesAndSortMembers(mapped);
        const savedUpdated = nextMembers.find((m) => m.id === updatedMember.id);

        // Keep matching churchChildren row synced with updated memberCode / familyCode
        let nextChildren = prev.churchChildren || [];
        if (savedUpdated) {
          nextChildren = nextChildren.map((c) => {
            const matchesByCode =
              Boolean(oldMemberCode) &&
              Boolean(c.memberCode) &&
              normalizeCodeForLookup(c.memberCode) === normalizeCodeForLookup(oldMemberCode);
            const matchesByName =
              oldNormName &&
              normalizeAmharicSearchText(c.name) === oldNormName &&
              mapToOfficialChapel(c.chapel || '') === enforcedChapel;

            if (!matchesByCode && !matchesByName) return c;
            return {
              ...c,
              memberCode: savedUpdated.memberCode,
              familyCode: savedUpdated.familyCode,
              name: savedUpdated.name,
              gender: savedUpdated.gender === 'ሴ' ? 'ሴ' : 'ወ',
              age: savedUpdated.age ?? c.age,
              chapel: enforcedChapel,
              parentName: savedUpdated.parentName ?? c.parentName,
              phone: savedUpdated.phone ?? c.phone,
              residence: savedUpdated.residence ?? c.residence
            };
          });
        }

        return {
          ...prev,
          churchMembers: nextMembers,
          churchChildren: nextChildren
        };
      },
      { immediate: true }
    );
  };

  const handleDeleteChurchMember = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      churchMembers: (prev.churchMembers || []).filter((m) => {
        if (m.id !== id) return true;
        if (loggedInChapel && mapToOfficialChapel(m.chapel || '') !== mapToOfficialChapel(loggedInChapel)) {
          return true;
        }
        return false;
      })
    }));
  };

  const handleClearChurchMembers = (chapelFilter?: string) => {
    updateAppData(
      (prev) => {
        const scoped = loggedInChapel || chapelFilter;
        if (scoped) {
          const targetChapel = mapToOfficialChapel(scoped);
          return {
            ...prev,
            churchMembers: (prev.churchMembers || []).filter(
              (m) => mapToOfficialChapel(m.chapel || '') !== targetChapel
            )
          };
        }
        return {
          ...prev,
          churchMembers: []
        };
      },
      { immediate: true }
    );
  };

  // Plan handlers
  const handleUpdatePlan = (updatedPlan: AnnualPlanItem) => {
    updateAppData((prev) => ({
      ...prev,
      plans: (prev.plans || []).map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    }));
  };

  const handleAddPlan = (newPlan: Omit<AnnualPlanItem, 'id'>) => {
    const planWithId: AnnualPlanItem = {
      ...newPlan,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      plans: [...(prev.plans || []), planWithId]
    }));
  };

  const handleDeletePlan = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      plans: (prev.plans || []).filter((p) => p.id !== id)
    }));
  };

  const handleImportPlans = (newPlans: AnnualPlanItem[]) => {
    updateAppData((prev) => ({
      ...prev,
      plans: newPlans
    }));
  };

  // Teacher handlers
  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t))
    }));
  };

  const handleAddTeacher = (newTeacher: Omit<Teacher, 'id'>) => {
    const tWithId: Teacher = {
      ...newTeacher,
      id: generateUniqueId()
    };
    updateAppData((prev) => ({
      ...prev,
      teachers: [...prev.teachers, tWithId]
    }));
  };

  const handleDeleteTeacher = (id: number) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== id)
    }));
  };

  // Subjects handlers
  const handleAddSubject = (subjectName: string) => {
    updateAppData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, subjectName]
    }));
  };

  const handleDeleteSubject = (index: number) => {
    updateAppData((prev) => {
      const nextSubs = [...prev.subjects];
      nextSubs.splice(index, 1);
      return {
        ...prev,
        subjects: nextSubs
      };
    });
  };

  const handleUpdateClassSubjects = (newClassSubjects: { [className: string]: string[] }) => {
    updateAppData((prev) => ({
      ...prev,
      classSubjects: newClassSubjects
    }));
  };

  const handleReorderTeachers = (reorderedTeachers: Teacher[]) => {
    updateAppData((prev) => ({
      ...prev,
      teachers: reorderedTeachers
    }));
  };

  // Save Role, Organizational Units & Chapel PINs (Super Admin Controlled)
  const handleSavePins = (
    adminPin: string,
    leaderPin: string,
    chapelPins?: { [chapelName: string]: string },
    unitPins?: { [unitId: string]: string }
  ) => {
    updateAppData(
      (prev) => {
        const mergedUnits = {
          ...DEFAULT_ORG_UNIT_PINS,
          ...(prev.pins?.units || {}),
          ...(unitPins || {}),
          children_ministry: unitPins?.children_ministry || leaderPin
        };
        return {
          ...prev,
          pins: {
            admin: adminPin,
            leader: mergedUnits.children_ministry || leaderPin,
            chapels: chapelPins || prev.pins?.chapels || DEFAULT_CHAPEL_PINS,
            units: mergedUnits
          }
        };
      },
      { immediate: true }
    );
  };

  const quickJsonInputRef = useRef<HTMLInputElement>(null);
  const [quickJsonFeedback, setQuickJsonFeedback] = useState<string>('');

  const handleQuickJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appData) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const restored = importBackupJSON(content, appData, 'merge');
      if (restored) {
        setAppData(restored);
        syncAppDataToFirebase(restored);
        setQuickJsonFeedback(
          `✓ JSON ፋይል በተሳካ ሁኔታ ወደ አዲሱ Firebase ገብቷል! (ተማሪዎች፦ ${countStudentsInData(restored)}፣ አባላት፦ ${restored.churchMembers?.length || 0}፣ ልጆች፦ ${restored.churchChildren?.length || 0})`
        );
        setTimeout(() => setQuickJsonFeedback(''), 6000);
      } else {
        alert('የተመረጠው ፋይል ትክክለኛ JSON ፎርማት አይደለም!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!appData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን</h2>
        <p className="text-xs text-blue-300 mt-1">ዳታቤዝ በመገናኘት ላይ ነው...</p>
      </div>
    );
  }

  const sidebarUnits = CHURCH_ORG_UNITS.filter((u) => canNavigateToUnit(u.id));
  const showSidebar =
    currentUserRole === 'admin' ||
    (currentUserRole === 'leader' && !loggedInChapel && sidebarUnits.length > 1);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans print:min-h-0 print:bg-white print:block">
      {!currentUserRole ? (
        // CLEAN OUTSIDE LOGIN SCREEN: Nothing from dashboard/database is visible outside!
        <div className="flex-1 flex flex-col justify-center items-center py-8 px-4">
          <LoginPortal
            teachers={appData.teachers}
            adminPin={appData.pins?.admin || '1234'}
            leaderPin={appData.pins?.leader || '5678'}
            chapelPins={appData.pins?.chapels || DEFAULT_CHAPEL_PINS}
            unitPins={appData.pins?.units || DEFAULT_ORG_UNIT_PINS}
            chapelList={appData.chapels || DEFAULT_CHAPELS}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      ) : (
        <>
          <Header
            currentUserRole={currentUserRole}
            loggedInTeacherName={loggedInTeacher?.name}
            loggedInChapel={loggedInChapel}
            loggedInUnit={loggedInUnit}
            onLogout={handleLogout}
            syncStatus={syncStatus}
            onOpenSyncModal={
              currentUserRole === 'admin' ||
              (!loggedInChapel &&
                currentUserRole !== 'teacher' &&
                (loggedInUnit === 'elders_council' ||
                  loggedInUnit === 'office' ||
                  loggedInUnit === 'spiritual_council' ||
                  loggedInUnit === 'children_ministry'))
                ? () => setIsSyncModalOpen(true)
                : undefined
            }
            onToggleSidebar={showSidebar ? () => setIsMobileSidebarOpen(!isMobileSidebarOpen) : undefined}
          />

          {/* Reassurance, JSON Import/Export & Scope Banner */}
          {appData && (
            <div className="bg-slate-900 text-white px-4 py-2 border-b border-slate-800 print:hidden text-xs">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  {loggedInChapel ? (
                    <span className="font-bold text-amber-200">
                      {loggedInChapel} — የቻፕሉ መረጃ ብቻ ገጽ
                    </span>
                  ) : loggedInUnit ? (
                    <span className="font-bold text-slate-100">
                      {(() => {
                        const u = getOrgUnitById(loggedInUnit);
                        return u ? u.name : 'የቤተክርስቲያን ፖርታል';
                      })()}
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-200 tabular-nums">
                      ዋና አዲሚን (Super Admin) — የቤተክርስቲያን አባላት፦ {(appData.churchMembers || []).length} · ልጆች፦ {(appData.churchChildren || []).length} · ሰንበት ተማሪዎች፦ {countStudentsInData(appData)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Direct Amharic <-> English Name Script Mode Switcher + Converter Modal */}
                  <div
                    className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5"
                    title="ስሞችን ያለ ትርጉም በቀጥታ ወደ እንግሊዝኛ ፊደል መቀየሪያ ምርጫ"
                  >
                    <span className="px-1.5 text-[10px] font-bold text-slate-300 flex items-center gap-1">
                      <Languages className="w-3 h-3 text-amber-300" />
                      <span className="hidden sm:inline">ስም፦</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChangeNameScriptMode('am')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        nameScriptMode === 'am' ? 'bg-amber-400 text-slate-950' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      አማርኛ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeNameScriptMode('both')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        nameScriptMode === 'both' ? 'bg-amber-400 text-slate-950' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      አማ+EN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeNameScriptMode('en')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        nameScriptMode === 'en' ? 'bg-amber-400 text-slate-950' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      English
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTransliteratorModalOpen(true)}
                    className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer"
                    title="ማንኛውንም ስም ያለ ትርጉም ቀጥታ ወደ እንግሊዝኛ መቀየሪያ መሳሪያ"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>ስም ወደ EN ቀይር</span>
                  </button>

                  {currentUserRole === 'admin' && (
                    <>
                      <input
                        ref={quickJsonInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleQuickJsonUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => quickJsonInputRef.current?.click()}
                        className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition cursor-pointer"
                      >
                        JSON ጫን
                      </button>
                      <button
                        type="button"
                        onClick={() => exportBackupJSON(appData)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition cursor-pointer"
                      >
                        ባክአፕ አውርድ (JSON)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSyncModalOpen(true)}
                        className="bg-blue-800 hover:bg-blue-700 text-amber-300 font-bold px-3 py-1 rounded-lg text-[11px] transition border border-blue-700 cursor-pointer"
                      >
                        ዳታቤዝ & JSON መቀበያ
                      </button>
                    </>
                  )}
                </div>
              </div>
              {quickJsonFeedback && (
                <div className="max-w-7xl mx-auto mt-2 bg-emerald-800/90 border border-emerald-400/50 text-emerald-100 px-3 py-1.5 rounded-lg font-bold text-[11px]">
                  {quickJsonFeedback}
                </div>
              )}
              {ageSyncFeedback && (
                <div className="max-w-7xl mx-auto mt-2 bg-amber-500/95 border border-amber-300 text-slate-950 px-3 py-1.5 rounded-lg font-extrabold text-[11px]">
                  {ageSyncFeedback}
                </div>
              )}
            </div>
          )}

          {/* Annual Age Increment Banner (shown to Admin / Office / Elders / Spiritual / Children Leaders) */}
          {appData &&
            !loggedInChapel &&
            currentUserRole !== 'teacher' &&
            (currentUserRole === 'admin' ||
              loggedInUnit === 'elders_council' ||
              loggedInUnit === 'office' ||
              loggedInUnit === 'spiritual_council' ||
              loggedInUnit === 'children_ministry') &&
            (parseInt(currentYear, 10) || 0) > (appData.ageReferenceYear || 2017) &&
            dismissedAgeBannerYear !== currentYear && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 print:hidden text-xs">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-950 font-bold">
                    <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      የአባላት ዕድሜ በ<strong>{appData.ageReferenceYear || 2017} ዓ/ም</strong> መረጃ ላይ ነው ያለው። ወደ{' '}
                      <strong>{currentYear} ዓ/ም</strong> ለማዘመን (+
                      {(parseInt(currentYear, 10) || 2019) - (appData.ageReferenceYear || 2017)} ዓመት) በሁሉም አባላት ላይ በአንድ ጊዜ መጨመር ይችላሉ።
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const refYear = appData.ageReferenceYear || 2017;
                        const targetYr = parseInt(currentYear, 10) || refYear;
                        const delta = targetYr - refYear;
                        if (delta > 0) {
                          handleBulkIncrementAges({
                            deltaYears: delta,
                            targetReferenceYear: targetYr,
                            includeChurchMembers: true,
                            includeChurchChildren: true,
                            includeStudents: true,
                            includeChoirAndSpiritual: true
                          });
                        }
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      +{(parseInt(currentYear, 10) || 2019) - (appData.ageReferenceYear || 2017)} ዓመት አሁን ጨምር
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedAgeBannerYear(currentYear)}
                      className="text-amber-800 hover:text-amber-950 font-bold text-[11px] px-2 py-1 rounded hover:bg-amber-100 transition cursor-pointer"
                    >
                      በኋላ
                    </button>
                  </div>
                </div>
              </div>
            )}

          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:max-w-none print:w-full print:p-0 print:m-0">
            <div className={showSidebar ? 'flex flex-col lg:flex-row gap-6 items-start' : 'space-y-6'}>
              {/* Hierarchical Sidebar (Super Admin & Governing Councils) */}
              {showSidebar && (
                <>
                  {isMobileSidebarOpen && (
                    <div
                      className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                      onClick={() => setIsMobileSidebarOpen(false)}
                    />
                  )}
                  <aside
                    className={`${
                      isMobileSidebarOpen
                        ? 'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto'
                        : 'hidden lg:block lg:w-72 shrink-0 bg-white border border-slate-200 rounded-2xl p-3.5 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto'
                    } print:hidden`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 lg:hidden">
                      <span className="text-xs font-extrabold text-slate-900">የአጥቢያ መዋቅር ማውጫ</span>
                      <button
                        type="button"
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {currentUserRole === 'admin' && (
                      <div className="space-y-1 pb-3 mb-3 border-b border-slate-200">
                        <div className="px-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          የዋና አዲሚን መቆጣጠሪያ
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAdminView('adminOverview');
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                            activeAdminView === 'adminOverview'
                              ? 'bg-blue-900 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5 shrink-0" />
                          <span>የዋና አዲሚን ገጽ (Overview)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAdminView('churchOverviewStatsTab');
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                            activeAdminView === 'churchOverviewStatsTab'
                              ? 'bg-blue-900 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                          <span>አጠቃላይ ስታቲስቲክስ (ወ/ሴ/ድምር)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAdminView('pinManageTab');
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                            activeAdminView === 'pinManageTab'
                              ? 'bg-blue-900 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5 shrink-0" />
                          <span>የሁሉም መግቢያ ቁልፎች (PINs)</span>
                        </button>
                      </div>
                    )}

                    {currentUserRole !== 'admin' && loggedInUnit === 'elders_council' && (
                      <div className="space-y-1 pb-3 mb-3 border-b border-slate-200">
                        <div className="px-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          የሽማግሌዎች ጉባኤ አጠቃላይ እይታ
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAdminView('churchOverviewStatsTab');
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                            activeAdminView === 'churchOverviewStatsTab'
                              ? 'bg-blue-900 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                          <span>አጠቃላይ ስታቲስቲክስ (ወ/ሴ/ድምር)</span>
                        </button>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="px-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>የቤተ ክርስቲያን መዋቅር</span>
                      </div>
                      {sidebarUnits.map((u) => {
                        const isActive =
                          ((currentUserRole !== 'admin' && loggedInUnit !== 'elders_council') ||
                            activeAdminView === 'unitPage') &&
                          activeOrgUnit === u.id;
                        const indentPx = Math.max(0, (u.level - 1) * 12);
                        return (
                          <button
                            key={`nav_unit_${u.id}`}
                            type="button"
                            onClick={() => handleSelectUnit(u.id)}
                            style={{ paddingLeft: `${10 + indentPx}px` }}
                            className={`w-full text-left pr-2.5 py-2 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer ${
                              isActive
                                ? 'bg-blue-900 text-white font-bold'
                                : 'text-slate-700 hover:bg-slate-100 font-semibold'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isActive
                                  ? 'bg-amber-300'
                                  : u.level === 1
                                  ? 'bg-blue-900'
                                  : u.level === 2
                                  ? 'bg-blue-600'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span className="leading-snug">{u.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </aside>
                </>
              )}

              {/* Main Content Area */}
              <main className="flex-1 min-w-0 w-full">
                {currentUserRole === 'admin' && activeAdminView === 'adminOverview' ? (
                  <SuperAdminDashboard
                    appData={appData}
                    currentYear={currentYear}
                    onOpenUnit={handleSelectUnit}
                    onOpenPinManager={() => setActiveAdminView('pinManageTab')}
                    onOpenOverviewStats={() => setActiveAdminView('churchOverviewStatsTab')}
                    onOpenSyncModal={() => setIsSyncModalOpen(true)}
                  />
                ) : currentUserRole === 'admin' && activeAdminView === 'pinManageTab' ? (
                  <PinManageTab
                    adminPin={appData.pins?.admin || '1234'}
                    leaderPin={appData.pins?.leader || '5678'}
                    chapelPins={appData.pins?.chapels || DEFAULT_CHAPEL_PINS}
                    unitPins={appData.pins?.units || DEFAULT_ORG_UNIT_PINS}
                    chapelList={appData.chapels || DEFAULT_CHAPELS}
                    teachers={appData.teachers}
                    onSavePins={handleSavePins}
                    onUpdateTeacher={handleUpdateTeacher}
                  />
                ) : (currentUserRole === 'admin' || loggedInUnit === 'elders_council') &&
                  activeAdminView === 'churchOverviewStatsTab' ? (
                  <ChurchStatisticsDashboardTab
                    currentYear={currentYear}
                    classList={CLASS_LIST}
                    studentsByClass={appData.students?.[currentYear] || {}}
                    churchMembers={appData.churchMembers || []}
                    churchChildren={appData.churchChildren || []}
                    chapelList={appData.chapels || DEFAULT_CHAPELS}
                    loggedInChapel={loggedInChapel}
                    onNavigateTab={(tabId) => {
                      if (tabId === 'churchMasterTab') {
                        handleSelectUnit('office');
                      } else if (tabId === 'churchChildrenTab' || tabId === 'allStudentsMasterTab') {
                        handleSelectUnit('children_ministry');
                      }
                    }}
                  />
                ) : activeOrgUnit === 'children_ministry' || currentUserRole === 'teacher' ? (
                  <ChildrenMinistryPortal
                    appData={appData}
                    currentYear={currentYear}
                    years={appData.years || ['2019']}
                    onYearChange={setCurrentYear}
                    onAddYear={handleAddYear}
                    classList={CLASS_LIST}
                    selectedClass={selectedClass}
                    onSelectClass={setSelectedClass}
                    currentClassStudents={currentClassStudents}
                    currentUserRole={currentUserRole}
                    loggedInTeacher={loggedInTeacher}
                    nameScriptMode={nameScriptMode}
                    onChangeNameScriptMode={handleChangeNameScriptMode}
                    onOpenTransliterator={() => setIsTransliteratorModalOpen(true)}
                    onUpdateStudent={handleUpdateStudent}
                    onAddStudent={handleAddStudent}
                    onAddStudentToClass={handleAddStudentToClass}
                    onAddStudentsBatch={handleAddStudentsBatch}
                    onAddStudentsMultiClass={handleAddStudentsMultiClass}
                    onDeleteStudent={handleDeleteStudent}
                    onMoveStudentClass={handleMoveStudentClass}
                    onClearClassStudents={handleClearClassStudents}
                    onClearClassScores={handleClearClassScores}
                    onSetClassAge={handleSetClassAge}
                    onAddChild={handleAddChurchChild}
                    onAddChurchMember={handleAddChurchMember}
                    onUpdateChild={handleUpdateChurchChild}
                    onDeleteChild={handleDeleteChurchChild}
                    onClearChurchChildren={handleClearChurchChildren}
                    onBatchAddChildren={handleBatchAddChurchChildren}
                    onEnrollToSundaySchool={handleEnrollChildToSundaySchool}
                    onImportMissingStudentsToChurchChildren={handleImportMissingStudentsToChurchChildren}
                    onBulkIncrementAges={handleBulkIncrementAges}
                    onDeleteChapel={handleDeleteChapel}
                    onUpdateStudentWeeklyAttendance={handleUpdateStudentWeeklyAttendance}
                    onBatchUpdateWeeklyAttendance={handleBatchUpdateWeeklyAttendance}
                    onSetWeekDate={handleSetWeekDate}
                    onClearWeekAttendance={handleClearWeekAttendance}
                    onAddAttendance={handleAddAttendance}
                    onAddAttendanceBatch={handleAddAttendanceBatch}
                    onDeleteAttendance={handleDeleteAttendance}
                    onAddChoirMember={handleAddChoirMember}
                    onAddChoirMembersBatch={handleAddChoirMembersBatch}
                    onDeleteChoirMember={handleDeleteChoirMember}
                    onAddChoirGroup={handleAddChoirGroup}
                    onAddSpiritualMember={handleAddSpiritualMember}
                    onAddSpiritualMembersBatch={handleAddSpiritualMembersBatch}
                    onDeleteSpiritualMember={handleDeleteSpiritualMember}
                    onAddSpiritualGroup={handleAddSpiritualGroup}
                    onUpdatePlan={handleUpdatePlan}
                    onAddPlan={handleAddPlan}
                    onDeletePlan={handleDeletePlan}
                    onImportPlans={handleImportPlans}
                    onUpdateTeacher={handleUpdateTeacher}
                    onAddTeacher={handleAddTeacher}
                    onDeleteTeacher={handleDeleteTeacher}
                    onReorderTeachers={handleReorderTeachers}
                    onUpdateClassSubjects={handleUpdateClassSubjects}
                    onAddSubject={handleAddSubject}
                    onDeleteSubject={handleDeleteSubject}
                    submissions={appData.submissions || []}
                    onCreateSubmission={handleCreateSubmission}
                    onResubmitSubmission={handleResubmitSubmission}
                    onDeleteSubmission={handleDeleteSubmission}
                  />
                ) : activeOrgUnit === 'chapels_dept' || loggedInChapel ? (
                  <ChapelsHubPage
                    currentYear={currentYear}
                    ageReferenceYear={appData.ageReferenceYear || 2017}
                    currentUserRole={currentUserRole}
                    chapelList={appData.chapels || DEFAULT_CHAPELS}
                    classList={CLASS_LIST}
                    studentsByClass={appData.students?.[currentYear] || {}}
                    churchMembers={appData.churchMembers || []}
                    churchChildren={appData.churchChildren || []}
                    lockedChapel={loggedInChapel}
                    onBatchAddMembers={handleBatchAddChurchMembers}
                    onAddMember={handleAddChurchMember}
                    onUpdateMember={handleUpdateChurchMember}
                    onDeleteMember={handleDeleteChurchMember}
                    onClearChurchMembers={handleClearChurchMembers}
                    onAddChild={handleAddChurchChild}
                    onUpdateChild={handleUpdateChurchChild}
                    onDeleteChild={handleDeleteChurchChild}
                    onClearChurchChildren={handleClearChurchChildren}
                    onBatchAddChildren={handleBatchAddChurchChildren}
                    onEnrollToSundaySchool={handleEnrollChildToSundaySchool}
                    onImportMissingStudentsToChurchChildren={handleImportMissingStudentsToChurchChildren}
                    onBulkIncrementAges={!loggedInChapel ? handleBulkIncrementAges : undefined}
                    onDeleteChapel={handleDeleteChapel}
                    nameScriptMode={nameScriptMode}
                    onChangeNameScriptMode={handleChangeNameScriptMode}
                    onOpenTransliterator={() => setIsTransliteratorModalOpen(true)}
                    submissions={appData.submissions || []}
                    onCreateSubmission={handleCreateSubmission}
                    onResubmitSubmission={handleResubmitSubmission}
                    onDeleteSubmission={handleDeleteSubmission}
                  />
                ) : (
                  <DepartmentWorkspacePage
                    unitId={activeOrgUnit}
                    currentYear={currentYear}
                    ageReferenceYear={appData.ageReferenceYear || 2017}
                    currentUserRole={currentUserRole}
                    departmentDataMap={appData.departmentData || {}}
                    onUpdateDepartmentData={handleUpdateDepartmentData}
                    canNavigateToUnit={canNavigateToUnit}
                    onSelectUnit={handleSelectUnit}
                    churchMembers={appData.churchMembers || []}
                    churchChildren={appData.churchChildren || []}
                    chapelList={appData.chapels || DEFAULT_CHAPELS}
                    classList={CLASS_LIST}
                    studentsByClass={appData.students?.[currentYear] || {}}
                    onBatchAddMembers={handleBatchAddChurchMembers}
                    onAddMember={handleAddChurchMember}
                    onUpdateMember={handleUpdateChurchMember}
                    onDeleteMember={handleDeleteChurchMember}
                    onClearChurchMembers={handleClearChurchMembers}
                    onExtractChildrenToChildrenTab={handleBatchAddChurchChildren}
                    onBulkIncrementAges={handleBulkIncrementAges}
                    nameScriptMode={nameScriptMode}
                    onChangeNameScriptMode={handleChangeNameScriptMode}
                    onOpenTransliterator={() => setIsTransliteratorModalOpen(true)}
                    submissions={appData.submissions || []}
                    onCreateSubmission={handleCreateSubmission}
                    onResubmitSubmission={handleResubmitSubmission}
                    onDeleteSubmission={handleDeleteSubmission}
                    onSpiritualApprove={handleSpiritualApproveSubmission}
                    onSpiritualReturn={handleSpiritualReturnSubmission}
                    onForwardToAdmin={handleForwardSubmissionToAdmin}
                    onAdminAcknowledge={handleAdminAcknowledgeSubmission}
                  />
                )}
              </main>
            </div>
          </div>
        </>
      )}

      <footer className="mt-auto py-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {currentYear} የብርብር ከተማ ቃለ ሕይወት ቤተክርስቲያን - የልጆች አገልግሎት ዘርፍ
          </span>
          <span className="text-[11px] text-slate-400">
            የመረጃ፣ የውጤትና የዓመት ዕቅድ ማኔጅመንት ሲስተም
          </span>
        </div>
      </footer>

      {appData && (
        <FirebaseSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          appData={appData}
          onDataRestored={(newData) => {
            setAppData(newData);
            syncAppDataToFirebase(newData);
          }}
          syncStatus={syncStatus}
        />
      )}

      {appData && (
        <NameTransliteratorModal
          isOpen={isTransliteratorModalOpen}
          onClose={() => setIsTransliteratorModalOpen(false)}
          churchMembers={
            loggedInChapel
              ? (appData.churchMembers || []).filter(
                  (m) => mapToOfficialChapel(m.chapel || '') === mapToOfficialChapel(loggedInChapel)
                )
              : currentUserRole === 'teacher'
              ? []
              : appData.churchMembers || []
          }
          churchChildren={
            loggedInChapel
              ? (appData.churchChildren || []).filter(
                  (c) => mapToOfficialChapel(c.chapel || '') === mapToOfficialChapel(loggedInChapel)
                )
              : currentUserRole === 'teacher'
              ? []
              : appData.churchChildren || []
          }
        />
      )}
    </div>
  );
}
