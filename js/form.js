const ORDERS_API =
  "https://uber-v3.lobanov0710.workers.dev/orders";

window.initForm = function () {

  // =========================
  // FORM
  // =========================

  const form =
    document.getElementById("tgForm");

  if (!form) {
    return;
  }

  // Защита от двойной инициализации
  if (form.dataset.initialized === "true") {
    return;
  }

  form.dataset.initialized = "true";

  const btn =
    form.querySelector(
      'button[type="submit"]'
    );

  let loading = false;

  // =========================
  // HELPERS
  // =========================

  function getField(name) {
    return (
      form.elements?.namedItem(name) ||
      form.querySelector(
        `[name="${name}"]`
      )
    );
  }

  function getValue(name) {
    const field =
      getField(name);

    if (!field) {
      return "";
    }

    return String(
      field.value || ""
    ).trim();
  }

  function normalizeRoute(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function resetButton() {

    loading = false;

    if (!btn) {
      return;
    }

    btn.disabled = false;
    btn.textContent =
      "📩 Отправить заявку";
  }

  function setLoading() {

    loading = true;

    if (!btn) {
      return;
    }

    btn.disabled = true;
    btn.textContent =
      "⏳ Отправка...";
  }

  function setSuccess() {

    if (!btn) {
      return;
    }

    btn.disabled = true;
    btn.textContent =
      "✅ Заявка отправлена";
  }

  // =========================
  // BUILD ORDER
  // =========================

  function buildOrderPayload() {

    const name =
      getValue("name");

    const phone =
      getValue("phone");

    const route =
      getValue("route");

    const date =
      getValue("date");

    const comment =
      getValue("comment");

    const payload = {
      name,
      phone,
      route,
      date,
      comment
    };

    // =========================
    // CALCULATOR DATA
    // =========================
    //
    // Добавляем цену/расстояние/тариф
    // только если текущий маршрут формы
    // совпадает с последним расчётом.
    //
    // Если пользователь вручную изменил
    // маршрут после расчёта — старую цену
    // не отправляем.
    // =========================

    const calc =
      window.__lastRouteData;

    if (
      calc &&
      calc.from &&
      calc.to
    ) {

      const calculatedRoute =
        `${calc.from} → ${calc.to}`;

      const currentRoute =
        normalizeRoute(route);

      const expectedRoute =
        normalizeRoute(
          calculatedRoute
        );

      if (
        currentRoute ===
        expectedRoute
      ) {

        payload.from =
          String(calc.from);

        payload.to =
          String(calc.to);

        payload.tariff =
          String(
            calc.tariff ||
            "comfort"
          );

        const distance =
          Number(calc.distance);

        const duration =
          Number(calc.duration);

        const price =
          Number(calc.price);

        if (
          Number.isFinite(distance) &&
          distance > 0
        ) {
          payload.distance =
            distance;
        }

        if (
          Number.isFinite(duration) &&
          duration >= 0
        ) {
          payload.duration =
            duration;
        }

        if (
          Number.isFinite(price) &&
          price >= 0
        ) {
          payload.price =
            price;
        }
      }
    }

    return payload;
  }

  // =========================
  // VALIDATION
  // =========================

  function validate(payload) {

    if (!payload.name) {
      return "Введите имя";
    }

    if (!payload.phone) {
      return "Введите телефон";
    }

    const phoneDigits =
      payload.phone.replace(
        /\D/g,
        ""
      );

    if (
      phoneDigits.length < 10 ||
      phoneDigits.length > 15
    ) {
      return "Проверьте номер телефона";
    }

    if (!payload.route) {
      return "Введите маршрут";
    }

    if (!payload.date) {
      return "Выберите дату поездки";
    }

    return null;
  }

  // =========================
  // SUBMIT
  // =========================

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      if (loading) {
        return;
      }

      const payload =
        buildOrderPayload();

      const validationError =
        validate(payload);

      if (validationError) {

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
              method: "POST",

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
        // SERVER ERROR
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

        setSuccess();

        console.log(
          "[ORDER] CREATED:",
          data.order
        );

        form.reset();

        // Предыдущий расчёт больше
        // не должен автоматически
        // попасть в новую заявку.
        window.__lastRouteData =
          null;

        setTimeout(
          resetButton,
          2500
        );

      } catch (error) {

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