require("./env.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const tokens = require("../dist/services/tokens");
const { registerSchema } = require("../dist/validators/auth");
test("JWT: access y refresh válidos, distintos y con vencimiento UTC", () => {
  const access = tokens.createAccessToken(42),
    refresh = tokens.createRefreshToken(42);
  assert.equal(tokens.verifyAccess(access), 42);
  assert.equal(tokens.verifyRefresh(refresh), 42);
  assert.notEqual(refresh, tokens.createRefreshToken(42));
  assert.ok(
    Math.abs(
      tokens.refreshExpiry(refresh).getTime() - Date.now() - 7 * 86400000,
    ) < 1500,
  );
  assert.equal(tokens.hashToken(refresh).length, 64);
  assert.throws(() => tokens.verifyAccess(refresh));
  assert.throws(() => tokens.verifyRefresh(access));
});
test("JWT rechaza firma, algoritmo, audiencia, subject y vencimiento inválidos", () => {
  for (const opts of [
    { expiresIn: -1 },
    { subject: "0" },
    { subject: "9007199254740992" },
    { audience: "otra" },
    { algorithm: "HS384" },
  ]) {
    const value = jwt.sign({ role: "access" }, process.env.JWT_ACCESS_SECRET, {
      subject: "1",
      issuer: "stockflow",
      audience: "stockflow-mobile",
      expiresIn: 900,
      ...opts,
    });
    assert.throws(
      () => tokens.verifyAccess(value),
      (e) => e.status === 401,
    );
  }
  assert.throws(() => tokens.verifyAccess("basura"));
  const noExpiry = jwt.sign({ role: "access" }, process.env.JWT_ACCESS_SECRET, {
    subject: "1",
    issuer: "stockflow",
    audience: "stockflow-mobile",
  });
  assert.throws(() => tokens.verifyAccess(noExpiry));
});
test("registro normaliza email, rechaza roles e impide truncado bcrypt UTF-8", () => {
  const data = {
    nombre: "Ana",
    email: " ANA@EXAMPLE.COM ",
    password: "SeguraClave123",
  };
  assert.equal(registerSchema.parse(data).email, "ana@example.com");
  assert.throws(() => registerSchema.parse({ ...data, rol: "admin" }));
  assert.throws(() =>
    registerSchema.parse({ ...data, password: "Aa1" + "é".repeat(36) }),
  );
});
