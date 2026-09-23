import React from 'react';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';
import CardGlare from './CardGlare';

/**
 * WelcomeModal (Entering Pop Up)
 * - Exact Google Fonts applied:
 *   - "Arizonia" for "Saini Paul"
 *   - "Berkshire Swash" for "Welcome to ..", "A world of love and memories for", dedication message, etc.
 * - Circular SainiVerseLogo.png medallion with a glowing halo
 * - Emojis 🌸 💖
 * - "Are you ready to step in?" prompt
 * - "Begin The Journey" button with celebration confetti
 */
export default function WelcomeModal({ isOpen, onDismiss }) {
  if (!isOpen) return null;

  const handleBeginJourney = () => {
    // Rose confetti burst upon entering
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#f43f6e', '#fb718e', '#fda4b4', '#ffffff', '#ffe4e6'],
    });

    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 xs:p-4 sm:p-6 bg-rose-950/40 backdrop-blur-md animate-fade-in overflow-hidden">
      <CardGlare
        borderWidth={3}
        duration={6.5}
        shineColor={['#e11d48', '#fda4af', '#ffffff']}
        className="relative w-full max-w-sm sm:max-w-lg md:max-w-xl rounded-[32px] sm:rounded-[46px] shadow-2xl shadow-rose-500/35 text-center animate-slide-up my-auto"
        innerClassName="rounded-[30px] sm:rounded-[43px] bg-gradient-to-b from-[#ffd3dc] via-[#ffe3ea] to-[#ffb9cb] p-4 xs:p-6 sm:p-8 border border-white/80 text-center overflow-hidden"
      >
        {/* Soft atmospheric sparkles and light blooms */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-rose-300/30 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: "Welcome to .." in Berkshire Swash */}
        <div className="relative z-10 mb-1.5 sm:mb-2">
          <h1
            className="font-berkshire text-2xl xs:text-3xl sm:text-4xl text-[#e11d48] tracking-wide drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] inline-flex items-center gap-1.5"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            <span>Welcome to ..</span>
          </h1>
        </div>

        {/* Center: Medallion Logo (SainiVerseLogo.png) with Slow Jumping in the Photo */}
        <div className="relative z-10 mx-auto my-1.5 sm:my-2 w-36 h-36 xs:w-44 xs:h-44 sm:w-60 sm:h-60 md:w-72 md:h-72 flex flex-col items-center justify-center">
          {/* Dynamic Ground Shadow breathing with the jump */}
          <div className="absolute -bottom-2 w-32 xs:w-40 sm:w-56 h-4 sm:h-5 bg-rose-950/20 rounded-full blur-md animate-slow-jump-shadow pointer-events-none" />

          {/* Photo & Medallion Frame slowly jumping */}
          <div className="relative w-full h-full flex items-center justify-center animate-slow-jump">
            {/* Glowing Rose Halo */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-rose-400/35 via-pink-300/40 to-white/50 blur-xl animate-pulse" />

            {/* Shimmering Circular Medallion Frame */}
            <div className="relative w-full h-full rounded-full p-1 xs:p-1.5 sm:p-2 bg-gradient-to-tr from-[#fbcfe8] via-white to-[#fda4b4] shadow-2xl shadow-rose-500/30 transform transition-transform duration-500 hover:scale-[1.02]">
              <img
                src="/SainiVerseLogo.png"
                alt="SainiVerse — Saini Paul"
                className="w-full h-full object-cover rounded-full select-none pointer-events-none drop-shadow-md"
                draggable="false"
              />
            </div>
          </div>
        </div>

        {/* Main Title: "A world of love and memories for Saini Paul" */}
        {/* Berkshire Swash for dedication phrase, Google Font Arizonia strictly for "Saini Paul" */}
        <div className="relative z-10 mt-2 sm:mt-4 px-2 text-center">
          <p
            className="font-berkshire text-base xs:text-lg sm:text-xl md:text-2xl text-[#e11d48] leading-snug drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            A universe crafted just for
          </p>
          <h2
            className="font-arizonia text-3xl xs:text-4xl sm:text-5xl md:text-[54px] text-[#be123c] font-normal tracking-wide drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] mt-0.5 mb-1 select-none"
            style={{ fontFamily: "'Arizonia', cursive" }}
          >
            Saini Paul
          </h2>
        </div>

        {/* Heartfelt Romantic Message in Berkshire Swash */}
        <div className="relative z-10 my-2 sm:my-3 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/70 shadow-sm max-w-md mx-auto">
          <p
            className="font-berkshire text-rose-950/90 text-xs xs:text-sm sm:text-base leading-relaxed italic"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            "Every snapshot is a page in the sweetest story ever told. A private sanctuary crafted with all my love, dedicated to the one who makes life truly magical."
          </p>
        </div>

        {/* Emojis: 🌸 💖 (Static without animation as requested) */}
        <div className="relative z-10 flex items-center justify-center gap-2.5 xs:gap-3 text-xl xs:text-2xl sm:text-3xl my-1.5 sm:my-2 select-none">
          <span>🌸</span>
          <span>💖</span>
        </div>

        {/* Prompt: "Are you ready to step in?" in Berkshire Swash */}
        <p
          className="relative z-10 font-berkshire text-white text-xs xs:text-sm sm:text-base tracking-wide drop-shadow-[0_1px_3px_rgba(190,18,60,0.5)] my-2"
          style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
        >
          Are you ready to step in?
        </p>

        {/* Action Button: "Begin The Journey" */}
        <div className="relative z-10 mt-2.5 sm:mt-3 mb-1">
          <button
            onClick={handleBeginJourney}
            className="group font-berkshire text-xs xs:text-sm sm:text-base text-[#e11d48] bg-white hover:bg-rose-50 px-6 xs:px-8 sm:px-10 py-2.5 sm:py-3 rounded-full shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/40 transform hover:scale-105 active:scale-95 transition-all duration-300 font-semibold tracking-wide inline-flex items-center gap-2"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            <span>Begin The Journey</span>
            <Sparkles className="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform" />
          </button>
        </div>

      </CardGlare>
    </div>
  );
}

