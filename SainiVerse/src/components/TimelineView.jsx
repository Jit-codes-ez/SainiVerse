import React from 'react';
import SecureImage from './SecureImage';
import { formatMemoryDate, formatTimelinePeriod } from '../utils/dateUtils';
import { Heart, Clock, Sparkles } from 'lucide-react';

export default function TimelineView({
  memories = [],
  onSelectMemory,
  onOpenUpload,
  visitorRole = 'girlfriend',
}) {
  const isGuest = visitorRole === 'guest';

  if (memories.length === 0) {
    return (
      <div className="py-20 px-4 text-center max-w-lg mx-auto animate-fade-in relative z-10">
        <Clock className="w-12 h-12 mx-auto text-rose-500 mb-4" />
        <h3 className="text-xl font-serif font-bold text-gray-800 mb-2">
          {isGuest ? 'The Story Will Unfold Here' : 'Your Timeline Begins Here'}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          {isGuest
            ? 'Milestones will be recorded here chronologically.'
            : 'Upload moments together to watch your journey unfold chronologically.'}
        </p>
        {!isGuest && (
          <button
            onClick={onOpenUpload}
            className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-400/30"
          >
            Add First Memory
          </button>
        )}
      </div>
    );
  }

  // Sort memories chronologically (newest first)
  const sortedMemories = [...memories].sort((a, b) => {
    const dateA = new Date(a.memoryDate || a.createdAt).getTime();
    const dateB = new Date(b.memoryDate || b.createdAt).getTime();
    return dateB - dateA;
  });

  // Group by "Month Year"
  const groupedMemories = sortedMemories.reduce((acc, memory) => {
    const period = formatTimelinePeriod(memory.memoryDate || memory.createdAt);
    if (!acc[period]) acc[period] = [];
    acc[period].push(memory);
    return acc;
  }, {});

  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto px-3 xs:px-4 sm:px-6 animate-fade-in relative z-10">
      {/* Intro */}
      <div className="text-center mb-8 sm:mb-12 px-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/90 border border-rose-200/80 text-[10px] xs:text-[11px] font-semibold text-rose-700 uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>{isGuest ? 'Our Story Through Time' : 'Chronicles of Us'}</span>
        </div>
        <h2 className="text-xl xs:text-2xl sm:text-3xl font-serif font-bold text-gray-800 mt-1">
          {isGuest ? 'Every Chapter, Every Milestone' : 'Our Beautiful Journey'}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-md mx-auto">
          {isGuest
            ? 'Tracing the steps of our story from the very beginning to today.'
            : 'Every season, every laugh, and every unforgettable day together.'}
        </p>
      </div>

      <div className="relative border-l-2 border-rose-300 ml-2 xs:ml-4 sm:ml-20 md:ml-32 space-y-8 sm:space-y-12">
        {Object.entries(groupedMemories).map(([period, items]) => (
          <div key={period} className="relative">
            {/* Timeline Period Marker */}
            <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 -ml-[9px]">
              <div className="w-4 h-4 rounded-full bg-rose-500 ring-4 ring-rose-200 shadow-md shadow-rose-400/40" />
              <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white border border-rose-200 text-xs font-serif font-bold text-rose-700 shadow-sm">
                {period}
              </div>
            </div>

            {/* List of Memories for this period */}
            <div className="space-y-4 sm:space-y-6 ml-3 xs:ml-6">
              {items.map((memory) => {
                const isUploaderJith = (memory.uploadedBy || '').toLowerCase().includes('jith');

                return (
                  <div
                    key={memory.id}
                    onClick={() => onSelectMemory(memory)}
                    className="pastel-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 cursor-pointer transition-all duration-300 flex flex-col sm:flex-row gap-3.5 sm:gap-5 items-start sm:items-center no-scrape"
                  >
                    {/* Thumbnail */}
                    <div className="w-full sm:w-44 h-40 rounded-2xl overflow-hidden shrink-0 bg-rose-50 border border-rose-200">
                      <SecureImage
                        storageKey={memory.storageKey}
                        storagePath={memory.storagePath || memory.storageKey}
                        fileName={memory.fileName}
                        fallbackData={memory.fallbackData}
                        alt={memory.caption}
                        containerClassName="w-full h-full"
                        className="hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-rose-600 font-semibold mb-1.5">
                        <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                        <span>{memory.tag || 'Special Moment'}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 font-normal">
                          {formatMemoryDate(memory.memoryDate || memory.createdAt)}
                        </span>
                      </div>

                      <h4 className="text-base font-serif font-bold text-gray-800 mb-3 leading-snug">
                        "{memory.caption || 'A treasured snapshot in time.'}"
                      </h4>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] px-3 py-0.5 rounded-full font-semibold ${
                            isUploaderJith
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-pink-100 text-pink-700 border border-pink-200'
                          }`}
                        >
                          Uploaded by {memory.uploaderName || (isUploaderJith ? 'Jith' : 'Her')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
