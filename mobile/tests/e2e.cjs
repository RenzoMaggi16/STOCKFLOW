// Prueba web del mismo código React Native. No sustituye una prueba en Android.
const { chromium, expect } = require("@playwright/test");
const mysql = require("../../backend/node_modules/mysql2/promise");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
(async () => {
  const backend = path.resolve(__dirname, "../../backend");
  const name = `stockflow_test_ui_${process.pid}_${Date.now()}`;
  const env = {
    ...process.env,
    NODE_ENV: "test",
    PORT: "3001",
    DB_HOST: "127.0.0.1",
    DB_PORT: process.env.TEST_DB_PORT || "3307",
    DB_USER: process.env.TEST_DB_USER || "root",
    DB_PASSWORD: process.env.TEST_DB_PASSWORD || "",
    DB_NAME: name,
    JWT_ACCESS_SECRET: "ui-test-access-".repeat(5),
    JWT_REFRESH_SECRET: "ui-test-refresh-".repeat(5),
    CORS_ORIGINS: "http://localhost:8081,http://127.0.0.1:8081",
  };
  const db = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });
  let server, browser;
  try {
    await db.query(`CREATE DATABASE ${name}`);
    await db.query(`USE ${name}`);
    await db.query(
      fs
        .readFileSync(path.join(backend, "database/schema.sql"), "utf8")
        .replace(/^CREATE DATABASE.*\nUSE stockflow;\n/, ""),
    );
    execFileSync(process.execPath, ["scripts/migrate.cjs"], {
      cwd: backend,
      env,
    });
    const hash = await require("../../backend/node_modules/bcrypt").hash(
      "UiTestPassword123",
      12,
    );
    await db.execute(
      "INSERT INTO usuarios(nombre,email,password_hash,rol_id,email_verificado) VALUES('Demo UI','ui@example.com',?,1,1)",
      [hash],
    );
    server = spawn(process.execPath, ["dist/server.js"], {
      cwd: backend,
      env,
      stdio: "pipe",
    });
    await new Promise((resolve, reject) => {
      server.stdout.on("data", () => resolve());
      server.on("exit", () => reject(new Error("API no inició")));
    });
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const consoleErrors = [];
    page.on("pageerror", (e) => consoleErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") {
        consoleErrors.push(m.text());
        console.error(m.text().slice(0, 300));
      }
    });
    await page.goto("http://localhost:8081");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.getByRole("button", {name:"Ingresar",exact:true}).click();
    await expect(page.getByText("Este campo es obligatorio")).toHaveCount(2);
    await page
      .getByLabel("Correo electrónico", { exact: true })
      .fill("ui@example.com");
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("UiTestPassword123");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Hola, Demo", exact: true }),
    ).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole("button", { name: "Categorías", exact: true }).click();
    await page
      .getByRole("button", { name: "Crear registro", exact: true })
      .click();
    await page.getByLabel("Nombre", { exact: true }).fill("Categoría UI");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Categoría UI", { exact: true })).toBeVisible();
    await page.goBack();
    await page.getByRole("tab", { name: "Productos" }).click();
    await page
      .getByRole("button", { name: "Nuevo producto", exact: true })
      .click();
    await page.getByLabel("Nombre", { exact: true }).fill("Producto UI");
    await page.getByLabel("SKU único").fill("UI-001");
    await page.getByLabel("Precio (ej. 1500.50)").fill("25.50");
    await page
      .getByRole("button", { name: "Seleccionar", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Categoría UI", exact: true })
      .click();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Producto UI", { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Buscar por nombre o SKU" }).fill("NO-EXISTE");
    await expect(page.getByText("Todavía no hay registros para mostrar.").filter({ visible: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Buscar por nombre o SKU" }).fill("UI-001");
    await expect(page.getByText("Producto UI", { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: "Ver producto", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Editar producto", exact: true })
      .click();
    await page
      .getByLabel("Nombre", { exact: true })
      .fill("Producto editado UI");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      page.getByText("Producto editado UI", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Registrar movimiento", exact: true })
      .click();
    await page.getByLabel("Cantidad", { exact: true }).fill("5");
    await page.getByLabel("Motivo", { exact: true }).fill("Prueba de interfaz");
    await page
      .getByRole("button", { name: "Revisar operación", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar movimiento", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      page.getByText("Movimiento registrado correctamente"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Registrar movimiento", exact: true }),
    ).toBeHidden();
    await page.getByRole("tab", { name: "Inicio" }).click();
    await expect(
      page.getByRole("heading", { name: "Hola, Demo", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: path.resolve(__dirname, "../../docs/dashboard-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Ver reportes", exact: true })
      .click();
    await expect(
      page.getByText("Valor actual de existencias", { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.screenshot({
      path: path.resolve(__dirname, "../../docs/reportes-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.goBack();
    await page.getByRole("tab", { name: "Perfil" }).click();
    await page
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Iniciar sesión", exact: true }),
    ).toBeVisible();
    assertNoErrors(consoleErrors);
    console.log(
      "E2E web OK: validación, login, categoría, producto, filtros, edición, entrada, reportes, logout; 390px y 1100px.",
    );
  } finally {
    if (browser) await browser.close();
    if (server) {
      server.kill("SIGTERM");
      await new Promise((r) => server.once("exit", r));
    }
    await db.query(`DROP DATABASE IF EXISTS ${name}`);
    await db.end();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
function assertNoErrors(errors) {
  if (errors.length) throw new Error(errors.join("\n"));
}
