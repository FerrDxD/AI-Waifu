'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'resetRequest' | 'resetNewPassword'>('login');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'login') {
      const res = await signIn('credentials', {
        redirect: false,
        identifier,
        password,
      });

      if (res?.error) {
        setError('Email/username atau password salah');
        setLoading(false);
      } else {
        router.push('/home');
        router.refresh();
      }
    } else if (mode === 'resetRequest') {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', identifier: resetIdentifier }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMode('resetNewPassword');
        setError('');
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'resetNewPassword') {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset', identifier: resetIdentifier, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMode('login');
        setSuccess('Password berhasil direset! Silakan login.');
        setIdentifier(resetIdentifier);
        setPassword('');
        setResetIdentifier('');
        setNewPassword('');
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/home' });
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-display font-bold text-[#5c4d47] text-center mb-8">
        {mode === 'login' ? 'Selamat Datang Kembali' : 'Reset Sandi'}
      </h2>
      
      {error && (
        <div className="mb-6 p-3 text-[13px] text-red-600 bg-red-50/50 border border-red-100 rounded-lg text-center font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-3 text-[13px] text-green-600 bg-green-50/50 border border-green-100 rounded-lg text-center font-medium">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'login' && (
          <>
            <div>
              <label className="block text-[13px] text-[#5c4d47] font-medium mb-1.5">Email atau Username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] text-[#5c4d47] text-[15px] rounded-lg focus:outline-none focus:border-[#5c4d47] focus:ring-1 focus:ring-[#5c4d47] transition-all placeholder-gray-400"
                required
                disabled={loading}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[13px] text-[#5c4d47] font-medium">Password</label>
                <button type="button" onClick={() => { setMode('resetRequest'); setError(''); setSuccess(''); }} className="text-[13px] text-[#5c4d47]/60 hover:text-[#5c4d47] hover:underline underline-offset-2 transition-colors">
                  Lupa Sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] text-[#5c4d47] text-[15px] rounded-lg focus:outline-none focus:border-[#5c4d47] focus:ring-1 focus:ring-[#5c4d47] transition-all pr-12 placeholder-gray-400"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5c4d47] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-[#423833] hover:bg-[#2a2422] text-[#fdfbf7] text-[15px] font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </>
        )}

        {mode === 'resetRequest' && (
          <>
            <div>
              <label className="block text-[13px] text-[#5c4d47] font-medium mb-1.5">Masukkan Email / Username</label>
              <input
                type="text"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] text-[#5c4d47] text-[15px] rounded-lg focus:outline-none focus:border-[#5c4d47] focus:ring-1 focus:ring-[#5c4d47] transition-all"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-[#423833] hover:bg-[#2a2422] text-[#fdfbf7] text-[15px] font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mencari...' : 'Selanjutnya'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="w-full text-[13px] text-[#5c4d47]/60 hover:text-[#5c4d47] transition-colors mt-2">
              Kembali ke Login
            </button>
          </>
        )}

        {mode === 'resetNewPassword' && (
          <>
            <div>
              <label className="block text-[13px] text-[#5c4d47] font-medium mb-1.5">Password Baru</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] text-[#5c4d47] text-[15px] rounded-lg focus:outline-none focus:border-[#5c4d47] focus:ring-1 focus:ring-[#5c4d47] transition-all pr-12"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5c4d47] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-[#423833] hover:bg-[#2a2422] text-[#fdfbf7] text-[15px] font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Simpan Password Baru'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="w-full text-[13px] text-[#5c4d47]/60 hover:text-[#5c4d47] transition-colors mt-2">
              Batal
            </button>
          </>
        )}
      </form>

      <div className="mt-8 mb-6 flex items-center justify-center space-x-4">
        <div className="h-[1px] bg-[#E5E0D8] flex-1" />
        <span className="text-[13px] text-[#5c4d47]/40 font-medium">Atau</span>
        <div className="h-[1px] bg-[#E5E0D8] flex-1" />
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-2.5 bg-white border border-[#E5E0D8] hover:border-gray-300 hover:bg-gray-50 text-[#5c4d47] text-[14px] font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Lanjutkan dengan Google
      </button>
    </div>
  );
}
