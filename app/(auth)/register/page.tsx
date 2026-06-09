import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-pink-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000" />
      
      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-5xl font-display font-bold text-pink-600 hover:text-pink-500 transition-colors drop-shadow-sm">
            Teman Kos
          </Link>
        </div>
        <RegisterForm />
        <p className="mt-8 text-center text-gray-600 text-sm font-medium">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-pink-600 font-bold hover:underline hover:text-pink-500 transition-colors">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
