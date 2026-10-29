// Prueba web del mismo código React Native. No sustituye una prueba en Android.
const { chromium, expect } = require("@playwright/test");
const mysql = require("../../backend/node_modules/mysql2/promise");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
const { SMTPServer } = require("../../backend/node_modules/smtp-server");
(async () => {
  const mailbox = [];
  const smtp = new SMTPServer({ disabledCommands: ["AUTH", "STARTTLS"], onData(stream, session, done) {
    let message = ""; stream.on("data", c => message += c); stream.on("end", () => { mailbox.push(message); done(); });
  } });
  await new Promise(resolve => smtp.listen(0, "127.0.0.1", resolve));
  const backend = path.resolve(__dirname, "../../backend");
  const webURL = process.env.TEST_WEB_URL || "http://localhost:8081";
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
    CORS_ORIGINS: webURL,
    SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtp.server.address().port), SMTP_USER: "", SMTP_PASSWORD: "",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "", DISCORD_CLIENT_ID: "", DISCORD_CLIENT_SECRET: "",
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
        .replace(/^CREATE DATABASE[^\r\n]*\r?\nUSE stockflow;\r?\n/, ""),
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
    await db.execute("INSERT INTO usuarios(nombre,email,password_hash,email_verificado) VALUES('Invitado UI','invitado@example.com',?,1)", [hash]);
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
    page.on("response", r => { if (r.status() >= 400) console.error(`HTTP ${r.status()} ${new URL(r.url()).pathname}`); });
    page.on("console", (m) => {
      if (m.type() === "error") {
        consoleErrors.push(m.text());
        console.error(m.text().slice(0, 300));
      }
    });
    await page.goto(webURL);
    await page.getByRole("button", {name:"Abrir menú"}).click();
    await page
      .getByRole("link", { name: "Iniciar sesión", exact: true }).filter({visible:true})
      .click();
    await page.screenshot({ path: path.join(__dirname, "../../docs/login-mobile.png"), fullPage: true });
    await page.getByRole("button", {name:"Ingresar",exact:true}).click();
    await expect(page.getByText("Este campo es obligatorio")).toHaveCount(2);
    await page
      .getByLabel("Correo electrónico", { exact: true })
      .fill("ui@example.com");
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("UiTestPassword123");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tus negocios", exact: true })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Crear negocio", exact: true }).click();
    await page.getByLabel("Nombre del negocio", { exact: true }).fill("Negocio UI");
    await page.getByLabel("Rubro", { exact: true }).fill("Almacén");
    await page.getByRole("button", { name: "Crear negocio", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Hola, Demo", exact: true }),
    ).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole("button", { name: "Consultar sin existencias", exact: true }).click();
    await expect(page).toHaveURL(/stock=sin/);
    await page.getByRole("tab", { name: "Inicio" }).click();
    await page.getByRole("button", { name: "Categorías", exact: true }).click();
    await page
      .getByRole("button", { name: "Crear registro", exact: true })
      .click();
    await page.getByLabel("Nombre", { exact: true }).fill("Categoría UI");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Categoría UI", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading",{name:"Crear",exact:true})).toBeHidden();
    await page.screenshot({path:path.resolve(__dirname,"../../docs/categories-mobile.png")});
    await page.goBack();
    await page.getByRole("tab", { name: "Productos" }).click();
    await page
      .getByRole("button", { name: "Nuevo producto", exact: true })
      .click();
    await page.getByLabel("Nombre", { exact: true }).fill("Producto UI");
    await page.getByLabel("SKU único").fill("UI-001");
    await page.getByLabel("Precio de venta por unidad").fill("25.50");
    await page.getByLabel("Costo de compra por unidad").fill("10.25");
    await page.getByLabel("Existencias iniciales").fill("12");
    await page
      .getByRole("button", { name: "Seleccionar", exact: true })
      .first()
      .click();
    await page.getByLabel("Buscar",{exact:true}).fill("Categoría creada con Enter");
    await page.getByLabel("Buscar",{exact:true}).press("Enter");
    await expect(page.getByLabel("Buscar",{exact:true})).toBeHidden();
    await expect(page.getByRole("button",{name:"Categoría creada con Enter",exact:true}).first()).toBeVisible();
    await page.getByRole("button",{name:"Categoría creada con Enter",exact:true}).first().click();
    await page.getByLabel("Buscar",{exact:true}).press("Enter");
    await expect(page.getByLabel("Buscar",{exact:true})).toBeHidden();
    await page.screenshot({path:path.resolve(__dirname,"../../docs/product-form-mobile.png")});
    await page.getByRole("button",{name:"Seleccionar",exact:true}).click();
    await page.getByLabel("Buscar",{exact:true}).fill("Proveedor con Enter");
    await page.getByLabel("Buscar",{exact:true}).press("Enter");
    await expect(page.getByLabel("Buscar",{exact:true})).toBeHidden();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Producto UI", { exact: true })).toBeVisible();
    const [[saved]]=await db.query("SELECT p.stock,s.nombre AS proveedor FROM productos p JOIN proveedores s ON s.id=p.proveedor_id WHERE p.sku='UI-001'");
    expect(saved.stock).toBe(12);expect(saved.proveedor).toBe("Proveedor con Enter");
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
    await expect(page.getByLabel("Costo de compra por unidad")).toHaveValue("10.25");
    await expect(page.getByLabel("Existencias iniciales")).toHaveCount(0);
    await page.getByLabel("Costo de compra por unidad").fill("30.00");
    await expect(page.getByText("El precio de venta está por debajo del costo de compra.")).toBeVisible();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      page.getByText("Producto editado UI", { exact: true }).first(),
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
      page.getByText("Valor de existencias a precio de venta", { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.screenshot({
      path: path.resolve(__dirname, "../../docs/reportes-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.goBack();
    await page.getByRole("button",{name:"Proveedores",exact:true}).click();
    await expect(page.getByText("Las personas detrás de tu stock.")).toBeVisible();
    await page.screenshot({path:path.resolve(__dirname,"../../docs/suppliers-desktop.png")});
    await page.goBack();
    await page.getByRole("button", { name: "Equipo", exact: true }).click();
    await expect(page.getByText("El trabajo es mejor en equipo.")).toBeVisible();
    await page.screenshot({path:path.resolve(__dirname,"../../docs/team-desktop.png")});
    await page.getByRole("button", { name: "Invitar empleado", exact: true }).click();
    await page.getByLabel("Correo del invitado", { exact: true }).fill("invitado@example.com");
    await page.getByRole("button", { name: "Enviar invitación", exact: true }).click();
    await expect(page.getByText("Invitación enviada por correo", { exact: true })).toBeVisible();
    if (!mailbox.length) throw new Error("No se recibió la invitación en el SMTP local");
    const employeePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await employeePage.goto(webURL + "/login");
    await employeePage.getByLabel("Correo electrónico", { exact: true }).fill("invitado@example.com");
    await employeePage.getByLabel("Contraseña", { exact: true }).fill("UiTestPassword123");
    await employeePage.getByRole("button", { name: "Ingresar", exact: true }).click();
    await employeePage.getByRole("button", { name: "Aceptar invitación a Negocio UI", exact: true }).click();
    await employeePage.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(employeePage.getByRole("heading", { name: "Hola, Invitado", exact: true })).toBeVisible();
    await expect(employeePage.getByRole("button", { name: "Nuevo producto", exact: true })).toHaveCount(0);
    await employeePage.getByRole("tab", { name: "Productos" }).click();
    await expect(employeePage.getByText("Producto editado UI", { exact: true })).toBeVisible();
    await employeePage.close();
    await page.goBack();
    await page.getByRole("button", { name: "Cambiar negocio", exact: true }).click();
    await page.getByRole("button", { name: "Crear negocio", exact: true }).click();
    await page.getByLabel("Nombre del negocio", { exact: true }).fill("Segundo negocio UI");
    await page.getByRole("button", { name: "Crear negocio", exact: true }).click();
    await page.getByRole("tab", { name: "Productos" }).click();
    await expect(page.getByText("Todavía no hay registros para mostrar.").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Producto editado UI", { exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: "Inicio" }).click();
    await page.getByRole("button", { name: "Cambiar negocio", exact: true }).click();
    await page.getByRole("button", { name: "Entrar a Negocio UI", exact: true }).click();
    await page.getByRole("tab", { name: "Productos" }).click();
    await expect(page.getByRole("button",{name:"Ver producto",exact:true})).toBeVisible();
    await expect(page.getByText("Producto editado UI", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Perfil" }).click();
    await page
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Iniciar sesión", exact: true }).filter({visible:true}),
    ).toBeVisible();
    assertNoErrors(consoleErrors);
    console.log(
      "E2E web OK: crear negocio, inventario, reportes, invitación SMTP, aceptación empleado, aislamiento al cambiar negocio y logout; 390px y 1100px.",
    );
  } finally {
    if (browser) await browser.close();
    if (server) {
      server.kill("SIGTERM");
      await new Promise((r) => server.once("exit", r));
    }
    await db.query(`DROP DATABASE IF EXISTS ${name}`);
    await db.end();
    await new Promise(resolve => smtp.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
function assertNoErrors(errors) {
  if (errors.length) throw new Error(errors.join("\n"));
}
