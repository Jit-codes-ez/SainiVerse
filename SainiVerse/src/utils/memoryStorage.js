import { collection, onSnapshot, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, auth, storage, isFirebaseConfigured } from '../firebase';
import { logVaultAction } from './activityLogger';

const LOCAL_STORAGE_KEY = 'sainiverse_memories_store';

// Default initial starter memories for sandbox demo
// Empty by default: if 0 images are in Cloudflare or Firestore, show 0 memories
export const DEFAULT_DEMO_MEMORIES = [];

/**
 * Trigger an application-wide memory re-sync event
 */
export function triggerMemoriesRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sainiverse_refresh_memories'));
  }
}

/**
 * Determines whether a memory is strictly private or public.
 * Partition prefixes (Public_Memory / Private_Memory) and explicit visibility flag take precedence.
 *
 * @param {Object} memory
 * @returns {boolean}
 */
export function isPrivateMemory(memory) {
  if (!memory) return false;

  const key = (memory.storageKey || memory.storagePath || '').trim();

  // 1. R2 folder partition prefix is definitive ground truth
  if (key.startsWith('Public_Memory/') || key.startsWith('Public_Memories/')) {
    return false;
  }
  if (key.startsWith('Private_Memory/') || key.startsWith('Private_Memories/')) {
    return true;
  }

  // 2. Explicit visibility attribute
  if (memory.visibility === 'public') return false;
  if (memory.visibility === 'private') return true;

  // 3. Legacy fallback for old demo records lacking folder/visibility
  return memory.tag === 'Just Us';
}

// Session cache of deleted memory identifiers to prevent race conditions or browser cache lag
const deletedMemoryKeys = new Set();

export function markMemoryAsDeleted(memory) {
  if (!memory) return;
  if (memory.id) deletedMemoryKeys.add(String(memory.id));
  if (memory.storageKey) deletedMemoryKeys.add(String(memory.storageKey));
  if (memory.storagePath) deletedMemoryKeys.add(String(memory.storagePath));
  if (memory.fileName) deletedMemoryKeys.add(String(memory.fileName));
}

export function isMemoryDeleted(item) {
  if (!item) return false;
  if (item.id && deletedMemoryKeys.has(String(item.id))) return true;
  if (item.storageKey && deletedMemoryKeys.has(String(item.storageKey))) return true;
  if (item.storagePath && deletedMemoryKeys.has(String(item.storagePath))) return true;
  if (item.fileName && deletedMemoryKeys.has(String(item.fileName))) return true;
  return false;
}

/**
 * Fetch photos directly from Cloudflare R2 bucket folders:
 * 'public' queries Public_Memories/ and Public_Memory/
 * 'private' queries Private_Memories/ and Private_Memory/ (requires session token)
 *
 * @param {'public' | 'private'} folder
 * @returns {Promise<Array<any>>}
 */
export async function fetchR2Photos(folder = 'public') {
  try {
    const headers = {};
    if (folder === 'private' && auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (e) {
        console.warn('[Cloudflare R2] Could not get auth token for private photos:', e);
      }
    }

    const res = await fetch(`/api/list-photos?folder=${folder}&_t=${Date.now()}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[Cloudflare R2] List photos HTTP ${res.status} for ${folder}`);
      return [];
    }

    const data = await res.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];
    return photos.filter((p) => !isMemoryDeleted(p));
  } catch (err) {
    console.warn(`[Cloudflare R2] Failed fetching ${folder} photos:`, err?.message || err);
    return [];
  }
}

/**
 * Subscribes to real-time memories:
 * 1. Queries Cloudflare R2 bucket directly for all real photos in Public_Memories/ & Private_Memories/
 * 2. Merges with Firestore collections for romantic metadata (captions, tags, memory dates, uploader)
 * 3. If 0 images exist in Cloudflare R2, emits an empty list so "No Memories" empty state is shown.
 */
