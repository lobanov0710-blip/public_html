const API =
  "https://uber-v3.lobanov0710.workers.dev";

window.initCalculator = function () {

  // ==========================
  // DOUBLE INIT PROTECTION
  // ==========================

  if (window.__calcInitialized) {
    return;
  }

  window.__calcInitialized =
    true;

  window.__calcDebug =
    true;

  if (
    !("__lastRouteData" in window)
  ) {
    window.__lastRouteData =
      null;
  }

  // ==========================
  // LOGGER
  // ==========================

  function log(...args) {

    if (
      window.__calcDebug
    ) {

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

  if (
    !form ||
    !result
  ) {

    console.error(
      "[CALC] calcForm/result not found"
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
      "[CALC] fields/button not found"
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

  let isLoading =
    false;

  // ==========================
  // FORMATTERS
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

    const key =
      String(
        tariff || ""
      )
      .trim()
      .toLowerCase();

    return (
      labels[key] ||
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

    if (
      hours > 0
    ) {

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

    return (
      new Intl.NumberFormat(
        "ru-RU"
      )
      .format(value)
    );
  }

  // ==========================
  // FORM FIELD
  // ==========================

  function setFieldValue(
    field,
    value
  ) {

    if (!field) {
      return;
    }

    field.value =
      String(
        value ?? ""
      );

    field.dispatchEvent(
      new Event(
        "input",
        {
          bubbles:
            true
        }
      )
    );

    field.dispatchEvent(
      new Event(
        "change",
        {
          bubbles:
            true
        }
      )
    );
  }

  // ==========================
  // BOOKING STORAGE
  // ==========================

  function saveBookingData(
    data
  ) {

    if (!data) {
      return;
    }

    // Полная версия,
    // включая route GeoJSON.
    window.__lastRouteData =
      data;

    // В sessionStorage
    // координаты маршрута
    // не сохраняем.
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

    } catch (
      error
    ) {

      console.warn(
        "[CALC] storage save error:",
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
        JSON.parse(
          saved
        );

      if (
        data?.from &&
        data?.to
      ) {

        return data;
      }

    } catch (
      error
    ) {

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

    } catch (
      error
    ) {}
  }

  // form.js может использовать
  // эту функцию после успешного заказа.
  window.clearTransferBookingData =
    clearBookingData;

  // ==========================
  // FILL BOOKING FORM
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
        "[CALC] no booking data"
      );

      return false;
    }

    const bookingForm =
      document.getElementById(
        "tgForm"
      );

    if (!bookingForm) {

      console.error(
        "[CALC] tgForm not found"
      );

      return false;
    }

    const routeField =
      bookingForm.querySelector(
        '[name="route"]'
      );

    if (!routeField) {

      console.error(
        "[CALC] route field not found"
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
      "BOOKING FORM FILLED",
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

          } catch (
            error
          ) {

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

          } catch (
            error
          ) {

            phoneField.focus();
          }
        }

      },
      500
    );

    return true;
  }

  window.fillTransferBookingForm =
    fillBookingForm;

  // ==========================
  // MAP
  // ==========================

  async function showRouteOnMap(
    route
  ) {

    if (
      !route ||
      !Array.isArray(
        route.coordinates
      ) ||
      route.coordinates.length < 2
    ) {

      console.warn(
        "[CALC] route geometry missing"
      );

      return;
    }

    if (
      !window.TransferMap ||
      typeof window
        .TransferMap
        .drawRoute !==
        "function"
    ) {

      console.warn(
        "[CALC] TransferMap not available"
      );

      return;
    }

    try {

      const success =
        await window
          .TransferMap
          .drawRoute(
            route
          );

      if (
        success
      ) {

        log(
          "MAP ROUTE DISPLAYED"
        );

      } else {

        console.warn(
          "[CALC] map rejected route"
        );
      }

    } catch (
      error
    ) {

      console.error(
        "[CALC] map error:",
        error
      );
    }
  }

  // ==========================
  // TARIFF SELECTION
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
              .trim()
              .toLowerCase();

            log(
              "TARIFF:",
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

      // ==========================
      // INPUT
      // ==========================

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

      isLoading =
        true;

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

      // Новый расчёт:
      // старые данные заказа
      // больше не используются.
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

        log(
          "API RESPONSE:",
          data
        );

        if (
          !response.ok ||
          !data ||
          data.ok !== true
        ) {

          result.innerText =
            data?.error ||
            "Ошибка расчёта";

          return;
        }

        // ==========================
        // RESPONSE DATA
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

        // ==========================
        // VALIDATION
        // ==========================

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
        // STORE RESULT
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
          "CALCULATED:",
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
        // BOOK BUTTON
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

        if (
          data.route
        ) {

          await showRouteOnMap(
            data.route
          );
        }

      } catch (
        error
      ) {

        console.error(
          "[CALC] ERROR:",
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