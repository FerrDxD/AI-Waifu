'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Preferensi model AI di sisi client (M8.1 Phase 2).
 *
 * Daftar model TIDAK ditulis di komponen: server mengirim `models` dari
 * `AI_ALLOWED_MODELS`. Kalau owner menambah/menghapus model, UI ikut sendiri
 * tanpa deploy ulang frontend.
 */

export interface ModelOption {
  id: string;
  label: string;
}

export interface ModelPreference {
  model: string | null;
  models: ModelOption[];
}

interface State extends ModelPreference {
  loading: boolean;
  error: string | null;
}

const EMPTY: State = { model: null, models: [], loading: true, error: null };

async function fetchPreference(): Promise<ModelPreference> {
  const res = await fetch('/api/user/model', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!res.ok) throw new Error('Gagal memuat daftar model.');

  const data = (await res.json()) as Partial<ModelPreference>;
  return {
    model: typeof data.model === 'string' ? data.model : null,
    models: Array.isArray(data.models)
      ? data.models.filter(
          (option): option is ModelOption =>
            Boolean(option) && typeof option.id === 'string' && typeof option.label === 'string'
        )
      : [],
  };
}

export function useModelPreference() {
  const [state, setState] = useState<State>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const pref = await fetchPreference();
      setState({ ...pref, loading: false, error: null });
      return pref;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Gagal memuat daftar model.',
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pref = await fetchPreference();
        if (cancelled) return;
        setState({ ...pref, loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState({
          ...EMPTY,
          loading: false,
          error: error instanceof Error ? error.message : 'Gagal memuat daftar model.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** `null` = kembali ke model server. Melempar error supaya UI bisa try/catch. */
  const save = useCallback(async (model: string | null) => {
    const res = await fetch('/api/user/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ model }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : 'Gagal menyimpan model.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }

    const next: ModelPreference = {
      model: typeof data.model === 'string' ? data.model : null,
      models: Array.isArray(data.models) ? data.models : state.models,
    };
    setState({ ...next, loading: false, error: null });
    return next;
  }, [state.models]);

  return { ...state, refresh, save };
}
