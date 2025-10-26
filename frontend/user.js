import {
    api,
    requireAuth,
    toastError,
    toastSuccess,
    clearCurrentUser,
    renderStatusBadge,
} from "./common.js";

const user = requireAuth("USER");

/* --- Viewport helpers --- */
function syncViewportHeightVar() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}
window.addEventListener("resize", syncViewportHeightVar);
window.addEventListener("orientationchange", syncViewportHeightVar);
syncViewportHeightVar();

/* --- DOM hooks --- */
const logoutBtn = document.getElementById("logout-user");
const placeOrderMount = document.getElementById("placeOrderMount");
const collapsibleToggles = document.querySelectorAll(".card-toggle");

/* KPIs */
const kpiActive = document.getElementById("kpiActive");
const kpiSpent  = document.getElementById("kpiSpent");
const kpiPickup = document.getElementById("kpiPickup");

/* Orders */
const ordersBody = document.getElementById("user-orders-body");
const orderSearch = document.getElementById("orderSearch");
const orderStatus = document.getElementById("orderStatus");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo    = document.getElementById("pageInfo");

/* Support */
const messageList  = document.getElementById("user-message-list");
const messageForm  = document.getElementById("user-message-form");
const messageInput = document.getElementById("user-message-input");

/* State */
let adminUser = null;
let pollingInterval = null;

let ordersAll = [];
let filtered = [];
let page = 1;
const pageSize = 5;
let openRowMenu = null;

/* --- Logout --- */
logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = "/frontend/login.html";
});

/* --- Collapsible cards --- */
function syncCollapsibleState() {
    const isDesktop = window.matchMedia("(min-width: 640px)").matches;
    collapsibleToggles.forEach((btn) => {
        const card = btn.closest(".card-collapsible");
        if (!card) return;
        if (isDesktop) {
            card.classList.add("is-open");
            btn.setAttribute("aria-expanded", "true");
        } else {
            btn.setAttribute(
                "aria-expanded",
                card.classList.contains("is-open") ? "true" : "false"
            );
        }
    });
}

