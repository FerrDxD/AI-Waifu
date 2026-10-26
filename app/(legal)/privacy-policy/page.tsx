import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

/**
 * Kebijakan Privasi (M4.5).
 *
 * Ditulis sebagai halaman statis, bukan modal di dalam aplikasi: dokumen ini
 * harus bisa dibuka tanpa login (calon user berhak membacanya sebelum
 * mendaftar) dan harus punya URL yang bisa dirujuk.
 *
 * Isinya sengaja menyebut nama pihak ketiga secara eksplisit (Google Gemini).
 * Kebijakan privasi yang berbunyi "kami dapat membagikan data ke mitra" tanpa
 * menyebut siapa mitranya tidak memberi informasi apa pun yang berguna.
 */

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — Teman Kost',
  description: 'Apa yang kami simpan, ke mana datanya pergi, dan cara menghapusnya.',
};

const LAST_UPDATED = '1 Februari 2026';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-3xl mx-auto px-5 py-10 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#ff758c] hover:underline mb-8"
        >
          <ArrowLeft size={14} /> Kembali
        </Link>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff758c] to-[#ff8c75] flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-[#5c4d47]">
            Kebijakan Privasi
          </h1>
        </div>
        <p className="text-xs font-bold text-gray-400 mb-10">Terakhir diperbarui: {LAST_UPDATED}</p>

        <div className="flex flex-col gap-8 text-sm text-[#5c4d47] leading-relaxed">
          <section>
            <h2 className="font-display font-black text-lg mb-2">Ringkasan singkat</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Kami menyimpan akun, progres cerita, riwayat obrolan, dan memori Livia tentangmu.</li>
              <li>Isi obrolan dikirim ke <strong>Google Gemini</strong> untuk menghasilkan balasan.</li>
              <li>Kami <strong>tidak</strong> menjual datamu dan tidak memasang iklan.</li>
              <li>Kamu bisa mengunduh seluruh datamu, dan menghapus akun beserta seluruh datanya.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">1. Data yang kami simpan</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-orange-100 rounded-xl overflow-hidden">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="text-left p-2.5 font-black">Kategori</th>
                    <th className="text-left p-2.5 font-black">Contoh</th>
                    <th className="text-left p-2.5 font-black">Tujuan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-orange-50">
                    <td className="p-2.5 font-bold">Akun</td>
                    <td className="p-2.5">Email, username, hash password</td>
                    <td className="p-2.5">Login & keamanan akun</td>
                  </tr>
                  <tr className="border-t border-orange-50">
                    <td className="p-2.5 font-bold">Progres</td>
                    <td className="p-2.5">Afeksi, chapter, item, uang, kebun</td>
                    <td className="p-2.5">Menyimpan permainanmu</td>
                  </tr>
                  <tr className="border-t border-orange-50">
                    <td className="p-2.5 font-bold">Obrolan</td>
                    <td className="p-2.5">Pesanmu & balasan Livia</td>
                    <td className="p-2.5">Konteks percakapan</td>
                  </tr>
                  <tr className="border-t border-orange-50">
                    <td className="p-2.5 font-bold">Memori</td>
                    <td className="p-2.5">Fakta bertipe: nama panggilan, hobi, rencana</td>
                    <td className="p-2.5">Supaya Livia mengingatmu</td>
                  </tr>
                  <tr className="border-t border-orange-50">
                    <td className="p-2.5 font-bold">Aktivitas</td>
                    <td className="p-2.5">Screen time, sesi pomodoro</td>
                    <td className="p-2.5">Fitur produktivitas</td>
                  </tr>
                  <tr className="border-t border-orange-50">
                    <td className="p-2.5 font-bold">Audit</td>
                    <td className="p-2.5">Jenis aksi sensitif & waktunya</td>
                    <td className="p-2.5">Keamanan & kepatuhan</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">
              Kami <strong>tidak</strong> menyimpan tanggal lahirmu. Age gate hanya mencatat{' '}
              <em>kapan</em> kamu mengonfirmasi usia, bukan berapa usiamu.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">2. Ke mana data pergi</h2>
            <p>
              Setiap kali kamu mengirim pesan, teks pesan (beserta sebagian konteks percakapan dan
              memori yang relevan) dikirim ke <strong>Google Gemini API</strong> untuk menghasilkan
              balasan. Itu berarti datamu diproses oleh Google di luar kendali kami, dan tunduk pada
              kebijakan privasi Google.
            </p>
            <p className="mt-2">
              Sebelum dikirim, kami menyaring data pribadi yang tidak dibutuhkan Livia untuk
              menjawab — nomor telepon, email, NIK, nomor rekening, dan alamat IP diganti token
              sementara (mis. <code className="bg-orange-50 px-1 rounded">[[PHONE_1]]</code>) dan
              dipulihkan lagi saat balasan ditampilkan. Penyaringan ini berbasis pola, jadi tidak
              menjamin 100% — jangan pernah mengirim data sensitif ke aplikasi ini.
            </p>
            <p className="mt-2">
              Kalau kamu mengisi API key Gemini milik sendiri, obrolanmu memakai key itu dan
              tagihannya menjadi tanggunganmu. Key disimpan terenkripsi (AES-256-GCM) dan tidak
              pernah dikirim balik ke browser.
            </p>
            <p className="mt-2">
              Kami <strong>tidak</strong> memakai layanan analytics pihak ketiga, tidak memasang
              iklan, dan tidak membuat profil untuk periklanan.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">3. Dasar & lama penyimpanan</h2>
            <p>
              Data disimpan selama akunmu ada. Riwayat obrolan dipadatkan menjadi ringkasan setelah
              jumlahnya melewati batas tertentu; pesan aslinya tetap tersimpan sampai kamu
              menghapusnya. Memori yang jarang relevan meluruh dan akhirnya dipadatkan menjadi
              catatan harian.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">4. Hak kamu</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <strong>Mengunduh data</strong> — halaman <Link href="/privacy" className="text-[#ff758c] font-bold underline">Pusat Privasi</Link>{' '}
                menyediakan ekspor lengkap dalam format JSON atau Markdown.
              </li>
              <li>
                <strong>Menghapus memori</strong> — di Pengaturan, satu per satu atau seluruhnya.
                Livia langsung melupakannya.
              </li>
              <li>
                <strong>Menghapus akun</strong> — penghapusan permanen, seluruh tabel terkait ikut
                terhapus lewat cascade. Tidak ada periode pemulihan diam-diam.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">5. Keamanan</h2>
            <p>
              Password di-hash dengan bcrypt (cost 12). API key dienkripsi AES-256-GCM. Akses ke
              data selalu difilter berdasarkan ID user yang sedang login — tidak ada endpoint yang
              menerima ID user dari client.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">6. Anak-anak</h2>
            <p>
              Aplikasi ini hanya untuk pengguna berusia <strong>18 tahun atau lebih</strong>. Kami
              tidak dengan sengaja mengumpulkan data dari anak di bawah usia tersebut. Kalau kamu
              mengetahui ada akun seperti itu, hubungi kami dan akun tersebut akan dihapus.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">7. Perubahan</h2>
            <p>
              Kalau kebijakan ini berubah secara material, tanggal di atas ikut diperbarui dan
              perubahan penting akan ditampilkan di dalam aplikasi.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">8. Kontak</h2>
            <p>
              Pertanyaan soal data & privasi: buka issue di{' '}
              <a
                href="https://github.com/FerrDxD/AI-Waifu"
                target="_blank"
                rel="noreferrer"
                className="text-[#ff758c] font-bold underline"
              >
                repositori proyek
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-orange-100 flex flex-wrap gap-4 text-xs font-bold">
          <Link href="/tos" className="text-[#ff758c] hover:underline">
            Ketentuan Layanan
          </Link>
          <Link href="/privacy" className="text-[#ff758c] hover:underline">
            Pusat Privasi
          </Link>
        </div>
      </div>
    </div>
  );
}
