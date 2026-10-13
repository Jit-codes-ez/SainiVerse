import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../firebase';

const LOCAL_STORAGE_LOGS_KEY = 'sainiverse_activity_logs';

/**
 * Determine the user name ('Jit' | 'Saini') based on provided email or auth state
 */
export function resolveLogUserName(email = '', name = '') {
  if (name && name !== 'Partner' && name !== 'Her' && name !== 'Vault') {
    return name;
  }
  const cleanEmail = (email || auth?.currentUser?.email || '').toLowerCase();
  if (cleanEmail.includes('saini')) return 'Saini';
  return 'Jit';
}

/**
 * Log a user action (added/deleted image or song) to Firestore `Activity_Logs`
 * @param {Object} params
 * @param {'add' | 'delete'} params.action - The action performed
 * @param {'image' | 'song'} params.type - The resource type
 * @param {string} params.title - Name, caption, or title of the item
 * @param {'public' | 'private' | 'music'} [params.category] - Category/visibility
 * @param {Object} [params.details] - Optional extra metadata (e.g., artist, tag, storageKey)
 * @param {string} [params.userEmail] - Email of the actor
 * @param {string} [params.userName] - Display name ('Jit' | 'Saini')
 */
export async function logVaultAction({
  action = 'add',
  type = 'image',
  title = '',
  category = 'vault',
  details = {},
  userEmail = '',
  userName = '',
}) {
  const currentEmail = userEmail || auth?.currentUser?.email || 'vault.couple@sainiverse.internal';
  const resolvedName = resolveLogUserName(currentEmail, userName);
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const logEntry = {
    id: logId,
    action, // 'add' | 'delete'
    type, // 'image' | 'song'
    title: (title || (type === 'song' ? 'Untitled Melody' : 'Untitled Photo')).trim(),
    category, // 'public' | 'private' | 'music'
    userName: resolvedName,
    userEmail: currentEmail,
    details: details || {},
    timestamp: nowIso,
  };

  // 1. Always store to local cache as immediate sync
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [logEntry, ...existing.filter((item) => item.id !== logId)].slice(0, 100);
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sainiverse_refresh_activity_logs'));
    }
  } catch (e) {
    console.warn('[activityLogger] Local cache update notice:', e);
  }

  // 2. Persist to Firestore `Activity_Logs`
  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      const docRef = doc(db, 'Activity_Logs', logId);
      await setDoc(docRef, {
        ...logEntry,
        createdAt: serverTimestamp(),
      });
      console.log('[activityLogger] Action logged in Firestore Activity_Logs:', logEntry);
    } catch (fsErr) {
      console.warn('[activityLogger] Notice writing to Activity_Logs:', fsErr.message);
    }
  }

  return logEntry;
}

/**
 * Real-time subscription to `Activity_Logs`
 * @param {Function} callback - invoked with sorted array of log items
 * @returns {Function} unsubscribe function
 */
export function subscribeActivityLogs(callback) {
  let isMounted = true;
  let firestoreLogs = [];

  const emit = () => {
    if (!isMounted) return;

    // Read local cache
    let localLogs = [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (raw) localLogs = JSON.parse(raw);
    } catch {}

    // Merge Firestore and local logs uniquely by ID
    const logMap = new Map();
    localLogs.forEach((l) => {
      if (l.id) logMap.set(l.id, l);
    });
    firestoreLogs.forEach((l) => {
      if (l.id) logMap.set(l.id, l);
    });

    const sorted = Array.from(logMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt?.toDate?.() || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt?.toDate?.() || 0).getTime();
      return timeB - timeA;
    });

    callback(sorted);
  };

  // Immediate emit from local cache
  emit();

  const handleRefresh = () => emit();
  if (typeof window !== 'undefined') {
    window.addEventListener('sainiverse_refresh_activity_logs', handleRefresh);
  }

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'Activity_Logs'),
        (snapshot) => {
          if (!isMounted) return;
          firestoreLogs = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          emit();
        },
        (err) => {
          console.warn('[activityLogger] Activity_Logs subscription notice:', err.message);
        }
      );
    } catch (e) {
      console.warn('[activityLogger] Listener error:', e);
    }
  }

  return () => {
    isMounted = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('sainiverse_refresh_activity_logs', handleRefresh);
    }
    if (typeof unsubFirestore === 'function') {
      try {
        unsubFirestore();
      } catch {}
    }
  };
}

/**
 * Clear all logs (couple only)
 */
export async function clearAllActivityLogs() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
  } catch {}

  if (isFirebaseConfigured && db && auth?.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'Activity_Logs'));
      for (const d of snap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch (e) {
      console.warn('[activityLogger] Clear notice:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sainiverse_refresh_activity_logs'));
  }
}
