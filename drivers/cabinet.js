const API = "https://restless-leaf-4a87.lobanov0710.workers.dev";

const token = localStorage.getItem("driverToken");

// =====================
// AUTH CHECK
// =====================
if (!token) {
  window.location.href = "/drivers/login.html";
}

// =====================
// LOAD ORDERS
// =====================
async function loadOrders() {

  try {

    const res = await fetch(`${API}/driver/orders`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    // ❗ TOKEN INVALID
    if (res.status === 401) {
      localStorage.removeItem("driverToken");
      window.location.href = "/drivers/login.html";
      return;
    }

    const data = await res.json().catch(() => null);

    const box = document.getElementById("orders");
    if (!box) return;

    if (!Array.isArray(data)) {
      box.innerHTML = "Нет заказов";
      return;
    }

    if (data.length === 0) {
      box.innerHTML = "📭 Заказов нет";
      return;
    }

    box.innerHTML = data.map(o => `
      <div class="order">
        <b>${o.from || "-"} → ${o.to || "-"}</b><br>
        💰 ${o.price || 0} ₽<br>
        🚕 ${o.status || "-"}

        ${o.status === "new" ? `
          <button onclick="takeOrder('${o.id}')">Взять заказ</button>
        ` : ""}

        ${o.status === "taken" ? `
          <button onclick="doneOrder('${o.id}')">Завершить</button>
        ` : ""}
      </div>
    `).join("");

  } catch (e) {
    console.error("loadOrders error:", e);
  }
}

// =====================
// TAKE ORDER
// =====================
async function takeOrder(id) {

  try {

    await fetch(`${API}/order/take`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ orderId: id })
    });

    loadOrders();

  } catch (e) {
    console.error("takeOrder error:", e);
  }
}

// =====================
// DONE ORDER
// =====================
async function doneOrder(id) {

  try {

    await fetch(`${API}/order/done`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ orderId: id })
    });

    loadOrders();

  } catch (e) {
    console.error("doneOrder error:", e);
  }
}

// =====================
// INIT
// =====================
loadOrders();

// =====================
// REALTIME (MVP FIX)
// =====================
// пока polling (заменим на WebSocket позже)
setInterval(loadOrders, 5000);