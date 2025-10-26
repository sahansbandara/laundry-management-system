//// apiClient.js
// Axios-based client. If axios is not present, also generate a fetch wrapper below.
import axios from "https://cdn.jsdelivr.net/npm/axios@1.6.7/+esm";

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

const api = axios.create({
  baseURL: API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

const normalize = (url = "") => {
  if (!url) return "";
  return url.startsWith("/") ? url.slice(1) : url;
};

export { api };

export const get = (url, config = {}) => api.get(normalize(url), config).then((r) => r.data);
export const post = (url, data, config = {}) =>
  api.post(normalize(url), data, config).then((r) => r.data);
export const put = (url, data, config = {}) =>
  api.put(normalize(url), data, config).then((r) => r.data);
export const patch = (url, data, config = {}) =>
  api.patch(normalize(url), data, config).then((r) => r.data);
export const del = (url, config = {}) => api.delete(normalize(url), config).then((r) => r.data);
