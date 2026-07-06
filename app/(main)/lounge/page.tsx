'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Tv, Power, RefreshCw, Radio } from 'lucide-react';
import LoadingScreen from '@/components/ui/LoadingScreen';

type NewsItem = {
  title: string;
  pubDate: string;
  source: string;
};

export default function LoungePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // TV State
  const [isTvOn, setIsTvOn] = useState(false);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [currentChannel, setCurrentChannel] = useState(0);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [liviaComment, setLiviaComment] = useState<string>("Sofa ini empuk banget. Sini duduk!");

  useEffect(() => {
    fetch('/api/affection')
      .then(r => r.json())
      .then(d => {
        setStats(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const fetchNews = async () => {
    setIsFetchingNews(true);
    try {
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.antaranews.com%2Frss%2Fterkini.xml');
      const data = await res.json();
      
      if (data && data.status === 'ok' && data.items && data.items.length > 0) {
        const mappedNews = data.items.map((item: any) => ({
          title: item.title || "Berita Terkini",
          pubDate: item.pubDate || "Baru saja",
          source: 'ANTARA News',
        }));
        setNewsList(mappedNews);
        generateLiviaReaction(mappedNews[0].title);
      } else {
        throw new Error(data.message || "Data berita kosong");
      }
    } catch (error) {
      console.error("Gagal mengambil berita:", error);
      const fallbackNews = [{ title: "Tidak ada sinyal antena. Silakan periksa koneksi internet atau coba lagi nanti.", pubDate: "", source: "Sistem" }];
      setNewsList(fallbackNews);
      generateLiviaReaction(fallbackNews[0].title);
    } finally {
      setIsFetchingNews(false);
    }
  };

  const handleToggleTv = () => {
    if (!isTvOn) {
      setIsTvOn(true);
      if (newsList.length === 0) {
        fetchNews();
      } else {
        generateLiviaReaction(newsList[currentChannel].title);
      }
    } else {
      setIsTvOn(false);
      setLiviaComment("Yah, dimatiin. Padahal lagi seru.");
    }
  };

  const handleChangeChannel = () => {
    if (!isTvOn || newsList.length === 0) return;
    const nextChannel = (currentChannel + 1) % newsList.length;
    setCurrentChannel(nextChannel);
    generateLiviaReaction(newsList[nextChannel].title);
  };

  const generateLiviaReaction = (headline: string) => {
    if (!headline) return;
    const lowerHeadline = headline.toLowerCase();
    if (lowerHeadline.includes('korupsi') || lowerHeadline.includes('pidana')) {
      setLiviaComment("Duh, berita kriminal lagi. Dunia emang lagi nggak baik-baik aja ya...");
    } else if (lowerHeadline.includes('cuaca') || lowerHeadline.includes('hujan') || lowerHeadline.includes('gempa')) {
      setLiviaComment("Semoga semuanya aman-aman aja ya di sana.");
    } else if (lowerHeadline.includes('presiden') || lowerHeadline.includes('menteri') || lowerHeadline.includes('politik')) {
      setLiviaComment("Politik terus ah pusing liatnya! Ganti channel dong!");
    } else if (lowerHeadline.includes('ekonomi') || lowerHeadline.includes('harga') || lowerHeadline.includes('saham')) {
      setLiviaComment("Ekonomi naik turun... pantesan harga makanan di depan kos juga naik.");
    } else if (lowerHeadline.includes('timnas') || lowerHeadline.includes('menang') || lowerHeadline.includes('olahraga')) {
      setLiviaComment("Wah! Keren banget! Kamu suka ngikutin olahraga juga nggak?");
    } else {
      setLiviaComment("Oh, jadi gitu berita hari ini. Menarik juga...");
    }
  };

  if (loading) {
    return <LoadingScreen text="Memasuki Lounge..." />;
  }

  const currentNews = newsList[currentChannel];

  return (
    <div className="min-h-[100dvh] w-full bg-[#1b1c24] relative flex flex-col items-center justify-end overflow-hidden select-none font-sans">
      
      {/* Background Decor (Lounge wall) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Soft spot light from ceiling */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
        
        {/* TV Glow */}
        {isTvOn && (
          <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-400/20 rounded-[100px] blur-[80px] transition-opacity duration-1000 animate-pulse" />
        )}
      </div>

      {/* Top Header UI */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
        <Link 
          href="/home" 
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-[0_5px_15px_rgba(0,0,0,0.2)] group bg-[#2a2c38] border border-gray-700 hover:bg-[#ff758c] hover:border-pink-400"
        >
          <ChevronLeft className="text-gray-300 group-hover:text-white group-hover:-translate-x-1 transition-transform" />
        </Link>
        
        <div className="bg-[#2a2c38]/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-gray-700 flex items-center gap-2 shadow-lg">
          <Radio size={16} className="text-[#ff758c]" />
          <span className="font-bold text-gray-200 text-sm tracking-widest uppercase">Kos Lounge</span>
        </div>
      </div>

      {/* The TV Display */}
      <div className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-[90%] md:w-[700px] aspect-[16/9] z-10 perspective-1000">
        <div className="w-full h-full bg-[#0a0a0c] rounded-xl border-8 border-[#1f212a] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col items-center justify-center">
          
          {/* Bezel brand */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-700 tracking-widest">SAMSENG</div>
          
          {/* TV Screen Content */}
          <div className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isTvOn ? 'opacity-100' : 'opacity-0'}`}>
            {isFetchingNews ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-900/50">
                <RefreshCw className="text-cyan-400 animate-spin mb-4" size={32} />
                <p className="text-cyan-200 font-bold text-sm tracking-widest uppercase animate-pulse">Menghubungkan ke satelit...</p>
              </div>
            ) : currentNews ? (
              <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-950 relative">
                
                {/* News Interface */}
                <div className="absolute inset-0 flex flex-col justify-end">
                  
                  {/* Breaking News Banner */}
                  <div className="bg-red-600 px-4 py-1 flex items-center gap-2">
                    <span className="text-white font-black italic tracking-widest text-xs animate-pulse">BREAKING NEWS</span>
                  </div>
                  
                  {/* Headline */}
                  <div className="bg-white/95 px-6 py-4 border-l-8 border-red-600 shadow-2xl">
                    <h2 className="font-display font-black text-gray-900 text-lg md:text-2xl leading-tight">
                      {currentNews.title}
                    </h2>
                    <p className="text-gray-500 font-bold text-[10px] mt-2 uppercase tracking-wider">
                      {currentNews.source} • {currentNews.pubDate}
                    </p>
                  </div>
                  
                  {/* Ticker tape */}
                  <div className="bg-blue-600 text-white font-bold text-xs py-1.5 px-4 overflow-hidden whitespace-nowrap">
                    <span className="inline-block animate-[marquee_15s_linear_infinite]">{currentNews.title} • {currentNews.title} • {currentNews.title}</span>
                  </div>
                </div>
                
                {/* CRT Screen effects */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_2px,#000_4px)]" />
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_50%,#000_150%)]" />
              </div>
            ) : null}
          </div>

          {/* TV Off reflection */}
          {!isTvOn && (
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
          )}
        </div>
      </div>

      {/* TV Remote on the table (Bottom center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#2a2c38] p-3 rounded-full border border-gray-700 shadow-2xl flex gap-4 z-40">
        <button 
          onClick={handleToggleTv}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-inner ${isTvOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
        >
          <Power size={20} />
        </button>
        <button 
          onClick={handleChangeChannel}
          disabled={!isTvOn || isFetchingNews}
          className="w-12 h-12 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center transition-all hover:bg-gray-600 disabled:opacity-50 shadow-inner"
        >
          <Tv size={20} />
        </button>
      </div>

      {/* Sofa (Foreground element) */}
      <div className="absolute bottom-0 w-full max-w-[800px] h-32 md:h-48 z-10 pointer-events-none">
        <div className="w-full h-full bg-[#8c6f60] rounded-t-[3rem] md:rounded-t-[5rem] shadow-[inset_0_20px_30px_rgba(255,255,255,0.1),0_-10px_30px_rgba(0,0,0,0.3)] border-t-8 border-[#9e8070] relative">
          {/* Cushion lines */}
          <div className="absolute top-0 bottom-0 left-1/3 w-2 bg-[#755d50] shadow-inner" />
          <div className="absolute top-0 bottom-0 right-1/3 w-2 bg-[#755d50] shadow-inner" />
        </div>
      </div>

      {/* Livia Dialogue Commentary Bar (No Sprite) */}
      <div className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-xl transition-all duration-500">
        <div className="p-4 md:p-5 rounded-2xl bg-[#2a2c38]/95 backdrop-blur-xl border border-gray-700 shadow-2xl flex items-center gap-3 md:gap-4">
          <div className="bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-md shrink-0 uppercase tracking-wider">
            Livia
          </div>
          <p className="font-medium text-gray-200 text-xs md:text-sm leading-relaxed flex-1">
            "{liviaComment}"
          </p>
        </div>
      </div>

    </div>
  );
}
