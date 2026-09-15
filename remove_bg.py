import os
import sys
from PIL import Image
try:
    from rembg import remove, new_session
except ImportError:
    print("Modul 'rembg' belum diinstal. Silakan jalankan: pip install rembg")
    exit(1)

def make_bg_transparent(image_path, session):
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGBA")
            
            # Cek apakah gambar sudah memiliki pixel transparan
            if img.getchannel("A").getextrema()[0] < 255:
                print(f"[SKIP] Latar sudah transparan: {os.path.basename(image_path)}")
                return
            
            # Gunakan session khusus anime/ilustrasi untuk hasil mask yang jauh lebih bersih
            output = remove(img, session=session)
            
            # Simpan menimpa file asli dengan format WEBP
            output.save(image_path, "WEBP")
            print(f"[BERHASIL] memproses: {os.path.basename(image_path)}")
    except Exception as e:
        print(f"[GAGAL] memproses {os.path.basename(image_path)}: {e}")

if __name__ == "__main__":
    # Bisa pakai argumen CLI: python remove_bg.py path/ke/folder
    target_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), "public", "livia")
    
    if not os.path.exists(target_dir):
        print(f"Direktori tidak ditemukan: {target_dir}")
        exit(1)
        
    print(f"=== Memulai AI Background Removal di: {target_dir} ===")
    
    # Inisiasi model isnet-anime (otomatis di-download jika belum ada)
    session = new_session("isnet-anime")
    
    count = 0
    for root, _, files in os.walk(target_dir):
        for filename in files:
            if filename.lower().endswith(('.webp', '.png', '.jpg', '.jpeg')):
                file_path = os.path.join(root, filename)
                make_bg_transparent(file_path, session)
                count += 1
                
    print(f"=== Selesai! Total gambar diproses: {count} ===")
