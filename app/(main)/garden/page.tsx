'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sprout, Droplet, Sun, PackageOpen, ChevronLeft, Wallet, Heart,
  CloudRain, Timer, ArrowRight, Pickaxe, X
} from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';

// Mock Data for Plants
type GrowthStage = 'seed' | 'sprout' | 'growing' | 'harvest';

interface PotData {
  id: string;
  plantId: string | null;
  stage: GrowthStage | null;
  hydration: number; // 0-100
  timeLeft: number; // minutes left to next stage
}
import { SEED_CATALOG } from '@/lib/livia/seeds';

export default function GardenPage() {
  const [money, setMoney] = useState(1500); // Mock
  const [affection, setAffection] = useState(50); // Mock
  const [isLoading, setIsLoading] = useState(false);
  const [liviaExpression, setLiviaExpression] = useState<LiviaExpression>('normal');
  const [message, setMessage] = useState("Balkonnya kosong nih. Kita tanam sesuatu yuk biar lebih asri!");

  const [pots, setPots] = useState<PotData[]>(
    Array.from({ length: 6 }).map((_, i) => ({
      id: `temp-${i}`,
      plantId: null,
      stage: null,
      hydration: 0,
      timeLeft: 0
    }))
  );

  const [selectedPot, setSelectedPot] = useState<string | null>(null);

  const loadGarden = async () => {
    try {
      const res = await fetch('/api/garden');
      const data = await res.json();
      if (data.pots) setPots(data.pots);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadGarden();
    const interval = setInterval(loadGarden, 60000); // Reload every minute to update timers
    
    fetch('/api/affection').then(res => res.json()).then(data => {
      if (data.money !== undefined) setMoney(data.money);
      if (data.affection !== undefined) setAffection(data.affection);
    }).catch(console.error);

    return () => clearInterval(interval);
  }, []);

  const getPlantInfo = (plantId: string | null) => {
    if (!plantId) return null;
    return SEED_CATALOG.find(p => p.id === plantId);
  };

  const handleWater = async (potId: string) => {
    // Optimistic UI
    setPots(prev => prev.map(pot => pot.id === potId ? { ...pot, hydration: 100 } : pot));
    setLiviaExpression('happy');
    setMessage("Terima kasih sudah disiram! Tanemannya pasti seneng deh.");
    
    await fetch('/api/garden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'water', potId })
    });
    loadGarden();
  };

  const handleHarvest = async (potId: string, plantId: string) => {
    const plant = getPlantInfo(plantId);
    
    // Optimistic UI
    setPots(prev => prev.map(pot => pot.id === potId ? { ...pot, plantId: null, stage: null, hydration: 0, timeLeft: 0 } : pot));
    setLiviaExpression('blushing');
    setMessage(`Wah! ${plant?.name} kita sudah panen! Bagus banget hasilnya.`);
    
    const res = await fetch('/api/garden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'harvest', potId })
    });
    
    if (res.ok) {
      // Reload money/affection
      fetch('/api/affection').then(r => r.json()).then(data => {
        if (data.money !== undefined) setMoney(data.money);
        if (data.affection !== undefined) setAffection(data.affection);
      });
    }
    loadGarden();
  };

  const handlePlant = async (potId: string, seedId: string, cost: number) => {
    if (money < cost) {
      setLiviaExpression('angry');
      setMessage("Uang kamu nggak cukup buat beli bibit itu!");
      return;
    }
    
    // Optimistic UI
    setMoney(prev => prev - cost);
    setPots(prev => prev.map(pot => {
      if (pot.id === potId) {
        return { ...pot, plantId: seedId, stage: 'seed', hydration: 100, timeLeft: SEED_CATALOG.find(s => s.id === seedId)!.growTimeMinutes };
      }
      return pot;
    }));
    setSelectedPot(null);
    setLiviaExpression('happy');
    setMessage("Bibit berhasil ditanam! Jangan lupa disiram tiap hari ya.");
    
    await fetch('/api/garden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'plant', potId, plantId: seedId })
    });
    loadGarden();
  };

  const renderPot = (pot: PotData) => {
    const plant = getPlantInfo(pot.plantId);
    const isEmpty = !pot.plantId;
    const isHarvest = pot.stage === 'harvest';
    const isThirsty = pot.hydration < 30 && !isEmpty && !isHarvest;

    return (
      <div 
        key={pot.id}
        onClick={() => setSelectedPot(pot.id)}
        className={`relative w-28 h-32 md:w-36 md:h-40 flex flex-col items-center justify-end cursor-pointer group transition-transform hover:scale-105 hover:-translate-y-2`}
      >
        {/* Plant Visual */}
        <div className="absolute bottom-12 w-full h-24 flex flex-col items-center justify-end z-10 pointer-events-none drop-shadow-md transition-transform group-hover:scale-110">
          {!isEmpty && plant && (
            <>
              {pot.stage === 'seed' && <div className="w-4 h-4 bg-amber-800 rounded-full mb-[-10px]" />}
              {pot.stage === 'sprout' && <Sprout className="w-8 h-8 text-green-500" />}
              {pot.stage === 'growing' && <div className="text-4xl">🌿</div>}
              {pot.stage === 'harvest' && <div className="text-5xl animate-bounce">{plant.icon}</div>}
            </>
          )}
        </div>

        {/* The Pot itself */}
        <div className={`w-20 h-16 md:w-24 md:h-20 rounded-b-2xl rounded-t-sm shadow-inner relative z-20 flex flex-col justify-start overflow-hidden border-t-8 border-[#8b5a2b] ${
          isEmpty ? 'bg-[#cd853f]' : 'bg-[#a0522d]'
        }`}>
          {/* Soil Layer */}
          <div className={`w-full h-2 ${isThirsty ? 'bg-[#5c3a21]' : 'bg-[#3b2210]'}`} />
        </div>

        {/* Status Indicators */}
        {!isEmpty && !isHarvest && (
          <div className="absolute -top-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-pink-100 shadow-sm flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
            {isThirsty ? (
              <Droplet className="w-3 h-3 text-red-500 animate-pulse" />
            ) : (
              <Droplet className="w-3 h-3 text-blue-400" />
            )}
            <span className="text-[10px] font-bold text-gray-600">{pot.hydration}%</span>
          </div>
        )}

        {/* Harvest Ready Indicator */}
        {isHarvest && (
          <div className="absolute -top-6 animate-bounce z-30">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg border border-green-200">
              PANEN!
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Balcony Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-[#fdfbf7]" />
        {/* Wooden Deck Floor */}
        <div className="absolute bottom-0 w-full h-[45%] bg-[#e5d3b3] shadow-inner" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.05) 40px, rgba(0,0,0,0.05) 42px)' }} />
        {/* Balcony Railing */}
        <div className="absolute bottom-[45%] w-full h-8 bg-white/50 backdrop-blur-sm border-y border-white flex justify-around px-10">
          {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="w-4 h-full bg-white/50" />)}
        </div>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full h-16 md:h-20 bg-white/80 backdrop-blur-md shadow-sm z-30 flex justify-between items-center px-4 md:px-6 border-b border-green-100">
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/home" className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-full text-green-600 hover:bg-green-500 hover:text-white transition-colors">
            <span className="text-lg md:text-xl font-black">←</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Sprout className="text-green-500 w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-lg md:text-3xl font-display font-black text-[#5c4d47] italic tracking-tight uppercase">Balkon Kos</h1>
          </div>
        </div>
        <div className="flex gap-2 md:gap-4">
          <div className="bg-pink-50 border border-pink-200 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full flex items-center gap-1.5 md:gap-3 shadow-sm">
            <Heart className="w-4 h-4 md:w-5 md:h-5 text-pink-500 fill-pink-500" />
            <span className="font-bold text-sm md:text-base text-[#5c4d47]">{affection}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full flex items-center gap-1.5 md:gap-3 shadow-sm">
            <Wallet className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
            <span className="font-mono font-black text-sm md:text-xl text-amber-700">{money} Rv</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto flex flex-col lg:flex-row pt-16 md:pt-20 px-4 md:px-6 z-10 relative overflow-hidden">
        
        {/* Left Side: Garden Area */}
        <div className="w-full lg:w-[60%] flex flex-col p-2 md:p-6 justify-center items-center z-20">
          
          {/* Plant Grid */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-12 md:gap-x-12 md:gap-y-16 mt-10 md:mt-0 p-8 rounded-3xl">
            {pots.map(renderPot)}
          </div>

        </div>

        {/* Right Side: Livia Character */}
        <div className="hidden lg:flex w-[40%] flex-col items-center justify-end relative h-full pointer-events-none z-10">
          <LiviaSprite 
            expression={liviaExpression} 
            outfit={'default'}
            variant="shop"
            disableFloat={true}
            className="absolute inset-x-0 bottom-0 top-0 w-full h-full pointer-events-auto"
            imgClassName="object-contain object-bottom drop-shadow-[0_15px_35px_rgba(34,197,94,0.15)] transition-all duration-300 scale-[1.06] origin-bottom"
          />

          <div className="absolute bottom-16 xl:bottom-24 bg-white/95 backdrop-blur-2xl px-6 py-5 md:px-8 md:py-6 rounded-2xl md:rounded-[2.5rem] md:rounded-bl-xl border md:border-2 border-green-100 shadow-xl max-w-[450px] w-[90%] z-20 pointer-events-auto transition-all duration-300">
            <p className={`font-display font-semibold md:font-bold text-sm md:text-xl leading-tight md:leading-snug transition-colors duration-300 ${liviaExpression === 'angry' ? 'text-red-500' : 'text-[#5c4d47]'}`}>
              "{message}"
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Message Bubble */}
      <div className="lg:hidden absolute bottom-6 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-md border-l-4 border-green-400 z-20">
        <p className="text-sm font-bold text-[#5c4d47] leading-relaxed">
          <span className="text-green-500 mr-2">Livia:</span>"{message}"
        </p>
      </div>

      {/* Action Modal */}
      {selectedPot !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-[slideUp_0.3s_ease-out]">
            
            <button 
              onClick={() => setSelectedPot(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
            >
              <X size={18} />
            </button>

            {(() => {
              const pot = pots.find(p => p.id === selectedPot)!;
              const plant = getPlantInfo(pot.plantId);

              // 1. Empty Pot -> Shop UI
              if (!pot.plantId) {
                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                        <PackageOpen size={24} />
                      </div>
                      <div>
                        <h3 className="font-display font-black text-xl text-[#5c4d47]">Pilih Bibit</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tanam di Pot #{pot.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {SEED_CATALOG.map(seed => (
                        <div key={seed.id} className="flex items-center justify-between bg-[#fdfbf7] p-3 rounded-2xl border border-orange-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-2xl shrink-0">
                              {seed.icon}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-[#5c4d47]">{seed.name}</span>
                              <span className="text-[10px] text-gray-500 font-medium"><Timer size={10} className="inline mr-1" />{Math.round(seed.growTimeMinutes / 60 * 10) / 10} Jam</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handlePlant(pot.id, seed.id, seed.cost)}
                            className="bg-amber-100 text-amber-700 px-3 py-2 rounded-xl font-bold text-xs hover:bg-amber-500 hover:text-white transition-colors border border-amber-200 shrink-0"
                          >
                            {seed.cost} Rv
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // 2. Harvest Time!
              if (pot.stage === 'harvest') {
                return (
                  <div className="flex flex-col items-center justify-center py-6 gap-4">
                    <div className="text-6xl animate-bounce">{plant?.icon}</div>
                    <div className="text-center">
                      <h3 className="font-display font-black text-2xl text-[#5c4d47]">{plant?.name} Siap Panen!</h3>
                      <p className="text-sm font-medium text-gray-500">Kumpulkan hasil kebunmu untuk dimasak atau dijual.</p>
                    </div>
                    <button 
                      onClick={() => { handleHarvest(pot.id, plant!.id); setSelectedPot(null); }}
                      className="w-full py-4 mt-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                    >
                      <Pickaxe size={20} /> Panen Sekarang!
                    </button>
                  </div>
                );
              }

              // 3. Plant Info / Watering UI
              return (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-green-50 text-green-600 border border-green-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                      {pot.stage === 'seed' ? '🌰' : pot.stage === 'sprout' ? '🌱' : '🌿'}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl text-[#5c4d47]">{plant?.name}</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fase: {pot.stage}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center justify-center gap-2">
                      <Droplet className={`w-6 h-6 ${pot.hydration < 30 ? 'text-red-500' : 'text-blue-500'}`} />
                      <span className="font-bold text-sm text-[#5c4d47]">Air: {pot.hydration}%</span>
                    </div>
                    <div className="flex-1 bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center justify-center gap-2">
                      <Timer className="w-6 h-6 text-amber-500" />
                      <span className="font-bold text-sm text-[#5c4d47]">Sisa Waktu</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => { handleWater(pot.id); setSelectedPot(null); }}
                    disabled={pot.hydration >= 100}
                    className={`w-full py-4 font-black text-lg rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 ${
                      pot.hydration >= 100 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-400 to-sky-500 text-white hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-1'
                    }`}
                  >
                    <CloudRain size={20} /> Siram Air
                  </button>
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
}
