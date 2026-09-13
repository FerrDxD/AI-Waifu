import Link from 'next/link';
import LiviaSprite from '@/components/livia/LiviaSprite';
import ApiGuideModal from '@/components/guide/ApiGuideModal';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#fdfbf7] overflow-hidden font-sans select-none text-[#5c4d47]">
      <ApiGuideModal showFloatingButton={true} />
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-multiply transition-transform duration-[30s] ease-out hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100"
        style={{ backgroundImage: "url('/bg/bedroom.webp')" }} 
      />
      
      {/* UI Frost / Gradient Layers */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/50 to-white/90 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#ff758c]/10 z-0 pointer-events-none" />

      {/* GF2 Tactical Grid & Crosshairs */}
      <div className="absolute top-6 left-6 w-8 h-8 border-t border-l border-pink-300/60 z-10 pointer-events-none" />
      <div className="absolute top-6 right-6 w-8 h-8 border-t border-r border-pink-300/60 z-10 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-b border-l border-pink-300/60 z-10 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-b border-r border-pink-300/60 z-10 pointer-events-none" />
      
      {/* Fine tactical lines */}
      <div className="absolute top-[3.5rem] left-16 right-16 h-[1px] bg-gradient-to-r from-pink-200/50 via-transparent to-pink-200/50 z-10 pointer-events-none hidden md:block" />
      <div className="absolute bottom-[3.5rem] left-16 right-16 h-[1px] bg-gradient-to-r from-pink-200/50 via-transparent to-pink-200/50 z-10 pointer-events-none hidden md:block" />
      <div className="absolute left-[3.5rem] top-16 bottom-16 w-[1px] bg-gradient-to-b from-pink-200/50 via-transparent to-pink-200/50 z-10 pointer-events-none hidden md:block" />
      <div className="absolute right-[3.5rem] top-16 bottom-16 w-[1px] bg-gradient-to-b from-pink-200/50 via-transparent to-pink-200/50 z-10 pointer-events-none hidden md:block" />

      {/* Character Display */}
      <div className="absolute inset-0 flex items-end justify-end md:justify-center md:pl-[15%] pointer-events-none z-30">
        <LiviaSprite 
          expression="normal" 
          outfit="landing-page"
          disableFloat={true}
          className="h-[90vh] sm:h-[110vh] md:h-[130vh] w-[80vw] sm:w-[500px] md:w-[650px] drop-shadow-[0_15px_40px_rgba(255,117,140,0.15)] translate-y-[15vh] md:translate-y-[20vh] translate-x-6 md:translate-x-0"
        />
      </div>

      {/* Main UI Container */}
      <div className="relative z-20 w-full h-screen flex flex-col justify-between p-6 md:p-14 pointer-events-none overflow-hidden">
        
        {/* Header Area */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1.5 md:gap-2 pointer-events-auto">
            <h1 className="text-4xl md:text-6xl font-display font-black text-[#5c4d47] tracking-widest uppercase flex items-center gap-3 md:gap-4 drop-shadow-sm">
              <span className="w-1.5 md:w-2 h-7 md:h-10 bg-[#ff758c] shadow-[0_0_10px_rgba(255,117,140,0.5)]" />
              Teman Kos
            </h1>
            <div className="flex items-center gap-4 pl-4 md:pl-6">
              <span className="font-mono text-[9px] md:text-[11px] font-bold text-pink-600/90 uppercase tracking-[0.25em] md:tracking-[0.3em]">
                Productivity System <span className="text-pink-300 mx-1">/</span> V 2.4.6
              </span>
            </div>
          </div>

          {/* Tactical Status HUD */}
          <div className="hidden md:flex flex-col items-end gap-2 font-mono text-[10px] text-[#5c4d47]/80 uppercase tracking-[0.2em] bg-white/60 backdrop-blur-md px-4 py-3 rounded-bl-xl border-l border-b border-pink-200/60 shadow-[0_4px_20px_rgba(255,117,140,0.05)]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.6)]" />
              <span className="font-bold">SYSTEM.STATUS: NOMINAL</span>
            </div>
            <div className="flex items-center gap-3">
              <span>DATA_SYNC:</span>
              <span className="text-pink-600 font-bold">ACTIVE</span>
            </div>
            <div className="flex items-center gap-3 w-full justify-end">
              <span>MEM:</span>
              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="w-[42%] h-full bg-pink-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Center Left Info Panel */}
        <div className="flex-1 flex flex-col justify-center max-w-lg pointer-events-auto md:mt-0 relative z-40">
          <div className="group relative pl-6 md:pl-8 py-6 md:py-8 mb-2 md:mb-8 bg-white/70 hover:bg-white/80 backdrop-blur-xl rounded-r-3xl border border-white/60 shadow-[0_8px_32px_rgba(255,117,140,0.1)] w-[90%] md:w-auto transition-all duration-300">
            {/* Accent Line */}
            <div className="absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-[#ff758c] to-amber-300 rounded-full shadow-[0_0_8px_rgba(255,117,140,0.4)]" />
            
            <div className="absolute -top-3 left-6 bg-pink-100/90 text-pink-700 font-mono text-[9px] px-2 py-0.5 rounded-sm tracking-widest uppercase font-bold border border-pink-200">
              [ COMPANION_MODULE ]
            </div>

            <h2 className="text-2xl md:text-4xl font-display font-black text-[#5c4d47] mb-3 md:mb-4 uppercase tracking-[0.1em] md:tracking-[0.15em] leading-tight">
              Virtual <br className="hidden md:block" /> Companion
            </h2>
            <p className="text-[13px] md:text-base text-[#5c4d47]/80 font-medium leading-relaxed font-sans mb-5 md:mb-8 max-w-[240px] md:max-w-sm">
              Temukan ritme kerjamu bersama Livia. Sistem pendamping produktivitas yang dirancang khusus untuk menemani fokus dan belajarmu di lingkungan kos yang nyaman.
            </p>
            
            {/* Tech stats decorative */}
            <div className="flex gap-6 md:gap-10 font-mono text-[9px] md:text-[11px] text-pink-600 font-bold uppercase tracking-widest border-t border-pink-200/60 pt-4 md:pt-6 w-max">
              <div className="flex flex-col gap-1">
                <span className="text-[#5c4d47]/50 text-[8px] md:text-[9px]">MODULE</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-pink-500 rounded-full" /> POMODORO
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#5c4d47]/50 text-[8px] md:text-[9px]">INTERACTION</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-pink-500 rounded-full" /> VN_DIALOGUE
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-8 left-6 right-6 md:left-auto md:right-14 md:bottom-14 flex flex-col gap-3.5 pointer-events-auto z-40 md:w-auto">
        <Link 
          href="/register" 
          className="group relative flex items-center justify-between w-full md:w-[320px] bg-white/95 backdrop-blur-xl border border-pink-300/50 p-4 md:p-5 shadow-[0_8px_30px_rgba(255,117,140,0.2)] hover:shadow-[0_8px_30px_rgba(255,117,140,0.4)] hover:border-pink-400 transition-all duration-300 overflow-hidden active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdfbf7] rounded-sm"
        >
          {/* Animated Background Fill */}
          <div className="absolute left-0 top-0 w-1.5 h-full bg-[#ff758c] group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-0" />
          
          {/* Scanner Line Effect */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-white/40 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out z-10" />

          <span className="font-display font-black text-[#5c4d47] group-hover:text-white uppercase tracking-widest z-10 pl-2 transition-colors text-sm md:text-base">
            Mulai Sekarang
          </span>
          <span className="font-mono text-[9px] md:text-[11px] font-bold text-pink-600 group-hover:text-pink-100 z-10 transition-colors tracking-widest bg-pink-50 group-hover:bg-pink-400/20 px-2 py-0.5 rounded-sm">
            [ SIGN UP ]
          </span>
        </Link>

        <Link 
          href="/login" 
          className="group relative flex items-center justify-between w-full md:w-[320px] bg-white/60 hover:bg-white/95 backdrop-blur-md border border-gray-200 p-4 md:p-5 transition-all duration-300 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdfbf7] rounded-sm"
        >
          <span className="font-display font-black text-gray-700 group-hover:text-[#5c4d47] uppercase tracking-widest z-10 pl-2 transition-colors text-sm md:text-base">
            Akses Sistem
          </span>
          <span className="font-mono text-[9px] md:text-[11px] font-bold text-gray-500 group-hover:text-gray-600 z-10 transition-colors tracking-widest px-2 py-0.5 rounded-sm group-hover:bg-gray-100">
            [ SIGN IN ]
          </span>
        </Link>
      </div>

    </div>
  );
}
