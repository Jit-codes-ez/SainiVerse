import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import CardGlare from '../components/CardGlare';
import Card from '../components/Card';
import { calculateDaysTogether } from '../utils/dateUtils';
import { useAudio } from '../context/AudioContext';
import { useVault } from '../context/VaultContext';
import {
  Heart,
  Sparkles,
  Camera,
  Music,
  Calendar,
  Lock,
  Compass,
  Stars,
  ShieldCheck,
  ChevronDown,
  Volume2,
  Play,
  Pause,
  ArrowRight,
  Flame,
  Gift,
} from 'lucide-react';
import faqs from '../data/FAQ.json';
import lovePledges from '../data/LovePledges.json';

const ICON_MAP = {
  Heart,
  Sparkles,
  Camera,
  Music,
  Calendar,
  Lock,
  Compass,
  Stars,
  ShieldCheck,
};

export default function About() {
  const navigate = useNavigate();
  const { isPlaying, toggleMusic } = useAudio();
  const { memories, visitorRole } = useVault();
  const daysInfo = calculateDaysTogether();

  const [activeSecret, setActiveSecret] = useState(faqs[0]?.id || 'origin');
  const [promiseIndex, setPromiseIndex] = useState(0);
  const [pledgePulsing, setPledgePulsing] = useState(false);

  const handleNextPromise = () => {
    setPledgePulsing(true);
    setPromiseIndex((prev) => (prev + 1) % lovePledges.length);
    setTimeout(() => setPledgePulsing(false), 500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-12 sm:space-y-16">
      {/* 1. HERO BRANDING & ABOUT DEDICATION */}
      <section className="text-center space-y-4 pt-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/75 border border-rose-200/90 shadow-xs backdrop-blur-md"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
          <span className="text-[11px] sm:text-xs font-semibold text-rose-700 tracking-wide uppercase">
            The Chronicle of Us • SainiVerse
          </span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="space-y-2 max-w-3xl mx-auto"
        >
          <h1
            className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-neon text-rose-600 drop-shadow-[0_4px_16px_rgba(225,29,72,0.3)] select-none tracking-wide"
            style={{ fontFamily: "'Neonderthaw', cursive" }}
          >
            About SainiVerse
          </h1>
          <p
            className="text-xl xs:text-2xl sm:text-3xl text-rose-900 font-arizonia tracking-wide"
            style={{ fontFamily: "'Arizonia', cursive" }}
          >
            Dedicated to Saini Paul — A universe built for two
          </p>
          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed max-w-xl mx-auto pt-2">
            Welcome to the sanctuary behind the orbit. SainiVerse is a bespoke love tribute designed to keep our moments alive, our song playing, and our milestones forever cherished.
          </p>
        </motion.div>
      </section>

      {/* 2. FEATURED STORY SPOTLIGHT (CARDGLARE) */}
      <section className="relative max-w-4xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-200/40 via-pink-200/30 to-amber-200/30 rounded-3xl blur-2xl -z-10" />

        <CardGlare
          borderWidth={3}
          duration={7}
          shineColor={['#e11d48', '#fb718e', '#ffffff']}
          className="w-full rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300"
          innerClassName="relative bg-white/90 backdrop-blur-xl rounded-[22px] p-6 sm:p-9 md:p-11 overflow-hidden text-left space-y-6"
        >
          {/* Top Badge & Live Milestone */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md">
                <Stars className="w-6 h-6" />
              </div>
              <div>
                <h2
                  className="text-xl sm:text-2xl font-bold text-rose-950 font-berkshire tracking-wide"
                  style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                >
                  Our Sacred Foundation
                </h2>
                <p className="text-xs text-rose-600 font-semibold tracking-wide">
                  Established on September 24, 2023
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
              <span>{daysInfo.years} Years, {daysInfo.months} Months in Love</span>
            </div>
          </div>

          {/* Letter / Story Content */}
          <div className="space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed font-sans">
            <p className="text-base sm:text-lg font-serif italic text-rose-900 font-semibold">
              “In a galaxy of billions, our paths crossed and created a universe of our own.”
            </p>
            <p>
              SainiVerse began as a simple heartfelt idea: to create a space that never loses a photograph, never forgets a date, and never stops celebrating Saini. From spontaneous road trips and quiet coffee talks to monumental anniversaries, this archive is our living diary.
            </p>
            <p>
              Every pixel, animation, and color palette was intentionally selected to mirror the warmth, sweetness, and comfort of our relationship.
            </p>
          </div>

          {/* Interactive Stat Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-100 text-center space-y-1">
              <span className="block text-2xl font-extrabold text-rose-600 font-berkshire">
                {daysInfo.days.toLocaleString()}+
              </span>
              <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                Days In Love
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-100 text-center space-y-1">
              <span className="block text-2xl font-extrabold text-rose-600 font-berkshire">
                {memories.length > 0 ? memories.length : '100+'}
              </span>
              <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                Moments Sealed
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-100 text-center space-y-1 col-span-2 sm:col-span-1">
              <span className="block text-2xl font-extrabold text-rose-600 font-berkshire">
                ∞
              </span>
              <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                Endless Devotion
              </span>
            </div>
          </div>
        </CardGlare>
      </section>

      {/* 4. INTERACTIVE ACCORDION: COSMIC SECRETS */}
      <section className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover The Details</span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold text-gray-900 font-berkshire tracking-wide"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            Cosmic Secrets & Insights
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            Tap on any question to uncover the thoughts behind SainiVerse.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item) => {
            const isOpen = activeSecret === item.id;
            const IconComponent = ICON_MAP[item.icon] || Heart;

            return (
              <motion.div
                key={item.id}
                layout
                className={`rounded-2xl transition-all duration-300 border overflow-hidden ${
                  isOpen
                    ? 'bg-white shadow-md border-rose-300 ring-2 ring-rose-100'
                    : 'bg-white/70 hover:bg-white border-rose-200/80 shadow-xs'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSecret(isOpen ? '' : item.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isOpen
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm sm:text-base text-rose-950 font-berkshire tracking-wide">
                      {item.question}
                    </span>
                  </div>

                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ChevronDown className="w-4 h-4 text-rose-500 shrink-0" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-rose-50"
                    >
                      {item.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 5. INTERACTIVE SACRED PROMISE IGNITER */}
      <section className="max-w-2xl mx-auto text-center space-y-4">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-rose-50/90 via-pink-50/80 to-white/90 border border-rose-200/90 shadow-lg space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-rose-600 text-[11px] font-bold shadow-xs">
            <Gift className="w-3.5 h-3.5" />
            <span>Love Pledge</span>
          </div>

          <h3
            className="text-xl sm:text-2xl font-bold text-rose-950 font-berkshire"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            A Promise For Our Orbit
          </h3>

          <div className="min-h-[70px] flex items-center justify-center px-4">
            <motion.p
              key={promiseIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={`text-sm sm:text-base font-serif italic text-rose-900 font-medium leading-relaxed ${
                pledgePulsing ? 'scale-105' : ''
              } transition-transform`}
            >
              “{typeof lovePledges[promiseIndex] === 'string'
                ? lovePledges[promiseIndex]
                : lovePledges[promiseIndex]?.pledge || ''}”
            </motion.p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleNextPromise}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-400/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Spark Another Promise ✨</span>
            </button>
          </div>

          <p className="text-[10px] text-gray-400 font-medium">
            Promise #{promiseIndex + 1} of {lovePledges.length} • Sealed with unconditional love
          </p>
        </div>
      </section>

      {/* 6. BOTTOM NAVIGATION CALL TO ACTION */}
      <section className="text-center pt-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/90 hover:bg-white border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
          <span>Return to SainiVerse Orbit</span>
        </button>
      </section>
    </div>
  );
}
