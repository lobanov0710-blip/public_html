window.initForm = function () {

    const form = document.getElementById("tgForm");
    if (!form) return;

    const btn = form.querySelector("button[type='submit']");
    let loading = false;

    function reset() {
        loading = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = "📩 Отправить заявку";
        }
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (loading) return;

        const name = form.name.value.trim();
        const phone = form.phone.value.trim();
        const route = form.route.value.trim();
        const date = form.date.value;
        const comment = form.comment.value.trim();

        const phoneValid = /^(\+7|8)[0-9\-\(\)\s]{10,}$/.test(phone);

        if (!name || !phone || !route || !date || !phoneValid) {
            alert("Проверьте данные");
            return;
        }

        loading = true;

        btn.disabled = true;
        btn.textContent = "Отправка...";

        try {
            const res = await fetch("https://silent-night-f0ea.lobanov0710.workers.dev/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone, route, date, comment })
            });

            const data = await res.json();

            if (data.ok) {
                btn.textContent = "✅ Отправлено!";
                form.reset();
                setTimeout(reset, 2000);
            } else {
                alert("Ошибка сервера");
                reset();
            }

        } catch (err) {
            console.error(err);
            alert("Ошибка сети");
            reset();
        }
    });
};