import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, Firestore, setLogLevel } from 'firebase/firestore';
import { AppData } from '../types';
import { INITIAL_APP_DATA, DEFAULT_CHAPELS } from '../constants/initialData';
import { sanitizeAndDeduplicateAppData } from '../utils/idGenerator';

// Suppress noisy internal Firestore warnings in console
try {
  setLogLevel('silent');
} catch {}

export const firebaseConfig = {
  apiKey: "AIzaSyAw5j4fochMJoU4CzWv5h8gl3vXVA49PEU",
  authDomain: "geladestazelulove1628.firebaseapp.com",
  projectId: "geladestazelulove1628",
  storageBucket: "geladestazelulove1628.firebasestorage.app",
  messagingSenderId: "873670244371",
  appId: "1:873670244371:web:5e58672da91ce8d284e7e6"
};

export interface FirebaseProjectProfile {
  id: string;
  label: string;
  config: {
    apiKey: string;
    authDomain: string;
    databaseURL?: string;
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
    label: "geladestazelulove1628 (ዋናው የFirebase ዳታቤዝ)",
    config: firebaseConfig
  }
];

const ACTIVE_PROJECT_STORAGE_KEY = 'birbir_active_firebase_project_id';
const LOCAL_STORAGE_KEY = 'birbir_khc_local_data';
const BACKUP_STORAGE_KEY = 'birbir_khc_safety_backup';
const DB_KEY = 'kaleheywet_data';

export const getActiveProjectId = (): string => {
  return firebaseConfig.projectId;
};

export const setActiveProjectId = (projectId: string) => {
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
};

export const getActiveProjectProfile = (): FirebaseProjectProfile => {
  return KNOWN_PROJECTS[0];
};

// Initialize Firebase App
let appInstance: FirebaseApp | null = null;
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
    // Clean up any stale project selection from previous configurations
    try {
      const saved = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
      if (saved && saved !== firebaseConfig.projectId) {
        localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, firebaseConfig.projectId);
      }
    } catch {}

    const appName = `app_${firebaseConfig.projectId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const existing = getApps().find((a) => a.name === appName);
    appInstance = existing || initializeApp(firebaseConfig, appName);
    firestoreInstance = getFirestore(appInstance);
  } catch (err) {
    console.warn('Firebase init notice:', err);
  }
};

initFirebaseForActiveProject();

export const db = null;
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
      pins: { ...INITIAL_APP_DATA.pins, ...(source.pins || {}) },
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
  projectId: firebaseConfig.projectId,
  projectLabel: KNOWN_PROJECTS[0].label,
  databaseURL: `firestore://${firebaseConfig.projectId}`,
  totalStudentsLocal: 0
};

export const CLIENT_SESSION_ID = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Helper to write large AppData payloads safely within Firestore's 1MB document limit
const writeAppDataToFirestore = async (fs: Firestore, payload: any): Promise<void> => {
  const docRef = doc(fs, 'church_data', DB_KEY);
  const serialized = JSON.stringify(payload);

  // If well under Firestore 1MB limit, write single document directly
  if (serialized.length < 800000) {
    await setDoc(docRef, { ...payload, _membersChunkCount: 0 });
    return;
  }

  // Split churchMembers into 1,500-record chunk docs to support 5,300+ members cleanly
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

  const corePayload = {
    ...payload,
    churchMembers: [],
    _membersChunkCount: chunks.length
  };
  await setDoc(docRef, corePayload);
};

