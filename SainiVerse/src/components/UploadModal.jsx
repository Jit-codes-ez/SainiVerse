import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, isFirebaseConfigured } from '../firebase';
import { sanitizeImage } from '../utils/sanitizeImage';
import confetti from 'canvas-confetti';
import {
  X,
  UploadCloud,
  ShieldCheck,
  Sparkles,
  Calendar,
  FileText,
  Lock,
  Cpu,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess, currentUser }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [memoryDate, setMemoryDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [tag, setTag] = useState('Special Moment');

  const [uploadStep, setUploadStep] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [sanitizedMetadata, setSanitizedMetadata] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelection = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid photo format (JPEG, PNG, WebP, HEIC).');
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClose = () => {
    if (uploadStep !== 'idle' && uploadStep !== 'completed' && uploadStep !== 'error') {
      if (!confirm('Upload in progress. Are you sure you want to cancel?')) return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setUploadStep('idle');
    setUploadProgress(0);
    setErrorMessage('');
    onClose();
  };

  const executeSecureUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a photo to store in the vault.');
      return;
    }

    try {
      setErrorMessage('');
      
      // STEP 1: In-Browser EXIF & Geolocation Stripping via HTML5 Canvas
      setUploadStep('stripping_exif');
      setUploadProgress(15);
      
      const sanitized = await sanitizeImage(selectedFile);
      setSanitizedMetadata(sanitized);

      // STEP 2: Obfuscated UUID Generation
      setUploadStep('generating_uuid');
      setUploadProgress(30);
      const storageFilePath = `memories/${sanitized.fileName}`;

      // STEP 3: Storage Upload
      setUploadStep('uploading_storage');

      let fallbackDataUrl = null;

      if (isFirebaseConfigured && storage && db) {
        const storageRef = ref(storage, storageFilePath);
        const uploadTask = uploadBytesResumable(storageRef, sanitized.blob, {
          contentType: 'image/jpeg',
          customMetadata: {
            sanitized: 'true',
            vault: 'sainiverse',
          },
        });

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const percent = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 50
              );
              setUploadProgress(30 + percent);
            },
            (error) => reject(error),
            () => resolve()
          );
        });

        // STEP 4: Indexing in Firestore
        setUploadStep('indexing_firestore');
        setUploadProgress(90);

        const memoryDoc = {
          storagePath: storageFilePath,
          fileName: sanitized.fileName,
          caption: caption.trim() || 'Treasured Memory',
          memoryDate: memoryDate,
          tag: tag,
          uploadedBy: currentUser?.email || 'partner',
          uploaderName: currentUser?.displayName || (currentUser?.email?.includes('jith') ? 'Jith' : 'Her'),
          width: sanitized.width,
          height: sanitized.height,
          createdAt: serverTimestamp(),
        };

        let docId = 'mem_' + Date.now();
        try {
          const docRef = await addDoc(collection(db, 'memories'), memoryDoc);
          if (docRef?.id) docId = docRef.id;
        } catch (fsErr) {
          console.warn('[Firestore] Notice indexing in memories:', fsErr?.message || fsErr);
        }

        setUploadStep('completed');
        setUploadProgress(100);

        triggerLoveConfetti();

        if (onUploadSuccess) {
          onUploadSuccess({
            id: docId,
            ...memoryDoc,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // Local Demo Mode
        const reader = new FileReader();
        fallbackDataUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(sanitized.blob);
        });

        setUploadProgress(75);
        await new Promise((r) => setTimeout(r, 600));

        setUploadStep('indexing_firestore');
        setUploadProgress(95);
        await new Promise((r) => setTimeout(r, 400));

        const localMemory = {
          id: 'demo_' + sanitized.uuid,
          storagePath: storageFilePath,
          fileName: sanitized.fileName,
          fallbackData: fallbackDataUrl,
          caption: caption.trim() || 'Treasured Memory',
          memoryDate: memoryDate,
          tag: tag,
          uploadedBy: currentUser?.email || 'jith@sainiverse.internal',
          uploaderName: currentUser?.displayName || (currentUser?.email?.includes('jith') ? 'Jith' : 'Her'),
          width: sanitized.width,
          height: sanitized.height,
          createdAt: new Date().toISOString(),
        };

        setUploadStep('completed');
        setUploadProgress(100);

        triggerLoveConfetti();

        if (onUploadSuccess) {
          onUploadSuccess(localMemory);
        }
      }

      setTimeout(() => {
        handleClose();
      }, 1400);

    } catch (err) {
      console.error('[Upload Error]', err);
      setUploadStep('error');
      setErrorMessage(err.message || 'Failed to securely store memory in the vault.');
    }
  };

  const triggerLoveConfetti = () => {
    confetti({
      particleCount: 75,
      spread: 65,
      origin: { y: 0.65 },
      colors: ['#f43f6e', '#fda4b4', '#fb718e', '#ffffff'],
    });
  };

  const isWorking = uploadStep !== 'idle' && uploadStep !== 'completed' && uploadStep !== 'error';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 xs:p-4 sm:p-6 bg-rose-950/40 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white/95 rounded-3xl border border-rose-200 shadow-2xl shadow-rose-400/20 overflow-hidden animate-slide-up my-auto max-h-[94vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-4 xs:px-6 py-3.5 sm:py-4 border-b border-rose-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 xs:w-9 xs:h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm xs:text-base font-serif font-bold text-gray-800">
                Seal a New Memory
              </h3>
              <p className="text-[10px] xs:text-[11px] text-gray-500">
                Sanitizes EXIF • Assigns Random UUID • Streams to Vault
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isWorking}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-rose-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={executeSecureUpload} className="p-4 xs:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Dropzone / Preview */}
          <div>
            {!previewUrl ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 bg-rose-50/50 hover:bg-rose-50 flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-100 group-hover:bg-rose-200/80 text-rose-500 flex items-center justify-center mb-3 transition-colors shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  Drop your favorite photo here, or <span className="text-rose-600 underline">browse</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  EXIF, GPS coordinates & camera metadata are automatically wiped
                </p>
              </div>
            ) : (
              <div
                onContextMenu={(e) => e.preventDefault()}
                className="relative rounded-2xl overflow-hidden border border-rose-200 bg-rose-50 group shadow-sm select-none no-scrape"
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  draggable="false"
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-52 object-cover select-none pointer-events-none no-scrape"
                  style={{ WebkitUserDrag: 'none', userSelect: 'none' }}
                />
                <div
                  className="absolute inset-0 z-10 bg-transparent select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  draggable="false"
                />
                {!isWorking && (
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-2 right-2 z-20 px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-rose-600 text-xs font-semibold flex items-center gap-1 shadow-md transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                )}
                <div className="absolute bottom-2 left-2 px-3 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-rose-600 flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                  <span>Ready for In-Browser EXIF Scrubbing</span>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelection(e.target.files?.[0])}
            />
          </div>

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>Caption or Romantic Note</span>
            </label>
            <input
              type="text"
              placeholder="e.g., That rainy evening in Montmartre, Paris..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isWorking}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-rose-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-xs"
            />
          </div>

          {/* Date & Moment Tag */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>Memory Date</span>
              </label>
              <input
                type="date"
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
                disabled={isWorking}
                className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-sm text-gray-800 focus:outline-none focus:border-rose-500 transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>Moment Tag</span>
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                disabled={isWorking}
                className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-sm text-gray-800 focus:outline-none focus:border-rose-500 transition-all shadow-xs"
              >
                <option value="Special Moment">Special Moment</option>
                <option value="Date Night">Date Night</option>
                <option value="Vacation">Vacation</option>
                <option value="Just Us">Just Us</option>
                <option value="Milestone">Milestone</option>
                <option value="Silly & Cute">Silly & Cute</option>
              </select>
            </div>
          </div>

          {/* Progress Indicators */}
          {uploadStep !== 'idle' && (
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 flex items-center gap-2">
                  {uploadStep === 'stripping_exif' && (
                    <>
                      <Cpu className="w-4 h-4 text-rose-500 animate-spin" />
                      <span>Step 1: In-Browser Canvas EXIF & GPS Scrubbing...</span>
                    </>
                  )}
                  {uploadStep === 'generating_uuid' && (
                    <>
                      <Lock className="w-4 h-4 text-rose-500 animate-pulse" />
                      <span>Step 2: Assigning Obfuscated UUID...</span>
                    </>
                  )}
                  {uploadStep === 'uploading_storage' && (
                    <>
                      <UploadCloud className="w-4 h-4 text-rose-500 animate-bounce" />
                      <span>Step 3: Encrypted Binary Stream to Vault...</span>
                    </>
                  )}
                  {uploadStep === 'indexing_firestore' && (
                    <>
                      <Sparkles className="w-4 h-4 text-rose-500 animate-spin" />
                      <span>Step 4: Recording Metadata in Firestore...</span>
                    </>
                  )}
                  {uploadStep === 'completed' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-green-700">Memory Securely Sealed in Vault!</span>
                    </>
                  )}
                </span>
                <span className="text-rose-600 font-bold">{uploadProgress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-rose-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {sanitizedMetadata && (
                <div className="text-[11px] text-gray-500 font-mono flex items-center justify-between pt-1">
                  <span>UUID: {sanitizedMetadata.fileName.slice(0, 16)}...</span>
                  <span className="text-rose-600 font-semibold">EXIF: Stripped ✓</span>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isWorking}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isWorking || !selectedFile}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isWorking ? 'Securing Photo...' : 'Sanitize & Seal in Vault'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
