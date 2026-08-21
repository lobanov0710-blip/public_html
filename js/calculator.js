const API = "https://uber-v3.lobanov0710.workers.dev";

window.initCalculator = function () {

  window.__calcDebug = true;
  window.__lastRouteData = null; // 🔥 FIX: добавили хранение результата

  function log(...args) {
    if (window.__calcDebug) console.log("[CALC]", ...args);
  }

  if (window.__calcInitialized) return;
  window.__calcInitialized = true;

  const form = document.getElementById("calcForm");
  const result = document.getElementById("result");

  if (!form || !result) {
    console.error("❌ calcForm/result not found");
    return;
  }

  const fromInput = document.getElementById("from");
  const toInput = document.getElementById("to");

  const button =
    form.querySelector('button[type="submit"]') ||
    form.querySelector("button");

  let selectedTariff = "comfort";
  let isLoading = false;

  function isLeafletMap(map) {
    return map && typeof map.fitBounds === "function";
  }

  function getMap() {
    return window.map || null;
  }

  function waitMapReady(cb) {
    let tries = 0;

    const timer = setInterval(() => {

      const map = getMap();

      if (isLeafletMap(map)) {
        clearInterval(timer);

        try {
          map.invalidateSize(true);
        } catch (e) {}

        log("🗺 MAP READY");
        cb(map);
        return;
      }

      tries++;

      if (tries > 60) {
        clearInterval(timer);
        console.warn("❌ MAP TIMEOUT OR NOT LEAFLET");
      }

    }, 200);
  }

  function safeMapUpdate() {
    const map = getMap();
    if (!isLeafletMap(map)) return;

    setTimeout(() => {
      try {
        map.invalidateSize(true);
      } catch (e) {}
    }, 200);
  }

  function animateCar(latlngs) {

    const map = getMap();
    if (!isLeafletMap(map) || !latlngs?.length) return;

    if (window.__carMarker) {
      map.removeLayer(window.__carMarker);
    }

    const carIcon = L.icon({
      iconUrl: "/images/auto.png",
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker(latlngs[0], { icon: carIcon }).addTo(map);
    window.__carMarker = marker;

    let i = 0;

    function step() {
      if (i >= latlngs.length) return;

      marker.setLatLng(latlngs[Math.floor(i)]);
      i += 0.6;

      requestAnimationFrame(step);
    }

    step();
  }

  // =========================
  // 🔥 FIXED ROUTE DRAW (FINAL)
  // =========================
  function drawRoute(route) {

    const map = getMap();
    if (!isLeafletMap(map)) return;

    if (window.__routeLine) {
      map.removeLayer(window.__routeLine);
    }

    if (!route || !Array.isArray(route.coordinates)) {
      console.warn("⚠ route missing coordinates", route);
      return;
    }

    if (route.coordinates.length === 0) {
      console.warn("⚠ EMPTY ROUTE - skip draw");
      return;
    }

    // 🔥 FIX: СТРОГАЯ ВАЛИДАЦИЯ
    const latlngs = route.coordinates
      .map(p => {

        if (!Array.isArray(p) || p.length < 2) return null;

        const lng = Number(p[0]);
        const lat = Number(p[1]);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return [lat, lng];
      })
      .filter(Boolean); // 🔥 ВАЖНО

    if (latlngs.length < 2) {
      console.warn("⚠ INVALID COORDS OR TOO SHORT ROUTE");
      return;
    }

    window.__routeLine = L.polyline(latlngs, {
      color: "#2b7cff",
      weight: 5
    }).addTo(map);

    try {
      const bounds = window.__routeLine.getBounds();

      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50]
        });
      }

    } catch (e) {
      console.warn("fitBounds error:", e);
    }

    animateCar(latlngs);
  }

  document.querySelectorAll(".tariff-card").forEach(card => {
    card.addEventListener("click", () => {

      document.querySelectorAll(".tariff-card")
        .forEach(c => c.classList.remove("active"));

      card.classList.add("active");

      selectedTariff =
        (card.dataset.tariff || "comfort").toLowerCase();
    });
  });

  // =========================
  // SUBMIT
  // =========================
  form.addEventListener("submit", async (e) => {

    e.preventDefault();
    if (isLoading) return;

    const from = fromInput.value.trim();
    const to = toInput.value.trim();

    if (!from || !to) {
      result.innerText = "Введите адреса";
      return;
    }

    isLoading = true;

    button.disabled = true;
    button.textContent = "⏳ считаем...";
    result.innerText = "⏳ расчёт...";

    try {

      const res = await fetch(`${API}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          tariff: selectedTariff
        })
      });

      const data = await res.json().catch(() => null);

      console.log("ROUTE DATA:", data);

      if (!data || !res.ok || !data.ok) {
        result.innerText = data?.error || "Ошибка";
        return;
      }

      const distance = Number(data.distance || 0);
      const duration = Number(data.duration || 0);
      const price = Number(data.price || 0);

      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;

      // 🔥 сохраняем для "Забронировать"
      window.__lastRouteData = {
        from,
        to,
        distance,
        duration,
        price,
        tariff: selectedTariff,
        route: data.route
      };

      result.innerHTML = `
        🚗 ${distance.toFixed(1)} км<br>
        ⏱ ${hours} ч ${minutes} мин<br>
        💰 <b>${price} ₽</b><br><br>
        <a href="#tgForm" class="btn">🚖 Забронировать</a>
      `;

      result.classList.add("show");

      safeMapUpdate();

      if (data.route?.coordinates?.length > 0) {
        waitMapReady(() => drawRoute(data.route));
      }

    } catch (e) {
      console.error(e);
      result.innerText = "Ошибка сети";

    } finally {
      button.disabled = false;
      button.textContent = "Рассчитать";
      isLoading = false;
    }
  });
};

// INIT
document.addEventListener("DOMContentLoaded", () => {
  window.initCalculator();
});