// Recorrido web de la app Expo contra una API y MySQL temporales.
// Verifica pantallas reales; la instalación de una APK requiere prueba adicional.
const {chromium,expect}=require('@playwright/test');
const mysql=require('../../backend/node_modules/mysql2/promise');
const bcrypt=require('../../backend/node_modules/bcrypt');
const fs=require('node:fs');
const path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');

(async()=>{
  const webURL=process.env.TEST_WEB_URL||'http://localhost:8082';
  const backend=path.resolve(__dirname,'../../backend');
  const name=`stockflow_test_mobile_dist_${process.pid}_${Date.now()}`;
  const env={...process.env,NODE_ENV:'test',PORT:'3001',DB_HOST:'127.0.0.1',DB_PORT:process.env.TEST_DB_PORT||'3307',DB_USER:process.env.TEST_DB_USER||'root',DB_PASSWORD:process.env.TEST_DB_PASSWORD||'',DB_NAME:name,DB_SSL:'false',JWT_ACCESS_SECRET:'ui-dist-access-'.repeat(5),JWT_REFRESH_SECRET:'ui-dist-refresh-'.repeat(5),CORS_ORIGINS:webURL,SMTP_HOST:'',SMTP_USER:'',SMTP_PASSWORD:'',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:'',DISCORD_CLIENT_ID:'',DISCORD_CLIENT_SECRET:''};
  const db=await mysql.createConnection({host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASSWORD,multipleStatements:true});
  let server,browser;
  try{
    await db.query(`CREATE DATABASE ${name}`);await db.query(`USE ${name}`);
    await db.query(fs.readFileSync(path.join(backend,'database/schema.sql'),'utf8').replace(/^CREATE DATABASE.*\nUSE stockflow;\n/,''));
    execFileSync(process.execPath,['scripts/migrate.cjs'],{cwd:backend,env});
    const hash=await bcrypt.hash('UiTestPassword123',12),ids={};
    for(const role of ['admin','encargado','empleado','repartidor']){const [r]=await db.execute('INSERT INTO usuarios(nombre,email,password_hash,email_verificado) VALUES(?,?,?,1)',[role,`${role}@example.com`,hash]);ids[role]=r.insertId;}
    const [b]=await db.execute('INSERT INTO negocios(nombre,creado_por) VALUES(?,?)',['Distribuidora UI',ids.admin]);
    for(const role of Object.keys(ids)) await db.execute('INSERT INTO negocio_usuarios(negocio_id,usuario_id,rol) VALUES(?,?,?)',[b.insertId,ids[role],role]);
    const [c]=await db.execute('INSERT INTO categorias(nombre,negocio_id) VALUES(?,?)',['Bebidas',b.insertId]);
    await db.execute('INSERT INTO productos(nombre,sku,precio,stock,categoria_id,negocio_id) VALUES(?,?,?,?,?,?),(?,?,?,?,?,?)',['Agua','AGUA','12.50',10,c.insertId,b.insertId,'Jugo','JUGO','5.00',5,c.insertId,b.insertId]);
    server=spawn(process.execPath,['dist/server.js'],{cwd:backend,env,stdio:'pipe'});
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('exit',()=>reject(new Error('API temporal no inició')));});
    browser=await chromium.launch();
    async function login(role){const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();await page.goto(`${webURL}/login`);await page.getByLabel('Correo electrónico',{exact:true}).fill(`${role}@example.com`);await page.getByLabel('Contraseña',{exact:true}).fill('UiTestPassword123');await page.getByRole('button',{name:'Ingresar',exact:true}).click();await expect(page.getByRole('heading',{name:new RegExp(role==='repartidor'?'Mis entregas':'Hola,')})).toBeVisible({timeout:20000});return {context,page};}
    const sales=await login('empleado');
    await sales.page.getByRole('tab',{name:'Clientes'}).click();
    await sales.page.getByRole('button',{name:'Nuevo cliente'}).click();
    await sales.page.getByLabel('Nombre comercial').fill('Kiosco Central');
    await sales.page.getByLabel('Dirección de entrega').fill('Calle Principal 123');
    await sales.page.getByRole('button',{name:'Crear cliente'}).click();
    await expect(sales.page.getByText('Kiosco Central',{exact:true})).toBeVisible();
    await sales.page.getByRole('tab',{name:'Pedidos'}).click();
    await sales.page.getByRole('button',{name:'Nuevo pedido'}).click();
    await sales.page.getByRole('button',{name:'Kiosco Central'}).click();
    await sales.page.getByRole('button',{name:/Agua · 10 u/}).click();
    await sales.page.getByLabel('Cantidad').click();
    await sales.page.getByLabel('Cantidad').type('2',{delay:100});
    await expect(sales.page.getByLabel('Cantidad')).toHaveValue('2');
    await sales.page.getByRole('button',{name:'Agregar producto'}).click();
    await expect(sales.page.getByText('2 × $12.50')).toBeVisible();
    await sales.page.getByRole('button',{name:/Jugo · 5 u/}).click();
    await sales.page.getByLabel('Cantidad').fill('1');
    await sales.page.getByRole('button',{name:'Agregar producto'}).click();
    await sales.page.getByRole('button',{name:'Crear pedido'}).click();
    await expect(sales.page.getByRole('heading',{name:/Pedido #/})).toBeVisible();
    await expect(sales.page.getByText('Total $30.00')).toBeVisible();
    const [[order]]=await db.query('SELECT id,total FROM pedidos ORDER BY id DESC LIMIT 1');expect(Number(order.total)).toBe(30);
    await sales.context.close();
    const warehouse=await login('encargado');
    await warehouse.page.getByRole('tab',{name:'Pedidos'}).click();
    await warehouse.page.getByRole('button',{name:'Ver detalle y acciones'}).first().click();
    await warehouse.page.getByRole('button',{name:'Aprobar y reservar stock'}).click();
    await warehouse.page.getByRole('button',{name:'Marcar preparado'}).click();
    await warehouse.page.getByRole('button',{name:'repartidor'}).click();
    await warehouse.page.getByRole('button',{name:'Guardar asignación'}).click();
    await warehouse.context.close();
    const driver=await login('repartidor');
    await driver.page.getByRole('tab',{name:'Entregas'}).click();
    await driver.page.getByRole('button',{name:'Ver detalle y acciones'}).first().click();
    await driver.page.getByRole('button',{name:'Confirmar retiro'}).click();
    await driver.page.getByRole('button',{name:'Confirmar entrega'}).click();
    await expect(driver.page.getByText('entregado',{exact:true}).first()).toBeVisible();
    const [[product]]=await db.query("SELECT stock FROM productos WHERE sku='AGUA'");expect(product.stock).toBe(8);
    await driver.context.close();
    console.log('Recorrido Expo + API + MySQL: cliente, pedido multiproducto, preparación y entrega OK');
  } finally {
    if(browser) await browser.close();
    if(server){server.kill();await new Promise(r=>server.once('exit',r));}
    await db.query(`DROP DATABASE IF EXISTS ${name}`);await db.end();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
