'use client';

import { useState } from 'react';
import { ITEMS } from '@/lib/livia/items';
import { 
  DndContext, 
  useDraggable, 
  useDroppable,
  DragEndEvent
} from '@dnd-kit/core';
import LiviaSprite from '@/components/livia/LiviaSprite';

interface PackingGameProps {
  onComplete: (selectedItemIds: string[]) => void;
}

const ROOM_POSITIONS = [
  { top: '10%', left: '15%' },
  { top: '25%', left: '75%' },
  { top: '50%', left: '10%' },
  { top: '75%', left: '80%' },
  { top: '35%', left: '45%' },
  { top: '80%', left: '30%' },
  { top: '15%', left: '55%' },
  { top: '60%', left: '50%' },
  { top: '45%', left: '85%' },
  { top: '85%', left: '60%' },
];

function DraggableItem({ id, emoji, name, description, isPacked, position }: { id: string, emoji: string, name: string, description: string, isPacked: boolean, position?: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  
  const dndStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  const combinedStyle = {
    ...dndStyle,
    ...(isPacked ? {} : position)
  };

  return (
    <div 
      ref={setNodeRef} 
      style={combinedStyle} 
      {...listeners} 
      {...attributes}
      className={`group ${isPacked ? 'relative' : 'absolute'} flex flex-col items-center justify-center p-3 bg-white/90 backdrop-blur-sm border-2 border-pink-100 rounded-2xl cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(255,117,140,0.2)] hover:border-[#ff758c] transition-all ${isDragging ? 'opacity-80 z-50 scale-110 shadow-2xl rotate-3' : 'z-10 shadow-sm'}`}
    >
      <div className="text-4xl filter drop-shadow-sm pointer-events-none">{emoji}</div>
      <div className="text-[10px] font-bold text-gray-700 mt-1 pointer-events-none whitespace-nowrap">{name}</div>
      
      {/* Tooltip */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 p-2 bg-white/95 backdrop-blur-md border border-pink-200 shadow-xl text-xs text-gray-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] text-center font-medium">
        {description}
      </div>
    </div>
  );
}

export default function PackingGame({ onComplete }: PackingGameProps) {
  const [availableItems, setAvailableItems] = useState(ITEMS.map(i => i.id));
  const [packedItems, setPackedItems] = useState<string[]>([]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const itemId = String(active.id);

    if (over.id === 'suitcase' && !packedItems.includes(itemId) && packedItems.length < 5) {
      setAvailableItems(prev => prev.filter(id => id !== itemId));
      setPackedItems(prev => [...prev, itemId]);
    } else if (over.id === 'room' && packedItems.includes(itemId)) {
      setPackedItems(prev => prev.filter(id => id !== itemId));
      setAvailableItems(prev => [...prev, itemId]);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4">
      <div className="text-center mb-8 relative z-10">
        <h2 className="text-4xl font-display font-black text-[#ff758c] mb-3 drop-shadow-sm tracking-wide">Pilih Barang Bawaan Livia</h2>
        <p className="text-gray-600 font-medium bg-white/80 inline-block px-6 py-1.5 rounded-full backdrop-blur-sm border border-pink-100 shadow-sm">Seret maksimal 5 barang favoritnya ke dalam koper.</p>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-8 items-stretch h-[600px]">
          
          {/* Room Area */}
          <div className="flex-[2] relative overflow-hidden rounded-3xl border-4 border-pink-200 shadow-lg bg-[url('/vn_bg_messy_room.png')] bg-cover bg-center">
            {/* Dark overlay just for a tiny bit of contrast if needed, but mostly transparent */}
            <div className="absolute top-4 left-4 z-20">
              <h3 className="text-xl font-bold text-pink-600 bg-white/80 px-4 py-2 rounded-full backdrop-blur-md shadow-sm">Kamar Livia (Berantakan)</h3>
            </div>
            
            <DroppableArea id="room" className="absolute inset-0 z-10">
              {availableItems.map(id => {
                const itemIndex = ITEMS.findIndex(i => i.id === id);
                const item = ITEMS[itemIndex];
                const position = ROOM_POSITIONS[itemIndex];
                return <DraggableItem key={id} {...item} isPacked={false} position={position} />;
              })}
            </DroppableArea>

            {/* Livia Corner Reaction */}
            <div className="absolute -bottom-8 -left-4 w-48 pointer-events-none z-20 opacity-90 transition-transform duration-500">
              <LiviaSprite 
                expression={packedItems.length === 5 ? 'happy' : (packedItems.length > 2 ? 'blushing' : 'normal')} 
                className="w-full h-auto drop-shadow-xl" 
              />
            </div>
          </div>
          {/* Suitcase Area */}
          <div className="w-[280px] shrink-0 flex flex-col">
            <div className="flex flex-col gap-2 mb-4 bg-white/80 px-4 py-3 rounded-2xl backdrop-blur-md shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-pink-600">Koper Pink</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${packedItems.length === 5 ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-600'}`}>
                  {packedItems.length === 5 ? 'Penuh! 🎉' : `${packedItems.length}/5`}
                </span>
              </div>
              
              {/* Cute Progress Bar */}
              <div className="flex items-center gap-1.5 w-full h-3">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-full flex-1 rounded-full transition-all duration-500 ease-out ${
                      i < packedItems.length 
                        ? 'bg-gradient-to-r from-pink-400 to-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)] scale-100' 
                        : 'bg-pink-100 scale-90'
                    }`} 
                  />
                ))}
              </div>
            </div>
            
            {/* Visual Koper */}
            <DroppableArea id="suitcase" className="flex-1 relative flex flex-col gap-2 p-4 bg-rose-300 border-8 border-rose-400 rounded-[2.5rem] shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1),_0_15px_30px_rgba(255,154,158,0.3)]">
              {/* Tutup Koper Atas (Visual only) */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-rose-500 rounded-t-xl" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-4 bg-transparent border-4 border-rose-600 rounded-t-lg" />
              
              <div className="flex-1 bg-rose-200/50 rounded-2xl p-3 grid grid-cols-2 gap-3 items-start content-start shadow-inner overflow-y-auto">
                {packedItems.length === 0 && (
                  <div className="col-span-2 h-full min-h-[200px] flex items-center justify-center text-rose-500 font-bold opacity-70 text-center text-sm">
                    Tarik barang<br/>ke sini!
                  </div>
                )}
                {packedItems.map(id => {
                  const item = ITEMS.find(i => i.id === id)!;
                  return <DraggableItem key={id} {...item} isPacked={true} />;
                })}
              </div>
            </DroppableArea>

            <button
              onClick={() => onComplete(packedItems)}
              disabled={packedItems.length !== 5}
              className="mt-6 w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Tutup Koper & Berangkat!
            </button>
          </div>

        </div>
      </DndContext>
    </div>
  );
}

function DroppableArea({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}
