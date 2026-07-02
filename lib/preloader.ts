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

  const urlsToPreload = [
    '/livia/chibi-livia.webp',
    ...expressions.map(expr => `/livia/home-screen/${folderName}/${expr}.webp`),
    // Preload juga outfit default kalau saat ini sedang pakai outfit lain
    ...(activeOutfit !== 'default' ? expressions.map(expr => `/livia/home-screen/default/${expr}.webp`) : [])
  ];

  urlsToPreload.forEach(url => {
    // Cek apakah sudah pernah di-preload
    if (!imageCache.some(img => img.src.endsWith(url))) {
      const img = new Image();
      img.src = url;
      imageCache.push(img);
    }
  });
}
