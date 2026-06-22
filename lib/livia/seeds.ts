export interface SeedData {
  id: string;
  name: string;
  icon: string;
  cost: number;
  growTimeMinutes: number;
  yield: number;
  yieldType: 'money_affection' | 'money_ingredient';
  ingredientId?: string;
}

export const SEED_CATALOG: SeedData[] = [
  // Sayuran Dasar
  { id: 'tomato', name: 'Bibit Tomat', icon: '🍅', cost: 100, growTimeMinutes: 60, yield: 3, yieldType: 'money_ingredient', ingredientId: 'tomat_segar' },
  { id: 'carrot', name: 'Wortel Oranye', icon: '🥕', cost: 120, growTimeMinutes: 90, yield: 2, yieldType: 'money_ingredient', ingredientId: 'wortel' },
  { id: 'corn', name: 'Jagung Manis', icon: '🌽', cost: 150, growTimeMinutes: 120, yield: 3, yieldType: 'money_ingredient', ingredientId: 'jagung' },
  { id: 'potato', name: 'Kentang', icon: '🥔', cost: 110, growTimeMinutes: 100, yield: 4, yieldType: 'money_ingredient', ingredientId: 'kentang' },
  { id: 'eggplant', name: 'Terong Ungu', icon: '🍆', cost: 130, growTimeMinutes: 110, yield: 2, yieldType: 'money_ingredient', ingredientId: 'terong' },
  { id: 'broccoli', name: 'Brokoli Hijau', icon: '🥦', cost: 160, growTimeMinutes: 140, yield: 1, yieldType: 'money_ingredient', ingredientId: 'brokoli' },
  { id: 'cucumber', name: 'Timun Segar', icon: '🥒', cost: 90, growTimeMinutes: 80, yield: 3, yieldType: 'money_ingredient', ingredientId: 'timun' },
  { id: 'lettuce', name: 'Selada Air', icon: '🥬', cost: 80, growTimeMinutes: 60, yield: 2, yieldType: 'money_ingredient', ingredientId: 'selada' },
  { id: 'garlic', name: 'Bawang Putih', icon: '🧄', cost: 200, growTimeMinutes: 180, yield: 5, yieldType: 'money_ingredient', ingredientId: 'bawang_putih' },
  { id: 'onion', name: 'Bawang Bombay', icon: '🧅', cost: 190, growTimeMinutes: 170, yield: 4, yieldType: 'money_ingredient', ingredientId: 'bawang_bombay' },
  { id: 'mushroom', name: 'Jamur Payung', icon: '🍄', cost: 250, growTimeMinutes: 200, yield: 2, yieldType: 'money_ingredient', ingredientId: 'jamur' },
  { id: 'bell_pepper', name: 'Paprika Merah', icon: '🫑', cost: 180, growTimeMinutes: 150, yield: 2, yieldType: 'money_ingredient', ingredientId: 'paprika' },
  { id: 'chili', name: 'Cabai Rawit', icon: '🌶️', cost: 220, growTimeMinutes: 160, yield: 6, yieldType: 'money_ingredient', ingredientId: 'cabai' },
  { id: 'sweet_potato', name: 'Ubi Jalar', icon: '🍠', cost: 140, growTimeMinutes: 120, yield: 3, yieldType: 'money_ingredient', ingredientId: 'ubi' },
  
  // Buah-buahan
  { id: 'strawberry', name: 'Bibit Stroberi', icon: '🍓', cost: 250, growTimeMinutes: 180, yield: 4, yieldType: 'money_affection' },
  { id: 'watermelon', name: 'Semangka Air', icon: '🍉', cost: 400, growTimeMinutes: 300, yield: 1, yieldType: 'money_affection' },
  { id: 'melon', name: 'Melon Manis', icon: '🍈', cost: 380, growTimeMinutes: 280, yield: 1, yieldType: 'money_affection' },
  { id: 'grapes', name: 'Anggur Ungu', icon: '🍇', cost: 450, growTimeMinutes: 360, yield: 5, yieldType: 'money_affection' },
  { id: 'lemon', name: 'Jeruk Lemon', icon: '🍋', cost: 300, growTimeMinutes: 240, yield: 3, yieldType: 'money_ingredient', ingredientId: 'lemon' },
  { id: 'orange', name: 'Jeruk Manis', icon: '🍊', cost: 320, growTimeMinutes: 260, yield: 3, yieldType: 'money_affection' },
  { id: 'apple', name: 'Apel Merah', icon: '🍎', cost: 350, growTimeMinutes: 300, yield: 4, yieldType: 'money_affection' },
  { id: 'green_apple', name: 'Apel Hijau', icon: '🍏', cost: 340, growTimeMinutes: 290, yield: 4, yieldType: 'money_affection' },
  { id: 'peach', name: 'Buah Persik', icon: '🍑', cost: 400, growTimeMinutes: 320, yield: 2, yieldType: 'money_affection' },
  { id: 'cherry', name: 'Ceri Merah', icon: '🍒', cost: 420, growTimeMinutes: 340, yield: 6, yieldType: 'money_affection' },
  { id: 'pineapple', name: 'Nanas Tropis', icon: '🍍', cost: 500, growTimeMinutes: 400, yield: 1, yieldType: 'money_ingredient', ingredientId: 'nanas' },
  { id: 'mango', name: 'Mangga Harum', icon: '🥭', cost: 480, growTimeMinutes: 380, yield: 2, yieldType: 'money_affection' },
  { id: 'banana', name: 'Pisang Cavendish', icon: '🍌', cost: 280, growTimeMinutes: 220, yield: 5, yieldType: 'money_ingredient', ingredientId: 'pisang' },
  { id: 'kiwi', name: 'Kiwi Asam Manis', icon: '🥝', cost: 360, growTimeMinutes: 270, yield: 3, yieldType: 'money_affection' },
  { id: 'coconut', name: 'Kelapa Muda', icon: '🥥', cost: 600, growTimeMinutes: 480, yield: 1, yieldType: 'money_ingredient', ingredientId: 'kelapa' },
  { id: 'blueberries', name: 'Bluberi Liar', icon: '🫐', cost: 550, growTimeMinutes: 420, yield: 8, yieldType: 'money_affection' },

  // Bunga & Tanaman Hias
  { id: 'sunflower', name: 'Bunga Matahari', icon: '🌻', cost: 500, growTimeMinutes: 400, yield: 1, yieldType: 'money_affection' },
  { id: 'rose', name: 'Mawar Merah', icon: '🌹', cost: 800, growTimeMinutes: 600, yield: 1, yieldType: 'money_affection' },
  { id: 'tulip', name: 'Tulip Musim Semi', icon: '🌷', cost: 750, growTimeMinutes: 540, yield: 1, yieldType: 'money_affection' },
  { id: 'blossom', name: 'Bunga Sakura', icon: '🌸', cost: 1200, growTimeMinutes: 720, yield: 1, yieldType: 'money_affection' },
  { id: 'hibiscus', name: 'Bunga Sepatu', icon: '🌺', cost: 650, growTimeMinutes: 480, yield: 1, yieldType: 'money_affection' },
  { id: 'lotus', name: 'Teratai Air', icon: '🪷', cost: 900, growTimeMinutes: 660, yield: 1, yieldType: 'money_affection' },
  { id: 'cactus', name: 'Kaktus Gurun', icon: '🌵', cost: 450, growTimeMinutes: 720, yield: 1, yieldType: 'money_affection' }, // Lama tumbuh tapi aman jarang disiram (secara kanon)
  { id: 'shamrock', name: 'Daun Semanggi', icon: '☘️', cost: 300, growTimeMinutes: 200, yield: 4, yieldType: 'money_affection' },
  { id: 'four_leaf', name: 'Semanggi Langka', icon: '🍀', cost: 2000, growTimeMinutes: 1440, yield: 1, yieldType: 'money_affection' }, // Sangat mahal dan butuh 24 jam

  // Kacang-kacangan & Lainnya
  { id: 'peanut', name: 'Kacang Tanah', icon: '🥜', cost: 160, growTimeMinutes: 130, yield: 5, yieldType: 'money_ingredient', ingredientId: 'kacang' },
  { id: 'chestnut', name: 'Kacang Kastanye', icon: '🌰', cost: 240, growTimeMinutes: 190, yield: 3, yieldType: 'money_ingredient', ingredientId: 'kastanye' },
  { id: 'olive', name: 'Zaitun Hitam', icon: '🫒', cost: 320, growTimeMinutes: 250, yield: 4, yieldType: 'money_ingredient', ingredientId: 'zaitun' },
  { id: 'coffee', name: 'Biji Kopi Asli', icon: '☕', cost: 600, growTimeMinutes: 400, yield: 2, yieldType: 'money_ingredient', ingredientId: 'biji_kopi' },
  { id: 'tea', name: 'Daun Teh Hijau', icon: '🍵', cost: 550, growTimeMinutes: 380, yield: 3, yieldType: 'money_ingredient', ingredientId: 'daun_teh' },
  
  // Eksotis & Magis (Harga Fantastis)
  { id: 'magic_bean', name: 'Kacang Ajaib', icon: '🌱', cost: 5000, growTimeMinutes: 2880, yield: 1, yieldType: 'money_affection' }, // 2 hari tumbuh
  { id: 'crystal_apple', name: 'Apel Kristal', icon: '💎', cost: 7500, growTimeMinutes: 4320, yield: 1, yieldType: 'money_affection' }, // 3 hari
  { id: 'golden_corn', name: 'Jagung Emas', icon: '✨', cost: 10000, growTimeMinutes: 5760, yield: 1, yieldType: 'money_affection' }, // 4 hari
  { id: 'star_fruit', name: 'Buah Bintang', icon: '🌟', cost: 15000, growTimeMinutes: 7200, yield: 1, yieldType: 'money_affection' }, // 5 hari
  { id: 'moon_flower', name: 'Bunga Bulan', icon: '🌙', cost: 20000, growTimeMinutes: 8640, yield: 1, yieldType: 'money_affection' }, // 6 hari
  { id: 'love_fruit', name: 'Buah Cinta', icon: '💖', cost: 50000, growTimeMinutes: 10080, yield: 1, yieldType: 'money_affection' }, // 7 hari
];
