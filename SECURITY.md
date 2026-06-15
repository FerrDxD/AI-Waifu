# Kebijakan Keamanan (Security Policy)

## Versi yang Didukung
Saat ini, proyek Teman Kost (AI-Waifu) berstatus *Early Development*. Hanya versi terbaru di *branch* `main` yang secara aktif mendapatkan dukungan perbaikan keamanan.

| Versi | Didukung |
|-------|----------|
| >= 0.1.x | ✅ Ya |
| < 0.1.0  | ❌ Tidak |

## Pelaporan Kerentanan (Reporting a Vulnerability)

Karena Teman Kost menangani masukan (input) dari pengguna yang akan diteruskan ke *Engine AI* (Gemini API) serta penyimpanan data lokal/database, masalah keamanan sangatlah krusial. 

Jika kamu menemukan kerentanan terkait keamanan:
1. **JANGAN** membuat laporan secara publik di GitHub Issues.
2. Silakan hubungi kami secara langsung melalui DM/Email ke pengelola repositori (FerrDxD / Hype GLK).
3. Kami akan merespon laporanmu selambat-lambatnya dalam 48 jam.
4. Kami akan mengevaluasi celah keamanan tersebut dan merilis *patch* secepatnya.

Beberapa hal yang kami perhatikan secara ketat:
- Potensi *Prompt Injection* yang berbahaya (melewati batas *lore* Livia).
- Keamanan token API pihak ketiga di sisi *client*.
- Eksploitasi pada manajemen *state* (misal: memanipulasi *inventory outfit* tanpa izin).

Terima kasih karena telah menjaga keamanan komunitas kita!
