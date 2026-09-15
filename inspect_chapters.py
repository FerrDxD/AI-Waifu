import re

with open('app/(main)/story/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect each chapter
chapters = re.findall(r'id:\s*(\d+),\s*title:\s*"([^"]+)"[\s\S]*?content:\s*\[([\s\S]*?)\]\s*\},', text)
for cid, title, content in chapters:
    # count scenes without "bg"
    scenes = re.findall(r'\{[^{}]+\}', content)
    no_bg = [s for s in scenes if '"bg"' not in s]
    with_bg = [s for s in scenes if '"bg"' in s]
    print(f"Chapter {cid} ({title}): total scenes {len(scenes)}, with bg {len(with_bg)}, WITHOUT bg {len(no_bg)}")
