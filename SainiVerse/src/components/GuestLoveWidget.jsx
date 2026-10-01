import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'sainiverse_love_meter_count';
const LEGACY_STORAGE_KEY = 'sainiverse_guest_love_count';

const MIN_LOVE = 150;
const MAX_LOVE = 999;

/**
 * Returns a static initial count for Love Meter that changes on every page reload,
 * guaranteeing a different value than the previous reload/session count.
 */
function getInitialLoveCount() {
  if (typeof window === 'undefined') return 365;

  let prevVal = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) prevVal = parsed;
    }
  } catch {
    // Ignore localStorage access errors
  }

  let nextVal;
  let attempts = 0;
  // Ensure the new value on reload is distinct from the previous value
  do {
    nextVal = Math.floor(Math.random() * (MAX_LOVE - MIN_LOVE + 1)) + MIN_LOVE;
    attempts++;
  } while (prevVal !== null && Math.abs(nextVal - prevVal) < 25 && attempts < 50);

  try {
    localStorage.setItem(STORAGE_KEY, String(nextVal));
  } catch {
    // Ignore quota/security errors
  }

  return nextVal;
}

export default function GuestLoveWidget({ visitorRole }) {
  const [loveCount, setLoveCount] = useState(getInitialLoveCount);
  const [hasSent, setHasSent] = useState(false);

  const handleSendLove = () => {
    const newCount = loveCount + 1;
    setLoveCount(newCount);
    try {
      localStorage.setItem(STORAGE_KEY, String(newCount));
    } catch {
      // Ignore
    }
    setHasSent(true);

    confetti({
      particleCount: 30,
      spread: 60,
      origin: { x: 0.9, y: 0.88 },
      colors: ['#f43f6e', '#fb718e', '#fda4b4', '#ffd1dc'],
    });

    setTimeout(() => setHasSent(false), 2000);
  };

  return (
    <div className="fixed bottom-3.5 right-3.5 sm:bottom-6 sm:right-6 z-40 animate-slide-up">
      <button
        onClick={handleSendLove}
        className="group flex items-center gap-2 sm:gap-2.5 px-3 xs:px-3.5 sm:px-4 py-1.5 xs:py-2 sm:py-2.5 rounded-full bg-white/95 hover:bg-rose-50 border border-rose-200/90 text-gray-700 shadow-lg shadow-rose-300/25 hover:shadow-rose-300/40 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
        title="Tap to add hearts to the Love Meter"
      >
        <div className={`w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 transition-all duration-300 ${hasSent ? 'scale-125 ring-2 ring-rose-400 bg-rose-200' : 'group-hover:scale-110'}`}>
          <Heart className={`w-4 h-4 fill-rose-500 text-rose-500 ${hasSent ? 'animate-bounce' : 'animate-pulse'}`} />
        </div>
        <div className="text-left">
          <div className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
            <span>Love Meter</span>
            <Sparkles className="w-3 h-3 text-rose-400" />
            {hasSent && (
              <span className="text-[10px] text-rose-500 font-bold transition-opacity duration-300">+1</span>
            )}
          </div>
          <div className="text-[10px] text-rose-600 font-semibold">
            {loveCount.toLocaleString()} hearts recorded
          </div>
        </div>
      </button>
    </div>
  );
}

