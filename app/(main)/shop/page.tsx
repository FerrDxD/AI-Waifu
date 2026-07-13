'use client';

import { useState, useEffect, useRef } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { 
  Wallet, Heart, Gift, ShoppingBag, Shirt, Box, Home, Utensils, Coffee,
  BookOpen, Sparkles, Crown, Flame, Droplet, Glasses, Ticket, FileText, Building, Image as ImageIcon, Bed, Monitor
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { EN_SHOP_ITEMS, EN_LIVIA_DIALOGUES } from '@/lib/i18n/content';

type CategoryId = 'gift' | 'outfit' | 'item' | 'furniture' | 'food' | 'drink';

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

const isConsumableItem = (item: { id: string; category: CategoryId }) => {
  if (item.id === 'cincin_nikah' || item.id === 'katering') return false;
  return item.category === 'gift' || item.category === 'food' || item.category === 'drink';
};

const CATEGORIES: { id: CategoryId; name: string; icon: React.ReactNode }[] = [
  { id: 'gift', name: 'Hadiah', icon: <Gift size={20} /> },
  { id: 'food', name: 'Makanan', icon: <Utensils size={20} /> },
  { id: 'drink', name: 'Minuman', icon: <Coffee size={20} /> },
  { id: 'outfit', name: 'Pakaian', icon: <Shirt size={20} /> },
  { id: 'item', name: 'Barang', icon: <Box size={20} /> },
  { id: 'furniture', name: 'Perabotan', icon: <Home size={20} /> },
];

const ITEMS: ShopItem[] = [
  // Hadiah
  { id: 'candy', category: 'gift', name: 'Permen Manis', emoji: 'candy', cost: 150, affectionDelta: 1, color: 'from-pink-100 to-pink-200', desc: 'Permen murah tapi rasanya manis.' },
  { id: 'coffee', category: 'gift', name: 'Kopi Susu', emoji: 'coffee', cost: 400, affectionDelta: 5, color: 'from-amber-100 to-amber-200', desc: 'Minuman kekinian kesukaan remaja.' },
  { id: 'novel', category: 'gift', name: 'Buku Novel', emoji: 'book', cost: 1200, affectionDelta: 7, color: 'from-blue-100 to-blue-200', desc: 'Novel romansa remaja.' },
  { id: 'bear', category: 'gift', name: 'Boneka Beruang', emoji: 'heart', cost: 2000, affectionDelta: 12, color: 'from-orange-100 to-orange-200', desc: 'Sangat empuk dan nyaman dipeluk.' },
  { id: 'necklace', category: 'gift', name: 'Kalung Cantik', emoji: 'sparkles', cost: 5000, affectionDelta: 15, color: 'from-purple-100 to-purple-200', desc: 'Perhiasan mahal dan berkilau.' },
  { id: 'cincin_nikah', category: 'gift', name: 'Cincin Nikah', emoji: 'crown', cost: 30000, affectionDelta: 200, color: 'from-blue-200 to-blue-400', desc: 'Sebuah janji seumur hidup.' },
  
  // Makanan
  { id: 'onigiri', category: 'food', name: 'Onigiri', emoji: 'food', cost: 50, affectionDelta: 0, color: 'from-gray-100 to-gray-200', desc: 'Nasi kepal penghilang lapar (+Lapar, +Energi).' },
  { id: 'yakitori', category: 'food', name: 'Yakitori', emoji: 'flame', cost: 150, affectionDelta: 0, color: 'from-orange-100 to-orange-200', desc: 'Sate ayam khas Jepang (+Lapar, +Energi).' },
  { id: 'takoyaki', category: 'food', name: 'Takoyaki', emoji: 'flame', cost: 200, affectionDelta: 0, color: 'from-amber-100 to-amber-200', desc: 'Bola gurita panas (+Lapar, +Energi).' },
  { id: 'dango', category: 'food', name: 'Dango', emoji: 'food', cost: 120, affectionDelta: 0, color: 'from-pink-100 to-pink-200', desc: 'Kue beras manis (+Lapar, +Energi).' },
  { id: 'katsudon', category: 'food', name: 'Katsudon', emoji: 'food', cost: 400, affectionDelta: 0, color: 'from-yellow-100 to-yellow-200', desc: 'Porsi besar (+Lapar Banyak, +Energi).' },
  { id: 'sushi', category: 'food', name: 'Sushi', emoji: 'food', cost: 800, affectionDelta: 0, color: 'from-red-100 to-red-200', desc: 'Premium & lezat (+Lapar, +Energi).' },
  { id: 'katering', category: 'food', name: 'Katering Pernikahan', emoji: 'food', cost: 15000, affectionDelta: 0, color: 'from-orange-200 to-orange-400', desc: 'Pesanan katering untuk resepsi.' },

  // Minuman
  { id: 'air_putih', category: 'drink', name: 'Air Putih', emoji: 'drop', cost: 20, affectionDelta: 0, color: 'from-blue-50 to-blue-100', desc: 'Air mineral biasa (+Hidrasi).' },
  { id: 'teh_hijau', category: 'drink', name: 'Teh Hijau', emoji: 'coffee', cost: 80, affectionDelta: 0, color: 'from-green-100 to-green-200', desc: 'Menenangkan (+Hidrasi, +Energi).' },
  { id: 'teh_hitam', category: 'drink', name: 'Teh Hitam', emoji: 'coffee', cost: 100, affectionDelta: 0, color: 'from-orange-100 to-orange-200', desc: 'Teh pekat (+Hidrasi, +Energi).' },
  { id: 'kopi_hitam', category: 'drink', name: 'Kopi Hitam', emoji: 'coffee', cost: 150, affectionDelta: 0, color: 'from-stone-700 to-stone-900', desc: 'Penambah energi (+Hidrasi, +Energi).' },
  { id: 'jus_buah', category: 'drink', name: 'Jus Buah', emoji: 'drop', cost: 200, affectionDelta: 0, color: 'from-yellow-100 to-orange-200', desc: 'Kaya vitamin (+Hidrasi, +Energi).' },
  { id: 'susu', category: 'drink', name: 'Susu', emoji: 'drop', cost: 150, affectionDelta: 0, color: 'from-gray-50 to-gray-200', desc: 'Susu sapi murni (+Hidrasi, +Lapar).' },

  // Pakaian
  { id: 'outfit_casual', category: 'outfit', name: 'Baju Santai', emoji: 'shirt', cost: 8000, affectionDelta: 5, color: 'from-teal-100 to-teal-200', desc: 'Pakaian ganti untuk bersantai di kamar.' },
  { id: 'trench_coat', category: 'outfit', name: 'Trench Coat', emoji: 'shirt', cost: 15000, affectionDelta: 10, color: 'from-amber-200 to-amber-400', desc: 'Sempurna untuk musim dingin atau pulang kampung.' },
  { id: 'outfit_school', category: 'outfit', name: 'Seragam SMA', emoji: 'shirt', cost: 12000, affectionDelta: 8, color: 'from-blue-100 to-blue-300', desc: 'Seragam sekolah bergaya pelaut.' },
  { id: 'outfit_yukata', category: 'outfit', name: 'Yukata Festival', emoji: 'shirt', cost: 25000, affectionDelta: 20, color: 'from-rose-100 to-rose-300', desc: 'Pakaian tradisional untuk pergi ke festival.' },
  { id: 'gaun_pengantin', category: 'outfit', name: 'Gaun Pengantin', emoji: 'shirt', cost: 50000, affectionDelta: 500, color: 'from-white to-pink-100', desc: 'Gaun putih suci untuk hari paling istimewa.' },
  { id: 'piyama', category: 'outfit', name: 'Piyama', emoji: 'shirt', cost: 10000, affectionDelta: 12, color: 'from-indigo-100 to-purple-200', desc: 'Baju tidur yang sangat nyaman.' },
  { id: 'office_lady', category: 'outfit', name: 'Office Lady', emoji: 'shirt', cost: 30000, affectionDelta: 30, color: 'from-slate-200 to-gray-400', desc: 'Kemeja kerja elegan lengkap dengan kacamata.' },
  
  // Item
  { id: 'recipe_book_shop', category: 'item', name: 'Buku Resep Masak', emoji: 'book', cost: 1500, affectionDelta: 15, color: 'from-orange-100 to-amber-200', desc: 'Panduan masakan lezat. Wajib dibeli untuk membuka Dapur!' },
  { id: 'kacamata_hitam', category: 'item', name: 'Kacamata Hitam', emoji: 'glasses', cost: 9500, affectionDelta: 20, color: 'from-gray-700 to-gray-900', desc: 'Item wajib untuk jalan-jalan keluar.' },
  { id: 'tiket_konser', category: 'item', name: 'Tiket Konser', emoji: 'ticket', cost: 25000, affectionDelta: 30, color: 'from-indigo-100 to-purple-300', desc: 'Tiket konser band favorit Livia.' },
  { id: 'berkas_kua', category: 'item', name: 'Berkas KUA', emoji: 'file', cost: 2000, affectionDelta: 50, color: 'from-green-100 to-green-300', desc: 'Persiapan administrasi pernikahan.' },
  { id: 'gedung_resepsi', category: 'item', name: 'Sewa Gedung', emoji: 'building', cost: 50000, affectionDelta: 100, color: 'from-purple-200 to-purple-400', desc: 'Booking gedung impian Livia.' },
  
  // Perabotan
  { id: 'furni_poster', category: 'furniture', name: 'Poster Anime', emoji: 'image', cost: 3000, affectionDelta: 2, color: 'from-indigo-100 to-indigo-200', desc: 'Hiasan dinding untuk mempercantik kamar.' },
  { id: 'furni_bed', category: 'furniture', name: 'Kasur Mewah', emoji: 'bed', cost: 35000, affectionDelta: 15, color: 'from-rose-100 to-rose-200', desc: 'Tingkatkan kualitas tidur Livia.' },
  { id: 'furni_pc', category: 'furniture', name: 'PC Gaming', emoji: 'monitor', cost: 50000, affectionDelta: 25, color: 'from-cyan-100 to-cyan-300', desc: 'PC spesifikasi tinggi untuk main game.' },
];

const renderCreativeSVG = (iconId: string) => {
  const props = { size: 36, strokeWidth: 1.5, className: "text-white drop-shadow-md z-10" };
  switch(iconId) {
    case 'candy': return <Gift {...props} />;
    case 'coffee': return <Coffee {...props} />;
    case 'book': return <BookOpen {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'sparkles': return <Sparkles {...props} />;
    case 'crown': return <Crown {...props} />;
    case 'food': return <Utensils {...props} />;
    case 'flame': return <Flame {...props} />;
    case 'drop': return <Droplet {...props} />;
    case 'shirt': return <Shirt {...props} />;
    case 'glasses': return <Glasses {...props} />;
    case 'ticket': return <Ticket {...props} />;
    case 'file': return <FileText {...props} />;
    case 'building': return <Building {...props} />;
    case 'image': return <ImageIcon {...props} />;
    case 'bed': return <Bed {...props} />;
    case 'monitor': return <Monitor {...props} />;
    default: return <Box {...props} />;
  }
};

export default function ShopPage() {
  const { dict, language } = useLanguage();
  const [money, setMoney] = useState(0);
  const [affection, setAffection] = useState(0);
  const [activeOutfit, setActiveOutfit] = useState<string>('default');
  const [liviaExpression, setLiviaExpression] = useState<'normal' | 'happy' | 'angry' | 'blushing' | 'clingy'>('normal');
  const [message, setMessage] = useState('Kamu mau beli apa hari ini? T-tapi jangan beliin aku barang aneh-aneh ya!');
  const [isBuying, setIsBuying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('gift');
  const [inventory, setInventory] = useState<string[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [affRes, outfitRes] = await Promise.all([
          fetch('/api/affection'),
          fetch('/api/outfit')
        ]);
        
        if (affRes.ok) {
          const data = await affRes.json();
          setMoney(data.money || 0);
          setAffection(data.affection || 0);
          setInventory(data.itemsBrought || []);
        }
        
        if (outfitRes.ok) {
          const outfitData = await outfitRes.json();
          setActiveOutfit(outfitData.activeOutfit || 'default');
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProfile();
  }, []);

  const handleCategoryChange = (cat: CategoryId) => {
    setActiveCategory(cat);
    
    if (cat === 'gift') {
      setLiviaExpression('blushing');
      setMessage('A-ada apa tiba-tiba lihat menu hadiah? B-bukan berarti aku minta dikasih lho ya!');
    } else if (cat === 'outfit') {
      setLiviaExpression('angry');
      setMessage('Baju? Awas ya kalau kamu milihin baju yang aneh-aneh buatku!');
    } else if (cat === 'food') {
      setLiviaExpression('happy');
      setMessage('Hehe, lihat makanan begini bikin perutku bunyi... Beliin dong!');
    } else if (cat === 'furniture') {
      setLiviaExpression('normal');
      setMessage('Mau nambah perabotan kamar? Asal tetep rapi sih aku gak masalah.');
    } else if (cat === 'item') {
      setLiviaExpression('normal');
      setMessage('Barang spesial? Hmm, ada yang menarik perhatianmu?');
    } else if (cat === 'drink') {
      setLiviaExpression('normal');
      setMessage('Haus nih, minuman dingin kayaknya seger banget deh.');
    }
  };

  const handleItemHover = (item: ShopItem) => {
    if (isBuying) return; // Jangan ganti ekspresi kalau lagi loading beli

    const itemName = language === 'en' && EN_SHOP_ITEMS[item.id] ? EN_SHOP_ITEMS[item.id].name : item.name;
    if (item.id === 'cincin_nikah') {
      setLiviaExpression('clingy');
      setMessage(language === 'en' ? "W-what?! T-that's a wedding ring... Y-you're not joking about buying that, are you?!" : `E-eh?! I-itu kan cincin nikah... K-kamu ngga lagi bercanda kan mau beli itu?!`);
    } else if (item.cost > 15000) {
      setLiviaExpression('blushing');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.expensive(itemName) : `M-mahal banget! K-kamu beneran yakin mau beli ${item.name} buatku?`);
    } else if (item.category === 'food') {
      setLiviaExpression('happy');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.food(itemName) : `Nyam... ${item.name} kelihatannya enak banget!`);
    } else if (item.category === 'outfit') {
      setLiviaExpression('blushing');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.outfit(itemName) : `Kamu yakin selera fashion-mu cukup bagus buat milih ${item.name}?`);
    } else if (item.id === 'kacamata_hitam') {
      setLiviaExpression('happy');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.sunglasses : 'Wih, kacamata hitam! Keren banget kan kalau aku pakai itu?');
    } else if (item.id === 'recipe_book_shop') {
      setLiviaExpression('blushing');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.recipeBook : 'Buku resep masakan?! K-kamu mau aku masakin kamu ya?! Jangan ngarep!');
    }
  };

  const buyGift = async (item: ShopItem) => {
    const itemName = language === 'en' && EN_SHOP_ITEMS[item.id] ? EN_SHOP_ITEMS[item.id].name : item.name;
    if (money < item.cost) {
      setLiviaExpression('angry');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.noMoney(itemName) : `Uangmu kurang! Jangan lihat-lihat doang kalau nggak sanggup beli ${item.name}!`);
      return;
    }

    if (affection >= 100 && item.category === 'gift' && item.id !== 'cincin_nikah') {
      setLiviaExpression('blushing');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.maxAffection : `B-bukan berarti aku nolak dikasih hadiah... tapi afeksiku ke kamu udah maksimal (100)! Mending uangnya ditabung aja.`);
      return;
    }

    if (inventory.includes(item.id) && !isConsumableItem(item)) {
      setLiviaExpression('angry');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.alreadyOwned(itemName) : `Kamu sudah punya ${item.name}! Beli yang lain sana.`);
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
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtOutfit : `B-baju ini... kamu nyuruh aku pakai ini? T-tunggu sebentar, jangan ngintip!`);
        } else if (item.category === 'furniture') {
          setLiviaExpression('happy');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtFurniture(itemName) : `Wah, kamar ini jadi lebih bagus karena ${item.name}. Makasih!`);
        } else if (item.category === 'food') {
          setLiviaExpression('happy');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtFood(itemName) : `Nyam... ${item.name} ini enak banget! Makasih makanannya, perutku jadi lebih kenyang.`);
        } else if (item.category === 'drink') {
          setLiviaExpression('happy');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtDrink(itemName) : `Gluk gluk... Ah! Segarnya. Tenggorokanku udah mendingan sekarang.`);
        } else if (item.id === 'kacamata_hitam') {
          setLiviaExpression('blushing');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtSunglasses : `I-ini kacamata hitam?! Keren banget... Cocok buat jalan-jalan! Makasih ya!`);
        } else if (item.id === 'recipe_book_shop') {
          setLiviaExpression('blushing');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtRecipeBook : `I-ini kan buku resep... Y-yaudah deh, karena kamu udah repot-repot beliin, sesekali aku bakal masakin kamu di dapur!`);
        } else if (item.affectionDelta >= 12) {
          setLiviaExpression('blushing');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtExpensive : `B-buat aku?! Ini kan mahal banget... T-terima kasih, bodoh!`);
        } else if (item.affectionDelta >= 5) {
          setLiviaExpression('happy');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtNice(itemName) : `Wah, ${item.name}! Kebetulan aku lagi pengen. Makasih ya!`);
        } else {
          setLiviaExpression('normal');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtNormal(itemName) : `Oh, ${item.name}. Lumayan. Makasih.`);
        }

      } else {
        setLiviaExpression('angry');
        setMessage(language === 'en' ? 'Failed to buy item! System error.' : 'Gagal beli barangnya! Sistem error tuh.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBuying(false);
    }
  };

  const filteredItems = ITEMS.filter(i => i.category === activeCategory);

  return (
    <div className="h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Background Decor (No bg image as requested) */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none z-0" />
      <div className="absolute -right-20 top-20 w-96 h-96 bg-pink-100 rounded-full blur-[100px] opacity-40 z-0 pointer-events-none" />
      <div className="absolute left-10 bottom-10 w-64 h-64 bg-amber-100 rounded-full blur-[80px] opacity-40 z-0 pointer-events-none" />

      {/* Top Bar (BA Header Layout, Teman Kos Colors) */}
      <div className="absolute top-0 left-0 w-full h-16 md:h-20 bg-white/80 backdrop-blur-md shadow-sm z-30 flex justify-between items-center px-4 md:px-6 border-b border-pink-50">
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/home" className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-pink-50 rounded-full text-pink-600 hover:bg-[#ff758c] hover:text-white transition-colors">
            <span className="text-lg md:text-xl font-black">←</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <ShoppingBag className="text-[#ff758c] w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-lg md:text-3xl font-display font-black text-[#5c4d47] italic tracking-tight uppercase">{dict?.pages?.shop?.title || 'Toko'}</h1>
          </div>
        </div>
        <div className="flex gap-2 md:gap-4">
          <div className="bg-pink-50 border border-pink-200 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full flex items-center gap-1.5 md:gap-3 shadow-sm">
            <Heart className="w-4 h-4 md:w-5 md:h-5 text-pink-500 fill-pink-500" />
            <span className="font-bold text-sm md:text-base text-[#5c4d47]">{affection}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full flex items-center gap-1.5 md:gap-3 shadow-sm">
            <div className="w-5 h-5 md:w-6 md:h-6 bg-amber-400 rounded-full flex items-center justify-center">
              <span className="text-white text-[10px] md:text-xs font-black">R</span>
            </div>
            <span className="font-mono font-black text-sm md:text-xl text-amber-700">{money}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto flex flex-col lg:flex-row pt-16 md:pt-24 px-4 md:px-6 z-10 relative overflow-hidden">
        
        {/* Mobile Message Bubble */}
        <div className="lg:hidden w-full mt-4 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-md border-l-4 border-[#ff758c] z-20">
          <p className="text-sm font-bold text-[#5c4d47] leading-relaxed">
            <span className="text-[#ff758c] mr-2">Livia:</span>"{message}"
          </p>
        </div>        {/* Categories (Horizontal on Mobile, Vertical Sidebar on Desktop) */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 md:gap-3 py-4 md:py-6 relative z-20 overflow-x-auto hide-scrollbar shrink-0">
          <div className="hidden lg:block text-xs font-bold text-gray-400 mb-2 pl-4 tracking-widest uppercase">{language === 'en' ? 'Category' : 'Kategori'}</div>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            const enMap: Record<CategoryId, string> = {
              gift: 'Gifts',
              food: 'Food',
              drink: 'Drinks',
              outfit: 'Outfits',
              item: 'Items',
              furniture: 'Furniture'
            };
            const catName = language === 'en' ? (enMap[cat.id] || cat.name) : cat.name;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`relative flex items-center gap-2 md:gap-4 py-2 md:py-4 px-4 md:px-6 rounded-full lg:rounded-r-2xl lg:rounded-l-none transition-all duration-300 font-display font-black text-sm md:text-lg whitespace-nowrap ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#ff758c] to-[#ffb199] text-white shadow-lg lg:translate-x-4 lg:border-l-[6px] lg:border-pink-500' 
                    : 'bg-white/80 text-gray-500 hover:bg-white lg:hover:translate-x-2 border border-transparent hover:border-pink-100'
                }`}
              >
                {cat.icon}
                <span className="tracking-wide uppercase italic">{catName}</span>
              </button>
            );
          })}
        </div>

        {/* Center: Items Grid */}
        <div className="flex-1 p-2 md:p-6 overflow-y-auto hide-scrollbar pb-32 z-20">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl mx-auto">
            {filteredItems.map(item => {
              const isConsumable = isConsumableItem(item);
              const owned = inventory.includes(item.id) && !isConsumable;
              return (
                <div 
                  key={item.id}
                  onMouseEnter={() => handleItemHover(item)}
                  className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-4 md:p-5 shadow-sm border border-white/60 flex flex-col items-center text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden"
                >
                  {/* Creative SVG Blob Background behind the icon */}
                  <div className={`w-20 h-20 md:w-28 md:h-28 shrink-0 rounded-[1.5rem] bg-gradient-to-br ${item.id === 'kacamata_hitam' ? 'from-gray-700 to-gray-900' : item.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 relative mb-4`}>
                    <svg className="absolute inset-0 w-full h-full opacity-30 text-white fill-current mix-blend-overlay group-hover:rotate-45 transition-transform duration-700" viewBox="0 0 100 100">
                      <path d="M45.7,11.3C52.4,7,61.6,7,68.3,11.3L81.7,20.1C88.4,24.4,93,31.5,93,39.5V57.2C93,65.2,88.4,72.3,81.7,76.6L68.3,85.4C61.6,89.7,52.4,89.7,45.7,85.4L32.3,76.6C25.6,72.3,21,65.2,21,57.2V39.5C21,31.5,25.6,24.4,32.3,20.1L45.7,11.3Z" />
                    </svg>
                    {renderCreativeSVG(item.emoji)}
                  </div>
                  
                  <h3 className="font-black font-display text-[#5c4d47] text-sm md:text-lg mb-1 leading-tight">
                    {language === 'en' && EN_SHOP_ITEMS[item.id] ? EN_SHOP_ITEMS[item.id].name : item.name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-gray-500 font-medium leading-relaxed mb-4 line-clamp-2 h-8">
                    {language === 'en' && EN_SHOP_ITEMS[item.id] ? EN_SHOP_ITEMS[item.id].desc : item.desc}
                  </p>
                  
                  <div className="w-full flex items-center justify-between mt-auto pt-4 border-t border-gray-200/50">
                    <div className="flex flex-col items-start">
                      <span className="font-mono font-black text-sm md:text-lg text-amber-600 flex items-center gap-1">
                        <span className="text-[9px] md:text-xs text-amber-500">Rv</span>{item.cost}
                      </span>
                      {item.affectionDelta > 0 && (
                        <span className="text-[9px] md:text-[10px] font-bold text-pink-500 uppercase tracking-wider flex items-center gap-1">
                          <Heart size={10} className="fill-pink-500" /> +{item.affectionDelta}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => buyGift(item)}
                      disabled={isBuying || money < item.cost || owned}
                      className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all shadow-md ${
                        owned ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                        : money >= item.cost 
                          ? 'bg-gradient-to-r from-[#ff758c] to-[#ffb199] text-white hover:shadow-pink-300/50 hover:shadow-lg hover:-translate-y-0.5 active:scale-95'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {owned ? (language === 'en' ? 'Owned' : 'Dimiliki') : (language === 'en' ? 'Buy' : 'Beli')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Livia NPC Area */}
        <div className="hidden lg:flex w-[40%] flex-col items-center justify-end relative h-full pointer-events-none z-10">
          
          {/* Sprite anchored to bottom, scaled up to reach top bar */}
          <LiviaSprite 
            expression={liviaExpression} 
            outfit={activeOutfit}
            variant="shop"
            disableFloat={true}
            className="absolute inset-x-0 bottom-0 top-0 w-full h-full pointer-events-auto"
            imgClassName="object-contain object-bottom drop-shadow-[0_15px_35px_rgba(255,117,140,0.15)] transition-all duration-300 scale-[1.06] origin-bottom"
          />

          {/* Reaction Bubble - Positioned at bottom (paha Livia) */}
          <div className="absolute bottom-16 xl:bottom-24 bg-white/95 backdrop-blur-xl rounded-[2rem] rounded-bl-sm p-5 shadow-2xl border-l-4 border-[#ff758c] max-w-[320px] w-[90%] z-20 pointer-events-auto transition-all duration-300">
            <p className="text-sm xl:text-base font-bold text-[#5c4d47] leading-relaxed">
              <span className="text-[#ff758c] mr-2">Livia:</span>"{message}"
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
