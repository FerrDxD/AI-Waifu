'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok');
      setLoading(false);
      return;
    }

    try {
      // Create user using our API route (which we will create in the next prompt, but let's mock the request for now)
      // Actually, we don't have a register API route yet. I will create it.
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

      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl border border-pink-100 rounded-3xl shadow-[0_10px_25px_rgba(255,154,158,0.2)]">
      <h2 className="text-3xl font-display font-bold text-pink-600 text-center mb-8">Mulai Perjalananmu</h2>
      
      {error && (
        <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-700 font-bold mb-2">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/90 border border-pink-200 text-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-400 transition-all"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 font-bold mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/90 border border-pink-200 text-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-400 transition-all"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-700 font-bold mb-2">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/90 border border-pink-200 text-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-400 transition-all"
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 font-bold mb-2">Konfirmasi Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/90 border border-pink-200 text-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-200 focus:border-pink-400 transition-all"
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-2xl shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Memproses...' : 'Daftar Akun'}
        </button>
      </form>
    </div>
  );
}
