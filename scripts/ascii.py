import sys
from PIL import Image

def make_ascii_art(img_path):
    try:
        # Load the illustration
        img = Image.open(img_path).convert("RGBA")
        
        # We need a reference background to subtract. Let's try to just find the solid color or the person.
        # Actually, let's just resize it to a very small size like 80x40 and print it.
        # But Livia might blend in. 
        # Let's load the background and subtract it.
        bg = Image.open(r"C:\Users\Hype GLK\teman-kost\public\bg\home screen\home_night.png").convert("RGBA")
        if img.size != bg.size:
            bg = bg.resize(img.size)
            
        # Resize both to 80x40
        small_size = (80, 40)
        img_small = img.resize(small_size)
        bg_small = bg.resize(small_size)
        
        chars = []
        for y in range(small_size[1]):
            row = []
            for x in range(small_size[0]):
                p1 = img_small.getpixel((x, y))
                p2 = bg_small.getpixel((x, y))
                
                diff = abs(p1[0]-p2[0]) + abs(p1[1]-p2[1]) + abs(p1[2]-p2[2])
                if diff > 30:
                    row.append("X") # Livia
                else:
                    row.append(".") # Background
            chars.append("".join(row))
            
        print("\n".join(chars))
        
    except Exception as e:
        print(f"Error: {e}")

make_ascii_art(r"C:\Users\Hype GLK\teman-kost\public\posisi-livia.png")
