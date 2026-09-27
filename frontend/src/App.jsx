import { useEffect, useState } from "react";
import GeneratorTab from "./components/GeneratorTab.jsx";
import AuthTab from "./components/AuthTab.jsx";
import MyPalettesTab from "./components/MyPalettesTab.jsx";
import { api } from "./api.js";

const TOKEN_KEY = "palette_app_token";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("generate"); // "generate" | "auth" | "palettes"

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    api
      .me(token)
      .then(setUser)
      .catch(() => {
        // token expired/invalid — drop it and fall back to guest mode
        logout();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setTab("generate");
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const tabs = [
    { id: "generate", label: "Генератор" },
    ...(token ? [{ id: "palettes", label: "Мои палитры" }] : []),
    { id: token ? "account" : "auth", label: token ? user?.email ?? "Аккаунт" : "Войти" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left sidebar instead of a top header — keeps the generator page
          full-width for the color wheel + apple preview instead of
          fighting them for vertical space. */}
      <aside className="w-56 shrink-0 border-r bg-white flex flex-col">
        <div className="px-4 py-5 border-b">
          <h1 className="text-lg font-bold">🎨 Palette App</h1>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => (t.id === "account" ? logout() : setTab(t.id))}
              className={`text-left px-3 py-2 rounded text-sm ${
                tab === t.id && t.id !== "account"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title={t.id === "account" ? "Нажми, чтобы выйти" : undefined}
            >
              {t.id === "account" ? `${t.label} (выйти)` : t.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        {tab === "generate" && <GeneratorTab token={token} />}
        {tab === "auth" && !token && <AuthTab onLoggedIn={login} />}
        {tab === "palettes" && token && <MyPalettesTab token={token} />}
      </main>
    </div>
  );
}
