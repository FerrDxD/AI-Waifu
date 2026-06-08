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
    <div className="w-full max-w-md p-8 bg-surface border border-custom rounded-sm shadow-2xl">
      <h2 className="text-3xl font-display italic text-accent text-center mb-8">Mulai Perjalananmu</h2>
      
      {error && (
        <div className="mb-4 p-3 text-sm text-[#ff6b6b] bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 rounded text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-text-muted mb-2 font-mono">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-background border border-custom text-text-primary rounded-sm focus:outline-none focus:border-accent transition-colors"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-2 font-mono">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-background border border-custom text-text-primary rounded-sm focus:outline-none focus:border-accent transition-colors"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm text-text-muted mb-2 font-mono">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-background border border-custom text-text-primary rounded-sm focus:outline-none focus:border-accent transition-colors"
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-2 font-mono">Konfirmasi Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-background border border-custom text-text-primary rounded-sm focus:outline-none focus:border-accent transition-colors"
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-accent text-black font-medium rounded-sm hover:bg-[#d6a578] transition-colors mt-2 disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Daftar Akun'}
        </button>
      </form>
    </div>
  );
}
