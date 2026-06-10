'use client';

import { useState, useEffect } from 'react';
import DialogBox from '@/components/livia/DialogBox';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Lock } from 'lucide-react';

type Choice = {
  text: string;
  nextIndex: number;
};

interface Chapter {
  id: number;
  title: string;
  reqAffection: number;
  reqLevel: number;
  content: { 
    speaker: string; 
    text: string; 
    expression: any;
    choices?: Choice[];
    nextIndex?: number;
  }[];
}

const CHAPTERS: Chapter[] = [
  {
    id: 0,
    title: "Hari Pertama",
    reqAffection: 0,
    reqLevel: 0,
    content: [
      // 0
      { speaker: "Livia", text: "Jadi... ini kamarku yang baru.", expression: "normal" },
      // 1
      { speaker: "Livia", text: "Kecil banget. Tapi ya sudahlah, namanya juga ngekos.", expression: "angry" },
      // 2
      { speaker: "Livia", text: "Makasih udah bantu beresin barang-barangku. A-aku nggak nyuruh loh ya, kamu yang nawarin diri.", expression: "blushing",
        choices: [
          { text: "Nggak apa-apa, kan kita tetanggaan.", nextIndex: 3 },
          { text: "Lain kali bayar ya pakai traktiran.", nextIndex: 4 }
        ]
      },
      // 3 (Branch A)
      { speaker: "Narator", text: "Kamu tersenyum melihatnya salah tingkah mengatur barang.", expression: "normal", nextIndex: 5 },
      // 4 (Branch B)
      { speaker: "Livia", text: "Hah?! Pelit banget sih! Yaudah, nanti aku traktir es krim. Puas?!", expression: "angry", nextIndex: 6 },
      // 5 (Convergence from A)
      { speaker: "Livia", text: "Apa senyum-senyum?! Jangan mikir macem-macem!", expression: "angry", nextIndex: 6 },
      // 6
      { speaker: "Livia", text: "Mending kamu balik ke kamarmu sana. Aku mau istirahat.", expression: "normal" },
      // 7
      { speaker: "Narator", text: "Kamu mengangguk dan berbalik pergi ke kamarmu yang terletak persis di sebelahnya.", expression: "normal" },
      // 8
      { speaker: "Livia", text: "...Hei.", expression: "normal" },
      // 9
      { speaker: "Livia", text: "Tolong... bimbingannya ya, tetangga.", expression: "blushing" }
    ]
  },
  {
    id: 1,
    title: "Kenalan",
    reqAffection: 20,
    reqLevel: 1,
    content: [
      // 0
      { speaker: "Livia", text: "Hei. Kamu lagi sibuk nggak?", expression: "normal" },
      // 1
      { speaker: "Narator", text: "Kamu menoleh dari mejamu, melihat Livia mengintip dari balik pintu yang setengah terbuka.", expression: "normal" },
      // 2
      { speaker: "Livia", text: "Ibuku nelpon tadi. Nanyain aku betah atau nggak tinggal di sini.", expression: "normal" },
      // 3
      { speaker: "Livia", text: "Tentu saja aku bilang betah! Aku bukan anak kecil lagi yang harus diurusin.", expression: "angry" },
      // 4
      { speaker: "Livia", text: "Lagipula... lingkungan di sini lumayan. Nggak seburuk yang kubayangkan.", expression: "blushing" },
      // 5
      { speaker: "Livia", text: "Dan, eh... kamu lumayan bisa diandalkan juga sebagai tetangga.", expression: "happy",
        choices: [
          { text: "Makasih. Kamu juga tetangga yang baik.", nextIndex: 6 },
          { text: "Tumben kamu muji? Ada maunya ya?", nextIndex: 7 }
        ]
      },
      // 6 (Branch A)
      { speaker: "Livia", text: "J-jangan dibalas serius gitu dong! Bikin malu aja!", expression: "blushing", nextIndex: 8 },
      // 7 (Branch B)
      { speaker: "Livia", text: "Enak aja! Aku kan cuma jujur! Udah ah, males ngomong sama kamu!", expression: "angry", nextIndex: 8 },
      // 8
      { speaker: "Narator", text: "Dia memalingkan wajahnya sedikit, pura-pura melihat ke arah koridor.", expression: "normal" },
      // 9
      { speaker: "Livia", text: "Sudahlah, aku mau masak mi instan.", expression: "normal" },
      // 10
      { speaker: "Livia", text: "...Kamu mau kubuatin juga nggak? Tanggung airnya sekalian direbus.", expression: "clingy" }
    ]
  },
  {
    id: 2,
    title: "Kecoa Malam",
    reqAffection: 40,
    reqLevel: 2,
    content: [
      { speaker: "Narator", text: "Cuaca malam ini sedang hujan deras. Terdengar suara ketukan pelan di pintu kamarmu.", expression: "normal" },
      { speaker: "Livia", text: "Hei... kamu udah tidur belum?", expression: "normal" },
      { speaker: "Narator", text: "Livia berdiri di depan pintumu sambil memeluk bantal bonekanya.", expression: "normal" },
      { speaker: "Livia", text: "Di kamarku ada kecoa besar! Aku udah coba usir, tapi dia malah terbang!", expression: "angry" },
      { speaker: "Livia", text: "A-aku nggak takut kok! Cuma jijik aja! Paham kan bedanya?!", expression: "blushing" },
      { speaker: "Narator", text: "Kamu menahan tawa dan bersiap membantunya menjadi pahlawan pengusir serangga.", expression: "normal" },
      { speaker: "Livia", text: "Cepat ambil sapu lidi atau apalah! Kalau dia hilang di bawah kasurku, aku bakal numpang tidur di sini!", expression: "clingy" },
      { speaker: "Livia", text: "Ehh— tunggu, barusan aku ngomong apa?! Lupakan! Cepat bunuh kecoanya!", expression: "angry" }
    ]
  },
  {
    id: 3,
    title: "Rumah Kedua",
    reqAffection: 60,
    reqLevel: 3,
    content: [
      { speaker: "Narator", text: "Akhir pekan yang tenang. Kamu sedang menyeduh kopi saat Livia menghampiri area dapur bersama.", expression: "normal" },
      { speaker: "Livia", text: "Nih. Ibu ngirim terlalu banyak kue kering dari rumah.", expression: "normal" },
      { speaker: "Livia", text: "Karena kamarku nggak muat, kamu ambil sebagian. Bukannya aku sengaja nyisihin buatmu, ya!", expression: "blushing" },
      { speaker: "Narator", text: "Kamu mencoba satu kuenya. Rasanya sangat lezat. Kamu mengucapkan terima kasih padanya.", expression: "normal" },
      { speaker: "Livia", text: "Syukurlah kalau kamu suka... Eh, maksudku, wajar kalau rasanya enak, itu buatan ibuku!", expression: "happy" },
      { speaker: "Livia", text: "Kamu tahu, belakangan ini aku merasa ngekos nggak seburuk yang kukira.", expression: "normal" },
      { speaker: "Livia", text: "Awalnya aku takut sendirian. Tapi karena... karena ada seseorang yang terus memperhatikanku...", expression: "blushing" },
      { speaker: "Livia", text: "Rasanya tempat ini sedikit terasa seperti rumah kedua. Gitu deh.", expression: "clingy" }
    ]
  },
  {
    id: 4,
    title: "Sahabat",
    reqAffection: 80,
    reqLevel: 4,
    content: [
      { speaker: "Livia", text: "Kamu lagi ngerjain tugas? Fokus banget dari tadi.", expression: "normal" },
      { speaker: "Livia", text: "Aku beliin es kopi waktu keluar tadi. Satu buatku, satu buatmu. Jangan protes, minum aja.", expression: "happy" },
      { speaker: "Narator", text: "Kamu menyadari belakangan ini Livia lebih sering menghabiskan waktu di area kerjamu daripada di kamarnya sendiri.", expression: "normal" },
      { speaker: "Livia", text: "Kenapa ngeliatin gitu? Kamarku Wi-Finya lagi lambat, makanya aku duduk di sini! Jangan GR!", expression: "angry" },
      { speaker: "Narator", text: "Kamu tertawa kecil, membiarkannya mencari-cari alasan seperti biasa.", expression: "normal" },
      { speaker: "Livia", text: "I-itu beneran tau! Ah udahlah, kamu ngeselin banget sih!", expression: "blushing" },
      { speaker: "Livia", text: "Terserah kamu mau mikir apa... Aku cuma... merasa lebih tenang kalau ada di dekatmu. Udah, puasss?!", expression: "clingy" },
      { speaker: "Narator", text: "Kamu tersenyum sambil menyeruput es kopimu. Livia kembali fokus ke laptopnya dengan wajah memerah.", expression: "normal" }
    ]
  },
  {
    id: 5,
    title: "Rumah Kita",
    reqAffection: 100,
    reqLevel: 5,
    content: [
      { speaker: "Narator", text: "Beberapa bulan telah berlalu sejak awal kepindahan Livia ke kos ini.", expression: "normal" },
      { speaker: "Livia", text: "Waktu cepat banget berlalu ya.", expression: "normal" },
      { speaker: "Livia", text: "Dulu aku benci banget ninggalin rumah. Tapi sekarang... rasanya aku nggak mau pergi dari tempat ini.", expression: "happy" },
      { speaker: "Livia", text: "Bukan karena kamarnya ya! Kamarnya masih sempit dan atapnya kadang bocor!", expression: "angry" },
      { speaker: "Livia", text: "Tapi... karena alasan lain.", expression: "blushing" },
      { speaker: "Narator", text: "Livia menarik ujung lengan bajumu pelan, menatap lurus ke arah matamu.", expression: "normal" },
      { speaker: "Livia", text: "Kamu tahu kan kalau kamu itu spesial buatku?", expression: "clingy" },
      { speaker: "Livia", text: "Terima kasih... karena selalu sabar menghadapiku. Terima kasih sudah jadi 'rumah' baruku.", expression: "happy" },
      { speaker: "Livia", text: "Mulai sekarang, tolong terus berada di sisiku ya. Janji?", expression: "blushing" }
    ]
  }
];

