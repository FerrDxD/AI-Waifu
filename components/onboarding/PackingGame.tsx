'use client';

import { useState } from 'react';
import { ITEMS } from '@/lib/livia/items';
import { 
  DndContext, 
  useDraggable, 
  useDroppable,
  DragEndEvent
} from '@dnd-kit/core';

interface PackingGameProps {
  onComplete: (selectedItemIds: string[]) => void;
}

function DraggableItem({ id, emoji, name, description }: { id: string, emoji: string, name: string, description: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`group relative flex flex-col items-center justify-center p-4 bg-surface border border-custom rounded-sm cursor-grab active:cursor-grabbing hover:bg-border transition-colors ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-xs text-center text-text-primary">{name}</div>
      
      {/* Tooltip */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 p-2 bg-background border border-accent text-xs text-text-primary rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
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
    } else if (over.id === 'grid' && packedItems.includes(itemId)) {
      setPackedItems(prev => prev.filter(id => id !== itemId));
      setAvailableItems(prev => [...prev, itemId]);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display italic text-accent mb-2">Pilih Barang Bawaan</h2>
        <p className="text-text-muted">Pilih maksimal 5 barang untuk dibawa Livia ke kos.</p>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Grid Area */}
          <div className="flex-1">
            <h3 className="text-xl mb-4 text-text-primary">Tersedia</h3>
            <DroppableArea id="grid" className="grid grid-cols-2 sm:grid-cols-3 gap-4 min-h-[300px] p-4 bg-background/50 border border-custom border-dashed rounded-sm">
              {availableItems.map(id => {
                const item = ITEMS.find(i => i.id === id)!;
                return <DraggableItem key={id} {...item} />;
              })}
            </DroppableArea>
          </div>

          {/* Suitcase Area */}
          <div className="w-full md:w-80 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl text-text-primary">Koper</h3>
              <span className={`text-sm font-mono ${packedItems.length === 5 ? 'text-accent' : 'text-text-muted'}`}>
                {packedItems.length} / 5
              </span>
            </div>
            
            <DroppableArea id="suitcase" className="flex-1 min-h-[300px] flex flex-col gap-4 p-4 bg-surface border border-accent/50 rounded-sm shadow-inner">
              {packedItems.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-text-muted italic">
                  Seret barang ke sini
                </div>
              )}
              {packedItems.map(id => {
                const item = ITEMS.find(i => i.id === id)!;
                return <DraggableItem key={id} {...item} />;
              })}
            </DroppableArea>

            <button
              onClick={() => onComplete(packedItems)}
              disabled={packedItems.length !== 5}
              className="mt-6 w-full py-3 bg-accent text-black font-medium rounded-sm hover:bg-[#d6a578] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selesai Berkemas
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
