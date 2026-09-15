import re
import os

with open('app/(main)/story/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

bgs = set(re.findall(r'"bg":\s*"([^"]+)"', text))
print("Total unique bg values:", len(bgs))
missing = []
for bg in sorted(bgs):
    expected_path = f"public/bg_story-{bg}.webp"
    if not os.path.exists(expected_path):
        missing.append((bg, expected_path))

print(f"Missing files ({len(missing)}):")
for m in missing:
    print(" ", m)

# Also check chapter id backgrounds (when scene.bg is undefined)
for chap_id in range(16):
    expected_path = f"public/bg_story-{chap_id}.webp"
    if not os.path.exists(expected_path):
        print(f"Chapter default missing: bg_story-{chap_id}.webp")