collapsibleToggles.forEach((btn) => {
    const card = btn.closest(".card-collapsible");
    if (!card) return;
    btn.addEventListener("click", () => {
        if (window.matchMedia("(min-width: 640px)").matches) return;
        const isOpen = card.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
});

window.addEventListener("resize", syncCollapsibleState);
syncCollapsibleState();

/* =========================
   Place Order – embed hero
   ========================= */
async function mountPlaceOrderUI() {
    if (!placeOrderMount) return;
    placeOrderMount.innerHTML = `<div class="embed-loader">Loading Place Order UI…</div>`;

    try {
        const res = await fetch("./place-order.html", { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to fetch place-order.html");
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // move inline <style> from place-order into <head> (namespaced)
        document.head
            .querySelectorAll("style[data-source='place-order']")
            .forEach((n) => n.remove());
        doc.querySelectorAll("style").forEach((s) => {
            const clone = s.cloneNode(true);
            clone.dataset.source = "place-order";
            document.head.appendChild(clone);
        });

        // inject header+main+modalRoot content
        const fragment = document.createDocumentFragment();
        ["header", "main", "#modalRoot"].forEach((sel) => {
            const node = sel.startsWith("#")
                ? doc.querySelector(sel)
                : doc.querySelector(`body > ${sel}`);
            if (node) fragment.appendChild(node.cloneNode(true));
        });

        placeOrderMount.innerHTML = "";
        placeOrderMount.appendChild(fragment);

        // execute any inline scripts inside place-order.html
        doc.querySelectorAll("script").forEach((orig) => {
            const s = document.createElement("script");
            s.type = orig.type || "text/javascript";
            s.dataset.source = "place-order";
            if (orig.src) s.src = orig.src;
            else s.textContent = orig.textContent;
            placeOrderMount.appendChild(s);
        });

        // signal DOMContentLoaded in case their code expects it
        if (document.readyState !== "loading") {
            setTimeout(() => document.dispatchEvent(new Event("DOMContentLoaded")), 0);
        }

        window.initPlaceOrder?.();
    } catch (err) {
        console.error(err);
        placeOrderMount.innerHTML = `<div class="alert alert-error">Failed to load Place Order UI</div>`;
    }
}

/* =================
   Orders + KPIs
   ================= */
async function fetchOrders() {
    try {
        const data = await api.get(`/api/orders?userId=${user.id}`);
        ordersAll = Array.isArray(data) ? data : [];
    } catch (err) {
        // Demo-friendly fallback
        console.warn("Orders API failed, using fallback:", err?.message);
        ordersAll = [
            { id: 2, serviceType: "Wash & Fold", quantity: "3 Kg", price: 2188, status: "DELIVERED", pickupDate: "2025-10-23", deliveryDate: "2025-10-31" },
            { id: 3, serviceType: "Dry Cleaning", quantity: "5 Items", price: 2073, status: "READY", pickupDate: "2025-10-24", deliveryDate: "2025-10-28" },
            { id: 5, serviceType: "Bedding", quantity: "2 Sets", price: 1318, status: "PENDING", pickupDate: "2025-10-24", deliveryDate: "2025-10-29" },
            { id: 8, serviceType: "Stain Removal", quantity: "1 Items", price: 1649, status: "DELIVERED", pickupDate: "2025-10-23", deliveryDate: "2025-10-27" },
            { id:10, serviceType: "Stain Removal", quantity: "5 Kg", price: 1997, status: "CANCELLED", pickupDate: "2025-10-25", deliveryDate: "2025-10-25" },
        ];
    }
}

function applyFilters() {
    const q = (orderSearch?.value || "").toLowerCase();
    const st = orderStatus?.value || "ALL";

    filtered = ordersAll.filter((o) => {
        const matchesQ = !q || `${o.id} ${o.serviceType} ${o.status}`.toLowerCase().includes(q);
        const matchesS = st === "ALL" || o.status === st;
        return matchesQ && matchesS;
    });

    // clamp page
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, totalPages);

    renderOrders();
    renderPagination();
    computeKPIs();
}

function renderOrders() {
    if (!ordersBody) return;
    closeOpenMenu();
    if (filtered.length === 0) {
        ordersBody.innerHTML = `<tr><td colspan="8" class="muted">No orders found.</td></tr>`;
        pageInfo.textContent = "Showing 0–0 of 0";
        return;
    }

    const start = (page - 1) * pageSize;
    const end   = Math.min(start + pageSize, filtered.length);
    const slice = filtered.slice(start, end);

    ordersBody.innerHTML = slice.map((o) => `
    <tr>
      <td>#${o.id}</td>
      <td>${o.serviceType}</td>
      <td>${o.quantity}</td>
      <td>${Number(o.price).toLocaleString()}</td>
      <td>${renderStatusBadge(o.status)}</td>
      <td>${o.pickupDate || "-"}</td>
      <td>${o.deliveryDate || "-"}</td>
      <td class="order-actions">
        <button class="row-menu" type="button" aria-haspopup="true" aria-expanded="false" data-order-id="${o.id}" aria-label="Open actions for order #${o.id}">⋮</button>
        <div class="menu-popover" data-order-id="${o.id}" hidden role="menu">
          <button type="button" class="row-action" data-action="view" data-order-id="${o.id}" role="menuitem">View</button>
          <button type="button" class="row-action" data-action="repeat" data-order-id="${o.id}" role="menuitem">Repeat</button>
          <button type="button" class="row-action" data-action="cancel" data-order-id="${o.id}" role="menuitem">Cancel</button>
        </div>
      </td>
    </tr>
  `).join("");

    pageInfo.textContent = `Showing ${filtered.length ? start + 1 : 0}–${end} of ${filtered.length}`;
}

function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= totalPages;
}

prevPageBtn?.addEventListener("click", () => { if (page > 1) { page--; renderOrders(); renderPagination(); } });
nextPageBtn?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page < totalPages) { page++; renderOrders(); renderPagination(); }
});
orderSearch?.addEventListener("input", () => { page = 1; applyFilters(); });
orderStatus?.addEventListener("change", () => { page = 1; applyFilters(); });

ordersBody?.addEventListener("click", (e) => {
    const menuBtn = e.target.closest(".row-menu");
    if (menuBtn) {
        e.stopPropagation();
        const parent = menuBtn.parentElement;
        const menu = parent?.querySelector(".menu-popover");
        if (!menu) return;
        const isOpen = openRowMenu && openRowMenu.menu === menu;
        closeOpenMenu();
        if (!isOpen) {
            menu.hidden = false;
            menuBtn.setAttribute("aria-expanded", "true");
            openRowMenu = { menu, button: menuBtn };
        }
        return;
    }

    const actionBtn = e.target.closest(".row-action");
    if (actionBtn) {
        e.stopPropagation();
        const { action, orderId } = actionBtn.dataset;
        const order = ordersAll.find((o) => `${o.id}` === `${orderId}`);
        if (order && action) {
            handleRowAction(action, order);
        }
        closeOpenMenu();
    }
});

