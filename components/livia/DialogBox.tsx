'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DialogBoxProps {
  text: string;
  speaker?: string;
  onNext?: () => void;
}

export default function DialogBox({ text, speaker, onNext }: DialogBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;

    intervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(intervalRef.current);
      }
    }, 25);

    return () => clearInterval(intervalRef.current);
  }, [text]);

  const handleClick = () => {
    if (isTyping) {
      clearInterval(intervalRef.current);
      setDisplayedText(text);
      setIsTyping(false);
    } else if (onNext) {
      onNext();
    }
  };

  const isNarrator = !speaker || speaker === '' || speaker === 'Narator';

  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full cursor-pointer select-none relative z-50 mx-auto max-w-5xl",
        "transition-all duration-300 ease-out"
      )}
      style={{ minHeight: '160px' }}
    >
      {/* Nameplate (only if not narrator) */}
      {!isNarrator && speaker && (
        <div 
          className="absolute -top-5 left-8 z-10 px-8 py-2 rounded-t-lg rounded-br-xl backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, rgba(140,90,50,0.95) 0%, rgba(196,149,106,0.85) 100%)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderBottom: 'none'
          }}
        >
          <span className="font-display font-bold text-lg tracking-wide text-white drop-shadow-md">
            {speaker}
          </span>
        </div>
      )}

      {/* Main Text Container */}
      <div
        className={cn(
          "w-full px-10 relative overflow-hidden rounded-lg",
          isNarrator ? "py-8" : "pt-10 pb-8"
        )}
        style={{
          background: isNarrator
            ? 'linear-gradient(to bottom, rgba(15,15,15,0.7), rgba(5,5,5,0.85))'
            : 'linear-gradient(to bottom, rgba(20,16,14,0.85), rgba(10,8,6,0.95))',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          border: isNarrator
            ? '1px solid rgba(255,255,255,0.05)'
            : '1px solid rgba(196,149,106,0.15)',
          borderTop: isNarrator ? '' : '1px solid rgba(196,149,106,0.3)',
        }}
      >
        {/* Subtle inner glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at top, rgba(255,255,255,0.03) 0%, transparent 70%)'
        }} />

        {/* Text */}
        <p
          className={cn(
            "leading-relaxed tracking-wide drop-shadow-sm min-h-[72px]"
          )}
          style={{
            fontFamily: isNarrator
              ? "'DM Mono', monospace"
              : "'DM Sans', sans-serif",
            fontSize: isNarrator ? '1.05rem' : '1.15rem',
            color: isNarrator ? 'rgba(255,255,255,0.7)' : '#fdfaf6',
            fontStyle: isNarrator ? 'italic' : 'normal',
          }}
        >
          {displayedText}
          {isTyping && (
            <span
              className="inline-block w-2 h-5 ml-1 align-middle animate-[blink_0.8s_ease-in-out_infinite]"
              style={{ background: isNarrator ? '#888' : '#c4956a', boxShadow: '0 0 8px rgba(196,149,106,0.4)' }}
            />
          )}
        </p>

        {/* Next Indicator */}
        {!isTyping && onNext && (
          <div
            className="absolute bottom-5 right-6 animate-[bounce_1.5s_ease-in-out_infinite] flex items-center justify-center"
            style={{ 
              color: '#c4956a', 
              fontSize: '18px',
              filter: 'drop-shadow(0 0 5px rgba(196,149,106,0.6))'
            }}
          >
            ▼
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}