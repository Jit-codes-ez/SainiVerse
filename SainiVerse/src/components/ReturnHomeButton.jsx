import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ReturnHomeButton({ onReturn }) {
  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onReturn}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/85 hover:bg-white border border-rose-200 text-rose-700 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Home</span>
      </button>
    </div>
  );
}
