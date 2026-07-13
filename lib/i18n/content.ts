export const EN_SHOP_ITEMS: Record<string, { name: string; desc: string }> = {
  candy: { name: 'Sweet Candy', desc: 'Cheap candy but very sweet.' },
  coffee: { name: 'Milk Coffee', desc: 'Popular iced milk coffee.' },
  novel: { name: 'Romance Novel', desc: 'Teenage romance fiction novel.' },
  bear: { name: 'Teddy Bear', desc: 'Soft, plushy, and comforting to hug.' },
  necklace: { name: 'Pretty Necklace', desc: 'Shiny and elegant jewelry.' },
  cincin_nikah: { name: 'Wedding Ring', desc: 'A sacred lifelong promise.' },
  onigiri: { name: 'Onigiri', desc: 'Rice ball to stop hunger (+Hunger, +Energy).' },
  yakitori: { name: 'Yakitori', desc: 'Japanese grilled chicken skewers (+Hunger, +Energy).' },
  takoyaki: { name: 'Takoyaki', desc: 'Hot octopus balls (+Hunger, +Energy).' },
  dango: { name: 'Dango', desc: 'Sweet rice dumplings (+Hunger, +Energy).' },
  katsudon: { name: 'Katsudon', desc: 'Large pork cutlet bowl (+High Hunger, +Energy).' },
  sushi: { name: 'Sushi Platter', desc: 'Premium fresh sushi (+Hunger, +Energy).' },
  katering: { name: 'Wedding Catering', desc: 'Full banquet catering for the wedding.' },
  air_putih: { name: 'Mineral Water', desc: 'Fresh bottled water (+Hydration).' },
  teh_hijau: { name: 'Green Tea', desc: 'Calming green tea (+Hydration, +Energy).' },
  teh_hitam: { name: 'Black Tea', desc: 'Strong black tea (+Hydration, +Energy).' },
  kopi_hitam: { name: 'Black Coffee', desc: 'Energy booster (+Hydration, +Energy).' },
  jus_buah: { name: 'Fruit Juice', desc: 'Vitamin rich juice (+Hydration, +Energy).' },
  susu: { name: 'Fresh Milk', desc: 'Pure fresh milk (+Hydration, +Hunger).' },
  outfit_casual: { name: 'Casual Wear', desc: 'Relaxed clothes for lounging in the room.' },
  trench_coat: { name: 'Trench Coat', desc: 'Perfect for cold weather or traveling outside.' },
  outfit_school: { name: 'High School Uniform', desc: 'Classic sailor school uniform.' },
  outfit_yukata: { name: 'Festival Yukata', desc: 'Traditional summer festival dress.' },
  gaun_pengantin: { name: 'Wedding Dress', desc: 'Pure white dress for your special day.' },
  piyama: { name: 'Cozy Pajamas', desc: 'Super comfortable sleeping pajamas.' },
  office_lady: { name: 'Office Lady Suit', desc: 'Elegant formal shirt with glasses.' },
  recipe_book_shop: { name: 'Recipe Book', desc: 'Delicious cooking guide. Required to unlock Kitchen!' },
  kacamata_hitam: { name: 'Sunglasses', desc: 'Essential stylish item for going on dates.' },
  tiket_konser: { name: 'Concert Ticket', desc: "Ticket to Livia's favorite band concert." },
  berkas_kua: { name: 'Marriage Documents', desc: 'Official wedding registry files.' },
  gedung_resepsi: { name: 'Ballroom Rental', desc: "Booking Livia's dream reception venue." },
  furni_poster: { name: 'Anime Poster', desc: 'Wall art to decorate your room.' },
  furni_bed: { name: 'Luxury Bed', desc: "Improves Livia's sleep quality." },
  furni_pc: { name: 'Gaming PC', desc: 'High-end PC for gaming sessions.' },
};

