'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Clock, BookOpen, Briefcase, Gift, MapPin, Wallet, Shirt, Menu, X, Heart, Moon, Utensils, Battery, Droplet, Sprout, Radio, Settings, Camera, Package, Calendar, Tv, Smile, Zap, Shield } from 'lucide-react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import AffectionBar from '@/components/livia/AffectionBar';
import { LiviaExpression } from '@/lib/gemini';
import { getAffectionLevel } from '@/lib/livia/affection';
import { ITEMS } from '@/lib/livia/items';
import { recordQuestAction } from '@/lib/livia/quests';
import ApiGuideModal from '@/components/guide/ApiGuideModal';
import { playSfx } from '@/lib/sfx';
import { preloadLiviaSprites } from '@/lib/preloader';
import DailyStampModal from '@/components/daily/DailyStampModal';
import { unlockAchievement } from '@/lib/achievements';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface HomeClientProps {
  initialAffection: number;
  userName: string;
  initialItemsBrought: string[];
  initialOutfit: string;
}

function calculateCycleDay(anchorString: string): number {
  if (!anchorString) return 1;
  const anchorDate = new Date(anchorString);
  anchorDate.setHours(0, 0, 0, 0);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((nowDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
  return (daysDiff % 28 + 28) % 28 + 1; // 1 to 28
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getGreeting(affection: number, itemsBrought: string[], stats: {hunger: number, energy: number, hydration: number, cyclePhase: string}, userName: string, weather: any): { text: string; expression: LiviaExpression; isInvitingOut?: boolean; invitedPlace?: string } {
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

export default function HomeClient({ initialAffection, userName, initialItemsBrought, initialOutfit }: HomeClientProps) {
  const { dict, language } = useLanguage();
  const [sessionTime, setSessionTime] = useState(0);
  const [affection, setAffection] = useState(initialAffection);
  const [itemsBrought] = useState(initialItemsBrought);
  const [outfit, setOutfit] = useState(initialOutfit);
  const [money, setMoney] = useState(0);

  useEffect(() => {
    if (affection >= 50) unlockAchievement('affection_50');
    if (affection >= 80) unlockAchievement('affection_80');
    if (money >= 1000) unlockAchievement('rich_1000');
  }, [affection, money]);

  const [greetingData, setGreetingData] = useState<{text: string, expression: LiviaExpression, isInvitingOut?: boolean, invitedPlace?: string}>({
    text: "Memuat...",
    expression: "normal"
  });
  const [interactionOverride, setInteractionOverride] = useState<{text: string, expression: LiviaExpression} | null>(null);
  const [liviaStats, setLiviaStats] = useState({ hunger: 100, energy: 100, hydration: 100, cycleAnchor: new Date().toISOString() });
  const [weather, setWeather] = useState<any>(null);
  
  useEffect(() => {
    preloadLiviaSprites();
    let w: any = null;
    let finalStats = { hunger: 100, energy: 100, hydration: 100, cycleAnchor: new Date().toISOString() };
    
    Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current_weather=true')
        .then(res => res.json())
        .catch(() => null),
      fetch(`/api/affection?t=${Date.now()}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    ]).then(([weatherData, userD]) => {
      if (weatherData && weatherData.current_weather) {
        w = weatherData.current_weather;
        setWeather(w);
      }
      
      if (userD) {
        setMoney(userD.money || 0);
        if (userD.activeOutfit) setOutfit(userD.activeOutfit);
        if (userD.liviaStats) {
          finalStats = userD.liviaStats;
          setLiviaStats(userD.liviaStats);
        }
      }

      const newCyclePhase = (() => {
        const dayOfCycle = calculateCycleDay(finalStats.cycleAnchor);
        if (dayOfCycle <= 5) return 'Menstruasi';
        if (dayOfCycle <= 14) return 'Folikuler';
        if (dayOfCycle <= 17) return 'Ovulasi';
        return 'Luteal';
      })();

      setGreetingData(getGreeting(initialAffection, initialItemsBrought, { ...finalStats, cyclePhase: newCyclePhase }, userName, w));
    });
  }, []);

  const { text: greeting, expression, isInvitingOut, invitedPlace } = greetingData;
  const levelInfo = getAffectionLevel(affection);
  const [showEvent, setShowEvent] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);

  const displayGreeting = interactionOverride ? interactionOverride.text : greeting;
  const displayExpression = interactionOverride ? interactionOverride.expression : expression;

  const handleInteract = async (part: 'head' | 'chest' | 'belly' | 'thigh') => {
    playSfx('pop');
    recordQuestAction('touch_livia');
    let newExpr: LiviaExpression = 'normal';
    let newText = '';
    let affectionChange = 0;

    const currentDay = calculateCycleDay(liviaStats.cycleAnchor);
    const cyclePhase = currentDay <= 5 ? 'Menstruasi' :
                       currentDay <= 14 ? 'Folikuler' :
                       currentDay <= 17 ? 'Ovulasi' : 'Luteal';

    if (cyclePhase === 'Ovulasi') {
      if (part === 'head') {
        newExpr = 'blushing';
        affectionChange = 2;
        const texts = [
          `Nnn... enak banget elusanmu... elus kepalaku lagi dong, ${userName}...`,
          `A-ahh... tanganmu hangat banget... jangan berhenti ya...`,
          `Hehe... aku lagi seneng banget dideketin kamu hari ini...`
        ];
        newText = pickRandom(texts);
      } else if (part === 'chest') {
        newExpr = 'blushing';
        affectionChange = 4;
        const texts = [
          `A-ahh... h-hangat... k-kok berhenti? S-sentuh lagi dong, ${userName}...`,
          `Nnn... jangan dilepas tangannya... hari ini aku lagi pengen dekat banget sama kamu...`,
          `E-eh... rasanya nyaman... jangan berhenti ya...`
        ];
        newText = pickRandom(texts);
      } else if (part === 'belly') {
        newExpr = 'blushing';
        affectionChange = 2;
        const texts = [
          `Hehe geli... tapi hangat... elus perutku lagi dong, ${userName}...`,
          `Nnn... kok cuma sebentar? Sentuh lagi...`,
          `A-aku nggak marah kok hari ini... elus lagi ya...`
        ];
        newText = pickRandom(texts);
      } else if (part === 'thigh') {
        newExpr = 'clingy';
        affectionChange = 4;
        const texts = [
          `A-ahh... p-pahaku... sentuh lagi... jangan berhenti ya, ${userName}...`,
          `Nnn... kenapa berhenti? Raba lagi dong...`,
          `H-hari ini aku nggak bisa nolak sentuhanmu... dekat-dekat terus sama aku ya...`
        ];
        newText = pickRandom(texts);
      }
    } else if (cyclePhase === 'Menstruasi') {
      newExpr = 'angry';
      if (part === 'head') {
        affectionChange = -1;
        const texts = [
          `Aduh jangan sentuh kepalaku! Kepalaku lagi pusing dan perutku kram tau!`,
          `Jangan pegang-pegang! Aku lagi sensitif banget hari ini!`,
          `Lepas tanganmu, ${userName}! Moodku lagi hancur!`
        ];
        newText = pickRandom(texts);
      } else {
        affectionChange = -3;
        const texts = [
          `JANGAN SENTUH AKU! Aku lagi haid, jangan sampai emosiku meledak ya!!`,
          `Tanganmu jauh-jauh!! Pinggang dan perutku lagi sakit semua tau!`,
          `Berani nyentuh lagi kuremas tanganmu sampai patah!!`
        ];
        newText = pickRandom(texts);
      }
    } else {
      if (part === 'head') {
        newExpr = 'blushing';
        affectionChange = 1;
        const texts = [
          "E-eh?! Jangan elus-elus kepalaku dong...",
          "A-apa sih... tanganmu hangat...",
          `Jangan mikir aku suka diginiin ya, ${userName}!`,
          "R-rambutku berantakan tau..."
        ];
        newText = pickRandom(texts);
      } else if (part === 'chest') {
        newExpr = 'angry';
        affectionChange = -2;
        const texts = [
          "H-hei! Dasar mesum! Tanganmu mau kupatahkan?!",
          "M-mata dan tanganmu itu dijaga ya!",
          `${userName} mau mati sekarang juga?!`,
          "K-kyyaa! Jangan sentuh dadaku bodoh!"
        ];
        newText = pickRandom(texts);
      } else if (part === 'belly') {
        newExpr = 'angry';
        affectionChange = -1;
        const texts = [
          "Geli tau! Jauhkan tanganmu dari perutku!",
          `${userName} ngapain sih?! Dasar aneh!`,
          "A-aku nggak gemuk kok! Jangan pegang-pegang!",
          "Hentikan! Atau aku beneran panggil polisi!"
        ];
        newText = pickRandom(texts);
      } else if (part === 'thigh') {
        newExpr = 'angry';
        affectionChange = -2;
        const texts = [
          "T-tanganmu nyentuh pahaku! Dasar cabul!",
          "M-mau kutendang wajahmu?!",
          `Jangan coba-coba meraba-raba ke bawah ya, ${userName}!`,
          "K-kotor! Jauhkan tanganmu!"
        ];
        newText = pickRandom(texts);
      }
    }

    setInteractionOverride({ text: newText, expression: newExpr });
    setShowEvent(false);
    
    setAffection(prev => Math.min(100, Math.max(0, prev + affectionChange)));
    fetch('/api/affection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: affectionChange, reason: `interaction_touch_${part}` })
    }).catch(console.error);

    const globalObj = window as any;
    if (globalObj.interactionTimeout) clearTimeout(globalObj.interactionTimeout);
    globalObj.interactionTimeout = setTimeout(() => {
      setInteractionOverride(null);
    }, 5000);
  };

  useEffect(() => {
    let sessionId: string | null = null;
    fetch('/api/screentime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    }).then(r => r.json()).then(d => { if (d.sessionId) sessionId = d.sessionId; });

    const timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);

    const endSession = () => {
      if (sessionId) {
        navigator.sendBeacon('/api/screentime', JSON.stringify({ action: 'end', sessionId }));
      }
    };

    window.addEventListener('beforeunload', endSession);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', endSession);
      endSession();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('liviaExpression', expression);
  }, [expression]);

  const sessionMinutes = Math.floor(sessionTime / 60);

  const getBackgroundImage = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 15) return '/bg/home screen/home_morning.webp';
    if (hour >= 15 && hour < 18) return '/bg/home screen/home_afternoon.webp';
    return '/bg/home screen/home_night.webp';
  };

  const getCycleInfo = () => {
    const dayOfCycle = calculateCycleDay(liviaStats.cycleAnchor);
    
    if (dayOfCycle <= 5) return { phase: 'Menstruasi', color: 'text-red-500 bg-red-50 border-red-200', day: dayOfCycle };
    if (dayOfCycle <= 14) return { phase: 'Folikuler', color: 'text-pink-500 bg-pink-50 border-pink-200', day: dayOfCycle };
    if (dayOfCycle <= 17) return { phase: 'Ovulasi', color: 'text-purple-500 bg-purple-50 border-purple-200', day: dayOfCycle };
    return { phase: 'Luteal', color: 'text-amber-500 bg-amber-50 border-amber-200', day: dayOfCycle };
  };
  const cycle = getCycleInfo();

  const stressStat = Math.min(100, Math.max(0, Math.round(
    ((100 - liviaStats.hunger) * 0.35 + (100 - liviaStats.energy) * 0.35 + (100 - liviaStats.hydration) * 0.3)
    + (cycle.phase === 'Menstruasi' ? 25 : cycle.phase === 'Luteal' ? 15 : cycle.phase === 'Ovulasi' ? -10 : -5)
  )));

  const moodStat = Math.min(100, Math.max(0, Math.round(
    100 - stressStat * 0.5 + (affection * 0.3)
    + (cycle.phase === 'Ovulasi' ? 20 : cycle.phase === 'Folikuler' ? 10 : cycle.phase === 'Menstruasi' ? -20 : -10)
  )));

  const toleranceStat = Math.min(100, Math.max(0, Math.round(
    (affection * 0.6) + ((100 - stressStat) * 0.35)
    + (cycle.phase === 'Ovulasi' ? 30 : cycle.phase === 'Menstruasi' ? -35 : cycle.phase === 'Luteal' ? -15 : 10)
  )));

  // Shared stat data arrays
  const physicalStats = [
    { value: liviaStats.hunger, icon: <Utensils size={12} />, strokeColor: 'stroke-orange-400', iconColor: 'text-orange-500', label: 'Makan' },
    { value: liviaStats.energy, icon: <Battery size={12} />, strokeColor: 'stroke-yellow-400', iconColor: 'text-yellow-500', label: 'Energi' },
    { value: liviaStats.hydration, icon: <Droplet size={12} />, strokeColor: 'stroke-blue-400', iconColor: 'text-blue-500', label: 'Minum' },
  ];
  const psychStats = [
    { value: moodStat, icon: <Smile size={12} />, strokeColor: 'stroke-rose-400', iconColor: 'text-rose-500', label: 'Mood' },
    { value: stressStat, icon: <Zap size={12} />, strokeColor: 'stroke-purple-400', iconColor: 'text-purple-500', label: 'Stres' },
    { value: toleranceStat, icon: <Shield size={12} />, strokeColor: 'stroke-emerald-400', iconColor: 'text-emerald-500', label: 'Sabar' },
  ];

  const CIRC = 100.53;

  // Chat bubble border color based on expression
  const bubbleBorderClass =
    displayExpression === 'angry' ? 'border-red-200/80 shadow-[0_12px_40px_rgba(239,68,68,0.12)]' :
    displayExpression === 'blushing' ? 'border-pink-200/80 shadow-[0_12px_40px_rgba(244,114,182,0.15)]' :
    displayExpression === 'clingy' ? 'border-purple-200/80 shadow-[0_12px_40px_rgba(167,139,250,0.15)]' :
    displayExpression === 'happy' ? 'border-amber-200/80 shadow-[0_12px_40px_rgba(251,191,36,0.15)]' :
    'border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.08)]';

  const bubbleDotClass =
    displayExpression === 'angry' ? 'bg-red-400' :
    displayExpression === 'blushing' ? 'bg-pink-400 animate-pulse' :
    displayExpression === 'clingy' ? 'bg-purple-400' :
    displayExpression === 'happy' ? 'bg-amber-400' :
    'bg-gray-200';

  const bubbleTextClass =
    displayExpression === 'angry' ? 'text-red-600' :
    displayExpression === 'blushing' ? 'text-pink-800' :
    'text-[#5c4d47]';

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-[#fdfbf7] select-none font-sans">
      <ApiGuideModal showFloatingButton={false} />
      <DailyStampModal />
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-[60%_center] md:bg-center opacity-40 transition-all duration-1000"
        style={{ backgroundImage: `url('${getBackgroundImage()}')` }} 
      />

      {/* Screen VFX Overlays */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 mix-blend-screen opacity-60"
        style={{
          background: displayExpression === 'angry'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,100,100,0.5) 0%, transparent 70%)'
            : displayExpression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,150,180,0.5) 0%, transparent 70%)'
            : displayExpression === 'happy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(255,220,150,0.5) 0%, transparent 70%)'
            : displayExpression === 'clingy'
            ? 'radial-gradient(ellipse at 50% 90%, rgba(200,150,255,0.4) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.3) 0%, transparent 70%)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/10 pointer-events-none z-0" />

      {/* Center Character */}
      <div className="absolute inset-0 pointer-events-none z-10 pb-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <LiviaSprite
            expression={displayExpression}
            outfit={outfit}
            disableFloat={true}
            className="w-full h-full"
            imgClassName="object-cover object-[60%_center] md:object-center"
          />
        </div>

        {/* Invisible Hitboxes */}
        <div className="absolute top-0 left-[10%] md:left-[48%] w-[80%] md:w-[24%] h-full pointer-events-auto z-50 flex flex-col">
          <div onClick={() => handleInteract('head')} className="absolute top-[5%] left-[25%] w-[50%] h-[15%] cursor-pointer z-50 rounded-full transition-colors hover:bg-white/5 active:bg-pink-300/20" />
          <div onClick={() => handleInteract('chest')} className="absolute top-[23%] left-[25%] w-[50%] h-[12%] cursor-pointer z-50 rounded-[2rem] transition-colors hover:bg-white/5 active:bg-pink-300/20" />
          <div onClick={() => handleInteract('belly')} className="absolute top-[35%] left-[25%] w-[50%] h-[15%] cursor-pointer z-50 rounded-[2rem] transition-colors hover:bg-white/5 active:bg-pink-300/20" />
          <div onClick={() => handleInteract('thigh')} className="absolute top-[50%] left-[15%] w-[70%] h-[35%] cursor-pointer z-50 rounded-[3rem] transition-colors hover:bg-white/5 active:bg-pink-300/20" />
        </div>
      </div>

      {/* ─────────── HUD UI Overlay ─────────── */}
      <div className="absolute inset-0 z-20 pointer-events-none p-4 sm:p-6 md:p-10 flex flex-col justify-between">
        
        {/* ── TOP ROW (Desktop) ── */}
        <div className="hidden md:flex flex-row justify-between items-start pointer-events-auto w-full gap-4">
          
          {/* Player Info Panel */}
          <div className="bg-white/85 backdrop-blur-2xl p-5 rounded-3xl border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.07)] flex flex-col gap-4 min-w-[340px]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Avatar initial */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-pink-500 flex items-center justify-center text-white font-display font-black text-lg shadow-sm flex-shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="font-display font-black text-2xl text-[#5c4d47] tracking-tight leading-none">{userName}</span>
              </div>
              {/* Session timer pill */}
              <div className={`font-mono font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${sessionMinutes > 0 ? 'bg-pink-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sessionMinutes > 0 ? 'bg-white/70 animate-pulse' : 'bg-gray-400'}`} />
                {sessionMinutes > 0 ? `${sessionMinutes}m online` : 'Baru tiba'}
              </div>
            </div>
            <AffectionBar
              affection={affection}
              level={levelInfo.level}
              levelName={levelInfo.name}
            />
          </div>

          {/* Wallet Indicator */}
          <div className="bg-white/85 backdrop-blur-2xl px-5 py-3.5 rounded-2xl border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.07)] flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100/80">
              <Wallet className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{dict.stats.money} Rv</span>
              <span className="font-mono font-black text-2xl text-amber-600 leading-none tabular-nums">{money}</span>
            </div>
          </div>
        </div>

        {/* ── TOP ROW (Mobile) ── */}
        <div className="flex md:hidden pointer-events-auto">
          <div className="absolute top-4 left-4 flex gap-2 z-50">
            {/* Affection pill */}
            <button
              onClick={() => setShowMobileStats(true)}
              className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-full border border-pink-100/80 shadow-md flex items-center gap-2 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              <Heart size={13} className="fill-pink-500 text-pink-500 flex-shrink-0" />
              <span className="text-xs font-display font-bold text-[#5c4d47]">Lv.{levelInfo.level} {levelInfo.name}</span>
              <div className="w-14 h-1.5 bg-pink-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-700 rounded-full" style={{ width: `${Math.max(0, Math.min(100, affection))}%` }} />
              </div>
            </button>
            {/* Wallet pill */}
            <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-full border border-amber-100/80 shadow-md flex items-center gap-1.5">
              <Wallet size={13} className="text-amber-500 flex-shrink-0" />
              <span className="font-mono font-black text-sm text-amber-600 tabular-nums">{money}</span>
              <span className="text-[9px] font-bold text-amber-400/90">Rv</span>
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div className="flex-1 relative w-full pointer-events-none">

          {/* Bottom Left: Stats Island + Chat Bubble */}
          <div className="absolute bottom-[4.5rem] left-0 right-0 md:bottom-8 md:left-0 md:right-auto md:w-[560px] z-50 flex flex-col gap-3 pointer-events-auto">

            {/* Stats Island – desktop only */}
            <div className="hidden md:flex bg-white/90 backdrop-blur-2xl rounded-[2rem] p-4 border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.08)] items-center gap-2 self-start w-auto origin-bottom-left">
              {/* Row labels */}
              <div className="flex flex-col justify-around gap-4 pr-3 border-r border-gray-100/80">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Fisik</span>
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Psikis</span>
              </div>

              <div className="flex flex-col gap-2.5 pl-3">
                {/* Physical stats */}
                <div className="flex items-center gap-3">
                  {physicalStats.map(({ value, icon, strokeColor, iconColor, label }) => (
                    <div key={label} title={`${label}: ${value}%`} className="flex flex-col items-center gap-0.5">
                      <div className="relative flex items-center justify-center w-10 h-10">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-100" strokeWidth="4" />
                          <circle cx="20" cy="20" r="16" className={`fill-transparent ${strokeColor} transition-all duration-1000`} strokeWidth="4" strokeDasharray={CIRC} strokeDashoffset={CIRC - (value / 100) * CIRC} strokeLinecap="round" />
                        </svg>
                        <div className={`absolute flex items-center justify-center ${iconColor}`}>{icon}</div>
                      </div>
                      <span className="text-[7px] font-bold text-gray-400 tabular-nums">{value}%</span>
                    </div>
                  ))}
                </div>
                {/* Psychological stats */}
                <div className="flex items-center gap-3">
                  {psychStats.map(({ value, icon, strokeColor, iconColor, label }) => (
                    <div key={label} title={`${label}: ${value}%`} className="flex flex-col items-center gap-0.5">
                      <div className="relative flex items-center justify-center w-10 h-10">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-100" strokeWidth="4" />
                          <circle cx="20" cy="20" r="16" className={`fill-transparent ${strokeColor} transition-all duration-1000`} strokeWidth="4" strokeDasharray={CIRC} strokeDashoffset={CIRC - (value / 100) * CIRC} strokeLinecap="round" />
                        </svg>
                        <div className={`absolute flex items-center justify-center ${iconColor}`}>{icon}</div>
                      </div>
                      <span className="text-[7px] font-bold text-gray-400 tabular-nums">{value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider + Cycle */}
              <div className="w-px h-16 bg-gray-100 mx-2" />
              <div className="flex flex-col items-center text-center min-w-[68px] gap-1 px-1">
                <Moon size={15} className={`${cycle.color.split(' ')[0]} drop-shadow-sm`} />
                <span className={`text-[10px] font-black leading-tight ${cycle.color.split(' ')[0]}`}>{cycle.phase}</span>
                <span className="text-[8px] text-gray-400 font-bold">H-{cycle.day}</span>
              </div>
            </div>

            {/* Chat Bubble */}
            <div className="origin-bottom-left">
              <div className={`relative bg-white/97 backdrop-blur-2xl px-5 py-4 md:px-8 md:py-6 rounded-2xl md:rounded-[2.5rem] md:rounded-bl-xl border-2 transition-all duration-500 ${bubbleBorderClass}`}>
                {/* Expression dot */}
                <span className={`absolute top-3 right-3 md:top-4 md:right-4 w-2 h-2 rounded-full transition-colors duration-500 ${bubbleDotClass}`} />
                <p className={`font-display font-semibold md:font-bold text-sm md:text-xl leading-snug transition-colors duration-300 pr-5 ${bubbleTextClass}`}>
                  &ldquo;{displayGreeting}&rdquo;
                </p>
                {isInvitingOut && !interactionOverride && (
                  <button
                    onClick={() => setShowEvent(true)}
                    className="mt-3 md:mt-5 w-full py-2.5 md:py-3 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold md:font-black text-sm md:text-lg rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  >
                    <MapPin size={17} /> {language === 'en' ? "Sure, let's go!" : "Boleh, ayo!"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Side: Command Menus (Desktop) ── */}
          <div className="hidden md:flex flex-col items-end w-[300px] absolute bottom-2 right-0 z-40 h-[600px] justify-end pointer-events-auto origin-bottom-right [@media(max-height:700px)]:scale-[0.8] [@media(max-height:550px)]:scale-[0.6]">
            <div className="relative w-full h-full flex flex-col justify-end">
              
              {/* Sub-menus drawer */}
              <div
                className="absolute bottom-[110px] right-2 grid grid-cols-2 gap-2 w-[160px]"
                style={{ pointerEvents: isDesktopMenuOpen ? 'auto' : 'none' }}
              >
                {[
                  { href: "/wardrobe", icon: <Shirt size={20} />, title: dict?.nav?.wardrobe || 'Lemari' },
                  { href: "/shop", icon: <Gift size={20} />, title: dict?.nav?.shop || 'Toko' },
                  { href: "/work", icon: <Briefcase size={20} />, title: dict?.nav?.work || 'Kerja' },
                  { href: "/inventory", icon: <Package size={20} />, title: dict?.nav?.inventory || 'Tas' },
                  { href: "/lounge", icon: <Tv size={20} />, title: dict?.nav?.lounge || 'Santai' },
                  { href: "/radio", icon: <Radio size={20} />, title: dict?.nav?.radio || 'Lofi' },
                  { href: "/schedule", icon: <Calendar size={20} />, title: dict?.nav?.schedule || 'Jadwal' },
                  { href: "/pomodoro", icon: <Clock size={20} />, title: dict?.nav?.pomodoro || 'Pomodoro' },
                  { href: "/settings", icon: <Settings size={20} />, title: dict?.nav?.settings || 'Setelan' },
                  { href: "/album", icon: <Camera size={20} />, title: dict?.nav?.album || 'Album' },
                ].map((m, i) => {
                  const row = 4 - Math.floor(i / 2);
                  return (
                    <div
                      key={m.title}
                      style={{
                        transform: isDesktopMenuOpen ? 'translateY(0) scale(1)' : 'translateY(150px) scale(0.8)',
                        opacity: isDesktopMenuOpen ? 1 : 0,
                        transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${isDesktopMenuOpen ? 300 + row * 60 : 0}ms`
                      }}
                    >
                      <BottomMenuCard href={m.href} icon={m.icon} title={m.title} />
                    </div>
                  );
                })}
              </div>

              {/* Main menus */}
              <div
                className="absolute bottom-[110px] right-0 flex flex-col gap-3 w-full items-end"
                style={{ pointerEvents: isDesktopMenuOpen ? 'none' : 'auto' }}
              >
                {[
                  { href: "/chat", icon: <MessageSquare size={24} />, title: dict.nav.chat.toUpperCase(), show: true },
                  { href: "/story", icon: <BookOpen size={24} />, title: dict.nav.story.toUpperCase(), show: true },
                  { href: "/date", icon: <MapPin size={24} />, title: dict.nav.date.toUpperCase(), show: isInvitingOut || (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses'))), isSpecial: true },
                  { href: "/kitchen", icon: <Utensils size={24} />, title: dict.nav.kitchen.toUpperCase(), show: itemsBrought.includes('recipe_book') || itemsBrought.includes('recipe_book_shop') },
                  { href: "/garden", icon: <Sprout size={24} />, title: dict.nav.garden.toUpperCase(), show: true }
                ].filter(m => m.show).map((m, index, arr) => (
                  <div
                    key={m.title}
                    style={{
                      transform: isDesktopMenuOpen ? `translateY(${(arr.length - index) * 60}px) scale(0.8)` : 'translateY(0) scale(1)',
                      opacity: isDesktopMenuOpen ? 0 : 1,
                      pointerEvents: isDesktopMenuOpen ? 'none' : 'auto',
                      transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${isDesktopMenuOpen ? index * 60 : (arr.length - 1 - index) * 60 + 200}ms`
                    }}
                  >
                    <SideMenuCard href={m.href} icon={m.icon} title={m.title} isSpecial={m.isSpecial} />
                  </div>
                ))}
              </div>

              {/* Lainnya toggle button */}
              <button
                onClick={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}
                className="absolute bottom-0 right-0 flex items-center gap-3 px-5 py-3.5 rounded-[2rem] transition-all group w-[180px] md:w-[240px] justify-end hover:scale-[1.02] shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:shadow-[0_12px_32px_rgba(255,117,140,0.2)] backdrop-blur-2xl bg-white/90 border border-white/70 hover:border-pink-200 text-[#5c4d47] z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                <span className="font-display font-black text-sm tracking-widest relative z-10 transition-colors group-hover:text-[#ff758c]">
                  {isDesktopMenuOpen ? dict.common.back.toUpperCase() : (language === 'en' ? 'MORE' : 'LAINNYA')}
                </span>
                <div className={`p-2.5 rounded-xl transition-all duration-300 relative z-10 flex-shrink-0 ${isDesktopMenuOpen ? 'bg-[#ff758c] text-white rotate-180' : 'bg-pink-50 text-[#ff758c] group-hover:bg-[#ff758c] group-hover:text-white'}`}>
                  <Menu size={22} />
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ─────────── Mobile Bottom Navigation ─────────── */}
      <div className="md:hidden absolute bottom-5 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[2rem] py-2 px-3 flex justify-around items-center z-[100] shadow-[0_-2px_20px_rgba(0,0,0,0.06),0_8px_30px_rgba(0,0,0,0.08)] pointer-events-auto">
        <MobileNavBtn href="/home" icon={<BookOpen size={22} />} label={dict.nav.home} isActive />
        <MobileNavBtn href="/chat" icon={<MessageSquare size={22} />} label={dict.nav.chat} />
        <MobileNavBtn href="/pomodoro" icon={<Clock size={22} />} label={dict.nav.pomodoro} />
        <button
          onClick={() => setShowMoreModal(true)}
          className="flex flex-col items-center justify-center gap-1 w-14 focus-visible:outline-none"
        >
          <div className="p-2 rounded-xl transition-all text-gray-400 hover:text-[#ff758c] active:scale-90 active:bg-pink-50">
            <Menu size={22} />
          </div>
          <span className="font-display text-[9px] font-bold text-gray-400">{language === 'en' ? 'More' : 'Lainnya'}</span>
        </button>
      </div>

      {/* ─────────── More Menus Modal ─────────── */}
      {showMoreModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMoreModal(false); }}
        >
          <div className="bg-white w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2rem] pt-3 px-6 pb-10 md:pb-8 shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-display font-black text-[#5c4d47]">
                {language === 'en' ? 'More Menus' : 'Menu Lainnya'}
              </h2>
              <button
                onClick={() => setShowMoreModal(false)}
                className="w-9 h-9 text-gray-400 hover:text-white hover:bg-[#ff758c] bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                <X size={17} strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
              {itemsBrought.includes('recipe_book') && (
                <BottomMenuCard href="/kitchen" icon={<Utensils size={24} />} title={dict?.nav?.kitchen || 'Dapur'} />
              )}
              <BottomMenuCard href="/wardrobe" icon={<Shirt size={24} />} title={dict?.nav?.wardrobe || 'Lemari'} />
              <BottomMenuCard href="/shop" icon={<Gift size={24} />} title={dict?.nav?.shop || 'Toko'} />
              <BottomMenuCard href="/work" icon={<Briefcase size={24} />} title={dict?.nav?.work || 'Kerja'} />
              <BottomMenuCard href="/story" icon={<BookOpen size={24} />} title={dict?.nav?.story || 'Cerita'} />
              {(isInvitingOut || (affection >= 40 && (itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses')))) && (
                <BottomMenuCard href="/date" icon={<MapPin size={24} />} title={dict?.nav?.date || 'Jalan'} />
              )}
              <BottomMenuCard href="/inventory" icon={<Package size={24} />} title={dict?.nav?.inventory || 'Tas'} />
              <BottomMenuCard href="/lounge" icon={<Tv size={24} />} title={dict?.nav?.lounge || 'Santai'} />
              <BottomMenuCard href="/radio" icon={<Radio size={24} />} title={dict?.nav?.radio || 'Lofi'} />
              <BottomMenuCard href="/schedule" icon={<Calendar size={24} />} title={dict?.nav?.schedule || 'Jadwal'} />
              <BottomMenuCard href="/settings" icon={<Settings size={24} />} title={dict?.nav?.settings || 'Setelan'} />
              <BottomMenuCard href="/album" icon={<Camera size={24} />} title={dict?.nav?.album || 'Album'} />
            </div>
          </div>
        </div>
      )}

      {/* ─────────── Mini Event Modal ─────────── */}
      {showEvent && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-50 to-pink-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-pink-100">
              <MapPin size={38} className="text-[#ff758c]" />
            </div>
            <h2 className="text-3xl font-display font-black text-[#5c4d47] mb-3">Momen Spesial</h2>
            <p className="text-gray-500 mb-5 text-base leading-relaxed">
              Kamu menghabiskan waktu menemani Livia berbelanja. Dia memakai kacamata hitam pemberianmu sepanjang jalan, menyembunyikan wajahnya yang merona.
            </p>
            <p className="text-[#ff758c] font-display font-black mb-8 text-xl italic">&ldquo;T-tempat ini lumayan seru juga...&rdquo;</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowEvent(false)}
                className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100 active:scale-[0.98] focus-visible:outline-none"
              >
                Tutup
              </button>
              <Link
                href={invitedPlace ? `/date?location=${encodeURIComponent(invitedPlace)}` : `/date`}
                className="flex-[2] py-3.5 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-black rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:outline-none"
              >
                <MapPin size={17} /> Jalan Lanjut!
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── Mobile Stats Modal ─────────── */}
      {showMobileStats && (
        <div
          className="md:hidden fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto animate-[fadeIn_0.2s_ease-out]"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMobileStats(false); }}
        >
          <div className="bg-white w-full max-w-[340px] rounded-[2rem] p-6 shadow-2xl border border-gray-50 flex flex-col gap-5 animate-[slideUp_0.25s_ease-out]">

            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-pink-200 to-pink-400 rounded-full flex items-center justify-center text-white font-black font-display text-xl shadow-sm border-2 border-white flex-shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-[#5c4d47] text-lg leading-tight">{userName}</span>
                  <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full w-fit border border-pink-100 mt-0.5">{levelInfo.name}</span>
                </div>
              </div>
              <button
                onClick={() => setShowMobileStats(false)}
                className="w-9 h-9 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full active:scale-95 transition-transform border border-gray-100 hover:bg-gray-100 focus-visible:outline-none"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Affection Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Heart size={14} className="fill-pink-500 text-pink-500" />
                  <span className="font-bold text-[#5c4d47] text-sm">Afeksi</span>
                </div>
                <span className="font-mono font-black text-sm text-[#5c4d47] tabular-nums">{affection}/100</span>
              </div>
              <div className="relative w-full h-5 bg-pink-50 rounded-full border border-pink-100/80 overflow-hidden shadow-inner">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-400 to-pink-500 transition-all duration-700 rounded-full" style={{ width: `${Math.max(0, Math.min(100, affection))}%` }} />
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kondisi Livia</span>
                <div className={`text-[9px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${cycle.color}`}>
                  <Moon size={9} /> {cycle.phase}
                </div>
              </div>

              {/* Physical */}
              <div className="flex justify-around items-start">
                {physicalStats.map(({ value, icon, strokeColor, iconColor, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="relative flex items-center justify-center w-11 h-11">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-200" strokeWidth="4" />
                        <circle cx="20" cy="20" r="16" className={`fill-transparent ${strokeColor} transition-all duration-1000`} strokeWidth="4" strokeDasharray={CIRC} strokeDashoffset={CIRC - (value / 100) * CIRC} strokeLinecap="round" />
                      </svg>
                      <div className={`absolute flex items-center justify-center ${iconColor}`}>{icon}</div>
                    </div>
                    <span className="text-[8px] font-bold text-gray-500">{label}</span>
                    <span className="text-[9px] font-black text-gray-700 tabular-nums">{value}%</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200/60" />

              {/* Psychological */}
              <div className="flex justify-around items-start">
                {psychStats.map(({ value, icon, strokeColor, iconColor, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="relative flex items-center justify-center w-11 h-11">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="16" className="fill-transparent stroke-gray-200" strokeWidth="4" />
                        <circle cx="20" cy="20" r="16" className={`fill-transparent ${strokeColor} transition-all duration-1000`} strokeWidth="4" strokeDasharray={CIRC} strokeDashoffset={CIRC - (value / 100) * CIRC} strokeLinecap="round" />
                      </svg>
                      <div className={`absolute flex items-center justify-center ${iconColor}`}>{icon}</div>
                    </div>
                    <span className="text-[8px] font-bold text-gray-500">{label}</span>
                    <span className="text-[9px] font-black text-gray-700 tabular-nums">{value}%</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function SideMenuCard({ href, icon, title, isSpecial = false }: { href: string; icon: React.ReactNode; title: string; isSpecial?: boolean }) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={`group flex items-center justify-center md:justify-end gap-2 md:gap-4 px-4 md:pl-10 md:pr-6 py-2 md:py-3.5 rounded-2xl md:rounded-l-full md:rounded-r-[2rem] transition-all duration-300 md:duration-500 md:hover:pr-8 border-2 md:border-r-0 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
        isSpecial
          ? 'bg-gradient-to-l from-[#ff758c] to-[#ff0844] md:from-[#ff758c]/90 md:to-white/90 backdrop-blur-2xl border-white hover:border-pink-300 shadow-md md:shadow-[0_15px_30px_rgba(255,117,140,0.3)]'
          : 'bg-white/90 md:bg-white/80 backdrop-blur-2xl border-white/50 hover:bg-white hover:border-pink-200 shadow-sm md:shadow-[0_10px_25px_rgba(0,0,0,0.05)]'
      }`}
    >
      <span className={`font-display font-black text-sm md:text-[27px] tracking-widest md:italic transition-colors drop-shadow-sm ${isSpecial ? 'text-white' : 'text-[#5c4d47] group-hover:text-[#ff758c]'}`}>
        {title}
      </span>
      <div className={`p-2 md:p-3 rounded-full shadow-inner transition-transform duration-300 md:duration-500 group-hover:rotate-12 group-hover:scale-110 hidden md:block ${isSpecial ? 'bg-white text-[#ff758c]' : 'bg-pink-50 text-[#ff758c]'}`}>
        {icon}
      </div>
    </Link>
  );
}

function BottomMenuCard({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      prefetch={true}
      className="group flex flex-col items-center justify-center gap-1.5 w-full aspect-square md:w-18 md:h-18 bg-white/90 md:bg-white/80 backdrop-blur-xl border border-pink-100/80 rounded-[1.5rem] md:rounded-2xl shadow-sm md:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:bg-white hover:border-[#ff758c]/60 hover:shadow-[0_8px_24px_rgba(255,117,140,0.15)] md:hover:-translate-y-1 active:scale-95 transition-all duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
    >
      <div className="text-pink-300 group-hover:text-[#ff758c] transition-colors transform group-hover:scale-110 duration-200">
        {icon}
      </div>
      <span className="font-display font-bold text-[10px] md:text-xs text-gray-500 group-hover:text-[#ff758c] transition-colors leading-tight text-center px-1">
        {title}
      </span>
    </Link>
  );
}

function MobileNavBtn({ href, icon, label, isActive = false }: { href: string; icon: React.ReactNode; label: string; isActive?: boolean }) {
  return (
    <Link href={href} prefetch={true} className="flex flex-col items-center justify-center gap-1 w-14 focus-visible:outline-none">
      <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-pink-100 text-[#ff758c] shadow-sm' : 'text-gray-400 hover:text-[#ff758c] active:bg-pink-50 active:scale-90'}`}>
        {icon}
      </div>
      <span className={`font-display text-[9px] font-bold transition-colors ${isActive ? 'text-[#ff758c]' : 'text-gray-400'}`}>
        {label}
      </span>
    </Link>
  );
}