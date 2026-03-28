#!/usr/bin/env python3
"""Composite ET Labs + SleepTight logos into a wide social banner."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

# Output size (Reddit / social friendly wide banner)
W, H = 2400, 480

BASE = Path(__file__).resolve().parents[1]
ET_PATH = BASE / "assets/images/etlabs-logo.png"
ST_PATH = BASE / "apps/sleeptight/images/sleeptight-logo.webp"

OUT_LARGE = BASE / "assets/images/etlabs-social-banner.png"
OUT_LARGE_REDDIT = BASE / "assets/images/etlabs-social-banner-1920x384.png"
OUT_COMPACT = BASE / "assets/images/etlabs-social-banner-compact.png"
OUT_COMPACT_REDDIT = BASE / "assets/images/etlabs-social-banner-compact-1920x384.png"


def _gradient_background() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    bg = Image.new("RGBA", (W, H), (248, 250, 252, 255))
    draw = ImageDraw.Draw(bg)
    # NOTE: loop variable must not be named `y` — callers use `y_pos` / `y_et` / `y_st`.
    for row in range(H):
        t = row / (H - 1) if H > 1 else 0
        r = int(248 + (241 - 248) * t)
        g = int(250 + (245 - 250) * t)
        b = int(252 + (248 - 252) * t)
        draw.line([(0, row), (W, row)], fill=(r, g, b, 255))
    return bg, draw


def render(
    et: Image.Image,
    st: Image.Image,
    *,
    et_h: int,
    st_h: int,
    sep_margin: int,
) -> Image.Image:
    et_w = int(et.size[0] * et_h / et.size[1])
    st_w = int(st.size[0] * st_h / st.size[1])
    et_r = et.resize((et_w, et_h), Image.Resampling.LANCZOS)
    st_r = st.resize((st_w, st_h), Image.Resampling.LANCZOS)

    sep_w = 2
    group_w = et_w + sep_margin + sep_w + sep_margin + st_w
    x0 = (W - group_w) // 2
    y_et = (H - et_h) // 2
    y_st = (H - st_h) // 2

    bg, draw = _gradient_background()

    bg.alpha_composite(et_r, (x0, y_et))
    sep_x = x0 + et_w + sep_margin
    sep_y1 = H // 2 - min(et_h, st_h) // 2 - 8
    sep_y2 = H // 2 + min(et_h, st_h) // 2 + 8
    draw.line([(sep_x, sep_y1), (sep_x, sep_y2)], fill=(203, 213, 225, 255), width=sep_w)

    st_x = sep_x + sep_margin + sep_w
    bg.alpha_composite(st_r, (st_x, y_st))

    return bg.convert("RGB")


def main() -> None:
    et = Image.open(ET_PATH).convert("RGBA")
    st = Image.open(ST_PATH).convert("RGBA")

    # Large: same height for both marks (~88% of banner)
    common_h = int(H * 0.88)
    rgb_large = render(et, st, et_h=common_h, st_h=common_h, sep_margin=18)
    rgb_large.save(OUT_LARGE, "PNG", optimize=True)
    print(f"Wrote {OUT_LARGE}")
    rgb_large.resize((1920, 384), Image.Resampling.LANCZOS).save(
        OUT_LARGE_REDDIT, "PNG", optimize=True
    )
    print(f"Wrote {OUT_LARGE_REDDIT}")

    # Compact: previous “smaller” layout (more breathing room around the marks)
    rgb_compact = render(et, st, et_h=130, st_h=150, sep_margin=24)
    rgb_compact.save(OUT_COMPACT, "PNG", optimize=True)
    print(f"Wrote {OUT_COMPACT}")
    rgb_compact.resize((1920, 384), Image.Resampling.LANCZOS).save(
        OUT_COMPACT_REDDIT, "PNG", optimize=True
    )
    print(f"Wrote {OUT_COMPACT_REDDIT}")


if __name__ == "__main__":
    main()
