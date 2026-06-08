'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/home' });
  };

  return (
    <div className="w-full max-w-md p-8 bg-surface border border-custom rounded-sm shadow-2xl">
      <h2 className="text-3xl font-display italic text-accent text-center mb-8">Selamat Datang Kembali</h2>
      
      {error && (
        <div className="mb-4 p-3 text-sm text-[#ff6b6b] bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 rounded text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-text-muted mb-2 font-mono">Email atau Username</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-custom text-text-primary rounded-sm focus:outline-none focus:border-accent transition-colors"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm text-text-muted mb-2 font-mono">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-custom text-text-primary rounded-sm focus:outline-none focus:border-accent transition-colors"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-accent text-black font-medium rounded-sm hover:bg-[#d6a578] transition-colors disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center space-x-4">
        <div className="h-px bg-border flex-1" />
        <span className="text-sm text-text-muted font-mono">atau</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full mt-6 py-3 bg-background border border-custom text-text-primary rounded-sm hover:bg-border transition-colors flex items-center justify-center gap-2"
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
