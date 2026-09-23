import React, { useState } from 'react';
import { Heart, ArrowUp } from 'lucide-react';

export default function VaultFooter() {
  const [beating, setBeating] = useState(false);

  const handleHeartClick = () => {
    setBeating(true);
    setTimeout(() => setBeating(false), 800);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full py-6 border-t border-rose-200/80 relative z-10 bg-white/50 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium">
          <span
            className="font-berkshire text-rose-950 font-bold tracking-wide"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            SainiVerse
          </span>
          <button
            type="button"
            onClick={handleHeartClick}
            className="group cursor-pointer p-1 transition-transform active:scale-90"
            title="A heartbeat for her 💕"
          >
            <Heart
              className={`w-4 h-4 text-rose-500 fill-rose-500 transition-all duration-300 ${
                beating ? 'scale-150 animate-bounce' : 'animate-pulse group-hover:scale-125'
              }`}
            />
          </button>
          <span className="text-gray-700">Dedicated With Love To Her</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
          <span>Curated memories, endless orbit</span>
          <span>•</span>
          <span>All rights reserved © 2026</span>
          <span>•</span>
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer transition-colors"
            title="Scroll to top"
          >
            <ArrowUp className="w-3 h-3" />
            <span>Top</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
