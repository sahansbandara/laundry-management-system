//// If axios is not available, also create a fetch helper:
const resolveApiBase = () => {
  const DEFAULT_API_ORIGIN = "http://localhost:8080";

  if (typeof window === "undefined") {
    return `${DEFAULT_API_ORIGIN}/api`;
  }

  const { origin, protocol, host } = window.location;
  if (origin && origin !== "null") {
    return `${origin.replace(/\/$/, "")}/api`;
  }
  if (protocol && protocol.startsWith("http") && host) {
    return `${protocol}//${host.replace(/\/$/, "")}/api`;
  }
  return `${DEFAULT_API_ORIGIN}/api`;
};

const API_BASE = resolveApiBase();

export async function http(url, { method = "GET", body, headers = {} } = {}) {
  const path = url.startsWith("/") ? url : `/${url}`;
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const res = await fetch(`${base}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
