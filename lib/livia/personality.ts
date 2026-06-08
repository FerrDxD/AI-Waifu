import { ITEMS } from './items';

export function generatePersonalityContext(itemsBrought: string[]): string {
  const activeBuffs = itemsBrought
    .map(id => ITEMS.find(item => item.id === id))
    .filter(Boolean)
    .map(item => item!.buff);

  const activeDebuffs = ITEMS
    .filter(item => !itemsBrought.includes(item.id))
    .map(item => item.debuff);

  let context = "Konteks Sifat Livia Berdasarkan Barang Bawaannya:\n";
  
  if (activeBuffs.length > 0) {
    context += "Kekuatan/Sifat Positif Livia:\n";
    activeBuffs.forEach(buff => {
      context += `- ${buff.label}: ${buff.description}\n`;
    });
  }

  if (activeDebuffs.length > 0) {
    context += "\nKelemahan/Sifat Negatif Livia:\n";
    activeDebuffs.forEach(debuff => {
      context += `- ${debuff.label}: ${debuff.description}\n`;
    });
  }

  return context;
}
