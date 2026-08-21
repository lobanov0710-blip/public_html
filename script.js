document.addEventListener("DOMContentLoaded", () => {

    // ================= HERO ANIMATION =================

    const items = document.querySelectorAll(".fade-up");

    items.forEach((el, i) => {
        setTimeout(() => {
            el.classList.add("show");
        }, i * 200);
    });

    // ================= SLIDER =================

    const track = document.querySelector(".car-track");
    const cards = document.querySelectorAll(".car-card");
    const prevBtn = document.querySelector(".car-btn.prev");
    const nextBtn = document.querySelector(".car-btn.next");

    if (track && cards.length && prevBtn && nextBtn) {

        let index = 0;

        function updateSlider() {
            track.style.transform = `translateX(-${index * 100}%)`;
        }

        nextBtn.addEventListener("click", () => {
            index = (index + 1) % cards.length;
            updateSlider();
        });

        prevBtn.addEventListener("click", () => {
            index = (index - 1 + cards.length) % cards.length;
            updateSlider();
        });

        updateSlider();

    } else {
        console.warn("Slider элементы не найдены");
    }

    // ================= SCROLL ANIMATION =================

    const sections = document.querySelectorAll("section");

    if ("IntersectionObserver" in window) {

        const observer = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                }

            });

        }, { threshold: 0.1 });

        sections.forEach(section => observer.observe(section));

        sections.forEach(section => {
            if (section.getBoundingClientRect().top < window.innerHeight) {
                section.classList.add("show");
            }
        });

    } else {
        sections.forEach(section => section.classList.add("show"));
    }

    // ================= FORM =================

    const form = document.getElementById("tgForm");

    if (form) {

        const btn = form.querySelector("button[type='submit']");

        let isSending = false;

        function resetButton() {
            isSending = false;

            if (btn) {
                btn.disabled = false;
                btn.textContent = "📩 Отправить заявку";
            }
        }

        form.addEventListener("submit", async (e) => {

            e.preventDefault();

            if (isSending) return;

            isSending = true;

            const name = form.querySelector('[name="name"]')?.value?.trim();
            const phone = form.querySelector('[name="phone"]')?.value?.trim();
            const route = form.querySelector('[name="route"]')?.value?.trim();
            const date = form.querySelector('[name="date"]')?.value;
            const comment = form.querySelector('[name="comment"]')?.value?.trim() || "-";

            const phoneValid = /^(\+7|8)[0-9\-\(\)\s]{10,}$/.test(phone);

            if (!name || !phone || !route || !date || !phoneValid) {

                alert("Проверьте данные");

                resetButton();

                return;
            }

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = "Отправка...";
            }

            try {

                const res = await fetch("https://silent-night-f0ea.lobanov0710.workers.dev/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        phone,
                        route,
                        date,
                        comment
                    })
                });

                if (!res.ok) {
                    throw new Error("Ошибка сервера");
                }

                const data = await res.json();

                if (data.ok) {

                    if (btn) {
                        btn.textContent = "✅ Отправлено!";
                    }

                    form.reset();

                    setTimeout(resetButton, 2000);

                } else {

                    alert("Ошибка сервера");

                    resetButton();
                }

            } catch (err) {

                console.error(err);

                alert("Ошибка сети");

                resetButton();
            }

        });

    }

    // ================= SCROLL TO TOP =================

    const scrollBtn = document.getElementById("scrollTopBtn");

    if (scrollBtn) {

        window.addEventListener("scroll", () => {

            if (window.scrollY > 400) {
                scrollBtn.classList.add("show");
            } else {
                scrollBtn.classList.remove("show");
            }

        });

        scrollBtn.addEventListener("click", () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        });

    }

});