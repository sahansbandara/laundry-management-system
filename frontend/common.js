import { api, get as apiGet, post as apiPost, put as apiPut, patch as apiPatch, del as apiDelete } from "./js/apiClient.js";
import { http } from "./js/http.js";

const toastContainerId = "toast-container";
const AUTH_STORAGE_KEY = "smartfold_auth";

/* ---------- Toasts ---------- */
function ensureToastContainer() {
    let c = document.getElementById(toastContainerId);
    if (!c) {
        c = document.createElement("div");
        c.id = toastContainerId;
        c.className = "toast-container";
        document.body.appendChild(c);
    }
    return c;
}
function showToast(message, type = "success") {
    const c = ensureToastContainer();
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = message;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
export const toastSuccess = (m) => showToast(m, "success");
export const toastError = (m) => showToast(m, "error");

/* ---------- Auth Storage ---------- */
export function saveAuth(auth = {}) {
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    } catch (e) {
        console.error("Failed to persist auth", e);
    }
}
export function getAuth() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}
export function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem("user");
}
export function requireAuthOrRedirect() {
    const auth = getAuth();
    if (!auth || !auth.token) {
        window.location.href = "./login.html";
        return null;
    }
    return auth;
}

/* ---------- Helpers built on API client ---------- */
const withAuthHeaders = (headers = {}) => {
    const auth = getAuth();
    if (auth?.token) {
        return { ...headers, Authorization: `Bearer ${auth.token}` };
    }
    return headers;
};

const withAuthConfig = (config = {}) => ({
    ...config,
    headers: withAuthHeaders(config.headers || {}),
});

export const get = (url, config = {}) => apiGet(url, withAuthConfig(config));
export const post = (url, data, config = {}) => apiPost(url, data, withAuthConfig(config));
export const put = (url, data, config = {}) => apiPut(url, data, withAuthConfig(config));
export const patch = (url, data, config = {}) => apiPatch(url, data, withAuthConfig(config));
export const del = (url, config = {}) => apiDelete(url, withAuthConfig(config));

export { api, http };

export const request = async (url, options = {}) => {
    const { method = "GET", data, ...config } = options;
    const verb = method.toUpperCase();
    if (verb === "GET") return get(url, config);
    if (verb === "DELETE") return del(url, config);
    if (verb === "PUT") return put(url, data, config);
    if (verb === "PATCH") return patch(url, data, config);
    return post(url, data, config);
};

/* ---------- Auth utils ---------- */
export function getCurrentUser() {
    const auth = getAuth();
    return auth?.user ?? null;
}
export function setCurrentUser(user, token) {
    saveAuth({ token: token ?? user?.token ?? null, user });
}
export function clearCurrentUser() {
    clearAuth();
}
export function requireAuth(role) {
    const auth = requireAuthOrRedirect();
    const user = auth?.user;
    if (!user) return null;
    if (role && user.role !== role) {
        window.location.href = user.role === "ADMIN" ? "./dashboard-admin.html" : "./dashboard-user.html";
        return null;
    }
    return user;
}

/* ---------- Helpers ---------- */
export async function loadServiceOptions(selectEl) {
    if (!selectEl) return;
    try {
        const services = await get("/catalog/services");
        selectEl.innerHTML =
            `<option value="">Select service</option>` +
            services.map((s) => `<option value="${s}">${s}</option>`).join("");
    } catch (e) {
        toastError(e.message);
    }
}
export async function loadUnitOptions(selectEl) {
    if (!selectEl) return;
    try {
        const units = await get("/catalog/units");
        selectEl.innerHTML =
            `<option value="">Select unit</option>` +
            units.map((u) => `<option value="${u}">${u}</option>`).join("");
    } catch (e) {
        toastError(e.message);
    }
}
export function renderStatusBadge(v) {
    return `<span class="badge status-${v}">${v.replace(/_/g, " ")}</span>`;
}
export function confirmAction(message) {
    return window.confirm(message);
}
