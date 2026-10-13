import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  X,
  Search,
  Filter,
  Trash2,
  Music,
  Image as ImageIcon,
  User,
  Clock,
  Calendar,
  Globe,
  Lock,
  Sparkles,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  CheckCircle,
} from 'lucide-react';
import { subscribeActivityLogs, clearAllActivityLogs } from '../utils/activityLogger';

/**
 * Format relative time (e.g., "Just now", "5m ago", "2h ago", "Oct 14, 2026")
 */
function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Format exact human-readable date & time
 */
function formatExactDateTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export default function VaultActivityLogsModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'add' | 'delete' | 'image' | 'song' | 'jit' | 'saini'
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeActivityLogs((list) => {
      setLogs(list || []);
    });
    return () => unsub();
  }, [isOpen]);

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // 1. Action / Type filter
      if (actionFilter === 'add' && item.action !== 'add') return false;
      if (actionFilter === 'delete' && item.action !== 'delete') return false;
      if (actionFilter === 'image' && item.type !== 'image') return false;
      if (actionFilter === 'song' && item.type !== 'song') return false;
      if (actionFilter === 'jit' && !item.userName?.toLowerCase().includes('jit')) return false;
      if (actionFilter === 'saini' && !item.userName?.toLowerCase().includes('saini')) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const userMatch = (item.userName || '').toLowerCase().includes(q);
        const emailMatch = (item.userEmail || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        const artistMatch = (item.details?.artist || '').toLowerCase().includes(q);
        const tagMatch = (item.details?.tag || '').toLowerCase().includes(q);
        return titleMatch || userMatch || emailMatch || catMatch || artistMatch || tagMatch;
      }

      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear the activity log history?')) return;
    setIsClearing(true);
    try {
      await clearAllActivityLogs();
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto" role="dialog" aria-modal="true">
      {/* Fullscreen Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-rose-950/50 backdrop-blur-md"
      />

      {/* Centered Modal Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-5 text-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="pointer-events-auto relative w-full max-w-3xl my-auto text-left bg-white/95 backdrop-blur-2xl border border-rose-200 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 max-h-[88vh] flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-rose-100 pb-4 shrink-0">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Activity className="w-3 h-3 text-purple-600" />
                <span>Vault Audit System • Real-Time</span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-rose-950 font-berkshire"
                style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
              >
                Log & Sanctuary Actions
              </h2>
              <p className="text-xs text-gray-500">
                Chronological track of all added and deleted photos, songs, and files with user attributions.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Close Logs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar & Filter Pills */}
          <div className="space-y-3 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search action logs by title, artist, tag, or user..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
                {[
                  { id: 'all', label: `All (${logs.length})`, icon: Activity },
                  { id: 'add', label: 'Added', icon: PlusCircle },
                  { id: 'delete', label: 'Deleted', icon: Trash2 },
                  { id: 'image', label: 'Photos', icon: ImageIcon },
                  { id: 'song', label: 'Songs', icon: Music },
                  { id: 'jit', label: 'Jit', icon: User },
                  { id: 'saini', label: 'Saini', icon: User },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActionFilter(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        actionFilter === tab.id
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-white text-gray-600 border border-rose-100 hover:bg-rose-50'
                      }`}
                    >
                      {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isClearing}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-rose-600 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
                  title="Clear history"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          </div>

          {/* Log Items List (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
            {filteredLogs.length === 0 ? (
              <div className="py-14 text-center space-y-3 rounded-2xl bg-rose-50/40 border border-dashed border-rose-200">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-xs text-rose-400 flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-gray-800">No actions recorded</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    {searchQuery
                      ? `No log events matched "${searchQuery}".`
                      : 'Activity logs will appear automatically whenever images or songs are added or removed.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isAdd = log.action === 'add';
                const isSong = log.type === 'song';
                const isPrivate = log.category === 'private';
                const isJit = log.userName?.toLowerCase().includes('jit');

                return (
                  <motion.div
                    key={log.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 shadow-xs hover:shadow-sm transition-all flex items-start justify-between gap-3 text-left"
                  >
                    {/* Left Icon Badge */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                          isAdd
                            ? isSong
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isAdd ? (
                          isSong ? (
                            <Music className="w-5 h-5" />
                          ) : (
                            <PlusCircle className="w-5 h-5" />
                          )
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-1 min-w-0">
                        {/* Action Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isAdd
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isAdd ? (
                              <PlusCircle className="w-3 h-3" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span>{isAdd ? 'Added' : 'Deleted'} {isSong ? 'Song' : 'Photo'}</span>
                          </span>

                          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(log.timestamp)}</span>
                          </span>

                          {/* Visibility badge */}
                          {log.category && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                              {isPrivate ? (
                                <>
                                  <Lock className="w-2.5 h-2.5 text-purple-600" />
                                  <span>Private Vault</span>
                                </>
                              ) : log.category === 'music' ? (
                                <>
                                  <Music className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Music Vault</span>
                                </>
                              ) : (
                                <>
                                  <Globe className="w-2.5 h-2.5 text-rose-600" />
                                  <span>Public Archive</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Title of Item */}
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {log.title}
                        </h4>

                        {/* Details (Artist or Tag) */}
                        {log.details && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                            {log.details.artist && (
                              <span className="italic text-gray-600">
                                Artist: <span className="font-semibold">{log.details.artist}</span>
                              </span>
                            )}
                            {log.details.tag && (
                              <span className="px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 font-medium">
                                #{log.details.tag}
                              </span>
                            )}
                            {log.details.fileName && log.details.fileName !== log.title && (
                              <span className="font-mono text-[10px] text-gray-400 truncate max-w-[200px]">
                                {log.details.fileName}
                              </span>
                            )}
                          </div>
                        )}

                        {/* User / Actor Badge */}
                        <div className="pt-0.5 flex items-center gap-1.5 text-[11px]">
                          <span className="text-gray-400">By</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isJit
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-pink-50 text-pink-700 border border-pink-200'
                            }`}
                          >
                            <User className="w-2.5 h-2.5" />
                            <span>{log.userName || 'Jit'}</span>
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            ({log.userEmail})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Exact Timestamp */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <span className="text-[10px] text-gray-400 font-mono block">
                        {formatExactDateTime(log.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-rose-100 flex items-center justify-between text-xs text-gray-500 shrink-0">
            <span>
              Total Logged Events: <strong className="text-rose-700">{logs.length}</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
