import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useVault } from '../context/VaultContext';
import { useAudio } from '../context/AudioContext';
import { auth, storage, db, isFirebaseConfigured } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { sanitizeImage } from '../utils/sanitizeImage';
import { formatMemoryDate } from '../utils/dateUtils';
import { triggerMemoriesRefresh, isPrivateMemory } from '../utils/memoryStorage';
import { uploadMusicToR2AndFirestore, subscribeMusic, deleteSongFromFirestore } from '../utils/musicStorage';
import Card from '../components/Card';
import CardGlare from '../components/CardGlare';
import SecureImage, { lruBlobCache } from '../components/SecureImage';
import LightboxModal from '../components/LightboxModal';
import {
  Heart,
  Sparkles,
  Camera,
  Music,
  Calendar,
  Lock,
  Unlock,
  Globe,
  ShieldCheck,
  UploadCloud,
  Plus,
  Filter,
  X,
  Play,
  Pause,
  ArrowRight,
  Check,
  Disc,
  FileAudio,
  Trash2,
  Eye,
  Wand2,
  Shuffle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Volume2,
  LogOut,
} from 'lucide-react';

const LOCAL_SONGS_KEY = 'sainiverse_custom_playlist';

export default function PrivateVault() {
  const navigate = useNavigate();
  const { memories, setSelectedMemory, selectedMemory, handleDeleteMemory, showNotification, handleUploadSuccess } = useVault();
  const { isPlaying, toggleMusic } = useAudio();

  // Authentication & Session Guard State
  const [currentUser, setCurrentUser] = useState(() => auth?.currentUser || null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Subscribe to Firebase Auth and enforce unauthenticated protection
  useEffect(() => {
    let isMounted = true;

    if (auth && typeof auth.authStateReady === 'function') {
      auth
        .authStateReady()
        .then(() => {
          if (isMounted) {
            setIsAuthChecking(false);
            if (!auth.currentUser) {
              navigate('/', { replace: true });
            } else {
              setCurrentUser(auth.currentUser);
            }
          }
        })
        .catch(() => {
          if (isMounted) setIsAuthChecking(false);
        });
    } else {
      setIsAuthChecking(false);
    }

    const unsubscribe = auth
      ? onAuthStateChanged(auth, (user) => {
          if (isMounted) {
            setCurrentUser(user);
            setIsAuthChecking(false);
            if (!user) {
              navigate('/', { replace: true });
            }
          }
        })
      : null;

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);

  // Route guard: eject user if unauthenticated
  useEffect(() => {
    if (!isAuthChecking && !currentUser && !auth?.currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, isAuthChecking, navigate]);

  const currentUserEmail = currentUser?.email || auth?.currentUser?.email || 'Couple Sanctuary';

  // Active Gallery Filter ('all' | 'private' | 'public')
  const [galleryTab, setGalleryTab] = useState('all');
  const [selectedTag, setSelectedTag] = useState('All');

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadVisibility, setUploadVisibility] = useState('private'); // 'private' | 'public'
  const [isSongModalOpen, setIsSongModalOpen] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [memoryDate, setMemoryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tag, setTag] = useState('Special Moment');
  const [uploadStep, setUploadStep] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [showCaptionSuggester, setShowCaptionSuggester] = useState(false);
  const [isGeneratingAiCaptions, setIsGeneratingAiCaptions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const fileInputRef = useRef(null);

  // Custom Songs State (strictly synchronized with Music/ in Cloudflare R2 & Firestore Music_Details)
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    const unsub = subscribeMusic((musicList) => {
      setSongs(musicList || []);
    });
    return () => unsub();
  }, []);

  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');
  const [newSongUrl, setNewSongUrl] = useState('');
  const [newSongDedication, setNewSongDedication] = useState('');
  const [selectedSongFile, setSelectedSongFile] = useState(null);
  const [songPreviewUrl, setSongPreviewUrl] = useState(null);
  const [isUploadingSong, setIsUploadingSong] = useState(false);
  const [songUploadProgress, setSongUploadProgress] = useState(0);
  const [songUploadError, setSongUploadError] = useState('');
  const [activePreviewSongId, setActivePreviewSongId] = useState(null);
  const [songToDelete, setSongToDelete] = useState(null);
  const [isDeletingSong, setIsDeletingSong] = useState(false);
  const songFileInputRef = useRef(null);
  const previewAudioRef = useRef(null);

  // Persist custom songs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(songs));
    } catch (err) {
      console.warn('Could not persist songs:', err);
    }
  }, [songs]);

  // Lock body scroll when either modal is open to prevent background jumps & glitches
  useEffect(() => {
    if (isUploadModalOpen || isSongModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isUploadModalOpen, isSongModalOpen]);

  // Statistics (derived from centralized VaultContext memories)
  const stats = useMemo(() => {
    const total = memories.length;
    const privateCount = memories.filter((m) => isPrivateMemory(m)).length;
    const publicCount = total - privateCount;
    return { total, privateCount, publicCount };
  }, [memories]);

  // Filtered Memories for the embedded Gallery
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const isPriv = isPrivateMemory(m);
      if (galleryTab === 'private' && !isPriv) return false;
      if (galleryTab === 'public' && isPriv) return false;
      if (selectedTag !== 'All' && m.tag !== selectedTag) return false;
      return true;
    });
  }, [memories, galleryTab, selectedTag]);

  // Open upload modal with specific visibility
  const handleOpenUpload = (visibility = 'public', openSuggester = false) => {
    setUploadVisibility(visibility);
    setShowCaptionSuggester(openSuggester);
    setUploadError('');
    setIsUploadModalOpen(true);
  };

  // Handle Photo selection
  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WebP, HEIC).');
      return;
    }
    setUploadError('');
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Close Upload Modal
  const handleCloseUploadModal = () => {
    if (uploadStep !== 'idle' && uploadStep !== 'completed') {
      if (!confirm('Upload in progress. Cancel?')) return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setAiSuggestions([]);
    setIsGeneratingAiCaptions(false);
    setUploadStep('idle');
    setUploadProgress(0);
    setUploadError('');
    setIsUploadModalOpen(false);
  };

  // Dynamic Gemini Vision AI Caption Generation
  const handleGenerateAiCaptions = async () => {
    if (!selectedFile) {
      showNotification('Select a photo first so Gemini can see it! ✨', 3500);
      setShowCaptionSuggester(true);
      return;
    }

    setIsGeneratingAiCaptions(true);
    setShowCaptionSuggester(true);

    try {
      // 1. Convert selected file to base64 Data URL
      const base64DataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(selectedFile);
      });

      // 2. Call serverless Gemini endpoint
      const response = await fetch('/api/suggest-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64DataUrl,
          mimeType: selectedFile.type || 'image/jpeg',
        }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
        showNotification('Gemini tailored 4 captions for this memory ✨', 3500);
      } else {
        throw new Error('No suggestions in response payload');
      }
    } catch (err) {
      console.warn('Gemini AI caption generation failed:', err);
      showNotification(err?.message || 'Gemini caption generation failed ✨', 3500);
    } finally {
      setIsGeneratingAiCaptions(false);
    }
  };

  // Random Suggestion Picker (picks from AI generated suggestions)
  const handlePickRandomCaption = () => {
    if (aiSuggestions.length === 0) {
      handleGenerateAiCaptions();
      return;
    }
    const randomPick = aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)];
    setCaption(randomPick);
    showNotification('AI caption applied ✨', 2500);
  };

  // Execute Upload with Partitioned Cloudflare R2 & Dedicated Firestore Collections
  const handleExecuteUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a photo to store in the vault.');
      return;
    }

    try {
      setUploadError('');
      setUploadStep('sanitizing');
      setUploadProgress(15);

      // 1. In-browser EXIF & Geolocation stripping
      const sanitized = await sanitizeImage(selectedFile);
      setUploadStep('uploading');
      setUploadProgress(35);

      // 2. Determine Target Partition & Collection
      const folder = uploadVisibility === 'private' ? 'Private_Memory' : 'Public_Memory';
      const collectionName = uploadVisibility === 'private' ? 'Private_Memory_Details' : 'Public_Memory_Details';

      if (isFirebaseConfigured && auth?.currentUser && db) {
        // 3. Obtain Presigned R2 PUT URL
        const token = await auth.currentUser.getIdToken();
        const urlResponse = await fetch('/api/get-upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            folder,
            filename: sanitized.fileName,
            contentType: 'image/jpeg',
          }),
        });

        if (!urlResponse.ok) {
          const errData = await urlResponse.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to obtain upload URL (${urlResponse.status})`);
        }

        const { uploadUrl, key: fullR2Key, uniqueId } = await urlResponse.json();

        // 4. Direct Client-to-R2 Upload
        setUploadProgress(50);
        const r2UploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/jpeg',
          },
          body: sanitized.blob,
        });

        if (!r2UploadResponse.ok) {
          throw new Error(`Direct R2 upload failed with status ${r2UploadResponse.status}`);
        }

        setUploadStep('indexing');
        setUploadProgress(90);

        // 5. Index in dedicated Firestore collection
        const userEmail = (auth.currentUser.email || currentUserEmail || '').toLowerCase();
        const memoryDoc = {
          id: uniqueId,
          storageKey: fullR2Key,
          storagePath: fullR2Key, // Compatibility
          fileName: sanitized.fileName,
          caption: caption.trim() || (uploadVisibility === 'private' ? 'Confidential Whispered Memory' : 'Treasured Moment'),
          memoryDate: memoryDate,
          tag: tag,
          visibility: uploadVisibility,
          uploadedBy: userEmail,
          uploaderName: userEmail.includes('jit') ? 'Jit' : 'Saini',
          width: typeof sanitized.width === 'number' ? sanitized.width : 0,
          height: typeof sanitized.height === 'number' ? sanitized.height : 0,
          createdAt: serverTimestamp(),
        };

        console.log('Writing to Firestore collection:', collectionName, memoryDoc);

        try {
          await setDoc(doc(db, collectionName, uniqueId), memoryDoc);
          console.log(`[Firestore] Successfully written document to ${collectionName}:`, uniqueId);
        } catch (fsErr) {
          console.error(`[Firestore] Error writing to ${collectionName}:`, fsErr);
          // Fallback to legacy 'memories' collection if new collection rules are not yet published to Firebase Cloud
          try {
            console.log('Attempting fallback write to legacy memories collection:', uniqueId);
            await setDoc(doc(db, 'memories', uniqueId), {
              ...memoryDoc,
              collectionTarget: collectionName,
            });
            console.log('[Firestore] Successfully written document to fallback memories collection:', uniqueId);
          } catch (fallbackErr) {
            console.error('[Firestore] Fallback write error:', fallbackErr);
            // Non-blocking: Direct R2 storage upload was already 100% successful
          }
        }

        setUploadStep('completed');
        setUploadProgress(100);

        // 6. UI State & Notification
        try {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#e11d48', '#fda4af', '#f43f5e', '#ffe4e6'],
          });
        } catch {}

        if (handleUploadSuccess) {
          handleUploadSuccess({
            ...memoryDoc,
            createdAt: new Date().toISOString(),
          });
        }

        // Trigger real-time sync with Cloudflare R2
        triggerMemoriesRefresh();
      } else {
        // Fallback local data URL for offline sandbox mode
        const reader = new FileReader();
        const fallbackDataUrl = await new Promise((resolve) => {
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsDataURL(sanitized.blob);
        });

        setUploadStep('indexing');
        setUploadProgress(95);
        await new Promise((r) => setTimeout(r, 400));

        const uniqueId = `local_${Date.now()}`;
        const localMemory = {
          id: uniqueId,
          storageKey: `${folder}/${uniqueId}_${sanitized.fileName}`,
          storagePath: null,
          fallbackData: fallbackDataUrl,
          fileName: sanitized.fileName,
          caption: caption.trim() || 'Treasured Memory',
          memoryDate: memoryDate,
          tag: tag,
          visibility: uploadVisibility,
          uploadedBy: currentUserEmail,
          uploaderName: currentUserEmail.toLowerCase().includes('jit') ? 'Jit' : 'Saini',
          width: sanitized.width,
          height: sanitized.height,
          createdAt: new Date().toISOString(),
        };

        setUploadStep('completed');
        setUploadProgress(100);

        try {
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        } catch {}

        if (handleUploadSuccess) {
          handleUploadSuccess(localMemory);
        }
      }

      showNotification(
        uploadVisibility === 'private'
          ? 'Secret photo sealed in Private_Memory_Details 💕'
          : 'Photo published to Public_Memory_Details ✨',
        3500
      );

      setTimeout(() => {
        handleCloseUploadModal();
      }, 700);
    } catch (err) {
      console.error('Upload Error:', err);
      setUploadError(err.message || 'Failed to upload photo. Please try again.');
      setUploadStep('idle');
    }
  };

  // Handle audio file selection
  const handleSongFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
      setSongUploadError('Please select a valid audio file (.mp3, .wav, .m4a, .ogg).');
      return;
    }

    setSongUploadError('');
    setSelectedSongFile(file);

    // Auto-fill song title from filename if empty
    if (!newSongTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setNewSongTitle(cleanName);
    }

    if (songPreviewUrl) URL.revokeObjectURL(songPreviewUrl);
    setSongPreviewUrl(URL.createObjectURL(file));
  };

  const handleResetSongForm = () => {
    if (songPreviewUrl) URL.revokeObjectURL(songPreviewUrl);
    setSelectedSongFile(null);
    setSongPreviewUrl(null);
    setNewSongTitle('');
    setNewSongArtist('');
    setNewSongUrl('');
    setNewSongDedication('');
    setSongUploadError('');
    setSongUploadProgress(0);
    setIsUploadingSong(false);
  };

  // Add & upload custom song handler to Cloudflare R2 Music folder and Firestore Music_Details
  const handleAddSong = async (e) => {
    e.preventDefault();

    if (!newSongTitle.trim()) {
      setSongUploadError('Please enter a song title.');
      return;
    }

    if (!selectedSongFile) {
      setSongUploadError('Please choose an audio file to upload into the Music folder.');
      return;
    }

    setIsUploadingSong(true);
    setSongUploadProgress(10);
    setSongUploadError('');

    try {
      const uploader = isCurrentPartnerSaini ? 'Saini' : 'Jit';
      await uploadMusicToR2AndFirestore({
        file: selectedSongFile,
        title: newSongTitle.trim(),
        artist: newSongArtist.trim() || 'Custom Vault Melody',
        dedication: newSongDedication.trim() || 'For Saini & Jit',
        uploaderName: uploader,
        onProgress: (p) => setSongUploadProgress(p),
      });

      setSongUploadProgress(100);

      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#fbbf24', '#f43f5e', '#fda4af'],
        });
      } catch {}

      showNotification(`"${newSongTitle.trim()}" sealed into Cloudflare Music vault ♪`, 4000);
      handleResetSongForm();
      setIsSongModalOpen(false);
    } catch (err) {
      console.error('Song upload error:', err);
      setSongUploadError(err.message || 'Failed to upload song to Cloudflare R2. Please try again.');
    } finally {
      setIsUploadingSong(false);
    }
  };

  // Remove custom song
  const handleRemoveSong = (songId) => {
    setSongs((prev) => prev.filter((s) => s.id !== songId));
    showNotification('Song removed from playlist.', 2500);
  };

  // Handle Preview of song
  const handleTogglePreviewSong = (song) => {
    if (activePreviewSongId === song.id) {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setActivePreviewSongId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = song.url;
        previewAudioRef.current.play().catch(() => {});
      }
      setActivePreviewSongId(song.id);
    }
  };

  // Clean, defensive logout with full session teardown
  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      // Purge in-memory decrypted blob cache for Level 4 Zero-Knowledge security
      if (lruBlobCache && typeof lruBlobCache.clear === 'function') {
        lruBlobCache.clear();
      }
      // Clear any stored session overrides or role tokens
      try {
        sessionStorage.removeItem('sainiverse_visitor_role');
      } catch {
        // ignore
      }
      setCurrentUser(null);
      showNotification?.('Logged out safely from Vault 🔐', 2500);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      showNotification?.('Failed to logout. Please try again.', 3000);
    }
  };

  if (isAuthChecking && !currentUser && !auth?.currentUser) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 text-center p-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-500 animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-rose-800 uppercase tracking-widest">
          Verifying Vault Credentials...
        </p>
      </div>
    );
  }

  return (
    <>
      <audio ref={previewAudioRef} onEnded={() => setActivePreviewSongId(null)} className="hidden" />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 sm:pt-1 pb-12 sm:pb-16 space-y-8 sm:space-y-10 animate-fade-in relative z-10">
        {/* 1. HERO BRANDING & TOP ACCESS STATUS */}
        <section className="relative text-center space-y-3 sm:space-y-4 pt-1 sm:pt-2">
          {/* Top-Right Vault Access Chip & Logout Button */}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:absolute sm:right-0 sm:top-1 z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-purple-200 text-purple-800 text-xs font-semibold shadow-xs backdrop-blur-md hover:border-purple-300 transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Vault Access: <span className="font-bold text-purple-950">{currentUserEmail}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/90 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-700 text-xs font-bold shadow-xs hover:shadow-sm backdrop-blur-md transition-all cursor-pointer group active:scale-95"
              title="Lock & Log out of Private Vault"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
              <span>Logout</span>
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/85 border border-purple-200 shadow-xs backdrop-blur-md"
          >
            <Lock className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-[11px] sm:text-xs font-semibold text-purple-800 tracking-wider uppercase">
              Confidential Space • SainiVerse Studio
            </span>
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-2 max-w-3xl mx-auto"
        >
          <h1
            className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-Neonderthaw text-rose-500 tracking-wide select-none"
            style={{ fontFamily: "'Neonderthaw', cursive, serif" }}
          >
            Private Vault Studio
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium max-w-xl mx-auto leading-relaxed">
            Our exclusive sanctuary suite. Upload memories with tailored romantic captions, manage our shared gallery, and customize our soundtrack.
          </p>
        </motion.div>
      </section>

      {/* 3. THREE CORE STUDIO ACTIONS: PUBLIC IMAGE, PRIVATE IMAGE (SUGGEST CAPTION), ADD SONGS */}
      <section className="space-y-4">
        <div className="text-center sm:text-left space-y-1">
          <div className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vault Quick Controls</span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire tracking-wide"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            Sanctuary Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 max-w-6xl mx-auto gap-5 sm:gap-6">
          {/* OPTION 1: ADD IMAGE IN PUBLIC GALLERY */}
          <Card
            variant="pink"
            onClick={() => handleOpenUpload('public', false)}
            className="h-[290px] sm:h-[310px] bg-white/80 hover:bg-white/95 backdrop-blur-md border border-rose-200/90 hover:border-rose-400 shadow-md hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="h-full w-full p-6 flex flex-col justify-between text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md">
                    <Globe className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    Public Archive
                  </span>
                </div>

                <div className="space-y-1">
                  <h3
                    className="text-xl sm:text-2xl font-bold text-rose-950 font-berkshire"
                    style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                  >
                    Add Memory
                  </h3>
                  <p className="text-xs text-rose-600 font-semibold">
                    Shared Chronicle For All Visitors
                  </p>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                  Upload a photo to our open chronicle. Automatically strips camera metadata and tags memories by date & category.
                </p>
              </div>

              <div className="pt-3 border-t border-rose-100 flex items-center justify-between text-rose-600 text-xs font-bold">
                <span>Upload Public Photo</span>
                <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Card>

          {/* OPTION 2: ADD SONGS */}
          <Card
            variant="yellow"
            onClick={() => setIsSongModalOpen(true)}
            className="h-[290px] sm:h-[310px] bg-white/80 hover:bg-white/95 backdrop-blur-md border border-amber-200/90 hover:border-amber-400 shadow-md hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="h-full w-full p-6 flex flex-col justify-between text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                    <Music className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Melody Station
                  </span>
                </div>

                <div className="space-y-1">
                  <h3
                    className="text-xl sm:text-2xl font-bold text-amber-950 font-berkshire"
                    style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                  >
                    Add Songs & Melodies
                  </h3>
                  <p className="text-xs text-amber-700 font-semibold">
                    Universe Soundtrack & Playlist
                  </p>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                  Manage the songs that play in our universe. Add special love tracks, preview melodies, and dedicate songs.
                </p>
              </div>

              <div className="pt-3 border-t border-amber-100 flex items-center justify-between text-amber-800 text-xs font-bold">
                <span>Manage Songs & Playlist</span>
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                  <Disc className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. THE INTERACTIVE GALLERY SECTION */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200/70 pb-4">
          <div className="space-y-1">
            <h2
              className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire"
              style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
            >
              Vault Photo Collection
            </h2>
            <p className="text-xs text-gray-600 font-medium">
              Browse, filter, and inspect photos in full screen.
            </p>
          </div>

          {/* Visibility Tabs (All | Private | Public) */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/90 border border-rose-200 shadow-xs">
            <button
              onClick={() => setGalleryTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                galleryTab === 'all'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({memories.length})
            </button>
            <button
              onClick={() => setGalleryTab('private')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                galleryTab === 'private'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Private Vault ({stats.privateCount})</span>
            </button>
            <button
              onClick={() => setGalleryTab('public')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                galleryTab === 'public'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Public ({stats.publicCount})</span>
            </button>
          </div>
        </div>

        {/* Category Tag Filter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-rose-400 shrink-0 hidden sm:block" />
          {['All', 'Special Moment', 'Date Night', 'Vacation', 'Just Us', 'Milestone'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === t
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs'
                  : 'bg-white/80 text-gray-600 hover:text-gray-900 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Photo Grid */}
        {filteredMemories.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto p-8 rounded-3xl bg-white/80 border border-rose-200/90 shadow-sm space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="font-berkshire text-lg font-bold text-gray-800">
                No memories found in this section
              </h4>
              <p className="text-xs text-gray-500">
                {galleryTab === 'private'
                  ? 'There are currently no photos in the Private_Memories folder of Cloudflare.'
                  : galleryTab === 'public'
                  ? 'There are currently no photos in the Public_Memories folder of Cloudflare.'
                  : 'There are currently no photos in the Cloudflare memory folders.'}
              </p>
            </div>
            <button
              onClick={() => handleOpenUpload(galleryTab === 'private' ? 'private' : 'public', galleryTab === 'private')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Photo Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredMemories.map((memory) => {
              const isPrivate = isPrivateMemory(memory);
              return (
                <motion.div
                  key={memory.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setSelectedMemory(memory)}
                  className="group relative rounded-2xl overflow-hidden bg-white border border-rose-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-[4/5] w-full bg-rose-50 overflow-hidden">
                    <SecureImage
                      storageKey={memory.storageKey}
                      storagePath={memory.storagePath || memory.storageKey}
                      fileName={memory.fileName}
                      fallbackData={memory.fallbackData}
                      alt={memory.caption}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Privacy Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      {isPrivate ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-900/80 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Private</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-900/70 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
                          <Globe className="w-2.5 h-2.5" />
                          <span>Public</span>
                        </span>
                      )}
                    </div>

                    {/* Tag badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-gray-700 text-[10px] font-semibold">
                        {memory.tag || 'Moment'}
                      </span>
                    </div>
                  </div>

                  {/* Caption & Metadata */}
                  <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                    <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-relaxed">
                      {memory.caption}
                    </p>

                    <div className="pt-2 border-t border-rose-50 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                      <span>{formatMemoryDate(memory.memoryDate)}</span>
                      <span className="text-rose-600 font-semibold">{memory.uploaderName || 'Partner'}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>

      {/* 5. UPLOAD MODAL (WITH PUBLIC / PRIVATE VISIBILITY & "SUGGEST CAPTION") */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
              {/* Fullscreen Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={handleCloseUploadModal}
                className="fixed inset-0 bg-rose-950/50 backdrop-blur-md"
              />

              {/* Viewport Centering Scaffold */}
              <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 12 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="pointer-events-auto relative w-full max-w-lg my-auto text-left bg-white/95 backdrop-blur-2xl border border-rose-200 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto z-10"
                >
                  <button
                    type="button"
                    onClick={handleCloseUploadModal}
                    className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-rose-50 transition-colors cursor-pointer z-10"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>

              {/* Modal Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
                  {uploadVisibility === 'private' ? <Lock className="w-3 h-3 text-purple-600" /> : <Globe className="w-3 h-3 text-rose-600" />}
                  <span>{uploadVisibility === 'private' ? 'Private Vault Sanctuary' : 'Public Chronicle Upload'}</span>
                </div>
                <h3
                  className="text-2xl font-bold text-rose-950 font-berkshire"
                  style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                >
                  {uploadVisibility === 'private' ? 'Store A Secret Memory' : 'Add Image to Public Gallery'}
                </h3>
              </div>

              {/* Visibility Switcher Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-rose-50/80 border border-rose-200">
                <button
                  type="button"
                  onClick={() => setUploadVisibility('public')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    uploadVisibility === 'public'
                      ? 'bg-white text-rose-700 shadow-xs border border-rose-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public Gallery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadVisibility('private')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    uploadVisibility === 'private'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private Gallery</span>
                </button>
              </div>

              <form onSubmit={handleExecuteUpload} className="space-y-4">
                {/* Photo Dropzone & Preview */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  className="hidden"
                />

                {!previewUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-rose-300 hover:border-rose-400 bg-rose-50/40 hover:bg-rose-50/70 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2"
                  >
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-xs text-rose-500 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-rose-900">Click to select photo or drag here</p>
                      <p className="text-[11px] text-gray-500">Supports JPG, PNG, WebP (EXIF auto-cleaned)</p>
                    </div>
                  </div>
                ) : (
                  <div
                    onContextMenu={(e) => e.preventDefault()}
                    className="relative rounded-2xl overflow-hidden border border-rose-200 aspect-[16/10] bg-black/5 select-none no-scrape"
                  >
                    <img
                      src={previewUrl}
                      alt="Preview"
                      draggable="false"
                      onDragStart={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full h-full object-cover select-none pointer-events-none no-scrape"
                      style={{ WebkitUserDrag: 'none', userSelect: 'none' }}
                    />
                    {/* Transparent anti-scraping overlay */}
                    <div
                      className="absolute inset-0 z-10 bg-transparent select-none"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      draggable="false"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Choose different photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Caption Input with "Suggest Caption" Feature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      Memory Caption
                    </label>

                    {/* SUGGEST CAPTION TRIGGER BUTTON */}
                    <button
                      type="button"
                      onClick={handleGenerateAiCaptions}
                      disabled={isGeneratingAiCaptions}
                      className="inline-flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 font-bold cursor-pointer disabled:opacity-60 transition-all"
                    >
                      {isGeneratingAiCaptions ? (
                        <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                      )}
                      <span>
                        {isGeneratingAiCaptions
                          ? 'Gemini Inspiring... ✨'
                          : showCaptionSuggester && aiSuggestions.length > 0
                          ? 'Re-generate with AI ✨'
                          : 'Suggest Caption ✨'}
                      </span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a sweet note or pick a suggested caption..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-rose-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />

                  {/* INTERACTIVE CAPTION SUGGESTER DRAWER */}
                  {showCaptionSuggester && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>Gemini Vision Caption Studio</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {aiSuggestions.length > 0 && (
                            <button
                              type="button"
                              onClick={handlePickRandomCaption}
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Shuffle className="w-3 h-3" />
                              <span>Surprise Me ✨</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setShowCaptionSuggester(false)}
                            className="p-1 rounded-full text-purple-600 hover:bg-purple-200/60 transition-colors"
                            title="Hide Suggestions"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* LOADING STATE */}
                      {isGeneratingAiCaptions ? (
                        <div className="py-6 px-4 rounded-xl bg-white/80 border border-purple-150 flex flex-col items-center justify-center space-y-2 text-center">
                          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                          <p className="text-xs font-bold text-purple-950">Gemini is inspecting your photo... ✨</p>
                          <p className="text-[11px] text-purple-700 font-medium">Crafting 4 heartfelt, image-aware captions for Jit & Saini</p>
                        </div>
                      ) : aiSuggestions.length > 0 ? (
                        /* AI GENERATED SUGGESTIONS */
                        <div className="space-y-2 p-2.5 rounded-xl bg-white/90 border border-purple-200 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 via-rose-100 to-pink-100 border border-purple-200 text-purple-800 text-[10px] font-bold tracking-wide">
                              <Sparkles className="w-3 h-3 text-rose-500" />
                              <span>AI Vision Curated ✨</span>
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">Image-aware for Jit & Saini</span>
                          </div>

                          <div className="space-y-1.5">
                            {aiSuggestions.map((text, i) => (
                              <button
                                key={`ai-${i}`}
                                type="button"
                                onClick={() => {
                                  setCaption(text);
                                  showNotification('AI caption applied ✨', 2000);
                                }}
                                className="w-full text-left p-2.5 rounded-xl bg-purple-50/70 hover:bg-purple-100 border border-purple-100 text-xs text-purple-950 font-medium transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                              >
                                <span className="line-clamp-2 italic">“{text}”</span>
                                <Check className="w-3.5 h-3.5 text-purple-500 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* EMPTY / PROMPT STATE */
                        <div className="py-5 px-4 rounded-xl bg-white/80 border border-purple-150 text-center space-y-2.5">
                          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto shadow-xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-purple-950">No AI captions generated yet</p>
                            <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                              {selectedFile
                                ? 'Tap below to let Gemini inspect this photo and generate 4 custom captions.'
                                : 'Select a photo first, then let Gemini inspect and generate 4 romantic captions.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleGenerateAiCaptions}
                            disabled={isGeneratingAiCaptions}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>Generate with Gemini ✨</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Date & Tag Row */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      Memory Date
                    </label>
                    <input
                      type="date"
                      value={memoryDate}
                      onChange={(e) => setMemoryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      Tag Category
                    </label>
                    <select
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                    >
                      <option value="Special Moment">Special Moment</option>
                      <option value="Date Night">Date Night</option>
                      <option value="Vacation">Vacation</option>
                      <option value="Just Us">Just Us</option>
                      <option value="Milestone">Milestone</option>
                    </select>
                  </div>
                </div>

                {/* Error */}
                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={uploadStep !== 'idle'}
                  className={`w-full py-3 rounded-xl text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                    uploadVisibility === 'private'
                      ? 'bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700'
                      : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                >
                  {uploadStep !== 'idle' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {uploadStep === 'sanitizing' && 'Stripping EXIF & GPS...'}
                        {uploadStep === 'uploading' && `Uploading (${uploadProgress}%)...`}
                        {uploadStep === 'indexing' && 'Sealing in Vault...'}
                        {uploadStep === 'completed' && 'Sealed with Love 💕'}
                      </span>
                    </>
                  ) : (
                    <>
                      {uploadVisibility === 'private' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      <span>
                        {uploadVisibility === 'private' ? 'Seal in Private Vault 💕' : 'Publish to Gallery ✨'}
                      </span>
                    </>
                  )}
                </button>
              </form>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 6. ADD SONGS & MELODY STATION MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSongModalOpen && (
            <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
              {/* Fullscreen Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsSongModalOpen(false)}
                className="fixed inset-0 bg-rose-950/50 backdrop-blur-md"
              />

              {/* Viewport Centering Scaffold */}
              <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 12 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="pointer-events-auto relative w-full max-w-lg my-auto text-left bg-white/95 backdrop-blur-2xl border border-rose-200 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto z-10"
                >
                  <button
                    type="button"
                    onClick={() => setIsSongModalOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-rose-50 transition-colors cursor-pointer z-10"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>

              {/* Modal Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  <Music className="w-3 h-3 text-amber-700" />
                  <span>Melody Station & Soundtrack</span>
                </div>
                <h3
                  className="text-2xl font-bold text-rose-950 font-berkshire"
                  style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                >
                  Cosmic Song Sanctuary
                </h3>
                <p className="text-xs text-gray-600 font-medium">
                  Add love tracks to our universe playlist. Play, preview, and celebrate our melodies.
                </p>
              </div>

              {/* Add New Song Form with File Upload */}
              <form onSubmit={handleAddSong} className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Music className="w-3.5 h-3.5 text-amber-700" />
                    <span>Upload Song & Melody</span>
                  </div>
                  {selectedSongFile && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      File Ready
                    </span>
                  )}
                </div>

                {/* Audio File Input (Hidden) */}
                <input
                  ref={songFileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
                  onChange={handleSongFileChange}
                  className="hidden"
                />

                {/* Audio Dropzone / Chosen File Card */}
                {!selectedSongFile ? (
                  <div
                    onClick={() => songFileInputRef.current?.click()}
                    className="border-2 border-dashed border-amber-300 hover:border-amber-400 bg-white/70 hover:bg-white rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-colors space-y-2 group shadow-2xs"
                  >
                    <div className="w-11 h-11 mx-auto rounded-2xl bg-amber-100 text-amber-700 group-hover:scale-105 transition-transform flex items-center justify-center shadow-xs">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-amber-950">
                        Click to select an audio file (MP3, WAV, M4A)
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Upload your favorite tracks directly to our SainiVerse player
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-xs flex items-center justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileAudio className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{selectedSongFile.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {(selectedSongFile.size / (1024 * 1024)).toFixed(2)} MB • Audio Track
                      </p>
                    </div>

                    {songPreviewUrl && (
                      <audio controls src={songPreviewUrl} className="h-8 max-w-[130px] sm:max-w-[160px]" />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (songPreviewUrl) URL.revokeObjectURL(songPreviewUrl);
                        setSelectedSongFile(null);
                        setSongPreviewUrl(null);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Choose a different file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Song Metadata Fields */}
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      Song Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSongTitle}
                      onChange={(e) => setNewSongTitle(e.target.value)}
                      placeholder="e.g. Kesariya, Bhalobashar Morshum, Perfect"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                        Artist / Singer
                      </label>
                      <input
                        type="text"
                        value={newSongArtist}
                        onChange={(e) => setNewSongArtist(e.target.value)}
                        placeholder="e.g. Arijit Singh"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                        Dedication
                      </label>
                      <input
                        type="text"
                        value={newSongDedication}
                        onChange={(e) => setNewSongDedication(e.target.value)}
                        placeholder="e.g. For our evening drives"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload Progress Bar */}
                {isUploadingSong && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                      <span>Uploading audio file...</span>
                      <span>{songUploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-amber-200/80 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                        style={{ width: `${songUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {songUploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{songUploadError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isUploadingSong}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isUploadingSong ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading Song ({songUploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Song to Universe Playlist ♪</span>
                    </>
                  )}
                </button>
              </form>

              {/* List of existing songs in Vault */}
              <div className="space-y-2.5 pt-3 border-t border-amber-200/60 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <span className="flex items-center gap-1.5">
                    <Disc className="w-3.5 h-3.5 text-amber-700" />
                    <span>Songs in Music Vault ({songs.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSongModalOpen(false);
                      navigate('/music');
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Full Player</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {songs.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic py-2 text-center bg-white/60 rounded-xl border border-amber-100">
                    No songs in the Music vault yet. Upload the first melody above!
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {songs.map((song) => (
                      <div
                        key={song.id}
                        className="p-2.5 rounded-xl bg-white border border-amber-200/70 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">{song.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {song.artist} • By {song.uploaderName || 'Vault'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSongToDelete(song)}
                            className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete song"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Song Confirmation Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {songToDelete && (
            <div
              className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
              onClick={(e) => {
                e.stopPropagation();
                if (!isDeletingSong) setSongToDelete(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 12 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 text-center space-y-4"
              >
                <div className="w-13 h-13 mx-auto rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4
                    className="font-bold text-gray-900 text-xl font-berkshire"
                    style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                  >
                    Delete This Song?
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Are you sure you want to remove <span className="font-semibold text-rose-950">"{songToDelete.title}"</span> from the music vault?
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSongToDelete(null)}
                    disabled={isDeletingSong}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const targetSong = songToDelete;
                      // 1. Optimistic removal: instantly update UI
                      setSongs((prev) =>
                        (prev || []).filter(
                          (s) =>
                            s.id !== targetSong.id &&
                            s.storageKey !== targetSong.storageKey
                        )
                      );
                      try {
                        setIsDeletingSong(true);
                        await deleteSongFromFirestore(targetSong);
                        showNotification('Song deleted from Music vault.', 2500);
                        setSongToDelete(null);
                      } catch (e) {
                        showNotification('Could not delete song: ' + e.message, 3000);
                      } finally {
                        setIsDeletingSong(false);
                      }
                    }}
                    disabled={isDeletingSong}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-semibold shadow-md shadow-rose-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isDeletingSong ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Song</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 7. FULL LIGHTBOX MODAL */}
      {selectedMemory && (
        <LightboxModal
          memory={selectedMemory}
          memories={filteredMemories}
          isOpen={Boolean(selectedMemory)}
          onClose={() => setSelectedMemory(null)}
          onNavigate={(m) => setSelectedMemory(m)}
          onDelete={handleDeleteMemory}
        />
      )}
    </>
  );
}
