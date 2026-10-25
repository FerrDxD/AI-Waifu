'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Klien API key Gemini (M0/H0.1).
 *
 * PERUBAHAN BESAR dibanding versi lama:
 * - TIDAK ada `localStorage` → tidak bisa dibaca XSS / dependency yang disusupi,
 *   dan tidak ikut tercatat di file backup.
 * - TIDAK ada cookie → cookie non-HttpOnly sama saja dengan localStorage.
 * - Key disimpan TERENKRIPSI di server (`/api/user/api-key`). Browser hanya
 *   pernah menerima `keyHint` (4 karakter terakhir), tidak pernah key utuh.
 *
 * Akibatnya key tetap aktif setelah reload (berbeda dari pendekatan
 * memory-only), tanpa menaruh rahasia di tempat yang bisa dibaca script.
 */

const LEGACY_LOCAL_STORAGE_KEY = 'custom_gemini_api_key';
const LEGACY_COOKIE_KEY = 'custom_gemini_api_key';

export interface ApiKeyStatus {
  hasKey: boolean;
  keyHint?: string;
  provider?: string;
  updatedAt?: string;
}

/**
 * Bersihkan sisa penyimpanan lama dari versi aplikasi sebelumnya.
 * Dipanggil sekali saat boot supaya key yang sudah telanjur tersimpan
 * di localStorage/cookie tidak terus menetap di browser user.
 */
export function purgeLegacyApiKeyStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  } catch {
    // localStorage bisa diblokir (mode privat / kebijakan browser) — abaikan.
  }

  try {
    document.cookie = `${LEGACY_COOKIE_KEY}=; path=/; max-age=0; SameSite=Strict`;
    document.cookie = `${LEGACY_COOKIE_KEY}=; path=/api; max-age=0; SameSite=Strict`;
  } catch {
    // ignore
  }
}

/** Ambil status key dari server (tidak pernah mengembalikan key utuh). */
export async function fetchApiKeyStatus(): Promise<ApiKeyStatus> {
  try {
    const res = await fetch('/api/user/api-key', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (!res.ok) return { hasKey: false };

    const data = (await res.json()) as ApiKeyStatus;
    return { hasKey: Boolean(data.hasKey), keyHint: data.keyHint, provider: data.provider };
  } catch {
    return { hasKey: false };
  }
}

/**
 * Simpan key ke server (dienkripsi di sana).
 * Mengembalikan status baru atau pesan error yang aman ditampilkan.
 */
export async function saveApiKey(
  apiKey: string
): Promise<{ ok: true; status: ApiKeyStatus } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/user/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ apiKey }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data?.error || 'Gagal menyimpan API key.' };
    }

    return { ok: true, status: { hasKey: true, keyHint: data.keyHint } };
  } catch {
    return { ok: false, error: 'Tidak bisa menghubungi server. Coba lagi.' };
  }
}

/** Hapus key dari server → kembali memakai key server. */
export async function deleteApiKey(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/user/api-key', {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data?.error || 'Gagal menghapus API key.' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Tidak bisa menghubungi server. Coba lagi.' };
  }
}

// ---------------------------------------------------------------------------
// Hook React
// ---------------------------------------------------------------------------

export interface ApiKeyHookState extends ApiKeyStatus {
  /** true selama status awal masih di-fetch. */
  loading: boolean;
  /** Pesan error terakhir (sudah aman ditampilkan ke user). */
  error: string | null;
}

/**
 * Status API key + aksi simpan/hapus.
 *
 * `save()` dan `remove()` MELEMPAR error (bukan mengembalikan objek) supaya
 * komponen bisa pakai try/catch biasa. `refresh()` dipakai ulang setelah aksi.
 */
export function useApiKeyStatus() {
  const [state, setState] = useState<ApiKeyHookState>({
    hasKey: false,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    const status = await fetchApiKeyStatus();
    setState({ ...status, loading: false, error: null });
    return status;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const status = await fetchApiKeyStatus();
      if (cancelled) return;
      setState({ ...status, loading: false, error: null });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (key: string) => {
    const result = await saveApiKey(key);
    if (!result.ok) {
      setState((prev) => ({ ...prev, loading: false, error: result.error }));
      throw new Error(result.error);
    }
    setState({ ...result.status, loading: false, error: null });
    return result.status;
  }, []);

  const remove = useCallback(async () => {
    const result = await deleteApiKey();
    if (!result.ok) {
      setState((prev) => ({ ...prev, loading: false, error: result.error ?? 'Gagal menghapus API key.' }));
      throw new Error(result.error ?? 'Gagal menghapus API key.');
    }
    setState({ hasKey: false, loading: false, error: null });
  }, []);

  return { ...state, refresh, save, remove };
}
