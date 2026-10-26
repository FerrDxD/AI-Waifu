import { vi } from 'vitest';

/**
 * Setup global test (M4, memperbaiki bug laten sejak M2.7).
 *
 * MASALAH: `vi.mock` hanya bisa mengganti modul yang BELUM masuk registry
 * worker. Karena suite ini memakai `isolate: false` (keputusan M0 demi
 * kecepatan di Windows), registry modul dibagi antar file test dalam satu
 * worker. Ada file yang meng-import `@/lib/gemini` TANPA mem-mock SDK
 * (`tests/evals-dataset.test.ts` butuh `buildChatPrompt`), dan file itu
 * menarik `@google/generative-ai` yang asli ke registry.
 *
 * Akibatnya: kalau file tersebut kebetulan berjalan LEBIH DULU di worker yang
 * sama, `vi.mock('@google/generative-ai')` di `ai-provider.test.ts` dan
 * `ai-stream.test.ts` tidak lagi berpengaruh. Test lalu benar-benar memanggil
 * jaringan Google, gagal dengan "API key not valid", dan 24 test merah.
 *
 * Itu kegagalan yang bergantung pada URUTAN FILE, bukan pada kode — jenis
 * flake paling mahal karena hasilnya berbeda tiap kali file test ditambah.
 *
 * SOLUSI: daftarkan mock di setup file, yang berjalan SEBELUM file test mana
 * pun di worker tersebut meng-import apa pun. Dengan begitu SDK asli tidak
 * pernah masuk registry, urutan file tidak lagi relevan.
 *
 * Mock ini aman untuk seluruh suite: tidak ada test yang benar-benar ingin
 * memanggil API sungguhan (eval live memakai `evals/run.ts`, bukan vitest).
 */
vi.mock('@google/generative-ai', async () => {
  const { sdkModuleMock } = await import('./gemini-sdk-mock');
  return sdkModuleMock();
});