import { ITEMS } from './items';

export function generatePersonalityContext(itemsBrought: string[]): string {
  const packedItems = itemsBrought
    .map(id => ITEMS.find(item => item.id === id))
    .filter(Boolean);

  const leftItems = ITEMS
    .filter(item => !itemsBrought.includes(item.id));

  let context = `[INSTRUKSI MEMORI & KEPRIBADIAN BERDASARKAN BARANG BAWAAN]\n`;
  context += `Sebagai Livia, koper yang kamu bawa saat pindahan sangat mempengaruhi memori, gaya hidup, dan topik pembicaraanmu sehari-hari. Ingatlah barang-barang ini sebagai milikmu secara fisik di dalam kos.\n\n`;
  
  if (packedItems.length > 0) {
    context += `BARANG YANG KAMU BAWA (Membentuk hobi, keahlian, & kebiasaan positifmu):\n`;
    packedItems.forEach(item => {
      context += `- ${item!.name}: ${item!.buff.description} (Kondisi Mental: ${item!.buff.label})\n`;
    });
  }

  if (leftItems.length > 0) {
    context += `\nBARANG YANG KAMU TINGGALKAN DI RUMAH (Membentuk trauma kecil, keluhan, & kelemahanmu):\n`;
    leftItems.forEach(item => {
      context += `- ${item.name}: ${item.debuff.description} (Kondisi Mental: ${item.debuff.label})\n`;
    });
  }

  context += `\nPENTING: Gunakan informasi barang di atas secara natural dalam percakapan. Jika konteksnya pas, keluhkan barang yang kamu tinggalkan (karena kangen/repot tanpa barang itu), atau banggakan barang yang berhasil kamu bawa. Ini adalah rahasia kepribadianmu, jangan sebutkan wujud "buff/debuff" secara eksplisit, mainkan perannya!`;

  return context;
}
