import { useState } from "react";
import { api } from "../api";
import ColorSwatch from "./ColorSwatch";

const SCHEMES = [
  { value: "complementary", label: "Комплементарная" },
  { value: "analogous", label: "Аналоговая" },
  { value: "triadic", label: "Триада" },
  { value: "tetradic", label: "Тетрада" },
];

export default function GeneratorTab({ token }) {
  const [baseColor, setBaseColor] = useState("#3366cc");
  const [scheme, setScheme] = useState("complementary");
  const [angle, setAngle] = useState(30);
  const [palette, setPalette] = useState(null);
  const [contrast, setContrast] = useState(null);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    setError(null);
    try {
      const res = await api.post("/palettes/generate", {
        base_color: baseColor,
        scheme,
        angle: Number(angle),
      });
      setPalette(res.data);
      setContrast(null);
    } catch (e) {
      setError(e?.response?.data?.detail ?? "Ошибка генерации");
    }
  }

  async function handleContrast() {
    if (!palette) return;
    try {
      const res = await api.get(`/palettes/${palette.id}/contrast`);
      setContrast(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail ?? "Ошибка получения контраста");
    }
  }

  async function handleExport(format) {
    if (!palette) return;
    const res = await api.get(`/palettes/${palette.id}/export?format=${format}`);
    const blob = new Blob([typeof res.data === "string" ? res.data : JSON.stringify(res.data)], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `palette.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Базовый цвет</label>
          <input
            type="text"
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
            className="border rounded px-2 py-1 w-32"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Схема</label>
          <select
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {SCHEMES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Угол</label>
          <input
            type="number"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            className="border rounded px-2 py-1 w-20"
          />
        </div>
        <button
          onClick={handleGenerate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Сгенерировать
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {palette && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {palette.colors.map((c) => (
              <ColorSwatch key={c.id} hex={c.hex} />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleContrast}
              className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              Проверить контраст
            </button>
            <button
              onClick={() => handleExport("css")}
              className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              Экспорт CSS
            </button>
            <button
              onClick={() => handleExport("json")}
              className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              Экспорт JSON
            </button>
          </div>

          {contrast && (
            <table className="border-collapse border text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Цвет A</th>
                  <th className="border px-2 py-1">Цвет B</th>
                  <th className="border px-2 py-1">Контраст</th>
                  <th className="border px-2 py-1">AA</th>
                </tr>
              </thead>
              <tbody>
                {contrast.pairs.map((p, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{p.color_a}</td>
                    <td className="border px-2 py-1">{p.color_b}</td>
                    <td className="border px-2 py-1">{p.ratio.toFixed(2)}</td>
                    <td className="border px-2 py-1">{p.passes_aa ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
