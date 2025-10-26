import { api, setCurrentUser, toastError, toastSuccess } from "./common.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("login-error");

const DEMO_USERS = [
    { email: "admin@smartfold.lk", password: "1234", role: "ADMIN", name: "Demo Admin", token: "demo-admin-token" },
    { email: "nimal@smartfold.lk", password: "1234", role: "USER", name: "Nimal Perera", token: "demo-nimal-token" },
    { email: "ruwan@smartfold.lk", password: "1234", role: "USER", name: "Ruwan Fernando", token: "demo-ruwan-token" },
    { email: "kamal@smartfold.lk", password: "1234", role: "USER", name: "Kamal Jayasuriya", token: "demo-kamal-token" },
];

function validate() {
    let valid = true;
    errorMessage.style.display = "none";
    [emailInput, passwordInput].forEach((input) => {
        const helper = document.querySelector(`.helper-text[data-for="${input.id}"]`);
        if (!input.value) {
            input.classList.add("error");
            helper.textContent = "This field is required";
            helper.style.display = "block";
            valid = false;
        } else {
            input.classList.remove("error");
            helper.style.display = "none";
        }
    });
    if (!valid) toastError("Please fill in all required fields");
    return valid;
}

form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
        email: emailInput.value.trim(),
        password: passwordInput.value.trim(),
    };

    try {
        const user = await api.post("/api/auth/login", payload);
        handleSuccess(user);
    } catch (error) {
        if (isNetworkError(error)) {
            const fallback = findDemoUser(payload.email, payload.password);
            if (fallback) {
                handleSuccess(fallback);
                toastSuccess("Demo mode activated. Backend unreachable.");
                return;
            }
        }
        showError(error.message || "Login failed");
    }
});

function isNetworkError(error) {
    return (
        error instanceof TypeError ||
        error.message === "Failed to fetch" ||
        (typeof error.message === "string" && error.message.includes("NetworkError"))
    );
}
function findDemoUser(email, password) {
    return DEMO_USERS.find((u) => u.email === email && u.password === password);
}

function handleSuccess(user) {
    const token = user.token ?? user.accessToken ?? "session-token";
    const normalizedUser = { ...user };
    delete normalizedUser.token;
    delete normalizedUser.password;
    normalizedUser.role = (user.role ?? "USER").toString().toUpperCase();
    setCurrentUser(normalizedUser, token);

    toastSuccess(`Welcome back, ${user.name ?? user.email}!`);
    setTimeout(() => {
        if (normalizedUser.role === "ADMIN") {
            window.location.href = "./dashboard-admin.html";
        } else {
            window.location.href = "./dashboard-user.html";
        }
    }, 200);
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = "block";
    toastError(msg);
}
