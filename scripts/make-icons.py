"""Generates the app icons (run once; outputs are committed). Requires Pillow."""
import math
from PIL import Image, ImageDraw

BG = (10, 10, 28)
GOLD = (230, 195, 106)
INK = (235, 233, 247)

def draw(size, pad):
    S = size * 4  # supersample
    im = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(im)
    c = S / 2
    R = (S / 2) * (1 - pad)
    lw = max(2, int(S * 0.028))
    # outer ring + zodiac ring
    d.ellipse([c - R, c - R, c + R, c + R], outline=GOLD, width=lw)
    r2 = R * 0.72
    d.ellipse([c - r2, c - r2, c + r2, c + r2], outline=(120, 105, 60), width=max(2, lw // 2))
    # 12 sign ticks
    for i in range(12):
        a = math.radians(i * 30)
        x1, y1 = c + R * math.cos(a), c + R * math.sin(a)
        x2, y2 = c + r2 * math.cos(a), c + r2 * math.sin(a)
        d.line([x1, y1, x2, y2], fill=(120, 105, 60), width=max(2, lw // 2))
    # inner planets: two orbiting dots (transit gold, natal ink) and a centre sun
    r3 = R * 0.42
    ang = math.radians(-40)
    px, py = c + r3 * math.cos(ang), c + r3 * math.sin(ang)
    dot = R * 0.09
    d.ellipse([px - dot, py - dot, px + dot, py + dot], fill=GOLD)
    ang2 = math.radians(150)
    qx, qy = c + r3 * 0.9 * math.cos(ang2), c + r3 * 0.9 * math.sin(ang2)
    dot2 = R * 0.07
    d.ellipse([qx - dot2, qy - dot2, qx + dot2, qy + dot2], fill=INK)
    d.line([px, py, qx, qy], fill=(95, 214, 198), width=max(2, lw // 2))
    sun = R * 0.13
    d.ellipse([c - sun, c - sun, c + sun, c + sun], outline=GOLD, width=lw)
    d.ellipse([c - sun * 0.3, c - sun * 0.3, c + sun * 0.3, c + sun * 0.3], fill=GOLD)
    return im.resize((size, size), Image.LANCZOS)

for name, size, pad in [('icon-192.png', 192, 0.06), ('icon-512.png', 512, 0.06), ('apple-touch-icon.png', 180, 0.08),
                        ('maskable-512.png', 512, 0.22)]:
    draw(size, pad).save(f'public/icons/{name}')
print('icons written')
