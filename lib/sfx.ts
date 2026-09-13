'use client';

// Singleton AudioContext supaya tidak boros memori browser
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getVolume(): number {
  if (typeof window === 'undefined') return 0.2;
  const saved = localStorage.getItem('sfx_volume');
  if (saved !== null) {
    const val = parseInt(saved, 10);
    if (!isNaN(val)) return (val / 100) * 0.25; // Scale max volume to comfortable 0.25 gain
  }
  return 0.2; // Default 80% -> 0.2 gain
}

export type SfxType = 'click' | 'pop' | 'coin' | 'paper' | 'chime' | 'error';

export function playSfx(type: SfxType) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const volume = getVolume();
  if (volume <= 0) return;

  const now = ctx.currentTime;

  try {
    // Helper to safely play and cleanup nodes
    const playAndCleanup = (source: AudioScheduledSourceNode, gain: GainNode, startTime: number, stopTime: number) => {
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(startTime);
      if (source instanceof OscillatorNode) {
        source.stop(stopTime);
      }
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
    };

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
      gain.gain.setValueAtTime(volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      playAndCleanup(osc, gain, now, now + 0.035);
    } 
    else if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
      gain.gain.setValueAtTime(volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      playAndCleanup(osc, gain, now, now + 0.065);
    }
    else if (type === 'coin') {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now);
      gain1.gain.setValueAtTime(volume * 0.7, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      playAndCleanup(osc1, gain1, now, now + 0.085);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.06);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(volume * 0.9, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      playAndCleanup(osc2, gain2, now + 0.06, now + 0.29);
    }
    else if (type === 'paper') {
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.Q.setValueAtTime(3, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.7, now);
      gain.gain.linearRampToValueAtTime(volume * 0.9, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.125);
      noise.onended = () => {
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
    else if (type === 'chime') {
      const notes = [1046.50, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.setValueAtTime(volume * 0.6, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        playAndCleanup(osc, gain, startTime, startTime + 0.36);
      });
    }
    else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      playAndCleanup(osc, gain, now, now + 0.16);
    }
  } catch (err) {
    // Abaikan error jika Web Audio diblokir kebijakan browser sebelum interaksi
  }
}
