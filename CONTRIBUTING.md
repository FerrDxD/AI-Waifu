# Panduan Kontribusi (Teman Kost / AI-Waifu)

Terima kasih atas ketertarikanmu untuk ikut membangun **Teman Kost**! Kami bercita-cita membuat aplikasi produktivitas yang terasa seperti game *Visual Novel* modern yang imersif dan *aesthetic*.

## Peran yang Dibutuhkan

Kami menerima berbagai macam kontribusi, tidak hanya kode!

### 💻 1. Programmer / Developer
- Jika menemukan *bug*, buka **Issue** terlebih dahulu agar kita bisa mendiskusikannya.
- Ikuti standar penulisan kode Next.js dan Tailwind CSS yang ada.
- Gunakan arsitektur *Client/Server Components* yang rapi. Jangan ragu untuk me-refactor jika dirasa perlu untuk *performance*.

### 🎨 2. Visual Artist (Sprite & Background)
Karena proyek ini kental dengan elemen Visual Novel, visual aset adalah nyawa kami.
- **Sprite Karakter (Livia):** Sprite menggunakan resolusi layar penuh (rasio 16:9, e.g., 1920x1080) agar mudah di-blend ke *layout* tanpa perlu modifikasi ukuran yang rumit. Pastikan *background* transparan (.png).
- **Background (BG):** Sama, gunakan rasio 16:9 (.png atau .jpg kualitas tinggi). 
- Jika mengirim PR berisikan gambar, pastikan *file size* sudah di-optimisasi agar aplikasi tetap ringan.

### ✍️ 3. Story Writer / Scriptwriter
- Fitur AI di-drive oleh *prompting* dan konteks lokal (lore).
- Jika punya ide untuk dialog, respons kustom Livia (seperti bajunya, reaksi telat mengerjakan tugas, dll), silakan usulkan di bagian *Issues* dengan label `story/lore`.

## Aturan Pull Request (PR)

1. Lakukan *Fork* pada repository ini.
2. Buat *branch* fiturmu (`git checkout -b feature/NamaFitur`).
3. Pastikan kode/aset sudah berjalan dengan baik secara lokal (`npm run dev`).
4. Lakukan *Commit* (`git commit -m 'Menambahkan kostum baru: Yukata Festival'`).
5. *Push* ke *branch* (`git push origin feature/NamaFitur`).
6. Buka **Pull Request**.

Sekali lagi, terima kasih! Kehadiranmu sangat berarti bagi Livia.
