#!/usr/bin/env python3
"""Compose 1280x800 Chrome Web Store screenshots from the rendered panel captures.

Inputs : assets/preview-history.png, assets/preview-bookmarks.png
Outputs: store/screenshots/01-history.png, 02-bookmarks.png
Requires: Pillow
"""

import pathlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "store" / "screenshots"

W, H = 1280, 800
BG_TOP = (246, 248, 251)
BG_BOTTOM = (229, 237, 248)
INK = (23, 32, 45)
MUTED = (95, 99, 104)
ACCENT = (26, 115, 232)

FONT_CJK = "/System/Library/Fonts/Hiragino Sans GB.ttc"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_CJK, size, index=2 if bold else 0)


def background() -> Image.Image:
    column = Image.new("RGB", (1, H))
    draw = ImageDraw.Draw(column)
    for y in range(H):
        t = y / (H - 1)
        draw.point(
            (0, y),
            fill=tuple(
                round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3)
            ),
        )
    canvas = column.resize((W, H), Image.BICUBIC).convert("RGBA")

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([820, -180, 1380, 380], fill=(26, 115, 232, 46))
    gd.ellipse([-160, 520, 420, 1100], fill=(120, 160, 255, 38))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(80)))
    return canvas


def trim_bottom(image: Image.Image, pad: int = 36) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    last = height - 1
    for y in range(height - 1, -1, -1):
        row_has_content = any(
            sum(abs(pixels[x, y][i] - 255) for i in range(3)) > 18
            for x in range(0, width, 3)
        )
        if row_has_content:
            last = y
            break
    return image.crop((0, 0, width, min(height, last + pad)))


def rounded(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, *image.size], radius=radius, fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask)
    return out


def compose(popup_path: pathlib.Path, out_path: pathlib.Path, title_lines, bullets) -> None:
    canvas = background()
    draw = ImageDraw.Draw(canvas)

    draw.text((88, 148), "C H R O M E   E X T E N S I O N", font=font(19, True), fill=ACCENT)

    y = 196
    for line, color in title_lines:
        draw.text((84, y), line, font=font(62, True), fill=color)
        y += 84

    y += 12
    draw.text((88, y), "左键书签 · 右键历史", font=font(26), fill=MUTED)

    y += 74
    for bullet in bullets:
        draw.ellipse([92, y + 11, 100, y + 19], fill=ACCENT)
        draw.text((116, y), bullet, font=font(23), fill=INK)
        y += 52

    popup = trim_bottom(Image.open(popup_path))
    target_w = 470
    scale = target_w / popup.width
    popup = popup.resize((target_w, round(popup.height * scale)), Image.LANCZOS)
    popup = rounded(popup, 16)

    x = W - target_w - 96
    py = (H - popup.height) // 2

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [x + 6, py + 16, x + popup.width + 6, py + popup.height + 16],
        radius=18,
        fill=(23, 32, 45, 60),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(26)))

    canvas.alpha_composite(popup, (x, py))
    ImageDraw.Draw(canvas).rounded_rectangle(
        [x, py, x + popup.width - 1, py + popup.height - 1],
        radius=16,
        outline=(214, 221, 231, 255),
        width=1,
    )

    OUT.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out_path, quality=95)
    print(out_path.relative_to(ROOT), canvas.size)


def main() -> None:
    compose(
        ROOT / "assets" / "preview-history.png",
        OUT / "01-history.png",
        [("书签 / 历史", INK), ("一键直达", ACCENT)],
        ["最近标签页与同步设备", "实时搜索书签，支持文件夹", "纯本地运行，不上传数据"],
    )
    compose(
        ROOT / "assets" / "preview-bookmarks.png",
        OUT / "02-bookmarks.png",
        [("书签面板", INK), ("搜索即达", ACCENT)],
        ["最近添加与文件夹折叠", "实时搜索全部书签", "点击即在新标签页打开"],
    )


if __name__ == "__main__":
    main()
