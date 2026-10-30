import Link from 'next/link';

/**
 * Halaman offline (M8.5) — ditampilkan service worker saat navigasi gagal
 * (tidak ada koneksi & halaman belum di-cache). Sederhana, tanpa fetch.
 */
export default function OfflinePage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#fff5f6] px-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-sm border border-pink-100 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#ff8fa3] to-[#ff4f7b] flex items-center justify-center text-3xl mb-5">
          💔
        </div>
        <h1 className="font-display font-black text-2xl text-[#5c4d47] mb-2">
          Kamu lagi offline
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Livia ngga bisa nyambung ke server. Cek koneksi internetmu, terus coba
          buka halaman ini lagi ya.
        </p>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff8fa3] to-[#ff4f7b] text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-sm hover:opacity-90 transition-opacity"
        >
          Coba lagi
        </Link>
      </div>
    </main>
  );
}
