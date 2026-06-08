'use client';

import { useState, useEffect } from 'react';
import DialogBox from '@/components/livia/DialogBox';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Lock } from 'lucide-react';

interface Chapter {
  id: number;
  title: string;
  reqAffection: number;
  reqLevel: number;
  content: { speaker: string, text: string, expression: any }[];
}

const CHAPTERS: Chapter[] = [
  {
    id: 0,
    title: "Hari Pertama",
    reqAffection: 0,
    reqLevel: 0,
    content: [
      { speaker: "Livia", text: "Jadi... ini kamarku yang baru.", expression: "normal" },
      { speaker: "Livia", text: "Kecil banget. Tapi ya sudahlah, namanya juga ngekos.", expression: "angry" },
      { speaker: "Livia", text: "Makasih udah bantu beresin barang-barangku. A-aku nggak nyuruh loh ya, kamu yang nawarin diri.", expression: "blushing" },
      { speaker: "Narator", text: "Kamu tersenyum melihatnya salah tingkah.", expression: "normal" },
      { speaker: "Livia", text: "Apa senyum-senyum?! Cepet balik ke kamarmu sana!", expression: "angry" },
    ]
  },
  {
    id: 1,
    title: "Kenalan",
    reqAffection: 20,
    reqLevel: 1,
    content: [
      { speaker: "Livia", text: "Hei. Kamu lagi ngapain?", expression: "normal" },
      { speaker: "Livia", text: "Ibuku nelpon tadi. Nanyain aku betah atau nggak.", expression: "normal" },
      { speaker: "Livia", text: "Tentu saja aku bilang betah. Aku bukan anak kecil lagi yang harus diurusin.", expression: "angry" },
      { speaker: "Livia", text: "...Walaupun kadang sepi sih. Ah, lupain aja!", expression: "blushing" },
    ]
  },
  {
    id: 2,
    title: "Tetangga",
    reqAffection: 40,
    reqLevel: 2,
    content: [
      { speaker: "Livia", text: "Hei... bisa minta tolong sebentar?", expression: "blushing" },
      // Placeholder for now
      { speaker: "Narator", text: "[Konten Chapter 2 akan datang]", expression: "normal" }
    ]
  },
  {
    id: 3,
    title: "Teman",
    reqAffection: 60,
    reqLevel: 3,
    content: [
      { speaker: "Livia", text: "Aku... agak takut sendirian malam ini.", expression: "clingy" },
      { speaker: "Narator", text: "[Konten Chapter 3 akan datang]", expression: "normal" }
    ]
  },
  {
    id: 4,
    title: "Sahabat",
    reqAffection: 80,
    reqLevel: 4,
    content: [
      { speaker: "Livia", text: "Kamu tau kan kalau kamu itu spesial buatku? ...Eh! Bukan gitu maksudnya!", expression: "blushing" },
      { speaker: "Narator", text: "[Konten Chapter 4 akan datang]", expression: "normal" }
    ]
  },
  {
    id: 5,
    title: "Rumah",
    reqAffection: 100,
    reqLevel: 5,
    content: [
      { speaker: "Livia", text: "Terima kasih sudah jadi rumah buatku.", expression: "happy" },
      { speaker: "Narator", text: "[Konten Chapter 5 akan datang]", expression: "normal" }
    ]
  }
];

export default function StoryPage() {
  const [unlockedChapters, setUnlockedChapters] = useState<number[]>([0]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    // Mock fetch profile story progress. In a real app we fetch it from the server.
    // For now, let's just assume we only have chapter 0 unlocked.
  }, []);

  const openChapter = (chap: Chapter) => {
    setActiveChapter(chap);
    setSceneIndex(0);
  };

  const handleNextScene = () => {
    if (activeChapter && sceneIndex < activeChapter.content.length - 1) {
      setSceneIndex(prev => prev + 1);
    } else {
      setActiveChapter(null); // Close VN reader
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 relative p-8 overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-[3px] pointer-events-none"
        style={{ backgroundImage: "url('/bg/bedroom.png')" }} 
      />

      {activeChapter ? (
        // VN Reader Fullscreen
        <div className="absolute inset-0 z-50 bg-pink-50/95 backdrop-blur-md flex flex-col items-center justify-between py-12 px-6">
          <div className="w-full flex justify-between px-8">
            <span className="font-display font-bold text-pink-400 bg-white px-4 py-1 rounded-full shadow-sm">
              {activeChapter.title}
            </span>
            <button onClick={() => setActiveChapter(null)} className="text-pink-400 hover:text-pink-600 font-bold bg-white px-4 py-1 rounded-full shadow-sm hover:scale-105 transition-all">
              Tutup [X]
            </button>
          </div>
          
          <div className="flex-1 w-full max-w-4xl flex justify-center items-end pb-12">
            {activeChapter.content[sceneIndex].speaker === 'Livia' && (
              <div className="h-[550px] w-[450px] drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)]">
                <LiviaSprite expression={activeChapter.content[sceneIndex].expression} className="h-full w-full object-contain object-bottom" />
              </div>
            )}
          </div>
          
          <div className="w-full max-w-4xl">
            <DialogBox 
              text={activeChapter.content[sceneIndex].text}
              speaker={activeChapter.content[sceneIndex].speaker === 'Narator' ? '' : activeChapter.content[sceneIndex].speaker}
              onNext={handleNextScene}
            />
          </div>
        </div>
      ) : (
        // Chapter Selection
        <div className="z-10 relative max-w-5xl mx-auto pt-12">
          <h1 className="text-4xl font-display font-black text-pink-500 mb-12 text-center drop-shadow-sm">Jurnal Kenangan</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CHAPTERS.map(chap => {
              const isUnlocked = unlockedChapters.includes(chap.id);
              
              return (
                <div 
                  key={chap.id}
                  onClick={() => isUnlocked ? openChapter(chap) : null}
                  className={`relative overflow-hidden rounded-3xl border-4 p-6 h-48 flex flex-col justify-end transition-all
                    ${isUnlocked 
                      ? 'border-white bg-white/80 backdrop-blur-md cursor-pointer hover:scale-105 hover:shadow-[0_15px_30px_rgba(255,154,158,0.3)] hover:-translate-y-2' 
                      : 'border-pink-100 bg-white/40 cursor-not-allowed opacity-80'
                    }`}
                >
                  {!isUnlocked && (
                    <div className="absolute inset-0 backdrop-blur-sm flex flex-col items-center justify-center z-10 bg-pink-50/50">
                      <Lock className="w-8 h-8 mb-2 text-pink-300" />
                      <span className="text-sm font-mono font-bold text-pink-400 bg-white px-3 py-1 rounded-full shadow-sm">
                        Butuh Afeksi: {chap.reqAffection}
                      </span>
                    </div>
                  )}
                  
                  <div className="z-0 relative">
                    <span className="text-pink-400 text-sm font-black mb-2 block tracking-wider uppercase">Bab {chap.id}</span>
                    <h3 className="text-3xl font-display font-bold text-[#5c4d47]">{chap.title}</h3>
                  </div>
                  
                  {isUnlocked && (
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-tr from-pink-200 to-pink-50 rounded-full opacity-50 z-[-1]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
