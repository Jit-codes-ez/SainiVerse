import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../firebase';
import { logVaultAction } from './activityLogger';

/**
 * Trigger an application-wide music re-sync event
 */
export function triggerMusicRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sainiverse_refresh_music'));
  }
}

// Session cache of deleted song identifiers to avoid CDN / propagation lag
const deletedSongKeys = new Set();

export function markSongAsDeleted(songOrId, optionalStorageKey) {
  if (!songOrId) return;
  if (typeof songOrId === 'string') {
    deletedSongKeys.add(String(songOrId));
  } else {
    if (songOrId.id) deletedSongKeys.add(String(songOrId.id));
    if (songOrId.storageKey) deletedSongKeys.add(String(songOrId.storageKey));
    if (songOrId.fileName) deletedSongKeys.add(String(songOrId.fileName));
  }
  if (optionalStorageKey) deletedSongKeys.add(String(optionalStorageKey));
}

export function isSongDeleted(item) {
  if (!item) return false;
  if (item.id && deletedSongKeys.has(String(item.id))) return true;
  if (item.storageKey && deletedSongKeys.has(String(item.storageKey))) return true;
  if (item.fileName && deletedSongKeys.has(String(item.fileName))) return true;
  return false;
}

/**
 * Fetch all music files directly from Cloudflare R2 bucket (`Music/` and `Navbar_Music/`)
 * @returns {Promise<Array<any>>}
 */
