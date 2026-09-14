'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, Tv, Power, RefreshCw, Radio, ExternalLink, 
  X, Volume2, Sparkles, Newspaper, ChevronRight, Heart
} from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import LiviaSprite from '@/components/livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';
import { playSfx } from '@/lib/sfx';

interface NewsItem {
  title: string;
  pubDate: string;
  source: string;
  link?: string;
  description?: string;
}

interface ChannelDef {
  id: string;
  num: string;
  name: string;
  category: string;
  rss: string;
  badgeColor: string;
  screenGradient: string;
}

const CHANNELS: ChannelDef[] = [
  { 
    id: 'terkini', 
    num: '01', 
    name: 'Warta Nasional', 
    category: 'Berita Terkini', 
    rss: 'https://www.antaranews.com/rss/terkini.xml', 
    badgeColor: 'bg-red-600', 
    screenGradient: 'from-blue-950 via-slate-900 to-black' 
  },
  { 
    id: 'tekno', 
    num: '02', 
    name: 'Tekno & Sains', 
    category: 'Teknologi & Gadget', 
    rss: 'https://www.antaranews.com/rss/tekno.xml', 
    badgeColor: 'bg-cyan-600', 
    screenGradient: 'from-cyan-950 via-slate-900 to-black' 
  },
  { 
    id: 'olahraga', 
    num: '03', 
    name: 'Arena Olahraga', 
    category: 'Sepakbola & Olahraga', 
    rss: 'https://www.antaranews.com/rss/olahraga.xml', 
    badgeColor: 'bg-emerald-600', 
    screenGradient: 'from-emerald-950 via-slate-900 to-black' 
  },
  { 
    id: 'hiburan', 
    num: '04', 
    name: 'Hiburan & Pop', 
    category: 'Film, Musik & Seni', 
    rss: 'https://www.antaranews.com/rss/hiburan.xml', 
    badgeColor: 'bg-fuchsia-600', 
    screenGradient: 'from-fuchsia-950 via-slate-900 to-black' 
  },
];

