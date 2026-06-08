import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-pink-50 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-[2px] pointer-events-none"
        style={{ backgroundImage: "url('/bg/bedroom.png')" }} 
      />
      
      <div className="max-w-2xl space-y-8 z-10 relative">
        <h1 className="text-6xl md:text-8xl font-display font-black text-pink-500 tracking-wider drop-shadow-md">
          Teman Kos
        </h1>
        <p className="text-xl md:text-2xl text-pink-700 font-medium leading-relaxed drop-shadow-sm">
          Produktivitas tidak harus sepi. Temukan ritme kerjamu bersama Livia, 
          teman kos virtual yang siap menemanimu fokus dan berkembang.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
          <Link 
            href="/register" 
            className="px-10 py-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white font-bold rounded-full hover:scale-105 hover:shadow-lg transition-all duration-300 w-full sm:w-auto shadow-md"
          >
            Mulai Sekarang
          </Link>
          <Link 
            href="/login" 
            className="px-10 py-4 bg-white border-2 border-pink-300 text-pink-500 font-bold rounded-full hover:bg-pink-50 hover:scale-105 transition-all duration-300 w-full sm:w-auto shadow-sm"
          >
            Masuk
          </Link>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pink-300 opacity-20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-200 opacity-20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
