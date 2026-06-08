import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[url('/bg-texture.png')] bg-cover">
      <div className="max-w-2xl space-y-8 z-10 relative">
        <h1 className="text-6xl md:text-8xl font-display italic text-accent tracking-wide drop-shadow-lg">
          Teman Kos
        </h1>
        <p className="text-xl md:text-2xl text-muted font-light leading-relaxed">
          Produktivitas tidak harus sepi. Temukan ritme kerjamu bersama Livia, 
          teman kos virtual yang siap menemanimu fokus dan berkembang.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
          <Link 
            href="/register" 
            className="px-8 py-3 bg-accent text-black font-medium rounded-sm hover:bg-[#d6a578] transition-colors duration-300 w-full sm:w-auto"
          >
            Mulai Sekarang
          </Link>
          <Link 
            href="/login" 
            className="px-8 py-3 border border-custom text-text-primary rounded-sm hover:bg-surface transition-colors duration-300 w-full sm:w-auto"
          >
            Masuk
          </Link>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8b6f5e] opacity-5 rounded-full blur-3xl" />
    </div>
  );
}
