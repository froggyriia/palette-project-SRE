"""
Pure color-theory math: hex <-> HSL conversion and classic hue-based
color schemes (complementary, analogous, triadic, tetradic).

No FastAPI, no DB, no I/O — this module only takes and returns plain
Python values, so it's testable in complete isolation (see Этап 3 tests).
"""

import re

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _validate_hex(hex_color: str) -> str:
    if not _HEX_RE.match(hex_color):
        raise ValueError(f"invalid hex color: {hex_color!r} (expected '#rrggbb')")
    return hex_color.lower()


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """'#a1b2c3' -> (161, 178, 195)"""
    hex_color = _validate_hex(hex_color)
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    return r, g, b


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """(161, 178, 195) -> '#a1b2c3'. Values are clamped to [0, 255]."""
    r = max(0, min(255, round(r)))
    g = max(0, min(255, round(g)))
    b = max(0, min(255, round(b)))
    return f"#{r:02x}{g:02x}{b:02x}"


def hex_to_hsl(hex_color: str) -> tuple[float, float, float]:
    """
    '#rrggbb' -> (h, s, l) where h is in [0, 360) degrees, s and l are
    fractions in [0, 1].
    """
    r, g, b = (c / 255 for c in hex_to_rgb(hex_color))
    c_max, c_min = max(r, g, b), min(r, g, b)
    delta = c_max - c_min

    l = (c_max + c_min) / 2

    if delta == 0:
        h = 0.0
        s = 0.0
    else:
        s = delta / (1 - abs(2 * l - 1))
        if c_max == r:
            h = 60 * (((g - b) / delta) % 6)
        elif c_max == g:
            h = 60 * (((b - r) / delta) + 2)
        else:
            h = 60 * (((r - g) / delta) + 4)

    return h % 360, s, l


def hsl_to_hex(h: float, s: float, l: float) -> str:
    """(h degrees, s fraction, l fraction) -> '#rrggbb'."""
    h = h % 360
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2

    if 0 <= h < 60:
        r1, g1, b1 = c, x, 0.0
    elif 60 <= h < 120:
        r1, g1, b1 = x, c, 0.0
    elif 120 <= h < 180:
        r1, g1, b1 = 0.0, c, x
    elif 180 <= h < 240:
        r1, g1, b1 = 0.0, x, c
    elif 240 <= h < 300:
        r1, g1, b1 = x, 0.0, c
    else:
        r1, g1, b1 = c, 0.0, x

    return rgb_to_hex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255)


def rotate_hue(hex_color: str, degrees: float) -> str:
    """Same S/L, hue shifted by `degrees` (wraps around 360)."""
    h, s, l = hex_to_hsl(hex_color)
    return hsl_to_hex(h + degrees, s, l)


def complementary(hex_color: str) -> list[str]:
    """Base color + the color directly opposite on the hue wheel (+180°)."""
    return [_validate_hex(hex_color), rotate_hue(hex_color, 180)]


def analogous(hex_color: str, angle: float = 30) -> list[str]:
    """Base color plus its two neighbors `angle` degrees to either side."""
    return [
        rotate_hue(hex_color, -angle),
        _validate_hex(hex_color),
        rotate_hue(hex_color, angle),
    ]


def triadic(hex_color: str) -> list[str]:
    """Three colors evenly spaced 120° apart around the hue wheel."""
    return [
        _validate_hex(hex_color),
        rotate_hue(hex_color, 120),
        rotate_hue(hex_color, 240),
    ]


def tetradic(hex_color: str) -> list[str]:
    """Four colors evenly spaced 90° apart around the hue wheel (square tetradic)."""
    return [
        _validate_hex(hex_color),
        rotate_hue(hex_color, 90),
        rotate_hue(hex_color, 180),
        rotate_hue(hex_color, 270),
    ]
