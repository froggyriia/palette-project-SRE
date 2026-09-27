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
    // aspect-[4/5]: a touch taller than wide, so the three overlapping
    // apples cascading top-right -> bottom-left have somewhere to go
    // without leaving dead space above/below them. The box always fills
    // whatever width its grid column gives it — no fixed min-height that
    // could end up mostly empty.
    <div className="relative w-full aspect-[4/5]">
      {/* width/height 0: this SVG exists only to hold the filter
          definition that the <img> tags below reference via CSS. */}
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

      {/* Main apple: dominates the composition, filling most of the box. */}
      <img
        src={appleImg}
        alt="Яблоко, перекрашенное в цвета текущей палитры"
        className="absolute right-0 top-0 w-[78%] drop-shadow-xl select-none"
        style={{ filter: `url(#${filterId})` }}
        draggable={false}
      />
      {/* Two smaller echoes cascade toward the bottom-left, overlapping
          the main apple's corner rather than floating in empty space. */}
      <img
        src={appleImg}
        alt=""
        aria-hidden="true"
        className="absolute left-0 bottom-[14%] w-[52%] -rotate-6 drop-shadow-lg select-none opacity-90"
        style={{ filter: `url(#${filterId})` }}
        draggable={false}
      />
      <img
        src={appleImg}
        alt=""
        aria-hidden="true"
        className="absolute left-[6%] bottom-0 w-[32%] rotate-3 drop-shadow select-none opacity-80"
        style={{ filter: `url(#${filterId})` }}
        draggable={false}
      />
    </div>
  );
}
