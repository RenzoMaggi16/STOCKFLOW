require("../env.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { SMTPServer } = require("smtp-server");
const crypto = require("node:crypto");
test("Cuentas, reportes y correo SMTP local real", async (t) => {
  const mailbox = [];
  const smtp = new SMTPServer({
    disabledCommands: ["AUTH", "STARTTLS"],
    onData(stream, session, callback) {
      let body = "";
      stream.on("data", (chunk) => (body += chunk));
      stream.on("end", () => {
        mailbox.push(body);
        callback();
      });
    },
  });
  await new Promise((resolve) => smtp.listen(0, "127.0.0.1", resolve));
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(smtp.server.address().port);
  const name = `stockflow_test_accounts_${process.pid}_${Date.now()}`;
  const db = await mysql.createConnection({
    host: "127.0.0.1",
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  let server, pool;
  try {
    await db.query(`CREATE DATABASE ${name}`);
    await db.query(`USE ${name}`);
    await db.query(
      (
        await fs.readFile(
          path.join(__dirname, "../../database/schema.sql"),
          "utf8",
        )
      ).replace(/^CREATE DATABASE[^\r\n]*\r?\nUSE stockflow;\r?\n/, ""),
    );
    process.env.DB_NAME = name;
    execFileSync(process.execPath, ["scripts/migrate.cjs"], {
      cwd: path.join(__dirname, "../.."),
      env: process.env,
    });
    const app = require("../../dist/app").default;
    pool = require("../../dist/config/db").pool;
    const auth = require("../../dist/services/auth.service");
    const codes = require("../../dist/services/codes.service");
    const admin = await auth.register(
      "Admin",
      "admin@example.com",
      "ClaveSegura123",
    );
    const employee = await auth.register(
      "Empleado",
      "employee@example.com",
      "ClaveSegura123",
    );
    await db.execute(
      "UPDATE usuarios SET rol_id=1,email_verificado=1 WHERE id=?",
      [admin.user.id],
    );
    const businesses = require("../../dist/services/businesses.service");
    const business = await businesses.create(admin.user.id, { nombre: "Cuentas test" });
    await db.execute("INSERT INTO negocio_usuarios(negocio_id,usuario_id,rol) VALUES(?,?,'empleado')", [business.id, employee.user.id]);
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(method, url, body, token) {
      const r = await fetch(base + url, {
        method,
        headers: {
          "content-type": "application/json",
          "X-Business-Id": String(business.id),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, ...(await r.json()) };
    }
    function lastCode() {
      const m = mailbox.at(-1);
      assert.ok(m);
      const code = /\b(\d{6})\b/.exec(m);
      assert.ok(code);
      return code[1];
    }
    await t.test(
      "verificación requerida, SMTP, código incorrecto, consumo único",
      async () => {
        assert.equal(
          (await request("GET", "/products", null, employee.accessToken))
            .status,
          403,
        );
        const sent = await request("POST", "/auth/resend-verification", {
          email: employee.user.email,
        });
        assert.equal(sent.status, 200);
        const code = lastCode();
        const [[stored]] = await db.execute(
          "SELECT codigo_hash FROM verificaciones WHERE id=?",
          [sent.data.challengeId],
        );
        assert.notEqual(stored.codigo_hash, code);
        assert.equal(stored.codigo_hash.length, 64);
        assert.equal(
          (
            await request("POST", "/auth/verify-email", {
              challengeId: sent.data.challengeId,
              code: "000000",
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await request("POST", "/auth/verify-email", {
              challengeId: sent.data.challengeId,
              code,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request("POST", "/auth/verify-email", {
              challengeId: sent.data.challengeId,
              code,
            })
          ).status,
          401,
        );
        assert.equal(
          (await request("GET", "/products", null, employee.accessToken))
            .status,
          200,
        );
      },
    );
    await t.test(
      "administración, autoexclusión, permisos y revocación de access",
      async () => {
        assert.equal(
          (await request("GET", `/businesses/${business.id}/members`, null, employee.accessToken)).status,
          403,
        );
        const list = await request(
          "GET",
          `/businesses/${business.id}/members`,
          null,
          admin.accessToken,
        );
        assert.equal(list.data.items.length, 2);
        assert.equal(
          (
            await request(
              "PATCH",
              `/businesses/${business.id}/members/${admin.user.id}`,
              { rol: "empleado" },
              admin.accessToken,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(
              "PATCH",
              `/businesses/${business.id}/members/${admin.user.id}`,
              { estado: "inactivo" },
              admin.accessToken,
            )
          ).status,
          409,
        );
        const changed = await request(
          "PATCH",
          `/businesses/${business.id}/members/${employee.user.id}`,
          { rol: "encargado" },
          admin.accessToken,
        );
        assert.equal(changed.status, 200);
        assert.equal(
          (await request("GET", "/auth/me", null, employee.accessToken)).status,
          200,
        );
        const login = await auth.login(employee.user.email, "ClaveSegura123");
        employee.accessToken = login.accessToken;
        assert.equal(
          (
            await request(
              "PATCH",
              "/auth/me",
              { nombre: "Nombre nuevo" },
              employee.accessToken,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              "PATCH",
              "/auth/me",
              { rol: "admin" },
              employee.accessToken,
            )
          ).status,
          422,
        );
      },
    );
    await t.test(
      "reportes SQL calculan cantidades y valor, filtros y permisos",
      async () => {
        const c = await request(
          "POST",
          "/categories",
          { nombre: "Reporte" },
          admin.accessToken,
        );
        const p = await request(
          "POST",
          "/products",
          {
            nombre: "Producto reportado",
            sku: "REPORT",
            precio: "2.50",
            categoria_id: c.data.id,
            stock_minimo: 6,
          },
          admin.accessToken,
        );
        await request(
          "POST",
          "/stock/receive",
          {
            producto_id: p.data.id,
            tipo: "entrada",
            cantidad: 5,
            motivo: "Prueba",
          },
          employee.accessToken,
        );
        const r = await request(
          "GET",
          "/reports/summary",
          null,
          admin.accessToken,
        );
        assert.equal(Number(r.data.unidades), 5);
        assert.equal(Number(r.data.valor), 12.5);
        assert.equal(Number(r.data.stock_bajo), 1);
        const m = await request(
          "GET",
          "/reports/movements",
          null,
          admin.accessToken,
        );
        assert.equal(Number(m.data.periodos[0].cantidad), 5);
        assert.equal(
          (
            await request(
              "GET",
              "/reports/stock-value",
              null,
              admin.accessToken,
            )
          ).data.categorias.length,
          1,
        );
        assert.equal(
          (await request("GET", "/reports/low-stock", null, admin.accessToken))
            .data.items.length,
          1,
        );
        assert.equal(
          (
            await request(
              "GET",
              "/reports/movements?desde=2026-12-01&hasta=2026-01-01",
              null,
              admin.accessToken,
            )
          ).status,
          422,
        );
        await db.execute("UPDATE negocio_usuarios SET rol='empleado' WHERE negocio_id=? AND usuario_id=?", [business.id, employee.user.id]);
        assert.equal(
          (await request("GET", "/reports/summary", null, employee.accessToken))
            .status,
          403,
        );
        assert.equal(
          (await request("GET", "/dashboard", null, employee.accessToken)).data
            .valor,
          undefined,
        );
      },
    );
    await t.test(
      "segundo factor: configurar, exigir y consumir código una sola vez",
      async () => {
        const sent = await request(
          "POST",
          "/auth/mfa/request",
          { enabled: true },
          employee.accessToken,
        );
        const code = lastCode();
        assert.equal(sent.status, 200);
        assert.equal(
          (
            await request(
              "POST",
              "/auth/mfa/configure",
              { enabled: true, challengeId: sent.data.challengeId, code },
              employee.accessToken,
            )
          ).status,
          200,
        );
        const login = await request("POST", "/auth/login", {
          email: employee.user.email,
          password: "ClaveSegura123",
        });
        assert.equal(login.data.requiresMfa, true);
        assert.equal(login.data.accessToken, undefined);
        const body = { challengeId: login.data.challengeId, code: lastCode() };
        const verified = await request("POST", "/auth/mfa/verify", body);
        assert.equal(verified.status, 200);
        employee.accessToken = verified.data.accessToken;
        assert.equal(
          (await request("POST", "/auth/mfa/verify", body)).status,
          401,
        );
      },
    );
    await t.test("login reconsulta MFA si cambia durante bcrypt", async () => {
      const bcrypt = require("bcrypt");
      const original = bcrypt.compare;
      await db.execute("UPDATE usuarios SET segundo_factor=0 WHERE id=?", [employee.user.id]);
      await db.query("UPDATE verificaciones SET creado_en=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 MINUTE)");
      bcrypt.compare = async (...args) => {
        const valid = await original(...args);
        await db.execute("UPDATE usuarios SET segundo_factor=1,token_version=token_version+1 WHERE id=?", [employee.user.id]);
        return valid;
      };
      try {
        const result = await auth.login(employee.user.email, "ClaveSegura123");
        assert.equal(result.requiresMfa, true);
        assert.equal(result.accessToken, undefined);
        assert.ok(result.challengeId);
      } finally {
        bcrypt.compare = original;
      }
    });
    await t.test(
      "recuperación revoca sesiones y códigos; límite de intentos y expiración",
      async () => {
        const sent = await codes.requestCode(employee.user.email, "reset");
        const code = lastCode();
        await codes.resetPassword(sent.challengeId, code, "NuevaClave456");
        assert.equal(
          (await request("GET", "/auth/me", null, employee.accessToken)).status,
          401,
        );
        await assert.rejects(auth.login(employee.user.email, "ClaveSegura123"));
        await db.query(
          "UPDATE verificaciones SET creado_en=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 MINUTE)",
        );
        const retry = await codes.requestCode(employee.user.email, "reset");
        const right = lastCode();
        for (let i = 0; i < 5; i++)
          await assert.rejects(
            codes.resetPassword(retry.challengeId, "000000", "OtraClave456"),
          );
        await assert.rejects(
          codes.resetPassword(retry.challengeId, right, "OtraClave456"),
        );
        await db.query(
          "UPDATE verificaciones SET creado_en=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 MINUTE)",
        );
        const expired = await codes.requestCode(employee.user.email, "reset");
        const expCode = lastCode();
        await db.execute(
          "UPDATE verificaciones SET expira_en=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE id=?",
          [expired.challengeId],
        );
        await assert.rejects(
          codes.resetPassword(expired.challengeId, expCode, "OtraClave456"),
        );
      },
    );
    await t.test("Discord: identidad, permisos y consumo único", async () => {
      const oauth = require("../../dist/services/oauth.service");
      const env = require("../../dist/config/env").env;
      const originalFetch = global.fetch;
      env.DISCORD_CLIENT_ID = "test-discord";
      env.DISCORD_CLIENT_SECRET = "test-secret";
      const verifier = "d".repeat(64);
      const started = await oauth.start("discord", crypto.createHash("sha256").update(verifier).digest("base64url"), "web");
      const url = new URL(started.url);
      assert.equal(url.searchParams.get("scope"), "identify email");
      global.fetch = async (url) => {
        if (url === "https://discord.com/api/oauth2/token") return Response.json({ access_token: "test-token" });
        if (url === "https://discord.com/api/v10/users/@me") return Response.json({ id: "123456789", email: "discord@example.com", username: "Discord test", verified: true });
        throw new Error("Unexpected request");
      };
      try {
        const state = url.searchParams.get("state");
        assert.equal(await oauth.returnTarget("discord", state), `${env.WEB_APP_URL}/oauth`);
        await assert.rejects(oauth.returnTarget("google", state));
        const ticket = await oauth.complete("discord", state, "test-code");
        await assert.rejects(oauth.complete("discord", state, "test-code"));
        const session = await oauth.exchange(ticket, verifier);
        assert.equal(session.user.email_verificado, true);
        assert.equal(session.user.rol, undefined);
        await assert.rejects(oauth.exchange(ticket, verifier));
      } finally {
        global.fetch = originalFetch;
        env.DISCORD_CLIENT_ID = "";
        env.DISCORD_CLIENT_SECRET = "";
      }
    });
    await t.test("Google vincula un email verificado a la cuenta existente", async () => {
      const oauth = require("../../dist/services/oauth.service");
      const env = require("../../dist/config/env").env;
      const originalFetch = global.fetch;
      env.GOOGLE_CLIENT_ID = "test-google";
      env.GOOGLE_CLIENT_SECRET = "test-secret";
      const verifier = "g".repeat(64);
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      const started = await oauth.start("google", challenge, "native");
      const state = new URL(started.url).searchParams.get("state");
      global.fetch = async (url) => {
        if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "google-test-token" });
        if (url === "https://openidconnect.googleapis.com/v1/userinfo") return Response.json({ sub: "google-existing-account", email: employee.user.email, name: "Google Employee", email_verified: true });
        throw new Error("Unexpected request");
      };
      try {
        const ticket = await oauth.complete("google", state, "test-code");
        const session = await oauth.exchange(ticket, verifier);
        // MFA remains mandatory even when Google has been linked successfully.
        assert.equal(session.requiresMfa, true);
        assert.ok(session.challengeId);
        const [[link]] = await db.execute(
          "SELECT usuario_id FROM auth_proveedores WHERE proveedor='google' AND proveedor_usuario_id='google-existing-account'",
        );
        assert.equal(link.usuario_id, employee.user.id);

        const unverified = await auth.register("Sin verificar", "unverified@example.com", "ClaveSegura123");
        const second = await oauth.start("google", challenge, "native");
        const secondState = new URL(second.url).searchParams.get("state");
        global.fetch = async (url) => {
          if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "google-unverified-token" });
          if (url === "https://openidconnect.googleapis.com/v1/userinfo") return Response.json({ sub: "google-unverified-account", email: unverified.user.email, name: "Unverified", email_verified: false });
          throw new Error("Unexpected request");
        };
        await assert.rejects(
          oauth.complete("google", secondState, "test-code"),
          (error) => error.code === "ACCOUNT_EXISTS_UNVERIFIED",
        );
      } finally {
        global.fetch = originalFetch;
        env.GOOGLE_CLIENT_ID = "";
        env.GOOGLE_CLIENT_SECRET = "";
      }
    });
    await t.test('Facebook: identidad con verificación local y sin vinculación insegura (proveedor simulado)',async()=>{
      const oauth=require('../../dist/services/oauth.service'),env=require('../../dist/config/env').env,originalFetch=global.fetch;
      env.FACEBOOK_CLIENT_ID='test-facebook';env.FACEBOOK_CLIENT_SECRET='test-secret';
      const verifier='f'.repeat(64),challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
      let email='facebook-new@example.com';
      global.fetch=async url=>String(url).includes('/oauth/access_token')?Response.json({access_token:'fb-test'}):Response.json({id:'fb-user',name:'Facebook Test',email});
      try {
        const start=await oauth.start('facebook',challenge);const ticket=await oauth.complete('facebook',new URL(start.url).searchParams.get('state'),'code');
        const session=await oauth.exchange(ticket,verifier);assert.equal(session.user.email_verificado,false);
        await assert.rejects(oauth.exchange(ticket,verifier));
        email=employee.user.email;
        global.fetch=async url=>String(url).includes('/oauth/access_token')?Response.json({access_token:'fb-test'}):Response.json({id:'fb-another-user',name:'Existing',email});
        const next=await oauth.start('facebook',challenge);
        await assert.rejects(oauth.complete('facebook',new URL(next.url).searchParams.get('state'),'code'),e=>e.code==='ACCOUNT_EXISTS_UNVERIFIED');
      } finally {global.fetch=originalFetch;env.FACEBOOK_CLIENT_ID='';env.FACEBOOK_CLIENT_SECRET='';}
    });
    await t.test(
      "OAuth sin credenciales informa bloqueo, ticket usa prueba de posesión",
      async () => {
        const providers = await request("GET", "/auth/social/providers");
        assert.equal(providers.data.google, false);
        assert.equal(
          (
            await request("POST", "/auth/social/google/start", {
              challenge: "a".repeat(43),
            })
          ).status,
          503,
        );
        const verifier = "v".repeat(64),
          ticket = "b".repeat(64),
          state = "c".repeat(64);
        const hash = (v) => crypto.createHash("sha256").update(v).digest("hex");
        await db.execute(
          "INSERT INTO oauth_flujos(state_hash,proveedor,challenge,ticket_hash,usuario_id,expira_en) VALUES(?,'github',?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 MINUTE))",
          [
            hash(state),
            crypto.createHash("sha256").update(verifier).digest("base64url"),
            hash(ticket),
            admin.user.id,
          ],
        );
        assert.equal(
          (
            await request("POST", "/auth/social/exchange", {
              ticket,
              verifier: "x".repeat(64),
            })
          ).status,
          401,
        );
        assert.equal(
          (await request("POST", "/auth/social/exchange", { ticket, verifier }))
            .status,
          200,
        );
        assert.equal(
          (await request("POST", "/auth/social/exchange", { ticket, verifier }))
            .status,
          401,
        );
      },
    );
  } finally {
    if (server) await new Promise((r) => server.close(r));
    if (pool) await pool.end();
    await db.query(`DROP DATABASE IF EXISTS ${name}`);
    await db.end();
    await new Promise((r) => smtp.close(r));
  }
});
