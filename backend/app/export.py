"""
Pure formatting functions: turn a list of hex colors into text a designer
or another codebase can paste in directly. No FastAPI, no DB — same
philosophy as color_theory.py and contrast.py.
"""


def to_css_variables(colors: list[str], prefix: str = "color") -> str:
    """['#ff0000', '#00ff00'] -> ':root { --color-1: #ff0000; ... }'"""
    lines = [":root {"]
    for i, hex_color in enumerate(colors, start=1):
        lines.append(f"  --{prefix}-{i}: {hex_color};")
    lines.append("}")
    return "\n".join(lines) + "\n"


def to_scss_variables(colors: list[str], prefix: str = "color") -> str:
    lines = [f"${prefix}-{i}: {hex_color};" for i, hex_color in enumerate(colors, start=1)]
    return "\n".join(lines) + "\n"


def to_tailwind_config(colors: list[str], prefix: str = "color") -> str:
    entries = ",\n".join(
        f'        "{prefix}-{i}": "{hex_color}"' for i, hex_color in enumerate(colors, start=1)
    )
    return (
        "module.exports = {\n"
        "  theme: {\n"
        "    extend: {\n"
        "      colors: {\n"
        f"{entries}\n"
        "      }\n"
        "    }\n"
        "  }\n"
        "};\n"
    )


def to_json_colors(colors: list[str]) -> dict:
    return {"colors": colors}
