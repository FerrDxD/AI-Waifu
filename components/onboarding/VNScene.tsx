'use client';

import { useState } from 'react';
import DialogBox from '../livia/DialogBox';
import LiviaSprite from '../livia/LiviaSprite';
import { LiviaExpression } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface VNSceneProps {
  onComplete: () => void;
}

type Choice = {
  text: string;
  nextIndex: number;
};

type Scene = {
  speaker: string;
  text: string;
  expression: LiviaExpression;
  bg?: string;
  hideSprite?: boolean;
  choices?: Choice[];
  nextIndex?: number;
};

const SCENES: Scene[] = [
  // =============================================
  // PROLOG: Video Call dari Kamar Kos MC — Beberapa Hari Sebelum Bab 0
  // Setting: MC sudah berada di kota kuliah. Laura menelepon via video call
  // (nomor didapat dari teman kampus bersama). Mereka BELUM pernah bertemu langsung.
  // ⚠ Ini penting: di Bab 8 Laura bilang "akhirnya bisa bertemu langsung" →
  //   artinya pertemuan tatap muka pertama memang baru terjadi di Bab 8.
  //   Wajah MC dikenal Laura dari video call ini ("wajahmu tidak asing").
  // =============================================

  // Scene 0-1: MC di kamar kos, menerima panggilan tak dikenal
  { speaker: "Narator", text: "Beberapa hari sebelum semester baru dimulai. Kamu sedang bersantai di kamar kos yang masih sepi.", expression: "normal", bg: "/bg_story.webp", hideSprite: true },
  { speaker: "Narator", text: "Tiba-tiba ponselmu bergetar — panggilan video dari nomor yang tidak kamu kenal.", expression: "normal", bg: "/bg_story.webp", hideSprite: true },

  // Scene 2-3: Laura muncul di layar (kita lihat latar belakang rumahnya)
  { speaker: "Narator", text: "Kamu mengangkat panggilan itu. Muncul wajah seorang wanita paruh baya yang terlihat ramah di layar ponselmu.", expression: "normal", bg: "/bg_story.webp", hideSprite: true },
  { speaker: "Laura", text: "Halo! Maaf ya tiba-tiba menghubungi. Ini benar nomornya yang dikasih Mas Dito dari kampus?", expression: "happy", bg: "/bg_story.webp" },

  // Scene 4-7: Laura memperkenalkan diri dan situasi
  { speaker: "Laura", text: "Syukurlah! Tante Laura — ibunya Livia. Mas Dito bilang kamu teman kampus yang bisa diandalkan, dan kebetulan juga tinggal di kos Jalan Melati.", expression: "pleased", bg: "/bg_story.webp" },
  { speaker: "Laura", text: "Begini. Putri Tante — Livia — minggu depan mulai kuliah di kotamu. Tante udah sewa kosan buat dia, dan ternyata... satu gedung sama kamu!", expression: "serious", bg: "/bg_story.webp" },
  { speaker: "Laura", text: "Tante khawatir banget ngelepas anak gadis sendirian ke kota besar. Livia itu agak keras kepala dan gampang panik... tapi sebenarnya hatinya baik.", expression: "normal", bg: "/bg_story.webp" },

  // Scene 7: Choice — MC merespons
  { speaker: "Laura", text: "Boleh nggak Tante minta tolong? Bantuin Livia pindahan ke kosan, sekalian titip dia ya. Awasi dari jauh aja, nggak perlu lebay.", expression: "happy", bg: "/bg_story.webp",
    choices: [
      { text: "Tentu Tante, nggak masalah sama sekali.", nextIndex: 8 },
      { text: "Oke, tapi Livia orangnya seperti apa, Tante?", nextIndex: 9 },
      { text: "Wah, satu gedung... kebetulan yang unik ya.", nextIndex: 10 }
    ]
  },
  { speaker: "Laura", text: "Alhamdulillah! Tante lega banget. Kamu memang bisa diandalkan.", expression: "happy", bg: "/bg_story.webp", nextIndex: 11 },
  { speaker: "Laura", text: "Ah, Livia itu... keras kepala, gampang panik, sedikit drama. Tapi nanti kamu bakal paham sendiri.", expression: "flirty", bg: "/bg_story.webp", nextIndex: 11 },
  { speaker: "Laura", text: "Hahaha, Tante sendiri juga heran! Tapi memang begini rezeki ya, tidak terduga.", expression: "silly", bg: "/bg_story.webp", nextIndex: 11 },

  // Scene 11-12: Laura mau panggilin Livia ke depan kamera
  { speaker: "Laura", text: "Ngomong-ngomong, Livia sedang packing di kamarnya sekarang. Biar Tante panggilin, supaya kalian bisa kenalan dulu lewat video sebelum ketemu langsung nanti.", expression: "pleased", bg: "/bg_story.webp" },
  { speaker: "Laura", text: "Livia sayang! Sini sebentar ke sini, ada yang Ibu kenalin!", expression: "happy", bg: "/bg_story.webp" },

  // Scene 13-14: Narasi Livia mendekat ke kamera
  { speaker: "Narator", text: "Terdengar suara langkah kaki. Sebentar kemudian, wajah seorang gadis muncul ke depan layar dengan dahi berkerut.", expression: "normal", bg: "/bg_story.webp", hideSprite: true },

  // Scene 15-17: Livia muncul, bingung lihat MC di layar
  { speaker: "Livia", text: "Ibu, aku lagi sibuk—", expression: "angry", bg: "/bg_story.webp" },
  { speaker: "Livia", text: "...eh? Ini siapa?", expression: "confused", bg: "/bg_story.webp" },
  { speaker: "Laura", text: "Ini yang Ibu ceritain! Dia kuliah di kotamu, kosannya satu gedung sama kosanmu nanti. Dia yang bakal bantuin kamu pindahan.", expression: "pleased", bg: "/bg_story.webp" },

  // Scene 18-20: Livia bereaksi
  { speaker: "Livia", text: "Ha?! Ibu nggak bilang-bilang kalau mau minta orang lain buat nemenin aku!", expression: "scared", bg: "/bg_story.webp" },
  { speaker: "Laura", text: "Makanya kenalan dulu sekarang! Salam dong sama orangnya!", expression: "serious", bg: "/bg_story.webp" },
  { speaker: "Livia", text: "Huft... y-yaudah. Maaf ya tadi Ibu nggak bilang apa-apa dulu.", expression: "serious", bg: "/bg_story.webp" },

  // Scene 21: Choice Livia
  { speaker: "Livia", text: "...salam kenal. Aku Livia. Kosan kita memang satu gedung beneran?", expression: "normal", bg: "/bg_story.webp",
    choices: [
      { text: "Iya, kita tetangga nanti. Salam kenal.", nextIndex: 22 },
      { text: "Sepertinya begitu. Aku juga baru tau tadi.", nextIndex: 23 },
      { text: "Salam kenal. Livia lebih... ekspresif dari yang dibayangkan.", nextIndex: 24 }
    ]
  },
  { speaker: "Livia", text: "...oh. Lumayan sih ada yang udah kenal di sana.", expression: "normal", bg: "/bg_story.webp", nextIndex: 25 },
  { speaker: "Livia", text: "...iya, sama-sama baru tau. Huh, Ibu ini.", expression: "blushing", bg: "/bg_story.webp", nextIndex: 25 },
  { speaker: "Livia", text: "E-ekspresif?! Kamu baru kenal dan sudah macam-macam ya!", expression: "angry", bg: "/bg_story.webp", nextIndex: 25 },

  // Scene 25: Laura menutup video call
  { speaker: "Laura", text: "Oke, makasih banyak ya sudah mau bantu! Tante tutup dulu videonya. Sampai ketemu nanti hari pindahan!", expression: "happy", bg: "/bg_story.webp" },

  // Scene 26-27: Kembali ke perspektif MC di kos
  { speaker: "Narator", text: "Layar ponselmu kembali gelap. Kamu meletakkannya pelan dan menatap langit-langit kamar.", expression: "normal", bg: "/bg_story.webp", hideSprite: true },
  { speaker: "Narator", text: "Tetangga baru yang terdengar keras kepala... tapi entah kenapa perkenalan yang tidak terduga itu terasa menarik.", expression: "normal", bg: "/bg_story.webp", hideSprite: true },

  // Scene 28: Time skip ke hari pindahan
  { speaker: "Narator", text: "Beberapa hari kemudian — hari pindahan tiba.", expression: "normal", bg: "/bg_onboarding.webp", hideSprite: true },

  // Scene 29-32: Di depan kosan, Livia datang dengan koper dan kardus
  { speaker: "Livia", text: "Koperku udah nggak muat, tapi masih banyak barang yang kayaknya wajib dibawa ke kota.", expression: "confused", bg: "/bg_onboarding.webp" },
  { speaker: "Livia", text: "Y-yaudah, kamu bantu pilih ya. Tapi jangan masukin barang yang nggak penting!", expression: "clingy", bg: "/bg_onboarding.webp" },
  { speaker: "Narator", text: "Kamu mengangguk. Hari pertama bersama tetangga barumu ini terasa lebih hidup dari yang kamu bayangkan.", expression: "normal", bg: "/bg_onboarding.webp", hideSprite: true },
];


