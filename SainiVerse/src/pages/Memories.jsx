import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useVault } from '../context/VaultContext';
import SecureImage from '../components/SecureImage';
import LightboxModal from '../components/LightboxModal';
import { formatMemoryDate } from '../utils/dateUtils';
import { isPrivateMemory } from '../utils/memoryStorage';
import {
  Heart,
  Sparkles,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  ArrowLeft,
  Cloud,
  Eye,
  Lock,
  Globe,
  Home,
  Check,
} from 'lucide-react';

export default function Memories() {
  const navigate = useNavigate();
  const { memories, selectedMemory, setSelectedMemory, handleDeleteMemory, isLoadingMemories } = useVault();

  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest) | 'asc' (oldest)

  const tags = ['All', 'Special Moment', 'Date Night', 'Vacation', 'Just Us', 'Milestone'];

  // Filter only public memories from Firebase / Cloudflare
  const publicMemories = useMemo(() => {
    return (memories || []).filter((m) => !isPrivateMemory(m));
  }, [memories]);

  // Apply search query, category tag, and sort order
  const filteredAndSortedMemories = useMemo(() => {
    let result = publicMemories;

    // Filter by tag
    if (selectedTag !== 'All') {
      result = result.filter((m) => m.tag === selectedTag);
    }

    // Filter by search query (caption, uploaderName, date)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) => {
        const captionMatch = (m.caption || '').toLowerCase().includes(q);
        const tagMatch = (m.tag || '').toLowerCase().includes(q);
        const uploaderMatch = (m.uploaderName || '').toLowerCase().includes(q);
        const dateMatch = (m.memoryDate || '').toLowerCase().includes(q);
        return captionMatch || tagMatch || uploaderMatch || dateMatch;
      });
    }

    // Sort by memory date
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.memoryDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.memoryDate || b.createdAt || 0).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [publicMemories, selectedTag, searchQuery, sortOrder]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8 animate-fade-in relative z-10">
      {/* 1. TOP HEADER & BREADCRUMB NAVIGATION */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Return Home Button */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-700 text-xs font-bold shadow-xs hover:shadow-sm backdrop-blur-md transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-rose-500" />
            <span>Return to Orbit</span>
          </button>

          {/* Cloudflare & Public Status Pill */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-rose-200 text-rose-800 text-[11px] font-semibold shadow-xs backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Globe className="w-3.5 h-3.5 text-rose-500" />
              <span>Public Chronicle</span>
            </div>
          </div>
        </div>

        {/* Hero Title & Romantic Banner */}
        <div className="text-center space-y-2 max-w-3xl mx-auto pt-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-rose-100/90 border border-rose-200 text-rose-700 text-xs font-bold tracking-wide uppercase shadow-2xs"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
            <span>Memories In Endless Orbit</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
          </motion.div>

          <h1
            className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-Neonderthaw text-rose-600 select-none tracking-wide"
            style={{ fontFamily: "'Neonderthaw', cursive, serif" }}
          >
            Public Memory Gallery
          </h1>

          <p className="text-sm sm:text-base text-gray-600 font-medium max-w-xl mx-auto leading-relaxed">
            Our open chronicle of shared dates, quiet sunsets, and cherished polaroids—streamed securely from our cloud sanctuary.
          </p>
        </div>
      </section>

      {/* 2. GALLERY TOOLBAR (SEARCH, CATEGORY PILLS, SORT ORDER) */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 sm:p-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-rose-200/90 shadow-md">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1 mr-0.5 hidden sm:block" />
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 text-white shadow-md shadow-rose-400/30'
                    : 'bg-white/90 text-gray-600 hover:text-gray-950 border border-rose-200/80 hover:bg-rose-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Search Input & Sort Order Toggle */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories..."
                className="w-full pl-9 pr-3 py-1.5 rounded-2xl bg-white border border-rose-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Sort Toggle Button */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-rose-200 hover:border-rose-300 text-gray-700 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
              title={sortOrder === 'desc' ? 'Sorting: Newest First' : 'Sorting: Oldest First'}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Counter Info Banner */}
        <div className="flex items-center justify-between text-xs text-gray-500 px-1 font-medium">
          <span>
            Showing <strong className="text-rose-700">{filteredAndSortedMemories.length}</strong> public{' '}
            {filteredAndSortedMemories.length === 1 ? 'memory' : 'memories'}
          </span>
          <span className="text-[11px] text-rose-600">
            Click any memory to open high-res lightbox ✨
          </span>
        </div>
      </section>

      {/* 3. PUBLIC MEMORIES GRID OR EMPTY STATE */}
      <section>
        {isLoadingMemories ? (
          <div className="py-20 px-4 text-center max-w-md mx-auto space-y-3 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-500 animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-rose-700 tracking-wider uppercase">Loading Memories...</p>
          </div>
        ) : publicMemories.length === 0 ? (
          /* Empty State: Zero memories in cloud folder */
          <div className="py-16 sm:py-24 px-4 text-center max-w-lg mx-auto bg-white/85 backdrop-blur-xl border border-rose-200/90 rounded-3xl p-8 sm:p-12 space-y-6 shadow-xl animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 border border-rose-200/80 text-rose-500 flex items-center justify-center shadow-md shadow-rose-200/50">
              <Heart className="w-10 h-10 fill-rose-500/20 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3
                className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire"
                style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
              >
                No Memories In Vault Yet
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed font-sans">
                There are currently no photos in the Public_Memories folder of Cloudflare. Upload your first memory from the Private Vault to begin our shared chronicle 💕
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        ) : filteredAndSortedMemories.length === 0 ? (
          /* Filter/Search returned zero matches */
          <div className="py-16 px-4 text-center max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-rose-200 rounded-3xl p-8 space-y-4 shadow-md animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center shadow-xs">
              <Search className="w-7 h-7 text-rose-500" />
            </div>
            <div className="space-y-1">
              <h3
                className="text-xl font-bold text-rose-950 font-berkshire"
                style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
              >
                No matching memories
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {searchQuery
                  ? `No photos found matching "${searchQuery}". Try a different keyword.`
                  : `No memories in category "${selectedTag}". Choose another category or view all.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedTag('All');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredAndSortedMemories.map((memory) => {
              return (
                <motion.div
                  key={memory.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35 }}
                  onClick={() => setSelectedMemory(memory)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="group relative rounded-3xl bg-white/85 hover:bg-white backdrop-blur-md border border-rose-200/90 hover:border-rose-400 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer transform hover:-translate-y-1.5 select-none no-scrape"
                >
                  {/* Photo Container */}
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

                    {/* Category Tag Pill */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-rose-800 border border-rose-200/70 shadow-xs">
                        {memory.tag || 'Moment'}
                      </span>
                    </div>

                    {/* Cloudflare Streaming Verified Pill */}
                    <div
                      className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-amber-700 border border-amber-200 shadow-xs group-hover:scale-110 transition-transform"
                      title="Streamed from Cloudflare R2"
                    >
                      <Cloud className="w-3.5 h-3.5 text-amber-600" />
                    </div>

                    {/* Gradient Overlay for Bottom Legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-rose-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-rose-700 text-xs font-bold shadow-md">
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Moment ✨</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <p
                      className="text-xs sm:text-sm font-berkshire text-rose-950 line-clamp-2 leading-relaxed"
                      style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                    >
                      “{memory.caption || 'A special moment in time.'}”
                    </p>

                    <div className="pt-2.5 border-t border-rose-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-rose-500" />
                        <span>{formatMemoryDate(memory.memoryDate || memory.createdAt)}</span>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        {memory.uploaderName || 'Partner'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. FULL-SCREEN LIGHTBOX MODAL */}
      {selectedMemory && (
        <LightboxModal
          memory={selectedMemory}
          memories={filteredAndSortedMemories}
          isOpen={Boolean(selectedMemory)}
          onClose={() => setSelectedMemory(null)}
          onNavigate={(m) => setSelectedMemory(m)}
          onDelete={handleDeleteMemory}
        />
      )}
    </div>
  );
}
