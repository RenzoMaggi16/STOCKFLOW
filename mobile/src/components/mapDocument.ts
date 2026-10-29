export type DeliveryPin={id:number;nombre_comercial:string;direccion_entrega:string;latitud:number|string;longitud:number|string};
export type DeliveryMapProps={deliveries:DeliveryPin[];location:{latitude:number;longitude:number}|null;onSelect:(id:number)=>void};
export function selectMapDelivery(data:unknown,deliveries:DeliveryPin[],onSelect:(id:number)=>void){
  try{const message=JSON.parse(String(data));if(message.type==='delivery'&&deliveries.some(d=>d.id===message.id))onSelect(message.id);}catch{/* Ignore malformed messages. */}
}
export function mapDocument(deliveries:DeliveryPin[],location:DeliveryMapProps['location'],dark=false){
  const valid=(lat:number,lon:number)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
  const pins=deliveries.filter(d=>d.latitud!==''&&d.longitud!==''&&valid(Number(d.latitud),Number(d.longitud)));
  const position=location&&valid(location.latitude,location.longitude)?location:null;
  const payload=JSON.stringify({pins,position}).replace(/</g,'\\u003c');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<style>html,body,#map{height:100%;margin:0}body{font-family:system-ui;background:${dark?'#121A14':'#F7F9F7'}}#notice{position:absolute;top:10px;left:45px;right:10px;z-index:1000;padding:8px;border-radius:8px;background:${dark?'#18231B':'#fff'};color:${dark?'#E8F0E9':'#17351F'};font-size:13px;pointer-events:none}.leaflet-popup-content{white-space:pre-line}</style></head><body><div id="map"></div><div id="notice">Cargando mapa…</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script><script>
const data=${payload};const notice=document.getElementById('notice');
if(!window.L){notice.textContent='No se pudo cargar el mapa. Revisá tu conexión y volvé a abrir esta pantalla.';}else{
const map=L.map('map');const points=[];
const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
tiles.on('tileerror',()=>{notice.hidden=false;notice.textContent='No se pudo cargar parte del mapa. Revisá tu conexión.';});
data.pins.forEach(d=>{const point=[Number(d.latitud),Number(d.longitud)];points.push(point);const label=document.createElement('div');label.textContent='#'+d.id+' · '+d.nombre_comercial+'\\n'+d.direccion_entrega;
L.circleMarker(point,{radius:11,color:'#14532D',weight:2,fillColor:'#22C55E',fillOpacity:1}).addTo(map).bindPopup(label).on('click',()=>{const message=JSON.stringify({type:'delivery',id:d.id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*');});});
if(data.position){const point=[data.position.latitude,data.position.longitude];points.push(point);L.circleMarker(point,{radius:8,color:'#fff',weight:3,fillColor:'#2563EB',fillOpacity:1}).addTo(map).bindPopup('Tu ubicación');}
if(points.length){map.fitBounds(points,{padding:[35,35],maxZoom:15});notice.hidden=true;}else{map.setView([0,0],1);notice.textContent='No hay ubicaciones confirmadas para mostrar.';}
}</script></body></html>`;
}
