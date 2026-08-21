const API = "https://restless-leaf-4a87.lobanov0710.workers.dev";

const form = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

if (!form) {
  console.error("❌ loginForm not found");
} else {

  let loading = false;

  form.addEventListener("submit", async (e) => {

    e.preventDefault();
    if (loading) return;

    const phone = e.target.phone.value.trim();
    const password = e.target.password?.value?.trim() || "";

    if (!phone) {
      loginStatus.innerText = "Введите телефон";
      return;
    }

    loading = true;
    loginStatus.innerText = "⏳ вход...";

    try {

      const res = await fetch(`${API}/drivers/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone,
          password   // пока не используется на backend
        })
      });

      let data;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data) {
        loginStatus.innerText = data?.error || "Ошибка входа";
        return;
      }

      // =========================
      // SAVE TOKEN (ЕДИНЫЙ КЛЮЧ)
      // =========================
      localStorage.setItem("driver_token", data.token);
      localStorage.setItem("driver_id", data.driver?.id || "");

      loginStatus.innerText = "✅ Успешный вход";

      setTimeout(() => {
        location.href = "/drivers/cabinet.html";
      }, 600);

    } catch (err) {

      console.error("LOGIN ERROR:", err);
      loginStatus.innerText = "❌ Ошибка сети";

    } finally {
      loading = false;
    }
  });
}