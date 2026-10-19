require("../env.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const fs = require("node:fs/promises");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const jwt = require("jsonwebtoken");
test("API completa contra MySQL (base temporal aislada)", async (t) => {
  const dbName = `stockflow_test_${process.pid}_${Date.now()}`;
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  let pool, server;
  try {
    await admin.query(`CREATE DATABASE ${dbName}`);
    await admin.query(`USE ${dbName}`);
    const schema = await fs.readFile(
      path.join(__dirname, "../../database/schema.sql"),
      "utf8",
    );
    await admin.query(
      schema.replace(/^CREATE DATABASE.*\nUSE stockflow;\n/, ""),
    );
    process.env.DB_NAME = dbName;
    execFileSync(process.execPath, ["scripts/migrate.cjs"], {
      cwd: path.join(__dirname, "../.."),
      env: process.env,
    });
    // Segunda ejecución debe ser inocua y conservar los datos.
    execFileSync(process.execPath, ["scripts/migrate.cjs"], {
      cwd: path.join(__dirname, "../.."),
      env: process.env,
    });
    pool = require("../../dist/config/db").pool;
    server = require("../../dist/app").default.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    let businessId;
    async function req(method, url, body, token) {
      const r = await fetch(base + url, {
        method,
        headers: {
          "content-type": "application/json",
          ...(businessId ? { "X-Business-Id": String(businessId) } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, body: await r.json() };
    }
    async function ok(method, url, body, token, status = 200) {
      const r = await req(method, url, body, token);
      assert.equal(r.status, status, JSON.stringify(r.body));
      return r.body.data;
    }
    let employee, manager, owner, category, supplier, product;
    await t.test(
      "registro, login, duplicados, validación y permisos actuales",
      async () => {
        employee = await ok(
          "POST",
          "/auth/register",
          {
            nombre: "Empleado",
            email: "emp@example.com",
            password: "ClaveSegura123",
          },
          null,
          201,
        );
        manager = await ok(
          "POST",
          "/auth/register",
          {
            nombre: "Encargado",
            email: "enc@example.com",
            password: "ClaveSegura123",
          },
          null,
          201,
        );
        owner = await ok(
          "POST",
          "/auth/register",
          {
            nombre: "Administrador",
            email: "adm@example.com",
            password: "ClaveSegura123",
          },
          null,
          201,
        );
        assert.equal(owner.user.rol, undefined);
        await admin.query("UPDATE usuarios SET email_verificado=1");
        const business = await ok("POST", "/businesses", { nombre: "Negocio de pruebas" }, owner.accessToken, 201);
        businessId = business.id;
        await admin.execute("INSERT INTO negocio_usuarios(negocio_id,usuario_id,rol) VALUES(?,?,'empleado'),(?,?,'encargado')", [businessId, employee.user.id, businessId, manager.user.id]);
        assert.equal(
          (
            await req("POST", "/auth/register", {
              nombre: "Intruso",
              email: "x@example.com",
              password: "ClaveSegura123",
              rol: "admin",
            })
          ).status,
          422,
        );
        assert.equal(
          (
            await req("POST", "/auth/register", {
              nombre: "Duplicado",
              email: "emp@example.com",
              password: "ClaveSegura123",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await req("POST", "/auth/login", {
              email: "emp@example.com",
              password: "incorrecta",
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await req("POST", "/auth/login", {
              email: "ausente@example.com",
              password: "incorrecta",
            })
          ).status,
          401,
        );
        await ok("POST", "/auth/login", {
          email: "emp@example.com",
          password: "ClaveSegura123",
        });
        await admin.execute("UPDATE usuarios SET rol_id=2 WHERE id=?", [
          manager.user.id,
        ]);
        await admin.execute("UPDATE usuarios SET rol_id=1 WHERE id=?", [
          owner.user.id,
        ]);
        assert.equal(
          (await ok("GET", "/auth/me", undefined, owner.accessToken)).rol,
          undefined,
        );
        assert.equal(
          (await req("GET", "/demo/admin", undefined, employee.accessToken))
            .status,
          403,
        );
        await ok("GET", "/demo/admin", undefined, owner.accessToken);
        await ok("GET", "/demo/encargado", undefined, manager.accessToken);
        assert.equal((await req("GET", "/auth/me")).status, 401);
        assert.equal(
          (await req("GET", "/auth/me", undefined, "invalido")).status,
          401,
        );
        const expired = jwt.sign(
          { role: "access" },
          process.env.JWT_ACCESS_SECRET,
          {
            subject: String(owner.user.id),
            issuer: "stockflow",
            audience: "stockflow-mobile",
            expiresIn: -1,
          },
        );
        assert.equal(
          (await req("GET", "/auth/me", undefined, expired)).status,
          401,
        );
      },
    );
    await t.test(
      "refresh concurrente, reutilización, revocación, logout y UTC",
      async () => {
        const pair = await Promise.all([
          req("POST", "/auth/refresh", { refreshToken: employee.refreshToken }),
          req("POST", "/auth/refresh", { refreshToken: employee.refreshToken }),
        ]);
        assert.deepEqual(pair.map((x) => x.status).sort(), [200, 401]);
        const fresh = pair.find((x) => x.status === 200).body.data;
        assert.equal(
          (
            await req("POST", "/auth/refresh", {
              refreshToken: fresh.refreshToken,
            })
          ).status,
          401,
        );
        await ok("POST", "/auth/logout", {
          refreshToken: manager.refreshToken,
        });
        assert.equal(
          (
            await req("POST", "/auth/refresh", {
              refreshToken: manager.refreshToken,
            })
          ).status,
          401,
        );
        const [[zone]] = await pool.query("SELECT @@session.time_zone AS zone");
        assert.equal(zone.zone, "+00:00");
        const [[stored]] = await pool.execute(
          "SELECT refresh_token_hash,expira_en FROM sesiones WHERE usuario_id=?",
          [owner.user.id],
        );
        assert.notEqual(stored.refresh_token_hash, owner.refreshToken);
        assert.ok(
          Math.abs(
            stored.expira_en.getTime() -
              jwt.decode(owner.refreshToken).exp * 1000,
          ) < 1000,
        );
      },
    );
    await t.test(
      "CRUD, referencias, SKU único, precios y baja lógica",
      async () => {
        category = await ok(
          "POST",
          "/categories",
          { nombre: "Alimentos" },
          manager.accessToken,
          201,
        );
        supplier = await ok(
          "POST",
          "/suppliers",
          { nombre: "Proveedor Uno" },
          owner.accessToken,
          201,
        );
        const body = {
          nombre: "Yerba",
          sku: "YERBA-1",
          precio: "1234.50",
          stock_minimo: 8,
          categoria_id: category.id,
          proveedor_id: supplier.id,
        };
        assert.equal(
          (await req("POST", "/products", body, employee.accessToken)).status,
          403,
        );
        assert.equal(
          (
            await req(
              "POST",
              "/products",
              { ...body, stock: 4 },
              owner.accessToken,
            )
          ).status,
          422,
        );
        assert.equal(
          (
            await req(
              "POST",
              "/products",
              { ...body, categoria_id: 999999 },
              owner.accessToken,
            )
          ).status,
          404,
        );
        product = await ok("POST", "/products", body, manager.accessToken, 201);
        assert.equal(product.stock, 0);
        assert.equal(product.precio, "1234.50");
        assert.equal(product.costo_compra, null);
        for (const invalid of ["-1", "1.234", "10000000000", 5]) {
          assert.equal((await req("PATCH", `/products/${product.id}`, {costo_compra:invalid}, manager.accessToken)).status,422);
        }
        assert.equal((await ok("PATCH", `/products/${product.id}`, {costo_compra:"900.25"}, manager.accessToken)).costo_compra,"900.25");
        assert.equal((await ok("PATCH", `/products/${product.id}`, {costo_compra:"0"}, manager.accessToken)).costo_compra,"0.00");
        assert.equal((await ok("PATCH", `/products/${product.id}`, {costo_compra:null}, manager.accessToken)).costo_compra,null);
        assert.equal((await ok("PATCH", `/products/${product.id}`, {costo_compra:"1500.00"}, manager.accessToken)).precio,"1234.50");
        assert.equal(
          (await req("POST", "/products", body, owner.accessToken)).status,
          409,
        );
        const edited = await ok(
          "PATCH",
          `/products/${product.id}`,
          { nombre: "Yerba mate" },
          manager.accessToken,
        );
        assert.equal(edited.stock_minimo, 8);
        await ok(
          "PUT",
          `/categories/${category.id}`,
          { nombre: "Almacén", descripcion: "Comestibles" },
          manager.accessToken,
        );
        await ok(
          "PATCH",
          `/suppliers/${supplier.id}`,
          { telefono: "123" },
          manager.accessToken,
        );
        assert.equal(
          (
            await ok(
              "GET",
              "/products?q=Yerba&limit=1",
              undefined,
              employee.accessToken,
            )
          ).total,
          1,
        );
        await ok(
          "GET",
          `/products/${product.id}`,
          undefined,
          employee.accessToken,
        );
        assert.equal(
          (
            await req(
              "DELETE",
              `/products/${product.id}`,
              undefined,
              manager.accessToken,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await req(
              "DELETE",
              `/categories/${category.id}`,
              undefined,
              owner.accessToken,
            )
          ).status,
          409,
        );
        assert.equal(
          (await req("PATCH", `/products/${product.id}`, {}, owner.accessToken))
            .status,
          422,
        );
      },
    );
    await t.test(
      "movimientos: permisos, stock insuficiente y salidas concurrentes",
      async () => {
        const movement = {
          producto_id: product.id,
          tipo: "entrada",
          cantidad: 10,
          motivo: "Compra inicial",
        };
        await ok("POST", "/movements", movement, employee.accessToken, 201);
        assert.equal(
          (
            await req(
              "DELETE",
              `/products/${product.id}`,
              undefined,
              owner.accessToken,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await req(
              "POST",
              "/movements",
              { ...movement, tipo: "ajuste" },
              employee.accessToken,
            )
          ).status,
          403,
        );
        const pair = await Promise.all([
          req(
            "POST",
            "/movements",
            { ...movement, tipo: "salida", cantidad: 7 },
            employee.accessToken,
          ),
          req(
            "POST",
            "/movements",
            { ...movement, tipo: "salida", cantidad: 7 },
            manager.accessToken,
          ),
        ]);
        assert.deepEqual(pair.map((x) => x.status).sort(), [201, 409]);
        assert.equal(
          (
            await ok(
              "GET",
              `/products/${product.id}`,
              undefined,
              employee.accessToken,
            )
          ).stock,
          3,
        );
        const [[count]] = await admin.query(
          "SELECT COUNT(*) AS total FROM movimientos_stock",
        );
        assert.equal(count.total, 2);
        const personal = await ok(
          "GET",
          "/movements",
          undefined,
          employee.accessToken,
        );
        assert.ok(
          personal.items.every((x) => x.usuario_id === employee.user.id),
        );
        assert.equal(
          (await ok("GET", "/movements", undefined, owner.accessToken)).total,
          2,
        );
        await ok(
          "POST",
          "/movements",
          { ...movement, tipo: "ajuste", cantidad: 0 },
          manager.accessToken,
          201,
        );
        await ok(
          "DELETE",
          `/products/${product.id}`,
          undefined,
          owner.accessToken,
        );
        assert.equal(
          (await req("POST", "/movements", movement, employee.accessToken))
            .status,
          404,
        );
        await ok(
          "DELETE",
          `/categories/${category.id}`,
          undefined,
          owner.accessToken,
        );
        await ok(
          "DELETE",
          `/suppliers/${supplier.id}`,
          undefined,
          owner.accessToken,
        );
        const [[audit]] = await admin.query(
          "SELECT COUNT(*) AS total FROM movimientos_stock",
        );
        assert.equal(audit.total, 3);
      },
    );
    await t.test("rollback real si falla la auditoría", async () => {
      const cat = await ok(
        "POST",
        "/categories",
        { nombre: "Rollback" },
        owner.accessToken,
        201,
      );
      const p = await ok(
        "POST",
        "/products",
        {
          nombre: "Prueba",
          sku: "ROLLBACK",
          precio: "1",
          categoria_id: cat.id,
        },
        owner.accessToken,
        201,
      );
      // Fuerza una falla real después del UPDATE del stock; la transacción debe revertirlo.
      await admin.query("CREATE TRIGGER test_audit_failure BEFORE INSERT ON movimientos_stock FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='audit test failure'");
      assert.equal((await req("POST", "/movements", { producto_id: p.id, tipo: "entrada", cantidad: 5, motivo: "Rollback" }, owner.accessToken)).status, 500);
      await admin.query("DROP TRIGGER test_audit_failure");
      assert.equal(
        (await ok("GET", `/products/${p.id}`, undefined, owner.accessToken))
          .stock,
        0,
      );
    });
    await t.test("existencias iniciales atómicas y solo al crear", async () => {
      const cat=await ok("POST","/categories",{nombre:"Iniciales"},owner.accessToken,201);
      const body={nombre:"Inicial",sku:"INITIAL",precio:"2.00",categoria_id:cat.id,stock_inicial:7};
      for(const stock_inicial of [-1,1.5,2147483648,"3"]) assert.equal((await req("POST","/products",{...body,stock_inicial},owner.accessToken)).status,422);
      assert.equal((await req("POST","/products",body,employee.accessToken)).status,403);
      const p=await ok("POST","/products",body,owner.accessToken,201);
      assert.equal(p.stock,7);
      const [[movement]]=await admin.execute("SELECT * FROM movimientos_stock WHERE producto_id=?",[p.id]);
      assert.equal(movement.stock_anterior,0);assert.equal(movement.stock_nuevo,7);assert.equal(movement.cantidad,7);assert.equal(movement.usuario_id,owner.user.id);assert.equal(movement.negocio_id,businessId);
      assert.equal((await req("PATCH",`/products/${p.id}`,{stock_inicial:10},owner.accessToken)).status,422);
      await admin.query("CREATE TRIGGER initial_failure BEFORE INSERT ON movimientos_stock FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='initial audit test failure'");
      try { assert.equal((await req("POST","/products",{...body,sku:"INITIAL-FAIL"},owner.accessToken)).status,500); }
      finally {await admin.query("DROP TRIGGER initial_failure");}
      const [[count]]=await admin.query("SELECT COUNT(*) AS total FROM productos WHERE sku='INITIAL-FAIL'");assert.equal(count.total,0);
    });
    await t.test("usuario desactivado pierde acceso y renovación", async () => {
      await admin.execute("UPDATE usuarios SET activo=0 WHERE id=?", [
        owner.user.id,
      ]);
      assert.equal(
        (await req("GET", "/auth/me", undefined, owner.accessToken)).status,
        401,
      );
      assert.equal(
        (
          await req("POST", "/auth/refresh", {
            refreshToken: owner.refreshToken,
          })
        ).status,
        401,
      );
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await admin.end();
  }
});
