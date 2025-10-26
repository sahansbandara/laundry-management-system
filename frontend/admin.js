import {
    api,
    requireAuth,
    toastError,
    toastSuccess,
    loadServiceOptions,
    loadUnitOptions,
    clearCurrentUser,
    renderStatusBadge,
    confirmAction,
} from "./common.js";

const admin = requireAuth("ADMIN");
const adminName = document.getElementById("admin-name");
if (adminName && admin) {
    adminName.textContent = `Signed in as ${admin.name}`;
}

const logoutBtn = document.getElementById("logout-btn");
logoutBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    clearCurrentUser();
    window.location.href = "/frontend/login.html";
});

const sections = document.querySelectorAll("main section");
const navLinks = document.querySelectorAll(".sidebar nav a[href^='#']");
navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
    });
});

let orders = [];
let tasks = [];
let payments = [];
let users = [];
let selectedMessageUser = null;
let messageInterval = null;

const orderModal = document.getElementById("order-modal");
const taskModal = document.getElementById("task-modal");
const orderForm = document.getElementById("order-form");
const taskForm = document.getElementById("task-form");

const orderCustomer = document.getElementById("order-customer");
const orderService = document.getElementById("order-service");
const orderQuantity = document.getElementById("order-quantity");
const orderUnit = document.getElementById("order-unit");
const orderPrice = document.getElementById("order-price");
const orderStatus = document.getElementById("order-status");
const orderPickup = document.getElementById("order-pickup");
const orderDelivery = document.getElementById("order-delivery");
const orderNotes = document.getElementById("order-notes");

const taskTitle = document.getElementById("task-title");
const taskAssigned = document.getElementById("task-assigned");
const taskDue = document.getElementById("task-due");
const taskPrice = document.getElementById("task-price");
const taskStatus = document.getElementById("task-status");
const taskNotes = document.getElementById("task-notes");

const ordersBody = document.getElementById("orders-body");
const paymentsBody = document.getElementById("payments-body");
const usersBody = document.getElementById("users-body");
const taskLanes = document.getElementById("task-lanes");

const filterService = document.getElementById("filter-service");
const filterStatus = document.getElementById("filter-status");
const filterCustomer = document.getElementById("filter-customer");

const kpiOrders = document.getElementById("kpi-orders");
const kpiTasks = document.getElementById("kpi-tasks");
const kpiRevenue = document.getElementById("kpi-revenue");
const kpiUnpaid = document.getElementById("kpi-unpaid");

const messageUsers = document.getElementById("message-users");
const messageList = document.getElementById("message-list");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

function openModal(modal) {
    modal?.classList.add("active");
}

function closeModal(modal) {
    modal?.classList.remove("active");
}

document.getElementById("open-order-modal")?.addEventListener("click", async () => {
    await populateCustomerOptions();
    await loadServiceOptions(orderService);
    await loadUnitOptions(orderUnit);
    orderForm?.reset();
    openModal(orderModal);
});

document.getElementById("close-order-modal")?.addEventListener("click", () => closeModal(orderModal));

orderModal?.addEventListener("click", (event) => {
    if (event.target === orderModal) closeModal(orderModal);
});

document.getElementById("open-task-modal")?.addEventListener("click", () => {
    taskForm?.reset();
    openModal(taskModal);
});

document.getElementById("close-task-modal")?.addEventListener("click", () => closeModal(taskModal));

taskModal?.addEventListener("click", (event) => {
    if (event.target === taskModal) closeModal(taskModal);
});

function setHelperError(id, message) {
    const helper = document.querySelector(`.helper-text[data-for="${id}"]`);
    const field = document.getElementById(id);
    if (!helper || !field) return;
    if (message) {
        helper.textContent = message;
        helper.style.display = "block";
        field.classList.add("error");
    } else {
        helper.textContent = "";
        helper.style.display = "none";
        field.classList.remove("error");
    }
}

