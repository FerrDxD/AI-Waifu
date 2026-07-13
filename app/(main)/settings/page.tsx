'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, User, Volume2, Bell, ShieldAlert, LogOut, Check, X, Key, Sparkles, Trash2, Save, Download, Upload, HardDrive, Globe } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { playSfx } from '@/lib/sfx';
import { showCustomAlert, showCustomConfirm } from '@/lib/alert';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SettingsPage() {
  const { language, setLanguage, dict } = useLanguage();
  const [showLangModal, setShowLangModal] = useState(false);
  const [volume, setVolume] = useState(80);
  const [bgmVolume, setBgmVolume] = useState(50);
  const [sfxVolume, setSfxVolume] = useState(80);
  const [notifications, setNotifications] = useState(true);
  const [customApiKey, setCustomApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('custom_gemini_api_key');
    if (savedKey) setCustomApiKey(savedKey);

    const savedSfx = localStorage.getItem('sfx_volume');
    if (savedSfx !== null && !isNaN(parseInt(savedSfx, 10))) {
      setSfxVolume(parseInt(savedSfx, 10));
    }

    const savedBgm = localStorage.getItem('bgm_volume');
    if (savedBgm !== null && !isNaN(parseInt(savedBgm, 10))) {
      setBgmVolume(parseInt(savedBgm, 10));
    }

    const savedLivia = localStorage.getItem('livia_volume');
    if (savedLivia !== null && !isNaN(parseInt(savedLivia, 10))) {
      setVolume(parseInt(savedLivia, 10));
    }
  }, []);

  const handleSfxChange = (val: number) => {
    setSfxVolume(val);
    localStorage.setItem('sfx_volume', val.toString());
    playSfx('pop');
  };

  const handleBgmChange = (val: number) => {
    setBgmVolume(val);
    localStorage.setItem('bgm_volume', val.toString());
    // Dispatch event agar RadioProvider langsung update volume audio
    window.dispatchEvent(new CustomEvent('bgm_volume_change', { detail: val }));
  };

  const handleLiviaVolumeChange = (val: number) => {
    setVolume(val);
    localStorage.setItem('livia_volume', val.toString());
  };

  const handleSaveApiKey = async () => {
    if (customApiKey.trim()) {
      localStorage.setItem('custom_gemini_api_key', customApiKey.trim());
      document.cookie = `custom_gemini_api_key=${encodeURIComponent(customApiKey.trim())}; path=/; max-age=31536000; SameSite=Lax`;
      await showCustomAlert("API Key berhasil disimpan! Livia sekarang akan memakai Gemini API Key pribadimu.", "Sistem Gemini AI 🔑");
    } else {
      localStorage.removeItem('custom_gemini_api_key');
      document.cookie = "custom_gemini_api_key=; path=/; max-age=0";
      await showCustomAlert("API Key dikosongkan. Sistem kembali memakai API Key default server.", "Sistem Gemini AI 🔑");
    }
  };

  const handleResetApiKey = async () => {
    setCustomApiKey('');
    localStorage.removeItem('custom_gemini_api_key');
    document.cookie = "custom_gemini_api_key=; path=/; max-age=0";
    await showCustomAlert("API Key di-reset ke default server.", "Sistem Gemini AI 🔑");
  };

  const handleLogout = async () => {
    const confirmLogout = await showCustomConfirm("Apakah kamu yakin ingin keluar dari akun Teman Kos?", "Konfirmasi Keluar 🚪", "✅ Ya, Keluar");
    if (confirmLogout) {
      await signOut({ callbackUrl: '/login' });
    }
  };

  const handleResetData = async () => {
    const confirm = await showCustomConfirm("Apakah kamu yakin ingin mereset seluruh data (Uang, Afeksi, Barang)? Ini tidak bisa dikembalikan!", "Peringatan Bahaya ⚠️", "🔥 Ya, Reset Semua");
    if (confirm) {
      await showCustomAlert("Fitur reset sedang dalam tahap pengembangan (Server API diperlukan).", "Pemberitahuan");
    }
  };

  const handleBackupData = async () => {
    playSfx('coin');
    try {
      const res = await fetch('/api/affection');
      const serverData = res.ok ? await res.json() : {};

      const backupObj = {
        version: "2.2.6",
        appName: "Teman Kos with Livia",
        timestamp: new Date().toISOString(),
        localStorage: {
          livia_outfit: localStorage.getItem('livia_outfit'),
          custom_gemini_api_key: localStorage.getItem('custom_gemini_api_key'),
          sfx_volume: localStorage.getItem('sfx_volume'),
          daily_login_stamp: localStorage.getItem('daily_login_stamp'),
          unlocked_achievements: localStorage.getItem('unlocked_achievements'),
        },
        serverData
      };

      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `temankos-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await showCustomAlert("✅ Data game berhasil didownload! Simpan file ini di tempat yang aman.", "Cadangan Berhasil 💾");
    } catch (e) {
      console.error(e);
      await showCustomAlert("Gagal membuat file backup.", "Terjadi Kesalahan ❌");
    }
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupObj = JSON.parse(content);

        if (!backupObj || backupObj.appName !== "Teman Kos with Livia") {
          showCustomAlert("❌ File backup tidak valid atau rusak!", "Error Pemulihan ❌");
          return;
        }

        const confirmRestore = await showCustomConfirm("Apakah kamu yakin ingin memulihkan data game menggunakan file cadangan ini?", "Konfirmasi Pemulihan 📂", "✅ Ya, Pulihkan");
        if (!confirmRestore) return;

        playSfx('chime');

        if (backupObj.localStorage) {
          Object.entries(backupObj.localStorage).forEach(([key, val]) => {
            if (val !== null && val !== undefined) {
              localStorage.setItem(key, val as string);
            }
          });
        }

        if (backupObj.serverData) {
          await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupObj.serverData)
          });
        }

        await showCustomAlert("🎉 Data berhasil dipulihkan! Halaman akan dimuat ulang agar perubahan aktif.", "Pulih Berhasil ✨");
        window.location.reload();
      } catch (err) {
        console.error(err);
        showCustomAlert("❌ Terjadi kesalahan saat membaca file backup JSON.", "Error Pemulihan ❌");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#fdfbf7] relative overflow-y-auto custom-scrollbar flex flex-col font-sans select-none">
      
      {/* Top Header */}
      <div className="w-full p-6 md:p-10 flex items-center gap-6 sticky top-0 z-20 bg-[#fdfbf7]/80 backdrop-blur-xl border-b border-orange-100">
        <Link 
          href="/home" 
          className="bg-white border border-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-[#5c4d47] shadow-sm hover:scale-105 hover:bg-orange-50 hover:text-orange-600 transition-all group shrink-0"
        >
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div className="flex flex-col">
          <h1 className="font-display font-black text-2xl md:text-3xl text-[#5c4d47]">{dict.settings.title}</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dict.settings.subtitle}</p>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto p-6 md:p-10 flex flex-col gap-10 pb-24">
        
        {/* Section 1: Audio & Visual */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <Volume2 className="text-[#ff758c]" /> {dict.settings.audioSection}
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-6">
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#5c4d47]">{dict.settings.liviaVol}</span>
                <span className="text-xs font-bold text-pink-500">{volume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={volume} onChange={(e) => handleLiviaVolumeChange(Number(e.target.value))}
                className="w-full accent-[#ff758c] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#5c4d47]">{dict.settings.bgmVol}</span>
                <span className="text-xs font-bold text-pink-500">{bgmVolume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={bgmVolume} onChange={(e) => handleBgmChange(Number(e.target.value))}
                className="w-full accent-[#ff758c] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#5c4d47]">{dict.settings.sfxVol}</span>
                <span className="text-xs font-bold text-pink-500">{sfxVolume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={sfxVolume} onChange={(e) => handleSfxChange(Number(e.target.value))}
                className="w-full accent-[#ff758c] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

          </div>
        </section>

        {/* Section 1.5: Bahasa / Language */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <Globe className="text-blue-500" /> {dict.settings.langSection}
          </h2>
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[#5c4d47]">
                {dict.settings.langSub}
              </span>
              <p className="text-xs text-gray-500 leading-relaxed">
                {dict.settings.langDesc} ({language === 'en' ? 'English (EN)' : 'Bahasa Indonesia (ID)'}).
              </p>
            </div>
            <button
              onClick={() => {
                playSfx('pop');
                setShowLangModal(true);
              }}
              className="shrink-0 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff758c] to-[#ff0844] text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Globe size={16} />
              {language === 'en' ? 'English (EN)' : 'Bahasa Indonesia (ID)'} • {dict.settings.changeBtn}
            </button>
          </div>
        </section>

        {/* Section 2: AI & Gemini API */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <Sparkles className="text-amber-500" /> {dict.settings.aiSection}
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[#5c4d47] flex items-center gap-2">
                <Key size={16} className="text-amber-500" /> {dict.settings.aiCustomKey}
              </span>
              <p className="text-xs text-gray-500 leading-relaxed">
                {dict.settings.aiCustomDesc}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <input 
                type="password"
                placeholder={language === 'en' ? "AIzaSy... (Leave empty for default)" : "AIzaSy... (Kosongkan untuk default)"}
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="flex-1 bg-orange-50/50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-[#5c4d47] placeholder-gray-400 focus:outline-none focus:border-orange-400 font-mono transition-all"
              />
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSaveApiKey}
                  className="bg-[#5c4d47] hover:bg-[#433833] text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
                >
                  <Save size={14} /> {language === 'en' ? 'Save' : 'Simpan'}
                </button>
                {customApiKey && (
                  <button 
                    onClick={handleResetApiKey}
                    title="Hapus API Key"
                    className="bg-red-50 hover:bg-red-100 text-red-500 p-3 rounded-xl font-bold text-xs flex items-center justify-center transition-all shrink-0 border border-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-amber-600/80 font-medium">
              {language === 'en' ? '*Your API Key is safely stored in your browser (LocalStorage & Cookie) and sent directly to Google AI servers.' : '*API Key milikmu disimpan secara aman di browser (LocalStorage & Cookie) dan hanya dikirim langsung ke server Google AI saat kamu berinteraksi dengan Livia.'}
            </p>
          </div>
        </section>

        {/* Section 2: Notifications */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <Bell className="text-orange-400" /> {language === 'en' ? 'Notifications' : 'Notifikasi'}
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-bold text-sm text-[#5c4d47]">{language === 'en' ? 'Livia Daily Reminders' : 'Pengingat Harian Livia'}</span>
                <span className="text-xs text-gray-500">{language === 'en' ? "Get scolded if you haven't focused today" : "Dapatkan omelan jika kamu belum fokus kerja"}</span>
              </div>
              <button 
                onClick={() => setNotifications(!notifications)}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${notifications ? 'bg-[#ff758c]' : 'bg-gray-200'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${notifications ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white shadow-sm'}`}>
                  {notifications ? <Check size={14} className="text-[#ff758c]" /> : <X size={14} className="text-gray-400" />}
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Section: Backup & Restore */}
        {/* Section: Backup & Restore */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <HardDrive className="text-blue-500" /> {dict.settings.accountSection}
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[#5c4d47]">Backup & Restore</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <button
                onClick={handleBackupData}
                className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs p-4 rounded-2xl shadow-sm transition-all transform active:scale-98 group"
              >
                <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                {dict.settings.backupBtn}
              </button>

              <label className="flex items-center justify-center gap-3 bg-orange-50 hover:bg-orange-100 text-[#5c4d47] border border-orange-200 font-bold text-xs p-4 rounded-2xl shadow-sm cursor-pointer transition-all transform active:scale-98 group">
                <Upload size={18} className="text-orange-600 group-hover:-translate-y-0.5 transition-transform" />
                <span>{dict.settings.restoreBtn}</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleRestoreData} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        </section>

        {/* Section 3: Account & Danger Zone */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-red-500 flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> {dict.settings.accountSection}
          </h2>
          
          <div className="bg-red-50/50 rounded-[2rem] p-6 shadow-sm border border-red-100 flex flex-col gap-4">
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-red-100 hover:border-red-300 hover:shadow-md transition-all text-red-500 font-bold text-sm group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={18} />
                {dict.settings.logoutBtn}
              </div>
              <ChevronLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={18} />
            </button>

            <button 
              onClick={handleResetData}
              className="w-full flex items-center justify-between p-4 bg-red-500 text-white rounded-2xl shadow-md hover:bg-red-600 transition-all font-bold text-sm group"
            >
              <div className="flex items-center gap-3">
                <User size={18} />
                {dict.settings.resetDataBtn}
              </div>
            </button>
            <p className="text-center text-xs text-red-400 font-medium mt-1">{dict.settings.resetWarning}</p>

          </div>
        </section>

      </div>

      {/* Modal Pilih Bahasa */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-6 md:p-8 shadow-2xl border border-pink-100 flex flex-col gap-6 relative">
            <button 
              onClick={() => {
                playSfx('pop');
                setShowLangModal(false);
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-[#5c4d47]">{dict.settings.modalTitle}</h3>
                <p className="text-xs text-gray-500">{dict.settings.modalSub}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  playSfx('pop');
                  setLanguage('id');
                  setShowLangModal(false);
                }}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                  language === 'id'
                    ? 'border-[#ff758c] bg-pink-50/60 text-[#5c4d47] font-bold shadow-sm'
                    : 'border-gray-100 hover:border-pink-200 text-gray-600'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-base font-bold">{dict.settings.idTitle}</span>
                  <span className="text-xs text-gray-500">{dict.settings.idDesc}</span>
                </div>
                {language === 'id' && <Check className="text-[#ff758c]" size={20} />}
              </button>

              <button
                onClick={() => {
                  playSfx('pop');
                  setLanguage('en');
                  setShowLangModal(false);
                }}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                  language === 'en'
                    ? 'border-[#ff758c] bg-pink-50/60 text-[#5c4d47] font-bold shadow-sm'
                    : 'border-gray-100 hover:border-pink-200 text-gray-600'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-base font-bold">{dict.settings.enTitle}</span>
                  <span className="text-xs text-gray-500">{dict.settings.enDesc}</span>
                </div>
                {language === 'en' && <Check className="text-[#ff758c]" size={20} />}
              </button>
            </div>

            <button
              onClick={() => setShowLangModal(false)}
              className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm transition-all"
            >
              {dict.common.close}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
