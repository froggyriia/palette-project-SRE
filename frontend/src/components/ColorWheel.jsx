import { useCallback, useMemo, useRef } from "react";
import { hexToHsl, hslToHex, schemeColors } from "../utils/color.js";

const SIZE = 220;
const CENTER = SIZE / 2;
const MAX_RADIUS = CENTER - 22;

// Standard hue wheel: 0deg = top, clockwise — matches CSS conic-gradient's
// default direction, so the angle math below lines up with what's drawn.
const WHEEL_GRADIENT =
  "conic-gradient(hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), " +
  "hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))";

/**
 * One wheel, two jobs:
 *  - Given `colors` (actual hexes, e.g. from a saved palette): plain
 *    read-only display.
 *  - Given `baseColor`/`scheme`/`angle` instead: computes the scheme
 *    live with the same math as the backend's color_theory module, and
 *    — when `onBaseColorChange` is passed — lets you drag/click anywhere
 *    on the wheel to move the base color, which rotates the whole scheme
 *    in real time.
 * Either way it draws lines from the center to each color, plus the
 * polygon connecting them (a triangle for triadic, a square for
 * tetradic, ...) — that shape *is* the scheme, made visible.
 */
export default function ColorWheel({ colors, baseColor, scheme, angle = 30, onBaseColorChange }) {
  const wheelRef = useRef(null);

  const hexes = useMemo(
    () => colors ?? schemeColors(baseColor, scheme, angle),
    [colors, baseColor, scheme, angle],
  );

  const baseHex = (baseColor ?? hexes[0] ?? "#000000").toLowerCase();

  const points = useMemo(
    () =>
      hexes.map((hex) => {
        const { h, s } = hexToHsl(hex);
        const r = MAX_RADIUS * (0.22 + 0.78 * Math.min(s, 1));
        const rad = (h * Math.PI) / 180;
        return {
          hex,
          x: CENTER + r * Math.sin(rad),
          y: CENTER - r * Math.cos(rad),
          isBase: hex.toLowerCase() === baseHex,
        };
      }),
    [hexes, baseHex],
  );

  const interactive = Boolean(onBaseColorChange);

  const updateFromPointer = useCallback(
    (clientX, clientY) => {
      const el = wheelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_RADIUS);
      let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;
      const newS = dist / MAX_RADIUS;
      const currentL = hexToHsl(baseColor ?? hexes[0]).l;
      onBaseColorChange(hslToHex(angleDeg, newS, currentL));
    },
    [onBaseColorChange, baseColor, hexes],
  );

  const handlePointerDown = interactive
    ? (e) => {
        e.preventDefault();
        updateFromPointer(e.clientX, e.clientY);
        const move = (ev) => updateFromPointer(ev.clientX, ev.clientY);
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }
    : undefined;

  return (
    <div
      ref={wheelRef}
      onPointerDown={handlePointerDown}
      className={`relative rounded-full shadow-inner select-none shrink-0 ${interactive ? "cursor-crosshair touch-none" : ""}`}
      style={{ width: SIZE, height: SIZE, background: WHEEL_GRADIENT }}
      title={interactive ? "Клик или перетаскивание — выбор базового цвета" : undefined}
    >
      <div
        className="absolute rounded-full bg-white/55 pointer-events-none"
        style={{
          width: MAX_RADIUS * 0.4,
          height: MAX_RADIUS * 0.4,
          left: CENTER - (MAX_RADIUS * 0.4) / 2,
          top: CENTER - (MAX_RADIUS * 0.4) / 2,
        }}
      />

      <svg className="absolute inset-0 pointer-events-none" width={SIZE} height={SIZE}>
        {points.map((p, i) => (
          <line key={`line-${i}`} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
        ))}
        {points.length > 2 && (
          <polygon
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="rgba(0,0,0,0.06)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={1.5}
          />
        )}
      </svg>

      {points.map((p, i) => (
        <div
          key={i}
          title={p.hex}
          className={`absolute rounded-full shadow pointer-events-none ${p.isBase ? "border-2 border-black" : "border-2 border-white"}`}
          style={{
            width: p.isBase ? 22 : 18,
            height: p.isBase ? 22 : 18,
            left: p.x - (p.isBase ? 11 : 9),
            top: p.y - (p.isBase ? 11 : 9),
            backgroundColor: p.hex,
          }}
        />
      ))}
    </div>
  );
}
