'use client';

import { useState, useEffect, useRef } from 'react';
import { Wallet, Timer, Sparkles, Package, Map as MapIcon, BookOpen, Calculator, CheckCircle2, Mail, Carrot, Gamepad2, Pizza, FileText, Car, Briefcase, Glasses, Coffee, Laptop, ShieldAlert, Droplet, Keyboard, Edit3, Hammer, Cpu, Palette, TrendingUp, Fish, Play, MapPin } from 'lucide-react';
import Link from 'next/link';
import { playSfx } from '@/lib/sfx';
import { unlockAchievement } from '@/lib/achievements';

type JobCategory = 'sortir' | 'paket' | 'tutor' | 'barista' | 'cucipiring' | 'kasir' | 'dataentry' | 'parkir' | 'pelayan' | 'penulis' | 'tambang' | 'reparasi' | 'pelukis' | 'trader' | 'mancing';

interface JobDef {
  id: string;
  type: JobCategory;
  title: string;
  desc: string;
  rewardStr: string;
  baseReward: number;
  icon: any;
}

const JOBS: JobDef[] = [
  { id: '1', type: 'sortir', title: 'Sortir Gudang', desc: 'Sortir barang masuk ke kotak warnanya secepat mungkin.', rewardStr: 'max 30 Rv', baseReward: 30, icon: Package },
  { id: '2', type: 'paket', title: 'Kurir Paket', desc: 'Hubungkan jalur dari awal ke tujuan di map menghindari lubang.', rewardStr: '15 Rv', baseReward: 15, icon: MapIcon },
  { id: '3', type: 'tutor', title: 'Guru Les', desc: 'Jawab 3 soal matematika berturut-turut dengan benar.', rewardStr: '20 Rv', baseReward: 20, icon: BookOpen },
  { id: '4', type: 'barista', title: 'Barista Kafe', desc: 'Hafalkan dan buat pesanan minuman pelanggan sesuai resep.', rewardStr: '25 Rv', baseReward: 25, icon: Coffee },
  { id: '5', type: 'cucipiring', title: 'Cuci Piring', desc: 'Gosok piring kotor sampai bersih secepat kilat (30 klik).', rewardStr: '15 Rv', baseReward: 15, icon: Droplet },
  { id: '6', type: 'kasir', title: 'Jaga Kasir', desc: 'Hitung kembalian pelanggan dengan akurat (Pecahan Rp).', rewardStr: '20 Rv', baseReward: 20, icon: Calculator },
  { id: '7', type: 'dataentry', title: 'Data Entry', desc: 'Ketik ulang kode keamanan (captcha) dalam 10 detik.', rewardStr: '20 Rv', baseReward: 20, icon: Keyboard },
  { id: '8', type: 'parkir', title: 'Tukang Parkir', desc: 'Amankan mobil yang masuk secara acak (pukul 10 mobil merah).', rewardStr: '25 Rv', baseReward: 25, icon: Car },
  { id: '9', type: 'pelayan', title: 'Pelayan Resto', desc: 'Hafalkan 4 menu pesanan pelanggan dan hidangkan ulang.', rewardStr: '30 Rv', baseReward: 30, icon: Pizza },
  { id: '10', type: 'penulis', title: 'Penulis Lepas', desc: 'Susun ulang huruf-huruf acak menjadi kata yang benar.', rewardStr: '25 Rv', baseReward: 25, icon: Edit3 },
  { id: '11', type: 'tambang', title: 'Kuli Bangunan', desc: 'Hancurkan batu bata! Klik bongkahan batu 40 kali dalam 10 detik.', rewardStr: '25 Rv', baseReward: 25, icon: Hammer },
  { id: '12', type: 'reparasi', title: 'Reparasi Elektronik', desc: 'Sambungkan 4 pasang kabel warna yang putus dengan benar.', rewardStr: '35 Rv', baseReward: 35, icon: Cpu },
  { id: '13', type: 'pelukis', title: 'Pelukis Jalanan', desc: 'Campur 2 warna primer untuk menghasilkan warna target.', rewardStr: '25 Rv', baseReward: 25, icon: Palette },
  { id: '14', type: 'trader', title: 'Trader Crypto', desc: 'Beli koin saat grafik harga masuk ke area zona hijau!', rewardStr: '40 Rv', baseReward: 40, icon: TrendingUp },
  { id: '15', type: 'mancing', title: 'Tukang Pancing', desc: 'Tarik pancingan dalam waktu kurang dari 0.6 detik saat ditarik ikan!', rewardStr: '30 Rv', baseReward: 30, icon: Fish }
];

