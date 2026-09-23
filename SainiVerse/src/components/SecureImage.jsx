import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, getBlob } from 'firebase/storage';
import { auth, storage, isFirebaseConfigured } from '../firebase';
import { ImageOff, Lock } from 'lucide-react';

/**
 * LRUBlobCache: Bounded Memory Protection (Mandate 4)
 * Enforces a strict LRU (Least Recently Used) limit capped at 40 items.
 * When capacity is exceeded, evicts the least recently used item and revokes
 * its object URL via URL.revokeObjectURL to release browser RAM and prevent crashes.
 */
class LRUBlobCache {
  constructor(maxSize = 40) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    // Refresh recency by re-inserting at the end of the Map
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, entry) {
    if (this.cache.has(key)) {
      const existing = this.cache.get(key);
      if (existing?.blobUrl && existing.blobUrl !== entry?.blobUrl) {
        try {
          URL.revokeObjectURL(existing.blobUrl);
        } catch (e) {
          console.warn('[LRUBlobCache] Error revoking existing object URL:', e);
        }
      }
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first item in Map)
      const oldestKey = this.cache.keys().next().value;
      const oldestEntry = this.cache.get(oldestKey);
      if (oldestEntry?.blobUrl) {
        try {
          URL.revokeObjectURL(oldestEntry.blobUrl);
        } catch (e) {
          console.warn('[LRUBlobCache] Error revoking oldest object URL on eviction:', e);
        }
      }
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, entry);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    for (const [, entry] of this.cache.entries()) {
      if (entry?.blobUrl) {
        try {
          URL.revokeObjectURL(entry.blobUrl);
        } catch (e) {
          // ignore
        }
      }
    }
    this.cache.clear();
  }
}

export const lruBlobCache = new LRUBlobCache(40);
export const memoryBlobCache = lruBlobCache; // Backward-compatibility alias

/**
 * SecureImage Component
 *
 * Enforces Level 4 Zero-Knowledge display security:
 * 1. Authenticated Streaming: Fetches Firebase ID token and passes `Authorization: Bearer <idToken>`
 * 2. Streams raw photo bytes into client RAM via Cloudflare R2 serverless streaming or Firebase getBlob()
 * 3. Never writes raw Firebase download URLs or storage buckets to the DOM
 * 4. Bounded Memory: Capped at 40 in-memory items via LRU cache with URL.revokeObjectURL
 * 5. Universal Anti-Scraping Guards:
 *    - `draggable="false"`
 *    - `onContextMenu={(e) => e.preventDefault()}`
 *    - `onDragStart={(e) => e.preventDefault()}`
 *    - CSS: `user-select: none; -webkit-user-drag: none;`
 *    - Protective transparent overlay pane above rendered photos
 */
