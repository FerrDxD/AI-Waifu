'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Sparkles, UserPlus, ArrowRight } from 'lucide-react';
import { playSfx } from '@/lib/sfx';

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    playSfx('click');

    if (formData.password !== formData.confirmPassword) {
      playSfx('error');
      setError('Password dan konfirmasinya tidak cocok!');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Terjadi kesalahan saat mendaftar');
      }

      playSfx('chime');
      router.push('/login?registered=true');
    } catch (err: any) {
      playSfx('error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl md:text-2xl font-display font-black text-[#5c4d47] text-center mb-6 flex items-center justify-center gap-2">
        <UserPlus className="text-[#ff758c] w-5 h-5" />
        <span>Daftar Penghuni Baru</span>
      </h2>
      
      {error && (
        <div className="mb-6 p-3.5 text-xs md:text-sm text-red-600 bg-red-50/80 border border-red-200 rounded-2xl text-center font-bold shadow-sm animate-shake">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#5c4d47] uppercase tracking-wider mb-1.5 ml-1">Nama Panggilan (Username)</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            onFocus={() => playSfx('pop')}
            placeholder="Contoh: Budi, Asep, Siska..."
            className="w-full px-4 py-3 bg-orange-50/40 border-2 border-orange-100 text-[#5c4d47] text-sm md:text-base rounded-2xl focus:outline-none focus:border-[#ff758c] focus:bg-white focus:ring-4 focus:ring-pink-500/10 transition-all placeholder-gray-400 font-medium shadow-inner"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#5c4d47] uppercase tracking-wider mb-1.5 ml-1">Alamat Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onFocus={() => playSfx('pop')}
            placeholder="namamu@email.com"
            className="w-full px-4 py-3 bg-orange-50/40 border-2 border-orange-100 text-[#5c4d47] text-sm md:text-base rounded-2xl focus:outline-none focus:border-[#ff758c] focus:bg-white focus:ring-4 focus:ring-pink-500/10 transition-all placeholder-gray-400 font-medium shadow-inner"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-[#5c4d47] uppercase tracking-wider mb-1.5 ml-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => playSfx('pop')}
              placeholder="Minimal 6 karakter"
              className="w-full px-4 py-3 bg-orange-50/40 border-2 border-orange-100 text-[#5c4d47] text-sm md:text-base rounded-2xl focus:outline-none focus:border-[#ff758c] focus:bg-white focus:ring-4 focus:ring-pink-500/10 transition-all pr-12 placeholder-gray-400 font-medium shadow-inner"
              required
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => { playSfx('click'); setShowPassword(!showPassword); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#ff758c] transition-colors p-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#5c4d47] uppercase tracking-wider mb-1.5 ml-1">Konfirmasi Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onFocus={() => playSfx('pop')}
              placeholder="Ulangi password di atas"
              className="w-full px-4 py-3 bg-orange-50/40 border-2 border-orange-100 text-[#5c4d47] text-sm md:text-base rounded-2xl focus:outline-none focus:border-[#ff758c] focus:bg-white focus:ring-4 focus:ring-pink-500/10 transition-all pr-12 placeholder-gray-400 font-medium shadow-inner"
              required
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => { playSfx('click'); setShowConfirmPassword(!showConfirmPassword); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#ff758c] transition-colors p-1"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 mt-6 bg-gradient-to-r from-[#ff758c] via-[#ff7eb3] to-[#ff8c75] hover:from-[#ff647e] hover:to-[#ff6da8] text-white font-display font-black text-base rounded-2xl shadow-lg shadow-pink-500/25 hover:shadow-pink-500/35 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? 'Mendaftarkan Kunci...' : (
            <>
              <span>Daftar Sekarang</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
