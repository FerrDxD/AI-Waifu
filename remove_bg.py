import os
from PIL import Image
try:
    from rembg import remove
except ImportError:
    print("Modul 'rembg' belum diinstal. Silakan jalankan: pip install rembg")
    exit(1)

def make_bg_transparent(image_path):
    print(f"Memproses {image_path}...")
    try:
        # Buka gambar (convert ke RGBA agar aman)
        with Image.open(image_path) as img:
            img = img.convert("RGBA")
            
            # Cek apakah gambar sudah memiliki pixel transparan
            alpha = img.getchannel("A")
            min_alpha, max_alpha = alpha.getextrema()
            if min_alpha < 255:
                print(f"[SKIP] Latar sudah transparan: {os.path.basename(image_path)}")
                return
            
            # Gunakan rembg untuk menghapus background dengan AI (sangat presisi)
            output = remove(img)
            
            # Simpan kembali menimpa file asli
            output.save(image_path, "WEBP")
            print(f"[BERHASIL] memproses: {os.path.basename(image_path)}")
    except Exception as e:
        print(f"[GAGAL] memproses {os.path.basename(image_path)}: {e}")

if __name__ == "__main__":
    target_dir = r"C:\Users\Hype GLK\teman-kost\public\livia"
    
    print("=== Memulai proses pembersihan Background dengan AI (Rembg) ===")
    count = 0
    for root, dirs, files in os.walk(target_dir):
        for filename in files:
            if filename.endswith(".webp") or filename.endswith(".png"):
                file_path = os.path.join(root, filename)
                make_bg_transparent(file_path)
                count += 1
                
    print(f"=== Selesai! Total gambar diproses: {count} ===")
