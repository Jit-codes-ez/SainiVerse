import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Sparkles,
  Heart,
  User,
  Search,
  Trash2,
  X,
  Disc,
  Radio,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { deleteSongFromFirestore } from '../utils/musicStorage';

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function MusicPage() {
  const navigate = useNavigate();
  const {
    isPlaying,
    currentTrack,
    playlist,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    toggleMusic,
    playTrack,
    nextTrack,
    prevTrack,
    seekTo,
    changeVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  } = useAudio();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUploaderFilter, setSelectedUploaderFilter] = useState('all'); // 'all' | 'jit' | 'saini'

  // Delete Confirmation State
  const [songToDelete, setSongToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered Playlist
  const filteredPlaylist = useMemo(() => {
    return playlist.filter((track) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (track.title || '').toLowerCase().includes(q) ||
        (track.artist || '').toLowerCase().includes(q) ||
        (track.dedication || '').toLowerCase().includes(q);

      const matchUploader =
        selectedUploaderFilter === 'all' ||
        (selectedUploaderFilter === 'jit' &&
          (track.uploaderName || '').toLowerCase().includes('jit')) ||
        (selectedUploaderFilter === 'saini' &&
          (track.uploaderName || '').toLowerCase().includes('saini'));

      return matchSearch && matchUploader;
    });
  }, [playlist, searchQuery, selectedUploaderFilter]);

  const handleConfirmDelete = async () => {
    if (!songToDelete) return;
    try {
      setIsDeleting(true);
      await deleteSongFromFirestore(songToDelete);
      setSongToDelete(null);
    } catch (err) {
      console.error('Failed to delete song:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const currentProgressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasMusic = playlist.length > 0;

  return (
    <div className="min-h-screen relative pb-24 selection:bg-rose-300/40 selection:text-rose-900">
      {/* Background Ambient Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[420px] bg-gradient-to-b from-rose-200/40 via-pink-100/30 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 1. HERO HEADER */}
        <section className="text-center space-y-3 pt-2 sm:pt-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-rose-200 text-rose-700 text-xs font-semibold shadow-xs"
          >
            <Radio className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
            <span>Celestial Melody Sanctuary</span>
            <Radio className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-ping shrink-0" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold font-berkshire text-rose-950 tracking-tight"
            style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
          >
            Universe Playlist & Melodies
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-arizonia text-lg sm:text-xl md:text-2xl text-rose-800 max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'Arizonia', cursive, serif" }}
          >
            The soundtrack to our love, floating across the stars in endless orbit
          </motion.p>
        </section>

        {/* 2. ADVANCED ANIMATED MUSIC PLAYER (HERO DECK) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl bg-white/85 hover:bg-white/95 backdrop-blur-xl border border-rose-200 shadow-2xl shadow-rose-300/30 p-5 sm:p-8 overflow-hidden"
        >
          {/* Subtle Heart Background Pattern */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-rose-100/50 blur-2xl pointer-events-none -z-10" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-pink-100/50 blur-2xl pointer-events-none -z-10" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* LEFT / CENTER: Animated Spinning Vinyl Record */}
            <div className="md:col-span-5 flex flex-col items-center justify-center relative">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 flex items-center justify-center">
                {/* Turntable Base Glow */}
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-700 ${
                    isPlaying
                      ? 'bg-gradient-to-tr from-rose-500/20 via-pink-400/25 to-amber-400/20 blur-xl scale-105'
                      : 'bg-rose-100/40 blur-md'
                  }`}
                />

                {/* Spinning Vinyl Disc */}
                <div
                  className={`relative w-full h-full rounded-full bg-[#121216] shadow-2xl border-4 border-[#22222a] flex items-center justify-center transition-all ${
                    isPlaying && hasMusic ? 'animate-[spin_6s_linear_infinite]' : ''
                  }`}
                  style={{
                    boxShadow:
                      'inset 0 0 0 10px #1a1a24, inset 0 0 0 20px #15151e, inset 0 0 0 30px #1e1e28, 0 10px 25px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Vinyl Grooves Rings */}
                  <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-12 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-16 rounded-full border border-white/5 pointer-events-none" />

                  {/* Center Label: Heart Badge */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 border-2 border-white/80 shadow-md flex flex-col items-center justify-center text-white select-none">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white animate-pulse" />
                    <span
                      className="text-[8px] sm:text-[9px] font-bold tracking-tighter uppercase font-serif mt-0.5"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      SainiVerse
                    </span>
                  </div>

                  {/* Center Spindle Hole */}
                  <div className="absolute w-3 h-3 rounded-full bg-[#0d0d12] border border-white/20" />
                </div>

                {/* Stylus / Tonearm Indicator */}
                <div
                  className={`absolute -top-3 right-2 w-8 h-20 transition-transform duration-500 origin-top pointer-events-none ${
                    isPlaying && hasMusic ? 'rotate-12' : '-rotate-12 opacity-70'
                  }`}
                >
                  <div className="w-1.5 h-14 bg-gradient-to-b from-gray-400 to-gray-200 mx-auto rounded-full shadow-md" />
                  <div className="w-3 h-4 bg-amber-400 rounded-sm mx-auto shadow-sm -mt-0.5" />
                </div>
              </div>

              {/* Dynamic Dancing Multi-Band Equalizer Waves */}
              <div className="flex items-end gap-1 mt-4 h-7 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80">
                {[12, 22, 16, 26, 18, 28, 14, 24, 20, 28, 15, 25, 17, 23, 19].map((height, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-gradient-to-t from-rose-500 to-pink-500 transition-all duration-300"
                    style={{
                      height: isPlaying && hasMusic ? `${Math.max(4, height + (i % 2 === 0 ? 3 : -3))}px` : '4px',
                      opacity: isPlaying && hasMusic ? 1 : 0.4,
                      animation: isPlaying && hasMusic ? `pulse 0.8s ease-in-out infinite ${i * 0.08}s` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* RIGHT: Song Metadata, Scrubber & Full Control Deck */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-5">
              {/* Top Badges & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200/70 inline-flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    <span>{hasMusic ? 'Now Orbiting' : 'Vault Quiet'}</span>
                  </span>
                  {currentTrack?.uploaderName && (
                    <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[11px] font-medium border border-pink-200/70 inline-flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      <span>Added by {currentTrack.uploaderName}</span>
                    </span>
                  )}
                </div>

                <span className="text-xs text-rose-500 font-semibold">
                  {hasMusic
                    ? isPlaying
                      ? '♪ Playing across SainiVerse'
                      : 'Paused in Orbit'
                    : 'No songs in Music folder'}
                </span>
              </div>

              {/* Title & Artist & Dedication */}
              <div className="space-y-1.5 text-left">
                <h2
                  className="text-2xl sm:text-3xl font-bold font-berkshire text-rose-950 tracking-wide line-clamp-2"
                  style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                >
                  {hasMusic
                    ? currentTrack?.title || 'Unknown Melody'
                    : 'No Musics Found'}
                </h2>
                <p className="text-sm font-semibold text-rose-600 tracking-wide">
                  {hasMusic
                    ? currentTrack?.artist || 'Custom Vault Melody'
                    : 'Upload songs from the Private Section to begin playback'}
                </p>
                {currentTrack?.dedication && (
                  <p className="text-xs text-gray-600 italic bg-rose-50/80 p-2.5 rounded-xl border border-rose-100/90 leading-relaxed">
                    "{currentTrack.dedication}"
                  </p>
                )}
              </div>

              {/* Scrubber / Seek Bar with Timers */}
              <div className="space-y-1.5">
                <div className="relative w-full flex items-center group">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    disabled={!hasMusic}
                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none bg-rose-200 cursor-pointer accent-rose-500 transition-all focus:outline-none disabled:opacity-50"
                    style={{
                      background: `linear-gradient(to right, #f43f5e ${currentProgressPercent}%, #ffe4e6 ${currentProgressPercent}%)`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono font-medium">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Playback Controls & Volume */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                {/* Center Buttons: Shuffle, Prev, Play/Pause, Next, Repeat */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Shuffle Button */}
                  <button
                    onClick={toggleShuffle}
                    disabled={!hasMusic}
                    className={`p-2 rounded-full transition-all cursor-pointer disabled:opacity-40 ${
                      isShuffle
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={isShuffle ? 'Shuffle Active' : 'Enable Shuffle'}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  {/* Previous Track */}
                  <button
                    onClick={prevTrack}
                    disabled={!hasMusic}
                    className="p-2.5 rounded-full text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                    title="Previous Song"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>

                  {/* Main Play / Pause Button */}
                  <button
                    onClick={toggleMusic}
                    disabled={!hasMusic}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 via-rose-600 to-pink-500 text-white shadow-xl shadow-rose-500/35 hover:shadow-rose-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:scale-100"
                    title={isPlaying ? 'Pause Melody' : 'Play Melody'}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Next Track */}
                  <button
                    onClick={nextTrack}
                    disabled={!hasMusic}
                    className="p-2.5 rounded-full text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                    title="Next Song"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>

                  {/* Repeat Mode Toggle */}
                  <button
                    onClick={toggleRepeat}
                    disabled={!hasMusic}
                    className={`p-2 rounded-full transition-all cursor-pointer disabled:opacity-40 ${
                      repeatMode !== 'off'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={`Repeat: ${repeatMode.toUpperCase()}`}
                  >
                    {repeatMode === 'one' ? (
                      <Repeat1 className="w-4 h-4" />
                    ) : (
                      <Repeat className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 w-full sm:w-36 bg-rose-50/70 px-3 py-1.5 rounded-full border border-rose-100">
                  <button
                    onClick={toggleMute}
                    className="text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none bg-rose-200 cursor-pointer accent-rose-500 transition-all focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. MUSIC LIBRARY & PLAYLIST SECTION */}
        <section className="space-y-4 text-left">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-rose-200">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists, or dedications..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-rose-100 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedUploaderFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedUploaderFilter === 'all'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-rose-50'
                }`}
              >
                All Songs ({playlist.length})
              </button>
              <button
                onClick={() => setSelectedUploaderFilter('jit')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedUploaderFilter === 'jit'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-rose-50'
                }`}
              >
                Jit's Melodies
              </button>
              <button
                onClick={() => setSelectedUploaderFilter('saini')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedUploaderFilter === 'saini'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-rose-50'
                }`}
              >
                Saini's Melodies
              </button>
            </div>
          </div>

          {/* Songs List */}
          {filteredPlaylist.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white/60 border border-rose-200/80 p-8 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 flex items-center justify-center text-rose-500">
                <Music className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-berkshire text-lg font-bold text-gray-800">
                  No musics found in the Music vault
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  {searchQuery
                    ? `No matches found for "${searchQuery}".`
                    : 'There are currently no songs in the Music folder of Cloudflare. Uploading music is exclusively available from the Private Section.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPlaylist.map((song, idx) => {
                const isThisTrackActive = currentTrack?.id === song.id;
                const isThisTrackPlaying = isThisTrackActive && isPlaying;

                return (
                  <motion.div
                    key={song.id || idx}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className={`group relative rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300 border cursor-pointer ${
                      isThisTrackActive
                        ? 'bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/5 border-rose-300 shadow-md ring-1 ring-rose-400/40'
                        : 'bg-white/80 hover:bg-white border-rose-100 hover:border-rose-300 shadow-xs hover:shadow-md'
                    }`}
                    onClick={() => {
                      if (isThisTrackActive) {
                        toggleMusic();
                      } else {
                        playTrack(song);
                      }
                    }}
                  >
                    {/* Left: Index / Play status + Disc icon */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-all">
                        {isThisTrackPlaying ? (
                          <div className="flex items-center gap-0.5 h-4">
                            <span className="w-0.5 h-3 bg-current animate-pulse" />
                            <span className="w-0.5 h-4 bg-current animate-bounce" />
                            <span className="w-0.5 h-2.5 bg-current animate-pulse" />
                          </div>
                        ) : isThisTrackActive ? (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        ) : (
                          <Disc className="w-4 h-4" />
                        )}
                      </div>

                      {/* Song Information */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-sm font-semibold truncate transition-colors ${
                              isThisTrackActive
                                ? 'text-rose-600 font-bold'
                                : 'text-gray-900 group-hover:text-rose-600'
                            }`}
                          >
                            {song.title}
                          </h4>
                          {isThisTrackActive && (
                            <span className="px-2 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold shrink-0">
                              Playing
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                          <span className="font-medium text-gray-700">{song.artist}</span>
                          {song.dedication && (
                            <>
                              <span>•</span>
                              <span className="italic truncate max-w-[200px] sm:max-w-xs text-rose-600/80">
                                "{song.dedication}"
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Meta & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {song.uploaderName && (
                        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/60 text-[10px] font-semibold text-rose-700">
                          {song.uploaderName}
                        </span>
                      )}

                      {song.duration && (
                        <span className="text-xs font-mono text-gray-500">
                          {formatDuration(song.duration)}
                        </span>
                      )}

                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSongToDelete(song);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete from playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 4. DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {songToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSongToDelete(null)}
              className="fixed inset-0 bg-rose-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl border border-rose-200 p-6 space-y-4 text-center z-10 shadow-2xl"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Remove Song from Vault?</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Are you sure you want to remove "{songToDelete.title}" from the Universe Playlist?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSongToDelete(null)}
                  disabled={isDeleting}
                  className="py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
