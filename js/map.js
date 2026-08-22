(() => {

  // ==========================
  // PRIVATE STATE
  // ==========================

  let map = null;
  let routeLine = null;
  let carMarker = null;
  let animationFrame = null;

  // ==========================
  // HELPERS
  // ==========================

  function hasLeaflet() {
    return (
      typeof window.L !== "undefined"
    );
  }

  function getMapElement() {
    return document.getElementById(
      "map"
    );
  }

  function isMapReady() {
    return (
      map &&
      typeof map.fitBounds ===
        "function"
    );
  }

  function invalidateMap(
    delay = 0
  ) {

    if (!isMapReady()) {
      return;
    }

    setTimeout(() => {

      try {
        map.invalidateSize(true);
      } catch (error) {
        console.warn(
          "[MAP] invalidate error:",
          error
        );
      }

    }, delay);
  }

  // ==========================
  // INIT MAP
  // ==========================

  function initMap() {

    const element =
      getMapElement();

    if (!element) {

      console.warn(
        "[MAP] container not found"
      );

      return null;
    }

    if (!hasLeaflet()) {

      console.warn(
        "[MAP] Leaflet not loaded"
      );

      return null;
    }

    // Уже создана
    if (isMapReady()) {

      invalidateMap(100);

      window.map = map;

      return map;
    }

    try {

      map =
        L.map(
          element,
          {
            zoomControl: true
          }
        )
        .setView(
          [
            55.75,
            37.61
          ],
          5
        );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            "© OpenStreetMap",

          maxZoom:
            18
        }
      )
      .addTo(map);

      // Совместимость
      // с текущим main.js.
      window.map = map;

      invalidateMap(300);

      console.log(
        "[MAP] initialized"
      );

      return map;

    } catch (error) {

      console.error(
        "[MAP] init error:",
        error
      );

      map = null;
      window.map = null;

      return null;
    }
  }

  // ==========================
  // NORMALIZE ROUTE
  // ==========================

  function normalizeRoute(
    route
  ) {

    if (
      !route ||
      !Array.isArray(
        route.coordinates
      )
    ) {

      return [];
    }

    return route.coordinates
      .map(point => {

        if (
          !Array.isArray(point) ||
          point.length < 2
        ) {
          return null;
        }

        // Backend GeoJSON:
        // [longitude, latitude]

        const lng =
          Number(point[0]);

        const lat =
          Number(point[1]);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return null;
        }

        // Leaflet:
        // [latitude, longitude]

        return [
          lat,
          lng
        ];
      })
      .filter(Boolean);
  }

  // ==========================
  // STOP CAR
  // ==========================

  function stopCarAnimation() {

    if (
      animationFrame !== null
    ) {

      cancelAnimationFrame(
        animationFrame
      );

      animationFrame = null;
    }
  }

  // ==========================
  // REMOVE CAR
  // ==========================

  function removeCar() {

    stopCarAnimation();

    if (
      carMarker &&
      isMapReady()
    ) {

      try {

        map.removeLayer(
          carMarker
        );

      } catch (error) {

        console.warn(
          "[MAP] remove car error:",
          error
        );
      }
    }

    carMarker = null;
  }

  // ==========================
  // CLEAR ROUTE
  // ==========================

  function clearRoute() {

    removeCar();

    if (
      routeLine &&
      isMapReady()
    ) {

      try {

        map.removeLayer(
          routeLine
        );

      } catch (error) {

        console.warn(
          "[MAP] remove route error:",
          error
        );
      }
    }

    routeLine = null;
  }

  // ==========================
  // CAR ANIMATION
  // ==========================

  function animateCar(
    coordinates
  ) {

    if (
      !isMapReady() ||
      !hasLeaflet() ||
      !Array.isArray(
        coordinates
      ) ||
      coordinates.length < 2
    ) {
      return;
    }

    removeCar();

    const carIcon =
      L.icon({
        iconUrl:
          "/images/auto.png",

        iconSize:
          [40, 40],

        iconAnchor:
          [20, 20]
      });

    try {

      carMarker =
        L.marker(
          coordinates[0],
          {
            icon:
              carIcon
          }
        )
        .addTo(map);

    } catch (error) {

      console.error(
        "[MAP] car marker error:",
        error
      );

      carMarker = null;

      return;
    }

    let position = 0;

    function move() {

      if (
        !carMarker ||
        position >=
          coordinates.length
      ) {

        animationFrame =
          null;

        return;
      }

      const point =
        coordinates[
          Math.floor(
            position
          )
        ];

      if (point) {

        try {

          carMarker.setLatLng(
            point
          );

        } catch (error) {

          console.warn(
            "[MAP] car move error:",
            error
          );

          animationFrame =
            null;

          return;
        }
      }

      position += 0.6;

      animationFrame =
        requestAnimationFrame(
          move
        );
    }

    move();
  }

  // ==========================
  // DRAW ROUTE
  // ==========================

  async function drawRoute(
    route
  ) {

    // Карта могла ещё не успеть
    // инициализироваться.
    if (!isMapReady()) {
      initMap();
    }

    let tries = 0;

    while (
      !isMapReady() &&
      tries < 20
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            150
          )
      );

      initMap();

      tries++;
    }

    if (!isMapReady()) {

      console.error(
        "[MAP] map unavailable"
      );

      return false;
    }

    const coordinates =
      normalizeRoute(
        route
      );

    if (
      coordinates.length < 2
    ) {

      console.error(
        "[MAP] invalid route:",
        route
      );

      return false;
    }

    // Старый маршрут
    // и машина удаляются.
    clearRoute();

    try {

      routeLine =
        L.polyline(
          coordinates,
          {
            color:
              "#2b7cff",

            weight:
              5
          }
        )
        .addTo(map);

      const bounds =
        routeLine.getBounds();

      if (
        bounds &&
        typeof bounds.isValid ===
          "function" &&
        bounds.isValid()
      ) {

        map.fitBounds(
          bounds,
          {
            padding:
              [40, 40]
          }
        );
      }

      invalidateMap(100);

      animateCar(
        coordinates
      );

      console.log(
        "[MAP] route drawn:",
        coordinates.length,
        "points"
      );

      return true;

    } catch (error) {

      console.error(
        "[MAP] draw route error:",
        error
      );

      clearRoute();

      return false;
    }
  }

  // ==========================
  // PUBLIC API
  // ==========================

  window.TransferMap = {
    init:
      initMap,

    drawRoute,

    clearRoute,

    invalidate:
      invalidateMap,

    getMap() {
      return map;
    }
  };

  // ==========================
  // LEGACY COMPATIBILITY
  // ==========================
  //
  // main.js сейчас вызывает:
  // window.initMap()
  //
  // Поэтому пока сохраняем
  // старое имя.
  // ==========================

  window.initMap =
    initMap;

  window.drawRoute =
    drawRoute;

})();