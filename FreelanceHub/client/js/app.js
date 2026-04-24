const API_URL = "http://localhost:5000/api";

const state = {
    allServices: [],
    searchQuery: "",
    sortMode: "default",
    filters: {
        category: "all",
        priceMin: "",
        priceMax: "",
        ratingMin: "0"
    },
    savedIds: new Set(),
    hiredIds: new Set()
};

let pendingConfirm = null;

document.addEventListener("DOMContentLoaded", () => {
    wireUi();
    renderSkeleton();
    fetchServices();
    setupDragAndDrop();
    updateDashboard();
});

async function fetchServices() {
    try {
        const res = await fetch(`${API_URL}/services`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        state.allServices = await res.json();
        hydrateCategoryFilter(state.allServices);
        renderServices(getVisibleServices());
        setResultsHint();
    } catch (err) {
        document.getElementById("services-container").innerHTML = "";
        setResultsHint("Could not load services. Is the server running on port 5000?");
        toast("Could not load services", "Start the server at FreelanceHub/server/server.js.", "danger");
        console.error(err);
    }
}

function wireUi() {
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const resetBtn = document.getElementById("resetBtn");
    const container = document.getElementById("services-container");
    const categoryFilter = document.getElementById("categoryFilter");
    const priceMin = document.getElementById("priceMin");
    const priceMax = document.getElementById("priceMax");
    const ratingMin = document.getElementById("ratingMin");

    searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value || "";
        renderServices(getVisibleServices());
        setResultsHint();
    });

    sortSelect.addEventListener("change", (e) => {
        state.sortMode = e.target.value || "default";
        renderServices(getVisibleServices());
        setResultsHint();
    });

    categoryFilter.addEventListener("change", (e) => {
        state.filters.category = e.target.value || "all";
        renderServices(getVisibleServices());
        setResultsHint();
    });

    priceMin.addEventListener("input", (e) => {
        state.filters.priceMin = e.target.value;
        renderServices(getVisibleServices());
        setResultsHint();
    });

    priceMax.addEventListener("input", (e) => {
        state.filters.priceMax = e.target.value;
        renderServices(getVisibleServices());
        setResultsHint();
    });

    ratingMin.addEventListener("change", (e) => {
        state.filters.ratingMin = e.target.value || "0";
        renderServices(getVisibleServices());
        setResultsHint();
    });

    resetBtn.addEventListener("click", () => {
        state.searchQuery = "";
        state.sortMode = "default";
        state.filters = { category: "all", priceMin: "", priceMax: "", ratingMin: "0" };
        searchInput.value = "";
        sortSelect.value = "default";
        categoryFilter.value = "all";
        priceMin.value = "";
        priceMax.value = "";
        ratingMin.value = "0";
        renderServices(getVisibleServices());
        setResultsHint();
        toast("Reset", "Showing recommended results.", "ok");
    });

    container.addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;

        const action = button.dataset.action;
        const id = Number(button.dataset.id);

        if (action === "details") return showDetails(id);
        if (action === "save") return openConfirm("save", id);
        if (action === "hire") return openConfirm("hire", id);
    });

    container.addEventListener("dragstart", (e) => {
        const card = e.target.closest(".card[data-id]");
        if (!card) return;
        e.dataTransfer.setData("serviceId", card.dataset.id);
        e.dataTransfer.effectAllowed = "move";
    });
}

function getVisibleServices() {
    const q = state.searchQuery.trim().toLowerCase();
    let result = state.allServices;

    if (q) {
        result = result.filter((s) => {
            const title = String(s.title || "").toLowerCase();
            const category = String(s.category || "").toLowerCase();
            return title.includes(q) || category.includes(q);
        });
    }

    const selectedCategory = state.filters.category;
    if (selectedCategory && selectedCategory !== "all") {
        result = result.filter((s) => String(s.category || "") === selectedCategory);
    }

    const ratingMin = Number(state.filters.ratingMin || 0);
    if (ratingMin > 0) {
        result = result.filter((s) => Number(s.rating) >= ratingMin);
    }

    const minVal = state.filters.priceMin === "" ? null : Number(state.filters.priceMin);
    const maxVal = state.filters.priceMax === "" ? null : Number(state.filters.priceMax);
    if (minVal !== null && Number.isFinite(minVal)) {
        result = result.filter((s) => Number(s.price) >= minVal);
    }
    if (maxVal !== null && Number.isFinite(maxVal)) {
        result = result.filter((s) => Number(s.price) <= maxVal);
    }

    result = [...result];
    if (state.sortMode === "price-low") result.sort((a, b) => Number(a.price) - Number(b.price));
    if (state.sortMode === "rating-high") result.sort((a, b) => Number(b.rating) - Number(a.rating));
    return result;
}