export async function fetchR2Songs() {
  try {
    const res = await fetch(`/api/list-music?_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[musicStorage] Could not list R2 music:', res.status);
      return [];
    }
    const data = await res.json();
    const songs = Array.isArray(data.songs) ? data.songs : [];
    return songs.filter((s) => !isSongDeleted(s));
  } catch (err) {
    console.warn('[musicStorage] Error fetching R2 songs:', err.message);
    return [];
  }
}

/**
 * Real-time subscription to Music collection in Firestore, merged with Cloudflare R2 storage
 * @param {Function} callback - invoked with merged array of songs
 * @returns {Function} unsubscribe function
 */
export function subscribeMusic(callback) {
  let isMounted = true;
  let r2Songs = [];
  let firestoreSongs = [];

  const emitMerged = () => {
    if (!isMounted) return;

    // Index firestore metadata by storageKey, storagePath, id, and fileName
    const firestoreByKey = new Map();
    firestoreSongs.forEach((song) => {
      if (song.storageKey) firestoreByKey.set(song.storageKey, song);
      if (song.storagePath) firestoreByKey.set(song.storagePath, song);
      if (song.id) firestoreByKey.set(song.id, song);
      if (song.fileName) firestoreByKey.set(song.fileName, song);
    });

    const findSongMetadata = (r2) => {
      if (!r2) return {};
      if (r2.storageKey && firestoreByKey.has(r2.storageKey)) return firestoreByKey.get(r2.storageKey);
      if (r2.fileName && firestoreByKey.has(r2.fileName)) return firestoreByKey.get(r2.fileName);
      if (r2.id && firestoreByKey.has(r2.id)) return firestoreByKey.get(r2.id);

      const normR2Key = (r2.storageKey || '').toLowerCase().replace(/_/g, ' ').replace(/^\/+/, '');
      const r2Uuid = (r2.storageKey || '').match(/[a-f0-9-]{36}/i)?.[0]?.toLowerCase();

      for (const f of firestoreSongs) {
        const normFKey = (f.storageKey || f.storagePath || '').toLowerCase().replace(/_/g, ' ').replace(/^\/+/, '');
        if (normFKey && normFKey === normR2Key) return f;

        // Match by UUID (stripping 'music_' prefix from Firestore doc id)
        const fUuid = (f.id || '').replace(/^music_/, '').toLowerCase();
        if (fUuid && (normR2Key.includes(fUuid) || (r2Uuid && r2Uuid === fUuid))) return f;

        // Match by normalized filename (e.g. 'Majhe Majhe Tobo.mp3' vs 'Majhe_Majhe_Tobo.mp3')
        const fNormName = (f.fileName || '').toLowerCase().replace(/_/g, ' ');
        const r2NormName = (r2.fileName || '').toLowerCase().replace(/_/g, ' ');
        if (fNormName && r2NormName && (fNormName === r2NormName || normR2Key.endsWith(fNormName))) return f;

        // Match by normalized title
        const fNormTitle = (f.title || '').toLowerCase().replace(/_/g, ' ').trim();
        const r2NormTitle = (r2.title || '').toLowerCase().replace(/_/g, ' ').trim();
        if (fNormTitle && r2NormTitle && fNormTitle === r2NormTitle) return f;
      }
      return {};
    };

    // Merge R2 songs with any matching Firestore metadata
    const mergedList = [];
    const matchedFirestoreIds = new Set();

    r2Songs.forEach((r2Item) => {
      if (isSongDeleted(r2Item)) return;
      const metadata = findSongMetadata(r2Item);
      if (metadata.id) matchedFirestoreIds.add(metadata.id);

      const rawUploader = (metadata.uploaderName || r2Item.uploaderName || '').trim();
      const email = (metadata.uploaderEmail || '').toLowerCase();
      let finalUploader = 'Jit';
      if (rawUploader && rawUploader !== 'Partner' && rawUploader !== 'Her' && rawUploader !== 'Vault') {
        finalUploader = rawUploader;
      } else if (email.includes('saini')) {
        finalUploader = 'Saini';
      } else if (email.includes('jit')) {
        finalUploader = 'Jit';
      }

      mergedList.push({
        id: metadata.id || r2Item.id,
        title: metadata.title || r2Item.title,
        artist: metadata.artist || (r2Item.artist && r2Item.artist !== 'Vault Melody' ? r2Item.artist : '') || '',
        dedication: metadata.dedication || r2Item.dedication || 'Our celestial melody in endless orbit',
        uploaderName: finalUploader,
        uploaderEmail: metadata.uploaderEmail || (finalUploader === 'Jit' ? 'hers.jit@gmail.com' : 'his.saini.gulu@gmail.com'),
        storageKey: r2Item.storageKey,
        fileName: r2Item.fileName,
        size: r2Item.size,
        duration: metadata.duration || null,
        createdAt: metadata.createdAt || r2Item.lastModified,
        url: r2Item.url || `/api/get-music?key=${encodeURIComponent(r2Item.storageKey)}`,
        isR2: true,
      });
    });

    // Also include any Firestore songs that weren't matched in R2 if they belong to Music/
    firestoreSongs.forEach((fSong) => {
      if (isSongDeleted(fSong)) return;
      if (!matchedFirestoreIds.has(fSong.id) && fSong.storageKey?.startsWith('Music/')) {
        const rawUploader = (fSong.uploaderName || '').trim();
        const email = (fSong.uploaderEmail || '').toLowerCase();
        let finalUploader = 'Jit';
        if (rawUploader && rawUploader !== 'Partner' && rawUploader !== 'Her') {
          finalUploader = rawUploader;
        } else if (email.includes('saini')) {
          finalUploader = 'Saini';
        }

        mergedList.push({
          ...fSong,
          uploaderName: finalUploader,
          url: `/api/get-music?key=${encodeURIComponent(fSong.storageKey)}`,
        });
      }
    });

    // Sort newest first
    mergedList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    callback(mergedList);
  };

  const loadR2 = async () => {
    try {
      const [list, fsMusicSnap] = await Promise.all([
        fetchR2Songs(),
        isFirebaseConfigured && db
          ? getDocs(collection(db, 'Music_Details')).catch((err) => {
              console.warn('[musicStorage] Firestore Music_Details query notice:', err.message);
              return null;
            })
          : null,
      ]);
      if (isMounted) {
        r2Songs = list;
        if (fsMusicSnap && Array.isArray(fsMusicSnap.docs) && fsMusicSnap.docs.length > 0) {
          firestoreSongs = fsMusicSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
        }
        emitMerged();
      }
    } catch (e) {
      console.warn('[musicStorage] Error loading songs:', e);
    }
  };

  // Initial load
  loadR2();

  // App-wide refresh listener
  const handleRefresh = () => {
    loadR2();
  };
  window.addEventListener('sainiverse_refresh_music', handleRefresh);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'Music_Details'),
        (snapshot) => {
          if (!isMounted) return;
          firestoreSongs = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          emitMerged();
        },
        (err) => {
          console.warn('[musicStorage] Firestore Music_Details listener notice:', err.message);
          if (err.code === 'permission-denied') {
            console.error(
              '[musicStorage] Firestore permission denied for "Music_Details". Ensure `match /Music_Details/{songId} { allow read: if true; }` is published in Firebase Console -> Firestore Database -> Rules.'
            );
          }
        }
      );
    } catch (e) {
      console.warn('[musicStorage] Could not attach Music_Details listener:', e);
    }
  }

  return () => {
    isMounted = false;
    window.removeEventListener('sainiverse_refresh_music', handleRefresh);
    if (typeof unsubFirestore === 'function') {
      try {
        unsubFirestore();
      } catch (err) {
        // ignore
      }
    }
  };
}

/**
 * Upload an audio file directly to Cloudflare R2's `Music/` folder and save metadata to Firestore `Music_Details`
 */
export async function uploadMusicToR2AndFirestore({
  file,
  title,
  artist,
  dedication,
  uploaderName,
  duration = null,
  onProgress = () => {},
}) {
  if (!file) throw new Error('No audio file provided.');

  // 1. Get Firebase ID token for Authorization header
  let idToken = null;
  if (auth?.currentUser) {
    try {
      idToken = await auth.currentUser.getIdToken(true);
    } catch (tokErr) {
      console.warn('[musicStorage] Failed to refresh ID token:', tokErr);
    }
  }

  if (!idToken) {
    throw new Error('Authentication required: Please log in with an authorized couple account.');
  }

  onProgress(10);

  // 2. Request presigned upload PUT URL from Cloudflare R2
  const presignRes = await fetch('/api/get-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      folder: 'Music',
      filename: file.name,
      contentType: file.type || 'audio/mpeg',
    }),
  });

  if (!presignRes.ok) {
    const errorJson = await presignRes.json().catch(() => ({}));
    throw new Error(errorJson.error || `Failed to generate upload URL (${presignRes.status}).`);
  }

  const { uploadUrl, key, uniqueId } = await presignRes.json();
  if (!uploadUrl || !key) {
    throw new Error('Invalid presigned URL returned from server.');
  }

  onProgress(25);

  // 3. Direct client-to-R2 upload with progress tracking
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 60);
        onProgress(25 + percent); // 25% -> 85%
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Cloudflare R2 rejected upload with status ${xhr.status}.`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload to Cloudflare R2.'));
    xhr.send(file);
  });

  onProgress(90);

  // 4. Index song metadata in Firestore `Music_Details`
  const songId = `music_${uniqueId || Date.now()}`;
  const songMetadata = {
    id: songId,
    title: (title || file.name.replace(/\.[^/.]+$/, '')).trim(),
    artist: (artist || '').trim(),
    dedication: (dedication || 'For Saini & Jit').trim(),
    uploaderName: uploaderName && uploaderName !== 'Partner' ? uploaderName : (auth.currentUser?.email?.toLowerCase().includes('saini') ? 'Saini' : 'Jit'),
    uploaderEmail: auth.currentUser?.email || '',
    storageKey: key,
    fileName: file.name,
    size: file.size,
    contentType: file.type || 'audio/mpeg',
    duration: duration || null,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const songDocRef = doc(db, 'Music_Details', songId);
      await setDoc(songDocRef, songMetadata);
      console.log('[musicStorage] Indexed song metadata in Firestore Music_Details:', songDocRef.path);
    } catch (fsErr) {
      console.error('[musicStorage] Error saving song to Firestore:', fsErr);
    }
  }

  // Record action in Activity Logs
  try {
    await logVaultAction({
      action: 'add',
      type: 'song',
      title: songMetadata.title,
      category: 'music',
      details: {
        artist: songMetadata.artist,
        fileName: songMetadata.fileName,
        size: songMetadata.size,
      },
      userEmail: songMetadata.uploaderEmail,
      userName: songMetadata.uploaderName,
    });
  } catch (logErr) {
    console.warn('[musicStorage] Notice logging upload action:', logErr);
  }

  onProgress(100);
  triggerMusicRefresh();
  return songMetadata;
}

