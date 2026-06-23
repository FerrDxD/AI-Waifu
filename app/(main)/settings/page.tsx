'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, User, Volume2, Bell, ShieldAlert, LogOut, Moon, Check, X } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  const [volume, setVolume] = useState(80);
  const [bgmVolume, setBgmVolume] = useState(50);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false); // UI only for now

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleResetData = () => {
    const confirm = window.confirm("Apakah kamu yakin ingin mereset seluruh data (Uang, Afeksi, Barang)? Ini tidak bisa dikembalikan!");
    if (confirm) {
      alert("Fitur reset sedang dalam tahap pengembangan (Server API diperlukan).");
    }
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
            <Volume2 className="text-[#ff758c]" /> Audio & Layar
          </h2>
          
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col gap-6">
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#5c4d47]">Volume Suara Livia</span>
                <span className="text-xs font-bold text-pink-500">{volume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-[#ff758c] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-[#5c4d47]">Volume BGM (Musik Latar)</span>
                <span className="text-xs font-bold text-pink-500">{bgmVolume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={bgmVolume} onChange={(e) => setBgmVolume(Number(e.target.value))}
                className="w-full accent-[#ff758c] h-2 bg-pink-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="w-full h-px bg-gray-100" />

            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-bold text-sm text-[#5c4d47]">Mode Gelap (Dark Mode)</span>
                <span className="text-xs text-gray-500">Ubah tampilan menjadi gelap</span>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${darkMode ? 'bg-[#5c4d47]' : 'bg-gray-200'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${darkMode ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white shadow-sm'}`}>
                  {darkMode ? <Moon size={14} className="text-[#5c4d47]" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
              </button>
            </div>

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
