/**
 * Same math as backend/app/color_theory.py's hex_to_hsl — duplicated here
 * because the API returns plain hex strings, and the color wheel needs
 * hue/saturation to position each swatch. Purely for visualization, no
 * palette logic depends on this.
 */
export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6);
        break;
      case g:
        h = 60 * ((b - r) / delta + 2);
        break;
      default:
        h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  return { h, s, l };
}

/** Inverse of hexToHsl — h in degrees, s and l as fractions in [0, 1]. */
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1, g1, b1;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const toHex = (v) => {
    const n = Math.max(0, Math.min(255, Math.round((v + m) * 255)));
    return n.toString(16).padStart(2, "0");
  };
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

/** Mirrors backend/app/color_theory.py's rotate_hue + scheme functions,
 * so the wheel can live-preview a scheme as you drag, without a round
 * trip to the API. The actual saved palette still always comes from the
 * backend — this is presentation-only, and uses the same math so the
 * two never visibly disagree. */
export function rotateHue(hex, degrees) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h + degrees, s, l);
}

export function complementary(hex) {
  return [hex, rotateHue(hex, 180)];
}

export function analogous(hex, angle = 30) {
  return [rotateHue(hex, -angle), hex, rotateHue(hex, angle)];
}

export function triadic(hex) {
  return [hex, rotateHue(hex, 120), rotateHue(hex, 240)];
}

export function tetradic(hex) {
  return [hex, rotateHue(hex, 90), rotateHue(hex, 180), rotateHue(hex, 270)];
}

export function schemeColors(baseHex, scheme, angle = 30) {
  switch (scheme) {
    case "complementary":
      return complementary(baseHex);
    case "analogous":
      return analogous(baseHex, angle);
    case "triadic":
      return triadic(baseHex);
    case "tetradic":
      return tetradic(baseHex);
    default:
      return [baseHex];
  }
}
