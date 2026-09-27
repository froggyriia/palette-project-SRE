"""
Cross-check for the frontend's duplicated color math (utils/color.js
mirrors this module for the interactive wheel's live preview — see the
comment in GeneratorTab/ColorWheel). This file has no opinion about the
frontend; it only checks that ../../shared/color_fixtures.json is still
an accurate snapshot of *this* module's behavior.

frontend/scripts/check-color-fixtures.mjs checks the JS side against the
same file. If both pass, backend and frontend agree; if this one fails,
color_theory.py changed and the fixture needs regenerating (run
shared/gen_color_fixtures.py); if only the JS one fails, utils/color.js
has drifted and needs to be brought back in line.
"""

import json
from pathlib import Path

import pytest

from app import color_theory as ct

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "shared" / "color_fixtures.json"

with open(FIXTURE_PATH) as f:
    FIXTURE = json.load(f)

_SCHEME_FNS = {
    "complementary": lambda base, angle: ct.complementary(base),
    "analogous": lambda base, angle: ct.analogous(base, angle),
    "triadic": lambda base, angle: ct.triadic(base),
    "tetradic": lambda base, angle: ct.tetradic(base),
}


@pytest.mark.parametrize("case", FIXTURE["hex_to_hsl"], ids=lambda c: c["hex"])
def test_hex_to_hsl_matches_fixture(case):
    h, s, l = ct.hex_to_hsl(case["hex"])
    assert h == pytest.approx(case["h"], abs=1e-6)
    assert s == pytest.approx(case["s"], abs=1e-6)
    assert l == pytest.approx(case["l"], abs=1e-6)


@pytest.mark.parametrize(
    "case",
    FIXTURE["schemes"],
    ids=lambda c: f"{c['base']}-{c['scheme']}-{c['angle']}",
)
def test_scheme_matches_fixture(case):
    fn = _SCHEME_FNS[case["scheme"]]
    result = fn(case["base"], case["angle"])
    assert result == case["expected"]
