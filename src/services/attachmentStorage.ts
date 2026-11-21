import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from './firebase';

const IDB_NAME = 'birbir_khc_attachments_db';
const IDB_STORE = 'files';
const IDB_VERSION = 1;
const CHUNK_CHAR_SIZE = 480000; // Safe margin below Cloud Firestore 1MB per-document cap

// Fast in-memory cache for active session
const memoryAttachmentCache = new Map<string, string>();

const openAttachmentDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const readFromIdb = async (key: string): Promise<string | null> => {
  const db = await openAttachmentDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(typeof req.result === 'string' ? req.result : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const writeToIdb = async (key: string, dataUrl: string): Promise<void> => {
  const db = await openAttachmentDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

const removeFromIdb = async (key: string): Promise<void> => {
  const db = await openAttachmentDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

export const saveAttachmentFile = async (
  storageKey: string,
  fileName: string,
  dataUrl: string
): Promise<void> => {
  if (!storageKey || !dataUrl) return;

  // 1. Store immediately in memory + IndexedDB (zero truncation, instant offline access)
  memoryAttachmentCache.set(storageKey, dataUrl);
  await writeToIdb(storageKey, dataUrl);

  // 2. Sync to Cloud Firestore across chunked documents so all devices can open large files intact
  if (!firestore) return;
  try {
    const fs = firestore;
    const chunks: string[] = [];
    for (let i = 0; i < dataUrl.length; i += CHUNK_CHAR_SIZE) {
      chunks.push(dataUrl.slice(i, i + CHUNK_CHAR_SIZE));
    }

    await Promise.all(
      chunks.map((chunk, idx) =>
        setDoc(doc(fs, 'church_data', `att_${storageKey}_c_${idx}`), {
          data: chunk,
          index: idx
        })
      )
    );

    await setDoc(doc(fs, 'church_data', `att_${storageKey}_meta`), {
      fileName,
      chunkCount: chunks.length,
      totalLength: dataUrl.length,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Cloud chunked attachment upload fallback notice:', err);
  }
};

export const loadAttachmentDataUrl = async (
  storageKey?: string,
  inlineFallback?: string
): Promise<string | null> => {
  if (inlineFallback && inlineFallback.length > 0) {
    if (storageKey) memoryAttachmentCache.set(storageKey, inlineFallback);
    return inlineFallback;
  }

  if (!storageKey) return null;

  // 1. Memory cache
  const memHit = memoryAttachmentCache.get(storageKey);
  if (memHit) return memHit;

  // 2. IndexedDB
  const idbHit = await readFromIdb(storageKey);
  if (idbHit) {
    memoryAttachmentCache.set(storageKey, idbHit);
    return idbHit;
  }

  // 3. Cloud Firestore chunk reassembly
  if (!firestore) return null;
  try {
    const fs = firestore;
    const metaSnap = await getDoc(doc(fs, 'church_data', `att_${storageKey}_meta`));
    if (!metaSnap.exists()) return null;

    const meta = metaSnap.data();
    const chunkCount = Number(meta?.chunkCount || 0);
    if (chunkCount <= 0) return null;

    const chunkSnaps = await Promise.all(
      Array.from({ length: chunkCount }, (_, idx) =>
        getDoc(doc(fs, 'church_data', `att_${storageKey}_c_${idx}`))
      )
    );

    const parts: string[] = [];
    for (const snap of chunkSnaps) {
      if (!snap.exists()) return null;
      const d = snap.data()?.data;
      if (typeof d !== 'string') return null;
      parts.push(d);
    }

    const fullDataUrl = parts.join('');
    if (fullDataUrl) {
      memoryAttachmentCache.set(storageKey, fullDataUrl);
      await writeToIdb(storageKey, fullDataUrl);
      return fullDataUrl;
    }
  } catch (err) {
    console.warn('Cloud attachment fetch notice:', err);
  }

  return null;
};

export const deleteAttachmentFile = async (storageKey?: string): Promise<void> => {
  if (!storageKey) return;
  memoryAttachmentCache.delete(storageKey);
  await removeFromIdb(storageKey);

  if (!firestore) return;
  try {
    const fs = firestore;
    const metaSnap = await getDoc(doc(fs, 'church_data', `att_${storageKey}_meta`));
    if (metaSnap.exists()) {
      const chunkCount = Number(metaSnap.data()?.chunkCount || 0);
      await Promise.all([
        deleteDoc(doc(fs, 'church_data', `att_${storageKey}_meta`)),
        ...Array.from({ length: chunkCount }, (_, idx) =>
          deleteDoc(doc(fs, 'church_data', `att_${storageKey}_c_${idx}`))
        )
      ]);
    }
  } catch {
    // ignore cleanup errors
  }
};
