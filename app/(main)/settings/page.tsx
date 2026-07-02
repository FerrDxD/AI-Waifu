'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, User, Volume2, Bell, ShieldAlert, LogOut, Check, X, Key, Sparkles, Trash2, Save, Download, Upload, HardDrive } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { playSfx } from '@/lib/sfx';
import { showCustomAlert, showCustomConfirm } from '@/lib/alert';

export default function SettingsPage() {
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
          <h1 className="font-display font-black text-2xl md:text-3xl text-[#5c4d47]">Setelan</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sistem & Preferensi</p>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto p-6 md:p-10 flex flex-col gap-10 pb-24">
        
        {/* Section 1: Audio & Visual */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <Volume2 className="text-[#ff758c]" /> Audio & Suara
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-6">
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#5c4d47]">Volume Suara Livia</span>
                <span className="text-xs font-bold text-pink-500">{volume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={volume} onChange={(e) => handleLiviaVolumeChange(Number(e.target.value))}
                className="w-full accent-[#ff758c] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#5c4d47]">Volume BGM (Musik Latar)</span>
                <span className="text-xs font-bold text-pink-500">{bgmVolume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={bgmVolume} onChange={(e) => handleBgmChange(Number(e.target.value))}
                className="w-full accent-[#ff758c] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#5c4d47]">Volume Efek Suara (SFX UI & Kerja)</span>
                <span className="text-xs font-bold text-pink-500">{sfxVolume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={sfxVolume} onChange={(e) => handleSfxChange(Number(e.target.value))}
                className="w-full accent-[#ff758c] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

          </div>
        </section>

        {/* Section 2: AI & Gemini API */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <Sparkles className="text-amber-500" /> AI & Gemini API Key
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[#5c4d47] flex items-center gap-2">
                <Key size={16} className="text-amber-500" /> API Key Pribadi (Custom Gemini Key)
              </span>
              <p className="text-xs text-gray-500 leading-relaxed">
                Supaya tidak terkena batas limit (429/503) saat bermain intensif, masukkan API Key Google Gemini milikmu sendiri (gratis dari Google AI Studio). Jika kosong, game menggunakan API default server.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <input 
                type="password"
                placeholder="AIzaSy... (Kosongkan untuk default)"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="flex-1 bg-orange-50/50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-[#5c4d47] placeholder-gray-400 focus:outline-none focus:border-orange-400 font-mono transition-all"
              />
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSaveApiKey}
                  className="bg-[#5c4d47] hover:bg-[#433833] text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
                >
                  <Save size={14} /> Simpan
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
              *API Key milikmu disimpan secara aman di browser (LocalStorage & Cookie) dan hanya dikirim langsung ke server Google AI saat kamu berinteraksi dengan Livia.
            </p>
          </div>
        </section>

        {/* Section 2: Notifications */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <Bell className="text-orange-400" /> Notifikasi
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-bold text-sm text-[#5c4d47]">Pengingat Harian Livia</span>
                <span className="text-xs text-gray-500">Dapatkan omelan jika kamu belum fokus kerja</span>
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
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-[#5c4d47] flex items-center gap-2">
            <HardDrive className="text-blue-500" /> Cadangkan & Pulihkan Data
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[#5c4d47]">Pengaman Progres Game</span>
              <p className="text-xs text-gray-500 leading-relaxed">
                Simpan progresmu (Uang Rv, Afeksi, Lemari, Tas, dan Stempel Login) ke dalam file .JSON agar tidak hilang saat ganti perangkat atau membersihkan cache browser.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <button
                onClick={handleBackupData}
                className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs p-4 rounded-2xl shadow-sm transition-all transform active:scale-98 group"
              >
                <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                Download Backup (.JSON)
              </button>

              <label className="flex items-center justify-center gap-3 bg-orange-50 hover:bg-orange-100 text-[#5c4d47] border border-orange-200 font-bold text-xs p-4 rounded-2xl shadow-sm cursor-pointer transition-all transform active:scale-98 group">
                <Upload size={18} className="text-orange-600 group-hover:-translate-y-0.5 transition-transform" />
                <span>Upload / Pulihkan Data</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleRestoreData} 
                  className="hidden" 
                />
              </label>
            </div>
            <p className="text-[11px] text-blue-600/80 font-medium">
              *File backup mencakup data profil server dan preferensi lokalmu.
            </p>
          </div>
        </section>

        {/* Section 3: Account & Danger Zone */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-black text-lg text-red-500 flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Akun & Data
          </h2>
          
          <div className="bg-red-50/50 rounded-[2rem] p-6 shadow-sm border border-red-100 flex flex-col gap-4">
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-red-100 hover:border-red-300 hover:shadow-md transition-all text-red-500 font-bold text-sm group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={18} />
                Keluar (Logout)
              </div>
              <ChevronLeft className="rotate-180 group-hover:translate-x-1 transition-transform" size={18} />
            </button>

            <button 
              onClick={handleResetData}
              className="w-full flex items-center justify-between p-4 bg-red-500 text-white rounded-2xl shadow-md hover:bg-red-600 transition-all font-bold text-sm group"
            >
              <div className="flex items-center gap-3">
                <User size={18} />
                Hapus & Reset Semua Data Kos
              </div>
            </button>
            <p className="text-center text-xs text-red-400 font-medium mt-1">Hati-hati! Menghapus data akan me-reset Afeksi dan Uang (Rv) ke 0.</p>

          </div>
        </section>

      </div>
    </div>
  );
}
