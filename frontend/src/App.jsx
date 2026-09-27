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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">🎨 Palette App</h1>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => (t.id === "account" ? logout() : setTab(t.id))}
                className={`px-3 py-1.5 rounded text-sm ${
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
        </div>
      </header>

      {tab === "generate" && <GeneratorTab token={token} />}
      {tab === "auth" && !token && <AuthTab onLoggedIn={login} />}
      {tab === "palettes" && token && <MyPalettesTab token={token} />}
    </div>
  );
}
