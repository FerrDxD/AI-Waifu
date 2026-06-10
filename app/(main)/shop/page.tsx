'use client';

import { useState, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Wallet, Heart, Gift, ShoppingBag, Sparkles, Shirt, Box, Home } from 'lucide-react';
import Link from 'next/link';

type CategoryId = 'gift' | 'outfit' | 'item' | 'furniture';

interface ShopItem {
  id: string;
  category: CategoryId;
  name: string;
  emoji: string;
  cost: number;
  affectionDelta: number;
  color: string;
  desc: string;
}

const CATEGORIES: { id: CategoryId; name: string; icon: React.ReactNode }[] = [
  { id: 'gift', name: 'Hadiah', icon: <Gift size={20} /> },
  { id: 'outfit', name: 'Pakaian', icon: <Shirt size={20} /> },
  { id: 'item', name: 'Barang', icon: <Box size={20} /> },
  { id: 'furniture', name: 'Perabotan', icon: <Home size={20} /> },
];

const ITEMS: ShopItem[] = [
  // Hadiah
  { id: 'candy', category: 'gift', name: 'Permen Manis', emoji: '🍬', cost: 150, affectionDelta: 1, color: 'from-pink-100 to-pink-200', desc: 'Permen murah tapi rasanya manis.' },
  { id: 'coffee', category: 'gift', name: 'Kopi Susu', emoji: '🧋', cost: 400, affectionDelta: 5, color: 'from-amber-100 to-amber-200', desc: 'Minuman kekinian kesukaan remaja.' },
  { id: 'novel', category: 'gift', name: 'Buku Novel', emoji: '📖', cost: 1200, affectionDelta: 7, color: 'from-blue-100 to-blue-200', desc: 'Novel romansa remaja.' },
  { id: 'bear', category: 'gift', name: 'Boneka Beruang', emoji: '🧸', cost: 2000, affectionDelta: 12, color: 'from-orange-100 to-orange-200', desc: 'Sangat empuk dan nyaman dipeluk.' },
  { id: 'necklace', category: 'gift', name: 'Kalung Cantik', emoji: '✨', cost: 5000, affectionDelta: 15, color: 'from-purple-100 to-purple-200', desc: 'Perhiasan mahal dan berkilau.' },
  
  // Pakaian
  { id: 'outfit_casual', category: 'outfit', name: 'Baju Santai', emoji: '👚', cost: 8000, affectionDelta: 5, color: 'from-teal-100 to-teal-200', desc: 'Pakaian ganti untuk bersantai di kamar.' },
  { id: 'outfit_maid', category: 'outfit', name: 'Baju Maid', emoji: '👗', cost: 15000, affectionDelta: 10, color: 'from-gray-100 to-gray-300', desc: 'Kostum pelayan klasik bergaya prancis.' },
  { id: 'outfit_school', category: 'outfit', name: 'Seragam SMA', emoji: '🎀', cost: 12000, affectionDelta: 8, color: 'from-blue-100 to-blue-300', desc: 'Seragam sekolah bergaya pelaut.' },
  { id: 'outfit_swimsuit', category: 'outfit', name: 'Baju Renang', emoji: '🩱', cost: 20000, affectionDelta: 15, color: 'from-cyan-100 to-cyan-300', desc: 'Satu set baju renang cantik.' },
  
  // Item
  { id: 'kacamata_hitam', category: 'item', name: 'Kacamata Hitam', emoji: '🕶️', cost: 9500, affectionDelta: 20, color: 'from-gray-700 to-gray-900', desc: 'Item wajib untuk jalan-jalan keluar.' },
  { id: 'tiket_konser', category: 'item', name: 'Tiket Konser', emoji: '🎫', cost: 25000, affectionDelta: 30, color: 'from-indigo-100 to-purple-300', desc: 'Tiket konser band favorit Livia.' },
  
  // Perabotan
  { id: 'furni_poster', category: 'furniture', name: 'Poster Anime', emoji: '🖼️', cost: 3000, affectionDelta: 2, color: 'from-indigo-100 to-indigo-200', desc: 'Hiasan dinding untuk mempercantik kamar.' },
  { id: 'furni_bed', category: 'furniture', name: 'Kasur Mewah', emoji: '🛏️', cost: 35000, affectionDelta: 15, color: 'from-rose-100 to-rose-200', desc: 'Tingkatkan kualitas tidur Livia.' },
  { id: 'furni_pc', category: 'furniture', name: 'PC Gaming', emoji: '💻', cost: 50000, affectionDelta: 25, color: 'from-cyan-100 to-cyan-300', desc: 'PC spesifikasi tinggi untuk main game.' },
];

