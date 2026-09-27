import json
import sys

BACKEND_DIR = sys.argv[1]
OUT_PATH = sys.argv[2]
sys.path.insert(0, BACKEND_DIR)

from app import color_theory as ct

hex_to_hsl_cases = []
for hex_color in ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000", "#3366cc", "#a1b2c3"]:
    h, s, l = ct.hex_to_hsl(hex_color)
    hex_to_hsl_cases.append({"hex": hex_color, "h": h, "s": s, "l": l})

scheme_fns = {
    "complementary": lambda base, angle: ct.complementary(base),
    "analogous": lambda base, angle: ct.analogous(base, angle),
    "triadic": lambda base, angle: ct.triadic(base),
    "tetradic": lambda base, angle: ct.tetradic(base),
}

scheme_cases = []
for base in ["#ff0000", "#3366cc", "#a1b2c3", "#123456"]:
    for scheme, fn in scheme_fns.items():
        angle = 30
        colors = fn(base, angle)
        scheme_cases.append({"base": base, "scheme": scheme, "angle": angle, "expected": colors})
    # one custom-angle analogous case per base too
    colors = ct.analogous(base, 45)
    scheme_cases.append({"base": base, "scheme": "analogous", "angle": 45, "expected": colors})

fixture = {
    "_comment": (
        "Generated from backend/app/color_theory.py (the tested, authoritative "
        "implementation). backend/tests/test_color_fixture_consistency.py checks "
        "this file still matches that module; frontend/scripts/check-color-"
        "fixtures.mjs checks utils/color.js matches it too. Regenerate with "
        "gen_color_fixtures.py whenever color_theory.py's math changes."
    ),
    "hex_to_hsl": hex_to_hsl_cases,
    "schemes": scheme_cases,
}

with open(OUT_PATH, "w") as f:
    json.dump(fixture, f, indent=2)
    f.write("\n")

print(f"wrote {len(hex_to_hsl_cases)} hex_to_hsl cases and {len(scheme_cases)} scheme cases to {OUT_PATH}")
