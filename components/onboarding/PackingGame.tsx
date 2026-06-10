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
import {
  BookOpen, ToyBrick, Gamepad2, Headphones, Sparkles, Shirt, Key, Book, Fan, Glasses,
  Palette, Dices, Pill, Lock, Guitar, TreePine, Dumbbell, BedDouble, Camera, Cookie
} from 'lucide-react';

interface PackingGameProps {
  onComplete: (selectedItemIds: string[]) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'recipe_book': <BookOpen size={24} strokeWidth={1.5} />,
  'teddy_bear': <ToyBrick size={24} strokeWidth={1.5} />,
  'handheld': <Gamepad2 size={24} strokeWidth={1.5} />,
  'headphone': <Headphones size={24} strokeWidth={1.5} />,
  'makeup': <Sparkles size={24} strokeWidth={1.5} />,
  'hoodie': <Shirt size={24} strokeWidth={1.5} />,
  'keychain': <Key size={24} strokeWidth={1.5} />,
  'novel': <Book size={24} strokeWidth={1.5} />,
  'fan': <Fan size={24} strokeWidth={1.5} />,
  'sunglasses': <Glasses size={24} strokeWidth={1.5} />,
  'sketchbook': <Palette size={24} strokeWidth={1.5} />,
  'tarot': <Dices size={24} strokeWidth={1.5} />,
  'vitamins': <Pill size={24} strokeWidth={1.5} />,
  'diary': <Lock size={24} strokeWidth={1.5} />,
  'guitar': <Guitar size={24} strokeWidth={1.5} />,
  'cactus': <TreePine size={24} strokeWidth={1.5} />,
  'dumbbell': <Dumbbell size={24} strokeWidth={1.5} />,
  'blanket': <BedDouble size={24} strokeWidth={1.5} />,
  'camera': <Camera size={24} strokeWidth={1.5} />,
  'snacks': <Cookie size={24} strokeWidth={1.5} />,
};

// Adjusted positions to fit around a top-down floorplan
const ROOM_POSITIONS = [
  { top: '15%', left: '15%' },
  { top: '25%', left: '45%' },
  { top: '40%', left: '20%' },
  { top: '10%', left: '80%' }, // bed area
  { top: '35%', left: '85%' }, // bed area
  { top: '65%', left: '30%' }, // near rug
  { top: '15%', left: '55%' },
  { top: '55%', left: '55%' },
  { top: '75%', left: '85%' }, // desk area
  { top: '85%', left: '60%' },
  { top: '20%', left: '30%' },
  { top: '50%', left: '10%' },
  { top: '30%', left: '70%' },
  { top: '10%', left: '65%' },
  { top: '65%', left: '75%' },
  { top: '90%', left: '45%' }, // near door
  { top: '40%', left: '40%' }, // rug center
  { top: '55%', left: '40%' },
  { top: '80%', left: '15%' }, // bottom left corner
  { top: '20%', left: '90%' },
];

