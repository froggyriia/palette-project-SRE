"""
WCAG 2.x contrast math: relative luminance and contrast ratio between
two colors. Pure functions, no I/O — see color_theory.py for the same
philosophy.

Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
"""

from app.color_theory import hex_to_rgb


def _linearize(channel_8bit: int) -> float:
    """sRGB companding: 0-255 -> linear-light value in [0, 1]."""
    c = channel_8bit / 255
    if c <= 0.03928:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_color: str) -> float:
    """WCAG relative luminance of a color, in [0, 1] (0 = black, 1 = white)."""
    r, g, b = hex_to_rgb(hex_color)
    r_lin, g_lin, b_lin = _linearize(r), _linearize(g), _linearize(b)
    return 0.2126 * r_lin + 0.7152 * g_lin + 0.0722 * b_lin


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    """
    WCAG contrast ratio between two colors, always >= 1 and <= 21.
    Symmetric: contrast_ratio(a, b) == contrast_ratio(b, a).
    """
    l1 = relative_luminance(hex_a)
    l2 = relative_luminance(hex_b)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


# WCAG 2.x minimum contrast thresholds, for callers that want a pass/fail
# rather than a raw ratio.
WCAG_AA_NORMAL_TEXT = 4.5
WCAG_AA_LARGE_TEXT = 3.0
WCAG_AAA_NORMAL_TEXT = 7.0
WCAG_AAA_LARGE_TEXT = 4.5


def meets_wcag_aa(hex_a: str, hex_b: str, large_text: bool = False) -> bool:
    threshold = WCAG_AA_LARGE_TEXT if large_text else WCAG_AA_NORMAL_TEXT
    return contrast_ratio(hex_a, hex_b) >= threshold