document.addEventListener("click", (e) => {
    if (!openRowMenu) return;
    if (e.target.closest(".menu-popover") || e.target.closest(".row-menu")) return;
    closeOpenMenu();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeOpenMenu();
    }
});

function closeOpenMenu() {
    if (!openRowMenu) return;
    openRowMenu.menu.hidden = true;
    openRowMenu.button?.setAttribute("aria-expanded", "false");
    openRowMenu = null;
}

function handleRowAction(action, order) {
    switch (action) {
        case "view":
            toastSuccess(`Viewing order #${order.id}`);
            break;
        case "repeat":
            window.dispatchEvent(new CustomEvent("place-order:repeat", { detail: { order } }));
            toastSuccess(`Order #${order.id} added to Place Order.`);
            break;
        case "cancel":
            toastSuccess(`Cancellation request sent for order #${order.id}.`);
            break;
        default:
            break;
    }
}

function computeKPIs() {
    const inactive = new Set(["DELIVERED","CANCELLED"]);
    const activeCount = ordersAll.filter(o => !inactive.has(o.status)).length;

    const spent = ordersAll.reduce((sum,o)=> sum + (Number(o.price)||0), 0);

    const pickups = ordersAll
        .map(o => new Date(o.pickupDate))
        .filter(d => !Number.isNaN(d.getTime()))
        .sort((a,b)=>b-a);
    const lastPickup = pickups.length ? pickups[0] : null;

    kpiActive.textContent = `${activeCount}`;
    kpiSpent.textContent  = Number(spent).toLocaleString(undefined,{maximumFractionDigits:0});
    kpiPickup.textContent = lastPickup ? lastPickup.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "—";
}

/* =================
   Support Messaging
   ================= */
async function findAdmin() {
    try {
        const list = await api.get("/api/admin/users");
        adminUser = (list || []).find(u => u.role === "ADMIN") || null;
    } catch {
        // fake admin fallback
        adminUser = { id: 1, name: "SmartFold Support", role: "ADMIN" };
    }
}

async function loadMessages() {
    if (!messageList) return;
    if (!adminUser) {
        messageList.innerHTML = `<p class="muted">Support is unavailable right now.</p>`;
        return;
    }
    try {
        const msgs = await api.get(`/api/messages?withUserId=${adminUser.id}&currentUserId=${user.id}`);
        renderMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
        console.warn("Messages API failed, using demo:", err?.message);
        // demo messages
        renderMessages([
            { fromUserId: user.id, body:"Hello team, checking on order update #4", timestamp: new Date().toISOString() },
            { fromUserId: adminUser.id, body:"Hi Ruwan, your order is cancelled.", timestamp: new Date().toISOString() },
            { fromUserId: user.id, body:"Hello team, checking on order update #5", timestamp: new Date().toISOString() },
            { fromUserId: adminUser.id, body:"Hi Ruwan, your order is ready.", timestamp: new Date().toISOString() },
        ]);
    }
}

function renderMessages(list) {
    if (!messageList) return;
    if (!list.length) {
        messageList.innerHTML = `<p class="muted">Start a conversation with Support.</p>`;
        return;
    }
    messageList.innerHTML = list.map(m => {
        const mine = m.fromUserId === user.id;
        const initials = (mine ? user?.name : adminUser?.name || "Support")
            ?.split(" ")
            .map(part => part[0])
            .join("")
            .slice(0,2)
            .toUpperCase() || "SF";
        return `
      <div class="message-row ${mine ? "mine" : "support"}">
        <span class="message-avatar" aria-hidden="true">${initials}</span>
        <div class="message-bubble ${mine ? "sent" : "received"}">
          <div>${m.body}</div>
          <div class="message-meta">${new Date(m.timestamp).toLocaleString()}</div>
        </div>
      </div>
    `;
    }).join("");
    messageList.scrollTop = messageList.scrollHeight;
}

messageForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = messageInput.value.trim();
    if (!body) return;

    if (!adminUser) {
        toastError("Support unavailable");
        return;
    }
    try {
        await api.post("/api/messages", {
            fromUserId: user.id,
            toUserId: adminUser.id,
            body,
        });
        messageInput.value = "";
        await loadMessages();
    } catch (err) {
        toastError(err.message || "Failed to send");
    }
});

async function initSupport() {
    await findAdmin();
    await loadMessages();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(loadMessages, 5000);
}
window.addEventListener("beforeunload", () => pollingInterval && clearInterval(pollingInterval));

/* =================
   Boot
   ================= */
(async function boot(){
    if (!user) return;
    await mountPlaceOrderUI();
    await fetchOrders();
    applyFilters();         // renders + KPIs
    await initSupport();
    toastSuccess("Welcome back!");
})();