export default function LoungePage() {
  const [loading, setLoading] = useState(true);
  const [outfit, setOutfit] = useState('default');
  
  // TV State
  const [isTvOn, setIsTvOn] = useState(false);
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [newsIndex, setNewsIndex] = useState(0);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  
  // Livia State
  const [liviaExpression, setLiviaExpression] = useState<LiviaExpression>('normal');
  const [liviaComment, setLiviaComment] = useState<string>("Sofa ini empuk banget. Sini duduk bareng!");
  
  // Selected Article Modal State
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

  // In-memory cache for news channels
  const channelCache = useRef<Record<string, NewsItem[]>>({});

  useEffect(() => {
    fetch('/api/affection')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.activeOutfit) setOutfit(d.activeOutfit);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentChannel = CHANNELS[currentChannelIndex];
  const currentNews = newsList[newsIndex];

  const fetchChannelNews = async (channel: ChannelDef, preferredIndex = 0) => {
    // Check in-memory cache first
    if (channelCache.current[channel.id]?.length) {
      const cached = channelCache.current[channel.id];
      setNewsList(cached);
      setNewsIndex(preferredIndex);
      updateLiviaReaction(cached[preferredIndex]?.title || '', channel.id);
      return;
    }

    setIsFetchingNews(true);
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(channel.rss)}`);
      const data = await res.json();
      
      if (data?.status === 'ok' && data.items?.length > 0) {
        const mappedNews: NewsItem[] = data.items.map((item: any) => ({
          title: item.title || "Berita Terkini",
          pubDate: item.pubDate ? new Date(item.pubDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "Baru saja",
          source: 'ANTARA News',
          link: item.link,
          description: item.description ? item.description.replace(/<[^>]*>?/gm, '').slice(0, 240) + '...' : undefined
        }));

        channelCache.current[channel.id] = mappedNews;
        setNewsList(mappedNews);
        setNewsIndex(preferredIndex);
        updateLiviaReaction(mappedNews[preferredIndex]?.title || '', channel.id);
      } else {
        throw new Error("Empty feed");
      }
    } catch {
      const fallback: NewsItem[] = [{
        title: "Sinyal antena sedang mencari siaran terkini. Tekan remote untuk mengganti channel.",
        pubDate: "Satelit Kos",
        source: "Antara",
      }];
      setNewsList(fallback);
      setNewsIndex(0);
      setLiviaExpression('confused');
      setLiviaComment("Hmm... antenanya agak kresek-kresek. Coba ganti channel lain deh.");
    } finally {
      setIsFetchingNews(false);
    }
  };

  const handleToggleTv = () => {
    playSfx('click');
    if (!isTvOn) {
      setIsTvOn(true);
      fetchChannelNews(currentChannel, newsIndex);
    } else {
      setIsTvOn(false);
      setLiviaExpression('angry');
      setLiviaComment("Yah, kok dimatiin sih? Padahal tadi lagi seru nontonnya.");
    }
  };

  const handleSelectChannel = (index: number) => {
    if (!isTvOn) {
      setIsTvOn(true);
    }
    playSfx('pop');
    setCurrentChannelIndex(index);
    fetchChannelNews(CHANNELS[index], 0);
  };

  const handleNextNewsItem = () => {
    if (!isTvOn || newsList.length <= 1) return;
    playSfx('click');
    const nextIdx = (newsIndex + 1) % newsList.length;
    setNewsIndex(nextIdx);
    updateLiviaReaction(newsList[nextIdx]?.title || '', currentChannel.id);
  };

  const handlePrevNewsItem = () => {
    if (!isTvOn || newsList.length <= 1) return;
    playSfx('click');
    const prevIdx = (newsIndex - 1 + newsList.length) % newsList.length;
    setNewsIndex(prevIdx);
    updateLiviaReaction(newsList[prevIdx]?.title || '', currentChannel.id);
  };

  const updateLiviaReaction = (headline: string, channelId: string) => {
    if (!headline) return;
    const lower = headline.toLowerCase();

    if (lower.includes('gempa') || lower.includes('banjir') || lower.includes('bencana') || lower.includes('tewas')) {
      setLiviaExpression('scared');
      setLiviaComment("Duh serem banget... Semoga semua orang di sana selamat dan aman ya.");
    } else if (lower.includes('korupsi') || lower.includes('pidana') || lower.includes('polisi') || lower.includes('sidang')) {
      setLiviaExpression('angry');
      setLiviaComment("Hih, berita beginian lagi! Bikin naik darah aja lihatnya.");
    } else if (lower.includes('menang') || lower.includes('timnas') || lower.includes('juara') || lower.includes('emas')) {
      setLiviaExpression('happy');
      setLiviaComment("Wah keren banget! Mereka menang! Kamu tadi nonton pertandingannya nggak?");
    } else if (channelId === 'tekno' || lower.includes('ai') || lower.includes('game') || lower.includes('robot')) {
      setLiviaExpression('pleased');
      setLiviaComment("Teknologi sekarang cepat banget ya berkembangnya... Jadi kepikiran, aku ini di matamu secanggih itu nggak?");
    } else if (channelId === 'hiburan' || lower.includes('film') || lower.includes('konser') || lower.includes('lagu')) {
      setLiviaExpression('blushing');
      setLiviaComment("Eh, itu film baru yang lagi rame ya? K-kapan-kapan ajak aku nonton bioskop dong...");
    } else {
      setLiviaExpression('normal');
      setLiviaComment("Oh, jadi gitu berita hari ini. Enak ya nonton berita sambil santai di sofa gini.");
    }
  };

  const handleTapLivia = () => {
    playSfx('pop');
    if (!isTvOn) {
      setLiviaExpression('blushing');
      setLiviaComment("K-kenapa senggol-senggol? Nyalain TV-nya dong, biar kosan nggak sepi!");
    } else {
      setLiviaExpression('happy');
      const comments = [
        "Nonton TV bareng kamu di sofa gini... lumayan nyaman juga sih.",
        "Mau camilan nggak? Tadi aku lihat di kulkas ada minuman dingin.",
        "Jangan cuma liatin aku terus! Liat tuh layarnya, beritanya seru tau.",
        "Habis ini ganti ke channel hiburan ya, jangan berita politik mulu!"
      ];
      setLiviaComment(comments[Math.floor(Math.random() * comments.length)]);
    }
  };

  const handleOpenArticle = (item: NewsItem) => {
    playSfx('paper');
    setSelectedArticle(item);
  };

  if (loading) {
    return <LoadingScreen text="Memasuki Lounge..." />;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#14151c] relative flex flex-col items-center justify-end overflow-hidden select-none font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800e_1px,transparent_1px),linear-gradient(to_bottom,#8080800e_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-indigo-500/10 rounded-full blur-[100px]" />
        
        {/* TV Ambient Glow on the wall */}
        {isTvOn && (
          <div className="absolute top-28 md:top-36 left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-cyan-500/15 rounded-full blur-[90px] transition-opacity duration-1000 animate-pulse" />
        )}
      </div>

      {/* Top Navigation Bar */}
      <div className="absolute top-4 md:top-6 left-4 md:left-6 right-4 md:right-6 flex items-center justify-between z-40">
        <Link 
          href="/home" 
          className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg bg-[#222430] border border-gray-700/60 hover:bg-[#ff758c] hover:border-pink-400 group"
        >
          <ChevronLeft className="text-gray-300 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
        </Link>
        
        <div className="bg-[#222430]/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700/60 flex items-center gap-2 shadow-lg">
          <Radio size={15} className="text-[#ff758c] animate-pulse" />
          <span className="font-bold text-gray-200 text-xs md:text-sm tracking-wider uppercase">Lounge Santai</span>
        </div>
      </div>

      {/* The TV Display */}
      <div className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 w-[94%] md:w-[720px] aspect-[16/9] z-10">
        <div 
          onClick={() => isTvOn && currentNews && handleOpenArticle(currentNews)}
          className={`w-full h-full bg-[#08080a] rounded-2xl border-[8px] md:border-[12px] border-[#1c1e27] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col items-center justify-center ${isTvOn ? 'cursor-pointer' : ''}`}
        >
          {/* SAMSENG Logo */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] md:text-[9px] font-black text-gray-700 tracking-widest pointer-events-none">
            SAMSENG
          </div>
          
          {/* TV Screen Content */}
          <div className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isTvOn ? 'opacity-100' : 'opacity-0'}`}>
            {isFetchingNews ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
                <RefreshCw className="text-cyan-400 animate-spin mb-3" size={28} />
                <p className="text-cyan-200 font-bold text-xs tracking-widest uppercase animate-pulse">Menghubungkan ke satelit...</p>
              </div>
            ) : currentNews ? (
              <div className={`w-full h-full bg-gradient-to-br ${currentChannel.screenGradient} relative flex flex-col justify-between p-4 md:p-6`}>
                
                {/* Channel Header Pill */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <span className={`${currentChannel.badgeColor} text-white font-black text-[10px] md:text-xs px-2.5 py-0.5 rounded shadow-sm tracking-wider`}>
                      CH {currentChannel.num}
                    </span>
                    <span className="text-white/80 font-bold text-[11px] md:text-xs tracking-wide">
                      {currentChannel.name}
                    </span>
                  </div>
                  <span className="text-white/60 font-mono text-[10px] md:text-xs">
                    {newsIndex + 1} / {newsList.length}
                  </span>
                </div>

                {/* News Headline Box */}
                <div className="z-10 bg-black/50 backdrop-blur-md p-3 md:p-4 rounded-xl border-l-4 border-[#ff758c] group hover:bg-black/60 transition-colors">
                  <span className="text-[#ff758c] font-black text-[9px] md:text-[10px] tracking-widest uppercase block mb-1">
                    {currentChannel.category} • {currentNews.pubDate}
                  </span>
                  <h2 className="font-display font-black text-white text-sm sm:text-base md:text-xl leading-tight line-clamp-3">
                    {currentNews.title}
                  </h2>
                  <span className="text-pink-300/80 text-[10px] font-bold mt-2 inline-flex items-center gap-1 group-hover:text-pink-300">
                    <Newspaper size={11} /> Klik layar untuk membaca ringkasan ✧
                  </span>
                </div>

                {/* CRT Screen Scanlines */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_2px,#000_4px)]" />
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_50%,#000_150%)]" />
              </div>
            ) : null}
          </div>

          {/* Screen Off Reflection */}
          {!isTvOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none">
              <Power size={32} className="text-gray-700/40 mb-2" />
              <span className="text-gray-600 font-bold text-xs uppercase tracking-widest">Tekan Tombol Remote Untuk Menyalakan</span>
            </div>
          )}
        </div>
      </div>

      {/* Sofa (Foreground element) */}
      <div className="absolute bottom-0 w-full max-w-[850px] h-32 md:h-44 z-10 pointer-events-none">
        <div className="w-full h-full bg-[#6d5345] rounded-t-[3rem] md:rounded-t-[4.5rem] shadow-[inset_0_20px_30px_rgba(255,255,255,0.08),0_-10px_30px_rgba(0,0,0,0.5)] border-t-8 border-[#7f6354] relative">
          <div className="absolute top-0 bottom-0 left-1/3 w-2 bg-[#594236] shadow-inner" />
          <div className="absolute top-0 bottom-0 right-1/3 w-2 bg-[#594236] shadow-inner" />
        </div>
      </div>

      {/* Livia Sitting on the Sofa (Interactive Sprite) */}
      <div 
        onClick={handleTapLivia}
        className="absolute bottom-16 md:bottom-24 right-6 sm:right-16 md:right-28 z-20 cursor-pointer group"
        title="Sapa Livia"
      >
        <LiviaSprite 
          expression={liviaExpression} 
          outfit={outfit}
          variant="home"
          disableFloat={true}
          className="h-44 sm:h-56 md:h-64 aspect-[2/3] transition-transform duration-300 group-hover:scale-105"
          imgClassName="object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
        />
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 text-gray-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap pointer-events-none">
          Sapa Livia ✧
        </div>
      </div>

      {/* Livia Dialogue Commentary Bar */}
      <div className="absolute bottom-24 md:bottom-28 left-4 md:left-12 z-30 w-[88%] md:max-w-md transition-all duration-500">
        <div className="p-3.5 md:p-4 rounded-2xl bg-[#1c1e27]/95 backdrop-blur-xl border border-gray-700/80 shadow-2xl flex items-center gap-3">
          <div className="bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black text-[11px] px-3 py-1 rounded-full shadow-md shrink-0 uppercase tracking-wider">
            Livia
          </div>
          <p className="font-medium text-gray-200 text-xs md:text-sm leading-relaxed flex-1">
            "{liviaComment}"
          </p>
        </div>
      </div>

      {/* TV Remote Controller (Bottom Floating Bar) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1c1e27]/95 backdrop-blur-xl px-4 py-2.5 rounded-full border border-gray-700/80 shadow-2xl flex items-center gap-3 md:gap-4 z-40">
        {/* Power Button */}
        <button 
          onClick={handleToggleTv}
          title={isTvOn ? "Matikan TV" : "Nyalakan TV"}
          className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all shadow-inner ${
            isTvOn 
              ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/30' 
              : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
          }`}
        >
          <Power size={18} />
        </button>

        <div className="h-6 w-px bg-gray-700" />

        {/* Channel Switchers (01, 02, 03, 04) */}
        <div className="flex items-center gap-1.5">
          {CHANNELS.map((ch, idx) => {
            const isActive = isTvOn && currentChannelIndex === idx;
            return (
              <button
                key={ch.id}
                onClick={() => handleSelectChannel(idx)}
                className={`px-2.5 md:px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  isActive 
                    ? `${ch.badgeColor} text-white shadow-md scale-105` 
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
                title={ch.name}
              >
                {ch.num}
              </button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* Next / Prev News Article */}
        <div className="flex items-center gap-1">
          <button 
            onClick={handlePrevNewsItem}
            disabled={!isTvOn || newsList.length <= 1}
            className="w-8 h-8 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:bg-gray-700 disabled:opacity-40"
            title="Berita Sebelumnya"
          >
            ←
          </button>
          <button 
            onClick={handleNextNewsItem}
            disabled={!isTvOn || newsList.length <= 1}
            className="w-8 h-8 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:bg-gray-700 disabled:opacity-40"
            title="Berita Berikutnya"
          >
            →
          </button>
        </div>
      </div>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#1c1e27] border border-gray-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative">
            <button 
              onClick={() => setSelectedArticle(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
              <Newspaper size={14} /> {currentChannel.name} • {selectedArticle.source}
            </div>

            <h3 className="font-display font-black text-xl text-white leading-snug">
              {selectedArticle.title}
            </h3>

            {selectedArticle.description && (
              <p className="text-gray-300 text-sm leading-relaxed bg-black/30 p-4 rounded-2xl border border-gray-800">
                {selectedArticle.description}
              </p>
            )}

            {/* Livia's personal take */}
            <div className="bg-pink-950/40 border border-pink-900/50 p-3.5 rounded-2xl flex items-center gap-3">
              <span className="bg-[#ff758c] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                Livia
              </span>
              <span className="text-pink-200 text-xs italic">
                "{liviaComment}"
              </span>
            </div>

            <div className="flex gap-3 mt-2">
              {selectedArticle.link && (
                <a 
                  href={selectedArticle.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-pink-500/20 active:scale-95 transition-all"
                >
                  <span>Baca Selengkapnya di Antara</span>
                  <ExternalLink size={14} />
                </a>
              )}
              <button 
                onClick={() => setSelectedArticle(null)}
                className="py-3 px-5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs md:text-sm rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
