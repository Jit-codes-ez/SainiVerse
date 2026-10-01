import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'sainiverse_global_love_count';

export default function GuestLoveWidget({ visitorRole }) {
  const [loveCount, setLoveCount] = useState(0);
  const [hasSent, setHasSent] = useState(false);

  // Track ongoing in-flight user taps
  const inFlightTapsRef = useRef(0);

  // Synchronize global count from server on mount and keep updated
  useEffect(() => {
    let isMounted = true;

    // Clean up old legacy keys that may contain stale demo counts
    try {
      localStorage.removeItem('sainiverse_guest_love_count');
      localStorage.removeItem('sainiverse_love_meter_count');
    } catch {
      // Ignore
    }

    const fetchGlobalCount = async () => {
      try {
        const res = await fetch(`/api/love-meter?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.count === 'number') {
            // Authoritative server sync: Only update if no local taps are currently in flight
            if (inFlightTapsRef.current === 0) {
              setLoveCount(data.count);
              try {
                localStorage.setItem(STORAGE_KEY, String(data.count));
              } catch {
                // Ignore storage error
              }
            }
          }
        }
      } catch (err) {
        // Silently retain current count if offline
      }
    };

    // Initial fetch on mount
    fetchGlobalCount();

    // Periodic polling (every 5 seconds) so all users see real-time updates
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchGlobalCount();
      }
    }, 5000);

    // Re-sync whenever the user switches back to this tab
    const handleFocus = () => fetchGlobalCount();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const handleSendLove = async () => {
    // 1. Increment in-flight tap counter and update UI optimistically
    inFlightTapsRef.current += 1;
    setLoveCount((prev) => prev + 1);
    setHasSent(true);

    // 2. Celebratory Confetti Burst
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { x: 0.9, y: 0.88 },
      colors: ['#f43f6e', '#fb718e', '#fda4b4', '#ffd1dc'],
    });

    setTimeout(() => setHasSent(false), 2000);

    // 3. Atomically increment global counter on serverless R2 backend
    try {
      const res = await fetch('/api/love-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.count === 'number') {
          inFlightTapsRef.current = Math.max(0, inFlightTapsRef.current - 1);
          const targetCount = data.count + inFlightTapsRef.current;
          setLoveCount(targetCount);
          try {
            localStorage.setItem(STORAGE_KEY, String(targetCount));
          } catch {
            // Ignore
          }
        }
      } else {
        inFlightTapsRef.current = Math.max(0, inFlightTapsRef.current - 1);
      }
    } catch (err) {
      inFlightTapsRef.current = Math.max(0, inFlightTapsRef.current - 1);
      console.warn('[LoveMeter] Network increment note:', err?.message || err);
    }
  };

  return (
    <div className="fixed bottom-3.5 right-3.5 sm:bottom-6 sm:right-6 z-40 animate-slide-up">
      <button
        onClick={handleSendLove}
        className="group flex items-center gap-2 sm:gap-2.5 px-3 xs:px-3.5 sm:px-4 py-1.5 xs:py-2 sm:py-2.5 rounded-full bg-white/95 hover:bg-rose-50 border border-rose-200/90 text-gray-700 shadow-lg shadow-rose-300/25 hover:shadow-rose-300/40 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
        title="Tap to add hearts to the global Love Meter"
      >
        <div
          className={`w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 transition-all duration-300 ${
            hasSent ? 'scale-125 ring-2 ring-rose-400 bg-rose-200' : 'group-hover:scale-110'
          }`}
        >
          <Heart
            className={`w-4 h-4 fill-rose-500 text-rose-500 ${
              hasSent ? 'animate-bounce' : 'animate-pulse'
            }`}
          />
        </div>
        <div className="text-left">
          <div className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
            <span>Love Meter</span>
            <Sparkles className="w-3 h-3 text-rose-400" />
            {hasSent && (
              <span className="text-[10px] text-rose-500 font-bold transition-opacity duration-300">
                +1
              </span>
            )}
          </div>
          <div className="text-[10px] text-rose-600 font-semibold">
            {loveCount.toLocaleString()} {loveCount === 1 ? 'heart recorded' : 'hearts recorded'}
          </div>
        </div>
      </button>
    </div>
  );
}


