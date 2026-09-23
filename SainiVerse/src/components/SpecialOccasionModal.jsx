import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { HER_BIRTHDAY, OUR_ANNIVERSARY } from '../utils/specialDates';
import CardGlare from './CardGlare';
import { Sparkles, Heart, Cake } from 'lucide-react';

/**
 * SpecialOccasionModal Component
 * Appears after WelcomeModal if the date is Her Birthday or Our Anniversary.
 * Features:
 * - CardGlare rotating beam with curated festive colors
 * - Medallion Image with gentle slow-jumping animation
 * - Berkshire Swash wish heading with Arizonia for "Saini Paul"
 * - Heartfelt personalized occasion wish
 * - Multi-burst celebration confetti
 */
export default function SpecialOccasionModal({ isOpen, occasion, role = 'girlfriend', onContinue }) {
  const [loveTaps, setLoveTaps] = useState(0);

  useEffect(() => {
    if (!isOpen || !occasion) return;

    // Trigger multi-stage celebratory confetti
    const burstCelebration = () => {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#fb718e', '#fda4af', '#fde047', '#ffffff'],
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.7 },
          colors: ['#f43f6e', '#fb718e', '#fde047'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.7 },
          colors: ['#f43f6e', '#fb718e', '#fde047'],
        });
      }, 350);
    };

    burstCelebration();
  }, [isOpen, occasion]);

  if (!isOpen || !occasion) return null;

  const isBirthday = occasion === 'birthday';
  const config = isBirthday ? HER_BIRTHDAY : OUR_ANNIVERSARY;
  const content = role === 'girlfriend' ? config.forHer : config.forGuests;

  // Curated glare beam colors: Birthday gets rose + champagne gold, Anniversary gets rose + diamond white
  const glareColors = isBirthday
    ? ['#e11d48', '#fb718e', '#fde047']
    : ['#e11d48', '#fda4af', '#ffffff'];

  const handleShowerLove = () => {
    setLoveTaps((prev) => prev + 1);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#e11d48', '#fb718e', '#fde047', '#ffffff'],
    });
  };

  const handleCelebrateAndContinue = () => {
    confetti({
      particleCount: 70,
      spread: 75,
      origin: { y: 0.7 },
      colors: ['#e11d48', '#fb718e', '#fda4b4', '#ffffff'],
    });

    if (onContinue) {
      onContinue();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 xs:p-4 sm:p-6 bg-rose-950/50 backdrop-blur-md animate-fade-in overflow-hidden">
      <CardGlare
        borderWidth={3}
        duration={6}
        shineColor={glareColors}
        className="relative w-full max-w-sm sm:max-w-lg md:max-w-xl rounded-[32px] sm:rounded-[46px] shadow-2xl shadow-rose-500/35 text-center animate-slide-up my-auto"
        innerClassName="rounded-[30px] sm:rounded-[43px] bg-gradient-to-b from-[#ffd3dc] via-[#ffe3ea] to-[#ffb9cb] p-4 xs:p-6 sm:p-8 border border-white/80 text-center overflow-hidden"
      >
        {/* Atmospheric sparkles and light blooms */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-rose-300/30 rounded-full blur-2xl pointer-events-none" />

        {/* Occasion Badge */}
        <div className="relative z-10 mb-1.5 sm:mb-2">
          <span
            className="font-berkshire inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1 rounded-full bg-white/60 border border-white/80 text-rose-700 text-xs sm:text-sm font-semibold tracking-wide shadow-xs select-none"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>{config.badge}</span>
          </span>
        </div>

        {/* Center: Medallion with Slow Jumping in the Photo */}
        <div className="relative z-10 mx-auto my-1.5 sm:my-2 w-36 h-36 xs:w-44 xs:h-44 sm:w-60 sm:h-60 md:w-72 md:h-72 flex flex-col items-center justify-center">
          {/* Dynamic Ground Shadow breathing with the jump */}
          <div className="absolute -bottom-2 w-32 xs:w-40 sm:w-56 h-4 sm:h-5 bg-rose-950/20 rounded-full blur-md animate-slow-jump-shadow pointer-events-none" />

          {/* Photo & Medallion Frame slowly jumping */}
          <div className="relative w-full h-full flex items-center justify-center animate-slow-jump">
            {/* Glowing Aura Halo */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-rose-400/40 via-pink-300/40 to-yellow-200/40 blur-xl animate-pulse" />

            {/* Shimmering Circular Medallion Frame */}
            <div className="relative w-full h-full rounded-full p-1 xs:p-1.5 sm:p-2 bg-gradient-to-tr from-[#fbcfe8] via-white to-[#fda4b4] shadow-2xl shadow-rose-500/30 transform transition-transform duration-500 hover:scale-[1.02]">
              <img
                src={config.image || '/SainiVerseLogo.png'}
                alt={`${content.heading} ${content.name}`}
                className="w-full h-full object-cover rounded-full select-none pointer-events-none drop-shadow-md"
                draggable="false"
              />

              {/* Floating celebration tag on the medallion */}
              <div className="absolute -bottom-1 -right-1 bg-white/95 backdrop-blur-sm border border-rose-300 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 shadow-md text-[11px] sm:text-xs font-semibold text-rose-700 flex items-center gap-1 select-none">
                {isBirthday ? (
                  <>
                    <Cake className="w-3.5 h-3.5 text-rose-500" />
                    <span>Birthday Queen</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    <span>Anniversary Love</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Occasion Wish Heading */}
        <div className="relative z-10 mt-2 sm:mt-4 px-2 text-center">
          <h1
            className="font-berkshire text-lg xs:text-xl sm:text-2xl md:text-3xl text-[#e11d48] tracking-wide drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            {content.heading}
          </h1>
          <h2
            className="font-arizonia text-3xl xs:text-4xl sm:text-5xl md:text-[54px] text-[#be123c] font-normal tracking-wide drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] my-0.5 sm:my-1 select-none"
            style={{ fontFamily: "'Arizonia', cursive" }}
          >
            {content.name}
          </h2>
          <p
            className="font-berkshire text-[11px] xs:text-xs sm:text-sm text-rose-800/80 italic mt-0.5"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            {content.subtitle}
          </p>
        </div>

        {/* Heartfelt Occasion Wish Card */}
        <div className="relative z-10 my-2 sm:my-3 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white/45 backdrop-blur-sm rounded-2xl border border-white/75 shadow-sm max-w-md mx-auto">
          <p
            className="font-berkshire text-rose-950/90 text-xs xs:text-sm sm:text-base leading-relaxed italic"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            "{content.message}"
          </p>
        </div>

        {/* Static Celebration Emojis */}
        <div className="relative z-10 flex items-center justify-center gap-2.5 xs:gap-3 text-xl xs:text-2xl sm:text-3xl my-1.5 sm:my-2 select-none">
          <span>{content.emoji}</span>
        </div>

        {/* Interactive Shower Love Button for Guests */}
        {role === 'guest' && (
          <div className="relative z-10 my-1.5 sm:my-2">
            <button
              type="button"
              onClick={handleShowerLove}
              className="font-berkshire inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white/80 hover:bg-white text-rose-700 text-xs sm:text-sm font-semibold shadow-sm border border-white hover:shadow-md transition-all active:scale-95"
              style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
            >
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>Shower Love {loveTaps > 0 ? `(${loveTaps} sent!)` : ''}</span>
            </button>
          </div>
        )}

        {/* Continue Action Button */}
        <div className="relative z-10 mt-2.5 sm:mt-3 mb-1">
          <button
            onClick={handleCelebrateAndContinue}
            className="group font-berkshire text-xs xs:text-sm sm:text-base text-[#e11d48] bg-white hover:bg-rose-50 px-6 xs:px-8 sm:px-10 py-2.5 sm:py-3 rounded-full shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/40 transform hover:scale-105 active:scale-95 transition-all duration-300 font-semibold tracking-wide inline-flex items-center gap-2"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            <span>{content.buttonText}</span>
            <Sparkles className="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform" />
          </button>
        </div>

      </CardGlare>
    </div>
  );
}
