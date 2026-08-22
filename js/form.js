const ORDERS_API =
  "https://uber-v3.lobanov0710.workers.dev/orders";

window.initForm = function () {

  // =========================
  // FORM
  // =========================

  const form =
    document.getElementById(
      "tgForm"
    );

  if (!form) {
    return;
  }

  // Защита от двойной
  // инициализации.
  if (
    form.dataset
      .initialized ===
    "true"
  ) {
    return;
  }

  form.dataset.initialized =
    "true";

  const btn =
    form.querySelector(
      'button[type="submit"]'
    );

  let loading =
    false;

  // =========================
  // HELPERS
  // =========================

  function getField(
    name
  ) {

    return (
      form.elements
        ?.namedItem(
          name
        ) ||

      form.querySelector(
        `[name="${name}"]`
      )
    );
  }

  function getValue(
    name
  ) {

    const field =
      getField(name);

    if (!field) {
      return "";
    }

    return String(
      field.value || ""
    ).trim();
  }

  function normalizeRoute(
    value
  ) {

    return String(
      value || ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .toLowerCase();
  }

  // =========================
  // CALCULATOR DATA
  // =========================

  function getCalculatorData() {

    if (
      window.__lastRouteData &&
      window.__lastRouteData.from &&
      window.__lastRouteData.to
    ) {

      return (
        window.__lastRouteData
      );
    }

    // Mobile fallback
    try {

      const saved =
        sessionStorage
          .getItem(
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
        "[ORDER] storage error:",
        error
      );
    }

    return null;
  }

  function clearCalculatorData() {

    if (
      typeof window
        .clearTransferBookingData ===
      "function"
    ) {

      window
        .clearTransferBookingData();

      return;
    }

    window.__lastRouteData =
      null;

    try {

      sessionStorage
        .removeItem(
          "transferBookingData"
        );

    } catch (
      error
    ) {}
  }

  // =========================
  // BUTTON
  // =========================

  function resetButton() {

    loading =
      false;

    if (!btn) {
      return;
    }

    btn.disabled =
      false;

    btn.textContent =
      "📩 Отправить заявку";
  }

  function setLoading() {

    loading =
      true;

    if (!btn) {
      return;
    }

    btn.disabled =
      true;

    btn.textContent =
      "⏳ Отправка...";
  }

  function setSuccess() {

    if (!btn) {
      return;
    }

    btn.disabled =
      true;

    btn.textContent =
      "✅ Заявка отправлена";
  }

  // =========================
  // PAYLOAD
  // =========================

  function buildOrderPayload() {

    const name =
      getValue(
        "name"
      );

    const phone =
      getValue(
        "phone"
      );

    const route =
      getValue(
        "route"
      );

    const date =
      getValue(
        "date"
      );

    const comment =
      getValue(
        "comment"
      );

    const payload = {
      name,
      phone,
      route,
      date,
      comment
    };

    // =========================
    // ADD CALCULATOR DATA
    // =========================

    const calc =
      getCalculatorData();

    if (
      !calc ||
      !calc.from ||
      !calc.to
    ) {

      return payload;
    }

    const expectedRoute =
      normalizeRoute(
        `${calc.from} → ${calc.to}`
      );

    const currentRoute =
      normalizeRoute(
        route
      );

    // Если клиент вручную
    // изменил маршрут,
    // не отправляем старую цену.
    if (
      currentRoute !==
      expectedRoute
    ) {

      console.warn(
        "[ORDER] route changed manually, calculator data ignored"
      );

      return payload;
    }

    payload.from =
      String(
        calc.from
      );

    payload.to =
      String(
        calc.to
      );

    payload.tariff =
      String(
        calc.tariff ||
        "comfort"
      );

    const distance =
      Number(
        calc.distance
      );

    const duration =
      Number(
        calc.duration
      );

    const price =
      Number(
        calc.price
      );

    if (
      Number.isFinite(
        distance
      ) &&
      distance > 0
    ) {

      payload.distance =
        distance;
    }

    if (
      Number.isFinite(
        duration
      ) &&
      duration >= 0
    ) {

      payload.duration =
        duration;
    }

    if (
      Number.isFinite(
        price
      ) &&
      price >= 0
    ) {

      payload.price =
        price;
    }

    return payload;
  }

  // =========================
  // VALIDATION
  // =========================

  function validate(
    payload
  ) {

    if (
      !payload.name
    ) {
      return (
        "Введите имя"
      );
    }

    if (
      !payload.phone
    ) {
      return (
        "Введите телефон"
      );
    }

    const phoneDigits =
      payload.phone
        .replace(
          /\D/g,
          ""
        );

    if (
      phoneDigits.length <
        10 ||
      phoneDigits.length >
        15
    ) {

      return (
        "Проверьте номер телефона"
      );
    }

    if (
      !payload.route
    ) {

      return (
        "Введите маршрут"
      );
    }

    if (
      !payload.date
    ) {

      return (
        "Выберите дату поездки"
      );
    }

    return null;
  }

  // =========================
  // SUBMIT
  // =========================

  form.addEventListener(
    "submit",
    async event => {

      event
        .preventDefault();

      if (
        loading
      ) {
        return;
      }

      const payload =
        buildOrderPayload();

      const validationError =
        validate(
          payload
        );

      if (
        validationError
      ) {

        alert(
          validationError
        );

        return;
      }

      setLoading();

      try {

        console.log(
          "[ORDER] SEND:",
          payload
        );

        const response =
          await fetch(
            ORDERS_API,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  payload
                )
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => null
            );

        console.log(
          "[ORDER] RESPONSE:",
          {
            status:
              response.status,

            data
          }
        );

        // =========================
        // ERROR
        // =========================

        if (
          !response.ok ||
          !data ||
          data.ok !== true
        ) {

          const message =
            data?.error ||
            `Ошибка сервера (${response.status})`;

          throw new Error(
            message
          );
        }

        // =========================
        // SUCCESS
        // =========================

        console.log(
          "[ORDER] CREATED:",
          data.order
        );

        setSuccess();

        // Очистка формы
        form.reset();

        // Очистка старого
        // расчёта.
        clearCalculatorData();

        setTimeout(
          resetButton,
          2500
        );

      } catch (
        error
      ) {

        console.error(
          "[ORDER] ERROR:",
          error
        );

        alert(
          error?.message ||
          "Ошибка отправки заявки"
        );

        resetButton();
      }
    }
  );
};