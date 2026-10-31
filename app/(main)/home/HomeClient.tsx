'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Clock, BookOpen, MapPin, Menu } from 'lucide-react';
import type { LiviaExpression } from '@/lib/gemini';
import { getAffectionLevel } from '@/lib/livia/affection';
import { recordQuestAction } from '@/lib/livia/quests';
import ApiGuideModal from '@/components/guide/ApiGuideModal';
import { playSfx } from '@/lib/sfx';
import { preloadLiviaSprites } from '@/lib/preloader';
import DailyStampModal from '@/components/daily/DailyStampModal';
import { unlockAchievement } from '@/lib/achievements';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getCycleInfo, computePsychStats, type LiviaStats } from '@/features/home/cycle';
import { getGreeting, type Weather } from '@/features/home/greeting';
import { getTouchReaction, type BodyPart } from '@/features/home/touch-interactions';
import { MobileNavBtn } from '@/features/home/MenuCards';
import { CommandMenus } from '@/features/home/CommandMenus';
import { MoreMenusModal, MiniEventModal } from '@/features/home/HomeModals';
import { StatIsland, MobileStatsModal, type StatItem } from '@/features/home/StatsDisplay';
import TopHud from '@/features/home/TopHud';
import HomeBackdrop from '@/features/home/HomeBackdrop';
import { updateAffection } from '@/lib/actions';

interface HomeClientProps {
  initialAffection: number;
  userName: string;
  initialItemsBrought: string[];
  initialOutfit: string;
}

const DEFAULT_STATS: LiviaStats = {
  hunger: 100,
  energy: 100,
  hydration: 100,
  cycleAnchor: new Date().toISOString(),
};

