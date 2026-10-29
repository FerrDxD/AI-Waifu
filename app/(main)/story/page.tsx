'use client';

import { useState, useEffect } from 'react';
import LiviaSprite from '@/components/livia/LiviaSprite';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { CHAPTERS } from '@/content/story';
import type { Chapter, UserStatsData } from '@/lib/story/types';
import StoryStage from '@/features/story/StoryStage';
import ChapterList from '@/features/story/ChapterList';
import LockedChapterModal from '@/features/story/LockedChapterModal';
import HometownPickerModal from '@/features/story/HometownPickerModal';
import BlessingPickerModal from '@/features/story/BlessingPickerModal';

/**
 * Halaman cerita (M5.1).
 *
 * Dulu file ini 2.087 baris: 1.259 barisnya data cerita yang menumpang di
 * JSX, sisanya komponen bernapas di satu fungsi. Konten sekarang tinggal di
 * content/story/chapters/*.json (bisa diedit penulis cerita, satu bab satu
 * diff), dan UI terurai ke features/story/.
 *
 * Yang tersisa di sini hanya orkestrasi: state giliran scene, keputusan
 * "kapan bab selesai vs kapan modal khusus bab 8/12 muncul", dan panggilan
 * API progres. Semua visual ada di features/story.
 */

/** Bab yang punya interaksi khusus di ujung cerita. */
const HOMETOWN_CHAPTER = 8;
const BLESSING_CHAPTER = 12;
const HOMETOWN_DONE_ITEM = 'chapter_8_completed';
const BLESSING_DONE_ITEM = 'chapter_12_completed';

