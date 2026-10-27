/**
 * Logika sapaan Livia di layar home (M5.1).
 *
 * Dipindah verbatim dari HomeClient. Prioritas sapaan (dari atas ke bawah):
 * cuaca ekstrem → ajakan jalan (folikuler/berkacamata) → keluhan fisik
 * (lapar/haus/capek) → fase siklus sensitif → jadwal hidup paralel →
 * sapaan per-jam berdasarkan afeksi.
 */

import type { LiviaExpression } from '@/lib/gemini';

export type GreetingStats = {
  hunger: number;
  energy: number;
  hydration: number;
  cyclePhase: string;
};

export type Weather = {
  weathercode: number;
  temperature: number;
} | null;

export type Greeting = {
  text: string;
  expression: LiviaExpression;
  isInvitingOut?: boolean;
  invitedPlace?: string;
};

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getGreeting(
  affection: number,
  itemsBrought: string[],
  stats: GreetingStats,
  userName: string,
  weather: Weather
): Greeting {
  const hour = new Date().getHours();

  if (weather) {
    const randomChance = Math.random();
    if (randomChance < 0.4) {
      if (weather.weathercode >= 51 && weather.weathercode <= 95) {
        return {
          text: `Di luar lagi hujan deras tuh. ${userName} jangan lupa bawa payung kalau mau keluar, ya.`,
          expression: 'normal'
        };
      }
      if (weather.temperature > 32) {
        return {
          text: `Panas banget hari ini... sampai ${weather.temperature}°C lho! Kipas anginku berasa nggak mempan.`,
          expression: 'normal'
        }
      }
      if (weather.temperature < 22) {
        return {
          text: `Hari ini lumayan dingin ya... ${weather.temperature}°C. Kamu nggak pakai jaket?`,
          expression: 'normal'
        }
      }
    }
  }

  if (stats.cyclePhase === 'Folikuler' && affection >= 30) {
    const randomChance = Math.random();
    if (randomChance < 0.65) {
      const places = ['Restoran Gyoza', 'Supermarket', 'Taman Kota', 'Warung Ramen', 'Arcade Center', 'Akuarium', 'Food Court'];
      const place = pickRandom(places);
      const texts = [
        `Hei ${userName}! Cuaca hari ini enak banget dan aku lagi berenergi banget. Kita jalan-jalan ke ${place} yuk!`,
        `${userName}~ Aku lagi nggak mau diem di kamar nih. Temenin aku keluar ke ${place} sekarang ya!`,
        `Mood aku lagi bagus banget hari ini! Jalan bareng ke ${place} yuk, ${userName}!`,
        `Hei, mumpung aku lagi bersemangat, kamu mau nemenin aku jalan ke ${place} nggak?`
      ];
      return {
        text: pickRandom(texts),
        expression: 'happy',
        isInvitingOut: true,
        invitedPlace: place
      };
    }
  }

  if (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses'))) {
    const randomChance = Math.random();
    if (randomChance > 0.6 && stats.energy > 50 && stats.cyclePhase !== 'Menstruasi') {
      const places = ['Supermarket', 'Perpustakaan', 'Taman Kota', 'Kafe Kucing', 'Taman Hiburan'];
      const place = pickRandom(places);
      const displayPlace = place.toLowerCase();
      const texts = [
        `Hei... kebetulan aku mau ke ${displayPlace}. Karena ${userName} udah beliin kacamata ini... y-yah, ${userName} boleh ikut kalau mau.`,
        `Kacamata hitamnya keren kan? A-aku mau tes jalan pakai ini ke ${displayPlace}. ${userName} harus nemenin!`,
        `${userName}, kebetulan aku mau cari angin ke ${displayPlace}. Mau... ikut? Sekalian aku mau pakai kacamata baru ini.`
      ];
      return {
        text: pickRandom(texts),
        expression: 'blushing',
        isInvitingOut: true,
        invitedPlace: place
      };
    }
  }

  // Priority overrides based on extreme physical conditions
  if (stats.hunger < 25) {
    const texts = [
      `A-aku laper banget... ${userName} nggak peka banget sih, aku belum makan daritadi!`,
      `Perutku bunyi terus... Beliin makanan dong, ${userName}!`,
      `Tenagaku habis... aku butuh makanan manis atau apa aja sekarang juga.`,
      `Kalau kamu nggak beliin aku makan sekarang, aku bakal marah beneran lho!`
    ];
    return { text: pickRandom(texts), expression: 'angry' };
  }
  if (stats.hydration < 25) {
    const texts = [
      'Haus... kerongkonganku kering banget. Jangan ajak ngobrol dulu.',
      `Ambilin minum dong, ${userName}... seret banget rasanya.`,
      `Air... aku butuh air...`,
      `Panas banget, aku kurang minum hari ini.`
    ];
    return { text: pickRandom(texts), expression: 'normal' };
  }
  if (stats.energy < 25) {
    const texts = [
      'Aku capek banget... mataku berat... jangan berisik ya.',
      `Hoaam... energinya udah limit nih, ${userName}. Mau tidur.`,
      `Rasanya pengen rebahan seharian aja...`,
      `Jangan kasih aku tugas atau ngajak ngobrol berat, otakku udah konslet saking capeknya.`
    ];
    return { text: pickRandom(texts), expression: 'normal' };
  }
  if (stats.cyclePhase === 'Menstruasi') {
    const texts = [
      'Perutku sakit... jangan banyak tingkah hari ini, aku lagi sensitif!',
      `Duh, kram perut lagi... ${userName}, tolong jangan bikin aku emosi hari ini.`,
      `Pinggangku pegel semua. Kalau kamu mau ngeselin, mending jauh-jauh deh.`,
      `A-aku lagi dapet... bawaannya pengen marah. Jadi diem aja ya.`
    ];
    return { text: pickRandom(texts), expression: 'angry' };
  } else if (stats.cyclePhase === 'Luteal') {
    const texts = [
      `Aku lagi laper terus dan pengen rebahan di rumah aja. Jangan ngajak keluar ya hari ini.`,
      `Nggak tau kenapa aku gampang bete hari ini. Lebih enak di rumah sambil makan camilan yang banyak.`,
      `Mood aku lagi nggak karuan dan doyan makan banget. Kita di rumah aja ya, ${userName}.`,
      `Aku lagi PMS tau! Jangan ngajak keluar ke mana-mana, beliin aku makanan aja!`
    ];
    return { text: pickRandom(texts), expression: 'angry' };
  }

  // Parallel Life / Schedule-based interactions (40% chance to trigger if there's a matching schedule)
  const day = new Date().getDay();
  if (Math.random() < 0.4) {
    if (day >= 1 && day <= 5) { // Weekdays
      if (hour >= 7 && hour <= 9) {
        const texts = [
          `Aduh, aku lagi siap-siap mau ke kampus nih. Nanti aja ya ngobrolnya!`,
          `Lagi cari catetanku yang hilang... Kamu lihat nggak, ${userName}?`,
          `Duh, hari ini dosen killer masuk pagi. Doain aku selamat ya.`
        ];
        return { text: pickRandom(texts), expression: 'normal' };
      }
      if (hour >= 14 && hour <= 16) {
        const texts = [
          `Baru pulang kelas... capek banget dosennya ngasih kuis dadakan.`,
          `Huft, akhirnya sampai kos juga. Panas banget di luar!`,
          `Tadi di kampus temenku ngeselin banget tau. Eh, a-aku malah curhat.`
        ];
        return { text: pickRandom(texts), expression: 'normal' };
      }
    }

    if ((day === 3 || day === 5) && (hour >= 17 && hour <= 19)) { // Wed/Fri part-time job
      const texts = [
        `Aku baru pulang kerja part-time dari kafe... kaki rasanya mau copot.`,
        `Hari ini pelanggan kafe ramai banget. Capeknya pol-polan.`,
        `Gajiku dari kafe baru turun nih. Mau beli apa ya enaknya?`
      ];
      return { text: pickRandom(texts), expression: 'happy' };
    }

    if ((day === 2 || day === 4) && (hour >= 19 && hour <= 21)) { // Tue/Thu group assignment
      const texts = [
        `Lagi pusing ngerjain tugas kelompok nih. Kamu jangan berisik ya, ${userName}.`,
        `Temen kelompokku masa nggak ada yang kerja satupun. Ujung-ujungnya aku yang ngerjain!`,
        `Tugas dari dosen ini susah banget. A-aku bukan minta bantu lho ya, cuma ngeluh aja.`
      ];
      return { text: pickRandom(texts), expression: 'angry' };
    }

    if (day === 6) { // Saturday
      if (hour >= 8 && hour <= 11) {
        const texts = [
          `Lagi nyuci baju sama beres-beres kamar nih. Hari libur harus produktif!`,
          `Debu di kamar ini dari mana aja sih... cape nyapunya.`,
          `Udah sarapan? Aku sekalian mau cuci piring nih mumpung libur.`
        ];
        return { text: pickRandom(texts), expression: 'happy' };
      }
    }

    if (day === 0) { // Sunday
      if (hour >= 13 && hour <= 16) {
        const texts = [
          `Tadi habis jalan-jalan sama temen kampus. Sekarang enaknya rebahan.`,
          `Hari minggu rasanya cepet banget ya lewatnya... besok udah senin lagi.`,
          `Tadi aku mampir ke mall sebentar beli barang. Lumayan buat cuci mata.`
        ];
        return { text: pickRandom(texts), expression: 'happy' };
      }
    }
  }

  if (hour >= 5 && hour < 12) {
    if (affection < 40) {
      const texts = [
        `${userName} lagi ngapain pagi-pagi?`,
        `Tumben udah bangun. Ada kelas pagi?`,
        `Pagi. Jangan berisik, aku masih ngantuk.`,
        `Oh, udah pagi ya. Ya udah.`
      ];
      return { text: pickRandom(texts), expression: 'normal' };
    } else {
      const texts = [
        `Pagi, ${userName}. Udah sarapan belum? Kalau belum, sarapan bareng yuk.`,
        `Selamat pagi! Semangat ya hari ini, jangan males-malesan!`,
        `Hoaam... pagi. Tumben kamu bangun lebih dulu dari aku.`,
        `Pagi~ Muka kamu masih bantal banget tuh, hehe.`
      ];
      return { text: pickRandom(texts), expression: 'happy' };
    }
  } else if (hour >= 12 && hour < 18) {
    if (affection < 40) {
      const texts = [
        `Siang. Sibuk?`,
        `Panas banget hari ini. Bikin males ngapa-ngapain.`,
        `Udah makan siang? Jangan sampai lupa waktu.`,
        `Lagi istirahat? Ya udah sana istirahat.`
      ];
      return { text: pickRandom(texts), expression: 'normal' };
    } else {
      const texts = [
        `Siang. Jangan lupa istirahat ya... b-bukan karena aku peduli sih!`,
        `Capek ya habis kegiatan? Mau aku buatin teh manis?`,
        `Hei, siang-siang gini enaknya ngemil atau rebahan kan?`,
        `Kalau capek jangan dipaksain. Sini istirahat sebentar sama aku.`
      ];
      return { text: pickRandom(texts), expression: 'blushing' };
    }
  } else if (hour >= 18 && hour < 22) {
    if (affection < 40) {
      const texts = [
        `Malam.`,
        `Udah pulang? Bersih-bersih dulu sana.`,
        `Malam. Jangan lupa kunci pintu kos.`,
        `Lagi santai ya? Jangan berisik, aku mau nugas.`
      ];
      return { text: pickRandom(texts), expression: 'normal' };
    } else {
      const texts = [
        `Eh, ${userName} masih di sini juga. Nggak jalan keluar?`,
        `Selamat malam. Gimana harimu? Pasti melelahkan ya?`,
        `Akhirnya bisa santai juga. Mau ngobrol bentar bareng aku?`,
        `Malam~ Hehe, seneng deh lihat kamu santai gini.`
      ];
      return { text: pickRandom(texts), expression: 'happy' };
    }
  } else {
    if (affection < 40) {
      const texts = [
        `${userName} nggak tidur? Besok kesiangan lho.`,
        `Tengah malam masih melek... ngerjain apa sih?`,
        `Bisa tolong matikan lampunya kalau udah selesai? Aku mau tidur.`,
        `Begadang terus. Nanti sakit lho.`
      ];
      return { text: pickRandom(texts), expression: 'angry' };
    } else {
      const texts = [
        `Tengah malam begini... ${userName} nggak ada kerjaan lain selain lihatin aku?`,
        `Belum ngantuk ya? A-aku juga belum sih... mau ditemenin?`,
        `Jangan begadang terlalu larut. Kalau kamu sakit, ntar aku yang repot ngurusinnya.`,
        `Hoaam... kalau kamu belum tidur, a-aku juga mau nemenin ah.`
      ];
      return { text: pickRandom(texts), expression: 'clingy' };
    }
  }
}