export default function HomeClient({
  initialAffection,
  userName,
  initialItemsBrought,
  initialOutfit,
}: HomeClientProps) {
  const { dict, language } = useLanguage();
  const [sessionTime, setSessionTime] = useState(0);
  const [affection, setAffection] = useState(initialAffection);
  const [itemsBrought] = useState(initialItemsBrought);
  const [outfit, setOutfit] = useState(initialOutfit);
  const [money, setMoney] = useState(0);
  const pendingTouchDelta = useRef(0);
  const touchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [greetingData, setGreetingData] = useState<{
    text: string;
    expression: LiviaExpression;
    isInvitingOut?: boolean;
    invitedPlace?: string;
  }>({
    text: 'Memuat...',
    expression: 'normal',
  });
  const [interactionOverride, setInteractionOverride] = useState<{
    text: string;
    expression: LiviaExpression;
  } | null>(null);
  const [liviaStats, setLiviaStats] = useState<LiviaStats>(DEFAULT_STATS);
  const [weather, setWeather] = useState<Weather>(null);

  const [showEvent, setShowEvent] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);

  const syncTouchAffection = (delta: number) => {
    pendingTouchDelta.current += delta;
    if (touchDebounceTimer.current) clearTimeout(touchDebounceTimer.current);
    touchDebounceTimer.current = setTimeout(() => {
      const d = pendingTouchDelta.current;
      if (d === 0) return;
      pendingTouchDelta.current = 0;
      void updateAffection(d, 'interaction_touch').catch(console.error);
    }, 400);
  };

  useEffect(() => {
    if (affection >= 50) unlockAchievement('affection_50');
    if (affection >= 80) unlockAchievement('affection_80');
    if (money >= 1000) unlockAchievement('rich_1000');
  }, [affection, money]);

  useEffect(() => {
    preloadLiviaSprites();
    let resolvedStats = DEFAULT_STATS;

    Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current_weather=true')
        .then((res) => res.json())
        .catch(() => null),
      fetch(`/api/affection?t=${Date.now()}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([weatherData, userD]) => {
      let resolvedWeather: Weather = null;
      if (weatherData && weatherData.current_weather) {
        resolvedWeather = weatherData.current_weather;
        setWeather(resolvedWeather);
      }

      if (userD) {
        setMoney(userD.money || 0);
        if (userD.activeOutfit) setOutfit(userD.activeOutfit);
        if (userD.liviaStats) {
          resolvedStats = userD.liviaStats;
          setLiviaStats(userD.liviaStats);
        }
      }

      const phase = getCycleInfo(resolvedStats.cycleAnchor).phase;
      setGreetingData(
        getGreeting(
          initialAffection,
          initialItemsBrought,
          { ...resolvedStats, cyclePhase: phase },
          userName,
          resolvedWeather
        )
      );
    });
  }, [initialAffection, initialItemsBrought, userName]);

  const handleInteract = async (part: BodyPart) => {
    playSfx('pop');
    recordQuestAction('touch_livia');

    const reaction = getTouchReaction(getCycleInfo(liviaStats.cycleAnchor).phase, part, userName);

    setInteractionOverride({ text: reaction.text, expression: reaction.expression });
    setShowEvent(false);

    setAffection((prev) => Math.min(100, Math.max(0, prev + reaction.affectionChange)));
    syncTouchAffection(reaction.affectionChange);

    const globalObj = window as unknown as { interactionTimeout?: ReturnType<typeof setTimeout> };
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
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.sessionId) sessionId = d.sessionId;
      });

    const timer = setInterval(() => setSessionTime((prev) => prev + 1), 1000);

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

  const { text: greeting, expression, isInvitingOut, invitedPlace } = greetingData;

  useEffect(() => {
    localStorage.setItem('liviaExpression', expression);
  }, [expression]);

  const displayGreeting = interactionOverride ? interactionOverride.text : greeting;
  const displayExpression = interactionOverride ? interactionOverride.expression : expression;

  const sessionMinutes = Math.floor(sessionTime / 60);
  const levelInfo = getAffectionLevel(affection);
  const cycle = getCycleInfo(liviaStats.cycleAnchor);
  const { stress, mood, tolerance } = computePsychStats(liviaStats, affection, cycle);

  const physicalStats: StatItem[] = [
    { value: liviaStats.hunger, label: 'Makan' },
    { value: liviaStats.energy, label: 'Energi' },
    { value: liviaStats.hydration, label: 'Minum' },
  ];
  const psychStats: StatItem[] = [
    { value: mood, label: 'Mood' },
    { value: stress, label: 'Stres' },
    { value: tolerance, label: 'Sabar' },
  ];

  const hasSunglasses =
    itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses');
  const hasRecipeBook =
    itemsBrought.includes('recipe_book') || itemsBrought.includes('recipe_book_shop');
  const showDate = isInvitingOut || (affection >= 40 && hasSunglasses);

  // Border & Glow balon chat reaktif terhadap ekspresi
  const bubbleBorderClass =
    displayExpression === 'angry'
      ? 'border-red-200/90 shadow-[0_12px_40px_rgba(239,68,68,0.15)]'
      : displayExpression === 'blushing'
      ? 'border-pink-200/90 shadow-[0_12px_40px_rgba(244,114,182,0.18)]'
      : displayExpression === 'clingy'
      ? 'border-purple-200/90 shadow-[0_12px_40px_rgba(167,139,250,0.18)]'
      : displayExpression === 'happy'
      ? 'border-amber-200/90 shadow-[0_12px_40px_rgba(251,191,36,0.18)]'
      : 'border-white/80 shadow-[0_12px_40px_rgba(255,117,140,0.12)]';

  const bubbleDotClass =
    displayExpression === 'angry'
      ? 'bg-red-400'
      : displayExpression === 'blushing'
      ? 'bg-pink-400 animate-pulse'
      : displayExpression === 'clingy'
      ? 'bg-purple-400'
      : displayExpression === 'happy'
      ? 'bg-amber-400'
      : 'bg-pink-300';

  const bubbleTextClass =
    displayExpression === 'angry'
      ? 'text-red-700'
      : displayExpression === 'blushing'
      ? 'text-pink-900'
      : 'text-[#5c4d47]';

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-[#fdfbf7] select-none font-sans selection:bg-[#ff758c]/25 selection:text-[#5c4d47]">
      <ApiGuideModal showFloatingButton={false} />
      <DailyStampModal />

      {/* Latar + karakter + hitbox sentuh */}
      <HomeBackdrop
        displayExpression={displayExpression}
        outfit={outfit}
        onInteract={handleInteract}
      />

      {/* ─────────── HUD LAYER ─────────── */}
      <div className="absolute inset-0 z-20 pointer-events-none p-4 sm:p-6 md:p-10 flex flex-col justify-between">
        {/* Baris atas: panel pemain + dompet */}
        <TopHud
          userName={userName}
          sessionMinutes={sessionMinutes}
          affection={affection}
          level={levelInfo.level}
          levelName={levelInfo.name}
          money={money}
          moneyLabel={dict.stats.money}
          onShowMobileStats={() => setShowMobileStats(true)}
        />

        {/* Baris bawah */}
        <div className="flex-1 relative w-full pointer-events-none">
          <div className="absolute bottom-[4.5rem] left-0 right-0 md:bottom-8 md:left-0 md:right-auto md:w-[540px] z-50 flex flex-col gap-3 pointer-events-auto">
            {/* Stat Island Desktop */}
            <StatIsland physical={physicalStats} psych={psychStats} cycle={cycle} />

            {/* Signature VN Dialogue Box */}
            <div className="origin-bottom-left relative pt-3">
              {/* VN Nameplate Pill */}
              <div className="absolute top-0 left-6 inline-flex items-center gap-2 rounded-full border border-white bg-gradient-to-r from-[#ff0844] to-[#ffb199] px-4 py-1 shadow-[0_4px_16px_rgba(255,117,140,0.35)] z-20">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                <span className="font-display text-xs font-black uppercase tracking-widest text-white">
                  Livia
                </span>
              </div>

              {/* Dialogue Box Container */}
              <div
                className={`relative bg-white/92 backdrop-blur-2xl px-6 py-5 md:px-8 md:py-6 rounded-[2rem] md:rounded-[2.5rem] md:rounded-bl-xl border-2 transition-all duration-500 shadow-[0_12px_40px_rgba(255,117,140,0.12)] ${bubbleBorderClass}`}
              >
                <span
                  className={`absolute top-4 right-4 w-2 h-2 rounded-full transition-colors duration-500 ${bubbleDotClass}`}
                />

                <p
                  className={`font-sans font-medium text-sm md:text-base leading-relaxed transition-colors duration-300 pr-4 ${bubbleTextClass}`}
                >
                  &ldquo;{displayGreeting}&rdquo;
                </p>

                {/* Subtly bouncing next indicator */}
                <div className="mt-2 flex items-center justify-end">
                  <span className="text-pink-400 text-xs animate-pulse font-serif select-none">
                    ✧
                  </span>
                </div>

                {isInvitingOut && !interactionOverride && (
                  <button
                    onClick={() => setShowEvent(true)}
                    className="mt-3 md:mt-4 w-full py-2.5 md:py-3 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold md:font-black text-sm md:text-base rounded-2xl shadow-[0_4px_16px_rgba(255,117,140,0.35)] hover:shadow-[0_8px_24px_rgba(255,117,140,0.45)] hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  >
                    <MapPin size={16} /> {language === 'en' ? "Sure, let's go!" : 'Boleh, ayo!'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Command Dock */}
          <CommandMenus
            isOpen={isDesktopMenuOpen}
            onToggle={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}
            showDate={showDate}
            hasRecipeBook={hasRecipeBook}
            dict={dict}
            language={language}
          />
        </div>
      </div>

      {/* Navigasi bawah (mobile) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[2rem] py-2 px-3 flex justify-around items-center z-[100] shadow-[0_8px_30px_rgba(255,117,140,0.14)] pointer-events-auto">
        <MobileNavBtn href="/home" icon={<BookOpen size={20} />} label={dict.nav.home} isActive />
        <MobileNavBtn href="/chat" icon={<MessageSquare size={20} />} label={dict.nav.chat} />
        <MobileNavBtn href="/pomodoro" icon={<Clock size={20} />} label={dict.nav.pomodoro} />
        <button
          onClick={() => setShowMoreModal(true)}
          className="flex flex-col items-center justify-center gap-1 w-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-xl"
        >
          <div className="p-2 rounded-xl transition-all text-gray-400 hover:text-[#ff758c] active:scale-90 active:bg-pink-50">
            <Menu size={20} />
          </div>
          <span className="font-display text-[10px] font-bold text-gray-400">
            {language === 'en' ? 'More' : 'Lainnya'}
          </span>
        </button>
      </div>

      {showMoreModal && (
        <MoreMenusModal
          onClose={() => setShowMoreModal(false)}
          showDate={showDate}
          hasRecipeBook={hasRecipeBook}
          dict={dict}
          language={language}
        />
      )}

      {showEvent && (
        <MiniEventModal onClose={() => setShowEvent(false)} invitedPlace={invitedPlace} />
      )}

      {showMobileStats && (
        <MobileStatsModal
          onClose={() => setShowMobileStats(false)}
          userName={userName}
          levelName={levelInfo.name}
          affection={affection}
          cycle={cycle}
          physical={physicalStats}
          psych={psychStats}
        />
      )}
    </div>
  );
}
