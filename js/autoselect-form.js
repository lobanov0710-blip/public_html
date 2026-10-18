(() => {
    "use strict";

    // Заменить после публикации отдельного Cloudflare Worker автоподбора.
    const WORKER_URL = "https://YOUR-AUTOSELECT-WORKER.workers.dev";

    const normalize = (value) => String(value ?? "").trim();

    function workerConfigured() {
        return WORKER_URL.startsWith("https://") &&
            !WORKER_URL.includes("YOUR-AUTOSELECT-WORKER");
    }

    function setStatus(element, message, state = "info") {
        if (!element) return;
        element.textContent = message;
        element.dataset.state = state;
    }

    function initAutoSelectForm() {
        const form = document.getElementById("autoSelectForm");
        if (!form || form.dataset.initialized === "1") return;

        form.dataset.initialized = "1";

        const submitButton = form.querySelector('button[type="submit"]');
        const statusElement = document.getElementById("autoSelectFormStatus");

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (!form.reportValidity()) return;

            if (!workerConfigured()) {
                setStatus(
                    statusElement,
                    "Форма ещё не подключена к отдельному боту автоподбора. Позвоните по +7 910 8-800-700 или +7 950-627-5-444.",
                    "error"
                );
                return;
            }

            const formData = new FormData(form);
            const payload = {
                name: normalize(formData.get("name")),
                phone: normalize(formData.get("phone")),
                service: normalize(formData.get("service")),
                budget: normalize(formData.get("budget")),
                car: normalize(formData.get("car")),
                region: normalize(formData.get("region")),
                comment: normalize(formData.get("comment")),
                website: normalize(formData.get("website")),
                privacy: formData.get("privacy") === "on",
                source: "https://transfer-servis52.ru/avtopodbor.html"
            };

            if (!payload.name || !payload.phone || !payload.service || !payload.privacy) {
                setStatus(statusElement, "Заполните обязательные поля и подтвердите согласие.", "error");
                return;
            }

            const originalText = submitButton?.textContent ?? "Отправить заявку";

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Отправка…";
            }

            setStatus(statusElement, "Отправляем заявку…", "loading");

            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 12000);

            try {
                const response = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                let data = null;
                try {
                    data = await response.json();
                } catch (_) {
                    data = null;
                }

                if (!response.ok || data?.ok !== true) {
                    throw new Error(data?.error || `HTTP ${response.status}`);
                }

                form.reset();
                setStatus(
                    statusElement,
                    "Заявка отправлена. Свяжемся с вами для уточнения деталей.",
                    "success"
                );
            } catch (error) {
                const message = error?.name === "AbortError"
                    ? "Сервер не ответил вовремя. Попробуйте ещё раз или позвоните нам."
                    : "Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.";

                console.error("[AUTOSELECT] form submit failed:", error);
                setStatus(statusElement, message, "error");
            } finally {
                window.clearTimeout(timeoutId);

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAutoSelectForm, {once: true});
    } else {
        initAutoSelectForm();
    }
})();
