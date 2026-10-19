require("dotenv/config");
const mysql = require("mysql2/promise");
(async () => {
  const businessId = Number(process.env.SEED_BUSINESS_ID);
  if (!Number.isSafeInteger(businessId) || businessId < 1) throw new Error("Indicá SEED_BUSINESS_ID de un negocio creado explícitamente. No se adjudican datos históricos.");
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? {
      rejectUnauthorized: true,
      ...(process.env.DB_SSL_CA_FILE ? { ca: require("node:fs").readFileSync(process.env.DB_SSL_CA_FILE, "utf8") } : {}),
    } : undefined,
  });
  try {
    await db.beginTransaction();
    const [[business]] = await db.execute("SELECT id FROM negocios WHERE id=? AND activo=1 AND historico=0 FOR UPDATE", [businessId]);
    if (!business) throw new Error("Negocio inexistente, histórico o inactivo");
    await db.execute(
      "INSERT INTO categorias(nombre,descripcion,negocio_id) VALUES('Almacén demo','Productos de demostración',?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [businessId],
    );
    const [[category]] = await db.execute(
      "SELECT id FROM categorias WHERE nombre='Almacén demo' AND negocio_id=?", [businessId],
    );
    await db.execute(
      "INSERT INTO proveedores(nombre,email,negocio_id) VALUES('Proveedor demo','demo@example.com',?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)", [businessId],
    );
    const [[supplier]] = await db.execute(
      "SELECT id FROM proveedores WHERE nombre='Proveedor demo' AND negocio_id=?", [businessId],
    );
    for (const [nombre, sku, precio, minimo] of [
      ["Yerba mate 1 kg", "DEMO-YERBA", "4500.00", 5],
      ["Azúcar 1 kg", "DEMO-AZUCAR", "1200.00", 10],
    ]) {
      await db.execute(
        "INSERT INTO productos(nombre,sku,precio,stock_minimo,categoria_id,proveedor_id,negocio_id) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
        [nombre, sku, precio, minimo, category.id, supplier.id, businessId],
      );
    }
    await db.commit();
    console.log(
      "Datos demo preparados con stock 0. Registrá entradas mediante la API.",
    );
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    await db.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
