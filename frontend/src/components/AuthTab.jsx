import { useState } from "react";
import { api } from "../api.js";
import Button from "./Button.jsx";

export default function AuthTab({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await api.register({ email, password });
      }
      const { access_token } = await api.login({ email, password });
      onLoggedIn(access_token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto p-6">
      <div className="flex gap-1 mb-5 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
            mode === "login" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Войти
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
            mode === "register" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Пароль</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "…" : mode === "login" ? "Войти" : "Зарегистрироваться и войти"}
        </Button>
      </form>
    </div>
  );
}
