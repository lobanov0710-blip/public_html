document.addEventListener("DOMContentLoaded", () => {

  const phoneInput = document.getElementById("phone");
  const passwordInput = document.getElementById("password");
  const btn = document.getElementById("loginBtn");
  const status = document.getElementById("status");

  const API = "https://restless-leaf-4a87.lobanov0710.workers.dev";

  let loading = false;

  async function login() {

    if (loading) return;

    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();

    if (!phone) {
      status.innerText = "Введите телефон";
      return;
    }

    if (!password) {
      status.innerText = "Введите пароль";
      return;
    }

    loading = true;

    btn.disabled = true;
    btn.innerText = "⏳ вход...";

    status.innerText = "Проверка...";

    try {

      const res = await fetch(`${API}/drivers/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone,
          password   // ⚠️ теперь отправляется
        })
      });

      let data;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      // ❌ сервер отклонил
      if (!res.ok || !data) {
        status.innerText = data?.error || "Ошибка входа";
        return;
      }

      // =========================
      // SAVE JWT
      // =========================
      localStorage.setItem("driver_token", data.token);
      localStorage.setItem("driver_id", data.driver?.id || "");

      status.innerText = "✅ Успешный вход";

      setTimeout(() => {
        window.location.href = "/drivers/panel.html";
      }, 500);

    } catch (e) {

      console.error(e);
      status.innerText = "Ошибка сети";

    } finally {

      loading = false;
      btn.disabled = false;
      btn.innerText = "Войти";
    }
  }

  btn.addEventListener("click", login);

  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });

});