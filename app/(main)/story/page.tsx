'use client';

import { useState, useEffect } from 'react';
import DialogBox from '@/components/livia/DialogBox';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { Lock, Package, Sparkles, Loader2 } from 'lucide-react';
import { ITEMS } from '@/lib/livia/items';

type Choice = {
  text: string;
  nextIndex: number;
};

type Scene = {
  speaker: string;
  text: string;
  expression: any;
  choices?: Choice[];
  nextIndex?: number;
};

type UserStatsData = {
  affection: number;
  accountDays: number;
  screenTimeHours: number;
  itemsBrought: string[];
  activeOutfit?: string;
};

type ReqCheck = {
  label: string;
  met: boolean;
};

interface Chapter {
  id: number;
  title: string;
  reqAffection: number;
  reqLevel: number;
  getRequirements?: (data: UserStatsData) => ReqCheck[];
  content?: Scene[];
  getDynamicContent?: (data: UserStatsData) => Scene[];
}

const CHAPTERS: Chapter[] = [
  {
    id: 0,
    title: "Hari Pertama",
    reqAffection: 0,
    reqLevel: 0,
    content: [
      { speaker: "Livia", text: "Jadi... ini kamarku yang baru.", expression: "normal" },
      { speaker: "Livia", text: "Kecil banget. Tapi ya sudahlah, namanya juga ngekos.", expression: "angry" },
      { speaker: "Livia", text: "Makasih udah bantu beresin barang-barangku. A-aku nggak nyuruh loh ya, kamu yang nawarin diri.", expression: "blushing",
        choices: [
          { text: "Nggak apa-apa, kan kita tetanggaan.", nextIndex: 3 },
          { text: "Lain kali bayar ya pakai traktiran.", nextIndex: 4 }
        ]
      },
      { speaker: "Narator", text: "Kamu tersenyum melihatnya salah tingkah mengatur barang.", expression: "normal", nextIndex: 5 },
      { speaker: "Livia", text: "Hah?! Pelit banget sih! Yaudah, nanti aku traktir es krim. Puas?!", expression: "angry", nextIndex: 6 },
      { speaker: "Livia", text: "Apa senyum-senyum?! Jangan mikir macem-macem!", expression: "angry", nextIndex: 6 },
      { speaker: "Livia", text: "Mending kamu balik ke kamarmu sana. Aku mau istirahat.", expression: "normal" },
      { speaker: "Narator", text: "Kamu mengangguk dan berbalik pergi ke kamarmu yang terletak persis di sebelahnya.", expression: "normal" },
      { speaker: "Livia", text: "...Hei.", expression: "normal" },
      { speaker: "Livia", text: "Tolong... bimbingannya ya, tetangga.", expression: "blushing" }
    ]
  },
  {
    id: 1,
    title: "Kenalan",
    reqAffection: 20,
    reqLevel: 1,
    content: [
      { speaker: "Livia", text: "Hei. Kamu lagi sibuk nggak?", expression: "normal" },
      { speaker: "Narator", text: "Kamu menoleh dari mejamu, melihat Livia mengintip dari balik pintu yang setengah terbuka.", expression: "normal" },
      { speaker: "Livia", text: "Ibuku nelpon tadi. Nanyain aku betah atau nggak tinggal di sini.", expression: "normal" },
      { speaker: "Livia", text: "Tentu saja aku bilang betah! Aku bukan anak kecil lagi yang harus diurusin.", expression: "angry" },
      { speaker: "Livia", text: "Lagipula... lingkungan di sini lumayan. Nggak seburuk yang kubayangkan.", expression: "blushing" },
      { speaker: "Livia", text: "Dan, eh... kamu lumayan bisa diandalkan juga sebagai tetangga.", expression: "happy",
        choices: [
          { text: "Makasih. Kamu juga tetangga yang baik.", nextIndex: 6 },
          { text: "Tumben kamu muji? Ada maunya ya?", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "J-jangan dibalas serius gitu dong! Bikin malu aja!", expression: "blushing", nextIndex: 8 },
      { speaker: "Livia", text: "Enak aja! Aku kan cuma jujur! Udah ah, males ngomong sama kamu!", expression: "angry", nextIndex: 8 },
      { speaker: "Narator", text: "Dia memalingkan wajahnya sedikit, pura-pura melihat ke arah koridor.", expression: "normal" },
      { speaker: "Livia", text: "Sudahlah, aku mau masak mi instan.", expression: "normal" },
      { speaker: "Livia", text: "...Kamu mau kubuatin juga nggak? Tanggung airnya sekalian direbus.", expression: "clingy" }
    ]
  },
  {
    id: 2,
    title: "Kecoa Malam",
    reqAffection: 40,
    reqLevel: 2,
    content: [
      { speaker: "Narator", text: "Cuaca malam ini sedang hujan deras. Terdengar suara ketukan pelan di pintu kamarmu.", expression: "normal" },
      { speaker: "Livia", text: "Hei... kamu udah tidur belum?", expression: "normal" },
      { speaker: "Narator", text: "Livia berdiri di depan pintumu sambil memeluk bantal bonekanya.", expression: "normal" },
      { speaker: "Livia", text: "Di kamarku ada kecoa besar! Aku udah coba usir, tapi dia malah terbang!", expression: "angry" },
      { speaker: "Livia", text: "A-aku nggak takut kok! Cuma jijik aja! Paham kan bedanya?!", expression: "blushing",
        choices: [
          { text: "Iya iya, aku bantu usir.", nextIndex: 5 },
          { text: "Biarin aja, nanti juga hilang sendiri.", nextIndex: 6 }
        ]
      },
      { speaker: "Livia", text: "Cepat ambil sapu lidi atau apalah! Kalau dia hilang di bawah kasurku, aku bakal numpang tidur di sini!", expression: "clingy", nextIndex: 7 },
      { speaker: "Livia", text: "Jahat banget sih?! Gimana aku bisa tidur kalau ada monster itu di kamarku?!", expression: "angry", nextIndex: 7 },
      { speaker: "Livia", text: "Ehh— tunggu, barusan aku ngomong apa?! Lupakan! Pokoknya cepat bunuh kecoanya!", expression: "angry" }
    ]
  },
  {
    id: 3,
    title: "Rumah Kedua",
    reqAffection: 60,
    reqLevel: 3,
    content: [
      { speaker: "Narator", text: "Akhir pekan yang tenang. Kamu sedang menyeduh kopi saat Livia menghampiri area dapur bersama.", expression: "normal" },
      { speaker: "Livia", text: "Nih. Ibu ngirim terlalu banyak kue kering dari rumah.", expression: "normal" },
      { speaker: "Livia", text: "Karena kamarku nggak muat, kamu ambil sebagian. Bukannya aku sengaja nyisihin buatmu, ya!", expression: "blushing",
        choices: [
          { text: "Wah, makasih! Kelihatannya enak.", nextIndex: 3 },
          { text: "Bilang aja sengaja nyisihin buatku.", nextIndex: 4 }
        ]
      },
      { speaker: "Livia", text: "Syukurlah kalau kamu suka... Eh, maksudku, wajar kalau rasanya enak, itu buatan ibuku!", expression: "happy", nextIndex: 5 },
      { speaker: "Livia", text: "U-udah kubilang bukan gitu! Mau dibalikin nggak nih kuenya?!", expression: "angry", nextIndex: 5 },
      { speaker: "Livia", text: "Kamu tahu, belakangan ini aku merasa ngekos nggak seburuk yang kukira.", expression: "normal" },
      { speaker: "Livia", text: "Awalnya aku takut sendirian. Tapi karena... karena ada seseorang yang terus memperhatikanku...", expression: "blushing" },
      { speaker: "Livia", text: "Rasanya tempat ini sedikit terasa seperti rumah kedua. Gitu deh.", expression: "clingy" }
    ]
  },
  {
    id: 4,
    title: "Sahabat",
    reqAffection: 80,
    reqLevel: 4,
    content: [
      { speaker: "Livia", text: "Kamu lagi ngerjain tugas? Fokus banget dari tadi.", expression: "normal" },
      { speaker: "Livia", text: "Aku beliin es kopi waktu keluar tadi. Satu buatku, satu buatmu. Jangan protes, minum aja.", expression: "happy",
        choices: [
          { text: "Tumben baik banget? Makasih ya.", nextIndex: 2 },
          { text: "Harganya dipotong dari uang kos kan?", nextIndex: 3 }
        ]
      },
      { speaker: "Narator", text: "Kamu menyadari belakangan ini Livia lebih sering menghabiskan waktu di area kerjamu daripada di kamarnya sendiri.", expression: "normal", nextIndex: 4 },
      { speaker: "Livia", text: "Enak aja! Aku pakai uangku sendiri tau! Nggak tahu terima kasih banget sih!", expression: "angry", nextIndex: 4 },
      { speaker: "Livia", text: "Kenapa ngeliatin gitu? Kamarku Wi-Finya lagi lambat, makanya aku duduk di sini! Jangan GR!", expression: "angry" },
      { speaker: "Livia", text: "Terserah kamu mau mikir apa... Aku cuma... merasa lebih tenang kalau ada di dekatmu. Udah, puasss?!", expression: "clingy" },
      { speaker: "Narator", text: "Kamu tersenyum sambil menyeruput es kopimu. Livia kembali fokus ke laptopnya dengan wajah memerah.", expression: "normal" }
    ]
  },
  {
    id: 5,
    title: "Rumah Kita",
    reqAffection: 100,
    reqLevel: 5,
    content: [
      { speaker: "Narator", text: "Beberapa bulan telah berlalu sejak awal kepindahan Livia ke kos ini.", expression: "normal" },
      { speaker: "Livia", text: "Waktu cepat banget berlalu ya.", expression: "normal" },
      { speaker: "Livia", text: "Dulu aku benci banget ninggalin rumah. Tapi sekarang... rasanya aku nggak mau pergi dari tempat ini.", expression: "happy" },
      { speaker: "Livia", text: "Bukan karena kamarnya ya! Kamarnya masih sempit dan atapnya kadang bocor!", expression: "angry",
        choices: [
          { text: "Lalu karena apa dong?", nextIndex: 4 },
          { text: "Iya, kamu nggak mau jauh dariku kan?", nextIndex: 5 }
        ]
      },
      { speaker: "Livia", text: "Karena... umm... karena alasan lain.", expression: "blushing", nextIndex: 6 },
      { speaker: "Livia", text: "P-percaya diri banget sih kamu! Walaupun... ya, sedikit benar sih...", expression: "blushing", nextIndex: 6 },
      { speaker: "Narator", text: "Livia menarik ujung lengan bajumu pelan, menatap lurus ke arah matamu.", expression: "normal" },
      { speaker: "Livia", text: "Kamu tahu kan kalau kamu itu spesial buatku?", expression: "clingy" },
      { speaker: "Livia", text: "Terima kasih... karena selalu sabar menghadapiku. Terima kasih sudah jadi 'rumah' baruku.", expression: "happy" },
      { speaker: "Livia", text: "Mulai sekarang, tolong terus berada di sisiku ya. Janji?", expression: "blushing" }
    ]
  },
  {
    id: 6,
    title: "Sebuah Kebiasaan",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Umur akun minimal 7 Hari", met: data.accountDays >= 7 },
      { label: "Screen time minimal 50 Jam", met: data.screenTimeHours >= 50 }
    ],
    content: [
      { speaker: "Narator", text: "Pagi itu, sinar mentari menembus jendela kamarmu. Kamu menemukan secangkir kopi panas sudah tersedia di atas meja.", expression: "normal" },
      { speaker: "Livia", text: "Udah bangun? Tuh kopinya diminum mumpung masih hangat.", expression: "normal" },
      { speaker: "Narator", text: "Kamu menatap heran. Livia yang dulunya selalu bangun siang, kini sudah rapi dengan celemeknya.", expression: "normal" },
      { speaker: "Livia", text: "Apa liat-liat?! Nggak usah mikir macem-macem. Aku cuma kebetulan bangun kepagian dan sekalian aja bikin kopi!", expression: "angry",
        choices: [
          { text: "Makasih ya, ini manis banget.", nextIndex: 4 },
          { text: "Bohong, pasti sengaja kan pengen merhatiin aku?", nextIndex: 5 }
        ]
      },
      { speaker: "Livia", text: "Y-ya namanya juga tinggal serumah... kita harus saling mengandalkan kan?", expression: "blushing", nextIndex: 6 },
      { speaker: "Livia", text: "T-tahu dari mana?! Ugh... pokoknya minum aja jangan banyak omong!", expression: "angry", nextIndex: 6 },
      { speaker: "Narator", text: "Livia duduk di kursi sebelahmu sambil membuka buku catatannya.", expression: "normal" },
      { speaker: "Livia", text: "Ngomong-ngomong, aku perhatiin belakangan ini kamu kerja terlalu keras. Jangan lupa istirahat.", expression: "clingy" },
      { speaker: "Livia", text: "Karena... kalau kamu tumbang, siapa yang mau direpotin sama kelakuan manjaku nanti?", expression: "happy" }
    ]
  },
  {
    id: 7,
    title: "Akhir Pekan Pemalas",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Umur akun minimal 14 Hari", met: data.accountDays >= 14 },
      { label: "Screen time minimal 70 Jam", met: data.screenTimeHours >= 70 },
      { label: "Memiliki Baju Kasual", met: data.itemsBrought.includes('outfit_casual') }
    ],
    content: [
      { speaker: "Narator", text: "Akhir pekan tiba, dan hujan turun rintik-rintik membasahi jendela kosan.", expression: "normal" },
      { speaker: "Livia", text: "Haaah... cuaca begini enaknya tiduran aja seharian pakai baju kaus kebesaran.", expression: "happy" },
      { speaker: "Livia", text: "Sini dong, temenin aku rebahan. Nggak usah mikirin tugas dan kerjaan terus.", expression: "clingy",
        choices: [
          { text: "Nanti aku ketularan malasnya loh.", nextIndex: 4 },
          { text: "Boleh deh, lima menit aja ya.", nextIndex: 5 }
        ]
      },
      { speaker: "Livia", text: "Ih, bilang aja kamu nggak mau rebahan di dekatku! Dasar sok rajin!", expression: "angry", nextIndex: 6 },
      { speaker: "Livia", text: "Hmph... bohong banget, ujung-ujungnya palingan kamu ketiduran juga di sini.", expression: "blushing", nextIndex: 6 },
      { speaker: "Narator", text: "Kamu akhirnya ikut berbaring santai di sebelahnya sambil mendengarkan rintik hujan.", expression: "normal" },
      { speaker: "Livia", text: "Hehe... nyaman banget kan? Sesekali jadi kaum mageran itu nggak ada salahnya tau.", expression: "happy" },
      { speaker: "Livia", text: "Ssst... udah ah, jangan banyak gerak. Biar aku bisa meluk tanganmu.", expression: "clingy" }
    ]
  },
  {
    id: 8,
    title: "Pulang Kampung",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Umur akun minimal 21 Hari", met: data.accountDays >= 21 },
      { label: "Screen time minimal 120 Jam", met: data.screenTimeHours >= 120 },
      { label: "Sudah pernah ke Festival", met: data.itemsBrought.includes('visited_festival') },
      { label: "Memiliki Trench Coat", met: data.itemsBrought.includes('trench_coat') }
    ],
    content: [
      { speaker: "Narator", text: "Perjalanan menggunakan kereta yang panjang akhirnya membawa kalian ke kampung halaman Livia.", expression: "normal" },
      { speaker: "Livia", text: "Brrr... anginnya lumayan dingin di sini. Padahal aku udah pakai jaket tebal.", expression: "normal" },
      { speaker: "Livia", text: "Sini, pinjam tanganmu bentar...", expression: "clingy" },
      { speaker: "Narator", text: "Livia menyelipkan kedua tangannya yang dingin ke dalam saku mantelmu, menyatu dengan tanganmu.", expression: "normal" },
      { speaker: "Livia", text: "Hehe... pakaian tebal ini hangat... tapi tanganmu jauh lebih hangat.", expression: "happy" },
      { speaker: "Livia", text: "Ibu pasti kaget kalau tahu aku pulang bawa... ya gitu deh.", expression: "blushing",
        choices: [
          { text: "Bawa calon mantu idaman?", nextIndex: 7 },
          { text: "Bawa tukang bersih-bersih kamar gratis?", nextIndex: 8 }
        ]
      },
      { speaker: "Livia", text: "I-iya... ibu udah lama pengen ketemu orang yang selalu kuceritain di telepon.", expression: "blushing", nextIndex: 9 },
      { speaker: "Livia", text: "Hei! Kok kamu merusak suasana sih! Setidaknya kamu kan lebih berharga dari sekadar tukang bersih-bersih!", expression: "angry", nextIndex: 9 },
      { speaker: "Narator", text: "Kalian berdua berjalan menyusuri jalan kecil menuju rumah keluarganya.", expression: "normal" },
      { speaker: "Livia", text: "Di kamar lamaku nanti, aku mau ngambil beberapa barang peninggalan masa kecilku. Bantuin pilih ya nanti?", expression: "happy" }
    ]
  },
  {
    id: 9,
    title: "Sebuah Janji",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Umur akun minimal 30 Hari", met: data.accountDays >= 30 },
      { label: "Screen time minimal 150 Jam", met: data.screenTimeHours >= 150 }
    ],
    content: [
      { speaker: "Narator", text: "Malam itu, di bawah langit penuh bintang di balkon kosan yang kini menjadi saksi bisu kebersamaan kalian.", expression: "normal" },
      { speaker: "Livia", text: "Angin malam ini sejuk ya. Nggak kerasa kita udah ngelewatin banyak hal berdua.", expression: "happy" },
      { speaker: "Narator", text: "Kamu mengangguk pelan, lalu merogoh sakumu dan mengeluarkan sebuah kotak kecil berlapis beludru.", expression: "normal" },
      { speaker: "Narator", text: "Kamu membuka kotak itu perlahan, memperlihatkan sebuah cincin sederhana namun elegan.", expression: "normal" },
      { speaker: "Livia", text: "E-eh...? I-ini beneran? Kamu...", expression: "blushing",
        choices: [
          { text: "Menikahlah denganku, Livia.", nextIndex: 6 },
          { text: "Kalau nggak mau, cincinnya buat kucing garong di bawah loh.", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "Bodoh... kamu bikin aku cengeng tau nggak... hiks...", expression: "crying", nextIndex: 8 },
      { speaker: "Livia", text: "Jangan merusak momen seromantis ini dong idiot! Mana sini cincinnya!!", expression: "angry", nextIndex: 8 },
      { speaker: "Narator", text: "Livia menyodorkan jari manisnya ke arahmu dengan tangan sedikit gemetar.", expression: "normal" },
      { speaker: "Livia", text: "Cepat pasangkan... sebelum aku berubah pikiran malu...", expression: "blushing" },
      { speaker: "Narator", text: "Malam itu, janji untuk hidup menua bersama resmi terukir di antara kalian.", expression: "normal" }
    ]
  },
  {
    id: 10,
    title: "Persiapan Pernikahan",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Memiliki Cincin Nikah", met: data.itemsBrought.includes('cincin_nikah') },
      { label: "Mengurus Berkas KUA", met: data.itemsBrought.includes('berkas_kua') },
      { label: "Memesan Gedung Resepsi", met: data.itemsBrought.includes('gedung_resepsi') },
      { label: "Memesan Katering", met: data.itemsBrought.includes('katering') }
    ],
    content: [
      { speaker: "Narator", text: "Kamar kosan yang dulu sepi kini penuh dengan tumpukan berkas KUA, brosur katering, dan denah gedung resepsi.", expression: "normal" },
      { speaker: "Livia", text: "Huft... Coba aku cek lagi. Berkas KUA udah lengkap, DP gedung udah beres, katering juga udah test food...", expression: "normal" },
      { speaker: "Livia", text: "Ternyata nyiapin pernikahan itu capek banget ya! Punggungku sampai pegal.", expression: "angry",
        choices: [
          { text: "Sini kupijat pundaknya.", nextIndex: 4 },
          { text: "Tapi seru kan karena ngurusnya berdua?", nextIndex: 5 }
        ]
      },
      { speaker: "Livia", text: "Mmm... makasih. Pijatanmu lumayan juga. Bikin rasa capeknya langsung hilang separuh.", expression: "happy", nextIndex: 6 },
      { speaker: "Livia", text: "I-iya sih... kalau nggak sama kamu, aku pasti udah nyerah dari kemarin-kemarin.", expression: "blushing", nextIndex: 6 },
      { speaker: "Narator", text: "Livia menyenderkan kepalanya ke bahumu, menghembuskan napas lega.", expression: "normal" },
      { speaker: "Livia", text: "Akhirnya... semua sudah siap. Terima kasih karena sudah bertahan denganku dan segala kekuranganku selama ini.", expression: "clingy" },
      { speaker: "Livia", text: "Aku nggak sabar nunggu hari H-nya tiba. Mulai dari titik ini, mohon bimbingannya terus ya, Suamiku.", expression: "happy" },
      { speaker: "Narator", text: "Kamu tersenyum, menyadari bahwa perjalanan ini bukanlah akhir, melainkan awal dari cerita baru kalian yang abadi.", expression: "normal" }
    ]
  },
  {
    id: 11,
    title: "Pernikahan Suci",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Membeli Gaun Pengantin", met: data.itemsBrought.includes('gaun_pengantin') }
    ],
    content: [
      { speaker: "Narator", text: "Lonceng gereja berdentang. Kamu berdiri di altar, menunggu sosok yang selama ini menemani hari-harimu.", expression: "normal" },
      { speaker: "Narator", text: "Pintu terbuka. Livia berjalan anggun dalam balutan gaun pengantin putih yang sempurna membalut tubuhnya.", expression: "normal" },
      { speaker: "Livia", text: "B-bagaimana? A-aku kelihatan aneh ya pakai gaun semahal ini?", expression: "blushing",
        choices: [
          { text: "Kamu adalah pengantin paling cantik di dunia.", nextIndex: 6 },
          { text: "Lumayan, sayangnya orangnya galak.", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "Bodoh... di depan banyak orang jangan ngomong gitu... wajahku jadi panas kan...", expression: "crying", nextIndex: 8 },
      { speaker: "Livia", text: "Di hari pernikahan kita kamu masih aja ngajak berantem?! Awas ya nanti malam!", expression: "angry", nextIndex: 8 },
      { speaker: "Narator", text: "Sang pendeta mengucapkan janji suci. Kalian menyematkan cincin, disoraki oleh tepuk tangan meriah.", expression: "normal" },
      { speaker: "Livia", text: "Mulai detik ini, panggil aku Istrimu. Jangan berani-berani lirik perempuan lain!", expression: "clingy" }
    ]
  },
  {
    id: 12,
    title: "Pulang ke Kuil Keluarga",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Sudah Menikah (Punya Gaun)", met: data.itemsBrought.includes('gaun_pengantin') },
      { label: "Memakai Trench Coat", met: data.activeOutfit === 'trench_coat' || data.itemsBrought.includes('trench_coat') },
      { label: "Umur akun minimal 70 Hari", met: data.accountDays >= 70 }
    ],
    content: [
      { speaker: "Narator", text: "Mobil melaju memasuki pelataran kuil tua yang megah. Ini adalah rumah masa kecilmu, keluarga pengurus kuil dengan tradisi yang sangat ketat.", expression: "normal" },
      { speaker: "Livia", text: "J-jadi ini rumah orang tuamu? Gede banget... aku jadi deg-degan.", expression: "blushing" },
      { speaker: "Narator", text: "Ibumu yang berwajah tegas menyambut kalian di pintu utama.", expression: "normal" },
      { speaker: "Livia", text: "S-selamat siang, Ibu mertua... S-saya Livia...", expression: "blushing" },
      { speaker: "Narator", text: "Ketegangan mencair saat ibumu tersenyum hangat dan memeluk Livia. Tradisi kuil mengharuskan ibumu memberikan satu berkah suci untuk sang pengantin baru.", expression: "normal" },
      { speaker: "Narator", text: "Pilihlah satu berkah dengan bijak, karena itu akan menentukan masa depan kalian.", expression: "normal" }
    ]
  },
  {
    id: 13,
    title: "Babak Baru",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Telah Memilih Berkah", met: data.itemsBrought.some(i => i.startsWith('berkah_')) }
    ],
    getDynamicContent: (data) => {
      const isFertility = data.itemsBrought.includes('berkah_kesuburan');
      const isHealth = data.itemsBrought.includes('berkah_kesehatan');
      const isWealth = data.itemsBrought.includes('berkah_kekayaan');

      if (isFertility) {
        return [
          { speaker: "Narator", text: "Beberapa bulan setelah menerima Berkah Kesuburan dari kuil keluargamu...", expression: "normal" },
          { speaker: "Livia", text: "S-sayang... lihat ini...", expression: "blushing" },
          { speaker: "Narator", text: "Livia menunjukkan sebuah test pack dengan dua garis merah yang jelas.", expression: "normal" },
          { speaker: "Livia", text: "Aku... kita... akan jadi orang tua. Kamu bakal jadi ayah yang baik kan?", expression: "crying" }
        ];
      } else if (isHealth) {
        return [
          { speaker: "Narator", text: "Sejak menerima Berkah Kesehatan, fisik Livia menjadi jauh lebih bugar dan bersemangat.", expression: "normal" },
          { speaker: "Livia", text: "Ayo lari pagi lagi! Masa suamiku kalah tenaga sama istrinya?", expression: "happy" },
          { speaker: "Narator", text: "Kamu tersenyum pasrah mengikuti langkahnya yang lincah menembus embun pagi.", expression: "normal" }
        ];
      } else {
        return [
          { speaker: "Narator", text: "Berkah Kekayaan dari kuil ternyata membuka pintu rezeki yang tak terduga untuk karir kalian berdua.", expression: "normal" },
          { speaker: "Livia", text: "Wah... bonus bulan ini cair besar banget! Kita bisa beli rumah sendiri sekarang!", expression: "happy" },
          { speaker: "Livia", text: "Kerja keras kita nggak sia-sia. Makasih ya udah selalu berusaha keras buat keluarga kita.", expression: "clingy" }
        ];
      }
    }
  },
  {
    id: 14,
    title: "Ujian Perjalanan",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Menyelesaikan Bab Sebelumnya", met: data.itemsBrought.some(i => i.startsWith('berkah_')) }
    ],
    getDynamicContent: (data) => {
      const isFertility = data.itemsBrought.includes('berkah_kesuburan');
      if (isFertility) {
        return [
          { speaker: "Narator", text: "Masa ngidam Livia menjadi tantangan terberatmu. Malam ini, ia membangunkanmu jam 2 pagi.", expression: "normal" },
          { speaker: "Livia", text: "Sayang... dedek bayinya pengen makan sate padang... tapi bumbunya dipisah di mangkok warna pink.", expression: "clingy" }
        ];
      }
      return [
        { speaker: "Narator", text: "Kehidupan pernikahan tidak selalu mulus, tapi kalian selalu bisa melewatinya berdua.", expression: "normal" },
        { speaker: "Livia", text: "Jangan pernah simpan masalah sendirian. Ingat, kita udah janji buat bagi beban berdua.", expression: "normal" }
      ];
    }
  },
  {
    id: 15,
    title: "Selamanya",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Telah Memilih Berkah", met: data.itemsBrought.some(i => i.startsWith('berkah_')) }
    ],
    getDynamicContent: (data) => {
      const isFertility = data.itemsBrought.includes('berkah_kesuburan');
      if (isFertility) {
        return [
          { speaker: "Narator", text: "Tangisan bayi memecah keheningan malam. Keluarga kecilmu kini telah utuh.", expression: "normal" },
          { speaker: "Livia", text: "Lihat... dia punya matamu. Dia akan tumbuh sehebat ayahnya.", expression: "happy" }
        ];
      }
      return [
        { speaker: "Narator", text: "Tahun-tahun berlalu, dan genggaman tangan kalian masih sama eratnya seperti hari pertama.", expression: "normal" },
        { speaker: "Livia", text: "Aku nggak pernah menyesal memilihmu. Mari menua bersama, suamiku tersayang.", expression: "happy" }
      ];
    }
  }
];