export default function StoryPage() {
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [hoveredChapterId, setHoveredChapterId] = useState(0);
  const [affectionLevel, setAffectionLevel] = useState(0);
  const [lockedChapter, setLockedChapter] = useState<Chapter | null>(null);

  const [showHometownPicker, setShowHometownPicker] = useState(false);
  const [selectedBlessing, setSelectedBlessing] = useState<string | null>(null);
  const [showBlessingPicker, setShowBlessingPicker] = useState(false);
  const [isSubmittingPicker, setIsSubmittingPicker] = useState(false);

  const [userStats, setUserStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/affection');
        if (res.ok) {
          const data = await res.json();
          if (data.affection !== undefined) {
            setAffectionLevel(data.affection);
          }
          setUserStats({
            affection: data.affection || 0,
            accountDays: data.accountDays || 0,
            screenTimeHours: data.screenTimeHours || 0,
            itemsBrought: data.itemsBrought || [],
            activeOutfit: data.activeOutfit || 'default',
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
      await fetch('/api/story/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapId }),
      });
    } catch (e) {
      console.error('Failed to complete chapter', e);
    }
  };

  /**
   * Satu jalur untuk semua cara maju scene (tombol next, pilihan, lompat
   * nextIndex). Versi lama menyalin cabang "bab selesai vs picker bab 8 vs
   * bab 12" di enam tempat — salah satu cabangnya bisa saja dikoreksi sendiri.
   *
   * Indeks >= jumlah scene berarti cerita mencapai ujung bab.
   */
  const goTo = (index: number) => {
    if (!activeChapter) return;
    if (index < activeChapter.scenes.length) {
      setSceneIndex(index);
      return;
    }

    // Interaksi khusus sebelum bab dianggap tamat.
    if (activeChapter.id === HOMETOWN_CHAPTER && userStats && !userStats.itemsBrought.includes(HOMETOWN_DONE_ITEM)) {
      setShowHometownPicker(true);
    } else if (activeChapter.id === BLESSING_CHAPTER && userStats && !userStats.itemsBrought.includes(BLESSING_DONE_ITEM)) {
      setShowBlessingPicker(true);
    } else {
      void finishChapter(activeChapter.id);
    }
  };

  const handleNextScene = () => {
    if (!activeChapter) return;
    const current = activeChapter.scenes[sceneIndex];
    if (!current) {
      goTo(activeChapter.scenes.length);
      return;
    }
    if (current.nextIndex !== undefined) {
      goTo(current.nextIndex);
    } else if (sceneIndex < activeChapter.scenes.length - 1) {
      setSceneIndex((prev) => prev + 1);
    } else {
      goTo(activeChapter.scenes.length);
    }
  };

  const submitHometownItems = async (selectedIds: string[]) => {
    if (selectedIds.length !== 3) return;
    setIsSubmittingPicker(true);
    try {
      const itemsToBring = [...selectedIds, HOMETOWN_DONE_ITEM];
      await fetch('/api/hometown-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsBrought: itemsToBring }),
      });
      setUserStats((prev) => (prev ? { ...prev, itemsBrought: [...prev.itemsBrought, ...itemsToBring] } : null));
      setShowHometownPicker(false);
      void finishChapter(HOMETOWN_CHAPTER);
    } catch (e) {
      console.error(e);
    }
    setIsSubmittingPicker(false);
  };

  const submitBlessing = async () => {
    if (!selectedBlessing) return;
    setIsSubmittingPicker(true);
    try {
      const itemsToBring = [selectedBlessing, BLESSING_DONE_ITEM];
      await fetch('/api/hometown-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsBrought: itemsToBring }),
      });
      setUserStats((prev) => (prev ? { ...prev, itemsBrought: [...prev.itemsBrought, ...itemsToBring] } : null));
      setShowBlessingPicker(false);
      void finishChapter(BLESSING_CHAPTER);
    } catch (e) {
      console.error(e);
    }
    setIsSubmittingPicker(false);
  };

  if (isLoading) return <LoadingScreen text="Memuat Cerita..." />;

  const activeOutfit = userStats?.activeOutfit || 'default';

  return (
    <div className="min-h-screen bg-[#fdfbf7] relative flex justify-center items-center overflow-hidden font-sans select-none">
      {activeChapter ? (
        <StoryStage
          chapter={activeChapter}
          scenes={activeChapter.scenes}
          sceneIndex={sceneIndex}
          activeOutfit={activeOutfit}
          onChoice={goTo}
          onNext={handleNextScene}
          onClose={() => setActiveChapter(null)}
        />
      ) : (
        <div className="absolute inset-0 flex">
          <div
            className="absolute inset-0 bg-cover bg-[60%_center] md:bg-center opacity-40 transition-all duration-1000 z-0"
            style={{ backgroundImage: `url('/bg/story-bg.webp')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf7] via-transparent to-black/10 pointer-events-none z-0" />

          {/* Sprite latar menu cerita (mobile & desktop) */}
          <div className="absolute inset-0 flex items-center justify-center md:justify-end pointer-events-none z-10 overflow-hidden">
            <LiviaSprite
              expression="normal"
              outfit={activeOutfit}
              variant="story-page"
              disableFloat={true}
              className="w-full h-full max-w-[500px] md:max-w-none md:w-full opacity-80 md:opacity-100"
              imgClassName="object-cover object-center w-full h-full scale-105"
            />
          </div>

          {/* Tombol kembali */}
          <div className="absolute top-6 right-6 md:top-10 md:right-12 z-40">
            <button
              onClick={() => window.history.back()}
              className="font-display font-black text-xs md:text-sm text-[#8C7B6B] hover:text-[#ff758c] bg-white/50 backdrop-blur-md md:bg-transparent md:backdrop-blur-none px-3 md:px-0 py-2 md:py-0 rounded-full md:rounded-none transition-colors flex items-center gap-2 md:gap-3 uppercase tracking-widest shadow-sm md:shadow-none"
            >
              <span className="text-lg md:text-xl">←</span> KEMBALI
            </button>
          </div>

          {/* Pudar putih lembut di belakang daftar bab */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#fdfbf7] via-[#fdfbf7]/90 to-transparent pointer-events-none z-20 w-[70%]" />

          <div className="relative z-30 w-full md:w-[50%] h-full flex flex-col justify-center px-6 md:pl-24 md:pr-4 pt-16 md:pt-8 pb-12">
            <h1 className="text-4xl md:text-7xl font-display font-black text-[#5c4d47] mb-6 md:mb-8 drop-shadow-sm tracking-tighter flex items-center gap-2 md:gap-4 shrink-0">
              <span className="text-amber-400 text-3xl md:text-4xl animate-[pulse_3s_ease-in-out_infinite]">✦</span>
              CERITA KITA
            </h1>

            <ChapterList
              chapters={CHAPTERS}
              userStats={userStats}
              hoveredChapterId={hoveredChapterId}
              onHover={setHoveredChapterId}
              onOpen={openChapter}
              onShowLocked={setLockedChapter}
            />
          </div>
        </div>
      )}

      {lockedChapter && (
        <LockedChapterModal
          chapter={lockedChapter}
          affection={affectionLevel}
          userStats={userStats}
          onClose={() => setLockedChapter(null)}
        />
      )}

      {showHometownPicker && userStats && (
        <HometownPickerModal
          ownedItemIds={userStats.itemsBrought}
          submitting={isSubmittingPicker}
          onSubmit={(ids) => void submitHometownItems(ids)}
        />
      )}

      {showBlessingPicker && (
        <BlessingPickerModal
          selected={selectedBlessing}
          submitting={isSubmittingPicker}
          onSelect={setSelectedBlessing}
          onSubmit={() => void submitBlessing()}
        />
      )}
    </div>
  );
}
