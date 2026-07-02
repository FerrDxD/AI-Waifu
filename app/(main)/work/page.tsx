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
  if (completions >= 50) { rankName = 'Emas'; multiplier = 15; rankColor = 'text-yellow-500 border-yellow-500 bg-yellow-500/10'; nextTarget = 50; }
  else if (completions >= 25) { rankName = 'Perak'; multiplier = 5; rankColor = 'text-gray-400 border-gray-400 bg-gray-400/10'; nextTarget = 50; }
  else if (completions >= 10) { rankName = 'Perunggu'; multiplier = 2; rankColor = 'text-amber-600 border-amber-600 bg-amber-600/10'; nextTarget = 25; }
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
                  <GameDispatcher type={selectedJob.type} onFinish={claimReward} baseReward={finalReward} />
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
function GameDispatcher({ type, onFinish, baseReward }: { type: JobCategory, onFinish: (rv: number) => void, baseReward: number }) {
  switch(type) {
    case 'sortir': return <SortirGame onFinish={onFinish} />;
    case 'paket': return <PaketGame onFinish={onFinish} baseReward={baseReward} />;
    case 'tutor': return <TutorGame onFinish={onFinish} baseReward={baseReward} />;
    case 'barista': return <BaristaGame onFinish={onFinish} baseReward={baseReward} />;
    case 'cucipiring': return <CuciPiringGame onFinish={onFinish} baseReward={baseReward} />;
    case 'kasir': return <KasirGame onFinish={onFinish} baseReward={baseReward} />;
    case 'dataentry': return <DataEntryGame onFinish={onFinish} baseReward={baseReward} />;
    case 'parkir': return <ParkirGame onFinish={onFinish} baseReward={baseReward} />;
    case 'pelayan': return <PelayanGame onFinish={onFinish} baseReward={baseReward} />;
    case 'penulis': return <PenulisGame onFinish={onFinish} baseReward={baseReward} />;
    case 'tambang': return <TambangGame onFinish={onFinish} baseReward={baseReward} />;
    case 'reparasi': return <ReparasiGame onFinish={onFinish} baseReward={baseReward} />;
    case 'pelukis': return <PelukisGame onFinish={onFinish} baseReward={baseReward} />;
    case 'trader': return <TraderGame onFinish={onFinish} baseReward={baseReward} />;
    case 'mancing': return <MancingGame onFinish={onFinish} baseReward={baseReward} />;
    default: return <div>Game Not Found</div>;
  }
}

// -----------------------------------------------------------------------------
// MINIGAMES
// -----------------------------------------------------------------------------

