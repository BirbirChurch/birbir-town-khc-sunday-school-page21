import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, Database } from 'firebase/database';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, Firestore, setLogLevel } from 'firebase/firestore';
import { AppData } from '../types';
import { INITIAL_APP_DATA, DEFAULT_CHAPELS, DEFAULT_CHAPEL_PINS } from '../constants/initialData';
import { sanitizeAndDeduplicateAppData } from '../utils/idGenerator';
import { normalizeAmharicSearchText, mapToOfficialChapelStrict } from '../utils/churchExcelParser';

// Suppress noisy internal Firestore warnings in console
try {
  setLogLevel('silent');
} catch {}

export interface FirebaseProjectProfile {
  id: string;
  label: string;
  config: {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    databaseURL_alt?: string;
    databaseURL_alt2?: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
}

export const KNOWN_PROJECTS: FirebaseProjectProfile[] = [
  {
    id: "geladestazelulove1628",
    label: "geladestazelulove1628 (ዋናው አዲሱ የቤተክርስቲያን ዳታቤዝ)",
    config: {
      apiKey: "AIzaSyAw5j4fochMJoU4CzWv5h8gl3vXVA49PEU",
      authDomain: "geladestazelulove1628.firebaseapp.com",
      databaseURL: "https://geladestazelulove1628-default-rtdb.europe-west1.firebasedatabase.app",
      databaseURL_alt: "https://geladestazelulove1628-default-rtdb.firebaseio.com",
      projectId: "geladestazelulove1628",
      storageBucket: "geladestazelulove1628.firebasestorage.app",
      messagingSenderId: "873670244371",
      appId: "1:873670244371:web:5e58672da91ce8d284e7e6"
    }
  }
];

const ACTIVE_PROJECT_STORAGE_KEY = 'birbir_active_firebase_project_id';
const LOCAL_STORAGE_KEY = 'birbir_khc_local_data';
const BACKUP_STORAGE_KEY = 'birbir_khc_safety_backup';
const DB_KEY = 'kaleheywet_data';

export const getActiveProjectId = (): string => {
  try {
    const saved = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
    if (saved && saved !== KNOWN_PROJECTS[0].id) {
      localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, KNOWN_PROJECTS[0].id);
    }
  } catch {}
  return KNOWN_PROJECTS[0].id;
};

export const setActiveProjectId = (projectId: string) => {
  const valid = KNOWN_PROJECTS.some((p) => p.id === projectId) ? projectId : KNOWN_PROJECTS[0].id;
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, valid);
};

export const getActiveProjectProfile = (): FirebaseProjectProfile => {
  return KNOWN_PROJECTS[0];
};

export const firebaseConfig = getActiveProjectProfile().config;

// Initialize Firebase App
let appInstance: FirebaseApp | null = null;
let rtdbInstance: Database | null = null;
let firestoreInstance: Firestore | null = null;

const countStudentsInData = (data: any): number => {
  if (!data?.students || typeof data.students !== 'object') return 0;
  return Object.values(data.students).reduce(
    (acc: number, classObj: any) =>
      acc + (typeof classObj === 'object' ? Object.values(classObj).reduce((cAcc: number, arr: any) => cAcc + (Array.isArray(arr) ? arr.length : 0), 0) : 0),
    0
  );
};

