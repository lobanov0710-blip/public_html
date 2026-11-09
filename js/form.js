const ORDERS_API =
  "/api/order.php";

/**
 * Matches the Worker requirement for new orders: a Russian phone with
 * an explicit +7 or 8 prefix and exactly eleven digits.
 * Formatting symbols are optional; this does not verify phone ownership.
 */
function isValidTransferPhone(value) {
  if (typeof value !== "string") return false;

  const source = value.trim();

  if (!source || source.length > 40 || !/^\+?[0-9 ()\-.]+$/.test(source)) {
    return false;
  }

  let digits = "";
  let opened = false;
  let inside = 0;

  for (const char of source) {
    if (char >= "0" && char <= "9") {
      digits += char;
      if (opened) inside++;
    } else if (char === "(") {
      if (opened) return false;
      opened = true;
      inside = 0;
    } else if (char === ")") {
      if (!opened || inside === 0) return false;
      opened = false;
    }
  }

  if (opened || digits.length !== 11) return false;
  if (!source.startsWith("+7") && !source.startsWith("8")) return false;
  if (digits[1] < "2") return false;

  const national = digits.slice(1);

  if (["0123456789", "1234567890", "9876543210"].includes(national)) {
    return false;
  }

  if (/^(\d)\1+$/.test(national)) return false;

  return true;
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

    if (!isValidTransferPhone(payload.phone)) {

      return (
        "Телефон должен начинаться с +7 или 8 и содержать 11 цифр"
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
            data?.error ||
            `Ошибка сервера (${response.status})`
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
