'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Play, Pause, SkipForward, SkipBack, Volume2, ListMusic, Disc3, Radio as RadioIcon, BarChart3, FastForward, Rewind } from 'lucide-react';

// Mock Playlist
const PLAYLIST = [
  { id: 1, title: 'Morning Coffee', artist: 'Livia Lofi Studio', duration: '3:45', color: 'from-amber-200 to-orange-300' },
  { id: 2, title: 'Late Night Coding', artist: 'Kos Vibe Records', duration: '4:20', color: 'from-indigo-300 to-purple-400' },
  { id: 3, title: 'Rainy Balcony', artist: 'Livia Lofi Studio', duration: '2:50', color: 'from-blue-200 to-cyan-300' },
  { id: 4, title: 'Sunday Cleaning', artist: 'Sunny Beats', duration: '3:15', color: 'from-pink-200 to-rose-300' },
  { id: 5, title: 'Midnight Ramen', artist: 'Kos Vibe Records', duration: '5:00', color: 'from-emerald-200 to-teal-300' },
];

export default function RadioPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100
  
  const track = PLAYLIST[currentTrack];

  // Simulate progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + 0.5;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  
  const handleNext = () => {
    setProgress(0);
    setCurrentTrack(prev => (prev + 1) % PLAYLIST.length);
  };
  
  const handlePrev = () => {
    setProgress(0);
    setCurrentTrack(prev => (prev === 0 ? PLAYLIST.length - 1 : prev - 1));
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-orange-100 to-pink-100 rounded-full blur-3xl opacity-60 mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-amber-50 to-orange-50 rounded-full blur-3xl opacity-70 mix-blend-multiply" />
        {/* ZZZ style grid background */}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#e5d3b3 1px, transparent 1px), linear-gradient(90deg, #e5d3b3 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3 }} />
      </div>

      {/* Top Header */}
      <div className="relative z-10 w-full p-6 md:p-10 flex justify-between items-center">
        <Link 
          href="/home" 
          className="bg-white/80 backdrop-blur-md border border-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-[#5c4d47] shadow-sm hover:scale-105 hover:bg-orange-50 hover:text-orange-600 transition-all group"
        >
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div className="flex flex-col items-end">
          <h1 className="font-display font-black text-3xl md:text-4xl text-[#5c4d47] tracking-tight uppercase italic flex items-center gap-2">
            Kos FM <RadioIcon size={28} className="text-[#ff758c]" />
          </h1>
          <p className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase">Vibe. Chill. Study.</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 p-6 relative z-10">
        
        {/* Left Side: The Cassette/Player Visualizer */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center relative">
          
          {/* ZZZ Style Cassette Deck / Vinyl Player */}
          <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
            
            {/* Player Base */}
            <div className="absolute inset-0 bg-[#fffdfa] rounded-[3rem] border-[6px] border-[#f0e6d2] shadow-[20px_20px_60px_rgba(205,170,125,0.15),-20px_-20px_60px_rgba(255,255,255,0.8)] overflow-hidden">
              
              {/* Spinning Disc inside */}
              <div className="absolute inset-4 rounded-full border-4 border-gray-100 bg-white shadow-inner flex items-center justify-center overflow-hidden">
                <div 
                  className={`w-[95%] h-[95%] rounded-full bg-gradient-to-br ${track.color} shadow-lg flex items-center justify-center relative transition-all duration-700 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                >
                  {/* Disc Grooves */}
                  <div className="absolute inset-2 rounded-full border border-black/5" />
                  <div className="absolute inset-6 rounded-full border border-black/5" />
                  <div className="absolute inset-10 rounded-full border border-black/5" />
                  
                  {/* Center Label */}
                  <div className="w-24 h-24 bg-white rounded-full shadow-md border-4 border-white/50 flex flex-col items-center justify-center relative">
                    <div className="w-4 h-4 bg-gray-200 rounded-full shadow-inner border border-gray-300" />
                    <span className="absolute bottom-3 text-[8px] font-black uppercase text-gray-500 tracking-widest rotate-12">LIVIA</span>
                  </div>
                </div>
              </div>
              
              {/* Tone Arm / Cassette details */}
              <div className={`absolute -right-4 top-1/4 w-12 h-40 bg-gray-100 rounded-full border-4 border-gray-200 shadow-xl origin-top transition-transform duration-500 ${isPlaying ? 'rotate-12' : 'rotate-0'}`}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-10 bg-gray-300 rounded-md border border-gray-400" />
              </div>
            </div>

            {/* EQ Bars Overlay */}
            <div className="absolute bottom-8 right-12 flex items-end gap-1.5 bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-orange-50">
              {[1,2,3,4,5].map(i => (
                <div 
                  key={i} 
                  className={`w-2 bg-[#ff758c] rounded-t-sm transition-all duration-150`}
                  style={{ height: isPlaying ? `${Math.random() * 20 + 10}px` : '4px' }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Track Info & Playlist */}
        <div className="w-full md:w-1/2 flex flex-col gap-8 max-w-md">
          
          {/* Current Track Info (Marquee/Bold typography style) */}
          <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-orange-100 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[#ff758c] to-[#ff0844]" />
            
            <div className="flex flex-col gap-1">
              <span className="text-xs font-black text-[#ff758c] tracking-[0.3em] uppercase mb-2">Now Playing</span>
              <h2 className="font-display font-black text-3xl md:text-4xl text-[#5c4d47] leading-none tracking-tight">
                {track.title}
              </h2>
              <p className="text-sm font-bold text-gray-400 mt-2">{track.artist}</p>
            </div>

            {/* Progress Bar */}
            <div className="mt-8 flex flex-col gap-2">
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner cursor-pointer relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff758c] to-[#ff0844] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                <span>{Math.floor((progress / 100 * parseInt(track.duration.split(':')[0]) * 60) / 60)}:{(Math.floor((progress / 100 * parseInt(track.duration.split(':')[0]) * 60) % 60)).toString().padStart(2, '0')}</span>
                <span>{track.duration}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center justify-between">
              <button className="text-gray-400 hover:text-[#ff758c] transition-colors"><Volume2 size={24} /></button>
              
              <div className="flex items-center gap-4">
                <button onClick={handlePrev} className="w-12 h-12 flex items-center justify-center bg-orange-50 text-orange-400 rounded-full hover:bg-[#ff758c] hover:text-white transition-all active:scale-95 shadow-sm">
                  <Rewind size={20} className="fill-current" />
                </button>
                <button 
                  onClick={handlePlayPause}
                  className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-[#ff758c] to-[#ff0844] text-white rounded-full hover:shadow-lg hover:shadow-pink-200 transition-all active:scale-95 hover:scale-105"
                >
                  {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
                </button>
                <button onClick={handleNext} className="w-12 h-12 flex items-center justify-center bg-orange-50 text-orange-400 rounded-full hover:bg-[#ff758c] hover:text-white transition-all active:scale-95 shadow-sm">
                  <FastForward size={20} className="fill-current" />
                </button>
              </div>

              <button className="text-gray-400 hover:text-[#ff758c] transition-colors"><ListMusic size={24} /></button>
            </div>
          </div>

          {/* Playlist */}
          <div className="flex flex-col gap-3">
            <h3 className="font-display font-black text-sm text-[#5c4d47] uppercase tracking-widest pl-2 flex items-center gap-2">
              <Disc3 size={16} className="text-[#ff758c]" /> Kaset Livia
            </h3>
            <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-3 border border-orange-100 flex flex-col gap-2 shadow-sm max-h-[220px] overflow-y-auto custom-scrollbar">
              {PLAYLIST.map((item, idx) => (
                <button 
                  key={item.id}
                  onClick={() => { setCurrentTrack(idx); setProgress(0); setIsPlaying(true); }}
                  className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${currentTrack === idx ? 'bg-[#ff758c]/10 border border-[#ff758c]/20' : 'hover:bg-white border border-transparent'}`}
                >
                  <div className={`font-black text-lg ${currentTrack === idx ? 'text-[#ff758c]' : 'text-gray-300'}`}>
                    {(idx + 1).toString().padStart(2, '0')}
                  </div>
                  <div className="flex flex-col items-start flex-1">
                    <span className={`font-bold text-sm ${currentTrack === idx ? 'text-[#5c4d47]' : 'text-gray-600'}`}>{item.title}</span>
                    <span className="text-[10px] font-bold text-gray-400">{item.artist}</span>
                  </div>
                  {currentTrack === idx && isPlaying ? (
                    <BarChart3 size={16} className="text-[#ff758c] animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400">{item.duration}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
