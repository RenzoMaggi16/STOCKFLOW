require("dotenv/config");
const mysql = require("mysql2/promise");
(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await db.beginTransaction();
    await db.execute(
      "INSERT INTO categorias(nombre,descripcion) VALUES('Almacén demo','Productos de demostración') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
    );
    const [[category]] = await db.execute(
      "SELECT id FROM categorias WHERE nombre='Almacén demo'",
    );
    await db.execute(
      "INSERT INTO proveedores(nombre,email) VALUES('Proveedor demo','demo@example.com') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
    );
    const [[supplier]] = await db.execute(
      "SELECT id FROM proveedores WHERE nombre='Proveedor demo'",
    );
    for (const [nombre, sku, precio, minimo] of [
      ["Yerba mate 1 kg", "DEMO-YERBA", "4500.00", 5],
      ["Azúcar 1 kg", "DEMO-AZUCAR", "1200.00", 10],
    ]) {
      await db.execute(
        "INSERT INTO productos(nombre,sku,precio,stock_minimo,categoria_id,proveedor_id) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
        [nombre, sku, precio, minimo, category.id, supplier.id],
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
