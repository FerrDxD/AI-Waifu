import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#fdfbf7] font-sans selection:bg-[#ff758c] selection:text-white">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-10">
          <Link href="/" className="text-3xl font-display font-black text-[#5c4d47] tracking-tight">
            Teman Kos
          </Link>
        </div>
        <LoginForm />
        <p className="mt-8 text-center text-[#5c4d47]/60 text-[13px] font-medium">
          Belum punya akun?{' '}
          <Link href="/register" className="text-[#5c4d47] font-bold hover:underline underline-offset-4 transition-all">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
