'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Check, Gift, Sparkles, Target, Trophy, Heart, Flame, Calendar, Award, ArrowRight, CheckCircle2 } from 'lucide-react';
import { playSfx } from '@/lib/sfx';
import { 
  getDailyQuests, 
  getQuestProgressMap,
  getClaimedQuests, 
  claimQuestReward, 
  getClaimedMilestones, 
  claimMilestone, 
  DailyQuest,
  getTodayDateString 
} from '@/lib/livia/quests';

const LIVIA_QUEST_REACTIONS = [
  "Wah, satu misi berhasil kamu selesaikan! Keren banget~",
  "Bagus! Terus pertahankan kedisiplinan dan usahamu ya.",
  "Hebat! Nanti kalau kelar semua, aku seneng banget lho.",
  "Satu poin bertambah di progresmu hari ini! Semangat!",
  "Kamu makin rajin aja deh di kosan ini. Bagus banget!",
  "Hihi, hebat banget tetanggaku ini~ Jangan lupa istirahat ya."
];

export default function DailyQuestsPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
  const [liviaComment, setLiviaComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [claiming, setClaiming] = useState<string | number | null>(null);
  const [dateFormatted, setDateFormatted] = useState('');

  useEffect(() => {
    const todayStr = getTodayDateString();
    setQuests(getDailyQuests(todayStr));
    setProgressMap(getQuestProgressMap(todayStr));
    setClaimedIds(getClaimedQuests(todayStr));
    setClaimedMilestones(getClaimedMilestones(todayStr));

    const d = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setDateFormatted(d.toLocaleDateString('id-ID', options));

    const handleProgressUpdate = (e: any) => {
      if (e.detail?.progress) setProgressMap(e.detail.progress);
    };
    const handleClaimedUpdate = (e: any) => {
      if (e.detail?.claimed) setClaimedIds(e.detail.claimed);
    };
    const handleMilestonesUpdate = (e: any) => {
      if (e.detail?.claimed) setClaimedMilestones(e.detail.claimed);
    };

    window.addEventListener('daily_quests_updated', handleProgressUpdate);
    window.addEventListener('daily_quests_claimed', handleClaimedUpdate);
    window.addEventListener('daily_milestones_updated', handleMilestonesUpdate);
    return () => {
      window.removeEventListener('daily_quests_updated', handleProgressUpdate);
      window.removeEventListener('daily_quests_claimed', handleClaimedUpdate);
      window.removeEventListener('daily_milestones_updated', handleMilestonesUpdate);
    };
  }, []);

  const triggerLiviaReaction = (text?: string) => {
    playSfx('pop');
    const comment = text || LIVIA_QUEST_REACTIONS[Math.floor(Math.random() * LIVIA_QUEST_REACTIONS.length)];
    setLiviaComment(comment);
    setShowComment(true);
    setTimeout(() => setShowComment(false), 4500);
  };

  const handleClaimQuest = async (quest: DailyQuest) => {
    if (claimedIds.includes(quest.id) || claiming !== null) return;
    
    setClaiming(quest.id);
    playSfx('chime');

    try {
      // 1. Berikan reward per misi (+15 Rv)
      await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earnedRv: 15, jobId: `quest_${quest.id}` })
      });

      // 2. Simpan status klaim misi (menguatkan poin milestone progres +1)
      claimQuestReward(quest.id);
      playSfx('chime');
      triggerLiviaReaction(`Misi diklaim! +15 Rv & +1 Poin Progres Misi Harian! 🌟`);
    } catch (e) {
      console.error('Failed to claim quest:', e);
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimMilestone = async (milestone: number, rewardRv: number, rewardAffection: number = 0) => {
    if (claimedMilestones.includes(milestone) || claimedIds.length < milestone || claiming !== null) return;
    
    setClaiming(`milestone_${milestone}`);
    playSfx('chime');

    try {
      await fetch('/api/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earnedRv: rewardRv, jobId: `daily_milestone_${milestone}` })
      });

      if (rewardAffection > 0) {
        await fetch('/api/affection', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta: rewardAffection, reason: `daily_milestone_${milestone}` })
        });
      }

      claimMilestone(milestone);
      playSfx('pop');
      triggerLiviaReaction(`Pencapaian ${milestone} Misi berhasil diklaim! Kamu dapat +${rewardRv} Rv${rewardAffection > 0 ? ` & +${rewardAffection} Afeksi` : ''}! 🎁✨`);
    } catch (e) {
      console.error('Failed to claim milestone reward:', e);
    } finally {
      setClaiming(null);
    }
  };

  const handleGoToMission = (route: string) => {
    playSfx('click');
    router.push(route);
  };

  // Jumlah poin progres utama berdasarkan misi yang SUDAH DIKLAIM
  const completedCount = claimedIds.length;
  const progressPercent = Math.round((completedCount / 9) * 100);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'fokus': return { label: 'FOKUS', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'kesehatan': return { label: 'KESEHATAN', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'interaksi': return { label: 'LIVIA', bg: 'bg-pink-100 text-pink-800 border-pink-300' };
      case 'kosan': default: return { label: 'KOSAN', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
  };

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col font-sans select-none overflow-x-hidden bg-[#fdfbf7] text-[#5c4d47]">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 via-white to-amber-50/30 z-0 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top Header */}
      <div className="w-full p-6 md:p-10 flex items-center justify-between relative z-20 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 md:gap-6">
          <Link 
            href="/home" 
            className="bg-white border border-pink-200 w-12 h-12 rounded-2xl flex items-center justify-center text-[#5c4d47] shadow-sm hover:scale-105 hover:border-pink-400 hover:bg-pink-50 transition-all group shrink-0"
          >
            <ChevronLeft className="group-hover:-translate-x-1 transition-transform text-pink-500" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-display font-black text-2xl md:text-4xl text-[#5c4d47] tracking-tight flex items-center gap-2">
              <Calendar className="text-pink-500" size={32} />
              Jadwal & Misi Harian
            </h1>
            <p className="text-xs md:text-sm font-medium text-gray-500 flex items-center gap-2 mt-0.5">
              <Target size={14} className="text-pink-400" />
              {dateFormatted || 'Misi Otomatis Setiap Hari'} • <span className="text-pink-600 font-bold">Reset pk 00:00</span>
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-white/90 border border-pink-200 px-5 py-2.5 rounded-2xl shadow-sm">
          <Flame className="text-orange-500 animate-pulse" size={20} />
          <div className="text-right font-mono">
            <span className="text-xs text-gray-400 block -mb-1 font-sans font-semibold">POIN PROGRES MISI</span>
            <span className="text-xl font-black text-pink-600">{completedCount}</span>
            <span className="text-sm font-bold text-gray-400"> / 9 Poin</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 pb-24 relative z-20 flex flex-col gap-6">
        
        {/* Milestone Rewards Banner */}
        <div className="bg-white/95 backdrop-blur-md border-2 border-pink-200 rounded-3xl p-6 md:p-8 shadow-[0_15px_30px_rgba(255,117,140,0.08)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-pink-100/60 to-transparent rounded-bl-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg md:text-xl font-bold font-display text-[#5c4d47] flex items-center gap-2">
                <Trophy className="text-amber-500" size={22} />
                Hadiah Milestone Progres
              </h2>
              <p className="text-xs md:text-sm text-gray-500">
                Selesaikan dan klaim misi di bawah untuk menambah poin progres ke bar ini!
              </p>
            </div>
            <div className="sm:hidden flex items-center justify-between bg-pink-50/80 px-4 py-2 rounded-xl">
              <span className="text-xs font-bold text-gray-500">Poin Progres</span>
              <span className="text-base font-black text-pink-600 font-mono">{completedCount} / 9</span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="relative w-full h-4 bg-gray-100 rounded-full mb-8 overflow-hidden border border-gray-200/60">
            <div 
              className="h-full bg-gradient-to-r from-pink-400 via-[#ff758c] to-amber-400 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Milestone Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Milestone 3 */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              claimedMilestones.includes(3) 
                ? 'bg-gray-50 border-gray-200 opacity-60' 
                : completedCount >= 3 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-md ring-2 ring-amber-300/50 animate-pulse' 
                : 'bg-white border-pink-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  claimedMilestones.includes(3) ? 'bg-gray-200 text-gray-500' : 'bg-amber-100 text-amber-700'
                }`}>
                  3★
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 block">3 Poin Progres</span>
                  <span className="font-display font-black text-sm md:text-base text-amber-600 flex items-center gap-1">
                    <Gift size={16} /> 100 Rv
                  </span>
                </div>
              </div>
              <div>
                {claimedMilestones.includes(3) ? (
                  <span className="text-xs font-bold text-gray-400 bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <Check size={14} /> Diklaim
                  </span>
                ) : completedCount >= 3 ? (
                  <button 
                    onClick={() => handleClaimMilestone(3, 100)}
                    disabled={claiming !== null}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={14} /> Klaim!
                  </button>
                ) : (
                  <span className="text-xs font-bold text-gray-300 px-3 py-1.5">Belum Terbuka</span>
                )}
              </div>
            </div>

            {/* Milestone 6 */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              claimedMilestones.includes(6) 
                ? 'bg-gray-50 border-gray-200 opacity-60' 
                : completedCount >= 6 
                ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-300 shadow-md ring-2 ring-pink-300/50 animate-pulse' 
                : 'bg-white border-pink-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  claimedMilestones.includes(6) ? 'bg-gray-200 text-gray-500' : 'bg-pink-100 text-pink-700'
                }`}>
                  6★
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 block">6 Poin Progres</span>
                  <span className="font-display font-black text-sm md:text-base text-pink-600 flex items-center gap-1">
                    <Gift size={16} /> 300 Rv
                  </span>
                </div>
              </div>
              <div>
                {claimedMilestones.includes(6) ? (
                  <span className="text-xs font-bold text-gray-400 bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <Check size={14} /> Diklaim
                  </span>
                ) : completedCount >= 6 ? (
                  <button 
                    onClick={() => handleClaimMilestone(6, 300)}
                    disabled={claiming !== null}
                    className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={14} /> Klaim!
                  </button>
                ) : (
                  <span className="text-xs font-bold text-gray-300 px-3 py-1.5">Belum Terbuka</span>
                )}
              </div>
            </div>

            {/* Milestone 9 */}
            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              claimedMilestones.includes(9) 
                ? 'bg-gray-50 border-gray-200 opacity-60' 
                : completedCount >= 9 
                ? 'bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border-purple-300 shadow-lg ring-2 ring-purple-300/50 animate-pulse' 
                : 'bg-white border-pink-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  claimedMilestones.includes(9) ? 'bg-gray-200 text-gray-500' : 'bg-purple-100 text-purple-700'
                }`}>
                  9★
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 block">9 Poin Progres</span>
                  <span className="font-display font-black text-sm md:text-base text-purple-600 flex items-center gap-1">
                    <Award size={16} /> 500 Rv <span className="text-pink-500 flex items-center"><Heart size={12} className="fill-pink-500 ml-1" />+3</span>
                  </span>
                </div>
              </div>
              <div>
                {claimedMilestones.includes(9) ? (
                  <span className="text-xs font-bold text-gray-400 bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <Check size={14} /> Diklaim
                  </span>
                ) : completedCount >= 9 ? (
                  <button 
                    onClick={() => handleClaimMilestone(9, 500, 3)}
                    disabled={claiming !== null}
                    className="bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 hover:opacity-90 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={14} /> Klaim Spesial!
                  </button>
                ) : (
                  <span className="text-xs font-bold text-gray-300 px-3 py-1.5">Belum Terbuka</span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Quest List */}
        <div className="bg-white/95 backdrop-blur-md border border-pink-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h3 className="font-display font-black text-lg md:text-xl text-[#5c4d47] flex items-center gap-2">
                <span>Daftar Misi Hari Ini</span>
                <span className="text-xs font-bold bg-pink-100 text-pink-600 px-2.5 py-0.5 rounded-full font-mono">9 MISI</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Selesaikan tugas untuk membuka tombol klaim. Setiap misi yang diklaim memberi +15 Rv & +1 Poin Progres!
              </p>
            </div>
            <span className="text-xs font-bold text-pink-500 bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100 hidden sm:block">
              Sistem Otomatis ⚡
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {quests.map((quest, index) => {
              const currentVal = progressMap[quest.targetAction] || 0;
              const isReady = currentVal >= quest.required;
              const isClaimed = claimedIds.includes(quest.id);
              const badge = getCategoryBadge(quest.category);

              return (
                <div 
                  key={quest.id}
                  className={`group relative p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isClaimed 
                      ? 'bg-gray-50/70 border-gray-200/60 shadow-inner opacity-75' 
                      : isReady
                      ? 'bg-gradient-to-r from-pink-50/80 via-white to-amber-50/60 border-pink-300 shadow-md ring-1 ring-pink-300/40'
                      : 'bg-white border-gray-200/80 hover:border-pink-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all shrink-0 font-mono font-black text-sm ${
                      isClaimed 
                        ? 'bg-gray-200 border-gray-300 text-gray-500' 
                        : isReady
                        ? 'bg-[#ff758c] border-[#ff758c] text-white shadow-md animate-bounce'
                        : 'border-pink-200 bg-pink-50/50 text-pink-600'
                    }`}>
                      {isClaimed ? <CheckCircle2 size={20} /> : isReady ? <Gift size={20} /> : `#0${index + 1}`}
                    </div>

                    {/* Quest Text & Progress */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-bold text-gray-400 font-mono">
                          Progres: {Math.min(currentVal, quest.required)} / {quest.required}
                        </span>
                      </div>
                      <span className={`text-sm md:text-base font-medium transition-all ${
                        isClaimed ? 'line-through text-gray-400 italic' : 'text-[#5c4d47] font-semibold'
                      }`}>
                        {quest.text}
                      </span>
                    </div>
                  </div>

                  {/* Action / Claim Button */}
                  <div className="shrink-0 sm:text-right flex items-center justify-end">
                    {isClaimed ? (
                      <span className="text-xs font-bold text-gray-400 bg-gray-200 px-4 py-2 rounded-xl flex items-center gap-1.5">
                        <Check size={16} /> Diklaim
                      </span>
                    ) : isReady ? (
                      <button 
                        onClick={() => handleClaimQuest(quest)}
                        disabled={claiming !== null}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#ff758c] to-amber-500 hover:from-[#ff6078] hover:to-amber-600 text-white font-black text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <Sparkles size={16} /> Klaim +15 Rv!
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleGoToMission(quest.targetRoute)}
                        className="w-full sm:w-auto bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 hover:border-pink-400 font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Kerjakan</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Floating Livia Comment Popup */}
      {showComment && (
        <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out] max-w-sm">
          <div className="bg-white/95 backdrop-blur-xl border-2 border-[#ff758c] p-4 rounded-2xl shadow-2xl flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0 border border-pink-300 text-lg">
              🌸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#ff758c] uppercase tracking-wider font-mono">Livia</span>
                <span className="text-[10px] text-gray-400">Baru saja</span>
              </div>
              <p className="text-sm font-medium text-[#5c4d47] leading-snug mt-0.5">
                "{liviaComment}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
