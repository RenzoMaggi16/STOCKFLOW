require('../env.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const mysql=require('mysql2/promise');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

test('Distribuidora: permisos, reservas, entregas, devoluciones y ranking',async t=>{
  const name=`stockflow_test_dist_${process.pid}_${Date.now()}`;
  const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:true});
  let server,pool;
  try {
    await db.query(`CREATE DATABASE ${name}`);
    await db.query(`USE ${name}`);
    const schema=await fs.readFile(path.join(__dirname,'../../database/schema.sql'),'utf8');
    await db.query(schema.replace(/^CREATE DATABASE[^\r\n]*\r?\nUSE stockflow;\r?\n/,''));
    process.env.DB_NAME=name;
    execFileSync(process.execPath,['scripts/migrate.cjs'],{cwd:path.join(__dirname,'../..'),env:process.env});
    pool=require('../../dist/config/db').pool;
    const auth=require('../../dist/services/auth.service');
    const users={};
    for(const role of ['admin','encargado','empleado','repartidor','otro']) users[role]=await auth.register(role,`${role}@example.com`,'ClaveSegura123');
    await db.query('UPDATE usuarios SET email_verificado=1');
    server=require('../../dist/app').default.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    const base=`http://127.0.0.1:${server.address().port}/api`;
    async function req(role,method,url,body,business){const r=await fetch(base+url,{method,headers:{'content-type':'application/json',authorization:`Bearer ${users[role].accessToken}`,...(business?{'X-Business-Id':String(business)}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
    async function ok(role,method,url,body,business,status=200){const r=await req(role,method,url,body,business);assert.equal(r.status,status,JSON.stringify(r));return r.data;}
    const business=(await ok('admin','POST','/businesses',{nombre:'Distribuidora A'},null,201)).id;
    const otherBusiness=(await ok('otro','POST','/businesses',{nombre:'Distribuidora B'},null,201)).id;
    for(const role of ['encargado','empleado','repartidor']) await db.execute('INSERT INTO negocio_usuarios(negocio_id,usuario_id,rol) VALUES(?,?,?)',[business,users[role].user.id,role]);
    const category=await ok('admin','POST','/categories',{nombre:'Bebidas'},business,201);
    const p1=await ok('encargado','POST','/products',{nombre:'Agua',sku:'AGUA',precio:'12.50',categoria_id:category.id,stock_inicial:10},business,201);
    const p2=await ok('encargado','POST','/products',{nombre:'Jugo',sku:'JUGO',precio:'5.00',categoria_id:category.id,stock_inicial:5},business,201);
    await t.test('cajas: filtros, validación, dashboard, coordenadas y seed idempotente',async()=>{
      const box=await ok('encargado','POST','/products',{nombre:'Caja chica reforzada',sku:'CAJA-CH-R',precio:'500.00',size:'chica',type:'reforzada',dimensiones:'20 × 20 × 20 cm',stock_inicial:20,stock_minimo:25},business,201);
      const filtered=await ok('empleado','GET','/products?size=chica&type=reforzada&search=CAJA-CH',undefined,business);
      assert.equal(filtered.total,1);assert.equal(filtered.items[0].id,box.id);
      assert.equal((await ok('admin','GET','/products?size=enorme',undefined,business)).total,0);
      const config=await ok('admin','GET','/product-values',undefined,business);
      config.campos.push({id:'c_material',nombre:'Material',opciones:['Kraft','Blanco']});
      await ok('encargado','PUT','/product-values',config,business);
      assert.equal((await req('empleado','PUT','/product-values',config,business)).status,403);
      assert.equal((await ok('otro','GET','/product-values',undefined,otherBusiness)).campos.some(f=>f.id==='c_material'),false);
      const custom=await ok('encargado','PATCH',`/products/${box.id}`,{size:'Extra grande',type:'Industrial',dimensiones:'40 x 60 x 20 cm',atributos:{c_forma:'Rectangular',c_material:'Kraft'}},business);
      assert.equal(custom.size,'Extra grande');
      const attrs=typeof custom.atributos==='string'?JSON.parse(custom.atributos):custom.atributos;
      assert.equal(attrs.c_forma,'Rectangular');
      await ok('encargado','PATCH',`/products/${box.id}`,{size:'chica',type:'reforzada'},business);
      assert.equal((await ok('otro','GET','/products?search=CAJA-CH',undefined,otherBusiness)).total,0);
      assert.equal((await req('admin','PATCH',`/products/${box.id}`,{stock:900},business)).status,422);
      const dash=await ok('admin','GET','/dashboard',undefined,business);
      assert.equal(Number(dash.productos),3);assert.equal(Number(dash.unidades_disponibles),35);assert.equal(dash.stock_bajo_productos[0].id,box.id);
      const driverDash=await ok('repartidor','GET','/dashboard',undefined,business);
      assert.equal(driverDash.productos,undefined);assert.equal(Number(driverDash.pedidos_total),0);
      const loc=await ok('empleado','POST','/clients',{nombre_comercial:'Ubicación demo',direccion_entrega:'Dirección de prueba',localidad:'Localidad demo',provincia:'Provincia demo',latitud:-34.6,longitud:-58.4},business,201);
      assert.equal((await req('empleado','PATCH',`/clients/${loc.id}`,{latitud:40},business)).status,422);
      const changed=await ok('empleado','PATCH',`/clients/${loc.id}`,{direccion_entrega:'Otra dirección'},business);assert.equal(changed.latitud,null);assert.equal(changed.longitud,null);
      assert.equal((await req('repartidor','POST','/geocode',{address:'Prueba'},business)).status,403);
      const seedEnv={...process.env,SEED_BUSINESS_ID:String(business),SEED_USER_ID:String(users.encargado.user.id)};
      execFileSync(process.execPath,['scripts/seed.cjs'],{cwd:path.join(__dirname,'../..'),env:seedEnv});
      const [[seed]]=await db.execute("SELECT id,stock FROM productos WHERE negocio_id=? AND sku LIKE 'DEMO-CAJA-%' LIMIT 1",[business]);
      await db.execute('UPDATE productos SET precio=999 WHERE id=?',[seed.id]);
      execFileSync(process.execPath,['scripts/seed.cjs'],{cwd:path.join(__dirname,'../..'),env:seedEnv});
      const [[count]]=await db.execute("SELECT COUNT(*) AS n FROM productos WHERE negocio_id=? AND sku LIKE 'DEMO-CAJA-%'",[business]);assert.equal(count.n,12);
      const [[unchanged]]=await db.execute('SELECT precio,stock FROM productos WHERE id=?',[seed.id]);assert.equal(Number(unchanged.precio),999);assert.equal(unchanged.stock,seed.stock);
      const [[moves]]=await db.execute('SELECT COUNT(*) AS n FROM movimientos_stock WHERE producto_id=?',[seed.id]);assert.equal(moves.n,1);
      // Keep the existing workflow fixtures independent of this additional client.
      await db.execute('UPDATE clientes SET activo=0 WHERE id=?',[loc.id]);
    });
    let client,first;
    await t.test('cada acción exclusiva rechaza los otros roles',async()=>{
      const restricted=[
        ['admin','POST',`/businesses/${business}/invitations`,{email:'nobody@example.com',rol:'empleado'},null],
        ['admin','PATCH',`/businesses/${business}/members/${users.empleado.user.id}`,{rol:'encargado'},null],
        ['admin','POST','/stock/adjustment-requests/1/approve',{motivo:'Revisado'},business],
        ['encargado','POST','/stock/receive',{producto_id:p1.id,cantidad:1,motivo:'Recepción'},business],
        ['encargado','POST','/orders/1/approve-preparation',{},business],
        ['encargado','POST','/stock/ordinary-adjustment',{producto_id:p1.id,cantidad:10,motivo:'Conteo'},business],
        ['empleado','POST','/clients',{nombre_comercial:'C',direccion_entrega:'Calle 1'},business],
        ['empleado','POST','/orders',{cliente_id:1,items:[{producto_id:p1.id,cantidad:1}]},business],
        ['empleado','POST','/orders/1/payment-notice',{},business],
        ['repartidor','POST','/orders/1/pickup',{},business],
        ['repartidor','POST','/orders/1/delivered',{},business],
        ['repartidor','POST','/orders/1/delivery-failed',{motivo:'No recibe'},business],
      ];
      for(const [allowed,method,url,body,scope] of restricted) for(const role of ['admin','encargado','empleado','repartidor'].filter(x=>x!==allowed)) assert.equal((await req(role,method,url,body,scope)).status,403,`${role} ${method} ${url}`);
      assert.equal((await req('otro','GET','/orders',undefined,business)).status,403);
      assert.equal((await req('empleado','POST','/clients',{nombre_comercial:'Ajeno',direccion_entrega:'Calle 1'},otherBusiness)).status,403);
      assert.equal((await req('admin','POST','/movements',{producto_id:p1.id,tipo:'salida',cantidad:1,motivo:'Bypass'},business)).status,403);
    });
    await t.test('ventas crea cliente y pedido multiproducto; depósito reserva sin restar stock',async()=>{
      client=await ok('empleado','POST','/clients',{nombre_comercial:'Almacén Norte',direccion_entrega:'Calle Norte 42'},business,201);
      first=await ok('empleado','POST','/orders',{cliente_id:client.id,items:[{producto_id:p1.id,cantidad:7},{producto_id:p2.id,cantidad:2}]},business,201);
      assert.equal(first.total,'97.50');assert.equal(first.items.length,2);
      await ok('encargado','POST',`/orders/${first.id}/approve-preparation`,{},business);
      const summary=await ok('admin','GET','/dashboard',undefined,business);
      assert.equal(Number(summary.unidades),2435);assert.equal(Number(summary.unidades_reservadas),9);assert.equal(Number(summary.unidades_disponibles),2426);
      assert.equal((await req('encargado','POST','/stock/ordinary-adjustment',{producto_id:p1.id,cantidad:6,motivo:'Conteo'},business)).status,409);
      const second=await ok('empleado','POST','/orders',{cliente_id:client.id,items:[{producto_id:p1.id,cantidad:4}]},business,201);
      assert.equal((await req('encargado','POST',`/orders/${second.id}/approve-preparation`,{},business)).status,409);
      assert.equal((await ok('admin','GET',`/products/${p1.id}`,undefined,business)).stock,10);
      await ok('encargado','POST',`/orders/${first.id}/ready`,{},business);
      await ok('admin','POST',`/orders/${first.id}/assign`,{repartidor_id:users.repartidor.user.id},business);
      assert.equal((await req('repartidor','GET',`/orders/${second.id}`,undefined,business)).status,404);
      assert.equal((await ok('repartidor','GET','/deliveries',undefined,business)).length,1);
    });
    await t.test('entrega atómica, reintento inválido, aviso de pago y devolución',async()=>{
      await ok('repartidor','POST',`/orders/${first.id}/pickup`,{},business);
      await ok('empleado','POST',`/orders/${first.id}/payment-notice`,{},business);
      const pair=await Promise.all([req('repartidor','POST',`/orders/${first.id}/delivered`,{},business),req('repartidor','POST',`/orders/${first.id}/delivered`,{},business)]);
      assert.deepEqual(pair.map(x=>x.status).sort(),[200,409]);
      assert.equal((await ok('admin','GET',`/products/${p1.id}`,undefined,business)).stock,3);
      const [[count]]=await db.execute("SELECT COUNT(*) AS n FROM movimientos_stock WHERE pedido_id=? AND tipo='salida'",[first.id]);assert.equal(count.n,2);
      assert.equal((await ok('admin','GET',`/orders/${first.id}`,undefined,business)).historial.at(-1).estado,'entregado');
      await ok('encargado','POST',`/orders/${first.id}/return`,{motivo:'Devolución completa'},business);
      assert.equal((await ok('admin','GET',`/products/${p1.id}`,undefined,business)).stock,10);
      assert.equal((await req('encargado','POST',`/orders/${first.id}/return`,{motivo:'Duplicada'},business)).status,409);
    });
    await t.test('ranking ponderado, solicitudes extraordinarias y reparto asignado',async()=>{
      await ok('encargado','POST',`/clients/${client.id}/ratings`,{puntualidad:5,acuerdos:3,trato:4,motivo:'Historial comercial'},business,201);
      const rank=await ok('empleado','GET','/client-ranking',undefined,business);
      assert.equal(Number(rank[0].puntuacion),4.2);
      assert.equal((await ok('empleado','GET',`/clients/${client.id}/history`,undefined,business)).ratings.length,1);
      const adjustment=await ok('empleado','POST','/stock/adjustment-requests',{producto_id:p1.id,stock_propuesto:12,motivo:'Diferencia en conteo'},business,201);
      await ok('admin','POST',`/stock/adjustment-requests/${adjustment.id}/approve`,{motivo:'Comprobado'},business);
      const [[review]]=await db.execute('SELECT motivo_revision FROM solicitudes_ajuste WHERE id=?',[adjustment.id]);assert.equal(review.motivo_revision,'Comprobado');
      assert.equal((await ok('admin','GET',`/products/${p1.id}`,undefined,business)).stock,12);
      assert.equal((await req('admin','POST',`/stock/adjustment-requests/${adjustment.id}/approve`,{motivo:'Otra vez'},business)).status,409);
      const next=await ok('empleado','POST','/orders',{cliente_id:client.id,items:[{producto_id:p1.id,cantidad:1}]},business,201);
      await ok('encargado','POST',`/orders/${next.id}/approve-preparation`,{},business);
      await ok('encargado','POST',`/orders/${next.id}/ready`,{},business);
      await ok('encargado','POST',`/orders/${next.id}/assign`,{repartidor_id:users.repartidor.user.id},business);
      await ok('repartidor','POST',`/orders/${next.id}/pickup`,{},business);
      await ok('repartidor','POST',`/orders/${next.id}/delivery-failed`,{motivo:'Local cerrado'},business);
      assert.equal((await ok('admin','GET',`/products/${p1.id}`,undefined,business)).stock,12);
      await ok('admin','POST',`/orders/${next.id}/cancel`,{motivo:'Cancelado por cliente'},business);
      const [[reserved]]=await db.execute("SELECT estado FROM reservas_pedido WHERE pedido_id=?",[next.id]);assert.equal(reserved.estado,'liberada');
    });
  } finally {
    if(server) await new Promise(r=>server.close(r));
    if(pool) await pool.end();
    await db.query(`DROP DATABASE IF EXISTS ${name}`);await db.end();
  }
});
