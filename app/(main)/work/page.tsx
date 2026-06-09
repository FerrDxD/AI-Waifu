'use client';

import { useState, useEffect, useRef } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Wallet, Timer, Sparkles, Package, Map as MapIcon, BookOpen, Calculator, MapPin, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

type BoxColor = 'pink' | 'amber' | 'sage';

interface ItemType {
  id: number;
  name: string;
  emoji: string;
  color: BoxColor;
}

const ITEM_TYPES: ItemType[] = [
  { id: 1, name: 'Buku', emoji: '📚', color: 'pink' },
  { id: 2, name: 'Snack', emoji: '🍪', color: 'amber' },
  { id: 3, name: 'Baju', emoji: '👕', color: 'sage' },
];

const MATH_QUESTIONS = [
  { q: "Berapa 45 + 23 - (12 x 2)?", options: ["44", "46", "38", "50"], ans: "44" },
  { q: "Jika 2x + 5 = 15, berapakah x?", options: ["5", "10", "4", "3"], ans: "5" },
  { q: "Segitiga siku-siku memiliki sisi 3 dan 4. Berapa sisi miringnya?", options: ["5", "6", "7", "4"], ans: "5" },
  { q: "Rata-rata dari 2, 4, 6, dan 8 adalah?", options: ["5", "6", "4", "7"], ans: "5" },
  { q: "Berapa hasil dari 3² + 4²?", options: ["25", "14", "12", "7"], ans: "25" },
  { q: "Jika y = 3x - 2 dan x = 4, berapakah y?", options: ["10", "14", "12", "8"], ans: "10" }
];

