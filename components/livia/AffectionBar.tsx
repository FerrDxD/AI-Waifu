'use client';

interface AffectionBarProps {
  affection: number;
  level: number;
  levelName: string;
}

export default function AffectionBar({ affection, level, levelName }: AffectionBarProps) {
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-surface border border-custom rounded-sm shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-display italic text-accent font-bold">
          Lv. {level} - {levelName}
        </span>
        <span className="text-sm font-mono text-text-muted">
          {affection} / 100
        </span>
      </div>
      
      <div className="w-full h-3 bg-background rounded-full overflow-hidden border border-custom">
        <div 
          className="h-full bg-gradient-to-r from-[#8b6f5e] to-accent transition-all duration-1000 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, affection))}%` }}
        />
      </div>
    </div>
  );
}
