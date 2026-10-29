'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Karakter aktif di sisi client (M8.2 Phase B).
 *
 * Daftar karakter TIDAK ditulis di komponen: server mengirimnya dari registry
 * (`content/characters/*.json`). Kalau owner menambah karakter, UI ikut
 * sendiri tanpa deploy ulang frontend.
 *
 * `save()` mengembalikan pilihan terbaru dan melempar error supaya UI bisa
 * menampilkan toast. Grafik sprite dibiarkan pada komponen — hook ini hanya
 * state + transport.
 */

export interface CharacterOption {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  /** Path sprite untuk preview (ekspresi normal). */
  previewSprite: string;
}

export interface CharacterChoice {
  characterId: string;
  characters: CharacterOption[];
}

interface State extends CharacterChoice {
  loading: boolean;
  error: string | null;
}

const EMPTY: State = { characterId: 'livia', characters: [], loading: true, error: null };

function isOption(value: unknown): value is CharacterOption {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as CharacterOption).id === 'string' &&
    typeof (value as CharacterOption).name === 'string'
  );
}

function parseChoice(data: unknown): CharacterChoice {
  const payload = (data ?? {}) as Partial<CharacterChoice>;
  return {
    characterId: typeof payload.characterId === 'string' ? payload.characterId : 'livia',
    characters: Array.isArray(payload.characters) ? payload.characters.filter(isOption) : [],
  };
}

async function fetchChoice(): Promise<CharacterChoice> {
  const res = await fetch('/api/user/character', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!res.ok) throw new Error('Gagal memuat daftar karakter.');

  return parseChoice(await res.json().catch(() => ({})));
}

export function useActiveCharacter() {
  const [state, setState] = useState<State>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const choice = await fetchChoice();
      setState({ ...choice, loading: false, error: null });
      return choice;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Gagal memuat daftar karakter.',
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const choice = await fetchChoice();
        if (cancelled) return;
        setState({ ...choice, loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState({
          ...EMPTY,
          loading: false,
          error: error instanceof Error ? error.message : 'Gagal memuat daftar karakter.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Pindah karakter aktif. Melempar error supaya UI bisa try/catch. */
  const save = useCallback(async (characterId: string) => {
    const res = await fetch('/api/user/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ characterId }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : 'Gagal mengganti karakter.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }

    const next = parseChoice(data);
    setState({ ...next, loading: false, error: null });
    return next;
  }, []);

  return { ...state, refresh, save };
}
