const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/form.js"), "utf8");

function createFormFixture({ name = "Николай", phone = "+79991234567",
  route = "Нижний Новгород → Москва", date = "2099-12-31", consent = false } = {}) {
  const inputs = {
    name: { value: name },
    phone: { value: phone },
    route: { value: route },
    date: { value: date },
    comment: { value: "" }
  };
  const dateField = inputs.date;
  dateField.min = "";
  dateField.checkValidity = () => true;

  const btn = { disabled: true, textContent: "" };
  const consentField = { checked: consent };
  const fallback = { hidden: false };
  let submit = null;
  const messages = [];

  const form = {
    dataset: {},
    noValidate: false,
    elements: { namedItem: (name) => inputs[name] ?? null },
    querySelector: (selector) => ({
      'button[type="submit"]': btn,
      'input[type="date"][name="date"]': dateField,
      'input[type="checkbox"][required]': consentField,
      '[data-booking-fallback]': fallback
    })[selector] ?? null,
    addEventListener: (name, callback) => {
      if (name === "submit") submit = callback;
    }
  };

  const context = {
    window: {},
    document: { getElementById: (id) => id === "tgForm" ? form : null },
    sessionStorage: { getItem: () => null },
    alert: (message) => messages.push(message),
    fetch: () => { throw new Error("INVALID FORM MUST NEVER POST"); },
    console: { warn: () => {} }
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: "js/form.js" });
  context.window.initForm();

  return {
    form, messages, context,
    submit: async () => {
      assert.equal(typeof submit, "function");
      await submit({ preventDefault() {} });
      return messages.at(-1);
    }
  };
}

(async () => {
  for (const [input, message] of [
    [{ name: "" }, "Введите имя"],
    [{ phone: "" }, "Введите телефон"],
    [{ phone: "123" }, "Проверьте номер телефона"],
    [{ date: "" }, "Выберите дату поездки"],
    [{ date: "2020-01-01" }, "Дата поездки не может быть в прошлом"],
    [{ consent: false }, "Подтвердите согласие на обработку персональных данных"]
  ]) {
    const fixture = createFormFixture(input);
    assert.equal(fixture.form.noValidate, true, "browser-native English tooltips must be off");
    assert.equal(await fixture.submit(), message);
  }

  for (const [code, translated] of [
    ["invalid phone", "Укажите номер телефона с +7 или 8 (всего 11 цифр)."],
    ["invalid date", "Проверьте дату поездки. Прошедшие даты недоступны."],
    ["missing route", "Укажите маршрут поездки."],
    ["quote already used", "По этому расчёту заявка уже оформлена. Свяжитесь с нами, чтобы уточнить её статус."]
  ]) {
    const fixture = createFormFixture();
    const actual = vm.runInContext(
      "bookingErrorInRussian(" + JSON.stringify(code) + ", 400)",
      fixture.context
    );
    assert.equal(actual, translated);
  }

  const fixture = createFormFixture();
  assert.equal(
    vm.runInContext('bookingErrorInRussian("unknown english server error", 500)', fixture.context),
    "Сервер временно недоступен. Попробуйте позже."
  );

  console.log("Russian booking notifications and consent validation: OK");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
