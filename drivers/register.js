const API = window.API;

document.getElementById("regBtn").onclick = async () => {

  const status = document.getElementById("status");

  const data = {
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    car: document.getElementById("car").value.trim()
  };

  if (!data.name || !data.phone || !data.car) {
    status.innerText = "Заполните все поля";
    return;
  }

  try {

    const res = await fetch(`${API}/drivers/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      status.innerText = result.error || "Ошибка регистрации";
      return;
    }

    status.innerText = "Заявка отправлена";

    setTimeout(() => {
      location.href = "/drivers/login.html";
    }, 800);

  } catch (e) {
    console.error(e);
    status.innerText = "Ошибка сети";
  }
};