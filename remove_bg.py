import os
from PIL import Image
import numpy as np

def make_white_transparent(image_path):
    img = Image.open(image_path).convert("RGBA")
    data = np.array(img)
    
    # White background threshold (R > 240, G > 240, B > 240)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    white_areas = (r >= 240) & (g >= 240) & (b >= 240)
    
    data[white_areas, 3] = 0 # set alpha to 0 for white areas
    
    new_img = Image.fromarray(data)
    new_img.save(image_path, "PNG")
    print(f"Processed: {image_path}")

target_dir = r"C:\Users\Hype GLK\teman-kost\public\livia\wardrobe"
for root, dirs, files in os.walk(target_dir):
    for filename in files:
        if filename.endswith(".png"):
            file_path = os.path.join(root, filename)
            try:
                make_white_transparent(file_path)
            except Exception as e:
                print(f"Failed to process {file_path}: {e}")
