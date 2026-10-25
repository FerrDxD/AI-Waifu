import json
import re

with open('app/(main)/story/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's find all CHAPTERS array items
# We can find all {"speaker": ...} or { speaker: ... }
lines = code.split('\n')
current_chap = None
missing_bgs = []

for idx, line in enumerate(lines):
    chap_m = re.search(r'id:\s*(\d+)', line)
    if chap_m and 'title:' in lines[min(idx+1, len(lines)-1)]:
        current_chap = chap_m.group(1)
    
    # check if this line is a scene
    if ('"speaker"' in line or 'speaker:' in line) and ('"text"' in line or 'text:' in line):
        bg_m = re.search(r'["\']?bg["\']?:\s*["\']([^"\']+)["\']', line)
        bg = bg_m.group(1) if bg_m else None
        if not bg:
            missing_bgs.append((current_chap, idx+1, line.strip()[:80]))

print(f"Total scenes without explicit bg: {len(missing_bgs)}")
for m in missing_bgs:
    print(f"Chap {m[0]} (L{m[1]}): {m[2]}")
