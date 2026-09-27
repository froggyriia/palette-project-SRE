import { useEffect, useState } from "react";
import { api } from "../api";
import ColorSwatch from "./ColorSwatch";

export default function MyPalettesTab({ token }) {
  const [palettes, setPalettes] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await api.get("/palettes");
      setPalettes(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail ?? "Ошибка загрузки палитр");
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleDelete(id) {
    await api.delete(`/palettes/${id}`);
    load();
  }

  if (!token) {
    return <p className="text-gray-500">Войдите, чтобы увидеть сохранённые палитры.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}
      {palettes.length === 0 && <p className="text-gray-500">Пока нет сохранённых палитр.</p>}
      {palettes.map((p) => (
        <div key={p.id} className="border rounded p-3 flex justify-between items-center">
          <div>
            <p className="font-medium">{p.name ?? p.base_color}</p>
            <div className="flex gap-1 mt-2">
              {p.colors.map((c) => (
                <ColorSwatch key={c.id} hex={c.hex} small />
              ))}
            </div>
          </div>
          <button
            onClick={() => handleDelete(p.id)}
            className="text-red-600 hover:underline text-sm"
          >
            Удалить
          </button>
        </div>
      ))}
    </div>
  );
}
