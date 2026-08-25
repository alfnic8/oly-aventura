from PIL import Image
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "public"
src = root / "assets" / "oly-portada.png"
img = Image.open(src).convert("RGBA")
w, h = img.size
print("portada", w, h)

# Focus square on Oly's head/torso for the app icon
side = int(min(w, h) * 0.78)
cx, cy = w // 2, int(h * 0.40)
left = max(0, min(w - side, cx - side // 2))
top = max(0, min(h - side, cy - side // 2))
crop = img.crop((left, top, left + side, top + side))

icons = root / "icons"
icons.mkdir(exist_ok=True)

def save_icon(size, name):
    out = crop.resize((size, size), Image.Resampling.NEAREST)
    path = icons / name
    out.save(path, "PNG")
    print("wrote", path, size)

save_icon(192, "icon-192.png")
save_icon(512, "icon-512.png")
save_icon(180, "apple-touch-icon.png")

pixel = root / "assets" / "oly-portada-pixel.png"
img.save(pixel, "PNG")
print("wrote", pixel, pixel.stat().st_size)
