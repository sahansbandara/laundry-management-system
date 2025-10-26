//// If axios is not available, also create a fetch helper:
const resolveApiBase = () => {
  const DEFAULT_API_ORIGIN = "http://localhost:8080";
  const DEFAULT_API_PATH = "/api";

  if (typeof window === "undefined") {
    return `${DEFAULT_API_ORIGIN}${DEFAULT_API_PATH}`;
  }

  const sanitize = (value = "") => value.replace(/\/$/, "");

  const globalBase =
    (typeof window !== "undefined" &&
      (window.__SMARTFOLD_API_BASE__ || window.API_BASE_URL || window.API_BASE)) ||
    null;
  if (globalBase) {
    return sanitize(globalBase);
  }

  const metaBase = document?.querySelector?.('meta[name="smartfold-api-base"]')?.content;
  if (metaBase) {
    return sanitize(metaBase.trim());
  }

  const { origin, protocol, host, hostname, port } = window.location;
  const isLocalhost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);
  if (isLocalhost && port && port !== "8080") {
    return `${DEFAULT_API_ORIGIN}${DEFAULT_API_PATH}`;
  }

  if (origin && origin !== "null") {
    return `${sanitize(origin)}${DEFAULT_API_PATH}`;
  }

  if (protocol && protocol.startsWith("http") && host) {
    return `${protocol}//${sanitize(host)}${DEFAULT_API_PATH}`;
  }

  return `${DEFAULT_API_ORIGIN}${DEFAULT_API_PATH}`;
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
