#!/usr/bin/env python3
"""Derive every toolbar icon size from the master artwork.

`assets/icon-source.png` is the approved 1024px artwork: a fan of translucent
bookmark ribbons behind one solid white ribbon, on a blue gradient squircle
tile. Every size is resampled from that single master so the shapes stay
identical across sizes.

The generator that produced the master leaves a soft, partly transparent tile
edge, so colour and alpha are resampled separately from a binarised mask: that
rebuilds one clean anti-aliased edge per size instead of a grey halo.

Usage: python3 tools/make_icons.py
Requires: Pillow
"""

import pathlib

from PIL import Image

SIZES = (16, 32, 48, 128)


def load_master() -> Image.Image:
    root = pathlib.Path(__file__).resolve().parent.parent
    master = Image.open(root / "assets" / "icon-source.png").convert("RGBA")
    if master.width != master.height:
        raise SystemExit(f"assets/icon-source.png must be square, got {master.size}")
    return master


def build(master: Image.Image, size: int) -> Image.Image:
    mask = master.getchannel("A").point(lambda v: 255 if v > 127 else 0)
    colour = master.convert("RGB").resize((size, size), Image.LANCZOS)
    alpha = mask.resize((size, size), Image.LANCZOS)
    return Image.merge("RGBA", (*colour.split(), alpha))


def main() -> None:
    icons = pathlib.Path(__file__).resolve().parent.parent / "icons"
    icons.mkdir(exist_ok=True)
    master = load_master()
    for size in SIZES:
        build(master, size).save(icons / f"icon{size}.png")
        print(f"icons/icon{size}.png")


if __name__ == "__main__":
    main()
