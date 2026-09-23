import React, { useState } from 'react';
import SecureImage from './SecureImage';
import { formatMemoryDate } from '../utils/dateUtils';
import { Heart, Calendar, Plus, Filter, Lock, Sparkles, Eye } from 'lucide-react';

export default function Gallery({
  memories = [],
  onSelectMemory,
  onOpenUpload,
  visitorRole = 'girlfriend',
}) {
  const [selectedTag, setSelectedTag] = useState('All');

  const tags = ['All', 'Special Moment', 'Date Night', 'Vacation', 'Just Us', 'Milestone'];

  const rawFilteredMemories =
    selectedTag === 'All'
      ? memories
      : memories.filter((m) => m.tag === selectedTag);

  // Guarantee strict deduplication by id
  const filteredMemories = Array.from(
    new Map(rawFilteredMemories.map((m) => [m.id, m])).values()
  );

  const isGuest = visitorRole === 'guest';

  if (memories.length === 0) {
    return (
      <div className="py-20 px-4 text-center max-w-lg mx-auto animate-fade-in relative z-10">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-white/80 border border-rose-200 flex items-center justify-center mb-6 shadow-md shadow-rose-200/50">
          <Heart className="w-10 h-10 text-rose-500 fill-rose-500/20 animate-heartbeat" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">
          {isGuest ? 'The Story Begins Here' : 'Your Sanctuary Awaits Its First Memory'}
        </h3>
        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
          {isGuest
            ? 'New memories will appear here soon as their journey unfolds.'
            : 'Every love story has moments that deserve to be kept safe forever. Upload your first private photo together.'}
        </p>
        {!isGuest && (
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold text-sm shadow-xl shadow-rose-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Upload First Memory</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-5 sm:py-8 max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 animate-fade-in relative z-10">
      
      {/* Editorial Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10 px-1 xs:px-2">
        <div className="inline-flex items-center gap-1.5 xs:gap-2 px-3 py-1 rounded-full bg-rose-100/90 border border-rose-200/80 text-[10px] xs:text-[11px] font-semibold text-rose-700 uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>{isGuest ? "Welcome, Friend & Guest" : "Private Vault For Two"}</span>
        </div>
        <h2 className="text-xl xs:text-2xl sm:text-3xl font-serif font-bold text-gray-800 tracking-tight">
          {isGuest ? "Moments of Love & Adventure" : "Our Treasury of Memories"}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1.5 xs:mt-2 font-sans leading-relaxed">
          {isGuest
            ? "A celebration of laughter, travel, and quiet happiness—dedicated to the girl who brings beauty to everything."
            : "Every photo, smile, and trip we've shared, securely stored in our private corner of the universe."}
        </p>
      </div>

      {/* Category / Tag Filters */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 mb-5 sm:mb-8 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Filter className="w-4 h-4 text-rose-400 shrink-0 mr-1 hidden sm:block" />
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 xs:px-3.5 py-1 xs:py-1.5 rounded-full text-[11px] xs:text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTag === tag
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-400/30'
                  : 'bg-white/85 text-gray-600 hover:text-gray-900 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="text-xs text-rose-500 font-medium hidden sm:block">
          {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'} displayed
        </div>
      </div>

      {/* Grid of Memories */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 xs:gap-4 sm:gap-6">
        {filteredMemories.map((memory) => {
          const isUploaderJith = (memory.uploadedBy || '').toLowerCase().includes('jith');

          return (
            <div
              key={memory.id}
              onClick={() => onSelectMemory(memory)}
              className="group pastel-card rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col no-scrape"
            >
              {/* Photo Area */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-rose-50">
                <SecureImage
                  storageKey={memory.storageKey}
                  storagePath={memory.storagePath || memory.storageKey}
                  fileName={memory.fileName}
                  fallbackData={memory.fallbackData}
                  alt={memory.caption}
                  containerClassName="w-full h-full"
                  className="group-hover:scale-105 transition-transform duration-500"
                />

                {/* Tag Pill */}
                {memory.tag && (
                  <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md text-[11px] font-semibold text-rose-700 border border-rose-200/80 shadow-xs">
                    {memory.tag}
                  </div>
                )}

                {/* Encrypted badge */}
                <div className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center text-rose-600 border border-rose-200/80 shadow-xs">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <p className="text-sm font-serif text-gray-800 line-clamp-2 mb-3 leading-snug font-medium">
                  "{memory.caption || 'A special moment in time.'}"
                </p>

                <div className="pt-2.5 border-t border-rose-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-medium">{formatMemoryDate(memory.memoryDate || memory.createdAt)}</span>
                  </div>

                  {/* Partner tag */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      isUploaderJith
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-pink-100 text-pink-700 border border-pink-200'
                    }`}
                  >
                    {memory.uploaderName || (isUploaderJith ? 'Jith' : 'Her')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