function validateOrderForm() {
    let valid = true;
    const quantity = parseFloat(orderQuantity.value);
    const price = parseFloat(orderPrice.value);

    if (!orderCustomer.value) {
        setHelperError("order-customer", "Select a customer");
        valid = false;
    } else {
        setHelperError("order-customer");
    }

    if (!orderService.value) {
        setHelperError("order-service", "Select a service");
        valid = false;
    } else {
        setHelperError("order-service");
    }

    if (!quantity || quantity < 1) {
        setHelperError("order-quantity", "Quantity must be at least 1");
        valid = false;
    } else {
        setHelperError("order-quantity");
    }

    if (!orderUnit.value) {
        setHelperError("order-unit", "Select a unit");
        valid = false;
    } else {
        setHelperError("order-unit");
    }

    if (isNaN(price) || price < 0) {
        setHelperError("order-price", "Price cannot be negative");
        valid = false;
    } else {
        setHelperError("order-price");
    }

    if (!valid) {
        toastError("Please fix highlighted order fields");
    }
    return valid;
}

function validateTaskForm() {
    let valid = true;
    const price = parseFloat(taskPrice.value);
    if (!taskTitle.value.trim()) {
        setHelperError("task-title", "Title is required");
        valid = false;
    } else {
        setHelperError("task-title");
    }

    if (isNaN(price) || price < 0) {
        setHelperError("task-price", "Price cannot be negative");
        valid = false;
    } else {
        setHelperError("task-price");
    }

    if (!valid) {
        toastError("Please fix highlighted task fields");
    }
    return valid;
}

orderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateOrderForm()) return;

    const payload = {
        customerId: parseInt(orderCustomer.value, 10),
        serviceType: orderService.value,
        quantity: parseFloat(orderQuantity.value),
        unit: orderUnit.value,
        price: parseFloat(orderPrice.value),
        status: orderStatus.value,
        pickupDate: orderPickup.value || null,
        deliveryDate: orderDelivery.value || null,
        notes: orderNotes.value || null,
    };

    try {
        await api.post("/api/orders", payload);
        toastSuccess("Order created successfully");
        closeModal(orderModal);
        await loadOrders();
    } catch (error) {
        toastError(error.message);
    }
});

orderCustomer?.addEventListener("change", () => setHelperError("order-customer"));
orderService?.addEventListener("change", () => setHelperError("order-service"));
orderUnit?.addEventListener("change", () => setHelperError("order-unit"));
orderQuantity?.addEventListener("input", () => setHelperError("order-quantity"));
orderPrice?.addEventListener("input", () => setHelperError("order-price"));
taskTitle?.addEventListener("input", () => setHelperError("task-title"));
taskPrice?.addEventListener("input", () => setHelperError("task-price"));

taskForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateTaskForm()) return;

    const payload = {
        title: taskTitle.value.trim(),
        assignedTo: taskAssigned.value.trim() || null,
        dueDate: taskDue.value || null,
        price: parseFloat(taskPrice.value),
        status: taskStatus.value,
        notes: taskNotes.value || null,
    };

    try {
        await api.post("/api/tasks", payload);
        toastSuccess("Task created successfully");
        closeModal(taskModal);
        await loadTasks();
    } catch (error) {
        toastError(error.message);
    }
});

async function populateCustomerOptions() {
    try {
        const data = await api.get("/api/admin/users");
        users = data;
        const customerOptions = data.filter((user) => user.role === "USER");
        orderCustomer.innerHTML = `<option value="">Select customer</option>` +
            customerOptions.map((user) => `<option value="${user.id}">${user.name}</option>`).join("");

        filterCustomer.innerHTML = `<option value="">All customers</option>` +
            customerOptions.map((user) => `<option value="${user.id}">${user.name}</option>`).join("");
    } catch (error) {
        toastError(error.message);
    }
}

async function loadOrders() {
    try {
        orders = await api.get("/api/orders");
        renderOrders();
        updateKpis();
    } catch (error) {
        toastError(error.message);
    }
}

