'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Utensils, Heart, Wallet, ChefHat, Flame } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { LiviaExpression } from '@/lib/gemini';

import { RECIPES } from '@/lib/livia/recipes';

export default function KitchenPage() {
  const [money, setMoney] = useState(0);
  const [affection, setAffection] = useState(0);
  const [activeOutfit, setActiveOutfit] = useState<string>('default');
  const [liviaExpression, setLiviaExpression] = useState<LiviaExpression>('normal');
  const [message, setMessage] = useState("Kamu ngajakin aku ke dapur... mau masakin aku sesuatu ya?");
  const [isCooking, setIsCooking] = useState(false);
  const [showMinigame, setShowMinigame] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<{id: string, name: string, cost: number} | null>(null);
  const [hasRecipeBook, setHasRecipeBook] = useState(false);
  const [hasRecipeBookShop, setHasRecipeBookShop] = useState(false);
  const [isLiviaCooking, setIsLiviaCooking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Minigame states
  const [sliderPos, setSliderPos] = useState(0);
  const [sliderDir, setSliderDir] = useState(1);
  const [minigamePhase, setMinigamePhase] = useState<'playing' | 'result'>('playing');
  const [minigameResult, setMinigameResult] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [affRes, outfitRes] = await Promise.all([
          fetch('/api/affection'),
          fetch('/api/outfit')
        ]);
        
        if (affRes.ok) {
          const data = await affRes.json();
          setMoney(data.money || 0);
          setAffection(data.affection || 0);
          
          if (data.itemsBrought) {
            const hasHome = data.itemsBrought.includes('recipe_book');
            const hasShop = data.itemsBrought.includes('recipe_book_shop');
            setHasRecipeBook(hasHome);
            setHasRecipeBookShop(hasShop);
            
            // Set default cooking mode
            if (hasShop) setIsLiviaCooking(false);
            else if (hasHome) setIsLiviaCooking(true);
          }
        }
        
        if (outfitRes.ok) {
          const outfitData = await outfitRes.json();
          setActiveOutfit(outfitData.activeOutfit || 'default');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading && (hasRecipeBook || hasRecipeBookShop)) {
      if (isLiviaCooking) {
        setMessage("Berhubung kamu bawa buku resep mamaku, aku mau masakin kamu sesuatu. Kamu mau pesen apa?");
      } else {
        setMessage("Berhubung kamu beli buku resep masak di toko, berarti kamu yang masak dong! Ayo tunjukin kemampuanmu.");
      }
    }
  }, [isLoading, hasRecipeBook, hasRecipeBookShop, isLiviaCooking]);

  // Minigame loop
  const sliderDirRef = useRef(1);
  const sliderPosRef = useRef(0);

  useEffect(() => {
    let animationFrameId: number;
    if (showMinigame && minigamePhase === 'playing') {
      // Reset ref state when starting minigame
      sliderPosRef.current = 0;
      sliderDirRef.current = 1;

      const loop = () => {
        sliderPosRef.current += sliderDirRef.current * 2.5; // speed
        if (sliderPosRef.current >= 100) {
          sliderPosRef.current = 100;
          sliderDirRef.current = -1;
        } else if (sliderPosRef.current <= 0) {
          sliderPosRef.current = 0;
          sliderDirRef.current = 1;
        }
        setSliderPos(sliderPosRef.current);
        animationFrameId = requestAnimationFrame(loop);
      };
      animationFrameId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [showMinigame, minigamePhase]);

  const processCooking = async (recipeId: string, recipeName: string, cost: number, isFailed: boolean) => {
    try {
      const res = await fetch('/api/kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, isFailed }),
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        setMoney(data.newMoney);
        setAffection(data.newAffection);
        
        if (data.isFailed) {
          setLiviaExpression('angry');
          setMessage(`Bweeek! Nggak enak! Kamu masukin apa ke ${recipeName} ini?! Huwaa... uang buat belinya jadi sia-sia!`);
        } else {
          setLiviaExpression(isLiviaCooking ? 'happy' : 'blushing');
          if (recipeId === 'steak') {
            setMessage(isLiviaCooking ? `Ini dia steak spesial buat kamu! Dihabisin ya, aku masaknya pakai cinta loh...` : `I-ini enak banget! Kamu belajar masak dari mana? Aku jadi pengen dimasakin tiap hari...`);
          } else if (recipeId === 'sup_ayam') {
            setMessage(isLiviaCooking ? `Sup ayam hangat buat kamu. Semoga capekmu hilang ya.` : `Sruput... ahh, badanku jadi hangat. Makasih ya sup ayamnya.`);
          } else {
            setMessage(isLiviaCooking ? `Sudah matang! Ayo makan bareng. Gimana rasanya? Enak kan?` : `Nyam nyam... lumayan juga masakanmu. Besok masak lagi ya!`);
          }
        }
      } else {
        setLiviaExpression('angry');
        setMessage(data.error || 'Gagal memasak! Ada panci yang meledak.');
      }
    } catch (e) {
      console.error(e);
      setLiviaExpression('angry');
      setMessage(isLiviaCooking ? 'Aduh! Masakanku gosong... maaf ya.' : 'Apinya kegedean! Gagal masak deh.');
    } finally {
      setIsCooking(false);
      setShowMinigame(false);
      setCurrentRecipe(null);
    }
  };

  const handleCook = async (recipeId: string, recipeName: string, cost: number) => {
    if (money < cost) {
      setLiviaExpression('angry');
      setMessage(`Uangmu kurang buat beli bahan ${recipeName}! Gimana mau masak?`);
      return;
    }

    if (!isLiviaCooking) {
      // Initialize Minigame
      setCurrentRecipe({ id: recipeId, name: recipeName, cost });
      setSliderPos(0);
      setSliderDir(1);
      setMinigamePhase('playing');
      setShowMinigame(true);
      setLiviaExpression('normal');
      setMessage(`Kamu lagi masak ${recipeName}... klik 'Potong!' saat garisnya ada di zona hijau!`);
      return;
    }

    // Livia is cooking (no minigame)
    setIsCooking(true);
    setLiviaExpression('happy');
    setMessage(`Oke, aku masakin ${recipeName} ya! Tunggu sebentar, jangan ngintip!`);
    
    // Simulate cooking time
    await new Promise(resolve => setTimeout(resolve, 2000));
    await processCooking(recipeId, recipeName, cost, false);
  };

  const handleMinigameAction = () => {
    if (minigamePhase !== 'playing') return;
    
    // Target zone is between 40 and 60
    const currentPos = sliderPosRef.current;
    const isSuccess = currentPos >= 40 && currentPos <= 60;
    setMinigameResult(isSuccess);
    setMinigamePhase('result');
    setIsCooking(true);

    if (isSuccess) {
      setLiviaExpression('happy');
      setMessage("Wah, potongannya rapi banget! Kelihatannya bakal enak nih...");
    } else {
      setLiviaExpression('angry');
      setMessage("Awas tanganmu! Eh, kok bentuk potongannya hancur gitu sih...");
    }

    // Finish process after a short delay
    setTimeout(() => {
      if (currentRecipe) {
        processCooking(currentRecipe.id, currentRecipe.name, currentRecipe.cost, !isSuccess);
      }
    }, 1500);
  };

  if (isLoading) return <LoadingScreen text="Memanaskan wajan..." />;

  if (!hasRecipeBook && !hasRecipeBookShop) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-4xl shadow-inner">📚</div>
        <h1 className="text-2xl font-black text-[#5c4d47]">Dapur Terkunci</h1>
        <p className="text-gray-500 max-w-md">Kamu tidak membawa <b>"Buku Resep Masak"</b> saat baru pindah. Livia melarang keras kamu memakai dapurnya karena takut kebakaran!<br/><br/><i>Silakan beli Buku Resep Masak di Toko (Shop) terlebih dahulu.</i></p>
        <div className="flex gap-4">
          <Link href="/home" className="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold shadow-sm hover:bg-gray-300 transition-colors">Ke Lobi</Link>
          <Link href="/shop" className="bg-pink-500 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-pink-600 transition-colors">Buka Toko</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Background */}
      <div className="absolute inset-0 bg-orange-50/30 transition-all duration-1000 z-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/5 pointer-events-none z-0" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full h-16 md:h-20 bg-white/80 backdrop-blur-md shadow-sm z-30 flex justify-between items-center px-4 md:px-6 border-b border-orange-100">
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/home" className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-orange-50 rounded-full text-orange-600 hover:bg-orange-500 hover:text-white transition-colors">
            <span className="text-lg md:text-xl font-black">←</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <ChefHat className="text-orange-500 w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-lg md:text-3xl font-display font-black text-[#5c4d47] italic tracking-tight uppercase">Dapur</h1>
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

      <div className="flex-1 w-full mx-auto flex flex-col lg:flex-row pt-16 md:pt-24 px-4 md:px-6 z-10 relative overflow-hidden">
        
        {/* Left Side: Recipe Book */}
        <div className="w-full lg:w-[50%] flex flex-col p-2 md:p-6 overflow-y-auto hide-scrollbar z-20 gap-4">
          
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-2">
            <h2 className="text-xl md:text-2xl font-black text-[#5c4d47] font-display flex items-center gap-2">
              <Utensils className="text-orange-400" /> Buku Resep Livia
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              {isLiviaCooking 
                ? "Livia yang akan masak untukmu! Siapkan bahan-bahannya." 
                : "Beli bahan dan tunjukkan kemampuan masakmu. Livia adalah juri yang sangat ketat soal makanan!"}
            </p>

            {/* Toggle if user has BOTH books */}
            {hasRecipeBook && hasRecipeBookShop && (
              <div className="flex bg-orange-50 rounded-xl p-1 mt-3 border border-orange-100">
                <button 
                  onClick={() => setIsLiviaCooking(true)}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors ${isLiviaCooking ? 'bg-orange-400 text-white shadow-md' : 'text-orange-600 hover:bg-orange-100'}`}
                >
                  Livia yang Masak
                </button>
                <button 
                  onClick={() => setIsLiviaCooking(false)}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors ${!isLiviaCooking ? 'bg-orange-400 text-white shadow-md' : 'text-orange-600 hover:bg-orange-100'}`}
                >
                  Kamu yang Masak
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {RECIPES.map(recipe => (
              <div key={recipe.id} className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] p-4 shadow-sm border border-white/60 flex items-center justify-between hover:shadow-md hover:-translate-y-1 transition-all group">
                <div className="flex items-center gap-4 w-full">
                  <div className="shrink-0 w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                    {recipe.emoji}
                  </div>
                  <div className="flex flex-col gap-0.5 w-full">
                    <h3 className="font-black text-[#5c4d47] text-base md:text-lg leading-tight">{recipe.name}</h3>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium leading-snug">{recipe.desc}</p>
                    <span className="font-mono font-bold text-amber-600 text-xs md:text-sm mt-0.5">{recipe.cost} Rv</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleCook(recipe.id, recipe.name, recipe.cost)}
                  disabled={isCooking || money < recipe.cost}
                  className={`shrink-0 ml-4 px-4 py-3 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all shadow-md ${
                    isCooking || money < recipe.cost
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-orange-400 to-amber-500 text-white hover:shadow-orange-300/50 hover:shadow-lg hover:-translate-y-0.5 active:scale-95'
                  }`}
                >
                  {isCooking ? 'Memasak...' : <><Flame size={16} /> {isLiviaCooking ? 'Minta Masak' : 'Masak'}</>}
                </button>
              </div>
            ))}
          </div>

          {/* Mobile Message Bubble */}
          <div className="lg:hidden w-full mt-4 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-md border-l-4 border-orange-400 z-20">
            <p className="text-sm font-bold text-[#5c4d47] leading-relaxed">
              <span className="text-orange-500 mr-2">Livia:</span>"{message}"
            </p>
          </div>
        </div>

        {/* Right Side: Livia Character */}
        <div className="hidden lg:flex w-[50%] flex-col items-center justify-end relative h-full pointer-events-none z-10">
          <LiviaSprite 
            expression={liviaExpression} 
            outfit={activeOutfit}
            variant="shop"
            disableFloat={true}
            className="absolute inset-x-0 bottom-0 top-0 w-full h-full pointer-events-auto"
            imgClassName="object-contain object-bottom drop-shadow-[0_15px_35px_rgba(255,165,0,0.15)] transition-all duration-300 scale-[1.06] origin-bottom"
          />

          <div className="absolute bottom-16 xl:bottom-24 bg-white/95 backdrop-blur-2xl px-6 py-5 md:px-8 md:py-6 rounded-2xl md:rounded-[2.5rem] md:rounded-bl-xl border md:border-2 border-orange-100 shadow-xl max-w-[450px] w-[90%] z-20 pointer-events-auto transition-all duration-300">
            <p className={`font-display font-semibold md:font-bold text-sm md:text-xl leading-tight md:leading-snug transition-colors duration-300 ${liviaExpression === 'angry' ? 'text-red-500' : 'text-[#5c4d47]'}`}>
              "{message}"
            </p>
          </div>
        </div>

      </div>

      {/* Cooking Minigame Modal */}
      {showMinigame && currentRecipe && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 md:p-8 flex flex-col gap-6 items-center text-center shadow-2xl relative overflow-hidden border-4 border-orange-200">
            <h2 className="text-2xl font-black font-display text-[#5c4d47]">Memasak {currentRecipe.name}</h2>
            <p className="text-gray-500 font-medium -mt-4">Klik tombol saat garisnya berada di area <span className="text-emerald-500 font-bold">HIJAU</span>!</p>

            {/* Slider Track */}
            <div className="w-full h-8 bg-gray-200 rounded-full relative overflow-hidden shadow-inner mt-4">
              {/* Target Zone (40% to 60%) */}
              <div className="absolute top-0 bottom-0 left-[40%] right-[40%] bg-emerald-400 opacity-50" />
              <div className="absolute top-0 bottom-0 left-[45%] right-[45%] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              
              {/* Slider Marker */}
              <div 
                className="absolute top-0 bottom-0 w-2 bg-[#5c4d47] shadow-md transition-none"
                style={{ left: `calc(${sliderPos}% - 4px)` }}
              />
            </div>

            {minigamePhase === 'result' && (
              <div className={`text-2xl font-black animate-bounce ${minigameResult ? 'text-emerald-500' : 'text-red-500'}`}>
                {minigameResult ? 'SEMPURNA!' : 'GAGAL!'}
              </div>
            )}

            <button
              onClick={handleMinigameAction}
              disabled={minigamePhase === 'result'}
              className={`w-full py-4 text-white font-black text-xl rounded-2xl shadow-xl transition-transform active:scale-95 flex justify-center items-center gap-2 ${
                minigamePhase === 'result' ? 'bg-gray-400' : 'bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600'
              }`}
            >
              <Flame /> POTONG!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
