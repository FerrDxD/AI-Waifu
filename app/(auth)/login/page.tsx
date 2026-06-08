import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[url('/bg-texture.png')] bg-cover relative">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-0" />
      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-display italic text-accent hover:opacity-80 transition-opacity">
            Teman Kos
          </Link>
        </div>
        <LoginForm />
        <p className="mt-8 text-center text-text-muted text-sm">
          Belum punya akun?{' '}
          <Link href="/register" className="text-accent hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
