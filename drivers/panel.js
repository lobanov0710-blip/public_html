const API = "https://restless-leaf-4a87.lobanov0710.workers.dev";

const list = document.getElementById("driversList");

if (!list) {
  console.error("❌ driversList не найден в DOM");
}

async function loadDrivers() {

  if (!list) return;

  list.innerHTML = "⏳ загрузка...";

  try {
    const res = await fetch(`${API}/drivers`);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      list.innerHTML = "❌ ошибка загрузки";
      return;
    }

    if (!Array.isArray(data)) {
      list.innerHTML = "Нет данных";
      return;
    }

    if (data.length === 0) {
      list.innerHTML = "Пока нет водителей";
      return;
    }

    list.innerHTML = data.map(driver => {

      const id = driver.id || "";

      const name = driver.name || "—";
      const phone = driver.phone || "—";
      const car = driver.car || "—";
      const plate = driver.plate || "—";
      const tariff = driver.tariff || "—";
      const status = driver.status || "pending";

      return `
        <div class="card">

          <div class="card-header">
            <b>${name}</b>
          </div>

          <div class="card-body">
            📞 ${phone}<br>
            🚗 ${car}<br>
            🔢 ${plate}<br>
            🚕 Тариф: ${tariff}<br>
            📌 Статус: <b>${status}</b>
          </div>

          <div class="card-actions">
            <button onclick="approveDriver('${id}')">✅ Одобрить</button>
            <button onclick="deleteDriver('${id}')">❌ Удалить</button>
          </div>

        </div>
      `;
    }).join("");

  } catch (e) {
    console.error("❌ LOAD DRIVERS ERROR:", e);
    list.innerHTML = "❌ ошибка сети";
  }
}

// =========================
// APPROVE DRIVER
// =========================
window.approveDriver = async (id) => {

  if (!id) return;

  try {
    await fetch(`${API}/driver/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    loadDrivers();

  } catch (e) {
    console.error("❌ APPROVE ERROR:", e);
  }
};

// =========================
// DELETE DRIVER
// =========================
window.deleteDriver = async (id) => {

  if (!id) return;

  if (!confirm("Удалить водителя?")) return;

  try {
    await fetch(`${API}/driver/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    loadDrivers();

  } catch (e) {
    console.error("❌ DELETE ERROR:", e);
  }
};

// =========================
// INIT
// =========================
loadDrivers();