import CallClient from '@/features/call/CallClient';
import CharacterGate from '@/components/characters/CharacterGate';

/**
 * Route tipis (M5.1): seluruh implementasi layar hidup di features/call/CallClient.tsx
 * supaya file page tidak lagi menjadi monolit.
 *
 * M8.2 Phase B: panggilan suara hanya untuk karakter yang punya voice sendiri
 * (saat ini Livia).
 */
export default function Page() {
  return (
    <CharacterGate feature="voiceCall">
      <CallClient />
    </CharacterGate>
  );
}
