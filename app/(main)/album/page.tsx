'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Camera, Image as ImageIcon, Heart, Calendar, BookHeart, Lock } from 'lucide-react';

const EMOJIS = ["👋", "🍜", "📚", "🪴", "☕", "🎮", "🌧️", "🧳", "🎥", "🍳", "🎉", "🎁", "📝", "⛩️", "🍲", "🏢"];
const GRADIENTS = [
  "from-orange-200 to-amber-300", 
  "from-pink-200 to-rose-300", 
  "from-emerald-200 to-teal-300", 
  "from-indigo-200 to-purple-300", 
  "from-blue-200 to-cyan-300"
];

const CAPTIONS = [
  "Hari pertama di kosan. Berharap tetangga sebelah nggak berisik... ternyata dia Livia.", // Babak 0: Hari Pertama
  "Akhirnya kenalan lebih dekat. Ternyata di balik sifat kakunya, dia lumayan perhatian.", // Babak 1: Kenalan
  "Malam-malam panik gara-gara kecoa. Nggak nyangka dia yang kelihatan galak bisa setakut itu.", // Babak 2: Kecoa Malam
  "Kosan ini udah nggak asing lagi. Kehadirannya perlahan bikin tempat ini terasa kayak rumah kedua.", // Babak 3: Rumah Kedua
  "Sekarang kita resmi jadi 'sahabat'. Lucu juga mikirin gimana awalnya kita cuma sekadar tetangga kamar.", // Babak 4: Sahabat
  "Makin sering ngabisin waktu bareng di ruang tengah. Rasanya kosan ini udah jadi 'rumah kita' berdua.", // Babak 5: Rumah Kita
  "Tanpa disadari, nungguin dia pulang part-time udah jadi kebiasaanku tiap malam.", // Babak 6: Sebuah Kebiasaan
  "Akhir pekan pemalas. Rebahan di karpet sambil nonton TV... rutinitas sederhana yang nggak pengen kuubah.", // Babak 7: Akhir Pekan Pemalas
  "Nemenin dia pulang kampung. Ketemu keluarganya bikin aku sadar kalau aku pengen serius sama dia.", // Babak 8: Pulang Kampung
  "Malam itu, di bawah bintang, aku ngucapin sebuah janji. Janji buat terus ngejaga senyumnya.", // Babak 9: Sebuah Janji
  "Ribetnya ngurus persiapan pernikahan. Tapi ngelihat antusiasmenya pilih gaun, capekku langsung hilang.", // Babak 10: Persiapan Pernikahan
  "Hari pernikahan suci kita. Ngelihat dia jalan di altar, aku beruntung banget bisa manggil dia istriku.", // Babak 11: Pernikahan Suci
  "Pulang ke kuil keluarganya sebagai suami istri. Doa kita sekarang resmi jadi satu.", // Babak 12: Pulang ke Kuil Keluarga
  "Menjaga stan kuil di malam pergantian tahun. Livia terlihat sangat anggun dalam balutan pakaian kuilnya.", // Babak 13: Pengurus Kuil
  "Mengunjungi apartemen Naomi usai tahun baru. Bersama Livia, kami membawakan seporsi kehangatan untuk sang kakak.", // Babak 14: Seporsi Kehangatan
  "Hari pindahan dari kamar kost lama ke apartemen baru. Dari sekadar Teman Kost, kini resmi menjadi Teman Hidup selamanya." // Babak 15: Pindahan ke Apartemen
];

const CHAPTER_TITLES = [
  "Hari Pertama",
  "Kenalan",
  "Kecoa Malam",
  "Rumah Kedua",
  "Sahabat",
  "Rumah Kita",
  "Sebuah Kebiasaan",
  "Akhir Pekan Pemalas",
  "Pulang Kampung",
  "Sebuah Janji",
  "Persiapan Pernikahan",
  "Pernikahan Suci",
  "Pulang ke Kuil Keluarga",
  "Pengurus Kuil",
  "Seporsi Kehangatan",
  "Pindahan ke Apartemen"
];

