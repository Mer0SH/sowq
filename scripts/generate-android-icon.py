"""Generate Souq's Android launcher icons from a simple vector-style drawing."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
GREEN = (39, 52, 40, 255)
CREAM = (250, 250, 248, 255)
GOLD = (212, 177, 123, 255)


def artwork(size: int, adaptive: bool = False) -> Image.Image:
    scale = 4
    canvas = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0) if adaptive else GREEN)
    draw = ImageDraw.Draw(canvas)

    def box(values):
        return tuple(round(value * size * scale / 1024) for value in values)

    # Android masks the outer part of an adaptive icon; keep the bag in its safe center.
    draw.rounded_rectangle(box((306, 345, 718, 733)), radius=round(size * scale * 46 / 1024), fill=CREAM)
    draw.arc(box((406, 246, 618, 481)), 190, 350, fill=CREAM, width=round(size * scale * 40 / 1024))
    draw.ellipse(box((574, 577, 665, 668)), fill=GOLD)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, size in sizes.items():
        folder = RES / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)
        artwork(size).save(folder / "ic_launcher.png")
        artwork(size).save(folder / "ic_launcher_round.png")
        artwork(size * 2, adaptive=True).save(folder / "ic_launcher_foreground.png")
    artwork(1024).save(ROOT / "souq-app-icon.png")
