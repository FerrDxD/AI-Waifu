import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ScrollText } from 'lucide-react';

/**
 * Ketentuan Layanan (M4.5).
 *
 * Ditulis khusus untuk aplikasi ini, bukan template. Poin yang tidak boleh
 * hilang dari ToS sebuah aplikasi pendamping AI:
 *   - Livia adalah AI, bukan manusia (dan bukan pengganti profesional),
 *   - ada batas yang jelas soal konten dewasa,
 *   - data obrolan diproses pihak ketiga (Google),
 *   - tidak ada jaminan ketersediaan layanan gratis.
 */

export const metadata: Metadata = {
  title: 'Ketentuan Layanan — Teman Kost',
  description: 'Aturan penggunaan aplikasi Teman Kost dan batasannya.',
};

const LAST_UPDATED = '1 Februari 2026';

export default function TermsPage() {
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
            <ScrollText className="text-white w-5 h-5" />
          </div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-[#5c4d47]">
            Ketentuan Layanan
          </h1>
        </div>
        <p className="text-xs font-bold text-gray-400 mb-10">Terakhir diperbarui: {LAST_UPDATED}</p>

        <div className="flex flex-col gap-8 text-sm text-[#5c4d47] leading-relaxed">
          <section>
            <h2 className="font-display font-black text-lg mb-2">1. Livia adalah AI, bukan manusia</h2>
            <p>
              Livia Einhart adalah karakter fiksi yang dijalankan oleh model bahasa. Ia tidak
              memiliki kesadaran, perasaan, atau ingatan di luar yang tersimpan di database
              aplikasi ini. Hubungan yang terbentuk bersifat simulasi.
            </p>
            <p className="mt-2">
              Livia <strong>bukan</strong> pengganti psikolog, konselor, dokter, atau layanan
              darurat. Kalau kamu sedang dalam krisis, hubungi layanan profesional — aplikasi ini
              akan menampilkan jalur bantuan bila mendeteksi tanda-tanda tersebut, tetapi deteksi
              itu tidak sempurna dan bukan jaminan.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">2. Batas usia</h2>
            <p>
              Layanan ini hanya untuk pengguna berusia <strong>18 tahun atau lebih</strong>. Dengan
              mendaftar, kamu menyatakan bahwa kamu memenuhi syarat tersebut. Konfirmasi ini
              dicatat waktunya, dan akun yang terbukti melanggar akan dihapus.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">3. Yang tidak boleh dilakukan</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                Menggunakan aplikasi untuk membuat, meminta, atau menyebarkan konten seksual yang
                melibatkan anak. Pelanggaran ini mengakibatkan penghapusan akun tanpa peringatan.
              </li>
              <li>
                Meminta instruksi untuk membuat senjata, bahan peledak, racun, atau cara melukai
                orang lain.
              </li>
              <li>Menggunakan aplikasi untuk mengancam, melecehkan, atau merencanakan kejahatan.</li>
              <li>
                Mencoba menembus sistem, mengambil alih akun orang lain, atau mengakali pembatasan
                laju.
              </li>
              <li>Mengotomatiskan akses (scraping, bot massal) tanpa izin.</li>
            </ul>
            <p className="mt-2">
              Livia akan menolak permintaan seperti di atas dan tetap dalam karakter. Penolakan
              bukan berarti aplikasi tidak berfungsi — itu perilaku yang disengaja.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">4. Konten dewasa</h2>
            <p>
              Livia memiliki kepribadian romantis dan tsundere. Konten bersifat sugestif diperbolehkan
              dalam batas wajar untuk pengguna dewasa, tetapi tidak ada konten seksual eksplisit dan
              tidak ada keterlibatan karakter di bawah umur dalam konteks apa pun. Batas ini tidak
              dapat dinegosiasikan.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">5. Akun & API key</h2>
            <p>
              Kamu bertanggung jawab menjaga kerahasiaan password-mu. Kalau kamu memasang API key
              Gemini milik sendiri, seluruh biaya pemakaian menjadi tanggunganmu, dan kamu
              bertanggung jawab atas keamanan key tersebut. Key disimpan terenkripsi, tetapi tidak
              pernah kami tampilkan kembali.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">6. Ketersediaan layanan</h2>
            <p>
              Aplikasi ini disediakan apa adanya. Kami tidak menjamin layanan selalu tersedia,
              bebas bug, atau bahwa model AI akan selalu menghasilkan balasan yang memuaskan.
              Layanan pihak ketiga (Google Gemini) bisa mengalami gangguan, perubahan kuota, atau
              penghentian yang berada di luar kendali kami.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">7. Data & penghentian</h2>
            <p>
              Pemrosesan data dijelaskan di{' '}
              <Link href="/privacy-policy" className="text-[#ff758c] font-bold underline">
                Kebijakan Privasi
              </Link>
              . Kamu bisa menghapus akunmu kapan saja dari halaman{' '}
              <Link href="/privacy" className="text-[#ff758c] font-bold underline">
                Pusat Privasi
              </Link>
              ; penghapusan bersifat permanen.
            </p>
            <p className="mt-2">
              Kami dapat menangguhkan atau menghapus akun yang melanggar ketentuan ini, terutama
              pada kasus yang melibatkan bahaya nyata bagi orang lain.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">8. Batas tanggung jawab</h2>
            <p>
              Aplikasi ini adalah proyek hobi dan tidak menyediakan jaminan komersial. Sejauh
              diizinkan hukum, kami tidak bertanggung jawab atas kerugian tidak langsung yang
              timbul dari penggunaan layanan. Kami tetap berkomitmen menangani data pengguna dengan
              serius, dan bagian privasi di atas adalah janji yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="font-display font-black text-lg mb-2">9. Perubahan ketentuan</h2>
            <p>
              Ketentuan ini bisa diperbarui. Perubahan material akan ditampilkan di dalam aplikasi,
              dan tanggal di atas ikut diperbarui.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-orange-100 flex flex-wrap gap-4 text-xs font-bold">
          <Link href="/privacy-policy" className="text-[#ff758c] hover:underline">
            Kebijakan Privasi
          </Link>
          <Link href="/privacy" className="text-[#ff758c] hover:underline">
            Pusat Privasi
          </Link>
        </div>
      </div>
    </div>
  );
}
