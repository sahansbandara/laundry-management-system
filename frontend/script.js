const API_BASE = (() => {
    const DEFAULT_API_ORIGIN = 'http://localhost:8080';
    const DEFAULT_API_PATH = '/api';
    if (typeof window === 'undefined') {
        return `${DEFAULT_API_ORIGIN}${DEFAULT_API_PATH}`;
    }

    const sanitize = (value = '') => value.replace(/\/$/, '');

    const globalBase =
        (typeof window !== 'undefined' &&
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
    const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);
    if (isLocalhost && port && port !== '8080') {
        return `${DEFAULT_API_ORIGIN}${DEFAULT_API_PATH}`;
    }

    if (origin && origin !== 'null') {
        return `${sanitize(origin)}${DEFAULT_API_PATH}`;
    }
    if (protocol && protocol.startsWith('http') && host) {
        return `${protocol}//${sanitize(host)}${DEFAULT_API_PATH}`;
    }
    return `${DEFAULT_API_ORIGIN}${DEFAULT_API_PATH}`;
})();
const STORAGE_KEY = 'user';

const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3200);
}

function getStoredUser() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
}

function getAuthHeaders() {
    return {};
}

async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const authHeaders = getAuthHeaders();
    const mergedHeaders = { ...headers, ...authHeaders };
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: mergedHeaders,
        credentials: 'include'
    });
    if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.error || errorBody.message || errorMessage;
        } catch (err) {
            errorMessage = response.statusText;
        }
        throw new Error(errorMessage);
    }
    if (response.status === 204) {
        return null;
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return response.text();
}

function requireAuth(role) {
    const user = getStoredUser();
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    if (role && user.role !== role) {
        const redirect = user.role === 'ADMIN' ? 'dashboard-admin.html' : 'dashboard-user.html';
        window.location.href = redirect;
        return false;
    }
    return true;
}

function logout() {
    clearUser();
    window.location.href = 'login.html';
}

function initRegisterPage() {
    const form = document.getElementById('registerForm');
    const errorBox = document.getElementById('registerError');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorBox.textContent = '';

        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value.trim();

        if (!name || !email || !password) {
            errorBox.textContent = 'All fields are required.';
            return;
        }

        try {
            await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            }).then(async (res) => {
                if (!res.ok) {
                    const errorBody = await res.json();
                    throw new Error(errorBody.error || 'Registration failed');
                }
            });
            showToast('success', 'Registered successfully');
            setTimeout(() => window.location.href = 'login.html', 600);
        } catch (error) {
            errorBox.textContent = error.message;
            showToast('error', error.message);
        }
    });
}

function switchSection(target) {
    document.querySelectorAll('[data-section]').forEach(section => {
        section.style.display = section.dataset.section === target ? 'block' : 'none';
    });
    document.querySelectorAll('.nav-links button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === target);
    });
}

