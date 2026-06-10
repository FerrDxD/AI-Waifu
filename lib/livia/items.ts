export type Item = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  buff: {
    id: string;
    label: string;
    description: string;
  };
  debuff: {
    id: string;
    label: string;
    description: string;
  };
};

export const ITEMS: Item[] = [
  {
    id: 'recipe_book',
    name: 'Buku Resep Masak',
    emoji: '📚',
    description: 'Buku resep andalan yang diwariskan dari ibu.',
    buff: { id: 'cook', label: 'Rajin Masak', description: 'Livia sesekali masak dan menawarkan makanan' },
    debuff: { id: 'delivery', label: 'Delivery Addict', description: 'Livia minta delivery terus, sering ngeluh mahal' }
  },
  {
    id: 'teddy_bear',
    name: 'Boneka Beruang',
    emoji: '🧸',
    description: 'Boneka beruang lusuh kesayangan sejak kecil.',
    buff: { id: 'clingy', label: 'Clingy', description: 'Livia mudah manja dan clingy' },
    debuff: { id: 'defensive', label: 'Defensive', description: 'Livia lebih defensive, jarang minta perhatian' }
  },
  {
    id: 'handheld',
    name: 'Handheld Console',
    emoji: '🎮',
    description: 'Konsol game portable untuk menghabiskan waktu luang.',
    buff: { id: 'gamer', label: 'Gamer', description: 'Livia sering ngajak main bareng' },
    debuff: { id: 'bored', label: 'Gampang Bosan', description: 'Livia sering bengong, mudah diajak ngobrol' }
  },
  {
    id: 'headphone',
    name: 'Headphone',
    emoji: '🎧',
    description: 'Headphone noise-cancelling untuk fokus.',
    buff: { id: 'music', label: 'Music Lover', description: 'Livia suka rekomen lagu dan punya playlist per mood' },
    debuff: { id: 'sensitive_sound', label: 'Sensitif Suara', description: 'Livia sensitif suara, mudah terganggu' }
  },
  {
    id: 'makeup',
    name: 'Set Make Up',
    emoji: '💄',
    description: 'Peralatan make up lengkap untuk tampil maksimal.',
    buff: { id: 'npd', label: 'Butuh Validasi', description: 'Livia butuh validasi terus, suka pamer penampilan' },
    debuff: { id: 'introvert', label: 'Awkward', description: 'Livia susah bergaul, awkward di situasi sosial' }
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    emoji: '🧥',
    description: 'Hoodie oversized yang nyaman untuk begadang.',
    buff: { id: 'insomnia', label: 'Insomnia', description: 'Livia aktif tengah malam, sering chat jam 2 pagi' },
    debuff: { id: 'sleepy', label: 'Tukang Tidur', description: 'Livia sering ketiduran saat ngobrol' }
  },
  {
    id: 'keychain',
    name: 'Key Chain',
    emoji: '🔑',
    description: 'Gantungan kunci kenang-kenangan dari rumah.',
    buff: { id: 'motivated', label: 'Termotivasi', description: 'Mengurangi 1 debuff acak saat onboarding' },
    debuff: { id: 'homesick', label: 'Homesick', description: 'Livia sering ngeluh kangen rumah dan ibunya' }
  },
  {
    id: 'novel',
    name: 'Buku Novel',
    emoji: '📖',
    description: 'Novel fiksi favorit untuk pelarian.',
    buff: { id: 'eloquent', label: 'Pandai Bicara', description: 'Livia pandai bicara, kosakata kaya' },
    debuff: { id: 'shy_speaker', label: 'Pemalu', description: 'Livia terlalu malu untuk bicara di depan umum' }
  },
  {
    id: 'fan',
    name: 'Kipas Portable',
    emoji: '🌀',
    description: 'Kipas kecil penyelamat di hari panas.',
    buff: { id: 'stable', label: 'Cool Headed', description: 'Emosi Livia lebih stabil dan jarang meledak' },
    debuff: { id: 'volatile', label: 'Sumbu Pendek', description: 'Emosi Livia meledak-ledak, mudah marah' }
  },
  {
    id: 'sunglasses',
    name: 'Kacamata Hitam',
    emoji: '🕶️',
    description: 'Kacamata hitam untuk gaya atau menutupi mata panda.',
    buff: { id: 'social', label: 'Social Butterfly', description: 'Livia sering ngajak hang out' },
    debuff: { id: 'antisocial', label: 'Ansos', description: 'Livia ansos total, menghindari topik sosial' }
  },
  {
    id: 'sketchbook',
    name: 'Buku Sketsa',
    emoji: '🎨',
    description: 'Buku penuh coretan kasar dan ide gila.',
    buff: { id: 'creative', label: 'Artistik', description: 'Livia sering membicarakan ide kreatif' },
    debuff: { id: 'bland', label: 'Kaku', description: 'Pikiran Livia kaku dan sulit diajak berimajinasi' }
  },
  {
    id: 'tarot',
    name: 'Kartu Tarot',
    emoji: '🃏',
    description: 'Kartu ramalan misterius dengan aura aneh.',
    buff: { id: 'superstitious', label: 'Zodiak Addict', description: 'Livia sering membahas ramalan dan zodiak' },
    debuff: { id: 'skeptic', label: 'Skeptis', description: 'Livia sangat logis dan tidak percaya keajaiban' }
  },
  {
    id: 'vitamins',
    name: 'Suplemen Vitamin',
    emoji: '💊',
    description: 'Botol vitamin C untuk menjaga daya tahan tubuh.',
    buff: { id: 'healthy', label: 'Sehat & Bugar', description: 'Livia rajin mengingatkanmu untuk minum air dan olahraga' },
    debuff: { id: 'sickly', label: 'Gampang Sakit', description: 'Livia mudah tumbang dan sering mengeluh pusing' }
  },
  {
    id: 'diary',
    name: 'Buku Harian Rahasia',
    emoji: '📓',
    description: 'Buku dengan gembok kecil. Sangat rahasia.',
    buff: { id: 'reflective', label: 'Reflektif', description: 'Livia sering curhat panjang lebar tentang harinya' },
    debuff: { id: 'forgetful', label: 'Pelupa Parah', description: 'Livia sering lupa janjinya sendiri' }
  },
  {
    id: 'guitar',
    name: 'Gitar Akustik Kecil',
    emoji: '🎸',
    description: 'Gitar kecil yang senarnya jarang diganti.',
    buff: { id: 'musical', label: 'Suka Bernyanyi', description: 'Terkadang Livia akan menyenandungkan lagu' },
    debuff: { id: 'tone_deaf', label: 'Fals', description: 'Telinga Livia tidak peka nada, benci musik keras' }
  },
  {
    id: 'cactus',
    name: 'Kaktus Mini',
    emoji: '🌵',
    description: 'Satu-satunya tanaman yang berhasil Livia rawat.',
    buff: { id: 'responsible', label: 'Teratur', description: 'Livia rajin menjaga kebersihan ruangannya' },
    debuff: { id: 'messy', label: 'Super Berantakan', description: 'Kamar Livia seperti kapal pecah' }
  },
  {
    id: 'dumbbell',
    name: 'Barbel Pink',
    emoji: '🏋️‍♀️',
    description: 'Barbel kecil seberat 2kg.',
    buff: { id: 'energetic', label: 'Penuh Energi', description: 'Livia sangat hiperaktif di pagi hari' },
    debuff: { id: 'lazy', label: 'Mageran', description: 'Livia malas bergerak dari kasurnya' }
  },
  {
    id: 'blanket',
    name: 'Selimut Bulu',
    emoji: '🛌',
    description: 'Selimut super tebal, sahabat musim hujan.',
    buff: { id: 'cozy', label: 'Anak Rumahan', description: 'Sangat nyaman diajak ngobrol santai di kamar' },
    debuff: { id: 'complainer', label: 'Suka Ngeluh', description: 'Livia sering mengeluh soal cuaca dan suhu AC' }
  },
  {
    id: 'camera',
    name: 'Kamera Polaroid',
    emoji: '📷',
    description: 'Kamera jadul dengan isi film yang mahal.',
    buff: { id: 'photographer', label: 'Suka Kenangan', description: 'Menghargai setiap momen kecil' },
    debuff: { id: 'camera_shy', label: 'Anti Kamera', description: 'Livia membenci foto dan tidak suka didokumentasikan' }
  },
  {
    id: 'snacks',
    name: 'Kotak Camilan',
    emoji: '🍪',
    description: 'Harta karun berisi micin dan gula.',
    buff: { id: 'snacker', label: 'Tukang Ngemil', description: 'Livia akan sering menawarimu camilan' },
    debuff: { id: 'hangry', label: 'Hangry', description: 'Livia gampang badmood kalau telat makan' }
  }
];