export function subscribeToMemories(callback) {
  let isMounted = true;
  let r2PublicList = [];
  let r2PrivateList = [];
  let firestorePublicDocs = [];
  let firestorePrivateDocs = [];
  let firestoreLegacyDocs = [];

  const emitMerged = () => {
    if (!isMounted) return;

    // Index all Firestore docs by storageKey, storagePath, id, and fileName
    const fsMap = new Map();
    const allFsDocs = [...firestorePublicDocs, ...firestorePrivateDocs, ...firestoreLegacyDocs];
    for (const d of allFsDocs) {
      if (d.storageKey) fsMap.set(d.storageKey, d);
      if (d.storagePath) fsMap.set(d.storagePath, d);
      if (d.id) fsMap.set(d.id, d);
      if (d.fileName) fsMap.set(d.fileName, d);
    }

    // Helper to find corresponding Firestore romantic metadata document
    const findMatchingDoc = (r2) => {
      if (!r2) return null;
      if (r2.storageKey && fsMap.has(r2.storageKey)) return fsMap.get(r2.storageKey);
      if (r2.fileName && fsMap.has(r2.fileName)) return fsMap.get(r2.fileName);
      if (r2.id && fsMap.has(r2.id)) return fsMap.get(r2.id);

      const normR2Key = (r2.storageKey || '')
        .replace(/^\/+/, '')
        .replace('Public_Memories/', 'Public_Memory/')
        .replace('Private_Memories/', 'Private_Memory/');

      for (const d of allFsDocs) {
        const normDocKey = (d.storageKey || d.storagePath || '')
          .replace(/^\/+/, '')
          .replace('Public_Memories/', 'Public_Memory/')
          .replace('Private_Memories/', 'Private_Memory/');

        if (normDocKey && normDocKey === normR2Key) return d;
        if (d.id && normR2Key.includes(d.id)) return d;
        if (d.fileName && (normR2Key.endsWith(d.fileName) || r2.fileName === d.fileName)) return d;
      }
      return null;
    };

    const resultMap = new Map();

    // 1. Process all real Cloudflare R2 Public Photos
    for (const r2 of r2PublicList) {
      if (isMemoryDeleted(r2)) continue;
      const match = findMatchingDoc(r2);

      const email = (match?.uploadedBy || '').toLowerCase();
      const rawUploader = (match?.uploaderName || '').trim();
      let finalUploader = 'Jit';
      if (rawUploader && rawUploader !== 'Partner' && rawUploader !== 'Her') {
        finalUploader = rawUploader;
      } else if (email.includes('saini')) {
        finalUploader = 'Saini';
      } else if (email.includes('jit')) {
        finalUploader = 'Jit';
      }

      const rawCap = (match?.caption || '').trim();
      const fallbackCap = r2.fileName && !/^[a-f0-9-]{36}/i.test(r2.fileName)
        ? r2.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        : 'Special Moment';

      const memoryItem = {
        id: match?.id || r2.id,
        storageKey: r2.storageKey,
        storagePath: r2.storageKey,
        fileName: match?.fileName || r2.fileName,
        caption: rawCap || fallbackCap,
        memoryDate:
          match?.memoryDate ||
          (r2.lastModified ? r2.lastModified.split('T')[0] : new Date().toISOString().split('T')[0]),
        tag: match?.tag || 'Special Moment',
        visibility: 'public',
        uploadedBy: match?.uploadedBy || (finalUploader === 'Jit' ? 'hers.jit@gmail.com' : 'his.saini.gulu@gmail.com'),
        uploaderName: finalUploader,
        width: match?.width,
        height: match?.height,
        createdAt: match?.createdAt || r2.lastModified,
      };
      resultMap.set(r2.storageKey, memoryItem);
    }

    // 2. Process all real Cloudflare R2 Private Photos (if authenticated)
    for (const r2 of r2PrivateList) {
      if (isMemoryDeleted(r2)) continue;
      const match = findMatchingDoc(r2);

      const email = (match?.uploadedBy || '').toLowerCase();
      const rawUploader = (match?.uploaderName || '').trim();
      let finalUploader = 'Jit';
      if (rawUploader && rawUploader !== 'Partner' && rawUploader !== 'Her') {
        finalUploader = rawUploader;
      } else if (email.includes('saini')) {
        finalUploader = 'Saini';
      } else if (email.includes('jit')) {
        finalUploader = 'Jit';
      }

      const rawCap = (match?.caption || '').trim();

      const memoryItem = {
        id: match?.id || r2.id,
        storageKey: r2.storageKey,
        storagePath: r2.storageKey,
        fileName: match?.fileName || r2.fileName,
        caption: rawCap || 'Confidential Whispered Memory',
        memoryDate:
          match?.memoryDate ||
          (r2.lastModified ? r2.lastModified.split('T')[0] : new Date().toISOString().split('T')[0]),
        tag: match?.tag || 'Just Us',
        visibility: 'private',
        uploadedBy: match?.uploadedBy || (finalUploader === 'Jit' ? 'hers.jit@gmail.com' : 'his.saini.gulu@gmail.com'),
        uploaderName: finalUploader,
        width: match?.width,
        height: match?.height,
        createdAt: match?.createdAt || r2.lastModified,
      };
      resultMap.set(r2.storageKey, memoryItem);
    }

    // 3. Also include all Firestore documents that have an active storageKey
    for (const d of allFsDocs) {
      if (isMemoryDeleted(d)) continue;
      const key = d.storageKey || d.storagePath || d.id;
      if (key && !resultMap.has(key)) {
        const isPriv = isPrivateMemory(d);
        if (isPriv && !auth?.currentUser) continue;

        const email = (d.uploadedBy || '').toLowerCase();
        const rawUploader = (d.uploaderName || '').trim();
        let finalUploader = 'Jit';
        if (rawUploader && rawUploader !== 'Partner' && rawUploader !== 'Her') {
          finalUploader = rawUploader;
        } else if (email.includes('saini')) {
          finalUploader = 'Saini';
        } else if (email.includes('jit')) {
          finalUploader = 'Jit';
        }

        resultMap.set(key, {
          id: d.id,
          storageKey: d.storageKey || d.storagePath || key,
          storagePath: d.storagePath || d.storageKey || key,
          fileName: d.fileName || key.split('/').pop() || 'photo.jpg',
          caption: d.caption || (isPriv ? 'Confidential Whispered Memory' : 'Treasured Memory'),
          memoryDate:
            d.memoryDate ||
            (d.createdAt?.toDate?.() ? d.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          tag: d.tag || (isPriv ? 'Just Us' : 'Special Moment'),
          visibility: isPriv ? 'private' : 'public',
          uploadedBy: d.uploadedBy || (finalUploader === 'Jit' ? 'hers.jit@gmail.com' : 'his.saini.gulu@gmail.com'),
          uploaderName: finalUploader,
          width: d.width || 0,
          height: d.height || 0,
          createdAt: d.createdAt,
        });
      }
    }

    // 4. Fallback for offline local demo mode (if Firebase is not configured)
    if (!isFirebaseConfigured && r2PublicList.length === 0 && r2PrivateList.length === 0) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (!resultMap.has(item.storageKey || item.id)) {
                resultMap.set(item.storageKey || item.id, item);
              }
            });
          }
        }
      } catch {}
    }

    const combined = Array.from(resultMap.values()).sort((a, b) => {
      const dateA = new Date(a.memoryDate || a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
      const dateB = new Date(b.memoryDate || b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    callback(combined);
  };

  // Asynchronously fetch Cloudflare R2 photos and fast parallel fetch of Firestore metadata
  const loadR2Data = async () => {
    if (!isMounted) return;

    try {
      const [pub, fsPublicSnap] = await Promise.all([
        fetchR2Photos('public'),
        isFirebaseConfigured && db ? getDocs(collection(db, 'Public_Memory_Details')).catch(() => null) : null,
      ]);

      if (isMounted) {
        r2PublicList = pub;
        if (fsPublicSnap && Array.isArray(fsPublicSnap.docs) && fsPublicSnap.docs.length > 0) {
          firestorePublicDocs = fsPublicSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            visibility: 'public',
          }));
        }
        emitMerged();
      }
    } catch (e) {
      console.warn('[Memories] Error loading public R2 photos:', e);
    }

    if (auth?.currentUser) {
      try {
        const priv = await fetchR2Photos('private');
        if (isMounted) {
          r2PrivateList = priv;
          emitMerged();
        }
      } catch (e) {
        console.warn('[Memories] Error loading private R2 photos:', e);
      }
    } else {
      r2PrivateList = [];
      emitMerged();
    }
  };

  // Perform initial fetch
  loadR2Data();

  // Listen for refresh triggers across the app
  const handleRefresh = () => {
    loadR2Data();
  };
  window.addEventListener('sainiverse_refresh_memories', handleRefresh);

  let unsubLegacy = () => {};
  let unsubPublic = () => {};
  let unsubPrivate = () => {};
  let authUnsub = () => {};

  if (isFirebaseConfigured && db) {
    // 1. Legacy collection listener
    try {
      unsubLegacy = onSnapshot(
        collection(db, 'memories'),
        (snapshot) => {
          if (!isMounted) return;
          firestoreLegacyDocs = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          emitMerged();
        },
        (err) => {
          console.warn('[Memories] Legacy memories listener note:', err?.message || err);
        }
      );
    } catch (e) {
      console.warn('[Memories] Could not listen to legacy memories:', e);
    }

    // 2. Public_Memory_Details collection listener
    try {
      unsubPublic = onSnapshot(
        collection(db, 'Public_Memory_Details'),
        (snapshot) => {
          if (!isMounted) return;
          firestorePublicDocs = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            visibility: 'public',
          }));
          emitMerged();
        },
        (err) => {
          console.warn('[Memories] Public_Memory_Details listener note:', err?.message || err);
        }
      );
    } catch (e) {
      console.warn('[Memories] Could not listen to Public_Memory_Details:', e);
    }

    // 3. Private_Memory_Details collection listener
    let currentAuthUid = null;
    const attachPrivateListener = (user) => {
      const newUid = user ? user.uid : null;
      if (newUid === currentAuthUid && unsubPrivate !== null && typeof unsubPrivate === 'function' && unsubPrivate.name !== '') {
        return;
      }
      currentAuthUid = newUid;

      try {
        if (typeof unsubPrivate === 'function') {
          unsubPrivate();
        }
      } catch (e) {
        console.warn('[Memories] Error cleaning up private listener:', e);
      }
      unsubPrivate = () => {};

      if (!isMounted || !user) {
        firestorePrivateDocs = [];
        r2PrivateList = [];
        emitMerged();
        return;
      }

      // Re-fetch private R2 photos on auth change
      loadR2Data();

      try {
        unsubPrivate = onSnapshot(
          collection(db, 'Private_Memory_Details'),
          (snapshot) => {
            if (!isMounted) return;
            firestorePrivateDocs = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              visibility: 'private',
            }));
            emitMerged();
          },
          (err) => {
            console.warn('[Memories] Private_Memory_Details listener note:', err?.message || err);
          }
        );
      } catch (e) {
        console.warn('[Memories] Could not listen to Private_Memory_Details:', e);
      }
    };

    if (auth?.currentUser) {
      attachPrivateListener(auth.currentUser);
    }

    if (auth) {
      try {
        authUnsub = auth.onAuthStateChanged((user) => {
          if (!isMounted) return;
          attachPrivateListener(user);
        });
      } catch (e) {
        console.warn('[Memories] onAuthStateChanged listener note:', e);
      }
    }
  }

  return () => {
    isMounted = false;
    window.removeEventListener('sainiverse_refresh_memories', handleRefresh);
    try {
      if (typeof unsubLegacy === 'function') unsubLegacy();
    } catch (e) {}
    try {
      if (typeof unsubPublic === 'function') unsubPublic();
    } catch (e) {}
    try {
      if (typeof unsubPrivate === 'function') unsubPrivate();
    } catch (e) {}
    try {
      if (typeof authUnsub === 'function') authUnsub();
    } catch (e) {}
  };
}

