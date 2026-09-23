import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateDaysTogether } from '../utils/dateUtils';
import { useAudio } from '../context/AudioContext';
import {
  motion,
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
} from 'motion/react';
import {
  Heart,
  Home,
  Sparkles,
  Calendar,
  Play,
  Pause,
  Music,
} from 'lucide-react';


/**
 * Floating Navbar Component
 * Order: Logo -> Date Counter -> Music Pill (Middle) -> Gooey Home & About (Extreme Right)
 * Styled with a romantic pinkish-white glassy aesthetic & SmoothUI scroll physics.
 */
export default function Navbar({
  currentView,
  onViewChange,
  isModalActive = false,
  isPlaying: isPlayingProp,
  onToggleMusic: onToggleMusicProp,
}) {
  const [showCounterDetail, setShowCounterDetail] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isShrunk, setIsShrunk] = useState(false);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = isPlayingProp !== undefined ? isPlayingProp : internalIsPlaying;

  const navigate = useNavigate();
  const audio = useAudio();
  const currentTrack = audio?.currentTrack;

  const audioRef = useRef(null);
  const counterRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Click anywhere outside to close the Together anniversary popup
  useEffect(() => {
    if (!showCounterDetail) return;
    const handleClickOutside = (event) => {
      if (counterRef.current && !counterRef.current.contains(event.target)) {
        setShowCounterDetail(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [showCounterDetail]);

  // SmoothUI Floating Navbar Scroll Dynamics
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? latest;
    const delta = latest - previous;

    setIsShrunk(latest > 90);

    // Keep visible near top, when reduced motion is preferred, or when modals are active
    if (shouldReduceMotion || latest < 32 || isModalActive) {
      setIsHidden(false);
      return;
    }

    // Auto-hide when scrolling down, reveal when scrolling up
    if (delta > 4) {
      setIsHidden(true);
      setShowCounterDetail(false);
    } else if (delta < -4) {
      setIsHidden(false);
    }
  });

  const daysInfo = calculateDaysTogether();
  const coupleNames = import.meta.env.VITE_COUPLE_NAMES || 'Jith & Her';

  // Toggle romantic background music
  const toggleMusic = () => {
    if (onToggleMusicProp) {
      onToggleMusicProp();
    } else if (audio?.toggleNavbarMusic) {
      audio.toggleNavbarMusic();
    }
  };

  const handleTabClick = (viewId) => {
    onViewChange(viewId);
  };

  return (
    <>
      {/* Clearance Spacer so content starts cleanly below the floating capsule */}
      <div className="h-20 sm:h-24 w-full pointer-events-none" aria-hidden="true" />

      {/* Floating Navbar Container (SmoothUI motion architecture, z-30 for popup backgrounding) */}
      <motion.header
        animate={
          shouldReduceMotion
            ? { opacity: isHidden ? 0 : isModalActive ? 0.45 : 1, y: 0 }
            : { opacity: isHidden ? 0 : isModalActive ? 0.45 : 1, y: isHidden ? -90 : 0 }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.28, ease: [0.645, 0.045, 0.355, 1] }
        }
        style={isHidden || isModalActive ? { pointerEvents: isModalActive ? 'none' : 'none' } : undefined}
        className={`fixed top-2.5 sm:top-4 inset-x-0 z-30 mx-auto px-2.5 sm:px-4 md:px-6 pointer-events-none flex justify-center transition-all duration-300 ${
          isModalActive ? 'filter blur-[1px]' : ''
        }`}
      >
        {/* Inline CSS Keyframes for Music Equalizer */}
        <style>
          {`
            @keyframes music-wave-1 {
              0%, 100% { height: 4px; }
              50% { height: 16px; }
            }
            @keyframes music-wave-2 {
              0%, 100% { height: 14px; }
              50% { height: 5px; }
            }
            @keyframes music-wave-3 {
              0%, 100% { height: 6px; }
              50% { height: 18px; }
            }
            @keyframes music-wave-4 {
              0%, 100% { height: 15px; }
              50% { height: 7px; }
            }
            @keyframes music-wave-5 {
              0%, 100% { height: 5px; }
              50% { height: 13px; }
            }
            .music-bar-1 { animation: music-wave-1 0.75s ease-in-out infinite; }
            .music-bar-2 { animation: music-wave-2 0.85s ease-in-out infinite 0.15s; }
            .music-bar-3 { animation: music-wave-3 0.65s ease-in-out infinite 0.3s; }
            .music-bar-4 { animation: music-wave-4 0.8s ease-in-out infinite 0.2s; }
            .music-bar-5 { animation: music-wave-5 0.7s ease-in-out infinite 0.4s; }
          `}
        </style>

        {/* Pinkish-White Glassy Floating Capsule */}
        <div
          className={`pointer-events-auto relative w-full max-w-7xl mx-auto flex items-center justify-between gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 rounded-2xl sm:rounded-[22px] border border-rose-200/80 bg-gradient-to-r from-rose-50/80 via-white/90 to-pink-50/80 backdrop-blur-2xl shadow-xl shadow-rose-950/5 transition-all duration-300 ${
            isShrunk
              ? 'py-1 px-2 xs:px-2.5 sm:px-4 md:px-5 shadow-2xl bg-white/95 border-rose-300/80 scale-[0.99]'
              : 'py-1.5 xs:py-2 sm:py-2.5 px-2.5 xs:px-3 sm:px-5 md:px-6'
          }`}
        >
          {/* 1. LEFT: Logo & Date Milestone Counter */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
            {/* Brand Logo: Clickable with smooth hover effect to navigate Home */}
            <button
              type="button"
              onClick={() => handleTabClick('home')}
              className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-3.5 group cursor-pointer text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              title="Return to SainiVerse Home"
            >
              <div className="w-9 h-9 xs:w-10 xs:h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-tr from-rose-500 via-rose-400 to-pink-400 p-0.5 flex items-center justify-center shadow-md shadow-rose-400/30 group-hover:shadow-lg group-hover:shadow-rose-400/40 group-hover:scale-105 transition-all duration-300 shrink-0">
                <img
                  src="/SainiVerseTextLogo.png"
                  onError={(e) => {
                    e.currentTarget.src = '/SainiVerseTextLogo.png';
                  }}
                  alt="SainiVerse Logo"
                  className="w-full h-full object-cover rounded-full select-none"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span
                  className="font-neonderthaw text-2xl xs:text-3xl sm:text-3xl md:text-4xl lg:text-[40px] leading-none tracking-wider select-none group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.35)] transition-all duration-300"
                  style={{
                    fontFamily: "'Neonderthaw', cursive, sans-serif",
                    color: '#be123c',
                    WebkitTextStroke: '0.8px #9f1239',
                    textShadow: '0 0 1px #9f1239, 0 1px 2px rgba(159, 18, 57, 0.4), 0 0 10px rgba(244, 63, 94, 0.35)',
                    fontWeight: 'normal'
                  }}
                >
                  SainiVerse
                </span>
                <span
                  className="font-arizonia text-[10px] xs:text-xs sm:text-sm lg:text-[16px] tracking-wide -mt-0.5 block select-none truncate max-w-[115px] xs:max-w-[160px] sm:max-w-none group-hover:text-rose-950 transition-colors duration-200"
                  style={{
                    fontFamily: "'Arizonia', cursive, serif",
                    color: '#881337',
                    WebkitTextStroke: '0.2px #881337',
                    textShadow: '0 1px 1px rgba(255, 255, 255, 0.9)'
                  }}
                >
                  Curated memories, endless orbit
                </span>
              </div>
            </button>

            {/* 2. Date Counter Pill (Visible on md+ screens, click anywhere to dismiss) */}
            <div ref={counterRef} className="relative hidden md:block">
              <button
                onClick={() => setShowCounterDetail(!showCounterDetail)}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/75 hover:bg-white/95 backdrop-blur-md border border-rose-200/80 text-rose-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Click to view anniversary milestone"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                <span>{daysInfo.formatted}</span>
                <Sparkles className="w-3 h-3 text-rose-400" />
              </button>

              {/* Anniversary detail popup with click-anywhere dismissal */}
              {showCounterDetail && (
                <>
                  {/* Invisible global backdrop overlay so clicking anywhere dismisses it */}
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setShowCounterDetail(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute top-11 left-0 z-50 w-64 bg-white/95 backdrop-blur-xl rounded-2xl p-4 border border-rose-200 shadow-2xl shadow-rose-300/30 animate-fade-in text-xs">
                    <div className="flex items-center gap-2 text-rose-600 font-bold mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>Our Love Journey</span>
                    </div>
                    <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
                      Every single day in our private world is a treasured milestone.
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-rose-100 flex justify-between text-[11px] text-gray-500 font-medium">
                      <span>{daysInfo.years} Years, {daysInfo.months} Months</span>
                      <span className="text-rose-600 font-bold">{daysInfo.days} Days</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. MIDDLE: Romantic Music Player Pill (Fluidly Responsive Capsule) */}
          <div className="flex-1 flex items-center justify-center max-w-[130px] xs:max-w-[170px] sm:max-w-xs md:max-w-md lg:max-w-lg mx-1 sm:mx-2 md:mx-4 min-w-0">
            <button
              type="button"
              onClick={toggleMusic}
              className="relative w-full inline-flex items-center justify-between gap-1 xs:gap-1.5 sm:gap-2.5 md:gap-3 px-2 xs:px-2.5 sm:px-3.5 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-xl sm:rounded-2xl bg-white/85 hover:bg-white active:scale-[0.99] backdrop-blur-md border border-rose-200/90 hover:border-rose-300/90 text-rose-700 transition-all shadow-xs hover:shadow-md group cursor-pointer"
              title={isPlaying ? 'Pause Romantic Melody' : 'Play Romantic Melody'}
            >
              {/* Left: Play / Pause Circular Icon */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                <div
                  className={`w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isPlaying
                      ? 'bg-gradient-to-tr from-rose-500 via-rose-600 to-pink-500 text-white shadow-md shadow-rose-500/30 scale-105'
                      : 'bg-gradient-to-tr from-rose-100 to-pink-100 text-rose-600 group-hover:from-rose-200 group-hover:to-pink-200 group-hover:scale-105'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />
                  )}
                </div>
              </div>

              {/* Center: Track Label & Status (Fluidly adapts: compact on mobile, rich on tablet/desktop) */}
              <div className="flex flex-col items-start justify-center min-w-0 flex-1 px-0.5 xs:px-1 text-left">
                <div className="flex items-center gap-1 sm:gap-1.5 w-full">
                  <span
                    className="font-berkshire text-[11px] xs:text-xs sm:text-sm text-rose-950 font-semibold tracking-wide truncate select-none group-hover:text-rose-600 transition-colors"
                    style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                  >
                    {audio?.navbarTrack?.title || 'Bhalobashar Morshum (ভালবাসার মরশুম) 💕'}
                  </span>
                  <Sparkles className="w-3 h-3 text-rose-400 shrink-0 animate-pulse hidden lg:inline" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-rose-600/80 font-medium tracking-wide truncate select-none hidden md:block">
                  {isPlaying ? 'Playing • Romantic Melody ♬' : 'Paused • Click to Play ♬'}
                </span>
              </div>

              {/* Right: Animated Dancing Equalizer Wave (3-bars on mobile, 5-bars on sm+) */}
              <div className="flex items-center gap-0.5 sm:gap-1 h-4 xs:h-4.5 sm:h-5 px-1 xs:px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-50/90 border border-rose-100 shrink-0">
                <span
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-rose-500 music-bar-1' : 'bg-rose-300 h-1.5'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-pink-500 music-bar-2' : 'bg-pink-300 h-3'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-rose-600 music-bar-3' : 'bg-rose-300 h-2'
                  }`}
                />
                <span
                  className={`hidden xs:block w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-pink-400 music-bar-4' : 'bg-pink-300 h-3.5'
                  }`}
                />
                <span
                  className={`hidden sm:block w-0.5 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-rose-500 music-bar-5' : 'bg-rose-300 h-1.5'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* 4. EXTREME RIGHT: Home and About Options */}
          <div className="relative flex items-center p-0.5 sm:p-1 rounded-xl sm:rounded-2xl bg-rose-100/70 border border-rose-200/80 shadow-inner shrink-0">
            {/* Home Tab */}
            <button
              onClick={() => handleTabClick('home')}
              className={`relative z-10 flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-berkshire transition-colors duration-200 ${
                currentView === 'home' || currentView === 'grid'
                  ? 'text-rose-600 font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
            >
              {(currentView === 'home' || currentView === 'grid') && (
                <motion.div
                  layoutId="navbar-active-pill"
                  className="absolute inset-0 bg-white rounded-lg sm:rounded-xl shadow-xs border border-rose-200/60 -z-10"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                />
              )}
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Home</span>
            </button>

            {/* About Tab */}
            <button
              onClick={() => handleTabClick('about')}
              className={`relative z-10 flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-berkshire transition-colors duration-200 ${
                currentView === 'about'
                  ? 'text-rose-600 font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
            >
              {currentView === 'about' && (
                <motion.div
                  layoutId="navbar-active-pill"
                  className="absolute inset-0 bg-white rounded-lg sm:rounded-xl shadow-xs border border-rose-200/60 -z-10"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }}
                />
              )}
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>About</span>
            </button>
          </div>
        </div>
      </motion.header>
    </>
  );
}
