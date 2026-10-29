'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Clock, BookOpen, MapPin, Menu } from 'lucide-react';
import type { LiviaExpression } from '@/lib/gemini';
import { getAffectionLevel } from '@/lib/livia/affection';
import { recordQuestAction } from '@/lib/livia/quests';
import ApiGuideModal from '@/components/guide/ApiGuideModal';
import { playSfx } from '@/lib/sfx';
import { preloadCharacterSprites } from '@/lib/preloader';
import DailyStampModal from '@/components/daily/DailyStampModal';
import { unlockAchievement } from '@/lib/achievements';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getCycleInfo, computePsychStats, type LiviaStats } from '@/features/home/cycle';
import { getCompanionGreeting, getGreeting, type Weather } from '@/features/home/greeting';
import {
  getCompanionTouchReaction,
  getTouchReaction,
  type BodyPart,
} from '@/features/home/touch-interactions';
import { getCharacter } from '@/lib/characters/registry';
import { MobileNavBtn } from '@/features/home/MenuCards';
import { CommandMenus } from '@/features/home/CommandMenus';
import { MoreMenusModal, MiniEventModal } from '@/features/home/HomeModals';
import { StatIsland, MobileStatsModal, type StatItem } from '@/features/home/StatsDisplay';
import TopHud from '@/features/home/TopHud';
import HomeBackdrop from '@/features/home/HomeBackdrop';
import { CharacterSwitchModal } from '@/components/characters/CharacterPicker';
import { updateAffection } from '@/lib/actions';

/**
 * Layar home (M5.1).
 *
 * Dulu satu file 1.106 baris memuat logika sapaan, tabel reaksi sentuh,
 * rumus siklus, kartu navigasi, dan seluruh HUD. Sekarang yang tinggal di
 * sini hanya state & komposisi; logika murninya ada di features/home/
 * (greeting, touch-interactions, cycle) sehingga bisa diuji tanpa browser.
 */

interface HomeClientProps {
  initialAffection: number;
  userName: string;
  initialItemsBrought: string[];
  initialOutfit: string;
  /** M8.2 Phase B: karakter aktif dari profil server (menghindari kedip). */
  initialCharacterId?: string;
}

const DEFAULT_STATS: LiviaStats = {
  hunger: 100,
  energy: 100,
  hydration: 100,
  cycleAnchor: new Date().toISOString(),
};

