let map = null;
let routeLine = null;
let carMarker = null;
let animationFrame = null;

// ==========================
// INIT MAP
// ==========================
function initMap() {

  const el = document.getElementById("map");

  if (!el) {
    console.warn("Map container not found");
    return null;
  }

  if (typeof L === "undefined") {
    console.warn("Leaflet not loaded");
    return null;
  }

  if (map) {
    setTimeout(() => map.invalidateSize(), 300);
    return map;
  }

  map = L.map(el).setView([55.75, 37.61], 5);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "© OpenStreetMap",
      maxZoom: 18
    }
  ).addTo(map);

  // 🔥 ВАЖНО: делаем глобальным, чтобы calculator.js видел карту
  window.map = map;

  setTimeout(() => {
    map.invalidateSize();
  }, 500);

  return map;
}

// ==========================
// DRAW ROUTE
// ==========================
async function drawRoute(geojson) {

  console.log("DRAW ROUTE:", geojson);

  let tries = 0;

  while (
    (typeof L === "undefined" || !document.getElementById("map")) &&
    tries < 20
  ) {
    await new Promise(r => setTimeout(r, 300));
    tries++;
  }

  if (typeof L === "undefined") {
    console.error("❌ Leaflet not loaded");
    return;
  }

  if (!map) {
    initMap();
  }

  if (!map) {
    console.error("❌ Map init failed");
    return;
  }

  // 🔥 FIX: защита от неправильного формата
  if (!geojson || !geojson.coordinates || !Array.isArray(geojson.coordinates)) {
    console.error("❌ Invalid route format", geojson);
    return;
  }

  const coords = geojson.coordinates.map(p => [p[1], p[0]]);

  if (routeLine) {
    try {
      map.removeLayer(routeLine);
    } catch (e) {}
  }

  routeLine = L.polyline(coords, {
    color: "#ffcc00",
    weight: 5
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), {
    padding: [30, 30]
  });

  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 300);

  animateCar(coords);
}

// ==========================
// CAR ANIMATION
// ==========================
function animateCar(coords) {

  if (!map || !coords?.length) return;

  if (carMarker) {
    try {
      map.removeLayer(carMarker);
    } catch (e) {}
  }

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  const carIcon = L.icon({
    iconUrl: "/images/auto.png",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  carMarker = L.marker(coords[0], {
    icon: carIcon
  }).addTo(map);

  let i = 0;

  function move() {

    if (i >= coords.length) return;

    carMarker.setLatLng(coords[Math.floor(i)]);

    i += 0.5;

    animationFrame = requestAnimationFrame(move);
  }

  move();
}