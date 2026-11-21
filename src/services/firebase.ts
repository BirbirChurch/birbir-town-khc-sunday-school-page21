import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, Firestore, setLogLevel } from 'firebase/firestore';
import { AppData } from '../types';
import { INITIAL_APP_DATA, DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from '../constants/initialData';
import { DEFAULT_ORG_UNIT_PINS } from '../constants/churchStructure';
import { sanitizeAndDeduplicateAppData } from '../utils/idGenerator';
import { normalizeAmharicSearchText, mapToOfficialChapelStrict } from '../utils/amharicSearchAndChapel';

// Suppress noisy internal Firestore warnings in console
try {
  setLogLevel('silent');
} catch {}

export const firebaseConfig = {
  apiKey: "AIzaSyBwIZor6Yunr_XQNq_6v5t_73klowrZNV8",
  authDomain: "birbirtownkhcchildministrypage.firebaseapp.com",
  projectId: "birbirtownkhcchildministrypage",
  storageBucket: "birbirtownkhcchildministrypage.firebasestorage.app",
  messagingSenderId: "737025715503",
  appId: "1:737025715503:web:8c27955f4f60c01c7705da"
};

export interface FirebaseProjectProfile {
  id: string;
  label: string;
  config: typeof firebaseConfig;
}

const ACTIVE_PROJECT_PROFILE: FirebaseProjectProfile = {
  id: firebaseConfig.projectId,
  label: `${firebaseConfig.projectId} (የቤተክርስቲያን ዋና Cloud Firestore ዳታቤዝ)`,
  config: firebaseConfig
};

const LOCAL_STORAGE_KEY = 'birbir_khc_local_data';
const BACKUP_STORAGE_KEY = 'birbir_khc_safety_backup';
const DB_KEY = 'kaleheywet_data';

// Clean up any legacy project selector key from previous sessions
try {
  localStorage.removeItem('birbir_active_firebase_project_id');
} catch {}

export const getActiveProjectProfile = (): FirebaseProjectProfile => {
  return ACTIVE_PROJECT_PROFILE;
};

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

const countStudentsInData = (data: any): number => {
  if (!data?.students || typeof data.students !== 'object') return 0;
  return Object.values(data.students).reduce(
    (acc: number, classObj: any) =>
      acc +
      (typeof classObj === 'object'
        ? Object.values(classObj).reduce(
            (cAcc: number, arr: any) => cAcc + (Array.isArray(arr) ? arr.length : 0),
            0
          )
        : 0),
    0
  );
};

const initFirebaseApp = () => {
  try {
    const appName = `app_${firebaseConfig.projectId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const existing = getApps().find((a) => a.name === appName);
    appInstance = existing || initializeApp(firebaseConfig, appName);

    try {
      firestoreInstance = getFirestore(appInstance);
    } catch (fsErr) {
      console.warn('Firestore init notice:', fsErr);
    }
  } catch (err) {
    console.warn('Firebase init notice:', err);
  }
};

initFirebaseApp();

export const firestore = firestoreInstance;

let _cachedLocalData: AppData | null = null;

// Load stored local data with fast-path on primary key and legacy recovery fallback
export const loadStoredLocalData = (): AppData => {
  if (_cachedLocalData) return _cachedLocalData;
  try {
    let source: any = null;

    // Fast path: check primary localStorage key first without scanning all legacy keys
    try {
      const primaryItem = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (primaryItem) {
        const parsed = JSON.parse(primaryItem);
        if (parsed && typeof parsed === 'object') {
          source = parsed;
        }
      }
    } catch {}

    // Only scan legacy keys if primary key was missing or empty
    if (!source) {
      const candidates: any[] = [];
      const legacyKeys = [
        BACKUP_STORAGE_KEY,
        'kaleheywet_data',
        'birbir_town_khc_data',
        'sunday_school_data',
        'church_data',
        'students_data'
      ];

      legacyKeys.forEach((k) => {
        try {
          const item = localStorage.getItem(k);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed && typeof parsed === 'object') candidates.push(parsed);
          }
        } catch {}
      });

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (
            k &&
            k !== LOCAL_STORAGE_KEY &&
            !legacyKeys.includes(k) &&
            (k.includes('birbir') || k.includes('kale') || k.includes('backup') || k.includes('student'))
          ) {
            const item = localStorage.getItem(k);
            if (item) {
              try {
                const parsed = JSON.parse(item);
                if (parsed && typeof parsed === 'object' && (parsed.students || parsed.teachers)) {
                  candidates.push(parsed);
                }
              } catch {}
            }
          }
        }
      } catch {}

      let bestSource: any = null;
      let maxStudents = -1;
      candidates.forEach((cand) => {
        const studentCount = countStudentsInData(cand);
        if (studentCount > maxStudents) {
          maxStudents = studentCount;
          bestSource = cand;
        }
      });

      source = bestSource || candidates[0] || {};
    }

    const rawData: AppData = {
      ...INITIAL_APP_DATA,
      ...source,
      pins: {
        admin: source.pins?.admin || INITIAL_APP_DATA.pins.admin,
        leader: source.pins?.leader || INITIAL_APP_DATA.pins.leader,
        childrenCoordinator:
          source.pins?.childrenCoordinator || INITIAL_APP_DATA.pins.childrenCoordinator,
        youthCoordinator:
          source.pins?.youthCoordinator || INITIAL_APP_DATA.pins.youthCoordinator,
        chapels: { ...DEFAULT_CHAPEL_PINS, ...(source.pins?.chapels || {}) },
        units: { ...DEFAULT_ORG_UNIT_PINS, ...(source.pins?.units || {}) }
      },
      teachers: source.teachers && source.teachers.length > 0 ? source.teachers : INITIAL_APP_DATA.teachers,
      plans: source.plans && source.plans.length > 0 ? source.plans : INITIAL_APP_DATA.plans,
      choirGroups:
        source.choirGroups && source.choirGroups.length > 0 ? source.choirGroups : INITIAL_APP_DATA.choirGroups,
      spiritualGroups:
        source.spiritualGroups && source.spiritualGroups.length > 0
          ? source.spiritualGroups
          : INITIAL_APP_DATA.spiritualGroups,
      subjects: source.subjects && source.subjects.length > 0 ? source.subjects : INITIAL_APP_DATA.subjects,
      classSubjects: source.classSubjects || {},
      students: source.students || {},
      attendance: source.attendance || [],
      choirMembers: source.choirMembers || [],
      spiritualMembers: source.spiritualMembers || [],
      chapels: DEFAULT_CHAPELS,
      churchChildren:
        source.churchChildren && source.churchChildren.length > 0
          ? source.churchChildren
          : INITIAL_APP_DATA.churchChildren || [],
      churchMembers: Array.isArray(source.churchMembers) ? source.churchMembers : [],
      departmentData: source.departmentData && typeof source.departmentData === 'object' ? source.departmentData : {},
      submissions: Array.isArray(source.submissions) ? source.submissions : [],
      planDispatches: Array.isArray(source.planDispatches) ? source.planDispatches : [],
      failedLoginAttempts: Array.isArray(source.failedLoginAttempts) ? source.failedLoginAttempts : [],
      blockedBrowsers: Array.isArray(source.blockedBrowsers) ? source.blockedBrowsers : []
    };

    const sanitized = sanitizeAndDeduplicateAppData(rawData);
    _cachedLocalData = sanitized;
    return sanitized;
  } catch (e) {
    console.error('Error reading localStorage data', e);
  }
  return INITIAL_APP_DATA;
};

export const saveToLocalStorage = (data: AppData) => {
  try {
    const sanitized = sanitizeAndDeduplicateAppData(data);
    _cachedLocalData = sanitized;
    const jsonStr = JSON.stringify(sanitized);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
    } catch {
      const legacyKeys = [
        'birbir_khc_safety_backup',
        'kaleheywet_data',
        'birbir_town_khc_data',
        'sunday_school_data'
      ];
      legacyKeys.forEach((k) => localStorage.removeItem(k));
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
      } catch (retryErr) {
        console.warn('LocalStorage quota limit reached for full database:', retryErr);
      }
    }
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
};

export interface SyncDiagnosticInfo {
  status: 'connected' | 'saving' | 'offline' | 'permission_denied' | 'error';
  projectId: string;
  projectLabel: string;
  lastSyncTime?: string;
  errorMessage?: string;
  totalStudentsLocal?: number;
}

export let currentDiagnostic: SyncDiagnosticInfo = {
  status: 'offline',
  projectId: firebaseConfig.projectId,
  projectLabel: ACTIVE_PROJECT_PROFILE.label,
  totalStudentsLocal: 0
};

export const CLIENT_SESSION_ID = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Strip any `undefined` properties recursively before writing to Cloud Firestore
const stripUndefinedForFirestore = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

const writeAppDataToFirestore = async (fs: Firestore, payload: any): Promise<void> => {
  const cleanPayload = stripUndefinedForFirestore(payload);
  const docRef = doc(fs, 'church_data', DB_KEY);
  const serialized = JSON.stringify(cleanPayload);

  if (serialized.length < 750000) {
    await setDoc(docRef, { ...cleanPayload, _membersChunkCount: 0 });
    return;
  }

  const allMembers = Array.isArray(cleanPayload.churchMembers) ? cleanPayload.churchMembers : [];
  const CHUNK_SIZE = 1000;
  const chunks: any[][] = [];
  for (let i = 0; i < allMembers.length; i += CHUNK_SIZE) {
    chunks.push(allMembers.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map((chunk, idx) =>
      setDoc(doc(fs, 'church_data', `${DB_KEY}_members_${idx}`), {
        members: chunk,
        _syncMeta: cleanPayload._syncMeta || null
      })
    )
  );

  await setDoc(docRef, {
    ...cleanPayload,
    churchMembers: [],
    _membersChunkCount: chunks.length
  });
};

const readChunksFromFirestore = async (fs: Firestore, docData: any): Promise<any> => {
  const chunkCount = Number(docData?._membersChunkCount || 0);
  if (chunkCount <= 0) return docData;

  const chunkDocs = await Promise.all(
    Array.from({ length: chunkCount }, (_, idx) =>
      getDoc(doc(fs, 'church_data', `${DB_KEY}_members_${idx}`))
    )
  );

  const reassembledMembers: any[] = [];
  chunkDocs.forEach((snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.members)) {
        reassembledMembers.push(...data.members);
      }
    }
  });

  return {
    ...docData,
    churchMembers: reassembledMembers
  };
};

export const subscribeToAppData = (
  onData: (data: AppData) => void,
  onStatusChange: (status: 'connected' | 'saving' | 'offline' | 'error', diag?: SyncDiagnosticInfo) => void
) => {
  const initialLocal = loadStoredLocalData();
  onData(initialLocal);

  if (!firestoreInstance) {
    initFirebaseApp();
  }
  const profile = getActiveProjectProfile();

  let unsubFirestore: (() => void) | null = null;

  const handleRemoteData = (val: any) => {
    if (val && typeof val === 'object') {
      if (val._syncMeta && val._syncMeta.clientId === CLIENT_SESSION_ID) {
        currentDiagnostic = {
          status: 'connected',
          projectId: profile.id,
          projectLabel: profile.label,
          lastSyncTime: new Date().toLocaleTimeString('am-ET')
        };
        onStatusChange('connected', currentDiagnostic);
        return;
      }

      const currentLocal = loadStoredLocalData();

      const mergedStudents: AppData['students'] = {};
      const localStudents = currentLocal.students || {};
      const remoteStudents = val.students && typeof val.students === 'object' ? val.students : {};

      const allYears = Array.from(new Set([...Object.keys(localStudents), ...Object.keys(remoteStudents)]));

      allYears.forEach((yr) => {
        const localClassMap = localStudents[yr] || {};
        const remoteClassMap = remoteStudents[yr] || {};
        const allClasses = Array.from(new Set([...Object.keys(localClassMap), ...Object.keys(remoteClassMap)]));

        mergedStudents[yr] = {};
        allClasses.forEach((cls) => {
          const remoteList = Array.isArray(remoteClassMap[cls]) ? remoteClassMap[cls] : [];
          const localList = Array.isArray(localClassMap[cls]) ? localClassMap[cls] : [];
          mergedStudents[yr][cls] = remoteList.length > 0 ? remoteList : localList;
        });
      });

      const mergedData: AppData = {
        ...INITIAL_APP_DATA,
        ...currentLocal,
        ...val,
        pins: {
          admin: val.pins?.admin || currentLocal.pins?.admin || INITIAL_APP_DATA.pins.admin,
          leader: val.pins?.leader || currentLocal.pins?.leader || INITIAL_APP_DATA.pins.leader,
          chapels: {
            ...DEFAULT_CHAPEL_PINS,
            ...(currentLocal.pins?.chapels || {}),
            ...(val.pins?.chapels || {})
          },
          units: {
            ...DEFAULT_ORG_UNIT_PINS,
            ...(currentLocal.pins?.units || {}),
            ...(val.pins?.units || {})
          }
        },
        teachers: val.teachers && val.teachers.length > 0 ? val.teachers : currentLocal.teachers,
        subjects: val.subjects && val.subjects.length > 0 ? val.subjects : currentLocal.subjects,
        classSubjects: val.classSubjects || currentLocal.classSubjects || {},
        choirGroups: val.choirGroups && val.choirGroups.length > 0 ? val.choirGroups : currentLocal.choirGroups,
        spiritualGroups:
          val.spiritualGroups && val.spiritualGroups.length > 0
            ? val.spiritualGroups
            : currentLocal.spiritualGroups,
        plans: val.plans && val.plans.length > 0 ? val.plans : currentLocal.plans,
        students: Object.keys(mergedStudents).length > 0 ? mergedStudents : currentLocal.students || {},
        attendance: val.attendance && val.attendance.length > 0 ? val.attendance : currentLocal.attendance,
        choirMembers: val.choirMembers && val.choirMembers.length > 0 ? val.choirMembers : currentLocal.choirMembers,
        chapels: DEFAULT_CHAPELS,
        churchChildren:
          val.churchChildren && val.churchChildren.length > 0
            ? val.churchChildren
            : currentLocal.churchChildren || [],
        churchMembers:
          val.churchMembers && val.churchMembers.length > 0
            ? val.churchMembers
            : currentLocal.churchMembers || [],
        departmentData:
          val.departmentData && typeof val.departmentData === 'object'
            ? val.departmentData
            : currentLocal.departmentData || {},
        submissions:
          Array.isArray(val.submissions) && val.submissions.length > 0
            ? val.submissions
            : currentLocal.submissions || [],
        planDispatches:
          Array.isArray(val.planDispatches) && val.planDispatches.length > 0
            ? val.planDispatches
            : currentLocal.planDispatches || [],
        failedLoginAttempts: Array.isArray(val.failedLoginAttempts)
          ? val.failedLoginAttempts
          : currentLocal.failedLoginAttempts || [],
        blockedBrowsers: Array.isArray(val.blockedBrowsers)
          ? val.blockedBrowsers
          : currentLocal.blockedBrowsers || [],
        years: val.years && val.years.length > 0 ? val.years : currentLocal.years
      };

      const sanitizedMerged = sanitizeAndDeduplicateAppData(mergedData);

      saveToLocalStorage(sanitizedMerged);
      onData(sanitizedMerged);

      currentDiagnostic = {
        status: 'connected',
        projectId: profile.id,
        projectLabel: profile.label,
        lastSyncTime: new Date().toLocaleTimeString('am-ET'),
        totalStudentsLocal: countStudentsInData(sanitizedMerged)
      };
      onStatusChange('connected', currentDiagnostic);
    }
  };

  if (firestoreInstance) {
    try {
      const fs = firestoreInstance;
      const docRef = doc(fs, 'church_data', DB_KEY);
      unsubFirestore = onSnapshot(
        docRef,
        async (snap) => {
          if (snap.exists()) {
            try {
              const fullData = await readChunksFromFirestore(fs, snap.data());
              handleRemoteData(fullData);
            } catch {
              handleRemoteData(snap.data());
            }
          } else {
            try {
              await writeAppDataToFirestore(fs, {
                ...initialLocal,
                _syncMeta: {
                  clientId: CLIENT_SESSION_ID,
                  timestamp: Date.now()
                }
              });
              currentDiagnostic = {
                status: 'connected',
                projectId: profile.id,
                projectLabel: profile.label,
                lastSyncTime: new Date().toLocaleTimeString('am-ET'),
                totalStudentsLocal: countStudentsInData(initialLocal)
              };
              onStatusChange('connected', currentDiagnostic);
            } catch (writeErr: any) {
              const msg = String(writeErr?.message || '');
              const isPermission =
                writeErr?.code === 'permission-denied' || msg.toLowerCase().includes('permission');
              currentDiagnostic = {
                status: isPermission ? 'permission_denied' : 'offline',
                projectId: profile.id,
                projectLabel: profile.label,
                errorMessage: isPermission
                  ? 'የCloud Firestore ፍቃድ አልተከፈተም (Permission Denied)። እባክዎ በFirebase Console -> Firestore Rules ውስጥ allow read, write: if true; ያድርጉ።'
                  : msg
              };
              onStatusChange('offline', currentDiagnostic);
            }
          }
        },
        (error: any) => {
          const msg = String(error?.message || '');
          const isPermission =
            error?.code === 'permission-denied' || msg.toLowerCase().includes('permission');
          currentDiagnostic = {
            status: isPermission ? 'permission_denied' : 'offline',
            projectId: profile.id,
            projectLabel: profile.label,
            errorMessage: isPermission
              ? 'የCloud Firestore ፍቃድ አልተከፈተም (Permission Denied)። እባክዎ በFirebase Console -> Firestore Rules ውስጥ allow read, write: if true; ያድርጉ።'
              : msg
          };
          onStatusChange('offline', currentDiagnostic);
        }
      );
    } catch (err: any) {
      currentDiagnostic = {
        status: 'offline',
        projectId: profile.id,
        projectLabel: profile.label,
        errorMessage: err?.message
      };
      onStatusChange('offline', currentDiagnostic);
    }
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
  };
};

export const syncAppDataToFirebase = async (data: AppData): Promise<boolean> => {
  saveToLocalStorage(data);

  const payload = {
    ...data,
    _syncMeta: {
      clientId: CLIENT_SESSION_ID,
      timestamp: Date.now()
    }
  };

  if (firestoreInstance) {
    try {
      await Promise.race([
        writeAppDataToFirestore(firestoreInstance, payload),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000))
      ]);
      currentDiagnostic = {
        ...currentDiagnostic,
        status: 'connected',
        lastSyncTime: new Date().toLocaleTimeString('am-ET'),
        totalStudentsLocal: countStudentsInData(data)
      };
      return true;
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isPermission = err?.code === 'permission-denied' || msg.toLowerCase().includes('permission');
      currentDiagnostic = {
        ...currentDiagnostic,
        status: isPermission ? 'permission_denied' : 'offline',
        errorMessage: msg
      };
      console.warn('Firestore sync note:', msg);
    }
  }

  return false;
};

const hasRecognizableAppFields = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Boolean(
    obj.students ||
      obj.teachers ||
      obj.subjects ||
      obj.classSubjects ||
      obj.churchMembers ||
      obj.churchChildren ||
      obj.plans ||
      obj.attendance ||
      obj.weeklyAttendance ||
      obj.choirMembers ||
      obj.spiritualMembers ||
      obj.departmentData ||
      obj.submissions ||
      obj.pins ||
      obj.years
  );
};

// Unwrap exported JSON, app backup JSON, or standalone JSON arrays/objects
export const extractFirebasePayloadObject = (raw: any): any | null => {
  if (!raw || typeof raw !== 'object') return null;

  if (Array.isArray(raw)) {
    if (raw.length === 0) return { churchMembers: [] };
    const sample = raw[0] || {};
    if (sample.m1 !== undefined || (sample.assignedClass === undefined && sample.total !== undefined)) {
      return { students: { '2019': { '1ኛ ክፍል ሀ': raw } } };
    }
    if (sample.assignedClass !== undefined && sample.pin !== undefined) {
      return { teachers: raw };
    }
    if (sample.chapel !== undefined || sample.parentName !== undefined || sample.age !== undefined) {
      const hasAdult = raw.some((r: any) => Number(r?.age) > 14);
      return hasAdult ? { churchMembers: raw } : { churchChildren: raw };
    }
    return { churchMembers: raw };
  }

  if (raw[DB_KEY] && typeof raw[DB_KEY] === 'object') {
    return raw[DB_KEY];
  }

  if (hasRecognizableAppFields(raw)) {
    return raw;
  }

  for (const val of Object.values(raw)) {
    if (hasRecognizableAppFields(val)) {
      return val;
    }
  }

  return null;
};

export interface ImportSundaySchoolSummary {
  studentsCount: number;
  subjectsCount: number;
  classSubjectsCount: number;
  teachersCount: number;
  churchMembersCount?: number;
  churchChildrenCount?: number;
}

const mergeNamedChurchRecords = <
  T extends { name: string; chapel?: string; phone?: string; parentName?: string; residence?: string }
>(
  existing: T[],
  incoming: T[]
): T[] => {
  if (!incoming || incoming.length === 0) return existing;
  if (!existing || existing.length === 0) {
    return incoming.map((item) => ({ ...item, chapel: mapToOfficialChapelStrict(item.chapel || '') }));
  }

  const result = [...existing];
  const keyToIdx = new Map<string, number>();
  result.forEach((item, idx) => {
    const key = `${normalizeAmharicSearchText(item.name)}|${mapToOfficialChapelStrict(item.chapel || '')}`;
    if (!keyToIdx.has(key)) keyToIdx.set(key, idx);
  });

  incoming.forEach((inc) => {
    if (!inc || !inc.name) return;
    const chapel = mapToOfficialChapelStrict(inc.chapel || '');
    const key = `${normalizeAmharicSearchText(inc.name)}|${chapel}`;
    const idx = keyToIdx.get(key);
    if (idx !== undefined) {
      const cur = result[idx];
      result[idx] = {
        ...cur,
        ...inc,
        chapel,
        phone: cur.phone || inc.phone,
        parentName: cur.parentName || inc.parentName,
        residence: cur.residence || inc.residence
      };
    } else {
      keyToIdx.set(key, result.length);
      result.push({ ...inc, chapel });
    }
  });

  return result;
};

// Merge OR Replace full AppData cleanly from any JSON payload
export const mergeImportedSundaySchoolData = (
  currentData: AppData,
  rawInput: any,
  mode: 'merge' | 'replace' = 'merge'
): { merged: AppData; summary: ImportSundaySchoolSummary } | null => {
  const source = extractFirebasePayloadObject(rawInput);
  if (!source) return null;

  const incomingStudents = source.students && typeof source.students === 'object' ? source.students : {};
  const incomingSubjects = Array.isArray(source.subjects) ? source.subjects.filter(Boolean) : [];
  const incomingChurchMembers = Array.isArray(source.churchMembers) ? source.churchMembers : [];
  const incomingChurchChildren = Array.isArray(source.churchChildren) ? source.churchChildren : [];
  const incomingTeachers = Array.isArray(source.teachers) ? source.teachers : [];

  if (mode === 'replace') {
    const replacedData: AppData = sanitizeAndDeduplicateAppData({
      ...INITIAL_APP_DATA,
      ...source,
      years:
        Array.isArray(source.years) && source.years.length > 0 ? source.years : INITIAL_APP_DATA.years,
      pins: {
        admin: source.pins?.admin || currentData.pins?.admin || INITIAL_APP_DATA.pins.admin,
        leader: source.pins?.leader || currentData.pins?.leader || INITIAL_APP_DATA.pins.leader,
        chapels: {
          ...DEFAULT_CHAPEL_PINS,
          ...(currentData.pins?.chapels || {}),
          ...(source.pins?.chapels || {})
        },
        units: {
          ...DEFAULT_ORG_UNIT_PINS,
          ...(currentData.pins?.units || {}),
          ...(source.pins?.units || {})
        }
      },
      teachers: incomingTeachers.length > 0 ? incomingTeachers : currentData.teachers,
      subjects: incomingSubjects.length > 0 ? incomingSubjects : currentData.subjects,
      classSubjects: source.classSubjects || {},
      students: incomingStudents,
      attendance: Array.isArray(source.attendance) ? source.attendance : [],
      weeklyAttendance: source.weeklyAttendance || {},
      weekDates: source.weekDates || {},
      plans: Array.isArray(source.plans) && source.plans.length > 0 ? source.plans : currentData.plans,
      choirGroups:
        Array.isArray(source.choirGroups) && source.choirGroups.length > 0
          ? source.choirGroups
          : currentData.choirGroups,
      choirMembers: Array.isArray(source.choirMembers) ? source.choirMembers : [],
      spiritualGroups:
        Array.isArray(source.spiritualGroups) && source.spiritualGroups.length > 0
          ? source.spiritualGroups
          : currentData.spiritualGroups,
      spiritualMembers: Array.isArray(source.spiritualMembers) ? source.spiritualMembers : [],
      chapels: DEFAULT_CHAPELS,
      churchChildren: incomingChurchChildren.map((c: any) => ({
        ...c,
        chapel: mapToOfficialChapelStrict(c.chapel || '')
      })),
      churchMembers: incomingChurchMembers.map((m: any) => ({
        ...m,
        chapel: mapToOfficialChapelStrict(m.chapel || '')
      })),
      departmentData: source.departmentData && typeof source.departmentData === 'object' ? source.departmentData : {},
      submissions: Array.isArray(source.submissions) ? source.submissions : [],
      planDispatches: Array.isArray(source.planDispatches) ? source.planDispatches : [],
      failedLoginAttempts: Array.isArray(source.failedLoginAttempts) ? source.failedLoginAttempts : [],
      blockedBrowsers: Array.isArray(source.blockedBrowsers) ? source.blockedBrowsers : []
    });

    saveToLocalStorage(replacedData);
    syncAppDataToFirebase(replacedData);

    return {
      merged: replacedData,
      summary: {
        studentsCount: countStudentsInData(replacedData),
        subjectsCount: replacedData.subjects?.length || 0,
        classSubjectsCount: replacedData.classSubjects ? Object.keys(replacedData.classSubjects).length : 0,
        teachersCount: replacedData.teachers?.length || 0,
        churchMembersCount: replacedData.churchMembers?.length || 0,
        churchChildrenCount: replacedData.churchChildren?.length || 0
      }
    };
  }

  // Smart Merge mode
  const mergedStudents: AppData['students'] = { ...(currentData.students || {}) };
  Object.entries(incomingStudents).forEach(([year, classMap]: [string, any]) => {
    if (!classMap || typeof classMap !== 'object') return;
    const existingYearMap = { ...(mergedStudents[year] || {}) };
    Object.entries(classMap).forEach(([clsName, arr]: [string, any]) => {
      if (Array.isArray(arr) && arr.length > 0) {
        const currentList = Array.isArray(existingYearMap[clsName]) ? [...existingYearMap[clsName]] : [];
        const existingNames = new Set(currentList.map((s: any) => normalizeAmharicSearchText(s?.name || '')));
        arr.forEach((st: any) => {
          const stName = String(st?.name || '').trim();
          const stNorm = normalizeAmharicSearchText(stName);
          if (stNorm && !existingNames.has(stNorm)) {
            currentList.push(st);
            existingNames.add(stNorm);
          } else if (stNorm && existingNames.has(stNorm)) {
            const idx = currentList.findIndex(
              (s: any) => normalizeAmharicSearchText(s?.name || '') === stNorm
            );
            if (idx !== -1 && Number(st?.total || 0) >= Number(currentList[idx]?.total || 0)) {
              currentList[idx] = { ...currentList[idx], ...st };
            }
          }
        });
        existingYearMap[clsName] = currentList;
      }
    });
    mergedStudents[year] = existingYearMap;
  });

  const mergedSubjects =
    incomingSubjects.length > 0
      ? Array.from(new Set([...incomingSubjects, ...(currentData.subjects || [])]))
      : currentData.subjects;

  const mergedClassSubjects: { [className: string]: string[] } = {
    ...(currentData.classSubjects || {}),
    ...(source.classSubjects && typeof source.classSubjects === 'object' ? source.classSubjects : {})
  };

  const mergedTeachers = incomingTeachers.length > 0 ? incomingTeachers : currentData.teachers;
  const mergedYears =
    Array.isArray(source.years) && source.years.length > 0
      ? Array.from(new Set([...(currentData.years || []), ...source.years])).sort()
      : currentData.years;

  const mergedChurchChildren = mergeNamedChurchRecords(
    currentData.churchChildren || [],
    incomingChurchChildren
  );
  const mergedChurchMembers = mergeNamedChurchRecords(
    currentData.churchMembers || [],
    incomingChurchMembers
  );

  const mergedData: AppData = {
    ...INITIAL_APP_DATA,
    ...currentData,
    years: mergedYears,
    ageReferenceYear:
      typeof source.ageReferenceYear === 'number'
        ? source.ageReferenceYear
        : currentData.ageReferenceYear || 2017,
    pins: {
      admin: source.pins?.admin || currentData.pins?.admin || INITIAL_APP_DATA.pins.admin,
      leader: source.pins?.leader || currentData.pins?.leader || INITIAL_APP_DATA.pins.leader,
      chapels: {
        ...DEFAULT_CHAPEL_PINS,
        ...(currentData.pins?.chapels || {}),
        ...(source.pins?.chapels || {})
      },
      units: {
        ...DEFAULT_ORG_UNIT_PINS,
        ...(currentData.pins?.units || {}),
        ...(source.pins?.units || {})
      }
    },
    teachers: mergedTeachers,
    subjects: mergedSubjects,
    classSubjects: mergedClassSubjects,
    students: mergedStudents,
    attendance:
      Array.isArray(source.attendance) && source.attendance.length > 0
        ? source.attendance
        : currentData.attendance,
    weeklyAttendance: { ...(currentData.weeklyAttendance || {}), ...(source.weeklyAttendance || {}) },
    weekDates: { ...(currentData.weekDates || {}), ...(source.weekDates || {}) },
    plans: Array.isArray(source.plans) && source.plans.length > 0 ? source.plans : currentData.plans,
    choirGroups:
      Array.isArray(source.choirGroups) && source.choirGroups.length > 0
        ? source.choirGroups
        : currentData.choirGroups,
    choirMembers:
      Array.isArray(source.choirMembers) && source.choirMembers.length > 0
        ? source.choirMembers
        : currentData.choirMembers,
    spiritualGroups:
      Array.isArray(source.spiritualGroups) && source.spiritualGroups.length > 0
        ? source.spiritualGroups
        : currentData.spiritualGroups,
    spiritualMembers:
      Array.isArray(source.spiritualMembers) && source.spiritualMembers.length > 0
        ? source.spiritualMembers
        : currentData.spiritualMembers,
    chapels: DEFAULT_CHAPELS,
    churchChildren: mergedChurchChildren,
    churchMembers: mergedChurchMembers,
    departmentData: {
      ...(currentData.departmentData || {}),
      ...(source.departmentData && typeof source.departmentData === 'object' ? source.departmentData : {})
    },
    submissions:
      Array.isArray(source.submissions) && source.submissions.length > 0
        ? source.submissions
        : currentData.submissions || [],
    planDispatches:
      Array.isArray(source.planDispatches) && source.planDispatches.length > 0
        ? source.planDispatches
        : currentData.planDispatches || [],
    failedLoginAttempts:
      Array.isArray(source.failedLoginAttempts) && source.failedLoginAttempts.length > 0
        ? source.failedLoginAttempts
        : currentData.failedLoginAttempts || [],
    blockedBrowsers:
      Array.isArray(source.blockedBrowsers) && source.blockedBrowsers.length > 0
        ? source.blockedBrowsers
        : currentData.blockedBrowsers || []
  };

  const sanitized = sanitizeAndDeduplicateAppData(mergedData);
  saveToLocalStorage(sanitized);
  syncAppDataToFirebase(sanitized);

  return {
    merged: sanitized,
    summary: {
      studentsCount: countStudentsInData({ students: incomingStudents }),
      subjectsCount: incomingSubjects.length,
      classSubjectsCount: source.classSubjects ? Object.keys(source.classSubjects).length : 0,
      teachersCount: incomingTeachers.length,
      churchMembersCount: incomingChurchMembers.length,
      churchChildrenCount: incomingChurchChildren.length
    }
  };
};

export { countStudentsInData };

// Full Backup JSON Exporter
export const exportBackupJSON = (data: AppData) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `የብርብር_ቃለ_ሕይወት_ሙሉ_ዳታ_${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Full Backup / Export JSON Importer
export const importBackupJSON = (
  jsonString: string,
  currentData?: AppData,
  mode: 'merge' | 'replace' = 'merge'
): AppData | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === 'object') {
      if (currentData) {
        const mergedRes = mergeImportedSundaySchoolData(currentData, parsed, mode);
        if (mergedRes) return mergedRes.merged;
      }

      const source = extractFirebasePayloadObject(parsed) || parsed;
      const validData: AppData = sanitizeAndDeduplicateAppData({
        ...INITIAL_APP_DATA,
        ...source,
        pins: {
          admin: source.pins?.admin || INITIAL_APP_DATA.pins.admin,
          leader: source.pins?.leader || INITIAL_APP_DATA.pins.leader,
          chapels: { ...DEFAULT_CHAPEL_PINS, ...(source.pins?.chapels || {}) },
          units: { ...DEFAULT_ORG_UNIT_PINS, ...(source.pins?.units || {}) }
        },
        students: source.students || {},
        teachers: source.teachers && source.teachers.length > 0 ? source.teachers : INITIAL_APP_DATA.teachers,
        subjects: source.subjects && source.subjects.length > 0 ? source.subjects : INITIAL_APP_DATA.subjects,
        classSubjects: source.classSubjects || {},
        plans: source.plans && source.plans.length > 0 ? source.plans : INITIAL_APP_DATA.plans,
        attendance: source.attendance || [],
        choirMembers: source.choirMembers || [],
        spiritualMembers: source.spiritualMembers || [],
        churchChildren: source.churchChildren || [],
        churchMembers: source.churchMembers || [],
        departmentData: source.departmentData && typeof source.departmentData === 'object' ? source.departmentData : {},
        submissions: Array.isArray(source.submissions) ? source.submissions : [],
        planDispatches: Array.isArray(source.planDispatches) ? source.planDispatches : [],
        failedLoginAttempts: Array.isArray(source.failedLoginAttempts) ? source.failedLoginAttempts : [],
        blockedBrowsers: Array.isArray(source.blockedBrowsers) ? source.blockedBrowsers : [],
        chapels: DEFAULT_CHAPELS
      });
      saveToLocalStorage(validData);
      syncAppDataToFirebase(validData);
      return validData;
    }
  } catch (err) {
    console.error('Import backup failed:', err);
  }
  return null;
};