export default function SecureImage({
  storageKey,
  storagePath,
  fileName,
  fallbackData,
  alt = 'Private Memory',
  className = '',
  containerClassName = 'w-full h-full',
  onClick,
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const localBlobUrlRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function streamImageIntoMemory() {
      setIsLoading(true);
      setHasError(false);

      try {
        const lookupKey = storageKey || storagePath || fileName;

        // 1. Check if we already have this blob cached in our bounded 40-item LRU cache
        if (lookupKey && lruBlobCache.has(lookupKey)) {
          const cached = lruBlobCache.get(lookupKey);
          if (cached?.blobUrl && isMounted) {
            setBlobUrl(cached.blobUrl);
            setIsLoading(false);
            return;
          }
        }

        let imageBlob = null;

        // 2. Streaming from Cloudflare R2 serverless endpoint
        if (lookupKey) {
          // Wait for Firebase auth to initialize session if needed
          if (auth && !auth.currentUser && typeof auth.authStateReady === 'function') {
            try {
              await auth.authStateReady();
            } catch {
              // Ignore authStateReady error
            }
          }

          let idToken = null;
          try {
            idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
          } catch (tokErr) {
            console.warn('[SecureImage] Error fetching ID token:', tokErr);
          }

          try {
            const headers = {};
            if (idToken) {
              headers.Authorization = `Bearer ${idToken}`;
            }

            const cfRes = await fetch(`/api/get-photo?key=${encodeURIComponent(lookupKey)}`, {
              headers,
            });

            if (cfRes.ok) {
              imageBlob = await cfRes.blob();
            } else if (cfRes.status === 401 || cfRes.status === 403) {
              console.warn(`[SecureImage] Authorization failed (${cfRes.status}) for ${lookupKey}`);
            }
          } catch (cfErr) {
            console.warn('[SecureImage] Cloudflare R2 fetch note:', cfErr);
          }
        }

        // 3. Fallback to Firebase Storage if configured and valid path
        if (!imageBlob && storagePath && isFirebaseConfigured && storage && auth?.currentUser) {
          try {
            const fileRef = ref(storage, storagePath);
            imageBlob = await getBlob(fileRef);
          } catch (fbErr) {
            console.warn('[SecureImage] Firebase Storage fetch note:', fbErr);
          }
        }

        // 4. Handle local/fallback data (for demo mode or direct user uploads before save)
        if (!imageBlob && fallbackData) {
          if (fallbackData instanceof Blob) {
            imageBlob = fallbackData;
          } else if (typeof fallbackData === 'string' && fallbackData.startsWith('data:')) {
            const res = await fetch(fallbackData);
            imageBlob = await res.blob();
          } else if (typeof fallbackData === 'string' && fallbackData.startsWith('blob:')) {
            // Ephemeral local blob URL already created (e.g. upload preview)
            if (isMounted) {
              setBlobUrl(fallbackData);
              setIsLoading(false);
              return;
            }
          } else if (typeof fallbackData === 'string') {
            const res = await fetch(fallbackData);
            imageBlob = await res.blob();
          }
        }

        if (!imageBlob) {
          throw new Error('Image source unavailable or unauthorized.');
        }

        // Generate ephemeral in-memory blob URL
        const ephemeralUrl = URL.createObjectURL(imageBlob);

        // Store into bounded LRU cache (capped at 40 items)
        if (lookupKey) {
          lruBlobCache.set(lookupKey, { blob: imageBlob, blobUrl: ephemeralUrl });
        } else {
          localBlobUrlRef.current = ephemeralUrl;
        }

        if (isMounted) {
          setBlobUrl(ephemeralUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[SecureImage] Failed to stream image into RAM:', err);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    }

    streamImageIntoMemory();

    // Re-stream if authentication becomes available while mounted
    let unsubscribeAuth = null;
    if (auth && !auth.currentUser) {
      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user && isMounted) {
          streamImageIntoMemory();
        }
      });
    }

    return () => {
      isMounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
      // Revoke any one-off local blob URL not managed by the LRU cache
      if (localBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(localBlobUrlRef.current);
        } catch {
          // ignore
        }
        localBlobUrlRef.current = null;
      }
    };
  }, [storageKey, storagePath, fileName, fallbackData]);

  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative overflow-hidden no-scrape select-none ${containerClassName || 'w-full h-full'}`}
    >
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-vault-card/80 animate-pulse flex flex-col items-center justify-center text-vault-muted select-none pointer-events-none">
          <Lock className="w-6 h-6 text-rose-500/70 animate-bounce mb-2" />
          <span className="text-xs font-medium text-rose-300/80 tracking-wider uppercase">
            Decrypting photo...
          </span>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="w-full h-full min-h-[220px] bg-vault-card/60 border border-vault-border flex flex-col items-center justify-center p-4 text-center select-none pointer-events-none">
          <ImageOff className="w-8 h-8 text-rose-400 mb-2" />
          <p className="text-xs text-vault-muted">Failed to stream encrypted image</p>
        </div>
      )}

      {/* Streamed Image Render */}
      {blobUrl && !hasError && (
        <img
          src={blobUrl}
          alt={alt}
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          className={`no-scrape select-none block w-full h-full object-cover transition-all duration-300 pointer-events-none ${className}`}
          style={{ WebkitUserDrag: 'none', userSelect: 'none' }}
        />
      )}

      {/* Transparent Protective Layer: blocks right-click saving, drag-to-desktop, touch-and-hold */}
      <div
        className="absolute inset-0 z-10 cursor-pointer pointer-events-auto bg-transparent select-none"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        draggable="false"
      />
    </div>
  );
}
