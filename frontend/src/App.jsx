import { useEffect, useState } from "react";
import GeneratorTab from "./components/GeneratorTab.jsx";
import AuthTab from "./components/AuthTab.jsx";
import MyPalettesTab from "./components/MyPalettesTab.jsx";
import { api } from "./api.js";
import Button from "./components/Button.jsx";

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
    ...(!token ? [{ id: "auth", label: "Войти" }] : []),
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Left sidebar instead of a top header — keeps the generator page
          full-width for the color wheel + apple preview instead of
          fighting them for vertical space. */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold tracking-tight">Palette App</h1>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                tab === t.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Pinned to the bottom instead of living inside the tab list —
            a real "log out" action reads clearer as its own button than
            as a nav item that happens to say your email. */}
        {token && (
          <div className="mt-auto p-3 border-t border-gray-200 space-y-2">
            {user?.email && <p className="px-1 text-xs text-gray-400 truncate">{user.email}</p>}
            <Button variant="secondary" size="sm" className="w-full" onClick={logout}>
              Выйти
            </Button>
          </div>
        )}
      </aside>

      <main className="flex-1 min-w-0">
        {tab === "generate" && <GeneratorTab token={token} />}
        {tab === "auth" && !token && <AuthTab onLoggedIn={login} />}
        {tab === "palettes" && token && <MyPalettesTab token={token} />}
      </main>
    </div>
  );
}
