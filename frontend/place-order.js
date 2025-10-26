const RATES = {
    laundryPerKg: 250,
    dryCleaningPerKg: 400,
    premiumPerItem: 400,
    pressing: {
        "Casual Wear": 50,
        "Formal Wear": 75,
        "Ethnic / Traditional": 100,
        "Bedding & Linen": 120,
        "Curtains & Drapes": 150,
        "Kids Wear": 60,
        "Delicates / Premium": 200,
    },
    washIron: {
        "Casual Wear": 75,
        "Formal Wear": 100,
        "Ethnic / Traditional": 125,
        "Bedding & Linen": 145,
        "Curtains & Drapes": 175,
        "Kids Wear": 85,
        "Delicates / Premium": 225,
    },
};

const STORAGE_KEYS = {
    draft: "laundry.placeOrderDraft",
    last: "laundry.placeOrderLast",
};

const SERVICE_LABELS = {
    laundry: "Laundry",
    dry: "Dry Cleaning",
    pressing: "Pressing",
    washiron: "Wash & Iron",
    premiumService: "Premium / Delicate Care",
};

const safeStorage = (() => {
    try {
        const testKey = "__laundry_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return window.localStorage;
    } catch (err) {
        console.warn("LocalStorage unavailable:", err?.message);
        return null;
    }
})();

const formatLKR = (value) => {
    const rounded = Math.round(Number.isFinite(value) ? value : 0);
    return `LKR ${rounded.toLocaleString("en-LK")}`;
};

const nowLocalForDatetimeInput = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

const createId = () =>
    window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const cloneLine = (line, { withNewId = false } = {}) => {
    const base = { ...line };
    if (withNewId) {
        base.id = createId();
    }
    if (Array.isArray(line.categories)) {
        base.categories = line.categories.map((c) => ({ ...c }));
    }
    return base;
};

const sumAmount = (lines = []) => lines.reduce((total, line) => total + (line.amount || 0), 0);

const getLineTitle = (line) => {
    if (line?.serviceLabel) return line.serviceLabel;
    return SERVICE_LABELS[line.type] ?? "Service";
};

function autoInitIfReady() {
    if (document.getElementById("summaryList")) {
        window.initPlaceOrder?.();
    }
}

function parseJSON(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch (err) {
        console.warn("Failed to parse stored place order payload", err);
        return null;
    }
}