function initAdminDashboard() {
    if (!requireAuth('ADMIN')) return;
    const logoutBtn = document.getElementById('logoutAdmin');
    logoutBtn.addEventListener('click', () => logout());

    document.querySelectorAll('.nav-links button').forEach(btn => {
        btn.addEventListener('click', () => {
            switchSection(btn.dataset.target);
        });
    });
    switchSection('orders');

    setupOrderActions();
    setupTaskActions();
    setupPaymentActions();
    setupUserActions();
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Orders
function setupOrderActions() {
    const modal = document.getElementById('orderModal');
    const form = document.getElementById('orderForm');
    const closeBtn = modal.querySelector('.modal-close');
    let editingId = null;

    async function loadOrders() {
        try {
            const orders = await apiFetch('/orders');
            const tbody = document.getElementById('ordersTableBody');
            tbody.innerHTML = '';
            orders.forEach(order => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${order.id}</td>
          <td>${order.customerName}</td>
          <td>${order.serviceType}</td>
          <td>${order.quantity}</td>
          <td>LKR ${order.priceLkr.toFixed(2)}</td>
          <td><span class="status-pill">${order.status}</span></td>
          <td>${order.user ? order.user.email : '-'}</td>
          <td>
            <div class="action-buttons">
              <button class="icon-button" data-edit="${order.id}"><i class="fas fa-edit"></i></button>
              <button class="icon-button delete" data-delete="${order.id}"><i class="fas fa-trash"></i></button>
            </div>
          </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            showToast('error', error.message);
        }
    }

    document.getElementById('addOrderBtn').addEventListener('click', () => {
        editingId = null;
        form.reset();
        modal.querySelector('h3').textContent = 'Add Order';
        openModal('orderModal');
    });

    closeBtn.addEventListener('click', () => closeModal('orderModal'));

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            customerName: form.customerName.value.trim(),
            serviceType: form.serviceType.value.trim(),
            quantity: Number(form.quantity.value),
            priceLkr: Number(form.priceLkr.value),
            status: form.status.value.trim(),
            userId: form.userId.value ? Number(form.userId.value) : null
        };

        if (!payload.customerName || !payload.serviceType || payload.quantity <= 0 || payload.priceLkr <= 0) {
            showToast('error', 'Please provide valid order details');
            return;
        }

        try {
            if (editingId) {
                await apiFetch(`/orders/${editingId}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                });
                showToast('success', 'Order updated successfully');
            } else {
                await apiFetch('/orders', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast('success', 'Order added successfully');
            }
            closeModal('orderModal');
            loadOrders();
        } catch (error) {
            showToast('error', error.message);
        }
    });

    document.getElementById('ordersTableBody').addEventListener('click', async (event) => {
        const editId = event.target.closest('[data-edit]')?.dataset.edit;
        const deleteId = event.target.closest('[data-delete]')?.dataset.delete;

        if (editId) {
            editingId = editId;
            const orders = await apiFetch('/orders');
            const order = orders.find(o => o.id == editId);
            if (!order) return;
            form.customerName.value = order.customerName;
            form.serviceType.value = order.serviceType;
            form.quantity.value = order.quantity;
            form.priceLkr.value = order.priceLkr;
            form.status.value = order.status;
            form.userId.value = order.user ? order.user.id : '';
            modal.querySelector('h3').textContent = 'Edit Order';
            openModal('orderModal');
        }

        if (deleteId) {
            if (confirm('Are you sure you want to delete this order?')) {
                try {
                    await apiFetch(`/orders/${deleteId}`, { method: 'DELETE' });
                    showToast('success', 'Order deleted');
                    loadOrders();
                } catch (error) {
                    showToast('error', error.message);
                }
            }
        }
    });

    loadOrders();
}

// Tasks
function setupTaskActions() {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    let editingId = null;

    document.getElementById('addTaskBtn').addEventListener('click', () => {
        editingId = null;
        form.reset();
        modal.querySelector('h3').textContent = 'Add Task';
        openModal('taskModal');
    });

    modal.querySelector('.modal-close').addEventListener('click', () => closeModal('taskModal'));

    async function loadTasks() {
        try {
            const tasks = await apiFetch('/tasks');
            const tbody = document.getElementById('tasksTableBody');
            tbody.innerHTML = '';
            tasks.forEach(task => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${task.id}</td>
          <td>${task.assignedTo}</td>
          <td>${task.description}</td>
          <td><span class="status-pill">${task.status}</span></td>
          <td>
            <div class="action-buttons">
              <button class="icon-button" data-edit="${task.id}"><i class="fas fa-edit"></i></button>
              <button class="icon-button delete" data-delete="${task.id}"><i class="fas fa-trash"></i></button>
            </div>
          </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            showToast('error', error.message);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            assignedTo: form.assignedTo.value.trim(),
            description: form.description.value.trim(),
            status: form.status.value.trim()
        };

        if (!payload.assignedTo || !payload.description) {
            showToast('error', 'Please provide task details');
            return;
        }

        try {
            if (editingId) {
                await apiFetch(`/tasks/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
                showToast('success', 'Task updated');
            } else {
                await apiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) });
                showToast('success', 'Task added');
            }
            closeModal('taskModal');
            loadTasks();
        } catch (error) {
            showToast('error', error.message);
        }
    });

    document.getElementById('tasksTableBody').addEventListener('click', async (event) => {
        const editId = event.target.closest('[data-edit]')?.dataset.edit;
        const deleteId = event.target.closest('[data-delete]')?.dataset.delete;

        if (editId) {
            editingId = editId;
            const tasks = await apiFetch('/tasks');
            const task = tasks.find(t => t.id == editId);
            if (!task) return;
            form.assignedTo.value = task.assignedTo;
            form.description.value = task.description;
            form.status.value = task.status;
            modal.querySelector('h3').textContent = 'Edit Task';
            openModal('taskModal');
        }

        if (deleteId) {
            if (confirm('Delete this task?')) {
                try {
                    await apiFetch(`/tasks/${deleteId}`, { method: 'DELETE' });
                    showToast('success', 'Task deleted');
                    loadTasks();
                } catch (error) {
                    showToast('error', error.message);
                }
            }
        }
    });

    loadTasks();
}

