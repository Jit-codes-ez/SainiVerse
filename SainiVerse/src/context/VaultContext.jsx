import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToMemories, saveDemoMemory, deleteMemory } from '../utils/memoryStorage';
import { isFirebaseConfigured } from '../firebase';
import { checkSpecialOccasion } from '../utils/specialDates';

const VaultContext = createContext(null);
const STORAGE_KEYS = {
  VISITOR_ROLE: 'sainiverse_visitor_role',
  HAS_VISITED: 'sainiverse_has_visited',
};
const DEFAULT_ROLE = 'girlfriend';

export const defaultCoupleUser = {
  email: 'jith@sainiverse.internal',
  displayName: 'Jith & Her',
  uid: 'couple_vault_admin',
};

/**
 * Determines whether the opening modals (WelcomeModal & SpecialOccasionModal) should display.
 * - Always shows on the user's first time visit to the site.
 * - On page refresh/reload, strictly shows ONLY on Home page ('/').
 * - On other pages (/countdown, /music, /memories, etc.), page refresh will NOT show the opening modals.
 */
function checkShouldShowEntryPopup() {
  if (typeof window === 'undefined') return false;

  // Determine current route path
  const rawPath = window.location.pathname || '';
  const cleanPath = rawPath.replace(/\/+$/, '');
  const isHomePage = cleanPath === '' || cleanPath === '/';

  // Check if current action is a page refresh / reload
  let isPageReload = false;
  try {
    const navEntries = performance.getEntriesByType?.('navigation');
    if (navEntries && navEntries.length > 0) {
      isPageReload = navEntries[0].type === 'reload';
    } else if (window.performance?.navigation) {
      isPageReload = window.performance.navigation.type === 1; // TYPE_RELOAD
    }
  } catch {
    isPageReload = false;
  }

  // Check if visitor has visited the site before
  let hasVisitedBefore = false;
  try {
    hasVisitedBefore = Boolean(
      localStorage.getItem(STORAGE_KEYS.HAS_VISITED) ||
      sessionStorage.getItem('sainiverse_session_active')
    );
  } catch {
    hasVisitedBefore = false;
  }

  // Rule 1: If on a page refresh/reload:
  // ONLY show on Home page ('/'). On other pages, do NOT show.
  if (isPageReload) {
    return isHomePage;
  }

  // Rule 2: If first time visiting the site (new visitor):
  // Always show opening modals to welcome the visitor.
  if (!hasVisitedBefore) {
    return true;
  }

  // Rule 3: For returning visits, show if landing on Home page
  return isHomePage;
}

export function VaultProvider({ children, user = defaultCoupleUser }) {
  const [initialShouldShow] = useState(() => checkShouldShowEntryPopup());
  const [memories, setMemories] = useState([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [notification, setNotification] = useState('');
  const [showEntryPopup, setShowEntryPopup] = useState(initialShouldShow);
  const [activeOccasion, setActiveOccasion] = useState(null);

  const toastTimerRef = useRef(null);

  // Visitor Role State (girlfriend | guest)
  const [visitorRole, setVisitorRole] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.VISITOR_ROLE) || DEFAULT_ROLE;
    } catch {
      return DEFAULT_ROLE;
    }
  });

  // Toast notifications with cleanup
  const showNotification = useCallback((message, duration = 3500) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setNotification(message);
    toastTimerRef.current = setTimeout(() => {
      setNotification('');
      toastTimerRef.current = null;
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Real-time synchronization of memories
  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToMemories((items) => {
        if (!isMounted) return;
        setMemories(items || []);
        setIsLoadingMemories(false);
      });
    } catch (err) {
      console.error('Failed to attach memory subscription:', err);
    }

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (e) {
          console.warn('Error during memory subscription teardown:', e);
        }
      }
    };
  }, []);

  // Switch perspective between girlfriend & guest
  const toggleRole = useCallback(() => {
    const nextRole = visitorRole === 'girlfriend' ? 'guest' : 'girlfriend';
    setVisitorRole(nextRole);
    try {
      sessionStorage.setItem(STORAGE_KEYS.VISITOR_ROLE, nextRole);
    } catch (err) {
      console.warn('Could not persist role in storage:', err);
    }
    showNotification(
      nextRole === 'girlfriend'
        ? 'Switched to Girlfriend Perspective 💕'
        : 'Switched to Guest / Friend Perspective 🥂',
      3000
    );
  }, [visitorRole, showNotification]);

  // Memory upload completion
  const handleUploadSuccess = useCallback(
    (newMemory) => {
      if (!isFirebaseConfigured) {
        saveDemoMemory(newMemory);
      }
      showNotification('Memory successfully sanitized & sealed in the vault!', 4000);
    },
    [showNotification]
  );

  // Memory deletion
  const handleDeleteMemory = useCallback(
    async (memory) => {
      if (!memory) return;

      const memId = memory.id;
      const memKey = memory.storageKey || memory.storagePath;
      const memName = memory.fileName;

      // 1. Optimistic instant removal from React state: vanishes from feed at 0ms latency
      setMemories((current) =>
        (current || []).filter((m) => {
          if (memId && m.id === memId) return false;
          if (memKey && (m.storageKey === memKey || m.storagePath === memKey)) return false;
          if (memName && m.fileName === memName) return false;
          return true;
        })
      );
      setSelectedMemory(null);

      // 2. Perform async deletion from Cloudflare R2 & Firebase Firestore
      try {
        await deleteMemory(memory);
        showNotification('Memory permanently deleted from the vault.', 3000);
      } catch (err) {
        console.error('Delete error:', err);
        showNotification('Failed to delete memory. Please try again.', 4000);
      }
    },
    [showNotification]
  );

  const hasSeenOccasionRef = useRef(!initialShouldShow);

  // Dismiss entry popup and check for occasion
  const handleDismissEntry = useCallback(() => {
    setShowEntryPopup(false);
    try {
      localStorage.setItem(STORAGE_KEYS.HAS_VISITED, 'true');
      sessionStorage.setItem('sainiverse_session_active', 'true');
    } catch {
      // Ignore storage errors
    }

    const occasion = checkSpecialOccasion();
    if (occasion) {
      setTimeout(() => {
        hasSeenOccasionRef.current = true;
        setActiveOccasion(occasion);
      }, 120);
    } else {
      hasSeenOccasionRef.current = true;
    }
  }, []);

  // Secondary occasion check if entry popup was already dismissed
  // Only runs if opening modals were originally active for this visit/refresh
  useEffect(() => {
    if (initialShouldShow && !showEntryPopup && !hasSeenOccasionRef.current && !activeOccasion) {
      const occasion = checkSpecialOccasion();
      if (occasion) {
        hasSeenOccasionRef.current = true;
        setActiveOccasion(occasion);
      }
    }
  }, [initialShouldShow, showEntryPopup, activeOccasion]);

  const openOccasion = useCallback((occasionType) => {
    setActiveOccasion(occasionType);
  }, []);

  const closeOccasion = useCallback(() => {
    hasSeenOccasionRef.current = true;
    setActiveOccasion(null);
  }, []);

  return (
    <VaultContext.Provider
      value={{
        user,
        memories,
        isLoadingMemories,
        visitorRole,
        setVisitorRole,
        toggleRole,
        notification,
        showNotification,
        isUploadOpen,
        setIsUploadOpen,
        selectedMemory,
        setSelectedMemory,
        handleUploadSuccess,
        handleDeleteMemory,
        showEntryPopup,
        setShowEntryPopup,
        handleDismissEntry,
        activeOccasion,
        openOccasion,
        closeOccasion,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
