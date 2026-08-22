const API =
  "https://uber-v3.lobanov0710.workers.dev";

window.initCalculator = function () {

  // ==========================
  // DOUBLE INIT PROTECTION
  // ==========================

  if (window.__calcInitialized) {
    return;
  }

  window.__calcInitialized = true;
  window.__calcDebug = true;

  if (
    !("__lastRouteData" in window)
  ) {
    window.__lastRouteData = null;
  }

  function log(...args) {

    if (window.__calcDebug) {
      console.log(
        "[CALC]",
        ...args
      );
    }
  }

  // ==========================
  // DOM
  // ==========================

  const form =
    document.getElementById(
      "calcForm"
    );

  const result =
    document.getElementById(
      "result"
    );

  if (!form || !result) {

    console.error(
      "❌ calcForm/result not found"
    );

    return;
  }

  const fromInput =
    document.getElementById(
      "from"
    );

  const toInput =
    document.getElementById(
      "to"
    );

  const button =
    form.querySelector(
      'button[type="submit"]'
    ) ||
    form.querySelector(
      "button"
    );

  if (
    !fromInput ||
    !toInput ||
    !button
  ) {

    console.error(
      "❌ calculator fields/button not found"
    );

    return;
  }

  // ==========================
  // STATE
  // ==========================

  let selectedTariff =
    document.querySelector(
      ".tariff-card.active"
    )?.dataset?.tariff ||
    "comfort";

  selectedTariff =
    String(
      selectedTariff
    ).toLowerCase();

  let isLoading = false;

  // ==========================
  // HELPERS
  // ==========================

  function tariffLabel(
    tariff
  ) {

    const labels = {
      comfort:
        "Комфорт",

      business:
        "Бизнес",

      minivan:
        "Минивэн"
    };

    return (
      labels[
        String(
          tariff || ""
        ).toLowerCase()
      ] ||
      "Комфорт"
    );
  }

  function formatDuration(
    duration
  ) {

    const totalMinutes =
      Math.max(
        0,
        Math.round(
          Number(duration) || 0
        )
      );

    const hours =
      Math.floor(
        totalMinutes / 60
      );

    const minutes =
      totalMinutes % 60;

    if (
      hours > 0 &&
      minutes > 0
    ) {
      return (
        `${hours} ч ` +
        `${minutes} мин`
      );
    }

    if (hours > 0) {
      return `${hours} ч`;
    }

    return `${minutes} мин`;
  }

  function formatPrice(
    price
  ) {

    const value =
      Math.round(
        Number(price) || 0
      );

    return new Intl
      .NumberFormat(
        "ru-RU"
      )
      .format(value);
  }

  function setFieldValue(
    field,
    value
  ) {

    if (!field) {
      return;
    }

    field.value =
      String(value ?? "");

    field.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true
        }
      )
    );

    field.dispatchEvent(
      new Event(
        "change",
        {
          bubbles: true
        }
      )
    );
  }

  // ==========================
  // STORAGE
  // ==========================

  function saveBookingData(
    data
  ) {

    if (!data) {
      return;
    }

    // Полная версия доступна
    // в рамках текущей страницы.
    window.__lastRouteData =
      data;

    // В sessionStorage НЕ кладём
    // тысячи координат маршрута.
    // Для заявки они не нужны.
    try {

      sessionStorage.setItem(
        "transferBookingData",
        JSON.stringify({
          from:
            data.from,

          to:
            data.to,

          distance:
            data.distance,

          duration:
            data.duration,

          price:
            data.price,

          tariff:
            data.tariff
        })
      );

    } catch (error) {

      console.warn(
        "[CALC] storage error:",
        error
      );
    }
  }

  function getBookingData() {

    if (
      window.__lastRouteData &&
      window.__lastRouteData.from &&
      window.__lastRouteData.to
    ) {

      return (
        window.__lastRouteData
      );
    }

    // ==========================
    // MOBILE FALLBACK
    // ==========================

    try {

      const saved =
        sessionStorage.getItem(
          "transferBookingData"
        );

      if (!saved) {
        return null;
      }

      const data =
        JSON.parse(saved);

      if (
        data?.from &&
        data?.to
      ) {
        return data;
      }

    } catch (error) {

      console.warn(
        "[CALC] storage read error:",
        error
      );
    }

    return null;
  }

  function clearBookingData() {

    window.__lastRouteData =
      null;

    try {

      sessionStorage.removeItem(
        "transferBookingData"
      );

    } catch (error) {}
  }

  // Делаем доступным form.js
  window.clearTransferBookingData =
    clearBookingData;

  // ==========================
  // BOOKING FORM
  // ==========================

  function fillBookingForm() {

    const data =
      getBookingData();

    if (
      !data ||
      !data.from ||
      !data.to
    ) {

      console.warn(
        "⚠ no calculated route data"
      );

      return false;
    }

    const bookingForm =
      document.getElementById(
        "tgForm"
      );

    if (!bookingForm) {

      console.error(
        "❌ tgForm not found"
      );

      return false;
    }

    const routeField =
      bookingForm.querySelector(
        '[name="route"]'
      );

    if (!routeField) {

      console.error(
        "❌ route field not found"
      );

      return false;
    }

    // ==========================
    // ROUTE
    // ==========================

    const routeText =
      `${data.from} → ${data.to}`;

    setFieldValue(
      routeField,
      routeText
    );

    log(
      "✅ BOOKING FORM FILLED",
      {
        route:
          routeText,

        tariff:
          data.tariff,

        distance:
          data.distance,

        duration:
          data.duration,

        price:
          data.price
      }
    );

    // ==========================
    // SCROLL
    // ==========================

    bookingForm.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start"
    });

    // ==========================
    // FOCUS
    // ==========================

    setTimeout(
      () => {

        const nameField =
          bookingForm.querySelector(
            '[name="name"]'
          );

        const phoneField =
          bookingForm.querySelector(
            '[name="phone"]'
          );

        if (
          nameField &&
          !nameField.value.trim()
        ) {

          try {
            nameField.focus({
              preventScroll:
                true
            });
          } catch (error) {
            nameField.focus();
          }

          return;
        }

        if (
          phoneField &&
          !phoneField.value.trim()
        ) {

          try {
            phoneField.focus({
              preventScroll:
                true
            });
          } catch (error) {
            phoneField.focus();
          }
        }

      },
      500
    );

    return true;
  }

  // Доступно для диагностики
  window.fillTransferBookingForm =
    fillBookingForm;

  // ==========================
  // MAP HELPERS
  // ==========================

  function isLeafletMap(
    map
  ) {

    return (
      map &&
      typeof map.fitBounds ===
        "function"
    );
  }

  function getMap() {
    return (
      window.map ||
      null
    );
  }

  function waitMapReady(
    callback
  ) {

    let tries = 0;

    const timer =
      setInterval(
        () => {

          const map =
            getMap();

          if (
            isLeafletMap(map)
          ) {

            clearInterval(
              timer
            );

            try {

              map.invalidateSize(
                true
              );

            } catch (
              error
            ) {}

            log(
              "🗺 MAP READY"
            );

            callback(map);

            return;
          }

          tries++;

          if (
            tries > 60
          ) {

            clearInterval(
              timer
            );

            console.warn(
              "❌ MAP TIMEOUT OR NOT LEAFLET"
            );
          }

        },
        200
      );
  }

  function safeMapUpdate() {

    const map =
      getMap();

    if (
      !isLeafletMap(map)
    ) {
      return;
    }

    setTimeout(
      () => {

        try {

          map.invalidateSize(
            true
          );

        } catch (
          error
        ) {}

      },
      200
    );
  }

  // ==========================
  // CAR ANIMATION
  // ==========================

  function animateCar(
    latlngs
  ) {

    const map =
      getMap();

    if (
      !isLeafletMap(map) ||
      !Array.isArray(
        latlngs
      ) ||
      latlngs.length < 2
    ) {
      return;
    }

    if (
      window.__carMarker
    ) {

      try {

        map.removeLayer(
          window.__carMarker
        );

      } catch (
        error
      ) {}

      window.__carMarker =
        null;
    }

    if (
      window.__carAnimationFrame
    ) {

      cancelAnimationFrame(
        window
          .__carAnimationFrame
      );

      window
        .__carAnimationFrame =
        null;
    }

    if (
      typeof L ===
      "undefined"
    ) {

      console.warn(
        "⚠ Leaflet not available"
      );

      return;
    }

    const carIcon =
      L.icon({
        iconUrl:
          "/images/auto.png",

        iconSize:
          [40, 40],

        iconAnchor:
          [20, 20]
      });

    const marker =
      L.marker(
        latlngs[0],
        {
          icon:
            carIcon
        }
      )
      .addTo(map);

    window.__carMarker =
      marker;

    let i = 0;

    function step() {

      if (
        i >=
        latlngs.length
      ) {

        window
          .__carAnimationFrame =
          null;

        return;
      }

      const point =
        latlngs[
          Math.floor(i)
        ];

      if (point) {

        marker.setLatLng(
          point
        );
      }

      i += 0.6;

      window
        .__carAnimationFrame =
        requestAnimationFrame(
          step
        );
    }

    step();
  }

  // ==========================
  // DRAW ROUTE
  // ==========================

  function drawRoute(
    route
  ) {

    const map =
      getMap();

    if (
      !isLeafletMap(map)
    ) {

      console.warn(
        "⚠ map not ready"
      );

      return;
    }

    if (
      !route ||
      !Array.isArray(
        route.coordinates
      )
    ) {

      console.warn(
        "⚠ route missing coordinates",
        route
      );

      return;
    }

    if (
      route
        .coordinates
        .length < 2
    ) {

      console.warn(
        "⚠ EMPTY OR TOO SHORT ROUTE"
      );

      return;
    }

    const latlngs =
      route.coordinates
        .map(
          point => {

            if (
              !Array.isArray(
                point
              ) ||
              point.length < 2
            ) {
              return null;
            }

            const lng =
              Number(
                point[0]
              );

            const lat =
              Number(
                point[1]
              );

            if (
              !Number
                .isFinite(
                  lat
                ) ||
              !Number
                .isFinite(
                  lng
                )
            ) {

              return null;
            }

            return [
              lat,
              lng
            ];
          }
        )
        .filter(Boolean);

    if (
      latlngs.length < 2
    ) {

      console.warn(
        "⚠ INVALID COORDS OR TOO SHORT ROUTE"
      );

      return;
    }

    if (
      window.__routeLine
    ) {

      try {

        map.removeLayer(
          window.__routeLine
        );

      } catch (
        error
      ) {}

      window.__routeLine =
        null;
    }

    window.__routeLine =
      L.polyline(
        latlngs,
        {
          color:
            "#2b7cff",

          weight:
            5
        }
      )
      .addTo(map);

    try {

      const bounds =
        window
          .__routeLine
          .getBounds();

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
              [50, 50]
          }
        );
      }

    } catch (
      error
    ) {

      console.warn(
        "fitBounds error:",
        error
      );
    }

    animateCar(
      latlngs
    );
  }

  // ==========================
  // TARIFF
  // ==========================

  document
    .querySelectorAll(
      ".tariff-card"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".tariff-card"
              )
              .forEach(
                item => {

                  item
                    .classList
                    .remove(
                      "active"
                    );
                }
              );

            card
              .classList
              .add(
                "active"
              );

            selectedTariff =
              String(
                card.dataset
                  .tariff ||
                "comfort"
              )
              .toLowerCase();

            log(
              "🚕 TARIFF:",
              selectedTariff
            );
          }
        );
      }
    );

  // ==========================
  // CALCULATOR SUBMIT
  // ==========================

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      if (
        isLoading
      ) {
        return;
      }

      const from =
        fromInput
          .value
          .trim();

      const to =
        toInput
          .value
          .trim();

      if (
        !from ||
        !to
      ) {

        result.innerText =
          "Введите адреса";

        result
          .classList
          .add(
            "show"
          );

        return;
      }

      // ==========================
      // LOADING
      // ==========================

      isLoading = true;

      button.disabled =
        true;

      button.textContent =
        "⏳ считаем...";

      result.innerText =
        "⏳ расчёт...";

      result
        .classList
        .add(
          "show"
        );

      // Новый расчёт =
      // старые данные удаляем.
      clearBookingData();

      try {

        // ==========================
        // API
        // ==========================

        const response =
          await fetch(
            `${API}/calculate`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  from,
                  to,
                  tariff:
                    selectedTariff
                })
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => null
            );

        console.log(
          "ROUTE DATA:",
          data
        );

        if (
          !data ||
          !response.ok ||
          !data.ok
        ) {

          result.innerText =
            data?.error ||
            "Ошибка расчёта";

          return;
        }

        // ==========================
        // VALIDATE RESPONSE
        // ==========================

        const distance =
          Number(
            data.distance
          );

        const duration =
          Number(
            data.duration
          );

        const price =
          Number(
            data.price
          );

        if (
          !Number.isFinite(
            distance
          ) ||
          distance <= 0
        ) {

          result.innerText =
            "Маршрут не найден";

          return;
        }

        if (
          !Number.isFinite(
            duration
          ) ||
          duration < 0
        ) {

          result.innerText =
            "Некорректное время маршрута";

          return;
        }

        if (
          !Number.isFinite(
            price
          ) ||
          price < 0
        ) {

          result.innerText =
            "Некорректная стоимость";

          return;
        }

        // ==========================
        // SAVE RESULT
        // ==========================

        const routeData = {
          from,
          to,
          distance,
          duration,
          price,

          tariff:
            selectedTariff,

          route:
            data.route ||
            null
        };

        saveBookingData(
          routeData
        );

        log(
          "✅ CALCULATED:",
          routeData
        );

        // ==========================
        // RESULT UI
        // ==========================

        result.innerHTML = `
          🚗 ${distance.toFixed(1)} км<br>
          ⏱ ${formatDuration(duration)}<br>
          🚘 ${tariffLabel(selectedTariff)}<br>
          💰 <b>${formatPrice(price)} ₽</b><br><br>

          <button
            type="button"
            class="btn calc-book-btn"
          >
            🚖 Забронировать
          </button>
        `;

        result
          .classList
          .add(
            "show"
          );

        // ==========================
        // DIRECT BOOK BUTTON
        // ==========================

        const bookingButton =
          result.querySelector(
            ".calc-book-btn"
          );

        if (
          bookingButton
        ) {

          bookingButton
            .addEventListener(
              "click",
              event => {

                event.preventDefault();

                const success =
                  fillBookingForm();

                if (
                  !success
                ) {

                  alert(
                    "Сначала рассчитайте маршрут"
                  );
                }
              }
            );
        }

        // ==========================
        // MAP
        // ==========================

        safeMapUpdate();

        if (
          data.route &&
          Array.isArray(
            data.route
              .coordinates
          ) &&
          data.route
            .coordinates
            .length > 1
        ) {

          waitMapReady(
            () => {

              drawRoute(
                data.route
              );
            }
          );

        } else {

          console.warn(
            "⚠ no valid route received"
          );
        }

      } catch (
        error
      ) {

        console.error(
          "CALCULATOR ERROR:",
          error
        );

        result.innerText =
          "Ошибка сети";

      } finally {

        button.disabled =
          false;

        button.textContent =
          "Рассчитать";

        isLoading =
          false;
      }
    }
  );
};

// ==========================
// FALLBACK INIT
// ==========================
//
// main.js также вызывает
// initCalculator().
// Защита от двойной
// инициализации находится выше.
// ==========================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if (
      typeof window
        .initCalculator ===
      "function"
    ) {

      window
        .initCalculator();
    }
  }
);