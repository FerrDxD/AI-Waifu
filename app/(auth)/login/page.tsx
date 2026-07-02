import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 bg-gradient-to-br from-[#fdfbf7] via-[#fff5f6] to-[#fff0e6] relative overflow-hidden font-sans selection:bg-[#ff758c] selection:text-white select-none">
      
      {/* Decorative Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-pink-300/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-orange-300/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-[40%] right-[10%] w-[250px] h-[250px] bg-rose-200/20 rounded-full blur-2xl pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-[440px] bg-white/80 backdrop-blur-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl border-2 border-orange-100/80 relative z-10 flex flex-col items-center mt-8 pt-14">
        
        {/* Chibi Livia Mascot */}
        <div className="absolute -top-16 w-32 h-32 drop-shadow-md animate-bounce pointer-events-none">
          <Image 
            src="/livia/chibi-livia.webp" 
            alt="Chibi Livia" 
            fill 
            className="object-contain" 
            priority
          />
        </div>

        {/* Brand & Greeting Bubble */}
        <div className="text-center mb-6 w-full">
          <Link href="/" className="inline-block text-3xl font-display font-black text-[#5c4d47] tracking-tight hover:scale-105 transition-transform">
            Teman<span className="text-[#ff758c]">Kos</span>
          </Link>
          <div className="mt-3 bg-orange-50/80 border border-orange-200/80 rounded-2xl p-3 text-xs md:text-sm text-[#5c4d47] font-medium shadow-inner relative">
            <span className="text-[#ff758c] font-bold">Livia:</span> &ldquo;Selamat datang kembali! Aku sudah nungguin kamu pulang lho~ 💖&rdquo;
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-50 border-t border-l border-orange-200/80 rotate-45" />
          </div>
        </div>

        {/* Login Form Component */}
        <LoginForm />

        {/* Footer Navigation */}
        <p className="mt-8 text-center text-[#5c4d47]/60 text-xs md:text-sm font-medium">
          Belum punya kunci kos?{' '}
          <Link 
            href="/register" 
            className="text-[#ff758c] font-bold hover:underline underline-offset-4 transition-all ml-1 inline-flex items-center gap-1"
          >
            Daftar Penghuni Baru ✨
          </Link>
        </p>

      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-[11px] text-[#5c4d47]/40 font-bold tracking-widest uppercase z-10">
        AI COMPANION & PRODUCTIVITY ROOM • 2026
      </div>
    </div>
  );
}
