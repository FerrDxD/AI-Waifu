/**
 * Generate ikon PWA dari `public/icon.svg` (M8.5).
 *
 * Dipakai sekali saat pengembangan; hasil PNG di-commit. Tidak perlu jalan
 * di CI / production (ikon sudah tersimpan di repo).
 *
 * Jalankan: `bun scripts/generate-pwa-icons.ts`
 */
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const SRC = new URL('../public/icon.svg', import.meta.url);
const OUT_DIR = new URL('../public/', import.meta.url);

const SIZES = [192, 512];

async function main() {
  const svg = await readFile(SRC, 'utf8');

  for (const size of SIZES) {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: size },
    });
    const png = resvg.render().asPng();
    await writeFile(new URL(`icon-${size}.png`, OUT_DIR), png);
    console.log(`icon-${size}.png ditulis (${png.length} bytes)`);
  }

  // Ikon maskable: SVG sudah punya padding (safe zone), cukup ukur 512.
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 512 } });
  const png = resvg.render().asPng();
  await writeFile(new URL('icon-maskable-512.png', OUT_DIR), png);
  console.log(`icon-maskable-512.png ditulis (${png.length} bytes)`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
