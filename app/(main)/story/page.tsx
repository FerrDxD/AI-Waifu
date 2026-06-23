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
          { text: "Sama-sama. Kalau butuh bantuan lagi bilang aja ya.", nextIndex: 3 },
          { text: "Iya deh si paling mandiri. Awas nangis cari ibunya.", nextIndex: 4 },
          { text: "Jangankan beresin barang, beresin hatimu juga aku siap.", nextIndex: 5 },
          { text: "Secara teknis, koper seberat itu berbahaya kalau diangkat sendirian.", nextIndex: 6 }
        ]
      },
      { speaker: "Narator", text: "Kamu tersenyum ramah. Livia mengalihkan pandangannya malu-malu.", expression: "normal", nextIndex: 7 },
      { speaker: "Livia", text: "Enak aja! Siapa yang mau nangis?! Nyebelin banget sih!", expression: "angry", nextIndex: 7 },
      { speaker: "Livia", text: "H-hah?! Jangan ngaco deh! Jaga ucapanmu!", expression: "blushing", nextIndex: 7 },
      { speaker: "Livia", text: "Hmph, bilang aja kamu ngeremehin tenagaku kan?!", expression: "angry", nextIndex: 7 },
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
          { text: "Makasih. Senang bisa membantu tetangga.", nextIndex: 6 },
          { text: "Wah, matahari terbit dari barat nih? Tumben muji.", nextIndex: 7 },
          { text: "Aduh, dipuji gadis manis begini jadi deg-degan.", nextIndex: 8 },
          { text: "Statistik menunjukkan gotong royong meningkatkan kenyamanan kos.", nextIndex: 9 }
        ]
      },
      { speaker: "Livia", text: "Y-ya makanya jangan geer! Ini cuma pengakuan objektif!", expression: "blushing", nextIndex: 10 },
      { speaker: "Livia", text: "Nggak bisa dibilangin baik dikit ya?! Nyesel aku muji kamu!", expression: "angry", nextIndex: 10 },
      { speaker: "Livia", text: "B-bisa nggak sih gausah godain terus?! Dasar buaya!", expression: "blushing", nextIndex: 10 },
      { speaker: "Livia", text: "Kamu ini robot atau manusia sih?! Kaku banget jawabnya!", expression: "normal", nextIndex: 10 },
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
          { text: "Tenang, jangan panik. Sini aku bantu tangkap.", nextIndex: 5 },
          { text: "Katanya mandiri, sama serangga sekecil itu aja panik.", nextIndex: 6 },
          { text: "Sini sembunyi di kamarku aja, di sini aman kok.", nextIndex: 7 },
          { text: "Kecoa terbang kalau merasa terancam. Jangan bergerak tiba-tiba.", nextIndex: 8 }
        ]
      },
      { speaker: "Livia", text: "Cepat! Sebelum dia bertelur di kasurku!", expression: "clingy", nextIndex: 9 },
      { speaker: "Livia", text: "Ini beda kasus tau! Cepetan bantu usir atau kupukul kamu!", expression: "angry", nextIndex: 9 },
      { speaker: "Livia", text: "J-jangan manfaatin situasi buat cari kesempatan ya!", expression: "blushing", nextIndex: 9 },
      { speaker: "Livia", text: "Terus aku harus diam aja sementara dia terbang ke wajahku?! Cepetan!", expression: "angry", nextIndex: 9 },
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
          { text: "Wah, makasih banyak ya. Kelihatannya enak.", nextIndex: 3 },
          { text: "Biar nggak muat atau emang niat ngasih dari awal?", nextIndex: 4 },
          { text: "Pasti rasanya makin manis karena dikasih olehmu.", nextIndex: 5 },
          { text: "Kapasitas ruang kamarmu cukup kok, ini murni rasionalisasimu saja.", nextIndex: 6 }
        ]
      },
      { speaker: "Livia", text: "Syukurlah kalau kamu suka... Eh, maksudku wajar dong enak, itu buatan ibuku!", expression: "happy", nextIndex: 7 },
      { speaker: "Livia", text: "U-udah kubilang bukan gitu! Mau dibalikin nggak nih?!", expression: "angry", nextIndex: 7 },
      { speaker: "Livia", text: "G-gombalan murahan! Jangan harap aku luluh denger itu!", expression: "blushing", nextIndex: 7 },
      { speaker: "Livia", text: "Berisik! Tinggal terima aja susah banget sih pamer otak segala!", expression: "angry", nextIndex: 7 },
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
          { text: "Wah, lagi butuh banget ini. Makasih pengertiannya.", nextIndex: 2 },
          { text: "Awas nih, biasanya ada udang di balik batu.", nextIndex: 3 },
          { text: "Cie, udah pinter ya ngasih perhatian ke calon pacar.", nextIndex: 4 },
          { text: "Kafein di malam hari bisa mengganggu siklus sirkadian loh.", nextIndex: 5 }
        ]
      },
      { speaker: "Narator", text: "Livia tersenyum tipis melihatmu menikmati kopinya dengan senang.", expression: "happy", nextIndex: 6 },
      { speaker: "Livia", text: "Pikiranmu negatif terus! Yaudah sini balikin kalau curiga!", expression: "angry", nextIndex: 6 },
      { speaker: "Livia", text: "Hah?! S-siapa yang calon pacarmu?! Jangan ngelantur!", expression: "blushing", nextIndex: 6 },
      { speaker: "Livia", text: "Ya ampun, orang niat baik malah diceramahi medis! Bodo amat!", expression: "angry", nextIndex: 6 },
      { speaker: "Narator", text: "Kamu menyadari belakangan ini Livia lebih sering menghabiskan waktu di area kerjamu daripada di kamarnya sendiri.", expression: "normal" },
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
          { text: "Iya, aku ngerti kok. Pasti karena suasana kosnya hangat.", nextIndex: 4 },
          { text: "Halah, ngaku aja kamu betah karena ada tukang angkat barang gratisan.", nextIndex: 5 },
          { text: "Pasti karena tetangga sebelahmu ini terlalu tampan dan bikin kangen kan?", nextIndex: 6 },
          { text: "Adaptasi psikologis manusia memang butuh sekitar 3 bulan untuk merasa nyaman.", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "I-iya... suasananya. Dan... mungkin karena orang-orangnya juga.", expression: "blushing", nextIndex: 8 },
      { speaker: "Livia", text: "Ih, kamu ngerusak suasana yang lagi syahdu tau nggak?!", expression: "angry", nextIndex: 8 },
      { speaker: "Livia", text: "M-mana ada! Pede banget sih! ...Walaupun sedikit benar...", expression: "blushing", nextIndex: 8 },
      { speaker: "Livia", text: "Terserah teori psikologimu deh. Intinya aku nyaman di sini!", expression: "normal", nextIndex: 8 },
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
          { text: "Ini wangi kopinya enak banget. Terima kasih banyak ya.", nextIndex: 4 },
          { text: "Tumben? Jangan-jangan di dalamnya udah kamu masukin racun ya?", nextIndex: 5 },
          { text: "Wah, auranya udah kayak istri idaman yang nyiapin sarapan nih.", nextIndex: 6 },
          { text: "Peluang kamu 'kebetulan' bangun pagi sangat kecil secara empiris.", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "Hehe... syukurlah kalau kamu suka. Habiskan ya.", expression: "happy", nextIndex: 8 },
      { speaker: "Livia", text: "Biarin aja kuracun beneran biar kamu nggak bisa ngomong nyebelin lagi!", expression: "angry", nextIndex: 8 },
      { speaker: "Livia", text: "I-istri apanya?! Nggak usah ngaco masih pagi juga!", expression: "blushing", nextIndex: 8 },
      { speaker: "Livia", text: "Berisik ah! Suka-suka aku dong mau bangun jam berapa!", expression: "angry", nextIndex: 8 },
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
          { text: "Boleh deh, istirahat sebentar bareng kamu nggak ada salahnya.", nextIndex: 3 },
          { text: "Nanti kasurnya ikutan bau malas gara-gara kamu.", nextIndex: 4 },
          { text: "Wah, ini sih ajakan berbahaya. Yakin mau ditemenin?", nextIndex: 5 },
          { text: "Produktivitas memang perlu diimbangi dengan istirahat yang cukup.", nextIndex: 6 }
        ]
      },
      { speaker: "Livia", text: "Nah gitu dong, dari kemarin sibuk terus sih.", expression: "happy", nextIndex: 7 },
      { speaker: "Livia", text: "Enak aja! Aku udah mandi tau! Sini kutarik paksa kamu!", expression: "angry", nextIndex: 7 },
      { speaker: "Livia", text: "J-jangan mikir ngeres ya! Jaraknya minimal setengah meter!", expression: "blushing", nextIndex: 7 },
      { speaker: "Livia", text: "Iya, iya pak dosen. Sekarang praktekin istirahatnya, cepat.", expression: "normal", nextIndex: 7 },
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
          { text: "Nggak usah khawatir, aku bakal bersikap sopan ke keluargamu kok.", nextIndex: 6 },
          { text: "Bawa beban masyarakat alias diri kamu sendiri kan?", nextIndex: 7 },
          { text: "Bawa menantu tampan yang siap mengambil hati putrinya?", nextIndex: 8 },
          { text: "Kunjungan ini sudah dikomunikasikan kan? Reaksi terkejut harusnya terminimalisir.", nextIndex: 9 }
        ]
      },
      { speaker: "Livia", text: "Aku tahu kok kamu bisa diandalkan. Pegang tanganku lebih erat ya.", expression: "happy", nextIndex: 10 },
      { speaker: "Livia", text: "Bisa nggak sih nggak merusak momen manis ini sedetik aja?!", expression: "angry", nextIndex: 10 },
      { speaker: "Livia", text: "T-tampan dari mananya! Ibu pasti ketawa ngeliat gombalanmu!", expression: "blushing", nextIndex: 10 },
      { speaker: "Livia", text: "Ini bukan presentasi proposal ya! Kamu ini kaku banget deh.", expression: "angry", nextIndex: 10 },
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
          { text: "Maukah kamu menghabiskan sisa hidupmu bersamaku, Livia?", nextIndex: 5 },
          { text: "Kalau nggak mau cincinnya kulempar ke kucing garong di bawah nih.", nextIndex: 6 },
          { text: "Hanya cincin ini yang cukup berkilau untuk menyaingi matamu. Menikahlah denganku.", nextIndex: 7 },
          { text: "Berdasarkan durasi dan kualitas interaksi kita, pernikahan adalah langkah logis selanjutnya.", nextIndex: 8 }
        ]
      },
      { speaker: "Livia", text: "Bodoh... kamu bikin aku cengeng tau nggak... hiks... Tentu saja aku mau.", expression: "crying", nextIndex: 9 },
      { speaker: "Livia", text: "JANGAN! Ih kamu tuh ngajak nikah tapi ngeselin banget! Sini pakaikan!", expression: "angry", nextIndex: 9 },
      { speaker: "Livia", text: "B-bisa nggak gombalnya ditahan dulu?! Jantungku bisa meledak tau!", expression: "blushing", nextIndex: 9 },
      { speaker: "Livia", text: "Cara melamarmu jelek banget! Tapi... kesimpulannya aku setuju.", expression: "blushing", nextIndex: 9 },
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
          { text: "Kamu pasti lelah, sini aku pijat pundakmu perlahan.", nextIndex: 3 },
          { text: "Makanya, siapa suruh ngotot mau resepsi yang ribet-ribet.", nextIndex: 4 },
          { text: "Tenang aja, capeknya bakal terbayar lunas malam pertama nanti.", nextIndex: 5 },
          { text: "Kelelahan otot ini wajar karena tingginya kadar hormon stres kortisol.", nextIndex: 6 }
        ]
      },
      { speaker: "Livia", text: "Mmm... makasih. Tanganmu selalu tahu titik yang bikin pegalku hilang.", expression: "happy", nextIndex: 7 },
      { speaker: "Livia", text: "Ini kan momen sekali seumur hidup! Ngalah dikit kenapa sih sama istri?!", expression: "angry", nextIndex: 7 },
      { speaker: "Livia", text: "M-malam pertama apa?! Otakmu ngeres banget! Fokus nyusun berkas!", expression: "blushing", nextIndex: 7 },
      { speaker: "Livia", text: "Udah deh, stop pakai istilah ilmiah. Cukup pijat pundakku aja.", expression: "normal", nextIndex: 7 },
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
          { text: "Kamu adalah pengantin paling cantik dan sempurna di mataku.", nextIndex: 3 },
          { text: "Lumayan, sayangnya orangnya tetep aja galak seperti biasa.", nextIndex: 4 },
          { text: "Kamu terlihat sangat menggoda. Aku jadi ingin cepat-cepat selesai acaranya.", nextIndex: 5 },
          { text: "Gaunnya sangat proporsional dengan rasio tinggi dan postur tubuhmu.", nextIndex: 6 }
        ]
      },
      { speaker: "Livia", text: "Makasih... Kamu juga... terlihat sangat tampan hari ini.", expression: "blushing", nextIndex: 7 },
      { speaker: "Livia", text: "Di hari pernikahan kita kamu masih aja ngajak berantem?! Tunggu aja nanti malam!", expression: "angry", nextIndex: 7 },
      { speaker: "Livia", text: "Mesum! Jaga sikapmu di depan pendeta dan para tamu undangan!", expression: "blushing", nextIndex: 7 },
      { speaker: "Livia", text: "Pujian macam apa itu?! Bikin emosi aja di hari bahagia!", expression: "angry", nextIndex: 7 },
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

      if (isFertility) {
        return [
          { speaker: "Narator", text: "Beberapa bulan setelah kunjungan ke kuil, ada sesuatu yang berbeda pada Livia. Ia sering tersenyum sendiri di depan cermin.", expression: "normal" },
          { speaker: "Livia", text: "Sayang... kamu harus lihat ini...", expression: "blushing" },
          { speaker: "Narator", text: "Dengan tangan gemetar, ia menyodorkan sebuah test pack. Dua garis merah tercetak jelas di sana.", expression: "normal" },
          { speaker: "Livia", text: "A-aku hamil... Kita akan jadi orang tua! Tolong jaga kami berdua mulai sekarang ya, Ayah~", expression: "crying" }
        ];
      } else if (isHealth) {
        return [
          { speaker: "Narator", text: "Berkah Kesehatan benar-benar membawa keajaiban. Livia yang dulunya mudah lelah kini dipenuhi energi yang meluap-luap.", expression: "normal" },
          { speaker: "Livia", text: "Hei, pemalas! Ayo bangun! Pagi ini kita lari 10 kilometer, nggak ada penolakan!", expression: "happy" },
          { speaker: "Narator", text: "Kamu mendesah pasrah, ditarik paksa dari kasur oleh istrimu yang kini jauh lebih bersemangat darimu.", expression: "normal" },
          { speaker: "Livia", text: "Masa suaminya kalah stamina sama istrinya? Ayo kejar aku kalau bisa!", expression: "happy" }
        ];
      } else {
        return [
          { speaker: "Narator", text: "Berkah Kekayaan membuka pintu rezeki dengan sangat deras. Karir kalian menanjak pesat dan uang mengalir seperti air.", expression: "normal" },
          { speaker: "Livia", text: "Sayang!! Coba cek rekeningmu! Bonus akhir tahunku juga cair dua kali lipat!", expression: "happy" },
          { speaker: "Narator", text: "Livia melompat kegirangan dan memelukmu erat. Impian-impian kalian kini tak lagi terasa mustahil.", expression: "normal" },
          { speaker: "Livia", text: "Akhirnya kita bisa beli rumah impian kita! Ini semua berkat kerja keras kita berdua. Aku bangga banget sama kamu.", expression: "clingy" }
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
      const isHealth = data.itemsBrought.includes('berkah_kesehatan');
      
      if (isFertility) {
        return [
          { speaker: "Narator", text: "Bulan-bulan kehamilan penuh dengan drama. Jam 2 pagi, Livia membangunkanmu sambil menahan tangis.", expression: "normal" },
          { speaker: "Livia", text: "Sayang... dedek bayinya rewel... dia pengen nasi goreng tek-tek, tapi yang masaknya harus pakai topi merah...", expression: "crying" },
          { speaker: "Narator", text: "Meski terdengar absurd, kamu tetap menembus dinginnya malam demi menuruti ngidamnya.", expression: "normal" },
          { speaker: "Livia", text: "Maafin aku ya sering ngerepotin... Makasih udah jadi suami yang paling sabar sedunia.", expression: "clingy" }
        ];
      } else if (isHealth) {
        return [
          { speaker: "Narator", text: "Kalian memutuskan untuk merayakan kesehatan kalian dengan mendaki puncak Gunung Rinjani bersama.", expression: "normal" },
          { speaker: "Livia", text: "Hah... hah... Puncaknya sedikit lagi! Ayo sayang, jangan menyerah di sini!", expression: "happy" },
          { speaker: "Narator", text: "Angin gunung yang dingin menusuk kulit, tapi genggaman tangan Livia menyalurkan kehangatan yang tak terlukiskan.", expression: "normal" },
          { speaker: "Livia", text: "Pemandangannya indah banget kan? Tapi tetep aja, pemandangan paling indah buatku itu kamu yang lagi ngos-ngosan begitu.", expression: "blushing" }
        ];
      } else {
        return [
          { speaker: "Narator", text: "Kesuksesan finansial membawa kesibukan yang luar biasa. Kalian jarang punya waktu untuk duduk santai berdua.", expression: "normal" },
          { speaker: "Livia", text: "Jadwal meetingku padat banget hari ini... Kamu juga lembur lagi kan nanti malam?", expression: "normal" },
          { speaker: "Narator", text: "Malam harinya, kamu mendapati Livia tertidur di meja kerjanya karena terlalu kelelahan.", expression: "normal" },
          { speaker: "Livia", text: "(Mengigau pelan)... Jangan kerja terus sayang... aku kangen peluk kamu...", expression: "blushing" }
        ];
      }
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
      const isHealth = data.itemsBrought.includes('berkah_kesehatan');
      
      if (isFertility) {
        return [
          { speaker: "Narator", text: "Suara tangisan kencang memecah kesunyian ruang bersalin. Perjuangan panjang itu akhirnya usai.", expression: "normal" },
          { speaker: "Livia", text: "Lihat sayang... dia cantik sekali... Hidungnya mirip banget sama kamu...", expression: "crying" },
          { speaker: "Narator", text: "Kamu mengecup kening Livia dengan air mata yang menggenang. Keluarga kecil kalian kini telah utuh.", expression: "normal" },
          { speaker: "Livia", text: "Terima kasih sudah memilihku untuk menjadi ibu dari anak-anakmu. Aku mencintaimu, dulu, sekarang, dan selamanya.", expression: "happy" }
        ];
      } else if (isHealth) {
        return [
          { speaker: "Narator", text: "Puluhan tahun berlalu. Rambut kalian kini telah memutih, namun tubuh kalian masih cukup bugar untuk berjalan-jalan sore.", expression: "normal" },
          { speaker: "Livia", text: "Pelan-pelan jalannya, suamiku sayang. Ingat umur, kamu bukan anak muda lagi lho.", expression: "happy" },
          { speaker: "Narator", text: "Livia menggenggam tanganmu yang keriput dengan erat, tersenyum dengan sorot mata yang sama seperti saat pertama kali kalian bertemu.", expression: "normal" },
          { speaker: "Livia", text: "Ternyata menua bersamamu itu nggak buruk juga. Mari terus sehat dan saling menjaga sampai akhir waktu.", expression: "clingy" }
        ];
      } else {
        return [
          { speaker: "Narator", text: "Kalian kini berdiri di balkon penthouse mewah kalian, memandangi gemerlap lampu kota yang tak pernah tidur.", expression: "normal" },
          { speaker: "Livia", text: "Kita berhasil ya, sayang. Semua impian liar kita dari nol... semuanya terwujud.", expression: "happy" },
          { speaker: "Narator", text: "Livia menyandarkan kepalanya di bahumu, menikmati embusan angin malam dengan damai.", expression: "normal" },
          { speaker: "Livia", text: "Tapi asal kamu tau... dari semua kemewahan ini, harta karun yang paling berharga buatku tetaplah kamu.", expression: "clingy" }
        ];
      }
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

  const finishChapter = async (chapId: number) => {
    setActiveChapter(null);
    try {
      const res = await fetch('/api/story/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapId })
      });
      const data = await res.json();
      if (data.success && data.unlockedChapters) {
        setUnlockedChapters(data.unlockedChapters);
      }
    } catch (e) {
      console.error('Failed to complete chapter', e);
    }
  };

  const handleNextScene = () => {
    if (!activeChapter) return;
    
    const scenes = activeChapter.getDynamicContent ? activeChapter.getDynamicContent(userStats!) : activeChapter.content!;
    const currentScene = scenes[sceneIndex];

    if (currentScene.nextIndex !== undefined) {
      setSceneIndex(currentScene.nextIndex);
    } else if (sceneIndex < scenes.length - 1) {
      setSceneIndex(prev => prev + 1);
    } else {
      if (activeChapter.id === 8 && userStats && !userStats.itemsBrought.includes('chapter_8_completed')) {
        setShowHometownPicker(true);
      } else if (activeChapter.id === 12 && userStats && !userStats.itemsBrought.includes('chapter_12_completed')) {
        setShowBlessingPicker(true);
      } else {
        finishChapter(activeChapter.id);
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
      const itemsToBring = [...selectedHometownItems, 'chapter_8_completed'];
      await fetch('/api/hometown-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsBrought: itemsToBring })
      });
      setUserStats(prev => prev ? { ...prev, itemsBrought: [...prev.itemsBrought, ...itemsToBring] } : null);
      setShowHometownPicker(false);
      finishChapter(8);
    } catch (e) {
      console.error(e);
    }
    setIsSubmittingHometown(false);
  };

  const submitBlessing = async () => {
    if (!selectedBlessing) return;
    setIsSubmittingHometown(true);
    try {
      const itemsToBring = [selectedBlessing, 'chapter_12_completed'];
      await fetch('/api/hometown-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsBrought: itemsToBring })
      });
      setUserStats(prev => prev ? { ...prev, itemsBrought: [...prev.itemsBrought, ...itemsToBring] } : null);
      setShowBlessingPicker(false);
      finishChapter(12);
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

      {/* Blessing Picker Modal (Genshin Spiral Abyss Inspired) */}
      {showBlessingPicker && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl flex flex-col items-center">
            
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="h-px w-12 md:w-24 bg-gradient-to-l from-yellow-400 to-transparent" />
                <Sparkles className="w-8 h-8 text-yellow-400" />
                <div className="h-px w-12 md:w-24 bg-gradient-to-r from-yellow-400 to-transparent" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-widest drop-shadow-[0_2px_10px_rgba(250,204,21,0.5)]">BERKAH KUIL SUCI</h2>
              <p className="text-gray-200 mt-3 text-sm md:text-base font-medium">Pilihlah satu takdir untuk membimbing jalan kalian (Bab 13-15).</p>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0 mb-10">
              {[
                { id: 'berkah_kesuburan', name: 'Kesuburan', icon: '👶', desc: 'Membawa kehidupan baru ke dalam keluarga. Menganugerahi kalian dengan buah hati yang manis.' },
                { id: 'berkah_kesehatan', name: 'Kesehatan', icon: '🏃‍♀️', desc: 'Fisik bugar dan umur yang panjang. Memberikan stamina tak terbatas di setiap harinya.' },
                { id: 'berkah_kekayaan', name: 'Kekayaan', icon: '💰', desc: 'Kemudahan rezeki dan karir yang meroket. Membuka jalan menuju kebebasan finansial.' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedBlessing(item.id)}
                  className={`group relative h-[320px] rounded-lg transition-all duration-300 flex flex-col items-center p-1 overflow-hidden ${
                    selectedBlessing === item.id 
                      ? 'bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-[0_0_30px_rgba(250,204,21,0.5)] scale-105 z-10' 
                      : 'bg-white/10 hover:bg-white/20 hover:scale-[1.02]'
                  }`}
                >
                  {/* Inner Card */}
                  <div className={`w-full h-full flex flex-col items-center bg-[#fdfbf7] rounded flex-1 py-8 px-6 relative z-10 transition-colors ${
                    selectedBlessing === item.id ? 'bg-[#fffdf0]' : ''
                  }`}>
                    
                    {/* Icon Circle */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 mb-4 transition-all ${
                      selectedBlessing === item.id ? 'border-yellow-400 bg-yellow-100 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'border-gray-200 bg-white'
                    }`}>
                      <span className="text-4xl drop-shadow-sm">{item.icon}</span>
                    </div>

                    <h3 className={`font-display font-black text-xl mb-2 text-center uppercase tracking-wider ${
                      selectedBlessing === item.id ? 'text-yellow-700' : 'text-[#5c4d47]'
                    }`}>
                      {item.name}
                    </h3>

                    {/* Decorative Divider */}
                    <div className="flex items-center justify-center w-full my-3 opacity-60">
                      <div className="h-px w-1/3 bg-gradient-to-l from-yellow-400 to-transparent" />
                      <div className="w-1.5 h-1.5 rotate-45 bg-yellow-400 mx-2" />
                      <div className="h-px w-1/3 bg-gradient-to-r from-yellow-400 to-transparent" />
                    </div>

                    <p className={`text-sm text-center leading-relaxed mt-2 ${
                      selectedBlessing === item.id ? 'text-yellow-900 font-medium' : 'text-gray-500'
                    }`}>
                      {item.desc}
                    </p>

                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={submitBlessing}
              disabled={!selectedBlessing || isSubmittingHometown}
              className={`relative overflow-hidden group px-12 py-4 rounded-full font-black tracking-widest text-lg transition-all ${
                selectedBlessing 
                  ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] hover:-translate-y-1' 
                  : 'bg-gray-500/50 text-gray-300 cursor-not-allowed border border-gray-400/50'
              }`}
            >
              <div className="flex items-center gap-3 relative z-10">
                {isSubmittingHometown ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                TERIMA BERKAH
              </div>
              {selectedBlessing && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