function SortirGame({ onFinish }: { onFinish: (rv: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [item, setItem] = useState<{emoji: string, color: string}>({emoji:'📚', color:'pink'});
  const items = [{emoji:'📚', color:'pink'}, {emoji:'🍪', color:'amber'}, {emoji:'👕', color:'sage'}];

  useEffect(() => {
    if (timeLeft > 0) { const t = setTimeout(() => setTimeLeft(l => l - 1), 1000); return () => clearTimeout(t); } 
    else { onFinish(score * 2); }
  }, [timeLeft]);

  const handleSort = (c: string) => {
    if (item.color === c) setScore(s => s + 1);
    setItem(items[Math.floor(Math.random() * items.length)]);
  };

  return (
    <div className="flex flex-col items-center mt-12 flex-1 w-full">
      <div className="flex justify-between w-full mb-8">
        <div className="bg-pink-50 px-6 py-3 rounded-2xl text-pink-600 font-black font-mono text-xl">{timeLeft}s</div>
        <div className="bg-amber-50 px-6 py-3 rounded-2xl text-amber-600 font-black font-mono text-xl">Score: {score}</div>
      </div>
      <div className="flex-1 flex items-center justify-center mb-12 text-[8rem]">{item.emoji}</div>
      <div className="grid grid-cols-3 gap-4 w-full">
        <button onClick={() => handleSort('pink')} className="py-8 bg-pink-100 rounded-[2rem] text-4xl shadow-md active:scale-95">📚</button>
        <button onClick={() => handleSort('amber')} className="py-8 bg-amber-100 rounded-[2rem] text-4xl shadow-md active:scale-95">🍪</button>
        <button onClick={() => handleSort('sage')} className="py-8 bg-green-100 rounded-[2rem] text-4xl shadow-md active:scale-95">👕</button>
      </div>
    </div>
  );
}

function PaketGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const [path, setPath] = useState([0]);
  const obs = useRef([3, 7, 12, 16, 21]); // Static obstacles for simplicity
  const handleTileClick = (i: number) => {
    if (obs.current.includes(i)) return;
    if (path.includes(i)) { if (path[path.length - 2] === i) setPath(p => p.slice(0, -1)); return; }
    const last = path[path.length - 1];
    if ((Math.abs(last - i) === 1 && Math.floor(last / 5) === Math.floor(i / 5)) || Math.abs(last - i) === 5) {
      setPath([...path, i]);
      if (i === 24) onFinish(baseReward);
    }
  };
  return (
    <div className="flex flex-col items-center mt-12 flex-1">
      <h3 className="font-display font-black text-2xl text-gray-500 mb-8 uppercase">Hubungkan Rute!</h3>
      <div className="grid grid-cols-5 gap-2 bg-gray-100 p-4 rounded-[2rem] w-[320px]">
        {Array.from({length:25}).map((_, i) => {
          let bg = 'bg-white cursor-pointer';
          if (i === 0) bg = 'bg-green-400 text-white';
          else if (i === 24) bg = 'bg-[#ff758c] text-white';
          else if (obs.current.includes(i)) bg = 'bg-gray-800';
          else if (path[path.length-1]===i) bg = 'bg-blue-500 scale-90 rounded-full border-4 border-white';
          else if (path.includes(i)) bg = 'bg-blue-300';
          return <div key={i} onClick={() => handleTileClick(i)} className={`aspect-square rounded-xl flex items-center justify-center ${bg}`}/>
        })}
      </div>
    </div>
  );
}

function TutorGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const q = [{q:"15 + 12?", a:"27", o:["25","26","27","28"]}, {q:"7 x 8?", a:"56", o:["54","56","64","48"]}, {q:"100 / 4?", a:"25", o:["20","25","30","15"]}];
  const [idx, setIdx] = useState(0);
  const handleAnswer = (ans: string) => {
    if (ans === q[idx].a) { if (idx === 2) onFinish(baseReward); else setIdx(idx + 1); }
    else onFinish(0);
  };
  return (
    <div className="flex flex-col items-center mt-12 flex-1 w-full max-w-lg mx-auto">
      <div className="bg-purple-50 w-full p-10 rounded-[2rem] border-4 border-purple-200 mb-8 min-h-[160px] flex items-center justify-center text-center">
        <h3 className="font-bold text-4xl text-purple-900">{q[idx].q}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {q[idx].o.map(opt => <button key={opt} onClick={() => handleAnswer(opt)} className="py-6 bg-white border-4 border-gray-200 rounded-[1.5rem] font-black text-2xl text-gray-700 hover:bg-purple-50 active:scale-95">{opt}</button>)}
      </div>
    </div>
  );
}

function BaristaGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const recipes = [ ['☕', '🥛', '🧊'], ['🍵', '🍯', '🧊'], ['☕', '🍯', '🥛'] ];
  const [target] = useState(recipes[Math.floor(Math.random() * recipes.length)]);
  const [input, setInput] = useState<string[]>([]);
  const options = ['☕', '🥛', '🧊', '🍯', '🍵'];
  const handleClick = (o: string) => {
    const next = [...input, o];
    setInput(next);
    if (next[next.length-1] !== target[next.length-1]) onFinish(0);
    else if (next.length === 3) onFinish(baseReward);
  };
  return (
    <div className="flex flex-col items-center mt-12 flex-1">
      <h3 className="font-bold text-xl mb-4 text-gray-500">Resep Pesanan:</h3>
      <div className="flex gap-4 mb-12 text-5xl bg-gray-50 p-6 rounded-2xl border-4 border-gray-100">{target.map((t,i)=><span key={i}>{t}</span>)}</div>
      <div className="flex flex-wrap justify-center gap-4 max-w-sm">
        {options.map(o => <button key={o} onClick={() => handleClick(o)} className="w-20 h-20 bg-white border-4 border-amber-200 rounded-2xl text-4xl active:scale-90">{o}</button>)}
      </div>
      <div className="mt-8 flex gap-2 text-2xl">{input.map((i, idx)=><span key={idx}>{i}</span>)}</div>
    </div>
  );
}

function CuciPiringGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(l => l > 0 ? l - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (clicks >= 30) onFinish(baseReward);
    else if (timeLeft <= 0) onFinish(0);
  }, [clicks, timeLeft]);
  return (
    <div className="flex flex-col items-center mt-12 flex-1 w-full text-center">
      <div className="bg-blue-50 px-6 py-3 rounded-2xl text-blue-600 font-black font-mono text-2xl mb-8">Waktu: {timeLeft}s</div>
      <p className="text-gray-500 font-bold mb-4">Klik piring 30 kali cepat!</p>
      <div className="w-full bg-gray-200 h-6 rounded-full mb-8 overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{width: `${(clicks/30)*100}%`}}/></div>
      <button onClick={() => setClicks(c=>c+1)} className="w-48 h-48 bg-gray-50 rounded-full border-[12px] border-blue-200 text-[6rem] shadow-xl active:scale-90 select-none flex items-center justify-center">🍽️</button>
    </div>
  );
}

function KasirGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const [total] = useState(Math.floor(Math.random() * 5 + 3) * 10000); // 30k to 70k
  const paid = 100000;
  const change = paid - total;
  const [options] = useState([change, change + 5000, change - 10000, change + 10000].sort(() => 0.5 - Math.random()));
  return (
    <div className="flex flex-col items-center mt-12 flex-1 w-full max-w-sm mx-auto">
      <div className="bg-green-50 p-6 w-full rounded-[2rem] border-4 border-green-200 mb-8">
        <p className="text-green-800 font-mono font-bold">Total: Rp {total.toLocaleString('id-ID')}</p>
        <p className="text-green-800 font-mono font-bold">Dibayar: Rp {paid.toLocaleString('id-ID')}</p>
        <p className="text-2xl mt-4 font-black text-green-900 text-center">Kembalian?</p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {options.map(opt => <button key={opt} onClick={() => onFinish(opt === change ? baseReward : 0)} className="py-6 bg-white border-4 border-gray-200 rounded-[1.5rem] font-mono font-black text-xl hover:bg-green-50 active:scale-95">Rp {opt.toLocaleString('id-ID')}</button>)}
      </div>
    </div>
  );
}

function DataEntryGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const [code] = useState(Math.random().toString(36).substring(2, 7).toUpperCase());
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  useEffect(() => {
    if (timeLeft > 0) { const t = setTimeout(() => setTimeLeft(l => l - 1), 1000); return () => clearTimeout(t); }
    else onFinish(0);
  }, [timeLeft]);
  return (
    <div className="flex flex-col items-center justify-center mt-12 flex-1 w-full max-w-sm mx-auto">
      <div className="text-red-500 font-black text-2xl mb-4">{timeLeft}s</div>
      <div className="bg-black text-green-400 font-mono font-black text-5xl tracking-[0.5em] p-8 rounded-2xl mb-8 w-full text-center select-none">{code}</div>
      <input autoFocus value={input} onChange={e => {
        const val = e.target.value.toUpperCase();
        setInput(val);
        if (val === code) onFinish(baseReward);
      }} className="w-full bg-gray-50 border-4 border-gray-200 p-6 rounded-2xl text-center text-3xl font-mono font-black uppercase outline-none focus:border-blue-400" placeholder="KETIK SINI" />
    </div>
  );
}

function ParkirGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const [cars, setCars] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  useEffect(() => {
    const spawn = setInterval(() => {
      setCars(prev => {
        if (prev.length > 5) return prev;
        let p = Math.floor(Math.random() * 9);
        while (prev.includes(p)) p = Math.floor(Math.random() * 9);
        return [...prev, p];
      });
    }, 800);
    const t = setInterval(() => setTimeLeft(l => l - 1), 1000);
    return () => { clearInterval(spawn); clearInterval(t); };
  }, []);
  useEffect(() => {
    if (timeLeft <= 0) onFinish(score >= 10 ? baseReward : 0);
  }, [timeLeft]);
  const clickCar = (i: number) => {
    if (cars.includes(i)) {
      setScore(s => s + 1);
      setCars(prev => prev.filter(c => c !== i));
    }
  };
  return (
    <div className="flex flex-col items-center mt-4 flex-1">
      <div className="flex gap-8 mb-6 font-mono font-black text-2xl"><span>Waktu: {timeLeft}s</span><span>Score: {score}/10</span></div>
      <div className="grid grid-cols-3 gap-2 bg-gray-800 p-4 rounded-xl w-[300px]">
        {Array.from({length:9}).map((_, i) => (
          <div key={i} onClick={() => clickCar(i)} className={`aspect-square rounded-md border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer transition-colors ${cars.includes(i) ? 'bg-red-500 scale-95 border-solid border-red-300' : 'bg-gray-700'}`}>
            {cars.includes(i) && <span className="text-4xl pointer-events-none">🚗</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PelayanGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const items = ['🍔', '🍟', '🥤', '🌭', '🍗', '🥗'];
  const [seq] = useState(() => Array.from({length:4}).map(() => items[Math.floor(Math.random() * items.length)]));
  const [input, setInput] = useState<string[]>([]);
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 3000); return () => clearTimeout(t); }, []);
  const handleClick = (o: string) => {
    if (show) return;
    const next = [...input, o];
    setInput(next);
    if (next[next.length-1] !== seq[next.length-1]) onFinish(0);
    else if (next.length === 4) onFinish(baseReward);
  };
  return (
    <div className="flex flex-col items-center mt-12 flex-1 w-full max-w-md mx-auto text-center">
      <h3 className="font-bold text-xl text-gray-500 mb-6">{show ? 'Hafalkan pesanan!' : 'Apa pesanan tadi?'}</h3>
      <div className="flex gap-4 justify-center mb-10 h-20 items-center">
        {show ? seq.map((s,i)=><span key={i} className="text-6xl">{s}</span>) : input.map((s,i)=><span key={i} className="text-6xl">{s}</span>)}
      </div>
      {!show && (
        <div className="grid grid-cols-3 gap-4">
          {items.map(o => <button key={o} onClick={() => handleClick(o)} className="py-6 bg-white border-4 border-gray-200 rounded-2xl text-4xl hover:bg-orange-50 active:scale-95">{o}</button>)}
        </div>
      )}
    </div>
  );
}

function PenulisGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const words = ["KERJA", "UANG", "FOKUS", "RAVEN", "LIVIA"];
  const [word] = useState(words[Math.floor(Math.random() * words.length)]);
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
    <div className="flex flex-col items-center mt-12 flex-1">
      <p className="text-gray-400 font-bold tracking-widest uppercase mb-8">Susun Huruf Menjadi Kata</p>
      <div className="flex gap-2 h-16 mb-12">
        {Array.from({length:word.length}).map((_, i) => (
          <div key={i} className="w-16 h-16 border-b-4 border-gray-400 flex items-center justify-center text-4xl font-black text-gray-800">
            {input[i] !== undefined ? scrambled[input[i]] : ''}
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        {scrambled.map((char, i) => (
          <button key={i} onClick={() => handleClick(i)} disabled={input.includes(i)} className="w-16 h-16 bg-white border-4 border-pink-200 rounded-xl text-3xl font-black text-pink-500 disabled:opacity-0 transition-all active:scale-90 shadow-sm">{char}</button>
        ))}
      </div>
    </div>
  );
}

function TambangGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(l => l > 0 ? l - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (clicks >= 40) onFinish(baseReward);
    else if (timeLeft <= 0) onFinish(0);
  }, [clicks, timeLeft]);
  return (
    <div className="flex flex-col items-center mt-12 flex-1 w-full text-center">
      <div className="bg-gray-100 px-6 py-3 rounded-2xl text-gray-600 font-black font-mono text-2xl mb-8">Sisa Waktu: {timeLeft}s</div>
      <div className="w-full max-w-sm bg-gray-200 h-6 rounded-full mb-12 overflow-hidden border-2 border-gray-300">
        <div className="h-full bg-orange-500 transition-all" style={{width: `${(clicks/40)*100}%`}}/>
      </div>
      <button onClick={() => setClicks(c=>c+1)} className="text-[10rem] active:scale-90 transition-transform select-none focus:outline-none filter drop-shadow-xl">🪨</button>
    </div>
  );
}

function ReparasiGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const [left] = useState([...colors].sort(() => 0.5 - Math.random()));
  const [right] = useState([...colors].sort(() => 0.5 - Math.random()));
  const [selL, setSelL] = useState<string|null>(null);
  const [selR, setSelR] = useState<string|null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  useEffect(() => {
    if (selL && selR) {
      if (selL === selR) { setMatched([...matched, selL]); setSelL(null); setSelR(null); }
      else { setTimeout(() => { setSelL(null); setSelR(null); }, 300); }
    }
  }, [selL, selR]);
  useEffect(() => { if (matched.length === 4) setTimeout(() => onFinish(baseReward), 300); }, [matched]);
  const getColorCls = (c: string) => c==='red'?'bg-red-500':c==='blue'?'bg-blue-500':c==='green'?'bg-green-500':'bg-yellow-400';
  return (
    <div className="flex justify-between items-center mt-12 flex-1 w-full max-w-sm mx-auto">
      <div className="flex flex-col gap-6">
        {left.map(c => <button key={c} onClick={() => !matched.includes(c) && setSelL(c)} className={`w-16 h-16 rounded-full border-4 shadow-sm transition-all ${getColorCls(c)} ${selL===c?'scale-110 border-black':'border-transparent'} ${matched.includes(c)?'opacity-20':''}`} />)}
      </div>
      <div className="flex flex-col gap-6">
        {right.map(c => <button key={c} onClick={() => !matched.includes(c) && setSelR(c)} className={`w-16 h-16 rounded-full border-4 shadow-sm transition-all ${getColorCls(c)} ${selR===c?'scale-110 border-black':'border-transparent'} ${matched.includes(c)?'opacity-20':''}`} />)}
      </div>
    </div>
  );
}

function PelukisGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
  const targets = [{n:'Ungu', c:['merah','biru']}, {n:'Hijau', c:['kuning','biru']}, {n:'Jingga', c:['merah','kuning']}];
  const [t] = useState(targets[Math.floor(Math.random()*3)]);
  const [input, setInput] = useState<string[]>([]);
  const handleClick = (c: string) => {
    const next = [...input, c];
    setInput(next);
    if (next.length === 2) {
      if (next.includes(t.c[0]) && next.includes(t.c[1])) setTimeout(() => onFinish(baseReward), 300);
      else setTimeout(() => onFinish(0), 300);
    }
  };
  return (
    <div className="flex flex-col items-center mt-12 flex-1 w-full text-center">
      <h3 className="font-bold text-gray-500 mb-4 text-xl">Buat Warna Target:</h3>
      <div className="text-5xl font-black mb-12 uppercase tracking-widest">{t.n}</div>
      <div className="flex gap-6">
        {['merah','biru','kuning'].map(c => (
          <button key={c} onClick={() => handleClick(c)} disabled={input.includes(c)} className={`w-24 h-24 rounded-full shadow-lg border-4 border-white active:scale-90 ${c==='merah'?'bg-red-500':c==='biru'?'bg-blue-500':'bg-yellow-400'} ${input.includes(c)?'opacity-30':''}`} />
        ))}
      </div>
    </div>
  );
}

function TraderGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
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
    }, 30);
    return () => clearInterval(ref.current);
  }, [dir]);
  const handleClick = () => {
    clearInterval(ref.current);
    if (pos >= 40 && pos <= 60) onFinish(baseReward);
    else onFinish(0);
  };
  return (
    <div className="flex flex-col items-center justify-center mt-12 flex-1 w-full text-center">
      <h3 className="font-bold text-2xl mb-12 text-gray-600">Beli saat grafik di area hijau!</h3>
      <div className="w-full max-w-md h-12 bg-gray-200 rounded-full relative mb-12 overflow-hidden shadow-inner border-2 border-gray-300">
        <div className="absolute top-0 bottom-0 left-[40%] w-[20%] bg-green-400 opacity-50" />
        <div className="absolute top-0 bottom-0 w-2 bg-red-500 shadow-md" style={{left: `${pos}%`}} />
      </div>
      <button onClick={handleClick} className="px-12 py-6 bg-green-500 text-white font-black text-3xl rounded-[2rem] shadow-lg active:scale-95 hover:bg-green-600">BELI SEKARANG</button>
    </div>
  );
}

function MancingGame({ onFinish, baseReward }: { onFinish: (rv: number) => void, baseReward: number }) {
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
      if (reaction < 800) onFinish(baseReward);
      else onFinish(0);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center mt-12 flex-1 w-full text-center">
      <div className="text-[8rem] h-40 mb-12">{status === 'ready' ? '❗' : '🎣'}</div>
      <button onClick={handleClick} className="px-12 py-6 bg-blue-500 text-white font-black text-3xl rounded-[2rem] shadow-lg active:scale-95 hover:bg-blue-600">TARIK!</button>
    </div>
  );
}
