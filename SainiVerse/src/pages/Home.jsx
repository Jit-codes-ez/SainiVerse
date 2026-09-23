import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import quotes from '../data/Quote.json';
import { calculateDaysTogether } from '../utils/dateUtils';
import { useVault } from '../context/VaultContext';
import { useAudio } from '../context/AudioContext';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { auth, isAllowedEmail, isFirebaseConfigured } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  Heart,
  Sparkles,
  Camera,
  Music,
  Play,
  Pause,
  Calendar,
  Lock,
  Unlock,
  Copy,
  Check,
  Quote as QuoteIcon,
  Volume2,
  ArrowRight,
  Flame,
  Shuffle,
  RotateCcw,
  X,
  KeyRound,
  Gift,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import CardGlare from '../components/CardGlare';

/**
 * Romantic Dashboard & Dynamic Love Suite (The "Home" Universe)
 * Features:
 *   - Live Relationship Milestone Counter
 *   - Daily Curated Love Quotes Carousel
 *   - Quick-Access Dynamic Action Tiles:
 *   1. Memories (Navigates to photo gallery)
 *   2. Music (Toggles background music with dynamic equalizer)
 *   3. Countdown (Shows days together and milestones)
 *   4. Private Section (Interactive confidential vault with secret letter)
 */
