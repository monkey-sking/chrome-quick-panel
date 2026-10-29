#!/usr/bin/env python3
"""Regenerate the toolbar icons (bookmark ribbon + clock).

Usage: python3 tools/make_icons.py
Requires: Pillow
"""

import pathlib

from PIL import Image, ImageDraw

BLUE = (26, 115, 232, 255)
WHITE = (255, 255, 255, 255)
SUPERSAMPLE = 16


def render(size: int) -> Image.Image:
    scale = size * SUPERSAMPLE
    image = Image.new("RGBA", (scale, scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    width = scale * 0.50
    x0 = (scale - width) / 2
    y0, y1 = scale * 0.10, scale * 0.92
    draw.rounded_rectangle(
        [x0, y0, x0 + width, y1], radius=scale * 0.07, fill=BLUE
    )

    center_x = x0 + width / 2
    notch = width * 0.31
    draw.polygon(
        [
            (center_x - notch, y1 + 1),
            (center_x, y1 - notch * 1.15),
            (center_x + notch, y1 + 1),
        ],
        fill=(0, 0, 0, 0),
    )

    clock_x, clock_y, radius = center_x, scale * 0.50, scale * 0.185
    draw.ellipse(
        [clock_x - radius, clock_y - radius, clock_x + radius, clock_y + radius],
        fill=WHITE,
    )
    stroke = max(2, int(scale * 0.05))
    draw.line(
        [(clock_x, clock_y), (clock_x, clock_y - radius * 0.62)],
        fill=BLUE,
        width=stroke,
    )
    draw.line(
        [(clock_x, clock_y), (clock_x + radius * 0.52, clock_y)],
        fill=BLUE,
        width=stroke,
    )
    draw.ellipse(
        [clock_x - stroke, clock_y - stroke, clock_x + stroke, clock_y + stroke],
        fill=BLUE,
    )

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    icons = pathlib.Path(__file__).resolve().parent.parent / "icons"
    icons.mkdir(exist_ok=True)
    for size in (16, 32, 48, 128):
        render(size).save(icons / f"icon{size}.png")
        print(f"icons/icon{size}.png")


if __name__ == "__main__":
    main()
