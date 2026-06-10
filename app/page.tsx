import Link from 'next/link';
import LiviaSprite from '@/components/livia/LiviaSprite';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#fdfbf7] overflow-hidden font-sans select-none text-[#5c4d47]">
      
      {/* Background Image (Slightly blurred/dimmed) */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-50 mix-blend-multiply transition-transform duration-[20s] ease-linear hover:scale-105"
        style={{ backgroundImage: "url('/bg/bedroom.png')" }} 
      />
      
      {/* UI Frost / Gradient Layers */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/40 to-white/90 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#ff758c]/5 z-0 pointer-events-none" />

      {/* GF2 Tactical Crosshairs & Borders */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-pink-300/50 z-10 pointer-events-none" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-pink-300/50 z-10 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-pink-300/50 z-10 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-pink-300/50 z-10 pointer-events-none" />
      
      {/* Fine lines */}
      <div className="absolute top-12 left-24 right-24 h-[1px] bg-gradient-to-r from-pink-200 via-transparent to-pink-200 z-10 pointer-events-none hidden md:block" />
      <div className="absolute bottom-12 left-24 right-24 h-[1px] bg-gradient-to-r from-pink-200 via-transparent to-pink-200 z-10 pointer-events-none hidden md:block" />

      {/* Character Display */}
      <div className="absolute inset-0 flex items-end justify-center md:justify-end md:pr-[15%] pointer-events-none z-10">
        <LiviaSprite 
          expression="normal" 
          className="h-[80vh] md:h-[95vh] w-auto max-w-[800px] object-contain object-bottom drop-shadow-[0_15px_40px_rgba(255,117,140,0.15)] animate-[float_8s_ease-in-out_infinite]"
        />
      </div>

      {/* Main UI Container */}
      <div className="relative z-20 w-full h-screen flex flex-col justify-between p-6 md:p-14 pointer-events-none overflow-hidden">
        
        {/* Header Area */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 md:gap-2 pointer-events-auto">
            <h1 className="text-3xl md:text-5xl font-display font-black text-[#5c4d47] tracking-widest uppercase flex items-center gap-3 md:gap-4">
              <span className="w-1.5 md:w-2 h-6 md:h-8 bg-[#ff758c]" />
              Teman Kos
            </h1>
            <div className="flex items-center gap-4 pl-4 md:pl-6">
              <span className="font-mono text-[8px] md:text-[10px] font-bold text-pink-400/80 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                Productivity System // V 2.2.6
              </span>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1.5 font-mono text-[9px] text-[#5c4d47]/60 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              SYSTEM.STATUS: NOMINAL
            </span>
            <span>DATA_SYNC: ACTIVE</span>
            <span>MEMORY_ALLOC: 42%</span>
          </div>
        </div>

        {/* Center Left Info Panel */}
        <div className="flex-1 flex flex-col justify-center max-w-lg pointer-events-auto mt-10 md:mt-0">
          <div className="relative pl-6 md:pl-8 py-6 md:py-8 mb-4 md:mb-8 bg-gradient-to-r from-white/95 to-white/40 md:to-transparent backdrop-blur-md rounded-r-2xl md:rounded-r-3xl border-y border-r border-white/50 md:border-none">
            {/* Accent Line */}
            <div className="absolute left-0 top-0 w-1 md:w-1.5 h-full bg-gradient-to-b from-[#ff758c] to-amber-300 rounded-full" />
            
            <h2 className="text-2xl md:text-4xl font-display font-black text-[#5c4d47] mb-3 md:mb-4 uppercase tracking-[0.1em] md:tracking-[0.15em] leading-tight">
              Virtual <br/> Companion
            </h2>
            <p className="text-[13px] md:text-base text-[#5c4d47]/80 md:text-gray-500 font-medium leading-relaxed font-sans mb-6 md:mb-8 max-w-[280px] md:max-w-sm">
              Temukan ritme kerjamu bersama Livia. Sistem pendamping produktivitas yang dirancang khusus untuk menemani fokus dan belajarmu di lingkungan kos yang nyaman.
            </p>
            
            {/* Tech stats decorative */}
            <div className="flex gap-6 md:gap-8 font-mono text-[9px] md:text-[10px] text-pink-500 md:text-pink-400 font-bold uppercase tracking-widest border-t border-pink-200/50 md:border-pink-100 pt-4 md:pt-6 w-max">
              <div>
                <span className="text-[#5c4d47]/50 md:text-gray-400 block mb-0.5 md:mb-1">MODULE</span>
                POMODORO
              </div>
              <div>
                <span className="text-[#5c4d47]/50 md:text-gray-400 block mb-0.5 md:mb-1">INTERACTION</span>
                VN_DIALOGUE
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="w-full md:absolute md:bottom-14 md:right-14 flex flex-col md:flex-col gap-3 pointer-events-auto z-50 mt-auto pb-4 md:pb-0 md:w-auto">
          
          <Link href="/register" className="group relative flex items-center justify-between w-full md:w-[320px] bg-white/95 md:bg-white/90 backdrop-blur-xl border border-pink-200 p-4 md:p-5 shadow-[0_10px_40px_rgba(255,117,140,0.15)] hover:border-[#ff758c] transition-all duration-300 overflow-hidden">
            <div className="absolute left-0 top-0 w-1.5 h-full bg-[#ff758c] group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-0" />
            
            <span className="font-display font-black text-[#5c4d47] group-hover:text-white uppercase tracking-widest z-10 pl-2 transition-colors text-sm md:text-base">
              Mulai Sekarang
            </span>
            <span className="font-mono text-[9px] md:text-[10px] text-pink-500 md:text-pink-400 group-hover:text-pink-100 z-10 transition-colors tracking-widest">
              [ REGISTRATION ]
            </span>
          </Link>

          <Link href="/login" className="group relative flex items-center justify-between w-full md:w-[320px] bg-white/80 md:bg-white/40 backdrop-blur-md border border-gray-200 p-4 md:p-5 hover:bg-white/90 transition-all duration-300 shadow-sm md:shadow-none">
            <span className="font-display font-black text-gray-600 md:text-gray-500 group-hover:text-[#5c4d47] uppercase tracking-widest z-10 pl-2 transition-colors text-sm md:text-base">
              Akses Sistem
            </span>
            <span className="font-mono text-[9px] md:text-[10px] text-gray-500 md:text-gray-400 group-hover:text-gray-500 z-10 transition-colors tracking-widest">
              [ LOGIN ]
            </span>
          </Link>

        </div>

      </div>

    </div>
  );
}
