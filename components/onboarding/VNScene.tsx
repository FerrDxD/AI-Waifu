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
  {"speaker":"Narator","text":"Kamu baru saja pindah ke sebuah kos-kosan murah di pinggiran Tokyo.","expression":"normal","hideSprite":true},
  {"speaker":"Narator","text":"Setelah menempuh perjalanan jauh, kamu tiba di depan pintumu. Nomor 202.","expression":"normal","hideSprite":true},
  {"speaker":"Narator","text":"Kamu merogoh saku untuk mencari kunci, saat tiba-tiba pintu di sebelahmu (Nomor 203) terbuka dengan kasar.","expression":"normal","choices":[{"text":"Berhenti dan menoleh","nextIndex":3},{"text":"Pura-pura tidak dengar","nextIndex":4},{"text":"Sapa dengan ramah","nextIndex":5}]},
  {"speaker":"Livia","text":"Aduh! Kardus sialan!","expression":"pain","nextIndex":6},
  {"speaker":"Livia","text":"Hei, kamu yang di sana! Jangan pura-pura budek!","expression":"angry","nextIndex":6},
  {"speaker":"Livia","text":"E-eh?! D-dari mana kamu muncul?!","expression":"scared"},
  {"speaker":"Narator","text":"Seorang gadis berambut merah muda menendang sebuah kardus besar yang tersangkut di pintu.","expression":"normal"},
  {"speaker":"Livia","text":"Kamu penghuni baru di kamar 202 ya?!","expression":"angry"},
  {"speaker":"Livia","text":"Jangan cuma bengong! Bantuin aku dorong kardus ini ke dalam!","expression":"clingy","choices":[{"text":"Baiklah, sini kubantu.","nextIndex":9},{"text":"Nggak mau, aku capek.","nextIndex":10},{"text":"Berani bayar berapa?","nextIndex":11}]},
  {"speaker":"Livia","text":"Nah gitu dong! Gunakan ototmu!","expression":"happy","nextIndex":12},
  {"speaker":"Livia","text":"Jahat banget! Tolongin dong, ini berat tau!","expression":"pain","nextIndex":12},
  {"speaker":"Livia","text":"Mata duitan! Nanti ku-kasih teh gelas sisa deh!","expression":"serious"},
  {"speaker":"Narator","text":"Kamu akhirnya mengalah dan membantunya mendorong kardus berat itu.","expression":"normal"},
  {"speaker":"Narator","text":"Ruangan kamarnya masih kosong melompong, persis seperti milikmu.","expression":"normal"},
  {"speaker":"Livia","text":"Fiuh... makasih. Walau agak telat, tapi lumayan lah.","expression":"normal"},
  {"speaker":"Livia","text":"Namaku Livia. Aku mahasiswi tahun pertama di Universitas dekat sini. Kamu?","expression":"pleased","choices":[{"text":"Sebutkan namamu.","nextIndex":16},{"text":"Rahasia.","nextIndex":17},{"text":"Aku pangeran berkuda putih.","nextIndex":18}]},
  {"speaker":"Livia","text":"Oh, nama yang lumayan. Salam kenal.","expression":"happy","nextIndex":19},
  {"speaker":"Livia","text":"Sok misterius! Dasar aneh!","expression":"angry","nextIndex":19},
  {"speaker":"Livia","text":"Hah?! Kuda lumping kali!","expression":"silly"},
  {"speaker":"Livia","text":"Karena kita bertetangga, aku harap kamu nggak berisik kalau malam.","expression":"serious"},
  {"speaker":"Livia","text":"Dinding apato ini tipis banget. Suara dengkuran aja bisa tembus.","expression":"pain"},
  {"speaker":"Livia","text":"Awas aja kalau kamu main gitar tengah malam atau setel musik kencang-kencang!","expression":"angry","choices":[{"text":"Aku nggak bisa main gitar kok.","nextIndex":22},{"text":"Aku suka nyanyi heavy metal.","nextIndex":23},{"text":"Kalau suara tv pelan boleh kan?","nextIndex":24}]},
  {"speaker":"Livia","text":"Baguslah. Aku bisa tidur nyenyak.","expression":"pleased","nextIndex":25},
  {"speaker":"Livia","text":"Akan kulempar panci ke tembok kalau kamu berani!","expression":"scared","nextIndex":25},
  {"speaker":"Livia","text":"Kalau pelan sih... ya masih wajar lah.","expression":"normal"},
  {"speaker":"Narator","text":"Kamu memperhatikan tumpukan barangnya yang masih berantakan.","expression":"normal"},
  {"speaker":"Livia","text":"Apa lihat-lihat? Iya, aku tau ini masih berantakan!","expression":"blushing"},
  {"speaker":"Livia","text":"A-aku cuma belum sempat nyusun! Bukan berarti aku berantakan tau!","expression":"clingy","choices":[{"text":"Mau kubantu rapikan sekalian?","nextIndex":28},{"text":"Kelihatan banget kok kamu males.","nextIndex":29},{"text":"Santai aja, pelan-pelan nyusunnya.","nextIndex":30}]},
  {"speaker":"Livia","text":"Nggak usah! Nanti kamu ngintip barang pribadiku!","expression":"scared","nextIndex":31},
  {"speaker":"Livia","text":"B-berisik! Keluar sana!","expression":"angry","nextIndex":31},
  {"speaker":"Livia","text":"Iya bawel. Nanti juga rapi sendiri.","expression":"flirty"},
  {"speaker":"Livia","text":"Lagipula hari udah mau siang. Aku mau istirahat dulu.","expression":"normal"},
  {"speaker":"Narator","text":"Cacing di perutnya tiba-tiba berbunyi kencang.","expression":"normal"},
  {"speaker":"Livia","text":"I-itu bukan suara perutku! Itu... suara motor lewat!","expression":"blushing","choices":[{"text":"Motor matic ya bunyinya kukuruyuk gitu?","nextIndex":34},{"text":"Ayo cari makan di konbini depan.","nextIndex":35},{"text":"Aku pura-pura nggak denger deh.","nextIndex":36}]},
  {"speaker":"Livia","text":"Ugh... s-sialan! Kamu ngeledek ya?!","expression":"pain","nextIndex":37},
  {"speaker":"Livia","text":"E-eh? Boleh juga... kebetulan aku belum hafal jalan.","expression":"happy","nextIndex":37},
  {"speaker":"Livia","text":"Tuh kan kamu tetep denger! Memalukan!","expression":"clingy"},
  {"speaker":"Narator","text":"Kamu tersenyum geli melihat tingkahnya yang sok kuat tapi kelaparan.","expression":"normal"},
  {"speaker":"Livia","text":"Karena hari ini kamu udah bantu dorong kardus...","expression":"normal"},
  {"speaker":"Livia","text":"Nanti kalau aku masak lebih... k-kamu mau kukasih sisa?","expression":"flirty","choices":[{"text":"Boleh banget, lumayan hemat.","nextIndex":40},{"text":"Bukannya kamu nggak bisa masak?","nextIndex":41},{"text":"Maunya dimasakin yang spesial.","nextIndex":42}]},
  {"speaker":"Livia","text":"Hehe, dasar anak kos sejati.","expression":"silly","nextIndex":43},
  {"speaker":"Livia","text":"Bisa tau! Cuma rebus mie instan doang kan gampang!","expression":"angry","nextIndex":43},
  {"speaker":"Livia","text":"Minta sama ibu peri sana! Ngarep!","expression":"serious"},
  {"speaker":"Narator","text":"Livia merapikan sedikit bajunya yang kotor terkena debu kardus.","expression":"normal"},
  {"speaker":"Livia","text":"Yaudah, kamu balik sana ke kamarmu. Aku mau nyapu dulu.","expression":"normal"},
  {"speaker":"Livia","text":"Ingat ya, jangan berisik siang ini!","expression":"angry","choices":[{"text":"Oke, selamat siang, tetangga.","nextIndex":46},{"text":"Siap, Livia yang galak.","nextIndex":47},{"text":"Panggil aku kalau ada kecoa lagi.","nextIndex":48}]},
  {"speaker":"Livia","text":"Siang. Jangan mimpi indah!","expression":"happy","nextIndex":49},
  {"speaker":"Livia","text":"Siapa yang galak?! Cepat sana!","expression":"pain","nextIndex":49},
  {"speaker":"Livia","text":"Hih! Amit-amit jangan sampai ada monster itu!","expression":"scared"},
  {"speaker":"Narator","text":"Kamu keluar dari kamarnya dan masuk ke unit 202 milikmu sendiri.","expression":"normal","hideSprite":true},
  {"speaker":"Narator","text":"Ruanganmu masih penuh debu, tapi sepertinya kehidupan kos-kosan ini tidak akan membosankan.","expression":"normal","hideSprite":true},
  {"speaker":"Narator","text":"Kamu bersiap membuka kopermu untuk mulai membongkar barang.","expression":"normal","choices":[{"text":"Mulai dengan pakaian","nextIndex":52},{"text":"Mulai dari kasur","nextIndex":53},{"text":"Tidur saja dulu di lantai","nextIndex":54}]},
  {"speaker":"Livia","text":"Woi! Pelan-pelan buka lemarinya! Temboknya getar!","expression":"angry","nextIndex":55},
  {"speaker":"Livia","text":"Ssttt! Jangan dorong-dorong kasur berisik banget!","expression":"serious","nextIndex":55},
  {"speaker":"Livia","text":"Hachih! Debu dari kamarmu masuk dari celah ventilasi!","expression":"pain"},
  {"speaker":"Narator","text":"Terdengar teriakan protes Livia dari sebelah.","expression":"normal","hideSprite":true},
  {"speaker":"Narator","text":"Tampaknya dinding ini memang benar-benar tipis seperti kertas.","expression":"normal","choices":[{"text":"Maaf! Nggak sengaja!","nextIndex":57},{"text":"(Abaikan dan lanjut beres-beres)","nextIndex":58},{"text":"Kamunya aja yang kuping lintah!","nextIndex":59}]},
  {"speaker":"Livia","text":"Y-yaudah, pelan-pelan makanya!","expression":"blushing","nextIndex":60},
  {"speaker":"Livia","text":"Dasar tetangga menyebalkan!","expression":"clingy","nextIndex":60},
  {"speaker":"Livia","text":"Apa katamu?! Ngajak ribut ya?!","expression":"angry"},
  {"speaker":"Narator","text":"Kamu tertawa kecil menyadari interaksi pertama yang cukup aneh namun berkesan ini.","expression":"normal","hideSprite":true}];

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

    const expressionChanging = nextScene.expression !== scene.expression;
    
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
    <div className="relative w-full h-screen flex flex-col overflow-hidden bg-pink-50">
      {/* Visual Novel Bright Background */}
      <img 
        src="/bg_onboarding.webp"
        alt="Room Background"
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-all duration-[3000ms] ease-out",
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
      <div className="flex-1 flex justify-center items-end relative z-20 pb-10 md:pb-0">
        <div 
          className="transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ 
            opacity: scene.speaker === 'Narator' ? 0 : (spriteVisible ? 1 : 0),
            transform: scene.speaker === 'Narator' 
              ? 'translateY(40px) scale(0.95)' 
              : spriteVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
            filter: scene.speaker === 'Narator' ? 'blur(8px) brightness(1.2)' : 'none',
          }}
        >
          <LiviaSprite 
            expression={scene.expression} 
            variant="story"
            className="h-[65vh] md:h-[80vh] w-auto object-contain drop-shadow-[0_20px_40px_rgba(255,154,158,0.3)]"
          />
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