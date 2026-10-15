import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createSession, type Tokens } from "../src/services/session";
test("sesión: una renovación concurrente, persistencia, 401 definitivo y logout", async () => {
  let refreshes = 0,
    revoked = false,
    stored: Tokens | null = { accessToken: "old", refreshToken: "refresh" };
  let lost = 0;
  const server = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/auth/refresh") {
      refreshes++;
      setTimeout(() => {
        res.statusCode = revoked ? 401 : 200;
        res.end(
          JSON.stringify(
            revoked
              ? { error: { message: "Revocado" } }
              : { data: { accessToken: "new", refreshToken: "rotated" } },
          ),
        );
      }, 30);
      return;
    }
    if (req.url === "/auth/logout") {
      res.end("{}");
      return;
    }
    if (req.headers.authorization !== "Bearer new" || revoked) {
      res.statusCode = 401;
      res.end("{}");
      return;
    }
    res.end('{"data":{"ok":true}}');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const session = createSession(
    `http://127.0.0.1:${address.port}`,
    {
      read: async () => stored,
      write: async (v) => {
        stored = v;
      },
    },
    () => lost++,
  );
  try {
    assert.equal(await session.restore(), true);
    await Promise.all(
      Array.from({ length: 8 }, () => session.api.get("/protected")),
    );
    assert.equal(refreshes, 1);
    assert.equal(stored?.refreshToken, "rotated");
    revoked = true;
    await assert.rejects(session.api.get("/protected"));
    assert.equal(stored, null);
    assert.equal(lost, 1);
    await session.set({ accessToken: "new", refreshToken: "rotated" });
    await session.logout();
    assert.equal(stored, null);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
test("error de red conserva credenciales para reintentar", async () => {
  let stored: Tokens | null = { accessToken: "old", refreshToken: "refresh" };
  const session = createSession(
    "http://127.0.0.1:1",
    {
      read: async () => stored,
      write: async (v) => {
        stored = v;
      },
    },
    () => {},
  );
  await session.restore();
  await assert.rejects(session.refresh());
  assert.ok(stored);
});
test("logout durante renovación no resucita la sesión", async () => {
  let stored: Tokens | null = { accessToken: "old", refreshToken: "refresh" };
  let signal: () => void = () => {};
  const started = new Promise<void>((r) => (signal = r));
  const server = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/auth/refresh") {
      signal();
      setTimeout(
        () =>
          res.end('{"data":{"accessToken":"new","refreshToken":"rotated"}}'),
        50,
      );
    } else res.end("{}");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const session = createSession(
    `http://127.0.0.1:${(server.address() as any).port}`,
    {
      read: async () => stored,
      write: async (v) => {
        stored = v;
      },
    },
    () => {},
  );
  try {
    await session.restore();
    const refreshing = session.refresh();
    await started;
    await session.logout();
    await refreshing;
    assert.equal(stored, null);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
