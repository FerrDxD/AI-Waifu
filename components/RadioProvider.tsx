'use client';
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

export const PLAYLIST = [
  { id: 1, title: 'Afternoon Tea', artist: 'Kos FM', file: 'Afternoon Tea.mp3', duration: '5:38', color: 'from-amber-200 to-orange-300' },
  { id: 2, title: 'Before Sleep', artist: 'Kos FM', file: 'Before Sleep.mp3', duration: '3:44', color: 'from-indigo-300 to-purple-400' },
  { id: 3, title: 'Cheeky Little Melody', artist: 'Kos FM', file: 'Cheeky Little Melody.mp3', duration: '4:12', color: 'from-blue-200 to-cyan-300' },
  { id: 4, title: 'Focus Flow', artist: 'Kos FM', file: 'Focus Flow.mp3', duration: '7:03', color: 'from-pink-200 to-rose-300' },
  { id: 5, title: 'Morning Light', artist: 'Kos FM', file: 'Morning Light.mp3', duration: '4:48', color: 'from-emerald-200 to-teal-300' },
  { id: 6, title: 'Soft Light in Your Eyes', artist: 'Kos FM', file: 'Soft Light in Your Eyes.mp3', duration: '4:51', color: 'from-fuchsia-200 to-pink-300' },
];

type RadioContextType = {
  isPlaying: boolean;
  currentTrack: number;
  progress: number;
  durationInSeconds: number;
  togglePlay: () => void;
  playTrack: (index: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playlist: typeof PLAYLIST;
  seek: (percent: number) => void;
};

const RadioContext = createContext<RadioContextType | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [durationInSeconds, setDurationInSeconds] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef(0);
  currentTrackRef.current = currentTrack;

  /**
   * Buat elemen <audio> sekali saja. M5.7: dipanggil di `requestIdleCallback`
   * (bukan sinkron saat mount), supaya pembuatan Audio + fetch MP3 + autoplay
   * tidak memblokir first paint — provider ini ter-mount di layout akar, jadi
   * kalau dikerjakan saat mount, setiap navigasi berebut jalur dengan first
   * load. Perilaku autoplay ambien tetap dipertahankan, hanya digeser ke idle.
   */
  const ensureAudio = useCallback((autoplay: boolean) => {
    if (audioRef.current) {
      if (autoplay) audioRef.current.play().catch(() => {});
      return audioRef.current;
    }
    const audio = new Audio(`/radio/${PLAYLIST[currentTrackRef.current].file}`);
    audio.loop = true;

    // Baca bgm_volume dari localStorage
    const savedBgm = localStorage.getItem('bgm_volume');
    audio.volume = savedBgm !== null ? parseInt(savedBgm, 10) / 100 : 0.5;

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener('loadedmetadata', () => setDurationInSeconds(audio.duration));

    audioRef.current = audio;

    if (autoplay) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        // Autoplay diblokir browser: tunggu interaksi pertama user.
        console.warn("Autoplay browser diblokir, menunggu interaksi pertama user...", e);
        const handleFirstInteraction = () => {
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(console.error);
          }
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
          window.removeEventListener('pointerdown', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction);
        window.addEventListener('keydown', handleFirstInteraction);
        window.addEventListener('pointerdown', handleFirstInteraction);
      });
    }

    return audio;
  }, []);

  // Inisialisasi audio + autoplay ambien, ditunda sampai browser idle.
  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mount = () => {
      if (!cancelled) ensureAudio(true);
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = (window as unknown as { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number })
        .requestIdleCallback(mount, { timeout: 2500 });
    } else {
      timer = setTimeout(mount, 500);
    }

    // Listen untuk perubahan volume BGM real-time dari Settings
    const handleBgmVolumeChange = (e: Event) => {
      const val = (e as CustomEvent).detail as number;
      if (audioRef.current) {
        audioRef.current.volume = val / 100;
      }
    };
    window.addEventListener('bgm_volume_change', handleBgmVolumeChange);
    return () => {
      cancelled = true;
      if (idleHandle !== undefined && 'cancelIdleCallback' in window) {
        (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(idleHandle);
      }
      if (timer) clearTimeout(timer);
      window.removeEventListener('bgm_volume_change', handleBgmVolumeChange);
    };
  }, [ensureAudio]);

  // Play/pause mengikuti state — hanya kalau elemen sudah tersedia.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const playTrack = (index: number) => {
    setCurrentTrack(index);
    currentTrackRef.current = index;
    const audio = ensureAudio(true);
    const src = `/radio/${PLAYLIST[index].file}`;
    if (audio.src !== src) {
      audio.src = src;
      audio.loop = true;
      audio.load();
    }
    audio.play().catch(console.error);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    const next = !isPlaying;
    if (next) ensureAudio(true);
    setIsPlaying(next);
  };

  const nextTrack = () => {
    const nextIdx = (currentTrack + 1) % PLAYLIST.length;
    playTrack(nextIdx);
  };

  const prevTrack = () => {
    const prevIdx = currentTrack === 0 ? PLAYLIST.length - 1 : currentTrack - 1;
    playTrack(prevIdx);
  };

  const seek = (percent: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (percent / 100) * audio.duration;
      setProgress(percent);
    }
  };

  return (
    <RadioContext.Provider value={{
      isPlaying, currentTrack, progress, durationInSeconds, togglePlay, playTrack, nextTrack, prevTrack, playlist: PLAYLIST, seek
    }}>
      {children}
    </RadioContext.Provider>
  );
}

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) throw new Error("useRadio must be used within a RadioProvider");
  return context;
};
