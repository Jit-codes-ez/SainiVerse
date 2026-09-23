import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { calculateDaysTogether } from '../utils/dateUtils';
import { HER_BIRTHDAY} from '../utils/specialDates';
import { CardGlare} from '../components/CardGlare';
import { useVault } from '../context/VaultContext';
import {
  Heart,
  Sparkles,
  Clock,
  ArrowLeft,
  Stars,
  PartyPopper,
  Flame,
  Gift,
  CheckCircle2,
} from 'lucide-react';

/**
 * Calculates remaining time components between now and a target Date object.
 */
function calculateTimeRemaining(targetDate) {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isToday: true,
    };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return {
    total: diff,
    days,
    hours,
    minutes,
    seconds,
    isToday: false,
  };
}

export default function Coundown() {
  const navigate = useNavigate();
  const { visitorRole } = useVault();
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Keep live second-by-second ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Anniversary: September 24 (Start: Sept 24, 2023)
  const anniversaryData = useMemo(() => {
    const envDate = import.meta.env.VITE_ANNIVERSARY_DATE || '2023-09-24';
    const [startYear, startMonth, startDay] = envDate.split('-').map(Number);
    const now = currentTime;

    // Calculate next anniversary occurrence
    let nextAnniversary = new Date(now.getFullYear(), (startMonth || 9) - 1, startDay || 24, 0, 0, 0);
    // If today is after this year's anniversary date, set target to next year
    if (nextAnniversary.getTime() + 24 * 60 * 60 * 1000 <= now.getTime()) {
      nextAnniversary = new Date(now.getFullYear() + 1, (startMonth || 9) - 1, startDay || 24, 0, 0, 0);
    }

    const diff = calculateTimeRemaining(nextAnniversary);

    // Calculate milestone year number
    const milestoneYear = nextAnniversary.getFullYear() - startYear;

    return {
      targetDate: nextAnniversary,
      milestoneYear,
      timeRemaining: diff,
      dateFormatted: nextAnniversary.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  }, [currentTime]);

  // Birthday: May 20 (Saini Paul)
  const birthdayData = useMemo(() => {
    const bMonth = (HER_BIRTHDAY.month || 5) - 1; // 0-indexed May
    const bDay = HER_BIRTHDAY.day || 20;
    const now = currentTime;

    let nextBirthday = new Date(now.getFullYear(), bMonth, bDay, 0, 0, 0);
    if (nextBirthday.getTime() + 24 * 60 * 60 * 1000 <= now.getTime()) {
      nextBirthday = new Date(now.getFullYear() + 1, bMonth, bDay, 0, 0, 0);
    }

    const diff = calculateTimeRemaining(nextBirthday);

    const envBirthYear = import.meta.env.VITE_HER_BIRTH_YEAR || HER_BIRTHDAY.birthYear || 2005;
    const birthYear = Number(envBirthYear);
    const targetAge = nextBirthday.getFullYear() - birthYear;

    return {
      targetDate: nextBirthday,
      targetAge,
      birthYear,
      timeRemaining: diff,
      dateFormatted: nextBirthday.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  }, [currentTime]);

  // Days together statistics
  const daysInfo = useMemo(() => calculateDaysTogether(), []);

  // Total seconds in love calculation
  const totalSecondsInLove = useMemo(() => {
    const envDate = import.meta.env.VITE_ANNIVERSARY_DATE || '2023-09-24';
    const start = new Date(envDate);
    const diffMs = Math.max(0, currentTime.getTime() - start.getTime());
    return Math.floor(diffMs / 1000);
  }, [currentTime]);

  // Confetti launcher
  const fireConfetti = () => {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#f43f5e', '#fb7185', '#fda4af', '#f59e0b', '#fbbf24', '#ffffff'],
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-10 sm:space-y-14 animate-fade-in relative z-10 selection:bg-rose-300/40">
      {/* 1. TOP BAR / BREADCRUMB */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        {/* Return Home Button */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-700 text-xs font-bold shadow-xs hover:shadow-sm backdrop-blur-md transition-all cursor-pointer group active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-rose-500" />
          <span>Return Home</span>
        </button>

        {/* Live Orbit Status and Confetti Button */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-rose-200 text-rose-800 text-[11px] font-semibold shadow-xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>Ticking Live In SainiVerse</span>
          </div>

          <button
            type="button"
            onClick={fireConfetti}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer active:scale-95"
            title="Shower Celebration Confetti"
          >
            <PartyPopper className="w-3.5 h-3.5" />
            <span>Celebrate 💕</span>
          </button>
        </div>
      </section>

      {/* 2. HERO DEDICATION BANNER */}
      <section className="text-center space-y-3 max-w-3xl mx-auto pt-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-rose-100/90 border border-rose-200 text-rose-700 text-xs font-bold tracking-wide uppercase shadow-2xs"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
          <span>Our Cosmic Milestones</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
        </motion.div>

        <h1
          className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-Neonderthaw text-rose-600 tracking-wide select-none"
          style={{ fontFamily: "'Neonderthaw', cursive, serif" }}
        >
          Countdown to Forever
        </h1>

        <p className="text-sm sm:text-base text-gray-600 font-medium max-w-xl mx-auto leading-relaxed">
          Every second, minute, and breath brings us closer to celebrating another unforgettable milestone in our universe.
        </p>

        {/* Days In Love Badge */}
        <div className="pt-2">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-rose-200/90 text-rose-900 font-bold text-xs sm:text-sm shadow-sm">
            <Flame className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            <span>{daysInfo.formatted}</span>
            <span className="text-gray-300">•</span>
            <span className="text-rose-600 font-normal">Since September 24, 2023</span>
          </span>
        </div>
      </section>

      {/* 3. DUAL SPECIAL COUNTDOWNS (ANNIVERSARY + BIRTHDAY) */}
      <section className="space-y-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          
          {/* COUNTDOWN 1: NEXT ANNIVERSARY */}
          <CardGlare
            borderWidth={3}
            duration={7}
            shineColor={['#e11d48', '#fb718e', '#ffffff']}
            className="w-full h-full rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300"
            innerClassName="relative h-full flex flex-col justify-between space-y-6 bg-white/95 backdrop-blur-xl rounded-[22px] p-5 sm:p-8 overflow-hidden text-left border border-rose-200/80"
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>Anniversary Milestone 💍</span>
              </div>
              <span className="text-[11px] font-semibold text-rose-600">
                Year {anniversaryData.milestoneYear} Celebration
              </span>
            </div>

            {/* Title & Date */}
            <div className="space-y-1">
              <h3
                className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire tracking-wide"
                style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
              >
                Our Next Anniversary
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                {anniversaryData.dateFormatted}
              </p>
            </div>

            {/* Real-time Countdown Digits */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 py-2">
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-rose-50/90 border border-rose-200/90 shadow-2xs">
                <span className="text-2xl sm:text-4xl font-bold font-berkshire text-rose-700" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
                  {String(anniversaryData.timeRemaining.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-rose-900 uppercase tracking-widest mt-1">Days</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-rose-50/90 border border-rose-200/90 shadow-2xs">
                <span className="text-2xl sm:text-4xl font-bold font-berkshire text-rose-700" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
                  {String(anniversaryData.timeRemaining.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-rose-900 uppercase tracking-widest mt-1">Hours</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-rose-50/90 border border-rose-200/90 shadow-2xs">
                <span className="text-2xl sm:text-4xl font-bold font-berkshire text-rose-700" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
                  {String(anniversaryData.timeRemaining.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-rose-900 uppercase tracking-widest mt-1">Mins</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-rose-100/90 border border-rose-300 shadow-xs">
                <span className="text-2xl sm:text-4xl font-bold font-berkshire text-rose-800 animate-pulse" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
                  {String(anniversaryData.timeRemaining.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-rose-950 uppercase tracking-widest mt-1">Secs</span>
              </div>
            </div>

            {/* Romantic Note */}
            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/70 text-xs text-rose-900/90 leading-relaxed font-sans">
              {anniversaryData.timeRemaining.days === 0 ? (
                <p className="font-semibold text-rose-700">
                  ✨ Our anniversary celebration is happening right now! Happy Anniversary, my beloved heart! 💕
                </p>
              ) : (
                <p>
                  Another year of choosing you, laughing with you, and building our eternal universe together. Forever isn't long enough.
                </p>
              )}
            </div>
          </CardGlare>

          {/* COUNTDOWN 2: HER BIRTHDAY (SAINI PAUL) */}
          <CardGlare
            borderWidth={3}
            duration={7}
            shineColor={['#f59e0b', '#fb7185', '#ffffff']}
            className="w-full h-full rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300"
            innerClassName="relative h-full flex flex-col justify-between space-y-6 bg-white/95 backdrop-blur-xl rounded-[22px] p-5 sm:p-8 overflow-hidden text-left border border-amber-200/80"
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <Gift className="w-3.5 h-3.5 text-amber-600" />
                <span>Birthday Queen 🎂</span>
              </div>
              <span className="text-[11px] font-semibold text-amber-700">
                Turning {birthdayData.targetAge} Celebration
              </span>
            </div>

            {/* Title & Date */}
            <div className="space-y-1">
              <h3
                className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire tracking-wide"
                style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
              >
                Saini's Next Birthday
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                {birthdayData.dateFormatted}
              </p>
            </div>

            {/* Real-time Countdown Digits */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 py-2">
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-2xs">
                <span className="text-2xl sm:text-4xl font-bold font-berkshire text-amber-800" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
                  {String(birthdayData.timeRemaining.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-950 uppercase tracking-widest mt-1">Days</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-2xs">
                <span className="text-2xl sm:text-4xl font-bold font-berkshire text-amber-800" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
                  {String(birthdayData.timeRemaining.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-950 uppercase tracking-widest mt-1">Hours</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-2xs">
                <span className="text-2xl sm:text-4xl font-bold font-berkshire text-amber-800" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
                  {String(birthdayData.timeRemaining.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-950 uppercase tracking-widest mt-1">Mins</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-amber-100/90 border border-amber-300 shadow-xs">
                <span className="text-2xl sm:text-4xl font-bold font-berkshire text-amber-900 animate-pulse" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
                  {String(birthdayData.timeRemaining.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-950 uppercase tracking-widest mt-1">Secs</span>
              </div>
            </div>

            {/* Birthday Queen Dedication */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900/90 leading-relaxed font-sans">
              {birthdayData.timeRemaining.days === 0 ? (
                <p className="font-semibold text-rose-700">
                  🎂 Happy Birthday to the girl who brings beauty, grace, and joy to everything! Celebrating Her {birthdayData.targetAge}th Birthday! 🌸
                </p>
              ) : (
                <p>
                  Celebrating the most radiant soul in my universe turning {birthdayData.targetAge}. The girl who makes every morning brighter and my whole world full of love.
                </p>
              )}
            </div>
          </CardGlare>

        </div>
      </section>

      {/* 4. TOTAL TIME CHERISHED (COSMIC ORBIT COUNTER) */}
      <section className="max-w-6xl mx-auto space-y-4">
        <div className="text-center sm:text-left space-y-1">
          <div className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Exact Orbit Duration</span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire tracking-wide"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            Every Second In Love
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <CardGlare
            borderWidth={1.5}
            duration={9}
            shineColor={['#e11d48', '#fda4af', '#ffffff']}
            className="rounded-3xl shadow-sm hover:shadow-md transition-all"
            innerClassName="p-5 rounded-[22px] bg-white/90 backdrop-blur-xl text-center space-y-1"
          >
            <span className="text-2xl sm:text-3xl font-bold font-berkshire text-rose-700" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
              {daysInfo.days.toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Days Together</p>
          </CardGlare>

          <CardGlare
            borderWidth={1.5}
            duration={9}
            shineColor={['#e11d48', '#fda4af', '#ffffff']}
            className="rounded-3xl shadow-sm hover:shadow-md transition-all"
            innerClassName="p-5 rounded-[22px] bg-white/90 backdrop-blur-xl text-center space-y-1"
          >
            <span className="text-2xl sm:text-3xl font-bold font-berkshire text-rose-700" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
              {(daysInfo.days * 24 + currentTime.getHours()).toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Hours In Orbit</p>
          </CardGlare>

          <CardGlare
            borderWidth={1.5}
            duration={9}
            shineColor={['#e11d48', '#fda4af', '#ffffff']}
            className="rounded-3xl shadow-sm hover:shadow-md transition-all"
            innerClassName="p-5 rounded-[22px] bg-white/90 backdrop-blur-xl text-center space-y-1"
          >
            <span className="text-2xl sm:text-3xl font-bold font-berkshire text-rose-700" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
              {(daysInfo.days * 24 * 60 + currentTime.getHours() * 60 + currentTime.getMinutes()).toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Minutes Of Peace</p>
          </CardGlare>

          <CardGlare
            borderWidth={1.5}
            duration={9}
            shineColor={['#e11d48', '#fda4af', '#ffffff']}
            className="rounded-3xl shadow-sm hover:shadow-md transition-all"
            innerClassName="p-5 rounded-[22px] bg-white/90 backdrop-blur-xl text-center space-y-1"
          >
            <span className="text-2xl sm:text-3xl font-bold font-berkshire text-rose-700 font-mono tracking-tight" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
              {totalSecondsInLove.toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Seconds Loved</p>
          </CardGlare>
        </div>
      </section>

      {/* 5. MILESTONE CHRONOLOGY ROADMAP */}
      <section className="max-w-6xl mx-auto space-y-6 pt-2">
        <div className="text-center sm:text-left space-y-1">
          <div className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider">
            <Stars className="w-3.5 h-3.5" />
            <span>Milestone Chronology</span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire tracking-wide"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            Chapters In Our Constellation
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <CardGlare
            borderWidth={2}
            duration={8}
            shineColor={['#10b981', '#6ee7b7', '#ffffff']}
            className="rounded-3xl shadow-sm hover:shadow-md transition-all"
            innerClassName="p-6 rounded-[22px] bg-white/90 backdrop-blur-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                Origin Day
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <h4 className="text-lg font-bold text-rose-950 font-berkshire" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
              September 24, 2023
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              The day our cosmic collision occurred and SainiVerse began its endless orbit.
            </p>
          </CardGlare>

          <CardGlare
            borderWidth={2}
            duration={7}
            shineColor={['#e11d48', '#fb718e', '#ffffff']}
            className="rounded-3xl shadow-sm hover:shadow-md transition-all"
            innerClassName="p-6 rounded-[22px] bg-white/90 backdrop-blur-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                Upcoming Milestone
              </span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <h4 className="text-lg font-bold text-rose-950 font-berkshire" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
              September 24, 2026
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              Year {anniversaryData.milestoneYear} Anniversary celebration milestone: {anniversaryData.milestoneYear} full circles around the sun with my favorite person.
            </p>
          </CardGlare>

          <CardGlare
            borderWidth={2}
            duration={7.5}
            shineColor={['#f59e0b', '#fb7185', '#ffffff']}
            className="rounded-3xl shadow-sm hover:shadow-md transition-all"
            innerClassName="p-6 rounded-[22px] bg-white/90 backdrop-blur-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                Birthday Royalty
              </span>
              <Gift className="w-4 h-4 text-rose-500" />
            </div>
            <h4 className="text-lg font-bold text-rose-950 font-berkshire" style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}>
              {birthdayData.dateFormatted}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              Celebrating Saini Paul turning {birthdayData.targetAge} — dedicated to the girl who brings wonder to every heartbeat.
            </p>
          </CardGlare>
        </div>
      </section>

      {/* 6. ROMANTIC DEDICATION PLEDGE */}
      <section className="max-w-4xl mx-auto pt-4 pb-4">
        <CardGlare
          borderWidth={2.5}
          duration={8}
          shineColor={['#ffffff', '#fda4af', '#ffffff']}
          className="rounded-3xl shadow-xl"
          innerClassName="rounded-[22px] p-6 sm:p-10 bg-gradient-to-tr from-rose-500 via-rose-600 to-pink-500 text-white text-center space-y-4"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <Heart className="w-6 h-6 fill-white" />
          </div>

          <h3
            className="text-2xl sm:text-4xl font-bold tracking-wide font-berkshire"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            "I would choose you in every lifetime, in every universe."
          </h3>

          <p
            className="text-base sm:text-xl font-Arizonia text-rose-100 max-w-xl mx-auto"
            style={{ fontFamily: "'Arizonia', cursive, serif" }}
          >
            Dedicated to Saini Paul, from Jit with infinite love 💕
          </p>
        </CardGlare>
      </section>
    </div>
  );
}