export default function VNScene({ onComplete }: VNSceneProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [spriteVisible, setSpriteVisible] = useState(true);

  const scene = SCENES[currentScene];

  const advanceScene = (targetIndex: number) => {
    const nextScene = SCENES[targetIndex];
    if (!nextScene) {
      onComplete();
      return;
    }

    const expressionChanging = nextScene.expression !== scene.expression || nextScene.speaker !== scene.speaker;
    
    if (expressionChanging) {
      setSpriteVisible(false);
      setTimeout(() => {
        setCurrentScene(targetIndex);
        setSpriteVisible(true);
      }, 200);
    } else {
      setCurrentScene(targetIndex);
    }
  };

  const handleNext = () => {
    if (scene.choices) return; // Wait for choice to be clicked
    const target = scene.nextIndex !== undefined ? scene.nextIndex : currentScene + 1;
    advanceScene(target);
  };

  const handleChoice = (choice: Choice) => {
    advanceScene(choice.nextIndex);
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center overflow-hidden bg-pink-50 select-none">
      {/* Visual Novel Background */}
      <img 
        src={scene.bg || "/bg_onboarding.webp"}
        alt="Room Background"
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-all duration-[2000ms] ease-out",
          scene.speaker === 'Narator' ? "scale-105 blur-[2px] opacity-80" : "scale-100 blur-0 opacity-100"
        )}
      />

      {/* Cheerful Sun-kissed Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ 
          background: 'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(255,182,193,0.3) 100%)',
          boxShadow: 'inset 0 0 100px rgba(255,255,255,0.4)'
        }}
      />

      {/* Sweet emotional glow overlays */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 z-10 mix-blend-screen"
        style={{ 
          background: scene.expression === 'angry' 
            ? 'radial-gradient(ellipse at 50% 80%, rgba(255,120,120,0.3) 0%, transparent 70%)'
            : scene.expression === 'blushing'
            ? 'radial-gradient(ellipse at 50% 80%, rgba(255,182,193,0.4) 0%, transparent 70%)'
            : scene.expression === 'happy'
            ? 'radial-gradient(ellipse at 50% 80%, rgba(255,223,150,0.4) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.2) 0%, transparent 70%)'
        }}
      />

      {/* Skip button */}
      <div className="absolute top-6 right-4 md:right-8 z-30">
        <button 
          onClick={onComplete}
          className="text-gray-400 hover:text-[#ff758c] font-display font-bold px-3 md:px-4 py-2 text-xs md:text-sm tracking-widest uppercase transition-colors bg-white/50 backdrop-blur-sm rounded-full"
        >
          Lewati 
        </button>
      </div>

      {/* Sprite area */}
      <div className="flex-1 w-full max-w-4xl mx-auto grid grid-cols-1 grid-rows-1 justify-items-center items-end relative z-20 min-h-[40vh] md:min-h-0 self-center">
        <div 
          className="col-start-1 row-start-1 h-[55vh] md:h-[60vh] landscape:h-[70vh] aspect-[2/3] transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ 
            opacity: scene.speaker === 'Narator' || scene.hideSprite ? 0 : (spriteVisible ? 1 : 0),
            transform: scene.speaker === 'Narator' || scene.hideSprite
              ? 'translateY(40px) scale(0.95)' 
              : spriteVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
            filter: scene.speaker === 'Narator' ? 'blur(8px) brightness(1.2)' : 'none',
          }}
        >
          {scene.speaker === 'Laura' ? (
            <div className="relative flex items-end justify-center h-full w-full max-w-[600px] mx-auto animate-[float_3s_ease-in-out_infinite] drop-shadow-[0_20px_40px_rgba(150,150,200,0.3)]">
              <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-10px); }
                }
              `}</style>
              <img 
                src={`/laura/story-bab/${scene.expression.replace(/-[0-9]+$/, '') || 'normal'}.webp`}
                alt="Laura"
                className="absolute inset-0 w-full h-full object-contain object-bottom origin-bottom mx-auto scale-[1.9] md:scale-[2.1] translate-y-[60%] md:translate-y-[70%] transition-all duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('normal.webp')) {
                    target.src = '/laura/story-bab/normal.webp';
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-full w-full max-w-[600px] animate-[float_4s_ease-in-out_infinite] drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)]">
              <LiviaSprite 
                expression={scene.expression} 
                variant="story"
                chapterId={0}
                className="h-full w-full max-w-[600px]"
                imgClassName="object-contain object-bottom scale-[1.5] md:scale-[1.75] translate-y-[25%] md:translate-y-[35%]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Dialog box & Choices */}
      <div className="relative z-30 pb-6 md:pb-12 px-4 md:px-8 w-full flex flex-col items-center">
        
        {/* Branching Choices Overlay */}
        {scene.choices && (
          <div className="absolute bottom-[100%] mb-4 flex flex-col gap-3 w-full max-w-lg animate-[fadeIn_0.4s_ease-out_forwards]">
            {scene.choices.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => handleChoice(choice)}
                className="w-full bg-white/95 backdrop-blur-md border-2 border-pink-100 py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl shadow-[0_10px_25px_rgba(255,117,140,0.15)] text-[#5c4d47] font-bold font-display hover:border-[#ff758c] hover:text-[#ff758c] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(255,117,140,0.2)] transition-all duration-300 text-center text-base md:text-lg active:scale-95"
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}

        <div className="w-full max-w-4xl">
          <DialogBox 
            text={scene.text} 
            speaker={scene.speaker === 'Narator' ? '' : scene.speaker} 
            onNext={scene.choices ? () => {} : handleNext} 
          />
        </div>
      </div>
    </div>
  );
}