export default function Home(props = {}) {
  const vault = useVault();
  const audio = useAudio();
  const navigate = useNavigate();

  const memories = props.memories ?? vault.memories;
  const isPlaying = props.isPlaying ?? audio.isPlaying;
  const onToggleMusic = props.onToggleMusic ?? audio.toggleMusic;
  const onOpenCountdown = props.onOpenCountdown ?? (() => navigate('/countdown'));
  const visitorRole = props.visitorRole ?? vault.visitorRole;
  const onLockVault = props.onLockVault ?? (() => vault.setShowEntryPopup(true));
  const onNavigate = props.onNavigate ?? ((target) => {
    if (target === 'grid') navigate('/memories');
    else if (target === 'timeline') navigate('/timeline');
    else if (target === 'countdown') navigate('/countdown');
    else navigate('/');
  });
  // Deterministic daily index based on calendar day
  const todayDayOfYearIndex = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % quotes.length;
  }, []);

  const [activeQuoteIndex, setActiveQuoteIndex] = useState(todayDayOfYearIndex);
  const [copied, setCopied] = useState(false);
  const [isPrivateOpen, setIsPrivateOpen] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [firebaseUser, setFirebaseUser] = useState(null);

  const currentQuote = quotes[activeQuoteIndex] || quotes[0];
  const isTodayQuote = activeQuoteIndex === todayDayOfYearIndex;

  const daysInfo = calculateDaysTogether();
  const coupleNames = import.meta.env.VITE_COUPLE_NAMES || 'Jit & Saini';

  // Calculate upcoming anniversary
  const nextAnniversaryDays = useMemo(() => {
    const envDate = import.meta.env.VITE_ANNIVERSARY_DATE || '2023-09-24';
    const start = new Date(envDate);
    const now = new Date();
    let next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
    if (next < now) {
      next.setFullYear(now.getFullYear() + 1);
    }
    const diff = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
    return {
      daysLeft: diff === 0 ? 0 : diff,
      dateString: next.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
  }, []);

  // Today's formatted date string
  const todayDateString = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Copy Quote Handler
  const handleCopyQuote = () => {
    const textToCopy = `"${currentQuote.quote}" — ${currentQuote.author} (${currentQuote.category}) • SainiVerse`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    });
  };

  // Next/Surprise quote
  const handleNextQuote = () => {
    setActiveQuoteIndex((prev) => (prev + 1) % quotes.length);
  };

  // Reset to today's quote
  const handleResetToToday = () => {
    setActiveQuoteIndex(todayDayOfYearIndex);
  };

  // Synchronize Firebase auth state for the vault
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && isAllowedEmail(user.email)) {
        setFirebaseUser(user);
        setIsVaultUnlocked(true);
        setAuthEmail(user.email);
      } else {
        setFirebaseUser(null);
        setIsVaultUnlocked(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Authenticate private section via Firebase
  const handleAuthSubmit = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');

    const cleanEmail = authEmail.trim().toLowerCase();
    if (!cleanEmail || !authPassword) {
      setAuthError('Please provide both your email and password.');
      return;
    }

    if (!isAllowedEmail(cleanEmail)) {
      console.warn(`[Vault Auth] Access Denied for email "${cleanEmail}". Allowed:`, ALLOWED_EMAILS);
      setAuthError(
        `Access Denied: Only Jit & Saini are permitted.`
      );
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      setAuthError(
        'Firebase authentication is not configured. Please check your .env settings.'
      );
      return;
    }

    setIsAuthenticating(true);
    try {
      let userCredential;
      try {
        // Attempt regular sign in first
        userCredential = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          authPassword
        );
      } catch (signInErr) {
        // If account does not exist in Firebase yet, automatically set it up for the couple!
        if (
          signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential'
        ) {
          try {
            userCredential = await createUserWithEmailAndPassword(
              auth,
              cleanEmail,
              authPassword
            );
          } catch (createErr) {
            // If email already in use, it was indeed a wrong password
            if (createErr.code === 'auth/email-already-in-use') {
              throw signInErr;
            }
            throw createErr;
          }
        } else {
          throw signInErr;
        }
      }

      const user = userCredential.user;
      if (!isAllowedEmail(user?.email)) {
        await signOut(auth);
        setAuthError('Access restricted to permitted couple accounts only.');
        setIsAuthenticating(false);
        return;
      }

      setFirebaseUser(user);
      setIsVaultUnlocked(true);
      setAuthPassword('');
      setAuthError('');
      vault?.showNotification?.('Welcome to the Private Sanctuary 💕', 3500);

      try {
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#e11d48', '#fda4af', '#f43f5e', '#ffe4e6'],
        });
      } catch {
        // silent fallback
      }
    } catch (err) {
      console.error('Firebase Auth Error:', err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password'
      ) {
        setAuthError('Incorrect password. Please verify your credentials.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Password must be at least 6 characters long.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError(
          'Email/Password provider is disabled in Firebase Console. Enable it under Authentication > Sign-in method.'
        );
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Too many attempts. Please wait a moment and try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError('Network error. Please check your internet connection.');
      } else {
        setAuthError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLockVault = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setIsVaultUnlocked(false);
    setFirebaseUser(null);
    setAuthPassword('');
    setAuthError('');
    vault?.showNotification?.('Private Vault locked securely 💕', 3000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-10 sm:space-y-14">
      {/* 1. HERO BRANDING & WELCOME SECTION */}
      <section className="text-center space-y-3 sm:space-y-4 pt-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-1.5 rounded-full bg-white/70 border border-rose-200 shadow-xs backdrop-blur-md"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
          <span className="text-[11px] sm:text-xs font-semibold text-rose-700 tracking-wide uppercase">
            Sacred Couple Orbit • {coupleNames}
          </span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="space-y-1"
        >
          <h1
            className="text-5xl xs:text-6xl sm:text-7xl md:text-8xl font-neon text-rose-600 drop-shadow-[0_4px_16px_rgba(225,29,72,0.35)] select-none tracking-wide"
            style={{ fontFamily: "'Neonderthaw', cursive" }}
          >
            SainiVerse
          </h1>
          <p
            className="text-lg xs:text-xl sm:text-2xl md:text-3xl text-rose-800 font-arizonia tracking-wide"
            style={{ fontFamily: "'Arizonia', cursive" }}
          >
            Curated memories, endless orbit
          </p>
        </motion.div>

        <p className="max-w-xl mx-auto text-xs sm:text-sm text-gray-600 font-medium px-2 leading-relaxed">
          Welcome to our private universe — a dedicated haven where every photo is sealed in love, every melody echoes our heartbeat, and every second counts our endless orbit together.
        </p>
      </section>

      {/* 2. QUOTE OF THE DAY SECTION */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-200/40 via-pink-200/30 to-amber-200/30 rounded-3xl blur-xl -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <CardGlare
            borderWidth={2.5}
            duration={7}
            shineColor={['#e11d48', '#fb718e', '#ffffff']}
            className="w-full rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300"
            innerClassName="relative bg-white/85 backdrop-blur-xl rounded-[22px] p-6 sm:p-8 md:p-10 overflow-hidden"
          >
          {/* Subtle Decorative Background Watermark */}
          <div className="absolute -right-6 -bottom-6 text-rose-100/60 pointer-events-none select-none">
            <QuoteIcon className="w-48 h-48 sm:w-60 sm:h-60" />
          </div>

          <div className="relative z-10 space-y-5 sm:space-y-6">
            {/* Header: Badge & Date */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-base sm:text-lg font-bold text-rose-950 font-berkshire tracking-wide"
                      style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                    >
                      Quote of the Day
                    </h2>
                    {isTodayQuote && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">
                        Today's Pick
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-rose-600/80 font-medium">
                    {todayDateString}
                  </p>
                </div>
              </div>

              {/* Category & Status Pill */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shadow-2xs">
                  <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                  <span>{currentQuote.category || 'Eternal Love'}</span>
                </span>
              </div>
            </div>

            {/* The Daily Quote Body */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuote.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="space-y-3 sm:space-y-4 max-w-4xl"
              >
                <blockquote
                  className="text-xl xs:text-2xl sm:text-3xl md:text-4xl text-rose-950 font-berkshire leading-snug tracking-wide italic select-none"
                  style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                >
                  “{currentQuote.quote}”
                </blockquote>

                <div className="flex items-center gap-2 text-rose-700 text-xs sm:text-sm font-semibold tracking-wide">
                  <span className="w-6 h-[1.5px] bg-rose-400 rounded-full" />
                  <span>{currentQuote.author}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Interactive Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {/* Copy Quote Button */}
                <button
                  onClick={handleCopyQuote}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all duration-200 shadow-xs active:scale-95"
                  title="Copy quote to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied! 💕</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Quote</span>
                    </>
                  )}
                </button>

                {/* Surprise / Next Quote */}
                <button
                  onClick={handleNextQuote}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-gray-700 border border-rose-200 text-xs font-semibold transition-all duration-200 shadow-xs active:scale-95"
                  title="Browse another romantic quote"
                >
                  <Shuffle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Surprise Quote</span>
                </button>

                {/* Return to Today's Quote if changed */}
                {!isTodayQuote && (
                  <button
                    onClick={handleResetToToday}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-all duration-200 shadow-xs active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Today's Quote</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-gray-400 font-medium">
                Changes everyday at midnight • #{currentQuote.id} of {quotes.length}
              </div>
            </div>
          </div>
        </CardGlare>
      </motion.div>
    </section>

      {/* 3. 4 CARD BUTTONS USING CARD.JSX (PIXELCARD) */}
      <section className="space-y-6">
        <div className="text-center sm:text-left space-y-1">
          <div className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Interactive Couple Hub</span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-berkshire text-rose-950 font-bold tracking-wide"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            Explore Our Sanctuary
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            Tap any card below to launch memories, toggle our melody, check milestones, or open our private vault.
          </p>
        </div>

        {/* The 4 Card Grid (Responsive: 1 col on mobile, 2 cols on md, 4 cols on xl) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {/* CARD 1: MEMORIES */}
          <Card
            variant="pink"
            onClick={() => onNavigate && onNavigate('grid')}
            className="w-full h-[360px] sm:h-[390px] bg-white/80 hover:bg-white/95 backdrop-blur-md border border-rose-200/90 hover:border-rose-400 shadow-md hover:shadow-2xl transition-all duration-300"
          >
            <div className="h-full w-full p-6 sm:p-7 flex flex-col justify-between text-left">
              {/* Top: Icon Badge & Metric Tag */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    {memories.length > 0 ? `${memories.length} Moments` : 'Infinite Love'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3
                    className="text-2xl font-bold text-rose-950 font-berkshire tracking-wide group-hover:text-rose-600 transition-colors"
                    style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                  >
                    Memories
                  </h3>
                  <p className="text-xs text-rose-600 font-semibold tracking-wide">
                    Curated Photo Vault & Gallery
                  </p>
                </div>

                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                  Step inside our visual journey. Relive our dates, stolen laughs, and cherished snapshots preserved forever in our vault.
                </p>
              </div>

              {/* Bottom: Action Trigger Button */}
              <div className="pt-4 border-t border-rose-100 flex items-center justify-between text-rose-700 text-xs font-bold">
                <span className="flex items-center gap-1 group-hover:underline">
                  Browse Memories
                </span>
                <div className="w-8 h-8 rounded-full bg-rose-100 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-all duration-300">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </Card>

          {/* CARD 2: MUSIC */}
          <Card
            variant="pink"
            onClick={() => navigate('/music')}
            className="w-full h-[360px] sm:h-[390px] bg-white/80 hover:bg-white/95 backdrop-blur-md border border-rose-200/90 hover:border-rose-400 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
          >
            <div className="h-full w-full p-6 sm:p-7 flex flex-col justify-between text-left">
              {/* Top: Icon Badge & Metric Tag */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <Music className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    {audio?.playlist?.length > 0
                      ? `${audio.playlist.length} Melodies`
                      : 'Celestial Sanctuary'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3
                    className="text-2xl font-bold text-rose-950 font-berkshire tracking-wide group-hover:text-rose-600 transition-colors"
                    style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                  >
                    Music
                  </h3>
                  <p className="text-xs text-rose-600 font-semibold tracking-wide">
                    Celestial Vault & Melodies
                  </p>
                </div>

                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                  {audio?.currentTrack?.title
                    ? `Now playing "${audio.currentTrack.title}". Open our animated vinyl player to explore our full playlist.`
                    : 'Listen to our romantic playlist streaming from the vault. Open our animated player to explore our melodies in endless orbit.'}
                </p>
              </div>

              {/* Bottom: Action Trigger Button */}
              <div className="pt-4 border-t border-rose-100 flex items-center justify-between text-rose-700 text-xs font-bold">
                <span className="flex items-center gap-1 group-hover:underline">
                  Browse Music Vault
                </span>
                <div className="w-8 h-8 rounded-full bg-rose-100 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-all duration-300">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </Card>

          {/* CARD 3: COUNTDOWN */}
          <Card
            variant="yellow"
            onClick={onOpenCountdown}
            className="w-full h-[360px] sm:h-[390px] bg-white/80 hover:bg-white/95 backdrop-blur-md border border-rose-200/90 hover:border-amber-400 shadow-md hover:shadow-2xl transition-all duration-300"
          >
            <div className="h-full w-full p-6 sm:p-7 flex flex-col justify-between text-left">
              {/* Top: Icon Badge & Days Count */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {daysInfo.days} Days In Love
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3
                    className="text-2xl font-bold text-rose-950 font-berkshire tracking-wide group-hover:text-amber-700 transition-colors"
                    style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                  >
                    Countdown
                  </h3>
                  <p className="text-xs text-amber-700 font-semibold tracking-wide">
                    Milestones & Orbit Counter
                  </p>
                </div>

                <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 space-y-1">
                    <div className="flex items-center justify-between text-amber-900 font-bold">
                      <span>Next Anniversary:</span>
                      <span className="text-rose-600">{nextAnniversaryDays.dateString}</span>
                    </div>
                    <div className="text-[11px] text-amber-800 font-medium">
                      {nextAnniversaryDays.daysLeft === 0
                        ? "Today is our Anniversary! ✨"
                        : `${nextAnniversaryDays.daysLeft} days until our next orbit milestone!`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: Action Trigger Button */}
              <div className="pt-4 border-t border-rose-100 flex items-center justify-between text-amber-800 text-xs font-bold">
                <span className="flex items-center gap-1 group-hover:underline">
                  Open Special Countdown ✨
                </span>
                <div className="w-8 h-8 rounded-full bg-amber-100 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-all duration-300">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </Card>

          {/* CARD 4: PRIVATE SECTION */}
          <Card
            variant="pink"
            onClick={() => setIsPrivateOpen(true)}
            className="w-full h-[360px] sm:h-[390px] bg-white/80 hover:bg-white/95 backdrop-blur-md border border-rose-200/90 hover:border-rose-400 shadow-md hover:shadow-2xl transition-all duration-300"
          >
            <div className="h-full w-full p-6 sm:p-7 flex flex-col justify-between text-left">
              {/* Top: Icon Badge & Confidential Tag */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <Lock className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                    <Lock className="w-3 h-3" />
                    <span>For Her Eyes</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3
                    className="text-2xl font-bold text-rose-950 font-berkshire tracking-wide group-hover:text-rose-600 transition-colors"
                    style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                  >
                    Private Section
                  </h3>
                  <p className="text-xs text-purple-700 font-semibold tracking-wide">
                    Confidential Vault & Love Letters
                  </p>
                </div>

                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                  A locked sanctuary containing secret love letters, whispered promises, and intimate notes created exclusively for her.
                </p>
              </div>

              {/* Bottom: Action Trigger Button */}
              <div className="pt-4 border-t border-rose-100 flex items-center justify-between text-purple-700 text-xs font-bold">
                <span className="flex items-center gap-1 group-hover:underline">
                  Unlock Private Vault
                </span>
                <div className="w-8 h-8 rounded-full bg-purple-100 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-all duration-300">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. INTERACTIVE PRIVATE SECTION MODAL */}
      <AnimatePresence>
        {isPrivateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrivateOpen(false)}
              className="absolute inset-0 bg-rose-950/40 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-rose-300 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsPrivateOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-rose-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {!isVaultUnlocked ? (
                /* LOCKED STATE: FIREBASE EMAIL & PASSWORD AUTH FORM */
                <div className="text-center space-y-5 py-2">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5">
                    <h3
                      className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire"
                      style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                    >
                      Private Sanctuary Vault
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">
                      {authMode === 'login'
                        ? 'Sign in with your email & password to access confidential love notes.'
                        : 'Set up your password for your couple account.'}
                    </p>
                  </div>

                  {/* Quick email presets for convenience */}
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-400 font-medium">Quick select account:</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthEmail('hers.jit@gmail.com');
                          setAuthError('');
                        }}
                        className={`text-[11px] px-3 py-1 rounded-full border transition-all cursor-pointer ${
                          authEmail === 'hers.jit@gmail.com'
                            ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                            : 'bg-rose-50/80 hover:bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                      >
                        Jit ✨
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthEmail('his.saini.gulu@gmail.com');
                          setAuthError('');
                        }}
                        className={`text-[11px] px-3 py-1 rounded-full border transition-all cursor-pointer ${
                          authEmail === 'his.saini.gulu@gmail.com'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-purple-50/80 hover:bg-purple-100 text-purple-700 border-purple-200'
                        }`}
                      >
                        Saini 💕
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-3.5 max-w-sm mx-auto text-left">
                    {/* Email Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => {
                            setAuthEmail(e.target.value);
                            setAuthError('');
                          }}
                          placeholder="Enter Email"
                          autoComplete="email"
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-rose-50/60 border border-rose-200 text-rose-950 text-sm font-medium placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                        Password
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={authPassword}
                          onChange={(e) => {
                            setAuthPassword(e.target.value);
                            setAuthError('');
                          }}
                          placeholder="Enter password"
                          autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                          required
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-rose-50/60 border border-rose-200 text-rose-950 text-sm font-medium placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 text-gray-400 hover:text-rose-600 absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Error Alert */}
                    {authError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs font-medium"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                        <span className="leading-snug">{authError}</span>
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 active:scale-98 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : authMode === 'login' ? (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Unlock Sanctuary Vault</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Create Vault Access ✨</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* UNLOCKED STATE */
                <div className="space-y-6">
                  <div className="text-center space-y-2 border-b border-rose-100 pb-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Vault Unlocked • Authenticated</span>
                    </div>
                    {firebaseUser?.email && (
                      <p className="text-[11px] text-purple-700 font-medium">
                        Authenticated as <span className="font-semibold">{firebaseUser.email}</span> 💕
                      </p>
                    )}
                    <h3
                      className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire"
                      style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                    >
                      A Letter To My Forever
                    </h3>
                  </div>

                  {/* Love Letter Body */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50/90 to-pink-50/80 border border-rose-200 space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed">
                    <p className="font-semibold text-rose-900 italic">
                      My Dearest Love,
                    </p>
                    <p>
                      Every piece of this universe was built with you at the center. In a world full of noise, you are my sanctuary, my calm, and the sweetest melody I've ever heard.
                    </p>
                    <p>
                      Through every day we count, every photo we seal, and every milestone we celebrate — I will always be proud to orbit right beside you.
                    </p>
                    <p className="text-right font-bold text-rose-900 font-berkshire text-base pt-2">
                      Forever Yours, <br />
                      Jit 💕
                    </p>
                  </div>

                  {/* Sacred Promises */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Our Sacred Promises</span>
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                      <li>To always listen to your heartbeat when you need comfort.</li>
                      <li>To make you laugh on days when the universe feels heavy.</li>
                      <li>To keep curating our memories, in endless orbit, forever.</li>
                    </ul>
                  </div>

                  {/* Enter Private Vault Studio CTA */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 border border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-purple-950 font-berkshire">
                        Open Private Vault Studio
                      </h4>
                      <p className="text-xs text-purple-700 font-medium">
                        Add public or private memories with romantic caption suggestions and custom melodies.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPrivateOpen(false);
                        navigate('/private-vault');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-purple-300 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Enter Studio ✨</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Relock / Sign Out Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-rose-100">
                    <p className="text-[11px] text-gray-400 font-medium">
                      Protected couple session
                    </p>
                    <button
                      onClick={handleLockVault}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Lock Vault & Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
