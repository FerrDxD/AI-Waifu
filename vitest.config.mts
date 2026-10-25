import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    // Pool `forks` gagal start di Windows (worker timeout). `threads`
    // lebih ringan dan stabil di environment ini.
    pool: 'threads',
    // Reuse worker antar file: memangkas ~15 detik startup di mesin ini.
    isolate: false,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Fokus ke logika murni dulu; route handler & komponen React menyusul.
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.d.ts',
        'lib/db/schema.ts',
        'lib/i18n/**',
        'lib/livia/items.ts',
        'lib/livia/recipes.ts',
        'lib/livia/seeds.ts',
        'lib/sfx.ts',
        'lib/preloader.ts',
        'lib/alert.ts',
      ],
      thresholds: {
        // Target M1.3: 30% pada lib/. Dinaikkan bertahap di milestone berikutnya.
        lines: 30,
        functions: 30,
        statements: 30,
        branches: 20,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
