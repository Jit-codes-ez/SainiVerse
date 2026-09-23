import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SecureImage from './SecureImage';
import { formatMemoryDate } from '../utils/dateUtils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar,
  User,
  Tag,
  Shield,
  Heart,
  Loader2,
} from 'lucide-react';

export default function LightboxModal({
  memory,
  memories = [],
  isOpen,
  onClose,
  onNavigate,
  onDelete,
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentIndex = memories.findIndex((m) => m.id === memory?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < memories.length - 1;

  // Reset delete confirmation state when active memory or modal changes
  useEffect(() => {
    setShowDeleteModal(false);
    setIsDeleting(false);
  }, [memory?.id, isOpen]);

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      onNavigate(memories[currentIndex - 1]);
    }
  }, [currentIndex, hasPrevious, memories, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(memories[currentIndex + 1]);
    }
  }, [currentIndex, hasNext, memories, onNavigate]);

  const handleConfirmDelete = async () => {
    if (!memory || !onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(memory);
      setShowDeleteModal(false);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          setShowDeleteModal(false);
        } else {
          onClose();
        }
      }
      if (showDeleteModal) return; // Prevent navigation while delete modal is open
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrevious, handleNext, showDeleteModal]);

  if (!isOpen || !memory) return null;

  const isUploaderJith = (memory.uploadedBy || '').toLowerCase().includes('jith');

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-3 sm:p-6 animate-fade-in no-scrape select-none"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-20 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-vault-surface/80 border border-vault-border/80 text-xs text-rose-300">
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          <span>Encrypted In-Memory Stream ({currentIndex + 1} of {memories.length})</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-xl bg-vault-surface/80 hover:bg-rose-950/60 border border-vault-border hover:border-rose-500/40 text-vault-muted hover:text-rose-300 transition-colors cursor-pointer"
              title="Delete Memory"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-vault-surface/80 hover:bg-vault-border border border-vault-border text-gray-300 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full h-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-4 pt-14 pb-2 sm:pb-4 overflow-y-auto">
        
        {/* Previous Button */}
        {hasPrevious && (
          <button
            onClick={handlePrevious}
            className="absolute left-1.5 xs:left-2 sm:left-4 z-20 p-2 xs:p-2.5 sm:p-3 rounded-full bg-vault-surface/80 hover:bg-rose-600/30 border border-vault-border hover:border-rose-500/50 text-white transition-all shadow-xl active:scale-95"
            title="Previous Memory (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-1.5 xs:right-2 sm:right-4 z-20 p-2 xs:p-2.5 sm:p-3 rounded-full bg-vault-surface/80 hover:bg-rose-600/30 border border-vault-border hover:border-rose-500/50 text-white transition-all shadow-xl active:scale-95"
            title="Next Memory (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Secure Image Center Display */}
        <div className="flex-1 w-full h-full max-h-[50vh] xs:max-h-[58vh] sm:max-h-[68vh] md:max-h-[78vh] flex items-center justify-center p-1 sm:p-2">
          <SecureImage
            storageKey={memory.storageKey}
            storagePath={memory.storagePath || memory.storageKey}
            fileName={memory.fileName}
            fallbackData={memory.fallbackData}
            alt={memory.caption}
            containerClassName="w-full h-full max-h-full rounded-2xl border border-vault-border shadow-2xl flex items-center justify-center bg-vault-dark"
            className="max-h-[48vh] xs:max-h-[56vh] sm:max-h-[66vh] md:max-h-[76vh] w-auto max-w-full object-contain rounded-xl"
          />
        </div>

        {/* Memory Metadata Sidebar / Bottom card */}
        <div className="w-full md:w-80 glass-panel rounded-2xl p-4 sm:p-5 border border-rose-500/20 text-left shrink-0 animate-slide-up max-h-[35vh] md:max-h-none overflow-y-auto">
          <div className="flex items-center gap-2 text-xs text-rose-400 font-semibold mb-2">
            <Heart className="w-3.5 h-3.5 fill-rose-500/30" />
            <span>{memory.tag || 'Special Moment'}</span>
          </div>

          <h4 className="text-base font-serif font-medium text-gray-100 mb-4 leading-snug">
            "{memory.caption || 'A treasured snapshot in time.'}"
          </h4>

          <div className="space-y-2.5 pt-3 border-t border-vault-border text-xs text-vault-muted">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-rose-300" />
              <span>{formatMemoryDate(memory.memoryDate || memory.createdAt)}</span>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-rose-300" />
              <span className="flex items-center gap-1.5">
                Uploaded by{' '}
                <span className={`font-medium ${isUploaderJith ? 'text-rose-300' : 'text-pink-300'}`}>
                  {memory.uploaderName || (isUploaderJith ? 'Jith' : 'Partner')}
                </span>
              </span>
            </div>

            {memory.fileName && (
              <div className="pt-2 text-[10px] text-vault-muted font-mono truncate">
                Obfuscated ID: {memory.fileName.replace('.jpg', '').slice(0, 18)}...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CUSTOM CONFIRMATION MODAL POP-UP (Replaces browser window.confirm) */}
      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
            onClick={(e) => {
              e.stopPropagation();
              if (!isDeleting) setShowDeleteModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-200 text-center space-y-4 select-text"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Glowing Icon Badge */}
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Trash2 className="w-7 h-7" />
              </div>

              {/* Header & Details */}
              <div className="space-y-1.5">
                <h3
                  className="text-2xl font-bold text-rose-950 font-berkshire"
                  style={{ fontFamily: "'Berkshire Swash', cursive, serif" }}
                >
                  Delete This Memory?
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-sans">
                  Are you sure you want to permanently delete this photo from our vault? This action cannot be undone.
                </p>
                {memory.caption && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-900 font-serif italic line-clamp-2">
                    "{memory.caption}"
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/30 cursor-pointer disabled:opacity-60 active:scale-95 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Memory</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
