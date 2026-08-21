const API = "https://restless-leaf-4a87.lobanov0710.workers.dev";

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("driverForm");
  const status = document.getElementById("status");

  if (!form) {
    console.error("❌ driverForm not found");
    return;
  }

  let loading = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (loading) return;

    const data = {
      name: form.name?.value?.trim() || "",
      phone: form.phone?.value?.trim() || "",
      car: form.car?.value?.trim() || "",
      experience: form.experience?.value?.trim() || "",
      city: form.city?.value?.trim() || "",
      comment: form.comment?.value?.trim() || ""
    };

    // =========================
    // VALIDATION
    // =========================
    if (!data.name || !data.phone || !data.car) {

      const msg = "⚠️ Заполните обязательные поля (Имя, Телефон, Авто)";

      if (status) status.innerText = msg;
      else alert(msg);

      return;
    }

    loading = true;

    const btn = form.querySelector("button");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ отправка...";
    }

    if (status) {
      status.innerText = "⏳ Отправляем заявку...";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {

      console.log("📦 DRIVER SEND:", data);

      // ✅ FIX HERE: /drivers/register
      const res = await fetch(`${API}/drivers/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      const result = await res.json().catch(() => null);

      console.log("📥 RESPONSE:", res.status, result);

      if (!res.ok) {

        const msg = result?.error || `Ошибка сервера (${res.status})`;

        if (status) status.innerText = "❌ " + msg;
        else alert(msg);

        return;
      }

      const successMsg = "✅ Заявка отправлена! Мы свяжемся с вами.";

      if (status) status.innerText = successMsg;
      else alert(successMsg);

      form.reset();

      console.log("🚖 DRIVER REGISTERED:", result);

    } catch (err) {

      console.error("❌ NETWORK ERROR:", err);

      let msg = "❌ Ошибка сети";

      if (err.name === "AbortError") {
        msg = "⏳ Сервер не отвечает (таймаут)";
      }

      if (status) status.innerText = msg;
      else alert(msg);

    } finally {

      clearTimeout(timeout);

      loading = false;

      if (btn) {
        btn.disabled = false;
        btn.textContent = "🚖 Отправить заявку";
      }
    }
  });

});