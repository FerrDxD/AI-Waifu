export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  desc: string;
  affectionDelta: number;
  hungerDelta: number;
  energyDelta: number;
}

export const RECIPES: Recipe[] = [
  // 1-10: Indonesia & Southeast Asia
  { id: 'nasi_goreng', name: 'Nasi Goreng Spesial', emoji: '🍳', cost: 200, desc: 'Bahan murah, rasa mewah. (+20 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 20, energyDelta: 5 },
  { id: 'sup_ayam', name: 'Sup Ayam Hangat', emoji: '🍲', cost: 500, desc: 'Nyaman di perut, pas buat musim hujan. (+30 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 30, energyDelta: 15 },
  { id: 'rendang', name: 'Rendang Padang', emoji: '🍛', cost: 1200, desc: 'Kaya rempah, dimasak berjam-jam. (+40 Lapar, +12 Afeksi)', affectionDelta: 12, hungerDelta: 40, energyDelta: 15 },
  { id: 'sate_ayam', name: 'Sate Ayam Madura', emoji: '🍢', cost: 600, desc: 'Bumbu kacangnya lumer di mulut! (+25 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 25, energyDelta: 10 },
  { id: 'gado_gado', name: 'Gado-Gado', emoji: '🥗', cost: 300, desc: 'Salad kearifan lokal yang menyehatkan. (+15 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 15, energyDelta: 20 },
  { id: 'tom_yum', name: 'Tom Yum Goong', emoji: '🥘', cost: 900, desc: 'Pedas, asam, segar dari Thailand! (+35 Lapar, +9 Afeksi)', affectionDelta: 9, hungerDelta: 35, energyDelta: 12 },
  { id: 'pad_thai', name: 'Pad Thai', emoji: '🍝', cost: 700, desc: 'Kwetiau goreng Thailand yang ikonik. (+30 Lapar, +7 Afeksi)', affectionDelta: 7, hungerDelta: 30, energyDelta: 10 },
  { id: 'pho', name: 'Pho Vietnam', emoji: '🍜', cost: 800, desc: 'Kaldu sapi yang hangat dan menenangkan. (+35 Lapar, +8 Afeksi)', affectionDelta: 8, hungerDelta: 35, energyDelta: 15 },
  { id: 'nasi_lemak', name: 'Nasi Lemak', emoji: '🍚', cost: 400, desc: 'Gurihnya santan dengan sambal teri. (+25 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 25, energyDelta: 8 },
  { id: 'hainanese_rice', name: 'Nasi Ayam Hainan', emoji: '🍱', cost: 850, desc: 'Ayam rebus lembut dengan nasi gurih. (+35 Lapar, +9 Afeksi)', affectionDelta: 9, hungerDelta: 35, energyDelta: 10 },

  // 11-20: Japan & Korea
  { id: 'sushi_platter', name: 'Sushi Omakase', emoji: '🍣', cost: 2000, desc: 'Ikan mentah premium yang meleleh di lidah. (+40 Lapar, +20 Afeksi)', affectionDelta: 20, hungerDelta: 40, energyDelta: 10 },
  { id: 'ramen', name: 'Tonkotsu Ramen', emoji: '🍜', cost: 1100, desc: 'Kuah kaldu tebal dengan chashu lembut. (+45 Lapar, +11 Afeksi)', affectionDelta: 11, hungerDelta: 45, energyDelta: 15 },
  { id: 'takoyaki', name: 'Takoyaki Osaka', emoji: '🐙', cost: 450, desc: 'Bola-bola gurita yang panas di dalam! (+15 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 15, energyDelta: 5 },
  { id: 'okonomiyaki', name: 'Okonomiyaki', emoji: '🥞', cost: 750, desc: 'Pancake gurih Jepang dengan saus manis. (+30 Lapar, +7 Afeksi)', affectionDelta: 7, hungerDelta: 30, energyDelta: 10 },
  { id: 'katsu_curry', name: 'Katsu Curry', emoji: '🍛', cost: 1000, desc: 'Ayam renyah berpadu kuah kari kental. (+40 Lapar, +10 Afeksi)', affectionDelta: 10, hungerDelta: 40, energyDelta: 12 },
  { id: 'kimchi_jjigae', name: 'Kimchi Jjigae', emoji: '🍲', cost: 850, desc: 'Sup kimchi pedas penambah energi. (+35 Lapar, +9 Afeksi)', affectionDelta: 9, hungerDelta: 35, energyDelta: 20 },
  { id: 'bibimbap', name: 'Dolsot Bibimbap', emoji: '🥣', cost: 900, desc: 'Nasi campur Korea di mangkuk batu panas. (+40 Lapar, +9 Afeksi)', affectionDelta: 9, hungerDelta: 40, energyDelta: 15 },
  { id: 'tteokbokki', name: 'Tteokbokki Pedas', emoji: '🍡', cost: 550, desc: 'Kue beras kenyal bersaus gochujang. (+20 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 20, energyDelta: 10 },
  { id: 'korean_bbq', name: 'Samgyeopsal BBQ', emoji: '🥩', cost: 1800, desc: 'Panggang daging Korea bersama Livia! (+50 Lapar, +18 Afeksi)', affectionDelta: 18, hungerDelta: 50, energyDelta: 20 },
  { id: 'jajangmyeon', name: 'Jajangmyeon', emoji: '🍝', cost: 700, desc: 'Mie saus kedelai hitam manis gurih. (+30 Lapar, +7 Afeksi)', affectionDelta: 7, hungerDelta: 30, energyDelta: 10 },

  // 21-30: China & Taiwan
  { id: 'peking_duck', name: 'Bebek Peking', emoji: '🦆', cost: 2500, desc: 'Kulit bebek krispi yang ikonik. (+60 Lapar, +25 Afeksi)', affectionDelta: 25, hungerDelta: 60, energyDelta: 15 },
  { id: 'dimsum', name: 'Dimsum Platter', emoji: '🥟', cost: 900, desc: 'Kukusan siomay, hakau, dan bapao. (+25 Lapar, +10 Afeksi)', affectionDelta: 10, hungerDelta: 25, energyDelta: 8 },
  { id: 'mapo_tofu', name: 'Mapo Tofu', emoji: '🥘', cost: 650, desc: 'Tahu lembut dengan saus mala pedas kebas. (+20 Lapar, +7 Afeksi)', affectionDelta: 7, hungerDelta: 20, energyDelta: 12 },
  { id: 'kungpao_chicken', name: 'Kung Pao Chicken', emoji: '🍗', cost: 850, desc: 'Ayam dadu dengan kacang tanah pedas. (+30 Lapar, +8 Afeksi)', affectionDelta: 8, hungerDelta: 30, energyDelta: 10 },
  { id: 'xiaolongbao', name: 'Xiao Long Bao', emoji: '🥟', cost: 1100, desc: 'Awas! Kuah kaldu panas di dalam pangsitnya. (+25 Lapar, +11 Afeksi)', affectionDelta: 11, hungerDelta: 25, energyDelta: 5 },
  { id: 'beef_noodle', name: 'Taiwanese Beef Noodle', emoji: '🍜', cost: 1200, desc: 'Daging sapi yang sangat empuk. (+45 Lapar, +12 Afeksi)', affectionDelta: 12, hungerDelta: 45, energyDelta: 15 },
  { id: 'boba_tea', name: 'Brown Sugar Boba', emoji: '🧋', cost: 350, desc: 'Minuman manis penambah mood instan. (+5 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 5, energyDelta: 15 },
  { id: 'lu_rou_fan', name: 'Lu Rou Fan', emoji: '🍚', cost: 600, desc: 'Nasi daging babi/ayam kecap khas Taiwan. (+25 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 25, energyDelta: 10 },
  { id: 'char_siu', name: 'Char Siu Pork/Chicken', emoji: '🍖', cost: 1000, desc: 'Daging panggang merah manis legit. (+35 Lapar, +10 Afeksi)', affectionDelta: 10, hungerDelta: 35, energyDelta: 12 },
  { id: 'hotpot', name: 'Mala Hotpot', emoji: '🍲', cost: 2200, desc: 'Makan bareng di satu panci, super romantis! (+60 Lapar, +22 Afeksi)', affectionDelta: 22, hungerDelta: 60, energyDelta: 25 },

  // 31-40: Italy & Europe
  { id: 'pizza_margherita', name: 'Pizza Margherita', emoji: '🍕', cost: 800, desc: 'Klasik Italia dengan keju mozzarella lumer. (+30 Lapar, +8 Afeksi)', affectionDelta: 8, hungerDelta: 30, energyDelta: 10 },
  { id: 'pasta_carbonara', name: 'Spaghetti Carbonara', emoji: '🍝', cost: 950, desc: 'Saus krim keju dan telur dengan bacon. (+35 Lapar, +9 Afeksi)', affectionDelta: 9, hungerDelta: 35, energyDelta: 12 },
  { id: 'lasagna', name: 'Lasagna al Forno', emoji: '🧀', cost: 1200, desc: 'Lapisan pasta, daging, dan keju panggang. (+45 Lapar, +12 Afeksi)', affectionDelta: 12, hungerDelta: 45, energyDelta: 10 },
  { id: 'risotto', name: 'Mushroom Risotto', emoji: '🥘', cost: 1100, desc: 'Nasi Italia yang dimasak dengan kaldu kental. (+35 Lapar, +11 Afeksi)', affectionDelta: 11, hungerDelta: 35, energyDelta: 10 },
  { id: 'gelato', name: 'Artisan Gelato', emoji: '🍨', cost: 400, desc: 'Es krim Italia lembut penghilang stres. (+5 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 5, energyDelta: 15 },
  { id: 'croissant', name: 'Butter Croissant', emoji: '🥐', cost: 250, desc: 'Renyah di luar, lembut berlapis di dalam. (+10 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 10, energyDelta: 5 },
  { id: 'ratatouille', name: 'Ratatouille', emoji: '🍅', cost: 750, desc: 'Rebusan sayur khas Prancis yang cantik. (+20 Lapar, +7 Afeksi)', affectionDelta: 7, hungerDelta: 20, energyDelta: 15 },
  { id: 'beef_bourguignon', name: 'Beef Bourguignon', emoji: '🥩', cost: 1600, desc: 'Rebusan daging sapi Prancis yang mewah. (+45 Lapar, +16 Afeksi)', affectionDelta: 16, hungerDelta: 45, energyDelta: 15 },
  { id: 'escargot', name: 'Escargot', emoji: '🐌', cost: 1800, desc: 'Siput mewah dengan mentega bawang putih. (+15 Lapar, +18 Afeksi)', affectionDelta: 18, hungerDelta: 15, energyDelta: 5 },
  { id: 'paella', name: 'Seafood Paella', emoji: '🥘', cost: 1500, desc: 'Nasi kuning Spanyol bertabur makanan laut. (+50 Lapar, +15 Afeksi)', affectionDelta: 15, hungerDelta: 50, energyDelta: 15 },

  // 41-50: Americas
  { id: 'steak', name: 'Steak Daging Premium', emoji: '🥩', cost: 1500, desc: 'Bikin Livia langsung jatuh cinta. (+50 Lapar, +15 Afeksi)', affectionDelta: 15, hungerDelta: 50, energyDelta: 25 },
  { id: 'burger', name: 'Double Cheeseburger', emoji: '🍔', cost: 650, desc: 'Junk food klasik yang selalu memuaskan. (+30 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 30, energyDelta: 5 },
  { id: 'hotdog', name: 'New York Hotdog', emoji: '🌭', cost: 350, desc: 'Sosis panggang dengan mustard dan saus. (+15 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 15, energyDelta: 5 },
  { id: 'tacos', name: 'Beef Tacos', emoji: '🌮', cost: 550, desc: 'Tortilla renyah ala Meksiko dengan salsa. (+20 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 20, energyDelta: 8 },
  { id: 'burrito', name: 'Giant Burrito', emoji: '🌯', cost: 700, desc: 'Semua kebahagiaan digulung jadi satu. (+35 Lapar, +7 Afeksi)', affectionDelta: 7, hungerDelta: 35, energyDelta: 10 },
  { id: 'nachos', name: 'Cheese Nachos', emoji: '🧀', cost: 450, desc: 'Keripik jagung dengan saus keju jalapeno. (+15 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 15, energyDelta: 5 },
  { id: 'bbq_ribs', name: 'Texas BBQ Ribs', emoji: '🍖', cost: 1900, desc: 'Iga panggang yang dagingnya lepas dari tulang. (+55 Lapar, +19 Afeksi)', affectionDelta: 19, hungerDelta: 55, energyDelta: 20 },
  { id: 'poutine', name: 'Canadian Poutine', emoji: '🍟', cost: 600, desc: 'Kentang goreng disiram saus daging dan keju. (+25 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 25, energyDelta: 8 },
  { id: 'ceviche', name: 'Peruvian Ceviche', emoji: '🥗', cost: 850, desc: 'Ikan mentah segar dengan perasan jeruk nipis. (+15 Lapar, +8 Afeksi)', affectionDelta: 8, hungerDelta: 15, energyDelta: 15 },
  { id: 'mac_and_cheese', name: 'Truffle Mac & Cheese', emoji: '🧀', cost: 800, desc: 'Makaroni keju Amerika yang di-upgrade. (+30 Lapar, +8 Afeksi)', affectionDelta: 8, hungerDelta: 30, energyDelta: 10 },

  // 51-60: Middle East & India
  { id: 'kebab', name: 'Doner Kebab', emoji: '🥙', cost: 500, desc: 'Irisan daging bakar berbalut roti pita. (+25 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 25, energyDelta: 8 },
  { id: 'falafel', name: 'Falafel Wrap', emoji: '🧆', cost: 450, desc: 'Bola kacang arab goreng renyah yang vegan. (+20 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 20, energyDelta: 10 },
  { id: 'shawarma', name: 'Chicken Shawarma', emoji: '🌯', cost: 550, desc: 'Daging ayam kaya rempah khas Timur Tengah. (+25 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 25, energyDelta: 10 },
  { id: 'hummus', name: 'Hummus & Pita', emoji: '🫓', cost: 400, desc: 'Cocolan kacang arab lembut penambah tenaga. (+15 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 15, energyDelta: 12 },
  { id: 'biryani', name: 'Chicken Biryani', emoji: '🍛', cost: 1000, desc: 'Nasi rempah India yang sangat harum. (+40 Lapar, +10 Afeksi)', affectionDelta: 10, hungerDelta: 40, energyDelta: 15 },
  { id: 'butter_chicken', name: 'Butter Chicken', emoji: '🥘', cost: 1100, desc: 'Kari ayam India super lembut (*creamy*). (+35 Lapar, +11 Afeksi)', affectionDelta: 11, hungerDelta: 35, energyDelta: 12 },
  { id: 'samosa', name: 'Vegetable Samosa', emoji: '🥟', cost: 300, desc: 'Camilan India goreng isi kentang rempah. (+10 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 10, energyDelta: 5 },
  { id: 'naan', name: 'Garlic Naan', emoji: '🫓', cost: 250, desc: 'Roti India panggang beraroma bawang putih. (+15 Lapar, +2 Afeksi)', affectionDelta: 2, hungerDelta: 15, energyDelta: 8 },
  { id: 'shakshouka', name: 'Shakshouka', emoji: '🍳', cost: 700, desc: 'Telur rebus dalam saus tomat khas Timur Tengah. (+25 Lapar, +7 Afeksi)', affectionDelta: 7, hungerDelta: 25, energyDelta: 15 },
  { id: 'baklava', name: 'Turkish Baklava', emoji: '🍯', cost: 650, desc: 'Kue manis berlapis madu dan kacang. (+5 Lapar, +7 Afeksi)', affectionDelta: 7, hungerDelta: 5, energyDelta: 10 },

  // 61-70: Breakfast & Brunch
  { id: 'pancakes', name: 'Fluffy Pancakes', emoji: '🥞', cost: 450, desc: 'Kue dadar tebal dengan sirup maple. (+20 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 20, energyDelta: 15 },
  { id: 'waffles', name: 'Belgian Waffles', emoji: '🧇', cost: 500, desc: 'Wafel renyah dengan es krim vanilla. (+20 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 20, energyDelta: 15 },
  { id: 'english_breakfast', name: 'Full English Breakfast', emoji: '🍳', cost: 1200, desc: 'Sarapan porsi raksasa ala Inggris. (+50 Lapar, +12 Afeksi)', affectionDelta: 12, hungerDelta: 50, energyDelta: 25 },
  { id: 'eggs_benedict', name: 'Eggs Benedict', emoji: '🥚', cost: 850, desc: 'Telur setengah matang bersaus Hollandaise. (+25 Lapar, +9 Afeksi)', affectionDelta: 9, hungerDelta: 25, energyDelta: 15 },
  { id: 'avocado_toast', name: 'Avocado Toast', emoji: '🥑', cost: 600, desc: 'Roti panggang alpukat untuk anak kekinian. (+15 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 15, energyDelta: 20 },
  { id: 'smoothie_bowl', name: 'Berry Smoothie Bowl', emoji: '🥣', cost: 550, desc: 'Sarapan sehat dan *aesthetic*! (+10 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 10, energyDelta: 25 },
  { id: 'bagel', name: 'Bagel & Cream Cheese', emoji: '🥯', cost: 350, desc: 'Roti bolong tebal ala New York. (+15 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 15, energyDelta: 10 },
  { id: 'french_toast', name: 'French Toast', emoji: '🍞', cost: 400, desc: 'Roti panggang manis berlapis telur susu. (+20 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 20, energyDelta: 12 },
  { id: 'crepes', name: 'Strawberry Crepes', emoji: '🌯', cost: 500, desc: 'Dadar super tipis ala Prancis. (+15 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 15, energyDelta: 10 },
  { id: 'cereal', name: 'Rainbow Cereal', emoji: '🥣', cost: 150, desc: 'Sereal anak-anak yang ngangenin. (+10 Lapar, +1 Afeksi)', affectionDelta: 1, hungerDelta: 10, energyDelta: 15 },

  // 71-80: Sweets & Desserts
  { id: 'chocolate_cake', name: 'Chocolate Lava Cake', emoji: '🍰', cost: 850, desc: 'Kue cokelat yang lumer pas dipotong. (+15 Lapar, +9 Afeksi)', affectionDelta: 9, hungerDelta: 15, energyDelta: 10 },
  { id: 'cheesecake', name: 'NY Cheesecake', emoji: '🧀', cost: 800, desc: 'Kue keju padat pencuci mulut terbaik. (+15 Lapar, +8 Afeksi)', affectionDelta: 8, hungerDelta: 15, energyDelta: 8 },
  { id: 'tiramisu', name: 'Classic Tiramisu', emoji: '🧁', cost: 950, desc: 'Kue kopi Italia peluluh hati Livia. (+10 Lapar, +10 Afeksi)', affectionDelta: 10, hungerDelta: 10, energyDelta: 15 },
  { id: 'macaron', name: 'French Macarons', emoji: '🍡', cost: 1200, desc: 'Kue cantik mahal ala Paris. (+5 Lapar, +12 Afeksi)', affectionDelta: 12, hungerDelta: 5, energyDelta: 5 },
  { id: 'donuts', name: 'Glazed Donuts', emoji: '🍩', cost: 250, desc: 'Donat manis empuk penjaga mood. (+10 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 10, energyDelta: 10 },
  { id: 'pudding', name: 'Caramel Flan', emoji: '🍮', cost: 450, desc: 'Puding karamel lembut goyang-goyang. (+10 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 10, energyDelta: 8 },
  { id: 'cookie', name: 'Choco Chip Cookies', emoji: '🍪', cost: 200, desc: 'Kue kering renyah hangat dari oven. (+5 Lapar, +2 Afeksi)', affectionDelta: 2, hungerDelta: 5, energyDelta: 5 },
  { id: 'brownie', name: 'Fudge Brownies', emoji: '🍫', cost: 350, desc: 'Kue cokelat padat dan *chewy*. (+10 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 10, energyDelta: 8 },
  { id: 'churros', name: 'Spanish Churros', emoji: '🥖', cost: 400, desc: 'Donat panjang Spanyol dengan saus cokelat. (+15 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 15, energyDelta: 5 },
  { id: 'ice_cream', name: 'Strawberry Sundae', emoji: '🍨', cost: 300, desc: 'Es krim segar penyelamat hari panas! (+5 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 5, energyDelta: 12 },

  // 81-90: Snacks & Fast Foods
  { id: 'french_fries', name: 'Crispy French Fries', emoji: '🍟', cost: 250, desc: 'Kentang goreng asin gurih tiada henti. (+10 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 10, energyDelta: 5 },
  { id: 'fried_chicken', name: 'Crispy Fried Chicken', emoji: '🍗', cost: 600, desc: 'Ayam goreng tepung *crunchy* gila! (+30 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 30, energyDelta: 10 },
  { id: 'onion_rings', name: 'Onion Rings', emoji: '🧅', cost: 300, desc: 'Bawang bombay goreng krispi. (+10 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 10, energyDelta: 5 },
  { id: 'popcorn', name: 'Caramel Popcorn', emoji: '🍿', cost: 200, desc: 'Camilan pas buat nonton drakor bareng. (+5 Lapar, +2 Afeksi)', affectionDelta: 2, hungerDelta: 5, energyDelta: 5 },
  { id: 'pretzel', name: 'Soft Pretzel', emoji: '🥨', cost: 350, desc: 'Roti Jerman berbentuk simpul. (+15 Lapar, +3 Afeksi)', affectionDelta: 3, hungerDelta: 15, energyDelta: 5 },
  { id: 'corndog', name: 'Mozzarella Corndog', emoji: '🌭', cost: 450, desc: 'Kejunya molooor panjang! (+20 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 20, energyDelta: 8 },
  { id: 'chips', name: 'Potato Chips', emoji: '🥔', cost: 100, desc: 'Keripik kentang micin yang bikin nagih. (+5 Lapar, +1 Afeksi)', affectionDelta: 1, hungerDelta: 5, energyDelta: 5 },
  { id: 'nuggets', name: 'Chicken Nuggets', emoji: '🍗', cost: 400, desc: 'Ayam giling goreng kesukaan sejuta umat. (+15 Lapar, +4 Afeksi)', affectionDelta: 4, hungerDelta: 15, energyDelta: 8 },
  { id: 'mochi', name: 'Daifuku Mochi', emoji: '🍡', cost: 550, desc: 'Kue beras kenyal isi kacang merah Jepang. (+10 Lapar, +6 Afeksi)', affectionDelta: 6, hungerDelta: 10, energyDelta: 10 },
  { id: 'dango', name: 'Mitarashi Dango', emoji: '🍡', cost: 450, desc: 'Tiga bola mochi panggang saus manis. (+10 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 10, energyDelta: 5 },

  // 91-100: Exotic / Special / Drinks
  { id: 'caviar', name: 'Beluga Caviar', emoji: '🐟', cost: 5000, desc: 'Telur ikan termahal, rasanya super mewah! (+20 Lapar, +50 Afeksi)', affectionDelta: 50, hungerDelta: 20, energyDelta: 10 },
  { id: 'truffle_pasta', name: 'Truffle Pasta', emoji: '🍝', cost: 3500, desc: 'Pasta wangi jamur truffle hitam langka. (+40 Lapar, +35 Afeksi)', affectionDelta: 35, hungerDelta: 40, energyDelta: 20 },
  { id: 'foie_gras', name: 'Foie Gras', emoji: '🦆', cost: 4000, desc: 'Hati angsa super mahal khas Prancis. (+20 Lapar, +40 Afeksi)', affectionDelta: 40, hungerDelta: 20, energyDelta: 10 },
  { id: 'lobster', name: 'Grilled Lobster', emoji: '🦞', cost: 2800, desc: 'Lobster panggang ukuran jumbo. (+40 Lapar, +28 Afeksi)', affectionDelta: 28, hungerDelta: 40, energyDelta: 20 },
  { id: 'wagyu', name: 'A5 Wagyu Steak', emoji: '🥩', cost: 4500, desc: 'Daging ajaib yang meleleh sebelum dikunyah. (+50 Lapar, +45 Afeksi)', affectionDelta: 45, hungerDelta: 50, energyDelta: 30 },
  { id: 'saffron_rice', name: 'Saffron Rice', emoji: '🍚', cost: 1500, desc: 'Nasi dimasak dengan rempah termahal di dunia. (+30 Lapar, +15 Afeksi)', affectionDelta: 15, hungerDelta: 30, energyDelta: 15 },
  { id: 'coffee', name: 'Artisan Espresso', emoji: '☕', cost: 200, desc: 'Kopi hitam kuat pengusir ngantuk. (+0 Lapar, +2 Afeksi)', affectionDelta: 2, hungerDelta: 0, energyDelta: 40 },
  { id: 'matcha', name: 'Kyoto Matcha Latte', emoji: '🍵', cost: 450, desc: 'Teh hijau Jepang yang elegan dan *zen*. (+5 Lapar, +5 Afeksi)', affectionDelta: 5, hungerDelta: 5, energyDelta: 25 },
  { id: 'wine', name: 'Vintage Red Wine', emoji: '🍷', cost: 3000, desc: 'Anggur merah tua untuk malam romantis. (+0 Lapar, +30 Afeksi)', affectionDelta: 30, hungerDelta: 0, energyDelta: -10 },
  { id: 'champagne', name: 'Gold Champagne', emoji: '🍾', cost: 5000, desc: 'Minuman perayaan dengan serpihan emas! (+0 Lapar, +50 Afeksi)', affectionDelta: 50, hungerDelta: 0, energyDelta: 0 }
];
