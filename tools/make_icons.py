#!/usr/bin/env python3
"""Regenerate the toolbar icons: a clock (history) beside a bookmark ribbon.

Usage: python3 tools/make_icons.py
Requires: Pillow
"""

import pathlib

from PIL import Image, ImageDraw

TILE_TOP = (76, 141, 246, 255)
TILE_BOTTOM = (21, 101, 216, 255)
WHITE = (255, 255, 255, 255)
AMBER = (255, 190, 61, 255)
SUPERSAMPLE = 16


def render(size: int) -> Image.Image:
    scale = size * SUPERSAMPLE

    # 圆角方砖底：浅色 / 深色工具栏上都看得清，也让两个图形在小尺寸下不糊成一团。
    gradient = Image.new("RGBA", (scale, scale))
    for y in range(scale):
        t = y / max(1, scale - 1)
        gradient.paste(
            tuple(
                round(TILE_TOP[i] + (TILE_BOTTOM[i] - TILE_TOP[i]) * t) for i in range(4)
            ),
            (0, y, scale, y + 1),
        )

    image = Image.new("RGBA", (scale, scale), (0, 0, 0, 0))
    mask = Image.new("L", (scale, scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, scale - 1, scale - 1], radius=scale * 0.23, fill=255
    )
    image.paste(gradient, (0, 0), mask)
    draw = ImageDraw.Draw(image)

    # 左：时钟（历史）。空心圆环 + 指针，圆环本身就能读出「时钟」。
    clock_x, clock_y = scale * 0.350, scale * 0.505
    outer_r = scale * 0.225
    ring_w = scale * 0.058
    draw.ellipse(
        [
            clock_x - outer_r,
            clock_y - outer_r,
            clock_x + outer_r,
            clock_y + outer_r,
        ],
        outline=WHITE,
        width=round(ring_w),
    )
    hand_w = round(scale * 0.055)
    for end_x, end_y in (
        (clock_x, clock_y - outer_r * 0.40),  # 时针朝上
        (clock_x + outer_r * 0.52, clock_y),  # 分针朝右
    ):
        draw.line([(clock_x, clock_y), (end_x, end_y)], fill=WHITE, width=hand_w)
        draw.ellipse(
            [
                end_x - hand_w / 2,
                end_y - hand_w / 2,
                end_x + hand_w / 2,
                end_y + hand_w / 2,
            ],
            fill=WHITE,
        )

    # 右：书签飘带。底部 V 形缺口是书签的识别特征，用暖色和时钟区分开。
    bm_x, bm_w = scale * 0.720, scale * 0.235
    bm_top, bm_bottom = scale * 0.250, scale * 0.790
    left, right = bm_x - bm_w / 2, bm_x + bm_w / 2
    # 缺口必须从飘带的蒙版里挖，直接往上画透明色会把底砖也打穿。
    ribbon = Image.new("L", (scale, scale), 0)
    ribbon_draw = ImageDraw.Draw(ribbon)
    ribbon_draw.rounded_rectangle(
        [left, bm_top, right, bm_bottom], radius=scale * 0.035, fill=255
    )
    notch = bm_w * 0.42
    ribbon_draw.polygon(
        [
            (left - 1, bm_bottom - notch * 1.6),
            (bm_x, bm_bottom - notch * 0.30),
            (right + 1, bm_bottom - notch * 1.6),
            (right + 1, bm_bottom + 2),
            (left - 1, bm_bottom + 2),
        ],
        fill=0,
    )
    image.paste(AMBER, (0, 0), ribbon)

    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    icons = pathlib.Path(__file__).resolve().parent.parent / "icons"
    icons.mkdir(exist_ok=True)
    for size in (16, 32, 48, 128):
        render(size).save(icons / f"icon{size}.png")
        print(f"icons/icon{size}.png")


if __name__ == "__main__":
    main()
