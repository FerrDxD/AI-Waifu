'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { 
  Heart, Gift, ShoppingBag, Shirt, Box, Home, Utensils, Coffee,
  BookOpen, Sparkles, Crown, Flame, Droplet, Glasses, Ticket, FileText, Building, Image as ImageIcon, Bed, Monitor,
  LucideIcon, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { EN_SHOP_ITEMS, EN_LIVIA_DIALOGUES } from '@/lib/i18n/content';
import { playSfx } from '@/lib/sfx';

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

const CATEGORIES: { id: CategoryId; name: string; icon: LucideIcon }[] = [
  { id: 'gift', name: 'Hadiah', icon: Gift },
  { id: 'food', name: 'Makanan', icon: Utensils },
  { id: 'drink', name: 'Minuman', icon: Coffee },
  { id: 'outfit', name: 'Pakaian', icon: Shirt },
  { id: 'item', name: 'Barang', icon: Box },
  { id: 'furniture', name: 'Perabotan', icon: Home },
];

const EN_CATEGORY_NAMES: Record<CategoryId, string> = {
  gift: 'Gifts',
  food: 'Food',
  drink: 'Drinks',
  outfit: 'Outfits',
  item: 'Items',
  furniture: 'Furniture'
};

const ICON_MAP: Record<string, LucideIcon> = {
  candy: Gift,
  coffee: Coffee,
  book: BookOpen,
  heart: Heart,
  sparkles: Sparkles,
  crown: Crown,
  food: Utensils,
  flame: Flame,
  drop: Droplet,
  shirt: Shirt,
  glasses: Glasses,
  ticket: Ticket,
  file: FileText,
  building: Building,
  image: ImageIcon,
  bed: Bed,
  monitor: Monitor,
};

