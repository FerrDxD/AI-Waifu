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
    <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl border border-pink-100 rounded-3xl shadow-[0_10px_25px_rgba(255,154,158,0.2)]">
      <h2 className="text-3xl font-display font-bold text-pink-600 text-center mb-8">
        {mode === 'login' ? 'Selamat Datang Kembali' : 'Reset Sandi'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl text-center font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 text-sm text-green-500 bg-green-50 border border-green-200 rounded-xl text-center font-medium">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'login' && (
          <>
            <div>
              <label className="block text-sm text-gray-700 font-bold mb-2">Email atau Username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 bg-white/90 border border-pink-200 text-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-400 transition-all"
                required
                disabled={loading}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-gray-700 font-bold">Password</label>
                <button type="button" onClick={() => { setMode('resetRequest'); setError(''); setSuccess(''); }} className="text-xs text-pink-500 hover:text-pink-600 font-bold hover:underline">
                  Lupa Sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/90 border border-pink-200 text-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-400 transition-all pr-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-2xl shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </>
        )}

        {mode === 'resetRequest' && (
          <>
            <div>
              <label className="block text-sm text-gray-700 font-bold mb-2">Masukkan Email / Username</label>
              <input
                type="text"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                className="w-full px-4 py-3 bg-white/90 border border-pink-200 text-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-400 transition-all"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-2xl shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mencari...' : 'Selanjutnya'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="w-full text-sm text-gray-500 font-bold hover:text-gray-700 mt-2">
              Kembali ke Login
            </button>
          </>
        )}

        {mode === 'resetNewPassword' && (
          <>
            <div>
              <label className="block text-sm text-gray-700 font-bold mb-2">Password Baru</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/90 border border-pink-200 text-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-400 transition-all pr-12"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-2xl shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Simpan Password Baru'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="w-full text-sm text-gray-500 font-bold hover:text-gray-700 mt-2">
              Batal
            </button>
          </>
        )}
      </form>

      <div className="mt-6 flex items-center justify-center space-x-4 opacity-70">
        <div className="h-px bg-pink-200 flex-1" />
        <span className="text-sm text-pink-400 font-medium">atau</span>
        <div className="h-px bg-pink-200 flex-1" />
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full mt-6 py-3 bg-white border border-pink-200 text-gray-700 font-bold rounded-2xl shadow-sm hover:shadow-md hover:border-pink-300 hover:bg-pink-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5">
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