window.initPlaceOrder = function initPlaceOrder() {
    const summaryListEl = document.getElementById("summaryList");
    if (!summaryListEl) return;
    if (summaryListEl.dataset.placeOrderBound === "true") return;
    summaryListEl.dataset.placeOrderBound = "true";

    const elements = {
        summaryList: summaryListEl,
        subtotalValue: document.getElementById("subtotalValue"),
        totalValue: document.getElementById("totalValue"),
        placeOrderBtn: document.getElementById("placeOrderBtn"),
        expressToggle: document.getElementById("expressToggle"),
        premiumToggle: document.getElementById("premiumToggle"),
        pickupInput: document.getElementById("pickupDateTime"),
        deliveryInput: document.getElementById("deliveryDateTime"),
        pickupError: document.getElementById("pickupError"),
        deliveryError: document.getElementById("deliveryError"),
        modalRoot:
            document.getElementById("modalRoot") ??
            (() => {
                const root = document.createElement("div");
                root.id = "modalRoot";
                document.body.appendChild(root);
                return root;
            })(),
        repeatLastOrderBtn: document.getElementById("repeatLastOrderBtn"),
    };

    const state = {
        lines: [],
        express: false,
        premiumAddonCount: 0,
    };

    let isHydrating = false;

    const syncDeliveryMin = () => {
        const nowMin = nowLocalForDatetimeInput();
        elements.pickupInput.min = nowMin;
        elements.deliveryInput.min = elements.pickupInput.value || nowMin;
    };

    const validateDates = ({ displayErrors = true } = {}) => {
        const pickupValue = elements.pickupInput.value;
        const deliveryValue = elements.deliveryInput.value;
        const nowStr = nowLocalForDatetimeInput();
        const nowDate = new Date(nowStr);

        let pickupError = "";
        let deliveryError = "";

        if (!pickupValue) {
            pickupError = "Pickup date & time is required.";
        } else {
            const pickupDate = new Date(pickupValue);
            if (pickupDate < nowDate) {
                pickupError = "Pickup must be now or later.";
            }
        }

        if (!deliveryValue) {
            deliveryError = "Delivery date & time is required.";
        } else if (!pickupError && pickupValue) {
            const pickupDate = new Date(pickupValue);
            const deliveryDate = new Date(deliveryValue);
            if (deliveryDate <= pickupDate) {
                deliveryError = "Delivery must be after pickup.";
            }
        }

        if (displayErrors) {
            elements.pickupError.textContent = pickupError;
            elements.deliveryError.textContent = deliveryError;
        }

        return {
            valid: !pickupError && !deliveryError,
            errors: { pickup: pickupError, delivery: deliveryError },
        };
    };

    const persistDraft = (totals) => {
        if (!safeStorage || isHydrating) return;
        const payload = {
            lines: state.lines.map((line) => cloneLine(line)),
            express: state.express,
            premiumAddonCount: state.premiumAddonCount,
            pickupDate: elements.pickupInput.value || "",
            deliveryDate: elements.deliveryInput.value || "",
            totals,
        };
        safeStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(payload));
    };

    const updateRepeatButton = () => {
        if (!elements.repeatLastOrderBtn) return;
        const hasLast = Boolean(parseJSON(safeStorage?.getItem(STORAGE_KEYS.last)));
        elements.repeatLastOrderBtn.disabled = !hasLast;
        elements.repeatLastOrderBtn.setAttribute(
            "aria-disabled",
            hasLast ? "false" : "true",
        );
    };

    const computeTotals = () => {
        const baseSubtotal = sumAmount(state.lines);
        const expressFee = state.express ? Math.round(baseSubtotal * 0.25) : 0;
        const premiumAddon = state.premiumAddonCount > 0 ? state.premiumAddonCount * RATES.premiumPerItem : 0;
        const total = baseSubtotal + expressFee + premiumAddon;
        return { baseSubtotal, expressFee, premiumAddon, total };
    };

    const buildLineDetails = (line) => {
        if (line.type === "pressing" || line.type === "washiron") {
            const wrapper = document.createElement("div");
            wrapper.className = "summary-details";
            line.categories.forEach((cat) => {
                const row = document.createElement("div");
                row.className = "summary-detail-row";
                const name = document.createElement("span");
                const plural = cat.qty > 1 ? "s" : "";
                name.textContent = `• ${cat.name} (${cat.qty} item${plural})`;
                const value = document.createElement("span");
                value.textContent = formatLKR(cat.qty * cat.price);
                row.appendChild(name);
                row.appendChild(value);
                wrapper.appendChild(row);
            });
            return wrapper;
        }

        if (line.type === "laundry" || line.type === "dry") {
            const wrapper = document.createElement("div");
            wrapper.className = "summary-details";
            const row = document.createElement("div");
            row.className = "summary-detail-row";
            const rate = line.type === "laundry" ? RATES.laundryPerKg : RATES.dryCleaningPerKg;
            row.innerHTML = `<span>• ${line.weight} kg @ ${formatLKR(rate)}</span><span>${formatLKR(line.amount)}</span>`;
            wrapper.appendChild(row);
            return wrapper;
        }

        if (line.type === "premiumService") {
            const wrapper = document.createElement("div");
            wrapper.className = "summary-details";
            const row = document.createElement("div");
            row.className = "summary-detail-row";
            const plural = line.count > 1 ? "s" : "";
            row.innerHTML = `<span>• ${line.count} item${plural}</span><span>${formatLKR(line.amount)}</span>`;
            wrapper.appendChild(row);
            return wrapper;
        }
        return null;
    };

    const refreshSummary = () => {
        const totals = computeTotals();
        elements.summaryList.innerHTML = "";

        const shouldShowEmpty =
            state.lines.length === 0 && !state.express && state.premiumAddonCount === 0;

        if (shouldShowEmpty) {
            const empty = document.createElement("p");
            empty.className = "summary-empty";
            empty.textContent = "No services added yet. Select a service to begin your order.";
            elements.summaryList.appendChild(empty);
        } else {
            state.lines.forEach((line) => {
                const item = document.createElement("div");
                item.className = "summary-item";

                const header = document.createElement("div");
                header.className = "summary-item-header";

                const title = document.createElement("span");
                title.textContent = getLineTitle(line);

                const amount = document.createElement("span");
                amount.className = "summary-amount";
                amount.textContent = formatLKR(line.amount);

                const removeBtn = document.createElement("button");
                removeBtn.className = "remove-btn";
                removeBtn.type = "button";
                removeBtn.setAttribute("aria-label", `Remove ${getLineTitle(line)}`);
                removeBtn.textContent = "×";
                removeBtn.addEventListener("click", () => {
                    state.lines = state.lines.filter((entry) => entry.id !== line.id);
                    refreshSummary();
                });

                header.appendChild(title);
                header.appendChild(amount);
                header.appendChild(removeBtn);
                item.appendChild(header);

                const details = buildLineDetails(line);
                if (details) {
                    item.appendChild(details);
                }

                elements.summaryList.appendChild(item);
            });

            if (state.express) {
                const expressItem = document.createElement("div");
                expressItem.className = "summary-item";
                const header = document.createElement("div");
                header.className = "summary-item-header";
                const title = document.createElement("span");
                title.textContent = "Express Add-on (+25%)";
                const amount = document.createElement("span");
                amount.className = "summary-amount";
                amount.textContent = formatLKR(totals.expressFee);
                header.appendChild(title);
                header.appendChild(amount);
                expressItem.appendChild(header);
                elements.summaryList.appendChild(expressItem);
            }

            if (state.premiumAddonCount > 0) {
                const premiumItem = document.createElement("div");
                premiumItem.className = "summary-item";
                const header = document.createElement("div");
                header.className = "summary-item-header";
                const title = document.createElement("span");
                const plural = state.premiumAddonCount > 1 ? "s" : "";
                title.textContent = `Premium Care Add-on (${state.premiumAddonCount} item${plural})`;
                const amount = document.createElement("span");
                amount.className = "summary-amount";
                amount.textContent = formatLKR(totals.premiumAddon);

                const actions = document.createElement("div");
                actions.style.display = "flex";
                actions.style.gap = "0.35rem";

                const editBtn = document.createElement("button");
                editBtn.className = "edit-btn";
                editBtn.type = "button";
                editBtn.textContent = "✎";
                editBtn.setAttribute("aria-label", "Edit Premium Care add-on quantity");
                editBtn.addEventListener("click", () => {
                    openPremiumAddonModal();
                });

                const removeBtn = document.createElement("button");
                removeBtn.className = "remove-btn";
                removeBtn.type = "button";
                removeBtn.textContent = "×";
                removeBtn.setAttribute("aria-label", "Remove Premium Care add-on");
                removeBtn.addEventListener("click", () => {
                    state.premiumAddonCount = 0;
                    elements.premiumToggle.checked = false;
                    refreshSummary();
                });

                actions.appendChild(editBtn);
                actions.appendChild(removeBtn);
                header.appendChild(title);
                header.appendChild(amount);
                header.appendChild(actions);
                premiumItem.appendChild(header);
                elements.summaryList.appendChild(premiumItem);
            }
        }

        elements.subtotalValue.textContent = formatLKR(totals.baseSubtotal);
        elements.totalValue.textContent = formatLKR(totals.total);

        const dateState = validateDates({ displayErrors: false });
        elements.placeOrderBtn.disabled = !(dateState.valid && totals.total > 0);
        elements.expressToggle.checked = state.express;
        elements.premiumToggle.checked = state.premiumAddonCount > 0;

        if (!isHydrating) {
            persistDraft(totals);
        }
        return totals;
    };

    const openModal = (modalContent, { onClose } = {}) => {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.appendChild(modalContent);
        const previouslyFocused = document.activeElement;

        const closeModal = () => {
            document.removeEventListener("keydown", handleKeyDown);
            overlay.removeEventListener("click", handleOverlayClick);
            elements.modalRoot.innerHTML = "";
            if (previouslyFocused && typeof previouslyFocused.focus === "function") {
                previouslyFocused.focus();
            }
            if (typeof onClose === "function") {
                onClose();
            }
        };

        const handleOverlayClick = (event) => {
            if (event.target === overlay) {
                closeModal();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closeModal();
                return;
            }
            if (event.key === "Tab") {
                const focusableSelectors =
                    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
                const focusable = modalContent.querySelectorAll(focusableSelectors);
                if (focusable.length === 0) {
                    event.preventDefault();
                    return;
                }
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        overlay.addEventListener("click", handleOverlayClick);
        elements.modalRoot.innerHTML = "";
        elements.modalRoot.appendChild(overlay);

        const focusableSelectors =
            "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
        const focusable = modalContent.querySelectorAll(focusableSelectors);
        if (focusable.length > 0) {
            focusable[0].focus();
        }

        return closeModal;
    };

    const addLine = (line) => {
        const prepared = cloneLine(line, { withNewId: true });
        if (!prepared.id) {
            prepared.id = createId();
        }
        state.lines.push(prepared);
        refreshSummary();
    };

    function openPremiumAddonModal() {
        const modal = document.createElement("div");
        modal.className = "modal-content";

        const title = document.createElement("h3");
        title.textContent = "Premium Care Add-on";

        const body = document.createElement("div");
        body.className = "modal-body";

        const fieldGroup = document.createElement("div");
        fieldGroup.className = "field-group";

        const label = document.createElement("label");
        label.setAttribute("for", "premiumAddonQty");
        label.textContent = "How many items need premium care?";

        const input = document.createElement("input");
        input.type = "number";
        input.id = "premiumAddonQty";
        input.min = "1";
        input.step = "1";
        input.value = state.premiumAddonCount > 0 ? String(state.premiumAddonCount) : "";
        input.placeholder = "e.g. 2";

        const helper = document.createElement("div");
        helper.className = "pill";
        helper.textContent = `${formatLKR(RATES.premiumPerItem)} per item`;

        const preview = document.createElement("p");
        preview.style.fontWeight = "600";
        preview.textContent =
            state.premiumAddonCount > 0
                ? `Amount: ${formatLKR(state.premiumAddonCount * RATES.premiumPerItem)}`
                : "Amount: LKR 0";

        fieldGroup.appendChild(label);
        fieldGroup.appendChild(input);
        fieldGroup.appendChild(helper);
        body.appendChild(fieldGroup);
        body.appendChild(preview);

        const actions = document.createElement("div");
        actions.className = "modal-actions";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "secondary-btn";
        cancelBtn.type = "button";
        cancelBtn.textContent = "Cancel";

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "primary-btn";
        confirmBtn.type = "button";
        confirmBtn.textContent = "Confirm";
        confirmBtn.disabled = state.premiumAddonCount <= 0;

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        modal.appendChild(title);
        modal.appendChild(body);
        modal.appendChild(actions);

        const close = openModal(modal, {
            onClose: () => {
                elements.premiumToggle.checked = state.premiumAddonCount > 0;
            },
        });

        const updatePreview = () => {
            const value = parseInt(input.value, 10);
            if (!Number.isNaN(value) && value >= 1) {
                preview.textContent = `Amount: ${formatLKR(value * RATES.premiumPerItem)}`;
                confirmBtn.disabled = false;
            } else {
                preview.textContent = "Amount: LKR 0";
                confirmBtn.disabled = true;
            }
        };

        input.addEventListener("input", updatePreview);

        confirmBtn.addEventListener("click", () => {
            const value = parseInt(input.value, 10);
            if (Number.isNaN(value) || value < 1) return;
            state.premiumAddonCount = value;
            refreshSummary();
            close();
        });

        cancelBtn.addEventListener("click", () => {
            if (state.premiumAddonCount === 0) {
                elements.premiumToggle.checked = false;
            }
            close();
        });

        updatePreview();
    }

    function openWeightModal(serviceType) {
        const isLaundry = serviceType === "laundry";
        const titleText = isLaundry ? "Add Laundry (Wash Only)" : "Add Dry Cleaning";
        const rate = isLaundry ? RATES.laundryPerKg : RATES.dryCleaningPerKg;

        const modal = document.createElement("div");
        modal.className = "modal-content";

        const title = document.createElement("h3");
        title.textContent = titleText;

        const body = document.createElement("div");
        body.className = "modal-body";

        const fieldGroup = document.createElement("div");
        fieldGroup.className = "field-group";

        const label = document.createElement("label");
        label.setAttribute("for", "weightInput");
        label.textContent = "Total weight (kg)";

        const input = document.createElement("input");
        input.type = "number";
        input.id = "weightInput";
        input.min = "0.5";
        input.step = "0.5";
        input.placeholder = "e.g. 3.5";

        const helper = document.createElement("div");
        helper.className = "pill";
        helper.textContent = `${formatLKR(rate)} per kg`;

        const preview = document.createElement("p");
        preview.style.fontWeight = "600";
        preview.textContent = "Amount: LKR 0";

        fieldGroup.appendChild(label);
        fieldGroup.appendChild(input);
        fieldGroup.appendChild(helper);
        body.appendChild(fieldGroup);
        body.appendChild(preview);

        const actions = document.createElement("div");
        actions.className = "modal-actions";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "secondary-btn";
        cancelBtn.type = "button";
        cancelBtn.textContent = "Cancel";

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "primary-btn";
        confirmBtn.type = "button";
        confirmBtn.textContent = "Confirm";
        confirmBtn.disabled = true;

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        modal.appendChild(title);
        modal.appendChild(body);
        modal.appendChild(actions);

        const close = openModal(modal);

        const updatePreview = () => {
            const value = parseFloat(input.value);
            if (!Number.isNaN(value) && value >= 0.5) {
                const amount = Math.round(value * rate);
                preview.textContent = `Amount: ${formatLKR(amount)}`;
                confirmBtn.disabled = false;
            } else {
                preview.textContent = "Amount: LKR 0";
                confirmBtn.disabled = true;
            }
        };

        input.addEventListener("input", updatePreview);

        confirmBtn.addEventListener("click", () => {
            const value = parseFloat(input.value);
            if (Number.isNaN(value) || value < 0.5) return;
            const amount = Math.round(value * rate);
            addLine({
                type: serviceType,
                serviceLabel: SERVICE_LABELS[serviceType],
                weight: Number(value.toFixed(2)),
                amount,
            });
            close();
        });

        cancelBtn.addEventListener("click", () => {
            close();
        });

        updatePreview();
    }

    function openCategoryModal(serviceType) {
        const isPressing = serviceType === "pressing";
        const titleText = isPressing ? "Add Pressing (Iron Only)" : "Add Wash & Iron";
        const rateTable = isPressing ? RATES.pressing : RATES.washIron;
        const companionRate = isPressing ? RATES.washIron : RATES.pressing;

        const modal = document.createElement("div");
        modal.className = "modal-content";

        const title = document.createElement("h3");
        title.textContent = titleText;

        const body = document.createElement("div");
        body.className = "modal-body";

        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        ["Category", "Price per item", "Qty"].forEach((text) => {
            const th = document.createElement("th");
            th.textContent = text;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        const inputs = [];

        Object.keys(rateTable).forEach((category) => {
            const row = document.createElement("tr");
            const catCell = document.createElement("td");
            catCell.textContent = category;

            const priceCell = document.createElement("td");
            priceCell.innerHTML = `<strong>${formatLKR(rateTable[category])}</strong> <span style="color: var(--muted); font-size: 0.8rem;">(${formatLKR(companionRate[category])} ${isPressing ? "Wash & Iron" : "Pressing"})</span>`;

            const qtyCell = document.createElement("td");
            const input = document.createElement("input");
            input.type = "number";
            input.min = "0";
            input.step = "1";
            input.value = "0";
            input.setAttribute("aria-label", `${category} quantity`);
            qtyCell.appendChild(input);

            row.appendChild(catCell);
            row.appendChild(priceCell);
            row.appendChild(qtyCell);
            tbody.appendChild(row);

            inputs.push({ category, input });
        });

        table.appendChild(tbody);

        const preview = document.createElement("div");
        preview.style.fontWeight = "600";
        preview.textContent = "Subtotal: LKR 0";

        body.appendChild(table);
        body.appendChild(preview);

        const actions = document.createElement("div");
        actions.className = "modal-actions";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "secondary-btn";
        cancelBtn.type = "button";
        cancelBtn.textContent = "Cancel";

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "primary-btn";
        confirmBtn.type = "button";
        confirmBtn.textContent = "Add Items";
        confirmBtn.disabled = true;

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        modal.appendChild(title);
        modal.appendChild(body);
        modal.appendChild(actions);

        const close = openModal(modal);

        const recalc = () => {
            let subtotal = 0;
            inputs.forEach(({ category, input }) => {
                const qty = parseInt(input.value, 10) || 0;
                if (qty > 0) {
                    subtotal += qty * rateTable[category];
                }
            });
            preview.textContent = `Subtotal: ${formatLKR(subtotal)}`;
            confirmBtn.disabled = subtotal <= 0;
        };

        inputs.forEach(({ input }) => {
            input.addEventListener("input", recalc);
        });

        confirmBtn.addEventListener("click", () => {
            const categories = inputs
                .map(({ category, input }) => {
                    const qty = parseInt(input.value, 10) || 0;
                    if (qty <= 0) return null;
                    return { name: category, qty, price: rateTable[category] };
                })
                .filter(Boolean);
            if (categories.length === 0) return;
            const amount = categories.reduce((sum, cat) => sum + cat.qty * cat.price, 0);
            addLine({
                type: serviceType,
                serviceLabel: SERVICE_LABELS[serviceType],
                categories,
                amount,
            });
            close();
        });

        cancelBtn.addEventListener("click", () => {
            close();
        });

        recalc();
    }

    function openPremiumServiceModal() {
        const modal = document.createElement("div");
        modal.className = "modal-content";

        const title = document.createElement("h3");
        title.textContent = "Add Premium / Delicate Care";

        const body = document.createElement("div");
        body.className = "modal-body";

        const fieldGroup = document.createElement("div");
        fieldGroup.className = "field-group";

        const label = document.createElement("label");
        label.setAttribute("for", "premiumServiceQty");
        label.textContent = "Number of delicate items";

        const input = document.createElement("input");
        input.type = "number";
        input.id = "premiumServiceQty";
        input.min = "1";
        input.step = "1";
        input.placeholder = "e.g. 3";

        const helper = document.createElement("div");
        helper.className = "pill";
        helper.textContent = `${formatLKR(RATES.premiumPerItem)} per item`;

        const preview = document.createElement("p");
        preview.style.fontWeight = "600";
        preview.textContent = "Amount: LKR 0";

        fieldGroup.appendChild(label);
        fieldGroup.appendChild(input);
        fieldGroup.appendChild(helper);
        body.appendChild(fieldGroup);
        body.appendChild(preview);

        const actions = document.createElement("div");
        actions.className = "modal-actions";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "secondary-btn";
        cancelBtn.type = "button";
        cancelBtn.textContent = "Cancel";

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "primary-btn";
        confirmBtn.type = "button";
        confirmBtn.textContent = "Add Items";
        confirmBtn.disabled = true;

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        modal.appendChild(title);
        modal.appendChild(body);
        modal.appendChild(actions);

        const close = openModal(modal);

        const updatePreview = () => {
            const value = parseInt(input.value, 10);
            if (!Number.isNaN(value) && value >= 1) {
                preview.textContent = `Amount: ${formatLKR(value * RATES.premiumPerItem)}`;
                confirmBtn.disabled = false;
            } else {
                preview.textContent = "Amount: LKR 0";
                confirmBtn.disabled = true;
            }
        };

        input.addEventListener("input", updatePreview);

        confirmBtn.addEventListener("click", () => {
            const value = parseInt(input.value, 10);
            if (Number.isNaN(value) || value < 1) return;
            addLine({
                type: "premiumService",
                serviceLabel: SERVICE_LABELS.premiumService,
                count: value,
                amount: value * RATES.premiumPerItem,
            });
            close();
        });

        cancelBtn.addEventListener("click", () => {
            close();
        });

        updatePreview();
    }

    const handleServiceSelection = (service) => {
        switch (service) {
            case "laundry":
                openWeightModal("laundry");
                break;
            case "pressing":
                openCategoryModal("pressing");
                break;
            case "washiron":
                openCategoryModal("washiron");
                break;
            case "dry":
                openWeightModal("dry");
                break;
            case "express":
                state.express = !state.express;
                refreshSummary();
                break;
            case "premium":
                openPremiumServiceModal();
                break;
            default:
                break;
        }
    };

    const applyState = (nextState = {}, { newIds = false } = {}) => {
        isHydrating = true;
        state.lines = Array.isArray(nextState.lines)
            ? nextState.lines.map((line) => {
                  const copy = cloneLine(line, { withNewId: newIds || !line.id });
                  if (!copy.id) copy.id = createId();
                  return copy;
              })
            : [];
        state.express = Boolean(nextState.express);
        state.premiumAddonCount = Number(nextState.premiumAddonCount) || 0;

        if (Object.prototype.hasOwnProperty.call(nextState, "pickupDate")) {
            elements.pickupInput.value = nextState.pickupDate || "";
        }
        if (Object.prototype.hasOwnProperty.call(nextState, "deliveryDate")) {
            elements.deliveryInput.value = nextState.deliveryDate || "";
        }

        syncDeliveryMin();
        refreshSummary();
        const shouldShowErrors = Boolean(elements.pickupInput.value || elements.deliveryInput.value);
        validateDates({ displayErrors: shouldShowErrors });
        if (!shouldShowErrors) {
            elements.pickupError.textContent = "";
            elements.deliveryError.textContent = "";
        }
        isHydrating = false;
    };

    const hydrateDraft = () => {
        if (!safeStorage) return false;
        const stored = parseJSON(safeStorage.getItem(STORAGE_KEYS.draft));
        if (!stored) return false;
        applyState(stored, { newIds: false });
        return true;
    };

    const convertPayloadToState = (payload) => {
        if (!payload) return null;
        const lines = Array.isArray(payload.items)
            ? payload.items
                  .map((item) => {
                      if (typeof item !== "object" || item === null) return null;
                      if (Object.prototype.hasOwnProperty.call(item, "weight")) {
                          const serviceName = String(item.service || "");
                          const type = serviceName.includes("Dry") ? "dry" : "laundry";
                          return {
                              id: createId(),
                              type,
                              serviceLabel: serviceName || SERVICE_LABELS[type],
                              weight: Number(item.weight) || 0,
                              amount: Number(item.amount) || 0,
                          };
                      }
                      if (Array.isArray(item.categories)) {
                          const serviceName = String(item.service || "");
                          const type = serviceName.includes("Wash") ? "washiron" : "pressing";
                          const categories = item.categories
                              .map((cat) => ({
                                  name: cat.name,
                                  qty: Number(cat.qty) || 0,
                                  price: Number(cat.price) || 0,
                              }))
                              .filter((cat) => cat.qty > 0);
                          const amount = Number(item.amount) || categories.reduce((sum, cat) => sum + cat.qty * cat.price, 0);
                          return {
                              id: createId(),
                              type,
                              serviceLabel: serviceName || SERVICE_LABELS[type],
                              categories,
                              amount,
                          };
                      }
                      if (Object.prototype.hasOwnProperty.call(item, "count")) {
                          return {
                              id: createId(),
                              type: "premiumService",
                              serviceLabel: String(item.service || SERVICE_LABELS.premiumService),
                              count: Number(item.count) || 0,
                              amount: Number(item.amount) || 0,
                          };
                      }
                      return null;
                  })
                  .filter(Boolean)
            : [];

        return {
            lines,
            express: Boolean(payload.express),
            premiumAddonCount: Number(payload.premiumCount) || 0,
            pickupDate: payload.pickupDate || "",
            deliveryDate: payload.deliveryDate || "",
        };
    };

    const handleRepeatLastOrder = () => {
        if (!safeStorage) {
            window.alert?.("No previous order available.");
            return;
        }
        const raw = parseJSON(safeStorage.getItem(STORAGE_KEYS.last));
        if (!raw) {
            window.alert?.("No previous order available.");
            return;
        }
        const sourceState = raw.state ?? convertPayloadToState(raw.payload);
        if (!sourceState) {
            window.alert?.("Unable to load last order.");
            return;
        }
        applyState(sourceState, { newIds: true });
        window.alert?.("Last order loaded. Review dates before submitting.");
    };

    const buildOrderPayload = (totals) => {
        const items = state.lines.map((line) => {
            if (line.type === "laundry" || line.type === "dry") {
                return {
                    service: getLineTitle(line),
                    weight: line.weight,
                    amount: line.amount,
                };
            }
            if (line.type === "pressing" || line.type === "washiron") {
                return {
                    service: getLineTitle(line),
                    categories: line.categories.map((cat) => ({
                        name: cat.name,
                        qty: cat.qty,
                        price: cat.price,
                    })),
                    amount: line.amount,
                };
            }
            if (line.type === "premiumService") {
                return {
                    service: getLineTitle(line),
                    count: line.count,
                    amount: line.amount,
                };
            }
            return {
                service: getLineTitle(line),
                amount: line.amount,
            };
        });

        return {
            pickupDate: elements.pickupInput.value,
            deliveryDate: elements.deliveryInput.value,
            express: state.express,
            premiumCount: state.premiumAddonCount,
            total: totals.total,
            items,
        };
    };

    const handleSubmit = () => {
        const dateState = validateDates({ displayErrors: true });
        const totals = computeTotals();
        if (!dateState.valid || totals.total <= 0) {
            elements.placeOrderBtn.disabled = true;
            return;
        }

        const confirmed = window.confirm?.(`Place order for ${formatLKR(totals.total)}?`);
        if (!confirmed) return;

        const payload = buildOrderPayload(totals);
        document.dispatchEvent(
            new CustomEvent("place-order:submit", {
                bubbles: true,
                detail: payload,
            }),
        );

        if (safeStorage) {
            const snapshot = {
                lines: state.lines.map((line) => cloneLine(line)),
                express: state.express,
                premiumAddonCount: state.premiumAddonCount,
                pickupDate: elements.pickupInput.value || "",
                deliveryDate: elements.deliveryInput.value || "",
            };
            safeStorage.setItem(STORAGE_KEYS.last, JSON.stringify({ state: snapshot, payload }));
            safeStorage.removeItem(STORAGE_KEYS.draft);
        }

        updateRepeatButton();
        window.alert?.("Order placed successfully!");
        applyState({ lines: [], express: false, premiumAddonCount: 0, pickupDate: "", deliveryDate: "" }, { newIds: true });
    };

    document.querySelectorAll(".service-card .primary-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const service = btn.getAttribute("data-service");
            handleServiceSelection(service);
        });
    });

    elements.expressToggle?.addEventListener("change", () => {
        state.express = elements.expressToggle.checked;
        refreshSummary();
    });

    elements.premiumToggle?.addEventListener("change", () => {
        if (elements.premiumToggle.checked) {
            openPremiumAddonModal();
        } else {
            state.premiumAddonCount = 0;
            refreshSummary();
        }
    });

    const handlePickupChange = () => {
        syncDeliveryMin();
        validateDates({ displayErrors: true });
        refreshSummary();
    };

    const handleDeliveryChange = () => {
        validateDates({ displayErrors: true });
        refreshSummary();
    };

    elements.pickupInput.addEventListener("change", handlePickupChange);
    elements.pickupInput.addEventListener("input", handlePickupChange);
    elements.deliveryInput.addEventListener("change", handleDeliveryChange);
    elements.deliveryInput.addEventListener("input", handleDeliveryChange);

    elements.repeatLastOrderBtn?.addEventListener("click", handleRepeatLastOrder);
    elements.placeOrderBtn.addEventListener("click", handleSubmit);

    syncDeliveryMin();
    updateRepeatButton();
    const hydrated = hydrateDraft();
    if (!hydrated) {
        refreshSummary();
        validateDates({ displayErrors: false });
        elements.pickupError.textContent = "";
        elements.deliveryError.textContent = "";
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInitIfReady, { once: true });
} else {
    autoInitIfReady();
}

