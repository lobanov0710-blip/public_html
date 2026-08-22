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

  if (
    form.dataset.initialized ===
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
      getField(
        name
      );

    if (!field) {
      return "";
    }

    return String(
      field.value || ""
    )
      .trim();
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
  // QUOTE DATA
  // =========================

  function getQuoteData() {

    if (
      window.__lastRouteData &&
      window.__lastRouteData.quoteId &&
      window.__lastRouteData.from &&
      window.__lastRouteData.to
    ) {

      return (
        window.__lastRouteData
      );
    }

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
        data?.quoteId &&
        data?.from &&
        data?.to
      ) {

        return data;
      }

    } catch (
      error
    ) {

      console.warn(
        "[ORDER] quote storage error:",
        error
      );
    }

    return null;
  }

  function clearQuoteData() {

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

      sessionStorage.removeItem(
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

    // Базовые пользовательские
    // данные.
    const payload = {
      name,
      phone,
      route,
      date,
      comment
    };

    // =========================
    // SERVER QUOTE
    // =========================

    const quote =
      getQuoteData();

    if (
      !quote ||
      !quote.quoteId
    ) {

      // Ручная заявка.
      // Backend примет её
      // без серверной цены.
      return payload;
    }

    // =========================
    // EXPIRED
    // =========================

    if (
      quote.quoteExpiresAt &&
      Number(
        quote.quoteExpiresAt
      ) <= Date.now()
    ) {

      clearQuoteData();

      throw new Error(
        "Расчёт стоимости устарел. Рассчитайте маршрут заново."
      );
    }

    // =========================
    // ROUTE CHECK
    // =========================

    const expectedRoute =
      normalizeRoute(
        `${quote.from} → ${quote.to}`
      );

    const currentRoute =
      normalizeRoute(
        route
      );

    // Если клиент вручную
    // изменил маршрут после расчёта,
    // старый quoteId не используем.
    if (
      currentRoute !==
      expectedRoute
    ) {

      console.warn(
        "[ORDER] route changed manually — quote ignored"
      );

      return payload;
    }

    // =========================
    // IMPORTANT
    // =========================
    //
    // В /orders отправляем только
    // серверный quoteId.
    //
    // НЕ отправляем:
    //
    // price
    // distance
    // duration
    // tariff
    // from
    // to
    //
    // =========================

    payload.quoteId =
      String(
        quote.quoteId
      );

    return payload;
  }

  // =========================
  // VALIDATION
  // =========================

  function validate(
    payload
  ) {

    if (!payload.name) {

      return (
        "Введите имя"
      );
    }

    if (!payload.phone) {

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
      phoneDigits.length < 10 ||
      phoneDigits.length > 15
    ) {

      return (
        "Проверьте номер телефона"
      );
    }

    if (!payload.route) {

      return (
        "Введите маршрут"
      );
    }

    if (!payload.date) {

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

      event.preventDefault();

      if (loading) {
        return;
      }

      let payload;

      try {

        payload =
          buildOrderPayload();

      } catch (
        error
      ) {

        alert(
          error?.message ||
          "Ошибка данных расчёта"
        );

        return;
      }

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

          if (
            response.status ===
              409 ||
            data?.error ===
              "quote expired or not found"
          ) {

            clearQuoteData();

            throw new Error(
              "Расчёт стоимости устарел. Рассчитайте маршрут заново."
            );
          }

          throw new Error(
            data?.error ||
            `Ошибка сервера (${response.status})`
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

        form.reset();

        clearQuoteData();

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