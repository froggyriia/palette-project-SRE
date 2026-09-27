import { useId, useMemo } from "react";
import appleImg from "../assets/apple.png";

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// Quick perceptual luminance, just to order colors dark -> light for the
// gradient map below. Not the WCAG-precise formula from contrast.py —
// this is presentation only, nothing here feeds a contrast calculation.
function luminance({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Recolors a photo to match the generated palette — a "duotone" effect
 * (the same idea Spotify uses on album covers): the photo is first
 * desaturated to pure grayscale, then each brightness level is remapped
 * to a color sampled from the palette (darkest pixels -> the palette's
 * darkest color, brightest pixels -> its lightest), via an SVG filter:
 *
 *   feColorMatrix (saturate → 0)   turns the photo into grayscale
 *   feComponentTransfer (tables)   remaps that grayscale gradient onto
 *                                   the palette's own colors
 *
 * This is pure CSS/SVG — no canvas, no per-pixel JS, so it costs nothing
 * to recompute live as the palette changes (dragging the color wheel).
 */
export default function PaletteMockup({ colors }) {
  const filterId = useId();

  const { tableR, tableG, tableB } = useMemo(() => {
    const sorted = [...colors]
      .map(hexToRgb)
      .sort((a, b) => luminance(a) - luminance(b));
    // Always at least 2 stops, or feComponentTransfer's table degenerates.
    const stops = sorted.length >= 2 ? sorted : [sorted[0], sorted[0]];
    return {
      tableR: stops.map((c) => (c.r / 255).toFixed(3)).join(" "),
      tableG: stops.map((c) => (c.g / 255).toFixed(3)).join(" "),
      tableB: stops.map((c) => (c.b / 255).toFixed(3)).join(" "),
    };
  }, [colors]);

  return (
    // Square box that always fills 100% of whatever width its grid column
    // gives it — one huge apple, no smaller echoes competing for space.
    <div className="relative w-full aspect-square">
      {/* width/height 0: this SVG exists only to hold the filter
          definition that the <img> tag below references via CSS. */}
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <filter id={filterId} color-interpolation-filters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={tableR} />
              <feFuncG type="table" tableValues={tableG} />
              <feFuncB type="table" tableValues={tableB} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <img
        src={appleImg}
        alt="Яблоко, перекрашенное в цвета текущей палитры"
        // NB: the duotone filter above and the drop-shadow both set the
        // same CSS `filter` property. They have to be one filter chain,
        // not a Tailwind drop-shadow-* class plus this inline style —
        // the inline style would just silently win and the class would
        // do nothing (which is what was happening before). A big
        // downward offset + soft blur is what reads as "floating above
        // a surface" rather than a shadow hugging the shape.
        className="absolute inset-0 w-full h-full object-contain select-none"
        style={{ filter: `url(#${filterId}) drop-shadow(0 55px 45px rgba(0,0,0,0.45))` }}
        draggable={false}
      />
    </div>
  );
}
