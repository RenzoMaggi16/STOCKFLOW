# APK con OpenStreetMap

La URL ya está configurada en los perfiles preview y production de mobile/eas.json:
`https://stockflow-api-renzo.onrender.com/api`.

El mapa integrado usa Leaflet + OpenStreetMap en Android y web. No requiere cuenta, facturación ni clave de Google. Necesita conexión a Internet. Muestra las coordenadas confirmadas de las entregas y, si autorizás el permiso, tu ubicación en primer plano. Las entregas sin coordenadas siguen disponibles en la lista.

El botón de indicaciones abre Google Maps como aplicación o página externa; ese enlace tampoco necesita clave. La búsqueda de direcciones del backend sigue configurándose por separado con GEOCODING_URL.

## Compilar
Desde mobile ejecutá `npm run build:apk`. EAS usa la URL pública configurada. No hace falta cargar variables de Google Maps. Si cambiás el backend, actualizá EXPO_PUBLIC_API_URL en mobile/eas.json y generá otra APK.

## Verificar en el teléfono
1. Descargar e instalar la APK del enlace de EAS.
2. Iniciar sesión con un repartidor que tenga pedidos asignados.
3. Abrir Mapa, seleccionar una entrega y abrir su detalle.
4. Probar Mostrar mi ubicación con permiso concedido y denegado.
5. Abrir indicaciones y registrar retiro o entrega sobre un pedido de prueba.

El servicio de Render debe estar activo y conectado a MySQL. Su endpoint `/api/health` permite comprobar disponibilidad HTTP; por sí solo no comprueba login ni base de datos.

Referencias: [Expo WebView](https://docs.expo.dev/versions/v58.0.0/sdk/webview/), [política de mapas OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