function renderServices(services) {
    const container = document.getElementById("services-container");

    if (!services.length) {
        container.innerHTML = `
            <div class="card card--static">
                <h3 class="card__title">No matches found</h3>
                <div class="meta">Try a different search term or hit "Reset".</div>
            </div>
        `;
        return;
    }

    container.innerHTML = services.map((service) => {
        const isSaved = state.savedIds.has(service.id);
        const isHired = state.hiredIds.has(service.id);

        const status = isHired
            ? `<span class="pill pill--hired">Hired</span>`
            : isSaved
                ? `<span class="pill pill--saved">Saved</span>`
                : "";

        return `
            <div class="card" draggable="true" data-id="${service.id}">
                <div class="card__top">
                    <div class="meta">
                        <span class="badge">${escapeHtml(service.category)}</span>
                        <span class="pill"><span class="stars">${renderStars(service.rating)}</span> ${Number(service.rating).toFixed(1)}</span>
                        ${status}
                    </div>
                    <h3 class="card__title">${escapeHtml(service.title)}</h3>
                </div>

                <div class="meta meta--space-between">
                    <div class="price">$${escapeHtml(service.price)} <small>/ gig</small></div>
                </div>

                <div class="card__actions">
                    <button class="btn btn--soft" type="button" data-action="details" data-id="${service.id}">Details</button>
                    <button class="btn btn--ghost" type="button" data-action="save" data-id="${service.id}">Save</button>
                    <button class="btn btn--primary" type="button" data-action="hire" data-id="${service.id}">Hire</button>
                </div>
            </div>
        `;
    }).join("");
}

function setupDragAndDrop() {
    const zones = ["save-zone", "hire-zone"];
    zones.forEach((zoneId) => {
        const zone = document.getElementById(zoneId);
        zone.ondragover = (e) => {
            e.preventDefault();
            zone.classList.add("is-over");
        };
        zone.ondragleave = () => zone.classList.remove("is-over");
        zone.ondrop = async (e) => {
            zone.classList.remove("is-over");
            const id = e.dataTransfer.getData("serviceId");
            const action = zoneId === "save-zone" ? "save" : "hire";
            openConfirm(action, Number(id));
        };
    });
}