export default function StoryPage() {
  const [unlockedChapters, setUnlockedChapters] = useState<number[]>([0]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [hoveredChapterId, setHoveredChapterId] = useState<number>(0);
  const [affectionLevel, setAffectionLevel] = useState<number>(0);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/affection');
        if (res.ok) {
          const data = await res.json();
          if (data.unlockedChapters) {
            setUnlockedChapters(data.unlockedChapters);
          }
          if (data.affection !== undefined) {
            setAffectionLevel(data.affection);
          }
        }
      } catch (e) {
        console.error('Failed to fetch story progress', e);
      }
    };
    fetchProgress();
  }, []);

  const openChapter = (chap: Chapter) => {
    setActiveChapter(chap);
    setSceneIndex(0);
  };

  const handleNextScene = () => {
    if (!activeChapter) return;
    const currentScene = activeChapter.content[sceneIndex];
    if (currentScene.choices) return; // Prevent advancing if choice is active
    
    const nextIdx = currentScene.nextIndex !== undefined ? currentScene.nextIndex : sceneIndex + 1;
    if (nextIdx < activeChapter.content.length) {
      setSceneIndex(nextIdx);
    } else {
      setActiveChapter(null); // Close VN reader
    }
  };

  const handleChoice = (nextIdx: number) => {
    setSceneIndex(nextIdx);
  };

  const getExpressionForHover = (id: number) => {
    if (id <= 1) return 'normal';
    if (id <= 3) return 'happy';
    if (id === 4) return 'blushing';
    return 'happy'; // 5
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Subtle Background Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-[2px] pointer-events-none mix-blend-multiply z-0"
        style={{ backgroundImage: "url('/bg/bedroom.png')" }} 
      />

      {activeChapter ? (
        // VN Reader Fullscreen
        <div className="fixed inset-0 z-[100] bg-[#fdfbf7]/95 backdrop-blur-xl flex flex-col items-center justify-between py-6 md:py-12 px-4 md:px-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-full max-w-5xl flex justify-between px-2 md:px-8 z-20 mt-8 md:mt-0">
            <span className="font-display font-bold text-sm md:text-base text-[#ff758c] bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-[0_5px_15px_rgba(255,117,140,0.15)] border border-pink-50">
              {activeChapter.title}
            </span>
            <button onClick={() => setActiveChapter(null)} className="text-gray-400 hover:text-[#ff758c] text-sm md:text-base font-bold bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              Tutup X
            </button>
          </div>
          
          <div className="flex-1 w-full max-w-4xl flex justify-center items-end pb-4 md:pb-8 z-10">
            {activeChapter.content[sceneIndex].speaker === 'Livia' && (
              <div className="h-[55vh] md:h-[60vh] w-auto drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)] animate-[float_4s_ease-in-out_infinite]">
                <LiviaSprite expression={activeChapter.content[sceneIndex].expression} className="h-full w-auto max-w-[500px] object-contain object-bottom" />
              </div>
            )}
          </div>
          
          <div className="w-full max-w-4xl z-20 drop-shadow-2xl relative flex flex-col items-center">
            {/* Choices Overlay */}
            {activeChapter.content[sceneIndex].choices && (
              <div className="absolute bottom-[100%] w-[90%] md:w-full flex flex-col items-center gap-2 md:gap-3 mb-4 md:mb-6 animate-[fadeIn_0.4s_ease-out_forwards]">
                {activeChapter.content[sceneIndex].choices.map((choice, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChoice(choice.nextIndex)}
                    className="w-full max-w-lg bg-white/95 backdrop-blur-md border-2 border-pink-100 py-3 md:py-4 px-4 md:px-6 rounded-2xl shadow-[0_10px_25px_rgba(255,117,140,0.15)] text-[#5c4d47] font-bold font-display hover:border-[#ff758c] hover:text-[#ff758c] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(255,117,140,0.2)] transition-all duration-300 text-center text-sm md:text-lg active:scale-95"
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            )}

            <div className="w-full">
              <DialogBox 
                text={activeChapter.content[sceneIndex].text}
                speaker={activeChapter.content[sceneIndex].speaker === 'Narator' ? '' : activeChapter.content[sceneIndex].speaker}
                onNext={activeChapter.content[sceneIndex].choices ? () => {} : handleNextScene}
              />
            </div>
          </div>
        </div>
      ) : (
        // Bright MiSide-inspired Cinematic Menu
        <div className="absolute inset-0 flex">
          
          {/* Top Right Back Button */}
          <div className="absolute top-6 right-6 md:top-10 md:right-12 z-40">
            <button onClick={() => window.history.back()} className="font-display font-black text-xs md:text-sm text-[#8C7B6B] hover:text-[#ff758c] bg-white/50 backdrop-blur-md md:bg-transparent md:backdrop-blur-none px-3 md:px-0 py-2 md:py-0 rounded-full md:rounded-none transition-colors flex items-center gap-2 md:gap-3 uppercase tracking-widest shadow-sm md:shadow-none">
              <span className="text-lg md:text-xl">←</span> KEMBALI
            </button>
          </div>

          {/* Right Side - Giant Livia */}
          <div className="absolute right-0 bottom-0 w-full md:w-[65%] h-full flex justify-end items-end pointer-events-none z-10 overflow-hidden">
            <div className="relative z-10 w-[150%] md:w-full h-[80vh] md:h-[110vh] max-w-[800px] translate-x-[30%] md:translate-x-[15%] translate-y-[5%] md:translate-y-[5%] opacity-30 md:opacity-100 blur-[2px] md:blur-none">
              <LiviaSprite 
                expression={getExpressionForHover(hoveredChapterId)} 
                className="w-full h-full object-cover object-top filter drop-shadow-[-10px_0_30px_rgba(255,154,158,0.2)] transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]" 
              />
            </div>
          </div>

          {/* Soft White Fade matching background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#fdfbf7] via-[#fdfbf7]/95 to-transparent pointer-events-none z-20 w-[70%]" />

          {/* Left Menu Panel */}
          <div className="relative z-30 w-full md:w-[50%] h-full flex flex-col justify-center px-6 md:pl-24 md:pr-4 pt-16 md:pt-8 pb-12">
            
            <h1 className="text-4xl md:text-7xl font-display font-black text-[#5c4d47] mb-6 md:mb-8 drop-shadow-sm tracking-tighter flex items-center gap-2 md:gap-4 shrink-0">
              <span className="text-amber-400 text-3xl md:text-4xl animate-[pulse_3s_ease-in-out_infinite]">✦</span>
              CERITA KITA
            </h1>

            <div className="flex flex-col gap-2 w-full max-w-[450px] max-h-[65vh] overflow-y-auto overflow-x-hidden pr-4 pb-20 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent">
              {CHAPTERS.map(chap => {
                const isUnlocked = affectionLevel >= chap.reqAffection;
                const isHovered = hoveredChapterId === chap.id;

                return (
                  <div 
                    key={chap.id}
                    onMouseEnter={() => setHoveredChapterId(chap.id)}
                    onClick={() => isUnlocked && openChapter(chap)}
                    className={`relative py-4 px-6 cursor-pointer transition-all duration-300 ease-out flex flex-col justify-center border-l-[6px] ${
                      isUnlocked 
                        ? (isHovered ? 'border-[#ff758c] bg-gradient-to-r from-[#ff758c]/10 to-transparent translate-x-4' : 'border-transparent hover:bg-white/40') 
                        : 'border-transparent opacity-40'
                    }`}
                  >
                    <div className="relative z-10 flex flex-col">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-xs font-mono tracking-[0.15em] font-bold uppercase transition-colors duration-300 ${isHovered && isUnlocked ? 'text-[#ff758c]' : 'text-amber-500'}`}>
                          BAB {String(chap.id).padStart(2, '0')}
                        </span>
                        {!isUnlocked && <Lock className="w-3 h-3 text-gray-400" />}
                      </div>
                      
                      <h3 className={`text-2xl md:text-3xl font-black font-display uppercase tracking-wider transition-all duration-300 ${isHovered && isUnlocked ? 'text-[#5c4d47]' : 'text-[#8C7B6B]'}`}>
                        {chap.title}
                      </h3>
                      
                      <p className={`text-sm md:text-[15px] mt-1 transition-colors duration-300 line-clamp-1 ${isHovered && isUnlocked ? 'text-[#5c4d47]' : 'text-gray-400'}`}>
                        {isUnlocked 
                          ? chap.content[0].text 
                          : <span className="font-semibold">Butuh afeksi {chap.reqAffection}</span>
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
