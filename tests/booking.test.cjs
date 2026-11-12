const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const now = Date.parse("2026-11-12T21:30:00Z");
const route = { from: "Нижний Новгород", to: "Москва" };
const quote = { ...route, quoteId: "local-quote", quoteExpiresAt: now + 60000 };
const success = { ok: true, order: { id: "local-order" } };

class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
}

function run(file, elements, fetch, initialQuote) {
  const alerts = [];
  const stored = new Map();
  const window = { __lastRouteData: initialQuote };
  const context = {
    window, fetch, Date: FixedDate, AbortController, setTimeout: () => 1, clearTimeout() {},
    sessionStorage: {
      getItem: key => stored.get(key),
      setItem: (key, value) => stored.set(key, value),
      removeItem: key => stored.delete(key)
    },
    document: { getElementById: id => elements[id], addEventListener() {} },
    alert: message => alerts.push(message)
  };
  vm.runInNewContext(readFileSync(join(__dirname, "../js", file), "utf8"), context);
  return { window, alerts };
}

function booking({ phone = "+7 (831) 412-34-56", date = "2026-11-13",
  consent = true, savedQuote, status = 201, body = success } = {}) {
  const fields = Object.fromEntries(Object.entries({
    name: "Тест", phone, route: `${route.from} → ${route.to}`, date, comment: ""
  }).map(([key, value]) => [key, { value }]));
  fields.date.checkValidity = () => fields.date.value >= fields.date.min;
  const button = { disabled: true };
  const fallback = {};
  const posts = [];
  let handler;
  let reset = false;
  const form = {
    dataset: {},
    elements: { namedItem: name => fields[name] },
    querySelector: selector => ({
      'button[type="submit"]': button,
      'input[type="date"][name="date"]': fields.date,
      'input[type="checkbox"][required]': { checked: consent },
      "[data-booking-fallback]": fallback
    })[selector],
    addEventListener: (_, fn) => { handler = fn; },
    checkValidity: () => consent && fields.date.checkValidity(),
    reset: () => { reset = true; }
  };
  const app = run("form.js", { tgForm: form }, async (url, request) => {
    assert.equal(url, "/api/order.php");
    assert.equal(request.method, "POST");
    posts.push(JSON.parse(request.body));
    return { status, ok: status < 400, json: async () => JSON.parse(body === null ? "" : JSON.stringify(body)) };
  }, savedQuote);
  app.window.initForm();
  return { ...app, button, date: fields.date, form, posts, reset: () => reset,
    submit: () => handler({ preventDefault() {} }) };
}

test("the booking date uses Moscow midnight", async () => {
  const app = booking({ date: "2026-11-12" });
  assert.equal(app.date.min, "2026-11-13");
  await app.submit();
  assert.equal(app.posts.length, 0);
  assert.match(app.alerts[0], /в прошлом/);
});

test("phone validation and mandatory consent gate every POST", async () => {
  for (const options of [{ phone: "8314123456" }, { phone: "+44 20 7123 4567" },
    { phone: "+7 (831 412-34-56" }, { consent: false }]) {
    const app = booking(options);
    await app.submit();
    assert.equal(app.posts.length, 0);
    assert.match(app.alerts[0], options.consent === false ? /согласие/ : /11 цифр/);
  }
  for (const phone of ["+7 (831) 412-34-56", "8 (831) 412-34-56"]) {
    const app = booking({ phone });
    assert.equal(app.form.noValidate, true);
    await app.submit();
    assert.equal(app.posts.length, 1);
    assert.equal(app.reset(), true);
  }
});

test("an existing order conflict preserves the calculation on retry", async () => {
  const app = booking({ savedQuote: quote, status: 409, body: { ok: false, error: "quote already used" } });
  await app.submit();
  assert.match(app.alerts[0], /уже оформлена/);
  await app.submit();
  assert.equal(app.posts.length, 2);
  assert.ok(app.posts.every(post => post.quoteId === quote.quoteId));
  assert.equal(app.reset(), false);
});

test("an expired calculation never turns into a manual submission on a second click", async () => {
  const app = booking({ savedQuote: { ...quote, quoteExpiresAt: now - 1 } });
  await app.submit();
  await app.submit();
  assert.equal(app.posts.length, 0);
  assert.equal(app.alerts.length, 2);
  assert.ok(app.alerts.every(message => /устарел/.test(message)));
});

test("a lost confirmation keeps entered data; a valid receipt confirms the order", async () => {
  for (const [status, body] of [[502, { ok: false, error: "invalid upstream response" }], [200, null], [201, { ok: true }]]) {
    const app = booking({ status, body, savedQuote: quote });
    await app.submit();
    assert.match(app.alerts[0], /Заявка могла быть принята/);
    assert.equal(app.reset(), false);
    assert.equal(app.window.__lastRouteData, quote);
    assert.equal(app.posts.length, 1);
  }
  const app = booking({ savedQuote: quote });
  await app.submit();
  assert.equal(app.reset(), true);
  assert.equal(app.posts[0].quoteId, quote.quoteId);
  assert.ok(["price", "distance", "tariff", "duration"].every(key => !(key in app.posts[0])));
});

test("Worker validation replies are shown in Russian", async () => {
  const app = booking({ status: 400, body: { ok: false, error: "invalid phone" } });
  await app.submit();
  assert.match(app.alerts[0], /11 цифр/);
  assert.equal(app.reset(), false);
});

test("changing an address invalidates both saved and in-flight calculations", async () => {
  for (const delayed of [false, true]) {
    const handlers = {};
    const input = (name, value) => ({ value, addEventListener: (_, fn) => { handlers[name] = fn; } });
    const from = input("from", route.from);
    const to = input("to", route.to);
    const button = {};
    const result = { querySelector: () => null, classList: { add() {} } };
    const form = {
      querySelector: selector => selector === 'button[type="submit"]' ? button : null,
      querySelectorAll: () => [],
      addEventListener: (_, fn) => { handlers.submit = fn; }
    };
    let reply;
    const request = new Promise(resolve => { reply = resolve; });
    const app = run("calculator.js", { calcForm: form, result, from, to }, () => request);
    app.window.initCalculator();
    const submitted = handlers.submit({ preventDefault() {} });
    const respond = () => reply({ ok: true, json: async () => ({ ...quote, ok: true, distance: 436.8, duration: 327, price: 24024 }) });
    if (!delayed) {
      respond();
      await submitted;
      assert.equal(app.window.__lastRouteData.quoteId, quote.quoteId);
    }
    to.value = "Казань";
    handlers.to?.();
    if (delayed) {
      respond();
      await submitted;
    }
    assert.equal(app.window.__lastRouteData, null);
    assert.match(result.innerText, /Маршрут изменён/);
  }
});
