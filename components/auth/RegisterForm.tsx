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
    <div className="w-full">
      <h2 className="text-2xl font-display font-bold text-[#5c4d47] text-center mb-8">Mulai Perjalananmu</h2>
      
      {error && (
        <div className="mb-6 p-3 text-[13px] text-red-600 bg-red-50/50 border border-red-100 rounded-lg text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] text-[#5c4d47] font-medium mb-1.5">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] text-[#5c4d47] text-[15px] rounded-lg focus:outline-none focus:border-[#5c4d47] focus:ring-1 focus:ring-[#5c4d47] transition-all placeholder-gray-400"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-[13px] text-[#5c4d47] font-medium mb-1.5">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] text-[#5c4d47] text-[15px] rounded-lg focus:outline-none focus:border-[#5c4d47] focus:ring-1 focus:ring-[#5c4d47] transition-all placeholder-gray-400"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-[13px] text-[#5c4d47] font-medium mb-1.5">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] text-[#5c4d47] text-[15px] rounded-lg focus:outline-none focus:border-[#5c4d47] focus:ring-1 focus:ring-[#5c4d47] transition-all placeholder-gray-400"
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-[13px] text-[#5c4d47] font-medium mb-1.5">Konfirmasi Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] text-[#5c4d47] text-[15px] rounded-lg focus:outline-none focus:border-[#5c4d47] focus:ring-1 focus:ring-[#5c4d47] transition-all placeholder-gray-400"
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 mt-4 bg-[#423833] hover:bg-[#2a2422] text-[#fdfbf7] text-[15px] font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Memproses...' : 'Daftar Akun'}
        </button>
      </form>
    </div>
  );
}