// Payments
function setupPaymentActions() {
    const modal = document.getElementById('paymentModal');
    const form = document.getElementById('paymentForm');
    let editingId = null;

    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        editingId = null;
        form.reset();
        modal.querySelector('h3').textContent = 'Add Payment';
        openModal('paymentModal');
    });

    modal.querySelector('.modal-close').addEventListener('click', () => closeModal('paymentModal'));

    async function loadPayments() {
        try {
            const payments = await apiFetch('/payments');
            const tbody = document.getElementById('paymentsTableBody');
            tbody.innerHTML = '';
            payments.forEach(payment => {
                const tr = document.createElement('tr');
                const date = payment.date ? new Date(payment.date).toLocaleString() : '-';
                tr.innerHTML = `
          <td>${payment.id}</td>
          <td>${payment.orderId}</td>
          <td>LKR ${payment.amountLkr.toFixed(2)}</td>
          <td><span class="status-pill">${payment.status}</span></td>
          <td>${date}</td>
          <td>
            <div class="action-buttons">
              <button class="icon-button" data-edit="${payment.id}"><i class="fas fa-edit"></i></button>
              <button class="icon-button delete" data-delete="${payment.id}"><i class="fas fa-trash"></i></button>
            </div>
          </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            showToast('error', error.message);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            orderId: Number(form.orderId.value),
            amountLkr: Number(form.amountLkr.value),
            status: form.status.value.trim(),
            date: form.date.value ? form.date.value : null
        };

        if (!payload.orderId || payload.amountLkr <= 0) {
            showToast('error', 'Order ID and amount are required');
            return;
        }

        try {
            if (editingId) {
                await apiFetch(`/payments/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
                showToast('success', 'Payment updated');
            } else {
                await apiFetch('/payments', { method: 'POST', body: JSON.stringify(payload) });
                showToast('success', 'Payment added');
            }
            closeModal('paymentModal');
            loadPayments();
        } catch (error) {
            showToast('error', error.message);
        }
    });

    document.getElementById('paymentsTableBody').addEventListener('click', async (event) => {
        const editId = event.target.closest('[data-edit]')?.dataset.edit;
        const deleteId = event.target.closest('[data-delete]')?.dataset.delete;

        if (editId) {
            editingId = editId;
            const payments = await apiFetch('/payments');
            const payment = payments.find(p => p.id == editId);
            if (!payment) return;
            form.orderId.value = payment.orderId;
            form.amountLkr.value = payment.amountLkr;
            form.status.value = payment.status;
            form.date.value = payment.date ? payment.date.substring(0, 16) : '';
            modal.querySelector('h3').textContent = 'Edit Payment';
            openModal('paymentModal');
        }

        if (deleteId) {
            if (confirm('Delete this payment?')) {
                try {
                    await apiFetch(`/payments/${deleteId}`, { method: 'DELETE' });
                    showToast('success', 'Payment deleted');
                    loadPayments();
                } catch (error) {
                    showToast('error', error.message);
                }
            }
        }
    });

    loadPayments();
}

