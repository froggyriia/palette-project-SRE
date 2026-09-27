import { useEffect, useState } from "react";
import { api } from "../api.js";
import ColorSwatch from "./ColorSwatch.jsx";
import ColorWheel from "./ColorWheel.jsx";
import PaletteMockup from "./PaletteMockup.jsx";
import Button from "./Button.jsx";

export default function MyPalettesTab({ token }) {
  const [palettes, setPalettes] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const list = await api.listPalettes(token);
      setPalettes(list);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const remove = async (id) => {
    setError(null);
    try {
      await api.deletePalette(id, token);
      setPalettes((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="w-full px-8 py-8 space-y-6">
      <h2 className="text-xl font-semibold">Мои палитры</h2>

      {error && (
        <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-md">{error}</p>
      )}
      {palettes === null && !error && <p className="text-gray-500 text-sm">Загрузка…</p>}
      {palettes?.length === 0 && (
        <p className="text-gray-500 text-sm">Пока ничего не сохранено — сгенерируй палитру и нажми «Сохранить в профиль».</p>
      )}

      {/* Tiles instead of a stacked list: a grid that reflows from one
          column on narrow screens up to three on wide ones, so browsing
          several saved palettes is a glance rather than a scroll. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {palettes?.map((p) => (
          <div
            key={p.id}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col items-center gap-4"
          >
            <div className="w-full flex items-center justify-between gap-2">
              <h3 className="font-medium truncate">{p.name}</h3>
              <Button variant="danger" size="sm" onClick={() => remove(p.id)}>
                Удалить
              </Button>
            </div>

            {/* Same duotone apple as the generator, alongside the wheel —
                not instead of it — so a saved palette is recognizable at
                a glance both ways, not just as an abstract color wheel. */}
            <div className="w-full flex flex-wrap items-center justify-center gap-6">
              <div className="w-28 shrink-0">
                <PaletteMockup colors={p.colors.map((c) => c.hex)} compact />
              </div>
              <ColorWheel colors={p.colors.map((c) => c.hex)} baseColor={p.base_color} />
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {p.colors.map((c) => (
                <ColorSwatch key={c.id} hex={c.hex} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
