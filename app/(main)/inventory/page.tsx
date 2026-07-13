'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Package, Search, Sparkles } from 'lucide-react';
import { ITEMS } from '@/lib/livia/items';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { EN_INVENTORY_ITEMS } from '@/lib/i18n/content';

export default function InventoryPage() {
  const { dict, language } = useLanguage();
  const [itemsBrought, setItemsBrought] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/affection')
      .then(r => r.json())
      .then(d => {
        if (d && d.itemsBrought) setItemsBrought(d.itemsBrought);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const inventoryItems = itemsBrought.filter(id => ITEMS.some(i => i.id === id)).map(id => ITEMS.find(i => i.id === id)!);

  return (
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] relative flex flex-col font-sans select-none">
      
      {/* Top Header */}
      <div className="w-full p-6 md:p-10 flex items-center justify-between sticky top-0 z-20 bg-[#fdfbf7]/80 backdrop-blur-xl border-b border-orange-100 shadow-sm">
        <div className="flex items-center gap-6">
          <Link 
            href="/home" 
            className="bg-white border border-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-[#5c4d47] shadow-sm hover:scale-105 hover:bg-orange-50 hover:text-orange-600 transition-all group shrink-0"
          >
            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-display font-black text-2xl md:text-3xl text-[#5c4d47] flex items-center gap-2">
              {dict?.pages?.inventory?.title || 'Tas Ransel'} <Package className="text-pink-400" />
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{language === 'en' ? 'Capacity:' : 'Kapasitas:'} {inventoryItems.length} / 50</p>
          </div>
        </div>
        
        {/* Decorative Search/Filter Mockup */}
        <div className="hidden md:flex bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-inner items-center gap-2">
          <Search size={16} className="text-gray-300" />
          <span className="text-xs text-gray-400 font-medium">{language === 'en' ? 'Search items...' : 'Cari barang...'}</span>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-10 flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Grid Inventory */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          
          <div className="bg-white/80 backdrop-blur-xl border border-orange-100 rounded-[2rem] p-6 shadow-md min-h-[500px]">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50 py-20">
                <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                <span className="font-bold">Membuka tas...</span>
              </div>
            ) : inventoryItems.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50 py-20">
                <Package size={64} className="text-gray-300" />
                <span className="font-bold font-display text-xl text-gray-400">Tas kamu kosong!</span>
                <p className="text-sm">Beli barang di Toko atau selesaikan misi untuk mendapatkan barang.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {inventoryItems.map((item, idx) => (
                  <button
                    key={`${item.id}-${idx}`}
                    onClick={() => setSelectedItem(item.id)}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-4xl shadow-sm border transition-all hover:scale-105 active:scale-95 ${
                      selectedItem === item.id 
                        ? 'bg-pink-50 border-pink-300 shadow-md ring-4 ring-pink-100' 
                        : 'bg-white/90 border-pink-100 hover:bg-white hover:border-pink-200'
                    }`}
                  >
                    <span className="drop-shadow-md">{item.emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Item Details Panel */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 sticky top-[120px]">
          {selectedItem ? (
            <div className="bg-white/90 backdrop-blur-2xl border border-orange-100 rounded-[2rem] p-8 shadow-xl flex flex-col items-center text-center gap-6 animate-[fadeIn_0.3s_ease-out]">
              
              {/* Big Emoji Display */}
              <div className="w-32 h-32 bg-gradient-to-br from-pink-50 to-orange-50 rounded-full flex items-center justify-center text-7xl shadow-inner border border-white relative">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.8),transparent)] pointer-events-none" />
                <span className="drop-shadow-xl animate-[bounce_2s_ease-in-out_infinite]">{ITEMS.find(i => i.id === selectedItem)?.emoji}</span>
              </div>

              {/* Title & Desc */}
              <div className="flex flex-col gap-2">
                <h2 className="font-display font-black text-2xl text-[#5c4d47]">
                  {language === 'en' && selectedItem && EN_INVENTORY_ITEMS[selectedItem]
                    ? EN_INVENTORY_ITEMS[selectedItem].name
                    : ITEMS.find(i => i.id === selectedItem)?.name}
                </h2>
                <p className="text-sm text-gray-500 font-medium italic leading-relaxed">
                  "{language === 'en' && selectedItem && EN_INVENTORY_ITEMS[selectedItem]
                    ? EN_INVENTORY_ITEMS[selectedItem].description
                    : ITEMS.find(i => i.id === selectedItem)?.description}"
                </p>
              </div>

              {/* Buff Card */}
              <div className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-inner mt-2">
                <div className="flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-widest text-[10px]">
                  <Sparkles size={14} /> {language === 'en' && selectedItem && EN_INVENTORY_ITEMS[selectedItem]
                    ? EN_INVENTORY_ITEMS[selectedItem].buffLabel
                    : ITEMS.find(i => i.id === selectedItem)?.buff.label}
                </div>
                <p className="text-xs font-bold text-[#5c4d47]">
                  {language === 'en' && selectedItem && EN_INVENTORY_ITEMS[selectedItem]
                    ? EN_INVENTORY_ITEMS[selectedItem].buffDesc
                    : ITEMS.find(i => i.id === selectedItem)?.buff.description}
                </p>
              </div>

            </div>
          ) : (
            <div className="bg-white/50 backdrop-blur-sm border border-dashed border-pink-200 rounded-[2rem] p-8 h-[300px] flex flex-col items-center justify-center text-center gap-4 opacity-70">
              <Package size={48} className="text-pink-200" />
              <p className="font-bold text-pink-300 font-display">
                {language === 'en' ? 'Select an item to view details' : 'Pilih barang untuk melihat detail'}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
