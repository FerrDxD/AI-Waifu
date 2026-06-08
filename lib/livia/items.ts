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
  }
];