function renderOrders() {
    const filtered = orders.filter((order) => {
        const serviceMatches = !filterService.value || order.serviceType === filterService.value;
        const statusMatches = !filterStatus.value || order.status === filterStatus.value;
        const customerMatches = !filterCustomer.value || order.customerId === Number(filterCustomer.value);
        return serviceMatches && statusMatches && customerMatches;
    });

    if (ordersBody) {
        ordersBody.innerHTML = filtered.map((order) => {
            const statusSelect = `<select data-order-id="${order.id}" class="status-select">
        ${["PENDING", "IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"].map((status) =>
                `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
      </select>`;

            return `<tr>
        <td>#${order.id}</td>
        <td>${order.customerName}</td>
        <td>${order.serviceType}</td>
        <td>${order.quantity} ${order.unit}</td>
        <td>${Number(order.price).toLocaleString()}</td>
        <td>${renderStatusBadge(order.status)}</td>
        <td>
          <div class="table-actions">
            <button data-view="${order.id}" class="btn" style="background:#0ea5e9;">View</button>
            ${statusSelect}
            <button data-update="${order.id}" class="btn" style="background:#22c55e;">Update</button>
            <button data-delete="${order.id}" class="btn" style="background:#ef4444;">Delete</button>
          </div>
        </td>
      </tr>`;
        }).join("");
    }
}

ordersBody?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const orderId = target.dataset.view || target.dataset.update || target.dataset.delete;
    if (!orderId) return;

    if (target.dataset.view) {
        const order = orders.find((o) => String(o.id) === orderId);
        if (order) {
            alert(`Order #${order.id}\nCustomer: ${order.customerName}\nService: ${order.serviceType}\nStatus: ${order.status}\nPrice: LKR ${Number(order.price).toLocaleString()}`);
        }
    }

    if (target.dataset.update) {
        const select = ordersBody.querySelector(`select[data-order-id='${orderId}']`);
        const status = select?.value;
        if (!status) return;
        try {
            await api.patch(`/api/orders/${orderId}/status?value=${status}`);
            toastSuccess("Order status updated");
            await loadOrders();
        } catch (error) {
            toastError(error.message);
        }
    }

    if (target.dataset.delete) {
        if (!confirmAction("Delete this order?")) return;
        try {
            await api.del(`/api/orders/${orderId}`);
            toastSuccess("Order deleted");
            await loadOrders();
        } catch (error) {
            toastError(error.message);
        }
    }
});

filterService?.addEventListener("change", renderOrders);
filterStatus?.addEventListener("change", renderOrders);
filterCustomer?.addEventListener("change", renderOrders);

async function loadTasks() {
    try {
        tasks = await api.get("/api/tasks");
        renderTasks();
        updateKpis();
    } catch (error) {
        toastError(error.message);
    }
}

function renderTasks() {
    const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (taskLanes) {
        taskLanes.innerHTML = statuses.map((status) => {
            const items = tasks.filter((task) => task.status === status);
            return `<div class="lane">
        <h3>${status.replace(/_/g, ' ')}</h3>
        ${items.length === 0 ? `<p style="color:var(--muted);">No tasks</p>` : items.map(renderTaskCard).join("")}
      </div>`;
        }).join("");
    }
}

function renderTaskCard(task) {
    const buttons = [];
    if (task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && task.status !== "CANCELLED") {
        buttons.push(`<button data-task="${task.id}" data-target="IN_PROGRESS" style="background:#0ea5e9;">Move to In Progress</button>`);
    }
    if (task.status !== "COMPLETED" && task.status !== "CANCELLED") {
        buttons.push(`<button data-task="${task.id}" data-target="COMPLETED" style="background:#22c55e;">Move to Completed</button>`);
    }
    if (task.status !== "CANCELLED") {
        buttons.push(`<button data-task="${task.id}" data-target="CANCELLED" style="background:#ef4444;">Cancel</button>`);
    }
    buttons.push(`<button data-remove-task="${task.id}" style="background:#64748b;">Delete</button>`);

    return `<div class="task-card">
    <h4>${task.title}</h4>
    <p style="color:var(--muted);">Assigned to: ${task.assignedTo || "Unassigned"}</p>
    <p style="color:var(--muted);">Due: ${task.dueDate || "-"}</p>
    <p style="margin-top:8px; font-weight:600;">LKR ${Number(task.price).toLocaleString()}</p>
    <div class="message-meta">${task.notes || "No notes"}</div>
    <div style="display:flex; flex-direction:column; gap:6px; margin-top:12px;">
      ${buttons.join("")}
    </div>
  </div>`;
}

