'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  Gift,
  Sparkles,
  Target,
  Trophy,
  Heart,
  Flame,
  Calendar,
  Award,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { playSfx } from '@/lib/sfx';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  getDailyQuests,
  getTodayDateString,
  type DailyQuest,
} from '@/lib/livia/quests';
import { ReminderPanel, ShoppingPanel } from './ToolPanels';

/** Bentuk state quest dari server (M8.4). */
interface QuestServerState {
  date: string;
  quests: DailyQuest[];
  progress: Record<string, number>;
  claimedQuestIds: string[];
  claimedMilestones: number[];
  completedCount: number;
}

const LIVIA_QUEST_REACTIONS = [
  'Wah, satu misi berhasil kamu selesaikan! Keren banget~',
  'Bagus! Terus pertahankan kedisiplinan dan usahamu ya.',
  'Hebat! Nanti kalau kelar semua, aku seneng banget lho.',
  'Satu poin bertambah di progresmu hari ini! Semangat!',
  'Kamu makin rajin aja deh di kosan ini. Bagus banget!',
  'Hihi, hebat banget tetanggaku ini~ Jangan lupa istirahat ya.',
];

export default function DailyQuestsPage() {
  const { dict, language } = useLanguage();
  const router = useRouter();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
  const [liviaComment, setLiviaComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [claiming, setClaiming] = useState<string | number | null>(null);
  const [dateFormatted, setDateFormatted] = useState('');
  const [today, setToday] = useState(() => getTodayDateString());

  useEffect(() => {
    const todayStr = getTodayDateString();
    setToday(todayStr);
    setQuests(getDailyQuests(todayStr));

    const d = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    setDateFormatted(
      d.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', options)
    );

    let cancelled = false;

    fetch(`/api/quests?date=${encodeURIComponent(todayStr)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { state?: QuestServerState }) => {
        if (cancelled || !data.state) return;
        setQuests(data.state.quests);
        setProgressMap(data.state.progress);
        setClaimedIds(data.state.claimedQuestIds);
        setClaimedMilestones(data.state.claimedMilestones);
      })
      .catch(() => {
        /* fallback: quest dari katalog lokal, progress kosong */
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  const triggerLiviaReaction = (text?: string) => {
    playSfx('pop');
    const comment =
      text ||
      LIVIA_QUEST_REACTIONS[
        Math.floor(Math.random() * LIVIA_QUEST_REACTIONS.length)
      ];
    setLiviaComment(comment);
    setShowComment(true);
    setTimeout(() => setShowComment(false), 4500);
  };

  const applyServerState = (state: QuestServerState) => {
    setQuests(state.quests);
    setProgressMap(state.progress);
    setClaimedIds(state.claimedQuestIds);
    setClaimedMilestones(state.claimedMilestones);
  };

  const handleClaimQuest = async (quest: DailyQuest) => {
    if (claimedIds.includes(quest.id) || claiming !== null) return;

    setClaiming(quest.id);
    playSfx('chime');

    try {
      const res = await fetch('/api/quests/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: quest.id, date: today }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (body?.error) {
          triggerLiviaReaction(body.error);
          return;
        }
        throw new Error('claim_failed');
      }

      const data = (await res.json()) as {
        state: QuestServerState;
        rv?: number;
      };
      applyServerState(data.state);
      playSfx('chime');
      triggerLiviaReaction(
        `Misi diklaim! +15 Rv & +1 Poin Progres Misi Harian! 🌟`
      );
    } catch (e) {
      console.error('Failed to claim quest:', e);
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimMilestone = async (
    milestone: number,
    rewardRv: number,
    rewardAffection: number = 0
  ) => {
    if (
      claimedMilestones.includes(milestone) ||
      claimedIds.length < milestone ||
      claiming !== null
    )
      return;

    setClaiming(`milestone_${milestone}`);
    playSfx('chime');

    try {
      const res = await fetch('/api/quests/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: milestone, date: today }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (body?.error) {
          triggerLiviaReaction(body.error);
          return;
        }
        throw new Error('milestone_failed');
      }

      const data = (await res.json()) as {
        state: QuestServerState;
        rv?: number;
        affection?: number;
      };
      applyServerState(data.state);
      playSfx('pop');
      triggerLiviaReaction(
        `Pencapaian ${milestone} Misi berhasil diklaim! Kamu dapat +${rewardRv} Rv${
          rewardAffection > 0 ? ` & +${rewardAffection} Afeksi` : ''
        }! 🎁✨`
      );
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

  const completedCount = claimedIds.length;
  const progressPercent = Math.round((completedCount / 9) * 100);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'fokus':
        return {
          label: 'FOKUS',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'kesehatan':
        return {
          label: 'KESEHATAN',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'interaksi':
        return {
          label: 'LIVIA',
          bg: 'bg-pink-50 text-pink-700 border-pink-200',
        };
      case 'kosan':
      default:
        return {
          label: 'KOSAN',
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
        };
    }
  };

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col font-sans select-none overflow-x-hidden bg-[#fdfbf7] text-[#5c4d47] selection:bg-[#ff758c]/25 selection:text-[#5c4d47]">
      {/* Background Decor */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-pink-50/40 via-white/50 to-amber-50/30 z-0 pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-0 right-0 w-96 h-96 bg-pink-100/30 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl pointer-events-none"
      />

      {/* Top Header */}
      <header className="w-full px-5 py-6 md:px-10 md:py-8 flex items-center justify-between relative z-20 max-w-5xl mx-auto">
        <div className="flex items-center gap-3.5 md:gap-5">
          <Link
            href="/home"
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-white/90 hover:bg-white border border-pink-100 shadow-xs hover:shadow-md transition-all flex items-center justify-center text-[#5c4d47] hover:text-pink-600 group shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            title="Kembali ke Kamar Kos"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-0.5 transition-transform text-pink-500" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-display font-black text-2xl md:text-3xl text-[#5c4d47] tracking-tight flex items-center gap-2">
              <Calendar className="text-pink-600 w-6 h-6 md:w-7 md:h-7" />
              <span>{dict?.pages?.schedule?.title || 'Jadwal & Misi Harian'}</span>
            </h1>
            <p className="text-xs md:text-sm font-medium text-[#7a7268] flex items-center gap-2 mt-0.5">
              <Target size={14} className="text-pink-500" />
              <span>
                {dateFormatted ||
                  (language === 'en'
                    ? 'Daily Automatic Quests'
                    : 'Misi Otomatis Setiap Hari')}
              </span>
              <span>•</span>
              <span className="text-pink-600 font-bold font-mono">
                {language === 'en' ? 'Resets 00:00' : 'Reset pk 00:00'}
              </span>
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="hidden sm:flex items-center gap-2.5 bg-white/90 backdrop-blur-xl border border-pink-100 px-5 py-2.5 rounded-2xl shadow-xs">
          <Flame className="text-orange-500 animate-pulse" size={20} />
          <div className="text-right">
            <span className="text-[10px] text-[#7a7268] block font-mono font-bold tracking-wider">
              {language === 'en' ? 'PROGRESS POINTS' : 'POIN PROGRES'}
            </span>
            <div className="font-mono tabular-nums leading-none mt-0.5">
              <span className="text-xl font-black text-pink-600">
                {completedCount}
              </span>
              <span className="text-xs font-bold text-[#7a7268]"> / 9</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 pb-24 relative z-20 flex flex-col gap-6">
        {/* Milestone Rewards Banner */}
        <section className="bg-white/95 backdrop-blur-xl border border-pink-100/90 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(255,117,140,0.06)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg md:text-xl font-display font-black text-[#5c4d47] flex items-center gap-2">
                <Trophy className="text-amber-500" size={22} />
                <span>Hadiah Milestone Progres</span>
              </h2>
              <p className="text-xs md:text-sm text-[#7a7268] mt-1">
                Selesaikan dan klaim misi di bawah untuk menambah poin progres ke bar ini!
              </p>
            </div>
            <div className="sm:hidden flex items-center justify-between bg-pink-50/90 px-4 py-2 rounded-xl border border-pink-100">
              <span className="text-xs font-bold text-[#7a7268]">Poin Progres</span>
              <span className="text-base font-black text-pink-600 font-mono tabular-nums">
                {completedCount} / 9
              </span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="relative w-full h-3.5 bg-pink-50 rounded-full mb-8 overflow-hidden border border-pink-100">
            <div
              className="h-full bg-gradient-to-r from-pink-400 via-[#ff758c] to-amber-400 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Milestone Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Milestone 3 */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                claimedMilestones.includes(3)
                  ? 'bg-stone-50 border-stone-200/80 opacity-60'
                  : completedCount >= 3
                  ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-1 ring-amber-300'
                  : 'bg-white border-pink-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                    claimedMilestones.includes(3)
                      ? 'bg-stone-200 text-stone-600'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  3★
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-[#7a7268] block">
                    3 Poin Progres
                  </span>
                  <span className="font-mono font-bold text-sm text-amber-800 flex items-center gap-1">
                    <Gift size={15} /> 100 Rv
                  </span>
                </div>
              </div>
              <div>
                {claimedMilestones.includes(3) ? (
                  <span className="text-xs font-bold text-[#7a7268] bg-stone-200/70 px-3 py-1.5 rounded-xl flex items-center gap-1 font-mono">
                    <Check size={14} /> Diklaim
                  </span>
                ) : completedCount >= 3 ? (
                  <button
                    onClick={() => handleClaimMilestone(3, 100)}
                    disabled={claiming !== null}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={14} /> Klaim!
                  </button>
                ) : (
                  <span className="text-xs font-bold text-[#b0a8a0] px-3 py-1.5 font-mono">
                    Terkunci
                  </span>
                )}
              </div>
            </div>

            {/* Milestone 6 */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                claimedMilestones.includes(6)
                  ? 'bg-stone-50 border-stone-200/80 opacity-60'
                  : completedCount >= 6
                  ? 'bg-pink-50/80 border-pink-300 shadow-sm ring-1 ring-pink-300'
                  : 'bg-white border-pink-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                    claimedMilestones.includes(6)
                      ? 'bg-stone-200 text-stone-600'
                      : 'bg-pink-100 text-pink-800'
                  }`}
                >
                  6★
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-[#7a7268] block">
                    6 Poin Progres
                  </span>
                  <span className="font-mono font-bold text-sm text-pink-700 flex items-center gap-1">
                    <Gift size={15} /> 300 Rv
                  </span>
                </div>
              </div>
              <div>
                {claimedMilestones.includes(6) ? (
                  <span className="text-xs font-bold text-[#7a7268] bg-stone-200/70 px-3 py-1.5 rounded-xl flex items-center gap-1 font-mono">
                    <Check size={14} /> Diklaim
                  </span>
                ) : completedCount >= 6 ? (
                  <button
                    onClick={() => handleClaimMilestone(6, 300)}
                    disabled={claiming !== null}
                    className="bg-gradient-to-r from-[#ff758c] to-[#ff0844] hover:opacity-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={14} /> Klaim!
                  </button>
                ) : (
                  <span className="text-xs font-bold text-[#b0a8a0] px-3 py-1.5 font-mono">
                    Terkunci
                  </span>
                )}
              </div>
            </div>

            {/* Milestone 9 */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                claimedMilestones.includes(9)
                  ? 'bg-stone-50 border-stone-200/80 opacity-60'
                  : completedCount >= 9
                  ? 'bg-rose-50/80 border-rose-300 shadow-sm ring-1 ring-rose-300'
                  : 'bg-white border-pink-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                    claimedMilestones.includes(9)
                      ? 'bg-stone-200 text-stone-600'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  9★
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-[#7a7268] block">
                    9 Poin Progres
                  </span>
                  <span className="font-mono font-bold text-sm text-rose-800 flex items-center gap-1">
                    <Award size={15} /> 500 Rv{' '}
                    <span className="text-pink-600 flex items-center ml-1">
                      <Heart size={12} className="fill-pink-500 mr-0.5" />
                      +3
                    </span>
                  </span>
                </div>
              </div>
              <div>
                {claimedMilestones.includes(9) ? (
                  <span className="text-xs font-bold text-[#7a7268] bg-stone-200/70 px-3 py-1.5 rounded-xl flex items-center gap-1 font-mono">
                    <Check size={14} /> Diklaim
                  </span>
                ) : completedCount >= 9 ? (
                  <button
                    onClick={() => handleClaimMilestone(9, 500, 3)}
                    disabled={claiming !== null}
                    className="bg-gradient-to-r from-[#ff758c] via-rose-500 to-amber-500 hover:opacity-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={14} /> Klaim Spesial!
                  </button>
                ) : (
                  <span className="text-xs font-bold text-[#b0a8a0] px-3 py-1.5 font-mono">
                    Terkunci
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Tool Panels — Pengingat & Belanja */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReminderPanel />
          <ShoppingPanel />
        </section>

        {/* Quests List */}
        <section className="bg-white/95 backdrop-blur-xl border border-pink-100/90 rounded-3xl p-6 md:p-8 shadow-[0_10px_30px_rgba(255,117,140,0.06)]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-pink-100/60">
            <div>
              <h3 className="font-display font-black text-lg md:text-xl text-[#5c4d47] flex items-center gap-2">
                <span>Daftar Misi Hari Ini</span>
                <span className="text-[11px] font-mono font-bold bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-0.5 rounded-full">
                  9 MISI
                </span>
              </h3>
              <p className="text-xs text-[#7a7268] mt-1">
                Selesaikan tugas harian untuk membuka klaim. Setiap misi memberi +15 Rv & +1 Poin Progres!
              </p>
            </div>
            <span className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100 hidden sm:block">
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
                      ? 'bg-stone-50/70 border-stone-200/70 shadow-inner opacity-75'
                      : isReady
                      ? 'bg-gradient-to-r from-pink-50/90 via-white to-amber-50/60 border-pink-300 shadow-sm ring-1 ring-pink-300/40'
                      : 'bg-white border-pink-100/80 hover:border-pink-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Status Icon (No animate-bounce) */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all shrink-0 font-mono font-black text-sm ${
                        isClaimed
                          ? 'bg-stone-200 border-stone-300 text-stone-600'
                          : isReady
                          ? 'bg-gradient-to-r from-[#ff758c] to-[#ff0844] border-transparent text-white shadow-xs animate-pulse'
                          : 'border-pink-200 bg-pink-50/60 text-pink-700'
                      }`}
                    >
                      {isClaimed ? (
                        <CheckCircle2 size={20} />
                      ) : isReady ? (
                        <Gift size={20} />
                      ) : (
                        `#0${index + 1}`
                      )}
                    </div>

                    {/* Quest Text & Progress */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#7a7268] tabular-nums">
                          {language === 'en' ? 'Progress:' : 'Progres:'}{' '}
                          {Math.min(currentVal, quest.required)} /{' '}
                          {quest.required}
                        </span>
                      </div>
                      <span
                        className={`text-sm md:text-base font-medium transition-all ${
                          isClaimed
                            ? 'line-through text-[#a8a199] italic'
                            : 'text-[#5c4d47] font-semibold'
                        }`}
                      >
                        {quest.text}
                      </span>
                    </div>
                  </div>

                  {/* Action / Claim Button */}
                  <div className="shrink-0 sm:text-right flex items-center justify-end">
                    {isClaimed ? (
                      <span className="text-xs font-mono font-bold text-[#7a7268] bg-stone-200/70 px-4 py-2 rounded-xl flex items-center gap-1.5">
                        <Check size={16} />{' '}
                        {language === 'en' ? 'Claimed' : 'Diklaim'}
                      </span>
                    ) : isReady ? (
                      <button
                        onClick={() => handleClaimQuest(quest)}
                        disabled={claiming !== null}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#ff758c] to-[#ff0844] hover:opacity-95 text-white font-bold text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <Sparkles size={16} />{' '}
                        {language === 'en'
                          ? 'Claim +15 Rv!'
                          : 'Klaim +15 Rv!'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGoToMission(quest.targetRoute)}
                        className="w-full sm:w-auto bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 hover:border-pink-300 font-bold text-xs px-4 py-2 rounded-xl shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{language === 'en' ? 'Go' : 'Kerjakan'}</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Floating Livia Comment Popup with Chibi Avatar */}
      {showComment && (
        <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out] max-w-sm">
          <div className="bg-white/95 backdrop-blur-xl border border-pink-200 p-4 rounded-3xl shadow-xl flex items-start gap-3">
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-pink-100 shrink-0 border border-pink-200 shadow-2xs">
              <Image
                src="/livia/chibi-livia.webp"
                alt="Livia"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xs text-pink-600 uppercase tracking-wider">
                  Livia
                </span>
                <span className="text-[10px] font-mono text-[#a8a199]">
                  Baru saja
                </span>
              </div>
              <p className="text-xs md:text-sm font-medium text-[#5c4d47] leading-snug mt-0.5">
                &ldquo;{liviaComment}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