export default function AlbumPage() {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [unlockedChapters, setUnlockedChapters] = useState<number[]>([]);
  const [itemsBrought, setItemsBrought] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/affection')
      .then(r => r.json())
      .then(d => {
        if (d && d.unlockedChapters) setUnlockedChapters(d.unlockedChapters);
        if (d && d.itemsBrought) setItemsBrought(d.itemsBrought);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Generate 16 Memories for the 16 chapters (Babak 0 to 15)
  const MEMORIES = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    chapterNum: i,
    title: CHAPTER_TITLES[i] || `Memori Babak ${i}`,
    date: `Tersimpan di Hati`,
    caption: CAPTIONS[i] || `Momen berharga bersama Livia dari cerita Babak ${i}.`,
    rotation: Math.floor(Math.random() * 8) - 4,
    unlockedEmoji: EMOJIS[i] || "✨",
    unlockedGradient: GRADIENTS[i % GRADIENTS.length]
  }));

  return (
    <div className="min-h-[100dvh] w-full bg-[#f4ebd8] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Scrapbook Background Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30 mix-blend-multiply z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      {/* Grid Lines */}
      <div className="absolute inset-0 opacity-[0.05] z-0" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      {/* Top Header */}
      <div className="w-full p-6 md:p-10 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-6">
          <Link 
            href="/home" 
            className="bg-[#fdfbf7] border-2 border-[#d5c3aa] w-12 h-12 rounded-full flex items-center justify-center text-[#5c4d47] shadow-sm hover:scale-105 hover:bg-orange-50 transition-all group shrink-0"
          >
            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-display font-black text-3xl md:text-4xl text-[#5c4d47] tracking-tighter flex items-center gap-2 drop-shadow-sm">
              Buku Kenangan <BookHeart className="text-[#ff758c]" />
            </h1>
            <p className="text-sm font-bold text-[#8b7355] italic">Koleksi foto & memori bersama Livia</p>
          </div>
        </div>
      </div>

      {/* Polaroids Board */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10 relative z-10 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-[#d5c3aa] gap-4">
            <div className="w-12 h-12 border-4 border-[#e8dcc8] border-t-[#d5c3aa] rounded-full animate-spin" />
            <span className="font-bold">Membuka buku kenangan...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 md:gap-10 pb-20">
            {MEMORIES.map((mem) => {
              const isUnlocked = unlockedChapters.includes(mem.id);

              return (
                <div 
                  key={mem.id}
                  onClick={() => isUnlocked && setSelectedPhoto(mem.id)}
                  className={`relative group transition-all duration-300 ${isUnlocked ? 'cursor-pointer hover:z-50' : 'cursor-not-allowed opacity-80'}`}
                  style={{ transform: `rotate(${mem.rotation}deg)` }}
                >
                  {/* Masking Tape */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/40 backdrop-blur-sm shadow-sm z-20 rotate-[-5deg]" style={{ clipPath: 'polygon(5% 0%, 95% 5%, 100% 100%, 0% 95%)' }} />
                  
                  {/* Polaroid Frame */}
                  <div className={`bg-[#fffdfa] p-3 pb-10 rounded-sm border border-[#f0e6d2] transition-all duration-300 ${isUnlocked ? 'shadow-[2px_5px_15px_rgba(0,0,0,0.1)] group-hover:shadow-[5px_15px_30px_rgba(0,0,0,0.2)] group-hover:-translate-y-2' : 'shadow-sm grayscale-[0.5]'}`}>
                    
                    {/* Photo Area */}
                    <div className={`w-full aspect-square shadow-inner flex flex-col items-center justify-center relative overflow-hidden ${isUnlocked ? `bg-gradient-to-br ${mem.unlockedGradient} group-hover:scale-[1.02] transition-transform` : 'bg-gray-100 border-2 border-dashed border-gray-200'}`}>
                      {isUnlocked ? (
                        <>
                          <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
                          <span className="text-5xl drop-shadow-lg z-10">{mem.unlockedEmoji}</span>
                          <Camera className="absolute bottom-2 right-2 text-white/50 w-5 h-5 z-10" />
                        </>
                      ) : (
                        <Lock className="text-gray-300 w-12 h-12" />
                      )}
                    </div>

                    {/* Hand-written Text Area */}
                    <div className="absolute bottom-2 left-0 w-full px-4 flex flex-col items-center">
                      <span className={`font-serif italic font-bold text-lg text-center leading-tight ${isUnlocked ? 'text-[#5c4d47]' : 'text-gray-400'}`}>
                        {isUnlocked ? mem.title : `Babak ${mem.chapterNum}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Coming Soon Slot */}
            <div className="relative group cursor-not-allowed opacity-70" style={{ transform: 'rotate(2deg)' }}>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/40 backdrop-blur-sm shadow-sm z-20 rotate-[3deg]" style={{ clipPath: 'polygon(2% 5%, 98% 0%, 95% 95%, 5% 100%)' }} />
              <div className="bg-[#fffdfa] p-3 pb-10 rounded-sm shadow-[2px_5px_15px_rgba(0,0,0,0.05)] border border-[#f0e6d2]">
                <div className="w-full aspect-square bg-gray-50 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 gap-2 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ccc 0, #ccc 1px, transparent 1px, transparent 10px)' }} />
                  <ImageIcon className="text-gray-300 w-10 h-10 z-10" />
                  <span className="text-xs font-bold text-gray-400 z-10 tracking-widest uppercase mt-2">Akan Datang</span>
                </div>
                <div className="absolute bottom-2 left-0 w-full px-4 flex flex-col items-center">
                  <span className="font-serif italic font-bold text-lg text-center leading-tight text-gray-400">
                    Babak Berikutnya
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Lightbox / Focus Mode */}
      {selectedPhoto !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-[fadeIn_0.3s_ease-out]"
          onClick={() => setSelectedPhoto(null)}
        >
          {MEMORIES.filter(m => m.id === selectedPhoto).map(mem => (
            <div 
              key={mem.id} 
              className="bg-[#fffdfa] p-4 md:p-6 pb-16 md:pb-24 rounded-sm shadow-2xl max-w-xl w-full flex flex-col animate-[slideUp_0.4s_ease-out] relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Pin/Tape on Lightbox */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-10 bg-white/50 backdrop-blur-md shadow-sm z-20 rotate-[-2deg]" style={{ clipPath: 'polygon(5% 0%, 95% 5%, 100% 100%, 0% 95%)' }} />

              <div className={`w-full aspect-[4/3] bg-gradient-to-br ${mem.unlockedGradient} shadow-inner flex flex-col items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
                <span className="text-[120px] drop-shadow-2xl z-10 animate-[bounce_3s_ease-in-out_infinite]">{mem.unlockedEmoji}</span>
              </div>
              
              <div className="absolute bottom-5 left-0 w-full px-8 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-gray-400 font-mono text-xs tracking-widest">
                  <Calendar size={12} /> {mem.date}
                </div>
                <p className="font-serif italic font-bold text-xl md:text-2xl text-[#5c4d47] text-center">
                  "{mem.caption}"
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Heart className="w-3 h-3 text-pink-300 fill-pink-300" />
                  <Heart className="w-3 h-3 text-pink-300 fill-pink-300" />
                  <Heart className="w-3 h-3 text-pink-300 fill-pink-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
