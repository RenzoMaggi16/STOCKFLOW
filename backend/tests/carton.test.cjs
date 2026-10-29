require('./env.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {listSchema,productSchema}=require('../dist/validators/inventory');
const {geocode}=require('../dist/services/geocoding.service');
test('catálogo rechaza filtros desconocidos, límites inválidos y edición directa de stock',()=>{
  assert.equal(listSchema.safeParse({size:'gigante'}).success,false);
  assert.equal(listSchema.safeParse({type:'industrial'}).success,false);
  assert.equal(listSchema.safeParse({limit:101}).success,false);
  assert.equal(listSchema.safeParse({color:'verde'}).success,false);
  assert.equal(productSchema.partial().safeParse({stock:10}).success,false);
});
test('geocodificación sin credenciales y candidatos validados (proveedor simulado)',async()=>{
  const original=global.fetch,endpoint=process.env.GEOCODING_URL;
  delete process.env.GEOCODING_URL;
  await assert.rejects(geocode('Dirección'),e=>e.code==='GEOCODING_UNAVAILABLE');
  try{process.env.GEOCODING_URL='https://geo.example.test/search';
    global.fetch=async url=>{assert.equal(url.searchParams.get('q'),'Dirección');return Response.json([{lat:'-34.6',lon:'-58.4',display_name:'Ejemplo'},{lat:'999',lon:'1'}]);};
    assert.deepEqual(await geocode('Dirección'),[{latitud:-34.6,longitud:-58.4,direccion:'Ejemplo'}]);
    global.fetch=async()=>{throw new Error('offline');};await assert.rejects(geocode('Dirección'),e=>e.code==='GEOCODING_FAILED');
  }finally{global.fetch=original;if(endpoint===undefined)delete process.env.GEOCODING_URL;else process.env.GEOCODING_URL=endpoint;}
});
