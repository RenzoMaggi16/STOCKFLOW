require('../env.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { SMTPServer } = require('smtp-server');
test('Multinegocio: migración, invitaciones, aislamiento y permisos', async t => {
  const mailbox = [];
  const smtp = new SMTPServer({ disabledCommands: ['AUTH','STARTTLS'], onData(stream, session, done) {
    let body=''; stream.on('data', c=>body+=c); stream.on('end',()=>{mailbox.push(body.replace(/=\r?\n/g,'').replace(/=3D/g,'='));done();});
  }});
  await new Promise(r=>smtp.listen(0,'127.0.0.1',r));
  process.env.SMTP_HOST='127.0.0.1'; process.env.SMTP_PORT=String(smtp.server.address().port);
  const name=`stockflow_test_business_${process.pid}_${Date.now()}`;
  const db=await mysql.createConnection({host:'127.0.0.1',port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:true});
  let server,pool;
  try {
    await db.query(`CREATE DATABASE ${name}`);await db.query(`USE ${name}`);
    await db.query((await fs.readFile(path.join(__dirname,'../../database/schema.sql'),'utf8')).replace(/^CREATE DATABASE.*\nUSE stockflow;\n/,''));
    await db.query(await fs.readFile(path.join(__dirname,'../../database/migrations/001_inventory.sql'),'utf8'));
    await db.query("CREATE TABLE schema_migrations(nombre VARCHAR(255) PRIMARY KEY,aplicado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP); INSERT INTO schema_migrations(nombre) VALUES('001_inventory.sql')");
    await db.query("INSERT INTO categorias(nombre) VALUES('Histórica'); INSERT INTO productos(nombre,sku,precio,categoria_id,stock) VALUES('Conservado','LEGACY','12.00',1,9)");
    process.env.DB_NAME=name;
    for(let i=0;i<2;i++) execFileSync(process.execPath,['scripts/migrate.cjs'],{cwd:path.join(__dirname,'../..'),env:process.env});
    pool=require('../../dist/config/db').pool;
    const auth=require('../../dist/services/auth.service');
    const owner=await auth.register('Owner','owner@example.com','ClaveSegura123');
    const other=await auth.register('Other','other@example.com','ClaveSegura123');
    const worker=await auth.register('Worker','worker@example.com','ClaveSegura123');
    const stranger=await auth.register('Stranger','stranger@example.com','ClaveSegura123');
    await db.query('UPDATE usuarios SET email_verificado=1');
    server=require('../../dist/app').default.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    const base=`http://127.0.0.1:${server.address().port}/api`;
    async function req(method,url,body,user=owner,business){const r=await fetch(base+url,{method,headers:{'content-type':'application/json',authorization:`Bearer ${user.accessToken}`,...(business?{'X-Business-Id':String(business)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
    async function ok(method,url,body,user=owner,business,status=200){const r=await req(method,url,body,user,business);assert.equal(r.status,status,JSON.stringify(r));return r.data;}
    const token=()=>{const m=/token=([a-f0-9]{64})/.exec(mailbox.at(-1));assert.ok(m,'Email debe contener enlace con token');return m[1];};
    let a,b,ca,cb,pa,pb;
    await t.test('migración conserva datos sin asignar dueño; crear negocio asigna admin',async()=>{
      const [[legacy]]=await db.query("SELECT p.stock,n.activo,n.historico FROM productos p JOIN negocios n ON n.id=p.negocio_id WHERE p.sku='LEGACY'");
      assert.equal(legacy.stock,9);assert.equal(legacy.activo,0);assert.equal(legacy.historico,1);
      assert.deepEqual((await ok('GET','/businesses')).items,[]);
      assert.equal((await req('GET','/products')).status,400);
      a=await ok('POST','/businesses',{nombre:'Negocio A'},owner,undefined,201);
      b=await ok('POST','/businesses',{nombre:'Negocio B'},other,undefined,201);
      assert.equal(a.rol,'admin');assert.equal((await ok('GET',`/businesses/${a.id}`)).rol,'admin');
      assert.equal((await req('GET',`/businesses/${a.id}`,null,stranger)).status,403);
    });
    await t.test('enviar invitación, correo incorrecto, verificación y aceptación única concurrente',async()=>{
      const i=await ok('POST',`/businesses/${a.id}/invitations`,{email:worker.user.email,rol:'empleado'},owner,undefined,201);const raw=token();
      const [[stored]]=await db.execute('SELECT token_hash FROM invitaciones WHERE id=?',[i.id]);assert.notEqual(stored.token_hash,raw);assert.equal(stored.token_hash.length,64);
      assert.ok(mailbox.at(-1).includes('Negocio A'));assert.ok(mailbox.at(-1).includes('empleado'));
      assert.equal((await req('POST','/invitations/accept',{token:raw},stranger)).status,403);
      await db.execute('UPDATE usuarios SET email_verificado=0 WHERE id=?',[worker.user.id]);
      assert.equal((await req('POST','/invitations/accept',{token:raw},worker)).status,403);
      await db.execute('UPDATE usuarios SET email_verificado=1 WHERE id=?',[worker.user.id]);
      assert.equal((await ok('GET','/invitations',null,worker)).items[0].id,i.id);
      const pair=await Promise.all([req('POST','/invitations/accept',{token:raw},worker),req('POST','/invitations/accept',{token:raw},worker)]);
      assert.deepEqual(pair.map(r=>r.status).sort(),[200,409]);
      assert.equal((await ok('GET',`/businesses/${a.id}`,null,worker)).rol,'empleado');
      assert.equal((await req('POST',`/businesses/${a.id}/invitations`,{email:stranger.user.email,rol:'admin'},worker)).status,403);
    });
    await t.test('vencimiento, reenvío, cancelación y aceptación desde bandeja propia',async()=>{
      const i=await ok('POST',`/businesses/${b.id}/invitations`,{email:owner.user.email,rol:'empleado'},other,undefined,201);const old=token();
      await db.execute('UPDATE invitaciones SET expira_en=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY),enviado_en=NULL WHERE id=?',[i.id]);
      assert.equal((await req('POST','/invitations/accept',{token:old})).status,409);
      assert.equal((await req('POST',`/invitations/${i.id}/resend`,{},owner)).status,403);
      await ok('POST',`/invitations/${i.id}/resend`,{},other);assert.notEqual(token(),old);
      assert.equal((await req('POST','/invitations/accept',{token:old})).status,404);
      assert.equal((await req('POST',`/invitations/${i.id}/resend`,{},other)).status,429);
      await ok('POST','/invitations/accept',{id:i.id});
      assert.equal((await ok('GET',`/businesses/${b.id}`)).rol,'empleado');
      const j=await ok('POST',`/businesses/${a.id}/invitations`,{email:stranger.user.email,rol:'encargado'},owner,undefined,201);const canceled=token();
      await ok('DELETE',`/invitations/${j.id}`);
      assert.equal((await req('POST','/invitations/accept',{token:canceled},stranger)).status,409);
    });
    await t.test('roles por negocio; SKU local y referencias SQL entre negocios prohibidas',async()=>{
      ca=await ok('POST','/categories',{nombre:'Común'},owner,a.id,201);cb=await ok('POST','/categories',{nombre:'Común'},other,b.id,201);
      const data={nombre:'Producto A',sku:'MISMO',precio:'5.00',categoria_id:ca.id};
      pa=await ok('POST','/products',data,owner,a.id,201);
      pb=await ok('POST','/products',{...data,nombre:'Producto B',categoria_id:cb.id},other,b.id,201);
      assert.equal((await req('POST','/categories',{nombre:'No puede'},owner,b.id)).status,403);
      assert.equal((await req('PATCH',`/products/${pa.id}`,{categoria_id:cb.id},owner,a.id)).status,404);
      const sb=await ok('POST','/suppliers',{nombre:'Proveedor B'},other,b.id,201);
      assert.equal((await req('PATCH',`/products/${pa.id}`,{proveedor_id:sb.id},owner,a.id)).status,404);
      await assert.rejects(db.execute('UPDATE productos SET categoria_id=? WHERE id=?',[cb.id,pa.id]));
    });
    await t.test('IDs ajenos no permiten leer, editar, eliminar ni mover stock; reportes aislados',async()=>{
      for(const method of ['GET','PATCH','DELETE']) assert.equal((await req(method,`/products/${pb.id}`,method==='PATCH'?{nombre:'Intruso'}:null,owner,a.id)).status,404);
      for(const resource of [`categories/${cb.id}`]) assert.equal((await req('GET',`/${resource}`,null,owner,a.id)).status,404);
      assert.equal((await req('POST','/movements',{producto_id:pb.id,tipo:'entrada',cantidad:10,motivo:'No'},owner,a.id)).status,404);
      await ok('POST','/movements',{producto_id:pa.id,tipo:'entrada',cantidad:10,motivo:'Ingreso'},owner,a.id,201);
      await ok('POST','/movements',{producto_id:pb.id,tipo:'entrada',cantidad:3,motivo:'Ingreso'},other,b.id,201);
      assert.equal((await ok('GET','/products',null,owner,a.id)).items.length,1);
      assert.equal(Number((await ok('GET','/reports/summary',null,owner,a.id)).valor),50);
      assert.equal(Number((await ok('GET','/dashboard',null,owner,b.id)).unidades),3);
      assert.equal((await req('GET','/reports/summary',null,owner,b.id)).status,403);
      assert.ok((await ok('GET','/movements',null,owner,a.id)).items.every(m=>m.negocio_id===a.id));
    });
    await t.test('cambio de rol y baja son locales e inmediatos sin revocar JWT',async()=>{
      await ok('PATCH',`/businesses/${a.id}/members/${worker.user.id}`,{rol:'encargado'});
      await ok('POST','/categories',{nombre:'Permiso nuevo'},worker,a.id,201);
      await ok('DELETE',`/businesses/${a.id}/members/${worker.user.id}`);
      assert.equal((await req('GET','/products',null,worker,a.id)).status,403);
      assert.equal((await req('GET','/auth/me',null,worker)).status,200);
      assert.equal((await req('PATCH',`/businesses/${a.id}/members/${owner.user.id}`,{rol:'empleado'})).status,409);
      assert.equal((await req('DELETE',`/businesses/${a.id}/members/${owner.user.id}`)).status,409);
    });
    await t.test('concurrencia: último administrador y salidas serializadas',async()=>{
      await ok('PATCH',`/businesses/${a.id}/members/${worker.user.id}`,{rol:'admin',estado:'activo'});
      const changes=await Promise.all([req('PATCH',`/businesses/${a.id}/members/${owner.user.id}`,{rol:'empleado'}),req('PATCH',`/businesses/${a.id}/members/${worker.user.id}`,{rol:'empleado'},worker)]);
      assert.deepEqual(changes.map(r=>r.status).sort(),[200,409]);
      const movement={producto_id:pa.id,tipo:'salida',cantidad:7,motivo:'Concurrente'};
      const pair=await Promise.all([req('POST','/movements',movement,owner,a.id),req('POST','/movements',movement,worker,a.id)]);
      assert.deepEqual(pair.map(r=>r.status).sort(),[201,409]);
      assert.equal((await ok('GET',`/products/${pa.id}`,null,owner,a.id)).stock,3);
    });
    await t.test('desactivación controlada conserva historial y bloquea acceso',async()=>{
      assert.equal((await req('PATCH',`/businesses/${b.id}`,{activo:false},other)).status,409);
      await ok('POST','/movements',{producto_id:pb.id,tipo:'ajuste',cantidad:0,motivo:'Cierre'},other,b.id,201);
      await ok('PATCH',`/businesses/${b.id}`,{activo:false},other);
      assert.equal((await req('GET','/products',null,owner,b.id)).status,403);
      assert.equal((await ok('GET','/businesses',null,other)).items.length,0);
      const [[count]]=await db.execute('SELECT COUNT(*) AS n FROM movimientos_stock WHERE negocio_id=?',[b.id]);assert.equal(count.n,2);
    });
  } finally {if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();await db.query(`DROP DATABASE IF EXISTS ${name}`);await db.end();await new Promise(r=>smtp.close(r));}
});
