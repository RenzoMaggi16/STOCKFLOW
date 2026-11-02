require("./env.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../dist/config/env");
const { sendCode, requireMail } = require("../dist/services/mail.service");

test("Brevo HTTPS: verificación, recuperación, rechazo y timeout", async (t) => {
  assert.throws(requireMail, (e) => e.code === "MAIL_NOT_CONFIGURED");
  env.BREVO_API_KEY = "test-key";
  env.SMTP_FROM = "StockFlow <verified@example.com>";
  const calls = [];
  t.mock.method(global, "fetch", async (url, options) => {
    calls.push({ url, ...options, body: JSON.parse(options.body) });
    return Response.json({ messageId: "test-message" }, { status: 201 });
  });
  await sendCode("recipient@example.com", "123456", "email");
  await sendCode("recipient@example.com", "654321", "reset");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(calls[0].headers["api-key"], "test-key");
  assert.deepEqual(calls[0].body.sender, { name: "StockFlow", email: "verified@example.com" });
  assert.deepEqual(calls[0].body.to, [{ email: "recipient@example.com" }]);
  assert.match(calls[0].body.subject, /verificar/);
  assert.match(calls[0].body.textContent, /123456/);
  assert.match(calls[1].body.subject, /restablecer/);
  assert.match(calls[1].body.textContent, /654321/);
  global.fetch.mock.mockImplementation(async () => new Response("private provider error", { status: 401 }));
  await assert.rejects(sendCode("recipient@example.com", "123456", "email"), (e) => e.code === "MAIL_UNAVAILABLE" && !e.message.includes("private"));
  global.fetch.mock.mockImplementation(async () => { throw new DOMException("Timed out", "TimeoutError"); });
  await assert.rejects(sendCode("recipient@example.com", "123456", "reset"), (e) => e.code === "MAIL_UNAVAILABLE");
});