export default function ShopPage() {
  const [money, setMoney] = useState(0);
  const [affection, setAffection] = useState(0);
  const [liviaExpression, setLiviaExpression] = useState<'normal' | 'happy' | 'angry' | 'blushing' | 'clingy'>('normal');
  const [message, setMessage] = useState('Kamu mau beli apa hari ini? T-tapi jangan beliin aku barang aneh-aneh ya!');
  const [isBuying, setIsBuying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('gift');
  const [inventory, setInventory] = useState<string[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/affection');
        if (res.ok) {
          const data = await res.json();
          setMoney(data.money || 0);
          setAffection(data.affection || 0);
          setInventory(data.itemsBrought || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProfile();
  }, []);

  const buyGift = async (item: ShopItem) => {
    if (money < item.cost) {
      setLiviaExpression('angry');
      setMessage(`Uangmu kurang! Jangan lihat-lihat doang kalau nggak sanggup beli ${item.name}!`);
      return;
    }

    if (inventory.includes(item.id) && item.category !== 'gift') {
      setLiviaExpression('angry');
      setMessage(`Kamu sudah punya ${item.name}! Beli yang lain sana.`);
      return;
    }

    setIsBuying(true);
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, cost: item.cost, affectionDelta: item.affectionDelta }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setMoney(data.newMoney);
        setAffection(data.newAffection);
        setInventory(prev => [...prev, item.id]);
        
        if (item.category === 'outfit') {
          setLiviaExpression('blushing');
          setMessage(`B-baju ini... kamu nyuruh aku pakai ini? T-tunggu sebentar, jangan ngintip!`);
        } else if (item.category === 'furniture') {
          setLiviaExpression('happy');
          setMessage(`Wah, kamar ini jadi lebih bagus karena ${item.name}. Makasih!`);
        } else if (item.id === 'kacamata_hitam') {
          setLiviaExpression('blushing');
          setMessage(`I-ini kacamata hitam?! Keren banget... Cocok buat jalan-jalan! Makasih ya!`);
        } else if (item.affectionDelta >= 12) {
          setLiviaExpression('blushing');
          setMessage(`B-buat aku?! Ini kan mahal banget... T-terima kasih, bodoh!`);
        } else if (item.affectionDelta >= 5) {
          setLiviaExpression('happy');
          setMessage(`Wah, ${item.name}! Kebetulan aku lagi pengen. Makasih ya!`);
        } else {
          setLiviaExpression('normal');
          setMessage(`Oh, ${item.name}. Lumayan. Makasih.`);
        }

      } else {
        setLiviaExpression('angry');
        setMessage('Gagal beli barangnya! Sistem error tuh.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBuying(false);
    }
  };

  const filteredItems = ITEMS.filter(i => i.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none z-0" />
      <div className="absolute -right-20 top-20 w-96 h-96 bg-pink-100 rounded-full blur-[100px] opacity-40 z-0 pointer-events-none" />
      <div className="absolute left-10 bottom-10 w-64 h-64 bg-amber-100 rounded-full blur-[80px] opacity-40 z-0 pointer-events-none" />

      {/* Top Bar (BA Header Layout, Teman Kos Colors) */}
      <div className="absolute top-0 left-0 w-full h-20 bg-white/80 backdrop-blur-md shadow-sm z-30 flex justify-between items-center px-6 border-b border-pink-50">
        <div className="flex items-center gap-6">
          <Link href="/home" className="flex items-center justify-center w-12 h-12 bg-pink-50 rounded-full text-pink-600 hover:bg-[#ff758c] hover:text-white transition-colors">
            <span className="text-xl font-black">←</span>
          </Link>
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-[#ff758c] w-8 h-8" />
            <h1 className="text-3xl font-display font-black text-[#5c4d47] italic tracking-tight uppercase">Toko Perbelanjaan</h1>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-pink-50 border border-pink-200 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-sm">
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
            <span className="font-bold text-[#5c4d47]">{affection}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-sm">
            <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-black">R</span>
            </div>
            <span className="font-mono font-black text-xl text-amber-700">{money}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto flex pt-24 px-6 z-10 relative h-screen">
        
        {/* Left Sidebar (Vertical Tabs BA Style) */}
        <div className="w-64 flex flex-col gap-3 py-6 relative z-20">
          <div className="text-xs font-bold text-gray-400 mb-2 pl-4 tracking-widest uppercase">Kategori</div>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`relative flex items-center gap-4 py-4 px-6 rounded-r-2xl transition-all duration-300 font-display font-black text-lg ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#ff758c] to-[#ffb199] text-white shadow-lg translate-x-4 border-l-[6px] border-pink-500' 
                    : 'bg-white/80 text-gray-500 hover:bg-white hover:translate-x-2 border border-transparent hover:border-pink-100'
                }`}
              >
                {cat.icon}
                <span className="tracking-wide uppercase italic">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Center: Items Grid */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar pb-32 z-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
            {filteredItems.map(item => {
              const owned = inventory.includes(item.id) && item.category !== 'gift';
              return (
                <div 
                  key={item.id}
                  className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 flex gap-5 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                >
                  {/* BA style accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#ff758c] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${item.category === 'item' && item.id.includes('kacamata') ? 'from-gray-700 to-gray-900 text-white' : item.color} flex items-center justify-center text-5xl shadow-inner group-hover:scale-105 transition-transform`}>
                    {item.emoji}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-black font-display text-[#5c4d47] text-xl mb-1">{item.name}</h3>
                      <p className="text-xs text-gray-500 font-medium leading-snug">{item.desc}</p>
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex flex-col">
                        {item.affectionDelta > 0 && (
                          <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Heart size={10} className="fill-pink-500" /> +{item.affectionDelta}
                          </span>
                        )}
                        <span className="font-mono font-black text-xl text-amber-600 flex items-center gap-1">
                          <span className="text-xs text-amber-500">Rv</span>{item.cost}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => buyGift(item)}
                        disabled={isBuying || money < item.cost || owned}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                          owned ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                          : money >= item.cost 
                            ? 'bg-[#ff758c] text-white hover:bg-pink-500 hover:-translate-y-1 active:scale-95'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {owned ? 'Dimiliki' : 'Beli'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Livia NPC Area */}
        <div className="hidden lg:flex w-[35%] flex-col items-center justify-end relative h-full pointer-events-none z-10">
          {/* Reaction Bubble (Teman Kos style transparent panel) */}
          <div className="absolute top-1/4 left-0 bg-white/90 backdrop-blur-xl rounded-[2rem] rounded-br-sm p-6 shadow-2xl border-l-4 border-[#ff758c] max-w-[350px] transform -translate-x-12 animate-[float_4s_ease-in-out_infinite] z-20">
            <p className="text-lg font-bold text-[#5c4d47] leading-relaxed">
              "{message}"
            </p>
          </div>

          <LiviaSprite 
            expression={liviaExpression} 
            className="h-[85vh] w-auto max-w-[600px] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(255,117,140,0.15)] z-10 pointer-events-auto"
          />
        </div>

      </div>
    </div>
  );
}
