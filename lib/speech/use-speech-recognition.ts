'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { collectTranscript, type RecognitionResultEvent } from './transcript';

/**
 * Hook diktasi suara untuk halaman chat (M6.3) — Web Speech API.
 *
 * Pola PTT (push-to-talk): satu tap mulai diktasi, tap lagi / hening
 * otomatis berhenti. Transkrip live (final + interim) dibagikan ke UI
 * supaya user melihat kata-kata muncul dan bisa MENGEDIT sebelum kirim.
 *
 * Beda dengan `CallSession` (call): di call listening-nya continuous +
 * auto-restart dengan barge-in; di chat cukup satu ucapan per tap —
 * lifecycle lebih sederhana, jadi hook React pas.
 *
 * Catatan browser:
 *  - `rec.start()` di iOS Safari harus dipanggil dari user gesture
 *    (handler klik) — hook sengaja tidak auto-start.
 *  - `supported` baru true setelah mount (hindari hydration mismatch —
 *    Web Speech API tidak ada di server).
 */

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionLike;
    webkitSpeechRecognition: new () => SpeechRecognitionLike;
  }
}

export type SpeechRecognitionHandle = {
  /** true = browser mendukung Web Speech API (setelah mount). */
  supported: boolean;
  /** true = recognition sedang berjalan. */
  listening: boolean;
  /** Transkrip live (final + interim) sesi diktasi ini. */
  transcript: string;
  /** Hasil final saja (tanpa interim). */
  finalText: string;
  /** Mulai diktasi (idempoten — noop kalau sudah listening). */
  start: () => void;
  /** Berhenti (onend menyusul; cleanup di onend). */
  stop: () => void;
};

export function useSpeechRecognition(
  onError?: (code: string) => void
): SpeechRecognitionHandle {
  const [ready, setReady] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    setReady(true);
  }, []);

  const supported =
    ready &&
    Boolean(
      typeof window !== 'undefined' &&
        (window.SpeechRecognition || window.webkitSpeechRecognition)
    );

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || recognitionRef.current) return;

    const rec = new SR();
    // PTT: satu ucapan per tap — sesuai pola pesan chat.
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'id-ID';

    rec.onstart = () => {
      setFinalText('');
      setInterim('');
      setListening(true);
    };
    rec.onresult = (event: RecognitionResultEvent) => {
      const snapshot = collectTranscript(event);
      setFinalText(snapshot.final);
      setInterim(snapshot.interim);
    };
    rec.onerror = (event) => {
      // 'no-speech'/'aborted' wajar (hening / dibatalkan) — caller
      // memutuskan mana yang perlu ditampilkan.
      onErrorRef.current?.(event?.error ?? 'unknown');
    };
    rec.onend = () => {
      // Stop(), hening, dan error semuanya bermuara di sini.
      recognitionRef.current = null;
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Unmount: batalkan recognition aktif (abort = tanpa onend).
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    []
  );

  return {
    supported,
    listening,
    transcript: (finalText + interim).trim(),
    finalText,
    start,
    stop,
  };
}
