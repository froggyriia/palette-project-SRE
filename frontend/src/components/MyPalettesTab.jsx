import { useEffect, useState } from "react";
import { api } from "../api.js";
import ColorSwatch from "./ColorSwatch.jsx";
import ColorWheel from "./ColorWheel.jsx";
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
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold">Мои палитры</h2>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {palettes === null && !error && <p className="text-gray-500 text-sm">Загрузка…</p>}
      {palettes?.length === 0 && (
        <p className="text-gray-500 text-sm">Пока ничего не сохранено — сгенерируй палитру и нажми «Сохранить в профиль».</p>
      )}

      <div className="space-y-4">
        {palettes?.map((p) => (
          <div key={p.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{p.name}</h3>
              <Button variant="danger" size="sm" onClick={() => remove(p.id)}>
                Удалить
              </Button>
            </div>
            <div className="flex flex-wrap items-start gap-6">
              <ColorWheel colors={p.colors.map((c) => c.hex)} baseColor={p.base_color} />
              <div className="flex flex-wrap gap-3 pt-2">
                {p.colors.map((c) => (
                  <ColorSwatch key={c.id} hex={c.hex} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
