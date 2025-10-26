import { post, toastError, toastSuccess } from "./common.js";

const form = document.getElementById("register-form");
const inputs = {
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
};

function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function showError(input, message) {
    const helper = document.querySelector(`.helper-text[data-for="${input.id}"]`);
    input.classList.add("error");
    helper.textContent = message;
    helper.style.display = "block";
}

function clearError(input) {
    const helper = document.querySelector(`.helper-text[data-for="${input.id}"]`);
    input.classList.remove("error");
    helper.style.display = "none";
}

function validate() {
    let valid = true;
    Object.values(inputs).forEach((input) => clearError(input));

    if (!inputs.name.value.trim()) {
        showError(inputs.name, "Name is required");
        valid = false;
    }
    if (!inputs.email.value.trim()) {
        showError(inputs.email, "Email is required");
        valid = false;
    } else if (!validateEmail(inputs.email.value.trim())) {
        showError(inputs.email, "Enter a valid email address");
        valid = false;
    }
    if (!inputs.password.value.trim()) {
        showError(inputs.password, "Password is required");
        valid = false;
    } else if (inputs.password.value.trim().length < 4) {
        showError(inputs.password, "Minimum 4 characters");
        valid = false;
    }

    if (!valid) {
        toastError("Please correct highlighted fields");
    }
    return valid;
}

form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
        name: inputs.name.value.trim(),
        email: inputs.email.value.trim(),
        password: inputs.password.value.trim(),
    };

    try {
        await post("/auth/register", payload);
        toastSuccess("Registration successful! Please login.");
        setTimeout(() => {
            window.location.href = "/frontend/login.html";
        }, 600);
    } catch (error) {
        toastError(error.message);
    }
});
