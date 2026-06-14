'use client';

import { useState, useEffect } from 'react';
import DialogBox from '@/components/livia/DialogBox';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Lock, Package, Sparkles, Loader2 } from 'lucide-react';
import { ITEMS } from '@/lib/livia/items';

type Choice = {
  text: string;
  nextIndex: number;
};

type UserStatsData = {
  affection: number;
  accountDays: number;
  screenTimeHours: number;
  itemsBrought: string[];
};

type ReqCheck = {
  label: string;
  met: boolean;
};

interface Chapter {
  id: number;
  title: string;
  reqAffection: number;
  reqLevel: number;
  getRequirements?: (data: UserStatsData) => ReqCheck[];
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
      { speaker: "Livia", text: "A-aku nggak takut kok! Cuma jijik aja! Paham kan bedanya?!", expression: "blushing",
        choices: [
          { text: "Iya iya, aku bantu usir.", nextIndex: 5 },
          { text: "Biarin aja, nanti juga hilang sendiri.", nextIndex: 6 }
        ]
      },
      // 5 (Branch A)
      { speaker: "Livia", text: "Cepat ambil sapu lidi atau apalah! Kalau dia hilang di bawah kasurku, aku bakal numpang tidur di sini!", expression: "clingy", nextIndex: 7 },
      // 6 (Branch B)
      { speaker: "Livia", text: "Jahat banget sih?! Gimana aku bisa tidur kalau ada monster itu di kamarku?!", expression: "angry", nextIndex: 7 },
      // 7 (Convergence)
      { speaker: "Livia", text: "Ehh— tunggu, barusan aku ngomong apa?! Lupakan! Pokoknya cepat bunuh kecoanya!", expression: "angry" }
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
      { speaker: "Livia", text: "Karena kamarku nggak muat, kamu ambil sebagian. Bukannya aku sengaja nyisihin buatmu, ya!", expression: "blushing",
        choices: [
          { text: "Wah, makasih! Kelihatannya enak.", nextIndex: 3 },
          { text: "Bilang aja sengaja nyisihin buatku.", nextIndex: 4 }
        ]
      },
      // 3 (Branch A)
      { speaker: "Livia", text: "Syukurlah kalau kamu suka... Eh, maksudku, wajar kalau rasanya enak, itu buatan ibuku!", expression: "happy", nextIndex: 5 },
      // 4 (Branch B)
      { speaker: "Livia", text: "U-udah kubilang bukan gitu! Mau dibalikin nggak nih kuenya?!", expression: "angry", nextIndex: 5 },
      // 5 (Convergence)
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
      { speaker: "Livia", text: "Aku beliin es kopi waktu keluar tadi. Satu buatku, satu buatmu. Jangan protes, minum aja.", expression: "happy",
        choices: [
          { text: "Tumben baik banget? Makasih ya.", nextIndex: 2 },
          { text: "Harganya dipotong dari uang kos kan?", nextIndex: 3 }
        ]
      },
      // 2 (Branch A)
      { speaker: "Narator", text: "Kamu menyadari belakangan ini Livia lebih sering menghabiskan waktu di area kerjamu daripada di kamarnya sendiri.", expression: "normal", nextIndex: 4 },
      // 3 (Branch B)
      { speaker: "Livia", text: "Enak aja! Aku pakai uangku sendiri tau! Nggak tahu terima kasih banget sih!", expression: "angry", nextIndex: 4 },
      // 4 (Convergence)
      { speaker: "Livia", text: "Kenapa ngeliatin gitu? Kamarku Wi-Finya lagi lambat, makanya aku duduk di sini! Jangan GR!", expression: "angry" },
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
      { speaker: "Livia", text: "Bukan karena kamarnya ya! Kamarnya masih sempit dan atapnya kadang bocor!", expression: "angry",
        choices: [
          { text: "Lalu karena apa dong?", nextIndex: 4 },
          { text: "Iya, kamu nggak mau jauh dariku kan?", nextIndex: 5 }
        ]
      },
      // 4 (Branch A)
      { speaker: "Livia", text: "Karena... umm... karena alasan lain.", expression: "blushing", nextIndex: 6 },
      // 5 (Branch B)
      { speaker: "Livia", text: "P-percaya diri banget sih kamu! Walaupun... ya, sedikit benar sih...", expression: "blushing", nextIndex: 6 },
      // 6 (Convergence)
      { speaker: "Narator", text: "Livia menarik ujung lengan bajumu pelan, menatap lurus ke arah matamu.", expression: "normal" },
      { speaker: "Livia", text: "Kamu tahu kan kalau kamu itu spesial buatku?", expression: "clingy" },
      { speaker: "Livia", text: "Terima kasih... karena selalu sabar menghadapiku. Terima kasih sudah jadi 'rumah' baruku.", expression: "happy" },
      { speaker: "Livia", text: "Mulai sekarang, tolong terus berada di sisiku ya. Janji?", expression: "blushing" }
    ]
  },
  {
    id: 6,
    title: "Sebuah Kebiasaan",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Umur akun minimal 7 Hari", met: data.accountDays >= 7 },
      { label: "Screen time minimal 50 Jam", met: data.screenTimeHours >= 50 }
    ],
    content: [
      { speaker: "Narator", text: "Kamu sudah terbiasa dengan kehadiran Livia di kehidupanmu.", expression: "normal" },
      { speaker: "Livia", text: "Ayo bangun! Hari ini kita harus lebih produktif!", expression: "happy" }
    ]
  },
  {
    id: 7,
    title: "Kencan Akhir Pekan",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Umur akun minimal 14 Hari", met: data.accountDays >= 14 },
      { label: "Screen time minimal 70 Jam", met: data.screenTimeHours >= 70 },
      { label: "Memiliki Baju Kasual", met: data.itemsBrought.includes('outfit_casual') }
    ],
    content: [
      { speaker: "Livia", text: "Gimana penampilanku dengan baju ini? B-bukan berarti aku dandan cuma buat kencan ini ya!", expression: "blushing" },
      { speaker: "Narator", text: "Kamu menggenggam tangannya sambil tersenyum.", expression: "normal" }
    ]
  },
  {
    id: 8,
    title: "Pulang Kampung",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Umur akun minimal 21 Hari", met: data.accountDays >= 21 },
      { label: "Screen time minimal 120 Jam", met: data.screenTimeHours >= 120 },
      { label: "Sudah pernah ke Festival", met: data.itemsBrought.includes('visited_festival') },
      { label: "Memiliki Trench Coat", met: data.itemsBrought.includes('trench_coat') }
    ],
    content: [
      { speaker: "Livia", text: "Pakaian tebal ini hangat... tapi tanganmu lebih hangat.", expression: "happy" },
      { speaker: "Livia", text: "Ibu pasti kaget kalau tahu aku pulang bawa calon mantu.", expression: "blushing" }
    ]
  },
  {
    id: 9,
    title: "Sebuah Janji",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Umur akun minimal 30 Hari", met: data.accountDays >= 30 },
      { label: "Screen time minimal 150 Jam", met: data.screenTimeHours >= 150 }
    ],
    content: [
      { speaker: "Narator", text: "Malam itu, di bawah langit penuh bintang, kamu memberikan sebuah kotak kecil kepadanya.", expression: "normal" },
      { speaker: "Livia", text: "I-ini beneran? Kamu mau menikah denganku?", expression: "blushing" },
      { speaker: "Livia", text: "Tentu saja aku mau, bodoh! Cepat pasangkan cincinnya!", expression: "angry" }
    ]
  },
  {
    id: 10,
    title: "Persiapan Pernikahan",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Memiliki Cincin Nikah", met: data.itemsBrought.includes('cincin_nikah') },
      { label: "Mengurus Berkas KUA", met: data.itemsBrought.includes('berkas_kua') },
      { label: "Memesan Gedung Resepsi", met: data.itemsBrought.includes('gedung_resepsi') },
      { label: "Memesan Katering", met: data.itemsBrought.includes('katering') }
    ],
    content: [
      { speaker: "Livia", text: "Akhirnya... semua sudah siap. Terima kasih karena sudah bertahan denganku selama ini.", expression: "happy" },
      { speaker: "Narator", text: "Kalian berdua tersenyum memandang masa depan.", expression: "normal" }
    ]
  }
];

