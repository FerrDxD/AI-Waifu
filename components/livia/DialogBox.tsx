'use client';

import { useEffect, useState } from 'react';

interface DialogBoxProps {
  text: string;
  speaker?: string;
  onNext?: () => void;
}

export default function DialogBox({ text, speaker = 'Livia', onNext }: DialogBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    
    // Typewriter effect
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  const handleClick = () => {
    if (isTyping) {
      // Skip typing
      setDisplayedText(text);
      setIsTyping(false);
    } else if (onNext) {
      onNext();
    }
  };

  return (
    <div 
      className="w-full bg-background/80 backdrop-blur-md border border-custom p-6 rounded-sm cursor-pointer shadow-lg relative min-h-[120px]"
      onClick={handleClick}
    >
      {speaker && (
        <div className="absolute -top-4 left-4 bg-accent text-black px-4 py-1 font-display font-bold italic shadow-md">
          {speaker}
        </div>
      )}
      
      <p className="text-lg leading-relaxed text-text-primary mt-2">
        {displayedText}
      </p>

      {!isTyping && onNext && (
        <div className="absolute bottom-4 right-4 animate-bounce text-accent text-xl">
          ▼
        </div>
      )}
    </div>
  );
}