const ITEMS: ShopItem[] = [
  // Hadiah
  { id: 'candy', category: 'gift', name: 'Permen Manis', emoji: 'candy', cost: 150, affectionDelta: 1, color: 'bg-pink-50 text-[#ff758c] border-pink-100', desc: 'Permen murah tapi rasanya manis.' },
  { id: 'coffee', category: 'gift', name: 'Kopi Susu', emoji: 'coffee', cost: 400, affectionDelta: 5, color: 'bg-amber-50 text-amber-700 border-amber-100', desc: 'Minuman kekinian kesukaan remaja.' },
  { id: 'novel', category: 'gift', name: 'Buku Novel', emoji: 'book', cost: 1200, affectionDelta: 7, color: 'bg-stone-50 text-stone-700 border-stone-200', desc: 'Novel romansa remaja.' },
  { id: 'bear', category: 'gift', name: 'Boneka Beruang', emoji: 'heart', cost: 2000, affectionDelta: 12, color: 'bg-orange-50 text-orange-700 border-orange-100', desc: 'Sangat empuk dan nyaman dipeluk.' },
  { id: 'necklace', category: 'gift', name: 'Kalung Cantik', emoji: 'sparkles', cost: 5000, affectionDelta: 15, color: 'bg-rose-50 text-rose-600 border-rose-100', desc: 'Perhiasan mahal dan berkilau.' },
  { id: 'cincin_nikah', category: 'gift', name: 'Cincin Nikah', emoji: 'crown', cost: 30000, affectionDelta: 200, color: 'bg-amber-50 text-amber-700 border-2 border-amber-300 ring-2 ring-amber-200/50', desc: 'Sebuah janji seumur hidup.' },
  
  // Makanan
  { id: 'onigiri', category: 'food', name: 'Onigiri', emoji: 'food', cost: 50, affectionDelta: 0, color: 'bg-stone-50 text-stone-700 border-stone-200', desc: 'Nasi kepal penghilang lapar (+Lapar, +Energi).' },
  { id: 'yakitori', category: 'food', name: 'Yakitori', emoji: 'flame', cost: 150, affectionDelta: 0, color: 'bg-orange-50 text-orange-700 border-orange-100', desc: 'Sate ayam khas Jepang (+Lapar, +Energi).' },
  { id: 'takoyaki', category: 'food', name: 'Takoyaki', emoji: 'flame', cost: 200, affectionDelta: 0, color: 'bg-amber-50 text-amber-700 border-amber-100', desc: 'Bola gurita panas (+Lapar, +Energi).' },
  { id: 'dango', category: 'food', name: 'Dango', emoji: 'food', cost: 120, affectionDelta: 0, color: 'bg-pink-50 text-[#ff758c] border-pink-100', desc: 'Kue beras manis (+Lapar, +Energi).' },
  { id: 'katsudon', category: 'food', name: 'Katsudon', emoji: 'food', cost: 400, affectionDelta: 0, color: 'bg-amber-50 text-amber-700 border-amber-100', desc: 'Porsi besar (+Lapar Banyak, +Energi).' },
  { id: 'sushi', category: 'food', name: 'Sushi', emoji: 'food', cost: 800, affectionDelta: 0, color: 'bg-rose-50 text-rose-700 border-rose-100', desc: 'Premium & lezat (+Lapar, +Energi).' },
  { id: 'katering', category: 'food', name: 'Katering Pernikahan', emoji: 'food', cost: 15000, affectionDelta: 0, color: 'bg-orange-100 text-orange-800 border-orange-200', desc: 'Pesanan katering untuk resepsi.' },

  // Minuman
  { id: 'air_putih', category: 'drink', name: 'Air Putih', emoji: 'drop', cost: 20, affectionDelta: 0, color: 'bg-sky-50 text-sky-700 border-sky-100', desc: 'Air mineral biasa (+Hidrasi).' },
  { id: 'teh_hijau', category: 'drink', name: 'Teh Hijau', emoji: 'coffee', cost: 80, affectionDelta: 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', desc: 'Menenangkan (+Hidrasi, +Energi).' },
  { id: 'teh_hitam', category: 'drink', name: 'Teh Hitam', emoji: 'coffee', cost: 100, affectionDelta: 0, color: 'bg-amber-50 text-amber-800 border-amber-100', desc: 'Teh pekat (+Hidrasi, +Energi).' },
  { id: 'kopi_hitam', category: 'drink', name: 'Kopi Hitam', emoji: 'coffee', cost: 150, affectionDelta: 0, color: 'bg-stone-100 text-stone-800 border-stone-200', desc: 'Penambah energi (+Hidrasi, +Energi).' },
  { id: 'jus_buah', category: 'drink', name: 'Jus Buah', emoji: 'drop', cost: 200, affectionDelta: 0, color: 'bg-orange-50 text-orange-700 border-orange-100', desc: 'Kaya vitamin (+Hidrasi, +Energi).' },
  { id: 'susu', category: 'drink', name: 'Susu', emoji: 'drop', cost: 150, affectionDelta: 0, color: 'bg-stone-50 text-stone-700 border-stone-200', desc: 'Susu sapi murni (+Hidrasi, +Lapar).' },

  // Pakaian
  { id: 'outfit_casual', category: 'outfit', name: 'Baju Santai', emoji: 'shirt', cost: 8000, affectionDelta: 5, color: 'bg-teal-50 text-teal-700 border-teal-100', desc: 'Pakaian ganti untuk bersantai di kamar.' },
  { id: 'trench_coat', category: 'outfit', name: 'Trench Coat', emoji: 'shirt', cost: 15000, affectionDelta: 10, color: 'bg-amber-50 text-amber-800 border-amber-200', desc: 'Sempurna untuk musim dingin atau pulang kampung.' },
  { id: 'outfit_school', category: 'outfit', name: 'Seragam SMA', emoji: 'shirt', cost: 12000, affectionDelta: 8, color: 'bg-sky-50 text-sky-700 border-sky-200', desc: 'Seragam sekolah bergaya pelaut.' },
  { id: 'outfit_yukata', category: 'outfit', name: 'Yukata Festival', emoji: 'shirt', cost: 25000, affectionDelta: 20, color: 'bg-rose-50 text-rose-700 border-rose-200', desc: 'Pakaian tradisional untuk pergi ke festival.' },
  { id: 'gaun_pengantin', category: 'outfit', name: 'Gaun Pengantin', emoji: 'shirt', cost: 50000, affectionDelta: 500, color: 'bg-pink-50 text-[#ff0844] border-2 border-pink-200 ring-2 ring-pink-100', desc: 'Gaun putih suci untuk hari paling istimewa.' },
  { id: 'piyama', category: 'outfit', name: 'Piyama', emoji: 'shirt', cost: 10000, affectionDelta: 12, color: 'bg-rose-50 text-rose-600 border-rose-100', desc: 'Baju tidur yang sangat nyaman.' },
  { id: 'office_lady', category: 'outfit', name: 'Office Lady', emoji: 'shirt', cost: 30000, affectionDelta: 30, color: 'bg-stone-100 text-stone-700 border-stone-200', desc: 'Kemeja kerja elegan lengkap dengan kacamata.' },
  
  // Item
  { id: 'recipe_book_shop', category: 'item', name: 'Buku Resep Masak', emoji: 'book', cost: 1500, affectionDelta: 15, color: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Panduan masakan lezat. Wajib dibeli untuk membuka Dapur!' },
  { id: 'kacamata_hitam', category: 'item', name: 'Kacamata Hitam', emoji: 'glasses', cost: 9500, affectionDelta: 20, color: 'bg-stone-200 text-stone-800 border-stone-300', desc: 'Item wajib untuk jalan-jalan keluar.' },
  { id: 'tiket_konser', category: 'item', name: 'Tiket Konser', emoji: 'ticket', cost: 25000, affectionDelta: 30, color: 'bg-rose-50 text-rose-700 border-rose-200', desc: 'Tiket konser band favorit Livia.' },
  { id: 'berkas_kua', category: 'item', name: 'Berkas KUA', emoji: 'file', cost: 2000, affectionDelta: 50, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Persiapan administrasi pernikahan.' },
  { id: 'gedung_resepsi', category: 'item', name: 'Sewa Gedung', emoji: 'building', cost: 50000, affectionDelta: 100, color: 'bg-amber-50 text-amber-800 border-amber-200', desc: 'Booking gedung impian Livia.' },
  
  // Perabotan
  { id: 'furni_poster', category: 'furniture', name: 'Poster Anime', emoji: 'image', cost: 3000, affectionDelta: 2, color: 'bg-stone-100 text-stone-700 border-stone-200', desc: 'Hiasan dinding untuk mempercantik kamar.' },
  { id: 'furni_bed', category: 'furniture', name: 'Kasur Mewah', emoji: 'bed', cost: 35000, affectionDelta: 15, color: 'bg-rose-50 text-rose-700 border-rose-200', desc: 'Tingkatkan kualitas tidur Livia.' },
  { id: 'furni_pc', category: 'furniture', name: 'PC Gaming', emoji: 'monitor', cost: 50000, affectionDelta: 25, color: 'bg-slate-100 text-slate-800 border-slate-200', desc: 'PC spesifikasi tinggi untuk main game.' },
];

export default function ShopPage() {
  const { dict, language } = useLanguage();
  const [money, setMoney] = useState(0);
  const [affection, setAffection] = useState(0);
  const [liviaExpression, setLiviaExpression] = useState<'normal' | 'happy' | 'angry' | 'blushing' | 'clingy'>('normal');
  const [message, setMessage] = useState('Kamu mau beli apa hari ini? T-tapi jangan beliin aku barang aneh-aneh ya!');
  const [isBuying, setIsBuying] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('gift');
  const [inventory, setInventory] = useState<string[]>([]);
  const lastHoveredId = useRef('');

  useEffect(() => {
    // Preload shopkeeper expression sprites for instantaneous reactions
    ['normal', 'happy', 'blushing', 'angry', 'clingy'].forEach(expr => {
      const img = new Image();
      img.src = `/livia/shop/default/${expr}.webp`;
    });

    // Single request: /api/affection already includes money, affection, and itemsBrought
    fetch('/api/affection')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setMoney(data.money || 0);
          setAffection(data.affection || 0);
          setInventory(data.itemsBrought || []);
        }
      })
      .catch(console.error);
  }, []);

  const inventorySet = useMemo(() => new Set(inventory), [inventory]);

  const handleCategoryChange = (cat: CategoryId) => {
    playSfx('click');
    setActiveCategory(cat);
    lastHoveredId.current = '';
    
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
    if (isBuying || lastHoveredId.current === item.id) return;
    lastHoveredId.current = item.id;

    const itemName = language === 'en' && EN_SHOP_ITEMS[item.id] ? EN_SHOP_ITEMS[item.id].name : item.name;
    if (item.id === 'cincin_nikah') {
      setLiviaExpression('clingy');
      setMessage(language === 'en' ? "W-what?! T-that's a wedding ring... Y-you're not joking about buying that, are you?!" : 'E-eh?! I-itu kan cincin nikah... K-kamu ngga lagi bercanda kan mau beli itu?!');
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
      playSfx('error');
      setLiviaExpression('angry');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.noMoney(itemName) : `Uangmu kurang! Jangan lihat-lihat doang kalau nggak sanggup beli ${item.name}!`);
      return;
    }

    if (affection >= 100 && item.category === 'gift' && item.id !== 'cincin_nikah') {
      playSfx('error');
      setLiviaExpression('blushing');
      setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.maxAffection : 'B-bukan berarti aku nolak dikasih hadiah... tapi afeksiku ke kamu udah maksimal (100)! Mending uangnya ditabung aja.');
      return;
    }

    if (inventorySet.has(item.id) && !isConsumableItem(item)) {
      playSfx('error');
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
        playSfx('coin');
        setMoney(data.newMoney);
        setAffection(data.newAffection);
        if (!isConsumableItem(item)) {
          setInventory(prev => [...prev, item.id]);
        }
        
        if (item.category === 'outfit') {
          setLiviaExpression('blushing');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtOutfit : 'B-baju ini... kamu nyuruh aku pakai ini? T-tunggu sebentar, jangan ngintip!');
        } else if (item.category === 'furniture') {
          setLiviaExpression('happy');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtFurniture(itemName) : `Wah, kamar ini jadi lebih bagus karena ${item.name}. Makasih!`);
        } else if (item.category === 'food') {
          setLiviaExpression('happy');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtFood(itemName) : `Nyam... ${item.name} ini enak banget! Makasih makanannya, perutku jadi lebih kenyang.`);
        } else if (item.category === 'drink') {
          setLiviaExpression('happy');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtDrink(itemName) : 'Gluk gluk... Ah! Segarnya. Tenggorokanku udah mendingan sekarang.');
        } else if (item.id === 'kacamata_hitam') {
          setLiviaExpression('blushing');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtSunglasses : 'I-ini kacamata hitam?! Keren banget... Cocok buat jalan-jalan! Makasih ya!');
        } else if (item.id === 'recipe_book_shop') {
          setLiviaExpression('blushing');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtRecipeBook : 'I-ini kan buku resep... Y-yaudah deh, karena kamu udah repot-repot beliin, sesekali aku bakal masakin kamu di dapur!');
        } else if (item.affectionDelta >= 12) {
          setLiviaExpression('blushing');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtExpensive : 'B-buat aku?! Ini kan mahal banget... T-terima kasih, bodoh!');
        } else if (item.affectionDelta >= 5) {
          setLiviaExpression('happy');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtNice(itemName) : `Wah, ${item.name}! Kebetulan aku lagi pengen. Makasih ya!`);
        } else {
          setLiviaExpression('normal');
          setMessage(language === 'en' ? EN_LIVIA_DIALOGUES.shop.boughtNormal(itemName) : `Oh, ${item.name}. Lumayan. Makasih.`);
        }
      } else {
        playSfx('error');
        setLiviaExpression('angry');
        setMessage(language === 'en' ? 'Failed to buy item! System error.' : 'Gagal beli barangnya! Sistem error tuh.');
      }
    } catch (e) {
      console.error(e);
      playSfx('error');
      setLiviaExpression('angry');
      setMessage(language === 'en' ? 'Connection error!' : 'Koneksi bermasalah nih!');
    } finally {
      setIsBuying(false);
    }
  };

  const filteredItems = ITEMS.filter(i => i.category === activeCategory);

  return (
    <div className="h-[100dvh] w-full bg-[#fdfbf7] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Background Decor - Warm Lamplit Glows */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute -right-16 top-16 w-80 h-80 bg-pink-100/40 rounded-full blur-[90px] pointer-events-none z-0" />
      <div className="absolute left-8 bottom-8 w-72 h-72 bg-amber-100/30 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* Top Header Bar */}
      <header className="w-full h-16 md:h-20 bg-white/85 backdrop-blur-2xl border-b border-pink-100/70 shadow-sm z-30 flex justify-between items-center px-4 md:px-8 shrink-0">
        <div className="flex items-center gap-3 md:gap-5">
          <Link 
            href="/home" 
            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border border-pink-100 hover:border-pink-300 text-[#5c4d47] hover:text-[#ff758c] shadow-sm flex items-center justify-center transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-pink-500"
            aria-label="Kembali ke Beranda"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-[#ff758c] shadow-xs">
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-black text-[#5c4d47] tracking-tight uppercase">
                {dict?.pages?.shop?.title || 'Toko'}
              </h1>
              <p className="text-[10px] md:text-xs font-mono font-bold tracking-widest uppercase text-[#7a7268] -mt-0.5">
                Koleksi & Kebutuhan
              </p>
            </div>
          </div>
        </div>

        {/* Currency & Affection HUD */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-white/90 backdrop-blur-xl border border-pink-100/80 px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-2 shadow-sm">
            <Heart className="w-4 h-4 text-[#ff758c] fill-[#ff758c]" />
            <span className="font-mono font-bold text-xs md:text-sm text-[#5c4d47]">{affection}</span>
          </div>
          <div className="bg-white/90 backdrop-blur-xl border border-amber-200/80 px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-2 shadow-sm">
            <div className="w-4 h-4 md:w-5 md:h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-xs">
              <span className="text-white text-[9px] md:text-[10px] font-mono font-black">R</span>
            </div>
            <span className="font-mono font-black text-xs md:text-sm text-amber-600">{money} Rv</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col lg:flex-row px-4 md:px-8 py-4 gap-4 md:gap-6 z-10 relative overflow-hidden">
        
        {/* Mobile VN Reaction Banner */}
        <div className="lg:hidden w-full relative shrink-0 pt-2">
          <div className="w-full bg-white/95 backdrop-blur-2xl rounded-[1.75rem] p-4 pt-5 shadow-sm border-2 border-pink-100/80 relative">
            <div className="absolute -top-3 left-5 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-display font-black text-[11px] uppercase tracking-wider shadow-sm border border-white">
              Livia
            </div>
            <p className="text-xs md:text-sm font-medium text-[#5c4d47] leading-relaxed">
              "{message}"
            </p>
          </div>
        </div>

        {/* Categories Sidebar / Navigation */}
        <nav 
          aria-label="Kategori Toko"
          className="w-full lg:w-60 flex flex-row lg:flex-col gap-2 p-1.5 lg:p-2 bg-white/70 backdrop-blur-xl border border-pink-100/70 rounded-2xl lg:rounded-[2rem] overflow-x-auto hide-scrollbar shrink-0 shadow-xs"
        >
          <div className="hidden lg:block text-[11px] font-mono font-bold text-[#7a7268] px-3 pt-2 pb-1 tracking-widest uppercase">
            {language === 'en' ? 'Category' : 'Kategori'}
          </div>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            const catName = language === 'en' ? (EN_CATEGORY_NAMES[cat.id] || cat.name) : cat.name;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`relative flex items-center gap-2.5 py-2.5 px-4 rounded-xl lg:rounded-2xl transition-all duration-200 font-display font-black text-xs md:text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-pink-500 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white shadow-md shadow-pink-500/20 lg:translate-x-1' 
                    : 'bg-white/60 text-[#7a7268] hover:text-[#5c4d47] hover:bg-white border border-transparent hover:border-pink-100'
                }`}
              >
                <CatIcon size={18} className={isActive ? 'text-white' : 'text-[#7a7268]'} />
                <span className="tracking-wide uppercase">{catName}</span>
              </button>
            );
          })}
        </nav>

        {/* Center: Merchandise Grid */}
        <main className="flex-1 overflow-y-auto hide-scrollbar pb-28 md:pb-12 z-20">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3.5 md:gap-5 w-full max-w-4xl">
            {filteredItems.map(item => {
              const isConsumable = isConsumableItem(item);
              const owned = !isConsumable && inventorySet.has(item.id);
              const Icon = ICON_MAP[item.emoji] || Box;

              return (
                <div 
                  key={item.id}
                  onMouseEnter={() => handleItemHover(item)}
                  className="bg-white/90 backdrop-blur-2xl rounded-[2rem] p-4 md:p-5 border border-pink-100/80 hover:border-pink-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(255,117,140,0.08)] hover:-translate-y-1 transition-all duration-200 flex flex-col items-center text-center group relative"
                >
                  {/* Clean Icon Squircle */}
                  <div className={`w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-2xl ${item.color} flex items-center justify-center relative mb-3 group-hover:scale-105 transition-transform duration-300 shadow-inner`}>
                    <Icon size={32} strokeWidth={1.75} className="drop-shadow-sm" />
                  </div>
                  
                  <h2 className="font-display font-black text-[#5c4d47] text-sm md:text-base mb-1 leading-snug line-clamp-1">
                    {language === 'en' && EN_SHOP_ITEMS[item.id] ? EN_SHOP_ITEMS[item.id].name : item.name}
                  </h2>
                  <p className="font-sans text-[11px] md:text-xs text-[#7a7268] leading-relaxed mb-4 line-clamp-2 h-8">
                    {language === 'en' && EN_SHOP_ITEMS[item.id] ? EN_SHOP_ITEMS[item.id].desc : item.desc}
                  </p>
                  
                  <div className="w-full flex items-center justify-between mt-auto pt-3 border-t border-[#f0e4de]">
                    <div className="flex flex-col items-start">
                      <span className="font-mono font-black text-sm md:text-base text-amber-600 flex items-center gap-1">
                        <span className="text-[10px] text-amber-500">Rv</span>{item.cost}
                      </span>
                      {item.affectionDelta > 0 && (
                        <span className="text-[10px] font-mono font-bold text-[#ff758c] flex items-center gap-1">
                          <Heart size={10} className="fill-[#ff758c]" /> +{item.affectionDelta}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => buyGift(item)}
                      disabled={isBuying || money < item.cost || owned}
                      className={`px-3.5 md:px-4 py-1.5 md:py-2 rounded-xl font-display font-black text-xs md:text-sm transition-all focus-visible:ring-2 focus-visible:ring-pink-500 ${
                        owned 
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none'
                          : money >= item.cost 
                            ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white shadow-sm hover:shadow-md hover:shadow-pink-500/20 active:scale-95'
                            : 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {owned ? (language === 'en' ? 'Owned' : 'Dimiliki') : (language === 'en' ? 'Buy' : 'Beli')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Desktop Livia Shopkeeper Stage */}
        <aside className="hidden lg:flex w-[32%] xl:w-[35%] flex-col items-center justify-end relative h-full pointer-events-none z-10 shrink-0">
          <LiviaSprite 
            expression={liviaExpression} 
            variant="shop"
            disableFloat={true}
            className="absolute inset-x-0 bottom-0 top-0 w-full h-full pointer-events-auto"
            imgClassName="object-contain object-bottom drop-shadow-[0_15px_35px_rgba(255,117,140,0.15)] transition-all duration-300 scale-[1.08] origin-bottom"
          />

          {/* Desktop VN Reaction Dialogue Box */}
          <div className="absolute bottom-8 xl:bottom-12 w-[92%] max-w-[340px] bg-white/95 backdrop-blur-2xl rounded-[2rem] p-5 shadow-[0_12px_36px_rgba(255,117,140,0.12)] border-2 border-pink-100/90 z-20 pointer-events-auto transition-all duration-300">
            <div className="absolute -top-3.5 left-6 px-4 py-1 rounded-full bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-display font-black text-xs uppercase tracking-wider shadow-sm border-2 border-white">
              Livia
            </div>
            <p className="text-sm xl:text-base font-medium text-[#5c4d47] leading-relaxed pt-1">
              "{message}"
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}