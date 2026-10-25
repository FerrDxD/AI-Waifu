import cv2
import numpy as np
import argparse
import os

def adjust_gamma(image, gamma=1.0):
    # Membangun lookup table untuk gamma correction
    invGamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    return cv2.LUT(image, table)

def apply_color_tint(image, b_mult, g_mult, r_mult):
    # Memisahkan channel warna B, G, R
    b, g, r = cv2.split(image)
    
    # Mengalikan tiap channel dengan multiplier dan memotong nilainya agar tidak melebihi 255
    b = np.clip(b * b_mult, 0, 255).astype(np.uint8)
    g = np.clip(g * g_mult, 0, 255).astype(np.uint8)
    r = np.clip(r * r_mult, 0, 255).astype(np.uint8)
    
    # Menggabungkan kembali channel warna
    return cv2.merge((b, g, r))

def change_time_of_day(image_path, target_time):
    if not os.path.exists(image_path):
        print(f"File {image_path} tidak ditemukan!")
        return
        
    # Load gambar (OpenCV menggunakan format BGR, bukan RGB)
    img = cv2.imread(image_path)
    if img is None:
        print("Gagal memuat gambar. Pastikan format didukung (jpg, png, dll).")
        return
        
    result = img.copy()
    time = target_time.lower()

    print(f"Menerapkan efek '{time}' pada gambar...")

    if time == "pagi":
        # Pagi: Cerah, sedikit kebiruan dan kuning (fresh morning light)
        result = adjust_gamma(result, gamma=1.1)
        result = apply_color_tint(result, b_mult=1.1, g_mult=1.05, r_mult=1.0)
        
    elif time == "siang":
        # Siang: Sangat cerah, kontras tinggi, warna natural
        result = adjust_gamma(result, gamma=1.2)
        # Menambah saturasi
        hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.2, 0, 255)
        result = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        
    elif time == "sore":
        # Sore (Golden Hour): Sedikit lebih gelap, sangat hangat (kemerahan/oranye)
        result = adjust_gamma(result, gamma=0.9)
        # Mengurangi biru, menaikkan merah dan hijau (yellowish orange)
        result = apply_color_tint(result, b_mult=0.7, g_mult=0.9, r_mult=1.3)
        
    elif time == "malam":
        # Malam: Gelap, dominan warna biru
        result = adjust_gamma(result, gamma=0.5)
        # Sangat mengurangi merah dan hijau, mempertahankan biru
        result = apply_color_tint(result, b_mult=1.2, g_mult=0.8, r_mult=0.6)
        
    elif time == "tengah_malam":
        # Tengah Malam: Sangat gelap, kontras rendah, biru pekat
        result = adjust_gamma(result, gamma=0.3)
        result = apply_color_tint(result, b_mult=1.3, g_mult=0.6, r_mult=0.4)
        
    else:
        print("Waktu tidak valid! Pilih: pagi, siang, sore, malam, tengah_malam")
        return

    # Menyimpan hasil
    filename, ext = os.path.splitext(image_path)
    output_path = f"{filename}_{time}{ext}"
    cv2.imwrite(output_path, result)
    print(f"[BERHASIL] Gambar disimpan sebagai: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Script untuk merubah suasana waktu pada foto (OpenCV).")
    parser.add_argument("image", help="Path ke file gambar input")
    parser.add_argument("--time", required=True, choices=["pagi", "siang", "sore", "malam", "tengah_malam"], 
                        help="Target waktu: pagi, siang, sore, malam, tengah_malam")
    
    args = parser.parse_args()
    change_time_of_day(args.image, args.time)
