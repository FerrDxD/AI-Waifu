import sys
from PIL import Image

def analyze_diff(img_path, bg_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        bg = Image.open(bg_path).convert("RGBA")
        
        # Resize bg to match img just in case
        if img.size != bg.size:
            bg = bg.resize(img.size)
            
        width, height = img.size
        
        min_x = width
        min_y = height
        max_x = 0
        max_y = 0
        has_pixels = False
        
        img_data = list(img.getdata())
        bg_data = list(bg.getdata())
        
        for i in range(len(img_data)):
            p1 = img_data[i]
            p2 = bg_data[i]
            
            # Check difference (manhattan distance)
            diff = abs(p1[0]-p2[0]) + abs(p1[1]-p2[1]) + abs(p1[2]-p2[2])
            if diff > 50:  # Threshold
                y = i // width
                x = i % width
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                has_pixels = True
                
        if has_pixels:
            print(f"Livia Diff Bounding Box:")
            print(f"Left: {min_x} ({(min_x/width)*100:.2f}%)")
            print(f"Right: {max_x} ({(max_x/width)*100:.2f}%)")
            print(f"Top: {min_y} ({(min_y/height)*100:.2f}%)")
            print(f"Bottom: {max_y} ({(max_y/height)*100:.2f}%)")
            box_width = max_x - min_x
            box_height = max_y - min_y
            print(f"Width: {box_width} ({(box_width/width)*100:.2f}%)")
            print(f"Height: {box_height} ({(box_height/height)*100:.2f}%)")
        else:
            print("No diff found.")
    except Exception as e:
        print(f"Error: {e}")

analyze_diff(r"C:\Users\Hype GLK\teman-kost\public\posisi-livia.png", r"C:\Users\Hype GLK\teman-kost\public\bg\home screen\home_morning.png")
