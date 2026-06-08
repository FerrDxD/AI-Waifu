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
        "transition-all duration-300 ease-out hover:-translate-y-1"
      )}
      style={{ minHeight: '180px' }}
    >
      {/* Nameplate (only if not narrator) */}
      {!isNarrator && speaker && (
        <div 
          className="absolute -top-6 left-12 z-10 px-8 py-2 rounded-full shadow-lg transition-transform hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
            border: '3px solid #fff',
            boxShadow: '0 8px 20px rgba(255, 154, 158, 0.4)'
          }}
        >
          <span className="font-display font-black text-xl tracking-wider text-pink-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            {speaker}
          </span>
        </div>
      )}

      {/* Main Text Container */}
      <div
        className={cn(
          "w-full px-12 relative overflow-hidden",
          isNarrator ? "py-8 rounded-[2rem]" : "pt-12 pb-8 rounded-[2.5rem]"
        )}
        style={{
          background: isNarrator
            ? 'rgba(255, 255, 255, 0.85)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 15px 40px rgba(255, 154, 158, 0.2), inset 0 2px 0 rgba(255,255,255,1)',
          border: '3px solid rgba(255, 207, 239, 0.6)',
        }}
      >
        {/* Subtle cute pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: 'radial-gradient(#ff9a9e 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />

        {/* Text */}
        <p
          className={cn(
            "leading-relaxed min-h-[72px] relative z-10"
          )}
          style={{
            fontFamily: isNarrator
              ? "'Nunito', sans-serif"
              : "'Quicksand', 'Nunito', sans-serif",
            fontSize: isNarrator ? '1.15rem' : '1.3rem',
            fontWeight: 600,
            color: isNarrator ? '#8a7e7a' : '#5c4d47',
            fontStyle: isNarrator ? 'italic' : 'normal',
          }}
        >
          {displayedText}
          {isTyping && (
            <span
              className="inline-block w-3 h-3 ml-2 rounded-full align-middle animate-bounce"
              style={{ background: '#ff9a9e', boxShadow: '0 0 10px rgba(255, 154, 158, 0.6)' }}
            />
          )}
        </p>

        {/* Next Indicator */}
        {!isTyping && onNext && (
          <div
            className="absolute bottom-6 right-8 animate-bounce flex items-center justify-center"
            style={{ 
              color: '#ff9a9e', 
              fontSize: '28px',
              textShadow: '0 4px 10px rgba(255, 154, 158, 0.5)'
            }}
          >
            ✧
          </div>
        )}
      </div>
    </div>
  );
}