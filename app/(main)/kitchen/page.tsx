'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Utensils, Heart, Wallet, ChefHat, Flame, BookOpen, BookX, X, 
  Soup, Coffee, Beef, Salad, Cake, Pizza, Fish, Egg, Droplets, 
  Sparkles, UtensilsCrossed, ArrowLeft, Check, Play, CheckCircle, Clock 
} from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { LiviaExpression } from '@/lib/gemini';
import { RECIPES } from '@/lib/livia/recipes';

// Helper component to render vector icons instead of emojis
function RecipeIcon({ id }: { id: string }) {
  const lower = id.toLowerCase();
  if (lower.includes('sup') || lower.includes('pho') || lower.includes('ramen') || lower.includes('hotpot') || lower.includes('jjigae') || lower.includes('tom_yum')) {
    return <Soup className="w-6 h-6 text-orange-500" />;
  }
  if (lower.includes('nasi') || lower.includes('rice') || lower.includes('bibimbap') || lower.includes('lu_rou')) {
    return <UtensilsCrossed className="w-6 h-6 text-amber-600" />;
  }
  if (lower.includes('sate') || lower.includes('rendang') || lower.includes('bbq') || lower.includes('char_siu') || lower.includes('duck') || lower.includes('chicken') || lower.includes('katsu') || lower.includes('beef')) {
    return <Beef className="w-6 h-6 text-red-500" />;
  }
  if (lower.includes('salad') || lower.includes('gado') || lower.includes('kimchi')) {
    return <Salad className="w-6 h-6 text-emerald-600" />;
  }
  if (lower.includes('pizza') || lower.includes('burger')) {
    return <Pizza className="w-6 h-6 text-amber-500" />;
  }
  if (lower.includes('cake') || lower.includes('takoyaki') || lower.includes('dimsum') || lower.includes('tteokbokki') || lower.includes('xiaolongbao')) {
    return <Cake className="w-6 h-6 text-pink-500" />;
  }
  if (lower.includes('tea') || lower.includes('coffee') || lower.includes('boba') || lower.includes('minum')) {
    return <Coffee className="w-6 h-6 text-amber-700" />;
  }
  if (lower.includes('fish') || lower.includes('sushi')) {
    return <Fish className="w-6 h-6 text-blue-500" />;
  }
  if (lower.includes('egg') || lower.includes('okonomiyaki') || lower.includes('pad_thai')) {
    return <Egg className="w-6 h-6 text-yellow-500" />;
  }
  return <Utensils className="w-6 h-6 text-orange-500" />;
}