/**
 * Saves a new memory in sandbox mode
 */
export function saveDemoMemory(memory) {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list = stored ? JSON.parse(stored) : [];
    const updated = [memory, ...list.filter((m) => m.id !== memory.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    triggerMemoriesRefresh();
  } catch (err) {
    console.error('Failed saving demo memory:', err);
  }
}

/**
 * Deletes a memory: removes file from Cloudflare R2 and details from Firebase Firestore
 */
export async function deleteMemory(memory) {
  if (!memory) return;

  if (!auth?.currentUser) {
    throw new Error('Unauthorized: Authentication required to delete memories.');
  }

  // 1. Immediately blacklist this memory in memory and trigger instant sync across UI
  markMemoryAsDeleted(memory);
  triggerMemoriesRefresh();

  const r2Key = (memory.storageKey || memory.storagePath || '').trim();

  // 1. Delete file from Cloudflare R2 bucket
  if (r2Key && !r2Key.startsWith('demo_')) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (auth?.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {
          console.warn('[memoryStorage] Could not retrieve auth token for R2 delete:', e);
        }
      }

      const res = await fetch('/api/delete-file', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: r2Key }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn('[memoryStorage] Cloudflare R2 delete returned non-200:', res.status, errData);
      } else {
        console.log('[memoryStorage] Successfully deleted image from Cloudflare R2:', r2Key);
      }
    } catch (err) {
      console.error('[memoryStorage] Error deleting image from Cloudflare R2:', err);
    }
  }

  // 2. Delete memory details from Firebase Firestore
  if (isFirebaseConfigured && db && memory.id && !memory.id.startsWith('demo_')) {
    // Delete by document ID from partitioned collections
    try {
      await deleteDoc(doc(db, 'Private_Memory_Details', memory.id));
    } catch (e) {}

    try {
      await deleteDoc(doc(db, 'Public_Memory_Details', memory.id));
    } catch (e) {}

    // Delete from legacy memories collection
    try {
      await deleteDoc(doc(db, 'memories', memory.id));
    } catch (e) {}

    // Also query and delete by storageKey in case document ID differed from memory.id
    if (r2Key) {
      try {
        const qPriv = query(collection(db, 'Private_Memory_Details'), where('storageKey', '==', r2Key));
        const snapPriv = await getDocs(qPriv);
        for (const d of snapPriv.docs) {
          await deleteDoc(d.ref);
          console.log('[memoryStorage] Deleted Private_Memory_Details doc by storageKey:', d.id);
        }
      } catch (e) {}

      try {
        const qPub = query(collection(db, 'Public_Memory_Details'), where('storageKey', '==', r2Key));
        const snapPub = await getDocs(qPub);
        for (const d of snapPub.docs) {
          await deleteDoc(d.ref);
          console.log('[memoryStorage] Deleted Public_Memory_Details doc by storageKey:', d.id);
        }
      } catch (e) {}
    }

    // 3. Delete from legacy Firebase Storage if present
    if (storage && memory.storagePath && !memory.storageKey) {
      try {
        const fileRef = ref(storage, memory.storagePath);
        await deleteObject(fileRef);
      } catch (e) {
        console.warn('Storage file deletion note:', e.message);
      }
    }
  }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const list = JSON.parse(stored);
        const filtered = list.filter((m) => m.id !== memory.id && m.storageKey !== r2Key);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (err) {
      console.error('Failed deleting demo memory:', err);
    }

    // Record action in Activity Logs
    try {
      const email = auth?.currentUser?.email || '';
      const name = email.toLowerCase().includes('saini') ? 'Saini' : 'Jit';
      const isPriv = isPrivateMemory(memory);

      await logVaultAction({
        action: 'delete',
        type: 'image',
        title: memory.caption || memory.fileName || 'Memory Photo',
        category: isPriv ? 'private' : 'public',
        details: {
          id: memory.id,
          storageKey: r2Key,
          tag: memory.tag,
          fileName: memory.fileName,
        },
        userEmail: email,
        userName: name,
      });
    } catch (logErr) {
      console.warn('[memoryStorage] Notice logging delete action:', logErr);
    }

    // 5. Trigger application-wide refresh
  triggerMemoriesRefresh();
}