const initFirebaseForActiveProject = () => {
  try {
    const profile = getActiveProjectProfile();
    const appName = `app_${profile.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const existing = getApps().find((a) => a.name === appName);
    appInstance = existing || initializeApp(profile.config, appName);

    try {
      rtdbInstance = getDatabase(appInstance, profile.config.databaseURL);
    } catch {
      if (profile.config.databaseURL_alt) {
        try {
          rtdbInstance = getDatabase(appInstance, profile.config.databaseURL_alt);
        } catch {}
      }
    }

    try {
      firestoreInstance = getFirestore(appInstance);
    } catch {}
  } catch (err) {
    console.warn('Firebase init notice:', err);
  }
};

initFirebaseForActiveProject();

export const db = rtdbInstance;
export const firestore = firestoreInstance;

// Load stored local data with exhaustive recovery check across all potential keys in localStorage
export const loadStoredLocalData = (): AppData => {
  try {
    const candidates: any[] = [];

    const knownKeys = [
      LOCAL_STORAGE_KEY,
      BACKUP_STORAGE_KEY,
      'kaleheywet_data',
      'birbir_town_khc_data',
      'sunday_school_data',
      'church_data',
      'students_data'
    ];

    knownKeys.forEach((k) => {
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
        if (k && !knownKeys.includes(k) && (k.includes('birbir') || k.includes('kale') || k.includes('backup') || k.includes('student'))) {
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

    const source = bestSource || candidates[0] || {};

    const rawData: AppData = {
      ...INITIAL_APP_DATA,
      ...source,
      pins: {
        admin: source.pins?.admin || INITIAL_APP_DATA.pins.admin,
        leader: source.pins?.leader || INITIAL_APP_DATA.pins.leader,
        chapels: { ...DEFAULT_CHAPEL_PINS, ...(source.pins?.chapels || {}) }
      },
      teachers: (source.teachers && source.teachers.length > 0) ? source.teachers : INITIAL_APP_DATA.teachers,
      plans: (source.plans && source.plans.length > 0) ? source.plans : INITIAL_APP_DATA.plans,
      choirGroups: (source.choirGroups && source.choirGroups.length > 0) ? source.choirGroups : INITIAL_APP_DATA.choirGroups,
      spiritualGroups: (source.spiritualGroups && source.spiritualGroups.length > 0) ? source.spiritualGroups : INITIAL_APP_DATA.spiritualGroups,
      subjects: (source.subjects && source.subjects.length > 0) ? source.subjects : INITIAL_APP_DATA.subjects,
      classSubjects: source.classSubjects || {},
      students: source.students || {},
      attendance: source.attendance || [],
      choirMembers: source.choirMembers || [],
      spiritualMembers: source.spiritualMembers || [],
      chapels: DEFAULT_CHAPELS,
      churchChildren: (source.churchChildren && source.churchChildren.length > 0) ? source.churchChildren : INITIAL_APP_DATA.churchChildren || [],
      churchMembers: Array.isArray(source.churchMembers) ? source.churchMembers : []
    };

    return sanitizeAndDeduplicateAppData(rawData);
  } catch (e) {
    console.error('Error reading localStorage data', e);
  }
  return INITIAL_APP_DATA;
};

export const saveToLocalStorage = (data: AppData) => {
  try {
    const sanitized = sanitizeAndDeduplicateAppData(data);
    const jsonStr = JSON.stringify(sanitized);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
    } catch {
      const legacyKeys = ['birbir_khc_safety_backup', 'kaleheywet_data', 'birbir_town_khc_data', 'sunday_school_data'];
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
  databaseURL: string;
  lastSyncTime?: string;
  errorMessage?: string;
  totalStudentsLocal?: number;
}

export let currentDiagnostic: SyncDiagnosticInfo = {
  status: 'offline',
  projectId: getActiveProjectId(),
  projectLabel: getActiveProjectProfile().label,
  databaseURL: getActiveProjectProfile().config.databaseURL,
  totalStudentsLocal: 0
};

export const CLIENT_SESSION_ID = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const writeAppDataToFirestore = async (fs: Firestore, payload: any): Promise<void> => {
  const docRef = doc(fs, 'church_data', DB_KEY);
  const serialized = JSON.stringify(payload);

  if (serialized.length < 800000) {
    await setDoc(docRef, { ...payload, _membersChunkCount: 0 });
    return;
  }

  const allMembers = Array.isArray(payload.churchMembers) ? payload.churchMembers : [];
  const CHUNK_SIZE = 1500;
  const chunks: any[][] = [];
  for (let i = 0; i < allMembers.length; i += CHUNK_SIZE) {
    chunks.push(allMembers.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map((chunk, idx) =>
      setDoc(doc(fs, 'church_data', `${DB_KEY}_members_${idx}`), {
        members: chunk,
        _syncMeta: payload._syncMeta
      })
    )
  );

  await setDoc(docRef, {
    ...payload,
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

  initFirebaseForActiveProject();
  const profile = getActiveProjectProfile();

  let unsubRtdb: (() => void) | null = null;
  let unsubFirestore: (() => void) | null = null;

  const handleRemoteData = (val: any) => {
    if (val && typeof val === 'object') {
      if (val._syncMeta && val._syncMeta.clientId === CLIENT_SESSION_ID) {
        currentDiagnostic = {
          status: 'connected',
          projectId: profile.id,
          projectLabel: profile.label,
          databaseURL: profile.config.databaseURL,
          lastSyncTime: new Date().toLocaleTimeString('am-ET')
        };
        onStatusChange('connected', currentDiagnostic);
        return;
      }

      const currentLocal = loadStoredLocalData();

      const mergedStudents: AppData['students'] = {};
      const localStudents = currentLocal.students || {};
      const remoteStudents = (val.students && typeof val.students === 'object') ? val.students : {};

      const allYears = Array.from(new Set([
        ...Object.keys(localStudents),
        ...Object.keys(remoteStudents)
      ]));

      allYears.forEach((yr) => {
        const localClassMap = localStudents[yr] || {};
        const remoteClassMap = remoteStudents[yr] || {};
        const allClasses = Array.from(new Set([
          ...Object.keys(localClassMap),
          ...Object.keys(remoteClassMap)
        ]));

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
          }
        },
        teachers: (val.teachers && val.teachers.length > 0) ? val.teachers : currentLocal.teachers,
        subjects: (val.subjects && val.subjects.length > 0) ? val.subjects : currentLocal.subjects,
        classSubjects: val.classSubjects || currentLocal.classSubjects || {},
        choirGroups: (val.choirGroups && val.choirGroups.length > 0) ? val.choirGroups : currentLocal.choirGroups,
        spiritualGroups: (val.spiritualGroups && val.spiritualGroups.length > 0) ? val.spiritualGroups : currentLocal.spiritualGroups,
        plans: (val.plans && val.plans.length > 0) ? val.plans : currentLocal.plans,
        students: Object.keys(mergedStudents).length > 0 ? mergedStudents : (currentLocal.students || {}),
        attendance: (val.attendance && val.attendance.length > 0) ? val.attendance : currentLocal.attendance,
        choirMembers: (val.choirMembers && val.choirMembers.length > 0) ? val.choirMembers : currentLocal.choirMembers,
        chapels: DEFAULT_CHAPELS,
        churchChildren: (val.churchChildren && val.churchChildren.length > 0) ? val.churchChildren : currentLocal.churchChildren || [],
        churchMembers: (val.churchMembers && val.churchMembers.length > 0) ? val.churchMembers : (currentLocal.churchMembers || []),
        years: (val.years && val.years.length > 0) ? val.years : currentLocal.years
      };

      const sanitizedMerged = sanitizeAndDeduplicateAppData(mergedData);

      saveToLocalStorage(sanitizedMerged);
      onData(sanitizedMerged);

      currentDiagnostic = {
        status: 'connected',
        projectId: profile.id,
        projectLabel: profile.label,
        databaseURL: profile.config.databaseURL,
        lastSyncTime: new Date().toLocaleTimeString('am-ET'),
        totalStudentsLocal: countStudentsInData(sanitizedMerged)
      };
      onStatusChange('connected', currentDiagnostic);
    }
  };

  if (rtdbInstance) {
    try {
      const dataRef = ref(rtdbInstance, DB_KEY);
      unsubRtdb = onValue(
        dataRef,
        (snapshot) => {
          const val = snapshot.val();
          if (val) {
            handleRemoteData(val);
          } else {
            set(dataRef, initialLocal)
              .then(() => {
                currentDiagnostic = {
                  status: 'connected',
                  projectId: profile.id,
                  projectLabel: profile.label,
                  databaseURL: profile.config.databaseURL,
                  lastSyncTime: new Date().toLocaleTimeString('am-ET')
                };
                onStatusChange('connected', currentDiagnostic);
              })
              .catch((err) => {
                const isPermission = err?.message?.includes('PERMISSION_DENIED');
                currentDiagnostic = {
                  status: isPermission ? 'permission_denied' : 'offline',
                  projectId: profile.id,
                  projectLabel: profile.label,
                  databaseURL: profile.config.databaseURL,
                  errorMessage: err?.message
                };
                onStatusChange('offline', currentDiagnostic);
              });
          }
        },
        (error) => {
          const isPermission = error?.message?.includes('PERMISSION_DENIED');
          currentDiagnostic = {
            status: isPermission ? 'permission_denied' : 'offline',
            projectId: profile.id,
            projectLabel: profile.label,
            databaseURL: profile.config.databaseURL,
            errorMessage: isPermission
              ? 'የFirebase ፍቃድ አልተከፈተም (Permission Denied)። እባክዎ በFirebase Console ውስጥ Rules ን .read: true, .write: true ያድርጉ።'
              : error?.message
          };
          onStatusChange('offline', currentDiagnostic);
        }
      );
    } catch (err: any) {
      currentDiagnostic = {
        status: 'offline',
        projectId: profile.id,
        projectLabel: profile.label,
        databaseURL: profile.config.databaseURL,
        errorMessage: err?.message
      };
      onStatusChange('offline', currentDiagnostic);
    }
  }

  if (firestoreInstance && !rtdbInstance) {
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
          }
        },
        () => {
          if (unsubFirestore) {
            unsubFirestore();
            unsubFirestore = null;
          }
        }
      );
    } catch {}
  }

  return () => {
    if (unsubRtdb) unsubRtdb();
    if (unsubFirestore) unsubFirestore();
  };
};

export const syncAppDataToFirebase = async (data: AppData): Promise<boolean> => {
  saveToLocalStorage(data);
  let synced = false;

  const payload = {
    ...data,
    _syncMeta: {
      clientId: CLIENT_SESSION_ID,
      timestamp: Date.now()
    }
  };

  if (rtdbInstance) {
    try {
      const dataRef = ref(rtdbInstance, DB_KEY);
      await Promise.race([
        set(dataRef, payload),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
      synced = true;
      currentDiagnostic.status = 'connected';
      currentDiagnostic.lastSyncTime = new Date().toLocaleTimeString('am-ET');
    } catch (error: any) {
      console.warn('RTDB sync note:', error?.message);
    }
  }

  if (!synced && firestoreInstance) {
    try {
      await Promise.race([
        writeAppDataToFirestore(firestoreInstance, payload),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
      synced = true;
      currentDiagnostic.status = 'connected';
      currentDiagnostic.lastSyncTime = new Date().toLocaleTimeString('am-ET');
    } catch {}
  }

  return synced;
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
    obj.pins ||
    obj.years
  );
};

// Unwrap exported Firebase RTDB JSON, app backup JSON, or standalone JSON arrays/objects
export const extractFirebasePayloadObject = (raw: any): any | null => {
  if (!raw || typeof raw !== 'object') return null;

  // Case 1: Array of records (churchMembers / churchChildren / students)
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { churchMembers: [] };
    const sample = raw[0] || {};
    if (sample.m1 !== undefined || sample.assignedClass === undefined && sample.total !== undefined) {
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

  // Case 2: Standard Firebase wrapper { kaleheywet_data: {...} }
  if (raw[DB_KEY] && typeof raw[DB_KEY] === 'object') {
    return raw[DB_KEY];
  }

  // Case 3: Direct AppData-like JSON object
  if (hasRecognizableAppFields(raw)) {
    return raw;
  }

  // Case 4: Nested 1-level wrapper (e.g. { data: {...} } or { backup: {...} })
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

const mergeNamedChurchRecords = <T extends { name: string; chapel?: string; phone?: string; parentName?: string; residence?: string }>(
  existing: T[],
  incoming: T[]
): T[] => {
  if (!incoming || incoming.length === 0) return existing;
  if (!existing || existing.length === 0) return incoming.map((item) => ({ ...item, chapel: mapToOfficialChapelStrict(item.chapel || '') }));

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
      years: Array.isArray(source.years) && source.years.length > 0 ? source.years : INITIAL_APP_DATA.years,
      pins: {
        admin: source.pins?.admin || currentData.pins?.admin || INITIAL_APP_DATA.pins.admin,
        leader: source.pins?.leader || currentData.pins?.leader || INITIAL_APP_DATA.pins.leader,
        chapels: {
          ...DEFAULT_CHAPEL_PINS,
          ...(currentData.pins?.chapels || {}),
          ...(source.pins?.chapels || {})
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
      choirGroups: Array.isArray(source.choirGroups) && source.choirGroups.length > 0 ? source.choirGroups : currentData.choirGroups,
      choirMembers: Array.isArray(source.choirMembers) ? source.choirMembers : [],
      spiritualGroups: Array.isArray(source.spiritualGroups) && source.spiritualGroups.length > 0 ? source.spiritualGroups : currentData.spiritualGroups,
      spiritualMembers: Array.isArray(source.spiritualMembers) ? source.spiritualMembers : [],
      chapels: DEFAULT_CHAPELS,
      churchChildren: incomingChurchChildren.map((c: any) => ({ ...c, chapel: mapToOfficialChapelStrict(c.chapel || '') })),
      churchMembers: incomingChurchMembers.map((m: any) => ({ ...m, chapel: mapToOfficialChapelStrict(m.chapel || '') }))
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
            const idx = currentList.findIndex((s: any) => normalizeAmharicSearchText(s?.name || '') === stNorm);
            if (idx !== -1 && (Number(st?.total || 0) >= Number(currentList[idx]?.total || 0))) {
              currentList[idx] = { ...currentList[idx], ...st };
            }
          }
        });
        existingYearMap[clsName] = currentList;
      }
    });
    mergedStudents[year] = existingYearMap;
  });

  const mergedSubjects = incomingSubjects.length > 0
    ? Array.from(new Set([...incomingSubjects, ...(currentData.subjects || [])]))
    : currentData.subjects;

  const mergedClassSubjects: { [className: string]: string[] } = {
    ...(currentData.classSubjects || {}),
    ...(source.classSubjects && typeof source.classSubjects === 'object' ? source.classSubjects : {})
  };

  const mergedTeachers = incomingTeachers.length > 0 ? incomingTeachers : currentData.teachers;
  const mergedYears = Array.isArray(source.years) && source.years.length > 0
    ? Array.from(new Set([...(currentData.years || []), ...source.years])).sort()
    : currentData.years;

  const mergedChurchChildren = mergeNamedChurchRecords(currentData.churchChildren || [], incomingChurchChildren);
  const mergedChurchMembers = mergeNamedChurchRecords(currentData.churchMembers || [], incomingChurchMembers);

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
      }
    },
    teachers: mergedTeachers,
    subjects: mergedSubjects,
    classSubjects: mergedClassSubjects,
    students: mergedStudents,
    attendance: (Array.isArray(source.attendance) && source.attendance.length > 0) ? source.attendance : currentData.attendance,
    weeklyAttendance: { ...(currentData.weeklyAttendance || {}), ...(source.weeklyAttendance || {}) },
    weekDates: { ...(currentData.weekDates || {}), ...(source.weekDates || {}) },
    plans: (Array.isArray(source.plans) && source.plans.length > 0) ? source.plans : currentData.plans,
    choirGroups: (Array.isArray(source.choirGroups) && source.choirGroups.length > 0) ? source.choirGroups : currentData.choirGroups,
    choirMembers: (Array.isArray(source.choirMembers) && source.choirMembers.length > 0) ? source.choirMembers : currentData.choirMembers,
    spiritualGroups: (Array.isArray(source.spiritualGroups) && source.spiritualGroups.length > 0) ? source.spiritualGroups : currentData.spiritualGroups,
    spiritualMembers: (Array.isArray(source.spiritualMembers) && source.spiritualMembers.length > 0) ? source.spiritualMembers : currentData.spiritualMembers,
    chapels: DEFAULT_CHAPELS,
    churchChildren: mergedChurchChildren,
    churchMembers: mergedChurchMembers
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

// Fetch data directly from a previous Firebase RTDB URL or Project ID (kept for optional JSON/URL import)
export const fetchDataFromPreviousFirebaseUrl = async (
  urlOrProjectId: string,
  currentData: AppData,
  authToken?: string
): Promise<{
  ok: boolean;
  errorType?: 'permission_denied' | 'not_found' | 'invalid' | 'network';
  message?: string;
  merged?: AppData;
  summary?: ImportSundaySchoolSummary;
}> => {
  const input = (urlOrProjectId || '').trim().replace(/\/+$/, '');
  if (!input) {
    return {
      ok: false,
      errorType: 'invalid',
      message: 'እባክዎ Firebase Database URL ወይም Project ID ያስገቡ።'
    };
  }

  const candidateBases: string[] = [];
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const cleanBase = input.replace(/\/kaleheywet_data\.json.*$/i, '').replace(/\/\.json.*$/i, '');
    candidateBases.push(cleanBase);
  } else {
    const cleanId = input.replace(/[^a-zA-Z0-9-]/g, '');
    candidateBases.push(`https://${cleanId}-default-rtdb.europe-west1.firebasedatabase.app`);
    candidateBases.push(`https://${cleanId}-default-rtdb.firebaseio.com`);
    candidateBases.push(`https://${cleanId}.firebaseio.com`);
  }

  const authQuery = authToken && authToken.trim() ? `?auth=${encodeURIComponent(authToken.trim())}` : '';
  let sawPermissionDenied = false;

  for (const base of candidateBases) {
    const paths = [`${base}/${DB_KEY}.json${authQuery}`, `${base}/.json${authQuery}`];
    for (const fullUrl of paths) {
      try {
        const res = await fetch(fullUrl);
        if (res.status === 401 || res.status === 403) {
          sawPermissionDenied = true;
          continue;
        }
        if (!res.ok) continue;

        const data = await res.json();
        if (!data) continue;

        const result = mergeImportedSundaySchoolData(currentData, data);
        if (result) {
          return {
            ok: true,
            merged: result.merged,
            summary: result.summary
          };
        }
      } catch {}
    }
  }

  if (sawPermissionDenied) {
    return {
      ok: false,
      errorType: 'permission_denied',
      message:
        'ዳታቤዙ በRules ተቆልፏል (Permission Denied)። JSON ፋይሉን ከFirebase Console በExport JSON አውርደው እዚህ ይጫኑ።'
    };
  }

  return {
    ok: false,
    errorType: 'not_found',
    message: 'በተሰጠው Firebase አድራሻ ውስጥ መረጃ አልተገኘም።'
  };
};

