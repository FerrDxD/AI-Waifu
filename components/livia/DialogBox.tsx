'use client';

import { useEffect, useState, useRef } from 'react';

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
    }, 28);

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
      className="w-full cursor-pointer select-none relative"
      style={{ minHeight: '110px' }}
    >
      {/* Container utama */}
      <div
        className="w-full px-7 py-5 relative transition-all duration-200"
        style={{
          background: isNarrator
            ? 'rgba(10,9,8,0.7)'
            : 'rgba(15,13,11,0.88)',
          backdropFilter: 'blur(12px)',
          border: isNarrator
            ? '1px solid rgba(196,149,106,0.1)'
            : '1px solid rgba(196,149,106,0.2)',
          borderRadius: isNarrator ? '4px' : '4px',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Speaker label */}
        {!isNarrator && speaker && (
          <div
            className="font-display italic text-sm mb-2"
            style={{ color: '#c4956a' }}
          >
            {speaker}
          </div>
        )}

        {/* Teks */}
        <p
          className="leading-relaxed"
          style={{
            fontFamily: isNarrator
              ? "'DM Mono', monospace"
              : "'DM Sans', sans-serif",
            fontSize: isNarrator ? '13px' : '15px',
            color: isNarrator ? 'rgba(201,195,184,0.6)' : '#e8e0d0',
            fontStyle: isNarrator ? 'italic' : 'normal',
            letterSpacing: isNarrator ? '0.05em' : 'normal',
          }}
        >
          {displayedText}
          {/* Cursor saat typing */}
          {isTyping && (
            <span
              className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-[blink_0.8s_ease-in-out_infinite]"
              style={{ background: '#c4956a' }}
            />
          )}
        </p>

        {/* Indikator next */}
        {!isTyping && onNext && (
          <div
            className="absolute bottom-4 right-5 animate-[bounce_1s_ease-in-out_infinite]"
            style={{ color: 'rgba(196,149,106,0.7)', fontSize: '12px' }}
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