export const EN_RECIPES: Record<string, { name: string; desc: string }> = {
  nasi_goreng: { name: 'Special Fried Rice', desc: 'Simple ingredients, rich taste. (+20 Hunger, +3 Affection)' },
  sup_ayam: { name: 'Warm Chicken Soup', desc: 'Comforting for rainy days. (+30 Hunger, +5 Affection)' },
  rendang: { name: 'Beef Rendang', desc: 'Slow-cooked spiced beef. (+40 Hunger, +12 Affection)' },
  sate_ayam: { name: 'Chicken Satay', desc: 'Mouthwatering peanut sauce! (+25 Hunger, +6 Affection)' },
  gado_gado: { name: 'Gado-Gado Salad', desc: 'Healthy traditional salad. (+15 Hunger, +4 Affection)' },
  tom_yum: { name: 'Tom Yum Goong', desc: 'Spicy and sour Thai soup! (+35 Hunger, +9 Affection)' },
  pad_thai: { name: 'Pad Thai', desc: 'Iconic Thai stir-fried noodles. (+30 Hunger, +7 Affection)' },
  pho: { name: 'Vietnamese Pho', desc: 'Warm and aromatic beef noodle soup. (+35 Hunger, +8 Affection)' },
  nasi_lemak: { name: 'Nasi Lemak', desc: 'Fragrant coconut rice with anchovies. (+25 Hunger, +5 Affection)' },
  hainanese_rice: { name: 'Hainanese Chicken Rice', desc: 'Tender poached chicken with savory rice. (+35 Hunger, +9 Affection)' },
  sushi_platter: { name: 'Omakase Sushi', desc: 'Melts in your mouth fresh sushi. (+40 Hunger, +20 Affection)' },
  ramen: { name: 'Tonkotsu Ramen', desc: 'Rich broth with tender chashu pork. (+45 Hunger, +11 Affection)' },
  takoyaki: { name: 'Osaka Takoyaki', desc: 'Hot and savory octopus balls! (+15 Hunger, +5 Affection)' },
  okonomiyaki: { name: 'Okonomiyaki', desc: 'Savory Japanese pancake. (+30 Hunger, +7 Affection)' },
  katsu_curry: { name: 'Katsu Curry', desc: 'Crispy cutlet with thick curry sauce. (+40 Hunger, +10 Affection)' },
  kimchi_jjigae: { name: 'Kimchi Jjigae', desc: 'Spicy Korean kimchi stew. (+35 Hunger, +9 Affection)' },
  bibimbap: { name: 'Dolsot Bibimbap', desc: 'Korean mixed rice in hot stone bowl. (+40 Hunger, +9 Affection)' },
  tteokbokki: { name: 'Spicy Tteokbokki', desc: 'Chewy rice cakes in gochujang sauce. (+20 Hunger, +6 Affection)' },
  korean_bbq: { name: 'Samgyeopsal BBQ', desc: 'Korean grilled pork belly with Livia! (+50 Hunger, +18 Affection)' },
  jajangmyeon: { name: 'Jajangmyeon', desc: 'Savory black bean sauce noodles. (+30 Hunger, +7 Affection)' },
  peking_duck: { name: 'Peking Duck', desc: 'Crispy roasted duck skin. (+60 Hunger, +25 Affection)' },
  dimsum: { name: 'Dimsum Platter', desc: 'Steamed dumplings and buns. (+25 Hunger, +10 Affection)' },
  mapo_tofu: { name: 'Mapo Tofu', desc: 'Silken tofu in spicy mala sauce. (+20 Hunger, +7 Affection)' },
};

export const EN_INVENTORY_ITEMS: Record<string, { name: string; description: string; buffLabel: string; buffDesc: string }> = {
  recipe_book: {
    name: 'Recipe Book',
    description: "Mother's trusted recipe book.",
    buffLabel: 'Home Cook',
    buffDesc: 'Livia occasionally cooks and offers you food'
  },
  teddy_bear: {
    name: 'Teddy Bear',
    description: 'Beloved childhood plush bear.',
    buffLabel: 'Clingy',
    buffDesc: 'Livia becomes clingy and affectionate easily'
  },
  handheld: {
    name: 'Handheld Console',
    description: 'Portable gaming console for free time.',
    buffLabel: 'Gamer',
    buffDesc: 'Livia often invites you to play games together'
  },
  headphone: {
    name: 'Headphones',
    description: 'Noise-cancelling headphones for focus.',
    buffLabel: 'Music Lover',
    buffDesc: 'Livia shares song recommendations and playlists'
  },
  makeup: {
    name: 'Makeup Kit',
    description: 'Complete beauty set for looking gorgeous.',
    buffLabel: 'Needs Validation',
    buffDesc: 'Livia loves showing off her look'
  },
  hoodie: {
    name: 'Oversized Hoodie',
    description: 'Cozy hoodie perfect for relaxing.',
    buffLabel: 'Cozy Vibe',
    buffDesc: 'Livia feels relaxed and calm'
  },
  plant: {
    name: 'Mini Succulent',
    description: 'Cute potted plant on the desk.',
    buffLabel: 'Plant Parent',
    buffDesc: 'Livia enjoys watering her plants'
  },
  camera: {
    name: 'Polaroid Camera',
    description: 'Instant film camera for memories.',
    buffLabel: 'Photographer',
    buffDesc: 'Livia loves taking instant snapshots'
  },
};

