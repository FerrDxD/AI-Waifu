'use client';
import { createContext, useContext, useState, useRef, useEffect } from 'react';

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

  useEffect(() => {
    // Only initialize once on client
    if (!audioRef.current) {
      const audio = new Audio(`/radio/${PLAYLIST[currentTrack].file}`);
      audio.loop = true; // Unconditional looping as requested
      audioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const handleLoadedMetadata = () => {
      setDurationInSeconds(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentTrack]); // re-bind when track might change natively, though ref persists

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(e => console.error("Audio play failed:", e));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const playTrack = (index: number) => {
    setCurrentTrack(index);
    if (audioRef.current) {
      audioRef.current.src = `/radio/${PLAYLIST[index].file}`;
      audioRef.current.loop = true;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        setIsPlaying(true); // this will trigger the useEffect above
      }
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    const nextIdx = (currentTrack + 1) % PLAYLIST.length;
    playTrack(nextIdx);
  };

  const prevTrack = () => {
    const prevIdx = currentTrack === 0 ? PLAYLIST.length - 1 : currentTrack - 1;
    playTrack(prevIdx);
  };

  const seek = (percent: number) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (percent / 100) * audioRef.current.duration;
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
