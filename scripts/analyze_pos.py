import sys
from PIL import Image

def analyze_image(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        width, height = img.size
        
        min_x = width
        min_y = height
        max_x = 0
        max_y = 0
        
        has_pixels = False
        
        datas = img.getdata()
        for i, item in enumerate(datas):
            # Check if pixel is not fully transparent
            if item[3] > 0:
                y = i // width
                x = i % width
                
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                has_pixels = True
                
        if has_pixels:
            print(f"Image Size: {width}x{height}")
            print(f"Livia Bounding Box:")
            print(f"Left: {min_x} ({(min_x/width)*100:.2f}%)")
            print(f"Right: {max_x} ({(max_x/width)*100:.2f}%)")
            print(f"Top: {min_y} ({(min_y/height)*100:.2f}%)")
            print(f"Bottom: {max_y} ({(max_y/height)*100:.2f}%)")
            
            box_width = max_x - min_x
            box_height = max_y - min_y
            print(f"Livia Width: {box_width} ({(box_width/width)*100:.2f}%)")
            print(f"Livia Height: {box_height} ({(box_height/height)*100:.2f}%)")
        else:
            print("No visible pixels found.")
    except Exception as e:
        print(f"Error: {e}")

analyze_image(r"C:\Users\Hype GLK\teman-kost\public\posisi-livia.png")