export default function WorkPage() {
  const [selectedJob, setSelectedJob] = useState<'sortir' | 'paket' | 'tutor' | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [money, setMoney] = useState(0);
  const [earnedRv, setEarnedRv] = useState(0);
  
  const [liviaExpression, setLiviaExpression] = useState<'normal' | 'happy' | 'angry' | 'blushing'>('normal');
  const [message, setMessage] = useState('Pilih kerjaan yang bener. Jangan malas-malasan!');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/affection');
        if (res.ok) {
          const data = await res.json();
          setMoney(data.money || 0);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProfile();
  }, []);

  const claimReward = async (amount: number) => {
    setEarnedRv(amount);
    setGameState('gameOver');
    if (amount > 0) {
      setLiviaExpression('blushing');
      setMessage(`Kerja bagus! Kamu dapat ${amount} Rv.`);
      try {
        const res = await fetch('/api/work', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ earnedRv: amount }),
        });
        if (res.ok) {
          const data = await res.json();
          setMoney(data.newMoney);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setLiviaExpression('angry');
      setMessage('Kerjamu payah banget! Gajinya nol!');
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 z-30 flex justify-between items-center">
        <Link href="/home" className="font-display font-bold text-sm bg-white/70 backdrop-blur-md px-4 py-2 rounded-full text-[#5c4d47] shadow-sm hover:shadow-md hover:bg-white transition-all flex items-center gap-2">
          <span>←</span> Kembali
        </Link>
        <div className="bg-amber-100 border border-amber-200 px-5 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <Wallet className="w-4 h-4 text-amber-600" />
          <span className="font-mono font-bold text-amber-700">{money} Rv</span>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto flex flex-col md:flex-row pt-24 px-6 z-10 relative">
        
        {/* Left Side: Game Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
          
          {selectedJob === null ? (
            // Job Selection Menu
            <div className="w-full flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-display font-black text-[#ff758c] mb-2 drop-shadow-sm flex items-center justify-center gap-3">
                  <Sparkles className="w-8 h-8 text-amber-400" />
                  Bursa Kerja
                </h1>
                <p className="text-[#8C7B6B] font-medium text-lg">Pilih pekerjaan paruh waktu untuk mencari Rv!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {/* Job 1: Sortir */}
                <button 
                  onClick={() => { setSelectedJob('sortir'); setGameState('idle'); setMessage('Sortir barang ke kotak yang benar!'); setLiviaExpression('normal'); }}
                  className="bg-white border-2 border-pink-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-[#ff758c] transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Package size={32} />
                  </div>
                  <h3 className="font-display font-bold text-xl text-[#5c4d47] mb-2">Sortir Gudang</h3>
                  <p className="text-sm text-gray-500 mb-4 flex-1">Sortir barang masuk secepat mungkin dalam 30 detik.</p>
                  <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-full font-bold font-mono text-sm">
                    ~5 Rv / item
                  </div>
                </button>

                {/* Job 2: Paket */}
                <button 
                  onClick={() => { setSelectedJob('paket'); setGameState('idle'); setMessage('Tolong antar paket ini sampai tujuan dengan selamat.'); setLiviaExpression('normal'); }}
                  className="bg-white border-2 border-blue-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-blue-400 transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MapIcon size={32} />
                  </div>
                  <h3 className="font-display font-bold text-xl text-[#5c4d47] mb-2">Kurir Paket</h3>
                  <p className="text-sm text-gray-500 mb-4 flex-1">Hubungkan jalur dari titik awal ke titik tujuan di map fiksi.</p>
                  <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-full font-bold font-mono text-sm">
                    15 Rv
                  </div>
                </button>

                {/* Job 3: Tutor */}
                <button 
                  onClick={() => { setSelectedJob('tutor'); setGameState('idle'); setMessage('Jangan ngajarin yang salah ya ke muridmu!'); setLiviaExpression('normal'); }}
                  className="bg-white border-2 border-purple-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-purple-400 transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calculator size={32} />
                  </div>
                  <h3 className="font-display font-bold text-xl text-[#5c4d47] mb-2">Guru Les</h3>
                  <p className="text-sm text-gray-500 mb-4 flex-1">Jawab 3 soal Matematika dasar dengan benar untuk lulus.</p>
                  <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-full font-bold font-mono text-sm">
                    25 Rv
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-pink-50 p-6 sm:p-8 flex flex-col items-center relative min-h-[400px]">
              
              <button 
                onClick={() => setSelectedJob(null)}
                className="absolute top-4 left-4 text-gray-400 hover:text-pink-500 font-bold text-sm flex items-center gap-1"
              >
                ← Batal
              </button>

              {gameState === 'gameOver' ? (
                <div className="text-center py-12 flex flex-col items-center w-full animate-[fadeIn_0.3s_ease-out]">
                  <h2 className="text-3xl font-display font-bold text-[#5c4d47] mb-2">Kerja Selesai!</h2>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 my-4 flex flex-col items-center w-full">
                    <span className="text-sm text-amber-700 font-bold mb-1">Pendapatan:</span>
                    <span className="text-4xl font-mono font-black text-amber-500">+{earnedRv} Rv</span>
                  </div>
                  <button 
                    onClick={() => setGameState('idle')}
                    className="px-6 py-3 bg-white border-2 border-pink-200 text-pink-500 font-bold rounded-2xl shadow-sm hover:bg-pink-50 hover:-translate-y-0.5 transition-all w-full mt-4"
                  >
                    Kerja Ulang
                  </button>
                </div>
              ) : (
                <>
                  {selectedJob === 'sortir' && <SortirGame state={gameState} setState={setGameState} onFinish={claimReward} />}
                  {selectedJob === 'paket' && <PaketGame state={gameState} setState={setGameState} onFinish={claimReward} />}
                  {selectedJob === 'tutor' && <TutorGame state={gameState} setState={setGameState} onFinish={claimReward} />}
                </>
              )}
            </div>
          )}

        </div>

        {/* Right Side: Livia Reacts */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-end relative h-[85vh]">
          {/* Reaction Bubble */}
          <div className="absolute top-1/4 right-[10%] bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-pink-100 max-w-[250px] transform translate-x-4 animate-[float_3s_ease-in-out_infinite] z-20">
            <div className="absolute top-full left-8 w-4 h-4 bg-white border-b border-r border-pink-100 transform rotate-45 -translate-y-2"></div>
            <p className="text-sm font-medium text-[#5c4d47] italic">
              "{message}"
            </p>
          </div>

          <LiviaSprite 
            expression={liviaExpression} 
            className="h-[80%] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,154,158,0.2)]"
          />
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// MINIGAME 1: SORTIR GUDANG
// ----------------------------------------------------
function SortirGame({ state, setState, onFinish }: { state: string, setState: any, onFinish: (rv: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [currentItem, setCurrentItem] = useState<ItemType | null>(null);

  useEffect(() => {
    if (state === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (state === 'playing' && timeLeft === 0) {
      onFinish(score * 5);
    }
  }, [state, timeLeft]);

  const startGame = () => {
    setState('playing');
    setTimeLeft(30);
    setScore(0);
    setCurrentItem(ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)]);
  };

  const handleSort = (color: BoxColor) => {
    if (state !== 'playing' || !currentItem) return;
    if (currentItem.color === color) setScore(prev => prev + 1);
    setCurrentItem(ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)]);
  };

  if (state === 'idle') {
    return (
      <div className="text-center py-16 animate-[fadeIn_0.3s_ease-out] w-full mt-8">
        <h2 className="text-2xl font-bold font-display mb-4 text-[#5c4d47]">Sortir Gudang</h2>
        <p className="text-[#5c4d47] mb-8">Waktu: 30 detik.<br/>Bayaran: 5 Rv / barang benar.</p>
        <button onClick={startGame} className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl shadow-md hover:bg-pink-600 transition-all text-lg">Mulai</button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center mt-12 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between w-full mb-8 px-2">
        <div className="flex items-center gap-2 bg-pink-50 px-4 py-2 rounded-xl text-pink-600 font-bold font-mono">
          <Timer className="w-5 h-5" /> {timeLeft}s
        </div>
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl text-amber-600 font-bold font-mono">
          Score: {score}
        </div>
      </div>

      <div className="h-32 flex items-center justify-center mb-8 w-full relative">
        <div className="text-7xl animate-[bounce_0.5s_infinite] drop-shadow-lg absolute">
          {currentItem?.emoji}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full">
        <button onClick={() => handleSort('pink')} className="flex flex-col items-center py-4 rounded-2xl bg-pink-100 hover:bg-pink-200 border-2 border-pink-200">
          <span className="text-2xl">📚</span>
        </button>
        <button onClick={() => handleSort('amber')} className="flex flex-col items-center py-4 rounded-2xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-200">
          <span className="text-2xl">🍪</span>
        </button>
        <button onClick={() => handleSort('sage')} className="flex flex-col items-center py-4 rounded-2xl bg-[#e6f0e8] hover:bg-[#cde0d1] border-2 border-[#b5d0bb]">
          <span className="text-2xl">👕</span>
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// MINIGAME 2: ANTAR PAKET
// ----------------------------------------------------
function PaketGame({ state, setState, onFinish }: { state: string, setState: any, onFinish: (rv: number) => void }) {
  const [path, setPath] = useState<number[]>([]);
  const [obstacles, setObstacles] = useState<number[]>([]);
  
  const gridSize = 5; // 5x5
  const startPos = 0;
  const targetPos = 24;

  const startGame = () => {
    setState('playing');
    setPath([startPos]);
    // Generate 6 random obstacles not at start or end
    let obs = new Set<number>();
    while (obs.size < 6) {
      const rand = Math.floor(Math.random() * 25);
      if (rand !== startPos && rand !== targetPos) obs.add(rand);
    }
    setObstacles(Array.from(obs));
  };

  const handleTileClick = (index: number) => {
    if (state !== 'playing') return;
    if (obstacles.includes(index)) return; // Hit obstacle
    if (path.includes(index)) {
      // Allow backtracking if clicking the previous tile
      if (path[path.length - 2] === index) {
        setPath(prev => prev.slice(0, -1));
      }
      return;
    }
    
    const lastPos = path[path.length - 1];
    const isAdjacent = 
      (Math.abs(lastPos - index) === 1 && Math.floor(lastPos / 5) === Math.floor(index / 5)) || // Horizontal
      (Math.abs(lastPos - index) === 5); // Vertical

    if (isAdjacent) {
      const newPath = [...path, index];
      setPath(newPath);
      if (index === targetPos) {
        onFinish(15);
      }
    }
  };

  if (state === 'idle') {
    return (
      <div className="text-center py-16 animate-[fadeIn_0.3s_ease-out] w-full mt-8">
        <h2 className="text-2xl font-bold font-display mb-4 text-[#5c4d47]">Kurir Paket</h2>
        <p className="text-[#5c4d47] mb-8">Hubungkan rute dari titik Awal (kiri atas) ke titik Tujuan (kanan bawah) menghindari rintangan.</p>
        <button onClick={startGame} className="w-full py-4 bg-blue-500 text-white font-bold rounded-2xl shadow-md hover:bg-blue-600 transition-all text-lg">Mulai</button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center mt-12 animate-[fadeIn_0.3s_ease-out]">
      <h3 className="font-bold text-gray-500 mb-6">Bikin jalur yang menyambung!</h3>
      <div className="grid grid-cols-5 gap-2 w-[280px] bg-gray-100 p-2 rounded-2xl border-4 border-gray-200">
        {Array.from({ length: 25 }).map((_, i) => {
          const isStart = i === startPos;
          const isTarget = i === targetPos;
          const isObstacle = obstacles.includes(i);
          const isPath = path.includes(i);
          const isHead = path[path.length - 1] === i;
          
          let bgColor = 'bg-white hover:bg-blue-50 cursor-pointer';
          if (isStart) bgColor = 'bg-green-400 text-white';
          else if (isTarget) bgColor = 'bg-red-400 text-white';
          else if (isObstacle) bgColor = 'bg-gray-800 cursor-not-allowed';
          else if (isHead) bgColor = 'bg-blue-500 text-white shadow-inner scale-95';
          else if (isPath) bgColor = 'bg-blue-300 border-blue-400';

          return (
            <div 
              key={i} 
              onClick={() => handleTileClick(i)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all border-b-4 border-black/10 active:border-b-0 active:translate-y-1 ${bgColor}`}
            >
              {isStart && <MapPin size={20} />}
              {isTarget && <CheckCircle2 size={20} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// MINIGAME 3: GURU LES
// ----------------------------------------------------
function TutorGame({ state, setState, onFinish }: { state: string, setState: any, onFinish: (rv: number) => void }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const startGame = () => {
    // Pick 3 random questions
    const shuffled = [...MATH_QUESTIONS].sort(() => 0.5 - Math.random());
    setQuestions(shuffled.slice(0, 3));
    setCurrentIndex(0);
    setState('playing');
  };

  const handleAnswer = (ans: string) => {
    if (ans === questions[currentIndex].ans) {
      if (currentIndex === 2) {
        onFinish(25); // all 3 correct
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    } else {
      // Wrong answer
      onFinish(0);
    }
  };

  if (state === 'idle') {
    return (
      <div className="text-center py-16 animate-[fadeIn_0.3s_ease-out] w-full mt-8">
        <h2 className="text-2xl font-bold font-display mb-4 text-[#5c4d47]">Guru Les</h2>
        <p className="text-[#5c4d47] mb-8">Jawab 3 soal berturut-turut dengan benar. Salah satu kali = Gagal!</p>
        <button onClick={startGame} className="w-full py-4 bg-purple-500 text-white font-bold rounded-2xl shadow-md hover:bg-purple-600 transition-all text-lg">Mulai Mengajar</button>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];

  return (
    <div className="w-full flex flex-col items-center mt-12 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex gap-2 mb-6">
        {[0, 1, 2].map(idx => (
          <div key={idx} className={`w-8 h-2 rounded-full ${idx <= currentIndex ? 'bg-purple-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="bg-purple-50 w-full p-6 rounded-2xl border-2 border-purple-200 mb-6 min-h-[120px] flex items-center justify-center text-center">
        <h3 className="font-bold text-xl text-purple-900">{currentQ.q}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {currentQ.options.map((opt: string, i: number) => (
          <button 
            key={i} 
            onClick={() => handleAnswer(opt)}
            className="py-4 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-600 transition-colors shadow-sm active:scale-95"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
