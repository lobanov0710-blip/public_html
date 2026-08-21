const API = window.API || "https://restless-leaf-4a87.lobanov0710.workers.dev";

const btn = document.getElementById("regBtn");
const status = document.getElementById("status");

let loading = false;

btn.addEventListener("click", async () => {

  if (loading) return;

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();
  const car = document.getElementById("car").value.trim();

  // =========================
  // VALIDATION
  // =========================
  if (!name || !phone || !password || !car) {
    status.innerText = "Заполните все поля";
    return;
  }

  loading = true;
  btn.disabled = true;
  btn.innerText = "⏳ отправка...";

  status.innerText = "Отправка заявки...";

  try {

    const res = await fetch(`${API}/drivers/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        phone,
        password, // ⚠️ отправляем пароль
        car
      })
    });

    let result;

    try {
      result = await res.json();
    } catch {
      result = null;
    }

    if (!res.ok || !result) {
      status.innerText = result?.error || "Ошибка регистрации";
      return;
    }

    status.innerText = "✅ Заявка отправлена";

    setTimeout(() => {
      location.href = "/drivers/login.html";
    }, 800);

  } catch (e) {

    console.error(e);
    status.innerText = "Ошибка сети";

  } finally {

    loading = false;
    btn.disabled = false;
    btn.innerText = "Зарегистрироваться";
  }
});