taskLanes?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.task && target.dataset.target) {
        try {
            await api.patch(`/api/tasks/${target.dataset.task}/status?value=${target.dataset.target}`);
            toastSuccess("Task status updated");
            await loadTasks();
        } catch (error) {
            toastError(error.message);
        }
    }

    if (target.dataset.removeTask) {
        if (!confirmAction("Delete this task?")) return;
        try {
            await api.del(`/api/tasks/${target.dataset.removeTask}`);
            toastSuccess("Task deleted");
            await loadTasks();
        } catch (error) {
            toastError(error.message);
        }
    }
});

async function loadPayments() {
    try {
        payments = await api.get("/api/payments");
        renderPayments();
        updateKpis();
    } catch (error) {
        toastError(error.message);
    }
}

function renderPayments() {
    if (paymentsBody) {
        paymentsBody.innerHTML = payments.map((payment) => {
            return `<tr>
        <td>#${payment.id}</td>
        <td>${payment.orderId ? `#${payment.orderId} (${payment.orderServiceType || "Order"})` : "N/A"}</td>
        <td>${Number(payment.amount).toLocaleString()}</td>
        <td>${payment.method || "-"}</td>
        <td>${renderStatusBadge(payment.status)}</td>
        <td>${payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "-"}</td>
        <td class="table-actions">
          ${payment.status !== "COMPLETED" ? `<button data-complete-payment="${payment.id}" style="background:#22c55e;">Mark Completed</button>` : ""}
          <button data-remove-payment="${payment.id}" style="background:#ef4444;">Delete</button>
        </td>
      </tr>`;
        }).join("");
    }
}

paymentsBody?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.completePayment) {
        try {
            await api.patch(`/api/payments/${target.dataset.completePayment}/status?value=COMPLETED`);
            toastSuccess("Payment marked as completed");
            await loadPayments();
        } catch (error) {
            toastError(error.message);
        }
    }

    if (target.dataset.removePayment) {
        if (!confirmAction("Delete this payment?")) return;
        try {
            await api.del(`/api/payments/${target.dataset.removePayment}`);
            toastSuccess("Payment deleted");
            await loadPayments();
        } catch (error) {
            toastError(error.message);
        }
    }
});

async function loadUsers() {
    try {
        users = await api.get("/api/admin/users");
        renderUsers();
        await populateCustomerOptions();
        renderMessageUsers();
    } catch (error) {
        toastError(error.message);
    }
}

function renderUsers() {
    if (usersBody) {
        usersBody.innerHTML = users.map((user) => `<tr>
      <td>#${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${renderStatusBadge(user.role)}</td>
      <td class="table-actions">
        ${user.role === "ADMIN" ? "" : `<button data-make-admin="${user.id}" style="background:#0ea5e9;">Make Admin</button>`}
        ${user.email === admin.email ? "" : `<button data-remove-user="${user.id}" style="background:#ef4444;">Delete</button>`}
      </td>
    </tr>`).join("");
    }
}

usersBody?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.makeAdmin) {
        try {
            await api.patch(`/api/admin/users/${target.dataset.makeAdmin}/role?value=ADMIN`);
            toastSuccess("User promoted to admin");
            await loadUsers();
        } catch (error) {
            toastError(error.message);
        }
    }

    if (target.dataset.removeUser) {
        if (!confirmAction("Delete this user?")) return;
        try {
            await api.del(`/api/admin/users/${target.dataset.removeUser}`);
            toastSuccess("User deleted");
            await loadUsers();
        } catch (error) {
            toastError(error.message);
        }
    }
});

function updateKpis() {
    if (kpiOrders) {
        const today = new Date().toISOString().slice(0, 10);
        const todaysOrders = orders.filter((order) => order.pickupDate === today || order.deliveryDate === today);
        kpiOrders.textContent = todaysOrders.length.toString();
    }
    if (kpiTasks) {
        kpiTasks.textContent = tasks.filter((task) => task.status === "PENDING").length.toString();
    }
    if (kpiRevenue) {
        const now = new Date();
        const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        const revenue = payments
            .filter((payment) => payment.status === "COMPLETED")
            .filter((payment) => {
                if (!payment.paidAt) return false;
                const paidDate = new Date(payment.paidAt);
                return paidDate >= lastWeek;
            })
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        kpiRevenue.textContent = Number(revenue).toLocaleString();
    }
    if (kpiUnpaid) {
        kpiUnpaid.textContent = payments.filter((payment) => payment.status === "PENDING").length.toString();
    }
}

function renderMessageUsers() {
    if (!messageUsers) return;
    const customers = users.filter((user) => user.role === "USER");
    messageUsers.innerHTML = customers.map((user) => `<li>
    <button class="btn" data-message-user="${user.id}" style="width:100%; justify-content:flex-start; background:${selectedMessageUser === user.id ? '#2563EB' : '#1F3A8A'};">
      ${user.name}
    </button>
  </li>`).join("");
}

messageUsers?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const userId = target.dataset.messageUser;
    if (!userId) return;
    selectedMessageUser = Number(userId);
    renderMessageUsers();
    loadMessages();
    if (messageInterval) clearInterval(messageInterval);
    messageInterval = setInterval(loadMessages, 5000);
});

async function loadMessages() {
    if (!selectedMessageUser) {
        messageList.innerHTML = `<p style="color:var(--muted);">Select a customer to view messages.</p>`;
        return;
    }
    try {
        const conversation = await api.get(`/api/messages?withUserId=${selectedMessageUser}&currentUserId=${admin.id}`);
        renderMessages(conversation);
    } catch (error) {
        toastError(error.message);
    }
}

function renderMessages(messages) {
    if (!messageList) return;
    if (!messages || messages.length === 0) {
        messageList.innerHTML = `<p style="color:var(--muted);">No messages yet. Start the conversation!</p>`;
        return;
    }
    messageList.innerHTML = messages.map((message) => {
        const isAdmin = message.fromUserId === admin.id;
        return `<div class="message-bubble ${isAdmin ? "sent" : "received"}">
      <div>${message.body}</div>
      <div class="message-meta">${new Date(message.timestamp).toLocaleString()}</div>
    </div>`;
    }).join("");
    messageList.scrollTop = messageList.scrollHeight;
}

messageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedMessageUser) {
        toastError("Select a customer first");
        return;
    }
    const body = messageInput.value.trim();
    if (!body) {
        toastError("Message cannot be empty");
        return;
    }
    try {
        await api.post("/api/messages", {
            fromUserId: admin.id,
            toUserId: selectedMessageUser,
            body,
        });
        messageInput.value = "";
        await loadMessages();
    } catch (error) {
        toastError(error.message);
    }
});

async function initialiseFilters() {
    try {
        const services = await api.get("/api/catalog/services");
        filterService.innerHTML = `<option value="">All services</option>` +
            services.map((service) => `<option value="${service}">${service}</option>`).join("");
    } catch (error) {
        toastError(error.message);
    }

    filterStatus.innerHTML = `<option value="">All statuses</option>` +
        ["PENDING", "IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"].map((status) => `<option value="${status}">${status}</option>`).join("");
}

async function init() {
    await initialiseFilters();
    await populateCustomerOptions();
    await loadOrders();
    await loadTasks();
    await loadPayments();
    await loadUsers();
    loadMessages();
}

init();

window.addEventListener("beforeunload", () => {
    if (messageInterval) {
        clearInterval(messageInterval);
    }
});