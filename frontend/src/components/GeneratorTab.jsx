import { useMemo, useState } from "react";
import { api } from "../api.js";
import ColorSwatch from "./ColorSwatch.jsx";
import ColorWheel from "./ColorWheel.jsx";
import ContrastReport from "./ContrastReport.jsx";
import PaletteMockup from "./PaletteMockup.jsx";
import Button from "./Button.jsx";
import { schemeColors } from "../utils/color.js";

const SCHEMES = [
  { value: "complementary", label: "Комплементарная" },
  { value: "analogous", label: "Аналоговая" },
  { value: "triadic", label: "Триада" },
  { value: "tetradic", label: "Тетрада" },
];

export default function GeneratorTab({ token, onSaved }) {
  const [baseColor, setBaseColor] = useState("#3366cc");
  const [scheme, setScheme] = useState("complementary");
  const [angle, setAngle] = useState(30);
  const [palette, setPalette] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [contrast, setContrast] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(null);
  const [exportText, setExportText] = useState(null);

  // Same colors ColorWheel is already previewing live (before a palette
  // even exists), or the actual generated palette's colors once there is
  // one — either way, this is what PaletteMockup recolors the photo with.
  const mockupColors = useMemo(
    () => (palette ? palette.colors.map((c) => c.hex) : schemeColors(baseColor, scheme, Number(angle) || 30)),
    [palette, baseColor, scheme, angle],
  );

  const generate = async () => {
    setError(null);
    setContrast(null);
    setExportText(null);
    setSavedMessage(null);
    setLoading(true);
    try {
      const payload = { base_color: baseColor, scheme };
      if (scheme === "analogous") payload.analogous_angle = Number(angle);
      // Generating never attaches to an account yet — "Сохранить в профиль"
      // (below) is the explicit action that does that.
      const p = await api.generatePalette(payload, null);
      setPalette(p);
      setSaveName(p.name);
      // Contrast is checked right away, off the freshly generated palette's
      // own id — not off `palette` state (which hasn't updated yet in this
      // closure) — so there's no extra click needed before seeing it.
      try {
        const report = await api.getContrast(p.id, token);
        setContrast(report);
      } catch (e) {
        // Don't let a contrast-check hiccup hide the palette that just
        // generated successfully; just leave the report empty.
        setError(e.message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doExport = async (format) => {
    if (!palette) return;
    setError(null);
    try {
      const result = await api.exportPalette(palette.id, format, token);
      setExportText(typeof result === "string" ? result : JSON.stringify(result, null, 2));
    } catch (e) {
      setError(e.message);
    }
  };

  const save = async () => {
    if (!palette || !token) return;
    setError(null);
    setSavedMessage(null);
    setSaving(true);
    try {
      const saved = await api.createPalette(
        {
          name: saveName.trim() || palette.name,
          base_color: palette.base_color,
          scheme_type: palette.scheme_type,
          colors: palette.colors.map((c) => ({ hex: c.hex, position: c.position })),
        },
        token,
      );
      setSavedMessage(`Сохранено как «${saved.name}»`);
      onSaved?.(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-8 py-6">
      <h2 className="text-xl font-semibold mb-4">Генератор палитры</h2>

      {/* Image column is a fixed, generous width so the apples are
          genuinely large rather than shrinking to share a 50/50 split;
          the controls column below is capped with max-w-2xl so it
          doesn't stretch into empty space on a wide screen either. */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,640px)_1fr] gap-10 items-start">
        {/* Creative preview: the same photo, recolored via an SVG duotone
            filter to match whatever's currently picked — updates live as
            you drag the wheel, not just after generating. Hidden on small
            screens since there's no room for it next to the controls. */}
        <div className="hidden md:block sticky top-6">
          <PaletteMockup colors={mockupColors} />
        </div>

        <div className="space-y-6 max-w-2xl">
          <div className="flex flex-wrap items-start gap-8">
            <ColorWheel
              baseColor={baseColor}
              scheme={scheme}
              angle={Number(angle) || 30}
              onBaseColorChange={setBaseColor}
            />

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Базовый цвет (hex)</span>
                <input
                  type="text"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="border rounded px-2 py-1.5 w-32 font-mono text-sm"
                />
              </label>

              <div className="flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-600">Схема</span>
                  <select
                    value={scheme}
                    onChange={(e) => setScheme(e.target.value)}
                    className="border rounded px-2 py-2"
                  >
                    {SCHEMES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>

                {scheme === "analogous" && (
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">Угол, °</span>
                    <input
                      type="number"
                      value={angle}
                      onChange={(e) => setAngle(e.target.value)}
                      className="border rounded px-2 py-2 w-20"
                      min={1}
                      max={90}
                    />
                  </label>
                )}
              </div>

              <Button onClick={generate} disabled={loading} size="lg" className="self-start">
                {loading ? "Генерирую…" : "Сгенерировать"}
              </Button>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {palette && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                {palette.colors.map((c) => (
                  <ColorSwatch key={c.id} hex={c.hex} />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => doExport("json")}>
                  Export JSON
                </Button>
                <Button variant="secondary" size="sm" onClick={() => doExport("css")}>
                  Export CSS
                </Button>
                <Button variant="secondary" size="sm" onClick={() => doExport("scss")}>
                  Export SCSS
                </Button>
                <Button variant="secondary" size="sm" onClick={() => doExport("tailwind")}>
                  Export Tailwind
                </Button>
              </div>

              {token ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Название палитры"
                    className="border rounded px-2 py-1.5 text-sm w-48"
                  />
                  <Button variant="success" size="sm" onClick={save} disabled={saving || !saveName.trim()}>
                    {saving ? "Сохраняю…" : "Сохранить в профиль"}
                  </Button>
                  {savedMessage && <span className="text-green-700 text-sm">{savedMessage} ✓</span>}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Войдите, чтобы сохранить палитру в профиль</p>
              )}

              {contrast && <ContrastReport contrast={contrast} />}

              {exportText && (
                <pre className="bg-gray-900 text-gray-100 text-xs rounded p-3 overflow-x-auto whitespace-pre-wrap">
                  {exportText}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