export default function WorkPage() {
  const [selectedJob, setSelectedJob] = useState<JobDef>(JOBS[0]);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [money, setMoney] = useState(0);
  const [earnedRv, setEarnedRv] = useState(0);
  const [jobStats, setJobStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/affection').then(r => r.ok && r.json()).then(d => {
      if (d) {
        setMoney(d.money || 0);
        setJobStats(d.jobStats || {});
      }
    }).catch(console.error);
  }, []);

  const claimReward = async (amount: number) => {
    setEarnedRv(amount);
    setGameState('gameOver');
    if (amount > 0) {
      playSfx('coin');
      unlockAchievement('work_first');
      try {
        const res = await fetch('/api/work', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ earnedRv: amount, jobId: selectedJob.id }) });
        if (res.ok) { 
          const data = await res.json(); 
          setMoney(data.newMoney); 
          if (data.newMoney >= 1000) unlockAchievement('rich_1000');
          if (data.jobStats) setJobStats(data.jobStats);
        }
      } catch (e) { console.error(e); }
    } else {
      playSfx('error');
    }
  };

  const Icon = selectedJob.icon;

  const completions = jobStats[selectedJob.id] || 0;
  let rankName = 'Tembaga';
  let multiplier = 1;
  let rankColor = 'text-[#d97757] border-[#d97757] bg-[#d97757]/10'; // Tembaga
  let nextTarget = 10;
  let rankLevel = 0;
  if (completions >= 50) { rankName = 'Emas'; multiplier = 15; rankColor = 'text-yellow-500 border-yellow-500 bg-yellow-500/10'; nextTarget = 50; rankLevel = 3; }
  else if (completions >= 25) { rankName = 'Perak'; multiplier = 5; rankColor = 'text-gray-400 border-gray-400 bg-gray-400/10'; nextTarget = 50; rankLevel = 2; }
  else if (completions >= 10) { rankName = 'Perunggu'; multiplier = 2; rankColor = 'text-amber-600 border-amber-600 bg-amber-600/10'; nextTarget = 25; rankLevel = 1; }
  const finalReward = selectedJob.baseReward * multiplier;

  return (
    <div className="h-[100dvh] w-full bg-[#fdfbf7] flex flex-col font-sans select-none overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-[#ff758c] to-[#ff0844] z-50 flex items-center justify-between px-4 md:px-8 shadow-md">
        <div className="flex items-center gap-6">
          <Link href="/home" className="text-white hover:text-pink-100 flex items-center gap-2 font-display font-black text-sm tracking-widest uppercase transition-colors">
            <span className="bg-white/20 p-1.5 rounded-md">←</span> KEMBALI
          </Link>
          <div className="h-6 w-px bg-white/30 hidden md:block" />
          <h1 className="hidden md:flex font-display font-black text-white text-xl tracking-widest uppercase items-center gap-2">
            <Sparkles size={20} className="text-amber-300" /> KANTOR AGENSI
          </h1>
        </div>
        <div className="bg-black/20 backdrop-blur-md border border-white/10 px-5 py-1.5 rounded-r-xl rounded-l-md skew-x-[-10deg] flex items-center gap-3">
          <Wallet className="w-4 h-4 text-amber-300 skew-x-[10deg]" />
          <span className="font-mono font-black text-amber-300 skew-x-[10deg] tracking-wider">{money} Rv</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 pt-16 h-full overflow-hidden">
        <div className="flex-[2] relative flex flex-col bg-[#faf8f5] overflow-y-auto md:overflow-hidden border-r-4 border-pink-100 shrink-0">
          <div className="absolute -left-32 -top-32 w-[600px] h-[600px] bg-[#ff758c] opacity-5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-[-10%] bottom-[-5%] text-[8rem] md:text-[14rem] font-display font-black text-pink-500/5 -rotate-12 select-none pointer-events-none whitespace-nowrap leading-none tracking-tighter">
            {selectedJob.title.toUpperCase()}
          </div>

          <div className="relative z-10 w-full h-full p-4 md:p-12 flex flex-col justify-center max-w-4xl mx-auto">
            {gameState === 'idle' ? (
              <div className="animate-[slideRight_0.4s_ease-out]">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 mb-8">
                  <div className="w-24 h-24 md:w-36 md:h-36 bg-gradient-to-br from-[#ff758c] to-[#ff0844] rounded-[2rem] md:rounded-[3rem] rounded-bl-xl md:rounded-bl-2xl flex items-center justify-center text-white shadow-xl transform -rotate-3 hover:rotate-0 transition-all shadow-pink-500/30 shrink-0">
                    <Icon size={48} className="md:w-16 md:h-16" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-sm border-2 ${rankColor}`}>
                        {rankName.toUpperCase()}
                      </span>
                      <span className="font-mono font-bold text-gray-400 tracking-widest text-sm uppercase">ID_{selectedJob.id.padStart(4, '0')}</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-black text-[#5c4d47] tracking-tighter leading-none mb-4">{selectedJob.title}</h1>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-md p-6 md:p-10 rounded-[2rem] border-2 border-pink-100 shadow-lg relative overflow-hidden group">
                  <div className="mb-8 relative z-10">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={16} /> Deskripsi Tugas
                    </h3>
                    <p className="text-lg md:text-xl font-medium text-gray-700 leading-relaxed">{selectedJob.desc}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 mb-8 relative z-10">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Reward (x{multiplier})</span>
                      <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                        <Wallet size={20} className="text-amber-500" />
                        <span className="font-mono font-black text-amber-600 text-xl">{selectedJob.type === 'sortir' ? `Max ${finalReward} Rv` : `${finalReward} Rv`}</span>
                      </div>
                    </div>
                    <div className="flex flex-col flex-1 min-w-[200px]">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Progress Karyawan {completions}/{nextTarget}
                      </span>
                      <div className="h-10 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden relative">
                        <div className={`h-full transition-all duration-500 ${rankColor.split(' ')[0].replace('text', 'bg')}`} style={{width: `${Math.min(100, (completions/nextTarget)*100)}%`}} />
                        <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-black/50 mix-blend-overlay">
                          {completions >= 50 ? 'MAX LEVEL' : `${completions} KALI SELESAI`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setGameState('playing')} className="w-full bg-[#5c4d47] hover:bg-[#3d332f] text-white font-display font-black text-xl md:text-2xl py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95">
                    <Play fill="currentColor" /> MULAI KERJA
                  </button>
                </div>
              </div>
            ) : gameState === 'gameOver' ? (
              <div className="w-full bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border-4 border-pink-100 flex flex-col items-center animate-[slideUp_0.4s_ease-out]">
                <h2 className="text-4xl md:text-5xl font-display font-black text-[#5c4d47] mb-2 uppercase tracking-tight">{earnedRv > 0 ? 'Kontrak Selesai!' : 'Gagal!'}</h2>
                <p className="text-gray-500 font-medium mb-8 text-lg">{earnedRv > 0 ? 'Kerja kerasmu membuahkan hasil!' : 'Aduh, kamu dipecat untuk hari ini.'}</p>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-[2rem] px-12 py-8 my-4 flex flex-col items-center w-full max-w-sm shadow-inner relative overflow-hidden">
                  <span className="text-sm text-amber-700 font-bold mb-2 tracking-widest uppercase relative z-10">Total Pendapatan</span>
                  <span className="text-5xl md:text-6xl font-mono font-black text-amber-500 relative z-10 drop-shadow-sm">+{earnedRv}</span>
                  <span className="font-bold text-amber-600 relative z-10 mt-1">Ravencoins</span>
                </div>
                <button onClick={() => setGameState('idle')} className="px-8 py-4 bg-[#fdfbf7] border-2 border-pink-200 text-pink-500 font-black rounded-2xl shadow-sm hover:bg-pink-50 hover:-translate-y-1 transition-all w-full max-w-sm mt-8 text-lg uppercase tracking-widest">
                  Kembali ke Bursa
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center animate-[fadeIn_0.3s_ease-out]">
                <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-2xl border-4 border-pink-50 relative overflow-hidden min-h-[500px] flex flex-col">
                  <button onClick={() => setGameState('idle')} className="absolute top-6 left-6 text-gray-400 hover:text-pink-500 font-bold text-sm flex items-center gap-1 z-50 bg-white/80 p-2 rounded-xl backdrop-blur-md">
                    ← BATALKAN
                  </button>
                  <GameDispatcher type={selectedJob.type} onFinish={claimReward} baseReward={finalReward} rank={rankLevel} rankName={rankName} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:max-w-[450px] bg-white border-b-4 md:border-b-0 md:border-l-4 border-pink-100 flex flex-col h-[25vh] md:h-full shadow-[-20px_0_40px_rgba(0,0,0,0.03)] z-20 shrink-0 order-first md:order-last">
          <div className="p-3 md:p-6 bg-white/90 backdrop-blur-md border-b-2 border-pink-50 z-10 shrink-0">
            <h2 className="text-lg md:text-2xl font-display font-black text-[#5c4d47] flex items-center gap-2 tracking-widest uppercase">
              <Briefcase className="text-[#ff758c] w-5 h-5 md:w-7 md:h-7" /> DAFTAR TUGAS
            </h2>
          </div>
          <div className="flex-1 overflow-x-auto md:overflow-y-auto p-3 md:p-6 flex flex-row md:flex-col gap-3 hide-scrollbar relative">
            {JOBS.map((job) => {
              const isSelected = selectedJob.id === job.id && gameState === 'idle';
              const JobIcon = job.icon;
              const jc = jobStats[job.id] || 0;
              let jrank = 'Tembaga';
              let jcol = 'bg-[#d97757] text-white';
              if (jc >= 50) { jrank = 'Emas'; jcol = 'bg-yellow-500 text-white'; }
              else if (jc >= 25) { jrank = 'Perak'; jcol = 'bg-gray-400 text-white'; }
              else if (jc >= 10) { jrank = 'Perunggu'; jcol = 'bg-amber-600 text-white'; }
              else { jrank = 'Tembaga'; jcol = 'bg-[#d97757] text-white'; }

              return (
                <button key={job.id} onClick={() => { setSelectedJob(job); setGameState('idle'); }} className={`relative group w-[280px] md:w-full shrink-0 text-left outline-none transition-all duration-300 ${isSelected ? 'md:-translate-x-4 scale-[1.02]' : 'hover:-translate-x-1 hover:scale-[1.01]'}`}>
                  <div className={`absolute inset-0 skew-x-[-8deg] border-y-2 border-r-4 border-l-8 transition-all duration-300 rounded-r-xl ${isSelected ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] border-pink-300 shadow-md' : 'bg-[#faf8f5] border-transparent border-l-gray-300 group-hover:border-l-pink-300 group-hover:bg-pink-50'}`} />
                  <div className="relative z-10 p-4 pl-6 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-white text-pink-500 shadow-sm' : 'bg-white shadow-sm text-gray-500 group-hover:text-pink-500'}`}>
                      <JobIcon size={24} />
                    </div>
                    <div className="flex flex-col flex-1 truncate">
                      <span className={`font-mono font-bold text-[10px] tracking-widest uppercase mb-0.5 ${isSelected ? 'text-pink-200' : 'text-gray-400'}`}>{job.type}</span>
                      <span className={`font-display font-black text-lg truncate tracking-tight ${isSelected ? 'text-white' : 'text-[#5c4d47]'}`}>{job.title}</span>
                    </div>
                    <div className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded skew-x-[8deg] ${jcol}`}>
                      {jrank}
                    </div>
                  </div>
                  {isSelected && <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white rotate-45 border-t-4 border-r-4 border-pink-300 z-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// GAME DISPATCHER
// -----------------------------------------------------------------------------
function GameDispatcher({ type, onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { type: JobCategory, onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  switch(type) {
    case 'sortir': return <SortirGame onFinish={onFinish} rank={rank} rankName={rankName} />;
    case 'paket': return <PaketGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'tutor': return <TutorGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'barista': return <BaristaGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'cucipiring': return <CuciPiringGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'kasir': return <KasirGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'dataentry': return <DataEntryGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'parkir': return <ParkirGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'pelayan': return <PelayanGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'penulis': return <PenulisGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'tambang': return <TambangGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'reparasi': return <ReparasiGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'pelukis': return <PelukisGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'trader': return <TraderGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    case 'mancing': return <MancingGame onFinish={onFinish} baseReward={baseReward} rank={rank} rankName={rankName} />;
    default: return <div>Game Not Found</div>;
  }
}

// -----------------------------------------------------------------------------
// DIFFICULTY BADGE HELPER
// -----------------------------------------------------------------------------
function DifficultyBadge({ rank, rankName }: { rank: number, rankName: string }) {
  const label = rank === 3 ? 'Ekstrem 🔥' : rank === 2 ? 'Sulit ⚡' : rank === 1 ? 'Menengah 🔸' : 'Mudah 🟢';
  const color = rank === 3 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : rank === 2 ? 'bg-gray-200 text-gray-800 border-gray-400' : rank === 1 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-orange-100 text-[#d97757] border-orange-300';
  return (
    <div className={`flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border text-xs font-bold font-mono shadow-sm shrink-0 ${color}`}>
      <span>🔥 TINGKAT KESULITAN:</span>
      <span className="uppercase font-black">{rankName} ({label})</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MINIGAMES (WITH DYNAMIC RANK DIFFICULTY SCALING)
// -----------------------------------------------------------------------------

function SortirGame({ onFinish, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, rank?: number, rankName?: string }) {
  const initialTime = rank === 3 ? 8 : rank === 2 ? 10 : rank === 1 ? 12 : 15;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [score, setScore] = useState(0);
  
  const allItems = [
    {emoji:'📚', color:'pink'}, 
    {emoji:'🍪', color:'amber'}, 
    {emoji:'👕', color:'sage'}, 
    {emoji:'📦', color:'blue'}, 
    {emoji:'🧸', color:'purple'}, 
    {emoji:'🧰', color:'red'}
  ];
  const activeCount = rank === 3 ? 6 : rank === 2 ? 5 : rank === 1 ? 4 : 3;
  const items = allItems.slice(0, activeCount);
  
  const [item, setItem] = useState(items[0]);

  useEffect(() => {
    if (timeLeft > 0) { const t = setTimeout(() => setTimeLeft(l => l - 1), 1000); return () => clearTimeout(t); } 
    else { onFinish(score * 2); }
  }, [timeLeft]);

  const handleSort = (c: string) => {
    if (item.color === c) setScore(s => s + 1);
    setItem(items[Math.floor(Math.random() * items.length)]);
  };

  const getColorClass = (c: string) => {
    switch(c) {
      case 'pink': return 'bg-pink-100 text-pink-600 border-pink-300';
      case 'amber': return 'bg-amber-100 text-amber-600 border-amber-300';
      case 'sage': return 'bg-green-100 text-green-600 border-green-300';
      case 'blue': return 'bg-blue-100 text-blue-600 border-blue-300';
      case 'purple': return 'bg-purple-100 text-purple-600 border-purple-300';
      case 'red': return 'bg-red-100 text-red-600 border-red-300';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex flex-col items-center mt-12 flex-1 w-full">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <div className="flex justify-between w-full mb-6">
        <div className="bg-pink-50 px-6 py-2.5 rounded-2xl text-pink-600 font-black font-mono text-lg border border-pink-200">Waktu: {timeLeft}s</div>
        <div className="bg-amber-50 px-6 py-2.5 rounded-2xl text-amber-600 font-black font-mono text-lg border border-amber-200">Skor: {score}</div>
      </div>
      <div className="flex-1 flex items-center justify-center mb-8 text-[7rem] animate-bounce">{item.emoji}</div>
      <div className={`grid ${items.length > 3 ? 'grid-cols-3' : 'grid-cols-3'} gap-3 w-full`}>
        {items.map(it => (
          <button key={it.color} onClick={() => handleSort(it.color)} className={`py-6 rounded-[1.5rem] border-2 text-3xl font-black shadow-sm active:scale-95 transition-all flex flex-col items-center justify-center gap-1 ${getColorClass(it.color)}`}>
            <span>{it.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PaketGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const [path, setPath] = useState([0]);
  const obs = useRef(() => {
    if (rank === 3) return [1, 2, 3, 7, 8, 12, 13, 16, 17];
    if (rank === 2) return [1, 3, 7, 8, 12, 13, 16, 21];
    if (rank === 1) return [3, 7, 8, 12, 16, 21];
    return [3, 7, 12, 16, 21];
  });
  
  const handleTileClick = (i: number) => {
    if (obs.current().includes(i)) return;
    if (path.includes(i)) { if (path[path.length - 2] === i) setPath(p => p.slice(0, -1)); return; }
    const last = path[path.length - 1];
    if ((Math.abs(last - i) === 1 && Math.floor(last / 5) === Math.floor(i / 5)) || Math.abs(last - i) === 5) {
      setPath([...path, i]);
      if (i === 24) onFinish(baseReward);
    }
  };
  return (
    <div className="flex flex-col items-center mt-8 flex-1">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <h3 className="font-display font-black text-xl text-gray-500 mb-6 uppercase">Hubungkan Rute Paket! ({obs.current().length} Rintangan)</h3>
      <div className="grid grid-cols-5 gap-2 bg-gray-100 p-4 rounded-[2rem] w-[320px] shadow-inner border-2 border-gray-200">
        {Array.from({length:25}).map((_, i) => {
          let bg = 'bg-white cursor-pointer hover:bg-pink-50';
          if (i === 0) bg = 'bg-green-500 text-white shadow-md font-black';
          else if (i === 24) bg = 'bg-[#ff758c] text-white shadow-md font-black animate-pulse';
          else if (obs.current().includes(i)) bg = 'bg-gray-800 border-2 border-gray-900 cursor-not-allowed';
          else if (path[path.length-1]===i) bg = 'bg-blue-500 scale-95 rounded-full border-4 border-white shadow-md';
          else if (path.includes(i)) bg = 'bg-blue-300';
          return <div key={i} onClick={() => handleTileClick(i)} className={`aspect-square rounded-xl flex items-center justify-center transition-all ${bg}`}>
            {i === 0 && "🚀"}
            {i === 24 && "🏠"}
            {obs.current().includes(i) && "🚧"}
          </div>
        })}
      </div>
    </div>
  );
}

function TutorGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const getQuestions = () => {
    if (rank === 3) return [
      {q:"25 x 16?", a:"400", o:["380","400","420","360"]}, 
      {q:"480 / 15?", a:"32", o:["28","30","32","34"]}, 
      {q:"18 x 18?", a:"324", o:["314","324","334","344"]}, 
      {q:"350 - 178?", a:"172", o:["162","172","182","192"]}, 
      {q:"14 x 14?", a:"196", o:["186","196","206","176"]}, 
      {q:"525 / 25?", a:"21", o:["19","21","23","25"]}
    ];
    if (rank === 2) return [
      {q:"125 - 47?", a:"78", o:["76","78","82","68"]}, 
      {q:"16 x 8?", a:"128", o:["118","128","138","124"]}, 
      {q:"360 / 12?", a:"30", o:["25","30","35","40"]}, 
      {q:"15 x 15?", a:"225", o:["215","225","235","245"]}, 
      {q:"240 / 8?", a:"30", o:["20","30","40","50"]}
    ];
    if (rank === 1) return [
      {q:"45 + 38?", a:"83", o:["81","82","83","85"]}, 
      {q:"14 x 5?", a:"70", o:["60","65","70","75"]}, 
      {q:"180 / 6?", a:"30", o:["25","30","35","40"]}, 
      {q:"9 x 12?", a:"108", o:["98","108","118","102"]}
    ];
    return [
      {q:"15 + 12?", a:"27", o:["25","26","27","28"]}, 
      {q:"7 x 8?", a:"56", o:["54","56","64","48"]}, 
      {q:"100 / 4?", a:"25", o:["20","25","30","15"]}
    ];
  };

  const [q] = useState(getQuestions());
  const [idx, setIdx] = useState(0);
  const handleAnswer = (ans: string) => {
    if (ans === q[idx].a) { if (idx === q.length - 1) onFinish(baseReward); else setIdx(idx + 1); }
    else onFinish(0);
  };
  return (
    <div className="flex flex-col items-center mt-8 flex-1 w-full max-w-lg mx-auto">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <div className="text-xs font-bold font-mono text-purple-600 mb-2">SOAL {idx + 1} DARI {q.length}</div>
      <div className="bg-purple-50 w-full p-8 rounded-[2rem] border-4 border-purple-200 mb-6 min-h-[140px] flex items-center justify-center text-center shadow-sm">
        <h3 className="font-bold text-4xl text-purple-900">{q[idx].q}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {q[idx].o.map(opt => <button key={opt} onClick={() => handleAnswer(opt)} className="py-6 bg-white border-4 border-gray-200 rounded-[1.5rem] font-black text-2xl text-gray-700 hover:bg-purple-50 hover:border-purple-300 active:scale-95 shadow-sm transition-all">{opt}</button>)}
      </div>
    </div>
  );
}

function BaristaGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const options = ['☕', '🥛', '🧊', '🍯', '🍵', '🍋'];
  const len = rank === 3 ? 6 : rank === 2 ? 5 : rank === 1 ? 4 : 3;
  
  const [target] = useState(() => Array.from({length: len}).map(() => options[Math.floor(Math.random() * (rank >= 2 ? 6 : 5))]));
  const [input, setInput] = useState<string[]>([]);
  
  const handleClick = (o: string) => {
    const next = [...input, o];
    setInput(next);
    if (next[next.length-1] !== target[next.length-1]) onFinish(0);
    else if (next.length === len) onFinish(baseReward);
  };
  return (
    <div className="flex flex-col items-center mt-8 flex-1">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <h3 className="font-bold text-lg mb-3 text-gray-500">Resep Pesanan ({len} Bahan):</h3>
      <div className="flex flex-wrap justify-center gap-3 mb-8 text-4xl bg-gray-50 p-5 rounded-2xl border-4 border-gray-100 shadow-inner max-w-md">
        {target.map((t,i)=><span key={i} className="animate-pulse">{t}</span>)}
      </div>
      <div className="flex flex-wrap justify-center gap-3 max-w-sm">
        {options.slice(0, rank >= 2 ? 6 : 5).map(o => <button key={o} onClick={() => handleClick(o)} className="w-18 h-18 bg-white border-4 border-amber-200 rounded-2xl text-4xl active:scale-90 hover:bg-amber-50 shadow-sm transition-all">{o}</button>)}
      </div>
      <div className="mt-6 flex gap-2 text-2xl min-h-[40px] bg-amber-50/50 px-6 py-2 rounded-xl border border-amber-200/60">
        {input.map((i, idx)=><span key={idx}>{i}</span>)}
      </div>
    </div>
  );
}

function CuciPiringGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const targetClicks = rank === 3 ? 50 : rank === 2 ? 40 : rank === 1 ? 32 : 25;
  const initialTime = rank === 3 ? 8 : 10;
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(l => l > 0 ? l - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (clicks >= targetClicks) onFinish(baseReward);
    else if (timeLeft <= 0) onFinish(0);
  }, [clicks, timeLeft]);
  return (
    <div className="flex flex-col items-center mt-8 flex-1 w-full text-center">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <div className="bg-blue-50 px-6 py-2.5 rounded-2xl text-blue-600 font-black font-mono text-xl mb-6 border border-blue-200">Waktu: {timeLeft}s</div>
      <p className="text-gray-500 font-bold mb-4">Klik piring {targetClicks} kali dengan cepat!</p>
      <div className="w-full max-w-sm bg-gray-200 h-6 rounded-full mb-8 overflow-hidden border border-gray-300 shadow-inner">
        <div className="h-full bg-blue-500 transition-all duration-100" style={{width: `${(clicks/targetClicks)*100}%`}}/>
      </div>
      <button onClick={() => setClicks(c=>c+1)} className="w-44 h-44 bg-gray-50 rounded-full border-[10px] border-blue-200 text-[5.5rem] shadow-xl active:scale-90 select-none flex items-center justify-center hover:bg-blue-50 transition-all">🍽️</button>
    </div>
  );
}

function KasirGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const [total] = useState(() => {
    if (rank === 3) return Math.floor(Math.random() * 40 + 15) * 5000; // 75k - 275k
    if (rank === 2) return Math.floor(Math.random() * 25 + 10) * 5000; // 50k - 175k
    if (rank === 1) return Math.floor(Math.random() * 15 + 5) * 5000; // 25k - 100k
    return Math.floor(Math.random() * 5 + 3) * 10000; // 30k - 70k
  });
  const paid = rank === 3 ? 300000 : rank === 2 ? 200000 : 100000;
  const change = paid - total;
  const [options] = useState([change, change + 5000, change - 10000, change + 10000].sort(() => 0.5 - Math.random()));
  
  const initialTime = rank === 3 ? 10 : rank === 2 ? 12 : 15;
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (rank >= 1) {
      if (timeLeft > 0) { const t = setTimeout(() => setTimeLeft(l => l - 1), 1000); return () => clearTimeout(t); }
      else onFinish(0);
    }
  }, [timeLeft, rank]);

  return (
    <div className="flex flex-col items-center mt-8 flex-1 w-full max-w-sm mx-auto">
      <DifficultyBadge rank={rank} rankName={rankName} />
      {rank >= 1 && <div className="text-red-500 font-mono font-black text-sm mb-2">Batas Waktu: {timeLeft}s</div>}
      <div className="bg-green-50 p-6 w-full rounded-[2rem] border-4 border-green-200 mb-6 shadow-sm">
        <p className="text-green-800 font-mono font-bold text-lg">Total: Rp {total.toLocaleString('id-ID')}</p>
        <p className="text-green-800 font-mono font-bold text-lg">Dibayar: Rp {paid.toLocaleString('id-ID')}</p>
        <p className="text-xl mt-4 font-black text-green-900 text-center border-t border-green-200 pt-3">Berapa Kembaliannya?</p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        {options.map(opt => <button key={opt} onClick={() => onFinish(opt === change ? baseReward : 0)} className="py-5 bg-white border-4 border-gray-200 rounded-[1.5rem] font-mono font-black text-lg hover:bg-green-50 hover:border-green-300 active:scale-95 shadow-sm transition-all">Rp {opt.toLocaleString('id-ID')}</button>)}
      </div>
    </div>
  );
}

function DataEntryGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const len = rank === 3 ? 9 : rank === 2 ? 7 : rank === 1 ? 6 : 5;
  const initialTime = rank === 3 ? 8 : rank === 2 ? 9 : 10;
  const [code] = useState(Math.random().toString(36).substring(2, 2 + len).toUpperCase());
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(initialTime);
  useEffect(() => {
    if (timeLeft > 0) { const t = setTimeout(() => setTimeLeft(l => l - 1), 1000); return () => clearTimeout(t); }
    else onFinish(0);
  }, [timeLeft]);
  return (
    <div className="flex flex-col items-center justify-center mt-8 flex-1 w-full max-w-sm mx-auto">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <div className="text-red-500 font-black font-mono text-xl mb-4 bg-red-50 px-4 py-1.5 rounded-xl border border-red-200">Waktu: {timeLeft}s</div>
      <div className="bg-black text-green-400 font-mono font-black text-3xl md:text-4xl tracking-[0.3em] p-6 rounded-2xl mb-6 w-full text-center select-none shadow-lg">{code}</div>
      <input autoFocus value={input} onChange={e => {
        const val = e.target.value.toUpperCase();
        setInput(val);
        if (val === code) onFinish(baseReward);
      }} className="w-full bg-gray-50 border-4 border-gray-200 p-5 rounded-2xl text-center text-2xl font-mono font-black uppercase outline-none focus:border-blue-400 shadow-sm" placeholder="KETIK DI SINI" />
    </div>
  );
}

function ParkirGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const targetScore = rank === 3 ? 18 : rank === 2 ? 14 : rank === 1 ? 12 : 10;
  const spawnRate = rank === 3 ? 400 : rank === 2 ? 550 : rank === 1 ? 680 : 800;
  const [cars, setCars] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  useEffect(() => {
    const spawn = setInterval(() => {
      setCars(prev => {
        if (prev.length > (rank >= 2 ? 7 : 5)) return prev;
        let p = Math.floor(Math.random() * 9);
        while (prev.includes(p)) p = Math.floor(Math.random() * 9);
        return [...prev, p];
      });
    }, spawnRate);
    const t = setInterval(() => setTimeLeft(l => l - 1), 1000);
    return () => { clearInterval(spawn); clearInterval(t); };
  }, [spawnRate, rank]);
  useEffect(() => {
    if (timeLeft <= 0) onFinish(score >= targetScore ? baseReward : 0);
  }, [timeLeft]);
  const clickCar = (i: number) => {
    if (cars.includes(i)) {
      setScore(s => s + 1);
      setCars(prev => prev.filter(c => c !== i));
    }
  };
  return (
    <div className="flex flex-col items-center mt-6 flex-1">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <div className="flex gap-6 mb-6 font-mono font-black text-lg bg-gray-100 px-6 py-2 rounded-2xl border border-gray-200">
        <span>Waktu: {timeLeft}s</span>
        <span className={score >= targetScore ? "text-green-600" : "text-gray-700"}>Skor: {score}/{targetScore}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 bg-gray-800 p-5 rounded-2xl w-[300px] shadow-xl border-4 border-gray-700">
        {Array.from({length:9}).map((_, i) => (
          <div key={i} onClick={() => clickCar(i)} className={`aspect-square rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer transition-colors ${cars.includes(i) ? 'bg-red-500 scale-95 border-solid border-red-300 shadow-md' : 'bg-gray-700 hover:bg-gray-650'}`}>
            {cars.includes(i) && <span className="text-4xl pointer-events-none animate-pulse">🚗</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PelayanGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const items = ['🍔', '🍟', '🥤', '🌭', '🍗', '🥗'];
  const len = rank === 3 ? 7 : rank === 2 ? 6 : rank === 1 ? 5 : 4;
  const showTime = rank === 3 ? 1800 : rank === 2 ? 2200 : rank === 1 ? 2600 : 3000;
  
  const [seq] = useState(() => Array.from({length: len}).map(() => items[Math.floor(Math.random() * items.length)]));
  const [input, setInput] = useState<string[]>([]);
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), showTime); return () => clearTimeout(t); }, [showTime]);
  const handleClick = (o: string) => {
    if (show) return;
    const next = [...input, o];
    setInput(next);
    if (next[next.length-1] !== seq[next.length-1]) onFinish(0);
    else if (next.length === len) onFinish(baseReward);
  };
  return (
    <div className="flex flex-col items-center mt-8 flex-1 w-full max-w-md mx-auto text-center">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <h3 className="font-bold text-lg text-gray-500 mb-4">{show ? `Hafalkan ${len} pesanan ini!` : `Ulangi urutan ${len} pesanan!`}</h3>
      <div className="flex flex-wrap gap-3 justify-center mb-8 min-h-[70px] items-center bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 w-full">
        {show ? seq.map((s,i)=><span key={i} className="text-4xl md:text-5xl animate-bounce">{s}</span>) : input.map((s,i)=><span key={i} className="text-4xl md:text-5xl">{s}</span>)}
      </div>
      {!show && (
        <div className="grid grid-cols-3 gap-3 w-full">
          {items.map(o => <button key={o} onClick={() => handleClick(o)} className="py-5 bg-white border-4 border-gray-200 rounded-2xl text-4xl hover:bg-orange-50 hover:border-orange-200 active:scale-95 shadow-sm transition-all">{o}</button>)}
        </div>
      )}
    </div>
  );
}

function PenulisGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const getWords = () => {
    if (rank === 3) return ["KEDISIPLINAN", "PRODUKTIVITAS", "PENYEMANGAT", "KONSISTENSI", "PERJUANGAN"];
    if (rank === 2) return ["PRESTASI", "SEMAKIN", "EKONOMI", "HARAPAN", "MANDIRI"];
    if (rank === 1) return ["KARIER", "RAHASIA", "KAMPUS", "SUKSES", "CERDAS"];
    return ["KERJA", "UANG", "FOKUS", "RAVEN", "LIVIA"];
  };
  
  const [word] = useState(() => {
    const w = getWords();
    return w[Math.floor(Math.random() * w.length)];
  });
  const [scrambled] = useState([...word].sort(() => 0.5 - Math.random()));
  const [input, setInput] = useState<number[]>([]);
  const handleClick = (i: number) => {
    if (input.includes(i)) return;
    const next = [...input, i];
    setInput(next);
    const curStr = next.map(idx => scrambled[idx]).join('');
    if (curStr !== word.substring(0, next.length)) setInput([]); // reset if wrong prefix
    else if (curStr === word) onFinish(baseReward);
  };
  return (
    <div className="flex flex-col items-center mt-8 flex-1">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <p className="text-gray-400 font-bold tracking-widest uppercase mb-6 text-sm">Susun Huruf Menjadi Kata ({word.length} Huruf)</p>
      <div className="flex flex-wrap justify-center gap-1.5 min-h-[60px] mb-8">
        {Array.from({length:word.length}).map((_, i) => (
          <div key={i} className="w-12 h-14 md:w-14 md:h-16 border-b-4 border-gray-400 bg-gray-50 rounded-t-lg flex items-center justify-center text-2xl md:text-3xl font-black text-gray-800">
            {input[i] !== undefined ? scrambled[input[i]] : ''}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3 max-w-lg">
        {scrambled.map((char, i) => (
          <button key={i} onClick={() => handleClick(i)} disabled={input.includes(i)} className="w-14 h-14 md:w-16 md:h-16 bg-white border-4 border-pink-200 rounded-xl text-2xl md:text-3xl font-black text-pink-500 disabled:opacity-0 hover:bg-pink-50 active:scale-90 shadow-sm transition-all">{char}</button>
        ))}
      </div>
    </div>
  );
}

function TambangGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const targetClicks = rank === 3 ? 65 : rank === 2 ? 55 : rank === 1 ? 45 : 35;
  const initialTime = rank === 3 ? 9 : 10;
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(l => l > 0 ? l - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (clicks >= targetClicks) onFinish(baseReward);
    else if (timeLeft <= 0) onFinish(0);
  }, [clicks, timeLeft]);
  return (
    <div className="flex flex-col items-center mt-8 flex-1 w-full text-center">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <div className="bg-orange-50 px-6 py-2.5 rounded-2xl text-orange-600 font-black font-mono text-xl mb-6 border border-orange-200">Sisa Waktu: {timeLeft}s</div>
      <p className="text-gray-500 font-bold mb-4">Pukul batu tambang {targetClicks} kali dengan cepat!</p>
      <div className="w-full max-w-sm bg-gray-200 h-6 rounded-full mb-10 overflow-hidden border border-gray-300 shadow-inner">
        <div className="h-full bg-orange-500 transition-all duration-100" style={{width: `${(clicks/targetClicks)*100}%`}}/>
      </div>
      <button onClick={() => setClicks(c=>c+1)} className="text-[8rem] active:scale-90 hover:scale-105 transition-all select-none focus:outline-none filter drop-shadow-xl">🪨</button>
    </div>
  );
}

function ReparasiGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const allColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'];
  const numColors = rank === 3 ? 8 : rank === 2 ? 6 : rank === 1 ? 5 : 4;
  const colors = allColors.slice(0, numColors);
  
  const [left] = useState([...colors].sort(() => 0.5 - Math.random()));
  const [right] = useState([...colors].sort(() => 0.5 - Math.random()));
  const [selL, setSelL] = useState<string|null>(null);
  const [selR, setSelR] = useState<string|null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  
  const initialTime = rank === 3 ? 12 : rank === 2 ? 15 : 999;
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (rank >= 2) {
      if (timeLeft > 0) { const t = setTimeout(() => setTimeLeft(l => l - 1), 1000); return () => clearTimeout(t); }
      else onFinish(0);
    }
  }, [timeLeft, rank]);

  useEffect(() => {
    if (selL && selR) {
      if (selL === selR) { setMatched([...matched, selL]); setSelL(null); setSelR(null); }
      else { setTimeout(() => { setSelL(null); setSelR(null); }, 300); }
    }
  }, [selL, selR]);
  useEffect(() => { if (matched.length === numColors) setTimeout(() => onFinish(baseReward), 300); }, [matched, numColors]);
  
  const getColorCls = (c: string) => {
    switch(c) {
      case 'red': return 'bg-red-500';
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-400';
      case 'purple': return 'bg-purple-600';
      case 'orange': return 'bg-orange-500';
      case 'cyan': return 'bg-cyan-400';
      case 'pink': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col items-center mt-6 flex-1 w-full max-w-md mx-auto">
      <DifficultyBadge rank={rank} rankName={rankName} />
      {rank >= 2 && <div className="text-red-500 font-mono font-black text-sm mb-4">Batas Waktu: {timeLeft}s</div>}
      <h3 className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider">Cocokkan {numColors} Warna Kabel!</h3>
      <div className="flex justify-between items-center w-full px-6">
        <div className="flex flex-col gap-3">
          {left.map(c => <button key={c} onClick={() => !matched.includes(c) && setSelL(c)} className={`w-14 h-14 rounded-full border-4 shadow-md transition-all ${getColorCls(c)} ${selL===c?'scale-110 border-black ring-4 ring-black/20':'border-transparent hover:scale-105'} ${matched.includes(c)?'opacity-20 pointer-events-none':''}`} />)}
        </div>
        <div className="text-2xl font-black text-gray-300">⚡</div>
        <div className="flex flex-col gap-3">
          {right.map(c => <button key={c} onClick={() => !matched.includes(c) && setSelR(c)} className={`w-14 h-14 rounded-full border-4 shadow-md transition-all ${getColorCls(c)} ${selR===c?'scale-110 border-black ring-4 ring-black/20':'border-transparent hover:scale-105'} ${matched.includes(c)?'opacity-20 pointer-events-none':''}`} />)}
        </div>
      </div>
    </div>
  );
}

function PelukisGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const getTargets = () => {
    if (rank >= 2) return [
      {n:'Cokelat Ungu (3x)', c:['merah','biru','kuning']}, 
      {n:'Hijau Zaitun (3x)', c:['kuning','kuning','biru']}, 
      {n:'Jingga Terang (3x)', c:['merah','merah','kuning']}
    ];
    return [
      {n:'Ungu (2x)', c:['merah','biru']}, 
      {n:'Hijau (2x)', c:['kuning','biru']}, 
      {n:'Jingga (2x)', c:['merah','kuning']}
    ];
  };
  
  const [targets] = useState(getTargets());
  const [t] = useState(targets[Math.floor(Math.random() * targets.length)]);
  const [input, setInput] = useState<string[]>([]);
  
  const initialTime = rank === 3 ? 6 : rank === 2 ? 8 : rank === 1 ? 10 : 999;
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (rank >= 1) {
      if (timeLeft > 0) { const tm = setTimeout(() => setTimeLeft(l => l - 1), 1000); return () => clearTimeout(tm); }
      else onFinish(0);
    }
  }, [timeLeft, rank]);

  const handleClick = (c: string) => {
    const next = [...input, c];
    setInput(next);
    if (next.length === t.c.length) {
      const isCorrect = t.c.every(val => next.includes(val)) && next.every(val => t.c.includes(val));
      if (isCorrect) setTimeout(() => onFinish(baseReward), 300);
      else setTimeout(() => onFinish(0), 300);
    }
  };
  return (
    <div className="flex flex-col items-center mt-8 flex-1 w-full text-center">
      <DifficultyBadge rank={rank} rankName={rankName} />
      {rank >= 1 && <div className="text-red-500 font-mono font-black text-sm mb-2">Batas Waktu: {timeLeft}s</div>}
      <h3 className="font-bold text-gray-500 mb-2 text-lg">Buat Campuran Warna ({t.c.length} Bahan):</h3>
      <div className="text-3xl md:text-4xl font-black mb-8 uppercase tracking-wide bg-pink-50 px-6 py-4 rounded-2xl border-2 border-pink-200 text-[#5c4d47]">{t.n}</div>
      <div className="flex gap-6 mb-8">
        {['merah','biru','kuning'].map(c => (
          <button key={c} onClick={() => handleClick(c)} className={`w-20 h-20 md:w-24 md:h-24 rounded-full shadow-lg border-4 border-white active:scale-90 hover:scale-105 transition-all ${c==='merah'?'bg-red-500':c==='biru'?'bg-blue-500':'bg-yellow-400'}`} />
        ))}
      </div>
      <div className="flex gap-2 min-h-[30px] font-mono font-bold text-gray-400">
        Campuranmu: {input.map(i => i.toUpperCase()).join(' + ')}
      </div>
    </div>
  );
}

function TraderGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const speed = rank === 3 ? 12 : rank === 2 ? 18 : rank === 1 ? 24 : 30;
  const minPos = rank === 3 ? 46 : rank === 2 ? 43 : rank === 1 ? 41 : 40;
  const maxPos = rank === 3 ? 54 : rank === 2 ? 57 : rank === 1 ? 59 : 60;
  
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState(1);
  const ref = useRef<any>(null);
  useEffect(() => {
    ref.current = setInterval(() => {
      setPos(p => {
        if (p >= 100) { setDir(-1); return 98; }
        if (p <= 0) { setDir(1); return 2; }
        return p + dir * 3;
      });
    }, speed);
    return () => clearInterval(ref.current);
  }, [dir, speed]);
  const handleClick = () => {
    clearInterval(ref.current);
    if (pos >= minPos && pos <= maxPos) onFinish(baseReward);
    else onFinish(0);
  };
  return (
    <div className="flex flex-col items-center justify-center mt-8 flex-1 w-full text-center">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <h3 className="font-bold text-xl mb-10 text-gray-600">Beli saat jarum merah tepat di zona hijau!</h3>
      <div className="w-full max-w-md h-14 bg-gray-200 rounded-full relative mb-12 overflow-hidden shadow-inner border-2 border-gray-300">
        <div className="absolute top-0 bottom-0 bg-green-400/80 border-x-2 border-green-600" style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }} />
        <div className="absolute top-0 bottom-0 w-2.5 bg-red-600 shadow-md transition-all duration-75" style={{left: `${pos}%`}} />
      </div>
      <button onClick={handleClick} className="px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-2xl rounded-[2rem] shadow-lg active:scale-95 transition-all">BELI SEKARANG</button>
    </div>
  );
}

function MancingGame({ onFinish, baseReward, rank = 0, rankName = 'Tembaga' }: { onFinish: (rv: number) => void, baseReward: number, rank?: number, rankName?: string }) {
  const maxReaction = rank === 3 ? 320 : rank === 2 ? 450 : rank === 1 ? 600 : 800;
  const [status, setStatus] = useState<'wait'|'ready'>('wait');
  const timer = useRef<any>(null);
  useEffect(() => {
    const delay = Math.random() * 3000 + 2000;
    const t = setTimeout(() => {
      setStatus('ready');
      timer.current = Date.now();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const handleClick = () => {
    if (status === 'wait') onFinish(0);
    else {
      const reaction = Date.now() - timer.current;
      if (reaction < maxReaction) onFinish(baseReward);
      else onFinish(0);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center mt-8 flex-1 w-full text-center">
      <DifficultyBadge rank={rank} rankName={rankName} />
      <div className="text-xs font-mono font-bold text-gray-400 mb-6">Waktu Reaksi Maksimal: {maxReaction}ms</div>
      <div className="text-[7rem] md:text-[8rem] h-36 mb-10 animate-bounce">{status === 'ready' ? '❗' : '🎣'}</div>
      <button onClick={handleClick} className="px-12 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-2xl rounded-[2rem] shadow-lg active:scale-95 transition-all">TARIK!</button>
    </div>
  );
}