export default function StoryPage() {
  const [unlockedChapters, setUnlockedChapters] = useState<number[]>([0]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [hoveredChapterId, setHoveredChapterId] = useState<number>(0);
  const [affectionLevel, setAffectionLevel] = useState<number>(0);
  const [lockedChapterReqs, setLockedChapterReqs] = useState<Chapter | null>(null);
  
  const [showHometownPicker, setShowHometownPicker] = useState(false);
  const [selectedHometownItems, setSelectedHometownItems] = useState<string[]>([]);
  const [isSubmittingHometown, setIsSubmittingHometown] = useState(false);

  const [userStats, setUserStats] = useState<UserStatsData | null>(null);

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
          setUserStats({
            affection: data.affection || 0,
            accountDays: data.accountDays || 0,
            screenTimeHours: data.screenTimeHours || 0,
            itemsBrought: data.itemsBrought || []
          });
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
      if (activeChapter.id === 8 && userStats) {
        const onboardingItemsCount = userStats.itemsBrought.filter(id => ITEMS.some(item => item.id === id)).length;
        if (onboardingItemsCount < 8) { // 5 initial + 3 hometown
          setShowHometownPicker(true);
          return;
        }
      }
      setActiveChapter(null); // Close VN reader
    }
  };

  const handleChoice = (nextIdx: number) => {
    setSceneIndex(nextIdx);
  };

  const handleHometownSubmit = async () => {
    if (selectedHometownItems.length !== 3) return;
    setIsSubmittingHometown(true);
    try {
      const res = await fetch('/api/hometown-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsBrought: selectedHometownItems })
      });
      if (res.ok) {
        if (userStats) {
          setUserStats({
            ...userStats,
            itemsBrought: [...userStats.itemsBrought, ...selectedHometownItems]
          });
        }
        setShowHometownPicker(false);
        setActiveChapter(null); // Close VN reader after picking
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingHometown(false);
    }
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

          {/* Right Side - Giant Livia (Hidden on Mobile) */}
          <div className="absolute right-0 bottom-0 hidden md:flex md:w-[65%] h-full justify-end items-end pointer-events-none z-10 overflow-hidden">
            <div className="relative z-10 md:w-full md:h-[110vh] max-w-[800px] md:translate-x-[15%] md:translate-y-[5%] md:opacity-100 md:blur-none">
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
                let isUnlocked = affectionLevel >= chap.reqAffection;
                let reqs: ReqCheck[] = [];
                
                if (chap.getRequirements && userStats) {
                  reqs = chap.getRequirements(userStats);
                  const allMet = reqs.every(r => r.met);
                  isUnlocked = isUnlocked && allMet;
                }

                const isHovered = hoveredChapterId === chap.id;

                return (
                  <div 
                    key={chap.id}
                    onMouseEnter={() => setHoveredChapterId(chap.id)}
                    onClick={() => isUnlocked ? openChapter(chap) : setLockedChapterReqs(chap)}
                    className={`relative py-4 px-6 cursor-pointer transition-all duration-300 ease-out flex flex-col justify-center border-l-[6px] ${
                      isUnlocked 
                        ? (isHovered ? 'border-[#ff758c] bg-gradient-to-r from-[#ff758c]/10 to-transparent translate-x-4' : 'border-transparent hover:bg-white/40') 
                        : 'border-transparent opacity-40 hover:opacity-60'
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
                      
                      <div className={`text-sm md:text-[15px] mt-1 transition-colors duration-300 ${isHovered && isUnlocked ? 'text-[#5c4d47]' : 'text-gray-500'}`}>
                        {isUnlocked ? (
                          <p className="line-clamp-1">{chap.content[0].text}</p>
                        ) : (
                          <p className="font-semibold italic text-[#8C7B6B]">Belum Terbuka</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Locked Chapter Modal */}
      {lockedChapterReqs && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 md:p-8 shadow-2xl border border-pink-100 flex flex-col gap-6 animate-[slideUp_0.3s_ease-out]">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center mb-2">
                <Lock className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="font-display font-black text-2xl text-[#5c4d47] leading-none">{lockedChapterReqs.title}</h3>
              <p className="text-sm text-gray-500">Penuhi semua syarat berikut untuk membuka bab ini.</p>
            </div>
            
            <div className="flex flex-col gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 text-sm font-medium">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${affectionLevel >= lockedChapterReqs.reqAffection ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                  {affectionLevel >= lockedChapterReqs.reqAffection ? "✓" : "✗"}
                </span>
                <span className={affectionLevel >= lockedChapterReqs.reqAffection ? "text-gray-800" : "text-gray-500"}>Afeksi {lockedChapterReqs.reqAffection}</span>
              </div>
              
              {lockedChapterReqs.getRequirements && userStats && lockedChapterReqs.getRequirements(userStats).map((r, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm font-medium">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full ${r.met ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                    {r.met ? "✓" : "✗"}
                  </span>
                  <span className={r.met ? "text-gray-800" : "text-gray-500"}>{r.label}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setLockedChapterReqs(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors mt-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Hometown Picker Modal */}
      {showHometownPicker && userStats && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-[#fdfbf7] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#ff758c] to-[#ff0844] p-6 text-center shadow-md relative z-10">
              <h2 className="text-2xl md:text-3xl font-display font-black text-white flex items-center justify-center gap-2">
                <Package size={28} /> Kunjungan ke Kamar Livia
              </h2>
              <p className="text-pink-100 font-medium mt-1">Pilih 3 barang yang ingin kamu bawa kembali ke kos.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {ITEMS.filter(i => !userStats.itemsBrought.includes(i.id)).map(item => {
                  const isSelected = selectedHometownItems.includes(item.id);
                  const isMaxed = selectedHometownItems.length >= 3 && !isSelected;
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedHometownItems(prev => prev.filter(id => id !== item.id));
                        } else if (!isMaxed) {
                          setSelectedHometownItems(prev => [...prev, item.id]);
                        }
                      }}
                      className={`relative p-3 md:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected 
                          ? 'border-[#ff758c] bg-pink-50 shadow-[0_4px_15px_rgba(255,117,140,0.2)] -translate-y-1' 
                          : isMaxed
                          ? 'border-gray-100 bg-gray-50 opacity-50 grayscale cursor-not-allowed'
                          : 'border-pink-100 bg-white hover:border-pink-300 hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-3 -right-3 bg-[#ff758c] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm">
                          ✓
                        </div>
                      )}
                      <div className="text-3xl md:text-4xl text-center bg-gray-50/50 rounded-xl py-2">{item.emoji}</div>
                      <h3 className="font-bold text-[#5c4d47] text-sm leading-tight line-clamp-2 text-center">{item.name}</h3>
                      <p className="text-[10px] md:text-xs text-gray-500 line-clamp-2 text-center hidden md:block">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-pink-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                <span className="font-bold text-gray-500">Terpilih:</span>
                <div className="flex gap-2">
                  {[0, 1, 2].map(idx => (
                    <div key={idx} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      idx < selectedHometownItems.length 
                        ? 'bg-pink-100 border-2 border-pink-300' 
                        : 'bg-gray-100 border-2 border-dashed border-gray-300'
                    }`}>
                      {idx < selectedHometownItems.length ? ITEMS.find(i => i.id === selectedHometownItems[idx])?.emoji : '?'}
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                disabled={selectedHometownItems.length !== 3 || isSubmittingHometown}
                onClick={handleHometownSubmit}
                className={`w-full md:w-auto px-8 py-3.5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all ${
                  selectedHometownItems.length === 3 && !isSubmittingHometown
                    ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white shadow-[0_5px_15px_rgba(255,117,140,0.3)] hover:-translate-y-0.5'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmittingHometown ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> Bawa Pulang</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