export default function KitchenPage() {
  const [money, setMoney] = useState(0);
  const [affection, setAffection] = useState(0);
  const [activeOutfit, setActiveOutfit] = useState<string>('default');
  const [liviaExpression, setLiviaExpression] = useState<LiviaExpression>('normal');
  const [message, setMessage] = useState("Selamat datang di dapur kos! Klik buku resep di atas meja untuk memilih menu masakan.");
  const [isCooking, setIsCooking] = useState(false);
  const [showMinigame, setShowMinigame] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<{id: string, name: string, cost: number} | null>(null);
  const [hasRecipeBook, setHasRecipeBook] = useState(false);
  const [hasRecipeBookShop, setHasRecipeBookShop] = useState(false);
  const [isLiviaCooking, setIsLiviaCooking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // QoL Recipe Book State
  const [isBookOpen, setIsBookOpen] = useState(false);

  // Minigame states
  const [sliderPos, setSliderPos] = useState(0);
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
        setMessage("Buku resep mamaku! Pilih menunya di buku, nanti biar aku yang masakin buat kamu.");
      } else {
        setMessage("Kamu bawa buku resep dari toko! Yuk buka bukunya, pilih menu, lalu tunjukkan skill memasakmu di kompor!");
      }
    }
  }, [isLoading, hasRecipeBook, hasRecipeBookShop, isLiviaCooking]);

  // Minigame loop
  const sliderDirRef = useRef(1);
  const sliderPosRef = useRef(0);

  useEffect(() => {
    let animationFrameId: number;
    if (showMinigame && minigamePhase === 'playing') {
      sliderPosRef.current = 0;
      sliderDirRef.current = 1;

      const loop = () => {
        sliderPosRef.current += sliderDirRef.current * 2.5;
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
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [showMinigame, minigamePhase]);

  const handleCook = async (id: string, name: string, cost: number) => {
    if (money < cost) {
      setMessage("Uangmu tidak cukup untuk membeli bahan masakan ini!");
      setLiviaExpression('sad');
      return;
    }

    setCurrentRecipe({ id, name, cost });
    setIsBookOpen(false); // Close QoL recipe book when starting to cook

    if (isLiviaCooking) {
      processCooking(id, name, cost, false);
    } else {
      setMinigamePhase('playing');
      setShowMinigame(true);
      setLiviaExpression('surprised');
      setMessage(`Ayo potong bahan untuk ${name} dengan tepat waktu di garis hijau!`);
    }
  };

  const processCooking = async (id: string, name: string, cost: number, isMinigameFailed: boolean) => {
    setIsCooking(true);
    setLiviaExpression('surprised');
    setMessage(`Sedang memasak ${name} di atas wajan panas... Aromanya harum sekali!`);

    try {
      const res = await fetch('/api/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: id,
          isLiviaCooking: isLiviaCooking,
          isMinigameFailed: isMinigameFailed
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Gagal memasak.");
        setLiviaExpression('sad');
        setIsCooking(false);
        return;
      }

      setMoney(data.money);
      setAffection(data.affection);
      setLiviaExpression(data.expression || 'happy');
      setMessage(data.message);

    } catch (error) {
      console.error(error);
      setMessage("Terjadi kesalahan sistem di dapur.");
      setLiviaExpression('sad');
    } finally {
      setIsCooking(false);
    }
  };

  const handleMinigameAction = () => {
    if (minigamePhase !== 'playing' || !currentRecipe) return;

    setMinigamePhase('result');
    const isSuccess = sliderPosRef.current >= 40 && sliderPosRef.current <= 60;
    setMinigameResult(isSuccess);

    if (isSuccess) {
      setLiviaExpression('happy');
      setMessage("Potonganmu sangat sempurna dan rapi! Livia terkesan dengan ketelitianmu.");
    } else {
      setLiviaExpression('angry');
      setMessage("Yah, potongannya kurang rapi dan ada yang gosong sedikit! Livia menghela napas panjang.");
    }

    setTimeout(() => {
      setShowMinigame(false);
      if (currentRecipe) {
        processCooking(currentRecipe.id, currentRecipe.name, currentRecipe.cost, !isSuccess);
      }
    }, 1500);
  };

  if (isLoading) return <LoadingScreen text="Menyiapkan dapur kos..." />;

  if (!hasRecipeBook && !hasRecipeBookShop) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center shadow-inner border-2 border-amber-200">
          <BookX className="w-12 h-12 text-amber-600" />
        </div>
        <h1 className="text-2xl font-black text-[#5c4d47]">Dapur Terkunci</h1>
        <p className="text-gray-500 max-w-md">
          Kamu tidak membawa <b>"Buku Resep Masak"</b> saat baru pindah. Livia melarang keras kamu memakai dapurnya karena takut kebakaran!<br/><br/>
          <i>Silakan beli Buku Resep Masak di Toko terlebih dahulu.</i>
        </p>
        <div className="flex gap-4">
          <Link href="/home" className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-full font-bold shadow-sm hover:bg-gray-300 transition-colors">Ke Lobi</Link>
          <Link href="/shop" className="bg-[#ff758c] text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-pink-600 transition-colors flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Buka Toko
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Backsplash Wall Background */}
      <div className="absolute inset-0 bg-[#faf6f0] z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e8dfd8_1px,transparent_1px),linear-gradient(to_bottom,#e8dfd8_1px,transparent_1px)] bg-[size:32px_32px] opacity-70" />
      </div>

      {/* Top Bar Navigation */}
      <div className="absolute top-0 left-0 w-full h-16 md:h-20 bg-white/85 backdrop-blur-md shadow-sm z-40 flex justify-between items-center px-4 md:px-8 border-b border-orange-100">
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/home" className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-orange-50 rounded-2xl text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
              <ChefHat className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg md:text-2xl font-display font-black text-[#5c4d47] tracking-tight uppercase">Dapur Kos Livia</h1>
          </div>
        </div>
        
        <div className="flex gap-2 md:gap-4">
          <div className="bg-pink-50 border border-pink-200 px-3 md:px-5 py-1.5 md:py-2 rounded-2xl flex items-center gap-1.5 md:gap-2.5 shadow-sm">
            <Heart className="w-4 h-4 md:w-5 md:h-5 text-pink-500 fill-pink-500" />
            <span className="font-bold text-sm md:text-base text-[#5c4d47]">{affection}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 md:px-5 py-1.5 md:py-2 rounded-2xl flex items-center gap-1.5 md:gap-2.5 shadow-sm">
            <Wallet className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
            <span className="font-mono font-black text-sm md:text-lg text-amber-700">{money} Rv</span>
          </div>
        </div>
      </div>

      {/* Main Kitchen Environment */}
      <div className="flex-1 w-full mx-auto flex flex-col lg:flex-row pt-16 md:pt-20 relative overflow-hidden z-10">
        
        {/* LEFT SIDE: THE KITCHEN SET ("Kitchen Set Sungguhan") */}
        <div className="w-full lg:w-[60%] h-full flex flex-col justify-between p-4 md:p-8 relative z-20">
          
          {/* Upper Wall Utensil Rack & Range Hood */}
          <div className="flex items-start justify-between w-full pt-4 md:pt-6">
            {/* Hanging Utensils Bar */}
            <div className="bg-white/90 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-orange-100 shadow-md flex items-center gap-4 md:gap-6">
              <div className="w-2 h-10 bg-amber-700 rounded-full" />
              <div className="flex items-center gap-4 md:gap-6 text-orange-600">
                <div className="flex flex-col items-center gap-1 group">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shadow-inner group-hover:-translate-y-1 transition-transform">
                    <Utensils className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-[10px] font-bold text-[#8c7a70]">Spatula</span>
                </div>
                <div className="flex flex-col items-center gap-1 group">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shadow-inner group-hover:-translate-y-1 transition-transform">
                    <Soup className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-[10px] font-bold text-[#8c7a70]">Sendok Sup</span>
                </div>
                <div className="flex flex-col items-center gap-1 group">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shadow-inner group-hover:-translate-y-1 transition-transform">
                    <Flame className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-[10px] font-bold text-[#8c7a70]">Kompor</span>
                </div>
              </div>
            </div>

            {/* Stainless Steel Range Hood (Exhaust) */}
            <div className="hidden sm:flex flex-col items-center">
              <div className="w-24 h-12 bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-xl border border-gray-400 shadow-md flex items-center justify-center">
                <div className="w-16 h-1 bg-gray-500 rounded-full opacity-50" />
              </div>
              <div className="w-36 h-6 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 rounded-b-lg border-t border-gray-500 shadow-lg flex items-center justify-center">
                <span className="text-[9px] font-black tracking-widest text-gray-700">EXHAUST HOOD</span>
              </div>
            </div>
          </div>

          {/* Interactive Countertop Area */}
          <div className="w-full flex flex-col mt-auto">
            
            {/* Stove, Sink & Recipe Book Stand on Countertop */}
            <div className="flex items-end justify-between px-4 md:px-8 pb-2 relative z-10">
              
              {/* Kitchen Sink */}
              <div className="flex flex-col items-center">
                <Droplets className="w-6 h-6 text-blue-500 animate-bounce mb-1" />
                <div className="w-24 md:w-32 h-10 bg-gradient-to-b from-gray-200 to-gray-300 rounded-t-xl border-2 border-gray-400 shadow-inner flex items-center justify-center">
                  <div className="w-16 md:w-20 h-6 bg-blue-100/60 rounded-lg border border-gray-300 flex items-center justify-center text-[10px] font-bold text-blue-600">
                    Wastafel
                  </div>
                </div>
              </div>

              {/* Cooking Stove & Pot */}
              <div className="flex flex-col items-center">
                {isCooking ? (
                  <div className="relative flex flex-col items-center mb-1">
                    <Flame className="w-10 h-10 text-orange-500 animate-pulse" />
                    <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full shadow-md animate-bounce">
                      Memasak...
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-12 rounded-t-2xl bg-gradient-to-tr from-gray-700 to-gray-800 border-2 border-gray-600 shadow-lg flex items-center justify-center mb-1">
                    <Soup className="w-8 h-8 text-orange-300" />
                  </div>
                )}
                <div className="w-32 md:w-44 h-8 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded-t-xl border-t-4 border-orange-500 shadow-xl flex items-center justify-around px-4">
                  <div className={`w-5 h-5 rounded-full border-2 ${isCooking ? 'bg-orange-500 border-yellow-300 animate-ping' : 'bg-gray-700 border-gray-600'}`} />
                  <div className={`w-5 h-5 rounded-full border-2 ${isCooking ? 'bg-orange-500 border-yellow-300 animate-ping' : 'bg-gray-700 border-gray-600'}`} />
                </div>
              </div>

              {/* INTERACTIVE RECIPE BOOK QoL ("Buku Resep di Kitchen Set") */}
              <div 
                onClick={() => setIsBookOpen(true)}
                className="flex flex-col items-center cursor-pointer group pb-1"
              >
                <div className="relative transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-105">
                  {/* Glowing Indicator Badge */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#ff758c] text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>BUKA BUKU RESEP</span>
                  </div>
                  
                  {/* The Hardcover Book Stand */}
                  <div className="w-24 md:w-32 h-20 md:h-24 rounded-xl bg-gradient-to-br from-amber-700 via-orange-800 to-amber-900 border-4 border-amber-500 shadow-[0_15px_30px_rgba(180,83,9,0.3)] flex flex-col items-center justify-center p-2 relative overflow-hidden">
                    <div className="absolute inset-x-2 top-2 bottom-2 bg-[#fffef9] rounded-md shadow-inner flex flex-col items-center justify-center p-1.5 border border-amber-200">
                      <BookOpen className="w-6 h-6 text-amber-700 mb-0.5" />
                      <span className="text-[9px] font-black text-[#5c4d47] tracking-tighter text-center leading-tight">RESEP LIVIA</span>
                    </div>
                    {/* Golden Bookmark Ribbon */}
                    <div className="absolute top-0 right-4 w-2 h-8 bg-red-600 shadow-sm" />
                  </div>
                </div>
                <span className="text-[11px] font-extrabold text-amber-800 mt-1 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/60">
                  Meja Racik
                </span>
              </div>

            </div>

            {/* Solid Countertop Tabletop */}
            <div className="w-full h-8 md:h-10 bg-gradient-to-r from-[#d4b595] via-[#e6cfb3] to-[#d4b595] border-y-4 border-[#b59475] shadow-2xl relative z-20 flex items-center justify-between px-6">
              <div className="w-1/3 h-1 bg-[#b59475]/40 rounded-full" />
              <div className="w-1/3 h-1 bg-[#b59475]/40 rounded-full" />
            </div>

            {/* Wooden Base Cabinets */}
            <div className="w-full h-24 md:h-32 bg-[#c8a680] grid grid-cols-4 border-b-8 border-[#9e7d58] shadow-inner relative z-10">
              <div className="border-r-2 border-[#a8845e] flex items-center justify-center">
                <div className="w-2 h-10 bg-[#755b3e] rounded-full shadow-md" />
              </div>
              <div className="border-r-2 border-[#a8845e] flex items-center justify-center">
                <div className="w-2 h-10 bg-[#755b3e] rounded-full shadow-md" />
              </div>
              <div className="border-r-2 border-[#a8845e] flex items-center justify-center">
                <div className="w-2 h-10 bg-[#755b3e] rounded-full shadow-md" />
              </div>
              <div className="flex items-center justify-center">
                <div className="w-2 h-10 bg-[#755b3e] rounded-full shadow-md" />
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT SIDE: LIVIA CHARACTER STANDING IN THE KITCHEN */}
        <div className="w-full lg:w-[40%] flex flex-col items-center justify-end relative h-full pointer-events-none z-10 mt-4 lg:mt-0">
          <LiviaSprite 
            expression={liviaExpression} 
            outfit={activeOutfit}
            variant="shop"
            disableFloat={true}
            className="absolute inset-x-0 bottom-0 top-0 w-full h-full pointer-events-auto"
            imgClassName="object-contain object-bottom drop-shadow-[0_15px_35px_rgba(255,165,0,0.15)] transition-all duration-300 scale-[1.05] origin-bottom"
          />

          {/* Dialogue Bubble */}
          <div className="absolute bottom-6 md:bottom-12 bg-white/95 backdrop-blur-2xl px-6 py-4 md:px-8 md:py-5 rounded-2xl md:rounded-[2rem] md:rounded-bl-xl border-2 border-orange-100 shadow-xl max-w-[420px] w-[90%] z-20 pointer-events-auto transition-all duration-300">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Livia</span>
            </div>
            <p className={`font-display font-semibold md:font-bold text-xs md:text-base leading-snug transition-colors duration-300 ${liviaExpression === 'angry' ? 'text-red-500' : 'text-[#5c4d47]'}`}>
              "{message}"
            </p>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* QoL RECIPE BOOK MODAL ("Buku Resep Terbuka") */}
      {/* ======================================================== */}
      {isBookOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#fffef9] w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] border-4 border-[#d4b595] shadow-[0_25px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative">
            
            {/* Book Header */}
            <div className="bg-gradient-to-r from-amber-700 via-orange-800 to-amber-700 text-white p-6 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <BookOpen className="w-6 h-6 text-amber-200" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-black tracking-wide">Buku Resep Masak Livia</h2>
                  <p className="text-xs text-amber-200 font-medium">Pilih resep dan siapkan bahan untuk dimasak di Kitchen Set</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBookOpen(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cooking Mode Toggle (if has both books) */}
            {hasRecipeBook && hasRecipeBookShop && (
              <div className="px-6 pt-4 shrink-0">
                <div className="flex bg-amber-100/60 rounded-2xl p-1.5 border border-amber-200">
                  <button 
                    onClick={() => setIsLiviaCooking(true)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${isLiviaCooking ? 'bg-orange-500 text-white shadow-md scale-[1.01]' : 'text-amber-800 hover:bg-amber-200/50'}`}
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Livia yang Masak (Buku Ibu)</span>
                  </button>
                  <button 
                    onClick={() => setIsLiviaCooking(false)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${!isLiviaCooking ? 'bg-orange-500 text-white shadow-md scale-[1.01]' : 'text-amber-800 hover:bg-amber-200/50'}`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>Kamu yang Masak (Minigame)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Recipe List Container */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 hide-scrollbar">
              {RECIPES.map(recipe => {
                const canAfford = money >= recipe.cost;
                return (
                  <div 
                    key={recipe.id} 
                    className="bg-white rounded-2xl p-4 border-2 border-orange-100/80 shadow-sm hover:shadow-md hover:border-orange-300 transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Vector Icon Instead of Emoji */}
                      <div className="shrink-0 w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100 shadow-inner group-hover:scale-110 transition-transform">
                        <RecipeIcon id={recipe.id} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-[#5c4d47] text-sm md:text-base truncate">{recipe.name}</h3>
                        <p className="text-[11px] text-gray-500 font-medium line-clamp-1 mt-0.5">{recipe.desc}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono font-bold text-amber-700 text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            {recipe.cost} Rv
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCook(recipe.id, recipe.name, recipe.cost)}
                      disabled={isCooking || !canAfford}
                      className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                        isCooking || !canAfford
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                          : 'bg-gradient-to-r from-orange-400 to-amber-500 text-white hover:shadow-orange-400/40 hover:-translate-y-0.5 active:scale-95'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>{isLiviaCooking ? 'Pesan' : 'Masak'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Book Footer */}
            <div className="bg-[#f5efe6] p-4 px-6 border-t border-[#d4b595] flex items-center justify-between text-xs font-bold text-[#8c7a70] shrink-0">
              <span>Total Resep Tersedia: {RECIPES.length} Menu</span>
              <button 
                onClick={() => setIsBookOpen(false)}
                className="text-[#ff758c] hover:underline"
              >
                Tutup Buku Resep
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Cooking Minigame Modal */}
      {showMinigame && currentRecipe && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 md:p-8 flex flex-col gap-6 items-center text-center shadow-2xl relative overflow-hidden border-4 border-orange-200">
            <h2 className="text-2xl font-black font-display text-[#5c4d47]">Memasak {currentRecipe.name}</h2>
            <p className="text-gray-500 font-medium -mt-4">Klik tombol saat garisnya berada di area <span className="text-emerald-500 font-bold">HIJAU</span>!</p>

            {/* Slider Track */}
            <div className="w-full h-8 bg-gray-200 rounded-full relative overflow-hidden shadow-inner mt-4">
              <div className="absolute top-0 bottom-0 left-[40%] right-[40%] bg-emerald-400 opacity-50" />
              <div className="absolute top-0 bottom-0 left-[45%] right-[45%] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              
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
              <Flame /> POTONG BAHAN!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
