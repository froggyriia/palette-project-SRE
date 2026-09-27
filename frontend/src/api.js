const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = "GET", body, token, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  if (raw) {
    const text = await res.text();
    if (!res.ok) throw new ApiError(res.status, text);
    return text;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.detail ?? res.statusText);
  return data;
}

export const api = {
  generatePalette: (payload, token) =>
    request("/palettes/generate", { method: "POST", body: payload, token }),
  createPalette: (payload, token) =>
    request("/palettes", { method: "POST", body: payload, token }),
  listPalettes: (token) => request("/palettes", { token }),
  getPalette: (id, token) => request(`/palettes/${id}`, { token }),
  deletePalette: (id, token) => request(`/palettes/${id}`, { method: "DELETE", token }),
  getContrast: (id, token) => request(`/palettes/${id}/contrast`, { token }),
  exportPalette: (id, format, token) =>
    request(`/palettes/${id}/export?format=${format}`, { token, raw: format !== "json" }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/auth/me", { token }),
};
