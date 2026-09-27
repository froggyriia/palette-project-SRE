import pytest

from app.color_theory import (
    hex_to_rgb,
    rgb_to_hex,
    hex_to_hsl,
    hsl_to_hex,
    rotate_hue,
    complementary,
    analogous,
    triadic,
    tetradic,
)


def test_hex_to_rgb_known_values():
    assert hex_to_rgb("#ffffff") == (255, 255, 255)
    assert hex_to_rgb("#000000") == (0, 0, 0)
    assert hex_to_rgb("#ff0000") == (255, 0, 0)
    assert hex_to_rgb("#00FF00") == (0, 255, 0)  # case-insensitive


def test_hex_to_rgb_rejects_invalid_input():
    with pytest.raises(ValueError):
        hex_to_rgb("not-a-color")
    with pytest.raises(ValueError):
        hex_to_rgb("#fff")  # short form not supported


def test_rgb_to_hex_known_values_and_clamping():
    assert rgb_to_hex(255, 255, 255) == "#ffffff"
    assert rgb_to_hex(0, 0, 0) == "#000000"
    assert rgb_to_hex(255, 0, 0) == "#ff0000"
    # out-of-range values get clamped rather than raising
    assert rgb_to_hex(300, -10, 128) == "#ff0080"


def test_hex_to_hsl_known_values():
    h, s, l = hex_to_hsl("#ff0000")
    assert h == pytest.approx(0)
    assert s == pytest.approx(1)
    assert l == pytest.approx(0.5)

    h, s, l = hex_to_hsl("#ffffff")
    assert s == pytest.approx(0)
    assert l == pytest.approx(1)

    h, s, l = hex_to_hsl("#000000")
    assert s == pytest.approx(0)
    assert l == pytest.approx(0)

    h, s, l = hex_to_hsl("#00ff00")
    assert h == pytest.approx(120)

    h, s, l = hex_to_hsl("#0000ff")
    assert h == pytest.approx(240)


def test_hsl_to_hex_known_values():
    assert hsl_to_hex(0, 1, 0.5) == "#ff0000"
    assert hsl_to_hex(120, 1, 0.5) == "#00ff00"
    assert hsl_to_hex(240, 1, 0.5) == "#0000ff"
    assert hsl_to_hex(0, 0, 1) == "#ffffff"
    assert hsl_to_hex(0, 0, 0) == "#000000"


def test_hex_hsl_roundtrip():
    for original in ["#336699", "#a1b2c3", "#ff8800", "#123456"]:
        h, s, l = hex_to_hsl(original)
        assert hsl_to_hex(h, s, l) == original


def test_rotate_hue_wraps_around_360():
    # rotating by 360 should be a no-op
    assert rotate_hue("#ff0000", 360) == "#ff0000"
    # rotating red by 240 gives the same result as rotating by -120
    assert rotate_hue("#ff0000", 240) == rotate_hue("#ff0000", -120)


def test_complementary_of_red_is_cyan():
    assert complementary("#ff0000") == ["#ff0000", "#00ffff"]


def test_analogous_returns_three_colors_around_base():
    result = analogous("#ff0000", angle=30)
    assert len(result) == 3
    assert result[1] == "#ff0000"
    # neighbors should be 30 degrees away on either side
    h_left, _, _ = hex_to_hsl(result[0])
    h_right, _, _ = hex_to_hsl(result[2])
    assert h_left == pytest.approx(330, abs=0.5)
    assert h_right == pytest.approx(30, abs=0.5)


def test_triadic_returns_three_evenly_spaced_colors():
    result = triadic("#ff0000")
    assert len(result) == 3
    assert result[0] == "#ff0000"
    hues = [hex_to_hsl(c)[0] for c in result]
    assert hues == pytest.approx([0, 120, 240], abs=0.5)


def test_tetradic_returns_four_evenly_spaced_colors():
    result = tetradic("#ff0000")
    assert len(result) == 4
    hues = [hex_to_hsl(c)[0] for c in result]
    assert hues == pytest.approx([0, 90, 180, 270], abs=0.5)