export default function StoryPage() {
  const [unlockedChapters, setUnlockedChapters] = useState<number[]>([0]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [hoveredChapterId, setHoveredChapterId] = useState<number>(0);
  const [affectionLevel, setAffectionLevel] = useState<number>(0);
  const [lockedChapterReqs, setLockedChapterReqs] = useState<Chapter | null>(null);
  
  const [showHometownPicker, setShowHometownPicker] = useState(false);
  const [selectedHometownItems, setSelectedHometownItems] = useState<string[]>([]);
  const [isSubmittingHometown, setIsSubmittingHometown] = useState(false);

  const [showBlessingPicker, setShowBlessingPicker] = useState(false);
  const [selectedBlessing, setSelectedBlessing] = useState<string | null>(null);

  const [userStats, setUserStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/affection');
        if (res.ok) {
          const data = await res.json();
          if (data.unlockedChapters) {
            setUnlockedChapters(data.unlockedChapters);
          }
          if (data.affection !== undefined) {
            setAffectionLevel(data.affection);
          }
          setUserStats({
            affection: data.affection || 0,
            accountDays: data.accountDays || 0,
            screenTimeHours: data.screenTimeHours || 0,
            itemsBrought: data.itemsBrought || [],
            activeOutfit: data.activeOutfit || 'default'
          });
        }
      } catch (e) {
        console.error('Failed to fetch story progress', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const openChapter = (chap: Chapter) => {
    setActiveChapter(chap);
    setSceneIndex(0);
  };

  const handleNextScene = () => {
    if (!activeChapter) return;
    
    const scenes = activeChapter.getDynamicContent ? activeChapter.getDynamicContent(userStats!) : activeChapter.content!;
    if (sceneIndex < scenes.length - 1) {
      setSceneIndex(prev => prev + 1);
    } else {
      if (activeChapter.id === 8 && userStats && !userStats.itemsBrought.some(i => i.startsWith('hometown_'))) {
        setShowHometownPicker(true);
      } else if (activeChapter.id === 12 && userStats && !userStats.itemsBrought.some(i => i.startsWith('berkah_'))) {
        setShowBlessingPicker(true);
      } else {
        setActiveChapter(null);
      }
    }
  };

  const handleChoice = (nextIdx: number) => {
    setSceneIndex(nextIdx);
  };

  const toggleHometownItem = (id: string) => {
    if (selectedHometownItems.includes(id)) {
      setSelectedHometownItems(prev => prev.filter(i => i !== id));
    } else if (selectedHometownItems.length < 3) {
      setSelectedHometownItems(prev => [...prev, id]);
    }
  };

  const submitHometownItems = async () => {
    if (selectedHometownItems.length !== 3) return;
    setIsSubmittingHometown(true);
    try {
      await fetch('/api/hometown-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedHometownItems })
      });
      setUserStats(prev => prev ? { ...prev, itemsBrought: [...prev.itemsBrought, ...selectedHometownItems] } : null);
      setShowHometownPicker(false);
      setActiveChapter(null);
    } catch (e) {
      console.error(e);
    }
    setIsSubmittingHometown(false);
  };

  const submitBlessing = async () => {
    if (!selectedBlessing) return;
    setIsSubmittingHometown(true);
    try {
      await fetch('/api/hometown-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [selectedBlessing] })
      });
      setUserStats(prev => prev ? { ...prev, itemsBrought: [...prev.itemsBrought, selectedBlessing] } : null);
      setShowBlessingPicker(false);
      setActiveChapter(null);
    } catch (e) {
      console.error(e);
    }
    setIsSubmittingHometown(false);
  };

  const currentScenes = activeChapter ? (activeChapter.getDynamicContent ? activeChapter.getDynamicContent(userStats!) : activeChapter.content!) : [];
  const scene = activeChapter ? currentScenes[sceneIndex] : null;

  if (isLoading) return <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center font-display font-bold text-pink-400"><Loader2 className="animate-spin mr-2" /> Memuat...</div>;

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative flex justify-center items-center overflow-hidden font-sans select-none">
      
      {activeChapter ? (
        <div className="fixed inset-0 z-[100] bg-[#fdfbf7]/95 backdrop-blur-xl flex flex-col items-center justify-between py-6 md:py-12 px-4 md:px-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-full max-w-5xl flex justify-between px-2 md:px-8 z-20 mt-8 md:mt-0">
            <span className="font-display font-bold text-sm md:text-base text-[#ff758c] bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-[0_5px_15px_rgba(255,117,140,0.15)] border border-pink-50">
              {activeChapter.title}
            </span>
            <button onClick={() => setActiveChapter(null)} className="text-gray-400 hover:text-[#ff758c] text-sm md:text-base font-bold bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              Tutup X
            </button>
          </div>
          
          <div className="flex-1 w-full max-w-4xl flex justify-center items-end pb-4 md:pb-8 z-10">
            {scene?.speaker === 'Livia' && (
              <div className="h-[55vh] md:h-[60vh] w-auto drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)] animate-[float_4s_ease-in-out_infinite]">
                <LiviaSprite expression={scene.expression} className="h-full w-auto max-w-[500px] object-contain object-bottom" />
              </div>
            )}
          </div>
          
          <div className="w-full max-w-4xl z-20 drop-shadow-2xl relative flex flex-col items-center">
            {scene?.choices && (
              <div className="absolute bottom-[100%] w-[90%] md:w-full flex flex-col items-center gap-2 md:gap-3 mb-4 md:mb-6 animate-[fadeIn_0.4s_ease-out_forwards]">
                {scene.choices.map((choice, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChoice(choice.nextIndex)}
                    className="w-full max-w-lg bg-white/95 backdrop-blur-md border-2 border-pink-100 py-3 md:py-4 px-4 md:px-6 rounded-2xl shadow-[0_10px_25px_rgba(255,117,140,0.15)] text-[#5c4d47] font-bold font-display hover:border-[#ff758c] hover:text-[#ff758c] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(255,117,140,0.2)] transition-all duration-300 text-center text-sm md:text-lg active:scale-95"
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            )}

            <div className="w-full">
              <DialogBox 
                text={scene?.text || ''}
                speaker={scene?.speaker === 'Narator' ? '' : scene?.speaker || ''}
                onNext={scene?.choices ? () => {} : handleNextScene}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex">
          <div 
            className="absolute inset-0 bg-cover bg-[60%_center] md:bg-center opacity-40 transition-all duration-1000 z-0"
            style={{ backgroundImage: `url('/bg/story-bg.webp')` }} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/10 pointer-events-none z-0" />
          
          {/* Center Background Sprite (16:9) - Desktop Only */}
          <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none z-10 overflow-hidden">
            <img 
              src={`/livia/story page/${
                userStats?.activeOutfit === 'outfit_casual' ? 'casual.webp' :
                userStats?.activeOutfit === 'outfit_school' ? 'uniform.webp' :
                userStats?.activeOutfit === 'outfit_yukata' ? 'yukata.webp' :
                'default.webp'
              }`} 
              alt="Livia Story"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Top Right Back Button */}
          <div className="absolute top-6 right-6 md:top-10 md:right-12 z-40">
            <button onClick={() => window.history.back()} className="font-display font-black text-xs md:text-sm text-[#8C7B6B] hover:text-[#ff758c] bg-white/50 backdrop-blur-md md:bg-transparent md:backdrop-blur-none px-3 md:px-0 py-2 md:py-0 rounded-full md:rounded-none transition-colors flex items-center gap-2 md:gap-3 uppercase tracking-widest shadow-sm md:shadow-none">
              <span className="text-lg md:text-xl">←</span> KEMBALI
            </button>
          </div>

          {/* Soft White Fade matching background for Chapter List */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#fdfbf7] via-[#fdfbf7]/90 to-transparent pointer-events-none z-20 w-[70%]" />

          {/* Left Menu Panel */}
          <div className="relative z-30 w-full md:w-[50%] h-full flex flex-col justify-center px-6 md:pl-24 md:pr-4 pt-16 md:pt-8 pb-12">
            
            <h1 className="text-4xl md:text-7xl font-display font-black text-[#5c4d47] mb-6 md:mb-8 drop-shadow-sm tracking-tighter flex items-center gap-2 md:gap-4 shrink-0">
              <span className="text-amber-400 text-3xl md:text-4xl animate-[pulse_3s_ease-in-out_infinite]">✦</span>
              CERITA KITA
            </h1>

            <div className="flex flex-col gap-2 w-full max-w-[450px] max-h-[65vh] overflow-y-auto overflow-x-hidden pr-4 pb-20 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent">
              {CHAPTERS.map(chap => {
                let isUnlocked = affectionLevel >= chap.reqAffection;
                let reqs: ReqCheck[] = [];
                
                if (chap.getRequirements && userStats) {
                  reqs = chap.getRequirements(userStats);
                  const allMet = reqs.every(r => r.met);
                  isUnlocked = isUnlocked && allMet;
                }

                const isHovered = hoveredChapterId === chap.id;

                return (
                  <div 
                    key={chap.id}
                    onMouseEnter={() => setHoveredChapterId(chap.id)}
                    onClick={() => isUnlocked ? openChapter(chap) : setLockedChapterReqs(chap)}
                    className={`relative py-4 px-6 cursor-pointer transition-all duration-300 ease-out flex flex-col justify-center border-l-[6px] ${
                      isUnlocked 
                        ? (isHovered ? 'border-[#ff758c] bg-gradient-to-r from-[#ff758c]/10 to-transparent translate-x-4' : 'border-transparent hover:bg-white/40') 
                        : 'border-transparent opacity-40 hover:opacity-60'
                    }`}
                  >
                    <div className="relative z-10 flex flex-col">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-xs font-mono tracking-[0.15em] font-bold uppercase transition-colors duration-300 ${isHovered && isUnlocked ? 'text-[#ff758c]' : 'text-amber-500'}`}>
                          BAB {String(chap.id).padStart(2, '0')}
                        </span>
                        {!isUnlocked && <Lock className="w-3 h-3 text-gray-400" />}
                      </div>
                      
                      <h3 className={`text-2xl md:text-3xl font-black font-display uppercase tracking-wider transition-all duration-300 ${isHovered && isUnlocked ? 'text-[#5c4d47]' : 'text-[#8C7B6B]'}`}>
                        {chap.title}
                      </h3>
                      
                      <div className={`text-sm md:text-[15px] mt-1 transition-colors duration-300 ${isHovered && isUnlocked ? 'text-[#5c4d47]' : 'text-gray-500'}`}>
                        {isUnlocked ? (
                          <p className="line-clamp-1">{chap.content?.[0]?.text || ""}</p>
                        ) : (
                          <p className="font-semibold italic text-[#8C7B6B]">Belum Terbuka</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Locked Chapter Modal */}
      {lockedChapterReqs && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 md:p-8 shadow-2xl border border-pink-100 flex flex-col gap-6 animate-[slideUp_0.3s_ease-out]">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center mb-2">
                <Lock className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="font-display font-black text-2xl text-[#5c4d47] leading-none">{lockedChapterReqs.title}</h3>
              <p className="text-sm text-gray-500">Penuhi semua syarat berikut untuk membuka bab ini.</p>
            </div>
            
            <div className="flex flex-col gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 text-sm font-medium">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${affectionLevel >= lockedChapterReqs.reqAffection ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                  {affectionLevel >= lockedChapterReqs.reqAffection ? "✓" : "✗"}
                </span>
                <span className={affectionLevel >= lockedChapterReqs.reqAffection ? "text-gray-800" : "text-gray-500"}>Afeksi {lockedChapterReqs.reqAffection}</span>
              </div>
              
              {lockedChapterReqs.getRequirements && userStats && lockedChapterReqs.getRequirements(userStats).map((r, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm font-medium">
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full ${r.met ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                    {r.met ? "✓" : "✗"}
                  </span>
                  <span className={r.met ? "text-gray-800" : "text-gray-500"}>{r.label}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setLockedChapterReqs(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors mt-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Hometown Picker Modal */}
      {showHometownPicker && userStats && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-[#fdfbf7] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#ff758c] to-[#ff0844] p-6 text-center shadow-md relative z-10">
              <h2 className="text-2xl md:text-3xl font-display font-black text-white flex items-center justify-center gap-2">
                <Package size={28} /> Kunjungan ke Kamar Livia
              </h2>
              <p className="text-pink-100 font-medium mt-1">Pilih 3 barang yang ingin kamu bawa kembali ke kos.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {ITEMS.filter(i => !userStats.itemsBrought.includes(i.id)).map(item => {
                  const isSelected = selectedHometownItems.includes(item.id);
                  const isMaxed = selectedHometownItems.length >= 3 && !isSelected;
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedHometownItems(prev => prev.filter(id => id !== item.id));
                        } else if (!isMaxed) {
                          setSelectedHometownItems(prev => [...prev, item.id]);
                        }
                      }}
                      className={`relative p-3 md:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected 
                          ? 'border-[#ff758c] bg-pink-50 shadow-[0_4px_15px_rgba(255,117,140,0.2)] -translate-y-1' 
                          : isMaxed
                          ? 'border-gray-100 bg-gray-50 opacity-50 grayscale cursor-not-allowed'
                          : 'border-pink-100 bg-white hover:border-pink-300 hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-3 -right-3 bg-[#ff758c] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm">
                          ✓
                        </div>
                      )}
                      <div className="text-3xl md:text-4xl text-center bg-gray-50/50 rounded-xl py-2">{item.emoji}</div>
                      <h3 className="font-bold text-[#5c4d47] text-sm leading-tight line-clamp-2 text-center">{item.name}</h3>
                      <p className="text-[10px] md:text-xs text-gray-500 line-clamp-2 text-center hidden md:block">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-pink-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                <span className="font-bold text-gray-500">Terpilih:</span>
                <div className="flex gap-2">
                  {[0, 1, 2].map(idx => (
                    <div key={idx} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      idx < selectedHometownItems.length 
                        ? 'bg-pink-100 border-2 border-pink-300' 
                        : 'bg-gray-100 border-2 border-dashed border-gray-300'
                    }`}>
                      {idx < selectedHometownItems.length ? ITEMS.find(i => i.id === selectedHometownItems[idx])?.emoji : '?'}
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                disabled={selectedHometownItems.length !== 3 || isSubmittingHometown}
                onClick={submitHometownItems}
                className={`w-full md:w-auto px-8 py-3.5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all ${
                  selectedHometownItems.length === 3 && !isSubmittingHometown
                    ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white shadow-[0_5px_15px_rgba(255,117,140,0.3)] hover:-translate-y-0.5'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmittingHometown ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> Bawa Pulang</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blessing Picker Modal */}
      {showBlessingPicker && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-300 to-yellow-500" />
            
            <div className="text-center mb-6">
              <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-2xl md:text-3xl font-display font-black text-[#5c4d47]">Berkah Kuil Suci</h2>
              <p className="text-gray-500 mt-2 text-sm md:text-base">Pilihlah 1 berkah dari Ibu mertuamu. Pilihan ini akan memengaruhi takdir pernikahan kalian ke depannya (Bab 13-15).</p>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 px-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'berkah_kesuburan', name: 'Kesuburan', icon: '👶', desc: 'Membawa kehidupan baru ke dalam keluarga.' },
                { id: 'berkah_kesehatan', name: 'Kesehatan', icon: '🏃‍♀️', desc: 'Fisik bugar dan umur yang panjang.' },
                { id: 'berkah_kekayaan', name: 'Kekayaan', icon: '💰', desc: 'Kemudahan rezeki dan karir yang meroket.' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedBlessing(item.id)}
                  className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 ${
                    selectedBlessing === item.id 
                      ? 'border-yellow-400 bg-yellow-50 shadow-md transform scale-105' 
                      : 'border-gray-100 bg-gray-50 hover:border-yellow-200 hover:bg-yellow-50/50'
                  }`}
                >
                  <span className="text-4xl">{item.icon}</span>
                  <span className="font-bold text-[#5c4d47]">{item.name}</span>
                  <span className="text-xs text-gray-500">{item.desc}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-center pt-4 border-t border-gray-100">
              <button 
                onClick={submitBlessing}
                disabled={!selectedBlessing || isSubmittingHometown}
                className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2"
              >
                {isSubmittingHometown ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Terima Berkah
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
