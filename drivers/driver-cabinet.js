const API = window.API || "https://restless-leaf-4a87.lobanov0710.workers.dev";

// =====================
// SAFE AUTH WRAPPER
// =====================
function getTokenSafe() {
  try {
    return Auth?.getToken?.() || localStorage.getItem("driver_token");
  } catch {
    return localStorage.getItem("driver_token");
  }
}

function getDriverSafe() {
  try {
    return Auth?.getDriver?.() || {};
  } catch {
    return {};
  }
}

// =====================
// PROFILE
// =====================
function renderMe() {

  const d = getDriverSafe();

  const el = document.getElementById("me");
  if (!el) return;

  el.innerHTML = `
    👤 ${d.name || "-"}<br>
    🚗 ${d.car || "-"}<br>
    📞 ${d.phone || "-"}
  `;
}

// =====================
// LOAD ORDERS
// =====================
async function loadOrders() {

  const token = getTokenSafe();

  if (!token) {
    location.href = "/drivers/login.html";
    return;
  }

  try {

    const res = await fetch(`${API}/driver/orders`, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    // 🔥 TOKEN INVALID
    if (res.status === 401) {
      localStorage.removeItem("driver_token");
      location.href = "/drivers/login.html";
      return;
    }

    const data = await res.json().catch(() => null);

    const container = document.getElementById("orders");
    if (!container) return;

    if (!Array.isArray(data)) {
      container.innerHTML = "Нет заказов";
      return;
    }

    if (data.length === 0) {
      container.innerHTML = "📭 Заказов нет";
      return;
    }

    container.innerHTML = data.map(o => `
      <div class="card">
        📍 ${o.from || "-"} → ${o.to || "-"}<br>
        💰 ${o.price || 0} ₽<br>
        📦 Статус: ${o.status || "-"}<br>

        <button onclick="takeOrder('${o.id}')">
          Принять заказ
        </button>
      </div>
    `).join("");

  } catch (e) {
    console.error("loadOrders error:", e);
  }
}

// =====================
// TAKE ORDER
// =====================
window.takeOrder = async (id) => {

  const token = getTokenSafe();

  if (!token) return;

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
    console.error("take error:", e);
  }
};

// =====================
// REALTIME (MOCK FIX)
// =====================
// ❌ window.addEventListener НЕ РАБОТАЕТ ДЛЯ WS
// 👉 пока делаем polling (правильно для MVP)

setInterval(() => {
  loadOrders();
}, 5000);

// =====================
// INIT
// =====================
renderMe();
loadOrders();