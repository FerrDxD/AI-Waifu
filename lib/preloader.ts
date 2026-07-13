'use client';

// Menyimpan referensi Image di memori agar cache browser tidak menghapusnya
const imageCache: HTMLImageElement[] = [];

export function preloadLiviaSprites() {
  if (typeof window === 'undefined') return;

  const expressions = ['normal', 'happy', 'blushing', 'angry', 'pouting', 'surprised', 'sad'];
  
  // Ambil outfit aktif saat ini dari localStorage
  let activeOutfit = 'default';
  try {
    const savedOutfit = localStorage.getItem('livia_outfit');
    if (savedOutfit) activeOutfit = savedOutfit.replace('outfit_', '');
  } catch (e) {}

  const homeFolderMap: Record<string, string> = {
    'default': 'default',
    'school': 'hightscool uniform',
    'trench_coat': 'trench-coat',
    'office_lady': 'office-lady',
  };

  const folderName = homeFolderMap[activeOutfit] || activeOutfit;

  // 1. Prioritas Utama: Langsung preload sprite yang paling awal/sering dilihat
  const criticalUrls = [
    '/livia/chibi-livia.webp',
    `/livia/home-screen/${folderName}/normal.webp`,
    `/livia/home-screen/${folderName}/happy.webp`,
  ];

  // 2. Prioritas Kedua & Lanjutan: Diproses bertahap di latar belakang (idle batching)
  const secondaryUrls = [
    ...expressions.filter(expr => expr !== 'normal' && expr !== 'happy').map(expr => `/livia/home-screen/${folderName}/${expr}.webp`),
    ...(activeOutfit !== 'default' ? expressions.map(expr => `/livia/home-screen/default/${expr}.webp`) : []),
    '/livia/wardrobe/wedding_dress.webp',
    '/livia/wardrobe/office_lady.webp',
    '/livia/wardrobe/piyama.webp',
    '/livia/story page/default.webp',
    '/livia/story page/uniform.webp',
    '/livia/story page/casual.webp',
    '/livia/story page/office-lady.webp',
    '/livia/story page/piyama.webp',
    '/livia/story page/wedding-dress.webp',
    '/naomi/normal.webp',
    '/naomi/happy.webp',
    '/naomi/confused.webp',
    '/naomi/pleased.webp',
    '/naomi/touched.webp',
  ];

  const loadImage = (url: string) => {
    if (!imageCache.some(img => img.src.endsWith(url))) {
      const img = new Image();
      img.src = url;
      imageCache.push(img);
    }
  };

  // Muat gambar prioritas utama langsung
  criticalUrls.forEach(loadImage);

  // Muat gambar sisanya secara bertahap (staggered idle batch) agar tidak membebani network / RAM di awal
  let index = 0;
  const loadBatch = () => {
    if (index >= secondaryUrls.length) return;
    const batchSize = 3;
    for (let i = 0; i < batchSize && index < secondaryUrls.length; i++) {
      loadImage(secondaryUrls[index++]);
    }
    if (index < secondaryUrls.length) {
      setTimeout(loadBatch, 300);
    }
  };

  // Mulai antrean pemuatan latar setelah halaman selesai render awal (800ms)
  setTimeout(loadBatch, 800);
}

