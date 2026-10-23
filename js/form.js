const ORDERS_API =
  "/api/order.php";

// Translate API errors before they reach the customer. The Worker response
// contract remains unchanged; no backend changes are needed.
function bookingErrorInRussian(error, status) {
  const code = String(error || "").trim().toLowerCase();

  const messages = {
    "invalid phone": "Укажите номер телефона с +7 или 8 (всего 11 цифр).",
    "invalid date": "Проверьте дату поездки. Прошедшие даты недоступны.",
    "missing name": "Введите имя.",
    "missing route": "Укажите маршрут поездки.",
    "invalid quoteid": "Расчёт маршрута недействителен. Рассчитайте стоимость заново.",
    "invalid quote route": "Проверьте маршрут и рассчитайте стоимость заново.",
    "invalid quote tariff": "Выберите тариф и рассчитайте стоимость заново.",
    "quote already used": "По этому расчёту заявка уже оформлена. Свяжитесь с нами, чтобы уточнить её статус.",
    "quote expired or not found": "Расчёт стоимости устарел. Рассчитайте маршрут заново.",
    "invalid order data": "Проверьте данные заявки.",
    "invalid json": "Ошибка формата заявки.",
    "rate limited": "Слишком много запросов. Попробуйте позже.",
    "request too large": "Слишком большой объём данных заявки."
  };

  if (Object.prototype.hasOwnProperty.call(messages, code)) {
    return messages[code];
  }

  if (status === 429) {
    return "Слишком много запросов. Попробуйте позже.";
  }

  if (status >= 500) {
    return "Сервер временно недоступен. Попробуйте позже.";
  }

  return "Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.";
}

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

  const btn =
    form.querySelector(
      'button[type="submit"]'
    );

  if (!btn) {
    return;
  }

  // Native browser validation messages follow the browser UI language,
  // not <html lang="ru">. Use our Russian messages instead.
  form.noValidate = true;

  const dateField =
    form.querySelector(
      'input[type="date"][name="date"]'
    );

  function updateDateMinimum() {

    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        today.getDate()
      ).padStart(
        2,
        "0"
      );

    const todayValue =
      `${year}-${month}-${day}`;

    if (
      dateField &&
      (
        !dateField.min ||
        dateField.min < todayValue
      )
    ) {

      dateField.min =
        todayValue;
    }

    return todayValue;
  }

  updateDateMinimum();

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

    const today =
      updateDateMinimum();

    if (payload.date < today) {

      return (
        "Дата поездки не может быть в прошлом"
      );
    }

    if (
      dateField &&
      !dateField.checkValidity()
    ) {

      return (
        "Проверьте дату поездки"
      );
    }

    // HTML5 previously prevented submit if the consent checkbox was not
    // checked. Keep that protection when native validation is disabled.
    const consentField = form.querySelector('input[type="checkbox"][required]');

    if (consentField && !consentField.checked) {
      return "Подтвердите согласие на обработку персональных данных";
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

      // The PHP upstream timeout is 25 seconds; allow time for the host as well.
      const requestController = new AbortController();
      const timeoutId = setTimeout(
        () => requestController.abort(),
        35000
      );

      try {

        const response =
          await fetch(
            ORDERS_API,
            {
              method:
                "POST",

              signal: requestController.signal,

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
              error => {
                if (requestController.signal.aborted) {
                  throw error;
                }
                return null;
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
            bookingErrorInRussian(data?.error, response.status)
          );
        }

        // =========================
        // SUCCESS
        // =========================

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

        const confirmationMissing =
          requestController.signal.aborted ||
          error instanceof TypeError;

        alert(
          confirmationMissing
            ? "Не удалось получить подтверждение отправки. Заявка могла быть принята. Свяжитесь с нами перед повторной отправкой."
            : error?.message || "Ошибка отправки заявки"
        );

        resetButton();

      } finally {

        clearTimeout(timeoutId);
      }
    }
  );

  // Enable submission only after the handler is installed.
  form.dataset.initialized =
    "true";

  btn.disabled =
    false;

  const fallback =
    form.querySelector(
      "[data-booking-fallback]"
    );

  if (fallback) {
    fallback.hidden =
      true;
  }
};