// Users
function setupUserActions() {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    let editingId = null;

    document.getElementById('addUserBtn').addEventListener('click', () => {
        editingId = null;
        form.reset();
        modal.querySelector('h3').textContent = 'Add User';
        openModal('userModal');
    });

    modal.querySelector('.modal-close').addEventListener('click', () => closeModal('userModal'));

    async function loadUsers() {
        try {
            const users = await apiFetch('/admin/users');
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
          <td>${user.id}</td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td><span class="status-pill">${user.role}</span></td>
          <td>
            <div class="action-buttons">
              <button class="icon-button" data-edit="${user.id}"><i class="fas fa-edit"></i></button>
              <button class="icon-button delete" data-delete="${user.id}"><i class="fas fa-trash"></i></button>
            </div>
          </td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            showToast('error', error.message);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            password: form.password.value.trim(),
            role: form.role.value
        };

        if (!payload.name || !payload.email || (!editingId && !payload.password)) {
            showToast('error', 'Please complete user details');
            return;
        }

        try {
            if (editingId) {
                if (!payload.password) delete payload.password;
                await apiFetch(`/admin/users/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
                showToast('success', 'User updated');
            } else {
                await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
                showToast('success', 'User added');
            }
            closeModal('userModal');
            loadUsers();
        } catch (error) {
            showToast('error', error.message);
        }
    });

    document.getElementById('usersTableBody').addEventListener('click', async (event) => {
        const editId = event.target.closest('[data-edit]')?.dataset.edit;
        const deleteId = event.target.closest('[data-delete]')?.dataset.delete;

        if (editId) {
            editingId = editId;
            const users = await apiFetch('/admin/users');
            const user = users.find(u => u.id == editId);
            if (!user) return;
            form.name.value = user.name;
            form.email.value = user.email;
            form.role.value = user.role;
            form.password.value = '';
            modal.querySelector('h3').textContent = 'Edit User';
            openModal('userModal');
        }

        if (deleteId) {
            if (confirm('Delete this user?')) {
                try {
                    await apiFetch(`/admin/users/${deleteId}`, { method: 'DELETE' });
                    showToast('success', 'User deleted');
                    loadUsers();
                } catch (error) {
                    showToast('error', error.message);
                }
            }
        }
    });

    loadUsers();
}

// User dashboard logic
function initUserDashboard() {
    if (!requireAuth('USER')) return;
    const user = getStoredUser();
    document.getElementById('userName').textContent = user.email;
    document.getElementById('logoutUser').addEventListener('click', () => logout());

    const orderForm = document.getElementById('placeOrderForm');
    const ordersList = document.getElementById('userOrdersList');
    const paymentList = document.getElementById('paymentList');
    const messageForm = document.getElementById('messageForm');
    const messageList = document.getElementById('messageList');

    orderForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            customerName: orderForm.customerName.value.trim(),
            serviceType: orderForm.serviceType.value.trim(),
            quantity: Number(orderForm.quantity.value),
            priceLkr: Number(orderForm.priceLkr.value),
            status: 'PENDING',
            userId: user.id
        };

        if (!payload.customerName || !payload.serviceType || payload.quantity <= 0 || payload.priceLkr <= 0) {
            showToast('error', 'Please provide valid order details');
            return;
        }

        try {
            await apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) });
            showToast('success', 'Order placed successfully');
            orderForm.reset();
            loadUserOrders();
            loadPayments();
        } catch (error) {
            showToast('error', error.message);
        }
    });

    async function loadUserOrders() {
        try {
            const orders = await apiFetch(`/orders?userId=${user.id}`);
            ordersList.innerHTML = '';
            if (!orders.length) {
                ordersList.innerHTML = '<p>No orders yet.</p>';
                return;
            }
            orders.forEach(order => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
          <h3>${order.serviceType}</h3>
          <p><strong>Status:</strong> <span class="status-pill">${order.status}</span></p>
          <p><strong>Quantity:</strong> ${order.quantity}</p>
          <p><strong>Price:</strong> LKR ${order.priceLkr.toFixed(2)}</p>
          <button class="icon-button delete" data-cancel="${order.id}">Cancel</button>`;
                ordersList.appendChild(card);
            });
        } catch (error) {
            showToast('error', error.message);
        }
    }

    ordersList.addEventListener('click', async (event) => {
        const cancelId = event.target.closest('[data-cancel]')?.dataset.cancel;
        if (cancelId && confirm('Cancel this order?')) {
            try {
                await apiFetch(`/orders/${cancelId}`, { method: 'DELETE' });
                showToast('success', 'Order cancelled');
                loadUserOrders();
                loadPayments();
            } catch (error) {
                showToast('error', error.message);
            }
        }
    });

    async function loadPayments() {
        try {
            const orders = await apiFetch(`/orders?userId=${user.id}`);
            const orderIds = orders.map(o => o.id);
            const payments = await apiFetch('/payments');
            paymentList.innerHTML = '';
            payments.filter(p => orderIds.includes(p.orderId)).forEach(payment => {
                const item = document.createElement('div');
                item.className = 'card';
                item.innerHTML = `
          <h3>Order #${payment.orderId}</h3>
          <p><strong>Amount:</strong> LKR ${payment.amountLkr.toFixed(2)}</p>
          <p><strong>Status:</strong> <span class="status-pill">${payment.status}</span></p>
          <p><strong>Date:</strong> ${payment.date ? new Date(payment.date).toLocaleString() : '-'}</p>`;
                paymentList.appendChild(item);
            });
            if (!paymentList.innerHTML) {
                paymentList.innerHTML = '<p>No payments yet.</p>';
            }
        } catch (error) {
            showToast('error', error.message);
        }
    }

    async function loadMessages() {
        try {
            const messages = await apiFetch(`/messages?sender=${encodeURIComponent(user.email)}&receiver=admin@smartfold.lk`);
            messageList.innerHTML = '';
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = `message ${msg.sender === user.email ? 'you' : ''}`;
                div.innerHTML = `
          <p>${msg.content}</p>
          <small>${msg.sender} • ${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</small>`;
                messageList.appendChild(div);
            });
        } catch (error) {
            showToast('error', error.message);
        }
    }

    messageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const content = messageForm.message.value.trim();
        if (!content) {
            showToast('error', 'Please type a message');
            return;
        }
        try {
            await apiFetch('/messages', {
                method: 'POST',
                body: JSON.stringify({
                    sender: user.email,
                    receiver: 'admin@smartfold.lk',
                    content
                })
            });
            messageForm.reset();
            loadMessages();
            showToast('success', 'Message sent');
        } catch (error) {
            showToast('error', error.message);
        }
    });

    loadUserOrders();
    loadPayments();
    loadMessages();
}

// Initialise based on page
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('registerForm')) {
        initRegisterPage();
    }
    if (document.body.classList.contains('admin-dashboard-page')) {
        initAdminDashboard();
    }
    if (document.body.classList.contains('user-dashboard-page')) {
        initUserDashboard();
    }

    // Redirect if already logged in
    const user = getStoredUser();
    if (user && document.getElementById('loginForm')) {
        window.location.href = user.role === 'ADMIN' ? 'dashboard-admin.html' : 'dashboard-user.html';
    }
});