// Helper to reassemble chunked churchMembers from Firestore when needed
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

  let unsubFirestore: (() => void) | null = null;

  const handleRemoteData = (val: any) => {
    if (val && typeof val === 'object') {
      if (val._syncMeta && val._syncMeta.clientId === CLIENT_SESSION_ID) {
        currentDiagnostic = {
          status: 'connected',
          projectId: profile.id,
          projectLabel: profile.label,
          databaseURL: `firestore://${profile.id}`,
          lastSyncTime: new Date().toLocaleTimeString('am-ET')
        };
        onStatusChange('connected', currentDiagnostic);
        return;
      }

      const currentLocal = loadStoredLocalData();

      // Safe per-year and per-class deep merge for students
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
        pins: val.pins || currentLocal.pins || INITIAL_APP_DATA.pins,
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
        databaseURL: `firestore://${profile.id}`,
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
            } catch (err: any) {
              console.warn('Firestore chunk read notice:', err?.message);
              handleRemoteData(snap.data());
            }
          } else {
            // Remote is empty: seed Firestore with local data
            try {
              await writeAppDataToFirestore(fs, {
                ...initialLocal,
                _syncMeta: { clientId: CLIENT_SESSION_ID, timestamp: Date.now() }
              });
              currentDiagnostic = {
                status: 'connected',
                projectId: profile.id,
                projectLabel: profile.label,
                databaseURL: `firestore://${profile.id}`,
                lastSyncTime: new Date().toLocaleTimeString('am-ET'),
                totalStudentsLocal: countStudentsInData(initialLocal)
              };
              onStatusChange('connected', currentDiagnostic);
            } catch (err: any) {
              const isPermission =
                err?.code === 'permission-denied' ||
                err?.message?.includes('PERMISSION_DENIED') ||
                err?.message?.includes('Missing or insufficient permissions');
              currentDiagnostic = {
                status: isPermission ? 'permission_denied' : 'offline',
                projectId: profile.id,
                projectLabel: profile.label,
                databaseURL: `firestore://${profile.id}`,
                errorMessage: isPermission
                  ? 'የFirebase Firestore ፍቃድ አልተከፈተም (Permission Denied)። እባክዎ በFirebase Console ውስጥ Rules ን allow read, write: if true; ያድርጉ።'
                  : err?.message
              };
              onStatusChange('offline', currentDiagnostic);
            }
          }
        },
        (error) => {
          const isPermission =
            error?.code === 'permission-denied' ||
            error?.message?.includes('PERMISSION_DENIED') ||
            error?.message?.includes('Missing or insufficient permissions');
          currentDiagnostic = {
            status: isPermission ? 'permission_denied' : 'offline',
            projectId: profile.id,
            projectLabel: profile.label,
            databaseURL: `firestore://${profile.id}`,
            errorMessage: isPermission
              ? 'የFirebase Firestore ፍቃድ አልተከፈተም (Permission Denied)። እባክዎ በFirebase Console ውስጥ Rules ን allow read, write: if true; ያድርጉ።'
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
        databaseURL: `firestore://${profile.id}`,
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
  let synced = false;

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
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);
      synced = true;
      currentDiagnostic.status = 'connected';
      currentDiagnostic.lastSyncTime = new Date().toLocaleTimeString('am-ET');
    } catch (err: any) {
      console.warn('Firestore sync notice:', err?.message);
    }
  }

  return synced;
};

// Check current configured Firebase project for existing cloud data
export const scanAndRecoverPreviousCloudData = async (): Promise<{
  found: boolean;
  projectLabel?: string;
  projectId?: string;
  data?: AppData;
  studentCount?: number;
}> => {
  if (!firestoreInstance) return { found: false };
  try {
    const profile = getActiveProjectProfile();
    const docRef = doc(firestoreInstance, 'church_data', DB_KEY);
    const snap = await Promise.race([
      getDoc(docRef),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    if (snap && snap.exists()) {
      const val = await readChunksFromFirestore(firestoreInstance, snap.data());
      const count = countStudentsInData(val);
      if (count > 0 || (val?.teachers && val.teachers.length > 0)) {
        return {
          found: true,
          projectLabel: profile.label,
          projectId: profile.id,
          data: val as AppData,
          studentCount: count
        };
      }
    }
  } catch {}
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

// Full Backup JSON Importer
export const importBackupJSON = (jsonString: string): AppData | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === 'object') {
      const validData: AppData = {
        ...INITIAL_APP_DATA,
        ...parsed,
        students: parsed.students || {},
        teachers: parsed.teachers || INITIAL_APP_DATA.teachers,
        plans: parsed.plans || INITIAL_APP_DATA.plans,
        attendance: parsed.attendance || [],
        choirMembers: parsed.choirMembers || [],
        spiritualMembers: parsed.spiritualMembers || []
      };
      saveToLocalStorage(validData);
      syncAppDataToFirebase(validData);
      return validData;
    }
  } catch (err) {
    console.error('Import backup failed:', err);
  }
  return null;
};
