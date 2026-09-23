import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function StatusToast({ message }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 right-3.5 sm:bottom-20 sm:right-6 z-50 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-white border border-rose-300 text-rose-700 text-xs font-semibold shadow-xl flex items-center gap-2.5 animate-slide-up max-w-[85vw] sm:max-w-none"
    >
      <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
