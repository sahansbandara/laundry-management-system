//// apiClient.js
// Axios-based client. If axios is not present, also generate a fetch wrapper below.
import axios from "https://cdn.jsdelivr.net/npm/axios@1.6.7/+esm";

const api = axios.create({
  baseURL: "/api/",
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
