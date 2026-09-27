import pytest

from app.contrast import (
    relative_luminance,
    contrast_ratio,
    meets_wcag_aa,
    WCAG_AA_NORMAL_TEXT,
)


def test_relative_luminance_known_values():
    assert relative_luminance("#ffffff") == pytest.approx(1.0)
    assert relative_luminance("#000000") == pytest.approx(0.0)


def test_contrast_ratio_black_on_white_is_21_to_1():
    assert contrast_ratio("#ffffff", "#000000") == pytest.approx(21.0, abs=1e-2)


def test_contrast_ratio_same_color_is_1_to_1():
    assert contrast_ratio("#336699", "#336699") == pytest.approx(1.0)


def test_contrast_ratio_is_symmetric():
    a, b = "#123456", "#fedcba"
    assert contrast_ratio(a, b) == pytest.approx(contrast_ratio(b, a))


def test_contrast_ratio_known_wcag_reference_value():
    # #767676 on white is the commonly cited "just barely passes AA" gray,
    # ~4.54:1 (see e.g. WebAIM's contrast checker documentation/examples).
    assert contrast_ratio("#767676", "#ffffff") == pytest.approx(4.54, abs=0.01)


def test_meets_wcag_aa_thresholds():
    assert meets_wcag_aa("#000000", "#ffffff") is True
    assert meets_wcag_aa("#777777", "#787878") is False
    # sanity check the threshold constant itself
    assert WCAG_AA_NORMAL_TEXT == 4.5
