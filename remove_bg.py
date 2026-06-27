import os
from PIL import Image, ImageDraw

def make_bg_transparent(image_path):
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()
    processed = False

    # First, handle solid corners (like before)
    corners = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
    for x, y in corners:
        try:
            r, g, b, a = pixels[x, y]
            if a > 0 and ((r >= 230 and g >= 230 and b >= 230) or (r <= 25 and g <= 25 and b <= 25)):
                ImageDraw.floodfill(img, xy=(x, y), value=(255, 255, 255, 0), thresh=20)
                processed = True
        except Exception:
            pass
            
    # Second, handle case where corners are transparent but there's a black/white bg inside
    # We find the first opaque pixel from the top, bottom, left, right that is black or white
    
    # Check middle edges to be safe
    mid_edges = [(w//2, 0), (w//2, h-1), (0, h//2), (w-1, h//2)]
    for x, y in mid_edges:
        try:
            r, g, b, a = pixels[x, y]
            if a > 0 and ((r >= 230 and g >= 230 and b >= 230) or (r <= 25 and g <= 25 and b <= 25)):
                ImageDraw.floodfill(img, xy=(x, y), value=(255, 255, 255, 0), thresh=20)
                processed = True
        except Exception:
            pass

    # Scan the image to find transparent pixels touching black/white pixels
    # Since floodfill is fast, we just find ONE seed and fill it
    if not processed:
        found_seed = False
        for y in range(h):
            for x in range(w):
                if pixels[x, y][3] == 0: # transparent
                    # check neighbors
                    for dx, dy in [(0,1), (1,0), (0,-1), (-1,0)]:
                        nx, ny = x+dx, y+dy
                        if 0 <= nx < w and 0 <= ny < h:
                            nr, ng, nb, na = pixels[nx, ny]
                            if na > 0 and ((nr >= 230 and ng >= 230 and nb >= 230) or (nr <= 25 and ng <= 25 and nb <= 25)):
                                ImageDraw.floodfill(img, xy=(nx, ny), value=(255, 255, 255, 0), thresh=20)
                                processed = True
                                found_seed = True
                                break
                if found_seed:
                    break
            if found_seed:
                break
                
    if processed:
        img.save(image_path, "WEBP")
        print(f"Processed with high precision: {image_path}")
    else:
        print(f"Skipped (No solid white/black bg found): {image_path}")

target_dir = r"C:\Users\Hype GLK\teman-kost\public\livia"
for root, dirs, files in os.walk(target_dir):
    for filename in files:
        if filename.endswith(".webp") or filename.endswith(".png"):
            file_path = os.path.join(root, filename)
            try:
                make_bg_transparent(file_path)
            except Exception as e:
                print(f"Failed to process {file_path}: {e}")