export const EN_LIVIA_DIALOGUES = {
  shop: {
    greeting: "What do you want to buy today? D-don't buy me anything weird!",
    expensive: (name: string) => `S-so expensive! Are you really sure you want to buy ${name} for me?`,
    food: (name: string) => `Yum... ${name} looks so delicious!`,
    outfit: (name: string) => `Are you sure your fashion sense is good enough to pick ${name}?`,
    sunglasses: "Whoa, sunglasses! Wouldn't I look super cool wearing those?",
    recipeBook: "A cooking recipe book?! Y-you want me to cook for you?! Don't get your hopes up!",
    noMoney: (name: string) => `You don't have enough money! Don't just window shop if you can't afford ${name}!`,
    maxAffection: "I-it's not that I reject gifts... but my affection towards you is already maxed (100)! Save your money.",
    alreadyOwned: (name: string) => `You already own ${name}! Buy something else.`,
    boughtOutfit: "T-this outfit... you want me to wear this? W-wait a second, don't peek!",
    boughtFurniture: (name: string) => `Wow, the room looks so much better with ${name}. Thanks!`,
    boughtFood: (name: string) => `Yum... this ${name} is amazing! Thanks for the food, I'm full now.`,
    boughtDrink: (name: string) => `Gulp gulp... Ah! So refreshing. My throat feels much better now.`,
    boughtSunglasses: "A-are these sunglasses?! Super cool... Perfect for going out! Thanks!",
    boughtRecipeBook: "S-since you went out of your way to buy this recipe book... I-I guess I'll cook for you sometimes!",
    boughtExpensive: "F-for me?! This is so expensive... T-thank you, dummy!",
    boughtNice: (name: string) => `Wow, ${name}! Just what I wanted. Thank you!`,
    boughtNormal: (name: string) => `Oh, ${name}. Not bad. Thanks.`,
  },
  wardrobe: {
    greeting: "My wardrobe. Don't take too long picking!",
    default: "Normal casual clothes are the most comfortable.",
    outfit_casual: "This outfit is super comfy for relaxing in the room.",
    trench_coat: "Warm... but your hugs are definitely warmer.",
    outfit_school: "T-this uniform... it's a bit snug around the chest. Don't get weird ideas!",
    outfit_yukata: "This yukata... looks nice, right? I-it's not like I dressed up for you!",
    gaun_pengantin: "I-I feel shy when you stare so much... Do I look pretty as your bride?",
    piyama: "Yawn... These pajamas are so comfy. Wanna sleep together?",
    office_lady: "How is the report today? Hehe, do I look good as your boss?",
  },
  kitchen: {
    greeting: "Welcome to the kitchen! Click the recipe book on the stove to select a dish.",
  }
};

export const EN_JOBS: Record<string, { title: string; desc: string }> = {
  '1': { title: 'Software Engineer', desc: 'Fix a simple code bug within 10 seconds.' },
  '2': { title: 'UI/UX Designer', desc: 'Pick the matching Hex color combination.' },
  '3': { title: 'Math Tutor', desc: 'Answer 3 consecutive math questions correctly.' },
  '4': { title: 'Cafe Barista', desc: 'Memorize and make customer drink orders.' },
  '5': { title: 'Dishwasher', desc: 'Scrub dirty plates clean lightning fast (30 clicks).' },
  '6': { title: 'Cashier', desc: 'Calculate customer change accurately.' },
  '7': { title: 'Data Entry', desc: 'Type the security captcha code in 10 seconds.' },
  '8': { title: 'Parking Attendant', desc: 'Secure incoming cars (hit 10 red cars).' },
  '9': { title: 'Restaurant Waiter', desc: 'Memorize 4 customer order dishes and repeat.' },
  '10': { title: 'Freelance Writer', desc: 'Unscramble random letters into the correct word.' },
  '11': { title: 'Construction Worker', desc: 'Smash bricks! Click the brick block 40 times in 10 seconds.' },
  '12': { title: 'Electronics Repair', desc: 'Connect 4 pairs of broken colored wires correctly.' },
  '13': { title: 'Street Artist', desc: 'Mix 2 primary colors to produce target color.' },
  '14': { title: 'Crypto Trader', desc: 'Buy coin when the price chart enters the green zone!' },
  '15': { title: 'Fisherman', desc: 'Pull the rod in less than 0.6s when the fish bites!' },
};
