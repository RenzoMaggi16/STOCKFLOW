import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapDocument,selectMapDelivery} from '../src/components/mapDocument';
const pin={id:7,nombre_comercial:'</script><script>alert(1)</script>',direccion_entrega:'Calle 123',latitud:-34.6,longitud:-58.4};
test('mapa mantiene datos no confiables dentro del payload y el script es válido',()=>{
 const html=mapDocument([pin],null);
 assert.equal(html.includes(pin.nombre_comercial),false);
 const script=html.match(/<script>\n([\s\S]*?)<\/script>/)![1];
 assert.doesNotThrow(()=>new Function(script));
 assert.ok(html.includes('textContent'));
});
test('mapa ignora coordenadas inválidas y mensajes de entregas ajenas',()=>{
 const html=mapDocument([{...pin,latitud:200}],null);
 assert.ok(html.includes('"pins":[]'));
 const selected:number[]=[];
 for(const data of ['broken','{"type":"delivery","id":999}','{"type":"delivery","id":7}'])selectMapDelivery(data,[pin],id=>selected.push(id));
 assert.deepEqual(selected,[7]);
});
