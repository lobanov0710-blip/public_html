const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../js/form.js"),
  "utf8"
);

// Only evaluate the standalone validator; no DOM initialization or API POST.
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context, { filename: "js/form.js" });

const isValidPhone = (phone) =>
  vm.runInContext(
    "isValidTransferPhone(" + JSON.stringify(phone) + ")",
    context
  );

const valid = [
  "+7 (999) 123-45-67", "+79991234567",
  "8 (999) 123-45-67", "89991234567",
  "+7 831 412-34-56"
];

const invalid = [
  null, "", "9991234567", "9123456789", "79991234567",
  "+44 (20) 7123-4567", "+1 (415) 555-2671",
  "тел. +7 (999) 123-45-67", "++79991234567", "8999+1234567",
  "+7 999 123 45", "8 999 123 45", "+7 ((999)) 123-45-67",
  "+7 (999 123-45-67", "+7 () 999 123-45-67",
  "+70000000000", "80000000000", "81111111111",
  "+7;9991234567", "+7\n9991234567", "123456789012345"
];

for (const phone of valid) {
  assert.equal(isValidPhone(phone), true, "valid number: " + phone);
}

for (const phone of invalid) {
  assert.equal(isValidPhone(phone), false, "invalid number: " + phone);
}

assert.match(source, /if \(!isValidTransferPhone\(payload\.phone\)\)/);
console.log("Website phone validation tests passed.");
