export const BACKEND_PORT = 42876;
export const FRONTEND_DEV_PORT = 43876;
export const DEFAULT_API_ORIGIN = `http://localhost:${BACKEND_PORT}`;

const stripTrailingSlash = (value = "") => value.replace(/\/$/, "");

export const resolveApiBase = () => {
  if (typeof window === "undefined") {
    return `${DEFAULT_API_ORIGIN}/api`;
  }

  const { origin, protocol, host } = window.location;
  if (origin && origin !== "null") {
    return `${stripTrailingSlash(origin)}/api`;
  }
  if (protocol && protocol.startsWith("http") && host) {
    return `${protocol}//${stripTrailingSlash(host)}/api`;
  }
  return `${DEFAULT_API_ORIGIN}/api`;
};

export const resolveApiBaseUrl = () => stripTrailingSlash(resolveApiBase());