// Scan active project cloud data
export const scanAndRecoverPreviousCloudData = async (): Promise<{
  found: boolean;
  projectLabel?: string;
  projectId?: string;
  data?: AppData;
  studentCount?: number;
}> => {
  for (const proj of KNOWN_PROJECTS) {
    try {
      const tempAppName = `scanner_${proj.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const tempApp = getApps().find((a) => a.name === tempAppName) || initializeApp(proj.config, tempAppName);

      const urls = [proj.config.databaseURL, proj.config.databaseURL_alt, proj.config.databaseURL_alt2].filter(Boolean) as string[];
      for (const u of urls) {
        try {
          const tempRtdb = getDatabase(tempApp, u);
          const dataRef = ref(tempRtdb, DB_KEY);
          const snap = await Promise.race([
            get(dataRef),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
          ]);
          if (snap && snap.exists()) {
            const val = snap.val();
            const count = countStudentsInData(val);
            if (count > 0 || (val?.teachers && val.teachers.length > 0)) {
              return {
                found: true,
                projectLabel: proj.label,
                projectId: proj.id,
                data: val,
                studentCount: count
              };
            }
          }
        } catch {}
      }

      try {
        const tempFirestore = getFirestore(tempApp);
        const docRef = doc(tempFirestore, 'church_data', DB_KEY);
        const snap = await Promise.race([
          getDoc(docRef),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        if (snap && snap.exists()) {
          const val = await readChunksFromFirestore(tempFirestore, snap.data());
          const count = countStudentsInData(val);
          if (count > 0 || (val?.teachers && val.teachers.length > 0)) {
            return {
              found: true,
              projectLabel: proj.label,
              projectId: proj.id,
              data: val as AppData,
              studentCount: count
            };
          }
        }
      } catch {}
    } catch {}
  }
  return { found: false };
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

// Full Backup / Firebase Export JSON Importer
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
          chapels: { ...DEFAULT_CHAPEL_PINS, ...(source.pins?.chapels || {}) }
        },
        students: source.students || {},
        teachers: (source.teachers && source.teachers.length > 0) ? source.teachers : INITIAL_APP_DATA.teachers,
        subjects: (source.subjects && source.subjects.length > 0) ? source.subjects : INITIAL_APP_DATA.subjects,
        classSubjects: source.classSubjects || {},
        plans: (source.plans && source.plans.length > 0) ? source.plans : INITIAL_APP_DATA.plans,
        attendance: source.attendance || [],
        choirMembers: source.choirMembers || [],
        spiritualMembers: source.spiritualMembers || [],
        churchChildren: source.churchChildren || [],
        churchMembers: source.churchMembers || [],
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
