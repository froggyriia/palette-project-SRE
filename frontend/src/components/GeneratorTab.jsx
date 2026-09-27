import { useState } from "react";
import { api } from "../api.js";
import ColorSwatch from "./ColorSwatch.jsx";
import ColorWheel from "./ColorWheel.jsx";
import ContrastReport from "./ContrastReport.jsx";

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
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-xl font-semibold">Генератор палитры</h2>

      <div className="flex flex-wrap items-start gap-8">
        <ColorWheel baseColor={baseColor} scheme={scheme} angle={Number(angle) || 30} onBaseColorChange={setBaseColor} />

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

          <button
            onClick={generate}
            disabled={loading}
            type="button"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 self-start"
          >
            {loading ? "Генерирую…" : "Сгенерировать"}
          </button>
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
            <button type="button" onClick={() => doExport("json")} className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50">
              Export JSON
            </button>
            <button type="button" onClick={() => doExport("css")} className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50">
              Export CSS
            </button>
            <button type="button" onClick={() => doExport("scss")} className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50">
              Export SCSS
            </button>
            <button type="button" onClick={() => doExport("tailwind")} className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50">
              Export Tailwind
            </button>
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
              <button
                type="button"
                onClick={save}
                disabled={saving || !saveName.trim()}
                className="border rounded px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Сохраняю…" : "Сохранить в профиль"}
              </button>
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
  );
}
