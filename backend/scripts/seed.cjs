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
    const userId = Number(process.env.SEED_USER_ID);
    const [[actor]] = await db.execute("SELECT usuario_id FROM negocio_usuarios WHERE negocio_id=? AND usuario_id=? AND rol='encargado' AND estado='activo'", [businessId,userId]);
    if (!actor) throw new Error("SEED_USER_ID debe ser un encargado activo para auditar las entradas demo");
    await db.execute("INSERT INTO categorias(nombre,descripcion,negocio_id) VALUES('Cajas de cartón','Catálogo de cajas',?) ON DUPLICATE KEY UPDATE id=id", [businessId]);
    const [[category]] = await db.execute("SELECT id FROM categorias WHERE nombre='Cajas de cartón' AND negocio_id=? AND activo=1", [businessId]);
    if (!category) throw new Error('Categoría interna inactiva');
    for (const [index,size] of ['chica','mediana','grande'].entries()) {
      for (const type of ['estandar','reforzada']) for (const rectangular of [false,true]) {
        const sku = `DEMO-CAJA-${size}-${type}-${rectangular?'R':'C'}`;
        const [[exists]] = await db.execute('SELECT id FROM productos WHERE negocio_id=? AND sku=?',[businessId,sku]);
        if (exists) continue;
        const side=20+index*10, stock=100*(3-index), price=350+index*200+(type==='reforzada'?150:0);
        const [result]=await db.execute('INSERT INTO productos(nombre,sku,precio,costo_compra,stock,stock_minimo,categoria_id,negocio_id,size,type,dimensiones,descripcion) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
          [`Caja ${size} ${type==='estandar'?'estándar':type}${rectangular?' rectangular':''} · DEMO`,sku,price,price*0.65,stock,50,category.id,businessId,size,type,`${side} × ${side} × ${rectangular?side/2:side} cm`,'Datos de demostración: precios y cantidades ficticios.']);
        await db.execute("INSERT INTO movimientos_stock(producto_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,negocio_id) VALUES(?,?,'entrada',?,0,?,'Entrada de demostración (seed)',?)",[result.insertId,userId,stock,stock,businessId]);
      }
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