function DraggableItem({ id, name, description, isPacked, position }: { id: string, name: string, description: string, isPacked: boolean, position?: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  
  const dndStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 10,
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
      className={`group ${isPacked ? 'relative' : 'absolute'} flex flex-col items-center justify-center p-1.5 sm:p-2.5 bg-[#fdfbf7]/90 backdrop-blur-sm border border-[#5c4d47]/20 rounded-lg sm:rounded-xl cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-lg hover:border-[#ff758c] transition-all ${isDragging ? 'opacity-80 z-50 scale-110 shadow-2xl rotate-6' : 'z-10 shadow-sm'}`}
    >
      <div className="text-[#5c4d47] pointer-events-none mb-1 group-hover:text-[#ff758c] transition-colors scale-75 sm:scale-100">
        {ICON_MAP[id] || <Book size={24} />}
      </div>
      <div className="text-[9px] font-bold text-[#5c4d47] pointer-events-none whitespace-nowrap hidden group-hover:block absolute -bottom-5 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100 z-50">
        {name}
      </div>
      
      {/* Tooltip */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 p-2 bg-[#1c1816]/95 backdrop-blur-md shadow-xl text-xs text-[#fdfbf7] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] text-center font-medium">
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
    <div className="w-full h-full flex flex-col items-center py-6 px-4">
      <div className="text-center mb-6 relative z-10">
        <h2 className="text-3xl font-display font-black text-[#5c4d47] mb-2 uppercase tracking-widest">Pengepakan Koper</h2>
        <p className="text-[#5c4d47]/70 font-medium text-sm">Pilih 5 barang esensial dari kamar Livia. Tarik barang ke dalam koper di ujung ruangan.</p>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        {/* TOP DOWN ROOM CONTAINER */}
        <div className="relative w-full max-w-5xl aspect-[3/4] sm:aspect-[16/9] md:aspect-[21/9] bg-[#EAE5D9] rounded-lg sm:rounded-sm shadow-2xl border-4 sm:border-8 border-[#5c4d47] overflow-hidden">
          
          {/* Floor Texture/Grid */}
          <div className="absolute inset-0 opacity-10 bg-[url('/bg/grid.png')] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/20 pointer-events-none" />

          {/* Furniture Elements (Top-Down CSS) */}
          <div className="absolute top-0 right-0 w-[35%] h-[45%] bg-[#7C89A3] border-l-4 border-b-4 border-black/20 pointer-events-none">
            {/* Bed details */}
            <div className="absolute top-2 right-2 w-16 h-24 bg-[#E2E8F0] rounded-sm opacity-80" />
            <div className="absolute bottom-0 left-0 w-full h-[60%] bg-[#5C6A85] border-t border-black/10" />
            <span className="absolute bottom-2 left-2 text-[10px] text-white/50 font-bold tracking-widest">KASUR</span>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] aspect-square rounded-full bg-[#E58B8B] opacity-60 border-4 border-dashed border-white/30 pointer-events-none flex items-center justify-center">
             <span className="text-[10px] text-white/70 font-bold tracking-widest">KARPET</span>
          </div>

          <div className="absolute bottom-0 right-10 w-[20%] h-[35%] bg-[#8B7355] border-t-4 border-l-4 border-black/30 pointer-events-none flex items-start justify-start p-2">
            <span className="text-[10px] text-white/50 font-bold tracking-widest">MEJA</span>
          </div>

          {/* Room Droppable Area */}
          <DroppableArea id="room" className="absolute inset-0 z-10">
            {availableItems.map(id => {
              const itemIndex = ITEMS.findIndex(i => i.id === id);
              const item = ITEMS[itemIndex];
              const position = ROOM_POSITIONS[itemIndex];
              return <DraggableItem key={id} {...item} isPacked={false} position={position} />;
            })}
          </DroppableArea>

          {/* SUITCASE INSIDE THE ROOM */}
          <DroppableArea id="suitcase" className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 w-[220px] sm:w-[280px] h-[140px] sm:h-[180px] bg-[#ff758c] border-2 sm:border-4 border-[#5c4d47] rounded-xl shadow-[10px_10px_30px_rgba(0,0,0,0.3)] sm:shadow-[20px_20px_60px_rgba(0,0,0,0.3)] z-20 flex flex-col overflow-hidden transition-all group">
            {/* Suitcase Lid visual */}
            <div className="absolute top-0 left-0 w-full h-3 sm:h-4 bg-[#e65c73] border-b-2 border-[#5c4d47]/30" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 sm:w-16 h-1.5 sm:h-2 bg-[#5c4d47] rounded-b-sm" />
            
            <div className="flex justify-between items-center px-3 sm:px-4 pt-4 sm:pt-6 pb-1 sm:pb-2 bg-[#ff758c]">
              <span className="text-[8px] sm:text-[10px] font-bold text-white uppercase tracking-widest opacity-80">Koper Livia</span>
              <span className="text-[8px] sm:text-[10px] font-bold text-[#5c4d47] bg-white/90 px-1.5 sm:px-2 py-0.5 rounded-sm">
                {packedItems.length}/5
              </span>
            </div>
            
            {/* Grid for packed items */}
            <div className="flex-1 bg-black/10 m-1 sm:m-2 mt-0 rounded-lg p-1 sm:p-2 grid grid-cols-5 gap-0.5 sm:gap-1 content-start">
              {packedItems.length === 0 && (
                <div className="col-span-5 h-full min-h-[80px] flex items-center justify-center text-white/50 font-bold text-[10px] uppercase tracking-widest text-center">
                  Tarik barang<br/>ke koper
                </div>
              )}
              {packedItems.map(id => {
                const item = ITEMS.find(i => i.id === id)!;
                return <DraggableItem key={id} {...item} isPacked={true} />;
              })}
            </div>
          </DroppableArea>

          {/* Livia Sprite Peeking from Door (Top Left) */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 w-20 sm:w-32 pointer-events-none z-0 opacity-80">
            <LiviaSprite 
              expression={packedItems.length === 5 ? 'happy' : (packedItems.length > 2 ? 'blushing' : 'normal')} 
              className="w-full h-auto drop-shadow-xl" 
            />
          </div>

        </div>
      </DndContext>

      <div className="mt-8 z-20 relative w-full max-w-sm">
        <button
          onClick={() => onComplete(packedItems)}
          disabled={packedItems.length !== 5}
          className="w-full py-4 bg-[#5c4d47] text-[#fdfbf7] font-bold uppercase tracking-widest text-sm rounded-lg shadow-[0_10px_20px_rgba(92,77,71,0.2)] hover:bg-[#423833] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Kunci Koper ({packedItems.length}/5)
        </button>
      </div>
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
