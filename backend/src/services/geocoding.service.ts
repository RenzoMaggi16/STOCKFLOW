import { HttpError } from "../utils/errors";

// Nominatim privado o proveedor compatible. La URL la configura el servidor.
export async function geocode(address: string) {
  const endpoint = process.env.GEOCODING_URL;
  if (!endpoint) throw new HttpError(503,"Geocodificación sin configurar; ingresá las coordenadas manualmente","GEOCODING_UNAVAILABLE");
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new HttpError(503,"El proveedor requiere HTTPS","GEOCODING_UNAVAILABLE");
  url.searchParams.set("q",address);
  url.searchParams.set("format","json");
  url.searchParams.set("limit","5");
  let response;
  try {
    response = await fetch(url,{signal:AbortSignal.timeout(8000),headers:{"User-Agent":"StockFlow/1.0",...(process.env.GEOCODING_API_KEY ? {Authorization:`Bearer ${process.env.GEOCODING_API_KEY}`} : {})}});
  } catch { throw new HttpError(502,"No se pudo consultar el proveedor de ubicaciones","GEOCODING_FAILED"); }
  if (!response.ok) throw new HttpError(502,"El proveedor de ubicaciones no está disponible","GEOCODING_FAILED");
  const rows = await response.json() as {lat:string;lon:string;display_name:string}[];
  if (!Array.isArray(rows)) throw new HttpError(502,"Respuesta de ubicaciones inválida","GEOCODING_FAILED");
  return rows.slice(0,5).map(r=>({latitud:Number(r.lat),longitud:Number(r.lon),direccion:r.display_name})).filter(r=>Number.isFinite(r.latitud)&&Number.isFinite(r.longitud)&&Math.abs(r.latitud)<=90&&Math.abs(r.longitud)<=180);
}
