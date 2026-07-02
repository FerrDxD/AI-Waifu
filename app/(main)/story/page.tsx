'use client';

import { useState, useEffect } from 'react';
import DialogBox from '@/components/livia/DialogBox';
import LiviaSprite from '@/components/livia/LiviaSprite';
import LoadingScreen from '@/components/ui/LoadingScreen';
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
  bg?: string;
  hideSprite?: boolean;
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
      {"speaker":"Livia","text":"Hah... hah... akhirnya selesai juga mindahin semua kardus ini.","expression":"pain"},
      {"speaker":"Narator","text":"Kamu dan Livia meletakkan kardus terakhir di sudut ruangan. Keringat membasahi dahi kalian berdua.","expression":"normal"},
      {"speaker":"Livia","text":"K-kenapa kamarnya sempit banget sih?! Ini mah sekandang burung!","expression":"angry"},
      {"speaker":"Livia","text":"Ibu bilang ini apartemen yang layak, tapi kok begini... huft.","expression":"serious"},
      {"speaker":"Livia","text":"Yah, seenggaknya bersih sih. Nggak terlalu buruk.","expression":"normal"},
      {"speaker":"Livia","text":"D-dan... makasih ya udah bantu angkat-angkat. Walaupun aku nggak minta lho ya!","expression":"blushing","choices":[{"text":"Sama-sama. Itu gunanya tetangga.","nextIndex":6},{"text":"Capek nih, traktir minum dong.","nextIndex":7},{"text":"Kamu berat juga bawaannya.","nextIndex":8}]},
      {"speaker":"Livia","text":"Hmph, baguslah kalau kamu sadar posisimu!","expression":"pleased","nextIndex":9},
      {"speaker":"Livia","text":"Mata duitan! Tapi... yaudah nanti kubuatin teh.","expression":"angry","nextIndex":9},
      {"speaker":"Livia","text":"Jangan sebut-sebut berat di depan cewek!","expression":"pain","nextIndex":9},
      {"speaker":"Livia","text":"Terus ini kardus-kardusnya mau diapain? Ditumpuk gitu aja?","expression":"confused"},
      {"speaker":"Narator","text":"Tiba-tiba, Livia mematung. Matanya tertuju pada sudut dekat lemari.","expression":"normal"},
      {"speaker":"Livia","text":"Kyaaa!!! I-itu apa?! Ada yang gerak-gerak hitam di sana!","expression":"scared"},
      {"speaker":"Livia","text":"Tolongin! Singkirin benda itu sekarang juga! Aku nggak mau tidur sama monster!","expression":"clingy","choices":[{"text":"Itu cuma kecoak kecil.","nextIndex":13},{"text":"Sini biar aku yang basmi.","nextIndex":14},{"text":"Wah lucu, mau dikasih nama siapa?","nextIndex":15}]},
      {"speaker":"Livia","text":"Kecil?! Buatku itu sebesar naga!","expression":"angry","nextIndex":16},
      {"speaker":"Livia","text":"Cepat! Gunakan jurus mautmu!","expression":"happy","nextIndex":16},
      {"speaker":"Livia","text":"Bercanda terus! Cepat buang benda itu!","expression":"pain","nextIndex":16},
      {"speaker":"Narator","text":"Kamu dengan sigap mengambil koran bekas dan mengusir kecoak itu keluar.","expression":"normal"},
      {"speaker":"Livia","text":"Fuh... syukurlah monster itu udah pergi. Oke, mari kita lanjut.","expression":"normal"},
      {"speaker":"Livia","text":"Sekarang mari kita atur letak perabotan.","expression":"normal"},
      {"speaker":"Livia","text":"Menurutmu kasurnya lebih baik di pojok dekat jendela, atau di tengah ruangan?","expression":"confused","choices":[{"text":"Pojok dekat jendela.","nextIndex":20},{"text":"Di tengah ruangan.","nextIndex":21},{"text":"Di luar aja sekalian.","nextIndex":22}]},
      {"speaker":"Livia","text":"Ide bagus, biar bisa lihat awan siang ini.","expression":"pleased","nextIndex":23},
      {"speaker":"Livia","text":"Biar aku bisa guling-guling ya? Hehe.","expression":"silly","nextIndex":23},
      {"speaker":"Livia","text":"Kamu gila ya! Nanti aku digigit nyamuk!","expression":"angry","nextIndex":23},
      {"speaker":"Narator","text":"Kalian akhirnya mendorong kasur ke pojok ruangan.","expression":"normal"},
      {"speaker":"Livia","text":"Sekarang lemarinya. Kamu kuat dorong lemarinya sendirian kan?","expression":"confused","choices":[{"text":"Bisa dong, aku kuat.","nextIndex":25},{"text":"Butuh bantuanmu nih.","nextIndex":26},{"text":"Dibayar berapa nih?","nextIndex":27}]},
      {"speaker":"Livia","text":"Cih, sombong. Awas kalau besoknya encok.","expression":"serious","nextIndex":28},
      {"speaker":"Livia","text":"Tuh kan! Lemah! Yaudah ayo dorong bareng.","expression":"silly","nextIndex":28},
      {"speaker":"Livia","text":"Uangnya kupotong dari jatah traktiranmu!","expression":"angry","nextIndex":28},
      {"speaker":"Narator","text":"Saat menggeser lemari berat itu bersama-sama...","expression":"normal"},
      {"speaker":"Narator","text":"Tiba-tiba Livia tersandung sudut karpet dan hampir jatuh.","expression":"normal"},
      {"speaker":"Narator","text":"Livia kehilangan keseimbangan dan tubuhnya limbung ke belakang.","expression":"normal","choices":[{"text":"Tangkap tubuh Livia","nextIndex":31},{"text":"Biarin jatuh ke lantai","nextIndex":32},{"text":"Tarik bajunya","nextIndex":33}]},
      {"speaker":"Livia","text":"E-eh?! L-lepaskan! Aku bisa berdiri sendiri!","expression":"blushing","nextIndex":34},
      {"speaker":"Livia","text":"Aduh! Kenapa nggak ditangkap sih?! Jahat banget!","expression":"pain","nextIndex":34},
      {"speaker":"Livia","text":"Kyaa! K-kerah bajuku bisa robek bodoh!","expression":"scared","nextIndex":34},
      {"speaker":"Narator","text":"Setelah insiden memindahkan lemari selesai, kamu beralih ke meja kecil.","expression":"normal"},
      {"speaker":"Narator","text":"Namun saat menggesernya, sebuah laci sedikit terbuka dan kotak kayu jatuh berhamburan.","expression":"normal"},
      {"speaker":"Livia","text":"Eh! K-kotak rahasiaku!","expression":"scared"},
      {"speaker":"Narator","text":"Beberapa foto masa kecil dan boneka beruang lusuh berserakan di lantai.","expression":"normal"},
      {"speaker":"Livia","text":"J-jangan dilihat! Tutup matamu sekarang juga!","expression":"blushing","choices":[{"text":"(Tutup mata rapat-rapat)","nextIndex":39},{"text":"Udah terlanjur lihat nih.","nextIndex":40},{"text":"Fotonya lucu kok.","nextIndex":41}]},
      {"speaker":"Livia","text":"B-bagus. Jangan ngintip selagi aku mungutin!","expression":"clingy","nextIndex":42},
      {"speaker":"Livia","text":"Huaaa! Memalukan sekali! Lupakan!","expression":"pain","nextIndex":42},
      {"speaker":"Livia","text":"B-beneran? T-tapi tetep aja aku malu!","expression":"flirty","nextIndex":42},
      {"speaker":"Livia","text":"Ukh... itu foto memalukan waktu gigiku copot.","expression":"pain"},
      {"speaker":"Livia","text":"Tapi... boneka ini pemberian mendiang nenek. Jadi selalu aku bawa.","expression":"happy"},
      {"speaker":"Livia","text":"Meski udah buluk, wanginya masih bikin aku tenang.","expression":"normal","choices":[{"text":"Mau kupeluk biar makin wangi?","nextIndex":45},{"text":"Simpan baik-baik ya.","nextIndex":46},{"text":"Kamu ternyata punya sisi manis.","nextIndex":47}]},
      {"speaker":"Livia","text":"Jangan sentuh bonekaku dengan tangan kotormu!","expression":"angry","nextIndex":48},
      {"speaker":"Livia","text":"Tentu saja! Ini harta karunku.","expression":"serious","nextIndex":48},
      {"speaker":"Livia","text":"D-diam! Semua cewek juga punya boneka!","expression":"blushing","nextIndex":48},
      {"speaker":"Livia","text":"Baiklah, kardus udah rapi, monster udah musnah, dan rahasia memalukanku udah terbongkar...","expression":"serious"},
      {"speaker":"Livia","text":"Sepertinya tugasku udah selesai buat hari ini.","expression":"pleased"},
      {"speaker":"Livia","text":"Dan... tugas asistenku juga udah selesai.","expression":"happy","choices":[{"text":"Kalau gitu aku pamit dulu.","nextIndex":51},{"text":"Nggak mau ngasih imbalan nih?","nextIndex":52},{"text":"Kalau butuh bantuan panggil aja.","nextIndex":53}]},
      {"speaker":"Livia","text":"Y-yaudah, sana pergi istirahat!","expression":"angry","nextIndex":54},
      {"speaker":"Livia","text":"Tadi kan udah dibilang nanti kubuatin teh!","expression":"pain","nextIndex":54},
      {"speaker":"Livia","text":"J-jangan geer, aku nggak akan sering-sering butuh bantuanmu!","expression":"flirty","nextIndex":54},
      {"speaker":"Narator","text":"Kamu bersiap melangkah keluar dari kamarnya menuju koridor.","expression":"normal"},
      {"speaker":"Livia","text":"Eh tunggu sebentar!","expression":"scared"},
      {"speaker":"Livia","text":"K-karena kamu udah banyak bantu... siang ini... mau pesan makan bareng nggak?","expression":"blushing","choices":[{"text":"Boleh banget, aku laper.","nextIndex":57},{"text":"Pesenin aku makanan mewah.","nextIndex":58},{"text":"Tergantung siapa yang bayar.","nextIndex":59}]},
      {"speaker":"Livia","text":"Oke, nanti kita cari yang murah aja ya.","expression":"happy","nextIndex":60},
      {"speaker":"Livia","text":"Ngarep! Kita pesen bento diskonan di konbini aja cukup!","expression":"silly","nextIndex":60},
      {"speaker":"Livia","text":"K-karena aku yang nawarin... ya aku yang bayar deh!","expression":"pain","nextIndex":60},
      {"speaker":"Narator","text":"Kamu mengangguk setuju dan tersenyum dari ambang pintu.","expression":"normal"},
      {"speaker":"Livia","text":"Y-yaudah, sana balik ke kamarmu dulu! Nanti aku ketuk kalau makanannya udah datang!","expression":"angry","choices":[{"text":"Sampai jumpa nanti siang.","nextIndex":62},{"text":"Jangan pesenin yang pedas ya.","nextIndex":63},{"text":"(Tersenyum dan melambai)","nextIndex":64}]},
      {"speaker":"Livia","text":"Iya bawel, sana-sana masuk kamarmu.","expression":"normal","nextIndex":65},
      {"speaker":"Livia","text":"Seleramu cupu amat! Yaudah deh kutulis nggak pedas.","expression":"silly","nextIndex":65},
      {"speaker":"Livia","text":"A-apa senyum-senyum?! Cepat sana pergi!","expression":"blushing","nextIndex":65},
      {"speaker":"Narator","text":"Kamu keluar dan pintu ditutup. Tampaknya hari pertamanya di apartemen ini berjalan cukup menarik.","expression":"normal"}
    ]
  },
  {
    id: 1,
    title: "Kenalan",
    reqAffection: 20,
    reqLevel: 1,
    content: [
      {"speaker":"Livia","text":"Hei. Boleh ganggu sebentar nggak?","expression":"normal","bg":"1","hideSprite":true},
      {"speaker":"Narator","text":"Terdengar ketukan pelan di pintu kamarmu.","expression":"normal","bg":"1"},
      {"speaker":"Narator","text":"Itu Livia. Dan sejak pertemuan pertama mu, dia selalu menggendor pintu mu jika kesulitan. Meski begitu, kamu tetap membukakan pintu","expression":"normal","bg":"1","choices":[{"text":"Ada apa siang-siang begini?","nextIndex":3},{"text":"Kangen ya sama aku?","nextIndex":4},{"text":"Aku lagi sibuk nih.","nextIndex":5}]},
      {"speaker":"Livia","text":"I-ini soal tugas kuliah, ngerti?","expression":"serious","bg":"1.2","nextIndex":6},
      {"speaker":"Livia","text":"Hah?! Pede gila! Jangan mimpi deh!","expression":"blushing","bg":"1.2","nextIndex":6},
      {"speaker":"Livia","text":"Cuma sebentar kok! Sebentaaar aja!","expression":"clingy","bg":"1.2"},
      {"speaker":"Livia","text":"Aku... aku nggak ngerti cara nyambungin Wi-Fi di laptopku.","expression":"pain","bg":"1.2"},
      {"speaker":"Livia","text":"Tadi sore bisa, tapi tiba-tiba putus dan nggak mau konek lagi.","expression":"confused","bg":"1.2"},
      {"speaker":"Livia","text":"Kamu kan kelihatan kayak cowok nerd yang pinter komputer. Bisa benerin nggak?","expression":"flirty","bg":"1.2","choices":[{"text":"Enak aja manggil nerd!","nextIndex":9},{"text":"Tentu, sini kulihat laptopnya.","nextIndex":10},{"text":"Mungkin tagihannya belum dibayar?","nextIndex":11}]},
      {"speaker":"Livia","text":"Halah, ngaku aja. Kacamata tebalmu itu buktinya!","expression":"silly","bg":"1.2","nextIndex":12},
      {"speaker":"Livia","text":"Wah... makasih. Ini, tolong ya.","expression":"happy","bg":"1.2","nextIndex":12},
      {"speaker":"Livia","text":"Udah bayar kok! Bapak kos yang bilang!","expression":"angry","bg":"1.2"},
      {"speaker":"Narator","text":"Kamu mengambil laptopnya dan menekan beberapa tombol.","expression":"normal","bg":"1.2"},
      {"speaker":"Livia","text":"Gimana? Rusak parah ya? Harus dibawa ke tukang servis kah?","expression":"scared","bg":"1.2"},
      {"speaker":"Narator","text":"Ternyata Livia tidak sengaja menekan tombol Airplane Mode di keyboardnya.","expression":"normal","bg":"1.2","choices":[{"text":"Ini cuma Airplane Mode, Livia.","nextIndex":15},{"text":"Wah, ini virus mematikan.","nextIndex":16},{"text":"(Tekan tombol dan kembalikan)","nextIndex":17}]},
      {"speaker":"Livia","text":"E-eh? Airplane apa? Pesawat?!","expression":"confused","bg":"1.2","nextIndex":18},
      {"speaker":"Livia","text":"Kyaaa! Jangan bilang dataku ilang semua?!","expression":"pain","bg":"1.2","nextIndex":18},
      {"speaker":"Livia","text":"Lho, kok udah nyala lagi? Ajaib!","expression":"pleased","bg":"1.2"},
      {"speaker":"Narator","text":"Kamu menjelaskan soal fitur mode pesawat yang mematikan koneksi internet.","expression":"normal","bg":"1.2"},
      {"speaker":"Livia","text":"Ukh... j-jadi dari tadi aku cuma perlu mencet satu tombol itu?!","expression":"blushing","bg":"1.2"},
      {"speaker":"Livia","text":"Memalukan banget... Pasti kamu sekarang mikir aku gaptek kan?!","expression":"pain","bg":"1.2","choices":[{"text":"Memang iya kan?","nextIndex":21},{"text":"Gapapa, wajar kok buat pemula.","nextIndex":22},{"text":"Kamu lebih lucu kalau lagi bingung.","nextIndex":23}]},
      {"speaker":"Livia","text":"Jahat banget! Aku cuma kelepasan mencet tau!","expression":"angry","bg":"1.2","nextIndex":24},
      {"speaker":"Livia","text":"Siapa yang pemula! Aku cuma... khilaf!","expression":"clingy","bg":"1.2","nextIndex":24},
      {"speaker":"Livia","text":"G-gombalan macam apa itu! Nggak mempan!","expression":"flirty","bg":"1.2"},
      {"speaker":"Livia","text":"Yaudah deh, lupakan soal itu! Yang penting sekarang aku bisa lanjut nonton drakor.","expression":"happy","bg":"1.2"},
      {"speaker":"Livia","text":"Sebagai tanda terima kasih... ini.","expression":"normal","bg":"1.2"},
      {"speaker":"Narator","text":"Livia menyodorkan sebotol minuman kaleng dingin.","expression":"normal","bg":"1.2","choices":[{"text":"Wah, makasih.","nextIndex":27},{"text":"Tumben baik?","nextIndex":28},{"text":"Nggak ada racunnya kan?","nextIndex":29}]},
      {"speaker":"Livia","text":"Diminum ya, itu belinya di mesin depan.","expression":"pleased","bg":"1.2","nextIndex":30},
      {"speaker":"Livia","text":"Dikasih malah protes! Sini balikin kalau nggak mau!","expression":"angry","bg":"1.2","nextIndex":30},
      {"speaker":"Livia","text":"Pikiranmu nethink terus! Udah bagus dikasih!","expression":"serious","bg":"1.2"},
      {"speaker":"Livia","text":"Oh ya, tadi waktu di koridor aku ketemu bapak kos.","expression":"normal","bg":"1.2"},
      {"speaker":"Livia","text":"Katanya besok pagi ada jadwal kumpul warga apato buat bersih-bersih lingkungan.","expression":"serious","bg":"1.2"},
      {"speaker":"Livia","text":"Kamu mau ikut turun nggak besok jam 7 pagi?","expression":"confused","bg":"1.2","choices":[{"text":"Tentu, sekalian olahraga.","nextIndex":33},{"text":"Jam 7?! Kepagian banget!","nextIndex":34},{"text":"Bareng kamu ya turunnya?","nextIndex":35}]},
      {"speaker":"Livia","text":"Baguslah, biar ada temennya. Aku segan sendirian.","expression":"happy","bg":"1.2","nextIndex":36},
      {"speaker":"Livia","text":"Pemalas! Pantesan kamarmu berantakan!","expression":"pain","bg":"1.2","nextIndex":36},
      {"speaker":"Livia","text":"B-boleh. Nanti kuketok pintumu.","expression":"blushing","bg":"1.2"},
      {"speaker":"Livia","text":"Katanya nanti dapet sarapan onigiri gratis dari istri bapak kos lho.","expression":"silly","bg":"1.2"},
      {"speaker":"Livia","text":"Lumayan kan buat ngehemat uang jajan sehari.","expression":"pleased","bg":"1.2"},
      {"speaker":"Livia","text":"Aku denger onigiri buatan beliau itu yang terenak di sekitar sini.","expression":"happy","bg":"1.2","choices":[{"text":"Wah, jadi semangat nih.","nextIndex":39},{"text":"Kamu yang masak aja besok.","nextIndex":40},{"text":"Aku cuma incer onigirinya.","nextIndex":41}]},
      {"speaker":"Livia","text":"Hahaha, pikiranmu makanan terus ya.","expression":"silly","bg":"1.2","nextIndex":42},
      {"speaker":"Livia","text":"Enak aja! Aku mau libur masak besok!","expression":"angry","bg":"1.2","nextIndex":42},
      {"speaker":"Livia","text":"Sama! Kita sehati dalam hal makanan gratis.","expression":"flirty","bg":"1.2",},
      {"speaker":"Narator","text":"Angin siang berhembus masuk dari celah jendela, membuat Livia menggigil kecil.","expression":"normal","bg":"1.2"},
      {"speaker":"Livia","text":"Brrr... di sini lumayan berangin ya kalau siang.","expression":"pain","bg":"1.2",},
      {"speaker":"Livia","text":"Kenapa kamu nggak tutup pintumu? Mau masuk angin?","expression":"confused","bg":"1.2","choices":[{"text":"Sengaja biar udaranya muter.","nextIndex":45},{"text":"Kan lagi ngobrol sama kamu.","nextIndex":46},{"text":"Nungguin malaikat lewat.","nextIndex":47}]},
      {"speaker":"Livia","text":"Logika yang aneh. Nanti flu baru tau rasa.","expression":"serious","bg":"1.2","nextIndex":48},
      {"speaker":"Livia","text":"O-oh... bener juga sih...","expression":"blushing","bg":"1.2","nextIndex":48},
      {"speaker":"Livia","text":"Malaikat pencabut nyawa iya! Cepat tutup!","expression":"scared","bg":"1.2"},
      {"speaker":"Livia","text":"Oke deh, urusanku udah selesai. Makasih udah benerin laptopku.","expression":"normal","bg":"1.2"},
      {"speaker":"Livia","text":"Besok jangan sampai ketiduran lho, awas aja kalau aku yang kena marah bapak kos gara-gara kamu!","expression":"angry","bg":"1.2"},
      {"speaker":"Livia","text":"Sampai jumpa besok pagi, tetangga.","expression":"happy","bg":"1.2","choices":[{"text":"Siang, Livia.","nextIndex":51},{"text":"Jangan mimpiin aku ya.","nextIndex":52},{"text":"Bangunin aku kalau telat.","nextIndex":53}]},
      {"speaker":"Livia","text":"Siang juga.","expression":"pleased","bg":"1.2","nextIndex":54},
      {"speaker":"Livia","text":"Hih! Nggak akan pernah!","expression":"clingy","bg":"1.2","nextIndex":54},
      {"speaker":"Livia","text":"Iya, nanti kugedor pintumu sampai jebol!","expression":"silly","bg":"1.2"},
      {"speaker":"Narator","text":"Livia kembali ke kamarnya dan menutup pintu. Botol minuman dingin di tanganmu terasa menyegarkan.","expression":"normal","bg":"1.2"},
      {"speaker":"Narator","text":"Mungkin, masa perkuliahan ini tidak akan seburuk yang kamu bayangkan.","expression":"normal","bg":"1.2"},
    ]
  },
  {
    id: 2,
    title: "Kecoa Malam",
    reqAffection: 40,
    reqLevel: 2,
    content: [
      {"speaker":"Narator","text":"Cuaca malam ini sedang hujan deras. Terdengar suara gedoran panik di pintu kamarmu.","expression":"normal","bg":"2.1","hideSprite":true},
      {"speaker":"Livia","text":"Buka pintunya! Tolong buka pintunya sekarang juga!","expression":"scared","bg":"2.1","hideSprite":true},
      {"speaker":"Narator","text":"Kamu terbangun dari tidur setengah sadarmu.","expression":"normal","choices":[{"text":"Buka pintu segera.","nextIndex":3},{"text":"Tanya dari dalam.","nextIndex":4},{"text":"Tarik selimut lagi.","nextIndex":5}],"bg":"2.1"},
      {"speaker":"Livia","text":"Akhirnya! Lama banget sih bukanya!","expression":"angry","bg":"2.1","hideSprite":true,"nextIndex":6},
      {"speaker":"Livia","text":"Jangan banyak tanya! Buka dulu!","expression":"pain","bg":"2.1","hideSprite":true,"nextIndex":6},
      {"speaker":"Livia","text":"Hei! Aku denger suara selimut ditarik ya!","expression":"scared","bg":"2.1","hideSprite":true},
      {"speaker":"Narator","text":"Kamu buru-buru membukakan pintu.","expression":"normal","bg":"2.1","hideSprite":true},
      {"speaker":"Narator","text":"Livia langsung menerobos masuk.","expression":"normal","bg":"2.2"},
      {"speaker":"Livia","text":"Hah... hah... syukurlah kamu belum tidur.","expression":"pain","bg":"2.2"},
      {"speaker":"Livia","text":"Di kamarku ada... ada... monster pembawa malapetaka!","expression":"scared","choices":[{"text":"Pencuri?!","nextIndex":10},{"text":"Hantu?!","nextIndex":11},{"text":"Kecoak lagi?","nextIndex":12}],"bg":"2.2"},
      {"speaker":"Livia","text":"Bukan! Ini jauh lebih seram dari pencuri!","expression":"angry","bg":"2.2","nextIndex":13},
      {"speaker":"Livia","text":"Bukan hantu! Ini monster nyata!","expression":"pain","bg":"2.2","nextIndex":13},
      {"speaker":"Livia","text":"Bukan 'lagi'! Ini jenis yang berbeda!","expression":"serious","bg":"2.2"},
      {"speaker":"Livia","text":"Seekor kecoak raksasa seukuran telapak tanganku menempel di dinding!","expression":"serious","bg":"2.2"},
      {"speaker":"Livia","text":"Dan yang lebih parah lagi... monster itu punya sayap! Dia terbang ke arahku!","expression":"scared","bg":"2.2"},
      {"speaker":"Livia","text":"Aku nyaris serangan jantung tadi! Kamu harus tanggung jawab!","expression":"clingy","choices":[{"text":"Kenapa aku yang tanggung jawab?","nextIndex":16},{"text":"Tenang, biar aku yang urus.","nextIndex":17},{"text":"Biarin aja, nanti juga pergi.","nextIndex":18}],"bg":"2.2"},
      {"speaker":"Livia","text":"K-karena kamu tetanggaku! Lindungi aku dong!","expression":"blushing","bg":"2.2","nextIndex":19},
      {"speaker":"Livia","text":"Syukurlah... aku mengandalkanmu.","expression":"pleased","bg":"2.2","nextIndex":19},
      {"speaker":"Livia","text":"Jahat banget! Aku nggak berani tidur tau!","expression":"angry","bg":"2.2"},
      {"speaker":"Narator","text":"Kamu menghela napas, sepertinya malam tidurmu akan tertunda sebentar.","expression":"normal","bg":"2.2"},
      {"speaker":"Livia","text":"P-pokoknya, kamu harus usir benda itu dari kamarku sekarang juga.","expression":"normal","bg":"2.2"},
      {"speaker":"Livia","text":"Eh tunggu, kamarmu juga bersih dari makhluk sejenis itu kan?","expression":"confused","choices":[{"text":"Bersih kok, aman.","nextIndex":22},{"text":"Tadi ada satu lewat.","nextIndex":23},{"text":"Mau kuperiksa lemariku?","nextIndex":24}],"bg":"2.2"},
      {"speaker":"Livia","text":"Fuh... baguslah kalau gitu.","expression":"happy","bg":"2.2","nextIndex":25},
      {"speaker":"Livia","text":"Kyaaa! Jangan bohong! Bahaya!","expression":"scared","bg":"2.2","nextIndex":25},
      {"speaker":"Livia","text":"N-nggak usah! Nanti malah ada beneran!","expression":"pain","bg":"2.2"},
      {"speaker":"Narator","text":"Kalian berdua berjalan mengendap-endap menuju kamar Livia.","expression":"normal","bg":"2.3"},
      {"speaker":"Narator","text":"Kamu membuka pintunya perlahan, sementara Livia bersembunyi di punggungmu.","expression":"normal","bg":"2.3"},
      {"speaker":"Livia","text":"Hati-hati... terakhir kulihat dia ada di atas lemari bajuku.","expression":"scared","choices":[{"text":"Pegang bajuku.","nextIndex":28},{"text":"Jalan di depanku.","nextIndex":29},{"text":"Sstt, jangan berisik.","nextIndex":30}],"bg":"2.3"},
      {"speaker":"Livia","text":"I-iya... udah kupegang erat-erat.","expression":"clingy","bg":"2.3","nextIndex":31},
      {"speaker":"Livia","text":"Nggak mau! Kamu duluan!","expression":"angry","bg":"2.3","nextIndex":31},
      {"speaker":"Livia","text":"(Mengangguk sambil menahan napas)","expression":"serious","bg":"2.3"},
      {"speaker":"Narator","text":"Kamu masuk dan menyalakan lampu. Ruangan tampak sepi.","expression":"normal","bg":"2.4"},
      {"speaker":"Livia","text":"Lho? Kok nggak ada? Ke mana perginya monster sialan itu?","expression":"confused","bg":"2.4"},
      {"speaker":"Narator","text":"Kamu mulai mencari di sudut-sudut kamar.","expression":"normal","choices":[{"text":"Cari di kolong kasur.","nextIndex":34},{"text":"Cari di balik gorden.","nextIndex":35},{"text":"Mungkin udah kabur.","nextIndex":36}],"bg":"2.4"},
      {"speaker":"Livia","text":"Jangan disenterin ke sana! Nanti kaget!","expression":"scared","bg":"2.4","nextIndex":37},
      {"speaker":"Livia","text":"Hati-hati... bisa jadi dia menyergap.","expression":"serious","bg":"2.4","nextIndex":37},
      {"speaker":"Livia","text":"Semoga saja begitu...","expression":"pleased","bg":"2.4"},
      {"speaker":"Narator","text":"Tiba-tiba, terdengar suara kepakan sayap dari arah tirai.","expression":"normal","bg":"2.4"},
      {"speaker":"Livia","text":"Itu dia! D-dari suaranya, dia bersiap lepas landas lagi!","expression":"scared","bg":"2.4"},
      {"speaker":"Narator","text":"Kecoak itu akhirnya keluar dan terbang serampangan ke arah kalian.","expression":"normal","choices":[{"text":"Tangkis dengan bantal!","nextIndex":40},{"text":"Lindungi Livia!","nextIndex":41},{"text":"Lari keluar kamar!","nextIndex":42}],"bg":"2.4"},
      {"speaker":"Livia","text":"Itu bantalku bodoh! Jangan dikotorin!","expression":"angry","bg":"2.4","nextIndex":43},
      {"speaker":"Livia","text":"K-kamu... jantan juga ternyata.","expression":"blushing","bg":"2.4","nextIndex":43},
      {"speaker":"Livia","text":"Woi! Jangan tinggalin aku sendirian!","expression":"pain","bg":"2.4"},
      {"speaker":"Narator","text":"Kamu dengan sigap mengambil majalah bekas dan... BUK!","expression":"normal","bg":"2.4"},
      {"speaker":"Narator","text":"Kecoak itu jatuh terlentang di lantai, menggelepar tak berdaya.","expression":"normal","bg":"2.4"},
      {"speaker":"Livia","text":"K-kamu berhasil! Pukulan yang luar biasa!","expression":"happy","choices":[{"text":"Sudah tugasku sebagai pahlawan.","nextIndex":46},{"text":"Cepat ambil sapu.","nextIndex":47},{"text":"Gimana? Keren kan?","nextIndex":48}],"bg":"2.4"},
      {"speaker":"Livia","text":"Pahlawan kesiangan maksudnya! Hehe.","expression":"silly","bg":"2.4","nextIndex":49},
      {"speaker":"Livia","text":"Iya iya, sebentar kuambilkan.","expression":"pleased","bg":"2.4","nextIndex":49},
      {"speaker":"Livia","text":"Biasa aja tuh. Jangan besar kepala.","expression":"flirty","bg":"2.4"},
      {"speaker":"Narator","text":"Kamu menyingkirkan kecoak itu dengan tisu, lalu membuangnya ke tempat sampah luar.","expression":"normal","bg":"2.4"},
      {"speaker":"Livia","text":"Fiuh... akhirnya aku bisa napas lega. Detak jantungku masih kencang nih.","expression":"normal","bg":"2.4"},
      {"speaker":"Livia","text":"Makasih ya udah nolongin walau hujannya lagi deras begini.","expression":"blushing","choices":[{"text":"Sama-sama. Sekarang tidur sana.","nextIndex":52},{"text":"Minum air hangat dulu gih.","nextIndex":53},{"text":"Awas ada pasangannya.","nextIndex":54}],"bg":"2.4"},
      {"speaker":"Livia","text":"Iya, bawel. Kamu juga tidur.","expression":"happy","bg":"2.4","nextIndex":55},
      {"speaker":"Livia","text":"M-makasih perhatiannya.","expression":"pleased","bg":"2.4","nextIndex":55},
      {"speaker":"Livia","text":"J-jangan ngomong sembarangan! Mulutmu jahat!","expression":"angry","bg":"2.4"},
      {"speaker":"Narator","text":"Saat kamu sudah melangkah keluar, dia memanggilmu dari ambang pintu.","expression":"normal","bg":"2.4"},
      {"speaker":"Livia","text":"Kalo besok malam ada kecoak terbang lagi... boleh aku panggil kamu lagi kan?","expression":"flirty","choices":[{"text":"Tentu, pintuku terbuka.","nextIndex":57},{"text":"Boleh, asal ada bayarannya.","nextIndex":58},{"text":"Mending kamu beli obat nyamuk.","nextIndex":59}],"bg":"2.4"},
      {"speaker":"Livia","text":"I-ini cuma pencegahan darurat lho! Dah!","expression":"blushing","bg":"2.4","nextIndex":60},
      {"speaker":"Livia","text":"Mata duitan! Nggak jadi!","expression":"angry","bg":"2.4","nextIndex":60},
      {"speaker":"Livia","text":"Kamu ini nggak romantis banget sih!","expression":"pain","bg":"2.4"},
      {"speaker":"Narator","text":"Pintu kamarnya perlahan tertutup, menyisakan suara hujan di luar.","expression":"normal","bg":"2.4","hideSprite":true}
    ]
  },
  {
    id: 3,
    title: "Rumah Kedua",
    reqAffection: 60,
    reqLevel: 3,
    content: [
      {"speaker":"Narator","text":"Akhir pekan yang tenang. Kamu sedang menyeduh kopi saat terdengar bel pintumu berbunyi.","expression":"normal","bg":"3.1","hideSprite":true},
      {"speaker":"Narator","text":"Kamu berjalan ke arah pintu dan membukanya. Livia berdiri di sana membawa sebuah toples besar.","expression":"normal","bg":"3.1"},
      {"speaker":"Livia","text":"Nih. Ibu ngirim terlalu banyak kue kering dari kampung.","expression":"normal","choices":[{"text":"Wah, repot-repot amat.","nextIndex":3},{"text":"Buatku semua?","nextIndex":4},{"text":"Tumben bawain makanan.","nextIndex":5}],"bg":"3.2"},
      {"speaker":"Livia","text":"Nggak repot kok. Ibuku yang ngirim.","expression":"pleased","bg":"3.2","nextIndex":6},
      {"speaker":"Livia","text":"Enak aja! Sebagian buatku juga tau!","expression":"angry","bg":"3.2","nextIndex":6},
      {"speaker":"Livia","text":"I-ini cuma bagi-bagi rezeki!","expression":"blushing","bg":"3.2"},
      {"speaker":"Livia","text":"Karena kamarku nggak muat, kamu ambil sebagian. Bukannya aku sengaja nyisihin buatmu, ya!","expression":"angry","bg":"3.2"},
      {"speaker":"Livia","text":"Ini kue resep rahasia keluarga lho. Harusnya kamu bersyukur bisa mencicipinya.","expression":"serious","bg":"3.2"},
      {"speaker":"Livia","text":"Ayo cepat terima, tanganku udah pegal nih megangin toples seberat ini.","expression":"clingy","choices":[{"text":"Oke, makasih.","nextIndex":9},{"text":"Sini kubantu pegang.","nextIndex":10},{"text":"Kuenya kelihatannya enak.","nextIndex":11}],"bg":"3.2"},
      {"speaker":"Livia","text":"Sama-sama. Awas kalau nggak dihabisin.","expression":"happy","bg":"3.2","nextIndex":12},
      {"speaker":"Livia","text":"A-aku masih kuat pegang kok!","expression":"blushing","bg":"3.2","nextIndex":12},
      {"speaker":"Livia","text":"Jelas dong, buatan ibuku gitu lho!","expression":"pleased","bg":"3.2"},
      {"speaker":"Narator","text":"Kamu mempersilakannya masuk karena angin lorong cukup dingin.","expression":"normal","bg":"3.3"},
      {"speaker":"Livia","text":"Eh... unitmu ternyata rapi juga ya. Nggak berantakan kayak cowok di film-film.","expression":"confused","bg":"3.3"},
      {"speaker":"Livia","text":"Wangi kopinya juga enak. Standar kebersihanmu boleh juga.","expression":"pleased","choices":[{"text":"Tentu saja, aku rajin.","nextIndex":15},{"text":"Biasa aja ah.","nextIndex":16},{"text":"Makasih atas pujiannya.","nextIndex":17}],"bg":"3.3"},
      {"speaker":"Livia","text":"Cih, sombong amat. Tapi yaudah deh kuakui.","expression":"silly","bg":"3.3","nextIndex":18},
      {"speaker":"Livia","text":"Sok merendah! Menyebalkan!","expression":"angry","bg":"3.3","nextIndex":18},
      {"speaker":"Livia","text":"I-itu bukan pujian tau!","expression":"blushing","bg":"3.3"},
      {"speaker":"Narator","text":"Kamu meletakkan toples itu di atas meja dan menawarinya secangkir teh chamomile.","expression":"normal","bg":"3.3"},
      {"speaker":"Livia","text":"Makasih. Setidaknya kamu tau tata krama menjamu tamu.","expression":"normal","bg":"3.3"},
      {"speaker":"Livia","text":"Wah... teh chamomile. Wanginya bikin rileks banget.","expression":"happy","choices":[{"text":"Cocok buat santai.","nextIndex":21},{"text":"Kamu suka?","nextIndex":22},{"text":"Ini mahal lho.","nextIndex":23}],"bg":"3.3"},
      {"speaker":"Livia","text":"Iya, pas banget diminum pagi-pagi gini.","expression":"pleased","bg":"3.3","nextIndex":24},
      {"speaker":"Livia","text":"Suka banget! Seleramu lumayan juga.","expression":"happy","bg":"3.3","nextIndex":24},
      {"speaker":"Livia","text":"Perhitungan banget sih sama tamu!","expression":"angry","bg":"3.3"},
      {"speaker":"Narator","text":"Kamu membuka toples dan mulai mencicipi kue cokelat tersebut.","expression":"normal","bg":"3.3"},
      {"speaker":"Livia","text":"Gimana rasanya? Beri aku review jujur dan objektif dari skala satu sampai sepuluh.","expression":"serious","choices":[{"text":"Sepuluh sempurna.","nextIndex":26},{"text":"Tujuh aja deh.","nextIndex":27},{"text":"Belum bisa dinilai.","nextIndex":28}],"bg":"3.3"},
      {"speaker":"Livia","text":"Wah! Pilihan yang sangat tepat!","expression":"happy","bg":"3.3","nextIndex":29},
      {"speaker":"Livia","text":"Tujuh?! Lidahmu mati rasa ya?!","expression":"angry","bg":"3.3","nextIndex":29},
      {"speaker":"Livia","text":"Pelit review! Nggak asik!","expression":"pain","bg":"3.3"},
      {"speaker":"Livia","text":"Kamu tahu... belakangan ini aku merasa tinggal di apato ini nggak seburuk yang kukira.","expression":"normal","bg":"3.3"},
      {"speaker":"Livia","text":"Awalnya aku benci banget ninggalin rumah lamaku. Rasanya asing dan menakutkan.","expression":"serious","bg":"3.3"},
      {"speaker":"Livia","text":"Tiap malam rasanya sepi banget. Kadang aku sampai nangis mikirin kasurku yang lama.","expression":"pain","choices":[{"text":"Itu namanya homesick.","nextIndex":32},{"text":"Kamu udah berjuang keras.","nextIndex":33},{"text":"Anak mama banget sih.","nextIndex":34}],"bg":"3.3"},
      {"speaker":"Livia","text":"I-iya, aku tahu istilahnya! Nggak usah sok pinter!","expression":"angry","bg":"3.3","nextIndex":35},
      {"speaker":"Livia","text":"M-makasih... denger itu bikin aku agak lega.","expression":"blushing","bg":"3.3","nextIndex":35},
      {"speaker":"Livia","text":"Biarin! Siapa sih yang nggak kangen rumah?!","expression":"pain","bg":"3.3"},
      {"speaker":"Livia","text":"Tapi... setelah beberapa insiden memalukan yang melibatkan serangga dan tumpukan kardus...","expression":"blushing","bg":"3.3"},
      {"speaker":"Livia","text":"Anehnya, aku mulai merasa ada seseorang yang menjagaku di sini.","expression":"clingy","bg":"3.3"},
      {"speaker":"Livia","text":"Seseorang yang bisa kuandalkan kapan saja... walau kadang nyebelin.","expression":"happy","choices":[{"text":"Siapa tuh? Bapak kos?","nextIndex":38},{"text":"Aku juga merasa gitu.","nextIndex":39},{"text":"Cieee, mulai suka ya?","nextIndex":40}],"bg":"3.3"},
      {"speaker":"Livia","text":"B-bukan bodoh! Kenapa kamu nggak peka sih?!","expression":"angry","bg":"3.3","nextIndex":41},
      {"speaker":"Livia","text":"B-beneran? Tumben kamu jujur.","expression":"blushing","bg":"3.3","nextIndex":41},
      {"speaker":"Livia","text":"J-jangan ngaco! Ini cuma sebatas tetangga!","expression":"scared","bg":"3.3"},
      {"speaker":"Livia","text":"Rasanya tempat ini sedikit demi sedikit terasa seperti... rumah kedua.","expression":"pleased","bg":"3.3"},
      {"speaker":"Livia","text":"Kamu mau bertanggung jawab nggak karena udah bikin aku ketergantungan gini?","expression":"flirty","choices":[{"text":"Aku janji bakal menjagamu.","nextIndex":43},{"text":"Berani bayar berapa?","nextIndex":44},{"text":"Kita saling jaga aja.","nextIndex":45}],"bg":"3.3"},
      {"speaker":"Livia","text":"Kamu udah janji lho! Jangan ditarik lagi!","expression":"blushing","bg":"3.3","nextIndex":46},
      {"speaker":"Livia","text":"Dasar rentenir! Kupotong uang jajanmu nanti!","expression":"angry","bg":"3.3","nextIndex":46},
      {"speaker":"Livia","text":"Hmm... tawaran yang cukup adil. Setuju.","expression":"pleased","bg":"3.3"},
      {"speaker":"Narator","text":"Livia menghabiskan teh chamomile-nya dan berdiri merapikan roknya.","expression":"normal","bg":"3.3"},
      {"speaker":"Livia","text":"Oke, makasih buat tehnya. Aku harus balik ke kamar buat lanjutin tugas kuliah.","expression":"normal","bg":"3.1"},
      {"speaker":"Livia","text":"Kalau... kalau kamu butuh teman ngobrol, pintuku juga selalu terbuka kok.","expression":"blushing","choices":[{"text":"Oke, nanti aku ketuk.","nextIndex":49},{"text":"Tumben nawarin.","nextIndex":50},{"text":"Pasti kangen ya?","nextIndex":51}],"bg":"3.1"},
      {"speaker":"Livia","text":"J-jangan kemalaman ngetuknya!","expression":"scared","bg":"3.1","nextIndex":52},
      {"speaker":"Livia","text":"B-bukan berarti aku kesepian ya! Cuma nawarin!","expression":"angry","bg":"3.1","nextIndex":52},
      {"speaker":"Livia","text":"D-diam! Cepat bukain pintunya, aku mau keluar!","expression":"pain","bg":"3.1"},
      {"speaker":"Narator","text":"Kamu mengangguk pelan sambil membukakan pintu untuknya.","expression":"normal","bg":"3.2"},
      {"speaker":"Livia","text":"Sampai jumpa nanti sore, tetangga. Jangan kangen ya!","expression":"happy","choices":[{"text":"Sampai jumpa.","nextIndex":54},{"text":"Nggak bakal kangen kok.","nextIndex":55},{"text":"Mungkin aku bakal kangen.","nextIndex":56}],"bg":"3.2"},
      {"speaker":"Livia","text":"Dadah~","expression":"pleased","bg":"3.2","nextIndex":57},
      {"speaker":"Livia","text":"Awas kalau nanti kamu yang duluan nyariin aku!","expression":"flirty","bg":"3.2","nextIndex":57},
      {"speaker":"Livia","text":"U-uhh... t-tuh kan mulai ngegombal lagi!","expression":"blushing","bg":"3.2"},
      {"speaker":"Narator","text":"Pintu tertutup. Kamarmu kembali hening, namun entah kenapa terasa lebih hangat dari sebelumnya.","expression":"normal","bg":"3.1","hideSprite":true}
    ]
  },
  {
    id: 4,
    title: "Sahabat",
    reqAffection: 80,
    reqLevel: 4,
    content: [
      {"speaker":"Narator","text":"Malam semakin larut. Kamu sedang bergelut dengan tugas kuliah yang menumpuk di depan laptop.","expression":"normal","bg":"4.1","hideSprite":true},
      {"speaker":"Narator","text":"Keheningan kamarmu tiba-tiba dipecahkan oleh suara ketukan pelan dari arah pintu.","expression":"normal","bg":"2.1","hideSprite":true},
      {"speaker":"Narator","text":"Saat kamu membukanya, Livia berdiri di sana.","expression":"normal","bg":"2.2","choices":[{"text":"Ada apa malam-malam begini?","nextIndex":3},{"text":"Kamu mengigau ya?","nextIndex":4},{"text":"Wah, ada bidadari nyasar.","nextIndex":5}]},
      {"speaker":"Livia","text":"J-jangan pasang muka terganggu gitu dong!","expression":"angry","bg":"2.2","nextIndex":6},
      {"speaker":"Livia","text":"Hah?! Aku sadar 100 persen tau!","expression":"pain","bg":"2.2","nextIndex":6},
      {"speaker":"Livia","text":"B-bidadari apanya?! Gombalanmu norak banget!","expression":"blushing","bg":"2.2","nextIndex":6},
      {"speaker":"Narator","text":"Tanpa menunggu persetujuanmu, Livia menyelinap masuk ke dalam unitmu sambil membawa kantong plastik kecil.","expression":"normal","bg":"2.1"},
      {"speaker":"Livia","text":"Nih. Aku tadi habis ke minimarket depan dan kebetulan ada promo buy 1 get 1.","expression":"normal","bg":"4.2"},
      {"speaker":"Livia","text":"Satu buatku, satu buatmu. Jangan protes, minum aja.","expression":"happy","bg":"4.2","choices":[{"text":"Wah, lagi butuh banget nih. Makasih.","nextIndex":9},{"text":"Awas nih, biasanya ada udangnya.","nextIndex":10},{"text":"Kafein di malam hari nggak sehat lho.","nextIndex":11}]},
      {"speaker":"Livia","text":"Baguslah kalau kepakai. Biar kamu nggak ketiduran ngerjain tugas.","expression":"pleased","bg":"4.2","nextIndex":12},
      {"speaker":"Livia","text":"Udang apa?! Pikirannya negatif terus! Balikin kalau nggak mau!","expression":"angry","bg":"4.2","nextIndex":12},
      {"speaker":"Livia","text":"Ya ampun, dikasih gratis malah ceramah medis! Bodo amat!","expression":"pain","bg":"4.2","nextIndex":12},
      {"speaker":"Narator","text":"Kamu mengambil gelas es kopi itu. Livia kemudian duduk menyila di dekat mejamu dan membuka laptopnya.","expression":"normal","bg":"4.2"},
      {"speaker":"Livia","text":"Kenapa ngeliatin gitu? Wi-Fi di unitku lagi lambat banget tau!","expression":"angry","bg":"4.2"},
      {"speaker":"Livia","text":"Batas pengumpulan tugasku besok pagi, jadi malam ini aku numpang ngerjain di sini ya!","expression":"serious","bg":"4.2","choices":[{"text":"Boleh aja. Silakan.","nextIndex":15},{"text":"Bayar sewa tempat dong.","nextIndex":16},{"text":"(Lirik bantal yang dia bawa)","nextIndex":17}]},
      {"speaker":"Livia","text":"S-syukurlah... kukira kamu bakal ngusir.","expression":"pleased","bg":"4.2","nextIndex":18},
      {"speaker":"Livia","text":"Kan udah kubayar pakai es kopi tadi! Dasar perhitungan!","expression":"angry","bg":"4.2","nextIndex":18},
      {"speaker":"Livia","text":"I-ini... ini bantal penyangga punggung! Biar nggak pegal! Bukan buat tidur!","expression":"blushing","bg":"4.2","nextIndex":18},
      {"speaker":"Narator","text":"Waktu pun berlalu. Hanya terdengar suara ketikan keyboard dari kalian berdua.","expression":"normal","bg":"4.1","hideSprite":true},
      {"speaker":"Narator","text":"Terkadang, kamu mencuri pandang ke arahnya. Wajah serius Livia saat belajar terlihat cukup manis.","expression":"normal","bg":"4.1","hideSprite":true},
      {"speaker":"Narator","text":"Tiba-tiba, mata kalian saling bertatapan.","expression":"normal","bg":"4.1"},
      {"speaker":"Livia","text":"A-apa?! Kenapa lihat-lihat?!","expression":"blushing","bg":"4.2","choices":[{"text":"Nggak, cuma merhatiin laptopmu.","nextIndex":22},{"text":"Kamu cantik juga kalau lagi serius.","nextIndex":23},{"text":"Ada noda di pipimu.","nextIndex":24}]},
      {"speaker":"Livia","text":"Awas ya kalau ngintip tugasku! Aku nggak mau dicontek!","expression":"serious","bg":"4.2","nextIndex":25},
      {"speaker":"Livia","text":"G-gombalan murahan! Berhenti ngomong gitu, aku jadi nggak fokus!","expression":"angry","bg":"4.2","nextIndex":25},
      {"speaker":"Livia","text":"Eh?! Di mana?! (Mengusap-usap pipinya panik) Boong ya?! Jahat!","expression":"scared","bg":"4.2","nextIndex":25},
      {"speaker":"Livia","text":"Kamu nyadar nggak sih... belakangan ini kita sering banget bareng.","expression":"normal","bg":"4.2"},
      {"speaker":"Livia","text":"Maksudku... dulu aku segan banget mau keluar kamar, takut disapa tetangga aneh.","expression":"serious","bg":"4.2"},
      {"speaker":"Livia","text":"Tapi sekarang... entah kenapa aku merasa lebih tenang dan aman kalau ada di dekatmu.","expression":"happy","bg":"4.2","choices":[{"text":"Itu karena aku bisa diandalkan.","nextIndex":28},{"text":"Aku juga merasa gitu, Livia.","nextIndex":29},{"text":"Cieee, mulai ngaku nih.","nextIndex":30}]},
      {"speaker":"Livia","text":"Cih, kepedean. Walau... ya, sedikit benar sih.","expression":"pleased","bg":"4.2","nextIndex":31},
      {"speaker":"Livia","text":"S-syukurlah kalau perasaannya nggak cuma sepihak...","expression":"blushing","bg":"4.2","nextIndex":31},
      {"speaker":"Livia","text":"A-aku cuma bilang kenyataan obyektif kok! Nggak bermaksud aneh-aneh!","expression":"angry","bg":"4.2","nextIndex":31},
      {"speaker":"Narator","text":"Livia salah tingkah dan tak sengaja menyenggol gelas kopinya sendiri.","expression":"normal","bg":"4.2"},
      {"speaker":"Livia","text":"Kyaa! Tumpah!","expression":"scared","bg":"4.2"},
      {"speaker":"Livia","text":"Aduh, maaf! Maaf banget! Kertas kerjamu kena nggak?!","expression":"pain","bg":"4.2","choices":[{"text":"Nggak apa-apa, aman kok.","nextIndex":34},{"text":"Sini aku bantu lap.","nextIndex":35},{"text":"Ceroboh banget sih.","nextIndex":36}]},
      {"speaker":"Livia","text":"Fuh... untunglah. Aku ceroboh banget sih...","expression":"pain","bg":"4.2","nextIndex":37},
      {"speaker":"Livia","text":"M-makasih... maaf jadi ngerepotin.","expression":"pleased","bg":"4.2","nextIndex":37},
      {"speaker":"Livia","text":"Iya aku tau! Nggak usah diperjelas! Ukh...","expression":"angry","bg":"4.2","nextIndex":37},
      {"speaker":"Narator","text":"Setelah insiden kecil itu dibereskan, kamar kembali hening.","expression":"normal","bg":"4.1"},
      {"speaker":"Narator","text":"Satu jam kemudian, kamu menyadari suara ketikan Livia berhenti.","expression":"normal","bg":"4.1","hideSprite":true},
      {"speaker":"Narator","text":"Kamu menoleh dan melihatnya menelungkupkan wajahnya di lipatan lengan, tertidur pulas.","expression":"normal","bg":"4.1"},
      {"speaker":"Narator","text":"(Dia bernapas pelan dan teratur)","expression":"normal","bg":"4.1","hideSprite":true,"choices":[{"text":"Bangunkan dia.","nextIndex":41},{"text":"Pakaikan selimut padanya.","nextIndex":45},{"text":"Biarkan saja dan lanjut kerja.","nextIndex":46}]},
      {"speaker":"Livia","text":"Eungh... ah! A-aku ketiduran ya?! Jam berapa ini?!","expression":"scared","bg":"4.2"},
      {"speaker":"Livia","text":"M-maaf! Rencananya aku nggak mau tidur! Tugasnya juga udah selesai sih...","expression":"blushing","bg":"4.2"},
      {"speaker":"Livia","text":"Ukh... memalukan banget... Ya udah, aku balik ke kamarku sekarang!","expression":"pain","bg":"4.2"},
      {"speaker":"Livia","text":"Makasih Wi-Fi nya... dan tumpangannya... Selamat malam!","expression":"happy","bg":"2.1","choices":[{"text":"Malam, Livia. Mimpi indah.","nextIndex":47}]},
      {"speaker":"Narator","text":"Kamu menyampirkan selimut ke punggungnya. Livia sedikit menggeliat tapi kembali tenang.","expression":"normal","bg":"4.2","nextIndex":48},
      {"speaker":"Narator","text":"Kamu membiarkannya tertidur hingga pagi menjemput. Livia sungguh kelelahan.","expression":"normal","bg":"4.1","nextIndex":48},
      {"speaker":"Narator","text":"Livia buru-buru keluar sambil membawa barang-barangnya. Pintu tertutup pelan.","expression":"normal","bg":"2.2","hideSprite":true,"nextIndex":50},
      {"speaker":"Narator","text":"Melihatnya tertidur nyenyak di kamarmu, kamu tersenyum pelan. Kehadirannya kini menjadi bagian yang menyenangkan.","expression":"normal","bg":"4.1","hideSprite":true},
      {"speaker":"Narator","text":"Kamu pun kembali melanjutkan tugasmu dengan tenang.","expression":"normal","bg":"4.1","hideSprite":true, "nextIndex":51},
      {"speaker":"Narator","text":"Apartemen ini tidak lagi terasa sepi seperti dulu.","expression":"normal","bg":"2.1","hideSprite":true,"nextIndex":999},
      {"speaker":"Narator","text":"Apartemen ini tidak lagi terasa sepi seperti dulu.","expression":"normal","bg":"4.1","hideSprite":true}
    ]
  },
  {
    id: 5,
    title: "Rumah Kita",
    reqAffection: 100,
    reqLevel: 5,
    content: [
      {"speaker":"Narator","text":"Beberapa bulan telah berlalu sejak awal Livia pindah ke apartemen ini.","expression":"normal","bg":"5.1","hideSprite":true},
      {"speaker":"Narator","text":"Siang itu, kamu sedang menyapu koridor di depan kamarmu menikmati angin sejuk.","expression":"normal","bg":"5.1","hideSprite":true},
      {"speaker":"Narator","text":"Terdengar suara pintu terbuka. Livia keluar dari kamarnya membawa sebuah pot kecil.","expression":"normal","bg":"5.2"},
      {"speaker":"Livia","text":"Hei. Tumben siang-siang udah rajin nyapu.","expression":"normal","bg":"5.2","choices":[{"text":"Iya, biar bersih.","nextIndex":4},{"text":"Nyapu kenangan masa lalu nih.","nextIndex":5},{"text":"Kamu sendiri tumben nggak tidur siang?","nextIndex":6}]},
      {"speaker":"Livia","text":"Bagus deh, sekalian tolong sapuin depan kamarku ya!","expression":"happy","bg":"5.1","nextIndex":7},
      {"speaker":"Livia","text":"Puitis banget sih! Awas nyapunya kurang bersih!","expression":"silly","bg":"5.1","nextIndex":7},
      {"speaker":"Livia","text":"Enak aja! Aku bukan pemalas ya!","expression":"angry","bg":"5.1","nextIndex":7},
      {"speaker":"Narator","text":"Livia meletakkan pot berisi kaktus mini itu di dekat jendela kamarnya.","expression":"normal","bg":"5.1"},
      {"speaker":"Livia","text":"Lihat nih, aku baru beli kaktus mini. Biar kamarku nggak kelihatan terlalu suram.","expression":"pleased","bg":"5.1","choices":[{"text":"Wah, lucu juga kaktusnya.","nextIndex":9},{"text":"Cocok sama sifatmu yang berduri.","nextIndex":10},{"text":"Paling minggu depan udah layu lupa disiram.","nextIndex":11}]},
      {"speaker":"Livia","text":"Hehe, makasih. Aku pilih yang potnya warna pink lho.","expression":"happy","bg":"5.1","nextIndex":12},
      {"speaker":"Livia","text":"Apa maksudmu?! Mau kulempar kaktus ini ke mukamu?!","expression":"angry","bg":"5.1","nextIndex":12},
      {"speaker":"Livia","text":"Nggak akan! Kaktus kan cuma perlu disiram seminggu sekali!","expression":"serious","bg":"5.1","nextIndex":12},
      {"speaker":"Narator","text":"Livia kemudian bersandar di pagar koridor, menatap langit siang yang cerah.","expression":"normal","bg":"5.1"},
      {"speaker":"Livia","text":"Waktu cepat banget berlalu ya. Nggak terasa udah beberapa bulan kita jadi tetangga.","expression":"normal","bg":"5.1"},
      {"speaker":"Livia","text":"Dulu waktu pertama pindah, aku benci banget tempat ini. Sempit, bau debu, banyak kecoak pula.","expression":"pain","bg":"5.1"},
      {"speaker":"Livia","text":"Tapi sekarang... anehnya aku malah nggak mau pergi dari sini.","expression":"happy","bg":"5.1","choices":[{"text":"Karena suasana apartemennya udah nyaman?","nextIndex":16},{"text":"Adaptasi manusia memang butuh 3 bulan.","nextIndex":17},{"text":"Ngaku aja, kamu betah karena ada aku kan?","nextIndex":18}]},
      {"speaker":"Livia","text":"I-iya sih... suasananya emang hangat. Tapi...","expression":"blushing","bg":"5.1","nextIndex":19},
      {"speaker":"Livia","text":"Halah, teori psikologimu mulai lagi! Padahal bukan cuma itu alasannya...","expression":"pain","bg":"5.1","nextIndex":19},
      {"speaker":"Livia","text":"P-pede banget sih! Walau... ya... sedikit bener sih...","expression":"blushing","bg":"5.1","nextIndex":19},
      {"speaker":"Livia","text":"Bukan cuma karena tempatnya. Tapi... karena orang-orangnya juga.","expression":"normal","bg":"5.1"},
      {"speaker":"Livia","text":"Maksudku...","expression":"scared","bg":"5.1"},
      {"speaker":"Narator","text":"Livia tiba-tiba berbalik menghadapmu dengan raut wajah serius namun pipinya memerah.","expression":"normal","bg":"5.1"},
      {"speaker":"Livia","text":"Kamu itu nyebelin. Suka ngeledek, suka ngajak ribut, dan kadang nggak peka sama sekali...","expression":"angry","bg":"5.1"},
      {"speaker":"Livia","text":"Tapi... kamu juga yang selalu ada tiap kali aku butuh.","expression":"serious","bg":"5.1"},
      {"speaker":"Livia","text":"Dari bantuin angkat kardus, basmi monster kecoak, sampai dengerin keluh kesahku tiap malam.","expression":"happy","bg":"5.1"},
      {"speaker":"Narator","text":"Livia melangkah maju dan menarik ujung lengan bajumu dengan pelan. Matanya menatap lurus ke matamu.","expression":"normal","bg":"5.1","choices":[{"text":"(Diam dan menatapnya kembali)","nextIndex":26},{"text":"(Mengusap kepalanya lembut)","nextIndex":27},{"text":"(Menggenggam tangannya)","nextIndex":28}]},
      {"speaker":"Livia","text":"K-kenapa diam aja sih... bikin aku makin gugup tau...","expression":"blushing","bg":"5.1","nextIndex":29},
      {"speaker":"Livia","text":"E-eh... kebiasaan deh suka ngelus kepala... berantakan tau rambutku...","expression":"blushing","bg":"5.1","nextIndex":29},
      {"speaker":"Livia","text":"K-kamu berani banget pegang tanganku di luar gini...","expression":"scared","bg":"5.1","nextIndex":29},
      {"speaker":"Livia","text":"Kamu tahu kan kalau kamu itu... spesial buatku?","expression":"clingy","bg":"5.1"},
      {"speaker":"Livia","text":"Terima kasih... karena selalu sabar menghadapiku.","expression":"happy","bg":"5.1"},
      {"speaker":"Livia","text":"Terima kasih sudah menjadi 'rumah' baruku di kota ini.","expression":"pleased","bg":"5.1"},
      {"speaker":"Livia","text":"Mulai sekarang, tolong terus berada di sisiku ya. Janji?","expression":"blushing","bg":"5.1","choices":[{"text":"Aku janji, Livia.","nextIndex":33},{"text":"Selamanya?","nextIndex":34},{"text":"Tergantung traktiranmu.","nextIndex":35}]},
      {"speaker":"Livia","text":"Bagus. Kalau kamu ingkar, aku bakal hantuin kamu seumur hidup!","expression":"happy","bg":"5.1","nextIndex":36},
      {"speaker":"Livia","text":"I-iya! S-selamanya kalau perlu! Jangan bikin aku ngulang kalimat memalukan ini lagi!","expression":"angry","bg":"5.1","nextIndex":36},
      {"speaker":"Livia","text":"Dasar mata duitan! Tapi... oke deh, aku traktir makan tiap akhir bulan!","expression":"pain","bg":"5.1","nextIndex":36},
      {"speaker":"Narator","text":"Angin siang berhembus lembut, meniup pelan rambut Livia yang sedang tersenyum cerah padamu.","expression":"normal","bg":"5.1","hideSprite":true},
      {"speaker":"Narator","text":"Kamu sadar, hidupmu di apartemen kecil ini tidak akan pernah membosankan lagi selama ada dia.","expression":"normal","bg":"5.1","hideSprite":true}
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
      { speaker: "Narator", text: "Pagi itu, sinar mentari menembus jendela kamarmu. Aroma kopi yang harum menggelitik hidungmu, membangunkanmu dari tidur lelap.", expression: "normal-6","bg":"6.1" },
      { speaker: "Narator", text: "Kamu berjalan keluar kamar dan terkejut melihat pemandangan di dapurmu.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "Eh, udah bangun? Tuh kopinya diminum mumpung masih hangat.", expression: "normal-6","bg":"6.2"},
      { speaker: "Narator", text: "Kamu menatap heran. Livia yang biasanya selalu bangun siang, kini sudah rapi dengan celemek kesayangannya... di dalam dapurmu.", expression: "normal-6","bg":"6.2"},
      { speaker: "Livia", text: "Apa liat-liat?! Nggak usah mikir macem-macem. Aku cuma kebetulan bangun kepagian dan sekalian aja bikin kopi!", expression: "angry-6","bg":"6.2",
        choices: [
          { text: "Tunggu dulu... gimana cara kamu masuk ke kamarku?", nextIndex: 5 },
          { text: "Nggak bisa nunggu aku bangun dulu buat bukain pintu ya?", nextIndex: 6 },
          { text: "Kau... bukan mantan pencuri kan?", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "K-kemarin malam kamu lupa kunci pintu, tau! Terus pintunya sedikit kebuka, yaudah aku masuk aja!", expression: "blushing-6","bg":"6.2", nextIndex: 8 },
      { speaker: "Livia", text: "K-kepedean! Aku cuma kebetulan lewat dan lihat pintumu nggak kekunci! Siapa juga yang mau nungguin kamu bangun?!", expression: "angry-6","bg":"6.2", nextIndex: 8 },
      { speaker: "Livia", text: "E-enak aja! Aku masuk karena pintu depanmu nggak kekunci dari semalam! Makanya hati-hati dong!", expression: "angry-6","bg":"6.2", nextIndex: 8 },
      { speaker: "Narator", text: "Kamu duduk di meja makan, lalu mencoba menyesap kopi buatan Livia.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "Gimana... rasanya? Terlalu manis nggak? Atau kurang pahit?", expression: "blushing-6","bg":"6.2" },
      { speaker: "Narator", text: "Rasa kopinya luar biasa pas. Busa susunya juga lembut, seperti buatan barista kafe.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "S-syukurlah kalau kamu suka... Aku semalaman nonton puluhan video tutorial cara bikin kopi ala kafe tau.", expression: "happy-6","bg":"6.2" },
      { speaker: "Livia", text: "Eh! B-bukan berarti aku sengaja begadang belajar buat kamu ya! Aku cuma... penasaran aja!", expression: "angry-6","bg":"6.2" },
      { speaker: "Narator", text: "Kamu tertawa kecil. Selain kopi, kamu melihat ada piring berisi roti bakar di atas meja.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "I-itu... aku juga nyoba bikin sarapan. Roti bakar lapis selai.", expression: "serious-6","bg":"6.2" },
      { speaker: "Livia", text: "Tapi... bagian bawahnya agak gosong sedikit. Tadi aku kelupaan ngecilin api kompor.", expression: "pain-6","bg":"6.2",
        choices: [
          { text: "Nggak apa-apa, kelihatan enak kok.", nextIndex: 16 },
          { text: "Gosong itu nambah rasa 'smoky'.", nextIndex: 17 },
          { text: "Sini aku makan bagian yang gosong.", nextIndex: 18 }
        ]
      },
      { speaker: "Livia", text: "Beneran? Jangan dipaksa ya kalau nggak enak.", expression: "normal-6","bg":"6.2", nextIndex: 19 },
      { speaker: "Livia", text: "Alesan macam apa itu?! Tapi... syukurlah kalau kamu mau makan.", expression: "pleased-6","bg":"6.2", nextIndex: 19 },
      { speaker: "Livia", text: "J-jangan sok pahlawan! Kita bagi dua aja gosongnya!", expression: "blushing-6","bg":"6.2", nextIndex: 19 },
      { speaker: "Narator", text: "Kalian pun menikmati sarapan sederhana itu bersama. Meski sedikit gosong, roti itu terasa sangat nikmat.", expression: "normal-6","bg":"6.2" },
      { speaker: "Narator", text: "Selesai makan, Livia menatapmu lamat-lamat.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "Ngomong-ngomong... aku perhatiin belakangan ini kamu kerja terlalu keras. Kantung matamu udah kayak panda.", expression: "clingy-6","bg":"6.2" },
      { speaker: "Livia", text: "Tugasmu banyak banget ya? Sampai sering begadang gitu?", expression: "serious-6","bg":"6.2",
        choices: [
          { text: "Iya nih, banyak proyek akhir.", nextIndex: 23 },
          { text: "Begadang demi bayar sewa apartemen.", nextIndex: 24 },
          { text: "Demi masa depan kita bersama.", nextIndex: 25 }
        ]
      },
      { speaker: "Livia", text: "Ukh... pantesan kamu kelihatan capek banget.", expression: "pain-6","bg":"6.2", nextIndex: 26 },
      { speaker: "Livia", text: "Huuu... dasar pekerja keras. Kalau sakit kan repot.", expression: "serious-6","bg":"6.2", nextIndex: 26 },
      { speaker: "Livia", text: "M-masa depan?! S-siapa yang mau punya masa depan sama kamu?!", expression: "blushing-6","bg":"6.2", nextIndex: 26 },
      { speaker: "Narator", text: "Livia tiba-tiba berdiri dari kursinya dan berjalan ke belakang kursimu.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "Diam sebentar. Jangan gerak-gerak.", expression: "serious-6","bg":"6.2" },
      { speaker: "Narator", text: "Kamu merasakan kedua tangannya yang kecil menempel di pundakmu.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "Biar aku pijitin pundakmu sedikit. Sebagai balasan karena kamu sering bantuin aku.", expression: "blushing-6","bg":"6.2" },
      { speaker: "Narator", text: "Pijatan Livia terasa kikuk. Kadang terlalu pelan, kadang sedikit keras, tapi ketulusannya begitu terasa.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "Aku... aku tahu aku sering merepotkanmu. Aku malas, manja, suka ngambek...", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "Tapi... melihatmu berusaha sekeras ini, aku jadi ngerasa nggak berguna kalau cuma diam aja.", expression: "pain-6","bg":"6.2" },
      { speaker: "Livia", text: "Makanya, aku mau belajar pelan-pelan. Mulai dari bikin kopi, bikin sarapan...", expression: "serious-6","bg":"6.2" },
      { speaker: "Livia", text: "Supaya... supaya aku juga bisa jadi seseorang yang bisa kamu andalkan.", expression: "happy-6","bg":"6.2",
        choices: [
          { text: "Kamu udah sangat membantu kok.", nextIndex: 35 },
          { text: "Tumben ngomongnya manis banget.", nextIndex: 36 },
          { text: "Berarti besok masak makan malam ya?", nextIndex: 37 }
        ]
      },
      { speaker: "Livia", text: "B-beneran? Aku harap kamu nggak bohong cuma buat nyenengin aku.", expression: "blushing-6","bg":"6.2", nextIndex: 38 },
      { speaker: "Livia", text: "A-aku kan lagi serius tau! Ngerusak suasana aja sih!", expression: "angry-6","bg":"6.2", nextIndex: 38 },
      { speaker: "Livia", text: "Enak aja ngelunjak! Pelan-pelan dong, aku kan baru level pemula!", expression: "angry-6","bg":"6.2", nextIndex: 38 },
      { speaker: "Narator", text: "Pijatannya perlahan berhenti. Livia mencondongkan tubuhnya ke depan.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "Jadi... jangan paksakan dirimu ya. Kalau capek, istirahatlah.", expression: "clingy-6","bg":"6.2" },
      { speaker: "Livia", text: "Pintu kamarku... selalu terbuka kalau kamu butuh teman ngobrol, atau... pelukan?", expression: "blushing-6","bg":"6.2" },
      { speaker: "Narator", text: "Sebelum kamu sempat menjawab, Livia sudah berlari kecil menjauh dengan wajah merah padam.", expression: "normal-6","bg":"6.2" },
      { speaker: "Livia", text: "A-aku mau cuci piring dulu! Sana lanjut kerja gih!", expression: "angry-6","bg":"6.2" },
      { speaker: "Narator", text: "Kamu tersenyum sambil kembali menatap layar laptop. Rasa lelahmu benar-benar menguap hari ini.", expression: "normal-6","bg":"6.2" }
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
      { speaker: "Narator", text: "Akhir pekan tiba. Hujan turun rintik-rintik sejak pagi, menciptakan hawa dingin yang menusuk tulang.", expression: "normal-7","bg":"7.1" },
      { speaker: "Narator", text: "Di ruang tengah, kamu mendapati Livia sedang menggulung dirinya di dalam selimut tebal, terlihat seperti kepompong besar di atas karpet.", expression: "normal-7","bg":"7.1" },
      { speaker: "Livia", text: "Haaah... cuaca begini emang paling enak buat tiduran aja seharian. Nggak ngapa-ngapain.", expression: "happy-7","bg":"7.1" },
      { speaker: "Livia", text: "Hei, kamu ngapain masih duduk di meja kerja? Sini dong, temenin aku rebahan.", expression: "clingy-7","bg":"7.1" },
      { speaker: "Livia", text: "Nggak usah mikirin tugas dan kerjaan terus untuk hari ini. Otakmu butuh liburan tau.", expression: "normal-7","bg":"7.1",
        choices: [
          { text: "Boleh deh, lima menit aja.", nextIndex: 5 },
          { text: "Nanti aku ketularan virus malasmu.", nextIndex: 6 },
          { text: "Wah, ajakan yang sulit ditolak.", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "Mana ada lima menit! Minimal lima jam!", expression: "angry-7","bg":"7.1", nextIndex: 8 },
      { speaker: "Livia", text: "Biarin! Biar kita jadi duo pemalas sejati!", expression: "happy-7","bg":"7.1", nextIndex: 8 },
      { speaker: "Livia", text: "Makanya buruan sini, selimutnya masih muat kok buat berdua.", expression: "pleased-7", nextIndex: 8 },
      { speaker: "Narator", text: "Kamu akhirnya mengalah. Meninggalkan mejamu, kamu ikut berbaring di sebelah Livia.", expression: "normal-7","bg":"7.1" },
      { speaker: "Narator", text: "Livia dengan cepat menarik ujung selimutnya dan menutupi tubuhmu juga. Kehangatan langsung menjalar.", expression: "normal-7","bg":"7.1" },
      { speaker: "Livia", text: "Hehe... nyaman banget kan? Sesekali jadi kaum rebahan itu nggak ada salahnya.", expression: "happy-7","bg":"7.1" },
      { speaker: "Livia", text: "Ngomong-ngomong, karena kita lagi santai... mau order makanan ringan nggak? Aku pengen ngunyah sesuatu.", expression: "normal-7","bg":"7.1",
        choices: [
          { text: "Pesan pizza aja gimana?", nextIndex: 12 },
          { text: "Cemilan manis kayak martabak?", nextIndex: 13 },
          { text: "Mie instan paling mantap.", nextIndex: 14 }
        ]
      },
      { speaker: "Livia", text: "Wah, setuju! Tambah keju mozarella ya!", expression: "happy-7","bg":"7.1", nextIndex: 15 },
      { speaker: "Livia", text: "Boleh juga, yang topping coklat kacang!", expression: "pleased-7","bg":"7.1", nextIndex: 15 },
      { speaker: "Livia", text: "Klasik banget, tapi boleh deh pakai telur setengah matang!", expression: "happy-7","bg":"7.1", nextIndex: 15 },
      { speaker: "Narator", text: "Sambil menunggu pesanan datang, kalian memutuskan untuk menonton film dari laptop.", expression: "normal-7","bg":"7.1" },
      { speaker: "Livia", text: "Pilih genre filmnya dong. Karena cuacanya lagi mendung, mending horor nggak sih?", expression: "flirty-7","bg":"7.1",
        choices: [
          { text: "Boleh, emangnya kamu berani?", nextIndex: 17 },
          { text: "Gimana kalau komedi aja?", nextIndex: 18 },
          { text: "Romance aja biar romantis.", nextIndex: 19 }
        ]
      },
      { speaker: "Livia", text: "B-berani lah! Palingan setan bohongan!", expression: "angry-7","bg":"7.1", nextIndex: 20 },
      { speaker: "Livia", text: "Huuu penakut. Ya udah deh, biar kamu nggak ketakutan.", expression: "pleased-7","bg":"7.1", nextIndex: 20 },
      { speaker: "Livia", text: "R-romantis?! S-siapa juga yang mau romantis-romantisan sama kamu!", expression: "blushing-7","bg":"7.1", nextIndex: 20 },
      { speaker: "Narator", text: "Tak lama kemudian makanan datang. Kalian menikmati cemilan hangat sambil menonton film pilihan.", expression: "normal-7","bg":"7.1" },
      { speaker: "Narator", text: "Di luar sana, hujan semakin deras. Angin kencang sesekali menghantam jendela kaca.", expression: "normal-7","bg":"7.1" },
      { speaker: "Livia", text: "Ukh... hujannya makin parah ya. Bikin merinding aja.", expression: "serious-7","bg":"7.1" },
      { speaker: "Narator", text: "TIBA-TIBA...", expression: "normal-7","bg":"7.1" },
      { speaker: "Narator", text: "*CTAR! JGEEERRR!!*", expression: "normal-7","bg":"7.2" },
      { speaker: "Livia", text: "KYAAAAA!!!", expression: "scared-7","bg":"7.2" },
      { speaker: "Narator", text: "Seiring dengan gelegar guntur yang memekakkan telinga, lampu apartemen seketika padam. Kegelapan menyelimuti ruangan.", expression: "normal-7","bg":"7.2" },
      { speaker: "Livia", text: "H-hei... k-kamu di mana?! Gelap banget! Aku nggak bisa lihat apa-apa!", expression: "pain-7","bg":"7.2" },
      { speaker: "Narator", text: "Dalam kepanikan, Livia meraba-raba dan langsung memeluk erat tubuhmu. Ia gemetar.", expression: "normal-7","bg":"7.2" },
      { speaker: "Livia", text: "J-jangan tinggalin aku... a-aku paling takut sama gelap dan petir...", expression: "clingy-7", "bg":"7.2",
        choices: [
          { text: "Tenang, aku di sini kok.", nextIndex: 30 },
          { text: "Pegang tanganku erat-erat.", nextIndex: 31 },
          { text: "(Balas memeluknya perlahan)", nextIndex: 32 }
        ]
      },
      { speaker: "Livia", text: "B-beneran ya? Jangan pergi kemana-mana lho!", expression: "pain-7","bg":"7.2", nextIndex: 33 },
      { speaker: "Livia", text: "Iya... ukh, tanganku dingin banget kan...", expression: "pain-7", "bg":"7.2", nextIndex: 33 },
      { speaker: "Livia", text: "A-apa yang kamu lakuin?! T-tapi... rasanya aman. Teruslah begini...", expression: "blushing-7", "bg":"7.2", nextIndex: 33 },
      { speaker: "Narator", text: "Kamu menyalakan senter dari ponselmu dan mengarahkannya ke langit-langit, memberikan penerangan remang.", expression: "normal-7","bg":"7.2" },
      { speaker: "Narator", text: "Wajah Livia terlihat pucat, namun genggamannya pada bajumu perlahan mengendur seiring hadirnya cahaya.", expression: "normal-7","bg":"7.2" },
      { speaker: "Livia", text: "Fuh... syukurlah ada cahaya. M-maaf ya, aku cengeng banget.", expression: "sad-7", "bg":"7.2" },
      { speaker: "Livia", text: "Dari kecil, tiap kali mati lampu karena petir, aku selalu sembunyi di dalam lemari sendirian.", expression: "serious-7", "bg":"7.2" },
      { speaker: "Livia", text: "Orang tuaku sering lembur kerja, jadi... aku terbiasa menghadapi ketakutanku sendirian.", expression: "normal-7", "bg":"7.2" },
      { speaker: "Livia", text: "Tapi hari ini... karena ada kamu, rasanya nggak seseram dulu lagi.", expression: "happy-7", "bg":"7.2",
        choices: [
          { text: "Mulai sekarang kamu nggak sendirian lagi.", nextIndex: 39 },
          { text: "Aku bakal selalu jagain kamu.", nextIndex: 40 },
          { text: "Dasar penakut, sini dekat-dekat.", nextIndex: 41 }
        ]
      },
      { speaker: "Livia", text: "Kamu ini... selalu tau cara bikin orang tersentuh ya.", expression: "blushing-7", "bg":"7.2", nextIndex: 42 },
      { speaker: "Livia", text: "J-janji lho ya! Kalau bohong, aku kutuk jadi kecoak!", expression: "angry-7", "bg":"7.2", nextIndex: 42 },
      { speaker: "Livia", text: "Biarin! Sengaja kok biar bisa modus meluk-meluk!", expression: "silly-7", "bg":"7.2", nextIndex: 42 },
      { speaker: "Narator", text: "Sekitar dua puluh menit berlalu. Tiba-tiba lampu kembali menyala terang.", expression: "normal-7","bg":"7.1" },
      { speaker: "Livia", text: "Ah! Nyala lagi!", expression: "happy-7", "bg":"7.1" },
      { speaker: "Narator", text: "Livia segera tersadar betapa eratnya ia memelukmu. Ia langsung melompat mundur dengan wajah bersemu merah.", expression: "normal-7","bg":"7.1" },
      { speaker: "Livia", text: "E-ekhem! L-lupakan kejadian barusan! Anggap aja aku lagi kesurupan!", expression: "blushing-7", "bg":"7.1" },
      { speaker: "Livia", text: "Ayo lanjut nontonnya! Filmnya masih seru tau!", expression: "angry-7", "bg":"7.1" },
      { speaker: "Narator", text: "Kamu hanya bisa tertawa melihat tingkah tsundere-nya yang kembali kumat. Hujan di luar sana masih turun, namun harimu terasa begitu hangat.", expression: "normal-7","bg":"7.1" }
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
      // Bg 8.1: Train Journey (Subuh -> Pagi)
      { speaker: "Narator", text: "Kereta melaju membelah kegelapan malam. Kalian sengaja mengambil jadwal keberangkatan pukul 3 dini hari agar tiba di kampung halaman Livia pagi ini.", expression: "normal-8", "bg": "8.1" },
      { speaker: "Narator", text: "Suasana gerbong masih sangat sepi. Sebagian besar penumpang masih terlelap, termasuk Livia yang duduk di sebelahmu.", expression: "normal-8", "bg": "8.1" },
      { speaker: "Livia", text: "Nghh... jam berapa sekarang...?", expression: "pain-8", "bg": "8.1" },
      { speaker: "Livia", text: "Hoam... mataku masih berat banget. Padahal di kereta susah tidur nyenyak.", expression: "sad-8", "bg": "8.1",
        choices: [
          { text: "Tidur lagi aja, perjalanan masih panjang kok.", nextIndex: 4 },
          { text: "Pundakku kosong nih kalau kamu mau nyender.", nextIndex: 5 },
          { text: "Makanya, siapa suruh milih tiket jam 3 pagi?", nextIndex: 6 }
        ]
      },
      { speaker: "Livia", text: "Iya deh... bangunin aku kalau langitnya udah terang ya.", expression: "sad-8", "bg": "8.1", nextIndex: 7 },
      { speaker: "Livia", text: "M-modus! ...tapi boleh deh, lagi ngantuk banget soalnya.", expression: "blushing-8", "bg": "8.1", nextIndex: 7 },
      { speaker: "Livia", text: "Kan biar tiketnya lebih murah! Kamu ini nggak tau cara berhemat ya?!", expression: "angry-8", "bg": "8.1", nextIndex: 7 },
      { speaker: "Narator", text: "Livia menyandarkan kepalanya di pundakmu dan kembali terlelap. Kamu pun ikut menikmati sisa perjalanan sambil melihat fajar perlahan menyingsing.", expression: "normal-8", "bg": "8.1" },
      { speaker: "Narator", text: "Semburat warna jingga keemasan mulai menghiasi langit di luar jendela. Pemandangan hamparan sawah yang terkena sinar matahari pagi tampak begitu indah.", expression: "normal-8", "bg": "8.2" },
      { speaker: "Livia", text: "Nghh... udah pagi ya... wah, mataharinya cantik banget...", expression: "happy-8", "bg": "8.2" },
      { speaker: "Livia", text: "Aku selalu suka lihat sunrise dari kereta. Sebentar lagi kita sampai nih.", expression: "pleased-8", "bg": "8.2" },
      { speaker: "Narator", text: "Suara pengumuman dari pengeras suara bergema, menandakan bahwa kereta akan segera tiba di stasiun tujuan.", expression: "normal-8", "bg": "8.2" },
      
      // Bg 8.2: Train Station (Pagi)
      { speaker: "Narator", text: "Kalian melangkah turun dari kereta tepat pukul delapan pagi. Udara pagi yang sejuk namun cukup menusuk langsung menyapa kulit.", expression: "normal-8", "bg": "8.3" },
      { speaker: "Livia", text: "Brrr... ternyata udara pagi di sini lebih dingin dari dugaanku.", expression: "scared-8", "bg": "8.3" },
      { speaker: "Livia", text: "Untung kita pakai mantel yang tebal. Kalau nggak, kita berdua udah jadi es serut sekarang.", expression: "happy-8", "bg": "8.3" },
      { speaker: "Narator", text: "Livia menggosok-gosokkan kedua tangannya, mencoba mencari kehangatan. Ia melirikmu dengan pandangan penuh harap.", expression: "normal-8", "bg": "8.3" },
      { speaker: "Livia", text: "Sini, tanganku masukin ke sakumu dong... biar anget barengan.", expression: "clingy-8", "bg": "8.3" },
      { speaker: "Narator", text: "Kamu membiarkan Livia menyelipkan tangannya ke dalam saku mantelmu, saling menggenggam satu sama lain.", expression: "normal-8", "bg": "8.3" },
      { speaker: "Livia", text: "Hehe... saku ini hangat... tapi genggamanmu jauh lebih hangat.", expression: "blushing-8", "bg": "8.3" },
      
      // Bg 8.3: Town Streets (Pagi)
      { speaker: "Narator", text: "Kalian berjalan keluar dari stasiun, menyusuri jalanan desa yang mulai diwarnai aktivitas warga di pagi hari.", expression: "normal-8", "bg": "8.4" },
      { speaker: "Livia", text: "Udara pagi di sini seger banget kan? Beda jauh sama udara kota yang isinya polusi.", expression: "happy-8", "bg": "8.4" },
      { speaker: "Livia", text: "Dulu waktu SD, jam segini aku biasanya lagi lari-larian ngejar layangan di lapangan dekat sini.", expression: "silly-8", "bg": "8.4" },
      { speaker: "Livia", text: "Tapi lapangannya sekarang udah jadi bangunan... agak sayang sih.", expression: "sad-8", "bg": "8.4" },
      { speaker: "Narator", text: "Livia memandang sekeliling dengan mata yang berbinar, memancarkan rindu yang tertahan selama ini.", expression: "normal-8", "bg": "8.4" },
      { speaker: "Livia", text: "Aku senang bisa ngajak kamu jalan-jalan pagi di tempat masa kecilku.", expression: "flirty-8", "bg": "8.4" },
      
      // Bg 8.4: Passing by Shops (Pagi, Toko Buka)
      { speaker: "Narator", text: "Sepanjang jalan, beberapa ruko dan toko kue tua baru saja membuka pintunya. Aroma roti yang baru dipanggang semerbak di udara.", expression: "normal-8", "bg": "8.5" },
      { speaker: "Livia", text: "Eh, cium baunya nggak? Itu toko roti langgananku dari kecil!", expression: "happy-8", "bg": "8.5" },
      { speaker: "Livia", text: "Rotinya masih panas karena baru matang! Kita mampir beli dulu yuk buat oleh-oleh Ibu dan Papa?", expression: "clingy-8", "bg": "8.5" },
      { speaker: "Narator", text: "Kalian mampir sejenak, membeli sekantong roti hangat yang aromanya sangat menggoda selera.", expression: "normal-8", "bg": "8.5" },
      
      // Bg 8.5: Nature / Near House (Pagi cerah)
      { speaker: "Narator", text: "Kalian melanjutkan perjalanan. Perlahan, jalanan berubah menjadi jalan berbatu dengan pepohonan rindang yang masih berembun.", expression: "normal-8", "bg": "8.6" },
      { speaker: "Livia", text: "Nah, kita udah hampir sampai. Lewati turunan ini, terus belok kanan.", expression: "normal-8", "bg": "8.6" },
      { speaker: "Livia", text: "Duh... Ibu pasti kaget banget kita nyampe sepagi ini.", expression: "scared-8", "bg": "8.6",
        choices: [
          { text: "Nggak usah khawatir, aku bakal bersikap sangat sopan kok.", nextIndex: 32 },
          { text: "Asal kita bawa roti hangat ini, pasti mereka senang.", nextIndex: 33 },
          { text: "Bawa calon menantu tampan di pagi hari, siapa yang nggak kaget?", nextIndex: 34 }
        ]
      },
      { speaker: "Livia", text: "Aku tahu kok kamu bisa diandalkan. Pegang tanganku lebih erat ya.", expression: "happy-8", "bg": "8.6", nextIndex: 35 },
      { speaker: "Livia", text: "Bener juga! Apalagi Papaku suka banget sarapan pakai roti ini.", expression: "pleased-8", "bg": "8.6", nextIndex: 35 },
      { speaker: "Livia", text: "T-tampan dari mananya! Nanti Ibu malah ketawa ngeliat gombalanmu!", expression: "angry-8", "bg": "8.6", nextIndex: 35 },
      
      // Bg 8.6: Outside House (Pagi)
      { speaker: "Narator", text: "Tak lama kemudian, sebuah rumah kayu dua lantai yang tampak asri diterangi sinar matahari pagi mulai terlihat.", expression: "normal-8", "bg": "8.7" },
      { speaker: "Narator", text: "Jendelanya terbuka lebar, membiarkan udara pagi masuk dengan leluasa.", expression: "normal-8", "bg": "8.7" },
      { speaker: "Livia", text: "Huuft... oke. Ini dia rumahnya.", expression: "serious-8", "bg": "8.7" },
      { speaker: "Livia", text: "Siap-siap ya, jangan malu-malu.", expression: "flirty-8", "bg": "8.7" },
      { speaker: "Narator", text: "Livia melangkah maju dan mengetuk pintu kayu tebal itu sebanyak tiga kali.", expression: "normal-8", "bg": "8.8" },
      { speaker: "Narator", text: "Terdengar suara langkah kaki yang cukup berat menghampiri dari dalam.", expression: "normal-8", "bg": "8.8" },
      
      // Bg 8.7: Inside House, Meeting Laura (Pagi)
      { speaker: "Laura", text: "Iya, iya, sebentar... eh?!", expression: "confused-8", "bg": "8.9" },
      { speaker: "Laura", text: "Ya ampun! Livia, sayangku! Kalian berangkat jam berapa dari kota?! Kok pagi-pagi buta begini sudah sampai?", expression: "happy-8", "bg": "8.9" },
      { speaker: "Livia", text: "Kita sengaja ambil kereta jam 3 pagi, Bu. K-kejutan dong!", expression: "blushing-8", "bg": "8.9" },
      { speaker: "Narator", text: "Laura memeluk putrinya yang masih tercium aroma embun pagi. Setelah itu, pandangannya beralih padamu.", expression: "normal-8", "bg": "8.9" },
      { speaker: "Laura", text: "Tunggu... wajahmu sepertinya tidak asing. Kamu pemuda yang Tante titipi untuk bantu Livia pindahan waktu itu, kan?", expression: "confused-8", "bg": "8.9" },
      { speaker: "Livia", text: "Iya, Bu. D-dia nemenin aku pulang...", expression: "blushing-8", "bg": "8.9" },
      { speaker: "Laura", text: "Astaga, akhirnya kita bisa bertemu langsung! Padahal Tante baru mau mulai masak buat sarapan lho.", expression: "happy-8", "bg": "8.9",
        choices: [
          { text: "Senang bisa bertemu langsung, Tante Laura.", nextIndex: 48 },
          { text: "Sesuai janji, anak Tante sudah saya antarkan pagi-pagi buta.", nextIndex: 49 },
          { text: "Senang bertemu dengan calon Ibu Mertua di pagi yang cerah ini.", nextIndex: 50 }
        ]
      },
      { speaker: "Laura", text: "Tante juga sangat senang! Ayo masuk, udaranya dingin kan?", expression: "pleased-8", "bg": "8.9", nextIndex: 51 },
      { speaker: "Laura", text: "Hahaha, kamu ini kaku amat. Santai aja sama Tante mah.", expression: "flirty-8", "bg": "8.9", nextIndex: 51 },
      { speaker: "Livia", text: "I-I-Ibu M-mertua?! M-masih pagi lho ini, udah ngelantur aja!", expression: "angry-8", "bg": "8.9", nextIndex: 51 },
      { speaker: "Narator", text: "Laura tertawa riang, tawanya menghangatkan suasana di ruang tamu.", expression: "normal-8", "bg": "8.9" },
      { speaker: "Laura", text: "Pasti repot ya ngadepin Livia. Tante tahu anak ini memang keras kepala kalau disuruh bangun pagi.", expression: "flirty-8", "bg": "8.9" },
      { speaker: "Livia", text: "Ibuuu! Jangan ngerusak citra ku di depan dia dong!", expression: "pain-8", "bg": "8.9" },
      { speaker: "Laura", text: "Hahaha, bercanda sayang. Ngomong-ngomong, Papa lagi minum kopi di ruang tengah. Kalian temui dia dulu gih sambil Tante bikinin sarapan.", expression: "pleased-8", "bg": "8.9" },
      
      // Bg 8.8: Living room, Meeting Enji (Pagi)
      { speaker: "Narator", text: "Kalian berjalan menuju ruang tengah. Sinar mentari masuk melalui jendela besar, menyinari ruangan yang rapi.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Narator", text: "Di sofa tunggal, duduk seorang pria paruh baya berkacamata yang memancarkan aura ketenangan. Di mejanya terdapat secangkir kopi hitam dan koran pagi.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Enji", text: "Oh... kalian sudah sampai.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Livia", text: "Papa! Livia pulang...", expression: "happy-8", "bg": "8.10" },
      { speaker: "Enji", text: "Iya, Papa lihat. Kamu pasti ngantuk kan di kereta. Kantung matamu tebal begitu.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Livia", text: "Papa!! Baru juga nyampe udah dikatain mata panda! Ngeselin banget sih!", expression: "angry-8", "bg": "8.10" },
      { speaker: "Narator", text: "Pria itu hanya tersenyum tipis, menyeruput kopinya sejenak sebelum pandangannya beralih menilaimu.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Enji", text: "Jadi... kamu pemuda yang sering diceritakan istriku ya.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Enji", text: "Duduklah. Jangan berdiri terus seperti patung.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Narator", text: "Kamu duduk di sofa seberang dengan sedikit gugup. Auranya terasa berwibawa, namun ia tampak sama sekali tak berniat mengintimidasimu.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Enji", text: "Dengar, anak muda. Saya bukan tipikal ayah yang akan menodongkan senapan pada pacar anak perempuannya.", expression: "serious-8", "bg": "8.10" },
      { speaker: "Enji", text: "Apalagi di pagi hari yang cerah ini. Saya sudah terlalu tua untuk hal dramatis semacam itu. Mengurus anak muda itu melelahkan.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Livia", text: "Papa ngomong apa sih... kita belum pacaran tau...", expression: "blushing-8", "bg": "8.10" },
      { speaker: "Enji", text: "Belum? Ah, sudahlah. Saya hanya punya satu aturan mutlak di rumah ini.", expression: "normal-8", "bg": "8.10",
        choices: [
          { text: "Apa itu, Om?", nextIndex: 69 },
          { text: "Jangan menyakiti Livia?", nextIndex: 70 },
          { text: "Harus bangun pagi setiap hari?", nextIndex: 71 }
        ]
      },
      { speaker: "Enji", text: "Aturannya sangat sederhana.", expression: "normal-8", "bg": "8.10", nextIndex: 72 },
      { speaker: "Enji", text: "Bukan itu. Itu terlalu klise.", expression: "normal-8", "bg": "8.10", nextIndex: 72 },
      { speaker: "Enji", text: "Saya memang bangun jam 4 pagi, tapi aturannya bukan itu.", expression: "normal-8", "bg": "8.10", nextIndex: 72 },
      { speaker: "Enji", text: "Aturannya adalah: Jangan pernah membuat Laura marah. Hidup dan ketenangan saya sangat bergantung pada senyumnya.", expression: "serious-8", "bg": "8.10" },
      { speaker: "Laura", text: "Papa ngomong apa sih ke anak orang?! Bantuin siapin piring sini!", expression: "angry-8", "bg": "8.10" },
      { speaker: "Enji", text: "Tuh kan... baru saja dibilang. Saya pamit ke dapur dulu.", expression: "scared-8", "bg": "8.10" },
      { speaker: "Narator", text: "Kamu tak kuasa menahan senyum. Terlepas dari aura seriusnya, ternyata Enji hanyalah seorang ayah yang sangat menyayangi kedamaian keluarganya.", expression: "normal-8", "bg": "8.10" },
      { speaker: "Livia", text: "Hahaha, Papa emang nggak pernah berubah. Cuma Ibu pawangnya.", expression: "silly-8", "bg": "8.10" },
      
      // Bg 8.9: Breakfast/Brunch
      { speaker: "Narator", text: "Tak lama kemudian, kalian berkumpul di ruang makan. Tersaji hidangan sarapan yang hangat, dilengkapi dengan roti yang kalian beli tadi.", expression: "normal-8", "bg": "8.11" },
      { speaker: "Laura", text: "Ayo sarapan, kalian pasti kelaparan dari subuh belum makan kan?", expression: "happy-8", "bg": "8.11" },
      { speaker: "Enji", text: "Biasanya Laura hanya membuatkan saya roti bakar kosong. Kamu benar-benar beruntung, Nak.", expression: "normal-8", "bg": "8.11" },
      { speaker: "Laura", text: "Pa! Lauknya dikurangin lho nanti siangnya!", expression: "angry-8", "bg": "8.11" },
      { speaker: "Enji", text: "Iya, iya, saya makan dalam diam.", expression: "scared-8", "bg": "8.11" },
      { speaker: "Narator", text: "Sarapan berlangsung dengan riang. Gelak tawa sesekali pecah berkat respons datar Enji yang tanpa ampun ditepis oleh Laura.", expression: "normal-8", "bg": "8.11" },
      { speaker: "Laura", text: "Habis sarapan, kalian istirahat ya. Pasti capek banget perjalanan semalaman.", expression: "pleased-8", "bg": "8.11" },
      { speaker: "Livia", text: "Iya, Bu. Aku juga rasanya udah mau pingsan saking ngantuknya.", expression: "pain-8", "bg": "8.11" },
      { speaker: "Enji", text: "Baguslah. Pemuda memang butuh banyak istirahat biar otak dan hatinya berfungsi dengan baik.", expression: "normal-8", "bg": "8.11" },
      
      // Bg 8.10: Livia's Room (Siang/Pagi menjelang siang)
      { speaker: "Narator", text: "Selesai sarapan, Livia mengantarmu menaiki tangga menuju kamarnya di lantai dua untuk beristirahat.", expression: "normal-8", "bg": "8.12" },
      { speaker: "Narator", text: "Sinar matahari pagi menjelang siang masuk melalui celah gorden kamarnya yang dipenuhi aroma lavender.", expression: "normal-8", "bg": "8.12" },
      { speaker: "Livia", text: "Tadaa! Selamat datang di markas rahasiaku!", expression: "happy-8", "bg": "8.12" },
      { speaker: "Narator", text: "Kamarnya tertata rapi. Di dinding terdapat poster usang, dan di rak buku tersusun komik-komik masa kecilnya.", expression: "normal-8", "bg": "8.12" },
      { speaker: "Livia", text: "Agak sedikit berdebu sih, soalnya lama nggak kutempatin. Tapi semua kenanganku ada di sini.", expression: "blushing-8", "bg": "8.12" },
      { speaker: "Livia", text: "Jujur, dari dulu aku udah bayangin momen ini...", expression: "serious-8", "bg": "8.12" },
      { speaker: "Livia", text: "Membawa seseorang yang spesial buat ngeliat kamar masa kecilku.", expression: "happy-8", "bg": "8.12" },
      { speaker: "Livia", text: "Jadi... gimana rasanya ketemu keluargaku pagi-pagi begini?", expression: "flirty-8", "bg": "8.12",
        choices: [
          { text: "Sangat menyenangkan, sambutan yang luar biasa hangat.", nextIndex: 94 },
          { text: "Papamu lucu sekali, aku sangat menyukainya.", nextIndex: 95 },
          { text: "Pantas kamu tumbuh jadi anak yang hangat dan penyayang.", nextIndex: 96 }
        ]
      },
      { speaker: "Livia", text: "Syukurlah kalau kamu nyaman. Sempet takut kamu bakal risih sama mereka.", expression: "pleased-8", "bg": "8.12", nextIndex: 97 },
      { speaker: "Livia", text: "Hahaha! Baru kali ini ada yang bilang Papa lucu. Biasanya orang-orang takut duluan.", expression: "happy-8", "bg": "8.12", nextIndex: 97 },
      { speaker: "Livia", text: "Gombal di pagi hari! Udah mending kita istirahat aja deh!", expression: "blushing-8", "bg": "8.12", nextIndex: 97 },
      { speaker: "Narator", text: "Livia duduk di tepi tempat tidurnya sambil menguap lebar, pertahanan dirinya melawan kantuk akhirnya runtuh.", expression: "normal-8", "bg": "8.12" },
      { speaker: "Livia", text: "Kamu istirahat di kasur tambahan yang disiapin Ibu di bawah ya... aku mau tidur dulu...", expression: "clingy-8", "bg": "8.12" },
      { speaker: "Narator", text: "Hanya dalam beberapa menit, Livia tertidur lelap. Hari pertamamu di kampung halamannya dimulai dengan pagi yang manis dan menenangkan.", expression: "normal-8", "bg": "8.12" }
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
      { speaker: "Narator", text: "Malam itu, langit terlihat sangat cerah. Kalian berdua duduk berdampingan di balkon kamarmu, menikmati udara malam yang sejuk.", expression: "normal" },
      { speaker: "Narator", text: "Di antara kalian terdapat dua cangkir cokelat panas yang mulai kehilangan uapnya.", expression: "normal" },
      { speaker: "Livia", text: "Angin malam ini sejuk ya... Nggak kerasa kita udah ngelewatin banyak hal berdua.", expression: "happy" },
      { speaker: "Livia", text: "Kalau dipikir-pikir, dulu aku cuma cewek pemalas yang kerjaannya tiduran doang. Nggak nyangka sekarang aku bisa sejauh ini.", expression: "normal" },
      { speaker: "Livia", text: "Menurutmu... aku udah banyak berubah nggak sih sejak kita pertama kenal?", expression: "serious",
        choices: [
          { text: "Kamu jauh lebih dewasa dan bisa diandalkan sekarang.", nextIndex: 5 },
          { text: "Berubah sih, dari pemalas level 100 jadi pemalas level 99.", nextIndex: 6 },
          { text: "Kamu makin cantik dan bikin aku makin jatuh cinta.", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "Hehe... dengar kamu bilang gitu rasanya lega. Aku emang berusaha keras tau!", expression: "happy", nextIndex: 8 },
      { speaker: "Livia", text: "Kurang ajar! Usahaku selama ini nggak dihargain banget sih!", expression: "angry", nextIndex: 8 },
      { speaker: "Livia", text: "A-apa-apaan sih tiba-tiba gombal! S-siapa juga yang mau bikin kamu jatuh cinta!", expression: "blushing", nextIndex: 8 },
      { speaker: "Narator", text: "Livia menundukkan pandangannya, menatap cangkir di tangannya dengan sorot mata yang tiba-tiba melembut.", expression: "normal" },
      { speaker: "Livia", text: "Jujur aja... kadang aku merasa takut.", expression: "sad" },
      { speaker: "Livia", text: "Waktu berlalu begitu cepat. Kuliah sudah mau selesai, dan kita harus mikirin masa depan.", expression: "serious" },
      { speaker: "Livia", text: "Aku takut... suatu hari nanti, saat semuanya berubah, kamu bakal ngerasa kalau aku ini cuma beban.", expression: "pain" },
      { speaker: "Livia", text: "Atau... kamu mungkin bakal nemuin orang lain yang lebih rajin, lebih mandiri, dan lebih sempurna dari aku...", expression: "crying",
        choices: [
          { text: "Aku nggak akan pernah ninggalin kamu, Livia.", nextIndex: 13 },
          { text: "Bodoh. Sampai kapanpun kamu tetap yang nomor satu.", nextIndex: 14 },
          { text: "Gimana mau cari yang lain kalau hatiku udah nyangkut di kamu?", nextIndex: 15 }
        ]
      },
      { speaker: "Livia", text: "J-janji ya? Jangan cuma ngomong manis aja di mulut...", expression: "blushing", nextIndex: 16 },
      { speaker: "Livia", text: "Ukh... kenapa kamu pinter banget bikin aku nggak bisa ngomong...", expression: "blushing", nextIndex: 16 },
      { speaker: "Livia", text: "G-gombal murahan! Tapi... syukurlah kalau gitu...", expression: "blushing", nextIndex: 16 },
      { speaker: "Narator", text: "Kamu tersenyum, meletakkan cangkirmu, lalu menggenggam kedua tangan Livia dengan lembut.", expression: "normal" },
      { speaker: "Narator", text: "Jantungmu berdebar kencang. Kamu merogoh saku jaketmu dan mengeluarkan sebuah kotak kecil berlapis beludru.", expression: "normal" },
      { speaker: "Livia", text: "E-eh...? K-kotak apa itu? Jangan bilang kamu...?", expression: "scared" },
      { speaker: "Narator", text: "Kamu membuka kotak itu perlahan. Di bawah temaram cahaya bulan, sebuah cincin sederhana namun elegan berkilau indah.", expression: "normal" },
      { speaker: "Livia", text: "Ini... ini beneran? Kamu...", expression: "crying",
        choices: [
          { text: "Maukah kamu menghabiskan sisa hidupmu bersamaku, Livia?", nextIndex: 21 },
          { text: "Kalau nggak mau, cincinnya kulempar ke bawah nih.", nextIndex: 22 },
          { text: "Jadilah milikku selamanya, dan mari kita hadapi masa depan bersama.", nextIndex: 23 }
        ]
      },
      { speaker: "Livia", text: "Hiks... Bodoh... kenapa kamu nanya hal yang udah jelas jawabannya...", expression: "crying", nextIndex: 24 },
      { speaker: "Livia", text: "JANGAN! Ih kamu tuh ngajak nikah tapi ngeselin banget! Awas kalau dilempar!", expression: "angry", nextIndex: 24 },
      { speaker: "Livia", text: "U-uhhh... kata-katamu kayak di novel aja... tapi, aku mau...", expression: "crying", nextIndex: 24 },
      { speaker: "Narator", text: "Air mata bahagia menetes dari sudut mata Livia. Ia menyeka air matanya dan menyodorkan jari manis kiri ke arahmu.", expression: "normal" },
      { speaker: "Livia", text: "Tunggu apa lagi? Cepat pasangkan... sebelum aku berubah pikiran karena malu...", expression: "blushing" },
      { speaker: "Narator", text: "Dengan tangan yang sedikit bergetar, kamu menyematkan cincin itu di jarinya. Ukurannya sangat pas.", expression: "normal" },
      { speaker: "Livia", text: "Pas... kamu bahkan tau ukuran jariku. Dasar penguntit diam-diam.", expression: "happy" },
      { speaker: "Livia", text: "Tapi... terima kasih. Aku janji... aku akan berusaha jadi pendamping yang baik buat kamu.", expression: "happy" },
      { speaker: "Narator", text: "Malam itu, di bawah saksi ribuan bintang, janji untuk hidup dan menua bersama telah resmi terukir di antara kalian.", expression: "normal" }
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
      { speaker: "Narator", text: "Hari demi hari berlalu. Kamarmu yang dulu sepi kini penuh dengan tumpukan berkas dari balai kota, brosur gaun pengantin, dan denah gedung.", expression: "normal" },
      { speaker: "Narator", text: "Livia terlihat duduk bersila di tengah kekacauan kertas, memegang kalkulator di satu tangan dan pulpen di tangan lainnya.", expression: "normal" },
      { speaker: "Livia", text: "Huft... Coba aku cek lagi. Pendaftaran pernikahan udah lengkap, DP kapel udah beres, undangan udah dicetak...", expression: "normal" },
      { speaker: "Livia", text: "Tapi milih kateringnya ini lho yang bikin pusing! Kenapa pilihannya harus sebanyak ini sih?!", expression: "angry" },
      { speaker: "Livia", text: "Ada menu tradisional, western, oriental... Aku kan jadi laper lihat gambarnya doang!", expression: "pain",
        choices: [
          { text: "Pilih yang banyak dagingnya aja, pasti pada suka.", nextIndex: 5 },
          { text: "Gimana kalau kita sajikan mie instan? Hemat budget.", nextIndex: 6 },
          { text: "Pilih menu tradisional aja biar keluarga besar senang.", nextIndex: 7 }
        ]
      },
      { speaker: "Livia", text: "Bener juga! Apalagi rendang sapi, wajib ada tuh!", expression: "happy", nextIndex: 8 },
      { speaker: "Livia", text: "Kamu gila ya?! Bisa-bisa ibu ngamuk kalau tamu disuguhin mie instan doang!", expression: "angry", nextIndex: 8 },
      { speaker: "Livia", text: "Masuk akal sih. Ibu pasti lebih suka masakan lokal ketimbang pasta-pastaan.", expression: "normal", nextIndex: 8 },
      { speaker: "Narator", text: "Livia mencoret salah satu menu di brosur, lalu merebahkan tubuhnya ke karpet sambil membuang napas panjang.", expression: "normal" },
      { speaker: "Livia", text: "Ternyata nyiapin pernikahan itu capek banget ya! Punggungku sampai pegal, mataku juga sepet.", expression: "pain" },
      { speaker: "Livia", text: "Belum lagi nyocokin jadwal fitting baju. Aku takut gaunnya nanti nggak cocok sama badanku...", expression: "sad",
        choices: [
          { text: "Kamu pasti lelah, sini aku pijat pundakmu.", nextIndex: 11 },
          { text: "Nggak usah khawatir, kamu pakai karung goni aja tetap cantik kok.", nextIndex: 12 },
          { text: "Kamu pasti bakal jadi pengantin paling cantik di dunia.", nextIndex: 13 }
        ]
      },
      { speaker: "Livia", text: "Mmm... makasih. Tanganmu selalu tahu titik yang bikin pegalku hilang.", expression: "happy", nextIndex: 14 },
      { speaker: "Livia", text: "E-enak aja! Masa hari paling bersejarah disuruh pakai karung goni!", expression: "angry", nextIndex: 14 },
      { speaker: "Livia", text: "D-dunia?! L-lebay banget sih! Tapi... makasih...", expression: "blushing", nextIndex: 14 },
      { speaker: "Narator", text: "Livia perlahan merangkak mendekatimu, lalu menyenderkan kepalanya dengan manja ke bahumu.", expression: "normal" },
      { speaker: "Livia", text: "Eh... ini cuma perasaan aku aja, atau waktu emang kerasa cepat banget?", expression: "normal" },
      { speaker: "Livia", text: "Rasanya baru kemarin aku marah-marah gara-gara kamarku berisik waktu kamu pindahan.", expression: "happy" },
      { speaker: "Livia", text: "Dan sekarang... kita lagi milih menu katering buat resepsi pernikahan kita sendiri.", expression: "blushing" },
      { speaker: "Narator", text: "Kamu tersenyum dan mengelus rambutnya perlahan.", expression: "normal" },
      { speaker: "Livia", text: "Makasih ya, kamu udah mau nerima aku apa adanya. Bertahan sama semua kekurangan dan sifat jelekku.", expression: "clingy" },
      { speaker: "Livia", text: "Aku beneran nggak sabar nunggu hari H-nya tiba. Nanti kita tinggal serumah beneran... tidur di kasur yang sama...", expression: "blushing" },
      { speaker: "Narator", text: "Wajah Livia perlahan memerah saat menyadari arah omongannya sendiri.", expression: "normal" },
      { speaker: "Livia", text: "E-ekhem! M-maksudku, ya intinya begitu lah! P-pokoknya jangan mikir yang aneh-aneh buat malam pertama kita nanti!", expression: "blushing",
        choices: [
          { text: "Siapa juga yang mikir aneh-aneh? Kamu tuh yang otaknya ngeres.", nextIndex: 23 },
          { text: "Waduh, padahal aku udah nyiapin mental buat itu.", nextIndex: 24 },
          { text: "Tenang aja, aku bakal bersikap sangat lembut padamu.", nextIndex: 25 }
        ]
      },
      { speaker: "Livia", text: "A-aku nggak ngeres! Cuma mengingatkan aja biar kamu nggak macem-macem!", expression: "angry", nextIndex: 26 },
      { speaker: "Livia", text: "M-mental apa?! B-belum juga sah udah mikir ke sana! Dasar mesum!", expression: "scared", nextIndex: 26 },
      { speaker: "Livia", text: "L-lembut apanya?! K-kata-katamu malah bikin kedengeran makin mencurigakan tau!", expression: "blushing", nextIndex: 26 },
      { speaker: "Narator", text: "Melihat Livia yang salah tingkah selalu berhasil membuatmu tertawa lepas.", expression: "normal" },
      { speaker: "Livia", text: "Uuugh... nyebelin! Yaudah, bantuin aku milih menu ini aja biar cepet selesai!", expression: "angry" },
      { speaker: "Narator", text: "Kamu pun membantunya menyelesaikan daftar panjang persiapan resepsi tersebut.", expression: "normal" },
      { speaker: "Narator", text: "Meskipun sangat melelahkan, kamu menyadari bahwa perjalanan ini bukanlah akhir, melainkan awal dari cerita baru kalian yang sesungguhnya.", expression: "normal" }
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
      { speaker: "Narator", text: "Suara alunan organ menggema di seluruh penjuru kapel. Cahaya matahari pagi menembus kaca patri, menciptakan pendaran warna-warni yang indah di altar.", expression: "normal" },
      { speaker: "Narator", text: "Kamu berdiri dengan setelan jas rapi, jantungmu berdebar kencang. Hari yang ditunggu-tunggu akhirnya tiba.", expression: "normal" },
      { speaker: "Narator", text: "Tiba-tiba, lonceng gereja berdentang, dan pintu utama kapel terbuka lebar.", expression: "normal" },
      { speaker: "Narator", text: "Livia berjalan perlahan menyusuri lorong. Gaun pengantin putih bersih membalut tubuhnya dengan sempurna, membuat semua mata terpana.", expression: "normal" },
      { speaker: "Narator", text: "Di sebelahnya, Ibu Laura menggandeng tangannya sambil sesekali menyeka air mata haru.", expression: "normal" },
      { speaker: "Laura", text: "Tolong jaga putri kesayanganku ya. Ibu serahkan dia padamu sepenuhnya.", expression: "normal" },
      { speaker: "Narator", text: "Kamu mengangguk mantap. Ibu Laura tersenyum, melepaskan genggamannya, dan membiarkan Livia melangkah mendekatimu.", expression: "normal" },
      { speaker: "Livia", text: "B-bagaimana? A-aku kelihatan aneh ya pakai gaun semahal dan semewah ini?", expression: "blushing",
        choices: [
          { text: "Kamu adalah pengantin paling cantik dan sempurna di mataku.", nextIndex: 8 },
          { text: "Lumayan, sayangnya orangnya tetep aja galak seperti biasa.", nextIndex: 9 },
          { text: "Kamu terlihat sangat menggoda. Aku jadi ingin acaranya cepat selesai.", nextIndex: 10 }
        ]
      },
      { speaker: "Livia", text: "Makasih... Kamu juga... terlihat sangat tampan hari ini. Sampai bikin aku deg-degan...", expression: "blushing", nextIndex: 11 },
      { speaker: "Livia", text: "Dih! Di hari pernikahan kita kamu masih aja ngajak berantem?! Awas aja nanti malam ya!", expression: "angry", nextIndex: 11 },
      { speaker: "Livia", text: "M-mesum! Jaga ucapanmu, ini di depan altar suci tau! Malu didenger tamu!", expression: "scared", nextIndex: 11 },
      { speaker: "Narator", text: "Sang pendeta berdehem pelan, mengembalikan fokus kalian pada upacara sakral yang akan segera dimulai.", expression: "normal" },
      { speaker: "Narator", text: "Tiba saatnya mengucap janji suci. Livia menatap matamu dalam-dalam, suaranya sedikit bergetar karena gugup dan terharu.", expression: "normal" },
      { speaker: "Livia", text: "Aku... yang awalnya hanya seorang gadis penakut yang mengurung diri di kamar sempit...", expression: "crying" },
      { speaker: "Livia", text: "Bersyukur karena Tuhan mengirimkan seseorang sepertimu ke dalam hidupku.", expression: "crying" },
      { speaker: "Livia", text: "Kamu memberiku keberanian untuk keluar dari zona nyamanku, untuk bermimpi, dan... untuk mencintai.", expression: "happy" },
      { speaker: "Livia", text: "Aku berjanji, mulai detik ini, aku akan selalu ada di sisimu. Di saat sehat maupun sakit, di saat suka maupun duka...", expression: "happy" },
      { speaker: "Narator", text: "Air matanya menetes, namun senyumnya memancarkan kebahagiaan murni. Kini giliranmu untuk mengucapkan janji (Ucapkan di dalam hati).", expression: "normal",
        choices: [
          { text: "[Janji Penuh Cinta] Aku akan selalu melindungimu dan mencintaimu selamanya.", nextIndex: 18 },
          { text: "[Janji Kocak] Aku berjanji akan sabar menghadapi ngambekmu setiap hari.", nextIndex: 19 },
          { text: "[Janji Tegas] Aku akan jadi kepala keluarga yang tak akan pernah mengecewakanmu.", nextIndex: 20 }
        ]
      },
      { speaker: "Livia", text: "Hiks... bodoh... kamu bikin make-up ku luntur...", expression: "crying", nextIndex: 21 },
      { speaker: "Livia", text: "Pfft... janji macam apa itu?! Tapi... makasih karena udah selalu sabar...", expression: "happy", nextIndex: 21 },
      { speaker: "Livia", text: "Aku pegang janjimu. Jangan sampai kamu mengingkarinya ya, Suamiku.", expression: "blushing", nextIndex: 21 },
      { speaker: "Narator", text: "Setelah saling menyematkan cincin, sang pendeta akhirnya menutup upacara dengan kalimat pamungkas.", expression: "normal" },
      { speaker: "Pendeta", text: "Sekarang, kalian berdua telah resmi menjadi sepasang suami istri. Pengantin pria, dipersilakan untuk mencium pengantin wanita.", expression: "normal" },
      { speaker: "Livia", text: "E-eh?! S-sekarang?! T-tapi kan di sini banyak orang...! Ibu, temen-temen kos, semuanya ngeliatin!", expression: "scared",
        choices: [
          { text: "Cium keningnya dengan penuh kelembutan.", nextIndex: 24 },
          { text: "Cium bibirnya perlahan dengan penuh perasaan.", nextIndex: 25 },
          { text: "Tarik pinggangnya dan berikan ciuman romantis yang dramatis (Dip Kiss).", nextIndex: 26 }
        ]
      },
      { speaker: "Livia", text: "Mmm... syukurlah, kamu pengertian. Jantungku bisa meledak kalau lebih dari ini...", expression: "blushing", nextIndex: 27 },
      { speaker: "Livia", text: "Nnnm... bodoh... padahal malu banget... tapi rasanya hangat...", expression: "blushing", nextIndex: 27 },
      { speaker: "Livia", text: "Kyaa! K-kamu ngapain narik-narik! Nnnmh--! I-ini terlalu ekstrem untuk ditonton publik bodoh!", expression: "scared", nextIndex: 27 },
      { speaker: "Narator", text: "Riuh tepuk tangan dan sorakan meriah seketika memenuhi kapel. Bunga-bunga ditaburkan ke arah kalian saat kalian berjalan keluar altar.", expression: "normal" },
      { speaker: "Livia", text: "Akhirnya selesai juga... kakiku sampai pegal tahu, pakai hak tinggi begini.", expression: "pain" },
      { speaker: "Narator", text: "Namun, seburuk apapun ia mengeluh, senyum tak pernah lepas dari wajahnya.", expression: "normal" },
      { speaker: "Livia", text: "Hei... mulai detik ini, panggil aku istrimu ya. Jangan berani-berani lirik perempuan lain!", expression: "clingy" },
      { speaker: "Livia", text: "Karena sekarang, kamu seutuhnya adalah milikku. I love you, Suamiku.", expression: "happy" },
      { speaker: "Narator", text: "Babak baru dalam hidup kalian sebagai keluarga baru saja dimulai.", expression: "normal" }
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
      // Bg 12.1: Dalam mobil/Perjalanan menuju gunung (Pagi)
      { speaker: "Narator", text: "Mobil melaju perlahan menyusuri jalan berkelok di lereng pegunungan. Pepohonan bambu yang rindang mengapit jalan masuk menuju kawasan kuil keluargamu.", expression: "normal-8", "bg": "12.1" },
      { speaker: "Livia", text: "Udaranya makin dingin ya... untung aku pakai trench coat ini. Kelihatannya pantes kan buat ketemu keluargamu?", expression: "blushing-8", "bg": "12.1" },
      { speaker: "Livia", text: "Aku jujur deg-degan banget... Kuil keluargamu itu terkenal sakral kan? Nanti kalau aku salah tingkah gimana?", expression: "scared-8", "bg": "12.1",
        choices: [
          { text: "Tenang saja, mereka pasti menyukaimu.", nextIndex: 3 },
          { text: "Pegang tanganku, aku akan selalu di sampingmu.", nextIndex: 4 },
          { text: "Jangan bertingkah aneh-aneh seperti biasa ya.", nextIndex: 5 }
        ]
      },
      { speaker: "Livia", text: "Semoga saja ya... aku nggak mau bikin kamu malu di depan keluargamu.", expression: "sad-8", "bg": "12.1", nextIndex: 6 },
      { speaker: "Livia", text: "Iya... makasih ya. Tanganmu selalu berhasil bikin aku merasa aman.", expression: "happy-8", "bg": "12.1", nextIndex: 6 },
      { speaker: "Livia", text: "Iiih! Aku bisa anggun kok kalau lagi mode serius!", expression: "angry-8", "bg": "12.1", nextIndex: 6 },
      
      // Bg 12.2: Gerbang Torii dan Tangga Batu
      { speaker: "Narator", text: "Mobil berhenti di pelataran parkir bawah. Di hadapan kalian, menjulang Gerbang Torii raksasa berwarna merah pudar, dijaga oleh patung komainu kuno.", expression: "normal-8", "bg": "12.2" },
      { speaker: "Livia", text: "Wah... g-gede banget... Ini semua area keluarga kamu?", expression: "scared-8", "bg": "12.2" },
      { speaker: "Narator", text: "Kalian menapaki ratusan anak tangga batu. Livia tampak terengah-engah namun berusaha menutupi kelelahannya.", expression: "normal-8", "bg": "12.2" },
      { speaker: "Livia", text: "Hah... hah... aku kuat kok... demi ketemu Ibu mertua... hah...", expression: "pain-8", "bg": "12.2" },
      
      // Bg 12.3: Pelataran Kuil / Bertemu Ibu
      { speaker: "Narator", text: "Begitu sampai di pelataran utama, aroma dupa yang menenangkan seketika menyambut kalian.", expression: "normal", "bg": "12.3" },
      { speaker: "Narator", text: "Di pendopo utama, seorang wanita paruh baya berbalut kimono formal menatap tajam ke arah kalian. Itu ibumu.", expression: "normal", "bg": "12.3" },
      { speaker: "Ayame", text: "Akhirnya kamu pulang. Dan... membawa tamu yang sangat berharga rupanya.", expression: "normal", "bg": "12.3" },
      { speaker: "Livia", text: "S-selamat pagi, Nyonya... eh, M-maksud saya... I-Ibu... S-saya Livia...", expression: "scared-8", "bg": "12.3" },
      { speaker: "Narator", text: "Livia membungkuk begitu dalam hingga hampir kehilangan keseimbangan. Ibumu hanya diam menatapnya dari ujung rambut hingga ujung kaki.", expression: "normal", "bg": "12.3" },
      { speaker: "Ayame", text: "Trench coat yang elegan. Pemilihan pakaian yang sopan untuk mengunjungi kuil di musim sedingin ini. Pilihan bagus.", expression: "normal", "bg": "12.3" },
      { speaker: "Livia", text: "T-terima kasih, Ibu...", expression: "blushing-8", "bg": "12.3" },
      { speaker: "Ayame", text: "Jangan terlalu kaku. Masuklah, ayahmu sudah menunggu di ruang teh. Dia ingin melihat wanita yang berhasil menaklukkan hati putra kesayangannya.", expression: "normal", "bg": "12.3" },
      
      // Bg 12.4: Ruang Teh / Bertemu Ayah
      { speaker: "Narator", text: "Kalian dipersilakan masuk ke ruang tatami yang hangat. Di tengah ruangan, seorang pria dengan jubah pendeta Shinto (Kannushi) sedang menyeduh teh matcha.", expression: "normal", "bg": "12.4" },
      { speaker: "Rikuto", text: "Duduklah. Tehnya baru saja siap.", expression: "normal", "bg": "12.4" },
      { speaker: "Livia", text: "P-permisi... terima kasih banyak...", expression: "scared-8", "bg": "12.4" },
      { speaker: "Narator", text: "Ayahmu menyodorkan secangkir teh pada Livia. Tatapannya sangat tenang, namun memancarkan wibawa yang luar biasa.", expression: "normal", "bg": "12.4" },
      { speaker: "Rikuto", text: "Jadi, Livia-san... Apakah putraku ini sering merepotkanmu di sana?", expression: "normal", "bg": "12.4",
        choices: [
          { text: "Tentu saja tidak, Yah.", nextIndex: 23 },
          { text: "Biar Livia yang menjawabnya, Yah.", nextIndex: 25 },
          { text: "Sedikit, tapi aku selalu memperlakukannya dengan baik.", nextIndex: 27 }
        ]
      },
      { speaker: "Rikuto", text: "Hahaha, aku tidak bertanya padamu, Nak.", expression: "normal", "bg": "12.4", nextIndex: 24 },
      { speaker: "Livia", text: "D-dia sangat baik! Dia selalu menjagaku dan membantuku saat aku kesulitan...", expression: "blushing-8", "bg": "12.4", nextIndex: 29 },
      
      { speaker: "Livia", text: "Ah... b-banyak hal yang kami lalui bersama... tapi dia selalu bisa kuandalkan.", expression: "blushing-8", "bg": "12.4", nextIndex: 26 },
      { speaker: "Rikuto", text: "Begitu ya. Syukurlah kalau dia bisa menjadi pilar yang kuat untukmu.", expression: "normal", "bg": "12.4", nextIndex: 29 },
      
      { speaker: "Rikuto", text: "Kepercayaan dirimu cukup tinggi juga. Bagaimana menurutmu, Livia?", expression: "normal", "bg": "12.4", nextIndex: 28 },
      { speaker: "Livia", text: "Iya, dia memang sangat perhatian. Kadang terlalu perhatian sampai bikin aku deg-degan...", expression: "blushing-8", "bg": "12.4", nextIndex: 29 },
      
      { speaker: "Narator", text: "Mendengar jawaban Livia, wajah tegas ayahmu perlahan melembut.", expression: "normal", "bg": "12.4" },
      { speaker: "Rikuto", text: "Gadis yang jujur dan hangat. Kau memilih pasangan yang tepat. Keluarga ini akan selalu menyambutmu, Livia.", expression: "normal", "bg": "12.4" },
      { speaker: "Livia", text: "T-terima kasih banyak, Ayah... Aku akan berusaha menjadi pendamping yang baik untuknya.", expression: "crying-8", "bg": "12.4" },
      
      // Bg 12.5: Kuil Utama (Honden)
      { speaker: "Narator", text: "Setelah berbincang hangat, ayahmu meminta kalian berdua untuk pergi ke Honden (aula utama) guna memberikan penghormatan kepada leluhur.", expression: "normal", "bg": "12.5" },
      { speaker: "Narator", text: "Di depan altar yang megah, kalian membunyikan lonceng, membungkuk dua kali, menepuk tangan dua kali, dan berdoa dalam diam.", expression: "normal", "bg": "12.5" },
      { speaker: "Livia", text: "...", expression: "serious-8", "bg": "12.5" },
      { speaker: "Narator", text: "Kamu melirik Livia yang sedang menutup matanya erat-erat. Wajahnya tampak begitu tulus dan damai.", expression: "normal", "bg": "12.5" },
      { speaker: "Livia", text: "Fiuh... sudah selesai.", expression: "happy-8", "bg": "12.5" },
      { speaker: "Narator", text: "Kamu tersenyum dan bertanya doa apa yang ia panjatkan barusan.", expression: "normal", "bg": "12.5" },
      { speaker: "Livia", text: "Rahasia dong! Kalau dikasih tau nanti doanya nggak terkabul.", expression: "silly-8", "bg": "12.5" },
      { speaker: "Livia", text: "Tapi yang pasti... doanya menyangkut masa depan kita berdua.", expression: "blushing-8", "bg": "12.5" },
      
      // Bg 12.6: Halaman Belakang / Sore Hari
      { speaker: "Narator", text: "Sore harinya, kalian berjalan-jalan di taman belakang kuil. Sinar matahari jingga menembus dedaunan musim gugur, menciptakan pemandangan yang magis.", expression: "normal", "bg": "12.6" },
      { speaker: "Livia", text: "Keluargamu... ternyata nggak seseram yang kubayangkan. Ibumu sangat perhatian, dan ayahmu juga bijaksana.", expression: "happy-8", "bg": "12.6" },
      { speaker: "Livia", text: "Rasanya aku semakin yakin kalau aku nggak salah memilihmu.", expression: "clingy-8", "bg": "12.6" },
      { speaker: "Narator", text: "Livia memeluk lenganmu erat, menyandarkan kepalanya di bahumu sambil memandangi matahari terbenam.", expression: "normal", "bg": "12.6" },
      { speaker: "Livia", text: "Terima kasih sudah membawaku ke sini... ke tempat di mana kamu tumbuh dan belajar menjadi pria sehebat ini.", expression: "happy-8", "bg": "12.6" },
      { speaker: "Narator", text: "Di bawah langit senja dan naungan kuil leluhur, ikatan kalian kini telah direstui sepenuhnya oleh masa lalu dan masa depan.", expression: "normal", "bg": "12.6" }
    ]
  },
  {
    id: 13,
    title: "Pengurus Kuil",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Menyelesaikan Kunjungan Kuil", met: data.accountDays >= 70 }
    ],
    content: [
      // 0
      { speaker: "Narator", text: "Malam pergantian tahun tiba. Udara musim dingin yang menusuk tulang sama sekali tak menyurutkan lautan manusia yang memadati kuil.", expression: "normal", "bg": "13.1" },
      { speaker: "Livia", text: "Gimana? P-pakaian ini... nggak aneh kan di aku?", expression: "blushing-13", "bg": "13.1",
        choices: [
          { text: "Sangat cantik, seperti bidadari kuil.", nextIndex: 2 },
          { text: "Sedikit kebesaran, tapi menggemaskan.", nextIndex: 4 },
          { text: "Terlihat profesional. Ayo mulai bekerja!", nextIndex: 6 }
        ]
      },
      // 2
      { speaker: "Livia", text: "B-bidadari?! Jangan berlebihan ah, nanti aku besar kepala lho...", expression: "blushing-13", "bg": "13.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.1", nextIndex: 8 },
      // 4
      { speaker: "Livia", text: "Ugh, ini ukuran terkecil yang ibumu temukan! Jangan diledek dong...", expression: "angry-13", "bg": "13.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.1", nextIndex: 8 },
      // 6
      { speaker: "Livia", text: "Wah, bos kita galak banget! Siap laksanakan, Komandan!", expression: "silly-13", "bg": "13.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.1", nextIndex: 8 },
      // 8
      { speaker: "Narator", text: "Setelah merapikan chihaya putih dan hakama merahnya, kalian berjalan menuju stan Omamori di tengah hiruk-pikuk Hatsumode.", expression: "normal", "bg": "13.1" },
      { speaker: "Livia", text: "S-selamat datang! Jimat keselamatan, kesuksesan, dan jodoh ada di sebelah sini!", expression: "happy-13", "bg": "13.2" },
      // 10
      { speaker: "Livia", text: "Jimat untuk ujian masuk Universitas? Ada! Yang ini paling ampuh!", expression: "happy-13", "bg": "13.2" },
      { speaker: "Narator", text: "Livia beradaptasi dengan sangat cepat. Senyum ramahnya mengundang kerumunan tak henti di stan kalian.", expression: "normal", "bg": "13.2" },
      { speaker: "Narator", text: "Namun tak lama, sekelompok gadis remaja menghampiri stan sambil berbisik-bisik dan melirikmu dengan genit.", expression: "normal", "bg": "13.2" },
      { speaker: "Livia", text: "Eh? Ada yang bisa saya bantu, Kak?", expression: "scared-13", "bg": "13.2" },
      { speaker: "Narator", text: "Salah satu gadis itu menyenggol temannya lalu bertanya kepadamu, 'Kakak pengurus kuil ganteng banget, sendirian aja kah? Mau tukeran kontak?'", expression: "normal", "bg": "13.2",
        choices: [
          { text: "Lirik Livia yang mulai cemberut.", nextIndex: 15 },
          { text: "Tolak dengan senyum halus.", nextIndex: 17 },
          { text: "Tarik tangan Livia dan pamerkan cincin.", nextIndex: 19 }
        ]
      },
      // 15
      { speaker: "Livia", text: "E-ehem! Maaf ya Dek, 'Kakak ganteng' ini jimat jodohnya udah sold out alias udah ada yang punya!", expression: "angry-13", "bg": "13.2", nextIndex: 21 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.2", nextIndex: 21 },
      // 17
      { speaker: "Narator", text: "Kamu menolak dengan halus, beralasan bahwa kamu sedang sangat sibuk bekerja menjaga kuil bersama istrimu.", expression: "normal", "bg": "13.2", nextIndex: 21 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.2", nextIndex: 21 },
      // 19
      { speaker: "Narator", text: "Kamu menarik tangan Livia, menunjukkan cincin pernikahan kalian yang melingkar serasi di jari manis.", expression: "normal", "bg": "13.2", nextIndex: 21 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.2", nextIndex: 21 },
      // 21
      { speaker: "Narator", text: "Melihat hal itu, para gadis remaja tersebut langsung salah tingkah, meminta maaf, lalu berlari pergi.", expression: "normal", "bg": "13.2" },
      { speaker: "Livia", text: "Huuu... untung aja tadi ada aku. Kalau ngga, pasti kamu udah digoda macem-macem.", expression: "clingy-13", "bg": "13.2" },
      { speaker: "Livia", text: "Tapi... makasih ya. Udah ngebuktiin kalau kamu beneran cuma milikku.", expression: "blushing-13", "bg": "13.2" },
      { speaker: "Narator", text: "Malam terus larut, pengunjung silih berganti. Livia melayani mereka dengan penuh semangat.", expression: "normal", "bg": "13.2" },
      // 25
      { speaker: "Livia", text: "Jimat untuk kelancaran persalinan? Oh, tentu saja! Semoga istri Anda dan bayinya sehat selalu ya, Pak!", expression: "happy-13", "bg": "13.2" },
      { speaker: "Livia", text: "Fiuh... lumayan capek juga ya. Gimana? Aku udah kelihatan kaya penjaga kuil profesional belum?", expression: "happy-13", "bg": "13.2",
        choices: [
          { text: "Sangat profesional dan cekatan.", nextIndex: 27 },
          { text: "Jangan memaksakan diri ya.", nextIndex: 29 },
          { text: "Semangat sampai pagi!", nextIndex: 31 }
        ]
      },
      // 27
      { speaker: "Livia", text: "Hehe, tentu saja! Aku kan harus bantu meringankan beban suamiku tercinta.", expression: "blushing-13", "bg": "13.2", nextIndex: 33 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.2", nextIndex: 33 },
      // 29
      { speaker: "Livia", text: "Tenang aja, energi aku masih full kok! Apalagi kalau kerjanya bareng kamu terus.", expression: "happy-13", "bg": "13.2", nextIndex: 33 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.2", nextIndex: 33 },
      // 31
      { speaker: "Livia", text: "Uwooogh! Pantang menyerah sebelum fajar menyingsing!", expression: "silly-13", "bg": "13.2", nextIndex: 33 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "13.2", nextIndex: 33 },
      // 33
      { speaker: "Narator", text: "Beberapa jam berlalu. Saat pergantian shift, kalian melipir ke ruang istirahat staf yang sepi.", expression: "normal", "bg": "13.3" },
      { speaker: "Livia", text: "Akhirnya bisa duduk juga... kakiku beneran kaya mau copot rasanya.", expression: "scared-13", "bg": "13.3" },
      // 35
      { speaker: "Narator", text: "Tepat saat Livia bersandar di tatami, pintu geser ruangan perlahan terbuka.", expression: "normal", "bg": "13.3" },
      { speaker: "Ayame", text: "Kerja bagus, kalian berdua. Ibu bawakan amazake hangat dan mochi panggang.", expression: "normal", "bg": "13.3" },
      { speaker: "Livia", text: "Ibu! T-terima kasih banyak! Ini pas banget buat ngusir dingin...", expression: "happy-13", "bg": "13.3" },
      { speaker: "Ayame", text: "Awalnya Ibu khawatir kamu akan kewalahan, Livia. Berdiri melayani ribuan orang bukanlah hal yang mudah.", expression: "normal", "bg": "13.3" },
      { speaker: "Ayame", text: "Ternyata kau punya kegigihan yang luar biasa. Ayahnya di Honden pasti bangga mendengarnya.", expression: "normal", "bg": "13.3" },
      // 40
      { speaker: "Livia", text: "A-aku cuma ingin... menjadi menantu yang bisa diandalkan oleh keluarga ini.", expression: "blushing-13", "bg": "13.3" },
      { speaker: "Ayame", text: "Kalian sudah melakukan yang terbaik. Habiskan ini, lalu beristirahatlah. Sisa malam biar ditangani staf lain.", expression: "normal", "bg": "13.3" },
      { speaker: "Livia", text: "Ternyata Ibumu baik banget ya... Aku bener-bener ngerasa diterima utuh di sini.", expression: "happy-13", "bg": "13.3" },
      { speaker: "Narator", text: "Menjelang fajar, kalian melangkah keluar menuju teras belakang kuil yang sangat sunyi.", expression: "normal", "bg": "13.4" },
      { speaker: "Livia", text: "Haaa... lelahnya... tapi ini pengalaman yang nggak akan pernah aku lupain.", expression: "clingy-13", "bg": "13.4" },
      // 45
      { speaker: "Narator", text: "Livia merebahkan kepalanya di bahumu. Hembusan napasnya mengepul putih, melebur dengan embun pagi.", expression: "normal", "bg": "13.4" },
      { speaker: "Livia", text: "Tahun lalu... aku cuma bisa berdoa diam-diam supaya kita bisa terus sama-sama.", expression: "blushing-13", "bg": "13.4" },
      { speaker: "Livia", text: "Sekarang, aku malah jualan jimat asmara buat orang lain. Lucu ya, padahal doaku sendiri udah terkabul dengan sempurna.", expression: "happy-13", "bg": "13.4" },
      { speaker: "Narator", text: "Di ufuk timur, semburat oranye mulai memecah langit. Matahari terbit pertama (Hatsuhinode) menampakkan diri.", expression: "normal", "bg": "13.4" },
      { speaker: "Livia", text: "Wah... cantik banget cahayanya...", expression: "happy-13", "bg": "13.4" },
      // 50
      { speaker: "Narator", text: "Di bawah cahaya keemasan itu, Livia menarik kerah bajumu dan mendaratkan kecupan hangat di pipimu.", expression: "normal", "bg": "13.4" },
      { speaker: "Livia", text: "Selamat tahun baru, Suamiku. Mohon bimbingannya lagi untuk tahun ini, ya.", expression: "blushing-13", "bg": "13.4" },
      { speaker: "Narator", text: "Hatsumode kali ini mengikat janji suci kalian dalam harmoni yang tak akan pernah pudar.", expression: "normal", "bg": "13.4" }
    ]
  },
  {
    id: 14,
    title: "Seporsi Kehangatan",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Menyelesaikan Bab Sebelumnya", met: data.accountDays >= 70 }
    ],
    content: [
      { speaker: "Narator", text: "Siang hari setelah kesibukan panjang Hatsumode. Sinar mentari cerah menembus jendela ruang keluarga kuil.", expression: "normal", "bg": "14.1" },
      { speaker: "Livia", text: "Skak mat! Tuh kan, aku menang lagi! Kamu beneran ngga sengaja ngalah kan?", expression: "angry", "bg": "14.1",
        choices: [
          { text: "Aku kelelahan habis jaga stan semalaman.", nextIndex: 2 },
          { text: "Strategimu memang jauh lebih hebat.", nextIndex: 4 },
          { text: "Belum! Ayo kita tanding ulang!", nextIndex: 6 }
        ]
      },
      { speaker: "Livia", text: "Halah, alasan aja! Padahal tadi malam kan aku juga ikutan begadang lho.", expression: "silly", "bg": "14.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "14.1", nextIndex: 8 },
      { speaker: "Livia", text: "Hehe, tentu saja. Bidak-bidak catur ini sudah sehati denganku dari awal.", expression: "happy", "bg": "14.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "14.1", nextIndex: 8 },
      { speaker: "Livia", text: "Boleh banget! Kali ini aku bakal skak mat kamu dalam waktu kurang dari 10 langkah!", expression: "happy", "bg": "14.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "14.1", nextIndex: 8 },
      { speaker: "Narator", text: "Saat kalian asyik berdebat di depan papan catur, pintu ruang keluarga tiba-tiba bergeser terbuka.", expression: "normal", "bg": "14.1" },
      { speaker: "Ayame", text: "Kalian berdua, maaf mengganggu waktu santai kalian di siang hari ini.", expression: "normal", "bg": "14.1" },
      { speaker: "Livia", text: "Ah, Ibu! Ngga ganggu sama sekali kok. Ada yang bisa dibantu, Bu?", expression: "happy", "bg": "14.1" },
      { speaker: "Ayame", text: "Sebenarnya... Ibu agak khawatir dengan Naomi. Kakak perempuanmu itu tidak pulang semalam.", expression: "normal", "bg": "14.1" },
      { speaker: "Ayame", text: "Tolong kunjungi apartemennya dan bawakan beberapa bekal tahun baru ini. Pastikan dia setidaknya makan dengan benar.", expression: "normal", "bg": "14.1" },
      { speaker: "Ayame", text: "Oh ya, tinggalkan saja mobil kalian di sini. Jalanan menuju pusat kota pasti sangat macet pasca-Hatsumode. Gunakan kereta saja, lebih cepat.", expression: "normal", "bg": "14.1" },
      { speaker: "Livia", text: "Naomi-nee-san? Tentu saja, Ibu! Kami akan segera berangkat ke sana sekarang juga!", expression: "happy", "bg": "14.1" },
      { speaker: "Narator", text: "Mengikuti saran ibumu, kalian meninggalkan mobil di kuil dan menaiki kereta menuju pusat kota tempat Naomi tinggal.", expression: "normal", "bg": "14.2" },
      { speaker: "Livia", text: "Ngomong-ngomong, kakakmu itu orangnya seperti apa? Waktu pernikahan kita, dia cuma datang sebentar lalu buru-buru pergi.", expression: "blushing", "bg": "14.2" },
      { speaker: "Narator", text: "Kamu menjelaskan bahwa Naomi adalah budak korporat yang sangat gila kerja, hingga hampir tidak punya waktu untuk mengurus dirinya sendiri.", expression: "normal", "bg": "14.2" },
      { speaker: "Livia", text: "Hee... kasihan banget. Apalagi ini kan libur tahun baru. Masa iya dia masih kerja keras bagai kuda?", expression: "scared", "bg": "14.2" },
      { speaker: "Narator", text: "Sesampainya di apartemen, kalian berdiri di depan pintu bernomor 302.", expression: "normal", "bg": "14.3" },
      { speaker: "Livia", text: "Aku pencet belnya ya...", expression: "scared", "bg": "14.3" },
      { speaker: "Narator", text: "Ting-tong. Tidak ada jawaban. Livia iseng memutar kenop pintu, dan mengejutkannya, pintu itu tidak dikunci sama sekali.", expression: "normal", "bg": "14.3" },
      { speaker: "Livia", text: "Permisi... Naomi-nee-san...?", expression: "scared", "bg": "14.4" },
      { speaker: "Narator", text: "Begitu masuk, kalian disambut oleh pemandangan yang kacau balau. Tumpukan kertas, cangkir kopi kosong, dan kaleng bir berserakan di mana-mana layaknya kapal pecah.", expression: "normal", "bg": "14.4" },
      { speaker: "Naomi", text: "Nggghhh... 5 menit lagi, Pak Bos... laporannya hampir selesai...", expression: "tired", "bg": "14.4" },
      { speaker: "Narator", text: "Seorang wanita berambut berantakan dengan kemeja kusut tampak tertidur pulas di lantai yang dingin, dengan laptop yang masih menyala redup.", expression: "normal", "bg": "14.4" },
      { speaker: "Livia", text: "Ya ampun! Naomi-nee-san! Kamu ngga apa-apa?!", expression: "scared", "bg": "14.4",
        choices: [
          { text: "Biarkan saja dia tidur di sana.", nextIndex: 27 },
          { text: "Ayo kita pindahkan dia ke kasur.", nextIndex: 29 },
          { text: "Kita rapikan ruangannya pelan-pelan.", nextIndex: 31 }
        ]
      },
      { speaker: "Livia", text: "Jangan gila! Masa kita biarin dia kedinginan tidur di atas tumpukan dokumen begini?!", expression: "angry", "bg": "14.4", nextIndex: 33 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "14.4", nextIndex: 33 },
      { speaker: "Livia", text: "Iya, bantu aku angkat bahunya. Hati-hati jangan sampai dia bangun ya.", expression: "serious", "bg": "14.4", nextIndex: 33 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "14.4", nextIndex: 33 },
      { speaker: "Livia", text: "Boleh juga, mending kita beresin ruangannya dulu sebelum bangunin dia pelan-pelan.", expression: "blushing", "bg": "14.4", nextIndex: 33 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "14.4", nextIndex: 33 },
      { speaker: "Narator", text: "Kalian menghabiskan waktu dua jam untuk membersihkan apartemen yang kacau tersebut dan menghangatkan bekal bawaan dari Ayame.", expression: "normal", "bg": "14.4" },
      { speaker: "Naomi", text: "Eugh... hidungku mencium bau masakan yang wangi... mungkinkah aku sudah masuk surga...?", expression: "tired", "bg": "14.4" },
      { speaker: "Livia", text: "Ah, Naomi-nee-san udah bangun! Selamat tahun baru!", expression: "happy", "bg": "14.4" },
      { speaker: "Naomi", text: "Eh? Livia-chan? Dan adik bodohku? S-sejak kapan kalian ada di dalam apartemenku?!", expression: "surprised", "bg": "14.4" },
      { speaker: "Narator", text: "Naomi langsung panik gelagapan menyadari ruangannya sudah disulap menjadi sangat bersih dan rapi.", expression: "normal", "bg": "14.4" },
      { speaker: "Naomi", text: "Aaaargh! Padahal aku niatnya mau nyelesain sisa kerjaan semalam, malah ketiduran di lantai! Maafkan kakak iparmu yang memalukan ini, Livia-chan!", expression: "crying", "bg": "14.4" },
      { speaker: "Livia", text: "Ngga apa-apa kok, Nee-san. Ibu mertua nyuruh kami bawain bekal tahun baru karena Nee-san ngga pulang dari kemarin.", expression: "happy", "bg": "14.4" },
      { speaker: "Naomi", text: "Ugh... Ibu memang selalu bawel ngomelin aku, tapi... hiks... masakannya memang selalu yang terbaik.", expression: "crying", "bg": "14.4" },
      { speaker: "Narator", text: "Kalian bertiga duduk melingkar di meja kotatsu yang baru saja dibersihkan. Naomi melahap makanan itu dengan linangan air mata haru.", expression: "normal", "bg": "14.4" },
      { speaker: "Naomi", text: "Adikku, kau benar-benar beruntung mendapatkan istri sebaik Livia-chan. Kalau kau berani menyakitinya, aku yang akan memotong gajimu!", expression: "angry", "bg": "14.4" },
      { speaker: "Livia", text: "Ehehe... tenang aja, dia suami yang paling pengertian kok, Nee-san.", expression: "blushing", "bg": "14.4" },
      { speaker: "Naomi", text: "Haaah... ngeliat kalian berdua yang manis dan harmonis begini, aku jadi pengen cepet-cepet nikah juga... tapi ngga ada waktu...", expression: "tired", "bg": "14.4" },
      { speaker: "Livia", text: "Tenang! Nanti aku bantuin cari calon yang pas deh! Asalkan Nee-san janji ngga boleh memforsir diri tidur di lantai lagi ya.", expression: "silly", "bg": "14.4" },
      { speaker: "Naomi", text: "Beneran janji lho ya? Awas kalau calonnya kalah ganteng dari adikku yang bodoh ini!", expression: "surprised", "bg": "14.4" },
      { speaker: "Livia", text: "Hehe, tentu saja! Aku kenal beberapa pengunjung tetap kuil yang ramah dan mapan kok!", expression: "happy", "bg": "14.4" },
      { speaker: "Narator", text: "Naomi tertawa lepas, beban kerja berat yang menumpuk di pundaknya seolah menguap untuk sesaat.", expression: "normal", "bg": "14.4" },
      { speaker: "Naomi", text: "Ngomong-ngomong, aku dengar dari Ibu kalau kalian dalam waktu dekat ini ada rencana pindah dari kost-an ya?", expression: "normal", "bg": "14.4" },
      { speaker: "Livia", text: "Eh? Kok Nee-san udah tau duluan dari kita?", expression: "scared", "bg": "14.4" },
      { speaker: "Naomi", text: "Ibu yang cerita sewaktu meneleponku kemarin. Beliau sangat mendukung kalian berdua untuk hidup mandiri di tempat yang lebih layak dan luas.", expression: "normal", "bg": "14.4" },
      { speaker: "Livia", text: "Wah... Ibu dan Nee-san bener-bener perhatian banget sama keluarga kecil kita...", expression: "blushing", "bg": "14.4" },
      { speaker: "Naomi", text: "Tentu saja! Kita kan sudah jadi satu keluarga. Kalau kalian butuh bantuan tenaga pas pindahan nanti, telepon saja aku ya!", expression: "happy", "bg": "14.4" },
      { speaker: "Narator", text: "Siang itu diakhiri dengan gelak tawa dan obrolan hangat, menambah satu lagi ikatan keluarga yang makin tak terpisahkan.", expression: "normal", "bg": "14.4" }
    ]
  },
  {
    id: 15,
    title: "Pindahan ke Apartemen",
    reqAffection: 100,
    reqLevel: 5,
    getRequirements: (data) => [
      { label: "Menyelesaikan Bab Sebelumnya", met: data.accountDays >= 70 }
    ],
    content: [
      // 0
      { speaker: "Narator", text: "Akhir pekan tiba. Kamar kost yang dulu menjadi tempat awal kisah kalian kini penuh dengan tumpukan kardus barang-barang.", expression: "normal", "bg": "15.1" },
      // 1
      { speaker: "Livia", text: "Huhuhu... melihat kamar ini kosong rasanya agak sedih ya. Banyak banget kenangan kita di sini dari dulu.", expression: "scared", "bg": "15.1",
        choices: [
          { text: "Dari Teman Kost jadi Teman Hidup.", nextIndex: 2 },
          { text: "Kita akan buat kenangan baru yang lebih indah.", nextIndex: 4 },
          { text: "Ingat waktu kamu pertama kali pinjam panci?", nextIndex: 6 }
        ]
      },
      // 2
      { speaker: "Livia", text: "Iih, gombal banget! Tapi... bener juga sih, sekarang kamu udah resmi jadi suamiku.", expression: "blushing", "bg": "15.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.1", nextIndex: 8 },
      // 4
      { speaker: "Livia", text: "Tentu saja! Di apartemen baru nanti, kita ngga perlu sungkan atau takut ketahuan ibu kost lagi.", expression: "happy", "bg": "15.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.1", nextIndex: 8 },
      // 6
      { speaker: "Livia", text: "Aaaah jangan diingetin! Waktu itu aku malu banget tau karena mukaku cemong kena arang!", expression: "angry", "bg": "15.1", nextIndex: 8 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.1", nextIndex: 8 },
      // 8
      { speaker: "Livia", text: "Masih inget nggak waktu pertama kali kamu ngetok pintu kamarku gara-gara lampu lorong mati?", expression: "blushing", "bg": "15.1" },
      { speaker: "Livia", text: "Waktu itu aku kirain kamu cowok aneh yang mau modus, eh taunya malah jadi suamiku sekarang.", expression: "silly", "bg": "15.1" },
      { speaker: "Narator", text: "Kamu tertawa bersama Livia sembari mengunci pintu kamar kost untuk terakhir kalinya.", expression: "normal", "bg": "15.1" },
      { speaker: "Narator", text: "Setelah merekatkan selotip pada kardus terakhir, truk pindahan yang kalian pesan tiba di depan pagar kost.", expression: "normal", "bg": "15.1" },
      { speaker: "Livia", text: "Selamat tinggal, kamar kost kesayangan! Terima kasih sudah mempertemukan dan menyatukan kami!", expression: "happy", "bg": "15.1" },
      // 13
      { speaker: "Narator", text: "Beberapa jam kemudian, kalian berdiri di ruang tamu apartemen baru yang jauh lebih luas, bersih, dan terang.", expression: "normal", "bg": "15.2" },
      { speaker: "Livia", text: "Wahhhh! Luas banget! Kasur kita kalau ditaruh di sini masih sisa banyak tempat buat jalan-jalan!", expression: "happy", "bg": "15.2" },
      { speaker: "Livia", text: "Lihat, jendelanya juga besar banget! Kita bisa lihat pemandangan langit kota dari sini!", expression: "happy", "bg": "15.2" },
      { speaker: "Livia", text: "Di sebelah sana ada dapur bersih yang rapi, terus di sudut sana ada balkon untuk jemur pakaian!", expression: "happy", "bg": "15.2" },
      { speaker: "Narator", text: "Livia berlarian kecil mengelilingi ruangan kosong tersebut dengan mata berbinar-binar penuh kegembiraan.", expression: "normal", "bg": "15.2" },
      // 18
      { speaker: "Livia", text: "Gimana menurutmu? Kita mau tata ruang tengah yang luas ini dengan gaya seperti apa?", expression: "happy", "bg": "15.2",
        choices: [
          { text: "Gaya minimalis modern agar terlihat rapi.", nextIndex: 19 },
          { text: "Gaya tradisional Jepang dengan tatami dan kotatsu.", nextIndex: 21 },
          { text: "Gaya super nyaman yang penuh bantal dan karpet bulu.", nextIndex: 23 }
        ]
      },
      // 19
      { speaker: "Livia", text: "Setuju! Biar gampang dibersihkan kalau nanti kita udah punya anak... e-eh! Maksudku ya gitu deh!", expression: "blushing", "bg": "15.2", nextIndex: 25 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.2", nextIndex: 25 },
      // 21
      { speaker: "Livia", text: "Biar mirip seperti suasana hangat rumah Ibu di kuil ya? Wah, ide bagus tuh!", expression: "happy", "bg": "15.2", nextIndex: 25 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.2", nextIndex: 25 },
      // 23
      { speaker: "Livia", text: "Yeay! Bisa buat guling-gulingan santai bareng kamu sambil nonton film tiap malam minggu!", expression: "silly", "bg": "15.2", nextIndex: 25 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.2", nextIndex: 25 },
      // 25
      { speaker: "Narator", text: "Kalian mulai membuka satu per satu kardus dan menata perabotan bersama. Waktu berlalu dengan cepat tanpa terasa.", expression: "normal", "bg": "15.3" },
      { speaker: "Livia", text: "Aduh... ngangkat sofa barengan ternyata lumayan berat ya. Punggungku sampai bunyi krek tadi.", expression: "tired", "bg": "15.3" },
      { speaker: "Livia", text: "Sini, coba kamu duduk dulu di sofanya. Empuk banget kan?", expression: "happy", "bg": "15.3" },
      { speaker: "Narator", text: "Kamu merebahkan diri di sofa baru, sementara Livia ikut menyandarkan kepalanya di bahumu.", expression: "normal", "bg": "15.3" },
      { speaker: "Livia", text: "Hehe... nyaman banget... rasa capek ngangkat kardus langsung hilang seketika.", expression: "blushing", "bg": "15.3" },
      { speaker: "Livia", text: "Eh, jangan tidur dulu dong! Kita masih harus masang hiasan dinding sama foto pernikahan kita tuh!", expression: "silly", "bg": "15.3" },
      { speaker: "Narator", text: "Kalian berdua tertawa lalu kembali berdiri untuk menggantung bingkai foto pernikahan di dinding ruang tamu.", expression: "normal", "bg": "15.3" },
      { speaker: "Livia", text: "Nah! Sekarang semua orang yang bertamu bakal langsung tahu kalau ini adalah rumah kita berdua!", expression: "happy", "bg": "15.3" },
      { speaker: "Livia", text: "Ngelihat semuanya mulai tersusun rapi begini, rasanya puas dan bahagia banget!", expression: "happy", "bg": "15.3" },
      { speaker: "Narator", text: "Malam pun tiba. Lampu-lampu kota mulai menyala indah di balik jendela apartemen baru kalian.", expression: "normal", "bg": "15.4" },
      // 35
      { speaker: "Livia", text: "Akhirnya beres juga! Perutku udah keruyukan dari tadi. Kita pesan martabak atau makan di luar malam ini?", expression: "silly", "bg": "15.4",
        choices: [
          { text: "Kita masak berdua di dapur baru kita!", nextIndex: 36 },
          { text: "Pesan antar saja, kita sudah terlalu lelah.", nextIndex: 38 },
          { text: "Makan malam romantis di balkon apartemen.", nextIndex: 40 }
        ]
      },
      // 36
      { speaker: "Livia", text: "Ide bagus! Ayo kita tes kompor baru kita dengan masak nasi goreng spesial ala Chef Livia!", expression: "happy", "bg": "15.4", nextIndex: 42 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.4", nextIndex: 42 },
      // 38
      { speaker: "Livia", text: "Hehe, kamu pengertian banget. Aku pesenin martabak telor kesukaan kita sama sate ayam ya!", expression: "happy", "bg": "15.4", nextIndex: 42 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.4", nextIndex: 42 },
      // 40
      { speaker: "Livia", text: "Uwah, romantisnya! Aku ambilin kursi sama lilin dulu ya biar suasana malam kita kaya di restoran bintang lima!", expression: "blushing", "bg": "15.4", nextIndex: 42 },
      { speaker: "Narator", text: "", expression: "normal", "bg": "15.4", nextIndex: 42 },
      // 42
      { speaker: "Narator", text: "Kalian duduk berdampingan menikmati malam pertama di rumah baru dengan hati yang penuh sukacita.", expression: "normal", "bg": "15.4" },
      { speaker: "Livia", text: "Kamu tahu nggak? Dulu waktu awal-awal ngekost, aku sering ngebayangin gimana rasanya punya rumah tangga sendiri.", expression: "blushing", "bg": "15.4" },
      { speaker: "Livia", text: "Ternyata kenyataannya jauh lebih indah dan membahagiakan dari bayanganku... karena ada kamu di sampingku.", expression: "happy", "bg": "15.4" },
      { speaker: "Narator", text: "Livia menggenggam tanganmu erat, menatapmu dengan senyuman yang begitu tulus dan hangat.", expression: "normal", "bg": "15.4" },
      { speaker: "Livia", text: "Terima kasih sudah selalu bersabar dan mencintaiku apa adanya dari hari pertama kita bertemu, ya.", expression: "blushing", "bg": "15.4" },
      { speaker: "Livia", text: "Mari kita isi rumah baru kita ini dengan ribuan tawa, kenangan, dan kebahagiaan baru ya, Suamiku tercinta.", expression: "blushing", "bg": "15.4" },
      { speaker: "Narator", text: "Babak baru dalam kehidupan rumah tangga kalian di apartemen yang hangat ini baru saja dimulai.", expression: "normal", "bg": "15.4" }
    ]
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

    if (!currentScene) {
      if (activeChapter.id === 8 && userStats && !userStats.itemsBrought.includes('chapter_8_completed')) {
        setShowHometownPicker(true);
      } else if (activeChapter.id === 12 && userStats && !userStats.itemsBrought.includes('chapter_12_completed')) {
        setShowBlessingPicker(true);
      } else {
        finishChapter(activeChapter.id);
      }
      return;
    }

    if (currentScene.nextIndex !== undefined) {
      if (currentScene.nextIndex >= scenes.length) {
        if (activeChapter.id === 8 && userStats && !userStats.itemsBrought.includes('chapter_8_completed')) {
          setShowHometownPicker(true);
        } else if (activeChapter.id === 12 && userStats && !userStats.itemsBrought.includes('chapter_12_completed')) {
          setShowBlessingPicker(true);
        } else {
          finishChapter(activeChapter.id);
        }
      } else {
        setSceneIndex(currentScene.nextIndex);
      }
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
    if (!activeChapter) return;
    const scenes = activeChapter.getDynamicContent ? activeChapter.getDynamicContent(userStats!) : activeChapter.content!;
    if (nextIdx >= scenes.length) {
      if (activeChapter.id === 8 && userStats && !userStats.itemsBrought.includes('chapter_8_completed')) {
        setShowHometownPicker(true);
      } else if (activeChapter.id === 12 && userStats && !userStats.itemsBrought.includes('chapter_12_completed')) {
        setShowBlessingPicker(true);
      } else {
        finishChapter(activeChapter.id);
      }
    } else {
      setSceneIndex(nextIdx);
    }
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

  if (isLoading) return <LoadingScreen text="Memuat Cerita..." />;

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative flex justify-center items-center overflow-hidden font-sans select-none">
      
      {activeChapter ? (
        <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-between py-2 md:py-12 landscape:py-2 px-4 md:px-6 animate-[fadeIn_0.3s_ease-out]">
          {/* Chapter Background Image with Smooth Cross-fade */}
          {Array.from(new Set(currentScenes.map(s => s.bg || activeChapter.id))).map((bg) => {
            const isCurrent = (scene?.bg || activeChapter.id) === bg;
            return (
              <img 
                key={bg}
                src={`/bg_story-${bg}.webp`}
                alt="Chapter Background"
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-all duration-[2000ms] ease-in-out ${
                  isCurrent 
                    ? (scene?.speaker === 'Narator' ? "scale-105 blur-[3px] opacity-40" : "scale-100 blur-0 opacity-60")
                    : "scale-105 blur-[5px] opacity-0"
                }`}
                onError={(e) => { e.currentTarget.style.opacity = '0'; }}
              />
            );
          })}
          {/* Vignette Overlay for Readability */}
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-[#fdfbf7]/50 pointer-events-none" />

          <div className="w-full max-w-5xl flex justify-between px-2 md:px-8 z-20 mt-8 md:mt-0">
            <span className="font-display font-bold text-sm md:text-base text-[#ff758c] bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-[0_5px_15px_rgba(255,117,140,0.15)] border border-pink-50">
              {activeChapter.title}
            </span>
            <button onClick={() => setActiveChapter(null)} className="text-gray-400 hover:text-[#ff758c] text-sm md:text-base font-bold bg-white px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              Tutup X
            </button>
          </div>
          
          <div className="flex-1 w-full max-w-4xl grid grid-cols-1 grid-rows-1 justify-items-center items-end z-10 min-h-[40vh] md:min-h-0">
            {/* Livia */}
            <div 
              className="col-start-1 row-start-1 h-[55vh] md:h-[60vh] landscape:h-[70vh] aspect-[2/3] drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)] animate-[float_4s_ease-in-out_infinite]"
              style={{ opacity: (scene?.speaker === 'Livia' && !scene?.hideSprite) ? 1 : 0, pointerEvents: (scene?.speaker === 'Livia' && !scene?.hideSprite) ? 'auto' : 'none' }}
            >
              <LiviaSprite 
                expression={scene?.speaker === 'Livia' ? scene.expression : 'normal'} 
                variant={activeChapter.id <= 15 ? 'story' : 'home'}
                chapterId={activeChapter.id}
                className="h-full w-full max-w-[600px]" 
                imgClassName="object-contain object-bottom scale-[1.5] md:scale-[1.75] translate-y-[25%] md:translate-y-[35%]"
              />
            </div>
            
            {/* Laura */}
            <div 
              className="col-start-1 row-start-1 h-[55vh] md:h-[60vh] landscape:h-[70vh] aspect-[2/3] drop-shadow-[0_20px_40px_rgba(150,150,200,0.3)]"
              style={{ opacity: (scene?.speaker === 'Laura' && !scene?.hideSprite) ? 1 : 0, pointerEvents: (scene?.speaker === 'Laura' && !scene?.hideSprite) ? 'auto' : 'none' }}
            >
              <div className="relative flex items-end justify-center h-full w-full max-w-[600px] animate-[float_3s_ease-in-out_infinite]">
                <style>{`
                  @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                  }
                `}</style>
                <img 
                  src={`/laura/story-bab/${scene?.speaker === 'Laura' ? scene.expression.replace(/-[0-9]+$/, '') : 'normal'}.webp`}
                  alt="Laura"
                  className="absolute inset-0 w-full h-full object-contain object-bottom origin-bottom mx-auto scale-[1.75] md:scale-[1.95] translate-y-[40%] md:translate-y-[50%] transition-all duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('normal.webp')) {
                      target.src = '/laura/story-bab/normal.webp';
                    }
                  }}
                />
              </div>
            </div>

            {/* Enji */}
            <div 
              className="col-start-1 row-start-1 h-[55vh] md:h-[60vh] landscape:h-[70vh] aspect-[2/3] drop-shadow-[0_20px_40px_rgba(100,120,150,0.3)]"
              style={{ opacity: (scene?.speaker === 'Enji' && !scene?.hideSprite) ? 1 : 0, pointerEvents: (scene?.speaker === 'Enji' && !scene?.hideSprite) ? 'auto' : 'none' }}
            >
              <div className="relative flex items-end justify-center h-full w-full max-w-[600px] animate-[float_3s_ease-in-out_infinite]">
                <style>{`
                  @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                  }
                `}</style>
                <img 
                  src={`/enji/${scene?.speaker === 'Enji' ? scene.expression.replace(/-[0-9]+$/, '') : 'normal'}.webp`}
                  alt="Enji"
                  className="absolute inset-0 w-full h-full object-contain object-bottom scale-[1.75] md:scale-[1.95] translate-y-[8%] md:translate-y-[11%] transition-all duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('normal.webp')) {
                      target.src = '/enji/normal.webp';
                    }
                  }}
                />
              </div>
            </div>

            {/* Ayame */}
            <div 
              className="col-start-1 row-start-1 absolute inset-0 w-full h-full z-10 animate-[float_3s_ease-in-out_infinite]"
              style={{ opacity: (scene?.speaker === 'Ayame' && !scene?.hideSprite) ? 1 : 0, pointerEvents: (scene?.speaker === 'Ayame' && !scene?.hideSprite) ? 'auto' : 'none' }}
            >
              <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-10px); }
                }
              `}</style>
              <img 
                src={`/ayame/${scene?.speaker === 'Ayame' ? scene.expression.replace(/-[0-9]+$/, '') : 'normal'}.webp`}
                alt="Ayame"
                className="w-full h-full object-cover md:object-contain scale-[1.55] md:scale-[1.65] translate-y-[25%] md:translate-y-[30%] transition-all duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('normal.webp')) {
                    target.src = '/ayame/normal.webp';
                  }
                }}
              />
            </div>

            {/* Rikuto */}
            <div 
              className="col-start-1 row-start-1 absolute inset-0 w-full h-full z-10 animate-[float_3s_ease-in-out_infinite]"
              style={{ opacity: (scene?.speaker === 'Rikuto' && !scene?.hideSprite) ? 1 : 0, pointerEvents: (scene?.speaker === 'Rikuto' && !scene?.hideSprite) ? 'auto' : 'none' }}
            >
              <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-10px); }
                }
              `}</style>
              <img 
                src={`/ayame/rikuto.webp`}
                alt="Rikuto"
                className="w-full h-full object-cover md:object-contain scale-[1.55] md:scale-[1.65] translate-y-[25%] md:translate-y-[30%] transition-all duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('rikuto.webp')) {
                    target.src = '/ayame/rikuto.webp';
                  }
                }}
              />
            </div>
            {/* Naomi */}
            <div 
              className="col-start-1 row-start-1 absolute inset-0 w-full h-full z-10 animate-[float_3s_ease-in-out_infinite]"
              style={{ opacity: (scene?.speaker === 'Naomi' && !scene?.hideSprite) ? 1 : 0, pointerEvents: (scene?.speaker === 'Naomi' && !scene?.hideSprite) ? 'auto' : 'none' }}
            >
              <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-10px); }
                }
              `}</style>
              <img 
                src={`/naomi/${scene?.speaker === 'Naomi' ? scene.expression.replace(/-[0-9]+$/, '') : 'normal'}.webp`}
                alt="Naomi"
                className="w-full h-full object-cover md:object-contain scale-[1.55] md:scale-[1.65] translate-y-[25%] md:translate-y-[30%] transition-all duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('normal.webp')) {
                    target.src = '/naomi/normal.webp';
                  }
                }}
              />
            </div>
          </div>
          
          <div className="w-full max-w-4xl z-20 drop-shadow-2xl relative flex flex-col items-center">
            {scene?.choices && (
              <div className="absolute bottom-[100%] w-[90%] md:w-full flex flex-col items-center gap-1.5 md:gap-3 landscape:gap-1.5 mb-2 md:mb-6 landscape:mb-2 animate-[fadeIn_0.4s_ease-out_forwards]">
                {scene.choices.map((choice, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChoice(choice.nextIndex)}
                    className="w-full max-w-lg bg-white/95 backdrop-blur-md border-2 border-pink-100 py-2.5 md:py-4 landscape:py-2 px-4 md:px-6 rounded-2xl md:rounded-[1.5rem] shadow-[0_10px_25px_rgba(255,117,140,0.15)] text-[#5c4d47] font-bold font-display hover:border-[#ff758c] hover:text-[#ff758c] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(255,117,140,0.2)] transition-all duration-300 text-center text-[13px] md:text-lg active:scale-95"
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
              src={`/livia/story page/${(userStats?.activeOutfit || 'default').replace(/^outfit_/, '').replace(/_/g, '-').replace(/^school$/, 'uniform')}.webp`} 
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
