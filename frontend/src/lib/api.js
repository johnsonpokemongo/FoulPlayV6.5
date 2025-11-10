
export function getApiBase() {
  if (typeof window !== "undefined") {
    return window.API_BASE || window.__API_BASE__ || localStorage.getItem("API_BASE") || "http://127.0.0.1:8000";
  }
  return "http://127.0.0.1:8000";
}

export async function apiGet(path) {
  const res = await fetch(getApiBase() + path, { credentials: "omit" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(getApiBase() + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "omit",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