async function performAction(action, id) {
    try {
        const res = await fetch(`${API_URL}/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: parseInt(id, 10) })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);

        toast(action === "hire" ? "Hired" : "Saved", data.message || "Done.", "ok");
        await updateDashboard();
        renderServices(getVisibleServices());
        setResultsHint();
    } catch (err) {
        toast("Action failed", String(err.message || err), "danger");
        console.error(err);
    }
}

async function updateDashboard() {
    try {
        const [savedRes, hiredRes] = await Promise.all([
            fetch(`${API_URL}/saved`),
            fetch(`${API_URL}/hired`)
        ]);
        const saved = await savedRes.json();
        const hired = await hiredRes.json();

        state.savedIds = new Set(saved.map((s) => s.id));
        state.hiredIds = new Set(hired.map((s) => s.id));

        document.getElementById("savedCount").textContent = String(saved.length);
        document.getElementById("hiredCount").textContent = String(hired.length);

        document.getElementById("saved-list").innerHTML = saved
            .map((s) => `<li><div>${escapeHtml(s.title)}</div><div class="small">${escapeHtml(s.category)} &middot; $${escapeHtml(s.price)}</div></li>`)
            .join("");
        document.getElementById("hired-list").innerHTML = hired
            .map((s) => `<li><div>${escapeHtml(s.title)}</div><div class="small">${escapeHtml(s.category)} &middot; $${escapeHtml(s.price)}</div></li>`)
            .join("");

        const savedEmpty = document.getElementById("saved-empty");
        const hiredEmpty = document.getElementById("hired-empty");
        savedEmpty.style.display = saved.length ? "none" : "block";
        hiredEmpty.style.display = hired.length ? "none" : "block";
    } catch (err) {
        console.error(err);
    }
}

async function showDetails(id) {
    try {
        const res = await fetch(`${API_URL}/services/${id}`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const service = await res.json();
        const modal = document.getElementById("modal");

        document.getElementById("modal-body").innerHTML = `
            <h2 id="modalTitle">${escapeHtml(service.title)}</h2>
            <p>${escapeHtml(service.description || "")}</p>
            <p><strong>Category:</strong> ${escapeHtml(service.category)}</p>
            <p><strong>Price:</strong> $${escapeHtml(service.price)}</p>
            <p><strong>Rating:</strong> <span class="stars">${renderStars(service.rating)}</span> ${Number(service.rating).toFixed(1)}</p>
            <div class="modal-actions">
                <button class="btn btn--soft" type="button" data-modal-action="confirm-open" data-action="save" data-id="${service.id}">Save</button>
                <button class="btn btn--primary" type="button" data-modal-action="confirm-open" data-action="hire" data-id="${service.id}">Hire now</button>
            </div>
        `;

        modal.style.display = "block";
        modal.setAttribute("aria-hidden", "false");
    } catch (err) {
        toast("Could not open details", String(err.message || err), "danger");
        console.error(err);
    }
}

function closeModal() {
    const modal = document.getElementById("modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

document.addEventListener("click", async (e) => {
    const modal = document.getElementById("modal");
    if (!modal || modal.style.display !== "block") return;

    if (e.target === modal) return closeModal();

    const actionBtn = e.target.closest("button[data-modal-action]");
    if (actionBtn) {
        const modalAction = actionBtn.dataset.modalAction;

        if (modalAction === "confirm-open") {
            const action = actionBtn.dataset.action;
            const id = Number(actionBtn.dataset.id);
            closeModal();
            openConfirm(action, id);
            return;
        }

        if (modalAction === "confirm") {
            if (pendingConfirm) {
                await performAction(pendingConfirm.action, pendingConfirm.id);
            }
            pendingConfirm = null;
            closeModal();
            return;
        }

        if (modalAction === "cancel") {
            pendingConfirm = null;
            closeModal();
            return;
        }
    }

    if (e.target.closest(".modal-close")) return closeModal();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

function setResultsHint(customText) {
    const hint = document.getElementById("resultsHint");
    if (!hint) return;

    if (customText) {
        hint.textContent = customText;
        return;
    }

    const visible = getVisibleServices().length;
    const total = state.allServices.length;
    const q = state.searchQuery.trim();

    const isFiltered =
        (state.filters.category && state.filters.category !== "all") ||
        state.filters.priceMin !== "" ||
        state.filters.priceMax !== "" ||
        Number(state.filters.ratingMin || 0) > 0;

    if (q) {
        hint.textContent = `Showing ${visible} of ${total} results for "${q}".`;
        return;
    }

    hint.textContent = isFiltered ? `Showing ${visible} of ${total} gigs.` : `Showing ${total} gigs.`;
}

function renderSkeleton() {
    const container = document.getElementById("services-container");
    container.innerHTML = Array.from({ length: 8 }).map(() => `
        <div class="card card--static skeleton">
            <div class="skeleton-line skeleton-line--sm w-55"></div>
            <div class="skeleton-line skeleton-line--lg w-85"></div>
            <div class="skeleton-line skeleton-line--md w-65"></div>
            <div class="skeleton-line skeleton-line--btn w-100"></div>
        </div>
    `).join("");
}

function toast(title, message, tone = "ok") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    el.className = `toast toast--${tone}`;
    el.innerHTML = `
        <div class="toast__title">${escapeHtml(title)}</div>
        <p class="toast__msg">${escapeHtml(message)}</p>
    `;

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-in"));

    window.setTimeout(() => {
        el.classList.remove("is-in");
        window.setTimeout(() => el.remove(), 220);
    }, 2400);
}

function openConfirm(action, id) {
    const service = state.allServices.find((s) => Number(s.id) === Number(id));
    if (!service) {
        toast("Not found", "Service not found.", "warn");
        return;
    }

    pendingConfirm = { action, id: Number(id) };

    const modal = document.getElementById("modal");
    const title = action === "hire" ? "Confirm hire" : "Confirm save";
    const primaryLabel = action === "hire" ? "Hire" : "Save";

    document.getElementById("modal-body").innerHTML = `
        <h2 id="modalTitle">${escapeHtml(title)}</h2>
        <p>You are about to <strong>${escapeHtml(action)}</strong> this gig:</p>
        <div class="card card--static card--tight confirm-card">
            <div class="meta">
                <span class="badge">${escapeHtml(service.category)}</span>
                <span class="pill"><span class="stars">${renderStars(service.rating)}</span> ${Number(service.rating).toFixed(1)}</span>
            </div>
            <h3 class="card__title">${escapeHtml(service.title)}</h3>
            <div class="meta meta--space-between">
                <div class="price">$${escapeHtml(service.price)} <small>/ gig</small></div>
                <span class="pill">ID: ${escapeHtml(service.id)}</span>
            </div>
        </div>
        <div class="confirm-actions">
            <button class="btn btn--ghost" type="button" data-modal-action="cancel">Cancel</button>
            <button class="btn btn--primary" type="button" data-modal-action="confirm">${escapeHtml(primaryLabel)}</button>
        </div>
    `;

    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
}

function renderStars(rating) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const full = Math.round(r);
    return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}

function hydrateCategoryFilter(services) {
    const el = document.getElementById("categoryFilter");
    if (!el) return;

    const categories = Array.from(new Set(services.map((s) => String(s.category || "")).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
    );

    el.innerHTML = `<option value="all">All</option>` + categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    el.value = state.filters.category || "all";
}
