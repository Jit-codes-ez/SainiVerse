import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { subscribeMusic } from '../utils/musicStorage';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('all'); // 'off' | 'all' | 'one'

  // Dedicated Navbar Music Player (Strictly streams from Navbar_Music/ folder in R2)
  const navbarAudioRef = useRef(null);
  const isNavbarManuallyPausedRef = useRef(false);
  const [isNavbarPlaying, setIsNavbarPlaying] = useState(false);
  const [navbarTrack, setNavbarTrack] = useState({
    title: 'Bhalobashar Morshum (ভালবাসার মরশুম) 💕',
    folder: 'Navbar_Music',
    streamUrl: '/api/get-music',
  });

  const isManuallyPausedRef = useRef(false);
  const audioRef = useRef(null);
  const pendingPlayRef = useRef(false);

  // Fetch Navbar Music metadata from /api/get-music?info=true on mount
  useEffect(() => {
    fetch('/api/get-music?info=true')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.title) {
          setNavbarTrack({
            title: data.title + ' 💕',
            folder: 'Navbar_Music',
            streamUrl: '/api/get-music',
          });
        }
      })
      .catch((err) => {
        console.warn('[AudioContext] Could not fetch navbar music metadata:', err);
      });
  }, []);

  // Sync strictly with Cloudflare R2 Music/ folder and Firestore Music_Details
  useEffect(() => {
    const unsub = subscribeMusic((songs) => {
      const validSongs = Array.isArray(songs) ? songs : [];
      setPlaylist(validSongs);

      if (validSongs.length > 0) {
        setCurrentTrack((prev) => {
          if (prev && validSongs.some((s) => s.id === prev.id)) {
            return prev;
          }
          return validSongs[0];
        });
      } else {
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    });
    return () => unsub();
  }, []);

  // Update volume on both audio elements
  useEffect(() => {
    const vol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    if (navbarAudioRef.current) {
      navbarAudioRef.current.volume = vol;
    }
  }, [volume, isMuted]);

  const startPlayback = useCallback(() => {
    if (!audioRef.current || isManuallyPausedRef.current || !currentTrack) return;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.warn('[AudioContext] Autoplay pending user gesture:', err.message);
      });
  }, [currentTrack]);

  const pausePlayback = useCallback(() => {
    if (!audioRef.current) return;
    isManuallyPausedRef.current = true;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const playTrack = useCallback(
    (track) => {
      if (!track) return;
      isManuallyPausedRef.current = false;
      setCurrentTrack(track);
      pendingPlayRef.current = true;

      // Pause navbar background music if playing
      if (navbarAudioRef.current && isNavbarPlaying) {
        navbarAudioRef.current.pause();
        setIsNavbarPlaying(false);
      }

      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            pendingPlayRef.current = false;
          })
          .catch((err) => {
            console.warn('[AudioContext] Error playing track:', err.message);
            setIsPlaying(false);
          });
      }
    },
    [isNavbarPlaying]
  );

  const toggleMusic = useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (!audioRef.current) return;

      if (!currentTrack && playlist.length > 0) {
        playTrack(playlist[0]);
        return;
      }
      if (!currentTrack) return;

      if (isPlaying) {
        pausePlayback();
      } else {
        // Pause navbar background music if playing
        if (navbarAudioRef.current && isNavbarPlaying) {
          navbarAudioRef.current.pause();
          setIsNavbarPlaying(false);
        }

        isManuallyPausedRef.current = false;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('[AudioContext] Playback error:', err.message);
            setIsPlaying(false);
          });
      }
    },
    [isPlaying, pausePlayback, currentTrack, playlist, playTrack, isNavbarPlaying]
  );

  // Start Navbar Background Music playback
  const startNavbarPlayback = useCallback(() => {
    if (!navbarAudioRef.current || isNavbarManuallyPausedRef.current) return;

    // Ensure vault music player is not playing
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    navbarAudioRef.current
      .play()
      .then(() => {
        setIsNavbarPlaying(true);
      })
      .catch((err) => {
        console.log('[AudioContext] Navbar autoplay waiting for gesture:', err.message);
      });
  }, []);

  // Toggle Navbar Background Music (strictly plays from Navbar_Music/ folder in R2)
  const toggleNavbarMusic = useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (!navbarAudioRef.current) return;

      if (isNavbarPlaying) {
        isNavbarManuallyPausedRef.current = true;
        navbarAudioRef.current.pause();
        setIsNavbarPlaying(false);
      } else {
        isNavbarManuallyPausedRef.current = false;
        // Pause vault audio if playing so both don't clash
        if (audioRef.current && isPlaying) {
          pausePlayback();
        }

        navbarAudioRef.current
          .play()
          .then(() => {
            setIsNavbarPlaying(true);
          })
          .catch((err) => {
            console.warn('[AudioContext] Navbar audio play error:', err.message);
            setIsNavbarPlaying(false);
          });
      }
    },
    [isNavbarPlaying, isPlaying, pausePlayback]
  );

  const nextTrack = useCallback(() => {
    if (playlist.length === 0) return;

    if (isShuffle && playlist.length > 1) {
      const remaining = playlist.filter((t) => t.id !== currentTrack?.id);
      const randomTrack = remaining[Math.floor(Math.random() * remaining.length)];
      playTrack(randomTrack);
      return;
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    playTrack(playlist[nextIndex]);
  }, [playlist, currentTrack, isShuffle, playTrack]);

  const prevTrack = useCallback(() => {
    if (playlist.length === 0) return;

    // If more than 3 seconds in, restart current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIndex]);
  }, [playlist, currentTrack, playTrack]);

  const seekTo = useCallback((seconds) => {
    if (!audioRef.current) return;
    const target = Math.max(0, Math.min(seconds, audioRef.current.duration || 0));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  }, []);

  const changeVolume = useCallback((newVol) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // HTML5 audio event listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.warn);
      }
    } else if (repeatMode === 'all') {
      nextTrack();
    } else {
      // 'off'
      const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
      if (currentIndex < playlist.length - 1) {
        nextTrack();
      } else {
        setIsPlaying(false);
      }
    }
  };

  // Automatically start playing navbar background music when hitting the webapp
  useEffect(() => {
    // 1. Attempt immediate autoplay
    startNavbarPlayback();

    // 2. Attach listeners for the very first interaction to satisfy browser autoplay security policies
    const handleFirstInteraction = () => {
      if (isNavbarManuallyPausedRef.current) return;
      startNavbarPlayback();
    };

    const interactionEvents = ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'scroll', 'click', 'wheel'];
    interactionEvents.forEach((evt) => {
      window.addEventListener(evt, handleFirstInteraction, { once: true, passive: true });
    });

    return () => {
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, handleFirstInteraction);
      });
    };
  }, [startNavbarPlayback]);

  return (
    <AudioContext.Provider
      value={{
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
        startPlayback,
        pausePlayback,
        isManuallyPausedRef,
        // Dedicated Navbar Music Player
        isNavbarPlaying,
        navbarTrack,
        toggleNavbarMusic,
        startNavbarPlayback,
      }}
    >
      {/* Central Persistent Audio Tag for Vault Tracks (Music/ folder) */}
      <audio
        ref={audioRef}
        src={currentTrack?.url || ''}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Central Persistent Audio Tag for Navbar Music (Navbar_Music/ folder only) */}
      <audio
        ref={navbarAudioRef}
        src="/api/get-music"
        preload="auto"
        loop
        onCanPlay={() => {
          if (!isNavbarManuallyPausedRef.current && !isNavbarPlaying) {
            startNavbarPlayback();
          }
        }}
        onPlay={() => setIsNavbarPlaying(true)}
        onPause={() => setIsNavbarPlaying(false)}
      />
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