/**
 * Delete song: deletes both the audio file from Cloudflare R2 and details from Firestore Music_Details
 * @param {string | Object} songOrId - Song object or song document ID
 * @param {string} [optionalStorageKey] - Optional R2 object key if songOrId is a string
 */
export async function deleteSongFromFirestore(songOrId, optionalStorageKey) {
  if (!songOrId) return;

  if (!auth?.currentUser) {
    throw new Error('Unauthorized: Authentication required to delete songs.');
  }

  // Immediately record as deleted in session blacklist and fire UI refresh
  markSongAsDeleted(songOrId, optionalStorageKey);
  triggerMusicRefresh();

  const songId = typeof songOrId === 'string' ? songOrId : songOrId?.id;
  let storageKey = typeof songOrId === 'object' ? songOrId?.storageKey : optionalStorageKey;

  // 1. If storageKey is missing and songId is provided, attempt to look up document in Firestore first
  if (!storageKey && songId && isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'Music_Details', songId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        storageKey = snap.data()?.storageKey;
      }
    } catch (e) {
      console.warn('[musicStorage] Could not fetch song doc for storageKey:', e);
    }
  }

  // 2. Delete the audio file from Cloudflare R2 if storageKey is present
  if (storageKey && storageKey.startsWith('Music/')) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (auth?.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {
          console.warn('[musicStorage] Could not get auth token for R2 delete:', e);
        }
      }

      const res = await fetch('/api/delete-file', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: storageKey }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[musicStorage] Cloudflare R2 delete returned non-200:', res.status, errJson);
      } else {
        console.log('[musicStorage] Successfully deleted song file from Cloudflare R2:', storageKey);
      }
    } catch (r2Err) {
      console.error('[musicStorage] Error deleting song from Cloudflare R2:', r2Err);
    }
  }

  // 3. Delete song metadata details from Firestore Music_Details
  if (isFirebaseConfigured && db) {
    if (songId) {
      try {
        const songDocRef = doc(db, 'Music_Details', songId);
        await deleteDoc(songDocRef);
        console.log('[musicStorage] Deleted song document from Firestore:', songId);
      } catch (err) {
        console.warn('[musicStorage] Note deleting song doc by ID:', err);
      }
    }

    // Also query and delete by storageKey in case ID was different
    if (storageKey) {
      try {
        const q = query(collection(db, 'Music_Details'), where('storageKey', '==', storageKey));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
          console.log('[musicStorage] Deleted matched Firestore doc by storageKey:', d.id);
        }
      } catch (err) {
        console.warn('[musicStorage] Note cleaning Music_Details by storageKey:', err);
      }
    }
  }

  // Record action in Activity Logs
  try {
    const songName =
      (typeof songOrId === 'object' ? songOrId?.title : null) ||
      (storageKey ? storageKey.split('/').pop().replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : null) ||
      songId;

    const email = auth?.currentUser?.email || '';
    const name = email.toLowerCase().includes('saini') ? 'Saini' : 'Jit';

    await logVaultAction({
      action: 'delete',
      type: 'song',
      title: songName,
      category: 'music',
      details: {
        id: songId,
        storageKey: storageKey,
      },
      userEmail: email,
      userName: name,
    });
  } catch (logErr) {
    console.warn('[musicStorage] Notice logging delete action:', logErr);
  }

  // 4. Trigger application-wide refresh
  triggerMusicRefresh();
}

export const deleteSong = deleteSongFromFirestore;