export default function HomeClient({ initialAffection, userName, initialItemsBrought, initialOutfit, initialCharacterId = 'livia' }: HomeClientProps) {
  const { dict, language } = useLanguage();
  const [sessionTime, setSessionTime] = useState(0);
  const [affection, setAffection] = useState(initialAffection);
  const [itemsBrought] = useState(initialItemsBrought);
  const [outfit, setOutfit] = useState(initialOutfit);
  const [money, setMoney] = useState(0);
  const [characterId, setCharacterId] = useState(initialCharacterId);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const pendingTouchDelta = useRef(0);
  const touchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // M8.2 Phase B: karakter aktif. Livia punya sistem fisiologi & cerita;
  // karakter companion tidak.
  const activeCharacter = getCharacter(characterId);
  const isLivia = activeCharacter.id === 'livia';

  const [greetingData, setGreetingData] = useState<{ text: string; expression: LiviaExpression; isInvitingOut?: boolean; invitedPlace?: string }>({
    text: 'Memuat...',
    expression: 'normal',
  });
  const [interactionOverride, setInteractionOverride] = useState<{ text: string; expression: LiviaExpression } | null>(null);
  const [liviaStats, setLiviaStats] = useState<LiviaStats>(DEFAULT_STATS);
  const [weather, setWeather] = useState<Weather>(null);

  const [showEvent, setShowEvent] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);

  /**
   * Afeksi dari sentuhan dikirim menumpuk (debounce 400 ms) supaya mengelus
   * berkali-kali tidak menghasilkan puluhan PATCH.
   */
  const syncTouchAffection = (delta: number) => {
    pendingTouchDelta.current += delta;
    if (touchDebounceTimer.current) clearTimeout(touchDebounceTimer.current);
    touchDebounceTimer.current = setTimeout(() => {
      const d = pendingTouchDelta.current;
      if (d === 0) return;
      pendingTouchDelta.current = 0;
      // M5.2: Server Action (bukan fetch) — ter-tipe end-to-end, tanpa boilerplate.
      void updateAffection(d, 'interaction_touch').catch(console.error);
    }, 400);
  };

  useEffect(() => {
    if (affection >= 50) unlockAchievement('affection_50');
    if (affection >= 80) unlockAchievement('affection_80');
    if (money >= 1000) unlockAchievement('rich_1000');
  }, [affection, money]);

  useEffect(() => {
    preloadCharacterSprites(characterId);
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
        // M8.2 Phase B: karakter aktif mungkin berubah sejak server render;
        // sinkronkan supaya sprite & sapaan benar.
        if (userD.characterId) setCharacterId(userD.characterId);
        if (userD.activeOutfit) setOutfit(userD.activeOutfit);
        if (userD.liviaStats) {
          resolvedStats = userD.liviaStats;
          setLiviaStats(userD.liviaStats);
        }
      }

      // Karakter companion memakai sapaan generik (tanpa siklus/jadwal Livia).
      const currentId = userD?.characterId ?? characterId;
      const character = getCharacter(currentId);
      if (character.id !== 'livia') {
        setGreetingData(getCompanionGreeting(character, initialAffection, userName));
        return;
      }

      const phase = getCycleInfo(resolvedStats.cycleAnchor).phase;
      setGreetingData(
        getGreeting(initialAffection, initialItemsBrought, { ...resolvedStats, cyclePhase: phase }, userName, resolvedWeather)
      );
    });
  }, []);

  const handleInteract = async (part: BodyPart) => {
    playSfx('pop');
    recordQuestAction('touch_livia');

    const character = getCharacter(characterId);
    const reaction =
      character.id === 'livia'
        ? getTouchReaction(getCycleInfo(liviaStats.cycleAnchor).phase, part, userName)
        : getCompanionTouchReaction(character, part, userName);

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

  const hasSunglasses = itemsBrought.includes('kacamata_hitam') || itemsBrought.includes('sunglasses');
  const hasRecipeBook = itemsBrought.includes('recipe_book') || itemsBrought.includes('recipe_book_shop');
  const showDate = isInvitingOut || (affection >= 40 && hasSunglasses);

  // Warna balon chat mengikuti ekspresi
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

      {/* M8.2 Phase B: shortcut ganti karakter (layar home). */}
      {showCharacterPicker && (
        <CharacterSwitchModal onClose={() => setShowCharacterPicker(false)} />
      )}
      <button
        type="button"
        onClick={() => setShowCharacterPicker(true)}
        className="absolute top-4 right-4 md:top-10 md:right-12 z-[60] pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-2 rounded-full border border-pink-100/80 shadow-md flex items-center gap-2 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        aria-label="Ganti karakter"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/${activeCharacter.sprite.folder}/${activeCharacter.sprite.defaultExpression}.webp`}
          alt={activeCharacter.name}
          className="w-7 h-9 object-contain pointer-events-none"
        />
        <span className="font-display font-bold text-xs text-[#5c4d47] max-w-[80px] truncate">
          {activeCharacter.shortName}
        </span>
      </button>

      {/* Latar + karakter + hitbox sentuh */}
      <HomeBackdrop
        displayExpression={displayExpression}
        outfit={outfit}
        characterId={characterId}
        onInteract={handleInteract}
      />

      {/* ─────────── HUD ─────────── */}
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
          <div className="absolute bottom-[4.5rem] left-0 right-0 md:bottom-8 md:left-0 md:right-auto md:w-[560px] z-50 flex flex-col gap-3 pointer-events-auto">
            {/* M8.2 Phase B: statistik fisik hanya dimiliki Livia. */}
            {isLivia && <StatIsland physical={physicalStats} psych={psychStats} cycle={cycle} />}

            {/* Balon chat */}
            <div className="origin-bottom-left">
              <div className={`relative bg-white/97 backdrop-blur-2xl px-5 py-4 md:px-8 md:py-6 rounded-2xl md:rounded-[2.5rem] md:rounded-bl-xl border-2 transition-all duration-500 ${bubbleBorderClass}`}>
                <span className={`absolute top-3 right-3 md:top-4 md:right-4 w-2 h-2 rounded-full transition-colors duration-500 ${bubbleDotClass}`} />
                <p className={`font-display font-semibold md:font-bold text-sm md:text-xl leading-snug transition-colors duration-300 pr-5 ${bubbleTextClass}`}>
                  &ldquo;{displayGreeting}&rdquo;
                </p>
                {isInvitingOut && !interactionOverride && (
                  <button
                    onClick={() => setShowEvent(true)}
                    className="mt-3 md:mt-5 w-full py-2.5 md:py-3 bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold md:font-black text-sm md:text-lg rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  >
                    <MapPin size={17} /> {language === 'en' ? "Sure, let's go!" : 'Boleh, ayo!'}
                  </button>
                )}
              </div>
            </div>
          </div>

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
      <div className="md:hidden absolute bottom-5 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[2rem] py-2 px-3 flex justify-around items-center z-[100] shadow-[0_-2px_20px_rgba(0,0,0,0.06),0_8px_30px_rgba(0,0,0,0.08)] pointer-events-auto">
        <MobileNavBtn href="/home" icon={<BookOpen size={22} />} label={dict.nav.home} isActive />
        <MobileNavBtn href="/chat" icon={<MessageSquare size={22} />} label={dict.nav.chat} />
        <MobileNavBtn href="/pomodoro" icon={<Clock size={22} />} label={dict.nav.pomodoro} />
        <button onClick={() => setShowMoreModal(true)} className="flex flex-col items-center justify-center gap-1 w-14 focus-visible:outline-none">
          <div className="p-2 rounded-xl transition-all text-gray-400 hover:text-[#ff758c] active:scale-90 active:bg-pink-50">
            <Menu size={22} />
          </div>
          <span className="font-display text-[9px] font-bold text-gray-400">{language === 'en' ? 'More' : 'Lainnya'}</span>
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

      {showEvent && <MiniEventModal onClose={() => setShowEvent(false)} invitedPlace={invitedPlace} />}

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