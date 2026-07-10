#!/usr/bin/env python3
"""Generate the BrightIQ iOS app icon from the embedded logo mask.

Uses only Python's standard library so it can run on Codemagic without extra
packages. The output is a full-bleed 1024x1024 RGB PNG suitable for AppIcon.
"""

from __future__ import annotations

import base64
import math
import struct
import zlib
from pathlib import Path

SOURCE_WIDTH = 500
SOURCE_HEIGHT = 500
OUTPUT_SIZE = 1024
LOGO_SIZE = 790
LOGO_X = (OUTPUT_SIZE - LOGO_SIZE) // 2
LOGO_Y = (OUTPUT_SIZE - LOGO_SIZE) // 2
OUTPUT_PATH = Path("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")

ALPHA_ZLIB_BASE64 = "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"


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def write_rgb_png(path: Path, width: int, height: int, pixels: bytearray) -> None:
    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)  # PNG filter: None
        start = y * stride
        raw.extend(pixels[start:start + stride])

    encoded = b"".join([
        b"\x89PNG\r\n\x1a\n",
        png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)),
        png_chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
        png_chunk(b"IEND", b""),
    ])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded)


def clamp(value: float, low: int = 0, high: int = 255) -> int:
    return max(low, min(high, int(round(value))))


def bilinear_alpha(source: bytes, x: float, y: float) -> float:
    x = max(0.0, min(SOURCE_WIDTH - 1.0, x))
    y = max(0.0, min(SOURCE_HEIGHT - 1.0, y))
    x0 = int(x)
    y0 = int(y)
    x1 = min(SOURCE_WIDTH - 1, x0 + 1)
    y1 = min(SOURCE_HEIGHT - 1, y0 + 1)
    fx = x - x0
    fy = y - y0

    a00 = source[y0 * SOURCE_WIDTH + x0]
    a10 = source[y0 * SOURCE_WIDTH + x1]
    a01 = source[y1 * SOURCE_WIDTH + x0]
    a11 = source[y1 * SOURCE_WIDTH + x1]

    top = a00 * (1.0 - fx) + a10 * fx
    bottom = a01 * (1.0 - fx) + a11 * fx
    return top * (1.0 - fy) + bottom * fy


def make_scaled_alpha(source: bytes) -> list[int]:
    result = [0] * (LOGO_SIZE * LOGO_SIZE)
    sx_scale = (SOURCE_WIDTH - 1) / max(1, LOGO_SIZE - 1)
    sy_scale = (SOURCE_HEIGHT - 1) / max(1, LOGO_SIZE - 1)
    for y in range(LOGO_SIZE):
        sy = y * sy_scale
        row = y * LOGO_SIZE
        for x in range(LOGO_SIZE):
            sx = x * sx_scale
            result[row + x] = clamp(bilinear_alpha(source, sx, sy))
    return result


def box_blur(mask: list[int], width: int, height: int, radius: int) -> list[int]:
    temp = [0] * (width * height)
    window = radius * 2 + 1
    for y in range(height):
        row = y * width
        total = 0
        for x in range(-radius, radius + 1):
            total += mask[row + min(width - 1, max(0, x))]
        for x in range(width):
            temp[row + x] = total // window
            left = max(0, x - radius)
            right = min(width - 1, x + radius + 1)
            total += mask[row + right] - mask[row + left]

    out = [0] * (width * height)
    for x in range(width):
        total = 0
        for y in range(-radius, radius + 1):
            total += temp[min(height - 1, max(0, y)) * width + x]
        for y in range(height):
            out[y * width + x] = total // window
            top = max(0, y - radius)
            bottom = min(height - 1, y + radius + 1)
            total += temp[bottom * width + x] - temp[top * width + x]
    return out


def blend_channel(background: int, foreground: int, alpha: float) -> int:
    return clamp(background * (1.0 - alpha) + foreground * alpha)


def main() -> None:
    source_alpha = zlib.decompress(base64.b64decode(ALPHA_ZLIB_BASE64))
    expected = SOURCE_WIDTH * SOURCE_HEIGHT
    if len(source_alpha) != expected:
        raise RuntimeError(f"Unexpected embedded mask size: {len(source_alpha)} (expected {expected})")

    logo_alpha = make_scaled_alpha(source_alpha)
    shadow_alpha = box_blur(logo_alpha, LOGO_SIZE, LOGO_SIZE, radius=10)
    pixels = bytearray(OUTPUT_SIZE * OUTPUT_SIZE * 3)

    for y in range(OUTPUT_SIZE):
        ny = y / (OUTPUT_SIZE - 1)
        for x in range(OUTPUT_SIZE):
            nx = x / (OUTPUT_SIZE - 1)
            radial = math.sqrt((nx - 0.24) ** 2 + (ny - 0.16) ** 2)
            vignette = max(0.0, min(1.0, radial / 1.10))
            r = clamp(24 - 18 * vignette)
            g = clamp(34 - 25 * vignette)
            b = clamp(61 - 43 * vignette)
            i = (y * OUTPUT_SIZE + x) * 3
            pixels[i:i + 3] = bytes((r, g, b))

    shadow_offset_y = 10
    for y in range(LOGO_SIZE):
        dy = LOGO_Y + y + shadow_offset_y
        if not 0 <= dy < OUTPUT_SIZE:
            continue
        row = y * LOGO_SIZE
        for x in range(LOGO_SIZE):
            dx = LOGO_X + x
            a = (shadow_alpha[row + x] / 255.0) * 0.42
            if a <= 0.001:
                continue
            i = (dy * OUTPUT_SIZE + dx) * 3
            pixels[i] = blend_channel(pixels[i], 0, a)
            pixels[i + 1] = blend_channel(pixels[i + 1], 8, a)
            pixels[i + 2] = blend_channel(pixels[i + 2], 18, a)

    for y in range(LOGO_SIZE):
        t = y / max(1, LOGO_SIZE - 1)
        logo_r = clamp(26 - 9 * t)
        logo_g = clamp(238 - 25 * t)
        logo_b = clamp(243 - 19 * t)
        row = y * LOGO_SIZE
        dy = LOGO_Y + y
        for x in range(LOGO_SIZE):
            a = logo_alpha[row + x] / 255.0
            if a <= 0.001:
                continue
            dx = LOGO_X + x
            i = (dy * OUTPUT_SIZE + dx) * 3
            pixels[i] = blend_channel(pixels[i], logo_r, a)
            pixels[i + 1] = blend_channel(pixels[i + 1], logo_g, a)
            pixels[i + 2] = blend_channel(pixels[i + 2], logo_b, a)

    write_rgb_png(OUTPUT_PATH, OUTPUT_SIZE, OUTPUT_SIZE, pixels)
    print(f"Generated iOS app icon: {OUTPUT_PATH} ({OUTPUT_SIZE}x{OUTPUT_SIZE})")


if __name__ == "__main__":
    main()
